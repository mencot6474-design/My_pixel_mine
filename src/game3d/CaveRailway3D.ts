import * as THREE from 'three';
import { disposeObject3D } from './ChestVaultStation3D';

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

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createExtrudedChamferBox(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.02
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.4, hd * 0.4);
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

  const innerH = Math.max(0.02, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
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

function createTunnelArchBlockGeometry(
  depthX: number,
  widthZ: number,
  heightY: number,
  bevel = 0.025
): THREE.ExtrudeGeometry {
  const shape = createChamferRectShapeForBox(depthX, heightY, bevel * 1.8);
  const innerZ = Math.max(0.04, widthZ - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerZ,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -innerZ * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createChamferRectShapeForBox(w: number, h: number, c: number): THREE.Shape {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const cc = Math.min(c, hw * 0.4, hh * 0.4);
  const s = new THREE.Shape();
  s.moveTo(-hw + cc, -hh);
  s.lineTo(hw - cc, -hh);
  s.lineTo(hw, -hh + cc);
  s.lineTo(hw, hh - cc);
  s.lineTo(hw - cc, hh);
  s.lineTo(-hw + cc, hh);
  s.lineTo(-hw, hh - cc);
  s.lineTo(-hw, -hh + cc);
  s.closePath();
  return s;
}

/**
 * Evaluates exact railway surface height & smoothed pitch rotation at world X.
 */
function sampleTrackPose(wx: number): { y: number; rotZ: number } {
  // Linear base height
  let y: number;
  if (wx <= SLOPE_START_X) {
    y = UPPER_Y;
  } else if (wx >= SLOPE_END_X) {
    y = PIT_Y;
  } else {
    const t = (wx - SLOPE_START_X) / SLOPE_DX;
    y = UPPER_Y + t * SLOPE_DY;
  }

  // Smooth pitch transition over +-0.26m around both bend knuckles
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

function createProceduralMinecart(
  isLeadLocomotive: boolean,
  materials: {
    wood: THREE.MeshStandardMaterial;
    iron: THREE.MeshStandardMaterial;
    steel: THREE.MeshStandardMaterial;
    brass: THREE.MeshStandardMaterial;
    crystal: THREE.MeshStandardMaterial;
    lanternGlow: THREE.MeshStandardMaterial;
    coal: THREE.MeshStandardMaterial;
  }
): MinecartHandle {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  // 1. Flanged Steel Wheels & Axles (wheel radius 0.145 -> center at y = 0.145)
  const wheelRadius = 0.145;
  const treadGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.065, 10);
  const flangeGeo = new THREE.CylinderGeometry(wheelRadius + 0.03, wheelRadius + 0.03, 0.022, 10);
  const hubGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.085, 6);
  const axleGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.72, 6);

  for (const ax of [-0.28, 0.28]) {
    const axle = new THREE.Mesh(axleGeo, materials.iron);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(ax, wheelRadius, 0);
    enableShadows(axle);
    group.add(axle);

    for (const sz of [-1, 1]) {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(ax, wheelRadius, sz * RAIL_GAUGE_HALF);

      const tread = new THREE.Mesh(treadGeo, materials.steel);
      tread.rotation.x = Math.PI / 2;

      const flange = new THREE.Mesh(flangeGeo, materials.iron);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = -sz * 0.035;

      const hub = new THREE.Mesh(hubGeo, materials.brass);
      hub.rotation.x = Math.PI / 2;

      enableShadows(tread);
      wheelPivot.add(tread, flange, hub);
      group.add(wheelPivot);
      wheels.push(wheelPivot);
    }
  }

  // 2. Heavy Riveted Chassis Frame & Bumper Beams (y = 0.18 .. 0.28)
  const chassis = new THREE.Mesh(
    createExtrudedChamferBox(1.02, 0.1, 0.72, 0.05, 0.015),
    materials.iron
  );
  chassis.position.y = 0.18;
  enableShadows(chassis);
  group.add(chassis);

  // Front & Rear Coupler Buffers
  const bumperGeo = new THREE.CylinderGeometry(0.042, 0.05, 0.1, 6);
  for (const sx of [-0.54, 0.54]) {
    const bumper = new THREE.Mesh(bumperGeo, materials.brass);
    bumper.rotation.z = Math.PI / 2;
    bumper.position.set(sx, 0.23, 0);
    enableShadows(bumper);
    group.add(bumper);
  }

  // 3. Genuine Open-Top Hollow Flared Timber & Iron Hopper Tub (y = 0.27 .. 0.72)
  const tubFloor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.62), materials.iron);
  tubFloor.position.y = 0.295;
  enableShadows(tubFloor);
  group.add(tubFloor);

  // Flared Long Side Walls + Outer Iron Ribs + Open Brass Top Rails (hollow inside!)
  const sideWallGeo = new THREE.BoxGeometry(1.02, 0.45, 0.065);
  const sideRibGeo = new THREE.BoxGeometry(0.075, 0.46, 0.085);
  const sideRimGeo = new THREE.BoxGeometry(1.08, 0.06, 0.095);
  for (const sz of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeo, materials.wood);
    wall.position.set(0, 0.49, sz * 0.345);
    wall.rotation.x = sz * 0.22;
    enableShadows(wall);
    group.add(wall);

    for (const sx of [-0.32, 0, 0.32]) {
      const rib = new THREE.Mesh(sideRibGeo, materials.iron);
      rib.position.set(sx, 0.49, sz * 0.36);
      rib.rotation.x = sz * 0.22;
      enableShadows(rib);
      group.add(rib);
    }

    const sideRim = new THREE.Mesh(sideRimGeo, materials.brass);
    sideRim.position.set(0, 0.71, sz * 0.395);
    enableShadows(sideRim);
    group.add(sideRim);
  }

  // Flared Front & Rear End Walls + Corner Iron Braces + Brass Lip Rails
  const endWallGeo = new THREE.BoxGeometry(0.065, 0.45, 0.78);
  const endRimGeo = new THREE.BoxGeometry(0.095, 0.06, 0.88);
  for (const sx of [-1, 1]) {
    const endWall = new THREE.Mesh(endWallGeo, materials.wood);
    endWall.position.set(sx * 0.47, 0.49, 0);
    endWall.rotation.z = -sx * 0.16;
    enableShadows(endWall);

    const endRim = new THREE.Mesh(endRimGeo, materials.brass);
    endRim.position.set(sx * 0.505, 0.71, 0);
    enableShadows(endRim);
    group.add(endWall, endRim);

    for (const sz of [-1, 1]) {
      const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.47, 0.095), materials.iron);
      cornerPost.position.set(sx * 0.48, 0.49, sz * 0.36);
      cornerPost.rotation.set(sz * 0.2, 0, -sx * 0.15);
      enableShadows(cornerPost);
      group.add(cornerPost);
    }
  }

  // 4. Lead Cart Locomotive Brass Headlamp
  if (isLeadLocomotive) {
    const lampPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.14), materials.iron);
    lampPost.position.set(0.51, 0.67, 0);
    const lampHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.11, 0.14, 8),
      materials.brass
    );
    lampHousing.rotation.z = Math.PI / 2;
    lampHousing.position.set(0.57, 0.74, 0);
    const lampLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.04, 8),
      materials.lanternGlow
    );
    lampLens.rotation.z = Math.PI / 2;
    lampLens.position.set(0.63, 0.74, 0);
    enableShadows(lampPost);
    enableShadows(lampHousing);
    group.add(lampPost, lampHousing, lampLens);
  }

  // 5. Recessed Ore & Crystal Payload Nestled INSIDE the Hollow Wagon Cavity (y = 0.44 .. 0.68)
  const payloadGroup = new THREE.Group();
  payloadGroup.position.y = 0.48;
  group.add(payloadGroup);

  const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const rockSpecs: [number, number, number, number, number, number][] = [
    [-0.18, 0.04, -0.09, 1.15, 0.85, 1.0],
    [0.16, 0.05, 0.08, 1.1, 0.9, 1.05],
    [-0.02, 0.09, 0.01, 1.35, 0.95, 1.15],
    [0.2, 0.02, -0.11, 0.9, 0.75, 0.95],
    [-0.2, 0.02, 0.12, 0.95, 0.8, 0.9],
  ];
  for (const [rx, ry, rz, sx, sy, sz] of rockSpecs) {
    const chunk = new THREE.Mesh(rockGeo, materials.coal);
    chunk.position.set(rx, ry, rz);
    chunk.scale.set(sx, sy, sz);
    chunk.rotation.set(rx * 2.1, rz * 3.0, ry * 1.5);
    enableShadows(chunk);
    payloadGroup.add(chunk);
  }

  const shardGeo = new THREE.ConeGeometry(0.075, 0.25, 5);
  const shardPlacements: [number, number, number, number, number][] = [
    [-0.16, 0.18, 0.08, 0.3, -0.35],
    [0.14, 0.19, -0.07, -0.25, 0.3],
    [0.01, 0.22, 0.01, 0.15, 0.1],
    [-0.06, 0.16, -0.12, -0.3, -0.2],
  ];
  for (const [sx, sy, sz, rx, rz] of shardPlacements) {
    const shard = new THREE.Mesh(shardGeo, materials.crystal);
    shard.position.set(sx, sy, sz);
    shard.rotation.set(rx, 0.4, rz);
    payloadGroup.add(shard);
  }

  const nuggetGeo = new THREE.DodecahedronGeometry(0.07, 0);
  for (const [nx, ny, nz] of [
    [0.22, 0.13, 0.11],
    [-0.2, 0.14, -0.08],
    [0.05, 0.16, 0.13],
  ] as [number, number, number][]) {
    const nugget = new THREE.Mesh(nuggetGeo, materials.brass);
    nugget.position.set(nx, ny, nz);
    payloadGroup.add(nugget);
  }

  return { group, wheels, payloadGroup };
}

/**
 * Creates a grand procedural Mine Cave Mountain + Timber/Stone Tunnel Portal +
 * Continuous Steel Railway + Animated 2-Car Ore Minecart Train connecting the
 * left meadow mountain directly down into the Quarry Pit unloading spur.
 */
export function createCaveRailway(options: CaveRailwayOptions = {}): CaveRailwayHandle {
  const group = new THREE.Group();

  const cliffMat = new THREE.MeshStandardMaterial({
    color: options.cliffColor ?? 0x78716c,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
  });
  const cliffDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3f3a36,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: options.foliageColor ?? 0x16a34a,
    roughness: 0.84,
    metalness: 0.02,
    flatShading: true,
  });
  const stoneTrimMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.78,
    metalness: 0.14,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b3b1e,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  });
  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0x452512,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.44,
    metalness: 0.74,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.26,
    metalness: 0.86,
    flatShading: true,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.14,
    roughness: 0.25,
    metalness: 0.84,
    flatShading: true,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: options.crystalColor ?? 0x38bdf8,
    emissive: options.crystalColor ?? 0x38bdf8,
    emissiveIntensity: 0.82,
    roughness: 0.16,
    metalness: 0.35,
    flatShading: true,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.1,
    flatShading: true,
  });
  const ballastMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
  });
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.85,
    metalness: 0.15,
    flatShading: true,
  });
  const tunnelVoidMat = new THREE.MeshBasicMaterial({
    color: 0x050814,
  });

  // =========================================================================
  // 1. GRAND MULTI-TIERED MOUNTAIN CLIFF & RECESSED CAVE TUNNEL (x -14.2 .. -9.2)
  // =========================================================================
  const caveGroup = new THREE.Group();
  caveGroup.position.set(-11.4, 0, RAIL_Z);
  group.add(caveGroup);

  // Dark Inner Cavern Tunnel Shell & Deep Black Backing (leaves hollow clear corridor x -1.8..+2.0)
  const tunnelBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.35, 2.3), tunnelVoidMat);
  tunnelBackWall.position.set(-1.35, 1.18, 0);

  const tunnelRoofSlab = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.5, 2.55), cliffDarkMat);
  tunnelRoofSlab.position.set(-0.05, 2.55, 0);
  enableShadows(tunnelRoofSlab);

  for (const sz of [-1, 1]) {
    const innerWall = new THREE.Mesh(new THREE.BoxGeometry(2.85, 2.35, 0.55), cliffDarkMat);
    innerWall.position.set(-0.05, 1.18, sz * 1.15);
    enableShadows(innerWall);
    caveGroup.add(innerWall);
  }
  caveGroup.add(tunnelBackWall, tunnelRoofSlab);

  // Sculpted Mountain Rock Massif Built Around & Above the Cave Mouth (Zero blocking of tunnel!)
  // Rear peak + high ridge crowning above roof (y = 2.6 .. 4.35) + flanking left/right buttresses
  const rockMassGeo = new THREE.IcosahedronGeometry(1.0, 0);
  const mountainChunks: {
    pos: [number, number, number];
    scale: [number, number, number];
    rot: [number, number, number];
    dark?: boolean;
  }[] = [
    // Massive Rear Mountain Dome behind the tunnel
    { pos: [-1.85, 1.85, 0.0], scale: [1.55, 2.25, 2.45], rot: [0.1, 0.25, 0.15] },
    { pos: [-1.45, 3.25, -0.35], scale: [1.35, 1.45, 1.65], rot: [0.3, -0.4, 0.2] },
    { pos: [-0.45, 3.35, 0.25], scale: [1.45, 1.25, 1.85], rot: [-0.2, 0.5, -0.1] },
    // Upper Overhanging Brow Ledge over the cave arch
    { pos: [0.65, 2.95, 0.0], scale: [1.05, 0.82, 1.75], rot: [0.08, 0.15, -0.18] },
    // North (-Z) Flanking Quarry Cliff Wall & Buttresses
    { pos: [-0.35, 1.45, -1.85], scale: [1.55, 1.65, 1.1], rot: [0.2, 0.6, 0.1], dark: true },
    { pos: [0.95, 1.1, -1.68], scale: [1.15, 1.32, 0.95], rot: [-0.15, -0.3, 0.2] },
    { pos: [1.75, 0.62, -1.45], scale: [0.78, 0.72, 0.72], rot: [0.1, 0.4, -0.2], dark: true },
    // South (+Z) Flanking Quarry Cliff Wall & Buttresses
    { pos: [-0.3, 1.5, 1.85], scale: [1.58, 1.7, 1.1], rot: [-0.2, -0.5, 0.12], dark: true },
    { pos: [0.95, 1.15, 1.65], scale: [1.12, 1.35, 0.95], rot: [0.18, 0.35, -0.18] },
    { pos: [1.75, 0.64, 1.44], scale: [0.76, 0.74, 0.72], rot: [-0.1, -0.4, 0.2], dark: true },
  ];

  for (const c of mountainChunks) {
    const chunk = new THREE.Mesh(rockMassGeo, c.dark ? cliffDarkMat : cliffMat);
    chunk.position.set(c.pos[0], c.pos[1], c.pos[2]);
    chunk.scale.set(c.scale[0], c.scale[1], c.scale[2]);
    chunk.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
    enableShadows(chunk);
    caveGroup.add(chunk);
  }

  // Stepped Mossy / Foliage Crown Tufts Perched on Upper Mountain Ledges
  const crownTufts: [number, number, number, number][] = [
    [-1.4, 4.35, -0.45, 0.68],
    [-0.5, 4.18, 0.45, 0.62],
    [0.62, 3.58, -0.85, 0.5],
    [0.85, 2.25, 1.58, 0.55],
  ];
  const bushGeo = new THREE.IcosahedronGeometry(0.65, 0);
  for (const [bx, by, bz, bs] of crownTufts) {
    const bush = new THREE.Mesh(bushGeo, foliageMat);
    bush.position.set(bx, by, bz);
    bush.scale.set(bs * 1.25, bs * 0.75, bs * 1.1);
    enableShadows(bush);
    caveGroup.add(bush);
  }

  // Glowing Crystal Veins Protruding from the Cliff Face & Inside Tunnel Mouth
  const caveCrystalGeo = new THREE.ConeGeometry(0.14, 0.54, 5);
  const caveCrystals: [number, number, number, number, number][] = [
    [1.45, 1.85, -1.28, 0.35, -0.55],
    [1.35, 1.55, -1.42, 0.55, -0.35],
    [1.42, 1.95, 1.28, -0.38, -0.5],
    [1.3, 1.6, 1.42, -0.55, -0.35],
    [0.4, 3.48, 0.35, 0.25, -0.25],
    [-0.5, 1.75, -0.78, 0.45, 0.2],
    [-0.5, 1.75, 0.78, -0.45, 0.2],
  ];
  for (const [cx, cy, cz, rx, rz] of caveCrystals) {
    const shard = new THREE.Mesh(caveCrystalGeo, crystalMat);
    shard.position.set(cx, cy, cz);
    shard.rotation.set(rx, 0.3, rz);
    caveGroup.add(shard);
  }

  // Stone Archway Voussoirs Framing the Cave Entrance (at local x = 1.42 => world x = -9.98)
  const archStoneGeo = createTunnelArchBlockGeometry(0.46, 0.44, 0.42, 0.025);
  const archNodes: [number, number, number][] = [
    [1.45, 2.15, -0.78],
    [1.45, 2.38, -0.4],
    [1.45, 2.46, 0.0],
    [1.45, 2.38, 0.4],
    [1.45, 2.15, 0.78],
  ];
  archNodes.forEach(([ax, ay, az], idx) => {
    const stone = new THREE.Mesh(archStoneGeo, idx === 2 ? stoneTrimMat : cliffMat);
    stone.position.set(ax, ay, az);
    stone.rotation.x = (idx - 2) * 0.26;
    enableShadows(stone);
    caveGroup.add(stone);
  });

  // Heavy Timber & Iron Mine Portal Framing Gantry (local x = 1.55 .. 2.45 => world x = -9.85 .. -8.95)
  const postGeo = new THREE.BoxGeometry(0.24, 2.32, 0.24);
  const braceGeo = new THREE.BoxGeometry(0.16, 0.78, 0.16);
  for (const fx of [1.55, 2.35]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(fx, 1.16, sz * 0.94);

      const ironBoot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), ironMat);
      ironBoot.position.set(fx, 0.17, sz * 0.94);

      const kneeBrace = new THREE.Mesh(braceGeo, woodMat);
      kneeBrace.position.set(fx, 1.98, sz * 0.68);
      kneeBrace.rotation.x = sz * 0.68;

      enableShadows(post);
      enableShadows(ironBoot);
      enableShadows(kneeBrace);
      caveGroup.add(post, ironBoot, kneeBrace);
    }

    // Horizontal Cap Beam across portal
    const capBeam = new THREE.Mesh(
      createExtrudedChamferBox(0.32, 0.24, 2.28, 0.04, 0.018),
      woodMat
    );
    capBeam.position.set(fx, 2.24, 0);
    enableShadows(capBeam);
    caveGroup.add(capBeam);
  }

  // Longitudinal Stringers Linking Inner & Outer Timber Frames + Gabled Brow Roof
  for (const sz of [-0.94, 0.94]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.2), woodMat);
    stringer.position.set(1.95, 2.22, sz);
    enableShadows(stringer);
    caveGroup.add(stringer);
  }

  // Brass-Trimmed Quarry Mine Signboard Mounted Above Portal (local x = 2.48)
  const signPlaque = new THREE.Mesh(
    createExtrudedChamferBox(0.1, 0.44, 1.38, 0.05, 0.015),
    brassMat
  );
  signPlaque.position.set(2.48, 2.38, 0);
  const signFace = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.3, 1.18), ironMat);
  signFace.position.set(2.48, 2.38, 0);
  const signGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMat);
  signGem.position.set(2.55, 2.38, 0);
  enableShadows(signPlaque);
  caveGroup.add(signPlaque, signFace, signGem);

  // Hanging Wrought-Iron & Glowing Amber Lanterns Outside the Portal
  const lanternPivots: THREE.Group[] = [];
  for (const sz of [-1, 1]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.07), ironMat);
    bracket.position.set(2.52, 1.92, sz * 0.94);

    const lanternPivot = new THREE.Group();
    lanternPivot.position.set(2.64, 1.89, sz * 0.94);

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 5), ironMat);
    chain.position.y = -0.09;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.11, 6), ironMat);
    cap.position.y = -0.2;
    const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), lanternGlowMat);
    bulb.position.y = -0.32;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 6), ironMat);
    base.position.y = -0.43;

    enableShadows(bracket);
    lanternPivot.add(chain, cap, bulb, base);
    caveGroup.add(bracket, lanternPivot);
    lanternPivots.push(lanternPivot);
  }

  // =========================================================================
  // 2. CONTINUOUS PROCEDURAL STEEL RAILWAY (x -12.6 -> -4.82, z = 0.15)
  // =========================================================================
  const railGroup = new THREE.Group();
  railGroup.position.z = RAIL_Z;
  group.add(railGroup);

  // Section A: Upper Level Track Bed inside Cave & Courtyard (x -12.6 -> -7.15)
  const upperLen = SLOPE_START_X - -12.6; // 5.45m
  const upperCenterX = (-12.6 + SLOPE_START_X) * 0.5; // -9.875
  const upperBallast = new THREE.Mesh(
    createBallastBedGeometry(upperLen, 1.18, 0.96, 0.05),
    ballastMat
  );
  upperBallast.position.set(upperCenterX, 0, 0);
  upperBallast.receiveShadow = true;
  railGroup.add(upperBallast);

  // Section B: Inclined Stone/Trestle Chute Ramp bridging Trench (x -7.15 -> -5.78)
  const rampLen = Math.hypot(SLOPE_DX, SLOPE_DY);
  const rampCenterX = (SLOPE_START_X + SLOPE_END_X) * 0.5;
  const rampCenterY = (UPPER_Y + PIT_Y) * 0.5;
  const rampGroup = new THREE.Group();
  rampGroup.position.set(rampCenterX, rampCenterY, 0);
  rampGroup.rotation.z = SLOPE_ANGLE;

  const rampDeck = new THREE.Mesh(new THREE.BoxGeometry(rampLen + 0.14, 0.16, 1.12), stoneTrimMat);
  rampDeck.position.y = -0.055;
  enableShadows(rampDeck);
  const rampBallast = new THREE.Mesh(
    createBallastBedGeometry(rampLen + 0.12, 1.06, 0.92, 0.045),
    ballastMat
  );
  rampBallast.position.y = 0.02;
  rampBallast.receiveShadow = true;
  rampGroup.add(rampDeck, rampBallast);
  railGroup.add(rampGroup);

  // Grounded Trestle Support Piers Under the Sloped Ramp down to leftTrench (y = -0.67)
  const pierHeights: [number, number][] = [
    [-6.78, -0.18],
    [-6.25, -0.45],
  ];
  for (const [px, topY] of pierHeights) {
    const h = Math.max(0.1, topY - -0.68);
    for (const sz of [-0.36, 0.36]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), woodMat);
      pier.position.set(px, -0.68 + h * 0.5, sz);
      enableShadows(pier);
      railGroup.add(pier);
    }
  }

  // Section C: Inner Pit Unloading Spur on Quarry Pit Floor (x -5.78 -> -4.82, y = -0.68)
  const pitSpurLen = -4.82 - SLOPE_END_X; // 0.96m
  const pitSpurCenterX = (SLOPE_END_X + -4.82) * 0.5; // -5.30
  const pitBallast = new THREE.Mesh(
    createBallastBedGeometry(pitSpurLen + 0.1, 1.14, 0.94, 0.05),
    ballastMat
  );
  pitBallast.position.set(pitSpurCenterX, PIT_Y, 0);
  pitBallast.receiveShadow = true;
  railGroup.add(pitBallast);

  // Twin Continuous Shiny Steel Rails (Upper + Ramp + Lower Pit Spur)
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

  // Instanced Wooden Cross-Sleepers along the entire continuous railway (Single Draw Call)
  const sleeperXs: number[] = [];
  for (let x = -12.35; x <= -4.92; x += 0.32) {
    sleeperXs.push(x);
  }
  const sleeperGeo = new THREE.BoxGeometry(0.13, 0.045, 0.88);
  const sleeperInst = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperXs.length);
  sleeperInst.castShadow = true;
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

  // Heavy Steel & Timber End-of-Track Buffer Stop inside Pit Spur (x = -4.92, clears ore spawn [-4.55..4.55])
  const bufferGroup = new THREE.Group();
  bufferGroup.position.set(-4.92, PIT_Y, 0);
  for (const sz of [-RAIL_GAUGE_HALF, RAIL_GAUGE_HALF]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.1), ironMat);
    upright.position.set(0.06, 0.21, sz);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.09), ironMat);
    strut.position.set(-0.08, 0.19, sz);
    strut.rotation.z = -0.58;
    const springHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), brassMat);
    springHead.rotation.z = Math.PI / 2;
    springHead.position.set(-0.04, 0.25, sz);
    enableShadows(upright);
    enableShadows(strut);
    bufferGroup.add(upright, strut, springHead);
  }
  const crossTimber = new THREE.Mesh(
    createExtrudedChamferBox(0.16, 0.14, 0.86, 0.025, 0.012),
    woodMat
  );
  crossTimber.position.set(0.02, 0.2, 0);
  const bufferLamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), lanternGlowMat);
  bufferLamp.position.set(0.06, 0.48, 0);
  enableShadows(crossTimber);
  bufferGroup.add(crossTimber, bufferLamp);
  railGroup.add(bufferGroup);

  // =========================================================================
  // 3. DETAILED 2-CAR MINECART TRAIN WITH ARTICULATED COUPLER
  // =========================================================================
  const cartMaterials = {
    wood: woodMat,
    iron: ironMat,
    steel: steelMat,
    brass: brassMat,
    crystal: crystalMat,
    lanternGlow: lanternGlowMat,
    coal: coalMat,
  };
  const leadCart = createProceduralMinecart(true, cartMaterials);
  const trailerCart = createProceduralMinecart(false, cartMaterials);
  railGroup.add(leadCart.group, trailerCart.group);

  // Articulated Steel Tow Bar Linking Lead Cart & Trailer Cart
  const couplerBar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 6), ironMat);
  couplerBar.rotation.z = Math.PI / 2;
  enableShadows(couplerBar);
  railGroup.add(couplerBar);

  // Place carts cleanly on initial frame before update() ticks
  const CAR_SPACING = 1.24;
  let prevLeadX = -7.85;
  let wheelAngle = 0;

  const positionTrain = (leadX: number): void => {
    const trailerX = leadX - CAR_SPACING;
    const leadPose = sampleTrackPose(leadX);
    const trailerPose = sampleTrackPose(trailerX);

    leadCart.group.position.set(leadX, leadPose.y, 0);
    leadCart.group.rotation.z = leadPose.rotZ;

    trailerCart.group.position.set(trailerX, trailerPose.y, 0);
    trailerCart.group.rotation.z = trailerPose.rotZ;

    // Spin wheels proportionally to linear travel
    const deltaX = leadX - prevLeadX;
    prevLeadX = leadX;
    wheelAngle -= deltaX / 0.145;
    for (const w of leadCart.wheels) {
      w.rotation.z = wheelAngle;
    }
    for (const w of trailerCart.wheels) {
      w.rotation.z = wheelAngle;
    }

    // Position & align articulated coupler bar between rear of lead cart and front of trailer
    const midX = (leadX + trailerX) * 0.5;
    const midY = (leadPose.y + trailerPose.y) * 0.5 + 0.23;
    const linkDy = leadPose.y - trailerPose.y;
    const linkDx = leadX - trailerX;
    const barPitch = Math.atan2(linkDy, linkDx);
    couplerBar.position.set(midX, midY, 0);
    couplerBar.rotation.set(0, 0, Math.PI / 2 + barPitch);
    couplerBar.scale.set(1, Math.max(0.4, Math.hypot(linkDx, linkDy) - 0.85), 1);
  };

  positionTrain(-7.85);

  const setPalette = (
    crystalColor: number | string,
    cliffColor: number | string,
    foliageColor: number | string
  ): void => {
    crystalMat.color.set(crystalColor);
    crystalMat.emissive.set(crystalColor);
    cliffMat.color.set(cliffColor);
    cliffDarkMat.color.set(cliffColor).multiplyScalar(0.55);
    foliageMat.color.set(foliageColor);
  };

  let shuttleClock = 3.2;

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    shuttleClock += safeDt;

    // Smooth shuttle cycle (~14s): emerges from cave (-10.65) down to pit unloading spur (-5.65), pauses, returns
    const cycleSec = 14.0;
    const u = (shuttleClock % cycleSec) / cycleSec;
    let shuttleT: number;
    if (u < 0.36) {
      // Smooth ease-in-out roll down toward pit
      const p = u / 0.36;
      shuttleT = 0.5 - 0.5 * Math.cos(Math.PI * p);
    } else if (u < 0.54) {
      // Pause at pit unloading spur while crystals glow
      shuttleT = 1;
    } else if (u < 0.88) {
      // Haul back up ramp into cave tunnel
      const p = (u - 0.54) / 0.34;
      shuttleT = 0.5 + 0.5 * Math.cos(Math.PI * p);
    } else {
      // Brief load pause inside cave
      shuttleT = 0;
    }

    const leadX = -10.65 + shuttleT * (-5.65 - -10.65);
    positionTrain(leadX);

    // Gentle sway on portal hanging lanterns & crystal pulse
    lanternPivots.forEach((lp, idx) => {
      lp.rotation.z = Math.sin(elapsed * 2.1 + idx * 1.4) * 0.08;
      lp.rotation.x = Math.cos(elapsed * 1.7 + idx) * 0.05;
    });

    const pulse = Math.sin(elapsed * 2.6) * 0.14;
    crystalMat.emissiveIntensity = 0.82 + pulse + (shuttleT > 0.95 ? 0.25 : 0);
    lanternGlowMat.emissiveIntensity = 1.45 + Math.sin(elapsed * 4.5) * 0.18;
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
