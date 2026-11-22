import * as THREE from 'three';

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
        float rim = pow(1.0 - ndv, 1.7);

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

/** Obsidian Sovereign Back-Shader 1: 7-Spiked Abyssal Crown HUD Halo & Void Eclipse Seal (NormalBlending). */
export function createObsidianCrownHaloShaderMaterial(): THREE.ShaderMaterial {
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

        // Deep abyssal void-ink backing ring
        float inkBand = smoothstep(0.96, 0.70, r) * smoothstep(0.22, 0.44, r) * 0.82;

        // 7-segmented gothic armor crown ring (slow clockwise)
        float crownAngle = angle - uTime * 0.34;
        float crownGate = smoothstep(-0.15, 0.26, cos(crownAngle * 7.0));
        float outerCrown = exp(-pow((r - 0.84) * 26.0, 2.0)) * (0.35 + 0.65 * crownGate);
        float outerTrim = exp(-pow((r - 0.90) * 40.0, 2.0)) * crownGate * 0.8;

        // Mid runic calibration ticks (counter-clockwise)
        float runeAngle = angle + uTime * 0.55;
        float midRing = exp(-pow((r - 0.66) * 30.0, 2.0)) * 0.85;
        float runeTicks = smoothstep(0.55, 0.96, cos(runeAngle * 21.0))
          * smoothstep(0.54, 0.60, r) * smoothstep(0.75, 0.70, r);

        // Inner breathing silver-violet eclipse rim + dark shock ripple
        float pulse = 0.86 + 0.14 * sin(uTime * 2.5);
        float innerRing = exp(-pow((r - 0.44) * 24.0, 2.0)) * pulse;
        float ripplePhase = fract(uTime * 0.44);
        float rippleR = mix(0.32, 0.90, ripplePhase);
        float ripple = exp(-pow((r - rippleR) * 26.0, 2.0)) * (1.0 - ripplePhase) * 0.55;

        // 7 gothic crown spokes
        float spokes = pow(max(0.0, cos(crownAngle * 3.5)), 16.0)
          * smoothstep(0.85, 0.40, r) * smoothstep(0.28, 0.44, r) * 0.65;

        float sparkSum = 0.0;
        for (int i = 0; i < 4; i++) {
          float sa = float(i) * 1.5707963 + 0.785398 - uTime * 0.22;
          vec2 sc = vec2(cos(sa), sin(sa)) * 0.76;
          float tw = 0.72 + 0.28 * sin(uTime * 3.8 + float(i) * 1.57);
          sparkSum += diamondStar(p - sc, 0.105) * tw;
        }
        sparkSum = clamp(sparkSum, 0.0, 1.0);

        vec3 voidInk = vec3(0.03, 0.02, 0.06);
        vec3 royalViolet = vec3(0.66, 0.34, 0.98);
        vec3 silverRim = vec3(0.88, 0.91, 0.98);
        vec3 coreWhite = vec3(0.98, 0.96, 1.0);

        float violetMask = clamp(outerCrown + midRing * 0.85 + runeTicks * 0.9 + spokes + ripple, 0.0, 1.0);
        float silverMask = clamp(innerRing * 0.85 + outerTrim * 0.75 + sparkSum * 0.9, 0.0, 1.0);
        float coreMask = clamp(sparkSum * 0.65 + innerRing * 0.45, 0.0, 1.0);

        vec3 col = mix(voidInk, royalViolet, violetMask);
        col = mix(col, silverRim, silverMask);
        col = mix(col, coreWhite, coreMask);

        float edgeFade = smoothstep(0.99, 0.87, r) * smoothstep(0.18, 0.30, r);
        float alpha = clamp((inkBand * 1.18 + max(violetMask, silverMask) * 1.12) * edgeFade * uOpacity, 0.0, 0.98);
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

/** Obsidian Sovereign Back-Shader 2: Dark Abyssal Steel & Etched Violet-Silver Rune Greatsword Shader. */
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
        float rim = pow(1.0 - ndv, 1.65);

        float isBlade = smoothstep(0.06, 0.22, vLocalPos.y);
        float isGuard = smoothstep(0.14, 0.04, abs(vLocalPos.y - 0.04)) * smoothstep(0.06, 0.14, abs(vLocalPos.x));
        float edgeBevel = smoothstep(0.04, 0.13, abs(vLocalPos.x));
        float runeVein = smoothstep(0.035, 0.008, abs(vLocalPos.x - 0.03 * sin(vLocalPos.y * 8.5)))
          * smoothstep(0.24, 0.42, vLocalPos.y) * smoothstep(2.25, 1.85, vLocalPos.y);
        float energyFlow = 0.65 + 0.35 * sin(vLocalPos.y * 10.0 - uTime * 7.5);

        vec3 abyssalBlack = vec3(0.05, 0.05, 0.08);
        vec3 darkIron = vec3(0.18, 0.20, 0.26);
        vec3 silverEdge = vec3(0.88, 0.92, 0.98);
        vec3 violetRune = vec3(0.76, 0.44, 1.0);

        vec3 bladeCol = mix(abyssalBlack, silverEdge * (0.72 + 0.45 * ndl), edgeBevel * 0.85 + rim * 0.42);
        bladeCol = mix(bladeCol, violetRune * (1.1 + 0.45 * energyFlow), runeVein * 0.92);
        bladeCol += violetRune * (rim * 0.28);

        vec3 hiltCol = mix(abyssalBlack, darkIron * (0.8 + 0.4 * ndl), 0.55 + rim * 0.35);
        vec3 guardCol = mix(darkIron, silverEdge, 0.45 + 0.45 * ndl) + violetRune * 0.25;

        vec3 col = mix(hiltCol, bladeCol, isBlade);
        col = mix(col, guardCol, isGuard);

        float alpha = clamp(0.97 * uOpacity, 0.0, 1.0);
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
