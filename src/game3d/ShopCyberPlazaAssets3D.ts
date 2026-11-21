import * as THREE from 'three';
import { createCyberMonolithForkFinial } from './CyberProps3D';
import {
  createCyberShowcasePodium,
  type CyberShowcasePodiumHandle,
  type FusionPodiumBuildCtx,
} from './FusionWorldPodium3D';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';
import { getEnchantSigilTexture, getPedestalHoloRingTexture } from './PlotAuraFx3D';

export interface PlazaTowerBuildContext {
  animatedRings: THREE.Object3D[];
  towerRibMat: THREE.MeshStandardMaterial;
  towerPanelMat: THREE.MeshStandardMaterial;
  slateConcreteMat: THREE.MeshStandardMaterial;
  gunmetalMat: THREE.MeshStandardMaterial;
  containerDarkMat: THREE.MeshStandardMaterial;
  brushedSteelMat: THREE.MeshStandardMaterial;
  cyanNeonMat: THREE.MeshStandardMaterial;
  violetNeonMat: THREE.MeshStandardMaterial;
  blueNeonMat: THREE.MeshStandardMaterial;
  magentaNeonMat: THREE.MeshStandardMaterial;
}

export function createCyberPlazaFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#31435e';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alt = (x / step + y / step) % 2 === 0;
      ctx.fillStyle = alt ? '#3a4f6e' : '#2f4059';
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
      if (((x * 3 + y * 5) / step) % 5 === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.fillRect(x + 8, y + 8, 8, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  tex.needsUpdate = true;
  return tex;
}

export function createHologramSignTexture(
  title: string,
  subtitle: string,
  accentHex: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(8, 15, 32, 0.94)';
  ctx.fillRect(0, 0, 256, 96);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  for (let y = 0; y < 96; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);

  ctx.fillStyle = accentHex;
  ctx.fillRect(12, 14, 6, 68);
  ctx.fillRect(238, 14, 6, 68);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(title, 128, 36);

  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = accentHex;
  ctx.fillText(subtitle, 128, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Creates a radial contact-shadow gradient texture around a circular curb perimeter. */
export function createRoundaboutShadowTexture(innerFrac: number, outerFrac: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const mid = size * 0.5;
  const grad = ctx.createRadialGradient(mid, mid, mid * innerFrac, mid, mid, mid * outerFrac);
  grad.addColorStop(0.0, 'rgba(2, 6, 15, 0.82)');
  grad.addColorStop(0.32, 'rgba(2, 6, 15, 0.56)');
  grad.addColorStop(0.68, 'rgba(2, 6, 15, 0.22)');
  grad.addColorStop(1.0, 'rgba(2, 6, 15, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the northern Gem Tower Cyberpunk Skyscraper, staircase, access terminals,
 * obelisk pylons, and instanced window grids for ShopCyberPlaza3D.
 */
export function buildPlazaGemTowerSkyscraper(ctx: PlazaTowerBuildContext): THREE.Group {
  const {
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
  } = ctx;
  const towerGroup = new THREE.Group();
  const dummy = new THREE.Object3D();

  const terraceSkirt = new THREE.Mesh(createChamferSlabGeometry(13.75, 0.22, 9.15, 0.88, 0.02), containerDarkMat);
  terraceSkirt.position.set(0, 0.06, -11.4);
  terraceSkirt.receiveShadow = true;

  const lowerTerrace = new THREE.Mesh(createChamferSlabGeometry(13.4, 0.68, 8.8, 0.85, 0.03), towerRibMat);
  lowerTerrace.position.set(0, 0.0, -11.4);
  lowerTerrace.receiveShadow = true;

  const lowerNeon = new THREE.Mesh(createChamferSlabGeometry(13.65, 0.06, 9.05, 0.85, 0.008), violetNeonMat);
  lowerNeon.position.set(0, 0.68, -11.4);

  const upperTerrace = new THREE.Mesh(createChamferSlabGeometry(12.5, 0.62, 8.1, 0.75, 0.03), towerPanelMat);
  upperTerrace.position.set(0, 0.74, -11.4);
  upperTerrace.receiveShadow = true;

  const upperNeon = new THREE.Mesh(createChamferSlabGeometry(12.75, 0.06, 8.35, 0.75, 0.008), cyanNeonMat);
  upperNeon.position.set(0, 1.36, -11.4);

  const upperDeckCap = new THREE.Mesh(createChamferSlabGeometry(12.3, 0.04, 7.9, 0.72, 0.015), slateConcreteMat);
  upperDeckCap.position.set(0, 1.42, -11.4);
  upperDeckCap.receiveShadow = true;

  const terraceTopY = 1.45;
  towerGroup.add(terraceSkirt, lowerTerrace, lowerNeon, upperTerrace, upperNeon, upperDeckCap);

  // Futuristic Cyber Staircase
  const stairSteps = 6;
  for (let s = 0; s < stairSteps; s++) {
    const sy = 0.14 + s * 0.21;
    const sz = -5.75 - s * 0.28;
    const step = new THREE.Mesh(createChamferSlabGeometry(3.2, 0.22, 0.34, 0.04, 0.012), gunmetalMat);
    step.position.set(0, sy, sz);
    const stepLed = new THREE.Mesh(createChamferSlabGeometry(3.0, 0.03, 0.05, 0.01, 0.004), cyanNeonMat);
    stepLed.position.set(0, sy + 0.2, sz + 0.14);
    enableShadows(step);
    towerGroup.add(step, stepLed);
  }
  for (const sx of [-1.72, 1.72]) {
    const railPost = new THREE.Mesh(createChamferSlabGeometry(0.28, 1.45, 0.36, 0.06, 0.015), towerRibMat);
    railPost.position.set(sx, 0.14, -5.8);
    const railGlow = new THREE.Mesh(createChamferSlabGeometry(0.12, 0.12, 2.1, 0.03, 0.008), cyanNeonMat);
    railGlow.position.set(sx, 1.35, -6.45);
    railGlow.rotation.x = 0.58;
    enableShadows(railPost);
    towerGroup.add(railPost, railGlow);
  }

  // Twin Futuristic Holographic Access Terminals in front of Terrace
  for (const tx of [-3.35, 3.35]) {
    const term = new THREE.Group();
    term.position.set(tx, 0.14, -6.2);
    term.rotation.y = tx < 0 ? 0.25 : -0.25;

    const base = new THREE.Mesh(createChamferSlabGeometry(1.15, 1.08, 0.72, 0.1, 0.018), towerRibMat);
    const holoScreen = new THREE.Mesh(createChamferSlabGeometry(0.95, 0.68, 0.08, 0.05, 0.01), cyanNeonMat);
    holoScreen.position.set(0, 1.38, 0.05);
    holoScreen.rotation.x = -0.22;
    const sideFin = new THREE.Mesh(createChamferSlabGeometry(0.14, 1.35, 0.45, 0.04, 0.01), violetNeonMat);
    sideFin.position.set(tx < 0 ? -0.55 : 0.55, 0.25, 0);

    enableShadows(base);
    term.add(base, holoScreen, sideFin);
    towerGroup.add(term);
  }

  // Flanking Cyber Data Obelisk Pylons
  for (const sx of [-4.9, 4.9]) {
    const ob = new THREE.Group();
    ob.position.set(sx, terraceTopY, -14.1);
    const plinth = new THREE.Mesh(createChamferSlabGeometry(1.2, 0.36, 1.2, 0.18, 0.02), gunmetalMat);
    const shaft = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.44, 0.36],
          [0.32, 1.5],
          [0.24, 2.45],
          [0.36, 2.6],
        ],
        6
      ),
      towerPanelMat
    );
    const obRingGeo = new THREE.TorusGeometry(0.42, 0.038, 6, 16);
    obRingGeo.rotateX(Math.PI / 2);
    const obRing = new THREE.Mesh(obRingGeo, violetNeonMat);
    obRing.position.y = 2.65;
    animatedRings.push(obRing);

    const crystal = createCyberMonolithForkFinial({
      frameMat: towerRibMat,
      steelMat: brushedSteelMat,
      coreMat: magentaNeonMat,
      scale: 1.2,
    });
    crystal.position.y = 2.58;

    enableShadows(plinth);
    enableShadows(shaft);
    ob.add(plinth, shaft, obRing, crystal);
    towerGroup.add(ob);
  }

  // Central Cyberpunk Skyscraper Tower (2x taller: apex y ≈ 15.06 above plaza deck)
  const centralTower = new THREE.Group();
  centralTower.position.set(0, terraceTopY, -11.4);
  towerGroup.add(centralTower);

  const tier1BasePlinth = new THREE.Mesh(createChamferSlabGeometry(3.74, 0.22, 3.34, 0.68, 0.02), containerDarkMat);
  tier1BasePlinth.position.y = -0.02;
  const tier1BaseTrim = new THREE.Mesh(createChamferSlabGeometry(3.8, 0.05, 3.4, 0.68, 0.01), gunmetalMat);
  tier1BaseTrim.position.y = 0.18;
  enableShadows(tier1BasePlinth);
  centralTower.add(tier1BasePlinth, tier1BaseTrim);

  const tier1 = new THREE.Mesh(createChamferSlabGeometry(3.55, 4.1, 3.25, 0.65, 0.04), towerPanelMat);
  const tier2 = new THREE.Mesh(createChamferSlabGeometry(2.85, 4.3, 2.6, 0.55, 0.04), containerDarkMat);
  tier2.position.y = 4.05;
  const tier3 = new THREE.Mesh(createChamferSlabGeometry(2.0, 2.95, 1.9, 0.4, 0.03), towerPanelMat);
  tier3.position.y = 8.3;
  const spireCap = new THREE.Mesh(createChamferSlabGeometry(1.25, 0.9, 1.25, 0.25, 0.02), gunmetalMat);
  spireCap.position.y = 11.2;

  // Tier 1 Corner Buttress Piers (y = 0..4.10) + Tier 2 Stepped Corner Ribs (y = 4.05..8.30)
  for (const [rx, rz] of [
    [-1.62, 1.44],
    [1.62, 1.44],
    [-1.62, -1.44],
    [1.62, -1.44],
  ]) {
    const t1Rib = new THREE.Mesh(createChamferSlabGeometry(0.28, 4.15, 0.28, 0.06, 0.014), towerRibMat);
    t1Rib.position.set(rx, 0, rz);
    const t1Strip = new THREE.Mesh(
      createChamferSlabGeometry(0.09, 3.85, 0.09, 0.02, 0.008),
      rx < 0 ? cyanNeonMat : violetNeonMat
    );
    t1Strip.position.set(rx * 1.05, 0.16, rz * 1.05);
    const t1Cap = new THREE.Mesh(createChamferSlabGeometry(0.34, 0.14, 0.34, 0.07, 0.012), brushedSteelMat);
    t1Cap.position.set(rx, 4.15, rz);
    enableShadows(t1Rib);
    centralTower.add(t1Rib, t1Strip, t1Cap);
  }
  for (const [rx, rz] of [
    [-1.32, 1.2],
    [1.32, 1.2],
    [-1.32, -1.2],
    [1.32, -1.2],
  ]) {
    const t2Rib = new THREE.Mesh(createChamferSlabGeometry(0.24, 4.25, 0.24, 0.05, 0.012), towerRibMat);
    t2Rib.position.set(rx, 4.05, rz);
    const t2Strip = new THREE.Mesh(
      createChamferSlabGeometry(0.08, 3.95, 0.08, 0.02, 0.007),
      rx < 0 ? cyanNeonMat : violetNeonMat
    );
    t2Strip.position.set(rx * 1.05, 4.2, rz * 1.05);
    enableShadows(t2Rib);
    centralTower.add(t2Rib, t2Strip);
  }

  const crownHaloGeo = new THREE.TorusGeometry(1.48, 0.055, 6, 28);
  crownHaloGeo.rotateX(Math.PI / 2);
  const crownHalo = new THREE.Mesh(crownHaloGeo, cyanNeonMat);
  crownHalo.position.y = 10.45;
  animatedRings.push(crownHalo);

  // Clean Mid-Tower Observation Collar (tier1 -> tier2 at y = 3.96..4.34, stops inside wing gap)
  const midCollar = new THREE.Mesh(createChamferSlabGeometry(3.84, 0.24, 3.54, 0.68, 0.028), gunmetalMat);
  midCollar.position.y = 3.96;
  const midCollarBelt = new THREE.Mesh(createChamferSlabGeometry(3.92, 0.06, 3.62, 0.7, 0.008), cyanNeonMat);
  midCollarBelt.position.y = 4.08;
  const midCollarCap = new THREE.Mesh(createChamferSlabGeometry(3.64, 0.08, 3.34, 0.64, 0.014), brushedSteelMat);
  midCollarCap.position.y = 4.22;

  // Tier-2 Intermediate Horizontal Belt (y = 6.12) + Sleek Vertical Holo-Glass Spine
  const tier2Belt = new THREE.Mesh(createChamferSlabGeometry(3.04, 0.16, 2.78, 0.56, 0.02), gunmetalMat);
  tier2Belt.position.y = 6.12;
  const tier2BeltGlow = new THREE.Mesh(createChamferSlabGeometry(3.1, 0.04, 2.84, 0.56, 0.008), magentaNeonMat);
  tier2BeltGlow.position.y = 6.18;
  const tier2SpineFrame = new THREE.Mesh(createChamferSlabGeometry(0.42, 3.65, 0.14, 0.06, 0.014), gunmetalMat);
  tier2SpineFrame.position.set(0, 4.45, 1.32);
  const tier2SpineCore = new THREE.Mesh(createChamferSlabGeometry(0.2, 3.45, 0.08, 0.02, 0.008), cyanNeonMat);
  tier2SpineCore.position.set(0, 4.55, 1.39);

  // Upper-Mid Terrace Collar (tier2 -> tier3 at y = 8.20..8.46)
  const upperCollar = new THREE.Mesh(createChamferSlabGeometry(3.08, 0.22, 2.82, 0.56, 0.022), gunmetalMat);
  upperCollar.position.y = 8.2;
  const upperCollarBelt = new THREE.Mesh(createChamferSlabGeometry(3.16, 0.06, 2.9, 0.56, 0.008), magentaNeonMat);
  upperCollarBelt.position.y = 8.3;

  // Tier-1 Sculpted Front Atrium Energy Window & Diamond Gem Crest above Portal Arch
  const atriumFrame = new THREE.Mesh(createChamferSlabGeometry(1.18, 1.88, 0.18, 0.16, 0.018), towerRibMat);
  atriumFrame.position.set(0, 1.9, 1.64);
  const atriumGlass = new THREE.Mesh(createChamferSlabGeometry(0.74, 1.56, 0.1, 0.08, 0.01), containerDarkMat);
  atriumGlass.position.set(0, 2.04, 1.7);
  const atriumCore = new THREE.Mesh(createChamferSlabGeometry(0.28, 1.46, 0.08, 0.03, 0.008), cyanNeonMat);
  atriumCore.position.set(0, 2.09, 1.74);
  const atriumBezel = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), brushedSteelMat);
  atriumBezel.scale.set(0.92, 1.35, 0.35);
  atriumBezel.position.set(0, 2.84, 1.79);
  const atriumGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), magentaNeonMat);
  atriumGem.scale.set(0.88, 1.32, 0.48);
  atriumGem.position.set(0, 2.84, 1.84);
  for (const sx of [-0.46, 0.46]) {
    const atriumPillar = new THREE.Mesh(createChamferSlabGeometry(0.12, 1.72, 0.12, 0.03, 0.008), brushedSteelMat);
    atriumPillar.position.set(sx, 1.98, 1.72);
    centralTower.add(atriumPillar);
  }

  enableShadows(midCollar);
  enableShadows(tier2Belt);
  enableShadows(upperCollar);
  enableShadows(atriumFrame);
  centralTower.add(
    midCollar,
    midCollarBelt,
    midCollarCap,
    tier2Belt,
    tier2BeltGlow,
    tier2SpineFrame,
    tier2SpineCore,
    upperCollar,
    upperCollarBelt,
    atriumFrame,
    atriumGlass,
    atriumCore,
    atriumBezel,
    atriumGem
  );

  for (const ax of [-0.52, 0.52]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 1.15, 6), brushedSteelMat);
    ant.position.set(ax, 12.65, 0);
    const tip = createCyberMonolithForkFinial({
      frameMat: gunmetalMat,
      steelMat: brushedSteelMat,
      coreMat: ax < 0 ? cyanNeonMat : magentaNeonMat,
      scale: 0.62,
    });
    tip.position.set(ax, 13.2, 0);
    centralTower.add(ant, tip);
  }

  const portalArch = new THREE.Mesh(
    createExtrudedProfileGeometry(
      [
        [-1.05, 0.0],
        [-0.78, 1.72],
        [0.78, 1.72],
        [1.05, 0.0],
        [0.7, 0.0],
        [0.52, 1.4],
        [-0.52, 1.4],
        [-0.7, 0.0],
      ],
      0.48,
      0.02
    ),
    gunmetalMat
  );
  portalArch.position.set(0, 0, 1.72);
  const portalCore = new THREE.Mesh(createChamferSlabGeometry(1.06, 1.34, 0.09, 0.08, 0.01), cyanNeonMat);
  portalCore.position.set(0, 0.06, 1.8);

  // Multi-Layered Cyber-Portal Sigil Circle on the Courtyard Deck in Front of Portal Arch
  const towerPortalCircle = new THREE.Group();
  towerPortalCircle.position.set(0, 0.02, 2.04);

  const portalMedallion = new THREE.Mesh(
    new THREE.CylinderGeometry(1.96, 2.02, 0.02, 40),
    containerDarkMat
  );
  portalMedallion.position.y = 0.0;
  portalMedallion.receiveShadow = true;
  towerPortalCircle.add(portalMedallion);

  const portalCollar = new THREE.Mesh(new THREE.TorusGeometry(1.94, 0.048, 6, 40), brushedSteelMat);
  portalCollar.rotation.x = Math.PI / 2;
  portalCollar.position.y = 0.026;
  enableShadows(portalCollar);
  towerPortalCircle.add(portalCollar);

  const portalClampGeo = createChamferSlabGeometry(0.16, 0.06, 0.24, 0.03, 0.008);
  const portalClamps = new THREE.InstancedMesh(portalClampGeo, gunmetalMat, 8);
  const clampDummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    clampDummy.position.set(Math.cos(ang) * 1.94, 0.008, Math.sin(ang) * 1.94);
    clampDummy.rotation.set(0, -ang + Math.PI / 2, 0);
    clampDummy.updateMatrix();
    portalClamps.setMatrixAt(i, clampDummy.matrix);
  }
  portalClamps.instanceMatrix.needsUpdate = true;
  towerPortalCircle.add(portalClamps);

  const outerPortalRing = new THREE.Mesh(new THREE.RingGeometry(1.74, 1.87, 44), cyanNeonMat);
  outerPortalRing.rotation.x = -Math.PI / 2;
  outerPortalRing.position.y = 0.018;
  towerPortalCircle.add(outerPortalRing);

  const portalArcGroup = new THREE.Group();
  portalArcGroup.position.y = 0.025;
  const arcCount = 6;
  const arcSpan = (Math.PI * 2) / arcCount;
  const arcLen = arcSpan * 0.66;
  for (let i = 0; i < arcCount; i++) {
    const startAng = i * arcSpan;
    const arcMesh = new THREE.Mesh(new THREE.RingGeometry(1.48, 1.64, 8, 1, startAng, arcLen), violetNeonMat);
    arcMesh.rotation.x = -Math.PI / 2;
    portalArcGroup.add(arcMesh);

    const midAng = startAng + arcLen * 0.5;
    const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.036, 6), magentaNeonMat);
    pip.position.set(Math.cos(midAng) * 1.56, 0.014, -Math.sin(midAng) * 1.56);
    portalArcGroup.add(pip);
  }
  animatedRings.push(portalArcGroup);
  towerPortalCircle.add(portalArcGroup);

  const towerSigilTex = getEnchantSigilTexture();
  if (towerSigilTex) {
    const sigilSpinGroup = new THREE.Group();
    sigilSpinGroup.position.y = 0.032;
    const towerSigilMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      map: towerSigilTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const towerSigilDisc = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), towerSigilMat);
    towerSigilDisc.rotation.x = -Math.PI / 2;
    towerSigilDisc.renderOrder = 2;
    sigilSpinGroup.add(towerSigilDisc);
    animatedRings.push(sigilSpinGroup);
    towerPortalCircle.add(sigilSpinGroup);
  }

  const towerHoloTex = getPedestalHoloRingTexture();
  if (towerHoloTex) {
    const towerHoloMat = new THREE.MeshBasicMaterial({
      color: '#e879f9',
      map: towerHoloTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const towerHoloDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 2.95), towerHoloMat);
    towerHoloDisc.rotation.x = -Math.PI / 2;
    towerHoloDisc.position.y = 0.038;
    towerHoloDisc.renderOrder = 3;
    towerPortalCircle.add(towerHoloDisc);
  }

  // Twin Low-Profile Portal Beacon Bollards Flanking the Front Threshold
  const bollardGeo = createChamferSlabGeometry(0.28, 0.36, 0.28, 0.07, 0.012);
  const bollardCapGeo = new THREE.CylinderGeometry(0.075, 0.1, 0.12, 6);
  for (const bx of [-1.86, 1.86]) {
    const bollard = new THREE.Mesh(bollardGeo, gunmetalMat);
    bollard.position.set(bx, 0, 1.25);
    enableShadows(bollard);
    const cap = new THREE.Mesh(bollardCapGeo, bx < 0 ? cyanNeonMat : magentaNeonMat);
    cap.position.set(bx, 0.41, 1.25);
    towerPortalCircle.add(bollard, cap);
  }

  enableShadows(tier1);
  enableShadows(tier2);
  enableShadows(tier3);
  enableShadows(portalArch);
  centralTower.add(tier1, tier2, tier3, spireCap, crownHalo, portalArch, portalCore, towerPortalCircle);

  // Stepped Flanking Wing Towers (x = ±2.82, clear separation from central tower)
  for (const tx of [-2.82, 2.82]) {
    const wing = new THREE.Group();
    wing.position.set(tx, terraceTopY, -11.55);

    const wingBasePlinth = new THREE.Mesh(createChamferSlabGeometry(1.74, 0.22, 1.74, 0.28, 0.02), gunmetalMat);
    wingBasePlinth.position.y = -0.02;
    enableShadows(wingBasePlinth);

    const wingLower = new THREE.Mesh(createChamferSlabGeometry(1.6, 3.85, 1.6, 0.26, 0.025), containerDarkMat);
    const wingMidCollar = new THREE.Mesh(createChamferSlabGeometry(1.74, 0.22, 1.74, 0.28, 0.02), gunmetalMat);
    wingMidCollar.position.y = 3.82;
    const wingMidGlow = new THREE.Mesh(
      createChamferSlabGeometry(1.8, 0.06, 1.8, 0.28, 0.008),
      tx < 0 ? cyanNeonMat : magentaNeonMat
    );
    wingMidGlow.position.y = 3.91;

    const wingUpper = new THREE.Mesh(createChamferSlabGeometry(1.32, 3.22, 1.32, 0.22, 0.022), towerPanelMat);
    wingUpper.position.y = 4.04;
    const wingCrown = new THREE.Mesh(createChamferSlabGeometry(1.44, 0.46, 1.44, 0.24, 0.02), gunmetalMat);
    wingCrown.position.y = 7.24;

    const wingNeonEdge = new THREE.Mesh(
      createChamferSlabGeometry(0.11, 3.78, 0.11, 0.02, 0.008),
      tx < 0 ? cyanNeonMat : violetNeonMat
    );
    wingNeonEdge.position.set(tx < 0 ? -0.74 : 0.74, 0.0, 0.74);

    const bannerMat = tx < 0 ? blueNeonMat : magentaNeonMat;
    const holoBanner = new THREE.Mesh(createChamferSlabGeometry(0.1, 2.45, 0.56, 0.04, 0.008), bannerMat);
    holoBanner.position.set(tx < 0 ? -0.82 : 0.82, 5.25, 0.15);

    const wingFinial = createCyberMonolithForkFinial({
      frameMat: gunmetalMat,
      steelMat: brushedSteelMat,
      coreMat: tx < 0 ? cyanNeonMat : magentaNeonMat,
      scale: 0.68,
    });
    wingFinial.position.y = 7.72;

    // Armored Skybridge Walkways spanning cleanly across the gap to Central Tower
    for (const by of [3.86, 6.08]) {
      const bridge = new THREE.Mesh(createChamferSlabGeometry(1.25, 0.28, 0.74, 0.08, 0.015), towerRibMat);
      bridge.position.set(tx < 0 ? 1.02 : -1.02, by, 0.1);
      const bridgeGlow = new THREE.Mesh(
        createChamferSlabGeometry(1.18, 0.05, 0.1, 0.02, 0.006),
        tx < 0 ? cyanNeonMat : violetNeonMat
      );
      bridgeGlow.position.set(tx < 0 ? 1.02 : -1.02, by + 0.11, 0.46);
      enableShadows(bridge);
      wing.add(bridge, bridgeGlow);
    }

    enableShadows(wingLower);
    enableShadows(wingUpper);
    enableShadows(wingCrown);
    enableShadows(wingMidCollar);
    wing.add(wingBasePlinth, wingLower, wingMidCollar, wingMidGlow, wingUpper, wingCrown, wingNeonEdge, holoBanner, wingFinial);
    towerGroup.add(wing);
  }

  // Glowing Window Grids across Central & Flanking Gem Tower Facades (InstancedMesh, +0.04m outside bevels)
  const gemWinGeo = new THREE.PlaneGeometry(0.36, 0.22);
  const cyanWinMatrices: THREE.Matrix4[] = [];
  const violetWinMatrices: THREE.Matrix4[] = [];
  const pushWin = (list: THREE.Matrix4[], x: number, y: number, z: number, ry = 0): void => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };

  // Tier 1 front (outer face z = -11.4 + 1.665) & sides (outer face x = ±1.815)
  for (let row = 0; row < 3; row++) {
    const wy = terraceTopY + 2.28 + row * 0.56;
    for (const wx of [-1.1, 1.1]) {
      pushWin(row % 2 === 0 ? cyanWinMatrices : violetWinMatrices, wx, wy, -11.4 + 1.705, 0);
    }
  }
  for (let row = 0; row < 4; row++) {
    const wy = terraceTopY + 1.08 + row * 0.68;
    for (const wz of [-11.95, -10.85]) {
      pushWin(cyanWinMatrices, -1.855, wy, wz, -Math.PI / 2);
      pushWin(violetWinMatrices, 1.855, wy, wz, Math.PI / 2);
    }
  }
  // Tier 2 lower & upper bays (outer front z = -11.4 + 1.34, sides x = ±1.465)
  for (let row = 0; row < 4; row++) {
    const wyLower = terraceTopY + 4.56 + row * 0.38;
    const wyUpper = terraceTopY + 6.56 + row * 0.38;
    for (const wy of [wyLower, wyUpper]) {
      for (const wx of [-0.86, -0.44, 0.44, 0.86]) {
        pushWin(Math.abs(wx) > 0.6 ? cyanWinMatrices : violetWinMatrices, wx, wy, -11.4 + 1.385, 0);
      }
      for (const wz of [-11.85, -10.95]) {
        pushWin(cyanWinMatrices, -1.505, wy, wz, -Math.PI / 2);
        pushWin(violetWinMatrices, 1.505, wy, wz, Math.PI / 2);
      }
    }
  }
  // Tier 3 front (outer z = -11.4 + 0.98) & sides (outer x = ±1.03)
  for (let row = 0; row < 6; row++) {
    const wy = terraceTopY + 8.7 + row * 0.4;
    for (const wx of [-0.36, 0.36]) {
      pushWin(violetWinMatrices, wx, wy, -11.4 + 1.025, 0);
    }
    for (const wz of [-11.7, -11.1]) {
      pushWin(cyanWinMatrices, -1.075, wy, wz, -Math.PI / 2);
      pushWin(violetWinMatrices, 1.075, wy, wz, Math.PI / 2);
    }
  }
  // Stepped Wing towers (lower z = -11.55 + 0.865, upper z = -11.55 + 0.722)
  for (const tx of [-2.82, 2.82]) {
    for (let row = 0; row < 6; row++) {
      const wyLower = terraceTopY + 0.68 + row * 0.48;
      for (const ox of [-0.32, 0.32]) {
        pushWin(tx < 0 ? cyanWinMatrices : violetWinMatrices, tx + ox, wyLower, -11.55 + 0.865, 0);
      }
    }
    for (let row = 0; row < 5; row++) {
      const wyUpper = terraceTopY + 4.44 + row * 0.5;
      for (const ox of [-0.26, 0.26]) {
        pushWin(tx < 0 ? cyanWinMatrices : violetWinMatrices, tx + ox, wyUpper, -11.55 + 0.722, 0);
      }
    }
  }

  const gemCyanWins = new THREE.InstancedMesh(gemWinGeo, cyanNeonMat, cyanWinMatrices.length);
  cyanWinMatrices.forEach((m, i) => gemCyanWins.setMatrixAt(i, m));
  gemCyanWins.instanceMatrix.needsUpdate = true;

  const gemVioletWins = new THREE.InstancedMesh(gemWinGeo, violetNeonMat, violetWinMatrices.length);
  violetWinMatrices.forEach((m, i) => gemVioletWins.setMatrixAt(i, m));
  gemVioletWins.instanceMatrix.needsUpdate = true;

  towerGroup.add(gemCyanWins, gemVioletWins);
  return towerGroup;
}

export interface PlazaOmegaPadBuildContext {
  side: -1 | 1;
  padX: number;
  padZ: number;
  slateConcreteMat: THREE.MeshStandardMaterial;
  darkHullMat: THREE.MeshStandardMaterial;
  gunmetalMat: THREE.MeshStandardMaterial;
  brushedSteelMat: THREE.MeshStandardMaterial;
  animatedRings: THREE.Object3D[];
  podiumCtx: FusionPodiumBuildCtx;
  makeNeonMat: (
    colorHex: number,
    emissiveIntensity?: number,
    pulseAmp?: number,
    speed?: number,
    phase?: number
  ) => THREE.MeshStandardMaterial;
}

export interface PlazaOmegaPadResult {
  group: THREE.Group;
  podium: CyberShowcasePodiumHandle;
  topY: number;
}

/**
 * Builds a left/right Plaza Omega Boss Pad with a multi-layered horizontal cyber-sigil
 * ground circle, 4 corner beacon pylons, and a ZZZ/HSR Cyber-Showcase Podium.
 */
export function buildPlazaOmegaBossPad(ctx: PlazaOmegaPadBuildContext): PlazaOmegaPadResult {
  const isLeft = ctx.side < 0;
  const primaryHex = isLeft ? '#ef4444' : '#e879f9';
  const secondaryHex = isLeft ? '#22d3ee' : '#e2e8f0';
  const primaryNum = isLeft ? 0xef4444 : 0xe879f9;
  const secondaryNum = isLeft ? 0x22d3ee : 0xcbd5e1;

  const bossPadGroup = new THREE.Group();
  bossPadGroup.position.set(ctx.padX, 0.18, ctx.padZ);

  const padBase = new THREE.Mesh(
    createChamferSlabGeometry(5.35, 0.22, 5.35, 0.82, 0.025),
    ctx.slateConcreteMat
  );
  const padInner = new THREE.Mesh(
    createChamferSlabGeometry(4.65, 0.05, 4.65, 0.68, 0.01),
    ctx.darkHullMat
  );
  padInner.position.y = 0.22;

  const primaryGlowMat = ctx.makeNeonMat(primaryNum, 1.55, 0.24, 2.6, isLeft ? 0 : 1.3);
  const secondaryGlowMat = ctx.makeNeonMat(secondaryNum, 1.4, 0.18, 2.2, isLeft ? 0.5 : 1.8);

  const padTrim = new THREE.Mesh(
    createChamferSlabGeometry(4.95, 0.048, 0.14, 0.03, 0.008),
    primaryGlowMat
  );
  padTrim.position.set(0, 0.205, 2.58);

  const circleBaseY = 0.272;

  // 1. Machined Metallic Outer Ring Frame + 8 Radial Anchor Clamps (100% flat horizontal)
  const collarTorus = new THREE.Mesh(
    new THREE.TorusGeometry(2.14, 0.048, 6, 36),
    ctx.brushedSteelMat
  );
  collarTorus.rotation.x = Math.PI / 2;
  collarTorus.position.y = circleBaseY + 0.012;
  collarTorus.castShadow = true;
  collarTorus.receiveShadow = true;
  bossPadGroup.add(collarTorus);

  const clampGeo = createChamferSlabGeometry(0.16, 0.06, 0.24, 0.03, 0.008);
  const clampInst = new THREE.InstancedMesh(clampGeo, ctx.gunmetalMat, 8);
  const clampDummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    clampDummy.position.set(Math.cos(ang) * 2.14, circleBaseY, Math.sin(ang) * 2.14);
    clampDummy.rotation.set(0, -ang + Math.PI / 2, 0);
    clampDummy.updateMatrix();
    clampInst.setMatrixAt(i, clampDummy.matrix);
  }
  clampInst.instanceMatrix.needsUpdate = true;
  bossPadGroup.add(clampInst);

  // 2. Pulsing Primary Outer Conduit Ring
  const outerNeonRing = new THREE.Mesh(new THREE.RingGeometry(1.94, 2.07, 40), primaryGlowMat);
  outerNeonRing.rotation.x = -Math.PI / 2;
  outerNeonRing.position.y = circleBaseY + 0.006;
  bossPadGroup.add(outerNeonRing);

  // 3. Rotating Segmented Tech Arcs + Hex Nodes
  const techArcGroup = new THREE.Group();
  techArcGroup.position.y = circleBaseY + 0.01;
  const segCount = 6;
  const arcSpan = (Math.PI * 2) / segCount;
  const segLen = arcSpan * 0.66;
  for (let i = 0; i < segCount; i++) {
    const startAng = i * arcSpan;
    const arcMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.68, 1.83, 8, 1, startAng, segLen),
      secondaryGlowMat
    );
    arcMesh.rotation.x = -Math.PI / 2;
    techArcGroup.add(arcMesh);

    const midAng = startAng + segLen * 0.5;
    const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.036, 6), primaryGlowMat);
    pip.position.set(Math.cos(midAng) * 1.755, 0.014, -Math.sin(midAng) * 1.755);
    techArcGroup.add(pip);
  }
  ctx.animatedRings.push(techArcGroup);
  bossPadGroup.add(techArcGroup);

  // 4. Layered Additive Cyber-Sigil & Holo Halo Decals Beneath the Podium
  const sigilTex = getEnchantSigilTexture();
  if (sigilTex) {
    const sigilMat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      map: sigilTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const sigilSpinGroup = new THREE.Group();
    sigilSpinGroup.position.y = circleBaseY + 0.015;
    const sigilDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.15, 4.15), sigilMat);
    sigilDisc.rotation.x = -Math.PI / 2;
    sigilDisc.renderOrder = 2;
    sigilSpinGroup.add(sigilDisc);
    ctx.animatedRings.push(sigilSpinGroup);
    bossPadGroup.add(sigilSpinGroup);
  }

  const holoTex = getPedestalHoloRingTexture();
  if (holoTex) {
    const holoMat = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      map: holoTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const holoDisc = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 3.45), holoMat);
    holoDisc.rotation.x = -Math.PI / 2;
    holoDisc.position.y = circleBaseY + 0.02;
    holoDisc.renderOrder = 3;
    bossPadGroup.add(holoDisc);
  }

  // 5. Four Corner Beacon Pylons Framing the Ground Circle
  const pylonGeo = createChamferSlabGeometry(0.32, 0.34, 0.32, 0.08, 0.012);
  const pylonCapGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.12, 6);
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2;
    const bx = Math.cos(ang) * 2.26;
    const bz = Math.sin(ang) * 2.26;
    const pylon = new THREE.Mesh(pylonGeo, ctx.gunmetalMat);
    pylon.position.set(bx, 0.22, bz);
    pylon.rotation.y = ang + Math.PI / 4;
    enableShadows(pylon);
    const cap = new THREE.Mesh(pylonCapGeo, i % 2 === 0 ? primaryGlowMat : secondaryGlowMat);
    cap.position.set(bx, 0.61, bz);
    bossPadGroup.add(pylon, cap);
  }

  // 6. Central Cyber-Showcase Podium Mounted Flush on the Pad Deck
  const podium = createCyberShowcasePodium(ctx.podiumCtx, isLeft ? 'OMEGA I' : 'OMEGA II', 1.42, true);
  podium.group.position.y = 0.27;
  podium.ringMat.color.set(primaryHex);
  podium.ringMat.emissive.set(primaryHex);
  podium.ringMat.emissiveIntensity = 1.35;
  podium.holoDiscMat.color.set(secondaryHex);
  podium.sigilMat.color.set(primaryHex);
  podium.auraVeilMat.uniforms.uColorA.value.set(primaryHex);
  podium.auraVeilMat.uniforms.uColorB.value.set(secondaryHex);
  podium.auraOuterVeilMat.uniforms.uColorA.value.set(secondaryHex);
  podium.auraOuterVeilMat.uniforms.uColorB.value.set(primaryHex);
  podium.particleMat.uniforms.uColorA.value.set(primaryHex);
  podium.particleMat.uniforms.uColorB.value.set(secondaryHex);

  enableShadows(padBase);
  enableShadows(padInner);
  bossPadGroup.add(padBase, padInner, padTrim, podium.group);

  return {
    group: bossPadGroup,
    podium,
    topY: 0.18 + 0.27 + podium.topY,
  };
}
