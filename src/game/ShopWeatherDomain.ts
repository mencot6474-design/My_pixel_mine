import {
  DEFAULT_PICKAXE_STOCK,
  getGemShopItemById,
  getMinerSellValue,
  getOreById,
  getPickaxeById,
  getPickaxeSellValue,
  PICKAXE_RESTOCK_MS,
} from './GameData';
import { isNonSellableChibi } from './DailyLoginData';
import type { PlotUnitState } from './GameStateSave';
import { removeFromHotbarDomain } from './LootChestDomain';
import { trimStashedUnits } from './PlotUnitsDomain';
import {
  getWeatherById,
  rollWeatherDef,
  WEATHER_DURATION_MS,
  WeatherDef,
  WeatherId,
} from './WeatherData';

export interface ShopWeatherContext {
  cash: number;
  gems: number;
  ores: Record<string, number>;
  miners: Record<string, number>;
  others: Record<string, number>;
  hotbar: (string | null)[];
  selectedHotbarSlot: number;
  plotMiners: (string | null)[];
  stashedUnits: Record<string, PlotUnitState[]>;
  chibiStars: Record<string, number>;
  ownedPickaxes: Record<string, number>;
  pickaxeStock: Record<string, number>;
  pickaxeRestockAt: number;
  activeBoosts: Record<string, number>;
  weatherId: WeatherId;
  weatherExpiresAt: number;
  getEffectiveOreSellValue(oreId: string): number;
}

export interface WeatherPersistCallbacks {
  emit?: () => void;
  save?: () => void;
}

function applySellOre(
  ctx: Pick<
    ShopWeatherContext,
    'cash' | 'ores' | 'hotbar' | 'selectedHotbarSlot' | 'getEffectiveOreSellValue'
  >,
  oreId: string,
  sellAll: boolean
): number {
  const qty = ctx.ores[oreId] || 0;
  if (qty <= 0) return 0;
  const def = getOreById(oreId);
  if (!def) return 0;
  const count = sellAll ? qty : 1;
  const earned = ctx.getEffectiveOreSellValue(oreId) * count;
  ctx.ores[oreId] = qty - count;
  if (ctx.ores[oreId] <= 0) {
    delete ctx.ores[oreId];
    removeFromHotbarDomain(ctx, oreId);
  }
  ctx.cash += earned;
  return earned;
}

/** Sells one or all units of a single bagged ore and notifies listeners if cash increased. */
export function sellOreDomain(
  ctx: Pick<
    ShopWeatherContext,
    'cash' | 'ores' | 'hotbar' | 'selectedHotbarSlot' | 'getEffectiveOreSellValue'
  >,
  oreId: string,
  sellAll = true,
  emit: () => void = () => {}
): number {
  const earned = applySellOre(ctx, oreId, sellAll);
  if (earned > 0) emit();
  return earned;
}

/** Sells every ore currently sitting in the inventory bag. */
export function sellAllOresDomain(
  ctx: Pick<
    ShopWeatherContext,
    'cash' | 'ores' | 'hotbar' | 'selectedHotbarSlot' | 'getEffectiveOreSellValue'
  >,
  emit: () => void = () => {}
): number {
  let total = 0;
  for (const [id, qty] of Object.entries(ctx.ores)) {
    if (qty <= 0) continue;
    const def = getOreById(id);
    if (!def) continue;
    total += ctx.getEffectiveOreSellValue(id) * qty;
    delete ctx.ores[id];
    removeFromHotbarDomain(ctx, id);
  }
  if (total > 0) {
    ctx.cash += total;
    emit();
  }
  return total;
}

/** Returns how many duplicates of a chibi can be sold without removing plot-equipped miners. */
export function getSellableMinerCountDomain(
  ctx: Pick<ShopWeatherContext, 'miners' | 'plotMiners'>,
  chibiId: string
): number {
  if (isNonSellableChibi(chibiId)) return 0;
  const owned = ctx.miners[chibiId] || 0;
  const onPlot = ctx.plotMiners.filter((id) => id === chibiId).length;
  return Math.max(0, owned - onPlot);
}

function applySellMiner(
  ctx: Pick<
    ShopWeatherContext,
    'cash' | 'miners' | 'plotMiners' | 'stashedUnits' | 'chibiStars' | 'hotbar' | 'selectedHotbarSlot'
  >,
  chibiId: string,
  sellAll: boolean
): number {
  const sellable = getSellableMinerCountDomain(ctx, chibiId);
  if (sellable <= 0) return 0;
  const count = sellAll ? sellable : 1;
  const earned = getMinerSellValue(chibiId) * count;
  ctx.miners[chibiId] = Math.max(0, (ctx.miners[chibiId] || 0) - count);
  if (ctx.miners[chibiId] <= 0) {
    delete ctx.miners[chibiId];
    delete ctx.stashedUnits[chibiId];
    removeFromHotbarDomain(ctx, chibiId);
  } else {
    trimStashedUnits(ctx, chibiId);
  }
  ctx.cash += earned;
  return earned;
}

/** Sells spare chibi duplicates while preserving plot-equipped and highest-ranked stashed units. */
export function sellMinerDomain(
  ctx: Pick<
    ShopWeatherContext,
    'cash' | 'miners' | 'plotMiners' | 'stashedUnits' | 'chibiStars' | 'hotbar' | 'selectedHotbarSlot'
  >,
  chibiId: string,
  sellAll = false,
  emit: () => void = () => {}
): number {
  const earned = applySellMiner(ctx, chibiId, sellAll);
  if (earned > 0) emit();
  return earned;
}

/** Restocks the pickaxe shop when the restock timestamp is reached. */
export function refreshPickaxeStockIfDueDomain(
  ctx: Pick<ShopWeatherContext, 'pickaxeStock' | 'pickaxeRestockAt'>,
  now = Date.now(),
  emit: () => void = () => {}
): boolean {
  if (now < ctx.pickaxeRestockAt) return false;
  ctx.pickaxeStock = { ...DEFAULT_PICKAXE_STOCK };
  ctx.pickaxeRestockAt = now + PICKAXE_RESTOCK_MS;
  emit();
  return true;
}

/** Refreshes overdue pickaxe stock and returns remaining seconds until the next restock. */
export function getPickaxeRestockRemainingSecDomain(
  ctx: Pick<ShopWeatherContext, 'pickaxeStock' | 'pickaxeRestockAt'>,
  now = Date.now(),
  emit: () => void = () => {}
): number {
  refreshPickaxeStockIfDueDomain(ctx, now, emit);
  return Math.max(0, Math.ceil((ctx.pickaxeRestockAt - now) / 1000));
}

/** Purchases one pickaxe from the stocked shop if affordable and in stock. */
export function buyPickaxeDomain(
  ctx: Pick<ShopWeatherContext, 'cash' | 'ownedPickaxes' | 'pickaxeStock' | 'pickaxeRestockAt'>,
  pickaxeId: string,
  now = Date.now(),
  emit: () => void = () => {}
): 'bought' | 'sold_out' | 'no_cash' {
  refreshPickaxeStockIfDueDomain(ctx, now, emit);
  const p = getPickaxeById(pickaxeId);
  if (!p || p.id !== pickaxeId) return 'sold_out';
  const stock = ctx.pickaxeStock[p.id] ?? 0;
  if (stock <= 0) return 'sold_out';
  if (ctx.cash < p.cost) return 'no_cash';
  ctx.cash -= p.cost;
  ctx.pickaxeStock[p.id] = stock - 1;
  ctx.ownedPickaxes[p.id] = (ctx.ownedPickaxes[p.id] || 0) + 1;
  emit();
  return 'bought';
}

function applySellPickaxe(
  ctx: Pick<ShopWeatherContext, 'cash' | 'ownedPickaxes'>,
  pickaxeId: string,
  sellAll: boolean
): number {
  const owned = ctx.ownedPickaxes[pickaxeId] || 0;
  if (owned <= 0) return 0;
  const count = sellAll ? owned : 1;
  const earned = getPickaxeSellValue(pickaxeId) * count;
  ctx.ownedPickaxes[pickaxeId] = owned - count;
  if (ctx.ownedPickaxes[pickaxeId] <= 0) delete ctx.ownedPickaxes[pickaxeId];
  ctx.cash += earned;
  return earned;
}

/** Sells unequipped pickaxes back for cash. */
export function sellPickaxeDomain(
  ctx: Pick<ShopWeatherContext, 'cash' | 'ownedPickaxes'>,
  pickaxeId: string,
  sellAll = false,
  emit: () => void = () => {}
): number {
  const earned = applySellPickaxe(ctx, pickaxeId, sellAll);
  if (earned > 0) emit();
  return earned;
}

/** Sells multiple selected `kind:id` entries and notifies listeners once. */
export function sellBatchDomain(
  ctx: Pick<
    ShopWeatherContext,
    | 'cash'
    | 'ores'
    | 'miners'
    | 'plotMiners'
    | 'stashedUnits'
    | 'chibiStars'
    | 'ownedPickaxes'
    | 'hotbar'
    | 'selectedHotbarSlot'
    | 'getEffectiveOreSellValue'
  >,
  keys: readonly string[],
  emit: () => void = () => {}
): number {
  let totalEarned = 0;
  for (const key of keys) {
    const sep = key.indexOf(':');
    if (sep === -1) continue;
    const kind = key.slice(0, sep);
    const id = key.slice(sep + 1);
    if (kind === 'ore') totalEarned += applySellOre(ctx, id, true);
    else if (kind === 'miner') totalEarned += applySellMiner(ctx, id, true);
    else if (kind === 'pickaxe') totalEarned += applySellPickaxe(ctx, id, true);
  }
  if (totalEarned > 0) emit();
  return totalEarned;
}

/** Buys a consumable item in the Gem Shop and stores it in `others`. */
export function buyGemShopItemDomain(
  ctx: Pick<ShopWeatherContext, 'gems' | 'others'>,
  itemId: string,
  emit: () => void = () => {}
): 'bought' | 'no_gems' {
  const def = getGemShopItemById(itemId);
  if (!def || ctx.gems < def.gemCost) return 'no_gems';
  ctx.gems -= def.gemCost;
  ctx.others[def.id] = (ctx.others[def.id] || 0) + 1;
  emit();
  return 'bought';
}

/** Consumes one potion from inventory and extends its active boost expiry timestamp. */
export function useGemPotionDomain(
  ctx: Pick<ShopWeatherContext, 'others' | 'activeBoosts'>,
  itemId: string,
  now = Date.now(),
  emit: () => void = () => {}
): boolean {
  const def = getGemShopItemById(itemId);
  const qty = ctx.others[itemId] || 0;
  if (!def || qty <= 0) return false;
  if (qty <= 1) delete ctx.others[itemId];
  else ctx.others[itemId] = qty - 1;
  const cur = ctx.activeBoosts[def.id] ?? 0;
  ctx.activeBoosts[def.id] = Math.max(now, cur) + def.durationSec * 1000;
  emit();
  return true;
}

/** Returns remaining seconds on a consumable potion boost. */
export function getBoostRemainingSecDomain(
  ctx: Pick<ShopWeatherContext, 'activeBoosts'>,
  itemId: string,
  now = Date.now()
): number {
  const exp = ctx.activeBoosts[itemId] ?? 0;
  return Math.max(0, Math.ceil((exp - now) / 1000));
}

/** Returns true while a consumable potion boost timestamp has not expired. */
export function isBoostActiveDomain(
  ctx: Pick<ShopWeatherContext, 'activeBoosts'>,
  itemId: string,
  now = Date.now()
): boolean {
  return (ctx.activeBoosts[itemId] ?? 0) > now;
}

/** Returns the active weather definition. */
export function getActiveWeatherDomain(ctx: Pick<ShopWeatherContext, 'weatherId'>): WeatherDef {
  return getWeatherById(ctx.weatherId);
}

/** Returns seconds left before the active weather rolls over. */
export function getWeatherRemainingSecDomain(
  ctx: Pick<ShopWeatherContext, 'weatherExpiresAt'>,
  now = Date.now()
): number {
  return Math.max(0, Math.ceil((ctx.weatherExpiresAt - now) / 1000));
}

/** Returns the weather multiplier directly (relics focus solely on Team DMG, Sell Ore, and Drop Ore). */
export function scaleWeatherMultDomain(
  _ctx: Pick<ShopWeatherContext, 'weatherId'>,
  base: number
): number {
  return base;
}

export function getWeatherDamageMultDomain(
  ctx: Pick<ShopWeatherContext, 'weatherId'>
): number {
  return scaleWeatherMultDomain(ctx, getActiveWeatherDomain(ctx).damageMult);
}

export function getWeatherOreDropMultDomain(
  ctx: Pick<ShopWeatherContext, 'weatherId'>
): number {
  return scaleWeatherMultDomain(ctx, getActiveWeatherDomain(ctx).oreDropMult);
}

export function getWeatherGemDropMultDomain(
  ctx: Pick<ShopWeatherContext, 'weatherId'>
): number {
  return scaleWeatherMultDomain(ctx, getActiveWeatherDomain(ctx).gemDropMult);
}

function applyWeatherDef(
  ctx: Pick<ShopWeatherContext, 'weatherId' | 'weatherExpiresAt'>,
  def: WeatherDef,
  now: number,
  emitChanges: boolean,
  callbacks: WeatherPersistCallbacks
): WeatherDef {
  ctx.weatherId = def.id;
  ctx.weatherExpiresAt = now + WEATHER_DURATION_MS;
  if (emitChanges) {
    callbacks.emit?.();
  } else {
    callbacks.save?.();
  }
  return def;
}

/** Rolls a new weather state once the active timer expires. */
export function syncWeatherDomain(
  ctx: Pick<ShopWeatherContext, 'weatherId' | 'weatherExpiresAt'>,
  now = Date.now(),
  rng: () => number = Math.random,
  emitChanges = true,
  callbacks: WeatherPersistCallbacks = {}
): WeatherDef | null {
  if (now < ctx.weatherExpiresAt) return null;
  return applyWeatherDef(ctx, rollWeatherDef(rng), now, emitChanges, callbacks);
}

/** Forces a specific weather state immediately (used by debug/test and weather controls). */
export function forceWeatherDomain(
  ctx: Pick<ShopWeatherContext, 'weatherId' | 'weatherExpiresAt'>,
  weatherId: WeatherId,
  now = Date.now(),
  emitChanges = true,
  callbacks: WeatherPersistCallbacks = {}
): WeatherDef {
  return applyWeatherDef(ctx, getWeatherById(weatherId), now, emitChanges, callbacks);
}
