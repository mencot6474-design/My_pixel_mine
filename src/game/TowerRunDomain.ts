import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import { getEnchantById } from './GameData';
import type { PlotUnitState } from './GameStateSave';
import { RelicEffectStat } from './RelicData';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  pickTowerBlessingChoices,
  rollTowerWaveOres,
  TOWER_BLESSING_AUTO_PICK_SEC,
  TOWER_BOSS_INVUL_SEC,
  TOWER_KEY_GEM_COST,
  TOWER_KEY_REGEN_MS,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_WAVES_PER_FLOOR,
  TowerBlessingDef,
  TowerRunState,
  TowerRunSummary,
} from './TowerData';

export interface TowerRunMeta {
  startFloor: number;
  newRecord: boolean;
}

export interface TowerRunContext {
  gems: number;
  enchantDice: number;
  plotUnits: (PlotUnitState | null)[];
  towerBestFloor: number;
  towerKeys: number;
  towerLastKeyRegenAt: number;
  towerClaimedMilestones: number[];
  towerRun: TowerRunState | null;
  towerLastSummary: TowerRunSummary | null;
  towerRunMeta: TowerRunMeta;
  getPlotUnitStats(slotIndex: number): { dmg: number } | null;
  getRelicBonus(stat: RelicEffectStat): number;
  getTapDamage(): number;
  getWeatherGemDropMult(): number;
}

export interface TowerWaveClearResult {
  waveCleared: boolean;
  floorCleared: boolean;
  clearedFloor: number;
  clearedWave: number;
  gemsAwarded: number;
  diceAwarded: number;
  milestoneUnlocked: number | null;
}

export interface TowerTargetDamageResult {
  dmgDealt: number;
  rockBroken: boolean;
  targetOreIndex: number | null;
  waveCleared: boolean;
  floorCleared: boolean;
  clearedFloor: number | null;
  clearedWave: number | null;
  gemsAwarded: number;
  diceAwarded: number;
  milestoneUnlocked: number | null;
}

/** Regenerates Tower keys based on elapsed intervals since `towerLastKeyRegenAt`. */
export function syncTowerKeysDomain(
  ctx: Pick<TowerRunContext, 'towerKeys' | 'towerLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): void {
  if (ctx.towerKeys >= TOWER_MAX_KEYS) {
    ctx.towerLastKeyRegenAt = now;
    return;
  }
  const elapsed = Math.max(0, now - ctx.towerLastKeyRegenAt);
  const gained = Math.floor(elapsed / TOWER_KEY_REGEN_MS);
  if (gained > 0) {
    ctx.towerKeys = Math.min(TOWER_MAX_KEYS, ctx.towerKeys + gained);
    ctx.towerLastKeyRegenAt =
      ctx.towerKeys >= TOWER_MAX_KEYS ? now : ctx.towerLastKeyRegenAt + gained * TOWER_KEY_REGEN_MS;
    save();
  }
}

export function getTowerNextKeyRegenSecDomain(
  ctx: Pick<TowerRunContext, 'towerKeys' | 'towerLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): number {
  syncTowerKeysDomain(ctx, now, save);
  if (ctx.towerKeys >= TOWER_MAX_KEYS) return 0;
  const remMs = Math.max(0, TOWER_KEY_REGEN_MS - (now - ctx.towerLastKeyRegenAt));
  return Math.ceil(remMs / 1000);
}

export function getTowerUnitEffectiveDpsDomain(ctx: TowerRunContext, slotIndex: number): number {
  const floor = ctx.towerRun?.floor ?? 1;
  const def = getTowerFloorDef(floor);
  const unit = ctx.plotUnits[slotIndex];
  const st = ctx.getPlotUnitStats(slotIndex);
  if (!unit || !st) return 0;
  let unitDps = st.dmg;
  if (def.anomaly.enchantPowerMult !== 1 && unit.enchantId) {
    const enc = getEnchantById(unit.enchantId);
    if (enc && enc.dmgMult > 1) {
      const boosted = 1 + (enc.dmgMult - 1) * def.anomaly.enchantPowerMult;
      unitDps = Math.round((unitDps / enc.dmgMult) * boosted);
    }
  }
  const blessingPct = (ctx.towerRun?.blessings ?? []).reduce((s, b) => s + (b.dpsBonusPct ?? 0), 0);
  const towerRelicMult = 1 + ctx.getRelicBonus('towerDmgPct');
  return Math.max(1, Math.round(unitDps * def.anomaly.dpsMult * (1 + blessingPct) * towerRelicMult));
}

export function getTowerSlotStrikeDamageDomain(
  ctx: TowerRunContext,
  slotIndex: number,
  attackIntervalSec = 0.85
): number {
  const unitDps = getTowerUnitEffectiveDpsDomain(ctx, slotIndex);
  if (unitDps <= 0) return 0;
  return Math.max(1, Math.round(unitDps * Math.max(0.15, attackIntervalSec)));
}

export function getTowerEffectiveDpsDomain(ctx: TowerRunContext): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    total += getTowerUnitEffectiveDpsDomain(ctx, i);
  }
  return total;
}

export function getTowerEffectiveTapDamageDomain(ctx: TowerRunContext): number {
  const floor = ctx.towerRun?.floor ?? 1;
  const def = getTowerFloorDef(floor);
  const blessingPct = (ctx.towerRun?.blessings ?? []).reduce((s, b) => s + (b.tapBonusPct ?? 0), 0);
  const towerRelicMult = 1 + ctx.getRelicBonus('towerDmgPct');
  return Math.max(1, Math.round(ctx.getTapDamage() * def.anomaly.tapMult * (1 + blessingPct) * towerRelicMult));
}

function getTowerExtraTimerSec(ctx: Pick<TowerRunContext, 'towerRun'>): number {
  return (ctx.towerRun?.blessings ?? []).reduce((s, b) => s + (b.extraTimerSec ?? 0), 0);
}

function setupTowerWave(
  ctx: TowerRunContext,
  floor: number,
  wave: number,
  rng: () => number = Math.random
): void {
  if (!ctx.towerRun) return;
  const floorDef = getTowerFloorDef(floor);
  const waveDef = getTowerWaveDef(floor, wave);
  const maxTime = waveDef.durationSec + getTowerExtraTimerSec(ctx);
  const waveOres = waveDef.isBoss ? [] : rollTowerWaveOres(floorDef.floor, waveDef.wave, floorDef.anomaly, rng);
  const totalHp = waveDef.isBoss
    ? waveDef.bossHp
    : waveOres.reduce((sum, ore) => sum + ore.hp, 0);

  ctx.towerRun.floor = floorDef.floor;
  ctx.towerRun.wave = waveDef.wave;
  ctx.towerRun.maxWaves = TOWER_WAVES_PER_FLOOR;
  ctx.towerRun.isBossWave = waveDef.isBoss;
  ctx.towerRun.waveOres = waveOres;
  ctx.towerRun.hp = totalHp;
  ctx.towerRun.maxHp = totalHp;
  ctx.towerRun.timeLeft = maxTime;
  ctx.towerRun.maxTime = maxTime;
  ctx.towerRun.bossInvulLeft = waveDef.isBoss ? TOWER_BOSS_INVUL_SEC : 0;
}

export function startTowerRunDomain(
  ctx: TowerRunContext,
  startFloor = 1,
  now = Date.now(),
  rng: () => number = Math.random,
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncTowerKeysDomain(ctx, now, hooks.save);
  if (ctx.towerKeys <= 0) return false;
  const checkpoints = getTowerCheckpoints(ctx.towerBestFloor);
  const validStart = checkpoints.includes(startFloor) ? startFloor : 1;
  if (ctx.towerKeys === TOWER_MAX_KEYS) {
    ctx.towerLastKeyRegenAt = now;
  }
  ctx.towerKeys -= 1;
  ctx.towerRunMeta.startFloor = validStart;
  ctx.towerRunMeta.newRecord = false;
  ctx.towerLastSummary = null;
  ctx.towerRun = {
    floor: validStart,
    wave: 1,
    maxWaves: TOWER_WAVES_PER_FLOOR,
    isBossWave: false,
    waveOres: [],
    hp: 0,
    maxHp: 0,
    timeLeft: 24,
    maxTime: 24,
    gemsEarned: 0,
    diceEarned: 0,
    floorsCleared: 0,
    wavesCleared: 0,
    blessings: [],
    pendingBlessings: null,
  };
  setupTowerWave(ctx, validStart, 1, rng);
  hooks.emit?.();
  return true;
}

function completeCurrentTowerWaveOrFloor(
  ctx: TowerRunContext,
  rng: () => number,
  emit: () => void = () => {}
): TowerWaveClearResult {
  const run = ctx.towerRun!;
  const currentFloor = run.floor;
  const currentWave = run.wave;
  const floorDef = getTowerFloorDef(currentFloor);
  const waveDef = getTowerWaveDef(currentFloor, currentWave);
  const runGemPct = run.blessings.reduce((s, b) => s + (b.gemBonusPct ?? 0), 0);
  const globalGemPct = getGlobalGemGainBonus(Math.max(ctx.towerBestFloor, currentFloor)) + ctx.getRelicBonus('gemGainPct');
  const gemMult = (1 + runGemPct + globalGemPct) * ctx.getWeatherGemDropMult();

  run.wavesCleared += 1;

  if (currentWave < TOWER_WAVES_PER_FLOOR) {
    const gemsAwarded = Math.max(1, Math.round(waveDef.waveGemReward * gemMult));
    ctx.gems += gemsAwarded;
    run.gemsEarned += gemsAwarded;
    setupTowerWave(ctx, currentFloor, currentWave + 1, rng);
    emit();
    return {
      waveCleared: true,
      floorCleared: false,
      clearedFloor: currentFloor,
      clearedWave: currentWave,
      gemsAwarded,
      diceAwarded: 0,
      milestoneUnlocked: null,
    };
  }

  // Wave 10 Boss defeated -> Floor Cleared!
  const gemsAwarded = Math.max(1, Math.round(floorDef.gemReward * gemMult));
  let diceAwarded = floorDef.diceDropChance > 0 && rng() < floorDef.diceDropChance ? 1 : 0;

  ctx.gems += gemsAwarded;
  run.gemsEarned += gemsAwarded;
  run.floorsCleared += 1;

  if (currentFloor > ctx.towerBestFloor) {
    ctx.towerBestFloor = currentFloor;
    ctx.towerRunMeta.newRecord = true;
  }

  let milestoneUnlocked: number | null = null;
  for (const m of TOWER_MILESTONES) {
    if (ctx.towerBestFloor >= m.floor && !ctx.towerClaimedMilestones.includes(m.floor)) {
      ctx.towerClaimedMilestones.push(m.floor);
      ctx.gems += m.gemBonus;
      run.gemsEarned += m.gemBonus;
      diceAwarded += m.diceBonus;
      milestoneUnlocked = m.floor;
    }
  }

  if (diceAwarded > 0) {
    ctx.enchantDice += diceAwarded;
    run.diceEarned += diceAwarded;
  }

  run.hp = 0;
  run.pendingBlessings = pickTowerBlessingChoices(rng);
  run.blessingTimerLeft = TOWER_BLESSING_AUTO_PICK_SEC;
  emit();
  return {
    waveCleared: true,
    floorCleared: true,
    clearedFloor: currentFloor,
    clearedWave: currentWave,
    gemsAwarded,
    diceAwarded,
    milestoneUnlocked,
  };
}

export function finishTowerRunDomain(
  ctx: TowerRunContext,
  reason: 'timeout' | 'exit',
  emit: () => void = () => {}
): TowerRunSummary | null {
  if (!ctx.towerRun) return null;
  const run = ctx.towerRun;
  const summary: TowerRunSummary = {
    startFloor: ctx.towerRunMeta.startFloor,
    highestReached: run.floor,
    highestWave: run.wave,
    floorsCleared: run.floorsCleared,
    wavesCleared: run.wavesCleared,
    gemsEarned: run.gemsEarned,
    diceEarned: run.diceEarned,
    newRecord: ctx.towerRunMeta.newRecord,
    reason,
  };
  ctx.towerRun = null;
  ctx.towerRunMeta.newRecord = false;
  ctx.towerLastSummary = summary;
  emit();
  return summary;
}

export function chooseTowerBlessingDomain(
  ctx: TowerRunContext,
  blessingId: string,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): boolean {
  if (!ctx.towerRun || !ctx.towerRun.pendingBlessings) return false;
  const picked = ctx.towerRun.pendingBlessings.find((b) => b.id === blessingId) ?? ctx.towerRun.pendingBlessings[0];
  if (!picked) return false;
  ctx.towerRun.blessings.push(picked);
  ctx.towerRun.pendingBlessings = null;
  ctx.towerRun.blessingTimerLeft = 0;
  setupTowerWave(ctx, ctx.towerRun.floor + 1, 1, rng);
  emit();
  return true;
}

export function stepTowerTickDomain(
  ctx: TowerRunContext,
  dtSec: number,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): {
  status: 'idle' | 'paused' | 'active' | 'timeout' | 'blessing-auto-picked';
  summary?: TowerRunSummary | null;
  autoPickedBlessing?: TowerBlessingDef;
} {
  if (!ctx.towerRun) return { status: 'idle' };
  if (ctx.towerRun.pendingBlessings) {
    const prevLeft = ctx.towerRun.blessingTimerLeft ?? TOWER_BLESSING_AUTO_PICK_SEC;
    const nextLeft = Math.max(0, prevLeft - dtSec);
    ctx.towerRun.blessingTimerLeft = nextLeft;
    if (nextLeft <= 0 && ctx.towerRun.pendingBlessings.length > 0) {
      const choices = ctx.towerRun.pendingBlessings;
      const randIdx = Math.min(choices.length - 1, Math.max(0, Math.floor(rng() * choices.length)));
      const picked = choices[randIdx];
      chooseTowerBlessingDomain(ctx, picked.id, rng, emit);
      return { status: 'blessing-auto-picked', autoPickedBlessing: picked };
    }
    return { status: 'paused' };
  }

  if ((ctx.towerRun.bossInvulLeft ?? 0) > 0) {
    ctx.towerRun.bossInvulLeft = Math.max(0, (ctx.towerRun.bossInvulLeft ?? 0) - dtSec);
    return { status: 'active' };
  }

  // Only advance the wave countdown timer; HP drops exclusively from real chibi strikes or player taps.
  ctx.towerRun.timeLeft = Math.max(0, ctx.towerRun.timeLeft - dtSec);
  if (ctx.towerRun.timeLeft <= 0) {
    const summary = finishTowerRunDomain(ctx, 'timeout', emit);
    return { status: 'timeout', summary };
  }
  return { status: 'active' };
}

export function applyTowerTargetDamageDomain(
  ctx: TowerRunContext,
  targetOreIndex: number | null,
  rawDmg: number,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): TowerTargetDamageResult {
  const emptyRes: TowerTargetDamageResult = {
    dmgDealt: 0,
    rockBroken: false,
    targetOreIndex: null,
    waveCleared: false,
    floorCleared: false,
    clearedFloor: null,
    clearedWave: null,
    gemsAwarded: 0,
    diceAwarded: 0,
    milestoneUnlocked: null,
  };
  const run = ctx.towerRun;
  if (!run || run.pendingBlessings || rawDmg <= 0) return emptyRes;

  const dmg = Math.max(1, Math.round(rawDmg));
  if (run.isBossWave) {
    if ((run.bossInvulLeft ?? 0) > 0) {
      return emptyRes;
    }
    const dmgDealt = Math.min(run.hp, dmg);
    run.hp = Math.max(0, run.hp - dmgDealt);
    if (run.hp <= 0) {
      const res = completeCurrentTowerWaveOrFloor(ctx, rng, emit);
      return {
        dmgDealt,
        rockBroken: true,
        targetOreIndex: null,
        ...res,
      };
    }
    emit();
    return {
      ...emptyRes,
      dmgDealt,
    };
  }

  const target =
    (targetOreIndex !== null
      ? run.waveOres.find((o) => o.index === targetOreIndex && o.alive)
      : undefined) ?? run.waveOres.find((o) => o.alive);
  if (!target) {
    const res = completeCurrentTowerWaveOrFloor(ctx, rng, emit);
    return {
      dmgDealt: 0,
      rockBroken: false,
      targetOreIndex: null,
      ...res,
    };
  }

  const dmgDealt = Math.min(target.hp, dmg);
  target.hp = Math.max(0, target.hp - dmgDealt);
  const rockBroken = target.hp <= 0;
  if (rockBroken) {
    target.alive = false;
  }
  run.hp = run.waveOres.reduce((sum, o) => sum + (o.alive ? o.hp : 0), 0);

  const allBroken = run.waveOres.every((o) => !o.alive);
  if (allBroken) {
    const res = completeCurrentTowerWaveOrFloor(ctx, rng, emit);
    return {
      dmgDealt,
      rockBroken,
      targetOreIndex: target.index,
      ...res,
    };
  }

  emit();
  return {
    ...emptyRes,
    dmgDealt,
    rockBroken,
    targetOreIndex: target.index,
  };
}

export function quickSweepTowerDomain(
  ctx: TowerRunContext,
  now = Date.now(),
  hooks: { save?: () => void; emit?: () => void } = {}
): { ok: boolean; gemsAwarded: number } {
  syncTowerKeysDomain(ctx, now, hooks.save);
  if (ctx.towerBestFloor < 1 || ctx.towerKeys <= 0) {
    return { ok: false, gemsAwarded: 0 };
  }
  if (ctx.towerKeys === TOWER_MAX_KEYS) {
    ctx.towerLastKeyRegenAt = now;
  }
  ctx.towerKeys -= 1;
  const baseGems = getTowerSweepGemReward(ctx.towerBestFloor);
  const gemsAwarded = Math.max(
    1,
    Math.round(baseGems * (1 + getGlobalGemGainBonus(ctx.towerBestFloor) + ctx.getRelicBonus('gemGainPct')))
  );
  ctx.gems += gemsAwarded;
  hooks.emit?.();
  return { ok: true, gemsAwarded };
}

export function buyTowerKeyWithGemsDomain(
  ctx: Pick<TowerRunContext, 'towerKeys' | 'towerLastKeyRegenAt' | 'gems'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'bought' | 'full' | 'no_gems' {
  syncTowerKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.towerKeys >= TOWER_MAX_KEYS) return 'full';
  if (ctx.gems < TOWER_KEY_GEM_COST) return 'no_gems';
  ctx.gems -= TOWER_KEY_GEM_COST;
  ctx.towerKeys += 1;
  hooks.emit?.();
  return 'bought';
}

export function grantFreeTowerKeyDomain(
  ctx: Pick<TowerRunContext, 'towerKeys' | 'towerLastKeyRegenAt'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncTowerKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.towerKeys >= TOWER_MAX_KEYS) return false;
  ctx.towerKeys += 1;
  hooks.emit?.();
  return true;
}
