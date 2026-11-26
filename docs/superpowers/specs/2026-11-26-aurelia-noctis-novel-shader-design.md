# Aurelia Noctis (`gilded-chain-noble`) — Nocturnal Theater & Phantom Crow-Feather Severance Skill Shader + 3D Back-Attachment

**Date:** 2026-11-26  
**Tier:** `novel` (`gilded-chain-noble` / *Aurelia Noctis* — `Gilded Blindfold Arbiter`)  
**Status:** Draft (menunggu persetujuan user sebelum implementasi)

---

## 1. Intent & Why

Memberikan shader serangan Sakuga 3D khusus berdurasi `2.5s` beserta 3D back-attachment untuk **Aurelia Noctis** (`gilded-chain-noble`), unit `novel` bertema `#eab308` (gilded gold) + `#f5d08a` (pale champagne moonlight) + `#09090d` (obsidian-noir ink). Saat ini baru `crimson-clock-marshal` yang memiliki shader & back-attachment khusus di tier `novel`, sementara `gilded-chain-noble` masih memakai fallback generik di `TierVfxChoreography3D.ts`.

Berdasarkan pilihan user (**Opsi #3**), koreografi ini memadukan dua referensi anime yang fresh dan selaras langsung dengan sprite [idle.webp](file:///c:/Users/HDD/Documents/my_chibi_mine/public/chibi/gilded-chain-noble/idle.webp), [attack.webp](file:///c:/Users/HDD/Documents/my_chibi_mine/public/chibi/gilded-chain-noble/attack.webp), dan [pose.webp](file:///c:/Users/HDD/Documents/my_chibi_mine/public/chibi/gilded-chain-noble/pose.webp):
- **Shunsui Kyōraku — *Katen Kyōkotsu: Karamatsu Shinjū* (*Bleach: TYBW*)**: meredupkan arena menjadi panggung teater Noh bermandikan sorot bulan pucat, benang eksekusi emas tipis yang menegang sebelum tebasan tunggal hening (*one-stroke luminous severance*), dan kontras hitam-emas pekat saat *hit-stop*.
- **Itachi Uchiha — *Tsukuyomi* (*Naruto Shippuden*)**: pusaran kawanan bulu gagak tinta hitam 3D yang berputar dan buyar menjadi partikel ilusi saat tebasan eksekusi mendarat, di bawah bayangan bulan sabit gothic.

---

## 2. Approaches Considered & Anti-Overlap Guarantee

### Pendekatan yang Dibandingkan
1. **Opsi 1 — *Frieren* (*Scales of Obedience × El Dorado*)**: Neraca keadilan emas raksasa & transmutasi emas cair (ditinggalkan karena user memilih nuansa teater malam & gagak Opsi 3).
2. **Opsi 2 — *Hunter × Hunter* (*Kurapika Judgment Chain*)**: Rantai nen + belati hati (ditinggalkan karena koreografi rantai pengikat antar-ore dekat dengan rantai `nocturne-twins`).
3. **Opsi 3 (Dipilih) — *Bleach TYBW Karamatsu Shinjū × Naruto Crow Tsukuyomi***: Panggung Noh bermandikan cahaya bulan sabit filigree, kawanan bulu gagak 3D, benang emas penentu vonis, dan satu sapuan sabit bulan sabit berantai (`attack.webp`) tanpa pilar batu, tanpa laut bayangan, tanpa kubah bulat, dan tanpa cel-frame persegi.
4. **Opsi 4 — *Pandora Hearts / Vanitas***: Halaman manuskrip novel robek (ditinggalkan karena siluet lembaran persegi mirip `celFrames` milik `crimson-clock-marshal`).

### Jaminan 0% Copas dari Skill yang Ada
- **Beda total dari `nocturne-twins`**: tidak memakai laut bayangan (*liquid shadow sea*), tidak memakai pilar gothic patah, tidak memakai rantai perak mengikat ke black hole, dan tidak memakai 14-plane Judgment Cut.
- **Beda total dari `crimson-clock-marshal` (sesama `novel`)**: tidak memakai pita film 35mm, tidak memakai `celFrames` persegi, tidak memakai `razorLattice`, dan tidak memakai `dimensionTear` pecahan kaca prisma.
- **Beda total dari `clockwork-twins` / `paradox-twins` / `lullaby-twins`**: tidak memakai roda gigi/jarum jam, tidak memakai kubus spasial, tidak memakai rose-window, dan tidak memakai meteor kembar.

---

## 3. Goals, Non-Goals & Constraints

### Goals
- Membuat modul VFX `2.5s` khusus `aureliaNoctisSkillVfx3D.ts` (`AureliaNoctisSkillVfxPool`, `POOL_SIZE = 2`) dengan seluruh material memakai `patchShaderMaterialWithPitClip`.
- Membuat 3D Back-Attachment khusus `gilded-chain-noble` di `ChibiBackApexBuilders3D.ts` yang merefleksikan `pose.webp` (bulan sabit filigree emas datar + 4 bulu gagak hitam 3D + 2 aksen rantai emas bahu).
- Menambahkan *blitz motion waypoints* khas Aurelia Noctis di `TierMotionPath3D.ts` (gesit mengelilingi panggung lalu *execute dash* mendatar saat tebasan sabit `~0.92s`).
- Tetap mempertahankan `crimson-tarot-witch` pada fallback pooled `novel` (tidak memecahkan test existing).

### Non-Goals
- Tidak mengubah statistik gameplay/DPS/harga `gilded-chain-noble` di `ChibiCatalog.ts` atau `PremiumShopData.ts`.
- Tidak membuat shader khusus untuk `crimson-tarot-witch` pada tahap ini.

### Constraints (`.agent/rules/threejs-ts-standards.md` & Perf)
- Strict TypeScript tanpa `any`.
- **Dilarang** cincin miring berputar (*gyroscopic / armillary tumbling rings*). Lantai panggung dan cincin shockwave datar horizontal (`y = cy + 0.06`), backdrop bulan sabit berdiri rapi di belakang pusat pit.
- Maksimal **2-octave** GLSL noise/Voronoi per fragment shader untuk menjaga 60 FPS di preset `low` / `medium` / `high`.
- `POOL_SIZE = 2`, zero per-frame allocation di `update()`, dan pembersihan lengkap via `.dispose()`.
- `lowQuality` caps: bulu gagak `12` (vs `28`), benang emas `3` (vs `6`), serpihan obsidian-emas `10` (vs `24`).

---

## 4. Arsitektur Visual & Koreografi 2.5 Detik (`AureliaNoctisSkillVfxPool`)

Modul baru: `src/game3d/skills/aureliaNoctisSkillVfx3D.ts`

### Fase 1 (`0.00s → 0.42s`) — *Noh-Stage Moonlight Spotlight & Filigree Crescent Backdrop*
1. **Nocturnal Noh-Stage Floor (`15.8 * as` horizontal plane, `y = cy + 0.06`)**:
   - Lantai teater hitam lacquer (`#07070d`) dengan pendar lingkaran sorot bulan pucat (`#fef3c7`) dan ukiran tepi bulan sabit filigree emas (`#eab308`) yang mekar dari gelap tanpa pusaran air ataupun retakan tanah.
   - Meredupkan arena (`onArenaDim(0.82, '#090910', 0.98)`).
2. **Ornate Gothic Crescent Moon Backdrop (`crescentArch`)**:
   - Lengkungan bulan sabit 3D berdiri di sisi belakang pit (terinspirasi langsung dari frame `pose.webp`) dengan shader ukiran filigree emas yang menyala bertahap.

### Fase 2 (`0.36s → 0.92s`) — *Tsukuyomi Raven-Feather Swarm & Taut Golden Threads*
1. **Swirling 3D Raven Feathers (`28` full / `12` lowQuality)**:
   - Geometri bulu gagak melengkung multi-segmen (`createRavenFeatherGeometry`, bukan quad kotak polos) dengan shader tinta hitam pekat + rim tipis emas pucat (*ink-and-gold rim*), berputar masuk menuju titik target ore sebelum buyar saat eksekusi.
2. **Taut Golden Noh-Threads (`6` full / `3` lowQuality)**:
   - Benang emas super tipis (`PlaneGeometry` ramping dengan shader *inverse-distance needle core* bernuansa `#fef08a` + `#eab308`) yang membentang tegang dari backdrop bulan sabit menuju posisi ore (`pts`), memberi ketegangan hening ala babak akhir *Karamatsu Shinjū*.

### Fase 3 (`0.92s → 2.50s`) — *One-Stroke Chain-Scythe Severance, Hit-Stop & Ink-Gold Dispersal*
1. **3D Crescent Chain-Scythe & Luminous Execution Arc (`0.92s`)**:
   - Sabit bulan sabit emas 3D (`createAureliaScytheGeometry`, terinspirasi `attack.webp`) menyapu dalam satu busur tebasan horizontal-diagonal raksasa (`13.8 * as`) melintasi pusat pit, meninggalkan jejak **Luminous Crescent Thread-Wave** berinti putih-emas dan tepi bayangan tinta hitam yang kontras.
   - Memicu **Hit-Stop `0.090s`** (`onImpactFrame(1.0, 1.0, '#eab308', 0.09)` + `onSpeedLines(1.0, 0.55)` + `onFlash('#fef9c3', 0.68)` + `onImpact`).
2. **Crescent Shockwave Ring, Gold-Veined Obsidian Shards & Dissolving Feathers (`0.92s → 2.50s`)**:
   - Gelombang cincin horizontal berbentuk sabit (*asymmetric crescent shockwave*) menyebar rata di lantai pit.
   - `24` (`10` lowQuality) kepingan batu obsidian berurat emas (sesuai pecahan batu di `attack.webp`) dan bulu gagak yang tersisa terlempar lalu larut halus ke gelap panggung sebelum `2.50s`.

---

## 5. 3D Back-Attachment Khusus (`ChibiBackApexBuilders3D.ts`)

Untuk `defId === 'gilded-chain-noble'`:
- **Gilded Crescent Moon Filigree Halo (`omegaHaloMesh`)**: plane vertikal datar di belakang punggung dengan shader bulan sabit filigree emas + bagian tengah terbuka bersih agar rambut putih, blindfold, dan sigil mata Aurelia tetap tajam.
- **4 Sculpted 3D Ink-Black Raven Feathers (`roninFanKatanas` slots)**: 2 pasang bulu gagak melengkung asimetris di sisi kiri/kanan dengan shader hitam tinta + tepi emas lembut.
- **2 Draped Golden Chain-Spurs (`roninFanKatanas` slots)**: 2 rantai/liontin emas ramping bergaya gothic mengapit bahu dengan ayunan halus.

---

## 6. Rencana Integrasi File

1. `src/game3d/skills/aureliaNoctisSkillVfx3D.ts` *(Baru)*: `AureliaNoctisSkillVfxPool` + back-attachment geometries & shader material creators.
2. `src/game3d/ChibiBackApexBuilders3D.ts`: builder `defId === 'gilded-chain-noble'`.
3. `src/game3d/ChibiBackAttachments3D.ts`: penyesuaian animasi halo & slot bulu gagak untuk `gilded-chain-noble`.
4. `src/game3d/TierVfxChoreography3D.ts`: hook `fireAureliaNoctisSakuga` dan routing `opts.chibiId === 'gilded-chain-noble'` pada `case 'novel':`.
5. `src/game3d/TierAttackVfx3D.ts`: inisialisasi, pit-clip patch, `fastForwardToDissolve`, `warmupShaders`, `update`, `clear`, `dispose` untuk `aureliaNoctisSkillPool`.
6. `src/game3d/TierMotionPath3D.ts`: waypoint motion path khusus `gilded-chain-noble` pada `case 'novel':`.
7. `tests/world-3d.test.ts`: unit test siklus `2.5s`, `lowQuality` caps, empty `pts` edge case, `fastForwardToDissolve`, back-attachment, dan tetap memastikan `crimson-tarot-witch` memakai fallback generik.
