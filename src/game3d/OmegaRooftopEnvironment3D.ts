import * as THREE from 'three';
import { createChamferSlabGeometry, disposeObject3D, enableShadows } from './MeshHelpers3D';
import {
  buildRooftopBillboard,
  buildRooftopBulkhead,
  buildRooftopHvacUnit,
  buildRooftopSpotlightTower,
  createCityMistTexture,
  createOmegaSunsetSkyTexture,
  createRooftopHelipadTexture,
  normalizeHorizontalSlabUVs,
  type RooftopAssetsCtx,
} from './OmegaRooftopAssets3D';
import { createCrackedGlassTexture, createShatteredGlassShardGeometry } from './TowerCityAssets3D';

export interface OmegaRooftopEnvironmentHandle {
  group: THREE.Group;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface RooftopBeaconRef {
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
}

interface RooftopBuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  height: number;
  ruined: boolean;
  hasHvac: boolean;
  hasPenthouseTier: boolean;
  antenna: boolean;
  cols: number;
  rows: number;
}

interface WinTransform {
  pos: THREE.Vector3;
  rotY: number;
  w: number;
  h: number;
}

const BUILDING_CHAMFER = 0.36;
const BUILDING_BEVEL = 0.04;

function appendBuildingFaceWindows(
  b: RooftopBuildingSpec,
  faceIdx: 0 | 1 | 2 | 3,
  seedOffset: number,
  buckets: {
    frames: WinTransform[];
    litWarm: WinTransform[];
    litCool: WinTransform[];
    reflective: WinTransform[];
    broken: WinTransform[];
  }
): void {
  const isFrontBack = faceIdx === 0 || faceIdx === 2;
  const faceW = isFrontBack ? b.w : b.d;
  const halfDepth = (isFrontBack ? b.d : b.w) * 0.5;
  const rotY = faceIdx === 0 ? 0 : faceIdx === 1 ? Math.PI / 2 : faceIdx === 2 ? Math.PI : -Math.PI / 2;
  // Stay well clear of chamfered corners & bevel edges
  const usableW = Math.max(1.2, faceW - BUILDING_CHAMFER * 2 - 0.65);
  const bayW = usableW / Math.max(1, b.cols);
  const winW = bayW * 0.68;
  const topFloorY = b.topY - 1.55;
  const stepY = 2.05;
  const winH = 1.02;

  // Offset strictly proud of outer bevel wall (halfDepth + BUILDING_BEVEL) to eliminate z-fighting
  const frameOut = halfDepth + BUILDING_BEVEL + 0.035;
  const glassOut = halfDepth + BUILDING_BEVEL + 0.055;

  for (let r = 0; r < b.rows; r++) {
    const wy = topFloorY - r * stepY;
    if (wy < b.topY - b.height + 1.8) break;
    for (let col = 0; col < b.cols; col++) {
      const lx = -usableW * 0.5 + (col + 0.5) * bayW;
      const hash = (r * 31 + col * 17 + faceIdx * 13 + seedOffset * 7) % 10;

      const fx = b.x + (faceIdx === 0 ? lx : faceIdx === 2 ? -lx : faceIdx === 1 ? frameOut : -frameOut);
      const fz = b.z + (faceIdx === 0 ? frameOut : faceIdx === 2 ? -frameOut : faceIdx === 1 ? -lx : lx);
      buckets.frames.push({ pos: new THREE.Vector3(fx, wy, fz), rotY, w: winW + 0.14, h: winH + 0.14 });

      const gx = b.x + (faceIdx === 0 ? lx : faceIdx === 2 ? -lx : faceIdx === 1 ? glassOut : -glassOut);
      const gz = b.z + (faceIdx === 0 ? glassOut : faceIdx === 2 ? -glassOut : faceIdx === 1 ? -lx : lx);
      const gTr: WinTransform = { pos: new THREE.Vector3(gx, wy, gz), rotY, w: winW, h: winH };

      if (b.ruined && r <= 1 && hash < 4) buckets.broken.push(gTr);
      else if (hash <= 3) buckets.litWarm.push(gTr);
      else if (hash <= 5) buckets.litCool.push(gTr);
      else buckets.reflective.push(gTr);
    }
  }
}

/**
 * Builds the "Crimson-Gold Sunset Skyscraper Rooftop" 3D environment for Omega Boss battles.
 * Keeps gameplay surface at y = 0.0 and leaves the front camera arc unobstructed.
 */
export function createOmegaRooftopEnvironment(): OmegaRooftopEnvironmentHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const beacons: RooftopBeaconRef[] = [];
  const fanBlades: THREE.Object3D[] = [];

  // 1. Bright Crimson-Gold Sunset Sky Dome
  const skyTex = createOmegaSunsetSkyTexture();
  if (skyTex) ownedTextures.push(skyTex);
  const skyGeo = new THREE.SphereGeometry(108, 32, 20);
  const skyMat = new THREE.MeshBasicMaterial({
    ...(skyTex ? { map: skyTex } : {}),
    color: skyTex ? 0xffffff : 0xfb923c,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.rotation.y = Math.PI; // place setting sun behind central boss vista (-Z)
  ownedGeos.push(skyGeo);
  ownedMats.push(skyMat);
  group.add(skyDome);

  // Shared Architectural Materials
  const helipadTex = createRooftopHelipadTexture();
  if (helipadTex) ownedTextures.push(helipadTex);
  const rooftopDeckMat = new THREE.MeshStandardMaterial({
    color: helipadTex ? 0xffffff : 0x64748b,
    ...(helipadTex ? { map: helipadTex } : {}),
    roughness: 0.78,
    metalness: 0.12,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.84,
    metalness: 0.1,
    flatShading: true,
  });
  const concreteLightMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.78,
    metalness: 0.14,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.36,
    metalness: 0.78,
    flatShading: true,
  });
  const towerBodyMat = new THREE.MeshStandardMaterial({
    color: 0x526078,
    roughness: 0.62,
    metalness: 0.32,
    flatShading: true,
  });
  const towerBodyAltMat = new THREE.MeshStandardMaterial({
    color: 0x6b7a94,
    roughness: 0.66,
    metalness: 0.28,
    flatShading: true,
  });
  const rebarMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.54,
    metalness: 0.74,
    flatShading: true,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.78,
    roughness: 0.28,
    metalness: 0.7,
    flatShading: true,
  });
  ownedMats.push(
    rooftopDeckMat,
    concreteMat,
    concreteLightMat,
    steelMat,
    towerBodyMat,
    towerBodyAltMat,
    rebarMat,
    goldAccentMat
  );

  const assetsCtx: RooftopAssetsCtx = {
    ownedTextures,
    ownedGeos,
    ownedMats,
    concreteMat,
    concreteLightMat,
    steelMat,
    goldAccentMat,
  };

  // 2. Hero Megacorp Skyscraper Under Arena (Helipad surface strictly y = 0.0)
  const deckW = 22.4;
  const deckD = 18.4;
  const deckH = 0.44;
  const heroDeckGeo = createChamferSlabGeometry(deckW, deckH, deckD, 2.2, 0.05);
  normalizeHorizontalSlabUVs(heroDeckGeo, deckW, deckD, 0, 0);
  const heroDeck = new THREE.Mesh(heroDeckGeo, rooftopDeckMat);
  heroDeck.position.set(0, -deckH, -0.2);
  enableShadows(heroDeck);

  // Clean non-overlapping perimeter cornice & gold band strictly below heroDeck (-0.44)
  const crownTrimGeo = createChamferSlabGeometry(22.9, 0.24, 18.9, 2.25, 0.03);
  const crownTrim = new THREE.Mesh(crownTrimGeo, steelMat);
  crownTrim.position.set(0, -0.68, -0.2);
  enableShadows(crownTrim);

  const crownNeonGeo = createChamferSlabGeometry(23.1, 0.1, 19.1, 2.3, 0.015);
  const crownNeon = new THREE.Mesh(crownNeonGeo, goldAccentMat);
  crownNeon.position.set(0, -0.61, -0.2);

  // Main skyscraper tower shaft dropping 38m cleanly from y = -0.68 down to y = -38.68
  const shaftGeo = createChamferSlabGeometry(20.4, 38.0, 16.4, BUILDING_CHAMFER, BUILDING_BEVEL);
  const heroShaft = new THREE.Mesh(shaftGeo, towerBodyMat);
  heroShaft.position.set(0, -38.68, -0.2);
  heroShaft.receiveShadow = true;
  ownedGeos.push(heroDeckGeo, crownTrimGeo, crownNeonGeo, shaftGeo);
  group.add(heroDeck, crownTrim, crownNeon, heroShaft);

  // 4 Structural steel corner piers strictly below crownTrim (y = -38.5..-0.70)
  const pierGeo = createChamferSlabGeometry(1.15, 37.8, 1.15, 0.18, 0.02);
  ownedGeos.push(pierGeo);
  for (const [px, pz] of [
    [-9.8, -8.0],
    [9.8, -8.0],
    [-9.8, 7.6],
    [9.8, 7.6],
  ]) {
    const pier = new THREE.Mesh(pierGeo, steelMat);
    pier.position.set(px, -38.5, pz);
    group.add(pier);
  }

  // Battle-damaged concrete rooftop parapets + safety glass/steel railings grounded cleanly at y = 0.0
  const sideParapetGeo = createChamferSlabGeometry(0.46, 0.58, 5.1, 0.08, 0.02);
  const sideCapGeo = createChamferSlabGeometry(0.56, 0.1, 5.2, 0.08, 0.015);
  const railPostGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.55, 6);
  const sideRailBarGeo = new THREE.BoxGeometry(0.05, 0.05, 5.0);
  const glassRailGeo = new THREE.BoxGeometry(0.03, 0.42, 4.7);
  const rearParapetGeo = createChamferSlabGeometry(5.8, 0.58, 0.46, 0.08, 0.02);
  const rearCapGeo = createChamferSlabGeometry(5.9, 0.1, 0.56, 0.08, 0.015);
  const rearRailBarGeo = new THREE.BoxGeometry(5.6, 0.05, 0.05);
  const rebarRodGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.7, 5);
  const rubbleGeo = createChamferSlabGeometry(0.52, 0.22, 0.44, 0.14, 0.02);
  const conduitRunGeo = new THREE.CylinderGeometry(0.045, 0.045, 11.4, 6);
  const puckBaseGeo = createChamferSlabGeometry(0.32, 0.05, 0.32, 0.08, 0.01);
  const puckLensGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.03, 8);
  const railGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.45,
    roughness: 0.15,
    metalness: 0.6,
  });
  const runwayPuckMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  ownedMats.push(railGlassMat, runwayPuckMat);
  ownedGeos.push(
    sideParapetGeo,
    sideCapGeo,
    railPostGeo,
    sideRailBarGeo,
    glassRailGeo,
    rearParapetGeo,
    rearCapGeo,
    rearRailBarGeo,
    rebarRodGeo,
    rubbleGeo,
    conduitRunGeo,
    puckBaseGeo,
    puckLensGeo
  );

  for (const sx of [-1, 1]) {
    for (const pz of [-5.4, 2.9]) {
      const wall = new THREE.Mesh(sideParapetGeo, concreteMat);
      wall.position.set(sx * 10.45, 0, pz);
      const cap = new THREE.Mesh(sideCapGeo, concreteLightMat);
      cap.position.set(sx * 10.45, 0.58, pz);
      const glassPanel = new THREE.Mesh(glassRailGeo, railGlassMat);
      glassPanel.position.set(sx * 10.45, 0.9, pz);
      const topRail = new THREE.Mesh(sideRailBarGeo, steelMat);
      topRail.position.set(sx * 10.45, 1.18, pz);
      enableShadows(wall);
      enableShadows(cap);
      group.add(wall, cap, glassPanel, topRail);
      for (const rz of [-2.2, 0, 2.2]) {
        const post = new THREE.Mesh(railPostGeo, steelMat);
        post.position.set(sx * 10.45, 0.95, pz + rz);
        group.add(post);
      }
    }
    // Exposed bent rebar + concrete rubble chunks in broken side gap (z = -1.25)
    for (let r = 0; r < 3; r++) {
      const rod = new THREE.Mesh(rebarRodGeo, rebarMat);
      rod.position.set(sx * 10.45, 0.34, -2.0 + r * 0.72);
      rod.rotation.z = sx * (0.28 + r * 0.11);
      rod.rotation.x = (r - 1) * 0.2;
      group.add(rod);
    }
    const rubble = new THREE.Mesh(rubbleGeo, concreteLightMat);
    rubble.position.set(sx * 9.85, 0, -1.4);
    rubble.rotation.y = sx * 0.42;
    enableShadows(rubble);
    group.add(rubble);

    // Rooftop utility pipe conduit linking Bulkhead -> HVAC -> Backdrop
    const pipeRun = new THREE.Mesh(conduitRunGeo, steelMat);
    pipeRun.rotation.x = Math.PI / 2;
    pipeRun.position.set(sx * 9.85, 0.06, -1.4);
    group.add(pipeRun);

    // 4 Low-Profile Helipad Runway Approach Light Pucks flanking the central Boss approach
    for (const pz of [-4.2, -2.0, 0.2]) {
      const puckBase = new THREE.Mesh(puckBaseGeo, steelMat);
      puckBase.position.set(sx * 4.55, 0, pz);
      const puckLens = new THREE.Mesh(puckLensGeo, runwayPuckMat);
      puckLens.position.set(sx * 4.55, 0.06, pz);
      group.add(puckBase, puckLens);
    }
  }
  for (const rx of [-6.5, 6.5]) {
    const rearWall = new THREE.Mesh(rearParapetGeo, concreteMat);
    rearWall.position.set(rx, 0, -8.85);
    const rearCap = new THREE.Mesh(rearCapGeo, concreteLightMat);
    rearCap.position.set(rx, 0.58, -8.85);
    const rearBar = new THREE.Mesh(rearRailBarGeo, steelMat);
    rearBar.position.set(rx, 1.18, -8.85);
    for (const px of [-2.4, 0, 2.4]) {
      const post = new THREE.Mesh(railPostGeo, steelMat);
      post.position.set(rx + px, 0.95, -8.85);
      group.add(post);
    }
    enableShadows(rearWall);
    enableShadows(rearCap);
    group.add(rearWall, rearCap, rearBar);
  }

  // Sculpted Rooftop Props & Decorations (cleanly spaced with zero overlap against Command Backdrop)
  const mastGeo = new THREE.CylinderGeometry(0.055, 0.13, 4.5, 6);
  const crossArmGeo = new THREE.BoxGeometry(1.1, 0.08, 0.08);
  const beaconGeo = new THREE.OctahedronGeometry(0.18, 0);
  ownedGeos.push(mastGeo, crossArmGeo, beaconGeo);

  for (const sx of [-1, 1]) {
    // 1. HVAC Chiller Array (z = -4.6)
    const hvac = buildRooftopHvacUnit(assetsCtx);
    hvac.group.position.set(sx * 8.65, 0, -4.6);
    hvac.group.rotation.y = -sx * Math.PI * 0.5;
    fanBlades.push(hvac.blade);
    group.add(hvac.group);

    // 2. Penthouse Stairwell Bulkhead (clear of side parapets and outer player podiums)
    const bulkhead = buildRooftopBulkhead(assetsCtx);
    bulkhead.position.set(sx * 9.05, 0, 6.75);
    bulkhead.rotation.y = -sx * Math.PI * 0.5;
    group.add(bulkhead);

    // 3. Rooftop Floodlight Tower (z = -7.2) aimed toward Boss Dais
    const spotTower = buildRooftopSpotlightTower(assetsCtx);
    spotTower.position.set(sx * 8.85, 0, -7.2);
    spotTower.rotation.y = -sx * 0.62;
    group.add(spotTower);

    // 4. Elevated Megacorp Cyber Billboard on flanks (x = +-8.75, z = -0.8) — 100% clear of Backdrop & Parapet
    const billboard = buildRooftopBillboard(assetsCtx, sx < 0 ? 'crimson' : 'cyan');
    billboard.position.set(sx * 8.75, 0, -0.8);
    billboard.rotation.y = -sx * 0.58;
    group.add(billboard);

    // 5. Corner Comms Spire + Crossbar + Blinking Aviation Beacon
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.set(sx * 9.95, 2.25, -8.3);
    const arm = new THREE.Mesh(crossArmGeo, concreteLightMat);
    arm.position.set(sx * 9.95, 3.65, -8.3);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: sx < 0 ? 0xf43f5e : 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(sx * 9.95, 4.58, -8.3);
    ownedMats.push(beaconMat);
    beacons.push({ mat: beaconMat, phase: sx > 0 ? 1.5 : 0, speed: 3.4 });
    group.add(mast, arm, beacon);
  }

  // 3. Surrounding 20 Multi-Tier Sunset Cyber-City Skyscrapers
  const skylineBuildings: RooftopBuildingSpec[] = [
    // Hero tower shaft windows (i === 0)
    { x: 0, z: -0.2, w: 20.4, d: 16.4, topY: -0.68, height: 38.0, ruined: false, hasHvac: false, hasPenthouseTier: false, antenna: false, cols: 8, rows: 14 },
    // Left skyline towers
    { x: -17.2, z: 3.6, w: 6.4, d: 6.2, topY: -3.0, height: 28, ruined: true, hasHvac: true, hasPenthouseTier: false, antenna: false, cols: 3, rows: 10 },
    { x: -17.8, z: -6.5, w: 7.0, d: 6.8, topY: 1.8, height: 32, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 12 },
    { x: -17.4, z: -17.8, w: 7.4, d: 7.0, topY: 4.4, height: 36, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 4, rows: 13 },
    { x: -18.8, z: -29.2, w: 8.0, d: 7.6, topY: 2.2, height: 34, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 12 },
    { x: -26.8, z: -2.0, w: 7.6, d: 7.4, topY: -0.8, height: 32, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 11 },
    { x: -27.4, z: -15.2, w: 8.2, d: 8.0, topY: 6.6, height: 38, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 4, rows: 14 },
    { x: -27.8, z: -28.4, w: 8.4, d: 8.0, topY: 3.5, height: 35, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: false, cols: 4, rows: 12 },

    // Right skyline towers
    { x: 17.2, z: 3.6, w: 6.4, d: 6.2, topY: -2.2, height: 28, ruined: false, hasHvac: true, hasPenthouseTier: false, antenna: false, cols: 3, rows: 10 },
    { x: 17.8, z: -6.5, w: 7.0, d: 6.8, topY: 2.4, height: 32, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 4, rows: 12 },
    { x: 17.4, z: -17.8, w: 7.4, d: 7.0, topY: 5.0, height: 36, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 13 },
    { x: 18.8, z: -29.2, w: 8.0, d: 7.6, topY: 1.8, height: 34, ruined: true, hasHvac: true, hasPenthouseTier: false, antenna: true, cols: 4, rows: 12 },
    { x: 26.8, z: -2.0, w: 7.6, d: 7.4, topY: -1.4, height: 32, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 4, rows: 11 },
    { x: 27.4, z: -15.2, w: 8.2, d: 8.0, topY: 7.2, height: 38, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 14 },
    { x: 27.8, z: -28.4, w: 8.4, d: 8.0, topY: 4.1, height: 35, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: false, cols: 4, rows: 12 },

    // Rear skyline towers (central corridor stays lower so setting sun & Boss silhouette shine)
    { x: -11.8, z: -24.8, w: 6.6, d: 6.4, topY: -1.5, height: 30, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 3, rows: 11 },
    { x: 11.8, z: -24.8, w: 6.6, d: 6.4, topY: -1.0, height: 30, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 3, rows: 11 },
    { x: -13.0, z: -38.4, w: 7.4, d: 7.2, topY: 4.8, height: 36, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: true, cols: 4, rows: 13 },
    { x: 13.0, z: -38.4, w: 7.4, d: 7.2, topY: 5.4, height: 36, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: true, cols: 4, rows: 13 },
    { x: -4.4, z: -42.5, w: 6.0, d: 5.8, topY: -2.6, height: 28, ruined: true, hasHvac: false, hasPenthouseTier: false, antenna: false, cols: 3, rows: 10 },
    { x: 4.4, z: -42.5, w: 6.0, d: 5.8, topY: -2.2, height: 28, ruined: false, hasHvac: true, hasPenthouseTier: true, antenna: false, cols: 3, rows: 10 },
  ];

  const buckets = {
    frames: [] as WinTransform[],
    litWarm: [] as WinTransform[],
    litCool: [] as WinTransform[],
    reflective: [] as WinTransform[],
    broken: [] as WinTransform[],
  };

  const smallHvacGeo = createChamferSlabGeometry(1.65, 0.85, 1.3, 0.12, 0.02);
  ownedGeos.push(smallHvacGeo);

  for (let i = 0; i < skylineBuildings.length; i++) {
    const b = skylineBuildings[i];
    if (i > 0) {
      const bGeo = createChamferSlabGeometry(b.w, b.height, b.d, BUILDING_CHAMFER, BUILDING_BEVEL);
      const bMesh = new THREE.Mesh(bGeo, i % 2 === 0 ? towerBodyMat : towerBodyAltMat);
      bMesh.position.set(b.x, b.topY - b.height * 0.5, b.z);
      ownedGeos.push(bGeo);
      group.add(bMesh);

      if (b.ruined) {
        const capGeo = createChamferSlabGeometry(b.w * 0.62, 1.05, b.d * 0.62, 0.22, 0.03);
        const cap = new THREE.Mesh(capGeo, concreteMat);
        cap.position.set(b.x - b.w * 0.1, b.topY, b.z - b.d * 0.08);
        cap.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06;
        ownedGeos.push(capGeo);
        group.add(cap);
      } else {
        const rimGeo = createChamferSlabGeometry(b.w + 0.36, 0.3, b.d + 0.36, 0.36, 0.02);
        const rim = new THREE.Mesh(rimGeo, concreteLightMat);
        rim.position.set(b.x, b.topY, b.z);
        ownedGeos.push(rimGeo);
        group.add(rim);

        if (b.hasPenthouseTier) {
          const tierGeo = createChamferSlabGeometry(b.w * 0.62, 1.65, b.d * 0.62, 0.25, 0.025);
          const tier = new THREE.Mesh(tierGeo, steelMat);
          tier.position.set(b.x, b.topY + 0.3, b.z);
          ownedGeos.push(tierGeo);
          group.add(tier);
        }
      }

      const roofBaseY = b.hasPenthouseTier && !b.ruined ? b.topY + 1.95 : b.topY + 0.3;
      if (b.hasHvac && !b.ruined) {
        const hMesh = new THREE.Mesh(smallHvacGeo, concreteLightMat);
        hMesh.position.set(b.x + 0.55, roofBaseY, b.z + 0.45);
        group.add(hMesh);
      }
      if (b.antenna) {
        const aMast = new THREE.Mesh(mastGeo, steelMat);
        aMast.position.set(b.x - b.w * 0.18, roofBaseY + 2.25, b.z - b.d * 0.18);
        const bMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: i % 2 === 0 ? 0xfb7185 : 0xfacc15,
          emissiveIntensity: 1.6,
          roughness: 0.2,
        });
        const bTip = new THREE.Mesh(beaconGeo, bMat);
        bTip.position.set(b.x - b.w * 0.18, roofBaseY + 4.58, b.z - b.d * 0.18);
        ownedMats.push(bMat);
        beacons.push({ mat: bMat, phase: i * 0.7, speed: 2.6 + (i % 3) * 0.5 });
        group.add(aMast, bTip);
      }
    }

    appendBuildingFaceWindows(b, 0, i, buckets);
    appendBuildingFaceWindows(b, 1, i, buckets);
    appendBuildingFaceWindows(b, 3, i, buckets);
  }

  const unitWinGeo = new THREE.PlaneGeometry(1, 1);
  const shardGeo = createShatteredGlassShardGeometry();
  const crackedTex = createCrackedGlassTexture();
  if (crackedTex) ownedTextures.push(crackedTex);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.5,
  });
  const litWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.25,
  });
  const litCoolMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const reflectMat = new THREE.MeshStandardMaterial({
    color: 0xfda4af,
    emissive: 0xfb7185,
    emissiveIntensity: 0.26,
    roughness: 0.18,
    metalness: 0.72,
    ...(crackedTex ? { map: crackedTex } : {}),
  });
  const brokenVoidMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
  });
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xfecdd3,
    roughness: 0.16,
    metalness: 0.78,
    side: THREE.DoubleSide,
  });
  ownedGeos.push(unitWinGeo, shardGeo);
  ownedMats.push(frameMat, litWarmMat, litCoolMat, reflectMat, brokenVoidMat, shardMat);

  const buildWindowInstances = (
    list: WinTransform[],
    geo: THREE.BufferGeometry,
    mat: THREE.Material
  ): void => {
    if (list.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      dummy.position.copy(t.pos);
      dummy.rotation.set(0, t.rotY, 0);
      dummy.scale.set(t.w, t.h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  };

  buildWindowInstances(buckets.frames, unitWinGeo, frameMat);
  buildWindowInstances(buckets.litWarm, unitWinGeo, litWarmMat);
  buildWindowInstances(buckets.litCool, unitWinGeo, litCoolMat);
  buildWindowInstances(buckets.reflective, unitWinGeo, reflectMat);
  buildWindowInstances(buckets.broken, unitWinGeo, brokenVoidMat);
  buildWindowInstances(buckets.broken, shardGeo, shardMat);

  // 4. Two-Tier Golden-Hour City Mist (smooth canyon height depth)
  const mistTex = createCityMistTexture();
  if (mistTex) ownedTextures.push(mistTex);
  const mistGeo = new THREE.PlaneGeometry(210, 210);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xfed7aa,
    ...(mistTex ? { map: mistTex } : {}),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  ownedGeos.push(mistGeo);
  ownedMats.push(mistMat);
  for (const mistY of [-15, -26]) {
    const mistPlane = new THREE.Mesh(mistGeo, mistMat);
    mistPlane.rotation.x = -Math.PI / 2;
    mistPlane.position.set(0, mistY, -14);
    group.add(mistPlane);
  }

  return {
    group,
    update(dtSec: number, elapsed: number) {
      const safeDt = Math.min(Math.max(0, dtSec), 0.1);
      for (const blade of fanBlades) {
        blade.rotation.y += safeDt * 7.5;
      }
      for (const b of beacons) {
        const pulse = Math.max(0, Math.sin(elapsed * b.speed + b.phase));
        b.mat.emissiveIntensity = 0.4 + pulse * 2.0;
      }
    },
    dispose() {
      for (const t of ownedTextures) t.dispose();
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      disposeObject3D(group);
    },
  };
}
