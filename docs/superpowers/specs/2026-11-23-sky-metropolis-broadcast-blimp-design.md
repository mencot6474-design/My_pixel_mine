# Design Spec: Hologram Sky-Metropolis, Live Broadcast Blimp & Lag-Free Sky (Opsi 2)

- **Date**: 2026-11-23
- **Status**: Approved (User approved Opsi 2 + requested removal of laggy sky weather)
- **Scope**: `src/game3d/` (`SkyMetropolis3D.ts`, `MineEnvironment3D.ts`, `ProceduralTextures3D.ts`, `MineScene3D.ts`, `MineSceneStage3D.ts`), `tests/world-3d.test.ts`, and `GAME_MAP.md`.

---

## 1. Goal & Visual Direction

1. **Remove Laggy Sky Weather**:
   - Remove the expensive per-pixel procedural FBM/lightning/aurora/celestial fragment shader (`WeatherSkyShader` on `MineEnvironment3D.skyDome`) and drifting 3D `cloudCluster` meshes from the active Mine/Shop sky.
   - Replace `skyDome` material with an ultra-lightweight `MeshBasicMaterial` using a cached 2D gradient texture (`getSkyDomeTexture`, `fog: false`, `depthWrite: false`, `side: THREE.BackSide`) calibrated to a clean deep twilight sky derived from the active world palette + seamless horizon color so zero per-frame sky shader math runs.
   - Disable heavy `WeatherFx3D` sky particles at runtime (`setQualityScale(0)` in `MineSceneStage3D.ts`) across all graphics presets while preserving Weather HUD timers, buffs, and meteor drops intact.
2. **Hologram Sky-Metropolis Beneath the Arena**:
   - Multi-ring skyline of stepped futuristic skyscrapers anchored deep below the arena (`baseY = -28`), rooftops mostly `y = -18` to `-2.5`, plus outer perimeter landmark towers on lateral/rear flanks (`|x| >= 15.5, z <= -16`) reaching `y = +0.5..+2.0`.
   - `InstancedMesh` building shafts + instanced lit crown rings/helipad trims (100% flat horizontal per `.agent/rules/threejs-ts-standards.md`) + thin vertical rooftop antennas + 3 subtle sweeping city searchlight cones (`transparent`, `AdditiveBlending`, suppressed on `lowQuality` or ultra-lightweight).
   - Procedural `getSkyscraperFacadeTexture(accentHex)` for crisp cyber-metropolis lit windows.
3. **Modern Broadcast Blimp (`MyChibiMine` Live TV Airship)**:
   - Sleek elongated aerodynamic hull with twin side turbine nacelles, horizontal & vertical tail stabilizers, top beacon strobe, and a suspended wide LED billboard frame facing the arena (`z ≈ -22`, `y ≈ 2.4`, behind all 5 podiums and below the top HUD bar).
   - Dynamic `CanvasTexture` (`512×192`, `SRGBColorSpace`, `fog: false`) featuring bold **`MyChibiMine`** typography framed by bright **top & bottom horizontal neon banner bars** + `• LIVE ARENA •` ticker accent, scrolling seamlessly along X (`tex.offset.x`) and reacting with boosted glow during Overclock / Super Fever.
   - **Hybrid Seamless Edge-Fade Loop (Right → Left)**: enters smoothly from off-screen right (`x = +33`), glides leftward across the background sky, fades out near `x = -33`, rests `~2.0s`, and loops seamlessly back from `+33`.
