import * as THREE from 'three';
import { createCyberLanternBollardFinial } from './CyberProps3D';
import {
  createExtrudedSlabGeometry,
  createProceduralTreasureChest,
  disposeObject3D,
  enableShadows,
  type ProceduralChestHandle,
  type ProceduralChestOptions,
} from './ProceduralTreasureChest3D';

export { createProceduralTreasureChest, disposeObject3D, type ProceduralChestHandle, type ProceduralChestOptions };

export interface ChestVaultStationOptions {
  crystalColor?: number | string;
  cliffColor?: number | string;
  trimColor?: number;
}

export interface ChestVaultStationHandle {
  group: THREE.Group;
  setPalette: (crystalColor: number | string, cliffColor: number | string) => void;
  update: (dtSec: number, elapsed: number, chestHovered: boolean, chestBounce: number) => void;
  dispose: () => void;
}

interface MovingOreChunk {
  group: THREE.Group;
  progress: number;
  spinSpeed: number;
}

const ESCALATOR_START_X = 5.48;
const ESCALATOR_START_Y = -0.52;
const ESCALATOR_END_X = 7.76;
const ESCALATOR_END_Y = 0.46;
const ESCALATOR_Z = 0.15;

const RAMP_DX = ESCALATOR_END_X - ESCALATOR_START_X;
const RAMP_DY = ESCALATOR_END_Y - ESCALATOR_START_Y;
const RAMP_LENGTH = Math.hypot(RAMP_DX, RAMP_DY);
const RAMP_ANGLE = Math.atan2(RAMP_DY, RAMP_DX);

const BELT_CLEAT_COUNT = 18;
const CLEAT_LOOP_SPAN = RAMP_LENGTH * 2 + 0.36;


export function createChestVaultStation(
  options: ChestVaultStationOptions = {}
): ChestVaultStationHandle {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x161f30,
    roughness: 0.76,
    metalness: 0.22,
    flatShading: true,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: 0x26354f,
    roughness: 0.46,
    metalness: 0.36,
    flatShading: true,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1b263b,
    roughness: 0.44,
    metalness: 0.38,
    flatShading: true,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0x7084a3,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.14,
    roughness: 0.32,
    metalness: 0.46,
    flatShading: true,
  });
  const plasmaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: options.crystalColor ?? 0x38bdf8,
    emissive: options.crystalColor ?? 0x38bdf8,
    emissiveIntensity: 1.05,
    roughness: 0.18,
    metalness: 0.32,
    flatShading: true,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    roughness: 0.86,
    metalness: 0.14,
    flatShading: true,
  });
  const cleatMat = new THREE.MeshStandardMaterial({
    color: 0x526582,
    roughness: 0.42,
    metalness: 0.48,
    flatShading: true,
  });
  const goldOreMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.65,
    flatShading: true,
  });

  // =========================================================================
  // 1. LOWER PIT INTAKE HOPPER (inside pit chute x = 5.18 .. 5.80, y = -0.68)
  // =========================================================================
  const intakeGroup = new THREE.Group();
  intakeGroup.position.set(5.48, -0.68, ESCALATOR_Z);

  const intakeApron = new THREE.Mesh(
    createExtrudedSlabGeometry(0.95, 0.14, 1.18, 0.1, 0.02),
    stoneMat
  );
  intakeApron.position.set(-0.08, 0, 0);
  enableShadows(intakeApron);
  intakeGroup.add(intakeApron);

  // Flared intake steel wing guides scooping ore cleanly onto the belt
  for (const sz of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.09), darkIronMat);
    wing.position.set(-0.18, 0.22, sz * 0.48);
    wing.rotation.y = sz * 0.24;
    const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.11), brassMat);
    wingTrim.position.set(-0.18, 0.4, sz * 0.48);
    wingTrim.rotation.y = sz * 0.24;
    enableShadows(wing);
    intakeGroup.add(wing, wingTrim);
  }
  const intakeGlowBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.72), crystalMat);
  intakeGlowBar.position.set(-0.34, 0.15, 0);
  intakeGroup.add(intakeGlowBar);
  group.add(intakeGroup);

  // =========================================================================
  // 2. CONTINUOUS INCLINED ORE ESCALATOR BRIDGE (x 5.48 -> 7.76, y -0.52 -> 0.46)
  // =========================================================================
  const escalatorGroup = new THREE.Group();
  escalatorGroup.position.set(ESCALATOR_START_X, ESCALATOR_START_Y, ESCALATOR_Z);
  escalatorGroup.rotation.z = RAMP_ANGLE;
  group.add(escalatorGroup);

  // Structural Under-Chassis & Rubber Conveyor Track Bed
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH, 0.14, 0.86), darkIronMat);
  chassis.position.set(RAMP_LENGTH * 0.5, -0.02, 0);
  enableShadows(chassis);

  const beltCore = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.04, 0.085, 0.68), beltMat);
  beltCore.position.set(RAMP_LENGTH * 0.5, 0.045, 0);
  beltCore.receiveShadow = true;
  escalatorGroup.add(chassis, beltCore);

  // Side Guide Girder Walls + Brass Handrails + Glowing Crystal Conduit Strips
  for (const sz of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.1, 0.28, 0.095), slateMat);
    wall.position.set(RAMP_LENGTH * 0.5, 0.12, sz * 0.42);
    enableShadows(wall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH + 0.16, 0.055, 0.12), brassMat);
    rail.position.set(RAMP_LENGTH * 0.5, 0.27, sz * 0.42);
    enableShadows(rail);

    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(RAMP_LENGTH - 0.08, 0.038, 0.03), crystalMat);
    lightStrip.position.set(RAMP_LENGTH * 0.5, 0.18, sz * 0.365);

    escalatorGroup.add(wall, rail, lightStrip);
  }

  // Lower & Upper Brass-Capped Drive Rollers
  const rollerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.78, 10);
  for (const rx of [0.02, RAMP_LENGTH - 0.02]) {
    const roller = new THREE.Mesh(rollerGeo, brassMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(rx, 0.045, 0);
    enableShadows(roller);
    escalatorGroup.add(roller);
  }

  // Instanced Moving Tread Cleats climbing smoothly along the closed belt loop
  const cleatGeo = new THREE.BoxGeometry(0.075, 0.04, 0.62);
  const cleatInstances = new THREE.InstancedMesh(cleatGeo, cleatMat, BELT_CLEAT_COUNT);
  cleatInstances.castShadow = false;
  cleatInstances.receiveShadow = true;
  escalatorGroup.add(cleatInstances);

  // Grounded Support Stanchions connecting Escalator to Trench (y=-0.67) and Apron (y=0.0)
  const stanchionSpecs: [number, number, number][] = [
    [6.42, -0.67, -0.14], // Trench floor pier
    [7.28, 0.0, 0.22], // Courtyard/vault apron abutment pier
  ];
  for (const [sx, bottomY, topY] of stanchionSpecs) {
    const h = Math.max(0.1, topY - bottomY);
    for (const sz of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.12), darkIronMat);
      leg.position.set(sx, bottomY + h * 0.5, ESCALATOR_Z + sz);
      enableShadows(leg);
      group.add(leg);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.84), slateMat);
    crossBeam.position.set(sx, topY - 0.04, ESCALATOR_Z);
    enableShadows(crossBeam);
    group.add(crossBeam);
  }

  // =========================================================================
  // 3. TIERED VAULT SANCTUARY PLATFORM ("Tempat Chest" at x = 8.45, z = 0.15)
  // =========================================================================
  const vaultGroup = new THREE.Group();
  vaultGroup.position.set(8.45, 0, ESCALATOR_Z);
  group.add(vaultGroup);

  // Tier 1: Grounded Chamfered Stone Plinth (y = 0.0 .. 0.16)
  // Left edge reaches x = 8.45 - 1.42 = 7.03, cleanly overlapping courtyard rim & escalator end
  const plinthTier = new THREE.Mesh(
    createExtrudedSlabGeometry(2.84, 0.16, 2.86, 0.28, 0.03),
    stoneMat
  );
  plinthTier.position.y = 0;
  enableShadows(plinthTier);
  vaultGroup.add(plinthTier);

  // Tier 2: Machined Steel & Brass Vault Deck (y = 0.16 .. 0.34)
  const metalDeck = new THREE.Mesh(
    createExtrudedSlabGeometry(2.44, 0.18, 2.46, 0.26, 0.025),
    slateMat
  );
  metalDeck.position.y = 0.16;
  enableShadows(metalDeck);

  const deckBrassTrim = new THREE.Mesh(
    createExtrudedSlabGeometry(2.5, 0.055, 2.52, 0.26, 0.012),
    brassMat
  );
  deckBrassTrim.position.y = 0.295;
  enableShadows(deckBrassTrim);
  vaultGroup.add(metalDeck, deckBrassTrim);

  // Direct Escalator-to-Vault Intake Archway & Discharge Slide (local x = -0.95 .. -0.35)
  // Bridges cleanly from escalator end (world x = 7.76 => local x = -0.69) into the Chest Dais!
  const intakeSlide = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.68), darkIronMat);
  intakeSlide.position.set(-0.62, 0.42, 0);
  intakeSlide.rotation.z = -0.18;
  enableShadows(intakeSlide);

  const slideGlowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.025, 0.28), crystalMat);
  slideGlowStrip.position.set(-0.61, 0.46, 0);
  slideGlowStrip.rotation.z = -0.18;

  // Flared Hopper Cheek Walls & Overhead Intake Arch Gate
  for (const sz of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.1), slateMat);
    cheek.position.set(-0.66, 0.5, sz * 0.39);
    const cheekCap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.13), brassMat);
    cheekCap.position.set(-0.66, 0.68, sz * 0.39);

    const archPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.72, 6), darkIronMat);
    archPost.position.set(-0.74, 0.68, sz * 0.46);
    enableShadows(cheek);
    enableShadows(cheekCap);
    enableShadows(archPost);
    vaultGroup.add(cheek, cheekCap, archPost);
  }

  const archLintel = new THREE.Mesh(
    createExtrudedSlabGeometry(0.24, 0.14, 1.06, 0.05, 0.018),
    brassMat
  );
  archLintel.position.set(-0.74, 0.99, 0);
  const archBeaconPlinth = new THREE.Mesh(
    createExtrudedSlabGeometry(0.2, 0.05, 0.62, 0.03, 0.01),
    darkIronMat
  );
  archBeaconPlinth.position.set(-0.74, 1.13, 0);
  const archBeacon = new THREE.Mesh(
    createExtrudedSlabGeometry(0.12, 0.085, 0.5, 0.025, 0.012),
    crystalMat
  );
  archBeacon.position.set(-0.74, 1.185, 0);
  enableShadows(archLintel);
  vaultGroup.add(intakeSlide, slideGlowStrip, archLintel, archBeaconPlinth, archBeacon);

  // Tier 3: Central Octagonal Chest Dais (y = 0.34 .. 0.48)
  const daisLower = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.08, 8), darkIronMat);
  daisLower.position.y = 0.38;
  daisLower.rotation.y = Math.PI / 8;

  const daisTop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.83, 0.065, 8), slateMat);
  daisTop.position.y = 0.448;
  daisTop.rotation.y = Math.PI / 8;

  const daisEnergyRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.036, 6, 8), crystalMat);
  daisEnergyRing.rotation.x = Math.PI / 2;
  daisEnergyRing.rotation.z = Math.PI / 8;
  daisEnergyRing.position.y = 0.43;

  const daisGoldCollar = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.028, 6, 8), brassMat);
  daisGoldCollar.rotation.x = Math.PI / 2;
  daisGoldCollar.rotation.z = Math.PI / 8;
  daisGoldCollar.position.y = 0.48;

  enableShadows(daisLower);
  enableShadows(daisTop);
  vaultGroup.add(daisLower, daisTop, daisEnergyRing, daisGoldCollar);

  // Rear/Outer Framing Lantern Pylons (LatheGeometry silhouettes at +X corners so camera front-left view stays clear)
  const pylonProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.19, 0.0),
    new THREE.Vector2(0.17, 0.12),
    new THREE.Vector2(0.11, 0.22),
    new THREE.Vector2(0.095, 0.72),
    new THREE.Vector2(0.15, 0.82),
    new THREE.Vector2(0.12, 0.92),
    new THREE.Vector2(0.0, 0.94),
  ];
  const pylonGeo = new THREE.LatheGeometry(pylonProfile, 8);

  for (const sz of [-0.92, 0.92]) {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(0.92, 0.34, sz);

    const body = new THREE.Mesh(pylonGeo, darkIronMat);
    const finial = createCyberLanternBollardFinial({
      frameMat: darkIronMat,
      steelMat: brassMat,
      coreMat: crystalMat,
      scale: 0.74,
    });
    finial.position.y = 0.92;

    enableShadows(body);
    pylonGroup.add(body, finial);
    vaultGroup.add(pylonGroup);
  }

  // Multi-Part Plasma Ore Refinery aligned behind Chest Vault along rail axis (world 10.80, 0.17, 0.15)
  const refineryGroup = new THREE.Group();
  refineryGroup.position.set(2.35, 0.17, 0.0);
  refineryGroup.scale.setScalar(0.86);
  vaultGroup.add(refineryGroup);

  const smelterBase = new THREE.Mesh(
    createExtrudedSlabGeometry(1.75, 0.22, 1.35, 0.2, 0.025),
    darkIronMat
  );
  enableShadows(smelterBase);
  refineryGroup.add(smelterBase);

  const smelterDrum = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0.22),
        new THREE.Vector2(0.56, 0.22),
        new THREE.Vector2(0.5, 0.65),
        new THREE.Vector2(0.38, 0.82),
        new THREE.Vector2(0.38, 1.38),
        new THREE.Vector2(0.52, 1.54),
        new THREE.Vector2(0.44, 1.98),
        new THREE.Vector2(0.24, 2.25),
        new THREE.Vector2(0.001, 2.25),
      ],
      10
    ),
    slateMat
  );
  smelterDrum.position.set(-0.22, 0, 0);
  enableShadows(smelterDrum);

  const plasmaCoreWindow = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.48, 10), plasmaMat);
  plasmaCoreWindow.position.set(-0.22, 1.08, 0);

  const refineryRings: THREE.Mesh[] = [];
  const rRingGeo = new THREE.TorusGeometry(0.45, 0.036, 6, 16);
  rRingGeo.rotateX(Math.PI / 2);
  for (const ry of [0.84, 1.34]) {
    const rRing = new THREE.Mesh(rRingGeo, ry < 1.0 ? crystalMat : plasmaMat);
    rRing.position.set(-0.22, ry, 0);
    refineryGroup.add(rRing);
    refineryRings.push(rRing);
  }

  // Twin Secondary Auxiliary Plasma Scrubber Stack
  const auxStack = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0.22),
        new THREE.Vector2(0.3, 0.22),
        new THREE.Vector2(0.26, 1.35),
        new THREE.Vector2(0.32, 1.48),
        new THREE.Vector2(0.18, 1.72),
        new THREE.Vector2(0.001, 1.72),
      ],
      8
    ),
    darkIronMat
  );
  auxStack.position.set(0.48, 0, 0.22);
  enableShadows(auxStack);

  const auxGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 8), crystalMat);
  auxGlow.position.set(0.48, 1.12, 0.22);

  // Single Precision-Socketed Plasma Conduit Connecting Refinery Drum Cleanly to Chest Vault Deck
  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 1.02, 0.0),
    new THREE.Vector3(-0.84, 0.88, 0.0),
    new THREE.Vector3(-1.12, 0.48, 0.0),
    new THREE.Vector3(-1.34, 0.17, 0.0),
  ]);
  const plasmaPipe = new THREE.Mesh(new THREE.TubeGeometry(conduitCurve, 16, 0.048, 6, false), darkIronMat);

  // Traveling Glowing Energy Pulses Flowing Along the Conduit Into Chest Vault
  const conduitPulses: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number; speed: number }> = [];
  const pulseGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.22, 6);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(pulseGeo, plasmaMat);
    refineryGroup.add(p);
    conduitPulses.push({ mesh: p, curve: conduitCurve, offset: i / 3, speed: 0.45 });
  }

  // Mechanical Brass Socket Couplings on Both Ends + Top Cable Collar (zero floating/imprecise ends)
  const flangeGeo = new THREE.CylinderGeometry(0.09, 0.105, 0.14, 8);
  const drumOutletSocket = new THREE.Mesh(flangeGeo, brassMat);
  drumOutletSocket.position.set(-0.56, 1.02, 0.0);
  drumOutletSocket.rotation.z = Math.PI / 2;

  const deckSocket = new THREE.Mesh(flangeGeo, brassMat);
  deckSocket.position.set(-1.34, 0.17, 0.0);

  const smelterTopCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.16, 8),
    brassMat
  );
  smelterTopCollar.position.set(-0.22, 2.24, 0);

  enableShadows(drumOutletSocket);
  enableShadows(deckSocket);
  enableShadows(smelterTopCollar);
  refineryGroup.add(
    smelterDrum,
    plasmaCoreWindow,
    auxStack,
    auxGlow,
    plasmaPipe,
    drumOutletSocket,
    deckSocket,
    smelterTopCollar
  );

  // =========================================================================
  // 4. ANIMATED ORE CHUNKS RIDING UP ESCALATOR INTO THE VAULT CHUTE
  // =========================================================================
  const packetRockGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const packetGemGeo = new THREE.CylinderGeometry(0.02, 0.07, 0.17, 6);
  const packets: MovingOreChunk[] = [];
  const packetCount = 3;

  for (let i = 0; i < packetCount; i++) {
    const pg = new THREE.Group();
    const rock = new THREE.Mesh(packetRockGeo, slateMat);
    const gem = new THREE.Mesh(packetGemGeo, i % 2 === 0 ? crystalMat : goldOreMat);
    gem.position.set(0.03, 0.06, 0.02);
    gem.rotation.set(0.4, 0.6, 0.3);
    pg.add(rock, gem);
    enableShadows(pg);
    group.add(pg);
    packets.push({
      group: pg,
      progress: i / packetCount,
      spinSpeed: i % 2 === 0 ? 1.8 : -2.1,
    });
  }

  const cleatDummy = new THREE.Object3D();

  const updateCleats = (beltOffset: number): void => {
    for (let i = 0; i < BELT_CLEAT_COUNT; i++) {
      const s = (beltOffset + (i / BELT_CLEAT_COUNT) * CLEAT_LOOP_SPAN) % CLEAT_LOOP_SPAN;
      if (s <= RAMP_LENGTH) {
        // Climbing upper belt surface toward chest
        cleatDummy.position.set(s, 0.095, 0);
        cleatDummy.rotation.set(0, 0, 0);
      } else if (s <= RAMP_LENGTH + 0.18) {
        // Rounding upper drive drum
        const frac = (s - RAMP_LENGTH) / 0.18;
        const theta = frac * Math.PI;
        cleatDummy.position.set(RAMP_LENGTH + Math.sin(theta) * 0.065, 0.045 + Math.cos(theta) * 0.05, 0);
        cleatDummy.rotation.set(0, 0, -theta);
      } else if (s <= RAMP_LENGTH * 2 + 0.18) {
        // Returning underneath belt
        const backDist = s - (RAMP_LENGTH + 0.18);
        cleatDummy.position.set(RAMP_LENGTH - backDist, -0.005, 0);
        cleatDummy.rotation.set(0, 0, Math.PI);
      } else {
        // Rounding lower drive drum
        const frac = (s - (RAMP_LENGTH * 2 + 0.18)) / 0.18;
        const theta = Math.PI + frac * Math.PI;
        cleatDummy.position.set(Math.sin(theta) * 0.065, 0.045 + Math.cos(theta) * 0.05, 0);
        cleatDummy.rotation.set(0, 0, -theta);
      }
      cleatDummy.updateMatrix();
      cleatInstances.setMatrixAt(i, cleatDummy.matrix);
    }
    cleatInstances.instanceMatrix.needsUpdate = true;
  };

  // Initialize cleats immediately so first frame looks crisp
  updateCleats(0);

  const setPalette = (crystalColor: number | string, _cliffColor: number | string): void => {
    crystalMat.color.set(crystalColor);
    crystalMat.emissive.set(crystalColor);
    brassMat.emissive.set(crystalColor);
  };

  let beltTravel = 0;
  const conduitPosTmp = new THREE.Vector3();
  const conduitTanTmp = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);

  const update = (
    dtSec: number,
    elapsed: number,
    chestHovered: boolean,
    chestBounce: number
  ): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    beltTravel = (beltTravel + safeDt * 0.95) % CLEAT_LOOP_SPAN;
    updateCleats(beltTravel);

    for (let rIdx = 0; rIdx < refineryRings.length; rIdx++) {
      refineryRings[rIdx].rotation.y = elapsed * (rIdx % 2 === 0 ? 1.5 : -1.9);
    }

    for (const cp of conduitPulses) {
      const t = (elapsed * cp.speed + cp.offset) % 1;
      cp.curve.getPointAt(t, conduitPosTmp);
      cp.curve.getTangentAt(t, conduitTanTmp);
      cp.mesh.position.copy(conduitPosTmp);
      cp.mesh.quaternion.setFromUnitVectors(upAxis, conduitTanTmp);
    }

    for (const pkt of packets) {
      pkt.progress = (pkt.progress + safeDt * 0.38) % 1;
      const t = pkt.progress;

      if (t < 0.78) {
        // Phase 1: Climb continuously up the escalator ramp
        const rampT = t / 0.78;
        const wx = ESCALATOR_START_X + rampT * RAMP_DX;
        const wy = ESCALATOR_START_Y + rampT * RAMP_DY + 0.19;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(1);
      } else if (t < 0.94) {
        // Phase 2: Crest over drive drum & slide cleanly down the Vault Intake Chute toward Chest
        const slideT = (t - 0.78) / 0.16;
        const wx = ESCALATOR_END_X + slideT * 0.56;
        const wy =
          ESCALATOR_END_Y +
          0.19 -
          slideT * 0.16 +
          Math.sin(slideT * Math.PI) * 0.05;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(1 - slideT * 0.2);
      } else {
        // Phase 3: Absorbed cleanly into the Chest Vault dais
        const absorbT = (t - 0.94) / 0.06;
        const wx = 8.32 + absorbT * 0.13;
        const wy = 0.49 - absorbT * 0.04;
        pkt.group.position.set(wx, wy, ESCALATOR_Z);
        pkt.group.scale.setScalar(Math.max(0.01, 0.8 * (1 - absorbT)));
      }
      pkt.group.rotation.y += safeDt * pkt.spinSpeed;
      pkt.group.rotation.x = Math.sin(elapsed * 2 + t * 6) * 0.15;
    }

    const energyPulse = Math.sin(elapsed * 2.8) * 0.18;
    crystalMat.emissiveIntensity = (chestHovered ? 1.35 : 1.05) + chestBounce * 0.65 + energyPulse;
    plasmaMat.emissiveIntensity = 1.25 + Math.sin(elapsed * 3.8) * 0.25 + chestBounce * 0.4;
    brassMat.emissiveIntensity = chestHovered ? 0.34 : 0.14 + chestBounce * 0.2;
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
