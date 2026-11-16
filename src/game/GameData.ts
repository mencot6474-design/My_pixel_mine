import { CHIBI_CATALOG, ChibiDef, ChibiRarity } from '../game3d/ChibiCatalog';

export type WorldId = 'underground' | 'crystal' | 'magma' | 'ruins' | 'astral' | 'starwell';

export type ItemRarity = ChibiRarity;

export interface OreDef {
  id: string;
  name: string;
  worldId: WorldId;
  chancePct: number;
  rarity: ItemRarity;
  color: string;
  secondaryColor: string;
  sellValue: number;
}

export interface WorldMinerEntry {
  chibiId: string;
  worldId: WorldId;
  chancePct: number;
  rarity: ItemRarity;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  iconColor: string;
  unlockCost: number;
  oreHpMult: number;
}

export interface OtherItemDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  color: string;
  kind: 'scroll' | 'gems' | 'potion' | 'charm';
}

export interface PickaxeDef {
  id: string;
  name: string;
  dmgMult: number;
  cost: number;
  rarity: ItemRarity;
  color: string;
}

export interface MutationDef {
  id: string;
  name: string;
  mult: number;
  chancePct: number;
  color: string;
  rarity: ItemRarity;
}

export interface EnchantDef {
  id: string;
  name: string;
  dmgMult: number;
  chancePct: number;
  rarity: ItemRarity;
  color: string;
}

export type GemPotionShape = 'round' | 'jar' | 'vial' | 'prism' | 'clover' | 'star' | 'crystal';

export interface GemShopItemDef {
  id: string;
  name: string;
  effectText: string;
  durationLabel: string;
  durationSec: number;
  gemCost: number;
  rarity: ItemRarity;
  color: string;
  shape: GemPotionShape;
}

export const RARITY_BORDER: Record<ItemRarity, string> = {
  common: '#cbd5e1',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
  rainbow: '#f472b6',
  mythic: '#ec4899',
  exotic: '#14b8a6',
  secret: '#f43f5e',
};

export const WORLDS: readonly WorldDef[] = [
  { id: 'underground', name: 'The Underground', iconColor: '#f59e0b', unlockCost: 0, oreHpMult: 1 },
  { id: 'crystal', name: 'Crystal Caves', iconColor: '#38bdf8', unlockCost: 2_500_000, oreHpMult: 180 },
  { id: 'magma', name: 'Magma Hollows', iconColor: '#f97316', unlockCost: 500_000_000, oreHpMult: 30_000 },
  { id: 'ruins', name: 'Ancient Ruins', iconColor: '#a855f7', unlockCost: 100_000_000_000, oreHpMult: 5_000_000 },
  { id: 'astral', name: 'Voidreach', iconColor: '#e879f9', unlockCost: 25_000_000_000_000, oreHpMult: 180_000_000 },
  { id: 'starwell', name: 'Starwell', iconColor: '#38bdf8', unlockCost: 5_000_000_000_000_000, oreHpMult: 6_000_000_000 },
] as const;

export function getWorldById(worldId: WorldId): WorldDef {
  return WORLDS.find((w) => w.id === worldId) ?? WORLDS[0];
}

export function getWorldIndex(worldId: WorldId): number {
  return WORLDS.findIndex((w) => w.id === worldId);
}

export const ORES: readonly OreDef[] = [
  // 1. The Underground (matching screenshot 100%)
  { id: 'coalite', name: 'Coalite', worldId: 'underground', chancePct: 44.95, rarity: 'common', color: '#475569', secondaryColor: '#1e293b', sellValue: 15 },
  { id: 'ochrite', name: 'Ochrite', worldId: 'underground', chancePct: 22.0, rarity: 'uncommon', color: '#ca8a04', secondaryColor: '#713f12', sellValue: 50 },
  { id: 'copperine', name: 'Copperine', worldId: 'underground', chancePct: 15.0, rarity: 'rare', color: '#ea580c', secondaryColor: '#1e3a8a', sellValue: 135 },
  { id: 'tinvein', name: 'Tinvein', worldId: 'underground', chancePct: 9.4, rarity: 'rare', color: '#cbd5e1', secondaryColor: '#334155', sellValue: 340 },
  { id: 'ironshard', name: 'Ironshard', worldId: 'underground', chancePct: 5.1, rarity: 'epic', color: '#38bdf8', secondaryColor: '#9a3412', sellValue: 880 },
  { id: 'silverdrop', name: 'Silverdrop', worldId: 'underground', chancePct: 2.4, rarity: 'legendary', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 2400 },
  { id: 'amberite', name: 'Amberite', worldId: 'underground', chancePct: 1.0, rarity: 'rainbow', color: '#facc15', secondaryColor: '#78350f', sellValue: 8500 },
  { id: 'bullionite', name: 'Bullionite', worldId: 'underground', chancePct: 0.15, rarity: 'mythic', color: '#fde047', secondaryColor: '#ec4899', sellValue: 55000 },

  // 2. Crystal Caves (matching World 2 Index)
  { id: 'glowquartz', name: 'Glowquartz', worldId: 'crystal', chancePct: 41.54, rarity: 'common', color: '#67e8f9', secondaryColor: '#1e293b', sellValue: 320 },
  { id: 'frostquartz', name: 'Frostquartz', worldId: 'crystal', chancePct: 25.0, rarity: 'uncommon', color: '#22d3ee', secondaryColor: '#0f172a', sellValue: 950 },
  { id: 'prismite', name: 'Prismite', worldId: 'crystal', chancePct: 17.0, rarity: 'rare', color: '#f472b6', secondaryColor: '#1e293b', sellValue: 2600 },
  { id: 'hushstone', name: 'Hushstone', worldId: 'crystal', chancePct: 9.5, rarity: 'rare', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 6800 },
  { id: 'azurine', name: 'Azurine', worldId: 'crystal', chancePct: 4.5, rarity: 'epic', color: '#3b82f6', secondaryColor: '#1e1b4b', sellValue: 18500 },
  { id: 'glimmerite', name: 'Glimmerite', worldId: 'crystal', chancePct: 1.8, rarity: 'legendary', color: '#facc15', secondaryColor: '#e2e8f0', sellValue: 55000 },
  { id: 'spectrine', name: 'Spectrine', worldId: 'crystal', chancePct: 0.6, rarity: 'rainbow', color: '#e879f9', secondaryColor: '#0f172a', sellValue: 220000 },
  { id: 'celestium', name: 'Celestium', worldId: 'crystal', chancePct: 0.06, rarity: 'mythic', color: '#ec4899', secondaryColor: '#0f172a', sellValue: 1500000 },

  // 3. Magma Hollows (matching World 3 Index)
  { id: 'emberstone', name: 'Emberstone', worldId: 'magma', chancePct: 42.82, rarity: 'common', color: '#f97316', secondaryColor: '#1c1917', sellValue: 1600 },
  { id: 'ashglass', name: 'Ashglass', worldId: 'magma', chancePct: 25.0, rarity: 'uncommon', color: '#2dd4bf', secondaryColor: '#18181b', sellValue: 4800 },
  { id: 'magmite', name: 'Magmite', worldId: 'magma', chancePct: 17.0, rarity: 'rare', color: '#ef4444', secondaryColor: '#1c1917', sellValue: 13000 },
  { id: 'cindershard', name: 'Cindershard', worldId: 'magma', chancePct: 9.1, rarity: 'rare', color: '#fb7185', secondaryColor: '#1c1917', sellValue: 34000 },
  { id: 'scorchgold', name: 'Scorchgold', worldId: 'magma', chancePct: 4.1, rarity: 'epic', color: '#facc15', secondaryColor: '#1c1917', sellValue: 92000 },
  { id: 'pyroclast', name: 'Pyroclast', worldId: 'magma', chancePct: 1.5, rarity: 'legendary', color: '#fbbf24', secondaryColor: '#1c1917', sellValue: 280000 },
  { id: 'moltenite', name: 'Moltenite', worldId: 'magma', chancePct: 0.45, rarity: 'rainbow', color: '#f97316', secondaryColor: '#1c1917', sellValue: 1100000 },
  { id: 'pyrecore', name: 'Pyrecore', worldId: 'magma', chancePct: 0.03, rarity: 'mythic', color: '#ec4899', secondaryColor: '#18181b', sellValue: 7500000 },

  // 4. Ancient Ruins (matching World 4 Index)
  { id: 'runestone', name: 'Runestone', worldId: 'ruins', chancePct: 44.68, rarity: 'common', color: '#2dd4bf', secondaryColor: '#334155', sellValue: 8500 },
  { id: 'dustglyph', name: 'Dustglyph', worldId: 'ruins', chancePct: 25.0, rarity: 'uncommon', color: '#eab308', secondaryColor: '#57534e', sellValue: 26000 },
  { id: 'relicore', name: 'Relicore', worldId: 'ruins', chancePct: 16.0, rarity: 'rare', color: '#22d3ee', secondaryColor: '#1e293b', sellValue: 70000 },
  { id: 'sanctite', name: 'Sanctite', worldId: 'ruins', chancePct: 8.7, rarity: 'rare', color: '#a5f3fc', secondaryColor: '#365314', sellValue: 185000 },
  { id: 'gildium', name: 'Gildium', worldId: 'ruins', chancePct: 3.8, rarity: 'epic', color: '#facc15', secondaryColor: '#3f6212', sellValue: 500000 },
  { id: 'oathstone', name: 'Oathstone', worldId: 'ruins', chancePct: 1.4, rarity: 'legendary', color: '#06b6d4', secondaryColor: '#1e293b', sellValue: 1500000 },
  { id: 'idolshard', name: 'Idolshard', worldId: 'ruins', chancePct: 0.4, rarity: 'rainbow', color: '#4ade80', secondaryColor: '#3f6212', sellValue: 6000000 },
  { id: 'immortite', name: 'Immortite', worldId: 'ruins', chancePct: 0.02, rarity: 'mythic', color: '#ec4899', secondaryColor: '#1e293b', sellValue: 40000000 },

  // 5. Voidreach (matching World 5 Index)
  { id: 'voidshard', name: 'Voidshard', worldId: 'astral', chancePct: 45.59, rarity: 'common', color: '#a855f7', secondaryColor: '#1e1b4b', sellValue: 45000 },
  { id: 'gloomite', name: 'Gloomite', worldId: 'astral', chancePct: 25.0, rarity: 'uncommon', color: '#4f46e5', secondaryColor: '#0f172a', sellValue: 140000 },
  { id: 'nullite', name: 'Nullite', worldId: 'astral', chancePct: 16.0, rarity: 'rare', color: '#9333ea', secondaryColor: '#09090b', sellValue: 380000 },
  { id: 'riftglass', name: 'Riftglass', worldId: 'astral', chancePct: 8.5, rarity: 'rare', color: '#22d3ee', secondaryColor: '#0f172a', sellValue: 1000000 },
  { id: 'starcore', name: 'Starcore', worldId: 'astral', chancePct: 3.5, rarity: 'epic', color: '#facc15', secondaryColor: '#1e1b4b', sellValue: 2800000 },
  { id: 'cosmite', name: 'Cosmite', worldId: 'astral', chancePct: 1.1, rarity: 'legendary', color: '#ec4899', secondaryColor: '#1e1b4b', sellValue: 8500000 },
  { id: 'singularite', name: 'Singularite', worldId: 'astral', chancePct: 0.3, rarity: 'rainbow', color: '#38bdf8', secondaryColor: '#09090b', sellValue: 35000000 },
  { id: 'duskcrown', name: 'Duskcrown', worldId: 'astral', chancePct: 0.01, rarity: 'mythic', color: '#ec4899', secondaryColor: '#09090b', sellValue: 240000000 },

  // 6. Starwell (matching World 6 Index)
  { id: 'cloudgrit', name: 'Cloudgrit', worldId: 'starwell', chancePct: 46.755, rarity: 'common', color: '#7dd3fc', secondaryColor: '#334155', sellValue: 250000 },
  { id: 'skyshale', name: 'Skyshale', worldId: 'starwell', chancePct: 25.0, rarity: 'uncommon', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 780000 },
  { id: 'sunvein', name: 'Sunvein', worldId: 'starwell', chancePct: 16.0, rarity: 'rare', color: '#facc15', secondaryColor: '#1e293b', sellValue: 2100000 },
  { id: 'gleamstone', name: 'Gleamstone', worldId: 'starwell', chancePct: 7.9, rarity: 'rare', color: '#a5f3fc', secondaryColor: '#334155', sellValue: 5500000 },
  { id: 'aurorine', name: 'Aurorine', worldId: 'starwell', chancePct: 3.1, rarity: 'epic', color: '#22d3ee', secondaryColor: '#a855f7', sellValue: 15000000 },
  { id: 'zenithite', name: 'Zenithite', worldId: 'starwell', chancePct: 0.99, rarity: 'legendary', color: '#0ea5e9', secondaryColor: '#09090b', sellValue: 46000000 },
  { id: 'caelite', name: 'Caelite', worldId: 'starwell', chancePct: 0.25, rarity: 'rainbow', color: '#38bdf8', secondaryColor: '#f472b6', sellValue: 190000000 },
  { id: 'dawncrown', name: 'Dawncrown', worldId: 'starwell', chancePct: 0.005, rarity: 'mythic', color: '#fbbf24', secondaryColor: '#ec4899', sellValue: 1400000000 },
] as const;

export const WORLD_MINERS: readonly WorldMinerEntry[] = [
  // 1. The Underground (5 miners)
  { chibiId: 'astral-recruit', worldId: 'underground', chancePct: 4.2, rarity: 'common' },
  { chibiId: 'solar-striker', worldId: 'underground', chancePct: 2.0, rarity: 'uncommon' },
  { chibiId: 'frost-vanguard', worldId: 'underground', chancePct: 0.85, rarity: 'rare' },
  { chibiId: 'tropic-blaze', worldId: 'underground', chancePct: 0.3, rarity: 'exotic' },
  { chibiId: 'cyber-ki-brawler', worldId: 'underground', chancePct: 0.09, rarity: 'secret' },

  // 2. Crystal Caves (5 miners)
  { chibiId: 'volt-kensei', worldId: 'crystal', chancePct: 3.2, rarity: 'uncommon' },
  { chibiId: 'pyre-kitsune', worldId: 'crystal', chancePct: 1.5, rarity: 'rare' },
  { chibiId: 'zephyr-esper', worldId: 'crystal', chancePct: 0.6, rarity: 'epic' },
  { chibiId: 'aqua-blitz', worldId: 'crystal', chancePct: 0.22, rarity: 'exotic' },
  { chibiId: 'glacier-tide', worldId: 'crystal', chancePct: 0.065, rarity: 'secret' },

  // 3. Magma Hollows (5 miners)
  { chibiId: 'mantis-monarch', worldId: 'magma', chancePct: 2.4, rarity: 'rare' },
  { chibiId: 'vortex-mimic', worldId: 'magma', chancePct: 1.1, rarity: 'epic' },
  { chibiId: 'vesper-ward', worldId: 'magma', chancePct: 0.42, rarity: 'legendary' },
  { chibiId: 'tidebound-corsair', worldId: 'magma', chancePct: 0.15, rarity: 'exotic' },
  { chibiId: 'chroma-quill', worldId: 'magma', chancePct: 0.045, rarity: 'secret' },

  // 4. Ancient Ruins (5 miners)
  { chibiId: 'tempest-drake', worldId: 'ruins', chancePct: 1.8, rarity: 'epic' },
  { chibiId: 'titan-dread', worldId: 'ruins', chancePct: 0.85, rarity: 'legendary' },
  { chibiId: 'seraph-paladin', worldId: 'ruins', chancePct: 0.3, rarity: 'mythic' },
  { chibiId: 'lotus-frost', worldId: 'ruins', chancePct: 0.11, rarity: 'exotic' },
  { chibiId: 'rime-duchess', worldId: 'ruins', chancePct: 0.032, rarity: 'secret' },

  // 5. Voidreach (5 miners)
  { chibiId: 'nebula-archon', worldId: 'astral', chancePct: 1.4, rarity: 'legendary' },
  { chibiId: 'eclipse-warlord', worldId: 'astral', chancePct: 0.65, rarity: 'rainbow' },
  { chibiId: 'chrono-sovereign', worldId: 'astral', chancePct: 0.22, rarity: 'mythic' },
  { chibiId: 'zephyr-raven', worldId: 'astral', chancePct: 0.08, rarity: 'exotic' },
  { chibiId: 'nebula-hex', worldId: 'astral', chancePct: 0.024, rarity: 'secret' },

  // 6. Starwell (5 miners)
  { chibiId: 'draconic-blademaster', worldId: 'starwell', chancePct: 1.2, rarity: 'legendary' },
  { chibiId: 'aegis-wyrm', worldId: 'starwell', chancePct: 0.55, rarity: 'rainbow' },
  { chibiId: 'ashen-titan', worldId: 'starwell', chancePct: 0.18, rarity: 'mythic' },
  { chibiId: 'vesper-reaver', worldId: 'starwell', chancePct: 0.065, rarity: 'exotic' },
  { chibiId: 'null-prism', worldId: 'starwell', chancePct: 0.02, rarity: 'secret' },
] as const;

export const OTHER_ITEMS: readonly OtherItemDef[] = [] as const;

export const PICKAXES: readonly PickaxeDef[] = [
  { id: 'starter', name: 'Chrysoberyl', dmgMult: 1, cost: 0, rarity: 'common', color: '#94a3b8' },
  { id: 'sunwheel', name: 'Sunwheel', dmgMult: 2.0, cost: 450, rarity: 'legendary', color: '#f59e0b' },
  { id: 'zircon', name: 'Zircon', dmgMult: 3.8, cost: 3_500, rarity: 'rainbow', color: '#38bdf8' },
  { id: 'thundercoil', name: 'Thundercoil', dmgMult: 7.0, cost: 45_000, rarity: 'uncommon', color: '#22c55e' },
  { id: 'rhodolite', name: 'Rhodolite', dmgMult: 14.0, cost: 1_200_000, rarity: 'rare', color: '#818cf8' },
  { id: 'heartpiercer', name: 'Heartpiercer', dmgMult: 30.0, cost: 35_000_000, rarity: 'mythic', color: '#ec4899' },
  { id: 'anvilheart', name: 'Anvilheart', dmgMult: 65.0, cost: 1_500_000_000, rarity: 'rainbow', color: '#f97316' },
] as const;

export const MUTATIONS: readonly MutationDef[] = [
  { id: 'normal', name: 'Normal', mult: 1.0, chancePct: 0, color: '#e2e8f0', rarity: 'common' },
  { id: 'bronze', name: 'Bronze', mult: 1.37, chancePct: 60.04, color: '#cd7f32', rarity: 'common' },
  { id: 'diamond', name: 'Diamond', mult: 2.12, chancePct: 24.02, color: '#38bdf8', rarity: 'rare' },
  { id: 'platinum', name: 'Platinum', mult: 3.23, chancePct: 9.61, color: '#cbd5e1', rarity: 'epic' },
  { id: 'rainbow', name: 'Rainbow', mult: 4.72, chancePct: 3.84, color: '#f472b6', rarity: 'rainbow' },
  { id: 'frozen', name: 'Frozen', mult: 11.41, chancePct: 1.54, color: '#67e8f9', rarity: 'rare' },
  { id: 'inferno', name: 'Inferno', mult: 22.56, chancePct: 0.61, color: '#f97316', rarity: 'legendary' },
  { id: 'nightmare', name: 'Nightmare', mult: 40.0, chancePct: 0.25, color: '#9333ea', rarity: 'epic' },
  { id: 'unreal', name: 'Unreal', mult: 80.0, chancePct: 0.098, color: '#6366f1', rarity: 'mythic' },
] as const;

export const ENCHANT_DICE_GEM_COST = 250;

export const ENCHANTS: readonly EnchantDef[] = [
  { id: 'blazing', name: 'Blazing', dmgMult: 1.25, chancePct: 45.9889, rarity: 'common', color: '#f97316' },
  { id: 'glacial', name: 'Glacial', dmgMult: 1.45, chancePct: 27.0, rarity: 'uncommon', color: '#38bdf8' },
  { id: 'quaking', name: 'Quaking', dmgMult: 1.7, chancePct: 15.0, rarity: 'rare', color: '#b45309' },
  { id: 'surging', name: 'Surging', dmgMult: 2.0, chancePct: 8.0, rarity: 'rare', color: '#22d3ee' },
  { id: 'radiant', name: 'Radiant', dmgMult: 2.5, chancePct: 3.0, rarity: 'legendary', color: '#facc15' },
  { id: 'thundering', name: 'Thundering', dmgMult: 3.2, chancePct: 0.9, rarity: 'epic', color: '#a855f7' },
  { id: 'cataclysmic', name: 'Cataclysmic', dmgMult: 4.2, chancePct: 0.1, rarity: 'legendary', color: '#f59e0b' },
  { id: 'sundering', name: 'Sundering', dmgMult: 5.8, chancePct: 0.01, rarity: 'mythic', color: '#ef4444' },
  { id: 'timeless', name: 'Timeless', dmgMult: 8.5, chancePct: 0.001, rarity: 'mythic', color: '#f8fafc' },
  { id: 'spellbound', name: 'Spellbound', dmgMult: 14.0, chancePct: 0.0001, rarity: 'rainbow', color: '#e879f9' },
] as const;

export function rollEnchantDef(rng: () => number = Math.random): EnchantDef {
  const total = ENCHANTS.reduce((s, e) => s + e.chancePct, 0);
  let r = Math.max(0, Math.min(0.9999999, rng())) * total;
  for (const e of ENCHANTS) {
    r -= e.chancePct;
    if (r <= 0) return e;
  }
  return ENCHANTS[0];
}

export const PICKAXE_RESTOCK_MS = 120_000;

export const DEFAULT_PICKAXE_STOCK: Record<string, number> = {
  starter: 8,
  sunwheel: 7,
  zircon: 5,
  thundercoil: 4,
  rhodolite: 3,
  heartpiercer: 2,
  anvilheart: 1,
};

export function getPickaxeSellValue(pickaxeId: string): number {
  const p = getPickaxeById(pickaxeId);
  if (!p || p.cost <= 0) return 25;
  return Math.max(25, Math.round(p.cost * 0.6));
}

export function getMinerSellValue(chibiId: string): number {
  const chibi = CHIBI_CATALOG.find((c) => c.id === chibiId);
  if (!chibi) return 50;
  return Math.max(50, Math.round(chibi.baseDps * 12));
}

export function getPickaxeById(id: string): PickaxeDef {
  return PICKAXES.find((p) => p.id === id) ?? PICKAXES[0];
}

export function getMutationById(id: string): MutationDef {
  return MUTATIONS.find((m) => m.id === id) ?? MUTATIONS[0];
}

const HIGH_TIER_MUTATION_INDEX = MUTATIONS.findIndex((m) => m.id === 'frozen');

export function isHighTierMutation(id: string): boolean {
  const idx = MUTATIONS.findIndex((m) => m.id === id);
  return idx >= 0 && HIGH_TIER_MUTATION_INDEX >= 0 && idx >= HIGH_TIER_MUTATION_INDEX;
}

export function getEnchantById(id: string | null): EnchantDef | null {
  if (!id) return null;
  return ENCHANTS.find((e) => e.id === id) ?? null;
}

export const GEM_SHOP_ITEMS: readonly GemShopItemDef[] = [
  {
    id: 'ore-elixir-1',
    name: 'Ore Elixir I',
    effectText: '+10% Ore Output',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 100,
    rarity: 'common',
    color: '#ea580c',
    shape: 'round',
  },
  {
    id: 'ore-elixir-2',
    name: 'Ore Elixir II',
    effectText: '+25% Ore Output',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 250,
    rarity: 'legendary',
    color: '#facc15',
    shape: 'jar',
  },
  {
    id: 'regrowth-potion',
    name: 'Regrowth Potion',
    effectText: '+100% Rock Respawn Speed',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 300,
    rarity: 'uncommon',
    color: '#22c55e',
    shape: 'vial',
  },
  {
    id: 'unearth-elixir',
    name: 'Unearth Elixir',
    effectText: '+10% Find Chance',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 300,
    rarity: 'rare',
    color: '#06b6d4',
    shape: 'prism',
  },
  {
    id: 'character-luck-potion',
    name: 'Character Luck Potion',
    effectText: '+50% Character Luck',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 500,
    rarity: 'uncommon',
    color: '#16a34a',
    shape: 'clover',
  },
  {
    id: 'ore-luck-potion',
    name: 'Ore Luck Potion',
    effectText: '+100% Ore Luck',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 500,
    rarity: 'epic',
    color: '#f59e0b',
    shape: 'star',
  },
  {
    id: 'ore-elixir-3',
    name: 'Ore Elixir III',
    effectText: '+50% Ore Output',
    durationLabel: '(10 min)',
    durationSec: 600,
    gemCost: 500,
    rarity: 'rare',
    color: '#38bdf8',
    shape: 'crystal',
  },
  {
    id: 'mutation-luck-1',
    name: 'Mutation Luck Potion I',
    effectText: '+100% Mutation Luck',
    durationLabel: '(5 min)',
    durationSec: 300,
    gemCost: 600,
    rarity: 'mythic',
    color: '#ec4899',
    shape: 'round',
  },
] as const;

export function getGemShopItemById(id: string): GemShopItemDef | undefined {
  return GEM_SHOP_ITEMS.find((p) => p.id === id);
}

function weightedPickByLuck<T>(
  pool: readonly T[],
  getWeight: (item: T) => number,
  luckMult: number,
  rng: () => number
): T {
  const maxRank = Math.max(1, pool.length - 1);
  const mult = Math.max(1, luckMult);
  const weights = pool.map((item, idx) => {
    const base = getWeight(item);
    return mult <= 1 ? base : base * Math.pow(mult, idx / maxRank);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.max(0, Math.min(0.999999, rng())) * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function rollMutation(rng: () => number = Math.random, luckMult = 1): MutationDef {
  const pool = MUTATIONS.filter((m) => m.chancePct > 0);
  return weightedPickByLuck(pool, (m) => m.chancePct, luckMult, rng);
}

export function getOreById(id: string): OreDef | undefined {
  return ORES.find((o) => o.id === id);
}

export function getOresByWorld(worldId: WorldId): OreDef[] {
  return ORES.filter((o) => o.worldId === worldId);
}

export function getMinersByWorld(worldId: WorldId): Array<{ entry: WorldMinerEntry; chibi: ChibiDef }> {
  return WORLD_MINERS.filter((m) => m.worldId === worldId)
    .map((entry) => {
      const chibi = CHIBI_CATALOG.find((c) => c.id === entry.chibiId);
      return chibi ? { entry, chibi } : null;
    })
    .filter((x): x is { entry: WorldMinerEntry; chibi: ChibiDef } => x !== null);
}

export function getMinerRarity(chibiId: string): ItemRarity {
  const entry = WORLD_MINERS.find((m) => m.chibiId === chibiId);
  return entry?.rarity ?? 'common';
}

export function rollWorldOre(worldId: WorldId, rng: () => number = Math.random, luckMult = 1): OreDef {
  const pool = getOresByWorld(worldId);
  return weightedPickByLuck(pool, (o) => o.chancePct, luckMult, rng);
}

export function rollWorldMiner(worldId: WorldId, rng: () => number = Math.random, luckMult = 1): ChibiDef | null {
  const pool = getMinersByWorld(worldId);
  if (!pool.length) return null;
  return weightedPickByLuck(pool, (m) => m.entry.chancePct, luckMult, rng).chibi;
}
