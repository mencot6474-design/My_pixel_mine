# Design Spec: Chibi Attack Animation & Unified Cyber-Anime VFX Overhaul (Tambang & Battle Tower)

## 1. Intent & Tujuan
Meningkatkan animasi dan efek serangan seluruh 35 chibi di **Tambang** (`OrePit3D.ts`, `FieldMiner3D.ts`) sekaligus **Battle Tower** (`TowerArena3D.ts`) menggunakan sistem serangan seragam untuk semua karakter agar terasa **smooth, berlapis, bertenaga, dan "rame"**—tanpa menggambar ulang 140 gambar pose `.webp` yang sudah ada.

Pendekatan B (Opsi 2 — Tambang & Battle Tower) menggabungkan:
1. **Gerak Sprite Chibi 3-Beat Combo + Ghost Afterimage & Wind-up Glint** di [ChibiSprite3D.ts](../../../src/game3d/ChibiSprite3D.ts) (dipakai bersama oleh Tambang & Battle Tower).
2. **Unified 4-Layer World-Space Impact VFX** melalui modul bersama baru `src/game3d/AttackImpactFx3D.ts` (terinspirasi *ZZZ/HSR*, *Blue Archive*, *Trickcal*, & *Octopath Traveler*), menggantikan efek tebasan polos di [OrePit3D.ts](../../../src/game3d/OrePit3D.ts) dan `RingGeometry` lama di [TowerArena3D.ts](../../../src/game3d/TowerArena3D.ts).

---

## 2. Goals, Non-Goals, Anti-Goals
- **Goals**:
  - Animasi tubuh chibi memakai siklus **3-beat combo** (`0: Diagonal Slash`, `1: Reverse Cross`, `2: Heavy Jump Smash`) dengan kurva *anticipation -> snap lunge -> elastic follow-through*.
  - Penambahan **2 ghost afterimage** berwarna aksen saat lunge dan **1 wind-up glint** singkat di fase anticipation.
  - VFX impact terkoordinasi 4 lapis via `AttackImpactFxController`:
    1. **Directional Dual-Pass Slash Arc** (`AdditiveBlending`: outer glow warna aksen + inti putih tajam) yang muncul di arah datang serangan chibi ke target dan bervariasi sudutnya per beat (serta **X-Cross 2 slash** pada Beat `2` atau `heavy`).
    2. **Anime Hitspark Star (4-point cross flash)** di titik kontak.
    3. **Directional Spark Streaks** memanjang searah vektor hantaman (melengkapi shard batu 3D di Tambang).
    4. **Ground Shockwave Ring** datar di lantai arena/pit (`floorY`) yang mengembang cepat di bawah target (lebih besar pada Beat `2` & `heavy`).
  - Warna VFX otomatis mengikuti **warna Enchant aktif** (termasuk live cycling untuk `rainbow`) atau `def.accentColor` milik chibi, serta emas/kuning (`#fbbf24` / `#facc15`) untuk tap manual berat (`heavy`).
  - `OreBillboard2D` (dipakai ore Tambang & Wave 1–9 ore Tower) mendapat **recoil/tilt horizontal singkat** searah hantaman selain `squashAmt` vertikal.
- **Non-Goals**:
  - Tidak mengubah atau menambah aset gambar `.webp` di `public/chibi/`.
  - Tidak membuat animasi berbeda per arketipe/kelas chibi.
  - Tidak menambahkan *global hitstop* (freeze frame) atau *camera shake* terus-menerus agar nyaman ditonton saat 5 chibi memukul non-stop.
- **Anti-Goals**:
  - Tidak membocorkan memory GPU (seluruh geometry shared + canvas texture ter-cache + pool VFX di-dispose penuh).
  - Tidak merusak jarak flank `FieldMiner3D` (`|pos.x - ore.worldX| >= 1.1`), urutan indeks child `ChibiSprite3D`, maupun assertion jumlah `InstancedMesh` pada `TowerArena3D` (`expect(arenaInstancedCount).toBe(11)`).

---

## 3. Kendala, Invarian Teknis & Keputusan Builder
- **Strict TypeScript** (`.agent/rules/threejs-ts-standards.md`): dilarang `any`; delta time tetap di-clamp (`<= 0.1` / `<= 0.05`); tekstur kanvas memakai `THREE.SRGBColorSpace` dan aman di headless Node (`typeof document === 'undefined'`).
- **Invarian `tests/world-3d.test.ts`**:
  - `sprite.group.children[0]` = `spritePivot`, `spritePivot.children[0]` = `animGroup`, `animGroup.children[0]` = `mesh`. Mesh ghost diletakkan di `spritePivot` setelah `animGroup` (index `>= 1`), dan mesh glint di `animGroup` setelah `mesh` (index `>= 1`).
  - Pada Beat `0` (`comboStep = 0`, termasuk pemanggilan `triggerAttack(0.4)`), untuk `facing = 1`: saat `p = 0.1` wajib `animGroup.position.x < 0`, dan saat `p = 0.35` wajib `animGroup.position.x > 0.05` & `animGroup.rotation.z < 0`. Beat `1` dan `2` juga mempertahankan arah lunge positif (`posX > 0.05`) pada fase strike.
  - `OrePit3D.hitNode(nodeId, dmg, heavy, shardCount?, attackFx?)` tetap mempertahankan kompatibilitas 3–4 argumen agar mock `fakePit` di `tests/world-3d.test.ts` tetap lulus.
  - `TowerArena3D` diuji memiliki tepat **11 `THREE.InstancedMesh`** (`tests/world-3d.test.ts:1879`).
- **Keputusan Builder (Minor — sudah ditetapkan)**:
  1. **Pool Mesh Biasa + Shared Geometry (bukan `InstancedMesh`) untuk `streakPool`**: Agar assertion `arenaInstancedCount === 11` di `TowerArena3D` tetap valid dan desain sederhana, seluruh 4 layer pool di `AttackImpactFxController` memakai `THREE.Mesh` biasa dengan geometri & tekstur bersama (`shared`).
  2. **Kapasitas Pool & Strategi Oldest-Recycling**: Untuk menampung 5 chibi pada `attackInterval` tercepat `0.28s` (~18 hit/detik + klik manual) tanpa hit yang terlihat kosong, seluruh pool memakai **ring-buffer oldest-recycling** saat kapasitas penuh:
     - `slashPool`: cap **18** (`0.17s–0.22s`)
     - `hitsparkPool`: cap **16** (`0.13s–0.16s`)
     - `streakPool`: cap **64**, emisi **4–6** streak per hit normal dan **8–10** pada Beat `2` / `heavy` dengan lifetime singkat **0.18s–0.26s**
     - `shockwavePool`: cap **12** (`0.22s–0.26s`)
  3. **Koordinat Impact Tower vs Boss**: Untuk Wave 1–9 ore Tower, slash/hitspark/streaks muncul di `targetY = 1.05` & shockwave di `floorY = 0.11`. Untuk Wave 10 Boss (`SeraphimBoss3D`), slash/hitspark/streaks muncul di tinggi dada/inti Boss (`targetY = 2.45` untuk fighter, `2.65` untuk klik manual `triggerHitBounce`), sedangkan `Ground Shockwave Ring` tetap di lantai kawah (`floorY = 0.11`) agar tidak melayang di udara.

---

## 4. Rancangan Per Modul

### A. `src/game3d/ProceduralTextures3D.ts`
Menambah 4 tekstur kanvas ter-cache (`paintCachedTexture`):
1. `getDualSlashArcTexture()`: lengkungan bulan sabit asimetris dengan ujung meruncing tajam, outer glow lembut dan inner core putih terang agar 1 mesh `AdditiveBlending` terlihat seperti anime dual-pass slash.
2. `getHitSparkStarTexture()`: bintang silang 4-sudut tajam + core bundar terang + garis aksen diagonal tipis.
3. `getShockwaveRingTexture()`: cincin energi radial tipis dengan tepi tajam & garis energi radial halus.
4. `getWindupGlintTexture()`: kilau bintang kecil berpusat putih bersih untuk sinyal wind-up di sprite chibi.

### B. `src/game3d/AttackImpactFx3D.ts` *(Baru — Modul VFX Bersama)*
Class `AttackImpactFxController`:
- Konstruktor menerima opsi `{ floorY: number }` (`0.045` untuk `OrePit3D`, `0.11` untuk `TowerArena3D`).
- Memiliki `public readonly group = new THREE.Group()`.
- Method `spawnImpact(opts: AttackImpactSpawnOptions)`:
  - `targetX, targetY, targetZ`
  - `accentColor: string`
  - `heavy?: boolean`
  - `comboStep?: number` (`0 | 1 | 2`)
  - `attackerX?: number; attackerZ?: number`
  - `shockwaveScale?: number` (memungkinkan Boss shockwave sedikit lebih lebar di kawah)
- Men-spawn 4 layer secara terkoordinasi:
  - Menghitung vektor datang `(dirX, dirZ)` dari penyerang ke target (atau default dari depan/acak ringan saat tap manual), menempatkan slash & hitspark sedikit di sisi depan/menghadap penyerang agar tidak tenggelam di tengah sprite ore/Boss.
  - **Beat `0`**: slash miring kanan-bawah; **Beat `1`**: slash miring kiri-bawah (cross balik); **Beat `2` / `heavy`**: **X-Cross (2 slash)** + hitspark lebih besar + `8–10` streaks + shockwave lebih lebar.
- Method `update(dtSec: number, camera?: THREE.Camera)`: menggerakkan & memudarkan ke-4 pool, memastikan billboard slash/hitspark/streak menghadap kamera secara natural atau berorientasi sepanjang vektor serang, serta men-scale shockwave ring di bidang XZ.
- Method `dispose()`: membuang seluruh item aktif pada 4 pool beserta 4 shared geometry (`sharedSlashGeo`, `sharedHitsparkGeo`, `sharedStreakGeo`, `sharedShockwaveGeo`).

### C. `src/game3d/ChibiSprite3D.ts`
- Menambah `setAccentColor(hex: string): void` dan memperluas `triggerAttack(durationSec = 0.42, comboStep?: number)` dengan rotasi combo otomatis `0 -> 1 -> 2 -> 0` bila `comboStep` tidak diberikan.
- Menambah **2 pooled ghost afterimage planes** di `spritePivot` (di belakang `animGroup`, `AdditiveBlending`, memakai `this.material.map` yang sama & tint `accentColor`) yang aktif sepanjang fase strike `p = 0.18..0.62`, plus **1 wind-up glint plane** di `animGroup` (index `>= 1`) yang berkedip singkat pada `p = 0.03..0.24`.
- Memperkaya kurva 3 fase animasi `attack` untuk 3 beat (`0: Diagonal Slash`, `1: Snap Cross`, `2: Heavy Jump Smash`), menjaga seluruh assertion `world-3d.test.ts` tetap lolos.
- Membersihkan seluruh resource ghost & glint di `dispose()`.

### D. `src/game3d/FieldMiner3D.ts`
- **Perbaikan `ChibiFieldFxController`**:
  - Menyimpan `defaultAccentColor = defAccentColor`, menginisialisasi `this.accentColorHex = defAccentColor`, dan mengembalikan ke `defaultAccentColor` pada `setEnchant(null)`.
  - Pada `enchantRainbow`, memperbarui `this.accentColorHex` di `update()` agar serangan chibi Enchant Rainbow ikut berganti warna secara live.
- **Combo & Impact Sync**:
  - Menambah `comboStep` (`0..2`) di `FieldMiner3D`.
  - Saat strike dengan `renderVisuals`: memanggil `this.sprite.setAccentColor(activeColor)`, `this.sprite.triggerAttack(..., step)`, dan meneruskan `{ accentColor: activeColor, attackerX: pos.x, attackerZ: pos.z, comboStep: step }` ke `pit.hitNode(...)`.

### E. `src/game3d/OrePit3D.ts`
- Menambah `recoilAmt` & `recoilDirX` pada `InternalOreNode` + dukungan recoil horizontal ringan pada `OreBillboard2D.updateTransform(...)` (parameter baru bersifat opsional agar pemanggil lain tetap aman).
- Mengganti `slashPool` lama dengan instance `AttackImpactFxController({ floorY: 0.045 })`.
- `hitNode` tetap memanggil `spawnShardsAt` untuk serpihan batu fisik 3D, ditambah memanggil `impactFx.spawnImpact(...)` memakai warna `attackFx?.accentColor` (atau `#fbbf24` saat `heavy`) dan arah dari `(attackerX, attackerZ)`.
- Memanggil `impactFx.update(dtSec, camera)` di `OrePit3D.update(...)` dan `impactFx.dispose()` di `OrePit3D.dispose()`.

### F. `src/game3d/TowerArena3D.ts` & `src/game3d/MineScene3D.ts`
- **`TowerArena3D.ts`**:
  - Menambah `comboStep` per `TowerChibiFighter`, memperbaiki inisialisasi `colorHex: cfg.def.accentColor`, memperbarui `f.colorHex = f.fx.getAccentColor()` setiap frame / saat `applyFighterEnchant` (termasuk rainbow live), dan menyinkronkan `f.sprite.setAccentColor(f.colorHex)`.
  - Mengharmoniskan `f.lungeTimer` (`0.08m` ke ore / `0.26m` ke Boss) agar tidak double-overshoot dengan lunge baru + afterimage milik `ChibiSprite3D`.
  - Mengganti `slashes` (`RingGeometry`) dengan `AttackImpactFxController({ floorY: 0.11 })`:
    - `TowerStrikeEvent` ditambah field opsional `accentColor`, `comboStep`, `attackerX`, `attackerZ` sehingga `MineScene3D.ts` dapat meneruskan konteks penyerang ke `triggerOreHitBounce(...)` pada Wave 1–9 ore (plus mendukung `OreBillboard2D` horizontal recoil untuk Wave rocks).
    - Untuk pukulan fighter ke Boss (`lungeTimer` strike di `TowerArena3D.update`) dan klik manual (`triggerHitBounce`), panggil `impactFx.spawnImpact(...)` di posisi dada Boss (`y ~ 2.45–2.65`, `z = BOSS_CENTER_Z + 1.05`) dengan `shockwaveScale: 1.5` di lantai kawah `y = 0.11`.
  - Memanggil `impactFx.update(safeDt, camera)` di `TowerArena3D.update(...)` dan `impactFx.dispose()` di `TowerArena3D.dispose()`.
- **`MineScene3D.ts`**:
  - Meneruskan info attacker/color/combo opsional dari `strike` (`TowerStrikeEvent`) ke `this.towerArena.triggerOreHitBounce(...)`.

---

## 5. Rencana Verifikasi & Yang Diserahkan ke Builder
- **Diserahkan ke builder**: penalaan kurva easing, durasi milidetik tiap efek (`0.13s–0.26s`), ukuran/opacity relatif di layar desktop maupun mobile agar tidak menutupi health bar atau angka damage.
- **Pengujian (`tests/world-3d.test.ts` + CLI)**:
  - Menambah unit/integration test untuk:
    - `ChibiSprite3D` combo 3-beat, ghost afterimage saat strike, wind-up glint, & full `dispose()`.
    - `ChibiFieldFxController.getAccentColor()` default memakai `def.accentColor` & sinkronisasi warna Enchant/Rainbow.
    - `AttackImpactFxController` (spawn 4 layer, oldest-recycling cap `64` streaks, update, headless guard, full `dispose()`).
    - `OrePit3D.hitNode` & `TowerArena3D` (termasuk menjaga `arenaInstancedCount === 11`, ore recoil, dan kompatibilitas test lama).
  - Menjalankan `npm.cmd test`, `npm.cmd run build`, dan memperbarui `GAME_MAP.md` setelah implementasi selesai (serta smoke-check visual di browser).
