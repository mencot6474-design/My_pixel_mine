# Tier `NOVEL` (Premium Shop Tab, 3 Chibi Awal & Badge Minimalis Elegan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan tier Chibi baru `'novel'` dengan tab kedua **`Novel`** di modal Premium Shop (`Shop`) berharga Gems (`2.5M / 3M / 3.5M`), 3 Chibi awal dari `C:\Users\HDD\Downloads\novel tier new\`, integrasi sistem/Index/3D parity setara `twin` tanpa shader/back-attachment custom baru, serta badge crest `NOVEL` yang minimalis, memukau, dan elegan.

**Architecture:** Memperluas `ChibiCatalog` + `PremiumShopData` untuk mendukung item `'twin'` (Spire Coins) dan `'novel'` (Gems) dalam satu domain terpadu yang mengembalikan status pembelian spesifik per mata uang dan menjumlahkan pasif unik keduanya (`+20%/star`). `ShopModalsUi` mendapat tab switcher `Twin` / `Novel` dengan pembaruan saldo/tombol real-time serta memperluas `TwinSummonCutscene` agar mendukung badge/tema `'novel'`. Sisi visual 3D menjaga parity AoE 3-ore/Ult `twin` lewat komposisi pooled VFX existing dan `omegaAuraGroup = null` (tanpa shader skill atau back-attachment baru).

**Tech Stack:** TypeScript, Three.js, Tailwind CSS v4, Vite, Vitest, Python Pillow (pemotongan sprite sheet RGBA `.png` -> `.webp`).

**Spec:** [2026-11-26-novel-tier-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-26-novel-tier-design.md)

## Global Constraints

- 3 Chibi awal dari `C:\Users\HDD\Downloads\novel tier new\`: `crimson-tarot-witch` (`2,500,000` Gems, `dpsMult: 2.3`, `upgradeCostMult: 11`, `+100% Team DMG • +40% Ore Sell`), `gilded-chain-noble` (`3,000,000` Gems, `dpsMult: 3.2`, `upgradeCostMult: 17.5`, `+125% Team DMG • +75% Ore Drop`), `crimson-clock-marshal` (`3,500,000` Gems, `dpsMult: 4.1`, `upgradeCostMult: 25`, `+160% Team DMG • +110% Ore Sell`).
- Strict TypeScript: zero `any`, semua fungsi/modul baru mematuhi `tsc --noEmit`.
- Badge `/badges/novel.svg` harus SVG statis ringan tanpa `<feGaussianBlur>` maupun animasi SMIL (`<animate*>`), desain minimalis-elegan Obsidian-Ink & Champagne-Gold.
- Tidak membuat file shader skill baru di `src/game3d/skills/` dan tidak membuat 3D back-attachment baru untuk `'novel'` di tahap ini (`omegaAuraGroup === null`).
- Verifikasi akhir wajib lulus `npm.cmd test` dan `npm.cmd run build`.

## Review Focus

- Pembelian item `Novel` ketika saldo `gems` kurang dari `2.5M` tidak boleh memotong `gems` atau `towerCoins`, dan harus mengembalikan `'no_gems'` (bukan `'no_coins'`), sedangkan item `Twin` tetap mengembalikan `'no_coins'` saat `towerCoins` kurang.
- Memasang 1 unit `Twin` + 1 unit `Novel` di plot secara bersamaan harus menjumlahkan seluruh 4 pasif mereka (dan duplikat ID yang sama tetap dihitung 1×), diskalakan `+20%/star`.
- Save/load dengan unit `novel` terpasang di `plotMiners`, `hotbar`, `miners`, dan `discovered` harus lolos validasi `isValidIndexId` dan `getEffectiveChibiBaseDps` harus meng-cap DPS `novel` sesuai `getUnlockedWorldScaleAnchor` (anti-carry di World 1).
- `TowerArena3D` tidak boleh memilih unit `'novel'` sebagai Boss Battle Tower acak (`pickRandomTowerBossChibiId` tetap khusus `'twin'`), dan `isNonSellableChibi` wajib melindungi `'novel'` dari Sell Shop.
- Tab `Novel` dan tab `Twin` di `ShopModalsUi` harus menjaga `lastShopInspectorHtml` & event binding saat berpindah tab serta tidak memicu double-buy saat `TwinSummonCutscene` aktif.

---

### Task 1: Slice 3 Asset Sprite Chibi `NOVEL` & Buat Crest SVG Minimalis `novel.svg`

**Files:**
- Create: `public/chibi/crimson-tarot-witch/{idle,walk,attack,pose}.webp`
- Create: `public/chibi/gilded-chain-noble/{idle,walk,attack,pose}.webp`
- Create: `public/chibi/crimson-clock-marshal/{idle,walk,attack,pose}.webp`
- Create: `public/badges/novel.svg`

**Interfaces:**
- Produces:
  - 12 file `.webp` RGBA (`height === 300`, lossless/high-quality WebP, cropped tight per frame) di `public/chibi/<id>/`
  - `public/badges/novel.svg` (static crest SVG tanpa `<feGaussianBlur>` dan tanpa SMIL `<animate*>`).

- [ ] **Step 1: Potong 3 sprite sheet dari `C:\Users\HDD\Downloads\novel tier new\` ke `public/chibi/<id>/`**

Jalankan skrip Python Pillow untuk membagi tiap sheet horizontal `4`-frame (`0=idle`, `1=walk`, `2=attack`, `3=pose`), trim alpha bounding box per frame, resize tinggi `300px` (`Image.Resampling.LANCZOS`), dan simpan sebagai `.webp` RGBA (`quality=92`, `method=6`):
- `gemini-generated-image-21ntcd21ntcd21nt-sheet-32px.png` → `public/chibi/crimson-tarot-witch/{idle,walk,attack,pose}.webp`
- `gemini-generated-image-91w06691w06691w0-sheet-32px (1).png` → `public/chibi/gilded-chain-noble/{idle,walk,attack,pose}.webp`
- `gemini-generated-image-r0h5gqr0h5gqr0h5-sheet-32px.png` → `public/chibi/crimson-clock-marshal/{idle,walk,attack,pose}.webp`

- [ ] **Step 2: Verifikasi dimensi dan integritas 12 file `.webp`**

Run: `python -c "from PIL import Image; import glob; files=sorted(glob.glob('public/chibi/{crimson-tarot-witch,gilded-chain-noble,crimson-clock-marshal}/*.webp')); print(len(files), [(f, Image.open(f).size, Image.open(f).mode) for f in files])"`
Expected: `12` file, semua mode `RGBA`, tinggi `300`.

- [ ] **Step 3: Buat `public/badges/novel.svg` (Minimalist Obsidian × Champagne-Gold Crest)**

Desain SVG (`viewBox="0 0 640 240"` agar proporsional saat dirender `height: 44px` / `38px` di `.mam-rarity-badge.is-crest`):
- Plakat beveled *editorial diamond-pill* gelap obsidian (`#0d101b` → `#171c2e`), tanpa sayap besar/berisik.
- Garis bingkai *hairline* ganda champagne-gold (`#fff7d6` → `#e5be67` → `#a97622`), aksen 4-point star/diamond kecil simetris kiri-kanan, dan teks `"NOVEL"` ber-stroke obsidian tipis + gradient metallic ivory-champagne tajam.
- Tanpa `<feGaussianBlur>` dan tanpa tag `<animate>`/`<animateTransform>`.

- [ ] **Step 4: Verifikasi isi `public/badges/novel.svg`**

Run: `Select-String -Path public/badges/novel.svg -Pattern "feGaussianBlur|<animate"`
Expected: Tidak ada output (0 match).

- [ ] **Step 5: Commit aset**

```bash
git add public/chibi/crimson-tarot-witch public/chibi/gilded-chain-noble public/chibi/crimson-clock-marshal public/badges/novel.svg
git commit -m "assets: add 3 initial Novel chibi sprites and minimalist novel crest badge"
```

---

### Task 2: Domain Data `novel` Tier, `PremiumShopData` Multi-Currency & `GameData`/`GameState`

**Files:**
- Modify: `src/game3d/ChibiCatalog.ts:3-20,1010-1030`
- Modify: `src/game/PremiumShopData.ts:1-181`
- Modify: `src/game/GameData.ts:104-120,260-320,968-1025`
- Modify: `src/game/DailyLoginData.ts:86-98`
- Modify: `src/game/GameState.ts:710-725`
- Modify: `src/game/IndexRewardsDomain.ts:15-70,210-275`
- Test: `tests/state-modules.test.ts`

**Interfaces:**
- Produces:
  - `ChibiRarity` includes `'novel'` in `src/game3d/ChibiCatalog.ts`; 3 `CHIBI_CATALOG` entries (`crimson-tarot-witch`, `gilded-chain-noble`, `crimson-clock-marshal`) with `rarity: 'novel'`.
  - `PremiumShopCurrency = 'coins' | 'gems'`; `PremiumShopItemDef` supports `rarity: 'twin' | 'novel'`, `currency: PremiumShopCurrency`, `coinCost?: number`, `gemCost?: number`.
  - `NOVEL_SHOP_ITEMS: readonly PremiumShopItemDef[]`, `ALL_PREMIUM_SHOP_ITEMS: readonly PremiumShopItemDef[]`, `getPremiumShopItemsByRarity(rarity: 'twin' | 'novel'): readonly PremiumShopItemDef[]`.
  - `buyPremiumShopChibiDomain(ctx, chibiId)` & `GameState.buyPremiumShopItem(chibiId)` return `'bought' | 'no_coins' | 'no_gems' | 'invalid'` (with `gems: number` on `PremiumShopBuyContext`).
  - `RARITY_BORDER.novel = '#e2b866'`, `CHIBI_SALVAGE_GEMS_BY_RARITY.novel = 60`, `STAR_DUP_COSTS_BY_RARITY.novel = [0, 1, 1, 1, 2, 3]`, `getEffectiveChibiBaseDps` & `syncTwinCatalogDpsFromAnchor` scale `'novel'` via `computeTwinScaledBaseDps`.
  - `IndexTabId` includes `'novel'`, `ALL_INDEX_TABS` includes `'novel'`, `TAB_MILESTONE_CONFIG.novel = { half: { gems: 8000, enchantDice: 1 }, full: { gems: 25000, enchantDice: 3, passive: { kind: 'allDmgPct', value: 0.05, label: '+5% All DMG' } } }`.

- [ ] **Step 1: Write failing tests in `tests/state-modules.test.ts`**

Tambahkan spec baru di `tests/state-modules.test.ts` untuk:
1. `NOVEL_SHOP_ITEMS` memiliki 3 unit (`2_500_000`, `3_000_000`, `3_500_000` Gems), masing-masing punya tepat 2 pasif non-zero dan `rarity === 'novel'`.
2. `buyPremiumShopItem`: beli `crimson-tarot-witch` mengembalikan `'no_gems'` saat `gems < 2_500_000` (tanpa mengubah `gems`/`towerCoins`), dan `'bought'` saat cukup, memotong `2_500_000` Gems, mengisi `miners`/`hotbar`/`discovered`; item `twin` masih mengembalikan `'no_coins'` saat `towerCoins` kurang.
3. `getActivePremiumPassives` menjumlahkan pasif unik dari `Twin` + `Novel` bersamaan (`+20%/star`), dan menolak duplikat ID yang sama.
4. `isNonSellableChibi` bernilai `true` untuk ke-3 unit `novel`, `getEffectiveChibiBaseDps` melakukan cap anti-carry untuk `'novel'` berdasarkan `unlockedWorlds`, `getNextChibiStarTierFor` memakai `[0, 1, 1, 1, 2, 3]`, dan `getIndexTabEntryIds('novel')` berisi 3 ID `novel` dengan total Index naik `+3`.
5. `save/load` round-trip (`serializeSavePayload` / `deserializeSaveJson`) mempertahankan unit `novel` pada `miners`, `plotMiners`, `hotbar`, `discovered`, dan `chibiStars`, serta `pickRandomTowerBossChibiId` tidak pernah memilih rarity `'novel'`.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npx.cmd vitest run tests/state-modules.test.ts -t "Novel"`
Expected: FAIL because `'novel'` / `NOVEL_SHOP_ITEMS` does not exist yet.

- [ ] **Step 3: Implement `'novel'` catalog & domain logic across `ChibiCatalog.ts`, `PremiumShopData.ts`, `GameData.ts`, `DailyLoginData.ts`, `IndexRewardsDomain.ts`, and `GameState.ts`**

- Di `src/game3d/ChibiCatalog.ts`: tambah `'novel'` pada `ChibiRarity` dan daftarkan `crimson-tarot-witch`, `gilded-chain-noble`, `crimson-clock-marshal` (`poseScale: 1.24`, `smoothFilter: true`).
- Di `src/game/PremiumShopData.ts`: pisah `PREMIUM_SHOP_ITEMS` (6 `twin` Coins — tetap export agar existing imports/tests tidak pecah) + `NOVEL_SHOP_ITEMS` (3 `novel` Gems: `2_500_000`, `3_000_000`, `3_500_000`), ekspor `ALL_PREMIUM_SHOP_ITEMS` & `getPremiumShopItemsByRarity`, lookup `getPremiumShopItemByChibiId` & `getActivePremiumPassiveBonuses` cek `ALL_PREMIUM_SHOP_ITEMS`, dan `buyPremiumShopChibiDomain` dukung `currency: 'coins' | 'gems'`.
- Di `src/game/GameData.ts`: tambah `RARITY_BORDER.novel = '#e2b866'`, `CHIBI_SALVAGE_GEMS_BY_RARITY.novel = 60`, `STAR_DUP_COSTS_BY_RARITY.novel = [0, 1, 1, 1, 2, 3]`, serta update `getEffectiveChibiBaseDps` & `syncTwinCatalogDpsFromAnchor` memakai `ALL_PREMIUM_SHOP_ITEMS`.
- Di `src/game/DailyLoginData.ts`: tambah `rarity === 'novel'` pada `isNonSellableChibi`.
- Di `src/game/IndexRewardsDomain.ts`: tambah `'novel'` ke `IndexTabId`, `ALL_INDEX_TABS` (setelah `'twin'`), `TAB_MILESTONE_CONFIG.novel`, dan `getIndexTabEntryIds` (`NOVEL_SHOP_ITEMS.map((item) => item.chibiId)`).
- Di `src/game/GameState.ts`: berikan getter/setter `gems` pada context `buyPremiumShopItem` dan update return type menjadi `'bought' | 'no_coins' | 'no_gems' | 'invalid'`.

- [ ] **Step 4: Run Vitest on state tests**

Run: `npx.cmd vitest run tests/state-modules.test.ts`
Expected: PASS seluruh specs.

- [ ] **Step 5: Commit domain layer**

```bash
git add src/game3d/ChibiCatalog.ts src/game/PremiumShopData.ts src/game/GameData.ts src/game/DailyLoginData.ts src/game/IndexRewardsDomain.ts src/game/GameState.ts tests/state-modules.test.ts
git commit -m "feat(game): add novel chibi tier, gems shop items, scaling, and index tab"
```

---

### Task 3: UI Styling Badge/Card `NOVEL`, Tabbed `ShopModalsUi`, Cutscene, Index & Inventory

**Files:**
- Modify: `src/styles/hud-base.css:399-461`
- Modify: `src/ui/HudShared.ts:54-96`
- Modify: `src/ui/HudChromeRenderer.ts:365-385`
- Modify: `src/ui/ShopModalsUi.ts:18-95,251-345,587-602,650-681,819-832`
- Modify: `src/ui/TwinSummonCutscene.ts:224-310,415-465`
- Modify: `src/ui/IndexModalUi.ts:45-85,150-175,450-490,635-650`
- Modify: `src/ui/IndexInspectorUi.ts:110-135,295-310`
- Modify: `src/ui/InventoryModalUi.ts:275-285`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `NOVEL_SHOP_ITEMS`, `ALL_PREMIUM_SHOP_ITEMS`, `getPremiumShopItemsByRarity`, `getPremiumShopItemByChibiId`, `GameState.buyPremiumShopItem` from Task 2.
- Produces:
  - `ShopModalsUi.premiumShopTab: 'twin' | 'novel'` (default `'twin'`), tab switcher `[data-premium-tab="twin" | "novel"]`, header balance pill showing Coins on `Twin` tab & Gems on `Novel` tab (updating live in `updatePremiumShopLive`), Gem icon + formatted price (`2,500,000` / `3,000,000` / `3,500,000`) on `Novel` cards & inspector, and `'no_gems'` toast `'Not enough Gems!'`.
  - `renderRarityBadgeHtml('novel')` renders `<span class="mam-rarity-badge mam-rarity-novel is-crest...">` with `/badges/novel.svg`.
  - `TwinSummonCutscene.start` & `buildTwinFullscreenRevealDomHtml` render `'novel'` badge & label when `item.rarity === 'novel'`.

- [ ] **Step 1: Write failing tests in `tests/hud-modules.test.ts`**

Tambahkan spec baru di `tests/hud-modules.test.ts` untuk:
1. `renderRarityBadgeHtml('novel')` memakai `/badges/novel.svg` dengan class `mam-rarity-novel is-crest`, dan `rarityCardClasses('novel')` memuat `rarity-novel`.
2. `ShopModalsUi.renderPremiumShopModal()` menampilkan 2 tab (`Twin` & `Novel`); klik tab `Novel` menampilkan 3 kartu `Novel` (harga termurah `2,500,000` Gems, ikon Gem, 2 pasif, inspector Gem cost); klik beli saat `gems` kurang memicu toast `'Not enough Gems!'` dan tidak membuka cutscene; saat `gems` cukup memotong Gems dan membuka fullscreen cutscene dengan badge `novel`.
3. `IndexModalUi` menampilkan tab sidebar `Novel` (`0/3`) & inspect detail Chibi `Novel` menampilkan cost Gems dan 2 pasif.

- [ ] **Step 2: Run targeted HUD test to verify failure**

Run: `npx.cmd vitest run tests/hud-modules.test.ts -t "Novel"`
Expected: FAIL.

- [ ] **Step 3: Implement badge/card CSS, tabbed `ShopModalsUi`, `TwinSummonCutscene`, `IndexModalUi`/`IndexInspectorUi`, `InventoryModalUi`, & `HudChromeRenderer`**

- Di `src/styles/hud-base.css`: tambah `.mam-card.rarity-novel` (gradient Champagne-Ivory & Rose-Gold silk mewah dengan border `3px solid #14111d` & teks `#14111d` kontras tajam).
- Di `src/ui/HudShared.ts`: tambah `'novel'` di `rarityCardClasses` dan `renderRarityBadgeHtml` (`is-crest` `/badges/novel.svg`).
- Di `src/ui/HudChromeRenderer.ts`: tambah `'novel'` di `VALID_CUTIN_RARITIES`.
- Di `src/ui/InventoryModalUi.ts`: tambah `rarity === 'novel'` pada `isHolo`.
- Di `src/ui/IndexModalUi.ts` & `src/ui/IndexInspectorUi.ts`: tambah case `'novel'` pada `IndexModalUi` (`specialSpecs`, filtering/sort, `TAB_IDS`) dan inspector/review dialog `IndexInspectorUi` (menampilkan Gem cost vs Coin cost sesuai `item.currency`).
- Di `src/ui/TwinSummonCutscene.ts`: gunakan `item.rarity` pada `renderRarityBadgeHtml` & subtitle/badge cutscene (baca seluruh tempat hardcoded `'twin'` di `TwinSummonCutscene.ts` terlebih dahulu agar lengkap).
- Di `src/ui/ShopModalsUi.ts`: tambah `private premiumShopTab: 'twin' | 'novel' = 'twin'`, tab switcher `[data-premium-tab]`, render grid & inspector dinamis sesuai `currency` (`spireCoinIconHtml` vs `hudIconHtml('gem', ...)`), update `updatePremiumShopLive` untuk kedua mata uang & tab aktif, dan toast `'Not enough Gems!'` untuk `'no_gems'`.

- [ ] **Step 4: Run Vitest on HUD tests**

Run: `npx.cmd vitest run tests/hud-modules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit UI & styling**

```bash
git add src/styles/hud-base.css src/ui/HudShared.ts src/ui/HudChromeRenderer.ts src/ui/ShopModalsUi.ts src/ui/TwinSummonCutscene.ts src/ui/IndexModalUi.ts src/ui/IndexInspectorUi.ts src/ui/InventoryModalUi.ts tests/hud-modules.test.ts
git commit -m "feat(ui): add Novel tab to Premium Shop, Index tab, and minimalist Novel badge"
```

---

### Task 4: Parity Mekanik 3D (`novel` Setara `twin`, Tanpa Shader Baru / Back-Attachment) & Update `GAME_MAP.md`

**Files:**
- Modify: `src/game3d/PlotAttackImpact3D.ts:86-100`
- Modify: `src/game3d/PlotAttackController3D.ts:390-396`
- Modify: `src/game3d/TierMotionPath3D.ts:200-220,460-470`
- Modify: `src/game3d/SignatureProjectilePool3D.ts:82-95`
- Modify: `src/game3d/TierVfxChoreography3D.ts:435-450`
- Modify: `GAME_MAP.md`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `CHIBI_CATALOG` `'novel'` entries from Task 2.
- Produces:
  - `isWideAoeRarity('novel') === true`, `getAoeTargetCount('novel') === 3`, `getAoeCleaveRadius('novel') === AOE_CLEAVE_RADIUS`, `getChibiAttackStyle` returns `'star'` / `'twin'` cleanly for `'novel'`, `createChibiBackAttachments` leaves `omegaAuraGroup === null` for `'novel'`, and `fireTierAttackChoreography` handles `case 'novel':` using existing pooled slash/rift/beam/dome/debris calls.

- [ ] **Step 1: Write failing tests in `tests/world-3d.test.ts`**

Tambahkan spec di `tests/world-3d.test.ts`:
1. `isWideAoeRarity('novel')` bernilai `true` dan `getAoeTargetCount('novel')` bernilai `3` (setara `'twin'`).
2. `buildTierMotionWaypoints` untuk `rarity: 'novel'` menghasilkan jalur blitz wide-AoE yang valid di atas arena.
3. `createChibiBackAttachments` untuk `'crimson-tarot-witch'` (`rarity: 'novel'`) tidak membuat back-attachment (`omegaAuraGroup === null`), dan `fireTierAttackChoreography` dengan `rarity: 'novel'` berjalan bersih memicu pooled VFX tanpa error.

- [ ] **Step 2: Run targeted 3D test to verify failure**

Run: `npx.cmd vitest run tests/world-3d.test.ts -t "novel"`
Expected: FAIL because `isWideAoeRarity('novel')` returns `false`.

- [ ] **Step 3: Update 3D parity helpers & `GAME_MAP.md`**

- Di `src/game3d/PlotAttackImpact3D.ts`: tambahkan `|| rarity === 'novel'` pada `getAoeTargetCount`, `getAoeCleaveRadius`, dan `getRarityVfxScale`.
- Di `src/game3d/PlotAttackController3D.ts`: tambahkan `|| r === 'novel'` pada `skillPulseHook` (intensitas `1.1`).
- Di `src/game3d/TierMotionPath3D.ts`: tambah `case 'novel': return '#fbbf24';`, tambah `|| rarity === 'novel'` pada `isWideAoeRarity`, dan tambah `case 'novel':` pada `buildTierMotionWaypoints` (zig-zag burst hero waypoints terpusat di `(cx, cy, cz)`).
- Di `src/game3d/SignatureProjectilePool3D.ts`: petakan `def.rarity === 'novel'` ke `'star'`.
- Di `src/game3d/TierVfxChoreography3D.ts`: tambah `case 'novel':` dengan komposisi pooled existing (`onArenaDim`, `spawnSlash`, `spawnRift`, `spawnBeam`, `spawnDome`, `spawnDebrisBurst` ke `pts` tanpa shader file baru).
- Perbarui `GAME_MAP.md` (jumlah chibi `89 -> 92`, badge `3 -> 4`, Index `19 tabs / 175 entries`, baris modul yang diubah, & catatan update terbaru).

- [ ] **Step 4: Run full test suite & production build**

Run: `npm.cmd test && npm.cmd run build`
Expected: Seluruh unit test Vitest (`state-modules`, `hud-modules`, `world-3d`) PASS, `tsc --noEmit` & `vite build` exit code `0`.

- [ ] **Step 5: Commit 3D parity & docs**

```bash
git add src/game3d/PlotAttackImpact3D.ts src/game3d/PlotAttackController3D.ts src/game3d/TierMotionPath3D.ts src/game3d/SignatureProjectilePool3D.ts src/game3d/TierVfxChoreography3D.ts GAME_MAP.md tests/world-3d.test.ts
git commit -m "feat(3d): wire novel tier combat parity and update GAME_MAP.md"
```
