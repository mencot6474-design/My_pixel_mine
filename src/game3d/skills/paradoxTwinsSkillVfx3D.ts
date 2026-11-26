import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const BARRAGE_BEAT_COUNT = 6;
const SPATIAL_CUBE_COUNT = 24;
const SHATTER_SHARD_COUNT = 14;
const ARC_BOLT_COUNT = 6;
const ORE_FLASH_COUNT = 6;
const SPARK_PARTICLE_COUNT = 36;

const PARADOX_MATH_GLSL = `
  float pxHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.53);
    return fract(p.x * p.y);
  }

  float pxNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(pxHash21(i), pxHash21(i + vec2(1.0, 0.0)), f.x),
      mix(pxHash21(i + vec2(0.0, 1.0)), pxHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float pxLightning(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 2; i++) {
      float n = 1.0 - abs(pxNoise(p) * 2.0 - 1.0);
      v += (n * n * n * n) * a;
      p *= 2.25;
      a *= 0.5;
    }
    return v;
  }
`;

/** Sculpted 12-tooth gilded cogwheel geometry for Paradox Twins back attachment. */
export function createParadoxGoldGearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(0.86, 0.068, 6, 28));
  parts.push(new THREE.TorusGeometry(0.46, 0.042, 6, 20));
  parts.push(new THREE.TorusGeometry(0.18, 0.036, 6, 14));

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(1.66, 0.062, 0.042);
    spoke.rotateZ((i / 4) * Math.PI);
    parts.push(spoke);
  }

  const teeth = 12;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(0.12, 0.19, 0.064);
    tooth.translate(0, 0.98, 0);
    tooth.rotateZ(a);
    parts.push(tooth);
  }
  return mergeSimpleGeos(parts);
}

/** Faceted crimson-obsidian throne spike blade geometry for Paradox Twins back attachment. */
export function createParadoxChainSpikeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const upperTip = new THREE.ConeGeometry(0.14, 1.35, 4);
  upperTip.translate(0, 0.68, 0);
  parts.push(upperTip);

  const lowerTang = new THREE.ConeGeometry(0.11, 0.55, 4);
  lowerTang.rotateX(Math.PI);
  lowerTang.translate(0, -0.26, 0);
  parts.push(lowerTang);

  const guard = new THREE.BoxGeometry(0.38, 0.075, 0.08);
  guard.translate(0, 0.02, 0);
  parts.push(guard);

  const ring = new THREE.TorusGeometry(0.11, 0.026, 5, 12);
  ring.translate(0, -0.58, 0);
  parts.push(ring);

  return mergeSimpleGeos(parts);
}

/** Split-polarity Gilded Chrono & Black-Flash Crimson Back Halo Disc ShaderMaterial. */
export function createParadoxDualHaloShaderMaterial(): THREE.ShaderMaterial {
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
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float outerRing = exp(-pow((r - 0.80) * 15.0, 2.0));
        float innerRing = exp(-pow((r - 0.54) * 18.0, 2.0));
        float teeth = smoothstep(0.1, 0.55, cos(ang * 12.0 + uTime * 1.4)) * exp(-pow((r - 0.89) * 14.0, 2.0));
        float runeTicks = smoothstep(0.55, 0.92, cos(ang * 24.0 - uTime * 0.9)) * exp(-pow((r - 0.67) * 16.0, 2.0));
        float jagBolt = exp(-pow(abs(sin(ang * 6.0 - r * 8.0 - uTime * 3.8)) * 5.6, 2.0)) * smoothstep(0.95, 0.22, r);

        float polarity = smoothstep(-0.18, 0.18, p.x + sin(p.y * 2.8 + uTime * 1.8) * 0.12);
        vec3 goldCol = vec3(1.0, 0.82, 0.24) * 1.35;
        vec3 ivoryCol = vec3(1.0, 0.98, 0.88) * 1.5;
        vec3 crimsonCol = vec3(0.98, 0.12, 0.20) * 1.35;
        vec3 inkBlack = vec3(0.03, 0.01, 0.02);

        vec3 leftCol = mix(goldCol, ivoryCol, outerRing * 0.65);
        vec3 rightCol = mix(inkBlack, crimsonCol, clamp(outerRing * 0.95 + jagBolt * 0.85, 0.0, 1.0));
        vec3 col = mix(leftCol, rightCol, polarity);

        float mask = (outerRing * 1.15 + innerRing * 0.88 + teeth * 0.78 + runeTicks * 0.68 + jagBolt * 0.72) * smoothstep(1.0, 0.76, r);
        float alpha = clamp(mask, 0.0, 0.96) * uOpacity;
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

/** Gilded Chrono cogwheel shader material (also usable by ChibiBackAttachments3D). */
export function createParadoxGoldGearShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uProgress: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uProgress;
      varying vec3 vPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.36, dot(N, L));
        float inkRim = smoothstep(0.24, 0.14, ndv);
        vec3 bronzeGold = vec3(0.72, 0.44, 0.08);
        vec3 radiantGold = vec3(1.0, 0.86, 0.24) * 1.45;
        vec3 col = mix(bronzeGold, radiantGold, cel);
        col = mix(col, vec3(0.06, 0.03, 0.01), inkRim * 0.88);
        float fadeOut = 1.0 - smoothstep(0.74, 1.0, uProgress);
        float alpha = clamp(uOpacity * fadeOut, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

/** Crimson-Obsidian Chain Spike shader material (also usable by ChibiBackAttachments3D). */
export function createParadoxCrimsonChainShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uProgress: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uProgress;
      varying vec3 vPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rimGlow = smoothstep(0.20, 0.34, ndv) * (1.0 - smoothstep(0.40, 0.52, ndv));
        float inkRim = smoothstep(0.20, 0.10, ndv);
        float pulse = smoothstep(0.4, 0.85, sin(vPos.y * 8.0 - uTime * 9.0));
        vec3 obsidian = vec3(0.04, 0.015, 0.03);
        vec3 crimson = vec3(0.98, 0.14, 0.24) * 1.65;
        vec3 col = mix(obsidian, crimson, clamp(rimGlow * 1.1 + pulse * 0.38, 0.0, 1.0));
        col = mix(col, vec3(0.015, 0.005, 0.012), inkRim * 0.9);
        float fadeOut = 1.0 - smoothstep(0.74, 1.0, uProgress);
        float alpha = clamp(uOpacity * fadeOut, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

/**
 * Custom Geometry: Nested Tilted Chaos Core Cubes (3 interlocking spatial cubes for the Right Twin's Hollow Core).
 */
function createParadoxNestedCubeCoreGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const outer = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  parts.push(outer);

  const mid = new THREE.BoxGeometry(0.96, 0.96, 0.96);
  mid.rotateX(Math.PI * 0.25);
  mid.rotateY(Math.PI * 0.25);
  parts.push(mid);

  const skew = new THREE.BoxGeometry(0.88, 0.88, 0.88);
  skew.rotateZ(Math.PI * 0.25);
  skew.rotateX(Math.PI * 0.18);
  parts.push(skew);

  return mergeSimpleGeos(parts);
}

/**
 * Custom Geometry: Sculpted Ornate Golden Clock-Hand Needle (for Julius Novachrono Chrono-Stasis sweep).
 * Extends from counterweight (-0.16) through pivot (0,0,0) along +X to sharp tip (1.0).
 */
function createParadoxClockHandGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, 0.0);
  shape.lineTo(-0.04, -0.044);
  shape.lineTo(0.76, -0.024);
  shape.lineTo(1.0, 0.0);
  shape.lineTo(0.76, 0.024);
  shape.lineTo(-0.04, 0.044);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * CUSTOM SHADER 1: Masterpiece Dual-Polarity Paradox Astronomical Clock Floor (ZERO cracked floor, ZERO round dome!)
 * Precision horology clock face split between Royal Astral Gold (Left: forward time) and Abyssal Crimson (Right: reversed paradox time),
 * featuring 60 fine second ticks, 12 sculpted cardinal/hour pointers, counter-rotating escapement gear teeth, astrolabe eclipse arcs,
 * jeweled center hub, smooth radial unfold intro, 0.56s Chrono-Stasis freeze flash, and 0.78s detonation shockwave illumination!
 */
function createParadoxChronoDialMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uFrozen: { value: 0 },
      uBlastT: { value: 0 },
      uHandAngle: { value: 0 },
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
      uniform float uFrozen;
      uniform float uBlastT;
      uniform float uHandAngle;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        // Smooth radial unfold intro (0.0 -> 0.24s) & graceful outer-to-inner unwind outro (1.85s -> 2.50s)
        float openT = smoothstep(0.0, 0.10, uProgress);
        float unfoldR = mix(0.18, 0.98, 1.0 - pow(1.0 - openT, 3.0));
        float closeT = smoothstep(0.76, 1.0, uProgress);
        float activeMaxR = mix(unfoldR, 0.0, closeT * closeT);
        if (r > activeMaxR) discard;

        float ang = atan(p.y, p.x);
        float isChaos = smoothstep(-0.025, 0.025, p.x);
        float dirSign = mix(1.0, -1.0, isChaos);
        float spinTime = uFrozen > 0.5 ? 0.0 : uTime;

        // 1. Subtle deep obsidian horology dial plate so gold & crimson clockwork lines pop with luxury contrast
        float dialPlate = smoothstep(activeMaxR, activeMaxR - 0.12, r) * smoothstep(0.95, 0.84, r);
        float sunburst = 0.5 + 0.5 * sin(ang * 24.0 + spinTime * 0.4 * dirSign);

        // 2. Outer Double-Track Bezel (r = 0.90 & r = 0.83) + 60 Precision Second Ticks
        float ringOuter = exp(-pow((r - 0.90) * 80.0, 2.0));
        float ringBezelIn = exp(-pow((r - 0.83) * 85.0, 2.0));
        float secTicks = smoothstep(0.84, 0.95, cos(ang * 60.0 + spinTime * 0.35 * dirSign))
                       * smoothstep(0.835, 0.85, r) * smoothstep(0.895, 0.88, r);

        // 3. 12 Precision Hour Markers + 4 Sculpted Cardinal Diamond-Spear Pointers (12, 3, 6, 9)
        float hourAngle = ang * 12.0 + spinTime * 0.18 * dirSign;
        float hourBars = smoothstep(0.968, 0.994, cos(hourAngle))
                       * smoothstep(0.71, 0.735, r) * smoothstep(0.825, 0.805, r);

        // 4 cardinal diamond pointers at 0, PI/2, PI, 3PI/2
        float cardCos = cos(ang * 4.0);
        float cardWidth = mix(0.985, 0.998, abs((r - 0.72) / 0.12));
        float cardPointers = smoothstep(cardWidth - 0.015, cardWidth + 0.004, cardCos)
                           * smoothstep(0.62, 0.65, r) * smoothstep(0.835, 0.805, r);

        // 4. Inner Counter-Rotating Escapement Gear-Teeth Ring (r = 0.50 -> 0.58)
        float gearTrackOut = exp(-pow((r - 0.585) * 90.0, 2.0));
        float gearTrackIn = exp(-pow((r - 0.495) * 90.0, 2.0));
        float gearAngle = ang * 24.0 - spinTime * 0.85 * dirSign;
        float gearTeeth = smoothstep(0.35, 0.72, cos(gearAngle))
                        * smoothstep(0.50, 0.515, r) * smoothstep(0.58, 0.565, r) * 0.72;
        // 8 thin structural spokes inside the escapement wheel
        float innerSpokes = smoothstep(0.988, 0.998, cos(ang * 8.0 + spinTime * 0.5 * dirSign))
                          * smoothstep(0.13, 0.16, r) * smoothstep(0.495, 0.47, r) * 0.55;

        // 5. Astronomical Eclipse Rings & Center Jeweled Pivot Hub (r = 0.32 & r = 0.105)
        float astrolabeRing = exp(-pow((r - 0.33) * 78.0, 2.0));
        vec2 eccOffset = vec2(cos(spinTime * 0.9), sin(spinTime * 0.9)) * 0.085;
        float eccRing = exp(-pow((length(p - eccOffset) - 0.29) * 85.0, 2.0)) * smoothstep(0.48, 0.42, r) * 0.65;
        float hubOuter = exp(-pow((r - 0.105) * 70.0, 2.0));
        float hubCore = smoothstep(0.068, 0.032, r);

        // 6. Clean Razor Meridian Axis dividing Gold Chrono (Left) vs Crimson Paradox (Right)
        float meridian = exp(-pow(p.x * 78.0, 2.0)) * smoothstep(0.91, 0.12, r) * smoothstep(0.08, 0.14, r) * 0.78;

        // 7. Sweeping Chrono Radar Glow trailing the Minute Hand
        float sweepDiff = fract((ang - uHandAngle) / 6.2831853);
        float radarArc = exp(-sweepDiff * 8.5) * smoothstep(0.12, 0.82, r) * smoothstep(0.84, 0.78, r) * 0.30;

        // 8. Traveling Detonation Pulse lighting up every clock tick at 0.78s (uBlastT)
        float blastR = uBlastT * 0.98;
        float blastWave = exp(-pow((r - blastR) * 18.0, 2.0)) * step(0.01, uBlastT) * (1.0 - smoothstep(0.55, 1.0, uBlastT));

        // 9. Unfold Leading Rim Sparkle during smooth intro
        float introRim = exp(-pow((r - unfoldR + 0.02) * 32.0, 2.0)) * (1.0 - smoothstep(0.70, 1.0, openT));

        // Luxury dual-polarity horology palette
        vec3 obsidianDial = vec3(0.016, 0.014, 0.026) * (0.85 + 0.30 * sunburst);
        vec3 goldPrimary = vec3(1.0, 0.78, 0.18) * (1.45 + blastWave * 0.9);
        vec3 crimsonPrimary = vec3(0.98, 0.08, 0.20) * (1.55 + blastWave * 0.95);
        vec3 whiteGold = vec3(1.0, 0.98, 0.86) * 2.05;
        vec3 crimsonHot = vec3(1.0, 0.56, 0.52) * 2.0;

        vec3 lineTint = mix(goldPrimary, crimsonPrimary, isChaos);
        vec3 hotTint = mix(whiteGold, crimsonHot, isChaos);

        float detailLines = clamp(
          ringOuter * 1.05 +
          ringBezelIn * 0.88 +
          secTicks * 0.68 +
          hourBars * 1.10 +
          cardPointers * 1.25 +
          gearTrackOut * 0.75 +
          gearTrackIn * 0.72 +
          gearTeeth * 0.65 +
          innerSpokes +
          astrolabeRing * 0.82 +
          eccRing +
          hubOuter * 1.15 +
          hubCore * 0.90 +
          meridian +
          radarArc +
          introRim * 0.95 +
          blastWave * 0.55,
          0.0,
          1.35
        );

        vec3 col = mix(obsidianDial, lineTint, clamp(detailLines, 0.0, 1.0));
        float hotMask = clamp(
          cardPointers * 0.75 +
          hubOuter * 0.65 +
          hubCore * 0.8 +
          ringOuter * 0.45 +
          uFrozen * detailLines * 0.45 +
          blastWave * detailLines * 0.85,
          0.0,
          1.0
        );
        col = mix(col, hotTint, hotMask);

        float fadeEnv = smoothstep(0.0, 0.07, uProgress) * (1.0 - smoothstep(0.80, 1.0, uProgress));
        float baseAlpha = dialPlate * 0.56;
        float alpha = clamp(max(baseAlpha, detailLines * 0.92) * fadeEnv, 0.0, 0.95);
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
 * CUSTOM SHADER 3: *Sustainer of Heavenly Principles / Unknown God* Red-Black Spatial Cubes
 * Pitch-black matte spatial interior with razor-sharp glowing crimson (or paradox-gold) borders,
 * recessed arcane geometric circuit sigils & flickering glitch bars!
 */
function createParadoxSpatialCubeMat(isGoldParadox: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uGold: { value: isGoldParadox ? 1 : 0 },
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
      uniform float uOpacity;
      uniform float uGold;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        // Razor neon wireframe border on every cube face (Unknown God signature!)
        vec2 d = min(vUv, 1.0 - vUv);
        float minEdge = min(d.x, d.y);
        float border = smoothstep(0.095, 0.038, minEdge);
        float innerHairline = smoothstep(0.020, 0.006, abs(minEdge - 0.17));

        // Sleek geometric cross-circuit & center diamond sigil etched subtly into the black monolith face
        vec2 centered = abs(vUv - 0.5);
        float innerSquare = smoothstep(0.018, 0.005, abs(max(centered.x, centered.y) - 0.16));
        float crossAxis = smoothstep(0.014, 0.004, min(centered.x, centered.y)) * step(0.16, max(centered.x, centered.y)) * step(max(centered.x, centered.y), 0.33);
        float circuitPulse = 0.45 + 0.55 * sin(uTime * 10.0 + centered.x * 8.0);
        float circuit = (innerSquare * 0.65 + crossAxis * 0.45) * circuitPulse;

        // Digital spatial glitch scanline flickering across the black cube face
        float scan = smoothstep(0.88, 0.97, sin(vUv.y * 30.0 - uTime * 15.0)) * 0.35;
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fres = pow(max(0.0001, 1.0 - abs(dot(N, V))), 2.4);

        vec3 voidBlack = vec3(0.016, 0.004, 0.011);
        vec3 neonEdge = uGold > 0.5 ? vec3(1.0, 0.80, 0.18) * 1.85 : vec3(1.0, 0.08, 0.18) * 2.0;
        vec3 hotCore = uGold > 0.5 ? vec3(1.0, 0.98, 0.86) * 2.15 : vec3(1.0, 0.62, 0.56) * 2.05;

        float edgeMask = clamp(border + innerHairline * 0.55 + circuit * 0.5 + scan + fres * 0.4, 0.0, 1.0);
        vec3 col = mix(voidBlack, neonEdge, edgeMask);
        col = mix(col, hotCore, smoothstep(0.048, 0.012, minEdge) * 0.72);

        float alpha = clamp(uOpacity, 0.0, 0.99);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * CUSTOM SHADER 4: *Gojo Hollow-Purple* Left Core — Solar-Eclipse Chrono-Sol Miniature Star
 * Turbulent amber-gold solar plasma with an eclipse inner band and crisp corona rim (never clips to a flat white blob!)
 */
function createParadoxChronoSunMat(): THREE.ShaderMaterial {
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
      ${PARADOX_MATH_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 2.1);

        float swirl1 = pxNoise(vLocalPos.xy * 5.2 + vec2(uTime * 3.8, -uTime * 2.6));
        float swirl2 = pxNoise(vLocalPos.yz * 9.0 - vec2(uTime * 5.0, uTime * 3.2));
        float plasma = clamp(swirl1 * 0.65 + swirl2 * 0.45, 0.0, 1.0);
        float eclipseRing = smoothstep(0.14, 0.02, abs(ndv - 0.56));
        float coreHot = smoothstep(0.84, 0.98, ndv);

        vec3 deepAmber = vec3(0.86, 0.36, 0.03);
        vec3 richGold = vec3(1.0, 0.78, 0.16) * 1.25;
        vec3 eclipseDark = vec3(0.18, 0.07, 0.02);
        vec3 coronaWhite = vec3(1.0, 0.98, 0.84) * 1.9;

        vec3 col = mix(deepAmber, richGold, plasma);
        col = mix(col, eclipseDark, eclipseRing * 0.55);
        col = mix(col, coronaWhite, clamp(rim * 1.15 + coreHot * 0.72, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Custom Geometry: Asymmetric Faceted Dimensional Obsidian-Glass Shatter Shard
 * (Replaces any round blast dome with razor crystalline broken-reality shards exploding outward in 3D!)
 */
function createParadoxShatterShardGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, 0.72);
  shape.lineTo(0.28, 0.14);
  shape.lineTo(0.16, -0.58);
  shape.lineTo(-0.08, -0.44);
  shape.lineTo(-0.30, 0.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.018,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

/**
 * CUSTOM SHADER 5: Shattered Dimensional Obsidian-Mirror Glass Shard (ZERO round dome!)
 * Pitch-black mirror-void core with blazing razor gold or crimson fractured edges + internal spiderweb glass cracks & ember dissolve!
 */
function createParadoxShatterShardMat(isGold: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLocalT: { value: 0 },
      uGold: { value: isGold ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
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
      uniform float uLocalT;
      uniform float uGold;
      varying vec3 vLocalPos;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${PARADOX_MATH_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.65);

        // Internal fractured glass veins crackling across the mirror shard
        float vein = pxLightning(vLocalPos.xy * 6.5 + vec2(uTime * 3.0, -uTime * 4.5));
        float crack = smoothstep(0.54, 0.74, vein);
        float sheen = smoothstep(0.70, 0.96, sin(vLocalPos.y * 10.0 - vLocalPos.x * 7.0 + uTime * 5.0)) * 0.25;

        // Crisp micro-pixel dissolve in the tail of the shatter hangtime
        vec2 pixCell = floor(vLocalPos.xy * 14.0);
        float pixRand = pxHash21(pixCell);
        float dissolveT = clamp((uLocalT - 0.56) / 0.44, 0.0, 1.0);
        if (dissolveT > pixRand * 0.85 + 0.12) discard;
        float burnEdge = smoothstep(0.11, 0.0, pixRand * 0.85 + 0.12 - dissolveT) * step(0.01, dissolveT);

        vec3 voidMirror = vec3(0.015, 0.006, 0.022);
        vec3 edgeNeon = uGold > 0.5 ? vec3(1.0, 0.80, 0.18) * 2.0 : vec3(1.0, 0.08, 0.20) * 2.1;
        vec3 hotTip = uGold > 0.5 ? vec3(1.0, 0.98, 0.88) * 2.25 : vec3(1.0, 0.62, 0.58) * 2.15;

        float glowMask = clamp(rim * 1.15 + crack * 0.85 + burnEdge * 1.2 + sheen, 0.0, 1.0);
        vec3 col = mix(voidMirror, edgeNeon, glowMask);
        col = mix(col, hotTip, clamp(pow(rim, 3.0) * 0.95 + burnEdge * 0.7, 0.0, 1.0));

        float fadeOut = 1.0 - smoothstep(0.76, 1.0, uLocalT);
        float alpha = clamp(0.95 * fadeOut, 0.0, 0.98);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Custom Geometry: 3D Jagged Whipping Black-Flash & Chrono Lightning Arc Ribbon
 * Arches radially outward along +X (0 -> 1) and upward (+Y) with sharp sakuga zig-zag kinks!
 */
function createParadoxArcBoltGeometry(seed: number): THREE.BufferGeometry {
  const segs = 16;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * 4.4;
    const archY = Math.sin(t * Math.PI * 0.88) * 2.35;
    // Deterministic crisp anime lightning zig-zag displacement
    const k1 = Math.sin(t * 23.0 + seed * 4.7) * Math.cos(t * 11.0 - seed * 2.1);
    const k2 = Math.cos(t * 19.0 - seed * 3.3);
    const zigY = k1 * 0.42 * Math.sin(t * Math.PI);
    const zigZ = k2 * 0.36 * Math.sin(t * Math.PI);
    const halfW = (0.19 * (1.0 - t * 0.72)) * (0.3 + 0.7 * Math.sin(t * Math.PI));

    positions.push(x, archY + zigY - halfW, zigZ);
    positions.push(x, archY + zigY + halfW, zigZ);
    uvs.push(t, 0);
    uvs.push(t, 1);

    if (i < segs) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * CUSTOM SHADER 5B: 3D Sakuga Black-Flash (Pitch-Black Ink Core + Blazing Crimson Rim) & Chrono Gold Lightning Arc
 */
function createParadoxArcBoltMat(isGold: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0 },
      uTime: { value: 0 },
      uGold: { value: isGold ? 1 : 0 },
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
      uniform float uGold;
      varying vec2 vUv;

      void main() {
        float distEdge = abs(vUv.y - 0.5) * 2.0;
        float coreBand = smoothstep(0.52, 0.14, distEdge);
        float outerGlow = smoothstep(1.0, 0.25, distEdge);

        // High-speed arc whip traveling from origin (vUv.x = 0) to tip (vUv.x = 1)
        float whipHead = smoothstep(uLocalT * 2.8 + 0.05, uLocalT * 2.8 - 0.22, vUv.x);
        float whipTail = smoothstep(uLocalT * 1.4 - 0.45, uLocalT * 1.4 - 0.10, vUv.x);
        float flicker = 0.72 + 0.28 * sin(uTime * 52.0 + vUv.x * 18.0);
        float env = whipHead * whipTail * (1.0 - smoothstep(0.62, 1.0, uLocalT));

        vec3 col;
        if (uGold > 0.5) {
          vec3 goldRim = vec3(1.0, 0.76, 0.14) * 2.0;
          vec3 goldCore = vec3(1.0, 0.99, 0.90) * 2.35;
          col = mix(goldRim, goldCore, coreBand);
        } else {
          // Iconic Jujutsu Kaisen Black Flash: razor crimson aura framing an ink-black lightning spine!
          vec3 crimsonRim = vec3(1.0, 0.07, 0.18) * 2.25;
          vec3 inkCore = vec3(0.012, 0.003, 0.015);
          col = mix(crimsonRim, inkCore, smoothstep(0.45, 0.18, distEdge) * 0.94);
        }

        float alpha = clamp(outerGlow * env * flicker, 0.0, 0.98);
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
 * CUSTOM SHADER 6: Razor *Atomic* Horizon Ring & Clock-Hand Needle Glow
 */
function createParadoxAtomicHorizonRingMat(isGold: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0 },
      uGold: { value: isGold ? 1 : 0 },
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
      uniform float uGold;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float mainRing = exp(-pow((r - 0.86) * 30.0, 2.0));
        float darkBand = smoothstep(0.055, 0.015, abs(r - 0.77)) * (1.0 - uGold);
        vec3 tint = uGold > 0.5 ? vec3(1.0, 0.80, 0.18) * 1.95 : vec3(1.0, 0.09, 0.20) * 2.05;
        vec3 col = mix(tint, vec3(1.0, 0.98, 0.92) * 2.2, mainRing * 0.75);
        col = mix(col, vec3(0.015, 0.004, 0.012), darkBand * 0.88);
        float alpha = clamp(max(mainRing, darkBand * 0.88) * (1.0 - smoothstep(0.42, 1.0, uLocalT)), 0.0, 0.96);
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
 * CUSTOM SHADER 7: Sakuga 8-Ray Dimensional Impact Cross-Rift Flash (0.76s-1.02s Detonation Core Punch!)
 * Crisp twin-polarity star rays (gold left, crimson right) around an inverted pitch-black singularity pupil.
 */
function createParadoxImpactStarMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0 },
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
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float horzRay = (0.024 / (abs(p.y) + 0.012)) * smoothstep(0.98, 0.04, abs(p.x));
        float vertRay = (0.020 / (abs(p.x) + 0.012)) * smoothstep(0.92, 0.04, abs(p.y));
        vec2 d1 = vec2(p.x + p.y, p.x - p.y) * 0.7071;
        float diagRays = ((0.014 / (abs(d1.y) + 0.014)) + (0.014 / (abs(d1.x) + 0.014))) * smoothstep(0.75, 0.05, r);
        float pupil = smoothstep(0.18, 0.11, r);
        float pupilRing = smoothstep(0.045, 0.008, abs(r - 0.17));

        float isChaos = smoothstep(-0.08, 0.08, p.x);
        vec3 goldRay = vec3(1.0, 0.82, 0.18) * 1.9;
        vec3 redRay = vec3(1.0, 0.08, 0.20) * 2.0;
        vec3 rayTint = mix(goldRay, redRay, isChaos);

        float rayVal = clamp(horzRay + vertRay + diagRays * 0.75 + pupilRing * 1.4, 0.0, 1.5);
        vec3 col = mix(rayTint, vec3(1.0, 0.99, 0.94) * 2.2, clamp(rayVal * 0.45 + pupilRing * 0.7, 0.0, 1.0));
        col = mix(col, vec3(0.01, 0.003, 0.015), pupil * 0.96);

        float env = smoothstep(0.0, 0.12, uLocalT) * (1.0 - smoothstep(0.32, 1.0, uLocalT));
        float alpha = clamp(max(rayVal, pupil * 0.95) * env, 0.0, 0.98);
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

function createParadoxClockHandMat(isCrimson: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 },
      uFrozen: { value: 0 },
      uCrimson: { value: isCrimson ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uFrozen;
      uniform float uCrimson;
      varying vec3 vPos;
      void main() {
        float edge = smoothstep(0.014, 0.036, abs(vPos.z));
        vec3 darkOutline = vec3(0.03, 0.012, 0.02);
        vec3 baseCol = uCrimson > 0.5 ? vec3(1.0, 0.10, 0.22) * 1.95 : vec3(1.0, 0.80, 0.18) * 1.85;
        vec3 whiteHot = uCrimson > 0.5 ? vec3(1.0, 0.68, 0.64) * 2.15 : vec3(1.0, 0.99, 0.90) * 2.2;
        vec3 col = mix(baseCol, whiteHot, 0.35 + uFrozen * 0.65);
        col = mix(col, darkOutline, edge * 0.78);
        gl_FragColor = vec4(col, clamp(uOpacity, 0.0, 0.96));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

function createParadoxOreFlashShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#ef4444') },
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
      uniform vec3 uCoreColor;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float starX = (0.024 / (abs(p.y) + 0.016)) * smoothstep(0.96, 0.05, abs(p.x));
        float starY = (0.024 / (abs(p.x) + 0.016)) * smoothstep(0.96, 0.05, abs(p.y));
        float core = exp(-r * r * 14.0);
        float env = (1.0 - smoothstep(0.35, 1.0, uLocalT));
        float intensity = clamp(starX + starY + core * 1.35, 0.0, 1.4) * env;
        vec3 col = mix(uColor * 1.6, uCoreColor * 1.6, 0.35);
        col = mix(col, vec3(1.0) * 2.1, clamp(core * 0.85, 0.0, 1.0));
        if (intensity < 0.02) discard;
        gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 0.96));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function createParadoxSparkShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalLife: { value: 0 },
      uColor: { value: new THREE.Color('#fbbf24') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLocalLife;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float streak = exp(-p.y * p.y * 12.0) * smoothstep(1.0, 0.15, abs(p.x));
        float alpha = clamp(streak * (1.0 - smoothstep(0.38, 1.0, uLocalLife)), 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(mix(uColor * 1.7, vec3(1.0) * 2.0, 0.45) * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

interface BarrageBeatSlot {
  delay: number;
  beatFired: boolean;
  targetIndex: number;
}

interface SpatialCubeSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  orbitAngle: number;
  orbitRadius: number;
  startY: number;
  blastRadius: number;
  blastHeight: number;
  baseScale: number;
  spinSpeedX: number;
  spinSpeedY: number;
}

interface ShatterShardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  azimuth: number;
  blastRadius: number;
  blastHeight: number;
  baseScale: number;
  tiltX: number;
  tiltZ: number;
  spinSpeed: number;
}

interface ArcBoltSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  azimuth: number;
  tiltZ: number;
  scaleMult: number;
  delay: number;
}

interface OreFlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseScale: number;
}

interface SparkSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseLen: number;
}

interface ParadoxSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  reversalFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  chronoDialMesh: THREE.Mesh;
  chronoDialMat: THREE.ShaderMaterial;
  hourHandMesh: THREE.Mesh;
  minuteHandMesh: THREE.Mesh;
  secondHandMesh: THREE.Mesh;
  clockHandMat: THREE.ShaderMaterial;
  secondHandMat: THREE.ShaderMaterial;
  chronoSunMesh: THREE.Mesh;
  chronoSunMat: THREE.ShaderMaterial;
  chaosCubeCoreMesh: THREE.Mesh;
  chaosCubeCoreMat: THREE.ShaderMaterial;
  cubes: SpatialCubeSlot[];
  impactStarMesh: THREE.Mesh;
  impactStarMat: THREE.ShaderMaterial;
  shatterShards: ShatterShardSlot[];
  arcBolts: ArcBoltSlot[];
  horizonGoldMesh: THREE.Mesh;
  horizonGoldMat: THREE.ShaderMaterial;
  horizonRedMesh: THREE.Mesh;
  horizonRedMat: THREE.ShaderMaterial;
  barrageBeats: BarrageBeatSlot[];
  oreFlashes: OreFlashSlot[];
  sparks: SparkSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * 100% Custom Researched Anime Sakuga 2.5s Skill Pool for Paradox Twins
 * ("Paradox Astronomical Clock × Heavenly Cube Shatter" — ZERO cracked floor, ZERO round bubble domes!
 *  Reference Synthesis: Precision Dual-Polarity Astronomical Clock Floor (Gold Forward-Time Left vs Crimson Reverse-Time Right,
 *  60 second ticks, 12 cardinal/hour pointers, counter-rotating escapement gear, astrolabe arcs, 3 sweeping/freezing/rewinding 3D hands) +
 *  Genshin *Unknown God* 24 Red-Black Spatial Cubes (w/ 4 Hero Monoliths) + Jujutsu Kaisen *Hollow Purple* Dual-Core Convergence & *Black Flash* Arcs +
 *  14 Jagged 3D Dimensional Obsidian-Glass Shatter Shards + Sakuga 8-Ray Impact Cross-Rift):
 *  - Act 1 (0.00-0.56s): Smooth Radial Unfold of Dual-Polarity Paradox Clock Floor & 3 Ornate Hands (Hour, Minute, Reverse-Crimson Second)
 *    + 24 Swarming Red-Black Spatial Cubes + 6 Ore Pressure Hits
 *  - Act 2 (0.22-0.78s): Dual-Core Orbital Convergence (Amber-Gold Chrono-Sol Star vs Nested Chaos Cube-Core) -> 0.56s TIME FREEZE!
 *  - Act 3 (0.78s Hit-Stop 0.095s): Sakuga 8-Ray Cross-Rift Impact Star w/ Singularity Pupil + 14 Jagged 3D Dimensional Glass
 *    Shatter Shards + 6 Whipping Black-Flash & Chrono Lightning Arcs + 24 Cubes Bursting into Zero-G + Clock Hands Spin in Reverse Rewind!
 *  - Act 4 (1.15-2.50s): Paradox Aftershock + Zero-G Chrono-Stasis Hangtime & Graceful Clock Dial Unwind.
 */
export class ParadoxTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: ParadoxSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const handGeo = createParadoxClockHandGeometry();
    const sunGeo = new THREE.SphereGeometry(0.62, 24, 18);
    const nestedCubeGeo = createParadoxNestedCubeCoreGeometry();
    const cubeGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    const shardGeo = createParadoxShatterShardGeometry();
    const arcGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < ARC_BOLT_COUNT; i++) {
      const ag = createParadoxArcBoltGeometry(i + 1.37);
      arcGeos.push(ag);
      this.sharedGeos.push(ag);
    }
    this.sharedGeos.push(planeGeo, handGeo, sunGeo, nestedCubeGeo, cubeGeo, shardGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const chronoDialMat = createParadoxChronoDialMat();
      const chronoDialMesh = new THREE.Mesh(planeGeo, chronoDialMat);
      chronoDialMesh.rotation.x = -Math.PI / 2;
      root.add(chronoDialMesh);

      const clockHandMat = createParadoxClockHandMat(false);
      const secondHandMat = createParadoxClockHandMat(true);
      const hourHandMesh = new THREE.Mesh(handGeo, clockHandMat);
      const minuteHandMesh = new THREE.Mesh(handGeo, clockHandMat);
      const secondHandMesh = new THREE.Mesh(handGeo, secondHandMat);
      root.add(hourHandMesh, minuteHandMesh, secondHandMesh);

      const chronoSunMat = createParadoxChronoSunMat();
      const chronoSunMesh = new THREE.Mesh(sunGeo, chronoSunMat);
      chronoSunMesh.visible = false;
      root.add(chronoSunMesh);

      const chaosCubeCoreMat = createParadoxSpatialCubeMat(false);
      const chaosCubeCoreMesh = new THREE.Mesh(nestedCubeGeo, chaosCubeCoreMat);
      chaosCubeCoreMesh.visible = false;
      root.add(chaosCubeCoreMesh);

      const cubes: SpatialCubeSlot[] = [];
      for (let i = 0; i < SPATIAL_CUBE_COUNT; i++) {
        const isGoldCube = i % 3 === 0;
        const mat = createParadoxSpatialCubeMat(isGoldCube);
        const mesh = new THREE.Mesh(cubeGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        cubes.push({
          mesh,
          mat,
          orbitAngle: (i / SPATIAL_CUBE_COUNT) * Math.PI * 2,
          orbitRadius: 3.4,
          startY: 1.2,
          blastRadius: 4.0,
          blastHeight: 2.2,
          baseScale: 1.0,
          spinSpeedX: (i % 2 === 0 ? 1 : -1) * 1.8,
          spinSpeedY: (i % 3 === 0 ? 1 : -1) * 2.2,
        });
      }

      const impactStarMat = createParadoxImpactStarMat();
      const impactStarMesh = new THREE.Mesh(planeGeo, impactStarMat);
      impactStarMesh.rotation.x = -Math.PI * 0.24;
      impactStarMesh.visible = false;
      root.add(impactStarMesh);

      const shatterShards: ShatterShardSlot[] = [];
      for (let i = 0; i < SHATTER_SHARD_COUNT; i++) {
        const isGoldShard = i % 2 === 0;
        const mat = createParadoxShatterShardMat(isGoldShard);
        const mesh = new THREE.Mesh(shardGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        shatterShards.push({
          mesh,
          mat,
          azimuth: (i / SHATTER_SHARD_COUNT) * Math.PI * 2,
          blastRadius: 3.6,
          blastHeight: 2.0,
          baseScale: 1.0,
          tiltX: 0.4,
          tiltZ: 0.3,
          spinSpeed: (i % 2 === 0 ? 1 : -1) * 0.9,
        });
      }

      const arcBolts: ArcBoltSlot[] = [];
      for (let i = 0; i < ARC_BOLT_COUNT; i++) {
        const isGoldBolt = i % 2 === 0;
        const mat = createParadoxArcBoltMat(isGoldBolt);
        const mesh = new THREE.Mesh(arcGeos[i], mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        arcBolts.push({
          mesh,
          mat,
          azimuth: (i / ARC_BOLT_COUNT) * Math.PI * 2 + 0.25,
          tiltZ: ((i % 3) - 1) * 0.22,
          scaleMult: 0.92 + (i % 3) * 0.14,
          delay: (i % 3) * 0.035,
        });
      }

      const horizonGoldMat = createParadoxAtomicHorizonRingMat(true);
      const horizonRedMat = createParadoxAtomicHorizonRingMat(false);
      const horizonGoldMesh = new THREE.Mesh(planeGeo, horizonGoldMat);
      const horizonRedMesh = new THREE.Mesh(planeGeo, horizonRedMat);
      horizonGoldMesh.rotation.x = -Math.PI / 2;
      horizonRedMesh.rotation.x = -Math.PI / 2;
      horizonGoldMesh.visible = false;
      horizonRedMesh.visible = false;
      root.add(horizonGoldMesh, horizonRedMesh);

      this.allMats.push(
        chronoDialMat,
        clockHandMat,
        secondHandMat,
        chronoSunMat,
        chaosCubeCoreMat,
        impactStarMat,
        horizonGoldMat,
        horizonRedMat
      );

      const barrageBeats: BarrageBeatSlot[] = [];
      for (let i = 0; i < BARRAGE_BEAT_COUNT; i++) {
        barrageBeats.push({ delay: 0.14 + i * 0.068, beatFired: false, targetIndex: 0 });
      }

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const mat = createParadoxOreFlashShaderMaterial();
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        oreFlashes.push({ mesh, mat, active: false, age: 0, life: 0.24, baseScale: 2.5 });
      }

      const sparks: SparkSlot[] = [];
      for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
        const mat = createParadoxSparkShaderMaterial();
        mat.uniforms.uColor.value.set(i % 2 === 0 ? '#fbbf24' : '#ef4444');
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        sparks.push({
          mesh,
          mat,
          active: false,
          age: 0,
          life: 0.45,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseLen: 0.75,
        });
      }

      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        impactFired: false,
        reversalFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        chronoDialMesh,
        chronoDialMat,
        hourHandMesh,
        minuteHandMesh,
        secondHandMesh,
        clockHandMat,
        secondHandMat,
        chronoSunMesh,
        chronoSunMat,
        chaosCubeCoreMesh,
        chaosCubeCoreMat,
        cubes,
        impactStarMesh,
        impactStarMat,
        shatterShards,
        arcBolts,
        horizonGoldMesh,
        horizonGoldMat,
        horizonRedMesh,
        horizonRedMat,
        barrageBeats,
        oreFlashes,
        sparks,
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

  private triggerOreFlash(
    inst: ParadoxSkillInstance,
    slotIdx: number,
    pt: WorldPoint3,
    scale: number,
    isGold: boolean
  ): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.24;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.9, pt.z + 0.15);
    f.mesh.scale.setScalar(scale * 0.4);
    f.mat.uniforms.uColor.value.set(isGold ? '#fbbf24' : '#ef4444');
    f.mat.uniforms.uCoreColor.value.set(isGold ? '#fef08a' : '#f43f5e');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchSparkBurst(
    inst: ParadoxSkillInstance,
    origin: THREE.Vector3,
    startIdx: number,
    count: number,
    speedMult: number
  ): void {
    const limit = Math.min(inst.sparks.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.sparks[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.42 + ((i * 19) % 10) * 0.032;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.16;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 5) * 0.21;
      const spd = (5.8 + ((i * 31) % 10) * 0.65) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (3.4 + ((i * 23) % 10) * 0.62) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseLen = (0.76 + (i % 4) * 0.24) * Math.max(0.75, inst.areaScale);
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
    inst.impactFired = false;
    inst.reversalFired = false;
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

    // 1. Dual-Polarity Paradox Astronomical Clock Floor + 3 Ornate Clock Hands (Hour, Minute, Reverse-Crimson Second)
    inst.chronoDialMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.chronoDialMesh.scale.setScalar(12.2 * as);
    inst.chronoDialMesh.visible = true;
    inst.chronoDialMat.uniforms.uProgress.value = 0;
    inst.chronoDialMat.uniforms.uFrozen.value = 0;
    inst.chronoDialMat.uniforms.uBlastT.value = 0;
    inst.chronoDialMat.uniforms.uHandAngle.value = 0;

    inst.hourHandMesh.position.set(opts.cx, opts.cy + 0.20, opts.cz);
    inst.minuteHandMesh.position.set(opts.cx, opts.cy + 0.21, opts.cz);
    inst.secondHandMesh.position.set(opts.cx, opts.cy + 0.22, opts.cz);
    inst.hourHandMesh.scale.set(3.2 * as, 1, 1.35 * as);
    inst.minuteHandMesh.scale.set(4.55 * as, 1, 1.0 * as);
    inst.secondHandMesh.scale.set(4.95 * as, 1, 0.58 * as);
    inst.hourHandMesh.rotation.y = 0.7;
    inst.minuteHandMesh.rotation.y = 2.1;
    inst.secondHandMesh.rotation.y = -1.2;
    inst.hourHandMesh.visible = true;
    inst.minuteHandMesh.visible = true;
    inst.secondHandMesh.visible = true;
    inst.clockHandMat.uniforms.uOpacity.value = 0;
    inst.clockHandMat.uniforms.uFrozen.value = 0;
    inst.secondHandMat.uniforms.uOpacity.value = 0;
    inst.secondHandMat.uniforms.uFrozen.value = 0;

    // 2. Gojo-Style Converging Dual Cores (Amber-Gold Chrono-Sol Star vs Nested Chaos Cubes)
    inst.chronoSunMesh.visible = false;
    inst.chaosCubeCoreMesh.visible = false;
    inst.chronoSunMat.uniforms.uOpacity.value = 1;
    inst.chaosCubeCoreMat.uniforms.uOpacity.value = 1;

    // 3. 24 Unknown-God Red-Black Spatial Cubes (with 4 Hero Monoliths!) swarming inward -> Zero-G Hangtime Burst
    const cubeLimit = this.lowQuality ? 10 : 16;
    for (let i = 0; i < inst.cubes.length; i++) {
      const cb = inst.cubes[i];
      cb.mesh.visible = i < cubeLimit;
      if (i >= cubeLimit) continue;
      cb.orbitAngle = (i / cubeLimit) * Math.PI * 2 + (i % 3) * 0.22;
      cb.orbitRadius = (2.85 + (i % 4) * 0.68) * as;
      cb.startY = 0.72 + (i % 5) * 0.56;
      cb.blastRadius = (2.35 + (i % 5) * 0.76) * as;
      cb.blastHeight = 0.78 + (i % 4) * 0.88;
      // Cinematic scale hierarchy: 4 hero monolith cubes + medium + agile shards
      const scaleTier = i % 6 === 0 ? 1.38 : i % 3 === 0 ? 0.92 : 0.62;
      cb.baseScale = scaleTier * safeAs;
      cb.mat.uniforms.uOpacity.value = 1;
    }

    // 4. Climax Paradox Shatter Nova: 8-Ray Impact Star + 14 Obsidian-Glass Shatter Shards + 6 3D Lightning Arcs + Twin Rings
    inst.impactStarMesh.position.set(opts.cx, opts.cy + 1.45, opts.cz + 0.15);
    inst.impactStarMesh.scale.setScalar(0.01);
    inst.impactStarMesh.visible = false;

    const shardLimit = this.lowQuality ? 7 : SHATTER_SHARD_COUNT;
    for (let i = 0; i < inst.shatterShards.length; i++) {
      const sh = inst.shatterShards[i];
      sh.mesh.visible = false;
      if (i >= shardLimit) continue;
      sh.azimuth = (i / shardLimit) * Math.PI * 2 + (i % 2) * 0.19;
      sh.blastRadius = (2.1 + (i % 4) * 0.88) * as;
      sh.blastHeight = 0.95 + (i % 4) * 0.78;
      sh.baseScale = (0.78 + (i % 3) * 0.34) * safeAs;
      sh.tiltX = ((i % 5) - 2) * 0.35;
      sh.tiltZ = ((i % 3) - 1) * 0.45;
      sh.spinSpeed = (i % 2 === 0 ? 1 : -1) * (0.45 + (i % 3) * 0.25);
    }

    const boltLimit = this.lowQuality ? 4 : ARC_BOLT_COUNT;
    for (let i = 0; i < inst.arcBolts.length; i++) {
      const b = inst.arcBolts[i];
      b.mesh.visible = false;
      if (i >= boltLimit) continue;
      b.azimuth = (i / boltLimit) * Math.PI * 2 + 0.32;
      b.mesh.position.set(opts.cx, opts.cy + 0.95, opts.cz);
      b.mesh.rotation.set(0, b.azimuth, b.tiltZ);
      b.mesh.scale.setScalar(b.scaleMult * as);
    }

    inst.horizonGoldMesh.position.set(opts.cx, opts.cy + 0.19, opts.cz);
    inst.horizonRedMesh.position.set(opts.cx, opts.cy + 0.20, opts.cz);
    inst.horizonGoldMesh.scale.setScalar(0.01);
    inst.horizonRedMesh.scale.setScalar(0.01);
    inst.horizonGoldMesh.visible = false;
    inst.horizonRedMesh.visible = false;

    const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
    for (let i = 0; i < inst.barrageBeats.length; i++) {
      const slot = inst.barrageBeats[i];
      slot.beatFired = i >= beatLimit;
      slot.targetIndex = i % inst.pts.length;
      slot.delay = 0.14 + i * 0.068;
    }

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    for (let i = 0; i < inst.sparks.length; i++) {
      inst.sparks[i].active = false;
      inst.sparks[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.88, '#0b0306', 1.32);
    this.hooks.onSpeedLines?.(0.92, 0.45);
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

      // 1. Dual-Polarity Paradox Astronomical Clock Floor + 3 Ornate Hands:
      // Smooth unfold (0-0.24s) -> Sweep -> FREEZE DEAD STILL (0.56-0.78s) -> Shockwave Surge & Reverse Rewind (0.78-2.4s)!
      const isTimeFrozen = inst.elapsed >= 0.56 && inst.elapsed < 0.78;
      inst.chronoDialMesh.visible = true;
      inst.chronoDialMat.uniforms.uProgress.value = uProgress;
      inst.chronoDialMat.uniforms.uTime.value = timeSec;
      inst.chronoDialMat.uniforms.uFrozen.value = isTimeFrozen ? 1 : 0;
      inst.chronoDialMat.uniforms.uHandAngle.value = inst.minuteHandMesh.rotation.y;
      if (inst.elapsed >= 0.78) {
        inst.chronoDialMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.78) / 0.56);
      }

      const handFadeIn = Math.min(1, inst.elapsed / 0.18);
      const handFadeOut = 1 - Math.max(0, (uProgress - 0.76) / 0.22);
      const handOp = handFadeIn * handFadeOut;
      if (handOp > 0.02) {
        inst.hourHandMesh.visible = true;
        inst.minuteHandMesh.visible = true;
        inst.secondHandMesh.visible = true;
        if (!isTimeFrozen) {
          if (inst.elapsed < 0.78) {
            // Forward Chrono sweep vs Reverse Crimson Paradox second hand
            inst.hourHandMesh.rotation.y += 2.2 * dt;
            inst.minuteHandMesh.rotation.y += 11.5 * dt;
            inst.secondHandMesh.rotation.y -= 16.5 * dt;
          } else {
            // Post-detonation temporal rewind spin (smoothly decelerating into Chrono Stasis)
            const rewindDecay = Math.max(0.15, 1 - (inst.elapsed - 0.78) / 1.4);
            inst.hourHandMesh.rotation.y -= 4.2 * rewindDecay * dt;
            inst.minuteHandMesh.rotation.y -= 18.0 * rewindDecay * dt;
            inst.secondHandMesh.rotation.y += 24.0 * rewindDecay * dt;
          }
        }
        inst.clockHandMat.uniforms.uFrozen.value = isTimeFrozen ? 1 : 0;
        inst.clockHandMat.uniforms.uOpacity.value = handOp;
        inst.secondHandMat.uniforms.uFrozen.value = isTimeFrozen ? 1 : 0;
        inst.secondHandMat.uniforms.uOpacity.value = handOp;
      } else {
        inst.hourHandMesh.visible = false;
        inst.minuteHandMesh.visible = false;
        inst.secondHandMesh.visible = false;
      }

      // 3. Gojo-Style Dual-Core Orbital Convergence (0.22s -> 0.78s): Chrono-Sol Star + Nested Chaos Cubes spiral into r = 0!
      if (inst.elapsed >= 0.22 && inst.elapsed < 0.80) {
        inst.chronoSunMesh.visible = true;
        inst.chaosCubeCoreMesh.visible = true;
        const convT = Math.min(1, (inst.elapsed - 0.22) / 0.54);
        const pullEase = Math.pow(convT, 1.85);
        const orbitR = (1.0 - pullEase) * 3.15 * as;
        const orbitAng = convT * Math.PI * 3.2;
        const coreY = inst.cy + 1.50 + Math.sin(convT * Math.PI) * 0.42;

        inst.chronoSunMesh.position.set(
          inst.cx + Math.cos(orbitAng) * orbitR,
          coreY,
          inst.cz + Math.sin(orbitAng) * orbitR * 0.78
        );
        inst.chaosCubeCoreMesh.position.set(
          inst.cx - Math.cos(orbitAng) * orbitR,
          coreY,
          inst.cz - Math.sin(orbitAng) * orbitR * 0.78
        );

        const corePop = Math.min(1, convT * 3.5);
        const compress = convT > 0.85 ? 1.0 - ((convT - 0.85) / 0.15) * 0.45 : 1.0;
        inst.chronoSunMesh.scale.setScalar((0.85 + 0.32 * convT) * corePop * compress * as);
        inst.chaosCubeCoreMesh.scale.setScalar((0.82 + 0.34 * convT) * corePop * compress * as);
        inst.chaosCubeCoreMesh.rotation.x += 5.2 * dt;
        inst.chaosCubeCoreMesh.rotation.y -= 6.4 * dt;
        inst.chronoSunMat.uniforms.uTime.value = timeSec;
        inst.chaosCubeCoreMat.uniforms.uTime.value = timeSec;
      } else {
        inst.chronoSunMesh.visible = false;
        inst.chaosCubeCoreMesh.visible = false;
      }

      // 4. 24 Unknown-God Red-Black Spatial Cubes:
      // Act 1-2: Swarm & snap at 90 deg -> Freeze tight at 0.56s -> Act 3: Detonate outward into Zero-G Hangtime!
      const cubeLimit = this.lowQuality ? 10 : 16;
      for (let i = 0; i < cubeLimit; i++) {
        const cb = inst.cubes[i];
        if (inst.elapsed < 0.78) {
          const pullT = inst.elapsed / 0.78;
          const r = cb.orbitRadius * (1.0 - Math.pow(pullT, 2.0) * 0.78);
          const ang = cb.orbitAngle + pullT * (i % 2 === 0 ? 3.1 : -2.5);
          cb.mesh.position.set(
            inst.cx + Math.cos(ang) * r,
            inst.cy + cb.startY * (1.0 - pullT * 0.25) + (isTimeFrozen ? 0 : Math.sin(timeSec * 4.0 + i) * 0.12),
            inst.cz + Math.sin(ang) * r * 0.82
          );
          if (!isTimeFrozen) {
            const snapStep = Math.floor(timeSec * 6.0 + i) * (Math.PI * 0.25);
            cb.mesh.rotation.set(snapStep, cb.orbitAngle + snapStep * 0.5, 0);
          }
          const cubeIntro = Math.min(1, Math.max(0, (inst.elapsed - (i % 6) * 0.025) / 0.16));
          cb.mesh.scale.setScalar(cb.baseScale * cubeIntro);
          cb.mat.uniforms.uTime.value = timeSec;
          cb.mat.uniforms.uOpacity.value = cubeIntro;
        } else {
          const blastElapsed = inst.elapsed - 0.78;
          const flyT = Math.min(1, blastElapsed / 0.26);
          const flyEase = 1 - Math.pow(1 - flyT, 3);
          const fadeOut = 1 - Math.max(0, (uProgress - 0.74) / 0.24);
          if (fadeOut <= 0.02) {
            cb.mesh.visible = false;
            continue;
          }
          const r = cb.blastRadius * (0.18 + 0.82 * flyEase) + blastElapsed * 0.34;
          const ang = cb.orbitAngle + 2.4;
          cb.mesh.position.set(
            inst.cx + Math.cos(ang) * r,
            inst.cy + 0.45 + cb.blastHeight * flyEase + Math.sin(timeSec * 1.8 + i) * 0.10,
            inst.cz + Math.sin(ang) * r * 0.84
          );
          cb.mesh.rotation.x += cb.spinSpeedX * 0.26 * dt;
          cb.mesh.rotation.y += cb.spinSpeedY * 0.26 * dt;
          cb.mesh.scale.setScalar(cb.baseScale * (1.14 - 0.24 * (1 - fadeOut)) * Math.max(0.15, fadeOut));
          cb.mat.uniforms.uTime.value = timeSec;
          cb.mat.uniforms.uOpacity.value = fadeOut;
        }
      }

      // 5. 6-Beat Pressure Hits on Ore Targets
      const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
      for (let i = 0; i < beatLimit; i++) {
        const slot = inst.barrageBeats[i];
        if (inst.elapsed < slot.delay) continue;
        if (!slot.beatFired) {
          slot.beatFired = true;
          const pt = inst.pts[slot.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.6 * as, i % 2 === 0);
          this.tmpTargetPos.set(pt.x, pt.y + 0.9, pt.z);
          this.launchSparkBurst(inst, this.tmpTargetPos, (i * 2) % 12, 2, 0.95);
          inst.onSlashBeatCallback?.(i, pt);
        }
      }

      // 6. ACT 3 ZERO-POINT PARADOX SHATTER HIT-STOP IMPACT FRAME (0.78s)
      if (!inst.impactFired && inst.elapsed >= 0.78) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.095;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.15, inst.cz);
        this.launchSparkBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 8 : 12, 1.75);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ff1e38', 0.095);
        this.hooks.onSpeedLines?.(1.0, 0.66);
        this.hooks.onCameraPush?.(0.42, 0.06);
        this.hooks.onFlash?.('#fbbf24', 0.76);
        inst.onImpactCallback?.();
      }

      // 7. ACT 3-4 PARADOX SHATTER NOVA (ZERO round blast dome!):
      // Sakuga 8-Ray Impact Star + 14 3D Obsidian-Glass Shatter Shards + 6 Black-Flash/Chrono Lightning Arcs + Twin Razor Shockwaves!
      if (inst.elapsed >= 0.78) {
        const detElapsed = inst.elapsed - 0.78;

        // 7A. Sakuga 8-Ray Dimensional Cross-Rift Impact Star (0.78s -> 1.14s)
        const starT = Math.min(1, detElapsed / 0.36);
        if (starT < 1) {
          inst.impactStarMesh.visible = true;
          const starPop = 1 - Math.pow(1 - Math.min(1, starT * 3.0), 3);
          inst.impactStarMesh.scale.setScalar((1.6 + 8.6 * starPop) * as);
          inst.impactStarMesh.rotation.z = starT * 0.25;
          inst.impactStarMat.uniforms.uLocalT.value = starT;
        } else {
          inst.impactStarMesh.visible = false;
        }

        // 7B. 14 Jagged 3D Dimensional Obsidian-Glass Shatter Shards bursting radially -> Zero-G hangtime -> pixel dissolve!
        const shardLimit = this.lowQuality ? 7 : SHATTER_SHARD_COUNT;
        const shardT = Math.min(1, detElapsed / 1.38);
        for (let i = 0; i < shardLimit; i++) {
          const sh = inst.shatterShards[i];
          if (shardT >= 1) {
            sh.mesh.visible = false;
            continue;
          }
          sh.mesh.visible = true;
          const burstEase = 1 - Math.pow(1 - Math.min(1, detElapsed / 0.24), 3);
          const r = sh.blastRadius * (0.14 + 0.86 * burstEase) + detElapsed * 0.28;
          sh.mesh.position.set(
            inst.cx + Math.cos(sh.azimuth) * r,
            inst.cy + 0.55 + sh.blastHeight * burstEase + Math.sin(timeSec * 1.6 + i) * 0.08,
            inst.cz + Math.sin(sh.azimuth) * r * 0.82
          );
          sh.mesh.rotation.set(
            sh.tiltX + detElapsed * sh.spinSpeed * 0.35,
            -sh.azimuth + Math.PI * 0.5,
            sh.tiltZ + detElapsed * sh.spinSpeed * 0.25
          );
          const scPop = Math.min(1, detElapsed / 0.08);
          sh.mesh.scale.setScalar(sh.baseScale * scPop);
          sh.mat.uniforms.uTime.value = timeSec;
          sh.mat.uniforms.uLocalT.value = shardT;
        }

        // 7C. 6 Whipping 3D Black-Flash & Chrono Lightning Arc Ribbons (0.78s -> 1.42s)
        const boltLimit = this.lowQuality ? 4 : ARC_BOLT_COUNT;
        for (let i = 0; i < boltLimit; i++) {
          const b = inst.arcBolts[i];
          const bElapsed = detElapsed - b.delay;
          if (bElapsed < 0 || bElapsed >= 0.58) {
            b.mesh.visible = false;
            continue;
          }
          b.mesh.visible = true;
          b.mat.uniforms.uLocalT.value = bElapsed / 0.58;
          b.mat.uniforms.uTime.value = timeSec;
        }

        // 7D. Twin Razor Ground Shockwave Rings
        const ringT1 = Math.min(1, detElapsed / 0.56);
        if (ringT1 < 1) {
          inst.horizonGoldMesh.visible = true;
          const rEase1 = 1 - Math.pow(1 - ringT1, 3);
          inst.horizonGoldMesh.scale.setScalar((2.2 + 11.4 * rEase1) * as);
          inst.horizonGoldMat.uniforms.uLocalT.value = ringT1;
        } else {
          inst.horizonGoldMesh.visible = false;
        }

        if (detElapsed >= 0.15) {
          const ringT2 = Math.min(1, (detElapsed - 0.15) / 0.60);
          if (ringT2 < 1) {
            inst.horizonRedMesh.visible = true;
            const rEase2 = 1 - Math.pow(1 - ringT2, 3);
            inst.horizonRedMesh.scale.setScalar((2.6 + 11.8 * rEase2) * as);
            inst.horizonRedMat.uniforms.uLocalT.value = ringT2;
          } else {
            inst.horizonRedMesh.visible = false;
          }
        }
      }

      // 8. Secondary Paradox Aftershock (1.08s)
      if (!inst.reversalFired && inst.elapsed >= 1.08) {
        inst.reversalFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.05, inst.cz);
        this.launchSparkBurst(inst, this.tmpTargetPos, 30, this.lowQuality ? 4 : 6, 1.42);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 3.9 * as, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.92, 0.0, '#fbbf24', 0.055);
        this.hooks.onSpeedLines?.(0.95, 0.38);
        inst.onImpactCallback?.();
      }

      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 2.5), 3);
        f.mesh.scale.setScalar(f.baseScale * (0.4 + 0.8 * pop));
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      for (let i = 0; i < inst.sparks.length; i++) {
        const sp = inst.sparks[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 11.0 * dt;
        sp.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.44;
        }
        sp.mesh.position.copy(sp.pos);
        const speedMag = sp.vel.length();
        const stretch = Math.min(1.8, 0.4 + speedMag * 0.16);
        sp.mesh.scale.set(sp.baseLen * stretch, sp.baseLen * 0.36, 1);
        sp.mesh.rotation.set(-0.35, Math.atan2(sp.vel.x, sp.vel.z), Math.atan2(sp.vel.y, Math.hypot(sp.vel.x, sp.vel.z)));
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
      this.instances[i].onImpactCallback = null;
      this.instances[i].onSlashBeatCallback = null;
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
