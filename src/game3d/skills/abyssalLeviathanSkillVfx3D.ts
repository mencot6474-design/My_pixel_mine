import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const TIDAL_WAVE_COUNT = 4;
const DRAGON_COUNT = 2;
const CROWN_FIN_COUNT = 10;
const WATER_PEARL_COUNT = 8;

const LEVIATHAN_NOISE_GLSL = `
  float lvHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }

  float lvVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(lvHash21(i), lvHash21(i + vec2(1.0, 0.0)), f.x),
      mix(lvHash21(i + vec2(0.0, 1.0)), lvHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float lvFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += lvVnoise(p) * a;
      p = rot * p * 2.07 + vec2(1.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  float lvRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 2; i++) {
      float n = 1.0 - abs(lvVnoise(p) * 2.0 - 1.0);
      v += (n * n * n) * a;
      p *= 2.15;
      a *= 0.5;
    }
    return v;
  }

  float lvVoronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float minD = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = vec2(lvHash21(n + g), lvHash21(n + g + vec2(17.3, 41.9)));
        float d = length(g + o - f);
        minD = min(minD, d);
      }
    }
    return minD;
  }
`;

/** Back-attachment Halo Disc for Abyssal Leviathan: cel-shaded abyssal whirlpool & foaming rings. */
export function createLeviathanMaelstromHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      varying vec2 vUv;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float twist = 3.2 / (r + 0.28) - uTime * 2.4;
        float cs = cos(twist);
        float sn = sin(twist);
        vec2 rp = mat2(cs, -sn, sn, cs) * (p * 2.1);
        float ridge = lvRidged(rp + vec2(0.0, r * 1.8 - uTime * 0.9));
        float celBand = smoothstep(0.38, 0.44, ridge) * 0.65 + smoothstep(0.68, 0.74, ridge) * 0.35;

        float crestWave = 0.81 + 0.055 * sin(ang * 7.0 - uTime * 3.2);
        float outerCrest = smoothstep(0.028, 0.008, abs(r - crestWave));
        float innerRing = smoothstep(0.020, 0.006, abs(r - 0.50));

        vec3 abyssTeal = vec3(0.02, 0.08, 0.18);
        vec3 hydroCyan = vec3(0.06, 0.84, 0.96);
        vec3 foamWhite = vec3(0.92, 0.99, 1.0);

        vec3 col = mix(abyssTeal, hydroCyan, clamp(celBand + innerRing * 0.7, 0.0, 1.0));
        col = mix(col, foamWhite, clamp(outerCrest * 0.92 + smoothstep(0.76, 0.84, ridge) * 0.65, 0.0, 1.0));

        float mask = clamp(outerCrest + innerRing + celBand * smoothstep(0.95, 0.22, r) * 0.85, 0.0, 1.0);
        float alpha = clamp(mask * smoothstep(1.0, 0.84, r) * uOpacity, 0.0, 0.96);
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

/** Back-attachment Hydro Fin / Claw Crest shader (NormalBlending, depthWrite: true). */
export function createLeviathanHydroClawShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.45);
        float flow = lvVnoise(vec2(vLocalPos.x * 6.5, vLocalPos.y * 5.2 - uTime * 4.8));
        float celStep = smoothstep(0.36, 0.42, rim * 0.72 + flow * 0.38);

        vec3 obsidianBlue = vec3(0.03, 0.09, 0.18);
        vec3 cyanWave = vec3(0.06, 0.84, 0.96);
        vec3 foam = vec3(0.92, 0.99, 1.0);

        vec3 col = mix(obsidianBlue, cyanWave, clamp(0.24 + celStep * 0.85, 0.0, 1.0));
        col = mix(col, foam, clamp(smoothstep(0.68, 0.76, rim) * 0.85 + smoothstep(0.62, 1.0, vLocalPos.y) * 0.45, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(0.96 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sculpted Curved Hydro-Fin Crest Geometry for Abyssal Leviathan back & splash crown. */
export function createLeviathanHydroFinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, -0.15);
  shape.lineTo(0.11, 0.04);
  shape.lineTo(0.18, 0.42);
  shape.lineTo(0.06, 0.92);
  shape.lineTo(-0.08, 1.18);
  shape.lineTo(-0.06, 0.65);
  shape.lineTo(-0.12, 0.22);
  shape.closePath();

  const fin = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  fin.translate(0, 0, -0.018);

  const coreGem = new THREE.OctahedronGeometry(0.065, 0);
  coreGem.scale(0.8, 1.4, 0.6);
  coreGem.translate(0.01, 0.12, 0);

  return mergeSimpleGeos([fin, coreGem]);
}

/**
 * Custom 3D Cambered Jagged Hydro-Fang Crescent Geometry matching `attack.webp`:
 * sweeping curved crescent with serrated outward hydro spikes & arched camber.
 */
function createLeviathanHydroCrescentGeometry(
  innerR = 0.34,
  outerR = 1.05,
  sweepRad = Math.PI * 1.24,
  segments = 56
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 5;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const widthEnv = Math.pow(Math.sin(u * Math.PI), 0.48);
    // Jagged liquid wave fangs peeling off the outer edge
    const spikeRaw = Math.abs(Math.sin(u * Math.PI * 11.0));
    const spikeTooth = Math.pow(spikeRaw, 2.2) * 0.22 * widthEnv;
    const curInner = outerR - (outerR - innerR) * widthEnv;
    const curOuter = outerR + spikeTooth;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (curOuter - curInner) * v;
      const camber = Math.sin(v * Math.PI) * 0.19 * widthEnv;
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
 * Custom Helical 3D Water Dragon Serpent Ribbon (`Constant Flux`):
 * Coils in 1.65 spiral turns from wide perimeter down into center target, ending in a sharp Dragon Head crest.
 */
function createLeviathanWaterDragonGeometry(mirrorSign = 1): THREE.BufferGeometry {
  const segs = 72;
  const rows = 5;
  const cols = segs + 1;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const theta = mirrorSign * (u * Math.PI * 3.15 + (mirrorSign > 0 ? 0 : Math.PI));
    const rad = (1 - u * 0.84) * 3.9 + Math.sin(u * Math.PI * 3.0) * 0.35;
    const height = Math.sin(u * Math.PI) * 3.25 + (1 - u) * 0.35 + 0.25;

    const cx = Math.cos(theta) * rad;
    const cz = Math.sin(theta) * rad * 0.84;

    // Dragon body width flares strongly near the head (u ~ 0.86) and tapers into jaws at u = 1
    const headFlare = u > 0.78 ? 1.0 + Math.sin(((u - 0.78) / 0.22) * Math.PI) * 1.15 : 1.0;
    const bodyWidth = (0.18 + Math.sin(u * Math.PI) * 0.36) * headFlare * (1.0 - Math.pow(Math.max(0, (u - 0.92) / 0.08), 1.4) * 0.85);

    const outX = Math.cos(theta);
    const outZ = Math.sin(theta);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const offset = (v - 0.5) * 2.0;
      const arch = (1.0 - offset * offset) * bodyWidth * 0.75;
      const idx = i * rows + j;
      positions[idx * 3] = cx + outX * offset * bodyWidth * 0.65;
      positions[idx * 3 + 1] = height + offset * bodyWidth * 0.58 + arch * 0.35;
      positions[idx * 3 + 2] = cz + outZ * offset * bodyWidth * 0.65;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let i = 0; i < segs; i++) {
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
 * Layer 1 Shader: Dead Calm Cel-Shaded Whirlpool + Sawtooth Tidal Shockwaves + Voronoi Dissolve.
 */
function createLeviathanAbyssFloorShaderMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
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
      varying vec2 vUv;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        // Phase 1 (0.0-0.28): Seamless Cartesian spiral rotation for Dead-Calm Whirlpool
        float twist = 3.1 / (r + 0.18) - uTime * 3.8;
        float cs = cos(twist);
        float sn = sin(twist);
        vec2 swirlP = mat2(cs, -sn, sn, cs) * (p * 2.6);
        float spiralArm = 0.5 + 0.5 * sin(atan(swirlP.y, swirlP.x) * 3.0);
        float caustic = lvVoronoi(swirlP * 1.35 + vec2(0.0, -uTime * 1.4));
        float ridge = lvRidged(swirlP * 1.05 + vec2(r * 1.4, -uTime * 1.1));
        float celWater = smoothstep(0.42, 0.48, ridge * 0.72 + (1.0 - caustic) * 0.28 + spiralArm * 0.22);

        // Phase 2 (0.28-0.65): Integer-harmonic jagged sawtooth tidal shockwaves (0 seam)
        float waveT1 = clamp((uProgress - 0.28) / 0.24, 0.0, 1.0);
        float waveT2 = clamp((uProgress - 0.42) / 0.26, 0.0, 1.0);
        float tooth1 = abs(asin(sin(ang * 8.0 - uTime * 3.0))) / 1.5708;
        float tooth2 = abs(asin(sin(ang * 10.0 + uTime * 2.5))) / 1.5708;
        float sawR1 = (0.14 + waveT1 * 0.80) + 0.055 * tooth1;
        float sawR2 = (0.10 + waveT2 * 0.85) + 0.045 * tooth2;
        float shock1 = exp(-pow((r - sawR1) * 18.0, 2.0)) * (1.0 - smoothstep(0.55, 1.0, waveT1));
        float shock2 = exp(-pow((r - sawR2) * 16.0, 2.0)) * (1.0 - smoothstep(0.55, 1.0, waveT2));

        // Phase 3 (0.60-1.0): Voronoi bubble shatter dissolve
        float dissolveT = clamp((uProgress - 0.60) / 0.40, 0.0, 1.0);
        float dissolveMask = smoothstep(dissolveT - 0.08, dissolveT + 0.08, caustic + shock1 * 0.35);

        vec3 abyssDark = vec3(0.015, 0.05, 0.14);
        vec3 deepOcean = vec3(0.03, 0.28, 0.62);
        vec3 cyanGlow = vec3(0.06, 0.86, 0.98) * 1.35;
        vec3 foamWhite = vec3(0.95, 1.0, 1.0) * 1.55;

        vec3 col = mix(abyssDark, deepOcean, smoothstep(0.18, 0.55, ridge));
        col = mix(col, cyanGlow, celWater);
        col = mix(col, foamWhite, clamp(shock1 * 0.95 + shock2 * 0.85 + smoothstep(0.74, 0.80, ridge) * 0.55, 0.0, 1.0));

        float envIn = smoothstep(0.0, 0.06, uProgress);
        float radialFade = smoothstep(1.0, 0.72, r);
        float baseAlpha = (0.34 + celWater * 0.48 + shock1 * 0.92 + shock2 * 0.78);
        float alpha = clamp(baseAlpha * envIn * radialFade * dissolveMask, 0.0, 0.94);
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
 * Layer 2 Shader: High-Contrast Cel-Shaded Anime Hydro-Fang Crescent Slash (`NormalBlending` ink depth + white foam crest).
 */
function createLeviathanAnimeWaterSlashMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uLocalT: { value: 0 },
      uColor: { value: new THREE.Color('#06b6d4') },
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
      uniform vec3 uColor;
      varying vec2 vUv;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        float head = clamp(uLocalT * 2.45, 0.0, 1.35);
        float tail = max(0.0, (uLocalT - 0.14) * 1.48);
        float streak = lvVnoise(vec2(vUv.x * 18.0 - uTime * 9.0, vUv.y * 9.0));
        float vor = lvVoronoi(vec2(vUv.x * 10.0 - uTime * 4.5, vUv.y * 4.5));

        float headMask = smoothstep(head + 0.02, head - 0.08, vUv.x);
        float tailMask = smoothstep(tail - 0.08 + streak * 0.16, tail + 0.04 + streak * 0.16, vUv.x);
        float widthMask = smoothstep(0.04, 0.18, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
        float fadeOut = 1.0 - smoothstep(0.68, 1.0, uLocalT);
        float alpha = headMask * tailMask * widthMask * fadeOut;
        if (alpha < 0.02) discard;

        // Quantized Ufotable-style 3-band anime water ramp: ink-navy -> neon hydro -> foam edge
        float bandCoord = vUv.y + (streak - 0.5) * 0.16 + (0.5 - vor) * 0.12;
        float midBand = smoothstep(0.28, 0.34, bandCoord);
        float foamBand = smoothstep(0.66, 0.72, bandCoord);
        float speedLine = smoothstep(0.68, 0.78, sin(vUv.y * 38.0 + streak * 5.0));

        vec3 inkNavy = vec3(0.02, 0.07, 0.18);
        vec3 hydroGlow = uColor * 1.48;
        vec3 foamWhite = vec3(0.96, 1.0, 1.0) * 1.72;

        vec3 col = mix(inkNavy, hydroGlow, midBand);
        col = mix(col, foamWhite, clamp(foamBand + speedLine * 0.45, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(alpha * 1.25, 0.0, 0.97));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Layer 3 Shader: Twin Coiling Constant-Flux Water Dragon Serpents racing along the helix into center impact.
 */
function createLeviathanWaterDragonShaderMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        // Serpent travels rapidly from tail (u=0) to dragon head (u=1) during uProgress 0.05..0.34
        float swimT = clamp((uProgress - 0.04) / 0.28, 0.0, 1.0);
        float headPos = swimT * 1.18;
        float tailPos = max(0.0, (swimT - 0.42) * 1.65);

        float headCut = smoothstep(headPos + 0.02, headPos - 0.06, vUv.x);
        float tailCut = smoothstep(tailPos - 0.08, tailPos + 0.05, vUv.x);
        float vanishAfter = 1.0 - smoothstep(0.32, 0.44, uProgress);
        float bodyMask = headCut * tailCut * vanishAfter;
        if (bodyMask < 0.02) discard;

        // Stylized Dragon Scale & Spine streaks along vUv.x
        float scaleCell = lvVoronoi(vec2(vUv.x * 22.0 - uTime * 6.0, vUv.y * 5.0));
        float spine = smoothstep(0.24, 0.04, abs(vUv.y - 0.5));
        float headMask = smoothstep(0.82, 0.95, vUv.x);
        float fres = pow(1.0 - abs(vNormal.z), 1.4);

        vec3 abyssNavy = vec3(0.02, 0.12, 0.28);
        vec3 dragonCyan = vec3(0.08, 0.88, 0.98) * 1.42;
        vec3 dragonFoam = vec3(0.96, 1.0, 1.0) * 1.68;

        vec3 col = mix(abyssNavy, dragonCyan, smoothstep(0.26, 0.34, 1.0 - scaleCell * 0.65 + fres * 0.4));
        col = mix(col, dragonFoam, clamp(spine * 0.72 + headMask * 0.68 + fres * 0.45, 0.0, 1.0));

        float edgeSoft = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float alpha = clamp(bodyMask * (0.65 + edgeSoft * 0.35), 0.0, 0.96);
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
 * Layer 4 Shader: Vertex-Flared Helical Ocean Geyser Spire (replaces plain cylinder with roaring anime water plume).
 */
function createLeviathanGeyserSpireShaderMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uProgress;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        float ang = uv.x * 6.2831853;
        float heightFrac = uv.y;
        float flare = 0.85 + pow(heightFrac, 1.45) * 1.15;
        float flute = 0.28 * sin(ang * 7.0 + heightFrac * 6.0 - uTime * 11.5) * (0.25 + heightFrac);
        float whip = 0.16 * cos(ang * 3.0 - uTime * 8.0) * heightFrac;
        vec3 displaced = vec3(
          position.x * flare + cos(ang) * (flute + whip),
          position.y,
          position.z * flare + sin(ang) * (flute + whip)
        );
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      ${LEVIATHAN_NOISE_GLSL}

      void main() {
        float fres = pow(1.0 - abs(vNormal.z), 1.4);
        float ang = vUv.x * 6.2831853;
        vec2 cylCoord = vec2(cos(ang) * 2.1, sin(ang) * 2.1);
        float streak = lvRidged(vec2(cylCoord.x + cylCoord.y * 0.6, vUv.y * 4.5 - uTime * 7.5));
        float helix = 0.5 + 0.5 * sin(ang * 4.0 + vUv.y * 9.0 - uTime * 10.5);
        float celBand = smoothstep(0.42, 0.48, streak * 0.78 + helix * 0.36);

        // Voronoi droplet break-up at the end of skill & jagged top crown fade
        float endFadeT = clamp((uProgress - 0.62) / 0.38, 0.0, 1.0);
        float vor = lvVoronoi(vec2(cylCoord.x * 1.8 - uTime * 1.2, vUv.y * 7.5 - uTime * 4.2));
        float dissolve = smoothstep(endFadeT - 0.1, endFadeT + 0.1, vor + fres * 0.2);

        vec3 deepBlue = vec3(0.03, 0.24, 0.56);
        vec3 hydroCyan = vec3(0.08, 0.88, 0.99) * 1.45;
        vec3 whiteFoam = vec3(0.96, 1.0, 1.0) * 1.65;

        vec3 col = mix(deepBlue, hydroCyan, celBand);
        col = mix(col, whiteFoam, clamp(fres * 0.75 + smoothstep(0.72, 0.80, streak) * 0.65, 0.0, 1.0));

        float topJagged = 0.52 + 0.28 * sin(ang * 5.0 - uTime * 6.0) * 0.5 + streak * 0.22;
        float vFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(topJagged, topJagged - 0.28, vUv.y);
        float alpha = clamp((0.36 + celBand * 0.52 + fres * 0.45) * vFade * dissolve, 0.0, 0.94);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 5 Shader: Levitating Water Pearls / Splash Orbs (`Neuvillette`-inspired droplet tension).
 */
function createLeviathanWaterPearlShaderMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float fres = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 1.6);
        float rim = smoothstep(0.32, 0.42, fres);
        vec3 core = vec3(0.06, 0.72, 0.94);
        vec3 rimGlow = vec3(0.95, 1.0, 1.0) * 1.65;
        vec3 col = mix(core, rimGlow, rim);
        float alpha = clamp((0.45 + rim * 0.55) * uOpacity, 0.0, 0.96);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
}

interface TidalWaveSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  baseScale: number;
  spinSpeed: number;
}

interface CrownFinSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  maxRadius: number;
  tiltAngle: number;
  baseScale: number;
}

interface WaterPearlSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  orbitR: number;
  hoverY: number;
}

interface LeviathanSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  undertowFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  floorMesh: THREE.Mesh;
  floorMat: THREE.ShaderMaterial;
  waves: TidalWaveSlot[];
  dragons: ReadonlyArray<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial }>;
  crownFins: CrownFinSlot[];
  pearls: WaterPearlSlot[];
  geyserMesh: THREE.Mesh;
  geyserMat: THREE.ShaderMaterial;
  onImpactCallback: (() => void) | null;
}

/**
 * Rebuilt 2.5s Anime Sakuga Skill Pool for Abyssal Leviathan
 * ("Constant Flux: Sea-Dragon Deluge" — Dead-Calm Cel Whirlpool + Levitating Water Pearls ->
 *  4 Jagged Hydro-Fang Crescent Slashes & Twin Coiling Water-Dragon Serpents ->
 *  Hit-Stop Impact Frame + Vertex-Flared Roaring Hydro Geyser & 10-Spike 3D Splash Crown ->
 *  Secondary Abyssal Undertow Burst & Voronoi Bubble Dissolve).
 */
export class AbyssalLeviathanSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: LeviathanSkillInstance[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const waveGeo = createLeviathanHydroCrescentGeometry(0.34, 1.05, Math.PI * 1.24, 56);
    const dragonGeoA = createLeviathanWaterDragonGeometry(1);
    const dragonGeoB = createLeviathanWaterDragonGeometry(-1);
    const finGeo = createLeviathanHydroFinGeometry();
    const pearlGeo = new THREE.OctahedronGeometry(0.18, 1);
    const geyserGeo = new THREE.CylinderGeometry(2.1, 0.58, 9.2, 28, 18, true);
    geyserGeo.translate(0, 4.6, 0);
    this.sharedGeos.push(planeGeo, waveGeo, dragonGeoA, dragonGeoB, finGeo, pearlGeo, geyserGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createLeviathanAbyssFloorShaderMat();
      const floorMesh = new THREE.Mesh(planeGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      root.add(floorMesh);

      const waves: TidalWaveSlot[] = [];
      for (let i = 0; i < TIDAL_WAVE_COUNT; i++) {
        const mat = createLeviathanAnimeWaterSlashMat();
        const mesh = new THREE.Mesh(waveGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        waves.push({ mesh, mat, delay: 0.14 + i * 0.12, baseScale: 5.5, spinSpeed: 5.2 });
      }

      const dragonGeos = [dragonGeoA, dragonGeoB];
      const dragons: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial }> = [];
      for (let i = 0; i < DRAGON_COUNT; i++) {
        const mat = createLeviathanWaterDragonShaderMat();
        const mesh = new THREE.Mesh(dragonGeos[i], mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        dragons.push({ mesh, mat });
      }

      const crownFins: CrownFinSlot[] = [];
      for (let i = 0; i < CROWN_FIN_COUNT; i++) {
        const mat = createLeviathanHydroClawShaderMaterial();
        const mesh = new THREE.Mesh(finGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        crownFins.push({
          mesh,
          mat,
          angle: (i / CROWN_FIN_COUNT) * Math.PI * 2,
          maxRadius: 2.9,
          tiltAngle: 0.65,
          baseScale: 1.5,
        });
      }

      const pearls: WaterPearlSlot[] = [];
      for (let i = 0; i < WATER_PEARL_COUNT; i++) {
        const mat = createLeviathanWaterPearlShaderMat();
        const mesh = new THREE.Mesh(pearlGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        pearls.push({
          mesh,
          mat,
          angle: (i / WATER_PEARL_COUNT) * Math.PI * 2,
          orbitR: 3.2,
          hoverY: 1.2,
        });
      }

      const geyserMat = createLeviathanGeyserSpireShaderMat();
      const geyserMesh = new THREE.Mesh(geyserGeo, geyserMat);
      geyserMesh.visible = false;
      root.add(geyserMesh);

      this.allMats.push(floorMat, geyserMat);

      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        impactFired: false,
        undertowFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        floorMesh,
        floorMat,
        waves,
        dragons,
        crownFins,
        pearls,
        geyserMesh,
        geyserMat,
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

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts: readonly WorldPoint3[];
    onImpact?: () => void;
  }): void {
    const inst = this.instances.find((s) => !s.active) ?? this.instances[0];
    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.impactFired = false;
    inst.undertowFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    const as = opts.areaScale;
    const safeAs = Math.max(0.75, as);

    inst.floorMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.floorMesh.scale.setScalar(13.8 * as);
    inst.floorMat.uniforms.uProgress.value = 0;

    const waveSpecs: ReadonlyArray<{ delay: number; dy: number; rx: number; ry: number; rz: number; sc: number; spin: number; c: string }> = [
      { delay: 0.14, dy: 0.95, rx: 0.24, ry: 0.35, rz: 0.30, sc: 5.8, spin: 5.4, c: '#06b6d4' },
      { delay: 0.28, dy: 1.25, rx: -0.26, ry: Math.PI - 0.3, rz: -0.28, sc: 6.5, spin: -5.6, c: '#38bdf8' },
      { delay: 0.42, dy: 1.70, rx: 0.38, ry: 0.9, rz: 0.22, sc: 7.4, spin: 6.0, c: '#22d3ee' },
      { delay: 0.56, dy: 1.15, rx: 0.10, ry: -0.2, rz: -0.15, sc: 8.2, spin: -5.3, c: '#67e8f9' },
    ];
    const waveLimit = this.lowQuality ? 3 : TIDAL_WAVE_COUNT;
    for (let i = 0; i < inst.waves.length; i++) {
      const slot = inst.waves[i];
      if (i >= waveLimit) {
        slot.mesh.visible = false;
        continue;
      }
      const ws = waveSpecs[i];
      slot.delay = ws.delay;
      slot.baseScale = ws.sc * as;
      slot.spinSpeed = ws.spin;
      slot.mesh.position.set(opts.cx, opts.cy + ws.dy, opts.cz);
      slot.mesh.rotation.set(ws.rx, ws.ry, ws.rz);
      slot.mesh.scale.setScalar(0.01);
      slot.mesh.visible = false;
      slot.mat.uniforms.uColor.value.set(ws.c);
      slot.mat.uniforms.uProgress.value = 0;
      slot.mat.uniforms.uLocalT.value = 0;
    }

    for (let i = 0; i < inst.dragons.length; i++) {
      const dr = inst.dragons[i];
      dr.mesh.visible = true;
      dr.mesh.position.set(opts.cx, opts.cy + 0.15, opts.cz);
      dr.mesh.rotation.set(0, i * 0.4, 0);
      dr.mesh.scale.set(1.18 * as, 1.05, 1.18 * as);
      dr.mat.uniforms.uProgress.value = 0;
    }

    const finLimit = this.lowQuality ? 6 : CROWN_FIN_COUNT;
    for (let i = 0; i < inst.crownFins.length; i++) {
      const cf = inst.crownFins[i];
      cf.mesh.visible = false;
      if (i >= finLimit) continue;
      cf.angle = (i / finLimit) * Math.PI * 2 + (i % 2) * 0.14;
      cf.maxRadius = (i % 2 === 0 ? 3.05 : 2.35) * as;
      cf.tiltAngle = i % 2 === 0 ? 0.62 : 0.42;
      cf.baseScale = (i % 2 === 0 ? 1.85 : 1.48) * safeAs;
    }

    const pearlLimit = this.lowQuality ? 4 : WATER_PEARL_COUNT;
    for (let i = 0; i < inst.pearls.length; i++) {
      const pr = inst.pearls[i];
      pr.mesh.visible = i < pearlLimit;
      if (i >= pearlLimit) continue;
      pr.angle = (i / pearlLimit) * Math.PI * 2;
      pr.orbitR = (2.8 + (i % 2) * 0.9) * as;
      pr.hoverY = 1.15 + (i % 3) * 0.72;
      pr.mat.uniforms.uOpacity.value = 1;
    }

    inst.geyserMesh.position.set(opts.cx, opts.cy + 0.14, opts.cz);
    inst.geyserMesh.scale.set(1.15 * as, 0.01, 1.15 * as);
    inst.geyserMesh.visible = false;

    this.hooks.onArenaDim?.(0.86, '#020c18', 1.25);
    this.hooks.onSpeedLines?.(0.88, 0.42);
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

      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uTime.value = timeSec;

      for (let i = 0; i < inst.dragons.length; i++) {
        const dr = inst.dragons[i];
        dr.mesh.rotation.y += (i === 0 ? 1.65 : -1.55) * dt;
        dr.mat.uniforms.uProgress.value = uProgress;
        dr.mat.uniforms.uTime.value = timeSec;
        if (uProgress > 0.45) dr.mesh.visible = false;
      }

      const waveLimit = this.lowQuality ? 3 : TIDAL_WAVE_COUNT;
      for (let i = 0; i < waveLimit; i++) {
        const slot = inst.waves[i];
        if (inst.elapsed < slot.delay) continue;
        slot.mesh.visible = true;
        const localT = Math.min(1, (inst.elapsed - slot.delay) / 0.50);
        const sEase = 1 - Math.pow(1 - localT, 3);
        slot.mesh.scale.setScalar(slot.baseScale * (0.44 + 0.68 * sEase));
        slot.mesh.rotation.y += slot.spinSpeed * dt * (1 - 0.45 * localT);
        slot.mat.uniforms.uProgress.value = uProgress;
        slot.mat.uniforms.uTime.value = timeSec;
        slot.mat.uniforms.uLocalT.value = localT;
      }

      // Levitating Water Pearls: coil inward up to impact, then explode outward as splash streaks
      const pearlLimit = this.lowQuality ? 4 : WATER_PEARL_COUNT;
      for (let i = 0; i < pearlLimit; i++) {
        const pr = inst.pearls[i];
        if (uProgress < 0.29) {
          const ct = uProgress / 0.29;
          const pullR = pr.orbitR * (1.0 - ct * 0.72);
          const ang = pr.angle + ct * 3.8;
          pr.mesh.position.set(
            inst.cx + Math.cos(ang) * pullR,
            inst.cy + pr.hoverY + Math.sin(ct * Math.PI) * 0.6,
            inst.cz + Math.sin(ang) * pullR
          );
          pr.mesh.scale.setScalar(0.85 + ct * 0.45);
          pr.mat.uniforms.uOpacity.value = 1;
        } else {
          const bt = Math.min(1, (uProgress - 0.29) / 0.34);
          const blastEase = 1 - Math.pow(1 - bt, 3);
          const blastR = (0.65 + blastEase * 4.8) * as;
          const ang = pr.angle + 3.8 + bt * 0.6;
          pr.mesh.position.set(
            inst.cx + Math.cos(ang) * blastR,
            inst.cy + 0.45 + Math.sin(bt * Math.PI) * 1.9,
            inst.cz + Math.sin(ang) * blastR
          );
          pr.mesh.scale.set(0.6, 0.6, 1.5 + bt * 0.8);
          pr.mesh.lookAt(inst.cx, inst.cy + 0.45, inst.cz);
          pr.mat.uniforms.uOpacity.value = 1 - bt;
          if (bt >= 0.99) pr.mesh.visible = false;
        }
        pr.mat.uniforms.uTime.value = timeSec;
      }

      // Main Twin-Dragon Convergence Hit-Stop Impact Frame
      if (!inst.impactFired && inst.elapsed >= 0.72) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.058;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#22d3ee', 0.072);
        this.hooks.onSpeedLines?.(1.0, 0.52);
        this.hooks.onFlash?.('#67e8f9', 0.72);
        inst.onImpactCallback?.();
      }

      // Secondary Undertow Shockwave Impact
      if (!inst.undertowFired && inst.elapsed >= 1.06) {
        inst.undertowFired = true;
        this.hooks.onImpactFrame?.(0.84, 0.0, '#06b6d4', 0.045);
        inst.onImpactCallback?.();
      }

      // Erupting Vertex-Flared Geyser + 10-Spike 3D Splash Crown
      if (uProgress >= 0.29) {
        const boomT = Math.min(1, (uProgress - 0.29) / 0.20);
        const boomEase = 1 - Math.pow(1 - boomT, 3);

        inst.geyserMesh.visible = true;
        inst.geyserMesh.scale.set(
          (0.9 + 0.55 * boomEase) * as,
          Math.max(0.1, boomEase * 1.15),
          (0.9 + 0.55 * boomEase) * as
        );
        inst.geyserMesh.rotation.y += 4.6 * dt;
        inst.geyserMat.uniforms.uProgress.value = uProgress;
        inst.geyserMat.uniforms.uTime.value = timeSec;

        const finLimit = this.lowQuality ? 6 : CROWN_FIN_COUNT;
        const crownFade = 1 - Math.max(0, (uProgress - 0.62) / 0.32);
        for (let i = 0; i < finLimit; i++) {
          const cf = inst.crownFins[i];
          if (crownFade <= 0.02) {
            cf.mesh.visible = false;
            continue;
          }
          cf.mesh.visible = true;
          const r = cf.maxRadius * (0.32 + 0.68 * boomEase);
          cf.mesh.position.set(
            inst.cx + Math.cos(cf.angle) * r,
            inst.cy + 0.16,
            inst.cz + Math.sin(cf.angle) * r
          );
          cf.mesh.rotation.set(0, -cf.angle + Math.PI * 0.5, 0);
          cf.mesh.rotateX(cf.tiltAngle * (0.65 + 0.35 * boomEase));
          cf.mesh.scale.setScalar(cf.baseScale * (0.45 + 0.55 * boomEase) * Math.max(0.1, crownFade));
          cf.mat.uniforms.uTime.value = timeSec;
          cf.mat.uniforms.uOpacity.value = crownFade;
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
