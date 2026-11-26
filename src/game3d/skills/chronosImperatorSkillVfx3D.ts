import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const CEL_FRAME_MAX = 6;
const DELAYED_CUT_COUNT = 6;
const SEVERANCE_ARC_COUNT = 3;
const SHARD_COUNT = 18;
const SHUTTER_RING_COUNT = 2;
const SPARK_COUNT = 30;
const SEVERANCE_TIME_SEC = 0.92;
const HIT_STOP_DURATION_SEC = 0.085;

export interface ChronosImperatorFireOpts {
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts?: readonly WorldPoint3[];
  onImpact?: () => void;
}

const CHRONOS_NOISE_GLSL = `
  float ciHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }

  float ciVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(ciHash21(i), ciHash21(i + vec2(1.0, 0.0)), f.x),
      mix(ciHash21(i + vec2(0.0, 1.0)), ciHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float ciFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += ciVnoise(p) * a;
      p = rot * p * 2.06 + vec2(1.9, 5.1);
      a *= 0.5;
    }
    return v;
  }

  float ciRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 2; i++) {
      float n = 1.0 - abs(ciVnoise(p) * 2.0 - 1.0);
      v += (n * n * n) * a;
      p *= 2.18;
      a *= 0.5;
    }
    return v;
  }

  float ciVoronoiEdge(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(ciHash21(n + g), ciHash21(n + g + vec2(17.3, 43.1)));
        vec2 r = g + (0.2 + 0.6 * o) - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return sqrt(d2) - sqrt(d1);
  }
`;

function createChronoFilmFloorMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uCutGlow: { value: 0 },
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
      uniform float uProgress;
      uniform float uCutGlow;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float openT = smoothstep(0.0, 0.12, uProgress);
        float maxR = mix(0.25, 0.99, 1.0 - pow(1.0 - openT, 3.0));
        float circleMask = 1.0 - smoothstep(maxR - 0.12, maxR, r);
        if (circleMask < 0.01) discard;

        // Dark obsidian film domain plate for bold contrast against bright arena floors
        float ang = 0.42;
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 fp = rot * p;

        float stripBand = smoothstep(0.68, 0.56, abs(fp.y));
        float railTop = smoothstep(0.042, 0.010, abs(abs(fp.y) - 0.54));
        float railInner = smoothstep(0.028, 0.008, abs(abs(fp.y) - 0.36));

        // Bold 24-FPS film sprocket perforations along outer rails
        float sprocketCell = fract(fp.x * 9.0 - uProgress * 2.2);
        float sprocketHole = step(0.22, sprocketCell) * step(sprocketCell, 0.78);
        float sprocketBand = smoothstep(0.085, 0.028, abs(abs(fp.y) - 0.45)) * sprocketHole;

        // Vertical frame dividers across the film reel
        float frameBar = smoothstep(0.055, 0.015, abs(fract(fp.x * 4.5 - uProgress * 1.1) - 0.5)) * smoothstep(0.36, 0.30, abs(fp.y));
        float shutterTicks = smoothstep(0.06, 0.02, abs(fract(fp.x * 18.0) - 0.5)) * smoothstep(0.34, 0.28, abs(fp.y)) * 0.65;

        // Wide sweeping shutter scanline
        float scanX = mix(-1.05, 1.05, clamp(uProgress * 2.1, 0.0, 1.0));
        float scanLine = exp(-abs(fp.x - scanX) * 9.5) * stripBand;

        // Blazing crimson-white diagonal severance fissure at 0.92s impact
        float sevDist = abs(fp.y - fp.x * 0.14);
        float sevCrack = exp(-sevDist * 7.5) * uCutGlow;
        float sevCore = exp(-sevDist * 22.0) * uCutGlow;
        float noiseDetail = ciFbm(fp * 4.5 + vec2(uTime * 0.8, 0.0));

        float envFade = smoothstep(0.0, 0.08, uProgress) * (1.0 - smoothstep(0.76, 1.0, uProgress));
        vec3 obsidianBase = vec3(0.03, 0.015, 0.07);
        vec3 neonViolet = vec3(0.74, 0.34, 1.0) * 1.55;
        vec3 champGold = vec3(1.0, 0.86, 0.48) * 1.65;
        vec3 crimsonHot = vec3(1.0, 0.14, 0.38) * 1.95;

        float detailMask = clamp(
          railTop * 1.1 + railInner * 0.8 + sprocketBand * 1.15 + frameBar * 0.95 + shutterTicks + scanLine * 1.2 + sevCrack * 1.4,
          0.0,
          1.4
        );

        vec3 lineCol = mix(neonViolet, champGold, clamp(sprocketBand * 0.9 + frameBar * 0.65 + scanLine * 0.75, 0.0, 1.0));
        lineCol = mix(lineCol, crimsonHot, clamp(sevCrack * 1.25, 0.0, 1.0));
        lineCol += vec3(1.0, 0.96, 0.98) * (sevCore * 1.4 + scanLine * 0.45);

        vec3 col = mix(obsidianBase + neonViolet * noiseDetail * 0.14, lineCol, clamp(detailMask, 0.0, 1.0));
        float basePlateAlpha = max(stripBand * 0.82, smoothstep(maxR, maxR - 0.25, r) * 0.46);
        float alpha = clamp(max(basePlateAlpha, detailMask * 0.95) * circleMask * envFade * uOpacity, 0.0, 0.94);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createChronoCelFrameMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLock: { value: 0 },
      uShatter: { value: 0 },
      uSeed: { value: 0 },
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
      uniform float uLock;
      uniform float uShatter;
      uniform float uSeed;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float ax = abs(p.x);
        float ay = abs(p.y);
        float edgeDist = max(ax, ay);
        if (edgeDist > 1.0) discard;

        // Bold animation-cel viewfinder border & corner brackets
        float outerBorder = smoothstep(0.76, 0.85, edgeDist) * (1.0 - smoothstep(0.96, 1.0, edgeDist));
        float cornerCut = step(0.46, ax) * step(0.46, ay) * smoothstep(0.68, 0.76, edgeDist);
        float innerHairline = smoothstep(0.028, 0.008, abs(edgeDist - 0.68));

        // 24-FPS film sprocket ticks along top & bottom edges
        float tickWave = smoothstep(0.14, 0.04, abs(fract(vUv.x * 10.0) - 0.5));
        float tickMask = tickWave * step(0.78, ay) * (1.0 - step(0.94, ay));

        // Sweeping glass sheen + locked temporal cross-pulse
        float sheen = exp(-abs((p.x + p.y) - mix(-1.4, 1.4, uLock)) * 4.0) * 0.75;
        float ripple = smoothstep(0.06, 0.015, abs(length(p) - 0.45 - sin(uTime * 7.0 + uSeed) * 0.04)) * 0.65;
        float centerSigil = exp(-min(abs(p.x), abs(p.y)) * 18.0) * smoothstep(0.55, 0.15, edgeDist) * 0.45;

        // Bold glowing Voronoi shatter fissures
        float vEdge = ciVoronoiEdge(vUv * 4.5 + vec2(uSeed, uSeed * 1.7));
        float crackGlow = (1.0 - smoothstep(0.0, 0.12 + uShatter * 0.16, vEdge)) * step(0.01, uShatter);
        float cellDissolve = mix(1.0, smoothstep(uShatter * 0.92, uShatter * 0.92 + 0.18, ciVnoise(vUv * 5.5 + uSeed)), uShatter);

        vec3 darkGlass = vec3(0.08, 0.03, 0.18);
        vec3 glassViolet = vec3(0.66, 0.30, 1.0) * 1.45;
        vec3 frameGold = vec3(1.0, 0.86, 0.48) * 1.7;
        vec3 shatterCrimson = vec3(1.0, 0.16, 0.44) * 2.1;
        vec3 hotWhite = vec3(1.0, 0.97, 1.0) * 1.85;

        float lineEnergy = clamp(outerBorder * 1.2 + cornerCut + innerHairline * 0.6 + tickMask + sheen + ripple + centerSigil + crackGlow * 1.5, 0.0, 1.5);
        vec3 glowCol = mix(glassViolet, frameGold, clamp(cornerCut * 0.85 + tickMask * 0.9, 0.0, 1.0));
        glowCol = mix(glowCol, hotWhite, clamp(outerBorder * 0.55 + sheen * 0.7, 0.0, 1.0));
        glowCol = mix(glowCol, shatterCrimson, clamp(crackGlow * 1.35, 0.0, 1.0));

        vec3 col = mix(darkGlass, glowCol, clamp(lineEnergy, 0.0, 1.0));
        float alpha = clamp(max(0.42 * (1.0 - uShatter * 0.45), lineEnergy * 0.95) * cellDissolve * uOpacity, 0.0, 0.96);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createOnionSkinRibbonGeometry(): THREE.BufferGeometry {
  const segs = 56;
  const cols = segs + 1;
  const rows = 2;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segs;
    const theta = u * Math.PI * 2.4;
    const rad = 3.2 + Math.sin(u * Math.PI * 2.0) * 1.75;
    const x = Math.cos(theta) * rad;
    const z = Math.sin(theta) * rad * 0.82;
    const y = 0.85 + Math.sin(u * Math.PI) * 2.1;
    const halfW = 0.52 + Math.sin(u * Math.PI) * 0.65;

    for (let j = 0; j < rows; j++) {
      const v = j;
      const offset = (v - 0.5) * 2.0 * halfW;
      const idx = i * rows + j;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y + offset;
      positions[idx * 3 + 2] = z;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let i = 0; i < segs; i++) {
    const a = i * rows;
    const b = (i + 1) * rows;
    const c = (i + 1) * rows + 1;
    const d = i * rows + 1;
    indices.push(a, b, c, a, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createOnionSkinRibbonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHead: { value: 0 },
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
      uniform float uHead;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float trailMask = step(vUv.x, uHead) * smoothstep(max(0.0, uHead - 0.72), max(0.02, uHead - 0.03), vUv.x);
        float tip = exp(-abs(vUv.x - uHead) * 18.0);
        // 24-FPS stepped onion-skin stripes along velocity trail
        float stepEcho = 0.52 + 0.48 * step(0.28, fract(vUv.x * 24.0));

        float vCentered = abs(vUv.y * 2.0 - 1.0);
        float core = 1.0 - smoothstep(0.12, 0.78, vCentered);
        float chromaticRim = smoothstep(0.45, 0.84, vCentered) * (1.0 - smoothstep(0.90, 1.0, vCentered));

        vec3 violetTrail = vec3(0.72, 0.34, 1.0) * 1.6;
        vec3 crimsonEdge = vec3(1.0, 0.14, 0.42) * 1.9;
        vec3 whiteCore = vec3(1.0, 0.96, 0.98) * 2.1;

        vec3 col = mix(violetTrail, crimsonEdge, chromaticRim * 1.15);
        col = mix(col, whiteCore, clamp(core * 0.78 + tip * 0.95, 0.0, 1.0));

        float alpha = clamp((core * 0.88 + chromaticRim * 0.82) * trailMask * stepEcho * uOpacity + tip * 0.7 * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createDelayedCrimsonCutMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDraw: { value: 0 },
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
      uniform float uDraw;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        float lengthMask = step(vUv.x, uDraw) * smoothstep(0.0, 0.10, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
        float distY = abs(vUv.y * 2.0 - 1.0);
        float taper = sin(clamp(vUv.x, 0.0, 1.0) * 3.14159);
        float flame = ciFbm(vec2(vUv.x * 5.0 - uTime * 3.0, vUv.y * 3.5));

        float lineCore = exp(-distY * (6.5 - taper * 2.8));
        float crimsonHalo = exp(-distY * (2.6 - flame * 0.8)) * 0.85;

        vec3 crimson = vec3(0.98, 0.10, 0.36) * 1.7;
        vec3 violet = vec3(0.68, 0.30, 1.0) * 1.3;
        vec3 hotWhite = vec3(1.0, 0.96, 0.94) * 2.1;

        vec3 col = mix(violet, crimson, clamp(crimsonHalo * 1.2, 0.0, 1.0));
        col = mix(col, hotWhite, clamp(lineCore * 1.15, 0.0, 1.0));
        float alpha = clamp((lineCore + crimsonHalo) * lengthMask * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createSeveranceArcGeometry(): THREE.BufferGeometry {
  const segs = 36;
  const cols = segs + 1;
  const rows = 3;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segs;
    const ang = (u - 0.5) * Math.PI * 1.26;
    const widthScale = Math.pow(Math.sin(u * Math.PI), 0.34);
    const outerR = 1.0;
    const innerR = outerR - 0.56 * widthScale;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = innerR + (outerR - innerR) * v;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = sinA * r;
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

function createGrandSeveranceSlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        float sweep = smoothstep(0.0, 0.24, uProgress);
        float head = mix(0.08, 1.08, sweep);
        float arcMask = step(vUv.x, head) * smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        float flame = ciFbm(vec2(vUv.x * 6.0 - uTime * 3.8, vUv.y * 4.0));

        float hotBlade = smoothstep(0.46, 0.84, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
        float crimsonFlame = smoothstep(0.10, 0.56, vUv.y + flame * 0.28) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
        float goldEdge = smoothstep(0.60, 0.78, vUv.y) * 0.75;

        vec3 crimson = vec3(1.0, 0.10, 0.34) * 1.9;
        vec3 violet = vec3(0.72, 0.28, 1.0) * 1.55;
        vec3 champGold = vec3(1.0, 0.88, 0.54) * 1.85;
        vec3 whiteCore = vec3(1.0, 0.98, 0.98) * 2.25;

        vec3 col = mix(violet, crimson, clamp(crimsonFlame * 1.15, 0.0, 1.0));
        col = mix(col, champGold, clamp(goldEdge, 0.0, 1.0));
        col = mix(col, whiteCore, clamp(hotBlade * 1.15, 0.0, 1.0));

        float fadeOut = 1.0 - smoothstep(0.42, 1.0, uProgress);
        float alpha = clamp((crimsonFlame * 0.95 + hotBlade * 1.25) * arcMask * fadeOut * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createChronoSeveranceSpireMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float flare = 1.0 + sin(uv.y * 9.0 - uTime * 12.0) * 0.20 * (1.0 - uv.y * 0.35);
        pos.xz *= flare;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        float streak = ciRidged(vec2(vUv.x * 7.0, vUv.y * 4.5 - uTime * 6.5));
        // Horizontal 24-FPS film-strip bands climbing the spire
        float filmSlices = 0.65 + 0.35 * step(0.28, fract(vUv.y * 12.0 - uTime * 2.4));
        float vFade = smoothstep(0.0, 0.10, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));

        vec3 violet = vec3(0.68, 0.28, 1.0) * 1.5;
        vec3 crimson = vec3(0.98, 0.12, 0.38) * 1.85;
        vec3 whiteGold = vec3(1.0, 0.95, 0.86) * 2.1;

        vec3 col = mix(violet, crimson, smoothstep(0.22, 0.72, streak));
        col = mix(col, whiteGold, clamp(streak * 0.9 + (1.0 - vUv.y) * 0.35, 0.0, 1.0));

        float alpha = clamp(vFade * filmSlices * (0.62 + streak * 0.72) * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createChronoShardGeometry(): THREE.BufferGeometry {
  // Asymmetric 4-sided faceted crystal bipyramid built directly with UVs (zero temporary ConeGeometry leaks)
  const r = 0.26;
  const topY = 0.72;
  const botY = -0.46;
  const ring: Array<[number, number, number]> = [
    [r, 0, 0],
    [0, 0, r],
    [-r, 0, 0],
    [0, 0, -r],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    uva: [number, number],
    uvb: [number, number],
    uvc: [number, number]
  ): void => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uvs.push(uva[0], uva[1], uvb[0], uvb[1], uvc[0], uvc[1]);
  };
  for (let i = 0; i < 4; i++) {
    const p0 = ring[i];
    const p1 = ring[(i + 1) % 4];
    pushTri(p0, p1, [0, topY, 0], [0, 0.4], [1, 0.4], [0.5, 1.0]);
    pushTri(p1, p0, [0, botY, 0], [1, 0.4], [0, 0.4], [0.5, 0.0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function createChronoShardMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
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
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float core = 1.0 - abs(vUv.x * 2.0 - 1.0);
        vec3 col = mix(vec3(0.72, 0.34, 1.0) * 1.4, vec3(1.0, 0.20, 0.48) * 1.75, vUv.y);
        col = mix(col, vec3(1.0, 0.94, 0.88) * 1.9, core * 0.65);
        float alpha = clamp((0.72 + core * 0.45) * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createShutterRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float ring = smoothstep(0.14, 0.022, abs(r - 0.84));
        float trail = smoothstep(0.18, 0.03, abs(r - 0.68)) * 0.55;
        float shutterGaps = 0.62 + 0.38 * step(0.24, fract(ang * 3.8197));
        vec3 col = mix(vec3(0.72, 0.34, 1.0) * 1.6, vec3(1.0, 0.16, 0.44) * 1.95, uProgress);
        col += vec3(1.0, 0.96, 0.86) * ring * 0.85;
        float alpha = clamp((ring + trail) * shutterGaps * (1.0 - uProgress) * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createChronoSparkMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
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
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float core = exp(-abs(p.x) * 3.8 - abs(p.y) * 1.8);
        vec3 col = mix(vec3(1.0, 0.16, 0.44) * 1.7, vec3(1.0, 0.94, 0.68) * 2.0, core);
        float alpha = clamp(core * 1.4 * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

interface CelFrameSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tilt: number;
  lockDelay: number;
}

interface DelayedCutSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotZ: number;
  delay: number;
}

interface SeveranceArcSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  rx: number;
  ryOffset: number;
  rz: number;
  spinSign: number;
  delay: number;
}

interface ChronoShardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
  spinX: number;
  spinZ: number;
}

interface ChronoSparkSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface ChronosImperatorInstance {
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  activeCelCount: number;
  impactFired: boolean;
  onImpactCallback: (() => void) | null;
  root: THREE.Group;
  floorMesh: THREE.Mesh;
  floorMat: THREE.ShaderMaterial;
  celFrames: CelFrameSlot[];
  ribbonMesh: THREE.Mesh;
  ribbonMat: THREE.ShaderMaterial;
  delayedCuts: DelayedCutSlot[];
  severanceArcs: SeveranceArcSlot[];
  spireMesh: THREE.Mesh;
  spireMat: THREE.ShaderMaterial;
  shards: ChronoShardSlot[];
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  sparks: ChronoSparkSlot[];
}

/**
 * Pooled 2.5s Sakuga 3D GLSL VFX for Chronos Imperator (`crimson-clock-marshal`, tier `novel`):
 * 24-FPS Chrono-Cell Projection & Shatter (dark-backed 35mm film runway, bold cel-frame prisons,
 * onion-skin velocity ribbon, crimson flame katana cuts, 3-arc severance + 12.5m Chrono-Spire + Hit-Stop,
 * and Voronoi crystal shatter).
 */
export class ChronosImperatorSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly instances: ChronosImperatorInstance[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const celGeo = new THREE.PlaneGeometry(2.85, 3.4);
    const ribbonGeo = createOnionSkinRibbonGeometry();
    const cutGeo = new THREE.PlaneGeometry(5.2, 1.05);
    const severanceGeo = createSeveranceArcGeometry();
    const spireGeo = new THREE.CylinderGeometry(1.9, 3.4, 12.5, 22, 10, true);
    spireGeo.translate(0, 6.25, 0);
    const shardGeo = createChronoShardGeometry();
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    ringGeo.rotateX(-Math.PI / 2);
    const sparkGeo = new THREE.PlaneGeometry(0.46, 1.35);
    this.sharedGeos.push(floorGeo, celGeo, ribbonGeo, cutGeo, severanceGeo, spireGeo, shardGeo, ringGeo, sparkGeo);

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createChronoFilmFloorMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = 'filmFloor';
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const celFrames: CelFrameSlot[] = [];
      for (let f = 0; f < CEL_FRAME_MAX; f++) {
        const mat = createChronoCelFrameMaterial();
        const mesh = new THREE.Mesh(celGeo, mat);
        mesh.name = 'celFrame';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        celFrames.push({
          mesh,
          mat,
          x: 0,
          y: 0,
          z: 0,
          yaw: ((f % 3) - 1) * 0.24,
          tilt: (f % 2 === 0 ? 1 : -1) * 0.08,
          lockDelay: 0.04 + f * 0.055,
        });
      }

      const ribbonMat = createOnionSkinRibbonMaterial();
      const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbonMesh.name = 'onionRibbon';
      ribbonMesh.visible = false;
      root.add(ribbonMesh);
      this.allMats.push(ribbonMat);

      const delayedCuts: DelayedCutSlot[] = [];
      for (let c = 0; c < DELAYED_CUT_COUNT; c++) {
        const mat = createDelayedCrimsonCutMaterial();
        const mesh = new THREE.Mesh(cutGeo, mat);
        mesh.name = 'delayedCut';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        delayedCuts.push({
          mesh,
          mat,
          x: 0,
          y: 0,
          z: 0,
          rotY: (c - 2.5) * 0.3,
          rotZ: (c % 2 === 0 ? 1 : -1) * (0.44 + (c % 3) * 0.14),
          delay: 0.42 + c * 0.065,
        });
      }

      const severanceArcs: SeveranceArcSlot[] = [];
      const arcConfigs = [
        { rx: 0.30, ryOffset: -0.45, rz: 0.36, spinSign: 1, delay: SEVERANCE_TIME_SEC },
        { rx: -0.34, ryOffset: 1.45, rz: -0.38, spinSign: -1, delay: SEVERANCE_TIME_SEC + 0.05 },
        { rx: 0.16, ryOffset: 2.95, rz: 0.52, spinSign: 1, delay: SEVERANCE_TIME_SEC + 0.10 },
      ];
      for (let a = 0; a < SEVERANCE_ARC_COUNT; a++) {
        const mat = createGrandSeveranceSlashMaterial();
        const mesh = new THREE.Mesh(severanceGeo, mat);
        mesh.name = 'severanceSlash';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        severanceArcs.push({ mesh, mat, ...arcConfigs[a] });
      }

      const spireMat = createChronoSeveranceSpireMaterial();
      const spireMesh = new THREE.Mesh(spireGeo, spireMat);
      spireMesh.name = 'chronoSpire';
      spireMesh.visible = false;
      root.add(spireMesh);
      this.allMats.push(spireMat);

      const shards: ChronoShardSlot[] = [];
      for (let s = 0; s < SHARD_COUNT; s++) {
        const mat = createChronoShardMaterial();
        const mesh = new THREE.Mesh(shardGeo, mat);
        mesh.name = 'chronoShard';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        shards.push({
          mesh,
          mat,
          angle: (s / SHARD_COUNT) * Math.PI * 2 + (s % 3) * 0.12,
          speed: 3.6 + (s % 5) * 1.2,
          ySpeed: 4.2 + (s % 4) * 1.45,
          spinX: (s % 2 === 0 ? 1 : -1) * (6.5 + (s % 4) * 1.5),
          spinZ: (s % 3 === 0 ? 1 : -1) * 7.2,
        });
      }

      const rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }> = [];
      for (let r = 0; r < SHUTTER_RING_COUNT; r++) {
        const mat = createShutterRingMaterial();
        const mesh = new THREE.Mesh(ringGeo, mat);
        mesh.name = 'shutterRing';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        rings.push({ mesh, mat, delay: SEVERANCE_TIME_SEC + r * 0.16 });
      }

      const sparks: ChronoSparkSlot[] = [];
      for (let p = 0; p < SPARK_COUNT; p++) {
        const mat = createChronoSparkMaterial();
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.name = 'chronoSpark';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        sparks.push({
          mesh,
          mat,
          angle: (p / SPARK_COUNT) * Math.PI * 2,
          speed: 3.5 + (p % 5) * 1.15,
          ySpeed: 4.2 + (p % 4) * 1.4,
        });
      }

      this.instances.push({
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        activeCelCount: CEL_FRAME_MAX,
        impactFired: false,
        onImpactCallback: null,
        root,
        floorMesh,
        floorMat,
        celFrames,
        ribbonMesh,
        ribbonMat,
        delayedCuts,
        severanceArcs,
        spireMesh,
        spireMat,
        shards,
        rings,
        sparks,
      });
    }
  }

  public getMaterials(): THREE.ShaderMaterial[] {
    return this.allMats;
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public fire(opts: ChronosImperatorFireOpts): void {
    let inst = this.instances.find((x) => !x.active);
    if (!inst) {
      inst = this.instances.reduce((a, b) => (a.elapsed >= b.elapsed ? a : b));
    }

    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.impactFired = false;
    inst.onImpactCallback = opts.onImpact ?? null;

    const maxCells = this.lowQuality ? 3 : CEL_FRAME_MAX;
    const rawPts = opts.pts ?? [];
    inst.activeCelCount = maxCells;

    for (let f = 0; f < CEL_FRAME_MAX; f++) {
      const cf = inst.celFrames[f];
      cf.mesh.visible = false;
      if (rawPts.length > 0) {
        const pt = rawPts[f % rawPts.length];
        const ringAng = (f / CEL_FRAME_MAX) * Math.PI * 2;
        const spread = f >= rawPts.length ? 0.95 * opts.areaScale : 0;
        cf.x = pt.x + Math.cos(ringAng) * spread;
        cf.y = pt.y + 1.45 * opts.areaScale;
        cf.z = pt.z + Math.sin(ringAng) * spread;
      } else {
        const ang = (f / maxCells) * Math.PI * 2;
        const rad = 2.4 * opts.areaScale;
        cf.x = opts.cx + Math.cos(ang) * rad;
        cf.y = opts.cy + 1.45 * opts.areaScale;
        cf.z = opts.cz + Math.sin(ang) * rad * 0.78;
      }
      cf.mat.uniforms.uSeed.value = f * 1.37 + (opts.cx + opts.cz) * 0.13;
    }

    for (let c = 0; c < DELAYED_CUT_COUNT; c++) {
      const dc = inst.delayedCuts[c];
      const anchor = inst.celFrames[c % maxCells];
      dc.x = anchor.x;
      dc.y = anchor.y;
      dc.z = anchor.z + 0.14;
      dc.mesh.visible = false;
    }

    inst.root.visible = true;
    inst.floorMesh.position.set(opts.cx, opts.cy + 0.06, opts.cz);
    inst.floorMesh.scale.setScalar(16.5 * opts.areaScale);
    inst.floorMat.uniforms.uProgress.value = 0;
    inst.floorMat.uniforms.uCutGlow.value = 0;
    inst.floorMat.uniforms.uOpacity.value = 1;

    inst.ribbonMesh.position.set(opts.cx, opts.cy + 0.14, opts.cz);
    inst.ribbonMesh.scale.setScalar(opts.areaScale);
    inst.ribbonMesh.visible = false;

    for (let a = 0; a < SEVERANCE_ARC_COUNT; a++) {
      inst.severanceArcs[a].mesh.position.set(opts.cx, opts.cy + (1.35 + a * 0.38) * opts.areaScale, opts.cz);
      inst.severanceArcs[a].mesh.visible = false;
    }

    inst.spireMesh.position.set(opts.cx, opts.cy + 0.05, opts.cz);
    inst.spireMesh.visible = false;

    for (let s = 0; s < SHARD_COUNT; s++) inst.shards[s].mesh.visible = false;
    for (let r = 0; r < SHUTTER_RING_COUNT; r++) inst.rings[r].mesh.visible = false;
    for (let p = 0; p < SPARK_COUNT; p++) inst.sparks[p].mesh.visible = false;

    this.hooks.onArenaDim?.(0.78, '#120826', 0.95);
  }

  public update(dtSec: number, timeSec: number): void {
    for (let idx = 0; idx < this.instances.length; idx++) {
      const inst = this.instances[idx];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer -= dtSec;
        continue;
      }

      const dt = Math.min(0.05, Math.max(0, dtSec));
      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;

      // Floor 35mm film-strip & 24-FPS shutter track
      const cutWindow = Math.max(0, 1 - Math.abs(inst.elapsed - SEVERANCE_TIME_SEC) / 0.5);
      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uCutGlow.value = cutWindow;
      inst.floorMat.uniforms.uOpacity.value = 1;

      // Phase 1 -> 3: Staggered Cel-Frame Prisons
      const shatterRaw = Math.max(0, (inst.elapsed - SEVERANCE_TIME_SEC) / 0.56);
      const shatter = Math.min(1, shatterRaw);
      for (let f = 0; f < inst.activeCelCount; f++) {
        const cf = inst.celFrames[f];
        if (inst.elapsed < cf.lockDelay || shatter >= 1) {
          cf.mesh.visible = false;
          continue;
        }
        const lockT = Math.min(1, (inst.elapsed - cf.lockDelay) / 0.14);
        const snapScale = (1.32 - 0.30 * (1 - Math.pow(1 - lockT, 3))) * as;
        cf.mesh.visible = true;
        cf.mesh.position.set(cf.x, cf.y + shatter * 0.28 * as, cf.z);
        cf.mesh.rotation.set(0, cf.yaw, cf.tilt * (1 - lockT * 0.5));
        cf.mesh.scale.setScalar(snapScale * (1 + shatter * 0.2));
        cf.mat.uniforms.uTime.value = timeSec;
        cf.mat.uniforms.uLock.value = lockT;
        cf.mat.uniforms.uShatter.value = shatter;
        cf.mat.uniforms.uOpacity.value = 1 - shatter * 0.82;
      }

      // Phase 2: Onion-Skin Velocity Ribbon (0.42s -> 1.24s)
      if (inst.elapsed >= 0.42 && inst.elapsed < 1.24) {
        const rt = (inst.elapsed - 0.42) / 0.50;
        const fade = inst.elapsed > SEVERANCE_TIME_SEC ? Math.max(0, 1 - (inst.elapsed - SEVERANCE_TIME_SEC) / 0.32) : 1;
        inst.ribbonMesh.visible = fade > 0.02;
        inst.ribbonMat.uniforms.uHead.value = Math.min(1.15, rt * 1.15);
        inst.ribbonMat.uniforms.uOpacity.value = fade;
      } else {
        inst.ribbonMesh.visible = false;
      }

      // Phase 2 -> 3: 6 Bold Crimson Flame Katana Scars hovering on locked cel-frames
      for (let c = 0; c < DELAYED_CUT_COUNT; c++) {
        const dc = inst.delayedCuts[c];
        if (inst.elapsed < dc.delay || inst.elapsed > 1.32) {
          dc.mesh.visible = false;
          continue;
        }
        const drawT = Math.min(1, (inst.elapsed - dc.delay) / 0.12);
        const fade = inst.elapsed > SEVERANCE_TIME_SEC ? Math.max(0, 1 - (inst.elapsed - SEVERANCE_TIME_SEC) / 0.40) : 1;
        dc.mesh.visible = fade > 0.02;
        dc.mesh.position.set(dc.x, dc.y, dc.z);
        dc.mesh.rotation.set(0.18, dc.rotY, dc.rotZ);
        dc.mesh.scale.setScalar(as);
        dc.mat.uniforms.uTime.value = timeSec;
        dc.mat.uniforms.uDraw.value = drawT;
        dc.mat.uniforms.uOpacity.value = fade;
      }

      // Phase 3 Trigger: Grand Severance Cut + 0.085s Hit-Stop
      if (!inst.impactFired && inst.elapsed >= SEVERANCE_TIME_SEC) {
        inst.impactFired = true;
        inst.hitStopTimer = HIT_STOP_DURATION_SEC;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#e11d48', HIT_STOP_DURATION_SEC);
        this.hooks.onSpeedLines?.(1.0, 0.55);
        this.hooks.onFlash?.('#f3e8ff', 0.72);
        inst.onImpactCallback?.();
      }

      // 3 Crossed Grand Crimson-Gold Severance Sweeps (>= 0.92s)
      for (let a = 0; a < SEVERANCE_ARC_COUNT; a++) {
        const arc = inst.severanceArcs[a];
        const st = (inst.elapsed - arc.delay) / 0.56;
        if (st < 0 || st >= 1) {
          arc.mesh.visible = false;
          continue;
        }
        arc.mesh.visible = true;
        arc.mesh.rotation.set(arc.rx, arc.ryOffset + st * 2.4 * arc.spinSign, arc.rz);
        arc.mesh.scale.setScalar((6.8 + st * 7.8) * as);
        arc.mat.uniforms.uTime.value = timeSec;
        arc.mat.uniforms.uProgress.value = st;
        arc.mat.uniforms.uOpacity.value = 1;
      }

      // Towering 12.5m Chrono-Severance Vortex Spire (>= 0.92s)
      if (inst.elapsed >= SEVERANCE_TIME_SEC) {
        const dtBoom = inst.elapsed - SEVERANCE_TIME_SEC;
        const spireRise = Math.min(1, dtBoom / 0.24);
        const spireEase = 1 - Math.pow(1 - spireRise, 3);
        const spireFade = Math.max(0, 1 - Math.max(0, dtBoom - 0.55) / 0.95);
        inst.spireMesh.visible = spireFade > 0.02;
        inst.spireMesh.scale.set((0.88 + 0.65 * spireEase) * as, Math.max(0.12, spireEase * 1.15), (0.88 + 0.65 * spireEase) * as);
        inst.spireMesh.rotation.y += dt * 4.4;
        inst.spireMat.uniforms.uTime.value = timeSec;
        inst.spireMat.uniforms.uProgress.value = uProgress;
        inst.spireMat.uniforms.uOpacity.value = spireFade;

        const boomFade = Math.max(0, 1 - dtBoom / 1.25);

        const shardCap = this.lowQuality ? 10 : SHARD_COUNT;
        for (let s = 0; s < shardCap; s++) {
          const sh = inst.shards[s];
          if (boomFade <= 0.02) {
            sh.mesh.visible = false;
            continue;
          }
          sh.mesh.visible = true;
          const r = (0.45 + dtBoom * sh.speed) * as;
          const y = Math.max(0.18, 1.15 + dtBoom * sh.ySpeed - 3.6 * dtBoom * dtBoom);
          sh.mesh.position.set(inst.cx + Math.cos(sh.angle) * r, inst.cy + y, inst.cz + Math.sin(sh.angle) * r);
          sh.mesh.rotation.set(dtBoom * sh.spinX, sh.angle, dtBoom * sh.spinZ);
          sh.mesh.scale.setScalar((0.92 + 0.38 * boomFade) * as);
          sh.mat.uniforms.uOpacity.value = boomFade;
        }

        for (let r = 0; r < SHUTTER_RING_COUNT; r++) {
          const rg = inst.rings[r];
          const rt = (inst.elapsed - rg.delay) / 0.78;
          if (rt < 0 || rt > 1) {
            rg.mesh.visible = false;
            continue;
          }
          rg.mesh.visible = true;
          rg.mesh.position.set(inst.cx, inst.cy + 0.1 + r * 0.05, inst.cz);
          rg.mesh.scale.setScalar((3.4 + 12.2 * rt) * as);
          rg.mat.uniforms.uProgress.value = rt;
          rg.mat.uniforms.uOpacity.value = 1 - rt;
        }

        const sparkCap = this.lowQuality ? 14 : SPARK_COUNT;
        for (let p = 0; p < sparkCap; p++) {
          const sp = inst.sparks[p];
          if (boomFade <= 0.02) {
            sp.mesh.visible = false;
            continue;
          }
          sp.mesh.visible = true;
          const r = dtBoom * sp.speed * as;
          const y = Math.max(0.18, 0.7 + dtBoom * sp.ySpeed - 2.3 * dtBoom * dtBoom);
          sp.mesh.position.set(inst.cx + Math.cos(sp.angle) * r, inst.cy + y, inst.cz + Math.sin(sp.angle) * r);
          sp.mesh.rotation.y = -sp.angle;
          sp.mesh.scale.setScalar(1.18 * boomFade * as);
          sp.mat.uniforms.uOpacity.value = boomFade;
        }
      } else {
        inst.spireMesh.visible = false;
      }

      if (inst.elapsed >= SKILL_DURATION_SEC) {
        inst.active = false;
        inst.root.visible = false;
        inst.onImpactCallback = null;
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

  /** Pushes any active instance straight into its post-severance dissolve tail when superseded by a new Ult. */
  public fastForwardToDissolve(): void {
    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      if (!inst.active) continue;
      inst.hitStopTimer = 0;
      inst.impactFired = true;
      inst.onImpactCallback = null;
      inst.elapsed = Math.max(inst.elapsed, 1.48);
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) this.allMats[i].dispose();
    for (let i = 0; i < this.sharedGeos.length; i++) this.sharedGeos[i].dispose();
  }
}
