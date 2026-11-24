import * as THREE from 'three';
import { createChamferSlabGeometry, disposeObject3D, enableShadows } from './MeshHelpers3D';
import {
  buildRooftopHvacUnit,
  buildRooftopSpotlightTower,
  createCityMistTexture,
  normalizeHorizontalSlabUVs,
  type RooftopAssetsCtx,
} from './OmegaRooftopAssets3D';
import { paintCachedTexture } from './ProceduralTextures3D';

const CAVERN_FLOOR_Y = -34.0;
const BUILDING_CHAMFER = 0.36;
const BUILDING_BEVEL = 0.04;
const MONORAIL_TRAIN_COUNT = 10;

interface SubBuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  height: number;
  hasPenthouse: boolean;
  hasHvac: boolean;
  hasAntenna: boolean;
  billboardVariant?: 'cyan' | 'crimson';
  cols: number;
  rows: number;
}

interface WinTransform {
  pos: THREE.Vector3;
  rotY: number;
  w: number;
  h: number;
}

interface MonorailTrainLane {
  x: number;
  y: number;
  zStart: number;
  zSpan: number;
  phase: number;
  speed: number;
  dir: 1 | -1;
}

interface BeaconRef {
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
}

export interface RiftEmberSeed {
  baseX: number;
  baseZ: number;
  phase: number;
  speed: number;
  radius: number;
}

export interface RiftCityEnvironmentHandle {
  group: THREE.Group;
  setAccentPalette: (primaryHex: string, secondaryHex: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

function getRiftCavernVaultTexture(): THREE.Texture {
  return paintCachedTexture('rift-cavern-vault-v2', 1024, 512, 1, 3, [8, 10, 24, 255], (ctx) => {
    const W = 1024;
    const H = 512;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, '#04050d');
    grad.addColorStop(0.32, '#0a0d1f');
    grad.addColorStop(0.62, '#131936');
    grad.addColorStop(0.84, '#1b1d45');
    grad.addColorStop(1.0, '#080b18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle stratified subterranean vault horizon glow behind rear canyon
    const canyonGlow = ctx.createRadialGradient(W * 0.5, H * 0.58, 16, W * 0.5, H * 0.58, 290);
    canyonGlow.addColorStop(0.0, 'rgba(34, 211, 238, 0.24)');
    canyonGlow.addColorStop(0.45, 'rgba(99, 102, 241, 0.16)');
    canyonGlow.addColorStop(1.0, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = canyonGlow;
    ctx.fillRect(W * 0.1, H * 0.2, W * 0.8, H * 0.72);

    // Clean distant underground skyline silhouette spires along the horizon band
    ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
    for (let x = 0; x < W; x += 28) {
      const h = 28 + ((x * 23) % 62);
      ctx.fillRect(x, 370 - h, 22, h + 142);
    }

    // Fine ceiling rock strata contour arcs
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 2;
    for (let y = 36; y < 230; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 64; x <= W; x += 64) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * 6);
      }
      ctx.stroke();
    }
  });
}

function createRiftSubwayDeckTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Architectural subterranean steel-slate deck
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  bgGrad.addColorStop(0.0, '#1e2638');
  bgGrad.addColorStop(0.5, '#283248');
  bgGrad.addColorStop(1.0, '#1b2233');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle composite slab grid seams
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.11)';
  ctx.lineWidth = 3;
  for (let i = 128; i < 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Side recessed service walkway strips
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(48, 48, 118, 928);
  ctx.fillRect(858, 48, 118, 928);

  // Crisp cyan perimeter technical border frame (zero circular shapes)
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.62)';
  ctx.lineWidth = 8;
  ctx.strokeRect(34, 34, 956, 956);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 48, 928, 928);

  // Diagonal safety chevrons along side transit lanes
  ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
  for (let y = 96; y < 900; y += 72) {
    ctx.fillRect(62, y, 22, 10);
    ctx.fillRect(940, y, 22, 10);
  }

  // Forward runway guide rails toward Boss Command Plinth (z toward top of texture)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.fillRect(360, 160, 10, 680);
  ctx.fillRect(654, 160, 10, 680);

  // Tactical corner brackets
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 6;
  for (const [cx, cy, dx, dy] of [
    [68, 68, 56, 56],
    [956, 68, -56, 56],
    [68, 956, 56, -56],
    [956, 956, -56, -56],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRiftEmberTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.42, 'rgba(103, 232, 249, 0.8)');
  g.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function appendBuildingFaceWindows(
  b: SubBuildingSpec,
  faceIdx: 0 | 1 | 2 | 3,
  seedOffset: number,
  buckets: {
    frames: WinTransform[];
    litCyan: WinTransform[];
    litWarm: WinTransform[];
    reflective: WinTransform[];
  }
): void {
  const isFrontBack = faceIdx === 0 || faceIdx === 2;
  const faceW = isFrontBack ? b.w : b.d;
  const halfDepth = (isFrontBack ? b.d : b.w) * 0.5;
  const rotY = faceIdx === 0 ? 0 : faceIdx === 1 ? Math.PI / 2 : faceIdx === 2 ? Math.PI : -Math.PI / 2;
  const usableW = Math.max(1.2, faceW - BUILDING_CHAMFER * 2 - 0.65);
  const bayW = usableW / Math.max(1, b.cols);
  const winW = bayW * 0.66;
  const topFloorY = b.topY - 1.55;
  const stepY = 2.05;
  const winH = 1.02;

  const frameOut = halfDepth + BUILDING_BEVEL + 0.035;
  const glassOut = halfDepth + BUILDING_BEVEL + 0.055;

  for (let r = 0; r < b.rows; r++) {
    const wy = topFloorY - r * stepY;
    if (wy < b.topY - b.height + 1.8) break;
    for (let col = 0; col < b.cols; col++) {
      const lx = -usableW * 0.5 + (col + 0.5) * bayW;
      const hash = (r * 29 + col * 17 + faceIdx * 13 + seedOffset * 7) % 10;

      const fx = b.x + (faceIdx === 0 ? lx : faceIdx === 2 ? -lx : faceIdx === 1 ? frameOut : -frameOut);
      const fz = b.z + (faceIdx === 0 ? frameOut : faceIdx === 2 ? -frameOut : faceIdx === 1 ? -lx : lx);
      buckets.frames.push({ pos: new THREE.Vector3(fx, wy, fz), rotY, w: winW + 0.14, h: winH + 0.14 });

      const gx = b.x + (faceIdx === 0 ? lx : faceIdx === 2 ? -lx : faceIdx === 1 ? glassOut : -glassOut);
      const gz = b.z + (faceIdx === 0 ? glassOut : faceIdx === 2 ? -glassOut : faceIdx === 1 ? -lx : lx);
      const gTr: WinTransform = { pos: new THREE.Vector3(gx, wy, gz), rotY, w: winW, h: winH };

      if (hash <= 2) buckets.litCyan.push(gTr);
      else if (hash <= 4) buckets.litWarm.push(gTr);
      else buckets.reflective.push(gTr);
    }
  }
}

/**
 * Builds the clean, grid-aligned Subterranean Cyber-Metro Canyon surrounding the Rift Arena:
 * dark underground vault sky, deep canyon floor conduits, 17 strictly spaced chamfered skyscrapers
 * with InstancedMesh window bays, 2 non-overlapping elevated subway viaducts with animated trains,
 * and grounded flanking billboards (zero floating rocks/pillars or colliding signs).
 */
export function createRiftCityEnvironment(): RiftCityEnvironmentHandle {
  const group = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const beacons: BeaconRef[] = [];

  // 1. Subterranean Cavern Vault Dome & Deep Canyon Trench Floor
  const vaultTex = getRiftCavernVaultTexture();
  const vaultGeo = new THREE.SphereGeometry(108, 32, 20);
  const vaultMat = new THREE.MeshBasicMaterial({
    map: vaultTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const vaultDome = new THREE.Mesh(vaultGeo, vaultMat);
  vaultDome.rotation.y = Math.PI;

  const canyonFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0b1020,
    roughness: 0.92,
    metalness: 0.08,
  });
  const canyonFloorGeo = new THREE.PlaneGeometry(180, 180);
  const canyonFloor = new THREE.Mesh(canyonFloorGeo, canyonFloorMat);
  canyonFloor.rotation.x = -Math.PI / 2;
  canyonFloor.position.set(0, CAVERN_FLOOR_Y, -16);

  const avenueVeinGeo = new THREE.BoxGeometry(0.45, 0.08, 86);
  const accentNeonMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const secondaryNeonMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });

  ownedGeos.push(vaultGeo, canyonFloorGeo, avenueVeinGeo);
  ownedMats.push(vaultMat, canyonFloorMat, accentNeonMat, secondaryNeonMat);
  group.add(vaultDome, canyonFloor);

  for (const ax of [-14.6, 0, 14.6]) {
    const vein = new THREE.Mesh(avenueVeinGeo, ax === 0 ? secondaryNeonMat : accentNeonMat);
    vein.position.set(ax, CAVERN_FLOOR_Y + 0.05, -16);
    group.add(vein);
  }

  // 2. Shared Architectural Materials
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.72,
    flatShading: true,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.84,
    metalness: 0.12,
    flatShading: true,
  });
  const concreteLightMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.76,
    metalness: 0.16,
    flatShading: true,
  });
  const towerBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.35,
    flatShading: true,
  });
  const towerBodyAltMat = new THREE.MeshStandardMaterial({
    color: 0x283548,
    roughness: 0.68,
    metalness: 0.3,
    flatShading: true,
  });
  const trainMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  });
  ownedMats.push(steelMat, concreteMat, concreteLightMat, towerBodyMat, towerBodyAltMat, trainMat);

  // 3. Elevated Underground Subway / Monorail Viaducts cleanly inside left/right street canyons
  const viaductDeckGeo = createChamferSlabGeometry(2.5, 0.42, 46, 0.22, 0.03);
  const viaductRailGeo = new THREE.BoxGeometry(0.1, 0.14, 46);
  const viaductPierGeo = createChamferSlabGeometry(1.15, 29.0, 1.15, 0.16, 0.02);
  ownedGeos.push(viaductDeckGeo, viaductRailGeo, viaductPierGeo);

  const trainLanes: MonorailTrainLane[] = [];
  for (const side of [-1, 1] as const) {
    const vx = side * 14.6;
    const vy = -5.6;
    const vz = -12;
    const vDeck = new THREE.Mesh(viaductDeckGeo, steelMat);
    vDeck.position.set(vx, vy, vz);
    const railL = new THREE.Mesh(viaductRailGeo, side < 0 ? accentNeonMat : secondaryNeonMat);
    railL.position.set(vx - 1.12, vy + 0.48, vz);
    const railR = new THREE.Mesh(viaductRailGeo, side < 0 ? accentNeonMat : secondaryNeonMat);
    railR.position.set(vx + 1.12, vy + 0.48, vz);
    group.add(vDeck, railL, railR);

    for (const pz of [-28, -16, -4, 8]) {
      const pier = new THREE.Mesh(viaductPierGeo, concreteMat);
      pier.position.set(vx, vy - 29.0, pz);
      group.add(pier);
    }

    for (let t = 0; t < MONORAIL_TRAIN_COUNT / 2; t++) {
      trainLanes.push({
        x: vx + (t % 2 === 0 ? -0.56 : 0.56),
        y: vy + 0.62,
        zStart: -33,
        zSpan: 42,
        phase: t / (MONORAIL_TRAIN_COUNT / 2) + (side > 0 ? 0.22 : 0),
        speed: 0.16 + (t % 2) * 0.04,
        dir: t % 2 === 0 ? 1 : -1,
      });
    }
  }

  const trainGeo = createChamferSlabGeometry(0.46, 0.34, 2.6, 0.08, 0.02);
  ownedGeos.push(trainGeo);
  const trainMesh = new THREE.InstancedMesh(trainGeo, trainMat, trainLanes.length);
  group.add(trainMesh);

  // 4. Strictly Grid-Aligned Non-Overlapping Subterranean City Skyscrapers (rotY = 0 ONLY)
  const cityBuildings: SubBuildingSpec[] = [
    // Index 0: Hero Viaduct Citadel Under-Deck Foundation Shaft (x ∈ [-9.4,9.4], z ∈ [-8.2,6.2])
    { x: 0, z: -1.0, w: 18.8, d: 14.4, topY: -0.68, height: 33.4, hasPenthouse: false, hasHvac: false, hasAntenna: false, cols: 8, rows: 13 },

    // Left Inner District (x = -21.4..-22.2 -> clear of viaduct x=-14.6±1.25 by >= 2.2m)
    { x: -21.4, z: 3.8, w: 6.4, d: 6.2, topY: -2.2, height: 31.8, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 3, rows: 11 },
    { x: -21.6, z: -6.8, w: 6.8, d: 6.6, topY: 2.4, height: 36.4, hasPenthouse: false, hasHvac: true, hasAntenna: false, billboardVariant: 'cyan', cols: 4, rows: 13 },
    { x: -21.4, z: -17.8, w: 7.0, d: 6.8, topY: 5.4, height: 39.4, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 4, rows: 14 },
    { x: -22.2, z: -29.2, w: 7.4, d: 7.2, topY: 3.0, height: 37.0, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 13 },

    // Left Outer District (x = -31.2 -> >= 2.6m clear street east of inner block)
    { x: -31.0, z: -1.5, w: 7.2, d: 7.0, topY: 0.6, height: 34.6, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 4, rows: 12 },
    { x: -31.4, z: -13.2, w: 7.6, d: 7.4, topY: 7.4, height: 41.4, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 15 },
    { x: -31.8, z: -25.5, w: 7.8, d: 7.6, topY: 4.8, height: 38.8, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 4, rows: 14 },

    // Right Inner District (exact mirror, zero overlap)
    { x: 21.4, z: 3.8, w: 6.4, d: 6.2, topY: -1.8, height: 32.2, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 3, rows: 11 },
    { x: 21.6, z: -6.8, w: 6.8, d: 6.6, topY: 2.8, height: 36.8, hasPenthouse: false, hasHvac: true, hasAntenna: false, billboardVariant: 'crimson', cols: 4, rows: 13 },
    { x: 21.4, z: -17.8, w: 7.0, d: 6.8, topY: 5.8, height: 39.8, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 4, rows: 14 },
    { x: 22.2, z: -29.2, w: 7.4, d: 7.2, topY: 2.6, height: 36.6, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 13 },

    // Right Outer District
    { x: 31.0, z: -1.5, w: 7.2, d: 7.0, topY: 1.0, height: 35.0, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 4, rows: 12 },
    { x: 31.4, z: -13.2, w: 7.6, d: 7.4, topY: 7.8, height: 41.8, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 15 },
    { x: 31.8, z: -25.5, w: 7.8, d: 7.6, topY: 5.2, height: 39.2, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 4, rows: 14 },

    // Rear Canyon Horizon (central corridor left open behind Boss Command Plinth!)
    { x: -10.8, z: -25.0, w: 6.2, d: 6.0, topY: -1.4, height: 32.6, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 3, rows: 11 },
    { x: 10.8, z: -25.0, w: 6.2, d: 6.0, topY: -1.0, height: 33.0, hasPenthouse: true, hasHvac: false, hasAntenna: true, cols: 3, rows: 11 },
    { x: -11.4, z: -37.2, w: 7.0, d: 6.8, topY: 5.2, height: 39.2, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 14 },
    { x: 11.4, z: -37.2, w: 7.0, d: 6.8, topY: 5.6, height: 39.6, hasPenthouse: true, hasHvac: true, hasAntenna: true, cols: 4, rows: 14 },
    { x: -3.8, z: -42.0, w: 5.8, d: 5.6, topY: -2.2, height: 31.8, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 3, rows: 11 },
    { x: 3.8, z: -42.0, w: 5.8, d: 5.6, topY: -1.8, height: 32.2, hasPenthouse: false, hasHvac: true, hasAntenna: false, cols: 3, rows: 11 },
  ];

  const buckets = {
    frames: [] as WinTransform[],
    litCyan: [] as WinTransform[],
    litWarm: [] as WinTransform[],
    reflective: [] as WinTransform[],
  };

  const smallHvacGeo = createChamferSlabGeometry(1.65, 0.85, 1.3, 0.12, 0.02);
  const mastGeo = new THREE.CylinderGeometry(0.055, 0.12, 4.2, 6);
  const beaconGeo = new THREE.OctahedronGeometry(0.2, 0);
  ownedGeos.push(smallHvacGeo, mastGeo, beaconGeo);

  for (let i = 0; i < cityBuildings.length; i++) {
    const b = cityBuildings[i];
    if (i > 0) {
      const bGeo = createChamferSlabGeometry(b.w, b.height, b.d, BUILDING_CHAMFER, BUILDING_BEVEL);
      const bMesh = new THREE.Mesh(bGeo, i % 2 === 0 ? towerBodyMat : towerBodyAltMat);
      bMesh.position.set(b.x, b.topY - b.height * 0.5, b.z);
      ownedGeos.push(bGeo);
      group.add(bMesh);

      const rimGeo = createChamferSlabGeometry(b.w + 0.34, 0.28, b.d + 0.34, BUILDING_CHAMFER, 0.02);
      const rim = new THREE.Mesh(rimGeo, concreteLightMat);
      rim.position.set(b.x, b.topY, b.z);
      ownedGeos.push(rimGeo);
      group.add(rim);

      if (b.hasPenthouse) {
        const tierGeo = createChamferSlabGeometry(b.w * 0.6, 1.55, b.d * 0.6, 0.24, 0.025);
        const tier = new THREE.Mesh(tierGeo, steelMat);
        tier.position.set(b.x, b.topY + 0.28, b.z);
        ownedGeos.push(tierGeo);
        group.add(tier);
      }

      const roofBaseY = b.hasPenthouse ? b.topY + 1.85 : b.topY + 0.28;
      if (b.hasHvac) {
        const hMesh = new THREE.Mesh(smallHvacGeo, concreteLightMat);
        hMesh.position.set(b.x + 0.4, roofBaseY, b.z + 0.4);
        group.add(hMesh);
      }
      if (b.hasAntenna) {
        const mast = new THREE.Mesh(mastGeo, steelMat);
        mast.position.set(b.x - b.w * 0.16, roofBaseY + 2.1, b.z - b.d * 0.16);
        const bMat = new THREE.MeshStandardMaterial({
          color: 0xe0f2fe,
          emissive: i % 2 === 0 ? 0x22d3ee : 0xa855f7,
          emissiveIntensity: 1.7,
          roughness: 0.2,
        });
        const bTip = new THREE.Mesh(beaconGeo, bMat);
        bTip.position.set(b.x - b.w * 0.16, roofBaseY + 4.3, b.z - b.d * 0.16);
        ownedMats.push(bMat);
        beacons.push({ mat: bMat, phase: i * 0.85, speed: 2.8 + (i % 3) * 0.45 });
        group.add(mast, bTip);
      }
      if (b.billboardVariant) {
        // Grounded cleanly on non-antenna building rooftop edge facing inward toward arena
        const isCyan = b.billboardVariant === 'cyan';
        const signGroup = new THREE.Group();
        const footGeo = createChamferSlabGeometry(2.4, 0.2, 0.72, 0.1, 0.015);
        const legGeo = new THREE.CylinderGeometry(0.065, 0.09, 2.05, 6);
        const frameGeo = createChamferSlabGeometry(2.85, 1.4, 0.22, 0.12, 0.02);
        const screenGeo = new THREE.PlaneGeometry(2.5, 1.15);
        const bTex = paintCachedTexture(
          isCyan ? 'rift-billboard-cyan-v1' : 'rift-billboard-crimson-v1',
          512,
          256,
          1,
          3,
          [10, 14, 30, 255],
          (tCtx) => {
            const g = tCtx.createLinearGradient(0, 0, 512, 256);
            g.addColorStop(0, isCyan ? '#082f49' : '#2e1065');
            g.addColorStop(1, isCyan ? '#0f172a' : '#1e1b4b');
            tCtx.fillStyle = g;
            tCtx.fillRect(0, 0, 512, 256);
            tCtx.strokeStyle = isCyan ? '#22d3ee' : '#e879f9';
            tCtx.lineWidth = 8;
            tCtx.strokeRect(12, 12, 488, 232);
            tCtx.fillStyle = '#f8fafc';
            tCtx.font = '900 46px sans-serif';
            tCtx.textAlign = 'center';
            tCtx.textBaseline = 'middle';
            tCtx.fillText(isCyan ? 'SUB-METRO 09' : 'RIFT // NEXUS', 256, 112);
            tCtx.fillStyle = isCyan ? '#67e8f9' : '#f0abfc';
            tCtx.font = '800 24px sans-serif';
            tCtx.fillText(isCyan ? 'DEEP CAVERN LINE' : 'ANOMALY SECTOR', 256, 174);
          }
        );
        const sMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: bTex,
          emissiveMap: bTex,
          emissive: isCyan ? 0x22d3ee : 0xd946ef,
          emissiveIntensity: 0.9,
          roughness: 0.25,
        });
        ownedGeos.push(footGeo, legGeo, frameGeo, screenGeo);
        ownedMats.push(sMat);

        const foot = new THREE.Mesh(footGeo, steelMat);
        const legL = new THREE.Mesh(legGeo, steelMat);
        legL.position.set(-0.78, 1.15, 0);
        const legR = new THREE.Mesh(legGeo, steelMat);
        legR.position.set(0.78, 1.15, 0);
        const frame = new THREE.Mesh(frameGeo, steelMat);
        frame.position.set(0, 2.55, 0);
        const screen = new THREE.Mesh(screenGeo, sMat);
        screen.position.set(0, 2.55, 0.125);
        signGroup.add(foot, legL, legR, frame, screen);

        const signX = b.x < 0 ? b.x + b.w * 0.24 : b.x - b.w * 0.24;
        signGroup.position.set(signX, roofBaseY, b.z);
        signGroup.rotation.y = b.x < 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
        group.add(signGroup);
      }
    }

    appendBuildingFaceWindows(b, 0, i, buckets);
    appendBuildingFaceWindows(b, 1, i, buckets);
    appendBuildingFaceWindows(b, 3, i, buckets);
  }

  const unitWinGeo = new THREE.PlaneGeometry(1, 1);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.6,
    metalness: 0.45,
  });
  const litCyanMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.05,
    roughness: 0.22,
  });
  const litWarmMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ff,
    emissive: 0x9333ea,
    emissiveIntensity: 0.88,
    roughness: 0.25,
  });
  const reflectMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x1e293b,
    emissiveIntensity: 0.2,
    roughness: 0.22,
    metalness: 0.72,
  });
  ownedGeos.push(unitWinGeo);
  ownedMats.push(frameMat, litCyanMat, litWarmMat, reflectMat);

  const dummy = new THREE.Object3D();
  const winInsts: THREE.InstancedMesh[] = [];
  const buildWinLayer = (list: WinTransform[], mat: THREE.Material): void => {
    if (list.length === 0) return;
    const inst = new THREE.InstancedMesh(unitWinGeo, mat, list.length);
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
    winInsts.push(inst);
  };

  buildWinLayer(buckets.frames, frameMat);
  buildWinLayer(buckets.litCyan, litCyanMat);
  buildWinLayer(buckets.litWarm, litWarmMat);
  buildWinLayer(buckets.reflective, reflectMat);

  // 5. Subterranean Canyon Mist Layer
  const mistTex = createCityMistTexture();
  if (mistTex) ownedTextures.push(mistTex);
  const mistGeo = new THREE.PlaneGeometry(180, 180);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x312e81,
    ...(mistTex ? { map: mistTex } : {}),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  ownedGeos.push(mistGeo);
  ownedMats.push(mistMat);
  const mistLower = new THREE.Mesh(mistGeo, mistMat);
  mistLower.rotation.x = -Math.PI / 2;
  mistLower.position.set(0, -19.5, -16);
  group.add(mistLower);

  let lowQuality = false;

  return {
    group,
    setAccentPalette: (primaryHex: string, secondaryHex: string) => {
      secondaryNeonMat.color.set(primaryHex);
      accentNeonMat.color.set(secondaryHex);
      trainMat.color.set(secondaryHex);
      trainMat.emissive.set(secondaryHex);
    },
    setLowQuality: (low: boolean) => {
      lowQuality = low;
      mistLower.visible = !low;
    },
    update: (_dt: number, elapsed: number) => {
      for (const b of beacons) {
        const pulse = Math.max(0, Math.sin(elapsed * b.speed + b.phase));
        b.mat.emissiveIntensity = 0.4 + pulse * 2.0;
      }
      if (lowQuality) {
        trainMesh.visible = false;
        return;
      }
      trainMesh.visible = true;
      for (let i = 0; i < trainLanes.length; i++) {
        const lane = trainLanes[i];
        const frac = (elapsed * lane.speed + lane.phase) % 1;
        const z = lane.dir > 0 ? lane.zStart + frac * lane.zSpan : lane.zStart + (1 - frac) * lane.zSpan;
        dummy.position.set(lane.x, lane.y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trainMesh.setMatrixAt(i, dummy.matrix);
      }
      trainMesh.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      trainMesh.dispose();
      for (const inst of winInsts) inst.dispose();
      for (const t of ownedTextures) t.dispose();
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      disposeObject3D(group);
    },
  };
}

/**
 * Builds the chamfered architectural Underground Metro Command Deck (`y = 0.0`),
 * perimeter guardrails, stepped angular Boss Command Plinth, grounded flank equipment,
 * and subtle canyon trench embers (ZERO portals and ZERO circular disc decks).
 */
export function buildRiftPlazaArchitecture(ctx: {
  group: THREE.Group;
  armorMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  brightMat: THREE.MeshStandardMaterial;
  primaryNeonMat: THREE.MeshBasicMaterial;
  secondaryNeonMat: THREE.MeshBasicMaterial;
  daisSealMat: THREE.MeshBasicMaterial;
  shockwaveMat: THREE.MeshBasicMaterial;
  bossPosZ: number;
  bossDaisY: number;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedTexs: THREE.Texture[];
}): {
  shockwaveRing: THREE.Mesh;
  emberPoints: THREE.Points;
  emberPosAttr: THREE.BufferAttribute;
  emberSeeds: RiftEmberSeed[];
  fanBlades: THREE.Object3D[];
} {
  const deckW = 20.8;
  const deckD = 16.4;
  const deckH = 0.44;
  const deckCenterZ = -1.0;

  const deckTex = createRiftSubwayDeckTexture();
  if (deckTex) ctx.ownedTexs.push(deckTex);
  const deckMat = new THREE.MeshStandardMaterial({
    color: deckTex ? 0xffffff : 0x263044,
    ...(deckTex ? { map: deckTex } : {}),
    roughness: 0.68,
    metalness: 0.24,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.84,
    metalness: 0.14,
    flatShading: true,
  });
  const railGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.42,
    roughness: 0.16,
    metalness: 0.6,
  });
  const lampGoldMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  ctx.ownedMats.push(deckMat, concreteMat, railGlassMat, lampGoldMat);

  // 1. Chamfered Rectangular Subway Citadel Deck (surface strictly at y = 0.0)
  const heroDeckGeo = createChamferSlabGeometry(deckW, deckH, deckD, 2.0, 0.05);
  normalizeHorizontalSlabUVs(heroDeckGeo, deckW, deckD, 0, 0);
  const heroDeck = new THREE.Mesh(heroDeckGeo, deckMat);
  heroDeck.position.set(0, -deckH, deckCenterZ);
  heroDeck.receiveShadow = true;

  // Clean structural cornice + glowing trim belt directly underneath (-0.44 .. -0.70)
  const corniceGeo = createChamferSlabGeometry(21.2, 0.24, 16.8, 2.05, 0.03);
  const cornice = new THREE.Mesh(corniceGeo, ctx.steelMat);
  cornice.position.set(0, -0.68, deckCenterZ);

  const trimBandGeo = createChamferSlabGeometry(21.4, 0.08, 17.0, 2.1, 0.015);
  const trimBand = new THREE.Mesh(trimBandGeo, ctx.secondaryNeonMat);
  trimBand.position.set(0, -0.6, deckCenterZ);

  // 4 Heavy Steel Corner Viaduct Piers dropping into canyon
  const pierGeo = createChamferSlabGeometry(1.2, 34.0, 1.2, 0.18, 0.02);
  ctx.ownedGeos.push(heroDeckGeo, corniceGeo, trimBandGeo, pierGeo);
  ctx.group.add(heroDeck, cornice, trimBand);

  for (const [px, pz] of [
    [-8.6, -7.8],
    [8.6, -7.8],
    [-8.6, 5.8],
    [8.6, 5.8],
  ]) {
    const pier = new THREE.Mesh(pierGeo, ctx.steelMat);
    pier.position.set(px, -34.68, pz);
    ctx.group.add(pier);
  }

  // 2. Clean Perimeter Parapets & Glass Guardrails (open camera corridor at +Z, open central vista at -Z)
  const sideWallGeo = createChamferSlabGeometry(0.44, 0.54, 5.0, 0.08, 0.02);
  const sideCapGeo = createChamferSlabGeometry(0.54, 0.1, 5.1, 0.08, 0.015);
  const railPostGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.52, 6);
  const sideBarGeo = new THREE.BoxGeometry(0.05, 0.05, 4.9);
  const sideGlassGeo = new THREE.BoxGeometry(0.03, 0.4, 4.6);
  const rearWallGeo = createChamferSlabGeometry(5.2, 0.54, 0.44, 0.08, 0.02);
  const rearCapGeo = createChamferSlabGeometry(5.3, 0.1, 0.54, 0.08, 0.015);
  const rearBarGeo = new THREE.BoxGeometry(5.0, 0.05, 0.05);
  const rearGlassGeo = new THREE.BoxGeometry(4.7, 0.4, 0.03);
  ctx.ownedGeos.push(sideWallGeo, sideCapGeo, railPostGeo, sideBarGeo, sideGlassGeo, rearWallGeo, rearCapGeo, rearBarGeo, rearGlassGeo);

  for (const sx of [-1, 1] as const) {
    for (const pz of [-5.5, 2.4]) {
      const wall = new THREE.Mesh(sideWallGeo, concreteMat);
      wall.position.set(sx * 9.85, 0, pz);
      const cap = new THREE.Mesh(sideCapGeo, ctx.brightMat);
      cap.position.set(sx * 9.85, 0.54, pz);
      const glass = new THREE.Mesh(sideGlassGeo, railGlassMat);
      glass.position.set(sx * 9.85, 0.84, pz);
      const bar = new THREE.Mesh(sideBarGeo, ctx.steelMat);
      bar.position.set(sx * 9.85, 1.1, pz);
      enableShadows(wall);
      enableShadows(cap);
      ctx.group.add(wall, cap, glass, bar);
      for (const rz of [-2.1, 0, 2.1]) {
        const post = new THREE.Mesh(railPostGeo, ctx.steelMat);
        post.position.set(sx * 9.85, 0.88, pz + rz);
        ctx.group.add(post);
      }
    }
  }
  for (const rx of [-6.0, 6.0]) {
    const rWall = new THREE.Mesh(rearWallGeo, concreteMat);
    rWall.position.set(rx, 0, -8.75);
    const rCap = new THREE.Mesh(rearCapGeo, ctx.brightMat);
    rCap.position.set(rx, 0.54, -8.75);
    const rGlass = new THREE.Mesh(rearGlassGeo, railGlassMat);
    rGlass.position.set(rx, 0.84, -8.75);
    const rBar = new THREE.Mesh(rearBarGeo, ctx.steelMat);
    rBar.position.set(rx, 1.1, -8.75);
    for (const px of [-2.1, 0, 2.1]) {
      const post = new THREE.Mesh(railPostGeo, ctx.steelMat);
      post.position.set(rx + px, 0.88, -8.75);
      ctx.group.add(post);
    }
    enableShadows(rWall);
    enableShadows(rCap);
    ctx.group.add(rWall, rCap, rGlass, rBar);
  }

  // 3. Stepped Angular Chamfered Boss Command Plinth (NO round saucer, NO portal behind Boss!)
  const plinthBaseGeo = createChamferSlabGeometry(6.3, 0.28, 5.2, 0.95, 0.03);
  const plinthTopGeo = createChamferSlabGeometry(5.3, 0.28, 4.3, 0.78, 0.03);
  const plinthTrimGeo = createChamferSlabGeometry(5.46, 0.06, 4.46, 0.8, 0.015);
  const plinthRailGeo = new THREE.BoxGeometry(3.5, 0.04, 0.14);
  const cleatGeo = createChamferSlabGeometry(0.42, 0.24, 0.48, 0.08, 0.02);

  const plinthBase = new THREE.Mesh(plinthBaseGeo, ctx.armorMat);
  plinthBase.position.set(0, 0, ctx.bossPosZ);
  const plinthTop = new THREE.Mesh(plinthTopGeo, ctx.steelMat);
  plinthTop.position.set(0, 0.28, ctx.bossPosZ);
  const plinthTrim = new THREE.Mesh(plinthTrimGeo, ctx.daisSealMat);
  plinthTrim.position.set(0, 0.54, ctx.bossPosZ);
  const frontRail = new THREE.Mesh(plinthRailGeo, ctx.secondaryNeonMat);
  frontRail.position.set(0, 0.57, ctx.bossPosZ + 2.02);
  const rearRail = new THREE.Mesh(plinthRailGeo, ctx.primaryNeonMat);
  rearRail.position.set(0, 0.57, ctx.bossPosZ - 2.02);
  enableShadows(plinthBase);
  enableShadows(plinthTop);

  for (const [cx, cz, ry] of [
    [-2.7, ctx.bossPosZ - 2.1, Math.PI * 0.25],
    [2.7, ctx.bossPosZ - 2.1, -Math.PI * 0.25],
    [-2.7, ctx.bossPosZ + 2.1, -Math.PI * 0.25],
    [2.7, ctx.bossPosZ + 2.1, Math.PI * 0.25],
  ]) {
    const cleat = new THREE.Mesh(cleatGeo, ctx.brightMat);
    cleat.position.set(cx, 0.12, cz);
    cleat.rotation.y = ry;
    enableShadows(cleat);
    ctx.group.add(cleat);
  }

  // Octagonal chamfered shockwave pulse ring (opacity=0 at rest; flashes only on Tier ups)
  const shockGeo = new THREE.RingGeometry(2.8, 3.25, 8);
  const shockwaveRing = new THREE.Mesh(shockGeo, ctx.shockwaveMat);
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.rotation.z = Math.PI / 8;
  shockwaveRing.position.set(0, 0.04, ctx.bossPosZ);

  ctx.ownedGeos.push(plinthBaseGeo, plinthTopGeo, plinthTrimGeo, plinthRailGeo, cleatGeo, shockGeo);
  ctx.group.add(plinthBase, plinthTop, plinthTrim, frontRail, rearRail, shockwaveRing);

  // 4. Grounded Flank Equipment on Deck Sides (Floodlight Towers & HVAC Chillers)
  const assetsCtx: RooftopAssetsCtx = {
    ownedTextures: ctx.ownedTexs,
    ownedGeos: ctx.ownedGeos,
    ownedMats: ctx.ownedMats,
    concreteMat,
    concreteLightMat: ctx.brightMat,
    steelMat: ctx.steelMat,
    goldAccentMat: lampGoldMat,
  };
  const fanBlades: THREE.Object3D[] = [];
  for (const sx of [-1, 1] as const) {
    const hvac = buildRooftopHvacUnit(assetsCtx);
    hvac.group.position.set(sx * 8.35, 0, -4.4);
    hvac.group.rotation.y = -sx * Math.PI * 0.5;
    fanBlades.push(hvac.blade);

    const spot = buildRooftopSpotlightTower(assetsCtx);
    spot.position.set(sx * 8.35, 0, -7.2);
    spot.rotation.y = -sx * 0.62;
    ctx.group.add(hvac.group, spot);
  }

  // 5. Subtle Canyon Trench Embers (ONLY deep in the left/right chasm outside deck, zero clutter)
  const emberCount = 32;
  const emberArr = new Float32Array(emberCount * 3);
  const emberSeeds: RiftEmberSeed[] = [];
  for (let i = 0; i < emberCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = side * (11.8 + (i % 4) * 1.15);
    const bz = -24 + ((i * 5) % 28);
    emberSeeds.push({
      baseX: bx,
      baseZ: bz,
      phase: i * 0.41,
      speed: 0.24 + (i % 3) * 0.08,
      radius: 0.22 + (i % 3) * 0.1,
    });
    emberArr[i * 3] = bx;
    emberArr[i * 3 + 1] = -14 + (i % 8) * 1.8;
    emberArr[i * 3 + 2] = bz;
  }
  const emberGeo = new THREE.BufferGeometry();
  const emberPosAttr = new THREE.BufferAttribute(emberArr, 3);
  emberGeo.setAttribute('position', emberPosAttr);
  const emberTex = createRiftEmberTexture();
  if (emberTex) ctx.ownedTexs.push(emberTex);
  const emberMat = new THREE.PointsMaterial({
    color: 0xa5f3fc,
    size: 0.28,
    ...(emberTex ? { map: emberTex } : {}),
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  ctx.ownedGeos.push(emberGeo);
  ctx.ownedMats.push(emberMat);
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  ctx.group.add(emberPoints);

  return { shockwaveRing, emberPoints, emberPosAttr, emberSeeds, fanBlades };
}
