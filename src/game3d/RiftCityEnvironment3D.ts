import * as THREE from 'three';
import { disposeObject3D } from './MeshHelpers3D';
import { getSkyscraperFacadeTexture, paintCachedTexture } from './ProceduralTextures3D';
import {
  createSkyscraperShaftGeometry,
  getCityMistTexture,
  getRooftopHoloSignTexture,
  getSkyscraperVariantTexture,
  type HoloBillboardLabel,
} from './SkyMetropolisAssets3D';

const CITY_BASE_Y = -36;
const TRAFFIC_COUNT = 14;
const STALACTITE_COUNT = 32;
const STALAGMITE_COUNT = 22;

interface SubTowerSeed {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  rotY: number;
  archetype: 0 | 1 | 2;
  hasSetback: boolean;
  setbackH: number;
  hasFins: boolean;
  hasAntenna: boolean;
  holoLabel: HoloBillboardLabel | null;
}

interface SubTrafficLane {
  x: number;
  y: number;
  zStart: number;
  zSpan: number;
  phase: number;
  speed: number;
  dir: 1 | -1;
}

export interface RiftCityEnvironmentHandle {
  group: THREE.Group;
  setAccentPalette: (primaryHex: string, secondaryHex: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

function getRiftCavernWallTexture(): THREE.Texture {
  return paintCachedTexture('rift-cavern-rock-v1', 512, 256, 1, 3, [10, 7, 24, 255], (ctx) => {
    const W = 512;
    const H = 256;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, '#070414');
    grad.addColorStop(0.42, '#130b29');
    grad.addColorStop(0.75, '#190d34');
    grad.addColorStop(1.0, '#080514');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Jagged basalt strata bands
    for (let y = 16; y < H; y += 22) {
      ctx.strokeStyle = y % 44 === 16 ? 'rgba(139, 92, 246, 0.16)' : 'rgba(30, 22, 58, 0.72)';
      ctx.lineWidth = y % 44 === 16 ? 2 : 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 32; x <= W; x += 32) {
        const dy = Math.sin(x * 0.04 + y * 0.2) * 5;
        ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    // Glowing subterranean rift crystal veins embedded in the cavern ceiling/walls
    for (let v = 0; v < 14; v++) {
      const sx = ((v * 89 + 23) % (W - 40)) + 20;
      const sy = 22 + ((v * 53) % (H - 55));
      ctx.strokeStyle = v % 2 === 0 ? 'rgba(34, 211, 238, 0.38)' : 'rgba(192, 132, 252, 0.36)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ((v % 3) - 1) * 28, sy + 24);
      ctx.lineTo(sx + ((v % 5) - 2) * 20, sy + 52);
      ctx.stroke();
    }
  });
}

function getRiftAbyssFloorTexture(): THREE.Texture {
  return paintCachedTexture('rift-abyss-floor-v1', 256, 256, 1, 3, [12, 8, 28, 255], (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(34, 211, 238, 0.48)');
    g.addColorStop(0.35, 'rgba(168, 85, 247, 0.26)');
    g.addColorStop(0.75, 'rgba(17, 11, 36, 0.85)');
    g.addColorStop(1, 'rgba(6, 3, 16, 1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

function buildSubterraneanSeeds(): SubTowerSeed[] {
  const seeds: SubTowerSeed[] = [];
  const rings: Array<{
    count: number;
    rx: number;
    rz: number;
    cz: number;
    minTop: number;
    maxTop: number;
    wRange: [number, number];
  }> = [
    // Deep chasm towers directly below/around the floating arena deck
    { count: 12, rx: 14.2, rz: 12.0, cz: -1.5, minTop: -12.5, maxTop: -6.2, wRange: [2.4, 3.6] },
    // Mid-ring underground skyscrapers framing the chasm
    { count: 18, rx: 24.5, rz: 20.5, cz: -4.8, minTop: -4.5, maxTop: 5.5, wRange: [3.0, 4.6] },
    // Outer cavern-wall megastructures
    { count: 20, rx: 36.5, rz: 28.0, cz: -14.0, minTop: 1.0, maxTop: 12.5, wRange: [3.6, 5.4] },
  ];

  const holoCycle: readonly HoloBillboardLabel[] = ['NEXUS', 'CYBER', 'MINE'];
  let idx = 0;
  let holoCount = 0;
  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.37;
      // Leave front camera corridor clear (+z side)
      if (rIdx >= 1 && Math.sin(a) > 0.42 && Math.abs(Math.cos(a)) < 0.65) continue;
      const jitterR = 0.88 + ((idx * 17) % 6) * 0.045;
      const x = Math.cos(a) * ring.rx * jitterR;
      const z = ring.cz + Math.sin(a) * ring.rz * jitterR;
      let topY = ring.minTop + (((idx * 23 + 5) % 11) / 10) * (ring.maxTop - ring.minTop);
      if (rIdx >= 1 && Math.abs(x) >= 16 && z < -4) {
        topY += 2.2;
      }
      const w = ring.wRange[0] + (((idx * 13) % 5) / 4) * (ring.wRange[1] - ring.wRange[0]);
      const d = w * (0.82 + ((idx * 7) % 4) * 0.1);
      const archetype = (idx % 3) as 0 | 1 | 2;
      const hasSetback = rIdx >= 1 && idx % 3 !== 2;
      const setbackH = hasSetback ? 2.4 + ((idx * 11) % 4) * 0.65 : 0;
      const hasFins = hasSetback && idx % 2 === 0;
      const hasAntenna = topY > -6 && idx % 2 === 1;
      let holoLabel: HoloBillboardLabel | null = null;
      if (rIdx >= 1 && z < -5 && Math.abs(x) > 10 && topY > -2 && holoCount < 6 && idx % 3 === 1) {
        holoLabel = holoCycle[holoCount % holoCycle.length];
        holoCount += 1;
      }
      seeds.push({
        x,
        z,
        w,
        d,
        topY,
        rotY: (idx % 4) * (Math.PI / 6),
        archetype,
        hasSetback,
        setbackH,
        hasFins,
        hasAntenna,
        holoLabel,
      });
      idx += 1;
    }
  }
  return seeds;
}

/**
 * Builds the Subterranean Cyber-Rift City surrounding the Rift Boss Arena:
 * volcanic cavern dome, arched stone buttresses with glowing energy veins,
 * hanging stalactites, tiered neon skyscrapers, elevated viaduct bridges,
 * crystal outcrops, and hovering underground traffic.
 */
export function createRiftCityEnvironment(): RiftCityEnvironmentHandle {
  const group = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  // 1. Subterranean Cavern Enclosure + Deep Abyss Floor
  const cavernTex = getRiftCavernWallTexture();
  const cavernGeo = new THREE.SphereGeometry(78, 28, 18);
  const cavernMat = new THREE.MeshBasicMaterial({
    map: cavernTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const cavernDome = new THREE.Mesh(cavernGeo, cavernMat);

  const abyssTex = getRiftAbyssFloorTexture();
  const abyssGeo = new THREE.CircleGeometry(68, 36);
  const abyssMat = new THREE.MeshBasicMaterial({
    map: abyssTex,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false,
  });
  const abyssFloor = new THREE.Mesh(abyssGeo, abyssMat);
  abyssFloor.rotation.x = -Math.PI / 2;
  abyssFloor.position.set(0, CITY_BASE_Y + 0.5, -8);

  ownedGeos.push(cavernGeo, abyssGeo);
  ownedMats.push(cavernMat, abyssMat);
  group.add(cavernDome, abyssFloor);

  // 2. Cavern Stone Buttresses & Glowing Energy Veins + Hanging Stalactites / Stalagmites
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1e1836,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
  });
  const veinMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  const accentNeonMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    color: 0x1b233d,
    roughness: 0.55,
    metalness: 0.38,
    flatShading: true,
  });
  ownedMats.push(rockMat, veinMat, accentNeonMat, bridgeDeckMat);

  // 10 Cavern Structural Ribs curving up the cavern wall
  const ribGeo = new THREE.CylinderGeometry(1.4, 2.8, 56, 6);
  const ribVeinGeo = new THREE.BoxGeometry(0.32, 54, 0.32);
  ownedGeos.push(ribGeo, ribVeinGeo);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.sin(a) > 0.45 && Math.abs(Math.cos(a)) < 0.65) continue;
    const rx = Math.cos(a) * 50;
    const rz = -8 + Math.sin(a) * 44;
    const rib = new THREE.Mesh(ribGeo, rockMat);
    rib.position.set(rx, -4, rz);
    rib.lookAt(0, 14, -8);
    rib.rotateX(Math.PI * 0.42);
    const vein = new THREE.Mesh(ribVeinGeo, i % 2 === 0 ? veinMat : accentNeonMat);
    vein.position.set(rx * 0.96, -4, rz * 0.96);
    vein.rotation.copy(rib.rotation);
    group.add(rib, vein);
  }

  // Instanced Hanging Stalactites & Rising Stalagmites
  const stalGeo = new THREE.ConeGeometry(1.6, 10.5, 6);
  ownedGeos.push(stalGeo);
  const stalactites = new THREE.InstancedMesh(stalGeo, rockMat, STALACTITE_COUNT);
  const stalagmites = new THREE.InstancedMesh(stalGeo, rockMat, STALAGMITE_COUNT);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < STALACTITE_COUNT; i++) {
    const a = (i / STALACTITE_COUNT) * Math.PI * 2 + 0.15;
    const rad = 16 + ((i * 19) % 34);
    dummy.position.set(Math.cos(a) * rad, 19 + ((i * 7) % 9), -8 + Math.sin(a) * (rad * 0.85));
    dummy.rotation.set(Math.PI + ((i % 3) - 1) * 0.08, i * 0.6, ((i % 5) - 2) * 0.05);
    const sx = 0.65 + (i % 4) * 0.35;
    const sy = 0.7 + (i % 5) * 0.38;
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    stalactites.setMatrixAt(i, dummy.matrix);
  }
  stalactites.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < STALAGMITE_COUNT; i++) {
    const a = (i / STALAGMITE_COUNT) * Math.PI * 2 + 0.25;
    const rad = 15 + ((i * 23) % 28);
    dummy.position.set(Math.cos(a) * rad, CITY_BASE_Y + 4, -8 + Math.sin(a) * (rad * 0.85));
    dummy.rotation.set(((i % 3) - 1) * 0.07, i * 0.5, 0);
    const sx = 0.9 + (i % 3) * 0.45;
    const sy = 1.2 + (i % 4) * 0.55;
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    stalagmites.setMatrixAt(i, dummy.matrix);
  }
  stalagmites.instanceMatrix.needsUpdate = true;
  group.add(stalactites, stalagmites);

  // 3. Sunken Underground Cyber-Metropolis Skyscrapers (3 Facade Archetypes via InstancedMesh)
  const seeds = buildSubterraneanSeeds();
  const shaftBoxGeo = createSkyscraperShaftGeometry();
  const shaftOctGeo = new THREE.CylinderGeometry(0.58, 0.62, 1, 8);
  const capGeo = new THREE.BoxGeometry(1, 1, 1);
  const finGeo = new THREE.BoxGeometry(0.16, 1, 0.16);
  const antGeo = new THREE.CylinderGeometry(0.05, 0.1, 1, 5);
  const beaconGeo = new THREE.OctahedronGeometry(0.24, 0);
  ownedGeos.push(shaftBoxGeo, shaftOctGeo, capGeo, finGeo, antGeo, beaconGeo);

  const curtainMat = new THREE.MeshBasicMaterial({ map: getSkyscraperFacadeTexture('#22d3ee') });
  const diagridMat = new THREE.MeshBasicMaterial({ map: getSkyscraperVariantTexture('diagrid', '#a855f7') });
  const megacorpMat = new THREE.MeshBasicMaterial({ map: getSkyscraperVariantTexture('megacorp', '#22d3ee') });
  const roofCapMat = new THREE.MeshStandardMaterial({ color: 0x0b1224, roughness: 0.72, metalness: 0.28, flatShading: true });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
  ownedMats.push(curtainMat, diagridMat, megacorpMat, roofCapMat, beaconMat);

  const archBuckets: SubTowerSeed[][] = [[], [], []];
  for (const s of seeds) archBuckets[s.archetype].push(s);

  const shaftMats = [curtainMat, diagridMat, megacorpMat];
  const shaftGeos = [shaftBoxGeo, shaftBoxGeo, shaftOctGeo];
  const setbackSeeds = seeds.filter((s) => s.hasSetback);
  const finSeeds = seeds.filter((s) => s.hasFins);
  const antSeeds = seeds.filter((s) => s.hasAntenna);

  for (let arch = 0; arch < 3; arch++) {
    const list = archBuckets[arch];
    if (list.length === 0) continue;
    const im = new THREE.InstancedMesh(shaftGeos[arch], shaftMats[arch], list.length);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const h = Math.max(4, s.topY - CITY_BASE_Y);
      dummy.position.set(s.x, CITY_BASE_Y + h * 0.5, s.z);
      dummy.rotation.set(0, s.rotY, 0);
      dummy.scale.set(s.w, h, s.d);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }

  if (setbackSeeds.length > 0) {
    const setMesh = new THREE.InstancedMesh(shaftBoxGeo, curtainMat, setbackSeeds.length);
    for (let i = 0; i < setbackSeeds.length; i++) {
      const s = setbackSeeds[i];
      dummy.position.set(s.x, s.topY + s.setbackH * 0.5, s.z);
      dummy.rotation.set(0, s.rotY, 0);
      dummy.scale.set(s.w * 0.68, s.setbackH, s.d * 0.68);
      dummy.updateMatrix();
      setMesh.setMatrixAt(i, dummy.matrix);
    }
    setMesh.instanceMatrix.needsUpdate = true;
    group.add(setMesh);
  }

  const capMesh = new THREE.InstancedMesh(capGeo, roofCapMat, seeds.length);
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const roofY = s.topY + s.setbackH;
    const scaleF = s.hasSetback ? 0.72 : 1.04;
    dummy.position.set(s.x, roofY + 0.14, s.z);
    dummy.rotation.set(0, s.rotY, 0);
    dummy.scale.set(s.w * scaleF, 0.28, s.d * scaleF);
    dummy.updateMatrix();
    capMesh.setMatrixAt(i, dummy.matrix);
  }
  capMesh.instanceMatrix.needsUpdate = true;
  group.add(capMesh);

  if (finSeeds.length > 0) {
    const finMesh = new THREE.InstancedMesh(finGeo, accentNeonMat, finSeeds.length * 2);
    for (let i = 0; i < finSeeds.length; i++) {
      const s = finSeeds[i];
      const h = Math.max(4, s.topY - CITY_BASE_Y) * 0.75;
      const cosR = Math.cos(s.rotY);
      const sinR = Math.sin(s.rotY);
      for (let side = 0; side < 2; side++) {
        const lx = (side === 0 ? -1 : 1) * (s.w * 0.52);
        dummy.position.set(s.x + lx * cosR, s.topY - h * 0.5, s.z - lx * sinR);
        dummy.rotation.set(0, s.rotY, 0);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        finMesh.setMatrixAt(i * 2 + side, dummy.matrix);
      }
    }
    finMesh.instanceMatrix.needsUpdate = true;
    group.add(finMesh);
  }

  if (antSeeds.length > 0) {
    const antMesh = new THREE.InstancedMesh(antGeo, roofCapMat, antSeeds.length);
    const bcnMesh = new THREE.InstancedMesh(beaconGeo, beaconMat, antSeeds.length);
    for (let i = 0; i < antSeeds.length; i++) {
      const s = antSeeds[i];
      const roofY = s.topY + s.setbackH + 0.25;
      const antH = 3.0 + (i % 3) * 0.85;
      dummy.position.set(s.x, roofY + antH * 0.5, s.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, antH, 1);
      dummy.updateMatrix();
      antMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.x, roofY + antH + 0.16, s.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bcnMesh.setMatrixAt(i, dummy.matrix);
    }
    antMesh.instanceMatrix.needsUpdate = true;
    bcnMesh.instanceMatrix.needsUpdate = true;
    group.add(antMesh, bcnMesh);
  }

  // Holographic underground city signs
  const holoGeo = new THREE.PlaneGeometry(3.8, 1.5);
  ownedGeos.push(holoGeo);
  for (const s of seeds) {
    if (!s.holoLabel) continue;
    const hMat = new THREE.MeshBasicMaterial({
      map: getRooftopHoloSignTexture(s.holoLabel, s.x < 0 ? '#22d3ee' : '#e879f9'),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    ownedMats.push(hMat);
    const sign = new THREE.Mesh(holoGeo, hMat);
    sign.position.set(s.x, s.topY + s.setbackH + 1.5, s.z);
    sign.lookAt(0, s.topY + s.setbackH + 1.5, 4);
    group.add(sign);
  }

  // 4. Two Elevated Subterranean Viaduct Bridges + Hover-Tram Traffic
  const bridgeGeo = new THREE.BoxGeometry(2.6, 0.45, 36);
  const railGeo = new THREE.BoxGeometry(0.14, 0.22, 36);
  const pierGeo = new THREE.BoxGeometry(1.4, 30, 1.4);
  ownedGeos.push(bridgeGeo, railGeo, pierGeo);
  const trafficLanes: SubTrafficLane[] = [];
  for (const side of [-1, 1]) {
    const bx = side * 16.8;
    const by = -5.2;
    const bz = -11;
    const deck = new THREE.Mesh(bridgeGeo, bridgeDeckMat);
    deck.position.set(bx, by, bz);
    const railL = new THREE.Mesh(railGeo, side < 0 ? accentNeonMat : veinMat);
    railL.position.set(bx - 1.24, by + 0.3, bz);
    const railR = new THREE.Mesh(railGeo, side < 0 ? accentNeonMat : veinMat);
    railR.position.set(bx + 1.24, by + 0.3, bz);
    group.add(deck, railL, railR);

    for (const pz of [-24, -12, 0]) {
      const pier = new THREE.Mesh(pierGeo, rockMat);
      pier.position.set(bx, by - 15.2, pz);
      group.add(pier);
    }

    for (let t = 0; t < TRAFFIC_COUNT / 2; t++) {
      trafficLanes.push({
        x: bx + (t % 2 === 0 ? -0.55 : 0.55),
        y: by + 0.52 + (t % 3) * 0.28,
        zStart: -28,
        zSpan: 34,
        phase: (t / (TRAFFIC_COUNT / 2)) + (side > 0 ? 0.35 : 0),
        speed: 0.14 + (t % 3) * 0.04,
        dir: t % 2 === 0 ? 1 : -1,
      });
    }
  }

  const tramGeo = new THREE.BoxGeometry(0.38, 0.2, 1.35);
  ownedGeos.push(tramGeo);
  const trafficMesh = new THREE.InstancedMesh(tramGeo, accentNeonMat, trafficLanes.length);
  group.add(trafficMesh);

  // 5. Flanking Giant Rift Crystal Outcrops on Cavern Shelves
  const crystalGeo = new THREE.CylinderGeometry(0.28, 0.85, 5.2, 6);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x6d28d9,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.35,
    flatShading: true,
  });
  ownedGeos.push(crystalGeo);
  ownedMats.push(crystalMat);
  for (const side of [-1, 1]) {
    for (let c = 0; c < 4; c++) {
      const sp = new THREE.Mesh(crystalGeo, crystalMat);
      sp.position.set(side * (12.4 + c * 1.15), -3.2 + c * 0.4, -11.5 - c * 1.4);
      sp.rotation.set(-0.2 + c * 0.1, c * 0.8, side * (0.25 + c * 0.12));
      sp.scale.setScalar(0.85 + (c % 2) * 0.45);
      group.add(sp);
    }
  }

  // 6. Subterranean Chasm Mist Sheets
  const mistGeo = new THREE.PlaneGeometry(54, 54);
  const mistMat = new THREE.MeshBasicMaterial({
    map: getCityMistTexture('#7c3aed'),
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  ownedGeos.push(mistGeo);
  ownedMats.push(mistMat);
  const mistLower = new THREE.Mesh(mistGeo, mistMat);
  mistLower.rotation.x = -Math.PI / 2;
  mistLower.position.set(0, -11.5, -8);
  group.add(mistLower);

  let lowQuality = false;

  return {
    group,
    setAccentPalette: (primaryHex: string, secondaryHex: string) => {
      veinMat.color.set(primaryHex);
      accentNeonMat.color.set(secondaryHex);
      crystalMat.emissive.set(primaryHex);
      crystalMat.color.set(secondaryHex);
    },
    setLowQuality: (low: boolean) => {
      lowQuality = low;
      mistLower.visible = !low;
    },
    update: (_dt: number, elapsed: number) => {
      beaconMat.color.setHSL((elapsed * 0.12) % 1, 0.85, 0.62);
      if (lowQuality) {
        trafficMesh.visible = false;
        return;
      }
      trafficMesh.visible = true;
      for (let i = 0; i < trafficLanes.length; i++) {
        const lane = trafficLanes[i];
        const frac = (elapsed * lane.speed + lane.phase) % 1;
        const z = lane.dir > 0 ? lane.zStart + frac * lane.zSpan : lane.zStart + (1 - frac) * lane.zSpan;
        dummy.position.set(lane.x, lane.y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trafficMesh.setMatrixAt(i, dummy.matrix);
      }
      trafficMesh.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      stalactites.dispose();
      stalagmites.dispose();
      trafficMesh.dispose();
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      disposeObject3D(group);
    },
  };
}

export interface RiftEmberSeed {
  baseX: number;
  baseZ: number;
  phase: number;
  speed: number;
  radius: number;
}

function createRiftPlazaDeckTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  bg.addColorStop(0, '#1e1640');
  bg.addColorStop(0.58, '#14102b');
  bg.addColorStop(1, '#0b081b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const ringRadii = [84, 146, 198, 232];
  for (let i = 0; i < ringRadii.length; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(34, 211, 238, 0.34)' : 'rgba(168, 85, 247, 0.36)';
    ctx.lineWidth = i === 3 ? 4 : 2.2;
    ctx.beginPath();
    ctx.arc(256, 256, ringRadii[i], 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 86, 256 + Math.sin(a) * 86);
    ctx.lineTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(244, 114, 182, 0.55)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2 + 0.03;
    const a1 = ((i + 0.52) / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(256, 256, 244, a0, a1);
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
  g.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Builds the subterranean plaza hull, Stargate megastructure pylons, bollards, and rising dimensional embers. */
export function buildRiftPlazaArchitecture(ctx: {
  group: THREE.Group;
  armorMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  brightMat: THREE.MeshStandardMaterial;
  primaryNeonMat: THREE.MeshBasicMaterial;
  secondaryNeonMat: THREE.MeshBasicMaterial;
  daisSealMat: THREE.MeshBasicMaterial;
  shockwaveMat: THREE.MeshBasicMaterial;
  portalMat: THREE.ShaderMaterial;
  bossPosZ: number;
  bossDaisY: number;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedTexs: THREE.Texture[];
  createChamfer: (w: number, h: number, d: number, b: number, r: number) => THREE.BufferGeometry;
  createLathe: (pts: Array<[number, number]>, segs: number) => THREE.BufferGeometry;
  enableShadow: (obj: THREE.Object3D) => void;
}): {
  shockwaveRing: THREE.Mesh;
  emberPoints: THREE.Points;
  emberPosAttr: THREE.BufferAttribute;
  emberSeeds: RiftEmberSeed[];
} {
  const plazaTex = createRiftPlazaDeckTexture();
  if (plazaTex) ctx.ownedTexs.push(plazaTex);
  const plazaTopMat = new THREE.MeshStandardMaterial({
    color: plazaTex ? 0xffffff : 0x1a1633,
    ...(plazaTex ? { map: plazaTex } : {}),
    roughness: 0.52,
    metalness: 0.28,
    flatShading: true,
  });
  ctx.ownedMats.push(plazaTopMat);

  const deckTopGeo = new THREE.CylinderGeometry(9.9, 9.7, 0.22, 24);
  const deckTop = new THREE.Mesh(deckTopGeo, plazaTopMat);
  deckTop.position.set(0, -0.11, 0);
  deckTop.receiveShadow = true;

  const underHullGeo = ctx.createLathe(
    [
      [0.01, -3.85],
      [4.2, -3.85],
      [5.9, -2.65],
      [7.75, -1.55],
      [9.45, -0.58],
      [10.02, -0.18],
      [9.88, -0.04],
      [0.01, -0.04],
    ],
    16
  );
  const underHull = new THREE.Mesh(underHullGeo, ctx.armorMat);
  underHull.receiveShadow = true;

  const rimGeo = new THREE.RingGeometry(9.25, 9.65, 32);
  const rim = new THREE.Mesh(rimGeo, ctx.secondaryNeonMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(0, 0.015, 0);

  const bollardGeo = ctx.createChamfer(0.68, 0.48, 0.54, 0.1, 0.02);
  const bollardCapGeo = new THREE.BoxGeometry(0.46, 0.06, 0.14);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.cos(ang) * 9.5;
    const bz = Math.sin(ang) * 9.5;
    const bollard = new THREE.Mesh(bollardGeo, ctx.steelMat);
    bollard.position.set(bx, 0.22, bz);
    bollard.rotation.y = -ang + Math.PI / 2;
    ctx.enableShadow(bollard);

    const cap = new THREE.Mesh(bollardCapGeo, i % 2 === 0 ? ctx.secondaryNeonMat : ctx.primaryNeonMat);
    cap.position.set(bx, 0.48, bz);
    cap.rotation.y = -ang + Math.PI / 2;
    ctx.group.add(bollard, cap);
  }

  const daisGeo = ctx.createLathe(
    [
      [0.01, 0],
      [3.42, 0],
      [3.3, 0.24],
      [3.08, 0.28],
      [2.92, ctx.bossDaisY],
      [0.01, ctx.bossDaisY],
    ],
    24
  );
  const dais = new THREE.Mesh(daisGeo, ctx.armorMat);
  dais.position.set(0, 0, ctx.bossPosZ);
  ctx.enableShadow(dais);

  const cleatGeo = ctx.createChamfer(0.44, 0.28, 0.52, 0.08, 0.02);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cleat = new THREE.Mesh(cleatGeo, ctx.brightMat);
    cleat.position.set(Math.cos(ang) * 3.24, 0.14, ctx.bossPosZ + Math.sin(ang) * 3.24);
    cleat.rotation.y = -ang + Math.PI / 2;
    ctx.enableShadow(cleat);
    ctx.group.add(cleat);
  }

  const sealGeo = new THREE.RingGeometry(2.15, 2.58, 32);
  const seal = new THREE.Mesh(sealGeo, ctx.daisSealMat);
  seal.rotation.x = -Math.PI / 2;
  seal.position.set(0, ctx.bossDaisY + 0.02, ctx.bossPosZ);

  const shockGeo = new THREE.RingGeometry(2.7, 3.25, 40);
  const shockwaveRing = new THREE.Mesh(shockGeo, ctx.shockwaveMat);
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.position.set(0, 0.05, ctx.bossPosZ);

  // Vertical Dimensional Stargate + Flanking Megastructure Pylons (strictly architectural)
  const portalArchGeo = new THREE.TorusGeometry(4.4, 0.28, 10, 40);
  const portalArch = new THREE.Mesh(portalArchGeo, ctx.steelMat);
  portalArch.position.set(0, 4.4, -7.8);
  const portalTrimGeo = new THREE.TorusGeometry(4.68, 0.08, 8, 40);
  const portalTrim = new THREE.Mesh(portalTrimGeo, ctx.secondaryNeonMat);
  portalTrim.position.set(0, 4.4, -7.76);
  const portalPlaneGeo = new THREE.PlaneGeometry(8.6, 8.6);
  const portalPlane = new THREE.Mesh(portalPlaneGeo, ctx.portalMat);
  portalPlane.position.set(0, 4.4, -7.82);

  const pylonPlinthGeo = ctx.createChamfer(1.8, 1.3, 1.9, 0.2, 0.04);
  const pylonBodyGeo = ctx.createChamfer(1.18, 8.2, 1.36, 0.18, 0.04);
  const pylonStripGeo = new THREE.BoxGeometry(0.14, 7.2, 0.12);
  const pylonCrystalGeo = new THREE.OctahedronGeometry(0.46, 0);
  pylonCrystalGeo.scale(0.85, 1.55, 0.85);
  const lintelGeo = ctx.createChamfer(11.6, 0.72, 1.18, 0.14, 0.03);
  const lintelStripGeo = new THREE.BoxGeometry(9.6, 0.12, 0.12);

  const lintel = new THREE.Mesh(lintelGeo, ctx.armorMat);
  lintel.position.set(0, 8.75, -7.75);
  const lintelStrip = new THREE.Mesh(lintelStripGeo, ctx.primaryNeonMat);
  lintelStrip.position.set(0, 8.75, -7.14);

  for (const side of [-1, 1] as const) {
    const px = side * 5.2;
    const plinth = new THREE.Mesh(pylonPlinthGeo, ctx.armorMat);
    plinth.position.set(px, 0.65, -7.75);
    const tower = new THREE.Mesh(pylonBodyGeo, ctx.steelMat);
    tower.position.set(px, 4.5, -7.75);
    const strip = new THREE.Mesh(pylonStripGeo, side < 0 ? ctx.secondaryNeonMat : ctx.primaryNeonMat);
    strip.position.set(px - side * 0.45, 4.5, -7.02);
    const capGem = new THREE.Mesh(pylonCrystalGeo, side < 0 ? ctx.secondaryNeonMat : ctx.primaryNeonMat);
    capGem.position.set(px, 9.25, -7.75);
    ctx.enableShadow(plinth);
    ctx.enableShadow(tower);
    ctx.group.add(plinth, tower, strip, capGem);
  }

  ctx.ownedGeos.push(
    deckTopGeo,
    underHullGeo,
    rimGeo,
    bollardGeo,
    bollardCapGeo,
    daisGeo,
    cleatGeo,
    sealGeo,
    shockGeo,
    portalArchGeo,
    portalTrimGeo,
    portalPlaneGeo,
    pylonPlinthGeo,
    pylonBodyGeo,
    pylonStripGeo,
    pylonCrystalGeo,
    lintelGeo,
    lintelStripGeo
  );
  ctx.group.add(
    deckTop,
    underHull,
    rim,
    dais,
    seal,
    shockwaveRing,
    portalArch,
    portalTrim,
    portalPlane,
    lintel,
    lintelStrip
  );

  // Rising subterranean Rift embers (THREE.Points)
  const emberCount = 44;
  const emberArr = new Float32Array(emberCount * 3);
  const emberSeeds: RiftEmberSeed[] = [];
  for (let i = 0; i < emberCount; i++) {
    const ang = (i / emberCount) * Math.PI * 2 + (i % 3) * 0.4;
    const rad = 7.2 + (i % 5) * 1.15;
    const bx = Math.cos(ang) * rad;
    const bz = Math.sin(ang) * rad - 1.2;
    emberSeeds.push({
      baseX: bx,
      baseZ: bz,
      phase: i * 0.37,
      speed: 0.35 + (i % 4) * 0.12,
      radius: 0.25 + (i % 3) * 0.14,
    });
    emberArr[i * 3] = bx;
    emberArr[i * 3 + 1] = (i % 10) * 0.85;
    emberArr[i * 3 + 2] = bz;
  }
  const emberGeo = new THREE.BufferGeometry();
  const emberPosAttr = new THREE.BufferAttribute(emberArr, 3);
  emberGeo.setAttribute('position', emberPosAttr);
  const emberTex = createRiftEmberTexture();
  if (emberTex) ctx.ownedTexs.push(emberTex);
  const emberMat = new THREE.PointsMaterial({
    color: 0xa5f3fc,
    size: 0.32,
    ...(emberTex ? { map: emberTex } : {}),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  ctx.ownedGeos.push(emberGeo);
  ctx.ownedMats.push(emberMat);
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  ctx.group.add(emberPoints);

  return { shockwaveRing, emberPoints, emberPosAttr, emberSeeds };
}
