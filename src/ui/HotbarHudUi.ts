import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { SceneMode } from '../game3d/MineScene3D';
import { getMinerRarity, getMinerSellValue, getOreById, ItemRarity } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtMoney, fmtShort } from '../game/NumberFormat';
import { hudIconHtml, oreIconSvg } from './HudIcons';
import {
  chibiPortraitHtml,
  ModalKind,
  PlotDropOps,
  rarityCardClasses,
  rarityVars,
  TW_HOTBAR_NUM,
  TW_HOTBAR_SLOT,
} from './HudShared';

interface ActiveHotbarDrag {
  fromSlot: number;
  itemId: string;
  isMiner: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  rectW: number;
  rectH: number;
  active: boolean;
  hoverSlot: number | null;
  hoverPlot: number | null;
  sourceEl: HTMLElement;
  ghostEl: HTMLElement | null;
  badgeEl: HTMLElement | null;
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
  onCancel: () => void;
}

/** Computes a compact key capturing hotbar slot items, quantities/sell values, and selection. */
export function buildHotbarStateKey(state: GameState): string {
  return `${state.hotbar
    .map((id) => {
      if (!id) return '';
      if (getChibiById(id)) return `${id}:${state.miners[id] || 0}:${getMinerSellValue(id)}`;
      if (getOreById(id)) return `${id}:${state.ores[id] || 0}:${state.getEffectiveOreSellValue(id)}`;
      return id;
    })
    .join(',')}|${state.selectedHotbarSlot}`;
}

/** Returns true only when dropping a hotbar miner directly onto a 3D plot is allowed. */
export function canDropHotbarOnPlot(ctx: {
  sceneMode: SceneMode;
  activeModal: ModalKind;
  inspectedSlot: number | null;
}): boolean {
  return ctx.sceneMode === 'mine' && ctx.activeModal === 'none' && ctx.inspectedSlot === null;
}

/** Builds HTML for the Hotbar backpack/inventory toggle button (`). */
export function renderHotbarBagButtonHtml(activeModal: ModalKind): string {
  const bagBorder =
    activeModal === 'inventory'
      ? 'border-[#4ade80]/80 bg-[linear-gradient(160deg,rgba(34,197,94,0.85)_0%,rgba(21,128,61,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_16px_rgba(74,222,128,0.45)]'
      : 'border-[#60a5fa]/60 bg-[linear-gradient(160deg,rgba(37,99,235,0.75)_0%,rgba(15,23,42,0.9)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.45)]';
  return `
      <button class="${TW_HOTBAR_SLOT} backdrop-blur-md border-[1.5px] ${bagBorder}" data-action="toggle-inventory" title="Inventory (\`)">
        <span class="${TW_HOTBAR_NUM} mam-outline-sm">\`</span>
        <div class="mam-card-art">${hudIconHtml('backpack', 44, 'Backpack')}</div>
      </button>
    `;
}

/** Builds HTML for the 9 hotbar item/miner slots. */
export function renderHotbarSlotsHtml(state: GameState): string {
  return state.hotbar
    .map((itemId, idx) => {
      const isSelected = state.selectedHotbarSlot === idx;
      const selectedCls = isSelected
        ? 'shadow-[0_0_0_2.5px_#facc15,0_4px_12px_rgba(250,204,21,0.45)]'
        : 'shadow-[0_3px_0_rgba(0,0,0,0.55)]';
      const emptySlot = `
          <button class="${TW_HOTBAR_SLOT} mam-empty-slot select-none touch-none [&>*]:pointer-events-none ${selectedCls}" data-hotbar="${idx}">
            <span class="${TW_HOTBAR_NUM} mam-outline-sm">${idx + 1}</span>
          </button>
        `;
      if (!itemId) return emptySlot;

      let rarity: ItemRarity;
      let title: string;
      let artHtml: string;
      let worth: number;
      let qty: number;

      const chibi = getChibiById(itemId);
      if (chibi) {
        rarity = getMinerRarity(chibi.id);
        title = chibi.name;
        artHtml = chibiPortraitHtml(chibi, { draggable: false });
        worth = getMinerSellValue(chibi.id);
        qty = state.miners[chibi.id] || 0;
      } else {
        const ore = getOreById(itemId);
        if (!ore) return emptySlot;
        rarity = ore.rarity;
        title = ore.name;
        artHtml = oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `hb_${idx}_${ore.id}`);
        worth = state.getEffectiveOreSellValue(ore.id);
        qty = state.ores[ore.id] || 0;
      }

      if (qty <= 0) return emptySlot;

      return `
          <button class="${TW_HOTBAR_SLOT} cursor-grab active:cursor-grabbing select-none touch-none [&>*]:pointer-events-none ${rarityCardClasses(rarity, selectedCls)}" style="${rarityVars(rarity)}" data-hotbar="${idx}" title="${title} (Worth ${fmtMoney(worth)}) • Drag to move">
            <span class="${TW_HOTBAR_NUM} mam-outline-sm">${idx + 1}</span>
            ${qty > 1 ? `<span class="absolute top-0.5 right-[4px] text-[10px] font-extrabold tabular-nums text-white z-[3] mam-outline-sm">x${fmtShort(qty)}</span>` : ''}
            <div class="mam-card-art">${artHtml}</div>
            <div class="mam-card-bottom mt-auto">
              <span class="mam-card-val mam-outline-sm">${fmtMoney(worth)}</span>
            </div>
          </button>
        `;
    })
    .join('');
}

/** Manages the bottom Hotbar 1-9 bar, Bag button, and pointer drag-and-drop to plots. */
export class HotbarHudUi {
  private lastHotbarKey = '';
  private hotbarDrag: ActiveHotbarDrag | null = null;
  private suppressHotbarClickUntil = 0;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onToggleInventory: () => void,
    private readonly canDropOnPlot: () => boolean,
    private readonly getActiveModal: () => ModalKind,
    private readonly plotDropOps?: PlotDropOps
  ) {}

  public mountGlobalListeners(): void {
    window.addEventListener(
      'click',
      (e) => {
        if (this.state.selectedHotbarSlot === -1) return;
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest('[data-hotbar]')) return;
        this.state.clearHotbarSelection();
      },
      true
    );
  }

  public checkHotbarChanged(): boolean {
    const hotbarKey = buildHotbarStateKey(this.state);
    const changed = hotbarKey !== this.lastHotbarKey;
    this.lastHotbarKey = hotbarKey;
    return changed;
  }

  public renderHotbarSection(): string {
    return `
      <div class="absolute bottom-[14px] left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] flex items-end gap-1.5 @max-[860px]:gap-1 pointer-events-auto" data-hud-hotbar="true">
        ${renderHotbarSlotsHtml(this.state)}
        ${renderHotbarBagButtonHtml(this.getActiveModal())}
      </div>
    `;
  }

  public bindEvents(root: HTMLElement): void {
    const hotbar = root.querySelector<HTMLElement>('[data-hud-hotbar="true"]');
    if (!hotbar) {
      this.cleanupHotbarDrag(root);
      return;
    }
    this.bindHotbarScope(root, hotbar);
  }

  public updateHotbarLive(root: HTMLElement): void {
    const hotbar = root.querySelector<HTMLElement>('[data-hud-hotbar="true"]');
    if (!hotbar) return;
    hotbar.innerHTML = `${renderHotbarSlotsHtml(this.state)}${renderHotbarBagButtonHtml(this.getActiveModal())}`;
    this.bindHotbarScope(root, hotbar);
  }

  private cleanupHotbarDrag(root: HTMLElement): void {
    const drag = this.hotbarDrag;
    if (!drag) return;
    this.hotbarDrag = null;
    window.removeEventListener('pointermove', drag.onMove);
    window.removeEventListener('pointerup', drag.onUp);
    window.removeEventListener('pointercancel', drag.onCancel);
    window.removeEventListener('blur', drag.onCancel);
    drag.sourceEl.classList.remove('mam-hotbar-dragging');
    root.querySelectorAll('.mam-hotbar-drop-target').forEach((n) => {
      n.classList.remove('mam-hotbar-drop-target');
    });
    this.plotDropOps?.highlightPlot(null);
    drag.ghostEl?.remove();
  }

  private updateHotbarDropHighlight(root: HTMLElement, targetSlot: number | null): void {
    if (!this.hotbarDrag || this.hotbarDrag.hoverSlot === targetSlot) return;
    if (this.hotbarDrag.hoverSlot !== null) {
      root
        .querySelector(`[data-hotbar="${this.hotbarDrag.hoverSlot}"]`)
        ?.classList.remove('mam-hotbar-drop-target');
    }
    this.hotbarDrag.hoverSlot = targetSlot;
    if (targetSlot !== null) {
      root
        .querySelector(`[data-hotbar="${targetSlot}"]`)
        ?.classList.add('mam-hotbar-drop-target');
    }
  }

  private updateHotbarPlotDropPreview(plotSlot: number | null): void {
    const drag = this.hotbarDrag;
    if (!drag) return;
    if (drag.hoverPlot !== plotSlot) {
      drag.hoverPlot = plotSlot;
      this.plotDropOps?.highlightPlot(drag.isMiner ? plotSlot : null);
    }
    const badge = drag.badgeEl;
    if (!badge) return;
    if (plotSlot === null) {
      badge.classList.add('hidden');
      return;
    }
    if (!drag.isMiner) {
      badge.className =
        'absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide whitespace-nowrap text-white shadow-lg border border-white/30 bg-rose-600/95 mam-outline-sm';
      badge.textContent = 'MINER ONLY';
      return;
    }
    const isOccupied = Boolean(this.state.plotMiners[plotSlot]);
    badge.className = `absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide whitespace-nowrap text-white shadow-lg border border-white/35 mam-outline-sm ${
      isOccupied ? 'bg-amber-500/95' : 'bg-emerald-500/95'
    }`;
    badge.textContent = `${isOccupied ? 'SWAP' : 'EQUIP'} • PLOT #${plotSlot + 1}`;
  }

  private getHotbarSlotAtPoint(clientX: number, clientY: number): number | null {
    const hit = document.elementFromPoint(clientX, clientY);
    const slotBtn = hit?.closest<HTMLElement>('[data-hotbar]');
    if (!slotBtn) return null;
    const slot = Number(slotBtn.dataset.hotbar ?? -1);
    return Number.isInteger(slot) && slot >= 0 && slot < 9 ? slot : null;
  }

  private bindHotbarScope(root: HTMLElement, scope: ParentNode): void {
    this.cleanupHotbarDrag(root);
    scope.querySelector('[data-action="toggle-inventory"]')?.addEventListener('click', () => {
      this.onToggleInventory();
    });
    scope.querySelectorAll<HTMLElement>('[data-hotbar]').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });

      el.addEventListener('click', () => {
        if (performance.now() < this.suppressHotbarClickUntil) return;
        const slot = Number(el.dataset.hotbar ?? -1);
        this.state.selectHotbarSlot(slot);
      });

      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const fromSlot = Number(el.dataset.hotbar ?? -1);
        if (fromSlot < 0 || fromSlot >= 9) return;
        const itemId = this.state.hotbar[fromSlot];
        if (!itemId) return;

        e.stopPropagation();
        this.cleanupHotbarDrag(root);

        const isMiner = Boolean(getChibiById(itemId));
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMove = (ev: PointerEvent) => {
          const drag = this.hotbarDrag;
          if (!drag || ev.pointerId !== drag.pointerId) return;

          if (!drag.active) {
            if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 6) return;
            drag.active = true;
            drag.sourceEl.classList.add('mam-hotbar-dragging');

            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.left = `${ev.clientX - drag.offsetX}px`;
            wrapper.style.top = `${ev.clientY - drag.offsetY}px`;
            wrapper.style.width = `${drag.rectW}px`;
            wrapper.style.height = `${drag.rectH}px`;
            wrapper.style.pointerEvents = 'none';
            wrapper.style.zIndex = '9999';
            wrapper.style.overflow = 'visible';

            const ghost = drag.sourceEl.cloneNode(true) as HTMLElement;
            ghost.removeAttribute('data-hotbar');
            ghost.classList.remove('mam-hotbar-dragging', 'mam-hotbar-drop-target', 'hover:-translate-y-0.5');
            ghost.style.width = '100%';
            ghost.style.height = '100%';
            ghost.style.margin = '0';
            ghost.style.pointerEvents = 'none';
            ghost.style.transition = 'none';
            ghost.style.transform = 'scale(1.06)';
            ghost.style.boxShadow = '0 14px 28px rgba(0, 0, 0, 0.58), 0 0 0 2px rgba(56, 189, 248, 0.85)';

            const badge = document.createElement('div');
            badge.className = 'hidden';

            wrapper.appendChild(badge);
            wrapper.appendChild(ghost);
            document.body.appendChild(wrapper);
            drag.ghostEl = wrapper;
            drag.badgeEl = badge;
          }

          ev.preventDefault();
          if (drag.ghostEl) {
            drag.ghostEl.style.left = `${ev.clientX - drag.offsetX}px`;
            drag.ghostEl.style.top = `${ev.clientY - drag.offsetY}px`;
          }

          const hoveredHotbar = this.getHotbarSlotAtPoint(ev.clientX, ev.clientY);
          const validTarget = hoveredHotbar !== null && hoveredHotbar !== drag.fromSlot ? hoveredHotbar : null;
          this.updateHotbarDropHighlight(root, validTarget);

          const hoveredPlot =
            hoveredHotbar === null && this.canDropOnPlot()
              ? (this.plotDropOps?.raycastPlotAt(ev.clientX, ev.clientY) ?? null)
              : null;
          this.updateHotbarPlotDropPreview(hoveredPlot);
        };

        const onUp = (ev: PointerEvent) => {
          const drag = this.hotbarDrag;
          if (!drag || ev.pointerId !== drag.pointerId) return;
          const wasActive = drag.active;
          const origin = drag.fromSlot;
          const draggedItemId = drag.itemId;
          const dropHotbar = wasActive
            ? (this.getHotbarSlotAtPoint(ev.clientX, ev.clientY) ?? drag.hoverSlot)
            : null;
          const dropPlot =
            wasActive && dropHotbar === null && this.canDropOnPlot()
              ? (this.plotDropOps?.raycastPlotAt(ev.clientX, ev.clientY) ?? drag.hoverPlot)
              : null;

          this.cleanupHotbarDrag(root);

          if (!wasActive) return;
          this.suppressHotbarClickUntil = performance.now() + 250;

          if (dropHotbar !== null) {
            if (dropHotbar !== origin) {
              this.state.swapHotbarSlots(origin, dropHotbar);
            }
            return;
          }

          if (dropPlot !== null) {
            const res = this.state.placeHotbarItemOnPlot(origin, dropPlot);
            const chibi = getChibiById(draggedItemId);
            const name = chibi?.name ?? 'Miner';
            if (res === 'placed') {
              this.plotDropOps?.pulsePlot(dropPlot);
              this.pushToast(`Placed ${name} on Plot #${dropPlot + 1}`);
            } else if (res === 'replaced') {
              this.plotDropOps?.pulsePlot(dropPlot);
              this.pushToast(`Swapped ${name} onto Plot #${dropPlot + 1}!`);
            } else if (res === 'same') {
              this.plotDropOps?.pulsePlot(dropPlot);
              this.pushToast(`${name} is already on Plot #${dropPlot + 1}`);
            } else if (res === 'limit') {
              audio.playSfx('ui-error');
              this.pushToast(`All owned ${name} are already on Plots!`);
            } else if (res === 'not-miner') {
              this.pushToast('Only Miners can be placed on Plots!');
            }
          }
        };

        const onCancel = () => {
          if (this.hotbarDrag?.active) {
            this.suppressHotbarClickUntil = performance.now() + 250;
          }
          this.cleanupHotbarDrag(root);
        };

        this.hotbarDrag = {
          fromSlot,
          itemId,
          isMiner,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          offsetX,
          offsetY,
          rectW: rect.width,
          rectH: rect.height,
          active: false,
          hoverSlot: null,
          hoverPlot: null,
          sourceEl: el,
          ghostEl: null,
          badgeEl: null,
          onMove,
          onUp,
          onCancel,
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel);
      });
    });
  }
}
