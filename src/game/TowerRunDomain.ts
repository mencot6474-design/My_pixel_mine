import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import { getEnchantById } from './GameData';
import type { PlotUnitState } from './GameStateSave';
import { RelicEffectStat } from './RelicData';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerStreakGemMult,
  getTowerSweepGemReward,
  getTowerWaveDef,
  pickTowerBlessingChoices,
  rollTowerWaveOres,
  summarizeTowerBlessings,
  TOWER_BLESSING_AUTO_PICK_SEC,
  TOWER_BLESSING_REROLL_GEM_COST,
  TOWER_BOSS_COIN_CHANCE,
  TOWER_BOSS_COIN_DROP,
  TOWER_BOSS_EXPOSE_DMG_MULT,
  TOWER_BOSS_EXPOSE_SEC,
  TOWER_BOSS_INVUL_SEC,
  TOWER_BOSS_SHIELD_SHAVE_SEC,
  TOWER_DICE_PITY_MAX,
  TOWER_KEY_GEM_COST,
  TOWER_KEY_REGEN_MS,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_COIN_CHANCE,
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
  towerDicePity: number;
  towerCoins: number;
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
  towerCompleted?: boolean;
  clearedFloor: number;
  clearedWave: number;
  gemsAwarded: number;
  diceAwarded: number;
  coinsAwarded: number;
  milestoneUnlocked: number | null;
  pityTriggered?: boolean;
}

export interface TowerTargetDamageResult {
  dmgDealt: number;
  rockBroken: boolean;
  targetOreIndex: number | null;
  waveCleared: boolean;
  floorCleared: boolean;
  towerCompleted?: boolean;
  clearedFloor: number | null;
  clearedWave: number | null;
  gemsAwarded: number;
  diceAwarded: number;
  coinsAwarded: number;
  milestoneUnlocked: number | null;
  isCrit?: boolean;
  pityTriggered?: boolean;
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
  return summarizeTowerBlessings(ctx.towerRun?.blessings ?? []).extraTimerSec;
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
  const maxTime = Math.max(10, waveDef.durationSec + getTowerExtraTimerSec(ctx));
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
  ctx.towerRun.bossExposeLeft = 0;
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
    coinsEarned: 0,
    floorsCleared: 0,
    wavesCleared: 0,
    blessings: [],
    pendingBlessings: null,
    bossExposeLeft: 0,
    freeBlessingRerolls: 1,
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
  const bSummary = summarizeTowerBlessings(run.blessings);
  const streakMult = getTowerStreakGemMult(run.floorsCleared);
  const globalGemPct = getGlobalGemGainBonus(Math.max(ctx.towerBestFloor, currentFloor)) + ctx.getRelicBonus('gemGainPct');
  const gemMult = (1 + bSummary.gemBonusPct + globalGemPct) * streakMult * ctx.getWeatherGemDropMult();

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
      coinsAwarded: 0,
      milestoneUnlocked: null,
    };
  }

  // Wave 10 Boss defeated -> Floor Cleared!
  const gemsAwarded = Math.max(1, Math.round(floorDef.gemReward * gemMult));
  const diceChance = Math.min(0.95, floorDef.diceDropChance + bSummary.diceChanceBonus);
  const rolledDice = diceChance > 0 && rng() < diceChance;
  const pityReady = (ctx.towerDicePity ?? 0) + 1 >= TOWER_DICE_PITY_MAX;
  let diceAwarded = 0;
  let pityTriggered = false;
  if (rolledDice || pityReady) {
    diceAwarded = 1;
    pityTriggered = !rolledDice && pityReady;
    ctx.towerDicePity = 0;
  } else {
    ctx.towerDicePity = Math.min(TOWER_DICE_PITY_MAX - 1, (ctx.towerDicePity ?? 0) + 1);
  }

  const coinsAwarded = rng() < TOWER_BOSS_COIN_CHANCE ? TOWER_BOSS_COIN_DROP : 0;
  if (coinsAwarded > 0) {
    ctx.towerCoins = (ctx.towerCoins ?? 0) + coinsAwarded;
    run.coinsEarned += coinsAwarded;
  }

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
  run.bossExposeLeft = 0;

  if (currentFloor >= TOWER_MAX_FLOOR) {
    finishTowerRunDomain(ctx, 'victory', emit);
    return {
      waveCleared: true,
      floorCleared: true,
      towerCompleted: true,
      clearedFloor: currentFloor,
      clearedWave: currentWave,
      gemsAwarded,
      diceAwarded,
      coinsAwarded,
      milestoneUnlocked,
      pityTriggered,
    };
  }

  run.pendingBlessings = pickTowerBlessingChoices(rng, [], run.blessings);
  run.blessingTimerLeft = TOWER_BLESSING_AUTO_PICK_SEC;
  emit();
  return {
    waveCleared: true,
    floorCleared: true,
    towerCompleted: false,
    clearedFloor: currentFloor,
    clearedWave: currentWave,
    gemsAwarded,
    diceAwarded,
    coinsAwarded,
    milestoneUnlocked,
    pityTriggered,
  };
}

export function finishTowerRunDomain(
  ctx: TowerRunContext,
  reason: 'timeout' | 'exit' | 'victory',
  emit: () => void = () => {}
): TowerRunSummary | null {
  if (!ctx.towerRun) return null;
  const run = ctx.towerRun;
  const remainingHpPct =
    reason === 'timeout' && run.maxHp > 0 && run.hp > 0
      ? Math.max(1, Math.min(100, Math.round((run.hp / run.maxHp) * 100)))
      : 0;
  const summary: TowerRunSummary = {
    startFloor: ctx.towerRunMeta.startFloor,
    highestReached: run.floor,
    highestWave: run.wave,
    floorsCleared: run.floorsCleared,
    wavesCleared: run.wavesCleared,
    gemsEarned: run.gemsEarned,
    diceEarned: run.diceEarned,
    coinsEarned: run.coinsEarned,
    newRecord: ctx.towerRunMeta.newRecord,
    reason,
    remainingHpPct,
    wasBossWave: run.isBossWave,
    bestStreakMult: getTowerStreakGemMult(run.floorsCleared),
  };
  ctx.towerRun = null;
  ctx.towerRunMeta.newRecord = false;
  ctx.towerLastSummary = summary;
  emit();
  return summary;
}

export function rerollTowerBlessingsDomain(
  ctx: TowerRunContext,
  rng: () => number = Math.random,
  hooks: { save?: () => void; emit?: () => void } = {}
): { ok: boolean; usedFree: boolean; costGems: number } {
  const run = ctx.towerRun;
  if (!run || !run.pendingBlessings) {
    return { ok: false, usedFree: false, costGems: 0 };
  }
  const freeLeft = run.freeBlessingRerolls ?? 0;
  if (freeLeft > 0) {
    run.freeBlessingRerolls = freeLeft - 1;
    run.pendingBlessings = pickTowerBlessingChoices(
      rng,
      run.pendingBlessings.map((b) => b.id),
      run.blessings
    );
    run.blessingTimerLeft = TOWER_BLESSING_AUTO_PICK_SEC;
    hooks.emit?.();
    return { ok: true, usedFree: true, costGems: 0 };
  }
  if (ctx.gems < TOWER_BLESSING_REROLL_GEM_COST) {
    return { ok: false, usedFree: false, costGems: TOWER_BLESSING_REROLL_GEM_COST };
  }
  ctx.gems -= TOWER_BLESSING_REROLL_GEM_COST;
  run.pendingBlessings = pickTowerBlessingChoices(
    rng,
    run.pendingBlessings.map((b) => b.id),
    run.blessings
  );
  run.blessingTimerLeft = TOWER_BLESSING_AUTO_PICK_SEC;
  hooks.save?.();
  hooks.emit?.();
  return { ok: true, usedFree: false, costGems: TOWER_BLESSING_REROLL_GEM_COST };
}

export function hitTowerBossShieldSweetSpotDomain(
  ctx: Pick<TowerRunContext, 'towerRun'>,
  emit: () => void = () => {}
): {
  hit: boolean;
  shieldBroken: boolean;
  remainingShieldSec: number;
  bossExposeLeft: number;
} {
  const run = ctx.towerRun;
  if (!run || !run.isBossWave || run.pendingBlessings || (run.bossInvulLeft ?? 0) <= 0) {
    return {
      hit: false,
      shieldBroken: false,
      remainingShieldSec: run?.bossInvulLeft ?? 0,
      bossExposeLeft: run?.bossExposeLeft ?? 0,
    };
  }
  const nextShield = Math.max(0, (run.bossInvulLeft ?? 0) - TOWER_BOSS_SHIELD_SHAVE_SEC);
  run.bossInvulLeft = nextShield;
  const shieldBroken = nextShield <= 0;
  if (shieldBroken) {
    run.bossExposeLeft = TOWER_BOSS_EXPOSE_SEC;
  }
  emit();
  return {
    hit: true,
    shieldBroken,
    remainingShieldSec: nextShield,
    bossExposeLeft: run.bossExposeLeft ?? 0,
  };
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

  if ((ctx.towerRun.bossExposeLeft ?? 0) > 0) {
    ctx.towerRun.bossExposeLeft = Math.max(0, (ctx.towerRun.bossExposeLeft ?? 0) - dtSec);
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
    coinsAwarded: 0,
    milestoneUnlocked: null,
  };
  const run = ctx.towerRun;
  if (!run || run.pendingBlessings || rawDmg <= 0) return emptyRes;

  const bSummary = summarizeTowerBlessings(run.blessings);
  let effectiveDmg = Math.max(1, Math.round(rawDmg));
  let isCrit = false;
  if (bSummary.critChanceBonus > 0 && rng() < Math.min(0.75, bSummary.critChanceBonus)) {
    isCrit = true;
    effectiveDmg = Math.max(1, Math.round(effectiveDmg * (1.75 + bSummary.critDmgBonus)));
  }
  if (bSummary.extraStrikeChance > 0 && rng() < Math.min(0.75, bSummary.extraStrikeChance)) {
    effectiveDmg += Math.max(1, Math.round(effectiveDmg * bSummary.extraStrikePct));
  }

  if (run.isBossWave) {
    if ((run.bossInvulLeft ?? 0) > 0) {
      return emptyRes;
    }
    if (bSummary.bossDmgPct > 0) {
      effectiveDmg = Math.max(1, Math.round(effectiveDmg * (1 + bSummary.bossDmgPct)));
    }
    if ((run.bossExposeLeft ?? 0) > 0) {
      effectiveDmg = Math.max(1, Math.round(effectiveDmg * TOWER_BOSS_EXPOSE_DMG_MULT));
    }
    const dmgDealt = Math.min(run.hp, effectiveDmg);
    run.hp = Math.max(0, run.hp - dmgDealt);
    if (run.hp <= 0) {
      const res = completeCurrentTowerWaveOrFloor(ctx, rng, emit);
      return {
        dmgDealt,
        rockBroken: true,
        targetOreIndex: null,
        isCrit,
        ...res,
      };
    }
    emit();
    return {
      ...emptyRes,
      dmgDealt,
      isCrit,
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

  const dmgDealt = Math.min(target.hp, effectiveDmg);
  target.hp = Math.max(0, target.hp - dmgDealt);
  const rockBroken = target.hp <= 0;
  let brokenRocksThisHit = 0;
  if (rockBroken) {
    target.alive = false;
    brokenRocksThisHit += 1;
  }

  // Overkill Splash: excess damage on ore break carries into the next alive ore
  if (rockBroken && bSummary.overkillPct > 0) {
    let splashPool = Math.round(Math.max(0, effectiveDmg - dmgDealt) * bSummary.overkillPct);
    while (splashPool > 0) {
      const nextOre = run.waveOres.find((o) => o.alive);
      if (!nextOre) break;
      const splashHit = Math.min(nextOre.hp, splashPool);
      nextOre.hp = Math.max(0, nextOre.hp - splashHit);
      if (nextOre.hp <= 0) {
        nextOre.alive = false;
        brokenRocksThisHit += 1;
      }
      splashPool -= splashHit;
    }
  }

  // Chain Spark: arcs % of hit damage to other alive ores in the same wave
  if (bSummary.chainTargets > 0 && bSummary.chainPct > 0) {
    const arcDmg = Math.max(1, Math.round(effectiveDmg * bSummary.chainPct));
    const others = run.waveOres.filter((o) => o.alive && o.index !== target.index);
    for (let i = 0; i < Math.min(bSummary.chainTargets, others.length); i++) {
      const other = others[i];
      other.hp = Math.max(0, other.hp - arcDmg);
      if (other.hp <= 0) {
        other.alive = false;
        brokenRocksThisHit += 1;
      }
    }
  }

  let oreCoinsAwarded = 0;
  for (let i = 0; i < brokenRocksThisHit; i++) {
    if (rng() < TOWER_ORE_COIN_CHANCE) {
      oreCoinsAwarded += 1;
    }
  }
  if (oreCoinsAwarded > 0) {
    ctx.towerCoins = (ctx.towerCoins ?? 0) + oreCoinsAwarded;
    run.coinsEarned += oreCoinsAwarded;
  }

  run.hp = run.waveOres.reduce((sum, o) => sum + (o.alive ? o.hp : 0), 0);

  const allBroken = run.waveOres.every((o) => !o.alive);
  if (allBroken) {
    const res = completeCurrentTowerWaveOrFloor(ctx, rng, emit);
    return {
      dmgDealt,
      rockBroken,
      targetOreIndex: target.index,
      isCrit,
      ...res,
      coinsAwarded: res.coinsAwarded + oreCoinsAwarded,
    };
  }

  emit();
  return {
    ...emptyRes,
    dmgDealt,
    rockBroken,
    targetOreIndex: target.index,
    coinsAwarded: oreCoinsAwarded,
    isCrit,
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
