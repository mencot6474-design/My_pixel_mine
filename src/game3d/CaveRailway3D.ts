import * as THREE from 'three';
import { disposeObject3D } from './ChestVaultStation3D';
import { createCyberRadarArray } from './CyberProps3D';
import { createChamferSlabGeometry, enableShadows, mergeStaticMeshesByMaterial } from './MeshHelpers3D';

export interface CaveRailwayOptions {
  crystalColor?: number | string;
  cliffColor?: number | string;
  foliageColor?: number | string;
}

export interface CaveRailwayHandle {
  group: THREE.Group;
  setPalette: (
    crystalColor: number | string,
    cliffColor: number | string,
    foliageColor: number | string
  ) => void;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface MinecartHandle {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  payloadGroup: THREE.Group;
}

const RAIL_Z = 0.15;
const UPPER_Y = 0.0;
const PIT_Y = -0.68;
const SLOPE_START_X = -7.15;
const SLOPE_END_X = -5.78;
const SLOPE_DX = SLOPE_END_X - SLOPE_START_X;
const SLOPE_DY = PIT_Y - UPPER_Y;
const SLOPE_ANGLE = Math.atan2(SLOPE_DY, SLOPE_DX);
const RAIL_GAUGE_HALF = 0.31;
const RAIL_HEAD_HEIGHT = 0.085;

function createExtrudedChamferBox(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.02
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel, {
    minInnerH: 0.02,
    maxChamferRatio: 0.4,
  });
}

function createBallastBedGeometry(
  lengthX: number,
  bottomW: number,
  topW: number,
  height: number
): THREE.ExtrudeGeometry {
  const hb = bottomW * 0.5;
  const ht = topW * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hb, 0);
  shape.lineTo(hb, 0);
  shape.lineTo(ht, height);
  shape.lineTo(-ht, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthX,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-lengthX * 0.5, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createLatheProfile(
  points: ReadonlyArray<readonly [number, number]>,
  segments = 10
): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Evaluates exact railway surface height & smoothed pitch rotation at world X.
 */
function sampleTrackPose(wx: number): { y: number; rotZ: number } {
  let y: number;
  if (wx <= SLOPE_START_X) {
    y = UPPER_Y;
  } else if (wx >= SLOPE_END_X) {
    y = PIT_Y;
  } else {
    const t = (wx - SLOPE_START_X) / SLOPE_DX;
    y = UPPER_Y + t * SLOPE_DY;
  }

  const blendHalf = 0.26;
  let rotZ = 0;
  if (wx > SLOPE_START_X - blendHalf && wx < SLOPE_START_X + blendHalf) {
    const u = (wx - (SLOPE_START_X - blendHalf)) / (blendHalf * 2);
    const smooth = u * u * (3 - 2 * u);
    rotZ = SLOPE_ANGLE * smooth;
  } else if (wx >= SLOPE_START_X + blendHalf && wx <= SLOPE_END_X - blendHalf) {
    rotZ = SLOPE_ANGLE;
  } else if (wx > SLOPE_END_X - blendHalf && wx < SLOPE_END_X + blendHalf) {
    const u = (wx - (SLOPE_END_X - blendHalf)) / (blendHalf * 2);
    const smooth = u * u * (3 - 2 * u);
    rotZ = SLOPE_ANGLE * (1 - smooth);
  }

  return { y: y + RAIL_HEAD_HEIGHT, rotZ };
}

function createCyberOrePod(
  isLeadLocomotive: boolean,
  materials: {
    armorDark: THREE.MeshStandardMaterial;
    gunmetal: THREE.MeshStandardMaterial;
    steel: THREE.MeshStandardMaterial;
    cyanNeon: THREE.MeshStandardMaterial;
    crystal: THREE.MeshStandardMaterial;
    amberNeon: THREE.MeshStandardMaterial;
    coal: THREE.MeshStandardMaterial;
  }
): MinecartHandle {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  // 1. Cyber Alloy Guide Wheels & Axles
  const wheelRadius = 0.145;
  const treadGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.065, 10);
  const flangeGeo = new THREE.CylinderGeometry(wheelRadius + 0.03, wheelRadius + 0.03, 0.022, 10);
  const hubGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.085, 6);
  const axleGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.72, 6);

  for (const ax of [-0.28, 0.28]) {
    const axle = new THREE.Mesh(axleGeo, materials.gunmetal);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(ax, wheelRadius, 0);
    enableShadows(axle);
    group.add(axle);

    for (const sz of [-1, 1]) {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(ax, wheelRadius, sz * RAIL_GAUGE_HALF);

      const tread = new THREE.Mesh(treadGeo, materials.steel);
      tread.rotation.x = Math.PI / 2;

      const flange = new THREE.Mesh(flangeGeo, materials.armorDark);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = -sz * 0.035;

      const hub = new THREE.Mesh(hubGeo, materials.cyanNeon);
      hub.rotation.x = Math.PI / 2;

      enableShadows(tread);
      wheelPivot.add(tread, flange, hub);
      group.add(wheelPivot);
      wheels.push(wheelPivot);
    }
  }

  // 2. Armored Maglev Shuttle Chassis & Magnetic Bumper Rails
  const chassis = new THREE.Mesh(
    createExtrudedChamferBox(1.04, 0.1, 0.74, 0.06, 0.015),
    materials.armorDark
  );
  chassis.position.y = 0.18;
  enableShadows(chassis);
  group.add(chassis);

  const bumperGeo = new THREE.CylinderGeometry(0.042, 0.052, 0.1, 6);
  for (const sx of [-0.55, 0.55]) {
    const bumper = new THREE.Mesh(bumperGeo, materials.cyanNeon);
    bumper.rotation.z = Math.PI / 2;
    bumper.position.set(sx, 0.23, 0);
    group.add(bumper);
  }

  // 3. Flared Hollow Titanium Hopper Pod with Thin Cyan Rim Rails
  const tubFloor = new THREE.Mesh(
    createExtrudedChamferBox(0.92, 0.06, 0.62, 0.04, 0.01),
    materials.armorDark
  );
  tubFloor.position.y = 0.27;
  enableShadows(tubFloor);
  group.add(tubFloor);

  const sideWallGeo = createExtrudedChamferBox(1.02, 0.44, 0.065, 0.025, 0.01);
  const sideRibGeo = createExtrudedChamferBox(0.08, 0.46, 0.085, 0.02, 0.008);
  const sideRimGeo = createExtrudedChamferBox(1.08, 0.05, 0.09, 0.02, 0.008);
  for (const sz of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeo, materials.gunmetal);
    wall.position.set(0, 0.28, sz * 0.34);
    wall.rotation.x = sz * 0.2;
    enableShadows(wall);
    group.add(wall);

    for (const sx of [-0.32, 0, 0.32]) {
      const rib = new THREE.Mesh(sideRibGeo, materials.steel);
      rib.position.set(sx, 0.28, sz * 0.355);
      rib.rotation.x = sz * 0.2;
      enableShadows(rib);
      group.add(rib);
    }

    const sideRim = new THREE.Mesh(sideRimGeo, materials.cyanNeon);
    sideRim.position.set(0, 0.68, sz * 0.39);
    group.add(sideRim);
  }

  const endWallGeo = createExtrudedChamferBox(0.065, 0.44, 0.78, 0.025, 0.01);
  const endRimGeo = createExtrudedChamferBox(0.09, 0.05, 0.88, 0.02, 0.008);
  for (const sx of [-1, 1]) {
    const endWall = new THREE.Mesh(endWallGeo, materials.gunmetal);
    endWall.position.set(sx * 0.46, 0.28, 0);
    endWall.rotation.z = -sx * 0.16;
    enableShadows(endWall);

    const endRim = new THREE.Mesh(endRimGeo, materials.cyanNeon);
    endRim.position.set(sx * 0.5, 0.68, 0);
    group.add(endWall, endRim);
  }

  // 4. Lead Shuttle Cyber Scanner Projector
  if (isLeadLocomotive) {
    const lampHousing = new THREE.Mesh(
      createExtrudedChamferBox(0.14, 0.16, 0.24, 0.03, 0.01),
      materials.steel
    );
    lampHousing.position.set(0.53, 0.62, 0);
    const lampLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.04, 8),
      materials.amberNeon
    );
    lampLens.rotation.z = Math.PI / 2;
    lampLens.position.set(0.61, 0.7, 0);
    enableShadows(lampHousing);
    group.add(lampHousing, lampLens);
  }

  // 5. Recessed Ore & Crystal Cargo Inside Hopper Pod
  const payloadGroup = new THREE.Group();
  payloadGroup.position.y = 0.48;
  group.add(payloadGroup);

  const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const rockSpecs: [number, number, number, number, number, number][] = [
    [-0.18, 0.04, -0.09, 1.15, 0.85, 1.0],
    [0.16, 0.05, 0.08, 1.1, 0.9, 1.05],
    [-0.02, 0.09, 0.01, 1.35, 0.95, 1.15],
  ];
  for (const [rx, ry, rz, sx, sy, sz] of rockSpecs) {
    const chunk = new THREE.Mesh(rockGeo, materials.coal);
    chunk.position.set(rx, ry, rz);
    chunk.scale.set(sx, sy, sz);
    chunk.rotation.set(rx * 2.1, rz * 3.0, ry * 1.5);
    enableShadows(chunk);
    payloadGroup.add(chunk);
  }

  const shardGeo = new THREE.ConeGeometry(0.08, 0.28, 5);
  const shardPlacements: [number, number, number, number, number][] = [
    [-0.16, 0.18, 0.08, 0.3, -0.35],
    [0.14, 0.19, -0.07, -0.25, 0.3],
    [0.01, 0.24, 0.01, 0.15, 0.1],
  ];
  for (const [sx, sy, sz, rx, rz] of shardPlacements) {
    const shard = new THREE.Mesh(shardGeo, materials.crystal);
    shard.position.set(sx, sy, sz);
    shard.rotation.set(rx, 0.4, rz);
    payloadGroup.add(shard);
  }

  return { group, wheels, payloadGroup };
}

/**
 * Builds the Left-Wing Futuristic Cyber Mine Elevator / Drop Shaft Structure
 * with a glowing Cyan Energy Portal Gate connecting the Mine Pit up to Neo-Cyber City Plaza,
 * feeding the Maglev Ore Shuttle Track into the quarry excavation pit.
 */
export function createCaveRailway(options: CaveRailwayOptions = {}): CaveRailwayHandle {
  const group = new THREE.Group();

  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x161f30,
    roughness: 0.72,
    metalness: 0.24,
    flatShading: true,
  });
  const armorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x26354e,
    roughness: 0.48,
    metalness: 0.32,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x3c4f70,
    roughness: 0.4,
    metalness: 0.36,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x6f86a8,
    roughness: 0.34,
    metalness: 0.42,
    flatShading: true,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: options.crystalColor ?? 0x38bdf8,
    emissive: options.crystalColor ?? 0x38bdf8,
    emissiveIntensity: 1.05,
    roughness: 0.2,
    metalness: 0.3,
    flatShading: true,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const amberNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.25,
    flatShading: true,
  });
  const portalFieldMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });

  // =========================================================================
  // 1. CYBER MINE ELEVATOR / DROP SHAFT TOWER (x = -10.55, zero Z-fighting, hollow well)
  // =========================================================================
  const shaftGroup = new THREE.Group();
  shaftGroup.position.set(-10.55, 0, RAIL_Z);
  group.add(shaftGroup);

  // Split Flanking Chamfered Foundations so the central track corridor (z in [-0.72..0.72]) never overlaps foundation plates
  for (const sz of [-1, 1]) {
    const sideBase = new THREE.Mesh(
      createExtrudedChamferBox(3.45, 0.28, 1.04, 0.2, 0.02),
      basaltMat
    );
    sideBase.position.set(0, 0, sz * 1.28);
    enableShadows(sideBase);

    const sideTrim = new THREE.Mesh(
      createExtrudedChamferBox(3.52, 0.055, 0.14, 0.04, 0.008),
      cyanNeonMat
    );
    sideTrim.position.set(0, 0.285, sz * 1.76);
    shaftGroup.add(sideBase, sideTrim);
  }

  // 4 Vertical Cyber Drop Shaft Columns + Non-Intersecting Glow Guide Rails (up to y = 4.42)
  for (const [cx, cz] of [
    [-1.22, -1.22],
    [1.22, -1.22],
    [-1.22, 1.22],
    [1.22, 1.22],
  ] as [number, number][]) {
    const foot = new THREE.Mesh(
      createExtrudedChamferBox(0.56, 0.42, 0.56, 0.08, 0.015),
      armorDarkMat
    );
    foot.position.set(cx, 0.34, cz);

    const col = new THREE.Mesh(
      createExtrudedChamferBox(0.36, 3.66, 0.36, 0.06, 0.012),
      gunmetalMat
    );
    col.position.set(cx, 0.76, cz);

    // Mounted strictly proud on inner corner face (never coplanar with column walls!)
    const strip = new THREE.Mesh(
      createExtrudedChamferBox(0.08, 3.55, 0.08, 0.02, 0.006),
      cyanNeonMat
    );
    strip.position.set(cx * 0.82, 0.8, cz * 0.82);

    enableShadows(foot);
    enableShadows(col);
    shaftGroup.add(foot, col, strip);
  }

  // Rear Shielded Steel Blast Wall Above Portal Height (clears ground track completely: y = 1.15 .. 4.40)
  const rearShield = new THREE.Mesh(
    createExtrudedChamferBox(0.32, 3.25, 2.04, 0.08, 0.02),
    armorDarkMat
  );
  rearShield.position.set(-1.38, 1.15, 0);
  enableShadows(rearShield);
  shaftGroup.add(rearShield);

  // Coaxial Cyber Turret Crown Roof (layered steel-blue bevel caps + visible cyan neon overhang rim, zero face overlap)
  const crownLower = new THREE.Mesh(
    createExtrudedChamferBox(3.16, 0.22, 3.16, 0.28, 0.02),
    gunmetalMat
  );
  crownLower.position.y = 4.42;
  enableShadows(crownLower);

  const crownNeonRim = new THREE.Mesh(
    createExtrudedChamferBox(3.28, 0.065, 3.28, 0.28, 0.008),
    cyanNeonMat
  );
  crownNeonRim.position.y = 4.64;

  const crownCap = new THREE.Mesh(
    createExtrudedChamferBox(2.72, 0.26, 2.72, 0.24, 0.02),
    steelMat
  );
  crownCap.position.y = 4.71;
  enableShadows(crownCap);

  const hoistHub = new THREE.Mesh(
    createLatheProfile(
      [
        [0.72, 0.0],
        [0.64, 0.2],
        [0.42, 0.38],
        [0.18, 0.52],
      ],
      10
    ),
    gunmetalMat
  );
  hoistHub.position.y = 4.97;
  enableShadows(hoistHub);

  // Articulated Rotating Cyber Radar Array Replacing Roof Beacon Lamp
  const roofRadar = createCyberRadarArray({
    darkMetalMat: armorDarkMat,
    armorMat: gunmetalMat,
    steelMat,
    neonMat: cyanNeonMat,
    accentMat: crystalMat,
    scale: 1.0,
  });
  roofRadar.group.position.set(0, 5.45, 0);

  // Rear Power Cable Coupling Socket matching MineEnvironment3D left cable endpoint (-11.78, 4.72, -1.02)
  const shaftCableSocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.2, 8),
    steelMat
  );
  shaftCableSocket.position.set(-1.23, 4.72, -1.17);

  const beaconCoreGeo = createLatheProfile(
    [
      [0.2, 0.0],
      [0.18, 0.28],
      [0.12, 0.62],
      [0.18, 0.78],
      [0.09, 0.94],
    ],
    8
  );
  const whipGeo = new THREE.CylinderGeometry(0.014, 0.032, 0.42, 6);
  for (const sz of [-0.95, 0.95]) {
    const stack = new THREE.Mesh(beaconCoreGeo, steelMat);
    stack.position.set(-1.18, 4.97, sz);
    enableShadows(stack);
    const whip = new THREE.Mesh(whipGeo, armorDarkMat);
    whip.position.set(-1.18, 6.08, sz);
    shaftGroup.add(stack, whip);
  }
  shaftGroup.add(crownLower, crownNeonRim, crownCap, hoistHub, roofRadar.group, shaftCableSocket);

  // Hollow Open-Center Perimeter Framing Girders (4 edge beams — central well stays 100% open for moving lift!)
  for (const collarY of [2.42, 3.58]) {
    for (const sz of [-1, 1]) {
      const xGirder = new THREE.Mesh(
        createExtrudedChamferBox(2.04, 0.12, 0.18, 0.02, 0.01),
        steelMat
      );
      xGirder.position.set(0, collarY, sz * 1.22);
      enableShadows(xGirder);
      shaftGroup.add(xGirder);
    }
    for (const sx of [-1, 1]) {
      const zGirder = new THREE.Mesh(
        createExtrudedChamferBox(0.18, 0.12, 2.04, 0.02, 0.01),
        steelMat
      );
      zGirder.position.set(sx * 1.22, collarY, 0);
      enableShadows(zGirder);
      shaftGroup.add(zGirder);
    }
  }

  // Animated Vertical Cyber Elevator Cage Moving Cleanly Through Open Hollow Well (y = 1.80 .. 3.24)
  const elevatorPod = new THREE.Group();
  elevatorPod.position.set(0, 2.52, 0);
  const cageBase = new THREE.Mesh(
    createExtrudedChamferBox(1.42, 0.12, 1.42, 0.14, 0.012),
    armorDarkMat
  );
  const cageEnergyDeck = new THREE.Mesh(
    createExtrudedChamferBox(1.24, 0.05, 1.24, 0.12, 0.008),
    cyanNeonMat
  );
  cageEnergyDeck.position.y = 0.125;
  const cageRoof = new THREE.Mesh(
    createExtrudedChamferBox(1.36, 0.11, 1.36, 0.14, 0.012),
    steelMat
  );
  cageRoof.position.y = 0.84;
  for (const [px, pz] of [
    [-0.52, -0.52],
    [0.52, -0.52],
    [-0.52, 0.52],
    [0.52, 0.52],
  ] as [number, number][]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6), steelMat);
    strut.position.set(px, 0.48, pz);
    elevatorPod.add(strut);
  }
  // Stylized Cyber Plasma Energy Cell Inside Elevator Cage
  const cagePayload = new THREE.Group();
  cagePayload.position.y = 0.48;
  const cageCellCore = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.36, 6), crystalMat);
  const cageCellCapTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 6), steelMat);
  cageCellCapTop.position.y = 0.2;
  const cageCellCapBot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 6), steelMat);
  cageCellCapBot.position.y = -0.2;
  const cageCellBand = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.022, 6, 12), cyanNeonMat);
  cageCellBand.rotation.x = Math.PI / 2;
  cagePayload.add(cageCellCore, cageCellCapTop, cageCellCapBot, cageCellBand);
  elevatorPod.add(cageBase, cageEnergyDeck, cageRoof, cagePayload);
  shaftGroup.add(elevatorPod);

  // =========================================================================
  // 2. TRACK-CENTERED CYBER ENERGY PORTAL ARCH (frames shuttle pod dead center)
  // =========================================================================
  const portalX = 1.6;
  for (const fx of [portalX, portalX + 0.56]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(
        createExtrudedChamferBox(0.24, 1.18, 0.26, 0.04, 0.012),
        gunmetalMat
      );
      post.position.set(fx, 0.28, sz * 0.92);

      const postGlow = new THREE.Mesh(
        createExtrudedChamferBox(0.06, 1.04, 0.06, 0.015, 0.005),
        cyanNeonMat
      );
      postGlow.position.set(fx + 0.145, 0.34, sz * 0.8);
      enableShadows(post);
      shaftGroup.add(post, postGlow);
    }

    const archHeader = new THREE.Mesh(
      createExtrudedChamferBox(0.3, 0.24, 2.18, 0.06, 0.014),
      steelMat
    );
    archHeader.position.set(fx, 1.46, 0);
    enableShadows(archHeader);
    shaftGroup.add(archHeader);
  }

  // Chamfered U-Arch Cyan Neon Aperture Frame & Matching Curtain Centered Around Cart (y = 0.0 .. 1.38)
  const archFrameShape = new THREE.Shape();
  archFrameShape.moveTo(-0.84, 0.0);
  archFrameShape.lineTo(-0.84, 1.04);
  archFrameShape.lineTo(-0.5, 1.38);
  archFrameShape.lineTo(0.5, 1.38);
  archFrameShape.lineTo(0.84, 1.04);
  archFrameShape.lineTo(0.84, 0.0);
  archFrameShape.lineTo(0.74, 0.0);
  archFrameShape.lineTo(0.74, 1.0);
  archFrameShape.lineTo(0.44, 1.29);
  archFrameShape.lineTo(-0.44, 1.29);
  archFrameShape.lineTo(-0.74, 1.0);
  archFrameShape.lineTo(-0.74, 0.0);
  archFrameShape.closePath();

  const portalArchGeo = new THREE.ExtrudeGeometry(archFrameShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 1,
    curveSegments: 1,
  });
  portalArchGeo.translate(0, 0, -0.05);
  portalArchGeo.computeVertexNormals();
  const portalArchTrim = new THREE.Mesh(portalArchGeo, cyanNeonMat);
  portalArchTrim.rotation.y = Math.PI / 2;
  portalArchTrim.position.set(portalX + 0.28, 0, 0);

  const curtainShape = new THREE.Shape();
  curtainShape.moveTo(-0.74, 0.06);
  curtainShape.lineTo(-0.74, 1.0);
  curtainShape.lineTo(-0.44, 1.29);
  curtainShape.lineTo(0.44, 1.29);
  curtainShape.lineTo(0.74, 1.0);
  curtainShape.lineTo(0.74, 0.06);
  curtainShape.closePath();

  const energyCurtain = new THREE.Mesh(new THREE.ShapeGeometry(curtainShape), portalFieldMat);
  energyCurtain.rotation.y = Math.PI / 2;
  energyCurtain.position.set(portalX + 0.28, 0, 0);

  const portalSignBeam = new THREE.Mesh(
    createExtrudedChamferBox(0.1, 0.2, 1.62, 0.04, 0.01),
    cyanNeonMat
  );
  portalSignBeam.position.set(portalX + 0.74, 1.49, 0);

  const portalCrest = new THREE.Mesh(
    createExtrudedChamferBox(0.32, 0.14, 1.08, 0.06, 0.014),
    armorDarkMat
  );
  portalCrest.position.set(portalX + 0.28, 1.71, 0);
  enableShadows(portalCrest);
  shaftGroup.add(portalArchTrim, energyCurtain, portalSignBeam, portalCrest);

  // =========================================================================
  // 3. MAGLEV CYBER DELIVERY GUIDEWAY TRACK (x -12.4 -> -4.82, z = 0.15)
  // =========================================================================
  const railGroup = new THREE.Group();
  railGroup.position.z = RAIL_Z;
  group.add(railGroup);

  const upperLen = SLOPE_START_X - -11.7;
  const upperCenterX = (-11.7 + SLOPE_START_X) * 0.5;
  const upperBed = new THREE.Mesh(
    createBallastBedGeometry(upperLen, 1.2, 0.96, 0.06),
    armorDarkMat
  );
  upperBed.position.set(upperCenterX, 0, 0);
  upperBed.receiveShadow = true;

  const upperMagStrip = new THREE.Mesh(new THREE.BoxGeometry(upperLen - 0.1, 0.025, 0.14), cyanNeonMat);
  upperMagStrip.position.set(upperCenterX, 0.062, 0);
  railGroup.add(upperBed, upperMagStrip);

  const rampLen = Math.hypot(SLOPE_DX, SLOPE_DY);
  const rampCenterX = (SLOPE_START_X + SLOPE_END_X) * 0.5;
  const rampCenterY = (UPPER_Y + PIT_Y) * 0.5;
  const rampGroup = new THREE.Group();
  rampGroup.position.set(rampCenterX, rampCenterY, 0);
  rampGroup.rotation.z = SLOPE_ANGLE;

  const rampDeck = new THREE.Mesh(new THREE.BoxGeometry(rampLen + 0.14, 0.16, 1.12), gunmetalMat);
  rampDeck.position.y = -0.055;
  enableShadows(rampDeck);
  const rampBed = new THREE.Mesh(
    createBallastBedGeometry(rampLen + 0.12, 1.06, 0.92, 0.05),
    armorDarkMat
  );
  rampBed.position.y = 0.02;
  const rampMagStrip = new THREE.Mesh(new THREE.BoxGeometry(rampLen + 0.04, 0.025, 0.12), cyanNeonMat);
  rampMagStrip.position.y = 0.075;
  rampGroup.add(rampDeck, rampBed, rampMagStrip);
  railGroup.add(rampGroup);

  // Dark Steel Support Stanchions Under Sloped Guideway
  const pierHeights: [number, number][] = [
    [-6.78, -0.18],
    [-6.25, -0.45],
  ];
  for (const [px, topY] of pierHeights) {
    const h = Math.max(0.1, topY - -0.68);
    for (const sz of [-0.36, 0.36]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), gunmetalMat);
      pier.position.set(px, -0.68 + h * 0.5, sz);
      enableShadows(pier);
      railGroup.add(pier);
    }
  }

  // Pit Floor Unloading Spur
  const pitSpurLen = -4.82 - SLOPE_END_X;
  const pitSpurCenterX = (SLOPE_END_X + -4.82) * 0.5;
  const pitBed = new THREE.Mesh(
    createBallastBedGeometry(pitSpurLen + 0.1, 1.14, 0.94, 0.055),
    armorDarkMat
  );
  pitBed.position.set(pitSpurCenterX, PIT_Y, 0);
  pitBed.receiveShadow = true;
  railGroup.add(pitBed);

  // Continuous Steel Rails
  const railProfileGeoUpper = new THREE.BoxGeometry(upperLen + 0.06, 0.05, 0.065);
  const railProfileGeoRamp = new THREE.BoxGeometry(rampLen + 0.12, 0.05, 0.065);
  const railProfileGeoPit = new THREE.BoxGeometry(pitSpurLen + 0.06, 0.05, 0.065);

  for (const sz of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    const rUpper = new THREE.Mesh(railProfileGeoUpper, steelMat);
    rUpper.position.set(upperCenterX, UPPER_Y + 0.068, sz);

    const rRamp = new THREE.Mesh(railProfileGeoRamp, steelMat);
    rRamp.position.set(0, 0.088, sz);
    rampGroup.add(rRamp);

    const rPit = new THREE.Mesh(railProfileGeoPit, steelMat);
    rPit.position.set(pitSpurCenterX, PIT_Y + 0.068, sz);

    enableShadows(rUpper);
    enableShadows(rRamp);
    enableShadows(rPit);
    railGroup.add(rUpper, rPit);
  }

  // Instanced Titanium Track Cross-Ribs (Single InstancedMesh Draw Call)
  const sleeperXs: number[] = [];
  for (let x = -11.45; x <= -4.92; x += 0.34) {
    sleeperXs.push(x);
  }
  const sleeperGeo = new THREE.BoxGeometry(0.14, 0.045, 0.9);
  const sleeperInst = new THREE.InstancedMesh(sleeperGeo, gunmetalMat, sleeperXs.length);
  sleeperInst.castShadow = false;
  sleeperInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  sleeperXs.forEach((sx, idx) => {
    const pose = sampleTrackPose(sx);
    dummy.position.set(sx, pose.y - 0.038, 0);
    dummy.rotation.set(0, 0, pose.rotZ);
    dummy.updateMatrix();
    sleeperInst.setMatrixAt(idx, dummy.matrix);
  });
  sleeperInst.instanceMatrix.needsUpdate = true;
  railGroup.add(sleeperInst);

  // Cyber Maglev Pit Unloading Buffer Terminal
  const bufferGroup = new THREE.Group();
  bufferGroup.position.set(-4.92, PIT_Y, 0);
  for (const sz of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.1), steelMat);
    upright.position.set(0.06, 0.22, sz);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.09), gunmetalMat);
    strut.position.set(-0.08, 0.19, sz);
    strut.rotation.z = -0.58;
    const damperHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), cyanNeonMat);
    damperHead.rotation.z = Math.PI / 2;
    damperHead.position.set(-0.04, 0.25, sz);
    enableShadows(upright);
    enableShadows(strut);
    bufferGroup.add(upright, strut, damperHead);
  }
  const bufferBar = new THREE.Mesh(
    createExtrudedChamferBox(0.16, 0.14, 0.88, 0.025, 0.012),
    armorDarkMat
  );
  bufferBar.position.set(0.02, 0.2, 0);
  const bufferStrobe = new THREE.Mesh(
    createExtrudedChamferBox(0.1, 0.08, 0.34, 0.02, 0.008),
    amberNeonMat
  );
  bufferStrobe.position.set(0.06, 0.45, 0);
  enableShadows(bufferBar);
  bufferGroup.add(bufferBar, bufferStrobe);
  railGroup.add(bufferGroup);

  // =========================================================================
  // 4. SINGLE ANIMATED CYBER MAGLEV ORE SHUTTLE CART
  // =========================================================================
  const cartMaterials = {
    armorDark: armorDarkMat,
    gunmetal: gunmetalMat,
    steel: steelMat,
    cyanNeon: cyanNeonMat,
    crystal: crystalMat,
    amberNeon: amberNeonMat,
    coal: coalMat,
  };
  const leadCart = createCyberOrePod(true, cartMaterials);
  railGroup.add(leadCart.group);

  let shuttleClock = 2.05;

  const sampleShuttleState = (clockSec: number): { leadX: number; unloading: boolean } => {
    const cycleSec = 14.0;
    const u = (clockSec % cycleSec) / cycleSec;
    let shuttleT: number;
    if (u < 0.36) {
      const p = u / 0.36;
      shuttleT = 0.5 - 0.5 * Math.cos(Math.PI * p);
    } else if (u < 0.54) {
      shuttleT = 1;
    } else if (u < 0.88) {
      const p = (u - 0.54) / 0.34;
      shuttleT = 0.5 + 0.5 * Math.cos(Math.PI * p);
    } else {
      shuttleT = 0;
    }
    return {
      leadX: -10.25 + shuttleT * (-5.65 - -10.25),
      unloading: shuttleT > 0.95,
    };
  };

  let prevLeadX = sampleShuttleState(shuttleClock).leadX;
  let wheelAngle = 0;

  const positionTrain = (leadX: number): void => {
    const leadPose = sampleTrackPose(leadX);
    leadCart.group.position.set(leadX, leadPose.y, 0);
    leadCart.group.rotation.z = leadPose.rotZ;

    const deltaX = leadX - prevLeadX;
    prevLeadX = leadX;
    wheelAngle -= deltaX / 0.145;
    for (const w of leadCart.wheels) w.rotation.z = wheelAngle;
  };

  positionTrain(prevLeadX);

  const setPalette = (
    crystalColor: number | string,
    _cliffColor: number | string,
    _foliageColor: number | string
  ): void => {
    crystalMat.color.set(crystalColor);
    crystalMat.emissive.set(crystalColor);
  };

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    shuttleClock += safeDt;

    const { leadX, unloading } = sampleShuttleState(shuttleClock);
    positionTrain(leadX);

    // Smooth vertical elevator lift motion staying cleanly inside hollow shaft well (y = 1.80 .. 3.24)
    elevatorPod.position.y = 2.52 + Math.sin(elapsed * 1.1) * 0.72;
    cagePayload.rotation.y = elapsed * 1.8;
    roofRadar.rotorGroup.rotation.y = elapsed * 0.55;

    const pulse = Math.sin(elapsed * 2.6) * 0.18;
    crystalMat.emissiveIntensity = 1.05 + pulse + (unloading ? 0.3 : 0);
    cyanNeonMat.emissiveIntensity = 1.35 + pulse;
    portalFieldMat.opacity = 0.22 + Math.sin(elapsed * 3.2) * 0.08;
    amberNeonMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 4.5) * 0.22;
  };

  const dispose = (): void => {
    disposeObject3D(group);
  };

  mergeStaticMeshesByMaterial(leadCart.group, new Set<THREE.Object3D>(leadCart.wheels));
  mergeStaticMeshesByMaterial(elevatorPod, new Set<THREE.Object3D>([cagePayload]));
  mergeStaticMeshesByMaterial(roofRadar.rotorGroup);
  mergeStaticMeshesByMaterial(
    group,
    new Set<THREE.Object3D>([leadCart.group, elevatorPod, roofRadar.rotorGroup, sleeperInst])
  );

  return {
    group,
    setPalette,
    update,
    dispose,
  };
}
