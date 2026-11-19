import * as THREE from 'three';

const ALTAR_CENTER_X = 0;
const ALTAR_CENTER_Z = -2.4;

function createGlowParticleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.82)');
  grad.addColorStop(0.62, 'rgba(255, 255, 255, 0.28)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface AltarClockDialParts {
  group: THREE.Group;
  gearRing: THREE.Group;
  centerOrb: THREE.Mesh;
  outerTrackRing?: THREE.Group;
  skyBeamMat?: THREE.MeshBasicMaterial;
  outerRuneMat?: THREE.MeshBasicMaterial;
}

/**
 * Helper to extrude a 2D shape horizontally (lying flat on the XZ plane, centered vertically around y = 0).
 */
function createFlatExtrudedShape(
  buildShape: (shape: THREE.Shape) => void,
  thickness: number,
  bevel = 0.012
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  buildShape(shape);
  const innerDepth = Math.max(0.008, thickness - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  // Rotate so shape (X, Y) maps to world (X, Z) with thickness along +Y
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -innerDepth * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

export function createAltarClockDial(
  pedestalTargets: ReadonlyArray<{ x: number; z: number; color: string }>
): AltarClockDialParts {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.28, ALTAR_CENTER_Z);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x92400e,
    emissiveIntensity: 0.48,
    roughness: 0.22,
    metalness: 0.86,
    flatShading: true,
  });
  const darkArmorMat = new THREE.MeshStandardMaterial({
    color: 0x0b1024,
    roughness: 0.34,
    metalness: 0.42,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e2c48,
    roughness: 0.3,
    metalness: 0.65,
    flatShading: true,
  });
  const cyanGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const violetGlowMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Tiered obsidian & titanium astrolabe dial base
  const outerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.66, 0.12, 20), steelMat);
  outerPlinth.position.y = 0.0;
  outerPlinth.receiveShadow = true;
  group.add(outerPlinth);

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.52, 0.14, 36), darkArmorMat);
  plate.position.y = 0.03;
  plate.receiveShadow = true;
  group.add(plate);

  // Sculpted outer gold bezel torus + cardinal compass lugs
  const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.072, 10, 48), goldMat);
  outerBezel.rotation.x = Math.PI / 2;
  outerBezel.position.y = 0.095;
  group.add(outerBezel);

  const innerBezel = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.034, 8, 40), goldMat);
  innerBezel.rotation.x = Math.PI / 2;
  innerBezel.position.y = 0.102;
  group.add(innerBezel);

  // Concentric arcane astrolabe rings
  const violetRing = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.08, 40), violetGlowMat);
  violetRing.rotation.x = -Math.PI / 2;
  violetRing.position.y = 0.104;
  group.add(violetRing);

  const cyanRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.55, 32), cyanGlowMat);
  cyanRing.rotation.x = -Math.PI / 2;
  cyanRing.position.y = 0.106;
  group.add(cyanRing);

  // 10 color-matched beveled arrow hour markers pointing toward each Enchant pedestal
  const markerFrameGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(-0.16, -0.065);
      s.lineTo(0.08, -0.085);
      s.lineTo(0.24, 0);
      s.lineTo(0.08, 0.085);
      s.lineTo(-0.16, 0.065);
      s.closePath();
    },
    0.055,
    0.01
  );

  for (const target of pedestalTargets) {
    const dx = target.x - ALTAR_CENTER_X;
    const dz = target.z - ALTAR_CENTER_Z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    const tickAng = Math.atan2(-dz, dx);

    const tickGroup = new THREE.Group();
    tickGroup.position.set(nx * 1.27, 0.115, nz * 1.27);
    tickGroup.rotation.y = tickAng;

    const stud = new THREE.Mesh(markerFrameGeo, goldMat);
    tickGroup.add(stud);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.072, 0),
      new THREE.MeshBasicMaterial({ color: target.color })
    );
    gem.position.set(0.06, 0.042, 0);
    gem.scale.set(1.25, 0.75, 0.9);
    tickGroup.add(gem);

    group.add(tickGroup);
  }

  // Rotating astrolabe clockwork gear ring with 12 precision teeth & 4 inner spokes
  const gearRing = new THREE.Group();
  gearRing.position.y = 0.125;
  const gearTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.038, 8, 36),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.78,
      roughness: 0.22,
      metalness: 0.65,
      flatShading: true,
    })
  );
  gearTorus.rotation.x = Math.PI / 2;
  gearRing.add(gearTorus);

  const toothGeo = new THREE.BoxGeometry(0.15, 0.05, 0.068);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, goldMat);
    tooth.position.set(Math.cos(a) * 0.79, 0, Math.sin(a) * 0.79);
    tooth.rotation.y = -a;
    gearRing.add(tooth);
  }
  const spokeGeo = new THREE.BoxGeometry(1.44, 0.028, 0.045);
  for (let i = 0; i < 2; i++) {
    const spoke = new THREE.Mesh(spokeGeo, goldMat);
    spoke.rotation.y = (i * Math.PI) / 2;
    gearRing.add(spoke);
  }
  group.add(gearRing);

  // Stepped center tourbillon pivot pedestal
  const pivotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.32, 8), goldMat);
  pivotBase.position.y = 0.18;
  group.add(pivotBase);

  const pivotCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.12, 8), steelMat);
  pivotCollar.position.y = 0.34;
  group.add(pivotCollar);

  // Center pivot cap (hidden finial orb kept for interface compatibility)
  const centerOrb = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.05, 16), goldMat);
  centerOrb.position.y = 0.4;
  centerOrb.visible = false;
  group.add(centerOrb);

  // Outer Floating Counter-Rotating Astrolabe Chrono Track Ring (r = 2.45m, flat horizontal plane)
  const outerTrackRing = new THREE.Group();
  outerTrackRing.position.y = 0.04;
  const outerTrackTorus = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.052, 8, 56), steelMat);
  outerTrackTorus.rotation.x = Math.PI / 2;
  const outerGoldRim = new THREE.Mesh(new THREE.TorusGeometry(2.54, 0.028, 8, 56), goldMat);
  outerGoldRim.rotation.x = Math.PI / 2;
  outerGoldRim.position.y = 0.025;
  const outerRuneMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const outerRuneBand = new THREE.Mesh(new THREE.RingGeometry(2.22, 2.34, 48), outerRuneMat);
  outerRuneBand.rotation.x = -Math.PI / 2;
  outerRuneBand.position.y = 0.02;
  outerTrackRing.add(outerTrackTorus, outerGoldRim, outerRuneBand);

  const vernierTickGeo = new THREE.BoxGeometry(0.18, 0.045, 0.055);
  const subTickGeo = new THREE.BoxGeometry(0.09, 0.03, 0.032);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const isMajor = i % 4 === 0;
    const tick = new THREE.Mesh(isMajor ? vernierTickGeo : subTickGeo, isMajor ? goldMat : cyanGlowMat);
    const r = isMajor ? 2.48 : 2.38;
    tick.position.set(Math.cos(a) * r, 0.035, Math.sin(a) * r);
    tick.rotation.y = -a;
    outerTrackRing.add(tick);
  }
  group.add(outerTrackRing);

  // Soft Skyward Chrono Light Beam rising from center tourbillon spire
  const skyBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const skyBeamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.92, 9.5, 20, 1, true),
    skyBeamMat
  );
  skyBeamMesh.position.y = 4.95;
  group.add(skyBeamMesh);

  return {
    group,
    gearRing,
    centerOrb,
    outerTrackRing,
    skyBeamMat,
    outerRuneMat,
  };
}

export interface AltarClockHandParts {
  group: THREE.Group;
  tipGlowMat: THREE.MeshBasicMaterial;
  beamMesh: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
}

/**
 * Builds the primary Ornate Astral Chrono-Spear Clock Hand (inspired by Honkai: Star Rail
 * Simulated Universe Astrolabe & Breguet/Astrologian skeletonized celestial pointers):
 * - Multi-tiered octagonal Tourbillon center hub with 4-point compass star finial.
 * - Swept beveled Crescent Counterweight Tail (-X) cradling a live color-synced star crystal.
 * - Swept Astral Crossguard Wings (+X = 0.32..0.95) with floating energy nodes.
 * - Skeletonized Split-Rail Spear Shaft with exposed glowing plasma core & 2 octagonal focus lenses.
 * - Horizontal Astrolabe Sighting Reticle Ring (+X = 2.48) with 4 cardinal crosshairs.
 * - Beveled Fleur-de-Lis / Halberd Diamond Spearhead (+X = 2.38..3.42) + laser targeting beam.
 */
export function createAltarClockHand(): AltarClockHandParts {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.56, ALTAR_CENTER_Z);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xb45309,
    emissiveIntensity: 0.46,
    roughness: 0.2,
    metalness: 0.88,
    flatShading: true,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x111833,
    roughness: 0.32,
    metalness: 0.72,
    flatShading: true,
  });
  const brightSteelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.85,
    flatShading: true,
  });
  const tipGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // 1. Multi-Tiered Tourbillon Center Hub (x = 0)
  const hubBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 8), darkMetalMat);
  hubBase.rotation.y = Math.PI / 8;
  group.add(hubBase);

  const hubBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.15, 8), goldMat);
  group.add(hubBoss);

  const hubGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.024, 8, 24), tipGlowMat);
  hubGlowRing.rotation.x = Math.PI / 2;
  hubGlowRing.position.y = 0.045;
  group.add(hubGlowRing);

  const hubStarGeo = createFlatExtrudedShape(
    (s) => {
      const pts = 4;
      for (let i = 0; i < pts * 2; i++) {
        const a = (i * Math.PI) / pts;
        const r = i % 2 === 0 ? 0.22 : 0.085;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
    },
    0.05,
    0.008
  );
  const hubStarCap = new THREE.Mesh(hubStarGeo, goldMat);
  hubStarCap.position.y = 0.095;
  group.add(hubStarCap);

  const hubCenterGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), tipGlowMat);
  hubCenterGem.position.y = 0.135;
  hubCenterGem.scale.set(1, 0.65, 1);
  group.add(hubCenterGem);

  // 2. Sculpted Crescent & Star Counterweight Tail (-X = -0.24..-1.26)
  const tailSpineGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(-0.22, -0.09);
      s.lineTo(-0.78, -0.055);
      s.lineTo(-0.92, 0);
      s.lineTo(-0.78, 0.055);
      s.lineTo(-0.22, 0.09);
      s.closePath();
    },
    0.075,
    0.012
  );
  const tailSpine = new THREE.Mesh(tailSpineGeo, darkMetalMat);
  group.add(tailSpine);

  for (const side of [-1, 1]) {
    const crescentGeo = createFlatExtrudedShape(
      (s) => {
        s.moveTo(-0.56, side * 0.06);
        s.lineTo(-0.76, side * 0.22);
        s.lineTo(-1.04, side * 0.26);
        s.lineTo(-1.26, side * 0.11);
        s.lineTo(-1.12, side * 0.05);
        s.lineTo(-0.94, side * 0.14);
        s.lineTo(-0.72, side * 0.12);
        s.closePath();
      },
      0.065,
      0.01
    );
    const crescentHorn = new THREE.Mesh(crescentGeo, goldMat);
    group.add(crescentHorn);
  }

  const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.032, 8, 24), goldMat);
  tailRing.rotation.x = Math.PI / 2;
  tailRing.position.set(-0.98, 0.01, 0);
  group.add(tailRing);

  const tailJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), tipGlowMat);
  tailJewel.position.set(-0.98, 0.02, 0);
  tailJewel.scale.set(1.25, 0.72, 1.0);
  group.add(tailJewel);

  // 3. Swept Astral Crossguard Wings near Hub (+X = 0.26..1.05)
  for (const side of [-1, 1]) {
    const wingArmorGeo = createFlatExtrudedShape(
      (s) => {
        s.moveTo(0.24, side * 0.08);
        s.lineTo(0.58, side * 0.36);
        s.lineTo(0.42, side * 0.48);
        s.lineTo(0.96, side * 0.26);
        s.lineTo(0.84, side * 0.11);
        s.closePath();
      },
      0.068,
      0.011
    );
    const wingArmor = new THREE.Mesh(wingArmorGeo, goldMat);
    wingArmor.position.y = 0.01;
    group.add(wingArmor);

    const wingAccent = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), tipGlowMat);
    wingAccent.position.set(0.54, 0.035, side * 0.34);
    wingAccent.scale.set(1.4, 0.65, 0.85);
    group.add(wingAccent);
  }

  // 4. Skeletonized Split-Rail Spear Shaft (+X = 0.32..2.52) with Exposed Glowing Plasma Core
  const innerArmorBodyGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(0.28, -0.14);
      s.lineTo(0.88, -0.18);
      s.lineTo(1.38, -0.095);
      s.lineTo(2.28, -0.13);
      s.lineTo(2.62, -0.055);
      s.lineTo(2.62, 0.055);
      s.lineTo(2.28, 0.13);
      s.lineTo(1.38, 0.095);
      s.lineTo(0.88, 0.18);
      s.lineTo(0.28, 0.14);
      s.closePath();
    },
    0.058,
    0.01
  );
  const innerArmorBody = new THREE.Mesh(innerArmorBodyGeo, darkMetalMat);
  innerArmorBody.position.y = -0.008;
  group.add(innerArmorBody);

  // Twin outer golden skeleton rails flanking the central plasma channel
  for (const side of [-1, 1]) {
    const railGeo = createFlatExtrudedShape(
      (s) => {
        s.moveTo(0.34, side * 0.055);
        s.lineTo(0.88, side * 0.19);
        s.lineTo(1.38, side * 0.11);
        s.lineTo(1.92, side * 0.155);
        s.lineTo(2.48, side * 0.085);
        s.lineTo(2.44, side * 0.038);
        s.lineTo(1.92, side * 0.085);
        s.lineTo(1.38, side * 0.048);
        s.lineTo(0.88, side * 0.105);
        s.lineTo(0.34, side * 0.025);
        s.closePath();
      },
      0.074,
      0.011
    );
    const railMesh = new THREE.Mesh(railGeo, goldMat);
    railMesh.position.y = 0.012;
    group.add(railMesh);
  }

  // Luminous central plasma energy spine running from hub to spearhead
  const plasmaSpineGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(0.32, -0.032);
      s.lineTo(1.45, -0.042);
      s.lineTo(2.68, -0.022);
      s.lineTo(2.68, 0.022);
      s.lineTo(1.45, 0.042);
      s.lineTo(0.32, 0.032);
      s.closePath();
    },
    0.068,
    0.008
  );
  const plasmaVein = new THREE.Mesh(plasmaSpineGeo, tipGlowMat);
  plasmaVein.position.y = 0.026;
  group.add(plasmaVein);

  // Two octagonal focus nodes along the skeletonized shaft (+X = 0.88 & +X = 1.88)
  for (const nodeX of [0.88, 1.88]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.085, 8), goldMat);
    bezel.position.set(nodeX, 0.02, 0);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.078, 0), tipGlowMat);
    jewel.position.set(nodeX, 0.055, 0);
    jewel.scale.set(1.25, 0.65, 0.95);
    group.add(bezel, jewel);
  }

  // 5. Horizontal Astrolabe Sighting Reticle Ring near Spearhead (+X = 2.48)
  const reticleRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.026, 8, 28), goldMat);
  reticleRing.rotation.x = Math.PI / 2;
  reticleRing.position.set(2.48, 0.018, 0);
  group.add(reticleRing);

  const reticleInnerGlow = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 6, 24), tipGlowMat);
  reticleInnerGlow.rotation.x = Math.PI / 2;
  reticleInnerGlow.position.set(2.48, 0.022, 0);
  group.add(reticleInnerGlow);

  // 6. Sculpted Fleur-de-Lis / Halberd Diamond Spearhead (+X = 2.32..3.48)
  const spearOuterGoldGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(2.26, 0);
      s.lineTo(2.46, -0.26);
      s.lineTo(2.74, -0.14);
      s.lineTo(3.32, 0);
      s.lineTo(2.74, 0.14);
      s.lineTo(2.46, 0.26);
      s.closePath();
    },
    0.072,
    0.012
  );
  const spearOuterGold = new THREE.Mesh(spearOuterGoldGeo, goldMat);
  spearOuterGold.position.y = 0.008;
  group.add(spearOuterGold);

  const spearCoreTipGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(2.42, 0);
      s.lineTo(2.66, -0.11);
      s.lineTo(3.48, 0);
      s.lineTo(2.66, 0.11);
      s.closePath();
    },
    0.082,
    0.012
  );
  const arrowHead = new THREE.Mesh(spearCoreTipGeo, tipGlowMat);
  arrowHead.position.y = 0.022;
  group.add(arrowHead);

  const spearSilverCrestGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(2.48, 0);
      s.lineTo(2.68, -0.055);
      s.lineTo(3.24, 0);
      s.lineTo(2.68, 0.055);
      s.closePath();
    },
    0.092,
    0.008
  );
  const spearSilverCrest = new THREE.Mesh(spearSilverCrestGeo, brightSteelMat);
  spearSilverCrest.position.y = 0.032;
  group.add(spearSilverCrest);

  // 7. Translucent Targeting Laser Beam extending ahead of Spear Tip toward Pedestals
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.16, 1.45, 8, 1, true), beamMat);
  beamMesh.rotation.z = -Math.PI / 2;
  beamMesh.position.set(4.15, 0.02, 0);
  group.add(beamMesh);

  return { group, tipGlowMat, beamMesh, beamMat };
}

/**
 * Builds the secondary Silver-Cyan Chrono Vernier Sub-Hand (Breguet moon-eye astrolabe pointer)
 * that counter-rotates during spin and locks in harmony with the main Chrono-Spear hand.
 */
export function createAltarSubHand(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.44, ALTAR_CENTER_Z);

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.86,
    flatShading: true,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.72,
    flatShading: true,
  });
  const violetGlowMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // Center collar ring
  const subCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.06, 8), silverMat);
  group.add(subCollar);

  // Tuning-fork counterweight tail (-X = -0.18..-0.72)
  const tailGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(-0.16, -0.065);
      s.lineTo(-0.66, -0.11);
      s.lineTo(-0.56, -0.035);
      s.lineTo(-0.34, 0);
      s.lineTo(-0.56, 0.035);
      s.lineTo(-0.66, 0.11);
      s.lineTo(-0.16, 0.065);
      s.closePath();
    },
    0.042,
    0.007
  );
  const tail = new THREE.Mesh(tailGeo, silverMat);
  group.add(tail);

  const tailGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), violetGlowMat);
  tailGem.position.set(-0.52, 0.02, 0);
  tailGem.scale.set(1.2, 0.65, 0.9);
  group.add(tailGem);

  // Tapered beveled vernier blade (+X = 0.18..1.86)
  const bladeGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(0.18, -0.075);
      s.lineTo(0.75, -0.095);
      s.lineTo(1.84, -0.035);
      s.lineTo(1.84, 0.035);
      s.lineTo(0.75, 0.095);
      s.lineTo(0.18, 0.075);
      s.closePath();
    },
    0.044,
    0.008
  );
  const shaft = new THREE.Mesh(bladeGeo, silverMat);
  group.add(shaft);

  const innerVeinGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(0.26, -0.022);
      s.lineTo(1.82, -0.014);
      s.lineTo(1.82, 0.014);
      s.lineTo(0.26, 0.022);
      s.closePath();
    },
    0.052,
    0.005
  );
  const innerVein = new THREE.Mesh(innerVeinGeo, darkSteelMat);
  group.add(innerVein);

  // Breguet Moon-Eye ring at +X = 1.98 + sharp needle pointer tip (+X = 2.12..2.42)
  const tipRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 8, 24), violetGlowMat);
  tipRing.rotation.x = Math.PI / 2;
  tipRing.position.set(1.98, 0.008, 0);
  group.add(tipRing);

  const needleTipGeo = createFlatExtrudedShape(
    (s) => {
      s.moveTo(2.1, -0.045);
      s.lineTo(2.42, 0);
      s.lineTo(2.1, 0.045);
      s.closePath();
    },
    0.048,
    0.007
  );
  const needleTip = new THREE.Mesh(needleTipGeo, cyanGlowMat);
  group.add(needleTip);

  return group;
}

interface VortexParticle {
  angle: number;
  radius: number;
  baseY: number;
  speed: number;
  yAmp: number;
  phase: number;
  tint: THREE.Color;
}

interface SparkParticle {
  alive: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: THREE.Color;
}

export class AltarParticleSystem {
  public readonly group = new THREE.Group();

  private readonly vortexCount = 150;
  private readonly vortexPos = new Float32Array(this.vortexCount * 3);
  private readonly vortexCol = new Float32Array(this.vortexCount * 3);
  private readonly vortexGeo = new THREE.BufferGeometry();
  private readonly vortexData: VortexParticle[] = [];

  private readonly sparkCount = 200;
  private readonly sparkPos = new Float32Array(this.sparkCount * 3);
  private readonly sparkCol = new Float32Array(this.sparkCount * 3);
  private readonly sparkGeo = new THREE.BufferGeometry();
  private readonly sparks: SparkParticle[] = [];
  private sparkCursor = 0;

  private readonly shockwaveRing: THREE.Mesh;
  private readonly shockwaveMat: THREE.MeshBasicMaterial;
  private shockwaveTimer = 0;
  private readonly shockwaveDuration = 0.85;

  private readonly tmpColor = new THREE.Color();

  constructor() {
    const tex = createGlowParticleTexture();

    const palette = [0xc084fc, 0x38bdf8, 0xfacc15, 0xf472b6];
    for (let i = 0; i < this.vortexCount; i++) {
      const p: VortexParticle = {
        angle: Math.random() * Math.PI * 2,
        radius: 1.05 + Math.random() * 5.3,
        baseY: -0.25 + Math.random() * 2.4,
        speed: 0.45 + Math.random() * 0.75,
        yAmp: 0.12 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        tint: new THREE.Color(palette[i % palette.length]),
      };
      this.vortexData.push(p);
      this.vortexPos[i * 3] = ALTAR_CENTER_X + Math.cos(p.angle) * p.radius;
      this.vortexPos[i * 3 + 1] = p.baseY;
      this.vortexPos[i * 3 + 2] = ALTAR_CENTER_Z + Math.sin(p.angle) * p.radius * 0.76;
      this.vortexCol[i * 3] = p.tint.r;
      this.vortexCol[i * 3 + 1] = p.tint.g;
      this.vortexCol[i * 3 + 2] = p.tint.b;
    }

    this.vortexGeo.setAttribute('position', new THREE.BufferAttribute(this.vortexPos, 3));
    this.vortexGeo.setAttribute('color', new THREE.BufferAttribute(this.vortexCol, 3));
    const vortexPoints = new THREE.Points(
      this.vortexGeo,
      new THREE.PointsMaterial({
        size: 0.34,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        ...(tex ? { map: tex } : {}),
      })
    );
    this.group.add(vortexPoints);

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparks.push({
        alive: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        color: new THREE.Color(0xffffff),
      });
      this.sparkPos[i * 3 + 1] = -999;
    }
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3));
    const sparkPoints = new THREE.Points(
      this.sparkGeo,
      new THREE.PointsMaterial({
        size: 0.42,
        vertexColors: true,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        ...(tex ? { map: tex } : {}),
      })
    );
    this.group.add(sparkPoints);

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.18, 36), this.shockwaveMat);
    this.shockwaveRing.rotation.x = -Math.PI / 2;
    this.shockwaveRing.visible = false;
    this.group.add(this.shockwaveRing);
  }

  public spawnNeedleTrail(tipX: number, tipY: number, tipZ: number, hexColor: string, count = 4): void {
    this.tmpColor.set(hexColor);
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount;
      s.alive = true;
      s.life = 0;
      s.maxLife = 0.42 + Math.random() * 0.35;
      s.x = tipX + (Math.random() - 0.5) * 0.28;
      s.y = tipY + (Math.random() - 0.5) * 0.22;
      s.z = tipZ + (Math.random() - 0.5) * 0.28;
      s.vx = (Math.random() - 0.5) * 1.4;
      s.vy = 0.8 + Math.random() * 1.8;
      s.vz = (Math.random() - 0.5) * 1.4;
      s.color.copy(this.tmpColor).lerp(new THREE.Color(0xffffff), Math.random() * 0.4);
    }
  }

  public spawnBurst(x: number, y: number, z: number, hexColor: string, count = 24, speedScale = 1): void {
    this.tmpColor.set(hexColor);
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount;
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.4 + Math.random() * 3.2) * speedScale;
      s.alive = true;
      s.life = 0;
      s.maxLife = 0.55 + Math.random() * 0.55;
      s.x = x + (Math.random() - 0.5) * 0.3;
      s.y = y + Math.random() * 0.25;
      s.z = z + (Math.random() - 0.5) * 0.3;
      s.vx = Math.cos(ang) * spd;
      s.vy = (1.8 + Math.random() * 3.4) * speedScale;
      s.vz = Math.sin(ang) * spd;
      s.color.copy(this.tmpColor).lerp(new THREE.Color(0xfef08a), Math.random() * 0.45);
    }
  }

  public triggerWinShockwave(x: number, y: number, z: number, hexColor: string): void {
    this.shockwaveRing.position.set(x, y + 0.14, z);
    this.shockwaveRing.scale.setScalar(1);
    this.shockwaveMat.color.set(hexColor);
    this.shockwaveMat.opacity = 0.95;
    this.shockwaveRing.visible = true;
    this.shockwaveTimer = this.shockwaveDuration;
  }

  public update(dt: number, elapsed: number, spinRatio: number, activeHex?: string): void {
    const safeDt = Math.min(dt, 0.05);
    const swirlBoost = 1 + spinRatio * 5.8;
    const accent = activeHex ? this.tmpColor.set(activeHex) : null;

    for (let i = 0; i < this.vortexCount; i++) {
      const p = this.vortexData[i];
      p.angle += p.speed * swirlBoost * safeDt;
      const radialPull = spinRatio > 0 ? 1 - spinRatio * 0.14 * Math.sin(elapsed * 5 + p.phase) : 1;
      const r = p.radius * radialPull;
      const x = ALTAR_CENTER_X + Math.cos(p.angle) * r;
      const z = ALTAR_CENTER_Z + Math.sin(p.angle) * r * 0.76;
      const y = p.baseY + Math.sin(elapsed * 2.1 + p.phase) * p.yAmp + spinRatio * 0.55;

      this.vortexPos[i * 3] = x;
      this.vortexPos[i * 3 + 1] = y;
      this.vortexPos[i * 3 + 2] = z;

      if (accent && i % 3 === 0) {
        const mix = 0.35 + spinRatio * 0.55;
        this.vortexCol[i * 3] = THREE.MathUtils.lerp(p.tint.r, accent.r, mix);
        this.vortexCol[i * 3 + 1] = THREE.MathUtils.lerp(p.tint.g, accent.g, mix);
        this.vortexCol[i * 3 + 2] = THREE.MathUtils.lerp(p.tint.b, accent.b, mix);
      } else {
        this.vortexCol[i * 3] = p.tint.r;
        this.vortexCol[i * 3 + 1] = p.tint.g;
        this.vortexCol[i * 3 + 2] = p.tint.b;
      }
    }
    (this.vortexGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.vortexGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    for (let i = 0; i < this.sparkCount; i++) {
      const s = this.sparks[i];
      if (!s.alive) continue;
      s.life += safeDt;
      if (s.life >= s.maxLife) {
        s.alive = false;
        this.sparkPos[i * 3 + 1] = -999;
        continue;
      }
      const fade = 1 - s.life / s.maxLife;
      s.vy -= 2.6 * safeDt;
      s.x += s.vx * safeDt;
      s.y += s.vy * safeDt;
      s.z += s.vz * safeDt;

      this.sparkPos[i * 3] = s.x;
      this.sparkPos[i * 3 + 1] = s.y;
      this.sparkPos[i * 3 + 2] = s.z;
      this.sparkCol[i * 3] = s.color.r * fade;
      this.sparkCol[i * 3 + 1] = s.color.g * fade;
      this.sparkCol[i * 3 + 2] = s.color.b * fade;
    }
    (this.sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer = Math.max(0, this.shockwaveTimer - safeDt);
      const t = 1 - this.shockwaveTimer / this.shockwaveDuration;
      this.shockwaveRing.scale.setScalar(1 + t * 2.1);
      this.shockwaveMat.opacity = (1 - t) * 0.92;
      if (this.shockwaveTimer === 0) {
        this.shockwaveRing.visible = false;
      }
    }
  }
}
