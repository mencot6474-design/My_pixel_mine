import { CHIBI_CATALOG, ChibiDef, ChibiRarity, getChibiById } from '../game3d/ChibiCatalog';
import { ANOMALY_CHIBI_DEFS, computeAnomalyScaledBaseDps } from './AnomalyData';
import { getDailyLoginRewardByChibiId } from './DailyLoginData';
import { computeOmegaScaledBaseDps, OMEGA_BOSS_DEFS } from './OmegaData';
import { computeTwinScaledBaseDps, PREMIUM_SHOP_ITEMS } from './PremiumShopData';
import { WeatherId } from './WeatherData';

export type WorldId =
  | 'underground'
  | 'crystal'
  | 'magma'
  | 'ruins'
  | 'astral'
  | 'starwell'
  | 'abyssal'
  | 'chrono'
  | 'solaris'
  | 'elysium'
  | 'nightmare'
  | 'singularity';

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
  worldId: WorldId;
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
  oreDropPct: number;
  sellValuePct: number;
  miningSpeedPct: number;
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
  fusion: '#e879f9',
  limited: '#fbbf24',
  twin: '#38bdf8',
  omega: '#ef4444',
  anomaly: '#22d3ee',
};

export const WORLD_GRIND_SCALE: Record<WorldId, number> = {
  underground: 1,
  crystal: 2.5,
  magma: 6,
  ruins: 15,
  astral: 35,
  starwell: 80,
  abyssal: 180,
  chrono: 400,
  solaris: 900,
  elysium: 2_000,
  nightmare: 4_500,
  singularity: 10_000,
};

export const WORLDS: readonly WorldDef[] = [
  { id: 'underground', name: 'The Underground', iconColor: '#f59e0b', unlockCost: 0, oreHpMult: 1 },
  { id: 'crystal', name: 'Crystal Caves', iconColor: '#38bdf8', unlockCost: 12_000_000, oreHpMult: 2_000 },
  { id: 'magma', name: 'Magma Hollows', iconColor: '#f97316', unlockCost: 30_000_000_000, oreHpMult: 6_000_000 },
  { id: 'ruins', name: 'Ancient Ruins', iconColor: '#a855f7', unlockCost: 72_000_000_000_000, oreHpMult: 24_000_000_000 },
  { id: 'astral', name: 'Voidreach', iconColor: '#e879f9', unlockCost: 180_000_000_000_000_000, oreHpMult: 120_000_000_000_000 },
  { id: 'starwell', name: 'Starwell', iconColor: '#38bdf8', unlockCost: 420_000_000_000_000_000_000, oreHpMult: 720_000_000_000_000_000 },
  { id: 'abyssal', name: 'Abyssal Biolume', iconColor: '#2dd4bf', unlockCost: 960_000_000_000_000_000_000_000, oreHpMult: 5_040_000_000_000_000_000_000 },
  { id: 'chrono', name: 'Chrono Nexus', iconColor: '#fbbf24', unlockCost: 2_160_000_000_000_000_000_000_000_000, oreHpMult: 40_320_000_000_000_000_000_000_000 },
  { id: 'solaris', name: 'Solaris Sanctum', iconColor: '#fb7185', unlockCost: 4_800_000_000_000_000_000_000_000_000_000, oreHpMult: 362_880_000_000_000_000_000_000_000_000 },
  { id: 'elysium', name: 'Elysium Core', iconColor: '#c084fc', unlockCost: 10_800_000_000_000_000_000_000_000_000_000_000, oreHpMult: 3_628_800_000_000_000_000_000_000_000_000_000 },
  { id: 'nightmare', name: 'Nightmare Hollow', iconColor: '#a855f7', unlockCost: 24_000_000_000_000_000_000_000_000_000_000_000_000, oreHpMult: 39_916_800_000_000_000_000_000_000_000_000_000_000 },
  { id: 'singularity', name: 'Eclipse Singularity', iconColor: '#ef4444', unlockCost: 54_000_000_000_000_000_000_000_000_000_000_000_000_000, oreHpMult: 479_001_600_000_000_000_000_000_000_000_000_000_000_000 },
] as const;

export const WORLD_UPGRADE_COST_SCALE: Record<string, number> = {
  underground: 1,
  crystal: 2_500,
  magma: 6_000_000,
  ruins: 15_000_000_000,
  astral: 35_000_000_000_000,
  starwell: 80_000_000_000_000_000,
  abyssal: 180_000_000_000_000_000_000,
  chrono: 400_000_000_000_000_000_000_000,
  solaris: 900_000_000_000_000_000_000_000_000,
  elysium: 2_000_000_000_000_000_000_000_000_000_000,
  nightmare: 4_500_000_000_000_000_000_000_000_000_000_000,
  singularity: 10_000_000_000_000_000_000_000_000_000_000_000_000,
};

/** Returns upgrade cost scale for a world, extrapolating ×1,000 per world added beyond the explicit map. */
export function getWorldUpgradeCostScale(
  worldId: WorldId,
  worlds: readonly WorldDef[] = WORLDS
): number {
  const explicit = WORLD_UPGRADE_COST_SCALE[worldId];
  if (explicit !== undefined) return explicit;
  let lastExplicitIdx = -1;
  let lastExplicitScale = 1;
  for (let i = 0; i < worlds.length; i++) {
    const val = WORLD_UPGRADE_COST_SCALE[worlds[i].id];
    if (val !== undefined) {
      lastExplicitIdx = i;
      lastExplicitScale = val;
    }
  }
  const targetIdx = worlds.findIndex((w) => w.id === worldId);
  if (targetIdx > lastExplicitIdx && lastExplicitIdx >= 0) {
    return Number((lastExplicitScale * Math.pow(1_000, targetIdx - lastExplicitIdx)).toPrecision(12));
  }
  return 1;
}

export interface LatestWorldScaleAnchor {
  worldId: WorldId;
  secretBaseDps: number;
  upgradeCostScale: number;
}

/** Finds the latest World's Secret-tier DPS anchor and upgrade cost scale for auto-balancing Twin units. */
export function getLatestWorldScaleAnchor(
  worlds: readonly WorldDef[] = WORLDS,
  worldMiners: readonly WorldMinerEntry[] = WORLD_MINERS,
  lookupChibi: (id: string) => { baseDps: number } | undefined = getChibiById
): LatestWorldScaleAnchor {
  const latestWorld = worlds[worlds.length - 1] ?? WORLDS[0];
  let secretBaseDps = 0;
  for (let i = worlds.length - 1; i >= 0; i--) {
    const wId = worlds[i].id;
    let maxDps = 0;
    for (const entry of worldMiners) {
      if (entry.worldId !== wId) continue;
      const dps = lookupChibi(entry.chibiId)?.baseDps ?? 0;
      if (dps > maxDps) maxDps = dps;
    }
    if (maxDps > 0) {
      secretBaseDps = maxDps;
      break;
    }
  }
  return {
    worldId: latestWorld.id,
    secretBaseDps: Math.max(1, secretBaseDps),
    upgradeCostScale: getWorldUpgradeCostScale(latestWorld.id, worlds),
  };
}

/**
 * Resolves the active progression anchor from the player's highest unlocked World
 * and discovered miners within that World (falling back to that World's starter miner).
 */
export function getUnlockedWorldScaleAnchor(
  unlockedWorlds: readonly WorldId[],
  discovered?: ReadonlySet<string>,
  worlds: readonly WorldDef[] = WORLDS,
  worldMiners: readonly WorldMinerEntry[] = WORLD_MINERS,
  lookupChibi: (id: string) => { baseDps: number } | undefined = getChibiById
): LatestWorldScaleAnchor {
  let highestIdx = 0;
  for (let i = worlds.length - 1; i >= 0; i--) {
    if (unlockedWorlds.includes(worlds[i].id)) {
      highestIdx = i;
      break;
    }
  }
  const highestWorld = worlds[highestIdx] ?? WORLDS[0];
  let anchorDps = 0;
  let starterDps = 0;
  for (const entry of worldMiners) {
    if (entry.worldId !== highestWorld.id) continue;
    const dps = lookupChibi(entry.chibiId)?.baseDps ?? 0;
    if (dps <= 0) continue;
    if (starterDps === 0 || dps < starterDps) starterDps = dps;
    if (!discovered || discovered.has(entry.chibiId)) {
      if (dps > anchorDps) anchorDps = dps;
    }
  }
  return {
    worldId: highestWorld.id,
    secretBaseDps: Math.max(1, anchorDps > 0 ? anchorDps : starterDps),
    upgradeCostScale: getWorldUpgradeCostScale(highestWorld.id, worlds),
  };
}

/**
 * Computes effective Chibi baseDps, capping global progression-scaled units
 * (`twin`, `omega`, `limited`) by the player's highest unlocked World progression.
 */
export function getEffectiveChibiBaseDps(
  chibiId: string,
  unlockedWorlds?: readonly WorldId[],
  discovered?: ReadonlySet<string>
): number {
  const chibi = getChibiById(chibiId);
  if (!chibi) return 0;
  if (!unlockedWorlds || unlockedWorlds.length === 0) return chibi.baseDps;

  const premium = PREMIUM_SHOP_ITEMS.find((p) => p.chibiId === chibiId);
  if (premium) {
    const anchor = getUnlockedWorldScaleAnchor(unlockedWorlds, discovered);
    return Math.min(chibi.baseDps, computeTwinScaledBaseDps(anchor.secretBaseDps, premium.dpsMult));
  }

  const omega = OMEGA_BOSS_DEFS.find((o) => o.chibiId === chibiId);
  if (omega) {
    const anchor = getUnlockedWorldScaleAnchor(unlockedWorlds, discovered);
    return Math.min(chibi.baseDps, computeOmegaScaledBaseDps(anchor.secretBaseDps, omega.dpsMult));
  }

  const anomaly = ANOMALY_CHIBI_DEFS.find((a) => a.chibiId === chibiId);
  if (anomaly) {
    const anchor = getUnlockedWorldScaleAnchor(unlockedWorlds, discovered);
    return Math.min(chibi.baseDps, computeAnomalyScaledBaseDps(anchor.secretBaseDps, anomaly.dpsMult));
  }

  const daily = getDailyLoginRewardByChibiId(chibiId);
  if (daily) {
    const anchor = getUnlockedWorldScaleAnchor(unlockedWorlds, discovered);
    const dayMult = 1.2 + Math.max(0, daily.day - 1) * 0.15;
    return Math.min(chibi.baseDps, Math.max(1, Math.round(anchor.secretBaseDps * dayMult)));
  }

  return chibi.baseDps;
}

/** Syncs all Twin & Omega Chibi baseDps values in CHIBI_CATALOG against the latest World anchor. */
export function syncTwinCatalogDpsFromAnchor(
  anchor: Pick<LatestWorldScaleAnchor, 'secretBaseDps'> = getLatestWorldScaleAnchor()
): void {
  for (const item of PREMIUM_SHOP_ITEMS) {
    const chibi = getChibiById(item.chibiId);
    if (!chibi) continue;
    chibi.baseDps = computeTwinScaledBaseDps(anchor.secretBaseDps, item.dpsMult);
  }
  for (const boss of OMEGA_BOSS_DEFS) {
    const chibi = getChibiById(boss.chibiId);
    if (!chibi) continue;
    chibi.baseDps = computeOmegaScaledBaseDps(anchor.secretBaseDps, boss.dpsMult);
  }
  for (const anom of ANOMALY_CHIBI_DEFS) {
    const chibi = getChibiById(anom.chibiId);
    if (!chibi) continue;
    chibi.baseDps = computeAnomalyScaledBaseDps(anchor.secretBaseDps, anom.dpsMult);
  }
}

export function getWorldById(worldId: WorldId): WorldDef {
  return WORLDS.find((w) => w.id === worldId) ?? WORLDS[0];
}

export function getWorldIndex(worldId: WorldId): number {
  return WORLDS.findIndex((w) => w.id === worldId);
}

export const ORES: readonly OreDef[] = [
  // 1. The Underground (matching screenshot 100%)
  { id: 'coalite', name: 'Coalite', worldId: 'underground', chancePct: 55.45, rarity: 'common', color: '#475569', secondaryColor: '#1e293b', sellValue: 15 },
  { id: 'ochrite', name: 'Ochrite', worldId: 'underground', chancePct: 23.0, rarity: 'uncommon', color: '#ca8a04', secondaryColor: '#713f12', sellValue: 50 },
  { id: 'copperine', name: 'Copperine', worldId: 'underground', chancePct: 12.5, rarity: 'rare', color: '#ea580c', secondaryColor: '#1e3a8a', sellValue: 135 },
  { id: 'tinvein', name: 'Tinvein', worldId: 'underground', chancePct: 5.8, rarity: 'rare', color: '#cbd5e1', secondaryColor: '#334155', sellValue: 340 },
  { id: 'ironshard', name: 'Ironshard', worldId: 'underground', chancePct: 2.3, rarity: 'epic', color: '#38bdf8', secondaryColor: '#9a3412', sellValue: 880 },
  { id: 'silverdrop', name: 'Silverdrop', worldId: 'underground', chancePct: 0.75, rarity: 'legendary', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 2400 },
  { id: 'amberite', name: 'Amberite', worldId: 'underground', chancePct: 0.17, rarity: 'rainbow', color: '#facc15', secondaryColor: '#78350f', sellValue: 8500 },
  { id: 'bullionite', name: 'Bullionite', worldId: 'underground', chancePct: 0.03, rarity: 'mythic', color: '#fde047', secondaryColor: '#ec4899', sellValue: 55000 },

  // 2. Crystal Caves (matching World 2 Index)
  { id: 'glowquartz', name: 'Glowquartz', worldId: 'crystal', chancePct: 54.89, rarity: 'common', color: '#67e8f9', secondaryColor: '#1e293b', sellValue: 15_000 },
  { id: 'frostquartz', name: 'Frostquartz', worldId: 'crystal', chancePct: 24.0, rarity: 'uncommon', color: '#22d3ee', secondaryColor: '#0f172a', sellValue: 50_000 },
  { id: 'prismite', name: 'Prismite', worldId: 'crystal', chancePct: 13.0, rarity: 'rare', color: '#f472b6', secondaryColor: '#1e293b', sellValue: 135_000 },
  { id: 'hushstone', name: 'Hushstone', worldId: 'crystal', chancePct: 5.5, rarity: 'rare', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 340_000 },
  { id: 'azurine', name: 'Azurine', worldId: 'crystal', chancePct: 1.9, rarity: 'epic', color: '#3b82f6', secondaryColor: '#1e1b4b', sellValue: 880_000 },
  { id: 'glimmerite', name: 'Glimmerite', worldId: 'crystal', chancePct: 0.58, rarity: 'legendary', color: '#facc15', secondaryColor: '#e2e8f0', sellValue: 2_400_000 },
  { id: 'spectrine', name: 'Spectrine', worldId: 'crystal', chancePct: 0.115, rarity: 'rainbow', color: '#e879f9', secondaryColor: '#0f172a', sellValue: 8_500_000 },
  { id: 'celestium', name: 'Celestium', worldId: 'crystal', chancePct: 0.015, rarity: 'mythic', color: '#ec4899', secondaryColor: '#0f172a', sellValue: 55_000_000 },

  // 3. Magma Hollows (matching World 3 Index)
  { id: 'emberstone', name: 'Emberstone', worldId: 'magma', chancePct: 56.512, rarity: 'common', color: '#f97316', secondaryColor: '#1c1917', sellValue: 15_000_000 },
  { id: 'ashglass', name: 'Ashglass', worldId: 'magma', chancePct: 24.0, rarity: 'uncommon', color: '#2dd4bf', secondaryColor: '#18181b', sellValue: 50_000_000 },
  { id: 'magmite', name: 'Magmite', worldId: 'magma', chancePct: 12.5, rarity: 'rare', color: '#ef4444', secondaryColor: '#1c1917', sellValue: 135_000_000 },
  { id: 'cindershard', name: 'Cindershard', worldId: 'magma', chancePct: 4.9, rarity: 'rare', color: '#fb7185', secondaryColor: '#1c1917', sellValue: 340_000_000 },
  { id: 'scorchgold', name: 'Scorchgold', worldId: 'magma', chancePct: 1.55, rarity: 'epic', color: '#facc15', secondaryColor: '#1c1917', sellValue: 880_000_000 },
  { id: 'pyroclast', name: 'Pyroclast', worldId: 'magma', chancePct: 0.45, rarity: 'legendary', color: '#fbbf24', secondaryColor: '#1c1917', sellValue: 2_400_000_000 },
  { id: 'moltenite', name: 'Moltenite', worldId: 'magma', chancePct: 0.08, rarity: 'rainbow', color: '#f97316', secondaryColor: '#1c1917', sellValue: 8_500_000_000 },
  { id: 'pyrecore', name: 'Pyrecore', worldId: 'magma', chancePct: 0.008, rarity: 'mythic', color: '#ec4899', secondaryColor: '#18181b', sellValue: 55_000_000_000 },

  // 4. Ancient Ruins (matching World 4 Index)
  { id: 'runestone', name: 'Runestone', worldId: 'ruins', chancePct: 58.485, rarity: 'common', color: '#2dd4bf', secondaryColor: '#334155', sellValue: 15_000_000_000 },
  { id: 'dustglyph', name: 'Dustglyph', worldId: 'ruins', chancePct: 24.0, rarity: 'uncommon', color: '#eab308', secondaryColor: '#57534e', sellValue: 50_000_000_000 },
  { id: 'relicore', name: 'Relicore', worldId: 'ruins', chancePct: 11.5, rarity: 'rare', color: '#22d3ee', secondaryColor: '#1e293b', sellValue: 135_000_000_000 },
  { id: 'sanctite', name: 'Sanctite', worldId: 'ruins', chancePct: 4.3, rarity: 'rare', color: '#a5f3fc', secondaryColor: '#365314', sellValue: 340_000_000_000 },
  { id: 'gildium', name: 'Gildium', worldId: 'ruins', chancePct: 1.3, rarity: 'epic', color: '#facc15', secondaryColor: '#3f6212', sellValue: 880_000_000_000 },
  { id: 'oathstone', name: 'Oathstone', worldId: 'ruins', chancePct: 0.35, rarity: 'legendary', color: '#06b6d4', secondaryColor: '#1e293b', sellValue: 2_400_000_000_000 },
  { id: 'idolshard', name: 'Idolshard', worldId: 'ruins', chancePct: 0.06, rarity: 'rainbow', color: '#4ade80', secondaryColor: '#3f6212', sellValue: 8_500_000_000_000 },
  { id: 'immortite', name: 'Immortite', worldId: 'ruins', chancePct: 0.005, rarity: 'mythic', color: '#ec4899', secondaryColor: '#1e293b', sellValue: 55_000_000_000_000 },

  // 5. Voidreach (matching World 5 Index)
  { id: 'voidshard', name: 'Voidshard', worldId: 'astral', chancePct: 60.297, rarity: 'common', color: '#a855f7', secondaryColor: '#1e1b4b', sellValue: 15_000_000_000_000 },
  { id: 'gloomite', name: 'Gloomite', worldId: 'astral', chancePct: 23.5, rarity: 'uncommon', color: '#4f46e5', secondaryColor: '#0f172a', sellValue: 50_000_000_000_000 },
  { id: 'nullite', name: 'Nullite', worldId: 'astral', chancePct: 11.0, rarity: 'rare', color: '#9333ea', secondaryColor: '#09090b', sellValue: 135_000_000_000_000 },
  { id: 'riftglass', name: 'Riftglass', worldId: 'astral', chancePct: 3.8, rarity: 'rare', color: '#22d3ee', secondaryColor: '#0f172a', sellValue: 340_000_000_000_000 },
  { id: 'starcore', name: 'Starcore', worldId: 'astral', chancePct: 1.08, rarity: 'epic', color: '#facc15', secondaryColor: '#1e1b4b', sellValue: 880_000_000_000_000 },
  { id: 'cosmite', name: 'Cosmite', worldId: 'astral', chancePct: 0.275, rarity: 'legendary', color: '#ec4899', secondaryColor: '#1e1b4b', sellValue: 2_400_000_000_000_000 },
  { id: 'singularite', name: 'Singularite', worldId: 'astral', chancePct: 0.045, rarity: 'rainbow', color: '#38bdf8', secondaryColor: '#09090b', sellValue: 8_500_000_000_000_000 },
  { id: 'duskcrown', name: 'Duskcrown', worldId: 'astral', chancePct: 0.003, rarity: 'mythic', color: '#ec4899', secondaryColor: '#09090b', sellValue: 55_000_000_000_000_000 },

  // 6. Starwell (matching World 6 Index)
  { id: 'cloudgrit', name: 'Cloudgrit', worldId: 'starwell', chancePct: 62.248, rarity: 'common', color: '#7dd3fc', secondaryColor: '#334155', sellValue: 15_000_000_000_000_000 },
  { id: 'skyshale', name: 'Skyshale', worldId: 'starwell', chancePct: 23.0, rarity: 'uncommon', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 50_000_000_000_000_000 },
  { id: 'sunvein', name: 'Sunvein', worldId: 'starwell', chancePct: 10.2, rarity: 'rare', color: '#facc15', secondaryColor: '#1e293b', sellValue: 135_000_000_000_000_000 },
  { id: 'gleamstone', name: 'Gleamstone', worldId: 'starwell', chancePct: 3.4, rarity: 'rare', color: '#a5f3fc', secondaryColor: '#334155', sellValue: 340_000_000_000_000_000 },
  { id: 'aurorine', name: 'Aurorine', worldId: 'starwell', chancePct: 0.9, rarity: 'epic', color: '#22d3ee', secondaryColor: '#a855f7', sellValue: 880_000_000_000_000_000 },
  { id: 'zenithite', name: 'Zenithite', worldId: 'starwell', chancePct: 0.215, rarity: 'legendary', color: '#0ea5e9', secondaryColor: '#09090b', sellValue: 2_400_000_000_000_000_000 },
  { id: 'caelite', name: 'Caelite', worldId: 'starwell', chancePct: 0.035, rarity: 'rainbow', color: '#38bdf8', secondaryColor: '#f472b6', sellValue: 8_500_000_000_000_000_000 },
  { id: 'dawncrown', name: 'Dawncrown', worldId: 'starwell', chancePct: 0.002, rarity: 'mythic', color: '#fbbf24', secondaryColor: '#ec4899', sellValue: 55_000_000_000_000_000_000 },

  // 7. Abyssal Biolume (World 7 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'trenchslate', name: 'Trenchslate', worldId: 'abyssal', chancePct: 82.6185, rarity: 'legendary', color: '#2dd4bf', secondaryColor: '#042f2e', sellValue: 35_000_000_000_000_000_000 },
  { id: 'prismarine', name: 'Prismarine', worldId: 'abyssal', chancePct: 15.5, rarity: 'rainbow', color: '#5eead4', secondaryColor: '#0f172a', sellValue: 110_000_000_000_000_000_000 },
  { id: 'pelagium', name: 'Pelagium', worldId: 'abyssal', chancePct: 1.8, rarity: 'mythic', color: '#fb7185', secondaryColor: '#1e1b4b', sellValue: 380_000_000_000_000_000_000 },
  { id: 'abyssalite', name: 'Abyssalite', worldId: 'abyssal', chancePct: 0.08, rarity: 'exotic', color: '#14b8a6', secondaryColor: '#312e81', sellValue: 1_800_000_000_000_000_000_000 },
  { id: 'leviapearl', name: 'Leviapearl', worldId: 'abyssal', chancePct: 0.0015, rarity: 'secret', color: '#f43f5e', secondaryColor: '#0f172a', sellValue: 14_000_000_000_000_000_000_000 },

  // 8. Chrono Nexus (World 8 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'mithrilite', name: 'Mithrilite', worldId: 'chrono', chancePct: 84.849, rarity: 'legendary', color: '#93c5fd', secondaryColor: '#451a03', sellValue: 35_000_000_000_000_000_000_000 },
  { id: 'orichalcite', name: 'Orichalcite', worldId: 'chrono', chancePct: 13.8, rarity: 'rainbow', color: '#fb923c', secondaryColor: '#1e1b4b', sellValue: 110_000_000_000_000_000_000_000 },
  { id: 'adamantite', name: 'Adamantite', worldId: 'chrono', chancePct: 1.3, rarity: 'mythic', color: '#e11d48', secondaryColor: '#18181b', sellValue: 380_000_000_000_000_000_000_000 },
  { id: 'aetherium', name: 'Aetherium', worldId: 'chrono', chancePct: 0.05, rarity: 'exotic', color: '#2dd4bf', secondaryColor: '#0f172a', sellValue: 1_800_000_000_000_000_000_000_000 },
  { id: 'chronocrown', name: 'Chronocrown', worldId: 'chrono', chancePct: 0.001, rarity: 'secret', color: '#fbbf24', secondaryColor: '#09090b', sellValue: 14_000_000_000_000_000_000_000_000 },

  // 9. Solaris Sanctum (World 9 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'helioslate', name: 'Helioslate', worldId: 'solaris', chancePct: 86.7693, rarity: 'legendary', color: '#f59e0b', secondaryColor: '#451a03', sellValue: 35_000_000_000_000_000_000_000_000 },
  { id: 'solarprism', name: 'Solarprism', worldId: 'solaris', chancePct: 12.2, rarity: 'rainbow', color: '#fb7185', secondaryColor: '#fde047', sellValue: 110_000_000_000_000_000_000_000_000 },
  { id: 'coronite', name: 'Coronite', worldId: 'solaris', chancePct: 1.0, rarity: 'mythic', color: '#f97316', secondaryColor: '#3b0764', sellValue: 380_000_000_000_000_000_000_000_000 },
  { id: 'flareheart', name: 'Flareheart', worldId: 'solaris', chancePct: 0.03, rarity: 'exotic', color: '#f43f5e', secondaryColor: '#fef08a', sellValue: 1_800_000_000_000_000_000_000_000_000 },
  { id: 'solarcrown', name: 'Solarcrown', worldId: 'solaris', chancePct: 0.0007, rarity: 'secret', color: '#fde047', secondaryColor: '#be123c', sellValue: 14_000_000_000_000_000_000_000_000_000 },

  // 10. Elysium Core (World 10 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'pearlstone', name: 'Pearlstone', worldId: 'elysium', chancePct: 88.4295, rarity: 'legendary', color: '#e2e8f0', secondaryColor: '#312e81', sellValue: 35_000_000_000_000_000_000_000_000_000 },
  { id: 'auroraglass', name: 'Auroraglass', worldId: 'elysium', chancePct: 10.8, rarity: 'rainbow', color: '#22d3ee', secondaryColor: '#e879f9', sellValue: 110_000_000_000_000_000_000_000_000_000 },
  { id: 'seraphite', name: 'Seraphite', worldId: 'elysium', chancePct: 0.75, rarity: 'mythic', color: '#c084fc', secondaryColor: '#0f172a', sellValue: 380_000_000_000_000_000_000_000_000_000 },
  { id: 'elysianite', name: 'Elysianite', worldId: 'elysium', chancePct: 0.02, rarity: 'exotic', color: '#38bdf8', secondaryColor: '#f472b6', sellValue: 1_800_000_000_000_000_000_000_000_000_000 },
  { id: 'genesisheart', name: 'Genesisheart', worldId: 'elysium', chancePct: 0.0005, rarity: 'secret', color: '#f472b6', secondaryColor: '#fde047', sellValue: 14_000_000_000_000_000_000_000_000_000_000 },

  // 11. Nightmare Hollow (World 11 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'bramblethorn', name: 'Bramblethorn', worldId: 'nightmare', chancePct: 89.6846, rarity: 'legendary', color: '#dc2626', secondaryColor: '#2dd4bf', sellValue: 35_000_000_000_000_000_000_000_000_000_000 },
  { id: 'bloodmoonite', name: 'Bloodmoonite', worldId: 'nightmare', chancePct: 9.7, rarity: 'rainbow', color: '#f43f5e', secondaryColor: '#fef2f2', sellValue: 110_000_000_000_000_000_000_000_000_000_000 },
  { id: 'mawfang', name: 'Mawfang', worldId: 'nightmare', chancePct: 0.6, rarity: 'mythic', color: '#ef4444', secondaryColor: '#1e1b4b', sellValue: 380_000_000_000_000_000_000_000_000_000_000 },
  { id: 'oculite', name: 'Oculite', worldId: 'nightmare', chancePct: 0.015, rarity: 'exotic', color: '#94a3b8', secondaryColor: '#09090b', sellValue: 1_800_000_000_000_000_000_000_000_000_000_000 },
  { id: 'vortexspire', name: 'Vortexspire', worldId: 'nightmare', chancePct: 0.0004, rarity: 'secret', color: '#c084fc', secondaryColor: '#a855f7', sellValue: 14_000_000_000_000_000_000_000_000_000_000_000 },

  // 12. Eclipse Singularity (World 12 Index — 5 endgame ores climbing to Exotic & Secret)
  { id: 'azurespiral', name: 'Azurespiral', worldId: 'singularity', chancePct: 90.9097, rarity: 'legendary', color: '#38bdf8', secondaryColor: '#0f172a', sellValue: 35_000_000_000_000_000_000_000_000_000_000_000 },
  { id: 'crimsongaze', name: 'Crimsongaze', worldId: 'singularity', chancePct: 8.6, rarity: 'rainbow', color: '#fb7185', secondaryColor: '#c084fc', sellValue: 110_000_000_000_000_000_000_000_000_000_000_000 },
  { id: 'duallance', name: 'Duallance', worldId: 'singularity', chancePct: 0.48, rarity: 'mythic', color: '#3b82f6', secondaryColor: '#ef4444', sellValue: 380_000_000_000_000_000_000_000_000_000_000_000 },
  { id: 'eventhorizon', name: 'Eventhorizon', worldId: 'singularity', chancePct: 0.01, rarity: 'exotic', color: '#e2e8f0', secondaryColor: '#09090b', sellValue: 1_800_000_000_000_000_000_000_000_000_000_000_000 },
  { id: 'sovereigneclipse', name: 'Sovereigneclipse', worldId: 'singularity', chancePct: 0.0003, rarity: 'secret', color: '#ef4444', secondaryColor: '#09090b', sellValue: 14_000_000_000_000_000_000_000_000_000_000_000_000 },
] as const;

export interface WeatherOreDef extends OreDef {
  weatherId: WeatherId;
  meteorName: string;
}

export const WEATHER_ORES: readonly WeatherOreDef[] = [
  {
    id: 'stormwater-opal',
    name: 'Stormwater Opal',
    worldId: 'underground',
    weatherId: 'light_rain',
    meteorName: 'Stormwater Meteor',
    chancePct: 100,
    rarity: 'epic',
    color: '#38bdf8',
    secondaryColor: '#0284c7',
    sellValue: 12_000,
  },
  {
    id: 'permafrost-core',
    name: 'Permafrost Core',
    worldId: 'crystal',
    weatherId: 'snow_rain',
    meteorName: 'Permafrost Meteor',
    chancePct: 100,
    rarity: 'legendary',
    color: '#bae6fd',
    secondaryColor: '#0ea5e9',
    sellValue: 12_000_000,
  },
  {
    id: 'crimson-eclipse-shard',
    name: 'Crimson Eclipse Shard',
    worldId: 'magma',
    weatherId: 'bloodmoon',
    meteorName: 'Crimson Eclipse Meteor',
    chancePct: 100,
    rarity: 'rainbow',
    color: '#f43f5e',
    secondaryColor: '#7f1d1d',
    sellValue: 12_000_000_000,
  },
  {
    id: 'abyssal-singularity-ore',
    name: 'Abyssal Singularity Ore',
    worldId: 'astral',
    weatherId: 'void',
    meteorName: 'Abyssal Void Meteor',
    chancePct: 100,
    rarity: 'mythic',
    color: '#c084fc',
    secondaryColor: '#1e1b4b',
    sellValue: 12_000_000_000_000_000,
  },
  {
    id: 'astral-nova-fragment',
    name: 'Astral Nova Fragment',
    worldId: 'starwell',
    weatherId: 'celestial',
    meteorName: 'Astral Nova Meteor',
    chancePct: 100,
    rarity: 'secret',
    color: '#fde047',
    secondaryColor: '#38bdf8',
    sellValue: 12_000_000_000_000_000_000,
  },
] as const;

export const WEATHER_METEOR_CHIBIS: Record<
  WeatherId,
  readonly { chibiId: string; chancePct: number; rarity: ItemRarity }[]
> = {
  light_rain: [{ chibiId: 'stormwraith', chancePct: 6, rarity: 'exotic' }],
  snow_rain: [{ chibiId: 'frostblood', chancePct: 5, rarity: 'exotic' }],
  bloodmoon: [{ chibiId: 'glitch-monarch', chancePct: 3.5, rarity: 'secret' }],
  void: [{ chibiId: 'singularity', chancePct: 2.5, rarity: 'secret' }],
  celestial: [{ chibiId: 'eclipse-seraph', chancePct: 2, rarity: 'secret' }],
};

export const WEATHER_METEOR_DICE_CHANCE: Record<WeatherId, number> = {
  light_rain: 0.15,
  snow_rain: 0.22,
  bloodmoon: 0.35,
  void: 0.5,
  celestial: 0.75,
};

/** Per-world trigger multiplier applied to Chibi drop chance on ore break so higher Worlds are meaningfully rarer. */
export const WORLD_MINER_DROP_SCALE: Record<WorldId, number> = {
  underground: 1.0,
  crystal: 0.82,
  magma: 0.68,
  ruins: 0.56,
  astral: 0.46,
  starwell: 0.38,
  abyssal: 0.31,
  chrono: 0.25,
  solaris: 0.2,
  elysium: 0.16,
  nightmare: 0.13,
  singularity: 0.105,
};

export function getWorldMinerDropScale(worldId: WorldId): number {
  return WORLD_MINER_DROP_SCALE[worldId] ?? 1.0;
}

export const WORLD_MINERS: readonly WorldMinerEntry[] = [
  // 1. The Underground (5 miners)
  { chibiId: 'astral-recruit', worldId: 'underground', chancePct: 4.5, rarity: 'common' },
  { chibiId: 'solar-striker', worldId: 'underground', chancePct: 1.8, rarity: 'uncommon' },
  { chibiId: 'frost-vanguard', worldId: 'underground', chancePct: 0.55, rarity: 'rare' },
  { chibiId: 'tropic-blaze', worldId: 'underground', chancePct: 0.12, rarity: 'exotic' },
  { chibiId: 'cyber-ki-brawler', worldId: 'underground', chancePct: 0.025, rarity: 'secret' },

  // 2. Crystal Caves (5 miners)
  { chibiId: 'volt-kensei', worldId: 'crystal', chancePct: 3.6, rarity: 'uncommon' },
  { chibiId: 'pyre-kitsune', worldId: 'crystal', chancePct: 1.4, rarity: 'rare' },
  { chibiId: 'zephyr-esper', worldId: 'crystal', chancePct: 0.42, rarity: 'epic' },
  { chibiId: 'aqua-blitz', worldId: 'crystal', chancePct: 0.085, rarity: 'exotic' },
  { chibiId: 'glacier-tide', worldId: 'crystal', chancePct: 0.016, rarity: 'secret' },

  // 3. Magma Hollows (5 miners)
  { chibiId: 'mantis-monarch', worldId: 'magma', chancePct: 2.8, rarity: 'rare' },
  { chibiId: 'vortex-mimic', worldId: 'magma', chancePct: 1.05, rarity: 'epic' },
  { chibiId: 'vesper-ward', worldId: 'magma', chancePct: 0.31, rarity: 'legendary' },
  { chibiId: 'tidebound-corsair', worldId: 'magma', chancePct: 0.06, rarity: 'exotic' },
  { chibiId: 'chroma-quill', worldId: 'magma', chancePct: 0.011, rarity: 'secret' },

  // 4. Ancient Ruins (5 miners)
  { chibiId: 'tempest-drake', worldId: 'ruins', chancePct: 2.2, rarity: 'epic' },
  { chibiId: 'titan-dread', worldId: 'ruins', chancePct: 0.8, rarity: 'legendary' },
  { chibiId: 'seraph-paladin', worldId: 'ruins', chancePct: 0.23, rarity: 'mythic' },
  { chibiId: 'lotus-frost', worldId: 'ruins', chancePct: 0.042, rarity: 'exotic' },
  { chibiId: 'rime-duchess', worldId: 'ruins', chancePct: 0.0075, rarity: 'secret' },

  // 5. Voidreach (5 miners)
  { chibiId: 'nebula-archon', worldId: 'astral', chancePct: 1.7, rarity: 'legendary' },
  { chibiId: 'eclipse-warlord', worldId: 'astral', chancePct: 0.62, rarity: 'rainbow' },
  { chibiId: 'chrono-sovereign', worldId: 'astral', chancePct: 0.17, rarity: 'mythic' },
  { chibiId: 'zephyr-raven', worldId: 'astral', chancePct: 0.03, rarity: 'exotic' },
  { chibiId: 'nebula-hex', worldId: 'astral', chancePct: 0.005, rarity: 'secret' },

  // 6. Starwell (5 miners)
  { chibiId: 'draconic-blademaster', worldId: 'starwell', chancePct: 1.4, rarity: 'legendary' },
  { chibiId: 'aegis-wyrm', worldId: 'starwell', chancePct: 0.5, rarity: 'rainbow' },
  { chibiId: 'ashen-titan', worldId: 'starwell', chancePct: 0.135, rarity: 'mythic' },
  { chibiId: 'vesper-reaver', worldId: 'starwell', chancePct: 0.022, rarity: 'exotic' },
  { chibiId: 'null-prism', worldId: 'starwell', chancePct: 0.0035, rarity: 'secret' },

  // 7. Abyssal Biolume (5 miners)
  { chibiId: 'scroll-wraith', worldId: 'abyssal', chancePct: 1.15, rarity: 'legendary' },
  { chibiId: 'abyssal-fiend', worldId: 'abyssal', chancePct: 0.4, rarity: 'rainbow' },
  { chibiId: 'mirror-phantasm', worldId: 'abyssal', chancePct: 0.105, rarity: 'mythic' },
  { chibiId: 'abyssal-gaze', worldId: 'abyssal', chancePct: 0.016, rarity: 'exotic' },
  { chibiId: 'trench-oracle', worldId: 'abyssal', chancePct: 0.0024, rarity: 'secret' },

  // 8. Chrono Nexus (5 miners)
  { chibiId: 'glitch-warden', worldId: 'chrono', chancePct: 0.95, rarity: 'legendary' },
  { chibiId: 'scarlet-dealer', worldId: 'chrono', chancePct: 0.32, rarity: 'rainbow' },
  { chibiId: 'chain-arbiter', worldId: 'chrono', chancePct: 0.082, rarity: 'mythic' },
  { chibiId: 'crimson-king', worldId: 'chrono', chancePct: 0.012, rarity: 'exotic' },
  { chibiId: 'chrono-seraph', worldId: 'chrono', chancePct: 0.0017, rarity: 'secret' },

  // 9. Solaris Sanctum (5 miners)
  { chibiId: 'crimson-inkweaver', worldId: 'solaris', chancePct: 0.78, rarity: 'legendary' },
  { chibiId: 'ocular-maw', worldId: 'solaris', chancePct: 0.26, rarity: 'rainbow' },
  { chibiId: 'crimson-adjudicator', worldId: 'solaris', chancePct: 0.065, rarity: 'mythic' },
  { chibiId: 'gilded-chainking', worldId: 'solaris', chancePct: 0.009, rarity: 'exotic' },
  { chibiId: 'solaris-queen', worldId: 'solaris', chancePct: 0.0012, rarity: 'secret' },

  // 10. Elysium Core (5 miners)
  { chibiId: 'verdant-runeborn', worldId: 'elysium', chancePct: 0.65, rarity: 'legendary' },
  { chibiId: 'pale-spiritcaller', worldId: 'elysium', chancePct: 0.21, rarity: 'rainbow' },
  { chibiId: 'spiral-nightmare', worldId: 'elysium', chancePct: 0.052, rarity: 'mythic' },
  { chibiId: 'amethyst-dracomech', worldId: 'elysium', chancePct: 0.007, rarity: 'exotic' },
  { chibiId: 'elysian-seraph', worldId: 'elysium', chancePct: 0.0009, rarity: 'secret' },

  // 11. Nightmare Hollow (5 miners)
  { chibiId: 'bramble-cat', worldId: 'nightmare', chancePct: 0.55, rarity: 'legendary' },
  { chibiId: 'cleaver-bunny', worldId: 'nightmare', chancePct: 0.17, rarity: 'rainbow' },
  { chibiId: 'maw-devourer', worldId: 'nightmare', chancePct: 0.041, rarity: 'mythic' },
  { chibiId: 'abyss-watcher', worldId: 'nightmare', chancePct: 0.0052, rarity: 'exotic' },
  { chibiId: 'spiral-ringmaster', worldId: 'nightmare', chancePct: 0.00065, rarity: 'secret' },

  // 12. Eclipse Singularity (5 miners)
  { chibiId: 'azure-esper', worldId: 'singularity', chancePct: 0.46, rarity: 'legendary' },
  { chibiId: 'crimson-esper', worldId: 'singularity', chancePct: 0.14, rarity: 'rainbow' },
  { chibiId: 'fate-duelist', worldId: 'singularity', chancePct: 0.032, rarity: 'mythic' },
  { chibiId: 'horizon-walker', worldId: 'singularity', chancePct: 0.0038, rarity: 'exotic' },
  { chibiId: 'eclipse-monarch', worldId: 'singularity', chancePct: 0.00048, rarity: 'secret' },
] as const;

syncTwinCatalogDpsFromAnchor();

export const OTHER_ITEMS: readonly OtherItemDef[] = [] as const;

export const PICKAXES: readonly PickaxeDef[] = [
  { id: 'starter', name: 'Chrysoberyl', worldId: 'underground', dmgMult: 1, cost: 0, rarity: 'common', color: '#94a3b8' },
  { id: 'sunwheel', name: 'Sunwheel', worldId: 'underground', dmgMult: 2.0, cost: 900, rarity: 'legendary', color: '#f59e0b' },
  { id: 'zircon', name: 'Zircon', worldId: 'underground', dmgMult: 3.8, cost: 16_000, rarity: 'rainbow', color: '#38bdf8' },
  { id: 'thundercoil', name: 'Thundercoil', worldId: 'underground', dmgMult: 7.0, cost: 250_000, rarity: 'uncommon', color: '#22c55e' },
  { id: 'rhodolite', name: 'Rhodolite', worldId: 'crystal', dmgMult: 14.0, cost: 18_000_000, rarity: 'rare', color: '#818cf8' },
  { id: 'heartpiercer', name: 'Heartpiercer', worldId: 'crystal', dmgMult: 30.0, cost: 350_000_000, rarity: 'mythic', color: '#ec4899' },
  { id: 'anvilheart', name: 'Anvilheart', worldId: 'magma', dmgMult: 65.0, cost: 45_000_000_000, rarity: 'rainbow', color: '#f97316' },
  { id: 'cinderforge', name: 'Cinderforge', worldId: 'magma', dmgMult: 140.0, cost: 850_000_000_000, rarity: 'legendary', color: '#fb7185' },
  { id: 'runebreaker', name: 'Runebreaker', worldId: 'ruins', dmgMult: 310.0, cost: 120_000_000_000_000, rarity: 'epic', color: '#2dd4bf' },
  { id: 'voidcleaver', name: 'Voidcleaver', worldId: 'astral', dmgMult: 700.0, cost: 300_000_000_000_000_000, rarity: 'exotic', color: '#c084fc' },
  { id: 'astralsiphon', name: 'Astralsiphon', worldId: 'starwell', dmgMult: 1_600.0, cost: 650_000_000_000_000_000_000, rarity: 'mythic', color: '#38bdf8' },
  { id: 'starwellcrown', name: 'Starwell Crown', worldId: 'starwell', dmgMult: 3_800.0, cost: 14_000_000_000_000_000_000_000, rarity: 'secret', color: '#fde047' },
  { id: 'leviathanfang', name: 'Leviathan Fang', worldId: 'abyssal', dmgMult: 8_800.0, cost: 1_800_000_000_000_000_000_000_000, rarity: 'exotic', color: '#14b8a6' },
  { id: 'chronoeternity', name: 'Chrono Eternity', worldId: 'chrono', dmgMult: 20_000.0, cost: 4_500_000_000_000_000_000_000_000_000, rarity: 'secret', color: '#fbbf24' },
  { id: 'solarisflare', name: 'Solaris Flare', worldId: 'solaris', dmgMult: 45_000.0, cost: 12_000_000_000_000_000_000_000_000_000_000, rarity: 'exotic', color: '#fb7185' },
  { id: 'elysiumcrest', name: 'Elysium Crest', worldId: 'elysium', dmgMult: 100_000.0, cost: 28_000_000_000_000_000_000_000_000_000_000_000, rarity: 'secret', color: '#c084fc' },
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
  { id: 'blazing', name: 'Blazing', dmgMult: 1.25, oreDropPct: 0.05, sellValuePct: 0.05, miningSpeedPct: 0.05, chancePct: 44.14, rarity: 'common', color: '#f97316' },
  { id: 'glacial', name: 'Glacial', dmgMult: 1.45, oreDropPct: 0.1, sellValuePct: 0.1, miningSpeedPct: 0.08, chancePct: 27.0, rarity: 'uncommon', color: '#38bdf8' },
  { id: 'quaking', name: 'Quaking', dmgMult: 1.7, oreDropPct: 0.15, sellValuePct: 0.18, miningSpeedPct: 0.12, chancePct: 15.0, rarity: 'rare', color: '#b45309' },
  { id: 'surging', name: 'Surging', dmgMult: 2.0, oreDropPct: 0.22, sellValuePct: 0.25, miningSpeedPct: 0.18, chancePct: 8.0, rarity: 'rare', color: '#22d3ee' },
  { id: 'radiant', name: 'Radiant', dmgMult: 2.5, oreDropPct: 0.3, sellValuePct: 0.35, miningSpeedPct: 0.25, chancePct: 3.0, rarity: 'legendary', color: '#facc15' },
  { id: 'thundering', name: 'Thundering', dmgMult: 3.2, oreDropPct: 0.4, sellValuePct: 0.45, miningSpeedPct: 0.32, chancePct: 2.0, rarity: 'epic', color: '#a855f7' },
  { id: 'cataclysmic', name: 'Cataclysmic', dmgMult: 4.2, oreDropPct: 0.55, sellValuePct: 0.65, miningSpeedPct: 0.42, chancePct: 0.6, rarity: 'legendary', color: '#f59e0b' },
  { id: 'sundering', name: 'Sundering', dmgMult: 5.8, oreDropPct: 0.75, sellValuePct: 0.9, miningSpeedPct: 0.55, chancePct: 0.2, rarity: 'mythic', color: '#ef4444' },
  { id: 'timeless', name: 'Timeless', dmgMult: 8.5, oreDropPct: 0.95, sellValuePct: 1.2, miningSpeedPct: 0.68, chancePct: 0.05, rarity: 'mythic', color: '#f8fafc' },
  { id: 'spellbound', name: 'Spellbound', dmgMult: 14.0, oreDropPct: 1.2, sellValuePct: 1.5, miningSpeedPct: 0.85, chancePct: 0.01, rarity: 'rainbow', color: '#e879f9' },
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
  cinderforge: 1,
  runebreaker: 1,
  voidcleaver: 1,
  astralsiphon: 1,
  starwellcrown: 1,
  leviathanfang: 1,
  chronoeternity: 1,
  solarisflare: 1,
  elysiumcrest: 1,
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
    effectText: '+50% Ore Output',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 500,
    rarity: 'common',
    color: '#ea580c',
    shape: 'round',
  },
  {
    id: 'ore-elixir-2',
    name: 'Ore Elixir II',
    effectText: '+125% Ore Output',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 1250,
    rarity: 'legendary',
    color: '#facc15',
    shape: 'jar',
  },
  {
    id: 'regrowth-potion',
    name: 'Regrowth Potion',
    effectText: '+500% Rock Respawn Speed',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 1500,
    rarity: 'uncommon',
    color: '#22c55e',
    shape: 'vial',
  },
  {
    id: 'unearth-elixir',
    name: 'Unearth Elixir',
    effectText: '+50% Find Chance',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 1500,
    rarity: 'rare',
    color: '#06b6d4',
    shape: 'prism',
  },
  {
    id: 'character-luck-potion',
    name: 'Character Luck Potion',
    effectText: '+250% Character Luck',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 2500,
    rarity: 'uncommon',
    color: '#16a34a',
    shape: 'clover',
  },
  {
    id: 'ore-luck-potion',
    name: 'Ore Luck Potion',
    effectText: '+500% Ore Luck',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 2500,
    rarity: 'epic',
    color: '#f59e0b',
    shape: 'star',
  },
  {
    id: 'ore-elixir-3',
    name: 'Ore Elixir III',
    effectText: '+250% Ore Output',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 2500,
    rarity: 'rare',
    color: '#38bdf8',
    shape: 'crystal',
  },
  {
    id: 'mutation-luck-1',
    name: 'Mutation Luck Potion I',
    effectText: '+500% Mutation Luck',
    durationLabel: '(1 min)',
    durationSec: 60,
    gemCost: 3000,
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
  return ORES.find((o) => o.id === id) ?? WEATHER_ORES.find((o) => o.id === id);
}

export function getWeatherOreByWeatherId(weatherId: WeatherId): WeatherOreDef {
  return WEATHER_ORES.find((o) => o.weatherId === weatherId) ?? WEATHER_ORES[0];
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

/** Returns the lowest-baseDps miner ID belonging to a given World. */
export function getWorldStarterChibiId(worldId: WorldId): string | null {
  const miners = getMinersByWorld(worldId);
  if (miners.length === 0) return null;
  let best = miners[0];
  for (let i = 1; i < miners.length; i++) {
    if (miners[i].chibi.baseDps < best.chibi.baseDps) {
      best = miners[i];
    }
  }
  return best.entry.chibiId;
}

export function getMinerRarity(chibiId: string): ItemRarity {
  const entry = WORLD_MINERS.find((m) => m.chibiId === chibiId);
  if (entry) return entry.rarity;
  return CHIBI_CATALOG.find((c) => c.id === chibiId)?.rarity ?? 'common';
}

export function getWeatherLimitedMiners(): Array<{
  weatherId: WeatherId;
  chibi: ChibiDef;
  chancePct: number;
  rarity: ItemRarity;
}> {
  const out: Array<{
    weatherId: WeatherId;
    chibi: ChibiDef;
    chancePct: number;
    rarity: ItemRarity;
  }> = [];
  for (const [weatherId, entries] of Object.entries(WEATHER_METEOR_CHIBIS) as Array<
    [WeatherId, readonly { chibiId: string; chancePct: number; rarity: ItemRarity }[]]
  >) {
    for (const entry of entries) {
      const chibi = CHIBI_CATALOG.find((c) => c.id === entry.chibiId);
      if (chibi) {
        out.push({ weatherId, chibi, chancePct: entry.chancePct, rarity: entry.rarity });
      }
    }
  }
  return out;
}

export function getMinerWorldId(chibiId: string): WorldId | null {
  const entry = WORLD_MINERS.find((m) => m.chibiId === chibiId);
  return entry?.worldId ?? null;
}

export const CHIBI_MAX_STARS = 5;

export interface ChibiStarTierDef {
  star: number;
  dupCost: number;
  dmgMult: number;
  miningSpeedBonus: number;
  dropBonusPct: number;
}

export const CHIBI_STAR_TIERS: readonly ChibiStarTierDef[] = [
  { star: 0, dupCost: 0, dmgMult: 1.0, miningSpeedBonus: 0, dropBonusPct: 0 },
  { star: 1, dupCost: 2, dmgMult: 1.25, miningSpeedBonus: 0, dropBonusPct: 0 },
  { star: 2, dupCost: 4, dmgMult: 1.6, miningSpeedBonus: 0, dropBonusPct: 0 },
  { star: 3, dupCost: 7, dmgMult: 2.1, miningSpeedBonus: 0.05, dropBonusPct: 0 },
  { star: 4, dupCost: 12, dmgMult: 2.8, miningSpeedBonus: 0.1, dropBonusPct: 0 },
  { star: 5, dupCost: 20, dmgMult: 3.8, miningSpeedBonus: 0.15, dropBonusPct: 0.1 },
];

export const STAR_DUP_COSTS_BY_RARITY: Readonly<Record<ItemRarity, readonly number[]>> = {
  common: [0, 2, 4, 7, 12, 20],
  uncommon: [0, 2, 4, 7, 12, 20],
  rare: [0, 2, 4, 7, 12, 20],
  epic: [0, 2, 4, 7, 12, 20],
  legendary: [0, 2, 3, 5, 8, 12],
  rainbow: [0, 2, 3, 5, 8, 12],
  mythic: [0, 1, 2, 4, 6, 9],
  exotic: [0, 1, 1, 2, 3, 5],
  secret: [0, 1, 1, 2, 3, 5],
  fusion: [0, 1, 1, 1, 2, 3],
  twin: [0, 1, 1, 1, 2, 3],
  anomaly: [0, 1, 1, 1, 2, 3],
  limited: [0, 1, 1, 1, 2, 3],
  omega: [0, 0, 0, 0, 0, 0],
};

export function getChibiStarTier(star: number): ChibiStarTierDef {
  const clamped = Math.max(0, Math.min(CHIBI_MAX_STARS, Math.floor(star)));
  return CHIBI_STAR_TIERS[clamped] ?? CHIBI_STAR_TIERS[0];
}

export function getNextChibiStarTier(star: number): ChibiStarTierDef | null {
  const clamped = Math.max(0, Math.floor(star));
  if (clamped >= CHIBI_MAX_STARS) return null;
  return CHIBI_STAR_TIERS[clamped + 1] ?? null;
}

/** Returns the next Star-Up tier with rarity-balanced duplicate cost (`omega` awakens via Boss Cores instead). */
export function getNextChibiStarTierFor(chibiId: string, star: number): ChibiStarTierDef | null {
  const rarity = getMinerRarity(chibiId);
  if (rarity === 'omega') return null;
  const base = getNextChibiStarTier(star);
  if (!base) return null;
  const table = STAR_DUP_COSTS_BY_RARITY[rarity];
  const dupCost = table?.[base.star] ?? base.dupCost;
  return { ...base, dupCost };
}

export interface WorldResonanceTierDef {
  minCount: number;
  dmgBonusPct: number;
  oreDropBonusPct: number;
  sellBonusPct: number;
  gemBonusPct: number;
  label: string;
}

export const WORLD_RESONANCE_TIERS: readonly WorldResonanceTierDef[] = [
  { minCount: 2, dmgBonusPct: 0.15, oreDropBonusPct: 0.05, sellBonusPct: 0.08, gemBonusPct: 0, label: 'Duo Resonance' },
  { minCount: 3, dmgBonusPct: 0.3, oreDropBonusPct: 0.1, sellBonusPct: 0.18, gemBonusPct: 0, label: 'Trio Resonance' },
  { minCount: 4, dmgBonusPct: 0.45, oreDropBonusPct: 0.18, sellBonusPct: 0.28, gemBonusPct: 0.08, label: 'Quad Resonance' },
  { minCount: 5, dmgBonusPct: 0.6, oreDropBonusPct: 0.25, sellBonusPct: 0.4, gemBonusPct: 0.15, label: 'Full World Roster' },
];

export const WORLD_RESONANCE_WORLD_SCALES: Record<WorldId, number> = {
  underground: 1.0,
  crystal: 1.2,
  magma: 1.4,
  ruins: 1.6,
  astral: 1.8,
  starwell: 2.0,
  abyssal: 2.25,
  chrono: 2.5,
  solaris: 2.8,
  elysium: 3.2,
  nightmare: 3.6,
  singularity: 4.0,
};

export function getWorldResonanceScale(worldId: WorldId): number {
  return WORLD_RESONANCE_WORLD_SCALES[worldId] ?? 1.0;
}

function scaleResonancePct(basePct: number, scale: number): number {
  return Math.round(basePct * scale * 100) / 100;
}

export interface WorldResonanceStatus {
  worldId: WorldId;
  worldName: string;
  count: number;
  worldScale: number;
  tier: WorldResonanceTierDef;
}

export function computeWorldResonances(plotChibiIds: Array<string | null>): WorldResonanceStatus[] {
  const counts = new Map<WorldId, number>();
  for (const id of plotChibiIds) {
    if (!id) continue;
    const wid = getMinerWorldId(id);
    if (!wid) continue;
    counts.set(wid, (counts.get(wid) ?? 0) + 1);
  }
  const active: WorldResonanceStatus[] = [];
  for (const world of WORLDS) {
    const count = counts.get(world.id) ?? 0;
    let bestTier: WorldResonanceTierDef | null = null;
    for (const tier of WORLD_RESONANCE_TIERS) {
      if (count >= tier.minCount) bestTier = tier;
    }
    if (bestTier) {
      const worldScale = getWorldResonanceScale(world.id);
      active.push({
        worldId: world.id,
        worldName: world.name,
        count,
        worldScale,
        tier: {
          ...bestTier,
          dmgBonusPct: scaleResonancePct(bestTier.dmgBonusPct, worldScale),
          oreDropBonusPct: scaleResonancePct(bestTier.oreDropBonusPct, worldScale),
          sellBonusPct: scaleResonancePct(bestTier.sellBonusPct, worldScale),
          gemBonusPct: scaleResonancePct(bestTier.gemBonusPct, worldScale),
        },
      });
    }
  }
  return active;
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
