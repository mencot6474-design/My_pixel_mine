import { audio } from '../audio/AudioManager';
import { cgHappyTime, cgTryMidgameAd } from '../sdk/crazygames';
import { OreHpScreen, PlotAnchorScreen, SceneMode } from '../game3d/MineScene3D';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import { AltarPedestalAnchor, ShopChibiBubbleAnchor, ShopStationAnchor, ShopStationId } from '../game3d/ShopWorld3D';
import { getWorldById } from '../game/GameData';
import { GameState } from '../game/GameState';
import { WeatherId } from '../game/WeatherData';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { getTowerFloorDef, TowerWaveOreState } from '../game/TowerData';
import { AltarShopHudUi } from './AltarShopHudUi';
import { BountiesModalUi } from './BountiesModalUi';
import { CollectionModalsUi } from './CollectionModalsUi';
import { ForgeModalUi } from './ForgeModalUi';
import { HotbarHudUi, canDropHotbarOnPlot } from './HotbarHudUi';
import { hudIconHtml } from './HudIcons';
import {
  captureRootScrolls,
  formatCountdownTimer,
  ModalKind,
  PlotDropOps,
  refreshPotionTimersInDom,
  renderToastBannerHtml,
  restoreRootScrolls,
  TW_BADGE_BASE,
  TW_CURRENCY_BAR,
  TW_PLUS_BTN,
  TW_QUICK_BTN_CHEST,
  TW_QUICK_BTN_QUEST,
  TW_SHOPS_PILL,
  TW_SIDE_BTN_INDEX,
  TW_SIDE_BTN_RAINBOW,
  TW_SIDE_BTN_UPGRADES,
  TW_TOAST_STACK,
  TW_TOP_CENTER,
} from './HudShared';
import { OfflineModalUi } from './OfflineModalUi';
import { PlotInspectUi } from './PlotInspectUi';
import { SettingsModalUi } from './SettingsModalUi';
import { ShopModalsUi } from './ShopModalsUi';
import { TowerUi } from './TowerUi';
import { TutorialUi } from './TutorialUi';
import { UpgradesWorldsUi } from './UpgradesWorldsUi';
import { WeatherDpsHudUi } from './WeatherDpsHudUi';
import { WorldOverlayHudUi } from './WorldOverlayHudUi';

export class GameHud {
  private activeModal: ModalKind = 'none';
  private sceneMode: SceneMode = 'mine';
  private inspectedSlot: number | null = null;
  private adPaused = false;
  private lastRenderViewKey = '';
  private lastRenderedModal: ModalKind = 'none';
  private toasts: Array<{ id: number; text: string }> = [];
  private nextToastId = 1;
  private lastRegrowthActive = false;
  private lastOverclockActive = false;

  private readonly shopUi: ShopModalsUi;
  private readonly forgeUi: ForgeModalUi;
  private readonly collectionUi: CollectionModalsUi;
  private readonly upgradesUi: UpgradesWorldsUi;
  private readonly plotInspectUi: PlotInspectUi;
  private readonly towerUi: TowerUi;
  private readonly tutorialUi: TutorialUi;
  private readonly weatherDpsUi: WeatherDpsHudUi;
  private readonly hotbarUi: HotbarHudUi;
  private readonly altarShopUi: AltarShopHudUi;
  private readonly worldOverlayUi: WorldOverlayHudUi;
  private readonly settingsUi: SettingsModalUi;
  private readonly offlineUi: OfflineModalUi;
  private readonly bountiesUi: BountiesModalUi;

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
    private readonly plotDropOps?: PlotDropOps,
    private readonly onWeatherChange?: (weatherId: WeatherId) => void,
    private readonly onSetTutorialPitZoom?: (zoomed: boolean) => void,
    private readonly onSetTutorialChestZoom?: (zoomed: boolean) => void,
    private readonly onSetTutorialSellShopZoom?: (zoomed: boolean) => void,
    private readonly onToggleAutoMeteor?: (enabled: boolean) => void,
    private readonly onTutorialComplete?: () => void,
    private readonly onOverclockChange?: (active: boolean) => void
  ) {
    this.shopUi = new ShopModalsUi(this.state, (msg) => this.pushToast(msg));
    this.settingsUi = new SettingsModalUi(
      undefined,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
    this.offlineUi = new OfflineModalUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.openModal('none')
    );
    this.bountiesUi = new BountiesModalUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
    this.forgeUi = new ForgeModalUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
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
    this.tutorialUi = new TutorialUi(
      (zoomed) => this.onSetTutorialPitZoom?.(zoomed),
      (zoomed) => this.onSetTutorialChestZoom?.(zoomed),
      (zoomed) => this.onSetTutorialSellShopZoom?.(zoomed),
      () => this.onTutorialComplete?.(),
      () => {
        const reward = this.state.grantTutorialStarterReward();
        audio.playSfx('rare-fanfare', { volume: 0.7 });
        this.pushToast(`Starter Bonus: +${fmtInt(reward.gems)} Gems • +${fmtInt(reward.dice)} Enchant Dice!`);
      }
    );
    this.weatherDpsUi = new WeatherDpsHudUi(
      this.state,
      (slot) => this.openPlotInspector(slot),
      this.onToggleAutoMeteor
    );
    this.hotbarUi = new HotbarHudUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.toggleModal('inventory'),
      () =>
        canDropHotbarOnPlot({
          sceneMode: this.sceneMode,
          activeModal: this.activeModal,
          inspectedSlot: this.inspectedSlot,
        }),
      () => this.activeModal,
      this.plotDropOps
    );
    this.altarShopUi = new AltarShopHudUi(
      this.state,
      (msg) => this.pushToast(msg),
      (mode) => this.setSceneMode(mode),
      (station) => this.openShopStation(station),
      () => this.sceneMode,
      this.onTriggerEnchantSpin
    );
    this.worldOverlayUi = new WorldOverlayHudUi(
      this.state,
      () => ({
        sceneMode: this.sceneMode,
        activeModal: this.activeModal,
        inspectedSlot: this.inspectedSlot,
      }),
      (station) => this.openShopStation(station),
      this.plotDropOps?.syncPlotLabel,
      (x, y, visible) => this.tutorialUi.updatePlotAnchor(x, y, visible),
      () => {
        if (this.tutorialUi.isActive()) {
          this.tutorialUi.syncDomArrow();
        }
      }
    );
    this.tutorialUi.mount();
    this.root.addEventListener(
      'click',
      (e) => {
        if (!this.tutorialUi.isActive()) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('[data-inspect-action="up-dmg"]')) {
          window.setTimeout(() => this.tutorialUi.notifyUpgraded(), 20);
        } else if (target.closest('[data-action="chest-take-all"]')) {
          window.setTimeout(() => this.tutorialUi.notifyChestTaken(), 20);
        } else if (target.closest('[data-sell-key]')) {
          window.setTimeout(() => this.tutorialUi.notifySellOreSelected(), 20);
        } else if (target.closest('[data-action="sell-selected"]')) {
          window.setTimeout(() => this.tutorialUi.notifySellCompleted(), 20);
        }
      },
      true
    );

    this.worldOverlayUi.mountLayers();

    this.state.subscribe(() => {
      this.onSyncPlots(this.state.getEquippedPlotMinerIds());
      const hotbarChanged = this.hotbarUi.checkHotbarChanged();

      if (this.inspectedSlot !== null) {
        this.plotInspectUi.updateLiveValues(this.root);
        return;
      }

      this.updateCurrencyLiveValues();
      if (hotbarChanged) this.hotbarUi.updateHotbarLive(this.root);
      this.weatherDpsUi.syncActivePotionsHud(this.root);

      if (this.sceneMode === 'altar') {
        this.altarShopUi.updateAltarLiveValues(this.root);
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

    this.hotbarUi.mountGlobalListeners();

    this.updateViewportScale();
    window.addEventListener('resize', () => this.updateViewportScale());
    window.visualViewport?.addEventListener('resize', () => this.updateViewportScale());

    this.onSyncPlots(this.state.getEquippedPlotMinerIds());
    this.worldOverlayUi.syncAllPlotLabelsToScene();
    this.render();

    window.setInterval(() => {
      if (this.adPaused) return;
      if (this.activeModal === 'pickaxe-shop') {
        this.state.refreshPickaxeStockIfDue();
        const el = this.root.querySelector('[data-restock-timer="true"]');
        if (el) {
          el.textContent = `Restock in ${formatCountdownTimer(this.state.getPickaxeRestockRemainingSec())}`;
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
            regenEl.textContent = sec > 0 ? `(+1 in ${formatCountdownTimer(sec)})` : '(Full)';
          }
        }
      }
      this.weatherDpsUi.syncActivePotionsHud(this.root);
      const nextWeather = this.state.syncWeather();
      if (nextWeather) {
        this.onWeatherChange?.(nextWeather.id);
        this.onSyncPlots(this.state.getEquippedPlotMinerIds());
        this.pushToast(
          `Weather: ${nextWeather.name} (${nextWeather.oreDropMult}x Ore • ${nextWeather.gemDropMult}x Gems • ${nextWeather.damageMult}x DMG)`
        );
        this.weatherDpsUi.syncWeatherWidget(this.root, true);
      } else {
        this.weatherDpsUi.syncWeatherWidget(this.root, false);
      }
      const regrowthActive = this.state.getBoostRemainingSec('regrowth-potion') > 0;
      if (regrowthActive !== this.lastRegrowthActive) {
        this.lastRegrowthActive = regrowthActive;
        this.onSyncPlots(this.state.getEquippedPlotMinerIds());
      }
      this.weatherDpsUi.syncDpsMeterWidget(this.root);
    }, 1000);

    window.setInterval(() => {
      if (this.adPaused) return;
      this.state.stepOverclock();
      const ocActive = this.state.isOverclockActive();
      if (ocActive !== this.lastOverclockActive) {
        this.lastOverclockActive = ocActive;
        this.onOverclockChange?.(ocActive);
        if (ocActive) {
          audio.playSfx('rare-fanfare', { volume: 0.65 });
          this.pushToast('⚡ OVERCLOCK ACTIVE! 2x Speed • 2x Tap • +50% Ore!');
        }
      }
      if (this.sceneMode === 'mine') {
        this.weatherDpsUi.syncOverclockWidget(this.root);
      }

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
    this.worldOverlayUi.updateOreBars(bars);
  }

  public updateTowerOreBars(bars: TowerOreBarScreen[]): void {
    this.worldOverlayUi.updateTowerOreBars(bars);
  }

  public spawnDamagePopup(dmg: number, screenX: number, screenY: number, isClick = false): void {
    this.worldOverlayUi.spawnDamagePopup(dmg, screenX, screenY, isClick);
  }

  public openPlotInspector(slotIndex: number | null): void {
    this.inspectedSlot = slotIndex;
    if (slotIndex !== null) {
      this.activeModal = 'none';
    }
    this.onFocusPlot?.(slotIndex);
    this.render();
  }

  public updateChestAnchor(anchor: { x: number; y: number; visible: boolean }): void {
    this.tutorialUi.updateChestAnchor(anchor.x, anchor.y, anchor.visible);
  }

  public notifyTutorialOreBroken(): void {
    this.tutorialUi.notifyOreBroken();
  }

  public updatePlotAnchors(anchors: PlotAnchorScreen[]): void {
    this.worldOverlayUi.updatePlotAnchors(anchors);
  }

  public setAdPaused(paused: boolean): void {
    this.adPaused = paused;
  }

  public isTutorialActive(): boolean {
    return this.tutorialUi.isActive();
  }

  public openModal(kind: ModalKind): void {
    const prev = this.activeModal;
    if (prev === 'offline' && kind !== 'offline' && this.state.pendingOfflineEarnings) {
      this.state.claimOfflineEarnings(1);
    }
    this.activeModal = kind;
    if (kind !== 'index') {
      this.collectionUi.closeReviewDialog();
    }
    if (kind !== prev) {
      audio.playSfx(kind === 'none' ? 'ui-close' : 'ui-open');
    }
    this.render();
  }

  public toggleModal(kind: ModalKind): void {
    const next = this.activeModal === kind ? 'none' : kind;
    this.activeModal = next;
    if (next !== 'index') {
      this.collectionUi.closeReviewDialog();
    }
    audio.playSfx(next === 'none' ? 'ui-close' : 'ui-open');
    this.render();
  }

  public setSceneMode(mode: SceneMode): void {
    const leavingTower = this.sceneMode === 'tower' && mode !== 'tower';
    if (leavingTower && this.state.towerRun) {
      this.state.abandonTowerRun();
    }
    if (mode !== 'altar') {
      this.altarShopUi.cancelSpinOnSceneExit();
    }
    this.sceneMode = mode;
    this.activeModal = 'none';
    this.collectionUi.closeReviewDialog();
    this.inspectedSlot = null;
    this.worldOverlayUi.clearTransientOverlays();
    this.onSetSceneMode?.(mode);
    if (mode === 'tower') {
      this.syncTowerSceneVisual();
    } else {
      audio.setSceneMode(mode);
      if (leavingTower) {
        cgTryMidgameAd(() => {}, (muted) => audio.setAdMuted(muted));
      }
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
      cgHappyTime();
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
    } else if (station === 'forge') {
      this.forgeUi.resetInspect();
      this.activeModal = 'forge';
      this.render();
    } else {
      this.activeModal = 'sell-shop';
      this.render();
    }
  }

  public updateShopAnchors(anchors: ShopStationAnchor[]): void {
    this.worldOverlayUi.updateShopAnchors(anchors);
  }

  public updateShopChibiBubbles(bubbles: ShopChibiBubbleAnchor[]): void {
    this.worldOverlayUi.updateShopChibiBubbles(bubbles);
  }

  public updateAltarAnchors(anchors: AltarPedestalAnchor[]): void {
    this.worldOverlayUi.updateAltarAnchors(anchors);
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

  private renderAudioToggleBtn(floating = true): string {
    const muted = audio.isMuted();
    const audioIcon = muted
      ? `<svg viewBox="0 0 28 28" width="24" height="24" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="mam-spk-mute" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fda4af"/>
              <stop offset="100%" stop-color="#e11d48"/>
            </linearGradient>
          </defs>
          <path d="M5 10.5H8.8L14.5 5.5V22.5L8.8 17.5H5C3.9 17.5 3 16.6 3 15.5V12.5C3 11.4 3.9 10.5 5 10.5Z" fill="url(#mam-spk-mute)" stroke="#ffe4e6" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M18.5 10.5L24.5 16.5M24.5 10.5L18.5 16.5" stroke="#fb7185" stroke-width="2.6" stroke-linecap="round"/>
        </svg>`
      : `<svg viewBox="0 0 28 28" width="24" height="24" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="mam-spk-on" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#bae6fd"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
          </defs>
          <path d="M5 10.5H8.8L14.5 5.5V22.5L8.8 17.5H5C3.9 17.5 3 16.6 3 15.5V12.5C3 11.4 3.9 10.5 5 10.5Z" fill="url(#mam-spk-on)" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M18.2 9.8C19.6 11.2 19.6 16.8 18.2 18.2" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M21.4 6.8C24.2 9.8 24.2 18.2 21.4 21.2" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`;

    const frameCls = muted
      ? 'border-rose-400/60 bg-[linear-gradient(160deg,rgba(136,19,55,0.82),rgba(15,23,42,0.92))] shadow-[0_8px_22px_rgba(225,29,72,0.28),inset_0_1px_0_rgba(255,255,255,0.28)]'
      : 'border-sky-300/60 bg-[linear-gradient(160deg,rgba(14,116,144,0.82),rgba(15,23,42,0.92))] shadow-[0_8px_22px_rgba(56,189,248,0.32),inset_0_1px_0_rgba(255,255,255,0.32)]';
    const placementCls = floating ? 'absolute top-[14px] right-4 z-[15]' : 'mt-0.5';
    const gearIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="#e2e8f0" stroke-width="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#94a3b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    const gearFrameCls =
      'border-slate-300/45 bg-[linear-gradient(160deg,rgba(51,65,85,0.82),rgba(15,23,42,0.92))] shadow-[0_8px_22px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.24)]';

    return `
      <div class="${placementCls} flex items-center gap-2 pointer-events-none">
        <button
          class="w-12 h-12 rounded-2xl border-[1.5px] ${gearFrameCls} backdrop-blur-xl flex items-center justify-center cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-105 hover:brightness-110 active:translate-y-0.5 active:scale-95 pointer-events-auto"
          data-action="open-settings"
          title="Settings"
          aria-label="Open Settings"
        >
          ${gearIcon}
        </button>
        <button
          class="w-12 h-12 rounded-2xl border-[1.5px] ${frameCls} backdrop-blur-xl flex items-center justify-center cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-105 hover:brightness-110 active:translate-y-0.5 active:scale-95 pointer-events-auto"
          data-action="toggle-audio"
          title="${muted ? 'Unmute Audio' : 'Mute Audio'}"
          aria-label="${muted ? 'Unmute Audio' : 'Mute Audio'}"
        >
          ${audioIcon}
        </button>
      </div>
    `;
  }

  private renderCurrencyRail(opts: {
    topAlign?: boolean;
    showGemsPlus?: boolean;
    showCash?: boolean;
    showAudioBelow?: boolean;
    quickButtonsHtml?: string;
  }): string {
    const posCls = opts.topAlign
      ? 'top-[14px] right-4'
      : 'top-[42%] right-4 -translate-y-1/2 [[data-hud-compact=true]_&]:top-[72px] [[data-hud-compact=true]_&]:translate-y-0 [[data-hud-short=true]_&]:top-[36%]';
    const plusBtn = opts.showGemsPlus
      ? `<button class="${TW_PLUS_BTN} mam-outline-sm" data-action="gems-plus">+</button>`
      : '';
    const cashBar = opts.showCash
      ? `<div class="${TW_CURRENCY_BAR}">
          <span class="text-[28px] font-black tabular-nums text-[#4ade80] tracking-[0.3px] mam-outline" data-hud-cash="true">${fmtMoney(this.state.cash)}</span>
        </div>`
      : '';
    const quickRow = opts.quickButtonsHtml ? `<div class="flex items-center gap-2 mt-0.5">${opts.quickButtonsHtml}</div>` : '';
    const audioBelow = opts.showAudioBelow ? this.renderAudioToggleBtn(false) : '';

    return `
      <div class="absolute ${posCls} flex flex-col items-end gap-1.5">
        <div class="flex items-center gap-2">
          <div class="${TW_CURRENCY_BAR}">
            ${hudIconHtml('gem', 28, 'Gems')}
            <span class="text-[20px] font-extrabold tabular-nums text-white mam-outline-sm" data-hud-gems="true">${fmtInt(this.state.gems)}</span>
            ${plusBtn}
          </div>
        </div>
        ${cashBar}
        ${quickRow}
        ${audioBelow}
      </div>
    `;
  }

  private renderToasts(): void {
    const el = this.root.querySelector('[data-toast-stack="true"]');
    if (!el) return;
    el.innerHTML = this.toasts.map((t) => renderToastBannerHtml(t.text)).join('');
  }

  public render(): void {
    const viewKey = `${this.sceneMode}:${this.activeModal}:${this.inspectedSlot ?? 'none'}`;
    const sameView = viewKey === this.lastRenderViewKey;
    const shouldAnimateModal = this.activeModal !== 'none' && this.activeModal !== this.lastRenderedModal;
    const savedScrolls = sameView ? captureRootScrolls(this.root) : [];
    this.lastRenderViewKey = viewKey;
    this.lastRenderedModal = this.activeModal;

    this.worldOverlayUi.resetPlotLayerKeysIfMineIdle();

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
      const readyBounties = this.state.getReadyBountyCount();
      const quickButtonsHtml = `
        <button class="${TW_QUICK_BTN_QUEST} mam-outline-sm" title="Mining Bounties" data-action="open-bounties">
          <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] mam-outline-sm ${readyBounties > 0 ? '' : 'hidden'}" data-bounties-badge="true">${readyBounties}</span>
          ${hudIconHtml('quest', 20, 'Bounties')}
          <span>Bounties</span>
        </button>
        <button class="${TW_QUICK_BTN_CHEST} mam-outline-sm" title="Chest (${fmtInt(chestCount)})" data-action="open-chest">
          ${hudIconHtml('chest', 22, 'Chest')}
        </button>
      `;

      const activeWorld = getWorldById(this.state.activeWorldId);
      const upgradeCount = this.state.getAffordableResearchCount();
      const resonances = this.state.getActiveWorldResonances();
      const resonanceStripHtml = resonances.length
        ? `<div class="absolute top-[68px] @max-[720px]:top-[54px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 flex-wrap justify-center pointer-events-none">
            ${resonances
              .map((r) => {
                const extras: string[] = [`+${Math.round(r.tier.dmgBonusPct * 100)}% DMG`];
                if (r.tier.oreDropBonusPct > 0) extras.push(`+${Math.round(r.tier.oreDropBonusPct * 100)}% Ore`);
                if (r.tier.gemBonusPct > 0) extras.push(`+${Math.round(r.tier.gemBonusPct * 100)}% Gem`);
                return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-violet-400/50 bg-[rgba(15,23,42,0.78)] backdrop-blur-md text-[11px] font-extrabold text-violet-200 shadow-[0_4px_12px_rgba(0,0,0,0.4)] mam-outline-sm">✦ ${r.worldName} (${r.count}) • ${extras.join(' • ')}</span>`;
              })
              .join('')}
          </div>`
        : '';

      this.root.innerHTML = `
      ${this.weatherDpsUi.renderWeatherWidget()}
      <div class="${TW_TOP_CENTER} flex flex-wrap items-center justify-center gap-2.5 @max-[720px]:gap-1.5">
        <button class="${TW_SHOPS_PILL} whitespace-nowrap mam-outline" data-action="shops-pill">
          ${hudIconHtml('shops', 28, 'Shops')}
          <span>Shops</span>
        </button>
        <button class="inline-flex items-center gap-2 @max-[720px]:gap-1.5 px-4 @max-[720px]:px-3 py-2 @max-[720px]:py-1.5 rounded-2xl border border-sky-300/45 bg-[linear-gradient(135deg,rgba(14,165,233,0.88),rgba(37,99,235,0.92))] backdrop-blur-md shadow-[0_8px_22px_rgba(37,99,235,0.32),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[15px] @max-[720px]:text-[13px] font-extrabold whitespace-nowrap cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] mam-outline-sm" data-action="open-worlds" title="Teleport & Unlock Worlds">
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
      ${resonanceStripHtml}

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

      ${this.renderAudioToggleBtn()}
      ${this.renderCurrencyRail({ showGemsPlus: true, showCash: true, quickButtonsHtml })}

      ${this.hotbarUi.renderHotbarSection()}

      ${this.weatherDpsUi.renderActivePotionsDock()}
      ${this.weatherDpsUi.renderDpsMeterWidget(true)}
      ${this.renderActiveModal()}
      ${this.renderToastStack()}
    `;

      this.bindEvents();
      refreshPotionTimersInDom(this.root, this.state);
      this.renderToasts();
    } finally {
      if (shouldAnimateModal) {
        this.root.querySelector('[data-backdrop="true"]')?.classList.add('mam-backdrop-enter');
        this.root.querySelector('.mam-modal')?.classList.add('mam-modal-enter');
      }
      if (savedScrolls.length > 0) {
        restoreRootScrolls(this.root, savedScrolls);
      }
      this.tutorialUi.syncView(this.sceneMode, this.activeModal, this.inspectedSlot);
    }
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
    if (this.activeModal === 'forge') return this.forgeUi.renderForgeModal();
    if (this.activeModal === 'settings') return this.settingsUi.renderModal();
    if (this.activeModal === 'offline') return this.offlineUi.renderModal();
    if (this.activeModal === 'bounties') return this.bountiesUi.renderModal();
    return '';
  }

  private renderTowerHud(): void {
    this.syncTowerSceneVisual();
    this.root.innerHTML =
      this.towerUi.renderTowerArenaHud(
        this.renderCurrencyRail({ topAlign: true, showAudioBelow: true }),
        this.renderToastStack()
      ) + (this.activeModal === 'settings' ? this.renderActiveModal() : '');
    this.bindEvents();
    this.renderToasts();
  }

  private renderShopWorldHud(): void {
    this.root.innerHTML = this.altarShopUi.renderShopWorldHud({
      weatherHtml: this.weatherDpsUi.renderWeatherWidget(),
      currencyRailHtml: this.renderCurrencyRail({ topAlign: true, showCash: true, showAudioBelow: true }),
      activePotionsHtml: this.weatherDpsUi.renderActivePotionsDock(),
      dpsMeterHtml: this.weatherDpsUi.renderDpsMeterWidget(),
      modalHtml: this.renderActiveModal(),
      toastStackHtml: this.renderToastStack(),
    });
    this.bindEvents();
    this.renderToasts();
  }

  private renderAltarHud(): void {
    this.root.innerHTML =
      this.altarShopUi.renderAltarHud({
        weatherHtml: this.weatherDpsUi.renderWeatherWidget(),
        audioBtnHtml: this.renderAudioToggleBtn(),
        currencyRailHtml: this.renderCurrencyRail({}),
        toastStackHtml: this.renderToastStack(),
      }) + (this.activeModal === 'settings' ? this.renderActiveModal() : '');
    this.bindEvents();
    this.renderToasts();
  }

  private bindEvents(): void {
    this.root.querySelector('[data-backdrop="true"]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.openModal('none');
    });

    const coordinatorActions: Record<string, () => void> = {
      'open-index': () => this.toggleModal('index'),
      'open-settings': () => this.toggleModal('settings'),
      'open-bounties': () => this.toggleModal('bounties'),
      'toggle-audio': () => {
        const nextMuted = audio.toggleMuted();
        this.pushToast(nextMuted ? 'Audio Muted' : 'Audio On');
        this.render();
      },
      'open-chest': () => this.toggleModal('chest'),
      'close-modal': () => this.openModal('none'),
      'equip-best': () => {
        this.state.equipBestMiners();
        audio.playSfx('place-chibi');
        this.pushToast('Equipped best miners to Plot!');
      },
      'auto-star-up': () => {
        const upgrades = this.state.autoStarUpAll();
        if (upgrades > 0) {
          audio.playSfx('upgrade');
          this.pushToast(`Starred up ${upgrades}x!`);
          this.collectionUi.updateInventoryModalLive(this.root);
        } else {
          audio.playSfx('ui-error');
          this.pushToast('No Chibi has enough spare duplicates!');
        }
      },
      'chest-take-all': () => {
        const taken = this.state.takeAllFromChest();
        audio.playSfx(taken > 0 ? 'coin-alt' : 'ui-error');
        this.pushToast(taken > 0 ? `Collected ${fmtInt(taken)} items!` : 'Chest is empty');
      },
      'chest-sell-ores': () => {
        const res = this.state.sellAllChestOres();
        audio.playSfx(res.earned > 0 ? 'coin' : 'ui-error');
        this.pushToast(
          res.earned > 0
            ? `Sold chest ores for ${fmtMoney(res.earned)}${res.bonusApplied ? ' (+35% Full-Chest Bonus!)' : ''}`
            : 'No ores in chest to sell'
        );
      },
      'shops-pill': () => {
        audio.playSfx('teleport', { volume: 0.45 });
        this.setSceneMode('shop');
      },
      'sell-select-all': () => {
        audio.playSfx('ui-tab');
        this.shopUi.toggleSellSelectAll(this.root);
      },
      'sell-selected': () => this.shopUi.sellSelectedItems(this.root),
      'open-worlds': () => this.toggleModal('worlds'),
      'open-upgrades': () => {
        if (this.activeModal !== 'upgrades') {
          this.upgradesUi.syncActiveWorldTab();
        }
        this.toggleModal('upgrades');
      },
      'open-shop': () => {
        audio.playSfx('ui-open');
        this.setSceneMode('shop');
      },
      'gems-plus': () => {
        audio.playSfx('ui-open');
        this.openModal('gem-shop');
      },
    };

    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      const handler = action ? coordinatorActions[action] : undefined;
      if (handler) el.addEventListener('click', handler);
    });

    this.hotbarUi.bindEvents(this.root);
    this.upgradesUi.bindUpgradesEvents(this.root);
    this.upgradesUi.bindWorldsEvents(this.root);
    this.weatherDpsUi.bindEvents(this.root);
    this.altarShopUi.bindEvents(this.root);
    this.collectionUi.bindEvents(this.root);
    this.forgeUi.bindEvents(this.root);
    this.shopUi.bindEvents(this.root);
    this.towerUi.bindHubEvents(this.root);
    this.towerUi.bindArenaEvents(this.root);
    this.settingsUi.bindEvents(this.root);
    this.offlineUi.bindEvents(this.root);
    this.bountiesUi.bindEvents(this.root);
  }

  private updateCurrencyLiveValues(): void {
    const gemsEl = this.root.querySelector('[data-hud-gems="true"]');
    if (gemsEl) gemsEl.textContent = fmtInt(this.state.gems);
    const cashEl = this.root.querySelector('[data-hud-cash="true"]');
    if (cashEl) cashEl.textContent = fmtMoney(this.state.cash);
    const bountiesBadge = this.root.querySelector<HTMLElement>('[data-bounties-badge="true"]');
    if (bountiesBadge) {
      const ready = this.state.getReadyBountyCount();
      bountiesBadge.textContent = String(ready);
      bountiesBadge.classList.toggle('hidden', ready <= 0);
    }
  }
}
