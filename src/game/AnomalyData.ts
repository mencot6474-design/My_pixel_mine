import { getChibiById } from '../game3d/ChibiCatalog';

export const RIFT_PASS_GEM_COST = 500_000;
export const RIFT_WINDOW_DURATION_MIN = 15;
export const RIFT_PASS_DURATION_MS = 15 * 60 * 1000;
export const RIFT_SHARD_PITY_COST = 250;
export const RIFT_INSTANT_DROP_CHANCE = 0.08;
export const RIFT_BATTLE_DURATION_SEC = 30;
export const RIFT_MAX_ATTEMPTS_PER_WINDOW = 3;

export interface RiftTierDef {
  readonly tier: number;
  readonly worldLabel: string;
  readonly damageTarget: number;
  readonly shards: number;
  readonly dropChance: number;
}

export const RIFT_TIER_DEFS: readonly RiftTierDef[] = [
  { tier: 1, worldLabel: 'W1 Underground', damageTarget: 5_000, shards: 1, dropChance: 0.02 },
  { tier: 2, worldLabel: 'W2 Crystal', damageTarget: 50_000_000, shards: 2, dropChance: 0.025 },
  { tier: 3, worldLabel: 'W3 Magma', damageTarget: 50_000_000_000, shards: 3, dropChance: 0.03 },
  { tier: 4, worldLabel: 'W4 Ruins', damageTarget: 50_000_000_000_000, shards: 4, dropChance: 0.04 },
  { tier: 5, worldLabel: 'W5 Voidreach', damageTarget: 50_000_000_000_000_000, shards: 5, dropChance: 0.05 },
  { tier: 6, worldLabel: 'W6 Starwell', damageTarget: 5e19, shards: 6, dropChance: 0.06 },
  { tier: 7, worldLabel: 'W7 Abyssal', damageTarget: 5e22, shards: 7, dropChance: 0.07 },
  { tier: 8, worldLabel: 'W8 Chrono', damageTarget: 5e25, shards: 8, dropChance: 0.08 },
  { tier: 9, worldLabel: 'W9 Solaris', damageTarget: 5e28, shards: 9, dropChance: 0.1 },
  { tier: 10, worldLabel: 'W10 Elysium', damageTarget: 5e31, shards: 10, dropChance: 0.12 },
] as const;

export interface RiftTierProgress {
  tier: number;
  currentTarget: number;
  nextTarget: number | null;
  progressPct: number;
  shards: number;
  dropChance: number;
}

/** Resolves the reached Rift Tier (0..10), progress toward the next Tier, and projected rewards for cumulative damage. */
export function getRiftTierProgress(damage: number): RiftTierProgress {
  const safeDmg = Number.isFinite(damage) ? Math.max(0, damage) : 0;
  let reachedIdx = -1;
  for (let i = 0; i < RIFT_TIER_DEFS.length; i++) {
    if (safeDmg >= RIFT_TIER_DEFS[i].damageTarget) {
      reachedIdx = i;
    } else {
      break;
    }
  }
  const currentDef = reachedIdx >= 0 ? RIFT_TIER_DEFS[reachedIdx] : null;
  const nextDef = reachedIdx + 1 < RIFT_TIER_DEFS.length ? RIFT_TIER_DEFS[reachedIdx + 1] : null;
  const currentTarget = currentDef ? currentDef.damageTarget : 0;
  const nextTarget = nextDef ? nextDef.damageTarget : null;
  let progressPct = 100;
  if (nextTarget !== null) {
    const span = Math.max(1, nextTarget - currentTarget);
    progressPct = Math.max(0, Math.min(100, ((safeDmg - currentTarget) / span) * 100));
  }
  return {
    tier: currentDef ? currentDef.tier : 0,
    currentTarget,
    nextTarget,
    progressPct,
    shards: currentDef ? currentDef.shards : 0,
    dropChance: currentDef ? currentDef.dropChance : 0,
  };
}

/** Alternates the active Dimensional Rift Boss each hour. */
export function getRiftHourlyBossId(hourIndex: number): AnomalyChibiId {
  const safeIdx = Number.isFinite(hourIndex) ? Math.max(0, Math.floor(hourIndex)) : 0;
  return ANOMALY_CHIBI_DEFS[safeIdx % ANOMALY_CHIBI_DEFS.length].chibiId;
}

export type AnomalyChibiId = 'void-asura' | 'null-singularity';

export interface AnomalyChibiDef {
  chibiId: AnomalyChibiId;
  name: string;
  title: string;
  accentColor: string;
  shardCost: number;
  dpsMult: number;
  upgradeCostMult: number;
  passiveTeamDmgPct: number;
  passiveOreDropPct: number;
  passiveOreSellPct: number;
  passiveLabel: string;
}

export const ANOMALY_CHIBI_DEFS: readonly AnomalyChibiDef[] = [
  {
    chibiId: 'void-asura',
    name: 'Void Asura',
    title: 'Six-Armed Rift Sovereign',
    accentColor: '#ef4444',
    shardCost: 500,
    dpsMult: 4.8,
    upgradeCostMult: 32,
    passiveTeamDmgPct: 1.6,
    passiveOreDropPct: 1.0,
    passiveOreSellPct: 0.4,
    passiveLabel: '+160% Team DMG • +100% Drop Ore • +40% Sell Ore',
  },
  {
    chibiId: 'null-singularity',
    name: 'Null Singularity',
    title: 'Star-Core Dimensional Exile',
    accentColor: '#a855f7',
    shardCost: 250,
    dpsMult: 5.2,
    upgradeCostMult: 35,
    passiveTeamDmgPct: 1.8,
    passiveOreDropPct: 0.6,
    passiveOreSellPct: 1.2,
    passiveLabel: '+180% Team DMG • +60% Drop Ore • +120% Sell Ore',
  },
] as const;

export type RiftAnomalyId = 'hyper-crit' | 'meteor-storm' | 'overclock-surge' | 'mirror-echo';

export interface RiftAnomalyDef {
  id: RiftAnomalyId;
  name: string;
  accentColor: string;
  summary: string;
}

export const RIFT_ANOMALIES: readonly RiftAnomalyDef[] = [
  {
    id: 'hyper-crit',
    name: 'Hyper-Crit Rift',
    accentColor: '#fde047',
    summary: '+25% Crit Chance & 1.5x Crit DMG for Squad & Tap hits.',
  },
  {
    id: 'meteor-storm',
    name: 'Meteor Storm Rift',
    accentColor: '#fb7185',
    summary: 'Void Meteors strike every 4s for 4x Squad DPS burst.',
  },
  {
    id: 'overclock-surge',
    name: 'Overclock Surge Rift',
    accentColor: '#22d3ee',
    summary: '+30% Squad Attack Speed & DMG; Ults trigger every 2 hits.',
  },
  {
    id: 'mirror-echo',
    name: 'Mirror Echo Rift',
    accentColor: '#c084fc',
    summary: 'Chibi Ults trigger a +35% Dimensional Echo Strike.',
  },
] as const;

export function getAnomalyChibiById(chibiId: string): AnomalyChibiDef | undefined {
  return ANOMALY_CHIBI_DEFS.find((c) => c.chibiId === chibiId);
}

export function getAnomalyShardCost(chibiId: string): number {
  return getAnomalyChibiById(chibiId)?.shardCost ?? RIFT_SHARD_PITY_COST;
}

export function isAnomalyChibi(chibiId: string): boolean {
  return Boolean(getAnomalyChibiById(chibiId)) || getChibiById(chibiId)?.rarity === 'anomaly';
}

/** Scales an ANOMALY Chibi base DPS from the anchor World's Secret DPS with 2-sig-fig nice rounding. */
export function computeAnomalyScaledBaseDps(secretBaseDps: number, dpsMult: number): number {
  const raw = secretBaseDps * dpsMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw < 100) return Math.max(1, Math.round(Number(raw.toPrecision(12))));
  const step = Math.pow(10, Math.floor(Math.log10(raw) + 1e-12) - 1);
  return Number((Math.round(Number((raw / step).toPrecision(12))) * step).toPrecision(2));
}

/** Scales an ANOMALY Chibi plot upgrade cost multiplier from the anchor World's upgrade cost scale. */
export function computeAnomalyUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number {
  const raw = worldCostScale * upgradeCostMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.round(Number(raw.toPrecision(12)));
}

export interface ActiveAnomalyPassives {
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
}

export const ANOMALY_PASSIVE_BONUS_PER_STAR = 0.2;

/** Passive multiplier for ANOMALY units (1★ = 1.0, +20% per star above 1★). */
export function getAnomalyPassiveStarScale(stars: number): number {
  const clamped = Math.max(1, Math.min(5, Math.floor(stars || 1)));
  return 1 + (clamped - 1) * ANOMALY_PASSIVE_BONUS_PER_STAR;
}

/** Sums unique passive bonuses from deployed ANOMALY units on plot pedestals. */
export function getActiveAnomalyPassiveBonuses(
  plotMiners: readonly (string | null)[],
  chibiStars: Readonly<Record<string, number>> = {}
): ActiveAnomalyPassives {
  const seen = new Set<string>();
  const totals: ActiveAnomalyPassives = {
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0,
  };
  for (const id of plotMiners) {
    if (!id || seen.has(id)) continue;
    const def = getAnomalyChibiById(id);
    if (!def) continue;
    seen.add(id);
    const starScale = getAnomalyPassiveStarScale(chibiStars[id] ?? 1);
    totals.teamDmgPct += def.passiveTeamDmgPct * starScale;
    totals.oreDropPct += def.passiveOreDropPct * starScale;
    totals.oreSellPct += def.passiveOreSellPct * starScale;
  }
  return totals;
}
