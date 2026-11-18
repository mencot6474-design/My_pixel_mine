# Tahap B `GameHud.ts` Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memecah [GameHud.ts](../../../src/ui/GameHud.ts) (`2,353` baris) menjadi thin coordinator (`~760–880` baris, di bawah batas `< ~800–1,000` baris `GAME_MAP.md`) dengan mengekstrak 4 modul domain baru di `src/ui/` serta memindahkan helper scroll ke `HudShared.ts` dan action handler Forge ke `ForgeModalUi.ts` tanpa mengubah visual/DOM, CSS class, `data-*`, public API `main.ts`, maupun gameplay.

**Architecture:** Pola delegasi sub-UI seragam (constructor injection callback sempit seperti `TowerUi`/`ShopModalsUi`), pure builder/formatter functions yang diekspor untuk Vitest Node testing, dan wrapper DOM/event terisolasi per domain agar tidak ada circular dependency maupun duplikasi global listener.

**Tech Stack:** TypeScript 5.8 (strict, no `any`, `noUnusedLocals`), Vite 7, Tailwind CSS 4, Vitest 3.

**Spec:** [docs/superpowers/specs/2026-11-18-tahap-b-gamehud-modularization-design.md](../specs/2026-11-18-tahap-b-gamehud-modularization-design.md)

## Global Constraints

- Strict TypeScript tanpa `any`, patuhi `noUnusedLocals` & `noUnusedParameters`.
- Pertahankan 100% public API `GameHud` yang dipanggil [src/main.ts](../../../src/main.ts) dan signature constructor-nya.
- Pertahankan seluruh `data-*`, CSS class (`mam-*`, `TW_*`), `pointer-events`, dan `tabular-nums` tanpa drift.
- Tidak menyentuh `src/game/GameState.ts` (Tahap C).
- Jangan menjalankan `git commit` / `git push` sebelum user memberi perintah eksplisit.

## Review Focus

1. [src/ui/GameHud.ts](../../../src/ui/GameHud.ts) `< ~900` baris; setiap modul baru `src/ui/*.ts` berada di kisaran `~280–430` baris; zero `any`.
2. Tidak ada double-binding event saat `render()` + `sync*()` dipanggil berulang (khususnya `WeatherDpsHudUi`, `HotbarHudUi`, `ForgeModalUi`, `AltarShopHudUi`).
3. `GameHud.render()` tetap memakai `try { ... } finally { ... }` sehingga modal animation, `restoreRootScrolls`, dan `tutorialUi.syncView` selalu berjalan pada early return scene mode.
4. Overlay visibility rules (`WorldOverlayHudUi`) saat modal terbuka, inspector terbuka, `adPaused`, atau ganti scene mode tetap konsisten dan membersihkan transient DOM saat `setSceneMode`.
5. `npm.cmd test`, `npm.cmd run build`, dan live browser smoke-test lulus tanpa error console/runtime.

---

### Task 1: Scroll Helpers di `HudShared.ts` & Event Binding di `ForgeModalUi.ts`

**Files:**
- Modify: `src/ui/HudShared.ts:235-241` (append exported scroll preservation helpers)
- Modify: `src/ui/ForgeModalUi.ts:34-46,359-367`
- Modify: `src/ui/GameHud.ts` (import scroll helpers dari `HudShared`, delegasikan Forge events ke `forgeUi.bindEvents(this.root)`, hapus `1527-1571` & `2307-2353`)
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests in `tests/hud-modules.test.ts`**
  Uji helper `rarityCardClasses` & scroll path traversal/export contract (dengan lightweight fake parent/children structure untuk `captureRootScrolls` / `restoreRootScrolls` atau `SavedScrollEntry` export check).
- [ ] **Step 2: Run `vitest run tests/hud-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Move `SavedScrollEntry`, `getElementPath`, `captureRootScrolls`, `restoreRootScrolls` to `src/ui/HudShared.ts`, add `pushToast`/`onRequestRender` + `bindEvents(modalRoot)` to `src/ui/ForgeModalUi.ts`, and wire `GameHud.ts`**
- [ ] **Step 4: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` & check `tsc --noEmit` -> expect PASS**

---

### Task 2: Ekstrak `WeatherDpsHudUi.ts` (Active Potions, Weather Forecast, DPS Meter)

**Files:**
- Create: `src/ui/WeatherDpsHudUi.ts`
- Modify: `src/ui/GameHud.ts`
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests for `WeatherDpsHudUi` pure helpers in `tests/hud-modules.test.ts`**
  Test: `formatWeatherTimer` (`0 -> 0:00`, `5 -> 0:05`, `180 -> 3:00`), `buildActivePotionsDockContent` (kosong vs 1/multiple active boost dengan `new GameState()`), `buildWeatherWidgetInnerHtml` (popover tertutup vs terbuka & inspect weather), `buildDpsMeterInnerHtml` (kosong vs chibi terpasang di plot, collapsed vs expanded `[data-dps-scroll="true"]`).
- [ ] **Step 2: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Implement `src/ui/WeatherDpsHudUi.ts` & delegate from `src/ui/GameHud.ts`**
  Pastikan `toggle-weather-info`, `toggle-auto-meteor`, `[data-weather-inspect]`, `toggle-dps-meter`, `[data-dps-inspect-slot]` di-bind di satu tempat bersih (`WeatherDpsHudUi`) agar tidak double-bind antara `GameHud.bindEvents()` dan `syncWeatherWidget()`.
- [ ] **Step 4: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` & `npx tsc --noEmit` -> expect PASS**

---

### Task 3: Ekstrak `HotbarHudUi.ts` (Hotbar 1-9, Bag Button & Plot Drag-and-Drop)

**Files:**
- Create: `src/ui/HotbarHudUi.ts`
- Modify: `src/ui/GameHud.ts`
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests for `HotbarHudUi` pure helpers in `tests/hud-modules.test.ts`**
  Test: `canDropHotbarOnPlot`, `buildHotbarStateKey`, `renderHotbarSlotsHtml`, `renderHotbarBagButtonHtml` dengan `new GameState()`.
- [ ] **Step 2: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Implement `src/ui/HotbarHudUi.ts` & delegate from `src/ui/GameHud.ts`**
  Pindahkan `hotbarDrag`, `lastHotbarKey`, `suppressHotbarClickUntil`, `renderHotbarBagButton`, `renderHotbarSlots`, `cleanupHotbarDrag`, `updateHotbarDropHighlight`, `updateHotbarPlotDropPreview`, `getHotbarSlotAtPoint`, `canDropHotbarOnPlot`, `bindHotbarEvents`, `updateHotbarLive`, dan `syncIfHotbarChanged` + global clear-selection listener (atau coordinator callback). Pastikan event `toggle-inventory` terpasang sekali per render/update di `[data-hud-hotbar="true"]`.
- [ ] **Step 4: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` & `npx tsc --noEmit` -> expect PASS**

---

### Task 4: Ekstrak `AltarShopHudUi.ts` (Shop Plaza Dock & Enchant Altar HUD + Spin Controller)

**Files:**
- Create: `src/ui/AltarShopHudUi.ts`
- Modify: `src/ui/GameHud.ts`
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests for `AltarShopHudUi` pure helpers in `tests/hud-modules.test.ts`**
  Test: `getAltarRollControlState(enchantDice, enchantSpinning, enchantAutoRolling)` (ready, empty, spinning, auto-active) dan `renderAltarStripCardsHtml(state)` serta `renderShopWorldHudHtml(...)` attribute preservation (`data-action="back-to-mine"`, `open-pickaxe-shop`, `open-sell-shop`, `open-relic-forge`, `open-gem-shop`, `open-enchant-altar`, `open-gem-tower`, `roll-enchant`, `toggle-auto-enchant`, `buy-dice`).
- [ ] **Step 2: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Implement `src/ui/AltarShopHudUi.ts` & delegate from `src/ui/GameHud.ts`**
  Pindahkan `enchantSpinning`, `enchantSpinSafetyTimer`, `enchantAutoRolling`, `enchantAutoTimer`, `cancelSpinAndAutoRoll`, `finishEnchantSpin`, `stopEnchantAutoRoll`, `triggerSingleEnchantRoll`, `renderShopWorldHud`, `renderAltarHud`, `updateAltarLiveValues`, dan seluruh event binding Shop dock / Enchant Altar.
- [ ] **Step 4: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` & `npx tsc --noEmit` -> expect PASS**

---

### Task 5: Ekstrak `WorldOverlayHudUi.ts` (3D World Projected Overlays & Plot Labels)

**Files:**
- Create: `src/ui/WorldOverlayHudUi.ts`
- Modify: `src/ui/GameHud.ts`
- Test: `tests/hud-modules.test.ts`

- [ ] **Step 1: Write failing tests for `WorldOverlayHudUi` pure helpers in `tests/hud-modules.test.ts`**
  Test: `buildPlotLabelInfo(state, slotIndex)` (kosong vs terisi chibi dengan mutation & enchant), `shouldShowMineOreBars`, `shouldShowTowerOreBars`, `buildMineOreBarsHtml` (normal vs meteor ore bar), `buildTowerOreBarsHtml`, `buildShopAnchorsHtml`, `buildAltarAnchorsHtml`.
- [ ] **Step 2: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` -> expect FAIL**
- [ ] **Step 3: Implement `src/ui/WorldOverlayHudUi.ts` & delegate from `src/ui/GameHud.ts`**
  Pindahkan pembuatan 5 overlay layer `document.body`, `lastPlotLabelKeys`, `updateOreBars`, `updateTowerOreBars`, `spawnDamagePopup`, `syncSlotLabelToScene`, `syncAllPlotLabelsToScene`, `updatePlotAnchors`, `updateShopAnchors`, `updateShopChibiBubbles`, `updateAltarAnchors`, `resetPlotLayerKeysIfMineIdle`, dan `clearTransientOverlays`. Pertahankan seluruh method publik di `GameHud.ts` sebagai thin forwarders.
- [ ] **Step 4: Run `.\node_modules\.bin\vitest.cmd run tests/hud-modules.test.ts` & `npx tsc --noEmit` -> expect PASS**

---

### Task 6: Audit Ukuran File, Full Test & Build, Browser Smoke Test, Fresh Review & `GAME_MAP.md` Update

**Files:**
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Audit line counts (`GameHud.ts < 900`), zero `any`, clean imports across `src/ui/*.ts`**
- [ ] **Step 2: Run `npm.cmd test && npm.cmd run build`**
- [ ] **Step 3: Run live browser smoke test (`npm.cmd run dev` + `browser` subagent) on Mine Pit, Hotbar, Weather/DPS/Potions, Forge modal, Shop Plaza dock & Enchant Altar; stop daemon cleanly**
- [ ] **Step 4: Run fresh final reviewer (`self`) against Tahap B diff & design spec; fix any issues found**
- [ ] **Step 5: Update `GAME_MAP.md` inventory & line counts; re-run `npm.cmd test && npm.cmd run build` after final edit**
