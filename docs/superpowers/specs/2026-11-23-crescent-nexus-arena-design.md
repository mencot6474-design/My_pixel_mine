# Crescent Nexus Arena (Mining World Overhaul) — Design Spec

**Date:** 2026-11-23
**Status:** Approved

---

## 1. Intent & Why

Chibis in `my_chibi_mine` no longer walk down into the pit to swing pickaxes manually. Instead, they remain stationed on 5 showcase pedestals and unleash multi-wave, tier-scaled 3D GLSL/mesh skill choreographies (`firePodiumWeaponCast`, 13-tier blitz, 5 Synchro Fusions, 5 Tier TWIN Sakuga, and 2 Tier OMEGA finishers) into the ore pit.

However, the current Mining World (`MineEnvironment3D.ts`, `MineSceneStage3D.ts`, `OrePitStage3D.ts`, `CaveRailway3D.ts`, `ChestVaultStation3D.ts`) still reflects the legacy "worker quarry" layout:
- A central descending **stairwell** (`z = -3.14 .. -1.90`) with no gameplay purpose.
- A flat straight rear rack (`z = -4.58`) where all 5 Chibis stand at the same height and depth, flattening silhouettes and crowding upper-screen framing.
- A noisy cobble/industrial pit floor and left/right minecart drop-shaft & refinery escalator trenches that visually compete with additive GLSL skill shaders.

This overhaul converts the Mining World into a **Crescent Nexus Arena**: an anime skill-showcase amphitheater that frames every Chibi's tier, back-attachments, and diagonal cross-arena skill VFX with high contrast and zero legacy mining clutter.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Crescent Stepped 5-Podium Stage**: Arrange the 5 plot pedestals (`0..4`) in a curved, 3-tier elevated crescent amphitheater facing the pit center (`0, 1.85`), with slot `2` (`P3`) elevated highest as the central *Ace / Centerpiece* podium.
2. **Dark-Matte Nexus Crater Pit**: Remove the obsolete central stairwell and side trench gaps; unify the pit into a seamless, dark-matte energy containment crater with thin World-palette neon trim (`W1–W8`) so additive GLSL shaders and `UnrealBloomPass` pop cleanly.
3. **Arena Wing Re-Theme (Left & Right Flanks)**:
   - **Left Wing**: Replace the minecart railway & drop shaft with a **Dimensional Nexus Gate / Energy Beacon Pylon** (atmospheric, matching World palette).
   - **Right Wing**: Replace the industrial plasma refinery escalator chute with a sleek **Vault Core Dais** housing the existing clickable `createProceduralTreasureChest` (`crateGroup`) at a harmonious flanking angle/position.
4. **Pit Skill-Pulse Reactivity**: Briefly pulse the Nexus Pit rim & conduit trim with the casting Chibi's accent color whenever `secret+` / `fusion` / `limited` / `twin` / `omega` chibis execute a skill cast or finisher, using zero extra draw calls or shaders (simple material emissive boost + color lerp).
5. **Hero Camera Framing**: Slightly lower the resting Mine camera elevation (`baseCamPos` & `lookAtPos`) so 3D back-attachments (`Clockwork`, `Halcyon`, `Nocturne`, `Omega`), stepped podium tiers, and diagonal skill arcs read dramatically while keeping all `5..20` pit ores and Sweet-Spot rings unobstructed.

### Non-Goals
- No changes to gameplay combat math (`PlotUnitsDomain.ts`, `PlotAttackController3D.ts` AoE/barrage formulas), ore spawn bounds (`PIT_HALF_W = 4.8`, `PIT_HALF_D = 3.45`, `PIT_CENTER_Z = 1.85`), or `OreBillboard2D` sprite rendering.
- No changes to `ShopWorld3D`, `EnchantAltarRoom3D`, `FusionWorld3D`, `TowerArena3D`, or `OmegaArena3D`.
- No new heavy post-processing passes or high-poly bloat that hurts the default `'low'` graphics preset.

### Anti-Goals
- **Do NOT rotate `PlotPedestal3D.group.rotation.y` directly**: `ChibiSprite3D` computes blitz/afterimage world-to-local offsets assuming an axis-aligned parent (`rotation.y === 0`). Only the visual podium mesh sub-group inside `PlotPedestal3D` may rotate to angle toward the pit center; `ChibiSprite3D` sprites, `hitMesh`, `labelSprite`, and blitz coordinates must stay clean and un-skewed.
- **Do NOT obstruct the central rear sky window**: Distant/wing pylons must still keep `box.min.z < -7.5 && box.max.y > 4.2 && |center.x| < 14.0` clear (existing `MineEnvironment3D` Void/Bloodmoon sky-window invariant).
- **Do NOT regress `Chest` clickability or `WorldOverlayHudUi` alignment**: `crateGroup` and all 5 `PlotPedestal3D`s must remain registered in `clickableMeshes` and projected accurately via `MineSceneProjector`.

---

## 3. Approaches Considered

1. **Opsi A — Crescent Nexus Arena + Wing Pylon Re-Theme (Chosen)**:
   - Converts the center stage into a 3-tier curved crescent, replaces the stairwell with a main energy conduit, darkens/cleans the pit floor, and re-themes both wings (`Nexus Gate` left + `Vault Dais` right).
   - *Trade-off*: Modifies stage geometry, wing builders, pedestal coordinates, and resting camera; requires updating the legacy `CaveRailway`/`ChestVaultStation` assertions in `tests/world-3d.test.ts` (or keeping standalone legacy exports if needed while decoupling `MineEnvironment3D`). Chosen because it delivers cohesive anime skill-arena presentation without breaking core pit/HUD architecture.
2. **Opsi B — Floating Sky Sanctuary / Crystal Rift (Rejected)**:
   - Replaces the full deck with 5 floating islands around an open abyss.
   - *Trade-off*: High raycast/floor-click risk for `OrePit3D` and background visual noise behind ore HP bars.
3. **Opsi C — Tactical Strike Deck on Linear Layout (Rejected)**:
   - Keeps the straight horizontal line of 5 pedestals.
   - *Trade-off*: Leaves upper-screen framing flat and misses diagonal cross-fire skill sightlines.

---

## 4. Detailed Architecture & Component Design

### 4.1 Crescent 5-Podium Amphitheater (`MineSceneStage3D.ts`, `PlotPedestal3D.ts`)

1. **Podium Coordinates & Elevations** (facing pit center `(0, 1.85)` with full clearance from the north pit wall at `z = -2.75`):
   Let `STAGE_CRESCENT_SLOTS` define each pedestal's `(x, y, z, visualYaw)`:
   - **Slot `0` (`P1`, Far Left)**: `x = -7.05`, `y = 0.28`, `z = -4.35`, `visualYaw = +0.46 rad` (~`+26.4°`, angled inward toward pit center)
   - **Slot `1` (`P2`, Inner Left)**: `x = -3.60`, `y = 0.48`, `z = -5.45`, `visualYaw = +0.24 rad` (~`+13.8°`)
   - **Slot `2` (`P3`, Ace Centerpiece)**: `x = 0.00`, `y = 0.72`, `z = -6.05`, `visualYaw = 0`
   - **Slot `3` (`P4`, Inner Right)**: `x = +3.60`, `y = 0.48`, `z = -5.45`, `visualYaw = -0.24 rad` (~`-13.8°`)
   - **Slot `4` (`P5`, Far Right)**: `x = +7.05`, `y = 0.28`, `z = -4.35`, `visualYaw = -0.46 rad` (~`-26.4°`)

   *Clearance & spacing check*:
   - Adjacent slot distances are `~3.62m` (`P1–P2`) and `~3.65m` (`P2–P3`), wider than the old `3.22m` linear gap, guaranteeing zero overlap for `1.5×` podiums, `labelSprite`, and Tier TWIN/OMEGA back-attachments.
   - `P1`/`P5`'s rotated `bayDock` corners stay north of `z = -3.80` (`> 1.0m` clear of the pit wall at `z = -2.75`), and `P1`/`P5` sit at `y = 0.28` (at/above pit rim top `+0.295`), leaving `> 3.2m` Z-clearance north of `crateGroup` (`x = +8.45, z = +0.15`).
   - *(Designer's call)* Courtyard slab bounds behind the stage (`backDeck` / `courtyardSpecs` north slab) may extend slightly north (`z` to `-7.6 .. -6.5`) if needed so `P3`'s `z = -6.05` plinth sits solidly on deck armor without overhang.

2. **Safe Podium Visual Yaw (`PlotPedestal3D.ts`)**:
   - Add an optional `visualYaw = 0` constructor parameter (or `setVisualYaw(yaw: number)`) on `PlotPedestal3D`.
   - Wrap the podium hardware meshes (`bayDock`, bumper guards, cooling louvers, `machineryPlinth`, `holoLensDisc`, `ringMesh`, `claw`/`diode` accents) inside a child `podiumBodyGroup` rotated by `visualYaw`, **leaving `this.group.rotation.y = 0`**.
   - Update `getAttackOriginWorldPosition(out)` to apply `visualYaw` to the local `(0, 1.35 * PLOT_PODIUM_SCALE, 0.35 * PLOT_PODIUM_SCALE)` offset (`Math.sin(visualYaw)` / `Math.cos(visualYaw)`) so cast projectiles launch accurately from the front edge of angled podiums.
   - Keep `chibiSprite`, `hitMesh`, `auraGroup`, and `labelSprite` attached cleanly without inheriting broken blitz coordinate axes.

3. **Stepped Crescent Dais & Energy Conduit (`MineSceneStage3D.ts`)**:
   - Replace the flat `stageBase` / `rackDeck` rectangles and the 4-step `stairwell` with:
     - **3-Tier Stepped Crescent Plinths**: An elevated central **Ace Tier Deck** under `P3`, flanked by **Mid Tier Wings** under `P2/P4`, and **Front Wing Pads** under `P1/P5`, using `createChamferSlabGeometry` / `CylinderGeometry` / `ExtrudeGeometry` chamfered dark-slate armor (`#161f30`, `#223047`) with neon edge trim (`stageNeonMat`).
     - **Central Main Energy Conduit**: In place of the old stairwell (`x in [-1.30..1.30]`, `z = -3.14..-1.90`), build a recessed glowing **Nexus Energy Channel** sloping cleanly from the Ace dais down to the north pit rim, channeling energy visually from the Chibi team into the pit.
     - **Stage Bay Dividers**: Reposition subtle chamfered holo divider fins along the arc between podium bays (no overlap with podium footprints).
     - Merge all static stage meshes via `mergeStaticMeshesByMaterial` to keep draw calls minimal.

---

### 4.2 Dark-Matte Nexus Crater Pit (`OrePitStage3D.ts`, `OrePit3D.ts`, `ProceduralTextures3D.ts`)

1. **Seamless Containment Rim & Pylon Clearance**:
   - Close the 3 legacy gaps in `wallSpecs` (north stairwell opening, left shuttle spur, right refinery chute) into a continuous perimeter retaining wall around `pitW = 11.8`, `pitD = 9.2`, topped with a clean neon collar (`pitNeonMat`) and corner anchor pylons.
   - *(Designer's call)* Relocate the NW/NE anchor pylons from `(±5.90, -2.75)` slightly south/outward onto the pit's upper west/east shoulders (`x = ±6.12, z = -1.85`) while keeping the SW/SE corner pylons at `(±5.90, +4.60)`, guaranteeing zero overlap with `P1`/`P5`'s rotated aprons/docks.
   - Keep `PIT_CENTER_Z = 1.85`, `PIT_FLOOR_Y = -0.68`, `PIT_HALF_W = 4.8`, `PIT_HALF_D = 3.45` unchanged so all ore spawning, click raycasting, Sweet-Spot ring positioning, and `computeZoneWideCenter` remain 100% intact.

2. **Dark-Matte Contrast Pit Floor (`ProceduralTextures3D.ts` / `OrePitStage3D.ts`)**:
   - Update `getQuarryFloorTexture` (or add `getNexusArenaFloorTexture` used by `OrePitStage3D`) to render a **dark-matte cyber-arena slate** (`#0b111e` / tinted softly by `palette.pitFloorColor` mixed dark) with subtle concentric nexus ring etchings and low-contrast tactical grid lines (`opacity <= 0.18`).
   - Add a soft dark radial vignette + faint center nexus emblem so additive GLSL slashes, floor seals (`Clockwork` astrolabe, `Nocturne` eclipse crater, `Lullaby` music-box seal, `Fusion` mandalas), and `UnrealBloomPass` achieve crisp visual pop without competing background noise.

3. **Skill-Reactive Pit Rim Pulse (`OrePit3D.ts` / `MineScene3D.ts` / `PlotAttackController3D.ts`)**:
   - Expose `triggerSkillPulse(colorHex: string, strength?: number)` on `OrePit3D` (and/or `MineEnvironment3D` deck trim).
   - When `PlotAttackController3D` triggers a cast/finisher for high-tier rarities (`secret`, `fusion`, `limited`, `twin`, `omega`), invoke an optional callback `onHighTierSkillPulse(accentColor, strength)` so `pitNeonMat` & `stageNeonMat` briefly flash toward that Chibi's accent color (`emissiveIntensity` `1.05 -> 2.15`, smoothly decaying back to `palette.crystalColor` over `~0.45s`). Zero extra meshes, zero shader recompilation.

---

### 4.3 Arena Wing Re-Theme & Courtyard Deck (`MineEnvironment3D.ts`, new `ArenaWings3D.ts` or updated wing builders)

1. **Continuous Courtyard Deck (`MineEnvironment3D.ts`)**:
   - Close the left/right sunken trenches (`leftTrench`, `rightTrench`) and north stairwell notch in `courtyardSpecs` so the deck forms a clean, symmetrical dark-basalt arena apron framing the Nexus Pit.
   - Keep `wingLeft` / `wingRight` terrace footprints (`x = ±12.4`) and outer neon trims, while softening `cobbleMat` & `terrainMat` contrast (`getTerrainTexture` / `getCobblePathTexture` darkened slightly or color-multiplied cleanly) to match the high-contrast arena look.
   - Preserve the rear sky-window invariant (`z < -7.5`, `y > 4.2`, `|x| < 14.0` completely unobstructed).

2. **Left Wing — Dimensional Nexus Gate (`ArenaWings3D.ts` or `MineEnvironment3D.ts`)**:
   - Replace the mining drop shaft + maglev cart (`createCaveRailway`) inside `MineEnvironment3D` with a sculpted **Dimensional Nexus Gate / Energy Beacon Pylon** at `x ≈ -9.8 .. -12.4, z ≈ 0.15`:
     - Chamfered dark-slate stepped plinth + twin angled energy pylons framing a tall vertical translucent holo-portal sheet (custom subtle scanline/chevron `MeshBasicMaterial` or `ShaderMaterial` + animated floating energy chevrons via `InstancedMesh`, zero gyroscopic spinning hoops per `.agent/rules/threejs-ts-standards.md`).
     - Reacts to `setPalette(crystalColor, ...)` and `setLowQuality(low)` (reduces animated chevron count or pauses minor ambient bob in low mode).

3. **Right Wing — Vault Core Dais (`ArenaWings3D.ts` + `crateGroup` in `MineSceneStage3D.ts`)**:
   - Replace the plasma refinery conveyor & escalator (`createChestVaultStation`) inside `MineEnvironment3D` with a clean **Vault Core Dais** at `x ≈ +8.45 .. +12.4, z ≈ 0.15`:
     - Stepped octagonal vault platform + twin flanking cyber-shield fins + subtle vertical beacon light columns behind the chest, visually framing `crateGroup` (`createProceduralTreasureChest` at `(8.45, 0.48, 0.15)` angled slightly inward `rotation.y = -Math.PI / 2 - 0.18` toward the arena center).
     - Preserves `crateHit` hitbox, `onChestClick`, chest hover bounce, and `onChestAnchor` screen projection seamlessly.

4. **Legacy Module & Test Strategy (Builder's Call)**:
   - Keep `CaveRailway3D.ts` and `ChestVaultStation3D.ts` either cleanly deprecated/preserved if referenced directly by existing unit tests, OR replace their usage in `MineEnvironment3D.ts` with `ArenaWings3D.ts` while keeping `createProceduralTreasureChest` in `ChestVaultStation3D.ts` (or `ProceduralTreasureChest3D.ts`) intact. Any `tests/world-3d.test.ts` spec that specifically asserts the old minecart/escalator inside `MineEnvironment3D` should be updated to verify the new Crescent Nexus Arena invariants (5 stepped crescent pedestals, closed pit rim, Nexus Gate & Vault Dais with `InstancedMesh`, sky window clear, zero circular imports, full `dispose()`).

---

### 4.4 Hero Camera Framing (`MineScene3D.ts`, `MineSceneStage3D.ts`)

- *(Designer's call — preserving shared camera math across all 6 modes)* Keep `baseCamPos.y = 11.7` unchanged so `shop`, `altar`, `fusion`, `tower`, and `omega` remain untouched and `stepMineSceneCamera` / `applyMineSceneModeTransition` keep using the existing cylindrical orbit formula `camY = (baseCamPos.y + pitch * 7) * (camRadius / 16.5)` and `camZ = lookAtPos.z + camRadius`.
- Adjust **only** Mine mode's resting orbit parameters:
  - `getDefaultOrbitPitchForMode('mine')`: **`-0.22`** (was `0`, matching how `'tower'`/`'omega'`/`'altar'`/`'fusion'` set negative pitch for hero framing and keeping `cameraLocked` snapping to `-0.22`)
  - `lookAtPos`: `(0, 0.95, -0.35)` (was `(0, 0.55, 0.35)`)
  - `targetCamRadius` / initial `camRadius`: **`18.4`** (was `18.8`)
  - Sync initial `MineScene3D` fields (`orbitPitch = -0.22`, `targetOrbitPitch = -0.22`, `camRadius = 18.4`, `targetCamRadius = 18.4`, `baseCamPos = new THREE.Vector3(0, 11.7, 18.05)`) so frame-0 matches the resting orbit (`world camera ≈ (0, 11.33, 18.05)` vs old `(0, 13.33, 19.15)`).
- Builder should verify in browser smoke test (`1280×720` desktop & `390×844` mobile portrait) that:
  - All 5 pedestals (`P1..P5`) including `P3` label & tier crest stay cleanly below the top currency HUD rail.
  - Both Left Nexus Gate and Right Chest Vault remain framed inside desktop viewport and accessible via orbit/zoom on mobile.
  - All `5..20` pit ores remain clearly separated with zero overlapping HP bars.

---

## 5. Verification Plan

1. **Automated Tests**:
   - `npm.cmd test`: Add/update `tests/world-3d.test.ts` coverage for:
     - Crescent pedestal coordinates (`P3` highest `y`, `P1/P5` angled inward via `visualYaw` while `ped.group.rotation.y === 0`).
     - `getAttackOriginWorldPosition` respecting `visualYaw`.
     - `MineEnvironment3D` + `ArenaWings3D` build, `setPalette`, `setLowQuality`, unobstructed rear sky window, and full `dispose()`.
     - Pit rim skill-pulse reactivity (`triggerSkillPulse`) decaying cleanly back to palette color.
2. **Typecheck & Build**:
   - `npm.cmd run build` (`tsc --noEmit && vite build`) passes with zero errors and all `src/` files remain `< 1,000` lines.
3. **Browser Visual Smoke Test**:
   - Inspect live `mine` scene on desktop (`1280×720`) and mobile portrait (`390×844`) with 5 deployed high-tier Chibis (including `Twin`/`Omega`/`Fusion`), verifying: crescent stage silhouette, dark-matte pit contrast during skill casts, chest clickability, and HUD non-overlap.
4. **Documentation Sync**:
   - Update `GAME_MAP.md` with any new/modified file line counts and symbols.
