# Mining World Sky-District City Redesign (Option A)

**Date**: 2026-11-26
**Target Files**: `src/game3d/SkyMetropolis3D.ts`, `src/game3d/SkyMetropolisAssets3D.ts`, `tests/world-3d.test.ts`

## Problem Statement
The Mining World background (`SkyMetropolis3D`) previously used curved radial rings of facade-textured boxes, which visually felt softer and less architectural than the crisp low-poly chamfered skyscrapers in Omega Rooftop (`OmegaRooftopEnvironment3D`) and Rift City (`RiftCityEnvironment3D`). Additionally, all sweeping searchlight cones were removed per user request.

## Selected Architecture (Option A: Grid Neo-Tokyo Sky-District)
Adopt the exact structural DNA of Omega Rooftop + Rift City while keeping the Mining Sky-Stage (`ColosseumBiome3D`, `OrePit3D`, `VaultCoreDais`, `RiftGate3D`) and Cyber Zeppelin completely unobstructed:

1. **Chamfered Skyscraper Blocks (`rotY = 0`)**:
   - Concrete/slate shaft bodies (`createChamferSlabGeometry`, `BUILDING_CHAMFER = 0.36`, `BUILDING_BEVEL = 0.04`, `flatShading: true`).
   - Deep foundations (`baseY = -28`) rising into Left Inner/Outer (`|x| = 23.0..38.0`), Right Inner/Outer, Rear Canyon Horizon (`z = -28..-52`), and Abyss Street-Canyon towers (`topY <= -5.8`).
2. **True 3D `InstancedMesh` Window Bays**:
   - Perimeter frames + `litWarm`, World-palette-reactive `litAccent`, and `reflective` glass bays offset proud of chamfered faces, avoiding chamfered corners.
3. **Rooftop Architectural Silhouettes & Grounded Billboards**:
   - Concrete cornice rims, setback steel penthouse tiers, HVAC boxes, comms masts with pulsing beacons (`InstancedMesh`), and rooftop-mounted LED signs (`MINE`, `CYBER`, `NEXUS`).
4. **Dual Elevated Monorail Viaducts + Animated Sky-Trains**:
   - Flanking viaducts at `x = ±17.2`, `y = -4.2` with World-palette neon edge rails, concrete piers, and 8 `InstancedMesh` trains gliding smoothly along both canyons.
5. **Strict Collision-Free Corridors**:
   - Mining Stage Safe Zone (`|x| < 15.5`, `z in [-15.5, 22.0]`, `y > -7.5`): completely open.
   - Cyber Zeppelin Transit Airway (`z in [-25.5, -17.5]`, `BLIMP_BASE_Z = -21.5`, `BLIMP_BASE_Y = 7.4`): cross-avenue rooftops kept `topY <= 2.2` so the Zeppelin (`x = 46 -> -46`) never clips any tower.
   - Zero searchlight cones (both normal and Overclock Fever).
6. **Palette, Overclock & Quality Controls**:
   - `setPalette(palette)` tints `litAccent` windows, viaduct rails, monorail nose trim, rooftop signs, city mist, and Zeppelin trim across Worlds 1–12.
   - `setOverclockTier(tier)` boosts emissive intensity cleanly during Fever.
   - `setLowQuality(low)` trims mist layer + skips non-essential per-frame pulse work cleanly.
