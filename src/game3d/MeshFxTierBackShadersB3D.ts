import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

const TIER_B_NOISE_GLSL = `
  float tbHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float tbVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = tbHash21(i);
    float b = tbHash21(i + vec2(1.0, 0.0));
    float c = tbHash21(i + vec2(0.0, 1.0));
    float d = tbHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float tbFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * tbVnoise(p);
      p = rot * p * 2.05 + vec2(3.1, 8.4);
      a *= 0.5;
    }
    return v;
  }
  float tbVoronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float md = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(tbHash21(n + g), tbHash21(n + g + vec2(17.3, 31.7)));
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
// 6. RAINBOW — Chromatic Kaleidoscope Prism (Harmonic Rose & Spectral Feathers)
// ============================================================================

/**
 * Rainbow Tier Back-Shader 1: Polar Harmonic 5-Petal Kaleidoscope & Thin-Film Spectral Ring
 * with RGB chromatic dispersion sparkles and 3-phase prism-shimmer dissolve.
 */
export function createRainbowKaleidoHaloShaderMaterial(accentHex = '#22d3ee'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f472b6') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Polar harmonic rose-curve kaleidoscope (5-lobe forward + 5-lobe counter-rotating)
        float roseA = 0.56 + 0.18 * abs(cos(ang * 2.5 - uTime * 0.65));
        float roseB = 0.56 + 0.18 * abs(sin(ang * 2.5 + uTime * 0.55));
        float petalA = smoothstep(0.028, 0.005, abs(r - roseA));
        float petalB = smoothstep(0.024, 0.005, abs(r - roseB));

        // Chromatic RGB-split outer ring
        float rRed = length(p + vec2(0.018 * cos(uTime * 2.0), 0.018 * sin(uTime * 2.0)));
        float rBlu = length(p - vec2(0.018 * cos(uTime * 2.0), 0.018 * sin(uTime * 2.0)));
        float ringR = smoothstep(0.024, 0.004, abs(rRed - 0.82));
        float ringG = smoothstep(0.024, 0.004, abs(r - 0.82));
        float ringB = smoothstep(0.024, 0.004, abs(rBlu - 0.82));

        // 3-phase prism-glint dissolve
        float glintNoise = tbVnoise(vec2(ang * 4.0 + uTime, r * 9.0 - uTime * 1.4));
        float glintDissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, glintNoise);
        float prismGlints = smoothstep(0.68, 0.92, glintNoise) * smoothstep(0.95, 0.35, r) * charge * glintDissolve;

        // Full thin-film spectral dispersion
        float huePhase = ang * 2.0 + r * 4.5 - uTime * 2.6;
        vec3 spectrum = 0.55 + 0.45 * cos(huePhase + vec3(0.0, 2.094, 4.188));
        vec3 rgbRing = vec3(ringR, ringG, ringB) * 1.55;
        vec3 deepIndigo = vec3(0.03, 0.025, 0.09);

        float kaleidoMask = clamp(petalA + petalB * 0.85 + prismGlints * 0.85, 0.0, 1.0);
        float ringEnergy = max(ringR, max(ringG, ringB));

        vec3 col = mix(deepIndigo, spectrum * (1.38 + strike * 0.45), kaleidoMask);
        col += rgbRing;
        col = mix(col, vec3(1.0), clamp((petalA * petalB) * 0.9 + prismGlints * 0.65 + ringR * ringG * ringB * 0.9, 0.0, 1.0));

        float inkBack = smoothstep(0.95, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.72;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(inkBack, max(kaleidoMask, ringEnergy)) * 1.15) * edgeFade * uOpacity, 0.0, 0.97);
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
 * Rainbow Tier Back-Shader 2: Stained-Glass Angle-Dependent Iridescent Crystal Feather Shader.
 */
export function createRainbowPrismFeatherShaderMaterial(accentHex = '#22d3ee'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f472b6') },
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
        float rim = pow(max(0.0001, 1.0 - ndv), 1.45);

        float specPhase = (1.0 - ndv) * 6.0 + vLocalPos.y * 5.0 + vLocalPos.x * 3.5 - uTime * 3.2;
        vec3 rainbow = 0.56 + 0.44 * cos(specPhase + vec3(0.0, 2.094, 4.188));
        vec3 tintMix = mix(rainbow, mix(uColor, uCoreColor, 0.5), 0.22);

        float diamondFacet = pow(max(0.0, dot(N, normalize(vec3(0.4, 0.85, 0.5)))), 4.0);
        vec3 darkGlass = vec3(0.04, 0.04, 0.12);
        vec3 col = mix(darkGlass, tintMix * 1.52, clamp(0.42 + rim * 0.90 + diamondFacet * 0.45, 0.0, 1.0));
        col = mix(col, vec3(1.0), clamp(pow(rim, 2.5) * 0.82 + diamondFacet * 0.4, 0.0, 1.0));

        float alpha = clamp(0.96 * uOpacity, 0.0, 0.99);
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
 * Rainbow Tier Multi-Part 3D Geometry: Stained-Glass Butterfly-Prism Wing Feather + Facet Cluster.
 */
export function createRainbowPrismFeatherGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, -0.14);
  shape.lineTo(0.11, 0.10);
  shape.lineTo(0.07, 0.48);
  shape.lineTo(0.0, 0.72);
  shape.lineTo(-0.07, 0.48);
  shape.lineTo(-0.11, 0.10);
  shape.closePath();

  const mainPrism = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  mainPrism.translate(0, 0, -0.011);

  const sideCrystal = new THREE.OctahedronGeometry(0.075, 0);
  sideCrystal.scale(0.62, 1.65, 0.42);
  sideCrystal.rotateZ(-0.34);
  sideCrystal.translate(0.11, 0.22, 0.01);

  return mergeSimpleGeos([mainPrism, sideCrystal]);
}

// ============================================================================
// 7. MYTHIC — Celestial Seraphic Lotus Mandala (8-Fold Lotus & Crescent Arch)
// ============================================================================

/**
 * Mythic Tier Back-Shader 1: Sacred 8-Fold Seraphic Lotus-Petal Mandala & Pearl Filigree
 * with rose-gold energy mist and 3-phase petal-light dissolve.
 */
export function createMythicLotusHaloShaderMaterial(accentHex = '#ffffff'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#ec4899') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // 8-Fold sacred lotus-petal SDF contour
        float rotL = ang - uTime * 0.20;
        float lotusCurve = 0.58 + 0.15 * abs(cos(rotL * 4.0));
        float lotusPetal = smoothstep(0.030, 0.005, abs(r - lotusCurve));
        float lotusInner = smoothstep(0.022, 0.004, abs(r - (0.42 + 0.10 * abs(sin(rotL * 4.0)))));

        // Dual sacred sanctuary filigree rings
        float outerFiligree = smoothstep(0.024, 0.005, abs(r - 0.84));
        float pearlBeads = smoothstep(0.65, 0.96, cos((ang + uTime * 0.28) * 16.0))
          * smoothstep(0.028, 0.004, abs(r - 0.84));

        // Rose-light mist FBM + 3-phase petal-dust dissolve
        float mistFbm = tbFbm(p * 3.8 + vec2(sin(uTime * 0.8) * 0.3, -uTime * 1.1));
        float mistDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, mistFbm);
        float mistGlow = smoothstep(0.45, 0.78, mistFbm) * smoothstep(0.94, 0.32, r) * charge * mistDissolve;

        vec3 velvetNight = vec3(0.055, 0.015, 0.045);
        vec3 mythicRose = uColor * (1.38 + strike * 0.42);
        vec3 pearlLight = mix(vec3(1.0, 0.92, 0.96), uCoreColor, 0.4);

        float structMask = clamp(lotusPetal + lotusInner * 0.85 + outerFiligree + mistGlow * 0.55, 0.0, 1.0);
        float hotPearl = clamp(pearlBeads + lotusPetal * 0.55 + outerFiligree * 0.45 + mistGlow * 0.45, 0.0, 1.0);

        vec3 col = mix(velvetNight, mythicRose, structMask);
        col = mix(col, pearlLight * 1.35, hotPearl * 0.85);
        col = mix(col, vec3(1.0), clamp(pearlBeads * 0.9 + (lotusPetal * lotusInner) * 0.9, 0.0, 1.0));

        float inkBack = smoothstep(0.95, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.74;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(inkBack, structMask) * 1.15) * edgeFade * uOpacity, 0.0, 0.97);
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
 * Mythic Tier Back-Shader 2: Pearl-Ivory & Rose-Gold Sacred Porcelain Silk-Metal Shader.
 */
export function createMythicSeraphShaderMaterial(accentHex = '#ffffff'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#ec4899') },
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
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float silkShimmer = 0.55 + 0.45 * sin(vLocalPos.y * 8.0 - uTime * 4.2 + vLocalPos.x * 5.0);
        vec3 roseObsidian = vec3(0.09, 0.03, 0.08);
        vec3 roseMagenta = uColor * 1.45;
        vec3 pearlIvory = mix(vec3(1.0, 0.94, 0.98), uCoreColor, 0.35) * 1.38;

        vec3 col = mix(roseObsidian, roseMagenta, clamp(0.4 + rim * 0.75, 0.0, 1.0));
        col = mix(col, pearlIvory, clamp(silkShimmer * 0.45 + pow(rim, 2.0) * 0.8, 0.0, 1.0));
        col += vec3(1.0) * pow(rim, 2.8) * 0.65;

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
 * Mythic Tier Multi-Part 3D Geometry A: Overhead Crescent Halo Arch with Sacred Spire Finials.
 */
export function createMythicCrescentCrownGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const arch = new THREE.TorusGeometry(0.46, 0.024, 6, 22, Math.PI * 0.86);
  arch.rotateZ(Math.PI * 0.07);
  parts.push(arch);

  const spireAngles = [-0.62, 0.0, 0.62];
  for (let i = 0; i < spireAngles.length; i++) {
    const a = spireAngles[i];
    const len = i === 1 ? 0.26 : 0.18;
    const spire = new THREE.ConeGeometry(0.032, len, 4);
    spire.translate(0, 0.46 + len * 0.45, 0);
    spire.rotateZ(a);
    parts.push(spire);
  }
  return mergeSimpleGeos(parts);
}

/**
 * Mythic Tier Multi-Part 3D Geometry B: Curved Celestial Angel-Quill Wing Blade.
 */
export function createMythicQuillWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, -0.10);
  shape.quadraticCurveTo(0.11, 0.14, 0.08, 0.50);
  shape.lineTo(0.0, 0.78);
  shape.quadraticCurveTo(-0.05, 0.42, -0.06, 0.08);
  shape.closePath();

  const quill = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  quill.translate(0, 0, -0.011);

  const pearlBead = new THREE.OctahedronGeometry(0.052, 0);
  pearlBead.scale(0.85, 1.3, 0.55);
  pearlBead.translate(0.01, -0.04, 0.015);

  return mergeSimpleGeos([quill, pearlBead]);
}

// ============================================================================
// 8. EXOTIC — Bioluminescent Leviathan Rift (Caustic Web & Hydro-Orbs)
// ============================================================================

/**
 * Exotic Tier Back-Shader 1: Dual-Octave Voronoi Water-Caustic Web & Undulating Leviathan Ring
 * with bioluminescent teal-gold pulses and 3-phase bubble-foam dissolve.
 */
export function createExoticBiolumeHaloShaderMaterial(accentHex = '#fef08a'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#14b8a6') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.14) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Dual-layer Voronoi water-caustic interference web
        float vor1 = tbVoronoi(p * 4.6 + vec2(uTime * 0.35, -uTime * 0.28));
        float vor2 = tbVoronoi(p * 7.2 + vec2(-uTime * 0.42, uTime * 0.30));
        float causticWeb = smoothstep(0.16, 0.015, abs(vor1 - vor2)) * smoothstep(0.92, 0.28, r);

        // Undulating sinusoidal leviathan fin-wave ring
        float waveR = 0.74 + 0.07 * sin(ang * 6.0 + uTime * 2.4);
        float waveRing = smoothstep(0.032, 0.006, abs(r - waveR));
        float innerTide = smoothstep(0.022, 0.004, abs(r - (0.48 - 0.04 * cos(ang * 6.0 - uTime * 1.9))));

        // 3-phase bioluminescent foam dissolve
        float foamDissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, 1.0 - vor1);
        float activeCaustics = causticWeb * (0.50 + 0.50 * charge * foamDissolve);

        vec3 abyssNavy = vec3(0.012, 0.045, 0.065);
        vec3 biolumeTeal = uColor * (1.42 + strike * 0.45);
        vec3 biolumeGold = mix(vec3(0.88, 0.98, 0.45), uCoreColor, 0.45) * 1.48;

        float bioMask = clamp(waveRing + innerTide + activeCaustics * 0.85, 0.0, 1.0);
        vec3 col = mix(abyssNavy, biolumeTeal, bioMask);
        col = mix(col, biolumeGold, clamp(activeCaustics * 0.65 + waveRing * 0.35, 0.0, 1.0));
        col = mix(col, vec3(0.95, 1.0, 1.0), clamp(activeCaustics * waveRing * 1.1 + pow(bioMask, 2.5) * 0.5, 0.0, 1.0));

        float inkBack = smoothstep(0.95, 0.68, r) * smoothstep(0.18, 0.42, r) * 0.76;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.14, 0.24, r);
        float alpha = clamp((max(inkBack, bioMask) * 1.16) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Exotic Tier Back-Shader 2: Deep Abyssal Chitin & Glowing Bioluminescent Vein Leviathan Fin Shader.
 */
export function createExoticLeviathanFinShaderMaterial(accentHex = '#fef08a'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#14b8a6') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float v = tbVoronoi(vLocalPos.xy * 5.2 - vec2(0.0, uTime * 1.3));
        float vein = smoothstep(0.24, 0.05, v);
        float ribWave = 0.5 + 0.5 * sin(vLocalPos.y * 14.0 - uTime * 5.0);

        vec3 abyssChitin = vec3(0.015, 0.05, 0.08);
        vec3 tealGlow = uColor * 1.48;
        vec3 goldPulse = mix(vec3(0.92, 0.99, 0.50), uCoreColor, 0.45) * 1.55;

        vec3 col = mix(abyssChitin, tealGlow, clamp(0.30 + rim * 0.85 + vein * 0.65, 0.0, 1.0));
        col = mix(col, goldPulse, clamp(vein * ribWave * 0.75 + pow(rim, 2.4) * 0.55, 0.0, 1.0));
        col += vec3(0.92, 1.0, 1.0) * pow(rim, 2.8) * 0.55;

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
 * Exotic Tier Multi-Part 3D Geometry A: Webbed Leviathan Dragon-Fin Spine Crest.
 */
export function createExoticLeviathanFinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.03, -0.10);
  shape.lineTo(0.14, 0.08);
  shape.quadraticCurveTo(0.16, 0.34, 0.04, 0.58);
  shape.lineTo(-0.02, 0.78);
  shape.lineTo(-0.07, 0.46);
  shape.lineTo(-0.04, 0.16);
  shape.closePath();

  const web = new THREE.ExtrudeGeometry(shape, {
    depth: 0.020,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 1,
  });
  web.translate(0, 0, -0.010);

  const spine = new THREE.ConeGeometry(0.038, 0.86, 5);
  spine.rotateZ(-0.04);
  spine.translate(0.01, 0.34, 0.0);

  return mergeSimpleGeos([web, spine]);
}

/**
 * Exotic Tier Multi-Part 3D Geometry B: Floating Bioluminescent Hydro-Orb Relic.
 */
export function createExoticHydroOrbGeometry(): THREE.BufferGeometry {
  const core = new THREE.OctahedronGeometry(0.095, 1);
  const ring = new THREE.TorusGeometry(0.14, 0.018, 5, 16);
  ring.rotateX(0.35);
  return mergeSimpleGeos([core, ring]);
}

// ============================================================================
// 9. SECRET — Forbidden Singularity (Gravitational Event Horizon & Monoliths)
// ============================================================================

/**
 * Secret Tier Back-Shader 1: Gravitational Lensing Accretion Vortex & Pitch-Black Event Horizon
 * with razor crimson-violet photon ring and 3-phase dimensional void-ash dissolve.
 */
export function createSecretSingularityHaloShaderMaterial(accentHex = '#c084fc'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f43f5e') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.12) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Gravitational lensing radial warp + spiral accretion disk
        float rWarp = r - 0.075 / (r + 0.22);
        float spiral = tbFbm(vec2(ang * 2.5 + 3.2 / (r + 0.25) - uTime * 2.4, rWarp * 4.5));

        // Pitch-black singularity void core + blazing crimson photon ring
        float eventHorizon = smoothstep(0.42, 0.36, r);
        float photonRing = smoothstep(0.036, 0.004, abs(r - 0.43));
        float outerShear = smoothstep(0.024, 0.004, abs(r - (0.82 + (spiral - 0.5) * 0.08)));

        // Dimensional crack lines radiating from photon ring + 3-phase void dissolve
        float tearNoise = abs(tbVnoise(vec2(ang * 8.0, r * 3.0 - uTime * 1.5)) - 0.5);
        float tears = smoothstep(0.055, 0.008, tearNoise) * smoothstep(0.94, 0.44, r) * smoothstep(0.38, 0.52, r);
        float ashDissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, spiral);
        float activeAccretion = (smoothstep(0.45, 0.78, spiral) * smoothstep(0.92, 0.42, r) + tears) * charge * ashDissolve;

        vec3 blackHole = vec3(0.01, 0.005, 0.02);
        vec3 crimsonFlare = uColor * (1.50 + strike * 0.52);
        vec3 voidViolet = mix(vec3(0.68, 0.28, 0.98), uCoreColor, 0.45) * 1.42;

        float energy = clamp(photonRing + outerShear + activeAccretion * 0.85, 0.0, 1.0);
        vec3 col = mix(blackHole, voidViolet, clamp(activeAccretion * 0.75 + outerShear * 0.5, 0.0, 1.0));
        col = mix(col, crimsonFlare, clamp(photonRing + tears * 0.8 + outerShear * 0.7, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.94, 0.96), clamp(photonRing * 0.82 + tears * 0.55, 0.0, 1.0));
        col = mix(col, blackHole, eventHorizon * 0.94);

        float inkBack = smoothstep(0.96, 0.68, r) * smoothstep(0.14, 0.38, r) * 0.84;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.12, 0.22, r);
        float alpha = clamp((max(inkBack, energy) * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Secret Tier Back-Shader 2: Pitch-Black Obsidian Monolith Needle with Crimson-Violet Fissures.
 */
export function createSecretMonolithNeedleShaderMaterial(accentHex = '#c084fc'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f43f5e') },
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
      ${TIER_B_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.65);

        float crackN = tbFbm(vLocalPos.xy * 5.0 + vec2(0.0, -uTime * 1.1));
        float fissure = smoothstep(0.14, 0.02, abs(crackN - 0.5));
        float corePulse = 0.72 + 0.28 * sin(uTime * 5.5 + vLocalPos.y * 6.0);

        vec3 voidObsidian = vec3(0.02, 0.01, 0.035);
        vec3 crimson = uColor * 1.55;
        vec3 violet = mix(vec3(0.72, 0.34, 0.98), uCoreColor, 0.45) * 1.45;

        vec3 col = mix(voidObsidian, violet, clamp(rim * 0.72, 0.0, 1.0));
        col = mix(col, crimson, clamp(fissure * corePulse + pow(rim, 2.0) * 0.65, 0.0, 1.0));
        col += vec3(1.0, 0.90, 0.94) * clamp(fissure * 0.7 + pow(rim, 3.0) * 0.75, 0.0, 1.0);

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
 * Secret Tier Multi-Part 3D Geometry: Obsidian Seal-Obelisk Needle + Cross Collar + Shard Tip.
 */
export function createSecretMonolithNeedleGeometry(): THREE.BufferGeometry {
  const obelisk = new THREE.ConeGeometry(0.082, 0.74, 4);
  obelisk.scale(0.85, 1.0, 0.52);
  obelisk.translate(0, 0.30, 0);

  const collar = new THREE.BoxGeometry(0.19, 0.055, 0.065);
  collar.translate(0, 0.02, 0);

  const baseDrop = new THREE.ConeGeometry(0.062, 0.22, 4);
  baseDrop.scale(0.85, 1.0, 0.52);
  baseDrop.rotateX(Math.PI);
  baseDrop.translate(0, -0.14, 0);

  return mergeSimpleGeos([obelisk, collar, baseDrop]);
}

// ============================================================================
// 10. LIMITED — Imperial Astral Ocular Crown (Vesica Eye Mandala & Relic Fan)
// ============================================================================

/**
 * Limited Tier Back-Shader 1: Imperial Sovereign Astronomical & Ocular Mandala Halo
 * uniting Limited roster motifs (Astral Gaze, Crimson Iris, Celestial Meridian Rings, Cosmic FBM)
 * with 3-phase sovereign stardust dissolve.
 */
export function createLimitedOcularHaloShaderMaterial(accentHex = '#e11d48'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
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
      ${TIER_B_NOISE_GLSL}

      float sdVesicaEye(vec2 p, float w, float h) {
        p = abs(p);
        float b = sqrt(max(0.0001, w * w - h * h));
        return ((p.y - b) * h > p.x * b)
          ? length(p - vec2(0.0, b))
          : length(p - vec2(-h, 0.0)) - w;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.12) discard;
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((cycle - 0.5) / 0.5, 0.0, 1.0);

        // Imperial astronomical sovereign rings + rotating zodiac notches
        float outerRing = smoothstep(0.022, 0.004, abs(r - 0.86));
        float innerRing = smoothstep(0.018, 0.004, abs(r - 0.68));
        float meridianA = smoothstep(0.014, 0.002, abs(length(vec2(p.x * 1.45, p.y)) - 0.77));
        float meridianB = smoothstep(0.014, 0.002, abs(length(vec2(p.x, p.y * 1.45)) - 0.77));
        float crownNotches = smoothstep(0.72, 0.98, cos((ang - uTime * 0.25) * 24.0))
          * smoothstep(0.74, 0.78, r) * smoothstep(0.86, 0.82, r);

        // Vesica-Piscis Ocular Iris Signature + Radial Striations (Limited tier motif)
        float eyeDist = sdVesicaEye(vec2(p.x, p.y * 1.25), 0.58, 0.28);
        float eyeOutline = smoothstep(0.024, 0.004, abs(eyeDist));
        float irisRing = smoothstep(0.022, 0.004, abs(r - 0.32)) * smoothstep(0.03, -0.02, eyeDist);
        float irisFibers = smoothstep(0.55, 0.96, abs(cos(ang * 18.0 + uTime * 1.2)))
          * smoothstep(0.34, 0.22, r) * smoothstep(0.14, 0.22, r) * smoothstep(0.02, -0.04, eyeDist);

        // Cosmic nebula FBM + 3-phase stardust dissolve
        float cosmicFbm = tbFbm(vec2(ang * 2.0 - uTime * 0.5, r * 4.0 - uTime * 0.7));
        float starDissolve = smoothstep(dissolveT - 0.12, dissolveT + 0.12, cosmicFbm);
        float nebulaDust = smoothstep(0.46, 0.80, cosmicFbm) * smoothstep(0.95, 0.36, r) * charge * starDissolve;

        vec3 imperialInk = vec3(0.035, 0.015, 0.045);
        vec3 sovereignGold = uColor * (1.45 + strike * 0.45);
        vec3 crimsonGaze = mix(vec3(0.96, 0.14, 0.34), uCoreColor, 0.45) * 1.52;
        vec3 astralWhite = vec3(1.0, 0.97, 0.90);

        float goldStruct = clamp(outerRing + innerRing + (meridianA + meridianB) * 0.65 + crownNotches * 0.85, 0.0, 1.0);
        float gazeMask = clamp(eyeOutline + irisRing + irisFibers * 0.85, 0.0, 1.0);

        vec3 col = mix(imperialInk, crimsonGaze, clamp(nebulaDust * 0.65 + gazeMask, 0.0, 1.0));
        col = mix(col, sovereignGold, goldStruct);
        col = mix(col, astralWhite, clamp(eyeOutline * 0.7 + outerRing * 0.45 + irisRing * 0.65, 0.0, 1.0));

        float inkBack = smoothstep(0.96, 0.66, r) * smoothstep(0.14, 0.40, r) * 0.82;
        float edgeFade = smoothstep(0.99, 0.89, r) * smoothstep(0.12, 0.22, r);
        float alpha = clamp((max(inkBack, max(goldStruct, gazeMask)) * 1.18) * edgeFade * uOpacity, 0.0, 0.98);
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
 * Limited Tier Back-Shader 2: Imperial Obsidian-Crimson Lacquer & Molten Sovereign Gold Trim Shader
 * with blazing celestial fuller energy line.
 */
export function createLimitedSovereignShaderMaterial(accentHex = '#e11d48'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
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
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float fullerLine = smoothstep(0.030, 0.005, abs(vLocalPos.x)) * smoothstep(0.04, 0.85, vLocalPos.y);
        float energyWave = 0.65 + 0.35 * sin(vLocalPos.y * 11.0 - uTime * 7.2);

        vec3 imperialLacquer = vec3(0.045, 0.015, 0.04);
        vec3 crimson = mix(vec3(0.95, 0.15, 0.35), uCoreColor, 0.4) * 1.48;
        vec3 gold = uColor * 1.52;

        vec3 col = mix(imperialLacquer, crimson, clamp(0.28 + rim * 0.72, 0.0, 1.0));
        col = mix(col, gold, clamp(pow(rim, 1.6) * 0.92 + fullerLine * 0.35, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.97, 0.90), clamp(fullerLine * energyWave * 0.9 + pow(rim, 2.7) * 0.78, 0.0, 1.0));

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
 * Limited Tier Multi-Part 3D Geometry A: Overhead Imperial Sovereign Horned Diadem Crown Arch.
 */
export function createLimitedImperialCrownGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const band = new THREE.TorusGeometry(0.44, 0.026, 6, 22, Math.PI * 0.90);
  band.rotateZ(Math.PI * 0.05);
  parts.push(band);

  const hornSpecs: ReadonlyArray<{ ang: number; len: number; rad: number }> = [
    { ang: 0.0, len: 0.32, rad: 0.044 },
    { ang: 0.42, len: 0.24, rad: 0.032 },
    { ang: -0.42, len: 0.24, rad: 0.032 },
    { ang: 0.82, len: 0.18, rad: 0.026 },
    { ang: -0.82, len: 0.18, rad: 0.026 },
  ];
  for (const h of hornSpecs) {
    const spike = new THREE.ConeGeometry(h.rad, h.len, 4);
    spike.translate(0, 0.44 + h.len * 0.44, 0);
    spike.rotateZ(h.ang);
    parts.push(spike);
  }

  const centerGem = new THREE.OctahedronGeometry(0.068, 0);
  centerGem.scale(0.85, 1.4, 0.55);
  centerGem.translate(0, 0.46, 0.02);
  parts.push(centerGem);

  return mergeSimpleGeos(parts);
}

/**
 * Limited Tier Multi-Part 3D Geometry B: Ornate Sovereign Halberd-Feather Relic Blade.
 */
export function createLimitedRelicBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.020, -0.20);
  shape.lineTo(0.020, -0.20);
  shape.lineTo(0.032, -0.02);
  shape.lineTo(0.14, 0.06);
  shape.lineTo(0.075, 0.14);
  shape.lineTo(0.058, 0.66);
  shape.lineTo(0.0, 0.94);
  shape.lineTo(-0.058, 0.66);
  shape.lineTo(-0.075, 0.14);
  shape.lineTo(-0.14, 0.06);
  shape.lineTo(-0.032, -0.02);
  shape.closePath();

  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  blade.translate(0, 0, -0.013);

  const eyeGem = new THREE.OctahedronGeometry(0.054, 0);
  eyeGem.scale(0.85, 1.35, 0.55);
  eyeGem.translate(0, 0.06, 0.018);

  return mergeSimpleGeos([blade, eyeGem]);
}
