import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { getMinerRarity, getOreById, ItemRarity, RARITY_BORDER } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtShort } from '../game/NumberFormat';
import { hudIconHtml, oreIconSvg } from './HudIcons';
import {
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  renderModalShell,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
} from './HudShared';

export class ChestModalUi {
  private lastChestCardsHtml = '';
  private lastChestCardsKey = '';

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender: () => void
  ) {}

  private buildChestCardsKey(): string {
    const keys: string[] = [];
    for (const [id, qty] of Object.entries(this.state.chestMiners)) {
      if (qty > 0 && getChibiById(id)) keys.push(`m:${id}`);
    }
    for (const [id, qty] of Object.entries(this.state.chestOres)) {
      if (qty > 0 && getOreById(id)) {
        keys.push(`o:${id}:${this.state.isOreLocked(id) ? 1 : 0}`);
      }
    }
    return keys.join('|');
  }

  private buildChestCardsHtml(): string {
    const cards: string[] = [];
    for (const [id, qty] of Object.entries(this.state.chestMiners)) {
      if (qty <= 0) continue;
      const def = getChibiById(id);
      if (!def) continue;
      const rarity = getMinerRarity(def.id);
      cards.push(`
        <div class="${rarityCardClasses(rarity)}" style="${rarityVars(rarity)}">
          <div class="mam-card-art">
            ${chibiPortraitHtml(def)}
          </div>
          <div class="mam-card-name truncate px-1">${def.name}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-dps">${fmtShort(this.state.getEffectiveChibiDps(def.id))}</span>
            <span class="mam-card-qty" data-chest-qty="miner:${def.id}">x${fmtInt(qty)}</span>
          </div>
        </div>
      `);
    }

    for (const [id, qty] of Object.entries(this.state.chestOres)) {
      if (qty <= 0) continue;
      const def = getOreById(id);
      if (!def) continue;
      const locked = this.state.isOreLocked(def.id);
      cards.push(`
        <div class="${rarityCardClasses(def.rarity)} relative" style="${rarityVars(def.rarity)}">
          <button type="button" class="absolute top-1 right-1 z-[4] w-5 h-5 rounded-md flex items-center justify-center text-[11px] leading-none border-[1.5px] border-[#14111d] cursor-pointer transition-transform hover:scale-110 ${locked ? 'bg-[#fde047] text-[#14111d]' : 'bg-[#fff8e7] text-[#14111d] opacity-85 hover:opacity-100'}" data-chest-lock-ore="${def.id}" title="${locked ? 'Unlock Ore (allow selling)' : 'Lock Ore (protect from Auto-Sell & Sell Ores)'}">${locked ? '🔒' : '🔓'}</button>
          <div class="mam-card-art">${oreIconSvg(def.color, def.secondaryColor, def.rarity, `ch_${def.id}`)}</div>
          <div class="mam-card-name truncate px-1">${def.name}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-val">${fmtMoney(def.sellValue)}</span>
            <span class="mam-card-qty" data-chest-qty="ore:${def.id}">x${fmtInt(qty)}</span>
          </div>
        </div>
      `);
    }

    return cards.length
      ? cards.join('')
      : '<div class="mam-placeholder-well col-span-full text-center p-7 text-[#5b526e] font-black">Mine ores in the pit to fill your Chest!</div>';
  }

  private renderChestAutoSellBar(): string {
    const rarities: Array<{ id: ItemRarity; label: string }> = [
      { id: 'common', label: 'Common' },
      { id: 'uncommon', label: 'Uncommon' },
      { id: 'rare', label: 'Rare' },
      { id: 'epic', label: 'Epic' },
    ];
    const allOn = this.state.autoSell;
    const salvageOn = this.state.autoSalvageMaxedChibis;
    const pills = rarities
      .map((r) => {
        const active = allOn || this.state.isAutoSellRarity(r.id);
        const border = RARITY_BORDER[r.id];
        return `<button type="button" class="mam-pill cursor-pointer transition-all ${
          active
            ? 'text-[#14111d]'
            : 'bg-[#fcecc8] text-[#5b526e] hover:bg-[#fde047] hover:text-[#14111d]'
        }" style="${active ? `background:${border};` : ''}" data-autosell-rarity="${r.id}">${active ? '✓ ' : ''}${r.label}</button>`;
      })
      .join('');
    return `
      <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#ffffff] border-2 border-[#14111d]">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-black uppercase tracking-wider text-[#14111d] mr-1">Auto-Sell:</span>
          ${pills}
          <button type="button" class="mam-pill cursor-pointer transition-all ${
            allOn
              ? 'bg-[#2ee59d] text-[#14111d]'
              : 'bg-[#fcecc8] text-[#5b526e] hover:bg-[#fde047] hover:text-[#14111d]'
          }" data-action="chest-toggle-autosell-all">${allOn ? '✓ All Ores' : 'All Ores'}</button>
          <button type="button" class="mam-pill cursor-pointer transition-all ${
            salvageOn
              ? 'bg-[#38bdf8] text-[#14111d]'
              : 'bg-[#fcecc8] text-[#5b526e] hover:bg-[#7dd3fc] hover:text-[#14111d]'
          }" data-action="chest-toggle-autosalvage-chibis" title="Auto-convert incoming 5★ Chibi dupes into Gems (stack cap 100/Chibi)">${salvageOn ? '✓ 5★ Chibis → Gems' : '5★ Chibis → Gems'}</button>
        </div>
        <span class="text-[10px] font-bold text-[#5b526e]">🔒 Locked ores safe • Max 100/Chibi</span>
      </div>
    `;
  }

  public renderModal(): string {
    const count = this.state.getChestItemCount();
    const cap = this.state.getMaxChestCapacity();
    const pct = Math.min(100, Math.round((count / Math.max(1, cap)) * 100));
    const cardsHtml = this.buildChestCardsHtml();
    this.lastChestCardsHtml = cardsHtml;
    this.lastChestCardsKey = this.buildChestCardsKey();

    return renderModalShell({
      title: 'Chest',
      theme: 'chest',
      iconHtml: hudIconHtml('chest', 26, 'Chest'),
      boxClass: `w-[640px] ${TW_SHOP_MODAL_RESP}`,
      bodyHtml: `
        ${this.renderChestAutoSellBar()}
        <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[680px]:grid-cols-4 @max-[520px]:grid-cols-3 gap-2 flex-1 min-h-[180px]" data-chest-grid="true">
          ${cardsHtml}
        </div>

        <div class="relative h-6 rounded-full bg-[#fcecc8] border-2 border-[#14111d] overflow-hidden flex items-center justify-center">
          <div class="absolute left-0 top-0 bottom-0 bg-[#fde047] rounded-full border-r-2 border-[#14111d]" data-chest-cap-fill="true" style="width:${pct}%"></div>
          <div class="relative z-[2] text-[12px] font-black text-[#14111d] tracking-wide" data-chest-cap-text="true">${fmtInt(count)}/${fmtShort(cap)} Items</div>
        </div>

        <div class="flex flex-wrap justify-center items-center gap-3">
          <button class="mam-sheen-hover relative overflow-hidden h-11 min-w-[200px] px-6 rounded-xl border-[2.5px] border-[#14111d] bg-[#2ee59d] text-[#14111d] text-[16px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.97] hover:-rotate-1 active:scale-[0.94]" data-action="chest-take-all">Take All</button>
          <button class="mam-sheen-hover relative overflow-hidden h-11 min-w-[200px] px-6 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] text-[#14111d] text-[16px] font-black cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.97] hover:rotate-1 active:scale-[0.94]" data-action="chest-sell-ores">${this.state.isChestFullBonusReady() ? 'Sell Ores (+35%)' : 'Sell Ores'}</button>
        </div>
      `,
    });
  }

  private bindChestGridEvents(scope: ParentNode): void {
    scope.querySelectorAll('[data-chest-lock-ore]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const oreId = (el as HTMLElement).dataset.chestLockOre;
        if (!oreId) return;
        const locked = this.state.toggleOreLock(oreId);
        audio.playSfx('ui-tab');
        this.pushToast(locked ? 'Ore locked (protected from Auto-Sell)' : 'Ore unlocked');
        this.onRequestRender();
      });
    });
  }

  public bindEvents(root: HTMLElement): void {
    this.bindChestGridEvents(root);
    root.querySelectorAll('[data-autosell-rarity]').forEach((el) => {
      el.addEventListener('click', () => {
        const rarity = (el as HTMLElement).dataset.autosellRarity as ItemRarity;
        if (!rarity) return;
        const res = this.state.toggleAutoSellRarity(rarity);
        audio.playSfx(res.earned > 0 ? 'coin' : 'ui-tab');
        if (res.active && res.earned > 0) {
          this.pushToast(`Auto-Sell ${rarity} ON (+${fmtMoney(res.earned)})`);
        } else {
          this.pushToast(`Auto-Sell ${rarity} ${res.active ? 'ON' : 'OFF'}`);
        }
        this.onRequestRender();
      });
    });
    const allBtn = root.querySelector('[data-action="chest-toggle-autosell-all"]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        const earned = this.state.toggleAutoSell();
        audio.playSfx(earned > 0 ? 'coin' : 'ui-tab');
        if (this.state.autoSell && earned > 0) {
          this.pushToast(`Auto-Sell All ON (+${fmtMoney(earned)})`);
        } else {
          this.pushToast(`Auto-Sell All ${this.state.autoSell ? 'ON' : 'OFF'}`);
        }
        this.onRequestRender();
      });
    }
    const salvageBtn = root.querySelector('[data-action="chest-toggle-autosalvage-chibis"]');
    if (salvageBtn) {
      salvageBtn.addEventListener('click', () => {
        const res = this.state.toggleAutoSalvageMaxedChibis();
        audio.playSfx(res.gemsEarned > 0 ? 'coin' : 'ui-tab');
        if (res.active && res.gemsEarned > 0) {
          this.pushToast(
            `Auto-Salvage 5★ Chibis ON (+${fmtInt(res.gemsEarned)} Gems from ${fmtInt(res.salvagedCount)} dupes)`
          );
        } else {
          this.pushToast(`Auto-Salvage 5★ Chibis ${res.active ? 'ON' : 'OFF'}`);
        }
        this.onRequestRender();
      });
    }
  }

  public updateLive(root: HTMLElement): void {
    const count = this.state.getChestItemCount();
    const cap = this.state.getMaxChestCapacity();
    const pct = Math.min(100, Math.round((count / Math.max(1, cap)) * 100));

    const fill = root.querySelector<HTMLElement>('[data-chest-cap-fill="true"]');
    if (fill) fill.style.width = `${pct}%`;
    const capText = root.querySelector<HTMLElement>('[data-chest-cap-text="true"]');
    if (capText) capText.textContent = `${fmtInt(count)}/${fmtShort(cap)} Items`;
    const sellBtn = root.querySelector<HTMLElement>('[data-action="chest-sell-ores"]');
    if (sellBtn) {
      sellBtn.textContent = this.state.isChestFullBonusReady() ? 'Sell Ores (+35%)' : 'Sell Ores';
    }

    const grid = root.querySelector<HTMLElement>('[data-chest-grid="true"]');
    if (!grid) return;
    const nextKey = this.buildChestCardsKey();
    if (this.lastChestCardsKey === nextKey) {
      grid.querySelectorAll<HTMLElement>('[data-chest-qty]').forEach((el) => {
        const ref = el.dataset.chestQty;
        if (!ref) return;
        const [kind, id] = ref.split(':');
        const qty = kind === 'miner' ? this.state.chestMiners[id] || 0 : this.state.chestOres[id] || 0;
        const text = `x${fmtInt(qty)}`;
        if (el.textContent !== text) el.textContent = text;
      });
      return;
    }

    const nextHtml = this.buildChestCardsHtml();
    if (this.lastChestCardsHtml !== nextHtml) {
      const prevScroll = grid.scrollTop;
      this.lastChestCardsKey = nextKey;
      this.lastChestCardsHtml = nextHtml;
      grid.innerHTML = nextHtml;
      grid.scrollTop = prevScroll;
      this.bindChestGridEvents(grid);
    }
  }
}
