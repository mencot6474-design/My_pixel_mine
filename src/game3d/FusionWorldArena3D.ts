import * as THREE from 'three';
import {
  createCyberCrystalCluster,
  createCyberLanternBollardFinial,
  createCyberMonolithForkFinial,
  disposeCyberProp,
} from './CyberProps3D';
import { createChamferPadGeometry } from './FusionWorldPodium3D';

export interface FloatingIslandNode {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

export interface FusionArenaBuildCtx {
  group: THREE.Group;
  armorDarkMat: THREE.MeshStandardMaterial;
  armorSteelMat: THREE.MeshStandardMaterial;
  brightSteelMat: THREE.MeshStandardMaterial;
  deckTrimCyanMat: THREE.MeshStandardMaterial;
  deckTrimMagentaMat: THREE.MeshStandardMaterial;
  stageNeonMat: THREE.MeshStandardMaterial;
  portalOuterMat: THREE.MeshStandardMaterial;
  portalMidMat: THREE.MeshStandardMaterial;
  portalInnerMat: THREE.MeshStandardMaterial;
  portalOuterGroup: THREE.Group;
  portalMidGroup: THREE.Group;
  portalInnerGroup: THREE.Group;
  portalVortexMesh: THREE.Mesh;
  portalFlashMesh: THREE.Mesh;
  floatingIslands: FloatingIslandNode[];
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  customDisposers: Array<() => void>;
}

const PORTAL_CENTER = new THREE.Vector3(0, 5.15, -6.85);
const STAGE_CENTER_Z = -2.45;
const STAGE_DECK_Y = 0.76;

export function buildExpandedOctagonalArenaDeck(ctx: FusionArenaBuildCtx, darkBasaltMat: THREE.Material): void {
  // Massive 23m-wide Octagonal Cyber-Synchro Arena Platform (1.55x larger than previous 14.8m deck)
  const hullGeo = new THREE.CylinderGeometry(11.8, 10.1, 0.68, 8);
  const hullMesh = new THREE.Mesh(hullGeo, ctx.armorDarkMat);
  hullMesh.position.y = -0.52;
  hullMesh.receiveShadow = true;
  const deckGeo = new THREE.CylinderGeometry(11.35, 11.75, 0.38, 8);
  const deckMesh = new THREE.Mesh(deckGeo, darkBasaltMat);
  deckMesh.position.y = -0.19;
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  const plateGeo = new THREE.CylinderGeometry(10.2, 10.35, 0.04, 8);
  const plateMesh = new THREE.Mesh(plateGeo, ctx.armorSteelMat);
  plateMesh.position.y = 0.0;
  plateMesh.receiveShadow = true;
  ctx.ownedGeos.push(hullGeo, deckGeo, plateGeo);
  ctx.group.add(hullMesh, deckMesh, plateMesh);
  // 8 Perimeter Neon Floor Trim Rails (Outer Cyan + Inner Magenta) & 8 Heavy Corner Armor Bastions
  const outerRailGeo = new THREE.BoxGeometry(8.18, 0.075, 0.11);
  const innerRailGeo = new THREE.BoxGeometry(7.65, 0.06, 0.09);
  const cornerBumperGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.28, 6);
  const cornerStudGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.09, 6);
  ctx.ownedGeos.push(outerRailGeo, innerRailGeo, cornerBumperGeo, cornerStudGeo);
  for (let i = 0; i < 8; i++) {
    const edgeAngle = (i + 0.5) * (Math.PI / 4);
    const outerR = 10.42;
    const innerR = 9.95;
    const cyanRail = new THREE.Mesh(outerRailGeo, ctx.deckTrimCyanMat);
    cyanRail.position.set(Math.sin(edgeAngle) * outerR, 0.045, Math.cos(edgeAngle) * outerR);
    cyanRail.rotation.y = edgeAngle;
    const magentaRail = new THREE.Mesh(innerRailGeo, ctx.deckTrimMagentaMat);
    magentaRail.position.set(Math.sin(edgeAngle) * innerR, 0.048, Math.cos(edgeAngle) * innerR);
    magentaRail.rotation.y = edgeAngle;
    const vertAngle = i * (Math.PI / 4);
    const vertR = 10.95;
    const bumper = new THREE.Mesh(cornerBumperGeo, ctx.brightSteelMat);
    bumper.position.set(Math.sin(vertAngle) * vertR, 0.1, Math.cos(vertAngle) * vertR);
    bumper.castShadow = true;
    bumper.receiveShadow = true;
    const stud = new THREE.Mesh(
      cornerStudGeo,
      i % 2 === 0 ? ctx.deckTrimCyanMat : ctx.deckTrimMagentaMat
    );
    stud.position.set(Math.sin(vertAngle) * vertR, 0.26, Math.cos(vertAngle) * vertR);
    ctx.group.add(cyanRail, magentaRail, bumper, stud);
  }
}

/**
 * Builds the Elevated Cyber-Holographic Rear Showcase Stage (inspired by the Mining `"My Chibi"`
 * stage in `MineScene3D.ts`) with steel bay dividers, rear busbar, neon trims, and a wide
 * illuminated cyber stairwell descending into the front Crescent Arc arena.
 */

export function buildElevatedShowcaseStage(ctx: FusionArenaBuildCtx): void {
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0, STAGE_CENTER_Z);
  ctx.group.add(stageGroup);
  const stageBaseGeo = createChamferPadGeometry(7.6, 0.46, 3.8, 0.55, 0.02);
  const rackDeckGeo = createChamferPadGeometry(7.1, 0.3, 3.4, 0.48, 0.018);
  const rearBridgeGeo = new THREE.BoxGeometry(1.45, 0.07, 2.4);
  const frontTrimGeo = new THREE.BoxGeometry(2.25, 0.07, 0.11);
  const rearTrimGeo = new THREE.BoxGeometry(6.8, 0.07, 0.11);
  const sideWingGeo = createChamferPadGeometry(1.45, 0.14, 2.4, 0.22, 0.014);
  const stepGeo = new THREE.BoxGeometry(2.48, 0.16, 0.36);
  const stepLedGeo = new THREE.BoxGeometry(2.42, 0.035, 0.055);
  const cheekGeo = new THREE.BoxGeometry(0.24, 0.88, 1.62);
  const cheekCapGeo = new THREE.BoxGeometry(0.28, 0.07, 1.66);
  const cheekLedGeo = new THREE.BoxGeometry(0.06, 0.035, 1.62);
  ctx.ownedGeos.push(
    stageBaseGeo,
    rackDeckGeo,
    rearBridgeGeo,
    frontTrimGeo,
    rearTrimGeo,
    sideWingGeo,
    stepGeo,
    stepLedGeo,
    cheekGeo,
    cheekCapGeo,
    cheekLedGeo
  );
  const stageBase = new THREE.Mesh(stageBaseGeo, ctx.armorDarkMat);
  stageBase.receiveShadow = true;
  stageBase.castShadow = true;
  const rackDeck = new THREE.Mesh(rackDeckGeo, ctx.armorSteelMat);
  rackDeck.position.y = 0.46;
  rackDeck.receiveShadow = true;
  rackDeck.castShadow = true;
  // Low-profile floor conduit runway connecting stage to rear portal dock (zero collision with floating rings)
  const rearBridge = new THREE.Mesh(rearBridgeGeo, ctx.armorSteelMat);
  rearBridge.position.set(0, 0.035, -2.55);
  rearBridge.receiveShadow = true;
  stageGroup.add(stageBase, rackDeck, rearBridge);
  for (const sx of [-1, 1]) {
    const sideWing = new THREE.Mesh(sideWingGeo, ctx.brightSteelMat);
    sideWing.position.set(sx * 2.45, STAGE_DECK_Y - 0.02, 0);
    sideWing.receiveShadow = true;
    sideWing.castShadow = true;
    const frontTrim = new THREE.Mesh(frontTrimGeo, ctx.stageNeonMat);
    frontTrim.position.set(sx * 2.38, STAGE_DECK_Y - 0.02, 1.71);
    stageGroup.add(sideWing, frontTrim);
  }
  const rearTrim = new THREE.Mesh(rearTrimGeo, ctx.stageNeonMat);
  rearTrim.position.set(0, STAGE_DECK_Y - 0.02, -1.71);
  stageGroup.add(rearTrim);
  // Futuristic Steel Stairwell & Illuminated Treads Descending Forward from the Apex Stage
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, ctx.armorSteelMat);
    cheek.position.set(sx * 1.36, 0.38, 2.15);
    cheek.castShadow = true;
    cheek.receiveShadow = true;
    const cheekCap = new THREE.Mesh(cheekCapGeo, ctx.brightSteelMat);
    cheekCap.position.set(sx * 1.36, 0.84, 2.15);
    cheekCap.castShadow = true;
    const cheekLed = new THREE.Mesh(cheekLedGeo, ctx.stageNeonMat);
    cheekLed.position.set(sx * 1.36, 0.88, 2.15);
    stageGroup.add(cheek, cheekCap, cheekLed);
  }
  const stairStepCount = 4;
  for (let s = 0; s < stairStepCount; s++) {
    const t = (s + 0.5) / stairStepCount;
    const stepY = STAGE_DECK_Y - 0.06 - t * 0.64;
    const stepZ = 1.56 + t * 1.32;
    const stepMesh = new THREE.Mesh(stepGeo, ctx.armorSteelMat);
    stepMesh.position.set(0, stepY, stepZ);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    const stepLed = new THREE.Mesh(stepLedGeo, ctx.stageNeonMat);
    stepLed.position.set(0, stepY + 0.085, stepZ + 0.15);
    stageGroup.add(stepMesh, stepLed);
  }
}

export function buildPerimeterTechPylons(ctx: FusionArenaBuildCtx, darkBasaltMat: THREE.Material): void {
  const pylonCoords: ReadonlyArray<readonly [number, number, number]> = [
    [-9.15, -2.15, 0.35],
    [-5.85, -7.85, 0.65],
    [5.85, -7.85, -0.65],
    [9.15, -2.15, -0.35],
  ];
  const plinthGeo = new THREE.CylinderGeometry(0.68, 0.88, 0.52, 8);
  const shaftGeo = new THREE.CylinderGeometry(0.34, 0.46, 3.65, 8);
  const collarGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.22, 8);
  const neonStripGeo = new THREE.BoxGeometry(0.09, 3.1, 0.09);
  const overheadBeamGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 6);
  ctx.ownedGeos.push(plinthGeo, shaftGeo, collarGeo, neonStripGeo, overheadBeamGeo);
  for (let i = 0; i < pylonCoords.length; i++) {
    const [px, pz, rotY] = pylonCoords[i];
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(px, 0, pz);
    pylonGroup.rotation.y = rotY;
    const plinth = new THREE.Mesh(plinthGeo, darkBasaltMat);
    plinth.position.y = 0.26;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    const shaft = new THREE.Mesh(shaftGeo, ctx.armorSteelMat);
    shaft.position.y = 2.25;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    const lowerCollar = new THREE.Mesh(collarGeo, ctx.brightSteelMat);
    lowerCollar.position.y = 1.35;
    const upperCollar = new THREE.Mesh(collarGeo, ctx.brightSteelMat);
    upperCollar.position.y = 3.25;
    const neonMat = i % 2 === 0 ? ctx.deckTrimCyanMat : ctx.deckTrimMagentaMat;
    const stripFront = new THREE.Mesh(neonStripGeo, neonMat);
    stripFront.position.set(0, 2.28, 0.39);
    const stripSide = new THREE.Mesh(neonStripGeo, neonMat);
    stripSide.position.set(i < 2 ? 0.39 : -0.39, 2.28, 0);
    const finial = createCyberMonolithForkFinial({
      frameMat: ctx.armorSteelMat,
      steelMat: ctx.brightSteelMat,
      coreMat: neonMat,
      scale: 1.55,
    });
    finial.position.y = 4.05;
    ctx.customDisposers.push(() => disposeCyberProp(finial));
    const crownCrystal = createCyberCrystalCluster({
      frameMat: ctx.brightSteelMat,
      crystalMat: ctx.stageNeonMat,
      accentMat: neonMat,
      scale: 0.85,
      shardCount: 4,
    });
    crownCrystal.position.y = 4.62;
    ctx.customDisposers.push(() => disposeCyberProp(crownCrystal));
    pylonGroup.add(plinth, shaft, lowerCollar, upperCollar, stripFront, stripSide, finial, crownCrystal);
    ctx.group.add(pylonGroup);
    // Overhead energy conduit beam linking pylon crown to the outer Gantry Yoke Towers (never crossing portal face)
    const topPoint = new THREE.Vector3(px, 4.55, pz);
    const portalAnchor = new THREE.Vector3(
      px < 0 ? -4.65 : 4.65,
      4.75,
      PORTAL_CENTER.z
    );
    const dist = topPoint.distanceTo(portalAnchor);
    const beam = new THREE.Mesh(overheadBeamGeo, neonMat);
    beam.position.copy(topPoint).lerp(portalAnchor, 0.5);
    beam.scale.set(1, dist, 1);
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      portalAnchor.clone().sub(topPoint).normalize()
    );
    ctx.group.add(beam);
  }
  // 2 Front-Flank Armored Lantern Bollards framing the expanded front arena entrance
  for (const sx of [-1, 1]) {
    const bollard = createCyberLanternBollardFinial({
      frameMat: ctx.armorDarkMat,
      steelMat: ctx.brightSteelMat,
      coreMat: sx < 0 ? ctx.deckTrimCyanMat : ctx.deckTrimMagentaMat,
      scale: 1.45,
    });
    bollard.position.set(sx * 8.95, 0.04, 3.85);
    ctx.customDisposers.push(() => disposeCyberProp(bollard));
    ctx.group.add(bollard);
  }
}
/**
 * Builds the HSR/ZZZ/Stargate "Astral Quantum Synchro Gate":
 * - Low-profile recessed magnetic levitation dock (y = 0..0.82m) with a 0.50m levitation air-gap
 *   beneath the lowest outer ring clamps (y = 1.32m) â€” zero floor/base collision.
 * - Flanking Monolithic Gantry Yoke Towers positioned outside the outer ring radius (x = Â±4.65m)
 *   with inward magnetic emitter projectors â€” zero struts cutting across the rings.
 * - 3 concentric sculpted counter-rotating chrono/astrolabe rings + swirling quantum vortex core.
 */

export function buildSynchroPortal(ctx: FusionArenaBuildCtx): void {
  const portalRoot = new THREE.Group();
  portalRoot.position.copy(PORTAL_CENTER);
  ctx.group.add(portalRoot);
  // 1. Low-Profile Recessed Magnetic Levitation Dock (y = 0..0.82m, cleanly below ring bottom at y = 1.32m)
  const dockPadGeo = createChamferPadGeometry(9.8, 0.26, 2.15, 0.52, 0.018);
  const dockTier2Geo = createChamferPadGeometry(8.2, 0.22, 1.68, 0.42, 0.016);
  const emitterWellGeo = new THREE.CylinderGeometry(1.35, 1.58, 0.24, 12);
  const emitterRingGeo = new THREE.TorusGeometry(1.22, 0.045, 8, 32);
  const yokeTowerGeo = createChamferPadGeometry(0.76, 4.45, 0.96, 0.16, 0.016);
  const yokeButtressGeo = createChamferPadGeometry(0.46, 2.85, 0.72, 0.1, 0.014);
  const yokeCollarGeo = createChamferPadGeometry(0.88, 0.18, 1.08, 0.18, 0.012);
  const yokeStripGeo = new THREE.BoxGeometry(0.08, 3.85, 0.09);
  const projectorNoseGeo = new THREE.CylinderGeometry(0.16, 0.28, 0.46, 8);
  projectorNoseGeo.rotateZ(Math.PI / 2);
  ctx.ownedGeos.push(
    dockPadGeo,
    dockTier2Geo,
    emitterWellGeo,
    emitterRingGeo,
    yokeTowerGeo,
    yokeButtressGeo,
    yokeCollarGeo,
    yokeStripGeo,
    projectorNoseGeo
  );
  const dockPad = new THREE.Mesh(dockPadGeo, ctx.armorDarkMat);
  dockPad.position.set(0, 0, PORTAL_CENTER.z);
  dockPad.castShadow = true;
  dockPad.receiveShadow = true;
  const dockTier2 = new THREE.Mesh(dockTier2Geo, ctx.armorSteelMat);
  dockTier2.position.set(0, 0.26, PORTAL_CENTER.z);
  dockTier2.castShadow = true;
  dockTier2.receiveShadow = true;
  const emitterWell = new THREE.Mesh(emitterWellGeo, ctx.brightSteelMat);
  emitterWell.position.set(0, 0.6, PORTAL_CENTER.z);
  emitterWell.castShadow = true;
  emitterWell.receiveShadow = true;
  const emitterRing = new THREE.Mesh(emitterRingGeo, ctx.portalOuterMat);
  emitterRing.rotation.x = Math.PI / 2;
  emitterRing.position.set(0, 0.74, PORTAL_CENTER.z);
  ctx.group.add(dockPad, dockTier2, emitterWell, emitterRing);
  // 2. Flanking Monolithic Gantry Yoke Towers OUTSIDE the Portal (x = +-4.65m, clear of r = 3.82m outer clamps)
  for (const sx of [-1, 1]) {
    const yokeGroup = new THREE.Group();
    yokeGroup.position.set(sx * 4.65, 0.48, PORTAL_CENTER.z);
    const tower = new THREE.Mesh(yokeTowerGeo, ctx.armorSteelMat);
    tower.castShadow = true;
    tower.receiveShadow = true;
    const buttress = new THREE.Mesh(yokeButtressGeo, ctx.armorDarkMat);
    buttress.position.set(sx * 0.42, 0, 0);
    buttress.castShadow = true;
    const lowCollar = new THREE.Mesh(yokeCollarGeo, ctx.brightSteelMat);
    lowCollar.position.y = 1.35;
    const highCollar = new THREE.Mesh(yokeCollarGeo, ctx.brightSteelMat);
    highCollar.position.y = 3.25;
    const frontStrip = new THREE.Mesh(yokeStripGeo, ctx.portalOuterMat);
    frontStrip.position.set(0, 2.22, 0.49);
    // Inward Magnetic Clamp Projector aimed at the outer ring equator (stops at x = +-4.06m, outside r = 3.82m)
    const nose = new THREE.Mesh(projectorNoseGeo, ctx.brightSteelMat);
    nose.position.set(-sx * 0.46, PORTAL_CENTER.y - 0.48, 0);
    const noseCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8).rotateZ(Math.PI / 2),
      ctx.portalInnerMat
    );
    ctx.ownedGeos.push(noseCore.geometry);
    noseCore.position.set(-sx * 0.68, PORTAL_CENTER.y - 0.48, 0);
    const crownFinial = createCyberMonolithForkFinial({
      frameMat: ctx.armorSteelMat,
      steelMat: ctx.brightSteelMat,
      coreMat: ctx.portalOuterMat,
      scale: 1.45,
    });
    crownFinial.position.y = 4.45;
    ctx.customDisposers.push(() => disposeCyberProp(crownFinial));
    yokeGroup.add(
      tower,
      buttress,
      lowCollar,
      highCollar,
      frontStrip,
      nose,
      noseCore,
      crownFinial
    );
    ctx.group.add(yokeGroup);
  }
  // 3. Ring 1 (Outer Chrono-Stator Ring, r = 3.55m): Dual concentric tracks + 12 Beveled Armor Fin Clamps
  const outerTorusGeo = new THREE.TorusGeometry(3.55, 0.12, 10, 56);
  const outerSubTorusGeo = new THREE.TorusGeometry(3.32, 0.05, 8, 56);
  const outerClampGeo = createChamferPadGeometry(0.38, 0.28, 0.56, 0.08, 0.012);
  const outerToothGeo = new THREE.BoxGeometry(0.16, 0.3, 0.18);
  ctx.ownedGeos.push(outerTorusGeo, outerSubTorusGeo, outerClampGeo, outerToothGeo);
  ctx.portalOuterGroup.add(
    new THREE.Mesh(outerTorusGeo, ctx.brightSteelMat),
    new THREE.Mesh(outerSubTorusGeo, ctx.portalOuterMat)
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const clamp = new THREE.Mesh(outerClampGeo, ctx.armorSteelMat);
    clamp.position.set(Math.cos(a) * 3.56, Math.sin(a) * 3.56, 0);
    clamp.rotation.z = a + Math.PI / 2;
    const tooth = new THREE.Mesh(outerToothGeo, ctx.portalOuterMat);
    tooth.position.set(Math.cos(a) * 3.22, Math.sin(a) * 3.22, 0);
    tooth.rotation.z = a + Math.PI / 2;
    ctx.portalOuterGroup.add(clamp, tooth);
  }
  // 4. Ring 2 (Middle Counter-Rotating Astrolabe Ring, r = 2.72m) + 8 Beveled Capacitor Fin Pods
  const midTorusGeo = new THREE.TorusGeometry(2.72, 0.085, 10, 48);
  const midInnerTorusGeo = new THREE.TorusGeometry(2.54, 0.04, 8, 48);
  const midPodGeo = createChamferPadGeometry(0.3, 0.24, 0.44, 0.06, 0.01);
  const midLedGeo = new THREE.BoxGeometry(0.12, 0.28, 0.26);
  ctx.ownedGeos.push(midTorusGeo, midInnerTorusGeo, midPodGeo, midLedGeo);
  ctx.portalMidGroup.add(
    new THREE.Mesh(midTorusGeo, ctx.brightSteelMat),
    new THREE.Mesh(midInnerTorusGeo, ctx.portalMidMat)
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const pod = new THREE.Mesh(midPodGeo, ctx.armorDarkMat);
    pod.position.set(Math.cos(a) * 2.72, Math.sin(a) * 2.72, 0);
    pod.rotation.z = a + Math.PI / 2;
    const led = new THREE.Mesh(midLedGeo, ctx.portalMidMat);
    led.position.set(Math.cos(a) * 2.72, Math.sin(a) * 2.72, 0);
    led.rotation.z = a + Math.PI / 2;
    ctx.portalMidGroup.add(pod, led);
  }
  // 5. Ring 3 (Inner High-Speed Quantum Emitter Ring, r = 1.94m) + 6 Faceted Crystal Prong Emitters
  const innerTorusGeo = new THREE.TorusGeometry(1.94, 0.065, 10, 44);
  const prongCollarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.16, 6);
  const prongGeo = new THREE.ConeGeometry(0.11, 0.44, 6);
  ctx.ownedGeos.push(innerTorusGeo, prongCollarGeo, prongGeo);
  ctx.portalInnerGroup.add(new THREE.Mesh(innerTorusGeo, ctx.portalInnerMat));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const collar = new THREE.Mesh(prongCollarGeo, ctx.brightSteelMat);
    collar.position.set(Math.cos(a) * 1.92, Math.sin(a) * 1.92, 0);
    collar.rotation.z = a + Math.PI / 2;
    const prong = new THREE.Mesh(prongGeo, ctx.portalInnerMat);
    prong.position.set(Math.cos(a) * 1.66, Math.sin(a) * 1.66, 0);
    prong.rotation.z = a + Math.PI / 2;
    ctx.portalInnerGroup.add(collar, prong);
  }
  portalRoot.add(
    ctx.portalVortexMesh,
    ctx.portalFlashMesh,
    ctx.portalOuterGroup,
    ctx.portalMidGroup,
    ctx.portalInnerGroup
  );
}

export function buildFloatingCosmicIslands(ctx: FusionArenaBuildCtx, darkBasaltMat: THREE.Material): void {
  const islandSpecs: ReadonlyArray<{
    x: number;
    y: number;
    z: number;
    scale: number;
    crystalHex: string;
    phase: number;
    bobSpeed: number;
  }> = [
    { x: -15.8, y: 1.2, z: -3.2, scale: 1.65, crystalHex: '#22d3ee', phase: 0.0, bobSpeed: 1.3 },
    { x: 15.8, y: 1.45, z: -3.2, scale: 1.65, crystalHex: '#facc15', phase: 1.6, bobSpeed: 1.25 },
    { x: -18.2, y: 4.4, z: -10.8, scale: 1.95, crystalHex: '#d946ef', phase: 2.4, bobSpeed: 1.05 },
    { x: 18.2, y: 4.6, z: -10.8, scale: 1.95, crystalHex: '#38bdf8', phase: 0.9, bobSpeed: 1.1 },
    { x: -10.4, y: 5.8, z: -15.2, scale: 1.45, crystalHex: '#facc15', phase: 3.1, bobSpeed: 1.4 },
    { x: 10.4, y: 5.65, z: -15.2, scale: 1.45, crystalHex: '#22d3ee', phase: 4.2, bobSpeed: 1.35 },
    { x: -14.2, y: -0.6, z: 5.4, scale: 1.35, crystalHex: '#38bdf8', phase: 1.1, bobSpeed: 1.2 },
    { x: 14.2, y: -0.4, z: 5.4, scale: 1.35, crystalHex: '#d946ef', phase: 2.8, bobSpeed: 1.18 },
  ];
  const rockConeGeo = new THREE.ConeGeometry(1.35, 1.75, 7);
  rockConeGeo.rotateX(Math.PI);
  const capGeo = new THREE.CylinderGeometry(1.42, 1.32, 0.26, 7);
  const rimGeo = new THREE.TorusGeometry(1.38, 0.045, 6, 21);
  ctx.ownedGeos.push(rockConeGeo, capGeo, rimGeo);
  for (const sp of islandSpecs) {
    const islandGroup = new THREE.Group();
    islandGroup.position.set(sp.x, sp.y, sp.z);
    islandGroup.scale.setScalar(sp.scale);
    const underside = new THREE.Mesh(rockConeGeo, darkBasaltMat);
    underside.position.y = -0.88;
    underside.castShadow = true;
    const cap = new THREE.Mesh(capGeo, ctx.armorSteelMat);
    cap.position.y = 0.12;
    cap.receiveShadow = true;
    const crystalMat = new THREE.MeshStandardMaterial({
      color: sp.crystalHex,
      emissive: sp.crystalHex,
      emissiveIntensity: 1.25,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true,
    });
    ctx.ownedMats.push(crystalMat);
    const rim = new THREE.Mesh(rimGeo, crystalMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;
    const crystalCluster = createCyberCrystalCluster({
      frameMat: ctx.armorSteelMat,
      crystalMat,
      scale: 0.95,
      shardCount: 5,
    });
    crystalCluster.position.y = 0.25;
    ctx.customDisposers.push(() => disposeCyberProp(crystalCluster));
    islandGroup.add(underside, cap, rim, crystalCluster);
    ctx.group.add(islandGroup);
    ctx.floatingIslands.push({
      group: islandGroup,
      baseY: sp.y,
      phase: sp.phase,
      bobSpeed: sp.bobSpeed,
    });
  }
}

