import * as THREE from 'three';

export interface SculptOptions {
  foldZ?: number;
  archX?: number;
  archSpan?: number;
  taperTopZ?: number;
  height?: number;
  camberX?: number;
  camberSpan?: number;
}

export function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

export function mirrorPoints2D(pts: ReadonlyArray<readonly [number, number]>): [number, number][] {
  const out: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    out.push([-pts[i][0], pts[i][1]]);
  }
  return out;
}

export function createShapeFromPoints(pts: ReadonlyArray<readonly [number, number]>): THREE.Shape {
  const shape = new THREE.Shape();
  if (pts.length === 0) return shape;
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();
  return shape;
}

/**
 * Extrudes an angular polygon with beveled armor edges and optional 3D vertex sculpting
 * (central keel fold, wrap-around arch curvature, or vertical taper) while preserving normals.
 */
export function createSculptedPlateGeometry(
  pts: ReadonlyArray<readonly [number, number]>,
  depth: number,
  bevel = 0.022,
  opts: SculptOptions = {}
): THREE.ExtrudeGeometry {
  const shape = createShapeFromPoints(pts);
  const innerD = Math.max(0.012, depth - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 2,
  });
  geo.translate(0, 0, -innerD * 0.5);

  if (opts.foldZ || opts.archX || opts.taperTopZ || opts.camberX) {
    const pos = geo.getAttribute('position');
    const halfSpan = Math.max(0.05, opts.archSpan ?? 1.0);
    const halfH = Math.max(0.05, (opts.height ?? 1.0) * 0.5);
    const camberSpan = Math.max(0.05, opts.camberSpan ?? 1.0);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = pos.getZ(i);

      if (opts.taperTopZ) {
        const yNorm = THREE.MathUtils.clamp((y + halfH) / (halfH * 2), 0, 1);
        z *= 1 - opts.taperTopZ * yNorm;
      }
      if (opts.foldZ) {
        const xNorm = THREE.MathUtils.clamp(Math.abs(x) / halfSpan, 0, 1);
        z += opts.foldZ * (1 - xNorm);
      }
      if (opts.archX) {
        const xNorm = THREE.MathUtils.clamp(Math.abs(x) / halfSpan, 0, 1);
        z -= opts.archX * xNorm * xNorm;
      }
      if (opts.camberX) {
        const xNorm = THREE.MathUtils.clamp(Math.abs(x) / camberSpan, 0, 1);
        z += opts.camberX * Math.sin(xNorm * Math.PI);
      }
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a multi-stepped faceted LatheGeometry from [radius, y] profile pairs.
 */
export function createLatheProfileGeometry(
  profile: ReadonlyArray<readonly [number, number]>,
  radialSegments = 8
): THREE.LatheGeometry {
  const vecs = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vecs, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a TubeGeometry along a 3D CatmullRomCurve3 and cleanly tapers each ring's
 * cross-section around its exact ring centroid from radiusStart to radiusEnd.
 */
export function createTaperedTubeGeometry(
  points: THREE.Vector3[],
  tubularSegments: number,
  radiusStart: number,
  radiusEnd: number,
  radialSegments: number,
  taperExponent = 0.9
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1.0, radialSegments, false);
  const pos = geo.getAttribute('position');
  const stride = radialSegments + 1;

  for (let i = 0; i <= tubularSegments; i++) {
    const baseIdx = i * stride;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < radialSegments; j++) {
      const idx = baseIdx + j;
      cx += pos.getX(idx);
      cy += pos.getY(idx);
      cz += pos.getZ(idx);
    }
    cx /= radialSegments;
    cy /= radialSegments;
    cz /= radialSegments;

    const u = i / tubularSegments;
    const r = THREE.MathUtils.lerp(radiusStart, radiusEnd, Math.pow(u, taperExponent));

    for (let j = 0; j < stride; j++) {
      const idx = baseIdx + j;
      pos.setXYZ(
        idx,
        cx + (pos.getX(idx) - cx) * r,
        cy + (pos.getY(idx) - cy) * r,
        cz + (pos.getZ(idx) - cz) * r
      );
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function featherSpineY(t: number, curveBow: number): number {
  return curveBow * Math.sin(t * Math.PI * 0.68);
}

export function featherTopOffset(t: number, rootW: number): number {
  return rootW * (0.42 * Math.pow(Math.max(0, 1 - t), 0.72) + 0.16 * Math.sin(t * Math.PI));
}

export function featherBotOffset(t: number, rootW: number): number {
  return rootW * (0.32 * Math.pow(Math.max(0, 1 - t), 0.85) + 0.08 * Math.sin(t * Math.PI * 1.12));
}

/**
 * Creates a swept, curved, razor-tapered metal feather blade extending along side * X
 * with beveled edges and subtle 3D wing camber. Left/right symmetry uses CCW-safe mirroring.
 */
export function createCurvedFeatherBladeGeometry(
  length: number,
  rootW: number,
  curveBow: number,
  thickness: number,
  bevel: number,
  side: -1 | 1
): THREE.ExtrudeGeometry {
  const steps = 9;
  const rawPts: [number, number][] = [];

  // Counter-clockwise contour: bottom trailing edge (root -> tip) then top leading edge (tip -> root)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * length;
    const y = featherSpineY(t, curveBow) - featherBotOffset(t, rootW);
    rawPts.push([x, y]);
  }
  rawPts.push([length * 1.03, featherSpineY(1, curveBow) + curveBow * 0.04]);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = t * length;
    const y = featherSpineY(t, curveBow) + featherTopOffset(t, rootW);
    rawPts.push([x, y]);
  }

  const pts = side > 0 ? rawPts : mirrorPoints2D(rawPts);
  return createSculptedPlateGeometry(pts, thickness, bevel, {
    camberX: 0.022,
    camberSpan: length,
  });
}

/**
 * Creates a glowing molten-ember razor edge hugging the outer curve & tip of a feather blade.
 */
export function createCurvedFeatherEmberGeometry(
  length: number,
  rootW: number,
  curveBow: number,
  thickness: number,
  side: -1 | 1
): THREE.ExtrudeGeometry {
  const steps = 8;
  const startT = 0.24;
  const rawPts: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(startT, 1.0, i / steps);
    const x = t * length;
    const y = featherSpineY(t, curveBow) - featherBotOffset(t, rootW) - 0.022 * Math.sin((i / steps) * Math.PI);
    rawPts.push([x, y]);
  }
  rawPts.push([length * 1.07, featherSpineY(1, curveBow) + curveBow * 0.045]);
  rawPts.push([length * 0.88, featherSpineY(0.88, curveBow) + featherTopOffset(0.88, rootW) * 0.65]);
  for (let i = steps; i >= 0; i--) {
    const t = THREE.MathUtils.lerp(startT, 0.82, i / steps);
    const x = t * length;
    const y = featherSpineY(t, curveBow) - featherBotOffset(t, rootW) + 0.032;
    rawPts.push([x, y]);
  }

  const pts = side > 0 ? rawPts : mirrorPoints2D(rawPts);
  return createSculptedPlateGeometry(pts, thickness, 0.005, {
    camberX: 0.022,
    camberSpan: length,
  });
}

/**
 * Builds an orthonormal orientation matrix whose local +Y points along `dir`,
 * while keeping local +Z aligned toward `hintForward` so limb armor faces forward symmetrically.
 */
export function orientGroupAlongVector(
  target: THREE.Object3D,
  dir: THREE.Vector3,
  hintForward: THREE.Vector3
): void {
  const up = dir.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, hintForward);
  if (right.lengthSq() < 1e-5) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }
  const fwd = new THREE.Vector3().crossVectors(right, up).normalize();
  const mat = new THREE.Matrix4().makeBasis(right, up, fwd);
  target.quaternion.setFromRotationMatrix(mat);
}

/**
 * Creates a full procedural 3D hard-surface "Corrupted Seraphim AI Overlord" Boss
 * sculpted entirely from beveled ExtrudeGeometry polygons, LatheGeometry housings,
 * and tapered TubeGeometry conduits/horns/claws (zero plain BoxGeometry primitives).
 * Pivot is grounded at y = 0 while the hover body floats high enough to keep foreground
 * chibi heads and combat damage numbers unobstructed.
 */
