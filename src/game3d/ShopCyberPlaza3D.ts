import * as THREE from 'three';
import {
  createCyberBotanicalCanopy,
  createCyberCrystalCluster,
  createCyberMonolithForkFinial,
} from './CyberProps3D';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
  disposeObject3D,
  enableShadows,
} from './MeshHelpers3D';
import type { CyberShowcasePodiumHandle, FusionPodiumBuildCtx } from './FusionWorldPodium3D';
import {
  buildPlazaGemTowerSkyscraper,
  buildPlazaOmegaBossPad,
  createCyberPlazaFloorTexture,
  createRoundaboutShadowTexture,
} from './ShopCyberPlazaAssets3D';
import { buildPlazaCyberKiosks } from './ShopCyberPlazaKiosks3D';
import { addPlazaDistantSkyline } from './ShopCyberPlazaSkyline3D';

export interface ShopCyberPlazaHandle {
  group: THREE.Group;
  animatedCrystals: THREE.Object3D[];
  animatedRings: THREE.Object3D[];
  omegaPadTopY: number;
  setLowQuality?: (low: boolean) => void;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface PulseMaterialSpec {
  mat: THREE.MeshStandardMaterial;
  base: number;
  amp: number;
  speed: number;
  phase: number;
}

/**
 * Builds the procedural "Neo-Cyber City Plaza" lobby world matching Battle Tower's
 * cyberpunk aesthetic with safe-zone lighting, zero sky-blocking rear pillars,
 * spacious cyber kiosks with clean vending machines, and zero z-fighting surfaces.
 */
export function createShopCyberPlaza(): ShopCyberPlazaHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const ownedInstanced: THREE.InstancedMesh[] = [];
  const animatedCrystals: THREE.Object3D[] = [];
  const animatedRings: THREE.Object3D[] = [];
  const omegaPodiums: CyberShowcasePodiumHandle[] = [];
  const pulseMaterials: PulseMaterialSpec[] = [];

  const darkHullMat = new THREE.MeshStandardMaterial({
    color: 0x1e2b40,
    roughness: 0.74,
    metalness: 0.16,
    flatShading: true,
  });
  const slateConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x354866,
    roughness: 0.78,
    metalness: 0.08,
    flatShading: true,
  });
  const plazaFloorTex = createCyberPlazaFloorTexture();
  if (plazaFloorTex) ownedTextures.push(plazaFloorTex);
  const plazaDeckMat = new THREE.MeshStandardMaterial({
    color: plazaFloorTex ? 0xffffff : 0x334663,
    ...(plazaFloorTex ? { map: plazaFloorTex } : {}),
    roughness: 0.78,
    metalness: 0.06,
  });
  const recessedZoneMat = new THREE.MeshStandardMaterial({
    color: 0x2a3b54,
    roughness: 0.82,
    metalness: 0.08,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x465875,
    roughness: 0.42,
    metalness: 0.34,
    flatShading: true,
  });
  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x7c90ad,
    roughness: 0.36,
    metalness: 0.4,
    flatShading: true,
  });
  const towerPanelMat = new THREE.MeshStandardMaterial({
    color: 0x21304b,
    roughness: 0.48,
    metalness: 0.3,
    flatShading: true,
  });
  const towerRibMat = new THREE.MeshStandardMaterial({
    color: 0x364866,
    roughness: 0.4,
    metalness: 0.35,
    flatShading: true,
  });
  const containerDarkMat = new THREE.MeshStandardMaterial({
    color: 0x24324a,
    roughness: 0.46,
    metalness: 0.28,
    flatShading: true,
  });
  const containerMidMat = new THREE.MeshStandardMaterial({
    color: 0x334663,
    roughness: 0.42,
    metalness: 0.26,
    flatShading: true,
  });
  const roadAsphaltMat = new THREE.MeshStandardMaterial({
    color: 0x25334a,
    roughness: 0.84,
    metalness: 0.06,
    flatShading: true,
  });

  const makeNeonMat = (
    colorHex: number,
    emissiveIntensity = 1.45,
    pulseAmp = 0.14,
    speed = 2.2,
    phase = 0
  ): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.25,
      flatShading: true,
    });
    if (pulseAmp > 0) {
      pulseMaterials.push({ mat, base: emissiveIntensity, amp: pulseAmp, speed, phase });
    }
    return mat;
  };

  const cyanNeonMat = makeNeonMat(0x22d3ee, 1.4, 0.16, 2.1, 0);
  const blueNeonMat = makeNeonMat(0x38bdf8, 1.35, 0.12, 2.4, 0.6);
  const violetNeonMat = makeNeonMat(0xa855f7, 1.45, 0.18, 1.9, 1.2);
  const magentaNeonMat = makeNeonMat(0xe879f9, 1.5, 0.2, 2.3, 1.8);
  const emeraldNeonMat = makeNeonMat(0x4ade80, 1.35, 0.14, 2.0, 2.4);
  const amberNeonMat = makeNeonMat(0xf97316, 1.65, 0.24, 3.1, 0.4);
  const warmLampMat = makeNeonMat(0xe0f2fe, 1.6, 0.05, 1.2, 0);

  // Safe-Zone Urban Night Fill & 3 Key Neon Pool Lights (keep 4 THREE.Light nodes in scene graph; toggle PointLights by quality)
  const plazaSafeHemi = new THREE.HemisphereLight(0xbae6fd, 0x26354d, 1.12);
  group.add(plazaSafeHemi);

  const plazaPointLights: THREE.PointLight[] = [];
  const zoneLights: Array<[number, number, number, number, number, number]> = [
    [0, 5.2, -0.5, 0xd8b4fe, 2.5, 22],
    [0, 6.8, -9.2, 0x38bdf8, 2.9, 24],
    [0, 4.6, 5.5, 0xf472b6, 1.9, 20],
  ];
  for (let i = 0; i < zoneLights.length; i++) {
    const [lx, ly, lz, col, intensity, dist] = zoneLights[i];
    const pt = new THREE.PointLight(col, intensity, dist, 1.35);
    pt.position.set(lx, ly, lz);
    pt.visible = i === 0;
    plazaPointLights.push(pt);
    group.add(pt);
  }

  // =========================================================================
  // 1. FLOATING CYBER PLAZA ISLAND BASE, DARK CONCRETE DECK & NEON AVENUES
  // =========================================================================
  const lowerPlinth = new THREE.Mesh(
    createChamferSlabGeometry(37.6, 2.2, 27.6, 1.8, 0.08),
    darkHullMat
  );
  lowerPlinth.position.set(0, -3.6, -2);
  group.add(lowerPlinth);

  const hullNeonBand = new THREE.Mesh(
    createChamferSlabGeometry(38.2, 0.16, 28.2, 1.8, 0.02),
    cyanNeonMat
  );
  hullNeonBand.position.set(0, -1.52, -2);
  group.add(hullNeonBand);

  const cliffRim = new THREE.Mesh(
    createChamferSlabGeometry(42.4, 1.4, 32.4, 1.6, 0.06),
    slateConcreteMat
  );
  cliffRim.position.set(0, -1.4, -2);
  cliffRim.receiveShadow = true;
  group.add(cliffRim);

  // Main Plaza Floor (top face strictly at y = 0.14)
  const plazaFloor = new THREE.Mesh(
    createChamferSlabGeometry(41.2, 0.24, 31.2, 1.4, 0.03),
    plazaDeckMat
  );
  plazaFloor.position.set(0, -0.1, -2);
  plazaFloor.receiveShadow = true;
  group.add(plazaFloor);

  // 4 Non-Overlapping Recessed Cyber-Concrete Quadrant Pads (y = 0.14..0.18)
  for (const [lx, lz, lw, ld, borderMat] of [
    [-14.2, -11.1, 11.8, 11.8, cyanNeonMat],
    [14.2, -11.1, 11.8, 11.8, violetNeonMat],
    [-14.2, 0.7, 11.8, 5.4, emeraldNeonMat],
    [14.2, 0.7, 11.8, 5.4, amberNeonMat],
  ] as Array<[number, number, number, number, THREE.MeshStandardMaterial]>) {
    const pad = new THREE.Mesh(createChamferSlabGeometry(lw, 0.04, ld, 0.4, 0.01), recessedZoneMat);
    pad.position.set(lx, 0.14, lz);
    pad.receiveShadow = true;
    group.add(pad);

    const edgeStrip = new THREE.Mesh(
      createChamferSlabGeometry(lw - 0.4, 0.03, 0.09, 0.03, 0.006),
      borderMat
    );
    edgeStrip.position.set(lx, 0.18, lz + (lz < -4 ? ld * 0.5 - 0.1 : -ld * 0.5 + 0.1));
    group.add(edgeStrip);
  }

  // Perimeter Dark Steel Curb (y = 0.14..0.36)
  for (const [bx, bz, bw, bd] of [
    [0, -17.35, 40.6, 0.55],
    [-20.3, -2.0, 0.55, 30.6],
    [20.3, -2.0, 0.55, 30.6],
  ]) {
    const curb = new THREE.Mesh(createChamferSlabGeometry(bw, 0.22, bd, 0.12, 0.02), gunmetalMat);
    curb.position.set(bx, 0.14, bz);
    enableShadows(curb);
    group.add(curb);
  }

  // Non-Overlapping Dark Asphalt Cross Avenues (y = 0.14..0.18) + Neon Lane Guides (y = 0.18..0.21)
  const northSouthRoad = new THREE.Mesh(createChamferSlabGeometry(3.2, 0.04, 18.8, 0.15, 0.008), roadAsphaltMat);
  northSouthRoad.position.set(0, 0.14, 3.0);
  northSouthRoad.receiveShadow = true;
  group.add(northSouthRoad);

  for (const sx of [-1, 1]) {
    const sideCross = new THREE.Mesh(createChamferSlabGeometry(11.5, 0.04, 2.8, 0.15, 0.008), roadAsphaltMat);
    sideCross.position.set(sx * 7.35, 0.14, -3.6);
    sideCross.receiveShadow = true;

    const sideFront = new THREE.Mesh(createChamferSlabGeometry(10.3, 0.04, 2.6, 0.15, 0.008), roadAsphaltMat);
    sideFront.position.set(sx * 6.75, 0.14, 5.2);
    sideFront.receiveShadow = true;
    group.add(sideCross, sideFront);

    // Stop horizontal avenue lane lines cleanly before touching the central roundabout curb & shadow
    const sideCrossStripes: Array<[number, number, number]> = [
      [-4.85, 7.8, 10.3],
      [-2.35, 8.8, 8.3],
    ];
    for (const [rz, cx, len] of sideCrossStripes) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(len, 0.03, 0.09, 0.02, 0.005), cyanNeonMat);
      lane.position.set(sx * cx, 0.18, rz);
      group.add(lane);
    }
    const sideFrontStripes: Array<[number, number, number]> = [
      [4.0, 7.05, 9.4],
      [6.4, 6.75, 10.0],
    ];
    for (const [rz, cx, len] of sideFrontStripes) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(len, 0.03, 0.09, 0.02, 0.005), violetNeonMat);
      lane.position.set(sx * cx, 0.18, rz);
      group.add(lane);
    }
  }
  for (const rx of [-1.45, 1.45]) {
    for (const [segZ, len] of [
      [-5.765, 1.17],
      [9.425, 5.95],
    ]) {
      const lane = new THREE.Mesh(createChamferSlabGeometry(0.09, 0.03, len, 0.02, 0.005), cyanNeonMat);
      lane.position.set(rx, 0.18, segZ);
      group.add(lane);
    }
  }

  // Modern Cyberpunk Plaza Barriers & Entrance Gate (z = 13.15) via InstancedMesh
  const barrierPositions = [-15.2, -13.0, -10.8, -8.6, -6.4, -4.2, 4.2, 6.4, 8.6, 10.8, 13.0, 15.2];
  const bollardGeo = createLatheProfileGeometry(
    [
      [0.18, 0.0],
      [0.14, 0.12],
      [0.11, 0.78],
      [0.13, 0.9],
      [0.06, 0.96],
    ],
    8
  );
  const bollardInst = new THREE.InstancedMesh(bollardGeo, gunmetalMat, barrierPositions.length);
  bollardInst.castShadow = false;
  bollardInst.receiveShadow = true;

  const railGeo = createChamferSlabGeometry(2.15, 0.08, 0.1, 0.03, 0.008);
  const railInst = new THREE.InstancedMesh(railGeo, cyanNeonMat, barrierPositions.length);
  const dummy = new THREE.Object3D();

  barrierPositions.forEach((bx, idx) => {
    dummy.position.set(bx, 0.14, 13.15);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bollardInst.setMatrixAt(idx, dummy.matrix);

    const railX = bx < 0 ? bx + 1.05 : bx - 1.05;
    dummy.position.set(railX, 0.74, 13.15);
    dummy.scale.set(idx === 5 || idx === 6 ? 0.45 : 1, 1, 1);
    dummy.updateMatrix();
    railInst.setMatrixAt(idx, dummy.matrix);
  });
  bollardInst.instanceMatrix.needsUpdate = true;
  railInst.instanceMatrix.needsUpdate = true;
  group.add(bollardInst, railInst);

  // Sleek Cyber Entrance Gate Arch (x = 0, z = 13.15)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.14, 13.15);
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(createChamferSlabGeometry(0.46, 2.35, 0.46, 0.08, 0.02), towerRibMat);
    pillar.position.set(sx * 2.25, 0, 0);
    const glowStrip = new THREE.Mesh(createChamferSlabGeometry(0.1, 2.1, 0.5, 0.02, 0.008), cyanNeonMat);
    glowStrip.position.set(sx * 2.25, 0.1, 0);
    enableShadows(pillar);
    gateGroup.add(pillar, glowStrip);
  }
  const gateBeam = new THREE.Mesh(createChamferSlabGeometry(5.1, 0.34, 0.52, 0.1, 0.02), gunmetalMat);
  gateBeam.position.set(0, 2.28, 0);
  const gateNeon = new THREE.Mesh(createChamferSlabGeometry(4.6, 0.08, 0.58, 0.03, 0.008), violetNeonMat);
  gateNeon.position.set(0, 2.62, 0);
  enableShadows(gateBeam);
  gateGroup.add(gateBeam, gateNeon);
  group.add(gateGroup);

  // Modern Metallic Street Benches (InstancedMesh)
  const benchPositions: Array<[number, number, number]> = [
    [-6.2, 7.0, 0],
    [6.2, 7.0, 0],
    [-6.2, 3.5, Math.PI],
    [6.2, 3.5, Math.PI],
    [-6.6, -5.4, 0],
    [6.6, -5.4, 0],
  ];
  const benchSeatGeo = createChamferSlabGeometry(1.75, 0.12, 0.62, 0.08, 0.015);
  const benchFrameGeo = createChamferSlabGeometry(1.88, 0.3, 0.68, 0.08, 0.015);
  const benchSeatInst = new THREE.InstancedMesh(benchSeatGeo, brushedSteelMat, benchPositions.length);
  const benchFrameInst = new THREE.InstancedMesh(benchFrameGeo, darkHullMat, benchPositions.length);
  benchSeatInst.castShadow = false;
  benchSeatInst.receiveShadow = true;
  benchFrameInst.castShadow = false;
  benchPositions.forEach(([bx, bz, rotY], idx) => {
    dummy.position.set(bx, 0.44, bz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    benchSeatInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bx, 0.14, bz);
    dummy.updateMatrix();
    benchFrameInst.setMatrixAt(idx, dummy.matrix);
  });
  benchSeatInst.instanceMatrix.needsUpdate = true;
  benchFrameInst.instanceMatrix.needsUpdate = true;
  group.add(benchFrameInst, benchSeatInst);

  // Futuristic Cyberpunk Streetlights
  const lampPostSpecs: Array<[number, number, boolean]> = [
    [-4.6, 2.2, true],
    [4.6, 2.2, false],
    [-4.6, -5.0, false],
    [4.6, -5.0, true],
    [-4.6, 7.0, true],
    [4.6, 7.0, false],
    [-4.6, 11.4, false],
    [4.6, 11.4, true],
  ];
  const lampArmPts: [number, number][] = [
    [-0.08, 0.0],
    [0.08, 0.0],
    [0.08, 2.75],
    [0.72, 3.05],
    [0.72, 3.18],
    [-0.08, 2.9],
  ];
  const lampArmGeo = createExtrudedProfileGeometry(lampArmPts, 0.16, 0.015);

  for (const [lx, lz, isCyan] of lampPostSpecs) {
    const lg = new THREE.Group();
    lg.position.set(lx, 0.14, lz);
    lg.rotation.y = lx < 0 ? 0 : Math.PI;

    const base = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.24, 0.0],
          [0.22, 0.16],
          [0.14, 0.34],
        ],
        8
      ),
      towerRibMat
    );
    const pole = new THREE.Mesh(lampArmGeo, gunmetalMat);
    const lampHood = new THREE.Mesh(createChamferSlabGeometry(0.68, 0.12, 0.28, 0.05, 0.01), darkHullMat);
    lampHood.position.set(0.62, 3.06, 0);

    const bulbStrip = new THREE.Mesh(
      createChamferSlabGeometry(0.54, 0.05, 0.18, 0.02, 0.006),
      warmLampMat
    );
    bulbStrip.position.set(0.62, 2.99, 0);

    const accentRing = new THREE.Mesh(
      createChamferSlabGeometry(0.24, 0.08, 0.24, 0.04, 0.008),
      isCyan ? cyanNeonMat : violetNeonMat
    );
    accentRing.position.set(0, 1.55, 0);

    enableShadows(base);
    enableShadows(pole);
    lg.add(base, pole, lampHood, bulbStrip, accentRing);
    group.add(lg);
  }

  // 4 Corner Modern Cyber Holo-Tree Planters (Clean strictly stacked geometry, non-intersecting holo crystals!)
  for (const [px, pz, baseY, isCyan] of [
    [-16.4, -14.9, 0.18, true],
    [16.4, -14.9, 0.18, false],
    [-17.4, 10.6, 0.14, false],
    [17.4, 10.6, 0.14, true],
  ] as Array<[number, number, number, boolean]>) {
    const planter = new THREE.Group();
    planter.position.set(px, baseY, pz);

    const curb = new THREE.Mesh(createChamferSlabGeometry(4.0, 0.28, 4.0, 0.45, 0.02), towerRibMat);
    const pad = new THREE.Mesh(createChamferSlabGeometry(3.35, 0.14, 3.35, 0.35, 0.015), darkHullMat);
    pad.position.y = 0.28;
    const neonRim = new THREE.Mesh(
      createChamferSlabGeometry(2.35, 0.06, 2.35, 0.28, 0.008),
      isCyan ? cyanNeonMat : magentaNeonMat
    );
    neonRim.position.y = 0.42;

    const trunk = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.42, 0.0],
          [0.24, 0.42],
          [0.18, 1.48],
          [0.32, 1.95],
        ],
        6
      ),
      gunmetalMat
    );
    trunk.position.y = 0.48;

    const crownMat = isCyan ? cyanNeonMat : violetNeonMat;
    const crownAccentMat = isCyan ? magentaNeonMat : cyanNeonMat;
    // Stylized Cyber-Botanical Canopy with branched trunk & faceted polyhedral foliage clusters
    const canopyCrown = createCyberBotanicalCanopy({
      barkMat: gunmetalMat,
      foliageMat: crownMat,
      accentMat: crownAccentMat,
      scale: 1.25,
    });
    canopyCrown.position.set(0, 2.34, 0);
    planter.add(canopyCrown);

    enableShadows(curb);
    enableShadows(trunk);
    planter.add(curb, pad, neonRim, trunk);
    group.add(planter);
  }

  // Perimeter City Relay Pylons around Island Flanks (well clear of camera sky behind Gem Tower)
  for (const [rx, rz, baseY, h, isCyan] of [
    [-18.8, -15.4, 0.18, 2.4, true],
    [18.8, -15.4, 0.18, 2.4, false],
    [-18.8, -4.2, 0.18, 2.8, false],
    [18.8, -4.2, 0.18, 2.8, true],
    [-18.8, 3.6, 0.14, 2.2, true],
    [18.8, 3.6, 0.14, 2.2, false],
  ] as Array<[number, number, number, number, boolean]>) {
    const pylon = new THREE.Group();
    pylon.position.set(rx, baseY, rz);
    const base = new THREE.Mesh(createChamferSlabGeometry(1.3, 0.3, 1.3, 0.18, 0.02), towerRibMat);
    const tower = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.42, 0.3],
          [0.3, h * 0.7],
          [0.18, h],
        ],
        6
      ),
      containerDarkMat
    );
    const tip = createCyberMonolithForkFinial({
      frameMat: towerRibMat,
      steelMat: brushedSteelMat,
      coreMat: isCyan ? cyanNeonMat : violetNeonMat,
      scale: 1.15,
    });
    tip.position.y = h - 0.04;
    animatedCrystals.push(tip);
    enableShadows(base);
    enableShadows(tower);
    pylon.add(base, tower, tip);
    group.add(pylon);
  }

  // Two Omega Boss Arena Pads aligned inline with Pickaxe Armory & Gem Shop (x = ±17.6, z = -9.6)
  const omegaPodiumCtx: FusionPodiumBuildCtx = {
    armorDarkMat: darkHullMat,
    armorSteelMat: gunmetalMat,
    brightSteelMat: brushedSteelMat,
    ownedGeos,
    ownedMats,
    ownedTextures,
  };
  let omegaPadTopY = 0.45;
  for (const side of [-1, 1] as const) {
    const padResult = buildPlazaOmegaBossPad({
      side,
      padX: side * 17.6,
      padZ: -9.6,
      slateConcreteMat,
      darkHullMat,
      gunmetalMat,
      brushedSteelMat,
      animatedRings,
      podiumCtx: omegaPodiumCtx,
      makeNeonMat,
    });
    group.add(padResult.group);
    omegaPodiums.push(padResult.podium);
    omegaPadTopY = padResult.topY;
  }

  // Front-Right Cyber Maglev Cargo Dock (x = 10.4, z = 9.0)
  const dockGroup = new THREE.Group();
  dockGroup.position.set(10.4, 0.14, 9.0);
  const dockPad = new THREE.Mesh(createChamferSlabGeometry(6.2, 0.18, 3.4, 0.35, 0.02), towerRibMat);
  const dockRail = new THREE.Mesh(createChamferSlabGeometry(5.6, 0.06, 0.14, 0.03, 0.008), cyanNeonMat);
  dockRail.position.set(0, 0.18, 1.55);

  const cargoHull = new THREE.Mesh(createChamferSlabGeometry(3.4, 1.05, 1.55, 0.28, 0.025), containerMidMat);
  cargoHull.position.set(0.35, 0.42, 0);
  const cargoWindshield = new THREE.Mesh(createChamferSlabGeometry(0.65, 0.52, 1.32, 0.12, 0.015), cyanNeonMat);
  cargoWindshield.position.set(-1.15, 0.72, 0);
  const cargoCrate = new THREE.Mesh(createChamferSlabGeometry(0.95, 0.78, 0.95, 0.12, 0.018), containerDarkMat);
  cargoCrate.position.set(-2.25, 0.18, 0.45);
  const cargoGlow = new THREE.Mesh(createChamferSlabGeometry(0.98, 0.08, 0.98, 0.12, 0.008), amberNeonMat);
  cargoGlow.position.set(-2.25, 0.96, 0.45);

  enableShadows(dockPad);
  enableShadows(cargoHull);
  enableShadows(cargoCrate);
  dockGroup.add(dockPad, dockRail, cargoHull, cargoWindshield, cargoCrate, cargoGlow);
  group.add(dockGroup);

  // =========================================================================
  // 2. MONUMEN TENGAH: CIRCULAR ROUNDABOUT + CYBER NEON FOUNTAIN (x = 0, z = -0.5)
  // =========================================================================
  const roundaboutGroup = new THREE.Group();
  roundaboutGroup.position.set(0, 0, -0.5);

  // Dark road-grade junction apron so roundabout blends cleanly into both asphalt lanes & plaza floor
  const roundaboutApron = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [4.74, 0.135],
        [4.6, 0.192],
        [4.05, 0.192],
      ],
      40
    ),
    roadAsphaltMat
  );
  roundaboutApron.receiveShadow = true;

  // Soft radial contact shadow hugging outer curb perimeter (r = 4.22 -> 4.60)
  const roundaboutShadowTex = createRoundaboutShadowTexture(4.18 / 4.64, 1.0);
  if (roundaboutShadowTex) ownedTextures.push(roundaboutShadowTex);
  const roundaboutShadowMat = new THREE.MeshBasicMaterial({
    ...(roundaboutShadowTex ? { map: roundaboutShadowTex } : {}),
    color: roundaboutShadowTex ? 0xffffff : 0x050811,
    transparent: true,
    opacity: roundaboutShadowTex ? 1.0 : 0.34,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const roundaboutContactShadow = new THREE.Mesh(
    new THREE.RingGeometry(4.06, 4.64, 48),
    roundaboutShadowMat
  );
  roundaboutContactShadow.rotation.x = -Math.PI / 2;
  roundaboutContactShadow.position.y = 0.196;

  // Raised circular curb wall (dark urban slate-steel matching plaza)
  const roundaboutCurb = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [4.24, 0.185],
        [4.2, 0.305],
        [4.12, 0.348],
        [3.98, 0.348],
        [3.96, 0.325],
      ],
      40
    ),
    towerPanelMat
  );
  enableShadows(roundaboutCurb);

  // Raised circular sidewalk deck inside curb (y = 0.35)
  const roundaboutDeck = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [3.98, 0.325],
        [3.98, 0.35],
        [0.05, 0.35],
      ],
      40
    ),
    slateConcreteMat
  );
  roundaboutDeck.receiveShadow = true;

  // Thin glowing neon trim along upper roundabout curb rim
  const roundaboutTrimMat = makeNeonMat(0x22d3ee, 0.95, 0.06, 1.8, 0.8);
  const roundaboutTrimGeo = new THREE.TorusGeometry(4.11, 0.026, 6, 56);
  roundaboutTrimGeo.rotateX(Math.PI / 2);
  const roundaboutNeonTrim = new THREE.Mesh(roundaboutTrimGeo, roundaboutTrimMat);
  roundaboutNeonTrim.position.y = 0.352;

  roundaboutGroup.add(
    roundaboutApron,
    roundaboutContactShadow,
    roundaboutCurb,
    roundaboutDeck,
    roundaboutNeonTrim
  );
  group.add(roundaboutGroup);

  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.35, -0.5);

  const basinOuter = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [3.15, 0.0],
        [3.05, 0.26],
        [2.75, 0.44],
        [2.45, 0.44],
        [2.3, 0.18],
        [0.05, 0.18],
      ],
      16
    ),
    towerRibMat
  );
  const plasmaPool = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 2.38, 28),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.58, side: THREE.DoubleSide })
  );
  plasmaPool.rotation.x = -Math.PI / 2;
  plasmaPool.position.y = 0.24;

  const reactorPedestal = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [1.15, 0.18],
        [0.85, 0.55],
        [0.62, 0.95],
        [0.88, 1.15],
        [0.52, 1.32],
      ],
      10
    ),
    gunmetalMat
  );

  const clawPts: [number, number][] = [
    [0.55, 0.35],
    [1.05, 0.95],
    [0.82, 1.75],
    [0.64, 1.68],
    [0.82, 0.95],
    [0.42, 0.42],
  ];
  const clawGeo = createExtrudedProfileGeometry(clawPts, 0.18, 0.015);
  for (let c = 0; c < 4; c++) {
    const arm = new THREE.Mesh(clawGeo, containerMidMat);
    arm.rotation.y = (c / 4) * Math.PI * 2 + Math.PI * 0.25;
    enableShadows(arm);
    fountainGroup.add(arm);
  }

  const medRing = new THREE.Mesh(
    new THREE.RingGeometry(3.15, 3.24, 48),
    new THREE.MeshBasicMaterial({ color: 0xd946ef, side: THREE.DoubleSide })
  );
  medRing.rotation.x = -Math.PI / 2;
  medRing.position.y = 0.012;

  const outerReactorRingGeo = new THREE.TorusGeometry(1.12, 0.055, 6, 24);
  outerReactorRingGeo.rotateX(Math.PI / 2);
  const outerReactorRing = new THREE.Mesh(outerReactorRingGeo, cyanNeonMat);
  outerReactorRing.position.y = 1.38;
  animatedRings.push(outerReactorRing);

  const innerReactorRingGeo = new THREE.TorusGeometry(0.76, 0.04, 6, 20);
  innerReactorRingGeo.rotateX(Math.PI / 2);
  const innerReactorRing = new THREE.Mesh(innerReactorRingGeo, magentaNeonMat);
  innerReactorRing.position.y = 1.62;
  animatedRings.push(innerReactorRing);

  const floatingReactorCrystal = createCyberCrystalCluster({
    frameMat: towerRibMat,
    crystalMat: magentaNeonMat,
    accentMat: cyanNeonMat,
    scale: 1.25,
    shardCount: 5,
  });
  floatingReactorCrystal.position.y = 1.55;
  animatedCrystals.push(floatingReactorCrystal);

  for (const [tx, tz] of [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ]) {
    const term = new THREE.Group();
    term.position.set(tx, 0, tz);
    term.lookAt(0, 0.14, 0);

    const stand = new THREE.Mesh(createChamferSlabGeometry(0.72, 1.18, 0.52, 0.08, 0.016), gunmetalMat);
    const consoleTop = new THREE.Mesh(createChamferSlabGeometry(0.84, 0.12, 0.62, 0.06, 0.012), containerDarkMat);
    consoleTop.position.y = 1.18;
    consoleTop.rotation.x = 0.38;
    const screenGlow = new THREE.Mesh(createChamferSlabGeometry(0.68, 0.04, 0.46, 0.04, 0.006), cyanNeonMat);
    screenGlow.position.set(0, 1.28, 0.02);
    screenGlow.rotation.x = 0.38;

    enableShadows(stand);
    term.add(stand, consoleTop, screenGlow);
    fountainGroup.add(term);
  }

  enableShadows(basinOuter);
  enableShadows(reactorPedestal);
  fountainGroup.add(
    basinOuter,
    plasmaPool,
    reactorPedestal,
    medRing,
    outerReactorRing,
    innerReactorRing,
    floatingReactorCrystal
  );
  group.add(fountainGroup);

  buildPlazaCyberKiosks({
    group,
    ownedTextures,
    animatedCrystals,
    animatedRings,
    gunmetalMat,
    slateConcreteMat,
    containerDarkMat,
    containerMidMat,
    towerRibMat,
    brushedSteelMat,
    darkHullMat,
    cyanNeonMat,
    blueNeonMat,
    violetNeonMat,
    magentaNeonMat,
    emeraldNeonMat,
    amberNeonMat,
    makeNeonMat,
  });

  // =========================================================================
  // 4. GEM TOWER CYBERPUNK SKYSCRAPER & FUTURISTIC ACCESS TERMINALS (x = 0, z = -11.4)
  // =========================================================================
  group.add(
    buildPlazaGemTowerSkyscraper({
      animatedRings,
      towerRibMat,
      towerPanelMat,
      slateConcreteMat,
      gunmetalMat,
      containerDarkMat,
      brushedSteelMat,
      cyanNeonMat,
      violetNeonMat,
      blueNeonMat,
      magentaNeonMat,
    })
  );

  // =========================================================================
  // 5. DISTANT GOLDEN-BLUE HOUR CITY SKYLINE RING (InstancedMesh, non-raycast)
  // =========================================================================
  addPlazaDistantSkyline({
    group,
    ownedGeos,
    ownedMats,
    ownedInstanced,
  });

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    for (let i = 0; i < animatedCrystals.length; i++) {
      const obj = animatedCrystals[i];
      obj.rotation.y = t * 0.95 + i * 0.7;
    }

    for (let i = 0; i < animatedRings.length; i++) {
      const ring = animatedRings[i];
      ring.rotation.y = (i % 2 === 0 ? 1 : -1) * t * 0.85;
    }

    for (let i = 0; i < pulseMaterials.length; i++) {
      const pm = pulseMaterials[i];
      pm.mat.emissiveIntensity = pm.base + Math.sin(t * pm.speed + pm.phase) * pm.amp;
    }

    for (let i = 0; i < omegaPodiums.length; i++) {
      const pod = omegaPodiums[i];
      const pTime = t + i * 0.85;
      pod.sigilMesh.rotation.z = pTime * 0.28;
      if (pod.auraGroup.visible) {
        pod.auraVeilMat.uniforms.uTime.value = pTime;
        pod.auraVeilMat.uniforms.uOpacity.value = 0.62 + Math.sin(pTime * 1.8) * 0.12;
        pod.auraOuterVeilMat.uniforms.uTime.value = pTime + 0.6;
        pod.auraOuterVeilMat.uniforms.uOpacity.value = 0.34 + Math.sin(pTime * 1.8) * 0.08;
        pod.particleMat.uniforms.uTime.value = pTime;
      }
    }
  };

  const dispose = (): void => {
    disposeObject3D(group);
    for (const inst of ownedInstanced) inst.dispose();
    for (const geo of ownedGeos) geo.dispose();
    for (const mat of ownedMats) mat.dispose();
    for (const tex of ownedTextures) {
      tex.dispose();
    }
    ownedInstanced.length = 0;
    ownedGeos.length = 0;
    ownedMats.length = 0;
    ownedTextures.length = 0;
    omegaPodiums.length = 0;
  };

  const setLowQuality = (low: boolean): void => {
    for (let i = 0; i < plazaPointLights.length; i++) {
      plazaPointLights[i].visible = !low && i === 0;
    }
  };

  return {
    group,
    animatedCrystals,
    animatedRings,
    omegaPadTopY,
    setLowQuality,
    update,
    dispose,
  };
}
