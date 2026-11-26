# Tier `NOVEL` — Tab Baru Premium Shop (Gems), 3 Chibi Awal & Badge Minimalis Elegan

**Date:** 2026-11-26  
**Status:** Approved by user (pricing updated to +500K Gems step)

## Intent & Why
Menambahkan tier Chibi baru **`novel`** yang setara dengan tier **`twin`** (scaling world progresif, AoE/Ult 3-ore, non-sellable, 2 passive per unit), tetapi dibeli lewat **tab `Novel` baru di modal Premium Shop (`Shop`) menggunakan Gems** dengan harga termurah **2.5M Gems** (`2,500,000`). Fokus rilis awal ini adalah pemasangan **3 Chibi pertama** dari `C:\Users\HDD\Downloads\novel tier new\`, tab `Twin` + `Novel` di Premium Shop, integrasi sistem game/UI/Index, serta desain **badge tier `NOVEL` yang minimalis, memukau, dan elegan**—sementara animasi shader skill custom (`skills/*SkillVfx3D.ts`) dan back-attachment 3D ditunda untuk tahap berikutnya.

## Goals & Decisions
1. **3 Chibi `NOVEL` Awal (dari `C:\Users\HDD\Downloads\novel tier new\`)**:
   - Dipotong dari 4-pose RGBA sheet (`idle`, `walk`, `attack`, `pose`) ke `public/chibi/<id>/{idle,walk,attack,pose}.webp` (tinggi 300px, proporsional, crisp RGBA):
     1. **`crimson-tarot-witch`** — *Scarlet Arcana* (dari `gemini-generated-image-21ntcd21ntcd21nt-sheet-32px.png`, accent `#e11d48`)
        - Harga: **`2,500,000` Gems** (`2.5M`)
        - Power setara `Twin`: `dpsMult: 2.3`, `upgradeCostMult: 11`
        - 2 Passives: `+100% Team DMG • +40% Ore Sell` (`teamDmgPct: 1.0`, `oreSellPct: 0.4`)
     2. **`gilded-chain-noble`** — *Aurelia Noctis* (dari `gemini-generated-image-91w06691w06691w0-sheet-32px (1).png`, accent `#eab308`)
        - Harga: **`3,000,000` Gems** (`3M`, +500K step)
        - Power setara `Twin`: `dpsMult: 3.2`, `upgradeCostMult: 17.5`
        - 2 Passives: `+125% Team DMG • +75% Ore Drop` (`teamDmgPct: 1.25`, `oreDropPct: 0.75`)
     3. **`crimson-clock-marshal`** — *Chronos Imperator* (dari `gemini-generated-image-r0h5gqr0h5gqr0h5-sheet-32px.png`, accent `#a855f7`)
        - Harga: **`3,500,000` Gems** (`3.5M`, +500K step)
        - Power setara `Twin`: `dpsMult: 4.1`, `upgradeCostMult: 25`
        - 2 Passives: `+160% Team DMG • +110% Ore Sell` (`teamDmgPct: 1.6`, `oreSellPct: 1.1`)
   - Seluruhnya non-sellable (`isNonSellableChibi`), star-up dupe cost & salvage value setara `twin` (`[0, 1, 1, 1, 2, 3]` dupes; `60` Gems salvage), serta `getEffectiveChibiBaseDps` di-cap mengikuti `getUnlockedWorldScaleAnchor` dan `syncTwinCatalogDpsFromAnchor` (anti-carry, identik dengan `Twin`).

2. **Premium Shop 2-Tab (`Twin` & `Novel`)**:
   - `PremiumShopData.ts` diperluas mendukung `currency: 'coins' | 'gems'`, `coinCost?`, `gemCost?`, dan `rarity: 'twin' | 'novel'` (atau `NOVEL_SHOP_ITEMS` + helper terpadu `getPremiumShopItemByChibiId` & `getActivePremiumPassiveBonuses` agar pasif unik dari Twin + Novel otomatis terjumlah & diskalakan `+20%/star`).
   - `buyPremiumShopChibiDomain` mengecek mata uang sesuai item (`towerCoins` untuk `twin`, `gems` untuk `novel`) dan mengembalikan `'bought' | 'no_coins' | 'no_gems' | 'invalid'`.
   - `ShopModalsUi.ts` (`renderPremiumShopModal`):
     - Menambahkan tab switcher di bagian atas modal `Shop`: **`Twin`** (Spire Coins) dan **`Novel`** (Gems).
     - Header pill menampilkan saldo aktif sesuai tab (Spire Coins pada tab `Twin`, Gems pada tab `Novel` — atau keduanya tetap sinkron saat live update).
     - Grid & Inspector panel menampilkan badge `NOVEL`, base DPS, 2 passive pills, jumlah owned, dan tombol beli berikon Gem (`2.5M`, `3M`, `3.5M`).
     - Pembelian `Novel` tetap memicu `TwinSummonCutsceneController` (diperluas menerima `'twin' | 'novel'` dengan badge & judul yang sesuai) tanpa menulis shader baru.

3. **Badge Tier `NOVEL` Minimalis, Memukau, dan Elegan**:
   - File crest SVG statis ringan `public/badges/novel.svg` (tanpa `<feGaussianBlur>` / SMIL):
     - Desain **Obsidian-Ink & Champagne-Gold Editorial Crest**: plakat belah-ketupat ramping/beveled warna midnight-obsidian (`#0f111a` → `#1b1d2e`), garis bingkai tunggal presisi *hairline* gradien champagne-gold (`#fff7d6` → `#e8c272` → `#b88428`), aksen berlian kecil 4-titik di ujung kiri-kanan, dan tipografi **"NOVEL"** tegas ber-serif/editorial metallic ivory-gold agar tetap super tajam & mewah di ukuran penuh maupun `is-compact` (`38px` / `28px`).
   - `RARITY_BORDER.novel = '#e2b866'` (Champagne Gold), `rarityCardClasses` (`rarity-novel`), `renderRarityBadgeHtml` (`is-crest` memakai `/badges/novel.svg`), `hud-rarity.css` (border kartu dark-gold elegan + subtle metallic sheen, tanpa efek berisik).

4. **Integrasi Sistem Game & Index**:
   - **Index**: Tab baru `'novel'` di `ALL_INDEX_TABS` (`IndexRewardsDomain.ts` + `IndexModalUi.ts` + `IndexInspectorUi.ts`) dengan reward milestone 50%/100% (`8,000` Gems + `1` Dice / `25,000` Gems + `3` Dice + `+5% All DMG`).
   - **Combat & 3D (Tanpa Shader Baru / Back-Attachment)**:
     - `PlotAttackImpact3D.ts` & `TierMotionPath3D.ts`: perlakukan `'novel'` setara `'twin'` (`MAX_AOE_TARGETS = 3`, `AOE_CLEAVE_RADIUS = 3.8`, `areaScale = 1.0`, blitz speed & wide AoE).
     - `PlotAttackController3D.ts`: picu `skillPulseHook` (`1.1`) seperti `twin`.
     - `SignatureProjectilePool3D.ts`: gunakan `'star'` / `'crescent'` sesuai `accentColor`.
     - `TierVfxChoreography3D.ts`: `case 'novel':` memakai komposisi pooled VFX yang sudah ada (`spawnSlash` + `spawnRift` + `spawnBeam`/`spawnDome` + `spawnDebrisBurst`) terpusat di `(cx, cy, cz)` — tanpa membuat modul shader baru.
     - `ChibiBackAttachments3D.ts` / `ChibiBackFusionTierBuilders3D.ts`: tidak membangun back-attachment 3D untuk `'novel'` di tahap ini (`omegaAuraGroup` tetap `null`).
     - `TowerArena3D.ts`: tetap memakai Chibi `'twin'` untuk random Tower Boss (tidak mencampur `'novel'` sebagai Boss Tower kecuali diminta nanti).
     - `HudChromeRenderer.ts`: daftarkan `'novel'` di daftar crest preload/cut-in jika diperlukan agar Ult Cut-In menampilkan badge `/badges/novel.svg`.

## Non-Goals (Deferred)
- **Tidak** membuat shader skill 2.5s custom (`src/game3d/skills/*SkillVfx3D.ts`) pada tahap ini.
- **Tidak** membuat 3D back-attachment (`ChibiBackApexBuilders3D.ts` / `MeshFx*Shaders*.ts`) pada tahap ini.
- **Tidak** memasukkan 6 aset sisanya di `C:\Users\HDD\Downloads\novel tier new\` (hanya 3 unit awal dulu).

## Approaches Considered
- **Chosen — Unified `PremiumShopData` + Tabbed `ShopModalsUi` + Lightweight Crest & Pooled VFX**: Menggabungkan data `Twin` (Coins) dan `Novel` (Gems) dalam struktur `PremiumShopData` dengan tab UI di modal `Shop`, memanfaatkan `TwinSummonCutscene`, `IndexRewardsDomain`, dan pooled VFX existing sehingga minim duplikasi kode dan siap menampung sisa 6 aset berikutnya dengan hanya menambah data + sprite.
- **Rejected — Modal Shop terpisah untuk `Novel` atau 3 file `skills/*SkillVfx3D.ts` baru**: Bertentangan dengan permintaan user (tab `Twin` & `Novel` dalam satu Shop, dan tunda pengerjaan shader/back-attachment).
