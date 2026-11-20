import * as THREE from 'three';
import {
  createLatheProfileGeometry,
  createSculptedPlateGeometry,
  createTaperedTubeGeometry,
  enableShadows,
  mirrorPoints2D,
  orientGroupAlongVector,
} from './SeraphimBossGeometry3D';
import { buildSeraphimHelmet, buildSeraphimWings, type SeraphimBossMaterials } from './SeraphimBossParts3D';

export interface SeraphimBossOptions {
  scale?: number;
}

export interface SeraphimBossHandle {
  group: THREE.Group;
  wingPivots: THREE.Group[];
  reactorRingOuter: THREE.Group;
  reactorRingInner: THREE.Group;
  update: (dtSec: number, elapsed: number, hitFactor: number) => void;
  dispose: () => void;
}


interface FloatingPauldronSpec {
  group: THREE.Group;
  baseY: number;
  baseRoll: number;
  side: -1 | 1;
}

interface DanglingCableSpec {
  pivot: THREE.Group;
  phase: number;
  baseRotX: number;
  baseRotZ: number;
}

export function createSeraphimBoss3D(options: SeraphimBossOptions = {}): SeraphimBossHandle {
  const group = new THREE.Group();
  const baseScale = options.scale ?? 1.0;
  group.scale.setScalar(baseScale);

  const hoverRoot = new THREE.Group();
  group.add(hoverRoot);

  // PBR Hard-Surface Materials (Dark Charred Armor + Brushed Gunmetal + Molten Ember)
  const armorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    roughness: 0.36,
    metalness: 0.76,
    flatShading: true,
  });
  const armorCharredMat = new THREE.MeshStandardMaterial({
    color: 0x101520,
    roughness: 0.48,
    metalness: 0.56,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x455269,
    roughness: 0.26,
    metalness: 0.86,
    flatShading: true,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0c1018,
    roughness: 0.76,
    metalness: 0.22,
    flatShading: true,
  });
  const singularityMat = new THREE.MeshBasicMaterial({
    color: 0x020306,
  });
  const magmaGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.95,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const coreCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.65,
    roughness: 0.18,
    metalness: 0.28,
    flatShading: true,
  });

  // Warm localized magma point light illuminating chest facets, claws, helm & wing bevels
  const chestLight = new THREE.PointLight(0xf97316, 2.6, 8.2, 1.45);
  chestLight.position.set(0, 3.12, 1.08);
  hoverRoot.add(chestLight);

  // =========================================================================
  // 1. SCULPTED TORSO, RIBBED SPINE & SINGULARITY CHEST REACTOR (y = 2.15..3.85)
  // =========================================================================
  const torsoGroup = new THREE.Group();
  hoverRoot.add(torsoGroup);

  // Multi-stepped faceted waist & spinal turbine column (LatheGeometry)
  const spineCore = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.18, 0.0],
        [0.34, 0.08],
        [0.25, 0.2],
        [0.36, 0.3],
        [0.27, 0.42],
        [0.42, 0.54],
        [0.32, 0.66],
        [0.48, 0.78],
        [0.36, 0.88],
      ],
      8
    ),
    armorCharredMat
  );
  spineCore.position.set(0, 2.02, -0.04);
  spineCore.scale.set(1.18, 1, 0.86);
  enableShadows(spineCore);
  torsoGroup.add(spineCore);

  // Sculpted angular abdominal rib armor chevrons wrapping the waist
  const abdomenChevronPts: [number, number][] = [
    [-0.42, 0.04],
    [-0.14, 0.14],
    [0, 0.06],
    [0.14, 0.14],
    [0.42, 0.04],
    [0.32, -0.14],
    [0, -0.22],
    [-0.32, -0.14],
  ];
  for (let i = 0; i < 3; i++) {
    const abPlate = new THREE.Mesh(
      createSculptedPlateGeometry(abdomenChevronPts, 0.44 + i * 0.04, 0.02, {
        foldZ: 0.12,
        archX: 0.14,
        archSpan: 0.45,
      }),
      i % 2 === 0 ? armorDarkMat : gunmetalMat
    );
    abPlate.position.set(0, 2.16 + i * 0.24, 0.06);
    abPlate.scale.setScalar(0.84 + i * 0.11);
    enableShadows(abPlate);
    torsoGroup.add(abPlate);
  }

  // Twin curved hydraulic power ribs framing abdomen sides (TubeGeometry)
  for (const sx of [-1, 1] as const) {
    const ribTube = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.28, 2.02, 0.06),
          new THREE.Vector3(sx * 0.48, 2.38, 0.16),
          new THREE.Vector3(sx * 0.58, 2.86, 0.1),
        ],
        8,
        0.048,
        0.064,
        6
      ),
      gunmetalMat
    );
    enableShadows(ribTube);
    torsoGroup.add(ribTube);
  }

  // Main Layered Angular Ribcage Chassis (wide V-tapered hull with 3D central keel fold)
  const chestHullPts: [number, number][] = [
    [-0.46, -0.52],
    [0.46, -0.52],
    [0.78, -0.02],
    [0.86, 0.34],
    [0.48, 0.58],
    [0.18, 0.48],
    [0, 0.42],
    [-0.18, 0.48],
    [-0.48, 0.58],
    [-0.86, 0.34],
    [-0.78, -0.02],
  ];
  const chestCore = new THREE.Mesh(
    createSculptedPlateGeometry(chestHullPts, 0.72, 0.036, {
      foldZ: 0.18,
      archX: 0.24,
      archSpan: 0.88,
    }),
    armorDarkMat
  );
  chestCore.position.set(0, 3.24, 0.04);
  enableShadows(chestCore);
  torsoGroup.add(chestCore);

  // Swept Pectoral Breastplate Wings + Curved Molten Magma Energy Veins (TubeGeometry)
  const rightPecPts: [number, number][] = [
    [0.14, -0.26],
    [0.44, -0.2],
    [0.64, 0.08],
    [0.54, 0.34],
    [0.18, 0.28],
    [0.12, 0.02],
  ];
  for (const sx of [-1, 1] as const) {
    const pecPts = sx > 0 ? rightPecPts : mirrorPoints2D(rightPecPts);
    const pecPlate = new THREE.Mesh(
      createSculptedPlateGeometry(pecPts, 0.22, 0.024, {
        archX: 0.12,
        archSpan: 0.65,
      }),
      gunmetalMat
    );
    pecPlate.position.set(sx * 0.18, 3.28, 0.32);
    pecPlate.rotation.set(-0.14, sx * 0.26, sx * -0.08);
    enableShadows(pecPlate);

    const chestVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.28, 3.12, 0.48),
          new THREE.Vector3(sx * 0.48, 3.28, 0.44),
          new THREE.Vector3(sx * 0.68, 3.44, 0.3),
        ],
        7,
        0.028,
        0.016,
        5
      ),
      magmaGlowMat
    );
    torsoGroup.add(pecPlate, chestVein);
  }

  // Twin Flared High Collar Cowl Blades Framing the Mecha Neck
  const rightCollarPts: [number, number][] = [
    [0.16, -0.14],
    [0.54, 0.02],
    [0.48, 0.34],
    [0.24, 0.22],
  ];
  for (const sx of [-1, 1] as const) {
    const collarPts = sx > 0 ? rightCollarPts : mirrorPoints2D(rightCollarPts);
    const collarWing = new THREE.Mesh(
      createSculptedPlateGeometry(collarPts, 0.38, 0.02, {
        archX: 0.08,
        archSpan: 0.55,
      }),
      armorCharredMat
    );
    collarWing.position.set(sx * 0.06, 3.74, -0.06);
    collarWing.rotation.set(0.24, sx * -0.22, sx * -0.14);
    enableShadows(collarWing);
    torsoGroup.add(collarWing);
  }

  // Sculpted Dorsal Wing Manifold + Twin Flared Thruster Nozzles (LatheGeometry)
  const dorsalHullPts: [number, number][] = [
    [-0.3, -0.58],
    [0.3, -0.58],
    [0.54, 0.12],
    [0.36, 0.62],
    [0, 0.48],
    [-0.36, 0.62],
    [-0.54, 0.12],
  ];
  const dorsalPack = new THREE.Mesh(
    createSculptedPlateGeometry(dorsalHullPts, 0.42, 0.028, {
      foldZ: -0.14,
      archX: -0.12,
      archSpan: 0.56,
    }),
    armorCharredMat
  );
  dorsalPack.position.set(0, 3.26, -0.38);
  enableShadows(dorsalPack);
  torsoGroup.add(dorsalPack);

  for (const sx of [-1, 1] as const) {
    const bellGeo = createLatheProfileGeometry(
      [
        [0.18, -0.22],
        [0.15, -0.08],
        [0.1, 0.1],
        [0.13, 0.2],
      ],
      7
    );
    const thrusterBell = new THREE.Mesh(bellGeo, gunmetalMat);
    thrusterBell.position.set(sx * 0.28, 2.74, -0.56);
    thrusterBell.rotation.set(-0.38, 0, sx * 0.16);
    enableShadows(thrusterBell);

    const thrusterCore = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.24],
          [0.12, -0.14],
          [0.08, 0.02],
        ],
        6
      ),
      magmaGlowMat
    );
    thrusterCore.position.copy(thrusterBell.position);
    thrusterCore.rotation.copy(thrusterBell.rotation);

    torsoGroup.add(thrusterBell, thrusterCore);
  }

  // Black-Red Singularity Chest Core + Stepped Bezel + Rotating Containment Rings
  const reactorCenter = new THREE.Group();
  reactorCenter.position.set(0, 3.22, 0.46);
  torsoGroup.add(reactorCenter);

  const reactorBezel = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.34, -0.08],
        [0.44, -0.02],
        [0.41, 0.06],
        [0.31, 0.08],
      ],
      8
    ),
    armorCharredMat
  );
  reactorBezel.rotation.x = Math.PI / 2;
  enableShadows(reactorBezel);

  const blackOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), singularityMat);
  const flareHalo = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 8, 24), magmaGlowMat);
  const crimsonCorona = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 24), coreCrimsonMat);
  crimsonCorona.position.z = -0.02;
  reactorCenter.add(reactorBezel, blackOrb, flareHalo, crimsonCorona);

  const reactorRingOuter = new THREE.Group();
  const outerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.036, 6, 8), gunmetalMat);
  reactorRingOuter.add(outerRingMesh);

  const clampPts: [number, number][] = [
    [-0.075, -0.085],
    [0.075, -0.085],
    [0.048, 0.09],
    [-0.048, 0.09],
  ];
  const clampGeo = createSculptedPlateGeometry(clampPts, 0.11, 0.014, { foldZ: 0.025, archSpan: 0.08 });
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(clampGeo, armorDarkMat);
    clamp.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.02);
    clamp.rotation.z = a - Math.PI / 2;
    reactorRingOuter.add(clamp);
  }
  reactorCenter.add(reactorRingOuter);

  const reactorRingInner = new THREE.Group();
  const innerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 6, 6), coreCrimsonMat);
  reactorRingInner.position.z = 0.03;
  reactorRingInner.add(innerRingMesh);
  reactorCenter.add(reactorRingInner);

  const bossMats: SeraphimBossMaterials = {
    armorDarkMat, armorCharredMat, gunmetalMat, cableMat, singularityMat, magmaGlowMat, coreCrimsonMat,
  };
  const headGroup = buildSeraphimHelmet(hoverRoot, bossMats);
  // =========================================================================
  // 3. CURVED LAYERED PAULDRONS, AERODYNAMIC ARMS & 5-CLAWED HANDS
  // =========================================================================
  const floatingPauldrons: FloatingPauldronSpec[] = [];
  const armGroups: { group: THREE.Group; side: -1 | 1 }[] = [];

  const rightPauldronInnerPts: [number, number][] = [
    [-0.12, -0.24],
    [0.34, -0.2],
    [0.5, 0.1],
    [0.24, 0.28],
    [-0.14, 0.18],
  ];
  const rightPauldronMidPts: [number, number][] = [
    [-0.18, -0.18],
    [0.48, -0.26],
    [0.74, 0.08],
    [0.64, 0.36],
    [0.14, 0.34],
    [-0.22, 0.16],
  ];
  const rightPauldronCrestPts: [number, number][] = [
    [-0.14, -0.08],
    [0.42, -0.04],
    [0.76, 0.28],
    [0.44, 0.24],
    [-0.1, 0.12],
  ];

  // Aerodynamic limb & hand shared geometry specs
  const upperArmPts: [number, number][] = [
    [-0.1, 0.0],
    [0.1, 0.0],
    [0.16, 0.24],
    [0.13, 0.58],
    [0, 0.64],
    [-0.13, 0.58],
    [-0.14, 0.22],
  ];
  const upperArmShellGeo = createSculptedPlateGeometry(upperArmPts, 0.24, 0.02, {
    foldZ: 0.05,
    archSpan: 0.16,
  });

  const elbowSpurPts: [number, number][] = [
    [-0.08, -0.06],
    [0.08, -0.06],
    [0.1, 0.12],
    [0, 0.34],
    [-0.1, 0.12],
  ];
  const elbowSpurGeo = createSculptedPlateGeometry(elbowSpurPts, 0.12, 0.015, {
    foldZ: 0.04,
    archSpan: 0.1,
  });

  const forearmPts: [number, number][] = [
    [-0.13, 0.02],
    [0.13, 0.02],
    [0.21, 0.22],
    [0.15, 0.58],
    [0.1, 0.68],
    [-0.1, 0.68],
    [-0.15, 0.58],
    [-0.19, 0.22],
  ];
  const forearmShellGeo = createSculptedPlateGeometry(forearmPts, 0.28, 0.022, {
    foldZ: 0.06,
    archX: 0.04,
    archSpan: 0.21,
  });

  const palmPts: [number, number][] = [
    [-0.12, 0.0],
    [0.12, 0.0],
    [0.17, 0.14],
    [0.14, 0.27],
    [0, 0.29],
    [-0.14, 0.27],
    [-0.17, 0.14],
  ];
  const palmGeo = createSculptedPlateGeometry(palmPts, 0.095, 0.016, {
    foldZ: 0.025,
    archX: 0.03,
    archSpan: 0.17,
  });
  palmGeo.rotateX(Math.PI / 2);

  for (const sx of [-1, 1] as const) {
    // 3a. Curved Multi-Tiered Floating Pauldrons
    const pauldron = new THREE.Group();
    pauldron.position.set(sx * 1.18, 3.68, 0.06);

    const pInnerPts = sx > 0 ? rightPauldronInnerPts : mirrorPoints2D(rightPauldronInnerPts);
    const pInner = new THREE.Mesh(
      createSculptedPlateGeometry(pInnerPts, 0.52, 0.02, {
        archX: 0.14,
        archSpan: 0.52,
      }),
      armorCharredMat
    );
    pInner.position.set(-sx * 0.1, -0.1, 0);
    pInner.rotation.z = sx * -0.25;

    const pMidPts = sx > 0 ? rightPauldronMidPts : mirrorPoints2D(rightPauldronMidPts);
    const pMain = new THREE.Mesh(
      createSculptedPlateGeometry(pMidPts, 0.66, 0.026, {
        archX: 0.22,
        archSpan: 0.75,
        foldZ: 0.06,
      }),
      armorDarkMat
    );
    pMain.position.set(sx * 0.04, 0.04, 0);
    pMain.rotation.z = sx * -0.32;

    const pCrestPts = sx > 0 ? rightPauldronCrestPts : mirrorPoints2D(rightPauldronCrestPts);
    const pCrest = new THREE.Mesh(
      createSculptedPlateGeometry(pCrestPts, 0.44, 0.02, {
        archX: 0.16,
        archSpan: 0.76,
      }),
      gunmetalMat
    );
    pCrest.position.set(sx * 0.08, 0.24, 0);
    pCrest.rotation.z = sx * -0.24;

    // Curved Magma Fissure Trim Across Pauldron Shell (TubeGeometry)
    const pGlow = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(-sx * 0.12, 0.08, 0.24),
          new THREE.Vector3(sx * 0.22, 0.12, 0.26),
          new THREE.Vector3(sx * 0.56, 0.0, 0.14),
        ],
        7,
        0.03,
        0.014,
        5
      ),
      magmaGlowMat
    );

    const pGravOrb = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.12],
          [0.11, 0.0],
          [0.06, 0.09],
        ],
        6
      ),
      coreCrimsonMat
    );
    pGravOrb.position.set(-sx * 0.24, -0.16, 0);

    enableShadows(pInner);
    enableShadows(pMain);
    enableShadows(pCrest);
    pauldron.add(pInner, pMain, pCrest, pGlow, pGravOrb);
    hoverRoot.add(pauldron);
    floatingPauldrons.push({
      group: pauldron,
      baseY: 3.68,
      baseRoll: sx * -0.05,
      side: sx,
    });

    // 3b. Aerodynamic Mechanical Arm + Forearm Gauntlet + 5-Clawed Menacing Hand
    const armGroup = new THREE.Group();
    armGroup.position.set(sx * 0.86, 3.38, 0.06);
    hoverRoot.add(armGroup);
    armGroups.push({ group: armGroup, side: sx });

    const shoulderPos = new THREE.Vector3(0, 0, 0);
    const elbowPos = new THREE.Vector3(sx * 0.3, -0.56, 0.12);
    const wristPos = new THREE.Vector3(sx * 0.32, -0.92, 0.68);
    const hintForward = new THREE.Vector3(0, 0, 1);

    const shoulderJoint = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.08, -0.15],
          [0.17, -0.05],
          [0.17, 0.05],
          [0.08, 0.15],
        ],
        8
      ),
      gunmetalMat
    );
    shoulderJoint.rotation.z = Math.PI / 2;
    enableShadows(shoulderJoint);
    armGroup.add(shoulderJoint);

    // Upper Arm aligned cleanly from Shoulder -> Elbow
    const upperArmDir = new THREE.Vector3().subVectors(elbowPos, shoulderPos);
    const upperArmLen = upperArmDir.length();
    const upperArmPivot = new THREE.Group();
    upperArmPivot.position.copy(shoulderPos);
    orientGroupAlongVector(upperArmPivot, upperArmDir, hintForward);

    const upperPiston = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.09, 0],
          [0.11, upperArmLen * 0.5],
          [0.085, upperArmLen],
        ],
        6
      ),
      cableMat
    );
    const upperArmor = new THREE.Mesh(upperArmShellGeo, armorCharredMat);
    upperArmor.scale.y = upperArmLen / 0.64;
    enableShadows(upperPiston);
    enableShadows(upperArmor);
    upperArmPivot.add(upperPiston, upperArmor);
    armGroup.add(upperArmPivot);

    // Elbow Rotary Joint + Swept Aerodynamic Elbow Fin
    const elbowJoint = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.08, -0.14],
          [0.15, -0.06],
          [0.15, 0.06],
          [0.08, 0.14],
        ],
        6
      ),
      magmaGlowMat
    );
    elbowJoint.position.copy(elbowPos);
    elbowJoint.rotation.z = Math.PI / 2;

    const elbowSpur = new THREE.Mesh(elbowSpurGeo, gunmetalMat);
    elbowSpur.position.copy(elbowPos).add(new THREE.Vector3(sx * 0.04, 0.04, -0.14));
    elbowSpur.rotation.set(-0.85, sx * 0.2, 0);
    enableShadows(elbowSpur);
    armGroup.add(elbowJoint, elbowSpur);

    // Forearm aligned cleanly from Elbow -> Wrist
    const forearmDir = new THREE.Vector3().subVectors(wristPos, elbowPos);
    const forearmLen = forearmDir.length();
    const forearmPivot = new THREE.Group();
    forearmPivot.position.copy(elbowPos);
    orientGroupAlongVector(forearmPivot, forearmDir, hintForward);

    const forearmArmor = new THREE.Mesh(forearmShellGeo, armorDarkMat);
    forearmArmor.scale.y = forearmLen / 0.68;

    const forearmDorsalVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(0, 0.08, 0.16),
          new THREE.Vector3(0, forearmLen * 0.52, 0.18),
          new THREE.Vector3(0, forearmLen * 0.9, 0.13),
        ],
        6,
        0.022,
        0.012,
        5
      ),
      magmaGlowMat
    );

    const wristCuff = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.14, 0.0],
          [0.17, 0.04],
          [0.13, 0.11],
          [0.11, 0.16],
        ],
        8
      ),
      gunmetalMat
    );
    wristCuff.position.y = forearmLen - 0.12;

    enableShadows(forearmArmor);
    enableShadows(wristCuff);
    forearmPivot.add(forearmArmor, forearmDorsalVein, wristCuff);
    armGroup.add(forearmPivot);

    // 3c. Articulated Clawed Hand with Palm Core + 5 Curved Mechanical Claw Fingers
    const handGroup = new THREE.Group();
    handGroup.position.copy(wristPos);
    // Rotate palm inward & pitch slightly downward so all 5 fanned claws menace toward player (+Z)
    handGroup.rotation.set(0.28, sx * -0.22, sx * -0.52);
    armGroup.add(handGroup);

    const palmMesh = new THREE.Mesh(palmGeo, armorDarkMat);
    enableShadows(palmMesh);

    const dorsalKnucklePlate = new THREE.Mesh(
      createSculptedPlateGeometry(
        [
          [-0.14, 0.0],
          [0.14, 0.0],
          [0.16, 0.09],
          [-0.16, 0.09],
        ],
        0.06,
        0.012,
        { archX: 0.02, archSpan: 0.16 }
      ),
      gunmetalMat
    );
    dorsalKnucklePlate.position.set(0, 0.035, 0.21);
    dorsalKnucklePlate.rotation.x = 0.25;
    enableShadows(dorsalKnucklePlate);

    // Glowing Crimson Palm Repulsor Emitter
    const palmCore = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.02],
          [0.068, 0.0],
          [0.052, 0.025],
        ],
        8
      ),
      coreCrimsonMat
    );
    palmCore.position.set(0, -0.045, 0.14);
    palmCore.rotation.x = Math.PI;
    handGroup.add(palmMesh, dorsalKnucklePlate, palmCore);

    // 5 Distinct Articulated Claw Fingers (Thumb + Index + Middle + Ring + Pinky)
    const fingerSpecs: {
      bx: number;
      by: number;
      bz: number;
      splayX: number;
      archY: number;
      lenZ: number;
      dropY: number;
      rBase: number;
    }[] = [
      // Thumb (opposable inner side, curling sharply inward & forward)
      { bx: -sx * 0.14, by: -0.02, bz: 0.09, splayX: -sx * 0.13, archY: 0.02, lenZ: 0.24, dropY: -0.16, rBase: 0.032 },
      // Index
      { bx: -sx * 0.11, by: 0.01, bz: 0.24, splayX: -sx * 0.065, archY: 0.06, lenZ: 0.34, dropY: -0.22, rBase: 0.03 },
      // Middle (longest)
      { bx: -sx * 0.03, by: 0.02, bz: 0.27, splayX: -sx * 0.012, archY: 0.075, lenZ: 0.39, dropY: -0.25, rBase: 0.032 },
      // Ring
      { bx: sx * 0.05, by: 0.015, bz: 0.26, splayX: sx * 0.045, archY: 0.06, lenZ: 0.35, dropY: -0.23, rBase: 0.029 },
      // Pinky
      { bx: sx * 0.13, by: 0.0, bz: 0.23, splayX: sx * 0.105, archY: 0.04, lenZ: 0.28, dropY: -0.19, rBase: 0.026 },
    ];

    for (const fs of fingerSpecs) {
      const knuckle = new THREE.Mesh(new THREE.OctahedronGeometry(fs.rBase * 1.15, 0), gunmetalMat);
      knuckle.position.set(fs.bx, fs.by, fs.bz);

      const p0 = new THREE.Vector3(fs.bx, fs.by, fs.bz);
      const p1 = new THREE.Vector3(fs.bx + fs.splayX * 0.45, fs.by + fs.archY, fs.bz + fs.lenZ * 0.44);
      const p2 = new THREE.Vector3(
        fs.bx + fs.splayX * 0.9,
        fs.by + fs.dropY * 0.45,
        fs.bz + fs.lenZ * 0.84
      );
      const p3 = new THREE.Vector3(
        fs.bx + fs.splayX * 0.72,
        fs.by + fs.dropY,
        fs.bz + fs.lenZ
      );

      const clawTube = new THREE.Mesh(
        createTaperedTubeGeometry([p0, p1, p2, p3], 8, fs.rBase, 0.005, 5, 0.85),
        gunmetalMat
      );
      enableShadows(clawTube);

      // Razor 4-sided talon fang capping the curved finger tip
      const tipDir = new THREE.Vector3().subVectors(p3, p2).normalize();
      const tipBlade = new THREE.Mesh(new THREE.ConeGeometry(fs.rBase * 0.62, 0.11, 4), magmaGlowMat);
      tipBlade.position.copy(p3).addScaledVector(tipDir, 0.032);
      tipBlade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);

      handGroup.add(knuckle, clawTube, tipBlade);
    }
  }

  // =========================================================================
  // 4. PELVIS SHIELD, LAYERED CURVED TASSETS & DANGLING ENERGY CABLES
  // =========================================================================
  const lowerSkirtGroup = new THREE.Group();
  hoverRoot.add(lowerSkirtGroup);

  const codpiecePts: [number, number][] = [
    [-0.24, 0.18],
    [0, 0.24],
    [0.24, 0.18],
    [0.16, -0.22],
    [0, -0.44],
    [-0.16, -0.22],
  ];
  const pelvisShield = new THREE.Mesh(
    createSculptedPlateGeometry(codpiecePts, 0.34, 0.022, {
      foldZ: 0.1,
      archSpan: 0.25,
    }),
    armorDarkMat
  );
  pelvisShield.position.set(0, 2.02, 0.12);
  enableShadows(pelvisShield);
  lowerSkirtGroup.add(pelvisShield);

  const rightTassetOuterPts: [number, number][] = [
    [0.0, 0.04],
    [0.58, -0.14],
    [0.72, -0.58],
    [0.44, -0.96],
    [0.12, -0.68],
  ];
  const rightTassetInnerPts: [number, number][] = [
    [0.02, -0.02],
    [0.44, -0.16],
    [0.5, -0.54],
    [0.2, -0.78],
    [0.08, -0.46],
  ];

  for (const sx of [-1, 1] as const) {
    const outerPts = sx > 0 ? rightTassetOuterPts : mirrorPoints2D(rightTassetOuterPts);
    const tasset = new THREE.Mesh(
      createSculptedPlateGeometry(outerPts, 0.14, 0.02, {
        archX: 0.1,
        archSpan: 0.72,
      }),
      armorDarkMat
    );
    tasset.position.set(sx * 0.28, 2.16, 0.1);
    tasset.rotation.set(0.14, sx * -0.32, sx * 0.08);
    enableShadows(tasset);

    const innerPts = sx > 0 ? rightTassetInnerPts : mirrorPoints2D(rightTassetInnerPts);
    const tassetSub = new THREE.Mesh(
      createSculptedPlateGeometry(innerPts, 0.1, 0.015, {
        archX: 0.06,
        archSpan: 0.5,
      }),
      gunmetalMat
    );
    tassetSub.position.set(sx * 0.34, 2.12, 0.16);
    tassetSub.rotation.set(0.14, sx * -0.32, sx * 0.08);
    enableShadows(tassetSub);

    const tassetVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.42, 2.02, 0.18),
          new THREE.Vector3(sx * 0.68, 1.72, 0.18),
          new THREE.Vector3(sx * 0.56, 1.36, 0.12),
        ],
        7,
        0.026,
        0.014,
        5
      ),
      magmaGlowMat
    );

    lowerSkirtGroup.add(tasset, tassetSub, tassetVein);
  }

  // 7 Curved Dangling Dark Cyber Cables Hanging Below Waist (lowest tip around y ≈ 0.85)
  const danglingCables: DanglingCableSpec[] = [];
  const cableSpecs: [number, number, number, number][] = [
    [-0.3, -0.04, 0.94, -0.15],
    [-0.14, 0.08, 1.06, -0.06],
    [0.0, -0.14, 1.12, 0.01],
    [0.14, 0.08, 1.04, 0.06],
    [0.3, -0.04, 0.92, 0.15],
    [-0.08, 0.14, 0.86, -0.08],
    [0.08, -0.08, 0.98, 0.09],
  ];
  cableSpecs.forEach(([cx, cz, dropLen, flareX], idx) => {
    const cPivot = new THREE.Group();
    cPivot.position.set(cx, 1.96, cz);

    const tubeGeo = createTaperedTubeGeometry(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(flareX * 0.45, -dropLen * 0.35, 0.06 * (idx % 2 === 0 ? 1 : -1)),
        new THREE.Vector3(flareX * 0.85, -dropLen * 0.72, -0.08),
        new THREE.Vector3(flareX * 0.65, -dropLen, -0.02),
      ],
      8,
      0.04,
      0.022,
      5
    );
    const tubeMesh = new THREE.Mesh(tubeGeo, cableMat);
    const tipSpark = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), coreCrimsonMat);
    tipSpark.position.set(flareX * 0.65, -dropLen, -0.02);

    enableShadows(tubeMesh);
    cPivot.add(tubeMesh, tipSpark);
    lowerSkirtGroup.add(cPivot);
    danglingCables.push({
      pivot: cPivot,
      phase: idx * 1.15,
      baseRotX: 0.04,
      baseRotZ: flareX * 0.18,
    });
  });

  const { wingSpecs, wingPivots } = buildSeraphimWings(hoverRoot, bossMats);
  // =========================================================================
  // 6. REAL-TIME ANIMATION & CLEANUP
  // =========================================================================
  const update = (dtSec: number, elapsed: number, hitFactor: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    // Smooth hovering bob keeping lowest cable tips safely above crater floor
    hoverRoot.position.y = Math.sin(t * 1.9) * 0.11 + hitFactor * 0.1;

    // Counter-rotating chest singularity containment rings & pulsing magma intensity
    reactorRingOuter.rotation.z = t * 0.85 + hitFactor * 0.4;
    reactorRingInner.rotation.z = -t * 1.35;
    magmaGlowMat.emissiveIntensity = 1.85 + hitFactor * 1.15 + Math.sin(t * 3.4) * 0.22;
    coreCrimsonMat.emissiveIntensity = 1.55 + hitFactor * 0.95 + Math.cos(t * 2.9) * 0.18;
    chestLight.intensity = 2.4 + hitFactor * 1.4;

    // Subtle menacing head tilt & clawed-arm reach modulation
    headGroup.rotation.x = Math.sin(t * 1.6) * 0.045;
    for (const arm of armGroups) {
      arm.group.rotation.x = Math.sin(t * 1.9 + (arm.side > 0 ? 0.5 : 0)) * 0.055 - hitFactor * 0.16;
      arm.group.rotation.z = arm.side * (0.03 + Math.sin(t * 1.5) * 0.025);
    }

    // Floating pauldrons bob out-of-phase with torso
    for (const p of floatingPauldrons) {
      p.group.position.y = p.baseY + Math.sin(t * 2.3 + (p.side > 0 ? 0.8 : 0)) * 0.065;
      p.group.rotation.z = p.baseRoll + Math.sin(t * 1.8) * 0.04 * p.side;
    }

    // Dangling cables sway in crater heat updraft
    for (const c of danglingCables) {
      c.pivot.rotation.x = c.baseRotX + Math.sin(t * 2.2 + c.phase) * 0.075;
      c.pivot.rotation.z = c.baseRotZ + Math.cos(t * 1.7 + c.phase) * 0.065;
    }

    // Independent mechanical wing wave-flapping (3 staggered pairs)
    for (const w of wingSpecs) {
      const wave = Math.sin(t * 2.1 - w.phaseOffset);
      const flare = Math.cos(t * 1.6 - w.phaseOffset);
      w.pivot.rotation.y = w.baseYaw + w.side * (wave * 0.15 + hitFactor * 0.13);
      w.pivot.rotation.z = w.baseRoll + w.side * (flare * 0.065 + hitFactor * 0.075);
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
  };

  return {
    group,
    wingPivots,
    reactorRingOuter,
    reactorRingInner,
    update,
    dispose,
  };
}
