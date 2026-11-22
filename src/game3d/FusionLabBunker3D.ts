import * as THREE from 'three';
import {
  createChamferPanelXYGeometry,
  createChamferSlabGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';
import { normalizeHorizontalSlabUVs } from './OmegaRooftopAssets3D';

export interface LabBunkerAnimHandles {
  irisRotorGroup: THREE.Group | null;
  cryoBubbleGroups: Array<{ group: THREE.Group; baseY: number; phase: number }>;
  cryoMistMats: THREE.MeshBasicMaterial[];
  emitterTipMats: THREE.MeshStandardMaterial[];
}

export interface LabBunkerBuildCtx {
  group: THREE.Group;
  labWhiteMat: THREE.MeshStandardMaterial;
  labSilverMat: THREE.MeshStandardMaterial;
  labSlateMat: THREE.MeshStandardMaterial;
  labDarkFrameMat: THREE.MeshStandardMaterial;
  stageNeonMat: THREE.MeshStandardMaterial;
  deckTrimCyanMat: THREE.MeshStandardMaterial;
  deckTrimMagentaMat: THREE.MeshStandardMaterial;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  ownedTextures: THREE.Texture[];
  animHandles: LabBunkerAnimHandles;
}

function createLabFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Industrial dark brushed-steel plate base
  ctx.fillStyle = '#1b2433';
  ctx.fillRect(0, 0, 1024, 1024);

  const grad = ctx.createRadialGradient(512, 420, 60, 512, 512, 560);
  grad.addColorStop(0, 'rgba(56, 74, 102, 0.35)');
  grad.addColorStop(0.6, 'rgba(30, 41, 59, 0.15)');
  grad.addColorStop(1, 'rgba(11, 17, 29, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Modular steel armor plates (8x8) with alternating bevels & diamond grip ticks
  const step = 128;
  for (let gx = 0; gx < 1024; gx += step) {
    for (let gy = 0; gy < 1024; gy += step) {
      const checker = ((gx / step + gy / step) & 1) === 0;
      ctx.fillStyle = checker ? 'rgba(51, 65, 85, 0.38)' : 'rgba(30, 41, 59, 0.42)';
      ctx.fillRect(gx + 5, gy + 5, step - 10, step - 10);
      // Top-left steel edge highlight & bottom-right shadow seam
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + 6, gy + 6, step - 12, step - 12);
      // 4 plate rivets
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.fillRect(gx + 11, gy + 11, 4, 4);
      ctx.fillRect(gx + step - 15, gy + 11, 4, 4);
      ctx.fillRect(gx + 11, gy + step - 15, 4, 4);
      ctx.fillRect(gx + step - 15, gy + step - 15, 4, 4);
    }
  }

  // Heavy dark plate seams
  ctx.strokeStyle = '#0d1422';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Perimeter yellow-black hazard warning ring band
  ctx.save();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 14;
  ctx.setLineDash([24, 18]);
  ctx.beginPath();
  ctx.arc(512, 512, 446, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Inner cyan reactor safety zone ring & dark hazard rim
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(512, 512, 340, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp stencil markings on front steel deck
  ctx.fillStyle = 'rgba(250, 204, 21, 0.65)';
  ctx.font = '900 22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECTOR-09  //  HAZARD CONTAINMENT DECK', 512, 916);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLabHazardTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#facc15';
  for (let x = -64; x < 320; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 16, 64);
    ctx.lineTo(x + 36, 0);
    ctx.lineTo(x + 20, 0);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.needsUpdate = true;
  return tex;
}

function createLabBlastDoorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#e2ebf5';
  ctx.fillRect(0, 0, 512, 512);

  // Recessed dark structural pockets & beveled door leaf split
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(24, 24, 224, 420);
  ctx.fillRect(264, 24, 224, 420);

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, 224, 420);
  ctx.strokeRect(264, 24, 224, 420);

  // Center interlock seam & glowing cyan security seal
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(248, 16, 16, 444);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(253, 44, 6, 384);

  // Geometric cleanroom chevron indentations
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.48)';
  ctx.lineWidth = 4;
  ctx.strokeRect(52, 68, 168, 150);
  ctx.strokeRect(292, 68, 168, 150);
  ctx.strokeRect(52, 248, 168, 150);
  ctx.strokeRect(292, 248, 168, 150);

  // Clean cyan telemetry status bars
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(68, 86, 64, 8);
  ctx.fillRect(380, 86, 64, 8);

  // Hazard warning footer strip
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 464, 512, 48);
  ctx.fillStyle = '#facc15';
  for (let x = -48; x < 560; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 512);
    ctx.lineTo(x + 14, 512);
    ctx.lineTo(x + 34, 464);
    ctx.lineTo(x + 20, 464);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLabConsoleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#071526';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 148);

  // Waveform plot
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 20; x <= 146; x += 6) {
    const y = 52 + Math.sin(x * 0.14) * 18 * Math.cos(x * 0.05);
    if (x === 20) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Concentric containment dial on right
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(200, 64, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(200, 64, 16, 0.4, Math.PI * 1.7);
  ctx.stroke();

  // Telemetry bars
  ctx.fillStyle = '#0ea5e9';
  for (let i = 0; i < 6; i++) {
    const h = 14 + ((i * 11) % 24);
    ctx.fillRect(22 + i * 20, 134 - h, 12, h);
  }
  ctx.fillStyle = '#bae6fd';
  ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SYNCHRO-09 OK', 152, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLabCryoMistTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(224, 247, 255, 0.65)');
  grad.addColorStop(0.45, 'rgba(125, 211, 252, 0.3)');
  grad.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildLabBunkerFloorDeck(ctx: LabBunkerBuildCtx): void {
  const floorTex = createLabFloorTexture();
  if (floorTex) ctx.ownedTextures.push(floorTex);
  const hazardTex = createLabHazardTexture();
  if (hazardTex) ctx.ownedTextures.push(hazardTex);

  const deckTileMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    ...(floorTex ? { map: floorTex } : { color: '#202a3b' }),
    roughness: 0.48,
    metalness: 0.42,
    flatShading: true,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    ...(hazardTex ? { map: hazardTex } : { color: '#facc15' }),
    roughness: 0.55,
    metalness: 0.15,
    flatShading: true,
  });
  ctx.ownedMats.push(deckTileMat, hazardMat);

  // Outer multi-tiered octagonal chamber deck
  const hullGeo = new THREE.CylinderGeometry(12.2, 10.6, 0.68, 8);
  hullGeo.rotateY(Math.PI / 8);
  const deckGeo = new THREE.CylinderGeometry(11.75, 12.1, 0.38, 8);
  deckGeo.rotateY(Math.PI / 8);
  const topTileGeo = createChamferSlabGeometry(21.4, 0.045, 21.4, 6.25, 0.012);
  normalizeHorizontalSlabUVs(topTileGeo, 21.4, 21.4, 0, 0);
  ctx.ownedGeos.push(hullGeo, deckGeo, topTileGeo);

  const hullMesh = new THREE.Mesh(hullGeo, ctx.labDarkFrameMat);
  hullMesh.position.y = -0.52;
  hullMesh.receiveShadow = true;

  const deckMesh = new THREE.Mesh(deckGeo, ctx.labSlateMat);
  deckMesh.position.y = -0.19;
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;

  const topTileMesh = new THREE.Mesh(topTileGeo, deckTileMat);
  topTileMesh.position.y = -0.02;
  topTileMesh.receiveShadow = true;
  ctx.group.add(hullMesh, deckMesh, topTileMesh);

  // Perimeter neon trim rails & heavy chamfered corner bollards
  const outerRailGeo = new THREE.BoxGeometry(8.5, 0.075, 0.12);
  const hazardCurbGeo = new THREE.BoxGeometry(7.9, 0.065, 0.24);
  const cornerPostGeo = createChamferSlabGeometry(1.05, 0.34, 1.05, 0.26, 0.02);
  const cornerCapGeo = createChamferSlabGeometry(0.64, 0.08, 0.64, 0.14, 0.015);
  ctx.ownedGeos.push(outerRailGeo, hazardCurbGeo, cornerPostGeo, cornerCapGeo);

  for (let i = 0; i < 8; i++) {
    const edgeAngle = i * (Math.PI / 4);
    const outerR = 10.82;
    const cyanRail = new THREE.Mesh(outerRailGeo, ctx.deckTrimCyanMat);
    cyanRail.position.set(Math.sin(edgeAngle) * outerR, 0.045, Math.cos(edgeAngle) * outerR);
    cyanRail.rotation.y = edgeAngle;
    ctx.group.add(cyanRail);

    // Front cutaway edge & side edges get clean hazard safety curb
    if (i === 0 || i === 1 || i === 7) {
      const curb = new THREE.Mesh(hazardCurbGeo, hazardMat);
      curb.position.set(Math.sin(edgeAngle) * 10.52, 0.036, Math.cos(edgeAngle) * 10.52);
      curb.rotation.y = edgeAngle;
      curb.receiveShadow = true;
      ctx.group.add(curb);
    }

    const vertAngle = (i + 0.5) * (Math.PI / 4);
    const vertR = 11.15;
    const cornerPost = new THREE.Mesh(cornerPostGeo, ctx.labWhiteMat);
    cornerPost.position.set(Math.sin(vertAngle) * vertR, 0.0, Math.cos(vertAngle) * vertR);
    cornerPost.rotation.y = vertAngle;
    enableShadows(cornerPost, true, true);
    const cornerCap = new THREE.Mesh(
      cornerCapGeo,
      i % 2 === 0 ? ctx.deckTrimCyanMat : ctx.deckTrimMagentaMat
    );
    cornerCap.position.set(Math.sin(vertAngle) * vertR, 0.34, Math.cos(vertAngle) * vertR);
    cornerCap.rotation.y = vertAngle;
    ctx.group.add(cornerPost, cornerCap);
  }

  // 4 Recessed Floor Grating Vents with InstancedMesh Grate Bars + Cyan Under-Glow
  const grateCoords: ReadonlyArray<readonly [number, number, number]> = [
    [-6.1, 4.9, 0.32],
    [6.1, 4.9, -0.32],
    [-3.15, 7.35, 0],
    [3.15, 7.35, 0],
  ];
  const grateWellGeo = createChamferSlabGeometry(2.3, 0.05, 1.35, 0.14, 0.015);
  const grateGlowGeo = new THREE.PlaneGeometry(1.96, 1.02);
  const grateBarGeo = new THREE.BoxGeometry(1.92, 0.032, 0.075);
  const grateBarInst = new THREE.InstancedMesh(grateBarGeo, ctx.labSlateMat, grateCoords.length * 6);
  grateBarInst.castShadow = false;
  grateBarInst.receiveShadow = true;
  ctx.ownedGeos.push(grateWellGeo, grateGlowGeo, grateBarGeo);

  const dummy = new THREE.Object3D();
  let barIdx = 0;
  for (const [gx, gz, rotY] of grateCoords) {
    const well = new THREE.Mesh(grateWellGeo, ctx.labDarkFrameMat);
    well.position.set(gx, 0.005, gz);
    well.rotation.y = rotY;
    well.receiveShadow = true;

    const glow = new THREE.Mesh(grateGlowGeo, ctx.deckTrimCyanMat);
    glow.rotation.x = -Math.PI / 2;
    glow.rotation.z = rotY;
    glow.position.set(gx, 0.034, gz);

    ctx.group.add(well, glow);
    for (let b = 0; b < 6; b++) {
      const localZ = -0.38 + b * 0.152;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      dummy.position.set(gx + localZ * sinR, 0.052, gz + localZ * cosR);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      grateBarInst.setMatrixAt(barIdx++, dummy.matrix);
    }
  }
  grateBarInst.instanceMatrix.needsUpdate = true;
  ctx.group.add(grateBarInst);
}

export function buildLabBunkerWallsAndCryoBays(ctx: LabBunkerBuildCtx): void {
  const blastDoorTex = createLabBlastDoorTexture();
  if (blastDoorTex) ctx.ownedTextures.push(blastDoorTex);
  const cryoMistTex = createLabCryoMistTexture();
  if (cryoMistTex) ctx.ownedTextures.push(cryoMistTex);

  const blastDoorMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    ...(blastDoorTex ? { map: blastDoorTex } : { color: '#dce6f2' }),
    roughness: 0.38,
    metalness: 0.35,
    flatShading: true,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const cryoFluidMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });
  const cryoBubbleMat = new THREE.MeshBasicMaterial({
    color: '#e0f2fe',
    transparent: true,
    opacity: 0.85,
  });
  ctx.ownedMats.push(blastDoorMat, glassMat, cryoFluidMat, cryoBubbleMat);

  // 1. Rear Bulkhead Wall & Sealed Blast Door (exact octagon apothem z = -11.2m, raised 10.65m height for 2x APEX Tube)
  const rearWallGroup = new THREE.Group();
  rearWallGroup.position.set(0, 0, -11.2);
  const rearBackingGeo = createChamferPanelXYGeometry(9.28, 10.65, 0.56, 0.12, 0.02);
  const blastFrameGeo = createChamferPanelXYGeometry(6.8, 9.2, 0.42, 0.36, 0.025);
  const blastDoorGeo = new THREE.PlaneGeometry(5.85, 8.15);
  const coolantTowerGeo = createChamferSlabGeometry(0.86, 9.6, 0.86, 0.16, 0.02);
  const coolantFinGeo = new THREE.BoxGeometry(0.96, 0.16, 0.96);
  const cornerColumnGeo = new THREE.CylinderGeometry(0.54, 0.54, 10.75, 8);
  ctx.ownedGeos.push(
    rearBackingGeo,
    blastFrameGeo,
    blastDoorGeo,
    coolantTowerGeo,
    coolantFinGeo,
    cornerColumnGeo
  );

  const rearBacking = new THREE.Mesh(rearBackingGeo, ctx.labWhiteMat);
  rearBacking.position.set(0, 5.325, -0.28);
  enableShadows(rearBacking, true, true);
  const blastFrame = new THREE.Mesh(blastFrameGeo, ctx.labSlateMat);
  blastFrame.position.set(0, 4.6, 0.08);
  enableShadows(blastFrame, true, true);
  const blastDoor = new THREE.Mesh(blastDoorGeo, blastDoorMat);
  blastDoor.position.set(0, 4.35, 0.31);
  blastDoor.receiveShadow = true;
  rearWallGroup.add(rearBacking, blastFrame, blastDoor);

  for (const sx of [-1, 1]) {
    const tower = new THREE.Mesh(coolantTowerGeo, ctx.labSilverMat);
    tower.position.set(sx * 4.02, 0, 0.42);
    enableShadows(tower, true, true);
    rearWallGroup.add(tower);
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(coolantFinGeo, f === 3 ? ctx.deckTrimCyanMat : ctx.labSlateMat);
      fin.position.set(sx * 4.02, 1.4 + f * 1.45, 0.42);
      rearWallGroup.add(fin);
    }
  }
  ctx.group.add(rearWallGroup);

  // 4 Octagonal Corner Columns sealing exact miter seams (zero wall overlap)
  const miterCols: ReadonlyArray<readonly [number, number]> = [
    [-4.64, -11.2],
    [4.64, -11.2],
    [-11.2, -4.64],
    [11.2, -4.64],
  ];
  for (const [mx, mz] of miterCols) {
    const col = new THREE.Mesh(cornerColumnGeo, ctx.labSilverMat);
    col.position.set(mx, 5.375, mz);
    enableShadows(col, true, true);
    ctx.group.add(col);
  }

  // 2. Two Rear-Diagonal Cryogenic Containment Walls (exact width 9.28m at ±45°, 10.65m height)
  const diagWallGeo = createChamferPanelXYGeometry(9.28, 10.65, 0.56, 0.12, 0.02);
  const bayPocketGeo = createChamferPanelXYGeometry(2.25, 5.45, 0.32, 0.22, 0.02);
  const bayBacklightGeo = new THREE.BoxGeometry(0.28, 3.85, 0.06);
  const collarGeo = createLatheProfileGeometry(
    [
      [0.01, 0],
      [0.82, 0],
      [0.86, 0.14],
      [0.74, 0.28],
      [0.78, 0.48],
      [0.64, 0.62],
      [0.01, 0.66],
    ],
    12
  );
  const cryoFluidGeo = new THREE.CylinderGeometry(0.56, 0.56, 3.6, 16);
  const cryoGlassGeo = new THREE.CylinderGeometry(0.68, 0.68, 3.72, 16);
  const valveRingGeo = new THREE.TorusGeometry(0.16, 0.035, 6, 12);
  const ribColumnGeo = createChamferSlabGeometry(0.64, 10.25, 0.92, 0.14, 0.02);
  const ribStripGeo = new THREE.BoxGeometry(0.09, 6.8, 0.1);
  const bubbleGeo = new THREE.SphereGeometry(0.055, 6, 6);
  const mistGeo = new THREE.PlaneGeometry(3.1, 2.4);
  ctx.ownedGeos.push(
    diagWallGeo,
    bayPocketGeo,
    bayBacklightGeo,
    collarGeo,
    cryoFluidGeo,
    cryoGlassGeo,
    valveRingGeo,
    ribColumnGeo,
    ribStripGeo,
    bubbleGeo,
    mistGeo
  );

  for (const sx of [-1, 1]) {
    const wallRoot = new THREE.Group();
    wallRoot.position.set(sx * 7.92, 0, -7.92);
    wallRoot.rotation.y = -sx * (Math.PI / 4);

    const panel = new THREE.Mesh(diagWallGeo, ctx.labWhiteMat);
    panel.position.set(0, 5.325, -0.28);
    enableShadows(panel, true, true);
    wallRoot.add(panel);

    // 2 inner vertical titanium rib columns flanking the cryo bays (clear of miter seams)
    for (const rx of [-3.65, 0, 3.65]) {
      const rib = new THREE.Mesh(ribColumnGeo, ctx.labSilverMat);
      rib.position.set(rx, 0, 0.08);
      enableShadows(rib, true, true);
      const led = new THREE.Mesh(ribStripGeo, ctx.deckTrimCyanMat);
      led.position.set(rx, 4.1, 0.54);
      wallRoot.add(rib, led);
    }

    // 2 Embedded Cryogenic Stasis Capsules per diagonal wall
    for (const bx of [-1.85, 1.85]) {
      const pocket = new THREE.Mesh(bayPocketGeo, ctx.labDarkFrameMat);
      pocket.position.set(bx, 3.22, 0.04);
      const backlight = new THREE.Mesh(bayBacklightGeo, ctx.deckTrimCyanMat);
      backlight.position.set(bx, 3.05, 0.22);
      wallRoot.add(pocket, backlight);

      const podGroup = new THREE.Group();
      podGroup.position.set(bx, 0.55, 0.42);
      const botCollar = new THREE.Mesh(collarGeo, ctx.labWhiteMat);
      const topCollar = new THREE.Mesh(collarGeo, ctx.labWhiteMat);
      topCollar.rotation.x = Math.PI;
      topCollar.position.y = 4.95;

      const fluid = new THREE.Mesh(cryoFluidGeo, cryoFluidMat);
      fluid.position.y = 2.48;
      fluid.renderOrder = 1;
      const glass = new THREE.Mesh(cryoGlassGeo, glassMat);
      glass.position.y = 2.48;
      glass.renderOrder = 2;

      const valveFront = new THREE.Mesh(valveRingGeo, ctx.labSlateMat);
      valveFront.position.set(0, 0.42, 0.82);

      // Animated bubble cluster inside capsule
      const bubbleGroup = new THREE.Group();
      for (let b = 0; b < 5; b++) {
        const bm = new THREE.Mesh(bubbleGeo, cryoBubbleMat);
        bm.position.set(
          Math.cos(b * 1.4) * 0.24,
          1.1 + b * 0.62,
          Math.sin(b * 1.4) * 0.24
        );
        bubbleGroup.add(bm);
      }
      podGroup.add(botCollar, topCollar, fluid, glass, valveFront, bubbleGroup);
      wallRoot.add(podGroup);
      ctx.animHandles.cryoBubbleGroups.push({
        group: bubbleGroup,
        baseY: 0,
        phase: (sx < 0 ? 0 : 1.7) + (bx < 0 ? 0.3 : 2.1),
      });

      if (cryoMistTex) {
        const mistMat = new THREE.MeshBasicMaterial({
          map: cryoMistTex,
          color: '#e0f2fe',
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        });
        ctx.ownedMats.push(mistMat);
        ctx.animHandles.cryoMistMats.push(mistMat);
        const mistMesh = new THREE.Mesh(mistGeo, mistMat);
        mistMesh.rotation.x = -Math.PI / 2;
        mistMesh.position.set(bx, 0.08, 1.35);
        mistMesh.renderOrder = 3;
        wallRoot.add(mistMesh);
      }
    }
    ctx.group.add(wallRoot);
  }

  // 3. Two Side Mainframe Wings (x = ±11.2m, z = -4.64..+4.64, flush with diagonal miter columns)
  const sideWallGeo = createChamferPanelXYGeometry(9.28, 6.2, 0.56, 0.14, 0.02);
  const serverChassisGeo = createChamferSlabGeometry(1.14, 2.95, 1.48, 0.1, 0.018);
  const serverGlassGeo = new THREE.BoxGeometry(0.1, 2.45, 1.16);
  const serverLedGeo = new THREE.BoxGeometry(0.06, 0.14, 0.92);
  const busbarGeo = createChamferSlabGeometry(1.05, 0.22, 5.4, 0.08, 0.014);
  ctx.ownedGeos.push(sideWallGeo, serverChassisGeo, serverGlassGeo, serverLedGeo, busbarGeo);

  const serverCountPerSide = 3;
  const chassisInst = new THREE.InstancedMesh(serverChassisGeo, ctx.labWhiteMat, serverCountPerSide * 2);
  const glassInst = new THREE.InstancedMesh(serverGlassGeo, glassMat, serverCountPerSide * 2);
  const ledInst = new THREE.InstancedMesh(serverLedGeo, ctx.deckTrimCyanMat, serverCountPerSide * 2 * 4);
  chassisInst.castShadow = true;
  chassisInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let cIdx = 0;
  let lIdx = 0;
  for (const sx of [-1, 1]) {
    const sideGroup = new THREE.Group();
    sideGroup.position.set(sx * 11.2, 0, 0);
    sideGroup.rotation.y = -sx * (Math.PI / 2);
    const wallPanel = new THREE.Mesh(sideWallGeo, ctx.labWhiteMat);
    wallPanel.position.set(0, 3.1, -0.28);
    enableShadows(wallPanel, true, true);
    sideGroup.add(wallPanel);
    ctx.group.add(sideGroup);

    // Flush horizontal busbar duct anchored right on top of all 3 server cabinets and into side wall
    const busbar = new THREE.Mesh(busbarGeo, ctx.labSlateMat);
    busbar.position.set(sx * 10.42, 2.96, 0);
    enableShadows(busbar, true, true);
    ctx.group.add(busbar);

    for (let s = 0; s < serverCountPerSide; s++) {
      const sz = -1.95 + s * 1.95;
      const worldX = sx * 10.28;
      dummy.position.set(worldX, 0.02, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      chassisInst.setMatrixAt(cIdx, dummy.matrix);

      dummy.position.set(worldX - sx * 0.54, 1.5, sz);
      dummy.updateMatrix();
      glassInst.setMatrixAt(cIdx, dummy.matrix);
      cIdx++;

      for (let b = 0; b < 4; b++) {
        dummy.position.set(worldX - sx * 0.46, 0.72 + b * 0.56, sz);
        dummy.updateMatrix();
        ledInst.setMatrixAt(lIdx++, dummy.matrix);
      }
    }
  }
  chassisInst.instanceMatrix.needsUpdate = true;
  glassInst.instanceMatrix.needsUpdate = true;
  ledInst.instanceMatrix.needsUpdate = true;
  ctx.group.add(chassisInst, glassInst, ledInst);
}

export function buildLabCeilingCanopyAndArms(ctx: LabBunkerBuildCtx): void {
  // Single seamless Cleanroom Rear Ceiling Soffit (y = 10.65m, z = -11.1..-5.6) clearing the 2x APEX Tube
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 10.65, -8.35);

  const ceilingSlabGeo = createChamferSlabGeometry(16.2, 0.36, 5.5, 0.65, 0.02);
  const soffitTrimGeo = new THREE.BoxGeometry(14.8, 0.08, 0.14);
  const lightPanelFrameGeo = createChamferSlabGeometry(2.5, 0.08, 0.72, 0.08, 0.01);
  const lightPanelLedGeo = new THREE.BoxGeometry(2.25, 0.05, 0.48);
  ctx.ownedGeos.push(ceilingSlabGeo, soffitTrimGeo, lightPanelFrameGeo, lightPanelLedGeo);

  const ceilingSlab = new THREE.Mesh(ceilingSlabGeo, ctx.labWhiteMat);
  enableShadows(ceilingSlab, true, true);
  const frontSoffitTrim = new THREE.Mesh(soffitTrimGeo, ctx.labSlateMat);
  frontSoffitTrim.position.set(0, -0.02, 2.68);
  canopyGroup.add(ceilingSlab, frontSoffitTrim);

  // 4 Flush Recessed Cleanroom Cyan LED Light Panels mounted cleanly to the ceiling underside
  const lightPanelCoords: ReadonlyArray<readonly [number, number]> = [
    [-2.4, 1.45],
    [2.4, 1.45],
    [-5.6, 0.55],
    [5.6, 0.55],
  ];
  const frameInst = new THREE.InstancedMesh(lightPanelFrameGeo, ctx.labSlateMat, lightPanelCoords.length);
  const ledInst = new THREE.InstancedMesh(lightPanelLedGeo, ctx.deckTrimCyanMat, lightPanelCoords.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < lightPanelCoords.length; i++) {
    const [lx, lz] = lightPanelCoords[i];
    dummy.position.set(lx, -0.04, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    frameInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, -0.06, lz);
    dummy.updateMatrix();
    ledInst.setMatrixAt(i, dummy.matrix);
  }
  frameInst.instanceMatrix.needsUpdate = true;
  ledInst.instanceMatrix.needsUpdate = true;
  canopyGroup.add(frameInst, ledInst);
  ctx.group.add(canopyGroup);
}

export function buildLabOperatorConsoles(ctx: LabBunkerBuildCtx): void {
  const screenTex = createLabConsoleTexture();
  if (screenTex) ctx.ownedTextures.push(screenTex);

  const screenMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    ...(screenTex ? { map: screenTex } : { color: '#0ea5e9' }),
  });
  ctx.ownedMats.push(screenMat);

  const baseGeo = createChamferSlabGeometry(0.92, 0.16, 0.68, 0.1, 0.014);
  const pedGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.92, 8);
  const headGeo = createChamferSlabGeometry(1.18, 0.12, 0.78, 0.08, 0.012);
  const faceGeo = new THREE.PlaneGeometry(0.98, 0.62);
  ctx.ownedGeos.push(baseGeo, pedGeo, headGeo, faceGeo);

  // Placed cleanly beside Circular Dais (z = -6.45) and clear of Ore Vats & Material Podiums
  for (const sx of [-1, 1]) {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(sx * 4.75, 0.02, -3.15);
    consoleGroup.rotation.y = -sx * 0.55;

    const base = new THREE.Mesh(baseGeo, ctx.labSlateMat);
    const ped = new THREE.Mesh(pedGeo, ctx.labSilverMat);
    ped.position.y = 0.52;
    const head = new THREE.Mesh(headGeo, ctx.labWhiteMat);
    head.position.set(0, 1.02, 0.05);
    head.rotation.x = 0.48;
    const face = new THREE.Mesh(faceGeo, screenMat);
    face.rotation.x = -Math.PI / 2;
    face.position.set(0, 0.128, 0);
    head.add(face);
    enableShadows(base, true, true);
    enableShadows(ped, true, true);
    enableShadows(head, true, true);
    consoleGroup.add(base, ped, head);
    ctx.group.add(consoleGroup);
  }
}

export function buildOreContainmentVat(
  ctx: LabBunkerBuildCtx,
  x: number,
  z: number,
  scale: number
): THREE.Group {
  const vatGroup = new THREE.Group();
  vatGroup.position.set(x, 0.02, z);
  vatGroup.scale.setScalar(scale);

  const padGeo = createChamferSlabGeometry(1.48, 0.14, 1.48, 0.34, 0.018);
  const collarGeo = createLatheProfileGeometry(
    [
      [0.01, 0],
      [0.64, 0],
      [0.66, 0.12],
      [0.54, 0.22],
      [0.01, 0.25],
    ],
    16
  );
  const capHubGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.08, 12);
  const capGlowGeo = new THREE.TorusGeometry(0.54, 0.022, 6, 20);
  const glassGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.56, 16, 1, true);
  const strutGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.62, 6);
  const portGeo = new THREE.BoxGeometry(0.18, 0.09, 0.28);
  ctx.ownedGeos.push(padGeo, collarGeo, capHubGeo, capGlowGeo, glassGeo, strutGeo, portGeo);

  const vatGlassMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  ctx.ownedMats.push(vatGlassMat);

  const pad = new THREE.Mesh(padGeo, ctx.labWhiteMat);
  const botCollar = new THREE.Mesh(collarGeo, ctx.labSilverMat);
  botCollar.position.y = 0.12;
  const topCollar = new THREE.Mesh(collarGeo, ctx.labWhiteMat);
  topCollar.position.y = 1.88;
  const capHub = new THREE.Mesh(capHubGeo, ctx.labSlateMat);
  capHub.position.y = 2.14;
  const capGlow = new THREE.Mesh(capGlowGeo, ctx.deckTrimCyanMat);
  capGlow.rotation.x = Math.PI / 2;
  capGlow.position.y = 1.92;
  const glass = new THREE.Mesh(glassGeo, vatGlassMat);
  glass.position.y = 1.12;
  glass.renderOrder = 2;

  enableShadows(pad, true, true);
  enableShadows(botCollar, true, true);
  enableShadows(topCollar, true, true);
  vatGroup.add(pad, botCollar, topCollar, capHub, capGlow, glass);

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const strut = new THREE.Mesh(strutGeo, ctx.labSlateMat);
    strut.position.set(Math.cos(a) * 0.58, 1.12, Math.sin(a) * 0.58);
    vatGroup.add(strut);
  }

  // Flush dark-slate intake housing anchored against the vat pad rim (no dangling pale pipe bar)
  const port = new THREE.Mesh(portGeo, ctx.labSlateMat);
  port.position.set(x > 0 ? -0.72 : 0.72, 0.055, 0);
  port.rotation.y = Math.PI / 2;
  vatGroup.add(port);

  return vatGroup;
}
