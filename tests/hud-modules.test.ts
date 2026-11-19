import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager';
import { ENCHANTS, GEM_SHOP_ITEMS, ORES } from '../src/game/GameData';
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
  captureRootScrolls,
  formatCountdownTimer,
  getElementPath,
  rarityCardClasses,
  renderToastBannerHtml,
  restoreRootScrolls,
  shouldDismissModalBackdrop,
} from '../src/ui/HudShared';
import {
  buildActivePotionsDockContent,
  buildDpsMeterInnerHtml,
  buildOverclockGaugeInnerHtml,
  buildWeatherWidgetInnerHtml,
  formatWeatherTimer,
} from '../src/ui/WeatherDpsHudUi';
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
import { OfflineModalUi } from '../src/ui/OfflineModalUi';
import { SettingsModalUi } from '../src/ui/SettingsModalUi';
import { buildTutorialCardHtml, getTutorialStageMeta, TUTORIAL_REWARD_DICE, TUTORIAL_REWARD_GEMS } from '../src/ui/TutorialUi';

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

    it('renders 9 hotbar slots incl. qty<=0/unknown fallbacks, tracks state key changes, and highlights bag button', () => {
      const state = new GameState();
      const firstOre = ORES[0];
      const zeroOre = ORES[1];
      state.miners['astral-recruit'] = 1;
      state.hotbar[0] = 'astral-recruit';
      state.ores[firstOre.id] = 3;
      state.hotbar[1] = firstOre.id;
      state.ores[zeroOre.id] = 0;
      state.hotbar[2] = zeroOre.id;
      state.hotbar[3] = 'non-existent-id';

      const key1 = buildHotbarStateKey(state);
      state.selectHotbarSlot(1);
      const key2 = buildHotbarStateKey(state);
      expect(key2).not.toBe(key1);

      const slotsHtml = renderHotbarSlotsHtml(state);
      for (let i = 0; i < 9; i++) {
        expect(slotsHtml).toContain(`data-hotbar="${i}"`);
      }
      expect(slotsHtml).toContain('Onee');
      expect(slotsHtml).toContain(firstOre.name);
      expect(slotsHtml).toContain('x3');
      expect(slotsHtml).toContain('mam-hotbar-keycap');
      expect(slotsHtml).toContain('is-hotbar-selected');
      expect(slotsHtml).not.toContain(zeroOre.name);

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
        dpsMeterHtml: '<div id="d"></div>',
        modalHtml: '',
        toastStackHtml: '<div id="t"></div>',
      });
      expect(shopHtml).toContain('data-action="back-to-mine"');
      expect(shopHtml).toContain('data-action="open-pickaxe-shop"');
      expect(shopHtml).toContain('data-action="open-sell-shop"');
      expect(shopHtml).toContain('data-action="open-relic-forge"');
      expect(shopHtml).toContain('data-action="open-gem-shop"');
      expect(shopHtml).toContain('data-action="open-enchant-altar"');
      expect(shopHtml).toContain('data-action="open-gem-tower"');
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
      expect(GRAPHICS_PRESETS.medium).toEqual({ maxPixelRatio: 1.25, shadowsEnabled: true, weatherParticleScale: 0.5 });
      expect(GRAPHICS_PRESETS.low).toEqual({ maxPixelRatio: 1, shadowsEnabled: false, weatherParticleScale: 0 });

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
        graphicsQuality: 'high',
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
      expect(activeHtml).toContain('2x SPD');
      expect(activeHtml).toContain('mam-fever-shell is-active');
      expect(activeHtml).toContain('mam-fever-ticks');

      const ocToast = renderToastBannerHtml('⚡ OVERCLOCK ACTIVE! 2x Speed');
      expect(ocToast).toContain('data-toast-tone="overclock"');
      expect(ocToast).not.toContain('⚡');

      const bountyToast = renderToastBannerHtml('Bounty Claimed: +40 Gems!');
      expect(bountyToast).toContain('data-toast-tone="bounty"');

      const errToast = renderToastBannerHtml('Chest is empty');
      expect(errToast).toContain('data-toast-tone="error"');
    });
  });

  describe('TutorialUi FTUE Overhaul', () => {
    it('maps steps across 5 stages, renders pop-out pose card with Skip & Starter Bonus, and grants reward once', () => {
      expect(getTutorialStageMeta('welcome')).toEqual({ stage: 1, total: 5, label: 'Mine' });
      expect(getTutorialStageMeta('upgrade-dmg')).toEqual({ stage: 2, total: 5, label: 'Upgrade' });
      expect(getTutorialStageMeta('click-chest')).toEqual({ stage: 3, total: 5, label: 'Collect' });
      expect(getTutorialStageMeta('go-shop')).toEqual({ stage: 4, total: 5, label: 'Sell' });
      expect(getTutorialStageMeta('congrats')).toEqual({ stage: 5, total: 5, label: 'Reward' });

      const welcomeHtml = buildTutorialCardHtml('welcome');
      expect(welcomeHtml).toContain('pose.webp');
      expect(welcomeHtml).toContain('data-tutorial-skip="true"');
      expect(welcomeHtml).toContain('Stage 1/5');

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
});
