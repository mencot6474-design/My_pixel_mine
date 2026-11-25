# Mining World Sky-District Implementation Plan

1. **Update `src/game3d/SkyMetropolisAssets3D.ts`**:
   - Keep all existing exports used by `ShopCyberPlazaSkyline3D.ts` and tests (`BLIMP_HOLO_LABELS`, `HoloBillboardLabel`, `CyberZeppelinBuildResult`, `getSkyscraperVariantTexture`, `getRooftopHoloSignTexture`, `getZeppelinHoloTickerTexture`, `getCityMistTexture`, `createSkyscraperShaftGeometry`, `buildCyberZeppelin`).
   - Add reusable strict-TS Option A city helpers: `appendGridBuildingWindows` (3D instanced window bay collector for four chamfered faces), `GridBuildingWindowCollector`, and `createGridDistrictSpecs` (validated non-overlapping specs for Left/Right Inner & Outer avenues, Rear Horizon canyon, and Abyss canyon towers with guaranteed stage & blimp corridor clearance).
2. **Refactor `src/game3d/SkyMetropolis3D.ts`**:
   - Replace circular facade-textured ring towers with grid-aligned (`rotY = 0`) chamfered towers, merged by material into static groups, plus `InstancedMesh` window bays (frames, warm, palette-reactive accent, reflective), cornices, penthouse tiers, HVAC boxes, masts + pulsing beacons, grounded rooftop signs (`MINE`, `CYBER`, `NEXUS`), dual monorail viaducts (`x = ±17.2`, `y = -4.2`), animated `InstancedMesh` trains, 2-layer mist, and `buildCyberZeppelin`.
   - Preserve exact public API (`group`, `getBuildingCount`, `getBlimpWorldPosition`, `isScreenFogDisabled`, `getCurrentBlimpHoloLabel`, `setPalette`, `setOverclockTier`, `setLowQuality`, `update`, `dispose`) and `disableRaycast(this.group)`.
3. **Update `tests/world-3d.test.ts` & `GAME_MAP.md`**:
   - Verify grid alignment (`rotY === 0` towers), instanced windows/viaducts, `>= 45` towers, zero stage/blimp corridor collisions, raycast immunity, palette/overclock/low-quality switching, and clean disposal.
   - Update `GAME_MAP.md` line counts & summary.
4. **Verify**:
   - Run `npm.cmd test` and `npm.cmd run build` with zero errors.
