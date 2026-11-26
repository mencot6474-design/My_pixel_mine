import { getChibiById } from '../game3d/ChibiCatalog';
import { audio } from '../audio/AudioManager';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import {
  GEM_SHOP_ITEMS,
  getGemShopItemById,
  getMinerRarity,
  getMinerSellValue,
  getOreById,
  getPickaxeById,
  getPickaxeSellValue,
  getWorldById,
  ItemRarity,
  PICKAXES,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtShort } from '../game/NumberFormat';
import {
  ALL_PREMIUM_SHOP_ITEMS,
  getPremiumShopItemByChibiId,
  getPremiumShopItemsByRarity,
  PREMIUM_SHOP_ITEMS,
  type PremiumShopItemDef,
  type PremiumShopRarity,
} from '../game/PremiumShopData';
import {
  buildTwinFullscreenRevealDomHtml,
  TwinSummonCutsceneController,
  TwinSummonCutsceneState,
} from './TwinSummonCutscene';
import { gemPotionIconHtml, hudIconHtml, oreIconSvg, pickaxeIconHtml, spireCoinIconHtml } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  refreshPotionTimersInDom,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_MODAL_GRID_BASE,
  TW_SHOP_BUY_BTN,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

export interface SellableEntry {
  key: string;
  kind: 'ore' | 'miner' | 'pickaxe';
  id: string;
  name: string;
  rarity: ItemRarity;
  qty: number;
  totalValue: number;
  artHtml: string;
}

export class ShopModalsUi {
  private sellSelected = new Set<string>();
  private shopInspectPickaxeId: string = PICKAXES[0].id;
  private shopInspectGemId: string = GEM_SHOP_ITEMS[0].id;
  private shopInspectPremiumId: string = PREMIUM_SHOP_ITEMS[0]?.chibiId ?? '';
  private premiumShopTab: PremiumShopRarity = 'twin';
  private sellInspectKey: string | null = null;
  private lastSellCardsHtml = '';
  private lastShopInspectorHtml = '';
  private readonly twinCutscene = new TwinSummonCutsceneController();

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender?: () => void
  ) {}

  public getPremiumCutsceneState(): TwinSummonCutsceneState | null {
    return this.twinCutscene.getState();
  }

  public clearPremiumCutscene(): void {
    this.twinCutscene.clear();
  }

  public finishPremiumCutsceneToConfirm(): void {
    this.twinCutscene.skipToConfirm();
  }

  /** Renders fullscreen TWIN cutscene/confirm DOM markup for diagnostics and unit tests. */
  public renderFullscreenCutsceneHtml(): string {
    const cs = this.twinCutscene.getState();
    if (!cs) return '';
    const item = getPremiumShopItemByChibiId(cs.chibiId) ?? PREMIUM_SHOP_ITEMS[0];
    if (!item) return '';
    return buildTwinFullscreenRevealDomHtml(
      cs,
      item,
      getChibiById(item.chibiId),
      this.state.getEffectiveChibiDps(item.chibiId)
    );
  }

  private buildPickaxeInspectorHtml(): string {
    const p = getPickaxeById(this.shopInspectPickaxeId) ?? PICKAXES[0];
    this.shopInspectPickaxeId = p.id;
    const locked = !this.state.isWorldUnlocked(p.worldId);
    const reqWorld = getWorldById(p.worldId);
    const stock = this.state.pickaxeStock[p.id] ?? 0;
    const soldOut = stock <= 0;
    const canBuy = !locked && !soldOut && this.state.cash >= p.cost;
    const ownedBag = this.state.ownedPickaxes[p.id] || 0;
    const equippedCount = this.state.plotUnits.filter((u) => u?.pickaxeId === p.id).length;

    return renderInspectorPanel({
      rarity: p.rarity,
      title: p.name,
      subtitle: `${reqWorld.name} • Pickaxe`,
      badgesHtml: locked
        ? `<span class="mam-pill rounded-full border-2 border-[#14111d] text-[10px] font-black bg-[#e2e8f0] text-[#475569]">🔒 ${reqWorld.name}</span>`
        : `<span class="mam-pill rounded-full border-2 border-[#14111d] text-[10px] font-black ${soldOut ? 'bg-[#fda4af] text-[#14111d]' : 'bg-[#6ee7b7] text-[#14111d]'}">${soldOut ? 'Sold Out' : `${fmtInt(stock)} Left`}</span>`,
      artHtml: pickaxeIconHtml(p.id, 84, p.name),
      stats: [
        ['Power', `${p.dmgMult}x DMG`, 'text-[#0284c7]'],
        ...(p.sellBonusPct ? [['Sell Ore', `+${Math.round(p.sellBonusPct * 100)}%`, 'text-[#059669]'] as [string, string, string]] : []),
        ['Cost', p.cost === 0 ? 'Free' : fmtMoney(p.cost), 'text-[#b45309]'],
        ['Owned', `x${fmtInt(ownedBag)} (+${fmtInt(equippedCount)} eq)`, 'text-[#14111d]'],
        ['Resell', fmtMoney(getPickaxeSellValue(p.id)), 'text-[#059669]'],
      ],
      actionHtml: `
        <button class="${TW_SHOP_BUY_BTN} !h-10 !text-[15px] ${locked ? 'disabled' : soldOut ? 'sold-out' : canBuy ? '' : 'disabled'}" data-buy-pickaxe="${p.id}">
          ${locked ? `Unlock ${reqWorld.name}` : soldOut ? 'Sold Out' : p.cost === 0 ? 'Claim Free' : `Buy • ${fmtMoney(p.cost)}`}
        </button>
      `,
    });
  }

  private buildGemShopInspectorHtml(): string {
    const item = getGemShopItemById(this.shopInspectGemId) ?? GEM_SHOP_ITEMS[0];
    this.shopInspectGemId = item.id;
    const inBag = this.state.others[item.id] || 0;
    const rem = this.state.getBoostRemainingSec(item.id);
    const isActive = rem > 0;
    const canBuy = this.state.gems >= item.gemCost;
    const mm = Math.floor(rem / 60);
    const ss = String(rem % 60).padStart(2, '0');

    return renderInspectorPanel({
      rarity: item.rarity,
      title: item.name,
      subtitle: 'Gem Shop Boost',
      badgesHtml: isActive
        ? `<span class="mam-pill rounded-full bg-[#6ee7b7] border-2 border-[#14111d] text-[10px] font-black text-[#14111d] tabular-nums">Active ${mm}:${ss}</span>`
        : '',
      artHtml: gemPotionIconHtml(item.id, 84, item.name, item.color),
      stats: [
        ['Effect', item.effectText, 'text-[#059669]'],
        ['Duration', item.durationLabel, 'text-[#0284c7]'],
        ['Price', `${fmtInt(item.gemCost)} Gems`, 'text-[#0284c7]'],
        ['In Bag', `x${fmtInt(inBag)}`, 'text-[#14111d]'],
      ],
      actionHtml: `
        <button class="${TW_SHOP_BUY_BTN} !h-10 !text-[14px] inline-flex items-center justify-center gap-1.5 ${canBuy ? '' : 'disabled'}" data-buy-gem-item="${item.id}">
          ${hudIconHtml('gem', 16, 'Gem')}
          <span>Buy • ${fmtInt(item.gemCost)}</span>
        </button>
        ${
          inBag > 0
            ? `<button class="w-full h-9 rounded-xl border-2 border-[#14111d] bg-[#38bdf8] text-[#14111d] text-[13px] font-black cursor-pointer hover:brightness-105 active:scale-95" data-insp-shop-use-gem="${item.id}">Use from Bag (x${fmtInt(inBag)})</button>`
            : ''
        }
      `,
    });
  }

  private buildSellShopInspectorHtml(entries = this.getSellableEntries()): string {
    if (entries.length === 0) {
      this.sellInspectKey = null;
      return renderEmptyInspectorPanel('Select any Ore, Miner, or Pickaxe to inspect its sell price.');
    }
    const entry = entries.find((e) => e.key === this.sellInspectKey) ?? entries[0];
    this.sellInspectKey = entry.key;
    const isSel = this.sellSelected.has(entry.key);
    const unitVal = Math.round(entry.totalValue / Math.max(1, entry.qty));
    const kindLabel = entry.kind === 'ore' ? 'Ore Resource' : entry.kind === 'miner' ? 'Chibi Miner' : 'Spare Pickaxe';

    return renderInspectorPanel({
      rarity: entry.rarity,
      title: entry.name,
      subtitle: kindLabel,
      badgesHtml: `<span class="mam-pill rounded-full border-2 border-[#14111d] text-[10px] font-black ${isSel ? 'bg-[#6ee7b7] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${isSel ? 'Selected' : 'Not Selected'}</span>`,
      artHtml: entry.artHtml,
      stats: [
        ['Unit Value', fmtMoney(unitVal), 'text-[#059669]'],
        ['Sellable Qty', `x${fmtInt(entry.qty)}`, 'text-[#14111d]'],
        ['Stack Total', fmtMoney(entry.totalValue), 'text-[#b45309]'],
        ['Status', isSel ? 'Queued' : 'Hold', isSel ? 'text-[#059669]' : 'text-[#5b526e]'],
      ],
      actionHtml: `
        <button class="w-full h-10 rounded-xl border-2 border-[#14111d] ${isSel ? 'bg-[#ff922b] text-[#14111d]' : 'bg-[#2ee59d] text-[#14111d]'} text-[14px] font-black cursor-pointer hover:brightness-105 active:scale-95" data-insp-sell-toggle="${entry.key}">
          ${isSel ? 'Deselect from Sale' : 'Select for Sale'}
        </button>
      `,
    });
  }

  public renderPickaxeShopModal(): string {
    const secLeft = this.state.getPickaxeRestockRemainingSec();
    const mm = Math.floor(secLeft / 60);
    const ss = String(secLeft % 60).padStart(2, '0');
    if (!getPickaxeById(this.shopInspectPickaxeId)) this.shopInspectPickaxeId = PICKAXES[0].id;

    const cards = PICKAXES.map((p) => {
      const locked = !this.state.isWorldUnlocked(p.worldId);
      const reqWorld = getWorldById(p.worldId);
      const stock = this.state.pickaxeStock[p.id] ?? 0;
      const soldOut = stock <= 0;
      const canBuy = !locked && !soldOut && this.state.cash >= p.cost;
      const isInspected = this.shopInspectPickaxeId === p.id;
      return `
        <div class="${rarityCardClasses(p.rarity, `${isInspected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : ''} ${locked ? 'opacity-80' : ''}`)} !aspect-auto min-h-[192px] pt-2.5 px-2 pb-[9px] gap-1.5 !justify-start" style="${rarityVars(p.rarity)}" data-shop-item-card="true" data-inspect-pickaxe="${p.id}">
          <div class="mam-card-art !relative !inset-auto w-full h-[70px] shrink-0 flex items-center justify-center ${locked ? 'grayscale-[65%] opacity-75' : ''}">${pickaxeIconHtml(p.id, 66, p.name)}</div>
          <div class="w-full flex flex-col items-center gap-0.5 min-w-0">
            <div class="w-full px-0.5 text-center text-[14px] font-black leading-[1.18] text-[#14111d] whitespace-nowrap overflow-hidden text-ellipsis" title="${p.name}">${p.name}</div>
            <div class="text-[11px] font-black leading-[1.15] text-[#0284c7] text-center">${p.dmgMult}x DMG${p.sellBonusPct ? ` • <span class="text-[#059669]">+${Math.round(p.sellBonusPct * 100)}% Sell</span>` : ''}</div>
            <div class="text-[11px] font-extrabold leading-[1.15] text-center truncate max-w-full ${locked ? 'text-[#b45309]' : soldOut ? 'text-[#dc2626]' : 'text-[#5b526e]'}" data-shop-meta="true">
              ${locked ? `Unlock ${reqWorld.name}` : soldOut ? 'Sold out' : `${fmtInt(stock)} in stock`}
            </div>
          </div>
          <button class="${TW_SHOP_BUY_BTN} ${locked ? 'disabled' : soldOut ? 'sold-out' : canBuy ? '' : 'disabled'}" data-buy-pickaxe="${p.id}">
            ${locked ? `🔒 ${fmtMoney(p.cost)}` : p.cost === 0 ? 'Free' : fmtMoney(p.cost)}
          </button>
        </div>
      `;
    }).join('');

    const inspHtml = this.buildPickaxeInspectorHtml();
    this.lastShopInspectorHtml = inspHtml;

    return renderModalShell({
      title: 'Pickaxes',
      theme: 'pickaxe-shop',
      iconHtml: hudIconHtml('pickaxe', 26, 'Pickaxes'),
      boxClass: `w-[980px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `<div class="ml-auto mr-1 mam-pill-lg rounded-full bg-[#fde047] border-2 border-[#14111d] text-[13.5px] font-black tabular-nums text-[#14111d] @max-[720px]:text-[12px]" data-restock-timer="true">Restock in ${mm}:${ss}</div>`,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-4 gap-2.5 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-2" data-shop-grid="true">
            ${cards}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="pickaxe">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

  private getPremiumItemCost(item: PremiumShopItemDef): number {
    return item.currency === 'gems' ? (item.gemCost ?? 0) : (item.coinCost ?? 0);
  }

  private canAffordPremiumItem(item: PremiumShopItemDef): boolean {
    const cost = this.getPremiumItemCost(item);
    return item.currency === 'gems' ? this.state.gems >= cost : this.state.towerCoins >= cost;
  }

  private renderPremiumCurrencyIcon(item: PremiumShopItemDef, size = 16): string {
    return item.currency === 'gems' ? hudIconHtml('gem', size, 'Gem') : spireCoinIconHtml(size);
  }

  private buildPremiumShopInspectorHtml(): string {
    const tabItems = getPremiumShopItemsByRarity(this.premiumShopTab);
    const inspected = getPremiumShopItemByChibiId(this.shopInspectPremiumId);
    const def = (inspected && inspected.rarity === this.premiumShopTab ? inspected : tabItems[0]) ?? tabItems[0];
    if (!def) {
      return renderEmptyInspectorPanel('Select any Premium Chibi to inspect its stats.');
    }
    this.shopInspectPremiumId = def.chibiId;
    const chibi = getChibiById(def.chibiId);
    if (!chibi) {
      return renderEmptyInspectorPanel('Chibi data not found.');
    }
    const owned = this.state.miners[def.chibiId] || 0;
    const cost = this.getPremiumItemCost(def);
    const canBuy = this.canAffordPremiumItem(def);
    const costLabel = def.currency === 'gems' ? `${fmtInt(cost)} Gems` : `${fmtInt(cost)} Coins`;
    const sourceLabel = def.currency === 'gems' ? 'Premium Gems' : 'Battle Tower';
    return renderInspectorPanel({
      rarity: def.rarity,
      title: chibi.name,
      subtitle: def.titleTag,
      badgesHtml: `<span class="mam-pill rounded-full bg-[#fef08a] border-2 border-[#14111d] text-[10px] font-black text-[#14111d]">${def.passiveSummary}</span>`,
      artHtml: chibiPortraitHtml(chibi, { usePose: true }),
      stats: [
        ['Base DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#dc2626]'],
        ['Cost', costLabel, 'text-[#b45309]'],
        ['Owned', `x${fmtInt(owned)}`, 'text-[#14111d]'],
        ['Source', sourceLabel, 'text-[#0284c7]'],
      ],
      actionHtml: `
        <button class="${TW_SHOP_BUY_BTN} !h-10 !text-[14px] inline-flex items-center justify-center gap-1.5 ${canBuy ? '' : 'disabled'}" data-buy-premium-item="${def.chibiId}">
          ${this.renderPremiumCurrencyIcon(def, 17)}
          <span>Buy • ${fmtInt(cost)}</span>
        </button>
      `,
    });
  }

  public renderPremiumShopModal(): string {
    const tabItems = getPremiumShopItemsByRarity(this.premiumShopTab);
    const inspected = getPremiumShopItemByChibiId(this.shopInspectPremiumId);
    if ((!inspected || inspected.rarity !== this.premiumShopTab) && tabItems[0]) {
      this.shopInspectPremiumId = tabItems[0].chibiId;
    }

    const cards = tabItems.map((item) => {
      const chibi = getChibiById(item.chibiId);
      if (!chibi) return '';
      const owned = this.state.miners[item.chibiId] || 0;
      const cost = this.getPremiumItemCost(item);
      const canBuy = this.canAffordPremiumItem(item);
      const isInspected = this.shopInspectPremiumId === item.chibiId;
      const subTextCls = 'text-[#5b526e]';
      const ownedTextCls = 'text-[#0284c7]';

      return `
        <div class="${rarityCardClasses(item.rarity, `is-holo-foil ${isInspected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : ''}`)} !aspect-auto min-h-[252px] pt-2.5 px-2.5 pb-[10px] gap-1.5 !justify-between" style="${rarityVars(item.rarity)}" data-inspect-premium="${item.chibiId}">
          <div class="w-full flex items-center justify-center min-h-[34px] shrink-0">
            ${renderRarityBadgeHtml(item.rarity, 'is-compact')}
          </div>
          <div class="mam-card-art !relative !inset-auto w-full h-[94px] shrink-0 flex items-center justify-center [&_.mam-chibi-portrait_img]:max-w-[104px] [&_.mam-chibi-portrait_img]:max-h-[92px]">
            ${chibiPortraitHtml(chibi, { usePose: true })}
          </div>
          <div class="w-full flex flex-col items-center gap-0.5 min-h-0">
            <div class="w-full px-0.5 text-center text-[14.5px] font-black leading-[1.15] whitespace-nowrap overflow-hidden text-ellipsis text-[#14111d]" title="${chibi.name}">${chibi.name}</div>
            <div class="text-[11px] font-extrabold leading-[1.2] text-center ${subTextCls}">
              ${fmtShort(this.state.getEffectiveChibiDps(chibi.id))} DPS • ${item.passiveSummary}
            </div>
            <div class="min-h-[14px] text-[11px] font-black text-center ${ownedTextCls}" data-premium-owned="${item.chibiId}">
              ${owned > 0 ? `Owned: x${fmtInt(owned)}` : 'Not Owned'}
            </div>
          </div>
          <button class="${TW_SHOP_BUY_BTN} inline-flex items-center justify-center gap-1.5 ${canBuy ? '' : 'disabled'}" data-buy-premium-item="${item.chibiId}">
            ${this.renderPremiumCurrencyIcon(item, 16)}
            <span>${fmtInt(cost)}</span>
          </button>
        </div>
      `;
    }).join('');

    const inspHtml = this.buildPremiumShopInspectorHtml();
    this.lastShopInspectorHtml = inspHtml;
    const isNovelTab = this.premiumShopTab === 'novel';
    const tabsHtml = `
      <div class="flex items-center gap-2 shrink-0 flex-wrap">
        <button type="button" class="${TW_TAB_BTN} ${!isNovelTab ? 'is-active' : ''}" data-premium-tab="twin">
          ${spireCoinIconHtml(15)}
          <span>Twin</span>
        </button>
        <button type="button" class="${TW_TAB_BTN} ${isNovelTab ? 'is-active' : ''}" data-premium-tab="novel">
          ${hudIconHtml('gem', 15, 'Gems')}
          <span>Novel</span>
        </button>
      </div>
    `;
    const headerCurrencyHtml = isNovelTab
      ? `<div class="ml-auto mr-1 mam-pill-lg rounded-full bg-[#e0f2fe] border-2 border-[#14111d] text-[13.5px] font-black tabular-nums text-[#14111d] inline-flex items-center gap-1.5 whitespace-nowrap @max-[720px]:text-[12px]" title="Gems">${hudIconHtml('gem', 18, 'Gems')}<span data-premium-shop-gems="true">${fmtInt(this.state.gems)}</span></div>`
      : `<div class="ml-auto mr-1 mam-pill-lg rounded-full bg-[#fef08a] border-2 border-[#14111d] text-[13.5px] font-black tabular-nums text-[#14111d] inline-flex items-center gap-1.5 whitespace-nowrap @max-[720px]:text-[12px]" title="Spire Coins (Battle Tower)">${spireCoinIconHtml(18)}<span data-premium-shop-coins="true">${fmtInt(this.state.towerCoins)}</span></div>`;

    return renderModalShell({
      title: 'Shop',
      theme: 'premium-shop',
      iconHtml: hudIconHtml('shopBasket', 26, 'Shop'),
      boxClass: `w-[min(960px,calc(100%-16px))] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: headerCurrencyHtml,
      bodyHtml: `
        ${tabsHtml}
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar" data-premium-shop="true">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-3 gap-2.5 flex-1 min-h-[240px] @max-[920px]:flex-none @max-[920px]:max-h-[360px] p-0.5 @max-[720px]:grid-cols-2">
            ${cards}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="premium">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

  public renderGemShopModal(): string {
    const now = Date.now();
    if (!getGemShopItemById(this.shopInspectGemId)) this.shopInspectGemId = GEM_SHOP_ITEMS[0].id;

    const cards = GEM_SHOP_ITEMS.map((item) => {
      const inBag = this.state.others[item.id] || 0;
      const rem = this.state.getBoostRemainingSec(item.id, now);
      const isActive = rem > 0;
      const canBuy = this.state.gems >= item.gemCost;
      const isInspected = this.shopInspectGemId === item.id;
      const mm = Math.floor(rem / 60);
      const ss = String(rem % 60).padStart(2, '0');
      return `
        <div class="${rarityCardClasses(item.rarity, isInspected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '')} !aspect-auto min-h-[214px] pt-2.5 px-2 pb-[9px] gap-1.5 !justify-start" style="${rarityVars(item.rarity)}" data-inspect-gem="${item.id}">
          <div class="mam-card-art !relative !inset-auto w-full h-[70px] shrink-0 flex items-center justify-center">${gemPotionIconHtml(item.id, 68, item.name, item.color)}</div>
          <div class="w-full flex flex-col items-center gap-0.5 min-h-0">
            <div class="w-full px-0.5 text-center text-[14px] font-black leading-[1.18] text-[#14111d] whitespace-nowrap overflow-hidden text-ellipsis" title="${item.name}">${item.name}</div>
            <div class="text-[11px] font-extrabold leading-[1.2] text-[#5b526e] text-center">
              ${item.effectText}<br/>${item.durationLabel}
            </div>
            <div class="min-h-[14px] text-[11px] font-black text-[#0284c7] text-center" data-gem-bag="${item.id}">
              ${inBag > 0 ? `In Bag: x${fmtInt(inBag)}` : ''}
            </div>
            <div class="min-h-[14px] text-[11px] font-black tabular-nums text-[#059669] text-center ${isActive ? 'is-active' : ''}" data-gem-timer="${item.id}">
              ${isActive ? `Active ${mm}:${ss}` : ''}
            </div>
          </div>
          <button class="${TW_SHOP_BUY_BTN} inline-flex items-center justify-center gap-1.5 ${canBuy ? '' : 'disabled'}" data-buy-gem-item="${item.id}">
            ${hudIconHtml('gem', 16, 'Gem')}
            <span>${fmtInt(item.gemCost)}</span>
          </button>
        </div>
      `;
    }).join('');

    const inspHtml = this.buildGemShopInspectorHtml();
    this.lastShopInspectorHtml = inspHtml;

    return renderModalShell({
      title: 'Gem Shop',
      theme: 'gem-shop',
      iconHtml: hudIconHtml('gem', 26, 'Gem Shop'),
      boxClass: `w-[980px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: CG_ADS_ENABLED
        ? `<button class="ml-auto mr-1 px-3 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#2ee59d] text-[#14111d] text-[12.5px] font-black cursor-pointer hover:brightness-105 active:scale-95 whitespace-nowrap" data-action="gem-shop-ad-gems">🎬 +150 Gems (Ad)</button>`
        : undefined,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-4 gap-2.5 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-2">
            ${cards}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="gem">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

  private getSellableEntries(): SellableEntry[] {
    const entries: SellableEntry[] = [];

    const oreList = Object.entries(this.state.ores)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ def: getOreById(id), qty }))
      .filter((x): x is { def: NonNullable<ReturnType<typeof getOreById>>; qty: number } => Boolean(x.def))
      .sort((a, b) => b.def.sellValue - a.def.sellValue);

    for (const { def, qty } of oreList) {
      entries.push({
        key: `ore:${def.id}`,
        kind: 'ore',
        id: def.id,
        name: def.name,
        rarity: def.rarity,
        qty,
        totalValue: this.state.getEffectiveOreSellValue(def.id) * qty,
        artHtml: oreIconSvg(def.color, def.secondaryColor, def.rarity, `sell_${def.id}`),
      });
    }

    const minerList = Object.entries(this.state.miners)
      .map(([id]) => ({ def: getChibiById(id), sellable: this.state.getSellableMinerCount(id) }))
      .filter((x): x is { def: NonNullable<ReturnType<typeof getChibiById>>; sellable: number } => Boolean(x.def) && x.sellable > 0)
      .sort((a, b) => b.def.baseDps - a.def.baseDps);

    for (const { def, sellable } of minerList) {
      entries.push({
        key: `miner:${def.id}`,
        kind: 'miner',
        id: def.id,
        name: def.name,
        rarity: getMinerRarity(def.id),
        qty: sellable,
        totalValue: getMinerSellValue(def.id) * sellable,
        artHtml: chibiPortraitHtml(def),
      });
    }

    for (const p of PICKAXES) {
      const qty = this.state.ownedPickaxes[p.id] || 0;
      if (qty <= 0) continue;
      entries.push({
        key: `pickaxe:${p.id}`,
        kind: 'pickaxe',
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        qty,
        totalValue: getPickaxeSellValue(p.id) * qty,
        artHtml: pickaxeIconHtml(p.id, 52, p.name),
      });
    }

    return entries;
  }

  private buildSellGridAndTotals(): {
    cardsHtml: string;
    allSelected: boolean;
    selectedTotal: number;
    entries: SellableEntry[];
  } {
    const entries = this.getSellableEntries();
    const validKeys = new Set(entries.map((e) => e.key));
    for (const k of Array.from(this.sellSelected)) {
      if (!validKeys.has(k)) this.sellSelected.delete(k);
    }
    if (!this.sellInspectKey || !validKeys.has(this.sellInspectKey)) {
      this.sellInspectKey = entries[0]?.key ?? null;
    }

    let selectedTotal = 0;
    for (const e of entries) {
      if (this.sellSelected.has(e.key)) selectedTotal += e.totalValue;
    }
    const allSelected = entries.length > 0 && this.sellSelected.size === entries.length;

    const cardsHtml = entries.length
      ? entries
          .map((e) => {
            const sel = this.sellSelected.has(e.key) ? 'is-selected' : '';
            const inspCls = this.sellInspectKey === e.key ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '';
            return `
              <div class="${rarityCardClasses(e.rarity, `${sel} ${inspCls}`.trim())} !aspect-auto h-[142px] pt-1.5 px-[5px] pb-[5px] !justify-between gap-[3px]" style="${rarityVars(e.rarity)}" data-sell-key="${e.key}" title="${e.name} • ${fmtMoney(e.totalValue)} (x${fmtInt(e.qty)})">
                <div class="w-full h-[26px] shrink-0 line-clamp-2 overflow-hidden text-center text-[11.5px] font-black leading-[1.1] text-[#14111d] break-words">${e.name}</div>
                <div class="mam-card-art !relative !inset-auto flex-1 min-h-0 w-full flex items-center justify-center p-0.5 [&>.mam-3d-icon]:max-w-[56px] [&>.mam-3d-icon]:max-h-[56px] [&>.mam-3d-icon]:w-auto [&>.mam-3d-icon]:h-auto [&_svg]:max-w-[56px] [&_svg]:max-h-[56px] [&_svg]:w-auto [&_svg]:h-auto [&_.mam-chibi-portrait_img]:max-w-[60px] [&_.mam-chibi-portrait_img]:max-h-[60px]">${e.artHtml}</div>
                <div class="w-full shrink-0 flex flex-col items-center gap-px pt-[3px] px-0.5 pb-0.5 rounded-lg bg-[#fcecc8] border-t-2 border-[#14111d]">
                  <span class="mam-card-val !text-[12px] !leading-[1.08] whitespace-nowrap">${fmtMoney(e.totalValue)}</span>
                  <span class="mam-card-qty !text-[10.5px] !leading-[1.08] whitespace-nowrap !text-[#14111d]">x${fmtInt(e.qty)}</span>
                </div>
              </div>
            `;
          })
          .join('')
      : '<div class="mam-placeholder-well col-span-full text-center py-10 px-4 text-[#5b526e] text-[15px] font-black">Nothing to sell. Collect Ores, Miners, or Pickaxes first!</div>';

    return { cardsHtml, allSelected, selectedTotal, entries };
  }

  public renderSellShopModal(): string {
    const { cardsHtml, allSelected, selectedTotal, entries } = this.buildSellGridAndTotals();
    this.lastSellCardsHtml = cardsHtml;
    const inspHtml = this.buildSellShopInspectorHtml(entries);
    this.lastShopInspectorHtml = inspHtml;

    return renderModalShell({
      title: 'Sell',
      theme: 'sell-shop',
      iconHtml: hudIconHtml('trade', 26, 'Sell'),
      boxClass: `w-[980px] ${TW_SHOP_MODAL_RESP}`,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 gap-2 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-3" data-sell-grid="true">
            ${cardsHtml}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="sell">
            ${inspHtml}
          </div>
        </div>
        <div class="grid grid-cols-[180px_1fr] gap-3 mt-0.5 @max-[720px]:grid-cols-[1fr_1.4fr] @max-[720px]:gap-2">
          <button class="relative overflow-hidden h-11 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] text-[#14111d] text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.97] hover:-rotate-1 active:scale-[0.95]" data-action="sell-select-all">
            ${allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button class="mam-sheen-hover relative overflow-hidden h-11 rounded-xl border-[2.5px] border-[#14111d] bg-[#2ee59d] text-[#14111d] text-[16px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.98] hover:rotate-1 active:scale-[0.95]" data-action="sell-selected">
            ${selectedTotal > 0 ? `Sell (${fmtMoney(selectedTotal)})` : 'Sell'}
          </button>
        </div>
      `,
    });
  }

  public toggleSellSelectAll(root: HTMLElement): void {
    const entries = this.getSellableEntries();
    if (entries.length > 0 && this.sellSelected.size === entries.length) {
      this.sellSelected.clear();
    } else {
      this.sellSelected = new Set(entries.map((e) => e.key));
    }
    this.updateSellShopLive(root);
  }

  public sellSelectedItems(root: HTMLElement): void {
    if (this.sellSelected.size === 0) {
      audio.playSfx('ui-error');
      this.pushToast('Select items to sell!');
      return;
    }
    const keys = Array.from(this.sellSelected);
    this.sellSelected.clear();
    const totalEarned = this.state.sellBatch(keys);
    if (totalEarned > 0) {
      audio.playSfx('coin');
      this.pushToast(`Sold for +${fmtMoney(totalEarned)}!`);
    } else {
      audio.playSfx('ui-error');
      this.updateSellShopLive(root);
    }
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-inspect-pickaxe]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.inspectPickaxe;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.shopInspectPickaxeId = id;
        this.refreshInspectorLive(root);
      });
    });

    root.querySelectorAll('[data-inspect-gem]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.inspectGem;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.shopInspectGemId = id;
        this.refreshInspectorLive(root);
      });
    });

    root.querySelectorAll('[data-premium-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        const nextTab = (el as HTMLElement).dataset.premiumTab;
        if (nextTab !== 'twin' && nextTab !== 'novel') return;
        if (this.premiumShopTab === nextTab) return;
        audio.playSfx('ui-tab');
        this.premiumShopTab = nextTab;
        const first = getPremiumShopItemsByRarity(nextTab)[0];
        if (first) this.shopInspectPremiumId = first.chibiId;
        this.onRequestRender?.();
      });
    });

    root.querySelectorAll('[data-inspect-premium]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.inspectPremium;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.shopInspectPremiumId = id;
        this.refreshInspectorLive(root);
      });
    });

    const shopPanel = root.querySelector<HTMLElement>('[data-shop-inspector]');
    if (shopPanel) this.lastShopInspectorHtml = shopPanel.innerHTML;

    this.bindInspectorEvents(root, root);
    this.bindSellGridEvents(root, root);
  }

  private bindInspectorEvents(root: HTMLElement, scope: ParentNode): void {
    scope.querySelectorAll('[data-buy-pickaxe]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.buyPickaxe;
        if (!id) return;
        this.shopInspectPickaxeId = id;
        const res = this.state.buyPickaxe(id);
        if (res === 'bought') {
          audio.playSfx('equip-pick');
          this.pushToast('Pickaxe purchased!');
        } else if (res === 'locked') {
          const p = getPickaxeById(id);
          const reqWorldName = p ? getWorldById(p.worldId).name : 'next World';
          audio.playSfx('ui-error');
          this.pushToast(`Unlock ${reqWorldName} first!`);
        } else if (res === 'sold_out') {
          audio.playSfx('ui-error');
          this.pushToast('Sold out! Wait for restock.');
        } else {
          audio.playSfx('ui-error');
          this.pushToast('Not enough Cash!');
        }
        this.updatePickaxeShopLive(root);
      });
    });

    scope.querySelectorAll('[data-buy-gem-item]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.buyGemItem;
        if (!id) return;
        this.shopInspectGemId = id;
        const def = getGemShopItemById(id);
        const res = this.state.buyGemShopItem(id);
        if (res === 'bought') {
          audio.playSfx('coin-alt');
          this.pushToast(`${def?.name ?? 'Potion'} added to Backpack!`);
        } else {
          audio.playSfx('ui-error');
          this.pushToast('Not enough Gems!');
        }
        this.updateGemShopLive(root);
      });
    });

    scope.querySelectorAll('[data-buy-premium-item]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.twinCutscene.getState()) return;
        const chibiId = (el as HTMLElement).dataset.buyPremiumItem;
        if (!chibiId) return;
        this.shopInspectPremiumId = chibiId;
        const chibi = getChibiById(chibiId);
        const res = this.state.buyPremiumShopItem(chibiId);
        if (res === 'bought') {
          const ownedCount = this.state.miners[chibiId] || 1;
          this.updatePremiumShopLive(root);
          this.twinCutscene.start(
            chibiId,
            ownedCount,
            () => {
              audio.playSfx('ui-click');
              const label = chibi?.rarity === 'novel' ? 'Novel Chibi' : 'Twin Chibi';
              this.pushToast(`✨ ${chibi?.name ?? label} unlocked!`);
              this.onRequestRender?.();
            },
            this.state.getEffectiveChibiDps(chibiId)
          );
          return;
        }
        if (res === 'no_gems') {
          audio.playSfx('ui-error');
          this.pushToast('Not enough Gems!');
        } else if (res === 'no_coins') {
          audio.playSfx('ui-error');
          this.pushToast('Not enough Spire Coins!');
        }
        this.updatePremiumShopLive(root);
      });
    });

    scope.querySelector('[data-action="gem-shop-ad-gems"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cgRequestRewardedAd(
        () => {
          const gained = this.state.grantAdGems(150);
          audio.playSfx('coin-alt');
          this.pushToast(`+${fmtInt(gained)} Free Gems!`);
          this.updateGemShopLive(root);
        },
        () => {
          audio.playSfx('ui-error');
          this.pushToast('Ad not available right now.');
        },
        (muted) => audio.setAdMuted(muted)
      );
    });

    scope.querySelectorAll('[data-insp-shop-use-gem]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.inspShopUseGem;
        if (!id) return;
        this.shopInspectGemId = id;
        const def = getGemShopItemById(id);
        if (this.state.useGemPotion(id)) {
          audio.playSfx('potion');
          this.pushToast(`${def?.name ?? 'Potion'} activated (${def?.durationLabel ?? ''})!`);
          this.updateGemShopLive(root);
        }
      });
    });

    scope.querySelectorAll('[data-insp-sell-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (el as HTMLElement).dataset.inspSellToggle;
        if (!key) return;
        this.sellInspectKey = key;
        if (this.sellSelected.has(key)) this.sellSelected.delete(key);
        else this.sellSelected.add(key);
        this.updateSellShopLive(root);
      });
    });
  }

  private bindSellGridEvents(root: HTMLElement, scope: ParentNode): void {
    scope.querySelectorAll('[data-inspect-sell-only]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (el as HTMLElement).dataset.inspectSellOnly;
        if (!key) return;
        this.sellInspectKey = key;
        this.refreshInspectorLive(root);
      });
    });

    scope.querySelectorAll('[data-sell-key]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = (el as HTMLElement).dataset.sellKey;
        if (!key) return;
        this.sellInspectKey = key;
        if (this.sellSelected.has(key)) this.sellSelected.delete(key);
        else this.sellSelected.add(key);
        this.updateSellShopLive(root);
      });
    });
  }

  public refreshInspectorLive(root: HTMLElement): void {
    const panel = root.querySelector<HTMLElement>('[data-shop-inspector]');
    if (!panel) return;
    const mode = panel.dataset.shopInspector;
    let nextHtml = '';
    if (mode === 'pickaxe') {
      nextHtml = this.buildPickaxeInspectorHtml();
      root.querySelectorAll<HTMLElement>('[data-inspect-pickaxe]').forEach((el) => {
        applyInspectRing(el, el.dataset.inspectPickaxe === this.shopInspectPickaxeId);
      });
    } else if (mode === 'gem') {
      nextHtml = this.buildGemShopInspectorHtml();
      root.querySelectorAll<HTMLElement>('[data-inspect-gem]').forEach((el) => {
        applyInspectRing(el, el.dataset.inspectGem === this.shopInspectGemId);
      });
    } else if (mode === 'premium') {
      nextHtml = this.buildPremiumShopInspectorHtml();
      root.querySelectorAll<HTMLElement>('[data-inspect-premium]').forEach((el) => {
        applyInspectRing(el, el.dataset.inspectPremium === this.shopInspectPremiumId);
      });
    } else if (mode === 'sell') {
      const entries = this.getSellableEntries();
      nextHtml = this.buildSellShopInspectorHtml(entries);
      root.querySelectorAll<HTMLElement>('[data-sell-key]').forEach((el) => {
        applyInspectRing(el, el.dataset.sellKey === this.sellInspectKey);
      });
    } else {
      return;
    }
    if (this.lastShopInspectorHtml !== nextHtml) {
      this.lastShopInspectorHtml = nextHtml;
      panel.innerHTML = nextHtml;
      this.bindInspectorEvents(root, panel);
    }
  }

  public updatePickaxeShopLive(root: HTMLElement): void {
    for (const p of PICKAXES) {
      const locked = !this.state.isWorldUnlocked(p.worldId);
      const reqWorld = getWorldById(p.worldId);
      const stock = this.state.pickaxeStock[p.id] ?? 0;
      const soldOut = stock <= 0;
      const canBuy = !locked && !soldOut && this.state.cash >= p.cost;
      const btn = root.querySelector<HTMLElement>(`[data-buy-pickaxe="${p.id}"]`);
      if (!btn) continue;
      btn.classList.toggle('sold-out', !locked && soldOut);
      btn.classList.toggle('disabled', locked || (!soldOut && !canBuy));
      const meta = btn.closest('[data-shop-item-card="true"]')?.querySelector<HTMLElement>('[data-shop-meta="true"]');
      if (meta) {
        meta.classList.toggle('is-sold-out', !locked && soldOut);
        meta.textContent = locked ? `Unlock ${reqWorld.name}` : soldOut ? 'Sold out' : `${fmtInt(stock)} in stock`;
      }
    }
    this.refreshInspectorLive(root);
  }

  public updateGemShopLive(root: HTMLElement): void {
    for (const item of GEM_SHOP_ITEMS) {
      const inBag = this.state.others[item.id] || 0;
      const canBuy = this.state.gems >= item.gemCost;
      const btn = root.querySelector<HTMLElement>(`[data-buy-gem-item="${item.id}"]`);
      if (btn) btn.classList.toggle('disabled', !canBuy);
      const bagEl = root.querySelector<HTMLElement>(`[data-gem-bag="${item.id}"]`);
      if (bagEl) bagEl.textContent = inBag > 0 ? `In Bag: x${fmtInt(inBag)}` : '';
    }
    refreshPotionTimersInDom(root, this.state);
    this.refreshInspectorLive(root);
  }

  public updatePremiumShopLive(root: HTMLElement): void {
    const coinsEl = root.querySelector<HTMLElement>('[data-premium-shop-coins="true"]');
    if (coinsEl) coinsEl.textContent = fmtInt(this.state.towerCoins);
    const gemsEl = root.querySelector<HTMLElement>('[data-premium-shop-gems="true"]');
    if (gemsEl) gemsEl.textContent = fmtInt(this.state.gems);
    for (const item of ALL_PREMIUM_SHOP_ITEMS) {
      const owned = this.state.miners[item.chibiId] || 0;
      const canBuy = this.canAffordPremiumItem(item);
      const btn = root.querySelector<HTMLElement>(`[data-buy-premium-item="${item.chibiId}"]`);
      if (btn) btn.classList.toggle('disabled', !canBuy);
      const ownedEl = root.querySelector<HTMLElement>(`[data-premium-owned="${item.chibiId}"]`);
      if (ownedEl) ownedEl.textContent = owned > 0 ? `Owned: x${fmtInt(owned)}` : 'Not Owned';
    }
    this.refreshInspectorLive(root);
  }

  public updateSellShopLive(root: HTMLElement): void {
    const { cardsHtml, allSelected, selectedTotal } = this.buildSellGridAndTotals();
    const grid = root.querySelector<HTMLElement>('[data-sell-grid="true"]');
    if (grid && this.lastSellCardsHtml !== cardsHtml) {
      const prevScroll = grid.scrollTop;
      this.lastSellCardsHtml = cardsHtml;
      grid.innerHTML = cardsHtml;
      grid.scrollTop = prevScroll;
      this.bindSellGridEvents(root, grid);
    } else if (grid) {
      grid.querySelectorAll<HTMLElement>('[data-sell-key]').forEach((el) => {
        const k = el.dataset.sellKey;
        if (k) el.classList.toggle('is-selected', this.sellSelected.has(k));
      });
    }

    const selectBtn = root.querySelector<HTMLElement>('[data-action="sell-select-all"]');
    if (selectBtn) selectBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    const confirmBtn = root.querySelector<HTMLElement>('[data-action="sell-selected"]');
    if (confirmBtn) confirmBtn.textContent = selectedTotal > 0 ? `Sell (${fmtMoney(selectedTotal)})` : 'Sell';
    this.refreshInspectorLive(root);
  }
}
