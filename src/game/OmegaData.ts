import { getChibiById } from '../game3d/ChibiCatalog';

export type OmegaBossId = 'crimson-ronin' | 'obsidian-sovereign' | 'abyssal-leviathan';

export interface OmegaTierDef {
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly label: string;
  readonly worldLabel: string;
  readonly damageTarget: number;
  readonly cores: number;
  readonly firstClearGems: number;
  readonly firstClearDice: number;
  readonly repeatGems: number;
}

export interface OmegaTierProgress {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  currentTarget: number;
  nextTarget: number | null;
  progressPct: number;
  cores: number;
  repeatGems: number;
}

export interface OmegaBossDef {
  id: OmegaBossId;
  chibiId: OmegaBossId;
  stationId?: 'omega-left' | 'omega-right';
  padSide?: 'left' | 'right' | 'center';
  name: string;
  bossTitle: string;
  mechanicTitle: string;
  mechanicSummary: string;
  coreName: string;
  accentColor: string;
  secondaryColor: string;
  rarity: 'omega';
  targetMult: number;
  coreMult: number;
  unlockCoreCost: number;
  awakenCoreCosts: readonly [number, number, number, number];
  dpsMult: number;
  upgradeCostMult: number;
  passiveSummary: string;
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
  tiers: readonly OmegaTierDef[];
}

export const OMEGA_MAX_KEYS = 5;
export const OMEGA_KEY_REGEN_MS = 60 * 60 * 1000; // 1 hour per key
export const OMEGA_KEY_GEM_COST = 50_000;
export const OMEGA_BATTLE_DURATION_SEC = 30;

interface OmegaTierBaseDef {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  worldLabel: string;
  baseTarget: number;
  baseCores: number;
  firstClearGems: number;
  firstClearDice: number;
  repeatGems: number;
}

const BASE_TIER_DEFS: readonly OmegaTierBaseDef[] = [
  {
    tier: 1,
    label: 'Tier I • W6 Starwell',
    worldLabel: 'W6 Starwell',
    baseTarget: 5e19,
    baseCores: 1,
    firstClearGems: 400,
    firstClearDice: 1,
    repeatGems: 60,
  },
  {
    tier: 2,
    label: 'Tier II • W7 Abyssal',
    worldLabel: 'W7 Abyssal',
    baseTarget: 5e22,
    baseCores: 2,
    firstClearGems: 900,
    firstClearDice: 1,
    repeatGems: 120,
  },
  {
    tier: 3,
    label: 'Tier III • W8 Chrono',
    worldLabel: 'W8 Chrono',
    baseTarget: 5e25,
    baseCores: 3,
    firstClearGems: 1800,
    firstClearDice: 2,
    repeatGems: 220,
  },
  {
    tier: 4,
    label: 'Tier IV • W9 Solaris',
    worldLabel: 'W9 Solaris',
    baseTarget: 5e28,
    baseCores: 4,
    firstClearGems: 3500,
    firstClearDice: 3,
    repeatGems: 380,
  },
  {
    tier: 5,
    label: 'Tier V • W10 Elysium',
    worldLabel: 'W10 Elysium',
    baseTarget: 5e31,
    baseCores: 5,
    firstClearGems: 7500,
    firstClearDice: 5,
    repeatGems: 650,
  },
] as const;

function buildScaledTiers(targetMult: number, coreMult: number): readonly OmegaTierDef[] {
  return BASE_TIER_DEFS.map((base) => ({
    tier: base.tier,
    label: base.label,
    worldLabel: base.worldLabel,
    damageTarget: Number((base.baseTarget * targetMult).toPrecision(6)),
    cores: base.baseCores * coreMult,
    firstClearGems: base.firstClearGems,
    firstClearDice: base.firstClearDice,
    repeatGems: base.repeatGems,
  }));
}

export const OMEGA_BOSS_DEFS: readonly OmegaBossDef[] = [
  {
    id: 'crimson-ronin',
    chibiId: 'crimson-ronin',
    stationId: 'omega-left',
    padSide: 'left',
    name: 'Crimson Ronin',
    bossTitle: 'Cyber-Phantom Blademaster',
    mechanicTitle: '30s Sanctum DPS Check • 1× Target • 1× Cores',
    mechanicSummary:
      'Deal as much damage as possible in 30s! Base World 6–10 damage targets; drops 1–5 shared Omega Cores.',
    coreName: 'Omega Core',
    accentColor: '#ef4444',
    secondaryColor: '#22d3ee',
    rarity: 'omega',
    targetMult: 1,
    coreMult: 1,
    unlockCoreCost: 100,
    awakenCoreCosts: [40, 60, 90, 120],
    dpsMult: 5.5,
    upgradeCostMult: 32,
    passiveSummary: '+200% Team DMG • +120% Drop Ore • +80% Sell Ore',
    teamDmgPct: 2.0,
    oreDropPct: 1.2,
    oreSellPct: 0.8,
    tiers: buildScaledTiers(1, 1),
  },
  {
    id: 'obsidian-sovereign',
    chibiId: 'obsidian-sovereign',
    stationId: 'omega-right',
    padSide: 'right',
    name: 'Obsidian Sovereign',
    bossTitle: 'Abyssal Greatsword Tyrant',
    mechanicTitle: '30s Sanctum DPS Check • 10× Target • 2× Cores',
    mechanicSummary:
      '10× tougher Tier 1–5 damage targets for double rewards — drops 2–10 shared Omega Cores per 30s run!',
    coreName: 'Omega Core',
    accentColor: '#e2e8f0',
    secondaryColor: '#e879f9',
    rarity: 'omega',
    targetMult: 10,
    coreMult: 2,
    unlockCoreCost: 250,
    awakenCoreCosts: [100, 150, 220, 300],
    dpsMult: 6.5,
    upgradeCostMult: 40,
    passiveSummary: '+220% Team DMG • +90% Drop Ore • +140% Sell Ore',
    teamDmgPct: 2.2,
    oreDropPct: 0.9,
    oreSellPct: 1.4,
    tiers: buildScaledTiers(10, 2),
  },
  {
    id: 'abyssal-leviathan',
    chibiId: 'abyssal-leviathan',
    padSide: 'center',
    name: 'Abyssal Leviathan',
    bossTitle: 'Tidal Maelstrom Sovereign',
    mechanicTitle: '30s Sanctum DPS Check • 20× Target • 3× Cores',
    mechanicSummary:
      'Apex 20× Tier 1–5 damage targets with triple payout — drops 3–15 shared Omega Cores per 30s run!',
    coreName: 'Omega Core',
    accentColor: '#06b6d4',
    secondaryColor: '#67e8f9',
    rarity: 'omega',
    targetMult: 20,
    coreMult: 3,
    unlockCoreCost: 500,
    awakenCoreCosts: [200, 300, 440, 600],
    dpsMult: 7.5,
    upgradeCostMult: 48,
    passiveSummary: '+240% Team DMG • +140% Drop Ore • +160% Sell Ore',
    teamDmgPct: 2.4,
    oreDropPct: 1.4,
    oreSellPct: 1.6,
    tiers: buildScaledTiers(20, 3),
  },
] as const;

/** Resolves the reached Omega Tier (0..5), progress toward the next Tier, and projected rewards for cumulative damage. */
export function getOmegaTierProgress(bossId: OmegaBossId, damage: number): OmegaTierProgress {
  const boss = getOmegaBossById(bossId) ?? OMEGA_BOSS_DEFS[0];
  const safeDmg = Number.isFinite(damage) ? Math.max(0, damage) : 0;
  let reachedIdx = -1;
  for (let i = 0; i < boss.tiers.length; i++) {
    if (safeDmg >= boss.tiers[i].damageTarget) {
      reachedIdx = i;
    } else {
      break;
    }
  }
  const currentDef = reachedIdx >= 0 ? boss.tiers[reachedIdx] : null;
  const nextDef = reachedIdx + 1 < boss.tiers.length ? boss.tiers[reachedIdx + 1] : null;
  const currentTarget = currentDef ? currentDef.damageTarget : 0;
  const nextTarget = nextDef ? nextDef.damageTarget : null;
  let progressPct = 100;
  if (nextTarget !== null) {
    const span = Math.max(1, nextTarget - currentTarget);
    progressPct = Math.max(0, Math.min(100, ((safeDmg - currentTarget) / span) * 100));
  }
  return {
    tier: (currentDef ? currentDef.tier : 0) as 0 | 1 | 2 | 3 | 4 | 5,
    currentTarget,
    nextTarget,
    progressPct,
    cores: currentDef ? currentDef.cores : 0,
    repeatGems: currentDef ? currentDef.repeatGems : 0,
  };
}

/** Scales an OMEGA Chibi base DPS from the latest World's Secret DPS with 2-sig-fig nice rounding. */
export function computeOmegaScaledBaseDps(secretBaseDps: number, dpsMult: number): number {
  const raw = secretBaseDps * dpsMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw < 100) return Math.max(1, Math.round(Number(raw.toPrecision(12))));
  const step = Math.pow(10, Math.floor(Math.log10(raw) + 1e-12) - 1);
  return Number((Math.round(Number((raw / step).toPrecision(12))) * step).toPrecision(2));
}

/** Scales an OMEGA Chibi plot upgrade cost multiplier from the latest World's upgrade cost scale. */
export function computeOmegaUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number {
  const raw = worldCostScale * upgradeCostMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.round(Number(raw.toPrecision(12)));
}

export function getOmegaBossById(id: string): OmegaBossDef | undefined {
  return OMEGA_BOSS_DEFS.find((b) => b.id === id);
}

export function getOmegaBossByStationId(stationId: string): OmegaBossDef | undefined {
  return OMEGA_BOSS_DEFS.find((b) => b.stationId === stationId);
}

export function getOmegaBossByChibiId(chibiId: string): OmegaBossDef | undefined {
  return OMEGA_BOSS_DEFS.find((b) => b.chibiId === chibiId);
}

export function isOmegaBossChibi(chibiId: string): boolean {
  return Boolean(getOmegaBossByChibiId(chibiId)) || getChibiById(chibiId)?.rarity === 'omega';
}

export function getOmegaTierDef(bossId: OmegaBossId, tier: number): OmegaTierDef {
  const def = getOmegaBossById(bossId) ?? OMEGA_BOSS_DEFS[0];
  const clamped = Math.max(1, Math.min(def.tiers.length, Math.floor(tier)));
  return def.tiers[clamped - 1];
}

export interface ActiveOmegaPassives {
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
}

export const OMEGA_PASSIVE_BONUS_PER_STAR = 0.2;

/** Passive multiplier for OMEGA units (unlocks at 1★; +20% per awakened star above 1★). */
export function getOmegaPassiveStarScale(stars: number): number {
  const clamped = Math.max(1, Math.min(5, Math.floor(stars || 1)));
  return 1 + (clamped - 1) * OMEGA_PASSIVE_BONUS_PER_STAR;
}

/** Sums unique all-3 dopamine passive bonuses from deployed OMEGA units (scaled +20%/star above 1★). */
export function getActiveOmegaPassiveBonuses(
  plotMiners: readonly (string | null)[],
  chibiStars: Readonly<Record<string, number>> = {}
): ActiveOmegaPassives {
  const seen = new Set<string>();
  const totals: ActiveOmegaPassives = {
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0,
  };
  for (const id of plotMiners) {
    if (!id || seen.has(id)) continue;
    const def = getOmegaBossByChibiId(id);
    if (!def) continue;
    seen.add(id);
    const starScale = getOmegaPassiveStarScale(chibiStars[id] ?? 1);
    totals.teamDmgPct += def.teamDmgPct * starScale;
    totals.oreDropPct += def.oreDropPct * starScale;
    totals.oreSellPct += def.oreSellPct * starScale;
  }
  return totals;
}
