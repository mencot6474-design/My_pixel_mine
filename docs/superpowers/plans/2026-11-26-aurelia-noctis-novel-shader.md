# Aurelia Noctis (`gilded-chain-noble`) Skill Shader & Back-Attachment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and wire the bespoke `2.5s` Sakuga 3D GLSL attack skill VFX module (*Nocturnal Theater & Phantom Crow-Feather Severance*), matching blitz motion path, and 3D Gothic Crescent + Raven-Feather back-attachment for `Aurelia Noctis` (`gilded-chain-noble`, tier `novel`).

**Architecture:** Isolate all procedural 3D geometries, 2-octave GLSL shaders, and pooled 3-phase `2.5s` timeline logic inside `src/game3d/skills/aureliaNoctisSkillVfx3D.ts` (`AureliaNoctisSkillVfxPool`, `POOL_SIZE = 2`). Export back-attachment builders consumed by `ChibiBackApexBuilders3D.ts` and animated cleanly by `ChibiBackAttachments3D.ts`, then register the pool in `TierAttackVfx3D.ts`, `TierVfxChoreography3D.ts`, and `TierMotionPath3D.ts` while leaving `crimson-tarot-witch` on the generic pooled fallback.

**Tech Stack:** TypeScript (strict, zero `any`), Three.js (`ShaderMaterial`, `BufferGeometry`), Vitest (`tests/world-3d.test.ts`), Vite.

**Spec:** `docs/superpowers/specs/2026-11-26-aurelia-noctis-novel-shader-design.md`

## Global Constraints

- Strict TypeScript: zero `any` (`: any`, `as any`, `<any>`).
- Zero tilted/tumbling gyroscopic or armillary rings; Noh stage floor and crescent shock ring are horizontal (`y = cy + 0.06` / `0.10`), crescent moon backdrop and back-attachment halo stand upright cleanly.
- Fragment shader noise/Voronoi loops capped at 2 octaves max (`for (int i = 0; i < 2; i++)`).
- `POOL_SIZE = 2`, `SKILL_DURATION_SEC = 2.5`, zero per-frame object allocations in `update()`, and full `.dispose()` cleanup of all geometries and materials.
- `lowQuality` mode caps raven feathers (`12` vs `28`), golden Noh-threads (`3` vs `6`), and gold-veined obsidian shards (`10` vs `24`).
- Every `ShaderMaterial` returned by `getMaterials()` must include `gl_Position =` and `gl_FragColor =` so `patchShaderMaterialWithPitClip` patches cleanly.
- Keep `crimson-tarot-witch` on generic pooled `novel` VFX and `createChibiBackAttachments` returning `null` for it.

## Review Focus

- **Empty or single `pts` array (`pts.length === 0` or `1`)**: `AureliaNoctisSkillVfxPool.fire()` must cleanly fall back around `(cx, cy, cz)` for golden Noh-thread anchors without `undefined` indexing or division by zero.
- **`update(dtSec, timeSec)` when `dtSec` is huge (tab switch / catch-up)**: Clamp `dt = Math.min(0.05, Math.max(0, dtSec))` and step `hitStopTimer` cleanly so `elapsed` never skips `impactFired` or leaks active state past `2.5s`.
- **Consecutive Ult fast-forward (`fastForwardToDissolve`)**: `aureliaNoctisSkillPool.fastForwardToDissolve()` and `aureliaNoctisSkillPool.update(0.11, this.time)` must run inside `fastForwardOldUltTails()` with `suppressHooks = true` so consecutive Ults never double-fire impact hooks.
- **Repeated `fire()` calls exceeding `POOL_SIZE = 2`**: Reusing the oldest active slot must reset `impactFired`, `hitStopTimer`, `onImpactCallback`, and hide all child meshes before restarting.
- **Valid UV attributes on custom 3D geometries**: `createAureliaBackFeatherGeometry`, `createAureliaBackChainSpurGeometry`, `createAureliaScytheGeometry`, and `createGoldVeinedObsidianShardGeometry` must all carry non-zero `uv` attributes for their fragment shaders.

---

### Task 1: Implement `AureliaNoctisSkillVfxPool` & Back-Attachment Geometries/Materials (`src/game3d/skills/aureliaNoctisSkillVfx3D.ts`)

**Files:**
- Create: `src/game3d/skills/aureliaNoctisSkillVfx3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `THREE`, `TierVfxHooks`, `WorldPoint3` from `../TierMotionPath3D`, `mergeSimpleGeos` from `../MeshHelpers3D`.
- Produces:
  - `export interface AureliaNoctisFireOpts { cx: number; cy: number; cz: number; areaScale: number; pts?: readonly WorldPoint3[]; onImpact?: () => void; }`
  - `export function createAureliaBackCrescentHaloShaderMaterial(): THREE.ShaderMaterial`
  - `export function createAureliaBackFeatherGeometry(): THREE.BufferGeometry`
  - `export function createAureliaBackFeatherShaderMaterial(): THREE.ShaderMaterial`
  - `export function createAureliaBackChainSpurGeometry(): THREE.BufferGeometry`
  - `export function createAureliaBackChainShaderMaterial(): THREE.ShaderMaterial`
  - `export class AureliaNoctisSkillVfxPool`:
    - `public readonly group: THREE.Group`
    - `constructor(hooks?: TierVfxHooks)`
    - `getMaterials(): THREE.ShaderMaterial[]`
    - `setHooks(hooks: TierVfxHooks): void`
    - `setLowQuality(low: boolean): void`
    - `fire(opts: AureliaNoctisFireOpts): void`
    - `update(dtSec: number, timeSec: number): void`
    - `fastForwardToDissolve(): void`
    - `clear(): void`
    - `dispose(): void`

- [ ] **Step 1: Write failing unit test for `AureliaNoctisSkillVfxPool` lifecycle, `lowQuality` caps, & UV integrity**
- [ ] **Step 2: Run Vitest on `tests/world-3d.test.ts` to verify failure**
- [ ] **Step 3: Implement `src/game3d/skills/aureliaNoctisSkillVfx3D.ts` (3-phase Noh-Stage Moonlight, Crescent Backdrop, 28 Raven Feathers, 6 Golden Noh-Threads, 3D Crescent Chain-Scythe & Luminous Execution Sweep, Crescent Shockwave, & 24 Gold-Veined Obsidian Shards)**
- [ ] **Step 4: Run Vitest to verify Task 1 passes**

---

### Task 2: Wire `AureliaNoctisSkillVfxPool`, Blitz Motion Path & 3D Back-Attachment

**Files:**
- Modify: `src/game3d/ChibiBackApexBuilders3D.ts`
- Modify: `src/game3d/ChibiBackAttachments3D.ts`
- Modify: `src/game3d/TierVfxChoreography3D.ts`
- Modify: `src/game3d/TierAttackVfx3D.ts`
- Modify: `src/game3d/TierMotionPath3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- `ChibiBackApexBuilders3D.ts`: add `if (defId === 'gilded-chain-noble')` building `omegaHaloMesh` (Gothic Crescent Moon Halo) + 4 Raven Feathers + 2 Golden Chain-Spurs into `roninFanKatanas`.
- `ChibiBackAttachments3D.ts`: animate `omegaHaloMesh` gentle crescent sway for `defId === 'gilded-chain-noble'`.
- `TierVfxChoreography3D.ts`: add `fireAureliaNoctisSakuga` to `TierVfxChoreoContext` and route `opts.chibiId === 'gilded-chain-noble'` in `case 'novel':`.
- `TierAttackVfx3D.ts`: instantiate `aureliaNoctisSkillPool`, patch materials with `patchShaderMaterialWithPitClip`, register in `getChoreoContext`, `setHooks`, `setLowQuality`, `clear`, `fastForwardOldUltTails`, `warmupShaders`, `update`, and `dispose`.
- `TierMotionPath3D.ts`: add `if (chibiId === 'gilded-chain-noble')` stroboscopic theater-sweep waypoints in `case 'novel':`.

- [ ] **Step 1: Add integration & routing unit tests in `tests/world-3d.test.ts`**
- [ ] **Step 2: Run Vitest to verify new routing assertions fail**
- [ ] **Step 3: Wire `ChibiBackApexBuilders3D.ts`, `ChibiBackAttachments3D.ts`, `TierVfxChoreography3D.ts`, `TierAttackVfx3D.ts`, and `TierMotionPath3D.ts`**
- [ ] **Step 4: Run full Vitest suite (`npm.cmd test`) and production build (`npm.cmd run build`)**
