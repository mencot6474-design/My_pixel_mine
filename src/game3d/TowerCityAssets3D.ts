import * as THREE from 'three';

export function createGuardrailBeamGeometry(lengthZ: number): THREE.ExtrudeGeometry {
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
 * centered at (0, holeCenterZ), with world-aligned lane UVs.
 */
export function createHoledHighwayGeometry(
  halfW: number,
  zMin: number,
  zMax: number,
  holeCenterZ: number,
  holeRadius: number,
  craterFloorY = 0.08,
  roadY = 0.52
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

  const depth = roadY - craterFloorY; // 0.44m deep real cut
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, craterFloorY, 0);

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
export function createShatteredGlassShardGeometry(): THREE.BufferGeometry {
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

export function createCyberCitySkyTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0284c7');
  grad.addColorStop(0.32, '#38bdf8');
  grad.addColorStop(0.58, '#7dd3fc');
  grad.addColorStop(0.78, '#bae6fd');
  grad.addColorStop(0.92, '#e0f2fe');
  grad.addColorStop(1.0, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Warm daytime sun bloom
  const sunGrad = ctx.createRadialGradient(780, 118, 12, 780, 118, 190);
  sunGrad.addColorStop(0.0, 'rgba(255, 255, 240, 0.92)');
  sunGrad.addColorStop(0.28, 'rgba(254, 249, 195, 0.45)');
  sunGrad.addColorStop(1.0, 'rgba(224, 242, 254, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(580, 0, 400, 320);

  // Subtle upper cyber sky grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
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

  // Distant daytime city horizon silhouette
  ctx.fillStyle = '#64748b';
  for (let i = 0; i < 42; i++) {
    const bx = i * 25;
    const bw = 18 + ((i * 7) % 14);
    const bh = 38 + ((i * 37) % 86);
    ctx.fillRect(bx, 392 - bh, bw, bh + 120);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(186, 230, 253, 0.42)';
    for (let wy = 398 - bh; wy < 380; wy += 12) {
      if ((wy + i) % 4 === 0) {
        ctx.fillRect(bx + 4, wy, 3, 4);
      }
    }
    ctx.fillStyle = '#64748b';
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createAsphaltHighwayTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tire wear lanes (4-lane highway)
  for (const lx of [76, 188, 324, 436]) {
    const laneGrad = ctx.createLinearGradient(lx - 40, 0, lx + 40, 0);
    laneGrad.addColorStop(0, 'rgba(51, 65, 85, 0)');
    laneGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.38)');
    laneGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
    ctx.fillStyle = laneGrad;
    ctx.fillRect(lx - 40, 0, 80, 512);
  }

  // Asphalt grain noise
  for (let i = 0; i < 2400; i++) {
    const gx = (i * 197 + 31) % 512;
    const gy = (i * 353 + 17) % 512;
    const shade = (i % 3) * 14 + 78;
    ctx.fillStyle = `rgba(${shade + 10}, ${shade + 16}, ${shade + 26}, 0.32)`;
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

export function createCraterBedTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const cx = 256;
  const cy = 256;
  const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, 256);
  bg.addColorStop(0.0, '#334155');
  bg.addColorStop(0.38, '#475569');
  bg.addColorStop(0.76, '#64748b');
  bg.addColorStop(1.0, '#475569');
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
export function createJaggedCraterFissureGeometries(radialScale = 1.0): {
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
    const totalLen = (3.6 + (idx % 3) * 0.85) * radialScale;
    const pts: THREE.Vector2[] = [];

    let curX = Math.cos(baseAng) * 0.38 * radialScale;
    let curZ = Math.sin(baseAng) * 0.38 * radialScale;
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

    // Narrow smoldering ember seam embedded only along the innermost 2 segments (center deepest impact)
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

/**
 * Builds the stepped circular wide-open sky-overpass plaza hull below y = 0 (top lip flush at y = 0.02),
 * keeping the arena completely wall-free for unobstructed camera framing and 2.5s shader VFX.
 */
export function createOverpassPlazaHullGeometry(
  floorRadius: number,
  outerRadius: number,
  depth = 0.72
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(Math.max(2, floorRadius - 0.35), -depth),
    new THREE.Vector2(outerRadius - 0.55, -depth),
    new THREE.Vector2(outerRadius + 0.18, -depth * 0.42),
    new THREE.Vector2(outerRadius + 0.18, -0.08),
    new THREE.Vector2(outerRadius - 0.08, 0.02),
    new THREE.Vector2(floorRadius - 0.02, 0.02),
    new THREE.Vector2(floorRadius - 0.02, -0.02),
  ];
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a high-contrast Cyber-Colosseum Overpass battle court texture:
 * dark tactical titanium core, subtle armor seams, glowing concentric sector rings,
 * 8-point colosseum compass ticks, and central scorched impact lines.
 */
export function createOverpassCourtTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const cx = 256;
  const cy = 256;

  // Deep dark-titanium core gradient so additive Sakuga shaders and Chibi silhouettes pop cleanly
  const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, 256);
  bg.addColorStop(0.0, '#0f1b33');
  bg.addColorStop(0.42, '#162238');
  bg.addColorStop(0.78, '#1e293b');
  bg.addColorStop(1.0, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Radial armor plate seams (12 sectors)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.lineTo(cx + Math.cos(a) * 246, cy + Math.sin(a) * 246);
    ctx.stroke();
  }

  // Concentric cyber-colosseum court rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
  ctx.lineWidth = 2.2;
  for (const r of [64, 124, 184, 232]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Twin rotated octagram tactical grid inside court
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 2;
  for (const rotOff of [0, Math.PI / 4]) {
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const a = rotOff + (k * Math.PI) / 2;
      const px = cx + Math.cos(a) * 176;
      const py = cy + Math.sin(a) * 176;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Segmented outer gold/amber runway arc markers
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
  ctx.lineWidth = 3.2;
  for (let i = 0; i < 8; i++) {
    const a0 = (i * Math.PI) / 4 + 0.1;
    ctx.beginPath();
    ctx.arc(cx, cy, 208, a0, a0 + Math.PI / 4 - 0.2);
    ctx.stroke();
  }

  // Precision radial degree ticks along outer perimeter
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.36)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI * 2) / 48;
    const r0 = i % 4 === 0 ? 216 : 222;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * 230, cy + Math.sin(a) * 230);
    ctx.stroke();
  }

  // Subtle dark scorched impact grain for cyber-battle texture
  for (let i = 0; i < 1200; i++) {
    const x = (i * 193 + 11) % 512;
    const y = (i * 311 + 29) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(2, 6, 23, 0.35)' : 'rgba(148, 163, 184, 0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCrackedGlassTexture(): THREE.CanvasTexture | null {
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
