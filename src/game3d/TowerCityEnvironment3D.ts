import * as THREE from 'three';
import { createChamferSlabGeometry, enableShadows } from './MeshHelpers3D';
import {
  createAsphaltHighwayTexture,
  createCraterBedTexture,
  createCyberCitySkyTexture,
  createGuardrailBeamGeometry,
  createHoledHighwayGeometry,
  createJaggedCraterFissureGeometries,
} from './TowerCityAssets3D';
import { buildTowerRuinedSkyscrapers } from './TowerCitySkyscrapers3D';

export interface TowerCityEnvironmentHandle {
  group: THREE.Group;
  setBossState: (isBossWave: boolean, isBossMode: boolean, anomalyColorHex: string) => void;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface FlickerLightRef {
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
  baseIntensity: number;
}

const ARENA_CENTER_Z = -1.6;
const CRATER_FLOOR_Y = 0.08;
const ROAD_Y = 0.52;
const SIDEWALK_Y = 0.88;
const HIGHWAY_HALF_W = 7.4;
const CRATER_FLOOR_R = 6.8;
const CRATER_HOLE_R = 7.25;

function createExtrudedChamferSlab(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.025
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel, {
    minInnerH: 0.02,
    maxChamferRatio: 0.4,
  });
}

/**
 * Builds the procedural "Ruined Cyber City & Deep Central Meteor Crater" environment
 * for Battle Tower while preserving exact gameplay surface y = 0.08 inside the crater.
 */
export function createTowerCityEnvironment(): TowerCityEnvironmentHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const flickers: FlickerLightRef[] = [];

  // Shared Materials
  const roadFoundationMat = new THREE.MeshStandardMaterial({
    color: 0x0b101b,
    roughness: 0.9,
    metalness: 0.12,
    flatShading: true,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.08,
  });
  const asphaltTex = createAsphaltHighwayTexture();
  if (asphaltTex) {
    asphaltMat.map = asphaltTex;
    ownedTextures.push(asphaltTex);
  } else {
    asphaltMat.color.setHex(0x131a29);
  }

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x2b3447,
    roughness: 0.86,
    metalness: 0.08,
    flatShading: true,
  });
  const concreteDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1a2130,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const rebarMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.64,
    metalness: 0.74,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.36,
    metalness: 0.82,
    flatShading: true,
  });
  const guardrailMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.32,
    metalness: 0.85,
    flatShading: true,
  });
  const skyscraperMat = new THREE.MeshStandardMaterial({
    color: 0x0b1222,
    roughness: 0.62,
    metalness: 0.42,
    flatShading: true,
  });
  const skyscraperAltMat = new THREE.MeshStandardMaterial({
    color: 0x141d31,
    roughness: 0.68,
    metalness: 0.36,
    flatShading: true,
  });
  const scorchedRockMat = new THREE.MeshStandardMaterial({
    color: 0x151822,
    roughness: 0.94,
    metalness: 0.06,
    flatShading: true,
  });
  const basaltStepMat = new THREE.MeshStandardMaterial({
    color: 0x1d2332,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const charredFissureMat = new THREE.MeshStandardMaterial({
    color: 0x050609,
    roughness: 0.96,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    flatShading: true,
  });
  const emberSeamMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    emissive: 0xc2410c,
    emissiveIntensity: 0.34,
    roughness: 0.65,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    flatShading: true,
  });

  // =========================================================================
  // 1. CYBER NIGHT SKY & GROUND SKIRT
  // =========================================================================
  const skyTex = createCyberCitySkyTexture();
  if (skyTex) ownedTextures.push(skyTex);

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(96, 32, 20),
    new THREE.MeshBasicMaterial({
      ...(skyTex ? { map: skyTex } : {}),
      color: skyTex ? 0xffffff : 0x040918,
      side: THREE.BackSide,
      fog: false,
    })
  );
  group.add(skyDome);

  const cityGroundSkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 120),
    new THREE.MeshStandardMaterial({ color: 0x040711, roughness: 0.96, metalness: 0.05 })
  );
  cityGroundSkirt.rotation.x = -Math.PI / 2;
  cityGroundSkirt.position.set(0, -0.55, -16);
  group.add(cityGroundSkirt);

  // =========================================================================
  // 2. RAISED SHATTERED HIGHWAY (y = 0.52) WITH TRUE 3D CENTRAL CRATER HOLE (y = 0.08)
  // =========================================================================
  const roadZMin = -44;
  const roadZMax = 14;
  const holedHighwayGeo = createHoledHighwayGeometry(
    HIGHWAY_HALF_W,
    roadZMin,
    roadZMax,
    ARENA_CENTER_Z,
    CRATER_HOLE_R
  );
  // Multi-material or clean asphalt top + dark foundation sides
  const highwayMesh = new THREE.Mesh(holedHighwayGeo, [asphaltMat, roadFoundationMat]);
  highwayMesh.receiveShadow = true;
  highwayMesh.castShadow = true;
  group.add(highwayMesh);

  // Sub-foundation under roadway outside hole (y = -0.55 .. 0.08)
  const underBase = new THREE.Mesh(
    new THREE.BoxGeometry(HIGHWAY_HALF_W * 2 + 6.4, 0.63, roadZMax - roadZMin),
    roadFoundationMat
  );
  underBase.position.set(0, CRATER_FLOOR_Y - 0.316, (roadZMin + roadZMax) * 0.5);
  underBase.receiveShadow = true;
  group.add(underBase);

  // Deep Scorched Crater Floor Basin strictly at gameplay y = 0.08 (r = 7.4 overlaps safely under stepped rim walls)
  const craterTex = createCraterBedTexture();
  if (craterTex) ownedTextures.push(craterTex);

  const craterBedMat = new THREE.MeshStandardMaterial({
    ...(craterTex ? { map: craterTex } : {}),
    color: craterTex ? 0xffffff : 0x0b101b,
    roughness: 0.92,
    metalness: 0.08,
  });
  const craterGroup = new THREE.Group();
  craterGroup.position.set(0, CRATER_FLOOR_Y, ARENA_CENTER_Z);
  group.add(craterGroup);

  const craterFloorMesh = new THREE.Mesh(new THREE.CircleGeometry(7.6, 36), craterBedMat);
  craterFloorMesh.rotation.x = -Math.PI / 2;
  craterFloorMesh.position.y = 0.002;
  craterFloorMesh.receiveShadow = true;
  craterGroup.add(craterFloorMesh);

  // Natural Branching Jagged Ground Fissures (Charred Rock + Muted Deep-Core Magma Embers) flush on Crater Floor
  const { charredGeo, emberGeo } = createJaggedCraterFissureGeometries();
  const charredFissures = new THREE.Mesh(charredGeo, charredFissureMat);
  charredFissures.receiveShadow = true;
  const emberSeams = new THREE.Mesh(emberGeo, emberSeamMat);
  craterGroup.add(charredFissures, emberSeams);

  // Stepped Basalt Crater Inner Wall Terraces Descending from ROAD_Y (0.52) down to CRATER_FLOOR_Y (0.08)
  // Keeps r_inner >= 6.82 so summon pads (r = 6.3) and wave ores (r <= 4.46) stand completely free inside the bowl!
  const wallSegments = 28;
  const rockWallGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const rimBlockData: { pos: THREE.Vector3; scale: THREE.Vector3; rot: THREE.Euler; dark: boolean }[] = [];

  for (let i = 0; i < wallSegments; i++) {
    const ang = (i / wallSegments) * Math.PI * 2;
    const isFrontCameraArc = Math.sin(ang) > 0.35; // Keep front camera edge lower & cleaner
    const jag = Math.sin(i * 2.7) * 0.18;

    // Lower inner rock step (r ≈ 6.95, height 0.24 from y=0.08 up to 0.32)
    const rStep1 = CRATER_FLOOR_R + 0.24 + jag;
    rimBlockData.push({
      pos: new THREE.Vector3(Math.cos(ang) * rStep1, 0.1, Math.sin(ang) * rStep1),
      scale: new THREE.Vector3(0.95, 0.22, 0.82),
      rot: new THREE.Euler(i * 0.3, -ang, (i % 3) * 0.15),
      dark: i % 2 === 0,
    });

    // Upper rim rock wall rising to road lip (y = 0.32 .. 0.62, higher on rear & sides!)
    const rStep2 = CRATER_HOLE_R + 0.15 + jag;
    const rimH = isFrontCameraArc ? 0.26 : 0.44 + (i % 3) * 0.14;
    rimBlockData.push({
      pos: new THREE.Vector3(Math.cos(ang) * rStep2, 0.26 + rimH * 0.45, Math.sin(ang) * rStep2),
      scale: new THREE.Vector3(1.08, rimH, 0.92),
      rot: new THREE.Euler((i % 2) * 0.22, -ang + 0.2, -0.18),
      dark: i % 3 === 0,
    });

    // Tilted Upturned Broken Asphalt Slabs Around Crater Lip (skip camera center front so sightline is pristine)
    if (!isFrontCameraArc || Math.abs(Math.cos(ang)) > 0.62) {
      const rSlab = CRATER_HOLE_R + 0.32 + (i % 2) * 0.18;
      const slab = new THREE.Mesh(
        createExtrudedChamferSlab(1.65 + (i % 2) * 0.35, 0.15, 1.15, 0.14, 0.018),
        concreteDarkMat
      );
      slab.position.set(Math.cos(ang) * rSlab, ROAD_Y - CRATER_FLOOR_Y - 0.05, Math.sin(ang) * rSlab);
      slab.lookAt(0, slab.position.y, 0);
      slab.rotateX(-0.36 - (i % 3) * 0.09);
      enableShadows(slab);
      craterGroup.add(slab);
    }
  }

  for (const rb of rimBlockData) {
    const boulder = new THREE.Mesh(rockWallGeo, rb.dark ? scorchedRockMat : basaltStepMat);
    boulder.position.copy(rb.pos);
    boulder.scale.copy(rb.scale);
    boulder.rotation.copy(rb.rot);
    enableShadows(boulder);
    craterGroup.add(boulder);
  }

  // =========================================================================
  // 3. RAISED SIDEWALKS (y = 0.88), GUARDRAILS, ROAD DEBRIS & STREETLIGHTS
  // =========================================================================
  const sidewalkSegments: [number, number, number][] = [
    [9.4, 6.8, 0],
    [2.6, 5.4, 0.02],
    [-4.2, 5.6, -0.03],
    [-11.0, 6.4, 0.015],
    [-18.2, 7.8, -0.02],
    [-27.0, 9.2, 0],
    [-37.5, 10.6, 0],
  ];
  for (const sideSign of [-1, 1]) {
    for (const [cz, len, tilt] of sidewalkSegments) {
      const slab = new THREE.Mesh(
        createExtrudedChamferSlab(3.0, 0.38, len, 0.08, 0.025),
        concreteMat
      );
      slab.position.set(sideSign * (HIGHWAY_HALF_W + 1.5), ROAD_Y - 0.02, cz);
      slab.rotation.z = sideSign * tilt;
      enableShadows(slab);
      group.add(slab);
    }

    // Dented & Interrupted Metal Guardrails along x = ±(HIGHWAY_HALF_W + 0.2)
    const guardrailSegments: { z: number; len: number; yaw: number; roll: number; pitch: number }[] = [
      { z: 9.2, len: 5.2, yaw: 0.02, roll: 0, pitch: 0 },
      { z: 4.0, len: 2.8, yaw: -0.16 * sideSign, roll: 0.24 * sideSign, pitch: 0.08 },
      // Blown out across the crater blast!
      { z: -7.4, len: 3.4, yaw: 0.2 * sideSign, roll: -0.26 * sideSign, pitch: -0.07 },
      { z: -13.8, len: 6.4, yaw: -0.03, roll: 0.04, pitch: 0 },
      { z: -21.8, len: 6.8, yaw: 0.02, roll: 0, pitch: 0 },
      { z: -30.0, len: 6.8, yaw: 0, roll: 0, pitch: 0 },
    ];
    const postGeo = new THREE.BoxGeometry(0.11, 0.62, 0.11);
    for (const seg of guardrailSegments) {
      const railGroup = new THREE.Group();
      railGroup.position.set(sideSign * (HIGHWAY_HALF_W + 0.18), SIDEWALK_Y, seg.z);
      railGroup.rotation.set(seg.pitch, seg.yaw, seg.roll);

      const beam = new THREE.Mesh(createGuardrailBeamGeometry(seg.len), guardrailMat);
      beam.position.y = 0.46;
      enableShadows(beam);
      railGroup.add(beam);

      const postCount = Math.max(2, Math.round(seg.len / 1.7));
      for (let p = 0; p < postCount; p++) {
        const pz = -seg.len * 0.45 + (p / Math.max(1, postCount - 1)) * seg.len * 0.9;
        const post = new THREE.Mesh(postGeo, steelMat);
        post.position.set(-sideSign * 0.04, 0.29, pz);
        enableShadows(post);
        railGroup.add(post);
      }
      group.add(railGroup);
    }
  }

  // Tilted Cyberpunk Streetlights on Sidewalks (y = SIDEWALK_Y)
  const poleBaseGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.32, 6);
  const poleShaftGeo = new THREE.CylinderGeometry(0.075, 0.11, 3.85, 6);
  const armGeo = new THREE.BoxGeometry(1.15, 0.1, 0.12);
  const hoodGeo = new THREE.BoxGeometry(0.58, 0.12, 0.26);
  const bulbGeo = new THREE.BoxGeometry(0.48, 0.06, 0.18);

  const streetlightSpecs: { side: -1 | 1; z: number; tiltZ: number; tiltX: number; cyan: boolean; flicker: boolean }[] = [
    { side: -1, z: 5.4, tiltZ: -0.05, tiltX: 0.03, cyan: true, flicker: false },
    { side: 1, z: 5.4, tiltZ: 0.16, tiltX: -0.04, cyan: false, flicker: true },
    { side: -1, z: -1.6, tiltZ: -0.28, tiltX: 0.12, cyan: true, flicker: true },
    { side: 1, z: -1.6, tiltZ: 0.24, tiltX: -0.1, cyan: true, flicker: false },
    { side: -1, z: -8.8, tiltZ: -0.09, tiltX: -0.05, cyan: false, flicker: true },
    { side: 1, z: -8.8, tiltZ: 0.04, tiltX: 0.02, cyan: true, flicker: false },
    { side: -1, z: -16.8, tiltZ: -0.03, tiltX: 0.02, cyan: true, flicker: false },
    { side: 1, z: -16.8, tiltZ: 0.12, tiltX: 0.04, cyan: false, flicker: false },
  ];

  for (let idx = 0; idx < streetlightSpecs.length; idx++) {
    const spec = streetlightSpecs[idx];
    const lampGroup = new THREE.Group();
    lampGroup.position.set(spec.side * (HIGHWAY_HALF_W + 1.05), SIDEWALK_Y, spec.z);
    lampGroup.rotation.set(spec.tiltX, 0, spec.tiltZ);

    const base = new THREE.Mesh(poleBaseGeo, concreteDarkMat);
    base.position.y = 0.16;
    const shaft = new THREE.Mesh(poleShaftGeo, steelMat);
    shaft.position.y = 2.05;
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(-spec.side * 0.5, 3.88, 0);
    const hood = new THREE.Mesh(hoodGeo, concreteDarkMat);
    hood.position.set(-spec.side * 1.0, 3.85, 0);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: spec.cyan ? 0x22d3ee : 0xf59e0b,
      emissive: spec.cyan ? 0x06b6d4 : 0xd97706,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(bulbGeo, tubeMat);
    bulb.position.set(-spec.side * 1.0, 3.78, 0);

    enableShadows(base);
    enableShadows(shaft);
    enableShadows(arm);
    lampGroup.add(base, shaft, arm, hood, bulb);
    group.add(lampGroup);

    if (spec.flicker) {
      flickers.push({
        mat: tubeMat,
        phase: idx * 1.9,
        speed: 7.5 + idx * 1.7,
        baseIntensity: 1.35,
      });
    }
  }

  // Cracked Tilted Road Slabs & Concrete/Rebar Rubble along Upper Highway & Sidewalks
  const roadDebrisPositions: [number, number, number, number, number][] = [
    [-6.2, 7.6, 1.4, 0.95, 0.2],
    [6.1, 7.4, 1.3, 0.9, -0.18],
    [-5.8, -10.4, 1.55, 1.1, 0.25],
    [5.9, -10.8, 1.45, 1.05, -0.22],
    [-2.4, -12.6, 1.4, 1.0, 0.15],
    [2.8, -13.2, 1.5, 1.05, -0.17],
  ];
  for (const [dx, dz, w, d, tilt] of roadDebrisPositions) {
    const slab = new THREE.Mesh(
      createExtrudedChamferSlab(w, 0.12, d, 0.12, 0.015),
      concreteDarkMat
    );
    slab.position.set(dx, ROAD_Y, dz);
    slab.rotation.set(tilt * 0.5, dx * 0.4, tilt);
    enableShadows(slab);
    group.add(slab);
  }

  const rubbleData: [number, number, number, number][] = [
    [-7.6, 4.4, 0.3, SIDEWALK_Y],
    [-7.3, -1.6, 0.36, SIDEWALK_Y],
    [-7.6, -7.2, 0.32, SIDEWALK_Y],
    [7.6, 4.1, 0.3, SIDEWALK_Y],
    [7.3, -1.6, 0.36, SIDEWALK_Y],
    [7.6, -7.0, 0.32, SIDEWALK_Y],
    [-4.2, -9.2, 0.36, ROAD_Y],
    [4.2, -9.1, 0.36, ROAD_Y],
    [0.2, -9.6, 0.4, ROAD_Y],
    [-6.6, 6.4, 0.34, ROAD_Y],
    [6.6, 6.2, 0.34, ROAD_Y],
  ];
  const rubbleInst = new THREE.InstancedMesh(rockWallGeo, concreteMat, rubbleData.length);
  rubbleInst.castShadow = true;
  rubbleInst.receiveShadow = true;

  const rebarGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.72, 5);
  const rebarInst = new THREE.InstancedMesh(rebarGeo, rebarMat, rubbleData.length * 2);
  rebarInst.castShadow = true;

  const dummy = new THREE.Object3D();
  rubbleData.forEach(([rx, rz, sc, baseY], idx) => {
    dummy.position.set(rx, baseY + sc * 0.45, rz);
    dummy.rotation.set(idx * 0.7, idx * 1.1, idx * 0.4);
    dummy.scale.set(sc * 1.2, sc * 0.85, sc);
    dummy.updateMatrix();
    rubbleInst.setMatrixAt(idx, dummy.matrix);

    for (let r = 0; r < 2; r++) {
      const rIdx = idx * 2 + r;
      dummy.position.set(rx + (r === 0 ? -0.08 : 0.1), baseY + 0.26, rz + (r === 0 ? 0.06 : -0.07));
      dummy.rotation.set(0.35 * (r === 0 ? 1 : -1), idx, 0.42 * (rx > 0 ? -1 : 1));
      dummy.scale.set(1, 0.85 + r * 0.25, 1);
      dummy.updateMatrix();
      rebarInst.setMatrixAt(rIdx, dummy.matrix);
    }
  });
  rubbleInst.instanceMatrix.needsUpdate = true;
  rebarInst.instanceMatrix.needsUpdate = true;
  group.add(rubbleInst, rebarInst);

  buildTowerRuinedSkyscrapers({
    group,
    ownedTextures,
    flickers,
    concreteMat,
    concreteDarkMat,
    rebarMat,
    steelMat,
    skyscraperMat,
    skyscraperAltMat,
  });

  // =========================================================================
  // 4b. ATMOSPHERIC ARENA PARTICLES: CRATER EMBERS, ASH FLAKES & ELECTRIC SPARKS
  // =========================================================================
  interface EmberParticleSeed {
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
    swirlAmp: number;
    maxH: number;
    baseScale: number;
  }
  const EMBER_COUNT = 26;
  const emberSeeds: EmberParticleSeed[] = [];
  for (let i = 0; i < EMBER_COUNT; i++) {
    const ang = ((i * 137.5) % 360) * (Math.PI / 180);
    const rad = 0.45 + ((i * 29) % 100) / 100 * 2.95;
    emberSeeds.push({
      baseX: Math.cos(ang) * rad,
      baseZ: ARENA_CENTER_Z + Math.sin(ang) * rad,
      phase: (i / EMBER_COUNT) * 6.28,
      speed: 0.24 + (i % 5) * 0.055,
      swirlAmp: 0.14 + (i % 3) * 0.07,
      maxH: 1.9 + (i % 4) * 0.42,
      baseScale: 0.042 + (i % 3) * 0.014,
    });
  }
  const emberParticleGeo = new THREE.OctahedronGeometry(1.0, 0);
  const emberParticleMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberInst = new THREE.InstancedMesh(emberParticleGeo, emberParticleMat, EMBER_COUNT);
  group.add(emberInst);

  interface AshParticleSeed {
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
    driftAmp: number;
    maxH: number;
    rotSpeed: number;
    baseScale: number;
  }
  const ASH_COUNT = 24;
  const ashSeeds: AshParticleSeed[] = [];
  for (let i = 0; i < ASH_COUNT; i++) {
    const ang = ((i * 97.3 + 22) % 360) * (Math.PI / 180);
    const rad = 1.1 + ((i * 43) % 100) / 100 * 5.2;
    ashSeeds.push({
      baseX: Math.cos(ang) * rad,
      baseZ: ARENA_CENTER_Z + Math.sin(ang) * rad,
      phase: (i / ASH_COUNT) * 5.5,
      speed: 0.14 + (i % 4) * 0.035,
      driftAmp: 0.35 + (i % 3) * 0.15,
      maxH: 3.4 + (i % 3) * 0.65,
      rotSpeed: 1.2 + (i % 4) * 0.45,
      baseScale: 0.055 + (i % 3) * 0.016,
    });
  }
  const ashFlakeGeo = new THREE.BoxGeometry(1.2, 0.18, 0.85);
  const ashFlakeMat = new THREE.MeshBasicMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const ashInst = new THREE.InstancedMesh(ashFlakeGeo, ashFlakeMat, ASH_COUNT);
  group.add(ashInst);

  // Brief Bright-Blue Electrical Arc Sparks near Tilted Streetlights & Broken Guardrails
  const sparkBoltPositions: [number, number][] = [
    [0, 0],
    [0.14, 0.12],
    [-0.08, 0.24],
    [0.16, 0.36],
    [-0.04, 0.48],
  ];
  const sparkVerts: number[] = [];
  for (let i = 0; i < sparkBoltPositions.length - 1; i++) {
    const [x0, y0] = sparkBoltPositions[i];
    const [x1, y1] = sparkBoltPositions[i + 1];
    const hw = 0.022;
    sparkVerts.push(
      x0 - hw, y0, 0,
      x1 - hw * 0.6, y1, 0,
      x0 + hw, y0, 0,
      x0 + hw, y0, 0,
      x1 - hw * 0.6, y1, 0,
      x1 + hw * 0.6, y1, 0
    );
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkVerts, 3));
  sparkGeo.computeVertexNormals();

  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  interface ElectricSparkNode {
    group: THREE.Group;
    phase: number;
    period: number;
  }
  const electricSparks: ElectricSparkNode[] = [];
  const sparkAnchors: [number, number, number][] = [
    [-6.42, 4.18, 5.4], // Tilted left front streetlight
    [6.42, 4.12, 5.4], // Tilted right front streetlight
    [-6.25, 3.92, -1.6], // Heavily tilted left crater streetlight
    [6.32, 3.98, -1.6], // Tilted right crater streetlight
    [-6.68, 1.24, 3.6], // Snapped left guardrail end
    [6.68, 1.24, 3.8], // Snapped right guardrail end
    [-6.68, 1.22, -6.8], // Broken left rear guardrail
    [6.68, 1.22, -6.8], // Broken right rear guardrail
  ];
  sparkAnchors.forEach(([sx, sy, sz], idx) => {
    const sg = new THREE.Group();
    sg.position.set(sx, sy, sz);
    const arc1 = new THREE.Mesh(sparkGeo, sparkMat);
    const arc2 = new THREE.Mesh(sparkGeo, sparkMat);
    arc2.rotation.z = 1.9;
    arc2.scale.setScalar(0.75);
    sg.add(arc1, arc2);
    sg.visible = false;
    group.add(sg);
    electricSparks.push({
      group: sg,
      phase: idx * 1.13,
      period: 2.3 + (idx % 4) * 0.65,
    });
  });

  const particleDummy = new THREE.Object3D();

  // =========================================================================
  // 5. STATE REACTIVITY & ANIMATION UPDATE & FULL CLEANUP
  // =========================================================================
  let bossEmberBoost = 0;

  const setBossState = (
    isBossWave: boolean,
    isBossMode: boolean,
    _anomalyColorHex: string
  ): void => {
    bossEmberBoost = isBossWave ? (isBossMode ? 0.22 : 0.14) : 0;
  };

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    for (const fl of flickers) {
      const wave = Math.sin(t * fl.speed + fl.phase) * Math.sin(t * (fl.speed * 0.37) + fl.phase);
      fl.mat.emissiveIntensity = wave > 0.55 ? fl.baseIntensity * 0.28 : fl.baseIntensity;
    }

    emberSeamMat.emissiveIntensity = 0.32 + bossEmberBoost + Math.sin(t * 1.9) * 0.08;

    // Update rising orange-red crater fire embers (rise -> taper/dim smoothly)
    for (let i = 0; i < EMBER_COUNT; i++) {
      const e = emberSeeds[i];
      const life = ((t * e.speed + e.phase) % 1 + 1) % 1;
      const y = CRATER_FLOOR_Y + 0.02 + life * e.maxH;
      const fadeScale = e.baseScale * Math.sin(life * Math.PI);
      particleDummy.position.set(
        e.baseX + Math.sin(t * 1.8 + e.phase) * e.swirlAmp,
        y,
        e.baseZ + Math.cos(t * 1.5 + e.phase) * e.swirlAmp
      );
      particleDummy.rotation.set(t * 1.6 + i, t * 2.1, 0);
      particleDummy.scale.setScalar(Math.max(0.001, fadeScale));
      particleDummy.updateMatrix();
      emberInst.setMatrixAt(i, particleDummy.matrix);
    }
    emberInst.instanceMatrix.needsUpdate = true;

    // Update thin dark drifting ash flakes
    for (let i = 0; i < ASH_COUNT; i++) {
      const a = ashSeeds[i];
      const life = ((t * a.speed + a.phase) % 1 + 1) % 1;
      const fadeScale = a.baseScale * Math.min(1, Math.sin(life * Math.PI) * 1.35);
      particleDummy.position.set(
        a.baseX + Math.sin(t * 0.85 + a.phase) * a.driftAmp,
        CRATER_FLOOR_Y + 0.15 + life * a.maxH,
        a.baseZ + Math.cos(t * 0.72 + a.phase) * a.driftAmp
      );
      particleDummy.rotation.set(t * a.rotSpeed, t * a.rotSpeed * 0.7, t * 0.5 + i);
      particleDummy.scale.setScalar(Math.max(0.001, fadeScale));
      particleDummy.updateMatrix();
      ashInst.setMatrixAt(i, particleDummy.matrix);
    }
    ashInst.instanceMatrix.needsUpdate = true;

    // Brief random bright-blue electrical sparks near damaged streetlights & guardrails
    for (let i = 0; i < electricSparks.length; i++) {
      const sp = electricSparks[i];
      const localCycle = (t + sp.phase) % sp.period;
      const active = localCycle < 0.14 || (localCycle > 0.22 && localCycle < 0.3);
      sp.group.visible = active;
      if (active) {
        sp.group.rotation.set(
          Math.sin(t * 47 + i) * 0.8,
          Math.cos(t * 53 + i) * Math.PI,
          Math.sin(t * 61 + i) * 1.4
        );
      }
    }
  };

  const dispose = (): void => {
    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();

    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!disposedGeos.has(child.geometry)) {
        disposedGeos.add(child.geometry);
        child.geometry.dispose();
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (disposedMats.has(mat)) continue;
        disposedMats.add(mat);
        mat.dispose();
      }
    });

    for (const tex of ownedTextures) {
      tex.dispose();
    }
  };

  return {
    group,
    setBossState,
    update,
    dispose,
  };
}
