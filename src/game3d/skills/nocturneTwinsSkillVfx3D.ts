import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const PILLAR_COUNT = 6;
const CHAIN_COUNT = 6;
const ORBIT_CUT_COUNT = 8;
const JUDGMENT_PLANE_COUNT = 14;
const ORE_FLASH_COUNT = 6;
const SHARD_PARTICLE_COUNT = 36;

const NOCTURNE_GLSL = `
  vec2 ncHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float ncHash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float ncVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(ncHash21(i), ncHash21(i + vec2(1.0, 0.0)), f.x),
      mix(ncHash21(i + vec2(0.0, 1.0)), ncHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float ncFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * ncVnoise(p);
      p = rot * p * 2.05 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  float ncRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(ncVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n) * a;
      freq *= 2.15;
      a *= 0.5;
    }
    return v;
  }

  vec3 ncVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = ncHash22(n + g);
        o = 0.5 + 0.42 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = ncHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  float ncSdStar4(vec2 p, float r, float sharpness) {
    vec2 q = abs(p);
    return pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness) - r;
  }

  float ncSdCross(vec2 p, float w, float h, float barY) {
    float vBar = max(abs(p.x) - w, abs(p.y) - h);
    float hBar = max(abs(p.x) - h * 0.68, abs(p.y - barY) - w * 1.05);
    return min(vBar, hBar);
  }
`;

/**
 * Ruined Gothic Stone Pillar & Tombstone Cross Geometry (matches Nocturne Twins pose.webp & idle.webp).
 * Pivot y = 0 at base so pillars erupt straight out of the liquid shadow sea!
 */
function createRuinedGothicPillarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Stepped gothic plinth base
  const plinth = new THREE.CylinderGeometry(0.32, 0.40, 0.28, 6);
  plinth.translate(0, 0.14, 0);
  parts.push(plinth);

  // Fluted broken column shaft (angled fracture top)
  const col = new THREE.CylinderGeometry(0.22, 0.26, 2.05, 8);
  col.translate(0, 1.30, 0);
  parts.push(col);

  // Fractured diagonal crown cap + Gothic Cross finial rising from the ruin
  const cap = new THREE.CylinderGeometry(0.29, 0.23, 0.22, 6);
  cap.rotateZ(0.14);
  cap.translate(0, 2.38, 0);
  parts.push(cap);

  const crossVert = new THREE.BoxGeometry(0.11, 0.78, 0.09);
  crossVert.translate(0, 2.86, 0);
  parts.push(crossVert);

  const crossHoriz = new THREE.BoxGeometry(0.46, 0.10, 0.09);
  crossHoriz.translate(0, 2.98, 0);
  parts.push(crossHoriz);

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted 3D Interlocking Silver Chain Segment Beam (matches attack.webp heavy flying chains).
 * Extends along +Z from 0 to 1.0 so lookAt() stretches chains from pillars to the singularity/ores!
 */
function createSculptedChainBeamGeometry(links = 10): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const step = 1.0 / links;
  for (let i = 0; i < links; i++) {
    const zCenter = (i + 0.5) * step;
    const link = new THREE.TorusGeometry(0.056, 0.019, 6, 12);
    link.scale(0.85, 1.45, 1.0);
    link.rotateX(Math.PI / 2);
    if (i % 2 === 1) {
      link.rotateZ(Math.PI / 2);
    }
    link.translate(0, 0, zCenter);
    parts.push(link);
  }
  const tip = new THREE.ConeGeometry(0.068, 0.20, 4);
  tip.rotateX(Math.PI / 2);
  tip.translate(0, 0, 1.04);
  parts.push(tip);
  return mergeSimpleGeos(parts);
}

/**
 * ACT 0 Shader: Vertex-Displaced Liquid Shadow Sea (Chimera Shadow Garden style).
 * Subdivided plane physically ripples with overlapping Gerstner/sine waves like viscous black ink & silver starlight!
 */
function createLiquidShadowSeaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
    },
    vertexShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      varying float vWaveH;
      void main() {
        vUv = uv;
        vec2 p = (uv - 0.5) * 2.0;
        float r = length(p);
        float swell = 1.0 - smoothstep(0.65, 1.0, r);
        float w1 = sin(p.x * 7.5 + uTime * 4.2) * cos(p.y * 6.5 - uTime * 3.6);
        float w2 = sin(r * 14.0 - uTime * 6.8);
        float h = (w1 * 0.022 + w2 * 0.014) * swell * smoothstep(0.0, 0.14, uProgress);
        vWaveH = w1 * 0.5 + w2 * 0.5;
        vec3 pos = position + vec3(0.0, 0.0, h);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying float vWaveH;
      ${NOCTURNE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float snapIn = 1.0 - pow(1.0 - clamp(uProgress / 0.12, 0.0, 1.0), 4.0);
        float pullIn = smoothstep(0.24, 0.34, uProgress);
        float dissolveT = clamp((uProgress - 0.62) / 0.38, 0.0, 1.0);

        // Flowing dark tar / shadow ocean with FBM domain-warped ink currents pulled toward center
        float swirl = ang + 2.4 / (r + 0.24) - uTime * (1.8 + pullIn * 2.6);
        vec2 warp = vec2(ncFbm(vec2(swirl, r * 3.5)), ncFbm(vec2(swirl + 2.8, r * 4.2)));
        float tarFbm = ncFbm(vec2(swirl * 1.4, r * 4.0) + warp * 1.35);

        float edgeFoam = smoothstep(0.46, 0.54, tarFbm) * (1.0 - smoothstep(0.58, 0.68, tarFbm));
        float waveCrest = smoothstep(0.35, 0.85, vWaveH) * 0.55;
        float starCenter = smoothstep(0.03, 0.0, ncSdStar4(p, 0.22, 0.50)) * (1.0 - pullIn * 0.5);

        vec3 vor = ncVoronoi(p * 5.6, 0.35);
        float severCrack = smoothstep(0.065, 0.008, vor.y) * smoothstep(0.29, 0.34, uProgress);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.78 + tarFbm * 0.28);

        vec3 abyssInk = vec3(0.012, 0.006, 0.028);
        vec3 col = mix(abyssInk, uColor * 1.45, clamp(edgeFoam * 0.85 + waveCrest * 0.45, 0.0, 1.0));
        col += uCoreColor * clamp(starCenter + severCrack * 0.95 + waveCrest * 0.25, 0.0, 1.0);

        float radialFade = smoothstep(0.99, 0.72, r);
        float alpha = clamp(max(radialFade * 0.88, edgeFoam + severCrack) * snapIn * dissolve, 0.0, 0.96);
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
 * ACT 0 -> 2 Shader: Ruined Gothic Pillars Emerging from Liquid Shadow (with Height-Cutoff Drip & Voronoi Shatter!).
 */
function createShadowEruptPillarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
    },
    vertexShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        // Liquid-drip emergence wobble while rising, then violent Voronoi shatter burst at 0.86s (uProgress >= 0.344)
        float shatter = clamp((uProgress - 0.304) / 0.18, 0.0, 1.0);
        float hash = sin(p.y * 9.0 + p.x * 7.0 + p.z * 7.0);
        p += normal * (shatter * 0.42 * (0.4 + 0.6 * abs(hash)));
        p.y += shatter * 0.35 * hash;
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
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
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${NOCTURNE_GLSL}

      void main() {
        float emerge = clamp(uProgress / 0.14, 0.0, 1.0);
        float shatter = clamp((uProgress - 0.304) / 0.22, 0.0, 1.0);
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.38, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.45);
        float inkRim = smoothstep(0.24, 0.12, ndv);

        // Liquid-shadow drip edge + Voronoi shatter dissolve
        float dripNoise = ncFbm(vec2(vLocalPos.x * 5.0 + vLocalPos.z * 5.0, vLocalPos.y * 2.5 - uTime * 3.0));
        float liquidMask = smoothstep(0.15, 0.45, emerge * 1.4 - vLocalPos.y * 0.18 + dripNoise * 0.25);
        vec3 vor = ncVoronoi(vLocalPos.xy * 4.5 + vLocalPos.z * 2.0, 0.25);
        float crackGlow = smoothstep(0.08, 0.01, vor.y) * smoothstep(0.32, 0.38, uProgress);
        float dissolve = smoothstep(shatter - 0.10, shatter + 0.10, vor.z * 0.78 + vor.y * 0.28);
        if (liquidMask < 0.08 || dissolve < 0.08) discard;

        vec3 darkStone = vec3(0.08, 0.06, 0.14);
        vec3 paleStone = vec3(0.38, 0.34, 0.48);
        vec3 col = mix(darkStone, paleStone, cel);
        col = mix(col, uColor * 1.6, clamp(rim * 0.78 + crackGlow * 1.2, 0.0, 1.0));
        col = mix(col, vec3(0.016, 0.008, 0.036), inkRim * 0.85);
        col += uCoreColor * (crackGlow * 1.1 + pow(rim, 2.4) * 0.55);

        gl_FragColor = vec4(col, clamp(liquidMask * dissolve, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * ACT 0.5 -> 2 Shader: Stepped Cel-Shaded Silver Binding Chains Stretching from Pillars.
 */
function createSilverChainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#e2e8f0') },
      uCoreColor: { value: new THREE.Color('#a855f7') },
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
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${NOCTURNE_GLSL}

      void main() {
        float shatter = clamp((uProgress - 0.36) / 0.24, 0.0, 1.0);
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.36, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.4);
        float inkRim = smoothstep(0.24, 0.12, ndv);
        float pulse = smoothstep(0.68, 0.96, sin(vLocalPos.z * 28.0 - uTime * 18.0));

        vec3 vor = ncVoronoi(vLocalPos.xz * 8.0, 0.3);
        float dissolve = smoothstep(shatter - 0.10, shatter + 0.10, vor.z * 0.78 + rim * 0.3);
        if (dissolve < 0.08) discard;

        vec3 col = mix(vec3(0.22, 0.24, 0.34), uColor * 1.3, cel);
        col = mix(col, uCoreColor * 1.75, clamp(pulse * 0.68 + rim * 0.55, 0.0, 1.0));
        col = mix(col, vec3(0.02, 0.01, 0.04), inkRim * 0.9);
        col += vec3(1.0) * pow(rim, 2.2) * 0.78;

        gl_FragColor = vec4(col, clamp(min(1.0, uLocalT * 4.5) * dissolve, 0.0, 0.99));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * ACT 1 Shader: Orbiting Silver-Star Orb & Spiky Black-Violet Void Orb -> Fused Black-Hole Event Horizon!
 */
function createSingularityCoreMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMode: { value: 0.0 }, // 0 = Silver-Star, 1 = Black-Violet Void, 2 = Fused Singularity Event Horizon
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      uniform float uMode;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        if (uMode > 0.5) {
          float spike = sin(p.x * 12.0 + uTime * 18.0) * cos(p.y * 12.0 - uTime * 15.0) * sin(p.z * 12.0);
          p += normal * (spike * (uMode > 1.5 ? 0.12 : 0.08));
        }
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uMode;
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${NOCTURNE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 2.2);
        float plasma = ncFbm(vLocalPos.xy * 3.5 + vec2(uTime * 2.4, -uTime * 1.9));

        vec3 col;
        if (uMode < 0.5) {
          // Silver-Star Mist Orb (Girl)
          col = mix(vec3(0.75, 0.82, 0.96), vec3(1.0, 1.0, 1.0), clamp(plasma + rim, 0.0, 1.0));
          col += vec3(0.74, 0.45, 1.0) * rim * 1.1;
        } else if (uMode < 1.5) {
          // Pitch-Black Spiky Void Orb (Boy)
          col = mix(vec3(0.01, 0.004, 0.02), vec3(0.68, 0.28, 1.0) * 1.65, clamp(rim * 1.35 + smoothstep(0.62, 0.85, plasma) * 0.65, 0.0, 1.0));
        } else {
          // Fused Black-Hole Event Horizon (pitch black core + blinding silver-violet gravitational corona!)
          float horizonRim = pow(max(0.0001, 1.0 - ndv), 2.8);
          col = mix(vec3(0.006, 0.002, 0.015), vec3(0.78, 0.36, 1.0) * 2.0, clamp(horizonRim * 1.65, 0.0, 1.0));
          col += vec3(1.0) * pow(horizonRim, 3.6) * 2.2;
        }
        gl_FragColor = vec4(col, clamp(uOpacity, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * ACT 1 -> 2 Shader: Gravitational Accretion Vortex Ring around the Black-Hole Singularity (AdditiveBlending).
 */
function createAccretionDiscMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#a855f7') },
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
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${NOCTURNE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.24) discard;
        float ang = atan(p.y, p.x);

        float swirl = ang + 3.2 / (r + 0.12) - uTime * 8.5;
        float streak = ncRidged(vec2(swirl * 2.2, r * 6.0));
        float ring = exp(-pow((r - 0.42) * 16.0, 2.0)) + exp(-pow((r - 0.72) * 20.0, 2.0)) * 0.65;
        float mask = clamp((ring + streak * 0.75) * smoothstep(0.99, 0.65, r) * smoothstep(0.24, 0.36, r), 0.0, 1.2);

        vec3 col = mix(uColor * 1.7, uCoreColor * 1.9, clamp(ring * 0.7 + streak * 0.45, 0.0, 1.0));
        float alpha = clamp(mask * uOpacity, 0.0, 1.0);
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
 * ACT 1 & ACT 2 Shader: Razor-Sharp 3D Spatial Cut / Judgment Cut End Plane (Needle Line + Chromatic Split, NOT Crescent!).
 */
function createSpatialCutPlaneMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uSnapFlash: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsSilver: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
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
      uniform float uLocalT;
      uniform float uSnapFlash;
      uniform float uSeed;
      uniform float uIsSilver;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${NOCTURNE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        // Razor straight spatial slash along X with subtle jagged lightning kink
        float jag = (ncVnoise(vec2(p.x * 10.0, uSeed)) - 0.5) * 0.035;
        float distY = abs(p.y + jag);

        float slashDraw = 1.0 - pow(1.0 - clamp(uLocalT * 4.5, 0.0, 1.0), 4.0);
        float xSpan = smoothstep(slashDraw + 0.06, slashDraw - 0.08, abs(p.x)) * smoothstep(1.0, 0.65, abs(p.x));

        float needle = 0.0085 / (distY + 0.003);
        float split = 0.024 * (1.0 - uLocalT * 0.5) + uSnapFlash * 0.035;
        float auraR = 0.026 / (abs(p.y + jag + split) + 0.012);
        float auraB = 0.026 / (abs(p.y + jag - split) + 0.012);

        float dissolveT = clamp((uProgress - 0.62) / 0.38, 0.0, 1.0);
        float n = ncHash21(floor(vec2(vUv.x * 24.0, vUv.y * 8.0) + uSeed));
        float dissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, n * 0.65 + 0.35);

        vec3 tint = mix(uColor, uCoreColor, uIsSilver);
        vec3 col = vec3(auraR, 0.0, 0.0) * (uColor * 1.8)
                 + vec3(0.0, needle, 0.0) * (uCoreColor * 1.9)
                 + vec3(0.0, 0.0, auraB) * vec3(0.75, 0.42, 1.0) * 1.9
                 + tint * (needle * 0.9)
                 + vec3(1.0) * (clamp(needle * 0.65, 0.0, 1.4) + uSnapFlash * 1.25);

        float alpha = clamp((needle + max(auraR, auraB) * 0.65) * xSpan * dissolve, 0.0, 1.0);
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
 * Direct Per-Ore Gothic Cross & 4-Point Star Hit Flash (AdditiveBlending).
 */
function createNocturneHitFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
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
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${NOCTURNE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 3.6, 0.0, 1.0), 3.0);
        float ring = exp(-pow((r - mix(0.14, 0.88, pop)) * 18.0, 2.0));
        float starX = (0.024 / (abs(p.y) + 0.018)) * smoothstep(0.95, 0.05, abs(p.x));
        float starY = (0.024 / (abs(p.x) + 0.018)) * smoothstep(0.95, 0.05, abs(p.y));
        float crossCore = smoothstep(0.04, 0.0, ncSdCross(p * 1.9, 0.12, 0.62, 0.16)) * (1.0 - uLocalT * 0.65);

        float n = ncVnoise(p * 8.0);
        float localDissolve = smoothstep(uLocalT - 0.12, uLocalT + 0.12, n * 0.65 + (1.0 - r) * 0.45);
        float skillDissolve = smoothstep(clamp((uProgress - 0.62) / 0.38, 0.0, 1.0) - 0.1, clamp((uProgress - 0.62) / 0.38, 0.0, 1.0) + 0.1, n);

        float mask = clamp((ring + (starX + starY) * 0.72 + crossCore * 0.85) * smoothstep(0.99, 0.78, r), 0.0, 1.3);
        vec3 col = mix(uColor * 1.65, uCoreColor * 1.75, ring) + vec3(1.0) * clamp(crossCore * 0.9 + (starX + starY) * 0.55, 0.0, 1.0);
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
 * ACT 2 Shockwave Shader: Chromatic Voronoi Reality-Shatter Floor Pulse (0.86s climax).
 */
function createRealityShatterShockwaveMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
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
      ${NOCTURNE_GLSL}

      void main() {
        if (uProgress < 0.30) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float boomT = clamp((uProgress - 0.30) / 0.18, 0.0, 1.0);
        float boomEase = 1.0 - pow(1.0 - boomT, 3.0);
        float dissolveT = clamp((uProgress - 0.62) / 0.38, 0.0, 1.0);

        float waveR = mix(0.08, 0.92, boomEase);
        float ringR = exp(-pow((r - (waveR + 0.028)) * 22.0, 2.0));
        float ringG = exp(-pow((r - waveR) * 24.0, 2.0));
        float ringB = exp(-pow((r - (waveR - 0.028)) * 22.0, 2.0));

        vec3 vor = ncVoronoi(p * 6.0, 0.25);
        float crackWeb = smoothstep(0.075, 0.01, vor.y) * smoothstep(waveR + 0.04, 0.06, r);
        float rays = pow(max(0.0, cos(ang * 16.0 + uTime * 2.0)), 14.0) * smoothstep(waveR + 0.06, 0.14, r);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + ringG * 0.35);

        vec3 col = vec3(ringR, 0.0, 0.0) * (uColor * 1.9)
                 + vec3(0.0, ringG, 0.0) * (uCoreColor * 1.85)
                 + vec3(0.0, 0.0, ringB) * vec3(0.75, 0.40, 1.0) * 1.9
                 + mix(uColor, uCoreColor, 0.5) * (crackWeb * 1.4 + rays * 1.4)
                 + vec3(1.0) * (ringG * 0.8 + crackWeb * 0.55);

        float alpha = clamp((max(max(ringR, ringG), ringB) + crackWeb * 0.95 + rays * 0.85) * smoothstep(0.99, 0.86, r) * dissolve, 0.0, 1.0);
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
 * Layer 5 Shader: Ballistic Black-Rose Petals & Silver 4-Point Star Shards.
 */
function createRosePetalAndStarShardMaterial(isStarShard: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalLife: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsStar: { value: isStarShard ? 1.0 : 0.0 },
      uColor: { value: new THREE.Color(isStarShard ? '#f8fafc' : '#9333ea') },
      uCoreColor: { value: new THREE.Color(isStarShard ? '#c084fc' : '#be185d') },
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
      uniform float uIsStar;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${NOCTURNE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float starD = ncSdStar4(p, 0.62, 0.52);
        vec2 pp = vec2(p.x * 1.15, p.y - 0.14 * p.x * p.x);
        float petalD = length(pp * vec2(1.0, 1.45)) - 0.62;
        float dist = mix(petalD, starD, uIsStar);
        if (dist > 0.06) discard;

        float body = smoothstep(0.06, -0.05, dist);
        float rim = smoothstep(0.08, 0.0, abs(dist)) * body;

        float n = ncHash21(floor(vUv * 8.0 + uSeed));
        float dissolve = smoothstep(uLocalLife - 0.14, uLocalLife + 0.14, n * 0.6 + 0.4);
        float skillDissolve = smoothstep(clamp((uProgress - 0.62) / 0.38, 0.0, 1.0) - 0.1, clamp((uProgress - 0.62) / 0.38, 0.0, 1.0) + 0.1, n * 0.65 + 0.35);

        vec3 roseCol = mix(vec3(0.03, 0.008, 0.04), uCoreColor * 1.25, smoothstep(-0.35, 0.45, p.y));
        roseCol += uColor * rim * 1.35;

        vec3 starCol = mix(uColor * 1.5, uCoreColor * 1.65, rim * 0.85);
        starCol += vec3(1.0) * smoothstep(0.25, 0.0, length(p));

        vec3 col = mix(roseCol, starCol, uIsStar);
        float alpha = clamp(body * dissolve * skillDissolve * (1.0 - smoothstep(0.74, 1.0, uLocalLife)), 0.0, 0.98);
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

interface PillarSlot {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  inwardPitch: number;
  yaw: number;
}

interface ChainSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  origin: THREE.Vector3;
  target: THREE.Vector3;
  targetLen: number;
}

interface SpatialCutSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  beatFired: boolean;
  targetIndex: number;
  lenScale: number;
  widthScale: number;
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
  seed: number;
}

interface NocturneSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  fusionFired: boolean;
  impactFired: boolean;
  secondInvertFired: boolean;
  finalSnapFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  shadowSeaMesh: THREE.Mesh;
  shadowSeaMat: THREE.ShaderMaterial;
  pillars: PillarSlot[];
  pillarMat: THREE.ShaderMaterial;
  chains: ChainSlot[];
  silverOrbMesh: THREE.Mesh;
  silverOrbMat: THREE.ShaderMaterial;
  voidOrbMesh: THREE.Mesh;
  voidOrbMat: THREE.ShaderMaterial;
  singularityMesh: THREE.Mesh;
  singularityMat: THREE.ShaderMaterial;
  accretionMesh: THREE.Mesh;
  accretionMat: THREE.ShaderMaterial;
  orbitCuts: SpatialCutSlot[];
  judgmentPlanes: SpatialCutSlot[];
  oreFlashes: OreFlashSlot[];
  shockwaveMesh: THREE.Mesh;
  shockwaveMat: THREE.ShaderMaterial;
  particles: ShardParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Nocturne Twins — ZERO template reuse!
 * ("Abyssal Shadow-Garden: Twin Singularity & Judgment Sever":
 *  Act 0: Vertex-Displaced Liquid Shadow Sea + 6 Erupting Chain-Wrapped Ruined Pillars
 *  Act 1: Twin Orbiting Silver-Star & Black-Violet Void Orbs firing 8 Spatial Cuts -> Colliding into Black-Hole Singularity Implosion
 *  Act 2 (0.86s): Hit-Stop + Monochrome Reality-Sever Invert + 14-Plane 3D Judgment Cut End Lattice + Pillar Shatter & Rose-Petal/Star Burst
 *  Act 3 (1.24s): Final Spatial-Snap Detonation across all ores!).
 */
export class NocturneTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: NocturneSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const seaGeo = new THREE.PlaneGeometry(1, 1, 32, 32);
    const pillarGeo = createRuinedGothicPillarGeometry();
    const chainGeo = createSculptedChainBeamGeometry(10);
    const orbGeo = new THREE.IcosahedronGeometry(0.55, 2);
    this.sharedGeos.push(planeGeo, seaGeo, pillarGeo, chainGeo, orbGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const shadowSeaMat = createLiquidShadowSeaMaterial();
      const shadowSeaMesh = new THREE.Mesh(seaGeo, shadowSeaMat);
      shadowSeaMesh.rotation.x = -Math.PI / 2;
      root.add(shadowSeaMesh);
      this.allMats.push(shadowSeaMat);

      const pillarMat = createShadowEruptPillarMaterial();
      this.allMats.push(pillarMat);
      const pillars: PillarSlot[] = [];
      for (let i = 0; i < PILLAR_COUNT; i++) {
        const pm = new THREE.Mesh(pillarGeo, pillarMat);
        pm.visible = false;
        root.add(pm);
        pillars.push({ mesh: pm, baseX: 0, baseZ: 0, inwardPitch: 0.16, yaw: 0 });
      }

      const chains: ChainSlot[] = [];
      for (let i = 0; i < CHAIN_COUNT; i++) {
        const cMat = createSilverChainMaterial();
        const cMesh = new THREE.Mesh(chainGeo, cMat);
        cMesh.visible = false;
        root.add(cMesh);
        this.allMats.push(cMat);
        chains.push({
          mesh: cMesh,
          mat: cMat,
          delay: 0.18 + i * 0.036,
          origin: new THREE.Vector3(),
          target: new THREE.Vector3(),
          targetLen: 4.0,
        });
      }

      const silverOrbMat = createSingularityCoreMaterial();
      silverOrbMat.uniforms.uMode.value = 0.0;
      const silverOrbMesh = new THREE.Mesh(orbGeo, silverOrbMat);
      silverOrbMesh.visible = false;
      root.add(silverOrbMesh);

      const voidOrbMat = createSingularityCoreMaterial();
      voidOrbMat.uniforms.uMode.value = 1.0;
      const voidOrbMesh = new THREE.Mesh(orbGeo, voidOrbMat);
      voidOrbMesh.visible = false;
      root.add(voidOrbMesh);

      const singularityMat = createSingularityCoreMaterial();
      singularityMat.uniforms.uMode.value = 2.0;
      const singularityMesh = new THREE.Mesh(orbGeo, singularityMat);
      singularityMesh.visible = false;
      root.add(singularityMesh);
      this.allMats.push(silverOrbMat, voidOrbMat, singularityMat);

      const accretionMat = createAccretionDiscMaterial();
      const accretionMesh = new THREE.Mesh(planeGeo, accretionMat);
      accretionMesh.rotation.set(-0.48, 0, 0);
      accretionMesh.visible = false;
      root.add(accretionMesh);
      this.allMats.push(accretionMat);

      const orbitCuts: SpatialCutSlot[] = [];
      for (let i = 0; i < ORBIT_CUT_COUNT; i++) {
        const mat = createSpatialCutPlaneMaterial();
        mat.uniforms.uSeed.value = (i + 1) * 2.31;
        mat.uniforms.uIsSilver.value = i % 2 === 0 ? 1.0 : 0.0;
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        orbitCuts.push({
          mesh,
          mat,
          delay: 0.16 + i * 0.056,
          beatFired: false,
          targetIndex: i,
          lenScale: 3.4,
          widthScale: 0.72,
        });
      }

      const judgmentPlanes: SpatialCutSlot[] = [];
      for (let i = 0; i < JUDGMENT_PLANE_COUNT; i++) {
        const mat = createSpatialCutPlaneMaterial();
        mat.uniforms.uSeed.value = (i + 1) * 4.17;
        mat.uniforms.uIsSilver.value = i % 2 === 1 ? 1.0 : 0.0;
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        judgmentPlanes.push({
          mesh,
          mat,
          delay: 0.86 + (i % 4) * 0.014,
          beatFired: false,
          targetIndex: i,
          lenScale: 8.4 + (i % 3) * 1.4,
          widthScale: 0.95,
        });
      }

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createNocturneHitFlashMaterial();
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
          life: 0.25,
          baseScale: 3.2,
        });
      }

      const shockwaveMat = createRealityShatterShockwaveMaterial();
      const shockwaveMesh = new THREE.Mesh(planeGeo, shockwaveMat);
      shockwaveMesh.rotation.x = -Math.PI / 2;
      shockwaveMesh.visible = false;
      root.add(shockwaveMesh);
      this.allMats.push(shockwaveMat);

      const particles: ShardParticleSlot[] = [];
      for (let i = 0; i < SHARD_PARTICLE_COUNT; i++) {
        const isStar = i % 2 === 1;
        const pMat = createRosePetalAndStarShardMaterial(isStar);
        pMat.uniforms.uSeed.value = (i + 1) * 1.83;
        const pMesh = new THREE.Mesh(planeGeo, pMat);
        pMesh.visible = false;
        root.add(pMesh);
        this.allMats.push(pMat);
        particles.push({
          mesh: pMesh,
          mat: pMat,
          active: false,
          age: 0,
          life: 0.72,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 0.56,
          seed: i * 1.43,
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        fusionFired: false,
        impactFired: false,
        secondInvertFired: false,
        finalSnapFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        shadowSeaMesh,
        shadowSeaMat,
        pillars,
        pillarMat,
        chains,
        silverOrbMesh,
        silverOrbMat,
        voidOrbMesh,
        voidOrbMat,
        singularityMesh,
        singularityMat,
        accretionMesh,
        accretionMat,
        orbitCuts,
        judgmentPlanes,
        oreFlashes,
        shockwaveMesh,
        shockwaveMat,
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

  private triggerOreFlash(inst: NocturneSkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isSilver: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.25;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.9, pt.z + 0.15);
    f.mesh.scale.setScalar(scale * 0.4);
    f.mat.uniforms.uColor.value.set(isSilver ? '#e2e8f0' : '#a855f7');
    f.mat.uniforms.uCoreColor.value.set(isSilver ? '#f8fafc' : '#e879f9');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchParticleBurst(inst: NocturneSkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.particles.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.particles[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.56 + ((i * 17) % 10) * 0.04;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.16;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 5) * 0.24;
      const spd = (4.8 + ((i * 29) % 10) * 0.62) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (3.4 + ((i * 23) % 10) * 0.56) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseScale = (0.54 + (i % 4) * 0.15) * Math.max(0.75, inst.areaScale);
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
    inst.fusionFired = false;
    inst.impactFired = false;
    inst.secondInvertFired = false;
    inst.finalSnapFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    inst.shadowSeaMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.shadowSeaMesh.scale.setScalar(11.6 * opts.areaScale);
    inst.shadowSeaMat.uniforms.uProgress.value = 0;

    // 6 Ruined Gothic Pillars ringing the Shadow Sea perimeter
    const pillarLimit = this.lowQuality ? 4 : PILLAR_COUNT;
    const singApex = new THREE.Vector3(opts.cx, opts.cy + 2.25 * opts.areaScale, opts.cz);
    for (let i = 0; i < inst.pillars.length; i++) {
      const pSlot = inst.pillars[i];
      if (i >= pillarLimit) {
        pSlot.mesh.visible = false;
        continue;
      }
      const ang = (i / pillarLimit) * Math.PI * 2 + 0.25;
      const rad = 3.35 * opts.areaScale;
      pSlot.baseX = opts.cx + Math.cos(ang) * rad;
      pSlot.baseZ = opts.cz + Math.sin(ang) * rad * 0.76;
      pSlot.yaw = -ang + Math.PI * 0.5;
      pSlot.inwardPitch = 0.14;
      pSlot.mesh.position.set(pSlot.baseX, opts.cy - 2.6, pSlot.baseZ);
      pSlot.mesh.rotation.set(pSlot.inwardPitch, pSlot.yaw, (i % 2 === 0 ? 1 : -1) * 0.08);
      pSlot.mesh.scale.setScalar((0.92 + (i % 2) * 0.18) * Math.max(0.75, opts.areaScale));
      pSlot.mesh.visible = true;
    }

    // 6 Binding Silver Chains stretching from each pillar crown straight to the central Singularity!
    const chainLimit = this.lowQuality ? 4 : CHAIN_COUNT;
    for (let i = 0; i < inst.chains.length; i++) {
      const ch = inst.chains[i];
      if (i >= chainLimit) {
        ch.mesh.visible = false;
        continue;
      }
      const pSlot = inst.pillars[i % pillarLimit];
      ch.origin.set(pSlot.baseX, opts.cy + 2.55 * Math.max(0.75, opts.areaScale), pSlot.baseZ);
      ch.target.copy(singApex);
      ch.targetLen = ch.origin.distanceTo(ch.target);
      ch.delay = 0.18 + i * 0.036;
      ch.mesh.position.copy(ch.origin);
      ch.mesh.lookAt(ch.target);
      ch.mesh.scale.set(1.18 * opts.areaScale, 1.18 * opts.areaScale, 0.01);
      ch.mesh.visible = false;
      ch.mat.uniforms.uProgress.value = 0;
      ch.mat.uniforms.uLocalT.value = 0;
    }

    inst.silverOrbMesh.visible = true;
    inst.silverOrbMesh.scale.setScalar(0.85 * opts.areaScale);
    inst.voidOrbMesh.visible = true;
    inst.voidOrbMesh.scale.setScalar(0.85 * opts.areaScale);

    inst.singularityMesh.position.copy(singApex);
    inst.singularityMesh.scale.setScalar(0.01);
    inst.singularityMesh.visible = false;

    inst.accretionMesh.position.copy(singApex);
    inst.accretionMesh.scale.setScalar(0.01);
    inst.accretionMesh.visible = false;

    const cutLimit = this.lowQuality ? 4 : ORBIT_CUT_COUNT;
    for (let i = 0; i < inst.orbitCuts.length; i++) {
      const slot = inst.orbitCuts[i];
      slot.beatFired = false;
      if (i >= cutLimit) {
        slot.mesh.visible = false;
        continue;
      }
      const tgt = inst.pts[i % inst.pts.length];
      slot.targetIndex = i % inst.pts.length;
      slot.delay = 0.16 + i * 0.056;
      slot.lenScale = (3.4 + (i % 3) * 0.6) * opts.areaScale;
      slot.widthScale = 0.78 * opts.areaScale;
      slot.mesh.position.set(tgt.x, tgt.y + 0.95 + (i % 2) * 0.25, tgt.z + 0.1);
      slot.mesh.rotation.set(-0.32 + (i % 3 - 1) * 0.28, (i % 4 - 1.5) * 0.24, (i % 2 === 0 ? 1 : -1) * (0.48 + (i % 3) * 0.32));
      slot.mesh.scale.set(slot.lenScale, slot.widthScale, 1);
      slot.mesh.visible = false;
      slot.mat.uniforms.uProgress.value = 0;
      slot.mat.uniforms.uLocalT.value = 0;
      slot.mat.uniforms.uSnapFlash.value = 0;
    }

    const jLimit = this.lowQuality ? 7 : JUDGMENT_PLANE_COUNT;
    for (let i = 0; i < inst.judgmentPlanes.length; i++) {
      const jp = inst.judgmentPlanes[i];
      if (i >= jLimit) {
        jp.mesh.visible = false;
        continue;
      }
      const angZ = (i / jLimit) * Math.PI * 1.85 + 0.22;
      const angY = (i % 5 - 2) * 0.42;
      const offX = Math.cos(i * 2.1) * 1.45 * opts.areaScale;
      const offY = 1.15 + (i % 4) * 0.55;
      const offZ = Math.sin(i * 1.7) * 1.15 * opts.areaScale;
      jp.delay = 0.76 + (i % 4) * 0.014;
      jp.lenScale = (8.6 + (i % 3) * 1.6) * opts.areaScale;
      jp.widthScale = (0.85 + (i % 2) * 0.25) * opts.areaScale;
      jp.mesh.position.set(opts.cx + offX, opts.cy + offY, opts.cz + offZ);
      jp.mesh.rotation.set(-0.28 + (i % 3 - 1) * 0.25, angY, angZ);
      jp.mesh.scale.set(jp.lenScale, jp.widthScale, 1);
      jp.mesh.visible = false;
      jp.mat.uniforms.uProgress.value = 0;
      jp.mat.uniforms.uLocalT.value = 0;
      jp.mat.uniforms.uSnapFlash.value = 0;
    }

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    inst.shockwaveMesh.position.set(opts.cx, opts.cy + 0.20, opts.cz);
    inst.shockwaveMesh.scale.setScalar(11.8 * opts.areaScale);
    inst.shockwaveMesh.visible = false;

    for (let i = 0; i < inst.particles.length; i++) {
      inst.particles[i].active = false;
      inst.particles[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.88, '#04010c', 1.42);
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
      const as = inst.areaScale;

      // Update Liquid Shadow Sea
      inst.shadowSeaMat.uniforms.uProgress.value = uProgress;
      inst.shadowSeaMat.uniforms.uTime.value = timeSec;

      // ACT 0 (0.00s -> 0.26s): 6 Ruined Pillars Erupting from Liquid Shadow
      const riseT = Math.min(1, inst.elapsed / 0.26);
      const riseEase = 1 - Math.pow(1 - riseT, 3);
      inst.pillarMat.uniforms.uProgress.value = uProgress;
      inst.pillarMat.uniforms.uTime.value = timeSec;
      const pillarLimit = this.lowQuality ? 4 : PILLAR_COUNT;
      for (let i = 0; i < pillarLimit; i++) {
        const pSlot = inst.pillars[i];
        const yOff = THREE.MathUtils.lerp(-2.6, 0.0, riseEase);
        pSlot.mesh.position.set(pSlot.baseX, inst.cy + yOff, pSlot.baseZ);
        if (uProgress >= 0.32) {
          pSlot.mesh.visible = false;
        }
      }

      // ACT 0.5 (0.18s -> 0.86s): Silver Binding Chains Whipping Inward
      const chainLimit = this.lowQuality ? 4 : CHAIN_COUNT;
      for (let i = 0; i < chainLimit; i++) {
        const ch = inst.chains[i];
        if (inst.elapsed < ch.delay) continue;
        ch.mesh.visible = true;
        const lt = Math.min(1, (inst.elapsed - ch.delay) / 0.16);
        const whipEase = 1 - Math.pow(1 - lt, 3);
        ch.mesh.scale.set(1.18 * as, 1.18 * as, Math.max(0.05, ch.targetLen * whipEase));
        ch.mat.uniforms.uProgress.value = uProgress;
        ch.mat.uniforms.uTime.value = timeSec;
        ch.mat.uniforms.uLocalT.value = lt;
      }

      // ACT 1 (0.00s -> 0.54s): Twin Silver-Star & Black-Violet Void Orbs Spiraling Inward to Fuse!
      const singX = inst.cx;
      const singY = inst.cy + 2.25 * as;
      const singZ = inst.cz;
      if (inst.elapsed < 0.54) {
        const ot = inst.elapsed / 0.54;
        const orbitR = THREE.MathUtils.lerp(3.2 * as, 0.0, ot * ot);
        const ang = ot * Math.PI * 3.4;
        inst.silverOrbMesh.position.set(singX - Math.cos(ang) * orbitR, singY + Math.sin(ang * 0.5) * 0.45, singZ - Math.sin(ang) * orbitR * 0.65);
        inst.voidOrbMesh.position.set(singX + Math.cos(ang) * orbitR, singY - Math.sin(ang * 0.5) * 0.45, singZ + Math.sin(ang) * orbitR * 0.65);
        inst.silverOrbMat.uniforms.uTime.value = timeSec;
        inst.voidOrbMat.uniforms.uTime.value = timeSec;
      } else {
        inst.silverOrbMesh.visible = false;
        inst.voidOrbMesh.visible = false;
      }

      // Orbiting 3D Spatial Cuts during Act 1 (0.14s -> 0.54s)
      const cutLimit = this.lowQuality ? 4 : ORBIT_CUT_COUNT;
      for (let i = 0; i < cutLimit; i++) {
        const slot = inst.orbitCuts[i];
        if (inst.elapsed < slot.delay) continue;
        slot.mesh.visible = true;
        if (!slot.beatFired) {
          slot.beatFired = true;
          const pt = inst.pts[slot.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.1 * as, i % 2 === 0);
          this.tmpTargetPos.set(pt.x, pt.y + 0.9, pt.z);
          this.launchParticleBurst(inst, this.tmpTargetPos, i % 12, 1, 0.8);
          inst.onSlashBeatCallback?.(i, pt);
        }
        const lt = Math.min(1, (inst.elapsed - slot.delay) / 0.22);
        slot.mat.uniforms.uProgress.value = uProgress;
        slot.mat.uniforms.uLocalT.value = lt;
      }

      // Singularity Fusion & Gravitational Implosion (0.54s -> 0.76s)
      if (!inst.fusionFired && inst.elapsed >= 0.54) {
        inst.fusionFired = true;
        this.hooks.onCameraPush?.(-0.22, -0.02); // Pull back slightly as singularity charges
      }
      if (inst.elapsed >= 0.54 && inst.elapsed < 0.76) {
        const ft = (inst.elapsed - 0.54) / 0.22;
        // Swell to massive black-hole core (ft < 0.72), then violently compress to pinprick right before detonation!
        const swell = ft < 0.72 ? 1.0 + Math.sin((ft / 0.72) * Math.PI * 0.5) * 1.45 : Math.max(0.08, (1.0 - (ft - 0.72) / 0.28) * 2.45);
        inst.singularityMesh.visible = true;
        inst.singularityMesh.scale.setScalar(swell * Math.max(0.75, as));
        inst.singularityMesh.rotation.y += 4.5 * dt;
        inst.singularityMat.uniforms.uTime.value = timeSec;
        inst.singularityMat.uniforms.uOpacity.value = 1.0;

        inst.accretionMesh.visible = true;
        inst.accretionMesh.scale.setScalar(swell * 4.4 * Math.max(0.75, as));
        inst.accretionMesh.rotation.z -= 5.8 * dt;
        inst.accretionMat.uniforms.uTime.value = timeSec;
        inst.accretionMat.uniforms.uOpacity.value = 1.0;
      } else if (inst.elapsed >= 0.76) {
        inst.singularityMesh.visible = false;
        inst.accretionMesh.visible = false;
      }

      // ACT 2 CLIMAX (0.76s): Hit-Stop + Monochrome Reality-Sever Invert + 14-Plane Judgment Cut End Cage!
      if (!inst.impactFired && inst.elapsed >= 0.76) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.068;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.45, inst.cz);
        this.launchParticleBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 10 : 18, 1.46);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#f8fafc', 0.085);
        this.hooks.onSpeedLines?.(1.0, 0.62);
        this.hooks.onCameraPush?.(0.42, 0.062);
        this.hooks.onFlash?.('#e9d5ff', 0.72);
        inst.onImpactCallback?.();
      }

      if (!inst.secondInvertFired && inst.elapsed >= 0.88) {
        inst.secondInvertFired = true;
        this.hooks.onImpactFrame?.(0.95, 1.0, '#a855f7', 0.052);
      }

      // Update 14-Plane 3D Judgment Cut End Lattice
      const jLimit = this.lowQuality ? 7 : JUDGMENT_PLANE_COUNT;
      const snapFlashAmt = inst.elapsed >= 1.16 ? Math.max(0, 1 - (inst.elapsed - 1.16) / 0.22) : 0;
      for (let i = 0; i < jLimit; i++) {
        const jp = inst.judgmentPlanes[i];
        if (inst.elapsed < jp.delay) continue;
        jp.mesh.visible = true;
        const lt = Math.min(1, (inst.elapsed - jp.delay) / 0.20);
        jp.mat.uniforms.uProgress.value = uProgress;
        jp.mat.uniforms.uLocalT.value = lt;
        jp.mat.uniforms.uSnapFlash.value = snapFlashAmt;
      }

      if (uProgress >= 0.304) {
        inst.shockwaveMesh.visible = true;
        inst.shockwaveMat.uniforms.uProgress.value = uProgress;
        inst.shockwaveMat.uniforms.uTime.value = timeSec;
      }

      // ACT 3 (1.16s): Final Spatial-Snap Detonation across all ores!
      if (!inst.finalSnapFired && inst.elapsed >= 1.16) {
        inst.finalSnapFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.1, inst.cz);
        this.launchParticleBurst(inst, this.tmpTargetPos, 30, this.lowQuality ? 4 : 6, 1.32);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 3.9 * as, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.88, 0.0, '#f8fafc', 0.048);
        this.hooks.onSpeedLines?.(0.95, 0.36);
        inst.onImpactCallback?.();
      }

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

      for (let i = 0; i < inst.particles.length; i++) {
        const sp = inst.particles[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 7.8 * dt;
        sp.vel.x += Math.sin(timeSec * 11.0 + sp.seed) * 1.8 * dt;
        sp.vel.multiplyScalar(Math.pow(0.93, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.36;
        }
        sp.mesh.position.copy(sp.pos);
        sp.mesh.scale.setScalar(sp.baseScale);
        sp.mesh.rotation.set(
          -0.30 + Math.sin(timeSec * 8.5 + sp.seed) * 0.45,
          Math.atan2(sp.vel.x, sp.vel.z),
          timeSec * 4.5 * (i % 2 === 0 ? 1 : -1)
        );
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
