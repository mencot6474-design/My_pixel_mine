import { getChibiById } from '../game3d/ChibiCatalog';

export type OmegaBossId = 'crimson-ronin' | 'obsidian-sovereign' | 'abyssal-leviathan';

export interface OmegaTierDef {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  bossHp: number;
  coreDropChance: number;
  minCores: number;
  maxCores: number;
  firstClearGems: number;
  firstClearDice: number;
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
export const OMEGA_ENTRANCE_DURATION_SEC = 1.85;
export const OMEGA_INVUL_DURATION_SEC = 30;
export const OMEGA_INVUL_TAPS_REQUIRED = 12;
export const OMEGA_BATTLE_DURATION_SEC = 45;
export const OMEGA_BREAK_DURATION_SEC = 7;
export const OMEGA_BREAK_DMG_MULT = 2.5;

const SHARED_TIER_DROPS: readonly Omit<OmegaTierDef, 'bossHp'>[] = [
  {
    tier: 1,
    label: 'Tier I • Initiate',
    coreDropChance: 0.1,
    minCores: 1,
    maxCores: 1,
    firstClearGems: 400,
    firstClearDice: 1,
    repeatGems: 60,
  },
  {
    tier: 2,
    label: 'Tier II • Challenger',
    coreDropChance: 0.2,
    minCores: 1,
    maxCores: 1,
    firstClearGems: 900,
    firstClearDice: 1,
    repeatGems: 120,
  },
  {
    tier: 3,
    label: 'Tier III • Master',
    coreDropChance: 0.325,
    minCores: 1,
    maxCores: 2,
    firstClearGems: 1800,
    firstClearDice: 2,
    repeatGems: 220,
  },
  {
    tier: 4,
    label: 'Tier IV • Nightmare',
    coreDropChance: 0.425,
    minCores: 2,
    maxCores: 2,
    firstClearGems: 3500,
    firstClearDice: 3,
    repeatGems: 380,
  },
  {
    tier: 5,
    label: 'Tier V • Omega Apex',
    coreDropChance: 0.5,
    minCores: 2,
    maxCores: 3,
    firstClearGems: 7500,
    firstClearDice: 5,
    repeatGems: 650,
  },
];

function buildTiers(hpList: readonly [number, number, number, number, number]): readonly OmegaTierDef[] {
  return SHARED_TIER_DROPS.map((base, idx) => ({
    ...base,
    bossHp: hpList[idx],
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
    mechanicTitle: 'Iaijutsu Parry & Phantom Blades',
    mechanicSummary:
      'Tap golden Parry Rings to counter-slash for 8% Max HP +25% Stagger, and shatter Phantom Blades to trigger OMEGA BREAK!',
    coreName: 'Ronin Core',
    accentColor: '#ef4444',
    secondaryColor: '#22d3ee',
    rarity: 'omega',
    unlockCoreCost: 25,
    awakenCoreCosts: [10, 15, 22, 30],
    dpsMult: 5.5,
    upgradeCostMult: 32,
    passiveSummary: '+200% Team DMG • +120% Drop Ore • +80% Sell Ore',
    teamDmgPct: 2.0,
    oreDropPct: 1.2,
    oreSellPct: 0.8,
    tiers: buildTiers([
      20_000_000_000_000_000_000_000_000,
      200_000_000_000_000_000_000_000_000,
      2_000_000_000_000_000_000_000_000_000,
      20_000_000_000_000_000_000_000_000_000,
      200_000_000_000_000_000_000_000_000_000,
    ]),
  },
  {
    id: 'obsidian-sovereign',
    chibiId: 'obsidian-sovereign',
    stationId: 'omega-right',
    padSide: 'right',
    name: 'Obsidian Sovereign',
    bossTitle: 'Abyssal Greatsword Tyrant',
    mechanicTitle: 'Obsidian Pillars & Rune Seals',
    mechanicSummary:
      'Shatter Obsidian Pillars (-60% Boss Armor) and detonate Rune Seals to build Stagger and unleash 2.5× OMEGA BREAK!',
    coreName: 'Sovereign Core',
    accentColor: '#e2e8f0',
    secondaryColor: '#e879f9',
    rarity: 'omega',
    unlockCoreCost: 35,
    awakenCoreCosts: [14, 20, 30, 40],
    dpsMult: 6.5,
    upgradeCostMult: 40,
    passiveSummary: '+220% Team DMG • +90% Drop Ore • +140% Sell Ore',
    teamDmgPct: 2.2,
    oreDropPct: 0.9,
    oreSellPct: 1.4,
    tiers: buildTiers([
      30_000_000_000_000_000_000_000_000,
      300_000_000_000_000_000_000_000_000,
      3_000_000_000_000_000_000_000_000_000,
      30_000_000_000_000_000_000_000_000_000,
      300_000_000_000_000_000_000_000_000_000,
    ]),
  },
  {
    id: 'abyssal-leviathan',
    chibiId: 'abyssal-leviathan',
    padSide: 'center',
    name: 'Abyssal Leviathan',
    bossTitle: 'Tidal Maelstrom Sovereign',
    mechanicTitle: 'Tidal Pillars & Abyssal Seals',
    mechanicSummary:
      'Shatter Tidal Pillars (-60% Boss Armor) and detonate Maelstrom Seals to build Stagger and unleash 2.5× OMEGA BREAK!',
    coreName: 'Leviathan Core',
    accentColor: '#06b6d4',
    secondaryColor: '#67e8f9',
    rarity: 'omega',
    unlockCoreCost: 45,
    awakenCoreCosts: [18, 26, 38, 52],
    dpsMult: 7.5,
    upgradeCostMult: 48,
    passiveSummary: '+240% Team DMG • +140% Drop Ore • +160% Sell Ore',
    teamDmgPct: 2.4,
    oreDropPct: 1.4,
    oreSellPct: 1.6,
    tiers: buildTiers([
      45_000_000_000_000_000_000_000_000,
      450_000_000_000_000_000_000_000_000,
      4_500_000_000_000_000_000_000_000_000,
      45_000_000_000_000_000_000_000_000_000,
      450_000_000_000_000_000_000_000_000_000,
    ]),
  },
] as const;

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
