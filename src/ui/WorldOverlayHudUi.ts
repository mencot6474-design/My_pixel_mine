import { getChibiById } from '../game3d/ChibiCatalog';
import { OreHpScreen, PlotAnchorScreen, SceneMode, SweetSpotScreen } from '../game3d/MineScene3D';
import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import type { PlotLabelInfo } from '../game3d/PlotPedestal3D';
import {
  AltarPedestalAnchor,
  ShopChibiBubbleAnchor,
  ShopStationAnchor,
  ShopStationId,
} from '../game3d/ShopWorld3D';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import type { OmegaTargetScreenAnchor } from '../game3d/OmegaArena3D';
import { getEnchantById, getMinerRarity, getMutationById, RARITY_BORDER } from '../game/GameData';
import { GameSettings, gameSettings } from '../game/GameSettings';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import { getWeatherById } from '../game/WeatherData';
import { PIT_EVENT_DEFS } from '../game/PitEventsDomain';
import { enchantAuraIconHtml, meteorIconHtml } from './HudIcons';
import { omegaBattleIconHtml } from './OmegaBattleIcons';
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

function buildSingleMineOreBarHtml(b: OreHpScreen): string {
  if (b.isMeteor) {
    const wDef = getWeatherById(b.meteorWeatherId ?? 'light_rain');
    return `
      <div class="absolute flex flex-col items-center gap-1 pointer-events-none select-none" data-ore-bar="${b.id}">
        <div class="mam-pill rounded-lg bg-[#fff8e7] border-2 border-[#14111d] gap-1.5">
          ${meteorIconHtml(wDef.id, 15, wDef.name)}
          <span class="text-[10.5px] font-black uppercase tracking-[0.06em] leading-none text-[#14111d]">${wDef.name}</span>
          <span class="mam-pill-xs rounded text-[8.5px] uppercase tracking-wider bg-[#fde047] text-[#14111d] border border-[#14111d]">Meteor</span>
        </div>
        <div class="relative w-[184px] @max-[720px]:w-[156px] h-[22px] rounded-lg border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center">
          <div class="absolute inset-y-0 left-0 w-full origin-left will-change-transform transition-transform duration-[80ms] ease-linear" style="background:linear-gradient(90deg,${wDef.glowColor},${wDef.accentColor})" data-ore-fill="true"></div>
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
        <div class="mam-pill-xs rounded-md bg-[#fff8e7] border-2 border-[#14111d]">
          <span class="text-[9.5px] font-black uppercase tracking-[0.06em] leading-none text-[#14111d]">${ev.badgeText}</span>
        </div>
        <div class="relative w-28 h-[17px] rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center">
          <div class="absolute inset-y-0 left-0 w-full origin-left will-change-transform transition-transform duration-[80ms] ease-linear" style="background:linear-gradient(90deg,${ev.colorHex}bb,${ev.colorHex})" data-ore-fill="true"></div>
          <div class="relative z-[2] text-[10.5px] font-extrabold tabular-nums text-white leading-none mam-outline-sm" data-ore-text="true"></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="absolute w-24 h-4 rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden flex items-center justify-center" data-ore-bar="${b.id}">
      <div class="absolute inset-y-0 left-0 w-full origin-left will-change-transform bg-[linear-gradient(180deg,#38bdf8,#0284c7)] transition-transform duration-[80ms] ease-linear" data-ore-fill="true"></div>
      <div class="relative z-[2] text-[10.5px] font-extrabold tabular-nums text-white leading-none mam-outline-sm" data-ore-text="true"></div>
    </div>
  `;
}

/** Builds overlay HTML for Mine Pit rock and weather meteor HP bars. */
export function buildMineOreBarsHtml(bars: OreHpScreen[]): string {
  return bars.map((b) => buildSingleMineOreBarHtml(b)).join('');
}

/** Builds overlay HTML for Tower Arena rock HP bars. */
export function buildTowerOreBarsHtml(bars: TowerOreBarScreen[]): string {
  return bars
    .map(
      (b) => `
          <div class="absolute flex flex-col items-center gap-1 pointer-events-none" data-tower-ore-bar="${b.index}">
            <div class="mam-pill-xs rounded-md bg-[#fff8e7] border-[1.5px] border-[#14111d] text-[10.5px] text-[#14111d]">${b.name}</div>
            <div class="w-[104px] h-[18px] rounded-md border-2 border-[#14111d] bg-[#1e293b] overflow-hidden relative flex items-center justify-center">
              <div class="absolute inset-y-0 left-0 w-full origin-left will-change-transform transition-transform duration-[60ms] ease-linear" style="background:linear-gradient(180deg,${b.color},${b.color}cc)" data-ore-fill="true"></div>
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
      lastTextAtMs: number;
    }
  >();
  private dmgLayerEl: HTMLElement | null = null;
  private sweetSpotLayerEl: HTMLElement | null = null;
  private sweetSpotWrapEl: HTMLElement | null = null;
  private sweetSpotRingEl: HTMLElement | null = null;
  private sweetSpotTagEl: HTMLElement | null = null;
  private lastSweetSpotTag = '';
  private shopLayerEl: HTMLElement | null = null;
  private shopBubbleLayerEl: HTMLElement | null = null;
  private omegaLayerEl: HTMLElement | null = null;
  private readonly lastPlotLabelKeys = new Map<number, string>();
  private readonly plotLabelCache = new Map<number, { el: HTMLElement; x: number; y: number }>();
  private readonly mineOreBarNodes = new Map<number, { key: string; el: HTMLElement }>();
  private lastAutoDmgPopupAtMs = 0;

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

    this.sweetSpotLayerEl = document.createElement('div');
    this.sweetSpotLayerEl.id = 'sweetSpotLayer';
    this.sweetSpotLayerEl.className =
      'fixed inset-0 pointer-events-none font-[var(--mam-font)] z-[13] overflow-hidden';
    document.body.appendChild(this.sweetSpotLayerEl);

    this.shopLayerEl = document.createElement('div');
    this.shopLayerEl.id = 'shopOverlayLayer';
    this.shopLayerEl.className = 'fixed inset-0 pointer-events-none z-[16]';
    document.body.appendChild(this.shopLayerEl);

    this.shopBubbleLayerEl = document.createElement('div');
    this.shopBubbleLayerEl.id = 'shopBubbleLayer';
    this.shopBubbleLayerEl.className =
      'fixed inset-0 pointer-events-none z-[14] overflow-hidden';
    document.body.appendChild(this.shopBubbleLayerEl);

    this.omegaLayerEl = document.createElement('div');
    this.omegaLayerEl.id = 'omegaOverlayLayer';
    this.omegaLayerEl.className = 'fixed inset-0 pointer-events-none z-[18] overflow-hidden';
    document.body.appendChild(this.omegaLayerEl);
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
      this.mineOreBarNodes.clear();
    }
    if (this.dmgLayerEl) {
      this.dmgLayerEl.innerHTML = '';
    }
    if (this.omegaLayerEl) {
      this.omegaLayerEl.innerHTML = '';
      this.omegaLayerEl.dataset.key = '';
    }
    this.updateSweetSpot(null);
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
          this.plotLabelCache.clear();
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
                `<div class="absolute top-0 left-0 flex items-end justify-center leading-none pointer-events-none select-none will-change-transform origin-bottom" data-label-slot="${item.slotIndex}">${renderRarityBadgeHtml(item.rarity, '!ml-0')}</div>`
            )
            .join('');
          this.plotLabelCache.clear();
        }
        for (const item of items) {
          let cached = this.plotLabelCache.get(item.slotIndex);
          if (!cached) {
            const el = this.plotLayerEl.querySelector<HTMLElement>(`[data-label-slot="${item.slotIndex}"]`);
            if (!el) continue;
            cached = { el, x: NaN, y: NaN };
            this.plotLabelCache.set(item.slotIndex, cached);
          }
          if (cached.x !== item.x || cached.y !== item.y) {
            cached.x = item.x;
            cached.y = item.y;
            cached.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) translate(-50%, -100%)`;
          }
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
        lastTextAtMs: 0,
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

    const pctNum = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
    const pctStr = pctNum.toFixed(3);
    if (entry.fill && pctStr !== entry.pct) {
      entry.pct = pctStr;
      entry.fill.style.transform = `scaleX(${pctStr})`;
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const textStr = `${fmtShort(Math.ceil(hp))} / ${fmtShort(Math.ceil(maxHp))}`;
    if (entry.txt && textStr !== entry.text && (hp <= 0 || entry.lastTextAtMs === 0 || nowMs - entry.lastTextAtMs >= 140)) {
      entry.lastTextAtMs = nowMs;
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
        this.mineOreBarNodes.clear();
      }
      return;
    }
    if (!shouldShowMineOreBars({ sceneMode, inspectedSlot, activeModal, barCount: bars.length })) {
      if (this.oreBarLayerEl.innerHTML !== '') {
        this.oreBarLayerEl.innerHTML = '';
        this.oreBarLayerEl.dataset.keys = '';
        this.oreBarCache.clear();
        this.mineOreBarNodes.clear();
      }
      return;
    }

    const key = `mine:${bars.map((b) => `${b.id}:${b.meteorWeatherId ?? ''}:${b.pitEventKind ?? ''}`).join(',')}`;
    if (this.oreBarLayerEl.dataset.keys !== key) {
      if (!this.oreBarLayerEl.dataset.keys?.startsWith('mine:')) {
        this.oreBarLayerEl.innerHTML = '';
        this.oreBarCache.clear();
        this.mineOreBarNodes.clear();
      }
      this.oreBarLayerEl.dataset.keys = key;

      const activeIds = new Set<number>();
      const scratch = document.createElement('div');
      for (const b of bars) {
        activeIds.add(b.id);
        const barKey = `${b.meteorWeatherId ?? ''}:${b.pitEventKind ?? ''}`;
        const existing = this.mineOreBarNodes.get(b.id);
        if (existing && existing.key === barKey) continue;
        if (existing) {
          existing.el.remove();
          this.oreBarCache.delete(`[data-ore-bar="${b.id}"]`);
        }
        scratch.innerHTML = buildSingleMineOreBarHtml(b).trim();
        const node = scratch.firstElementChild as HTMLElement | null;
        if (node) {
          this.oreBarLayerEl.appendChild(node);
          this.mineOreBarNodes.set(b.id, { key: barKey, el: node });
        }
      }
      for (const [id, existing] of this.mineOreBarNodes) {
        if (!activeIds.has(id)) {
          existing.el.remove();
          this.mineOreBarNodes.delete(id);
          this.oreBarCache.delete(`[data-ore-bar="${id}"]`);
        }
      }
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
      this.mineOreBarNodes.clear();
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

  public updateSweetSpot(spot: SweetSpotScreen | null): void {
    if (!this.sweetSpotLayerEl) return;
    const { sceneMode, inspectedSlot, activeModal } = this.getUiContext();
    if (!spot || (sceneMode !== 'mine' && sceneMode !== 'tower') || inspectedSlot !== null || activeModal !== 'none') {
      if (this.sweetSpotWrapEl) {
        this.sweetSpotWrapEl.style.display = 'none';
      }
      return;
    }

    if (!this.sweetSpotWrapEl) {
      const wrap = document.createElement('div');
      wrap.className = 'mam-sweet-spot-reticle';
      wrap.dataset.sweetSpot = 'true';
      wrap.innerHTML = `
        <div class="mam-sweet-spot-zone"></div>
        <div class="mam-sweet-spot-ring" data-sweet-ring="true"></div>
        <div class="mam-sweet-spot-core"></div>
        <span class="mam-sweet-spot-tag" data-sweet-tag="true">TAP!</span>
      `;
      this.sweetSpotLayerEl.appendChild(wrap);
      this.sweetSpotWrapEl = wrap;
      this.sweetSpotRingEl = wrap.querySelector<HTMLElement>('[data-sweet-ring="true"]');
      this.sweetSpotTagEl = wrap.querySelector<HTMLElement>('[data-sweet-tag="true"]');
    }

    const baseScale = spot.isTowerShield ? 1.32 : spot.isMeteor ? 1.28 : 1;
    const rx = Math.round(spot.x * 2) * 0.5;
    const ry = Math.round(spot.y * 2) * 0.5;
    this.sweetSpotWrapEl.style.display = 'block';
    this.sweetSpotWrapEl.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(calc(var(--mam-float-scale, 1) * ${baseScale}))`;
    this.sweetSpotWrapEl.classList.toggle('is-in-window', spot.inWindow);

    if (this.sweetSpotRingEl) {
      // Contracts smoothly from 2.2 down to 0.42 across progress 0..1 (hits target zone at 0.56..0.90)
      const ringScale = Math.max(0.36, 2.2 - spot.progress * 1.78);
      this.sweetSpotRingEl.style.transform = `scale(${ringScale.toFixed(3)})`;
    }
    if (this.sweetSpotTagEl) {
      const nextTag = spot.isTowerShield
        ? spot.inWindow
          ? 'BREAK!'
          : 'SHIELD'
        : spot.inWindow
          ? 'STRIKE!'
          : 'WAIT';
      if (nextTag !== this.lastSweetSpotTag) {
        this.lastSweetSpotTag = nextTag;
        this.sweetSpotTagEl.textContent = nextTag;
      }
    }
  }

  public spawnDamagePopup(
    dmg: number,
    screenX: number,
    screenY: number,
    isClick = false,
    isCrit = false,
    isPerfect = false
  ): void {
    const settings = this.settings.get();
    if (!settings.showDamagePopups) return;
    if (!this.dmgLayerEl || this.getUiContext().inspectedSlot !== null) return;
    if (settings.graphicsQuality === 'low' && !isClick && !isCrit && !isPerfect) {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - this.lastAutoDmgPopupAtMs < 140) return;
      this.lastAutoDmgPopupAtMs = nowMs;
    }
    const maxPopups = settings.graphicsQuality === 'low' ? 6 : 24;
    if (this.dmgLayerEl.childElementCount >= maxPopups) {
      this.dmgLayerEl.firstElementChild?.remove();
    }
    const el = document.createElement('div');
    const jitterX = (Math.random() - 0.5) * 32;
    const jitterY = (Math.random() - 0.5) * 14;
    el.style.left = `${screenX + jitterX}px`;
    el.style.top = `${screenY + jitterY}px`;
    const dmgText = fmtShort(Math.max(1, Math.round(dmg)));
    if (isPerfect) {
      el.className =
        'absolute inline-flex items-center gap-1.5 font-black tabular-nums whitespace-nowrap will-change-[transform,opacity] animate-[mamCritFloat_0.92s_cubic-bezier(0.22,1,0.36,1)_forwards] pointer-events-none';
      el.innerHTML = `
        <svg class="w-7 h-7 shrink-0 drop-shadow-[0_0_10px_rgba(56,189,248,0.95)]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M14 1.5L17.2 9.4L25.5 7.5L19.6 13.8L26.5 18.5L17.6 18.6L14 26.5L10.4 18.6L1.5 18.5L8.4 13.8L2.5 7.5L10.8 9.4L14 1.5Z" fill="#38bdf8" stroke="#fde047" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M14 5.5L16.1 11.1L21.8 11.4L17.1 14.9L18.8 20.5L14 17.2L9.2 20.5L10.9 14.9L6.2 11.4L11.9 11.1L14 5.5Z" fill="#ffffff"/>
        </svg>
        <span class="inline-flex flex-col items-start leading-none">
          <span class="mam-pill-xs rounded-md bg-[linear-gradient(90deg,#0284c7,#a855f7,#f59e0b)] border-2 border-[#14111d] text-[10px] tracking-[0.1em] text-white uppercase">PERFECT STRIKE!</span>
          <span class="text-[31px] text-[#67e8f9] mam-outline">-${dmgText}!!</span>
        </span>
      `;
    } else if (isCrit) {
      el.className =
        'absolute inline-flex items-center gap-1 font-black tabular-nums whitespace-nowrap will-change-[transform,opacity] animate-[mamCritFloat_0.82s_cubic-bezier(0.22,1,0.36,1)_forwards] pointer-events-none';
      el.innerHTML = `
        <svg class="w-6 h-6 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M14 1.5L17.2 9.4L25.5 7.5L19.6 13.8L26.5 18.5L17.6 18.6L14 26.5L10.4 18.6L1.5 18.5L8.4 13.8L2.5 7.5L10.8 9.4L14 1.5Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M14 5.5L16.1 11.1L21.8 11.4L17.1 14.9L18.8 20.5L14 17.2L9.2 20.5L10.9 14.9L6.2 11.4L11.9 11.1L14 5.5Z" fill="#fffbeb"/>
        </svg>
        <span class="inline-flex flex-col items-start leading-none">
          <span class="mam-pill-xs rounded bg-[linear-gradient(90deg,#f59e0b,#ef4444)] border border-[#fef08a]/85 text-[9px] tracking-[0.12em] text-white uppercase shadow-[0_0_10px_rgba(245,158,11,0.75)]">CRIT</span>
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

  public updateOmegaArenaOverlay(
    data: { bossHead: { x: number; y: number } | null; targets: OmegaTargetScreenAnchor[] } | null,
    onParry: () => void,
    onHitTarget: (targetId: string) => void
  ): void {
    if (!this.omegaLayerEl) return;
    const battle = this.state.omegaBattle;
    if (!data || !battle || this.getUiContext().sceneMode !== 'omega') {
      if (this.omegaLayerEl.innerHTML !== '') {
        this.omegaLayerEl.innerHTML = '';
        this.omegaLayerEl.dataset.key = '';
      }
      return;
    }

    const parryActive = battle.parryWindow.active && !battle.parryWindow.consumed;
    const key = `${parryActive ? 1 : 0}:${data.targets.map((t) => t.id).join(',')}`;
    if (this.omegaLayerEl.dataset.key !== key) {
      this.omegaLayerEl.dataset.key = key;
      const parryHtml =
        parryActive && data.bossHead
          ? `<button class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 w-[108px] h-[108px] flex items-center justify-center cursor-pointer group" data-omega-ring-parry style="left:${Math.round(data.bossHead.x)}px;top:${Math.round(data.bossHead.y)}px" aria-label="Parry Boss Attack">
              <span class="mam-omega-parry-ring-shrink absolute inset-0 rounded-full border-[3.5px] border-[#fde047] pointer-events-none"></span>
              <span class="relative w-[76px] h-[76px] rounded-full border-[3px] border-[#14111d] bg-[#ef4444]/90 group-hover:bg-[#fde047] group-hover:text-[#14111d] text-white flex flex-col items-center justify-center gap-0.5 transition-transform group-hover:scale-105 active:scale-95">
                ${omegaBattleIconHtml('parryClash', 30)}
                <span class="text-[11px] font-black tracking-wider leading-none uppercase">PARRY!</span>
              </span>
            </button>`
          : '';
      const targetsHtml = data.targets
        .map((t) => {
          const cfg =
            t.kind === 'phantom_blade'
              ? {
                  label: 'SHATTER BLADE',
                  bg: 'bg-[#fff1f2] text-[#9f1239] group-hover:bg-[#ffe4e6]',
                  arrowFill: '#fb7185',
                  dotBg: 'bg-[#fb7185]',
                }
              : t.kind === 'obsidian_pillar'
                ? {
                    label: 'BREAK PILLAR',
                    bg: 'bg-[#fae8ff] text-[#701a75] group-hover:bg-[#f5d0fe]',
                    arrowFill: '#e879f9',
                    dotBg: 'bg-[#e879f9]',
                  }
                : {
                    label: 'DETONATE SEAL',
                    bg: 'bg-[#e0f2fe] text-[#0369a1] group-hover:bg-[#bae6fd]',
                    arrowFill: '#38bdf8',
                    dotBg: 'bg-[#38bdf8]',
                  };
          return `<button class="pointer-events-auto absolute -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-pointer group active:scale-90 transition-transform" data-omega-hit-target="${t.id}" style="left:${Math.round(t.x)}px;top:${Math.round(t.y)}px" aria-label="Tap ${cfg.label}">
            <span class="mam-omega-tap-bounce flex flex-col items-center">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[2.5px] border-[#14111d] ${cfg.bg} text-[10.5px] font-black tracking-wide leading-none uppercase whitespace-nowrap">
                <span class="px-1.5 py-0.5 rounded-full bg-[#fde047] text-[#14111d] border-[1.5px] border-[#14111d] text-[9px] font-black tracking-wider leading-none">TAP!</span>
                <span>${cfg.label}</span>
              </span>
              <svg viewBox="0 0 20 13" width="18" height="12" fill="none" class="-mt-[2px]" aria-hidden="true">
                <path d="M2.5 1.5L10 10.5L17.5 1.5Z" fill="${cfg.arrowFill}" stroke="#14111d" stroke-width="2.4" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="relative mt-0.5 flex items-center justify-center w-4 h-4 pointer-events-none">
              <span class="mam-omega-tap-pulse absolute inset-0 rounded-full border-[2px] border-[#fde047]"></span>
              <span class="w-2.5 h-2.5 rounded-full ${cfg.dotBg} border-[1.5px] border-[#14111d]"></span>
            </span>
          </button>`;
        })
        .join('');
      this.omegaLayerEl.innerHTML = `${parryHtml}${targetsHtml}`;
      this.omegaLayerEl.querySelector<HTMLElement>('[data-omega-ring-parry]')?.addEventListener('click', onParry);
      this.omegaLayerEl.querySelectorAll<HTMLElement>('[data-omega-hit-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.omegaHitTarget;
          if (id) onHitTarget(id);
        });
      });
    } else {
      const ringEl = this.omegaLayerEl.querySelector<HTMLElement>('[data-omega-ring-parry]');
      if (ringEl && data.bossHead) {
        ringEl.style.left = `${Math.round(data.bossHead.x)}px`;
        ringEl.style.top = `${Math.round(data.bossHead.y)}px`;
      }
      for (const t of data.targets) {
        const el = this.omegaLayerEl.querySelector<HTMLElement>(`[data-omega-hit-target="${t.id}"]`);
        if (el) {
          el.style.left = `${Math.round(t.x)}px`;
          el.style.top = `${Math.round(t.y)}px`;
        }
      }
    }
  }
}
