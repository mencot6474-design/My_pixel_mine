import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const MONOLITH_COUNT = 6;
const SHARDS_PER_MONOLITH = 3;
const SHARD_COUNT = MONOLITH_COUNT * SHARDS_PER_MONOLITH;
const SHOCK_RING_COUNT = 2;
const FEATHER_COUNT = 18;
const SPARK_COUNT = 24;
const IMPACT_TIME_SEC = 0.80;
const HIT_STOP_DURATION_SEC = 0.09;

export interface AureliaNoctisFireOpts {
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts?: readonly WorldPoint3[];
  onImpact?: () => void;
}

const AURELIA_GLSL = `
  float anHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }

  float anVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(anHash21(i), anHash21(i + vec2(1.0, 0.0)), f.x),
      mix(anHash21(i + vec2(0.0, 1.0)), anHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float anFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += anVnoise(p) * a;
      p = rot * p * 2.07 + vec2(2.1, 5.3);
      a *= 0.5;
    }
    return v;
  }

  float anRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 2; i++) {
      float n = 1.0 - abs(anVnoise(p) * 2.0 - 1.0);
      v += (n * n * n) * a;
      p *= 2.18;
      a *= 0.5;
    }
    return v;
  }

  float anStarfield(vec2 p) {
    vec2 gv = fract(p) - 0.5;
    vec2 id = floor(p);
    float rnd = anHash21(id);
    float d = length(gv - (vec2(rnd, fract(rnd * 17.3)) - 0.5) * 0.55);
    return smoothstep(0.15, 0.01, d) * step(0.52, rnd);
  }
`;

function normalizeGeometryUvs(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  if (nonIndexed !== geo) geo.dispose();
  nonIndexed.computeBoundingBox();
  nonIndexed.computeVertexNormals();
  const pos = nonIndexed.attributes.position;
  const bb = nonIndexed.boundingBox!;
  const dx = Math.max(0.0001, bb.max.x - bb.min.x);
  const dy = Math.max(0.0001, bb.max.y - bb.min.y);
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) - bb.min.x) / dx;
    uvs[i * 2 + 1] = (pos.getY(i) - bb.min.y) / dy;
  }
  nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return nonIndexed;
}

function mergeUvGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepped = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (let i = 0; i < prepped.length; i++) {
    totalVerts += prepped[i].attributes.position.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  let offset = 0;
  for (let i = 0; i < prepped.length; i++) {
    const g = prepped[i];
    if (!g.attributes.normal) g.computeVertexNormals();
    const count = g.attributes.position.count;
    positions.set(g.attributes.position.array, offset * 3);
    normals.set(g.attributes.normal.array, offset * 3);
    if (g.attributes.uv) {
      uvs.set(g.attributes.uv.array, offset * 2);
    } else {
      for (let k = 0; k < count; k++) {
        uvs[(offset + k) * 2] = 0.5;
        uvs[(offset + k) * 2 + 1] = 0.5;
      }
    }
    offset += count;
    g.dispose();
  }
  for (let i = 0; i < geos.length; i++) {
    if (prepped[i] !== geos[i]) geos[i].dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return out;
}

/**
 * Back-attachment Halo Disc for Aurelia Noctis (`gilded-chain-noble`, VoidAsura/NullSingularity standard):
 * Clean AdditiveBlending golden lunar crescent corona + 4-point star flare + subtle starfield.
 */
export function createAureliaBackCrescentHaloShaderMaterial(): THREE.ShaderMaterial {
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
      ${AURELIA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        float neb = anFbm(p * 3.2 + vec2(cos(ang), sin(ang)) * (uTime * 0.6));
        float stars = anStarfield(p * 9.0 + vec2(uTime * 0.14, -uTime * 0.1));
        float ring = exp(-abs(r - 0.80) * 24.0);
        float outerMoon = smoothstep(0.84, 0.78, length(p - vec2(-0.08, 0.02)));
        float innerCut = smoothstep(0.56, 0.62, length(p - vec2(0.16, 0.08)));
        float crescent = outerMoon * innerCut;
        float star4 = exp(-abs(p.x) * 15.0) * exp(-abs(p.y) * 2.8) + exp(-abs(p.y) * 15.0) * exp(-abs(p.x) * 2.8);
        float edgeFade = 1.0 - smoothstep(0.84, 0.99, r);

        vec3 col = mix(vec3(0.42, 0.24, 0.04), vec3(1.0, 0.78, 0.22), neb * 0.7 + crescent * 0.65);
        col += vec3(1.0, 0.94, 0.68) * (ring * 1.15 + star4 * 0.95);
        col += vec3(1.0, 0.98, 0.92) * stars * 1.2;

        float alpha = clamp((neb * 0.36 + crescent * 0.52 + ring * 0.92 + star4 * 0.7 + stars) * edgeFade * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Sculpted 3D curved raven feather geometry with valid 0..1 UVs. */
export function createAureliaBackFeatherGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, -0.48);
  shape.quadraticCurveTo(0.08, -0.22, 0.14, 0.05);
  shape.lineTo(0.07, 0.11);
  shape.lineTo(0.14, 0.18);
  shape.quadraticCurveTo(0.10, 0.40, 0.02, 0.56);
  shape.quadraticCurveTo(-0.05, 0.36, -0.11, 0.07);
  shape.quadraticCurveTo(-0.09, -0.20, 0.0, -0.48);

  const vane = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
    curveSegments: 6,
  });
  vane.translate(0, 0, -0.01);
  return normalizeGeometryUvs(vane);
}

/** Clean glowing gold-rimmed obsidian raven feather shader (`AdditiveBlending` glow accent). */
export function createAureliaBackFeatherShaderMaterial(): THREE.ShaderMaterial {
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
      ${AURELIA_GLSL}

      void main() {
        float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float rim = smoothstep(0.50, 0.04, edge);
        float spine = exp(-pow((vUv.x - 0.48) * 11.0, 2.0));
        float flow = anRidged(vec2(vUv.x * 4.0, vUv.y * 5.0 - uTime * 2.4));

        vec3 baseCol = vec3(0.07, 0.05, 0.12);
        vec3 goldRim = vec3(1.0, 0.80, 0.24) * 1.45;
        vec3 ivory = vec3(1.0, 0.97, 0.86) * 1.75;

        vec3 col = mix(baseCol, goldRim, clamp(rim * 0.9 + spine * 0.55 + flow * 0.3, 0.0, 1.0));
        col = mix(col, ivory, clamp(pow(rim, 2.0) * 0.75, 0.0, 1.0));
        float alpha = clamp((0.88 + rim * 0.12) * uOpacity, 0.0, 0.98);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

/** Sculpted 3D Mini Upward Crescent Pendant suspended from 4 beveled chain links. */
export function createAureliaBackChainSpurGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const link = new THREE.TorusGeometry(0.095, 0.028, 6, 12);
    link.scale(0.75, 1.30, 1.0);
    link.rotateY(i % 2 === 0 ? 0.2 : Math.PI * 0.5 - 0.2);
    link.translate(Math.sin(i * 0.3) * 0.02, 0.52 - i * 0.22, 0);
    parts.push(normalizeGeometryUvs(link));
  }
  const scytheShape = new THREE.Shape();
  scytheShape.moveTo(-0.38, -0.10);
  scytheShape.quadraticCurveTo(0.0, -0.68, 0.38, -0.10);
  scytheShape.quadraticCurveTo(0.0, -0.42, -0.38, -0.10);
  scytheShape.closePath();

  const blade = new THREE.ExtrudeGeometry(scytheShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
    curveSegments: 10,
  });
  blade.translate(0, 0, -0.02);
  parts.push(normalizeGeometryUvs(blade));
  return mergeUvGeos(parts);
}

/** Radiant golden shader for back-attachment crescent pendant (`AdditiveBlending` Fresnel + flow). */
export function createAureliaBackChainShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalDir;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalDir = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalDir;
      varying vec3 vViewDir;
      ${AURELIA_GLSL}

      void main() {
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0), 2.0);
        float flow = anRidged(vec2(vUv.x * 4.0, vUv.y * 5.0 - uTime * 2.4));
        vec3 baseCol = mix(vec3(0.55, 0.34, 0.05), vec3(1.0, 0.80, 0.22), flow * 0.7 + 0.35);
        vec3 rimCol = vec3(1.0, 0.97, 0.84);
        vec3 col = baseCol + rimCol * (fresnel * 1.15 + flow * 0.35);
        float alpha = clamp((0.68 + fresnel * 0.32) * uOpacity, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 1: Clean Glowing Lunar-Gold Ground Warning Aura (VoidAsura/NullSingularity style). */
function createLunarFloorAuraMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      ${AURELIA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edgeMask = 1.0 - smoothstep(0.84, 0.99, r);

        float pulse = 0.86 + 0.14 * sin(uTime * 10.0);
        float outerRing = exp(-abs(r - 0.82) * 28.0);
        float innerRing = exp(-abs(r - 0.56) * 22.0) * 0.52;
        float mist = anFbm(p * 3.2 - vec2(0.0, uTime * 1.0)) * (1.0 - smoothstep(0.15, 0.88, r));
        float stars = anStarfield(p * 11.0 + vec2(uTime * 0.2, 0.0));

        vec3 col = mix(vec3(0.45, 0.26, 0.04), vec3(1.0, 0.78, 0.20), mist * 0.75 + outerRing * 0.75);
        col += vec3(1.0, 0.97, 0.86) * (pow(outerRing, 2.0) * 1.05 + stars * 1.15);
        col *= pulse;

        float reveal = smoothstep(0.0, 0.08, uProgress) * (1.0 - smoothstep(0.74, 0.99, uProgress));
        float alpha = clamp((outerRing * 0.92 + innerRing + mist * 0.36 + stars * 0.65) * edgeMask * reveal * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Element 2A: Single Giant Animated Falling Gilded Lunar-Crescent Seal (VoidAsura waffle-net physics!):
 * Carves open cleanly in mid-air -> drops with vertex wind-drag parabolic bowing ->
 * ground slam shockwave ripple & clean FBM gold-dust burn-out!
 */
function createFallingLunarHaloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDraw: { value: 0 },
      uDropVel: { value: 0 },
      uImpact: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      uniform float uDropVel;
      uniform float uImpact;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float r = clamp(length(pos.xz) / 6.75, 0.0, 1.4);
        // Wind-drag parabolic bowing while plunging
        pos.y += pow(r, 2.0) * 1.9 * uDropVel;
        // Ground-slam shockwave ripple
        pos.y += sin(r * 16.0 - uImpact * 18.0) * 0.45 * (1.0 - uImpact) * step(0.001, uImpact);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDraw;
      uniform float uDropVel;
      uniform float uImpact;
      uniform float uOpacity;
      varying vec2 vUv;
      ${AURELIA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        // Smooth radial carve-reveal sweeping outward in mid-air
        float sweep = uDraw * 1.15;
        float carveMask = smoothstep(sweep, sweep - 0.22, r);

        // Crisp Giant Golden Crescent Moon + Concentric Sacred Chain-Link Ring + 4-Point Horizon Rays
        float outerRing = exp(-abs(r - 0.84) * 30.0);
        float midRing = exp(-abs(r - 0.62) * 28.0) * 0.8;
        float chainLinks = smoothstep(0.52, 0.92, cos(ang * 24.0 - uTime * 3.0))
          * exp(-abs(r - 0.73) * 26.0);

        float moonOuter = smoothstep(0.56, 0.51, length(p - vec2(-0.08, 0.0)));
        float moonInner = smoothstep(0.36, 0.41, length(p - vec2(0.12, 0.0)));
        float crescentRim = exp(-abs(length(p - vec2(-0.08, 0.0)) - 0.53) * 32.0) * moonInner
          + exp(-abs(length(p - vec2(0.12, 0.0)) - 0.39) * 30.0) * moonOuter;
        float crescentFill = moonOuter * moonInner * 0.42;

        float rayH = exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 1.8) * 0.85;
        float rayV = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 1.8) * 0.85;

        float shimmer = 0.88 + 0.12 * sin(ang * 6.0 - uTime * 18.0);
        float flashBoost = 1.0 + uDropVel * 0.45 + uImpact * 1.15;

        float burnNoise = anFbm(vUv * 7.0 + vec2(0.0, uTime * 0.6));
        float dissolve = 1.0 - smoothstep(1.0 - uImpact * 1.25, 1.2 - uImpact * 1.25, burnNoise);

        float energy = outerRing + midRing + chainLinks * 0.85 + crescentRim * 1.15 + crescentFill + rayH + rayV;
        vec3 gold = vec3(1.0, 0.76, 0.18) * energy * 1.25;
        vec3 whiteHot = vec3(1.0, 0.98, 0.88) * (pow(outerRing, 2.0) * 1.3 + pow(crescentRim, 1.6) * 1.2 + (rayH + rayV) * 0.9);
        vec3 col = (gold + whiteHot) * shimmer * flashBoost;

        float edgeFade = 1.0 - smoothstep(0.86, 0.99, r);
        float alpha = clamp(energy * edgeFade * carveMask * dissolve * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 2B: 6 Dropping & Shattering Gilded Crescent Monolith Cards (NullSingularity 1-by-1 drop & shatter!). */
function createGildedMonolithCardMaterial(): THREE.ShaderMaterial {
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
      ${AURELIA_GLSL}

      void main() {
        vec2 edge = min(vUv, 1.0 - vUv);
        float border = 1.0 - smoothstep(0.05, 0.14, min(edge.x, edge.y));
        vec2 p = vUv * 2.0 - 1.0;
        float moon = smoothstep(0.55, 0.48, length(p - vec2(-0.08, 0.0)))
          * smoothstep(0.34, 0.42, length(p - vec2(0.14, 0.0)));
        float neb = anFbm(vUv * 4.2 + vec2(0.0, uTime * 0.5));
        float stars = anStarfield(vUv * 11.0 + vec2(uTime * 0.25, 0.0));
        float scan = 0.86 + 0.14 * sin(vUv.y * 38.0 - uTime * 8.0);

        vec3 interior = mix(vec3(0.14, 0.08, 0.02), vec3(0.88, 0.62, 0.12), neb * 0.7 + moon * 0.85) + vec3(1.0, 0.96, 0.82) * stars;
        vec3 frameCol = mix(vec3(1.0, 0.78, 0.20), vec3(1.0, 0.98, 0.86), 0.5 + 0.5 * sin(uTime * 4.0 + vUv.y * 6.0));
        vec3 col = mix(interior, frameCol * 1.35, border) * scan;
        float alpha = clamp((0.68 + border * 0.32) * uOpacity, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 2C: Twin Crossed 9m 4-Point Golden Star-Flare (NullSingularity signature centerpiece!). */
function createFourPointGoldStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edgeFade = 1.0 - smoothstep(0.65, 0.98, r);

        float pulse = 0.92 + 0.14 * sin(uTime * 16.0);
        float rayH = exp(-abs(p.y) * 20.0) * exp(-abs(p.x) * 2.1);
        float rayV = exp(-abs(p.x) * 20.0) * exp(-abs(p.y) * 2.1);
        float diagP = (p.x + p.y) * 0.7071;
        float diagQ = (p.x - p.y) * 0.7071;
        float rayDiag = (exp(-abs(diagP) * 26.0) * exp(-abs(diagQ) * 4.5) + exp(-abs(diagQ) * 26.0) * exp(-abs(diagP) * 4.5)) * 0.45;

        float core = exp(-r * 6.5);
        float haloG = exp(-abs(r - (0.24 + uProgress * 0.08)) * 18.0);
        float haloW = exp(-abs(r - (0.31 + uProgress * 0.08)) * 16.0);

        float starEnergy = (rayH + rayV + rayDiag) * pulse;
        vec3 col = vec3(1.0, 0.80, 0.22) * starEnergy * 1.4;
        col += vec3(1.0, 0.99, 0.94) * (core * 1.85 + pow(starEnergy, 2.0) * 0.9);
        col += vec3(1.0, 0.88, 0.36) * haloG * 0.95;
        col += vec3(1.0, 0.96, 0.86) * haloW * 0.75;

        float alpha = clamp((starEnergy + core * 1.2 + haloG * 0.6 + haloW * 0.5) * edgeFade * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 3: Colossal 12.0m Gilded-Moonlight Rupture Pillar (exact VoidAsura / NullSingularity beam language!). */
function createGildedRupturePillarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float flare = 1.0 + sin(uv.y * 8.0 - uTime * 11.0) * 0.18 * (1.0 - uv.y * 0.35);
        pos.xz *= flare;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      ${AURELIA_GLSL}

      void main() {
        float streak = anRidged(vec2(vUv.x * 6.0, vUv.y * 4.5 - uTime * 6.0));
        float stars = anStarfield(vec2(vUv.x * 10.0, vUv.y * 14.0 - uTime * 6.5));
        float vFade = smoothstep(0.0, 0.10, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
        vec3 col = mix(vec3(0.95, 0.66, 0.10), vec3(1.0, 0.98, 0.88), streak * 0.9 + (1.0 - vUv.y) * 0.35);
        col += vec3(1.0, 0.94, 0.52) * stars * 1.4;
        float alpha = clamp(vFade * (0.58 + streak * 0.65 + stars * 0.5) * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 4: Razor-Sharp Expanding Circular Gold-White Shockwave Ring (VoidAsura exact clarity). */
function createGildedShockRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
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
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edgeMask = 1.0 - smoothstep(0.86, 0.99, r);

        float ring = exp(-abs(r - 0.82) * 28.0);
        float trail = exp(-abs(r - 0.72) * 14.0) * 0.45;
        vec3 col = vec3(1.0, 0.76, 0.18) * (ring + trail) + vec3(1.0, 0.98, 0.90) * pow(ring, 2.0) * 1.3;

        float alpha = clamp((ring + trail) * edgeMask * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Element 5: Clean Golden Star Spark Material (VoidAsura / NullSingularity exact style). */
function createGoldStarSparkMaterial(): THREE.ShaderMaterial {
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
        vec2 p = vUv * 2.0 - 1.0;
        float core = exp(-abs(p.x) * 4.4 - abs(p.y) * 2.1);
        vec3 col = mix(vec3(1.0, 0.76, 0.18), vec3(1.0, 0.98, 0.90), core);
        float alpha = clamp(core * 1.25 * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

interface MonolithSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
}

interface ShardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  doorIndex: number;
  subIndex: number;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface FeatherSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface SparkSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface AureliaNoctisInstance {
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  impactFired: boolean;
  onImpactCallback: (() => void) | null;
  root: THREE.Group;
  floorMesh: THREE.Mesh;
  floorMat: THREE.ShaderMaterial;
  lunarHaloMesh: THREE.Mesh;
  lunarHaloMat: THREE.ShaderMaterial;
  monoliths: MonolithSlot[];
  starFlareA: THREE.Mesh;
  starFlareB: THREE.Mesh;
  starFlareMat: THREE.ShaderMaterial;
  pillarMesh: THREE.Mesh;
  pillarMat: THREE.ShaderMaterial;
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  shards: ShardSlot[];
  feathers: FeatherSlot[];
  sparks: SparkSlot[];
}

/**
 * Pooled 2.5s Sakuga 3D GLSL VFX for Aurelia Noctis (`gilded-chain-noble`, tier `novel`),
 * built to the exact clean, high-impact visual architecture of `VoidAsuraSkillVfxPool` & `NullSingularitySkillVfxPool`:
 * 1) Clean pulsing Lunar-Gold floor aura,
 * 2) Giant falling Gilded Lunar-Crescent Seal (sky carve -> wind-drag parabolic bowing -> ground ripple burn-out),
 * 3) 6 Gilded Monoliths dropping 1-by-1 & shattering 1-by-1 around Twin Crossed 9m 4-Point Gold Star-Flares,
 * 4) Colossal 12m Gilded-Moonlight Rupture Pillar + 2 Massive Circular Shock Rings + Arcing Crow Feathers & Sparks.
 */
export class AureliaNoctisSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly instances: AureliaNoctisInstance[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;

    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const lunarHaloGeo = new THREE.PlaneGeometry(13.5, 13.5, 24, 24);
    lunarHaloGeo.rotateX(-Math.PI / 2);
    const monolithGeo = new THREE.BoxGeometry(2.2, 4.0, 0.14);
    const starFlareGeo = new THREE.PlaneGeometry(9.0, 9.0);
    const pillarGeo = new THREE.CylinderGeometry(1.6, 3.0, 12.0, 20, 8, true);
    pillarGeo.translate(0, 6.0, 0);
    const shockGeo = new THREE.PlaneGeometry(1, 1);
    shockGeo.rotateX(-Math.PI / 2);
    const shardGeo = new THREE.BoxGeometry(0.95, 1.5, 0.08);
    const featherGeo = createAureliaBackFeatherGeometry();
    const sparkGeo = new THREE.PlaneGeometry(0.34, 0.88);

    this.sharedGeos.push(
      floorGeo,
      lunarHaloGeo,
      monolithGeo,
      starFlareGeo,
      pillarGeo,
      shockGeo,
      shardGeo,
      featherGeo,
      sparkGeo
    );

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createLunarFloorAuraMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = 'arbiterSealFloor';
      floorMesh.position.y = 0.06;
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const lunarHaloMat = createFallingLunarHaloMaterial();
      const lunarHaloMesh = new THREE.Mesh(lunarHaloGeo, lunarHaloMat);
      lunarHaloMesh.name = 'fallingLunarHalo';
      lunarHaloMesh.visible = false;
      root.add(lunarHaloMesh);
      this.allMats.push(lunarHaloMat);

      const monoliths: MonolithSlot[] = [];
      for (let m = 0; m < MONOLITH_COUNT; m++) {
        const angle = (m / MONOLITH_COUNT) * Math.PI * 2;
        const mat = createGildedMonolithCardMaterial();
        const mesh = new THREE.Mesh(monolithGeo, mat);
        mesh.name = 'gildedMonolith';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        monoliths.push({ mesh, mat, angle });
      }

      const starFlareMat = createFourPointGoldStarMaterial();
      const starFlareA = new THREE.Mesh(starFlareGeo, starFlareMat);
      const starFlareB = new THREE.Mesh(starFlareGeo, starFlareMat);
      starFlareA.name = 'goldStarFlare';
      starFlareB.name = 'goldStarFlare';
      starFlareA.visible = false;
      starFlareB.visible = false;
      root.add(starFlareA, starFlareB);
      this.allMats.push(starFlareMat);

      const pillarMat = createGildedRupturePillarMaterial();
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.name = 'cataclysmSpire';
      pillarMesh.visible = false;
      root.add(pillarMesh);
      this.allMats.push(pillarMat);

      const rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }> = [];
      for (let r = 0; r < SHOCK_RING_COUNT; r++) {
        const mat = createGildedShockRingMaterial();
        const mesh = new THREE.Mesh(shockGeo, mat);
        mesh.name = 'shockRingGold';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        rings.push({ mesh, mat, delay: IMPACT_TIME_SEC + r * 0.18 });
      }

      const shards: ShardSlot[] = [];
      for (let s = 0; s < SHARD_COUNT; s++) {
        const doorIndex = Math.floor(s / SHARDS_PER_MONOLITH);
        const subIndex = s % SHARDS_PER_MONOLITH;
        const mat = createGildedMonolithCardMaterial();
        const mesh = new THREE.Mesh(shardGeo, mat);
        mesh.name = 'aureliaShard';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        shards.push({
          mesh,
          mat,
          doorIndex,
          subIndex,
          angle: (doorIndex / MONOLITH_COUNT) * Math.PI * 2 + (subIndex - 1) * 0.42,
          speed: 2.6 + subIndex * 0.85 + (doorIndex % 2) * 0.45,
          ySpeed: 2.3 + (2 - subIndex) * 1.15,
        });
      }

      const feathers: FeatherSlot[] = [];
      for (let f = 0; f < FEATHER_COUNT; f++) {
        const mat = createAureliaBackFeatherShaderMaterial();
        const mesh = new THREE.Mesh(featherGeo, mat);
        mesh.name = 'ravenFeather';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        feathers.push({
          mesh,
          mat,
          angle: (f / FEATHER_COUNT) * Math.PI * 2,
          speed: 3.4 + (f % 5) * 1.05,
          ySpeed: 3.6 + (f % 4) * 1.2,
        });
      }

      const sparks: SparkSlot[] = [];
      for (let k = 0; k < SPARK_COUNT; k++) {
        const mat = createGoldStarSparkMaterial();
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.name = 'goldSpark';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        sparks.push({
          mesh,
          mat,
          angle: (k / SPARK_COUNT) * Math.PI * 2,
          speed: 3.8 + (k % 5) * 1.2,
          ySpeed: 4.2 + (k % 4) * 1.5,
        });
      }

      this.instances.push({
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        impactFired: false,
        onImpactCallback: null,
        root,
        floorMesh,
        floorMat,
        lunarHaloMesh,
        lunarHaloMat,
        monoliths,
        starFlareA,
        starFlareB,
        starFlareMat,
        pillarMesh,
        pillarMat,
        rings,
        shards,
        feathers,
        sparks,
      });
    }
  }

  public getMaterials(): THREE.ShaderMaterial[] {
    return this.allMats;
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public fire(opts: AureliaNoctisFireOpts): void {
    let inst = this.instances.find((x) => !x.active);
    if (!inst) {
      inst = this.instances.reduce((a, b) => (a.elapsed >= b.elapsed ? a : b));
    }

    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.impactFired = false;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;
    inst.floorMesh.position.set(opts.cx, opts.cy + 0.06, opts.cz);
    inst.floorMesh.scale.setScalar(14.8 * opts.areaScale);
    inst.lunarHaloMesh.visible = false;
    inst.monoliths.forEach((m) => (m.mesh.visible = false));
    inst.starFlareA.visible = false;
    inst.starFlareB.visible = false;
    inst.pillarMesh.visible = false;
    inst.pillarMesh.position.set(opts.cx, opts.cy + 0.05, opts.cz);
    inst.rings.forEach((r) => (r.mesh.visible = false));
    inst.shards.forEach((s) => (s.mesh.visible = false));
    inst.feathers.forEach((f) => (f.mesh.visible = false));
    inst.sparks.forEach((k) => (k.mesh.visible = false));
  }

  public update(dtSec: number, timeSec: number): void {
    for (let idx = 0; idx < this.instances.length; idx++) {
      const inst = this.instances[idx];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer -= dtSec;
        continue;
      }

      const dt = Math.min(0.05, Math.max(0, dtSec));
      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;

      // 1. Clean Pulsing Lunar-Gold Floor Aura
      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uOpacity.value = 1;
      inst.floorMesh.rotation.y -= dt * 0.45;

      // 2A. Giant Falling Gilded Lunar-Crescent Seal (VoidAsura falling sky-carve -> wind bowing -> ground ripple)
      if (inst.elapsed >= 0.04 && inst.elapsed < 1.24) {
        inst.lunarHaloMesh.visible = true;
        inst.lunarHaloMat.uniforms.uTime.value = timeSec;

        if (inst.elapsed < 0.34) {
          const carveT = (inst.elapsed - 0.04) / 0.30;
          const easeCarve = 1 - Math.pow(1 - carveT, 2);
          inst.lunarHaloMesh.position.set(inst.cx, inst.cy + 7.2 * as, inst.cz);
          inst.lunarHaloMesh.rotation.set(0.14, 0.25, -0.08);
          inst.lunarHaloMesh.scale.setScalar((0.85 + 0.23 * easeCarve) * as);
          inst.lunarHaloMat.uniforms.uDraw.value = carveT;
          inst.lunarHaloMat.uniforms.uDropVel.value = 0;
          inst.lunarHaloMat.uniforms.uImpact.value = 0;
          inst.lunarHaloMat.uniforms.uOpacity.value = Math.min(1, carveT * 2.5);
        } else if (inst.elapsed < IMPACT_TIME_SEC) {
          const fallT = (inst.elapsed - 0.34) / (IMPACT_TIME_SEC - 0.34);
          const easeFall = fallT * fallT * fallT;
          const yPos = inst.cy + (7.2 - 6.98 * easeFall) * as;
          const tiltScale = 1 - easeFall;
          inst.lunarHaloMesh.position.set(inst.cx, yPos, inst.cz);
          inst.lunarHaloMesh.rotation.set(0.14 * tiltScale, 0.25 + fallT * 0.4, -0.08 * tiltScale);
          inst.lunarHaloMesh.scale.setScalar(1.08 * as);
          inst.lunarHaloMat.uniforms.uDraw.value = 1;
          inst.lunarHaloMat.uniforms.uDropVel.value = Math.sin(fallT * Math.PI * 0.85);
          inst.lunarHaloMat.uniforms.uImpact.value = 0;
          inst.lunarHaloMat.uniforms.uOpacity.value = 1;
        } else {
          const impT = Math.min(1, (inst.elapsed - IMPACT_TIME_SEC) / 0.44);
          inst.lunarHaloMesh.position.set(inst.cx, inst.cy + 0.22 * as, inst.cz);
          inst.lunarHaloMesh.rotation.set(0, 0.65, 0);
          inst.lunarHaloMesh.scale.setScalar((1.08 + 0.16 * impT) * as);
          inst.lunarHaloMat.uniforms.uDraw.value = 1;
          inst.lunarHaloMat.uniforms.uDropVel.value = 0;
          inst.lunarHaloMat.uniforms.uImpact.value = impT;
          inst.lunarHaloMat.uniforms.uOpacity.value = 1 - impT * impT;
        }
      } else {
        inst.lunarHaloMesh.visible = false;
      }

      // 2B. 6 Gilded Monoliths dropping 1-by-1 & shattering 1-by-1 + Twin 9m 4-Point Gold Star-Flares
      const monoLimit = this.lowQuality ? 3 : MONOLITH_COUNT;
      const dropStepSec = this.lowQuality ? 0.055 : 0.032;
      const shatterStepSec = this.lowQuality ? 0.068 : 0.040;

      if (inst.elapsed < 0.84) {
        const beamT = Math.max(0, Math.min(1, (inst.elapsed - 0.14) / 0.65));
        const r = 4.6 * as;

        for (let m = 0; m < MONOLITH_COUNT; m++) {
          const mr = inst.monoliths[m];
          if (m >= monoLimit) {
            mr.mesh.visible = false;
            continue;
          }
          const dropDelay = m * dropStepSec;
          const localDrop = inst.elapsed - dropDelay;
          const shatterTime = 0.52 + m * shatterStepSec;
          if (localDrop < 0 || inst.elapsed >= shatterTime) {
            mr.mesh.visible = false;
            continue;
          }
          const dropT = Math.min(1, localDrop / 0.16);
          const dropEase = 1 - Math.pow(1 - dropT, 3);
          const settle = dropT > 0.78 ? Math.sin(((dropT - 0.78) / 0.22) * Math.PI) : 0;
          const crackT = Math.max(0, Math.min(1, (inst.elapsed - (shatterTime - 0.055)) / 0.055));
          const shakeOffset = crackT > 0 ? Math.sin(inst.elapsed * 95.0 + m * 3.1) * 0.14 * crackT * as : 0;

          const a = mr.angle + inst.elapsed * 0.35;
          const mx = inst.cx + Math.cos(a) * r + shakeOffset;
          const mz = inst.cz + Math.sin(a) * r;
          const my = inst.cy + (8.4 - 6.2 * dropEase) * as;

          mr.mesh.visible = true;
          mr.mesh.position.set(mx, my, mz);
          mr.mesh.lookAt(inst.cx, my, inst.cz);
          mr.mesh.scale.set((1 + 0.06 * settle + 0.08 * crackT) * as, (1 - 0.07 * settle + 0.08 * crackT) * as, as);
          mr.mat.uniforms.uTime.value = timeSec;
          mr.mat.uniforms.uOpacity.value = Math.min(1, dropT * 3.0);
        }

        const coreY = inst.cy + 2.2 * as;
        const flareScale = (0.45 + 0.85 * beamT) * as;
        const flareRotY = inst.elapsed * 1.4;
        inst.starFlareA.visible = true;
        inst.starFlareA.position.set(inst.cx, coreY, inst.cz);
        inst.starFlareA.rotation.set(0, flareRotY, 0);
        inst.starFlareA.scale.setScalar(flareScale);

        inst.starFlareB.visible = true;
        inst.starFlareB.position.set(inst.cx, coreY, inst.cz);
        inst.starFlareB.rotation.set(0, flareRotY + Math.PI * 0.5, 0);
        inst.starFlareB.scale.setScalar(flareScale);

        inst.starFlareMat.uniforms.uTime.value = timeSec;
        inst.starFlareMat.uniforms.uProgress.value = beamT;
        inst.starFlareMat.uniforms.uOpacity.value = 1;
      } else {
        inst.monoliths.forEach((m) => (m.mesh.visible = false));
        inst.starFlareA.visible = false;
        inst.starFlareB.visible = false;
      }

      // 1-by-1 Shattered Monolith Shards (NullSingularity exact choreography)
      const shardFade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);
      for (let s = 0; s < SHARD_COUNT; s++) {
        const sh = inst.shards[s];
        if (sh.doorIndex >= monoLimit || shardFade <= 0.02) {
          sh.mesh.visible = false;
          continue;
        }
        const shatterTime = 0.52 + sh.doorIndex * shatterStepSec;
        const dtShard = inst.elapsed - shatterTime;
        if (dtShard < 0) {
          sh.mesh.visible = false;
          continue;
        }
        const doorAngle = inst.monoliths[sh.doorIndex].angle + shatterTime * 0.35;
        const doorR = 4.6 * as;
        const spawnX = inst.cx + Math.cos(doorAngle) * doorR;
        const spawnZ = inst.cz + Math.sin(doorAngle) * doorR;
        const spawnY = 2.2 + (sh.subIndex - 1) * 1.1;

        const flyAngle = doorAngle + (sh.subIndex - 1) * 0.48;
        const outDist = dtShard * sh.speed * as;
        const y = Math.max(0.25, (spawnY + dtShard * sh.ySpeed - 4.0 * dtShard * dtShard) * as);

        sh.mesh.visible = true;
        sh.mesh.position.set(
          spawnX + Math.cos(flyAngle) * outDist,
          inst.cy + y,
          spawnZ + Math.sin(flyAngle) * outDist
        );
        sh.mesh.rotation.set(dtShard * 5.2 + s, dtShard * 4.4 + sh.doorIndex, dtShard * 3.1);
        sh.mesh.scale.setScalar(1.02 * shardFade * as);
        sh.mat.uniforms.uTime.value = timeSec;
        sh.mat.uniforms.uOpacity.value = shardFade;
      }

      // Hit-Stop Impact Frame (0.80s)
      if (!inst.impactFired && inst.elapsed >= IMPACT_TIME_SEC) {
        inst.impactFired = true;
        inst.hitStopTimer = HIT_STOP_DURATION_SEC;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#eab308', HIT_STOP_DURATION_SEC);
        this.hooks.onSpeedLines?.(1.0, 0.60);
        this.hooks.onFlash?.('#fef08a', 0.80);
        inst.onImpactCallback?.();
      }

      // 3-5. Finale: Colossal 12.0m Gilded-Moonlight Rupture Pillar + 2 Massive Shock Rings + Crow Feathers & Sparks
      if (uProgress >= 0.32) {
        const bt = Math.min(1, (uProgress - 0.32) / 0.18);
        const ease = 1 - Math.pow(1 - bt, 3);
        const fade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);

        inst.pillarMesh.visible = fade > 0.02;
        inst.pillarMesh.scale.set((0.85 + 0.65 * ease) * as, Math.max(0.1, ease * 1.15), (0.85 + 0.65 * ease) * as);
        inst.pillarMesh.rotation.y += dt * 4.0;
        inst.pillarMat.uniforms.uTime.value = timeSec;
        inst.pillarMat.uniforms.uProgress.value = uProgress;
        inst.pillarMat.uniforms.uOpacity.value = fade;

        for (let r = 0; r < SHOCK_RING_COUNT; r++) {
          const rg = inst.rings[r];
          const rt = (inst.elapsed - rg.delay) / 0.78;
          if (rt < 0 || rt > 1) {
            rg.mesh.visible = false;
            continue;
          }
          rg.mesh.visible = true;
          rg.mesh.position.set(inst.cx, inst.cy + 0.10 + r * 0.05, inst.cz);
          rg.mesh.scale.setScalar((4.0 + 11.2 * rt) * as);
          rg.mat.uniforms.uTime.value = timeSec;
          rg.mat.uniforms.uProgress.value = rt;
          rg.mat.uniforms.uOpacity.value = 1 - rt;
        }

        const dtBoom = Math.max(0, inst.elapsed - IMPACT_TIME_SEC);
        const featherLimit = this.lowQuality ? 8 : FEATHER_COUNT;
        for (let f = 0; f < FEATHER_COUNT; f++) {
          const fe = inst.feathers[f];
          if (f >= featherLimit || fade <= 0.02) {
            fe.mesh.visible = false;
            continue;
          }
          fe.mesh.visible = true;
          const r = dtBoom * fe.speed * as;
          const y = Math.max(0.16, 0.7 + dtBoom * fe.ySpeed - 2.1 * dtBoom * dtBoom);
          fe.mesh.position.set(inst.cx + Math.cos(fe.angle) * r, inst.cy + y, inst.cz + Math.sin(fe.angle) * r);
          fe.mesh.rotation.set(dtBoom * 3.4, -fe.angle, dtBoom * 4.2);
          fe.mesh.scale.setScalar(1.05 * fade * as);
          fe.mat.uniforms.uTime.value = timeSec;
          fe.mat.uniforms.uOpacity.value = fade;
        }

        const sparkLimit = this.lowQuality ? 10 : 18;
        for (let k = 0; k < SPARK_COUNT; k++) {
          const sp = inst.sparks[k];
          if (k >= sparkLimit || fade <= 0.02) {
            sp.mesh.visible = false;
            continue;
          }
          sp.mesh.visible = true;
          const r = dtBoom * sp.speed * as;
          const y = Math.max(0.15, 0.8 + dtBoom * sp.ySpeed - 2.3 * dtBoom * dtBoom);
          sp.mesh.position.set(inst.cx + Math.cos(sp.angle) * r, inst.cy + y, inst.cz + Math.sin(sp.angle) * r);
          sp.mesh.rotation.y = -sp.angle;
          sp.mesh.scale.setScalar(1.15 * fade * as);
          sp.mat.uniforms.uTime.value = timeSec;
          sp.mat.uniforms.uOpacity.value = fade;
        }
      }

      if (inst.elapsed >= SKILL_DURATION_SEC) {
        inst.active = false;
        inst.root.visible = false;
        inst.onImpactCallback = null;
      }
    }
  }

  /** Pushes any active instance past impact into dissolve tail when superseded by consecutive Ult. */
  public fastForwardToDissolve(): void {
    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      if (!inst.active) continue;
      inst.hitStopTimer = 0;
      inst.impactFired = true;
      inst.onImpactCallback = null;
      inst.elapsed = Math.max(inst.elapsed, 1.58);
    }
  }

  public clear(): void {
    for (let i = 0; i < this.instances.length; i++) {
      this.instances[i].active = false;
      this.instances[i].root.visible = false;
      this.instances[i].onImpactCallback = null;
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) this.allMats[i].dispose();
    for (let i = 0; i < this.sharedGeos.length; i++) this.sharedGeos[i].dispose();
  }
}
