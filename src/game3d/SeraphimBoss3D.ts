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

interface SculptOptions {
  foldZ?: number;
  archX?: number;
  archSpan?: number;
  taperTopZ?: number;
  height?: number;
  camberX?: number;
  camberSpan?: number;
}

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function mirrorPoints2D(pts: ReadonlyArray<readonly [number, number]>): [number, number][] {
  const out: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    out.push([-pts[i][0], pts[i][1]]);
  }
  return out;
}

function createShapeFromPoints(pts: ReadonlyArray<readonly [number, number]>): THREE.Shape {
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
function createSculptedPlateGeometry(
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
function createLatheProfileGeometry(
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
function createTaperedTubeGeometry(
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

function featherSpineY(t: number, curveBow: number): number {
  return curveBow * Math.sin(t * Math.PI * 0.68);
}

function featherTopOffset(t: number, rootW: number): number {
  return rootW * (0.42 * Math.pow(Math.max(0, 1 - t), 0.72) + 0.16 * Math.sin(t * Math.PI));
}

function featherBotOffset(t: number, rootW: number): number {
  return rootW * (0.32 * Math.pow(Math.max(0, 1 - t), 0.85) + 0.08 * Math.sin(t * Math.PI * 1.12));
}

/**
 * Creates a swept, curved, razor-tapered metal feather blade extending along side * X
 * with beveled edges and subtle 3D wing camber. Left/right symmetry uses CCW-safe mirroring.
 */
function createCurvedFeatherBladeGeometry(
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
function createCurvedFeatherEmberGeometry(
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
function orientGroupAlongVector(
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
export function createSeraphimBoss3D(options: SeraphimBossOptions = {}): SeraphimBossHandle {
  const group = new THREE.Group();
  const baseScale = options.scale ?? 1.0;
  group.scale.setScalar(baseScale);

  const hoverRoot = new THREE.Group();
  group.add(hoverRoot);

  // PBR Hard-Surface Materials (Dark Charred Armor + Brushed Gunmetal + Molten Ember)
  const armorDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    roughness: 0.36,
    metalness: 0.76,
    flatShading: true,
  });
  const armorCharredMat = new THREE.MeshStandardMaterial({
    color: 0x101520,
    roughness: 0.48,
    metalness: 0.56,
    flatShading: true,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x455269,
    roughness: 0.26,
    metalness: 0.86,
    flatShading: true,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x0c1018,
    roughness: 0.76,
    metalness: 0.22,
    flatShading: true,
  });
  const singularityMat = new THREE.MeshBasicMaterial({
    color: 0x020306,
  });
  const magmaGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.95,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
  });
  const coreCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.65,
    roughness: 0.18,
    metalness: 0.28,
    flatShading: true,
  });

  // Warm localized magma point light illuminating chest facets, claws, helm & wing bevels
  const chestLight = new THREE.PointLight(0xf97316, 2.6, 8.2, 1.45);
  chestLight.position.set(0, 3.12, 1.08);
  hoverRoot.add(chestLight);

  // =========================================================================
  // 1. SCULPTED TORSO, RIBBED SPINE & SINGULARITY CHEST REACTOR (y = 2.15..3.85)
  // =========================================================================
  const torsoGroup = new THREE.Group();
  hoverRoot.add(torsoGroup);

  // Multi-stepped faceted waist & spinal turbine column (LatheGeometry)
  const spineCore = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.18, 0.0],
        [0.34, 0.08],
        [0.25, 0.2],
        [0.36, 0.3],
        [0.27, 0.42],
        [0.42, 0.54],
        [0.32, 0.66],
        [0.48, 0.78],
        [0.36, 0.88],
      ],
      8
    ),
    armorCharredMat
  );
  spineCore.position.set(0, 2.02, -0.04);
  spineCore.scale.set(1.18, 1, 0.86);
  enableShadows(spineCore);
  torsoGroup.add(spineCore);

  // Sculpted angular abdominal rib armor chevrons wrapping the waist
  const abdomenChevronPts: [number, number][] = [
    [-0.42, 0.04],
    [-0.14, 0.14],
    [0, 0.06],
    [0.14, 0.14],
    [0.42, 0.04],
    [0.32, -0.14],
    [0, -0.22],
    [-0.32, -0.14],
  ];
  for (let i = 0; i < 3; i++) {
    const abPlate = new THREE.Mesh(
      createSculptedPlateGeometry(abdomenChevronPts, 0.44 + i * 0.04, 0.02, {
        foldZ: 0.12,
        archX: 0.14,
        archSpan: 0.45,
      }),
      i % 2 === 0 ? armorDarkMat : gunmetalMat
    );
    abPlate.position.set(0, 2.16 + i * 0.24, 0.06);
    abPlate.scale.setScalar(0.84 + i * 0.11);
    enableShadows(abPlate);
    torsoGroup.add(abPlate);
  }

  // Twin curved hydraulic power ribs framing abdomen sides (TubeGeometry)
  for (const sx of [-1, 1] as const) {
    const ribTube = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.28, 2.02, 0.06),
          new THREE.Vector3(sx * 0.48, 2.38, 0.16),
          new THREE.Vector3(sx * 0.58, 2.86, 0.1),
        ],
        8,
        0.048,
        0.064,
        6
      ),
      gunmetalMat
    );
    enableShadows(ribTube);
    torsoGroup.add(ribTube);
  }

  // Main Layered Angular Ribcage Chassis (wide V-tapered hull with 3D central keel fold)
  const chestHullPts: [number, number][] = [
    [-0.46, -0.52],
    [0.46, -0.52],
    [0.78, -0.02],
    [0.86, 0.34],
    [0.48, 0.58],
    [0.18, 0.48],
    [0, 0.42],
    [-0.18, 0.48],
    [-0.48, 0.58],
    [-0.86, 0.34],
    [-0.78, -0.02],
  ];
  const chestCore = new THREE.Mesh(
    createSculptedPlateGeometry(chestHullPts, 0.72, 0.036, {
      foldZ: 0.18,
      archX: 0.24,
      archSpan: 0.88,
    }),
    armorDarkMat
  );
  chestCore.position.set(0, 3.24, 0.04);
  enableShadows(chestCore);
  torsoGroup.add(chestCore);

  // Swept Pectoral Breastplate Wings + Curved Molten Magma Energy Veins (TubeGeometry)
  const rightPecPts: [number, number][] = [
    [0.14, -0.26],
    [0.44, -0.2],
    [0.64, 0.08],
    [0.54, 0.34],
    [0.18, 0.28],
    [0.12, 0.02],
  ];
  for (const sx of [-1, 1] as const) {
    const pecPts = sx > 0 ? rightPecPts : mirrorPoints2D(rightPecPts);
    const pecPlate = new THREE.Mesh(
      createSculptedPlateGeometry(pecPts, 0.22, 0.024, {
        archX: 0.12,
        archSpan: 0.65,
      }),
      gunmetalMat
    );
    pecPlate.position.set(sx * 0.18, 3.28, 0.32);
    pecPlate.rotation.set(-0.14, sx * 0.26, sx * -0.08);
    enableShadows(pecPlate);

    const chestVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.28, 3.12, 0.48),
          new THREE.Vector3(sx * 0.48, 3.28, 0.44),
          new THREE.Vector3(sx * 0.68, 3.44, 0.3),
        ],
        7,
        0.028,
        0.016,
        5
      ),
      magmaGlowMat
    );
    torsoGroup.add(pecPlate, chestVein);
  }

  // Twin Flared High Collar Cowl Blades Framing the Mecha Neck
  const rightCollarPts: [number, number][] = [
    [0.16, -0.14],
    [0.54, 0.02],
    [0.48, 0.34],
    [0.24, 0.22],
  ];
  for (const sx of [-1, 1] as const) {
    const collarPts = sx > 0 ? rightCollarPts : mirrorPoints2D(rightCollarPts);
    const collarWing = new THREE.Mesh(
      createSculptedPlateGeometry(collarPts, 0.38, 0.02, {
        archX: 0.08,
        archSpan: 0.55,
      }),
      armorCharredMat
    );
    collarWing.position.set(sx * 0.06, 3.74, -0.06);
    collarWing.rotation.set(0.24, sx * -0.22, sx * -0.14);
    enableShadows(collarWing);
    torsoGroup.add(collarWing);
  }

  // Sculpted Dorsal Wing Manifold + Twin Flared Thruster Nozzles (LatheGeometry)
  const dorsalHullPts: [number, number][] = [
    [-0.3, -0.58],
    [0.3, -0.58],
    [0.54, 0.12],
    [0.36, 0.62],
    [0, 0.48],
    [-0.36, 0.62],
    [-0.54, 0.12],
  ];
  const dorsalPack = new THREE.Mesh(
    createSculptedPlateGeometry(dorsalHullPts, 0.42, 0.028, {
      foldZ: -0.14,
      archX: -0.12,
      archSpan: 0.56,
    }),
    armorCharredMat
  );
  dorsalPack.position.set(0, 3.26, -0.38);
  enableShadows(dorsalPack);
  torsoGroup.add(dorsalPack);

  for (const sx of [-1, 1] as const) {
    const bellGeo = createLatheProfileGeometry(
      [
        [0.18, -0.22],
        [0.15, -0.08],
        [0.1, 0.1],
        [0.13, 0.2],
      ],
      7
    );
    const thrusterBell = new THREE.Mesh(bellGeo, gunmetalMat);
    thrusterBell.position.set(sx * 0.28, 2.74, -0.56);
    thrusterBell.rotation.set(-0.38, 0, sx * 0.16);
    enableShadows(thrusterBell);

    const thrusterCore = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.24],
          [0.12, -0.14],
          [0.08, 0.02],
        ],
        6
      ),
      magmaGlowMat
    );
    thrusterCore.position.copy(thrusterBell.position);
    thrusterCore.rotation.copy(thrusterBell.rotation);

    torsoGroup.add(thrusterBell, thrusterCore);
  }

  // Black-Red Singularity Chest Core + Stepped Bezel + Rotating Containment Rings
  const reactorCenter = new THREE.Group();
  reactorCenter.position.set(0, 3.22, 0.46);
  torsoGroup.add(reactorCenter);

  const reactorBezel = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.34, -0.08],
        [0.44, -0.02],
        [0.41, 0.06],
        [0.31, 0.08],
      ],
      8
    ),
    armorCharredMat
  );
  reactorBezel.rotation.x = Math.PI / 2;
  enableShadows(reactorBezel);

  const blackOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), singularityMat);
  const flareHalo = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 8, 24), magmaGlowMat);
  const crimsonCorona = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 24), coreCrimsonMat);
  crimsonCorona.position.z = -0.02;
  reactorCenter.add(reactorBezel, blackOrb, flareHalo, crimsonCorona);

  const reactorRingOuter = new THREE.Group();
  const outerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.036, 6, 8), gunmetalMat);
  reactorRingOuter.add(outerRingMesh);

  const clampPts: [number, number][] = [
    [-0.075, -0.085],
    [0.075, -0.085],
    [0.048, 0.09],
    [-0.048, 0.09],
  ];
  const clampGeo = createSculptedPlateGeometry(clampPts, 0.11, 0.014, { foldZ: 0.025, archSpan: 0.08 });
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(clampGeo, armorDarkMat);
    clamp.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.02);
    clamp.rotation.z = a - Math.PI / 2;
    reactorRingOuter.add(clamp);
  }
  reactorCenter.add(reactorRingOuter);

  const reactorRingInner = new THREE.Group();
  const innerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 6, 6), coreCrimsonMat);
  reactorRingInner.position.z = 0.03;
  reactorRingInner.add(innerRingMesh);
  reactorCenter.add(reactorRingInner);

  // =========================================================================
  // 2. SCULPTED MECHA HELMET (V-FIN BROW, CHEEK FANGS, SHARP CHIN, CURVED HORNS)
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.18, 0.08);
  hoverRoot.add(headGroup);

  // Multi-ribbed Servo Neck Column (LatheGeometry) + Twin Neck Cables (TubeGeometry)
  const neckCol = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.22, -0.36],
        [0.18, -0.24],
        [0.21, -0.18],
        [0.16, -0.08],
        [0.19, 0.0],
      ],
      8
    ),
    cableMat
  );
  enableShadows(neckCol);
  headGroup.add(neckCol);

  for (const sx of [-1, 1] as const) {
    const neckTube = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.2, -0.34, -0.04),
          new THREE.Vector3(sx * 0.24, -0.18, 0.06),
          new THREE.Vector3(sx * 0.18, -0.02, 0.02),
        ],
        6,
        0.036,
        0.024,
        5
      ),
      gunmetalMat
    );
    headGroup.add(neckTube);
  }

  // Main Helm Cranium Shell (Side-swept armored dome profile rotated onto sagittal plane)
  const craniumSidePts: [number, number][] = [
    [-0.34, -0.16],
    [-0.44, 0.14], // Aggressive backward occipital tail fin
    [-0.16, 0.34],
    [0.18, 0.32],
    [0.34, 0.14], // Slanted brow overhang
    [0.24, -0.14],
    [-0.08, -0.22],
  ];
  const craniumGeo = createSculptedPlateGeometry(craniumSidePts, 0.44, 0.032, {
    foldZ: 0.06,
    archSpan: 0.45,
  });
  craniumGeo.rotateY(Math.PI / 2);
  const helmSkull = new THREE.Mesh(craniumGeo, armorDarkMat);
  helmSkull.position.set(0, 0.04, -0.04);
  enableShadows(helmSkull);
  headGroup.add(helmSkull);

  // Layered Upper Crown Cowl Plate
  const crownCapPts: [number, number][] = [
    [-0.26, -0.08],
    [-0.16, 0.16],
    [0, 0.24],
    [0.16, 0.16],
    [0.26, -0.08],
    [0, -0.02],
  ];
  const crownCap = new THREE.Mesh(
    createSculptedPlateGeometry(crownCapPts, 0.56, 0.02, {
      foldZ: 0.08,
      archX: 0.1,
      archSpan: 0.28,
    }),
    armorCharredMat
  );
  crownCap.position.set(0, 0.24, -0.04);
  crownCap.rotation.x = -0.32;
  enableShadows(crownCap);
  headGroup.add(crownCap);

  // Central Dorsal Shark-Fin Sensor Crest
  const dorsalCrestSidePts: [number, number][] = [
    [-0.42, 0.04],
    [-0.5, 0.34],
    [-0.08, 0.44],
    [0.34, 0.24],
    [0.3, 0.08],
  ];
  const dorsalCrestGeo = createSculptedPlateGeometry(dorsalCrestSidePts, 0.075, 0.012);
  dorsalCrestGeo.rotateY(Math.PI / 2);
  const crestFin = new THREE.Mesh(dorsalCrestGeo, gunmetalMat);
  crestFin.position.set(0, 0.18, -0.02);
  enableShadows(crestFin);
  headGroup.add(crestFin);

  // Pelat Dahi Menyudut ke Bawah (Sharp Downward V-Brow Cowl + Twin Swept V-Fin Blades)
  const vBrowPts: [number, number][] = [
    [-0.31, 0.2],
    [0, 0.1],
    [0.31, 0.2],
    [0.22, 0.02],
    [0, -0.1], // Sharp aggressive center brow dip between optics
    [-0.22, 0.02],
  ];
  const browCowl = new THREE.Mesh(
    createSculptedPlateGeometry(vBrowPts, 0.18, 0.018, {
      foldZ: 0.09,
      archX: 0.11,
      archSpan: 0.32,
    }),
    armorCharredMat
  );
  browCowl.position.set(0, 0.15, 0.26);
  browCowl.rotation.x = 0.24;
  enableShadows(browCowl);
  headGroup.add(browCowl);

  const rightVFinPts: [number, number][] = [
    [0.0, 0.0],
    [0.08, 0.05],
    [0.44, 0.32],
    [0.52, 0.36],
    [0.16, 0.04],
    [0.03, -0.04],
  ];
  for (const sx of [-1, 1] as const) {
    const vFinPts = sx > 0 ? rightVFinPts : mirrorPoints2D(rightVFinPts);
    const vFin = new THREE.Mesh(
      createSculptedPlateGeometry(vFinPts, 0.055, 0.008, {
        archX: 0.12,
        archSpan: 0.52,
      }),
      gunmetalMat
    );
    vFin.position.set(0, 0.2, 0.31);
    vFin.rotation.x = -0.18;
    enableShadows(vFin);
    headGroup.add(vFin);
  }

  // Glowing Forehead Crest Core
  const browGem = new THREE.Mesh(
    createSculptedPlateGeometry(
      [
        [0, 0.075],
        [0.035, 0.0],
        [0, -0.075],
        [-0.035, 0.0],
      ],
      0.045,
      0.006
    ),
    coreCrimsonMat
  );
  browGem.position.set(0, 0.22, 0.34);
  browGem.rotation.x = 0.18;
  headGroup.add(browGem);

  // Recessed Dark Visor Cavity + Glowing Red-Orange V-Slit Visor Optics (Zero BoxGeometry!)
  const visorRecessPts: [number, number][] = [
    [-0.24, 0.07],
    [0, -0.015],
    [0.24, 0.07],
    [0.21, -0.025],
    [0, -0.09],
    [-0.21, -0.025],
  ];
  const visorRecess = new THREE.Mesh(
    createSculptedPlateGeometry(visorRecessPts, 0.12, 0.008, {
      foldZ: 0.06,
      archX: 0.09,
      archSpan: 0.25,
    }),
    singularityMat
  );
  visorRecess.position.set(0, 0.055, 0.27);
  headGroup.add(visorRecess);

  const visorSlitPts: [number, number][] = [
    [-0.22, 0.052],
    [0, -0.026],
    [0.22, 0.052],
    [0.19, 0.014],
    [0, -0.058],
    [-0.19, 0.014],
  ];
  const visorSlit = new THREE.Mesh(
    createSculptedPlateGeometry(visorSlitPts, 0.05, 0.006, {
      foldZ: 0.07,
      archX: 0.08,
      archSpan: 0.22,
    }),
    magmaGlowMat
  );
  visorSlit.position.set(0, 0.052, 0.32);
  headGroup.add(visorSlit);

  // Pelindung Pipi Meruncing (Pointed Tapered Cheek Guards)
  const rightCheekPts: [number, number][] = [
    [0.12, 0.1],
    [0.29, 0.12],
    [0.32, -0.04],
    [0.2, -0.28], // Sharp downward cheek fang point
    [0.09, -0.14],
  ];
  for (const sx of [-1, 1] as const) {
    const cheekPts = sx > 0 ? rightCheekPts : mirrorPoints2D(rightCheekPts);
    const cheekGuard = new THREE.Mesh(
      createSculptedPlateGeometry(cheekPts, 0.24, 0.018, {
        archX: 0.08,
        archSpan: 0.34,
      }),
      gunmetalMat
    );
    cheekGuard.position.set(sx * 0.02, -0.01, 0.18);
    cheekGuard.rotation.set(0.12, sx * -0.26, 0);
    enableShadows(cheekGuard);
    headGroup.add(cheekGuard);
  }

  // Pelindung Dagu Tajam (Sharp Faceted Faceplate + Razor Chin Blade)
  const faceMaskPts: [number, number][] = [
    [-0.17, 0.06],
    [0, -0.01],
    [0.17, 0.06],
    [0.13, -0.16],
    [0, -0.28], // Sharp chin point
    [-0.13, -0.16],
  ];
  const facePlate = new THREE.Mesh(
    createSculptedPlateGeometry(faceMaskPts, 0.18, 0.016, {
      foldZ: 0.09,
      archSpan: 0.18,
    }),
    armorDarkMat
  );
  facePlate.position.set(0, -0.06, 0.23);
  facePlate.rotation.x = 0.16;
  enableShadows(facePlate);

  const chinSpikePts: [number, number][] = [
    [-0.085, 0.04],
    [0, 0.08],
    [0.085, 0.04],
    [0.048, -0.14],
    [0, -0.26], // Razor lower chin guard spur
    [-0.048, -0.14],
  ];
  const chinGuard = new THREE.Mesh(
    createSculptedPlateGeometry(chinSpikePts, 0.14, 0.014, {
      foldZ: 0.08,
      archSpan: 0.09,
    }),
    gunmetalMat
  );
  chinGuard.position.set(0, -0.18, 0.28);
  chinGuard.rotation.x = -0.22;
  enableShadows(chinGuard);
  headGroup.add(facePlate, chinGuard);

  // Pair of Curved Mechanical Horns (Tapered TubeGeometry sweeping to razor points + Temple Sockets)
  for (const sx of [-1, 1] as const) {
    const hornSocket = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.09, -0.06],
          [0.11, 0.0],
          [0.08, 0.07],
        ],
        6
      ),
      gunmetalMat
    );
    hornSocket.position.set(sx * 0.25, 0.12, -0.02);
    hornSocket.rotation.z = sx * -Math.PI * 0.42;
    enableShadows(hornSocket);

    const hornGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 5, 8), coreCrimsonMat);
    hornGlowRing.position.set(sx * 0.28, 0.14, -0.02);
    hornGlowRing.rotation.y = Math.PI / 2;
    hornGlowRing.rotation.x = sx * -0.45;

    const hornGeo = createTaperedTubeGeometry(
      [
        new THREE.Vector3(sx * 0.24, 0.13, -0.02),
        new THREE.Vector3(sx * 0.46, 0.26, -0.08),
        new THREE.Vector3(sx * 0.56, 0.56, -0.18),
        new THREE.Vector3(sx * 0.44, 0.86, -0.14),
        new THREE.Vector3(sx * 0.25, 0.98, 0.02),
      ],
      14,
      0.068,
      0.004,
      6,
      0.82
    );
    const hornMesh = new THREE.Mesh(hornGeo, armorCharredMat);
    enableShadows(hornMesh);
    headGroup.add(hornSocket, hornGlowRing, hornMesh);
  }

  // =========================================================================
  // 3. CURVED LAYERED PAULDRONS, AERODYNAMIC ARMS & 5-CLAWED HANDS
  // =========================================================================
  const floatingPauldrons: FloatingPauldronSpec[] = [];
  const armGroups: { group: THREE.Group; side: -1 | 1 }[] = [];

  const rightPauldronInnerPts: [number, number][] = [
    [-0.12, -0.24],
    [0.34, -0.2],
    [0.5, 0.1],
    [0.24, 0.28],
    [-0.14, 0.18],
  ];
  const rightPauldronMidPts: [number, number][] = [
    [-0.18, -0.18],
    [0.48, -0.26],
    [0.74, 0.08],
    [0.64, 0.36],
    [0.14, 0.34],
    [-0.22, 0.16],
  ];
  const rightPauldronCrestPts: [number, number][] = [
    [-0.14, -0.08],
    [0.42, -0.04],
    [0.76, 0.28],
    [0.44, 0.24],
    [-0.1, 0.12],
  ];

  // Aerodynamic limb & hand shared geometry specs
  const upperArmPts: [number, number][] = [
    [-0.1, 0.0],
    [0.1, 0.0],
    [0.16, 0.24],
    [0.13, 0.58],
    [0, 0.64],
    [-0.13, 0.58],
    [-0.14, 0.22],
  ];
  const upperArmShellGeo = createSculptedPlateGeometry(upperArmPts, 0.24, 0.02, {
    foldZ: 0.05,
    archSpan: 0.16,
  });

  const elbowSpurPts: [number, number][] = [
    [-0.08, -0.06],
    [0.08, -0.06],
    [0.1, 0.12],
    [0, 0.34],
    [-0.1, 0.12],
  ];
  const elbowSpurGeo = createSculptedPlateGeometry(elbowSpurPts, 0.12, 0.015, {
    foldZ: 0.04,
    archSpan: 0.1,
  });

  const forearmPts: [number, number][] = [
    [-0.13, 0.02],
    [0.13, 0.02],
    [0.21, 0.22],
    [0.15, 0.58],
    [0.1, 0.68],
    [-0.1, 0.68],
    [-0.15, 0.58],
    [-0.19, 0.22],
  ];
  const forearmShellGeo = createSculptedPlateGeometry(forearmPts, 0.28, 0.022, {
    foldZ: 0.06,
    archX: 0.04,
    archSpan: 0.21,
  });

  const palmPts: [number, number][] = [
    [-0.12, 0.0],
    [0.12, 0.0],
    [0.17, 0.14],
    [0.14, 0.27],
    [0, 0.29],
    [-0.14, 0.27],
    [-0.17, 0.14],
  ];
  const palmGeo = createSculptedPlateGeometry(palmPts, 0.095, 0.016, {
    foldZ: 0.025,
    archX: 0.03,
    archSpan: 0.17,
  });
  palmGeo.rotateX(Math.PI / 2);

  for (const sx of [-1, 1] as const) {
    // 3a. Curved Multi-Tiered Floating Pauldrons
    const pauldron = new THREE.Group();
    pauldron.position.set(sx * 1.18, 3.68, 0.06);

    const pInnerPts = sx > 0 ? rightPauldronInnerPts : mirrorPoints2D(rightPauldronInnerPts);
    const pInner = new THREE.Mesh(
      createSculptedPlateGeometry(pInnerPts, 0.52, 0.02, {
        archX: 0.14,
        archSpan: 0.52,
      }),
      armorCharredMat
    );
    pInner.position.set(-sx * 0.1, -0.1, 0);
    pInner.rotation.z = sx * -0.25;

    const pMidPts = sx > 0 ? rightPauldronMidPts : mirrorPoints2D(rightPauldronMidPts);
    const pMain = new THREE.Mesh(
      createSculptedPlateGeometry(pMidPts, 0.66, 0.026, {
        archX: 0.22,
        archSpan: 0.75,
        foldZ: 0.06,
      }),
      armorDarkMat
    );
    pMain.position.set(sx * 0.04, 0.04, 0);
    pMain.rotation.z = sx * -0.32;

    const pCrestPts = sx > 0 ? rightPauldronCrestPts : mirrorPoints2D(rightPauldronCrestPts);
    const pCrest = new THREE.Mesh(
      createSculptedPlateGeometry(pCrestPts, 0.44, 0.02, {
        archX: 0.16,
        archSpan: 0.76,
      }),
      gunmetalMat
    );
    pCrest.position.set(sx * 0.08, 0.24, 0);
    pCrest.rotation.z = sx * -0.24;

    // Curved Magma Fissure Trim Across Pauldron Shell (TubeGeometry)
    const pGlow = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(-sx * 0.12, 0.08, 0.24),
          new THREE.Vector3(sx * 0.22, 0.12, 0.26),
          new THREE.Vector3(sx * 0.56, 0.0, 0.14),
        ],
        7,
        0.03,
        0.014,
        5
      ),
      magmaGlowMat
    );

    const pGravOrb = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.12],
          [0.11, 0.0],
          [0.06, 0.09],
        ],
        6
      ),
      coreCrimsonMat
    );
    pGravOrb.position.set(-sx * 0.24, -0.16, 0);

    enableShadows(pInner);
    enableShadows(pMain);
    enableShadows(pCrest);
    pauldron.add(pInner, pMain, pCrest, pGlow, pGravOrb);
    hoverRoot.add(pauldron);
    floatingPauldrons.push({
      group: pauldron,
      baseY: 3.68,
      baseRoll: sx * -0.05,
      side: sx,
    });

    // 3b. Aerodynamic Mechanical Arm + Forearm Gauntlet + 5-Clawed Menacing Hand
    const armGroup = new THREE.Group();
    armGroup.position.set(sx * 0.86, 3.38, 0.06);
    hoverRoot.add(armGroup);
    armGroups.push({ group: armGroup, side: sx });

    const shoulderPos = new THREE.Vector3(0, 0, 0);
    const elbowPos = new THREE.Vector3(sx * 0.3, -0.56, 0.12);
    const wristPos = new THREE.Vector3(sx * 0.32, -0.92, 0.68);
    const hintForward = new THREE.Vector3(0, 0, 1);

    const shoulderJoint = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.08, -0.15],
          [0.17, -0.05],
          [0.17, 0.05],
          [0.08, 0.15],
        ],
        8
      ),
      gunmetalMat
    );
    shoulderJoint.rotation.z = Math.PI / 2;
    enableShadows(shoulderJoint);
    armGroup.add(shoulderJoint);

    // Upper Arm aligned cleanly from Shoulder -> Elbow
    const upperArmDir = new THREE.Vector3().subVectors(elbowPos, shoulderPos);
    const upperArmLen = upperArmDir.length();
    const upperArmPivot = new THREE.Group();
    upperArmPivot.position.copy(shoulderPos);
    orientGroupAlongVector(upperArmPivot, upperArmDir, hintForward);

    const upperPiston = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.09, 0],
          [0.11, upperArmLen * 0.5],
          [0.085, upperArmLen],
        ],
        6
      ),
      cableMat
    );
    const upperArmor = new THREE.Mesh(upperArmShellGeo, armorCharredMat);
    upperArmor.scale.y = upperArmLen / 0.64;
    enableShadows(upperPiston);
    enableShadows(upperArmor);
    upperArmPivot.add(upperPiston, upperArmor);
    armGroup.add(upperArmPivot);

    // Elbow Rotary Joint + Swept Aerodynamic Elbow Fin
    const elbowJoint = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.08, -0.14],
          [0.15, -0.06],
          [0.15, 0.06],
          [0.08, 0.14],
        ],
        6
      ),
      magmaGlowMat
    );
    elbowJoint.position.copy(elbowPos);
    elbowJoint.rotation.z = Math.PI / 2;

    const elbowSpur = new THREE.Mesh(elbowSpurGeo, gunmetalMat);
    elbowSpur.position.copy(elbowPos).add(new THREE.Vector3(sx * 0.04, 0.04, -0.14));
    elbowSpur.rotation.set(-0.85, sx * 0.2, 0);
    enableShadows(elbowSpur);
    armGroup.add(elbowJoint, elbowSpur);

    // Forearm aligned cleanly from Elbow -> Wrist
    const forearmDir = new THREE.Vector3().subVectors(wristPos, elbowPos);
    const forearmLen = forearmDir.length();
    const forearmPivot = new THREE.Group();
    forearmPivot.position.copy(elbowPos);
    orientGroupAlongVector(forearmPivot, forearmDir, hintForward);

    const forearmArmor = new THREE.Mesh(forearmShellGeo, armorDarkMat);
    forearmArmor.scale.y = forearmLen / 0.68;

    const forearmDorsalVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(0, 0.08, 0.16),
          new THREE.Vector3(0, forearmLen * 0.52, 0.18),
          new THREE.Vector3(0, forearmLen * 0.9, 0.13),
        ],
        6,
        0.022,
        0.012,
        5
      ),
      magmaGlowMat
    );

    const wristCuff = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.14, 0.0],
          [0.17, 0.04],
          [0.13, 0.11],
          [0.11, 0.16],
        ],
        8
      ),
      gunmetalMat
    );
    wristCuff.position.y = forearmLen - 0.12;

    enableShadows(forearmArmor);
    enableShadows(wristCuff);
    forearmPivot.add(forearmArmor, forearmDorsalVein, wristCuff);
    armGroup.add(forearmPivot);

    // 3c. Articulated Clawed Hand with Palm Core + 5 Curved Mechanical Claw Fingers
    const handGroup = new THREE.Group();
    handGroup.position.copy(wristPos);
    // Rotate palm inward & pitch slightly downward so all 5 fanned claws menace toward player (+Z)
    handGroup.rotation.set(0.28, sx * -0.22, sx * -0.52);
    armGroup.add(handGroup);

    const palmMesh = new THREE.Mesh(palmGeo, armorDarkMat);
    enableShadows(palmMesh);

    const dorsalKnucklePlate = new THREE.Mesh(
      createSculptedPlateGeometry(
        [
          [-0.14, 0.0],
          [0.14, 0.0],
          [0.16, 0.09],
          [-0.16, 0.09],
        ],
        0.06,
        0.012,
        { archX: 0.02, archSpan: 0.16 }
      ),
      gunmetalMat
    );
    dorsalKnucklePlate.position.set(0, 0.035, 0.21);
    dorsalKnucklePlate.rotation.x = 0.25;
    enableShadows(dorsalKnucklePlate);

    // Glowing Crimson Palm Repulsor Emitter
    const palmCore = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.01, -0.02],
          [0.068, 0.0],
          [0.052, 0.025],
        ],
        8
      ),
      coreCrimsonMat
    );
    palmCore.position.set(0, -0.045, 0.14);
    palmCore.rotation.x = Math.PI;
    handGroup.add(palmMesh, dorsalKnucklePlate, palmCore);

    // 5 Distinct Articulated Claw Fingers (Thumb + Index + Middle + Ring + Pinky)
    const fingerSpecs: {
      bx: number;
      by: number;
      bz: number;
      splayX: number;
      archY: number;
      lenZ: number;
      dropY: number;
      rBase: number;
    }[] = [
      // Thumb (opposable inner side, curling sharply inward & forward)
      { bx: -sx * 0.14, by: -0.02, bz: 0.09, splayX: -sx * 0.13, archY: 0.02, lenZ: 0.24, dropY: -0.16, rBase: 0.032 },
      // Index
      { bx: -sx * 0.11, by: 0.01, bz: 0.24, splayX: -sx * 0.065, archY: 0.06, lenZ: 0.34, dropY: -0.22, rBase: 0.03 },
      // Middle (longest)
      { bx: -sx * 0.03, by: 0.02, bz: 0.27, splayX: -sx * 0.012, archY: 0.075, lenZ: 0.39, dropY: -0.25, rBase: 0.032 },
      // Ring
      { bx: sx * 0.05, by: 0.015, bz: 0.26, splayX: sx * 0.045, archY: 0.06, lenZ: 0.35, dropY: -0.23, rBase: 0.029 },
      // Pinky
      { bx: sx * 0.13, by: 0.0, bz: 0.23, splayX: sx * 0.105, archY: 0.04, lenZ: 0.28, dropY: -0.19, rBase: 0.026 },
    ];

    for (const fs of fingerSpecs) {
      const knuckle = new THREE.Mesh(new THREE.OctahedronGeometry(fs.rBase * 1.15, 0), gunmetalMat);
      knuckle.position.set(fs.bx, fs.by, fs.bz);

      const p0 = new THREE.Vector3(fs.bx, fs.by, fs.bz);
      const p1 = new THREE.Vector3(fs.bx + fs.splayX * 0.45, fs.by + fs.archY, fs.bz + fs.lenZ * 0.44);
      const p2 = new THREE.Vector3(
        fs.bx + fs.splayX * 0.9,
        fs.by + fs.dropY * 0.45,
        fs.bz + fs.lenZ * 0.84
      );
      const p3 = new THREE.Vector3(
        fs.bx + fs.splayX * 0.72,
        fs.by + fs.dropY,
        fs.bz + fs.lenZ
      );

      const clawTube = new THREE.Mesh(
        createTaperedTubeGeometry([p0, p1, p2, p3], 8, fs.rBase, 0.005, 5, 0.85),
        gunmetalMat
      );
      enableShadows(clawTube);

      // Razor 4-sided talon fang capping the curved finger tip
      const tipDir = new THREE.Vector3().subVectors(p3, p2).normalize();
      const tipBlade = new THREE.Mesh(new THREE.ConeGeometry(fs.rBase * 0.62, 0.11, 4), magmaGlowMat);
      tipBlade.position.copy(p3).addScaledVector(tipDir, 0.032);
      tipBlade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);

      handGroup.add(knuckle, clawTube, tipBlade);
    }
  }

  // =========================================================================
  // 4. PELVIS SHIELD, LAYERED CURVED TASSETS & DANGLING ENERGY CABLES
  // =========================================================================
  const lowerSkirtGroup = new THREE.Group();
  hoverRoot.add(lowerSkirtGroup);

  const codpiecePts: [number, number][] = [
    [-0.24, 0.18],
    [0, 0.24],
    [0.24, 0.18],
    [0.16, -0.22],
    [0, -0.44],
    [-0.16, -0.22],
  ];
  const pelvisShield = new THREE.Mesh(
    createSculptedPlateGeometry(codpiecePts, 0.34, 0.022, {
      foldZ: 0.1,
      archSpan: 0.25,
    }),
    armorDarkMat
  );
  pelvisShield.position.set(0, 2.02, 0.12);
  enableShadows(pelvisShield);
  lowerSkirtGroup.add(pelvisShield);

  const rightTassetOuterPts: [number, number][] = [
    [0.0, 0.04],
    [0.58, -0.14],
    [0.72, -0.58],
    [0.44, -0.96],
    [0.12, -0.68],
  ];
  const rightTassetInnerPts: [number, number][] = [
    [0.02, -0.02],
    [0.44, -0.16],
    [0.5, -0.54],
    [0.2, -0.78],
    [0.08, -0.46],
  ];

  for (const sx of [-1, 1] as const) {
    const outerPts = sx > 0 ? rightTassetOuterPts : mirrorPoints2D(rightTassetOuterPts);
    const tasset = new THREE.Mesh(
      createSculptedPlateGeometry(outerPts, 0.14, 0.02, {
        archX: 0.1,
        archSpan: 0.72,
      }),
      armorDarkMat
    );
    tasset.position.set(sx * 0.28, 2.16, 0.1);
    tasset.rotation.set(0.14, sx * -0.32, sx * 0.08);
    enableShadows(tasset);

    const innerPts = sx > 0 ? rightTassetInnerPts : mirrorPoints2D(rightTassetInnerPts);
    const tassetSub = new THREE.Mesh(
      createSculptedPlateGeometry(innerPts, 0.1, 0.015, {
        archX: 0.06,
        archSpan: 0.5,
      }),
      gunmetalMat
    );
    tassetSub.position.set(sx * 0.34, 2.12, 0.16);
    tassetSub.rotation.set(0.14, sx * -0.32, sx * 0.08);
    enableShadows(tassetSub);

    const tassetVein = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.42, 2.02, 0.18),
          new THREE.Vector3(sx * 0.68, 1.72, 0.18),
          new THREE.Vector3(sx * 0.56, 1.36, 0.12),
        ],
        7,
        0.026,
        0.014,
        5
      ),
      magmaGlowMat
    );

    lowerSkirtGroup.add(tasset, tassetSub, tassetVein);
  }

  // 7 Curved Dangling Dark Cyber Cables Hanging Below Waist (lowest tip around y ≈ 0.85)
  const danglingCables: DanglingCableSpec[] = [];
  const cableSpecs: [number, number, number, number][] = [
    [-0.3, -0.04, 0.94, -0.15],
    [-0.14, 0.08, 1.06, -0.06],
    [0.0, -0.14, 1.12, 0.01],
    [0.14, 0.08, 1.04, 0.06],
    [0.3, -0.04, 0.92, 0.15],
    [-0.08, 0.14, 0.86, -0.08],
    [0.08, -0.08, 0.98, 0.09],
  ];
  cableSpecs.forEach(([cx, cz, dropLen, flareX], idx) => {
    const cPivot = new THREE.Group();
    cPivot.position.set(cx, 1.96, cz);

    const tubeGeo = createTaperedTubeGeometry(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(flareX * 0.45, -dropLen * 0.35, 0.06 * (idx % 2 === 0 ? 1 : -1)),
        new THREE.Vector3(flareX * 0.85, -dropLen * 0.72, -0.08),
        new THREE.Vector3(flareX * 0.65, -dropLen, -0.02),
      ],
      8,
      0.04,
      0.022,
      5
    );
    const tubeMesh = new THREE.Mesh(tubeGeo, cableMat);
    const tipSpark = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), coreCrimsonMat);
    tipSpark.position.set(flareX * 0.65, -dropLen, -0.02);

    enableShadows(tubeMesh);
    cPivot.add(tubeMesh, tipSpark);
    lowerSkirtGroup.add(cPivot);
    danglingCables.push({
      pivot: cPivot,
      phase: idx * 1.15,
      baseRotX: 0.04,
      baseRotZ: flareX * 0.18,
    });
  });

  // =========================================================================
  // 5. SIX LAYERED CURVED FEATHER-BLADE WINGS (3 TIERED PAIRS WITH MECHANICAL JOINTS)
  // =========================================================================
  const wingPivots: THREE.Group[] = [];
  const wingSpecs: WingAnimSpec[] = [];

  const wingTiers: {
    y: number;
    z: number;
    roll: number;
    yaw: number;
    span: number;
    archY: number;
    sweepZ: number;
    bladeCount: number;
    bladeLen: number;
  }[] = [
    // Upper Mega Seraphim Wing
    { y: 3.68, z: -0.36, roll: 0.34, yaw: 0.22, span: 3.35, archY: 0.85, sweepZ: -0.78, bladeCount: 6, bladeLen: 1.56 },
    // Middle Pinion Wing
    { y: 3.18, z: -0.42, roll: -0.02, yaw: 0.28, span: 2.75, archY: 0.52, sweepZ: -0.68, bladeCount: 5, bladeLen: 1.32 },
    // Lower Raptor Wing
    { y: 2.68, z: -0.46, roll: -0.34, yaw: 0.34, span: 2.15, archY: 0.28, sweepZ: -0.58, bladeCount: 4, bladeLen: 1.08 },
  ];

  const yokePts: [number, number][] = [
    [-0.22, -0.18],
    [0.14, -0.22],
    [0.34, 0.0],
    [0.14, 0.22],
    [-0.22, 0.18],
  ];

  for (let tierIdx = 0; tierIdx < wingTiers.length; tierIdx++) {
    const wt = wingTiers[tierIdx];

    for (const sx of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(sx * 0.48, wt.y, wt.z);
      // Note: negative yaw with sx sweeps +X/-X wings cleanly backward (-Z)!
      wingPivot.rotation.set(0, sx * wt.yaw, sx * wt.roll);
      hoverRoot.add(wingPivot);
      wingPivots.push(wingPivot);

      // 5a. Mechanical Rotary Joint Hub + Yoke Armor Clamp + Piston Strut at Wing Base
      const hubHousing = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.12, -0.12],
            [0.21, -0.06],
            [0.21, 0.06],
            [0.12, 0.12],
          ],
          8
        ),
        gunmetalMat
      );
      hubHousing.rotation.x = Math.PI / 2;

      const hubGlowCore = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.01, -0.13],
            [0.09, -0.08],
            [0.09, 0.08],
            [0.01, 0.13],
          ],
          6
        ),
        magmaGlowMat
      );
      hubGlowCore.rotation.x = Math.PI / 2;

      const yoke = new THREE.Mesh(
        createSculptedPlateGeometry(sx > 0 ? yokePts : mirrorPoints2D(yokePts), 0.22, 0.018),
        armorCharredMat
      );
      yoke.position.set(sx * 0.12, 0, 0);

      enableShadows(hubHousing);
      enableShadows(yoke);
      wingPivot.add(hubHousing, hubGlowCore, yoke);

      // 5b. Curved Primary Wing Arm Spine (TubeGeometry) + Elbow Shroud + Energy Rail
      const spinePts = [
        new THREE.Vector3(sx * 0.08, 0.0, 0.0),
        new THREE.Vector3(sx * wt.span * 0.34, wt.archY * 0.92, wt.sweepZ * 0.2),
        new THREE.Vector3(sx * wt.span * 0.68, wt.archY * 0.72, wt.sweepZ * 0.56),
        new THREE.Vector3(sx * wt.span, wt.archY * 0.16, wt.sweepZ),
      ];
      const wingCurve = new THREE.CatmullRomCurve3(spinePts);

      const wingArmTube = new THREE.Mesh(
        createTaperedTubeGeometry(spinePts, 14, 0.082, 0.018, 6, 0.85),
        armorCharredMat
      );
      enableShadows(wingArmTube);
      wingPivot.add(wingArmTube);

      // Glowing magma conduit tucked along the curved wing spine
      const emberConduitPts = spinePts.map(
        (p, idx) => new THREE.Vector3(p.x, p.y - 0.055 + idx * 0.008, p.z + 0.03)
      );
      const wingEmberTube = new THREE.Mesh(
        createTaperedTubeGeometry(emberConduitPts, 12, 0.028, 0.009, 5, 0.9),
        coreCrimsonMat
      );
      wingPivot.add(wingEmberTube);

      // Mid-wing Mechanical Elbow Knuckle Joint
      const elbowPt = wingCurve.getPointAt(0.36);
      const wingElbowNode = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.06, -0.09],
            [0.13, 0.0],
            [0.06, 0.09],
          ],
          6
        ),
        gunmetalMat
      );
      wingElbowNode.position.copy(elbowPt);
      wingElbowNode.rotation.x = Math.PI / 2;
      enableShadows(wingElbowNode);

      // Hydraulic Strut connecting root hub to elbow knuckle
      const strutPts = [
        new THREE.Vector3(sx * 0.1, -0.14, 0.04),
        new THREE.Vector3(elbowPt.x * 0.92, elbowPt.y - 0.09, elbowPt.z + 0.04),
      ];
      const wingStrut = new THREE.Mesh(
        createTaperedTubeGeometry(strutPts, 4, 0.028, 0.022, 5),
        gunmetalMat
      );
      enableShadows(wingStrut);
      wingPivot.add(wingElbowNode, wingStrut);

      // 5c. Layered Curved & Tapered Metal Feather Blades + Glowing Red-Orange Ember Edges
      for (let b = 0; b < wt.bladeCount; b++) {
        const u = 0.2 + (b / Math.max(1, wt.bladeCount - 1)) * 0.74;
        const anchor = wingCurve.getPointAt(u);
        const tangent = wingCurve.getTangentAt(u);
        const frac = (b + 0.4) / wt.bladeCount;

        const bLen = wt.bladeLen * (0.76 + Math.sin(frac * Math.PI * 0.82) * 0.42);
        const rootW = 0.25 + (1 - frac) * 0.09;
        const curveBow = bLen * (0.15 + (1 - frac) * 0.06);

        const bladeGeo = createCurvedFeatherBladeGeometry(bLen, rootW, curveBow, 0.046, 0.01, sx);
        const emberGeo = createCurvedFeatherEmberGeometry(bLen, rootW, curveBow, 0.052, sx);

        const bladeGroup = new THREE.Group();
        bladeGroup.position.copy(anchor);
        bladeGroup.position.z += (b % 2 === 0 ? 1 : -1) * 0.024;
        // Fan feather blades gracefully downward & outward from the arched wing curve
        const fanAngle = -0.96 + frac * 0.76 + Math.atan2(tangent.y, Math.abs(tangent.x)) * 0.35;
        bladeGroup.rotation.set(0.06 * (b % 2 === 0 ? 1 : -1), sx * 0.08, sx * fanAngle);

        const bladeMesh = new THREE.Mesh(bladeGeo, b % 2 === 0 ? armorDarkMat : gunmetalMat);
        const emberMesh = new THREE.Mesh(emberGeo, b % 2 === 0 ? magmaGlowMat : coreCrimsonMat);
        enableShadows(bladeMesh);

        bladeGroup.add(bladeMesh, emberMesh);
        wingPivot.add(bladeGroup);
      }

      // Secondary Overlapping Shorter Covert Armor Feathers along Upper Wing Ridge
      const covertCount = wt.bladeCount - 1;
      for (let c = 0; c < covertCount; c++) {
        const u = 0.16 + (c / Math.max(1, covertCount - 1)) * 0.56;
        const anchor = wingCurve.getPointAt(u);
        const covLen = wt.bladeLen * 0.48;
        const covGeo = createCurvedFeatherBladeGeometry(covLen, 0.19, covLen * 0.14, 0.038, 0.009, sx);

        const covGroup = new THREE.Group();
        covGroup.position.set(anchor.x, anchor.y + 0.04, anchor.z + 0.06);
        covGroup.rotation.set(0.08, sx * -0.05, sx * (-0.72 + (c / Math.max(1, covertCount)) * 0.48));

        const covMesh = new THREE.Mesh(covGeo, armorCharredMat);
        enableShadows(covMesh);
        covGroup.add(covMesh);
        wingPivot.add(covGroup);
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

    // Smooth hovering bob keeping lowest cable tips safely above crater floor
    hoverRoot.position.y = Math.sin(t * 1.9) * 0.11 + hitFactor * 0.1;

    // Counter-rotating chest singularity containment rings & pulsing magma intensity
    reactorRingOuter.rotation.z = t * 0.85 + hitFactor * 0.4;
    reactorRingInner.rotation.z = -t * 1.35;
    magmaGlowMat.emissiveIntensity = 1.85 + hitFactor * 1.15 + Math.sin(t * 3.4) * 0.22;
    coreCrimsonMat.emissiveIntensity = 1.55 + hitFactor * 0.95 + Math.cos(t * 2.9) * 0.18;
    chestLight.intensity = 2.4 + hitFactor * 1.4;

    // Subtle menacing head tilt & clawed-arm reach modulation
    headGroup.rotation.x = Math.sin(t * 1.6) * 0.045;
    for (const arm of armGroups) {
      arm.group.rotation.x = Math.sin(t * 1.9 + (arm.side > 0 ? 0.5 : 0)) * 0.055 - hitFactor * 0.16;
      arm.group.rotation.z = arm.side * (0.03 + Math.sin(t * 1.5) * 0.025);
    }

    // Floating pauldrons bob out-of-phase with torso
    for (const p of floatingPauldrons) {
      p.group.position.y = p.baseY + Math.sin(t * 2.3 + (p.side > 0 ? 0.8 : 0)) * 0.065;
      p.group.rotation.z = p.baseRoll + Math.sin(t * 1.8) * 0.04 * p.side;
    }

    // Dangling cables sway in crater heat updraft
    for (const c of danglingCables) {
      c.pivot.rotation.x = c.baseRotX + Math.sin(t * 2.2 + c.phase) * 0.075;
      c.pivot.rotation.z = c.baseRotZ + Math.cos(t * 1.7 + c.phase) * 0.065;
    }

    // Independent mechanical wing wave-flapping (3 staggered pairs)
    for (const w of wingSpecs) {
      const wave = Math.sin(t * 2.1 - w.phaseOffset);
      const flare = Math.cos(t * 1.6 - w.phaseOffset);
      w.pivot.rotation.y = w.baseYaw + w.side * (wave * 0.15 + hitFactor * 0.13);
      w.pivot.rotation.z = w.baseRoll + w.side * (flare * 0.065 + hitFactor * 0.075);
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
