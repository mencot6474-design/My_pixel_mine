# Design Spec: World 11 (`Nightmare Hollow`) & World 12 (`Eclipse Singularity`) Expansion + Rift Tiers 11–12

- **Tanggal**: 2026-11-25
- **Scope**: Opsi A — Core Worlds W11–W12 + Rift Tier 11–12
- **Status**: Disetujui user (Opsi A + verifikasi Fever Ult Cut-In Banner untuk 10 Chibi W11–W12)

---

## 1. Tujuan & Batasan

Menambahkan dua World endgame baru setelah World 10 (`Elysium Core`) lengkap dengan aset visual dari user (10 sprite sheet Chibi, 2 banner World, 10 sprite Ore), tangga ekonomi `×1.000`+, Research Tree, Index Tabs, 3D Arena Biomes/Sky/Rune Floor, serta memperpanjang target DPS check **Dimensional Rift** ke Tier 11 dan Tier 12.

### Non-Goals (Di luar cakupan)
- Tidak menambah Pickaxe W9–W12 atau Relic W9–W12 (Opsi C ditunda; Pickaxe/Relic tetap sampai W8).
- Tidak menambah lantai baru Battle Tower (`TOWER_MAX_FLOOR = 80` tetap W1–W8) maupun Boss Omega/Anomaly baru.
- Tidak membuat custom 2.5s Sakuga shader baru khusus miner World biasa (mengikuti pola W9–W10 dengan shader tier `legendary`–`secret` + 3D Sakuga back-attachment per rarity).

---

## 2. Pendekatan (Approaches) yang Dipertimbangkan

1. **Opsi A — Core Worlds W11–W12 + Rift Tier 11–12 *(Dipilih)***
   - Menambahkan seluruh sistem World 11 & 12 (Aset, Ekonomi/Scaling/Drop Nerf, Research, Index, 3D Biomes/Rune Floor, Tests) plus memperpanjang `RIFT_TIER_DEFS` hingga Tier 11 (`5e34`, `11` Shards) & Tier 12 (`5e37`, `12` Shards).
   - *Trade-off*: Memberi progresi target endgame baru di Rift untuk pemain W11–W12 tanpa memblokir implementasi dengan kebutuhan membuat sprite Pickaxe/Relic baru.
2. **Opsi B — Pure Core Worlds W11–W12 (pola W9–W10)**
   - Hanya menambah W11–W12 tanpa memperpanjang `RIFT_TIER_DEFS`.
   - *Trade-off*: Lebih terisolasi, namun Rift tetap mentok di Tier 10 (`5e31`) meskipun DPS pemain naik ke skala `1e35+`.
3. **Opsi C — Full Expansion (+ Pickaxe & Relic W9–W12)**
   - Menambah Pickaxe & Relic untuk W9–W12 di samping Opsi A.
   - *Trade-off*: Membutuhkan pembuatan ikon 2D baru dan rebalancing menyeluruh di Shop/Forge.

---

## 3. Identitas & Asset Pipeline

### 3.1 World 11 — `Nightmare Hollow` (`id: 'nightmare'`)
- **Banner (`public/worlds/nightmare.webp`)**: `1376×768` RGB WebP dari `media_1795603336474_add89c0b.jpg`.
- **5 Ores (`public/ores/<id>.webp`, `256×256` RGBA transparent, white-keyed cutout)**:
  1. `bramblethorn` (`Bramblethorn`, `legendary`) ← `media_1795603390734_8010df4a.jpg`
  2. `bloodmoonite` (`Bloodmoonite`, `rainbow`) ← `media_1795603510743_78128919.jpg`
  3. `mawfang` (`Mawfang`, `mythic`) ← `media_1795603544253_c8ac60df.jpg`
  4. `oculite` (`Oculite`, `exotic`) ← `media_1795603590568_6139be7b.jpg`
  5. `vortexspire` (`Vortexspire`, `secret`) ← `media_1795603627963_59b672a7.jpg`
- **5 Chibis (`public/chibi/<id>/{idle,walk,attack,pose}.webp`, `~300px` height RGBA WebP, semua menghadap kanan)**:
  1. `bramble-cat` (`Bramble Cat`, `legendary`, `#2dd4bf`) ← `gemini-generated-image-y99igty99igty99i-sheet-32px.png`
  2. `cleaver-bunny` (`Cleaver Bunny`, `rainbow`, `#f43f5e`) ← `gemini-generated-image-300guf300guf300g-sheet-32px.png`
  3. `maw-devourer` (`Maw Devourer`, `mythic`, `#dc2626`) ← `gemini-generated-image-20by8r20by8r20by-sheet-32px.png`
  4. `abyss-watcher` (`Abyss Watcher`, `exotic`, `#94a3b8`) ← `gemini-generated-image-nzak5ynzak5ynzak-sheet-32px.png`
  5. `spiral-ringmaster` (`Spiral Ringmaster`, `secret`, `#a855f7`) ← `gemini-generated-image-1dbmso1dbmso1dbm-sheet-32px.png` *(bersihkan celah garis putih vertikal di tepi kanan kursi pose `attack`)*

### 3.2 World 12 — `Eclipse Singularity` (`id: 'singularity'`)
- **Banner (`public/worlds/singularity.webp`)**: `1376×768` RGB WebP dari `media_1795603697358_1966f9a3.jpg`.
- **5 Ores (`public/ores/<id>.webp`, `256×256` RGBA transparent, white-keyed cutout)**:
  1. `azurespiral` (`Azurespiral`, `legendary`) ← `media_1795603735711_176bbee0.jpg`
  2. `crimsongaze` (`Crimsongaze`, `rainbow`) ← `media_1795603765601_a1917b1a.jpg`
  3. `duallance` (`Duallance`, `mythic`) ← `media_1795603802685_14521906.jpg`
  4. `eventhorizon` (`Eventhorizon`, `exotic`) ← `media_1795603889356_2bca7f6c.jpg`
  5. `sovereigneclipse` (`Sovereigneclipse`, `secret`) ← `media_1795603943510_11f8eafb.jpg`
- **5 Chibis (`public/chibi/<id>/{idle,walk,attack,pose}.webp`, `~300px` height RGBA WebP, semua menghadap kanan)**:
  1. `azure-esper` (`Azure Esper`, `legendary`, `#38bdf8`) ← `gemini-generated-image-byq8vbbyq8vbbyq8-sheet-32px.png`
  2. `crimson-esper` (`Crimson Esper`, `rainbow`, `#fb7185`) ← `gemini-generated-image-cmc06tcmc06tcmc0-sheet-32px.png`
  3. `fate-duelist` (`Fate Duelist`, `mythic`, `#3b82f6`) ← `gemini-generated-image-o878peo878peo878-sheet-32px.png`
  4. `horizon-walker` (`Horizon Walker`, `exotic`, `#cbd5e1`) ← `gemini-generated-image-1fh0871fh0871fh0-sheet-32px.png`
  5. `eclipse-monarch` (`Eclipse Monarch`, `secret`, `#ef4444`) ← `gemini-generated-image-qg0cckqg0cckqg0c-sheet-32px.png`

---

## 4. Ekonomi, Scaling & Sistem Game

### 4.1 `GameData.ts` & `ChibiCatalog.ts`
- **`WorldId`**: tambahkan `'nightmare' | 'singularity'` (total 12 World).
- **`WORLD_GRIND_SCALE`**:
  - `nightmare` (`w=10`): `4_500`
  - `singularity` (`w=11`): `10_000`
- **`WORLDS`**:
  - `nightmare`: `iconColor: '#a855f7'`, `unlockCost: 2.4e37` (`12e6 * 1e27 * 2000`), `oreHpMult: 3.99168e37` (`W10 * 11_000`)
  - `singularity`: `iconColor: '#ef4444'`, `unlockCost: 5.4e40` (`12e6 * 1e30 * 4500`), `oreHpMult: 4.790016e41` (`W11 * 12_000`)
- **`WORLD_UPGRADE_COST_SCALE`**:
  - `nightmare`: `4.5e33` (`1e30 * 4_500`)
  - `singularity`: `1e37` (`1e33 * 10_000`)
- **Starter Chibi Grant (`unlockWorldDomain`)**: otomatis memberi `bramble-cat` saat unlock W11 dan `azure-esper` saat unlock W12.
- **Ore `sellValue` & `chancePct`** (nerfed Index curve):
  - W11: `[3.5e31, 1.1e32, 3.8e32, 1.8e33, 1.4e34]`, chance `[89.6846, 9.7, 0.6, 0.015, 0.0004]` (sum `100%`)
  - W12: `[3.5e34, 1.1e35, 3.8e35, 1.8e36, 1.4e37]`, chance `[90.9097, 8.6, 0.48, 0.01, 0.0003]` (sum `100%`)
- **Chibi `baseDps` (`CHIBI_CATALOG`, 79 → 89)** & **`WORLD_MINER_DROP_SCALE` / `WORLD_MINERS`**:
  - `WORLD_MINER_DROP_SCALE`: `nightmare: 0.13`, `singularity: 0.105`
  - W11 `baseDps`: `[1e31, 2e31, 3.5e31, 6.5e31, 1e32]`; trigger chance `[0.55, 0.17, 0.041, 0.0052, 0.00065]`
  - W12 `baseDps`: `[1e34, 2e34, 3.5e34, 6.5e34, 1e35]`; trigger chance `[0.46, 0.14, 0.032, 0.0038, 0.00048]`
  - `syncTwinCatalogDpsFromAnchor()` otomatis mengikuti `singularity` (`1e35`).
  - Catatan `NumberFormat.ts`: `SUFFIXES` sudah mendukung hingga `Sxd` (`1e51`), cukup untuk W11 (`Ud`–`Dd`) dan W12 (`Dd`–`Td`).
  - Catatan `GameStateSave.ts`: verifikasi tidak ada clamp numeric yang memotong `cash` / biaya di atas `1e36`–`1e45`.
- **`WORLD_RESONANCE_WORLD_SCALES`**: tambahkan `nightmare: 3.6`, `singularity: 4.0`.

### 4.2 Research Tree (`ResearchData.ts`, `ResearchWorldNodesData.ts`, `GameStateSave.ts`)
- Tambahkan `NIGHTMARE_NODES` & `SINGULARITY_NODES` (masing-masing 12 node / 58 poin via `buildStandardWorldTree`):
  - `nightmare` (`prefix: 'nm'`): `root: 2.7e37`, `tier1: 9e37`, `tier2: 3.6e38`, `dense: 2.16e39`, `apex: 2.7e39`, `valuePerLv: 0.45` (`<= 0.5`).
  - `singularity` (`prefix: 'sg'`): `root: 6e40`, `tier1: 2e41`, `tier2: 8e41`, `dense: 4.8e42`, `apex: 6e42`, `valuePerLv: 0.48` (`<= 0.5`).
- Daftarkan `'nightmare'` & `'singularity'` ke `ResearchTreeId`, `RESEARCH_TREE_META`, `RESEARCH_NODES`, dan `createEmptyResearchLevels()`.

### 4.3 Index Rewards (`IndexRewardsDomain.ts`)
- Total Index naik dari **152 → 172** entries (16 → 18 tabs; `ALL_INDEX_TABS` otomatis dari `WORLDS`).
- Tambahkan `TAB_MILESTONE_CONFIG` untuk:
  - `nightmare`: half (`250_000` Gems, `5` Dice), full (`650_000` Gems, `12` Dice, `+5% Ore Drop`)
  - `singularity`: half (`400_000` Gems, `6` Dice), full (`1_000_000` Gems, `15` Dice, `+5% All DMG`)

### 4.4 Dimensional Rift Tiers 11–12 (`AnomalyData.ts`, `RiftModalUi.ts`, `RiftArenaHudUi.ts`)
- Perpanjang `RIFT_TIER_DEFS` menjadi 12 tier:
  - `tier: 11, worldLabel: 'W11 Nightmare', damageTarget: 5e34, shards: 11, dropChance: 0.14`
  - `tier: 12, worldLabel: 'W12 Singularity', damageTarget: 5e37, shards: 12, dropChance: 0.16`
- Ganti teks hardcoded `10` di `RiftModalUi.ts` (`TIER 1–10`) dan `RiftArenaHudUi.ts` (`CLIMB TIER 1–10`, `TIER ... / 10`) menjadi dinamis mengikuti `RIFT_TIER_DEFS.length`.

---

## 5. Visual 3D (`src/game3d/`)

- **`MineWorldPalette.ts` (`WORLD_PALETTES`)**:
  - `nightmare`: obsidian-plum sky (`#1a091f` → `#7f1d1d`), fog `#581c87`, crystal `#a855f7`, foliage `#f43f5e`.
  - `singularity`: deep eclipse void (`#050509` → `#450a0a`), fog `#7f1d1d`, crystal `#ef4444`, foliage `#22d3ee`.
- **`ColosseumBiome3D.ts` (`WORLD_ARENA_BIOMES`)**:
  - Pastikan `capHex` unik di ke-12 World (karena test memeriksa `distinctCaps.size === WORLDS.length`):
    - `nightmare`: `capHex: '#e9d5ff'`? *(sudah dipakai `ruins`!)* → gunakan `capHex: '#f3e8ff'` atau `'#fda4af'` (dicek unik terhadap seluruh `WORLD_ARENA_BIOMES`).
    - `singularity`: `capHex: '#fecaca'` (dicek unik).
- **`ProceduralTextures3D.ts` (`getCircularNexusPoolTexture`)**:
  - `nightmare`: motif spiral konsentris ungu + duri gothic di sekeliling ring lantai pit.
  - `singularity`: motif cincin akresi gerhana crimson-cyan + 12 penanda shard simetris.
- **`src/main.ts` (`LOCAL_DEV_NEW_CHIBI_IDS`)**:
  - Tambahkan 10 Chibi W11–W12 agar dev auto-unlock lokal langsung membuka Chibi baru saat testing.

---

## 6. Verifikasi

- Update & tambah test di:
  - `tests/world-3d.test.ts`: validasi 10 Chibi baru (`CHIBI_CATALOG.length === 89`), 10 Ore baru (`nightmare` & `singularity` sum `100%`, sellValue meningkat), 12 Biome unik, & keberadaan semua asset `public/`.
  - `tests/state-modules.test.ts`: validasi `grindSteps` 12 World, `oreHpMult`, `unlockCost`, `upgradeCostScale`, Research W11–W12, Starter Chibi grant, anchor `singularity` (`1e35`), `RIFT_TIER_DEFS` panjang `12` (`T11` & `T12`), dan Index `172` entries.
- Jalankan `npm.cmd test`, `npm.cmd run build`, dan smoke-test visual di browser (`http://localhost:5173`) setelah selesai.
