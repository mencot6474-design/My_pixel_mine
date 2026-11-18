# Design Spec: Tahap A — Code Health & 4 VFX Deferred Minors

## 1. Intent & Scope
Merapikan 4 temuan *deferred minors* dari review VFX 3D sebelumnya agar sinkronisasi warna, orientasi frame-0, reset recoil respawn, dan kebersihan export/test berjalan mulus tanpa mengubah gameplay.

## 2. Perubahan per File
1. **[FieldMiner3D.ts](../../../src/game3d/FieldMiner3D.ts)**: Saat `renderVisuals === true`, jalankan `this.fx.update(elapsed)` dan `this.sprite.setAccentColor(this.fx.getAccentColor())` di awal `update()` sebelum pengecekan `attackCooldown` agar Enchant *Rainbow* selalu sinkron tepat di frame pukulan dan sepanjang ayunan.
2. **[AttackImpactFx3D.ts](../../../src/game3d/AttackImpactFx3D.ts)**: Tambah `camera?: THREE.Camera` pada `AttackImpactSpawnOptions`, simpan `lastCamera` dari `update(dtSec, camera)`, dan ekstrak helper orientasi bersama (`orientSlash`, `orientHitspark`, `orientStreak`) yang dipanggil baik di `spawnImpact()` maupun `stepPools()` agar slash/hitspark/streaks langsung menghadap kamera & vektor luncur sejak frame-0.
3. **[OrePit3D.ts](../../../src/game3d/OrePit3D.ts) & [TowerArena3D.ts](../../../src/game3d/TowerArena3D.ts)**: Reset `recoilAmt = 0` (`recoilDirX = 1`) di `spawnWeatherMeteor`, `spawnNode`, `spawnTutorialCenterOre`, dan blok `newlySpawned` Tower agar ore yang respawn selalu tegak lurus.
4. **[ProceduralTextures3D.ts](../../../src/game3d/ProceduralTextures3D.ts), [tests/world-3d.test.ts](../../../tests/world-3d.test.ts), & [GAME_MAP.md](../../../GAME_MAP.md)**: Hapus unused export `getSlashArcTexture()`, perketat test kapasitas pool `fx.group.children.length <= 110` (serta exact cap `18/16/64/12`), tambah test regresi untuk poin 1–3, dan perbarui jumlah baris di `GAME_MAP.md`.

## 3. Verifikasi & Aturan Kerja
- Strict TypeScript tanpa `any`, delta clamp `<= 0.1`, pertahankan `arenaInstancedCount === 11`.
- Jalankan `npm.cmd test` dan `npm.cmd run build`; jangan commit/push sebelum diminta.
