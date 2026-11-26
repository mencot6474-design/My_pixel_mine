import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const FILM_FLOOR_SIZE = 16.0;
const FILM_REVEAL_ANG = 0.42;
const FILM_CARVE_SLASH_COUNT = 14;
const CEL_FRAME_MAX = 6;
const SHARD_COUNT = 24;
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

/**
 * Back-attachment Halo Disc for Chronos Imperator (`crimson-clock-marshal`):
 * 24-FPS quantized shutter ticks, thin film-sprocket bezel, & upright viewfinder brackets
 * with an open center so the Chibi and its 3 sprite clock rings stay crisp.
 */
export function createChronosBackHaloShaderMaterial(): THREE.ShaderMaterial {
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.42) discard;

        float ang = atan(p.y, p.x);
        float cycle = fract(uTime * 0.4);
        float sakugaPulse = smoothstep(0.08, 0.34, cycle) * (1.0 - smoothstep(0.68, 0.96, cycle));
        float steppedTick = floor(uTime * 12.0) * 0.261799;

        // Outer & inner razor ring tracks + 24 stepped shutter ticks
        float outerRing = exp(-pow((r - 0.88) * 62.0, 2.0));
        float innerRing = exp(-pow((r - 0.72) * 68.0, 2.0));
        float ticks24 = smoothstep(0.55, 0.92, cos(ang * 24.0 - steppedTick))
          * smoothstep(0.73, 0.75, r) * smoothstep(0.87, 0.85, r);

        // 4 diagonal viewfinder corner brackets framing the silhouette
        float diagCorners = pow(max(0.0, abs(cos(ang * 2.0 - 1.5708))), 12.0);
        float cornerArc = diagCorners * exp(-pow((r - 0.93) * 44.0, 2.0));

        // Sweeping crimson-gold shutter gleam
        float sweepDiff = fract((ang - uTime * 1.8) / 6.2831853);
        float shutterFlash = exp(-sweepDiff * 7.5) * smoothstep(0.70, 0.74, r) * smoothstep(0.90, 0.86, r);

        vec3 neonViolet = vec3(0.70, 0.32, 1.0) * (1.25 + sakugaPulse * 0.35);
        vec3 crimsonFlame = vec3(1.0, 0.14, 0.40) * (1.45 + sakugaPulse * 0.45);
        vec3 champGold = vec3(1.0, 0.86, 0.50) * 1.55;
        vec3 whiteHot = vec3(1.0, 0.97, 1.0) * 1.85;

        vec3 col = mix(neonViolet, champGold, clamp(ticks24 * 0.8 + cornerArc * 0.95, 0.0, 1.0));
        col = mix(col, crimsonFlame, clamp(shutterFlash * 1.15, 0.0, 1.0));
        col = mix(col, whiteHot, clamp(outerRing * 0.55 + shutterFlash * 0.45, 0.0, 1.0));

        float alpha = clamp((outerRing * 0.95 + innerRing * 0.75 + ticks24 * 0.85 + cornerArc * 1.1 + shutterFlash * 0.8) * uOpacity, 0.0, 0.92);
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

/** Flat sharp polygonal glass splinter pane for Chronos Imperator's back wings. */
export function createChronosBackGlassShardGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    -0.18, -0.34, 0.0,
     0.22, -0.10, 0.0,
     0.06,  0.52, 0.0,
    -0.18, -0.34, 0.0,
     0.06,  0.52, 0.0,
    -0.14,  0.24, 0.0,
  ]);
  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.25,
    0.6, 1.0,
    0.0, 0.0,
    0.6, 1.0,
    0.15, 0.78,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Reflective translucent violet-crimson glass pane shader for Chronos Imperator's back wings. */
export function createChronosBackGlassMaterial(): THREE.ShaderMaterial {
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

      void main() {
        float edgeX = min(vUv.x, 1.0 - vUv.x);
        float edgeY = min(vUv.y, 1.0 - vUv.y);
        float rim = 1.0 - smoothstep(0.02, 0.16, min(edgeX, edgeY));
        float glint = exp(-abs((vUv.x - vUv.y) - sin(uTime * 2.6) * 0.35) * 8.0) * 0.85;

        vec3 glassTint = mix(vec3(0.46, 0.22, 0.86), vec3(0.94, 0.22, 0.50), vUv.y);
        vec3 col = mix(glassTint, vec3(1.0, 0.94, 0.78) * 1.5, clamp(rim * 0.85 + glint, 0.0, 1.0));
        float alpha = clamp((0.46 + rim * 0.48 + glint * 0.32) * uOpacity, 0.0, 0.92);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Straight slender katana-blade geometry for Chronos Imperator's upper shoulder pair. */
export function createChronosBackRazorBladeGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    -0.055, -0.35, 0.0,
     0.055, -0.35, 0.0,
     0.028,  0.58, 0.0,
    -0.055, -0.35, 0.0,
     0.028,  0.58, 0.0,
    -0.028,  0.68, 0.0,
  ]);
  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.85, 0.92,
    0.0, 0.0,
    0.85, 0.92,
    0.15, 1.0,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Crimson-flame + white-gold razor edge shader for Chronos Imperator's flanking back blades. */
export function createChronosBackBladeShaderMaterial(): THREE.ShaderMaterial {
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

      void main() {
        float center = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float tip = smoothstep(0.0, 0.14, vUv.y);
        float pulse = 0.85 + 0.15 * sin(vUv.y * 10.0 - uTime * 6.0);
        vec3 crimson = vec3(1.0, 0.14, 0.38) * 1.55;
        vec3 goldWhite = vec3(1.0, 0.94, 0.82) * 1.95;
        vec3 col = mix(crimson, goldWhite, clamp(pow(center, 1.8) * 1.1, 0.0, 1.0)) * pulse;
        float alpha = clamp((0.55 + center * 0.45) * tip * uOpacity, 0.0, 0.96);
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

  float ciStarfield(vec2 p) {
    vec2 gv = fract(p) - 0.5;
    vec2 id = floor(p);
    float rnd = ciHash21(id);
    float d = length(gv - (vec2(rnd, fract(rnd * 17.3)) - 0.5) * 0.55);
    return smoothstep(0.16, 0.01, d) * step(0.48, rnd);
  }
`;

function createChronoFilmFloorMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uRevealHead: { value: 0 },
      uImpact: { value: 0 },
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
      uniform float uImpact;
      uniform float uOpacity;
      varying vec2 vUv;
      ${CHRONOS_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;

        // Pure bold 35mm cinema film-strip runway (NO circular seal ring!)
        float ang = ${FILM_REVEAL_ANG.toFixed(2)};
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 fp = rot * p;

        // Soft lengthwise fade at far ends of the runway, crisp width edges for the film strip
        float endFade = 1.0 - smoothstep(0.80, 0.99, abs(fp.x));
        float stripMask = 1.0 - smoothstep(0.62, 0.68, abs(fp.y));
        if (endFade < 0.01 || stripMask < 0.01) discard;

        // Sweeping cinema projection reveal with bright leading playhead glow
        float revealX = mix(-1.08, 1.10, uRevealHead);
        float slashNoise = (ciVnoise(vec2(fp.y * 5.0, uRevealHead * 4.0)) - 0.5) * 0.08;
        float carvedReveal = 1.0 - smoothstep(revealX - 0.14 + slashNoise, revealX + 0.02 + slashNoise, fp.x);
        if (carvedReveal < 0.01) discard;
        float playheadGlow = exp(-abs(fp.x - revealX) * 18.0) * step(uRevealHead, 0.98) * stripMask;

        // Thick, bold 35mm film rails (outer borders + inner frame tracks)
        float railOuter = smoothstep(0.068, 0.018, abs(abs(fp.y) - 0.59));
        float railInner = smoothstep(0.042, 0.012, abs(abs(fp.y) - 0.37));

        // Large, unmistakable scrolling cinema sprocket holes along BOTH borders
        float scrollX = fp.x * 7.2 - uProgress * 3.0;
        float sprocketCell = fract(scrollX);
        float sprocketHole = smoothstep(0.16, 0.24, sprocketCell) * (1.0 - smoothstep(0.76, 0.84, sprocketCell));
        float sprocketBand = smoothstep(0.095, 0.042, abs(abs(fp.y) - 0.48)) * sprocketHole;
        float sprocketBorder = smoothstep(0.115, 0.092, abs(abs(fp.y) - 0.48)) * (1.0 - sprocketBand * 0.65);

        // Bold vertical film-frame divider bars + glowing cinema cell interior
        float framePos = fract(fp.x * 3.6 - uProgress * 1.5);
        float frameBar = smoothstep(0.062, 0.016, abs(framePos - 0.5)) * smoothstep(0.39, 0.33, abs(fp.y));
        float cellInterior = smoothstep(0.37, 0.28, abs(fp.y)) * (1.0 - frameBar * 0.75);
        float scanline = 0.82 + 0.18 * sin(fp.y * 64.0 - uTime * 16.0);
        float mist = ciFbm(fp * 3.8 + vec2(uTime * 1.1, 0.0)) * cellInterior;
        float stars = ciStarfield(fp * 10.0 + vec2(-uTime * 0.35, 0.0)) * cellInterior;

        // Smooth FBM ember dissolve on exit (no abrupt pop-out)
        float dissolveNoise = ciFbm(fp * 4.5 + vec2(uTime * 0.4, -uTime * 0.3));
        float envFade = 1.0 - smoothstep(0.68, 0.99, uProgress + (dissolveNoise - 0.5) * 0.24);

        vec3 neonViolet = vec3(0.68, 0.24, 1.0);
        vec3 crimson = vec3(1.0, 0.12, 0.38);
        vec3 champGold = vec3(1.0, 0.88, 0.46);
        vec3 whiteHot = vec3(1.0, 0.98, 0.96);

        float impactBoost = 1.0 + uImpact * 1.25;
        vec3 col = neonViolet * (cellInterior * (0.28 + mist * 0.65) + railInner * 1.15 + sprocketBorder * 0.45) * scanline;
        col += crimson * (railOuter * 1.35 + frameBar * 1.25 + mist * 0.42);
        col += champGold * (sprocketBand * 1.45 + pow(railOuter, 1.8) * 0.75 + stars * 1.3);
        col += whiteHot * (playheadGlow * 1.5 + (railOuter + frameBar) * uImpact * 1.1);
        col *= impactBoost;

        float detailEnergy =
          railOuter * 1.0 +
          railInner * 0.82 +
          sprocketBand * 0.95 +
          frameBar * 0.92 +
          cellInterior * (0.26 + mist * 0.45) +
          stars * 0.7 +
          playheadGlow;
        float alpha = clamp(detailEnergy * carvedReveal * endFade * stripMask * envFade * uOpacity, 0.0, 1.0);
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

        float dist = abs(p.y);

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
          float d = abs(rp.y - off);
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

        float outerBorder = smoothstep(0.78, 0.86, edgeDist) * (1.0 - smoothstep(0.96, 1.0, edgeDist));
        float cornerCut = step(0.46, ax) * step(0.46, ay) * smoothstep(0.68, 0.76, edgeDist);
        float innerHairline = exp(-abs(edgeDist - 0.68) * 34.0) * 0.85;

        float tickWave = smoothstep(0.14, 0.04, abs(fract(vUv.x * 10.0) - 0.5));
        float tickMask = tickWave * step(0.78, ay) * (1.0 - step(0.94, ay));

        float neb = ciFbm(vUv * 4.0 + vec2(uSeed, uTime * 0.55));
        float stars = ciStarfield(vUv * 10.0 + vec2(uSeed, 0.0));
        float sheen = exp(-abs((p.x + p.y) - mix(-1.4, 1.4, uLock)) * 4.0) * 0.95;
        float centerSigil = (exp(-abs(p.x) * 22.0) * exp(-abs(p.y) * 4.0) + exp(-abs(p.y) * 22.0) * exp(-abs(p.x) * 4.0)) * 0.85;
        float shatterFlash = uShatter * 1.35;

        vec3 glassViolet = vec3(0.56, 0.22, 0.98);
        vec3 crimson = vec3(0.98, 0.14, 0.38);
        vec3 frameGold = vec3(1.0, 0.88, 0.50);
        vec3 hotWhite = vec3(1.0, 0.98, 1.0);

        vec3 interior = mix(vec3(0.14, 0.04, 0.34), glassViolet, neb) * 0.68 + hotWhite * stars * 0.9;
        float lineEnergy = clamp(outerBorder * 1.25 + cornerCut * 1.1 + innerHairline + tickMask + sheen + centerSigil, 0.0, 1.6);
        vec3 glowCol = mix(crimson, frameGold, clamp(cornerCut * 0.85 + tickMask * 0.9, 0.0, 1.0));
        glowCol = mix(glowCol, hotWhite, clamp(outerBorder * 0.5 + sheen * 0.75 + shatterFlash, 0.0, 1.0));

        vec3 col = interior + glowCol * (lineEnergy + shatterFlash);
        float alpha = clamp((0.46 + lineEnergy * 0.68 + shatterFlash * 0.5) * uOpacity, 0.0, 1.0);
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

function createChronoShardGeometry(): THREE.BufferGeometry {
  // Flat sharp polygonal glass splinter pane (serpihan kaca), NOT a thick spike or cone
  const positions = new Float32Array([
    -0.36, -0.14, 0.0,
     0.44, -0.05, 0.0,
     0.12,  0.34, 0.0,
    -0.36, -0.14, 0.0,
     0.12,  0.34, 0.0,
    -0.22,  0.22, 0.0,
  ]);
  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.2,
    0.6, 1.0,
    0.0, 0.0,
    0.6, 1.0,
    0.15, 0.8,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function createChronoShardMaterial(): THREE.ShaderMaterial {
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
      void main() {
        // Crisp reflective glass-pane edge bevel + diagonal specular glint (no crack texture)
        float edgeX = min(vUv.x, 1.0 - vUv.x);
        float edgeY = min(vUv.y, 1.0 - vUv.y);
        float rim = 1.0 - smoothstep(0.02, 0.16, min(edgeX, edgeY));
        float spec = exp(-abs((vUv.x - vUv.y) - sin(uTime * 5.0) * 0.25) * 9.0) * 0.8;

        vec3 glassTint = mix(vec3(0.58, 0.24, 1.0), vec3(0.98, 0.18, 0.46), vUv.y);
        vec3 col = glassTint * 0.95 + vec3(1.0, 0.92, 0.68) * (rim * 1.35 + spec * 1.25);
        float alpha = clamp((0.55 + rim * 0.45 + spec * 0.35) * uOpacity, 0.0, 1.0);
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
 * Climax straight horizontal dimension-cut slash: sweeps cleanly left-to-right high above the pit
 * floor (zero ground clipping), flares with a sleek crimson-violet-gold astral slit & center star gleam,
 * then snaps cleanly as 24 flat glass shards burst outward.
 */
function createDimensionalTearSlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uProgress;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float nx = uv.x * 2.0 - 1.0;
        float ny = uv.y * 2.0 - 1.0;
        // Organic sakuga whip-arch & elastic rip ripple along the giant slash (zero stiffness!)
        float openEnv = smoothstep(0.05, 0.24, uProgress) * (1.0 - smoothstep(0.62, 0.96, uProgress));
        float arch = (1.0 - nx * nx) * 0.65 * openEnv;
        float wave = sin(nx * 9.0 - uTime * 22.0) * 0.16 * openEnv * (1.0 - abs(nx));
        pos.y += arch + wave;
        pos.z += (1.0 - ny * ny) * (1.0 - nx * nx) * 0.45 * openEnv;
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
        vec2 p = vUv * 2.0 - 1.0;
        float absX = abs(p.x);
        if (absX > 0.99) discard;

        // Ultra-snappy eased left -> right katana whip-sweep (0.0 -> 0.16) with blazing comet head
        float sweepT = clamp(uProgress / 0.16, 0.0, 1.0);
        float sweepEase = 1.0 - pow(1.0 - sweepT, 3.0);
        float sweepX = mix(-1.08, 1.12, sweepEase);
        float cutReveal = 1.0 - smoothstep(sweepX - 0.10, sweepX + 0.02, p.x);
        if (cutReveal < 0.01) discard;
        float leadComet = exp(-abs(p.x - sweepX) * 14.0) * exp(-abs(p.y) * 9.0) * (1.0 - smoothstep(0.14, 0.24, uProgress));

        // Fluid sakuga open -> sleek razor-thin dimensional slit -> graceful snap-shut pinch on exit
        float taperX = pow(max(0.0, 1.0 - absX * absX), 1.05);
        float openPhase = smoothstep(0.06, 0.22, uProgress);
        float closePhase = 1.0 - smoothstep(0.56, 0.96, uProgress);
        float splitOpen = openPhase * closePhase;
        float halfSeam = mix(0.008, 0.145, splitOpen) * taperX;

        // Razor-sharp dimensional cut edges (sleek & thin, zero bloated thickness!)
        float distY = abs(p.y);
        float jag = (ciFbm(vec2(p.x * 7.2 - uTime * 3.0, p.y * 5.0)) - 0.5) * 0.045 * splitOpen;
        float insideSlit = (1.0 - smoothstep(halfSeam - 0.018, halfSeam + 0.012, distY + jag)) * splitOpen;
        float rimDist = abs(distY - halfSeam + jag);

        float needle = (0.0095 / (rimDist + 0.0022)) * taperX;
        float aura = (0.022 / (rimDist + 0.014)) * taperX;
        float initialFlash = (0.011 / (distY + 0.0025)) * taperX * (1.0 - smoothstep(0.10, 0.22, uProgress));

        // Deep astral galaxy nebula + twinkling stars inside the wide torn space + subtle crisp center accent
        float astralFlow = ciFbm(vec2(p.x * 4.6 - uTime * 2.8, p.y * 5.2));
        float astralStars = ciStarfield(vec2(p.x * 13.0 - uTime * 0.9, p.y * 6.5));
        float starH = exp(-abs(p.x) * 3.8 - abs(p.y) * 20.0) * 0.55;
        float starV = exp(-abs(p.x) * 20.0 - abs(p.y) * 4.2) * 0.55;
        float centerCore = exp(-length(vec2(p.x * 1.6, p.y * 2.4)) * 6.2) * 0.35;
        float centerStar = (starH + starV + centerCore) * openPhase * closePhase;

        // Organic FBM ember-erosion exit dissolve (no stiff fade-out!)
        float exitNoise = ciFbm(vec2(p.x * 6.0 + uTime * 0.8, p.y * 6.0 - uTime * 1.2));
        float fadeOut = 1.0 - smoothstep(0.60, 0.99, uProgress + (exitNoise - 0.5) * 0.28);
        float pulse = 0.92 + 0.08 * sin(p.x * 14.0 - uTime * 24.0);

        vec3 deepVoid = vec3(0.28, 0.06, 0.56);
        vec3 violet = vec3(0.68, 0.24, 0.98) * 1.25;
        vec3 crimson = vec3(0.98, 0.10, 0.34) * 1.45;
        vec3 champGold = vec3(1.0, 0.84, 0.44) * 1.25;
        vec3 whiteHot = vec3(1.0, 0.96, 0.96) * 1.45;

        vec3 slitGlow = (mix(deepVoid, crimson * 0.72, astralFlow * 0.8) + champGold * astralStars * 1.25) * insideSlit * 1.05;
        vec3 col = mix(violet, crimson, clamp(aura * 0.95, 0.0, 1.0));
        col = mix(col, champGold, clamp(centerStar * 0.45, 0.0, 1.0));
        col = mix(col, whiteHot, clamp(needle * 0.62 + initialFlash * 0.65 + leadComet * 0.65 + centerCore * 0.55, 0.0, 1.0));
        col += slitGlow;

        float alpha = clamp((needle * 0.95 + aura * 0.65 + initialFlash * 0.75 + leadComet * 0.75 + insideSlit * 0.86 + centerStar * 0.65) * pulse * cutReveal * fadeOut * uOpacity, 0.0, 0.96);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Null-Singularity-style Twin Crossed 4-Point Chrono Star Flare at the Dimension-Tear core. */
function createChronoStarFlareMaterial(): THREE.ShaderMaterial {
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

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edgeFade = 1.0 - smoothstep(0.65, 0.98, r);

        float pulse = 0.92 + 0.12 * sin(uTime * 16.0);
        // Long, piercing razor-sharp 8-point anime star explosion (crisp rays, tight jewel core)
        float rayH = exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 1.45);
        float rayV = exp(-abs(p.x) * 24.0) * exp(-abs(p.y) * 1.45);
        float diagP = (p.x + p.y) * 0.7071;
        float diagQ = (p.x - p.y) * 0.7071;
        float rayDiag = (exp(-abs(diagP) * 28.0) * exp(-abs(diagQ) * 2.8) + exp(-abs(diagQ) * 28.0) * exp(-abs(diagP) * 2.8)) * 0.68;

        float core = exp(-r * 8.5);
        float haloV = exp(-abs(r - (0.22 + uProgress * 0.18)) * 22.0);
        float haloC = exp(-abs(r - (0.30 + uProgress * 0.20)) * 20.0);

        float starEnergy = (rayH + rayV + rayDiag) * pulse;
        vec3 col = vec3(1.0, 0.86, 0.44) * starEnergy * 1.35;
        col += vec3(1.0, 0.98, 0.96) * (core * 1.55 + pow(starEnergy, 2.0) * 0.85);
        col += vec3(0.72, 0.28, 1.0) * haloV * 1.05;
        col += vec3(1.0, 0.12, 0.38) * haloC * 1.05;

        float alpha = clamp((starEnergy * 1.05 + core * 0.95 + haloV * 0.72 + haloC * 0.68) * edgeFade * uOpacity, 0.0, 1.0);
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
  dimensionTearMesh: THREE.Mesh;
  dimensionTearMat: THREE.ShaderMaterial;
  starFlareA: THREE.Mesh;
  starFlareB: THREE.Mesh;
  starFlareMat: THREE.ShaderMaterial;
  shards: ChronoShardSlot[];
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
    const carveGeo = new THREE.PlaneGeometry(5.2, 0.42);
    const celGeo = new THREE.PlaneGeometry(3.15, 3.85);
    const latticeGeo = new THREE.PlaneGeometry(1, 1);
    const tearGeo = new THREE.PlaneGeometry(22.4, 3.4, 20, 6);
    const starFlareGeo = new THREE.PlaneGeometry(16.5, 16.5);
    const shardGeo = createChronoShardGeometry();
    const sparkGeo = new THREE.PlaneGeometry(0.36, 1.05);
    this.sharedGeos.push(floorGeo, carveGeo, celGeo, latticeGeo, tearGeo, starFlareGeo, shardGeo, sparkGeo);

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

      const dimensionTearMat = createDimensionalTearSlashMaterial();
      const dimensionTearMesh = new THREE.Mesh(tearGeo, dimensionTearMat);
      dimensionTearMesh.name = 'dimensionTear';
      dimensionTearMesh.visible = false;
      root.add(dimensionTearMesh);
      this.allMats.push(dimensionTearMat);

      const starFlareMat = createChronoStarFlareMaterial();
      const starFlareA = new THREE.Mesh(starFlareGeo, starFlareMat);
      starFlareA.name = 'chronoStarFlare';
      starFlareA.visible = false;
      const starFlareB = new THREE.Mesh(starFlareGeo, starFlareMat);
      starFlareB.name = 'chronoStarFlare';
      starFlareB.visible = false;
      root.add(starFlareA, starFlareB);
      this.allMats.push(starFlareMat);

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
        dimensionTearMesh,
        dimensionTearMat,
        starFlareA,
        starFlareB,
        starFlareMat,
        shards,
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

    inst.dimensionTearMesh.position.set(opts.cx, opts.cy + 2.35 * opts.areaScale, opts.cz);
    inst.dimensionTearMesh.rotation.set(-0.18, 0.0, 0.0);
    inst.dimensionTearMesh.scale.setScalar(opts.areaScale);
    inst.dimensionTearMesh.visible = false;
    inst.starFlareA.visible = false;
    inst.starFlareB.visible = false;

    for (let s = 0; s < SHARD_COUNT; s++) inst.shards[s].mesh.visible = false;
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

      // Phase 1 (0.00s -> 0.48s): Crimson-style razor slash lines carve the luminous 35mm film floor open behind them
      const revealHead = Math.min(1, inst.elapsed / 0.48);
      const floorImpact =
        inst.elapsed >= SEVERANCE_TIME_SEC
          ? Math.max(0, 1 - (inst.elapsed - SEVERANCE_TIME_SEC) / 0.45)
          : 0;
      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uRevealHead.value = revealHead;
      inst.floorMat.uniforms.uImpact.value = floorImpact;
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

      // Phase 1 -> 2: Null-Singularity-style Sky-Dropping 24-FPS Cel-Frame Prisons that crack-shake & shatter on climax!
      const celDropStep = this.lowQuality ? 0.07 : 0.042;
      for (let f = 0; f < inst.activeCelCount; f++) {
        const cf = inst.celFrames[f];
        const dropDelay = 0.04 + f * celDropStep;
        const localDrop = inst.elapsed - dropDelay;
        const shatterTime = SEVERANCE_TIME_SEC + 0.08 + f * 0.025;
        if (localDrop < 0 || inst.elapsed >= shatterTime) {
          cf.mesh.visible = false;
          continue;
        }
        const dropT = Math.min(1, localDrop / 0.16);
        const dropEase = 1 - Math.pow(1 - dropT, 3);
        const settle = dropT > 0.78 ? Math.sin(((dropT - 0.78) / 0.22) * Math.PI) : 0;

        // Pre-shatter crack tremor right before severance
        const crackT = Math.max(0, Math.min(1, (inst.elapsed - (shatterTime - 0.10)) / 0.10));
        const shakeX = crackT > 0 ? Math.sin(inst.elapsed * 95.0 + f * 3.1) * 0.14 * crackT * as : 0;
        const dropY = cf.y + (7.6 * (1 - dropEase)) * as;

        cf.mesh.visible = true;
        cf.mesh.position.set(cf.x + shakeX, dropY, cf.z);
        cf.mesh.lookAt(inst.cx, dropY, inst.cz);
        cf.mesh.rotateZ(cf.tilt * (1 - dropEase * 0.5));
        cf.mesh.scale.set((1 + 0.08 * settle + 0.10 * crackT) * as, (1 - 0.09 * settle + 0.10 * crackT) * as, as);
        cf.mat.uniforms.uTime.value = timeSec;
        cf.mat.uniforms.uLock.value = dropT;
        cf.mat.uniforms.uShatter.value = crackT;
        cf.mat.uniforms.uOpacity.value = Math.min(1, dropT * 3.2);
      }

      // Phase 2 (0.42s -> 0.90s): Crimson-style crisscrossing needle-core razor lattice + thin high-speed smear arcs
      // Ends cleanly BEFORE 0.92s so no messy random slashes linger at the climax!
      if (inst.elapsed >= 0.42 && inst.elapsed < SEVERANCE_TIME_SEC) {
        const latProg = (inst.elapsed - 0.42) / (SEVERANCE_TIME_SEC - 0.42);
        inst.latticeFloorMesh.visible = true;
        inst.latticeTiltMesh.visible = !this.lowQuality;
        for (let m = 0; m < inst.latticeMats.length; m++) {
          inst.latticeMats[m].uniforms.uProgress.value = latProg * 0.48;
          inst.latticeMats[m].uniforms.uTime.value = timeSec;
        }
      } else {
        inst.latticeFloorMesh.visible = false;
        inst.latticeTiltMesh.visible = false;
      }

      // Phase 3 Trigger: Straight Diagonal Spatial Cut + Hit-Stop (0.92s)
      if (!inst.impactFired && inst.elapsed >= SEVERANCE_TIME_SEC) {
        inst.impactFired = true;
        inst.hitStopTimer = HIT_STOP_DURATION_SEC;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#e11d48', HIT_STOP_DURATION_SEC);
        this.hooks.onSpeedLines?.(1.0, 0.55);
        this.hooks.onFlash?.('#f3e8ff', 0.32);
        inst.onImpactCallback?.();
      }

      // Climax: Colossal fluid horizontal dimension-tear with elastic pop-in & snap-shut exit + Twin 13.2m Star Flare (0.92s -> 1.84s)
      if (inst.elapsed >= SEVERANCE_TIME_SEC && inst.elapsed < 1.84) {
        const dtTear = (inst.elapsed - SEVERANCE_TIME_SEC) / 0.92;
        const enterT = Math.min(1, dtTear / 0.18);
        // Elastic easeOutBack pop-in on open, smooth pinch-shut on exit
        const enterBack = 1 + 1.7 * Math.pow(enterT - 1, 3) + 0.7 * Math.pow(enterT - 1, 2);
        const exitT = Math.max(0, (dtTear - 0.62) / 0.38);
        const exitEase = exitT * exitT;
        const tearScaleX = (0.78 + 0.30 * enterBack + 0.16 * exitEase) * as;
        const tearScaleY = Math.max(0.08, (0.22 + 0.92 * enterBack) * (1 - 0.88 * exitEase)) * as;

        inst.dimensionTearMesh.visible = true;
        inst.dimensionTearMesh.position.set(inst.cx, inst.cy + (2.55 + 0.28 * Math.sin(dtTear * Math.PI)) * as, inst.cz);
        inst.dimensionTearMesh.rotation.set(-0.20, 0.0, 0.07 * (1 - enterT) - 0.04 * exitEase);
        inst.dimensionTearMesh.scale.set(tearScaleX, tearScaleY, as);
        inst.dimensionTearMat.uniforms.uTime.value = timeSec;
        inst.dimensionTearMat.uniforms.uProgress.value = dtTear;
        inst.dimensionTearMat.uniforms.uOpacity.value = 1;

        const flarePop = Math.min(1, dtTear / 0.16);
        const flarePopEase = 1 + 1.5 * Math.pow(flarePop - 1, 3) + 0.5 * Math.pow(flarePop - 1, 2);
        const flareExit = Math.max(0, (dtTear - 0.50) / 0.50);
        const flareFade = 1 - flareExit * flareExit;
        const flareScale = Math.max(0.05, (0.38 + 0.88 * flarePopEase) * (1 - 0.38 * flareExit)) * as;
        const flareY = inst.cy + 2.55 * as;
        const flareRotY = inst.elapsed * 1.55;
        inst.starFlareA.visible = flareFade > 0.02;
        inst.starFlareA.position.set(inst.cx, flareY, inst.cz);
        inst.starFlareA.rotation.set(0, flareRotY, 0);
        inst.starFlareA.scale.setScalar(flareScale);
        inst.starFlareB.visible = flareFade > 0.02;
        inst.starFlareB.position.set(inst.cx, flareY, inst.cz);
        inst.starFlareB.rotation.set(0, flareRotY + Math.PI * 0.5, 0);
        inst.starFlareB.scale.setScalar(flareScale);
        inst.starFlareMat.uniforms.uTime.value = timeSec;
        inst.starFlareMat.uniforms.uProgress.value = dtTear;
        inst.starFlareMat.uniforms.uOpacity.value = flareFade * 0.96;
      } else {
        inst.dimensionTearMesh.visible = false;
        inst.starFlareA.visible = false;
        inst.starFlareB.visible = false;
      }

      // Luminous 3D glass shards bursting along the horizontal dimension-cut & cel-frames + sparks (>= 0.92s)
      if (inst.elapsed >= SEVERANCE_TIME_SEC) {
        const dtBoom = inst.elapsed - SEVERANCE_TIME_SEC;
        const boomFade = Math.max(0, 1 - dtBoom / 1.28);

        const shardCap = this.lowQuality ? 10 : SHARD_COUNT;
        const shatterStart = SEVERANCE_TIME_SEC + 0.05;
        const dtGlass = Math.max(0, inst.elapsed - shatterStart);
        const glassFade = Math.max(0, 1 - dtGlass / 1.24);
        for (let s = 0; s < shardCap; s++) {
          const sh = inst.shards[s];
          if (inst.elapsed < shatterStart || glassFade <= 0.02) {
            sh.mesh.visible = false;
            continue;
          }
          sh.mesh.visible = true;
          const lineFrac = ((s / Math.max(1, shardCap - 1)) - 0.5) * 11.4;
          const baseX = lineFrac;
          const baseY = 2.35 + ((s % 3) - 1) * 0.28;
          const baseZ = ((s % 2) - 0.5) * 0.35;
          const r = dtGlass * sh.speed * 1.15;
          const x = inst.cx + (baseX + Math.cos(sh.angle) * r) * as;
          const y = Math.max(inst.cy + 0.16, inst.cy + (baseY + dtGlass * (sh.ySpeed * 1.35) - 2.6 * dtGlass * dtGlass) * as);
          const z = inst.cz + (baseZ + Math.sin(sh.angle) * r) * as;
          sh.mesh.position.set(x, y, z);
          sh.mesh.rotation.set(dtGlass * sh.spinX, sh.angle + dtGlass * 3.4, dtGlass * sh.spinZ);
          sh.mesh.scale.setScalar((1.18 + 0.45 * (s % 3) * 0.35) * glassFade * as);
          sh.mat.uniforms.uTime.value = timeSec;
          sh.mat.uniforms.uOpacity.value = glassFade;
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
