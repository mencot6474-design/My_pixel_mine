import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  ANOMALY_CHIBI_DEFS,
  type AnomalyChibiId,
  getAnomalyChibiById,
  getRiftHourlyBossId,
  getRiftTierProgress,
  RIFT_ANOMALIES,
  RIFT_BATTLE_DURATION_SEC,
  RIFT_INSTANT_DROP_CHANCE,
  RIFT_MAX_ATTEMPTS_PER_WINDOW,
  RIFT_PASS_DURATION_MS,
  RIFT_PASS_GEM_COST,
  RIFT_WINDOW_DURATION_MIN,
  type RiftAnomalyDef,
  type RiftAnomalyId,
} from './AnomalyData';

export interface RiftWindowQuotaInput {
  riftHourlyKey?: string;
  riftHourlyAttemptsUsed?: number;
  riftPassAttemptsUsed?: number;
}

export interface RiftWindowSnapshot {
  isOpen: boolean;
  source: 'hourly' | 'pass' | 'closed';
  activeBucket: 'hourly' | 'pass' | 'none';
  remainingSec: number;
  nextOpenSec: number;
  attemptsRemaining: number;
  maxAttempts: number;
  bossId: AnomalyChibiId;
  anomaly: RiftAnomalyDef;
}

export interface RiftBattleState {
  bossId: AnomalyChibiId;
  anomalyId: RiftAnomalyId;
  source: 'hourly' | 'pass';
  timeRemainingSec: number;
  durationSec: number;
  damageDealt: number;
  currentTier: number;
  tapCount: number;
  meteorTimerSec: number;
}

export interface RiftBattleSummary {
  bossId: AnomalyChibiId;
  anomalyId: RiftAnomalyId;
  damageDealt: number;
  tierReached: number;
  shardsEarned: number;
  droppedChibiId: AnomalyChibiId | null;
  isNewBest: boolean;
  attemptsRemaining: number;
  retreated: boolean;
}

export interface RiftDomainContext {
  gems: number;
  riftShards: number;
  riftPassExpiresAt: number;
  riftBreachesCompleted: number;
  riftHourlyKey: string;
  riftHourlyAttemptsUsed: number;
  riftPassAttemptsUsed: number;
  riftBestDamage: number;
  riftBestTier: number;
  riftBattle: RiftBattleState | null;
  riftLastSummary: RiftBattleSummary | null;
  plotMiners: (string | null)[];
  miners: Record<string, number>;
  chibiStars?: Record<string, number>;
  discovered: Set<string>;
  getPlotUnitStats(
    slotIndex: number,
    nowMs?: number,
    includeOverclock?: boolean
  ): { dmg: number; critChance: number; critMult: number } | null;
}

export interface RiftBreachClaimResult {
  shardsEarned: number;
  droppedChibiId: AnomalyChibiId | null;
}

function getHourlyKey(nowMs: number): { hourIndex: number; hourlyKey: string } {
  const hourIndex = Math.max(0, Math.floor(nowMs / 3_600_000));
  return { hourIndex, hourlyKey: `hourly:${hourIndex}` };
}

/** Computes real-time `:00–:15` Rift status, dual-bucket attempt quota, active Boss, and Anomaly. */
export function getRiftWindowSnapshot(
  nowMs: number,
  riftPassExpiresAt: number,
  quota?: RiftWindowQuotaInput
): RiftWindowSnapshot {
  const date = new Date(nowMs);
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const { hourIndex, hourlyKey } = getHourlyKey(nowMs);
  const anomaly = RIFT_ANOMALIES[hourIndex % RIFT_ANOMALIES.length];
  const bossId = getRiftHourlyBossId(hourIndex);

  const hourlyOpen = min < RIFT_WINDOW_DURATION_MIN;
  const hourlyUsed =
    quota?.riftHourlyKey === hourlyKey
      ? Math.max(0, Math.min(RIFT_MAX_ATTEMPTS_PER_WINDOW, Math.floor(quota.riftHourlyAttemptsUsed ?? 0)))
      : 0;
  const hourlyRemaining = hourlyOpen ? Math.max(0, RIFT_MAX_ATTEMPTS_PER_WINDOW - hourlyUsed) : 0;

  const passActive = riftPassExpiresAt > nowMs;
  const passUsed = passActive
    ? Math.max(0, Math.min(RIFT_MAX_ATTEMPTS_PER_WINDOW, Math.floor(quota?.riftPassAttemptsUsed ?? 0)))
    : 0;
  const passRemaining = passActive ? Math.max(0, RIFT_MAX_ATTEMPTS_PER_WINDOW - passUsed) : 0;

  const hourlyRemSec = Math.max(1, (RIFT_WINDOW_DURATION_MIN - min) * 60 - sec);
  const nextHourSec = Math.max(1, (60 - min) * 60 - sec);
  const passRemSec = passActive ? Math.max(1, Math.ceil((riftPassExpiresAt - nowMs) / 1000)) : 0;

  if (hourlyOpen && hourlyRemaining > 0) {
    return {
      isOpen: true,
      source: 'hourly',
      activeBucket: 'hourly',
      remainingSec: hourlyRemSec,
      nextOpenSec: 0,
      attemptsRemaining: hourlyRemaining,
      maxAttempts: RIFT_MAX_ATTEMPTS_PER_WINDOW,
      bossId,
      anomaly,
    };
  }

  if (passActive && passRemaining > 0) {
    return {
      isOpen: true,
      source: 'pass',
      activeBucket: 'pass',
      remainingSec: passRemSec,
      nextOpenSec: hourlyOpen ? 0 : nextHourSec,
      attemptsRemaining: passRemaining,
      maxAttempts: RIFT_MAX_ATTEMPTS_PER_WINDOW,
      bossId,
      anomaly,
    };
  }

  if (hourlyOpen) {
    return {
      isOpen: true,
      source: 'hourly',
      activeBucket: 'none',
      remainingSec: hourlyRemSec,
      nextOpenSec: 0,
      attemptsRemaining: 0,
      maxAttempts: RIFT_MAX_ATTEMPTS_PER_WINDOW,
      bossId,
      anomaly,
    };
  }

  if (passActive) {
    return {
      isOpen: true,
      source: 'pass',
      activeBucket: 'none',
      remainingSec: passRemSec,
      nextOpenSec: nextHourSec,
      attemptsRemaining: 0,
      maxAttempts: RIFT_MAX_ATTEMPTS_PER_WINDOW,
      bossId,
      anomaly,
    };
  }

  return {
    isOpen: false,
    source: 'closed',
    activeBucket: 'none',
    remainingSec: 0,
    nextOpenSec: nextHourSec,
    attemptsRemaining: 0,
    maxAttempts: RIFT_MAX_ATTEMPTS_PER_WINDOW,
    bossId,
    anomaly,
  };
}

/** Spends 500,000 Gems to force-open a personal 15-minute (3-attempt) Rift session when no attempts remain. */
export function buyRiftPassDomain(
  ctx: Pick<
    RiftDomainContext,
    'gems' | 'riftPassExpiresAt' | 'riftHourlyKey' | 'riftHourlyAttemptsUsed' | 'riftPassAttemptsUsed'
  >,
  nowMs = Date.now(),
  onSave?: () => void
): 'bought' | 'no_gems' | 'already_has_attempts' {
  const snap = getRiftWindowSnapshot(nowMs, ctx.riftPassExpiresAt, ctx);
  if (snap.attemptsRemaining > 0) return 'already_has_attempts';
  if (ctx.gems < RIFT_PASS_GEM_COST) return 'no_gems';
  ctx.gems -= RIFT_PASS_GEM_COST;
  ctx.riftPassExpiresAt = nowMs + RIFT_PASS_DURATION_MS;
  ctx.riftPassAttemptsUsed = 0;
  onSave?.();
  return 'bought';
}

/** Computes total effective Squad DPS (excluding Overclock Fever) for Rift Meteor Storm scaling. */
export function getRiftSquadEffectiveDpsDomain(ctx: Pick<RiftDomainContext, 'getPlotUnitStats'>): number {
  let total = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const st = ctx.getPlotUnitStats(i, Date.now(), false);
    if (st) total += st.dmg;
  }
  return total;
}

/** Starts a 30-second Rift Boss Battle and deducts 1 attempt from the active bucket immediately. */
export function startRiftBattleDomain(
  ctx: RiftDomainContext,
  nowMs = Date.now(),
  onSave?: () => void
): boolean {
  const snap = getRiftWindowSnapshot(nowMs, ctx.riftPassExpiresAt, ctx);
  if (!snap.isOpen || snap.attemptsRemaining <= 0 || snap.activeBucket === 'none') return false;
  const hasDeployed = ctx.plotMiners.some((id) => Boolean(id));
  if (!hasDeployed) return false;

  if (snap.activeBucket === 'hourly') {
    const { hourlyKey } = getHourlyKey(nowMs);
    if (ctx.riftHourlyKey !== hourlyKey) {
      ctx.riftHourlyKey = hourlyKey;
      ctx.riftHourlyAttemptsUsed = 0;
    }
    ctx.riftHourlyAttemptsUsed = Math.min(RIFT_MAX_ATTEMPTS_PER_WINDOW, ctx.riftHourlyAttemptsUsed + 1);
  } else {
    ctx.riftPassAttemptsUsed = Math.min(RIFT_MAX_ATTEMPTS_PER_WINDOW, ctx.riftPassAttemptsUsed + 1);
  }

  ctx.riftLastSummary = null;
  ctx.riftBattle = {
    bossId: snap.bossId,
    anomalyId: snap.anomaly.id,
    source: snap.activeBucket,
    timeRemainingSec: RIFT_BATTLE_DURATION_SEC,
    durationSec: RIFT_BATTLE_DURATION_SEC,
    damageDealt: 0,
    currentTier: 0,
    tapCount: 0,
    meteorTimerSec: 4,
  };
  onSave?.();
  return true;
}

function addBattleDamage(
  battle: RiftBattleState,
  amount: number
): { newTier: number; tierUp: boolean } {
  const prevTier = battle.currentTier;
  battle.damageDealt = Math.max(0, battle.damageDealt + Math.max(0, amount));
  const prog = getRiftTierProgress(battle.damageDealt);
  battle.currentTier = prog.tier;
  return { newTier: prog.tier, tierUp: prog.tier > prevTier };
}

/** Applies a Chibi squad basic or Ult strike against the Rift Boss. */
export function applyRiftSquadStrikeDomain(
  ctx: Pick<RiftDomainContext, 'riftBattle' | 'getPlotUnitStats'>,
  slotIndex: number,
  attackInterval: number,
  isUltimate = false,
  rng: () => number = Math.random
): { dmgDealt: number; isCrit: boolean; newTier: number; tierUp: boolean } {
  const battle = ctx.riftBattle;
  if (!battle) return { dmgDealt: 0, isCrit: false, newTier: 0, tierUp: false };
  const st = ctx.getPlotUnitStats(slotIndex, Date.now(), false);
  if (!st || st.dmg <= 0) {
    return { dmgDealt: 0, isCrit: false, newTier: battle.currentTier, tierUp: false };
  }

  const surgeMult = battle.anomalyId === 'overclock-surge' ? 1.3 : 1;
  const echoMult = isUltimate && battle.anomalyId === 'mirror-echo' ? 1.35 : 1;
  const critBonus = battle.anomalyId === 'hyper-crit' ? 0.25 : 0;
  const critChance = Math.min(0.95, st.critChance + critBonus);
  const isCrit = rng() < critChance;
  const critMult = isCrit ? st.critMult * (battle.anomalyId === 'hyper-crit' ? 1.5 : 1) : 1;

  const dmgDealt = Math.max(
    1,
    Math.round(st.dmg * Math.max(0.05, attackInterval) * surgeMult * echoMult * critMult)
  );
  const { newTier, tierUp } = addBattleDamage(battle, dmgDealt);
  return { dmgDealt, isCrit, newTier, tierUp };
}

/** Applies a player manual tap hit against the Rift Boss. */
export function applyRiftTapDamageDomain(
  ctx: Pick<RiftDomainContext, 'riftBattle'>,
  baseTapDmg: number,
  baseCritChance = 0.15,
  baseCritMult = 2.5,
  rng: () => number = Math.random
): { dmgDealt: number; isCrit: boolean; newTier: number; tierUp: boolean } {
  const battle = ctx.riftBattle;
  if (!battle || baseTapDmg <= 0) {
    return { dmgDealt: 0, isCrit: false, newTier: battle?.currentTier ?? 0, tierUp: false };
  }
  const critBonus = battle.anomalyId === 'hyper-crit' ? 0.25 : 0;
  const critChance = Math.min(0.95, baseCritChance + critBonus);
  const isCrit = rng() < critChance;
  const critMult = isCrit ? baseCritMult * (battle.anomalyId === 'hyper-crit' ? 1.5 : 1) : 1;
  const dmgDealt = Math.max(1, Math.round(baseTapDmg * critMult));
  battle.tapCount += 1;
  const { newTier, tierUp } = addBattleDamage(battle, dmgDealt);
  return { dmgDealt, isCrit, newTier, tierUp };
}

/** Resolves a finished (or retreated) 30s Rift Boss Battle and grants 1 Shard per Tier reached. */
export function finishRiftBattleDomain(
  ctx: RiftDomainContext,
  retreated = false,
  nowMs = Date.now(),
  rng: () => number = Math.random,
  onSave?: () => void
): RiftBattleSummary | null {
  const battle = ctx.riftBattle;
  if (!battle) return null;

  const prog = getRiftTierProgress(battle.damageDealt);
  const tierReached = prog.tier;
  const shardsEarned = prog.shards;

  if (shardsEarned > 0) {
    ctx.riftShards = Math.max(0, Math.floor(ctx.riftShards) + shardsEarned);
    ctx.riftBreachesCompleted = Math.max(0, Math.floor(ctx.riftBreachesCompleted) + 1);
  }

  let droppedChibiId: AnomalyChibiId | null = null;
  if (tierReached > 0 && prog.dropChance > 0 && rng() < prog.dropChance) {
    const pickIdx = Math.min(ANOMALY_CHIBI_DEFS.length - 1, Math.floor(rng() * ANOMALY_CHIBI_DEFS.length));
    const picked = ANOMALY_CHIBI_DEFS[Math.max(0, pickIdx)];
    if (picked) {
      droppedChibiId = picked.chibiId;
      ctx.miners[droppedChibiId] = (ctx.miners[droppedChibiId] || 0) + 1;
      if (ctx.chibiStars) {
        ctx.chibiStars[droppedChibiId] = Math.max(1, ctx.chibiStars[droppedChibiId] || 1);
      }
      ctx.discovered.add(droppedChibiId);
    }
  }

  const isNewBest =
    battle.damageDealt > ctx.riftBestDamage || tierReached > ctx.riftBestTier;
  if (battle.damageDealt > ctx.riftBestDamage) {
    ctx.riftBestDamage = battle.damageDealt;
  }
  if (tierReached > ctx.riftBestTier) {
    ctx.riftBestTier = tierReached;
  }

  const snapAfter = getRiftWindowSnapshot(nowMs, ctx.riftPassExpiresAt, ctx);
  const summary: RiftBattleSummary = {
    bossId: battle.bossId,
    anomalyId: battle.anomalyId,
    damageDealt: battle.damageDealt,
    tierReached,
    shardsEarned,
    droppedChibiId,
    isNewBest,
    attemptsRemaining: snapAfter.attemptsRemaining,
    retreated,
  };

  ctx.riftBattle = null;
  ctx.riftLastSummary = summary;
  onSave?.();
  return summary;
}

/** Advances the 30s Rift battle countdown, processes Meteor Storm bursts, and settles rewards at 0s. */
export function stepRiftBattleTickDomain(
  ctx: RiftDomainContext,
  dtSec: number,
  totalSquadDps: number,
  nowMs = Date.now(),
  rng: () => number = Math.random,
  onSave?: () => void
): { meteorDmg: number; finished: boolean; summary: RiftBattleSummary | null; tierUp: boolean } {
  const battle = ctx.riftBattle;
  if (!battle) return { meteorDmg: 0, finished: false, summary: null, tierUp: false };

  const safeDt = Math.max(0, Math.min(30, Number.isFinite(dtSec) ? dtSec : 0));
  battle.timeRemainingSec = Math.max(0, battle.timeRemainingSec - safeDt);

  let meteorDmg = 0;
  let tierUp = false;
  if (battle.anomalyId === 'meteor-storm') {
    battle.meteorTimerSec -= safeDt;
    while (battle.meteorTimerSec <= 0.0001) {
      battle.meteorTimerSec += 4;
      const burst = Math.max(0, Math.round(totalSquadDps * 4));
      if (burst > 0) {
        meteorDmg += burst;
        const res = addBattleDamage(battle, burst);
        if (res.tierUp) tierUp = true;
      }
    }
  }

  if (battle.timeRemainingSec <= 0) {
    const summary = finishRiftBattleDomain(ctx, false, nowMs, rng, onSave);
    return { meteorDmg, finished: true, summary, tierUp };
  }

  return { meteorDmg, finished: false, summary: null, tierUp };
}

/** Ends an active Rift battle early while still awarding Shards for any Tier already reached. */
export function retreatRiftBattleDomain(
  ctx: RiftDomainContext,
  nowMs = Date.now(),
  rng: () => number = Math.random,
  onSave?: () => void
): RiftBattleSummary | null {
  return finishRiftBattleDomain(ctx, true, nowMs, rng, onSave);
}

/** Legacy helper preserved for backward test compatibility during transition. */
export function claimRiftBreachRewardDomain(
  ctx: Pick<
    RiftDomainContext,
    'riftPassExpiresAt' | 'riftShards' | 'riftBreachesCompleted' | 'miners' | 'chibiStars' | 'discovered'
  >,
  nowMs = Date.now(),
  rng: () => number = Math.random,
  onSave?: () => void
): RiftBreachClaimResult {
  const snap = getRiftWindowSnapshot(nowMs, ctx.riftPassExpiresAt);
  const baseShards = snap.anomaly.id === 'overclock-surge' ? 24 : 18;
  const meteorBonus = snap.anomaly.id === 'meteor-storm' ? 3 : 0;
  const shardsEarned = baseShards + meteorBonus;

  ctx.riftShards = Math.max(0, Math.floor(ctx.riftShards) + shardsEarned);
  ctx.riftBreachesCompleted = Math.max(0, Math.floor(ctx.riftBreachesCompleted) + 1);

  let droppedChibiId: AnomalyChibiId | null = null;
  if (rng() < RIFT_INSTANT_DROP_CHANCE) {
    const pickIdx = Math.min(ANOMALY_CHIBI_DEFS.length - 1, Math.floor(rng() * ANOMALY_CHIBI_DEFS.length));
    const picked = ANOMALY_CHIBI_DEFS[Math.max(0, pickIdx)];
    if (picked) {
      droppedChibiId = picked.chibiId;
      ctx.miners[droppedChibiId] = (ctx.miners[droppedChibiId] || 0) + 1;
      if (ctx.chibiStars) {
        ctx.chibiStars[droppedChibiId] = Math.max(1, ctx.chibiStars[droppedChibiId] || 1);
      }
      ctx.discovered.add(droppedChibiId);
    }
  }

  onSave?.();
  return { shardsEarned, droppedChibiId };
}

/** Redeems per-Chibi Rift Shards for a guaranteed ANOMALY Chibi unlock or star-up duplicate. */
export function redeemAnomalyChibiDomain(
  ctx: Pick<RiftDomainContext, 'riftShards' | 'miners' | 'chibiStars' | 'discovered'>,
  chibiId: string,
  onSave?: () => void
): 'redeemed' | 'no_shards' | 'invalid' {
  const def = getAnomalyChibiById(chibiId);
  if (!def) return 'invalid';
  if (ctx.riftShards < def.shardCost) return 'no_shards';
  ctx.riftShards -= def.shardCost;
  ctx.miners[def.chibiId] = (ctx.miners[def.chibiId] || 0) + 1;
  if (ctx.chibiStars) {
    ctx.chibiStars[def.chibiId] = Math.max(1, ctx.chibiStars[def.chibiId] || 1);
  }
  ctx.discovered.add(def.chibiId);
  onSave?.();
  return 'redeemed';
}
