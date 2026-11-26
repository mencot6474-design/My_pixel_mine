import { getChibiById } from '../game3d/ChibiCatalog';
import { getStarPassiveScale } from './FusionDomain';

export type PremiumShopRarity = 'twin' | 'novel';
export type PremiumShopCurrency = 'coins' | 'gems';

export interface PremiumShopItemDef {
  id: string;
  chibiId: string;
  rarity: PremiumShopRarity;
  currency: PremiumShopCurrency;
  coinCost?: number;
  gemCost?: number;
  dpsMult: number;
  upgradeCostMult: number;
  titleTag: string;
  passiveSummary: string;
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
}

export const PREMIUM_SHOP_ITEMS: readonly PremiumShopItemDef[] = [
  {
    id: 'premium-yukikage-twins',
    chibiId: 'yukikage-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 50,
    dpsMult: 2.3,
    upgradeCostMult: 11,
    titleTag: 'Snow-Shadow Shrine Duo',
    passiveSummary: '+100% Team DMG • +40% Ore Drop',
    teamDmgPct: 1.0,
    oreDropPct: 0.4,
    oreSellPct: 0,
  },
  {
    id: 'premium-halcyon-twins',
    chibiId: 'halcyon-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 65,
    dpsMult: 2.75,
    upgradeCostMult: 14,
    titleTag: 'Winged Academy Vanguard',
    passiveSummary: '+65% Ore Drop • +75% Ore Sell',
    teamDmgPct: 0,
    oreDropPct: 0.65,
    oreSellPct: 0.75,
  },
  {
    id: 'premium-nocturne-twins',
    chibiId: 'nocturne-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 80,
    dpsMult: 3.2,
    upgradeCostMult: 17.5,
    titleTag: 'Gothic Shadow Covenant',
    passiveSummary: '+125% Team DMG • +75% Ore Sell',
    teamDmgPct: 1.25,
    oreDropPct: 0,
    oreSellPct: 0.75,
  },
  {
    id: 'premium-lullaby-twins',
    chibiId: 'lullaby-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 100,
    dpsMult: 3.65,
    upgradeCostMult: 21,
    titleTag: 'Fallen Plush Pact',
    passiveSummary: '+135% Team DMG • +85% Ore Drop',
    teamDmgPct: 1.35,
    oreDropPct: 0.85,
    oreSellPct: 0,
  },
  {
    id: 'premium-clockwork-twins',
    chibiId: 'clockwork-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 120,
    dpsMult: 4.1,
    upgradeCostMult: 25,
    titleTag: 'Chrono-Gear Sovereign Duo',
    passiveSummary: '+160% Team DMG • +110% Ore Sell',
    teamDmgPct: 1.6,
    oreDropPct: 0,
    oreSellPct: 1.1,
  },
  {
    id: 'premium-paradox-twins',
    chibiId: 'paradox-twins',
    rarity: 'twin',
    currency: 'coins',
    coinCost: 145,
    dpsMult: 4.55,
    upgradeCostMult: 29,
    titleTag: 'Gilded Chrono & Crimson Chain Duo',
    passiveSummary: '+175% Team DMG • +105% Ore Drop',
    teamDmgPct: 1.75,
    oreDropPct: 1.05,
    oreSellPct: 0,
  },
] as const;

export const NOVEL_SHOP_ITEMS: readonly PremiumShopItemDef[] = [
  {
    id: 'premium-crimson-tarot-witch',
    chibiId: 'crimson-tarot-witch',
    rarity: 'novel',
    currency: 'gems',
    gemCost: 2_500_000,
    dpsMult: 2.3,
    upgradeCostMult: 11,
    titleTag: 'Scarlet Arcana Witch',
    passiveSummary: '+100% Team DMG • +40% Ore Sell',
    teamDmgPct: 1.0,
    oreDropPct: 0,
    oreSellPct: 0.4,
  },
  {
    id: 'premium-gilded-chain-noble',
    chibiId: 'gilded-chain-noble',
    rarity: 'novel',
    currency: 'gems',
    gemCost: 3_000_000,
    dpsMult: 3.2,
    upgradeCostMult: 17.5,
    titleTag: 'Gilded Blindfold Arbiter',
    passiveSummary: '+125% Team DMG • +75% Ore Drop',
    teamDmgPct: 1.25,
    oreDropPct: 0.75,
    oreSellPct: 0,
  },
  {
    id: 'premium-crimson-clock-marshal',
    chibiId: 'crimson-clock-marshal',
    rarity: 'novel',
    currency: 'gems',
    gemCost: 3_500_000,
    dpsMult: 4.1,
    upgradeCostMult: 25,
    titleTag: 'Crimson Chrono Marshal',
    passiveSummary: '+160% Team DMG • +110% Ore Sell',
    teamDmgPct: 1.6,
    oreDropPct: 0,
    oreSellPct: 1.1,
  },
] as const;

export const ALL_PREMIUM_SHOP_ITEMS: readonly PremiumShopItemDef[] = [
  ...PREMIUM_SHOP_ITEMS,
  ...NOVEL_SHOP_ITEMS,
];

export function getPremiumShopItemsByRarity(rarity: PremiumShopRarity): readonly PremiumShopItemDef[] {
  return rarity === 'novel' ? NOVEL_SHOP_ITEMS : PREMIUM_SHOP_ITEMS;
}

/** Scales a TWIN Chibi base DPS from the latest World's Secret DPS with 2-sig-fig nice rounding. */
export function computeTwinScaledBaseDps(secretBaseDps: number, dpsMult: number): number {
  const raw = secretBaseDps * dpsMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw < 100) return Math.max(1, Math.round(Number(raw.toPrecision(12))));
  const step = Math.pow(10, Math.floor(Math.log10(raw) + 1e-12) - 1);
  return Number((Math.round(Number((raw / step).toPrecision(12))) * step).toPrecision(2));
}

/** Scales a TWIN Chibi plot upgrade cost multiplier from the latest World's upgrade cost scale. */
export function computeTwinUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number {
  const raw = worldCostScale * upgradeCostMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.round(Number(raw.toPrecision(12)));
}

export function getPremiumShopItemByChibiId(chibiId: string): PremiumShopItemDef | undefined {
  return ALL_PREMIUM_SHOP_ITEMS.find((item) => item.chibiId === chibiId);
}

export function isPremiumShopChibi(chibiId: string): boolean {
  return Boolean(getPremiumShopItemByChibiId(chibiId));
}

export interface ActivePremiumPassives {
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
}

/** Sums unique active passive bonuses from placed TWIN Premium Shop units (scaled +20%/star). */
export function getActivePremiumPassiveBonuses(
  plotMiners: readonly (string | null)[],
  chibiStars: Readonly<Record<string, number>> = {}
): ActivePremiumPassives {
  const seen = new Set<string>();
  const totals: ActivePremiumPassives = {
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0,
  };
  for (const id of plotMiners) {
    if (!id || seen.has(id)) continue;
    const def = getPremiumShopItemByChibiId(id);
    if (!def) continue;
    seen.add(id);
    const starScale = getStarPassiveScale(chibiStars[id] ?? 0);
    totals.teamDmgPct += def.teamDmgPct * starScale;
    totals.oreDropPct += def.oreDropPct * starScale;
    totals.oreSellPct += def.oreSellPct * starScale;
  }
  return totals;
}

export interface PremiumShopBuyContext {
  towerCoins: number;
  gems: number;
  miners: Record<string, number>;
  hotbar: (string | null)[];
  discovered: Set<string>;
  save?: () => void;
  emit?: () => void;
}

/** Purchases a Twin (Spire Coins) or Novel (Gems) Chibi from the Premium Shop. */
export function buyPremiumShopChibiDomain(
  ctx: PremiumShopBuyContext,
  chibiId: string
): 'bought' | 'no_coins' | 'no_gems' | 'invalid' {
  const def = getPremiumShopItemByChibiId(chibiId);
  if (!def || !getChibiById(def.chibiId)) return 'invalid';

  if (def.currency === 'gems') {
    const cost = def.gemCost ?? 0;
    if ((ctx.gems ?? 0) < cost) return 'no_gems';
    ctx.gems -= cost;
  } else {
    const cost = def.coinCost ?? 0;
    if ((ctx.towerCoins ?? 0) < cost) return 'no_coins';
    ctx.towerCoins -= cost;
  }

  ctx.miners[def.chibiId] = (ctx.miners[def.chibiId] || 0) + 1;
  ctx.discovered.add(def.chibiId);
  if (!ctx.hotbar.includes(def.chibiId)) {
    const emptyIdx = ctx.hotbar.indexOf(null);
    if (emptyIdx !== -1) ctx.hotbar[emptyIdx] = def.chibiId;
  }
  ctx.save?.();
  ctx.emit?.();
  return 'bought';
}
