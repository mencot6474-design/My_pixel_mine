# Implementation Plan: Hologram Sky-Metropolis, Live Broadcast Blimp & Lag-Free Sky

1. **Textures (`src/game3d/ProceduralTextures3D.ts`)**:
   - Add `getSkyscraperFacadeTexture(accentHex)`: cached `256×512` seamless dark slate facade with multi-tone warm/cyan/accent cyber windows (`RepeatWrapping`, `SRGBColorSpace`).
   - Add `getBroadcastBannerTexture(accentHex, feverActive)`: cached `512×192` LED billboard strip with dark glass panel, glowing top & bottom horizontal accent banner lines, crisp bold `MyChibiMine` headline, and `LIVE ARENA` dot divider (`RepeatWrapping` on X for UV marquee scroll, `SRGBColorSpace`).
2. **Sky-Metropolis & Broadcast Blimp Module (`src/game3d/SkyMetropolis3D.ts`)**:
   - Create `SkyMetropolis3D` owning `group`:
     - Instanced skyscrapers (`InstancedMesh` shafts with facade texture + `InstancedMesh` stepped upper tiers & flat horizontal rooftop beacons/helipad rings + instanced spire antennas).
     - `3` soft upward city searchlight cones gently swaying across distant sectors (hidden in `lowQuality` or super crisp minimal opacity).
     - Modern `blimpGroup` with tapered capsule hull, dark keel frame, twin glowing thruster pods, rear fins, and wide LED screen plane (`fog: false`) displaying `getBroadcastBannerTexture(...)` with marquee UV scroll and right-to-left seamless edge-fade loop (`+33` -> `-33`, `2.0s` cooldown).
     - Disable raycasting (`raycast = () => {}`) on all city/blimp meshes so taps never block mining.
     - Expose `setPalette`, `setOverclockTier`, `setLowQuality`, `update(dtSec, elapsed)`, `getBlimpWorldPosition`, `getBuildingCount`, `dispose`.
3. **Remove Laggy Sky Weather & Wire City/Blimp (`src/game3d/MineEnvironment3D.ts`, `MineSceneStage3D.ts`, `MineScene3D.ts`)**:
   - Replace `WeatherSkyShader` (`skyHandle`) + 3D `clouds` in `MineEnvironment3D` with a fast static `MeshBasicMaterial` using `getSkyDomeTexture(...)` (derived cleanly from palette/horizon without FBM per-pixel noise).
   - Wire `SkyMetropolis3D` into `MineEnvironment3D` (`setPalette`, `setOverclockTier`, `setLowQuality`, `update`, `dispose`).
   - Forward `overclockTier` in `MineScene3D.ts` (`setOverclockActive`) / `MineSceneStage3D.ts` (`applyMineOverclockVisual`, `applyMineSceneModeTransition`), and keep `WeatherFx3D` particle emission disabled (`setQualityScale(0)`) so sky weather never hurts FPS.
4. **Tests & Verification (`tests/world-3d.test.ts`, `GAME_MAP.md`)**:
   - Update sky assertions in `tests/world-3d.test.ts` (replacing sky shader dependency in `MineEnvironment3D` tests with lightweight gradient sky checks) and add unit specs for `SkyMetropolis3D` + `ProceduralTextures3D`.
   - Run `npm.cmd test`, `npm.cmd run build`, live browser screenshot check (`1280×720`), sync `GAME_MAP.md`, and commit cleanly.
