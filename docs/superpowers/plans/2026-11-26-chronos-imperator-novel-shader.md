# Chronos Imperator (`crimson-clock-marshal`) Skill Shader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and wire the bespoke `2.5s` Sakuga 3D GLSL attack skill VFX module (`24-FPS Chrono-Cell Projection & Shatter`) and matching stroboscopic blitz motion path for `Chronos Imperator` (`crimson-clock-marshal`, tier `novel`).

**Architecture:** Isolate all procedural GLSL shaders, pooled 3D geometries, and 3-phase `2.5s` timeline simulation inside `src/game3d/skills/chronosImperatorSkillVfx3D.ts` (`ChronosImperatorSkillVfxPool`, `POOL_SIZE = 2`), route `crimson-clock-marshal` inside `case 'novel':` of `TierVfxChoreography3D.ts` & `TierMotionPath3D.ts` while leaving other `novel` units on the existing fallback, and register the pool inside `TierAttackVfx3D.ts` with circular pit clipping and shader warmup.

**Tech Stack:** TypeScript (strict, zero `any`), Three.js (`ShaderMaterial`, `BufferGeometry`), Vitest (`tests/world-3d.test.ts`), Vite.

**Spec:** `docs/superpowers/specs/2026-11-26-chronos-imperator-novel-shader-design.md`

## Global Constraints

- Strict TypeScript: zero `any` (`: any`, `as any`, `<any>`).
- Zero tilted/tumbling gyroscopic or armillary rings; floor runway is horizontal (`y = cy + 0.06`), cel-frames face cleanly upright.
- Fragment shader noise/Voronoi loops capped at 2 octaves max (`for (int i = 0; i < 2; i++)`).
- `POOL_SIZE = 2`, `SKILL_DURATION_SEC = 2.5`, zero per-frame object allocations in `update()`, and full `.dispose()` cleanup of all geometries and materials.
- `lowQuality` mode caps active cel-frame prisons (`3` vs `6`), chrono-glass shards (`10` vs `18`), and temporal ember sparks (`14` vs `30`).
- Every `ShaderMaterial` in `getMaterials()` must be patched with `patchShaderMaterialWithPitClip` in `TierAttackVfx3D.ts`.
- Keep `crimson-tarot-witch`, `gilded-chain-noble`, and `createChibiBackAttachments` (`novel` returns `null`) unchanged.

## Review Focus

- **Empty or single `pts` array (`pts.length === 0` or `1`)**: `ChronosImperatorSkillVfxPool.fire()` must cleanly fall back to `(cx, cy, cz)` for cel-frame positions and trajectory scars without `undefined` indexing or division by zero.
- **`update(dtSec, timeSec)` when `dtSec` is huge (tab switch / background catch-up)**: Clamp `dt = Math.min(0.05, dtSec)` and keep `hitStopTimer` safe so `elapsed` never skips `impactFired` permanently or leaks active state past `2.5s`.
- **Consecutive Ult fast-forward (`fastForwardOldUltTails`)**: `chronosImperatorSkillPool.update(0.11, this.time)` must be included in `fastForwardOldUltTails()` with `suppressHooks = true` so rapid consecutive Ults dissolve cleanly without double-firing impact hooks or additive whiteout.
- **Repeated `fire()` calls exceeding `POOL_SIZE = 2`**: Reusing the oldest active slot must reset `impactFired`, `hitStopTimer`, `onImpactCallback`, and hide unused child meshes (shards/rings/embers/frames) before starting the new timeline.
- **Pit clipping uniform injection**: `patchShaderMaterialWithPitClip` requires `gl_Position =` and `gl_FragColor =` (standard WebGL1 Three.js shader output) in every `ShaderMaterial` returned by `getMaterials()`.

---

### Task 1: Implement `ChronosImperatorSkillVfxPool` (`src/game3d/skills/chronosImperatorSkillVfx3D.ts`)

**Files:**
- Create: `src/game3d/skills/chronosImperatorSkillVfx3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `THREE`, `TierVfxHooks`, `WorldPoint3` from `../TierMotionPath3D`, `mergeSimpleGeos` from `../MeshHelpers3D`.
- Produces:
  - `export interface ChronosImperatorFireOpts { cx: number; cy: number; cz: number; areaScale: number; pts?: readonly WorldPoint3[]; onImpact?: () => void; }`
  - `export class ChronosImperatorSkillVfxPool`:
    - `public readonly group: THREE.Group`
    - `constructor(hooks?: TierVfxHooks)`
    - `getMaterials(): THREE.ShaderMaterial[]`
    - `setHooks(hooks: TierVfxHooks): void`
    - `setLowQuality(low: boolean): void`
    - `fire(opts: ChronosImperatorFireOpts): void`
    - `update(dtSec: number, timeSec: number): void`
    - `clear(): void`
    - `dispose(): void`

- [ ] **Step 1: Write failing unit test for `ChronosImperatorSkillVfxPool` lifecycle & caps**

Add a focused test inside `tests/world-3d.test.ts` testing:
- Instantiating `ChronosImperatorSkillVfxPool` with `onImpactFrame` spy, verifying `getMaterials().length > 0`.
- Calling `fire({ cx: 0, cy: -0.42, cz: 1.65, areaScale: 0.72, pts: [] })` (empty `pts` edge case) and stepping `update(0.05, t)` across `2.6s` (52 steps): asserts `impactCalls === 1`, then at end all instances deactivate (`group.children.every((c) => !c.visible)`).
- Calling `setLowQuality(true)` + `fire(...)` with 6 targets and stepping across `0.3s` and `1.0s`: asserts visible cel-frame count `<= 3`, shard count `<= 10`, spark count `<= 14`.
- Calling `dispose()` cleanly without throwing.

- [ ] **Step 2: Run Vitest on `tests/world-3d.test.ts` to verify failure**

Run: `.\node_modules\.bin\vitest.cmd run tests/world-3d.test.ts -t "ChronosImperatorSkillVfxPool"`
Expected: FAIL (`Cannot find module '../src/game3d/skills/chronosImperatorSkillVfx3D'`).

- [ ] **Step 3: Implement `src/game3d/skills/chronosImperatorSkillVfx3D.ts`**

Build `ChronosImperatorSkillVfxPool` (`POOL_SIZE = 2`, `SKILL_DURATION_SEC = 2.5`) following the exact 3-phase spec:
- 2-octave GLSL noise + 2-octave Voronoi helper (`CHRONOS_NOISE_GLSL`).
- **Floor Shader (`createChronoFilmFloorMaterial`)**: horizontal `14.5 * as` plane (`y = cy + 0.06`) rendering 35mm film-strip sprocket rails, 24-FPS shutter tick bars, sweeping scanline, and central diagonal severance line glow.
- **Cel-Frame Prison Shader (`createChronoCelFrameMaterial`)**: up to `6` (`3` low) upright `PlaneGeometry` panels around target ores (`pts[i]` or radial fallback around `(cx, cz)` when `pts` is empty), staggered snap-lock every `0.055s`, corner crop marks, `24` index ticks, frozen internal ripple, and Voronoi fracture alpha dissolve after `0.92s`.
- **Onion-Skin Velocity Ribbon (`createOnionSkinRibbonMaterial`) & 6 Delayed Crimson Cut Scars (`createDelayedCrimsonCutMaterial`)**: curved multi-segment 3D trajectory ribbon (`0.42s → 0.92s`) with stepped afterimage stripes + crimson-violet chromatic edges, plus `6` thin crimson katana arcs hovering frozen across the cel-frames until severance.
- **Grand Severance Slash (`createGrandSeveranceSlashMaterial`)**: `12.5 * as` diagonal tapered crescent/ribbon sweeping at `0.92s`, triggering `0.085s` Hit-Stop + `onImpactFrame(1.0, 1.0, '#e11d48', 0.085)` + `onSpeedLines(1.0, 0.55)` + `onFlash('#f3e8ff', 0.72)` + `onImpactCallback`.
- **Shatter Shards (`18`/`10`), Shutter Rings (`2`), & Temporal Sparks (`30`/`14`)**: faceted crystal shards (`OctahedronGeometry` / diamond shard via `mergeSimpleGeos`) bursting outward, 2 horizontal floor shutter rings, and rising crimson-gold sparks dissolving cleanly by `2.50s`.
- Every `ShaderMaterial` includes standard `gl_Position =` and `gl_FragColor =` assignments so `patchShaderMaterialWithPitClip` works cleanly.

- [ ] **Step 4: Run Vitest to verify Task 1 passes**

Run: `.\node_modules\.bin\vitest.cmd run tests/world-3d.test.ts -t "ChronosImperatorSkillVfxPool"`
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/game3d/skills/chronosImperatorSkillVfx3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): add 24-FPS Chrono-Cell shader pool for Chronos Imperator"
```

---

### Task 2: Wire `ChronosImperatorSkillVfxPool` into `TierVfxChoreography3D`, `TierAttackVfx3D`, and `TierMotionPath3D`

**Files:**
- Modify: `src/game3d/TierVfxChoreography3D.ts:145-180,444-478`
- Modify: `src/game3d/TierAttackVfx3D.ts:51-65,200-215,288-346,390-480,1230-1396`
- Modify: `src/game3d/TierMotionPath3D.ts:629-640`
- Test: `tests/world-3d.test.ts:5557-5607`

**Interfaces:**
- Consumes: `ChronosImperatorSkillVfxPool` & `ChronosImperatorFireOpts` from `./skills/chronosImperatorSkillVfx3D`.
- Produces:
  - `TierVfxChoreoContext.fireChronosImperatorSakuga(opts: ChronosImperatorFireOpts): void`
  - `TierVfxChoreography3D` `case 'novel':` dispatches `crimson-clock-marshal` to `fireChronosImperatorSakuga`, other `novel` chibis to existing pooled fallback.
  - `TierMotionPath3D` `buildTierMotionWaypoints` `case 'novel':` gives `crimson-clock-marshal` a 5-beat stroboscopic `snap: true` blitz path (`t = 0.10, 0.21, 0.32, 0.44, 0.68`).

- [ ] **Step 1: Add failing integration test in `tests/world-3d.test.ts`**

Extend `tests/world-3d.test.ts` (adjacent to line 5557 `novel` test) to verify:
- `buildTierMotionWaypoints('novel', ..., 'crimson-clock-marshal')` produces `>= 6` waypoints with stroboscopic `snap: true` jumps distinct from `crimson-tarot-witch`.
- `TierAttackVfxPool3D` with `setPitBounds(...)` and `onImpactFrame` spy fires `crimson-clock-marshal` (`rarity: 'novel'`), warms shader (`warmupShaders`), activates `chronosImperatorSkillPool` (only 1 skill pool group visible), triggers `onImpactFrame` during `2.5s` playback, fast-forwards cleanly on a second `fireTierAttack`, and `crimson-tarot-witch` still runs the fallback pooled VFX without activating `chronosImperatorSkillPool`.
- `createChibiBackAttachments('crimson-clock-marshal', ...)` still returns `omegaAuraGroup === null`.

- [ ] **Step 2: Run Vitest to verify the new integration test fails**

Run: `.\node_modules\.bin\vitest.cmd run tests/world-3d.test.ts -t "Chronos Imperator"`
Expected: FAIL (`chronosImperatorSkillPool` not wired / `onImpactFrame` behavior mismatch).

- [ ] **Step 3: Wire `TierVfxChoreography3D.ts`, `TierAttackVfx3D.ts`, and `TierMotionPath3D.ts`**

- In `TierVfxChoreography3D.ts`: add `fireChronosImperatorSakuga` to `TierVfxChoreoContext`; in `case 'novel':`, check `if (opts.chibiId === 'crimson-clock-marshal')` -> call `ctx.fireChronosImperatorSakuga({ cx, cy, cz, areaScale: as, pts, onImpact: ... })` (crimson-gold debris + sparks burst) and `break`.
- In `TierAttackVfx3D.ts`: instantiate `private readonly chronosImperatorSkillPool: ChronosImperatorSkillVfxPool`, add to `this.group`, patch every material in `getMaterials()` via `patchShaderMaterialWithPitClip`, forward in `setHooks`, `setLowQuality`, `clear`, `fastForwardOldUltTails`, `warmupShaders` (`'crimson-clock-marshal': this.chronosImperatorSkillPool.group`), `update`, and `dispose`.
- In `TierMotionPath3D.ts`: in `case 'novel':` inside `buildTierMotionWaypoints`, add `if (chibiId === 'crimson-clock-marshal')` returning the 5-beat stroboscopic `snap: true` waypoint sequence aligned with the `0.42s–0.92s` blitz and `0.92s` central severance cut.

- [ ] **Step 4: Run full Vitest suite & TypeScript/Vite build**

Run: `npm.cmd test && npm.cmd run build`
Expected: All Vitest specs pass (0 failures) and `tsc --noEmit && vite build` exits 0 with zero errors.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/game3d/TierVfxChoreography3D.ts src/game3d/TierAttackVfx3D.ts src/game3d/TierMotionPath3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): wire Chronos Imperator skill shader and stroboscopic blitz"
```

---

### Task 3: Sync `GAME_MAP.md` & Final Verification

**Files:**
- Modify: `GAME_MAP.md` (add `chronosImperatorSkillVfx3D.ts` row & update touched module line counts/test counts)

- [ ] **Step 1: Update `GAME_MAP.md` with exact line counts & new skill module entry**
- [ ] **Step 2: Run `npm.cmd test && npm.cmd run build` and verify clean output**
- [ ] **Step 3: Commit docs update**

```bash
git add GAME_MAP.md
git commit -m "docs: register chronosImperatorSkillVfx3D.ts in GAME_MAP.md"
```
