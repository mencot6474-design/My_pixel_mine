import * as THREE from 'three';

export interface TowerCityEnvironmentHandle {
  group: THREE.Group;
  setBossState: (isBossWave: boolean, isBossMode: boolean, anomalyColorHex: string) => void;
  update: (dtSec: number, elapsed: number) => void;
  dispose: () => void;
}

interface FlickerLightRef {
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
  baseIntensity: number;
}

const ARENA_CENTER_Z = -1.6;
const CRATER_FLOOR_Y = 0.08;
const ROAD_Y = 0.52;
const SIDEWALK_Y = 0.88;
const HIGHWAY_HALF_W = 7.4;
const CRATER_FLOOR_R = 6.8;
const CRATER_HOLE_R = 7.25;

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createExtrudedChamferSlab(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.025
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.4, hd * 0.4);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();

  const innerH = Math.max(0.02, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

function createGuardrailBeamGeometry(lengthZ: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.03, -0.11);
  shape.lineTo(0.02, -0.11);
  shape.lineTo(0.04, -0.05);
  shape.lineTo(0.0, 0.0);
  shape.lineTo(0.04, 0.05);
  shape.lineTo(0.02, 0.11);
  shape.lineTo(-0.03, 0.11);
  shape.lineTo(-0.01, 0.05);
  shape.lineTo(-0.04, 0.0);
  shape.lineTo(-0.01, -0.05);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthZ,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.translate(0, 0, -lengthZ * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the extruded highway asphalt slab with a true jagged 3D meteorite hole carved out
 * centered at (0, ARENA_CENTER_Z), with world-aligned lane UVs.
 */
function createHoledHighwayGeometry(
  halfW: number,
  zMin: number,
  zMax: number,
  holeCenterZ: number,
  holeRadius: number
): THREE.ExtrudeGeometry {
  // Shape XY lies on XZ ground after rotateX(-PI/2): shapeX -> worldX, shapeY -> -worldZ
  const outer = new THREE.Shape();
  outer.moveTo(-halfW, -zMax);
  outer.lineTo(halfW, -zMax);
  outer.lineTo(halfW, -zMin);
  outer.lineTo(-halfW, -zMin);
  outer.closePath();

  // Jagged asymmetrical crater opening (clockwise winding for Shape.holes)
  const hole = new THREE.Path();
  const segs = 32;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const ang = -t * Math.PI * 2;
    const jag = 1 + Math.sin(i * 3.1) * 0.035 + Math.cos(i * 5.7) * 0.02;
    const rx = Math.cos(ang) * holeRadius * jag;
    const ry = -holeCenterZ + Math.sin(ang) * holeRadius * jag;
    if (i === 0) hole.moveTo(rx, ry);
    else hole.lineTo(rx, ry);
  }
  hole.closePath();
  outer.holes.push(hole);

  const depth = ROAD_Y - CRATER_FLOOR_Y; // 0.44m deep real cut!
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, CRATER_FLOOR_Y, 0);

  // Remap UVs cleanly to world highway width so dashed lane lines align seamlessly around the crater
  const posAttr = geo.getAttribute('position');
  const uvAttr = geo.getAttribute('uv');
  for (let i = 0; i < posAttr.count; i++) {
    const wx = posAttr.getX(i);
    const wz = posAttr.getZ(i);
    const u = (wx + halfW) / (halfW * 2);
    const v = (wz - zMin) / 16.0;
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a jagged triangular cluster of broken window glass shards projecting inward from window sills.
 */
function createShatteredGlassShardGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    // Upper-left jagged dagger
    -0.5, 0.5, 0.0,
    -0.12, 0.5, 0.0,
    -0.36, 0.02, 0.02,

    // Upper-right splinter
    0.1, 0.5, 0.0,
    0.5, 0.5, 0.0,
    0.26, 0.12, -0.02,

    // Lower-left spike
    -0.5, -0.5, 0.0,
    -0.06, -0.5, 0.0,
    -0.32, -0.1, -0.015,

    // Lower-right jagged shard
    0.14, -0.5, 0.0,
    0.5, -0.5, 0.0,
    0.34, -0.04, 0.02,

    // Side splinter left
    -0.5, 0.18, 0.0,
    -0.5, -0.22, 0.0,
    -0.18, 0.0, 0.015,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createCyberCitySkyTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#02040b');
  grad.addColorStop(0.32, '#050b1c');
  grad.addColorStop(0.58, '#0c1633');
  grad.addColorStop(0.76, '#131d3d');
  grad.addColorStop(0.9, '#080e20');
  grad.addColorStop(1.0, '#03060f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Faint upper cyber sky grid
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 280);
    ctx.stroke();
  }
  for (let y = 24; y <= 260; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Distant dark city horizon silhouette
  ctx.fillStyle = '#040814';
  for (let i = 0; i < 42; i++) {
    const bx = i * 25;
    const bw = 18 + ((i * 7) % 14);
    const bh = 38 + ((i * 37) % 86);
    ctx.fillRect(bx, 392 - bh, bw, bh + 120);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(245, 158, 11, 0.28)' : 'rgba(56, 189, 248, 0.28)';
    for (let wy = 398 - bh; wy < 380; wy += 12) {
      if ((wy + i) % 4 === 0) {
        ctx.fillRect(bx + 4, wy, 3, 4);
      }
    }
    ctx.fillStyle = '#040814';
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createAsphaltHighwayTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tire wear lanes (4-lane highway)
  for (const lx of [76, 188, 324, 436]) {
    const laneGrad = ctx.createLinearGradient(lx - 40, 0, lx + 40, 0);
    laneGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    laneGrad.addColorStop(0.5, 'rgba(3, 7, 18, 0.45)');
    laneGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = laneGrad;
    ctx.fillRect(lx - 40, 0, 80, 512);
  }

  // Asphalt grain noise
  for (let i = 0; i < 2400; i++) {
    const gx = (i * 197 + 31) % 512;
    const gy = (i * 353 + 17) % 512;
    const shade = (i % 3) * 12 + 24;
    ctx.fillStyle = `rgba(${shade + 10}, ${shade + 16}, ${shade + 26}, 0.35)`;
    ctx.fillRect(gx, gy, (i % 2) + 1, (i % 3) + 1);
  }

  // Faded outer cyan road edge lines
  for (const bx of [14, 493]) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.32)';
    for (let y = 0; y < 512; y += 64) {
      if ((y / 64 + bx) % 5 !== 0) ctx.fillRect(bx, y + 6, 5, 42);
    }
  }

  // Dashed lane lines
  ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
  for (const lx of [132, 376]) {
    for (let y = 8; y < 512; y += 64) {
      if (((y + lx) / 64) % 4 !== 0) ctx.fillRect(lx, y, 5, 36);
    }
  }

  // Center double broken amber lines
  ctx.fillStyle = 'rgba(245, 158, 11, 0.46)';
  for (let y = 4; y < 512; y += 64) {
    if ((y / 64) % 3 !== 1) {
      ctx.fillRect(249, y, 4, 40);
      ctx.fillRect(259, y + 4, 4, 38);
    }
  }

  // Road stress fractures
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
  ctx.lineWidth = 2.5;
  for (let k = 0; k < 14; k++) {
    let cx = ((k * 137 + 40) % 440) + 36;
    let cy = (k * 179 + 20) % 490;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 4; s++) {
      cx += (((k + s) * 29) % 48) - 24;
      cy += 16 + (((k * s) * 13) % 20);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createCraterBedTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const cx = 256;
  const cy = 256;
  const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, 256);
  bg.addColorStop(0.0, '#07080c');
  bg.addColorStop(0.38, '#10131b');
  bg.addColorStop(0.76, '#161922');
  bg.addColorStop(1.0, '#0c0e14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle concentric blast-scorch soot shading
  for (const [rad, alpha] of [
    [72, 0.34],
    [138, 0.2],
    [198, 0.14],
  ] as const) {
    ctx.strokeStyle = `rgba(3, 4, 8, ${alpha})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Deterministic pseudo-random branching charred rock cracks tapering toward outer tips
  const drawBranch = (
    x0: number,
    y0: number,
    angle: number,
    length: number,
    startWidth: number,
    seed: number,
    allowEmber: boolean,
    depth: number
  ): void => {
    if (depth > 2) return;
    let x = x0;
    let y = y0;
    let curAng = angle;
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      const segLen = (length / steps) * (0.8 + (((seed + s * 17) % 5) * 0.1));
      const jitter = ((((seed * (s + 3) * 31) % 21) - 10) / 10) * 0.42;
      curAng += jitter;
      const nx = x + Math.cos(curAng) * segLen;
      const ny = y + Math.sin(curAng) * segLen;
      const w = Math.max(0.8, startWidth * (1 - frac * 0.85));

      // Pale fractured basalt edge bevel highlight
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.22)';
      ctx.lineWidth = w + 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 1);
      ctx.lineTo(nx + 1, ny + 1);
      ctx.stroke();

      // Deep charred black rock crevice
      ctx.strokeStyle = 'rgba(2, 3, 6, 0.94)';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      // Subtle smoldering magma ember trace ONLY in deepest center core
      if (allowEmber && s < 2) {
        ctx.strokeStyle = s === 0 ? 'rgba(194, 65, 12, 0.45)' : 'rgba(154, 52, 18, 0.24)';
        ctx.lineWidth = Math.max(0.8, w * 0.35);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }

      // Asymmetric secondary & tertiary root forks (strictly depth-bounded)
      if (depth < 2 && (s === 1 || s === 3)) {
        const side = (seed + s) % 2 === 0 ? 1 : -1;
        drawBranch(
          nx,
          ny,
          curAng + side * (0.48 + ((seed % 4) * 0.1)),
          length * 0.44,
          w * 0.65,
          seed + s * 29 + 7,
          false,
          depth + 1
        );
      }

      x = nx;
      y = ny;
    }
  };

  const mainCrackAngles = [0.16, 0.98, 1.84, 2.66, 3.55, 4.38, 5.28];
  mainCrackAngles.forEach((ang, idx) => {
    const startR = 14 + (idx % 3) * 4;
    const len = 138 + ((idx * 37) % 52);
    drawBranch(
      cx + Math.cos(ang) * startR,
      cy + Math.sin(ang) * startR,
      ang,
      len,
      5.8 - (idx % 2) * 0.9,
      idx * 43 + 11,
      true,
      0
    );
  });

  // Charred basalt rock grain & ash speckle
  for (let i = 0; i < 2000; i++) {
    const x = (i * 193 + 11) % 512;
    const y = (i * 311 + 29) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 0, 0, 0.42)' : 'rgba(60, 65, 78, 0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates procedural 3D branching, zig-zag, tapering-to-point ground crack ribbons
 * laid flat on the crater basin (charred outer rock fissures + narrow deep-center ember seams).
 */
function createJaggedCraterFissureGeometries(): {
  charredGeo: THREE.BufferGeometry;
  emberGeo: THREE.BufferGeometry;
} {
  const pushTaperedZigZagRibbon = (
    verts: number[],
    pts: THREE.Vector2[],
    startHalfW: number,
    endHalfW: number,
    yPos: number
  ): void => {
    const count = pts.length;
    if (count < 2) return;

    const leftPts: THREE.Vector2[] = [];
    const rightPts: THREE.Vector2[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const hw = startHalfW + (endHalfW - startHalfW) * t;
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(count - 1, i + 1)];
      const dir = new THREE.Vector2().subVectors(next, prev);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0);
      dir.normalize();
      const perp = new THREE.Vector2(-dir.y, dir.x);

      leftPts.push(new THREE.Vector2().copy(pts[i]).addScaledVector(perp, hw));
      rightPts.push(new THREE.Vector2().copy(pts[i]).addScaledVector(perp, -hw));
    }

    for (let i = 0; i < count - 1; i++) {
      const l0 = leftPts[i];
      const r0 = rightPts[i];
      const l1 = leftPts[i + 1];
      const r1 = rightPts[i + 1];

      // Upward-facing (+Y) triangles
      verts.push(
        l0.x, yPos, l0.y,
        l1.x, yPos, l1.y,
        r0.x, yPos, r0.y,

        r0.x, yPos, r0.y,
        l1.x, yPos, l1.y,
        r1.x, yPos, r1.y
      );
    }
  };

  const charredVerts: number[] = [];
  const emberVerts: number[] = [];
  const mainAngles = [0.2, 1.05, 1.94, 2.78, 3.64, 4.46, 5.36];

  mainAngles.forEach((baseAng, idx) => {
    const seed = idx * 37 + 5;
    const steps = 6;
    const totalLen = 3.6 + (idx % 3) * 0.85;
    const pts: THREE.Vector2[] = [];

    let curX = Math.cos(baseAng) * 0.38;
    let curZ = Math.sin(baseAng) * 0.38;
    let ang = baseAng;
    pts.push(new THREE.Vector2(curX, curZ));

    for (let s = 1; s <= steps; s++) {
      const jitter = (((((seed + s * 19) * 29) % 19) - 9) / 9) * 0.44;
      ang += jitter;
      const stepLen = (totalLen / steps) * (0.85 + ((s + idx) % 3) * 0.14);
      curX += Math.cos(ang) * stepLen;
      curZ += Math.sin(ang) * stepLen;
      pts.push(new THREE.Vector2(curX, curZ));

      // Secondary branching zig-zag sub-cracks
      if (s === 2 || s === 4) {
        const side = (idx + s) % 2 === 0 ? 1 : -1;
        let bAng = ang + side * (0.55 + (idx % 3) * 0.12);
        let bx = curX;
        let bz = curZ;
        const bPts: THREE.Vector2[] = [new THREE.Vector2(bx, bz)];
        const bSteps = 3;
        const bLen = totalLen * (s === 2 ? 0.46 : 0.34);
        for (let bs = 1; bs <= bSteps; bs++) {
          bAng += (bs % 2 === 0 ? -1 : 1) * 0.28 * side;
          bx += Math.cos(bAng) * (bLen / bSteps);
          bz += Math.sin(bAng) * (bLen / bSteps);
          bPts.push(new THREE.Vector2(bx, bz));
        }
        pushTaperedZigZagRibbon(charredVerts, bPts, s === 2 ? 0.08 : 0.055, 0.006, 0.0028);
      }
    }

    // Main jagged charred crevice tapering cleanly toward outer tip
    pushTaperedZigZagRibbon(charredVerts, pts, 0.15, 0.01, 0.0028);

    // Narrow smoldering ember seam embedded only along the innermost 2 segments (center deepest impact!)
    pushTaperedZigZagRibbon(emberVerts, pts.slice(0, 3), 0.042, 0.005, 0.0034);
  });

  const charredGeo = new THREE.BufferGeometry();
  charredGeo.setAttribute('position', new THREE.Float32BufferAttribute(charredVerts, 3));
  charredGeo.computeVertexNormals();

  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.Float32BufferAttribute(emberVerts, 3));
  emberGeo.computeVertexNormals();

  return { charredGeo, emberGeo };
}

function createCrackedGlassTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#091120';
  ctx.fillRect(0, 0, 128, 128);

  // Faint diagonal sky reflection sheen
  const sheen = ctx.createLinearGradient(0, 0, 128, 128);
  sheen.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
  sheen.addColorStop(0.5, 'rgba(15, 23, 42, 0.04)');
  sheen.addColorStop(1, 'rgba(148, 163, 184, 0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 128, 128);

  // Spiderweb fracture cracks across pane
  const ox = 42;
  const oy = 48;
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a) * 32, oy + Math.sin(a) * 32);
    ctx.lineTo(ox + Math.cos(a + 0.14) * 76, oy + Math.sin(a + 0.14) * 76);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the procedural "Ruined Cyber City & Deep Central Meteor Crater" environment
 * for Battle Tower while preserving exact gameplay surface y = 0.08 inside the crater.
 */
export function createTowerCityEnvironment(): TowerCityEnvironmentHandle {
  const group = new THREE.Group();
  const ownedTextures: THREE.Texture[] = [];
  const flickers: FlickerLightRef[] = [];

  // Shared Materials
  const roadFoundationMat = new THREE.MeshStandardMaterial({
    color: 0x0b101b,
    roughness: 0.9,
    metalness: 0.12,
    flatShading: true,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.08,
  });
  const asphaltTex = createAsphaltHighwayTexture();
  if (asphaltTex) {
    asphaltMat.map = asphaltTex;
    ownedTextures.push(asphaltTex);
  } else {
    asphaltMat.color.setHex(0x131a29);
  }

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x2b3447,
    roughness: 0.86,
    metalness: 0.08,
    flatShading: true,
  });
  const concreteDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1a2130,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const rebarMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.64,
    metalness: 0.74,
    flatShading: true,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.36,
    metalness: 0.82,
    flatShading: true,
  });
  const guardrailMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.32,
    metalness: 0.85,
    flatShading: true,
  });
  const skyscraperMat = new THREE.MeshStandardMaterial({
    color: 0x0b1222,
    roughness: 0.62,
    metalness: 0.42,
    flatShading: true,
  });
  const skyscraperAltMat = new THREE.MeshStandardMaterial({
    color: 0x141d31,
    roughness: 0.68,
    metalness: 0.36,
    flatShading: true,
  });
  const scorchedRockMat = new THREE.MeshStandardMaterial({
    color: 0x151822,
    roughness: 0.94,
    metalness: 0.06,
    flatShading: true,
  });
  const basaltStepMat = new THREE.MeshStandardMaterial({
    color: 0x1d2332,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const charredFissureMat = new THREE.MeshStandardMaterial({
    color: 0x050609,
    roughness: 0.96,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    flatShading: true,
  });
  const emberSeamMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    emissive: 0xc2410c,
    emissiveIntensity: 0.34,
    roughness: 0.65,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    flatShading: true,
  });

  // =========================================================================
  // 1. CYBER NIGHT SKY & GROUND SKIRT
  // =========================================================================
  const skyTex = createCyberCitySkyTexture();
  if (skyTex) ownedTextures.push(skyTex);

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(96, 32, 20),
    new THREE.MeshBasicMaterial({
      ...(skyTex ? { map: skyTex } : {}),
      color: skyTex ? 0xffffff : 0x040918,
      side: THREE.BackSide,
      fog: false,
    })
  );
  group.add(skyDome);

  const cityGroundSkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 120),
    new THREE.MeshStandardMaterial({ color: 0x040711, roughness: 0.96, metalness: 0.05 })
  );
  cityGroundSkirt.rotation.x = -Math.PI / 2;
  cityGroundSkirt.position.set(0, -0.55, -16);
  group.add(cityGroundSkirt);

  // =========================================================================
  // 2. RAISED SHATTERED HIGHWAY (y = 0.52) WITH TRUE 3D CENTRAL CRATER HOLE (y = 0.08)
  // =========================================================================
  const roadZMin = -44;
  const roadZMax = 14;
  const holedHighwayGeo = createHoledHighwayGeometry(
    HIGHWAY_HALF_W,
    roadZMin,
    roadZMax,
    ARENA_CENTER_Z,
    CRATER_HOLE_R
  );
  // Multi-material or clean asphalt top + dark foundation sides
  const highwayMesh = new THREE.Mesh(holedHighwayGeo, [asphaltMat, roadFoundationMat]);
  highwayMesh.receiveShadow = true;
  highwayMesh.castShadow = true;
  group.add(highwayMesh);

  // Sub-foundation under roadway outside hole (y = -0.55 .. 0.08)
  const underBase = new THREE.Mesh(
    new THREE.BoxGeometry(HIGHWAY_HALF_W * 2 + 6.4, 0.63, roadZMax - roadZMin),
    roadFoundationMat
  );
  underBase.position.set(0, CRATER_FLOOR_Y - 0.316, (roadZMin + roadZMax) * 0.5);
  underBase.receiveShadow = true;
  group.add(underBase);

  // Deep Scorched Crater Floor Basin strictly at gameplay y = 0.08 (r = 7.4 overlaps safely under stepped rim walls)
  const craterTex = createCraterBedTexture();
  if (craterTex) ownedTextures.push(craterTex);

  const craterBedMat = new THREE.MeshStandardMaterial({
    ...(craterTex ? { map: craterTex } : {}),
    color: craterTex ? 0xffffff : 0x0b101b,
    roughness: 0.92,
    metalness: 0.08,
  });
  const craterGroup = new THREE.Group();
  craterGroup.position.set(0, CRATER_FLOOR_Y, ARENA_CENTER_Z);
  group.add(craterGroup);

  const craterFloorMesh = new THREE.Mesh(new THREE.CircleGeometry(7.6, 36), craterBedMat);
  craterFloorMesh.rotation.x = -Math.PI / 2;
  craterFloorMesh.position.y = 0.002;
  craterFloorMesh.receiveShadow = true;
  craterGroup.add(craterFloorMesh);

  // Natural Branching Jagged Ground Fissures (Charred Rock + Muted Deep-Core Magma Embers) flush on Crater Floor
  const { charredGeo, emberGeo } = createJaggedCraterFissureGeometries();
  const charredFissures = new THREE.Mesh(charredGeo, charredFissureMat);
  charredFissures.receiveShadow = true;
  const emberSeams = new THREE.Mesh(emberGeo, emberSeamMat);
  craterGroup.add(charredFissures, emberSeams);

  // Stepped Basalt Crater Inner Wall Terraces Descending from ROAD_Y (0.52) down to CRATER_FLOOR_Y (0.08)
  // Keeps r_inner >= 6.82 so summon pads (r = 6.3) and wave ores (r <= 4.46) stand completely free inside the bowl!
  const wallSegments = 28;
  const rockWallGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const rimBlockData: { pos: THREE.Vector3; scale: THREE.Vector3; rot: THREE.Euler; dark: boolean }[] = [];

  for (let i = 0; i < wallSegments; i++) {
    const ang = (i / wallSegments) * Math.PI * 2;
    const isFrontCameraArc = Math.sin(ang) > 0.35; // Keep front camera edge lower & cleaner
    const jag = Math.sin(i * 2.7) * 0.18;

    // Lower inner rock step (r ≈ 6.95, height 0.24 from y=0.08 up to 0.32)
    const rStep1 = CRATER_FLOOR_R + 0.24 + jag;
    rimBlockData.push({
      pos: new THREE.Vector3(Math.cos(ang) * rStep1, 0.1, Math.sin(ang) * rStep1),
      scale: new THREE.Vector3(0.95, 0.22, 0.82),
      rot: new THREE.Euler(i * 0.3, -ang, (i % 3) * 0.15),
      dark: i % 2 === 0,
    });

    // Upper rim rock wall rising to road lip (y = 0.32 .. 0.62, higher on rear & sides!)
    const rStep2 = CRATER_HOLE_R + 0.15 + jag;
    const rimH = isFrontCameraArc ? 0.26 : 0.44 + (i % 3) * 0.14;
    rimBlockData.push({
      pos: new THREE.Vector3(Math.cos(ang) * rStep2, 0.26 + rimH * 0.45, Math.sin(ang) * rStep2),
      scale: new THREE.Vector3(1.08, rimH, 0.92),
      rot: new THREE.Euler((i % 2) * 0.22, -ang + 0.2, -0.18),
      dark: i % 3 === 0,
    });

    // Tilted Upturned Broken Asphalt Slabs Around Crater Lip (skip camera center front so sightline is pristine)
    if (!isFrontCameraArc || Math.abs(Math.cos(ang)) > 0.62) {
      const rSlab = CRATER_HOLE_R + 0.32 + (i % 2) * 0.18;
      const slab = new THREE.Mesh(
        createExtrudedChamferSlab(1.65 + (i % 2) * 0.35, 0.15, 1.15, 0.14, 0.018),
        concreteDarkMat
      );
      slab.position.set(Math.cos(ang) * rSlab, ROAD_Y - CRATER_FLOOR_Y - 0.05, Math.sin(ang) * rSlab);
      slab.lookAt(0, slab.position.y, 0);
      slab.rotateX(-0.36 - (i % 3) * 0.09);
      enableShadows(slab);
      craterGroup.add(slab);
    }
  }

  for (const rb of rimBlockData) {
    const boulder = new THREE.Mesh(rockWallGeo, rb.dark ? scorchedRockMat : basaltStepMat);
    boulder.position.copy(rb.pos);
    boulder.scale.copy(rb.scale);
    boulder.rotation.copy(rb.rot);
    enableShadows(boulder);
    craterGroup.add(boulder);
  }

  // =========================================================================
  // 3. RAISED SIDEWALKS (y = 0.88), GUARDRAILS, ROAD DEBRIS & STREETLIGHTS
  // =========================================================================
  const sidewalkSegments: [number, number, number][] = [
    [9.4, 6.8, 0],
    [2.6, 5.4, 0.02],
    [-4.2, 5.6, -0.03],
    [-11.0, 6.4, 0.015],
    [-18.2, 7.8, -0.02],
    [-27.0, 9.2, 0],
    [-37.5, 10.6, 0],
  ];
  for (const sideSign of [-1, 1]) {
    for (const [cz, len, tilt] of sidewalkSegments) {
      const slab = new THREE.Mesh(
        createExtrudedChamferSlab(3.0, 0.38, len, 0.08, 0.025),
        concreteMat
      );
      slab.position.set(sideSign * (HIGHWAY_HALF_W + 1.5), ROAD_Y - 0.02, cz);
      slab.rotation.z = sideSign * tilt;
      enableShadows(slab);
      group.add(slab);
    }

    // Dented & Interrupted Metal Guardrails along x = ±(HIGHWAY_HALF_W + 0.2)
    const guardrailSegments: { z: number; len: number; yaw: number; roll: number; pitch: number }[] = [
      { z: 9.2, len: 5.2, yaw: 0.02, roll: 0, pitch: 0 },
      { z: 4.0, len: 2.8, yaw: -0.16 * sideSign, roll: 0.24 * sideSign, pitch: 0.08 },
      // Blown out across the crater blast!
      { z: -7.4, len: 3.4, yaw: 0.2 * sideSign, roll: -0.26 * sideSign, pitch: -0.07 },
      { z: -13.8, len: 6.4, yaw: -0.03, roll: 0.04, pitch: 0 },
      { z: -21.8, len: 6.8, yaw: 0.02, roll: 0, pitch: 0 },
      { z: -30.0, len: 6.8, yaw: 0, roll: 0, pitch: 0 },
    ];
    const postGeo = new THREE.BoxGeometry(0.11, 0.62, 0.11);
    for (const seg of guardrailSegments) {
      const railGroup = new THREE.Group();
      railGroup.position.set(sideSign * (HIGHWAY_HALF_W + 0.18), SIDEWALK_Y, seg.z);
      railGroup.rotation.set(seg.pitch, seg.yaw, seg.roll);

      const beam = new THREE.Mesh(createGuardrailBeamGeometry(seg.len), guardrailMat);
      beam.position.y = 0.46;
      enableShadows(beam);
      railGroup.add(beam);

      const postCount = Math.max(2, Math.round(seg.len / 1.7));
      for (let p = 0; p < postCount; p++) {
        const pz = -seg.len * 0.45 + (p / Math.max(1, postCount - 1)) * seg.len * 0.9;
        const post = new THREE.Mesh(postGeo, steelMat);
        post.position.set(-sideSign * 0.04, 0.29, pz);
        enableShadows(post);
        railGroup.add(post);
      }
      group.add(railGroup);
    }
  }

  // Tilted Cyberpunk Streetlights on Sidewalks (y = SIDEWALK_Y)
  const poleBaseGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.32, 6);
  const poleShaftGeo = new THREE.CylinderGeometry(0.075, 0.11, 3.85, 6);
  const armGeo = new THREE.BoxGeometry(1.15, 0.1, 0.12);
  const hoodGeo = new THREE.BoxGeometry(0.58, 0.12, 0.26);
  const bulbGeo = new THREE.BoxGeometry(0.48, 0.06, 0.18);

  const streetlightSpecs: { side: -1 | 1; z: number; tiltZ: number; tiltX: number; cyan: boolean; flicker: boolean }[] = [
    { side: -1, z: 5.4, tiltZ: -0.05, tiltX: 0.03, cyan: true, flicker: false },
    { side: 1, z: 5.4, tiltZ: 0.16, tiltX: -0.04, cyan: false, flicker: true },
    { side: -1, z: -1.6, tiltZ: -0.28, tiltX: 0.12, cyan: true, flicker: true },
    { side: 1, z: -1.6, tiltZ: 0.24, tiltX: -0.1, cyan: true, flicker: false },
    { side: -1, z: -8.8, tiltZ: -0.09, tiltX: -0.05, cyan: false, flicker: true },
    { side: 1, z: -8.8, tiltZ: 0.04, tiltX: 0.02, cyan: true, flicker: false },
    { side: -1, z: -16.8, tiltZ: -0.03, tiltX: 0.02, cyan: true, flicker: false },
    { side: 1, z: -16.8, tiltZ: 0.12, tiltX: 0.04, cyan: false, flicker: false },
  ];

  for (let idx = 0; idx < streetlightSpecs.length; idx++) {
    const spec = streetlightSpecs[idx];
    const lampGroup = new THREE.Group();
    lampGroup.position.set(spec.side * (HIGHWAY_HALF_W + 1.05), SIDEWALK_Y, spec.z);
    lampGroup.rotation.set(spec.tiltX, 0, spec.tiltZ);

    const base = new THREE.Mesh(poleBaseGeo, concreteDarkMat);
    base.position.y = 0.16;
    const shaft = new THREE.Mesh(poleShaftGeo, steelMat);
    shaft.position.y = 2.05;
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(-spec.side * 0.5, 3.88, 0);
    const hood = new THREE.Mesh(hoodGeo, concreteDarkMat);
    hood.position.set(-spec.side * 1.0, 3.85, 0);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: spec.cyan ? 0x22d3ee : 0xf59e0b,
      emissive: spec.cyan ? 0x06b6d4 : 0xd97706,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(bulbGeo, tubeMat);
    bulb.position.set(-spec.side * 1.0, 3.78, 0);

    enableShadows(base);
    enableShadows(shaft);
    enableShadows(arm);
    lampGroup.add(base, shaft, arm, hood, bulb);
    group.add(lampGroup);

    if (spec.flicker) {
      flickers.push({
        mat: tubeMat,
        phase: idx * 1.9,
        speed: 7.5 + idx * 1.7,
        baseIntensity: 1.35,
      });
    }
  }

  // Cracked Tilted Road Slabs & Concrete/Rebar Rubble along Upper Highway & Sidewalks
  const roadDebrisPositions: [number, number, number, number, number][] = [
    [-6.2, 7.6, 1.4, 0.95, 0.2],
    [6.1, 7.4, 1.3, 0.9, -0.18],
    [-5.8, -10.4, 1.55, 1.1, 0.25],
    [5.9, -10.8, 1.45, 1.05, -0.22],
    [-2.4, -12.6, 1.4, 1.0, 0.15],
    [2.8, -13.2, 1.5, 1.05, -0.17],
  ];
  for (const [dx, dz, w, d, tilt] of roadDebrisPositions) {
    const slab = new THREE.Mesh(
      createExtrudedChamferSlab(w, 0.12, d, 0.12, 0.015),
      concreteDarkMat
    );
    slab.position.set(dx, ROAD_Y, dz);
    slab.rotation.set(tilt * 0.5, dx * 0.4, tilt);
    enableShadows(slab);
    group.add(slab);
  }

  const rubbleData: [number, number, number, number][] = [
    [-7.6, 4.4, 0.3, SIDEWALK_Y],
    [-7.3, -1.6, 0.36, SIDEWALK_Y],
    [-7.6, -7.2, 0.32, SIDEWALK_Y],
    [7.6, 4.1, 0.3, SIDEWALK_Y],
    [7.3, -1.6, 0.36, SIDEWALK_Y],
    [7.6, -7.0, 0.32, SIDEWALK_Y],
    [-4.2, -9.2, 0.36, ROAD_Y],
    [4.2, -9.1, 0.36, ROAD_Y],
    [0.2, -9.6, 0.4, ROAD_Y],
    [-6.6, 6.4, 0.34, ROAD_Y],
    [6.6, 6.2, 0.34, ROAD_Y],
  ];
  const rubbleInst = new THREE.InstancedMesh(rockWallGeo, concreteMat, rubbleData.length);
  rubbleInst.castShadow = true;
  rubbleInst.receiveShadow = true;

  const rebarGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.72, 5);
  const rebarInst = new THREE.InstancedMesh(rebarGeo, rebarMat, rubbleData.length * 2);
  rebarInst.castShadow = true;

  const dummy = new THREE.Object3D();
  rubbleData.forEach(([rx, rz, sc, baseY], idx) => {
    dummy.position.set(rx, baseY + sc * 0.45, rz);
    dummy.rotation.set(idx * 0.7, idx * 1.1, idx * 0.4);
    dummy.scale.set(sc * 1.2, sc * 0.85, sc);
    dummy.updateMatrix();
    rubbleInst.setMatrixAt(idx, dummy.matrix);

    for (let r = 0; r < 2; r++) {
      const rIdx = idx * 2 + r;
      dummy.position.set(rx + (r === 0 ? -0.08 : 0.1), baseY + 0.26, rz + (r === 0 ? 0.06 : -0.07));
      dummy.rotation.set(0.35 * (r === 0 ? 1 : -1), idx, 0.42 * (rx > 0 ? -1 : 1));
      dummy.scale.set(1, 0.85 + r * 0.25, 1);
      dummy.updateMatrix();
      rebarInst.setMatrixAt(rIdx, dummy.matrix);
    }
  });
  rubbleInst.instanceMatrix.needsUpdate = true;
  rebarInst.instanceMatrix.needsUpdate = true;
  group.add(rubbleInst, rebarInst);

  // =========================================================================
  // 4. RUINED CYBER CITY SKYSCRAPERS WITH VARIED WINDOW GRIDS & SHATTERED GLASS
  // =========================================================================
  interface TowerBuildingDef {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    ruined: boolean;
    hasStairs: boolean;
    hasHvac: boolean;
    antenna: boolean;
    cols: number;
    rows: number;
    winW: number;
    winH: number;
  }

  const buildings: TowerBuildingDef[] = [
    // Left Skyscrapers (x <= -13.6 so sidewalks/roadway x ∈ [-10.4, +10.4] stay clear)
    { x: -13.8, z: 5.2, w: 5.2, d: 5.0, h: 11.2, ruined: true, hasStairs: true, hasHvac: false, antenna: false, cols: 3, rows: 6, winW: 0.72, winH: 0.78 },
    { x: -14.2, z: -2.2, w: 5.6, d: 5.8, h: 15.8, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 9, winW: 0.62, winH: 0.72 },
    { x: -13.8, z: -10.2, w: 5.4, d: 5.4, h: 13.6, ruined: true, hasStairs: true, hasHvac: false, antenna: true, cols: 3, rows: 7, winW: 0.8, winH: 0.85 },
    { x: -14.2, z: -18.5, w: 5.8, d: 5.6, h: 19.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.68, winH: 0.76 },
    { x: -14.0, z: -27.0, w: 5.8, d: 5.8, h: 16.5, ruined: true, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 8, winW: 0.85, winH: 0.92 },
    { x: -21.0, z: -5.5, w: 6.4, d: 6.4, h: 22.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.76, winH: 0.84 },
    { x: -21.2, z: -15.5, w: 6.4, d: 6.4, h: 24.5, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: -20.8, z: -25.0, w: 6.0, d: 6.0, h: 20.5, ruined: false, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 9, winW: 0.88, winH: 0.96 },

    // Right Skyscrapers (x >= +13.6)
    { x: 13.8, z: 5.2, w: 5.2, d: 5.0, h: 11.8, ruined: true, hasStairs: true, hasHvac: false, antenna: false, cols: 3, rows: 6, winW: 0.72, winH: 0.78 },
    { x: 14.2, z: -2.2, w: 5.6, d: 5.8, h: 16.4, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 9, winW: 0.62, winH: 0.72 },
    { x: 13.8, z: -10.2, w: 5.4, d: 5.4, h: 13.2, ruined: true, hasStairs: true, hasHvac: false, antenna: true, cols: 3, rows: 7, winW: 0.8, winH: 0.85 },
    { x: 14.2, z: -18.5, w: 5.8, d: 5.6, h: 20.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.68, winH: 0.76 },
    { x: 14.0, z: -27.0, w: 5.8, d: 5.8, h: 17.0, ruined: true, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 8, winW: 0.85, winH: 0.92 },
    { x: 21.0, z: -5.5, w: 6.4, d: 6.4, h: 23.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 11, winW: 0.76, winH: 0.84 },
    { x: 21.2, z: -15.5, w: 6.4, d: 6.4, h: 25.0, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: 20.8, z: -25.0, w: 6.0, d: 6.0, h: 21.0, ruined: false, hasStairs: false, hasHvac: true, antenna: false, cols: 3, rows: 9, winW: 0.88, winH: 0.96 },

    // Background Horizon Towers Flanking Highway End (center lane open for elevated AI Core)
    { x: -11.4, z: -35.5, w: 5.6, d: 5.6, h: 23.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 3, rows: 10, winW: 0.78, winH: 0.84 },
    { x: 11.4, z: -35.5, w: 5.6, d: 5.6, h: 24.0, ruined: true, hasStairs: false, hasHvac: false, antenna: true, cols: 3, rows: 10, winW: 0.78, winH: 0.84 },
    { x: -17.6, z: -37.5, w: 6.2, d: 6.0, h: 27.0, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: 17.6, z: -37.5, w: 6.2, d: 6.0, h: 26.5, ruined: false, hasStairs: false, hasHvac: true, antenna: true, cols: 4, rows: 12, winW: 0.74, winH: 0.82 },
    { x: -7.8, z: -44.5, w: 4.8, d: 4.8, h: 18.0, ruined: true, hasStairs: false, hasHvac: false, antenna: false, cols: 3, rows: 8, winW: 0.72, winH: 0.78 },
    { x: 7.8, z: -44.5, w: 4.8, d: 4.8, h: 17.5, ruined: true, hasStairs: false, hasHvac: false, antenna: false, cols: 3, rows: 8, winW: 0.72, winH: 0.78 },
  ];

  // Collect window instance matrices by architectural state (non-uniform varied bays!)
  interface WinTransform {
    pos: THREE.Vector3;
    rotY: number;
    w: number;
    h: number;
  }
  const frameTransforms: WinTransform[] = [];
  const litWarmTransforms: WinTransform[] = [];
  const litCoolTransforms: WinTransform[] = [];
  const darkGlassTransforms: WinTransform[] = [];
  const brokenVoidTransforms: WinTransform[] = [];
  const shardTransforms: WinTransform[] = [];

  const antennaMastGeo = new THREE.CylinderGeometry(0.05, 0.14, 4.0, 5);
  const antennaCrossGeo = new THREE.BoxGeometry(0.95, 0.08, 0.08);
  const beaconGeo = new THREE.OctahedronGeometry(0.15, 0);

  for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
    const b = buildings[bIdx];
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, -0.55, b.z);
    group.add(bGroup);

    const baseH = Math.min(3.2, b.h * 0.24);
    const bodyMat = bIdx % 2 === 0 ? skyscraperMat : skyscraperAltMat;

    // Ground Plinth Base
    const plinth = new THREE.Mesh(
      createExtrudedChamferSlab(b.w + 0.55, baseH, b.d + 0.55, 0.25, 0.04),
      concreteDarkMat
    );
    enableShadows(plinth, true, true);
    bGroup.add(plinth);

    // Main Tower Shaft
    const mainH = b.h - baseH;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(b.w, mainH, b.d), bodyMat);
    shaft.position.y = baseH + mainH * 0.5;
    enableShadows(shaft, true, true);
    bGroup.add(shaft);

    // Roof Details: Ruined Collapsed Slab & Rubble OR Mechanical Penthouse + Ventilation Pipes
    if (b.ruined) {
      const capSlab = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.9, 0.45, b.d * 0.9), concreteMat);
      capSlab.position.y = b.h + 0.12;
      capSlab.rotation.set(b.x < 0 ? 0.16 : -0.14, 0.08, b.x < 0 ? -0.22 : 0.22);
      bGroup.add(capSlab);

      // Broken collapsed concrete chunk & exposed bent rebar spikes
      const collapseBlock = new THREE.Mesh(
        new THREE.BoxGeometry(b.w * 0.45, 0.9, b.d * 0.45),
        concreteDarkMat
      );
      collapseBlock.position.set(b.x < 0 ? 0.45 : -0.45, b.h + 0.3, 0.35);
      collapseBlock.rotation.set(0.24, 0.3, -0.28);
      bGroup.add(collapseBlock);

      for (let s = 0; s < 5; s++) {
        const spike = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.055, 1.4 + (s % 2) * 0.65, 5),
          rebarMat
        );
        spike.position.set(
          ((s % 3) - 1) * b.w * 0.28,
          b.h + 0.6,
          (s < 2 ? -1 : 1) * b.d * 0.26
        );
        spike.rotation.set((s - 2) * 0.16, 0, (s % 2 === 0 ? -1 : 1) * 0.22);
        bGroup.add(spike);
      }
    } else {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.72, 1.4, b.d * 0.72), concreteDarkMat);
      crown.position.y = b.h + 0.7;
      bGroup.add(crown);
    }

    if (b.hasHvac) {
      // Rooftop HVAC Units + Ventilation Duct Pipes
      const hvacY = b.h + (b.ruined ? 0.35 : 1.4);
      const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.0), concreteMat);
      acBox.position.set(-b.w * 0.16, hvacY + 0.42, -0.3);
      const ductPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.9, 6), steelMat);
      ductPipe.rotation.z = Math.PI / 2;
      ductPipe.position.set(0.45, hvacY + 0.22, -0.3);
      const ventStack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.9, 6), steelMat);
      ventStack.position.set(1.25, hvacY + 0.55, -0.3);
      bGroup.add(acBox, ductPipe, ventStack);
    }

    if (b.antenna) {
      const mastBaseY = b.h + (b.ruined ? 0.55 : 1.4);
      const mastGroup = new THREE.Group();
      mastGroup.position.set(0.25, mastBaseY, 0.2);
      // Damaged buildings get bent broken antenna towers!
      if (b.ruined) {
        mastGroup.rotation.set(0.12, 0.2, b.x < 0 ? -0.34 : 0.34);
      }
      const mast = new THREE.Mesh(antennaMastGeo, steelMat);
      mast.position.y = 2.0;
      const cross = new THREE.Mesh(antennaCrossGeo, steelMat);
      cross.position.y = 2.9;
      const beaconMat = new THREE.MeshStandardMaterial({
        color: bIdx % 2 === 0 ? 0xf43f5e : 0x38bdf8,
        emissive: bIdx % 2 === 0 ? 0xe11d48 : 0x0284c7,
        emissiveIntensity: 1.5,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 4.08;
      mastGroup.add(mast, cross, beacon);
      bGroup.add(mastGroup);
      flickers.push({ mat: beaconMat, phase: bIdx * 1.4, speed: 3.1 + (bIdx % 3), baseIntensity: 1.4 });
    }

    if (b.hasStairs) {
      // Exterior Fire-Escape Steel Staircase on lower inward facade
      const inwardSign = b.x < 0 ? 1 : -1;
      const wallX = inwardSign * (b.w * 0.5 + 0.28);
      for (let tier = 0; tier < 3; tier++) {
        const ty = baseH + 0.6 + tier * 2.1;
        const landing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 2.2), steelMat);
        landing.position.set(wallX, ty, 0);
        const stairFlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 2.35), steelMat);
        stairFlight.position.set(wallX + inwardSign * 0.08, ty + 1.05, 0);
        stairFlight.rotation.x = tier % 2 === 0 ? 0.68 : -0.68;
        bGroup.add(landing, stairFlight);
      }
    }

    // Populate Square / Rectangular Window Grid Across Both Highway-Facing (+X/-X) and Camera-Facing (+Z) Facades
    const rowSpacing = (mainH - 1.1) / Math.max(1, b.rows);
    const inwardSign = b.x < 0 ? 1 : -1;
    const sideFaceX = b.x + inwardSign * (b.w * 0.5 + 0.025);
    const sideRotY = inwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
    const frontFaceZ = b.z + b.d * 0.5 + 0.025;

    const pushWindowBay = (wx: number, wy: number, wz: number, rotY: number, seed: number): void => {
      const tr: WinTransform = {
        pos: new THREE.Vector3(wx, wy, wz),
        rotY,
        w: b.winW,
        h: b.winH,
      };
      frameTransforms.push(tr);

      // Non-uniform deterministic window state per bay
      const hash = Math.abs((seed * 73856093) ^ (bIdx * 19349663)) % 100;
      if (hash < 35) {
        // Blown-out hollow dark window + jagged shattered glass splinters on frame edge!
        brokenVoidTransforms.push(tr);
        shardTransforms.push(tr);
      } else if (hash < 47) {
        // Dim warm room glow
        litWarmTransforms.push(tr);
      } else if (hash < 58) {
        // Dim cool/cyan monitor room glow
        litCoolTransforms.push(tr);
      } else {
        // Dead / cracked dark window pane
        darkGlassTransforms.push(tr);
      }
    };

    for (let r = 0; r < b.rows; r++) {
      const wy = -0.55 + baseH + 0.8 + r * rowSpacing;
      // Highway-facing side facade columns
      const sideColSpacing = (b.d - 0.9) / Math.max(1, b.cols);
      for (let c = 0; c < b.cols; c++) {
        const wz = b.z - (b.d - 0.9) * 0.5 + sideColSpacing * (c + 0.5);
        pushWindowBay(sideFaceX, wy, wz, sideRotY, bIdx * 101 + r * 17 + c * 7);
      }
      // Front camera-facing facade columns
      const frontColSpacing = (b.w - 0.9) / Math.max(1, b.cols);
      for (let c = 0; c < b.cols; c++) {
        const wx = b.x - (b.w - 0.9) * 0.5 + frontColSpacing * (c + 0.5);
        pushWindowBay(wx, wy, frontFaceZ, 0, bIdx * 131 + r * 23 + c * 11 + 500);
      }
    }
  }

  // Instantiate All Window Grid Bays & Shattered Glass Shards (6 Draw Calls Total for 1,500+ Windows!)
  const frameGeo = new THREE.BoxGeometry(1, 1, 0.08);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.25,
    flatShading: true,
  });

  const paneGeo = new THREE.PlaneGeometry(0.84, 0.84);
  const crackedTex = createCrackedGlassTexture();
  if (crackedTex) ownedTextures.push(crackedTex);

  const darkGlassMat = new THREE.MeshStandardMaterial({
    ...(crackedTex ? { map: crackedTex } : {}),
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.82,
  });
  const litWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const litCoolMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.38,
    roughness: 0.35,
  });
  const brokenVoidMat = new THREE.MeshBasicMaterial({
    color: 0x02040a,
  });
  const shardGeo = createShatteredGlassShardGeometry();
  const glassShardMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.52,
    roughness: 0.08,
    metalness: 0.88,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const buildWindowLayer = (
    list: WinTransform[],
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    zOffset: number,
    scaleMult = 1.0
  ): void => {
    if (list.length === 0) return;
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const wd = new THREE.Object3D();
    list.forEach((item, idx) => {
      wd.position.copy(item.pos);
      wd.position.x += Math.sin(item.rotY) * zOffset;
      wd.position.z += Math.cos(item.rotY) * zOffset;
      wd.rotation.set(0, item.rotY, 0);
      wd.scale.set(item.w * scaleMult, item.h * scaleMult, 1);
      wd.updateMatrix();
      inst.setMatrixAt(idx, wd.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  };

  buildWindowLayer(frameTransforms, frameGeo, frameMat, 0.0, 1.08);
  buildWindowLayer(darkGlassTransforms, paneGeo, darkGlassMat, 0.045, 0.92);
  buildWindowLayer(litWarmTransforms, paneGeo, litWarmMat, 0.045, 0.92);
  buildWindowLayer(litCoolTransforms, paneGeo, litCoolMat, 0.045, 0.92);
  buildWindowLayer(brokenVoidTransforms, paneGeo, brokenVoidMat, 0.042, 0.95);
  buildWindowLayer(shardTransforms, shardGeo, glassShardMat, 0.056, 0.9);

  // =========================================================================
  // 4b. ATMOSPHERIC ARENA PARTICLES: CRATER EMBERS, ASH FLAKES & ELECTRIC SPARKS
  // =========================================================================
  interface EmberParticleSeed {
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
    swirlAmp: number;
    maxH: number;
    baseScale: number;
  }
  const EMBER_COUNT = 26;
  const emberSeeds: EmberParticleSeed[] = [];
  for (let i = 0; i < EMBER_COUNT; i++) {
    const ang = ((i * 137.5) % 360) * (Math.PI / 180);
    const rad = 0.45 + ((i * 29) % 100) / 100 * 2.95;
    emberSeeds.push({
      baseX: Math.cos(ang) * rad,
      baseZ: ARENA_CENTER_Z + Math.sin(ang) * rad,
      phase: (i / EMBER_COUNT) * 6.28,
      speed: 0.24 + (i % 5) * 0.055,
      swirlAmp: 0.14 + (i % 3) * 0.07,
      maxH: 1.9 + (i % 4) * 0.42,
      baseScale: 0.042 + (i % 3) * 0.014,
    });
  }
  const emberParticleGeo = new THREE.OctahedronGeometry(1.0, 0);
  const emberParticleMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberInst = new THREE.InstancedMesh(emberParticleGeo, emberParticleMat, EMBER_COUNT);
  group.add(emberInst);

  interface AshParticleSeed {
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
    driftAmp: number;
    maxH: number;
    rotSpeed: number;
    baseScale: number;
  }
  const ASH_COUNT = 24;
  const ashSeeds: AshParticleSeed[] = [];
  for (let i = 0; i < ASH_COUNT; i++) {
    const ang = ((i * 97.3 + 22) % 360) * (Math.PI / 180);
    const rad = 1.1 + ((i * 43) % 100) / 100 * 5.2;
    ashSeeds.push({
      baseX: Math.cos(ang) * rad,
      baseZ: ARENA_CENTER_Z + Math.sin(ang) * rad,
      phase: (i / ASH_COUNT) * 5.5,
      speed: 0.14 + (i % 4) * 0.035,
      driftAmp: 0.35 + (i % 3) * 0.15,
      maxH: 3.4 + (i % 3) * 0.65,
      rotSpeed: 1.2 + (i % 4) * 0.45,
      baseScale: 0.055 + (i % 3) * 0.016,
    });
  }
  const ashFlakeGeo = new THREE.BoxGeometry(1.2, 0.18, 0.85);
  const ashFlakeMat = new THREE.MeshBasicMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const ashInst = new THREE.InstancedMesh(ashFlakeGeo, ashFlakeMat, ASH_COUNT);
  group.add(ashInst);

  // Brief Bright-Blue Electrical Arc Sparks near Tilted Streetlights & Broken Guardrails
  const sparkBoltPositions: [number, number][] = [
    [0, 0],
    [0.14, 0.12],
    [-0.08, 0.24],
    [0.16, 0.36],
    [-0.04, 0.48],
  ];
  const sparkVerts: number[] = [];
  for (let i = 0; i < sparkBoltPositions.length - 1; i++) {
    const [x0, y0] = sparkBoltPositions[i];
    const [x1, y1] = sparkBoltPositions[i + 1];
    const hw = 0.022;
    sparkVerts.push(
      x0 - hw, y0, 0,
      x1 - hw * 0.6, y1, 0,
      x0 + hw, y0, 0,
      x0 + hw, y0, 0,
      x1 - hw * 0.6, y1, 0,
      x1 + hw * 0.6, y1, 0
    );
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkVerts, 3));
  sparkGeo.computeVertexNormals();

  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  interface ElectricSparkNode {
    group: THREE.Group;
    phase: number;
    period: number;
  }
  const electricSparks: ElectricSparkNode[] = [];
  const sparkAnchors: [number, number, number][] = [
    [-6.42, 4.18, 5.4], // Tilted left front streetlight
    [6.42, 4.12, 5.4], // Tilted right front streetlight
    [-6.25, 3.92, -1.6], // Heavily tilted left crater streetlight
    [6.32, 3.98, -1.6], // Tilted right crater streetlight
    [-6.68, 1.24, 3.6], // Snapped left guardrail end
    [6.68, 1.24, 3.8], // Snapped right guardrail end
    [-6.68, 1.22, -6.8], // Broken left rear guardrail
    [6.68, 1.22, -6.8], // Broken right rear guardrail
  ];
  sparkAnchors.forEach(([sx, sy, sz], idx) => {
    const sg = new THREE.Group();
    sg.position.set(sx, sy, sz);
    const arc1 = new THREE.Mesh(sparkGeo, sparkMat);
    const arc2 = new THREE.Mesh(sparkGeo, sparkMat);
    arc2.rotation.z = 1.9;
    arc2.scale.setScalar(0.75);
    sg.add(arc1, arc2);
    sg.visible = false;
    group.add(sg);
    electricSparks.push({
      group: sg,
      phase: idx * 1.13,
      period: 2.3 + (idx % 4) * 0.65,
    });
  });

  const particleDummy = new THREE.Object3D();

  // =========================================================================
  // 5. STATE REACTIVITY & ANIMATION UPDATE & FULL CLEANUP
  // =========================================================================
  let bossEmberBoost = 0;

  const setBossState = (
    isBossWave: boolean,
    isBossMode: boolean,
    _anomalyColorHex: string
  ): void => {
    bossEmberBoost = isBossWave ? (isBossMode ? 0.22 : 0.14) : 0;
  };

  const update = (dtSec: number, elapsed: number): void => {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const t = elapsed + safeDt * 0.001;

    for (const fl of flickers) {
      const wave = Math.sin(t * fl.speed + fl.phase) * Math.sin(t * (fl.speed * 0.37) + fl.phase);
      fl.mat.emissiveIntensity = wave > 0.55 ? fl.baseIntensity * 0.28 : fl.baseIntensity;
    }

    emberSeamMat.emissiveIntensity = 0.32 + bossEmberBoost + Math.sin(t * 1.9) * 0.08;

    // Update rising orange-red crater fire embers (rise -> taper/dim smoothly)
    for (let i = 0; i < EMBER_COUNT; i++) {
      const e = emberSeeds[i];
      const life = ((t * e.speed + e.phase) % 1 + 1) % 1;
      const y = CRATER_FLOOR_Y + 0.02 + life * e.maxH;
      const fadeScale = e.baseScale * Math.sin(life * Math.PI);
      particleDummy.position.set(
        e.baseX + Math.sin(t * 1.8 + e.phase) * e.swirlAmp,
        y,
        e.baseZ + Math.cos(t * 1.5 + e.phase) * e.swirlAmp
      );
      particleDummy.rotation.set(t * 1.6 + i, t * 2.1, 0);
      particleDummy.scale.setScalar(Math.max(0.001, fadeScale));
      particleDummy.updateMatrix();
      emberInst.setMatrixAt(i, particleDummy.matrix);
    }
    emberInst.instanceMatrix.needsUpdate = true;

    // Update thin dark drifting ash flakes
    for (let i = 0; i < ASH_COUNT; i++) {
      const a = ashSeeds[i];
      const life = ((t * a.speed + a.phase) % 1 + 1) % 1;
      const fadeScale = a.baseScale * Math.min(1, Math.sin(life * Math.PI) * 1.35);
      particleDummy.position.set(
        a.baseX + Math.sin(t * 0.85 + a.phase) * a.driftAmp,
        CRATER_FLOOR_Y + 0.15 + life * a.maxH,
        a.baseZ + Math.cos(t * 0.72 + a.phase) * a.driftAmp
      );
      particleDummy.rotation.set(t * a.rotSpeed, t * a.rotSpeed * 0.7, t * 0.5 + i);
      particleDummy.scale.setScalar(Math.max(0.001, fadeScale));
      particleDummy.updateMatrix();
      ashInst.setMatrixAt(i, particleDummy.matrix);
    }
    ashInst.instanceMatrix.needsUpdate = true;

    // Brief random bright-blue electrical sparks near damaged streetlights & guardrails
    for (let i = 0; i < electricSparks.length; i++) {
      const sp = electricSparks[i];
      const localCycle = (t + sp.phase) % sp.period;
      const active = localCycle < 0.14 || (localCycle > 0.22 && localCycle < 0.3);
      sp.group.visible = active;
      if (active) {
        sp.group.rotation.set(
          Math.sin(t * 47 + i) * 0.8,
          Math.cos(t * 53 + i) * Math.PI,
          Math.sin(t * 61 + i) * 1.4
        );
      }
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

    for (const tex of ownedTextures) {
      tex.dispose();
    }
  };

  return {
    group,
    setBossState,
    update,
    dispose,
  };
}
