import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

const FUSION_BACK_NOISE_GLSL = `
  float fbHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float fbVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = fbHash21(i);
    float b = fbHash21(i + vec2(1.0, 0.0));
    float c = fbHash21(i + vec2(0.0, 1.0));
    float d = fbHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * fbVnoise(p);
      p = rot * p * 2.04 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  float fbVoronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float md = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(fbHash21(n + g), fbHash21(n + g + vec2(17.3, 31.7)));
        o = 0.5 + 0.42 * sin(6.2831853 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < md) md = d;
      }
    }
    return sqrt(md);
  }
`;

// ============================================================================
// 1. GLITCH CHESHIRE — Cyber-Phantom Glitch Ring Halo & 3D Cyber-Claw Shards
// ============================================================================

/**
 * Glitch Cheshire Back-Shader 1: Segmented Cyber-Glitch Ring Halo with RGB scanline tears,
 * black void data blocks, and phantom heterochromia diamond-eye + jagged grin core.
 * Cycles a 2.5s 3-phase Sakuga pulse (0.0-0.2 charge, 0.2-0.5 cubic glitch strike, 0.5-1.0 pixel dissolve).
 */
export function createCheshireCyberBackHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#22d3ee') },
      uCoreColor: { value: new THREE.Color('#d946ef') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_BACK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Quantized horizontal glitch bar displacement matching pose.webp
        float tick = floor(uTime * 16.0);
        float row = floor(p.y * 18.0);
        float rowTrigger = step(0.66, fbHash21(vec2(row, tick)));
        float shift = (fbHash21(vec2(tick, row * 1.3)) - 0.5) * 0.24 * rowTrigger * (0.7 + strike * 0.6);
        vec2 gp = vec2(p.x + shift, p.y);
        float r = length(gp);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(gp.y, gp.x);

        // Pitch-black cyber ring core with rectangular data-block cutouts
        float blockSec = floor((ang + 3.14159265) * 4.456);
        float blockAlive = step(0.18, fbHash21(vec2(blockSec, floor(uTime * 3.0))));
        float mainRing = smoothstep(0.062, 0.018, abs(r - 0.80)) * (0.45 + 0.55 * blockAlive);

        // RGB-Split Chromatic Aberration Rings (Cyan, Magenta, Acid-Yellow)
        float rCyan = length(gp + vec2(0.032, -0.01));
        float rMag = length(gp - vec2(0.032, 0.01));
        float rYel = length(gp + vec2(0.0, 0.026));
        float cyanArc = smoothstep(0.026, 0.004, abs(rCyan - 0.84));
        float magArc = smoothstep(0.026, 0.004, abs(rMag - 0.76));
        float yelArc = smoothstep(0.020, 0.003, abs(rYel - 0.81)) * step(0.55, fbHash21(vec2(row, blockSec)));

        // Protruding horizontal pixel glitch bars jutting across the ring
        float barMask = rowTrigger * smoothstep(0.96, 0.62, r) * smoothstep(0.52, 0.68, r)
          * step(0.35, fract(gp.x * 9.0 + shift * 4.0));

        // Inner phantom heterochromia eyes (left diamond reticle, right round pupil) + Cheshire grin
        vec2 eyeLP = gp - vec2(-0.22, 0.16);
        float diamondD = abs(eyeLP.x) * 1.35 + abs(eyeLP.y) * 1.85;
        float leftEye = smoothstep(0.022, 0.004, abs(diamondD - 0.11)) + smoothstep(0.035, 0.01, diamondD);
        vec2 eyeRP = (gp - vec2(0.22, 0.16)) * vec2(1.0, 1.25);
        float rightEye = smoothstep(0.095, 0.055, length(eyeRP)) - smoothstep(0.042, 0.018, length(eyeRP)) * 0.65;
        float grinR = length(gp - vec2(0.0, 0.12));
        float grinArc = smoothstep(0.034, 0.006, abs(grinR - 0.44)) * smoothstep(-0.04, -0.32, gp.y);
        float grinTeeth = grinArc * smoothstep(0.25, 0.85, abs(sin(gp.x * 38.0)));

        // 3-Phase procedural pixel-noise dissolve for outer glitch sparks
        float pixNoise = fbVnoise(floor(gp * 16.0) + vec2(0.0, -uTime * 3.0));
        float sparkDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, pixNoise);
        float outerSparks = barMask * sparkDissolve * charge;

        vec3 voidInk = vec3(0.02, 0.015, 0.05);
        vec3 cyanCol = uColor * (1.35 + strike * 0.45);
        vec3 magCol = uCoreColor * (1.35 + strike * 0.45);
        vec3 yellowCol = vec3(0.99, 0.88, 0.15) * 1.5;

        float inkBack = smoothstep(0.96, 0.68, r) * smoothstep(0.20, 0.44, r) * 0.78;
        float neonEnergy = clamp(cyanArc + magArc + yelArc + outerSparks + leftEye + rightEye + grinArc, 0.0, 1.0);
        float coreWhite = clamp((cyanArc * magArc) * 1.8 + grinTeeth * 0.9 + outerSparks * 0.65, 0.0, 1.0);

        vec3 col = voidInk;
        col = mix(col, cyanCol, clamp(cyanArc + outerSparks * 0.7, 0.0, 1.0));
        col += magCol * clamp(magArc + leftEye * 1.3 + outerSparks * 0.5, 0.0, 1.0);
        col += yellowCol * clamp(yelArc + rightEye * 1.35 + grinTeeth * 1.4, 0.0, 1.0);
        col = mix(col, voidInk, mainRing * (1.0 - clamp(cyanArc + magArc + yelArc + outerSparks, 0.0, 0.85)));
        col = mix(col, vec3(1.0), coreWhite * 0.85);

        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(inkBack, mainRing) * 1.15 + neonEnergy * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Glitch Cheshire Back-Shader 2: 3D Cyber-Claw & Tetromino Pixel Shard GLSL Shader
 * with scanline quantization, RGB split Fresnel rim, and hot white digital core.
 */
export function createCheshireGlitchClawBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#22d3ee') },
      uCoreColor: { value: new THREE.Color('#d946ef') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        float glitchSnap = step(0.86, fract(sin(floor(uTime * 14.0 + p.y * 6.0) * 91.7) * 43758.5));
        p.x += glitchSnap * 0.045 * sin(uTime * 40.0);
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${FUSION_BACK_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.6);

        float scanRow = floor(vLocalPos.y * 16.0 - uTime * 11.0);
        float scanBit = step(0.42, fbHash21(vec2(scanRow, floor(vLocalPos.x * 8.0))));
        float splitPhase = 0.5 + 0.5 * sin(vLocalPos.y * 10.0 + vLocalPos.x * 8.0 - uTime * 7.5);
        float yellowBit = step(0.78, fbHash21(vec2(scanRow * 0.7, floor(uTime * 9.0))));

        vec3 voidBody = vec3(0.03, 0.02, 0.07);
        vec3 neonHue = mix(uColor * 1.45, uCoreColor * 1.55, splitPhase);
        neonHue = mix(neonHue, vec3(0.99, 0.88, 0.16) * 1.6, yellowBit * 0.75);

        float coreHot = smoothstep(0.55, 0.92, rim + scanBit * 0.45);
        vec3 col = mix(voidBody, neonHue, clamp(rim * 0.95 + scanBit * 0.48, 0.0, 1.0));
        col = mix(col, vec3(1.0), coreHot * 0.72);

        float alpha = clamp(0.97 * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;
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
 * Sculpted Multi-Part 3D Cyber-Claw & Tetromino Pixel Block Geometry for Glitch Cheshire's back.
 */
export function createCheshireGlitchPixelWingGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Curved 3-faceted cyber-claw blade
  const clawMain = new THREE.ConeGeometry(0.11, 0.74, 4);
  clawMain.scale(0.65, 1.0, 0.36);
  clawMain.rotateZ(-0.22);
  clawMain.translate(0.0, 0.24, 0);
  parts.push(clawMain);

  // 2. Tetromino L-shaped pixel glitch blocks attached to the claw spine
  const pixelStem = new THREE.BoxGeometry(0.14, 0.36, 0.06);
  pixelStem.translate(-0.08, -0.06, 0.01);
  parts.push(pixelStem);

  const pixelArm = new THREE.BoxGeometry(0.26, 0.13, 0.06);
  pixelArm.translate(0.04, -0.18, 0.01);
  parts.push(pixelArm);

  // 3. Floating data diamond node
  const dataNode = new THREE.OctahedronGeometry(0.11, 0);
  dataNode.scale(0.85, 1.35, 0.5);
  dataNode.translate(0.12, 0.08, -0.02);
  parts.push(dataNode);

  return mergeSimpleGeos(parts);
}

// ============================================================================
// 2. THORN MAIDEN — Black-Iron Spiked Compass Wheel, Spirit Crown & Thorn Blades
// ============================================================================

/**
 * Thorn Maiden Back-Shader 1: Double-Ringed Black-Iron Spiked Compass Wheel Halo
 * with 16 razor spikes, 4 cardinal long needles, draped silver chains, and FBM crimson rose petals.
 */
export function createThornIronWheelBackHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f43f5e') },
      uCoreColor: { value: new THREE.Color('#fb7185') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_BACK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.16) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Slow gothic rotation for the double iron wheel
        float rotA = ang - uTime * 0.22;
        float outerIronRing = smoothstep(0.028, 0.006, abs(r - 0.78));
        float innerIronRing = smoothstep(0.024, 0.005, abs(r - 0.64));
        float wheelStruts = pow(max(0.0, cos(rotA * 8.0)), 22.0) * smoothstep(0.79, 0.63, r) * smoothstep(0.62, 0.66, r);

        // 16 outward razor spikes + 4 elongated cardinal compass needles matching pose.webp
        float spike16 = pow(max(0.0, cos(rotA * 8.0)), 28.0);
        float spike4 = pow(max(0.0, cos(rotA * 2.0)), 44.0);
        float spikeReach = 0.78 + spike16 * 0.13 + spike4 * 0.08;
        float ironSpikes = smoothstep(0.018, 0.002, r - spikeReach) * smoothstep(0.62, 0.72, r) * max(spike16, spike4);

        // Draped silver gothic chain links across the lower-left and lower-right quadrants
        float chainSagA = 0.70 - 0.14 * cos(p.x * 2.6 + 0.35);
        float chainSagB = 0.56 - 0.12 * cos(p.x * 3.1 - 0.4);
        float linkPatternA = smoothstep(0.35, 0.88, abs(sin((p.x + p.y) * 28.0)));
        float linkPatternB = smoothstep(0.35, 0.88, abs(sin((p.x - p.y) * 30.0)));
        float chainA = smoothstep(0.022, 0.005, abs(r - chainSagA)) * linkPatternA * smoothstep(0.45, -0.55, p.y);
        float chainB = smoothstep(0.020, 0.004, abs(r - chainSagB)) * linkPatternB * smoothstep(0.35, -0.65, p.y);
        float chains = clamp(chainA + chainB, 0.0, 1.0);

        // Swirling FBM crimson rose petals & 3-phase blood-ember noise dissolve
        float petalFbm = fbFbm(p * 3.8 + vec2(-uTime * 0.6, -uTime * 1.1));
        float petalCluster = smoothstep(0.56, 0.76, petalFbm) * smoothstep(0.94, 0.36, r) * smoothstep(0.24, 0.48, r);
        float petalDissolve = smoothstep(dissolveT - 0.1, dissolveT + 0.1, petalFbm);
        float activePetals = petalCluster * (0.55 + 0.45 * charge * petalDissolve);

        // Crimson-trimmed iron wheel highlight
        float ironMask = clamp(outerIronRing + innerIronRing + wheelStruts + ironSpikes, 0.0, 1.0);
        float crimsonRim = smoothstep(0.036, 0.012, abs(r - 0.78)) + smoothstep(0.032, 0.010, abs(r - 0.64));

        vec3 obsidianIron = vec3(0.035, 0.015, 0.025);
        vec3 silverChain = vec3(0.84, 0.88, 0.94);
        vec3 crimsonRose = uColor * (1.38 + strike * 0.48);
        vec3 pinkCore = mix(uCoreColor * 1.55, vec3(1.0, 0.95, 0.96), 0.5 + 0.5 * strike);

        vec3 col = obsidianIron;
        col = mix(col, crimsonRose, clamp(crimsonRim * 0.75 + activePetals * 1.15, 0.0, 1.0));
        col = mix(col, silverChain, chains * 0.92);
        col = mix(col, obsidianIron, ironMask * 0.82);
        col += pinkCore * (ironSpikes * 0.55 + activePetals * 0.65 + chains * 0.25);

        float darkBacking = smoothstep(0.95, 0.68, r) * smoothstep(0.20, 0.44, r) * 0.76;
        float edgeFade = smoothstep(0.99, 0.90, r) * smoothstep(0.16, 0.28, r);
        float alpha = clamp((max(darkBacking, ironMask) * 1.18 + (activePetals + chains) * 1.1) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Thorn Maiden Back-Shader 2: Obsidian Black-Iron, Silver Chain & Crimson Velvet Rose Shader
 * for her 7-spiked phantom spirit crown and radial barbed bramble thorn blades.
 */
export function createThornGothicBrambleBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f43f5e') },
      uCoreColor: { value: new THREE.Color('#fb7185') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.38, 0.86, 0.52));
        float ndv = abs(dot(N, V));
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.65);

        float spiralVein = smoothstep(0.58, 0.94, sin(vLocalPos.y * 12.0 + vLocalPos.x * 9.0 - uTime * 7.0));
        float tipHot = smoothstep(0.25, 0.95, vLocalPos.y);

        vec3 blackIron = vec3(0.04, 0.015, 0.03);
        vec3 crimson = uColor * 1.42;
        vec3 velvetPink = uCoreColor * 1.65;

        vec3 col = mix(blackIron, crimson, clamp(rim * 0.85 + spiralVein * 0.65, 0.0, 1.0));
        col = mix(col, velvetPink, clamp(tipHot * rim * 0.9 + spiralVein * 0.45 * ndl, 0.0, 1.0));
        col += vec3(1.0, 0.92, 0.94) * pow(rim, 2.8) * 0.78;

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;
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
 * Sculpted 3D 7-Spiked Gothic Spirit Crown Arch Geometry matching the masked phantom
 * looming behind Thorn Maiden's upper-right shoulder in idle.webp & pose.webp.
 */
export function createThornSpiritCrownGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Double curved gothic iron headband arches
  for (const rBand of [0.42, 0.50]) {
    const band = new THREE.TorusGeometry(rBand, 0.022, 6, 20, Math.PI * 0.92);
    band.rotateZ(Math.PI * 0.04);
    parts.push(band);
  }

  // 7 long razor gothic spikes radiating from the crown arch
  const spikeCount = 7;
  for (let i = 0; i < spikeCount; i++) {
    const u = i / (spikeCount - 1);
    const ang = (u - 0.5) * Math.PI * 0.82 + Math.PI * 0.5;
    const isCenter = i === 3;
    const len = isCenter ? 0.44 : 0.36 - Math.abs(i - 3) * 0.035;
    const spike = new THREE.ConeGeometry(isCenter ? 0.042 : 0.032, len, 4);
    spike.translate(0, 0.46 + len * 0.42, 0);
    spike.rotateZ(ang - Math.PI * 0.5);
    parts.push(spike);
  }

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Multi-Part 3D Barbed Bramble Thorn Spike Blade Geometry for Thorn Maiden's wheel perimeter.
 */
export function createThornBrambleSpikeBladeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const mainNeedle = new THREE.ConeGeometry(0.085, 0.88, 4);
  mainNeedle.scale(0.75, 1.0, 0.45);
  mainNeedle.translate(0, 0.44, 0);
  parts.push(mainNeedle);

  for (const sy of [-1, 1]) {
    const barb = new THREE.ConeGeometry(0.048, 0.28, 4);
    barb.rotateZ(sy * -0.78);
    barb.translate(sy * 0.08, 0.24 + (sy > 0 ? 0.14 : 0.0), 0);
    parts.push(barb);
  }

  const baseDiamond = new THREE.OctahedronGeometry(0.095, 0);
  baseDiamond.scale(0.85, 1.25, 0.55);
  parts.push(baseDiamond);

  return mergeSimpleGeos(parts);
}

// ============================================================================
// 3. MONOCHROME SAINT — Sumi-e Ink Ribbon Halo & 6 Gothic Cruciform Sword-Crosses
// ============================================================================

/**
 * Monochrome Saint Back-Shader 1: Winding Sumi-e Calligraphic Ink-Wash & Ash Ribbon Halo
 * with dry-brush bristle texture, manga screentone halftone dots, and 3-phase ink dissolve.
 */
export function createMonochromeSumiBackHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f8fafc') },
      uCoreColor: { value: new THREE.Color('#09090b') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_BACK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Flowing S-curve Sumi-e smoke ribbon + outer enso brush circle matching idle.webp & pose.webp
        float bristle = fbFbm(vec2(ang * 3.5 - uTime * 0.65, r * 5.5 - uTime * 0.8));
        float ensoRadius = 0.78 + 0.07 * sin(ang * 2.0 + uTime * 0.9) + (bristle - 0.5) * 0.09;
        float ensoStroke = smoothstep(0.085, 0.015, abs(r - ensoRadius));

        // Winding vertical S-ribbon behind her shoulders and head
        float sCurveX = 0.38 * sin(p.y * 3.6 - uTime * 1.4);
        float sRibbon = smoothstep(0.16, 0.025, abs(p.x - sCurveX) * (0.75 + 0.45 * bristle))
          * smoothstep(0.95, 0.25, r);

        // Manga screentone halftone dot grid inside the ash midtone band
        vec2 dotCell = fract(p * 16.0) - 0.5;
        float screentone = smoothstep(0.34, 0.16, length(dotCell));

        // 3-phase ink-mist noise dissolve on outer wisps
        float mistDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, bristle);
        float ribbonMask = clamp(ensoStroke + sRibbon * (0.65 + 0.35 * charge * mistDissolve), 0.0, 1.0);

        // Dark sumi-e ink outline border around pale ash & ivory core
        float coreBand = smoothstep(0.42, 0.86, ribbonMask * (0.65 + 0.45 * bristle));
        float inkOutline = smoothstep(0.08, 0.38, ribbonMask) * (1.0 - coreBand);

        vec3 sumiBlack = vec3(0.025, 0.025, 0.035);
        vec3 ashGrey = vec3(0.58, 0.62, 0.68);
        vec3 ivoryWhite = uColor * (1.35 + strike * 0.45);

        vec3 midTone = mix(sumiBlack, ashGrey, 0.45 + 0.55 * screentone);
        vec3 col = mix(midTone, ivoryWhite, coreBand);
        col = mix(col, sumiBlack, inkOutline * 0.88);

        float inkPlate = smoothstep(0.95, 0.68, r) * smoothstep(0.20, 0.42, r) * 0.68;
        float edgeFade = smoothstep(0.99, 0.88, r) * smoothstep(0.14, 0.26, r);
        float alpha = clamp((max(inkPlate * 0.85, ribbonMask) * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Monochrome Saint Back-Shader 2: Pitch-Black Obsidian Iron & Stark Ivory Cel-Edge Shader
 * for her 6 floating Gothic Cruciform Sword-Crosses.
 */
export function createMonochromeCruciformBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f8fafc') },
      uCoreColor: { value: new THREE.Color('#09090b') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.55);

        // Central gothic cross intersection node + vertical blade fuller line
        float centerStud = smoothstep(0.14, 0.03, length(vLocalPos.xy));
        float bladeSpine = smoothstep(0.026, 0.005, abs(vLocalPos.x)) * smoothstep(0.68, 0.12, abs(vLocalPos.y));
        float pulse = 0.78 + 0.22 * sin(uTime * 5.0 + vLocalPos.y * 8.0);
        float halftone = step(0.32, length(fract(vLocalPos.xy * 18.0) - 0.5));

        vec3 sumiIron = vec3(0.03, 0.032, 0.042);
        vec3 slateTone = vec3(0.26, 0.28, 0.34);
        vec3 starkIvory = uColor * 1.48;

        vec3 col = mix(sumiIron, slateTone, (1.0 - halftone) * 0.45);
        col = mix(col, starkIvory, clamp(rim * 1.05 + (centerStud + bladeSpine * 0.75) * pulse, 0.0, 1.0));

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;
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
 * Sculpted Multi-Part 3D Gothic Cruciform Sword-Cross Geometry matching the 6 floating
 * black cross-daggers around Monochrome Saint in idle.webp & pose.webp.
 */
export function createMonochromeCruciformSwordGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Long vertical lower dagger blade + upper finial spire
  const lowerBlade = new THREE.ConeGeometry(0.068, 0.68, 4);
  lowerBlade.scale(0.82, 1.0, 0.42);
  lowerBlade.rotateX(Math.PI);
  lowerBlade.translate(0, -0.36, 0);
  parts.push(lowerBlade);

  const upperSpire = new THREE.ConeGeometry(0.062, 0.46, 4);
  upperSpire.scale(0.82, 1.0, 0.42);
  upperSpire.translate(0, 0.25, 0);
  parts.push(upperSpire);

  // 2. Left & right horizontal cross-arms with diamond tips
  for (const sx of [-1, 1]) {
    const crossArm = new THREE.ConeGeometry(0.058, 0.44, 4);
    crossArm.scale(0.82, 1.0, 0.42);
    crossArm.rotateZ(sx * -Math.PI * 0.5);
    crossArm.translate(sx * 0.24, 0, 0);
    parts.push(crossArm);

    const armNode = new THREE.OctahedronGeometry(0.052, 0);
    armNode.scale(1.1, 0.75, 0.5);
    armNode.translate(sx * 0.16, 0, 0);
    parts.push(armNode);
  }

  // 3. Central gothic sanctuary intersection block
  const centerHub = new THREE.BoxGeometry(0.13, 0.13, 0.065);
  parts.push(centerHub);

  return mergeSimpleGeos(parts);
}

// ============================================================================
// 4. PRISM SERAPH — Chromatic Hexagram Ring, Overhead Triangle Halo & Diamonds
// ============================================================================

/**
 * Prism Seraph Back-Shader 1: Faceted Crystal Ring & Interlocking Rainbow Hexagram (Star of David)
 * matching pose.webp, with Voronoi crystal glints and 3-phase cellular refraction dissolve.
 */
export function createPrismHexagramBackHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#facc15') },
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
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_BACK_NOISE_GLSL}

      float sdEqTriangle(vec2 p, float r) {
        const float k = 1.7320508;
        p.x = abs(p.x) - r;
        p.y = p.y + r / k;
        if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
        p.x -= clamp(p.x, -2.0 * r, 0.0);
        return -length(p) * sign(p.y);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Slow majestic rotation for the Hexagram (two interlocking equilateral triangles)
        float rot = uTime * 0.18;
        mat2 mRot = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
        vec2 rp = mRot * p;

        float dTriUp = abs(sdEqTriangle(rp, 0.55));
        float dTriDn = abs(sdEqTriangle(vec2(rp.x, -rp.y), 0.55));
        float hexagramOuter = smoothstep(0.042, 0.008, min(dTriUp, dTriDn));
        float hexagramCore = smoothstep(0.016, 0.002, min(dTriUp, dTriDn));

        // Faceted Crystal Outer Ring matching pose.webp
        float vor = fbVoronoi(p * 6.5 + vec2(uTime * 0.3, -uTime * 0.25));
        float crystalBand = smoothstep(0.055, 0.012, abs(r - 0.80));
        float facetLines = smoothstep(0.18, 0.03, abs(vor - 0.38)) * crystalBand;
        float outerRim = smoothstep(0.022, 0.004, abs(r - 0.86));
        float innerRim = smoothstep(0.020, 0.004, abs(r - 0.74));

        // 3-phase cellular crystal sparkle dissolve
        float sparkleMask = smoothstep(0.24, 0.04, vor) * smoothstep(0.95, 0.32, r);
        float cellDissolve = smoothstep(dissolveT - 0.1, dissolveT + 0.1, 1.0 - vor);
        float activeSparkles = sparkleMask * charge * cellDissolve;

        // Spectral rainbow dispersion across the hexagram and crystal ring
        float huePhase = ang * 1.5 + r * 3.5 - uTime * 2.2;
        vec3 rainbow = 0.58 + 0.42 * cos(huePhase + vec3(0.0, 2.094, 4.188));
        vec3 pastelSpectrum = mix(mix(uColor, uCoreColor, 0.5 + 0.5 * sin(huePhase)), rainbow, 0.68);

        vec3 sapphireInk = vec3(0.03, 0.06, 0.16);
        float structMask = clamp(hexagramOuter + crystalBand * 0.85 + outerRim + innerRim + activeSparkles * 0.75, 0.0, 1.0);
        float hotWhite = clamp(hexagramCore + facetLines * 0.75 + activeSparkles * 0.85, 0.0, 1.0);

        vec3 col = mix(sapphireInk, pastelSpectrum * (1.38 + strike * 0.45), structMask);
        col = mix(col, vec3(1.0), hotWhite * 0.88);

        float darkBacking = smoothstep(0.95, 0.68, r) * smoothstep(0.20, 0.44, r) * 0.74;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(darkBacking, structMask) * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Prism Seraph Back-Shader 2: Iridescent Thin-Film Rainbow Crystal Shader
 * for her overhead floating triangular prism crown halo and 6 diamond wing shards.
 */
export function createPrismIridescentBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#facc15') },
      uCoreColor: { value: new THREE.Color('#38bdf8') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float iridPhase = (1.0 - ndv) * 5.2 + vLocalPos.y * 4.5 + vLocalPos.x * 3.5 - uTime * 3.6;
        vec3 rainbow = 0.60 + 0.40 * cos(iridPhase + vec3(0.0, 2.094, 4.188));
        vec3 prismCol = mix(mix(uColor, uCoreColor, 0.5 + 0.5 * sin(iridPhase)), rainbow, 0.72);

        float specFacet = pow(max(0.0, dot(N, normalize(vec3(0.45, 0.82, 0.52)))), 3.0);
        vec3 deepCrystal = vec3(0.05, 0.10, 0.24);
        vec3 col = mix(deepCrystal, prismCol * 1.48, clamp(0.48 + rim * 0.85 + specFacet * 0.55, 0.0, 1.0));
        col = mix(col, vec3(1.0), clamp(pow(rim, 2.4) * 0.82 + specFacet * 0.45, 0.0, 1.0));

        float alpha = clamp(0.97 * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;
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
 * Sculpted 3D Hollowed Triangular Prism Crown Halo Geometry (`△`) floating above Prism Seraph's head
 * exactly as depicted in idle.webp and pose.webp.
 */
export function createPrismTriangleCrownHaloGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const radius = 0.34;
  const barLen = radius * Math.sqrt(3);

  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const dist = radius * 0.5;
    const bar = new THREE.CylinderGeometry(0.036, 0.036, barLen + 0.04, 4);
    bar.rotateZ(Math.PI / 2);
    bar.translate(0, dist, 0);
    bar.rotateZ(ang);
    parts.push(bar);

    const cornerGem = new THREE.OctahedronGeometry(0.058, 0);
    const cornerAng = ang + Math.PI / 3;
    cornerGem.translate(Math.cos(cornerAng) * radius, Math.sin(cornerAng) * radius, 0);
    parts.push(cornerGem);
  }

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Multi-Part 3D Faceted Diamond & Winged Chevron Shard Geometry for Prism Seraph.
 */
export function createPrismWingDiamondGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const mainRhombus = new THREE.OctahedronGeometry(0.18, 0);
  mainRhombus.scale(0.72, 1.75, 0.38);
  parts.push(mainRhombus);

  const subFacet = new THREE.OctahedronGeometry(0.11, 0);
  subFacet.scale(0.65, 1.35, 0.35);
  subFacet.rotateZ(-0.28);
  subFacet.translate(0.14, 0.06, 0.01);
  parts.push(subFacet);

  return mergeSimpleGeos(parts);
}

// ============================================================================
// 5. AETHER MONARCH — 12-Ray Golden Sunburst Astrolabe & 9 Divine Broadswords
// ============================================================================

/**
 * Aether Monarch Back-Shader 1: 12-Pointed Blazing Golden Sunburst Corona & Filigree Astrolabe Halo
 * with cosmic nebula center, intersecting golden wire rings, and 3-phase solar flare dissolve.
 */
export function createAetherSunburstBackHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#22d3ee') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_BACK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Intricate golden astrolabe double filigree rings + eccentric orbital wire arcs (idle.webp)
        float ringOuter = smoothstep(0.018, 0.003, abs(r - 0.84));
        float ringInner = smoothstep(0.016, 0.003, abs(r - 0.72));
        float eccA = smoothstep(0.014, 0.002, abs(length(p - vec2(0.07 * cos(uTime * 0.6), 0.07 * sin(uTime * 0.6))) - 0.78));
        float eccB = smoothstep(0.014, 0.002, abs(length(p + vec2(0.07 * sin(uTime * 0.5), -0.07 * cos(uTime * 0.5))) - 0.78));
        float astrolabeWires = clamp(ringOuter + ringInner + (eccA + eccB) * 0.75, 0.0, 1.0);

        // 12-pointed blazing golden sunburst corona spikes + 4 cardinal star flares (pose.webp)
        float rotSun = ang - uTime * 0.15;
        float ray12 = pow(max(0.0, cos(rotSun * 6.0)), 18.0);
        float ray4 = pow(max(0.0, cos(ang * 2.0)), 36.0);
        float sunReach = 0.72 + ray12 * 0.22 + ray4 * 0.05;
        float sunSpikes = smoothstep(0.03, 0.0, r - sunReach) * smoothstep(0.46, 0.72, r) * max(ray12, ray4);

        // Polar coordinate cosmic nebula swirl & 3-phase stardust dissolve
        float swirlAng = ang + r * 3.8 - uTime * 0.85;
        float nebulaNoise = fbFbm(vec2(cos(swirlAng), sin(swirlAng)) * 2.6 + r * 3.0 - uTime * 0.4);
        float stardustDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, nebulaNoise);
        float coronaBurst = sunSpikes * (0.65 + 0.35 * charge * stardustDissolve);

        vec3 voidShadow = vec3(0.035, 0.025, 0.06);
        vec3 imperialGold = uColor * (1.42 + strike * 0.48);
        vec3 nebulaColor = mix(vec3(0.92, 0.26, 0.72), uCoreColor, 0.5 + 0.5 * sin(ang * 3.0 + uTime * 1.8));
        vec3 coreWhite = vec3(1.0, 0.98, 0.90);

        float nebulaBand = smoothstep(0.68, 0.28, r) * smoothstep(0.16, 0.34, r) * nebulaNoise;
        float goldMask = clamp(astrolabeWires + coronaBurst, 0.0, 1.0);
        float hotCenter = clamp(coronaBurst * 0.68 + ringInner * 0.45 + ray4 * smoothstep(0.96, 0.5, r) * 0.65, 0.0, 1.0);

        vec3 col = mix(voidShadow, nebulaColor * 1.15, nebulaBand * 0.75);
        col = mix(col, imperialGold, goldMask);
        col = mix(col, coreWhite, hotCenter * 0.88);

        float darkBacking = smoothstep(0.96, 0.66, r) * smoothstep(0.18, 0.42, r) * 0.80;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(darkBacking, goldMask) * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Aether Monarch Back-Shader 2: Cosmic Elemental Spectrum & Golden Filigree Broadsword Shader
 * for his 9 radially fanned Divine Broadswords (each sword gleams with cosmic elemental energy
 * along the blade + imperial gold crossguard + blazing white-gold core).
 */
export function createAetherSpectrumSwordBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#22d3ee') },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying vec3 vWorldDir;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = wPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying vec3 vWorldDir;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.55);

        float isBlade = smoothstep(0.02, 0.10, vLocalPos.y);
        float isGuard = smoothstep(0.08, 0.015, abs(vLocalPos.y)) * smoothstep(0.03, 0.14, abs(vLocalPos.x));
        float fullerCore = smoothstep(0.034, 0.006, abs(vLocalPos.x)) * isBlade;
        float energyFlow = 0.65 + 0.35 * sin(vLocalPos.y * 12.0 - uTime * 8.5);

        // Spectral hue shift across the 9-sword crown arc (gold -> cyan -> violet -> crimson)
        float fanHue = vWorldDir.x * 2.2 + vLocalPos.y * 0.8;
        vec3 elementalSpec = 0.58 + 0.42 * cos(fanHue + vec3(0.0, 2.094, 4.188));
        float centerGoldWeight = smoothstep(0.55, 0.08, abs(vWorldDir.x));
        vec3 bladeHue = mix(elementalSpec * 1.48, uColor * 1.55, centerGoldWeight * 0.72);

        vec3 royalObsidian = vec3(0.05, 0.04, 0.10);
        vec3 imperialGold = uColor * 1.48;
        vec3 hotCore = vec3(1.0, 0.98, 0.92);

        vec3 bladeCol = mix(royalObsidian, bladeHue, clamp(0.45 + rim * 0.85, 0.0, 1.0));
        bladeCol = mix(bladeCol, hotCore, clamp(fullerCore * energyFlow * 0.95 + pow(rim, 2.4) * 0.75, 0.0, 1.0));

        vec3 hiltGuardCol = mix(royalObsidian, imperialGold, clamp(0.55 + rim * 0.75 + isGuard * 0.35, 0.0, 1.0));
        hiltGuardCol = mix(hiltGuardCol, hotCore, isGuard * rim * 0.65);

        vec3 col = mix(hiltGuardCol, bladeCol, isBlade);

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;
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
 * Sculpted Multi-Part 3D Divine Broadsword Geometry for Aether Monarch's 9-Sword Crown Fan
 * matching the ornate crossguard swords in idle.webp.
 */
export function createAetherDivineBroadSwordGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Pommel & grip
  shape.moveTo(-0.022, -0.28);
  shape.lineTo(0.022, -0.28);
  shape.lineTo(0.026, -0.04);
  // Winged ornate royal crossguard
  shape.lineTo(0.16, 0.02);
  shape.lineTo(0.19, 0.08);
  shape.lineTo(0.11, 0.05);
  shape.lineTo(0.068, 0.09);
  // Tapered broadsword blade up to sharp celestial tip
  shape.lineTo(0.052, 0.82);
  shape.lineTo(0.0, 1.12);
  shape.lineTo(-0.052, 0.82);
  shape.lineTo(-0.068, 0.09);
  shape.lineTo(-0.11, 0.05);
  shape.lineTo(-0.19, 0.08);
  shape.lineTo(-0.16, 0.02);
  shape.lineTo(-0.026, -0.04);
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  bladeGeo.translate(0, 0, -0.016);

  const guardGem = new THREE.OctahedronGeometry(0.055, 0);
  guardGem.scale(0.85, 1.25, 0.55);
  guardGem.translate(0, 0.04, 0);

  return mergeSimpleGeos([bladeGeo, guardGem]);
}
