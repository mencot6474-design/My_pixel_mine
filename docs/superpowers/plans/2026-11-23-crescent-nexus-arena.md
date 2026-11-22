# Crescent Nexus Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Mining World into a **Crescent Nexus Arena** — a 3-tier curved 5-podium amphitheater with a dark-matte skill-reactive Nexus crater pit, Dimensional Nexus Gate left wing, Vault Core Dais right wing, and heroic camera framing without breaking combat math, HUD projections, or `low`-preset 60fps budgets.

**Architecture:** Isolate visual yaw inside `PlotPedestal3D` (`podiumBodyGroup`) while keeping `PlotPedestal3D.group.rotation.y === 0` so `ChibiSprite3D` blitz coordinates remain axis-aligned. Build the re-themed left/right arena wings in a dedicated `ArenaWings3D.ts` module consumed by `MineEnvironment3D.ts`, close legacy quarry wall/deck trenches in `OrePitStage3D.ts` and `MineEnvironment3D.ts`, and preserve `baseCamPos.y = 11.7` across all 6 modes while tuning Mine's resting orbit pitch/radius via `getDefaultOrbitPitchForMode('mine')`.

**Tech Stack:** TypeScript (strict), Three.js, Vitest (`npm.cmd test`), Vite (`npm.cmd run build`).

**Spec:** [2026-11-23-crescent-nexus-arena-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-23-crescent-nexus-arena-design.md)

## Global Constraints

- Strict TypeScript (`no any`), delta clamp `<= 0.1`, explicit `.dispose()` on all created geometries/materials/textures, zero circular import cycles.
- Keep every `src/` file strictly `< 1,000` lines (`MineScene3D.ts` is `969`, `MineSceneStage3D.ts` is `914`, `OrePit3D.ts` is `937`).
- No gyroscopic/armillary spinning rings around buildings/pedestals (`.agent/rules/threejs-ts-standards.md`); use `InstancedMesh` for repeated dynamic elements and `mergeStaticMeshesByMaterial` for static meshes.
- Preserve `OrePit3D` bounds (`PIT_CENTER_Z = 1.85`, `PIT_FLOOR_Y = -0.68`, `PIT_HALF_W = 4.8`, `PIT_HALF_D = 3.45`), `crateGroup` chest clickability (`(8.45, 0.48, 0.15)`), and central rear sky window (`z < -7.5`, `y > 4.2`, `|x| < 14.0` unobstructed).
- Verify after completion with `npm.cmd test`, `npm.cmd run build`, browser visual check (or headless build check if browser unavailable), and sync `GAME_MAP.md`.

## Review Focus

1. **`PlotPedestal3D` `visualYaw` vs `ChibiSprite3D` blitz math**: Rotating `PlotPedestal3D.group` breaks world-to-local blitz offsets; tests must verify `ped.group.rotation.y === 0`, rotated `podiumBodyGroup`, and accurate `getAttackOriginWorldPosition`.
2. **`P1`/`P5` clearance against pit north wall & NW/NE pylons**: Front aprons of `P1`/`P5` must stay clear of `OrePitStage3D` north wall (`z = -2.75`) and relocated NW/NE anchor pylons (`x = ±6.12, z = -1.85`).
3. **Shared `baseCamPos.y` & Tutorial/Lock camera resets**: Changing Mine pitch/radius must NOT shift `shop`/`altar`/`fusion`/`tower`/`omega` cameras, and `setTutorialPitZoom(false)` / `setTutorialChestZoom(false)` / `setCameraLocked(true)` must return to Mine's new resting framing (`pitch = -0.22`, `radius = 17.6`).
4. **Skill-reactive pit pulse in `'low'` quality & Overclock**: `triggerSkillPulse` must work even when `graphicsQuality === 'low'`, decay cleanly back to `activePalette.crystalColor`, and never overwrite `Overclock` active neon overrides.
5. **Arena Wing sky-window & Chest occlusion**: Left Nexus Gate and Right Vault Dais must keep the rear sky window clear (`z < -7.5, y > 4.2, |x| < 14.0`), dispose cleanly, and never block `crateHit` raycasts.

---

### Task 1: Crescent Podium Visual Yaw & Stepped Amphitheater Stage

**Files:**
- Modify: `src/game3d/PlotPedestal3D.ts`
- Modify: `src/game3d/MineSceneStage3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `PLOT_PODIUM_SCALE`, `createChamferPadGeometry`, `mergeStaticMeshesByMaterial` in `PlotPedestal3D.ts`.
- Produces:
  - `PlotPedestal3D` constructor `(index: number, x: number, z: number, visualYaw?: number)` + `getVisualYaw(): number`
  - `STAGE_CRESCENT_SLOTS: readonly { x: number; y: number; z: number; visualYaw: number }[]` exported from `MineSceneStage3D.ts`

- [ ] **Step 1: Write the failing test in `tests/world-3d.test.ts`**

Add assertions verifying `STAGE_CRESCENT_SLOTS` has 5 crescent slots with `P3` (`index 2`) highest at `(0, 0.72, -6.05)`, outer slots `P1/P5` at `(±7.05, 0.28, -4.35)` with `visualYaw = ±0.46`, `ped.group.rotation.y === 0` even when `visualYaw !== 0`, and `getAttackOriginWorldPosition` rotates the forward `+0.35 * PLOT_PODIUM_SCALE` Z-offset by `visualYaw` in world X/Z.

```ts
it('arranges 5 crescent pedestals with isolated visualYaw and rotated attack origins', () => {
  expect(STAGE_CRESCENT_SLOTS).toHaveLength(5);
  expect(STAGE_CRESCENT_SLOTS[2]).toEqual({ x: 0, y: 0.72, z: -6.05, visualYaw: 0 });
  expect(STAGE_CRESCENT_SLOTS[0]).toEqual({ x: -7.05, y: 0.28, z: -4.35, visualYaw: 0.46 });
  expect(STAGE_CRESCENT_SLOTS[4]).toEqual({ x: 7.05, y: 0.28, z: -4.35, visualYaw: -0.46 });

  const ped = new PlotPedestal3D(0, -7.05, -4.35, 0.46);
  ped.group.position.y = 0.28;
  expect(ped.group.rotation.y).toBe(0);
  expect(ped.getVisualYaw()).toBeCloseTo(0.46, 4);

  const origin = ped.getAttackOriginWorldPosition(new THREE.Vector3());
  const localFwd = 0.35 * 1.5;
  expect(origin.x).toBeCloseTo(-7.05 + Math.sin(0.46) * localFwd, 3);
  expect(origin.z).toBeCloseTo(-4.35 + Math.cos(0.46) * localFwd, 3);
  ped.dispose();
});
```

- [ ] **Step 2: Run Vitest on the new test to verify it fails**

Run: `npx vitest run tests/world-3d.test.ts -t "arranges 5 crescent pedestals"`
Expected: FAIL (`STAGE_CRESCENT_SLOTS` not exported / `getVisualYaw` undefined).

- [ ] **Step 3: Implement `visualYaw` isolation in `PlotPedestal3D.ts`**

- Add `private readonly visualYaw: number;` and `private readonly podiumBodyGroup = new THREE.Group();` on `PlotPedestal3D`.
- Accept optional `visualYaw = 0` as 4th constructor parameter; set `this.podiumBodyGroup.rotation.y = visualYaw;`.
- Attach all podium hardware meshes (`bayDock`, bumper guards, cooling louvers, `edgeSeamRing`, `machineryPlinth`, `frontApron`, `holoLensDisc`, `ringMesh`, `claw`/`diode` accents) to `this.podiumBodyGroup`, run `mergeStaticMeshesByMaterial(this.podiumBodyGroup, new Set<THREE.Object3D>([holoLensDisc]))`, and add `this.podiumBodyGroup` to `this.group`. Keep `hitMesh`, `labelSprite`, `chibiSprite`, and `auraGroup` directly on `this.group` (`this.group.rotation.y` remains `0`).
- Add `public getVisualYaw(): number` and update `getAttackOriginWorldPosition(out: THREE.Vector3)` to compute `x = pos.x + Math.sin(this.visualYaw) * fwd`, `z = pos.z + Math.cos(this.visualYaw) * fwd` (`fwd = 0.35 * PLOT_PODIUM_SCALE`).

- [ ] **Step 4: Implement `STAGE_CRESCENT_SLOTS` and Stepped Crescent Dais + Central Energy Conduit in `MineSceneStage3D.ts`**

- Export `STAGE_CRESCENT_SLOTS` with the 5 spec coordinates (`P1: (-7.05, 0.28, -4.35, +0.46)`, `P2: (-3.60, 0.48, -5.45, +0.24)`, `P3: (0, 0.72, -6.05, 0)`, `P4: (+3.60, 0.48, -5.45, -0.24)`, `P5: (+7.05, 0.28, -4.35, -0.46)`).
- In `buildMineStageAndChest`:
  - Replace the flat `stageBase`/`rackDeck` and the 4-step `stairwell` with 3 stepped chamfered crescent plinth tiers (`createChamferSlabGeometry`) supporting `P3` (`y=0.72`), `P2/P4` (`y=0.48`), and `P1/P5` (`y=0.28`) with perimeter `stageNeonMat` trim strips and subtle angled bay dividers between podiums.
  - Replace the stairwell (`x in [-1.30..1.30]`, `z = -3.14..-1.90`) with a sleek sloped **Central Energy Conduit** (`stageHoloMat` core + `stageNeonMat` side rails + dark armor channel) running from `P3`'s dais down toward the north pit rim (`z ≈ -2.93`), stopping cleanly before `z = -2.75`.
  - Instantiate each `PlotPedestal3D(i, slot.x, slot.z, slot.visualYaw)` and set `ped.group.position.y = slot.y`.
  - Angle `chestVisual.group.rotation.y = -Math.PI / 2 - 0.18` slightly inward toward arena center.
  - Keep `stageStaticGroup` merged via `mergeStaticMeshesByMaterial` and keep `MineSceneStage3D.ts` `< 1,000` lines.

- [ ] **Step 5: Run Vitest to verify Task 1 passes**

Run: `npx vitest run tests/world-3d.test.ts`
Expected: PASS (all specs including new crescent pedestal test).

- [ ] **Step 6: Commit**

```bash
git add src/game3d/PlotPedestal3D.ts src/game3d/MineSceneStage3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): arrange 5 mine pedestals in stepped crescent amphitheater with energy conduit"
```

---

### Task 2: Dark-Matte Nexus Pit, Relocated NW/NE Pylons & Skill-Pulse Reactivity

**Files:**
- Modify: `src/game3d/ProceduralTextures3D.ts`
- Modify: `src/game3d/OrePitStage3D.ts`
- Modify: `src/game3d/OrePit3D.ts`
- Modify: `src/game3d/PlotAttackController3D.ts`
- Modify: `src/game3d/MineScene3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `paintCachedTexture` in `ProceduralTextures3D.ts`; `STAGE_CRESCENT_SLOTS` in `MineSceneStage3D.ts`.
- Produces:
  - `getNexusArenaFloorTexture(stoneHex: string, crystalHex: string): THREE.Texture` in `ProceduralTextures3D.ts`
  - `OrePit3D.triggerSkillPulse(colorHex: string, strength?: number): void`
  - `PlotAttackController3D.setSkillPulseHook(cb?: (colorHex: string, strength: number) => void): void`

- [ ] **Step 1: Write the failing test in `tests/world-3d.test.ts`**

Verify:
1. `OrePit3D` exposes `triggerSkillPulse('#f43f5e', 1.0)` which boosts pit neon emissive intensity above baseline and decays smoothly back toward palette `crystalColor` on `pit.update(dt, elapsed, cam, true)`.
2. `PlotAttackController3D.setSkillPulseHook` fires when a high-tier rarity unit (`twin`, `fusion`, `omega`, `limited`, `secret`) lands a shader arrival (`fireShader === true`), and does NOT fire for `common`.
3. `buildOrePitEnvironmentMeshes` produces a continuous north wall (`z = -pitD / 2`) with zero gap at `x = 0` and places NW/NE anchor pylons clear of `P1`/`P5` (`|x| >= 6.0` and `z >= -2.1` in pit-local or world `z >= -2.1`? Wait: pit center is `z = 1.85`, so world `z = -1.85` is pit-local `z = -3.70`! Let's assert world-space clearance!).

```ts
it('seals pit walls cleanly, keeps NW/NE pylons clear of P1/P5, and pulses pit trim on high-tier skills', () => {
  const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
  pit.group.updateMatrixWorld(true);
  pit.triggerSkillPulse('#f43f5e', 1.0);
  const pulsedIntensity = (pit as unknown as { pitNeonMat: THREE.MeshStandardMaterial }).pitNeonMat.emissiveIntensity;
  expect(pulsedIntensity).toBeGreaterThan(1.4);
  for (let i = 0; i < 12; i++) pit.update(0.05, i * 0.05, undefined, true);
  const settledIntensity = (pit as unknown as { pitNeonMat: THREE.MeshStandardMaterial }).pitNeonMat.emissiveIntensity;
  expect(settledIntensity).toBeLessThan(pulsedIntensity);
  const pedTwin = new PlotPedestal3D(0, -7.05, -4.35, 0.46);
  const pedCommon = new PlotPedestal3D(1, -3.6, -5.45, 0.24);
  const twinDef = CHIBI_CATALOG.find((c) => c.rarity === 'twin')!;
  const commonDef = CHIBI_CATALOG.find((c) => c.rarity === 'common')!;
  pedTwin.setChibi(twinDef);
  pedCommon.setChibi(commonDef);

  const pulses: Array<{ color: string; strength: number }> = [];
  const ctrl = new PlotAttackController3D();
  ctrl.setSkillPulseHook((color, strength) => pulses.push({ color, strength }));
  ctrl.setSlotUnit(1, commonDef, { dmg: 100, speed: 1, miningMult: 1 });
  for (let i = 0; i < 10; i++) ctrl.update(0.1, pit, [pedTwin, pedCommon], true);
  expect(pulses).toHaveLength(0);

  ctrl.setSlotUnit(1, null);
  ctrl.setSlotUnit(0, twinDef, { dmg: 100, speed: 1, miningMult: 1 });
  for (let i = 0; i < 10; i++) ctrl.update(0.1, pit, [pedTwin, pedCommon], true);
  expect(pulses.length).toBeGreaterThanOrEqual(1);
  expect(pulses[0].strength).toBeGreaterThanOrEqual(1.0);
  pedTwin.dispose();
  pedCommon.dispose();
  ctrl.dispose();
  pit.dispose();
});
```
*(In the actual test step, wire `OrePit3D` + 2 `PlotPedestal3D`s — one `twin` and one `common` — and step `ctrl.update(...)` past arrival delay to assert `pulses.length === 1` for `twin` and `0` for `common`, plus check pit bounding/raycast clearance from `P1`/`P5`.)*

- [ ] **Step 2: Run Vitest on the new test to verify it fails**

Run: `npx vitest run tests/world-3d.test.ts -t "pulses pit trim on high-tier skills"`
Expected: FAIL (`triggerSkillPulse` / `setSkillPulseHook` not defined).

- [ ] **Step 3: Add `getNexusArenaFloorTexture` to `ProceduralTextures3D.ts`**

- Implement `getNexusArenaFloorTexture(stoneHex: string, crystalHex: string)` using `paintCachedTexture('nexus-arena-floor|...')`:
  - Base dark-matte cyber slate (`mixHex('#0b111e', stoneHex, 0.14)`).
  - Faint concentric nexus target rings + low-contrast tactical grid lines (`<= 0.16` alpha) + subtle radial vignette so additive GLSL shaders and `UnrealBloomPass` achieve high visual contrast.
- Keep `getQuarryFloorTexture` intact so no existing callers/tests break.

- [ ] **Step 4: Seal pit rim & relocate NW/NE pylons in `OrePitStage3D.ts` and add `triggerSkillPulse` in `OrePit3D.ts`**

- In `OrePitStage3D.ts`:
  - Replace `getQuarryFloorTexture` in `buildOrePitEnvironmentMeshes` with `getNexusArenaFloorTexture(palette.pitFloorColor, palette.crystalColor)`.
  - Replace the 7 fragmented `wallSpecs` with 4 continuous perimeter retaining walls: North (`[0, -pitD / 2, pitW, wallH, 0.36]`), South (`[0, pitD / 2, pitW, wallH, 0.36]`), West (`[-pitW / 2, 0, 0.36, wallH, pitD]`), East (`[pitW / 2, 0, 0.36, wallH, pitD]`), plus continuous north/south inner retaining benches.
  - Place the 4 corner/shoulder anchor pylons at:
    - NW/NE shoulders: `(±6.12, -3.70)` in pit-local space (= world `(±6.12, -1.85)`), completely clear of `P1`/`P5` (`(±7.05, -4.35)`).
    - SW/SE corners: `(±5.90, +4.60)` in pit-local space (= world `(±5.90, +6.45)`).
- In `OrePit3D.ts`:
  - Use `getNexusArenaFloorTexture` in `setPalette`.
  - Add `private skillPulseTimer = 0;` and `private readonly skillPulseColor = new THREE.Color();`.
  - Add `public triggerSkillPulse(colorHex: string, strength = 1): void`: sets `skillPulseColor.set(colorHex)`, `skillPulseTimer = 0.45`, boosts `pitNeonMat.emissiveIntensity = 1.05 + Math.min(1.4, Math.max(0.4, strength) * 1.15)` and tints `pitNeonMat.color` & `pitNeonMat.emissive` toward `skillPulseColor` (works in both `'low'` and `'high'` quality).
  - Decay `skillPulseTimer` in `OrePit3D.update(...)` cleanly back to `activePalette.crystalColor` and `emissiveIntensity = 1.05` (only when `renderVisuals` is true, resetting smoothly when timer hits `0`).
  - Keep `OrePit3D.ts` `< 1,000` lines.

- [ ] **Step 5: Add `setSkillPulseHook` to `PlotAttackController3D.ts` & wire in `MineScene3D.ts`**

- In `PlotAttackController3D.ts`:
  - Add `private skillPulseHook?: (colorHex: string, strength: number) => void;` and `public setSkillPulseHook(cb?: (colorHex: string, strength: number) => void): void`.
  - In `handleArrival`, when `renderVisuals && a.fireShader` and `unit` rarity is `'secret' | 'fusion' | 'limited' | 'twin' | 'omega'`, call `this.skillPulseHook?.(a.accentColor, unit.def.rarity === 'twin' || unit.def.rarity === 'omega' ? 1.1 : 0.85)`.
- In `MineScene3D.ts`:
  - Call `this.plotAttackController.setSkillPulseHook(...)` in constructor: pulse `this.pit.triggerSkillPulse(colorHex, strength)` (and when `!this.overclockActive`, briefly tint `stageNeonMat` or leave `stageNeonMat` controlled by Overclock/Palette — simplest & safest: `this.pit.triggerSkillPulse(colorHex, strength)` so `Overclock` never conflicts with `stageNeonMat`).

- [ ] **Step 6: Run Vitest to verify Task 2 passes**

Run: `npx vitest run tests/world-3d.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game3d/ProceduralTextures3D.ts src/game3d/OrePitStage3D.ts src/game3d/OrePit3D.ts src/game3d/PlotAttackController3D.ts src/game3d/MineScene3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): convert ore pit to dark-matte nexus crater with skill-reactive rim pulse"
```

---

### Task 3: Arena Wing Re-Theme (`ArenaWings3D.ts`) & Continuous Courtyard Deck (`MineEnvironment3D.ts`)

**Files:**
- Create: `src/game3d/ArenaWings3D.ts`
- Modify: `src/game3d/MineEnvironment3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `createChamferSlabGeometry`, `mergeStaticMeshesByMaterial` (`MeshHelpers3D.ts`), `createCyberLanternBollardFinial`, `createCyberMonolithForkFinial` (`CyberProps3D.ts`), `disposeObject3D` (`ChestVaultStation3D.ts`).
- Produces:
  - `createNexusLeftGate(opts?: { crystalColor?: string; cliffColor?: string }): ArenaWingHandle` in `src/game3d/ArenaWings3D.ts`
  - `createVaultCoreDais(opts?: { crystalColor?: string; cliffColor?: string }): VaultCoreDaisHandle` in `src/game3d/ArenaWings3D.ts`
  - Updated `MineEnvironment3D` using `createNexusLeftGate` + `createVaultCoreDais`, sealed courtyard deck (no minecart/escalator trenches), and north deck supporting `P3` (`z = -6.05`).

- [ ] **Step 1: Write the failing test in `tests/world-3d.test.ts`**

Verify:
1. `createNexusLeftGate` builds a non-empty left-wing gate centered around `x <= -8.0, z ≈ 0.15` containing at least 1 `InstancedMesh` (floating chevrons), zero gyroscopic spinning hoops, reacts to `setPalette`, `setLowQuality`, `update`, and cleans up via `dispose()`.
2. `createVaultCoreDais` builds a right-wing vault platform around `x >= +8.0, z ≈ 0.15` with at least 1 `InstancedMesh`, reacts to `setPalette`, `setLowQuality`, `update(..., chestHovered, chestBounce)`, and disposes cleanly.
3. Existing `MineEnvironment3D` test still passes (`meshCount > 50`, `rearSkyOccluderCount === 0` for `box.min.z < -7.5 && box.max.y > 4.2 && |center.x| < 14.0`, `setWeatherSky`, `updateSky`, `update`, `dispose()`).

- [ ] **Step 2: Run Vitest to verify the new test fails**

Run: `npx vitest run tests/world-3d.test.ts -t "builds Nexus Left Gate and Vault Core Dais"`
Expected: FAIL (`ArenaWings3D` module does not exist).

- [ ] **Step 3: Implement `src/game3d/ArenaWings3D.ts`**

- Keep `< 500` lines, zero `any`, explicit `.dispose()`.
- `createNexusLeftGate`:
  - Stepped chamfered dark-slate plinth at `x = -11.4, z = 0.15` + twin angled cyber pylons (`createChamferSlabGeometry`, `CylinderGeometry`, `createCyberMonolithForkFinial` caps — NO gyroscopic/armillary spinning rings!) framing a vertical translucent portal curtain (`MeshBasicMaterial` + `ShaderMaterial` or scanline canvas texture) + `InstancedMesh` floating upward energy chevrons (`8` instances, hidden or reduced in `setLowQuality(true)`).
  - Expose `cableSocketWorld: THREE.Vector3` (e.g. `(-11.4, 4.35, -0.85)`) so `MineEnvironment3D`'s catenary power cables anchor cleanly!
- `createVaultCoreDais`:
  - Stepped octagonal/chamfered dark-slate dais framing `crateGroup` at `(8.45, 0.48, 0.15)` + twin rear-flank cyber shield fins (`x ≈ 10.6..12.2`) + `InstancedMesh` vertical energy nodes reacting softly to `chestHovered` and `chestBounce`.
  - Ensure all meshes stay behind/below `crateHit` (`(8.45, 1.20, 0.15)`) so chest clicking is never occluded.
  - Expose `cableSocketWorld: THREE.Vector3` (e.g. `(10.85, 2.35, 0.15)`).

- [ ] **Step 4: Update `MineEnvironment3D.ts` to use `ArenaWings3D.ts` & close trenches**

- Replace `createCaveRailway` / `createChestVaultStation` in `MineEnvironment3D.ts` with `createNexusLeftGate` and `createVaultCoreDais`.
- Update `courtyardSpecs` and `wingLeft` so:
  - Left trench (`x in [-7.15..-5.78], z in [-0.55..0.85]`) and right trench (`x in [5.78..7.12], z in [-0.55..0.85]`) are closed into continuous courtyard armor slabs (`y = -0.14`).
  - `wingLeft` is unified cleanly around the Nexus Gate footprint (`z = 0.785`, matching `wingRight`).
  - North `backDeck` / `courtyardSpecs` cleanly support `P3` (`z = -6.05`) without gaps.
  - Darken `terrainMat` / `cobbleMat` color tint slightly (`0xccd8ec` / `0xc4d2e8`) so the entire arena deck frames the glowing podiums and Nexus crater cleanly.
  - Update catenary `cableChains` endpoints to match `leftGate.cableSocketWorld` and `vaultDais.cableSocketWorld`, keeping lateral towers at `|x| >= 16.8` and `topY <= 3.6` so rear sky window remains 100% clear.
  - Keep `CaveRailway3D.ts` and `ChestVaultStation3D.ts` untouched in `src/game3d/` so existing unit tests on those standalone helpers remain green (zero regressions).

- [ ] **Step 5: Run Vitest to verify Task 3 passes**

Run: `npx vitest run tests/world-3d.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game3d/ArenaWings3D.ts src/game3d/MineEnvironment3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): replace minecart/escalator wings with Nexus Gate and Vault Core Dais"
```

---

### Task 4: Hero Mine Camera Framing & Full Verification + `GAME_MAP.md` Sync

**Files:**
- Modify: `src/game3d/MineSceneStage3D.ts`
- Modify: `src/game3d/MineScene3D.ts`
- Test: `tests/world-3d.test.ts`
- Modify: `GAME_MAP.md`

**Interfaces:**
- Consumes: `getDefaultOrbitPitchForMode` (`MineSceneStage3D.ts`), `applyMineSceneModeTransition` (`MineSceneStage3D.ts`), `MineScene3D` tutorial/lock methods.
- Produces:
  - `getDefaultOrbitPitchForMode('mine') === -0.22` (while all 5 other modes remain unchanged!)
  - Resting Mine `targetCamRadius = 17.6`, `lookAtPos = (0, 0.72, -0.35)`

- [ ] **Step 1: Write the failing test in `tests/world-3d.test.ts`**

Verify `getDefaultOrbitPitchForMode('mine') === -0.22`, and verify all other 5 modes (`shop: 0.02`, `altar: -0.18`, `fusion: -0.18`, `tower: -0.34`, `omega: -0.32`) are unchanged, and `applyCameraOrbitDrag({ cameraLocked: true, ..., defaultPitch: getDefaultOrbitPitchForMode('mine') })` snaps to `-0.22`.

```ts
it('uses heroic -0.22 resting pitch for mine mode without altering other 5 scene modes', () => {
  expect(getDefaultOrbitPitchForMode('mine')).toBe(-0.22);
  expect(getDefaultOrbitPitchForMode('shop')).toBe(0.02);
  expect(getDefaultOrbitPitchForMode('altar')).toBe(-0.18);
  expect(getDefaultOrbitPitchForMode('fusion')).toBe(-0.18);
  expect(getDefaultOrbitPitchForMode('tower')).toBe(-0.34);
  expect(getDefaultOrbitPitchForMode('omega')).toBe(-0.32);

  const locked = applyCameraOrbitDrag({
    cameraLocked: true,
    yaw: 0.8,
    pitch: 0.2,
    dx: 40,
    dy: 40,
    defaultYaw: 0,
    defaultPitch: getDefaultOrbitPitchForMode('mine'),
  });
  expect(locked).toEqual({ yaw: 0, pitch: -0.22 });
});
```

- [ ] **Step 2: Run Vitest to verify the new test fails**

Run: `npx vitest run tests/world-3d.test.ts -t "uses heroic -0.22 resting pitch"`
Expected: FAIL (currently returns `0`).

- [ ] **Step 3: Update Mine camera defaults in `MineSceneStage3D.ts` and `MineScene3D.ts`**

- In `MineSceneStage3D.ts`:
  - `getDefaultOrbitPitchForMode`: return `-0.22` for `default` / `'mine'` (keep `shop`, `altar`, `fusion`, `tower`, `omega` identical).
  - `applyMineSceneModeTransition` `else` (`mine` branch): set `targetOrbitPitch = getDefaultOrbitPitchForMode('mine')` (`-0.22`), `targetCamRadius = 17.6`, `lookAtPos.set(0, 0.72, -0.35)`.
  - Keep `baseCamPos.y = 11.7` untouched.
- In `MineScene3D.ts`:
  - Update initial fields to match Mine's resting camera:
    - `baseCamPos = new THREE.Vector3(0, 11.7, 17.25)`
    - `lookAtPos = new THREE.Vector3(0, 0.72, -0.35)`
    - `orbitPitch = -0.22`, `camRadius = 17.6`
    - `inputState.targetOrbitPitch = -0.22`, `inputState.targetCamRadius = 17.6`
    - `currentLookAt = new THREE.Vector3(0, 0.72, -0.35)`
  - Update `setTutorialPitZoom(false)` and `setTutorialChestZoom(false)` to restore `targetOrbitPitch = getDefaultOrbitPitchForMode('mine')` and `targetCamRadius = 17.6`.

- [ ] **Step 4: Run full Vitest suite, TypeScript check & Vite build**

- Run: `npm.cmd test`
  Expected: All test files pass (`hud-modules.test.ts`, `state-modules.test.ts`, `world-3d.test.ts`).
- Run: `npm.cmd run build`
  Expected: `tsc --noEmit && vite build` exits 0 with zero errors.
- Check all `src/` line counts are `< 1,000` lines.

- [ ] **Step 5: Browser smoke test & `GAME_MAP.md` sync**

- Start Vite dev server and inspect the live `mine` scene on desktop (`1280×720`) and mobile (`390×844`) with 5 deployed Chibis (`?unlock=1` if needed), confirming crescent pedestals, dark-matte pit contrast during skill casts, chest click, and HUD layout.
- Update `GAME_MAP.md` with `ArenaWings3D.ts`, updated line counts, and latest verification header.

- [ ] **Step 6: Commit**

```bash
git add src/game3d/MineSceneStage3D.ts src/game3d/MineScene3D.ts tests/world-3d.test.ts GAME_MAP.md
git commit -m "feat(3d): tune hero mine camera framing and sync GAME_MAP for Crescent Nexus Arena"
```
