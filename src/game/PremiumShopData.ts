import { getChibiById } from '../game3d/ChibiCatalog';

export interface PremiumShopItemDef {
  id: string;
  chibiId: string;
  rarity: 'twin';
  coinCost: number;
  dpsMult: number;
  upgradeCostMult: number;
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
    dpsMult: 2.3,
    upgradeCostMult: 11,
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
    dpsMult: 2.75,
    upgradeCostMult: 14,
    titleTag: 'Winged Academy Vanguard',
    passiveSummary: '+120% Tap DMG • +60% Ore Sell',
    teamDmgPct: 0,
    oreDropPct: 0,
    oreSellPct: 0.6,
    tapDmgPct: 1.2,
  },
  {
    id: 'premium-nocturne-twins',
    chibiId: 'nocturne-twins',
    rarity: 'twin',
    coinCost: 80,
    dpsMult: 3.2,
    upgradeCostMult: 17.5,
    titleTag: 'Gothic Shadow Covenant',
    passiveSummary: '+125% Team DMG • +75% Ore Sell',
    teamDmgPct: 1.25,
    oreDropPct: 0,
    oreSellPct: 0.75,
    tapDmgPct: 0,
  },
  {
    id: 'premium-lullaby-twins',
    chibiId: 'lullaby-twins',
    rarity: 'twin',
    coinCost: 100,
    dpsMult: 3.65,
    upgradeCostMult: 21,
    titleTag: 'Fallen Plush Pact',
    passiveSummary: '+150% Tap DMG • +65% Ore Drop',
    teamDmgPct: 0,
    oreDropPct: 0.65,
    oreSellPct: 0,
    tapDmgPct: 1.5,
  },
  {
    id: 'premium-clockwork-twins',
    chibiId: 'clockwork-twins',
    rarity: 'twin',
    coinCost: 120,
    dpsMult: 4.1,
    upgradeCostMult: 25,
    titleTag: 'Chrono-Gear Sovereign Duo',
    passiveSummary: '+150% Team DMG • +150% Tap DMG',
    teamDmgPct: 1.5,
    oreDropPct: 0,
    oreSellPct: 0,
    tapDmgPct: 1.5,
  },
] as const;

/** Scales a TWIN Chibi base DPS from the latest World's Secret DPS with 2-sig-fig nice rounding. */
export function computeTwinScaledBaseDps(secretBaseDps: number, dpsMult: number): number {
  const raw = secretBaseDps * dpsMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw < 100) return Math.max(1, Math.round(Number(raw.toPrecision(12))));
  const step = Math.pow(10, Math.floor(Math.log10(raw) + 1e-12) - 1);
  return Math.round(Number((raw / step).toPrecision(12))) * step;
}

/** Scales a TWIN Chibi plot upgrade cost multiplier from the latest World's upgrade cost scale. */
export function computeTwinUpgradeCostScale(worldCostScale: number, upgradeCostMult: number): number {
  const raw = worldCostScale * upgradeCostMult;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.round(raw);
}

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
