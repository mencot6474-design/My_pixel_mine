import * as THREE from 'three';
import { createCyberMonolithForkFinial } from './CyberProps3D';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';

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

  const terraceTopY = 1.46;
  towerGroup.add(lowerTerrace, lowerNeon, upperTerrace, upperNeon, upperDeckCap);

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

  // Central Cyberpunk Skyscraper Tower (apex y ≈ 8.16, leaving generous room for emblem & badge below Back to Mine)
  const centralTower = new THREE.Group();
  centralTower.position.set(0, terraceTopY, -11.4);
  towerGroup.add(centralTower);

  const tier1 = new THREE.Mesh(createChamferSlabGeometry(3.55, 2.05, 3.25, 0.65, 0.04), towerPanelMat);
  const tier2 = new THREE.Mesh(createChamferSlabGeometry(2.85, 2.15, 2.6, 0.55, 0.04), containerDarkMat);
  tier2.position.y = 2.02;
  const tier3 = new THREE.Mesh(createChamferSlabGeometry(2.0, 1.48, 1.9, 0.4, 0.03), towerPanelMat);
  tier3.position.y = 4.14;
  const spireCap = new THREE.Mesh(createChamferSlabGeometry(1.25, 0.48, 1.25, 0.25, 0.02), gunmetalMat);
  spireCap.position.y = 5.6;

  for (const [rx, rz] of [
    [-1.58, 1.38],
    [1.58, 1.38],
    [-1.58, -1.38],
    [1.58, -1.38],
  ]) {
    const rib = new THREE.Mesh(createChamferSlabGeometry(0.32, 4.15, 0.32, 0.06, 0.015), towerRibMat);
    rib.position.set(rx, 0, rz);
    const neonStrip = new THREE.Mesh(
      createChamferSlabGeometry(0.1, 3.85, 0.1, 0.02, 0.008),
      rx < 0 ? cyanNeonMat : violetNeonMat
    );
    neonStrip.position.set(rx * 1.05, 0.15, rz * 1.05);
    enableShadows(rib);
    centralTower.add(rib, neonStrip);
  }

  const crownHaloGeo = new THREE.TorusGeometry(1.65, 0.06, 6, 28);
  crownHaloGeo.rotateX(Math.PI / 2);
  const crownHalo = new THREE.Mesh(crownHaloGeo, cyanNeonMat);
  crownHalo.position.y = 5.15;
  animatedRings.push(crownHalo);

  for (const ax of [-0.52, 0.52]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.72, 6), brushedSteelMat);
    ant.position.set(ax, 6.2, 0);
    const tip = createCyberMonolithForkFinial({
      frameMat: gunmetalMat,
      steelMat: brushedSteelMat,
      coreMat: ax < 0 ? cyanNeonMat : magentaNeonMat,
      scale: 0.5,
    });
    tip.position.set(ax, 6.54, 0);
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
  portalArch.position.set(0, 0, 1.66);
  const portalCore = new THREE.Mesh(createChamferSlabGeometry(1.08, 1.38, 0.14, 0.08, 0.01), cyanNeonMat);
  portalCore.position.set(0, 0.02, 1.68);

  const towerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.85, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
  );
  towerRing.rotation.x = -Math.PI / 2;
  towerRing.position.set(0, 0.02, 0.6);

  enableShadows(tier1);
  enableShadows(tier2);
  enableShadows(tier3);
  enableShadows(portalArch);
  centralTower.add(tier1, tier2, tier3, spireCap, crownHalo, portalArch, portalCore, towerRing);

  for (const tx of [-2.48, 2.48]) {
    const wing = new THREE.Group();
    wing.position.set(tx, terraceTopY, -11.65);

    const wingBody = new THREE.Mesh(createChamferSlabGeometry(1.45, 3.65, 1.45, 0.2, 0.025), containerDarkMat);
    const wingCrown = new THREE.Mesh(createChamferSlabGeometry(1.15, 0.68, 1.15, 0.16, 0.02), gunmetalMat);
    wingCrown.position.y = 3.62;
    const wingNeonEdge = new THREE.Mesh(
      createChamferSlabGeometry(0.12, 3.5, 0.12, 0.02, 0.008),
      tx < 0 ? cyanNeonMat : violetNeonMat
    );
    wingNeonEdge.position.set(tx < 0 ? -0.68 : 0.68, 0.08, 0.68);

    const bannerMat = tx < 0 ? blueNeonMat : magentaNeonMat;
    const holoBanner = new THREE.Mesh(createChamferSlabGeometry(0.1, 1.5, 0.68, 0.04, 0.008), bannerMat);
    holoBanner.position.set(tx < 0 ? -0.82 : 0.82, 2.25, 0.25);

    enableShadows(wingBody);
    enableShadows(wingCrown);
    wing.add(wingBody, wingCrown, wingNeonEdge, holoBanner);
    towerGroup.add(wing);
  }

  // Glowing Window Grids across Central & Flanking Gem Tower Facades (InstancedMesh)
  const gemWinGeo = new THREE.PlaneGeometry(0.42, 0.24);
  const cyanWinMatrices: THREE.Matrix4[] = [];
  const violetWinMatrices: THREE.Matrix4[] = [];
  const pushWin = (list: THREE.Matrix4[], x: number, y: number, z: number, ry = 0): void => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };

  for (let row = 0; row < 5; row++) {
    const wy = terraceTopY + 2.3 + row * 0.38;
    for (const wx of [-0.74, 0, 0.74]) {
      pushWin(row % 2 === 0 ? cyanWinMatrices : violetWinMatrices, wx, wy, -11.4 + 1.35, 0);
    }
    for (const wz of [-11.85, -10.95]) {
      pushWin(cyanWinMatrices, -1.46, wy, wz, -Math.PI / 2);
      pushWin(violetWinMatrices, 1.46, wy, wz, Math.PI / 2);
    }
  }
  for (let row = 0; row < 3; row++) {
    const wy = terraceTopY + 4.42 + row * 0.38;
    for (const wx of [-0.36, 0.36]) {
      pushWin(violetWinMatrices, wx, wy, -11.4 + 0.99, 0);
    }
  }
  for (const tx of [-2.48, 2.48]) {
    for (let row = 0; row < 7; row++) {
      const wy = terraceTopY + 0.58 + row * 0.44;
      for (const ox of [-0.32, 0.32]) {
        pushWin(tx < 0 ? cyanWinMatrices : violetWinMatrices, tx + ox, wy, -11.65 + 0.76, 0);
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
