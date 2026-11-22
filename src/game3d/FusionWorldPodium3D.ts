import * as THREE from 'three';
import {
  createChamferSlabGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';
import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotPedestal3D';

export interface FusionPodiumBuildCtx {
  armorDarkMat: THREE.MeshStandardMaterial;
  armorSteelMat: THREE.MeshStandardMaterial;
  brightSteelMat: THREE.MeshStandardMaterial;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedTextures: THREE.Texture[];
}

export interface CyberShowcasePodiumHandle {
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  holoDiscMat: THREE.MeshBasicMaterial;
  sigilMesh: THREE.Mesh;
  sigilMat: THREE.MeshBasicMaterial;
  auraVeilMat: THREE.ShaderMaterial;
  auraOuterVeilMat: THREE.ShaderMaterial;
  particleMat: THREE.ShaderMaterial;
  auraGroup: THREE.Group;
  setLowQuality: (low: boolean) => void;
  topY: number;
}

export function createChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.015
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel);
}

function createPodiumPlaqueTexture(label: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
  ctx.fillRect(8, 12, 6, 24);
  ctx.fillRect(c.width - 14, 12, 6, 24);
  ctx.fillStyle = '#f0f9ff';
  ctx.font = '900 20px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width * 0.5, c.height * 0.52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
/**
 * Expanded 3D Outer-Space Cyber-Synchro Fusion World:
 * - Massive 23m-wide multi-tiered octagonal cyber arena deck with Cyan & Magenta neon floor trims,
 *   17.2m cyber-magic circuit sigil, elevated rear Cyber-Holographic Showcase Stage (modeled after Mining),
 *   and 6 perimeter mechanical tech/crystal towers.
 * - ZZZ/HSR Cyber-Showcase Podiums (chamfered dock bay, side bumper guards + cooling louvers, stepped titanium
 *   dais, front numeric/APEX apron plaque, waist-high rear projector stanchions, frosted holo lens, corner
 *   claws/diodes, Dual-Shell Anime-RPG Aura & GPU star-ember wisps from `PlotPedestal3D.ts`).
 * - Front Crescent Arc 2-3 material podiums + gigantic rear Triple-Ring "Synchro Portal" + grooved floor
 *   energy conduits with dynamic readiness status colors.
 * - 4 physical recipe Ore Crystal Clusters, 8 floating cosmic islands, skyward Light Beam, 2 Alchemist/Scientist
 *   NPCs with speech bubbles, blue hologram preview for missing units, and 3-phase Fusion animation.
 */

export function createCyberShowcasePodium(
  ctx: FusionPodiumBuildCtx,
  plaqueLabel: string,
  scale = 1,
  withDualAuraShells = false
): CyberShowcasePodiumHandle {
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#22d3ee',
    emissiveIntensity: 1.0,
    roughness: 0.22,
    metalness: 0.3,
    flatShading: true,
  });
  ctx.ownedMats.push(ringMat);
  // Tier 1: Wide Chamfered Composite Display Bay Foundation + Lateral Cooling Fins
  const bayDockGeo = createChamferPadGeometry(1.94, 0.088, 1.78, 0.28, 0.016);
  const guardGeo = createChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
  const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
  const edgeSeamGeo = new THREE.CylinderGeometry(0.79, 0.81, 0.024, 8);
  const plinthGeo = new THREE.CylinderGeometry(0.68, 0.78, 0.128, 8);
  const topRimGeo = new THREE.CylinderGeometry(0.63, 0.69, 0.036, 8);
  const frontApronGeo = createChamferPadGeometry(0.58, 0.095, 0.24, 0.05, 0.012);
  const plaqueFaceGeo = new THREE.PlaneGeometry(0.44, 0.16);
  const rearManifoldGeo = createChamferPadGeometry(1.18, 0.18, 0.26, 0.08, 0.014);
  const manifoldGlowGeo = createChamferPadGeometry(0.84, 0.035, 0.06, 0.01, 0.006);
  const stanchionGeo = createChamferPadGeometry(0.14, 0.56, 0.18, 0.03, 0.012);
  const stanchionCapGeo = createChamferPadGeometry(0.18, 0.06, 0.22, 0.04, 0.01);
  const stanchionBladeGeo = new THREE.BoxGeometry(0.035, 0.44, 0.045);
  const ringTorusGeo = new THREE.TorusGeometry(0.59, 0.025, 6, 8);
  const clawGeo = new THREE.CylinderGeometry(0.04, 0.056, 0.072, 6);
  const diodeGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.028, 6);
  ctx.ownedGeos.push(
    bayDockGeo,
    guardGeo,
    ventGeo,
    edgeSeamGeo,
    plinthGeo,
    topRimGeo,
    frontApronGeo,
    plaqueFaceGeo,
    rearManifoldGeo,
    manifoldGlowGeo,
    stanchionGeo,
    stanchionCapGeo,
    stanchionBladeGeo,
    ringTorusGeo,
    clawGeo,
    diodeGeo
  );
  const bayDock = new THREE.Mesh(bayDockGeo, ctx.armorDarkMat);
  bayDock.receiveShadow = true;
  bayDock.castShadow = true;
  group.add(bayDock);
  for (const sx of [-1, 1]) {
    const guard = new THREE.Mesh(guardGeo, ctx.armorSteelMat);
    guard.position.set(sx * 0.92, 0.055, -0.02);
    guard.castShadow = true;
    guard.receiveShadow = true;
    group.add(guard);
    for (const vz of [-0.32, 0, 0.32]) {
      const vent = new THREE.Mesh(ventGeo, ctx.brightSteelMat);
      vent.position.set(sx * 0.995, 0.105, vz);
      group.add(vent);
    }
  }
  // Recessed Edge-Lit Acrylic Seam Strip
  const edgeSeamRing = new THREE.Mesh(edgeSeamGeo, ringMat);
  edgeSeamRing.position.y = 0.1;
  edgeSeamRing.rotation.y = Math.PI / 8;
  // Tier 2: Stepped Octagonal Machinery Dais + Brushed Titanium Collar
  const machineryPlinth = new THREE.Mesh(plinthGeo, ctx.armorSteelMat);
  machineryPlinth.position.y = 0.176;
  machineryPlinth.rotation.y = Math.PI / 8;
  machineryPlinth.receiveShadow = true;
  machineryPlinth.castShadow = true;
  const topBevelRim = new THREE.Mesh(topRimGeo, ctx.brightSteelMat);
  topBevelRim.position.y = 0.256;
  topBevelRim.rotation.y = Math.PI / 8;
  topBevelRim.receiveShadow = true;
  group.add(edgeSeamRing, machineryPlinth, topBevelRim);
  // Tier 3: Sleek Front-Angled Slot Plaque ("01".."03" or "APEX") Mounted Proud on Forward Apron
  const frontApron = new THREE.Mesh(frontApronGeo, ctx.brightSteelMat);
  frontApron.position.set(0, 0.02, 0.84);
  frontApron.rotation.x = 0.34;
  frontApron.castShadow = true;
  const plaqueTex = createPodiumPlaqueTexture(plaqueLabel);
  if (plaqueTex) ctx.ownedTextures.push(plaqueTex);
  const plaqueMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    ...(plaqueTex ? { map: plaqueTex } : { color: 0x0f172a }),
  });
  ctx.ownedMats.push(plaqueMat);
  const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueMat);
  plaqueFace.position.set(0, 0.099, 0);
  plaqueFace.rotation.x = -Math.PI / 2;
  frontApron.add(plaqueFace);
  group.add(frontApron);
  // Tier 4: ZZZ/HSR Low-Profile Rear Holographic Display Stanchions & Power Manifold
  const rearManifold = new THREE.Mesh(rearManifoldGeo, ctx.armorDarkMat);
  rearManifold.position.set(0, 0.04, -0.78);
  rearManifold.castShadow = true;
  rearManifold.receiveShadow = true;
  const manifoldGlow = new THREE.Mesh(manifoldGlowGeo, ringMat);
  manifoldGlow.position.set(0, 0.22, -0.78);
  group.add(rearManifold, manifoldGlow);
  for (const sx of [-1, 1]) {
    const pylonPivot = new THREE.Group();
    pylonPivot.position.set(sx * 0.76, 0.08, -0.68);
    pylonPivot.rotation.z = -sx * 0.12;
    pylonPivot.rotation.x = 0.08;
    const body = new THREE.Mesh(stanchionGeo, ctx.armorSteelMat);
    body.castShadow = true;
    body.receiveShadow = true;
    const cap = new THREE.Mesh(stanchionCapGeo, ctx.brightSteelMat);
    cap.position.y = 0.56;
    cap.castShadow = true;
    const glowBlade = new THREE.Mesh(stanchionBladeGeo, ringMat);
    glowBlade.position.set(-sx * 0.072, 0.28, 0.045);
    pylonPivot.add(body, cap, glowBlade);
    group.add(pylonPivot);
  }
  // Core Frosted Emitter Lens & Recessed Octagonal Neon Collar + 4 Corner Claws & Diodes
  const pedHoloTex = getPedestalHoloRingTexture();
  const holoDiscMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    ...(pedHoloTex ? { map: pedHoloTex } : {}),
    transparent: true,
    opacity: pedHoloTex ? 0.78 : 0.38,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  ctx.ownedMats.push(holoDiscMat);
  const holoLensGeo = pedHoloTex
    ? new THREE.PlaneGeometry(1.18, 1.18)
    : new THREE.RingGeometry(0.24, 0.54, 24);
  ctx.ownedGeos.push(holoLensGeo);
  const holoLensDisc = new THREE.Mesh(holoLensGeo, holoDiscMat);
  holoLensDisc.rotation.x = -Math.PI / 2;
  holoLensDisc.position.y = 0.282;
  holoLensDisc.renderOrder = 2;
  const ringMesh = new THREE.Mesh(ringTorusGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.rotation.z = Math.PI / 8;
  ringMesh.position.y = 0.286;
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2;
    const rx = Math.cos(ang) * 0.635;
    const rz = Math.sin(ang) * 0.635;
    const claw = new THREE.Mesh(clawGeo, ctx.brightSteelMat);
    claw.position.set(rx, 0.254, rz);
    claw.castShadow = true;
    const diode = new THREE.Mesh(diodeGeo, ringMat);
    diode.position.set(rx, 0.295, rz);
    group.add(claw, diode);
  }
  group.add(holoLensDisc, ringMesh);
  // Tier 5: Anime-RPG Ground Sigil + Dual-Shell Fresnel Rim Aura + GPU Star-Ember Particles
  const auraGroup = new THREE.Group();
  const sigilTex = getEnchantSigilTexture();
  const sigilMat = new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    ...(sigilTex ? { map: sigilTex } : {}),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: sigilTex ? 0.64 : 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const sigilGeo = sigilTex
    ? new THREE.PlaneGeometry(1.96, 1.96)
    : new THREE.RingGeometry(0.58, 0.84, 32);
  ctx.ownedGeos.push(sigilGeo);
  ctx.ownedMats.push(sigilMat);
  const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
  sigilMesh.rotation.x = -Math.PI / 2;
  sigilMesh.position.y = 0.298;
  sigilMesh.renderOrder = 3;
  auraGroup.add(sigilMesh);
  const auraVeilMat = createAnimeAuraShaderMaterial('#22d3ee', '#d946ef', withDualAuraShells ? 0.72 : 0.36);
  const auraOuterVeilMat = createAnimeAuraShaderMaterial('#d946ef', '#22d3ee', withDualAuraShells ? 0.42 : 0.2);
  const veilGeo1 = new THREE.CylinderGeometry(0.76, 0.58, 1.62, 28, 1, true);
  const veilGeo2 = new THREE.CylinderGeometry(0.9, 0.64, 1.7, 28, 1, true);
  ctx.ownedGeos.push(veilGeo1, veilGeo2);
  ctx.ownedMats.push(auraVeilMat, auraOuterVeilMat);
  const auraVeil = new THREE.Mesh(veilGeo1, auraVeilMat);
  auraVeil.position.y = 1.06;
  const outerAuraVeil = new THREE.Mesh(veilGeo2, auraOuterVeilMat);
  outerAuraVeil.position.y = 1.1;
  auraGroup.add(auraVeil, outerAuraVeil);
  const particles = createAnimeParticlePoints('#22d3ee', '#d946ef', {
    count: withDualAuraShells ? 38 : 24,
    minRadius: 0.44,
    maxRadius: 0.78,
    baseY: 0.28,
    sizeScale: scale,
  });
  ctx.ownedGeos.push(particles.geo);
  ctx.ownedMats.push(particles.mat);
  auraGroup.add(particles.points);
  group.add(auraGroup);
  return {
    group,
    ringMat,
    holoDiscMat,
    sigilMesh,
    sigilMat,
    auraVeilMat,
    auraOuterVeilMat,
    particleMat: particles.mat,
    auraGroup,
    setLowQuality: (low: boolean) => {
      auraVeil.visible = !low;
      outerAuraVeil.visible = !low;
      particles.points.visible = !low;
    },
    topY: 0.285 * scale,
  };
}

/**
 * Builds a Clean-Tech Cylindrical Stasis Tube Podium tailored for the Secret Lab Bunker:
 * - Stepped LatheGeometry hydraulic circular base + radial clamp lugs + glowing fluid seam ring
 * - Open-front 230-degree curved glass containment sleeve (130-degree clear front camera window)
 * - 2 rear brushed-titanium hydraulic stanchions + overhead circular cryo-crown & emitter ring
 */
export function createLabTubePodium(
  ctx: FusionPodiumBuildCtx,
  _plaqueLabel: string,
  scale = 1,
  withDualAuraShells = false
): CyberShowcasePodiumHandle {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const ringMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#22d3ee',
    emissiveIntensity: 1.05,
    roughness: 0.22,
    metalness: 0.3,
    flatShading: true,
  });
  const glassArcMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.1,
    metalness: 0.16,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ctx.ownedMats.push(ringMat, glassArcMat);

  // 1. Stepped Circular Hydraulic Pod Base (closed solid top & bottom, zero front plate)
  const baseGeo = createLatheProfileGeometry(
    [
      [0.01, 0],
      [0.98, 0],
      [0.98, 0.08],
      [0.88, 0.13],
      [0.84, 0.21],
      [0.72, 0.26],
      [0.66, 0.285],
      [0.01, 0.285],
    ],
    24
  );
  const seamRingGeo = new THREE.TorusGeometry(0.79, 0.026, 8, 28);
  const topRimRingGeo = new THREE.TorusGeometry(0.66, 0.024, 8, 28);
  const lugGeo = createChamferSlabGeometry(0.16, 0.14, 0.18, 0.04, 0.01);
  // 2. Open-Front Curved Glass Stasis Sleeve (230 deg rear/side arc, 130 deg clear front window)
  const tubeH = 2.48;
  const glassArcGeo = new THREE.CylinderGeometry(
    0.73,
    0.73,
    tubeH,
    24,
    1,
    true,
    Math.PI * 0.36,
    Math.PI * 1.28
  );
  // 3. Rear Hydraulic Stanchions + Overhead Circular Cryo-Crown
  const stanchionGeo = new THREE.CylinderGeometry(0.055, 0.072, tubeH + 0.16, 8);
  const stanchionJointGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.16, 8);
  const crownCapGeo = createLatheProfileGeometry(
    [
      [0.01, 0],
      [0.86, 0],
      [0.86, 0.11],
      [0.78, 0.2],
      [0.48, 0.28],
      [0.01, 0.3],
    ],
    24
  );
  const crownHubGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.1, 16);
  const crownGlowGeo = new THREE.TorusGeometry(0.68, 0.024, 8, 28);
  ctx.ownedGeos.push(
    baseGeo,
    seamRingGeo,
    topRimRingGeo,
    lugGeo,
    glassArcGeo,
    stanchionGeo,
    stanchionJointGeo,
    crownCapGeo,
    crownHubGeo,
    crownGlowGeo
  );

  const baseMesh = new THREE.Mesh(baseGeo, ctx.armorSteelMat);
  enableShadows(baseMesh, true, true);
  const seamRing = new THREE.Mesh(seamRingGeo, ringMat);
  seamRing.rotation.x = Math.PI / 2;
  seamRing.position.y = 0.16;
  const topRimRing = new THREE.Mesh(topRimRingGeo, ringMat);
  topRimRing.rotation.x = Math.PI / 2;
  topRimRing.position.y = 0.286;
  group.add(baseMesh, seamRing, topRimRing);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const lug = new THREE.Mesh(lugGeo, ctx.armorDarkMat);
    lug.position.set(Math.sin(a) * 0.86, 0.02, Math.cos(a) * 0.86);
    lug.rotation.y = a;
    enableShadows(lug, true, true);
    group.add(lug);
  }

  const glassArc = new THREE.Mesh(glassArcGeo, glassArcMat);
  glassArc.position.y = 0.285 + tubeH * 0.5;
  glassArc.renderOrder = 2;
  group.add(glassArc);

  for (const sx of [-1, 1]) {
    const angle = sx * (Math.PI * 0.72);
    const rx = Math.sin(angle) * 0.78;
    const rz = Math.cos(angle) * 0.78;
    const stanchion = new THREE.Mesh(stanchionGeo, ctx.brightSteelMat);
    stanchion.position.set(rx, 0.2 + (tubeH + 0.16) * 0.5, rz);
    stanchion.castShadow = true;
    const botJoint = new THREE.Mesh(stanchionJointGeo, ctx.armorDarkMat);
    botJoint.position.set(rx, 0.24, rz);
    const topJoint = new THREE.Mesh(stanchionJointGeo, ctx.armorDarkMat);
    topJoint.position.set(rx, 0.285 + tubeH, rz);
    group.add(stanchion, botJoint, topJoint);
  }

  const crownCap = new THREE.Mesh(crownCapGeo, ctx.armorSteelMat);
  crownCap.position.y = 0.285 + tubeH - 0.02;
  enableShadows(crownCap, true, true);
  const crownHub = new THREE.Mesh(crownHubGeo, ctx.armorDarkMat);
  crownHub.position.y = 0.285 + tubeH + 0.31;
  enableShadows(crownHub, true, true);
  const crownGlow = new THREE.Mesh(crownGlowGeo, ringMat);
  crownGlow.rotation.x = Math.PI / 2;
  crownGlow.position.y = 0.285 + tubeH - 0.02;
  group.add(crownCap, crownHub, crownGlow);

  // Floor holo emitter lens + ground sigil + subtle cryo aura
  const pedHoloTex = getPedestalHoloRingTexture();
  const holoDiscMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    ...(pedHoloTex ? { map: pedHoloTex } : {}),
    transparent: true,
    opacity: pedHoloTex ? 0.74 : 0.36,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  ctx.ownedMats.push(holoDiscMat);
  const holoLensGeo = pedHoloTex
    ? new THREE.PlaneGeometry(1.18, 1.18)
    : new THREE.RingGeometry(0.24, 0.54, 24);
  ctx.ownedGeos.push(holoLensGeo);
  const holoLensDisc = new THREE.Mesh(holoLensGeo, holoDiscMat);
  holoLensDisc.rotation.x = -Math.PI / 2;
  holoLensDisc.position.y = 0.294;
  holoLensDisc.renderOrder = 2;
  group.add(holoLensDisc);

  const auraGroup = new THREE.Group();
  const sigilTex = getEnchantSigilTexture();
  const sigilMat = new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    ...(sigilTex ? { map: sigilTex } : {}),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: sigilTex ? 0.58 : 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const sigilGeo = sigilTex
    ? new THREE.PlaneGeometry(1.88, 1.88)
    : new THREE.RingGeometry(0.56, 0.8, 32);
  ctx.ownedGeos.push(sigilGeo);
  ctx.ownedMats.push(sigilMat);
  const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
  sigilMesh.rotation.x = -Math.PI / 2;
  sigilMesh.position.y = 0.304;
  sigilMesh.renderOrder = 3;
  auraGroup.add(sigilMesh);

  const auraVeilMat = createAnimeAuraShaderMaterial('#22d3ee', '#d946ef', withDualAuraShells ? 0.34 : 0.16);
  const auraOuterVeilMat = createAnimeAuraShaderMaterial('#d946ef', '#22d3ee', withDualAuraShells ? 0.2 : 0.08);
  const veilGeo1 = new THREE.CylinderGeometry(0.64, 0.54, 1.5, 24, 1, true);
  const veilGeo2 = new THREE.CylinderGeometry(0.7, 0.58, 1.56, 24, 1, true);
  ctx.ownedGeos.push(veilGeo1, veilGeo2);
  ctx.ownedMats.push(auraVeilMat, auraOuterVeilMat);
  const auraVeil = new THREE.Mesh(veilGeo1, auraVeilMat);
  auraVeil.position.y = 1.04;
  const outerAuraVeil = new THREE.Mesh(veilGeo2, auraOuterVeilMat);
  outerAuraVeil.position.y = 1.08;
  auraGroup.add(auraVeil, outerAuraVeil);

  const particles = createAnimeParticlePoints('#22d3ee', '#d946ef', {
    count: withDualAuraShells ? 32 : 20,
    minRadius: 0.4,
    maxRadius: 0.66,
    baseY: 0.28,
    sizeScale: scale,
  });
  ctx.ownedGeos.push(particles.geo);
  ctx.ownedMats.push(particles.mat);
  auraGroup.add(particles.points);
  group.add(auraGroup);

  return {
    group,
    ringMat,
    holoDiscMat,
    sigilMesh,
    sigilMat,
    auraVeilMat,
    auraOuterVeilMat,
    particleMat: particles.mat,
    auraGroup,
    setLowQuality: (low: boolean) => {
      auraVeil.visible = !low;
      outerAuraVeil.visible = !low;
      particles.points.visible = !low;
    },
    topY: 0.285 * scale,
  };
}
