import type { ItemRarity } from './GameData.ts';

export const MAX_EQUIPPED_RELICS = 3;

export type RelicCategory = 'world' | 'weather' | 'tower';

export type RelicEffectStat =
  | 'tapDmgPct'
  | 'minerDmgPct'
  | 'miningSpeedPct'
  | 'oreValuePct'
  | 'oreDropPct'
  | 'oreLuckPct'
  | 'mutationLuckPct'
  | 'chestCapacityFlat'
  | 'gemGainPct'
  | 'towerDmgPct'
  | 'weatherBuffPct'
  | 'meteorDropPct';

export interface RelicRecipeIngredient {
  oreId: string;
  amount: number;
}

export interface RelicDef {
  id: string;
  name: string;
  category: RelicCategory;
  rarity: ItemRarity;
  iconPath: string;
  tagline: string;
  effects: Partial<Record<RelicEffectStat, number>>;
  ingredients: readonly RelicRecipeIngredient[];
  gemCost: number;
}

export const RELICS: readonly RelicDef[] = [
  // === 6 WORLD RELICS (W1-W6) ===
  {
    id: 'miner_lantern',
    name: "Miner's Iron Lantern",
    category: 'world',
    rarity: 'rare',
    iconPath: '/relics/miner_lantern.webp',
    tagline: 'W1 Underground — Illuminates rich seams and empowers manual strikes.',
    effects: {
      tapDmgPct: 0.35,
      oreDropPct: 0.15,
    },
    ingredients: [
      { oreId: 'coalite', amount: 120 },
      { oreId: 'copperine', amount: 45 },
      { oreId: 'ironshard', amount: 8 },
    ],
    gemCost: 5000,
  },
  {
    id: 'prism_heart',
    name: 'Crystal Prism Heart',
    category: 'world',
    rarity: 'rare',
    iconPath: '/relics/prism_heart.webp',
    tagline: 'W2 Crystal Caves — Refracts ore light into higher mutations and value.',
    effects: {
      mutationLuckPct: 0.3,
      oreValuePct: 0.25,
    },
    ingredients: [
      { oreId: 'glowquartz', amount: 100 },
      { oreId: 'prismite', amount: 30 },
      { oreId: 'coalite', amount: 120 },
    ],
    gemCost: 12500,
  },
  {
    id: 'ember_gauntlet',
    name: 'Molten Core Gauntlet',
    category: 'world',
    rarity: 'epic',
    iconPath: '/relics/ember_gauntlet.webp',
    tagline: 'W3 Magma Hollows — Infuses every chibi swing with volcanic force.',
    effects: {
      minerDmgPct: 0.35,
      tapDmgPct: 0.2,
    },
    ingredients: [
      { oreId: 'emberstone', amount: 90 },
      { oreId: 'magmite', amount: 25 },
      { oreId: 'frostquartz', amount: 15 },
    ],
    gemCost: 25000,
  },
  {
    id: 'chrono_compass',
    name: 'Ancient Ruins Compass',
    category: 'world',
    rarity: 'epic',
    iconPath: '/relics/chrono_compass.webp',
    tagline: 'W4 Ancient Ruins — Accelerates chibi cadence and expands vault storage.',
    effects: {
      miningSpeedPct: 0.25,
      chestCapacityFlat: 3000,
    },
    ingredients: [
      { oreId: 'runestone', amount: 80 },
      { oreId: 'relicore', amount: 20 },
      { oreId: 'scorchgold', amount: 10 },
    ],
    gemCost: 50000,
  },
  {
    id: 'astral_orrery',
    name: 'Astral Nebula Orb',
    category: 'world',
    rarity: 'legendary',
    iconPath: '/relics/astral_orrery.webp',
    tagline: 'W5 Voidreach — Aligns cosmic orbits for massive DPS and rare ore luck.',
    effects: {
      minerDmgPct: 0.45,
      oreLuckPct: 0.35,
    },
    ingredients: [
      { oreId: 'voidshard', amount: 75 },
      { oreId: 'starcore', amount: 18 },
      { oreId: 'gildium', amount: 12 },
    ],
    gemCost: 90000,
  },
  {
    id: 'starwell_crown',
    name: 'Starwell Singularity Crown',
    category: 'world',
    rarity: 'mythic',
    iconPath: '/relics/starwell_crown.webp',
    tagline: 'W6 Starwell — Sovereign relic amplifying ore worth, drop output, and squad DPS.',
    effects: {
      oreValuePct: 0.5,
      minerDmgPct: 0.4,
      oreDropPct: 0.25,
    },
    ingredients: [
      { oreId: 'cloudgrit', amount: 70 },
      { oreId: 'aurorine', amount: 12 },
      { oreId: 'zenithite', amount: 2 },
    ],
    gemCost: 300000,
  },

  // === 3 WEATHER & MUTATION RELICS ===
  {
    id: 'storm_bell',
    name: 'Tempest Weather Bell',
    category: 'weather',
    rarity: 'epic',
    iconPath: '/relics/storm_bell.webp',
    tagline: 'Resonates with falling meteors to multiply meteor ore and gem hauls.',
    effects: {
      meteorDropPct: 0.5,
      oreDropPct: 0.2,
    },
    ingredients: [
      { oreId: 'stormwater-opal', amount: 3 },
      { oreId: 'copperine', amount: 60 },
      { oreId: 'azurine', amount: 25 },
    ],
    gemCost: 18000,
  },
  {
    id: 'frostmoon_chalice',
    name: 'Frostmoon Chalice',
    category: 'weather',
    rarity: 'legendary',
    iconPath: '/relics/frostmoon_chalice.webp',
    tagline: 'Distills glacial and eclipse essence to surge Frozen+ mutation odds.',
    effects: {
      mutationLuckPct: 0.75,
      oreLuckPct: 0.25,
    },
    ingredients: [
      { oreId: 'permafrost-core', amount: 3 },
      { oreId: 'crimson-eclipse-shard', amount: 2 },
      { oreId: 'frostquartz', amount: 20 },
    ],
    gemCost: 65000,
  },
  {
    id: 'celestial_hourglass',
    name: 'Celestial Starlight Hourglass',
    category: 'weather',
    rarity: 'secret',
    iconPath: '/relics/celestial_hourglass.webp',
    tagline: 'Bends atmospheric time to amplify all active Weather bonuses and ore luck.',
    effects: {
      weatherBuffPct: 0.35,
      oreLuckPct: 0.4,
    },
    ingredients: [
      { oreId: 'abyssal-singularity-ore', amount: 2 },
      { oreId: 'astral-nova-fragment', amount: 1 },
      { oreId: 'singularite', amount: 5 },
    ],
    gemCost: 220000,
  },

  // === 3 ENDGAME & TOWER RELICS ===
  {
    id: 'overlord_sigil',
    name: 'Cyber Overlord Sigil',
    category: 'tower',
    rarity: 'legendary',
    iconPath: '/relics/overlord_sigil.webp',
    tagline: 'Pierces mainframe shields inside the Gem Tower for crushing wave & boss damage.',
    effects: {
      towerDmgPct: 0.6,
      tapDmgPct: 0.25,
    },
    ingredients: [
      { oreId: 'pyroclast', amount: 20 },
      { oreId: 'oathstone', amount: 15 },
      { oreId: 'cosmite', amount: 8 },
    ],
    gemCost: 120000,
  },
  {
    id: 'gem_magnet',
    name: 'Arcane Gem Lodestone',
    category: 'tower',
    rarity: 'epic',
    iconPath: '/relics/gem_magnet.webp',
    tagline: 'Draws extra gems from ore breaks, meteors, and Tower clears.',
    effects: {
      gemGainPct: 0.45,
      chestCapacityFlat: 2000,
    },
    ingredients: [
      { oreId: 'silverdrop', amount: 35 },
      { oreId: 'glimmerite', amount: 20 },
      { oreId: 'sunvein', amount: 12 },
    ],
    gemCost: 40000,
  },
  {
    id: 'commander_banner',
    name: 'Chibi Warlord Crest',
    category: 'tower',
    rarity: 'mythic',
    iconPath: '/relics/commander_banner.webp',
    tagline: 'Rallies every deployed chibi with massive squad damage and swing tempo.',
    effects: {
      minerDmgPct: 0.55,
      miningSpeedPct: 0.2,
    },
    ingredients: [
      { oreId: 'bullionite', amount: 10 },
      { oreId: 'celestium', amount: 8 },
      { oreId: 'immortite', amount: 5 },
    ],
    gemCost: 180000,
  },
] as const;

export function getRelicById(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

const EFFECT_LABELS: Record<RelicEffectStat, (val: number) => string> = {
  tapDmgPct: (v) => `+${Math.round(v * 100)}% Tap DMG`,
  minerDmgPct: (v) => `+${Math.round(v * 100)}% Chibi DPS`,
  miningSpeedPct: (v) => `+${Math.round(v * 100)}% Mining Speed`,
  oreValuePct: (v) => `+${Math.round(v * 100)}% Ore Value`,
  oreDropPct: (v) => `+${Math.round(v * 100)}% Ore Drop`,
  oreLuckPct: (v) => `+${Math.round(v * 100)}% Ore Luck`,
  mutationLuckPct: (v) => `+${Math.round(v * 100)}% Mutation Luck`,
  chestCapacityFlat: (v) => `+${v.toLocaleString('en-US')} Chest Cap`,
  gemGainPct: (v) => `+${Math.round(v * 100)}% Gem Gain`,
  towerDmgPct: (v) => `+${Math.round(v * 100)}% Tower DMG`,
  weatherBuffPct: (v) => `+${Math.round(v * 100)}% Weather Buffs`,
  meteorDropPct: (v) => `+${Math.round(v * 100)}% Meteor Drops`,
};

export function formatRelicEffects(def: RelicDef): string[] {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(def.effects) as Array<[RelicEffectStat, number | undefined]>) {
    if (val === undefined || val === 0) continue;
    lines.push(EFFECT_LABELS[key](val));
  }
  return lines;
}
