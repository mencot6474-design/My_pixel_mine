# Open-Sky Circular Arena & Floating Podiums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen inline) or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the Mining World into **Open-Sky Circular Arena (Opsi 2)** — a deep `12.8m` circular stepped colosseum pool (`y = -1.95m`) floating in open sky, 5 hovering crescent pedestals with anti-grav thrusters, floating Left Nexus Gate & Right Vault Core Dais + Chest satellites, and wide arena camera framing.

**Architecture:** Replace rectangular pit/courtyard geometry in `OrePitStage3D.ts` and `MineEnvironment3D.ts` with a `LatheGeometry` 3-tier circular colosseum ring (`PIT_RADIUS = 6.4`, `PIT_FLOOR_Y = -1.95`, `PIT_CENTER_Z = 1.65`) and open-sky under-void shards. Add downward thruster hardware + isolated `±0.045m` hover bob inside `PlotPedestal3D.ts`, remove bulky plinths in `MineSceneStage3D.ts`, add floating keels/thrusters in `ArenaWings3D.ts`, and update circular ore sampling, floor raycasting (`MineSceneInput.ts`), and `PIT_FLOOR_Y` VFX clamping (`PlotAttackController3D.ts`).

**Tech Stack:** TypeScript (strict), Three.js, Vitest (`npm.cmd test`), Vite (`npm.cmd run build`).

**Spec:** [2026-11-23-open-sky-circular-arena-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-23-open-sky-circular-arena-design.md)

## Global Constraints

- Strict TypeScript (`no any`), delta clamp `<= 0.1`, explicit `.dispose()` on all geometries/materials/textures, zero circular imports.
- Keep every `src/` file `< 1,000` lines (`MineScene3D.ts` 972, `OrePit3D.ts` 960, `MineSceneStage3D.ts` 932).
- Zero gyroscopic / tilted tumbling orbit rings; all arena/thruster rings are flat horizontal; Left Gate portal plane is upright vertical.
- Preserve `PlotPedestal3D.group.rotation.y === 0` and static `PlotPedestal3D.group.position` for `ChibiSprite3D` blitz math.
- Preserve central rear sky window (`box.min.z < -7.5 && box.max.y > 4.2 && |center.x| < 14.0` unobstructed).

## Review Focus

1. **Circular pool depth & floor click raycast**: `MineSceneInput.getPitFloorHitInScene` and `PlotAttackController3D` must use `PIT_FLOOR_Y = -1.95` and circular `PIT_RADIUS = 6.4` around `(0, 1.65)` instead of `y = 0` / `-0.68`.
2. **Circular ore spawn containment**: All `5..20` spawned ores in `OrePit3D` must fall strictly inside `r <= PIT_RADIUS - 0.9` without clipping the stepped crater walls.
3. **`PlotPedestal3D` hover bob isolation**: Gentle bob must offset only `podiumBodyGroup`, `chibiSprite.group`, and `auraGroup` while leaving `ped.group.position`, `ped.group.rotation.y`, `hitMesh`, and `labelSprite` rock-solid.
4. **Open-sky `MineEnvironment3D` & satellite clearance**: Zero boxy courtyard slabs, `VaultCoreDais` (`x = 10.25, z = 1.65`) separated cleanly from the `r = 7.95` arena ring, and rear sky window unobstructed.
5. **Arena-wide camera framing**: Mine mode `pitch = -0.18, radius = 20.4, lookAt = (0, 0.85, 0.15)` without affecting `shop`, `altar`, `fusion`, `tower`, or `omega`.

---

### Task 1: Deep Circular Arena Pool (`OrePitStage3D`, `OrePit3D`, `ProceduralTextures3D`, `MineSceneInput`, `PlotAttackController3D`)

**Files:**
- Modify: `src/game3d/ProceduralTextures3D.ts`
- Modify: `src/game3d/OrePitStage3D.ts`
- Modify: `src/game3d/OrePit3D.ts`
- Modify: `src/game3d/MineSceneInput.ts`
- Modify: `src/game3d/PlotAttackController3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Produces:
  - `getCircularNexusPoolTexture(stoneHex: string, crystalHex: string): THREE.Texture` in `ProceduralTextures3D.ts`
  - `PIT_RADIUS = 6.4`, `PIT_FLOOR_Y = -1.95`, `PIT_CENTER_Z = 1.65` in `OrePitStage3D.ts` (re-exported by `OrePit3D.ts`)
  - Circular stepped `LatheGeometry` crater + 3 concentric flat neon torus rings in `buildOrePitEnvironmentMeshes`
  - Polar disc ore sampling inside `OrePit3D` + circular `getPitFloorHitInScene` at `y = PIT_FLOOR_Y` + `PIT_FLOOR_Y`-aware `PlotAttackController3D`

- [ ] **Step 1: Update/add failing tests in `tests/world-3d.test.ts`**
  - Assert `PIT_RADIUS === 6.4`, `PIT_FLOOR_Y === -1.95`, `PIT_CENTER_Z === 1.65`.
  - Assert all spawned ores (`setActiveNodeCount(20)`) lie inside `hypot(worldX, worldZ - PIT_CENTER_Z) <= PIT_RADIUS - 0.85`.
  - Assert `pit` circular crater rim has solid geometry around `r = 6.5..7.9` (`x = 7.0, z = PIT_CENTER_Z`) and `x = 0, z = PIT_CENTER_Z + 7.0`, while `x = 0, z = PIT_CENTER_Z` hits the deep pool floor at `worldY ≈ -1.95`.
  - Assert `triggerSkillPulse` still boosts & decays `pitNeonMat.emissiveIntensity`.
- [ ] **Step 2: Run Vitest to confirm RED**
- [ ] **Step 3: Implement `getCircularNexusPoolTexture`, circular stepped `LatheGeometry` + 3 neon rings (`OrePitStage3D.ts`), polar disc spawning (`OrePit3D.ts`), `y = PIT_FLOOR_Y` circular `getPitFloorHitInScene` (`MineSceneInput.ts`), and `PIT_FLOOR_Y` / radial `wideCenter` (`PlotAttackController3D.ts`)**
- [ ] **Step 4: Run Vitest to confirm GREEN & commit**

---

### Task 2: Floating Crescent Podiums & Anti-Grav Thrusters (`PlotPedestal3D`, `MineSceneStage3D`)

**Files:**
- Modify: `src/game3d/PlotPedestal3D.ts`
- Modify: `src/game3d/MineSceneStage3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Produces:
  - `STAGE_CRESCENT_SLOTS` floating coordinates: `P1/P5 (±7.35, 0.72, -3.15, ±0.58)`, `P2/P4 (±3.85, 1.04, -5.10, ±0.30)`, `P3 (0, 1.38, -5.90, 0)`
  - Tapered octagonal anti-grav thruster keel + downward additive energy plume inside `PlotPedestal3D.podiumBodyGroup`, plus isolated hover bob (`±0.045m`) on `podiumBodyGroup`, `chibiSprite.group`, and `auraGroup` (leaving `ped.group`, `hitMesh`, `labelSprite` static).
  - Removal of ground plinth blocks, bay bars, and central ramp from `buildMineStageAndChest`.

- [ ] **Step 1: Update/add failing tests in `tests/world-3d.test.ts`**
  - Update `STAGE_CRESCENT_SLOTS` assertion to the floating coordinates (`P3: (0, 1.38, -5.90, 0)`, `P1: (-7.35, 0.72, -3.15, 0.58)`).
  - Assert `PlotPedestal3D.update(...)` bobs `podiumBodyGroup` while `ped.group.position.y` and `ped.group.rotation.y === 0` remain invariant, and `pedBox.min.y < 0` (thruster chassis/plume underneath).
  - Update `buildMineStageAndChest` test to verify `envGroup` adds zero ground plinth boxes under `STAGE_CRESCENT_SLOTS` (`envGroup.children.length === 0`) and `crateGroup` sits at `(10.25, 1.03, 1.65)`.
- [ ] **Step 2: Run Vitest to confirm RED**
- [ ] **Step 3: Implement thruster keel/plume & isolated hover bob in `PlotPedestal3D.ts`, and remove plinths/ramp + move `crateGroup` to `(10.25, 1.03, 1.65)` in `MineSceneStage3D.ts`**
- [ ] **Step 4: Run Vitest to confirm GREEN & commit**

---

### Task 3: Open-Sky `MineEnvironment3D` & Floating Satellite Wings (`ArenaWings3D`, `MineEnvironment3D`)

**Files:**
- Modify: `src/game3d/ArenaWings3D.ts`
- Modify: `src/game3d/MineEnvironment3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Produces:
  - Floating keels & downward thruster plumes on `createNexusLeftGate` (`(-11.4, 0.55, 1.15)`, `yaw = +0.26`) and `createVaultCoreDais` (`(10.25, 0.55, 1.65)`, `yaw = -0.26`).
  - Open-sky `MineEnvironment3D` with zero rectangular courtyard/cliff slabs, `InstancedMesh` drifting under-void crystal shards, catenary energy tethers linking satellite wings to the circular ring rim & distant spires, and clear rear sky window.

- [ ] **Step 1: Update/add failing tests in `tests/world-3d.test.ts`**
  - Verify `createNexusLeftGate` & `createVaultCoreDais` have floating underside keels (`min.y < 0`), `vaultBox.min.x > 8.3` (clean sky gap outside `r = 7.95` ring), `cableSocketWorld` grounded on north pillar, and `InstancedMesh` present.
  - Verify `MineEnvironment3D` has zero courtyard floor hit at `(±6.45, 0.15)` (open sky outside the ring!), keeps `rearSkyOccluderCount === 0`, and disposes cleanly.
- [ ] **Step 2: Run Vitest to confirm RED**
- [ ] **Step 3: Implement floating satellite keels/thrusters in `ArenaWings3D.ts` and pure open-sky environment + under-void `InstancedMesh` shards in `MineEnvironment3D.ts`**
- [ ] **Step 4: Run Vitest to confirm GREEN & commit**

---

### Task 4: Wide Arena Camera Framing, Full Verification, Visual Check & `GAME_MAP.md` Sync

**Files:**
- Modify: `src/game3d/MineSceneStage3D.ts`
- Modify: `src/game3d/MineScene3D.ts`
- Test: `tests/world-3d.test.ts`
- Modify: `GAME_MAP.md`

- [ ] **Step 1: Update camera test in `tests/world-3d.test.ts` (`getDefaultOrbitPitchForMode('mine') === -0.18` while other 5 modes stay unchanged)**
- [ ] **Step 2: Run Vitest to confirm RED**
- [ ] **Step 3: Update Mine camera framing (`pitch = -0.18`, `targetCamRadius = 20.4`, `lookAtPos = (0, 0.85, 0.15)`, `baseCamPos = (0, 11.7, 20.55)`) in `MineSceneStage3D.ts` and `MineScene3D.ts`**
- [ ] **Step 4: Run full `npm.cmd test`, `npm.cmd run build`, browser visual check (`1280×720` & `390×844`), sync `GAME_MAP.md`, and commit**
