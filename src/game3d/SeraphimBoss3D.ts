import * as THREE from 'three';

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

interface WingAnimSpec {
  pivot: THREE.Group;
  side: -1 | 1;
  tier: number;
  baseYaw: number;
  baseRoll: number;
  phaseOffset: number;
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

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createBeveledArmorPlateGeometry(
  topW: number,
  botW: number,
  height: number,
  depth: number,
  bevel = 0.028
): THREE.ExtrudeGeometry {
  const ht = topW * 0.5;
  const hb = botW * 0.5;
  const hh = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hb, -hh);
  shape.lineTo(hb, -hh);
  shape.lineTo(ht, hh * 0.45);
  shape.lineTo(ht * 0.68, hh);
  shape.lineTo(-ht * 0.68, hh);
  shape.lineTo(-ht, hh * 0.45);
  shape.closePath();

  const innerD = Math.max(0.02, depth - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -innerD * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createWingBladeGeometry(
  length: number,
  rootW: number,
  thickness: number,
  bevel = 0.014
): THREE.ExtrudeGeometry {
  // Swept cyber-feather dagger blade extending along +X, width in Y
  const shape = new THREE.Shape();
  shape.moveTo(0, -rootW * 0.35);
  shape.lineTo(length * 0.72, -rootW * 0.48);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.68, rootW * 0.52);
  shape.lineTo(0, rootW * 0.36);
  shape.closePath();

  const innerD = Math.max(0.01, thickness - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -innerD * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createWingTipEmberGeometry(length: number, rootW: number, thickness: number): THREE.ExtrudeGeometry {
  const tipStart = length * 0.72;
  const shape = new THREE.Shape();
  shape.moveTo(tipStart, -rootW * 0.42);
  shape.lineTo(length + 0.05, 0);
  shape.lineTo(tipStart, rootW * 0.44);
  shape.lineTo(tipStart - 0.08, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createChevronTassetGeometry(
  w: number,
  h: number,
  depth: number,
  side: -1 | 1
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (side > 0) {
    shape.moveTo(0, 0);
    shape.lineTo(w * 0.16, -h * 0.78);
    shape.lineTo(w * 0.78, -h);
    shape.lineTo(w, -h * 0.25);
  } else {
    shape.moveTo(0, 0);
    shape.lineTo(-w, -h * 0.25);
    shape.lineTo(-w * 0.78, -h);
    shape.lineTo(-w * 0.16, -h * 0.78);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a full procedural 3D hard-surface "Corrupted Seraphim AI Overlord" Boss
 * with pivot grounded at y = 0, dark charred metallic armor, glowing singularity chest core,
 * rotating containment rings, faceless mecha visor helmet with curved horns,
 * floating heavy pauldrons, clawed arms, dangling energy cables, and 6 animated blade wings.
 */
export function createSeraphimBoss3D(options: SeraphimBossOptions = {}): SeraphimBossHandle {
  const group = new THREE.Group();
  const baseScale = options.scale ?? 1.0;
  group.scale.setScalar(baseScale);

  // Core hover body wrapper so wings, torso, head & cables float smoothly above crater floor y = 0
  const hoverRoot = new THREE.Group();
  group.add(hoverRoot);

  // PBR Hard-Surface Materials (Dark Charred Armor + Molten Magma Emissives)
  const armorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.42,
    metalness: 0.58,
    flatShading: true,
  });
  const armorCharredMat = new THREE.MeshStandardMaterial({
    color: 0x11151f,
    roughness: 0.62,
    metalness: 0.44,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x3b4559,
    roughness: 0.34,
    metalness: 0.72,
    flatShading: true,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    roughness: 0.78,
    metalness: 0.24,
    flatShading: true,
  });
  const singularityMat = new THREE.MeshBasicMaterial({
    color: 0x020306,
  });
  const magmaGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.85,
    roughness: 0.2,
    metalness: 0.2,
    flatShading: true,
  });
  const coreCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.55,
    roughness: 0.18,
    metalness: 0.25,
    flatShading: true,
  });

  // Subtle localized warm magma point light illuminating dark chest/wings/shoulders cleanly
  const chestLight = new THREE.PointLight(0xf97316, 2.4, 7.2, 1.5);
  chestLight.position.set(0, 2.55, 0.95);
  hoverRoot.add(chestLight);

  // =========================================================================
  // 1. TORSO, SPINE & SINGULARITY CHEST REACTOR (y = 1.65 .. 3.35)
  // =========================================================================
  const torsoGroup = new THREE.Group();
  hoverRoot.add(torsoGroup);

  // Segmented Armored Abdomen & Spine Column
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 + i * 0.055, 0.26 + i * 0.05, 0.22, 6),
      i % 2 === 0 ? armorCharredMat : armorDarkMat
    );
    seg.position.set(0, 1.48 + i * 0.21, -0.02);
    seg.scale.set(1.22, 1, 0.85);
    enableShadows(seg);
    torsoGroup.add(seg);
  }

  // Main Layered Beveled Ribcage Chassis
  const chestCore = new THREE.Mesh(
    createBeveledArmorPlateGeometry(1.42, 0.86, 1.08, 0.72, 0.038),
    armorDarkMat
  );
  chestCore.position.set(0, 2.66, 0.02);
  enableShadows(chestCore);
  torsoGroup.add(chestCore);

  // Angular Front Breastplate Wings & Dorsal Thruster Block
  for (const sx of [-1, 1]) {
    const pecPlate = new THREE.Mesh(
      createBeveledArmorPlateGeometry(0.54, 0.34, 0.62, 0.24, 0.024),
      gunmetalMat
    );
    pecPlate.position.set(sx * 0.42, 2.74, 0.32);
    pecPlate.rotation.set(-0.14, sx * 0.28, sx * -0.18);
    enableShadows(pecPlate);

    // Diagonal Glowing Magma Fracture Slit across Chest Plate
    const chestFissure = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.06), magmaGlowMat);
    chestFissure.position.set(sx * 0.42, 2.72, 0.45);
    chestFissure.rotation.set(-0.14, sx * 0.28, sx * -0.52);

    torsoGroup.add(pecPlate, chestFissure);
  }

  // Heavy High Collar Cowl Framing the Mecha Neck
  const collar = new THREE.Mesh(
    createBeveledArmorPlateGeometry(0.96, 0.68, 0.38, 0.56, 0.025),
    armorCharredMat
  );
  collar.position.set(0, 3.24, -0.08);
  collar.rotation.x = 0.22;
  enableShadows(collar);
  torsoGroup.add(collar);

  // Dorsal Wing-Spine Thruster Pack
  const dorsalPack = new THREE.Mesh(
    createBeveledArmorPlateGeometry(0.84, 0.54, 1.15, 0.36, 0.025),
    armorCharredMat
  );
  dorsalPack.position.set(0, 2.7, -0.34);
  enableShadows(dorsalPack);
  torsoGroup.add(dorsalPack);

  // Black-Red Singularity Chest Core + Rotating Mechanical Containment Rings
  const reactorCenter = new THREE.Group();
  reactorCenter.position.set(0, 2.6, 0.42);
  torsoGroup.add(reactorCenter);

  const blackOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), singularityMat);
  const flareHalo = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.042, 8, 24), magmaGlowMat);
  const crimsonCorona = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 24), coreCrimsonMat);
  crimsonCorona.position.z = -0.02;
  reactorCenter.add(blackOrb, flareHalo, crimsonCorona);

  const reactorRingOuter = new THREE.Group();
  const outerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.036, 6, 8), gunmetalMat);
  reactorRingOuter.add(outerRingMesh);
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.1), armorDarkMat);
    clamp.position.set(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.02);
    clamp.rotation.z = a;
    reactorRingOuter.add(clamp);
  }
  reactorCenter.add(reactorRingOuter);

  const reactorRingInner = new THREE.Group();
  const innerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 6, 6), coreCrimsonMat);
  reactorRingInner.position.z = 0.03;
  reactorRingInner.add(innerRingMesh);
  reactorCenter.add(reactorRingInner);

  // =========================================================================
  // 2. FACELESS MECHA HELMET HEAD WITH MAGMA VISOR SLIT & CURVED HORNS
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 3.62, 0.05);
  hoverRoot.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 6), cableMat);
  neck.position.y = -0.18;
  headGroup.add(neck);

  const helmSkull = new THREE.Mesh(
    createBeveledArmorPlateGeometry(0.56, 0.38, 0.64, 0.58, 0.025),
    armorDarkMat
  );
  helmSkull.rotation.x = 0.12;
  enableShadows(helmSkull);

  const facePlate = new THREE.Mesh(
    createBeveledArmorPlateGeometry(0.42, 0.16, 0.44, 0.18, 0.018),
    gunmetalMat
  );
  facePlate.position.set(0, -0.05, 0.24);
  facePlate.rotation.x = 0.16;
  enableShadows(facePlate);

  const crestFin = new THREE.Mesh(
    createBeveledArmorPlateGeometry(0.1, 0.06, 0.42, 0.48, 0.012),
    armorCharredMat
  );
  crestFin.position.set(0, 0.34, -0.02);
  crestFin.rotation.x = -0.22;
  enableShadows(crestFin);
  headGroup.add(helmSkull, facePlate, crestFin);

  // Glowing Slanted V-Shaped Mecha Visor Optics
  for (const sx of [-1, 1]) {
    const visorEye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.048, 0.06), magmaGlowMat);
    visorEye.position.set(sx * 0.11, 0.04, 0.34);
    visorEye.rotation.set(0.1, sx * 0.3, sx * 0.32);
    headGroup.add(visorEye);
  }

  // Pair of Curved Mechanical Horns (TubeGeometry along swept curve)
  for (const sx of [-1, 1]) {
    const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.1, 6), gunmetalMat);
    hornBase.position.set(sx * 0.22, 0.25, 0.02);
    hornBase.rotation.z = sx * -0.55;

    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.21, 0.24, 0.02),
      new THREE.Vector3(sx * 0.38, 0.44, -0.04),
      new THREE.Vector3(sx * 0.34, 0.66, -0.14),
      new THREE.Vector3(sx * 0.18, 0.78, -0.18),
    ]);
    const hornGeo = new THREE.TubeGeometry(hornCurve, 8, 0.042, 5, false);
    // Taper horn tip slightly via vertex positions
    const hPos = hornGeo.getAttribute('position');
    for (let i = 0; i < hPos.count; i++) {
      const py = hPos.getY(i);
      const t = Math.max(0, Math.min(1, (py - 0.24) / 0.54));
      const cx = sx * (0.21 + Math.sin(t * Math.PI) * 0.16);
      const cz = 0.02 - t * 0.2;
      hPos.setX(i, cx + (hPos.getX(i) - cx) * (1 - t * 0.78));
      hPos.setZ(i, cz + (hPos.getZ(i) - cz) * (1 - t * 0.78));
    }
    hPos.needsUpdate = true;
    hornGeo.computeVertexNormals();

    const hornMesh = new THREE.Mesh(hornGeo, armorCharredMat);
    enableShadows(hornMesh);
    headGroup.add(hornBase, hornMesh);
  }

  // =========================================================================
  // 3. FLOATING HEAVY PAULDRONS & CLAWED MECHANICAL ARMS
  // =========================================================================
  const floatingPauldrons: FloatingPauldronSpec[] = [];
  const armGroups: { group: THREE.Group; side: -1 | 1 }[] = [];

  for (const sx of [-1, 1] as const) {
    // Detached Floating Pauldron Shield with Magma Fissure Trim & Hover Thruster Core
    const pauldron = new THREE.Group();
    pauldron.position.set(sx * 1.14, 3.18, 0.04);

    const pMain = new THREE.Mesh(
      createBeveledArmorPlateGeometry(0.68, 0.44, 0.58, 0.66, 0.026),
      armorDarkMat
    );
    pMain.rotation.z = sx * -0.45;
    const pCrest = new THREE.Mesh(
      createBeveledArmorPlateGeometry(0.46, 0.26, 0.42, 0.52, 0.02),
      gunmetalMat
    );
    pCrest.position.set(sx * 0.14, 0.24, 0);
    pCrest.rotation.z = sx * -0.62;

    const pGlow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.42), magmaGlowMat);
    pGlow.position.set(sx * 0.06, 0.14, 0.2);
    pGlow.rotation.z = sx * -0.45;

    const pGravOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), coreCrimsonMat);
    pGravOrb.position.set(-sx * 0.26, -0.14, 0);

    enableShadows(pMain);
    enableShadows(pCrest);
    pauldron.add(pMain, pCrest, pGlow, pGravOrb);
    hoverRoot.add(pauldron);
    floatingPauldrons.push({
      group: pauldron,
      baseY: 3.18,
      baseRoll: sx * -0.06,
      side: sx,
    });

    // Segmented Mechanical Arm + Gauntlet + 3 Articulated Claws
    const armGroup = new THREE.Group();
    armGroup.position.set(sx * 0.84, 2.86, 0.04);
    hoverRoot.add(armGroup);
    armGroups.push({ group: armGroup, side: sx });

    const shoulderJoint = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), gunmetalMat);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.62, 6), armorCharredMat);
    upperArm.position.set(sx * 0.12, -0.32, 0.04);
    upperArm.rotation.z = sx * 0.24;

    const elbowJoint = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), magmaGlowMat);
    elbowJoint.position.set(sx * 0.22, -0.62, 0.06);

    const forearm = new THREE.Mesh(
      createBeveledArmorPlateGeometry(0.28, 0.22, 0.68, 0.28, 0.02),
      armorDarkMat
    );
    forearm.position.set(sx * 0.22, -0.96, 0.18);
    forearm.rotation.set(-0.36, 0, sx * -0.12);

    const gauntletCuff = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.26), gunmetalMat);
    gauntletCuff.position.set(sx * 0.2, -1.26, 0.3);
    gauntletCuff.rotation.x = -0.36;

    // 3 Sharp Claw Blades per Hand
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.28, 4), gunmetalMat);
      claw.position.set(sx * 0.2 + c * 0.08, -1.44, 0.35 + (1 - Math.abs(c)) * 0.04);
      claw.rotation.set(Math.PI + 0.32, 0, c * -0.16);
      enableShadows(claw);
      armGroup.add(claw);
    }

    enableShadows(upperArm);
    enableShadows(forearm);
    enableShadows(gauntletCuff);
    armGroup.add(shoulderJoint, upperArm, elbowJoint, forearm, gauntletCuff);
  }

  // =========================================================================
  // 4. LOWER TASSETS & DANGLING ENERGY CABLES (Zero Stiff Block Legs)
  // =========================================================================
  const lowerSkirtGroup = new THREE.Group();
  hoverRoot.add(lowerSkirtGroup);

  for (const sx of [-1, 1] as const) {
    const tasset = new THREE.Mesh(createChevronTassetGeometry(0.62, 0.96, 0.16, sx), armorDarkMat);
    tasset.position.set(sx * 0.34, 1.88, 0.1);
    tasset.rotation.set(0.18, sx * -0.35, sx * 0.08);
    enableShadows(tasset);

    const tassetGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.06), magmaGlowMat);
    tassetGlow.position.set(sx * 0.62, 1.44, 0.18);
    tassetGlow.rotation.set(0.18, sx * -0.35, sx * -0.22);

    lowerSkirtGroup.add(tasset, tassetGlow);
  }

  // 6 Curved Dangling Dark Cyber Cables Hanging Below Waist (down to y ≈ 0.30)
  const danglingCables: DanglingCableSpec[] = [];
  const cableSpecs: [number, number, number, number][] = [
    [-0.28, -0.04, 1.15, -0.14],
    [-0.12, 0.1, 1.28, -0.05],
    [0.02, -0.12, 1.36, 0.02],
    [0.14, 0.08, 1.24, 0.06],
    [0.29, -0.04, 1.12, 0.15],
    [-0.06, 0.14, 1.05, -0.08],
  ];
  cableSpecs.forEach(([cx, cz, dropLen, flareX], idx) => {
    const cPivot = new THREE.Group();
    cPivot.position.set(cx, 1.48, cz);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(flareX * 0.45, -dropLen * 0.36, 0.06 * (idx % 2 === 0 ? 1 : -1)),
      new THREE.Vector3(flareX * 0.85, -dropLen * 0.72, -0.08),
      new THREE.Vector3(flareX * 0.65, -dropLen, -0.02),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.036, 5, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, cableMat);
    const tipSpark = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), coreCrimsonMat);
    tipSpark.position.set(flareX * 0.65, -dropLen, -0.02);

    enableShadows(tubeMesh);
    cPivot.add(tubeMesh, tipSpark);
    lowerSkirtGroup.add(cPivot);
    danglingCables.push({
      pivot: cPivot,
      phase: idx * 1.15,
      baseRotX: 0.04,
      baseRotZ: flareX * 0.2,
    });
  });

  // =========================================================================
  // 5. SIX INDEPENDENT MECHANICAL BLADE WINGS (3 TIERED PAIRS LEFT & RIGHT)
  // =========================================================================
  const wingPivots: THREE.Group[] = [];
  const wingSpecs: WingAnimSpec[] = [];

  const wingTiers: {
    y: number;
    z: number;
    roll: number;
    yaw: number;
    sparLen: number;
    bladeCount: number;
    bladeLen: number;
  }[] = [
    { y: 3.12, z: -0.34, roll: 0.42, yaw: 0.18, sparLen: 3.35, bladeCount: 5, bladeLen: 1.45 }, // Upper mega wing
    { y: 2.68, z: -0.4, roll: -0.04, yaw: 0.24, sparLen: 2.75, bladeCount: 4, bladeLen: 1.25 }, // Mid wing
    { y: 2.24, z: -0.44, roll: -0.52, yaw: 0.28, sparLen: 2.15, bladeCount: 4, bladeLen: 1.05 }, // Lower pinion wing
  ];

  for (let tierIdx = 0; tierIdx < wingTiers.length; tierIdx++) {
    const wt = wingTiers[tierIdx];
    for (const sx of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(sx * 0.48, wt.y, wt.z);
      wingPivot.rotation.set(0, sx * wt.yaw, sx * wt.roll);
      hoverRoot.add(wingPivot);
      wingPivots.push(wingPivot);

      // Rotary Armored Joint Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.16, 8), gunmetalMat);
      hub.rotation.x = Math.PI / 2;
      const hubGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 6), magmaGlowMat);
      hubGlow.rotation.x = Math.PI / 2;
      enableShadows(hub);
      wingPivot.add(hub, hubGlow);

      // Primary Wing Spar Boom extending outward (+X on right, rotated PI around Y for left to preserve CCW normals!)
      const wingFrame = new THREE.Group();
      if (sx < 0) wingFrame.rotation.y = Math.PI;
      wingPivot.add(wingFrame);

      const spar = new THREE.Mesh(
        createBeveledArmorPlateGeometry(wt.sparLen, wt.sparLen * 0.94, 0.18, 0.12, 0.016),
        armorCharredMat
      );
      spar.position.set(wt.sparLen * 0.5, 0.04, 0);
      enableShadows(spar);
      wingFrame.add(spar);

      const sparEmberRail = new THREE.Mesh(
        new THREE.BoxGeometry(wt.sparLen * 0.85, 0.035, 0.13),
        coreCrimsonMat
      );
      sparEmberRail.position.set(wt.sparLen * 0.5, 0.04, 0);
      wingFrame.add(sparEmberRail);

      // Stepped Fan of Mechanical Razor Pinion Blades with Glowing Magma Tips
      for (let b = 0; b < wt.bladeCount; b++) {
        const frac = (b + 0.6) / wt.bladeCount;
        const bLen = wt.bladeLen * (0.68 + frac * 0.48);
        const rootW = 0.28 + (1 - frac) * 0.08;
        const bladeGeo = createWingBladeGeometry(bLen, rootW, 0.055, 0.012);
        const tipGeo = createWingTipEmberGeometry(bLen, rootW, 0.062);

        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(0.32 + frac * (wt.sparLen * 0.72), -0.02, 0.02 * (b % 2 === 0 ? 1 : -1));
        bladeGroup.rotation.z = -0.78 + frac * 0.54;

        const bladeMesh = new THREE.Mesh(bladeGeo, b % 2 === 0 ? armorDarkMat : gunmetalMat);
        const tipMesh = new THREE.Mesh(tipGeo, magmaGlowMat);
        enableShadows(bladeMesh);

        bladeGroup.add(bladeMesh, tipMesh);
        wingFrame.add(bladeGroup);
      }

      wingSpecs.push({
        pivot: wingPivot,
        side: sx,
        tier: tierIdx,
        baseYaw: sx * wt.yaw,
        baseRoll: sx * wt.roll,
        phaseOffset: tierIdx * 0.65,
      });
    }
  }

  // =========================================================================
  // 6. REAL-TIME ANIMATION & CLEANUP
  // =========================================================================
  const update = (dtSec: number, elapsed: number, hitFactor: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    // Gentle intimidating hover float (stay grounded cleanly above y = 0.25 without covering chibis)
    hoverRoot.position.y = Math.sin(t * 1.9) * 0.12 + hitFactor * 0.1;

    // Slow counter-rotating chest singularity containment rings
    reactorRingOuter.rotation.z = t * 0.85 + hitFactor * 0.4;
    reactorRingInner.rotation.z = -t * 1.35;
    magmaGlowMat.emissiveIntensity = 1.75 + hitFactor * 1.1 + Math.sin(t * 3.4) * 0.22;
    coreCrimsonMat.emissiveIntensity = 1.45 + hitFactor * 0.9 + Math.cos(t * 2.9) * 0.18;
    chestLight.intensity = 2.2 + hitFactor * 1.4;

    // Subtle breathing on mecha helmet & clawed arms
    headGroup.rotation.x = Math.sin(t * 1.6) * 0.045;
    for (const arm of armGroups) {
      arm.group.rotation.x = Math.sin(t * 1.9 + (arm.side > 0 ? 0.5 : 0)) * 0.06 - hitFactor * 0.18;
      arm.group.rotation.z = arm.side * (0.04 + Math.sin(t * 1.5) * 0.03);
    }

    // Floating pauldrons bob out-of-phase with torso
    for (const p of floatingPauldrons) {
      p.group.position.y = p.baseY + Math.sin(t * 2.3 + (p.side > 0 ? 0.8 : 0)) * 0.065;
      p.group.rotation.z = p.baseRoll + Math.sin(t * 1.8) * 0.04 * p.side;
    }

    // Dangling cables sway lazily in crater heat updraft
    for (const c of danglingCables) {
      c.pivot.rotation.x = c.baseRotX + Math.sin(t * 2.2 + c.phase) * 0.075;
      c.pivot.rotation.z = c.baseRotZ + Math.cos(t * 1.7 + c.phase) * 0.065;
    }

    // Independent mechanical wing wave-flapping (3 staggered pairs)
    for (const w of wingSpecs) {
      const wave = Math.sin(t * 2.1 - w.phaseOffset);
      const flare = Math.cos(t * 1.6 - w.phaseOffset);
      w.pivot.rotation.y = w.baseYaw + w.side * (wave * 0.16 + hitFactor * 0.14);
      w.pivot.rotation.z = w.baseRoll + w.side * (flare * 0.07 + hitFactor * 0.08);
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
