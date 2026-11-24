import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import type { OverclockTier } from '../game/OverclockDomain';
import type { SceneMode } from '../game3d/MineScene3D';
import { gameSettings } from '../game/GameSettings';
import type { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import type { WeatherId } from '../game/WeatherData';
import { rollHudCurrencyValue } from './LootVacuumFx';
import type { AchievementsModalUi } from './AchievementsModalUi';
import type { BountiesModalUi } from './BountiesModalUi';
import type { ChestModalUi } from './ChestModalUi';
import type { DailyLoginModalUi } from './DailyLoginModalUi';
import type { ForgeModalUi } from './ForgeModalUi';
import type { FusionHudUi } from './FusionHudUi';
import type { FeverEncoreHudInfo } from './HudChromeRenderer';
import {
  formatCountdownTimer,
  type ModalKind,
  refreshPotionTimersInDom,
  shouldDismissModalBackdrop,
} from './HudShared';
import type { AltarShopHudUi } from './AltarShopHudUi';
import type { HotbarHudUi } from './HotbarHudUi';
import type { IndexModalUi } from './IndexModalUi';
import type { InventoryModalUi } from './InventoryModalUi';
import type { OfflineModalUi } from './OfflineModalUi';
import type { OmegaArenaHudUi } from './OmegaArenaHudUi';
import type { OmegaBossModalUi } from './OmegaBossModalUi';
import type { SettingsModalUi } from './SettingsModalUi';
import type { ShopModalsUi } from './ShopModalsUi';
import type { TowerUi } from './TowerUi';
import type { TwinTrialModalUi } from './TwinTrialModalUi';
import type { UpgradesWorldsUi } from './UpgradesWorldsUi';
import type { WeatherDpsHudUi } from './WeatherDpsHudUi';

export interface HudModalRenderers {
  indexUi: IndexModalUi;
  inventoryUi: InventoryModalUi;
  chestUi: ChestModalUi;
  shopUi: ShopModalsUi;
  upgradesUi: UpgradesWorldsUi;
  towerUi: TowerUi;
  forgeUi: ForgeModalUi;
  settingsUi: SettingsModalUi;
  offlineUi: OfflineModalUi;
  bountiesUi: BountiesModalUi;
  achievementsUi: AchievementsModalUi;
  dailyLoginUi: DailyLoginModalUi;
  fusionUi: FusionHudUi;
  omegaBossUi: OmegaBossModalUi;
  twinTrialUi?: TwinTrialModalUi;
}

export interface HudActionRouterContext {
  root: HTMLElement;
  state: GameState;
  shopUi: ShopModalsUi;
  inventoryUi: InventoryModalUi;
  upgradesUi: UpgradesWorldsUi;
  getActiveModal: () => ModalKind;
  openModal: (kind: ModalKind) => void;
  toggleModal: (kind: ModalKind) => void;
  setSceneMode: (mode: SceneMode) => void;
  pushToast: (text: string) => void;
  render: () => void;
}

export interface HudSlowTickContext {
  root: HTMLElement;
  state: GameState;
  activeModal: ModalKind;
  weatherDpsUi: WeatherDpsHudUi;
  lastRegrowthActive: boolean;
  setLastRegrowthActive: (active: boolean) => void;
  lastReturnRushActive?: boolean;
  setLastReturnRushActive?: (active: boolean) => void;
  onSyncPlots: (ids: (string | null)[]) => void;
  onWeatherChange?: (weatherId: WeatherId) => void;
  onTwinTrialExpired?: (chibiId: string | null) => void;
  pushToast: (text: string) => void;
  render: () => void;
}

export interface HudFastTickContext {
  root: HTMLElement;
  state: GameState;
  sceneMode: SceneMode;
  weatherDpsUi: WeatherDpsHudUi;
  towerUi: TowerUi;
  omegaArenaUi?: OmegaArenaHudUi;
  lastOverclockActive: boolean;
  setLastOverclockActive: (active: boolean) => void;
  lastOverclockTier: 0 | OverclockTier;
  setLastOverclockTier: (tier: 0 | OverclockTier) => void;
  onOverclockChange?: (active: boolean, tier: 0 | OverclockTier) => void;
  syncFeverScreenFx: (
    active: boolean,
    triggerBurst: boolean,
    tier: 0 | OverclockTier,
    encore?: FeverEncoreHudInfo
  ) => void;
  syncTowerSceneVisual: () => void;
  syncOmegaSceneVisual?: () => void;
  setSceneMode: (mode: SceneMode) => void;
  openModal: (kind: ModalKind) => void;
  pushToast: (text: string) => void;
  render: () => void;
}

export function renderActiveModalHtml(activeModal: ModalKind, ui: HudModalRenderers): string {
  switch (activeModal) {
    case 'index':
      return ui.indexUi.renderModal();
    case 'inventory':
      return ui.inventoryUi.renderModal();
    case 'chest':
      return ui.chestUi.renderModal();
    case 'pickaxe-shop':
      return ui.shopUi.renderPickaxeShopModal();
    case 'sell-shop':
      return ui.shopUi.renderSellShopModal();
    case 'gem-shop':
      return ui.shopUi.renderGemShopModal();
    case 'premium-shop':
      return ui.shopUi.renderPremiumShopModal();
    case 'upgrades':
      return ui.upgradesUi.renderUpgradesModal();
    case 'worlds':
      return ui.upgradesUi.renderWorldsModal();
    case 'tower':
      return ui.towerUi.renderTowerHubModal();
    case 'forge':
      return ui.forgeUi.renderForgeModal();
    case 'settings':
      return ui.settingsUi.renderModal();
    case 'offline':
      return ui.offlineUi.renderModal();
    case 'bounties':
      return ui.bountiesUi.renderModal();
    case 'achievements':
      return ui.achievementsUi.renderModal();
    case 'daily-login':
      return ui.dailyLoginUi.renderModal();
    case 'altar-hub':
      return ui.fusionUi.renderAltarChoiceModal();
    case 'omega-boss':
      return ui.omegaBossUi.renderOmegaModal();
    case 'twin-trial':
      return ui.twinTrialUi ? ui.twinTrialUi.renderModal() : '';
    default:
      return '';
  }
}

export function buildHudCoordinatorActions(ctx: HudActionRouterContext): Record<string, () => void> {
  return {
    'open-index': () => ctx.toggleModal('index'),
    'open-settings': () => ctx.toggleModal('settings'),
    'toggle-camera-lock': () => {
      const next = gameSettings.update({ cameraLocked: !gameSettings.get().cameraLocked });
      audio.playSfx('ui-tab');
      ctx.pushToast(next.cameraLocked ? 'Camera Locked (Zoom Only)' : 'Camera Unlocked');
      ctx.render();
    },
    'open-bounties': () => ctx.toggleModal('bounties'),
    'open-achievements': () => ctx.toggleModal('achievements'),
    'open-daily-login': () => ctx.toggleModal('daily-login'),
    'open-twin-trial': () => {
      audio.playSfx('ui-open');
      ctx.toggleModal('twin-trial');
    },
    'toggle-audio': () => {
      const nextMuted = audio.toggleMuted();
      ctx.pushToast(nextMuted ? 'Audio Muted' : 'Audio On');
      ctx.render();
    },
    'open-chest': () => ctx.toggleModal('chest'),
    'close-modal': () => ctx.openModal('none'),
    'equip-best': () => {
      ctx.state.equipBestMiners();
      audio.playSfx('place-chibi');
      ctx.pushToast('Equipped best miners to Plot!');
    },
    'auto-star-up': () => {
      const upgrades = ctx.state.autoStarUpAll();
      if (upgrades > 0) {
        audio.playSfx('upgrade');
        ctx.pushToast(`Starred up ${upgrades}x!`);
        ctx.inventoryUi.updateLive(ctx.root);
      } else {
        audio.playSfx('ui-error');
        ctx.pushToast('No Chibi has enough spare duplicates!');
      }
    },
    'chest-take-all': () => {
      const taken = ctx.state.takeAllFromChest();
      audio.playSfx(taken > 0 ? 'coin-alt' : 'ui-error');
      ctx.pushToast(taken > 0 ? `Collected ${fmtInt(taken)} items!` : 'Chest is empty');
    },
    'chest-sell-ores': () => {
      const res = ctx.state.sellAllChestOres();
      audio.playSfx(res.earned > 0 ? 'coin' : 'ui-error');
      ctx.pushToast(
        res.earned > 0
          ? `Sold chest ores for ${fmtMoney(res.earned)}${res.bonusApplied ? ' (+35% Full-Chest Bonus!)' : ''}`
          : 'No ores in chest to sell'
      );
    },
    'shops-pill': () => {
      audio.playSfx('teleport', { volume: 0.45 });
      ctx.setSceneMode('shop');
    },
    'sell-select-all': () => {
      audio.playSfx('ui-tab');
      ctx.shopUi.toggleSellSelectAll(ctx.root);
    },
    'sell-selected': () => ctx.shopUi.sellSelectedItems(ctx.root),
    'open-worlds': () => ctx.toggleModal('worlds'),
    'open-upgrades': () => {
      if (ctx.getActiveModal() !== 'upgrades') {
        ctx.upgradesUi.syncActiveWorldTab();
      }
      ctx.toggleModal('upgrades');
    },
    'open-shop': () => {
      audio.playSfx('ui-open');
      ctx.toggleModal('premium-shop');
    },
    'gems-plus': () => {
      audio.playSfx('ui-open');
      ctx.openModal('gem-shop');
    },
  };
}

export function updateHudCurrencyAndBadges(root: HTMLElement, state: GameState): void {
  const gemsEl = root.querySelector<HTMLElement>('[data-hud-gems="true"]');
  if (gemsEl) rollHudCurrencyValue(gemsEl, state.gems, 'gems');
  const cashEl = root.querySelector<HTMLElement>('[data-hud-cash="true"]');
  if (cashEl) rollHudCurrencyValue(cashEl, state.cash, 'cash');
  const bountiesBadge = root.querySelector<HTMLElement>('[data-bounties-badge="true"]');
  if (bountiesBadge) {
    const ready = state.getReadyBountyCount();
    bountiesBadge.textContent = String(ready);
    bountiesBadge.classList.toggle('hidden', ready <= 0);
  }
  const indexBadge = root.querySelector<HTMLElement>('[data-index-badge="true"]');
  if (indexBadge) {
    const readyIndex = state.getReadyIndexRewardCount();
    indexBadge.textContent = String(readyIndex);
    indexBadge.classList.toggle('hidden', readyIndex <= 0);
  }
  const achBadge = root.querySelector<HTMLElement>('[data-achievements-badge="true"]');
  if (achBadge) {
    const readyAch = state.getReadyAchievementCount();
    achBadge.textContent = String(readyAch);
    achBadge.classList.toggle('hidden', readyAch <= 0);
  }
}

export function stepHudSlowTick(ctx: HudSlowTickContext): void {
  if (ctx.activeModal === 'pickaxe-shop') {
    ctx.state.refreshPickaxeStockIfDue();
    const el = ctx.root.querySelector('[data-restock-timer="true"]');
    if (el) {
      el.textContent = `Restock in ${formatCountdownTimer(ctx.state.getPickaxeRestockRemainingSec())}`;
    }
  } else if (ctx.activeModal === 'gem-shop' || ctx.activeModal === 'inventory') {
    refreshPotionTimersInDom(ctx.root, ctx.state);
  } else if (ctx.activeModal === 'tower') {
    const prevKeys = ctx.state.towerKeys;
    ctx.state.syncTowerKeys();
    if (ctx.state.towerKeys !== prevKeys) {
      ctx.render();
    } else {
      const regenEl = ctx.root.querySelector('[data-tower-regen="true"]');
      if (regenEl) {
        const sec = ctx.state.getTowerNextKeyRegenSec();
        regenEl.textContent = sec > 0 ? `(+1 in ${formatCountdownTimer(sec)})` : '(Full)';
      }
    }
  } else if (ctx.activeModal === 'omega-boss') {
    const prevKeys = ctx.state.omegaKeys;
    ctx.state.syncOmegaKeys();
    if (ctx.state.omegaKeys !== prevKeys) {
      ctx.render();
    } else {
      const pill = ctx.root.querySelector('[data-omega-keys-text]') ?? ctx.root.querySelector('[data-omega-keys-pill]');
      if (pill) {
        const sec = ctx.state.getOmegaNextKeyRegenSec();
        pill.textContent = `${ctx.state.omegaKeys}/5 Keys${sec > 0 ? ` (${formatCountdownTimer(sec)})` : ''}`;
      }
    }
  }

  ctx.weatherDpsUi.syncActivePotionsHud(ctx.root);
  const nextWeather = ctx.state.syncWeather();
  if (nextWeather) {
    ctx.onWeatherChange?.(nextWeather.id);
    ctx.onSyncPlots(ctx.state.getEquippedPlotMinerIds());
    ctx.pushToast(
      `Weather: ${nextWeather.name} (${nextWeather.oreDropMult}x Ore • ${nextWeather.gemDropMult}x Gems • ${nextWeather.damageMult}x DMG)`
    );
    ctx.weatherDpsUi.syncWeatherWidget(ctx.root, true);
  } else {
    ctx.weatherDpsUi.syncWeatherWidget(ctx.root, false);
  }

  const regrowthActive = ctx.state.getBoostRemainingSec('regrowth-potion') > 0;
  const returnRushActive = ctx.state.isReturnRushActive();
  let needPlotSync = false;
  if (regrowthActive !== ctx.lastRegrowthActive) {
    ctx.setLastRegrowthActive(regrowthActive);
    needPlotSync = true;
  }
  if (ctx.lastReturnRushActive !== undefined && returnRushActive !== ctx.lastReturnRushActive) {
    ctx.setLastReturnRushActive?.(returnRushActive);
    needPlotSync = true;
  }
  if (needPlotSync) {
    ctx.onSyncPlots(ctx.state.getEquippedPlotMinerIds());
  }
  ctx.weatherDpsUi.syncDpsMeterWidget(ctx.root);

  const trialRes = ctx.state.syncTwinTrial();
  if (trialRes.expired) {
    ctx.onTwinTrialExpired?.(trialRes.chibiId);
    ctx.onSyncPlots(ctx.state.getEquippedPlotMinerIds());
    const chibiName = trialRes.chibiId ? (getChibiById(trialRes.chibiId)?.name ?? trialRes.chibiId) : 'Twin Chibi';
    ctx.pushToast(`⏱️ Twin Trial ended! ${chibiName} has returned.`);
    ctx.render();
  } else if (ctx.state.isTwinTrialActive()) {
    const remStr = formatCountdownTimer(ctx.state.getTwinTrialRemainingSec());
    ctx.root.querySelectorAll<HTMLElement>('[data-twin-trial-timer="true"], [data-twin-trial-modal-timer="true"]').forEach((el) => {
      el.textContent = remStr;
    });
  }
}

export function stepHudFastTick(ctx: HudFastTickContext): void {
  ctx.state.stepOverclock();
  const ocSnap = ctx.state.getOverclockSnapshot();
  const ocActive = ocSnap.active;
  const ocTier = ocSnap.tier;
  const encoreInfo: FeverEncoreHudInfo = {
    remaining: ocSnap.encoreRemaining,
    completed: ocSnap.encoreCompleted,
    total: ocSnap.encoreTotal,
  };
  if (ocActive !== ctx.lastOverclockActive || ocTier !== ctx.lastOverclockTier) {
    const prevTier = ctx.lastOverclockTier;
    ctx.setLastOverclockActive(ocActive);
    ctx.setLastOverclockTier(ocTier);
    ctx.onOverclockChange?.(ocActive, ocTier);
    const tierUp = ocActive && ocTier > prevTier;
    ctx.syncFeverScreenFx(ocActive, tierUp, ocTier, encoreInfo);
    if (tierUp) {
      audio.playSfx('rare-fanfare', { volume: ocTier >= 2 ? 0.72 : 0.65 });
      audio.playCrystalChord('fever');
      const orePct = Math.round((ocSnap.dropMult - 1) * 100);
      if (ocTier === 3) {
        ctx.pushToast(`⚡ HYPER ENCORE LV.3! 5x Squad Ult • ${ocSnap.chibiDmgMult}x DMG • ${ocSnap.tapMult}x Tap • +${orePct}% Ore!`);
      } else if (ocTier === 2) {
        ctx.pushToast(`⚡ SUPER FEVER LV.2! ${ocSnap.chibiDmgMult}x DMG • ${ocSnap.tapMult}x Tap • +${orePct}% Ore!`);
      } else {
        ctx.pushToast('⚡ OVERCLOCK ACTIVE! 2x DMG • 2x Tap • +50% Ore!');
      }
    }
  } else if (ocActive && ocTier === 3 && ocSnap.encoreTotal > 0) {
    ctx.syncFeverScreenFx(true, false, 3, encoreInfo);
  }
  if (ctx.sceneMode === 'mine') {
    ctx.weatherDpsUi.syncOverclockWidget(ctx.root);
  }

  if (ctx.sceneMode === 'omega' && ctx.state.omegaBattle) {
    const prevPhase = ctx.state.omegaBattle.phase;
    const prevParry = ctx.state.omegaBattle.parryWindow.active;
    const prevBreak = ctx.state.omegaBattle.breakRemainingSec > 0;
    const prevTargetCount = ctx.state.omegaBattle.targets.length;
    const summary = ctx.state.stepOmegaBossTick(0.1);
    if (summary) {
      if (summary.victory) {
        audio.playSfx('rare-fanfare', { volume: 0.78 });
      } else {
        ctx.pushToast(summary.shieldFailed ? 'Shield held! 0 Boss Keys lost.' : 'Time up! 0 Boss Keys lost.');
      }
      ctx.syncOmegaSceneVisual?.();
      ctx.render();
      return;
    }
    ctx.syncOmegaSceneVisual?.();
    const b = ctx.state.omegaBattle;
    if (b && prevPhase === 'entrance' && b.phase === 'invul_shield') {
      ctx.pushToast('🛡️ BOSS INVULNERABLE (30s)! Tap random targets to shatter!');
    }
    if (
      b &&
      (b.phase !== prevPhase ||
        b.parryWindow.active !== prevParry ||
        (b.breakRemainingSec > 0) !== prevBreak ||
        b.targets.length !== prevTargetCount)
    ) {
      ctx.render();
    } else {
      ctx.omegaArenaUi?.updateLiveValues(ctx.root);
    }
    return;
  }

  if (ctx.sceneMode !== 'tower' || !ctx.state.towerRun) return;
  const wasShielded = Boolean(ctx.state.towerRun.isBossWave && (ctx.state.towerRun.bossInvulLeft ?? 0) > 0);
  const tick = ctx.state.stepTowerTick(0.1);
  if (tick.status === 'timeout') {
    const rem = tick.summary?.remainingHpPct ?? 0;
    const nearMsg = rem > 0 && rem <= 25 ? ` So close (${rem}% HP left)!` : '';
    ctx.pushToast(`Tower timer ended!${nearMsg}`);
    ctx.setSceneMode('shop');
    ctx.openModal('tower');
  } else if (tick.status === 'blessing-auto-picked') {
    audio.playSfx('rare-fanfare', { volume: 0.65 });
    ctx.pushToast(`Auto-picked Spire Blessing: ${tick.autoPickedBlessing?.name ?? 'Blessing'}!`);
    ctx.syncTowerSceneVisual();
    ctx.render();
  } else if (tick.status === 'active' || tick.status === 'paused') {
    const isShielded = Boolean(ctx.state.towerRun?.isBossWave && (ctx.state.towerRun.bossInvulLeft ?? 0) > 0);
    if (wasShielded !== isShielded) {
      ctx.syncTowerSceneVisual();
    }
    ctx.towerUi.updateLiveValues(ctx.root);
  }
}

export interface HudLiveSubViewContext {
  root: HTMLElement;
  sceneMode: SceneMode;
  activeModal: ModalKind;
  altarShopUi: AltarShopHudUi;
  fusionUi: FusionHudUi;
  towerUi: TowerUi;
  chestUi: ChestModalUi;
  shopUi: ShopModalsUi;
  indexUi: IndexModalUi;
  inventoryUi: InventoryModalUi;
  upgradesUi: UpgradesWorldsUi;
}

/** Updates live values for whichever non-idle scene or modal is currently active. */
export function syncHudLiveSubView(ctx: HudLiveSubViewContext): void {
  if (ctx.sceneMode === 'altar') {
    ctx.altarShopUi.updateAltarLiveValues(ctx.root);
  } else if (ctx.sceneMode === 'fusion') {
    ctx.fusionUi.syncCurrentRecipeTo3D();
  } else if (ctx.sceneMode === 'tower') {
    ctx.towerUi.updateLiveValues(ctx.root);
  } else if (ctx.activeModal === 'chest') {
    ctx.chestUi.updateLive(ctx.root);
  } else if (ctx.activeModal === 'pickaxe-shop') {
    ctx.shopUi.updatePickaxeShopLive(ctx.root);
  } else if (ctx.activeModal === 'sell-shop') {
    ctx.shopUi.updateSellShopLive(ctx.root);
  } else if (ctx.activeModal === 'gem-shop') {
    ctx.shopUi.updateGemShopLive(ctx.root);
  } else if (ctx.activeModal === 'premium-shop') {
    ctx.shopUi.updatePremiumShopLive(ctx.root);
  } else if (ctx.activeModal === 'index') {
    ctx.indexUi.updateLive(ctx.root);
  } else if (ctx.activeModal === 'inventory') {
    ctx.inventoryUi.updateLive(ctx.root);
  } else if (ctx.activeModal === 'upgrades') {
    ctx.upgradesUi.updateUpgradesLive(ctx.root);
  } else if (ctx.activeModal === 'worlds') {
    ctx.upgradesUi.updateWorldsModalLive(ctx.root);
  }
  ctx.upgradesUi.updateUpgradesBadgeLive(ctx.root);
}

export interface HudBindRootEventsContext extends HudActionRouterContext, HudModalRenderers {
  getModalOpenedAtMs: () => number;
  hotbarUi: HotbarHudUi;
  weatherDpsUi: WeatherDpsHudUi;
  altarShopUi: AltarShopHudUi;
  omegaArenaUi: OmegaArenaHudUi;
}

/** Binds modal backdrop dismissal, coordinator actions, and all sub-UI event handlers. */
export function bindHudRootEvents(ctx: HudBindRootEventsContext): void {
  const backdrop = ctx.root.querySelector<HTMLElement>('[data-backdrop="true"]');
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
          openedAtMs: ctx.getModalOpenedAtMs(),
          nowMs,
        })
      ) {
        return;
      }
      ctx.openModal('none');
    });
  }

  const coordinatorActions = buildHudCoordinatorActions(ctx);
  ctx.root.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    const handler = action ? coordinatorActions[action] : undefined;
    if (handler) el.addEventListener('click', handler);
  });

  ctx.hotbarUi.bindEvents(ctx.root);
  ctx.upgradesUi.bindUpgradesEvents(ctx.root);
  ctx.upgradesUi.bindWorldsEvents(ctx.root);
  ctx.weatherDpsUi.bindEvents(ctx.root);
  ctx.altarShopUi.bindEvents(ctx.root);
  ctx.indexUi.bindEvents(ctx.root);
  ctx.inventoryUi.bindEvents(ctx.root);
  ctx.chestUi.bindEvents(ctx.root);
  ctx.forgeUi.bindEvents(ctx.root);
  ctx.shopUi.bindEvents(ctx.root);
  ctx.towerUi.bindHubEvents(ctx.root);
  ctx.towerUi.bindArenaEvents(ctx.root);
  ctx.settingsUi.bindEvents(ctx.root);
  ctx.offlineUi.bindEvents(ctx.root);
  ctx.bountiesUi.bindEvents(ctx.root);
  ctx.achievementsUi.bindEvents(ctx.root);
  ctx.dailyLoginUi.bindEvents(ctx.root);
  ctx.fusionUi.bindAltarChoiceEvents(ctx.root);
  ctx.fusionUi.bindFusionWorldEvents(ctx.root);
  ctx.omegaBossUi.bindEvents(ctx.root);
  ctx.omegaArenaUi.bindArenaEvents(ctx.root);
  ctx.twinTrialUi?.bindEvents(ctx.root);
}
