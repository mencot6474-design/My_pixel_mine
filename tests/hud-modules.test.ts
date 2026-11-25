import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PlotInspectUi, shouldStopAutoMutationRoll, sortInspectPickaxes } from '../src/ui/PlotInspectUi';
import { AudioManager, getMusicalScaleRate, MUSICAL_SCALE_SEMITONES } from '../src/audio/AudioManager';
import { IndexModalUi } from '../src/ui/IndexModalUi';
import { getIndexTabEntryIds } from '../src/game/IndexRewardsDomain';
import { InventoryModalUi, sortInventoryMiners } from '../src/ui/InventoryModalUi';
import { CHIBI_CATALOG } from '../src/game3d/ChibiCatalog';
import { getLootVacuumBurstPlan } from '../src/ui/LootVacuumFx';
import { ENCHANTS, GEM_SHOP_ITEMS, ORES, PICKAXES } from '../src/game/GameData';
import {
  DEFAULT_GAME_SETTINGS,
  GameSettings,
  GRAPHICS_PRESETS,
  normalizeGameSettings,
  SETTINGS_STORAGE_KEY,
} from '../src/game/GameSettings';
import { GameState } from '../src/game/GameState';
import {
  getAltarRollButtonState,
  renderAltarStripCardsHtml,
  renderShopWorldHudHtml,
} from '../src/ui/AltarShopHudUi';
import { DailyLoginModalUi } from '../src/ui/DailyLoginModalUi';
import { ForgeModalUi } from '../src/ui/ForgeModalUi';
import {
  buildHotbarStateKey,
  canDropHotbarOnPlot,
  renderHotbarBagButtonHtml,
  renderHotbarSlotsHtml,
} from '../src/ui/HotbarHudUi';
import {
  buildEnchantHoverCardHtml,
  captureRootScrolls,
  formatCountdownTimer,
  getElementPath,
  rarityCardClasses,
  renderMutationBadgeHtml,
  renderRarityBadgeHtml,
  renderToastBannerHtml,
  restoreRootScrolls,
  shouldDismissModalBackdrop,
} from '../src/ui/HudShared';
import {
  buildActivePotionsDockContent,
  buildDpsMeterInnerHtml,
  buildOverclockGaugeInnerHtml,
  buildWeatherWidgetInnerHtml,
  buildWorldSynergyBadgesHtml,
  formatWeatherTimer,
} from '../src/ui/WeatherDpsHudUi';
import { UpgradesWorldsUi } from '../src/ui/UpgradesWorldsUi';
import {
  renderAudioControlsHtml,
  renderCurrencyRailHtml,
  renderFeverScreenFxHtml,
  shouldShowTwinTrialHudButton,
  triggerFeverUltCutInDom,
} from '../src/ui/HudChromeRenderer';
import { stepHudSlowTick } from '../src/ui/HudActionRouter';
import { TwinTrialModalUi } from '../src/ui/TwinTrialModalUi';
import { RiftModalUi } from '../src/ui/RiftModalUi';
import { RiftArenaHudUi } from '../src/ui/RiftArenaHudUi';
import { HudRiftBridge } from '../src/ui/HudRiftBridge';
import { PREMIUM_SHOP_ITEMS } from '../src/game/PremiumShopData';
import { TWIN_TRIAL_DURATION_MS } from '../src/game/TwinTrialDomain';
import {
  buildAltarAnchorsHtml,
  buildMineOreBarsHtml,
  buildPlotLabelPayload,
  buildShopAnchorsHtml,
  buildShopChibiBubblesHtml,
  buildTowerOreBarsHtml,
  shouldShowMineOreBars,
  shouldShowTowerOreBars,
  WorldOverlayHudUi,
} from '../src/ui/WorldOverlayHudUi';
import { BountiesModalUi } from '../src/ui/BountiesModalUi';
import { AchievementsModalUi } from '../src/ui/AchievementsModalUi';
import { TowerUi } from '../src/ui/TowerUi';
import { OmegaBossModalUi } from '../src/ui/OmegaBossModalUi';
import { OmegaArenaHudUi } from '../src/ui/OmegaArenaHudUi';
import { HudOmegaBridge } from '../src/ui/HudOmegaBridge';
import { TowerArenaHudUi } from '../src/ui/TowerArenaHudUi';
import { towerBlessingIconHtml } from '../src/ui/HudIcons';
import { TOWER_BLESSINGS } from '../src/game/TowerData';
import { buildHudCoordinatorActions } from '../src/ui/HudActionRouter';
import { ShopModalsUi } from '../src/ui/ShopModalsUi';
import { getTapComboTier, stepTapCombo, TAP_COMBO_WINDOW_MS } from '../src/game/TapComboHelper';
import { OfflineModalUi } from '../src/ui/OfflineModalUi';
import { SettingsModalUi } from '../src/ui/SettingsModalUi';
import {
  buildTutorialCardHtml,
  getTutorialStageMeta,
  TUTORIAL_AUTO_CLOSE_DELAY_MS,
  TUTORIAL_REWARD_DICE,
  TUTORIAL_REWARD_GEMS,
  TutorialStep,
  TutorialUi,
} from '../src/ui/TutorialUi';
import {
  shouldAdvanceTutorialOnSellSelectAll,
  shouldIgnoreHudShortcutDuringTutorial,
} from '../src/ui/GameHud';

interface FakeDomHandle {
  el: HTMLElement;
  appendChild: (child: FakeDomHandle) => void;
}

function createFakeDomNode(scrollTop = 0, scrollLeft = 0): FakeDomHandle {
  const childrenList: HTMLElement[] = [];
  const children = Object.assign(childrenList, {
    item: (idx: number) => childrenList[idx] ?? null,
  });
  const el = {
    scrollTop,
    scrollLeft,
    parentElement: null as HTMLElement | null,
    children,
  } as unknown as HTMLElement;
  return {
    el,
    appendChild: (child: FakeDomHandle) => {
      Object.defineProperty(child.el, 'parentElement', { value: el, configurable: true });
      childrenList.push(child.el);
    },
  };
}

describe('Tahap B HUD Modules', () => {
  describe('HudShared & ForgeModalUi (Task 1)', () => {
    it('exports scroll preservation helpers, captures/restores scroll offsets, and rejects detached paths', () => {
      expect(rarityCardClasses('rainbow', 'extra')).toBe('mam-card rarity-rainbow extra');

      const sibling = createFakeDomNode(0, 0);
      const branch = createFakeDomNode(0, 0);
      const leafFiller = createFakeDomNode(0, 0);
      const leafScrollable = createFakeDomNode(120, 14);
      const root = createFakeDomNode(0, 0);

      root.appendChild(sibling);
      root.appendChild(branch);
      branch.appendChild(leafFiller);
      branch.appendChild(leafScrollable);

      (root.el as unknown as { querySelectorAll: () => HTMLElement[] }).querySelectorAll = () => [
        sibling.el,
        branch.el,
        leafFiller.el,
        leafScrollable.el,
      ];

      expect(getElementPath(root.el, leafScrollable.el)).toEqual([1, 1]);
      expect(getElementPath(root.el, root.el)).toEqual([]);
      const detached = createFakeDomNode(5, 0);
      expect(getElementPath(root.el, detached.el)).toEqual([]);

      const captured = captureRootScrolls(root.el);
      expect(captured).toEqual([{ path: [1, 1], scrollTop: 120, scrollLeft: 14 }]);

      leafScrollable.el.scrollTop = 0;
      leafScrollable.el.scrollLeft = 0;
      restoreRootScrolls(root.el, captured);
      expect(leafScrollable.el.scrollTop).toBe(120);
      expect(leafScrollable.el.scrollLeft).toBe(14);
    });

    it('handles Forge actions & bindEvents with tab validation and toast/render callbacks', () => {
      const state = new GameState();
      const pushToast = vi.fn();
      const onRequestRender = vi.fn();
      const forge = new ForgeModalUi(state, pushToast, onRequestRender);

      expect(forge.handleAction('forge-tab', { tab: 'tower' })).toBe(true);
      expect(forge.forgeTab).toBe('tower');
      expect(onRequestRender).toHaveBeenCalledTimes(1);

      expect(forge.handleAction('forge-tab', { tab: 'invalid-tab' })).toBe(true);
      expect(forge.forgeTab).toBe('all');

      expect(forge.handleAction('inspect-forge', { id: 'ember-gauntlet' })).toBe(true);
      expect(forge.inspectedRelicId).toBe('ember-gauntlet');

      expect(forge.handleAction('forge-ore-info', { oreId: 'copper' })).toBe(true);
      expect(forge.inspectedOreSourceId).toBe('copper');
      expect(forge.handleAction('forge-ore-info-close', {})).toBe(true);
      expect(forge.inspectedOreSourceId).toBeNull();

      expect(forge.handleAction('forge-craft', { id: 'ember-gauntlet' })).toBe(true);
      expect(pushToast).toHaveBeenCalledWith('Missing materials or Gems!');

      expect(forge.handleAction('unrelated-action', {})).toBe(false);

      const boundClickHandlers: Array<(ev: { stopPropagation: () => void }) => void> = [];
      const mockCloseEl = {
        dataset: { action: 'forge-ore-info-close' },
        addEventListener: (_evt: string, fn: (ev: { stopPropagation: () => void }) => void) => {
          boundClickHandlers.push(fn);
        },
      };
      const mockNonForgeEl = {
        dataset: { action: 'close-modal' },
        addEventListener: vi.fn(),
      };
      const mockModalRoot = {
        querySelectorAll: () => [mockNonForgeEl, mockCloseEl],
      } as unknown as HTMLElement;

      forge.bindEvents(mockModalRoot);
      expect(mockNonForgeEl.addEventListener).not.toHaveBeenCalled();
      expect(boundClickHandlers).toHaveLength(1);
      const stopPropagation = vi.fn();
      boundClickHandlers[0]({ stopPropagation });
      expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('WeatherDpsHudUi (Task 2)', () => {
    it('clamps/formats countdown timers and builds multi-row & expired active potions dock', () => {
      expect(formatCountdownTimer(-5)).toBe('0:00');
      expect(formatWeatherTimer(0)).toBe('0:00');
      expect(formatWeatherTimer(5.7)).toBe('0:05');
      expect(formatWeatherTimer(185)).toBe('3:05');

      const state = new GameState();
      const now = Date.now();
      const emptyDock = buildActivePotionsDockContent(state, now);
      expect(emptyDock.empty).toBe(true);
      expect(emptyDock.single).toBe(false);
      expect(emptyDock.key).toBe('');
      expect(emptyDock.html).toBe('');

      // Expired boost is filtered out while single active boost renders compact timer
      state.activeBoosts[GEM_SHOP_ITEMS[0].id] = now + 65_000;
      state.activeBoosts[GEM_SHOP_ITEMS[1].id] = now - 5_000;
      const singleDock = buildActivePotionsDockContent(state, now);
      expect(singleDock.empty).toBe(false);
      expect(singleDock.single).toBe(true);
      expect(singleDock.key).toBe(GEM_SHOP_ITEMS[0].id);
      expect(singleDock.html).toContain(`data-hud-pot="${GEM_SHOP_ITEMS[0].id}"`);
      expect(singleDock.html).toContain(`data-hud-pot-timer="${GEM_SHOP_ITEMS[0].id}">1:05<`);

      // >= 3 active boosts trigger 2-column row reversal (row 2 ordered before row 1)
      state.activeBoosts[GEM_SHOP_ITEMS[1].id] = now + 120_000;
      state.activeBoosts[GEM_SHOP_ITEMS[2].id] = now + 180_000;
      const multiDock = buildActivePotionsDockContent(state, now);
      expect(multiDock.single).toBe(false);
      expect(multiDock.key).toBe(`${GEM_SHOP_ITEMS[2].id},${GEM_SHOP_ITEMS[0].id},${GEM_SHOP_ITEMS[1].id}`);
    });

    it('builds weather widget forecast popover (incl. chibi drops & OFF state) and collapsed/expanded DPS meter', () => {
      const state = new GameState();
      state.autoMeteor = false;
      const now = state.weatherExpiresAt - 90_000;
      const closedWeather = buildWeatherWidgetInnerHtml(
        state,
        { popoverOpen: false, inspectId: null },
        now
      );
      expect(closedWeather).toContain('data-action="toggle-weather-info"');
      expect(closedWeather).toContain('data-action="toggle-auto-meteor"');
      expect(closedWeather).toContain('>OFF<');
      expect(closedWeather).not.toContain('Weather Forecast');

      const openVoidWeather = buildWeatherWidgetInnerHtml(
        state,
        { popoverOpen: true, inspectId: 'void' },
        now
      );
      expect(openVoidWeather).toContain('Weather Forecast');
      expect(openVoidWeather).toContain('data-weather-inspect="void"');
      expect(openVoidWeather).toContain('2-3x per meteor');
      expect(openVoidWeather).toContain('Singularity');

      const openCelestial = buildWeatherWidgetInnerHtml(
        state,
        { popoverOpen: true, inspectId: 'celestial' },
        now
      );
      expect(openCelestial).toContain('3-4x per meteor');
      expect(openCelestial).toContain('Eclipse Seraph');

      const collapsedDps = buildDpsMeterInnerHtml(state, false);
      expect(collapsedDps).toContain('data-action="toggle-dps-meter"');
      expect(collapsedDps).toContain('data-dps-chevron="up"');
      expect(collapsedDps).not.toContain('Damage Breakdown');

      const liveDps = buildDpsMeterInnerHtml(state, true);
      expect(liveDps).toContain('data-dps-scroll="true"');
      expect(liveDps).toContain('data-dps-inspect-slot="0"');

      state.removeMinerFromPlot(0);
      const emptyDps = buildDpsMeterInnerHtml(state, true);
      expect(emptyDps).toContain('Place Chibis on plots to track DPS.');
    });
  });

  describe('HotbarHudUi (Task 3)', () => {
    it('validates plot drop eligibility by scene mode, modal, and inspector state', () => {
      expect(canDropHotbarOnPlot({ sceneMode: 'mine', activeModal: 'none', inspectedSlot: null })).toBe(true);
      expect(canDropHotbarOnPlot({ sceneMode: 'shop', activeModal: 'none', inspectedSlot: null })).toBe(false);
      expect(canDropHotbarOnPlot({ sceneMode: 'mine', activeModal: 'inventory', inspectedSlot: null })).toBe(false);
      expect(canDropHotbarOnPlot({ sceneMode: 'mine', activeModal: 'none', inspectedSlot: 0 })).toBe(false);
    });

    it('renders 9 Chibi-only hotbar slots incl. ore/qty<=0/unknown fallbacks, tracks state key changes, and highlights bag button', () => {
      const state = new GameState();
      const firstOre = ORES[0];
      const zeroChibi = CHIBI_CATALOG[2];
      state.miners['astral-recruit'] = 1;
      state.hotbar[0] = 'astral-recruit';
      state.miners['solar-striker'] = 3;
      state.hotbar[1] = 'solar-striker';
      state.ores[firstOre.id] = 3;
      state.hotbar[2] = firstOre.id; // ores must never render on hotbar
      state.miners[zeroChibi.id] = 0;
      state.hotbar[3] = zeroChibi.id;
      state.hotbar[4] = 'non-existent-id';

      const key1 = buildHotbarStateKey(state);
      state.selectHotbarSlot(1);
      const key2 = buildHotbarStateKey(state);
      expect(key2).not.toBe(key1);

      const slotsHtml = renderHotbarSlotsHtml(state);
      for (let i = 0; i < 9; i++) {
        expect(slotsHtml).toContain(`data-hotbar="${i}"`);
      }
      expect(slotsHtml).toContain('Onee');
      expect(slotsHtml).toContain(CHIBI_CATALOG[1].name);
      expect(slotsHtml).toContain('x3');
      expect(slotsHtml).not.toContain(firstOre.name);
      expect(slotsHtml).not.toContain(zeroChibi.name);
      expect(slotsHtml).toContain('mam-hotbar-keycap');
      expect(slotsHtml).toContain('mam-empty-slot');
      expect(slotsHtml).not.toContain('rounded-full bg-[#14111d]/18');
      expect(slotsHtml).toContain('is-hotbar-selected');

      const closedBag = renderHotbarBagButtonHtml('none');
      const openBag = renderHotbarBagButtonHtml('inventory');
      expect(closedBag).toContain('data-action="toggle-inventory"');
      expect(openBag).toContain('mam-hotbar-bag');
      expect(openBag).toContain('is-open');
      expect(closedBag).toContain('mam-hotbar-bag');
      expect(closedBag).not.toContain('is-open');
    });
  });

  describe('AltarShopHudUi (Task 4)', () => {
    it('computes Altar roll button state across ready, empty, and spinning priority at zero dice', () => {
      const ready = getAltarRollButtonState(2, false);
      expect(ready.disabled).toBe(false);
      expect(ready.extraClass).toBe('');
      expect(ready.labelHtml).toBe('Roll');

      const empty = getAltarRollButtonState(0, false);
      expect(empty.disabled).toBe(false);
      expect(empty.extraClass).toBe('is-empty');
      expect(empty.labelHtml).toBe('Out of Rolls');

      const spinningZeroDice = getAltarRollButtonState(0, true);
      expect(spinningZeroDice.disabled).toBe(true);
      expect(spinningZeroDice.extraClass).toBe('is-spinning');
      expect(spinningZeroDice.labelHtml).toContain('Spinning...');
    });

    it('renders all Enchant Altar cards incl. rainbow variant and Shop Plaza dock actions', () => {
      const state = new GameState();
      const firstEnchant = ENCHANTS[0];
      state.ownedEnchants[firstEnchant.id] = 2;
      const stripHtml = renderAltarStripCardsHtml(state);
      expect(stripHtml).toContain(`data-altar-card="${firstEnchant.id}"`);
      expect(stripHtml).toContain(`data-altar-qty="${firstEnchant.id}">x2<`);
      expect(stripHtml).toContain('rarity-rainbow');

      const shopHtml = renderShopWorldHudHtml({
        weatherHtml: '<div id="w"></div>',
        currencyRailHtml: '<div id="c"></div>',
        activePotionsHtml: '<div id="p"></div>',
        modalHtml: '',
        toastStackHtml: '<div id="t"></div>',
      });
      expect(shopHtml).not.toContain('data-hud-dps');
      expect(shopHtml).toContain('data-action="back-to-mine"');
      expect(shopHtml).toContain('data-action="open-pickaxe-shop"');
      expect(shopHtml).toContain('data-action="open-sell-shop"');
      expect(shopHtml).toContain('data-action="open-relic-forge"');
      expect(shopHtml).toContain('data-action="open-gem-shop"');
      expect(shopHtml).toContain('data-action="open-enchant-altar"');
      expect(shopHtml).toContain('data-action="open-gem-tower"');
      expect(shopHtml).toContain('data-action="open-omega-boss"');
    });
  });

  describe('WorldOverlayHudUi (Task 5)', () => {
    it('builds PlotLabelInfo payloads incl. mutations, rainbow enchant, out-of-bounds, and bar guards', () => {
      const state = new GameState();
      if (state.plotUnits[0]) {
        state.plotUnits[0].mutationId = 'rainbow';
        state.plotUnits[0].enchantId = 'spellbound';
      }
      const occupied = buildPlotLabelPayload(state, 0);
      expect(occupied.info).not.toBeNull();
      expect(occupied.info?.name).toBe('Onee');
      expect(occupied.info?.mutationRainbow).toBe(true);
      expect(occupied.info?.enchantRainbow).toBe(true);
      expect(occupied.key.length).toBeGreaterThan(0);

      expect(buildPlotLabelPayload(state, 99)).toEqual({ key: '', info: null });

      state.removeMinerFromPlot(0);
      expect(buildPlotLabelPayload(state, 0)).toEqual({ key: '', info: null });

      expect(
        shouldShowMineOreBars({ sceneMode: 'mine', inspectedSlot: null, activeModal: 'none', barCount: 2 })
      ).toBe(true);
      expect(
        shouldShowMineOreBars({ sceneMode: 'mine', inspectedSlot: 0, activeModal: 'none', barCount: 2 })
      ).toBe(false);
      expect(
        shouldShowMineOreBars({ sceneMode: 'mine', inspectedSlot: null, activeModal: 'forge', barCount: 2 })
      ).toBe(false);
      expect(
        shouldShowMineOreBars({ sceneMode: 'mine', inspectedSlot: null, activeModal: 'none', barCount: 0 })
      ).toBe(false);
      expect(
        shouldShowMineOreBars({ sceneMode: 'shop', inspectedSlot: null, activeModal: 'none', barCount: 2 })
      ).toBe(false);

      expect(
        shouldShowTowerOreBars({
          sceneMode: 'tower',
          inspectedSlot: null,
          activeModal: 'none',
          pendingBlessings: false,
          barCount: 3,
        })
      ).toBe(true);
      expect(
        shouldShowTowerOreBars({
          sceneMode: 'tower',
          inspectedSlot: null,
          activeModal: 'none',
          pendingBlessings: true,
          barCount: 1,
        })
      ).toBe(false);
    });

    it('renders mine/tower ore bars, shop signs, chibi dialogue bubbles, and altar anchors', () => {
      const oreHtml = buildMineOreBarsHtml([
        { id: 0, x: 100, y: 200, hp: 50, maxHp: 100, variantKey: 'common', isMeteor: false },
        { id: 1, x: 300, y: 120, hp: 900, maxHp: 1000, variantKey: 'geode', isMeteor: true, meteorWeatherId: 'celestial' },
      ]);
      expect(oreHtml).toContain('data-ore-bar="0"');
      expect(oreHtml).toContain('data-ore-bar="1"');
      expect(oreHtml).toContain('Meteor');

      const towerHtml = buildTowerOreBarsHtml([
        { index: 0, x: 50, y: 80, hp: 100, maxHp: 120, name: 'Void Crystal', color: '#a855f7', variantKey: 'vein' },
      ]);
      expect(towerHtml).toContain('data-tower-ore-bar="0"');
      expect(towerHtml).toContain('Void Crystal');

      const shopAnchors = buildShopAnchorsHtml([
        { id: 'forge', title: 'Forge', subtitle: 'Craft Relics', x: 40, y: 50, visible: true },
      ]);
      expect(shopAnchors).toContain('data-shop-station="forge"');

      const bubbleHtml = buildShopChibiBubblesHtml([
        { id: 'npc-1', x: 120, y: 240, text: 'Welcome to Plaza!' },
      ]);
      expect(bubbleHtml).toContain('data-chibi-bubble="npc-1"');
      expect(bubbleHtml).toContain('Welcome to Plaza!');

      const altarAnchors = buildAltarAnchorsHtml([
        {
          id: ENCHANTS[0].id,
          name: ENCHANTS[0].name,
          color: ENCHANTS[0].color,
          chancePct: ENCHANTS[0].chancePct,
          x: 10,
          y: 20,
          visible: true,
          highlighted: true,
        },
      ]);
      expect(altarAnchors).toContain(`data-altar-lbl="${ENCHANTS[0].id}"`);
      expect(altarAnchors).toContain('is-hi');
    });
  });

  describe('GameSettings', () => {
    it('exposes exact graphics quality presets and normalizes invalid/out-of-range inputs', () => {
      expect(GRAPHICS_PRESETS.high).toEqual({ maxPixelRatio: 2, shadowsEnabled: true, weatherParticleScale: 1 });
      expect(GRAPHICS_PRESETS.medium).toEqual({ maxPixelRatio: 1.75, shadowsEnabled: true, weatherParticleScale: 0.5 });
      expect(GRAPHICS_PRESETS.low).toEqual({ maxPixelRatio: 1.5, shadowsEnabled: false, weatherParticleScale: 0 });

      expect(normalizeGameSettings(null)).toEqual(DEFAULT_GAME_SETTINGS);
      expect(
        normalizeGameSettings({
          graphicsQuality: 'ultra',
          bgmVolume: -0.5,
          sfxVolume: 2.5,
          showDamagePopups: 'no',
          cameraLocked: 'yes',
        })
      ).toEqual({
        graphicsQuality: 'low',
        bgmVolume: 0,
        sfxVolume: 1,
        showDamagePopups: true,
        cameraLocked: false,
      });
      expect(normalizeGameSettings({ bgmVolume: Number.NaN, sfxVolume: Number.POSITIVE_INFINITY })).toEqual(
        DEFAULT_GAME_SETTINGS
      );
    });

    it('persists updates to storage, loads safely from corrupted JSON, and notifies subscribers', () => {
      const backing = new Map<string, string>();
      const fakeStorage = {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => {
          backing.set(k, v);
        },
        removeItem: (k: string) => {
          backing.delete(k);
        },
        clear: () => backing.clear(),
        key: () => null,
        length: 0,
      } as Storage;

      backing.set(SETTINGS_STORAGE_KEY, '{corrupted-json');
      const store = new GameSettings(fakeStorage);
      expect(store.get()).toEqual(DEFAULT_GAME_SETTINGS);

      const seen: string[] = [];
      const unsub = store.subscribe((next) =>
        seen.push(`${next.graphicsQuality}:${next.bgmVolume}:${next.showDamagePopups}:${next.cameraLocked}`)
      );
      store.update({ graphicsQuality: 'low', bgmVolume: 0.4, showDamagePopups: false, cameraLocked: true });
      expect(seen).toEqual(['low:0.4:false:true']);

      const reloaded = new GameSettings(fakeStorage);
      expect(reloaded.get()).toEqual({
        graphicsQuality: 'low',
        bgmVolume: 0.4,
        sfxVolume: 1,
        showDamagePopups: false,
        cameraLocked: true,
      });
      unsub();
    });
  });

  describe('AudioManager volume scaling', () => {
    it('clamps independent BGM/SFX volume scales to [0, 1] and preserves ad/portal mute precedence', () => {
      const mgr = new AudioManager();
      expect(mgr.getBgmVolumeScale()).toBe(1);
      expect(mgr.getSfxVolumeScale()).toBe(1);

      mgr.setBgmVolumeScale(0.5);
      mgr.setSfxVolumeScale(0.25);
      expect(mgr.getBgmVolumeScale()).toBe(0.5);
      expect(mgr.getSfxVolumeScale()).toBe(0.25);

      mgr.setBgmVolumeScale(-1);
      mgr.setSfxVolumeScale(3);
      expect(mgr.getBgmVolumeScale()).toBe(0);
      expect(mgr.getSfxVolumeScale()).toBe(1);

      mgr.setBgmVolumeScale(Number.NaN);
      expect(mgr.getBgmVolumeScale()).toBe(0);

      mgr.setAdMuted(true);
      mgr.setBgmVolumeScale(0.8);
      expect(mgr.getBgmVolumeScale()).toBe(0.8);
      expect(mgr.isEffectivelyMuted()).toBe(true);

      mgr.setAdMuted(false);
      mgr.setPortalMuted(true);
      mgr.setSfxVolumeScale(0.6);
      expect(mgr.getSfxVolumeScale()).toBe(0.6);
      expect(mgr.isEffectivelyMuted()).toBe(true);
    });
  });

  describe('SettingsModalUi & Damage Popups gate', () => {
    it('renders settings modal with graphics quality options, audio sliders, mute toggle, and damage popups toggle', () => {
      const store = new GameSettings(null);
      store.update({ graphicsQuality: 'medium', bgmVolume: 0.65, sfxVolume: 0.4, showDamagePopups: false });
      const ui = new SettingsModalUi(store, vi.fn(), vi.fn());
      const html = ui.renderModal();

      expect(html).toContain('data-modal-theme="settings"');
      expect(html).toContain('data-settings-quality="low"');
      expect(html).toContain('data-settings-quality="medium"');
      expect(html).toContain('data-settings-quality="high"');
      expect(html).toContain('data-settings-slider="bgm"');
      expect(html).toContain('65%');
      expect(html).toContain('data-settings-slider="sfx"');
      expect(html).toContain('40%');
      expect(html).toContain('data-settings-action="toggle-mute"');
      expect(html).toContain('data-settings-action="toggle-dmg-popups"');
      expect(html).toContain('OFF');
      expect(html).toContain('h-auto');
    });

    it('gates WorldOverlayHudUi.spawnDamagePopup on showDamagePopups setting', () => {
      const state = new GameState();
      const store = new GameSettings(null);
      const overlay = new WorldOverlayHudUi(
        state,
        () => ({ sceneMode: 'mine', activeModal: 'none', inspectedSlot: null }),
        vi.fn(),
        undefined,
        undefined,
        undefined,
        store
      );

      const children: unknown[] = [];
      const fakeDmgLayer = {
        get childElementCount() {
          return children.length;
        },
        get firstElementChild() {
          return children[0] ?? null;
        },
        appendChild: (el: unknown) => {
          children.push(el);
          return el;
        },
      };
      (overlay as unknown as { dmgLayerEl: unknown }).dmgLayerEl = fakeDmgLayer;

      const origDoc = globalThis.document;
      try {
        (globalThis as unknown as { document: unknown }).document = {
          createElement: () => ({
            className: '',
            style: {},
            textContent: '',
            addEventListener: vi.fn(),
            remove: vi.fn(),
          }),
        };

        store.update({ showDamagePopups: false });
        overlay.spawnDamagePopup(50, 100, 100, true);
        expect(children.length).toBe(0);

        store.update({ showDamagePopups: true });
        overlay.spawnDamagePopup(50, 100, 100, true);
        expect(children.length).toBe(1);
        expect((children[0] as { className: string }).className).toContain('mam-dmg-stroke');

        overlay.spawnDamagePopup(125, 100, 100, true, true);
        expect(children.length).toBe(2);
        const critHtml = (children[1] as { innerHTML?: string }).innerHTML ?? '';
        expect(critHtml).toContain('CRIT!');
        expect(critHtml).not.toContain('mam-pill-xs');
        expect(critHtml).not.toContain('<svg');
      } finally {
        (globalThis as unknown as { document: unknown }).document = origDoc;
      }
    });
  });

  describe('OfflineModalUi', () => {
    it('renders offline summary and gates 2x Watch Ad button on adsEnabled', () => {
      const state = new GameState();
      state.pendingOfflineEarnings = {
        elapsedSec: 7500,
        capped: false,
        returnRushEligible: true,
        worldId: 'underground',
        worldName: 'Underground',
        oresBroken: 420,
        cash: 12_500,
        gems: 95,
        bonusOres: { [ORES[0].id]: 40 },
        totalBonusOres: 40,
      };

      const uiNoAds = new OfflineModalUi(state, vi.fn(), vi.fn(), false);
      const htmlNoAds = uiNoAds.renderModal();
      expect(htmlNoAds).toContain('data-modal-theme="offline"');
      expect(htmlNoAds).toContain('data-offline-return-rush="true"');
      expect(htmlNoAds).toContain('Return Rush');
      expect(htmlNoAds).toContain('2h 05m');
      expect(htmlNoAds).toContain('data-offline-claim="1"');
      expect(htmlNoAds).not.toContain('data-offline-claim="2"');

      const uiWithAds = new OfflineModalUi(state, vi.fn(), vi.fn(), true);
      const htmlWithAds = uiWithAds.renderModal();
      expect(htmlWithAds).toContain('data-offline-claim="1"');
      expect(htmlWithAds).toContain('data-offline-claim="2"');
    });
  });

  describe('BountiesModalUi', () => {
    it('renders 3 active contracts with progress bars, completed count, and ready claim button', () => {
      const state = new GameState();
      state.bountiesCompleted = 4;
      state.bounties[0].progress = state.bounties[0].target;

      const ui = new BountiesModalUi(state, vi.fn(), vi.fn());
      const html = ui.renderModal();
      expect(html).toContain('data-modal-theme="bounties"');
      expect(html).toContain('Completed: 4');
      expect(html).toContain(`data-bounty-claim="${state.bounties[0].id}"`);
      expect(html).toContain('Claim');
      expect(html).toContain('In Progress');
    });
  });

  describe('Overclock HUD Gauge', () => {
    it('renders charging percentage and active overdrive countdown with buffs', () => {
      const chargingHtml = buildOverclockGaugeInnerHtml({
        active: false,
        chargePct: 64.2,
        remainingSec: 0,
        durationSec: 15,
      });
      expect(chargingHtml).toContain('OVERCLOCK');
      expect(chargingHtml).toContain('64%');

      const activeHtml = buildOverclockGaugeInnerHtml({
        active: true,
        chargePct: 80,
        remainingSec: 12.4,
        durationSec: 15,
      });
      expect(activeHtml).toContain('OVERCLOCK ACTIVE');
      expect(activeHtml).toContain('12.4s');
      expect(activeHtml).toContain('2x DMG');
      expect(activeHtml).toContain('mam-fever-shell is-active');
      expect(activeHtml).toContain('mam-fever-ticks');
      expect(activeHtml).not.toContain('mam-fever-emblem');
      expect(activeHtml).toContain('justify-center');

      const tier3GaugeHtml = buildOverclockGaugeInnerHtml({
        active: true,
        tier: 3,
        chargePct: 60,
        remainingSec: 21.5,
        durationSec: 25,
        encoreTotal: 5,
        encoreRemaining: 3,
        encoreCompleted: 2,
      });
      expect(tier3GaugeHtml).toContain('HYPER FEVER LV.3');
      expect(tier3GaugeHtml).toContain('mam-fever-shell is-active is-tier-3');
      expect(tier3GaugeHtml).toContain('ENCORE 3/5');
      expect(tier3GaugeHtml).toContain('3x DMG');
      expect(tier3GaugeHtml).toContain('3.5x TAP');
      expect(tier3GaugeHtml).toContain('+150% ORE');

      const feverFxHtml = renderFeverScreenFxHtml(true, 2);
      expect(feverFxHtml).not.toContain('mam-fever-rain');
      expect(feverFxHtml).not.toContain('mam-fever-drop');
      expect(feverFxHtml).toContain('mam-fever-speedlines');
      expect(feverFxHtml).toContain('mam-fever-cutin');
      expect(feverFxHtml).toContain('data-fever-tier="2"');
      expect(feverFxHtml).toContain('SUPER FEVER LV.2!');
      expect(feverFxHtml).not.toContain('mam-fever-burst-sub');

      const encoreFxHtml = renderFeverScreenFxHtml(true, 3, {
        remaining: 4,
        completed: 1,
        total: 5,
      });
      expect(encoreFxHtml).toContain('HYPER ENCORE!!');
      expect(encoreFxHtml).toContain('mam-fever-encore-pill is-visible');
      expect(encoreFxHtml).toContain('4/5');

      const cutinClasses = new Set<string>();
      const cutinEl = {
        innerHTML: '',
        offsetWidth: 0,
        dataset: {} as Record<string, string>,
        style: { setProperty: () => {} },
        classList: {
          add: (c: string) => cutinClasses.add(c),
          remove: (c: string) => cutinClasses.delete(c),
          contains: (c: string) => cutinClasses.has(c),
        },
      };
      const cutinHost = {
        querySelector: (sel: string) => (sel === '[data-fever-cutin="true"]' ? cutinEl : null),
      } as unknown as HTMLElement;
      triggerFeverUltCutInDom(cutinHost, {
        chibiId: 'yukikage-twins',
        name: 'Yukikage Twins',
        rarity: 'twin',
        accentColor: '#38bdf8',
        isEncore: true,
        encoreIndex: 2,
        encoreTotal: 5,
        tier: 3,
      });
      expect(cutinEl.innerHTML).toContain('mam-fever-cutin-plate');
      expect(cutinEl.innerHTML).toContain('ENCORE 2/5');
      expect(cutinEl.innerHTML).toContain('Yukikage Twins');
      expect(cutinEl.innerHTML).toContain('mam-rarity-badge mam-rarity-twin is-crest');
      expect(cutinEl.innerHTML).toContain('twin.svg');
      expect(cutinEl.classList.contains('is-showing')).toBe(true);

      triggerFeverUltCutInDom(cutinHost, {
        chibiId: 'abyssal-empress',
        name: 'Abyssal Empress',
        rarity: 'legendary',
        accentColor: '#f59e0b',
        isEncore: false,
        encoreIndex: 0,
        encoreTotal: 0,
        tier: 2,
      });
      expect(cutinEl.innerHTML).toContain('FEVER ULT!');
      expect(cutinEl.innerHTML).toContain('mam-rarity-badge mam-rarity-legendary');
      expect(cutinEl.innerHTML).toContain('mam-rarity-label');
      expect(cutinEl.innerHTML).toContain('Legendary');

      triggerFeverUltCutInDom(cutinHost, {
        chibiId: 'void-asura',
        name: 'Void Asura',
        rarity: 'anomaly',
        accentColor: '#e879f9',
        isEncore: false,
        encoreIndex: 0,
        encoreTotal: 0,
        tier: 3,
      });
      expect(cutinEl.innerHTML).toContain('HYPER ULT!');
      expect(cutinEl.innerHTML).toContain('mam-rarity-badge mam-rarity-anomaly is-crest');
      expect(cutinEl.innerHTML).toContain('anomaly.svg');
      expect(cutinEl.innerHTML).not.toContain('mam-rarity-common');

      const ocToast = renderToastBannerHtml('⚡ OVERCLOCK ACTIVE! 2x DMG');
      expect(ocToast).toContain('data-toast-tone="overclock"');
      expect(ocToast).not.toContain('⚡');

      const bountyToast = renderToastBannerHtml('Bounty Claimed: +40 Gems!');
      expect(bountyToast).toContain('data-toast-tone="bounty"');

      const errToast = renderToastBannerHtml('Chest is empty');
      expect(errToast).toContain('data-toast-tone="error"');
    });
  });

  describe('TutorialUi FTUE Overhaul', () => {
    it('maps steps across 5 stages, renders streamlined Cargo Pod / Tap-or-Hold copy, and grants reward once', () => {
      expect(getTutorialStageMeta('welcome')).toEqual({ stage: 1, total: 5, label: 'Mine' });
      expect(getTutorialStageMeta('mine-ore')).toEqual({ stage: 1, total: 5, label: 'Mine' });
      expect(getTutorialStageMeta('click-plot')).toEqual({ stage: 2, total: 5, label: 'Upgrade' });
      expect(getTutorialStageMeta('upgrade-dmg')).toEqual({ stage: 2, total: 5, label: 'Upgrade' });
      expect(getTutorialStageMeta('click-chest')).toEqual({ stage: 3, total: 5, label: 'Collect' });
      expect(getTutorialStageMeta('take-all-chest')).toEqual({ stage: 3, total: 5, label: 'Collect' });
      expect(getTutorialStageMeta('go-shop')).toEqual({ stage: 4, total: 5, label: 'Sell' });
      expect(getTutorialStageMeta('click-sell-shop')).toEqual({ stage: 4, total: 5, label: 'Sell' });
      expect(getTutorialStageMeta('select-ore-sell')).toEqual({ stage: 4, total: 5, label: 'Sell' });
      expect(getTutorialStageMeta('click-sell-btn')).toEqual({ stage: 4, total: 5, label: 'Sell' });
      expect(getTutorialStageMeta('congrats')).toEqual({ stage: 5, total: 5, label: 'Reward' });

      const welcomeHtml = buildTutorialCardHtml('welcome');
      expect(welcomeHtml).toContain('pose.webp');
      expect(welcomeHtml).toContain('data-tutorial-skip="true"');
      expect(welcomeHtml).toContain('Stage 1/5');
      expect(welcomeHtml).toContain('Cargo Pod');

      const mineHtml = buildTutorialCardHtml('mine-ore');
      expect(mineHtml.toLowerCase()).toContain('tap or hold');

      const plotHtml = buildTutorialCardHtml('click-plot');
      expect(plotHtml.toLowerCase()).toContain('auto-mines');

      const chestHtml = buildTutorialCardHtml('click-chest');
      expect(chestHtml).toContain('Cargo Pod (Chest)');

      const selectSellHtml = buildTutorialCardHtml('select-ore-sell');
      expect(selectSellHtml).toContain('Select All');

      const congratsHtml = buildTutorialCardHtml('congrats');
      expect(congratsHtml).toContain(`+${TUTORIAL_REWARD_GEMS}`);
      expect(congratsHtml).toContain(`+${TUTORIAL_REWARD_DICE}`);
      expect(congratsHtml).toContain('Claim &amp; Start Playing');

      const state = new GameState();
      const startGems = state.gems;
      const startDice = state.enchantDice;
      const reward = state.grantTutorialStarterReward();
      expect(reward).toEqual({ gems: TUTORIAL_REWARD_GEMS, dice: TUTORIAL_REWARD_DICE });
      expect(state.gems).toBe(startGems + TUTORIAL_REWARD_GEMS);
      expect(state.enchantDice).toBe(startDice + TUTORIAL_REWARD_DICE);
    });

    it('auto-closes after Upgrade/TakeAll/Sell, cancels pending timers on skip or manual close, and triggers wrong-click nudge', () => {
      vi.useFakeTimers();
      const origWin = globalThis.window;
      const origDoc = globalThis.document;
      const origStorage = globalThis.localStorage;
      try {
        const storage = new Map<string, string>();
        (globalThis as unknown as { localStorage: unknown }).localStorage = {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => void storage.set(k, v),
        };

        const docListeners = new Map<string, Array<(e: unknown) => void>>();
        const bodyDataset: Record<string, string | undefined> = {};
        const overlayCard = {
          attrs: new Map<string, string>(),
          setAttribute(k: string, v: string) {
            this.attrs.set(k, v);
          },
          removeAttribute(k: string) {
            this.attrs.delete(k);
          },
          getAttribute(k: string) {
            return this.attrs.get(k) ?? null;
          },
          addEventListener: vi.fn(),
        };
        const overlayHint = {
          textContent: '',
          attrs: new Map<string, string>(),
          setAttribute(k: string, v: string) {
            this.attrs.set(k, v);
          },
          removeAttribute(k: string) {
            this.attrs.delete(k);
          },
          getAttribute(k: string) {
            return this.attrs.get(k) ?? null;
          },
        };
        const overlayEl = {
          id: '',
          className: '',
          innerHTML: '',
          querySelector: (sel: string) => {
            if (sel === '[data-tutorial-card]') return overlayCard;
            if (sel === '[data-tutorial-hint]') return overlayHint;
            return null;
          },
          addEventListener: vi.fn(),
        };

        (globalThis as unknown as { window: unknown }).window = {
          location: { search: '' },
          requestAnimationFrame: (cb: () => void) => {
            cb();
            return 1;
          },
          setTimeout: (cb: () => void, ms: number) => setTimeout(cb, ms),
          clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
        };
        (globalThis as unknown as { document: unknown }).document = {
          body: {
            dataset: bodyDataset,
            appendChild: vi.fn(),
          },
          createElement: () => overlayEl,
          querySelectorAll: () => [],
          querySelector: () => null,
          addEventListener: (type: string, cb: (e: unknown) => void) => {
            const arr = docListeners.get(type) ?? [];
            arr.push(cb);
            docListeners.set(type, arr);
          },
        };

        const onClosePlotInspect = vi.fn();
        const onCloseModal = vi.fn();
        const onSetPitZoom = vi.fn();
        const onSetChestZoom = vi.fn();
        const onSetSellShopZoom = vi.fn();

        const tut = new TutorialUi(
          onSetPitZoom,
          onSetChestZoom,
          onSetSellShopZoom,
          undefined,
          undefined,
          { onClosePlotInspect, onCloseModal }
        );
        tut.mount();
        expect(bodyDataset.tutorialActive).toBe('true');
        expect(bodyDataset.tutorialStep).toBe('welcome');

        tut.advance();
        expect(bodyDataset.tutorialStep).toBe('mine-ore');
        tut.notifyOreBroken();
        expect(bodyDataset.tutorialStep).toBe('click-plot');
        tut.syncView('mine', 'none', 0);
        expect(bodyDataset.tutorialStep).toBe('upgrade-dmg');

        // Upgrade triggers delayed auto-close and advances to click-chest
        tut.notifyUpgraded();
        expect(onClosePlotInspect).not.toHaveBeenCalled();
        vi.advanceTimersByTime(TUTORIAL_AUTO_CLOSE_DELAY_MS);
        expect(onClosePlotInspect).toHaveBeenCalledTimes(1);
        expect(bodyDataset.tutorialStep as TutorialStep).toBe('click-chest');
        expect(onSetChestZoom).toHaveBeenLastCalledWith(true);

        // Wrong-click outside allowed targets triggers nudge & hint, then clears after 1200ms
        const clickGuards = docListeners.get('click') ?? [];
        expect(clickGuards.length).toBeGreaterThan(0);
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();
        const stopImmediatePropagation = vi.fn();
        clickGuards[0]({
          target: { closest: () => null },
          preventDefault,
          stopPropagation,
          stopImmediatePropagation,
        });
        expect(preventDefault).toHaveBeenCalled();
        expect(overlayCard.getAttribute('data-tutorial-nudge')).toBe('true');
        expect(overlayHint.getAttribute('data-nudge-hint')).toBe('true');
        expect(overlayHint.textContent).toBe('Follow the glowing arrow!');
        vi.advanceTimersByTime(1250);
        expect(overlayCard.getAttribute('data-tutorial-nudge')).toBeNull();
        expect(overlayHint.getAttribute('data-nudge-hint')).toBeNull();

        // Multi-selector allows open-sell-shop on click-sell-shop
        tut.syncView('mine', 'chest', null);
        expect(bodyDataset.tutorialStep).toBe('take-all-chest');
        tut.notifyChestTaken();
        // Manual close before timer fires advances immediately without double-firing onCloseModal
        tut.syncView('mine', 'none', null);
        expect(bodyDataset.tutorialStep).toBe('go-shop');
        vi.advanceTimersByTime(TUTORIAL_AUTO_CLOSE_DELAY_MS);
        expect(onCloseModal).not.toHaveBeenCalled();

        tut.syncView('shop', 'none', null);
        expect(bodyDataset.tutorialStep).toBe('click-sell-shop');
        const sellPrevent = vi.fn();
        clickGuards[0]({
          target: {
            closest: (sel: string) =>
              sel.includes('[data-action="open-sell-shop"]') ? {} : null,
          },
          preventDefault: sellPrevent,
          stopPropagation: vi.fn(),
          stopImmediatePropagation: vi.fn(),
        });
        expect(sellPrevent).not.toHaveBeenCalled();

        // Skip cancels pending auto-close timer and clears body dataset
        tut.syncView('shop', 'sell-shop', null);
        tut.notifySellOreSelected();
        expect(bodyDataset.tutorialStep).toBe('click-sell-btn');
        tut.notifySellCompleted();
        tut.skip();
        vi.advanceTimersByTime(TUTORIAL_AUTO_CLOSE_DELAY_MS + 100);
        expect(onCloseModal).not.toHaveBeenCalled();
        expect(tut.isActive()).toBe(false);
        expect(bodyDataset.tutorialActive).toBeUndefined();
        expect(bodyDataset.tutorialStep).toBeUndefined();
      } finally {
        vi.useRealTimers();
        (globalThis as unknown as { window: unknown }).window = origWin;
        (globalThis as unknown as { document: unknown }).document = origDoc;
        (globalThis as unknown as { localStorage: unknown }).localStorage = origStorage;
      }
    });

    it('advances sell-select-all tutorial step only when at least one sell card is selected', () => {
      const emptyRoot = {
        querySelectorAll: (sel: string) => (sel === '[data-sell-key].is-selected' ? [] : []),
      } as unknown as ParentNode;
      expect(shouldAdvanceTutorialOnSellSelectAll(emptyRoot)).toBe(false);

      const selectedRoot = {
        querySelectorAll: (sel: string) =>
          sel === '[data-sell-key].is-selected' ? ([{}] as unknown as NodeListOf<Element>) : [],
      } as unknown as ParentNode;
      expect(shouldAdvanceTutorialOnSellSelectAll(selectedRoot)).toBe(true);
    });

    it('defines spotlight HUD dimming, step exemptions, and wrong-click nudge keyframes in hud-widgets.css', () => {
      const css = readFileSync(resolve(process.cwd(), 'src/styles/hud-widgets.css'), 'utf8');
      expect(css).toContain('body[data-tutorial-active="true"]');
      expect(css).toContain('body[data-tutorial-step="click-chest"] [data-action="open-chest"]');
      expect(css).toContain('body[data-tutorial-step="go-shop"] [data-action="shops-pill"]');
      expect(css).toContain('body[data-tutorial-step="click-sell-shop"] [data-action="open-sell-shop"]');
      expect(css).toContain('@keyframes mamTutNudge');
      expect(css).toContain('[data-tutorial-nudge="true"]');
      expect(css).toContain('.mam-tut-card-enter');
      expect(css).toContain('animation: mamTutNudge 0.36s ease-in-out !important');
      expect(css).toContain('color: #dc2626 !important');
    });

    it('guards 3D targets and keyboard shortcuts during active tutorial without soft-locking unintended modals', () => {
      const origWin = globalThis.window;
      const origDoc = globalThis.document;
      const origStorage = globalThis.localStorage;
      try {
        (globalThis as unknown as { localStorage: unknown }).localStorage = {
          getItem: () => null,
          setItem: vi.fn(),
        };
        const overlayEl = {
          id: '',
          className: '',
          innerHTML: '',
          querySelector: () => null,
          addEventListener: vi.fn(),
        };
        (globalThis as unknown as { window: unknown }).window = {
          location: { search: '' },
          requestAnimationFrame: (cb: () => void) => {
            cb();
            return 1;
          },
        };
        (globalThis as unknown as { document: unknown }).document = {
          body: { dataset: {}, appendChild: vi.fn() },
          createElement: () => overlayEl,
          querySelectorAll: () => [],
          querySelector: () => null,
          addEventListener: vi.fn(),
        };

        const tut = new TutorialUi(vi.fn(), vi.fn(), vi.fn());
        tut.mount();
        tut.advance(); // mine-ore
        expect(tut.canInteractWith3DTarget('chest')).toBe(false);
        expect(tut.canInteractWith3DTarget('plot', 0)).toBe(false);

        tut.notifyOreBroken(); // click-plot
        expect(tut.canInteractWith3DTarget('plot', 0)).toBe(true);
        expect(tut.canInteractWith3DTarget('plot', 1)).toBe(false);
        expect(tut.canInteractWith3DTarget('chest')).toBe(false);

        tut.syncView('mine', 'none', 0); // upgrade-dmg
        tut.syncView('mine', 'none', null); // stays upgrade-dmg if not upgraded
        tut.notifyUpgraded();
        // Fast-forward manually to click-chest via complete/skip check on shop-station
        tut.skip();
        expect(tut.canInteractWith3DTarget('plot', 1)).toBe(true);
        expect(tut.canInteractWith3DTarget('shop-station', 'pickaxe')).toBe(true);

        // Fresh tutorial at click-sell-shop only allows 'sell' station
        const tut2 = new TutorialUi(vi.fn(), vi.fn(), vi.fn());
        tut2.mount();
        tut2.advance(); // mine-ore
        tut2.notifyOreBroken(); // click-plot
        tut2.syncView('mine', 'none', 0); // upgrade-dmg
        vi.useFakeTimers();
        tut2.notifyUpgraded();
        vi.advanceTimersByTime(TUTORIAL_AUTO_CLOSE_DELAY_MS); // click-chest
        expect(tut2.canInteractWith3DTarget('chest')).toBe(true);
        tut2.syncView('mine', 'chest', null); // take-all-chest
        tut2.notifyChestTaken();
        vi.advanceTimersByTime(TUTORIAL_AUTO_CLOSE_DELAY_MS); // go-shop
        tut2.syncView('shop', 'none', null); // click-sell-shop
        expect(tut2.canInteractWith3DTarget('shop-station', 'sell')).toBe(true);
        expect(tut2.canInteractWith3DTarget('shop-station', 'pickaxe')).toBe(false);
        expect(tut2.canInteractWith3DTarget('shop-station', 'tower')).toBe(false);

        expect(shouldIgnoreHudShortcutDuringTutorial(true, 'Escape')).toBe(true);
        expect(shouldIgnoreHudShortcutDuringTutorial(true, '`')).toBe(true);
        expect(shouldIgnoreHudShortcutDuringTutorial(true, '1')).toBe(true);
        expect(shouldIgnoreHudShortcutDuringTutorial(false, 'Escape')).toBe(false);
      } finally {
        vi.useRealTimers();
        (globalThis as unknown as { window: unknown }).window = origWin;
        (globalThis as unknown as { document: unknown }).document = origDoc;
        (globalThis as unknown as { localStorage: unknown }).localStorage = origStorage;
      }
    });
  });

  describe('DailyLoginModalUi Layout', () => {
    it('isolates the 7-day grid inside a scrollable flex container so Day 7 never covers the pinned Claim CTA', () => {
      const state = new GameState();
      const ui = new DailyLoginModalUi(state);
      const html = ui.renderModal();

      expect(html).toContain('DAY 7 • APEX FINALE');
      expect(html).toContain('!flex-row');
      expect(html).toContain('overflow-y-auto overscroll-contain');

      const scrollIdx = html.indexOf('overflow-y-auto overscroll-contain');
      const day7Idx = html.indexOf('DAY 7 • APEX FINALE');
      const claimWrapperIdx = html.indexOf('shrink-0 pt-0.5 relative z-10');
      const claimBtnIdx = html.indexOf('data-action="claim-daily-login"');

      expect(scrollIdx).toBeGreaterThan(-1);
      expect(day7Idx).toBeGreaterThan(scrollIdx);
      expect(claimWrapperIdx).toBeGreaterThan(day7Idx);
      expect(claimBtnIdx).toBeGreaterThan(claimWrapperIdx);
    });
  });

  describe('Mobile Backdrop Ghost-Click Guard', () => {
    it('blocks synthesized canvas-to-backdrop ghost clicks and rapid reopen clicks, while allowing genuine backdrop dismiss', () => {
      expect(
        shouldDismissModalBackdrop({
          pointerDownOnSelf: false,
          openedAtMs: 1000,
          nowMs: 1400,
        })
      ).toBe(false);

      expect(
        shouldDismissModalBackdrop({
          pointerDownOnSelf: true,
          openedAtMs: 1000,
          nowMs: 1050,
        })
      ).toBe(false);

      expect(
        shouldDismissModalBackdrop({
          pointerDownOnSelf: true,
          openedAtMs: 1000,
          nowMs: 1200,
        })
      ).toBe(true);
    });
  });

  describe('Meteor HP Bar & Label Overlay', () => {
    it('renders solid cyber meteor plaque without Tailwind double-translate classes', () => {
      const html = buildMineOreBarsHtml([
        {
          id: 999,
          x: 400,
          y: 300,
          hp: 25000,
          maxHp: 50000,
          variantKey: 'geode',
          isMeteor: true,
          meteorWeatherId: 'celestial',
        },
      ]);
      expect(html).toContain('data-ore-bar="999"');
      expect(html).toContain('Celestial');
      expect(html).toContain('Meteor');
      expect(html).toContain('data-ore-fill="true"');
      expect(html).toContain('data-ore-text="true"');
      expect(html).not.toContain('-translate-y-full');
      expect(html).not.toContain('-translate-x-1/2');
    });
  });

  describe('Enchant Buff Hover Inspector', () => {
    it('renders solid DMG buff multiplier, mining speed, ore drop, sell value, roll rate, and owned/status state', () => {
      const spellbound = ENCHANTS.find((e) => e.id === 'spellbound')!;
      const altarCardHtml = buildEnchantHoverCardHtml(spellbound, { owned: 2 });
      expect(altarCardHtml).toContain('data-enchant-hover-card="spellbound"');
      expect(altarCardHtml).toContain('Spellbound');
      expect(altarCardHtml).toContain('14x (+1,300%)');
      expect(altarCardHtml).toContain('+85%');
      expect(altarCardHtml).toContain('+120%');
      expect(altarCardHtml).toContain('+150%');
      expect(altarCardHtml).toContain('0.01%');
      expect(altarCardHtml).toContain('Owned');
      expect(altarCardHtml).toContain('x2');

      const thundering = ENCHANTS.find((e) => e.id === 'thundering')!;
      const plotCardHtml = buildEnchantHoverCardHtml(thundering, {
        owned: 1,
        spare: 0,
        equipped: true,
      });
      expect(plotCardHtml).toContain('3.2x (+220%)');
      expect(plotCardHtml).toContain('+32%');
      expect(plotCardHtml).toContain('+40%');
      expect(plotCardHtml).toContain('+45%');
      expect(plotCardHtml).toContain('2%');
      expect(plotCardHtml).toContain('Status');
      expect(plotCardHtml).toContain('Equipped');
    });
  });

  describe('Auto-Roll Mutation Guard', () => {
    it('stops auto-rolling on Frozen+ mutations or insufficient Gems and continues otherwise', () => {
      expect(shouldStopAutoMutationRoll({ mutationId: 'normal', gems: 100, cost: 20 })).toBeNull();
      expect(shouldStopAutoMutationRoll({ mutationId: 'golden', gems: 100, cost: 20 })).toBeNull();
      expect(shouldStopAutoMutationRoll({ mutationId: 'frozen', gems: 100, cost: 20 })).toBe('high-tier');
      expect(shouldStopAutoMutationRoll({ mutationId: 'unreal', gems: 100, cost: 20 })).toBe('high-tier');
      expect(shouldStopAutoMutationRoll({ mutationId: 'normal', gems: 10, cost: 20 })).toBe('no-gems');
    });
  });

  describe('Rarity Badge Labels (Common through Limited)', () => {
    it('wraps label text in .mam-rarity-label for animated gradient styling across all 11 tiers', () => {
      for (const tier of [
        'common',
        'uncommon',
        'rare',
        'epic',
        'legendary',
        'rainbow',
        'mythic',
        'exotic',
        'secret',
        'fusion',
        'limited',
      ] as const) {
        const html = renderRarityBadgeHtml(tier);
        expect(html).toContain(`mam-rarity-${tier}`);
        expect(html).toContain('<span class="mam-rarity-label">');
      }
      expect(renderRarityBadgeHtml('common')).toContain('Common');
      expect(renderRarityBadgeHtml('mythic')).toContain('Mythic');
      expect(renderRarityBadgeHtml('exotic')).toContain('Exotic');
      expect(renderRarityBadgeHtml('secret')).toContain('SECRET');
      expect(renderRarityBadgeHtml('fusion')).toContain('FUSION');
      expect(renderRarityBadgeHtml('limited')).toContain('LIMITED');

      for (const crestTier of ['twin'] as const) {
        const html = renderRarityBadgeHtml(crestTier);
        expect(html).toContain(`mam-rarity-${crestTier}`);
        expect(html).toContain('is-crest');
        expect(html).toContain('mam-rarity-label');
        expect(html).toContain(crestTier.toUpperCase());
      }
    });

    it('wraps label text in .mam-mut-label for animated gradient styling across all 9 mutations', () => {
      for (const mut of [
        ['normal', 'Normal'],
        ['bronze', 'Bronze'],
        ['diamond', 'Diamond'],
        ['platinum', 'Platinum'],
        ['rainbow', 'Rainbow'],
        ['frozen', 'Frozen'],
        ['inferno', 'Inferno'],
        ['nightmare', 'Nightmare'],
        ['unreal', 'Unreal'],
      ] as const) {
        const html = renderMutationBadgeHtml(mut[0], mut[1]);
        expect(html).toContain(`mam-mut-${mut[0]}`);
        expect(html).toContain(`<span class="mam-mut-label">${mut[1]}</span>`);
      }
    });
  });

  describe('World Teleport Synergy Info & Badges', () => {
    it('renders the small info (i) button in World Teleport modal and +Sell% on World Synergy badges', () => {
      const state = new GameState();
      const ui = new UpgradesWorldsUi(
        state,
        () => {},
        () => {},
        () => {}
      );
      const modalHtml = ui.renderWorldsModal();
      expect(modalHtml).toContain('data-action="worlds-synergy-info"');
      expect(modalHtml).toContain('Combo Synergy');

      state.miners['solar-striker'] = 1;
      state.hotbar[0] = 'solar-striker';
      state.selectedHotbarSlot = 0;
      state.placeSelectedOnPlot(1);
      const badgeHtml = buildWorldSynergyBadgesHtml(state);
      expect(badgeHtml).toContain('+15% DMG');
      expect(badgeHtml).toContain('+5% Ore');
      expect(badgeHtml).toContain('+8% Sell');
    });
  });

  describe('Pickaxe Tap Combo Helper', () => {
    it('increments combo within window, resets after expiry, and escalates visual tiers', () => {
      let s = stepTapCombo({ count: 0, lastTapAtMs: 0 }, 1000);
      expect(s.count).toBe(1);
      s = stepTapCombo(s, 1200);
      expect(s.count).toBe(2);
      expect(getTapComboTier(s.count)).toEqual({ id: 'cool', badgeText: 'COMBO' });
      expect(getTapComboTier(10)).toEqual({ id: 'super', badgeText: 'SUPER!' });
      expect(getTapComboTier(25)).toEqual({ id: 'hyper', badgeText: 'HYPER!' });
      expect(getTapComboTier(50)).toEqual({ id: 'overdrive', badgeText: 'OVERDRIVE!' });
      expect(getTapComboTier(100)).toEqual({ id: 'godlike', badgeText: 'GODLIKE!' });

      const expired = stepTapCombo(s, 1200 + TAP_COMBO_WINDOW_MS + 1);
      expect(expired.count).toBe(1);
    });
  });

  describe('Achievements Modal Grid Anti-Squish', () => {
    it('prevents achievement cards from vertical compression inside short iframe viewports', () => {
      const state = new GameState();
      const ui = new AchievementsModalUi(
        state,
        () => {},
        () => {}
      );
      const html = ui.renderModal();
      expect(html).toContain('content-start');
      expect(html).toContain('auto-rows-max');
      expect(html).toContain('min-h-max');
    });
  });

  describe('Dopamine Polish Suite (Musical Scale, Holo Foil + MAXED, Return Rush Pill, Loot Vacuum)', () => {
    it('maps combo steps along the ascending major scale (do -> DO!) and plans 3-6 vacuum orbs', () => {
      expect(MUSICAL_SCALE_SEMITONES).toHaveLength(8);
      expect(getMusicalScaleRate(0)).toBe(1);
      expect(getMusicalScaleRate(7)).toBe(2);
      for (let i = 1; i < 8; i++) {
        expect(getMusicalScaleRate(i)).toBeGreaterThan(getMusicalScaleRate(i - 1));
      }
      expect(getMusicalScaleRate(8)).toBe(1);

      expect(getLootVacuumBurstPlan('ore').length).toBeGreaterThanOrEqual(3);
      expect(getLootVacuumBurstPlan('meteor').length).toBeLessThanOrEqual(6);
      expect(getLootVacuumBurstPlan('crystal_surge')).toContain('gem');
      expect(getLootVacuumBurstPlan('crystal_surge')).toContain('fever');
    });

    it('renders is-holo-foil on 5★ / Fusion / Limited cards and MAXED stamp when an Index tab reaches 100%', () => {
      const state = new GameState();
      state.miners['astral-recruit'] = 1;
      state.chibiStars['astral-recruit'] = 5;
      state.miners['cosmic-monarch'] = 1;
      state.discovered.add('cosmic-monarch');

      const invUi = new InventoryModalUi(state, () => {});
      const invHtml = invUi.renderModal();
      expect(invHtml).toContain('is-holo-foil');

      // Unlock all Underground entries to trigger 100% MAXED stamp
      for (const id of getIndexTabEntryIds('underground')) {
        state.discovered.add(id);
      }
      const idxUi = new IndexModalUi(state, () => {});
      const idxHtml = idxUi.renderModal();
      expect(idxHtml).toContain('data-index-sidebar="true"');
      expect(idxHtml).toContain('Worlds (W1–W8)');
      expect(idxHtml).toContain('Special Tiers');
      expect(idxHtml).toContain('data-index-world="twin"');
      expect(idxHtml).toContain('data-index-maxed-stamp="true"');
      expect(idxHtml).toContain('MAXED 100%');
      expect(idxHtml).toContain('is-holo-foil');
      expect(idxHtml).toContain('★5');

      // Switch to Twin Index tab & verify Twin Duo cards + inspector
      state.discovered.add('yukikage-twins');
      (idxUi as unknown as { indexWorldId: string }).indexWorldId = 'twin';
      const twinIdxHtml = idxUi.renderModal();
      expect(twinIdxHtml).toContain('Yukikage Twins');
      expect(twinIdxHtml).toContain('Halcyon Twins');
      expect(twinIdxHtml).toContain('Nocturne Twins');
      expect(twinIdxHtml).toContain('Lullaby Twins');
      expect(twinIdxHtml).toContain('Clockwork Twins');
      expect(twinIdxHtml).toContain('Paradox Twins');
      expect(twinIdxHtml).toContain('Spire Shop Duo');
      expect(twinIdxHtml).toContain('is-holo-foil');
    });

    it('renders active Return Rush pill with timer in Active Potions dock', () => {
      const state = new GameState();
      const now = 1_000_000;
      state.activeBoosts['return-rush'] = now + 450_000;
      const dock = buildActivePotionsDockContent(state, now);
      expect(dock.empty).toBe(false);
      expect(dock.single).toBe(true);
      expect(dock.html).toContain('data-hud-pot="return-rush"');
      expect(dock.html).toContain('7:30');
    });

    it('renders Tower Hub Near-Miss summary + Retry button, Dice Pity bar, and Arena Streak/Reroll HUD', () => {
      const state = new GameState();
      state.towerDicePity = 3;
      state.towerLastSummary = {
        startFloor: 5,
        highestReached: 6,
        highestWave: 10,
        floorsCleared: 1,
        wavesCleared: 19,
        gemsEarned: 240,
        diceEarned: 1,
        newRecord: true,
        reason: 'timeout',
        remainingHpPct: 8,
        wasBossWave: true,
        bestStreakMult: 1.25,
      };

      const towerUi = new TowerUi(
        state,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {}
      );
      const hubHtml = towerUi.renderTowerHubModal();
      expect(hubHtml).toContain('SO CLOSE!');
      expect(hubHtml).toContain('8% HP left');
      expect(hubHtml).toContain('data-action="tower-retry-run"');
      expect(hubHtml).toContain('Retry Floor 1');
      expect(hubHtml).not.toContain('data-tower-cp');
      expect(hubHtml).toContain('GUARANTEED!');
      expect(hubHtml).toContain('Spire Campaign (W1–W8)');
      expect(hubHtml).toContain('F71-80');

      state.startTowerRun(1);
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossChibiId = 'clockwork-twins';
      state.towerRun!.bossInvulLeft = 3.5;
      state.towerRun!.pendingBlessings = null;
      const arenaHtml = towerUi.renderTowerArenaHud('<div></div>', '');
      expect(arenaHtml).toContain('TAP RING!');
      expect(arenaHtml).toContain('CLOCKWORK TWINS • TWIN BOSS');
      expect(arenaHtml).toContain('/chibi/clockwork-twins/');
      expect(arenaHtml).toContain('data-tower-streak="true"');
      expect(arenaHtml).toContain('data-tower-pity="true"');
      expect(arenaHtml).toContain('FL 1/80');
      expect(arenaHtml).toContain('W1 THE UNDERGROUND');

      // Show Reroll button when pendingBlessings active
      state.towerRun!.pendingBlessings = [
        { id: 'astral-surge', name: 'Astral Surge', desc: '+35% DPS', color: '#38bdf8', tag: 'DPS', rarity: 'core' },
      ];
      const blessingHtml = towerUi.renderTowerArenaHud('<div></div>', '');
      expect(blessingHtml).toContain('data-action="tower-reroll-blessings"');
      expect(blessingHtml).toContain('FREE • 1');

      // Victory Tamat banner at Floor 80
      state.towerBestFloor = 80;
      state.towerLastSummary = {
        startFloor: 80,
        highestReached: 80,
        highestWave: 10,
        floorsCleared: 1,
        wavesCleared: 10,
        gemsEarned: 15000,
        diceEarned: 15,
        newRecord: true,
        reason: 'victory',
      };
      const victoryHtml = towerUi.renderTowerHubModal();
      expect(victoryHtml).toContain('SPIRE CONQUERED');
      expect(victoryHtml).toContain('80/80 TAMAT!');
    });
  });

  describe('Plaza & Premium Shop HUD Routing', () => {
    it('routes shops-pill to Plaza scene and open-shop to empty Premium Shop modal', () => {
      const state = new GameState();
      state.towerCoins = 12;
      const toggleModal = vi.fn();
      const setSceneMode = vi.fn();
      const shopUi = new ShopModalsUi(state, () => {});
      const actions = buildHudCoordinatorActions({
        root: {} as HTMLElement,
        state,
        shopUi,
        inventoryUi: {} as never,
        upgradesUi: {} as never,
        getActiveModal: () => 'none',
        openModal: vi.fn(),
        toggleModal,
        setSceneMode,
        pushToast: vi.fn(),
        render: vi.fn(),
      });

      actions['shops-pill']();
      expect(setSceneMode).toHaveBeenCalledWith('shop');

      actions['open-shop']();
      expect(toggleModal).toHaveBeenCalledWith('premium-shop');

      const premiumShopHtml = shopUi.renderPremiumShopModal();
      expect(premiumShopHtml).toContain('data-modal-theme="premium-shop"');
      expect(premiumShopHtml).toContain('data-premium-shop="true"');
      expect(premiumShopHtml).toContain('data-premium-shop-coins="true">12<');
      expect(premiumShopHtml).toContain('Yukikage Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="yukikage-twins"');
      expect(premiumShopHtml).toContain('Halcyon Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="halcyon-twins"');
      expect(premiumShopHtml).toContain('Nocturne Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="nocturne-twins"');
      expect(premiumShopHtml).toContain('Lullaby Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="lullaby-twins"');
      expect(premiumShopHtml).toContain('Clockwork Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="clockwork-twins"');
      expect(premiumShopHtml).toContain('Paradox Twins');
      expect(premiumShopHtml).toContain('data-buy-premium-item="paradox-twins"');
      expect(premiumShopHtml).toContain('mam-rarity-twin');

      const towerUi = new TowerUi(state, () => {}, () => {}, () => {}, () => {}, () => {});
      state.towerLastSummary = {
        startFloor: 1,
        highestReached: 2,
        highestWave: 4,
        floorsCleared: 1,
        wavesCleared: 13,
        gemsEarned: 150,
        diceEarned: 1,
        coinsEarned: 6,
        twinsEarned: ['yukikage-twins'],
        newRecord: true,
        reason: 'exit',
      };
      const hubHtml = towerUi.renderTowerHubModal();
      expect(hubHtml).toContain('data-tower-coins-pill="true"');
      expect(hubHtml).toContain('+6 Spire Coins');
      expect(hubHtml).toContain('Twin Shop →');
      expect(hubHtml).toContain('data-action="tower-open-twin-shop"');
      expect(hubHtml).toContain('JACKPOT 0.01% TWIN DROP!');
      expect(hubHtml).toContain('Yukikage Twins');
      expect(hubHtml).toContain('/worlds/underground.webp');
      expect(hubHtml).toContain('Jackpot TWIN Chibi');
      expect(hubHtml).toContain('data-tower-right-tab="drops"');
      expect(hubHtml).toContain('data-tower-right-tab="milestones"');

      state.startTowerRun(1);
      state.towerRun!.coinsEarned = 5;
      const arenaHtml = towerUi.renderTowerArenaHud('<div></div>', '');
      expect(arenaHtml).toContain('data-tower-run-coins="true">+5<');

      const goShopCard = buildTutorialCardHtml('go-shop');
      expect(goShopCard).toContain('Click Plaza at the top');
    });
  });

  describe('Tower Arena Single-Row Blessing Dock, Popover & Pick Ownership Preview', () => {
    it('keeps battle dock single-row with summary pill + run buff pills, toggles grouped popover, and shows Owned/NEW previews on pick cards', () => {
      const state = new GameState();
      state.startTowerRun(1);
      const astral = TOWER_BLESSINGS.find((b) => b.id === 'astral-surge')!;
      const gemMagnet = TOWER_BLESSINGS.find((b) => b.id === 'gem-magnet')!;
      const chainSpark = TOWER_BLESSINGS.find((b) => b.id === 'chain-spark')!;
      const bossSlayer = TOWER_BLESSINGS.find((b) => b.id === 'boss-slayer')!;

      // Simulate a deep floor run with stacked blessings
      state.towerRun!.blessings = [
        ...Array.from({ length: 7 }, () => astral), // +245% DPS
        ...Array.from({ length: 6 }, () => gemMagnet), // +180% Gems
        chainSpark, // 1/2 Chain Spark
      ];

      const arenaUi = new TowerArenaHudUi(state, () => {}, () => {}, () => {}, () => {});
      const closedHtml = arenaUi.renderTowerArenaHud('<div></div>', '');
      expect(closedHtml).toContain('data-tower-blessing-bar="true"');
      expect(closedHtml).toContain('flex-nowrap');
      expect(closedHtml).toContain('data-action="tower-toggle-blessings"');
      expect(closedHtml).toContain('✦ 14 Blessings');
      expect(closedHtml).toContain('(3 Types)');
      expect(closedHtml).toContain('+245% DPS');
      expect(closedHtml).toContain('+180% Gems');
      expect(closedHtml).toContain('Chain 2');
      expect(closedHtml).not.toContain('data-tower-blessings-popover="true"');

      // Open popover -> shows grouped stack rows with distinct icons without duplicating individual pills
      arenaUi.setBlessingsPopoverOpen(true);
      const openHtml = arenaUi.renderTowerArenaHud('<div></div>', '');
      expect(openHtml).toContain('data-tower-blessings-popover="true"');
      expect(openHtml).toContain('data-popover-blessing-row="astral-surge"');
      expect(openHtml).toContain('data-blessing-icon="astral-surge"');
      expect(openHtml).toContain('×7');
      expect(openHtml).toContain('data-popover-blessing-row="gem-magnet"');
      expect(openHtml).toContain('data-blessing-icon="gem-magnet"');
      expect(openHtml).toContain('×6');
      expect(openHtml).toContain('data-popover-blessing-row="chain-spark"');
      expect(openHtml).toContain('data-blessing-icon="chain-spark"');
      expect(openHtml).toContain('×1/2');

      // Every single Spire Blessing has its own unique SVG artwork
      const iconBodies = new Set(
        TOWER_BLESSINGS.map((b) =>
          towerBlessingIconHtml(b.id, 24).replace(/data-blessing-icon="[^"]+"/, '')
        )
      );
      expect(iconBodies.size).toBe(TOWER_BLESSINGS.length);

      // Pending blessing pick modal -> shows Owned ×6 → ×7, MAX on Chain Spark, NEW! on Seraphim Bane, plus before->after previews & unique icons
      state.towerRun!.pendingBlessings = [gemMagnet, chainSpark, bossSlayer];
      const pickHtml = arenaUi.renderTowerArenaHud('<div></div>', '');
      expect(pickHtml).toContain('data-blessing-icon="gem-magnet"');
      expect(pickHtml).toContain('data-blessing-icon="chain-spark"');
      expect(pickHtml).toContain('data-blessing-icon="boss-slayer"');
      expect(pickHtml).toContain('Owned ×6 → ×7');
      expect(pickHtml).toContain('Gems +180% → +210%');
      expect(pickHtml).toContain('Owned ×1 → ×2 MAX');
      expect(pickHtml).toContain('Chain 2 → 4 Ores');
      expect(pickHtml).toContain('NEW!');
      expect(pickHtml).toContain('Boss DMG +0% → +55%');
      // Overflow test: when > 5 distinct buff stats exist, inline bar caps at 5 + "+N more" button (zero edge clipping)
      state.towerRun!.blessings = [...TOWER_BLESSINGS];
      state.towerRun!.pendingBlessings = null;
      arenaUi.setBlessingsPopoverOpen(false);
      const overflowClosedHtml = arenaUi.renderTowerArenaHud('<div></div>', '');
      const inlinePillMatches = overflowClosedHtml.match(/data-tower-buff-pill="/g) ?? [];
      expect(inlinePillMatches).toHaveLength(5);
      expect(overflowClosedHtml).toContain('data-tower-buffs-more="true"');
      expect(overflowClosedHtml).toContain('+5 more');

      arenaUi.setBlessingsPopoverOpen(true);
      const overflowOpenHtml = arenaUi.renderTowerArenaHud('<div></div>', '');
      expect(overflowOpenHtml).toContain('data-popover-all-buffs="true"');
      expect(overflowOpenHtml).toContain('Echo 28%');
      expect(overflowOpenHtml).toContain('+18% Dice');
    });
  });

  describe('OmegaBossModalUi, OmegaArenaHudUi & Omega Index Tab', () => {
    it('renders Omega Index tab, crest badge, Boss Hub Tier I–V drop percentages, and Omega Arena HUD', () => {
      const state = new GameState();
      expect(getIndexTabEntryIds('omega')).toEqual([
        'crimson-ronin',
        'obsidian-sovereign',
        'abyssal-leviathan',
      ]);
      expect(renderRarityBadgeHtml('omega')).toContain('/badges/omega.svg');
      expect(rarityCardClasses('omega')).toContain('rarity-omega');

      const hubUi = new OmegaBossModalUi(
        state,
        () => {},
        () => {},
        () => {}
      );
      const hubHtml = hubUi.renderOmegaModal();
      expect(hubHtml).toContain('Omega Duel Sanctum');
      expect(hubHtml).toContain('data-modal-theme="omega-boss"');
      expect(hubHtml).toContain('Crimson Ronin');
      expect(hubHtml).toContain('Obsidian Sovereign');
      expect(hubHtml).toContain('Abyssal Leviathan');
      expect(hubHtml).toContain('HP 20Sp');
      expect(hubHtml).toContain('HP 2Oc');
      expect(hubHtml).toContain('HP 200Oc');
      expect(hubHtml).toContain('10% • 1 Core');
      expect(hubHtml).toContain('32.5% • 1–2 Cores');
      expect(hubHtml).toContain('50% • 2–3 Cores');
      expect(hubHtml).toContain('/hud/gem.webp');
      expect(hubHtml).toContain('50K');
      expect(hubHtml).not.toContain('💎');
      expect(hubHtml).not.toContain('🔑');
      expect(hubHtml).toContain('Team DMG');
      expect(hubHtml).toContain('+200%');
      expect(hubHtml).toContain('Drop Ore');
      expect(hubHtml).toContain('+120%');
      expect(hubHtml).toContain('Sell Ore');
      expect(hubHtml).toContain('+80%');
      expect(hubHtml).toContain('25 Cores');

      hubUi.openForBoss('obsidian-sovereign');
      expect(hubUi.renderOmegaModal()).toContain('35 Cores');

      hubUi.openForBoss('abyssal-leviathan');
      const levHubHtml = hubUi.renderOmegaModal();
      expect(levHubHtml).toContain('0 Leviathan Cores');
      expect(levHubHtml).toContain('45 Cores');
      expect(levHubHtml).toContain('HP 45Sp');
      expect(levHubHtml).toContain('HP 4.5Oc');
      expect(levHubHtml).toContain('HP 450Oc');
      expect(levHubHtml).toContain('+240%');
      expect(levHubHtml).toContain('+140%');
      expect(levHubHtml).toContain('+160%');
      hubUi.openForBoss('crimson-ronin');

      // Verify Fullscreen Omega Forge Cutscene -> Post-Cutscene Confirmation Popup flow
      state.omegaCores['crimson-ronin'] = 25;
      expect(hubUi.triggerForgeUnlock('crimson-ronin')).toBe(true);
      expect(hubUi.getForgeCutsceneState()?.phase).toBe('animating');
      const cutsceneHtml = hubUi.renderFullscreenCutsceneHtml();
      expect(cutsceneHtml).toContain('OMEGA SANCTUM // VESSEL FORGE');
      expect(cutsceneHtml).toContain('data-omega-cutscene-skip="true"');
      expect(cutsceneHtml).toContain('data-omega-fs-hero="true"');
      hubUi.finishForgeCutsceneToConfirm();
      expect(hubUi.getForgeCutsceneState()?.phase).toBe('confirm');
      const confirmHtml = hubUi.renderFullscreenCutsceneHtml();
      expect(confirmHtml).toContain('data-omega-forge-confirm="true"');
      expect(confirmHtml).toContain('OMEGA FORGE COMPLETE!');
      expect(confirmHtml).toContain('data-omega-confirm-close="true"');
      hubUi.confirmForgeOverlay();
      expect(hubUi.getForgeCutsceneState()).toBeNull();
      expect(hubUi.renderFullscreenCutsceneHtml()).toBe('');
      expect(hubUi.renderOmegaModal()).toContain('data-omega-replay-cutscene="crimson-ronin"');
      expect(hubUi.replayUnlockedCutscene('crimson-ronin')).toBe(true);
      expect(hubUi.getForgeCutsceneState()?.phase).toBe('animating');
      hubUi.confirmForgeOverlay();

      state.startOmegaBoss('crimson-ronin', 1);
      const arenaHud = new OmegaArenaHudUi(
        state,
        () => {},
        () => {}
      );
      const hudHtml = arenaHud.renderOmegaArenaHud();
      expect(hudHtml).toContain('Crimson Ronin');
      expect(hudHtml).toContain('OMEGA RAID');
      expect(hudHtml).toContain('mam-battle-hp-ticks');
      expect(hudHtml).toContain('data-omega-parries-count');
      expect(hudHtml).toContain('data-omega-shatter-count');
      expect(hudHtml).toContain('STAGGER 0%');
      expect(hudHtml).toContain('Retreat (0 Key Lost)');
      expect(hudHtml).toContain('data-omega-icon="skyDrop"');
      expect(hudHtml).toContain('data-omega-icon="bossCrown"');
      expect(hudHtml).toContain('data-omega-icon="squadPower"');
      expect(hudHtml).not.toContain('⚠');
    });

    it('renders Sticker-Pop TAP pointer above Omega target props without legacy target icons', () => {
      const state = new GameState();
      state.omegaKeys = 1;
      state.startOmegaBoss('crimson-ronin', 1);
      const overlay = new WorldOverlayHudUi(
        state,
        () => ({ sceneMode: 'omega', activeModal: 'none', inspectedSlot: null }),
        vi.fn()
      );
      const fakeOmegaLayer = {
        dataset: {} as Record<string, string>,
        innerHTML: '',
        querySelector: () => null,
        querySelectorAll: () => [],
      };
      (overlay as unknown as { omegaLayerEl: unknown }).omegaLayerEl = fakeOmegaLayer;

      overlay.updateOmegaArenaOverlay(
        {
          bossHead: { x: 400, y: 120 },
          targets: [{ id: 'blade-1', kind: 'phantom_blade', x: 320, y: 180 }],
        },
        vi.fn(),
        vi.fn()
      );

      expect(fakeOmegaLayer.innerHTML).toContain('data-omega-hit-target="blade-1"');
      expect(fakeOmegaLayer.innerHTML).toContain('-translate-y-full');
      expect(fakeOmegaLayer.innerHTML).toContain('TAP!');
      expect(fakeOmegaLayer.innerHTML).toContain('SHATTER BLADE');
      expect(fakeOmegaLayer.innerHTML).toContain('M2.5 1.5L10 10.5L17.5 1.5Z');
      expect(fakeOmegaLayer.innerHTML).not.toContain('M14.5 2.5L6 11');
    });

    it('renders Omega Victory popup on battle win showing item drop status instead of jumping straight back to Sanctum', () => {
      const state = new GameState();
      state.omegaKeys = 2;
      state.omegaCores['crimson-ronin'] = 2;
      state.omegaLastSummary = {
        victory: true,
        bossId: 'crimson-ronin',
        tier: 2,
        reason: 'victory',
        damageDealt: 150000,
        timeUsedSec: 18,
        coresAwarded: 2,
        gemsAwarded: 1200,
        diceAwarded: 3,
        firstClear: true,
        parriesLanded: 2,
        targetsShattered: 1,
        breaksTriggered: 1,
      };
      const arenaHud = new OmegaArenaHudUi(state, vi.fn(), vi.fn());
      const dropHtml = arenaHud.renderOmegaArenaHud();
      expect(dropHtml).toContain('data-omega-victory-popup="true"');
      expect(dropHtml).toContain('data-omega-drop-status="dropped"');
      expect(dropHtml).toContain('ITEM DROPPED!');
      expect(dropHtml).toContain('+2 Ronin Core');
      expect(dropHtml).toContain('+1,200');
      expect(dropHtml).toContain('Back to Sanctum');
      expect(dropHtml).toContain('Fight Again (2/5)');

      state.omegaLastSummary = {
        ...state.omegaLastSummary,
        coresAwarded: 0,
        diceAwarded: 0,
        firstClear: false,
      };
      const noDropHtml = arenaHud.renderOmegaArenaHud();
      expect(noDropHtml).toContain('data-omega-drop-status="none"');
      expect(noDropHtml).toContain('NO ITEM DROP');
      expect(noDropHtml).toContain('0 Ronin Core Dropped');

      const state2 = new GameState();
      state2.omegaKeys = 1;
      state2.startOmegaBoss('crimson-ronin', 1);
      state2.omegaBattle!.phase = 'active';
      state2.omegaBattle!.hp = 5;
      state2.omegaBattle!.parryWindow = { active: true, remainingSec: 2, durationSec: 2.3, consumed: false };
      let sceneMode: 'omega' | 'shop' = 'omega';
      const openModal = vi.fn();
      const render = vi.fn();
      const syncBattleVisuals = vi.fn();
      const bridge = new HudOmegaBridge(
        {} as HTMLElement,
        state2,
        new OmegaArenaHudUi(state2, vi.fn(), vi.fn()),
        () => sceneMode,
        (m) => {
          sceneMode = m === 'shop' ? 'shop' : 'omega';
        },
        openModal,
        vi.fn(),
        render,
        {
          setBossConfig: vi.fn(),
          syncBattleVisuals,
          triggerBossHit: vi.fn(),
          triggerTargetShatter: vi.fn(),
        }
      );
      bridge.handleOmegaParryClick();
      expect(state2.omegaLastSummary?.victory).toBe(true);
      expect(sceneMode).toBe('omega');
      expect(openModal).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalled();
      expect(syncBattleVisuals).toHaveBeenCalledWith([], false, false);

      // Entrance, 30s Invul Shield screen taps, and Defeat popup in omega scene
      const state3 = new GameState();
      state3.omegaKeys = 2;
      state3.startOmegaBoss('crimson-ronin', 1);
      const hud3 = new OmegaArenaHudUi(state3, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn());
      expect(hud3.renderOmegaArenaHud()).toContain('DROP');

      for (let i = 0; i < 8; i++) state3.stepOmegaBossTick(0.25, () => 0.5);
      expect(state3.omegaBattle!.phase).toBe('invul_shield');
      const invulHtml = hud3.renderOmegaArenaHud();
      expect(invulHtml).toContain('data-omega-shield-tap="0"');
      expect(invulHtml).toContain('SHIELD');
      expect(invulHtml).toContain('data-omega-icon="invulAegis"');
      expect(invulHtml).toContain('data-omega-icon="crackShield"');
      expect(invulHtml).not.toContain('🛡️');

      let scene3: 'omega' | 'shop' = 'omega';
      const setBattlePhase3 = vi.fn();
      const pulseInvulShield3 = vi.fn();
      const bridge3 = new HudOmegaBridge(
        { querySelector: () => null } as unknown as HTMLElement,
        state3,
        hud3,
        () => scene3,
        (m) => {
          scene3 = m === 'shop' ? 'shop' : 'omega';
        },
        vi.fn(),
        vi.fn(),
        vi.fn(),
        {
          setBossConfig: vi.fn(),
          syncBattleVisuals: vi.fn(),
          triggerBossHit: vi.fn(),
          triggerTargetShatter: vi.fn(),
          setBattlePhase: setBattlePhase3,
          pulseInvulShield: pulseInvulShield3,
        }
      );
      bridge3.handleOmegaTapInvulShield(0);
      expect(pulseInvulShield3).toHaveBeenCalledTimes(1);
      expect(state3.omegaBattle!.invulTapsRemaining).toBe(state3.omegaBattle!.invulMaxTaps - 1);

      for (let i = 0; i < 125; i++) state3.stepOmegaBossTick(0.25, () => 0.5);
      expect(state3.omegaLastSummary?.victory).toBe(false);
      bridge3.syncOmegaSceneVisual();
      expect(setBattlePhase3).toHaveBeenCalledWith('ended');
      expect(hud3.renderOmegaArenaHud()).toContain('data-omega-defeat-popup="true"');
      expect(scene3).toBe('omega');
    });
  });

  describe('Premium Shop TWIN Summon Cutscene', () => {
    it('triggers a Cyber-Prism Binary-Star fullscreen cutscene when buying a TWIN duo in ShopModalsUi', () => {
      const state = new GameState();
      state.towerCoins = 120;
      const onToast = vi.fn();
      const onRender = vi.fn();
      const shopUi = new ShopModalsUi(state, onToast, onRender);

      let clickHandler: ((e: { stopPropagation: () => void }) => void) | null = null;
      const buyBtn = {
        dataset: { buyPremiumItem: 'yukikage-twins' },
        addEventListener: (_evt: string, fn: (e: { stopPropagation: () => void }) => void) => {
          clickHandler = fn;
        },
        classList: { toggle: vi.fn() },
      };
      const fakeRoot = {
        querySelector: () => null,
        querySelectorAll: (sel: string) => (sel === '[data-buy-premium-item]' ? [buyBtn] : []),
      } as unknown as HTMLElement;

      shopUi.bindEvents(fakeRoot);
      expect(clickHandler).not.toBeNull();
      clickHandler!({ stopPropagation: vi.fn() });

      expect(state.towerCoins).toBe(70);
      expect(state.miners['yukikage-twins']).toBe(1);
      expect(shopUi.getPremiumCutsceneState()).toEqual({
        chibiId: 'yukikage-twins',
        ownedCount: 1,
        phase: 'animating',
      });

      const animatingHtml = shopUi.renderFullscreenCutsceneHtml();
      expect(animatingHtml).toContain('TWIN RESONANCE // PREMIUM SUMMON');
      expect(animatingHtml).toContain('data-twin-cutscene-skip="true"');
      expect(animatingHtml).toContain('Yukikage Twins');
      expect(animatingHtml).toContain('NEW DUO!');
      expect(animatingHtml).toContain('TEAM DMG');
      expect(animatingHtml).toContain('+100%');
      expect(animatingHtml).toContain('DROP ORE');
      expect(animatingHtml).toContain('+40%');

      shopUi.finishPremiumCutsceneToConfirm();
      expect(shopUi.getPremiumCutsceneState()?.phase).toBe('confirm');
      const confirmHtml = shopUi.renderFullscreenCutsceneHtml();
      expect(confirmHtml).toContain('data-twin-confirm="true"');
      expect(confirmHtml).toContain('Confirm &amp; Collect');
      expect(confirmHtml).toContain('Yukikage Twins Ready for Deployment');
      expect(confirmHtml).toContain('23/s Base');
      expect(confirmHtml).not.toContain('230Sx');

      shopUi.clearPremiumCutscene();
      expect(shopUi.getPremiumCutsceneState()).toBeNull();
      expect(shopUi.renderFullscreenCutsceneHtml()).toBe('');
    });

    it('renders W1-capped upgrade costs in PlotInspectUi instead of leaked W8 Sx prices', () => {
      const state = new GameState();
      state.unlockedWorlds = ['underground'];
      state.miners['yukikage-twins'] = 1;
      state.plotMiners[0] = 'yukikage-twins';
      state.plotUnits[0] = {
        chibiId: 'yukikage-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
      };
      const ui = new PlotInspectUi(
        state,
        () => {},
        () => {},
        () => {},
        () => '',
        () => {}
      );
      const fakeRoot = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement;
      ui.render(fakeRoot, 0);
      expect(fakeRoot.innerHTML).toContain('$550');
      expect(fakeRoot.innerHTML).not.toContain('Sx');
    });
  });

  describe('World-Locked Pickaxe Shop UI', () => {
    it('shows world lock state for unreached worlds and rejects locked purchases with toast', () => {
      const state = new GameState();
      state.cash = 1e30;
      const onToast = vi.fn();
      const shopUi = new ShopModalsUi(state, onToast, () => {});
      const html = shopUi.renderPickaxeShopModal();
      expect(html).toContain('Unlock Crystal Caves');
      expect(html).toContain('$18M');
      expect(html).toContain('$4.5Oc');

      let clickHandler: ((e: { stopPropagation: () => void }) => void) | null = null;
      const lockedBtn = {
        dataset: { buyPickaxe: 'rhodolite' },
        addEventListener: (_evt: string, fn: (e: { stopPropagation: () => void }) => void) => {
          clickHandler = fn;
        },
        classList: { toggle: vi.fn() },
        closest: () => null,
      };
      const fakeRoot = {
        querySelector: () => null,
        querySelectorAll: (sel: string) => (sel === '[data-buy-pickaxe]' ? [lockedBtn] : []),
      } as unknown as HTMLElement;
      shopUi.bindEvents(fakeRoot);
      clickHandler!({ stopPropagation: vi.fn() });
      expect(state.ownedPickaxes.rhodolite).toBeUndefined();
      expect(onToast).toHaveBeenCalledWith('Unlock Crystal Caves first!');
    });
  });

  describe('PlotInspectUi Single-Row Pickaxe Strip', () => {
    it('sorts Equipped -> Owned (strongest first) -> Unlocked World -> Locked and renders a 1-row strip', () => {
      const sorted = sortInspectPickaxes(PICKAXES, {
        equippedId: 'rhodolite',
        ownedPickaxes: { sunwheel: 1, thundercoil: 4 },
        isWorldUnlocked: (w) => w === 'underground' || w === 'crystal',
      });
      expect(sorted[0].id).toBe('rhodolite');
      expect(sorted[1].id).toBe('thundercoil');
      expect(sorted[2].id).toBe('sunwheel');
      expect(sorted[3].id).toBe('starter');
      expect(sorted[sorted.length - 1].id).toBe('chronoeternity');

      const state = new GameState();
      state.unlockedWorlds = ['underground', 'crystal'];
      state.ownedPickaxes = { sunwheel: 1, thundercoil: 4 };
      state.miners['astral-recruit'] = 1;
      state.plotMiners[0] = 'astral-recruit';
      state.plotUnits[0] = {
        chibiId: 'astral-recruit',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: 'rhodolite',
        mutationId: 'normal',
        enchantId: null,
      };
      const ui = new PlotInspectUi(
        state,
        () => {},
        () => {},
        () => {},
        () => '',
        () => {}
      );
      (ui as unknown as { inspectTab: string }).inspectTab = 'pickaxe';
      const fakeRoot = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement;
      ui.render(fakeRoot, 0);

      expect(fakeRoot.innerHTML).toContain('data-pickaxe-strip="true"');
      expect(fakeRoot.innerHTML).toContain('data-pickaxe-scroll="left"');
      expect(fakeRoot.innerHTML).toContain('data-pickaxe-scroll="right"');
      expect(fakeRoot.innerHTML).not.toContain('is-pickaxe]:grid-cols-6');
      const idxRhodolite = fakeRoot.innerHTML.indexOf('data-pickaxe-id="rhodolite"');
      const idxThunder = fakeRoot.innerHTML.indexOf('data-pickaxe-id="thundercoil"');
      const idxSunwheel = fakeRoot.innerHTML.indexOf('data-pickaxe-id="sunwheel"');
      const idxChrono = fakeRoot.innerHTML.indexOf('data-pickaxe-id="chronoeternity"');
      expect(idxRhodolite).toBeGreaterThan(-1);
      expect(idxRhodolite).toBeLessThan(idxThunder);
      expect(idxThunder).toBeLessThan(idxSunwheel);
      expect(idxSunwheel).toBeLessThan(idxChrono);
    });
  });

  describe('Backpack Hotbar-First Ordering & Ore Inspect-Only', () => {
    it('places hotbar-equipped Chibis at the very top in hotbar slot order (1..9), ahead of higher-DPS bag Chibis', () => {
      const cLow = CHIBI_CATALOG[0]; // astral-recruit (lowest DPS)
      const cMid = CHIBI_CATALOG[1]; // solar-striker
      const cHigh = CHIBI_CATALOG[4]; // higher DPS non-hotbar

      const ordered = sortInventoryMiners(
        [
          { def: cHigh, effDps: 999 },
          { def: cLow, effDps: 10 },
          { def: cMid, effDps: 20 },
        ],
        [cMid.id, cLow.id, null, null, null, null, null, null, null]
      );
      expect(ordered.map((x) => x.def.id)).toEqual([cMid.id, cLow.id, cHigh.id]);

      const state = new GameState();
      state.miners[cLow.id] = 1;
      state.miners[cMid.id] = 1;
      state.miners[cHigh.id] = 1;
      state.ores[ORES[0].id] = 2;
      state.hotbar = [cMid.id, cLow.id, null, null, null, null, null, null, null];

      const invUi = new InventoryModalUi(state, () => {});
      const html = invUi.renderModal();
      const posMid = html.indexOf(`data-equip-miner="${cMid.id}"`);
      const posLow = html.indexOf(`data-equip-miner="${cLow.id}"`);
      const posHigh = html.indexOf(`data-equip-miner="${cHigh.id}"`);
      expect(posMid).toBeGreaterThan(-1);
      expect(posMid).toBeLessThan(posLow);
      expect(posLow).toBeLessThan(posHigh);

      // Ores cannot be equipped onto hotbar from Backpack
      expect(html).not.toContain('data-equip-ore');
      expect(html).not.toContain('data-insp-inv-action="toggle-ore"');
      expect(html).toContain(`data-inspect-inv-only="ore:${ORES[0].id}"`);
    });
  });

  describe('TwinTrial HUD & Modal', () => {
    it('renders Trial button beneath audio controls only when visible and shows FREE or mm:ss countdown', () => {
      const hiddenHtml = renderAudioControlsHtml({
        floating: true,
        muted: false,
        cameraLocked: false,
        fps: 60,
        twinTrial: { visible: false, active: false, remainingSec: 0 },
      });
      expect(hiddenHtml).not.toContain('data-action="open-twin-trial"');

      const availHtml = renderAudioControlsHtml({
        floating: true,
        muted: false,
        cameraLocked: false,
        fps: 60,
        twinTrial: { visible: true, active: false, remainingSec: 0 },
      });
      expect(availHtml).toContain('data-action="open-twin-trial"');
      expect(availHtml).toContain('FREE');
      expect(availHtml.indexOf('data-action="toggle-audio"')).toBeLessThan(
        availHtml.indexOf('data-action="open-twin-trial"')
      );

      const activeHtml = renderAudioControlsHtml({
        floating: true,
        muted: false,
        cameraLocked: false,
        fps: 60,
        twinTrial: { visible: true, active: true, remainingSec: 750 },
      });
      expect(activeHtml).toContain('data-twin-trial-timer="true"');
      expect(activeHtml).toContain('12:30');

      const railHtml = renderCurrencyRailHtml({
        gems: 100,
        cash: 250,
        showCash: true,
      });
      expect(railHtml).toContain('[[data-hud-compact=true][data-hud-trial=true]_&]:top-[128px]');
    });

    it('renders all 5 Twin Chibis in TwinTrialModalUi with read-only notice and claims chosen Twin', () => {
      const state = new GameState();
      state.unlockTwinTrial();
      const onClaim = vi.fn();
      const ui = new TwinTrialModalUi(state, () => {}, onClaim, () => {});
      const html = ui.renderModal();

      for (const item of PREMIUM_SHOP_ITEMS) {
        expect(html).toContain(`data-inspect-trial-twin="${item.chibiId}"`);
      }
      expect(html).toContain('Read-Only');
      expect(html).toContain('20:00');
      expect(html).toContain('data-claim-twin-trial="yukikage-twins"');

      expect(ui.claimSelectedTwin('yukikage-twins')).toBe(true);
      expect(state.twinTrial.status).toBe('active');
      expect(state.twinTrial.chibiId).toBe('yukikage-twins');
      expect(onClaim).toHaveBeenCalledWith('yukikage-twins');
    });

    it('expires active trial during stepHudSlowTick, closes modal/inspector, syncs plots, and pushes toast', () => {
      const state = new GameState();
      state.unlockTwinTrial();
      const past = Date.now() - TWIN_TRIAL_DURATION_MS - 1000;
      state.claimTwinTrial('halcyon-twins', past);
      state.plotMiners[1] = 'halcyon-twins';
      state.plotUnits[1] = {
        chibiId: 'halcyon-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
        isTrial: true,
      };

      const onSyncPlots = vi.fn();
      const pushToast = vi.fn();
      const render = vi.fn();
      const onTwinTrialExpired = vi.fn();
      const fakeRoot = {
        querySelector: () => null,
        querySelectorAll: () => [],
      } as unknown as HTMLElement;

      stepHudSlowTick({
        root: fakeRoot,
        state,
        activeModal: 'twin-trial',
        weatherDpsUi: {
          syncActivePotionsHud: () => {},
          syncWeatherWidget: () => {},
          syncDpsMeterWidget: () => {},
        } as unknown as any,
        lastRegrowthActive: false,
        setLastRegrowthActive: () => {},
        onSyncPlots,
        onTwinTrialExpired,
        pushToast,
        render,
      });

      expect(state.twinTrial.status).toBe('expired');
      expect(state.miners['halcyon-twins']).toBeUndefined();
      expect(onTwinTrialExpired).toHaveBeenCalledWith('halcyon-twins');
      expect(onSyncPlots).toHaveBeenCalled();
      expect(pushToast).toHaveBeenCalled();
      expect(render).toHaveBeenCalled();
    });
  });

  describe('Trial Badges & Read-Only Inspector', () => {
    it('renders read-only PlotInspectUi state for a trial plot unit and TRIAL badges in Inventory & Hotbar', () => {
      const state = new GameState();
      state.unlockTwinTrial();
      state.claimTwinTrial('nocturne-twins', Date.now());
      state.placeHotbarItemOnPlot(0, 1);

      const inspectUi = new PlotInspectUi(
        state,
        () => {},
        () => {},
        () => {},
        () => '',
        () => {}
      );
      const fakeRoot = {
        innerHTML: '',
        querySelector: () => null,
        querySelectorAll: () => [],
      } as unknown as HTMLElement;
      inspectUi.render(fakeRoot, 1);

      expect(fakeRoot.innerHTML).toContain('TRIAL');
      expect(fakeRoot.innerHTML).toContain('Read-Only');
      expect(fakeRoot.innerHTML).toContain('data-twin-trial-timer="true"');
      expect(fakeRoot.innerHTML).toContain('data-inspect-action="pickup"');
      expect(fakeRoot.innerHTML).toContain('data-inspect-action="exit"');
      expect(fakeRoot.innerHTML).not.toContain('data-inspect-action="up-dmg"');
      expect(fakeRoot.innerHTML).not.toContain('data-inspect-action="roll-mut"');

      const invUi = new InventoryModalUi(state, () => {});
      const invHtml = invUi.renderModal();
      expect(invHtml).toContain('data-equip-miner="nocturne-twins"');
      expect(invHtml).toContain('TRIAL');

      const hotbarHtml = renderHotbarSlotsHtml(state);
      expect(hotbarHtml).toContain('TRIAL');
    });

    it('restricts Trial HUD button visibility to mine and shop scenes so battle/altar/fusion never enter invisible modal state', () => {
      expect(shouldShowTwinTrialHudButton('mine', true)).toBe(true);
      expect(shouldShowTwinTrialHudButton('shop', true)).toBe(true);
      expect(shouldShowTwinTrialHudButton('tower', true)).toBe(false);
      expect(shouldShowTwinTrialHudButton('altar', true)).toBe(false);
      expect(shouldShowTwinTrialHudButton('fusion', true)).toBe(false);
      expect(shouldShowTwinTrialHudButton('omega', true)).toBe(false);
      expect(shouldShowTwinTrialHudButton('mine', false)).toBe(false);
    });
  });

  describe('AudioManager barrage hit SFX', () => {
    it('dispatches crescendo barrage hit SFX across beats 0..6 with 65ms cooldown bucket', () => {
      const mgr = new AudioManager();
      const spy = vi.spyOn(mgr, 'playSfx');
      expect(() => {
        for (let b = 0; b <= 6; b++) {
          mgr.playBarrageHitSfx(b, b === 3, b === 6);
        }
      }).not.toThrow();

      expect(spy).toHaveBeenCalledTimes(7);
      const firstCall = spy.mock.calls[0];
      const finisherCall = spy.mock.calls[6];
      expect(firstCall[1]?.bucket).toBe('barrage-hit');
      expect(firstCall[1]?.cooldownMs).toBe(65);
      expect(finisherCall[0]).toBe('ore-hit-3');
      expect((finisherCall[1]?.pitchMin ?? 0)).toBeGreaterThan(firstCall[1]?.pitchMin ?? 0);
      expect((finisherCall[1]?.volume ?? 0)).toBeGreaterThan(firstCall[1]?.volume ?? 0);
    });
  });

  describe('ANOMALY tier badge & rarity wiring', () => {
    it('renders ANOMALY crest badge, rarity card class, and valid animated SVG asset', () => {
      const badgeHtml = renderRarityBadgeHtml('anomaly');
      expect(badgeHtml).toContain('mam-rarity-anomaly');
      expect(badgeHtml).toContain('is-crest');
      expect(badgeHtml).toContain('/badges/anomaly.svg');
      expect(badgeHtml).toContain('ANOMALY');

      const cardCls = rarityCardClasses('anomaly');
      expect(cardCls).toContain('mam-card');
      expect(cardCls).toContain('rarity-anomaly');

      const svgPath = resolve(process.cwd(), 'public/badges/anomaly.svg');
      const svg = readFileSync(svgPath, 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('ANOMALY');
    });

    it('renders RiftModalUi with 500K Force Open CTA, Tier 1-10 ladder, attempts badge, ANOMALY Chibi cards, and Pity Claim button', () => {
      const state = new GameState();
      const riftUi = new RiftModalUi(state, () => {}, () => {});
      const html = riftUi.renderModal();
      expect(html).toContain('Dimensional Rift Gate');
      expect(html).toContain('Void Asura');
      expect(html).toContain('Null Singularity');
      expect(html).toContain('/badges/anomaly.svg');
      expect(html).toContain('/hud/rift_shard.webp');
      expect(html).toContain('!flex-row');
      expect(html).toContain('500 Shards');
      expect(html).toContain('250 Shards');
      expect(html).toContain('Attempts');
      expect(html).toContain('Tier 1');
      expect(html).toContain('Tier 10');
      expect(html).not.toContain('VOID');
    });

    it('renders RiftArenaHudUi 30s Tier 1-10 Damage Meter and HudRiftBridge battle summary flow', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 25, 14, 25, 0));
      try {
        const state = new GameState();
      state.miners['astral-recruit'] = 1;
      state.equipBestMiners();
      const fakeRoot = { querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement;
      let curMode: 'mine' | 'rift' = 'mine';
      let lastBoss: string | null = null;
      let shockwaveTier = 0;

      const arenaUi = new RiftArenaHudUi(state, () => {}, () => {}, () => {});
      const bridge = new HudRiftBridge(
        fakeRoot,
        state,
        arenaUi,
        () => curMode,
        (m) => { curMode = m as 'mine' | 'rift'; },
        () => {},
        () => {},
        () => {},
        {
          setBossConfig: (bossId) => { lastBoss = bossId; },
          triggerBossHit: () => {},
          triggerTierShockwave: (t) => { shockwaveTier = t; },
        }
      );

      // Force pass so battle can start regardless of current wall-clock minute
      state.gems = 500_000;
      state.buyRiftPass();
      bridge.startRiftBattle();
      expect(curMode).toBe('rift');
      expect(lastBoss).toBeTruthy();
      expect(state.riftBattle).not.toBeNull();

      const liveHtml = arenaUi.renderRiftArenaHud();
      expect(liveHtml).toContain('30.0s');
      expect(liveHtml).toContain('TIER 0');
      expect(liveHtml).toContain('T10');
      expect(liveHtml).toContain('/hud/rift_shard.webp');

      // Deal enough tap damage to reach Tier 4 (50T)
      state.applyRiftTapDamage(50_000_000_000_000, 0, 1, () => 0.99);
      const afterTapHtml = arenaUi.renderRiftArenaHud();
      expect(afterTapHtml).toContain('TIER 4');
      expect(afterTapHtml).toContain('+4 Shards');

      bridge.handleRiftFighterStrike(0, 1, true, 6, true);
      bridge.retreatRiftBattle();
      expect(state.riftBattle).toBeNull();
      expect(state.riftShards).toBe(4);
      expect(shockwaveTier).toBeGreaterThanOrEqual(0);

      const summaryHtml = arenaUi.renderRiftArenaHud();
      expect(summaryHtml).toContain('TIER 4 / 10');
      expect(summaryHtml).toContain('/hud/rift_shard.webp');
      expect(summaryHtml).toContain('+4');
      expect(summaryHtml).toContain('BATTLE AGAIN');

      // When pass expires while viewing summary, button should show RIFT CLOSED
      state.riftPassExpiresAt = Date.now() - 1000;
      const closedSummaryHtml = arenaUi.renderRiftArenaHud();
      expect(closedSummaryHtml).toContain('RIFT CLOSED');
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not steal tap/barrage audio cooldowns in HudRiftBridge and re-renders RiftModalUi on window state transition', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 25, 14, 25, 0));
      try {
        const state = new GameState();
      state.miners['astral-recruit'] = 1;
      state.equipBestMiners();
      state.gems = 500_000;
      state.buyRiftPass();

      const fakeRoot = { querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement;
      let curMode: 'mine' | 'rift' = 'mine';
      const arenaUi = new RiftArenaHudUi(state, () => {}, () => {}, () => {});
      const tapSpy = vi.spyOn(AudioManager.prototype, 'playOreHit');
      const barrageSpy = vi.spyOn(AudioManager.prototype, 'playBarrageHitSfx');
      const recordTapCharge = vi.fn(() => true);
      const bridge = new HudRiftBridge(
        fakeRoot,
        state,
        arenaUi,
        () => curMode,
        (m) => { curMode = m as 'mine' | 'rift'; },
        () => {},
        () => {},
        () => {},
        {
          setBossConfig: () => {},
          setBattleActive: () => {},
          triggerBossHit: () => {},
          triggerTierShockwave: () => {},
          recordTapCharge,
        }
      );
      bridge.startRiftBattle();
      bridge.handleRiftBossTap(100, 100);
      bridge.handleRiftFighterStrike(0, 1, false, 0, false);
      expect(recordTapCharge).toHaveBeenCalledTimes(1);
      expect(tapSpy).not.toHaveBeenCalled();
      expect(barrageSpy).not.toHaveBeenCalled();
      tapSpy.mockRestore();
      barrageSpy.mockRestore();

      // Omega Parry & Tower Shield-Break Sweet-Spot grant arena Ult charge via bridge ops
      const grantOmegaUlt = vi.fn();
      const omegaState = new GameState();
      omegaState.miners['astral-recruit'] = 1;
      omegaState.equipBestMiners();
      omegaState.omegaKeys = 2;
      omegaState.startOmegaBoss('crimson-ronin', 1);
      omegaState.omegaBattle!.phase = 'active';
      omegaState.omegaBattle!.parryWindow = { active: true, remainingSec: 2, durationSec: 2.3, consumed: false };
      const omegaBridge = new HudOmegaBridge(
        fakeRoot,
        omegaState,
        new OmegaArenaHudUi(omegaState, vi.fn(), vi.fn()),
        () => 'omega',
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        {
          setBossConfig: vi.fn(),
          syncBattleVisuals: vi.fn(),
          triggerBossHit: vi.fn(),
          triggerTargetShatter: vi.fn(),
          grantSquadUltCharge: grantOmegaUlt,
        }
      );
      omegaBridge.handleOmegaParryClick();
      expect(grantOmegaUlt).toHaveBeenCalledWith(true);

      // RiftModalUi.stepTick should trigger onRender when pass closes mid-modal
      let renders = 0;
      const modalUi = new RiftModalUi(state, () => { renders += 1; }, () => {});
      modalUi.renderModal();
      state.riftPassExpiresAt = Date.now() - 1000;
      modalUi.stepTick(0.1, fakeRoot);
      expect(renders).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
