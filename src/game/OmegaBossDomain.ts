import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import { CHIBI_MAX_STARS } from './GameData';
import {
  getOmegaBossById,
  getOmegaTierDef,
  OMEGA_BATTLE_DURATION_SEC,
  OMEGA_BREAK_DMG_MULT,
  OMEGA_BREAK_DURATION_SEC,
  OMEGA_ENTRANCE_DURATION_SEC,
  OMEGA_INVUL_DURATION_SEC,
  OMEGA_INVUL_TAPS_REQUIRED,
  OMEGA_KEY_GEM_COST,
  OMEGA_KEY_REGEN_MS,
  OMEGA_MAX_KEYS,
  OmegaBossId,
} from './OmegaData';

export type OmegaBattlePhase = 'entrance' | 'invul_shield' | 'active';

export interface OmegaTargetObject {
  id: string;
  kind: 'phantom_blade' | 'obsidian_pillar' | 'rune_seal';
  hp: number;
  maxHp: number;
  xOffset: number;
  zOffset: number;
}

export interface OmegaParryWindow {
  active: boolean;
  remainingSec: number;
  durationSec: number;
  consumed: boolean;
}

export interface OmegaBattleState {
  bossId: OmegaBossId;
  tier: 1 | 2 | 3 | 4 | 5;
  phase: OmegaBattlePhase;
  entranceRemainingSec: number;
  invulRemainingSec: number;
  invulTapsRemaining: number;
  invulMaxTaps: number;
  hp: number;
  maxHp: number;
  barrierHp: number;
  maxBarrierHp: number;
  timeRemainingSec: number;
  staggerPct: number;
  breakRemainingSec: number;
  parryCooldownSec: number;
  parryWindow: OmegaParryWindow;
  mechanicCooldownSec: number;
  phase60Triggered: boolean;
  phase30Triggered: boolean;
  targets: OmegaTargetObject[];
  damageDealt: number;
  parriesLanded: number;
  targetsShattered: number;
  breaksTriggered: number;
}

export interface OmegaBattleSummary {
  victory: boolean;
  bossId: OmegaBossId;
  tier: 1 | 2 | 3 | 4 | 5;
  reason: 'victory' | 'timeout' | 'retreat';
  damageDealt: number;
  remainingHpPct?: number;
  shieldFailed?: boolean;
  timeUsedSec: number;
  coresAwarded: number;
  gemsAwarded: number;
  diceAwarded: number;
  firstClear: boolean;
  parriesLanded: number;
  targetsShattered: number;
  breaksTriggered: number;
}

export interface OmegaStrikeResult {
  dmgDealt: number;
  isCrit: boolean;
  isBreak: boolean;
  bossDefeated: boolean;
  breakTriggered: boolean;
}

export interface OmegaBossContext {
  gems: number;
  enchantDice: number;
  miners: Record<string, number>;
  hotbar: (string | null)[];
  discovered: Set<string>;
  chibiStars: Record<string, number>;
  omegaKeys: number;
  omegaLastKeyRegenAt: number;
  omegaCores: Record<string, number>;
  omegaBestTier: Record<string, number>;
  omegaKills: Record<string, number>;
  omegaClaimedFirstClears: string[];
  omegaBattle: OmegaBattleState | null;
  omegaLastSummary: OmegaBattleSummary | null;
  getPlotUnitStats(slotIndex: number): { dmg: number } | null;
}

/** Regenerates Omega Boss Keys based on elapsed 60-minute (1-hour) intervals. */
export function syncOmegaKeysDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): void {
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) {
    ctx.omegaLastKeyRegenAt = now;
    return;
  }
  const elapsed = Math.max(0, now - ctx.omegaLastKeyRegenAt);
  const gained = Math.floor(elapsed / OMEGA_KEY_REGEN_MS);
  if (gained > 0) {
    ctx.omegaKeys = Math.min(OMEGA_MAX_KEYS, ctx.omegaKeys + gained);
    ctx.omegaLastKeyRegenAt =
      ctx.omegaKeys >= OMEGA_MAX_KEYS ? now : ctx.omegaLastKeyRegenAt + gained * OMEGA_KEY_REGEN_MS;
    save();
  }
}

export function getOmegaNextKeyRegenSecDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  now = Date.now(),
  save: () => void = () => {}
): number {
  syncOmegaKeysDomain(ctx, now, save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return 0;
  const remMs = Math.max(0, OMEGA_KEY_REGEN_MS - (now - ctx.omegaLastKeyRegenAt));
  return Math.ceil(remMs / 1000);
}

export function getOmegaUnlockedMaxTierDomain(
  ctx: Pick<OmegaBossContext, 'omegaBestTier'>,
  bossId: OmegaBossId
): 1 | 2 | 3 | 4 | 5 {
  const best = ctx.omegaBestTier[bossId] ?? 0;
  return Math.max(1, Math.min(5, best + 1)) as 1 | 2 | 3 | 4 | 5;
}

export function buyOmegaKeyWithGemsDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt' | 'gems'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'bought' | 'full' | 'no_gems' {
  syncOmegaKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return 'full';
  if (ctx.gems < OMEGA_KEY_GEM_COST) return 'no_gems';
  ctx.gems -= OMEGA_KEY_GEM_COST;
  ctx.omegaKeys += 1;
  hooks.emit?.();
  return 'bought';
}

export function grantFreeOmegaKeyDomain(
  ctx: Pick<OmegaBossContext, 'omegaKeys' | 'omegaLastKeyRegenAt'>,
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncOmegaKeysDomain(ctx, Date.now(), hooks.save);
  if (ctx.omegaKeys >= OMEGA_MAX_KEYS) return false;
  ctx.omegaKeys += 1;
  hooks.emit?.();
  return true;
}

export function getOmegaSquadEffectiveDpsDomain(ctx: Pick<OmegaBossContext, 'getPlotUnitStats'>): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const st = ctx.getPlotUnitStats(i);
    if (st) total += st.dmg;
  }
  return total;
}

/** Starts a 45s 1v5 Boss duel on the Omega Duel Sanctum (does not deduct key until victory). */
export function startOmegaBossDomain(
  ctx: OmegaBossContext,
  bossId: OmegaBossId,
  requestedTier: number,
  now = Date.now(),
  hooks: { save?: () => void; emit?: () => void } = {}
): boolean {
  syncOmegaKeysDomain(ctx, now, hooks.save);
  if (ctx.omegaKeys <= 0) return false;
  if (getOmegaSquadEffectiveDpsDomain(ctx) <= 0) return false;

  const maxAllowed = getOmegaUnlockedMaxTierDomain(ctx, bossId);
  const clampedTier = Math.max(1, Math.min(maxAllowed, Math.floor(requestedTier))) as 1 | 2 | 3 | 4 | 5;
  const tierDef = getOmegaTierDef(bossId, clampedTier);

  ctx.omegaBattle = {
    bossId,
    tier: clampedTier,
    phase: 'entrance',
    entranceRemainingSec: OMEGA_ENTRANCE_DURATION_SEC,
    invulRemainingSec: OMEGA_INVUL_DURATION_SEC,
    invulTapsRemaining: OMEGA_INVUL_TAPS_REQUIRED,
    invulMaxTaps: OMEGA_INVUL_TAPS_REQUIRED,
    hp: tierDef.bossHp,
    maxHp: tierDef.bossHp,
    barrierHp: 0,
    maxBarrierHp: Math.round(tierDef.bossHp * 0.1),
    timeRemainingSec: OMEGA_BATTLE_DURATION_SEC,
    staggerPct: 0,
    breakRemainingSec: 0,
    parryCooldownSec: bossId === 'crimson-ronin' ? 4.5 : 999,
    parryWindow: {
      active: false,
      remainingSec: 0,
      durationSec: 2.3,
      consumed: false,
    },
    mechanicCooldownSec: bossId === 'obsidian-sovereign' || bossId === 'abyssal-leviathan' ? 5.5 : 999,
    phase60Triggered: false,
    phase30Triggered: false,
    targets: [],
    damageDealt: 0,
    parriesLanded: 0,
    targetsShattered: 0,
    breaksTriggered: 0,
  };
  ctx.omegaLastSummary = null;
  hooks.emit?.();
  return true;
}

function addOmegaStagger(battle: OmegaBattleState, amount: number): boolean {
  if (battle.breakRemainingSec > 0) return false;
  battle.staggerPct = Math.min(100, battle.staggerPct + amount);
  if (battle.staggerPct >= 100) {
    battle.staggerPct = 0;
    battle.breakRemainingSec = OMEGA_BREAK_DURATION_SEC;
    battle.breaksTriggered += 1;
    battle.barrierHp = 0;
    return true;
  }
  return false;
}

function spawnRoninPhantoms(battle: OmegaBattleState, tag: string): void {
  if (battle.targets.some((t) => t.kind === 'phantom_blade')) return;
  battle.targets.push(
    { id: `phantom-${tag}-l`, kind: 'phantom_blade', hp: 1, maxHp: 1, xOffset: -2.9, zOffset: -0.6 },
    { id: `phantom-${tag}-r`, kind: 'phantom_blade', hp: 1, maxHp: 1, xOffset: 2.9, zOffset: -0.6 }
  );
}

function spawnSovereignMechanic(battle: OmegaBattleState, rng: () => number): void {
  const hasPillars = battle.targets.some((t) => t.kind === 'obsidian_pillar');
  if (!hasPillars) {
    battle.targets.push(
      { id: `pillar-${Math.round(rng() * 1e6)}-l`, kind: 'obsidian_pillar', hp: 1, maxHp: 1, xOffset: -3.2, zOffset: -0.2 },
      { id: `pillar-${Math.round(rng() * 1e6)}-r`, kind: 'obsidian_pillar', hp: 1, maxHp: 1, xOffset: 3.2, zOffset: -0.2 }
    );
  } else if (battle.targets.filter((t) => t.kind === 'rune_seal').length < 2) {
    const side = rng() < 0.5 ? -1.9 : 1.9;
    battle.targets.push({
      id: `seal-${Math.round(rng() * 1e6)}`,
      kind: 'rune_seal',
      hp: 1,
      maxHp: 1,
      xOffset: side,
      zOffset: 1.5,
    });
  }
}

export function stepOmegaBossTickDomain(
  ctx: OmegaBossContext,
  dtSec: number,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): OmegaBattleSummary | null {
  const battle = ctx.omegaBattle;
  if (!battle) return null;
  const clampedDt = Math.max(0, Math.min(0.25, dtSec));
  if (clampedDt <= 0) return null;

  if (battle.phase === 'entrance') {
    battle.entranceRemainingSec = Math.max(0, battle.entranceRemainingSec - clampedDt);
    if (battle.entranceRemainingSec <= 0) {
      battle.phase = 'invul_shield';
      emit();
    }
    return null;
  }

  if (battle.phase === 'invul_shield') {
    battle.invulRemainingSec = Math.max(0, battle.invulRemainingSec - clampedDt);
    if (battle.invulRemainingSec <= 0) {
      return finishOmegaBossDomain(ctx, 'timeout', rng, emit);
    }
    return null;
  }

  battle.timeRemainingSec = Math.max(0, battle.timeRemainingSec - clampedDt);
  if (battle.breakRemainingSec > 0) {
    battle.breakRemainingSec = Math.max(0, battle.breakRemainingSec - clampedDt);
  }

  if (battle.bossId === 'crimson-ronin') {
    if (battle.parryWindow.active) {
      battle.parryWindow.remainingSec = Math.max(0, battle.parryWindow.remainingSec - clampedDt);
      if (battle.parryWindow.remainingSec <= 0) {
        battle.parryWindow.active = false;
        if (!battle.parryWindow.consumed && battle.breakRemainingSec <= 0) {
          // Missed parry grants Ronin a brief 8% barrier
          const shieldAdd = Math.round(battle.maxHp * 0.08);
          battle.barrierHp = Math.min(battle.maxBarrierHp, battle.barrierHp + shieldAdd);
        }
        battle.parryCooldownSec = 6.5;
      }
    } else if (battle.breakRemainingSec <= 0) {
      battle.parryCooldownSec -= clampedDt;
      if (battle.parryCooldownSec <= 0) {
        battle.parryWindow = {
          active: true,
          remainingSec: battle.parryWindow.durationSec,
          durationSec: 2.3,
          consumed: false,
        };
      }
    }

    const hpPct = battle.hp / Math.max(1, battle.maxHp);
    if (!battle.phase60Triggered && hpPct <= 0.6) {
      battle.phase60Triggered = true;
      spawnRoninPhantoms(battle, '60');
    }
    if (!battle.phase30Triggered && hpPct <= 0.3) {
      battle.phase30Triggered = true;
      spawnRoninPhantoms(battle, '30');
    }
  } else {
    if (battle.breakRemainingSec <= 0) {
      battle.mechanicCooldownSec -= clampedDt;
      if (battle.mechanicCooldownSec <= 0) {
        spawnSovereignMechanic(battle, rng);
        battle.mechanicCooldownSec = 9.5;
      }
    }
  }

  if (battle.timeRemainingSec <= 0) {
    return finishOmegaBossDomain(ctx, 'timeout', rng, emit);
  }
  return null;
}

/** Breaks 1 pip of the Boss's 30s invulnerability shield via random screen tap before Chibis can attack. */
export function tapOmegaInvulShieldDomain(
  ctx: OmegaBossContext,
  emit: () => void = () => {}
): { ok: boolean; shattered: boolean; tapsRemaining: number } {
  const battle = ctx.omegaBattle;
  if (!battle || battle.phase !== 'invul_shield') {
    return { ok: false, shattered: false, tapsRemaining: 0 };
  }
  battle.invulTapsRemaining = Math.max(0, battle.invulTapsRemaining - 1);
  const shattered = battle.invulTapsRemaining <= 0;
  if (shattered) {
    battle.phase = 'active';
  }
  emit();
  return { ok: true, shattered, tapsRemaining: battle.invulTapsRemaining };
}

/** Applies a single Chibi fighter strike during Omega Boss duel (Team DMG + Overclock/Crit + Break). */
export function applyOmegaSquadStrikeDomain(
  ctx: OmegaBossContext,
  slotIndex: number,
  attackIntervalSec = 0.85,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): OmegaStrikeResult {
  const battle = ctx.omegaBattle;
  if (!battle || battle.hp <= 0 || battle.phase !== 'active') {
    return { dmgDealt: 0, isCrit: false, isBreak: false, bossDefeated: false, breakTriggered: false };
  }
  const st = ctx.getPlotUnitStats(slotIndex);
  if (!st || st.dmg <= 0) {
    return { dmgDealt: 0, isCrit: false, isBreak: false, bossDefeated: false, breakTriggered: false };
  }

  const isBreak = battle.breakRemainingSec > 0;
  const isCrit = isBreak || rng() < 0.22;
  const critMult = isCrit ? 1.85 : 1.0;
  const breakMult = isBreak ? OMEGA_BREAK_DMG_MULT : 1.0;

  // Obsidian / Leviathan Pillars reduce incoming damage by 60% while standing
  const hasPillarArmor =
    (battle.bossId === 'obsidian-sovereign' || battle.bossId === 'abyssal-leviathan') &&
    !isBreak &&
    battle.targets.some((t) => t.kind === 'obsidian_pillar');
  const armorMult = hasPillarArmor ? 0.4 : 1.0;

  const rawDmg = Math.max(
    1,
    Math.round(st.dmg * Math.max(0.01, attackIntervalSec) * critMult * breakMult * armorMult)
  );
  let remainingDmg = rawDmg;
  if (battle.barrierHp > 0) {
    const absorbed = Math.min(battle.barrierHp, remainingDmg);
    battle.barrierHp -= absorbed;
    remainingDmg -= absorbed;
  }
  const hpDmg = Math.min(battle.hp, remainingDmg);
  battle.hp = Math.max(0, battle.hp - hpDmg);
  battle.damageDealt += rawDmg;

  const staggerScale = Math.min(1.15, Math.max(0.28, attackIntervalSec * 0.72));
  const breakTriggered = addOmegaStagger(battle, (isCrit ? 1.1 : 0.52) * staggerScale);
  const bossDefeated = battle.hp <= 0;
  if (bossDefeated) {
    finishOmegaBossDomain(ctx, 'victory', rng, emit);
  }
  return { dmgDealt: rawDmg, isCrit, isBreak, bossDefeated, breakTriggered };
}

/** Triggers a player Parry click during Crimson Ronin's golden Parry Ring window. */
export function triggerOmegaParryDomain(
  ctx: OmegaBossContext,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): { ok: boolean; counterDmg: number; breakTriggered: boolean; bossDefeated: boolean } {
  const battle = ctx.omegaBattle;
  if (!battle || battle.phase !== 'active' || !battle.parryWindow.active || battle.parryWindow.consumed) {
    return { ok: false, counterDmg: 0, breakTriggered: false, bossDefeated: false };
  }
  battle.parryWindow.consumed = true;
  battle.parryWindow.active = false;
  battle.parryCooldownSec = 6.5;
  battle.parriesLanded += 1;
  battle.barrierHp = 0;

  const counterDmg = Math.max(1, Math.round(battle.maxHp * 0.08));
  battle.hp = Math.max(0, battle.hp - counterDmg);
  battle.damageDealt += counterDmg;

  const breakTriggered = addOmegaStagger(battle, 25);
  const bossDefeated = battle.hp <= 0;
  if (bossDefeated) {
    finishOmegaBossDomain(ctx, 'victory', rng, emit);
  } else {
    emit();
  }
  return { ok: true, counterDmg, breakTriggered, bossDefeated };
}

/** Clicks/shatters an active Phantom Blade, Obsidian Pillar, or Rune Seal target in the Omega Arena. */
export function hitOmegaTargetObjectDomain(
  ctx: OmegaBossContext,
  targetId: string,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): { ok: boolean; kind?: OmegaTargetObject['kind']; bonusDmg: number; breakTriggered: boolean; bossDefeated: boolean } {
  const battle = ctx.omegaBattle;
  if (!battle || battle.phase !== 'active') return { ok: false, bonusDmg: 0, breakTriggered: false, bossDefeated: false };
  const idx = battle.targets.findIndex((t) => t.id === targetId);
  if (idx < 0) return { ok: false, bonusDmg: 0, breakTriggered: false, bossDefeated: false };

  const target = battle.targets[idx];
  battle.targets.splice(idx, 1);
  battle.targetsShattered += 1;

  const bonusDmg =
    target.kind === 'rune_seal'
      ? Math.max(1, Math.round(battle.maxHp * 0.05))
      : Math.max(1, Math.round(battle.maxHp * 0.03));
  battle.hp = Math.max(0, battle.hp - bonusDmg);
  battle.damageDealt += bonusDmg;

  const staggerGain = target.kind === 'obsidian_pillar' ? 25 : 20;
  const breakTriggered = addOmegaStagger(battle, staggerGain);
  const bossDefeated = battle.hp <= 0;
  if (bossDefeated) {
    finishOmegaBossDomain(ctx, 'victory', rng, emit);
  } else {
    emit();
  }
  return { ok: true, kind: target.kind, bonusDmg, breakTriggered, bossDefeated };
}

export function finishOmegaBossDomain(
  ctx: OmegaBossContext,
  reason: 'victory' | 'timeout' | 'retreat',
  rng: () => number = Math.random,
  emit: () => void = () => {}
): OmegaBattleSummary | null {
  const battle = ctx.omegaBattle;
  if (!battle) return null;

  const victory = reason === 'victory';
  const tierDef = getOmegaTierDef(battle.bossId, battle.tier);
  let coresAwarded = 0;
  let gemsAwarded = 0;
  let diceAwarded = 0;
  let firstClear = false;

  if (victory) {
    if (ctx.omegaKeys >= OMEGA_MAX_KEYS) {
      ctx.omegaLastKeyRegenAt = Date.now();
    }
    ctx.omegaKeys = Math.max(0, ctx.omegaKeys - 1);
    ctx.omegaKills[battle.bossId] = (ctx.omegaKills[battle.bossId] || 0) + 1;
    ctx.omegaBestTier[battle.bossId] = Math.max(ctx.omegaBestTier[battle.bossId] || 0, battle.tier);

    const clearKey = `${battle.bossId}:${battle.tier}`;
    if (!ctx.omegaClaimedFirstClears.includes(clearKey)) {
      ctx.omegaClaimedFirstClears.push(clearKey);
      firstClear = true;
      gemsAwarded = tierDef.firstClearGems;
      diceAwarded = tierDef.firstClearDice;
    } else {
      gemsAwarded = tierDef.repeatGems;
    }

    if (rng() < tierDef.coreDropChance) {
      const span = Math.max(0, tierDef.maxCores - tierDef.minCores);
      coresAwarded = tierDef.minCores + Math.floor(rng() * (span + 1));
      ctx.omegaCores[battle.bossId] = (ctx.omegaCores[battle.bossId] || 0) + coresAwarded;
    }

    ctx.gems += gemsAwarded;
    ctx.enchantDice += diceAwarded;
  }

  const summary: OmegaBattleSummary = {
    victory,
    bossId: battle.bossId,
    tier: battle.tier,
    reason,
    damageDealt: battle.damageDealt,
    remainingHpPct: Math.max(0, Math.min(100, Math.round((battle.hp / Math.max(1, battle.maxHp)) * 100))),
    shieldFailed: !victory && battle.phase === 'invul_shield',
    timeUsedSec: Math.max(0, Math.round(OMEGA_BATTLE_DURATION_SEC - battle.timeRemainingSec)),
    coresAwarded,
    gemsAwarded,
    diceAwarded,
    firstClear,
    parriesLanded: battle.parriesLanded,
    targetsShattered: battle.targetsShattered,
    breaksTriggered: battle.breaksTriggered,
  };
  ctx.omegaBattle = null;
  ctx.omegaLastSummary = summary;
  emit();
  return summary;
}

/** Unlocks an OMEGA Chibi using 5 Boss Cores (places in bag/hotbar & Index). */
export function unlockOmegaChibiDomain(
  ctx: Pick<OmegaBossContext, 'omegaCores' | 'miners' | 'hotbar' | 'discovered' | 'chibiStars'>,
  bossId: OmegaBossId,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'unlocked' | 'owned' | 'no_cores' | 'invalid' {
  const def = getOmegaBossById(bossId);
  if (!def) return 'invalid';
  if ((ctx.miners[def.chibiId] || 0) > 0) return 'owned';
  const cores = ctx.omegaCores[bossId] || 0;
  if (cores < def.unlockCoreCost) return 'no_cores';

  ctx.omegaCores[bossId] = cores - def.unlockCoreCost;
  ctx.miners[def.chibiId] = 1;
  ctx.chibiStars[def.chibiId] = Math.max(1, ctx.chibiStars[def.chibiId] || 1);
  ctx.discovered.add(def.chibiId);
  if (!ctx.hotbar.includes(def.chibiId)) {
    const emptyIdx = ctx.hotbar.indexOf(null);
    if (emptyIdx !== -1) ctx.hotbar[emptyIdx] = def.chibiId;
  }
  hooks.save?.();
  hooks.emit?.();
  return 'unlocked';
}

/** Awakens an owned OMEGA Chibi from 1★ toward 5★ using extra Boss Cores (+20% passives/star). */
export function awakenOmegaChibiDomain(
  ctx: Pick<OmegaBossContext, 'omegaCores' | 'miners' | 'chibiStars'>,
  bossId: OmegaBossId,
  hooks: { save?: () => void; emit?: () => void } = {}
): 'awakened' | 'not_owned' | 'maxed' | 'no_cores' | 'invalid' {
  const def = getOmegaBossById(bossId);
  if (!def) return 'invalid';
  if ((ctx.miners[def.chibiId] || 0) <= 0) return 'not_owned';

  const curStars = Math.max(1, ctx.chibiStars[def.chibiId] || 1);
  if (curStars >= CHIBI_MAX_STARS) return 'maxed';
  const cost = def.awakenCoreCosts[curStars - 1] ?? def.awakenCoreCosts[def.awakenCoreCosts.length - 1];
  const cores = ctx.omegaCores[bossId] || 0;
  if (cores < cost) return 'no_cores';

  ctx.omegaCores[bossId] = cores - cost;
  ctx.chibiStars[def.chibiId] = curStars + 1;
  hooks.save?.();
  hooks.emit?.();
  return 'awakened';
}
