import { getChibiById } from '../game3d/ChibiCatalog';

export const RIFT_PASS_GEM_COST = 500_000;
export const RIFT_WINDOW_DURATION_MIN = 15;
export const RIFT_PASS_DURATION_MS = 15 * 60 * 1000;
export const RIFT_SHARD_PITY_COST = 100;
export const RIFT_INSTANT_DROP_CHANCE = 0.08;

export type AnomalyChibiId = 'void-asura' | 'null-singularity';

export interface AnomalyChibiDef {
  chibiId: AnomalyChibiId;
  name: string;
  title: string;
  accentColor: string;
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
    summary: 'Golden Crit crystals charge +30% Core (2x speed).',
  },
  {
    id: 'meteor-storm',
    name: 'Meteor Storm Rift',
    accentColor: '#fb7185',
    summary: 'Rift Meteors rain down frequently (+25% Core & bonus shards).',
  },
  {
    id: 'overclock-surge',
    name: 'Overclock Surge Rift',
    accentColor: '#22d3ee',
    summary: '+30% Rift Shards per Breach with faster spawns & extra Mimics.',
  },
  {
    id: 'mirror-echo',
    name: 'Mirror Echo Rift',
    accentColor: '#c084fc',
    summary: 'Shattering a True Crystal echoes to 1 adjacent crystal.',
  },
] as const;

export function getAnomalyChibiById(chibiId: string): AnomalyChibiDef | undefined {
  return ANOMALY_CHIBI_DEFS.find((c) => c.chibiId === chibiId);
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
