import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { OreHpScreen, PlotAnchorScreen, SceneMode } from '../game3d/MineScene3D';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import { AltarPedestalAnchor, ShopStationAnchor, ShopStationId } from '../game3d/ShopWorld3D';
import {
  ENCHANT_DICE_GEM_COST,
  ENCHANTS,
  GEM_SHOP_ITEMS,
  GemShopItemDef,
  getEnchantById,
  getMinerRarity,
  getMinerSellValue,
  getMutationById,
  getOreById,
  getWorldById,
  ItemRarity,
  RARITY_BORDER,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtShort } from '../game/NumberFormat';
import { getTowerFloorDef, TowerWaveOreState } from '../game/TowerData';
import { WEATHERS, WeatherId } from '../game/WeatherData';
import { CollectionModalsUi } from './CollectionModalsUi';
import {
  enchantAuraIconHtml,
  enchantDiceIconHtml,
  gemPotionIconHtml,
  hudIconHtml,
  oreIconSvg,
  towerIconHtml,
  weatherIconHtml,
} from './HudIcons';
import {
  chibiPortraitHtml,
  ModalKind,
  rarityCardClasses,
  rarityVars,
  refreshPotionTimersInDom,
  TW_ACTIVE_POT_PILL,
  TW_ALTAR_AUTO_BTN,
  TW_ALTAR_ROLL_BTN,
  TW_BADGE_BASE,
  TW_CURRENCY_BAR,
  TW_HOTBAR_NUM,
  TW_HOTBAR_SLOT,
  TW_PLUS_BTN,
  TW_QUICK_BTN_CHEST,
  TW_QUICK_BTN_DAILY,
  TW_QUICK_BTN_QUEST,
  TW_QUICK_BTN_TRADE,
  TW_SHOP_DOCK_BTN_BASE,
  TW_SHOP_SIGN_BASE,
  TW_SHOPS_PILL,
  TW_SIDE_BTN_INDEX,
  TW_SIDE_BTN_RAINBOW,
  TW_SIDE_BTN_UPGRADES,
  TW_TOAST_ITEM,
  TW_TOAST_STACK,
  TW_TOP_CENTER,
} from './HudShared';
import { PlotInspectUi } from './PlotInspectUi';
import { ShopModalsUi } from './ShopModalsUi';
import { TowerUi } from './TowerUi';
import { UpgradesWorldsUi } from './UpgradesWorldsUi';

export class GameHud {
  private activeModal: ModalKind = 'none';
  private sceneMode: SceneMode = 'mine';
  private inspectedSlot: number | null = null;
  private lastHotbarKey = '';
  private lastRenderViewKey = '';
  private plotLayerEl: HTMLElement | null = null;
  private oreBarLayerEl: HTMLElement | null = null;
  private dmgLayerEl: HTMLElement | null = null;
  private shopLayerEl: HTMLElement | null = null;
  private toasts: Array<{ id: number; text: string }> = [];
  private nextToastId = 1;
  private enchantSpinning = false;
  private enchantSpinSafetyTimer: number | null = null;
  private enchantAutoRolling = false;
  private enchantAutoTimer: number | null = null;
  private lastRegrowthActive = false;
  private weatherPopoverOpen = false;
  private hotbarDrag: {
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
  } | null = null;
  private suppressHotbarClickUntil = 0;

  private readonly shopUi: ShopModalsUi;
  private readonly collectionUi: CollectionModalsUi;
  private readonly upgradesUi: UpgradesWorldsUi;
  private readonly plotInspectUi: PlotInspectUi;
  private readonly towerUi: TowerUi;

  constructor(
    private readonly root: HTMLElement,
    private readonly state: GameState,
    private readonly onSyncPlots: (ids: (string | null)[]) => void,
    private readonly onFocusPlot?: (slotIndex: number | null) => void,
    private readonly onSetSceneMode?: (mode: SceneMode) => void,
    private readonly onTriggerEnchantSpin?: (enchantId: string, onComplete: () => void) => void,
    private readonly onSyncTowerVisual?: (opts: {
      floor: number;
      wave: number;
      isBossWave: boolean;
      isCheckpointFloor: boolean;
      waveOres: readonly TowerWaveOreState[];
      anomalyColorHex: string;
      equippedMinerCount: number;
      paused: boolean;
    }) => void,
    private readonly plotDropOps?: {
      raycastPlotAt: (clientX: number, clientY: number) => number | null;
      highlightPlot: (slotIndex: number | null) => void;
      pulsePlot: (slotIndex: number) => void;
    },
    private readonly onWeatherChange?: (weatherId: WeatherId) => void
  ) {
    this.shopUi = new ShopModalsUi(this.state, (msg) => this.pushToast(msg));
    this.collectionUi = new CollectionModalsUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
    this.upgradesUi = new UpgradesWorldsUi(
      this.state,
      (msg) => this.pushToast(msg),
      (kind) => this.openModal(kind),
      () => this.render()
    );
    this.plotInspectUi = new PlotInspectUi(
      this.state,
      (msg) => this.pushToast(msg),
      (slot) => this.openPlotInspector(slot),
      () => this.render(),
      () => this.renderToastStack(),
      () => this.renderToasts()
    );
    this.towerUi = new TowerUi(
      this.state,
      (msg) => this.pushToast(msg),
      (kind) => this.openModal(kind),
      () => this.setSceneMode('tower'),
      () => this.setSceneMode('shop'),
      () => this.render()
    );

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
    this.dmgLayerEl.className = 'fixed inset-0 pointer-events-none font-[var(--mam-font)] z-[15] overflow-hidden';
    document.body.appendChild(this.dmgLayerEl);

    this.shopLayerEl = document.createElement('div');
    this.shopLayerEl.id = 'shopOverlayLayer';
    this.shopLayerEl.className = 'fixed inset-0 pointer-events-none z-[16]';
    document.body.appendChild(this.shopLayerEl);

    this.state.subscribe(() => {
      this.onSyncPlots(this.state.getEquippedPlotMinerIds());
      const hotbarKey = `${this.state.hotbar
        .map((id) => {
          if (!id) return '';
          if (getChibiById(id)) return `${id}:${this.state.miners[id] || 0}:${getMinerSellValue(id)}`;
          if (getOreById(id)) return `${id}:${this.state.ores[id] || 0}:${this.state.getEffectiveOreSellValue(id)}`;
          return id;
        })
        .join(',')}|${this.state.selectedHotbarSlot}`;
      const hotbarChanged = hotbarKey !== this.lastHotbarKey;
      this.lastHotbarKey = hotbarKey;

      if (this.inspectedSlot !== null) {
        this.plotInspectUi.updateLiveValues(this.root);
        return;
      }

      this.updateCurrencyLiveValues();
      if (hotbarChanged) this.updateHotbarLive();
      this.syncActivePotionsHud();

      if (this.sceneMode === 'altar') {
        this.updateAltarLiveValues();
      } else if (this.sceneMode === 'tower') {
        this.towerUi.updateLiveValues(this.root);
      } else if (this.activeModal === 'chest') {
        this.collectionUi.updateChestModalLive(this.root);
      } else if (this.activeModal === 'pickaxe-shop') {
        this.shopUi.updatePickaxeShopLive(this.root);
      } else if (this.activeModal === 'sell-shop') {
        this.shopUi.updateSellShopLive(this.root);
      } else if (this.activeModal === 'gem-shop') {
        this.shopUi.updateGemShopLive(this.root);
      } else if (this.activeModal === 'index') {
        this.collectionUi.updateIndexModalLive(this.root);
      } else if (this.activeModal === 'inventory') {
        this.collectionUi.updateInventoryModalLive(this.root);
      } else if (this.activeModal === 'upgrades') {
        this.upgradesUi.updateUpgradesLive(this.root);
      } else if (this.activeModal === 'worlds') {
        this.upgradesUi.updateWorldsModalLive(this.root);
      }
      this.upgradesUi.updateUpgradesBadgeLive(this.root);
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        if (this.inspectedSlot === null) this.toggleModal('inventory');
      } else if (e.key === 'Escape') {
        if (this.inspectedSlot !== null) this.openPlotInspector(null);
        else if (this.activeModal !== 'none') this.openModal('none');
      } else if (e.key >= '1' && e.key <= '9' && this.inspectedSlot === null) {
        this.state.selectHotbarSlot(Number(e.key) - 1);
      }
    });

    this.updateViewportScale();
    window.addEventListener('resize', () => this.updateViewportScale());
    window.visualViewport?.addEventListener('resize', () => this.updateViewportScale());

    this.onSyncPlots(this.state.getEquippedPlotMinerIds());
    this.render();

    window.setInterval(() => {
      if (this.activeModal === 'pickaxe-shop') {
        this.state.refreshPickaxeStockIfDue();
        const el = this.root.querySelector('[data-restock-timer="true"]');
        if (el) {
          const secLeft = this.state.getPickaxeRestockRemainingSec();
          const mm = Math.floor(secLeft / 60);
          const ss = String(secLeft % 60).padStart(2, '0');
          el.textContent = `Restock in ${mm}:${ss}`;
        }
      } else if (this.activeModal === 'gem-shop' || this.activeModal === 'inventory') {
        refreshPotionTimersInDom(this.root, this.state);
      } else if (this.activeModal === 'tower') {
        const prevKeys = this.state.towerKeys;
        this.state.syncTowerKeys();
        if (this.state.towerKeys !== prevKeys) {
          this.render();
        } else {
          const regenEl = this.root.querySelector('[data-tower-regen="true"]');
          if (regenEl) {
            const sec = this.state.getTowerNextKeyRegenSec();
            regenEl.textContent =
              sec > 0 ? `(+1 in ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : '(Full)';
          }
        }
      }
      this.syncActivePotionsHud();
      const nextWeather = this.state.syncWeather();
      if (nextWeather) {
        this.onWeatherChange?.(nextWeather.id);
        this.onSyncPlots(this.state.getEquippedPlotMinerIds());
        this.pushToast(
          `Weather: ${nextWeather.name} (${nextWeather.oreDropMult}x Ore • ${nextWeather.gemDropMult}x Gems • ${nextWeather.damageMult}x DMG)`
        );
        this.syncWeatherWidget(true);
      } else {
        this.syncWeatherWidget(false);
      }
      const regrowthActive = this.state.getBoostRemainingSec('regrowth-potion') > 0;
      if (regrowthActive !== this.lastRegrowthActive) {
        this.lastRegrowthActive = regrowthActive;
        this.onSyncPlots(this.state.getEquippedPlotMinerIds());
      }
    }, 1000);

    window.setInterval(() => {
      if (this.sceneMode !== 'tower' || !this.state.towerRun) return;
      const tick = this.state.stepTowerTick(0.1);
      if (tick.status === 'timeout') {
        this.pushToast('Tower timer ended!');
        this.setSceneMode('shop');
        this.openModal('tower');
      } else if (tick.status === 'blessing-auto-picked') {
        audio.playSfx('rare-fanfare', { volume: 0.65 });
        this.pushToast(`Auto-picked Spire Blessing: ${tick.autoPickedBlessing?.name ?? 'Blessing'}!`);
        this.syncTowerSceneVisual();
        this.render();
      } else if (tick.status === 'active' || tick.status === 'paused') {
        this.towerUi.updateLiveValues(this.root);
      }
    }, 100);
  }

  public updateOreBars(bars: OreHpScreen[]): void {
    if (!this.oreBarLayerEl || this.sceneMode !== 'mine') return;
    if (this.inspectedSlot !== null || this.activeModal !== 'none' || bars.length === 0) {
      if (this.oreBarLayerEl.innerHTML !== '') {
        this.oreBarLayerEl.innerHTML = '';
        this.oreBarLayerEl.dataset.keys = '';
      }
      return;
    }

    const key = `mine:${bars.map((b) => b.id).join(',')}`;
    if (this.oreBarLayerEl.dataset.keys !== key) {
      this.oreBarLayerEl.dataset.keys = key;
      this.oreBarLayerEl.innerHTML = bars
        .map(
          (b) => `
          <div class="absolute -translate-x-1/2 -translate-y-full w-24 h-4 rounded border-2 border-[#0f172a] bg-[rgba(15,23,42,0.9)] overflow-hidden flex items-center justify-center" data-ore-bar="${b.id}">
            <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(180deg,#38bdf8,#0284c7)] transition-[width] duration-[80ms] ease-linear" data-ore-fill="true"></div>
            <div class="relative z-[2] text-[11px] font-extrabold text-white leading-none mam-outline-sm" data-ore-text="true"></div>
          </div>
        `
        )
        .join('');
    }

    for (const b of bars) {
      const wrap = this.oreBarLayerEl.querySelector<HTMLElement>(`[data-ore-bar="${b.id}"]`);
      if (!wrap) continue;
      wrap.style.left = `${b.x}px`;
      wrap.style.top = `${b.y}px`;
      const pct = Math.max(0, Math.min(100, (b.hp / Math.max(1, b.maxHp)) * 100));
      const fill = wrap.querySelector<HTMLElement>('[data-ore-fill="true"]');
      const txt = wrap.querySelector<HTMLElement>('[data-ore-text="true"]');
      if (fill) fill.style.width = `${pct}%`;
      if (txt) txt.textContent = `${fmtShort(Math.ceil(b.hp))} / ${fmtShort(Math.ceil(b.maxHp))}`;
    }
  }

  public updateTowerOreBars(bars: TowerOreBarScreen[]): void {
    if (!this.oreBarLayerEl) return;
    if (
      this.sceneMode !== 'tower' ||
      this.inspectedSlot !== null ||
      this.activeModal !== 'none' ||
      this.state.towerRun?.pendingBlessings ||
      bars.length === 0
    ) {
      if (this.oreBarLayerEl.dataset.keys?.startsWith('tower:') || this.sceneMode === 'tower') {
        if (this.oreBarLayerEl.innerHTML !== '') {
          this.oreBarLayerEl.innerHTML = '';
          this.oreBarLayerEl.dataset.keys = '';
        }
      }
      return;
    }

    const key = `tower:${bars.map((b) => `${b.index}:${b.name}`).join(',')}`;
    if (this.oreBarLayerEl.dataset.keys !== key) {
      this.oreBarLayerEl.dataset.keys = key;
      this.oreBarLayerEl.innerHTML = bars
        .map(
          (b) => `
          <div class="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 pointer-events-none" data-tower-ore-bar="${b.index}">
            <div class="text-[11px] font-black leading-none whitespace-nowrap mam-outline-sm" style="color:${b.color}">${b.name}</div>
            <div class="w-24 h-4 rounded border-2 border-[#0f172a] bg-[rgba(15,23,42,0.92)] overflow-hidden relative flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.55)]">
              <div class="absolute left-0 top-0 bottom-0 transition-[width] duration-[60ms] ease-linear" style="background:${b.color}" data-ore-fill="true"></div>
              <div class="relative z-[2] text-[10px] font-extrabold text-white leading-none mam-outline-sm" data-ore-text="true"></div>
            </div>
          </div>
        `
        )
        .join('');
    }

    const runOres = this.state.towerRun?.waveOres ?? [];
    for (const b of bars) {
      const wrap = this.oreBarLayerEl.querySelector<HTMLElement>(`[data-tower-ore-bar="${b.index}"]`);
      if (!wrap) continue;
      const live = runOres.find((o) => o.index === b.index);
      const hp = live ? live.hp : b.hp;
      const maxHp = live ? live.maxHp : b.maxHp;
      wrap.style.left = `${b.x}px`;
      wrap.style.top = `${b.y}px`;
      const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
      const fill = wrap.querySelector<HTMLElement>('[data-ore-fill="true"]');
      const txt = wrap.querySelector<HTMLElement>('[data-ore-text="true"]');
      if (fill) fill.style.width = `${pct}%`;
      if (txt) txt.textContent = `${fmtShort(Math.ceil(hp))} / ${fmtShort(Math.ceil(maxHp))}`;
    }
  }

  public spawnDamagePopup(dmg: number, screenX: number, screenY: number, isClick = false): void {
    if (!this.dmgLayerEl || this.inspectedSlot !== null) return;
    if (this.dmgLayerEl.childElementCount >= 24) {
      this.dmgLayerEl.firstElementChild?.remove();
    }
    const el = document.createElement('div');
    const sizeColor = isClick ? 'text-[22px] text-[#facc15]' : 'text-[20px] text-[#ef4444]';
    el.className = `absolute font-black whitespace-nowrap will-change-[transform,opacity] animate-[mamDmgFloat_0.68s_cubic-bezier(0.22,1,0.36,1)_forwards] mam-outline ${sizeColor}`;
    const jitterX = (Math.random() - 0.5) * 32;
    const jitterY = (Math.random() - 0.5) * 14;
    el.style.left = `${screenX + jitterX}px`;
    el.style.top = `${screenY + jitterY}px`;
    el.textContent = `-${fmtShort(Math.max(1, Math.round(dmg)))}`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    this.dmgLayerEl.appendChild(el);
  }

  public openPlotInspector(slotIndex: number | null): void {
    this.inspectedSlot = slotIndex;
    if (slotIndex !== null) {
      this.activeModal = 'none';
    }
    this.onFocusPlot?.(slotIndex);
    this.render();
  }

  public updatePlotAnchors(anchors: PlotAnchorScreen[]): void {
    if (!this.plotLayerEl) return;
    if (this.inspectedSlot !== null || this.activeModal !== 'none') {
      if (this.plotLayerEl.innerHTML !== '') this.plotLayerEl.innerHTML = '';
      return;
    }

    const activeAnchors = anchors.filter((a) => a.visible);
    if (activeAnchors.length === 0) {
      if (this.plotLayerEl.innerHTML !== '') this.plotLayerEl.innerHTML = '';
      return;
    }

    const key = activeAnchors
      .map((a) => {
        const u = this.state.getPlotUnit(a.slotIndex);
        return `${a.slotIndex}:${u?.chibiId ?? ''}:${u?.damageLevel ?? 0}:${u?.mutationId ?? ''}:${u?.enchantId ?? ''}`;
      })
      .join(',');
    if (this.plotLayerEl.dataset.keys !== key) {
      this.plotLayerEl.dataset.keys = key;
      this.plotLayerEl.innerHTML = activeAnchors
        .map((a) => {
          const unit = this.state.getPlotUnit(a.slotIndex);
          const stats = this.state.getPlotUnitStats(a.slotIndex);
          const chibi = unit ? getChibiById(unit.chibiId) : null;
          if (!unit || !stats || !chibi) return '';
          const rarity = getMinerRarity(chibi.id);
          const mut = getMutationById(unit.mutationId);
          const enc = getEnchantById(unit.enchantId);
          const rColor = RARITY_BORDER[rarity];
          const mutSpan =
            mut.id !== 'normal'
              ? ` <span style="color:#fff">•</span> <span class="${mut.id === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${mut.id === 'rainbow' ? '' : `color:${mut.color}`}">${mut.name}</span>`
              : '';
          const encSpan = enc
            ? ` <span style="color:#fff">•</span> <span class="${enc.rarity === 'rainbow' ? 'mam-rainbow-text' : ''}" style="${enc.rarity === 'rainbow' ? '' : `color:${enc.color}`}">${enc.name}</span>`
            : '';
          return `
            <div class="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 text-center whitespace-nowrap pointer-events-none" data-label-slot="${a.slotIndex}">
              <div class="text-[15px] font-black text-white leading-[1.05] mam-outline-sm">${chibi.name}</div>
              <div class="text-[12px] font-extrabold text-[#e2e8f0] leading-[1.1] mam-outline-sm">Level ${unit.damageLevel}</div>
              <div class="text-[13px] font-black leading-[1.1] mam-outline-sm" style="color:${rColor}">${rarity[0].toUpperCase() + rarity.slice(1)}${mutSpan}${encSpan}</div>
              <div class="mt-[5px] text-[15px] font-black text-[#ef4444] leading-[1.15] mam-outline-sm">🎯 ${fmtShort(stats.dmg)}</div>
            </div>
          `;
        })
        .join('');
    }

    for (const a of activeAnchors) {
      const lbl = this.plotLayerEl.querySelector<HTMLElement>(`[data-label-slot="${a.slotIndex}"]`);
      if (lbl) {
        lbl.style.left = `${a.labelX}px`;
        lbl.style.top = `${a.labelY}px`;
      }
    }
  }

  public openModal(kind: ModalKind): void {
    const prev = this.activeModal;
    this.activeModal = kind;
    if (kind !== prev) {
      audio.playSfx(kind === 'none' ? 'ui-close' : 'ui-open');
    }
    this.render();
  }

  public toggleModal(kind: ModalKind): void {
    const next = this.activeModal === kind ? 'none' : kind;
    this.activeModal = next;
    audio.playSfx(next === 'none' ? 'ui-close' : 'ui-open');
    this.render();
  }

  public setSceneMode(mode: SceneMode): void {
    if (this.sceneMode === 'tower' && mode !== 'tower' && this.state.towerRun) {
      this.state.abandonTowerRun();
    }
    if (mode !== 'altar') {
      if (this.enchantSpinSafetyTimer !== null) {
        window.clearTimeout(this.enchantSpinSafetyTimer);
        this.enchantSpinSafetyTimer = null;
      }
      if (this.enchantAutoTimer !== null) {
        window.clearTimeout(this.enchantAutoTimer);
        this.enchantAutoTimer = null;
      }
      this.enchantSpinning = false;
      this.enchantAutoRolling = false;
      audio.cancelEnchantSpinSfx();
    }
    this.sceneMode = mode;
    this.activeModal = 'none';
    this.inspectedSlot = null;
    this.onSetSceneMode?.(mode);
    if (mode === 'tower') {
      this.syncTowerSceneVisual();
    } else {
      audio.setSceneMode(mode);
    }
    this.render();
  }

  private syncTowerSceneVisual(): void {
    const run = this.state.towerRun;
    const floor = run?.floor ?? 1;
    const def = getTowerFloorDef(floor);
    const placedCount = this.state.plotMiners.filter(Boolean).length;
    const paused = Boolean(run?.pendingBlessings);
    if (this.sceneMode === 'tower') {
      audio.setSceneMode('tower', Boolean(run?.isBossWave));
    }
    this.onSyncTowerVisual?.({
      floor,
      wave: run?.wave ?? 1,
      isBossWave: Boolean(run?.isBossWave),
      isCheckpointFloor: def.isBoss,
      waveOres: run?.waveOres ?? [],
      anomalyColorHex: def.anomaly.color,
      equippedMinerCount: placedCount,
      paused,
    });
  }

  private handleTowerHitResolution(res: {
    dmgDealt: number;
    rockBroken: boolean;
    waveCleared: boolean;
    floorCleared: boolean;
    clearedFloor: number | null;
    clearedWave: number | null;
    gemsAwarded: number;
    diceAwarded: number;
    milestoneUnlocked: number | null;
  }): { dmg: number; broken: boolean } | undefined {
    if (res.dmgDealt <= 0 && !res.waveCleared && !res.floorCleared) return undefined;
    if (res.floorCleared) {
      audio.playSfx('rare-fanfare', { volume: 0.72 });
      const diceTxt = res.diceAwarded > 0 ? ` +${res.diceAwarded} Dice` : '';
      this.pushToast(`Floor ${res.clearedFloor} Cleared! +${fmtInt(res.gemsAwarded)} Gems${diceTxt}`);
      if (res.milestoneUnlocked) {
        this.pushToast(`Tower Milestone Floor ${res.milestoneUnlocked} Unlocked!`);
      }
      this.syncTowerSceneVisual();
      this.render();
    } else if (res.waveCleared) {
      audio.playSfx('wave-clear', { volume: 0.58 });
      const nextWave = this.state.towerRun?.wave ?? 1;
      const bossHint = nextWave === 10 ? ' • Boss Incoming!' : '';
      this.pushToast(`Wave ${res.clearedWave}/9 Cleared! +${fmtInt(res.gemsAwarded)} Gems${bossHint}`);
      this.syncTowerSceneVisual();
      this.render();
    } else {
      if (res.rockBroken) {
        audio.playOreBreak('tower');
        this.syncTowerSceneVisual();
      }
      this.towerUi.updateLiveValues(this.root);
    }
    return { dmg: res.dmgDealt, broken: res.rockBroken };
  }

  public handleTowerTargetClick(targetOreIndex: number | null): { dmg: number; broken?: boolean } | undefined {
    if (this.sceneMode !== 'tower' || !this.state.towerRun) return undefined;
    const res = this.state.tapTowerTarget(targetOreIndex);
    if (res.dmgDealt > 0) audio.playOreHit(true, true);
    return this.handleTowerHitResolution(res);
  }

  public handleTowerFighterStrike(
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number
  ): { dmg: number; broken?: boolean } | undefined {
    if (this.sceneMode !== 'tower' || !this.state.towerRun) return undefined;
    const res = this.state.applyTowerChibiStrike(slotIndex, targetOreIndex, attackInterval);
    if (res.dmgDealt > 0) {
      audio.playSfx('chibi-swing', { volume: 0.28, cooldownMs: 120, bucket: 'chibi-swing' });
    }
    return this.handleTowerHitResolution(res);
  }

  public handleTowerMonolithClick(): { dmg: number } | undefined {
    return this.handleTowerTargetClick(null);
  }

  private finishEnchantSpin(): void {
    if (this.enchantSpinSafetyTimer !== null) {
      window.clearTimeout(this.enchantSpinSafetyTimer);
      this.enchantSpinSafetyTimer = null;
    }
    if (!this.enchantSpinning) return;
    this.enchantSpinning = false;
    if (this.sceneMode === 'altar') {
      this.updateAltarLiveValues();
    }
  }

  private stopEnchantAutoRoll(reasonToast?: string): void {
    if (this.enchantAutoTimer !== null) {
      window.clearTimeout(this.enchantAutoTimer);
      this.enchantAutoTimer = null;
    }
    this.enchantAutoRolling = false;
    if (this.sceneMode === 'altar') {
      this.updateAltarLiveValues();
    }
    if (reasonToast) {
      this.pushToast(reasonToast);
    }
  }

  private triggerSingleEnchantRoll(): boolean {
    if (this.enchantSpinning) return false;
    if (this.state.enchantDice <= 0) {
      audio.playSfx('ui-error');
      if (this.enchantAutoRolling) {
        this.stopEnchantAutoRoll('Auto Roll stopped: Out of Enchanted Dice!');
      } else {
        this.pushToast('Out of Enchanted Dice!');
      }
      return false;
    }

    this.enchantSpinning = true;
    const rolled = this.state.rollEnchant();
    if (!rolled) {
      this.enchantSpinning = false;
      audio.playSfx('ui-error');
      if (this.enchantAutoRolling) {
        this.stopEnchantAutoRoll('Auto Roll stopped: Out of Enchanted Dice!');
      } else {
        this.pushToast('Out of Enchanted Dice!');
      }
      return false;
    }

    audio.playEnchantSpinStart(1.9);
    if (this.enchantSpinSafetyTimer !== null) {
      window.clearTimeout(this.enchantSpinSafetyTimer);
    }
    let finalized = false;
    const settle = () => {
      if (finalized) return;
      finalized = true;
      this.finishEnchantSpin();
      const isRare =
        rolled.rarity === 'epic' ||
        rolled.rarity === 'legendary' ||
        rolled.rarity === 'rainbow' ||
        rolled.rarity === 'mythic' ||
        rolled.rarity === 'exotic' ||
        rolled.rarity === 'secret';
      audio.playEnchantSpinLand(isRare);
      this.pushToast(`Rolled ${rolled.name} (${rolled.dmgMult}x DMG)!`);

      if (this.enchantAutoRolling && this.sceneMode === 'altar') {
        if (this.state.enchantDice <= 0) {
          this.stopEnchantAutoRoll('Auto Roll finished: Out of Enchanted Dice!');
          return;
        }
        if (this.enchantAutoTimer !== null) {
          window.clearTimeout(this.enchantAutoTimer);
        }
        this.enchantAutoTimer = window.setTimeout(() => {
          this.enchantAutoTimer = null;
          if (this.enchantAutoRolling && this.sceneMode === 'altar' && !this.enchantSpinning) {
            this.triggerSingleEnchantRoll();
          }
        }, 260);
      }
    };

    if (this.onTriggerEnchantSpin) {
      this.enchantSpinSafetyTimer = window.setTimeout(settle, 2500);
      this.onTriggerEnchantSpin(rolled.id, settle);
    } else {
      settle();
    }
    return true;
  }

  public openShopStation(station: ShopStationId): void {
    if (station === 'altar') {
      this.setSceneMode('altar');
    } else if (station === 'tower') {
      this.towerUi.syncDefaultCheckpoint();
      this.activeModal = 'tower';
      this.render();
    } else if (station === 'pickaxe') {
      this.activeModal = 'pickaxe-shop';
      this.render();
    } else if (station === 'gems') {
      this.activeModal = 'gem-shop';
      this.render();
    } else {
      this.activeModal = 'sell-shop';
      this.render();
    }
  }

  public updateShopAnchors(anchors: ShopStationAnchor[]): void {
    if (!this.shopLayerEl) return;
    if (this.sceneMode !== 'shop' || this.activeModal !== 'none') {
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
      const signStyle = (id: ShopStationId): { bg: string; title: string } => {
        if (id === 'gems') {
          return {
            bg: 'bg-[linear-gradient(180deg,#6b21a8_0%,#3b0764_100%)] shadow-[inset_0_2px_0_rgba(244,114,182,0.35),0_5px_0_#1e1b4b,0_10px_20px_rgba(0,0,0,0.55)]',
            title: 'text-[#f472b6]',
          };
        }
        if (id === 'altar') {
          return {
            bg: 'bg-[linear-gradient(180deg,#4c1d95_0%,#1e1b4b_100%)] shadow-[inset_0_2px_0_rgba(192,132,252,0.35),0_5px_0_#090d16,0_10px_20px_rgba(0,0,0,0.55)]',
            title: 'text-[#e879f9]',
          };
        }
        if (id === 'tower') {
          return {
            bg: 'bg-[linear-gradient(180deg,#0369a1_0%,#1e1b4b_100%)] shadow-[inset_0_2px_0_rgba(56,189,248,0.4),0_5px_0_#090d16,0_10px_20px_rgba(0,0,0,0.58)]',
            title: 'text-[#38bdf8]',
          };
        }
        return {
          bg: 'bg-[linear-gradient(180deg,#475569_0%,#1e293b_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_5px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.5)]',
          title: id === 'pickaxe' ? 'text-[#38bdf8]' : id === 'sell' ? 'text-[#4ade80]' : 'text-[#facc15]',
        };
      };
      this.shopLayerEl.innerHTML = visible
        .map((a) => {
          const st = signStyle(a.id);
          return `
          <button class="${TW_SHOP_SIGN_BASE} ${st.bg} mam-outline-sm" data-shop-station="${a.id}">
            <div class="text-[16px] font-black ${st.title}">${a.title}</div>
            <div class="text-[12px] font-extrabold text-[#e2e8f0]">${a.subtitle}</div>
          </button>
        `;
        })
        .join('');
      this.shopLayerEl.querySelectorAll('[data-shop-station]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.shopStation as ShopStationId;
          this.openShopStation(id);
        });
      });
    }
    for (const a of visible) {
      const el = this.shopLayerEl.querySelector<HTMLElement>(`[data-shop-station="${a.id}"]`);
      if (!el) continue;
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
    }
  }

  public updateAltarAnchors(anchors: AltarPedestalAnchor[]): void {
    if (!this.shopLayerEl) return;
    if (this.sceneMode !== 'altar') {
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
      this.shopLayerEl.innerHTML = visible
        .map(
          (a) => `
          <div class="absolute -translate-x-1/2 -translate-y-full text-left transition-transform duration-150 ease-out pointer-events-none [&.is-hi]:-translate-y-[115%] [&.is-hi]:scale-[1.16] ${a.highlighted ? 'is-hi' : ''}" data-altar-lbl="${a.id}">
            <div class="inline-flex items-center gap-[5px] py-[3px] pr-2 pl-[5px] rounded-full border-[1.5px] border-[var(--aura-border,#a855f7)] bg-[rgba(10,12,24,0.84)] shadow-[0_3px_10px_rgba(0,0,0,0.55)] whitespace-nowrap [&>.mam-3d-icon]:w-[22px] [&>.mam-3d-icon]:h-[22px] [&>.mam-3d-icon]:shrink-0" style="--aura-border:${a.color}">
              ${enchantAuraIconHtml(a.id, a.color, 22, a.name)}
              <div class="flex flex-col items-start leading-none">
                <div class="text-[12px] font-black leading-[1.05] mam-outline-sm" style="color:${a.color}">${a.name}</div>
                <div class="text-[10px] font-extrabold text-[#e2e8f0] mam-outline-sm">${a.chancePct}%</div>
              </div>
            </div>
          </div>
        `
        )
        .join('');
    }
    for (const a of visible) {
      const el = this.shopLayerEl.querySelector<HTMLElement>(`[data-altar-lbl="${a.id}"]`);
      if (!el) continue;
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
    }
  }

  public pushToast(text: string): void {
    const id = this.nextToastId++;
    this.toasts.push({ id, text });
    if (this.toasts.length > 3) this.toasts.shift();
    this.renderToasts();
    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.renderToasts();
    }, 1800);
  }

  private renderToastStack(): string {
    return `<div class="${TW_TOAST_STACK}" data-toast-stack="true"></div>`;
  }

  private updateViewportScale(): void {
    if (typeof window === 'undefined') return;
    const vw = Math.max(320, window.innerWidth || 1280);
    const vh = Math.max(240, window.innerHeight || 720);
    const scale = Math.max(0.5, Math.min(1, vw / 1160, vh / 660));
    const logicalW = vw / scale;
    const logicalH = vh / scale;

    if (scale >= 0.999) {
      this.root.style.width = '100%';
      this.root.style.height = '100%';
      this.root.style.transform = 'none';
    } else {
      this.root.style.width = `${logicalW.toFixed(2)}px`;
      this.root.style.height = `${logicalH.toFixed(2)}px`;
      this.root.style.transform = `scale(${scale.toFixed(4)})`;
    }
    this.root.style.transformOrigin = 'top left';
    this.root.dataset.hudCompact = logicalW < 920 ? 'true' : 'false';
    this.root.dataset.hudPotsAbove = logicalW < 1340 ? 'true' : 'false';
    this.root.dataset.hudShort = logicalH < 640 ? 'true' : 'false';

    const floatScale = Math.max(0.68, Math.min(1, scale));
    document.documentElement.style.setProperty('--mam-ui-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--mam-float-scale', floatScale.toFixed(4));
  }

  private renderCurrencyRail(opts: {
    topAlign?: boolean;
    showGemsPlus?: boolean;
    showCash?: boolean;
    quickButtonsHtml?: string;
  }): string {
    const posCls = opts.topAlign
      ? 'top-[14px]'
      : 'top-[42%] -translate-y-1/2 [[data-hud-compact=true]_&]:top-16 [[data-hud-compact=true]_&]:translate-y-0 [[data-hud-short=true]_&]:top-[36%]';
    const plusBtn = opts.showGemsPlus
      ? `<button class="${TW_PLUS_BTN} mam-outline-sm" data-action="gems-plus">+</button>`
      : '';
    const cashBar = opts.showCash
      ? `<div class="${TW_CURRENCY_BAR}">
          <span class="text-[28px] font-black text-[#4ade80] tracking-[0.3px] mam-outline" data-hud-cash="true">${fmtMoney(this.state.cash)}</span>
        </div>`
      : '';
    const quickRow = opts.quickButtonsHtml ? `<div class="flex items-center gap-2 mt-0.5">${opts.quickButtonsHtml}</div>` : '';
    const muted = audio.isMuted();
    const audioIcon = muted
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#f87171" fill-opacity="0.2"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#38bdf8" fill-opacity="0.22"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

    return `
      <div class="absolute right-4 ${posCls} flex flex-col items-end gap-1.5">
        <div class="flex items-center gap-2">
          <button
            class="w-11 h-11 rounded-2xl border ${muted ? 'border-rose-400/50' : 'border-sky-300/40'} bg-[rgba(12,16,28,0.86)] backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer transition-[transform,filter,border-color] duration-150 hover:brightness-110 active:scale-95 pointer-events-auto"
            data-action="toggle-audio"
            title="${muted ? 'Unmute Audio' : 'Mute Audio'}"
            aria-label="${muted ? 'Unmute Audio' : 'Mute Audio'}"
          >
            ${audioIcon}
          </button>
          <div class="${TW_CURRENCY_BAR}">
            ${hudIconHtml('gem', 28, 'Gems')}
            <span class="text-[20px] font-extrabold text-white mam-outline-sm" data-hud-gems="true">${fmtInt(this.state.gems)}</span>
            ${plusBtn}
          </div>
        </div>
        ${cashBar}
        ${quickRow}
      </div>
    `;
  }

  private renderHotbarBagButton(): string {
    const bagBorder =
      this.activeModal === 'inventory'
        ? 'border-[#4ade80]/80 bg-[linear-gradient(160deg,rgba(34,197,94,0.85)_0%,rgba(21,128,61,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_16px_rgba(74,222,128,0.45)]'
        : 'border-[#60a5fa]/60 bg-[linear-gradient(160deg,rgba(37,99,235,0.75)_0%,rgba(15,23,42,0.9)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.45)]';
    return `
      <button class="${TW_HOTBAR_SLOT} backdrop-blur-md border-[1.5px] ${bagBorder}" data-action="toggle-inventory" title="Inventory (\`)">
        <span class="${TW_HOTBAR_NUM} mam-outline-sm">\`</span>
        <div class="mam-card-art">${hudIconHtml('backpack', 44, 'Backpack')}</div>
      </button>
    `;
  }

  private renderToasts(): void {
    const el = this.root.querySelector('[data-toast-stack="true"]');
    if (!el) return;
    el.innerHTML = this.toasts
      .map((t) => `<div class="${TW_TOAST_ITEM} mam-outline-sm">${t.text}</div>`)
      .join('');
  }

  public render(): void {
    const viewKey = `${this.sceneMode}:${this.activeModal}:${this.inspectedSlot ?? 'none'}`;
    const sameView = viewKey === this.lastRenderViewKey;
    const prevGridScroll = sameView ? this.root.querySelector<HTMLElement>('.mam-grid')?.scrollTop ?? 0 : 0;
    this.lastRenderViewKey = viewKey;

    if (this.plotLayerEl && this.activeModal === 'none' && this.inspectedSlot === null && this.sceneMode === 'mine') {
      this.plotLayerEl.dataset.keys = '';
    }

    try {
      if (this.inspectedSlot !== null) {
        this.plotInspectUi.render(this.root, this.inspectedSlot);
        return;
      }

      if (this.sceneMode === 'altar') {
        this.renderAltarHud();
        return;
      }

      if (this.sceneMode === 'tower') {
        this.renderTowerHud();
        return;
      }

      if (this.sceneMode === 'shop') {
        this.renderShopWorldHud();
        return;
      }

      const chestCount = this.state.getChestItemCount();
      const quickButtonsHtml = `
        <button class="${TW_QUICK_BTN_DAILY} mam-outline-sm" title="Daily Rewards" data-action="quick-daily">
          <span class="${TW_BADGE_BASE} min-w-[17px] h-[17px] px-1 text-[11px]">1</span>${hudIconHtml('daily', 20, 'Daily')}
        </button>
        <button class="${TW_QUICK_BTN_CHEST} mam-outline-sm" title="Chest (${fmtInt(chestCount)})" data-action="open-chest">
          ${hudIconHtml('chest', 22, 'Chest')}
        </button>
        <button class="${TW_QUICK_BTN_QUEST} mam-outline-sm" title="Quests" data-action="quick-quest">
          ${hudIconHtml('quest', 20, 'Quests')}
        </button>
        <button class="${TW_QUICK_BTN_TRADE} mam-outline-sm" data-action="quick-trade">
          ${hudIconHtml('trade', 20, 'Trade')} <span>Trade</span>
        </button>
      `;

      const activeWorld = getWorldById(this.state.activeWorldId);
      const upgradeCount = this.state.getAffordableResearchCount();

      this.root.innerHTML = `
      ${this.renderWeatherWidget()}
      <div class="${TW_TOP_CENTER} flex items-center gap-2.5 @max-[720px]:gap-1.5 whitespace-nowrap">
        <button class="${TW_SHOPS_PILL} mam-outline" data-action="shops-pill">
          ${hudIconHtml('shops', 28, 'Shops')}
          <span>Shops</span>
        </button>
        <button class="inline-flex items-center gap-2 @max-[720px]:gap-1.5 px-4 @max-[720px]:px-3 py-2 @max-[720px]:py-1.5 rounded-2xl border border-sky-300/45 bg-[linear-gradient(135deg,rgba(14,165,233,0.88),rgba(37,99,235,0.92))] backdrop-blur-md shadow-[0_8px_22px_rgba(37,99,235,0.32),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[15px] @max-[720px]:text-[13px] font-extrabold cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] mam-outline-sm" data-action="open-worlds" title="Teleport & Unlock Worlds">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="#0f172a" stroke="#bae6fd" stroke-width="2"/>
            <ellipse cx="12" cy="12" rx="4.5" ry="7.5" fill="none" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="12" cy="12" r="2.2" fill="#facc15"/>
          </svg>
          <span>Teleport</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(15,23,42,0.48)] border border-white/25 text-[12px] font-black">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${activeWorld.iconColor};box-shadow:0 0 6px ${activeWorld.iconColor}"></span>
            <span>${activeWorld.name}</span>
          </span>
        </button>
      </div>

      <div class="absolute left-4 @max-[720px]:left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 @max-[720px]:gap-2">
        <button class="${TW_SIDE_BTN_RAINBOW}" data-action="open-shop">
          ${hudIconHtml('shopBasket', 44, 'Shop')}
          <span class="text-[14px] font-extrabold leading-none mam-outline-sm">Shop</span>
        </button>
        <button class="${TW_SIDE_BTN_UPGRADES}" data-action="open-upgrades">
          <span class="${TW_BADGE_BASE} min-w-[24px] h-6 px-1.5 text-[13px] mam-outline-sm ${upgradeCount > 0 ? '' : 'hidden'}" data-upgrades-badge="true">${upgradeCount}</span>
          ${hudIconHtml('hourglass', 44, 'Upgrades')}
          <span class="text-[14px] font-extrabold leading-none mam-outline-sm">Upgrades</span>
        </button>
        <button class="${TW_SIDE_BTN_INDEX}" data-action="open-index">
          ${hudIconHtml('indexBook', 44, 'Index')}
          <span class="text-[14px] font-extrabold leading-none mam-outline-sm">Index</span>
        </button>
      </div>

      ${this.renderCurrencyRail({ showGemsPlus: true, showCash: true, quickButtonsHtml })}

      <div class="absolute bottom-[14px] left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] flex items-end gap-1.5 @max-[860px]:gap-1 pointer-events-auto" data-hud-hotbar="true">
        ${this.renderHotbarSlots()}
        ${this.renderHotbarBagButton()}
      </div>

      ${this.renderActivePotionsDock()}
      ${this.renderActiveModal()}
      ${this.renderToastStack()}
    `;

      this.bindEvents();
      refreshPotionTimersInDom(this.root, this.state);
      this.renderToasts();
    } finally {
      if (prevGridScroll > 0) {
        const nextGrid = this.root.querySelector<HTMLElement>('.mam-grid');
        if (nextGrid) nextGrid.scrollTop = prevGridScroll;
      }
    }
  }

  private renderHotbarSlots(): string {
    return this.state.hotbar
      .map((itemId, idx) => {
        const isSelected = this.state.selectedHotbarSlot === idx;
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
          qty = this.state.miners[chibi.id] || 0;
        } else {
          const ore = getOreById(itemId);
          if (!ore) return emptySlot;
          rarity = ore.rarity;
          title = ore.name;
          artHtml = oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `hb_${idx}_${ore.id}`);
          worth = this.state.getEffectiveOreSellValue(ore.id);
          qty = this.state.ores[ore.id] || 0;
        }

        if (qty <= 0) return emptySlot;

        return `
          <button class="${TW_HOTBAR_SLOT} cursor-grab active:cursor-grabbing select-none touch-none [&>*]:pointer-events-none ${rarityCardClasses(rarity, selectedCls)}" style="${rarityVars(rarity)}" data-hotbar="${idx}" title="${title} (Worth ${fmtMoney(worth)}) • Drag to move">
            <span class="${TW_HOTBAR_NUM} mam-outline-sm">${idx + 1}</span>
            ${qty > 1 ? `<span class="absolute top-0.5 right-[4px] text-[10px] font-extrabold text-white z-[3] mam-outline-sm">x${fmtShort(qty)}</span>` : ''}
            <div class="mam-card-art">${artHtml}</div>
            <div class="mam-card-bottom mt-auto">
              <span class="mam-card-val mam-outline-sm">${fmtMoney(worth)}</span>
            </div>
          </button>
        `;
      })
      .join('');
  }

  private renderActiveModal(): string {
    if (this.activeModal === 'index') return this.collectionUi.renderIndexModal();
    if (this.activeModal === 'inventory') return this.collectionUi.renderInventoryModal();
    if (this.activeModal === 'chest') return this.collectionUi.renderChestModal();
    if (this.activeModal === 'pickaxe-shop') return this.shopUi.renderPickaxeShopModal();
    if (this.activeModal === 'sell-shop') return this.shopUi.renderSellShopModal();
    if (this.activeModal === 'gem-shop') return this.shopUi.renderGemShopModal();
    if (this.activeModal === 'upgrades') return this.upgradesUi.renderUpgradesModal();
    if (this.activeModal === 'worlds') return this.upgradesUi.renderWorldsModal();
    if (this.activeModal === 'tower') return this.towerUi.renderTowerHubModal();
    return '';
  }

  private renderTowerHud(): void {
    this.syncTowerSceneVisual();
    this.root.innerHTML = this.towerUi.renderTowerArenaHud(
      this.renderCurrencyRail({ topAlign: true }),
      this.renderToastStack()
    );
    this.bindEvents();
    this.renderToasts();
  }

  private renderShopWorldHud(): void {
    const dockBtnPickaxe = `${TW_SHOP_DOCK_BTN_BASE} border border-orange-400/60 bg-[linear-gradient(160deg,rgba(234,88,12,0.8)_0%,rgba(67,20,7,0.9)_100%)]`;
    const dockBtnSell = `${TW_SHOP_DOCK_BTN_BASE} border border-emerald-400/60 bg-[linear-gradient(160deg,rgba(16,185,129,0.8)_0%,rgba(6,78,59,0.9)_100%)]`;
    const dockBtnGem = `${TW_SHOP_DOCK_BTN_BASE} border border-cyan-400/60 bg-[linear-gradient(160deg,rgba(6,182,212,0.8)_0%,rgba(22,78,99,0.9)_100%)]`;
    const dockBtnRainbow = `${TW_SHOP_DOCK_BTN_BASE} border-[1.5px] border-transparent [background:linear-gradient(160deg,rgba(88,28,135,0.85)_0%,rgba(17,24,39,0.94)_100%)_padding-box,linear-gradient(135deg,#f43f5e,#f59e0b,#22c55e,#38bdf8,#c084fc)_border-box]`;
    const dockBtnTower = `${TW_SHOP_DOCK_BTN_BASE} border border-sky-400/65 bg-[linear-gradient(160deg,rgba(14,116,144,0.84)_0%,rgba(30,27,75,0.92)_100%)]`;

    this.root.innerHTML = `
      ${this.renderWeatherWidget()}
      <div class="${TW_TOP_CENTER}">
        <button class="${TW_SHOPS_PILL} mam-outline" data-action="back-to-mine">
          ${hudIconHtml('shops', 28, 'Mine')}
          <span>Back to Mine</span>
        </button>
      </div>

      <div class="mam-no-scrollbar absolute left-1/2 bottom-[14px] -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[rgba(12,16,28,0.84)] border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.6)] max-w-[calc(100%-24px)] overflow-x-auto">
        <button class="${dockBtnPickaxe}" data-action="open-pickaxe-shop">
          ${hudIconHtml('pickaxe', 28, 'Pickaxe')}
          <span class="mam-outline-sm">Pickaxes</span>
        </button>
        <button class="${dockBtnSell}" data-action="open-sell-shop">
          ${hudIconHtml('trade', 28, 'Sell')}
          <span class="mam-outline-sm">Sell</span>
        </button>
        <button class="${dockBtnGem}" data-action="open-gem-shop">
          ${hudIconHtml('gem', 28, 'Gem Shop')}
          <span class="mam-outline-sm">Gem Shop</span>
        </button>
        <button class="${dockBtnRainbow}" data-action="open-enchant-altar">
          ${hudIconHtml('enchant', 28, 'Enchant')}
          <span class="mam-outline-sm">Enhance</span>
        </button>
        <button class="${dockBtnTower}" data-action="open-gem-tower">
          ${towerIconHtml(26)}
          <span class="mam-outline-sm">Tower</span>
        </button>
      </div>

      ${this.renderCurrencyRail({ topAlign: true, showCash: true })}

      ${this.renderActivePotionsDock()}
      ${this.renderActiveModal()}
      ${this.renderToastStack()}
    `;
    this.bindEvents();
    this.renderToasts();
  }

  private renderAltarHud(): void {
    const outOfRolls = this.state.enchantDice <= 0;
    const spinning = this.enchantSpinning;
    const stripCards = ENCHANTS.map((e) => {
      const qty = this.state.ownedEnchants[e.id] || 0;
      const borderBg =
        e.rarity === 'rainbow'
          ? 'rarity-rainbow'
          : 'border-[2.5px] border-[var(--rarity-border,#64748b)] bg-[radial-gradient(circle_at_50%_45%,var(--rarity-bg,rgba(100,116,139,0.3)),#0f172a_85%)]';
      return `
        <div class="mam-altar-card relative h-[102px] @max-[920px]:h-[86px] rounded-[7px] flex flex-col items-center justify-between py-[5px] px-1 transition-[transform,filter] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-[3px] hover:scale-[1.04] hover:brightness-[1.08] ${borderBg}" style="--rarity-border:${e.color};--rarity-bg:${e.color}33" data-altar-card="${e.id}">
          <div class="w-full flex items-center justify-center gap-1">
            <span class="text-[12px] font-black mam-outline-sm" style="color:${e.color}">${e.name}</span>
            <span class="text-[11px] font-black text-[#facc15] mam-outline-sm" data-altar-qty="${e.id}">${qty > 0 ? `x${fmtInt(qty)}` : ''}</span>
          </div>
          <div class="flex-1 min-h-0 flex items-center justify-center pointer-events-none [&>.mam-3d-icon]:w-[46px] [&>.mam-3d-icon]:h-[46px]">${enchantAuraIconHtml(e.id, e.color, 46, e.name)}</div>
          <div class="text-[11px] font-black text-[#f8fafc] mam-outline-sm">${e.chancePct}%</div>
        </div>
      `;
    }).join('');

    this.root.innerHTML = `
      ${this.renderWeatherWidget()}
      <div class="${TW_TOP_CENTER}">
        <button class="px-[46px] py-2 rounded-lg border-[2.5px] border-[#431407] bg-[linear-gradient(180deg,#ea580c_0%,#c2410c_60%,#9a3412_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_5px_0_#431407,0_8px_18px_rgba(0,0,0,0.55)] text-white text-[20px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-[1.04] hover:brightness-[1.09] active:translate-y-[3px] active:scale-[0.96] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_2px_0_#431407,0_4px_10px_rgba(0,0,0,0.45)] mam-outline" data-action="altar-back">Back</button>
      </div>

      ${this.renderCurrencyRail({})}

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(1240px,calc(100%-24px))] flex flex-col items-center gap-2 pointer-events-auto">
        <div class="flex items-stretch gap-2.5 flex-wrap justify-center">
          <div class="min-w-[88px] rounded-lg border-2 border-[#7c3aed] bg-[radial-gradient(circle_at_50%_55%,rgba(168,85,247,0.25),rgba(15,23,42,0.94)_80%)] flex flex-col items-center justify-between gap-0.5 px-2 py-[5px] text-center">
            <div class="text-[12px] font-extrabold text-[#e2e8f0] leading-[1.1] mam-outline-sm">Enchanted<br/>Dice</div>
            <div class="flex items-center justify-center h-[34px] [&>.mam-3d-icon]:w-[34px] [&>.mam-3d-icon]:h-[34px]">${enchantDiceIconHtml(34)}</div>
            <div class="text-[14px] font-black mam-outline-sm" data-altar-dice-count="true" style="color:${outOfRolls ? '#f87171' : '#4ade80'}">${fmtInt(this.state.enchantDice)}/1</div>
          </div>
          <div class="flex flex-col gap-2 items-stretch justify-center">
            <button class="mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-lg border-[2.5px] border-[#14532d] bg-[linear-gradient(180deg,#4ade80_0%,#16a34a_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_0_#14532d] text-white text-[15px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-[1.09] active:translate-y-[3px] active:scale-[0.96] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_1px_0_#14532d] mam-outline-sm" data-action="buy-dice">Buy Dice (${ENCHANT_DICE_GEM_COST} Gems)</button>
            <button class="${TW_ALTAR_AUTO_BTN} mam-outline-sm ${this.enchantAutoRolling ? 'is-active' : ''}" data-action="toggle-auto-enchant">${this.enchantAutoRolling ? 'Stop' : 'Auto Roll'}</button>
          </div>
        </div>

        <button
          class="${TW_ALTAR_ROLL_BTN} mam-outline ${spinning ? 'is-spinning' : outOfRolls ? 'is-empty' : ''}"
          data-action="roll-enchant"
          ${spinning ? 'disabled' : ''}
        >
          ${spinning ? '<span class="inline-block animate-[mamSpinPulse_0.65s_ease-in-out_infinite_alternate]">Spinning...</span>' : outOfRolls ? 'Out of Rolls' : 'Roll'}
        </button>

        <div class="w-full grid grid-cols-10 @max-[920px]:grid-cols-5 gap-2 @max-[920px]:gap-1.5">
          ${stripCards}
        </div>
      </div>

      ${this.renderToastStack()}
    `;
    this.bindEvents();
    this.renderToasts();
  }

  private bindEvents(): void {
    this.root.querySelector('[data-backdrop="true"]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.openModal('none');
    });

    this.root.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = (el as HTMLElement).dataset.action;
        if (action === 'open-index') this.toggleModal('index');
        else if (action === 'toggle-audio') {
          const nextMuted = audio.toggleMuted();
          this.pushToast(nextMuted ? 'Audio Muted' : 'Audio On');
          this.render();
        } else if (action === 'toggle-inventory') this.toggleModal('inventory');
        else if (action === 'open-chest') this.toggleModal('chest');
        else if (action === 'close-modal') this.openModal('none');
        else if (action === 'equip-best') {
          this.state.equipBestMiners();
          audio.playSfx('place-chibi');
          this.pushToast('Equipped best miners to Plot!');
        } else if (action === 'chest-take-all') {
          const taken = this.state.takeAllFromChest();
          audio.playSfx(taken > 0 ? 'coin-alt' : 'ui-error');
          this.pushToast(taken > 0 ? `Collected ${fmtInt(taken)} items!` : 'Chest is empty');
        } else if (action === 'shops-pill') {
          audio.playSfx('teleport', { volume: 0.45 });
          this.setSceneMode('shop');
        } else if (action === 'back-to-mine') {
          audio.playSfx('teleport', { volume: 0.45 });
          this.setSceneMode('mine');
        } else if (action === 'altar-back') {
          audio.playSfx('ui-close');
          this.setSceneMode('shop');
        } else if (action === 'open-pickaxe-shop') {
          this.openShopStation('pickaxe');
        } else if (action === 'open-sell-shop') {
          this.openShopStation('sell');
        } else if (action === 'open-gem-shop') {
          this.openShopStation('gems');
        } else if (action === 'open-enchant-altar') {
          audio.playSfx('ui-open');
          this.openShopStation('altar');
        } else if (action === 'open-gem-tower') {
          this.openShopStation('tower');
        } else if (action === 'sell-select-all') {
          audio.playSfx('ui-tab');
          this.shopUi.toggleSellSelectAll(this.root);
        } else if (action === 'sell-selected') {
          this.shopUi.sellSelectedItems(this.root);
        } else if (action === 'buy-dice') {
          if (this.state.buyEnchantDice(1)) {
            audio.playSfx('coin-alt');
            this.pushToast('+1 Enchanted Dice!');
          } else {
            audio.playSfx('ui-error');
            this.pushToast(`Need ${ENCHANT_DICE_GEM_COST} Gems!`);
          }
        } else if (action === 'roll-enchant') {
          this.triggerSingleEnchantRoll();
        } else if (action === 'toggle-auto-enchant') {
          if (this.enchantAutoRolling) {
            audio.playSfx('ui-click');
            this.stopEnchantAutoRoll('Auto Roll stopped');
          } else if (this.state.enchantDice <= 0 && !this.enchantSpinning) {
            audio.playSfx('ui-error');
            this.pushToast('Out of Enchanted Dice!');
          } else {
            this.enchantAutoRolling = true;
            audio.playSfx('ui-tab');
            this.updateAltarLiveValues();
            if (!this.enchantSpinning) {
              this.triggerSingleEnchantRoll();
            }
          }
        } else if (action === 'open-worlds') {
          this.toggleModal('worlds');
        } else if (action === 'open-upgrades') {
          if (this.activeModal !== 'upgrades') {
            this.upgradesUi.syncActiveWorldTab();
          }
          this.toggleModal('upgrades');
        } else if (action === 'toggle-weather-info') {
          audio.playSfx('ui-tab');
          this.weatherPopoverOpen = !this.weatherPopoverOpen;
          this.syncWeatherWidget(true);
        } else if (
          action === 'open-shop' ||
          action === 'gems-plus' ||
          action === 'quick-daily' ||
          action === 'quick-quest' ||
          action === 'quick-trade'
        ) {
          audio.playSfx('ui-click');
          this.pushToast('Coming soon!');
        }
      });
    });

    this.bindHotbarEvents(this.root);
    this.upgradesUi.bindUpgradesEvents(this.root);
    this.upgradesUi.bindWorldsEvents(this.root);
    this.collectionUi.bindEvents(this.root);
    this.shopUi.bindEvents(this.root);
    this.towerUi.bindHubEvents(this.root);
    this.towerUi.bindArenaEvents(this.root);
  }

  private cleanupHotbarDrag(): void {
    const drag = this.hotbarDrag;
    if (!drag) return;
    this.hotbarDrag = null;
    window.removeEventListener('pointermove', drag.onMove);
    window.removeEventListener('pointerup', drag.onUp);
    window.removeEventListener('pointercancel', drag.onCancel);
    window.removeEventListener('blur', drag.onCancel);
    drag.sourceEl.classList.remove('mam-hotbar-dragging');
    this.root.querySelectorAll('.mam-hotbar-drop-target').forEach((n) => {
      n.classList.remove('mam-hotbar-drop-target');
    });
    this.plotDropOps?.highlightPlot(null);
    drag.ghostEl?.remove();
  }

  private updateHotbarDropHighlight(targetSlot: number | null): void {
    if (!this.hotbarDrag || this.hotbarDrag.hoverSlot === targetSlot) return;
    if (this.hotbarDrag.hoverSlot !== null) {
      this.root
        .querySelector(`[data-hotbar="${this.hotbarDrag.hoverSlot}"]`)
        ?.classList.remove('mam-hotbar-drop-target');
    }
    this.hotbarDrag.hoverSlot = targetSlot;
    if (targetSlot !== null) {
      this.root
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

  private canDropHotbarOnPlot(): boolean {
    return this.sceneMode === 'mine' && this.activeModal === 'none' && this.inspectedSlot === null;
  }

  private bindHotbarEvents(scope: ParentNode): void {
    this.cleanupHotbarDrag();
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
        this.cleanupHotbarDrag();

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
          this.updateHotbarDropHighlight(validTarget);

          const hoveredPlot =
            hoveredHotbar === null && this.canDropHotbarOnPlot()
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
            wasActive && dropHotbar === null && this.canDropHotbarOnPlot()
              ? (this.plotDropOps?.raycastPlotAt(ev.clientX, ev.clientY) ?? drag.hoverPlot)
              : null;

          this.cleanupHotbarDrag();

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
            } else if (res === 'not-miner') {
              this.pushToast('Only Miners can be placed on Plots!');
            }
          }
        };

        const onCancel = () => {
          if (this.hotbarDrag?.active) {
            this.suppressHotbarClickUntil = performance.now() + 250;
          }
          this.cleanupHotbarDrag();
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

  private updateCurrencyLiveValues(): void {
    const gemsEl = this.root.querySelector('[data-hud-gems="true"]');
    if (gemsEl) gemsEl.textContent = fmtInt(this.state.gems);
    const cashEl = this.root.querySelector('[data-hud-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);
  }

  private buildActivePotionsDockContent(now = Date.now()): {
    single: boolean;
    empty: boolean;
    key: string;
    html: string;
    active: Array<{ def: GemShopItemDef; rem: number }>;
  } {
    const active: Array<{ def: GemShopItemDef; rem: number }> = [];
    for (const def of GEM_SHOP_ITEMS) {
      const rem = this.state.getBoostRemainingSec(def.id, now);
      if (rem > 0) active.push({ def, rem });
    }
    const rows: Array<Array<{ def: GemShopItemDef; rem: number }>> = [];
    for (let i = 0; i < active.length; i += 2) {
      rows.push(active.slice(i, i + 2));
    }
    const ordered = rows.reverse().flat();
    const key = ordered.map((x) => x.def.id).join(',');
    const html = ordered
      .map(({ def, rem }) => {
        const mm = Math.floor(rem / 60);
        const ss = String(rem % 60).padStart(2, '0');
        return `
          <div class="${TW_ACTIVE_POT_PILL}" style="--pot-color:${def.color}" data-hud-pot="${def.id}" title="${def.name} • ${def.effectText}">
            <div class="w-[30px] h-[30px] shrink-0 flex items-center justify-center @max-[720px]:w-[26px] @max-[720px]:h-[26px]">${gemPotionIconHtml(def.id, 30, def.name, def.color)}</div>
            <div class="flex-1 min-w-0 flex flex-col gap-px">
              <div class="text-[11px] font-extrabold text-[#f8fafc] leading-[1.15] whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm">${def.name}</div>
              <div class="flex items-center gap-[5px]">
                <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0 animate-[mamPotDotPulse_1.4s_ease-in-out_infinite]"></span>
                <span class="text-[12px] font-black text-[#4ade80] tabular-nums leading-[1.1] mam-outline-sm" data-hud-pot-timer="${def.id}">${mm}:${ss}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
    return {
      single: ordered.length === 1,
      empty: ordered.length === 0,
      key,
      html,
      active: ordered,
    };
  }

  private formatWeatherTimer(sec: number): string {
    const mm = Math.floor(sec / 60);
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  private buildWeatherWidgetInnerHtml(now = Date.now()): string {
    const w = this.state.getActiveWeather();
    const timerTxt = this.formatWeatherTimer(this.state.getWeatherRemainingSec(now));
    const popoverHtml = this.weatherPopoverOpen
      ? `
      <div class="w-[290px] rounded-2xl border border-white/15 bg-[rgba(10,14,24,0.94)] backdrop-blur-xl shadow-[0_18px_38px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.16)] p-2.5 flex flex-col gap-1.5">
        <div class="flex items-center justify-between px-1 pb-1 border-b border-white/10">
          <span class="text-[11px] font-black uppercase tracking-wider text-slate-300">Weather Forecast</span>
          <span class="text-[10px] font-extrabold text-sky-300">Rolls every 3:00</span>
        </div>
        ${WEATHERS.map((item) => {
          const isActive = item.id === w.id;
          return `
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-xl border ${isActive ? 'bg-white/10' : 'bg-white/[0.03] border-white/8'}" style="${isActive ? `border-color:${item.accentColor};box-shadow:0 0 12px ${item.glowColor}33` : ''}">
              <div class="w-8 h-8 shrink-0 flex items-center justify-center [&>.mam-3d-icon]:w-8 [&>.mam-3d-icon]:h-8">${weatherIconHtml(item.id, 32, item.name)}</div>
              <div class="flex-1 min-w-0 flex flex-col">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[12px] font-black leading-tight truncate mam-outline-sm" style="color:${item.accentColor}">${item.name}</span>
                  <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-black/40 text-slate-200 border border-white/10">${item.chancePct}%</span>
                </div>
                <div class="text-[10px] font-bold text-slate-300 leading-tight mt-0.5">${item.oreDropMult}x Ore • ${item.gemDropMult}x Gems • ${item.damageMult}x DMG</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `
      : '';

    return `
      <button
        class="group relative flex items-center gap-2.5 @max-[720px]:gap-2 pl-2 pr-3 py-1.5 rounded-2xl border backdrop-blur-xl bg-[rgba(12,16,28,0.84)] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
        style="border-color:${w.accentColor}99;box-shadow:0 0 18px ${w.glowColor}3d,inset 0_1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(0,0,0,0.52)"
        data-action="toggle-weather-info"
        title="${w.name} (${w.chancePct}%): ${w.oreDropMult}x Ore • ${w.gemDropMult}x Gems • ${w.damageMult}x Damage — Click for forecast"
      >
        <div
          class="w-[42px] h-[42px] @max-[720px]:w-[36px] @max-[720px]:h-[36px] rounded-xl shrink-0 flex items-center justify-center border border-white/20 [&>.mam-3d-icon]:w-[38px] [&>.mam-3d-icon]:h-[38px] @max-[720px]:[&>.mam-3d-icon]:w-[32px] @max-[720px]:[&>.mam-3d-icon]:h-[32px]"
          style="background:radial-gradient(circle at 50% 42%,${w.glowColor}55,rgba(15,23,42,0.92) 82%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.25)"
        >
          ${weatherIconHtml(w.id, 38, w.name)}
        </div>
        <div class="flex flex-col items-start min-w-0 leading-none">
          <div class="flex items-center gap-1.5">
            <span class="text-[14px] @max-[720px]:text-[13px] font-black tracking-tight mam-outline-sm" style="color:${w.accentColor}">${w.name}</span>
            <span class="px-1.5 py-[2px] rounded-md bg-white/10 border border-white/15 text-[10px] font-black text-white tabular-nums mam-outline-sm" data-hud-weather-timer="true">${timerTxt}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1 text-[11px] @max-[720px]:text-[10px] font-extrabold whitespace-nowrap mam-outline-sm">
            <span class="text-amber-300">${w.oreDropMult}x Ore</span>
            <span class="text-white/35">•</span>
            <span class="text-fuchsia-300">${w.gemDropMult}x Gem</span>
            <span class="text-white/35">•</span>
            <span class="text-rose-300">${w.damageMult}x DMG</span>
          </div>
        </div>
      </button>
      ${popoverHtml}
    `;
  }

  private renderWeatherWidget(now = Date.now()): string {
    const w = this.state.getActiveWeather();
    return `
      <div class="absolute top-[14px] left-4 @max-[720px]:top-2.5 @max-[720px]:left-2.5 z-[5] flex flex-col items-start gap-1.5 pointer-events-auto" data-hud-weather="true" data-weather-key="${w.id}:${this.weatherPopoverOpen ? 1 : 0}">
        ${this.buildWeatherWidgetInnerHtml(now)}
      </div>
    `;
  }

  private syncWeatherWidget(forceRebuild: boolean, now = Date.now()): void {
    const host = this.root.querySelector<HTMLElement>('[data-hud-weather="true"]');
    if (!host) return;
    const w = this.state.getActiveWeather();
    const nextKey = `${w.id}:${this.weatherPopoverOpen ? 1 : 0}`;
    if (forceRebuild || host.dataset.weatherKey !== nextKey) {
      host.dataset.weatherKey = nextKey;
      host.innerHTML = this.buildWeatherWidgetInnerHtml(now);
      host.querySelector('[data-action="toggle-weather-info"]')?.addEventListener('click', () => {
        this.weatherPopoverOpen = !this.weatherPopoverOpen;
        this.syncWeatherWidget(true);
      });
      return;
    }
    const timerEl = host.querySelector<HTMLElement>('[data-hud-weather-timer="true"]');
    const nextText = this.formatWeatherTimer(this.state.getWeatherRemainingSec(now));
    if (timerEl && timerEl.textContent !== nextText) {
      timerEl.textContent = nextText;
    }
  }

  private renderActivePotionsDock(now = Date.now()): string {
    const { single, empty, key, html } = this.buildActivePotionsDockContent(now);
    const cls = `mam-active-pots${single ? ' is-single' : ''}${empty ? ' is-empty' : ''}`;
    return `<div class="${cls}" data-active-pots="true" data-pots-key="${key}">${html}</div>`;
  }

  private syncActivePotionsHud(now = Date.now()): void {
    const dock = this.root.querySelector<HTMLElement>('[data-active-pots="true"]');
    if (!dock) return;
    const next = this.buildActivePotionsDockContent(now);
    dock.classList.toggle('is-single', next.single);
    dock.classList.toggle('is-empty', next.empty);
    if (dock.dataset.potsKey !== next.key) {
      dock.dataset.potsKey = next.key;
      dock.innerHTML = next.html;
      return;
    }
    for (const { def, rem } of next.active) {
      const mm = Math.floor(rem / 60);
      const ss = String(rem % 60).padStart(2, '0');
      const nextText = `${mm}:${ss}`;
      const timerEl = dock.querySelector<HTMLElement>(`[data-hud-pot-timer="${def.id}"]`);
      if (timerEl && timerEl.textContent !== nextText) {
        timerEl.textContent = nextText;
      }
    }
  }

  private updateHotbarLive(): void {
    const hotbar = this.root.querySelector<HTMLElement>('[data-hud-hotbar="true"]');
    if (!hotbar) return;
    hotbar.innerHTML = `${this.renderHotbarSlots()}${this.renderHotbarBagButton()}`;
    this.bindHotbarEvents(hotbar);
    hotbar.querySelector('[data-action="toggle-inventory"]')?.addEventListener('click', () => {
      this.toggleModal('inventory');
    });
  }

  private updateAltarLiveValues(): void {
    const outOfRolls = this.state.enchantDice <= 0;
    const spinning = this.enchantSpinning;

    const diceCount = this.root.querySelector<HTMLElement>('[data-altar-dice-count="true"]');
    if (diceCount) {
      diceCount.textContent = `${fmtInt(this.state.enchantDice)}/1`;
      diceCount.style.color = outOfRolls ? '#f87171' : '#4ade80';
    }

    const rollBtn = this.root.querySelector<HTMLButtonElement>('[data-action="roll-enchant"]');
    if (rollBtn) {
      rollBtn.disabled = spinning;
      rollBtn.classList.toggle('is-spinning', spinning);
      rollBtn.classList.toggle('is-empty', !spinning && outOfRolls);
      rollBtn.innerHTML = spinning
        ? '<span class="inline-block animate-[mamSpinPulse_0.65s_ease-in-out_infinite_alternate]">Spinning...</span>'
        : outOfRolls
          ? 'Out of Rolls'
          : 'Roll';
    }

    const autoBtn = this.root.querySelector<HTMLButtonElement>('[data-action="toggle-auto-enchant"]');
    if (autoBtn) {
      autoBtn.classList.toggle('is-active', this.enchantAutoRolling);
      autoBtn.textContent = this.enchantAutoRolling ? 'Stop' : 'Auto Roll';
    }

    for (const e of ENCHANTS) {
      const qty = this.state.ownedEnchants[e.id] || 0;
      const qtyEl = this.root.querySelector<HTMLElement>(`[data-altar-qty="${e.id}"]`);
      if (qtyEl) qtyEl.textContent = qty > 0 ? `x${fmtInt(qty)}` : '';
    }
  }
}
