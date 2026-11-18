import * as THREE from 'three';

export interface ProceduralChestOptions {
  scale?: number;
  woodColor?: number;
  trimColor?: number;
  ironColor?: number;
  gemColor?: number | string;
}

export interface ProceduralChestHandle {
  group: THREE.Group;
  lidPivot: THREE.Group;
  setAccentColor: (color: number | string) => void;
  setInteraction: (hovered: boolean, bounce: number, elapsed: number) => void;
  dispose: () => void;
}

export interface ChestVaultStationOptions {
  crystalColor?: number | string;
  cliffColor?: number | string;
  trimColor?: number;
}

export interface ChestVaultStationHandle {
  group: THREE.Group;
  setPalette: (crystalColor: number | string, cliffColor: number | string) => void;
  update: (dtSec: number, elapsed: number, chestHovered: boolean, chestBounce: number) => void;
  dispose: () => void;
}

interface MovingOreChunk {
  group: THREE.Group;
  progress: number;
  spinSpeed: number;
}

const ESCALATOR_START_X = 5.48;
const ESCALATOR_START_Y = -0.52;
const ESCALATOR_END_X = 7.76;
const ESCALATOR_END_Y = 0.46;
const ESCALATOR_Z = 1.7;

const RAMP_DX = ESCALATOR_END_X - ESCALATOR_START_X;
const RAMP_DY = ESCALATOR_END_Y - ESCALATOR_START_Y;
const RAMP_LENGTH = Math.hypot(RAMP_DX, RAMP_DY);
const RAMP_ANGLE = Math.atan2(RAMP_DY, RAMP_DX);

const BELT_CLEAT_COUNT = 18;
const CLEAT_LOOP_SPAN = RAMP_LENGTH * 2 + 0.36;

export function disposeObject3D(
  root: THREE.Object3D,
  excludedMaterials?: ReadonlySet<THREE.Material>
): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (!disposedGeos.has(child.geometry)) {
      disposedGeos.add(child.geometry);
      child.geometry.dispose();
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (excludedMaterials?.has(mat) || disposedMats.has(mat)) continue;
      disposedMats.add(mat);
      mat.dispose();
    }
  });
}

function createChamferRectShape(width: number, depth: number, chamfer: number): THREE.Shape {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.45, hd * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();
  return shape;
}

function createExtrudedSlabGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevelSize = 0.03
): THREE.ExtrudeGeometry {
  const shape = createChamferRectShape(width, depth, chamfer);
  const innerDepth = Math.max(0.02, height - bevelSize * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Extrude runs along +Z; rotate -90 deg around X so extrusion rises along +Y, bottom at y = 0
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevelSize, 0);
  geo.computeVertexNormals();
  return geo;
}

function createVaultArchProfileGeometry(
  spanX: number,
  archWidthZ: number,
  archHeight: number,
  bevel = 0.022
): THREE.ExtrudeGeometry {
  const hz = archWidthZ * 0.5;
  const shoulderY = archHeight * 0.46;
  const topHalfZ = hz * 0.52;

  const shape = new THREE.Shape();
  shape.moveTo(-hz, 0);
  shape.lineTo(hz, 0);
  shape.lineTo(hz * 0.94, shoulderY);
  shape.lineTo(topHalfZ, archHeight);
  shape.lineTo(-topHalfZ, archHeight);
  shape.lineTo(-hz * 0.94, shoulderY);
  shape.closePath();

  const innerX = Math.max(0.04, spanX - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerX,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // Rotate so extrusion span runs centered along X, arch width along Z, height from y = 0 upward
  geo.rotateY(Math.PI / 2);
  geo.translate(-innerX * 0.5, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

function createShieldLockGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, h * 0.5);
  shape.lineTo(hw, h * 0.5);
  shape.lineTo(hw * 0.92, -h * 0.08);
  shape.lineTo(0, -h * 0.55);
  shape.lineTo(-hw * 0.92, -h * 0.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  geo.computeVertexNormals();
  return geo;
}

function enableShadows(mesh: THREE.Object3D, cast = true, receive = true): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Creates a multi-part low-poly stylized procedural Treasure Chest with pivot at y = 0.
 * Features beveled hardwood hull, iron corner skids, arched ribbed lid, gold lockplate,
 * inner glowing loot hoard, and interactive lid-peek animation.
 */
export function createProceduralTreasureChest(
  options: ProceduralChestOptions = {}
): ProceduralChestHandle {
  const group = new THREE.Group();
  const scale = options.scale ?? 1;
  group.scale.setScalar(scale);

  const woodMat = new THREE.MeshStandardMaterial({
    color: options.woodColor ?? 0x7c3f1d,
    roughness: 0.76,
    metalness: 0.05,
    flatShading: true,
  });
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: 0x542812,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: options.ironColor ?? 0x334155,
    roughness: 0.36,
    metalness: 0.78,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: options.trimColor ?? 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.14,
    roughness: 0.24,
    metalness: 0.86,
    flatShading: true,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: options.gemColor ?? 0x38bdf8,
    emissive: options.gemColor ?? 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.14,
    metalness: 0.35,
    flatShading: true,
  });
  const innerHoardMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.82,
    flatShading: true,
  });

  // 1. Iron Skid Runners & Flared Corner Feet (grounded cleanly at y = 0)
  for (const sx of [-0.42, 0.42]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.76), ironMat);
    skid.position.set(sx, 0.0275, 0);
    enableShadows(skid);
    group.add(skid);
  }
  const footGeo = new THREE.CylinderGeometry(0.06, 0.085, 0.075, 6);
  for (const sx of [-0.44, 0.44]) {
    for (const sz of [-0.31, 0.31]) {
      const foot = new THREE.Mesh(footGeo, goldMat);
      foot.position.set(sx, 0.0375, sz);
      enableShadows(foot);
      group.add(foot);
    }
  }

  // 2. Main Beveled Hardwood Body (y = 0.05 .. 0.47)
  const hullGeo = createExtrudedSlabGeometry(0.98, 0.42, 0.68, 0.08, 0.025);
  const hullMesh = new THREE.Mesh(hullGeo, woodMat);
  hullMesh.position.y = 0.05;
  enableShadows(hullMesh);
  group.add(hullMesh);

  // Recessed Horizontal Plank Ribs on Front & Back
  const slatGeo = new THREE.BoxGeometry(0.84, 0.045, 0.71);
  for (const sy of [0.16, 0.27, 0.38]) {
    const slat = new THREE.Mesh(slatGeo, woodDarkMat);
    slat.position.y = sy;
    enableShadows(slat);
    group.add(slat);
  }

  // Lower Gold Belt Trim & Upper Rim Collar
  const lowerTrim = new THREE.Mesh(
    createExtrudedSlabGeometry(1.03, 0.075, 0.73, 0.08, 0.015),
    goldMat
  );
  lowerTrim.position.y = 0.065;
  const upperCollar = new THREE.Mesh(
    createExtrudedSlabGeometry(1.05, 0.085, 0.75, 0.08, 0.018),
    goldMat
  );
  upperCollar.position.y = 0.415;
  enableShadows(lowerTrim);
  enableShadows(upperCollar);
  group.add(lowerTrim, upperCollar);

  // Vertical Iron Corner Pillars + Twin Brass Strap Bands
  const pillarGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.43, 6);
  for (const sx of [-0.455, 0.455]) {
    for (const sz of [-0.305, 0.305]) {
      const pillar = new THREE.Mesh(pillarGeo, ironMat);
      pillar.position.set(sx, 0.265, sz);
      enableShadows(pillar);
      group.add(pillar);
    }
  }
  const strapGeo = new THREE.BoxGeometry(0.11, 0.42, 0.755);
  for (const sx of [-0.27, 0.27]) {
    const strap = new THREE.Mesh(strapGeo, goldMat);
    strap.position.set(sx, 0.265, 0);
    enableShadows(strap);
    group.add(strap);
  }

  // Side Heavy Forged Carry Rings
  const ringMountGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.045, 6);
  const carryRingGeo = new THREE.TorusGeometry(0.085, 0.022, 6, 10);
  for (const sx of [-1, 1]) {
    const mount = new THREE.Mesh(ringMountGeo, ironMat);
    mount.rotation.z = Math.PI / 2;
    mount.position.set(sx * 0.515, 0.28, 0);
    const ring = new THREE.Mesh(carryRingGeo, goldMat);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.x = sx * 0.18;
    ring.position.set(sx * 0.545, 0.23, 0);
    enableShadows(mount);
    enableShadows(ring);
    group.add(mount, ring);
  }

  // Inner Treasure Mound & Crystal Gems (revealed when lid slightly peeks on hover/click!)
  const hoardBed = new THREE.Mesh(
    createExtrudedSlabGeometry(0.84, 0.09, 0.54, 0.06, 0.02),
    innerHoardMat
  );
  hoardBed.position.y = 0.41;
  group.add(hoardBed);

  const innerCrystalGeo = new THREE.OctahedronGeometry(0.09, 0);
  const innerShardOffsets: [number, number, number, number][] = [
    [-0.18, 0.5, 0.06, 0.35],
    [0.02, 0.52, -0.04, -0.2],
    [0.21, 0.5, 0.05, 0.5],
  ];
  for (const [cx, cy, cz, rz] of innerShardOffsets) {
    const shard = new THREE.Mesh(innerCrystalGeo, gemMat);
    shard.position.set(cx, cy, cz);
    shard.rotation.set(0.2, rz, rz);
    shard.scale.set(0.85, 1.35, 0.85);
    group.add(shard);
  }

  // 3. Hinged Vaulted Lid Sub-Group (pivots along rear hinge at y = 0.495, z = -0.355)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.495, -0.355);
  group.add(lidPivot);

  // Rear Hinges on Pivot Line
  const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6);
  for (const sx of [-0.27, 0.27]) {
    const hinge = new THREE.Mesh(hingeGeo, ironMat);
    hinge.rotation.z = Math.PI / 2;
    group.add(hinge);
    hinge.position.set(sx, 0.495, -0.365);
    enableShadows(hinge);
  }

  // Lid children sit offset forward by +0.355 so lid centers cleanly over body
  const lidCenterOffsetZ = 0.355;

  const lidWoodGeo = createVaultArchProfileGeometry(1.0, 0.7, 0.32, 0.022);
  const lidWoodMesh = new THREE.Mesh(lidWoodGeo, woodMat);
  lidWoodMesh.position.set(0, -0.01, lidCenterOffsetZ);
  enableShadows(lidWoodMesh);
  lidPivot.add(lidWoodMesh);

  // Arched Gold Crown Ribs on Lid
  const lidRibGeo = createVaultArchProfileGeometry(0.115, 0.74, 0.35, 0.016);
  for (const sx of [-0.27, 0.27]) {
    const rib = new THREE.Mesh(lidRibGeo, goldMat);
    rib.position.set(sx, -0.015, lidCenterOffsetZ);
    enableShadows(rib);
    lidPivot.add(rib);
  }
  for (const sx of [-0.46, 0.46]) {
    const endCap = new THREE.Mesh(createVaultArchProfileGeometry(0.095, 0.73, 0.34, 0.015), ironMat);
    endCap.position.set(sx, -0.015, lidCenterOffsetZ);
    enableShadows(endCap);
    lidPivot.add(endCap);
  }

  // Top Crown Crest Plate + Faceted Ridge Gem
  const crestPlate = new THREE.Mesh(
    createExtrudedSlabGeometry(0.32, 0.055, 0.24, 0.05, 0.012),
    goldMat
  );
  crestPlate.position.set(0, 0.325, lidCenterOffsetZ);
  const crestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), gemMat);
  crestGem.scale.set(1.25, 0.75, 0.95);
  crestGem.position.set(0, 0.385, lidCenterOffsetZ);
  enableShadows(crestPlate);
  lidPivot.add(crestPlate, crestGem);

  // Lid Front Latch Hasps
  const lidHasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.055), goldMat);
  lidHasp.position.set(0, -0.01, lidCenterOffsetZ + 0.365);
  enableShadows(lidHasp);
  lidPivot.add(lidHasp);

  // 4. Front Ornate Escutcheon Shield Lock + Glowing Centerpiece Gem
  const lockPlate = new THREE.Mesh(createShieldLockGeometry(0.24, 0.24, 0.038), goldMat);
  lockPlate.position.set(0, 0.34, 0.345);
  const frontBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.04, 6), ironMat);
  frontBezel.rotation.x = Math.PI / 2;
  frontBezel.position.set(0, 0.35, 0.382);
  const frontGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), gemMat);
  frontGem.scale.set(0.95, 1.25, 0.75);
  frontGem.position.set(0, 0.35, 0.405);
  enableShadows(lockPlate);
  enableShadows(frontBezel);
  group.add(lockPlate, frontBezel, frontGem);

  // Instanced Gold Rivet Studs across Front & Lid Ribs (Single Draw Call)
  const rivetPositions: [number, number, number][] = [
    [-0.27, 0.14, 0.385],
    [-0.27, 0.36, 0.385],
    [0.27, 0.14, 0.385],
    [0.27, 0.36, 0.385],
    [-0.27, 0.14, -0.385],
    [-0.27, 0.36, -0.385],
    [0.27, 0.14, -0.385],
    [0.27, 0.36, -0.385],
  ];
  const rivetGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.024, 6);
  const rivets = new THREE.InstancedMesh(rivetGeo, ironMat, rivetPositions.length);
  const dummy = new THREE.Object3D();
  rivetPositions.forEach(([rx, ry, rz], idx) => {
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    rivets.setMatrixAt(idx, dummy.matrix);
  });
  rivets.instanceMatrix.needsUpdate = true;
  group.add(rivets);

  const setAccentColor = (color: number | string): void => {
    gemMat.color.set(color);
    gemMat.emissive.set(color);
  };

  const setInteraction = (hovered: boolean, bounce: number, elapsed: number): void => {
    const hoverBoost = hovered ? 0.09 : 0;
    const bounceOpen = bounce * 0.36;
    const idleBreath = Math.sin(elapsed * 2.4) * 0.012;
    lidPivot.rotation.x = -Math.max(0, hoverBoost + bounceOpen + idleBreath);

    goldMat.emissiveIntensity = hovered ? 0.45 : 0.14 + bounce * 0.35;
    gemMat.emissiveIntensity = (hovered ? 1.55 : 0.9) + bounce * 0.8 + Math.sin(elapsed * 3.2) * 0.12;
    innerHoardMat.emissiveIntensity = hovered || bounce > 0.02 ? 1.15 : 0.45;
  };

  const dispose = (): void => {
    disposeObject3D(group);
  };

  return {
    group,
    lidPivot,
    setAccentColor,
    setInteraction,
    dispose,
  };
}

/**
 * Creates the full Right-Wing Quarry Loot Vault Station + Direct Ore Escalator Bridge:
 * - Lower Pit Intake Hopper (anchored at pit floor y = -0.68)
 * - Continuous Inclined Ore Escalator with animated InstancedMesh cleats & crystal rails
 * - Upper Brass-Trimmed Discharge Hopper & Slide leading straight onto the Vault Dais
 * - 3-Tiered Beveled Stone/Iron/Gold Vault Sanctuary at (8.45, 0, 1.7) supporting the Chest at y = 0.48
 */
export function createChestVaultStation(
  options: ChestVaultStationOptions = {}
): ChestVaultStationHandle {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: options.cliffColor ?? 0x78716c,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.56,
    metalness: 0.36,
    flatShading: true,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.72,
    flatShading: true,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: options.trimColor ?? 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.16,
    roughness: 0.26,
    metalness: 0.84,
    flatShading: true,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: options.crystalColor ?? 0x38bdf8,
    emissive: options.crystalColor ?? 0x38bdf8,
    emissiveIntensity: 0.78,
    roughness: 0.16,
    metalness: 0.35,
    flatShading: true,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.86,
    metalness: 0.12,
    flatShading: true,
  });
  const cleatMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.46,
    metalness: 0.55,
    flatShading: true,
  });
  const goldOreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.24,
    metalness: 0.82,
    flatShading: true,
  });

  // =========================================================================
  // 1. LOWER PIT INTAKE HOPPER (inside pit chute x = 5.18 .. 5.80, y = -0.68)
  // =========================================================================
  const intakeGroup = new THREE.Group();
  intakeGroup.position.set(5.48, -0.68, ESCALATOR_Z);

  const intakeApron = new THREE.Mesh(
    createExtrudedSlabGeometry(0.95, 0.14, 1.18, 0.1, 0.02),
    stoneMat
  );
  intakeApron.position.set(-0.08, 0, 0);
  enableShadows(intakeApron);
  intakeGroup.add(intakeApron);

  // Flared intake steel wing guides scooping ore cleanly onto the belt
  for (const sz of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.09), darkIronMat);
    wing.position.set(-0.18, 0.22, sz * 0.48);
    wing.rotation.y = sz * 0.24;
    const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.11), brassMat);
    wingTrim.position.set(-0.18, 0.4, sz * 0.48);
    wingTrim.rotation.y = sz * 0.24;
    enableShadows(wing);
    intakeGroup.add(wing, wingTrim);
  }
  const intakeGlowBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.72), crystalMat);
  intakeGlowBar.position.set(-0.34, 0.15, 0);
  intakeGroup.add(intakeGlowBar);
  group.add(intakeGroup);

  // =========================================================================
  // 2. CONTINUOUS INCLINED ORE ESCALATOR BRIDGE (x 5.48 -> 7.76, y -0.52 -> 0.46)
  // =========================================================================
  const escalatorGroup = new THREE.Group();
  escalatorGroup.position.set(ESCALATOR_START_X, ESCALATOR_START_Y, ESCALATOR_Z);
  escalatorGroup.rotation.z = RAMP_ANGLE;
  group.add(escalatorGroup);

  // Structural Under-Chassis & Rubber Conveyor Track Bed
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH, 0.14, 0.86), darkIronMat);
  chassis.position.set(RAMP_LENGTH * 0.5, -0.02, 0);
  enableShadows(chassis);

  const beltCore = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.04, 0.085, 0.68), beltMat);
  beltCore.position.set(RAMP_LENGTH * 0.5, 0.045, 0);
  beltCore.receiveShadow = true;
  escalatorGroup.add(chassis, beltCore);

  // Side Guide Girder Walls + Brass Handrails + Glowing Crystal Conduit Strips
  for (const sz of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.1, 0.28, 0.095), slateMat);
    wall.position.set(RAMP_LENGTH * 0.5, 0.12, sz * 0.42);
    enableShadows(wall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.16, 0.055, 0.12), brassMat);
    rail.position.set(RAMP_LENGTH * 0.5, 0.27, sz * 0.42);
    enableShadows(rail);

    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH - 0.08, 0.038, 0.03), crystalMat);
    lightStrip.position.set(RAMP_LENGTH * 0.5, 0.18, sz * 0.365);

    escalatorGroup.add(wall, rail, lightStrip);
  }

  // Lower & Upper Brass-Capped Drive Rollers
  const rollerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.78, 10);
  for (const rx of [0.02, RAMP_LENGTH - 0.02]) {
    const roller = new THREE.Mesh(rollerGeo, brassMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(rx, 0.045, 0);
    enableShadows(roller);
    escalatorGroup.add(roller);
  }

  // Instanced Moving Tread Cleats climbing smoothly along the closed belt loop
  const cleatGeo = new THREE.BoxGeometry(0.075, 0.04, 0.62);
  const cleatInstances = new THREE.InstancedMesh(cleatGeo, cleatMat, BELT_CLEAT_COUNT);
  cleatInstances.castShadow = true;
  cleatInstances.receiveShadow = true;
  escalatorGroup.add(cleatInstances);

  // Grounded Support Stanchions connecting Escalator to Trench (y=-0.67) and Apron (y=0.0)
  const stanchionSpecs: [number, number, number][] = [
    [6.42, -0.67, -0.14], // Trench floor pier
    [7.28, 0.0, 0.22], // Courtyard/vault apron abutment pier
  ];
  for (const [sx, bottomY, topY] of stanchionSpecs) {
    const h = Math.max(0.1, topY - bottomY);
    for (const sz of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.12), darkIronMat);
      leg.position.set(sx, bottomY + h * 0.5, ESCALATOR_Z + sz);
      enableShadows(leg);
      group.add(leg);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.84), slateMat);
    crossBeam.position.set(sx, topY - 0.04, ESCALATOR_Z);
    enableShadows(crossBeam);
    group.add(crossBeam);
  }

  // =========================================================================
  // 3. TIERED VAULT SANCTUARY PLATFORM ("Tempat Chest" at x = 8.45, z = 1.7)
  // =========================================================================
  const vaultGroup = new THREE.Group();
  vaultGroup.position.set(8.45, 0, ESCALATOR_Z);
  group.add(vaultGroup);

  // Tier 1: Grounded Chamfered Stone Plinth (y = 0.0 .. 0.16)
  // Left edge reaches x = 8.45 - 1.42 = 7.03, cleanly overlapping courtyard rim & escalator end
  const plinthTier = new THREE.Mesh(
    createExtrudedSlabGeometry(2.84, 0.16, 2.86, 0.28, 0.03),
    stoneMat
  );
  plinthTier.position.y = 0;
  enableShadows(plinthTier);
  vaultGroup.add(plinthTier);

  // Tier 2: Machined Steel & Brass Vault Deck (y = 0.16 .. 0.34)
  const metalDeck = new THREE.Mesh(
    createExtrudedSlabGeometry(2.44, 0.18, 2.46, 0.26, 0.025),
    slateMat
  );
  metalDeck.position.y = 0.16;
  enableShadows(metalDeck);

  const deckBrassTrim = new THREE.Mesh(
    createExtrudedSlabGeometry(2.5, 0.055, 2.52, 0.26, 0.012),
    brassMat
  );
  deckBrassTrim.position.y = 0.295;
  enableShadows(deckBrassTrim);
  vaultGroup.add(metalDeck, deckBrassTrim);

  // Direct Escalator-to-Vault Intake Archway & Discharge Slide (local x = -0.95 .. -0.35)
  // Bridges cleanly from escalator end (world x = 7.76 => local x = -0.69) into the Chest Dais!
  const intakeSlide = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.68), darkIronMat);
  intakeSlide.position.set(-0.62, 0.42, 0);
  intakeSlide.rotation.z = -0.18;
  enableShadows(intakeSlide);

  const slideGlowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.025, 0.28), crystalMat);
  slideGlowStrip.position.set(-0.61, 0.46, 0);
  slideGlowStrip.rotation.z = -0.18;

  // Flared Hopper Cheek Walls & Overhead Intake Arch Gate
  for (const sz of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.1), slateMat);
    cheek.position.set(-0.66, 0.5, sz * 0.39);
    const cheekCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.13), brassMat);
    cheekCap.position.set(-0.66, 0.68, sz * 0.39);

    const archPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.72, 6), darkIronMat);
    archPost.position.set(-0.74, 0.68, sz * 0.46);
    enableShadows(cheek);
    enableShadows(cheekCap);
    enableShadows(archPost);
    vaultGroup.add(cheek, cheekCap, archPost);
  }

  const archLintel = new THREE.Mesh(
    createExtrudedSlabGeometry(0.24, 0.14, 1.06, 0.05, 0.018),
    brassMat
  );
  archLintel.position.set(-0.74, 0.99, 0);
  const archBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMat);
  archBeacon.scale.set(0.9, 1.35, 0.9);
  archBeacon.position.set(-0.74, 1.22, 0);
  enableShadows(archLintel);
  vaultGroup.add(intakeSlide, slideGlowStrip, archLintel, archBeacon);

  // Tier 3: Central Octagonal Chest Dais (y = 0.34 .. 0.48)
  const daisLower = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.08, 8), darkIronMat);
  daisLower.position.y = 0.38;
  daisLower.rotation.y = Math.PI / 8;

  const daisTop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.83, 0.065, 8), slateMat);
  daisTop.position.y = 0.448;
  daisTop.rotation.y = Math.PI / 8;

  const daisEnergyRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.036, 6, 8), crystalMat);
  daisEnergyRing.rotation.x = Math.PI / 2;
  daisEnergyRing.rotation.z = Math.PI / 8;
  daisEnergyRing.position.y = 0.43;

  const daisGoldCollar = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.028, 6, 8), brassMat);
  daisGoldCollar.rotation.x = Math.PI / 2;
  daisGoldCollar.rotation.z = Math.PI / 8;
  daisGoldCollar.position.y = 0.48;

  enableShadows(daisLower);
  enableShadows(daisTop);
  vaultGroup.add(daisLower, daisTop, daisEnergyRing, daisGoldCollar);

  // Rear/Outer Framing Lantern Pylons (LatheGeometry silhouettes at +X corners so camera front-left view stays clear)
  const pylonProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.19, 0.0),
    new THREE.Vector2(0.17, 0.12),
    new THREE.Vector2(0.11, 0.22),
    new THREE.Vector2(0.095, 0.72),
    new THREE.Vector2(0.15, 0.82),
    new THREE.Vector2(0.12, 0.92),
    new THREE.Vector2(0.0, 0.94),
  ];
  const pylonGeo = new THREE.LatheGeometry(pylonProfile, 8);
  const lanternBulbGeo = new THREE.OctahedronGeometry(0.105, 0);
  const lanternCapGeo = new THREE.ConeGeometry(0.16, 0.14, 8);

  for (const sz of [-0.92, 0.92]) {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(0.92, 0.34, sz);

    const body = new THREE.Mesh(pylonGeo, darkIronMat);
    const bulb = new THREE.Mesh(lanternBulbGeo, crystalMat);
    bulb.position.y = 1.05;
    const cap = new THREE.Mesh(lanternCapGeo, brassMat);
    cap.position.y = 1.19;

    enableShadows(body);
    enableShadows(cap);
    pylonGroup.add(body, bulb, cap);
    vaultGroup.add(pylonGroup);
  }

  // Decorative Gold Ingots + Crystal Cluster on Vault Apron
  const ingotGeo = new THREE.BoxGeometry(0.18, 0.075, 0.095);
  const ingotSpecs: [number, number, number, number][] = [
    [0.72, 0.38, -0.45, 0.35],
    [0.75, 0.38, -0.31, 0.28],
    [0.73, 0.455, -0.38, 0.31],
  ];
  for (const [ix, iy, iz, ry] of ingotSpecs) {
    const ingot = new THREE.Mesh(ingotGeo, goldOreMat);
    ingot.position.set(ix, iy, iz);
    ingot.rotation.y = ry;
    enableShadows(ingot);
    vaultGroup.add(ingot);
  }

  const crystalShardGeo = new THREE.ConeGeometry(0.085, 0.34, 5);
  const shardSpecs: [number, number, number, number, number][] = [
    [0.74, 0.48, 0.56, 0.18, 0.12],
    [0.86, 0.44, 0.48, -0.24, -0.18],
  ];
  for (const [cx, cy, cz, rx, rz] of shardSpecs) {
    const shard = new THREE.Mesh(crystalShardGeo, crystalMat);
    shard.position.set(cx, cy, cz);
    shard.rotation.set(rx, 0.4, rz);
    vaultGroup.add(shard);
  }

  // =========================================================================
  // 4. ANIMATED ORE CHUNKS RIDING UP ESCALATOR INTO THE VAULT CHUTE
  // =========================================================================
  const packetRockGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const packetGemGeo = new THREE.OctahedronGeometry(0.095, 0);
  const packets: MovingOreChunk[] = [];
  const packetCount = 3;

  for (let i = 0; i < packetCount; i++) {
    const pg = new THREE.Group();
    const rock = new THREE.Mesh(packetRockGeo, slateMat);
    const gem = new THREE.Mesh(packetGemGeo, i % 2 === 0 ? crystalMat : goldOreMat);
    gem.position.set(0.03, 0.06, 0.02);
    gem.rotation.set(0.4, 0.6, 0.3);
    pg.add(rock, gem);
    enableShadows(pg);
    group.add(pg);
    packets.push({
      group: pg,
      progress: i / packetCount,
      spinSpeed: i % 2 === 0 ? 1.8 : -2.1,
    });
  }

  const cleatDummy = new THREE.Object3D();

  const updateCleats = (beltOffset: number): void => {
    for (let i = 0; i < BELT_CLEAT_COUNT; i++) {
      const s = (beltOffset + (i / BELT_CLEAT_COUNT) * CLEAT_LOOP_SPAN) % CLEAT_LOOP_SPAN;
      if (s <= RAMP_LENGTH) {
        // Climbing upper belt surface toward chest
        cleatDummy.position.set(s, 0.095, 0);
        cleatDummy.rotation.set(0, 0, 0);
      } else if (s <= RAMP_LENGTH + 0.18) {
        // Rounding upper drive drum
        const frac = (s - RAMP_LENGTH) / 0.18;
        const theta = frac * Math.PI;
        cleatDummy.position.set(RAMP_LENGTH + Math.sin(theta) * 0.065, 0.045 + Math.cos(theta) * 0.05, 0);
        cleatDummy.rotation.set(0, 0, -theta);
      } else if (s <= RAMP_LENGTH * 2 + 0.18) {
        // Returning underneath belt
        const backDist = s - (RAMP_LENGTH + 0.18);
        cleatDummy.position.set(RAMP_LENGTH - backDist, -0.005, 0);
        cleatDummy.rotation.set(0, 0, Math.PI);
      } else {
        // Rounding lower drive drum
        const frac = (s - (RAMP_LENGTH * 2 + 0.18)) / 0.18;
        const theta = Math.PI + frac * Math.PI;
        cleatDummy.position.set(Math.sin(theta) * 0.065, 0.045 + Math.cos(theta) * 0.05, 0);
        cleatDummy.rotation.set(0, 0, -theta);
      }
      cleatDummy.updateMatrix();
      cleatInstances.setMatrixAt(i, cleatDummy.matrix);
    }
    cleatInstances.instanceMatrix.needsUpdate = true;
  };

  // Initialize cleats immediately so first frame looks crisp
  updateCleats(0);

  const setPalette = (crystalColor: number | string, cliffColor: number | string): void => {
    crystalMat.color.set(crystalColor);
    crystalMat.emissive.set(crystalColor);
    stoneMat.color.set(cliffColor);
  };

  let beltTravel = 0;

  const update = (
    dtSec: number,
    elapsed: number,
    chestHovered: boolean,
    chestBounce: number
  ): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    beltTravel = (beltTravel + safeDt * 0.95) % CLEAT_LOOP_SPAN;
    updateCleats(beltTravel);

    for (const pkt of packets) {
      pkt.progress = (pkt.progress + safeDt * 0.38) % 1;
      const t = pkt.progress;

      if (t < 0.78) {
        // Phase 1: Climb continuously up the escalator ramp
        const rampT = t / 0.78;
        const wx = ESCALATOR_START_X + rampT * RAMP_DX;
        const wy = ESCALATOR_START_Y + rampT * RAMP_DY + 0.19;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(1);
      } else if (t < 0.94) {
        // Phase 2: Crest over drive drum & slide cleanly down the Vault Intake Chute toward Chest
        const slideT = (t - 0.78) / 0.16;
        const wx = ESCALATOR_END_X + slideT * 0.56;
        const wy =
          ESCALATOR_END_Y +
          0.19 -
          slideT * 0.16 +
          Math.sin(slideT * Math.PI) * 0.05;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(1 - slideT * 0.2);
      } else {
        // Phase 3: Absorbed cleanly into the Chest Vault dais
        const absorbT = (t - 0.94) / 0.06;
        const wx = 8.32 + absorbT * 0.13;
        const wy = 0.49 - absorbT * 0.04;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(Math.max(0.01, 0.8 * (1 - absorbT)));
      }
      pkt.group.rotation.y += safeDt * pkt.spinSpeed;
      pkt.group.rotation.x = Math.sin(elapsed * 2 + t * 6) * 0.15;
    }

    const energyPulse = Math.sin(elapsed * 2.8) * 0.15;
    crystalMat.emissiveIntensity = (chestHovered ? 1.15 : 0.78) + chestBounce * 0.65 + energyPulse;
    brassMat.emissiveIntensity = chestHovered ? 0.34 : 0.16 + chestBounce * 0.25;
  };

  const dispose = (): void => {
    disposeObject3D(group);
  };

  return {
    group,
    setPalette,
    update,
    dispose,
  };
}
