import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const SKY_SWORD_COUNT = 10;
const RAIL_LANCE_COUNT = 3;
const ORE_FLASH_COUNT = 6;
const SHARD_PARTICLE_COUNT = 36;

const HALCYON_GLSL = `
  vec2 hcHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float hcHash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float hcVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hcHash21(i), hcHash21(i + vec2(1.0, 0.0)), f.x),
      mix(hcHash21(i + vec2(0.0, 1.0)), hcHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float hcRidged(vec2 p) {
    float v = 0.0;
    float a = 0.58;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(hcVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n * n) * a;
      freq *= 2.25;
      a *= 0.5;
    }
    return v;
  }

  vec3 hcVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hcHash22(n + g);
        o = 0.5 + 0.40 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = hcHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  float hcSdStar4(vec2 p, float r, float sharpness) {
    vec2 q = abs(p);
    return pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness) - r;
  }

  float hcSdCelestialCrest(vec2 p, float scale) {
    vec2 q = p / scale;
    float dStar = hcSdStar4(q, 0.85, 0.44);
    float dDia = (abs(q.x) + abs(q.y)) - 0.44;
    return min(dStar, dDia * 1.12);
  }
`;

/**
 * Heavy Sculpted Royal Knight Standard Spear Pole & Razor Cross-Fleur Head.
 * Pivot y = 0 at spear tip for clean supersonic pit-slam!
 */
function createBannerPoleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pole = new THREE.CylinderGeometry(0.042, 0.058, 3.85, 6);
  pole.translate(0, 1.925, 0);
  parts.push(pole);

  const spearHead = new THREE.ConeGeometry(0.22, 0.78, 4);
  spearHead.scale(0.9, 1.0, 0.34);
  spearHead.translate(0, 4.22, 0);
  parts.push(spearHead);

  for (const sx of [-1, 1]) {
    const sideWing = new THREE.ConeGeometry(0.11, 0.44, 4);
    sideWing.rotateZ(sx * -Math.PI * 0.5);
    sideWing.translate(sx * 0.26, 3.84, 0);
    parts.push(sideWing);
  }

  const crossbar = new THREE.CylinderGeometry(0.032, 0.032, 1.48, 6);
  crossbar.rotateZ(Math.PI / 2);
  crossbar.translate(0.68, 3.55, 0);
  parts.push(crossbar);

  const collarRing = new THREE.OctahedronGeometry(0.14, 0);
  collarRing.scale(0.9, 1.4, 0.55);
  collarRing.translate(0, 3.84, 0);
  parts.push(collarRing);

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Dark-Steel Paladin Excalibur Broadsword.
 * Pivot (0, 0, 0) at grip tang; blade extends along +Y up to 2.65 units.
 */
function createPaladinBroadswordGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.046, -0.62);
  bladeShape.lineTo(0.046, -0.62);
  bladeShape.lineTo(0.052, -0.05);
  bladeShape.lineTo(0.38, 0.08);
  bladeShape.lineTo(0.22, -0.04);
  bladeShape.lineTo(0.12, 0.08);
  bladeShape.lineTo(0.18, 0.26);
  bladeShape.lineTo(0.16, 2.02);
  bladeShape.lineTo(0.0, 2.65);
  bladeShape.lineTo(-0.16, 2.02);
  bladeShape.lineTo(-0.18, 0.26);
  bladeShape.lineTo(-0.12, 0.08);
  bladeShape.lineTo(-0.22, -0.04);
  bladeShape.lineTo(-0.38, 0.08);
  bladeShape.lineTo(-0.052, -0.05);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.046,
    bevelEnabled: true,
    bevelThickness: 0.024,
    bevelSize: 0.018,
    bevelSegments: 1,
  });
  bladeGeo.translate(0, 0, -0.023);
  parts.push(bladeGeo);

  const guardGem = new THREE.OctahedronGeometry(0.12, 0);
  guardGem.scale(0.9, 1.4, 0.55);
  guardGem.translate(0, 0.05, 0);
  parts.push(guardGem);

  const pommel = new THREE.OctahedronGeometry(0.10, 0);
  pommel.scale(0.9, 1.45, 0.55);
  pommel.translate(0, -0.70, 0);
  parts.push(pommel);

  return mergeSimpleGeos(parts);
}

/**
 * Towering Curved 3D Guillotine Shockwave Blade Wall (sharp vertical height + razor taper, ZERO flat pancake!).
 */
function createGuillotineCrescentGeometry(
  innerR = 0.22,
  outerR = 1.25,
  sweepRad = Math.PI * 1.18,
  segments = 40
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 4;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const taper = Math.pow(Math.sin(u * Math.PI), 0.30);
    const curInner = outerR - (outerR - innerR) * taper;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      // High kinetic wall curvature so the cleave looks colossal in 3D perspective
      const liftY = (1.0 - v) * 0.42 * taper + Math.sin(v * Math.PI) * 0.32 * taper;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = liftY;
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
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Crisp Twin-Split Knight Pennant Shader: Snaps taut in shockwave wind pressure (NO floppy cloth!).
 */
function createBannerPennantMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float free = smoothstep(0.0, 0.25, uv.x);
        // Tight supersonic wind flutter rather than mushy waving
        float whip = sin(uv.x * 16.0 - uTime * 28.0) * 0.032 * free;
        p.z += whip;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.65) / 0.35, 0.0, 1.0);
        // Razor swallow-tail cutout on right tip
        if (vUv.x > 0.62 && abs(vUv.y - 0.5) < (vUv.x - 0.62) * 1.18) discard;

        vec2 cUv = (vUv - vec2(0.36, 0.5)) * 2.15;
        float crest = smoothstep(0.025, 0.0, hcSdCelestialCrest(cUv, 0.58));
        float trim = step(min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)), 0.055);
        float energyStreak = smoothstep(0.55, 0.92, sin(vUv.x * 22.0 - uTime * 22.0));

        vec3 navyInk = vec3(0.015, 0.035, 0.14);
        vec3 royalBlue = vec3(0.06, 0.24, 0.72);
        vec3 azure = vec3(0.16, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.30);

        vec3 col = mix(navyInk, royalBlue, step(0.35, vUv.y));
        col += azure * energyStreak * 0.45 * vUv.x;
        col = mix(col, gold * 1.5, trim);
        col = mix(col, vec3(1.0, 0.99, 0.92) * 1.65, crest);

        float shard = hcHash21(floor(vUv * 12.0));
        float dissolve = step(dissolveT, shard * 0.68 + (1.0 - vUv.x) * 0.36);
        if (dissolve < 0.5) discard;
        gl_FragColor = vec4(col, 0.98);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Hard-Edged Anime Ink & Electric Paladin Steel Material (NormalBlending).
 */
function createPaladinSteelMaterial(isAzureSword = true): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uIsAzure: { value: isAzureSword ? 1.0 : 0.0 },
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
      uniform float uProgress;
      uniform float uTime;
      uniform float uIsAzure;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${HALCYON_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.66) / 0.34, 0.0, 1.0);
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.85, 0.50));
        float ndv = abs(dot(N, V));
        float cel = step(0.32, dot(N, L));
        float inkRim = step(ndv, 0.24);
        float edgeGlow = step(0.24, ndv) * step(ndv, 0.42);
        float bolt = step(0.74, hcRidged(vec2(vLocalPos.y * 5.0 - uTime * 14.0, vLocalPos.x * 7.0)));

        vec3 blackSteel = vec3(0.025, 0.045, 0.14);
        vec3 silverSteel = vec3(0.74, 0.88, 1.0);
        vec3 azure = vec3(0.14, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.28);

        vec3 col = mix(blackSteel, silverSteel, cel);
        col = mix(col, mix(gold * 1.45, azure * 1.85, uIsAzure), max(edgeGlow * 0.85, bolt));
        col = mix(col, vec3(0.01, 0.018, 0.05), inkRim * 0.92);
        col += vec3(1.0) * bolt * 0.75;

        vec3 vor = hcVoronoi(vLocalPos.xy * 5.0, 0.2);
        float dissolve = step(dissolveT, vor.z * 0.82 + 0.15);
        if (dissolve < 0.5) discard;
        gl_FragColor = vec4(col, 0.99);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * ACT 0 Shader: Cracked Lightning Fissure & Sharp Precision Rail-Gate Seal on Pit Floor.
 */
function createShockFissureFloorMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uBlastT: { value: 0.0 },
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
      uniform float uBlastT;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float snapIn = 1.0 - pow(1.0 - clamp(uProgress / 0.04, 0.0, 1.0), 4.0);
        float dissolveT = clamp((uProgress - 0.65) / 0.35, 0.0, 1.0);

        // Razor Voronoi ground cracks bursting out from Spear Slam
        vec3 vor = hcVoronoi(vec2(ang * 2.2, r * 6.0), 0.1);
        float crackLine = smoothstep(0.065, 0.015, vor.y) * smoothstep(0.96, 0.14, r);

        // Precision Orbital Rail-Gate Rings + Tick Marks
        float outerRing = step(abs(r - 0.90), 0.016);
        float midRing = step(abs(r - 0.62), 0.014);
        float ticks = step(0.82, abs(sin(ang * 12.0 + uTime * 1.8))) * step(abs(r - 0.76), 0.055);
        float cardinalCross = step(hcSdCelestialCrest(p, 0.28), 0.012);

        // Expanding Supersonic Ring Waves (triggered on Banner Slam, Excalibur Guillotine, Finale)
        float waveR = fract(uBlastT) * 0.96;
        float sonicWave = exp(-pow((r - waveR) * 28.0, 2.0)) * (1.0 - smoothstep(0.65, 1.0, waveR));

        float shardDissolve = step(dissolveT, vor.z * 0.78 + (1.0 - r) * 0.25);
        if (shardDissolve < 0.5) discard;

        vec3 inkBase = vec3(0.015, 0.032, 0.11);
        vec3 azure = vec3(0.14, 0.86, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.30);

        float inkDisc = smoothstep(0.95, 0.62, r) * 0.88;
        float highEnergy = clamp(crackLine * 1.2 + outerRing + midRing + ticks + cardinalCross + sonicWave * 1.4, 0.0, 1.5);

        vec3 col = inkBase
          + azure * (crackLine * 1.7 + sonicWave * 1.9 + outerRing * 1.1)
          + gold * (midRing * 1.4 + ticks * 1.35 + cardinalCross * 1.4)
          + vec3(1.0) * (crackLine * 0.85 + sonicWave * 0.95);

        float alpha = clamp(max(inkDisc, min(1.0, highEnergy)) * smoothstep(0.99, 0.90, r) * snapIn, 0.0, 0.97);
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
 * ACT 1 Shader: Razor-Sharp High-Contrast Thunder-Rail Beam Cleaves (Solo Leveling / HSR Lightning-Rail!).
 */
function createThunderRailLanceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
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
      uniform float uLocalT;
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
        // Snappy high-frequency stepped zigzag spine
        float tick = floor(uTime * 36.0 + uSeed);
        float jag = (hcHash21(vec2(floor(p.y * 14.0), tick)) - 0.5) * 0.34;
        float widthMask = (1.0 - smoothstep(0.0, 0.38, uLocalT)) * 0.28 + 0.07;
        float distMain = abs(p.x - jag);

        float inkOuter = smoothstep(widthMask * 1.65, widthMask * 1.25, distMain);
        float azureBody = step(distMain, widthMask * 1.15);
        float whiteRazorCore = step(distMain, widthMask * 0.42);
        // Side rail shock-fins
        float fins = step(abs(abs(p.x - jag) - widthMask * 1.85), 0.028) * step(0.55, sin(p.y * 36.0));

        float vMask = smoothstep(0.0, 0.05, p.y) * smoothstep(1.0, 0.88, p.y);
        float snapFade = 1.0 - smoothstep(0.45, 1.0, uLocalT);

        vec3 col = mix(vec3(0.015, 0.03, 0.12), vec3(0.14, 0.86, 1.0) * 1.9, azureBody);
        col = mix(col, vec3(1.0, 0.99, 0.94) * 2.1, max(whiteRazorCore, fins));

        float alpha = clamp(max(inkOuter * 0.9, max(azureBody, fins)) * vMask * snapFade, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * ACT 2 Shader: High-Contrast Guillotine Excalibur Crescent Wall (Ink border + Razor Golden-White Core + Electric Teeth!).
 */
function createGuillotineCrescentMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
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
      uniform float uLocalT;
      uniform float uTime;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        float head = 1.0 - pow(1.0 - clamp(uLocalT * 4.8, 0.0, 1.0), 4.0);
        float tail = max(0.0, (uLocalT - 0.24) * 1.35);
        float arcMask = step(vUv.x, head) * step(tail, vUv.x);

        float jag = hcRidged(vec2(vUv.x * 22.0 - uTime * 16.0, vUv.y * 6.0));
        float bladeBody = step(0.14, vUv.y + jag * 0.18) * step(vUv.y, 0.96);
        float razorEdge = step(0.72, vUv.y) * step(vUv.y, 0.96);
        float goldTrim = step(0.50, vUv.y) * step(vUv.y, 0.72);
        float inkShadow = step(0.08, vUv.y) * step(vUv.y, 0.34);

        vec3 azure = vec3(0.14, 0.88, 1.0) * 1.95;
        vec3 gold = vec3(1.0, 0.88, 0.30) * 1.95;
        vec3 whiteCore = vec3(1.0, 1.0, 0.96) * 2.25;
        vec3 inkCol = vec3(0.015, 0.03, 0.12);

        vec3 col = mix(azure, gold, goldTrim);
        col = mix(col, inkCol, inkShadow * 0.75);
        col = mix(col, whiteCore, max(razorEdge, step(0.84, jag)));

        float lifeFade = 1.0 - smoothstep(0.68, 1.0, uLocalT);
        float alpha = clamp(max(bladeBody, razorEdge) * arcMask * lifeFade, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * ACT 3 Shader: Razor Celestial 4-Point Cross Pillar & Sonic Boom Flash!
 */
function createCelestialCrossNovaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
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
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float expand = 1.0 - pow(1.0 - clamp(uLocalT * 3.8, 0.0, 1.0), 4.0);
        float ring = exp(-pow((r - mix(0.10, 0.92, expand)) * 26.0, 2.0));
        // Razor diamond blades instead of soft blurred cross
        float bladeH = step(abs(p.y), 0.11 * (1.0 - abs(p.x))) * step(abs(p.x), 0.96);
        float bladeV = step(abs(p.x), 0.11 * (1.0 - abs(p.y))) * step(abs(p.y), 0.96);
        float crest = step(hcSdCelestialCrest(p * 1.45, 0.76), 0.015);

        vec3 col = mix(vec3(0.14, 0.88, 1.0) * 1.85, vec3(1.0, 0.88, 0.30) * 1.95, ring);
        col += vec3(1.0) * max(max(bladeH, bladeV), crest) * 1.4;

        float fade = 1.0 - smoothstep(0.45, 1.0, uLocalT);
        float alpha = clamp((ring + bladeH + bladeV + crest) * smoothstep(0.99, 0.84, r) * fade, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Direct Per-Ore Razor Diamond Cross & Sonic Impact Ring Flash.
 */
function createHalcyonHitFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#fde047') },
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
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 4.5, 0.0, 1.0), 4.0);
        float ring = exp(-pow((r - mix(0.12, 0.90, pop)) * 24.0, 2.0));
        float bladeX = step(abs(p.y), 0.08 * (1.0 - abs(p.x))) * step(abs(p.x), 0.96);
        float bladeY = step(abs(p.x), 0.08 * (1.0 - abs(p.y))) * step(abs(p.y), 0.96);
        float core = step(r, 0.20 * (1.0 - uLocalT * 0.7));

        float fade = 1.0 - smoothstep(0.42, 1.0, uLocalT);
        float mask = clamp((ring + bladeX + bladeY + core) * smoothstep(0.99, 0.85, r), 0.0, 1.4);
        vec3 col = mix(uColor * 1.9, uCoreColor * 1.95, ring) + vec3(1.0) * (core + (bladeX + bladeY) * 0.75);
        float alpha = clamp(mask * fade, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 5 Shader: High-Velocity Crystal Shards & Razor Electric Sparks (NO floppy feathers!).
 */
function createRazorShardParticleMaterial(isGoldSpark: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalLife: { value: 0.0 },
      uSeed: { value: 1.0 },
      uIsGold: { value: isGoldSpark ? 1.0 : 0.0 },
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
      uniform float uLocalLife;
      uniform float uSeed;
      uniform float uIsGold;
      varying vec2 vUv;
      ${HALCYON_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        // Sharp crystal diamond shard elongated along X
        float shardD = abs(p.x) * 0.55 + abs(p.y) * 1.35 - 0.52;
        if (shardD > 0.0) discard;

        float ink = step(-0.08, shardD);
        float core = step(shardD, -0.22);

        vec3 baseCol = mix(vec3(0.14, 0.86, 1.0) * 1.75, vec3(1.0, 0.88, 0.28) * 1.8, uIsGold);
        vec3 col = mix(baseCol, vec3(0.015, 0.03, 0.12), ink * 0.88);
        col = mix(col, vec3(1.0, 0.99, 0.94) * 1.9, core);

        float fade = 1.0 - smoothstep(0.65, 1.0, uLocalLife);
        float alpha = clamp(fade, 0.0, 0.98);
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

interface RailLanceSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  fired: boolean;
  targetIndex: number;
}

interface SkySwordSlot {
  mesh: THREE.Mesh;
  delay: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  aimQuat: THREE.Quaternion;
  landed: boolean;
  targetIndex: number;
}

interface OreFlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseScale: number;
}

interface ShardParticleSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseScale: number;
}

interface HalcyonSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  bannerSlamFired: boolean;
  guillotineImpactFired: boolean;
  finaleFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  sealMesh: THREE.Mesh;
  sealMat: THREE.ShaderMaterial;
  bannerPoleMesh: THREE.Mesh;
  bannerPoleMat: THREE.ShaderMaterial;
  bannerPennantMesh: THREE.Mesh;
  bannerPennantMat: THREE.ShaderMaterial;
  railLances: RailLanceSlot[];
  skySwords: SkySwordSlot[];
  swordMat: THREE.ShaderMaterial;
  excaliburMesh: THREE.Mesh;
  crescentMesh: THREE.Mesh;
  crescentMat: THREE.ShaderMaterial;
  novaMesh: THREE.Mesh;
  novaMat: THREE.ShaderMaterial;
  oreFlashes: OreFlashSlot[];
  particles: ShardParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s High-Dopamine Sakuga Skill Pool for Halcyon Twins
 * ("Divine Rail-Judgment: Photon Thunder-Guillotine" — Zero soft drift, razor-sharp crisp beats:
 *  Act 0 (0.00s->0.14s): Supersonic Banner Spear Slam (70ms snap + floor crack fissure + micro hit-stop + camera recoil)
 *  Act 1 (0.14s->0.44s): 3 Staccato Diagonal Thunder-Rail Lances with ink-white contrast + per-ore cross-flashes
 *  Act 2 (0.44s->0.78s, Climax 0.61s): 10 Aim-Locked Orbital Broadswords + Colossal Excalibur 50ms Guillotine Slam -> 0.088s Hit-Stop + B&W Invert Impact Frame + Towering 3D Crescent Shockwave
 *  Act 3 (0.68s->1.18s, Detonate 0.94s): 10-Sword Railgun Impale Barrage -> Giant Celestial Cross Nova + Second B&W Impact Frame + 36 Razor Shrapnel Shards!).
 */
export class HalcyonTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: HalcyonSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const pennantGeo = new THREE.PlaneGeometry(1.38, 0.72, 8, 2);
    pennantGeo.translate(0.69, 0, 0);
    const bannerPoleGeo = createBannerPoleGeometry();
    const swordGeo = createPaladinBroadswordGeometry();
    const crescentGeo = createGuillotineCrescentGeometry(0.22, 1.25, Math.PI * 1.18, 40);
    this.sharedGeos.push(planeGeo, pennantGeo, bannerPoleGeo, swordGeo, crescentGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const sealMat = createShockFissureFloorMaterial();
      const sealMesh = new THREE.Mesh(planeGeo, sealMat);
      sealMesh.rotation.x = -Math.PI / 2;
      root.add(sealMesh);
      this.allMats.push(sealMat);

      const bannerPoleMat = createPaladinSteelMaterial(false);
      const bannerPoleMesh = new THREE.Mesh(bannerPoleGeo, bannerPoleMat);
      bannerPoleMesh.visible = false;
      root.add(bannerPoleMesh);

      const bannerPennantMat = createBannerPennantMaterial();
      const bannerPennantMesh = new THREE.Mesh(pennantGeo, bannerPennantMat);
      bannerPennantMesh.visible = false;
      root.add(bannerPennantMesh);
      this.allMats.push(bannerPoleMat, bannerPennantMat);

      const railLances: RailLanceSlot[] = [];
      for (let i = 0; i < RAIL_LANCE_COUNT; i++) {
        const lMat = createThunderRailLanceMaterial();
        lMat.uniforms.uSeed.value = (i + 1) * 4.3;
        const lMesh = new THREE.Mesh(planeGeo, lMat);
        lMesh.visible = false;
        root.add(lMesh);
        this.allMats.push(lMat);
        railLances.push({
          mesh: lMesh,
          mat: lMat,
          delay: 0.14 + i * 0.10,
          fired: false,
          targetIndex: i,
        });
      }

      const swordMat = createPaladinSteelMaterial(true);
      this.allMats.push(swordMat);

      const skySwords: SkySwordSlot[] = [];
      for (let i = 0; i < SKY_SWORD_COUNT; i++) {
        const sMesh = new THREE.Mesh(swordGeo, swordMat);
        sMesh.visible = false;
        root.add(sMesh);
        skySwords.push({
          mesh: sMesh,
          delay: 0.68 + i * 0.018,
          startPos: new THREE.Vector3(),
          endPos: new THREE.Vector3(),
          aimQuat: new THREE.Quaternion(),
          landed: false,
          targetIndex: i,
        });
      }

      // Colossal Guillotine Excalibur Sword
      const excaliburMesh = new THREE.Mesh(swordGeo, swordMat);
      excaliburMesh.visible = false;
      root.add(excaliburMesh);

      const crescentMat = createGuillotineCrescentMaterial();
      const crescentMesh = new THREE.Mesh(crescentGeo, crescentMat);
      crescentMesh.visible = false;
      root.add(crescentMesh);
      this.allMats.push(crescentMat);

      const novaMat = createCelestialCrossNovaMaterial();
      const novaMesh = new THREE.Mesh(planeGeo, novaMat);
      novaMesh.visible = false;
      root.add(novaMesh);
      this.allMats.push(novaMat);

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createHalcyonHitFlashMaterial();
        const fMesh = new THREE.Mesh(planeGeo, fMat);
        fMesh.rotation.set(-0.55, 0, 0);
        fMesh.visible = false;
        root.add(fMesh);
        this.allMats.push(fMat);
        oreFlashes.push({
          mesh: fMesh,
          mat: fMat,
          active: false,
          age: 0,
          life: 0.22,
          baseScale: 3.6,
        });
      }

      const particles: ShardParticleSlot[] = [];
      for (let i = 0; i < SHARD_PARTICLE_COUNT; i++) {
        const isGold = i % 3 === 0;
        const pMat = createRazorShardParticleMaterial(isGold);
        pMat.uniforms.uSeed.value = (i + 1) * 1.91;
        const pMesh = new THREE.Mesh(planeGeo, pMat);
        pMesh.visible = false;
        root.add(pMesh);
        this.allMats.push(pMat);
        particles.push({
          mesh: pMesh,
          mat: pMat,
          active: false,
          age: 0,
          life: 0.48,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 0.56,
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        bannerSlamFired: false,
        guillotineImpactFired: false,
        finaleFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        sealMesh,
        sealMat,
        bannerPoleMesh,
        bannerPoleMat,
        bannerPennantMesh,
        bannerPennantMat,
        railLances,
        skySwords,
        swordMat,
        excaliburMesh,
        crescentMesh,
        crescentMat,
        novaMesh,
        novaMat,
        oreFlashes,
        particles,
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

  private triggerOreFlash(inst: HalcyonSkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isAzure: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.22;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.95, pt.z + 0.16);
    f.mesh.scale.setScalar(scale * 0.5);
    f.mat.uniforms.uColor.value.set(isAzure ? '#38bdf8' : '#2dd4bf');
    f.mat.uniforms.uCoreColor.value.set('#fde047');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchShardBurst(inst: HalcyonSkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.particles.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.particles[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.36 + ((i * 19) % 10) * 0.025;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.08;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 3) * 0.31;
      const spd = (8.5 + ((i * 29) % 10) * 0.95) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (4.8 + ((i * 23) % 10) * 0.72) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseScale = (0.62 + (i % 3) * 0.22) * Math.max(0.75, inst.areaScale);
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
    inst.bannerSlamFired = false;
    inst.guillotineImpactFired = false;
    inst.finaleFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    inst.sealMesh.position.set(opts.cx, opts.cy + 0.08, opts.cz);
    inst.sealMesh.scale.setScalar(12.6 * opts.areaScale);
    inst.sealMat.uniforms.uProgress.value = 0;
    inst.sealMat.uniforms.uBlastT.value = 0;

    // Banner Spear positioned high for immediate 70ms Supersonic Pit-Slam
    const bannerS = 1.42 * Math.max(0.75, opts.areaScale);
    inst.bannerPoleMesh.position.set(opts.cx, opts.cy + 8.5, opts.cz - 0.9 * opts.areaScale);
    inst.bannerPoleMesh.rotation.set(0.05, 0, -0.04);
    inst.bannerPoleMesh.scale.setScalar(bannerS);
    inst.bannerPoleMesh.visible = true;

    inst.bannerPennantMesh.position.set(opts.cx, opts.cy + 8.5 + 3.12 * bannerS, opts.cz - 0.9 * opts.areaScale);
    inst.bannerPennantMesh.rotation.set(0.05, 0.18, -0.04);
    inst.bannerPennantMesh.scale.setScalar(bannerS);
    inst.bannerPennantMesh.visible = true;

    // 3 Diagonal Thunder-Rail Beam Lances
    const lanceLimit = this.lowQuality ? 2 : RAIL_LANCE_COUNT;
    const angles = [-0.58, 0.62, -0.22];
    for (let i = 0; i < inst.railLances.length; i++) {
      const lb = inst.railLances[i];
      lb.fired = false;
      if (i >= lanceLimit) {
        lb.mesh.visible = false;
        continue;
      }
      const tgt = inst.pts[i % inst.pts.length];
      lb.targetIndex = i % inst.pts.length;
      lb.delay = 0.14 + i * 0.10;
      lb.mesh.position.set(tgt.x, tgt.y + 3.4, tgt.z + 0.12);
      lb.mesh.rotation.set(-0.24, (i - 1) * 0.28, angles[i % angles.length]);
      lb.mesh.scale.set(2.35 * opts.areaScale, 8.8, 1);
      lb.mesh.visible = false;
      lb.mat.uniforms.uLocalT.value = 0;
    }

    // 10 Aim-Locked Orbital Knight Broadswords aiming aggressively at ores
    const swordLimit = this.lowQuality ? 5 : SKY_SWORD_COUNT;
    for (let i = 0; i < inst.skySwords.length; i++) {
      const sw = inst.skySwords[i];
      sw.landed = false;
      if (i >= swordLimit) {
        sw.mesh.visible = false;
        continue;
      }
      const arcFrac = swordLimit > 1 ? i / (swordLimit - 1) - 0.5 : 0;
      const sx = opts.cx + arcFrac * 7.8 * opts.areaScale;
      const sy = opts.cy + 4.8 + (1.0 - Math.abs(arcFrac) * 1.6) * 1.45;
      const sz = opts.cz - 1.55 * opts.areaScale;
      const tgt = inst.pts[i % inst.pts.length];
      sw.targetIndex = i % inst.pts.length;
      sw.delay = 0.68 + i * 0.018;
      sw.startPos.set(sx, sy, sz);
      sw.endPos.set(tgt.x, tgt.y + 0.08, tgt.z);

      // Compute exact directional quaternion so sword +Y tip aims straight at target!
      this.tmpDir.subVectors(sw.endPos, sw.startPos).normalize();
      sw.aimQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);
      sw.mesh.position.copy(sw.startPos);
      sw.mesh.quaternion.copy(sw.aimQuat);
      sw.mesh.scale.setScalar(1.22 * Math.max(0.75, opts.areaScale));
      sw.mesh.visible = false;
    }

    // Colossal Excalibur Greatsword + Towering 3D Guillotine Crescent Wall
    inst.excaliburMesh.position.set(opts.cx, opts.cy + 7.2, opts.cz + 0.15);
    inst.excaliburMesh.rotation.set(0, 0, Math.PI + 0.18);
    inst.excaliburMesh.scale.setScalar(3.55 * Math.max(0.75, opts.areaScale));
    inst.excaliburMesh.visible = false;

    inst.crescentMesh.position.set(opts.cx, opts.cy + 0.85, opts.cz);
    inst.crescentMesh.rotation.set(0.46, -Math.PI * 0.5, 0.24);
    inst.crescentMesh.scale.setScalar(0.01);
    inst.crescentMesh.visible = false;

    inst.novaMesh.position.set(opts.cx, opts.cy + 1.15, opts.cz + 0.2);
    inst.novaMesh.rotation.set(-0.38, 0, 0);
    inst.novaMesh.scale.setScalar(0.01);
    inst.novaMesh.visible = false;

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    for (let i = 0; i < inst.particles.length; i++) {
      inst.particles[i].active = false;
      inst.particles[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.84, '#020817', 1.35);
    this.hooks.onSpeedLines?.(1.0, 0.55);
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

      inst.sealMat.uniforms.uProgress.value = uProgress;
      inst.sealMat.uniforms.uTime.value = timeSec;
      inst.sealMesh.rotation.z = timeSec * 0.52;

      // ACT 0 (0.00s -> 0.07s): 70ms Supersonic Banner Spear Slam into Ground!
      const slamT = Math.min(1, inst.elapsed / 0.07);
      const slamSnap = slamT * slamT * slamT;
      const bannerS = 1.42 * Math.max(0.75, as);
      const bannerY = THREE.MathUtils.lerp(inst.cy + 8.5, inst.cy - 0.12, slamSnap);
      inst.bannerPoleMesh.position.set(inst.cx, bannerY, inst.cz - 0.9 * as);
      inst.bannerPennantMesh.position.set(inst.cx, bannerY + 3.12 * bannerS, inst.cz - 0.9 * as);
      inst.bannerPoleMat.uniforms.uProgress.value = uProgress;
      inst.bannerPoleMat.uniforms.uTime.value = timeSec;
      inst.bannerPennantMat.uniforms.uProgress.value = uProgress;
      inst.bannerPennantMat.uniforms.uTime.value = timeSec;

      if (!inst.bannerSlamFired && inst.elapsed >= 0.07) {
        inst.bannerSlamFired = true;
        inst.hitStopTimer = 0.028;
        this.hooks.onImpactFrame?.(0.85, 0.0, '#38bdf8', 0.036);
        this.hooks.onCameraPush?.(-0.22, -0.025);
        this.hooks.onFlash?.('#e0f2fe', 0.45);
        this.tmpTargetPos.set(inst.cx, inst.cy + 0.6, inst.cz - 0.9 * as);
        this.launchShardBurst(inst, this.tmpTargetPos, 0, 6, 0.95);
      }

      // Pulse Shockwave Ring Timer across Acts
      if (inst.elapsed >= 0.07 && inst.elapsed < 0.58) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.07) / 0.42);
      } else if (inst.elapsed >= 0.61 && inst.elapsed < 0.94) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.61) / 0.30);
      } else if (inst.elapsed >= 0.94) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.94) / 0.35);
      }

      // ACT 1 (0.14s -> 0.44s): 3 Staccato Diagonal Thunder-Rail Lances
      const lanceLimit = this.lowQuality ? 2 : RAIL_LANCE_COUNT;
      for (let i = 0; i < lanceLimit; i++) {
        const lb = inst.railLances[i];
        if (inst.elapsed < lb.delay) continue;
        lb.mesh.visible = true;
        if (!lb.fired) {
          lb.fired = true;
          const pt = inst.pts[lb.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.8 * as, true);
          this.tmpTargetPos.set(pt.x, pt.y + 0.9, pt.z);
          this.launchShardBurst(inst, this.tmpTargetPos, 6 + i * 2, 2, 1.05);
          this.hooks.onCameraPush?.(0.14, 0.022);
          inst.onSlashBeatCallback?.(i, pt);
        }
        const lt = Math.min(1, (inst.elapsed - lb.delay) / 0.18);
        lb.mat.uniforms.uLocalT.value = lt;
        lb.mat.uniforms.uTime.value = timeSec;
        if (lt >= 1) lb.mesh.visible = false;
      }

      // ACT 2 (0.42s -> 0.92s): Orbital Aim-Lock + Colossal Excalibur 50ms Guillotine Slam -> 0.088s Hit-Stop & Crescent!
      inst.swordMat.uniforms.uProgress.value = uProgress;
      inst.swordMat.uniforms.uTime.value = timeSec;

      if (inst.elapsed >= 0.42 && inst.elapsed < 1.15) {
        inst.excaliburMesh.visible = true;
        if (inst.elapsed < 0.56) {
          // Anticipation coil: pulls UP sharply and trembles with raw tension!
          const coilT = (inst.elapsed - 0.42) / 0.14;
          const coilY = THREE.MathUtils.lerp(inst.cy + 6.4, inst.cy + 9.4, 1 - Math.pow(1 - coilT, 3));
          const tremor = Math.sin(timeSec * 85.0) * 0.08 * coilT;
          inst.excaliburMesh.position.set(inst.cx + tremor, coilY, inst.cz + 0.15);
          inst.excaliburMesh.rotation.set(0.12, 0, Math.PI + 0.16);
        } else if (inst.elapsed < 0.61) {
          // 50ms SUPERSONIC GUILLOTINE SLAM STRAIGHT INTO THE PIT!
          const dropT = (inst.elapsed - 0.56) / 0.05;
          const slamEase = dropT * dropT * dropT;
          const slamY = THREE.MathUtils.lerp(inst.cy + 9.4, inst.cy + 2.3, slamEase);
          inst.excaliburMesh.position.set(inst.cx, slamY, inst.cz + 0.15);
          inst.excaliburMesh.rotation.set(0.18, 0, Math.PI + 0.08);
        } else {
          // Embedded violently in impact posture until dissolve!
          inst.excaliburMesh.position.set(inst.cx, inst.cy + 2.3, inst.cz + 0.15);
          inst.excaliburMesh.rotation.set(0.18, 0, Math.PI + 0.08);
        }
      } else {
        inst.excaliburMesh.visible = false;
      }

      if (inst.elapsed >= 0.59 && inst.elapsed < 0.94) {
        const wt = Math.min(1, (inst.elapsed - 0.59) / 0.28);
        const wEase = 1 - Math.pow(1 - wt, 4);
        inst.crescentMesh.visible = true;
        inst.crescentMesh.scale.setScalar((2.4 + 6.8 * wEase) * as);
        inst.crescentMesh.rotation.y = THREE.MathUtils.lerp(-2.2, -0.85, wEase);
        inst.crescentMat.uniforms.uLocalT.value = wt;
        inst.crescentMat.uniforms.uTime.value = timeSec;
      } else {
        inst.crescentMesh.visible = false;
      }

      // Climax Guillotine Impact (0.61s): LONG 0.088s Hit-Stop + B&W Inverted Sakuga Impact Frame!
      if (!inst.guillotineImpactFired && inst.elapsed >= 0.61) {
        inst.guillotineImpactFired = true;
        inst.hitStopTimer = 0.088;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.15, inst.cz);
        this.launchShardBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 8 : 16, 1.55);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ffffff', 0.092);
        this.hooks.onSpeedLines?.(1.0, 0.65);
        this.hooks.onCameraPush?.(0.46, 0.068);
        this.hooks.onFlash?.('#38bdf8', 0.90);
        inst.onImpactCallback?.();
      }

      // 10 Aim-Locked Orbital Knight Broadswords -> Machine-Gun Rail Impale!
      const swordLimit = this.lowQuality ? 5 : SKY_SWORD_COUNT;
      for (let i = 0; i < swordLimit; i++) {
        const sw = inst.skySwords[i];
        if (inst.elapsed >= 0.44 && inst.elapsed < sw.delay) {
          sw.mesh.visible = true;
          sw.mesh.position.copy(sw.startPos);
          // Tense jitter while locked onto ore before firing
          sw.mesh.position.y += Math.sin(timeSec * 65.0 + i * 2.1) * 0.045;
          continue;
        }
        if (inst.elapsed < sw.delay) {
          sw.mesh.visible = false;
          continue;
        }
        sw.mesh.visible = true;
        const pt = Math.min(1, (inst.elapsed - sw.delay) / 0.075);
        const railEase = pt * pt * pt;
        sw.mesh.position.lerpVectors(sw.startPos, sw.endPos, railEase);
        if (pt >= 1 && !sw.landed) {
          sw.landed = true;
          const targetPt = inst.pts[sw.targetIndex];
          this.triggerOreFlash(inst, i % ORE_FLASH_COUNT, targetPt, 3.2 * as, i % 2 === 0);
        }
      }

      // ACT 3 (0.94s -> 1.24s): Celestial Cross Nova + Second Inverted Impact Frame!
      if (!inst.finaleFired && inst.elapsed >= 0.94) {
        inst.finaleFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.2, inst.cz);
        this.launchShardBurst(inst, this.tmpTargetPos, 28, this.lowQuality ? 4 : 8, 1.48);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 4.2 * as, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.96, 1.0, '#38bdf8', 0.058);
        this.hooks.onCameraPush?.(0.32, 0.048);
        this.hooks.onFlash?.('#fde047', 0.85);
        this.hooks.onSpeedLines?.(1.0, 0.45);
        inst.onImpactCallback?.();
      }

      if (inst.elapsed >= 0.94 && inst.elapsed < 1.26) {
        const nt = Math.min(1, (inst.elapsed - 0.94) / 0.30);
        const nPop = 1 - Math.pow(1 - nt, 4);
        inst.novaMesh.visible = true;
        inst.novaMesh.scale.setScalar((3.5 + 8.5 * nPop) * as);
        inst.novaMat.uniforms.uLocalT.value = nt;
      } else {
        inst.novaMesh.visible = false;
      }

      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 3.2), 4);
        f.mesh.scale.setScalar(f.baseScale * (0.5 + 0.75 * pop));
        f.mat.uniforms.uProgress.value = uProgress;
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      for (let i = 0; i < inst.particles.length; i++) {
        const sp = inst.particles[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 14.5 * dt;
        sp.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.22;
        }
        sp.mesh.position.copy(sp.pos);
        // Stretch razor shard cleanly along its velocity vector!
        const speedMag = Math.min(2.2, 0.8 + sp.vel.length() * 0.10);
        sp.mesh.scale.set(sp.baseScale * speedMag, sp.baseScale * 0.32, 1);
        sp.mesh.rotation.set(0, Math.atan2(-sp.vel.z, sp.vel.x), Math.atan2(sp.vel.y, Math.hypot(sp.vel.x, sp.vel.z)));
        sp.mat.uniforms.uProgress.value = uProgress;
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
      this.instances[i].onSlashBeatCallback = null;
      this.instances[i].onImpactCallback = null;
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
