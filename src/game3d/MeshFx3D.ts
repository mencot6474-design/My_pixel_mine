import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';
export * from './MeshFxTwinShadersA3D';
export * from './MeshFxTwinShadersB3D';
export * from './MeshFxOmegaShaders3D';
export * from './MeshFxFusionShaders3D';
export * from './MeshFxTierBackShadersA3D';
export * from './MeshFxTierBackShadersB3D';

const HASH_NOISE_GLSL = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`;

/**
 * Full-screen post-processing shader pass for Monochrome/Negative Sakuga Impact Frames
 * and razor-thin anime speedlines. Runs in Medium/High graphics presets.
 */
export const ImpactFrameShader = {
  uniforms: {
    tDiffuse: { value: null },
    uImpactStrength: { value: 0.0 },
    uImpactInvert: { value: 0.0 },
    uSpeedLines: { value: 0.0 },
    uTime: { value: 0.0 },
    uTint: { value: new THREE.Color('#ef4444') },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uImpactStrength;
    uniform float uImpactInvert;
    uniform float uSpeedLines;
    uniform float uTime;
    uniform vec3 uTint;
    varying vec2 vUv;
    ${HASH_NOISE_GLSL}

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      float ang = atan(centered.y, centered.x);

      float chroma = uImpactStrength * 0.009;
      vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);
      float r = texture2D(tDiffuse, vUv + dir * chroma).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir * chroma).b;
      vec3 col = vec3(r, g, b);

      float streakSeed = floor((ang + 3.14159) * 78.0 + floor(uTime * 28.0) * 1.3);
      float streakRand = hash21(vec2(streakSeed, floor(uTime * 22.0)));
      float outerMask = smoothstep(0.36, 0.78, dist);
      float spike = smoothstep(0.88, 0.995, streakRand) * outerMask;

      if (uImpactStrength > 0.01) {
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        float ink = smoothstep(0.18, 0.38, lum);
        vec3 bw = mix(vec3(0.02, 0.02, 0.04), vec3(1.0, 0.98, 0.96), ink);
        bw = mix(bw, mix(vec3(1.0), uTint * 1.25, 0.35), spike * 0.9);
        vec3 neg = mix(bw, vec3(1.0) - bw, uImpactInvert);
        col = mix(col, neg, clamp(uImpactStrength, 0.0, 1.0));
      } else if (uSpeedLines > 0.01) {
        col = mix(col, mix(vec3(1.0), uTint, 0.45), spike * uSpeedLines * 0.45);
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createSlashArcGeometry(
  innerR = 0.34,
  outerR = 1.0,
  sweepRad = Math.PI * 1.48,
  segments = 48
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 3;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const tipTaper = Math.sin(u * Math.PI);
    const widthScale = Math.pow(tipTaper, 0.38);
    const curInner = outerR - (outerR - innerR) * widthScale;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const idx = i * rows + j;
      const camberY = j === 1 ? 0.055 * widthScale : 0.0;

      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = camberY;
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
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createSlashShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
      uSeed: { value: 1.0 },
      uDarkCore: { value: 0.0 },
      uMode: { value: 0.0 },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uSeed;
      uniform float uDarkCore;
      uniform float uMode;
      varying vec2 vUv;
      ${HASH_NOISE_GLSL}

      void main() {
        float head = clamp(uProgress * 2.55, 0.0, 1.32);
        float tail = max(0.0, (uProgress - 0.14) * 1.36);

        float n1 = vnoise(vec2(vUv.x * 18.0 + uSeed * 7.1, vUv.y * 5.5));
        float n2 = vnoise(vec2(vUv.x * 42.0 - uProgress * 8.0, vUv.y * 14.0 + uSeed));
        float streakNoise = n1 * 0.6 + n2 * 0.4;

        float headMask = smoothstep(head, head - 0.12, vUv.x);
        float tailMask = smoothstep(tail - 0.12 + streakNoise * 0.22, tail + 0.08 + streakNoise * 0.22, vUv.x);

        float outerShape = smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float innerNoiseCut = smoothstep(0.04, 0.68, vUv.y + streakNoise * 0.28 - uProgress * 0.16);

        float alpha = headMask * tailMask * outerShape * innerNoiseCut * uOpacity;
        if (alpha < 0.015) discard;

        float coreBand = smoothstep(0.50, 0.88, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float midWhip = smoothstep(0.10, 0.0, abs(vUv.y - 0.46 + (n2 - 0.5) * 0.12)) * 0.85;
        float tipSpark = smoothstep(head - 0.18, head - 0.02, vUv.x) * headMask;
        float coreMix = clamp(coreBand * 0.95 + midWhip * 0.65 + tipSpark * 0.8, 0.0, 1.0);

        float darkBack = smoothstep(0.58, 0.18, vUv.y);
        vec3 col = mix(uColor * 1.18, uCoreColor * 1.65, coreMix);
        col = mix(col, uColor * 0.28, darkBack * 0.68);
        if (uMode > 5.5 && uMode < 6.5) {
          // Mode 6: Clockwork Chrono-Wave Sakuga (thick black cel-ink borders, rotating cog teeth & kinetic speed smears)
          float smear = vnoise(vec2(vUv.x * 16.0 - uProgress * 12.0, vUv.y * 20.0 + uSeed));
          float cogWave = cos(vUv.x * 46.0 - uProgress * 18.0);
          float cogTeeth = smoothstep(0.28, 0.72, cogWave) * smoothstep(0.54, 0.22, vUv.y);
          float dialRibs = smoothstep(0.75, 0.96, cos(vUv.x * 72.0 - uProgress * 22.0)) * smoothstep(0.14, 0.0, abs(vUv.y - 0.60));
          float outerInk = smoothstep(0.95, 0.87, vUv.y) * smoothstep(0.08, 0.16, vUv.y);
          float coreMask = smoothstep(0.56, 0.88, vUv.y + (smear - 0.5) * 0.14);
          float razorEdge = smoothstep(0.78, 0.91, vUv.y) * smoothstep(0.96, 0.92, vUv.y);

          float celStep = smoothstep(0.32, 0.38, coreMask + cogTeeth * 0.42);
          float hotStep = smoothstep(0.70, 0.76, coreMask + dialRibs * 0.5 + tipSpark * 0.45);
          vec3 inkCol = vec3(0.025, 0.014, 0.005);
          vec3 midCol = mix(uColor * 1.48, uCoreColor * 1.35, smoothstep(0.45, 0.85, smear));
          vec3 hotCol = mix(uCoreColor * 1.78, vec3(1.0, 0.97, 0.82) * 1.85, hotStep);

          col = mix(inkCol, midCol, celStep);
          col = mix(col, hotCol, hotStep);
          col = mix(inkCol, col, outerInk);
          if (uDarkCore > 0.5) {
            float voidBand = smoothstep(0.58, 0.26, vUv.y) * (1.0 - cogTeeth * 0.65);
            col = mix(col, inkCol, voidBand * 0.88);
          }
          col += uCoreColor * (razorEdge * 1.25 + dialRibs * 0.9 + cogTeeth * 0.45);
          col += vec3(1.0, 0.96, 0.80) * tipSpark * 1.15;
          alpha = clamp(max(alpha, headMask * tailMask * smoothstep(0.02, 0.14, vUv.y) * cogTeeth * 0.85 * uOpacity) * 1.38, 0.0, 1.0);
        } else if (uDarkCore > 0.5 || (uMode > 0.5 && uMode < 1.5)) {
          float rimEdge = smoothstep(0.70, 0.94, vUv.y) + tipSpark * 0.9;
          float innerDark = smoothstep(0.68, 0.34, vUv.y);
          col = mix(uColor * 1.45, uCoreColor * 1.9, clamp(rimEdge, 0.0, 1.0));
          col = mix(col, vec3(0.018, 0.008, 0.035), innerDark * 0.9);
          col += uColor * midWhip * 0.9;
        } else if (uMode > 1.5 && uMode < 2.5) {
          // Mode 2: Yukikage Iai-Zero Sumi-Frost Slash (razor pitch-navy sumi-ink void + jagged ice crystal fractures + absolute-zero white leading edge)
          float iceFracture = step(0.56, abs(fract(vUv.x * 18.0 + vUv.y * 5.0 + uSeed) - 0.5) * 2.0);
          float sumiCore = step(0.14, vUv.y) * step(vUv.y, 0.54);
          float zeroEdge = step(0.74, vUv.y) * step(vUv.y, 0.96);
          col = mix(uColor * 1.85, uCoreColor * 1.95, iceFracture * 0.75);
          col = mix(col, vec3(0.012, 0.022, 0.08), sumiCore * 0.92);
          col = mix(col, vec3(1.0) * 2.05, clamp(zeroEdge + tipSpark * 0.95 + coreBand * 0.7, 0.0, 1.0));
        } else if (uMode > 2.5 && uMode < 3.5) {
          // Mode 3: Halcyon Razor Thunder-Rail Broadsword Cleave (hard dark-navy ink void + jagged azure-gold lightning teeth + white razor edge)
          float railTeeth = step(0.58, abs(fract(vUv.x * 20.0 - uProgress * 10.0 + uSeed) - 0.5) * 2.0);
          float voidSteel = step(0.14, vUv.y) * step(vUv.y, 0.52);
          float razorRim = step(0.74, vUv.y) * step(vUv.y, 0.95);
          float spark = step(0.88, hash21(floor(vec2(vUv.x * 46.0, vUv.y * 12.0) + uSeed)));
          vec3 railCol = mix(uColor * 1.85, uCoreColor * 1.9, railTeeth * 0.72);
          col = mix(railCol, vec3(0.015, 0.032, 0.11), voidSteel * 0.92);
          col = mix(col, vec3(1.0, 0.99, 0.92) * 2.0, clamp(razorRim + spark + tipSpark * 0.95 + coreBand * 0.7, 0.0, 1.0));
        } else if (uMode > 3.5 && uMode < 4.5) {
          // Mode 4: Nocturne Abyssal Chain-Sever (spiky black-violet ink core + silver-star razor rim)
          float spikyEdge = smoothstep(0.36, 0.86, abs(fract(vUv.x * 16.0 - uProgress * 6.0 + uSeed) - 0.5) * 2.0);
          float voidSlash = smoothstep(0.66, 0.24, vUv.y) * smoothstep(0.08, 0.26, vUv.y);
          float starSpark = smoothstep(0.84, 0.98, hash21(floor(vec2(vUv.x * 42.0, vUv.y * 10.0) + uSeed)));
          vec3 hardCol = mix(uColor * 1.55, uCoreColor * 1.7, spikyEdge * 0.65);
          col = mix(hardCol, vec3(0.015, 0.008, 0.036), voidSlash * 0.94);
          col += vec3(0.72, 0.38, 1.0) * (midWhip * 0.9 + coreBand * 0.65) + vec3(1.0) * (starSpark * 1.2 + tipSpark * 0.95);
        } else if (uMode > 4.5 && uMode < 5.5) {
          // Mode 5: Lullaby Gothic Nightmare Ribbon (pitch-black ink void core + blazing sakura-magenta & porcelain-violet edge + gothic star glints)
          float laceRib = smoothstep(0.36, 0.72, cos(vUv.x * 24.0 - uProgress * 12.0 + vUv.y * 5.0) * 0.5 + 0.5);
          float sparkle = smoothstep(0.84, 0.98, hash21(floor(vec2(vUv.x * 46.0, vUv.y * 11.0))));
          vec3 sakuraEdge = mix(uColor * 1.62, uCoreColor * 1.75, laceRib);
          float inkCore = smoothstep(0.68, 0.24, vUv.y) * smoothstep(0.08, 0.28, vUv.y);
          float razorRim = smoothstep(0.68, 0.94, vUv.y) + smoothstep(0.24, 0.10, vUv.y) * 0.65;
          col = mix(sakuraEdge, vec3(0.02, 0.006, 0.042), inkCore * 0.92);
          col = mix(col, mix(uColor * 1.85, vec3(1.0, 0.94, 1.0), 0.52), clamp(razorRim, 0.0, 1.0));
          col += vec3(1.0, 0.92, 0.98) * (coreBand * 0.75 + sparkle * 1.35 + tipSpark * 0.8);
        } else if (uMode > 6.5 && uMode < 7.5) {
          // Mode 7: Glitch Cheshire (RGB scanline tear + cyber pixel teeth over phantom indigo ink)
          float rowTear = floor(vUv.y * 14.0 + floor(uProgress * 14.0));
          float tearOffset = step(0.68, hash21(vec2(rowTear, uSeed)));
          float cyberPixels = step(0.38, fract(vUv.x * 28.0 + tearOffset * 0.35 - uProgress * 9.0));
          vec3 splitCol = mix(uColor * 1.45, uCoreColor * 1.65, tearOffset);
          col = mix(vec3(0.02, 0.01, 0.07), splitCol, clamp(smoothstep(0.22, 0.68, vUv.y) * 0.9 + cyberPixels * 0.35, 0.0, 1.0));
          col += vec3(1.0) * (coreBand * 0.75 + tipSpark * 0.85);
        } else if (uMode > 7.5 && uMode < 8.5) {
          // Mode 8: Thorn Maiden (serrated crimson rose-thorn spine + velvet petal flecks)
          float thornSaw = smoothstep(0.45, 0.92, abs(fract(vUv.x * 20.0) - 0.5) * 2.0) * smoothstep(0.42, 0.12, vUv.y);
          float petalMote = smoothstep(0.78, 0.96, vnoise(vec2(vUv.x * 32.0 - uProgress * 7.0, vUv.y * 12.0 + uSeed)));
          col = mix(vec3(0.08, 0.01, 0.03), mix(uColor * 1.42, uCoreColor * 1.68, clamp(coreBand + petalMote * 0.6, 0.0, 1.0)), smoothstep(0.18, 0.64, vUv.y));
          col += uColor * thornSaw * 0.95 + vec3(1.0, 0.9, 0.92) * tipSpark * 0.75;
        } else if (uMode > 8.5 && uMode < 9.5) {
          // Mode 9: Monochrome Saint (Sumi-e bristle stroke + halftone dots)
          float bristle = smoothstep(0.32, 0.78, vnoise(vec2(vUv.x * 26.0, vUv.y * 22.0 + uSeed)));
          float dots = step(0.28, length(fract(vec2(vUv.x * 42.0, vUv.y * 10.0)) - 0.5));
          float inkMask = smoothstep(0.65, 0.28, vUv.y) * dots;
          col = mix(vec3(0.02, 0.02, 0.035), uColor * 1.48, clamp(coreBand * 1.15 + bristle * 0.45 - inkMask * 0.75, 0.0, 1.0));
          col += vec3(1.0) * tipSpark * 0.85;
        } else if (uMode > 9.5 && uMode < 10.5) {
          // Mode 10: Prism Seraph (chromatic rainbow diamond facets)
          float facetPhase = vUv.x * 16.0 + vUv.y * 7.0 - uProgress * 10.0 + uSeed;
          vec3 rainbow = 0.55 + 0.45 * cos(facetPhase + vec3(0.0, 2.094, 4.188));
          vec3 prismCol = mix(mix(uColor, uCoreColor, 0.5 + 0.5 * sin(facetPhase)), rainbow, 0.55);
          col = mix(vec3(0.03, 0.06, 0.16), prismCol * 1.45, smoothstep(0.16, 0.62, vUv.y));
          col += vec3(1.0) * clamp(coreBand * 0.95 + tipSpark * 0.85, 0.0, 1.0);
        } else if (uMode > 10.5) {
          // Mode 11: Aether Monarch (imperial liquid-gold crown edge + cyan nexus lightning veins)
          float vein = smoothstep(0.76, 0.96, sin(vUv.x * 32.0 - uProgress * 11.0 + vUv.y * 8.0));
          col = mix(vec3(0.04, 0.03, 0.12), uColor * 1.45, smoothstep(0.18, 0.65, vUv.y));
          col = mix(col, uCoreColor * 1.75, clamp(vein * 0.7 + coreBand * 0.65, 0.0, 1.0));
          col += vec3(1.0, 0.96, 0.82) * tipSpark * 0.85;
        }
        gl_FragColor = vec4(col, clamp(alpha * 1.95, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createFresnelDomeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec2 vUv;
      ${HASH_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 2.1);

        float n = vnoise(vec2(vUv.x * 16.0, vUv.y * 8.0 - uProgress * 5.0));
        float waveBand = smoothstep(0.16, 0.0, abs((vUv.y - 0.08) - uProgress * 0.95));
        float baseRim = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.35, vUv.y);

        float alpha = (0.34 + fresnel * 1.05 + waveBand * 0.85) * (0.68 + n * 0.32) * baseRim * uOpacity;
        if (alpha < 0.01) discard;

        vec3 darkShell = uColor * 0.26;
        vec3 brightRim = mix(uColor * 1.18, uCoreColor * 1.55, clamp(fresnel * 0.78 + waveBand * 0.58, 0.0, 1.0));
        vec3 col = mix(darkShell, brightRim, clamp(fresnel * 1.15 + waveBand * 0.95, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(alpha * 0.92, 0.0, 0.94));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createEnergyWeaponMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
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
        float ndl = 0.45 + 0.55 * dot(N, L);
        float rim = pow(max(0.0001, 1.0 - ndv), 1.6);
        float core = pow(max(0.0001, ndv), 1.4);
        float pulse = 0.94 + 0.14 * sin(vLocalPos.y * 8.0 - uTime * 16.0);

        vec3 deepBody = uColor * 0.28;
        vec3 brightFacet = mix(uColor * 1.18, uCoreColor * 1.55, clamp(rim * 0.74 + core * 0.5, 0.0, 1.0));
        vec3 col = mix(deepBody, brightFacet, 0.42 + 0.58 * ndl) * pulse;
        gl_FragColor = vec4(col, clamp(0.96 * uOpacity, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createOrbitalBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
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
      uniform float uProgress;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${HASH_NOISE_GLSL}

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float filament = pow(max(0.0001, ndv), 3.6);
        float outerEdge = pow(max(0.0001, 1.0 - ndv), 2.2) * 0.45;

        float scroll1 = vnoise(vec2(vUv.x * 10.0, vUv.y * 5.0 + uTime * 7.5));
        float scroll2 = vnoise(vec2(vUv.x * 22.0 - uTime * 2.5, vUv.y * 14.0 + uTime * 11.0));
        float plasma = scroll1 * 0.55 + scroll2 * 0.45;

        float vFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float alpha = (filament * 0.95 + (plasma * 0.56 + outerEdge) * 0.78) * vFade * uOpacity;
        if (alpha < 0.015) discard;

        vec3 sheath = uColor * 0.34;
        vec3 bright = mix(uColor * 1.18, uCoreColor * 1.58, clamp(filament * 1.25, 0.0, 1.0));
        vec3 col = mix(sheath, bright, clamp(filament * 1.15 + plasma * 0.65, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(alpha * 1.18, 0.0, 0.96));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createVortexConeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#fb923c') },
      uCoreColor: { value: new THREE.Color('#fff7ed') },
      uTwist: { value: 6.0 },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uTwist;
      varying vec2 vUv;
      ${HASH_NOISE_GLSL}

      void main() {
        float spiralU = fract(vUv.x * 3.0 + vUv.y * uTwist * 0.25 - uTime * 2.6);
        float n1 = vnoise(vec2(spiralU * 8.0, vUv.y * 6.0 - uTime * 3.8));
        float n2 = vnoise(vec2(vUv.x * 12.0 - uTime * 1.8, vUv.y * 10.0 - uTime * 5.2));

        float ribbons = smoothstep(0.24, 0.82, n1 * 0.65 + n2 * 0.5);
        float endFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float alpha = clamp(ribbons * 1.25 + 0.18, 0.0, 1.0) * endFade * uOpacity;
        if (alpha < 0.015) discard;

        vec3 darkSwirl = uColor * 0.25;
        vec3 brightSwirl = mix(uColor * 1.24, uCoreColor * 1.6, smoothstep(0.50, 0.88, ribbons));
        vec3 col = mix(darkSwirl, brightSwirl, ribbons);
        gl_FragColor = vec4(col, clamp(alpha * 0.96, 0.0, 0.96));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createSpatialRiftMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#ef4444') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
      uSeed: { value: 2.5 },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uSeed;
      varying vec2 vUv;
      ${HASH_NOISE_GLSL}

      void main() {
        float xNorm = abs(vUv.x - 0.5) * 2.0;
        float n = vnoise(vec2(vUv.x * 18.0 + uSeed, vUv.y * 12.0 - uProgress * 4.0));
        float jitter = (n - 0.5) * 0.14;
        float dy = abs((vUv.y - 0.5) + jitter);

        float endTaper = smoothstep(1.0, 0.14, xNorm);
        float riftHalfH = max(0.004, (0.04 + 0.19 * sin(min(uProgress * 1.4, 1.0) * 3.14159)) * endTaper);

        float coreSlit = smoothstep(riftHalfH * 0.58, 0.0, dy) * endTaper;
        float outerGlow = smoothstep(riftHalfH * 2.4, riftHalfH * 0.22, dy) * endTaper;

        float alpha = (coreSlit * 1.15 + outerGlow * 0.95) * uOpacity;
        if (alpha < 0.015) discard;

        vec3 voidEdge = mix(vec3(0.02, 0.01, 0.05), uColor * 1.32, smoothstep(0.25, 0.85, outerGlow));
        vec3 col = mix(voidEdge, uCoreColor * 1.78, coreSlit);
        gl_FragColor = vec4(col, clamp(alpha * 1.25, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

export function createBladeMeshGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, -0.32);
  shape.lineTo(0.025, -0.32);
  shape.lineTo(0.028, -0.04);
  shape.lineTo(0.14, -0.02);
  shape.lineTo(0.14, 0.04);
  shape.lineTo(0.045, 0.05);
  shape.lineTo(0.072, 1.25);
  shape.lineTo(0.015, 1.66);
  shape.lineTo(-0.048, 1.3);
  shape.lineTo(-0.04, 0.05);
  shape.lineTo(-0.14, 0.04);
  shape.lineTo(-0.14, -0.02);
  shape.lineTo(-0.028, -0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

export function createSpearGeometry(): THREE.BufferGeometry {
  const tipGeo = new THREE.ConeGeometry(0.12, 0.58, 4);
  tipGeo.translate(0, 0.72, 0);

  const shaftGeo = new THREE.CylinderGeometry(0.028, 0.014, 1.18, 6);
  shaftGeo.translate(0, -0.1, 0);

  return mergeSimpleGeos([tipGeo, shaftGeo]);
}

export function createCrystalSpikeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.24, 1.0, 5, 1);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0.9) {
      pos.setXYZ(i, x + 0.04, y, z - 0.03);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Colossal winged-crossguard Abyssal Greatsword + pommel chain pendant geometry for Obsidian Sovereign. */
export function createAbyssalGreatswordGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.038, -0.64);
  shape.lineTo(0.038, -0.64);
  shape.lineTo(0.042, -0.08);
  shape.lineTo(0.36, 0.08);
  shape.lineTo(0.26, -0.02);
  shape.lineTo(0.12, 0.08);
  shape.lineTo(0.18, 0.25);
  shape.lineTo(0.14, 1.88);
  shape.lineTo(0.0, 2.42);
  shape.lineTo(-0.14, 1.88);
  shape.lineTo(-0.18, 0.25);
  shape.lineTo(-0.12, 0.08);
  shape.lineTo(-0.26, -0.02);
  shape.lineTo(-0.36, 0.08);
  shape.lineTo(-0.042, -0.08);
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 1,
  });
  bladeGeo.translate(0, 0, -0.0275);

  const guardDiamond = new THREE.OctahedronGeometry(0.095, 0);
  guardDiamond.scale(0.85, 1.35, 0.65);
  guardDiamond.translate(0, 0.06, 0);

  const pommelSpire = new THREE.OctahedronGeometry(0.085, 0);
  pommelSpire.scale(0.85, 1.4, 0.65);
  pommelSpire.translate(0, -0.70, 0);

  const chainStem = new THREE.CylinderGeometry(0.014, 0.014, 0.24, 6);
  chainStem.rotateZ(0.55);
  chainStem.translate(0.07, -0.82, 0);

  const charmPendant = new THREE.OctahedronGeometry(0.078, 0);
  charmPendant.scale(0.75, 1.45, 0.45);
  charmPendant.rotateZ(0.55);
  charmPendant.translate(0.14, -0.94, 0);

  return mergeSimpleGeos([bladeGeo, guardDiamond, pommelSpire, chainStem, charmPendant]);
}

/** Nine-spearhead forged dark-steel halo ring geometry matching Obsidian Sovereign's canonical halo. */
export function createSpikedHaloGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(0.96, 0.046, 8, 36));

  // 9 radial diamond-barbed spearheads across the upper & side arc (matching idle.webp & pose.webp)
  const spearOffsets = [0, 0.44, -0.44, 0.88, -0.88, 1.32, -1.32, 1.74, -1.74];
  for (let i = 0; i < spearOffsets.length; i++) {
    const offset = spearOffsets[i];
    const isApex = i === 0;
    const outerTip = new THREE.ConeGeometry(isApex ? 0.088 : 0.068, isApex ? 0.66 : 0.52, 4);
    outerTip.scale(0.85, 1.0, 0.45);
    outerTip.translate(0, 0.98 + (isApex ? 0.30 : 0.24), 0);
    outerTip.rotateZ(-offset);
    parts.push(outerTip);

    // Inner counter-barb piercing inward through the iron ring
    const innerBarb = new THREE.ConeGeometry(isApex ? 0.056 : 0.044, isApex ? 0.26 : 0.20, 4);
    innerBarb.scale(0.82, 1.0, 0.42);
    innerBarb.rotateX(Math.PI);
    innerBarb.translate(0, 0.94 - (isApex ? 0.12 : 0.09), 0);
    innerBarb.rotateZ(-offset);
    parts.push(innerBarb);

    // Riveted diamond collar on the ring
    const collar = new THREE.OctahedronGeometry(isApex ? 0.082 : 0.066, 0);
    collar.scale(1.1, 0.75, 0.55);
    collar.translate(0, 0.96, 0);
    collar.rotateZ(-offset);
    parts.push(collar);
  }
  return mergeSimpleGeos(parts);
}

