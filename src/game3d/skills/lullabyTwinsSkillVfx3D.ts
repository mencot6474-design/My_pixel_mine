import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const BARRAGE_BEAT_COUNT = 6;
const ORE_FLASH_COUNT = 6;
const MACH_RING_COUNT = 6;
const METEOR_SHARD_COUNT = 20;
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
    for (int i = 0; i < 2; i++) {
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
    for (int i = 0; i < 2; i++) {
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
    vec2 q = max(abs(p), vec2(0.0001));
    float d = pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness);
    return d - r;
  }
`;

/**
 * Sculpted Asymmetric Demon Bat-Wing Array (Left Flank).
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

  const spineSpecs = [
    { len: 1.55, w: 0.24, ang: 0.44, y: 0.45, x: -0.10 },
    { len: 1.38, w: 0.22, ang: 0.82, y: 0.16, x: -0.06 },
    { len: 1.15, w: 0.20, ang: 1.18, y: -0.12, x: -0.02 },
    { len: 0.92, w: 0.17, ang: 1.54, y: -0.38, x: 0.02 },
  ];

  for (const sp of spineSpecs) {
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
 * Sculpted Asymmetric Angel Feathered-Wing Array (Right Flank).
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
 * Massive Jagged Anime Meteor Asteroid Geometry (Madara Tengai Shinsei / Zhongli Planet Befall scale!).
 * Radius ~1.65m with interlocking jagged crystalline crag plates so it looks huge and imposing from 24m camera!
 */
function createGiantMeteorBodyGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const mainBoulder = new THREE.DodecahedronGeometry(1.45, 0);
  mainBoulder.scale(1.05, 0.95, 1.15);
  parts.push(mainBoulder);

  const cragOffsets: Array<[number, number, number, number, number]> = [
    [0.65, 0.55, 0.35, 0.78, 0.4],
    [-0.68, 0.42, 0.40, 0.74, -0.5],
    [0.25, -0.62, 0.52, 0.80, 0.9],
    [-0.45, -0.45, -0.55, 0.72, 1.2],
    [0.48, 0.18, -0.68, 0.68, -0.8],
  ];
  for (const [x, y, z, r, rot] of cragOffsets) {
    const crag = new THREE.OctahedronGeometry(r, 0);
    crag.rotateX(rot);
    crag.rotateY(rot * 1.3);
    crag.translate(x, y, z);
    parts.push(crag);
  }
  return mergeSimpleGeos(parts);
}

/**
 * Parabolic Atmospheric Re-Entry Bow-Shock Collar wrapping the front of each giant meteor (+Z is forward).
 */
function createMeteorBowShockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(2.05, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  geo.rotateX(Math.PI / 2);
  geo.scale(1.05, 1.05, 1.25);
  return geo;
}

/**
 * Massive Blazing Multi-Layered Meteor Flame Tail Cone:
 * Wide base wraps behind meteor at z = +0.3 (`uv.y = 0`), trails far back to z = -6.2 (`uv.y = 1`).
 */
function createGiantMeteorTailGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(2.05, 6.5, 18, 6, true);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -2.95);
  return geo;
}

/**
 * Layer 1A Shader: Clean Non-Swirling Gothic Rose-Window & Split Angel/Demon Domain Floor Seal.
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
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.30) / 0.16, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.60) / 0.40, 0.0, 1.0);

        float polarity = smoothstep(-0.08, 0.08, p.x);

        float roseWave = 0.062 * pow(abs(cos(ang * 6.0)), 2.2);
        float outerLace = exp(-pow((r - (0.87 + roseWave * 0.65)) * 28.0, 2.0));
        float midArch = exp(-pow((r - (0.62 - roseWave * 0.85)) * 26.0, 2.0));
        float innerHalo = exp(-pow((r - 0.34) * 28.0, 2.0));
        float gothicSpokes = smoothstep(0.90, 0.99, abs(cos(ang * 6.0))) * smoothstep(0.28, 0.36, r) * smoothstep(0.92, 0.82, r);

        float sectorAng = mod(ang + 3.14159265, 1.04719755) - 0.52359877;
        vec2 localSlot = vec2(sin(sectorAng) * r, r - 0.74);
        float heartMask = smoothstep(0.025, 0.0, lbSdHeart(localSlot * 10.5));
        float starMask = smoothstep(0.02, 0.0, lbSdStar4(p, 0.24, 0.52));

        vec3 vor = lbVoronoi(p * 5.2, 0.2);
        float crackWeb = smoothstep(0.065, 0.008, vor.y) * smoothstep(0.28, 0.36, uProgress);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.76 + outerLace * 0.3);

        vec3 obsidianVelvet = vec3(0.035, 0.010, 0.068);
        vec3 porcelainWhite = vec3(0.96, 0.94, 1.0);
        vec3 sakuraNeon = uColor * 1.65;
        vec3 abyssViolet = uCoreColor * 1.55;

        vec3 fieldCol = mix(obsidianVelvet, vec3(0.08, 0.03, 0.15), polarity * 0.65);
        vec3 traceryCol = mix(sakuraNeon, mix(abyssViolet, porcelainWhite, 0.45), polarity);

        float lineEnergy = clamp(outerLace + midArch + innerHalo + gothicSpokes * 0.8 + heartMask + starMask * 0.9 + crackWeb * (1.0 + strike * 0.6), 0.0, 1.35);
        vec3 col = fieldCol + traceryCol * lineEnergy;
        col += porcelainWhite * (starMask * 0.75 + crackWeb * 0.95 + innerHalo * 0.45);

        float baseDisc = smoothstep(0.96, 0.68, r) * 0.74;
        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp(max(baseDisc, min(1.0, lineEnergy)) * edgeFade * snapIn * dissolve, 0.0, 0.95);
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
 * Layer 1B Shader: Towering Upright Gothic Cathedral Rose-Mirror Backdrop (Voronoi Shatter on Meteor Blast).
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

        float snapIn = 1.0 - pow(1.0 - clamp(uProgress / 0.12, 0.0, 1.0), 4.0);
        float shatterT = 1.0 - pow(1.0 - clamp((uProgress - 0.36) / 0.22, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.60) / 0.40, 0.0, 1.0);

        vec3 vor = lbVoronoi(p * 4.8, 0.3);
        float crackEdge = smoothstep(0.08, 0.01, vor.y) * smoothstep(0.30, 0.38, uProgress);

        vec2 dir = r > 0.001 ? p / r : vec2(0.0, 1.0);
        vec2 sp = p + dir * shatterT * 0.16 * vor.z;
        float sr = length(sp);
        float sang = atan(sp.y, sp.x);

        float frameRing = exp(-pow((sr - 0.88) * 22.0, 2.0));
        float innerRose = exp(-pow((sr - (0.58 + 0.06 * cos(sang * 8.0))) * 22.0, 2.0));
        float tracery = smoothstep(0.88, 0.985, abs(cos(sang * 8.0))) * smoothstep(0.32, 0.42, sr) * smoothstep(0.88, 0.80, sr);
        float centerStar = smoothstep(0.035, 0.0, lbSdStar4(sp, 0.34, 0.52));
        float centerHeart = smoothstep(0.025, 0.0, abs(lbSdHeart(sp * 3.8)));

        float split = 0.012 + 0.042 * shatterT;
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
        float skillDissolve = smoothstep(clamp((uProgress - 0.58) / 0.42, 0.0, 1.0) - 0.1, clamp((uProgress - 0.58) / 0.42, 0.0, 1.0) + 0.1, n);

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
 * Layer 3A Shader: Luminous Anime Gothic Wings Material.
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
        float dissolveT = clamp((uProgress - 0.60) / 0.40, 0.0, 1.0);

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
 * Layer 3B Shader: Giant Cel-Shaded Obsidian Meteor Rock w/ Glowing Voronoi Magma/Plasma Cracks.
 */
function createMeteorRockMaterial(primaryHex: string, rimHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uRim: { value: new THREE.Color(rimHex) },
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
      uniform float uTime;
      uniform vec3 uPrimary;
      uniform vec3 uRim;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.18, 0.30, dot(N, L));
        float rim = smoothstep(0.45, 0.82, 1.0 - ndv);
        float inkOutline = smoothstep(0.24, 0.12, ndv);

        vec2 rockUv = vec2(vLocalPos.x * 1.4 + vLocalPos.z * 0.8, vLocalPos.y * 1.6);
        vec3 vor = lbVoronoi(rockUv * 2.2, 0.15);
        float magmaVeins = smoothstep(0.11, 0.018, vor.y);
        float pulse = 0.8 + 0.2 * sin(uTime * 16.0 + vor.z * 6.28);

        vec3 darkRock = vec3(0.055, 0.032, 0.095);
        vec3 litRock = mix(vec3(0.18, 0.12, 0.28), uPrimary * 0.65, 0.45);
        vec3 col = mix(darkRock, litRock, cel);
        col = mix(col, uPrimary * 1.85, rim * 0.90);
        col = mix(col, uRim * (2.15 * pulse), magmaVeins);
        col += vec3(1.0, 0.96, 1.0) * smoothstep(0.04, 0.008, vor.y) * 1.1;
        col = mix(col, vec3(0.01, 0.005, 0.025), inkOutline * 0.88);
        gl_FragColor = vec4(col, 0.99);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Layer 3C Shader: Atmospheric Re-Entry Bow-Shock Collar wrapping the front of each falling giant meteor!
 */
function createMeteorBowShockMaterial(primaryHex: string, coreHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uCore: { value: new THREE.Color(coreHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uPrimary;
      uniform vec3 uCore;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.35);
        float frontCone = smoothstep(-0.2, 1.4, vLocalPos.z);

        float wind = lbRidged(vec2(vUv.x * 10.0, vLocalPos.z * 2.2 + uTime * 20.0));
        float stepFlame = smoothstep(0.32, 0.72, wind + fresnel * 0.45);
        float rimFade = smoothstep(-0.15, 0.65, vLocalPos.z);

        vec3 col = mix(uPrimary * 1.85, uCore * 2.1, stepFlame);
        col += vec3(1.0, 0.98, 1.0) * (pow(fresnel, 2.0) * 1.1 + frontCone * 0.45);

        float alpha = clamp((fresnel * 0.85 + stepFlame * 0.55) * rimFade, 0.0, 0.92);
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
 * Layer 3D Shader: Blazing Luminous Meteor Flame Tail Cone (`uv.y = 0` at meteor -> `1` at tail tip).
 */
function createGiantMeteorTailMaterial(primaryHex: string, edgeHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uEdge: { value: new THREE.Color(edgeHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uPrimary;
      uniform vec3 uEdge;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = abs(dot(N, V));

        vec2 tUv = vec2(vUv.x * 8.0, vUv.y * 4.2 - uTime * 18.0);
        float fbm = lbFbm(tUv);
        float streak = smoothstep(0.28, 0.72, lbRidged(tUv + fbm * 0.75));
        float tailFade = smoothstep(1.0, 0.08, vUv.y);
        float headHot = smoothstep(0.35, 0.0, vUv.y);

        vec3 col = mix(uPrimary * 1.85, uEdge * 2.0, clamp(streak * 0.75 + vUv.y * 0.45, 0.0, 1.0));
        col += vec3(1.0, 0.97, 1.0) * (headHot * 1.35 + streak * 0.55);

        float alpha = clamp((rim * 0.52 + streak * 0.78 + headHot * 0.65) * tailFade, 0.0, 1.0);
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
 * Layer 3E Shader: Sky-Tear Portal Rift & Mach Shock-Rings left in the wake of each falling meteor!
 */
function createMachSkyRingMaterial(colorHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color(colorHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLocalT;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float expand = 1.0 - pow(1.0 - clamp(uLocalT * 2.5, 0.0, 1.0), 3.0);
        float ringR = mix(0.28, 0.88, expand);
        float ring = exp(-pow((r - ringR) * 22.0, 2.0));
        float teeth = smoothstep(0.35, 0.85, abs(cos(ang * 10.0))) * exp(-pow((r - ringR * 0.84) * 18.0, 2.0));

        float fade = 1.0 - smoothstep(0.38, 1.0, uLocalT);
        vec3 col = uColor * 1.9 + vec3(1.0) * ring * 0.95;
        float alpha = clamp((ring + teeth * 0.75) * smoothstep(0.99, 0.84, r) * fade, 0.0, 1.0);
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
 * Layer 4A Shader: Fusing Dual-Color Energy Sphere (uMergePhase = 0) -> Voronoi Shatter Explosion Shell (uMergePhase = 1).
 */
function createMeteorShatterSphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uShatterT: { value: 0.0 },
      uMergePhase: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uShatterT;
      uniform float uMergePhase;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vec3 displaced = position + normal * (uShatterT * uMergePhase * 0.30);
        vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uShatterT;
      uniform float uMergePhase;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${LULLABY_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float fresnel = pow(max(0.0001, 1.0 - ndv), 1.5);
        float coreHot = pow(ndv, 1.8);

        vec2 cellUv = vec2(atan(vLocalPos.z, vLocalPos.x) * 2.4, vLocalPos.y * 4.5);
        vec3 vor = lbVoronoi(cellUv, 0.15 + uTime * (1.0 - uMergePhase) * 3.5);
        float crackSeam = smoothstep(0.09, 0.012, vor.y);

        // Merging phase: dense glowing dual-color energy orb; Exploding phase: Voronoi shatter apart!
        float shardKeep = mix(1.0, smoothstep(uShatterT - 0.08, uShatterT + 0.06, vor.z * 0.88 + 0.10), uMergePhase);
        if (shardKeep < 0.05) discard;

        vec3 sakura = vec3(0.96, 0.45, 0.72) * 2.0;
        vec3 cyanViolet = vec3(0.45, 0.72, 1.0) * 2.0;
        vec3 whiteHot = vec3(1.0, 0.98, 1.0) * 2.4;

        // Dual plasma bands fusing together during merge, fracturing into cells on explosion
        float dualMix = mix(smoothstep(-0.25, 0.25, sin(vLocalPos.x * 3.5 + uTime * 14.0)), step(0.5, vor.z), uMergePhase);
        vec3 tint = mix(sakura, cyanViolet, dualMix);
        float energyBoost = mix(coreHot * 0.95 + fresnel * 0.85, crackSeam * 1.15 + fresnel * 0.75, uMergePhase);
        vec3 col = mix(tint, whiteHot, clamp(energyBoost, 0.0, 1.0));

        float fade = mix(1.0, 1.0 - smoothstep(0.62, 1.0, uShatterT), uMergePhase);
        float alpha = clamp((fresnel * 0.85 + crackSeam * 0.85 + coreHot * 0.65 + 0.35) * shardKeep * fade, 0.0, 1.0);
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
 * Layer 4B Shader: Flat Horizontal Meteor Crater Shockwave & Radial Fracture Ring (NO spiral!).
 */
function createMeteorCraterShockwaveMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBlastT: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#f472b6') },
      uCoreColor: { value: new THREE.Color('#38bdf8') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uBlastT;
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

        float boomEase = 1.0 - pow(1.0 - clamp(uBlastT * 1.9, 0.0, 1.0), 4.0);
        float waveR = mix(0.10, 0.92, boomEase);

        float ringR = exp(-pow((r - (waveR + 0.028)) * 22.0, 2.0));
        float ringG = exp(-pow((r - waveR) * 26.0, 2.0));
        float ringB = exp(-pow((r - (waveR - 0.028)) * 22.0, 2.0));

        float rays = pow(max(0.0, cos(ang * 16.0)), 14.0) * smoothstep(waveR + 0.06, 0.10, r) * smoothstep(0.05, 0.22, r);
        vec3 vor = lbVoronoi(p * 6.4, 0.15);
        float glassCrack = smoothstep(0.075, 0.01, vor.y) * smoothstep(waveR + 0.04, 0.06, r);
        float fade = 1.0 - smoothstep(0.45, 1.0, uBlastT);

        vec3 col = vec3(ringR, 0.0, 0.0) * (uColor * 1.95)
                 + vec3(0.0, ringG, 0.0) * vec3(0.98, 0.95, 1.0) * 1.9
                 + vec3(0.0, 0.0, ringB) * (uCoreColor * 1.95)
                 + mix(uColor, uCoreColor, step(0.0, p.x)) * (glassCrack * 1.35 + rays * 1.55)
                 + vec3(1.0) * (ringG * 0.8 + glassCrack * 0.55);

        float alpha = clamp((max(max(ringR, ringG), ringB) + glassCrack * 0.92 + rays * 0.9) * smoothstep(0.99, 0.85, r) * fade, 0.0, 1.0);
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
        float skillDissolve = smoothstep(clamp((uProgress - 0.60) / 0.40, 0.0, 1.0) - 0.1, clamp((uProgress - 0.60) / 0.40, 0.0, 1.0) + 0.1, n * 0.65 + 0.35);

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

interface BarrageBeatSlot {
  delay: number;
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

interface MachRingSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  triggered: boolean;
  age: number;
  life: number;
  baseScale: number;
  pos: THREE.Vector3;
  aimQuat: THREE.Quaternion;
}

interface MeteorShardSlot {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  floorY: number;
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
  mergeFreezeFired: boolean;
  shatterFired: boolean;
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
  barrageBeats: BarrageBeatSlot[];
  oreFlashes: OreFlashSlot[];
  demonMeteorGroup: THREE.Group;
  demonRockMesh: THREE.Mesh;
  angelMeteorGroup: THREE.Group;
  angelRockMesh: THREE.Mesh;
  demonMeteorStart: THREE.Vector3;
  demonMeteorEnd: THREE.Vector3;
  angelMeteorStart: THREE.Vector3;
  angelMeteorEnd: THREE.Vector3;
  demonRockMat: THREE.ShaderMaterial;
  demonShockMat: THREE.ShaderMaterial;
  demonTailMat: THREE.ShaderMaterial;
  angelRockMat: THREE.ShaderMaterial;
  angelShockMat: THREE.ShaderMaterial;
  angelTailMat: THREE.ShaderMaterial;
  machRings: MachRingSlot[];
  blastShellMesh: THREE.Mesh;
  blastShellMat: THREE.ShaderMaterial;
  climaxFlareMesh: THREE.Mesh;
  climaxFlareMat: THREE.ShaderMaterial;
  shockwaveMesh: THREE.Mesh;
  shockwaveMat: THREE.ShaderMaterial;
  meteorShards: MeteorShardSlot[];
  feathers: FeatherParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Lullaby Twins
 * ("Tengai Twin-Meteor: Stop-Time Shatter" — Madara Tengai Shinsei × Zhongli Planet Befall × Kimi no Na wa):
 * - Act 0 (0.00s->0.22s): Clean Non-Swirling Rose-Window Domain + Gothic Mirror + Demon/Angel Wings
 * - Act 1 (0.20s->0.56s): 6-Beat Per-Ore Gothic Hit Flashes & Feathers + High-Sky Emergence of
 *   TWO GIANT Different-Colored Meteors (Left: Obsidian-Sakura Crimson, Right: Obsidian-Celestial Cyan-Violet)
 *   spawning clearly inside the top sky frame (`cy + 8.6`, `cx ± 4.6*as`) with blazing tails & bow-shock collars!
 * - Act 2 (0.38s->0.78s): Heavy `easeInQuad` Gravity Descent leaving 6 Atmospheric Mach Shock-Rings!
 * - Stop-Time Impact (0.78s -> 0.96s): `0.18s` Time-Stop Freeze + Monochrome Inverted Impact Frame +
 *   Voronoi-Cracked Collision Sphere locked at Ground Zero!
 * - Shatter Detonation (0.96s -> 2.50s): Stop-Time snaps -> Giant Meteor Shell Shatters Outward +
 *   20 3D Flying Meteor Boulders + Radial Crater Shockwave + 36 Feathers!
 */
export class LullabyTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: LullabySkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpZ = new THREE.Vector3(0, 0, 1);
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const demonWingGeo = createDemonWingArrayGeometry();
    const angelWingGeo = createAngelWingArrayGeometry();
    const meteorBodyGeo = createGiantMeteorBodyGeometry();
    const bowShockGeo = createMeteorBowShockGeometry();
    const meteorTailGeo = createGiantMeteorTailGeometry();
    const blastShellGeo = new THREE.IcosahedronGeometry(1.0, 2);
    const meteorShardGeo = new THREE.DodecahedronGeometry(0.36, 0);
    this.sharedGeos.push(
      planeGeo,
      demonWingGeo,
      angelWingGeo,
      meteorBodyGeo,
      bowShockGeo,
      meteorTailGeo,
      blastShellGeo,
      meteorShardGeo
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

      const barrageBeats: BarrageBeatSlot[] = [];
      for (let i = 0; i < BARRAGE_BEAT_COUNT; i++) {
        barrageBeats.push({
          delay: 0.20 + i * 0.066,
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

      // GIANT Twin Different-Colored Meteors (Obsidian-Sakura Crimson Left vs Obsidian-Celestial Cyan-Violet Right)
      const demonRockMat = createMeteorRockMaterial('#f43f5e', '#f472b6');
      const demonShockMat = createMeteorBowShockMaterial('#f43f5e', '#fbcfe8');
      const demonTailMat = createGiantMeteorTailMaterial('#ec4899', '#fda4af');
      const demonMeteorGroup = new THREE.Group();
      const demonRockMesh = new THREE.Mesh(meteorBodyGeo, demonRockMat);
      demonMeteorGroup.add(demonRockMesh);
      demonMeteorGroup.add(new THREE.Mesh(bowShockGeo, demonShockMat));
      demonMeteorGroup.add(new THREE.Mesh(meteorTailGeo, demonTailMat));
      demonMeteorGroup.visible = false;
      root.add(demonMeteorGroup);

      const angelRockMat = createMeteorRockMaterial('#38bdf8', '#c084fc');
      const angelShockMat = createMeteorBowShockMaterial('#38bdf8', '#e0e7ff');
      const angelTailMat = createGiantMeteorTailMaterial('#8b5cf6', '#38bdf8');
      const angelMeteorGroup = new THREE.Group();
      const angelRockMesh = new THREE.Mesh(meteorBodyGeo, angelRockMat);
      angelMeteorGroup.add(angelRockMesh);
      angelMeteorGroup.add(new THREE.Mesh(bowShockGeo, angelShockMat));
      angelMeteorGroup.add(new THREE.Mesh(meteorTailGeo, angelTailMat));
      angelMeteorGroup.visible = false;
      root.add(angelMeteorGroup);
      this.allMats.push(demonRockMat, demonShockMat, demonTailMat, angelRockMat, angelShockMat, angelTailMat);

      // Atmospheric Mach Shock-Rings punched along both descent paths
      const machRings: MachRingSlot[] = [];
      for (let i = 0; i < MACH_RING_COUNT; i++) {
        const isDemon = i % 2 === 0;
        const mMat = createMachSkyRingMaterial(isDemon ? '#f472b6' : '#38bdf8');
        const mMesh = new THREE.Mesh(planeGeo, mMat);
        mMesh.visible = false;
        root.add(mMesh);
        this.allMats.push(mMat);
        machRings.push({
          mesh: mMesh,
          mat: mMat,
          delay: 0.28 + Math.floor(i / 2) * 0.15,
          triggered: false,
          age: 0,
          life: 0.42,
          baseScale: 5.0,
          pos: new THREE.Vector3(),
          aimQuat: new THREE.Quaternion(),
        });
      }

      // Stop-Time Cracked Collision Sphere -> Voronoi Shattering Meteor Explosion Shell
      const blastShellMat = createMeteorShatterSphereMaterial();
      const blastShellMesh = new THREE.Mesh(blastShellGeo, blastShellMat);
      blastShellMesh.visible = false;
      root.add(blastShellMesh);
      this.allMats.push(blastShellMat);

      const climaxFlareMat = createGothicHitFlashMaterial();
      climaxFlareMat.uniforms.uColor.value.set('#f472b6');
      climaxFlareMat.uniforms.uCoreColor.value.set('#38bdf8');
      const climaxFlareMesh = new THREE.Mesh(planeGeo, climaxFlareMat);
      climaxFlareMesh.rotation.set(-0.48, 0, 0);
      climaxFlareMesh.visible = false;
      root.add(climaxFlareMesh);
      this.allMats.push(climaxFlareMat);

      const shockwaveMat = createMeteorCraterShockwaveMaterial();
      const shockwaveMesh = new THREE.Mesh(planeGeo, shockwaveMat);
      shockwaveMesh.rotation.x = -Math.PI / 2;
      shockwaveMesh.visible = false;
      root.add(shockwaveMesh);
      this.allMats.push(shockwaveMat);

      const meteorShards: MeteorShardSlot[] = [];
      for (let i = 0; i < METEOR_SHARD_COUNT; i++) {
        const shardMat = i % 2 === 0 ? demonRockMat : angelRockMat;
        const shardMesh = new THREE.Mesh(meteorShardGeo, shardMat);
        shardMesh.visible = false;
        root.add(shardMesh);
        meteorShards.push({
          mesh: shardMesh,
          active: false,
          age: 0,
          life: 0.72,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          rotVel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 1,
        });
      }

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
        mergeFreezeFired: false,
        shatterFired: false,
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
        barrageBeats,
        oreFlashes,
        demonMeteorGroup,
        demonRockMesh,
        angelMeteorGroup,
        angelRockMesh,
        demonMeteorStart: new THREE.Vector3(),
        demonMeteorEnd: new THREE.Vector3(),
        angelMeteorStart: new THREE.Vector3(),
        angelMeteorEnd: new THREE.Vector3(),
        demonRockMat,
        demonShockMat,
        demonTailMat,
        angelRockMat,
        angelShockMat,
        angelTailMat,
        machRings,
        blastShellMesh,
        blastShellMat,
        climaxFlareMesh,
        climaxFlareMat,
        shockwaveMesh,
        shockwaveMat,
        meteorShards,
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

  private launchMeteorShards(inst: LullabySkillInstance, origin: THREE.Vector3): void {
    const count = this.lowQuality ? 10 : METEOR_SHARD_COUNT;
    for (let i = 0; i < inst.meteorShards.length; i++) {
      const sh = inst.meteorShards[i];
      if (i >= count) {
        sh.active = false;
        sh.mesh.visible = false;
        continue;
      }
      sh.active = true;
      sh.age = 0;
      sh.life = 0.56 + (i % 5) * 0.06;
      sh.pos.copy(origin);
      sh.floorY = inst.cy + 0.18;
      const az = (i / count) * Math.PI * 2 + (i % 3) * 0.22;
      const spd = (7.2 + ((i * 29) % 10) * 0.85) * Math.max(0.75, inst.areaScale);
      const vy = 6.0 + ((i * 19) % 10) * 0.82;
      sh.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.82);
      sh.rotVel.set((i % 2 === 0 ? 1 : -1) * 10, (i % 3 - 1) * 8, 12);
      sh.baseScale = (0.95 + (i % 3) * 0.38) * Math.max(0.75, inst.areaScale);
      sh.mesh.position.copy(sh.pos);
      sh.mesh.scale.setScalar(sh.baseScale);
      sh.mesh.visible = true;
    }
  }

  private launchFeatherBurst(inst: LullabySkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.feathers.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const fp = inst.feathers[i];
      fp.active = true;
      fp.age = 0;
      fp.life = 0.56 + ((i * 17) % 10) * 0.042;
      fp.pos.copy(origin);
      fp.floorY = inst.cy + 0.16;
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
    inst.mergeFreezeFired = false;
    inst.shatterFired = false;
    inst.overdriveFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    const as = opts.areaScale;
    const safeAs = Math.max(0.75, as);

    inst.domainMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.domainMesh.rotation.z = 0;
    inst.domainMesh.scale.setScalar(0.01);
    inst.domainMat.uniforms.uProgress.value = 0;

    inst.mirrorMesh.position.set(opts.cx, opts.cy + 3.45 * as, opts.cz - 1.55 * as);
    inst.mirrorMesh.scale.setScalar(0.01);
    inst.mirrorMat.uniforms.uProgress.value = 0;

    inst.leftWingMesh.position.set(opts.cx - 3.35 * as, opts.cy + 2.65 * as, opts.cz - 0.95 * as);
    inst.leftWingMesh.rotation.set(0.16, 0.36, 0.18);
    inst.leftWingMesh.scale.setScalar(0.01);
    inst.leftWingMat.uniforms.uProgress.value = 0;

    inst.rightWingMesh.position.set(opts.cx + 3.35 * as, opts.cy + 2.65 * as, opts.cz - 0.95 * as);
    inst.rightWingMesh.rotation.set(0.16, -0.36, -0.18);
    inst.rightWingMesh.scale.setScalar(0.01);
    inst.rightWingMat.uniforms.uProgress.value = 0;

    const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
    for (let i = 0; i < inst.barrageBeats.length; i++) {
      const slot = inst.barrageBeats[i];
      slot.beatFired = i >= beatLimit;
      slot.targetIndex = i % inst.pts.length;
      slot.delay = 0.20 + i * 0.066;
    }

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    // Giant Twin Meteors spawn inside upper sky viewport (`cy + 8.6`, `cx ± 4.6 * as`)
    // and dive to touch at `cx ± 1.05 * as, cy + 1.25`, then merge at exact center!
    const meteorS = 1.15 * safeAs;
    inst.demonMeteorStart.set(opts.cx - 4.6 * as, opts.cy + 8.6, opts.cz - 1.0 * as);
    inst.demonMeteorEnd.set(opts.cx - 1.05 * as, opts.cy + 1.25, opts.cz + 0.1);

    inst.angelMeteorStart.set(opts.cx + 4.6 * as, opts.cy + 8.6, opts.cz - 1.0 * as);
    inst.angelMeteorEnd.set(opts.cx + 1.05 * as, opts.cy + 1.25, opts.cz + 0.1);

    inst.demonMeteorGroup.position.copy(inst.demonMeteorStart);
    inst.demonMeteorGroup.lookAt(inst.demonMeteorEnd);
    inst.demonMeteorGroup.scale.setScalar(meteorS);
    inst.demonMeteorGroup.visible = false;

    inst.angelMeteorGroup.position.copy(inst.angelMeteorStart);
    inst.angelMeteorGroup.lookAt(inst.angelMeteorEnd);
    inst.angelMeteorGroup.scale.setScalar(meteorS);
    inst.angelMeteorGroup.visible = false;

    // Precompute 6 Atmospheric Mach Shock-Rings (3 along Left meteor descent, 3 along Right meteor descent)
    const machFracs = [0.04, 0.36, 0.72];
    const machDelays = [0.22, 0.46, 0.64];
    for (let i = 0; i < inst.machRings.length; i++) {
      const mr = inst.machRings[i];
      const isDemon = i % 2 === 0;
      const tierIdx = Math.floor(i / 2);
      const startV = isDemon ? inst.demonMeteorStart : inst.angelMeteorStart;
      const endV = isDemon ? inst.demonMeteorEnd : inst.angelMeteorEnd;
      mr.pos.lerpVectors(startV, endV, machFracs[tierIdx]);
      this.tmpDir.subVectors(endV, startV).normalize();
      mr.aimQuat.setFromUnitVectors(this.tmpZ, this.tmpDir);
      mr.delay = machDelays[tierIdx];
      mr.triggered = false;
      mr.age = 0;
      mr.baseScale = (5.4 - tierIdx * 0.6) * safeAs;
      mr.mesh.position.copy(mr.pos);
      mr.mesh.quaternion.copy(mr.aimQuat);
      mr.mesh.scale.setScalar(mr.baseScale);
      mr.mesh.visible = false;
    }

    inst.blastShellMesh.position.set(opts.cx, opts.cy + 1.25, opts.cz + 0.1);
    inst.blastShellMesh.scale.setScalar(0.01);
    inst.blastShellMesh.visible = false;
    inst.blastShellMat.uniforms.uShatterT.value = 0;
    inst.blastShellMat.uniforms.uMergePhase.value = 0;

    inst.climaxFlareMesh.position.set(opts.cx, opts.cy + 1.35, opts.cz + 0.25);
    inst.climaxFlareMesh.scale.setScalar(0.01);
    inst.climaxFlareMesh.visible = false;

    inst.shockwaveMesh.position.set(opts.cx, opts.cy + 0.20, opts.cz);
    inst.shockwaveMesh.scale.setScalar(12.2 * as);
    inst.shockwaveMesh.visible = false;
    inst.shockwaveMat.uniforms.uBlastT.value = 0;

    for (let i = 0; i < inst.meteorShards.length; i++) {
      inst.meteorShards[i].active = false;
      inst.meteorShards[i].mesh.visible = false;
    }

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

      // Stop-Time just released at peak energy compression -> EXPLODE the fused energy sphere!
      if (inst.mergeFreezeFired && !inst.shatterFired) {
        inst.shatterFired = true;
        inst.demonMeteorGroup.visible = false;
        inst.angelMeteorGroup.visible = false;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.15, inst.cz);
        this.launchMeteorShards(inst, this.tmpTargetPos);
        this.launchFeatherBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 8 : 12, 1.48);
        this.hooks.onImpactFrame?.(0.95, 0.0, '#c084fc', 0.068);
        this.hooks.onSpeedLines?.(1.0, 0.65);
        this.hooks.onCameraPush?.(0.48, 0.070);
        this.hooks.onFlash?.('#f9a8d4', 0.90);
        inst.onImpactCallback?.();
      }

      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;
      const safeAs = Math.max(0.75, as);

      const snapIn = 1 - Math.pow(1 - Math.min(1, inst.elapsed / 0.12), 4);
      inst.domainMesh.scale.setScalar(11.8 * as * Math.max(0.05, snapIn));
      inst.domainMat.uniforms.uProgress.value = uProgress;
      inst.domainMat.uniforms.uTime.value = timeSec;

      inst.mirrorMesh.scale.setScalar(7.4 * as * Math.max(0.05, snapIn));
      inst.mirrorMat.uniforms.uProgress.value = uProgress;
      inst.mirrorMat.uniforms.uTime.value = timeSec;

      const wingS = 2.15 * snapIn * safeAs;
      const wingFlap = Math.sin(timeSec * 5.4) * 0.14;
      inst.leftWingMesh.scale.setScalar(Math.max(0.01, wingS));
      inst.rightWingMesh.scale.setScalar(Math.max(0.01, wingS));
      inst.leftWingMesh.rotation.y = 0.36 + wingFlap;
      inst.rightWingMesh.rotation.y = -0.36 - wingFlap;
      inst.leftWingMat.uniforms.uProgress.value = uProgress;
      inst.leftWingMat.uniforms.uTime.value = timeSec;
      inst.rightWingMat.uniforms.uProgress.value = uProgress;
      inst.rightWingMat.uniforms.uTime.value = timeSec;

      // ACT 1 (0.20s -> 0.56s): Per-Ore Gothic Hit Flashes, Feathers & Lightning
      const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
      for (let i = 0; i < beatLimit; i++) {
        const slot = inst.barrageBeats[i];
        if (inst.elapsed < slot.delay) continue;
        if (!slot.beatFired) {
          slot.beatFired = true;
          const pt = inst.pts[slot.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.25 * as, i % 2 === 0);
          this.tmpTargetPos.set(pt.x, pt.y + 0.90, pt.z);
          this.launchFeatherBurst(inst, this.tmpTargetPos, (i * 2) % 12, 2, 0.85);
          inst.onSlashBeatCallback?.(i, pt);
        }
      }

      // ACT 2 (0.18s -> 0.78s): Giant Twin Meteors Sky-Emergence & Heavy Gravity Descent (Tengai Shinsei!)
      inst.demonRockMat.uniforms.uTime.value = timeSec;
      inst.demonShockMat.uniforms.uTime.value = timeSec;
      inst.demonTailMat.uniforms.uTime.value = timeSec;
      inst.angelRockMat.uniforms.uTime.value = timeSec;
      inst.angelShockMat.uniforms.uTime.value = timeSec;
      inst.angelTailMat.uniforms.uTime.value = timeSec;

      if (inst.elapsed >= 0.18 && !inst.shatterFired) {
        inst.demonMeteorGroup.visible = true;
        inst.angelMeteorGroup.visible = true;
        const baseMeteorS = 1.15 * safeAs;

        // Spin both giant jagged meteor boulders heavily as they fall
        inst.demonRockMesh.rotation.x += 4.2 * dt;
        inst.demonRockMesh.rotation.y += 3.1 * dt;
        inst.angelRockMesh.rotation.x -= 4.2 * dt;
        inst.angelRockMesh.rotation.y -= 3.1 * dt;

        if (inst.elapsed < 0.34) {
          // Dramatic heavy emergence out of the upper sky rifts
          const emT = (inst.elapsed - 0.18) / 0.16;
          const emEase = 1 - Math.pow(1 - emT, 3);
          const s = baseMeteorS * (0.28 + 0.72 * emEase);
          inst.demonMeteorGroup.position.copy(inst.demonMeteorStart);
          inst.demonMeteorGroup.lookAt(inst.demonMeteorEnd);
          inst.demonMeteorGroup.scale.setScalar(s);

          inst.angelMeteorGroup.position.copy(inst.angelMeteorStart);
          inst.angelMeteorGroup.lookAt(inst.angelMeteorEnd);
          inst.angelMeteorGroup.scale.setScalar(s);
        } else if (inst.elapsed < 0.68) {
          // 0.34s heavy easeInQuad gravity descent until the two meteors touch!
          const diveT = (inst.elapsed - 0.34) / 0.34;
          const diveEase = diveT * diveT;
          inst.demonMeteorGroup.position.lerpVectors(inst.demonMeteorStart, inst.demonMeteorEnd, diveEase);
          inst.demonMeteorGroup.lookAt(inst.demonMeteorEnd);
          inst.demonMeteorGroup.scale.setScalar(baseMeteorS * (1.0 + 0.15 * diveEase));

          inst.angelMeteorGroup.position.lerpVectors(inst.angelMeteorStart, inst.angelMeteorEnd, diveEase);
          inst.angelMeteorGroup.lookAt(inst.angelMeteorEnd);
          inst.angelMeteorGroup.scale.setScalar(baseMeteorS * (1.0 + 0.15 * diveEase));
        } else {
          // 0.68s -> 0.90s: On contact, BOTH meteors pull together & fuse into a single glowing Energy Sphere!
          const mergeT = Math.min(1, (inst.elapsed - 0.68) / 0.22);
          const mergeEase = mergeT * mergeT;
          this.tmpTargetPos.set(inst.cx, inst.cy + 1.25, inst.cz + 0.1);

          inst.demonMeteorGroup.position.lerpVectors(inst.demonMeteorEnd, this.tmpTargetPos, mergeEase);
          inst.demonMeteorGroup.scale.setScalar(Math.max(0.05, baseMeteorS * 1.15 * (1.0 - 0.88 * mergeEase)));

          inst.angelMeteorGroup.position.lerpVectors(inst.angelMeteorEnd, this.tmpTargetPos, mergeEase);
          inst.angelMeteorGroup.scale.setScalar(Math.max(0.05, baseMeteorS * 1.15 * (1.0 - 0.88 * mergeEase)));

          // Fused Dual-Color Energy Sphere swells and compresses right at the center!
          const orbPop = 1 - Math.pow(1 - mergeT, 3);
          const compress = mergeT > 0.78 ? 1.0 - ((mergeT - 0.78) / 0.22) * 0.25 : 1.0;
          inst.blastShellMesh.visible = true;
          inst.blastShellMesh.position.copy(this.tmpTargetPos);
          inst.blastShellMesh.scale.setScalar((0.55 + 2.35 * orbPop) * compress * as);
          inst.blastShellMat.uniforms.uMergePhase.value = 0.0;
          inst.blastShellMat.uniforms.uShatterT.value = 0.0;
          inst.blastShellMat.uniforms.uTime.value = timeSec;
        }
      }

      // Atmospheric Mach Shock-Rings punched along meteor paths
      for (let i = 0; i < inst.machRings.length; i++) {
        const mr = inst.machRings[i];
        if (inst.elapsed < mr.delay) continue;
        if (!mr.triggered) {
          mr.triggered = true;
          mr.age = 0;
          mr.mesh.visible = true;
        }
        mr.age += dt;
        const lt = Math.min(1, mr.age / mr.life);
        mr.mat.uniforms.uLocalT.value = lt;
        mr.mesh.scale.setScalar(mr.baseScale * (0.65 + 0.55 * lt));
        if (lt >= 1) {
          mr.mesh.visible = false;
        }
      }

      // TOUCH BEAT (0.68s): Meteors collide and begin fusing into Energy Sphere!
      if (!inst.impactFired && inst.elapsed >= 0.68) {
        inst.impactFired = true;
        this.hooks.onImpactFrame?.(0.85, 0.0, '#e879f9', 0.045);
        this.hooks.onFlash?.('#e9d5ff', 0.42);
        this.hooks.onCameraPush?.(0.18, 0.025);
        inst.onImpactCallback?.();
      }

      // PEAK ENERGY SPHERE STOP-TIME FREEZE (0.90s) right before shattering explosion!
      if (!inst.mergeFreezeFired && inst.elapsed >= 0.90) {
        inst.mergeFreezeFired = true;
        inst.hitStopTimer = 0.11;
        inst.blastShellMesh.visible = true;
        inst.blastShellMesh.scale.setScalar(2.45 * as);
        inst.blastShellMat.uniforms.uMergePhase.value = 1.0;
        inst.blastShellMat.uniforms.uShatterT.value = 0.0;
        inst.blastShellMat.uniforms.uTime.value = timeSec;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ffffff', 0.115);
        this.hooks.onArenaDim?.(0.94, '#04010c', 0.25);
      }

      // ENERGY SPHERE EXPLOSION VISUALS (after 0.90s -> 1.62s)
      if (inst.shatterFired && inst.elapsed < 1.64) {
        const blastT = Math.min(1, (inst.elapsed - 0.90) / 0.68);
        const blastEase = 1 - Math.pow(1 - blastT, 4);

        inst.blastShellMesh.visible = true;
        inst.blastShellMesh.scale.setScalar((2.45 + 6.2 * blastEase) * as);
        inst.blastShellMat.uniforms.uMergePhase.value = 1.0;
        inst.blastShellMat.uniforms.uShatterT.value = blastT;
        inst.blastShellMat.uniforms.uTime.value = timeSec;

        inst.shockwaveMesh.visible = true;
        inst.shockwaveMat.uniforms.uBlastT.value = blastT;
        inst.shockwaveMat.uniforms.uTime.value = timeSec;

        inst.climaxFlareMesh.visible = true;
        inst.climaxFlareMesh.scale.setScalar((4.2 + 7.6 * blastEase) * as);
        inst.climaxFlareMat.uniforms.uProgress.value = uProgress;
        inst.climaxFlareMat.uniforms.uLocalT.value = blastT;
      } else if (inst.shatterFired) {
        inst.blastShellMesh.visible = false;
        inst.shockwaveMesh.visible = false;
        inst.climaxFlareMesh.visible = false;
      }

      // Secondary Resonance Aftershock across ores (1.12s)
      if (!inst.overdriveFired && inst.elapsed >= 1.12) {
        inst.overdriveFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.05, inst.cz);
        this.launchFeatherBurst(inst, this.tmpTargetPos, 30, this.lowQuality ? 4 : 6, 1.25);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 3.85 * as, i % 2 === 1);
        }
        this.hooks.onSpeedLines?.(0.95, 0.36);
        inst.onImpactCallback?.();
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

      // Update Flying 3D Giant Meteor Shatter Boulders
      for (let i = 0; i < inst.meteorShards.length; i++) {
        const sh = inst.meteorShards[i];
        if (!sh.active) continue;
        sh.age += dt;
        const lp = Math.min(1, sh.age / sh.life);
        sh.vel.y -= 16.5 * dt;
        sh.vel.multiplyScalar(Math.pow(0.94, dt * 60));
        sh.pos.addScaledVector(sh.vel, dt);
        if (sh.pos.y < sh.floorY) {
          sh.pos.y = sh.floorY;
          sh.vel.y = Math.abs(sh.vel.y) * 0.32;
        }
        sh.mesh.position.copy(sh.pos);
        sh.mesh.rotation.x += sh.rotVel.x * dt;
        sh.mesh.rotation.y += sh.rotVel.y * dt;
        sh.mesh.rotation.z += sh.rotVel.z * dt;
        sh.mesh.scale.setScalar(sh.baseScale * (1.0 - smoothstep01(lp)));
        if (lp >= 1) {
          sh.active = false;
          sh.mesh.visible = false;
        }
      }

      // Update Fluttering Angel & Demon Feathers
      for (let i = 0; i < inst.feathers.length; i++) {
        const fp = inst.feathers[i];
        if (!fp.active) continue;
        fp.age += dt;
        const lp = Math.min(1, fp.age / fp.life);
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

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, (t - 0.55) / 0.45));
  return x * x * (3 - 2 * x);
}
