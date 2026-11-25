import { audio } from '../audio/AudioManager';
import { FusionRecipeDef } from '../game/FusionData';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import type { OverclockTier } from '../game/OverclockDomain';
import { TowerWaveOreState } from '../game/TowerData';
import { WeatherId } from '../game/WeatherData';
import type { SceneMode } from '../game3d/MineScene3D';
import { AchievementsModalUi } from './AchievementsModalUi';
import { AltarShopHudUi } from './AltarShopHudUi';
import { BountiesModalUi } from './BountiesModalUi';
import { ChestModalUi } from './ChestModalUi';
import { DailyLoginModalUi } from './DailyLoginModalUi';
import { ForgeModalUi } from './ForgeModalUi';
import { FusionHudUi } from './FusionHudUi';
import { HotbarHudUi, canDropHotbarOnPlot } from './HotbarHudUi';
import {
  stepHudFastTick,
  stepHudSlowTick,
  syncHudLiveSubView,
} from './HudActionRouter';
import { type FeverEncoreHudInfo } from './HudChromeRenderer';
import { HudOmegaBridge, type OmegaSceneOps } from './HudOmegaBridge';
import { HudRiftBridge, type RiftSceneOps } from './HudRiftBridge';
import { ModalKind, PlotDropOps } from './HudShared';
import { HudTowerBridge, type TowerSceneOps } from './HudTowerBridge';
import { IndexModalUi } from './IndexModalUi';
import { InventoryModalUi } from './InventoryModalUi';
import { OfflineModalUi } from './OfflineModalUi';
import { OmegaArenaHudUi } from './OmegaArenaHudUi';
import { OmegaBossModalUi } from './OmegaBossModalUi';
import { PlotInspectUi } from './PlotInspectUi';
import { RiftArenaHudUi } from './RiftArenaHudUi';
import { RiftModalUi } from './RiftModalUi';
import { SettingsModalUi } from './SettingsModalUi';
import { ShopModalsUi } from './ShopModalsUi';
import { TowerUi } from './TowerUi';
import { TutorialUi } from './TutorialUi';
import { TwinTrialModalUi } from './TwinTrialModalUi';
import { UpgradesWorldsUi } from './UpgradesWorldsUi';
import { WeatherDpsHudUi } from './WeatherDpsHudUi';
import { WorldOverlayHudUi } from './WorldOverlayHudUi';

export interface HudSubModules {
  shopUi: ShopModalsUi;
  forgeUi: ForgeModalUi;
  indexUi: IndexModalUi;
  inventoryUi: InventoryModalUi;
  chestUi: ChestModalUi;
  upgradesUi: UpgradesWorldsUi;
  plotInspectUi: PlotInspectUi;
  towerUi: TowerUi;
  tutorialUi: TutorialUi;
  weatherDpsUi: WeatherDpsHudUi;
  hotbarUi: HotbarHudUi;
  altarShopUi: AltarShopHudUi;
  fusionUi: FusionHudUi;
  worldOverlayUi: WorldOverlayHudUi;
  settingsUi: SettingsModalUi;
  offlineUi: OfflineModalUi;
  bountiesUi: BountiesModalUi;
  achievementsUi: AchievementsModalUi;
  dailyLoginUi: DailyLoginModalUi;
  towerBridge: HudTowerBridge;
  omegaBridge: HudOmegaBridge;
  omegaBossUi: OmegaBossModalUi;
  omegaArenaUi: OmegaArenaHudUi;
  twinTrialUi: TwinTrialModalUi;
  riftUi: RiftModalUi;
  riftArenaUi: RiftArenaHudUi;
  riftBridge: HudRiftBridge;
}

export interface HudFusionOps {
  syncFusionRecipe: (
    recipe: FusionRecipeDef,
    readyFlags: readonly boolean[],
    oreReadyFlags?: readonly boolean[],
    canFuse?: boolean
  ) => void;
  triggerFusionAnimation: (recipe: FusionRecipeDef, onComplete: () => void) => void;
  setFusionRevealHold?: (active: boolean) => void;
}

export function createHudSubModules(opts: {
  root: HTMLElement;
  state: GameState;
  getSceneMode: () => SceneMode;
  setSceneMode: (mode: SceneMode) => void;
  getActiveModal: () => ModalKind;
  setActiveModal: (kind: ModalKind) => void;
  openModal: (kind: ModalKind) => void;
  toggleModal: (kind: ModalKind) => void;
  getInspectedSlot: () => number | null;
  openPlotInspector: (slotIndex: number | null) => void;
  openShopStation: (station: import('../game3d/ShopWorld3D').ShopStationId) => void;
  pushToast: (text: string) => void;
  render: () => void;
  renderToastStack: () => string;
  renderToasts: () => void;
  onTriggerEnchantSpin?: (enchantId: string, onComplete: () => void) => void;
  onSyncTowerVisual?: (opts: {
    floor: number;
    wave: number;
    isBossWave: boolean;
    waveOres: readonly TowerWaveOreState[];
    anomalyColorHex: string;
    equippedMinerCount: number;
    paused: boolean;
    bossShieldActive?: boolean;
  }) => void;
  plotDropOps?: PlotDropOps;
  onSetTutorialPitZoom?: (zoomed: boolean) => void;
  onSetTutorialChestZoom?: (zoomed: boolean) => void;
  onSetTutorialSellShopZoom?: (zoomed: boolean) => void;
  onToggleAutoMeteor?: (enabled: boolean) => void;
  onTutorialComplete?: () => void;
  fusionOps?: HudFusionOps;
  omegaOps?: OmegaSceneOps;
  riftOps?: RiftSceneOps;
  towerOps?: TowerSceneOps;
}): HudSubModules {
  const { state, pushToast, render } = opts;
  const shopUi = new ShopModalsUi(state, pushToast, render);
  const settingsUi = new SettingsModalUi(undefined, pushToast, render);
  const offlineUi = new OfflineModalUi(state, pushToast, () => opts.openModal('none'));
  const bountiesUi = new BountiesModalUi(state, pushToast, render);
  const achievementsUi = new AchievementsModalUi(state, render, pushToast);
  const dailyLoginUi = new DailyLoginModalUi(state, pushToast, render);
  const forgeUi = new ForgeModalUi(state, pushToast, render);
  const indexUi = new IndexModalUi(state, render, pushToast);
  const inventoryUi = new InventoryModalUi(state, pushToast);
  const chestUi = new ChestModalUi(state, pushToast, render);
  const upgradesUi = new UpgradesWorldsUi(state, pushToast, opts.openModal, render);
  const plotInspectUi = new PlotInspectUi(
    state,
    pushToast,
    opts.openPlotInspector,
    render,
    opts.renderToastStack,
    opts.renderToasts
  );
  const towerUi = new TowerUi(
    state,
    pushToast,
    opts.openModal,
    () => opts.setSceneMode('tower'),
    () => opts.setSceneMode('shop'),
    render
  );
  const towerBridge = new HudTowerBridge(
    opts.root,
    state,
    towerUi,
    opts.getSceneMode,
    opts.setSceneMode,
    opts.openModal,
    pushToast,
    render,
    opts.onSyncTowerVisual,
    opts.towerOps
  );
  let omegaBridge!: HudOmegaBridge;
  let riftBridge!: HudRiftBridge;
  const omegaBossUi = new OmegaBossModalUi(
    state,
    render,
    (bossId, tier) => omegaBridge.startOmegaBattle(bossId, tier),
    () => opts.openModal('none'),
    pushToast
  );
  const riftUi = new RiftModalUi(state, render, pushToast, () => riftBridge.startRiftBattle());
  const riftArenaUi = new RiftArenaHudUi(
    state,
    () => riftBridge.retreatRiftBattle(),
    () => riftBridge.startRiftBattle(),
    () => riftBridge.returnToHub()
  );
  riftBridge = new HudRiftBridge(
    opts.root,
    state,
    riftArenaUi,
    opts.getSceneMode,
    opts.setSceneMode,
    opts.openModal,
    pushToast,
    render,
    opts.riftOps
  );
  const omegaArenaUi = new OmegaArenaHudUi(
    state,
    () => {
      state.abandonOmegaBoss();
      opts.setSceneMode('shop');
      opts.openModal('omega-boss');
    },
    () => omegaBridge.handleOmegaParryClick(),
    () => {
      const summary = state.omegaLastSummary;
      if (summary) omegaBossUi.openForBoss(summary.bossId);
      opts.setSceneMode('shop');
      opts.openModal('omega-boss');
    },
    (bossId, tier) => omegaBridge.startOmegaBattle(bossId, tier),
    (targetIdx) => omegaBridge.handleOmegaTapInvulShield(targetIdx)
  );
  omegaBridge = new HudOmegaBridge(
    opts.root,
    state,
    omegaArenaUi,
    opts.getSceneMode,
    opts.setSceneMode,
    opts.openModal,
    pushToast,
    render,
    opts.omegaOps
  );
  const tutorialUi = new TutorialUi(
    (zoomed) => opts.onSetTutorialPitZoom?.(zoomed),
    (zoomed) => opts.onSetTutorialChestZoom?.(zoomed),
    (zoomed) => opts.onSetTutorialSellShopZoom?.(zoomed),
    () => {
      state.unlockTwinTrial();
      opts.onTutorialComplete?.();
      render();
    },
    () => {
      const reward = state.grantTutorialStarterReward();
      audio.playSfx('rare-fanfare', { volume: 0.7 });
      pushToast(`Starter Bonus: +${fmtInt(reward.gems)} Gems • +${fmtInt(reward.dice)} Enchant Dice!`);
    },
    {
      onClosePlotInspect: () => {
        if (opts.getInspectedSlot() !== null) opts.openPlotInspector(null);
      },
      onCloseModal: () => {
        if (opts.getActiveModal() !== 'none') opts.openModal('none');
      },
    }
  );
  if (!tutorialUi.isActive() && TutorialUi.isStoredDone()) {
    state.unlockTwinTrial();
  }
  const twinTrialUi = new TwinTrialModalUi(
    state,
    pushToast,
    () => {
      opts.setActiveModal('none');
      render();
    },
    render
  );
  const weatherDpsUi = new WeatherDpsHudUi(state, opts.openPlotInspector, opts.onToggleAutoMeteor);
  const hotbarUi = new HotbarHudUi(
    state,
    pushToast,
    () => opts.toggleModal('inventory'),
    () =>
      canDropHotbarOnPlot({
        sceneMode: opts.getSceneMode(),
        activeModal: opts.getActiveModal(),
        inspectedSlot: opts.getInspectedSlot(),
      }),
    opts.getActiveModal,
    opts.plotDropOps
  );
  const altarShopUi = new AltarShopHudUi(
    state,
    pushToast,
    opts.setSceneMode,
    opts.openShopStation,
    opts.getSceneMode,
    opts.onTriggerEnchantSpin
  );
  const fusionUi = new FusionHudUi(
    state,
    pushToast,
    render,
    opts.setSceneMode,
    () => opts.openModal('none'),
    opts.fusionOps?.syncFusionRecipe,
    opts.fusionOps?.triggerFusionAnimation,
    opts.fusionOps?.setFusionRevealHold
  );
  const worldOverlayUi = new WorldOverlayHudUi(
    state,
    () => ({
      sceneMode: opts.getSceneMode(),
      activeModal: opts.getActiveModal(),
      inspectedSlot: opts.getInspectedSlot(),
    }),
    opts.openShopStation,
    opts.plotDropOps?.syncPlotLabel,
    (x, y, visible) => tutorialUi.updatePlotAnchor(x, y, visible),
    () => {
      if (tutorialUi.isActive()) tutorialUi.syncDomArrow();
    }
  );

  return {
    shopUi,
    forgeUi,
    indexUi,
    inventoryUi,
    chestUi,
    upgradesUi,
    plotInspectUi,
    towerUi,
    tutorialUi,
    weatherDpsUi,
    hotbarUi,
    altarShopUi,
    fusionUi,
    worldOverlayUi,
    settingsUi,
    offlineUi,
    bountiesUi,
    achievementsUi,
    dailyLoginUi,
    towerBridge,
    omegaBridge,
    omegaBossUi,
    omegaArenaUi,
    twinTrialUi,
    riftUi,
    riftArenaUi,
    riftBridge,
  };
}

export function mountHudRuntimeListeners(opts: {
  root: HTMLElement;
  state: GameState;
  mods: HudSubModules;
  shouldAdvanceTutorialOnSellSelectAll: (root: ParentNode) => boolean;
  shouldIgnoreHudShortcutDuringTutorial: (isTutorialActive: boolean, key: string) => boolean;
  getSceneMode: () => SceneMode;
  setSceneMode: (mode: SceneMode) => void;
  getActiveModal: () => ModalKind;
  setActiveModal: (kind: ModalKind) => void;
  openModal: (kind: ModalKind) => void;
  toggleModal: (kind: ModalKind) => void;
  getInspectedSlot: () => number | null;
  openPlotInspector: (slotIndex: number | null) => void;
  isAdPaused: () => boolean;
  onSyncPlots: (ids: (string | null)[]) => void;
  onWeatherChange?: (weatherId: WeatherId) => void;
  onOverclockChange?: (active: boolean, tier: 0 | OverclockTier) => void;
  updateCurrencyLiveValues: () => void;
  updateViewportScale: () => void;
  syncFeverScreenFx: (
    active: boolean,
    triggerBurst: boolean,
    tier?: 0 | OverclockTier,
    encore?: FeverEncoreHudInfo
  ) => void;
  syncTowerSceneVisual: () => void;
  pushToast: (msg: string) => void;
  render: () => void;
}): void {
  const { root, state, mods } = opts;
  let lastRegrowthActive = false;
  let lastReturnRushActive = false;
  let lastOverclockActive = false;
  let lastOverclockTier: 0 | OverclockTier = 0;
  let lastMineSubSyncMs = 0;
  let mineSubSyncTimer: number | null = null;

  mods.tutorialUi.mount();
  root.addEventListener(
    'click',
    (e) => {
      if (!mods.tutorialUi.isActive()) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-inspect-action="up-dmg"]')) {
        window.setTimeout(() => mods.tutorialUi.notifyUpgraded(), 20);
      } else if (target.closest('[data-action="chest-take-all"]')) {
        window.setTimeout(() => mods.tutorialUi.notifyChestTaken(), 20);
      } else if (target.closest('[data-sell-key]')) {
        window.setTimeout(() => mods.tutorialUi.notifySellOreSelected(), 20);
      } else if (target.closest('[data-action="sell-select-all"]')) {
        window.setTimeout(() => {
          if (opts.shouldAdvanceTutorialOnSellSelectAll(root)) {
            mods.tutorialUi.notifySellOreSelected();
          }
        }, 20);
      } else if (target.closest('[data-action="sell-selected"]')) {
        window.setTimeout(() => mods.tutorialUi.notifySellCompleted(), 20);
      }
    },
    true
  );

  mods.worldOverlayUi.mountLayers();

  const flushMineSubSync = (): void => {
    lastMineSubSyncMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    opts.onSyncPlots(state.getEquippedPlotMinerIds());
    mods.weatherDpsUi.syncActivePotionsHud(root);
    mods.upgradesUi.updateUpgradesBadgeLive(root);
  };

  state.subscribe(() => {
    const hotbarChanged = mods.hotbarUi.checkHotbarChanged();
    const inspectedSlot = opts.getInspectedSlot();
    if (inspectedSlot !== null) {
      opts.onSyncPlots(state.getEquippedPlotMinerIds());
      mods.plotInspectUi.updateLiveValues(root);
      return;
    }

    opts.updateCurrencyLiveValues();
    if (hotbarChanged) mods.hotbarUi.updateHotbarLive(root);

    const sceneMode = opts.getSceneMode();
    const activeModal = opts.getActiveModal();
    if (sceneMode === 'mine' && activeModal === 'none') {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - lastMineSubSyncMs >= 250) {
        if (mineSubSyncTimer !== null) {
          window.clearTimeout(mineSubSyncTimer);
          mineSubSyncTimer = null;
        }
        flushMineSubSync();
      } else if (mineSubSyncTimer === null) {
        mineSubSyncTimer = window.setTimeout(() => {
          mineSubSyncTimer = null;
          flushMineSubSync();
        }, 250);
      }
      return;
    }

    if (mineSubSyncTimer !== null) {
      window.clearTimeout(mineSubSyncTimer);
      mineSubSyncTimer = null;
    }
    opts.onSyncPlots(state.getEquippedPlotMinerIds());
    mods.weatherDpsUi.syncActivePotionsHud(root);
    syncHudLiveSubView({
      root,
      sceneMode,
      activeModal,
      altarShopUi: mods.altarShopUi,
      fusionUi: mods.fusionUi,
      towerUi: mods.towerUi,
      chestUi: mods.chestUi,
      shopUi: mods.shopUi,
      indexUi: mods.indexUi,
      inventoryUi: mods.inventoryUi,
      upgradesUi: mods.upgradesUi,
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (opts.shouldIgnoreHudShortcutDuringTutorial(mods.tutorialUi.isActive(), e.key)) {
      if (e.key === 'Escape' || e.key === '`' || e.key === '~') e.preventDefault();
      mods.tutorialUi.nudgeBlockedAction();
      return;
    }
    const inspectedSlot = opts.getInspectedSlot();
    const sceneMode = opts.getSceneMode();
    if (e.key === '`' || e.key === '~') {
      e.preventDefault();
      if (inspectedSlot === null) opts.toggleModal('inventory');
    } else if (e.key === 'Escape') {
      if (inspectedSlot !== null) opts.openPlotInspector(null);
      else if (sceneMode === 'omega' && !state.omegaBattle && state.omegaLastSummary) {
        mods.omegaBossUi.openForBoss(state.omegaLastSummary.bossId);
        opts.setSceneMode('shop');
        opts.openModal('omega-boss');
      } else if (sceneMode === 'rift' && !state.riftBattle && state.riftLastSummary) {
        mods.riftBridge.returnToHub();
      } else if (opts.getActiveModal() !== 'none') opts.openModal('none');
    } else if (e.key >= '1' && e.key <= '9' && inspectedSlot === null) {
      state.selectHotbarSlot(Number(e.key) - 1);
    }
  });

  mods.hotbarUi.mountGlobalListeners();
  opts.updateViewportScale();
  window.addEventListener('resize', () => opts.updateViewportScale());
  window.visualViewport?.addEventListener('resize', () => opts.updateViewportScale());

  opts.onSyncPlots(state.getEquippedPlotMinerIds());
  mods.worldOverlayUi.syncAllPlotLabelsToScene();
  opts.render();

  window.setInterval(() => {
    if (opts.isAdPaused()) return;
    stepHudSlowTick({
      root,
      state,
      activeModal: opts.getActiveModal(),
      weatherDpsUi: mods.weatherDpsUi,
      lastRegrowthActive,
      setLastRegrowthActive: (active) => {
        lastRegrowthActive = active;
      },
      lastReturnRushActive,
      setLastReturnRushActive: (active) => {
        lastReturnRushActive = active;
      },
      onSyncPlots: opts.onSyncPlots,
      onWeatherChange: opts.onWeatherChange,
      onTwinTrialExpired: () => {
        if (opts.getActiveModal() === 'twin-trial') {
          opts.setActiveModal('none');
        }
        const slot = opts.getInspectedSlot();
        if (slot !== null && !state.getPlotUnit(slot)) {
          opts.openPlotInspector(null);
        }
      },
      pushToast: opts.pushToast,
      render: opts.render,
    });
  }, 1000);

  window.setInterval(() => {
    if (opts.isAdPaused()) return;
    stepHudFastTick({
      root,
      state,
      sceneMode: opts.getSceneMode(),
      weatherDpsUi: mods.weatherDpsUi,
      towerUi: mods.towerUi,
      lastOverclockActive,
      setLastOverclockActive: (active) => {
        lastOverclockActive = active;
      },
      lastOverclockTier,
      setLastOverclockTier: (tier) => {
        lastOverclockTier = tier;
      },
      onOverclockChange: opts.onOverclockChange,
      syncFeverScreenFx: opts.syncFeverScreenFx,
      syncTowerSceneVisual: opts.syncTowerSceneVisual,
      omegaArenaUi: mods.omegaArenaUi,
      riftBridge: mods.riftBridge,
      syncOmegaSceneVisual: () => mods.omegaBridge.syncOmegaSceneVisual(),
      setSceneMode: opts.setSceneMode,
      openModal: opts.openModal,
      pushToast: opts.pushToast,
      render: opts.render,
    });
    if (opts.getActiveModal() === 'rift') {
      mods.riftUi.stepTick(0.1, root);
    }
  }, 100);
}
