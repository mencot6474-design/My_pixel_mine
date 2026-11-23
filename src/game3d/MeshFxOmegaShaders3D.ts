import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

/** Crimson Ronin Back-Shader 1: Cyber-Samurai Tsuba HUD Halo & 4-Point Spark Seal (NormalBlending for dark-ink contrast). */
export function createCrimsonTsubaHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
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
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      float diamondStar(vec2 d, float radius) {
        vec2 ad = abs(d);
        float crossShape = smoothstep(radius * 0.22, 0.0, ad.x) * smoothstep(radius, 0.0, ad.y)
          + smoothstep(radius * 0.22, 0.0, ad.y) * smoothstep(radius, 0.0, ad.x);
        float core = smoothstep(radius * 0.34, 0.0, length(d));
        return clamp(crossShape + core * 0.85, 0.0, 1.0);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.18) discard;
        float angle = atan(p.y, p.x);

        // Dark ink backing band so glowing crimson/gold HUD rings pop against bright arenas
        float inkBand = smoothstep(0.95, 0.72, r) * smoothstep(0.24, 0.44, r) * 0.76;

        // Outer segmented cyber-tsuba armor ring (slow clockwise rotation)
        float outerAngle = angle - uTime * 0.42;
        float segGate = smoothstep(-0.18, 0.24, cos(outerAngle * 4.0));
        float outerArc = exp(-pow((r - 0.84) * 26.0, 2.0)) * (0.35 + 0.65 * segGate);
        float outerTrim = exp(-pow((r - 0.90) * 42.0, 2.0)) * segGate * 0.75;

        // Mid precision HUD calibration ticks (counter-clockwise)
        float midAngle = angle + uTime * 0.68;
        float midRing = exp(-pow((r - 0.67) * 32.0, 2.0)) * 0.85;
        float hudTicks = smoothstep(0.58, 0.96, cos(midAngle * 24.0))
          * smoothstep(0.56, 0.61, r) * smoothstep(0.75, 0.70, r);

        // Inner breathing crimson energy core ring + expanding shock-pulse
        float pulse = 0.86 + 0.14 * sin(uTime * 2.8);
        float innerRing = exp(-pow((r - 0.44) * 24.0, 2.0)) * pulse;
        float ripplePhase = fract(uTime * 0.48);
        float rippleR = mix(0.32, 0.90, ripplePhase);
        float ripple = exp(-pow((r - rippleR) * 26.0, 2.0)) * (1.0 - ripplePhase) * 0.55;

        // Four cyber-tsuba spokes + 4-point diamond stars matching Crimson Ronin's silhouette
        float spokes = pow(max(0.0, cos(outerAngle * 2.0)), 18.0)
          * smoothstep(0.84, 0.42, r) * smoothstep(0.30, 0.46, r) * 0.7;

        float sparkSum = 0.0;
        for (int i = 0; i < 4; i++) {
          float sa = float(i) * 1.5707963 + 0.785398 + uTime * 0.25;
          vec2 sc = vec2(cos(sa), sin(sa)) * 0.76;
          float tw = 0.72 + 0.28 * sin(uTime * 4.2 + float(i) * 1.57);
          sparkSum += diamondStar(p - sc, 0.11) * tw;
        }
        sparkSum = clamp(sparkSum, 0.0, 1.0);

        vec3 inkBlack = vec3(0.04, 0.02, 0.05);
        vec3 crimson = vec3(0.94, 0.22, 0.24);
        vec3 emberGold = vec3(0.99, 0.74, 0.22);
        vec3 hotCore = vec3(1.0, 0.94, 0.92);

        float crimsonMask = clamp(outerArc + midRing * 0.85 + innerRing + hudTicks * 0.85 + spokes + ripple, 0.0, 1.0);
        float goldMask = clamp(outerTrim * 0.8 + sparkSum * 0.95 + hudTicks * 0.35, 0.0, 1.0);
        float coreMask = clamp(sparkSum * 0.65 + innerRing * 0.35 + outerArc * 0.2, 0.0, 1.0);

        vec3 col = mix(inkBlack, crimson, crimsonMask);
        col = mix(col, emberGold, goldMask);
        col = mix(col, hotCore, coreMask);

        float edgeFade = smoothstep(0.99, 0.87, r) * smoothstep(0.18, 0.30, r);
        float alpha = clamp((inkBand * 1.18 + max(crimsonMask, goldMask) * 1.12) * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Crimson Ronin Back-Shader 2: Dark-Ink & Crimson-Gold Hamon Edge Katana GLSL Shader. */
export function createCrimsonKatanaShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
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
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.82, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.7);

        float isBlade = smoothstep(-0.02, 0.04, vLocalPos.y);
        float isTsuba = smoothstep(0.055, 0.015, abs(vLocalPos.y)) * smoothstep(0.04, 0.09, abs(vLocalPos.x));
        float hamonWave = 0.012 * sin(vLocalPos.y * 28.0);
        float cuttingEdge = smoothstep(-0.01 + hamonWave, 0.045 + hamonWave, vLocalPos.x);
        float energyFlow = smoothstep(0.35, 0.95, sin(vLocalPos.y * 14.0 - uTime * 9.0));

        vec3 obsidianSteel = vec3(0.08, 0.06, 0.10);
        vec3 crimsonGlow = vec3(0.95, 0.20, 0.24);
        vec3 goldEdge = vec3(1.0, 0.78, 0.28);
        vec3 whiteEdge = vec3(1.0, 0.94, 0.92);

        vec3 bladeCol = mix(obsidianSteel, crimsonGlow * (0.75 + 0.45 * ndl), cuttingEdge * 0.88 + rim * 0.4);
        bladeCol = mix(bladeCol, whiteEdge, cuttingEdge * (0.28 + 0.42 * energyFlow) * ndl);
        bladeCol += crimsonGlow * (energyFlow * 0.22);

        // Hilt wrap & metallic cyber-gold tsuba guard
        float hiltWrap = 0.5 + 0.5 * sin(vLocalPos.y * 42.0);
        vec3 hiltCol = mix(obsidianSteel, crimsonGlow * 0.65, hiltWrap * 0.75 + rim * 0.35);
        vec3 tsubaCol = mix(crimsonGlow, goldEdge, 0.65 + 0.35 * ndl);

        vec3 col = mix(hiltCol, bladeCol, isBlade);
        col = mix(col, tsubaCol, isTsuba);

        float alpha = clamp(0.96 * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** 3D Curved Sori Katana Geometry for Crimson Ronin (tsuka hilt + chamfered tsuba guard + curved blade & kissaki tip). */
export function createRoninKatanaGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Tsuka hilt
  shape.moveTo(-0.024, -0.34);
  shape.lineTo(0.024, -0.34);
  shape.lineTo(0.026, -0.045);
  // Tsuba guard
  shape.lineTo(0.115, -0.045);
  shape.lineTo(0.125, -0.01);
  shape.lineTo(0.105, 0.022);
  // Gently curved cutting edge (sori) up to sharp kissaki tip
  shape.lineTo(0.048, 0.026);
  shape.lineTo(0.062, 0.34);
  shape.lineTo(0.088, 0.68);
  shape.lineTo(0.115, 0.90);
  shape.lineTo(0.042, 1.02);
  // Spine (mune) back down to tsuba
  shape.lineTo(0.025, 0.66);
  shape.lineTo(-0.012, 0.32);
  shape.lineTo(-0.028, 0.024);
  shape.lineTo(-0.105, 0.022);
  shape.lineTo(-0.125, -0.01);
  shape.lineTo(-0.115, -0.045);
  shape.lineTo(-0.026, -0.045);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

/** Yukikage Twins Floor-Seal Shader: 6-fold Snowflake Mandala & Sumi-e Ink Frost Rim (NormalBlending). */
export function createYukikageFrostSealShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
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
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        float inkBack = smoothstep(0.95, 0.72, r) * smoothstep(0.08, 0.34, r) * 0.72;
        float outerRing = exp(-pow((r - 0.86) * 26.0, 2.0));
        float midRing = exp(-pow((r - 0.64) * 28.0, 2.0)) * 0.85;
        float innerRing = exp(-pow((r - 0.34) * 26.0, 2.0)) * 0.9;

        // 6-fold Snowflake crystalline arms & side crystal barbs
        float rotA = angle - uTime * 0.55;
        float spoke = pow(max(0.0, cos(rotA * 3.0)), 14.0) * smoothstep(0.90, 0.14, r) * smoothstep(0.10, 0.24, r);
        float hexSector = mod(rotA + 0.523598, 1.047197) - 0.523598;
        float barb = exp(-pow((abs(hexSector) * r - (r - 0.38) * 0.45) * 28.0, 2.0))
          * smoothstep(0.36, 0.44, r) * smoothstep(0.84, 0.72, r);
        float shrineTicks = smoothstep(0.55, 0.96, cos((angle + uTime * 0.75) * 18.0))
          * smoothstep(0.65, 0.70, r) * smoothstep(0.84, 0.79, r);

        vec3 sumiInk = vec3(0.02, 0.05, 0.11);
        vec3 frostCyan = vec3(0.22, 0.75, 0.98);
        vec3 snowWhite = vec3(0.92, 0.98, 1.0);

        float iceMask = clamp(outerRing + midRing + innerRing + spoke + barb * 0.9 + shrineTicks * 0.85, 0.0, 1.0);
        vec3 col = mix(sumiInk, frostCyan, iceMask);
        col = mix(col, snowWhite, clamp(spoke * 0.75 + outerRing * 0.45 + innerRing * 0.4, 0.0, 1.0));

        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp((inkBack * 1.18 + iceMask * 1.12) * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.01) discard;
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
 * Obsidian Sovereign Back-Shader 1: Sakuga Black-Flame Cloak Wings, 9-Spearhead Iron Halo
 * & Branching White-Hot Lightning Aura Shader (Domain-Warped FBM + Ridged Noise + 2.5s 3-Phase Cycle).
 */
export function createObsidianCrownHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
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
      uniform float uTime;
      uniform float uProgress;
      varying vec2 vUv;

      float obHash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float obVnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = obHash21(i);
        float b = obHash21(i + vec2(1.0, 0.0));
        float c = obHash21(i + vec2(0.0, 1.0));
        float d = obHash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float obFbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 3; i++) {
          v += a * obVnoise(p);
          p = rot * p * 2.05 + vec2(2.1, 7.4);
          a *= 0.5;
        }
        return v;
      }

      float obRidged(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        float freq = 1.0;
        for (int i = 0; i < 3; i++) {
          float n = obVnoise(p * freq) * 2.0 - 1.0;
          n = 1.0 - abs(n);
          v += (n * n * n) * a;
          freq *= 2.15;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        // 2.5s 3-Phase Sakuga Timeline: 0.0-0.2 Charge, 0.2-0.5 Snappy Strike Surge, 0.5-1.0 Ash Noise Dissolve
        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // 1. Domain-Warped Upward Roaring Black-Flame Cloak Wings (matching pose.webp crescent mantle)
        vec2 flameUv = vec2(p.x * 2.6, p.y * 2.2 - uTime * 1.45);
        vec2 warp = vec2(obFbm(flameUv + vec2(0.0, -uTime * 0.4)), obFbm(flameUv + vec2(4.2, 1.9)));
        float flameNoise = obFbm(flameUv + warp * 1.45);
        float wingArch = smoothstep(0.98, 0.38, r) * smoothstep(0.18, 0.46, r)
          * (0.65 + 0.35 * smoothstep(-0.45, 0.55, p.y + abs(p.x) * 0.55));
        float ashDissolve = smoothstep(dissolveT - 0.14, dissolveT + 0.14, flameNoise);
        float flameField = wingArch * (0.48 + 0.52 * flameNoise) * (0.68 + 0.32 * charge * ashDissolve);

        float blackFlameCore = smoothstep(0.32, 0.42, flameField);
        float silverFlameRim = smoothstep(0.24, 0.33, flameField) * (1.0 - smoothstep(0.36, 0.48, flameField));

        // 2. Forged Dark-Steel Halo Ring + 9 Diamond Spearhead Spikes across Upper/Side Arc (matching idle.webp & pose.webp)
        float upperArcMask = smoothstep(-0.42, -0.05, p.y);
        float steelRing = smoothstep(0.036, 0.008, abs(r - 0.68)) * (0.35 + 0.65 * upperArcMask);
        float steelInner = smoothstep(0.014, 0.003, abs(r - 0.645)) * upperArcMask;

        // 9 radial spear spikes around top and sides (-25 deg to 205 deg)
        float spearGate = smoothstep(-0.38, -0.08, p.y);
        float spearWave = pow(max(0.0, cos((ang - 1.5707963) * 4.0)), 26.0) * spearGate;
        float spearReachOuter = 0.68 + spearWave * 0.25;
        float spearReachInner = 0.68 - spearWave * 0.12;
        float spearSpikes = smoothstep(0.018, 0.002, r - spearReachOuter)
          * smoothstep(0.018, 0.002, spearReachInner - r) * spearWave;

        // 3. Branching Sakuga White-Hot Lightning Arcs (Ridged Noise + Fast Flicker)
        float boltTick = floor(uTime * 15.0);
        vec2 boltUv = vec2(ang * 2.4 + obHash21(vec2(boltTick, 1.0)) * 3.1, r * 5.2 - uTime * 3.2);
        float rNoise = obRidged(boltUv + warp * 0.85);
        float lightning = smoothstep(0.76 - strike * 0.08, 0.84, rNoise)
          * smoothstep(0.96, 0.34, r) * smoothstep(0.20, 0.42, r);
        float boltCore = smoothstep(0.83, 0.91, rNoise) * lightning;

        // 4. Four-Point Star Glints floating in the ghostly ash smoke (matching idle.webp lower-right/left stars)
        float starGlints = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 sp = vec2((i < 2 ? -0.64 : 0.64) + (i == 1 || i == 2 ? 0.12 : -0.06), -0.18 + mod(fi, 2.0) * 0.36);
          vec2 d = abs(p - sp);
          float crossStar = (smoothstep(0.016, 0.0, d.x) * smoothstep(0.095, 0.0, d.y)
            + smoothstep(0.016, 0.0, d.y) * smoothstep(0.095, 0.0, d.x))
            * (0.6 + 0.4 * sin(uTime * 5.5 + fi * 1.9));
          starGlints += crossStar;
        }
        starGlints = clamp(starGlints, 0.0, 1.0);

        vec3 vantablack = vec3(0.025, 0.03, 0.045);
        vec3 gunmetal = vec3(0.24, 0.28, 0.35);
        vec3 ashSageMist = vec3(0.68, 0.76, 0.74);
        vec3 pureWhite = vec3(0.98, 0.99, 1.0);

        float hardwareMask = clamp(steelRing + spearSpikes, 0.0, 1.0);
        float hotMask = clamp(boltCore + starGlints + spearSpikes * 0.55 + steelInner * 0.65, 0.0, 1.0);

        vec3 col = mix(vantablack, ashSageMist * 0.85, silverFlameRim);
        col = mix(col, vantablack, blackFlameCore * 0.92);
        col = mix(col, mix(vantablack, gunmetal * 1.35, 0.65), hardwareMask);
        col = mix(col, ashSageMist * (1.25 + strike * 0.35), lightning * 0.75);
        col = mix(col, pureWhite * (1.45 + strike * 0.45), clamp(hotMask + lightning * 0.65, 0.0, 1.0));

        float totalAlphaMask = clamp(max(blackFlameCore * 0.92 + silverFlameRim * 0.85, hardwareMask) + lightning + starGlints, 0.0, 1.0);
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp(totalAlphaMask * 1.18 * edgeFade * uOpacity, 0.0, 0.98);
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
 * Obsidian Sovereign Back-Shader 2: Pitch-Black Obsidian Iron, Gunmetal Bevel & Branching
 * White-Hot Lightning Vein Greatsword Shader (matching idle.webp, pose.webp & attack.webp).
 */
export function createObsidianGreatswordShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
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
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.42, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.6);

        float isBlade = smoothstep(0.06, 0.22, vLocalPos.y);
        float isGuard = smoothstep(0.14, 0.04, abs(vLocalPos.y - 0.04)) * smoothstep(0.05, 0.16, abs(vLocalPos.x));
        float edgeBevel = smoothstep(0.045, 0.115, abs(vLocalPos.x));

        // Jagged branching white-lightning vein fractures down the black fuller core
        float zigMain = 0.024 * sin(vLocalPos.y * 11.5) + 0.012 * cos(vLocalPos.y * 27.0);
        float zigFork = 0.038 * cos(vLocalPos.y * 16.0 - 1.2);
        float mainVein = smoothstep(0.022, 0.004, abs(vLocalPos.x - zigMain));
        float forkVein = smoothstep(0.014, 0.002, abs(vLocalPos.x - zigFork)) * step(0.25, sin(vLocalPos.y * 7.5));
        float lightningVein = clamp(mainVein + forkVein * 0.85, 0.0, 1.0)
          * smoothstep(0.20, 0.36, vLocalPos.y) * smoothstep(2.28, 1.90, vLocalPos.y);
        float surge = 0.72 + 0.28 * sin(vLocalPos.y * 9.0 - uTime * 11.0);

        vec3 obsidianCore = vec3(0.03, 0.035, 0.05);
        vec3 gunmetalSteel = vec3(0.32, 0.37, 0.45);
        vec3 silverBevel = vec3(0.84, 0.89, 0.95);
        vec3 whiteLightning = vec3(0.98, 0.99, 1.0);

        vec3 bladeCol = mix(obsidianCore, gunmetalSteel * (0.75 + 0.45 * ndl), edgeBevel * 0.9);
        bladeCol = mix(bladeCol, silverBevel, clamp(edgeBevel * rim * 1.15 + pow(rim, 2.2) * 0.55, 0.0, 1.0));
        bladeCol = mix(bladeCol, whiteLightning * (1.25 + 0.45 * surge), lightningVein * 0.95);

        vec3 hiltCol = mix(obsidianCore, gunmetalSteel, 0.48 + rim * 0.45);
        vec3 guardCol = mix(obsidianCore, silverBevel, 0.38 + 0.45 * ndl + rim * 0.45);

        vec3 col = mix(hiltCol, bladeCol, isBlade);
        col = mix(col, guardCol, isGuard);

        float alpha = clamp(0.98 * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
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
 * Obsidian Sovereign Back-Shader 3: Shattered Obsidian Monolith Crag & White-Lightning Fracture Shader
 * for the 4 levitating rock monoliths flanking his cloak in pose.webp.
 */
export function createObsidianMonolithShardShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
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
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.38, 0.86, 0.52));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.32, 0.42, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.55);

        // Glowing white-silver lightning crack along the monolith facets
        float crackWave = abs(sin(vLocalPos.y * 9.5 + vLocalPos.x * 12.0) * cos(vLocalPos.y * 7.0 - vLocalPos.z * 11.0));
        float lightningCrack = smoothstep(0.14, 0.015, crackWave) * (0.65 + 0.35 * sin(uTime * 12.0 + vLocalPos.y * 8.0));

        vec3 basaltBlack = vec3(0.035, 0.04, 0.055);
        vec3 slateGrey = vec3(0.26, 0.30, 0.37);
        vec3 starkWhite = vec3(0.96, 0.98, 1.0);

        vec3 col = mix(basaltBlack, slateGrey, cel * 0.72);
        col = mix(col, starkWhite * 1.45, clamp(rim * 0.85 + lightningCrack * 0.95, 0.0, 1.0));

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
 * Sculpted Multi-Part 3D Shattered Obsidian Monolith Crag Geometry (angular main basalt spire
 * + sheared flanking crag shard + floating rubble satellite) matching pose.webp.
 */
export function createObsidianShatterMonolithGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Main angular sheared obsidian monolith spire
  const mainSpire = new THREE.ConeGeometry(0.16, 0.86, 5);
  mainSpire.scale(0.85, 1.0, 0.55);
  mainSpire.translate(0, 0.22, 0);
  parts.push(mainSpire);

  const lowerRoot = new THREE.ConeGeometry(0.15, 0.42, 5);
  lowerRoot.scale(0.82, 1.0, 0.52);
  lowerRoot.rotateX(Math.PI);
  lowerRoot.translate(0, -0.38, 0);
  parts.push(lowerRoot);

  // 2. Jagged side crag shard
  const sideCrag = new THREE.OctahedronGeometry(0.14, 0);
  sideCrag.scale(0.65, 1.65, 0.48);
  sideCrag.rotateZ(-0.28);
  sideCrag.translate(0.14, -0.05, 0.02);
  parts.push(sideCrag);

  // 3. Detached upper rubble crystal fragment
  const rubbleBit = new THREE.OctahedronGeometry(0.075, 0);
  rubbleBit.scale(0.8, 1.25, 0.6);
  rubbleBit.rotateZ(0.35);
  rubbleBit.translate(-0.14, 0.42, -0.01);
  parts.push(rubbleBit);

  return mergeSimpleGeos(parts);
}
