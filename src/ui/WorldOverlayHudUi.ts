import { getChibiById } from '../game3d/ChibiCatalog';
import { OreHpScreen, PlotAnchorScreen, SceneMode } from '../game3d/MineScene3D';
import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import type { PlotLabelInfo } from '../game3d/PlotPedestal3D';
import {
  AltarPedestalAnchor,
  ShopChibiBubbleAnchor,
  ShopStationAnchor,
  ShopStationId,
} from '../game3d/ShopWorld3D';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import { getEnchantById, getMinerRarity, getMutationById, RARITY_BORDER } from '../game/GameData';
import { GameSettings, gameSettings } from '../game/GameSettings';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import { getWeatherById } from '../game/WeatherData';
import { PIT_EVENT_DEFS } from '../game/PitEventsDomain';
import { enchantAuraIconHtml, meteorIconHtml } from './HudIcons';
import { ModalKind, renderRarityBadgeHtml, TW_SHOP_SIGN_BASE } from './HudShared';

export interface PlotLabelPayload {
  key: string;
  info: PlotLabelInfo | null;
}

/** Builds a cache key and 3D billboard label payload for a plot slot. */
export function buildPlotLabelPayload(state: GameState, slotIndex: number): PlotLabelPayload {
  const unit = state.getPlotUnit(slotIndex);
  const stats = state.getPlotUnitStats(slotIndex);
  const chibi = unit ? getChibiById(unit.chibiId) : null;
  if (!unit || !stats || !chibi) {
    return { key: '', info: null };
  }

  const rarity = getMinerRarity(chibi.id);
  const rarityLabel = rarity[0].toUpperCase() + rarity.slice(1);
  const mut = getMutationById(unit.mutationId);
  const enc = getEnchantById(unit.enchantId);
  const mutationLabel = mut.id !== 'normal' ? mut.name : '';
  const enchantLabel = enc ? enc.name : '';
  const dmgText = fmtShort(stats.dmg);
  const key = `${chibi.id}:${unit.damageLevel}:${rarity}:${mut.id}:${enc?.id ?? ''}:${dmgText}`;

  return {
    key,
    info: {
      name: chibi.name,
      level: unit.damageLevel,
      rarityLabel,
      rarityColor: RARITY_BORDER[rarity],
      mutationId: mut.id,
      mutationLabel,
      mutationColor: mut.color,
      mutationRainbow: mut.id === 'rainbow',
      enchantId: enc?.id ?? null,
      enchantLabel,
      enchantColor: enc?.color ?? '#fff',
      enchantRainbow: enc?.rarity === 'rainbow',
      dmgText,
    },
  };
}

/** Returns true when mine ore HP bars should be visible over the 3D scene. */
export function shouldShowMineOreBars(ctx: {
  sceneMode: SceneMode;
  inspectedSlot: number | null;
  activeModal: ModalKind;
  barCount: number;
}): boolean {
  return ctx.sceneMode === 'mine' && ctx.inspectedSlot === null && ctx.activeModal === 'none' && ctx.barCount > 0;
}

/** Returns true when Tower ore HP bars should be visible over the Tower arena. */
export function shouldShowTowerOreBars(ctx: {
  sceneMode: SceneMode;
  inspectedSlot: number | null;
  activeModal: ModalKind;
  pendingBlessings: boolean;
  barCount: number;
}): boolean {
  return (
    ctx.sceneMode === 'tower' &&
    ctx.inspectedSlot === null &&
    ctx.activeModal === 'none' &&
    !ctx.pendingBlessings &&
    ctx.barCount > 0
  );
}

/** Builds overlay HTML for Mine Pit rock and weather meteor HP bars. */
export function buildMineOreBarsHtml(bars: OreHpScreen[]): string {
  return bars
    .map((b) => {
      if (b.isMeteor) {
        const wDef = getWeatherById(b.meteorWeatherId ?? 'light_rain');
        return `
              <div class="absolute flex flex-col items-center gap-1 pointer-events-none select-none" data-ore-bar="${b.id}">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-lg bg-[#fff8e7] border-2 border-[#14111d] whitespace-nowrap">
                  ${meteorIconHtml(wDef.id, 15, wDef.name)}
                  <span class="text-[10.5px] font-black uppercase tracking-[0.06em] leading-none text-[#14111d]">${wDef.name}</span>
                  <span class="px-1 py-[1px] rounded text-[8.5px] font-black uppercase tracking-wider leading-none bg-[#fde047] text-[#14111d] border border-[#14111d]">Meteor</span>
                </div>
                <div class="relative w-[184px] @max-[720px]:w-[156px] h-[22px] rounded-lg border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center">
                  <div class="absolute left-0 top-0 bottom-0 transition-[width] duration-[80ms] ease-linear" style="background:linear-gradient(90deg,${wDef.glowColor},${wDef.accentColor})" data-ore-fill="true"></div>
                  <div class="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-[1]"></div>
                  <div class="absolute inset-0 flex justify-evenly pointer-events-none z-[1]">
                    <span class="w-px h-full bg-black/35"></span>
                    <span class="w-px h-full bg-black/35"></span>
                    <span class="w-px h-full bg-black/35"></span>
                  </div>
                  <div class="relative z-[2] text-[11px] font-black tabular-nums tracking-wide text-white leading-none mam-outline-sm" data-ore-text="true"></div>
                </div>
              </div>
            `;
      }
      if (b.pitEventKind) {
        const ev = PIT_EVENT_DEFS[b.pitEventKind];
        return `
          <div class="absolute flex flex-col items-center gap-1 pointer-events-none select-none" data-ore-bar="${b.id}">
            <div class="inline-flex items-center gap-1 px-2 py-[2px] rounded-md bg-[#fff8e7] border-2 border-[#14111d] whitespace-nowrap">
              <span class="text-[9.5px] font-black uppercase tracking-[0.06em] leading-none text-[#14111d]">${ev.badgeText}</span>
            </div>
            <div class="relative w-28 h-[17px] rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center">
              <div class="absolute left-0 top-0 bottom-0 transition-[width] duration-[80ms] ease-linear" style="background:linear-gradient(90deg,${ev.colorHex}bb,${ev.colorHex})" data-ore-fill="true"></div>
              <div class="relative z-[2] text-[10.5px] font-extrabold tabular-nums text-white leading-none mam-outline-sm" data-ore-text="true"></div>
            </div>
          </div>
        `;
      }
      return `
          <div class="absolute w-24 h-4 rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center" data-ore-bar="${b.id}">
            <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(180deg,#38bdf8,#0284c7)] transition-[width] duration-[80ms] ease-linear" data-ore-fill="true"></div>
            <div class="relative z-[2] text-[10.5px] font-extrabold tabular-nums text-white leading-none mam-outline-sm" data-ore-text="true"></div>
          </div>
        `;
    })
    .join('');
}

/** Builds overlay HTML for Tower Arena rock HP bars. */
export function buildTowerOreBarsHtml(bars: TowerOreBarScreen[]): string {
  return bars
    .map(
      (b) => `
          <div class="absolute flex flex-col items-center gap-1 pointer-events-none" data-tower-ore-bar="${b.index}">
            <div class="px-2 py-0.5 rounded-md bg-[#fff8e7] border-[1.5px] border-[#14111d] text-[10.5px] font-black leading-none whitespace-nowrap text-[#14111d]">${b.name}</div>
            <div class="w-[104px] h-[18px] rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden relative flex items-center justify-center">
              <div class="absolute left-0 top-0 bottom-0 transition-[width] duration-[60ms] ease-linear" style="background:linear-gradient(180deg,${b.color},${b.color}cc)" data-ore-fill="true"></div>
              <div class="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-[1]"></div>
              <div class="absolute inset-0 flex justify-evenly pointer-events-none z-[1]">
                <span class="w-px h-full bg-black/45"></span>
                <span class="w-px h-full bg-black/45"></span>
                <span class="w-px h-full bg-black/45"></span>
              </div>
              <div class="relative z-[2] text-[10px] font-black tabular-nums text-white leading-none mam-outline-sm" data-ore-text="true"></div>
            </div>
          </div>
        `
    )
    .join('');
}

function getShopSignStyle(id: ShopStationId): { bg: string; title: string } {
  if (id === 'gems') {
    return {
      bg: 'bg-[#fce7f3]',
      title: 'text-[#9d174d]',
    };
  }
  if (id === 'altar') {
    return {
      bg: 'bg-[#f3e8ff]',
      title: 'text-[#6b21a8]',
    };
  }
  if (id === 'tower') {
    return {
      bg: 'bg-[#e0f2fe]',
      title: 'text-[#0369a1]',
    };
  }
  return {
    bg: id === 'pickaxe' ? 'bg-[#ffedd5]' : id === 'sell' ? 'bg-[#dcfce7]' : 'bg-[#fef9c3]',
    title: id === 'pickaxe' ? 'text-[#9a3412]' : id === 'sell' ? 'text-[#15803d]' : 'text-[#a16207]',
  };
}

/** Builds floating sign button HTML for Shop Plaza 3D stations. */
export function buildShopAnchorsHtml(anchors: ShopStationAnchor[]): string {
  return anchors
    .map((a) => {
      const st = getShopSignStyle(a.id);
      return `
          <button class="${TW_SHOP_SIGN_BASE} ${st.bg}" data-shop-station="${a.id}">
            <div class="text-[16px] font-black ${st.title}">${a.title}</div>
            <div class="text-[12px] font-bold text-[#334155]">${a.subtitle}</div>
          </button>
        `;
    })
    .join('');
}

/** Builds floating dialogue bubble HTML above Shop Plaza NPC Chibis. */
export function buildShopChibiBubblesHtml(bubbles: ShopChibiBubbleAnchor[]): string {
  return bubbles
    .map(
      (b) => `
          <div class="absolute -translate-x-1/2 -translate-y-full pointer-events-none" data-chibi-bubble="${b.id}">
            <div class="relative px-3 py-1.5 rounded-2xl border-2 border-[#14111d] bg-[#fff8e7] text-[#14111d] text-[12px] font-black leading-tight whitespace-nowrap">
              ${b.text}
              <span class="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3 h-3 bg-[#fff8e7] border-r-2 border-b-2 border-[#14111d] rotate-45"></span>
            </div>
          </div>
        `
    )
    .join('');
}

/** Builds floating aura label pills for visible Enchant Altar pedestals. */
export function buildAltarAnchorsHtml(anchors: AltarPedestalAnchor[]): string {
  return anchors
    .map((a) => {
      const tint = a.id === 'timeless' ? '#a5b4fc' : a.color;
      return `
          <div class="absolute -translate-x-1/2 -translate-y-full text-left transition-transform duration-150 ease-out pointer-events-none [&.is-hi]:-translate-y-[115%] [&.is-hi]:scale-[1.16] ${a.highlighted ? 'is-hi' : ''}" data-altar-lbl="${a.id}">
            <div class="inline-flex items-center gap-[6px] py-[3px] pr-2.5 pl-[4px] rounded-full border-2 border-[#14111d] whitespace-nowrap [&>.mam-3d-icon]:w-[22px] [&>.mam-3d-icon]:h-[22px] [&>.mam-3d-icon]:shrink-0" style="background:linear-gradient(135deg,#fff8e7 20%,${tint}52 100%),#fff8e7">
              <span class="w-[24px] h-[24px] rounded-full border-[1.5px] border-[#14111d] flex items-center justify-center shrink-0 [&>.mam-3d-icon]:w-[20px] [&>.mam-3d-icon]:h-[20px]" style="background:radial-gradient(circle,${tint}88,#fff8e7 85%),#fff8e7">${enchantAuraIconHtml(a.id, a.color, 20, a.name)}</span>
              <div class="flex flex-col items-start leading-none">
                <div class="text-[12px] font-black leading-[1.05] text-[#14111d]">${a.name}</div>
                <div class="text-[10px] font-bold text-[#334155]">${a.chancePct}%</div>
              </div>
            </div>
          </div>
        `;
    })
    .join('');
}

/** Coordinates all 3D-projected DOM overlay layers (ore bars, damage popups, shop signs/bubbles, altar labels, plot labels). */
export class WorldOverlayHudUi {
  private plotLayerEl: HTMLElement | null = null;
  private oreBarLayerEl: HTMLElement | null = null;
  private readonly oreBarCache = new Map<
    string,
    {
      wrap: HTMLElement;
      fill: HTMLElement | null;
      txt: HTMLElement | null;
      x: number;
      y: number;
      pct: string;
      text: string;
    }
  >();
  private dmgLayerEl: HTMLElement | null = null;
  private shopLayerEl: HTMLElement | null = null;
  private shopBubbleLayerEl: HTMLElement | null = null;
  private readonly lastPlotLabelKeys = new Map<number, string>();

  constructor(
    private readonly state: GameState,
    private readonly getUiContext: () => {
      sceneMode: SceneMode;
      activeModal: ModalKind;
      inspectedSlot: number | null;
    },
    private readonly onOpenShopStation: (station: ShopStationId) => void,
    private readonly syncPlotLabelFn?: (slotIndex: number, info: PlotLabelInfo | null) => void,
    private readonly onTutorialPlotAnchor?: (x: number, y: number, visible: boolean) => void,
    private readonly onTutorialDomArrowSync?: () => void,
    private readonly settings: GameSettings = gameSettings
  ) {}

  public mountLayers(): void {
    this.plotLayerEl = document.createElement('div');
    this.plotLayerEl.id = 'plotOverlayLayer';
    this.plotLayerEl.className = 'fixed inset-0 pointer-events-none font-[var(--mam-font)] z-10';
    document.body.appendChild(this.plotLayerEl);

    this.oreBarLayerEl = document.createElement('div');
    this.oreBarLayerEl.id = 'oreBarLayer';
    this.oreBarLayerEl.className = 'fixed inset-0 pointer-events-none font-[var(--mam-font)] z-12';
    document.body.appendChild(this.oreBarLayerEl);

    this.dmgLayerEl = document.createElement('div');
    this.dmgLayerEl.id = 'dmgPopupLayer';
    this.dmgLayerEl.className =
      'fixed inset-0 pointer-events-none font-[var(--mam-font)] z-[15] overflow-hidden';
    document.body.appendChild(this.dmgLayerEl);

    this.shopLayerEl = document.createElement('div');
    this.shopLayerEl.id = 'shopOverlayLayer';
    this.shopLayerEl.className = 'fixed inset-0 pointer-events-none z-[16]';
    document.body.appendChild(this.shopLayerEl);

    this.shopBubbleLayerEl = document.createElement('div');
    this.shopBubbleLayerEl.id = 'shopBubbleLayer';
    this.shopBubbleLayerEl.className =
      'fixed inset-0 pointer-events-none z-[14] overflow-hidden';
    document.body.appendChild(this.shopBubbleLayerEl);
  }

  public resetPlotLayerKeysIfMineIdle(): void {
    const { sceneMode, activeModal, inspectedSlot } = this.getUiContext();
    if (this.plotLayerEl && activeModal === 'none' && inspectedSlot === null && sceneMode === 'mine') {
      this.plotLayerEl.dataset.keys = '';
    }
  }

  public clearTransientOverlays(): void {
    if (this.oreBarLayerEl) {
      this.oreBarLayerEl.innerHTML = '';
      this.oreBarLayerEl.dataset.keys = '';
      this.oreBarCache.clear();
    }
    if (this.dmgLayerEl) {
      this.dmgLayerEl.innerHTML = '';
    }
  }

  public syncSlotLabelToScene(slotIndex: number): void {
    const syncFn = this.syncPlotLabelFn;
    if (!syncFn) return;
    const payload = buildPlotLabelPayload(this.state, slotIndex);
    if (this.lastPlotLabelKeys.get(slotIndex) === payload.key) return;
    this.lastPlotLabelKeys.set(slotIndex, payload.key);
    syncFn(slotIndex, payload.info);
  }

  public syncAllPlotLabelsToScene(): void {
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      this.syncSlotLabelToScene(i);
    }
  }

  public updatePlotAnchors(anchors: PlotAnchorScreen[]): void {
    this.syncAllPlotLabelsToScene();

    if (this.plotLayerEl) {
      const { sceneMode, activeModal, inspectedSlot } = this.getUiContext();
      if (sceneMode !== 'mine' || activeModal !== 'none' || inspectedSlot !== null) {
        if (this.plotLayerEl.innerHTML !== '') {
          this.plotLayerEl.innerHTML = '';
          this.plotLayerEl.dataset.keys = '';
        }
      } else {
        const items: Array<{ slotIndex: number; rarity: ReturnType<typeof getMinerRarity>; x: number; y: number }> = [];
        for (const a of anchors) {
          if (!a.visible) continue;
          const unit = this.state.getPlotUnit(a.slotIndex);
          const chibi = unit ? getChibiById(unit.chibiId) : null;
          if (!unit || !chibi) continue;
          items.push({
            slotIndex: a.slotIndex,
            rarity: getMinerRarity(chibi.id),
            x: Math.round(a.labelX),
            y: Math.round(a.labelY),
          });
        }
        const key = items.map((item) => `${item.slotIndex}:${item.rarity}`).join(',');
        if (this.plotLayerEl.dataset.keys !== key) {
          this.plotLayerEl.dataset.keys = key;
          this.plotLayerEl.innerHTML = items
            .map(
              (item) =>
                `<div class="absolute top-0 left-0 pointer-events-none select-none will-change-transform origin-bottom" data-label-slot="${item.slotIndex}">${renderRarityBadgeHtml(item.rarity, '!ml-0')}</div>`
            )
            .join('');
        }
        for (const item of items) {
          const el = this.plotLayerEl.querySelector<HTMLElement>(`[data-label-slot="${item.slotIndex}"]`);
          if (!el) continue;
          el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) translate(-50%, -100%)`;
        }
      }
    }

    const plot0 = anchors.find((a) => a.slotIndex === 0);
    if (plot0) {
      this.onTutorialPlotAnchor?.(plot0.labelX, plot0.labelY, plot0.visible);
    }
  }

  private applyOreBarFrame(
    layer: HTMLElement,
    selector: string,
    x: number,
    y: number,
    hp: number,
    maxHp: number
  ): void {
    let entry = this.oreBarCache.get(selector);
    if (!entry) {
      const wrap = layer.querySelector<HTMLElement>(selector);
      if (!wrap) return;
      wrap.style.left = '0px';
      wrap.style.top = '0px';
      wrap.style.transformOrigin = '0 0';
      entry = {
        wrap,
        fill: wrap.querySelector<HTMLElement>('[data-ore-fill="true"]'),
        txt: wrap.querySelector<HTMLElement>('[data-ore-text="true"]'),
        x: NaN,
        y: NaN,
        pct: '',
        text: '',
      };
      this.oreBarCache.set(selector, entry);
    }

    const rx = Math.round(x * 2) * 0.5;
    const ry = Math.round(y * 2) * 0.5;
    if (rx !== entry.x || ry !== entry.y) {
      entry.x = rx;
      entry.y = ry;
      entry.wrap.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(var(--mam-float-scale, 1)) translate(-50%, -100%)`;
    }

    const pctNum = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
    const pctStr = `${pctNum.toFixed(1)}%`;
    if (entry.fill && pctStr !== entry.pct) {
      entry.pct = pctStr;
      entry.fill.style.width = pctStr;
    }

    const textStr = `${fmtShort(Math.ceil(hp))} / ${fmtShort(Math.ceil(maxHp))}`;
    if (entry.txt && textStr !== entry.text) {
      entry.text = textStr;
      entry.txt.textContent = textStr;
    }
  }

  public updateOreBars(bars: OreHpScreen[]): void {
    if (!this.oreBarLayerEl) return;
    const { sceneMode, inspectedSlot, activeModal } = this.getUiContext();
    if (sceneMode !== 'mine') {
      if (this.oreBarLayerEl.dataset.keys?.startsWith('mine:')) {
        this.oreBarLayerEl.innerHTML = '';
        this.oreBarLayerEl.dataset.keys = '';
        this.oreBarCache.clear();
      }
      return;
    }
    if (!shouldShowMineOreBars({ sceneMode, inspectedSlot, activeModal, barCount: bars.length })) {
      if (this.oreBarLayerEl.innerHTML !== '') {
        this.oreBarLayerEl.innerHTML = '';
        this.oreBarLayerEl.dataset.keys = '';
        this.oreBarCache.clear();
      }
      return;
    }

    const key = `mine:${bars.map((b) => `${b.id}:${b.meteorWeatherId ?? ''}:${b.pitEventKind ?? ''}`).join(',')}`;
    if (this.oreBarLayerEl.dataset.keys !== key) {
      this.oreBarLayerEl.dataset.keys = key;
      this.oreBarLayerEl.innerHTML = buildMineOreBarsHtml(bars);
      this.oreBarCache.clear();
    }

    for (const b of bars) {
      this.applyOreBarFrame(this.oreBarLayerEl, `[data-ore-bar="${b.id}"]`, b.x, b.y, b.hp, b.maxHp);
    }
  }

  public updateTowerOreBars(bars: TowerOreBarScreen[]): void {
    if (!this.oreBarLayerEl) return;
    const { sceneMode, inspectedSlot, activeModal } = this.getUiContext();
    if (
      !shouldShowTowerOreBars({
        sceneMode,
        inspectedSlot,
        activeModal,
        pendingBlessings: Boolean(this.state.towerRun?.pendingBlessings),
        barCount: bars.length,
      })
    ) {
      if (this.oreBarLayerEl.dataset.keys?.startsWith('tower:') || sceneMode === 'tower') {
        if (this.oreBarLayerEl.innerHTML !== '') {
          this.oreBarLayerEl.innerHTML = '';
          this.oreBarLayerEl.dataset.keys = '';
          this.oreBarCache.clear();
        }
      }
      return;
    }

    const key = `tower:${bars.map((b) => `${b.index}:${b.name}`).join(',')}`;
    if (this.oreBarLayerEl.dataset.keys !== key) {
      this.oreBarLayerEl.dataset.keys = key;
      this.oreBarLayerEl.innerHTML = buildTowerOreBarsHtml(bars);
      this.oreBarCache.clear();
    }

    const runOres = this.state.towerRun?.waveOres ?? [];
    for (const b of bars) {
      const live = runOres.find((o) => o.index === b.index);
      const hp = live ? live.hp : b.hp;
      const maxHp = live ? live.maxHp : b.maxHp;
      this.applyOreBarFrame(
        this.oreBarLayerEl,
        `[data-tower-ore-bar="${b.index}"]`,
        b.x,
        b.y,
        hp,
        maxHp
      );
    }
  }

  public spawnDamagePopup(
    dmg: number,
    screenX: number,
    screenY: number,
    isClick = false,
    isCrit = false
  ): void {
    if (!this.settings.get().showDamagePopups) return;
    if (!this.dmgLayerEl || this.getUiContext().inspectedSlot !== null) return;
    if (this.dmgLayerEl.childElementCount >= 24) {
      this.dmgLayerEl.firstElementChild?.remove();
    }
    const el = document.createElement('div');
    const jitterX = (Math.random() - 0.5) * 32;
    const jitterY = (Math.random() - 0.5) * 14;
    el.style.left = `${screenX + jitterX}px`;
    el.style.top = `${screenY + jitterY}px`;
    const dmgText = fmtShort(Math.max(1, Math.round(dmg)));
    if (isCrit) {
      el.className =
        'absolute inline-flex items-center gap-1 font-black tabular-nums whitespace-nowrap will-change-[transform,opacity] animate-[mamCritFloat_0.82s_cubic-bezier(0.22,1,0.36,1)_forwards] pointer-events-none';
      el.innerHTML = `
        <svg class="w-6 h-6 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M14 1.5L17.2 9.4L25.5 7.5L19.6 13.8L26.5 18.5L17.6 18.6L14 26.5L10.4 18.6L1.5 18.5L8.4 13.8L2.5 7.5L10.8 9.4L14 1.5Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M14 5.5L16.1 11.1L21.8 11.4L17.1 14.9L18.8 20.5L14 17.2L9.2 20.5L10.9 14.9L6.2 11.4L11.9 11.1L14 5.5Z" fill="#fffbeb"/>
        </svg>
        <span class="inline-flex flex-col items-start leading-none">
          <span class="px-1.5 py-[1px] rounded bg-[linear-gradient(90deg,#f59e0b,#ef4444)] border border-[#fef08a]/85 text-[9px] tracking-[0.12em] text-white uppercase shadow-[0_0_10px_rgba(245,158,11,0.75)]">CRIT</span>
          <span class="text-[28px] text-[#fef08a] mam-outline drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]">-${dmgText}!</span>
        </span>
      `;
    } else {
      const sizeColor = isClick ? 'text-[22px] text-[#facc15]' : 'text-[20px] text-[#ef4444]';
      el.className = `absolute font-black tabular-nums whitespace-nowrap will-change-[transform,opacity] animate-[mamDmgFloat_0.68s_cubic-bezier(0.22,1,0.36,1)_forwards] mam-outline ${sizeColor}`;
      el.textContent = `-${dmgText}`;
    }
    el.addEventListener('animationend', () => el.remove(), { once: true });
    this.dmgLayerEl.appendChild(el);
  }

  public updateShopAnchors(anchors: ShopStationAnchor[]): void {
    if (!this.shopLayerEl) return;
    const { sceneMode, activeModal } = this.getUiContext();
    if (sceneMode !== 'shop' || activeModal !== 'none') {
      if (this.shopLayerEl.innerHTML !== '') {
        this.shopLayerEl.innerHTML = '';
        this.shopLayerEl.dataset.keys = '';
      }
      return;
    }
    const visible = anchors.filter((a) => a.visible);
    const key = `shop:${visible.map((a) => a.id).join(',')}`;
    if (this.shopLayerEl.dataset.keys !== key) {
      this.shopLayerEl.dataset.keys = key;
      this.shopLayerEl.innerHTML = buildShopAnchorsHtml(visible);
      this.shopLayerEl.querySelectorAll('[data-shop-station]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.shopStation as ShopStationId;
          this.onOpenShopStation(id);
        });
      });
    }
    for (const a of visible) {
      const el = this.shopLayerEl.querySelector<HTMLElement>(`[data-shop-station="${a.id}"]`);
      if (!el) continue;
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
    }
    this.onTutorialDomArrowSync?.();
  }

  public updateShopChibiBubbles(bubbles: ShopChibiBubbleAnchor[]): void {
    if (!this.shopBubbleLayerEl) return;
    const { sceneMode, activeModal } = this.getUiContext();
    if ((sceneMode !== 'shop' && sceneMode !== 'fusion') || activeModal !== 'none' || bubbles.length === 0) {
      if (this.shopBubbleLayerEl.innerHTML !== '') {
        this.shopBubbleLayerEl.innerHTML = '';
        this.shopBubbleLayerEl.dataset.keys = '';
      }
      return;
    }

    const key = bubbles.map((b) => `${b.id}:${b.text}`).join('|');
    if (this.shopBubbleLayerEl.dataset.keys !== key) {
      this.shopBubbleLayerEl.dataset.keys = key;
      this.shopBubbleLayerEl.innerHTML = buildShopChibiBubblesHtml(bubbles);
    }

    for (const b of bubbles) {
      const el = this.shopBubbleLayerEl.querySelector<HTMLElement>(`[data-chibi-bubble="${b.id}"]`);
      if (!el) continue;
      el.style.left = `${Math.round(b.x)}px`;
      el.style.top = `${Math.round(b.y)}px`;
    }
  }

  public updateAltarAnchors(anchors: AltarPedestalAnchor[]): void {
    if (!this.shopLayerEl) return;
    if (this.getUiContext().sceneMode !== 'altar') {
      if (this.shopLayerEl.dataset.keys?.startsWith('altar:')) {
        this.shopLayerEl.innerHTML = '';
        this.shopLayerEl.dataset.keys = '';
      }
      return;
    }
    const visible = anchors.filter((a) => a.visible);
    const key = `altar:${visible.map((a) => `${a.id}:${a.highlighted ? 1 : 0}`).join(',')}`;
    if (this.shopLayerEl.dataset.keys !== key) {
      this.shopLayerEl.dataset.keys = key;
      this.shopLayerEl.innerHTML = buildAltarAnchorsHtml(visible);
    }
    for (const a of visible) {
      const el = this.shopLayerEl.querySelector<HTMLElement>(`[data-altar-lbl="${a.id}"]`);
      if (!el) continue;
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
    }
    this.onTutorialDomArrowSync?.();
  }
}
