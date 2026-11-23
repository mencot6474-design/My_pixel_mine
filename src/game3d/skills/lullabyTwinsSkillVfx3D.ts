import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const BARRAGE_SLASH_COUNT = 6;
const ORE_FLASH_COUNT = 6;
const FEATHER_PARTICLE_COUNT = 36;

const LULLABY_NOISE_GLSL = `
  vec2 lbHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float lbHash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float lbVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(lbHash21(i), lbHash21(i + vec2(1.0, 0.0)), f.x),
      mix(lbHash21(i + vec2(0.0, 1.0)), lbHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float lbFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * lbVnoise(p);
      p = rot * p * 2.04 + vec2(1.9, 6.7);
      a *= 0.5;
    }
    return v;
  }

  float lbRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(lbVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n) * a;
      freq *= 2.14;
      a *= 0.5;
    }
    return v;
  }

  vec3 lbVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = lbHash22(n + g);
        o = 0.5 + 0.42 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = lbHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  float lbSdHeart(vec2 p) {
    p.x = abs(p.x);
    p.y += 0.35;
    if (p.y + p.x > 1.0) {
      return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.353553;
    }
    return sqrt(min(
      dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
      dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
    )) * sign(p.x - p.y);
  }

  float lbSdStar4(vec2 p, float r, float sharpness) {
    vec2 q = abs(p);
    float d = pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness);
    return d - r;
  }
`;

/**
 * Wide cambered crescent ribbon-slash geometry so black-core sakura slashes read strongly from the elevated 3D camera.
 */
function createCamberedRibbonSlashGeometry(
  innerR = 0.36,
  outerR = 1.08,
  sweepRad = Math.PI * 1.28,
  segments = 36
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 4;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const taper = Math.pow(Math.sin(u * Math.PI), 0.34);
    const curInner = outerR - (outerR - innerR) * taper;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const camber = Math.sin(v * Math.PI) * 0.16 * taper;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = camber;
      positions[idx * 3 + 2] = sinA * r;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const c = (i + 1) * rows + (j + 1);
      const d = i * rows + (j + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Asymmetric Demon Bat-Wing Array (Left Flank — jagged obsidian pinions + curved demon horn crest).
 */
function createDemonWingArrayGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const extrudeCfg: THREE.ExtrudeGeometryOptions = {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.014,
    bevelSegments: 1,
  };

  const pinionSpecs = [
    { len: 1.55, w: 0.24, ang: 0.42, y: 0.45, x: -0.15 },
    { len: 1.32, w: 0.21, ang: 0.85, y: 0.12, x: -0.10 },
    { len: 1.08, w: 0.18, ang: 1.28, y: -0.22, x: -0.04 },
    { len: 0.84, w: 0.15, ang: 1.72, y: -0.52, x: 0.05 },
  ];

  for (const sp of pinionSpecs) {
    const s = new THREE.Shape();
    s.moveTo(0, -sp.w * 0.35);
    s.quadraticCurveTo(-sp.len * 0.45, sp.w * 0.65, -sp.len, sp.w * 0.12);
    s.quadraticCurveTo(-sp.len * 0.58, -sp.w * 0.15, -sp.len * 0.42, -sp.w * 0.52);
    s.quadraticCurveTo(-sp.len * 0.18, -sp.w * 0.22, 0, -sp.w * 0.35);
    const geo = new THREE.ExtrudeGeometry(s, extrudeCfg);
    geo.translate(0, 0, -0.0275);
    geo.rotateZ(sp.ang - 0.5);
    geo.translate(sp.x, sp.y, 0);
    parts.push(geo);
  }

  // Curved Demon Horn Crest at wing root
  const horn = new THREE.Shape();
  horn.moveTo(-0.08, 0.42);
  horn.quadraticCurveTo(-0.42, 0.92, -0.12, 1.32);
  horn.quadraticCurveTo(-0.18, 0.86, 0.08, 0.46);
  horn.closePath();
  const hornGeo = new THREE.ExtrudeGeometry(horn, extrudeCfg);
  hornGeo.translate(0, 0, -0.0275);
  parts.push(hornGeo);

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Asymmetric Angel Feathered-Wing Array (Right Flank — sweeping layered feathers + gothic ribbon streamers).
 */
function createAngelWingArrayGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const extrudeCfg: THREE.ExtrudeGeometryOptions = {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.014,
    bevelSegments: 1,
  };

  const featherSpecs = [
    { len: 1.62, w: 0.22, ang: -0.40, y: 0.48, x: 0.12 },
    { len: 1.42, w: 0.20, ang: -0.74, y: 0.20, x: 0.08 },
    { len: 1.18, w: 0.18, ang: -1.08, y: -0.08, x: 0.04 },
    { len: 0.96, w: 0.16, ang: -1.42, y: -0.36, x: 0.0 },
    { len: 0.74, w: 0.14, ang: -1.78, y: -0.60, x: -0.04 },
  ];

  for (const sp of featherSpecs) {
    const s = new THREE.Shape();
    s.moveTo(0, -sp.w * 0.28);
    s.quadraticCurveTo(sp.len * 0.55, sp.w * 0.62, sp.len, sp.w * 0.08);
    s.quadraticCurveTo(sp.len * 0.55, -sp.w * 0.44, 0, -sp.w * 0.28);
    const geo = new THREE.ExtrudeGeometry(s, extrudeCfg);
    geo.translate(0, 0, -0.0275);
    geo.rotateZ(sp.ang + 0.5);
    geo.translate(sp.x, sp.y, 0);
    parts.push(geo);
  }

  // Flowing Gothic Ribbon Tie trailing from the angel wing
  const ribbon = new THREE.Shape();
  ribbon.moveTo(0.18, 0.22);
  ribbon.quadraticCurveTo(0.75, -0.25, 0.52, -0.95);
  ribbon.lineTo(0.40, -0.92);
  ribbon.quadraticCurveTo(0.60, -0.28, 0.12, 0.16);
  ribbon.closePath();
  const ribGeo = new THREE.ExtrudeGeometry(ribbon, { ...extrudeCfg, depth: 0.032 });
  ribGeo.translate(0, 0, 0.03);
  parts.push(ribGeo);

  return mergeSimpleGeos(parts);
}

/**
 * Giant Sculpted Slender Anime Reaper Scythe (Demon Left / Angel Right mirrored).
 * Long prominent diagonal shaft descending to a collar mount at y = 1.52, with a sleek ~9.5:1 curved
 * crescent blade sweeping downward so its needle-sharp tip (y = -0.28) plunges straight INTO the pit floor.
 */
function createTwinCrescentScytheGeometry(mirrorX: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const sx = mirrorX ? -1 : 1;
  const bladeExtrude: THREE.ExtrudeGeometryOptions = {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 1,
  };

  // Sleek slender crescent blade: collar at (+0.65*sx, 1.52) -> sweeps across & down to needle tip (-0.95*sx, -0.28)
  const pts: Array<[number, number]> = [
    [0.65 * sx, 1.64],  // Collar spine
    [0.18 * sx, 1.66],  // Arch leaving collar (~80 deg to handle)
    [-0.28 * sx, 1.44], // Outer spine sweep
    [-0.66 * sx, 1.02], // Slender taper
    [-0.90 * sx, 0.44], // Razor taper
    [-0.95 * sx, -0.28], // Needle-sharp tip buried INTO pit floor!
    [-0.75 * sx, 0.38], // Inner concave cutting edge
    [-0.46 * sx, 0.88],
    [-0.10 * sx, 1.22],
    [0.28 * sx, 1.38],
    [0.65 * sx, 1.38],  // Collar heel
  ];
  if (mirrorX) {
    pts.reverse();
  }

  const blade = new THREE.Shape();
  blade.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    blade.lineTo(pts[i][0], pts[i][1]);
  }
  blade.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(blade, bladeExtrude);
  bladeGeo.translate(0, 0, -0.012);
  parts.push(bladeGeo);

  // Short gothic back-spur behind the collar (opposite side of blade)
  const spurPts: Array<[number, number]> = [
    [0.62 * sx, 1.62],
    [1.04 * sx, 1.44],
    [0.84 * sx, 1.34],
    [0.62 * sx, 1.40],
  ];
  if (mirrorX) spurPts.reverse();
  const spur = new THREE.Shape();
  spur.moveTo(spurPts[0][0], spurPts[0][1]);
  for (let i = 1; i < spurPts.length; i++) {
    spur.lineTo(spurPts[i][0], spurPts[i][1]);
  }
  spur.closePath();
  const spurGeo = new THREE.ExtrudeGeometry(spur, bladeExtrude);
  spurGeo.translate(0, 0, -0.012);
  parts.push(spurGeo);

  // Prominent straight ornate shaft running from collar (+0.65*sx, 1.52) UP-LEFT to (-0.85*sx, 3.65)
  const collar = new THREE.Vector3(0.65 * sx, 1.52, 0);
  const pommelEnd = new THREE.Vector3(-0.85 * sx, 3.65, 0);
  const shaftDir = pommelEnd.clone().sub(collar);
  const shaftLen = shaftDir.length();
  const shaftAngle = Math.atan2(-shaftDir.x, shaftDir.y);

  const shaft = new THREE.CylinderGeometry(0.040, 0.048, shaftLen, 8);
  shaft.translate(0, shaftLen * 0.5, 0);
  shaft.rotateZ(shaftAngle);
  shaft.translate(collar.x, collar.y, 0);
  parts.push(shaft);

  // Collar sleeve & diamond gem + top pommel spear
  const collarGem = new THREE.OctahedronGeometry(0.14, 0);
  collarGem.scale(0.85, 1.3, 0.55);
  collarGem.rotateZ(shaftAngle);
  collarGem.translate(collar.x, collar.y, 0);
  parts.push(collarGem);

  const pommel = new THREE.ConeGeometry(0.085, 0.42, 4);
  pommel.scale(0.85, 1.0, 0.45);
  pommel.translate(0, shaftLen + 0.16, 0);
  pommel.rotateZ(shaftAngle);
  pommel.translate(collar.x, collar.y, 0);
  parts.push(pommel);

  return mergeSimpleGeos(parts);
}

/**
 * Layer 1A Shader: Horizontal Gothic Rose-Window & Split Angel/Demon Nightmare Domain Floor Seal.
 * Uses NormalBlending with deep abyssal obsidian-velvet plate so black-core lace & neon sakura/violet lines pop on ANY world!
 */
function createNightmareRoseDomainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#c084fc') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float snapIn = 1.0 - pow(1.0 - clamp(uProgress / 0.10, 0.0, 1.0), 4.0);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.28) / 0.16, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.56) / 0.44, 0.0, 1.0);

        // Split Angel (Porcelain-Violet) vs Demon (Obsidian-Sakura) spiral duality
        float swirl = ang + r * 2.4 - uTime * 2.2;
        float polarity = smoothstep(-0.08, 0.08, sin(swirl));

        // 12-petal Gothic Cathedral Rose-Window pointed arches
        float roseWave = 0.068 * pow(abs(cos(ang * 6.0 - uTime * 0.75)), 2.2);
        float outerLace = exp(-pow((r - (0.87 + roseWave * 0.65)) * 28.0, 2.0));
        float midArch = exp(-pow((r - (0.62 - roseWave * 0.85)) * 26.0, 2.0));
        float innerHalo = exp(-pow((r - 0.34) * 28.0, 2.0));
        float gothicSpokes = smoothstep(0.90, 0.99, abs(cos(ang * 6.0 - uTime * 0.75))) * smoothstep(0.28, 0.36, r) * smoothstep(0.92, 0.82, r);

        // Orbiting 6 Gothic Cross-Stars & Hearts on the outer ring
        float sectorAng = mod(ang - uTime * 0.95 + 3.14159265, 1.04719755) - 0.52359877;
        vec2 localSlot = vec2(sin(sectorAng) * r, r - 0.74);
        float heartMask = smoothstep(0.025, 0.0, lbSdHeart(localSlot * 10.5));
        float starMask = smoothstep(0.02, 0.0, lbSdStar4(vec2(p.x, p.y), 0.24, 0.52));

        // Heartbeat ripple pulsing outward on climax & overdrive
        float pulseR = fract(uProgress * 2.3) * 0.95;
        float ripple = exp(-pow((r - pulseR) * 22.0, 2.0)) * (0.45 + strike * 0.9);

        vec3 vor = lbVoronoi(p * 5.2, 0.4);
        float crackWeb = smoothstep(0.065, 0.008, vor.y) * smoothstep(0.27, 0.34, uProgress);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.76 + outerLace * 0.3);

        vec3 obsidianVelvet = vec3(0.035, 0.010, 0.068);
        vec3 porcelainWhite = vec3(0.96, 0.94, 1.0);
        vec3 sakuraNeon = uColor * 1.65;
        vec3 abyssViolet = uCoreColor * 1.55;

        vec3 fieldCol = mix(obsidianVelvet, vec3(0.09, 0.03, 0.16), polarity * 0.65);
        vec3 traceryCol = mix(sakuraNeon, mix(abyssViolet, porcelainWhite, 0.45), polarity);

        float lineEnergy = clamp(outerLace + midArch + innerHalo + gothicSpokes * 0.8 + heartMask + starMask * 0.9 + ripple + crackWeb, 0.0, 1.35);
        vec3 col = fieldCol + traceryCol * lineEnergy;
        col += porcelainWhite * (starMask * 0.75 + crackWeb * 0.95 + innerHalo * 0.45);

        float baseDisc = smoothstep(0.96, 0.68, r) * 0.84;
        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp(max(baseDisc, min(1.0, lineEnergy)) * edgeFade * snapIn * dissolve, 0.0, 0.96);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Layer 1B Shader: Towering Upright Gothic Cathedral Rose-Mirror Backdrop (Voronoi Shatter at 0.74s).
 */
function createGothicRoseMirrorBackdropMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float snapIn = 1.0 - pow(1.0 - clamp(uProgress / 0.12, 0.0, 1.0), 4.0);
        float shatterT = 1.0 - pow(1.0 - clamp((uProgress - 0.29) / 0.22, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.55) / 0.45, 0.0, 1.0);

        vec3 vor = lbVoronoi(p * 4.8, 0.3);
        float crackEdge = smoothstep(0.08, 0.01, vor.y) * smoothstep(0.27, 0.34, uProgress);

        // Radial glass-shard scatter offset after twin slam
        vec2 dir = r > 0.001 ? p / r : vec2(0.0, 1.0);
        vec2 sp = p + dir * shatterT * 0.14 * vor.z;
        float sr = length(sp);
        float sang = atan(sp.y, sp.x);

        // Pointed Gothic Rose Frame + Twin Split Heart/Cross-Star Core
        float frameRing = exp(-pow((sr - 0.88) * 22.0, 2.0));
        float innerRose = exp(-pow((sr - (0.58 + 0.06 * cos(sang * 8.0 + uTime * 1.4))) * 22.0, 2.0));
        float tracery = smoothstep(0.88, 0.985, abs(cos(sang * 8.0 + uTime * 0.8))) * smoothstep(0.32, 0.42, sr) * smoothstep(0.88, 0.80, sr);
        float centerStar = smoothstep(0.035, 0.0, lbSdStar4(sp, 0.34, 0.52));
        float centerHeart = smoothstep(0.025, 0.0, abs(lbSdHeart(sp * 3.8)));

        // RGB chromatic aberration split across the shattered mirror
        float split = 0.012 + 0.038 * shatterT;
        float mirrorL = smoothstep(0.0, 0.08, -sp.x);
        float mCore = clamp(frameRing + innerRose + tracery * 0.8 + centerStar + centerHeart, 0.0, 1.3);
        float mR = exp(-pow((length(sp + dir * split) - 0.88) * 20.0, 2.0)) + centerStar;
        float mB = exp(-pow((length(sp - dir * split) - 0.88) * 20.0, 2.0)) + centerHeart;

        vec3 sakura = uColor * 1.75;
        vec3 porcelain = uCoreColor * 1.65;
        vec3 violet = vec3(0.68, 0.34, 0.98) * 1.75;
        float glowField = exp(-sr * sr * 2.8) * 0.34;

        vec3 col = vec3(mR, 0.0, 0.0) * sakura
          + vec3(0.0, mCore, 0.0) * mix(sakura, porcelain, mirrorL)
          + vec3(0.0, 0.0, mB) * violet
          + mix(sakura, violet, 0.5) * (mCore * 0.85 + glowField)
          + vec3(1.0) * (crackEdge * 1.35 + centerStar * 0.9);

        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.78 + vor.y * 0.30);
        float alpha = clamp((max(mCore, crackEdge) * 0.95 + glowField) * smoothstep(0.99, 0.88, r) * snapIn * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 2A Shader: Black-Core Sakura-Magenta Ribbon & Cursed Demon Crescent Slash (exact attack.webp aesthetic!).
 * NormalBlending preserves the pitch-black anime ink core inside blazing sakura/violet edges.
 */
function createLullabyRibbonSlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsDemon: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#e879f9') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform float uLocalT;
      uniform float uSeed;
      uniform float uIsDemon;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      float ribbonBand(vec2 uv, float head, float tail) {
        float h = smoothstep(head + 0.08, head - 0.02, uv.x);
        float t = smoothstep(tail - 0.10, tail + 0.06, uv.x);
        float body = smoothstep(0.04, 0.28, uv.y) * smoothstep(1.0, 0.91, uv.y);
        float laceWave = smoothstep(0.32, 0.85, cos(uv.x * 38.0 - uTime * 12.0 + uSeed)) * smoothstep(0.45, 0.10, uv.y);
        return clamp((body + laceWave * 0.42 * body) * h * t, 0.0, 1.0);
      }

      void main() {
        float dissolveT = clamp((uProgress - 0.56) / 0.44, 0.0, 1.0);
        float head = 1.0 - pow(1.0 - clamp(uLocalT * 4.2, 0.0, 1.0), 4.0);
        float tail = max(0.0, (uLocalT - 0.24) * 1.45);

        float split = 0.026 * (1.0 - uLocalT * 0.4);
        float bMain = ribbonBand(vUv, head, tail);
        float bShift = ribbonBand(vUv + vec2(split, 0.012), head, tail);

        // Pitch-black anime ink core (like attack.webp) vs blazing sakura/violet outer ribbon edges
        float inkCore = smoothstep(0.70, 0.24, vUv.y) * smoothstep(0.08, 0.28, vUv.y);
        float razorOuter = smoothstep(0.68, 0.94, vUv.y) * smoothstep(1.0, 0.91, vUv.y);
        float innerEdge = smoothstep(0.24, 0.10, vUv.y) * smoothstep(0.02, 0.11, vUv.y);
        float sparkle = smoothstep(0.84, 0.98, lbHash21(floor(vec2(vUv.x * 42.0, vUv.y * 10.0) + uSeed)));

        vec3 vor = lbVoronoi(vec2(vUv.x * 9.0 + uSeed, vUv.y * 4.0), 0.3);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.72 + vUv.y * 0.30);

        vec3 inkBlack = vec3(0.02, 0.006, 0.042);
        vec3 porcelain = vec3(0.97, 0.95, 1.0);
        vec3 baseTint = mix(uColor * 1.65, uCoreColor * 1.75, bShift * 0.65);

        vec3 col = mix(baseTint, mix(inkBlack, porcelain * 0.92, uIsDemon * 0.68), inkCore * 0.92);
        col = mix(col, mix(uColor * 1.85, vec3(1.0), 0.55), clamp(razorOuter + innerEdge * 0.75, 0.0, 1.0));
        col += vec3(1.0, 0.90, 0.98) * (sparkle * 1.35 + razorOuter * 0.65) * bMain;

        float alpha = clamp(max(bMain, bShift * 0.85) * 1.25 * dissolve, 0.0, 0.99);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Layer 2B Shader: Direct Per-Ore Gothic 4-Point Cross-Star & Heart Hit Flash.
 */
function createGothicHitFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#c084fc') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 3.6, 0.0, 1.0), 3.0);
        float ring = exp(-pow((r - mix(0.14, 0.88, pop)) * 18.0, 2.0));
        float starX = (0.024 / (abs(p.y) + 0.018)) * smoothstep(0.95, 0.05, abs(p.x));
        float starY = (0.024 / (abs(p.x) + 0.018)) * smoothstep(0.95, 0.05, abs(p.y));
        float heartGlow = smoothstep(0.05, 0.0, lbSdHeart(p * 3.1)) * (1.0 - uLocalT * 0.65);

        float n = lbVnoise(p * 8.0);
        float localDissolve = smoothstep(uLocalT - 0.12, uLocalT + 0.12, n * 0.65 + (1.0 - r) * 0.45);
        float skillDissolve = smoothstep(clamp((uProgress - 0.55) / 0.45, 0.0, 1.0) - 0.1, clamp((uProgress - 0.55) / 0.45, 0.0, 1.0) + 0.1, n);

        float mask = clamp((ring + (starX + starY) * 0.72 + heartGlow * 0.85) * smoothstep(0.99, 0.78, r), 0.0, 1.3);
        vec3 col = mix(uColor * 1.65, uCoreColor * 1.75, ring) + vec3(1.0, 0.94, 0.99) * clamp(heartGlow * 0.9 + (starX + starY) * 0.55, 0.0, 1.0);
        float alpha = clamp(mask * localDissolve * skillDissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 3 Shader: Luminous Anime Energy-Steel Gothic Wings & Giant Twin Execution Weapons.
 */
function createGothicArtifactMaterial(isWhiteAngel: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uIsWhite: { value: isWhiteAngel ? 1.0 : 0.0 },
      uColor: { value: new THREE.Color(isWhiteAngel ? '#f8fafc' : '#f472b6') },
      uCoreColor: { value: new THREE.Color(isWhiteAngel ? '#c084fc' : '#e879f9') },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform float uIsWhite;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        float charge = smoothstep(0.0, 0.08, uProgress);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.16) / 0.34, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.56) / 0.44, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.35, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.22, 0.42, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.35);
        float bevelGleam = smoothstep(0.35, 0.88, abs(N.x) + abs(N.y) * 0.6);
        float vein = smoothstep(0.62, 0.94, sin(vLocalPos.y * 12.0 - uTime * 16.0 + vLocalPos.x * 6.0));

        vec3 vor = lbVoronoi(vLocalPos.xy * 4.2, 0.35);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + rim * 0.32);

        // Luminous Anime Energy-Steel Blade (blazing sakura-magenta & porcelain-violet bevel ridge + core glow)
        vec3 demonCol = mix(uColor * (1.45 + strike * 0.6), uCoreColor * 1.85, clamp(vein * 0.65 + cel * 0.45, 0.0, 1.0));
        vec3 angelCol = mix(uCoreColor * (1.45 + strike * 0.55), uColor * 1.75, clamp(cel * 0.6 + bevelGleam * 0.55, 0.0, 1.0));

        vec3 col = mix(demonCol, angelCol, uIsWhite);
        col += vec3(1.0, 0.94, 0.99) * clamp(pow(rim, 1.65) * 0.95 + bevelGleam * 0.52, 0.0, 1.25);

        float alpha = clamp((0.46 + rim * 0.85 + bevelGleam * 0.45 + vein * 0.32) * charge * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 4A Shader: Towering Abyssal Sakura-Eclipse Nightmare Spire (carved ink-flame hollows + sakura-violet lightning veins — ZERO dome!).
 */
function createNightmareEclipseSpireMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#c084fc') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float flare = 1.0 + 0.62 * pow(1.0 - uv.y, 2.2) + 0.14 * sin(uv.y * 14.0 - uTime * 24.0 + uv.x * 12.566);
        transformed.xz *= flare;
        vec4 mvPos = modelViewMatrix * vec4(transformed, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        if (uProgress < 0.29) discard;
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.29) / 0.18, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.55) / 0.45, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float centerHot = pow(abs(dot(N, V)), 1.35);
        float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);

        vec2 beamUv = vec2(vUv.x * 9.0, vUv.y * 3.8 - uTime * 4.8);
        vec2 warp = vec2(lbFbm(beamUv), lbFbm(beamUv + vec2(3.1, 1.7)));
        float fbm = lbFbm(beamUv + warp * 1.25);
        float ridged = lbRidged(beamUv * 1.35 + warp);

        // Carved dark nightmare hollows bordered by sakura-magenta & porcelain-violet lightning ribbons
        float flameBand = smoothstep(0.32, 0.50, fbm) * (1.0 - smoothstep(0.68, 0.86, fbm) * 0.55);
        float bolt = smoothstep(0.70, 0.88, ridged);
        float helixRibbon = smoothstep(0.58, 0.95, sin(vUv.x * 18.8495 - vUv.y * 12.0 - uTime * 18.0));

        vec3 vor = lbVoronoi(beamUv * 1.3, 0.25);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.72 + (1.0 - vUv.y) * 0.30);

        float vFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.16, vUv.y);
        vec3 col = mix(uColor * (1.55 + strike * 0.65), uCoreColor * 1.75, clamp(helixRibbon * 0.75 + fresnel * 0.55, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.95, 1.0), clamp(centerHot * 0.82 + bolt * 0.92, 0.0, 1.0));

        float alpha = clamp((centerHot * 0.78 + flameBand * 0.55 + bolt * 0.85 + helixRibbon * 0.45 + fresnel * 0.38) * vFade * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 4B Shader: Flat Horizontal Shattered-Mirror & Gothic Lace Shockwave Ring.
 */
function createMirrorShatterShockwaveMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#c084fc') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        if (uProgress < 0.29) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float boomT = clamp((uProgress - 0.29) / 0.18, 0.0, 1.0);
        float boomEase = 1.0 - pow(1.0 - boomT, 3.0);
        float dissolveT = clamp((uProgress - 0.55) / 0.45, 0.0, 1.0);

        float gothicPetals = 0.13 * pow(abs(cos(ang * 6.0 - uTime * 2.5)), 4.0)
          + 0.07 * pow(abs(sin(ang * 12.0 + uTime * 3.0)), 3.0);
        float waveR = mix(0.12, 0.85, boomEase) + gothicPetals * boomEase;

        float ringR = exp(-pow((r - (waveR + 0.026)) * 22.0, 2.0));
        float ringG = exp(-pow((r - waveR) * 24.0, 2.0));
        float ringB = exp(-pow((r - (waveR - 0.026)) * 22.0, 2.0));

        float rays = pow(max(0.0, cos(ang * 12.0 + uTime * 1.8)), 14.0) * smoothstep(waveR + 0.08, 0.14, r) * smoothstep(0.08, 0.25, r);
        vec3 vor = lbVoronoi(p * 6.2, 0.25);
        float glassCrack = smoothstep(0.075, 0.01, vor.y) * smoothstep(waveR + 0.04, 0.08, r);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + ringG * 0.35);

        vec3 col = vec3(ringR, 0.0, 0.0) * (uColor * 1.85)
                 + vec3(0.0, ringG, 0.0) * vec3(0.98, 0.94, 1.0) * 1.75
                 + vec3(0.0, 0.0, ringB) * (uCoreColor * 1.85)
                 + mix(uColor, uCoreColor, 0.5) * (glassCrack * 1.3 + rays * 1.5)
                 + vec3(1.0) * (ringG * 0.75 + glassCrack * 0.5);

        float alpha = clamp((max(max(ringR, ringG), ringB) + glassCrack * 0.9 + rays * 0.9) * smoothstep(0.99, 0.85, r) * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 5 Shader: Procedural Fluttering Angel (Porcelain-White) & Demon (Black-Ink Sakura) Feathers.
 */
function createGothicFeatherParticleMaterial(isWhiteAngel: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalLife: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsWhite: { value: isWhiteAngel ? 1.0 : 0.0 },
      uColor: { value: new THREE.Color(isWhiteAngel ? '#f8fafc' : '#f472b6') },
      uCoreColor: { value: new THREE.Color(isWhiteAngel ? '#c084fc' : '#e879f9') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uLocalLife;
      uniform float uSeed;
      uniform float uIsWhite;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        // Curved tapered feather silhouette along X, with notched barb edge
        float curveY = p.y - 0.18 * (p.x * p.x);
        float halfW = 0.42 * smoothstep(1.0, 0.12, abs(p.x)) * (0.65 + 0.35 * cos(p.x * 2.4));
        float notch = 0.08 * step(0.65, fract(p.x * 6.5 + 0.2)) * smoothstep(0.2, 0.6, abs(p.x));
        float dist = abs(curveY) - max(0.02, halfW - notch);
        if (dist > 0.04 || abs(p.x) > 0.96) discard;

        float body = smoothstep(0.04, -0.04, dist);
        float rim = smoothstep(0.05, 0.0, abs(dist)) * body;
        float quill = smoothstep(0.055, 0.015, abs(curveY)) * smoothstep(0.92, 0.1, abs(p.x));

        float n = lbHash21(floor(vUv * 8.0 + uSeed));
        float dissolve = smoothstep(uLocalLife - 0.14, uLocalLife + 0.14, n * 0.6 + (1.0 - abs(p.x)) * 0.5);
        float skillDissolve = smoothstep(clamp((uProgress - 0.56) / 0.44, 0.0, 1.0) - 0.1, clamp((uProgress - 0.56) / 0.44, 0.0, 1.0) + 0.1, n * 0.65 + 0.35);

        vec3 demonCol = mix(vec3(0.025, 0.008, 0.05), uColor * 1.65, clamp(rim * 1.1 + quill * 0.55, 0.0, 1.0));
        vec3 angelCol = mix(uColor * 1.15, vec3(0.04, 0.02, 0.09), rim * 0.72);
        angelCol += uCoreColor * quill * 0.85;

        vec3 col = mix(demonCol, angelCol, uIsWhite);
        float alpha = clamp(body * dissolve * skillDissolve * (1.0 - smoothstep(0.72, 1.0, uLocalLife)), 0.0, 0.98);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

interface BarrageSlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  baseScale: number;
  spinSpeed: number;
  beatFired: boolean;
  targetIndex: number;
}

interface OreFlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseScale: number;
}

interface FeatherParticleSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseScale: number;
  flutterSeed: number;
}

interface LullabySkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  overdriveFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  domainMesh: THREE.Mesh;
  domainMat: THREE.ShaderMaterial;
  mirrorMesh: THREE.Mesh;
  mirrorMat: THREE.ShaderMaterial;
  leftWingMesh: THREE.Mesh;
  rightWingMesh: THREE.Mesh;
  leftWingMat: THREE.ShaderMaterial;
  rightWingMat: THREE.ShaderMaterial;
  barrageSlashes: BarrageSlashSlot[];
  oreFlashes: OreFlashSlot[];
  demonScytheMesh: THREE.Mesh;
  angelLanceMesh: THREE.Mesh;
  demonScytheMat: THREE.ShaderMaterial;
  angelLanceMat: THREE.ShaderMaterial;
  spireMesh: THREE.Mesh;
  spireMat: THREE.ShaderMaterial;
  climaxFlareMesh: THREE.Mesh;
  climaxFlareMat: THREE.ShaderMaterial;
  shockwaveMesh: THREE.Mesh;
  shockwaveMat: THREE.ShaderMaterial;
  feathers: FeatherParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Lullaby Twins
 * ("Nightmare Lullaby: Twin Eclipse Requiem" — Gothic Rose-Window & Split Angel/Demon Domain
 * -> 6-Hit Black-Core Sakura Ribbon & Demon Claw Blitz -> Shattering Gothic Mirror + Twin easeInExpo Scythe & Lance Slam
 * -> Hit-Stop + Abyssal Sakura-Eclipse Nightmare Spire + 36 Fluttering Angel & Demon Feathers -> Requiem Heartbeat Detonation!).
 */
export class LullabyTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: LullabySkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const slashGeo = createCamberedRibbonSlashGeometry(0.36, 1.08, Math.PI * 1.28, 36);
    const demonWingGeo = createDemonWingArrayGeometry();
    const angelWingGeo = createAngelWingArrayGeometry();
    const demonScytheGeo = createTwinCrescentScytheGeometry(false);
    const angelLanceGeo = createTwinCrescentScytheGeometry(true);
    const spireGeo = new THREE.CylinderGeometry(0.92, 1.45, 9.8, 28, 12, true);
    spireGeo.translate(0, 4.9, 0);
    this.sharedGeos.push(
      planeGeo,
      slashGeo,
      demonWingGeo,
      angelWingGeo,
      demonScytheGeo,
      angelLanceGeo,
      spireGeo
    );

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const domainMat = createNightmareRoseDomainMaterial();
      const domainMesh = new THREE.Mesh(planeGeo, domainMat);
      domainMesh.rotation.x = -Math.PI / 2;
      root.add(domainMesh);
      this.allMats.push(domainMat);

      const mirrorMat = createGothicRoseMirrorBackdropMaterial();
      const mirrorMesh = new THREE.Mesh(planeGeo, mirrorMat);
      mirrorMesh.rotation.set(-0.22, 0, 0);
      root.add(mirrorMesh);
      this.allMats.push(mirrorMat);

      const leftWingMat = createGothicArtifactMaterial(false);
      leftWingMat.uniforms.uColor.value.set('#f472b6');
      leftWingMat.uniforms.uCoreColor.value.set('#a855f7');
      const leftWingMesh = new THREE.Mesh(demonWingGeo, leftWingMat);
      root.add(leftWingMesh);

      const rightWingMat = createGothicArtifactMaterial(true);
      rightWingMat.uniforms.uColor.value.set('#f8fafc');
      rightWingMat.uniforms.uCoreColor.value.set('#c084fc');
      const rightWingMesh = new THREE.Mesh(angelWingGeo, rightWingMat);
      root.add(rightWingMesh);
      this.allMats.push(leftWingMat, rightWingMat);

      const barrageSlashes: BarrageSlashSlot[] = [];
      for (let i = 0; i < BARRAGE_SLASH_COUNT; i++) {
        const isDemon = i % 2 === 1;
        const mat = createLullabyRibbonSlashMaterial();
        mat.uniforms.uSeed.value = (i + 1) * 2.93;
        mat.uniforms.uIsDemon.value = isDemon ? 1.0 : 0.0;
        const mesh = new THREE.Mesh(slashGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        barrageSlashes.push({
          mesh,
          mat,
          delay: 0.20 + i * 0.066,
          baseScale: 4.5,
          spinSpeed: 12.0,
          beatFired: false,
          targetIndex: i,
        });
      }

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createGothicHitFlashMaterial();
        const fMesh = new THREE.Mesh(planeGeo, fMat);
        fMesh.rotation.set(-0.55, 0, 0);
        fMesh.visible = false;
        root.add(fMesh);
        this.allMats.push(fMat);
        oreFlashes.push({
          mesh: fMesh,
          mat: fMat,
          active: false,
          age: 0,
          life: 0.24,
          baseScale: 3.2,
        });
      }

      const demonScytheMat = createGothicArtifactMaterial(false);
      demonScytheMat.uniforms.uColor.value.set('#f472b6');
      demonScytheMat.uniforms.uCoreColor.value.set('#e879f9');
      const demonScytheMesh = new THREE.Mesh(demonScytheGeo, demonScytheMat);
      demonScytheMesh.visible = false;
      root.add(demonScytheMesh);

      const angelLanceMat = createGothicArtifactMaterial(true);
      angelLanceMat.uniforms.uColor.value.set('#f8fafc');
      angelLanceMat.uniforms.uCoreColor.value.set('#c084fc');
      const angelLanceMesh = new THREE.Mesh(angelLanceGeo, angelLanceMat);
      angelLanceMesh.visible = false;
      root.add(angelLanceMesh);
      this.allMats.push(demonScytheMat, angelLanceMat);

      const spireMat = createNightmareEclipseSpireMaterial();
      const spireMesh = new THREE.Mesh(spireGeo, spireMat);
      spireMesh.visible = false;
      root.add(spireMesh);
      this.allMats.push(spireMat);

      const climaxFlareMat = createGothicHitFlashMaterial();
      climaxFlareMat.uniforms.uColor.value.set('#f472b6');
      climaxFlareMat.uniforms.uCoreColor.value.set('#c084fc');
      const climaxFlareMesh = new THREE.Mesh(planeGeo, climaxFlareMat);
      climaxFlareMesh.rotation.set(-0.48, 0, 0);
      climaxFlareMesh.visible = false;
      root.add(climaxFlareMesh);
      this.allMats.push(climaxFlareMat);

      const shockwaveMat = createMirrorShatterShockwaveMaterial();
      const shockwaveMesh = new THREE.Mesh(planeGeo, shockwaveMat);
      shockwaveMesh.rotation.x = -Math.PI / 2;
      shockwaveMesh.visible = false;
      root.add(shockwaveMesh);
      this.allMats.push(shockwaveMat);

      const feathers: FeatherParticleSlot[] = [];
      for (let i = 0; i < FEATHER_PARTICLE_COUNT; i++) {
        const isWhite = i % 2 === 1;
        const fMat = createGothicFeatherParticleMaterial(isWhite);
        fMat.uniforms.uSeed.value = (i + 1) * 1.73;
        const fMesh = new THREE.Mesh(planeGeo, fMat);
        fMesh.visible = false;
        root.add(fMesh);
        this.allMats.push(fMat);
        feathers.push({
          mesh: fMesh,
          mat: fMat,
          active: false,
          age: 0,
          life: 0.75,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 0.65,
          flutterSeed: i * 1.37,
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        impactFired: false,
        overdriveFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        domainMesh,
        domainMat,
        mirrorMesh,
        mirrorMat,
        leftWingMesh,
        rightWingMesh,
        leftWingMat,
        rightWingMat,
        barrageSlashes,
        oreFlashes,
        demonScytheMesh,
        angelLanceMesh,
        demonScytheMat,
        angelLanceMat,
        spireMesh,
        spireMat,
        climaxFlareMesh,
        climaxFlareMat,
        shockwaveMesh,
        shockwaveMat,
        feathers,
        onSlashBeatCallback: null,
        onImpactCallback: null,
      });
    }
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public getMaterials(): THREE.ShaderMaterial[] {
    return this.allMats;
  }

  private triggerOreFlash(inst: LullabySkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isSakura: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.25;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.9, pt.z + 0.15);
    f.mesh.scale.setScalar(scale * 0.4);
    f.mat.uniforms.uColor.value.set(isSakura ? '#f472b6' : '#c084fc');
    f.mat.uniforms.uCoreColor.value.set(isSakura ? '#e879f9' : '#f8fafc');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchFeatherBurst(inst: LullabySkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.feathers.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const fp = inst.feathers[i];
      fp.active = true;
      fp.age = 0;
      fp.life = 0.56 + ((i * 17) % 10) * 0.042;
      fp.pos.copy(origin);
      fp.floorY = inst.cy + 0.10;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 5) * 0.24;
      const spd = (4.2 + ((i * 29) % 10) * 0.58) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (3.4 + ((i * 23) % 10) * 0.56) * speedMult;
      fp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      fp.baseScale = (0.58 + (i % 4) * 0.16) * Math.max(0.75, inst.areaScale);
      fp.mesh.position.copy(fp.pos);
      fp.mesh.visible = true;
      fp.mat.uniforms.uLocalLife.value = 0;
    }
  }

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts: readonly WorldPoint3[];
    onSlashBeat?: (beatIdx: number, pt: WorldPoint3) => void;
    onImpact?: () => void;
  }): void {
    const inst = this.instances.find((s) => !s.active) ?? this.instances[0];
    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.impactFired = false;
    inst.overdriveFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    inst.domainMesh.position.set(opts.cx, opts.cy + 0.08, opts.cz);
    inst.domainMesh.scale.setScalar(0.01);
    inst.domainMat.uniforms.uProgress.value = 0;

    inst.mirrorMesh.position.set(opts.cx, opts.cy + 3.45 * opts.areaScale, opts.cz - 1.55 * opts.areaScale);
    inst.mirrorMesh.scale.setScalar(0.01);
    inst.mirrorMat.uniforms.uProgress.value = 0;

    inst.leftWingMesh.position.set(opts.cx - 3.35 * opts.areaScale, opts.cy + 2.65 * opts.areaScale, opts.cz - 0.95 * opts.areaScale);
    inst.leftWingMesh.rotation.set(0.16, 0.36, 0.18);
    inst.leftWingMesh.scale.setScalar(0.01);
    inst.leftWingMat.uniforms.uProgress.value = 0;

    inst.rightWingMesh.position.set(opts.cx + 3.35 * opts.areaScale, opts.cy + 2.65 * opts.areaScale, opts.cz - 0.95 * opts.areaScale);
    inst.rightWingMesh.rotation.set(0.16, -0.36, -0.18);
    inst.rightWingMesh.scale.setScalar(0.01);
    inst.rightWingMat.uniforms.uProgress.value = 0;

    const slashLimit = this.lowQuality ? 3 : BARRAGE_SLASH_COUNT;
    for (let i = 0; i < inst.barrageSlashes.length; i++) {
      const slot = inst.barrageSlashes[i];
      slot.beatFired = false;
      if (i >= slashLimit) {
        slot.mesh.visible = false;
        continue;
      }
      const isDemon = i % 2 === 1;
      const tgt = inst.pts[i % inst.pts.length];
      slot.targetIndex = i % inst.pts.length;
      slot.delay = 0.20 + i * 0.066;
      slot.baseScale = (3.7 + (i % 3) * 0.65) * opts.areaScale;
      slot.spinSpeed = (isDemon ? -1 : 1) * (13.0 + i * 0.85);
      slot.mesh.position.set(tgt.x, tgt.y + 0.90 + (i % 2) * 0.18, tgt.z);
      slot.mesh.rotation.set((isDemon ? -1 : 1) * 0.34, i * 1.22, (isDemon ? -1 : 1) * 0.42);
      slot.mesh.scale.setScalar(0.01);
      slot.mesh.visible = false;
      slot.mat.uniforms.uColor.value.set(isDemon ? '#c084fc' : '#f472b6');
      slot.mat.uniforms.uCoreColor.value.set(isDemon ? '#f8fafc' : '#e879f9');
      slot.mat.uniforms.uProgress.value = 0;
      slot.mat.uniforms.uLocalT.value = 0;
    }

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    inst.demonScytheMesh.position.set(opts.cx - 2.4 * opts.areaScale, opts.cy + 5.0, opts.cz + 0.15);
    inst.demonScytheMesh.rotation.set(0.08, 0.08, 0.58);
    inst.demonScytheMesh.scale.setScalar(1.38 * Math.max(0.75, opts.areaScale));
    inst.demonScytheMesh.visible = false;

    inst.angelLanceMesh.position.set(opts.cx + 2.4 * opts.areaScale, opts.cy + 5.0, opts.cz + 0.15);
    inst.angelLanceMesh.rotation.set(-0.08, -0.08, -0.58);
    inst.angelLanceMesh.scale.setScalar(1.38 * Math.max(0.75, opts.areaScale));
    inst.angelLanceMesh.visible = false;

    inst.spireMesh.position.set(opts.cx, opts.cy + 0.04, opts.cz);
    inst.spireMesh.scale.set(1.25 * opts.areaScale, 0.01, 1.25 * opts.areaScale);
    inst.spireMesh.visible = false;

    inst.climaxFlareMesh.position.set(opts.cx, opts.cy + 1.38, opts.cz + 0.25);
    inst.climaxFlareMesh.scale.setScalar(0.01);
    inst.climaxFlareMesh.visible = false;

    inst.shockwaveMesh.position.set(opts.cx, opts.cy + 0.11, opts.cz);
    inst.shockwaveMesh.scale.setScalar(11.8 * opts.areaScale);
    inst.shockwaveMesh.visible = false;

    for (let i = 0; i < inst.feathers.length; i++) {
      inst.feathers[i].active = false;
      inst.feathers[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.86, '#080212', 1.30);
    this.hooks.onSpeedLines?.(0.84, 0.44);
  }

  public update(dtSec: number, timeSec: number): void {
    const dt = Math.min(0.1, Math.max(0, dtSec));
    for (let p = 0; p < this.instances.length; p++) {
      const inst = this.instances[p];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer = Math.max(0, inst.hitStopTimer - dt);
        continue;
      }

      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);

      // Instant snap-in for Rose-Window Floor Domain, Cathedral Mirror & Asymmetric Angel/Demon Wings
      const snapIn = 1 - Math.pow(1 - Math.min(1, inst.elapsed / 0.12), 4);
      inst.domainMesh.scale.setScalar(11.8 * inst.areaScale * Math.max(0.05, snapIn));
      inst.domainMesh.rotation.z = timeSec * 0.28;
      inst.domainMat.uniforms.uProgress.value = uProgress;
      inst.domainMat.uniforms.uTime.value = timeSec;

      inst.mirrorMesh.scale.setScalar(7.4 * inst.areaScale * Math.max(0.05, snapIn));
      inst.mirrorMat.uniforms.uProgress.value = uProgress;
      inst.mirrorMat.uniforms.uTime.value = timeSec;

      const wingS = 2.15 * snapIn * Math.max(0.75, inst.areaScale);
      const wingFlap = Math.sin(timeSec * 5.4) * 0.14;
      inst.leftWingMesh.scale.setScalar(Math.max(0.01, wingS));
      inst.rightWingMesh.scale.setScalar(Math.max(0.01, wingS));
      inst.leftWingMesh.rotation.y = 0.36 + wingFlap;
      inst.rightWingMesh.rotation.y = -0.36 - wingFlap;
      inst.leftWingMat.uniforms.uProgress.value = uProgress;
      inst.leftWingMat.uniforms.uTime.value = timeSec;
      inst.rightWingMat.uniforms.uProgress.value = uProgress;
      inst.rightWingMat.uniforms.uTime.value = timeSec;

      // ACT 1 (0.20s -> 0.58s): Snappy 6-Hit Black-Core Sakura Ribbon & Demon Claw Blitz
      const slashLimit = this.lowQuality ? 3 : BARRAGE_SLASH_COUNT;
      for (let i = 0; i < slashLimit; i++) {
        const slot = inst.barrageSlashes[i];
        if (inst.elapsed < slot.delay) continue;
        slot.mesh.visible = true;
        if (!slot.beatFired) {
          slot.beatFired = true;
          const pt = inst.pts[slot.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.25 * inst.areaScale, i % 2 === 0);
          this.tmpTargetPos.set(pt.x, pt.y + 0.90, pt.z);
          this.launchFeatherBurst(inst, this.tmpTargetPos, (i * 2) % 12, 2, 0.85);
          inst.onSlashBeatCallback?.(i, pt);
        }
        const localT = Math.min(1, (inst.elapsed - slot.delay) / 0.24);
        const sEase = 1 - Math.pow(1 - localT, 4);
        slot.mesh.scale.setScalar(slot.baseScale * (0.48 + 0.64 * sEase));
        slot.mesh.rotation.y += slot.spinSpeed * dt;
        slot.mat.uniforms.uProgress.value = uProgress;
        slot.mat.uniforms.uTime.value = timeSec;
        slot.mat.uniforms.uLocalT.value = localT;
      }

      // ACT 2 (0.56s -> 0.74s): Violent easeInExpo Twin Demon-Scythe & Angel Ribbon-Halberd Slam!
      if (inst.elapsed >= 0.56) {
        inst.demonScytheMesh.visible = true;
        inst.angelLanceMesh.visible = true;
        const bt = Math.min(1, (inst.elapsed - 0.56) / 0.18);
        const slamExpo = bt === 0 ? 0 : Math.pow(2, 8 * (bt - 1));
        const as = inst.areaScale;
        const tremor = bt >= 1 ? Math.sin(timeSec * 82.0) * 0.06 * Math.max(0, 1 - (inst.elapsed - 0.74) * 2.5) : 0;

        inst.demonScytheMesh.position.set(
          THREE.MathUtils.lerp(inst.cx - 2.4 * as, inst.cx + 0.25 * as, slamExpo) + tremor,
          THREE.MathUtils.lerp(inst.cy + 5.0, inst.cy + 0.02, slamExpo),
          inst.cz + 0.15
        );
        inst.demonScytheMesh.rotation.set(0.08, 0.08, THREE.MathUtils.lerp(0.58, 0.0, slamExpo));

        inst.angelLanceMesh.position.set(
          THREE.MathUtils.lerp(inst.cx + 2.4 * as, inst.cx - 0.25 * as, slamExpo) - tremor,
          THREE.MathUtils.lerp(inst.cy + 5.0, inst.cy + 0.02, slamExpo),
          inst.cz + 0.15
        );
        inst.angelLanceMesh.rotation.set(-0.08, -0.08, THREE.MathUtils.lerp(-0.58, 0.0, slamExpo));

        inst.demonScytheMat.uniforms.uProgress.value = uProgress;
        inst.demonScytheMat.uniforms.uTime.value = timeSec;
        inst.angelLanceMat.uniforms.uProgress.value = uProgress;
        inst.angelLanceMat.uniforms.uTime.value = timeSec;
      }

      // Climax Execution (0.74s): Hit-Stop + Invert Impact Frame + Spire + Shattered Mirror + Feather Storm!
      if (!inst.impactFired && inst.elapsed >= 0.74) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.058;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.0, inst.cz);
        this.launchFeatherBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 10 : 18, 1.40);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#f472b6', 0.075);
        this.hooks.onSpeedLines?.(1.0, 0.58);
        this.hooks.onCameraPush?.(0.38, 0.055);
        this.hooks.onFlash?.('#f9a8d4', 0.68);
        inst.onImpactCallback?.();
      }

      // ACT 3 (1.06s): Requiem Heartbeat Secondary Detonation across all ores!
      if (!inst.overdriveFired && inst.elapsed >= 1.06) {
        inst.overdriveFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.05, inst.cz);
        this.launchFeatherBurst(inst, this.tmpTargetPos, 30, this.lowQuality ? 4 : 6, 1.25);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 3.85 * inst.areaScale, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.88, 0.0, '#c084fc', 0.048);
        this.hooks.onSpeedLines?.(0.95, 0.36);
        inst.onImpactCallback?.();
      }

      if (uProgress >= 0.29) {
        const boomT = Math.min(1, (uProgress - 0.29) / 0.16);
        const boomEase = 1 - Math.pow(1 - boomT, 4);

        inst.spireMesh.visible = true;
        inst.spireMesh.scale.set(
          (0.92 + 0.76 * boomEase) * inst.areaScale,
          Math.max(0.1, boomEase * 1.15),
          (0.92 + 0.76 * boomEase) * inst.areaScale
        );
        inst.spireMesh.rotation.y += 4.2 * dt;
        inst.spireMat.uniforms.uProgress.value = uProgress;
        inst.spireMat.uniforms.uTime.value = timeSec;

        inst.climaxFlareMesh.visible = true;
        inst.climaxFlareMesh.scale.setScalar((3.6 + 7.6 * boomEase) * inst.areaScale);
        inst.climaxFlareMat.uniforms.uProgress.value = uProgress;
        inst.climaxFlareMat.uniforms.uLocalT.value = Math.min(1, (inst.elapsed - 0.72) / 0.55);

        inst.shockwaveMesh.visible = true;
        inst.shockwaveMat.uniforms.uProgress.value = uProgress;
        inst.shockwaveMat.uniforms.uTime.value = timeSec;
      }

      // Update Per-Ore Gothic Hit Flashes
      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 2.5), 3);
        f.mesh.scale.setScalar(f.baseScale * (0.4 + 0.8 * pop));
        f.mat.uniforms.uProgress.value = uProgress;
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      // Update Fluttering Angel & Demon Feathers
      for (let i = 0; i < inst.feathers.length; i++) {
        const fp = inst.feathers[i];
        if (!fp.active) continue;
        fp.age += dt;
        const lp = Math.min(1, fp.age / fp.life);
        // Gentle aerodynamic gravity & flutter sway (slower descent than sparks so feathers float gracefully)
        fp.vel.y -= 6.8 * dt;
        fp.vel.x += Math.sin(timeSec * 12.0 + fp.flutterSeed) * 2.2 * dt;
        fp.vel.multiplyScalar(Math.pow(0.93, dt * 60));
        fp.pos.addScaledVector(fp.vel, dt);
        if (fp.pos.y < fp.floorY) {
          fp.pos.y = fp.floorY;
          fp.vel.y = Math.abs(fp.vel.y) * 0.35;
        }
        fp.mesh.position.copy(fp.pos);
        fp.mesh.scale.set(fp.baseScale * 1.15, fp.baseScale * 0.58, 1);
        fp.mesh.rotation.set(
          -0.32 + Math.sin(timeSec * 9.5 + fp.flutterSeed) * 0.45,
          Math.atan2(fp.vel.x, fp.vel.z) + Math.cos(timeSec * 6.0 + fp.flutterSeed) * 0.3,
          Math.sin(timeSec * 11.0 + fp.flutterSeed) * 0.65
        );
        fp.mat.uniforms.uProgress.value = uProgress;
        fp.mat.uniforms.uLocalLife.value = lp;
        if (lp >= 1) {
          fp.active = false;
          fp.mesh.visible = false;
        }
      }

      if (inst.elapsed >= SKILL_DURATION_SEC) {
        inst.active = false;
        inst.root.visible = false;
      }
    }
  }

  public clear(): void {
    for (let i = 0; i < this.instances.length; i++) {
      this.instances[i].active = false;
      this.instances[i].root.visible = false;
      this.instances[i].onSlashBeatCallback = null;
      this.instances[i].onImpactCallback = null;
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) {
      this.allMats[i].dispose();
    }
    for (let i = 0; i < this.sharedGeos.length; i++) {
      this.sharedGeos[i].dispose();
    }
  }
}
