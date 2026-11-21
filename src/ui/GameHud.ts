import { audio } from '../audio/AudioManager';
import { cgTryMidgameAd } from '../sdk/crazygames';
import { OreHpScreen, PlotAnchorScreen, SceneMode, SweetSpotScreen } from '../game3d/MineScene3D';
import { type LootVacuumBreakKind, spawnLootVacuumParticles } from './LootVacuumFx';
import { TowerOreBarScreen } from '../game3d/TowerArena3D';
import type { OmegaTargetScreenAnchor } from '../game3d/OmegaArena3D';
import { AltarPedestalAnchor, ShopChibiBubbleAnchor, ShopStationAnchor, ShopStationId } from '../game3d/ShopWorld3D';
import { getWorldById, getWorldIndex } from '../game/GameData';
import { gameSettings } from '../game/GameSettings';
import { GameState } from '../game/GameState';
import type { OverclockTier } from '../game/OverclockDomain';
import { WeatherId } from '../game/WeatherData';
import { fmtInt } from '../game/NumberFormat';
import { TowerWaveOreState } from '../game/TowerData';
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
  renderMineChromeHtml,
  renderMineQuickButtonsHtml,
  syncFeverScreenFxDom,
} from './HudChromeRenderer';
import { HudTowerBridge } from './HudTowerBridge';
import { HudOmegaBridge, type OmegaSceneOps } from './HudOmegaBridge';
import {
  buildHudCoordinatorActions,
  renderActiveModalHtml,
  stepHudFastTick,
  stepHudSlowTick,
  updateHudCurrencyAndBadges,
} from './HudActionRouter';
import {
  captureRootScrolls,
  ModalKind,
  PlotDropOps,
  refreshPotionTimersInDom,
  renderToastBannerHtml,
  restoreRootScrolls,
  shouldDismissModalBackdrop,
  TW_TOAST_STACK,
} from './HudShared';
import { OfflineModalUi } from './OfflineModalUi';
import { OmegaArenaHudUi } from './OmegaArenaHudUi';
import { OmegaBossModalUi } from './OmegaBossModalUi';
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
  private lastReturnRushActive = false;
  private lastOverclockActive = false;
  private lastOverclockTier: 0 | OverclockTier = 0;

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
  private readonly towerBridge: HudTowerBridge;
  private readonly omegaBridge: HudOmegaBridge;
  private readonly omegaBossUi: OmegaBossModalUi;
  private readonly omegaArenaUi: OmegaArenaHudUi;

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
      bossShieldActive?: boolean;
    }) => void,
    private readonly plotDropOps?: PlotDropOps,
    private readonly onWeatherChange?: (weatherId: WeatherId) => void,
    private readonly onSetTutorialPitZoom?: (zoomed: boolean) => void,
    private readonly onSetTutorialChestZoom?: (zoomed: boolean) => void,
    private readonly onSetTutorialSellShopZoom?: (zoomed: boolean) => void,
    private readonly onToggleAutoMeteor?: (enabled: boolean) => void,
    private readonly onTutorialComplete?: () => void,
    private readonly onOverclockChange?: (active: boolean, tier: 0 | OverclockTier) => void,
    private readonly fusionOps?: {
      syncFusionRecipe: (
        recipe: FusionRecipeDef,
        readyFlags: readonly boolean[],
        oreReadyFlags?: readonly boolean[],
        canFuse?: boolean
      ) => void;
      triggerFusionAnimation: (recipe: FusionRecipeDef, onComplete: () => void) => void;
      setFusionRevealHold?: (active: boolean) => void;
    },
    omegaOps?: OmegaSceneOps
  ) {
    this.shopUi = new ShopModalsUi(
      this.state,
      (msg) => this.pushToast(msg),
      () => this.render()
    );
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
    this.towerBridge = new HudTowerBridge(
      this.root,
      this.state,
      this.towerUi,
      () => this.sceneMode,
      (mode) => this.setSceneMode(mode),
      (kind) => this.openModal(kind),
      (msg) => this.pushToast(msg),
      () => this.render(),
      this.onSyncTowerVisual
    );
    this.omegaBossUi = new OmegaBossModalUi(
      this.state,
      () => this.render(),
      (bossId, tier) => this.omegaBridge.startOmegaBattle(bossId, tier),
      () => this.openModal('none'),
      (msg) => this.pushToast(msg)
    );
    this.omegaArenaUi = new OmegaArenaHudUi(
      this.state,
      () => {
        this.state.abandonOmegaBoss();
        this.setSceneMode('shop');
        this.openModal('omega-boss');
      },
      () => this.omegaBridge.handleOmegaParryClick(),
      () => {
        const summary = this.state.omegaLastSummary;
        if (summary) this.omegaBossUi.openForBoss(summary.bossId);
        this.setSceneMode('shop');
        this.openModal('omega-boss');
      },
      (bossId, tier) => this.omegaBridge.startOmegaBattle(bossId, tier)
    );
    this.omegaBridge = new HudOmegaBridge(
      this.root,
      this.state,
      this.omegaArenaUi,
      () => this.sceneMode,
      (mode) => this.setSceneMode(mode),
      (kind) => this.openModal(kind),
      (msg) => this.pushToast(msg),
      () => this.render(),
      omegaOps
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
      } else if (this.activeModal === 'premium-shop') {
        this.shopUi.updatePremiumShopLive(this.root);
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
        else if (this.sceneMode === 'omega' && !this.state.omegaBattle && this.state.omegaLastSummary?.victory) {
          this.omegaBossUi.openForBoss(this.state.omegaLastSummary.bossId);
          this.setSceneMode('shop');
          this.openModal('omega-boss');
        } else if (this.activeModal !== 'none') this.openModal('none');
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
      stepHudSlowTick({
        root: this.root,
        state: this.state,
        activeModal: this.activeModal,
        weatherDpsUi: this.weatherDpsUi,
        lastRegrowthActive: this.lastRegrowthActive,
        setLastRegrowthActive: (active) => {
          this.lastRegrowthActive = active;
        },
        lastReturnRushActive: this.lastReturnRushActive,
        setLastReturnRushActive: (active) => {
          this.lastReturnRushActive = active;
        },
        onSyncPlots: this.onSyncPlots,
        onWeatherChange: this.onWeatherChange,
        pushToast: (msg) => this.pushToast(msg),
        render: () => this.render(),
      });
    }, 1000);

    window.setInterval(() => {
      if (this.adPaused) return;
      stepHudFastTick({
        root: this.root,
        state: this.state,
        sceneMode: this.sceneMode,
        weatherDpsUi: this.weatherDpsUi,
        towerUi: this.towerUi,
        lastOverclockActive: this.lastOverclockActive,
        setLastOverclockActive: (active) => {
          this.lastOverclockActive = active;
        },
        lastOverclockTier: this.lastOverclockTier,
        setLastOverclockTier: (tier) => {
          this.lastOverclockTier = tier;
        },
        onOverclockChange: this.onOverclockChange,
        syncFeverScreenFx: (active, burst, tier) => this.syncFeverScreenFx(active, burst, tier),
        syncTowerSceneVisual: () => this.syncTowerSceneVisual(),
        omegaArenaUi: this.omegaArenaUi,
        syncOmegaSceneVisual: () => this.omegaBridge.syncOmegaSceneVisual(),
        setSceneMode: (mode) => this.setSceneMode(mode),
        openModal: (kind) => this.openModal(kind),
        pushToast: (msg) => this.pushToast(msg),
        render: () => this.render(),
      });
    }, 100);
  }

  public updateOreBars(bars: OreHpScreen[]): void {
    this.worldOverlayUi.updateOreBars(bars);
  }

  public updateSweetSpot(spot: SweetSpotScreen | null): void {
    this.worldOverlayUi.updateSweetSpot(spot);
  }

  public spawnLootVacuum(originX: number, originY: number, kind: LootVacuumBreakKind): void {
    if (this.sceneMode !== 'mine' || this.activeModal !== 'none' || this.inspectedSlot !== null) return;
    spawnLootVacuumParticles(this.root, originX, originY, kind);
  }

  public updateTowerOreBars(bars: TowerOreBarScreen[]): void {
    this.worldOverlayUi.updateTowerOreBars(bars);
  }

  public spawnDamagePopup(
    dmg: number,
    screenX: number,
    screenY: number,
    isClick = false,
    isCrit = false,
    isPerfect = false
  ): void {
    this.worldOverlayUi.spawnDamagePopup(dmg, screenX, screenY, isClick, isCrit, isPerfect);
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
    if (kind !== 'worlds') {
      this.upgradesUi.closeSynergyInfoModal();
    }
    if (kind !== 'omega-boss') {
      this.omegaBossUi.clearForgeCutscene();
    }
    if (kind !== 'premium-shop') {
      this.shopUi.clearPremiumCutscene();
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
    if (next !== 'worlds') {
      this.upgradesUi.closeSynergyInfoModal();
    }
    if (next !== 'omega-boss') {
      this.omegaBossUi.clearForgeCutscene();
    }
    if (next !== 'premium-shop') {
      this.shopUi.clearPremiumCutscene();
    }
    audio.playSfx(next === 'none' ? 'ui-close' : 'ui-open');
    this.render();
  }

  public setSceneMode(mode: SceneMode): void {
    const leavingTower = this.sceneMode === 'tower' && mode !== 'tower';
    if (leavingTower && this.state.towerRun) {
      this.state.abandonTowerRun();
    }
    if (this.sceneMode === 'omega' && mode !== 'omega' && this.state.omegaBattle) {
      this.state.abandonOmegaBoss();
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
    this.omegaBossUi.clearForgeCutscene();
    this.shopUi.clearPremiumCutscene();
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
    this.towerBridge.syncTowerSceneVisual();
  }

  public handleTowerTargetClick(
    targetOreIndex: number | null,
    opts?: { isShieldBreak?: boolean }
  ): { dmg: number; broken?: boolean; isCrit?: boolean; shieldBroken?: boolean; shieldShaved?: boolean } | undefined {
    return this.towerBridge.handleTowerTargetClick(targetOreIndex, opts);
  }

  public handleTowerFighterStrike(
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number
  ): { dmg: number; broken?: boolean; isCrit?: boolean } | undefined {
    return this.towerBridge.handleTowerFighterStrike(slotIndex, targetOreIndex, attackInterval);
  }

  public handleTowerMonolithClick(): { dmg: number } | undefined {
    return this.towerBridge.handleTowerMonolithClick();
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
    } else if (station === 'omega-left') {
      this.omegaBossUi.openForBoss('crimson-ronin');
      this.activeModal = 'omega-boss';
      this.render();
    } else if (station === 'omega-right') {
      this.omegaBossUi.openForBoss('obsidian-sovereign');
      this.activeModal = 'omega-boss';
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
      this.root.style.setProperty('zoom', '1');
    } else {
      this.root.style.width = `${logicalW.toFixed(2)}px`;
      this.root.style.height = `${logicalH.toFixed(2)}px`;
      this.root.style.transform = 'none';
      this.root.style.setProperty('zoom', scale.toFixed(4));
    }
    this.root.style.transformOrigin = 'top left';
    this.root.dataset.hudCompact = logicalW < 920 ? 'true' : 'false';
    this.root.dataset.hudPotsAbove = logicalW < 1080 ? 'true' : 'false';
    this.root.dataset.hudDpsAbove = logicalW < 1140 ? 'true' : 'false';
    this.root.dataset.hudShort = logicalH < 640 ? 'true' : 'false';

    const floatScale = Math.max(0.72, Math.min(1, scale));
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

      if (this.sceneMode === 'omega') {
        this.renderOmegaArenaHud();
        return;
      }

      if (this.sceneMode === 'shop') {
        this.renderShopWorldHud();
        return;
      }

      const quickButtonsHtml = renderMineQuickButtonsHtml({
        chestCount: this.state.getChestItemCount(),
        readyBounties: this.state.getReadyBountyCount(),
        readyAchievements: this.state.getReadyAchievementCount(),
        dailyReady: this.state.canClaimDailyLogin(),
      });
      const activeWorld = getWorldById(this.state.activeWorldId);
      const activeWorldNum = Math.max(1, getWorldIndex(this.state.activeWorldId) + 1);

      this.root.innerHTML = renderMineChromeHtml({
        weatherHtml: this.weatherDpsUi.renderWeatherWidget(Date.now(), true),
        overclockHtml: this.weatherDpsUi.renderOverclockWidget(),
        activeWorldName: activeWorld.name,
        activeWorldColor: activeWorld.iconColor,
        activeWorldNum,
        upgradeCount: this.state.getAffordableResearchCount(),
        readyIndexCount: this.state.getReadyIndexRewardCount(),
        audioHtml: this.renderAudioToggleBtn(),
        currencyRailHtml: this.renderCurrencyRail({ showGemsPlus: true, showCash: true, showDpsAbove: true, quickButtonsHtml }),
        hotbarHtml: this.hotbarUi.renderHotbarSection(),
        potionsHtml: this.weatherDpsUi.renderActivePotionsDock(),
        feverFxHtml: this.renderFeverScreenFx(),
        modalHtml: this.renderActiveModal(),
        toastStackHtml: this.renderToastStack(),
      });

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
    const ocSnap = this.state.getOverclockSnapshot();
    return renderFeverScreenFxHtml(this.sceneMode === 'mine' && ocSnap.active, ocSnap.tier);
  }

  private syncFeverScreenFx(
    active: boolean,
    triggerBurst: boolean,
    tier: 0 | OverclockTier = active ? 1 : 0
  ): void {
    syncFeverScreenFxDom(this.root, this.sceneMode === 'mine', active, triggerBurst, tier);
  }

  private renderActiveModal(): string {
    return renderActiveModalHtml(this.activeModal, {
      indexUi: this.indexUi,
      inventoryUi: this.inventoryUi,
      chestUi: this.chestUi,
      shopUi: this.shopUi,
      upgradesUi: this.upgradesUi,
      towerUi: this.towerUi,
      forgeUi: this.forgeUi,
      settingsUi: this.settingsUi,
      offlineUi: this.offlineUi,
      bountiesUi: this.bountiesUi,
      achievementsUi: this.achievementsUi,
      dailyLoginUi: this.dailyLoginUi,
      fusionUi: this.fusionUi,
      omegaBossUi: this.omegaBossUi,
    });
  }

  public handleOmegaFighterStrike(slotIndex: number, attackInterval: number) {
    return this.omegaBridge.handleOmegaFighterStrike(slotIndex, attackInterval);
  }

  public handleOmegaTargetClick(targetId: string): void {
    this.omegaBridge.handleOmegaTargetClick(targetId);
  }

  public handleOmegaBossClick(): void {
    this.omegaBridge.handleOmegaBossClick();
  }

  public updateOmegaArenaOverlay(data: { bossHead: { x: number; y: number } | null; targets: OmegaTargetScreenAnchor[] } | null): void {
    this.worldOverlayUi.updateOmegaArenaOverlay(
      data,
      () => this.omegaBridge.handleOmegaParryClick(),
      (id) => this.omegaBridge.handleOmegaTargetClick(id)
    );
  }

  private renderOmegaArenaHud(): void {
    this.omegaBridge.syncOmegaSceneVisual();
    this.root.innerHTML = this.omegaArenaUi.renderOmegaArenaHud() + this.renderToastStack();
    this.bindEvents();
    this.renderToasts();
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

    const coordinatorActions = buildHudCoordinatorActions({
      root: this.root,
      state: this.state,
      shopUi: this.shopUi,
      inventoryUi: this.inventoryUi,
      upgradesUi: this.upgradesUi,
      getActiveModal: () => this.activeModal,
      openModal: (kind) => this.openModal(kind),
      toggleModal: (kind) => this.toggleModal(kind),
      setSceneMode: (mode) => this.setSceneMode(mode),
      pushToast: (msg) => this.pushToast(msg),
      render: () => this.render(),
    });

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
    this.omegaBossUi.bindEvents(this.root);
    this.omegaArenaUi.bindArenaEvents(this.root);
  }

  private updateCurrencyLiveValues(): void {
    updateHudCurrencyAndBadges(this.root, this.state);
  }
}
