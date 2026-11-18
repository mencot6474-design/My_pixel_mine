# Design Spec: Tahap B — Modularisasi `src/ui/GameHud.ts` (Opsi 2)

## 1. Intent & Scope
Memecah [GameHud.ts](../../../src/ui/GameHud.ts) (`2,353` baris) menjadi koordinator HUD tipis (`< ~900` baris, sesuai standar `< ~800–1,000` baris di [GAME_MAP.md](../../../GAME_MAP.md)) dengan mengekstrak 4 modul domain baru di `src/ui/` serta merapikan helper scroll dan handler Forge agar konsisten dengan sub-UI modal lain (`ShopModalsUi`, `UpgradesWorldsUi`, `TowerUi`, `PlotInspectUi`, `TutorialUi`).

**Batasan ketat:**
- Tidak mengubah tampilan visual, layout, teks, aturan gameplay, CSS class (`mam-*`, `TW_*`), selector `data-*`, `pointer-events`, maupun angka `tabular-nums`.
- Tidak mengubah signature constructor maupun public API `GameHud` yang dipanggil oleh [main.ts](../../../src/main.ts).
- Tidak menyentuh `src/game/GameState.ts` (masuk **Tahap C**).

## 2. Arsitektur Modul & Pembagian Tanggung Jawab

1. **[HudShared.ts](../../../src/ui/HudShared.ts)** *(update)*
   - Memindahkan helper preservasi scroll dari `GameHud.ts` (`SavedScrollEntry`, `getElementPath`, `captureRootScrolls`, `restoreRootScrolls`, ~`47` baris).

2. **[ForgeModalUi.ts](../../../src/ui/ForgeModalUi.ts)** *(update)*
   - Memindahkan inline Forge click/action handling dari `GameHud.ts` `bindEvents()` (~`45` baris: `inspect-forge`, `forge-tab`, `forge-ore-info`, `forge-ore-info-close`, `forge-craft`, `forge-equip-toggle`, `forge-unequip`) ke method `bindEvents(modalRoot: HTMLElement)` milik `ForgeModalUi`, dengan injeksi `pushToast` dan `onRequestRender` melalui constructor agar seragam dengan sub-UI lainnya.

3. **`src/ui/WorldOverlayHudUi.ts`** *(baru, estimasi ~390–430 baris)*
   - Mengelola 5 overlay layer `document.body` (`plotLayerEl`, `oreBarLayerEl`, `dmgLayerEl`, `shopLayerEl`, `shopBubbleLayerEl`) dan `lastPlotLabelKeys`.
   - Menampung seluruh proyeksi/overlay 3D-to-screen: `updatePlotAnchors`, `syncSlotLabelToScene`, `syncAllPlotLabelsToScene`, `updateChestAnchor`, `updateOreBars`, `updateTowerOreBars`, `spawnDamagePopup`, `updateShopAnchors`, `updateShopChibiBubbles`, dan `updateAltarAnchors`, beserta aturan visibilitas overlay saat modal aktif / ad paused / tutorial.

4. **`src/ui/WeatherDpsHudUi.ts`** *(baru, estimasi ~375–420 baris)*
   - Memegang state popover widget: `weatherPopoverOpen`, `weatherInspectId`, `dpsMeterOpen`.
   - Mengekspor pure builder/formatter functions (`formatWeatherTimer`, `buildActivePotionsDockContent`, `buildWeatherWidgetInnerHtml`, `buildDpsMeterInnerHtml`) agar dapat diuji langsung lewat Vitest tanpa DOM penuh.
   - Menangani `render*`, `bind*Events`, dan `sync*Widget` live update untuk Active Potions dock, Weather Forecast + inspect popover, serta DPS Meter.

5. **`src/ui/HotbarHudUi.ts`** *(baru, estimasi ~320–360 baris)*
   - Memegang state drag-and-drop hotbar (`hotbarDrag`) serta listener pointer/click global tanpa duplikasi listener antar render.
   - Menampung `renderHotbarBagButton`, `renderHotbarSlots`, `cleanupHotbarDrag`, `updateHotbarDropHighlight`, `updateHotbarPlotDropPreview`, `getHotbarSlotAtPoint`, `canDropHotbarOnPlot`, `bindHotbarEvents`, dan `updateHotbarLive`.

6. **`src/ui/AltarShopHudUi.ts`** *(baru, estimasi ~280–320 baris)*
   - Memegang state spin & auto-roll Enchant Altar (`enchantSpinning`, `enchantAutoRolling`, plus getter status untuk koordinator).
   - Menampung `renderShopWorldHud`, `renderAltarHud`, `triggerSingleEnchantRoll`, `finishEnchantSpin`, `stopEnchantAutoRoll`, `updateAltarLiveValues`, serta event binding HUD Shop Plaza & Enchant Altar.

7. **[GameHud.ts](../../../src/ui/GameHud.ts)** *(thin coordinator, target ~760–880 baris)*
   - Hanya menyimpan state koordinasi global (`activeModal`, `sceneMode`, `inspectedSlot`, `adPaused`, `toasts`), scaling viewport, topbar/currency/audio rail, router `renderModal()`, toast stack, keyboard shortcut, interval 100ms/1000ms yang mendelegasikan live sync, inisialisasi sub-UI, serta pass-through public API untuk `main.ts`.

## 3. Verifikasi & Aturan Kerja
- **Strict TypeScript:** nol `any`, patuhi `noUnusedLocals` & `noUnusedParameters`, pertahankan lifecycle listener & timer bersih.
- **Unit Test Baru (`tests/hud-modules.test.ts`):** menguji pure helpers dari `WeatherDpsHudUi` (`formatWeatherTimer`, builder HTML/konten Weather, DPS, Active Potions), `HotbarHudUi` (`canDropHotbarOnPlot` / guard drag), serta helper DOM-agnostic di `HudShared`.
- **Verifikasi Wajib (`GAME_MAP.md` §1.2):**
  1. `npm.cmd test` (semua spec `tests/world-3d.test.ts` + `tests/hud-modules.test.ts` lulus)
  2. `npm.cmd run build` (`tsc --noEmit && vite build` exit 0)
  3. Live browser smoke-test via `npm.cmd run dev` + browser verification (Mine Pit HUD, Hotbar, Weather/DPS/Potions, Forge modal, Shop Plaza / Altar HUD) + nol console/page errors.
  4. Perbarui [GAME_MAP.md](../../../GAME_MAP.md) untuk modul baru dan line counts terbaru.
- **Git constraint:** Jangan jalankan `git commit` atau `git push` sebelum user memberi perintah eksplisit.
