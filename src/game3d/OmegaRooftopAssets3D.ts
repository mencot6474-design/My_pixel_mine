import * as THREE from 'three';
import {
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';

export interface RooftopAssetsCtx {
  ownedTextures: THREE.Texture[];
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  concreteMat: THREE.Material;
  concreteLightMat: THREE.Material;
  steelMat: THREE.Material;
  goldAccentMat: THREE.Material;
}

/**
 * Remaps ExtrudeGeometry top-surface UVs cleanly to [0..1] across width × depth
 * so canvas textures span the full rooftop deck without stretching.
 */
export function normalizeHorizontalSlabUVs(
  geo: THREE.BufferGeometry,
  width: number,
  depth: number,
  centerX = 0,
  centerZ = 0
): void {
  const posAttr = geo.getAttribute('position');
  const uvAttr = geo.getAttribute('uv');
  if (!posAttr || !uvAttr) return;
  const invW = width > 0 ? 1 / width : 1;
  const invD = depth > 0 ? 1 / depth : 1;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i) - centerX;
    const z = posAttr.getZ(i) - centerZ;
    const u = Math.max(0, Math.min(1, x * invW + 0.5));
    const v = Math.max(0, Math.min(1, z * invD + 0.5));
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;
}

/** Bright anime Crimson-Gold Sunset sky dome texture (high-visibility golden hour). */
export function createOmegaSunsetSkyTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#4f46e5');
  grad.addColorStop(0.24, '#7c3aed');
  grad.addColorStop(0.46, '#ec4899');
  grad.addColorStop(0.64, '#fb7185');
  grad.addColorStop(0.78, '#fb923c');
  grad.addColorStop(0.9, '#fde047');
  grad.addColorStop(1.0, '#fed7aa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Radiant setting sun behind the central city corridor
  const sunX = 512;
  const sunY = 276;
  const halo = ctx.createRadialGradient(sunX, sunY, 18, sunX, sunY, 235);
  halo.addColorStop(0.0, 'rgba(255, 253, 235, 0.98)');
  halo.addColorStop(0.2, 'rgba(254, 240, 138, 0.82)');
  halo.addColorStop(0.55, 'rgba(251, 146, 60, 0.36)');
  halo.addColorStop(1.0, 'rgba(251, 113, 133, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 250, sunY - 250, 500, 500);

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
  ctx.fill();

  // Layered golden-hour clouds
  const clouds: Array<[number, number, number, number, string]> = [
    [150, 146, 125, 22, 'rgba(254, 215, 170, 0.38)'],
    [310, 184, 150, 26, 'rgba(253, 186, 116, 0.44)'],
    [715, 160, 160, 24, 'rgba(254, 215, 170, 0.40)'],
    [865, 204, 115, 20, 'rgba(253, 164, 175, 0.36)'],
    [512, 120, 195, 24, 'rgba(254, 240, 138, 0.28)'],
  ];
  for (const [cx, cy, rx, ry, fill] of clouds) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant horizon skyline silhouette spires
  ctx.fillStyle = 'rgba(124, 45, 18, 0.20)';
  for (let x = 0; x < 1024; x += 26) {
    const h = 24 + ((x * 19) % 48);
    ctx.fillRect(x, 384 - h, 20, h + 128);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** High-resolution rooftop helipad concrete texture with crisp markings and hazard chevrons. */
export function createRooftopHelipadTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Bright weathered architectural rooftop concrete
  const bgGrad = ctx.createRadialGradient(512, 512, 80, 512, 512, 680);
  bgGrad.addColorStop(0, '#5a6882');
  bgGrad.addColorStop(1, '#46536b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle concrete slab grid & expansion joints
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.14)';
  ctx.lineWidth = 3;
  for (let i = 64; i < 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Deterministic subtle surface texture speckles
  for (let i = 0; i < 420; i++) {
    const sx = (i * 197) % 1024;
    const sy = (i * 313) % 1024;
    const sr = 2 + (i % 4);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)';
    ctx.fillRect(sx, sy, sr, sr);
  }

  // Perimeter yellow-black hazard border stripes
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, 952, 952);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, 924, 924);

  // Diagonal caution chevrons along inner corners
  ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
  for (const [bx, by] of [
    [66, 66],
    [894, 66],
    [66, 894],
    [894, 894],
  ]) {
    for (let k = 0; k < 3; k++) {
      ctx.fillRect(bx + k * 22, by, 12, 64);
    }
  }

  // Bold Helipad concentric landing circles centered under combat zone
  const cx = 512;
  const cy = 500;
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.82)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, 310, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.48)';
  ctx.lineWidth = 8;
  ctx.setLineDash([40, 26]);
  ctx.beginPath();
  ctx.arc(cx, cy, 262, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cardinal approach bars (N/S/E/W)
  ctx.fillStyle = 'rgba(254, 240, 138, 0.78)';
  ctx.fillRect(cx - 10, cy - 355, 20, 42);
  ctx.fillRect(cx - 10, cy + 313, 20, 42);
  ctx.fillRect(cx - 355, cy - 10, 42, 20);
  ctx.fillRect(cx + 313, cy - 10, 42, 20);

  // Dashed approach guide lanes & stencil markings on front/flanks
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.34)';
  ctx.lineWidth = 6;
  ctx.setLineDash([24, 18]);
  for (const laneX of [220, 804]) {
    ctx.beginPath();
    ctx.moveTo(laneX, 140);
    ctx.lineTo(laneX, 884);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Painted industrial helipad deck stencils
  ctx.fillStyle = 'rgba(254, 240, 138, 0.52)';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('APEX-01 // MAX 50T', 512, 902);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  ctx.font = '800 18px sans-serif';
  ctx.fillText('CAUTION JET BLAST', 220, 114);
  ctx.fillText('CAUTION JET BLAST', 804, 114);

  // Corner drainage grates
  ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
  for (const [gx, gy] of [
    [130, 820],
    [844, 820],
    [130, 170],
    [844, 170],
  ]) {
    ctx.fillRect(gx, gy, 50, 26);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cyber-corporate rooftop neon billboard texture. */
export function createRooftopBillboardTexture(variant: 'crimson' | 'cyan'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const isCrimson = variant === 'crimson';
  ctx.fillStyle = isCrimson ? '#2a0c18' : '#092234';
  ctx.fillRect(0, 0, 512, 256);

  // Diagonal cyber header stripe
  ctx.fillStyle = isCrimson ? '#f43f5e' : '#06b6d4';
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillRect(0, 224, 512, 32);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let y = 40; y < 220; y += 10) {
    ctx.fillRect(0, y, 512, 3);
  }

  // Border frame
  ctx.strokeStyle = isCrimson ? '#fda4af' : '#67e8f9';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 488, 232);

  // Main corporate display typography
  ctx.fillStyle = '#fffbeb';
  ctx.font = '900 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isCrimson ? 'OMEGA // APEX' : 'CHRONO TOWER', 256, 114);

  ctx.fillStyle = isCrimson ? '#fde047' : '#67e8f9';
  ctx.font = '800 26px sans-serif';
  ctx.fillText(isCrimson ? 'SECTOR-01 HELIPAD' : 'DUEL SANCTUM ROOF', 256, 174);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Warm sunlit sunset mist texture for the city abyss far below the rooftops. */
export function createCityMistTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
  g.addColorStop(0.0, 'rgba(254, 215, 170, 0.88)');
  g.addColorStop(0.55, 'rgba(253, 164, 175, 0.65)');
  g.addColorStop(1.0, 'rgba(251, 146, 60, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Multi-part rooftop HVAC chiller unit with fan shroud, blades & cooling pipe elbow. */
export function buildRooftopHvacUnit(ctx: RooftopAssetsCtx): { group: THREE.Group; blade: THREE.Object3D } {
  const group = new THREE.Group();
  const skidGeo = createChamferSlabGeometry(1.95, 0.14, 1.5, 0.12, 0.02);
  const bodyGeo = createChamferSlabGeometry(1.75, 0.84, 1.32, 0.14, 0.02);
  const ventGeo = createChamferSlabGeometry(0.95, 0.45, 0.08, 0.04, 0.01);
  const shroudGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.16, 10);
  const bladeGeo = new THREE.BoxGeometry(0.68, 0.04, 0.12);
  const pipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6);
  ctx.ownedGeos.push(skidGeo, bodyGeo, ventGeo, shroudGeo, bladeGeo, pipeGeo);

  const skid = new THREE.Mesh(skidGeo, ctx.steelMat);
  const body = new THREE.Mesh(bodyGeo, ctx.concreteMat);
  body.position.y = 0.14;
  enableShadows(skid);
  enableShadows(body);

  const vent = new THREE.Mesh(ventGeo, ctx.steelMat);
  vent.position.set(0, 0.34, 0.68);
  const shroud = new THREE.Mesh(shroudGeo, ctx.steelMat);
  shroud.position.y = 1.06;
  const blade = new THREE.Mesh(bladeGeo, ctx.concreteLightMat);
  blade.position.y = 1.12;
  const pipe = new THREE.Mesh(pipeGeo, ctx.concreteLightMat);
  pipe.position.set(0.65, 0.45, -0.58);

  group.add(skid, body, vent, shroud, blade, pipe);
  return { group, blade };
}

/** Sculpted rooftop penthouse stairwell bulkhead with overhang roof, door lamp, ladder & roof stack. */
export function buildRooftopBulkhead(ctx: RooftopAssetsCtx): THREE.Group {
  const group = new THREE.Group();
  const baseGeo = createChamferSlabGeometry(1.9, 1.75, 2.2, 0.14, 0.02);
  const roofGeo = createChamferSlabGeometry(2.24, 0.22, 2.54, 0.16, 0.025);
  const doorGeo = createChamferSlabGeometry(0.84, 1.28, 0.1, 0.05, 0.01);
  const thresholdGeo = createChamferSlabGeometry(1.1, 0.1, 0.35, 0.04, 0.01);
  const lampGeo = createChamferSlabGeometry(0.42, 0.1, 0.14, 0.03, 0.01);
  const ventStackGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.56, 8);
  const ladderRailGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.85, 5);
  ctx.ownedGeos.push(baseGeo, roofGeo, doorGeo, thresholdGeo, lampGeo, ventStackGeo, ladderRailGeo);

  const base = new THREE.Mesh(baseGeo, ctx.concreteMat);
  const roof = new THREE.Mesh(roofGeo, ctx.concreteLightMat);
  roof.position.y = 1.75;
  const door = new THREE.Mesh(doorGeo, ctx.steelMat);
  door.position.set(0, 0.1, 1.12);
  const threshold = new THREE.Mesh(thresholdGeo, ctx.goldAccentMat);
  threshold.position.set(0, 0, 1.24);
  const doorLamp = new THREE.Mesh(lampGeo, ctx.goldAccentMat);
  doorLamp.position.set(0, 1.5, 1.14);
  const ventStack = new THREE.Mesh(ventStackGeo, ctx.steelMat);
  ventStack.position.set(-0.42, 2.25, -0.35);
  for (const lx of [-0.22, 0.22]) {
    const rail = new THREE.Mesh(ladderRailGeo, ctx.concreteLightMat);
    rail.position.set(0.98, 0.92, lx);
    group.add(rail);
  }
  enableShadows(base);
  enableShadows(roof);

  group.add(base, roof, door, threshold, doorLamp, ventStack);
  return group;
}

/** Rooftop floodlight mast angled toward the central Boss Dais. */
export function buildRooftopSpotlightTower(ctx: RooftopAssetsCtx): THREE.Group {
  const group = new THREE.Group();
  const plinthGeo = createChamferSlabGeometry(0.9, 0.24, 0.9, 0.14, 0.02);
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.2, 6);
  const headGeo = createChamferSlabGeometry(0.95, 0.36, 0.42, 0.08, 0.015);
  const lensGeo = new THREE.PlaneGeometry(0.76, 0.24);
  ctx.ownedGeos.push(plinthGeo, poleGeo, headGeo, lensGeo);

  const plinth = new THREE.Mesh(plinthGeo, ctx.steelMat);
  const pole = new THREE.Mesh(poleGeo, ctx.steelMat);
  pole.position.y = 1.82;
  const head = new THREE.Mesh(headGeo, ctx.concreteLightMat);
  head.position.set(0, 3.45, 0.12);
  head.rotation.x = 0.36;
  const lens = new THREE.Mesh(lensGeo, ctx.goldAccentMat);
  lens.position.set(0, 3.38, 0.34);
  lens.rotation.x = 0.36;
  enableShadows(plinth);
  enableShadows(pole);

  group.add(plinth, pole, head, lens);
  return group;
}

/** Grounded Megacorp cyber billboard elevated cleanly on dual steel gantry pylons. */
export function buildRooftopBillboard(
  ctx: RooftopAssetsCtx,
  variant: 'crimson' | 'cyan'
): THREE.Group {
  const group = new THREE.Group();
  const footGeo = createChamferSlabGeometry(2.35, 0.2, 0.72, 0.1, 0.015);
  const legGeo = new THREE.CylinderGeometry(0.065, 0.09, 2.15, 6);
  const braceGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.55, 5);
  const frameGeo = createChamferSlabGeometry(2.75, 1.42, 0.22, 0.12, 0.02);
  const capLampGeo = createChamferSlabGeometry(0.32, 0.1, 0.16, 0.03, 0.01);
  const screenGeo = new THREE.PlaneGeometry(2.42, 1.16);
  ctx.ownedGeos.push(footGeo, legGeo, braceGeo, frameGeo, capLampGeo, screenGeo);

  const tex = createRooftopBillboardTexture(variant);
  if (tex) ctx.ownedTextures.push(tex);
  const screenMat = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : variant === 'crimson' ? 0xfb7185 : 0x38bdf8,
    ...(tex ? { map: tex, emissiveMap: tex } : {}),
    emissive: variant === 'crimson' ? 0xf43f5e : 0x22d3ee,
    emissiveIntensity: 0.95,
    roughness: 0.25,
  });
  ctx.ownedMats.push(screenMat);

  const foot = new THREE.Mesh(footGeo, ctx.steelMat);
  enableShadows(foot);
  for (const sx of [-0.78, 0.78]) {
    const leg = new THREE.Mesh(legGeo, ctx.steelMat);
    leg.position.set(sx, 1.25, 0);
    const brace = new THREE.Mesh(braceGeo, ctx.concreteLightMat);
    brace.position.set(sx, 0.85, -0.22);
    brace.rotation.x = 0.34;
    const capLamp = new THREE.Mesh(capLampGeo, ctx.goldAccentMat);
    capLamp.position.set(sx, 3.58, 0.06);
    group.add(leg, brace, capLamp);
  }
  const frame = new THREE.Mesh(frameGeo, ctx.steelMat);
  frame.position.y = 2.15;
  enableShadows(frame);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 2.86, 0.15);

  group.add(foot, frame, screen);
  return group;
}

/**
 * High-contrast 1024×1024 dark-backed Omega Command Circle texture for the Boss Dais & floor ring.
 * Uses a dark inner backdrop disc so gold/white/crimson cyber runes pop cleanly on bright rooftops.
 */
export function createOmegaBossCircleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const mid = 512;
  ctx.clearRect(0, 0, 1024, 1024);

  // Dark contrast disc fading cleanly at outer boundary
  const baseGrad = ctx.createRadialGradient(mid, mid, 120, mid, mid, 496);
  baseGrad.addColorStop(0.0, 'rgba(12, 16, 30, 0.88)');
  baseGrad.addColorStop(0.76, 'rgba(15, 21, 38, 0.78)');
  baseGrad.addColorStop(0.94, 'rgba(20, 28, 48, 0.42)');
  baseGrad.addColorStop(1.0, 'rgba(20, 28, 48, 0.0)');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(mid, mid, 496, 0, Math.PI * 2);
  ctx.fill();

  // Concentric precision mechanical rings
  const ringDefs: Array<[number, number, string]> = [
    [474, 8, 'rgba(255, 255, 255, 0.92)'],
    [442, 4, 'rgba(255, 255, 255, 0.58)'],
    [392, 10, 'rgba(255, 255, 255, 0.85)'],
    [324, 4, 'rgba(255, 255, 255, 0.55)'],
    [252, 7, 'rgba(255, 255, 255, 0.82)'],
    [164, 4, 'rgba(255, 255, 255, 0.48)'],
  ];
  for (const [r, lw, stroke] of ringDefs) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Segmented outer arc bands
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 14;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + 0.08;
    const a1 = ((i + 1) / 8) * Math.PI * 2 - 0.08;
    ctx.beginPath();
    ctx.arc(mid, mid, 418, a0, a1);
    ctx.stroke();
  }

  // 72 Precision compass degree ticks + 12 heavy cardinal markers
  for (let i = 0; i < 72; i++) {
    const ang = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const r0 = isMajor ? 440 : 454;
    const r1 = 472;
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = isMajor ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(ang) * r0, mid + Math.sin(ang) * r0);
    ctx.lineTo(mid + Math.cos(ang) * r1, mid + Math.sin(ang) * r1);
    ctx.stroke();
  }

  // Dual rotated 8-point cyber-runic star frames
  for (let rot = 0; rot < 2; rot++) {
    const offset = rot * (Math.PI / 8);
    const r = rot === 0 ? 356 : 292;
    ctx.strokeStyle = rot === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = rot === 0 ? 4.5 : 3;
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const a = (s / 8) * Math.PI * 2 + offset;
      const x = mid + Math.cos(a) * r;
      const y = mid + Math.sin(a) * r;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 16 Radial circuit spokes + terminal diamond nodes
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r0 = i % 2 === 0 ? 164 : 252;
    const r1 = i % 2 === 0 ? 392 : 356;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = i % 2 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
    ctx.lineTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1, i % 2 === 0 ? 7 : 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the non-pillar "Helipad Jet-Blast Deflector & Swept V-Wing Command Array" behind the Boss:
 * - Central stepped armored Reactor Console + Emitter Dish + cradled Core Crystal
 * - Twin angled Jet-Blast Deflector armor shields with rear hydraulic struts & hazard louvers
 * - Swept V-Wing cyber armor fins fanning outward to frame the Boss without obstructing the sunset sky
 */
export function buildRooftopCommandBackdrop(
  armorDarkMat: THREE.Material,
  armorSteelMat: THREE.Material,
  brightSteelMat: THREE.Material,
  trimNeonMat: THREE.Material,
  secondaryNeonMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): { group: THREE.Group; crystalMesh: THREE.Mesh; crystalBaseY: number } {
  const group = new THREE.Group();

  // 1. Central Stepped Helipad Command Console & Reactor Dish
  const consoleBaseGeo = createChamferSlabGeometry(3.5, 0.42, 1.35, 0.24, 0.03);
  const consoleDeckGeo = createChamferSlabGeometry(2.6, 0.56, 0.96, 0.18, 0.025);
  const consoleLouverGeo = createChamferSlabGeometry(1.9, 0.12, 0.14, 0.04, 0.01);
  const dishGeo = createLatheProfileGeometry(
    [
      [0.42, 0.0],
      [0.64, 0.16],
      [0.72, 0.3],
      [0.54, 0.34],
    ],
    10
  );
  const crystalGeo = new THREE.OctahedronGeometry(0.46, 0);

  const consoleBase = new THREE.Mesh(consoleBaseGeo, armorDarkMat);
  const consoleDeck = new THREE.Mesh(consoleDeckGeo, armorSteelMat);
  consoleDeck.position.set(0, 0.42, 0);
  enableShadows(consoleBase);
  enableShadows(consoleDeck);
  group.add(consoleBase, consoleDeck);

  for (let i = 0; i < 2; i++) {
    const louver = new THREE.Mesh(consoleLouverGeo, i === 0 ? trimNeonMat : secondaryNeonMat);
    louver.position.set(0, 0.52 + i * 0.2, 0.48);
    group.add(louver);
  }

  const emitterDish = new THREE.Mesh(dishGeo, brightSteelMat);
  emitterDish.position.set(0, 0.98, 0);
  enableShadows(emitterDish);
  const crystalBaseY = 1.92;
  const crystalMesh = new THREE.Mesh(crystalGeo, trimNeonMat);
  crystalMesh.position.set(0, crystalBaseY, 0);
  group.add(emitterDish, crystalMesh);

  // 2. Twin Angled Helipad Jet-Blast Deflectors + Rear Hydraulic Piston Struts
  const shoeGeo = createChamferSlabGeometry(3.2, 0.2, 1.2, 0.16, 0.02);
  const shieldGeo = createExtrudedProfileGeometry(
    [
      [-1.45, 0],
      [1.45, 0],
      [1.22, 1.65],
      [-1.22, 1.65],
    ],
    0.26,
    0.025
  );
  const shieldRibGeo = createChamferSlabGeometry(0.18, 1.48, 0.32, 0.04, 0.012);
  const shieldTrimGeo = createChamferSlabGeometry(2.26, 0.12, 0.32, 0.05, 0.012);
  const strutGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.45, 6);

  // 3. Swept V-Wing Cyber Armor Fins (layered tapered blades fanning outward at +-42 deg)
  const mainWingGeo = createExtrudedProfileGeometry(
    [
      [-0.36, 0.0],
      [0.36, 0.0],
      [0.64, 2.35],
      [0.0, 3.35],
      [-0.42, 2.15],
    ],
    0.2,
    0.02
  );
  const wingInlayGeo = createExtrudedProfileGeometry(
    [
      [-0.1, 0.28],
      [0.1, 0.28],
      [0.24, 2.15],
      [0.0, 2.95],
      [-0.14, 1.95],
    ],
    0.24,
    0.01
  );
  const subWingGeo = createExtrudedProfileGeometry(
    [
      [-0.24, 0.0],
      [0.24, 0.0],
      [0.44, 1.55],
      [0.0, 2.3],
      [-0.28, 1.45],
    ],
    0.16,
    0.018
  );

  ownedGeos.push(
    consoleBaseGeo,
    consoleDeckGeo,
    consoleLouverGeo,
    dishGeo,
    crystalGeo,
    shoeGeo,
    shieldGeo,
    shieldRibGeo,
    shieldTrimGeo,
    strutGeo,
    mainWingGeo,
    wingInlayGeo,
    subWingGeo
  );

  for (const sx of [-1, 1]) {
    const flank = new THREE.Group();
    flank.position.set(sx * 3.45, 0, -0.05);
    flank.rotation.y = -sx * 0.22;

    const shoe = new THREE.Mesh(shoeGeo, armorDarkMat);
    enableShadows(shoe);
    flank.add(shoe);

    // Angled blast shield panel sloping backward away from arena
    const shieldPivot = new THREE.Group();
    shieldPivot.position.set(0, 0.2, 0.22);
    shieldPivot.rotation.x = -0.42;
    const shield = new THREE.Mesh(shieldGeo, armorSteelMat);
    enableShadows(shield);
    shieldPivot.add(shield);

    for (const rx of [-0.85, 0, 0.85]) {
      const rib = new THREE.Mesh(shieldRibGeo, brightSteelMat);
      rib.position.set(rx, 0.06, 0);
      shieldPivot.add(rib);
    }
    const upperTrim = new THREE.Mesh(shieldTrimGeo, secondaryNeonMat);
    upperTrim.position.set(0, 1.54, 0);
    shieldPivot.add(upperTrim);
    flank.add(shieldPivot);

    // Rear hydraulic struts supporting the blast deflector
    for (const px of [-0.95, 0.95]) {
      const strut = new THREE.Mesh(strutGeo, brightSteelMat);
      strut.position.set(px, 0.68, -0.35);
      strut.rotation.x = 0.56;
      flank.add(strut);
    }

    // Swept V-Wing Cyber Fins fanning diagonally outward behind the console
    const wingBase = new THREE.Group();
    wingBase.position.set(sx * 0.55, 0.45, -0.45);
    wingBase.rotation.z = -sx * 0.64;

    const mainWing = new THREE.Mesh(mainWingGeo, armorDarkMat);
    const inlay = new THREE.Mesh(wingInlayGeo, trimNeonMat);
    enableShadows(mainWing);
    wingBase.add(mainWing, inlay);

    const subWingPivot = new THREE.Group();
    subWingPivot.position.set(sx * 0.45, -0.1, -0.18);
    subWingPivot.rotation.z = -sx * 0.34;
    const subWing = new THREE.Mesh(subWingGeo, armorSteelMat);
    const subTrim = new THREE.Mesh(wingInlayGeo, secondaryNeonMat);
    subTrim.scale.set(0.68, 0.68, 0.72);
    enableShadows(subWing);
    subWingPivot.add(subWing, subTrim);

    flank.add(wingBase, subWingPivot);
    group.add(flank);
  }

  return { group, crystalMesh, crystalBaseY };
}
