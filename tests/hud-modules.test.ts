import { describe, expect, it, vi } from 'vitest';
import { ENCHANTS, GEM_SHOP_ITEMS, ORES } from '../src/game/GameData';
import { GameState } from '../src/game/GameState';
import {
  getAltarRollButtonState,
  renderAltarStripCardsHtml,
  renderShopWorldHudHtml,
} from '../src/ui/AltarShopHudUi';
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
  restoreRootScrolls,
} from '../src/ui/HudShared';
import {
  buildActivePotionsDockContent,
  buildDpsMeterInnerHtml,
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
} from '../src/ui/WorldOverlayHudUi';

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
      expect(collapsedDps).toContain('▲');
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
      expect(slotsHtml).not.toContain(zeroOre.name);

      const closedBag = renderHotbarBagButtonHtml('none');
      const openBag = renderHotbarBagButtonHtml('inventory');
      expect(closedBag).toContain('data-action="toggle-inventory"');
      expect(openBag).toContain('border-[#4ade80]/80');
      expect(closedBag).toContain('border-[#60a5fa]/60');
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
});
