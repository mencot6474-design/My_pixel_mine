# Chronos Imperator (`crimson-clock-marshal`) — 24-FPS Chrono-Cell Projection & Shatter Skill Shader

**Date:** 2026-11-26  
**Tier:** `novel` (`crimson-clock-marshal` / *Chronos Imperator*)  
**Status:** Draft (menunggu persetujuan user sebelum implementasi)

---

## 1. Intent & Why

Memberikan shader serangan Sakuga 3D khusus berdurasi `2.5s` untuk **Chronos Imperator** (`crimson-clock-marshal`), unit apex pertama di tier `novel` (`#a855f7` violet + `#e11d48` crimson flame + `#f5d08a` champagne-gold). Saat ini seluruh unit `novel` masih memakai komposisi VFX pooled generik di `TierVfxChoreography3D.ts`.

Berdasarkan perbandingan referensi anime, pendekatan yang dipilih adalah **Opsi A — *24-FPS Chrono-Cell Projection & Shatter*** yang memadukan:
- **Naoya Zenin — *Projection Sorcery* (*Jujutsu Kaisen*)**: mengunci target ke dalam bingkai kaca/seluloid 24-FPS (*cel-frame lock*), jejak gerak *onion-skinning*, dan pecah serentak saat aturan waktu terputus.
- **Emiya Kiritsugu — *Time Alter: Square Accel* (*Fate/Zero*)**: lompatan langkah *stroboscopic* berkecepatan tinggi melintasi medan tempur yang memadukan residu bayangan termal crimson-violet.

---

## 2. Goals, Anti-Goals & Constraints

### Goals
- Menghasilkan VFX 3D prosedural `2.5s` yang **100% fresh** dan tidak mengulang motif skill yang sudah ada di game (`Clockwork` brass pocket-watch/tower, `Paradox` astronomical floor clock + spatial cubes, `Crimson Ronin` 36 cut-grid, `Nocturne` 14-plane Judgment Cut, `Void Asura` falling waffle-net, `Halcyon` sword rain, `Lullaby` twin meteors, `Obsidian`/`Leviathan` crescent stacks).
- Menyelaraskan palet & identitas sprite `Chronos Imperator` (seragam marshal putih-emas, katana api crimson, dan kristal/energi waktu ungu-violet).
- Mendukung penuh circular pit clipping (`TierVfxPitClip3D.ts`), `lowQuality` scaling, 3D multi-target AoE (`3` ore di Mine, Boss/Wave di Tower/Omega/Rift), dan *shader warmup* tanpa *frame spike*.

### Non-Goals
- Tidak membuat 3D back-attachment baru untuk `Chronos Imperator` (tetap mengandalkan 3 lingkaran jam api ungu pada sprite 2D agar tidak tumpang-tindih).
- Tidak mengubah perilaku fallback `novel` untuk `crimson-tarot-witch` dan `gilded-chain-noble` pada tahap ini.

### Constraints (`.agent/rules/threejs-ts-standards.md` & Perf)
- Strict TypeScript tanpa `any`.
- **Dilarang** cincin miring berputar (*gyroscopic/tumbling rings*); lantai track datar horizontal (`y = cy + 0.06`), bingkai kaca target berdiri menghadap kamera/diagonal tegak rapi.
- Maksimal **2-octave** GLSL noise/Voronoi per fragment shader agar tetap 60 FPS di preset `low`/`medium`/`high`.
- `POOL_SIZE = 2`, zero per-frame allocation, seluruh `BufferGeometry` & `ShaderMaterial` dibersihkan lewat `.dispose()`.

---

## 3. Arsitektur Visual & Koreografi 2.5 Detik (`ChronosImperatorSkillVfxPool`)

Modul baru: `src/game3d/skills/chronosImperatorSkillVfx3D.ts`

### Fase 1 (`0.00s → 0.42s`) — *24-FPS Shutter Lock & Cel-Frame Prisons*
1. **Chrono-Film Runway Floor (`14.5 * as` horizontal plane)**:
   - Alih-alih dial jam bulat, lantai pit memproyeksikan **pita seluloid 35mm & kisi shutter 24-FPS** berwarna obsidian-violet (`#140b24` → `#a855f7`) dengan lubang *sprocket* menyala di tepi dan garis *scanline* sapuan waktu yang meredupkan arena (`onArenaDim(0.76, '#120826', 0.95 * sc)`).
2. **Glassy Cel-Frame Prisons (`6` slot, `3` pada `lowQuality`)**:
   - Tiap ore target dikunci oleh panel kaca seluloid berdiri (`PlaneGeometry` ber-shader khusus) dengan bingkai pojok *viewfinder*, indeks `24-FPS` berkedip, kilau refraksi diagonal, dan riak waktu terperangkap di dalamnya. Panel *snap-lock* berurutan tiap `0.055s`.

### Fase 2 (`0.42s → 0.92s`) — *Time-Alter Onion-Skin Blitz & Crimson Trajectory Scars*
1. **24-FPS Stroboscopic Blitz (`TierMotionPath3D.ts`)**:
   - `buildTierMotionWaypoints` untuk `crimson-clock-marshal` melompat `snap: true` dalam 4 titik stroboskopik di pit sebelum titik eksekusi pusat di `t = 0.37` (`~0.92s`).
2. **Onion-Skin Velocity Ribbon & 6 Delayed Crimson Cuts**:
   - Pita lengkung 3D dengan shader garis *afterimage* bertingkat (ungu-crimson + sedikit *chromatic split* magenta/emas) menghubungkan titik lompatan blitz.
   - **6 goresan katana crimson tipis** menggantung diam di atas tiap cel-frame yang membeku—menahan ketegangan tanpa langsung meledak.

### Fase 3 (`0.92s → 2.50s`) — *Severance Cut, Hit-Stop & Simultaneous Shatter*
1. **Grand Crimson-Gold Severance Slash (`0.92s`)**:
   - 1 tebasan busur katana raksasa crimson-emas (`~12.5 * as`) menyapu diagonal melintasi pusat pit dengan inti putih panas + nyala api crimson di tepi bilah.
   - Memicu **Hit-Stop `0.085s`** (`onImpactFrame(1.0, 1.0, '#e11d48', 0.085)` + `onSpeedLines(1.0, 0.55)` + `onFlash('#f3e8ff', 0.72)` + `onImpact`).
2. **Voronoi Frame Shatter + Chrono-Glass Shards + Shutter Shockwave**:
   - Seluruh panel cel-frame retak oleh pola Voronoi shader lalu hancur menjadi **18 kepingan kristal waktu ungu-crimson** (`10` pada `lowQuality`) yang terlempar keluar, disertai **2 gelombang cincin shutter** mendatar di lantai dan **30 percikan bara crimson-emas** (`14` pada `lowQuality`) yang memudar hingga `2.50s`.

---

## 4. Integrasi File (Ringkas)

1. **`src/game3d/skills/chronosImperatorSkillVfx3D.ts`** *(Baru)*: `ChronosImperatorSkillVfxPool` (`fire`, `update`, `clear`, `dispose`, `setHooks`, `setLowQuality`, `getMaterials`).
2. **`src/game3d/TierVfxChoreography3D.ts`**: tambah hook `fireChronosImperatorSakuga` di `TierVfxChoreoContext`; pada `case 'novel':`, arahkan `opts.chibiId === 'crimson-clock-marshal'` ke `ctx.fireChronosImperatorSakuga(...)` sementara unit `novel` lain tetap memakai fallback.
3. **`src/game3d/TierAttackVfx3D.ts`**: inisialisasi `chronosImperatorSkillPool`, tambah ke `this.group`, patch `patchShaderMaterialWithPitClip`, teruskan di `setHooks`/`setLowQuality`/`clear`/`update`/`warmupShader`/`dispose`.
4. **`src/game3d/TierMotionPath3D.ts`**: tambah waypoint stroboskopik khusus `chibiId === 'crimson-clock-marshal'` pada `case 'novel':` di `buildTierMotionWaypoints`.
5. **`tests/world-3d.test.ts`**: tambah unit spec verifikasi pool, siklus `2.5s`, pit clipping uniforms, routing `crimson-clock-marshal` vs unit `novel` lainnya, dan `dispose()`.

---

## 5. Pendekatan Alternatif yang Ditinggalkan

- **Time Erase & Dimension Sever (*JoJo × Black Clover*)**: Bagus untuk tebasan tunggal, namun kurang menonjolkan keunikan mekanik waktu yang berbeda secara struktural dari tebasan rift/slash yang sudah ada.
- **Severed Universe + Triple Halo (*Fire Force × Re:Zero × Bleach*)**: Estetika marshal cocok, namun berisiko terasa mirip aura ruang ungu-hitam `Obsidian Sovereign`/`Nocturne` saat kamera pit menjauh.
- **Zafkiel Clock Dial (*Date A Live × Black Clover*)**: Terlalu dekat secara visual dengan motif dial jam `Clockwork Twins` dan `Paradox Twins`.
