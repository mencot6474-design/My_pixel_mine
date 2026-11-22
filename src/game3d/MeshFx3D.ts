import * as THREE from 'three';

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

        float outerShape = smoothstep(0.0, 0.46, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        float innerNoiseCut = smoothstep(0.1, 0.82, vUv.y + streakNoise * 0.32 - uProgress * 0.22);

        float alpha = headMask * tailMask * outerShape * innerNoiseCut * uOpacity;
        if (alpha < 0.015) discard;

        float coreBand = smoothstep(0.58, 0.9, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float midWhip = smoothstep(0.08, 0.0, abs(vUv.y - 0.46 + (n2 - 0.5) * 0.12)) * 0.75;
        float tipSpark = smoothstep(head - 0.16, head - 0.02, vUv.x) * headMask;
        float coreMix = clamp(coreBand * 0.95 + midWhip * 0.55 + tipSpark * 0.75, 0.0, 1.0);

        vec3 col = mix(uColor * 1.3, uCoreColor * 1.85, coreMix);
        if (uDarkCore > 0.5 || (uMode > 0.5 && uMode < 1.5)) {
          float rimEdge = smoothstep(0.72, 0.94, vUv.y) + tipSpark * 0.9;
          float innerDark = smoothstep(0.68, 0.34, vUv.y);
          col = mix(uColor * 1.45, uCoreColor * 2.0, clamp(rimEdge, 0.0, 1.0));
          col = mix(col, vec3(0.018, 0.008, 0.035), innerDark * 0.88);
          col += uColor * midWhip * 0.9;
        } else if (uMode > 1.5 && uMode < 2.5) {
          // Mode 2: Yukikage Frost-Ink (crystalline ice facets + dark shrine ink)
          float iceCrystal = abs(fract(vUv.x * 18.0 + vUv.y * 4.0) - 0.5) * 2.0;
          float crystalEdge = smoothstep(0.65, 0.95, iceCrystal + coreBand * 0.6);
          float inkRib = smoothstep(0.52, 0.25, vUv.y);
          col = mix(uColor * 1.4, uCoreColor * 1.95, crystalEdge);
          col = mix(col, vec3(0.02, 0.04, 0.08), inkRib * 0.86);
          col += vec3(0.7, 0.95, 1.0) * tipSpark * 0.8;
        } else if (uMode > 2.5 && uMode < 3.5) {
          // Mode 3: Halcyon Prism-Solar (iridescent feather prism bands)
          float prismWave = 0.5 + 0.5 * sin(vUv.x * 26.0 - uProgress * 12.0 + vUv.y * 6.0);
          vec3 prismHue = mix(uColor, uCoreColor, prismWave);
          float featherRay = smoothstep(0.72, 0.98, abs(sin(vUv.x * 38.0 + uSeed)));
          col = mix(prismHue * 1.35, vec3(1.0) * 1.9, clamp(coreBand + featherRay * 0.45 + tipSpark * 0.7, 0.0, 1.0));
        } else if (uMode > 3.5 && uMode < 4.5) {
          // Mode 4: Nocturne Gothic-Star (violet shadow flame + rose-crimson edge + star glints)
          float flame = vnoise(vec2(vUv.x * 24.0 - uProgress * 10.0, vUv.y * 9.0 + uSeed));
          float star = smoothstep(0.84, 0.98, hash21(floor(vec2(vUv.x * 48.0, vUv.y * 12.0))));
          float inkVoid = smoothstep(0.6, 0.28, vUv.y);
          col = mix(uColor * 1.45, uCoreColor * 1.75, smoothstep(0.45, 0.88, flame + coreBand * 0.6));
          col = mix(col, vec3(0.03, 0.01, 0.06), inkVoid * 0.82);
          col += vec3(1.0, 0.88, 0.7) * star * 1.4;
        } else if (uMode > 4.5 && uMode < 5.5) {
          // Mode 5: Lullaby Duality-Pact (oscillating nightmare magenta ink vs angel-cyan light)
          float duality = smoothstep(0.42, 0.58, sin(vUv.x * 16.0 + vUv.y * 8.0 - uProgress * 9.0) * 0.5 + 0.5);
          vec3 dualTint = mix(uColor * 1.45, uCoreColor * 1.75, duality);
          float inkCore = smoothstep(0.55, 0.25, vUv.y) * (1.0 - duality * 0.7);
          col = mix(dualTint, vec3(0.02, 0.01, 0.04), inkCore * 0.85);
          col += vec3(1.0) * coreBand * 0.85;
        } else if (uMode > 5.5) {
          // Mode 6: Clockwork Chrono-Wave (precision gear tooth ticks + chrono-teal pulse)
          float gearTicks = step(0.42, fract(vUv.x * 24.0 - uProgress * 6.0));
          float dialBand = smoothstep(0.1, 0.0, abs(vUv.y - 0.62)) * gearTicks;
          col = mix(uColor * 1.38, uCoreColor * 1.75, clamp(coreBand * 0.85 + dialBand * 0.9, 0.0, 1.0));
          col += vec3(1.0, 0.92, 0.6) * tipSpark * 0.75;
        }
        gl_FragColor = vec4(col, clamp(alpha * 1.3, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
        float fresnel = pow(1.0 - abs(dot(N, V)), 2.1);

        float n = vnoise(vec2(vUv.x * 16.0, vUv.y * 8.0 - uProgress * 5.0));
        float waveBand = smoothstep(0.16, 0.0, abs((vUv.y - 0.08) - uProgress * 0.95));
        float baseRim = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.35, vUv.y);

        float alpha = (fresnel * 0.95 + waveBand * 0.65) * (0.55 + n * 0.45) * baseRim * uOpacity;
        if (alpha < 0.01) discard;

        vec3 col = mix(uColor * 1.05, uCoreColor * 1.38, clamp(fresnel * 0.72 + waveBand * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(alpha * 0.46, 0.0, 0.55));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 1.8);
        float core = pow(ndv, 1.6);
        float pulse = 0.92 + 0.14 * sin(vLocalPos.y * 8.0 - uTime * 16.0);

        vec3 col = mix(uColor * 1.15, uCoreColor * 1.55, clamp(rim * 0.72 + core * 0.4, 0.0, 1.0)) * pulse;
        gl_FragColor = vec4(col, clamp((0.68 + rim * 0.32) * uOpacity, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
        float filament = pow(ndv, 3.6);
        float outerEdge = pow(1.0 - ndv, 2.2) * 0.45;

        float scroll1 = vnoise(vec2(vUv.x * 10.0, vUv.y * 5.0 + uTime * 7.5));
        float scroll2 = vnoise(vec2(vUv.x * 22.0 - uTime * 2.5, vUv.y * 14.0 + uTime * 11.0));
        float plasma = scroll1 * 0.55 + scroll2 * 0.45;

        float vFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float alpha = (filament * 0.85 + (plasma * 0.48 + outerEdge) * 0.6) * vFade * uOpacity;
        if (alpha < 0.015) discard;

        vec3 col = mix(uColor * 1.1, uCoreColor * 1.45, clamp(filament * 1.15, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(alpha * 0.52, 0.0, 0.6));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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

        float ribbons = smoothstep(0.3, 0.85, n1 * 0.65 + n2 * 0.5);
        float endFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float alpha = ribbons * endFade * uOpacity;
        if (alpha < 0.015) discard;

        vec3 col = mix(uColor * 1.2, uCoreColor * 1.6, smoothstep(0.56, 0.9, ribbons));
        gl_FragColor = vec4(col, clamp(alpha * 0.88, 0.0, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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

        float coreSlit = smoothstep(riftHalfH * 0.48, 0.0, dy) * endTaper;
        float outerGlow = smoothstep(riftHalfH * 2.2, riftHalfH * 0.22, dy) * endTaper;

        float alpha = (coreSlit + outerGlow * 0.8) * uOpacity;
        if (alpha < 0.015) discard;

        vec3 col = mix(uColor * 1.35, uCoreColor * 1.85, coreSlit);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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

/** Colossal winged-crossguard Abyssal Greatsword geometry for Obsidian Sovereign. */
export function createAbyssalGreatswordGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.035, -0.62);
  shape.lineTo(0.035, -0.62);
  shape.lineTo(0.038, -0.08);
  shape.lineTo(0.32, 0.06);
  shape.lineTo(0.24, -0.02);
  shape.lineTo(0.11, 0.08);
  shape.lineTo(0.16, 0.24);
  shape.lineTo(0.13, 1.85);
  shape.lineTo(0.0, 2.38);
  shape.lineTo(-0.13, 1.85);
  shape.lineTo(-0.16, 0.24);
  shape.lineTo(-0.11, 0.08);
  shape.lineTo(-0.24, -0.02);
  shape.lineTo(-0.32, 0.06);
  shape.lineTo(-0.038, -0.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.0275);
  geo.computeVertexNormals();
  return geo;
}

/** Seven-spiked iron halo ring geometry matching Obsidian Sovereign's crown halo. */
export function createSpikedHaloGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(1.0, 0.048, 8, 36));
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + Math.PI / 2;
    const spike = new THREE.ConeGeometry(0.075, 0.56, 4);
    spike.translate(0, 1.24, 0);
    spike.rotateZ(angle - Math.PI / 2);
    parts.push(spike);
  }
  return mergeSimpleGeos(parts);
}

/** Animated GLSL Clockwork Chrono-Astrolabe Dial shader with bevel cog rings, 60-tick dial, planetary sub-gears & sweeping hands. */
export function createClockworkDialShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f59e0b') },
      uCoreColor: { value: new THREE.Color('#2dd4bf') },
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

      float sdSeg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float gearRingMask(vec2 p, float rad, float thick, float teeth, float toothDepth, float rot) {
        float r = length(p);
        float a = atan(p.y, p.x) + rot;
        float toothWave = smoothstep(-0.2, 0.25, cos(a * teeth));
        float rOuter = rad + toothDepth * toothWave;
        float rInner = rad - thick;
        return smoothstep(0.014, 0.0, r - rOuter) * smoothstep(0.014, 0.0, rInner - r);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float timeStopGlow = smoothstep(0.45, 0.58, uProgress) * smoothstep(0.82, 0.62, uProgress);
        float dialSpeed = mix(1.0, 0.08, timeStopGlow);
        float t = uTime * dialSpeed;

        float baseGlow = exp(-r * r * 3.8) * 0.34;
        float pulseWave = smoothstep(0.08, 0.0, abs(r - fract(uProgress * 1.45) * 0.96)) * 0.55;

        float outerGear = gearRingMask(p, 0.91, 0.032, 28.0, 0.042, t * 0.55);
        float outerRim = smoothstep(0.016, 0.0, abs(r - 0.87));
        float secTicks = smoothstep(0.86, 0.99, cos(ang * 60.0)) * smoothstep(0.79, 0.81, r) * smoothstep(0.86, 0.84, r);

        float hrSector = fract((ang + 3.14159265) / 0.52359877) - 0.5;
        float hrDiamond = smoothstep(0.06, 0.015, abs(hrSector) * r * 1.35 + abs(r - 0.72) * 1.15);
        float midRing = smoothstep(0.018, 0.0, abs(r - 0.66));
        float innerGear = gearRingMask(p, 0.56, 0.028, 18.0, 0.035, -t * 1.15);
        float coreRing = smoothstep(0.015, 0.0, abs(r - 0.24));

        float subGears = 0.0;
        for (int i = 0; i < 3; i++) {
          float oa = float(i) * 2.094395 + t * 0.75;
          vec2 cPos = vec2(cos(oa), sin(oa)) * 0.41;
          subGears += gearRingMask(p - cPos, 0.12, 0.02, 10.0, 0.022, -t * 2.4 + float(i));
          subGears += smoothstep(0.028, 0.012, length(p - cPos)) * 0.8;
        }

        float secAng = -t * 4.8 - uProgress * 9.42;
        float minAng = -t * 1.3 - uProgress * 3.14;
        float hrAng  =  t * 0.45 + 0.8;

        vec2 secDir = vec2(cos(secAng), sin(secAng));
        vec2 minDir = vec2(cos(minAng), sin(minAng));
        vec2 hrDir  = vec2(cos(hrAng), sin(hrAng));

        float angDiff = mod(secAng - ang + 6.2831853, 6.2831853);
        float sweepTrail = smoothstep(1.15, 0.0, angDiff) * smoothstep(0.1, 0.35, r) * smoothstep(0.84, 0.72, r) * 0.48;

        float dSec = sdSeg(p, -secDir * 0.16, secDir * 0.82);
        float secHand = smoothstep(0.014, 0.004, dSec);

        float dMin = sdSeg(p, -minDir * 0.1, minDir * 0.7);
        float minWidth = mix(0.032, 0.006, clamp(dot(p, minDir) / 0.7, 0.0, 1.0));
        float minHand = smoothstep(minWidth, minWidth * 0.35, dMin) * step(-0.11, dot(p, minDir));

        float dHr = sdSeg(p, -hrDir * 0.08, hrDir * 0.48);
        float hrWidth = mix(0.042, 0.01, clamp(dot(p, hrDir) / 0.48, 0.0, 1.0));
        float hrHand = smoothstep(hrWidth, hrWidth * 0.35, dHr) * step(-0.09, dot(p, hrDir));

        float centerHub = smoothstep(0.065, 0.035, r);

        float brassLayer = clamp(outerGear + outerRim + secTicks * 0.7 + midRing + innerGear + hrDiamond * 0.9 + hrHand + minHand, 0.0, 1.0);
        float tealLayer = clamp(subGears * 0.85 + coreRing + secHand + sweepTrail + pulseWave + centerHub, 0.0, 1.0);
        float totalMask = clamp(brassLayer + tealLayer + baseGlow, 0.0, 1.0);

        float edgeFade = smoothstep(1.0, 0.92, r);
        float alpha = totalMask * edgeFade * uOpacity;
        if (alpha < 0.015) discard;

        float shimmer = 0.88 + 0.22 * sin(ang * 6.0 + uTime * 2.5);
        vec3 brassCol = uColor * (1.28 * shimmer) + vec3(0.45, 0.35, 0.1) * (hrDiamond + minHand);
        vec3 tealCol = uCoreColor * 1.65 + vec3(0.4, 0.45, 0.45) * (secHand + centerHub);

        vec3 col = brassCol * brassLayer + tealCol * tealLayer + mix(uColor, uCoreColor, 0.5) * baseGlow;
        col = mix(col, vec3(0.85, 1.0, 0.98) * 1.85, timeStopGlow * (0.35 + tealLayer * 0.5));
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/** Procedural 12-tooth brass cogwheel geometry for Clockwork Twins. */
export function createClockworkGearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(0.78, 0.085, 6, 24));
  parts.push(new THREE.TorusGeometry(0.28, 0.06, 6, 16));
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(1.5, 0.08, 0.06);
    spoke.rotateZ((i / 4) * Math.PI);
    parts.push(spoke);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(0.14, 0.22, 0.08);
    tooth.translate(0, 0.92, 0);
    tooth.rotateZ(a);
    parts.push(tooth);
  }
  return mergeSimpleGeos(parts);
}

/** Stylized swept multi-feather wing blade geometry for Halcyon Twins. */
export function createAcademyWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.45, 0.85, 1.25, 1.15);
  shape.lineTo(0.75, 0.62);
  shape.lineTo(1.08, 0.56);
  shape.lineTo(0.58, 0.26);
  shape.lineTo(0.84, 0.14);
  shape.quadraticCurveTo(0.32, -0.04, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.015);
  geo.computeVertexNormals();
  return geo;
}

/** Yukikage Held Frost-Ink Slash Shader: rapid slash draw -> frozen hold -> Voronoi ice-crystal shatter burst. */
export function createHeldFrostSlashShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#e0f2fe') },
      uDraw: { value: 1.0 },
      uShatter: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uDraw;
      uniform float uShatter;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453123);
      }

      void main() {
        if (vUv.x > uDraw + 0.05) discard;
        float drawMask = smoothstep(uDraw + 0.05, max(0.0, uDraw - 0.08), vUv.x);
        float tipTaper = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        float distY = abs(vUv.y - 0.5) * 2.0;

        vec2 cellUv = vec2(vUv.x * 18.0 + uSeed * 3.7, vUv.y * 4.5);
        vec2 iCell = floor(cellUv);
        vec2 fCell = fract(cellUv);
        float minDist = 8.0;
        float secondDist = 8.0;
        vec2 bestCell = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 pt = hash2(iCell + neighbor);
            pt = 0.5 + 0.38 * sin(uSeed * 5.0 + 6.2831 * pt);
            vec2 diff = neighbor + pt - fCell;
            float d = length(diff);
            if (d < minDist) {
              secondDist = minDist;
              minDist = d;
              bestCell = iCell + neighbor;
            } else if (d < secondDist) {
              secondDist = d;
            }
          }
        }
        float borderDist = secondDist - minDist;
        vec2 cellRand = hash2(bestCell + uSeed);

        float dispY = (cellRand.y - 0.5) * 2.35 * uShatter;
        float dispX = (cellRand.x - 0.5) * 0.45 * uShatter;
        float localY = abs((vUv.y - dispY * 0.45) - 0.5) * 2.0;
        float localX = clamp(vUv.x - dispX, 0.0, 1.0);
        float localTaper = smoothstep(0.0, 0.12, localX) * smoothstep(1.0, 0.88, localX);

        float gapThreshold = mix(0.0, 0.28 + 0.24 * cellRand.x, uShatter);
        float shardAlive = step(gapThreshold, borderDist) * step(uShatter, 0.72 + 0.28 * cellRand.y);

        float bladeWidth = max(0.03, tipTaper * (0.28 + 0.12 * sin(vUv.x * 19.0 + uSeed)));
        float coreBlade = smoothstep(bladeWidth, bladeWidth * 0.12, localY);
        float outerAura = smoothstep(bladeWidth * 3.1, bladeWidth * 0.25, localY) * (1.0 - uShatter * 0.65);

        float crackGlow = smoothstep(0.11, 0.015, borderDist) * smoothstep(bladeWidth * 2.4, 0.0, distY);
        float holdPulse = 0.88 + 0.18 * sin(uTime * 36.0 + vUv.x * 24.0 + uSeed);
        float inkRim = smoothstep(bladeWidth * 2.4, bladeWidth * 0.75, localY) * (1.0 - coreBlade);

        vec3 inkCol = vec3(0.02, 0.06, 0.14);
        vec3 frostCol = mix(uColor * 1.4, uCoreColor * 1.9, clamp(coreBlade + crackGlow * 0.75, 0.0, 1.0));
        float shatterFlash = sin(uShatter * 3.14159) * 1.35;
        vec3 col = mix(inkCol, frostCol * (holdPulse + shatterFlash), clamp(coreBlade + outerAura * 0.72 + crackGlow, 0.0, 1.0));

        float alpha = (coreBlade + outerAura * 0.62 + inkRim * 0.78 + crackGlow * 0.55)
          * drawMask * localTaper * shardAlive * (1.0 - uShatter * 0.82) * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Yukikage Twins Back-Shader 1: Cryo Shinto Shrine Seal Ring (Frost-Cyan & Shrine-Ink Drum Halo). */
export function createYukikageShrineRingShaderMaterial(): THREE.ShaderMaterial {
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.22) discard;
        float angle = atan(p.y, p.x);

        float outerRing = exp(-pow((r - 0.82) * 24.0, 2.0));
        float midRing = exp(-pow((r - 0.64) * 26.0, 2.0));
        float innerRing = exp(-pow((r - 0.44) * 28.0, 2.0));

        float nodeAng = mod(angle + uTime * 0.8 + 0.3927, 0.785398) - 0.3927;
        vec2 nodeP = vec2(r - 0.73, nodeAng * 0.73);
        float drumNode = smoothstep(0.095, 0.04, length(nodeP));
        float drumRing = exp(-pow((length(nodeP) - 0.095) * 38.0, 2.0));

        float ticks = smoothstep(0.55, 0.95, cos(angle * 16.0 - uTime * 1.6))
          * smoothstep(0.45, 0.50, r) * smoothstep(0.63, 0.58, r);
        float iceSpokes = pow(max(0.0, cos(angle * 6.0 + uTime * 1.1)), 10.0)
          * smoothstep(0.88, 0.36, r) * smoothstep(0.28, 0.44, r);

        float inkBand = smoothstep(0.88, 0.68, r) * smoothstep(0.36, 0.52, r) * 0.78;
        vec3 inkBlack = vec3(0.02, 0.05, 0.11);
        vec3 frostCyan = vec3(0.16, 0.74, 0.98);
        vec3 iceWhite = vec3(0.90, 0.97, 1.0);

        float brightMask = clamp(outerRing + midRing * 0.9 + innerRing * 0.75 + drumNode + drumRing * 0.9 + ticks * 0.85 + iceSpokes * 0.7, 0.0, 1.0);
        vec3 col = mix(inkBlack, frostCyan, brightMask);
        col = mix(col, iceWhite, clamp(drumNode * 0.85 + outerRing * 0.45 + ticks * 0.4, 0.0, 1.0));

        float edgeFade = smoothstep(0.99, 0.86, r) * smoothstep(0.22, 0.34, r);
        float alpha = clamp((inkBand + brightMask * 0.95) * edgeFade * uOpacity, 0.0, 0.95);
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

/** Yukikage Twins Back-Shader 2: Frost-Ink Kunai Blade Custom GLSL Shader. */
export function createYukikageKunaiShaderMaterial(): THREE.ShaderMaterial {
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
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float ndv = abs(dot(N, V));
        float ndl = 0.45 + 0.55 * dot(N, L);
        float rim = pow(1.0 - ndv, 1.6);

        float isBlade = smoothstep(-0.08, 0.05, vLocalPos.y);
        float fullerGroove = smoothstep(0.075, 0.02, abs(vLocalPos.x)) * smoothstep(0.75, 0.05, vLocalPos.y);
        float frostStream = smoothstep(0.35, 0.92, sin(vLocalPos.y * 16.0 - uTime * 14.0));

        vec3 darkInk = vec3(0.03, 0.06, 0.13);
        vec3 frostCyan = vec3(0.18, 0.76, 0.98);
        vec3 iceWhite = vec3(0.92, 0.98, 1.0);

        vec3 bladeCol = mix(frostCyan * 0.75, iceWhite, 0.35 + 0.65 * ndl);
        bladeCol = mix(bladeCol, darkInk, fullerGroove * 0.82);
        bladeCol += frostCyan * (rim * 0.45 + frostStream * 0.25);

        vec3 hiltCol = mix(darkInk, frostCyan * 0.65, rim * 0.6 + frostStream * 0.25);
        vec3 col = mix(hiltCol, bladeCol, isBlade);

        float alpha = clamp(0.95 * uOpacity, 0.0, 1.0);
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

/** 3D Ninja Kunai Geometry for Yukikage Twins (ring pommel + wrapped grip + 4-faceted diamond kunai blade). */
export function createKunaiGeometry(): THREE.BufferGeometry {
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.032, -0.45);
  bladeShape.lineTo(0.032, -0.45);
  bladeShape.lineTo(0.038, -0.06);
  bladeShape.lineTo(0.22, 0.18);
  bladeShape.lineTo(0.0, 0.98);
  bladeShape.lineTo(-0.22, 0.18);
  bladeShape.lineTo(-0.038, -0.06);
  bladeShape.closePath();

  const vaneA = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  vaneA.translate(0, 0, -0.018);

  const vaneB = vaneA.clone();
  vaneB.scale(0.55, 1, 1);
  vaneB.rotateY(Math.PI / 2);

  const ring = new THREE.TorusGeometry(0.10, 0.026, 6, 14);
  ring.translate(0, -0.55, 0);

  return mergeSimpleGeos([vaneA, vaneB, ring]);
}

/** Halcyon Celestial Blade & Arrow Rain Custom GLSL Shader (NormalBlending for crisp bloom-safe gold & cyan facets). */
export function createHalcyonRainShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#22d3ee') },
      uAccentColor: { value: new THREE.Color('#fde047') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 1.0 },
      uImpact: { value: 0.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 0.0 },
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
      uniform vec3 uAccentColor;
      uniform vec3 uCoreColor;
      uniform float uOpacity;
      uniform float uImpact;
      uniform float uTime;
      uniform float uSeed;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.82, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.5 + 0.5 * dot(N, L);
        float rim = pow(1.0 - ndv, 1.9);

        float hNorm = clamp((vLocalPos.y + 0.85) / 2.5, 0.0, 1.0);

        vec3 deepShade = mix(vec3(0.06, 0.14, 0.24), vec3(0.24, 0.16, 0.03), hNorm);
        vec3 midTone = mix(uColor * 0.92, uAccentColor * 0.96, smoothstep(0.22, 0.78, hNorm));
        vec3 bodyCol = mix(deepShade, midTone, 0.42 + 0.58 * ndl);

        float streakWave = sin(vLocalPos.y * 16.0 - uTime * 34.0 + uSeed * 6.2831);
        float streak = smoothstep(0.45, 0.95, streakWave) * (1.0 - uImpact * 0.75);

        float shockCenter = mix(1.05, -0.15, clamp(uImpact * 1.5, 0.0, 1.0));
        float shockBand = exp(-pow((hNorm - shockCenter) * 8.5, 2.0)) * step(0.01, uImpact) * (1.0 - uImpact * 0.6);

        bodyCol += uAccentColor * rim * 0.52;
        bodyCol += uCoreColor * (streak * 0.38 + shockBand * 0.95 + pow(hNorm, 3.0) * 0.24);

        float alpha = clamp((0.92 + rim * 0.08) * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(bodyCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Halcyon Twins — Multi-Portal "Gate of Babylon" Golden-Cyan Liquid Ripple Portal Shader. */
export function createHalcyonPortalRippleShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#fde047') },
      uAccentColor: { value: new THREE.Color('#22d3ee') },
      uPulse: { value: 0.0 },
      uSeed: { value: 0.0 },
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
      uniform vec3 uColor;
      uniform vec3 uAccentColor;
      uniform float uPulse;
      uniform float uSeed;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(vec2(p.x, p.y * 1.12));
        if (r > 0.98) discard;
        float angle = atan(p.y, p.x);

        float rippleWave = sin(r * 26.0 - uTime * 15.0 + uSeed * 6.2831);
        float ripples = smoothstep(0.25, 0.95, rippleWave) * smoothstep(0.92, 0.14, r);

        float outerBezel = exp(-pow((r - 0.82) * 22.0, 2.0));
        float innerBezel = exp(-pow((r - 0.52) * 24.0, 2.0));
        float starRunes = smoothstep(0.45, 0.95, cos(angle * 8.0 + uTime * 3.5 + uSeed * 6.0)) * outerBezel;
        float coreWell = smoothstep(0.46, 0.04, r);

        vec3 darkGoldBg = vec3(0.18, 0.11, 0.02);
        vec3 solarGold = vec3(0.96, 0.74, 0.12);
        vec3 skyCyan = vec3(0.12, 0.78, 0.95);
        vec3 hotCore = vec3(1.0, 0.95, 0.75);

        vec3 col = darkGoldBg;
        col = mix(col, solarGold, clamp(ripples * 0.78 + outerBezel * 0.95 + starRunes * 0.65, 0.0, 1.0));
        col = mix(col, skyCyan, clamp(innerBezel * 0.85 + ripples * 0.28 * (1.0 - coreWell), 0.0, 1.0));
        col = mix(col, hotCore, clamp(coreWell * (0.65 + uPulse * 0.35), 0.0, 1.0));

        float edgeFade = smoothstep(0.98, 0.76, r);
        float alpha = clamp((0.55 + ripples * 0.35 + outerBezel * 0.85 + innerBezel * 0.75 + coreWell * 0.85) * edgeFade * uOpacity, 0.0, 0.94);
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

/** 3D Barbed & Fletched Celestial Arrow Geometry for Halcyon Twins. */
export function createArrowGeometry(): THREE.BufferGeometry {
  const headShape = new THREE.Shape();
  headShape.moveTo(0, 1.48);
  headShape.lineTo(0.17, 0.78);
  headShape.lineTo(0.032, 0.90);
  headShape.lineTo(0.026, -0.78);
  headShape.lineTo(0.15, -0.66);
  headShape.lineTo(0.13, -0.26);
  headShape.lineTo(0.024, -0.40);
  headShape.lineTo(-0.024, -0.40);
  headShape.lineTo(-0.13, -0.26);
  headShape.lineTo(-0.15, -0.66);
  headShape.lineTo(-0.026, -0.78);
  headShape.lineTo(-0.032, 0.90);
  headShape.lineTo(-0.17, 0.78);
  headShape.closePath();

  const vaneA = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  vaneA.translate(0, 0, -0.011);

  const vaneB = vaneA.clone();
  vaneB.rotateY(Math.PI / 2);

  return mergeSimpleGeos([vaneA, vaneB]);
}

/** Nocturne Dual Black & White Wing Custom GLSL Shader (NormalBlending so both Black & White wings pop). */
export function createNocturneWingShaderMaterial(isBlack = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIsBlack: { value: isBlack ? 1.0 : 0.0 },
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
      uniform float uIsBlack;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 1.55);

        float featherWave = sin(vLocalPos.x * 16.0 + vLocalPos.y * 10.0 - uTime * 7.0);
        float vein = smoothstep(0.45, 0.92, featherWave);
        float spanGrad = clamp(length(vLocalPos.xy) / 1.65, 0.0, 1.0);

        vec3 whiteWing = mix(vec3(0.96, 0.98, 1.0), vec3(0.76, 0.82, 0.94), spanGrad * 0.55);
        whiteWing = mix(whiteWing, vec3(0.10, 0.08, 0.16), vein * 0.38);
        whiteWing += vec3(0.32, 0.34, 0.42) * rim;

        vec3 blackWing = mix(vec3(0.03, 0.03, 0.05), vec3(0.09, 0.06, 0.14), spanGrad);
        blackWing += mix(vec3(0.58, 0.35, 0.92), vec3(0.95, 0.97, 1.0), rim) * (rim * 0.95 + vein * 0.34);

        vec3 col = mix(whiteWing, blackWing, uIsBlack);
        float alpha = clamp((0.92 + rim * 0.08) * uOpacity, 0.0, 1.0);
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

/** Sweeping 4-pinion Gothic Seraph Wing Geometry for Nocturne Twins. */
export function createNocturneWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.38, 1.05, 1.52, 1.38);
  shape.lineTo(0.92, 0.86);
  shape.lineTo(1.38, 0.76);
  shape.lineTo(0.80, 0.46);
  shape.lineTo(1.18, 0.32);
  shape.lineTo(0.64, 0.10);
  shape.lineTo(0.90, -0.08);
  shape.quadraticCurveTo(0.36, -0.18, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

/** Nocturne Orbiting Black & White Meteor Custom GLSL Shader (3D rocky displacement + Yin-Yang magma fissures). */
export function createNocturneMeteorShaderMaterial(isBlack = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIsBlack: { value: isBlack ? 1.0 : 0.0 },
      uTime: { value: 0.0 },
      uHeat: { value: 0.0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uIsBlack;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying float vCrater;

      void main() {
        vec3 p = position;
        float n1 = sin(p.x * 5.2 + uTime * 4.5 + uIsBlack * 3.14) * cos(p.y * 5.0 - uTime * 3.8) * sin(p.z * 5.4 + uTime * 3.2);
        float n2 = cos(p.x * 9.5 - uTime * 6.0) * sin(p.y * 9.2 + p.z * 8.8);
        float disp = n1 * 0.14 + n2 * 0.06;
        vCrater = clamp(0.5 + disp * 3.2, 0.0, 1.0);

        vec3 displaced = p + normal * disp;
        vLocalPos = displaced;
        vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uIsBlack;
      uniform float uTime;
      uniform float uHeat;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying float vCrater;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 1.5);

        float veinPattern = abs(sin(vLocalPos.x * 7.5 + vLocalPos.y * 6.5 - uTime * 8.0) * cos(vLocalPos.z * 7.2 + uTime * 6.5));
        float fissure = smoothstep(0.18, 0.02, veinPattern) + smoothstep(0.75, 0.98, vCrater) * 0.45;
        float heatBoost = 1.0 + uHeat * 0.35;

        vec3 whiteRock = mix(vec3(0.84, 0.88, 0.96), vec3(1.0, 1.0, 1.0), vCrater);
        whiteRock = mix(whiteRock, vec3(0.06, 0.04, 0.10), clamp(fissure * 0.78, 0.0, 0.88));
        whiteRock += vec3(0.30, 0.34, 0.42) * rim * heatBoost;

        vec3 blackRock = mix(vec3(0.02, 0.02, 0.04), vec3(0.08, 0.06, 0.13), vCrater);
        vec3 blackGlow = mix(vec3(0.68, 0.48, 0.98), vec3(1.0, 1.0, 1.0), clamp(fissure * 0.65 + rim * 0.5, 0.0, 1.0));
        blackRock = mix(blackRock, blackGlow, clamp(fissure * 0.82 + rim * 0.88, 0.0, 1.0));

        vec3 col = mix(whiteRock, blackRock, uIsBlack);
        float alpha = clamp(uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}

/** Nocturne Spiraling Comet Tail Custom GLSL Shader (Black & White helical flame wake). */
export function createNocturneCometTailShaderMaterial(isBlack = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIsBlack: { value: isBlack ? 1.0 : 0.0 },
      uTime: { value: 0.0 },
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
      uniform float uIsBlack;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float along = vUv.y;
        float flameNoise = sin(along * 16.0 - uTime * 28.0 + vUv.x * 12.566) * 0.5 + 0.5;
        float streak = smoothstep(0.2, 0.88, sin(vUv.x * 25.132 + along * 10.0 - uTime * 22.0));
        float tailMask = (1.0 - along) * smoothstep(1.0, 0.12, along + flameNoise * 0.22);

        vec3 whiteTail = mix(vec3(1.0, 1.0, 1.0), vec3(0.75, 0.82, 0.95), along);
        whiteTail = mix(whiteTail, vec3(0.12, 0.10, 0.18), streak * 0.35);

        vec3 blackTail = mix(vec3(0.03, 0.02, 0.05), vec3(0.11, 0.07, 0.18), flameNoise);
        blackTail = mix(blackTail, vec3(0.94, 0.96, 1.0), streak * 0.72);

        vec3 col = mix(whiteTail, blackTail, uIsBlack);
        float alpha = clamp(tailMask * (0.78 + streak * 0.22) * uOpacity, 0.0, 1.0);
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

/** Nocturne Yin-Yang Eclipse Surface Impact Crater Shader. */
export function createNocturneEclipseCraterShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        float swirlAngle = angle + r * 3.6 - uTime * 5.5;
        float polarity = smoothstep(-0.18, 0.18, sin(swirlAngle));

        float shockRing = exp(-pow((r - min(0.92, 0.25 + uProgress * 0.85)) * 16.0, 2.0));
        float innerRing = exp(-pow((r - 0.36) * 18.0, 2.0));
        float crackWave = abs(sin(angle * 10.0 + sin(r * 14.0 - uTime * 8.0) * 1.4));
        float cracks = smoothstep(0.16, 0.02, crackWave) * smoothstep(0.92, 0.12, r);
        float coreMask = smoothstep(0.75, 0.06, r) * 0.72;

        vec3 whiteSide = vec3(0.96, 0.98, 1.0);
        vec3 blackSide = vec3(0.03, 0.02, 0.05);
        vec3 baseCol = mix(blackSide, whiteSide, polarity);
        vec3 invCol = mix(whiteSide, blackSide, polarity);
        vec3 col = mix(baseCol, invCol, clamp(cracks * 0.85 + shockRing * 0.9 + innerRing * 0.75, 0.0, 1.0));

        float edgeFade = smoothstep(0.99, 0.78, r);
        float alpha = clamp((coreMask + shockRing * 0.95 + innerRing * 0.85 + cracks * 0.8) * edgeFade * uOpacity, 0.0, 1.0);
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

/** Lullaby Pure-White Angel Wing Custom GLSL Shader (silky snowy feathers + soft sakura-pearl rim). */
export function createLullabyWhiteWingShaderMaterial(): THREE.ShaderMaterial {
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
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 1.55);

        float featherWave = sin(vLocalPos.x * 18.0 + vLocalPos.y * 12.0 - uTime * 5.2);
        float barb = smoothstep(0.35, 0.92, featherWave);
        float spanGrad = clamp(length(vLocalPos.xy) / 1.65, 0.0, 1.0);

        vec3 pureWhite = vec3(0.99, 0.98, 1.0);
        vec3 sakuraPearl = vec3(0.96, 0.78, 0.88);
        vec3 wingCol = mix(pureWhite, sakuraPearl, spanGrad * 0.42 + (1.0 - barb) * 0.18);
        wingCol += vec3(0.98, 0.55, 0.80) * rim * 0.48;
        wingCol += vec3(0.18, 0.16, 0.20) * barb * 0.14;

        float alpha = clamp((0.94 + rim * 0.06) * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(wingCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Lullaby Radiant Pink Dream-Halo & Sakura Ribbon Aura Shader behind the Chibi. */
export function createLullabyPinkAuraShaderMaterial(): THREE.ShaderMaterial {
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        float softCore = smoothstep(0.95, 0.10, r) * 0.42;
        float haloRing = exp(-pow((r - 0.68 - 0.03 * sin(uTime * 4.0)) * 16.0, 2.0));
        float innerRing = exp(-pow((r - 0.44) * 18.0, 2.0));

        float petalWave = pow(max(0.0, cos(angle * 4.0 - uTime * 2.4 + r * 3.0)), 4.0);
        float starSpark = pow(max(0.0, cos(angle * 8.0 + uTime * 3.6)), 10.0) * smoothstep(0.88, 0.35, r);
        float ribbons = petalWave * smoothstep(0.92, 0.25, r) * smoothstep(0.15, 0.42, r) * 0.55;

        vec3 hotPink = vec3(0.92, 0.14, 0.56);
        vec3 softPink = vec3(0.96, 0.36, 0.72);
        vec3 deepRose = vec3(0.72, 0.08, 0.42);

        vec3 col = deepRose * (softCore * 1.15)
          + hotPink * (haloRing * 0.85 + ribbons * 0.9)
          + softPink * (innerRing * 0.7 + starSpark * 0.65);

        float edgeFade = smoothstep(0.99, 0.76, r);
        float alpha = clamp((softCore * 0.95 + haloRing * 0.82 + innerRing * 0.65 + ribbons * 0.85 + starSpark * 0.5) * edgeFade * uOpacity, 0.0, 0.92);
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

/** Graceful Multi-Pinion Angel Wing Geometry for Lullaby Twins. */
export function createLullabyAngelWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.28, 0.95, 1.18, 1.35);
  shape.quadraticCurveTo(1.48, 1.38, 1.32, 1.05);
  shape.lineTo(0.95, 0.88);
  shape.quadraticCurveTo(1.42, 0.88, 1.28, 0.64);
  shape.lineTo(0.86, 0.54);
  shape.quadraticCurveTo(1.26, 0.50, 1.12, 0.28);
  shape.lineTo(0.72, 0.24);
  shape.quadraticCurveTo(1.02, 0.16, 0.88, -0.04);
  shape.lineTo(0.54, 0.02);
  shape.quadraticCurveTo(0.68, -0.18, 0.46, -0.26);
  shape.quadraticCurveTo(0.22, -0.18, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.038,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.019);
  geo.computeVertexNormals();
  return geo;
}

/** Lullaby Twins Finale Shader 1: 3D Gothic Stained-Mirror Cage with Voronoi Mirror-Glass Shatter. */
export function createGothicMirrorCageShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCrack: { value: 0.0 },
      uShatter: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uCrack;
      uniform float uShatter;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        float cellHash = sin(p.y * 9.0 + p.x * 7.0 + p.z * 7.0);
        float vib = sin(uTime * 58.0 + p.y * 14.0) * 0.035 * uCrack * (1.0 - uShatter);
        p.xz += normalize(p.xz + vec2(0.001)) * (vib + uShatter * (1.25 + 0.75 * abs(cellHash)));
        p.y += uShatter * cellHash * 0.95;
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uCrack;
      uniform float uShatter;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 1.45);

        float angle = atan(vLocalPos.z, vLocalPos.x);
        float pillarRib = smoothstep(0.84, 0.97, cos(angle * 8.0));
        float archY = 2.55 - abs(sin(angle * 4.0)) * 0.65;
        float archRib = smoothstep(0.18, 0.04, abs(vLocalPos.y - archY)) + smoothstep(0.14, 0.03, abs(vLocalPos.y - 0.15));
        float frameMask = clamp(pillarRib + archRib, 0.0, 1.0);

        vec2 shardUv = vec2(angle * 2.6, vLocalPos.y * 1.45) * 2.8;
        vec2 iCell = floor(shardUv);
        vec2 fCell = fract(shardUv);
        float d1 = 8.0;
        float d2 = 8.0;
        vec2 bestId = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 h = hash2(iCell + nb);
            vec2 pt = nb + 0.5 + 0.38 * sin(h * 6.2831);
            float d = length(pt - fCell);
            if (d < d1) {
              d2 = d1;
              d1 = d;
              bestId = iCell + nb;
            } else if (d < d2) {
              d2 = d;
            }
          }
        }
        float edgeDist = d2 - d1;
        vec2 cellRnd = hash2(bestId);

        float gapThreshold = uShatter * (0.28 + 0.24 * cellRnd.x);
        if (uShatter > 0.02 && (edgeDist < gapThreshold || uShatter > 0.72 + cellRnd.y * 0.26)) {
          discard;
        }

        float mirrorSheen = smoothstep(0.45, 0.96, sin(angle * 4.0 + vLocalPos.y * 3.2 - uTime * 3.5 + cellRnd.x * 4.0));
        float crackLine = smoothstep(0.11, 0.015, edgeDist) * clamp(uCrack + uShatter * 1.4, 0.0, 1.0);

        vec3 darkGothicFrame = vec3(0.14, 0.04, 0.22);
        vec3 sakuraPinkGlass = vec3(0.92, 0.24, 0.64);
        vec3 starlightCyanGlass = vec3(0.16, 0.76, 0.96);
        vec3 mirrorWhite = vec3(0.98, 0.92, 0.99);

        vec3 glassCol = mix(sakuraPinkGlass, starlightCyanGlass, 0.5 + 0.5 * sin(angle * 2.0 + cellRnd.y * 3.14));
        glassCol = mix(glassCol * 0.45, glassCol, rim * 0.7 + mirrorSheen * 0.55);
        vec3 col = mix(glassCol, mix(darkGothicFrame, sakuraPinkGlass, 0.55), frameMask * (1.0 - uShatter * 0.8));
        col = mix(col, mirrorWhite, clamp(crackLine * 0.92 + mirrorSheen * 0.42 + uShatter * 0.35, 0.0, 1.0));

        float baseAlpha = mix(0.42 + rim * 0.34 + mirrorSheen * 0.24, 0.88, max(frameMask, crackLine));
        float alpha = clamp(baseAlpha * (1.0 - uShatter * 0.65) * uOpacity, 0.0, 0.94);
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

/** Lullaby Twins Finale Shader 2: Colossal 3D Crescent Moon Blade Shader (Sakura-Pink, Starlight-Cyan & Lunar Craters). */
export function createCrescentMoonShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCharge: { value: 0.0 },
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
      uniform float uCharge;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.45 + 0.55 * dot(N, L);
        float rim = pow(1.0 - ndv, 1.55);

        float r = length(vLocalPos.xy);
        float angle = atan(vLocalPos.y, vLocalPos.x);

        float craterWave = sin(vLocalPos.x * 4.5 + vLocalPos.y * 4.5) * cos(vLocalPos.x * 7.2 - vLocalPos.y * 6.8);
        float filigree = smoothstep(0.55, 0.95, sin(angle * 10.0 - uTime * 8.0 + r * 5.0));

        vec3 deepTwilight = vec3(0.12, 0.03, 0.22);
        vec3 neonSakura = vec3(0.86, 0.14, 0.54);
        vec3 starlightCyan = vec3(0.14, 0.68, 0.90);
        vec3 lunarRose = vec3(0.96, 0.68, 0.86);

        float grad = clamp((vLocalPos.y + 2.4) / 4.8, 0.0, 1.0);
        vec3 bodyCol = mix(neonSakura, starlightCyan, grad * 0.45);
        bodyCol = mix(deepTwilight, bodyCol, 0.35 + 0.65 * ndl);
        bodyCol = mix(bodyCol, lunarRose, clamp(rim * 0.48 + filigree * 0.28 + max(0.0, craterWave) * 0.22 + uCharge * 0.15, 0.0, 0.78));

        float alpha = clamp(0.96 * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(bodyCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** 8-Sided 3D Gothic Stained-Mirror Cage Geometry for Lullaby Twins. */
export function createGothicMirrorCageGeometry(): THREE.BufferGeometry {
  const wallGeo = new THREE.CylinderGeometry(2.65, 2.65, 2.85, 16, 8, true);
  wallGeo.translate(0, 1.45, 0);

  const roofGeo = new THREE.ConeGeometry(2.65, 1.35, 16, 4, true);
  roofGeo.translate(0, 3.55, 0);

  return mergeSimpleGeos([wallGeo, roofGeo]);
}

/** Colossal 3D Sculpted Crescent Moon Blade Geometry for Lullaby Twins. */
export function createGiantCrescentMoonGeometry(): THREE.BufferGeometry {
  const moonShape = new THREE.Shape();
  moonShape.moveTo(-0.45, 2.35);
  moonShape.quadraticCurveTo(2.15, 2.15, 2.35, 0.0);
  moonShape.quadraticCurveTo(2.15, -2.15, -0.45, -2.35);
  moonShape.quadraticCurveTo(0.95, -1.25, 0.95, 0.0);
  moonShape.quadraticCurveTo(0.95, 1.25, -0.45, 2.35);
  moonShape.closePath();

  const moonGeo = new THREE.ExtrudeGeometry(moonShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  moonGeo.translate(-0.75, 0, -0.11);
  moonGeo.computeVertexNormals();
  return moonGeo;
}

/** Clockwork Twins — Inverted Giant Clocktower Custom GLSL Shader with 4-sided Roman Clock Dials & Shatter Detonation. */
export function createClocktowerShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uEmbedProgress: { value: 0.0 },
      uExplode: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uEmbedProgress;
      uniform float uExplode;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        float tremor = sin(p.y * 16.0 + uTime * 62.0) * 0.032 * uEmbedProgress * (1.0 - uExplode);
        p.x += tremor;
        p.z -= tremor * 0.7;
        p += normal * (uExplode * 0.55 * (0.5 + 0.5 * sin(p.y * 7.0 + p.x * 9.0 + p.z * 9.0)));
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uEmbedProgress;
      uniform float uExplode;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      float sdSegment2D(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.42, 0.84, 0.52));
        float ndv = abs(dot(N, V));
        float ndl = 0.45 + 0.55 * dot(N, L);
        float rim = pow(1.0 - ndv, 1.7);

        float y = vLocalPos.y;
        float hNorm = clamp(y / 5.1, 0.0, 1.0);

        float cellNoise = abs(sin(vLocalPos.x * 8.5 + y * 6.5) * cos(vLocalPos.z * 8.5 - y * 7.5 + uTime * 12.0));
        float shatterCrack = smoothstep(0.26 * (1.0 - uExplode * 0.45), 0.02, cellNoise) * step(0.01, uExplode);
        if (uExplode > 0.14 && cellNoise > (1.10 - uExplode * 0.88)) discard;

        vec3 darkBronze = vec3(0.04, 0.03, 0.02);
        vec3 midBronze = vec3(0.16, 0.11, 0.05);
        vec3 brassGold = vec3(0.78, 0.48, 0.08);
        vec3 brightGold = vec3(0.95, 0.78, 0.25);
        vec3 chronoTeal = vec3(0.10, 0.72, 0.66);

        vec3 col = mix(darkBronze, midBronze, ndl);

        if (y < 1.72) {
          float roofSlate = 0.5 + 0.5 * sin(y * 28.0);
          float roofRibs = smoothstep(0.72, 0.96, abs(sin(vLocalPos.x * 12.0)) + abs(sin(vLocalPos.z * 12.0)));
          float tipHeat = smoothstep(0.95, -0.15, y);
          col = mix(vec3(0.03, 0.04, 0.06), vec3(0.10, 0.14, 0.18), ndl * (0.6 + 0.4 * roofSlate));
          col = mix(col, brassGold, roofRibs * 0.65);
          col = mix(col, mix(chronoTeal, brightGold, 0.5), tipHeat * 0.88);
        } else if (y <= 3.22) {
          vec2 faceUv = abs(vLocalPos.z) > abs(vLocalPos.x)
            ? vec2(vLocalPos.x, y - 2.46)
            : vec2(vLocalPos.z, y - 2.46);
          float r = length(faceUv) / 0.64;
          if (r < 1.0) {
            float ang = atan(faceUv.y, faceUv.x);
            float outerBezel = exp(-pow((r - 0.90) * 22.0, 2.0));
            float innerBezel = exp(-pow((r - 0.66) * 24.0, 2.0));
            float ticks = smoothstep(0.68, 0.95, cos(ang * 12.0)) * smoothstep(0.68, 0.74, r) * smoothstep(0.90, 0.82, r);
            float speedMult = 1.0 + uEmbedProgress * 3.5;
            float minAng = -uTime * 10.0 * speedMult;
            float hrAng = -uTime * 2.2 * speedMult + 1.1;
            float dMin = sdSegment2D(faceUv, vec2(0.0), vec2(cos(minAng), sin(minAng)) * 0.50);
            float dHr = sdSegment2D(faceUv, vec2(0.0), vec2(cos(hrAng), sin(hrAng)) * 0.34);
            float hands = smoothstep(0.042, 0.014, min(dMin, dHr));
            float hub = smoothstep(0.095, 0.035, length(faceUv));

            vec3 dialBg = mix(vec3(0.02, 0.04, 0.06), vec3(0.05, 0.10, 0.13), 1.0 - r);
            dialBg = mix(dialBg, chronoTeal, clamp(ticks * 0.9 + innerBezel * 0.75 + exp(-pow((r - 0.38) * 24.0, 2.0)) * 0.5, 0.0, 1.0));
            dialBg = mix(dialBg, brassGold, clamp(outerBezel * 0.95, 0.0, 1.0));
            dialBg = mix(dialBg, brightGold, clamp(hands + hub, 0.0, 1.0));
            col = dialBg;
          } else {
            float cornerEdge = smoothstep(0.60, 0.80, max(abs(vLocalPos.x), abs(vLocalPos.z)));
            col = mix(col, brassGold, cornerEdge * 0.58);
          }
        } else {
          float winX = min(abs(vLocalPos.x - 0.28), abs(vLocalPos.x + 0.28));
          float winZ = min(abs(vLocalPos.z - 0.28), abs(vLocalPos.z + 0.28));
          float winSlot = smoothstep(0.10, 0.035, min(winX, winZ)) * smoothstep(3.45, 3.65, y) * smoothstep(4.70, 4.50, y);
          float cornice = smoothstep(0.12, 0.02, abs(y - 3.25)) + smoothstep(0.14, 0.02, abs(y - 4.92));
          col = mix(col, chronoTeal * 0.85, winSlot * 0.85);
          col = mix(col, brassGold, clamp(cornice * 0.75, 0.0, 1.0));
        }

        float surgeWave = exp(-pow((hNorm - uEmbedProgress * 0.95) * 6.5, 2.0)) * step(0.02, uEmbedProgress);
        col = mix(col, chronoTeal, rim * 0.28);
        col = mix(col, brightGold, surgeWave * 0.38);
        col += vec3(1.0, 0.88, 0.45) * (shatterCrack * 0.95 + uExplode * 0.55);

        float alpha = clamp(uOpacity * (1.0 - uExplode * 0.78), 0.0, 1.0);
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

/** Colossal Inverted 3D Gothic Clocktower Geometry (Spire Needle at bottom y=-0.22 pointing DOWN, Clock Belfry at y=2.46). */
export function createInvertedClocktowerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const spireTip = new THREE.ConeGeometry(0.36, 1.15, 4);
  spireTip.rotateX(Math.PI);
  spireTip.rotateY(Math.PI / 4);
  spireTip.translate(0, 0.35, 0);
  parts.push(spireTip);

  const spireRoof = new THREE.ConeGeometry(1.32, 1.18, 4);
  spireRoof.rotateX(Math.PI);
  spireRoof.rotateY(Math.PI / 4);
  spireRoof.translate(0, 1.15, 0);
  parts.push(spireRoof);

  const roofEaves = new THREE.BoxGeometry(1.94, 0.14, 1.94);
  roofEaves.translate(0, 1.72, 0);
  parts.push(roofEaves);

  const corners: Array<[number, number]> = [[-0.86, -0.86], [0.86, -0.86], [-0.86, 0.86], [0.86, 0.86]];
  for (const [cx, cz] of corners) {
    const pin = new THREE.ConeGeometry(0.20, 0.82, 4);
    pin.rotateX(Math.PI);
    pin.rotateY(Math.PI / 4);
    pin.translate(cx, 1.28, cz);
    parts.push(pin);
  }

  const belfryBox = new THREE.BoxGeometry(1.54, 1.50, 1.54);
  belfryBox.translate(0, 2.46, 0);
  parts.push(belfryBox);

  const bezelFB = new THREE.CylinderGeometry(0.68, 0.68, 1.66, 20);
  bezelFB.rotateX(Math.PI / 2);
  bezelFB.translate(0, 2.46, 0);
  parts.push(bezelFB);

  const bezelLR = new THREE.CylinderGeometry(0.68, 0.68, 1.66, 20);
  bezelLR.rotateZ(Math.PI / 2);
  bezelLR.translate(0, 2.46, 0);
  parts.push(bezelLR);

  const corniceA = new THREE.BoxGeometry(1.88, 0.18, 1.88);
  corniceA.translate(0, 3.25, 0);
  parts.push(corniceA);

  const towerShaft = new THREE.BoxGeometry(1.32, 1.65, 1.32);
  towerShaft.translate(0, 4.12, 0);
  parts.push(towerShaft);

  for (const [cx, cz] of [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]] as Array<[number, number]>) {
    const col = new THREE.BoxGeometry(0.24, 1.68, 0.24);
    col.translate(cx, 4.12, cz);
    parts.push(col);
  }

  const topCrown = new THREE.BoxGeometry(1.76, 0.24, 1.76);
  topCrown.translate(0, 5.02, 0);
  parts.push(topCrown);

  return mergeSimpleGeos(parts);
}

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
        float alpha = clamp((inkBand + max(crimsonMask, goldMask) * 0.94) * edgeFade * uOpacity, 0.0, 0.95);
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
        float alpha = clamp((inkBack + iceMask * 0.95) * edgeFade * uOpacity, 0.0, 0.92);
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
        float alpha = clamp((inkBand + max(violetMask, silverMask) * 0.94) * edgeFade * uOpacity, 0.0, 0.96);
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

function mergeSimpleGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of nonIndexed) totalVerts += g.attributes.position.count;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    g.computeVertexNormals();
    positions.set(g.attributes.position.array, offset * 3);
    normals.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return out;
}
