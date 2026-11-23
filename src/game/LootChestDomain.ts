import { OreVariantKey } from '../game3d/MineWorldPalette';
import {
  getOreById,
  getWeatherOreByWeatherId,
  getWorldIndex,
  ItemRarity,
  OreDef,
  rollWorldMiner,
  rollWorldOre,
  WEATHER_METEOR_CHIBIS,
  WEATHER_METEOR_DICE_CHANCE,
  WeatherOreDef,
  WorldId,
} from './GameData';
import { getChibiById } from '../game3d/ChibiCatalog';
import { compactHotbarSlots } from './GameStateSave';
import { getGlobalGemGainBonus } from './TowerData';
import { getWeatherById, WeatherDef, WeatherId } from './WeatherData';

export interface LootChestContext {
  cash: number;
  gems: number;
  enchantDice: number;
  activeWorldId: WorldId;
  miners: Record<string, number>;
  ores: Record<string, number>;
  hotbar: (string | null)[];
  selectedHotbarSlot: number;
  chestMiners: Record<string, number>;
  chestOres: Record<string, number>;
  autoSell: boolean;
  autoSellRarities: Set<ItemRarity>;
  lockedOreIds: Set<string>;
  autoMeteor: boolean;
  discovered: Set<string>;
  towerBestFloor: number;
  getChestItemCount(): number;
  getMaxChestCapacity(): number;
  getTotalOreDropMult(): number;
  getOreLuckMult(): number;
  getCharacterLuckMult(): number;
  getFindChanceBonus(): number;
  getEffectiveOreSellValue(oreId: string): number;
  getActiveStarDropAndGemBonus(): { oreDropBonusPct: number; gemBonusPct: number };
  getWeatherGemDropMult(): number;
}

export interface MeteorBreakReward {
  weatherDef: WeatherDef;
  weatherOre: WeatherOreDef;
  weatherOreQty: number;
  chibiId: string | null;
  gemsAwarded: number;
  diceAwarded: number;
}

/** Counts total items currently stored in the Vault Chest across miners and ores. */
export function getChestItemCountDomain(
  ctx: Pick<LootChestContext, 'chestMiners' | 'chestOres'>
): number {
  let sum = 0;
  for (const v of Object.values(ctx.chestMiners)) sum += v;
  for (const v of Object.values(ctx.chestOres)) sum += v;
  return sum;
}

export function selectHotbarSlotDomain(
  ctx: Pick<LootChestContext, 'selectedHotbarSlot'>,
  slot: number,
  emit: () => void = () => {}
): void {
  if (slot < 0 || slot >= 9) return;
  ctx.selectedHotbarSlot = ctx.selectedHotbarSlot === slot ? -1 : slot;
  emit();
}

export function clearHotbarSelectionDomain(
  ctx: Pick<LootChestContext, 'selectedHotbarSlot'>,
  emit: () => void = () => {}
): void {
  if (ctx.selectedHotbarSlot === -1) return;
  ctx.selectedHotbarSlot = -1;
  emit();
}

export function swapHotbarSlotsDomain(
  ctx: Pick<LootChestContext, 'hotbar' | 'selectedHotbarSlot'>,
  fromIndex: number,
  toIndex: number,
  emit: () => void = () => {}
): boolean {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex < 0 || fromIndex >= 9 || toIndex < 0 || toIndex >= 9) return false;
  if (fromIndex === toIndex) return false;
  const fromItem = ctx.hotbar[fromIndex];
  if (!fromItem) return false;

  const toItem = ctx.hotbar[toIndex];
  ctx.hotbar[fromIndex] = toItem;
  ctx.hotbar[toIndex] = fromItem;

  if (ctx.selectedHotbarSlot === fromIndex) {
    ctx.selectedHotbarSlot = toIndex;
  } else if (ctx.selectedHotbarSlot === toIndex) {
    ctx.selectedHotbarSlot = fromIndex;
  }

  emit();
  return true;
}

export function addItemToHotbarIfSpaceDomain(
  ctx: Pick<LootChestContext, 'hotbar'>,
  itemId: string
): void {
  if (!getChibiById(itemId)) return;
  if (ctx.hotbar.includes(itemId)) return;
  const emptyIdx = ctx.hotbar.indexOf(null);
  if (emptyIdx !== -1) {
    ctx.hotbar[emptyIdx] = itemId;
  }
}

export function removeFromHotbarDomain(
  ctx: Pick<LootChestContext, 'hotbar' | 'selectedHotbarSlot'>,
  itemId: string
): void {
  let changed = false;
  for (let i = 0; i < ctx.hotbar.length; i++) {
    if (ctx.hotbar[i] === itemId) {
      ctx.hotbar[i] = null;
      changed = true;
    }
  }
  if (changed) compactHotbarSlots(ctx);
}

export function toggleHotbarItemDomain(
  ctx: Pick<LootChestContext, 'hotbar' | 'selectedHotbarSlot'>,
  itemId: string,
  emit: () => void = () => {}
): void {
  const existingIdx = ctx.hotbar.indexOf(itemId);
  if (existingIdx !== -1) {
    ctx.hotbar[existingIdx] = null;
    compactHotbarSlots(ctx);
    emit();
    return;
  }
  if (!getChibiById(itemId)) return;

  const emptyIdx = ctx.hotbar.indexOf(null);
  if (emptyIdx !== -1) {
    ctx.hotbar[emptyIdx] = itemId;
    emit();
  } else if (ctx.selectedHotbarSlot >= 0 && ctx.selectedHotbarSlot < 9) {
    ctx.hotbar[ctx.selectedHotbarSlot] = itemId;
    emit();
  }
}

export function isOreLockedDomain(
  ctx: Pick<LootChestContext, 'lockedOreIds'>,
  oreId: string
): boolean {
  return ctx.lockedOreIds.has(oreId);
}

export function toggleOreLockDomain(
  ctx: Pick<LootChestContext, 'lockedOreIds'>,
  oreId: string,
  emit: () => void = () => {}
): boolean {
  if (ctx.lockedOreIds.has(oreId)) {
    ctx.lockedOreIds.delete(oreId);
  } else {
    ctx.lockedOreIds.add(oreId);
  }
  emit();
  return ctx.lockedOreIds.has(oreId);
}

export function shouldAutoSellOreDomain(
  ctx: Pick<LootChestContext, 'lockedOreIds' | 'autoSell' | 'autoSellRarities'>,
  oreId: string
): boolean {
  if (ctx.lockedOreIds.has(oreId)) return false;
  if (ctx.autoSell) return true;
  const ore = getOreById(oreId);
  return ore ? ctx.autoSellRarities.has(ore.rarity) : false;
}

function sweepMatchingChestOres(
  ctx: Pick<
    LootChestContext,
    'chestOres' | 'lockedOreIds' | 'discovered' | 'getEffectiveOreSellValue'
  >,
  predicate: (ore: OreDef) => boolean
): { baseEarned: number; soldAny: boolean } {
  const remaining: Record<string, number> = {};
  let baseEarned = 0;
  let soldAny = false;
  for (const [id, qty] of Object.entries(ctx.chestOres)) {
    if (qty <= 0) continue;
    if (ctx.lockedOreIds.has(id)) {
      remaining[id] = qty;
      continue;
    }
    const ore = getOreById(id);
    if (ore && predicate(ore)) {
      baseEarned += ctx.getEffectiveOreSellValue(ore.id) * qty;
      ctx.discovered.add(id);
      soldAny = true;
    } else {
      remaining[id] = qty;
    }
  }
  if (soldAny) {
    ctx.chestOres = remaining;
  }
  return { baseEarned, soldAny };
}

export function onOreBrokenDomain(
  ctx: LootChestContext,
  variantKey: OreVariantKey,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): void {
  // Rebalanced higher base rolls (2/4/6) to reward slower, full-animation mining strikes
  const baseRolls = variantKey === 'geode' ? 6 : variantKey === 'vein' ? 4 : 2;
  const outputMult = ctx.getTotalOreDropMult();
  const wholeRolls = Math.floor(baseRolls * outputMult);
  const frac = baseRolls * outputMult - wholeRolls;
  const oreRolls = wholeRolls + (frac > 0 && rng() < frac ? 1 : 0);

  const oreLuck = ctx.getOreLuckMult();
  const charLuck = ctx.getCharacterLuckMult();
  const findBonus = ctx.getFindChanceBonus();

  const capLeft = Math.max(0, ctx.getMaxChestCapacity() - ctx.getChestItemCount());
  let added = 0;

  for (let i = 0; i < oreRolls; i++) {
    const ore = rollWorldOre(ctx.activeWorldId, rng, oreLuck);
    ctx.discovered.add(ore.id);
    if (shouldAutoSellOreDomain(ctx, ore.id)) {
      ctx.cash += ctx.getEffectiveOreSellValue(ore.id);
    } else if (added < capLeft) {
      ctx.chestOres[ore.id] = (ctx.chestOres[ore.id] || 0) + 1;
      added++;
    }
  }

  // Balanced chance to drop a Miner from Rock / Vein / Geode
  const minerChance =
    (variantKey === 'geode' ? 0.18 : variantKey === 'vein' ? 0.07 : 0.025) * (1 + findBonus);
  if (rng() < minerChance && added < capLeft) {
    const miner = rollWorldMiner(ctx.activeWorldId, rng, charLuck);
    if (miner) {
      ctx.discovered.add(miner.id);
      ctx.chestMiners[miner.id] = (ctx.chestMiners[miner.id] || 0) + 1;
      added++;
    }
  }

  if (variantKey === 'geode' || variantKey === 'vein' || rng() < 0.28 + findBonus * 0.5) {
    const baseGem = variantKey === 'geode' ? 4 : variantKey === 'vein' ? 2 : 1;
    const { gemBonusPct } = ctx.getActiveStarDropAndGemBonus();
    const mult = (1 + getGlobalGemGainBonus(ctx.towerBestFloor) + gemBonusPct) * ctx.getWeatherGemDropMult();
    ctx.gems += Math.max(baseGem, Math.round(baseGem * mult));
  }

  emit();
}

export function onMeteorBrokenDomain(
  ctx: LootChestContext,
  weatherId: WeatherId,
  rng: () => number = Math.random,
  emit: () => void = () => {}
): MeteorBreakReward {
  const weatherDef = getWeatherById(weatherId);
  const weatherOre = getWeatherOreByWeatherId(weatherId);
  const qtyBonus =
    weatherId === 'celestial' ? 3 : weatherId === 'void' || weatherId === 'bloodmoon' ? 2 : 1;
  const weatherOreQty = Math.max(1, qtyBonus + (rng() < 0.35 ? 1 : 0));

  const capLeft = Math.max(0, ctx.getMaxChestCapacity() - ctx.getChestItemCount());
  let added = 0;

  ctx.discovered.add(weatherOre.id);
  if (added + weatherOreQty <= capLeft) {
    ctx.chestOres[weatherOre.id] = (ctx.chestOres[weatherOre.id] || 0) + weatherOreQty;
    added += weatherOreQty;
  } else {
    ctx.ores[weatherOre.id] = (ctx.ores[weatherOre.id] || 0) + weatherOreQty;
  }

  // Bonus world ore burst
  const oreLuck = ctx.getOreLuckMult() * 1.6;
  for (let i = 0; i < 4; i++) {
    const ore = rollWorldOre(ctx.activeWorldId, rng, oreLuck);
    ctx.discovered.add(ore.id);
    if (shouldAutoSellOreDomain(ctx, ore.id)) {
      ctx.cash += ctx.getEffectiveOreSellValue(ore.id);
    } else if (added < capLeft) {
      ctx.chestOres[ore.id] = (ctx.chestOres[ore.id] || 0) + 1;
      added++;
    }
  }

  // Limited Chibi pool (if populated) or rare active-world Chibi drop
  let droppedChibiId: string | null = null;
  const limitedPool = WEATHER_METEOR_CHIBIS[weatherId] ?? [];
  if (limitedPool.length > 0) {
    const totalPct = limitedPool.reduce((acc, e) => acc + Math.max(0, e.chancePct), 0);
    let roll = rng() * Math.max(100, totalPct);
    for (const entry of limitedPool) {
      roll -= Math.max(0, entry.chancePct);
      if (roll <= 0) {
        droppedChibiId = entry.chibiId;
        break;
      }
    }
  }
  if (!droppedChibiId && rng() < 0.65) {
    const miner = rollWorldMiner(ctx.activeWorldId, rng, ctx.getCharacterLuckMult() * 2.5);
    if (miner) droppedChibiId = miner.id;
  }
  if (droppedChibiId) {
    ctx.discovered.add(droppedChibiId);
    if (added < capLeft) {
      ctx.chestMiners[droppedChibiId] = (ctx.chestMiners[droppedChibiId] || 0) + 1;
    } else {
      ctx.miners[droppedChibiId] = (ctx.miners[droppedChibiId] || 0) + 1;
      addItemToHotbarIfSpaceDomain(ctx, droppedChibiId);
    }
  }

  const worldIdx = Math.max(0, getWorldIndex(ctx.activeWorldId));
  const baseGems = 20 + worldIdx * 12;
  const { gemBonusPct } = ctx.getActiveStarDropAndGemBonus();
  const gemMult = (1 + getGlobalGemGainBonus(ctx.towerBestFloor) + gemBonusPct) * weatherDef.gemDropMult;
  const gemsAwarded = Math.max(10, Math.round(baseGems * gemMult));
  ctx.gems += gemsAwarded;

  let diceAwarded = 0;
  if (rng() < (WEATHER_METEOR_DICE_CHANCE[weatherId] ?? 0.2)) {
    diceAwarded = 1;
    ctx.enchantDice += 1;
  }

  emit();
  return {
    weatherDef,
    weatherOre,
    weatherOreQty,
    chibiId: droppedChibiId,
    gemsAwarded,
    diceAwarded,
  };
}

export function takeAllFromChestDomain(
  ctx: Pick<
    LootChestContext,
    'chestMiners' | 'chestOres' | 'miners' | 'ores' | 'discovered' | 'hotbar'
  >,
  emit: () => void = () => {}
): number {
  let taken = 0;
  for (const [id, qty] of Object.entries(ctx.chestMiners)) {
    if (qty <= 0) continue;
    ctx.miners[id] = (ctx.miners[id] || 0) + qty;
    ctx.discovered.add(id);
    addItemToHotbarIfSpaceDomain(ctx, id);
    taken += qty;
  }
  for (const [id, qty] of Object.entries(ctx.chestOres)) {
    if (qty <= 0) continue;
    ctx.ores[id] = (ctx.ores[id] || 0) + qty;
    ctx.discovered.add(id);
    taken += qty;
  }
  ctx.chestMiners = {};
  ctx.chestOres = {};
  if (taken > 0) emit();
  return taken;
}

export function isChestFullBonusReadyDomain(
  ctx: Pick<LootChestContext, 'getMaxChestCapacity' | 'getChestItemCount'>
): boolean {
  const cap = ctx.getMaxChestCapacity();
  return cap > 0 && ctx.getChestItemCount() >= Math.floor(cap * 0.95);
}

export function toggleAutoSellRarityDomain(
  ctx: LootChestContext,
  rarity: ItemRarity,
  emit: () => void = () => {}
): { active: boolean; earned: number } {
  const next = !ctx.autoSellRarities.has(rarity);
  if (next) {
    ctx.autoSellRarities.add(rarity);
  } else {
    ctx.autoSellRarities.delete(rarity);
  }
  let earned = 0;
  if (next) {
    const { baseEarned } = sweepMatchingChestOres(ctx, (ore) => ore.rarity === rarity);
    earned = baseEarned;
    ctx.cash += earned;
  }
  emit();
  return { active: next, earned };
}

export function sellAllChestOresDomain(
  ctx: LootChestContext,
  emit: () => void = () => {}
): { earned: number; bonusApplied: boolean } {
  const bonusApplied = isChestFullBonusReadyDomain(ctx);
  const mult = bonusApplied ? 1.35 : 1;
  const { baseEarned, soldAny } = sweepMatchingChestOres(ctx, () => true);
  if (!soldAny) return { earned: 0, bonusApplied: false };
  const earned = Math.round(baseEarned * mult);
  ctx.cash += earned;
  emit();
  return { earned, bonusApplied };
}

export function toggleAutoSellDomain(
  ctx: LootChestContext,
  emit: () => void = () => {}
): number {
  ctx.autoSell = !ctx.autoSell;
  let earned = 0;
  if (ctx.autoSell) {
    const { baseEarned } = sweepMatchingChestOres(ctx, () => true);
    earned = baseEarned;
    ctx.cash += earned;
  }
  emit();
  return earned;
}
