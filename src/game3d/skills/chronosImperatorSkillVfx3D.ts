import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const FILM_FLOOR_SIZE = 16.0;
const FILM_REVEAL_ANG = 0.42;
const FILM_CARVE_SLASH_COUNT = 14;
const CEL_FRAME_MAX = 6;
const RAZOR_SMEAR_COUNT = 6;
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
      uRevealHead: { value: 0 },
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
      uniform float uRevealHead;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float circleMask = 1.0 - smoothstep(0.86, 0.99, r);
        if (circleMask < 0.01) discard;

        // 35mm film-strip track carved open directly behind sweeping slash cuts (zero big floor lines)
        float ang = ${FILM_REVEAL_ANG.toFixed(2)};
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 fp = rot * p;

        float revealX = mix(-1.12, 1.12, uRevealHead);
        float slashNoise = (ciVnoise(vec2(fp.y * 6.0, uRevealHead * 4.0)) - 0.5) * 0.14;
        float carvedReveal = 1.0 - smoothstep(revealX - 0.16 + slashNoise, revealX + 0.02 + slashNoise, fp.x);
        if (carvedReveal < 0.01) discard;

        float stripBand = smoothstep(0.68, 0.56, abs(fp.y));
        float railTop = smoothstep(0.036, 0.008, abs(abs(fp.y) - 0.54));
        float railInner = smoothstep(0.024, 0.006, abs(abs(fp.y) - 0.36));

        float sprocketCell = fract(fp.x * 9.0 - uProgress * 2.2);
        float sprocketHole = step(0.22, sprocketCell) * step(sprocketCell, 0.78);
        float sprocketBand = smoothstep(0.085, 0.028, abs(abs(fp.y) - 0.45)) * sprocketHole;

        float frameBar = smoothstep(0.048, 0.012, abs(fract(fp.x * 4.5 - uProgress * 1.1) - 0.5)) * smoothstep(0.36, 0.30, abs(fp.y));
        float shutterTicks = smoothstep(0.055, 0.018, abs(fract(fp.x * 18.0) - 0.5)) * smoothstep(0.34, 0.28, abs(fp.y)) * 0.65;
        float noiseDetail = ciFbm(fp * 4.5 + vec2(uTime * 0.8, 0.0));

        float envFade = 1.0 - smoothstep(0.76, 1.0, uProgress);
        vec3 obsidianBase = vec3(0.03, 0.015, 0.07);
        vec3 neonViolet = vec3(0.74, 0.34, 1.0) * 1.45;
        vec3 champGold = vec3(1.0, 0.86, 0.48) * 1.55;

        float detailMask = clamp(
          railTop * 1.05 + railInner * 0.75 + sprocketBand * 1.15 + frameBar * 0.90 + shutterTicks,
          0.0,
          1.3
        );

        vec3 lineCol = mix(neonViolet, champGold, clamp(sprocketBand * 0.9 + frameBar * 0.65, 0.0, 1.0));
        vec3 col = mix(obsidianBase + neonViolet * noiseDetail * 0.14, lineCol, clamp(detailMask, 0.0, 1.0));
        float basePlateAlpha = max(stripBand * 0.82, smoothstep(0.95, 0.65, r) * 0.42);
        float alpha = clamp(max(basePlateAlpha, detailMask * 0.95) * carvedReveal * circleMask * envFade * uOpacity, 0.0, 0.94);
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

/**
 * Crimson-style razor-needle slash streak following the film floor reveal edge.
 * Uses inverse-distance needle core math (`0.0032 / dist` + `0.024 / (dist + 0.012)`).
 */
function createCrimsonCarveSlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: 0 },
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
      uniform float uTime;
      uniform float uTint;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float head = mix(-0.85, 1.15, uProgress);
        float tail = max(-1.0, head - 1.15);
        float segMask = smoothstep(tail, tail + 0.18, p.x) * (1.0 - smoothstep(head - 0.12, head, p.x));
        float lenFade = smoothstep(0.98, 0.45, abs(p.x));

        float jag = (ciVnoise(vec2(p.x * 10.0, uTime * 9.0)) - 0.5) * 0.025;
        float dist = abs(p.y + jag);

        float needle = 0.0035 / (dist + 0.0020);
        float aura = 0.026 / (dist + 0.014);

        vec3 crimson = vec3(0.98, 0.12, 0.36) * 1.65;
        vec3 violet = vec3(0.72, 0.32, 1.0) * 1.55;
        vec3 col = mix(violet, crimson, uTint);
        col = mix(col, vec3(1.0, 0.97, 0.94), clamp(needle * 0.65, 0.0, 1.0));

        float fadeOut = 1.0 - smoothstep(0.65, 1.0, uProgress);
        float alpha = clamp((needle + aura * 0.72) * segMask * lenFade * fadeOut * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Crimson Ronin-style multi-line crisscrossing razor lattice for Chronos Imperator's flurry
 * (`0.42s -> 1.65s`): 12 rapid crisscrossing white-hot needle lines w/ crimson & violet aura.
 */
function createChronoRazorLatticeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uLayerSeed: { value: 1.0 },
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
      uniform float uTime;
      uniform float uLayerSeed;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float flurrySum = 0.0;
        float coreSum = 0.0;
        float tick = floor(uTime * 34.0);
        for (int i = 0; i < 12; i++) {
          float fi = float(i);
          float triggerT = fi * 0.032;
          float activeWin = smoothstep(triggerT - 0.04, triggerT + 0.02, uProgress);
          float pulse = 0.55 + 0.45 * step(0.35, ciHash21(vec2(fi + uLayerSeed * 7.0, tick)));
          float ang = ciHash21(vec2(fi * 3.1, uLayerSeed + 1.7)) * 3.14159265;
          float off = (ciHash21(vec2(fi * 5.7, uLayerSeed + 4.3)) - 0.5) * 1.18;

          mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          vec2 rp = rot * p;
          float jag = (ciVnoise(vec2(rp.x * 11.0, tick * 0.7 + fi)) - 0.5) * 0.014;
          float d = abs(rp.y - off + jag);
          float lenMask = smoothstep(0.96, 0.35, abs(rp.x));
          float core = smoothstep(0.012, 0.001, d) * lenMask;
          float glow = (0.019 / (d + 0.013)) * lenMask;

          float w = activeWin * pulse;
          flurrySum += glow * w;
          coreSum += core * w;
        }

        float dissolveT = clamp((uProgress - 0.45) / 0.55, 0.0, 1.0);
        float n = ciFbm(p * 7.5 + vec2(uLayerSeed, -uTime * 2.5));
        float dissolve = smoothstep(dissolveT - 0.09, dissolveT + 0.09, n + clamp(coreSum, 0.0, 0.45));

        vec3 crimson = vec3(0.96, 0.14, 0.36) * 1.65;
        vec3 violet = vec3(0.72, 0.32, 1.0) * 1.5;
        vec3 col = mix(crimson, violet, clamp(flurrySum * 0.25, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.98, 0.96), clamp(coreSum * 0.95, 0.0, 1.0));

        float radialFade = smoothstep(0.99, 0.80, r);
        float alpha = clamp((flurrySum * 0.45 + coreSum * 1.2) * radialFade * dissolve * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Ultra-thin Crimson-style katana smear arc geometry (narrow razor edge, NOT a thick wide ribbon).
 */
function createThinRazorSmearGeometry(innerR = 0.84, outerR = 1.0, sweepRad = Math.PI * 1.15, segments = 32): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 3;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const widthScale = Math.pow(Math.sin(u * Math.PI), 0.32);
    const curInner = outerR - (outerR - innerR) * widthScale;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = 0.0;
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

function createThinRazorSmearMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uLocalT: { value: 0 },
      uSeed: { value: 1 },
      uColor: { value: new THREE.Color('#e11d48') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);
        float sweep = 1.0 - pow(1.0 - clamp(uLocalT * 3.4, 0.0, 1.0), 3.0);
        float tail = max(0.0, (uLocalT - 0.25) * 1.35);

        float headMask = smoothstep(sweep + 0.08, sweep - 0.02, vUv.x);
        float tailMask = smoothstep(tail - 0.10, tail + 0.06, vUv.x);

        float razorWhite = smoothstep(0.76, 0.96, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
        float crimsonTrail = smoothstep(0.08, 0.52, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float n = ciFbm(vec2(vUv.x * 20.0 - uTime * 6.0 + uSeed, vUv.y * 8.0));
        float dissolve = smoothstep(dissolveT - 0.09, dissolveT + 0.09, n * (0.4 + 0.6 * vUv.y));

        float alpha = headMask * tailMask * crimsonTrail * dissolve;
        if (alpha < 0.02) discard;

        vec3 col = mix(uColor * 1.55, uCoreColor * 1.85, clamp(razorWhite * 1.15, 0.0, 1.0));
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
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

        float outerBorder = smoothstep(0.76, 0.85, edgeDist) * (1.0 - smoothstep(0.96, 1.0, edgeDist));
        float cornerCut = step(0.46, ax) * step(0.46, ay) * smoothstep(0.68, 0.76, edgeDist);
        float innerHairline = smoothstep(0.028, 0.008, abs(edgeDist - 0.68));

        float tickWave = smoothstep(0.14, 0.04, abs(fract(vUv.x * 10.0) - 0.5));
        float tickMask = tickWave * step(0.78, ay) * (1.0 - step(0.94, ay));

        float sheen = exp(-abs((p.x + p.y) - mix(-1.4, 1.4, uLock)) * 4.0) * 0.75;
        float ripple = smoothstep(0.06, 0.015, abs(length(p) - 0.45 - sin(uTime * 7.0 + uSeed) * 0.04)) * 0.65;
        float centerSigil = exp(-min(abs(p.x), abs(p.y)) * 18.0) * smoothstep(0.55, 0.15, edgeDist) * 0.45;

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

function createChronoShardGeometry(): THREE.BufferGeometry {
  const r = 0.24;
  const topY = 0.68;
  const botY = -0.44;
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
        float ring = smoothstep(0.10, 0.018, abs(r - 0.84));
        float shutterGaps = 0.62 + 0.38 * step(0.24, fract(ang * 3.8197));
        vec3 col = mix(vec3(0.72, 0.34, 1.0) * 1.6, vec3(1.0, 0.16, 0.44) * 1.95, uProgress);
        col += vec3(1.0, 0.96, 0.86) * ring * 0.85;
        float alpha = clamp(ring * shutterGaps * (1.0 - uProgress) * uOpacity, 0.0, 1.0);
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
        float core = exp(-abs(p.x) * 4.4 - abs(p.y) * 2.0);
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

/**
 * Climax straight diagonal slash that slices cleanly across the arena, tears open a jagged
 * dark-void dimensional rift, and shatters via Voronoi fractures.
 */
function createDimensionalTearSlashMaterial(): THREE.ShaderMaterial {
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
        vec2 p = vUv * 2.0 - 1.0;
        float absX = abs(p.x);
        if (absX > 0.98) discard;

        // Straight diagonal slash sweep from -1 -> +1 (0.0 -> 0.16)
        float sweepX = mix(-1.05, 1.08, smoothstep(0.0, 0.16, uProgress));
        float cutReveal = 1.0 - smoothstep(sweepX - 0.06, sweepX + 0.02, p.x);
        if (cutReveal < 0.01) discard;

        // Tapered straight razor profile (sharp tips at both ends)
        float taperX = pow(max(0.0, 1.0 - absX * absX), 0.65);
        float openAmt = smoothstep(0.10, 0.38, uProgress) * (1.0 - smoothstep(0.84, 1.0, uProgress) * 0.25);
        float jag = (ciVnoise(vec2(p.x * 11.0, 3.7)) - 0.5) * 0.16 * openAmt;
        float distFromCenter = abs(p.y - jag);

        float halfTear = mix(0.014, 0.36, openAmt) * taperX;
        float insideVoid = 1.0 - smoothstep(halfTear - 0.025, halfTear + 0.01, distFromCenter);
        float rimDist = abs(distFromCenter - halfTear);
        float rimNeedle = 0.0055 / (rimDist + 0.003);
        float rimGlow = exp(-rimDist * 14.0) * taperX;

        // Initial straight razor flash before tearing open
        float initialSlash = (0.0045 / (abs(p.y) + 0.0022)) * taperX * (1.0 - smoothstep(0.14, 0.32, uProgress));

        // Cosmic abyss veins inside torn dimension
        float voidFbm = ciFbm(vec2(p.x * 6.5 - uTime * 0.9, p.y * 8.0 + uTime * 0.6));
        float voidCrack = smoothstep(0.62, 0.84, voidFbm);
        float voidSpecks = step(0.88, ciHash21(floor(vec2(p.x * 42.0, p.y * 18.0))));

        // Voronoi shatter phase (0.52 -> 1.0)
        float shatterT = smoothstep(0.50, 1.0, uProgress);
        float vEdge = ciVoronoiEdge(vUv * vec2(14.0, 5.5) + vec2(1.4, 2.9));
        float shatterCrack = (1.0 - smoothstep(0.0, 0.09 + shatterT * 0.14, vEdge)) * step(0.48, uProgress) * taperX;
        float shatterDissolve = mix(1.0, smoothstep(shatterT * 0.95, shatterT * 0.95 + 0.18, ciVnoise(vUv * vec2(16.0, 6.0))), shatterT);

        vec3 abyssVoid = vec3(0.02, 0.008, 0.06) + vec3(0.56, 0.22, 0.94) * voidCrack * 0.85 + vec3(1.0, 0.86, 0.56) * voidSpecks * 0.9;
        vec3 crimsonRim = vec3(1.0, 0.12, 0.38) * 1.95;
        vec3 violetRim = vec3(0.74, 0.34, 1.0) * 1.6;
        vec3 whiteHot = vec3(1.0, 0.98, 0.98) * 2.3;

        vec3 rimCol = mix(violetRim, crimsonRim, clamp(rimGlow * 1.2, 0.0, 1.0));
        rimCol = mix(rimCol, whiteHot, clamp(rimNeedle * 0.75 + initialSlash * 0.85 + shatterCrack * 1.1, 0.0, 1.0));

        float rimStrength = clamp((rimGlow * 1.1 + rimNeedle * 0.5 + initialSlash * 0.9 + shatterCrack * 1.4) * taperX, 0.0, 1.0);
        vec3 col = mix(abyssVoid, rimCol, rimStrength);

        float alpha = clamp(max(insideVoid * 0.96, rimStrength) * cutReveal * shatterDissolve * uOpacity, 0.0, 0.98);
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

interface FilmCarveSlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  dur: number;
  fxStart: number;
  fxEnd: number;
  fyOffset: number;
  yHeight: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleLen: number;
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

interface RazorSmearSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  baseScale: number;
  spinSpeed: number;
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
  carveSlashes: FilmCarveSlashSlot[];
  celFrames: CelFrameSlot[];
  latticeFloorMesh: THREE.Mesh;
  latticeTiltMesh: THREE.Mesh;
  latticeMats: THREE.ShaderMaterial[];
  smears: RazorSmearSlot[];
  dimensionTearMesh: THREE.Mesh;
  dimensionTearMat: THREE.ShaderMaterial;
  shards: ChronoShardSlot[];
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  sparks: ChronoSparkSlot[];
}

/**
 * Pooled 2.5s Sakuga 3D GLSL VFX for Chronos Imperator (`crimson-clock-marshal`, tier `novel`):
 * 24-FPS Chrono-Cell Projection & Shatter using Crimson-style razor-needle slashes
 * (trailing carve slashes opening the dark-backed 35mm film runway, bold cel-frame prisons,
 * crisscrossing needle-core razor lattices + thin high-speed smear arcs + Hit-Stop,
 * and outward Voronoi crystal shatter with zero giant thick slashes or upward spire).
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
    const carveGeo = new THREE.PlaneGeometry(4.4, 0.34);
    const celGeo = new THREE.PlaneGeometry(2.75, 3.25);
    const latticeGeo = new THREE.PlaneGeometry(1, 1);
    const smearGeo = createThinRazorSmearGeometry(0.84, 1.0, Math.PI * 1.15, 32);
    const tearGeo = new THREE.PlaneGeometry(14.0, 3.0);
    const shardGeo = createChronoShardGeometry();
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    ringGeo.rotateX(-Math.PI / 2);
    const sparkGeo = new THREE.PlaneGeometry(0.36, 1.05);
    this.sharedGeos.push(floorGeo, carveGeo, celGeo, latticeGeo, smearGeo, tearGeo, shardGeo, ringGeo, sparkGeo);

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createChronoFilmFloorMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = 'filmFloor';
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const carveSlashes: FilmCarveSlashSlot[] = [];
      for (let s = 0; s < FILM_CARVE_SLASH_COUNT; s++) {
        const mat = createCrimsonCarveSlashMaterial();
        mat.uniforms.uTint.value = s % 2 === 0 ? 1.0 : 0.15;
        const mesh = new THREE.Mesh(carveGeo, mat);
        mesh.name = 'carveSlash';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);

        const lane = ((s % 5) - 2) * 0.22;
        const frac = s / Math.max(1, FILM_CARVE_SLASH_COUNT - 1);
        carveSlashes.push({
          mesh,
          mat,
          delay: frac * 0.30,
          dur: 0.22,
          fxStart: -0.95 + frac * 1.05,
          fxEnd: -0.15 + frac * 1.10,
          fyOffset: lane,
          yHeight: 0.26 + (s % 3) * 0.22,
          rotX: ((s % 3) - 1) * 0.20,
          rotY: -FILM_REVEAL_ANG + ((s % 4) - 1.5) * 0.22,
          rotZ: (s % 2 === 0 ? 1 : -1) * (0.28 + (s % 3) * 0.16),
          scaleLen: 0.95 + (s % 3) * 0.20,
        });
      }

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
          lockDelay: 0.08 + f * 0.06,
        });
      }

      const latticeMatA = createChronoRazorLatticeMaterial();
      latticeMatA.uniforms.uLayerSeed.value = 1.3;
      const latticeMatB = createChronoRazorLatticeMaterial();
      latticeMatB.uniforms.uLayerSeed.value = 3.7;
      this.allMats.push(latticeMatA, latticeMatB);

      const latticeFloorMesh = new THREE.Mesh(latticeGeo, latticeMatA);
      latticeFloorMesh.name = 'razorLattice';
      latticeFloorMesh.rotation.x = -Math.PI / 2;
      latticeFloorMesh.visible = false;
      const latticeTiltMesh = new THREE.Mesh(latticeGeo, latticeMatB);
      latticeTiltMesh.name = 'razorLattice';
      latticeTiltMesh.rotation.set(-Math.PI * 0.40, 0.25, 0.18);
      latticeTiltMesh.visible = false;
      root.add(latticeFloorMesh, latticeTiltMesh);

      const smears: RazorSmearSlot[] = [];
      for (let k = 0; k < RAZOR_SMEAR_COUNT; k++) {
        const mat = createThinRazorSmearMaterial();
        mat.uniforms.uSeed.value = (k + 1) * 2.13;
        const mesh = new THREE.Mesh(smearGeo, mat);
        mesh.name = 'razorSmear';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        smears.push({ mesh, mat, delay: 0.44 + k * 0.04, baseScale: 4.5, spinSpeed: 10.5 });
      }

      const dimensionTearMat = createDimensionalTearSlashMaterial();
      const dimensionTearMesh = new THREE.Mesh(tearGeo, dimensionTearMat);
      dimensionTearMesh.name = 'dimensionTear';
      dimensionTearMesh.visible = false;
      root.add(dimensionTearMesh);
      this.allMats.push(dimensionTearMat);

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
          speed: 4.2 + (s % 5) * 1.25,
          ySpeed: 1.8 + (s % 4) * 0.65,
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
          speed: 4.2 + (p % 5) * 1.25,
          ySpeed: 1.6 + (p % 4) * 0.65,
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
        carveSlashes,
        celFrames,
        latticeFloorMesh,
        latticeTiltMesh,
        latticeMats: [latticeMatA, latticeMatB],
        smears,
        dimensionTearMesh,
        dimensionTearMat,
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

    inst.root.visible = true;
    inst.floorMesh.position.set(opts.cx, opts.cy + 0.06, opts.cz);
    inst.floorMesh.scale.setScalar(FILM_FLOOR_SIZE * opts.areaScale);
    inst.floorMat.uniforms.uProgress.value = 0;
    inst.floorMat.uniforms.uRevealHead.value = 0;
    inst.floorMat.uniforms.uOpacity.value = 1;

    for (let s = 0; s < FILM_CARVE_SLASH_COUNT; s++) inst.carveSlashes[s].mesh.visible = false;

    inst.latticeFloorMesh.position.set(opts.cx, opts.cy + 0.18, opts.cz);
    inst.latticeFloorMesh.scale.setScalar(13.2 * opts.areaScale);
    inst.latticeFloorMesh.visible = false;
    inst.latticeTiltMesh.position.set(opts.cx, opts.cy + 1.05, opts.cz);
    inst.latticeTiltMesh.scale.setScalar(12.2 * opts.areaScale);
    inst.latticeTiltMesh.visible = false;

    const smearLimit = this.lowQuality ? 3 : RAZOR_SMEAR_COUNT;
    for (let k = 0; k < RAZOR_SMEAR_COUNT; k++) {
      const sm = inst.smears[k];
      sm.mesh.visible = false;
      if (k >= smearLimit) continue;
      const isLeft = k % 2 === 0;
      const anchor = inst.celFrames[k % maxCells];
      sm.delay = 0.44 + k * 0.055;
      sm.baseScale = (3.8 + (k % 3) * 1.1) * opts.areaScale;
      sm.spinSpeed = (isLeft ? 1 : -1) * (10.5 + k * 0.9);
      sm.mesh.position.set(
        k >= 4 ? opts.cx : anchor.x,
        (k >= 4 ? opts.cy + 1.35 : anchor.y) + (k % 3) * 0.18,
        k >= 4 ? opts.cz : anchor.z
      );
      sm.mesh.rotation.set((isLeft ? 1 : -1) * (0.16 + (k % 3) * 0.12), k * 0.9, (isLeft ? -1 : 1) * 0.18);
      sm.mesh.scale.setScalar(sm.baseScale);
      sm.mat.uniforms.uColor.value.set(k % 3 === 2 ? '#a855f7' : '#e11d48');
      sm.mat.uniforms.uProgress.value = 0;
      sm.mat.uniforms.uLocalT.value = 0;
    }

    inst.dimensionTearMesh.position.set(opts.cx, opts.cy + 1.65 * opts.areaScale, opts.cz);
    inst.dimensionTearMesh.rotation.set(0.18, 0.22, 0.44);
    inst.dimensionTearMesh.scale.setScalar(opts.areaScale);
    inst.dimensionTearMesh.visible = false;

    for (let s = 0; s < SHARD_COUNT; s++) inst.shards[s].mesh.visible = false;
    for (let r = 0; r < SHUTTER_RING_COUNT; r++) inst.rings[r].mesh.visible = false;
    for (let p = 0; p < SPARK_COUNT; p++) inst.sparks[p].mesh.visible = false;

    this.hooks.onArenaDim?.(0.78, '#120826', 0.95);
  }

  public update(dtSec: number, timeSec: number): void {
    const cosAng = Math.cos(FILM_REVEAL_ANG);
    const sinAng = Math.sin(FILM_REVEAL_ANG);

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
      const halfFloor = FILM_FLOOR_SIZE * as * 0.5;

      // Phase 1 (0.00s -> 0.48s): Crimson-style razor slash lines carve the 35mm film floor open behind them
      const revealHead = Math.min(1, inst.elapsed / 0.48);
      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uRevealHead.value = revealHead;
      inst.floorMat.uniforms.uOpacity.value = 1;

      const carveCap = this.lowQuality ? 7 : FILM_CARVE_SLASH_COUNT;
      for (let s = 0; s < FILM_CARVE_SLASH_COUNT; s++) {
        const cs = inst.carveSlashes[s];
        if (s >= carveCap) {
          cs.mesh.visible = false;
          continue;
        }
        const st = (inst.elapsed - cs.delay) / cs.dur;
        if (st < 0 || st >= 1) {
          cs.mesh.visible = false;
          continue;
        }
        const fx = cs.fxStart + (cs.fxEnd - cs.fxStart) * st;
        const fy = cs.fyOffset;
        const px = cosAng * fx + sinAng * fy;
        const py = -sinAng * fx + cosAng * fy;
        cs.mesh.visible = true;
        cs.mesh.position.set(inst.cx + px * halfFloor, inst.cy + cs.yHeight * as, inst.cz - py * halfFloor);
        cs.mesh.rotation.set(cs.rotX, cs.rotY, cs.rotZ);
        cs.mesh.scale.setScalar(cs.scaleLen * as);
        cs.mat.uniforms.uProgress.value = st;
        cs.mat.uniforms.uTime.value = timeSec;
        cs.mat.uniforms.uOpacity.value = 1;
      }

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
        const snapScale = (1.30 - 0.30 * (1 - Math.pow(1 - lockT, 3))) * as;
        cf.mesh.visible = true;
        cf.mesh.position.set(cf.x, cf.y + shatter * 0.26 * as, cf.z);
        cf.mesh.rotation.set(0, cf.yaw, cf.tilt * (1 - lockT * 0.5));
        cf.mesh.scale.setScalar(snapScale * (1 + shatter * 0.2));
        cf.mat.uniforms.uTime.value = timeSec;
        cf.mat.uniforms.uLock.value = lockT;
        cf.mat.uniforms.uShatter.value = shatter;
        cf.mat.uniforms.uOpacity.value = 1 - shatter * 0.82;
      }

      // Phase 2 -> 3: Crimson-style crisscrossing needle-core razor lattice + thin high-speed smear arcs
      if (inst.elapsed >= 0.42 && inst.elapsed < 1.95) {
        const latProg = (inst.elapsed - 0.42) / 1.53;
        inst.latticeFloorMesh.visible = true;
        inst.latticeTiltMesh.visible = !this.lowQuality;
        for (let m = 0; m < inst.latticeMats.length; m++) {
          inst.latticeMats[m].uniforms.uProgress.value = latProg;
          inst.latticeMats[m].uniforms.uTime.value = timeSec;
        }
      } else {
        inst.latticeFloorMesh.visible = false;
        inst.latticeTiltMesh.visible = false;
      }

      const smearLimit = this.lowQuality ? 3 : RAZOR_SMEAR_COUNT;
      for (let k = 0; k < RAZOR_SMEAR_COUNT; k++) {
        const sm = inst.smears[k];
        if (k >= smearLimit || inst.elapsed < sm.delay || inst.elapsed > 1.38) {
          sm.mesh.visible = false;
          continue;
        }
        sm.mesh.visible = true;
        const localT = Math.min(1, (inst.elapsed - sm.delay) / 0.34);
        sm.mesh.rotation.y += sm.spinSpeed * dt;
        sm.mat.uniforms.uProgress.value = uProgress;
        sm.mat.uniforms.uTime.value = timeSec;
        sm.mat.uniforms.uLocalT.value = localT;
      }

      // Phase 3 Trigger: Hit-Stop & Voronoi Shatter (0.92s)
      if (!inst.impactFired && inst.elapsed >= SEVERANCE_TIME_SEC) {
        inst.impactFired = true;
        inst.hitStopTimer = HIT_STOP_DURATION_SEC;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#e11d48', HIT_STOP_DURATION_SEC);
        this.hooks.onSpeedLines?.(1.0, 0.55);
        this.hooks.onFlash?.('#f3e8ff', 0.72);
        inst.onImpactCallback?.();
      }

      // Climax: straight diagonal slash tearing open dimension & shattering via Voronoi (0.92s -> 1.92s)
      if (inst.elapsed >= SEVERANCE_TIME_SEC && inst.elapsed < 1.92) {
        const dtTear = (inst.elapsed - SEVERANCE_TIME_SEC) / 1.00;
        inst.dimensionTearMesh.visible = true;
        inst.dimensionTearMat.uniforms.uTime.value = timeSec;
        inst.dimensionTearMat.uniforms.uProgress.value = dtTear;
        inst.dimensionTearMat.uniforms.uOpacity.value = 1;
      } else {
        inst.dimensionTearMesh.visible = false;
      }

      // Low-arcing outward Voronoi shatter shards, horizontal shutter rings & sparks (>= 0.92s)
      if (inst.elapsed >= SEVERANCE_TIME_SEC) {
        const dtBoom = inst.elapsed - SEVERANCE_TIME_SEC;
        const boomFade = Math.max(0, 1 - dtBoom / 1.15);

        const shardCap = this.lowQuality ? 10 : SHARD_COUNT;
        for (let s = 0; s < shardCap; s++) {
          const sh = inst.shards[s];
          if (boomFade <= 0.02) {
            sh.mesh.visible = false;
            continue;
          }
          sh.mesh.visible = true;
          const r = (0.45 + dtBoom * sh.speed) * as;
          const y = Math.max(0.16, 0.95 + dtBoom * sh.ySpeed - 3.6 * dtBoom * dtBoom);
          sh.mesh.position.set(inst.cx + Math.cos(sh.angle) * r, inst.cy + y, inst.cz + Math.sin(sh.angle) * r);
          sh.mesh.rotation.set(dtBoom * sh.spinX, sh.angle, dtBoom * sh.spinZ);
          sh.mesh.scale.setScalar((0.90 + 0.34 * boomFade) * as);
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
          const y = Math.max(0.16, 0.55 + dtBoom * sp.ySpeed - 2.6 * dtBoom * dtBoom);
          sp.mesh.position.set(inst.cx + Math.cos(sp.angle) * r, inst.cy + y, inst.cz + Math.sin(sp.angle) * r);
          sp.mesh.rotation.y = -sp.angle;
          sp.mesh.scale.setScalar(1.0 * boomFade * as);
          sp.mat.uniforms.uOpacity.value = boomFade;
        }
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
