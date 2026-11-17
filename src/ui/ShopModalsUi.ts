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
  ItemRarity,
  PICKAXES,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { gemPotionIconHtml, hudIconHtml, oreIconSvg, pickaxeIconHtml } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  refreshPotionTimersInDom,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  TW_MODAL_GRID_BASE,
  TW_SHOP_BUY_BTN,
  TW_SHOP_MODAL_RESP,
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
  private sellInspectKey: string | null = null;
  private lastSellCardsHtml = '';
  private lastShopInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void
  ) {}

  private buildPickaxeInspectorHtml(): string {
    const p = getPickaxeById(this.shopInspectPickaxeId) ?? PICKAXES[0];
    this.shopInspectPickaxeId = p.id;
    const stock = this.state.pickaxeStock[p.id] ?? 0;
    const soldOut = stock <= 0;
    const canBuy = !soldOut && this.state.cash >= p.cost;
    const ownedBag = this.state.ownedPickaxes[p.id] || 0;
    const equippedCount = this.state.plotUnits.filter((u) => u?.pickaxeId === p.id).length;

    return renderInspectorPanel({
      rarity: p.rarity,
      title: p.name,
      subtitle: 'Pickaxe Upgrade',
      badgesHtml: `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${soldOut ? 'bg-[#7f1d1d]/50 border-[#ef4444]/60 text-[#fca5a5]' : 'bg-[#14532d]/50 border-[#4ade80]/60 text-[#86efac]'}">${soldOut ? 'Sold Out' : `${fmtInt(stock)} Left`}</span>`,
      artHtml: pickaxeIconHtml(p.id, 84, p.name),
      stats: [
        ['Power', `${p.dmgMult}x DMG`, 'text-[#38bdf8]'],
        ['Cost', p.cost === 0 ? 'Free' : fmtMoney(p.cost), 'text-[#facc15]'],
        ['Owned', `x${fmtInt(ownedBag)} (+${fmtInt(equippedCount)} eq)`, 'text-white'],
        ['Resell', fmtMoney(getPickaxeSellValue(p.id)), 'text-[#4ade80]'],
      ],
      actionHtml: `
        <button class="${TW_SHOP_BUY_BTN} !h-10 !text-[15px] mam-outline-sm ${soldOut ? 'sold-out' : canBuy ? '' : 'disabled'}" data-buy-pickaxe="${p.id}">
          ${soldOut ? 'Sold Out' : p.cost === 0 ? 'Claim Free' : `Buy • ${fmtMoney(p.cost)}`}
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
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#14532d]/60 border border-[#4ade80]/70 text-[#86efac] tabular-nums">Active ${mm}:${ss}</span>`
        : '',
      artHtml: gemPotionIconHtml(item.id, 84, item.name, item.color),
      stats: [
        ['Effect', item.effectText, 'text-[#4ade80]'],
        ['Duration', item.durationLabel, 'text-[#7dd3fc]'],
        ['Price', `${fmtInt(item.gemCost)} Gems`, 'text-[#67e8f9]'],
        ['In Bag', `x${fmtInt(inBag)}`, 'text-white'],
      ],
      actionHtml: `
        <button class="${TW_SHOP_BUY_BTN} !h-10 !text-[14px] inline-flex items-center justify-center gap-1.5 mam-outline-sm ${canBuy ? '' : 'disabled'}" data-buy-gem-item="${item.id}">
          ${hudIconHtml('gem', 16, 'Gem')}
          <span>Buy • ${fmtInt(item.gemCost)}</span>
        </button>
        ${
          inBag > 0
            ? `<button class="w-full h-9 rounded-[7px] border-2 border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8_0%,#0284c7_100%)] shadow-[0_3px_0_#075985] text-white text-[13px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-insp-shop-use-gem="${item.id}">Use from Bag (x${fmtInt(inBag)})</button>`
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
      badgesHtml: `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${isSel ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#cbd5e1]'}">${isSel ? 'Selected' : 'Not Selected'}</span>`,
      artHtml: entry.artHtml,
      stats: [
        ['Unit Value', fmtMoney(unitVal), 'text-[#4ade80]'],
        ['Sellable Qty', `x${fmtInt(entry.qty)}`, 'text-white'],
        ['Stack Total', fmtMoney(entry.totalValue), 'text-[#facc15]'],
        ['Status', isSel ? 'Queued' : 'Hold', isSel ? 'text-[#4ade80]' : 'text-[#94a3b8]'],
      ],
      actionHtml: `
        <button class="w-full h-10 rounded-[7px] border-2 ${isSel ? 'border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)] shadow-[0_3px_0_#7c2d12]' : 'border-[#14532d] bg-[linear-gradient(180deg,#4ade80,#16a34a)] shadow-[0_3px_0_#14532d]'} text-white text-[14px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-insp-sell-toggle="${entry.key}">
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
      const stock = this.state.pickaxeStock[p.id] ?? 0;
      const soldOut = stock <= 0;
      const canBuy = !soldOut && this.state.cash >= p.cost;
      const isInspected = this.shopInspectPickaxeId === p.id;
      const bgCls =
        p.rarity === 'rainbow' || p.rarity === 'exotic' || p.rarity === 'secret'
          ? ''
          : 'bg-[radial-gradient(circle_at_50%_24%,var(--rarity-bg,rgba(71,85,105,0.28)),rgba(20,24,31,0.96)_72%)]';
      return `
        <div class="${rarityCardClasses(p.rarity, isInspected ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_14px_rgba(56,189,248,0.45)]' : '')} !aspect-auto min-h-[192px] pt-2.5 px-2 pb-[9px] gap-1.5 !justify-start ${bgCls}" style="${rarityVars(p.rarity)}" data-shop-item-card="true" data-inspect-pickaxe="${p.id}">
          <div class="mam-card-art !relative !inset-auto w-full h-[70px] shrink-0 flex items-center justify-center">${pickaxeIconHtml(p.id, 66, p.name)}</div>
          <div class="w-full flex flex-col items-center gap-0.5 min-h-0">
            <div class="w-full px-0.5 text-center text-[14px] font-black leading-[1.18] text-white whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm" title="${p.name}">${p.name}</div>
            <div class="text-[11px] font-extrabold leading-[1.15] text-[#38bdf8] text-center mam-outline-sm">${p.dmgMult}x DMG</div>
            <div class="text-[12px] font-extrabold leading-[1.15] text-[#cbd5e1] text-center [&.is-sold-out]:text-[#f87171] mam-outline-sm ${soldOut ? 'is-sold-out' : ''}" data-shop-meta="true">
              ${soldOut ? 'Sold out' : `${fmtInt(stock)} in stock`}
            </div>
          </div>
          <button class="${TW_SHOP_BUY_BTN} mam-outline-sm ${soldOut ? 'sold-out' : canBuy ? '' : 'disabled'}" data-buy-pickaxe="${p.id}">
            ${p.cost === 0 ? 'Free' : fmtMoney(p.cost)}
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
      headerExtraHtml: `<div class="ml-auto mr-1 text-[17px] font-black tabular-nums text-[#facc15] whitespace-nowrap @max-[720px]:text-[14px] mam-outline-sm" data-restock-timer="true">Restock in ${mm}:${ss}</div>`,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-4 gap-2.5 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-2" data-shop-grid="true">
            ${cards}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="pickaxe">
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
      const bgCls =
        item.rarity === 'rainbow'
          ? ''
          : 'bg-[radial-gradient(circle_at_50%_24%,var(--rarity-bg,rgba(71,85,105,0.28)),rgba(20,24,31,0.96)_72%)]';
      return `
        <div class="${rarityCardClasses(item.rarity, isInspected ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_14px_rgba(56,189,248,0.45)]' : '')} !aspect-auto min-h-[214px] pt-2.5 px-2 pb-[9px] gap-1.5 !justify-start ${bgCls}" style="${rarityVars(item.rarity)}" data-inspect-gem="${item.id}">
          <div class="mam-card-art !relative !inset-auto w-full h-[70px] shrink-0 flex items-center justify-center">${gemPotionIconHtml(item.id, 68, item.name, item.color)}</div>
          <div class="w-full flex flex-col items-center gap-0.5 min-h-0">
            <div class="w-full px-0.5 text-center text-[14px] font-black leading-[1.18] text-white whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm" title="${item.name}">${item.name}</div>
            <div class="text-[11px] font-extrabold leading-[1.2] text-[#e2e8f0] text-center mam-outline-sm">
              ${item.effectText}<br/>${item.durationLabel}
            </div>
            <div class="min-h-[14px] text-[11px] font-black text-[#38bdf8] text-center mam-outline-sm" data-gem-bag="${item.id}">
              ${inBag > 0 ? `In Bag: x${fmtInt(inBag)}` : ''}
            </div>
            <div class="min-h-[14px] text-[11px] font-black tabular-nums text-[#4ade80] text-center mam-outline-sm ${isActive ? 'is-active' : ''}" data-gem-timer="${item.id}">
              ${isActive ? `Active ${mm}:${ss}` : ''}
            </div>
          </div>
          <button class="${TW_SHOP_BUY_BTN} inline-flex items-center justify-center gap-1.5 mam-outline-sm ${canBuy ? '' : 'disabled'}" data-buy-gem-item="${item.id}">
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
        ? `<button class="ml-auto mr-1 px-3 py-1.5 rounded-xl border border-emerald-300/50 bg-[linear-gradient(135deg,rgba(16,185,129,0.9),rgba(4,120,87,0.95))] text-white text-[12.5px] font-black cursor-pointer hover:brightness-110 active:scale-95 whitespace-nowrap mam-outline-sm" data-action="gem-shop-ad-gems">🎬 +150 Gems (Ad)</button>`
        : undefined,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-4 gap-2.5 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-2">
            ${cards}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="gem">
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
            const inspCls = this.sellInspectKey === e.key ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : '';
            return `
              <div class="${rarityCardClasses(e.rarity, `${sel} ${inspCls}`.trim())} !aspect-auto h-[142px] pt-1.5 px-[5px] pb-[5px] !justify-between gap-[3px]" style="${rarityVars(e.rarity)}" data-sell-key="${e.key}" title="${e.name} • ${fmtMoney(e.totalValue)} (x${fmtInt(e.qty)})">
                <div class="w-full h-[26px] shrink-0 line-clamp-2 overflow-hidden text-center text-[11.5px] font-black leading-[1.1] text-white break-words mam-outline-sm">${e.name}</div>
                <div class="mam-card-art !relative !inset-auto flex-1 min-h-0 w-full flex items-center justify-center p-0.5 [&>.mam-3d-icon]:max-w-[56px] [&>.mam-3d-icon]:max-h-[56px] [&>.mam-3d-icon]:w-auto [&>.mam-3d-icon]:h-auto [&_svg]:max-w-[56px] [&_svg]:max-h-[56px] [&_svg]:w-auto [&_svg]:h-auto [&_.mam-chibi-portrait_img]:max-w-[60px] [&_.mam-chibi-portrait_img]:max-h-[60px]">${e.artHtml}</div>
                <div class="w-full shrink-0 flex flex-col items-center gap-px pt-[3px] px-0.5 pb-0.5 rounded bg-[rgba(10,14,22,0.52)] border-t border-white/10">
                  <span class="mam-card-val !text-[12.5px] !leading-[1.08] whitespace-nowrap mam-outline-sm">${fmtMoney(e.totalValue)}</span>
                  <span class="mam-card-qty !text-[10.5px] !leading-[1.08] whitespace-nowrap !text-[#e2e8f0] mam-outline-sm">x${fmtInt(e.qty)}</span>
                </div>
              </div>
            `;
          })
          .join('')
      : '<div class="mam-placeholder-well col-span-full text-center py-10 px-4 text-[#bbf7d0] text-[15px] font-extrabold mam-outline-sm">Nothing to sell. Collect Ores, Miners, or Pickaxes first!</div>';

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
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 gap-2 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px] p-0.5 @max-[720px]:grid-cols-3" data-sell-grid="true">
            ${cardsHtml}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-shop-inspector="sell">
            ${inspHtml}
          </div>
        </div>
        <div class="grid grid-cols-[180px_1fr] gap-3 mt-0.5 @max-[720px]:grid-cols-[1fr_1.4fr] @max-[720px]:gap-2">
          <button class="relative overflow-hidden h-11 rounded-xl border border-orange-300/40 bg-[linear-gradient(135deg,rgba(249,115,22,0.88),rgba(194,65,12,0.92))] shadow-[0_8px_18px_rgba(234,88,12,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] text-white text-[15px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="sell-select-all">
            ${allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button class="mam-sheen-hover relative overflow-hidden h-11 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(34,197,94,0.92),rgba(5,150,105,0.95))] shadow-[0_8px_20px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[16px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="sell-selected">
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
      const stock = this.state.pickaxeStock[p.id] ?? 0;
      const soldOut = stock <= 0;
      const canBuy = !soldOut && this.state.cash >= p.cost;
      const btn = root.querySelector<HTMLElement>(`[data-buy-pickaxe="${p.id}"]`);
      if (!btn) continue;
      btn.classList.toggle('sold-out', soldOut);
      btn.classList.toggle('disabled', !soldOut && !canBuy);
      const meta = btn.closest('[data-shop-item-card="true"]')?.querySelector<HTMLElement>('[data-shop-meta="true"]');
      if (meta) {
        meta.classList.toggle('is-sold-out', soldOut);
        meta.textContent = soldOut ? 'Sold out' : `${fmtInt(stock)} in stock`;
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
