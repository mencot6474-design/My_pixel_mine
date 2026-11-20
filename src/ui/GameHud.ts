import { audio } from '../audio/AudioManager';
import { cgHappyTime, cgTryMidgameAd } from '../sdk/crazygames';
import { OreHpScreen, PlotAnchorScreen, SceneMode } from '../game3d/MineScene3D';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import { AltarPedestalAnchor, ShopChibiBubbleAnchor, ShopStationAnchor, ShopStationId } from '../game3d/ShopWorld3D';
import { getWorldById, getWorldIndex } from '../game/GameData';
import { gameSettings } from '../game/GameSettings';
import { GameState } from '../game/GameState';
import { WeatherId } from '../game/WeatherData';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { getTowerFloorDef, TowerWaveOreState } from '../game/TowerData';
import { AchievementsModalUi } from './AchievementsModalUi';
import { AltarShopHudUi } from './AltarShopHudUi';
import { BountiesModalUi } from './BountiesModalUi';
import { ChestModalUi } from './ChestModalUi';
import { DailyLoginModalUi } from './DailyLoginModalUi';
import { IndexModalUi } from './IndexModalUi';
import { InventoryModalUi } from './InventoryModalUi';
import { FusionRecipeDef } from '../game/FusionData';
import { ForgeModalUi } from './ForgeModalUi';
import { FusionHudUi } from './FusionHudUi';
import { HotbarHudUi, canDropHotbarOnPlot } from './HotbarHudUi';
import {
  renderAudioControlsHtml,
  renderCurrencyRailHtml,
  renderFeverScreenFxHtml,
  syncFeverScreenFxDom,
} from './HudChromeRenderer';
import { hudIconHtml } from './HudIcons';
import {
  captureRootScrolls,
  formatCountdownTimer,
  ModalKind,
  PlotDropOps,
  refreshPotionTimersInDom,
  renderToastBannerHtml,
  restoreRootScrolls,
  shouldDismissModalBackdrop,
  TW_BADGE_BASE,
  TW_QUICK_BTN_CHEST,
  TW_QUICK_BTN_QUEST,
  TW_SHOPS_PILL,
  TW_TELEPORT_PILL,
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
  private modalOpenedAtMs = 0;
  private lastRegrowthActive = false;
  private lastOverclockActive = false;

  private readonly shopUi: ShopModalsUi;
  private readonly forgeUi: ForgeModalUi;
  private readonly indexUi: IndexModalUi;
  private readonly inventoryUi: InventoryModalUi;
  private readonly chestUi: ChestModalUi;
  private readonly upgradesUi: UpgradesWorldsUi;
  private readonly plotInspectUi: PlotInspectUi;
  private readonly towerUi: TowerUi;
  private readonly tutorialUi: TutorialUi;
  private readonly weatherDpsUi: WeatherDpsHudUi;
  private readonly hotbarUi: HotbarHudUi;
  private readonly altarShopUi: AltarShopHudUi;
  private readonly fusionUi: FusionHudUi;
  private readonly worldOverlayUi: WorldOverlayHudUi;
  private readonly settingsUi: SettingsModalUi;
  private readonly offlineUi: OfflineModalUi;
  private readonly bountiesUi: BountiesModalUi;
  private readonly achievementsUi: AchievementsModalUi;
  private readonly dailyLoginUi: DailyLoginModalUi;

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
    private readonly onOverclockChange?: (active: boolean) => void,
    private readonly fusionOps?: {
      syncFusionRecipe: (
        recipe: FusionRecipeDef,
        readyFlags: readonly boolean[],
        oreReadyFlags?: readonly boolean[],
        canFuse?: boolean
      ) => void;
      triggerFusionAnimation: (recipe: FusionRecipeDef, onComplete: () => void) => void;
      setFusionRevealHold?: (active: boolean) => void;
    }
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
    this.achievementsUi = new AchievementsModalUi(
      this.state,
      () => this.render(),
      (msg) => this.pushToast(msg)
    );
    this.dailyLoginUi = new DailyLoginModalUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
    this.forgeUi = new ForgeModalUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
    this.indexUi = new IndexModalUi(this.state, () => this.render(), (msg) => this.pushToast(msg));
    this.inventoryUi = new InventoryModalUi(this.state, (msg) => this.pushToast(msg));
    this.chestUi = new ChestModalUi(
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
    this.fusionUi = new FusionHudUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render(),
      (mode) => this.setSceneMode(mode),
      () => this.openModal('none'),
      this.fusionOps?.syncFusionRecipe,
      this.fusionOps?.triggerFusionAnimation,
      this.fusionOps?.setFusionRevealHold
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
      } else if (this.sceneMode === 'fusion') {
        this.fusionUi.syncCurrentRecipeTo3D();
      } else if (this.sceneMode === 'tower') {
        this.towerUi.updateLiveValues(this.root);
      } else if (this.activeModal === 'chest') {
        this.chestUi.updateLive(this.root);
      } else if (this.activeModal === 'pickaxe-shop') {
        this.shopUi.updatePickaxeShopLive(this.root);
      } else if (this.activeModal === 'sell-shop') {
        this.shopUi.updateSellShopLive(this.root);
      } else if (this.activeModal === 'gem-shop') {
        this.shopUi.updateGemShopLive(this.root);
      } else if (this.activeModal === 'index') {
        this.indexUi.updateLive(this.root);
      } else if (this.activeModal === 'inventory') {
        this.inventoryUi.updateLive(this.root);
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
        this.syncFeverScreenFx(ocActive, ocActive);
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

  public spawnDamagePopup(
    dmg: number,
    screenX: number,
    screenY: number,
    isClick = false,
    isCrit = false
  ): void {
    this.worldOverlayUi.spawnDamagePopup(dmg, screenX, screenY, isClick, isCrit);
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
    if (kind !== 'none' && kind !== prev) {
      this.modalOpenedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    if (kind !== 'index') {
      this.indexUi.closeReviewDialog();
    }
    if (kind !== prev) {
      audio.playSfx(kind === 'none' ? 'ui-close' : 'ui-open');
    }
    this.render();
  }

  public toggleModal(kind: ModalKind): void {
    const next = this.activeModal === kind ? 'none' : kind;
    this.activeModal = next;
    if (next !== 'none') {
      this.modalOpenedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    if (next !== 'index') {
      this.indexUi.closeReviewDialog();
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
    if (mode !== 'fusion') {
      this.fusionUi.resetAnimating();
    } else {
      this.fusionUi.syncCurrentRecipeTo3D();
    }
    this.sceneMode = mode;
    this.activeModal = 'none';
    this.indexUi.closeReviewDialog();
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
      this.activeModal = 'altar-hub';
      this.render();
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
    this.root.dataset.hudPotsAbove = logicalW < 1080 ? 'true' : 'false';
    this.root.dataset.hudDpsAbove = logicalW < 1140 ? 'true' : 'false';
    this.root.dataset.hudShort = logicalH < 640 ? 'true' : 'false';

    const floatScale = Math.max(0.68, Math.min(1, scale));
    document.documentElement.style.setProperty('--mam-ui-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--mam-float-scale', floatScale.toFixed(4));
  }

  private renderAudioToggleBtn(floating = true): string {
    return renderAudioControlsHtml({
      floating,
      muted: audio.isMuted(),
      cameraLocked: gameSettings.get().cameraLocked,
    });
  }

  private renderCurrencyRail(opts: {
    topAlign?: boolean;
    showGemsPlus?: boolean;
    showCash?: boolean;
    showAudioBelow?: boolean;
    showDpsAbove?: boolean;
    quickButtonsHtml?: string;
  }): string {
    return renderCurrencyRailHtml({
      gems: this.state.gems,
      cash: this.state.cash,
      topAlign: opts.topAlign,
      showGemsPlus: opts.showGemsPlus,
      showCash: opts.showCash,
      dpsAboveHtml: opts.showDpsAbove ? this.weatherDpsUi.renderInlineDpsMeter() : '',
      quickButtonsHtml: opts.quickButtonsHtml,
      audioBelowHtml: opts.showAudioBelow ? this.renderAudioToggleBtn(false) : '',
    });
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

      if (this.sceneMode === 'fusion') {
        this.renderFusionHud();
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
      const dailyReady = this.state.canClaimDailyLogin();
      const quickButtonsHtml = `
        <button class="${TW_QUICK_BTN_QUEST} mam-outline-sm" title="Daily Login" data-action="open-daily-login">
          <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] mam-outline-sm ${dailyReady ? '' : 'hidden'}" data-daily-badge="true">1</span>
          <span class="text-amber-300 text-[15px] leading-none" aria-hidden="true">✦</span>
          <span>Daily</span>
        </button>
        <button class="${TW_QUICK_BTN_QUEST} !px-2 mam-outline-sm" title="Mining Bounties" data-action="open-bounties">
          <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] mam-outline-sm ${readyBounties > 0 ? '' : 'hidden'}" data-bounties-badge="true">${readyBounties}</span>
          ${hudIconHtml('quest', 22, 'Bounties')}
        </button>
        <button class="${TW_QUICK_BTN_QUEST} !px-2 mam-outline-sm" title="Achievements & Career Stats" data-action="open-achievements">
          <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] mam-outline-sm ${this.state.getReadyAchievementCount() > 0 ? '' : 'hidden'}" data-achievements-badge="true">${this.state.getReadyAchievementCount()}</span>
          <svg class="w-[21px] h-[21px] text-[#fde047] drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.9"/><path d="M7 6H4V8.5C4 10.2 5.3 11.5 7 11.5M17 6H20V8.5C20 10.2 18.7 11.5 17 11.5M12 15V19M8.5 19H15.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        </button>
        <button class="${TW_QUICK_BTN_CHEST} mam-outline-sm" title="Chest (${fmtInt(chestCount)})" data-action="open-chest">
          ${hudIconHtml('chest', 22, 'Chest')}
        </button>
      `;

      const activeWorld = getWorldById(this.state.activeWorldId);
      const activeWorldNum = Math.max(1, getWorldIndex(this.state.activeWorldId) + 1);
      const upgradeCount = this.state.getAffordableResearchCount();
      const resonances = this.state.getActiveWorldResonances();
      const resonanceStripHtml = resonances.length
        ? `<div class="absolute top-[68px] @max-[720px]:top-[54px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 flex-wrap justify-center pointer-events-none">
            ${resonances
              .map((r) => {
                const extras: string[] = [`+${Math.round(r.tier.dmgBonusPct * 100)}% DMG`];
                if (r.tier.oreDropBonusPct > 0) extras.push(`+${Math.round(r.tier.oreDropBonusPct * 100)}% Ore`);
                if (r.tier.gemBonusPct > 0) extras.push(`+${Math.round(r.tier.gemBonusPct * 100)}% Gem`);
                return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-violet-400 bg-[#151233] text-[11px] font-extrabold text-violet-200 shadow-[0_4px_12px_rgba(0,0,0,0.55)] mam-outline-sm">✦ ${r.worldName} (${r.count}) • ${extras.join(' • ')}</span>`;
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
        <div class="w-[224px] @max-[720px]:w-[202px] shrink-0">
          ${this.weatherDpsUi.renderOverclockWidget()}
        </div>
        <button class="${TW_TELEPORT_PILL} whitespace-nowrap mam-outline" data-action="open-worlds" title="Teleport • World ${activeWorldNum}: ${activeWorld.name}">
          <svg viewBox="0 0 32 32" width="28" height="28" class="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]" aria-hidden="true">
            <defs>
              <radialGradient id="mam-tp-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="32%" stop-color="#67e8f9"/>
                <stop offset="68%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#1e1b4b"/>
              </radialGradient>
              <linearGradient id="mam-tp-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e0f2fe"/>
                <stop offset="50%" stop-color="#38bdf8"/>
                <stop offset="100%" stop-color="#c084fc"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="13" fill="url(#mam-tp-core)" stroke="url(#mam-tp-ring)" stroke-width="2.4"/>
            <ellipse cx="16" cy="16" rx="12" ry="5.4" transform="rotate(-26 16 16)" fill="none" stroke="#bae6fd" stroke-width="1.8"/>
            <ellipse cx="16" cy="16" rx="11" ry="4.4" transform="rotate(34 16 16)" fill="none" stroke="#e879f9" stroke-width="1.4" opacity="0.9"/>
            <path d="M16 7.5L17.9 14.1L24.5 16L17.9 17.9L16 24.5L14.1 17.9L7.5 16L14.1 14.1Z" fill="#ffffff"/>
            <circle cx="25.5" cy="7.5" r="1.7" fill="#fde047"/>
            <circle cx="6.5" cy="24.5" r="1.3" fill="#67e8f9"/>
          </svg>
          <span>Teleport</span>
          <span
            class="absolute -top-2 -right-2 min-w-[23px] h-[23px] px-1 rounded-full border-2 border-[#090e1c] text-[12px] font-black tabular-nums leading-none text-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.45)] mam-outline-sm"
            style="background:${activeWorld.iconColor}"
            data-teleport-world-badge="true"
          >${activeWorldNum}</span>
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
          <span class="${TW_BADGE_BASE} min-w-[24px] h-6 px-1.5 text-[13px] mam-outline-sm ${this.state.getReadyIndexRewardCount() > 0 ? '' : 'hidden'}" data-index-badge="true">${this.state.getReadyIndexRewardCount()}</span>
          ${hudIconHtml('indexBook', 44, 'Index')}
          <span class="text-[14px] font-extrabold leading-none mam-outline-sm">Index</span>
        </button>
      </div>

      ${this.renderAudioToggleBtn()}
      ${this.renderCurrencyRail({ showGemsPlus: true, showCash: true, showDpsAbove: true, quickButtonsHtml })}

      ${this.hotbarUi.renderHotbarSection()}

      ${this.weatherDpsUi.renderActivePotionsDock()}
      ${this.renderFeverScreenFx()}
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

  private renderFeverScreenFx(): string {
    return renderFeverScreenFxHtml(this.sceneMode === 'mine' && this.state.isOverclockActive());
  }

  private syncFeverScreenFx(active: boolean, triggerBurst: boolean): void {
    syncFeverScreenFxDom(this.root, this.sceneMode === 'mine', active, triggerBurst);
  }

  private renderActiveModal(): string {
    if (this.activeModal === 'index') return this.indexUi.renderModal();
    if (this.activeModal === 'inventory') return this.inventoryUi.renderModal();
    if (this.activeModal === 'chest') return this.chestUi.renderModal();
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
    if (this.activeModal === 'achievements') return this.achievementsUi.renderModal();
    if (this.activeModal === 'daily-login') return this.dailyLoginUi.renderModal();
    if (this.activeModal === 'altar-hub') return this.fusionUi.renderAltarChoiceModal();
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

  private renderFusionHud(): void {
    this.fusionUi.syncCurrentRecipeTo3D();
    this.root.innerHTML =
      this.fusionUi.renderFusionWorldHud({
        weatherHtml: this.weatherDpsUi.renderWeatherWidget(),
        audioBtnHtml: this.renderAudioToggleBtn(),
        currencyRailHtml: this.renderCurrencyRail({}),
        toastStackHtml: this.renderToastStack(),
      }) + (this.activeModal === 'settings' ? this.renderActiveModal() : '');
    this.bindEvents();
    this.renderToasts();
  }

  private bindEvents(): void {
    const backdrop = this.root.querySelector<HTMLElement>('[data-backdrop="true"]');
    if (backdrop) {
      let pointerDownOnBackdrop = false;
      backdrop.addEventListener('pointerdown', (e) => {
        pointerDownOnBackdrop = e.target === e.currentTarget;
      });
      backdrop.addEventListener('pointercancel', () => {
        pointerDownOnBackdrop = false;
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target !== e.currentTarget) return;
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (
          !shouldDismissModalBackdrop({
            pointerDownOnSelf: pointerDownOnBackdrop,
            openedAtMs: this.modalOpenedAtMs,
            nowMs,
          })
        ) {
          return;
        }
        this.openModal('none');
      });
    }

    const coordinatorActions: Record<string, () => void> = {
      'open-index': () => this.toggleModal('index'),
      'open-settings': () => this.toggleModal('settings'),
      'toggle-camera-lock': () => {
        const next = gameSettings.update({ cameraLocked: !gameSettings.get().cameraLocked });
        audio.playSfx('ui-tab');
        this.pushToast(next.cameraLocked ? 'Camera Locked (Zoom Only)' : 'Camera Unlocked');
        this.render();
      },
      'open-bounties': () => this.toggleModal('bounties'),
      'open-achievements': () => this.toggleModal('achievements'),
      'open-daily-login': () => this.toggleModal('daily-login'),
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
          this.inventoryUi.updateLive(this.root);
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
    this.indexUi.bindEvents(this.root);
    this.inventoryUi.bindEvents(this.root);
    this.chestUi.bindEvents(this.root);
    this.forgeUi.bindEvents(this.root);
    this.shopUi.bindEvents(this.root);
    this.towerUi.bindHubEvents(this.root);
    this.towerUi.bindArenaEvents(this.root);
    this.settingsUi.bindEvents(this.root);
    this.offlineUi.bindEvents(this.root);
    this.bountiesUi.bindEvents(this.root);
    this.achievementsUi.bindEvents(this.root);
    this.dailyLoginUi.bindEvents(this.root);
    this.fusionUi.bindAltarChoiceEvents(this.root);
    this.fusionUi.bindFusionWorldEvents(this.root);
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
    const indexBadge = this.root.querySelector<HTMLElement>('[data-index-badge="true"]');
    if (indexBadge) {
      const readyIndex = this.state.getReadyIndexRewardCount();
      indexBadge.textContent = String(readyIndex);
      indexBadge.classList.toggle('hidden', readyIndex <= 0);
    }
    const achBadge = this.root.querySelector<HTMLElement>('[data-achievements-badge="true"]');
    if (achBadge) {
      const readyAch = this.state.getReadyAchievementCount();
      achBadge.textContent = String(readyAch);
      achBadge.classList.toggle('hidden', readyAch <= 0);
    }
  }
}
