import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

const TIER_A_NOISE_GLSL = `
  float taHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float taVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = taHash21(i);
    float b = taHash21(i + vec2(1.0, 0.0));
    float c = taHash21(i + vec2(0.0, 1.0));
    float d = taHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float taFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * taVnoise(p);
      p = rot * p * 2.03 + vec2(2.3, 7.1);
      a *= 0.5;
    }
    return v;
  }
  float taVoronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float md = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(taHash21(n + g), taHash21(n + g + vec2(19.7, 37.3)));
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
// 1. COMMON — Novice Astral Compass Crest (4-Point Star Hyperbola & Slate Vanes)
// ============================================================================

/**
 * Common Tier Back-Shader 1: Clean 4-Point Astral Compass Seal with crisp degree ticks
 * and a gentle 2.5s 3-phase stardust shimmer dissolve.
 */
export function createCommonCompassHaloShaderMaterial(accentHex = '#38bdf8'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#cbd5e1') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
      ${TIER_A_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.98 || r < 0.16) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Clean single compass bezel + 16 degree notches
        float rot = ang - uTime * 0.18;
        float outerRing = smoothstep(0.024, 0.005, abs(r - 0.80));
        float innerRing = smoothstep(0.018, 0.004, abs(r - 0.56));
        float compassTicks = smoothstep(0.74, 0.97, cos(rot * 16.0))
          * smoothstep(0.70, 0.74, r) * smoothstep(0.84, 0.80, r);

        // 4-Point Hyperbola Star SDF (sharp cardinal compass needles)
        vec2 ap = abs(p);
        float starArm = smoothstep(0.042, 0.008, min(ap.x * (0.28 + ap.y * 1.9), ap.y * (0.28 + ap.x * 1.9)))
          * smoothstep(0.92, 0.36, r);
        float cardinalPin = smoothstep(0.036, 0.012, length(p - vec2(0.0, 0.80)))
          + smoothstep(0.036, 0.012, length(p - vec2(0.0, -0.80)))
          + smoothstep(0.036, 0.012, length(p - vec2(0.80, 0.0)))
          + smoothstep(0.036, 0.012, length(p - vec2(-0.80, 0.0)));

        // 3-phase subtle stardust shimmer dissolve along outer arc
        float dustNoise = taVnoise(p * 11.0 + vec2(0.0, -uTime * 1.6));
        float dustDissolve = smoothstep(dissolveT - 0.1, dissolveT + 0.1, dustNoise);
        float dustSpark = smoothstep(0.66, 0.90, dustNoise) * smoothstep(0.90, 0.52, r) * charge * dustDissolve * 0.65;

        vec3 slateInk = vec3(0.04, 0.055, 0.09);
        vec3 silverRim = mix(uColor, uCoreColor, 0.22) * (1.2 + strike * 0.35);
        vec3 hotWhite = vec3(0.97, 0.99, 1.0);

        float structMask = clamp(outerRing + innerRing * 0.8 + compassTicks * 0.75 + starArm * 0.85 + cardinalPin + dustSpark, 0.0, 1.0);
        float coreMask = clamp(cardinalPin * 0.75 + outerRing * 0.35 + starArm * 0.45, 0.0, 1.0);

        vec3 col = mix(slateInk, silverRim, structMask);
        col = mix(col, hotWhite, coreMask * 0.78);

        float inkBack = smoothstep(0.92, 0.68, r) * smoothstep(0.18, 0.40, r) * 0.62;
        float edgeFade = smoothstep(0.98, 0.87, r) * smoothstep(0.16, 0.26, r);
        float alpha = clamp((max(inkBack, structMask) * 1.08) * edgeFade * uOpacity, 0.0, 0.92);
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
 * Common Tier Back-Shader 2: Brushed Slate-Silver Metallic Shoulder Vanes with subtle mana seam.
 */
export function createCommonVaneShaderMaterial(accentHex = '#38bdf8'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#cbd5e1') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
        vec3 L = normalize(vec3(0.4, 0.8, 0.5));
        float ndv = abs(dot(N, V));
        float ndl = 0.45 + 0.55 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 2.0);

        float manaSeam = smoothstep(0.022, 0.004, abs(vLocalPos.x)) * smoothstep(0.05, 0.35, vLocalPos.y);
        float pulse = 0.72 + 0.28 * sin(uTime * 3.0 + vLocalPos.y * 5.0);

        vec3 steelDark = vec3(0.10, 0.13, 0.20);
        vec3 silverEdge = mix(uColor, uCoreColor, 0.25) * 1.32;

        vec3 col = mix(steelDark, silverEdge * ndl, clamp(0.45 + rim * 0.85, 0.0, 1.0));
        col = mix(col, vec3(0.96, 0.99, 1.0), clamp(manaSeam * pulse * 0.85 + pow(rim, 2.8) * 0.55, 0.0, 1.0));

        float alpha = clamp(0.96 * uOpacity, 0.0, 0.98);
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
 * Common Tier Multi-Part 3D Geometry: Beveled Diamond-Plate Crest Vane + Rivet Stud.
 */
export function createCommonCompassVaneGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, -0.18);
  shape.lineTo(0.11, 0.02);
  shape.lineTo(0.055, 0.36);
  shape.lineTo(0.0, 0.48);
  shape.lineTo(-0.055, 0.36);
  shape.lineTo(-0.11, 0.02);
  shape.closePath();

  const plate = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  plate.translate(0, 0, -0.014);

  const stud = new THREE.OctahedronGeometry(0.052, 0);
  stud.scale(0.9, 1.25, 0.55);
  stud.translate(0, 0.04, 0.018);

  return mergeSimpleGeos([plate, stud]);
}

// ============================================================================
// 2. UNCOMMON — Verdant Gale Vane (Logarithmic Spiral Breeze & Curved Wind Fins)
// ============================================================================

/**
 * Uncommon Tier Back-Shader 1: Logarithmic Spiral Wind-Streamline Halo with FBM emerald gusts
 * and 3-phase leaf-breeze dissolve.
 */
export function createUncommonGaleHaloShaderMaterial(accentHex = '#86efac'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#22c55e') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
      ${TIER_A_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.15) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Logarithmic swirling wind streamlines (3 spiral arms)
        float logSpiral = sin(ang * 3.0 + log(r + 0.12) * 7.5 - uTime * 3.4);
        float windRibbons = smoothstep(0.45, 0.92, logSpiral) * smoothstep(0.94, 0.38, r) * smoothstep(0.22, 0.45, r);

        // Dynamic breeze arc ring
        float ringWave = 0.78 + 0.03 * sin(ang * 4.0 - uTime * 2.6);
        float outerRing = smoothstep(0.030, 0.006, abs(r - ringWave));

        // Upward scrolling FBM wind wisps + 3-phase dissolve
        float windFbm = taFbm(vec2(p.x * 3.6 + sin(uTime * 1.2) * 0.4, p.y * 4.2 - uTime * 1.9));
        float wispDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, windFbm);
        float activeWisps = smoothstep(0.48, 0.78, windFbm) * smoothstep(0.95, 0.30, r) * charge * wispDissolve;

        vec3 forestInk = vec3(0.015, 0.065, 0.04);
        vec3 emeraldGale = uColor * (1.30 + strike * 0.40);
        vec3 mintCore = mix(vec3(0.75, 0.98, 0.55), uCoreColor, 0.35) * 1.42;

        float mask = clamp(windRibbons * 0.85 + outerRing + activeWisps * 0.75, 0.0, 1.0);
        float hotCenter = clamp(outerRing * 0.5 + windRibbons * activeWisps * 0.8, 0.0, 1.0);

        vec3 col = mix(forestInk, emeraldGale, mask);
        col = mix(col, mintCore, hotCenter * 0.75);
        col = mix(col, vec3(0.96, 1.0, 0.96), pow(hotCenter, 2.0) * 0.7);

        float inkBack = smoothstep(0.94, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.68;
        float edgeFade = smoothstep(0.99, 0.88, r) * smoothstep(0.15, 0.25, r);
        float alpha = clamp((max(inkBack, mask) * 1.12) * edgeFade * uOpacity, 0.0, 0.95);
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
 * Uncommon Tier Back-Shader 2: Translucent Jade Wind-Scythe Fin with diagonal gust streaks.
 */
export function createUncommonWindFinShaderMaterial(accentHex = '#86efac'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#22c55e') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
        float rim = pow(max(0.0001, 1.0 - ndv), 1.6);

        float gustStreak = smoothstep(0.55, 0.94, sin(vLocalPos.y * 11.0 - vLocalPos.x * 7.0 - uTime * 6.5));
        float tipGlow = smoothstep(0.2, 0.72, vLocalPos.y);

        vec3 deepJade = vec3(0.02, 0.12, 0.07);
        vec3 emerald = uColor * 1.4;
        vec3 mint = mix(vec3(0.75, 1.0, 0.68), uCoreColor, 0.3) * 1.5;

        vec3 col = mix(deepJade, emerald, clamp(0.35 + rim * 0.85 + gustStreak * 0.45, 0.0, 1.0));
        col = mix(col, mint, clamp(tipGlow * rim * 0.85 + gustStreak * 0.4, 0.0, 1.0));
        col += vec3(0.95, 1.0, 0.96) * pow(rim, 2.6) * 0.65;

        float alpha = clamp(0.95 * uOpacity, 0.0, 0.98);
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
 * Uncommon Tier Multi-Part 3D Geometry: Swept Crescent Wind-Scythe Fin + Wind Gem.
 */
export function createUncommonWindFinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, -0.14);
  shape.quadraticCurveTo(0.14, 0.06, 0.18, 0.36);
  shape.quadraticCurveTo(0.08, 0.58, -0.06, 0.70);
  shape.quadraticCurveTo(0.02, 0.36, -0.05, 0.12);
  shape.closePath();

  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  blade.translate(0, 0, -0.011);

  const windGem = new THREE.OctahedronGeometry(0.06, 0);
  windGem.scale(0.8, 1.35, 0.5);
  windGem.translate(0.02, -0.02, 0.015);

  return mergeSimpleGeos([blade, windGem]);
}

// ============================================================================
// 3. RARE — Sapphire Arcane Astrolabe (Nested Square-Diamond Rune & Crystal Pylons)
// ============================================================================

/**
 * Rare Tier Back-Shader 1: Counter-Rotating Nested Square & Diamond Arcane Seal
 * with Voronoi frost-crystal glints and 3-phase crystal shatter dissolve.
 */
export function createRareArcaneHaloShaderMaterial(accentHex = '#93c5fd'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#3b82f6') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
      ${TIER_A_NOISE_GLSL}

      float sdBoxFrame(vec2 p, float halfSize) {
        vec2 d = abs(p) - vec2(halfSize);
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.15) discard;

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Counter-rotating Square & Diamond SDF arcane lattice
        float rotA = uTime * 0.35;
        float rotB = -uTime * 0.35 + 0.785398;
        vec2 pA = mat2(cos(rotA), -sin(rotA), sin(rotA), cos(rotA)) * p;
        vec2 pB = mat2(cos(rotB), -sin(rotB), sin(rotB), cos(rotB)) * p;
        float sqA = smoothstep(0.022, 0.004, abs(sdBoxFrame(pA, 0.56)));
        float sqB = smoothstep(0.022, 0.004, abs(sdBoxFrame(pB, 0.56)));

        float outerRing = smoothstep(0.024, 0.005, abs(r - 0.83));
        float innerRing = smoothstep(0.018, 0.004, abs(r - 0.46));

        // Voronoi cellular crystal glints + 3-phase shatter dissolve
        float vor = taVoronoi(p * 6.0 + vec2(uTime * 0.25, -uTime * 0.2));
        float cellDissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, 1.0 - vor);
        float frostGlints = smoothstep(0.28, 0.04, vor) * smoothstep(0.92, 0.32, r) * charge * cellDissolve;

        vec3 sapphireInk = vec3(0.02, 0.045, 0.14);
        vec3 arcaneBlue = uColor * (1.35 + strike * 0.42);
        vec3 iceCyan = mix(vec3(0.55, 0.90, 1.0), uCoreColor, 0.35) * 1.45;

        float geomMask = clamp(sqA + sqB + outerRing + innerRing, 0.0, 1.0);
        float glintMask = clamp(frostGlints + sqA * sqB * 1.2, 0.0, 1.0);

        vec3 col = mix(sapphireInk, arcaneBlue, geomMask);
        col = mix(col, iceCyan, glintMask * 0.85);
        col = mix(col, vec3(1.0), clamp(glintMask * 0.7 + (sqA * sqB) * 0.8, 0.0, 1.0));

        float inkBack = smoothstep(0.95, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.70;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.15, 0.25, r);
        float alpha = clamp((max(inkBack, max(geomMask, glintMask)) * 1.14) * edgeFade * uOpacity, 0.0, 0.96);
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
 * Rare Tier Back-Shader 2: Faceted Sapphire Crystal Pylon Shader with traveling rune ring.
 */
export function createRareCrystalPylonShaderMaterial(accentHex = '#93c5fd'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#3b82f6') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
        vec3 L = normalize(vec3(0.45, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float spec = pow(max(0.0, dot(N, L)), 4.0);
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float scanBand = smoothstep(0.06, 0.01, abs(fract(vLocalPos.y * 1.8 - uTime * 0.9) - 0.5));
        vec3 deepCobalt = vec3(0.03, 0.08, 0.26);
        vec3 sapphire = mix(uColor, uCoreColor, 0.25) * 1.45;

        vec3 col = mix(deepCobalt, sapphire, clamp(0.38 + rim * 0.85 + spec * 0.65, 0.0, 1.0));
        col = mix(col, vec3(0.92, 0.98, 1.0), clamp(scanBand * 0.75 + pow(rim, 2.5) * 0.72 + spec * 0.45, 0.0, 1.0));

        float alpha = clamp(0.96 * uOpacity, 0.0, 0.98);
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
 * Rare Tier Multi-Part 3D Geometry: 6-Sided Sapphire Crystal Pylon with Arcane Collar.
 */
export function createRareCrystalPylonGeometry(): THREE.BufferGeometry {
  const shaft = new THREE.CylinderGeometry(0.072, 0.056, 0.42, 6);
  shaft.translate(0, 0.08, 0);

  const topTip = new THREE.ConeGeometry(0.072, 0.24, 6);
  topTip.translate(0, 0.41, 0);

  const botTip = new THREE.ConeGeometry(0.056, 0.18, 6);
  botTip.rotateX(Math.PI);
  botTip.translate(0, -0.22, 0);

  const collar = new THREE.CylinderGeometry(0.11, 0.11, 0.045, 6);
  collar.translate(0, -0.02, 0);

  return mergeSimpleGeos([shaft, topTip, botTip, collar]);
}

// ============================================================================
// 4. EPIC — Tempest Plasma Mantle (Ridged Lightning Corona & Storm-Chevron Wings)
// ============================================================================

/**
 * Epic Tier Back-Shader 1: Ridged-Noise Electric Plasma Corona & Flickering Step() Lightning Arcs
 * with 3-phase static-spark dissolve.
 */
export function createEpicStormHaloShaderMaterial(accentHex = '#fef08a'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
      ${TIER_A_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.15) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Ridged plasma lightning around storm ring
        float tick = floor(uTime * 15.0);
        float n1 = taVnoise(vec2(ang * 4.5 + tick * 0.37, r * 6.0 - uTime * 3.2));
        float ridged = pow(max(0.0, 1.0 - abs(n1 * 2.0 - 1.0)), 3.2);
        float boltMask = step(0.54, ridged) * smoothstep(0.95, 0.42, r) * smoothstep(0.28, 0.50, r);

        float jitterRing = 0.78 + (ridged - 0.5) * 0.11;
        float plasmaRing = smoothstep(0.036, 0.005, abs(r - jitterRing));
        float innerArc = smoothstep(0.022, 0.004, abs(r - 0.52)) * step(0.4, sin(ang * 6.0 - uTime * 5.0));

        // 3-phase electric static-spark dissolve
        float staticNoise = taVnoise(p * 12.0 + vec2(tick * 0.7, -uTime * 4.0));
        float sparkDissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, staticNoise);
        float activeBolts = boltMask * (0.45 + 0.55 * charge * sparkDissolve);

        vec3 stormVoid = vec3(0.04, 0.015, 0.09);
        vec3 violetPlasma = uColor * (1.42 + strike * 0.48);
        vec3 arcYellow = mix(vec3(0.98, 0.92, 0.42), uCoreColor, 0.4) * 1.55;

        float energy = clamp(plasmaRing + innerArc + activeBolts, 0.0, 1.0);
        vec3 col = mix(stormVoid, violetPlasma, energy);
        col = mix(col, arcYellow, clamp(activeBolts * 0.75 + plasmaRing * 0.45, 0.0, 1.0));
        col = mix(col, vec3(1.0), clamp(activeBolts * 0.6 + plasmaRing * strike * 0.45, 0.0, 1.0));

        float inkBack = smoothstep(0.95, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.74;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.15, 0.25, r);
        float alpha = clamp((max(inkBack, energy) * 1.15) * edgeFade * uOpacity, 0.0, 0.97);
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
 * Epic Tier Back-Shader 2: Dark-Violet Storm Armor & Crackling Lightning-Vein Bolt Wing Shader.
 */
export function createEpicBoltWingShaderMaterial(accentHex = '#fef08a'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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

        float sparkWave = step(0.72, sin(vLocalPos.y * 18.0 - uTime * 14.0 + vLocalPos.x * 9.0));
        float tipHot = smoothstep(0.25, 0.72, vLocalPos.y);

        vec3 obsidianViolet = vec3(0.05, 0.02, 0.12);
        vec3 electricPurple = uColor * 1.5;
        vec3 boltGold = mix(vec3(1.0, 0.94, 0.50), uCoreColor, 0.45) * 1.65;

        vec3 col = mix(obsidianViolet, electricPurple, clamp(0.32 + rim * 0.92, 0.0, 1.0));
        col = mix(col, boltGold, clamp(sparkWave * 0.65 + tipHot * rim * 0.85, 0.0, 1.0));
        col += vec3(1.0) * pow(rim, 2.5) * 0.78;

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
 * Epic Tier Multi-Part 3D Geometry: Angular Zigzag Storm-Chevron Bolt Wing + Spark Node.
 */
export function createEpicBoltWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, -0.10);
  shape.lineTo(0.09, 0.10);
  shape.lineTo(0.02, 0.18);
  shape.lineTo(0.14, 0.44);
  shape.lineTo(0.02, 0.68);
  shape.lineTo(-0.04, 0.38);
  shape.lineTo(0.01, 0.24);
  shape.lineTo(-0.09, 0.06);
  shape.closePath();

  const boltWing = new THREE.ExtrudeGeometry(shape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  boltWing.translate(0, 0, -0.012);

  const node = new THREE.OctahedronGeometry(0.055, 0);
  node.scale(0.9, 1.3, 0.6);
  node.translate(0.01, 0.02, 0.018);

  return mergeSimpleGeos([boltWing, node]);
}

// ============================================================================
// 5. LEGENDARY — Solar Sovereign Aureole (16-Ray Flare Corona & Molten Pinions)
// ============================================================================

/**
 * Legendary Tier Back-Shader 1: 16-Ray Blazing Solar Prominence Halo with turbulent FBM
 * solar convection cells and 3-phase golden ember dissolve.
 */
export function createLegendarySolarHaloShaderMaterial(accentHex = '#fb923c'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f59e0b') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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
      ${TIER_A_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // 16-Ray solar flare spikes + inner solar ring
        float rotA = ang - uTime * 0.26;
        float flare16 = pow(abs(cos(rotA * 8.0)), 12.0);
        float flare8 = pow(abs(cos((ang + uTime * 0.16) * 4.0)), 20.0);
        float coronaReach = 0.72 + flare16 * 0.18 + flare8 * 0.08;
        float coronaRays = smoothstep(0.03, 0.0, r - coronaReach) * smoothstep(0.42, 0.70, r) * max(flare16, flare8);

        float outerRing = smoothstep(0.026, 0.005, abs(r - 0.76));
        float innerRing = smoothstep(0.022, 0.005, abs(r - 0.50));

        // Upward-rising solar convection FBM + 3-phase ember dissolve
        float solarFbm = taFbm(p * 4.4 + vec2(0.0, -uTime * 1.8));
        float emberDissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, solarFbm);
        float activeCorona = coronaRays * (0.58 + 0.42 * charge * emberDissolve);
        float embers = smoothstep(0.64, 0.88, solarFbm) * smoothstep(0.96, 0.40, r) * charge * emberDissolve;

        vec3 sunShadow = vec3(0.055, 0.02, 0.008);
        vec3 solarAmber = uColor * (1.38 + strike * 0.45);
        vec3 moltenOrange = mix(vec3(0.98, 0.46, 0.12), uCoreColor, 0.4) * 1.45;
        vec3 sunCore = vec3(1.0, 0.96, 0.82);

        float fireMask = clamp(outerRing + innerRing + activeCorona + embers * 0.75, 0.0, 1.0);
        vec3 col = mix(sunShadow, moltenOrange, smoothstep(0.32, 0.72, solarFbm) * smoothstep(0.92, 0.30, r) * 0.7);
        col = mix(col, solarAmber, fireMask);
        col = mix(col, sunCore, clamp(activeCorona * 0.65 + outerRing * 0.55 + embers * 0.5, 0.0, 1.0));

        float inkBack = smoothstep(0.96, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.76;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(inkBack, fireMask) * 1.16) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Legendary Tier Back-Shader 2: Molten Imperial Gold & Solar Flame Ripple Wing-Pinion Shader.
 */
export function createLegendaryPinionShaderMaterial(accentHex = '#fb923c'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f59e0b') },
      uCoreColor: { value: new THREE.Color(accentHex) },
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

        float flameFlow = 0.55 + 0.45 * sin(vLocalPos.y * 10.0 - uTime * 7.5 + vLocalPos.x * 4.0);
        float spineCore = smoothstep(0.036, 0.006, abs(vLocalPos.x)) * smoothstep(0.0, 0.72, vLocalPos.y);

        vec3 bronzeObsidian = vec3(0.08, 0.03, 0.01);
        vec3 solarGold = uColor * 1.48;
        vec3 flameHue = mix(vec3(1.0, 0.52, 0.15), uCoreColor, 0.35) * 1.5;

        vec3 col = mix(bronzeObsidian, flameHue, clamp(0.35 + rim * 0.8, 0.0, 1.0));
        col = mix(col, solarGold, clamp(flameFlow * 0.65 + rim * 0.55, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.97, 0.86), clamp(spineCore * 0.9 + pow(rim, 2.4) * 0.75, 0.0, 1.0));

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
 * Legendary Tier Multi-Part 3D Geometry: Swept Scimitar Solar Wing-Pinion + Guard Gem.
 */
export function createLegendarySolarPinionGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.028, -0.14);
  shape.lineTo(0.08, -0.02);
  shape.quadraticCurveTo(0.14, 0.28, 0.04, 0.68);
  shape.lineTo(-0.04, 0.84);
  shape.quadraticCurveTo(-0.02, 0.42, -0.065, 0.06);
  shape.closePath();

  const pinion = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.009,
    bevelSegments: 1,
  });
  pinion.translate(0, 0, -0.013);

  const solarGem = new THREE.OctahedronGeometry(0.065, 0);
  solarGem.scale(0.85, 1.35, 0.55);
  solarGem.translate(0.01, -0.02, 0.02);

  return mergeSimpleGeos([pinion, solarGem]);
}
