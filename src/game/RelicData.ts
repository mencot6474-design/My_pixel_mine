import type { ItemRarity } from './GameData.ts';

export const MAX_EQUIPPED_RELICS = 3;

export type RelicCategory = 'world' | 'weather' | 'tower';

export type RelicEffectStat = 'minerDmgPct' | 'oreValuePct' | 'oreDropPct';

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
  // === 8 WORLD RELICS (W1-W8) ===
  {
    id: 'miner_lantern',
    name: "Miner's Iron Lantern",
    category: 'world',
    rarity: 'rare',
    iconPath: '/relics/miner_lantern.webp',
    tagline: 'W1 Underground — Illuminates rich seams to boost ore drops and sell value.',
    effects: {
      oreValuePct: 0.2,
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
    tagline: 'W2 Crystal Caves — Refracts ore light into higher team power and sell value.',
    effects: {
      oreValuePct: 0.3,
      minerDmgPct: 0.2,
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
    tagline: 'W3 Magma Hollows — Infuses every chibi swing with volcanic team force and drops.',
    effects: {
      minerDmgPct: 0.4,
      oreDropPct: 0.2,
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
    tagline: 'W4 Ancient Ruins — Channels relic precision into stronger team DPS and ore worth.',
    effects: {
      minerDmgPct: 0.35,
      oreValuePct: 0.35,
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
    tagline: 'W5 Voidreach — Aligns cosmic orbits for massive squad DPS and ore drop hauls.',
    effects: {
      minerDmgPct: 0.55,
      oreDropPct: 0.35,
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
    tagline: 'W6 Starwell — Sovereign relic amplifying team DMG, ore sell worth, and drop output.',
    effects: {
      minerDmgPct: 0.7,
      oreValuePct: 0.65,
      oreDropPct: 0.45,
    },
    ingredients: [
      { oreId: 'cloudgrit', amount: 70 },
      { oreId: 'aurorine', amount: 12 },
      { oreId: 'zenithite', amount: 2 },
    ],
    gemCost: 300000,
  },
  {
    id: 'abyssal_heart',
    name: 'Leviathan Abyssal Heart',
    category: 'world',
    rarity: 'exotic',
    iconPath: '/relics/abyssal_heart.webp',
    tagline: 'W7 Abyssal Biolume — Channels leviathan pressure to surge team DMG, ore worth, and haul yields.',
    effects: {
      minerDmgPct: 0.9,
      oreValuePct: 0.85,
      oreDropPct: 0.6,
    },
    ingredients: [
      { oreId: 'trenchslate', amount: 65 },
      { oreId: 'abyssalite', amount: 10 },
      { oreId: 'leviapearl', amount: 2 },
    ],
    gemCost: 650000,
  },
  {
    id: 'chrono_astrolabe',
    name: 'Chrono Nexus Astrolabe',
    category: 'world',
    rarity: 'secret',
    iconPath: '/relics/chrono_astrolabe.webp',
    tagline: 'W8 Chrono Nexus — Overclocks spacetime yields for apex team DMG, ore worth, and drop output.',
    effects: {
      minerDmgPct: 1.15,
      oreValuePct: 1.1,
      oreDropPct: 0.8,
    },
    ingredients: [
      { oreId: 'mithrilite', amount: 60 },
      { oreId: 'aetherium', amount: 10 },
      { oreId: 'chronocrown', amount: 2 },
    ],
    gemCost: 1250000,
  },

  // === 3 WEATHER & MUTATION RELICS ===
  {
    id: 'storm_bell',
    name: 'Tempest Weather Bell',
    category: 'weather',
    rarity: 'epic',
    iconPath: '/relics/storm_bell.webp',
    tagline: 'Resonates with tempest winds to multiply ore drops and market sell value.',
    effects: {
      oreDropPct: 0.3,
      oreValuePct: 0.25,
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
    tagline: 'Distills glacial and eclipse essence to surge ore sell value and drop yields.',
    effects: {
      oreValuePct: 0.5,
      oreDropPct: 0.35,
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
    tagline: 'Bends starlight into surging team DMG, boosted ore worth, and abundant ore drops.',
    effects: {
      minerDmgPct: 0.6,
      oreValuePct: 0.55,
      oreDropPct: 0.4,
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
    tagline: 'Channels mainframe power into crushing team damage and higher ore sell returns.',
    effects: {
      minerDmgPct: 0.6,
      oreValuePct: 0.4,
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
    tagline: 'Draws richer ore payouts and bonus ore drops across every vein.',
    effects: {
      oreValuePct: 0.4,
      oreDropPct: 0.25,
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
    tagline: 'Rallies every deployed chibi with massive team damage and overflowing ore drops.',
    effects: {
      minerDmgPct: 0.75,
      oreDropPct: 0.4,
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
  minerDmgPct: (v) => `+${Math.round(v * 100)}% Team DMG`,
  oreValuePct: (v) => `+${Math.round(v * 100)}% Sell Ore`,
  oreDropPct: (v) => `+${Math.round(v * 100)}% Drop Ore`,
};

export function formatRelicEffects(def: RelicDef): string[] {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(def.effects) as Array<[RelicEffectStat, number | undefined]>) {
    if (val === undefined || val === 0) continue;
    lines.push(EFFECT_LABELS[key](val));
  }
  return lines;
}
