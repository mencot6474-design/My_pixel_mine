import { getChibiById } from '../game3d/ChibiCatalog';

export type OmegaBossId = 'crimson-ronin' | 'obsidian-sovereign';

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
  stationId: 'omega-left' | 'omega-right';
  padSide: 'left' | 'right';
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
export const OMEGA_KEY_REGEN_MS = 15 * 60 * 1000;
export const OMEGA_KEY_GEM_COST = 25_000;
export const OMEGA_BATTLE_DURATION_SEC = 45;
export const OMEGA_BREAK_DURATION_SEC = 7;
export const OMEGA_BREAK_DMG_MULT = 2.5;

const SHARED_TIER_DROPS: readonly Omit<OmegaTierDef, 'bossHp'>[] = [
  {
    tier: 1,
    label: 'Tier I • Initiate',
    coreDropChance: 0.2,
    minCores: 1,
    maxCores: 1,
    firstClearGems: 400,
    firstClearDice: 1,
    repeatGems: 60,
  },
  {
    tier: 2,
    label: 'Tier II • Challenger',
    coreDropChance: 0.4,
    minCores: 1,
    maxCores: 1,
    firstClearGems: 900,
    firstClearDice: 1,
    repeatGems: 120,
  },
  {
    tier: 3,
    label: 'Tier III • Master',
    coreDropChance: 0.65,
    minCores: 1,
    maxCores: 2,
    firstClearGems: 1800,
    firstClearDice: 2,
    repeatGems: 220,
  },
  {
    tier: 4,
    label: 'Tier IV • Nightmare',
    coreDropChance: 0.85,
    minCores: 2,
    maxCores: 2,
    firstClearGems: 3500,
    firstClearDice: 3,
    repeatGems: 380,
  },
  {
    tier: 5,
    label: 'Tier V • Omega Apex',
    coreDropChance: 1.0,
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
    unlockCoreCost: 5,
    awakenCoreCosts: [3, 5, 8, 12],
    dpsMult: 5.5,
    upgradeCostMult: 32,
    passiveSummary: '+200% Team DMG • +120% Drop Ore • +80% Sell Ore',
    teamDmgPct: 2.0,
    oreDropPct: 1.2,
    oreSellPct: 0.8,
    tiers: buildTiers([
      20_000_000_000_000_000,
      240_000_000_000_000_000,
      1_700_000_000_000_000_000,
      10_000_000_000_000_000_000,
      60_000_000_000_000_000_000,
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
    unlockCoreCost: 5,
    awakenCoreCosts: [3, 5, 8, 12],
    dpsMult: 6.5,
    upgradeCostMult: 40,
    passiveSummary: '+220% Team DMG • +90% Drop Ore • +140% Sell Ore',
    teamDmgPct: 2.2,
    oreDropPct: 0.9,
    oreSellPct: 1.4,
    tiers: buildTiers([
      30_000_000_000_000_000,
      360_000_000_000_000_000,
      2_400_000_000_000_000_000,
      14_000_000_000_000_000_000,
      80_000_000_000_000_000_000,
    ]),
  },
] as const;

/** Scales an OMEGA Chibi base DPS from the latest World's Secret DPS with 2-sig-fig nice rounding. */
export function computeOmegaScaledBaseDps(secretBaseDps: number, dpsMult: number): number {
  const raw = secretBaseDps * dpsMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw < 100) return Math.max(1, Math.round(Number(raw.toPrecision(12))));
  const step = Math.pow(10, Math.floor(Math.log10(raw) + 1e-12) - 1);
  return Math.round(Number((raw / step).toPrecision(12))) * step;
}

/** Scales an OMEGA Chibi plot upgrade cost multiplier from the latest World's upgrade cost scale. */
export function computeOmegaUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number {
  const raw = worldCostScale * upgradeCostMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.round(raw);
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

/** Sums unique all-3 dopamine passive bonuses from deployed OMEGA units (scaled +15%/star above 1★). */
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
    const stars = Math.max(1, Math.min(5, Math.floor(chibiStars[id] ?? 1)));
    const starScale = 1 + (stars - 1) * 0.15;
    totals.teamDmgPct += def.teamDmgPct * starScale;
    totals.oreDropPct += def.oreDropPct * starScale;
    totals.oreSellPct += def.oreSellPct * starScale;
  }
  return totals;
}
