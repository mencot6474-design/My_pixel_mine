import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const SKY_SWORD_COUNT = 8;
const RAIL_LANCE_COUNT = 3;
const ORE_FLASH_COUNT = 6;
const SHARD_PARTICLE_COUNT = 36;

const HALCYON_GLSL = `
  vec2 hcHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float hcHash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float hcVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hcHash21(i), hcHash21(i + vec2(1.0, 0.0)), f.x),
      mix(hcHash21(i + vec2(0.0, 1.0)), hcHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float hcFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += a * hcVnoise(p);
      p = rot * p * 2.04 + vec2(1.9, 6.3);
      a *= 0.5;
    }
    return v;
  }

  float hcRidged(vec2 p) {
    float v = 0.0;
    float a = 0.56;
    float freq = 1.0;
    for (int i = 0; i < 2; i++) {
      float n = 1.0 - abs(hcVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n) * a;
      freq *= 2.18;
      a *= 0.5;
    }
    return v;
  }

  vec3 hcVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hcHash22(n + g);
        o = 0.5 + 0.40 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = hcHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  mat2 hcRot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  float hcSdStar4(vec2 p, float r, float sharpness) {
    vec2 q = max(abs(p), vec2(0.0001));
    return pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness) - r;
  }

  float hcSdCelestialCrest(vec2 p, float scale) {
    vec2 q = p / scale;
    float dStar = hcSdStar4(q, 0.85, 0.46);
    float dDia = (abs(q.x) + abs(q.y)) * 0.7071 - 0.38;
    return min(dStar, dDia);
  }

  float hcSdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
`;

/**
 * Heavy Sculpted Royal Knight Standard Spear Pole & Razor Cross-Fleur Head.
 * Pivot y = 0 at spear tip for clean vertical ground-plant.
 */
function createBannerPoleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pole = new THREE.CylinderGeometry(0.038, 0.052, 3.65, 6);
  pole.translate(0, 1.825, 0);
  parts.push(pole);

  const spearHead = new THREE.ConeGeometry(0.20, 0.72, 4);
  spearHead.scale(0.9, 1.0, 0.34);
  spearHead.translate(0, 4.0, 0);
  parts.push(spearHead);

  for (const sx of [-1, 1]) {
    const sideWing = new THREE.ConeGeometry(0.10, 0.40, 4);
    sideWing.rotateZ(sx * -Math.PI * 0.5);
    sideWing.translate(sx * 0.24, 3.65, 0);
    parts.push(sideWing);
  }

  const crossbar = new THREE.CylinderGeometry(0.028, 0.028, 1.38, 6);
  crossbar.rotateZ(Math.PI / 2);
  crossbar.translate(0.64, 3.38, 0);
  parts.push(crossbar);

  const collarRing = new THREE.OctahedronGeometry(0.13, 0);
  collarRing.scale(0.9, 1.4, 0.55);
  collarRing.translate(0, 3.65, 0);
  parts.push(collarRing);

  return mergeSimpleGeos(parts);
}

/**
 * Downward-Pointing Sacred Knight Sword Geometry (for disciplined Sword Choir formation).
 * Pivot (0, 0, 0) at NEEDLE TIP! Blade rises vertically along +Y up to 2.25 units, hilt at top.
 * That way zero rotation flips are needed to plunge straight downward into the pit.
 */
function createDownwardChoirSwordGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0.0, 0.0); // Razor tip at y = 0!
  bladeShape.lineTo(0.105, 0.38);
  bladeShape.lineTo(0.125, 1.66);
  bladeShape.lineTo(0.32, 1.74); // Swept winged crossguard right
  bladeShape.lineTo(0.20, 1.83);
  bladeShape.lineTo(0.045, 1.80);
  bladeShape.lineTo(0.040, 2.24); // Grip
  bladeShape.lineTo(-0.040, 2.24);
  bladeShape.lineTo(-0.045, 1.80);
  bladeShape.lineTo(-0.20, 1.83);
  bladeShape.lineTo(-0.32, 1.74); // Swept winged crossguard left
  bladeShape.lineTo(-0.125, 1.66);
  bladeShape.lineTo(-0.105, 0.38);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  bladeGeo.translate(0, 0, -0.018);
  parts.push(bladeGeo);

  // Center ridge spine along blade
  const spine = new THREE.ConeGeometry(0.048, 1.65, 4);
  spine.scale(0.75, 1.0, 0.65);
  spine.rotateX(Math.PI);
  spine.translate(0, 0.90, 0);
  parts.push(spine);

  const guardGem = new THREE.OctahedronGeometry(0.095, 0);
  guardGem.scale(0.85, 1.35, 0.55);
  guardGem.translate(0, 1.75, 0);
  parts.push(guardGem);

  const pommel = new THREE.OctahedronGeometry(0.085, 0);
  pommel.scale(0.9, 1.45, 0.55);
  pommel.translate(0, 2.32, 0);
  parts.push(pommel);

  return mergeSimpleGeos(parts);
}

/**
 * Monumental Downward-Pointing Sacred Excalibur Greatsword Geometry (Center Plunge).
 * Pivot (0, 0, 0) EXACTLY at the razor blade tip! Extends straight UP along +Y to 4.25 units.
 * Drops straight vertically downward (rotation = 0,0,0) so the full colossal blade & angelic crossguard
 * tower majestically above the pit floor instead of burying underground.
 */
function createVerticalExcaliburGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0.0, 0.0); // Exact razor tip at y = 0
  bladeShape.lineTo(0.24, 0.68);
  bladeShape.lineTo(0.29, 2.95);
  // Swept double-wing paladin crossguard
  bladeShape.lineTo(0.84, 3.24);
  bladeShape.lineTo(0.56, 3.04);
  bladeShape.lineTo(0.22, 3.16);
  bladeShape.lineTo(0.42, 3.40);
  bladeShape.lineTo(0.095, 3.30);
  bladeShape.lineTo(0.085, 4.10); // Long two-handed grip
  bladeShape.lineTo(-0.085, 4.10);
  bladeShape.lineTo(-0.095, 3.30);
  bladeShape.lineTo(-0.42, 3.40);
  bladeShape.lineTo(-0.22, 3.16);
  bladeShape.lineTo(-0.56, 3.04);
  bladeShape.lineTo(-0.84, 3.24);
  bladeShape.lineTo(-0.29, 2.95);
  bladeShape.lineTo(-0.24, 0.68);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.042,
    bevelSize: 0.032,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.04);
  parts.push(bladeGeo);

  // Raised glowing fuller ridge running down the blade spine
  const fuller = new THREE.CylinderGeometry(0.055, 0.015, 2.75, 4);
  fuller.scale(0.8, 1.0, 1.45);
  fuller.translate(0, 1.62, 0);
  parts.push(fuller);

  // Guard core jewel & crown pommel crystal
  const guardJewel = new THREE.OctahedronGeometry(0.21, 0);
  guardJewel.scale(0.85, 1.45, 0.55);
  guardJewel.translate(0, 3.12, 0);
  parts.push(guardJewel);

  const pommel = new THREE.OctahedronGeometry(0.18, 0);
  pommel.scale(0.9, 1.55, 0.6);
  pommel.translate(0, 4.24, 0);
  parts.push(pommel);

  return mergeSimpleGeos(parts);
}

/**
 * High-Segment Smooth 3D Sakuga Excalibur Sweep Wave Geometry (Fate/UBW + HSR Phainon style).
 * Sweeps cleanly around the arena with sculpted vertical blade-camber & razor-tapered ends.
 */
function createGrandExcaliburSweepGeometry(
  innerR = 0.44,
  outerR = 1.24,
  sweepRad = Math.PI * 1.42,
  segments = 56
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 10;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    // Skewed anime smear envelope: razor needle start -> wide sweeping belly -> sharp leading tip
    const belly = Math.pow(Math.sin(u * Math.PI), 0.34) * (0.62 + 0.52 * u);
    const taper = Math.min(1.0, belly);
    const curInner = outerR - (outerR - innerR) * taper;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      // Smooth dynamic 3D wave wall rising gracefully on inner edge & curving out to razor outer edge
      const liftY =
        Math.pow(1.0 - v, 1.5) * 0.28 * taper +
        Math.sin(v * Math.PI) * 0.24 * taper;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = liftY;
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
 * Crisp Twin-Split Knight Pennant Shader: Snaps taut in shockwave wind pressure.
 */
function createBannerPennantMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float free = smoothstep(0.0, 0.25, uv.x);
        float whip = sin(uv.x * 16.0 - uTime * 28.0) * 0.030 * free;
        p.z += whip;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.66) / 0.34, 0.0, 1.0);
        if (vUv.x > 0.62 && abs(vUv.y - 0.5) < (vUv.x - 0.62) * 1.18) discard;

        vec2 cUv = (vUv - vec2(0.36, 0.5)) * 2.15;
        float crest = smoothstep(0.024, 0.0, hcSdCelestialCrest(cUv, 0.58));
        float trim = step(min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)), 0.055);
        float energyStreak = smoothstep(0.55, 0.92, sin(vUv.x * 22.0 - uTime * 22.0));

        vec3 navyInk = vec3(0.015, 0.035, 0.14);
        vec3 royalBlue = vec3(0.06, 0.24, 0.72);
        vec3 azure = vec3(0.16, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.30);

        vec3 col = mix(navyInk, royalBlue, step(0.35, vUv.y));
        col += azure * energyStreak * 0.45 * vUv.x;
        col = mix(col, gold * 1.45, trim);
        col = mix(col, vec3(1.0, 0.99, 0.92) * 1.65, crest);

        float shard = hcHash21(floor(vUv * 12.0));
        float dissolve = step(dissolveT, shard * 0.68 + (1.0 - vUv.x) * 0.36);
        if (dissolve < 0.5) discard;
        gl_FragColor = vec4(col, 0.98);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Hard-Edged Anime Cel-Shaded Paladin Steel Material w/ Glowing Center Fuller Core.
 */
function createPaladinSteelMaterial(isAzureSword = true, isExcalibur = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uIsAzure: { value: isAzureSword ? 1.0 : 0.0 },
      uIsExcalibur: { value: isExcalibur ? 1.0 : 0.0 },
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
      uniform float uIsAzure;
      uniform float uIsExcalibur;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${HALCYON_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.68) / 0.32, 0.0, 1.0);
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.85, 0.50));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.36, dot(N, L));
        float inkRim = smoothstep(0.24, 0.14, ndv);
        float edgeGlow = smoothstep(0.20, 0.30, ndv) * (1.0 - smoothstep(0.38, 0.48, ndv));

        // Glowing golden-azure central fuller rune channel along Excalibur blade
        float bladeZone = step(0.18, vLocalPos.y) * (1.0 - step(2.98, vLocalPos.y));
        float fullerCore = smoothstep(0.065, 0.015, abs(vLocalPos.x)) * bladeZone * uIsExcalibur;
        float surge = 0.7 + 0.3 * sin(vLocalPos.y * 8.0 - uTime * 18.0);
        float bolt = smoothstep(0.72, 0.86, hcRidged(vec2(vLocalPos.y * 4.5 - uTime * 12.0, vLocalPos.x * 6.5)));

        vec3 darkSteel = vec3(0.04, 0.075, 0.20);
        vec3 brightSteel = vec3(0.80, 0.92, 1.0);
        vec3 azure = vec3(0.14, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.28);

        vec3 col = mix(darkSteel, brightSteel, cel);
        col = mix(col, mix(gold * 1.45, azure * 1.85, uIsAzure), max(edgeGlow * 0.82, bolt * 0.85));
        col = mix(col, mix(azure, gold, 0.45) * (1.75 * surge), fullerCore * 0.92);
        col = mix(col, vec3(0.012, 0.022, 0.065), inkRim * 0.90);
        col += vec3(1.0) * (fullerCore * 0.55 + bolt * 0.45);

        vec3 vor = hcVoronoi(vLocalPos.xy * 4.2, 0.2);
        float dissolve = step(dissolveT, vor.z * 0.80 + 0.16);
        if (dissolve < 0.5) discard;
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
 * ACT 0 Shader: Open-Air Sacred Paladin Astrolabe Seal (Fate / HSR Phainon & Sunday inspired).
 * ZERO ugly opaque black sticker disc! Three counter-rotating precision SDF layers:
 * 1) Outer Cathedral Halo Ring w/ 16 precision compass ticks & 8 star nodes
 * 2) Counter-rotating 8-Pointed Sacred Paladin Octagram (two overlapping squares)
 * 3) Core Halcyon 4-Point Royal Cross-Crest + delicate Voronoi lightning fissures & shock rings.
 */
function createPaladinSacredSealMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uBlastT: { value: 0.0 },
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
      uniform float uBlastT;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        // Crisp 55ms explosive seal expansion from center
        float deploy = 1.0 - pow(1.0 - clamp(uProgress / 0.032, 0.0, 1.0), 4.0);
        float dissolveT = clamp((uProgress - 0.66) / 0.34, 0.0, 1.0);
        vec2 dp = p / max(0.08, deploy);
        float dr = length(dp);

        // Layer 1: Outer Cathedral Ring (clockwise) + precision 16-tick gauge & segmented arc dashes
        vec2 pOuter = hcRot(uTime * 0.32) * dp;
        float angO = atan(pOuter.y, pOuter.x);
        float outerRailA = smoothstep(0.015, 0.004, abs(dr - 0.92));
        float outerRailB = smoothstep(0.010, 0.003, abs(dr - 0.84));
        float outerDashes = smoothstep(0.012, 0.003, abs(dr - 0.88)) * smoothstep(0.15, 0.35, sin(angO * 8.0));
        float ticks16 = smoothstep(0.74, 0.86, abs(cos(angO * 8.0))) * smoothstep(0.042, 0.012, abs(dr - 0.88));
        // 4 Royal Diamond Nodes on outer cardinal points
        float secO = mod(angO + 3.14159265, 1.5707963) - 0.78539816;
        vec2 nodeP = vec2(cos(secO), sin(secO)) * dr - vec2(0.88, 0.0);
        float cardNode = smoothstep(0.014, 0.002, hcSdStar4(nodeP, 0.055, 0.52));

        // Layer 2: Counter-Rotating 8-Pointed Paladin Octagram (2 rotated squares + inner ring)
        vec2 pOct = hcRot(-uTime * 0.48) * dp;
        float sq1 = abs(max(abs(pOct.x), abs(pOct.y)) - 0.58);
        vec2 pOct45 = hcRot(0.78539816) * pOct;
        float sq2 = abs(max(abs(pOct45.x), abs(pOct45.y)) - 0.58);
        float octagram = smoothstep(0.014, 0.003, min(sq1, sq2));
        float midRing = smoothstep(0.011, 0.003, abs(dr - 0.58));

        // 8 delicate radial lance lines connecting core to octagram tips
        float angOct = atan(pOct.y, pOct.x);
        float radMask = smoothstep(0.24, 0.30, dr) * (1.0 - smoothstep(0.76, 0.82, dr));
        float spokes = smoothstep(0.96, 0.992, abs(cos(angOct * 4.0))) * radMask;

        // Layer 3: Core Halcyon Royal 4-Point Cross-Crest (matches pose.webp flag crest!)
        vec2 pCore = hcRot(uTime * 0.22) * dp;
        float coreRing = smoothstep(0.013, 0.003, abs(dr - 0.29));
        float crestLine = smoothstep(0.014, 0.002, abs(hcSdCelestialCrest(pCore, 0.27)));
        float crestFill = smoothstep(0.010, -0.015, hcSdCelestialCrest(pCore, 0.16));

        // Subtle Voronoi Lightning Cracks radiating from center impact (open-air, NOT muddy black disc!)
        vec3 vor = hcVoronoi(vec2(atan(p.y, p.x) * 2.4, r * 6.5), 0.12);
        float fissures = smoothstep(0.036, 0.006, vor.y) * smoothstep(0.92, 0.12, r) * smoothstep(0.04, 0.14, r);

        // Expanding Supersonic Ring Wave on impacts
        float waveR = fract(uBlastT) * 0.95;
        float sonicWave = exp(-pow((r - waveR) * 30.0, 2.0)) * step(0.01, uBlastT) * (1.0 - smoothstep(0.68, 1.0, waveR));

        float shardDissolve = step(dissolveT, vor.z * 0.82 + (1.0 - r) * 0.18);
        if (shardDissolve < 0.5) discard;

        // Thin ink border hugging ONLY the glowing geometry (keeps pit floor & ores clearly visible!)
        float lineSum = clamp(
          outerRailA + outerRailB + outerDashes + ticks16 + cardNode +
          octagram + midRing + spokes + coreRing + crestLine + crestFill + fissures * 0.85,
          0.0, 1.0
        );
        float centerTint = exp(-r * r * 10.0) * 0.38;

        vec3 inkNavy = vec3(0.015, 0.035, 0.12);
        vec3 azure = vec3(0.14, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.30);
        vec3 whiteHot = vec3(1.0, 0.99, 0.95);

        float goldMask = clamp(outerDashes + octagram * 0.9 + cardNode + coreRing + crestLine, 0.0, 1.0);
        float azureMask = clamp(outerRailA + outerRailB + ticks16 + midRing + spokes + fissures * 1.2 + sonicWave * 1.5, 0.0, 1.0);
        float whiteMask = clamp(crestFill + cardNode * 0.7 + sonicWave * 0.9 + fissures * 0.55, 0.0, 1.0);

        vec3 col = inkNavy * 0.9;
        col += azure * azureMask * 1.65;
        col += gold * goldMask * 1.65;
        col += whiteHot * whiteMask * 1.4;

        float alpha = clamp(max(centerTint, max(lineSum, sonicWave)) * smoothstep(0.99, 0.93, r) * deploy, 0.0, 0.96);
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
 * Gate of Babylon / Celestial Sky Halo Ring Material (used for Main Sky Gate & 8 Mini Sword Gates).
 */
function createSkyGateHaloMaterial(isMainGate: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
      uIsMain: { value: isMainGate ? 1.0 : 0.0 },
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
      uniform float uTime;
      uniform float uIsMain;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float openSnap = 1.0 - pow(1.0 - clamp(uLocalT * 5.0, 0.0, 1.0), 3.0);
        float closeFade = 1.0 - smoothstep(0.70, 1.0, uLocalT);
        vec2 rp = hcRot(uTime * (1.2 + uIsMain * 0.4)) * p;
        float ang = atan(rp.y, rp.x);

        float outerRing = smoothstep(0.045, 0.010, abs(r - 0.84 * openSnap));
        float innerRing = smoothstep(0.032, 0.008, abs(r - 0.52 * openSnap));
        float ticks = smoothstep(0.55, 0.85, sin(ang * 8.0)) * smoothstep(0.07, 0.02, abs(r - 0.68 * openSnap));
        float vortexCore = exp(-r * r * (7.5 - uIsMain * 2.0)) * (0.65 + 0.35 * sin(r * 16.0 - uTime * 12.0));

        vec3 azure = vec3(0.16, 0.88, 1.0) * 1.75;
        vec3 gold = vec3(1.0, 0.88, 0.30) * 1.85;
        vec3 col = mix(azure, gold, clamp(outerRing + ticks * 0.8, 0.0, 1.0)) + vec3(1.0) * (vortexCore * 0.8 + innerRing * 0.7);

        float alpha = clamp((outerRing + innerRing + ticks * 0.7 + vortexCore * 0.75) * smoothstep(0.99, 0.85, r) * closeFade, 0.0, 1.0);
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
 * Vertical Plunge Speed-Beam Sheath guiding Excalibur straight down into the Pit.
 */
function createPlungeGuideBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
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
      uniform float uTime;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        float xDist = abs(vUv.x - 0.5) * 2.0;
        float coreBeam = smoothstep(0.26, 0.02, xDist);
        float outerGlow = exp(-xDist * xDist * 7.5);
        float streak = smoothstep(0.45, 0.88, hcRidged(vec2(vUv.x * 8.0, vUv.y * 5.0 + uTime * 22.0)));
        float vMask = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        float fade = 1.0 - smoothstep(0.55, 1.0, uLocalT);

        vec3 col = mix(vec3(0.14, 0.86, 1.0) * 1.75, vec3(1.0, 0.90, 0.35) * 1.85, streak * 0.65);
        col += vec3(1.0) * coreBeam * 1.4;
        float alpha = clamp((coreBeam + outerGlow * 0.65 + streak * 0.45) * vMask * fade, 0.0, 1.0);
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
 * ACT 1 Shader: Razor-Sharp High-Contrast Thunder-Rail Beam Cleaves.
 */
function createThunderRailLanceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 1.0 },
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
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
        float tick = floor(uTime * 36.0 + uSeed);
        float jag = (hcHash21(vec2(floor(p.y * 14.0), tick)) - 0.5) * 0.30;
        float widthMask = (1.0 - smoothstep(0.0, 0.38, uLocalT)) * 0.25 + 0.065;
        float distMain = abs(p.x - jag);

        float inkOuter = smoothstep(widthMask * 1.60, widthMask * 1.20, distMain);
        float azureBody = smoothstep(widthMask * 1.15, widthMask * 0.85, distMain);
        float whiteRazorCore = smoothstep(widthMask * 0.45, widthMask * 0.20, distMain);
        float fins = smoothstep(0.032, 0.006, abs(abs(p.x - jag) - widthMask * 1.80)) * step(0.55, sin(p.y * 36.0));

        float vMask = smoothstep(0.0, 0.05, p.y) * smoothstep(1.0, 0.88, p.y);
        float snapFade = 1.0 - smoothstep(0.45, 1.0, uLocalT);

        vec3 col = mix(vec3(0.015, 0.03, 0.12), vec3(0.14, 0.86, 1.0) * 1.9, azureBody);
        col = mix(col, vec3(1.0, 0.99, 0.94) * 2.1, max(whiteRazorCore, fins));

        float alpha = clamp(max(inkOuter * 0.9, max(azureBody, fins)) * vMask * snapFade, 0.0, 1.0);
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
 * ACT 2 & 3 Grand Excalibur Crescent Sweep Shader (Ufotable Fate + HSR Phainon style):
 * Smooth tapered razor white-gold leading edge + domain-warped electric azure plasma flames +
 * carved cel-cut negative dark pockets (NO blocky flat UV stripes!).
 */
function createGrandExcaliburSweepMaterial(isGoldDominant: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
      uIsGold: { value: isGoldDominant ? 1.0 : 0.0 },
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
      uniform float uTime;
      uniform float uIsGold;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        float head = 1.0 - pow(1.0 - clamp(uLocalT * 4.2, 0.0, 1.0), 4.0);
        float tail = max(0.0, (uLocalT - 0.22) * 1.32);

        float headMask = smoothstep(head + 0.06, head - 0.02, vUv.x);
        float tailMask = smoothstep(tail - 0.14, tail + 0.08, vUv.x);
        float arcMask = headMask * tailMask;

        // Domain-warped Sakuga plasma streaks along the sweep arc
        vec2 warpUv = vec2(vUv.x * 16.0 - uTime * 9.0, vUv.y * 5.5);
        float warp = hcFbm(warpUv);
        float ridged = hcRidged(warpUv + warp * 0.85);

        // Smooth organic blade envelope + carved cel-ink negative flame cutouts
        float outerEnvelope = smoothstep(0.02, 0.28, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float carvedVoid = smoothstep(0.24, 0.56, vUv.y) * (1.0 - smoothstep(0.56, 0.82, vUv.y)) * smoothstep(0.42, 0.58, warp);
        float razorCore = smoothstep(0.72, 0.92, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
        float crackle = smoothstep(0.66, 0.88, ridged) * smoothstep(0.18, 0.72, vUv.y);

        vec3 azure = vec3(0.12, 0.84, 1.0) * 1.95;
        vec3 gold = vec3(1.0, 0.86, 0.26) * 2.05;
        vec3 primaryCol = mix(azure, gold, uIsGold);
        vec3 accentCol = mix(gold, azure, uIsGold);
        vec3 whiteCore = vec3(1.0, 0.99, 0.95) * 2.35;

        vec3 col = mix(primaryCol, accentCol, clamp(warp * 0.75 + crackle * 0.5, 0.0, 1.0));
        col = mix(col, whiteCore, clamp(razorCore * 1.05 + crackle * 0.65, 0.0, 1.0));

        float lifeFade = 1.0 - smoothstep(0.62, 1.0, uLocalT);
        float alpha = clamp(outerEnvelope * (1.0 - carvedVoid * 0.68) * arcMask * lifeFade, 0.0, 1.0);
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
 * ACT 3 Shader: 3D Volumetric Celestial Excalibur Light Pillar erupting around the planted greatsword!
 */
function createCelestialLightPillarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
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
      uniform float uLocalT;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${HALCYON_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = abs(dot(N, V));
        float radialWall = pow(rim, 0.55);

        // Rising vertical celestial plasma streaks
        float spiralA = hcRidged(vec2(vUv.x * 10.0 + uTime * 1.4, vUv.y * 3.5 - uTime * 9.0));
        float spiralB = hcFbm(vec2(vUv.x * 6.0 - uTime * 2.0, vUv.y * 5.0 - uTime * 12.0));
        float rays = smoothstep(0.28, 0.85, spiralA * 0.65 + spiralB * 0.55);

        float vMask = smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
        float fade = 1.0 - smoothstep(0.42, 1.0, uLocalT);

        vec3 azure = vec3(0.14, 0.86, 1.0) * 1.9;
        vec3 gold = vec3(1.0, 0.88, 0.30) * 2.0;
        vec3 col = mix(azure, gold, smoothstep(0.3, 0.85, spiralB));
        col += vec3(1.0, 0.99, 0.94) * (pow(rim, 2.2) * 1.2 + rays * 0.75);

        float alpha = clamp((radialWall * 0.65 + rays * 0.75) * vMask * fade, 0.0, 1.0);
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
 * ACT 3 Ground Shockwave Crown Ring Material (replaces flat 2D cross sticker with crisp expanding arena shockwave!).
 */
function createFinalShockRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uTime: { value: 0.0 },
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
      uniform float uTime;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float expand = 1.0 - pow(1.0 - clamp(uLocalT * 2.4, 0.0, 1.0), 4.0);
        float ringPos = mix(0.12, 0.92, expand);
        float mainRing = exp(-pow((r - ringPos) * 22.0, 2.0));
        float trailRing = exp(-pow((r - max(0.05, ringPos - 0.14)) * 14.0, 2.0)) * 0.65;

        // Dynamic radial speed-teeth around expanding crown
        float teeth = smoothstep(0.35, 0.85, hcRidged(vec2(ang * 4.5, r * 6.0 - uTime * 8.0)));
        float burstMask = (mainRing + trailRing) * (0.65 + 0.55 * teeth);

        float fade = 1.0 - smoothstep(0.45, 1.0, uLocalT);
        vec3 col = mix(vec3(0.14, 0.88, 1.0) * 1.85, vec3(1.0, 0.88, 0.30) * 1.95, mainRing);
        col += vec3(1.0) * mainRing * 0.85;

        float alpha = clamp(burstMask * smoothstep(0.99, 0.84, r) * fade, 0.0, 1.0);
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
 * Direct Per-Ore Razor Diamond Cross & Sonic Impact Ring Flash.
 */
function createHalcyonHitFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#fde047') },
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
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 4.5, 0.0, 1.0), 4.0);
        float ring = exp(-pow((r - mix(0.12, 0.90, pop)) * 24.0, 2.0));
        float bladeX = step(abs(p.y), 0.08 * (1.0 - abs(p.x))) * step(abs(p.x), 0.96);
        float bladeY = step(abs(p.x), 0.08 * (1.0 - abs(p.y))) * step(abs(p.y), 0.96);
        float core = step(r, 0.20 * (1.0 - uLocalT * 0.7));

        float fade = 1.0 - smoothstep(0.42, 1.0, uLocalT);
        float mask = clamp((ring + bladeX + bladeY + core) * smoothstep(0.99, 0.85, r), 0.0, 1.4);
        vec3 col = mix(uColor * 1.9, uCoreColor * 1.95, ring) + vec3(1.0) * (core + (bladeX + bladeY) * 0.75);
        float alpha = clamp(mask * fade, 0.0, 1.0);
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
 * Layer 5 Shader: High-Velocity Crystal Shards & Razor Electric Sparks.
 */
function createRazorShardParticleMaterial(isGoldSpark: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalLife: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsGold: { value: isGoldSpark ? 1.0 : 0.0 },
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
      uniform float uIsGold;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float shardD = abs(p.x) * 0.55 + abs(p.y) * 1.35 - 0.52;
        if (shardD > 0.0) discard;

        float ink = step(-0.08, shardD);
        float core = step(shardD, -0.22);

        vec3 baseCol = mix(vec3(0.14, 0.86, 1.0) * 1.75, vec3(1.0, 0.88, 0.28) * 1.8, uIsGold);
        vec3 col = mix(baseCol, vec3(0.015, 0.03, 0.12), ink * 0.88);
        col = mix(col, vec3(1.0, 0.99, 0.94) * 1.9, core);

        float fade = 1.0 - smoothstep(0.65, 1.0, uLocalLife);
        float alpha = clamp(fade, 0.0, 0.98);
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

interface RailLanceSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  fired: boolean;
  targetIndex: number;
}

interface SkySwordSlot {
  mesh: THREE.Mesh;
  gateMesh: THREE.Mesh;
  gateMat: THREE.ShaderMaterial;
  delay: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  aimQuat: THREE.Quaternion;
  landed: boolean;
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

interface ShardParticleSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseScale: number;
}

interface HalcyonSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  bannerSlamFired: boolean;
  guillotineImpactFired: boolean;
  finaleFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  sealMesh: THREE.Mesh;
  sealMat: THREE.ShaderMaterial;
  skyGateMesh: THREE.Mesh;
  skyGateMat: THREE.ShaderMaterial;
  plungeBeamMesh: THREE.Mesh;
  plungeBeamMat: THREE.ShaderMaterial;
  bannerPoleMesh: THREE.Mesh;
  bannerPoleMat: THREE.ShaderMaterial;
  bannerPennantMesh: THREE.Mesh;
  bannerPennantMat: THREE.ShaderMaterial;
  railLances: RailLanceSlot[];
  skySwords: SkySwordSlot[];
  swordMat: THREE.ShaderMaterial;
  excaliburMesh: THREE.Mesh;
  excaliburMat: THREE.ShaderMaterial;
  crescentAMesh: THREE.Mesh;
  crescentAMat: THREE.ShaderMaterial;
  crescentBMesh: THREE.Mesh;
  crescentBMat: THREE.ShaderMaterial;
  pillarMesh: THREE.Mesh;
  pillarMat: THREE.ShaderMaterial;
  shockRingMesh: THREE.Mesh;
  shockRingMat: THREE.ShaderMaterial;
  oreFlashes: OreFlashSlot[];
  particles: ShardParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Halcyon Twins
 * ("Luminosité Excalibur: Gate of Heaven & Sacred Plunge" — Fate/UBW + HSR Phainon/Sunday inspired):
 * - Act 0 (0.00s->0.14s): Open-Air Cathedral Octagram Astrolabe Seal + Royal Knight Banner Slam (left-back flank)
 * - Act 1 (0.14s->0.44s): 3 Staccato Thunder-Rail Lances + Symmetrical 8-Sword Sky Crown Choir w/ Gate Ripples
 * - Act 2 (0.38s->0.96s, Climax 0.61s): Colossal Excalibur 100% Straight Vertical Plunge from Sky Gate Halo
 *   (tip at y=0 plunges cleanly into pit center so full blade + wing crossguard tower upward!) ->
 *   0.088s Hit-Stop + B&W Invert Impact Frame + Grand Sweeping Azure-Gold Crescent #1
 * - Act 3 (0.68s->1.45s, Finale 0.94s): Symmetrical Left-Right Sword Choir Volley planting into a neat
 *   Sanctuary Ring -> Grand Cross Sweep #2 + 3D Volumetric Celestial Light Pillar + Shockwave Crown + 36 Shards!
 */
export class HalcyonTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: HalcyonSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const pennantGeo = new THREE.PlaneGeometry(1.32, 0.68, 8, 2);
    pennantGeo.translate(0.66, 0, 0);
    const bannerPoleGeo = createBannerPoleGeometry();
    const choirSwordGeo = createDownwardChoirSwordGeometry();
    const excaliburGeo = createVerticalExcaliburGeometry();
    const crescentGeo = createGrandExcaliburSweepGeometry(0.44, 1.24, Math.PI * 1.42, 56);
    const pillarGeo = new THREE.CylinderGeometry(1.05, 0.62, 10.5, 24, 1, true);
    pillarGeo.translate(0, 5.25, 0);
    this.sharedGeos.push(
      planeGeo,
      pennantGeo,
      bannerPoleGeo,
      choirSwordGeo,
      excaliburGeo,
      crescentGeo,
      pillarGeo
    );

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const sealMat = createPaladinSacredSealMaterial();
      const sealMesh = new THREE.Mesh(planeGeo, sealMat);
      sealMesh.rotation.x = -Math.PI / 2;
      root.add(sealMesh);
      this.allMats.push(sealMat);

      const skyGateMat = createSkyGateHaloMaterial(true);
      const skyGateMesh = new THREE.Mesh(planeGeo, skyGateMat);
      skyGateMesh.rotation.x = -Math.PI / 2;
      skyGateMesh.visible = false;
      root.add(skyGateMesh);
      this.allMats.push(skyGateMat);

      const plungeBeamMat = createPlungeGuideBeamMaterial();
      const plungeBeamMesh = new THREE.Mesh(planeGeo, plungeBeamMat);
      plungeBeamMesh.visible = false;
      root.add(plungeBeamMesh);
      this.allMats.push(plungeBeamMat);

      const bannerPoleMat = createPaladinSteelMaterial(false, false);
      const bannerPoleMesh = new THREE.Mesh(bannerPoleGeo, bannerPoleMat);
      bannerPoleMesh.visible = false;
      root.add(bannerPoleMesh);

      const bannerPennantMat = createBannerPennantMaterial();
      const bannerPennantMesh = new THREE.Mesh(pennantGeo, bannerPennantMat);
      bannerPennantMesh.visible = false;
      root.add(bannerPennantMesh);
      this.allMats.push(bannerPoleMat, bannerPennantMat);

      const railLances: RailLanceSlot[] = [];
      for (let i = 0; i < RAIL_LANCE_COUNT; i++) {
        const lMat = createThunderRailLanceMaterial();
        lMat.uniforms.uSeed.value = (i + 1) * 4.3;
        const lMesh = new THREE.Mesh(planeGeo, lMat);
        lMesh.visible = false;
        root.add(lMesh);
        this.allMats.push(lMat);
        railLances.push({
          mesh: lMesh,
          mat: lMat,
          delay: 0.14 + i * 0.10,
          fired: false,
          targetIndex: i,
        });
      }

      const swordMat = createPaladinSteelMaterial(true, false);
      this.allMats.push(swordMat);

      const skySwords: SkySwordSlot[] = [];
      for (let i = 0; i < SKY_SWORD_COUNT; i++) {
        const sMesh = new THREE.Mesh(choirSwordGeo, swordMat);
        sMesh.visible = false;
        root.add(sMesh);

        const gMat = createSkyGateHaloMaterial(false);
        const gMesh = new THREE.Mesh(planeGeo, gMat);
        gMesh.rotation.x = -Math.PI / 2;
        gMesh.visible = false;
        root.add(gMesh);
        this.allMats.push(gMat);

        skySwords.push({
          mesh: sMesh,
          gateMesh: gMesh,
          gateMat: gMat,
          delay: 0.68,
          startPos: new THREE.Vector3(),
          endPos: new THREE.Vector3(),
          aimQuat: new THREE.Quaternion(),
          landed: false,
          targetIndex: i,
        });
      }

      // Colossal Vertical Excalibur Greatsword (tip at y=0, straight vertical plunge!)
      const excaliburMat = createPaladinSteelMaterial(true, true);
      const excaliburMesh = new THREE.Mesh(excaliburGeo, excaliburMat);
      excaliburMesh.visible = false;
      root.add(excaliburMesh);
      this.allMats.push(excaliburMat);

      const crescentAMat = createGrandExcaliburSweepMaterial(false);
      const crescentAMesh = new THREE.Mesh(crescentGeo, crescentAMat);
      crescentAMesh.visible = false;
      root.add(crescentAMesh);
      this.allMats.push(crescentAMat);

      const crescentBMat = createGrandExcaliburSweepMaterial(true);
      const crescentBMesh = new THREE.Mesh(crescentGeo, crescentBMat);
      crescentBMesh.visible = false;
      root.add(crescentBMesh);
      this.allMats.push(crescentBMat);

      const pillarMat = createCelestialLightPillarMaterial();
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.visible = false;
      root.add(pillarMesh);
      this.allMats.push(pillarMat);

      const shockRingMat = createFinalShockRingMaterial();
      const shockRingMesh = new THREE.Mesh(planeGeo, shockRingMat);
      shockRingMesh.rotation.x = -Math.PI / 2;
      shockRingMesh.visible = false;
      root.add(shockRingMesh);
      this.allMats.push(shockRingMat);

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createHalcyonHitFlashMaterial();
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
          life: 0.22,
          baseScale: 3.6,
        });
      }

      const particles: ShardParticleSlot[] = [];
      for (let i = 0; i < SHARD_PARTICLE_COUNT; i++) {
        const isGold = i % 3 === 0;
        const pMat = createRazorShardParticleMaterial(isGold);
        pMat.uniforms.uSeed.value = (i + 1) * 1.91;
        const pMesh = new THREE.Mesh(planeGeo, pMat);
        pMesh.visible = false;
        root.add(pMesh);
        this.allMats.push(pMat);
        particles.push({
          mesh: pMesh,
          mat: pMat,
          active: false,
          age: 0,
          life: 0.48,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 0.56,
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        bannerSlamFired: false,
        guillotineImpactFired: false,
        finaleFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        sealMesh,
        sealMat,
        skyGateMesh,
        skyGateMat,
        plungeBeamMesh,
        plungeBeamMat,
        bannerPoleMesh,
        bannerPoleMat,
        bannerPennantMesh,
        bannerPennantMat,
        railLances,
        skySwords,
        swordMat,
        excaliburMesh,
        excaliburMat,
        crescentAMesh,
        crescentAMat,
        crescentBMesh,
        crescentBMat,
        pillarMesh,
        pillarMat,
        shockRingMesh,
        shockRingMat,
        oreFlashes,
        particles,
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

  private triggerOreFlash(inst: HalcyonSkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isAzure: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.22;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.95, pt.z + 0.16);
    f.mesh.scale.setScalar(scale * 0.5);
    f.mat.uniforms.uColor.value.set(isAzure ? '#38bdf8' : '#2dd4bf');
    f.mat.uniforms.uCoreColor.value.set('#fde047');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchShardBurst(inst: HalcyonSkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.particles.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.particles[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.36 + ((i * 19) % 10) * 0.025;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.08;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 3) * 0.31;
      const spd = (8.5 + ((i * 29) % 10) * 0.95) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (4.8 + ((i * 23) % 10) * 0.72) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseScale = (0.62 + (i % 3) * 0.22) * Math.max(0.75, inst.areaScale);
      sp.mesh.position.copy(sp.pos);
      sp.mesh.visible = true;
      sp.mat.uniforms.uLocalLife.value = 0;
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
    inst.bannerSlamFired = false;
    inst.guillotineImpactFired = false;
    inst.finaleFired = false;
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

    // 1. Open-Air Cathedral Octagram Seal on Pit Floor
    inst.sealMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.sealMesh.scale.setScalar(11.6 * as);
    inst.sealMat.uniforms.uProgress.value = 0;
    inst.sealMat.uniforms.uBlastT.value = 0;

    // 2. Royal Banner Spear planted cleanly on left-back flank (never blocking center Excalibur!)
    const bannerS = 1.28 * safeAs;
    const bx = opts.cx - 1.55 * as;
    const bz = opts.cz - 1.35 * as;
    inst.bannerPoleMesh.position.set(bx, opts.cy + 8.5, bz);
    inst.bannerPoleMesh.rotation.set(0.03, 0, -0.04);
    inst.bannerPoleMesh.scale.setScalar(bannerS);
    inst.bannerPoleMesh.visible = true;

    inst.bannerPennantMesh.position.set(bx, opts.cy + 8.5 + 2.95 * bannerS, bz);
    inst.bannerPennantMesh.rotation.set(0.03, 0.16, -0.04);
    inst.bannerPennantMesh.scale.setScalar(bannerS);
    inst.bannerPennantMesh.visible = true;

    // 3. 3 Diagonal Thunder-Rail Beam Lances
    const lanceLimit = this.lowQuality ? 2 : RAIL_LANCE_COUNT;
    const angles = [-0.52, 0.56, -0.18];
    for (let i = 0; i < inst.railLances.length; i++) {
      const lb = inst.railLances[i];
      lb.fired = false;
      if (i >= lanceLimit) {
        lb.mesh.visible = false;
        continue;
      }
      const tgt = inst.pts[i % inst.pts.length];
      lb.targetIndex = i % inst.pts.length;
      lb.delay = 0.14 + i * 0.10;
      lb.mesh.position.set(tgt.x, tgt.y + 3.4, tgt.z + 0.12);
      lb.mesh.rotation.set(-0.22, (i - 1) * 0.25, angles[i % angles.length]);
      lb.mesh.scale.set(2.25 * as, 8.6, 1);
      lb.mesh.visible = false;
      lb.mat.uniforms.uLocalT.value = 0;
    }

    // 4. Symmetrical Sword Choir Crown (Gate of Babylon / HSR Phainon style):
    // Arranged in a balanced semi-circular crown arch flanking the center, pointing cleanly straight down-inward!
    const swordLimit = this.lowQuality ? 4 : SKY_SWORD_COUNT;
    const crownRadius = 4.35 * as;
    const ringTargetRadius = 2.65 * as;
    for (let i = 0; i < inst.skySwords.length; i++) {
      const sw = inst.skySwords[i];
      sw.landed = false;
      if (i >= swordLimit) {
        sw.mesh.visible = false;
        sw.gateMesh.visible = false;
        continue;
      }
      // Symmetrical pair index (0 = outermost pair, higher = inner pair)
      const pairIdx = Math.floor(i / 2);
      const pairCount = Math.max(1, Math.ceil(swordLimit / 2));
      const side = i % 2 === 0 ? -1 : 1;
      const frac = pairCount > 1 ? pairIdx / (pairCount - 1) : 0; // 0 = outer, 1 = inner
      // Fan cleanly from +/- 112 deg (outer wings) to +/- 26 deg (inner crown flanking center)
      const az = side * THREE.MathUtils.lerp(1.95, 0.45, frac);
      const sx = opts.cx + Math.sin(az) * crownRadius;
      const sz = opts.cz - Math.cos(az) * crownRadius * 0.72 - 0.35 * as;
      const sy = opts.cy + 4.35 + frac * 1.15;

      // Symmetrical Sanctuary Ring landing positions around center Excalibur (clean & harmonious!)
      const ex = opts.cx + Math.sin(az) * ringTargetRadius;
      const ez = opts.cz - Math.cos(az) * ringTargetRadius * 0.78;
      const ey = opts.cy + 0.10;

      sw.targetIndex = i % inst.pts.length;
      // Fire in symmetrical left-right pairs from outer to inner!
      sw.delay = 0.68 + pairIdx * 0.042;
      sw.startPos.set(sx, sy, sz);
      sw.endPos.set(ex, ey, ez);

      // Geometry tip is at y = 0 pointing straight down when local +Y points straight UP (0,1,0).
      // Align local -Y (blade tip direction) along (endPos - startPos), i.e. local +Y along (startPos - endPos)!
      this.tmpDir.subVectors(sw.startPos, sw.endPos).normalize();
      sw.aimQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);

      sw.mesh.position.copy(sw.startPos);
      sw.mesh.quaternion.copy(sw.aimQuat);
      sw.mesh.scale.setScalar(1.08 * safeAs);
      sw.mesh.visible = false;

      // Mini Gate Ripple right behind each sword's hilt along its launch axis
      sw.gateMesh.position.copy(sw.startPos).addScaledVector(this.tmpDir, 2.05 * safeAs);
      sw.gateMesh.scale.setScalar(1.55 * safeAs);
      sw.gateMesh.visible = false;
      sw.gateMat.uniforms.uLocalT.value = 0;
    }

    // 5. Colossal Vertical Excalibur + Sky Gate Halo + Vertical Plunge Beam
    const exScale = 1.62 * safeAs;
    inst.excaliburMesh.position.set(opts.cx, opts.cy + 5.6, opts.cz);
    inst.excaliburMesh.rotation.set(0, 0, 0); // 100% STRAIGHT VERTICAL!
    inst.excaliburMesh.scale.setScalar(exScale);
    inst.excaliburMesh.visible = false;

    inst.skyGateMesh.position.set(opts.cx, opts.cy + 8.9, opts.cz);
    inst.skyGateMesh.scale.setScalar(5.4 * as);
    inst.skyGateMesh.visible = false;
    inst.skyGateMat.uniforms.uLocalT.value = 0;

    inst.plungeBeamMesh.position.set(opts.cx, opts.cy + 4.4, opts.cz);
    inst.plungeBeamMesh.scale.set(1.85 * as, 9.0, 1);
    inst.plungeBeamMesh.visible = false;
    inst.plungeBeamMat.uniforms.uLocalT.value = 0;

    // 6. Grand Excalibur Sweeps (#1 Azure-Dominant, #2 Gold-Dominant Cross Sweep)
    inst.crescentAMesh.position.set(opts.cx, opts.cy + 1.25, opts.cz);
    inst.crescentAMesh.rotation.set(0.18, -Math.PI * 0.45, 0.14);
    inst.crescentAMesh.scale.setScalar(0.01);
    inst.crescentAMesh.visible = false;

    inst.crescentBMesh.position.set(opts.cx, opts.cy + 1.45, opts.cz);
    inst.crescentBMesh.rotation.set(-0.22, Math.PI * 0.35, -0.18);
    inst.crescentBMesh.scale.setScalar(0.01);
    inst.crescentBMesh.visible = false;

    // 7. 3D Volumetric Celestial Light Pillar & Ground Shockwave Crown
    inst.pillarMesh.position.set(opts.cx, opts.cy + 0.12, opts.cz);
    inst.pillarMesh.scale.set(1.25 * as, 1.0, 1.25 * as);
    inst.pillarMesh.visible = false;

    inst.shockRingMesh.position.set(opts.cx, opts.cy + 0.18, opts.cz);
    inst.shockRingMesh.scale.setScalar(0.01);
    inst.shockRingMesh.visible = false;

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    for (let i = 0; i < inst.particles.length; i++) {
      inst.particles[i].active = false;
      inst.particles[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.84, '#020817', 1.35);
    this.hooks.onSpeedLines?.(1.0, 0.55);
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
      const as = inst.areaScale;
      const safeAs = Math.max(0.75, as);

      inst.sealMat.uniforms.uProgress.value = uProgress;
      inst.sealMat.uniforms.uTime.value = timeSec;

      // ACT 0 (0.00s -> 0.07s): Banner Spear Slam on left-back flank
      const slamT = Math.min(1, inst.elapsed / 0.07);
      const slamSnap = slamT * slamT * slamT;
      const bannerS = 1.28 * safeAs;
      const bx = inst.cx - 1.55 * as;
      const bz = inst.cz - 1.35 * as;
      const bannerY = THREE.MathUtils.lerp(inst.cy + 8.5, inst.cy + 0.04, slamSnap);
      inst.bannerPoleMesh.position.set(bx, bannerY, bz);
      inst.bannerPennantMesh.position.set(bx, bannerY + 2.95 * bannerS, bz);
      inst.bannerPoleMat.uniforms.uProgress.value = uProgress;
      inst.bannerPoleMat.uniforms.uTime.value = timeSec;
      inst.bannerPennantMat.uniforms.uProgress.value = uProgress;
      inst.bannerPennantMat.uniforms.uTime.value = timeSec;

      if (!inst.bannerSlamFired && inst.elapsed >= 0.07) {
        inst.bannerSlamFired = true;
        inst.hitStopTimer = 0.026;
        this.hooks.onImpactFrame?.(0.85, 0.0, '#38bdf8', 0.034);
        this.hooks.onCameraPush?.(-0.20, -0.024);
        this.hooks.onFlash?.('#e0f2fe', 0.42);
        this.tmpTargetPos.set(bx, inst.cy + 0.55, bz);
        this.launchShardBurst(inst, this.tmpTargetPos, 0, 6, 0.92);
      }

      // Pulse Shockwave Timer on Seal across Acts
      if (inst.elapsed >= 0.07 && inst.elapsed < 0.58) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.07) / 0.42);
      } else if (inst.elapsed >= 0.61 && inst.elapsed < 0.94) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.61) / 0.30);
      } else if (inst.elapsed >= 0.94) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.94) / 0.35);
      }

      // ACT 1 (0.14s -> 0.44s): 3 Staccato Diagonal Thunder-Rail Lances
      const lanceLimit = this.lowQuality ? 2 : RAIL_LANCE_COUNT;
      for (let i = 0; i < lanceLimit; i++) {
        const lb = inst.railLances[i];
        if (inst.elapsed < lb.delay) continue;
        lb.mesh.visible = true;
        if (!lb.fired) {
          lb.fired = true;
          const pt = inst.pts[lb.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.8 * as, true);
          this.tmpTargetPos.set(pt.x, pt.y + 0.9, pt.z);
          this.launchShardBurst(inst, this.tmpTargetPos, 6 + i * 2, 2, 1.05);
          this.hooks.onCameraPush?.(0.14, 0.022);
          inst.onSlashBeatCallback?.(i, pt);
        }
        const lt = Math.min(1, (inst.elapsed - lb.delay) / 0.18);
        lb.mat.uniforms.uLocalT.value = lt;
        lb.mat.uniforms.uTime.value = timeSec;
        if (lt >= 1) lb.mesh.visible = false;
      }

      // Sky Gate Halo above Center Pit (0.34s -> 0.85s)
      if (inst.elapsed >= 0.34 && inst.elapsed < 0.86) {
        inst.skyGateMesh.visible = true;
        inst.skyGateMat.uniforms.uLocalT.value = Math.min(1, (inst.elapsed - 0.34) / 0.52);
        inst.skyGateMat.uniforms.uTime.value = timeSec;
      } else {
        inst.skyGateMesh.visible = false;
      }

      // Vertical Plunge Guide Beam (0.44s -> 0.72s)
      if (inst.elapsed >= 0.44 && inst.elapsed < 0.74) {
        inst.plungeBeamMesh.visible = true;
        inst.plungeBeamMat.uniforms.uLocalT.value = Math.min(1, (inst.elapsed - 0.44) / 0.30);
        inst.plungeBeamMat.uniforms.uTime.value = timeSec;
      } else {
        inst.plungeBeamMesh.visible = false;
      }

      // ACT 2: Colossal Vertical Excalibur Straight Plunge (0.38s -> 2.50s w/ dissolve at 0.68+)
      inst.excaliburMat.uniforms.uProgress.value = uProgress;
      inst.excaliburMat.uniforms.uTime.value = timeSec;
      if (inst.elapsed >= 0.38) {
        inst.excaliburMesh.visible = true;
        if (inst.elapsed < 0.56) {
          // Coil straight up inside the Sky Gate before piercing vertically downward!
          const coilT = (inst.elapsed - 0.38) / 0.18;
          const coilEase = 1 - Math.pow(1 - coilT, 3);
          const coilY = THREE.MathUtils.lerp(inst.cy + 5.2, inst.cy + 6.1, coilEase);
          inst.excaliburMesh.position.set(inst.cx, coilY, inst.cz);
          inst.excaliburMesh.rotation.set(0, 0, 0);
        } else if (inst.elapsed < 0.61) {
          // 50ms 100% STRAIGHT VERTICAL PLUNGE straight into pit center!
          const dropT = (inst.elapsed - 0.56) / 0.05;
          const slamEase = dropT * dropT * dropT * dropT;
          const slamY = THREE.MathUtils.lerp(inst.cy + 6.1, inst.cy + 0.06, slamEase);
          inst.excaliburMesh.position.set(inst.cx, slamY, inst.cz);
          inst.excaliburMesh.rotation.set(0, 0, 0);
        } else {
          // Planted monolithically upright at pit center (tip at cy + 0.06, full blade & crossguard towering up!)
          inst.excaliburMesh.position.set(inst.cx, inst.cy + 0.06, inst.cz);
          inst.excaliburMesh.rotation.set(0, 0, 0);
        }
      } else {
        inst.excaliburMesh.visible = false;
      }

      // Climax Excalibur Impact (0.61s): 0.088s Hit-Stop + B&W Impact Frame!
      if (!inst.guillotineImpactFired && inst.elapsed >= 0.61) {
        inst.guillotineImpactFired = true;
        inst.hitStopTimer = 0.088;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.05, inst.cz);
        this.launchShardBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 6 : 10, 1.55);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ffffff', 0.092);
        this.hooks.onSpeedLines?.(1.0, 0.65);
        this.hooks.onCameraPush?.(0.46, 0.068);
        this.hooks.onFlash?.('#38bdf8', 0.90);
        inst.onImpactCallback?.();
      }

      // Grand Excalibur Crescent Sweep #1 (0.60s -> 1.02s): Fluid Azure-Gold Sakuga Arc
      if (inst.elapsed >= 0.60 && inst.elapsed < 1.02) {
        const wt = Math.min(1, (inst.elapsed - 0.60) / 0.42);
        const wEase = 1 - Math.pow(1 - wt, 4);
        inst.crescentAMesh.visible = true;
        inst.crescentAMesh.scale.setScalar((2.8 + 4.2 * wEase) * as);
        inst.crescentAMesh.rotation.y = THREE.MathUtils.lerp(-2.3, 0.25, wEase);
        inst.crescentAMat.uniforms.uLocalT.value = wt;
        inst.crescentAMat.uniforms.uTime.value = timeSec;
      } else {
        inst.crescentAMesh.visible = false;
      }

      // Symmetrical Sword Choir Crown (0.24s -> end):
      // Forms neat symmetric arc with Mini Gate Ripples -> fires in clean outer-to-inner pairs -> plants in neat ring!
      inst.swordMat.uniforms.uProgress.value = uProgress;
      inst.swordMat.uniforms.uTime.value = timeSec;
      const swordLimit = this.lowQuality ? 4 : SKY_SWORD_COUNT;
      for (let i = 0; i < swordLimit; i++) {
        const sw = inst.skySwords[i];
        // Mini Gate Ripple lifecycle (0.24s -> sw.delay + 0.18s)
        if (inst.elapsed >= 0.24 && inst.elapsed < sw.delay + 0.18) {
          sw.gateMesh.visible = true;
          sw.gateMat.uniforms.uLocalT.value = Math.min(1, (inst.elapsed - 0.24) / (sw.delay + 0.18 - 0.24));
          sw.gateMat.uniforms.uTime.value = timeSec;
        } else {
          sw.gateMesh.visible = false;
        }

        if (inst.elapsed < 0.28) {
          sw.mesh.visible = false;
          continue;
        }
        if (inst.elapsed < sw.delay) {
          sw.mesh.visible = true;
          // Smooth materialize drop-out from gate ripple + unified gentle hover pulse
          const spawnT = Math.min(1, (inst.elapsed - 0.28) / 0.14);
          const spawnEase = 1 - Math.pow(1 - spawnT, 3);
          const hover = Math.sin(timeSec * 6.5) * 0.055 * spawnEase;
          sw.mesh.position.copy(sw.startPos);
          sw.mesh.position.y += (1 - spawnEase) * 0.65 + hover;
          sw.mesh.quaternion.copy(sw.aimQuat);
          continue;
        }
        sw.mesh.visible = true;
        const pt = Math.min(1, (inst.elapsed - sw.delay) / 0.070);
        const railEase = pt * pt * pt;
        sw.mesh.position.lerpVectors(sw.startPos, sw.endPos, railEase);
        sw.mesh.quaternion.copy(sw.aimQuat);
        if (pt >= 1 && !sw.landed) {
          sw.landed = true;
          const flashPt: WorldPoint3 = { x: sw.endPos.x, y: sw.endPos.y, z: sw.endPos.z };
          this.triggerOreFlash(inst, i % ORE_FLASH_COUNT, flashPt, 2.8 * as, i % 2 === 0);
        }
      }

      // ACT 3 (0.94s -> 1.48s): Grand Cross Sweep #2 + 3D Volumetric Light Pillar + Shockwave Crown!
      if (!inst.finaleFired && inst.elapsed >= 0.94) {
        inst.finaleFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.2, inst.cz);
        this.launchShardBurst(inst, this.tmpTargetPos, 28, this.lowQuality ? 4 : 8, 1.48);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 4.2 * as, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.96, 1.0, '#fde047', 0.058);
        this.hooks.onCameraPush?.(0.32, 0.048);
        this.hooks.onFlash?.('#fde047', 0.85);
        this.hooks.onSpeedLines?.(1.0, 0.45);
        inst.onImpactCallback?.();
      }

      if (inst.elapsed >= 0.94 && inst.elapsed < 1.44) {
        const ct = Math.min(1, (inst.elapsed - 0.94) / 0.50);
        const cEase = 1 - Math.pow(1 - ct, 4);
        inst.crescentBMesh.visible = true;
        inst.crescentBMesh.scale.setScalar((3.2 + 4.8 * cEase) * as);
        inst.crescentBMesh.rotation.y = THREE.MathUtils.lerp(2.4, -0.35, cEase);
        inst.crescentBMat.uniforms.uLocalT.value = ct;
        inst.crescentBMat.uniforms.uTime.value = timeSec;

        inst.pillarMesh.visible = true;
        const pScaleR = (0.85 + 0.65 * cEase) * as;
        inst.pillarMesh.scale.set(pScaleR, 0.75 + 0.45 * cEase, pScaleR);
        inst.pillarMat.uniforms.uLocalT.value = ct;
        inst.pillarMat.uniforms.uTime.value = timeSec;

        inst.shockRingMesh.visible = true;
        inst.shockRingMesh.scale.setScalar((3.8 + 8.6 * cEase) * as);
        inst.shockRingMat.uniforms.uLocalT.value = ct;
        inst.shockRingMat.uniforms.uTime.value = timeSec;
      } else {
        inst.crescentBMesh.visible = false;
        inst.pillarMesh.visible = false;
        inst.shockRingMesh.visible = false;
      }

      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 3.2), 4);
        f.mesh.scale.setScalar(f.baseScale * (0.5 + 0.75 * pop));
        f.mat.uniforms.uProgress.value = uProgress;
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      for (let i = 0; i < inst.particles.length; i++) {
        const sp = inst.particles[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 14.5 * dt;
        sp.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.22;
        }
        sp.mesh.position.copy(sp.pos);
        const speedMag = Math.min(2.2, 0.8 + sp.vel.length() * 0.10);
        sp.mesh.scale.set(sp.baseScale * speedMag, sp.baseScale * 0.32, 1);
        sp.mesh.rotation.set(0, Math.atan2(-sp.vel.z, sp.vel.x), Math.atan2(sp.vel.y, Math.hypot(sp.vel.x, sp.vel.z)));
        sp.mat.uniforms.uProgress.value = uProgress;
        sp.mat.uniforms.uLocalLife.value = lp;
        if (lp >= 1) {
          sp.active = false;
          sp.mesh.visible = false;
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
