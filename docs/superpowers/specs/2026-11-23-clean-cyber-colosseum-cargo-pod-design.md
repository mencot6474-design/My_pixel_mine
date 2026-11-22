# Design Spec: Clean Cyber-Colosseum Arena & Cyber Cargo Pod (Opsi 1 + Empty Left + Opsi B)

- **Date**: 2026-11-23
- **Status**: Approved by user ("sisi kiri kosngkan arena opsi 1 pegannti peti opsi b")
- **Scope**: `src/game3d/MineEnvironment3D.ts`, `src/game3d/ArenaWings3D.ts`, `src/game3d/OrePitStage3D.ts`, `src/game3d/OrePit3D.ts`, `src/game3d/ProceduralTextures3D.ts`, `src/game3d/CyberCargoPod3D.ts` (new), `src/game3d/MineSceneStage3D.ts`, `src/game3d/MineScene3D.ts`, `tests/world-3d.test.ts`, `GAME_MAP.md`.

---

## 1. Visual & Spatial Goals

1. **Empty Left Flank & Remove Floating Pillars (`MineEnvironment3D.ts`, `ArenaWings3D.ts`)**:
   - Remove `NexusLeftGate` instantiation from `MineEnvironment3D` so the left sky/horizon stays 100% open to showcase the Neo-Tokyo Cyber Skyline and Cyber Zeppelin.
   - Remove the 4 floating conduit pillars (`lateralTowers`), catenary `TubeGeometry` power cables (`cableCurves`), and `cableFlowInst` pulses from `MineEnvironment3D`.
   - Streamline `createVaultCoreDais` in `ArenaWings3D.ts` into a sleek floating octagonal **Cyber Hover-Pad** (under-keel + thruster cone + stepped octagonal deck + compact corner energy nodes + floating prisms), removing the tall rear wall pillar/finial/fins.

2. **Sleek Cyber-Colosseum Arena (`OrePitStage3D.ts`, `OrePit3D.ts`, `ProceduralTextures3D.ts`)**:
   - Replace the yellow-black hazard stripe (`getHazardStripeTexture`) on the arena rim deck with a sleek **Dark-Titanium Segmented Cyber Armor Deck** (`getCyberColosseumDeckTexture`, dark slate plating + crisp bevel seams + subtle accent light ticks).
   - Upgrade `getCircularNexusPoolTexture` with cleaner concentric cyber-circuit arcs and tick marks while keeping the center dark matte so additive GLSL skill shaders pop cleanly.
   - Add **8 under-hull stabilizer fins + 4 additive thruster glow vents** beneath the circular colosseum bowl (`OrePitStage3D.ts`), and replace the 6 tall bollard posts on the upper rim with **6 low-profile sleek armor emitter caps** that never obstruct sightlines.

3. **Cyber Cargo Pod (`CyberCargoPod3D.ts`) Replacing Treasure Chest**:
   - New dedicated multi-part procedural asset (`createCyberCargoPod`) implementing the `ProceduralChestHandle` interface (`group`, `lidPivot`, `setAccentColor`, `setInteraction`, `dispose`) for drop-in integration with `MineSceneStage3D` / `MineScene3D`.
   - **Silhouette & Detail**: Chamfered dark-titanium cargo hull (`createChamferSlabGeometry` + `ExtrudeGeometry` side armor ribs), **dual mechanical sliding top hatch doors** that slide/part open on hover/click revealing an illuminated loot core bay inside, **front LED capacity bar**, and a **floating holographic storage emblem** (`MeshBasicMaterial`, `fog: false`) gently hovering above the pod (zero tilted gyroscopic rings).
