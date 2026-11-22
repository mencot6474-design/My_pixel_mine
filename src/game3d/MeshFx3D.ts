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
  innerR = 0.44,
  outerR = 1.0,
  sweepRad = Math.PI * 1.25,
  segments = 32
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
    const widthScale = Math.pow(tipTaper, 0.5);
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
        float head = clamp(uProgress * 2.25, 0.0, 1.25);
        float tail = max(0.0, (uProgress - 0.12) * 1.38);

        float n1 = vnoise(vec2(vUv.x * 16.0 + uSeed * 7.1, vUv.y * 5.0));
        float n2 = vnoise(vec2(vUv.x * 36.0 - uProgress * 6.0, vUv.y * 12.0 + uSeed));
        float streakNoise = n1 * 0.65 + n2 * 0.35;

        float headMask = smoothstep(head, head - 0.14, vUv.x);
        float tailMask = smoothstep(tail - 0.12 + streakNoise * 0.22, tail + 0.08 + streakNoise * 0.22, vUv.x);

        float outerShape = smoothstep(0.0, 0.52, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float innerNoiseCut = smoothstep(0.16, 0.85, vUv.y + streakNoise * 0.35 - uProgress * 0.25);

        float alpha = headMask * tailMask * outerShape * innerNoiseCut * uOpacity;
        if (alpha < 0.015) discard;

        float coreBand = smoothstep(0.54, 0.86, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        float tipSpark = smoothstep(head - 0.16, head - 0.02, vUv.x) * headMask;
        float coreMix = clamp(coreBand * 0.85 + tipSpark * 0.65, 0.0, 1.0);

        vec3 col = mix(uColor * 1.18, uCoreColor * 1.65, coreMix);
        gl_FragColor = vec4(col, clamp(alpha * 1.2, 0.0, 1.0));
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
