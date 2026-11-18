# Tahap A VFX Minors & Code Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 4 temuan minor pada sistem VFX 3D (`FieldMiner3D` rainbow sync, `AttackImpactFxController` frame-0 orientation, ore respawn `recoilAmt` reset, dan cleanup `getSlashArcTexture` + test cap).

**Architecture:** Perbaikan lokal berurutan di modul 3D dengan shared orientation helpers di `AttackImpactFxController` dan TDD RED→GREEN per task di `tests/world-3d.test.ts`.

**Tech Stack:** TypeScript 5.8 (strict), Three.js r187, Vite 7, Vitest 3.

**Spec:** [docs/superpowers/specs/2026-11-18-tahap-a-vfx-minors-design.md](../specs/2026-11-18-tahap-a-vfx-minors-design.md)

## Global Constraints

- Strict TypeScript tanpa `any`; delta time clamp `<= 0.1`.
- Pertahankan `arenaInstancedCount === 11` di `TowerArena3D`.
- Jangan menjalankan `git commit` / `git push` sebelum user meminta.

## Review Focus

1. `FieldMiner3D` pada `elapsed` baru memakai warna *Rainbow* dari frame yang sama (bukan frame sebelumnya), dan tidak error saat `renderVisuals === false`.
2. `AttackImpactFxController.spawnImpact` mengorientasikan slash, hitspark, dan streaks saat spawn (frame-0) memakai `opts.camera ?? lastCamera`, dan saat tanpa kamera tidak melempar error.
3. Ore yang pecah dengan `recoilAmt > 0` kemudian respawn (`spawnNode` / `spawnWeatherMeteor` / `TowerArena3D` wave baru) memiliki `recoilAmt === 0` (`visualGroup.position.x === 0` & `rotation.z === 0` saat idle).
4. Pool saturation (`20` burst impacts) menjaga `fx.group.children.length <= 110` dan `slashes === 18`, `hitsparks === 16`, `streaks === 64`, `shockwaves === 12` (untuk burst > 12).
5. `getSlashArcTexture` tidak lagi ada di `ProceduralTextures3D.ts` dan seluruh 56+ test serta `npm.cmd run build` lulus.

---

### Task 1: `AttackImpactFxController` Frame-0 Orientation & Strict Cap Assertions

**Files:**
- Modify: `src/game3d/AttackImpactFx3D.ts:1-380`
- Test: `tests/world-3d.test.ts:2162-2205`

**Interfaces:**
- Produces: `AttackImpactSpawnOptions.camera?: THREE.Camera` dan cached `lastCamera` dari `update(dtSec, camera)`.

- [ ] **Step 1: Write failing assertions in `tests/world-3d.test.ts`**
  Perluas test `spawns 4-layer AttackImpactFxController` agar memverifikasi:
  - Setelah `fx.update(0.016, tiltedCam)` (kamera dimiringkan, mis. `position.set(6, 11.7, 15.6); lookAt(0, 0, 0)`), pemanggilan `fx.spawnImpact(...)` langsung membuat mesh slash, hitspark, dan streak memiliki quaternion != identity (sudah terorientasi di frame-0 sebelum `update()` berikutnya dipanggil!).
  - Setelah 20 burst `spawnImpact`, cek `fx.group.children.length <= 110` dan exact saturated caps (`slashes === 18`, `hitsparks === 16`, `streaks === 64`, `shockwaves === 12`).
- [ ] **Step 2: Run test (`vitest run -t "spawns 4-layer AttackImpactFxController"`) -> expect FAIL**
- [ ] **Step 3: Implement shared orientation helpers & `lastCamera` caching in `src/game3d/AttackImpactFx3D.ts`**
- [ ] **Step 4: Run test -> expect PASS**

### Task 2: `FieldMiner3D` Same-Frame Rainbow Color Sync

**Files:**
- Modify: `src/game3d/FieldMiner3D.ts:209-336`
- Test: `tests/world-3d.test.ts`

- [ ] **Step 1: Write failing test verifying `FieldMiner3D` forwards the same frame's `fx.getAccentColor()` when `enchantRainbow` advances at the exact strike frame**
- [ ] **Step 2: Run test -> expect FAIL**
- [ ] **Step 3: Move `this.fx.update(elapsed)` & `this.sprite.setAccentColor(this.fx.getAccentColor())` before cooldown strike check when `renderVisuals === true`**
- [ ] **Step 4: Run test -> expect PASS**

### Task 3: Reset Ore `recoilAmt` on Spawn/Respawn (`OrePit3D.ts` & `TowerArena3D.ts`)

**Files:**
- Modify: `src/game3d/OrePit3D.ts:894-1029`
- Modify: `src/game3d/TowerArena3D.ts:708-712`
- Test: `tests/world-3d.test.ts`

- [ ] **Step 1: Write failing test breaking an ore node (`recoilAmt > 0`), triggering respawn (`pit.update` past `BASE_ORE_RESPAWN_SEC`), and asserting `visualGroup.rotation.z === 0` (`recoilAmt` cleared)**
- [ ] **Step 2: Run test -> expect FAIL**
- [ ] **Step 3: Reset `recoilAmt = 0; recoilDirX = 1;` in `OrePit3D` (`spawnWeatherMeteor`, `spawnNode`, `spawnTutorialCenterOre`) and `TowerArena3D` (`newlySpawned`)**
- [ ] **Step 4: Run test -> expect PASS**

### Task 4: Remove Unused `getSlashArcTexture`, Update `GAME_MAP.md`, Verify Full Suite & Build

**Files:**
- Modify: `src/game3d/ProceduralTextures3D.ts:397-415`
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Remove `getSlashArcTexture()` from `src/game3d/ProceduralTextures3D.ts` and check zero remaining usages**
- [ ] **Step 2: Update `GAME_MAP.md` line counts & run `npm.cmd test && npm.cmd run build`**
