# Design Spec: Neo-Tokyo Cyber Skyline & Cyber Zeppelin Overhaul (Opsi A + Paket 1)

- **Date**: 2026-11-23
- **Status**: Approved by user ("kota opsi a dan balon udara paket 1")
- **Scope**: `src/game3d/SkyMetropolisAssets3D.ts` (new), `src/game3d/SkyMetropolis3D.ts`, `src/game3d/ProceduralTextures3D.ts`, `tests/world-3d.test.ts`, `GAME_MAP.md`.

---

## 1. Visual & Spatial Goals

1. **Neo-Tokyo Cyber Skyline (Opsi A)**:
   - Replace identical single-`BoxGeometry` blocks with **3 instanced architectural archetypes** (~62–66 buildings):
     - *Stepped Cyber Megatower* (chamfered lower shaft + narrower upper setback + twin corner neon fins + crown + spire).
     - *Octagonal Glass Arcology* (8-sided tapered tower + flat horizontal neon ring + spire).
     - *Twin-Blade Skyscraper* (slim shaft + glowing vertical neon spine + rooftop holo-billboard).
   - **3 distinct procedural facade textures** (curtain-wall glass ribs, Neo-Tokyo diagrid lattice, dark megacorp armor spine) so adjacent towers never look copy-pasted.
   - **Skyline Canyon Framing**: Raise lateral/rear flank supertalls (`topY` up to `+2.6` on outer flanks `|x| >= 15`) while keeping the central flight lane clear for the zeppelin and central arena pit.
   - **Lightweight City Atmosphere**:
     - `8` holographic rooftop billboards (`MINE`, `CYBER`, `NEXUS`) with `fog: false`.
     - Blinking rooftop aviation beacons (`InstancedMesh`).
     - `28` aerial sky-traffic light vehicles cruising along 2 horizontal sky-lanes (`1 InstancedMesh`).
     - `2` lightweight low-altitude additive city mist rings (`y = -11`, `-17`) for foreground/background depth separation.
     - Soft gradient-faded searchlight cones (no hard cone edge cutoff).

2. **Cyber Zeppelin + Curved Holo-Banner (Paket 1)**:
   - **Scale & Lane**: ~1.8× larger (`~15.2m` sculpted `LatheGeometry` ribbed dirigible hull) gliding closer at `z = -19.2`, `y = 2.45` (`x: +36.5 -> -36.5`, `0.8s` pause) so the `MyChibiMine` banner reads clearly on both mobile portrait and desktop.
   - **Multi-Part Detail**: Sculpted ribbed hull, glowing nose visor + dorsal spine, swept X-tail stabilizers (`ExtrudeGeometry` w/ bevel), **4 side turbofan nacelles with spinning rotor blades & thruster plumes**, **curved wrap-around LED broadcast banner** (`CylinderGeometry` arc segment, `fog: false`) with downward holographic projector sheen, and **2 escort cyber-drones** banking in formation.

3. **Performance & Rules Compliance**:
   - Strict TypeScript (no `any`), delta clamp `<= 0.1`, `InstancedMesh` batching, `SRGBColorSpace` textures, zero tilted gyroscopic rings, non-raycastable background meshes, and full `.dispose()` cleanup.
