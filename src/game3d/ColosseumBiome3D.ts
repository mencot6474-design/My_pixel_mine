import * as THREE from 'three';
import type { WorldId } from '../game/GameData';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  disposeObject3D,
  mergeStaticMeshesByMaterial,
} from './MeshHelpers3D';
import { PIT_CENTER_Z, PIT_FLOOR_Y, PIT_RADIUS } from './OrePitStage3D';
import { getRuneSealTexture } from './ProceduralTextures3D';

export interface WorldArenaBiome {
  readonly id: WorldId;
  readonly rockHex: string;
  readonly deckHex: string;
  readonly capHex: string;
  readonly crystalHex: string;
  readonly secondaryGlowHex: string;
  readonly crystalScale: number;
  readonly capEmissiveIntensity: number;
}

/**
 * Clean Cyber E-Sports / Idol Sky-Stage color themes per World (W1-W10).
 * Keeps outer architecture bright & crisp (silver/titanium/trim) while preserving dark center court contrast.
 */
export const WORLD_ARENA_BIOMES: Record<WorldId, WorldArenaBiome> = {
  underground: {
    id: 'underground',
    rockHex: '#64748b',
    deckHex: '#334155',
    capHex: '#e2e8f0',
    crystalHex: '#38bdf8',
    secondaryGlowHex: '#fde047',
    crystalScale: 1.0,
    capEmissiveIntensity: 0.06,
  },
  crystal: {
    id: 'crystal',
    rockHex: '#475569',
    deckHex: '#1e3a5f',
    capHex: '#bae6fd',
    crystalHex: '#22d3ee',
    secondaryGlowHex: '#a5f3fc',
    crystalScale: 1.25,
    capEmissiveIntensity: 0.14,
  },
  magma: {
    id: 'magma',
    rockHex: '#57534e',
    deckHex: '#451a03',
    capHex: '#fed7aa',
    crystalHex: '#fb923c',
    secondaryGlowHex: '#fde047',
    crystalScale: 1.15,
    capEmissiveIntensity: 0.18,
  },
  ruins: {
    id: 'ruins',
    rockHex: '#78716c',
    deckHex: '#3b2f52',
    capHex: '#e9d5ff',
    crystalHex: '#c084fc',
    secondaryGlowHex: '#34d399',
    crystalScale: 1.12,
    capEmissiveIntensity: 0.12,
  },
  astral: {
    id: 'astral',
    rockHex: '#4338ca',
    deckHex: '#1e1b4b',
    capHex: '#ddd6fe',
    crystalHex: '#e879f9',
    secondaryGlowHex: '#38bdf8',
    crystalScale: 1.2,
    capEmissiveIntensity: 0.16,
  },
  starwell: {
    id: 'starwell',
    rockHex: '#64748b',
    deckHex: '#0c4a6e',
    capHex: '#f1f5f9',
    crystalHex: '#38bdf8',
    secondaryGlowHex: '#ffffff',
    crystalScale: 1.22,
    capEmissiveIntensity: 0.15,
  },
  abyssal: {
    id: 'abyssal',
    rockHex: '#334155',
    deckHex: '#042f2e',
    capHex: '#99f6e4',
    crystalHex: '#2dd4bf',
    secondaryGlowHex: '#fb7185',
    crystalScale: 1.18,
    capEmissiveIntensity: 0.16,
  },
  chrono: {
    id: 'chrono',
    rockHex: '#52525b',
    deckHex: '#78350f',
    capHex: '#fde68a',
    crystalHex: '#fbbf24',
    secondaryGlowHex: '#22d3ee',
    crystalScale: 1.2,
    capEmissiveIntensity: 0.2,
  },
  solaris: {
    id: 'solaris',
    rockHex: '#57363c',
    deckHex: '#7c2d12',
    capHex: '#fecdd3',
    crystalHex: '#fb7185',
    secondaryGlowHex: '#fde047',
    crystalScale: 1.24,
    capEmissiveIntensity: 0.22,
  },
  elysium: {
    id: 'elysium',
    rockHex: '#4c4675',
    deckHex: '#312e81',
    capHex: '#f5d0fe',
    crystalHex: '#c084fc',
    secondaryGlowHex: '#22d3ee',
    crystalScale: 1.28,
    capEmissiveIntensity: 0.24,
  },
};

interface EqualizerBarSeed {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ry: number;
  readonly phase: number;
}

export interface ColosseumBiomeHandle {
  readonly group: THREE.Group;
  setBiome: (worldId: WorldId, crystalOverrideHex?: string) => void;
  setLowQuality: (low: boolean) => void;
  update: (elapsed: number, pulseBoost: number) => void;
  dispose: () => void;
}

/**
 * Builds a watertight, beveled horizontal curved deck arc centered on North (-Z)
 * by rotating an XY extruded arc sector by -PI/2 around X.
 */
function createClosedArcDeckGeometry(
  rInner: number,
  rOuter: number,
  spanRad: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const startA = Math.PI / 2 - spanRad;
  const endA = Math.PI / 2 + spanRad;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, startA, endA, false);
  shape.absarc(0, 0, rInner, endA, startA, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 32,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Builds the Cyber E-Sports / Idol Sky-Stage superstructure:
 * - Watertight beveled Crescent North Stage Extension cleanly beneath the hovering Chibi podiums
 *   (no redundant pads/podiums stacked under PlotPedestal3D) + rear holo-glass guardrail
 * - Symmetric Left & Right Wing Catwalks cleanly docking at the outer rim of the wing pads
 * - Under-hull Anti-Grav Turbine Ring + 4 Thruster Nacelles + 4 Swept Aero Wings
 * - 2 Rear Framing Stage Light-Pylons & low translucent Acrylic Holo-Barriers
 */
export function createColosseumBiomeHandle(initialWorld: WorldId = 'underground'): ColosseumBiomeHandle {
  const biome0 = WORLD_ARENA_BIOMES[initialWorld] ?? WORLD_ARENA_BIOMES.underground;
  const group = new THREE.Group();
  const staticGroup = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const alloyMat = new THREE.MeshStandardMaterial({
    color: biome0.capHex,
    emissive: biome0.capHex,
    emissiveIntensity: biome0.capEmissiveIntensity,
    roughness: 0.28,
    metalness: 0.62,
    flatShading: true,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: biome0.rockHex,
    roughness: 0.42,
    metalness: 0.46,
    flatShading: true,
  });
  const hullDarkMat = new THREE.MeshStandardMaterial({
    color: biome0.deckHex,
    roughness: 0.36,
    metalness: 0.54,
    flatShading: true,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: biome0.crystalHex,
    emissive: biome0.crystalHex,
    emissiveIntensity: 1.2,
    roughness: 0.18,
    metalness: 0.25,
    flatShading: true,
  });
  const secondaryNeonMat = new THREE.MeshStandardMaterial({
    color: biome0.secondaryGlowHex,
    emissive: biome0.secondaryGlowHex,
    emissiveIntensity: 1.05,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const holoGlassMat = new THREE.MeshBasicMaterial({
    color: biome0.crystalHex,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ownedMats.push(alloyMat, slateMat, hullDarkMat, neonMat, secondaryNeonMat, holoGlassMat);

  // 1. Watertight Crescent North Stage Extension (flat clean outer deck r=8.35..10.65 at y_world=0)
  const outerWingGeo = createClosedArcDeckGeometry(8.35, 10.65, 1.2, 0.28);
  const outerTrimGeo = createClosedArcDeckGeometry(10.52, 10.72, 1.2, 0.06);
  ownedGeos.push(outerWingGeo, outerTrimGeo);

  const outerWing = new THREE.Mesh(outerWingGeo, slateMat);
  outerWing.position.y = 0.1;
  outerWing.castShadow = true;
  outerWing.receiveShadow = true;

  const outerTrim = new THREE.Mesh(outerTrimGeo, neonMat);
  outerTrim.position.y = 0.36;
  staticGroup.add(outerWing, outerTrim);

  // Low Translucent Holo-Glass Guardrail curving cleanly along outer rim (r = 10.62)
  const rearRailGeo = new THREE.CylinderGeometry(10.62, 10.62, 0.34, 32, 1, true, Math.PI - 1.15, 2.3);
  ownedGeos.push(rearRailGeo);
  const rearRail = new THREE.Mesh(rearRailGeo, holoGlassMat);
  rearRail.position.y = 0.57;
  rearRail.raycast = () => {};
  group.add(rearRail);

  // 2. Symmetric Left & Right Wing Catwalks connecting stadium rim cleanly to the edge of the wing pads
  // Stops at edge of octagonal pads (dist - 1.62m) so neither Cargo Pod nor Console keels are clipped!
  for (const side of [-1, 1] as const) {
    const padX = side * 9.85;
    const padY = 0.55 - PIT_FLOOR_Y;
    const padZ = 3.85 - PIT_CENTER_Z;
    const ang = Math.atan2(padX, padZ);
    const rx = Math.sin(ang) * (PIT_RADIUS + 2.05);
    const rz = Math.cos(ang) * (PIT_RADIUS + 2.05);
    const tx = padX - Math.sin(ang) * 1.56;
    const tz = padZ - Math.cos(ang) * 1.56;
    const dx = tx - rx;
    const dy = padY - 0.42;
    const dz = tz - rz;
    const dist = Math.max(0.5, Math.hypot(dx, dy, dz));
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz));

    const deckGeo = createChamferSlabGeometry(1.75, 0.16, dist, 0.18, 0.016);
    const deckRailGeo = new THREE.BoxGeometry(0.11, 0.06, Math.max(0.2, dist - 0.14));
    ownedGeos.push(deckGeo, deckRailGeo);

    const wingGroup = new THREE.Group();
    wingGroup.position.set((rx + tx) * 0.5, (0.42 + padY) * 0.5 - 0.04, (rz + tz) * 0.5);
    wingGroup.rotation.order = 'YXZ';
    wingGroup.rotation.y = ang;
    wingGroup.rotation.x = pitch;

    const wingDeck = new THREE.Mesh(deckGeo, slateMat);
    wingDeck.castShadow = true;
    wingDeck.receiveShadow = true;
    const railL = new THREE.Mesh(deckRailGeo, neonMat);
    railL.position.set(-0.78, 0.1, 0);
    const railR = new THREE.Mesh(deckRailGeo, neonMat);
    railR.position.set(0.78, 0.1, 0);
    wingGroup.add(wingDeck, railL, railR);
    staticGroup.add(wingGroup);
  }

  // Left Wing Hover-Pad + Cyber Tournament Holo-Console (mirrors Vault Dais keel cleanly)
  const leftPadX = -9.85;
  const leftPadY = 0.55 - PIT_FLOOR_Y;
  const leftPadZ = 3.85 - PIT_CENTER_Z;
  const consoleKeelGeo = new THREE.CylinderGeometry(1.54, 0.44, 0.68, 8);
  const consoleThrusterGeo = new THREE.CylinderGeometry(0.52, 0.32, 0.08, 8);
  const consoleBaseGeo = new THREE.CylinderGeometry(1.62, 1.52, 0.22, 8);
  const consoleTopGeo = new THREE.CylinderGeometry(1.34, 1.48, 0.2, 8);
  const consoleTrimGeo = new THREE.CylinderGeometry(1.38, 1.4, 0.045, 8);
  const consoleBodyGeo = createChamferSlabGeometry(1.22, 0.56, 0.68, 0.14, 0.015);
  const holoScreenGeo = createChamferSlabGeometry(1.06, 0.54, 0.08, 0.06, 0.01);
  ownedGeos.push(
    consoleKeelGeo,
    consoleThrusterGeo,
    consoleBaseGeo,
    consoleTopGeo,
    consoleTrimGeo,
    consoleBodyGeo,
    holoScreenGeo
  );

  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(leftPadX, leftPadY, leftPadZ);
  consoleGroup.rotation.y = Math.PI / 6;

  const cKeel = new THREE.Mesh(consoleKeelGeo, hullDarkMat);
  cKeel.position.y = -0.34;
  cKeel.rotation.y = Math.PI / 8;
  cKeel.castShadow = true;

  const cThruster = new THREE.Mesh(consoleThrusterGeo, neonMat);
  cThruster.position.y = -0.71;
  cThruster.rotation.y = Math.PI / 8;

  const cBase = new THREE.Mesh(consoleBaseGeo, hullDarkMat);
  cBase.position.y = 0.11;
  cBase.rotation.y = Math.PI / 8;
  cBase.castShadow = true;
  cBase.receiveShadow = true;

  const cTop = new THREE.Mesh(consoleTopGeo, alloyMat);
  cTop.position.y = 0.32;
  cTop.rotation.y = Math.PI / 8;
  cTop.castShadow = true;
  cTop.receiveShadow = true;

  const cTrim = new THREE.Mesh(consoleTrimGeo, neonMat);
  cTrim.position.y = 0.43;
  cTrim.rotation.y = Math.PI / 8;

  const cBody = new THREE.Mesh(consoleBodyGeo, slateMat);
  cBody.position.set(0, 0.72, -0.06);
  cBody.castShadow = true;
  cBody.receiveShadow = true;

  const cScreen = new THREE.Mesh(holoScreenGeo, secondaryNeonMat);
  cScreen.position.set(0, 1.12, 0.06);
  cScreen.rotation.x = -0.32;
  consoleGroup.add(cKeel, cThruster, cBase, cTop, cTrim, cBody, cScreen);
  staticGroup.add(consoleGroup);

  // 3 Animated Vertical Equalizer Blades on the Left Console
  const eqBladeGeo = createChamferSlabGeometry(0.22, 0.88, 0.08, 0.04, 0.01);
  ownedGeos.push(eqBladeGeo);
  const eqBlades: THREE.Mesh[] = [];
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(eqBladeGeo, holoGlassMat);
    const bx = (b - 1) * 0.35;
    blade.position.set(
      leftPadX + bx * Math.cos(Math.PI / 6) - 0.16 * Math.sin(Math.PI / 6),
      leftPadY + 1.48,
      leftPadZ - bx * Math.sin(Math.PI / 6) - 0.16 * Math.cos(Math.PI / 6)
    );
    blade.rotation.y = Math.PI / 6;
    group.add(blade);
    eqBlades.push(blade);
  }

  // 3. 4 Swept Aerodynamic Stabilizer Wings + Under-Hull Anti-Grav Thruster Nacelles
  const aeroWingGeo = createChamferSlabGeometry(1.65, 0.14, 2.2, 0.32, 0.016);
  const aeroNeonGeo = new THREE.BoxGeometry(0.14, 0.06, 1.9);
  const nacelleGeo = new THREE.CylinderGeometry(0.85, 0.45, 0.42, 8);
  const nacelleGlowGeo = new THREE.CylinderGeometry(0.42, 0.25, 0.12, 8);
  ownedGeos.push(aeroWingGeo, aeroNeonGeo, nacelleGeo, nacelleGlowGeo);

  for (const angDeg of [46, 136, -46, -136]) {
    const rad = (angDeg * Math.PI) / 180;
    const isRear = Math.abs(angDeg) < 90;
    const wingR = isRear ? PIT_RADIUS + 4.35 : PIT_RADIUS + 2.85;
    const wingY = isRear ? 0.26 : 0.22;

    const wing = new THREE.Mesh(aeroWingGeo, alloyMat);
    wing.position.set(Math.sin(rad) * wingR, wingY, -Math.cos(rad) * wingR);
    wing.rotation.y = -rad;
    wing.castShadow = true;

    const wingEdge = new THREE.Mesh(aeroNeonGeo, neonMat);
    wingEdge.position.set(Math.sin(rad) * (wingR + 0.58), wingY + 0.08, -Math.cos(rad) * (wingR + 0.58));
    wingEdge.rotation.y = -rad;
    staticGroup.add(wing, wingEdge);

    const nx = Math.sin(rad) * 4.8;
    const nz = -Math.cos(rad) * 4.8;
    const nacelle = new THREE.Mesh(nacelleGeo, hullDarkMat);
    nacelle.position.set(nx, -1.06, nz);
    const nGlow = new THREE.Mesh(nacelleGlowGeo, neonMat);
    nGlow.position.set(nx, -1.32, nz);
    staticGroup.add(nacelle, nGlow);
  }

  // 4. 2 Low-Profile Swept Cyber Stage Wing-Fins seated cleanly on outerWing left & right ends
  const wingBaseGeo = createChamferSlabGeometry(0.84, 0.16, 0.92, 0.16, 0.014);
  const wingBaseRimGeo = createChamferSlabGeometry(0.76, 0.045, 0.84, 0.14, 0.008);
  ownedGeos.push(wingBaseGeo, wingBaseRimGeo);

  const mainFinPts: ReadonlyArray<readonly [number, number]> = [
    [-0.2, 0.0],
    [0.28, 0.0],
    [0.62, 1.24],
    [0.44, 1.4],
    [0.14, 1.18],
    [-0.08, 0.72],
  ];
  const neonFinPts: ReadonlyArray<readonly [number, number]> = [
    [-0.25, 0.0],
    [-0.12, 0.0],
    [0.24, 1.24],
    [0.1, 1.18],
  ];
  const subFinPts: ReadonlyArray<readonly [number, number]> = [
    [-0.26, 0.0],
    [0.14, 0.0],
    [0.36, 0.68],
    [0.2, 0.78],
    [-0.08, 0.52],
  ];
  const subAccentPts: ReadonlyArray<readonly [number, number]> = [
    [-0.28, 0.04],
    [-0.17, 0.04],
    [0.14, 0.72],
    [0.03, 0.68],
  ];
  const holoChevronPts: ReadonlyArray<readonly [number, number]> = [
    [-0.36, 0.1],
    [-0.26, 0.1],
    [0.06, 1.14],
    [-0.06, 1.08],
  ];
  const orientPts = (
    pts: ReadonlyArray<readonly [number, number]>,
    side: -1 | 1
  ): ReadonlyArray<readonly [number, number]> =>
    side === 1 ? pts : [...pts].reverse().map(([x, y]) => [-x, y] as const);

  const pylonBeams: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const mountAng = side * 1.12;
    const mountR = 9.95;
    const finRoot = new THREE.Group();
    finRoot.position.set(Math.sin(mountAng) * mountR, 0.39, -Math.cos(mountAng) * mountR);
    finRoot.rotation.y = side * -0.44;

    const basePod = new THREE.Mesh(wingBaseGeo, hullDarkMat);
    basePod.castShadow = true;
    basePod.receiveShadow = true;

    const baseRim = new THREE.Mesh(wingBaseRimGeo, neonMat);
    baseRim.position.y = 0.14;

    const mainFinGeo = createExtrudedProfileGeometry(orientPts(mainFinPts, side), 0.18, 0.016);
    const neonFinGeo = createExtrudedProfileGeometry(orientPts(neonFinPts, side), 0.11, 0.01);
    const subFinGeo = createExtrudedProfileGeometry(orientPts(subFinPts, side), 0.14, 0.014);
    const subAccentGeo = createExtrudedProfileGeometry(orientPts(subAccentPts, side), 0.09, 0.008);
    const holoChevronGeo = createExtrudedProfileGeometry(orientPts(holoChevronPts, side), 0.03, 0.004);
    ownedGeos.push(mainFinGeo, neonFinGeo, subFinGeo, subAccentGeo, holoChevronGeo);

    const mainFin = new THREE.Mesh(mainFinGeo, alloyMat);
    mainFin.position.set(0, 0.14, -0.08);
    mainFin.castShadow = true;
    mainFin.receiveShadow = true;

    const neonFin = new THREE.Mesh(neonFinGeo, neonMat);
    neonFin.position.set(0, 0.16, -0.06);

    const subFin = new THREE.Mesh(subFinGeo, hullDarkMat);
    subFin.position.set(0, 0.14, 0.14);
    subFin.castShadow = true;

    const subAccent = new THREE.Mesh(subAccentGeo, secondaryNeonMat);
    subAccent.position.set(0, 0.15, 0.15);

    finRoot.add(basePod, baseRim, mainFin, neonFin, subFin, subAccent);
    staticGroup.add(finRoot);

    const holoWing = new THREE.Mesh(holoChevronGeo, holoGlassMat);
    holoWing.position.set(Math.sin(mountAng) * mountR, 0.55, -Math.cos(mountAng) * mountR);
    holoWing.rotation.y = side * -0.44;
    holoWing.raycast = () => {};
    group.add(holoWing);
    pylonBeams.push(holoWing);
  }

  mergeStaticMeshesByMaterial(staticGroup);
  staticGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && !ownedGeos.includes(child.geometry)) {
      ownedGeos.push(child.geometry);
    }
  });
  group.add(staticGroup);

  // 5. Under-Hull Glowing Anti-Grav Turbine Ring + Front Acrylic Perimeter Barriers
  const turbineRingGeo = new THREE.RingGeometry(2.6, 4.1, 40);
  const turbineMat = new THREE.MeshBasicMaterial({
    color: biome0.crystalHex,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ownedGeos.push(turbineRingGeo);
  ownedMats.push(turbineMat);
  const turbineMesh = new THREE.Mesh(turbineRingGeo, turbineMat);
  turbineMesh.rotation.x = Math.PI / 2;
  turbineMesh.position.y = -1.26;
  turbineMesh.raycast = () => {};
  group.add(turbineMesh);

  for (const arcStart of [-1.1, 0.42]) {
    const barrierGeo = new THREE.CylinderGeometry(8.56, 8.56, 0.26, 14, 1, true, arcStart, 0.68);
    ownedGeos.push(barrierGeo);
    const barrier = new THREE.Mesh(barrierGeo, holoGlassMat);
    barrier.position.y = 0.53;
    barrier.raycast = () => {};
    group.add(barrier);
  }

  // 6. 100% Flat Horizontal Rotating Battle-Court Holo-Seal Ring (open center for floor raycast)
  const sealTex = getRuneSealTexture();
  const sealRingGeo = new THREE.RingGeometry(3.4, 5.7, 48);
  const sealMat = new THREE.MeshBasicMaterial({
    ...(sealTex ? { map: sealTex } : {}),
    color: biome0.crystalHex,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ownedGeos.push(sealRingGeo);
  ownedMats.push(sealMat);
  const sealRingMesh = new THREE.Mesh(sealRingGeo, sealMat);
  sealRingMesh.rotation.x = -Math.PI / 2;
  sealRingMesh.position.y = 0.025;
  sealRingMesh.raycast = () => {};
  group.add(sealRingMesh);

  // 7. Animated Stage Equalizer Light-Bars mounted cleanly along the outer rear rim (r = 10.68, clear of all podiums)
  const eqSeeds: EqualizerBarSeed[] = [];
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const ang = -1.04 + t * 2.08;
    const r = 10.68;
    eqSeeds.push({
      x: Math.sin(ang) * r,
      y: 0.48,
      z: -Math.cos(ang) * r,
      ry: -ang,
      phase: i * 0.45,
    });
  }
  const eqGeo = new THREE.BoxGeometry(0.42, 0.08, 0.09);
  ownedGeos.push(eqGeo);
  const eqInst = new THREE.InstancedMesh(eqGeo, secondaryNeonMat, eqSeeds.length);
  group.add(eqInst);

  const dummy = new THREE.Object3D();
  let lowQuality = false;

  const updateEqualizer = (elapsed: number, pulseBoost: number): void => {
    const active = lowQuality ? 0 : eqSeeds.length;
    eqInst.count = active;
    if (active === 0) return;
    for (let i = 0; i < active; i++) {
      const s = eqSeeds[i];
      const wave = 0.55 + 0.45 * Math.sin(elapsed * 4.2 + s.phase);
      dummy.position.set(s.x, s.y + wave * 0.05, s.z);
      dummy.rotation.set(0, s.ry, 0);
      dummy.scale.set(1, 0.7 + wave * 0.9 + pulseBoost * 0.8, 1);
      dummy.updateMatrix();
      eqInst.setMatrixAt(i, dummy.matrix);
    }
    eqInst.instanceMatrix.needsUpdate = true;
  };
  updateEqualizer(0, 0);

  return {
    group,
    setBiome(worldId: WorldId, crystalOverrideHex?: string): void {
      const biome = WORLD_ARENA_BIOMES[worldId] ?? WORLD_ARENA_BIOMES.underground;
      const cryHex = crystalOverrideHex ?? biome.crystalHex;
      slateMat.color.set(biome.rockHex);
      hullDarkMat.color.set(biome.deckHex);
      alloyMat.color.set(biome.capHex);
      alloyMat.emissive.set(biome.capHex);
      alloyMat.emissiveIntensity = biome.capEmissiveIntensity;
      neonMat.color.set(cryHex);
      neonMat.emissive.set(cryHex);
      secondaryNeonMat.color.set(biome.secondaryGlowHex);
      secondaryNeonMat.emissive.set(biome.secondaryGlowHex);
      holoGlassMat.color.set(cryHex);
      turbineMat.color.set(cryHex);
      sealMat.color.set(biome.secondaryGlowHex);
    },
    setLowQuality(low: boolean): void {
      lowQuality = low;
      eqInst.visible = !low;
      sealRingMesh.visible = !low;
      for (let i = 0; i < pylonBeams.length; i++) {
        pylonBeams[i].visible = !low;
      }
      if (!low) updateEqualizer(0, 0);
    },
    update(elapsed: number, pulseBoost: number): void {
      neonMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 2.5) * 0.16 + pulseBoost * 0.85;
      secondaryNeonMat.emissiveIntensity = 1.0 + Math.sin(elapsed * 3.1 + 0.8) * 0.15 + pulseBoost * 0.7;
      for (let i = 0; i < eqBlades.length; i++) {
        const b = eqBlades[i];
        const s = 0.65 + 0.45 * Math.sin(elapsed * 3.8 + i * 1.1);
        b.scale.y = s + pulseBoost * 0.45;
      }
      if (!lowQuality) {
        sealRingMesh.rotation.z = elapsed * 0.14;
        sealMat.opacity = 0.2 + Math.sin(elapsed * 2.0) * 0.04 + pulseBoost * 0.16;
        turbineMat.opacity = 0.28 + Math.sin(elapsed * 3.0) * 0.06 + pulseBoost * 0.2;
        updateEqualizer(elapsed, pulseBoost);
      }
    },
    dispose(): void {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      ownedGeos.length = 0;
      ownedMats.length = 0;
      disposeObject3D(group);
    },
  };
}
