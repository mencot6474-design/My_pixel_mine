import * as THREE from 'three';
import { createChamferSlabGeometry, enableShadows } from './MeshHelpers3D';
import {
  createAsphaltHighwayTexture,
  createCyberCitySkyTexture,
  createGuardrailBeamGeometry,
  createJaggedCraterFissureGeometries,
  createOverpassCourtTexture,
  createOverpassPlazaHullGeometry,
} from './TowerCityAssets3D';
import { buildTowerRuinedSkyscrapers } from './TowerCitySkyscrapers3D';

export interface TowerCityEnvironmentHandle {
  group: THREE.Group;
  setBossState: (isBossWave: boolean, isBossMode: boolean, anomalyColorHex: string) => void;
  setLowQuality?: (low: boolean) => void;
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
const HIGHWAY_HALF_W = 8.4;
const PLAZA_FLOOR_R = 10.2;
const PLAZA_OUTER_R = 11.45;

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
 * Builds the procedural "Wide-Open Apex Sky-Overpass Colosseum & Ruined Cyber City" environment
 * for Battle Tower while preserving exact gameplay surface y = 0.08 across the open plaza.
 */
export function createTowerCityEnvironment(): TowerCityEnvironmentHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const flickers: FlickerLightRef[] = [];

  // Shared Materials (bright sunlit daytime ruined city palette)
  const roadFoundationMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
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
    asphaltMat.color.setHex(0x475569);
  }

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.86,
    metalness: 0.08,
    flatShading: true,
  });
  const concreteDarkMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const rebarMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.64,
    metalness: 0.74,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.36,
    metalness: 0.82,
    flatShading: true,
  });
  const guardrailMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.32,
    metalness: 0.85,
    flatShading: true,
  });
  const skyscraperMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.62,
    metalness: 0.34,
    flatShading: true,
  });
  const skyscraperAltMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.68,
    metalness: 0.28,
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
      color: skyTex ? 0xffffff : 0x7dd3fc,
      side: THREE.BackSide,
      fog: false,
    })
  );
  group.add(skyDome);

  const cityGroundSkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 120),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.96, metalness: 0.05 })
  );
  cityGroundSkirt.rotation.x = -Math.PI / 2;
  cityGroundSkirt.position.set(0, -0.55, -16);
  group.add(cityGroundSkirt);

  // =========================================================================
  // 2. RUINED HIGHWAY APPROACHES & WIDE-OPEN OVERPASS COLOSSEUM PLAZA (y = 0.08)
  // =========================================================================
  const buildHighwaySection = (zStart: number, zEnd: number): THREE.Mesh => {
    const len = Math.abs(zEnd - zStart);
    const cz = (zStart + zEnd) * 0.5;
    const geo = createExtrudedChamferSlab(HIGHWAY_HALF_W * 2, ROAD_Y - CRATER_FLOOR_Y, len, 0.22, 0.02);
    const posAttr = geo.getAttribute('position');
    const uvAttr = geo.getAttribute('uv');
    for (let i = 0; i < posAttr.count; i++) {
      const wx = posAttr.getX(i);
      const wz = posAttr.getZ(i) + cz;
      uvAttr.setXY(i, (wx + HIGHWAY_HALF_W) / (HIGHWAY_HALF_W * 2), wz / 16.0);
    }
    uvAttr.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, asphaltMat);
    mesh.position.set(0, CRATER_FLOOR_Y + (ROAD_Y - CRATER_FLOOR_Y) * 0.5, cz);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  };

  // Rear highway vanishing toward the AI Mainframe Core, and front bridge approach behind camera
  const rearHighwayMesh = buildHighwaySection(-44, -13.2);
  const frontHighwayMesh = buildHighwaySection(10.0, 16.0);
  group.add(rearHighwayMesh, frontHighwayMesh);

  // Sub-foundation strictly below CRATER_FLOOR_Y (createExtrudedChamferSlab bottom=0, height=0.63 -> top=0.06 < 0.08)
  const underBase = new THREE.Mesh(
    createExtrudedChamferSlab(HIGHWAY_HALF_W * 2 + 5.6, 0.63, 60, 0.6, 0.02),
    roadFoundationMat
  );
  underBase.position.set(0, CRATER_FLOOR_Y - 0.65, -14.0);
  underBase.receiveShadow = true;
  group.add(underBase);

  // Wide-Open Cyber-Colosseum Overpass Plaza Floor strictly at gameplay y = 0.08 (diameter 20.4m, wall-free!)
  const courtTex = createOverpassCourtTexture();
  if (courtTex) ownedTextures.push(courtTex);

  const craterBedMat = new THREE.MeshStandardMaterial({
    ...(courtTex ? { map: courtTex } : {}),
    color: courtTex ? 0xffffff : 0x0b101b,
    roughness: 0.72,
    metalness: 0.24,
  });
  const craterGroup = new THREE.Group();
  craterGroup.position.set(0, CRATER_FLOOR_Y, ARENA_CENTER_Z);
  group.add(craterGroup);

  const craterFloorMesh = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_FLOOR_R, 48), craterBedMat);
  craterFloorMesh.rotation.x = -Math.PI / 2;
  craterFloorMesh.position.y = 0.002;
  craterFloorMesh.receiveShadow = true;
  craterGroup.add(craterFloorMesh);

  // Sculpted beveled outer Overpass Plaza hull below y = 0.08 (zero tall blocking walls!)
  const plazaHullMesh = new THREE.Mesh(
    createOverpassPlazaHullGeometry(PLAZA_FLOOR_R, PLAZA_OUTER_R, 0.72),
    concreteDarkMat
  );
  plazaHullMesh.receiveShadow = true;
  plazaHullMesh.castShadow = true;
  craterGroup.add(plazaHullMesh);

  // Brushed Titanium Outer Rim Collar + Reactive Neon Arena Accent Material
  const brightAlloyMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.56,
    flatShading: true,
  });
  const arenaAccentMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.05,
    roughness: 0.22,
    metalness: 0.35,
    flatShading: true,
  });

  // 100% Horizontal flush dual neon perimeter rings defining the open combat court
  const plazaNeonRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const plazaNeonRing = new THREE.Mesh(
    new THREE.RingGeometry(PLAZA_FLOOR_R - 0.28, PLAZA_FLOOR_R - 0.02, 64),
    plazaNeonRingMat
  );
  plazaNeonRing.rotation.x = -Math.PI / 2;
  plazaNeonRing.position.y = 0.012;
  craterGroup.add(plazaNeonRing);

  const outerGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(PLAZA_OUTER_R - 0.24, PLAZA_OUTER_R - 0.08, 64),
    plazaNeonRingMat
  );
  outerGlowRing.rotation.x = -Math.PI / 2;
  outerGlowRing.position.y = 0.026;
  craterGroup.add(outerGlowRing);

  // 8 Segmented Outer Titanium Armor Deck Plates flush along the perimeter rim (r = 10.8m)
  const rimArmorPlateGeo = createExtrudedChamferSlab(2.85, 0.045, 0.92, 0.14, 0.012);
  const rimStripGeo = createExtrudedChamferSlab(2.2, 0.025, 0.14, 0.03, 0.006);
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const plateDist = PLAZA_FLOOR_R + 0.6;
    const seg = new THREE.Group();
    seg.position.set(Math.cos(ang) * plateDist, 0.01, Math.sin(ang) * plateDist);
    seg.rotation.y = -ang + Math.PI * 0.5;
    const plate = new THREE.Mesh(rimArmorPlateGeo, brightAlloyMat);
    const strip = new THREE.Mesh(rimStripGeo, i % 2 === 0 ? arenaAccentMat : goldAccentMat);
    strip.position.set(0, 0.042, 0);
    enableShadows(plate);
    seg.add(plate, strip);
    craterGroup.add(seg);
  }

  // 4 Cantilevered Structural Overpass Wing Buttresses + 4 Multi-Part Cyber-Colosseum Stadium Pylons
  const buttressGeo = createExtrudedChamferSlab(2.7, 0.54, 3.2, 0.26, 0.025);
  const buttressFinGeo = createExtrudedChamferSlab(0.32, 0.42, 2.7, 0.06, 0.015);
  const pylonPlinthGeo = createExtrudedChamferSlab(1.55, 0.26, 1.55, 0.28, 0.025);
  const pylonCollarGeo = createExtrudedChamferSlab(1.18, 0.18, 1.18, 0.22, 0.02);
  const pylonShaftGeo = createExtrudedChamferSlab(0.68, 2.25, 0.68, 0.14, 0.02);
  const pylonCoreGeo = createExtrudedChamferSlab(0.24, 1.75, 0.78, 0.05, 0.01);
  const pylonCrownGeo = createExtrudedChamferSlab(0.92, 0.26, 0.92, 0.18, 0.02);
  const pylonFinGeo = new THREE.ConeGeometry(0.18, 0.72, 4);
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI * 0.25 + (i * Math.PI) * 0.5;
    const dist = PLAZA_OUTER_R - 0.12;
    const wing = new THREE.Group();
    wing.position.set(Math.cos(ang) * dist, -0.28, Math.sin(ang) * dist);
    wing.rotation.y = -ang + Math.PI * 0.5;
    const body = new THREE.Mesh(buttressGeo, steelMat);
    const fin = new THREE.Mesh(buttressFinGeo, concreteDarkMat);
    fin.position.set(0, 0.28, 0);
    const underVent = new THREE.Mesh(rimStripGeo, arenaAccentMat);
    underVent.position.set(0, -0.02, 1.35);
    enableShadows(body);
    enableShadows(fin);
    wing.add(body, fin, underVent);
    craterGroup.add(wing);

    // Stadium Light Pylon outside combat court (r = 11.4m, well clear of R = 9.5m court!)
    const pylon = new THREE.Group();
    pylon.position.set(Math.cos(ang) * (PLAZA_OUTER_R + 0.02), 0.01, Math.sin(ang) * (PLAZA_OUTER_R + 0.02));
    pylon.rotation.y = -ang + Math.PI * 0.5;
    const plinth = new THREE.Mesh(pylonPlinthGeo, concreteDarkMat);
    const collar = new THREE.Mesh(pylonCollarGeo, brightAlloyMat);
    collar.position.y = 0.26;
    const shaft = new THREE.Mesh(pylonShaftGeo, steelMat);
    shaft.position.y = 0.44;
    const core = new THREE.Mesh(pylonCoreGeo, arenaAccentMat);
    core.position.y = 0.65;
    const crown = new THREE.Mesh(pylonCrownGeo, brightAlloyMat);
    crown.position.y = 2.66;
    const spire = new THREE.Mesh(pylonFinGeo, goldAccentMat);
    spire.position.y = 3.24;
    spire.rotation.y = Math.PI * 0.25;
    enableShadows(plinth);
    enableShadows(collar);
    enableShadows(shaft);
    enableShadows(crown);
    pylon.add(plinth, collar, shaft, core, crown, spire);
    craterGroup.add(pylon);
  }

  // 2 Rear Boss-Framing Cyber-Monolith Towers flanking the rear highway entrance (x = ±9.6, z = -12.8)
  const monoBaseGeo = createExtrudedChamferSlab(1.9, 0.34, 1.9, 0.32, 0.025);
  const monoBodyGeo = createExtrudedChamferSlab(1.15, 3.3, 1.15, 0.22, 0.025);
  const monoChevronGeo = createExtrudedChamferSlab(1.26, 0.16, 1.26, 0.22, 0.015);
  const monoAntennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.35, 6);
  for (const sx of [-1, 1]) {
    const mono = new THREE.Group();
    mono.position.set(sx * 9.8, CRATER_FLOOR_Y, -12.6);
    const mBase = new THREE.Mesh(monoBaseGeo, concreteDarkMat);
    const mBody = new THREE.Mesh(monoBodyGeo, steelMat);
    mBody.position.y = 0.34;
    const mGlow1 = new THREE.Mesh(monoChevronGeo, arenaAccentMat);
    mGlow1.position.y = 1.45;
    const mGlow2 = new THREE.Mesh(monoChevronGeo, goldAccentMat);
    mGlow2.position.y = 2.45;
    const mGlow3 = new THREE.Mesh(monoChevronGeo, arenaAccentMat);
    mGlow3.position.y = 3.35;
    const mAnt = new THREE.Mesh(monoAntennaGeo, brightAlloyMat);
    mAnt.position.set(-sx * 0.2, 4.25, 0);
    enableShadows(mBase);
    enableShadows(mBody);
    mono.add(mBase, mBody, mGlow1, mGlow2, mGlow3, mAnt);
    group.add(mono);
  }

  // Natural Branching Jagged Ground Fissures scaled to the wide plaza floor (flush, zero occlusion)
  const { charredGeo, emberGeo } = createJaggedCraterFissureGeometries(1.38);
  const charredFissures = new THREE.Mesh(charredGeo, charredFissureMat);
  charredFissures.receiveShadow = true;
  const emberSeams = new THREE.Mesh(emberGeo, emberSeamMat);
  craterGroup.add(charredFissures, emberSeams);

  const rockWallGeo = new THREE.DodecahedronGeometry(1.0, 0);

  // =========================================================================
  // 3. REAR/FRONT SIDEWALKS (y = 0.88), GUARDRAILS, ROAD DEBRIS & OUTER STREETLIGHTS
  // =========================================================================
  const sidewalkSegments: [number, number, number][] = [
    [13.0, 6.0, 0],
    [-16.4, 6.4, 0.015],
    [-23.6, 7.8, -0.02],
    [-31.8, 9.2, 0],
    [-40.5, 10.6, 0],
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

    // Dented & Interrupted Metal Guardrails cleanly outside the open central plaza
    const guardrailSegments: { z: number; len: number; yaw: number; roll: number; pitch: number }[] = [
      { z: 13.0, len: 5.0, yaw: 0.02, roll: 0, pitch: 0 },
      { z: -16.4, len: 6.4, yaw: -0.04, roll: 0.04, pitch: 0 },
      { z: -23.6, len: 6.8, yaw: 0.02, roll: 0, pitch: 0 },
      { z: -31.8, len: 6.8, yaw: 0, roll: 0, pitch: 0 },
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

  // Tilted Cyberpunk Streetlights pushed outside the combat plaza so shaders & silhouettes stay 100% clear
  const poleBaseGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.32, 6);
  const poleShaftGeo = new THREE.CylinderGeometry(0.075, 0.11, 3.85, 6);
  const armGeo = new THREE.BoxGeometry(1.15, 0.1, 0.12);
  const hoodGeo = new THREE.BoxGeometry(0.58, 0.12, 0.26);
  const bulbGeo = new THREE.BoxGeometry(0.48, 0.06, 0.18);

  const streetlightSpecs: { side: -1 | 1; xDist: number; yBase: number; z: number; tiltZ: number; tiltX: number; cyan: boolean; flicker: boolean }[] = [
    { side: -1, xDist: 11.45, yBase: CRATER_FLOOR_Y, z: 3.4, tiltZ: -0.07, tiltX: 0.03, cyan: true, flicker: false },
    { side: 1, xDist: 11.45, yBase: CRATER_FLOOR_Y, z: 3.4, tiltZ: 0.14, tiltX: -0.04, cyan: false, flicker: true },
    { side: -1, xDist: 11.45, yBase: CRATER_FLOOR_Y, z: -6.8, tiltZ: -0.22, tiltX: 0.1, cyan: true, flicker: true },
    { side: 1, xDist: 11.45, yBase: CRATER_FLOOR_Y, z: -6.8, tiltZ: 0.2, tiltX: -0.08, cyan: true, flicker: false },
    { side: -1, xDist: HIGHWAY_HALF_W + 1.05, yBase: SIDEWALK_Y, z: -13.8, tiltZ: -0.09, tiltX: -0.05, cyan: false, flicker: true },
    { side: 1, xDist: HIGHWAY_HALF_W + 1.05, yBase: SIDEWALK_Y, z: -13.8, tiltZ: 0.04, tiltX: 0.02, cyan: true, flicker: false },
    { side: -1, xDist: HIGHWAY_HALF_W + 1.05, yBase: SIDEWALK_Y, z: -21.2, tiltZ: -0.03, tiltX: 0.02, cyan: true, flicker: false },
    { side: 1, xDist: HIGHWAY_HALF_W + 1.05, yBase: SIDEWALK_Y, z: -21.2, tiltZ: 0.12, tiltX: 0.04, cyan: false, flicker: false },
  ];

  for (let idx = 0; idx < streetlightSpecs.length; idx++) {
    const spec = streetlightSpecs[idx];
    const lampGroup = new THREE.Group();
    lampGroup.position.set(spec.side * spec.xDist, spec.yBase, spec.z);
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

  // Cracked Tilted Road Slabs & Concrete/Rebar Rubble along Rear/Front Highway Approaches
  const roadDebrisPositions: [number, number, number, number, number][] = [
    [-6.6, 12.2, 1.4, 0.95, 0.2],
    [6.5, 12.0, 1.3, 0.9, -0.18],
    [-6.4, -15.4, 1.55, 1.1, 0.25],
    [6.5, -15.8, 1.45, 1.05, -0.22],
    [-2.8, -18.2, 1.4, 1.0, 0.15],
    [3.1, -18.8, 1.5, 1.05, -0.17],
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
    [-8.6, 12.0, 0.3, SIDEWALK_Y],
    [-10.8, 2.2, 0.36, CRATER_FLOOR_Y],
    [-10.8, -5.6, 0.32, CRATER_FLOOR_Y],
    [8.6, 11.8, 0.3, SIDEWALK_Y],
    [10.8, 2.2, 0.36, CRATER_FLOOR_Y],
    [10.8, -5.4, 0.32, CRATER_FLOOR_Y],
    [-4.8, -14.6, 0.36, ROAD_Y],
    [4.8, -14.5, 0.36, ROAD_Y],
    [0.2, -15.4, 0.4, ROAD_Y],
    [-7.4, 11.2, 0.34, ROAD_Y],
    [7.4, 11.0, 0.34, ROAD_Y],
  ];
  const rubbleInst = new THREE.InstancedMesh(rockWallGeo, concreteMat, rubbleData.length);
  rubbleInst.castShadow = false;
  rubbleInst.receiveShadow = true;

  const rebarGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.72, 5);
  const rebarInst = new THREE.InstancedMesh(rebarGeo, rebarMat, rubbleData.length * 2);
  rebarInst.castShadow = false;

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
    const rad = 1.2 + ((i * 29) % 100) / 100 * 6.8;
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
    const rad = 2.0 + ((i * 43) % 100) / 100 * 7.6;
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
    [-10.45, 3.88, 3.4], // Outer left front plaza streetlight
    [10.45, 3.82, 3.4], // Outer right front plaza streetlight
    [-10.45, 3.72, -6.8], // Outer left rear plaza streetlight
    [10.45, 3.78, -6.8], // Outer right rear plaza streetlight
    [-7.68, 1.24, 9.2], // Front left guardrail end
    [7.68, 1.24, 9.2], // Front right guardrail end
    [-7.68, 1.22, -12.6], // Rear left guardrail end
    [7.68, 1.22, -12.6], // Rear right guardrail end
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
    anomalyColorHex: string
  ): void => {
    bossEmberBoost = isBossWave ? (isBossMode ? 0.22 : 0.14) : 0;
    const activeHex = isBossWave ? '#f43f5e' : anomalyColorHex || '#38bdf8';
    plazaNeonRingMat.color.set(activeHex);
    plazaNeonRingMat.opacity = isBossWave ? 0.78 : 0.58;
    arenaAccentMat.color.set(activeHex);
    arenaAccentMat.emissive.set(activeHex);
    arenaAccentMat.emissiveIntensity = isBossWave ? 1.65 : 1.3;
  };

  let lowQuality = false;

  const setLowQuality = (low: boolean): void => {
    lowQuality = low;
    emberInst.visible = !low;
    ashInst.visible = !low;
    if (low) {
      for (let i = 0; i < electricSparks.length; i++) {
        electricSparks[i].group.visible = false;
      }
    }
  };

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    for (const fl of flickers) {
      const wave = Math.sin(t * fl.speed + fl.phase) * Math.sin(t * (fl.speed * 0.37) + fl.phase);
      fl.mat.emissiveIntensity = wave > 0.55 ? fl.baseIntensity * 0.28 : fl.baseIntensity;
    }

    emberSeamMat.emissiveIntensity = 0.32 + bossEmberBoost + Math.sin(t * 1.9) * 0.08;

    if (lowQuality) return;

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
    setLowQuality,
    update,
    dispose,
  };
}
