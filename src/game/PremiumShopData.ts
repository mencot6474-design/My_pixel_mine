import { getChibiById } from '../game3d/ChibiCatalog';

export interface PremiumShopItemDef {
  id: string;
  chibiId: string;
  rarity: 'twin';
  coinCost: number;
  upgradeCostScale: number;
  titleTag: string;
  passiveSummary: string;
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
  tapDmgPct: number;
}

export const PREMIUM_SHOP_ITEMS: readonly PremiumShopItemDef[] = [
  {
    id: 'premium-yukikage-twins',
    chibiId: 'yukikage-twins',
    rarity: 'twin',
    coinCost: 50,
    upgradeCostScale: 220_000_000_000,
    titleTag: 'Snow-Shadow Shrine Duo',
    passiveSummary: '+100% Team DMG • +40% Ore Drop',
    teamDmgPct: 1.0,
    oreDropPct: 0.4,
    oreSellPct: 0,
    tapDmgPct: 0,
  },
  {
    id: 'premium-halcyon-twins',
    chibiId: 'halcyon-twins',
    rarity: 'twin',
    coinCost: 65,
    upgradeCostScale: 280_000_000_000,
    titleTag: 'Winged Academy Vanguard',
    passiveSummary: '+120% Tap DMG • +60% Ore Sell',
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0.6,
    tapDmgPct: 1.2,
  },
] as const;

export function getPremiumShopItemByChibiId(chibiId: string): PremiumShopItemDef | undefined {
  return PREMIUM_SHOP_ITEMS.find((item) => item.chibiId === chibiId);
}

export function isPremiumShopChibi(chibiId: string): boolean {
  return Boolean(getPremiumShopItemByChibiId(chibiId));
}

export interface ActivePremiumPassives {
  teamDmgPct: number;
  oreDropPct: number;
  oreSellPct: number;
  tapDmgPct: number;
}

/** Sums unique active passive bonuses from placed TWIN Premium Shop units. */
export function getActivePremiumPassiveBonuses(plotMiners: readonly (string | null)[]): ActivePremiumPassives {
  const seen = new Set<string>();
  const totals: ActivePremiumPassives = {
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0,
    tapDmgPct: 0,
  };
  for (const id of plotMiners) {
    if (!id || seen.has(id)) continue;
    const def = getPremiumShopItemByChibiId(id);
    if (!def) continue;
    seen.add(id);
    totals.teamDmgPct += def.teamDmgPct;
    totals.oreDropPct += def.oreDropPct;
    totals.oreSellPct += def.oreSellPct;
    totals.tapDmgPct += def.tapDmgPct;
  }
  return totals;
}

export interface PremiumShopBuyContext {
  towerCoins: number;
  miners: Record<string, number>;
  hotbar: (string | null)[];
  discovered: Set<string>;
  save?: () => void;
  emit?: () => void;
}

/** Purchases a TWIN Chibi from the Premium Shop using Spire Coins. */
export function buyPremiumShopChibiDomain(
  ctx: PremiumShopBuyContext,
  chibiId: string
): 'bought' | 'no_coins' | 'invalid' {
  const def = getPremiumShopItemByChibiId(chibiId);
  if (!def || !getChibiById(def.chibiId)) return 'invalid';
  if ((ctx.towerCoins ?? 0) < def.coinCost) return 'no_coins';

  ctx.towerCoins -= def.coinCost;
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
