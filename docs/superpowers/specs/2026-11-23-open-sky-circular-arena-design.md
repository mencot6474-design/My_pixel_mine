# Open-Sky Circular Arena & Floating Podiums (Opsi 2) — Design Spec

**Date:** 2026-11-23
**Status:** Approved

---

## 1. Intent & Why

Although the previous pass arranged the 5 pedestals into a crescent, the Mining World still felt blocky and shallow because:
- The ore pit remained a shallow (`0.68m` deep) rectangular box (`11.8 × 9.2m`).
- The island deck used flat rectangular courtyard slabs (`BoxGeometry`) with stepped blocks under the pedestals.

The user wants a dramatic visual pivot (**Opsi 2 — Open-Sky Circular Ring & Satellite Platforms**):
1. **A large, deep circular arena pool** (`12.8m` diameter, `-1.95m` deep) as the centerpiece ore & skill-VFX basin.
2. **Zero boxy outer island slabs** — an open-sky floating circular colosseum ring surrounded by sky/void, with **5 floating podiums** hovering over the northern arc and **floating Left/Right satellite wings** (`Dimensional Nexus Gate` & `Vault Core Dais + Chest`).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Large Deep Circular Arena Pool (`OrePitStage3D.ts`, `OrePit3D.ts`, `ProceduralTextures3D.ts`)**:
   - Expand and deepen the pit to `PIT_RADIUS = 6.4` (`12.8m` diameter), `PIT_CENTER_Z = 1.65`, `PIT_FLOOR_Y = -1.95` (nearly `3×` deeper than `-0.68`).
   - Build a 3-tier stepped circular colosseum ring (`LatheGeometry` + flat horizontal `TorusGeometry` neon rings + `CircleGeometry` pool floor) with a tapered floating underside hull and a dark-matte `getCircularNexusPoolTexture` floor so additive GLSL skill VFX pop cleanly.
   - Sample `5..20` ore node spawns inside a circular disc (`r <= PIT_RADIUS - 1.05`) with minimum spacing, and update `MineSceneInput.getPitFloorHitInScene` & `PlotAttackController3D` (`PIT_FLOOR_Y` + circular `wideCenter`) to match the deeper circular pool.
2. **Open-Sky Floating Environment (`MineEnvironment3D.ts`)**:
   - Remove all rectangular deck slabs (`cliffLower`, `cliffUpper`, `hullNeonBand`, `courtyardSpecs`, `wingLeft`, `wingRight`, `frontDeck`, `backDeck`, `sideCurbSeg`, `outerFlankTrim`, `frontPerimeterTrim`).
   - Add an `InstancedMesh` cluster of slow-drifting under-void crystal shards below the floating ring, keep distant spire buoys outside the rear sky window, and link satellite wings to the arena ring with energy tethers.
3. **5 Floating Crescent Podiums (`PlotPedestal3D.ts`, `MineSceneStage3D.ts`)**:
   - Remove all ground plinth blocks and the central ramp.
   - Hover the 5 pedestals along a curved arc above the northern circular rim (`P3` highest at `y = 1.38`), each equipped with a chamfered **anti-grav thruster chassis & downward additive energy plume** under `bayDock`.
   - Apply a gentle phase-offset hover bob (`±0.045m`) to `podiumBodyGroup`, `chibiSprite.group`, and `auraGroup` while keeping `PlotPedestal3D.group`, `hitMesh`, `labelSprite`, and `ChibiSprite3D` blitz axes rock-solid (`rotation.y === 0`).
4. **Floating Satellite Wings (`ArenaWings3D.ts`, `MineSceneStage3D.ts`)**:
   - Upgrade `createNexusLeftGate` (left satellite) and `createVaultCoreDais` (right satellite) with tapered floating keels and downward anti-grav thruster cones.
   - Reposition the right satellite + `crateGroup` (`Chest`) to `(9.85, 0.55, 3.85)` (chest at `(9.85, 1.03, 3.85)`) so the Vault Dais floats with a clean sky gap outside the `r = 7.95m` circular ring and clears the right HUD `Daily` button cleanly on `1280×720`.
5. **Arena-Wide Camera Framing (`MineScene3D.ts`, `MineSceneStage3D.ts`)**:
   - Pull Mine resting camera slightly back (`targetCamRadius = 20.4`, `getDefaultOrbitPitchForMode('mine') = -0.18`, `lookAtPos = (0, 0.85, 0.15)`) to frame the `15.9m` circular ring, all 5 floating pedestals, and both floating satellite wings without clipping `P3` under the top Overclock bar, while leaving all 5 other modes (`shop`, `altar`, `fusion`, `tower`, `omega`) untouched.

### Non-Goals
- No changes to combat damage/crit/AoE formulas (`PlotUnitsDomain.ts`, `getAoeTargetCount`), ore sprite rendering (`OreBillboard3D.ts`), or the other 5 scene modes (`shop`, `altar`, `fusion`, `tower`, `omega`).
- No UI CSS redesigns (only 3D world geometry, coordinates, input floor plane, and camera framing).

### Anti-Goals
- **Zero boxy rectangular slabs** in the Mining World environment or stage.
- **Zero gyroscopic / tilted tumbling orbit rings** (`.agent/rules/threejs-ts-standards.md`: all arena/thruster rings must be flat horizontal; only the Left Gate portal plane is strictly upright vertical).
- **Do NOT break `ChibiSprite3D` blitz coordinate math**: `PlotPedestal3D.group.rotation.y` remains `0` and `PlotPedestal3D.group.position` remains static; hover bob stays inside `podiumBodyGroup` / `chibiSprite` / `auraGroup`.
- **Do NOT block the central rear sky window** (`box.min.z < -7.5 && box.max.y > 4.2 && |center.x| < 14.0`).

---

## 3. Approaches Considered

1. **Opsi 2 — Open-Sky Circular Ring & Satellite Platforms (Chosen)**:
   - Removes all rectangular outer island geometry, turns the pit into a deep `12.8m` circular colosseum pool (`y = -1.95`), and floats all 5 podiums + both flanking wings in open sky.
2. **Opsi 1 — Circular Colosseum Basin inside Rectangular/Rounded Outer Deck (Rejected)**:
   - Keeps an outer deck ring around the pit; less dramatic open-sky silhouette than Opsi 2.
3. **Opsi 3 — Circular Cyber-Caldera + Suspended Tether Pods (Rejected)**:
   - Adds angled anchor struts behind every podium, cluttering Chibi silhouettes.

---

## 4. Detailed Architecture & Component Design

### 4.1 Giant Deep Circular Arena Pool (`OrePitStage3D.ts`, `OrePit3D.ts`, `ProceduralTextures3D.ts`)

1. **Constants (`OrePitStage3D.ts`, re-exported by `OrePit3D.ts`)**:
   - `PIT_CENTER_Z = 1.65`
   - `PIT_FLOOR_Y = -1.95`
   - `PIT_RADIUS = 6.4` (outer rim ring reaches `r = 7.95`, total ring diameter `15.9m`)
   - `PIT_HALF_W = 5.2`, `PIT_HALF_D = 5.2` (retained for compatibility)
2. **Circular Pool Floor & Stepped Lathe Crater (`buildOrePitEnvironmentMeshes`)**:
   - `CircleGeometry(PIT_RADIUS, 48)` rotated `-Math.PI / 2` at `local y = 0` (`world y = -1.95`), textured with `getCircularNexusPoolTexture(palette.pitFloorColor, palette.crystalColor)` (radial abyssal slate `#060a14`, faint concentric arcane/cyber rings, 12 radial spokes, soft rim glow).
   - **Stepped Circular Colosseum Wall & Floating Underside (`LatheGeometry`, 32 segments)**:
     - Profile rises from `(r = 6.38, local y = -0.05)` up 2 stepped inner ledges `(r = 6.55, y = 0.65)`, `(r = 6.90, y = 1.30)` to top walkway `(r = 7.15..7.95, y = 1.95 = world 0.0)`, then bevels underneath `(r = 7.80, y = 1.45) -> (r = 6.55, y = 0.55) -> (r = 6.30, y = -0.05)` so the entire ring looks like a sculpted floating stadium even from low/side angles.
   - **3 Flat Horizontal Neon Rings (`TorusGeometry`, rotated `Math.PI / 2`)** sharing `pitNeonMat`:
     - Base pool ring (`r = 6.34, tube = 0.055, local y = 0.05`)
     - Mid terrace ring (`r = 6.72, tube = 0.045, local y = 1.32`)
     - Outer sky rim ring (`r = 7.90, tube = 0.06, local y = 1.97`)
   - **6 Radial Rim Finials** placed on the outer rim at angles avoiding the northern podium arc (`±78°, ±128°, ±162°` from `-Z`, i.e., side & south rim only) so `P1..P5` sightlines stay 100% open.
   - `triggerSkillPulse(colorHex, strength)` modulates `pitNeonMat` across all 3 concentric rings simultaneously.
3. **Circular Ore Spawning (`OrePit3D.ts`) & Raycast/VFX Floor (`MineSceneInput.ts`, `PlotAttackController3D.ts`)**:
   - `pickSpreadNodePosition`: sample inside `r <= PIT_RADIUS - 1.05` (`5.35m`) using polar disc sampling (`sqrt(rand) * maxR`), maximizing minimum distance across `14` candidates.
   - `METEOR_TARGET_X = 0`, `METEOR_TARGET_Z = -0.15` (pit-local, near pool center).
   - `MineSceneInput.getPitFloorHitInScene`: intersect ray with horizontal plane `y = PIT_FLOOR_Y` (`-1.95`); return `{ x: px, z: pz }` when `px * px + (pz - PIT_CENTER_Z) * (pz - PIT_CENTER_Z) <= (PIT_RADIUS + 0.45) ** 2`.
   - `PlotAttackController3D`: replace hardcoded `-0.68` with `PIT_FLOOR_Y`, and clamp `computeZoneWideCenter` radially inside `3.8m` of `(0, PIT_CENTER_Z)`.

---

### 4.2 Floating Crescent Podiums (`PlotPedestal3D.ts`, `MineSceneStage3D.ts`)

1. **5 Floating Coordinates (`STAGE_CRESCENT_SLOTS`)**:
   Surrounding `(0, PIT_CENTER_Z = 1.65)` just outside/above the `r = 7.95` outer ring:
   - **Slot `0` (`P1`, Far Left)**: `x = -7.35`, `y = 0.72`, `z = -3.15`, `visualYaw = +0.58 rad`
   - **Slot `1` (`P2`, Inner Left)**: `x = -3.85`, `y = 1.04`, `z = -5.10`, `visualYaw = +0.30 rad`
   - **Slot `2` (`P3`, Ace Centerpiece)**: `x = 0.00`, `y = 1.38`, `z = -5.90`, `visualYaw = 0`
   - **Slot `3` (`P4`, Inner Right)**: `x = +3.85`, `y = 1.04`, `z = -5.10`, `visualYaw = -0.30 rad`
   - **Slot `4` (`P5`, Far Right)**: `x = +7.35`, `y = 0.72`, `z = -3.15`, `visualYaw = -0.58 rad`
   *(Adjacent spacing `~3.93m–4.00m`; `P1/P5` sit at `r = 8.79m`, `P2/P4` at `r = 7.77m`, `P3` at `r = 7.55m` from `(0, 1.65)`, hovering cleanly `0.72m–1.38m` above the ring rim!)*
2. **Anti-Grav Thruster Chassis & Gentle Hover Bob (`PlotPedestal3D.ts`)**:
   - Inside `podiumBodyGroup`, add a tapered octagonal underside keel (`CylinderGeometry(0.86, 0.28, 0.36, 8)` at `y = -0.18`), glowing thruster emitter ring (`y = -0.37`), and soft downward additive cone plume (`ConeGeometry(0.42, 0.68, 12, 1, true)` flipped pointing down at `y = -0.72`, low-opacity `AdditiveBlending`).
   - In `PlotPedestal3D.update(dtSec, elapsed, camera)`, compute `bob = Math.sin(elapsed * 1.85 + this.index * 1.15) * 0.045` and apply `this.podiumBodyGroup.position.y = bob`, `this.chibiSprite.group.position.y = 0.28 + bob`, and `this.auraGroup.position.y = bob`. `this.group.position`, `hitMesh`, and `labelSprite` remain static (zero label jitter, zero blitz coordinate drift).
3. **Stage Cleanup (`MineSceneStage3D.ts`)**:
   - Remove all `plinthSpecs` blocks, `deckPlate`s, `bayDivMat` bars, and `conduitFrame` ramp from `buildMineStageAndChest`. Keep only the 5 floating `PlotPedestal3D`s and the floating right `crateGroup` (`Chest`).

---

### 4.3 Open-Sky Floating Environment & Satellite Wings (`MineEnvironment3D.ts`, `ArenaWings3D.ts`)

1. **Pure Open-Sky `MineEnvironment3D.ts`**:
   - Remove all rectangular island slabs (`cliffLower`, `cliffUpper`, `hullNeonBand`, `courtyardSpecs`, `wingLeft`, `wingRight`, `frontDeck`, `backDeck`, `sideCurbSeg`, `outerFlankTrim`, `frontPerimeterTrim`).
   - Keep `skyDome`, drifting clouds, `20` GPU mana motes, and 4 distant floating spire buoys at `(±17.5, -10.5)` and `(±20.5, -16.5)` (keeping rear central sky window `z < -7.5, y > 4.2, |x| < 14.0` clear).
   - Add an `InstancedMesh` of `16` slow-bobbing dark-crystal under-void shards suspended around `r = 8.5..13.5, y = -2.6..-1.4` (hidden or halved in `lowQuality`) for depth in open sky.
   - Connect `leftGate.cableSocketWorld` and `vaultDais.cableSocketWorld` to the circular ring's flank anchor nodes (`(±7.90, 0.0, 1.35)`) and distant spire buoys via catenary energy conduits + `InstancedMesh` flowing pulses.
2. **Floating Satellite Wings (`ArenaWings3D.ts`)**:
   - **Left Satellite Nexus Gate** centered at `(-11.4, 0.55, 1.15)` (`yaw = +0.26 rad`): add a tapered octagonal floating island keel + downward anti-grav thruster cone beneath `lowerPlinth` (`local y = -0.95 .. 0`), keeping all gate slabs bottom-origin `[0..h]` and `cableSocketWorld` computed on the north pillar top.
   - **Right Satellite Vault Core Dais** centered at `(9.85, 0.55, 3.85)` (`yaw = -0.26 rad` around `(9.85, 3.85)`):
     - Raised floating octagonal dais at `y = 0.55` with tapered floating underside keel + downward anti-grav thruster glow (`local y = -0.85 .. 0`), plus rear shield fins sitting flush on `rearDeck`, separated by a clean sky gap from the `r = 7.95m` circular arena ring.
     - `crateGroup` (`Chest`) sits on top of the dais at `(9.85, 1.03, 3.85)` with `chestVisual.group.rotation.y = -Math.PI / 2 - 0.28`, placing it below the HUD `Daily`/`Trophy` rail on `1280×720` so the Chest is unoccluded and cleanly clickable.

---

### 4.4 Camera Framing (`MineScene3D.ts`, `MineSceneStage3D.ts`)

- Keep `baseCamPos.y = 11.7` unchanged for all other 5 modes (`shop`, `altar`, `fusion`, `tower`, `omega`).
- Tune **only** Mine mode resting orbit:
  - `getDefaultOrbitPitchForMode('mine') = -0.18`
  - `targetCamRadius = 20.4`
  - `lookAtPos = (0, 0.85, 0.15)`
  - Sync `MineScene3D` initial fields (`baseCamPos = (0, 11.7, 20.55)`, `orbitPitch = -0.18`, `camRadius = 20.4`) and `setTutorialPitZoom(false)` / `setTutorialChestZoom(false)` resets.
- Update `setTutorialPitZoom(true)` `targetCamRadius` (`10.2`) if needed so zooming into the deeper `-1.95` circular pool frames the tutorial center ore cleanly.

---

## 5. Verification Plan

1. **Automated Tests (`npm.cmd test`)**:
   - Update/add `tests/world-3d.test.ts` specs for:
     - `PIT_RADIUS === 6.4`, `PIT_FLOOR_Y === -1.95`, circular ore spawn containment (`r <= PIT_RADIUS - 0.9`), sealed circular `LatheGeometry` rim + 3 concentric neon rings + `triggerSkillPulse`.
     - `STAGE_CRESCENT_SLOTS` floating coordinates (`P3` at `y = 1.38`), `PlotPedestal3D` anti-grav thruster + hover bob leaving `ped.group.position` & `ped.group.rotation.y === 0` invariant.
     - `MineEnvironment3D` zero rectangular courtyard slabs, unobstructed rear sky window, floating satellite wings `createNexusLeftGate` (`max.x < -7.5`, `min.y < 0`) and `createVaultCoreDais` (`min.x > 6.8`, `min.y < 0`) with `InstancedMesh` and full `dispose()`.
     - `MineSceneStage3D` Mine camera pitch (`-0.18`) while keeping the other 5 modes intact.
2. **Typecheck & Build (`npm.cmd run build`)**:
   - `tsc --noEmit && vite build` passes cleanly, all `src/` files `< 1,000` lines.
3. **Browser Visual Smoke Test (`1280×720` & `390×844`)**:
   - Verify deep circular colosseum pool, open sky around the ring, 5 floating pedestals + under-thrusters, floating Left Nexus Gate & Right Vault Chest unoccluded by HUD, and 0 console/network errors.
4. **Documentation Sync**:
   - Update `GAME_MAP.md`.
