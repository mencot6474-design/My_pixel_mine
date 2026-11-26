import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import { createAbyssalGreatswordGeometry } from '../MeshFx3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const CRESCENT_COUNT = 4;

const OBSIDIAN_NOISE_GLSL = `
  float osHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float osVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = osHash21(i);
    float b = osHash21(i + vec2(1.0, 0.0));
    float c = osHash21(i + vec2(0.0, 1.0));
    float d = osHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float osFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += a * osVnoise(p);
      p = rot * p * 2.05 + vec2(2.1, 7.4);
      a *= 0.5;
    }
    return v;
  }
  float osRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float freq = 1.0;
    for (int i = 0; i < 2; i++) {
      float n = osVnoise(p * freq) * 2.0 - 1.0;
      n = 1.0 - abs(n);
      v += (n * n * n) * a;
      freq *= 2.12;
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * Thick sculpted Getsuga-style crescent moon blade-wave geometry with arched camber.
 */
function createObsidianGetsugaWaveGeometry(
  innerR = 0.28,
  outerR = 1.05,
  sweepRad = Math.PI * 1.15,
  segments = 36
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 4;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    const widthScale = Math.pow(Math.sin(u * Math.PI), 0.52);
    const curInner = outerR - (outerR - innerR) * widthScale;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const camber = Math.sin(v * Math.PI) * 0.14 * widthScale;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = camber;
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
 * Layer 1 Shader: Polar Inward Black-Flame Abyssal Vortex (0.0-0.2) ->
 * Eclipse Shockwave Explosion (0.2-0.5) -> Domain-Warped Ash Dissolve (0.5-1.0).
 */
function createObsidianAbyssalVortexRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${OBSIDIAN_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float charge = smoothstep(0.0, 0.2, uProgress);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        // Polar coordinate inward vortex during charge, snapping into eclipse shockwave on slam
        float swirl = ang + 2.6 / (r + 0.18) - uTime * 3.8;
        vec2 warp = vec2(osFbm(vec2(swirl, r * 3.5)), osFbm(vec2(swirl + 3.1, r * 4.2)));
        float ashFbm = osFbm(vec2(swirl * 1.4, r * 4.0) + warp * 1.3);

        // Carved cel black-flame hollows bordered by razor silver-violet arcs
        float flameTongue = smoothstep(0.44, 0.68, ashFbm) * (1.0 - smoothstep(0.72, 0.88, ashFbm));
        float shockR = uProgress < 0.34 ? mix(0.88, 0.20, clamp(uProgress / 0.34, 0.0, 1.0)) : mix(0.22, 0.95, clamp((uProgress - 0.34) / 0.24, 0.0, 1.0));
        float shockRing = exp(-pow((r - shockR) * 20.0, 2.0));

        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, ashFbm + shockRing * 0.25);

        vec3 violet = uColor * (1.35 + strike * 0.75);
        vec3 magentaRim = vec3(0.91, 0.47, 0.98) * 1.45;
        vec3 silverWhite = uCoreColor * 1.6;

        vec3 col = mix(violet, magentaRim, flameTongue);
        col = mix(col, silverWhite, clamp(shockRing * 0.88 + pow(flameTongue, 2.0) * 0.65, 0.0, 1.0));

        float radialFade = smoothstep(0.99, 0.76, r) * smoothstep(0.06, 0.20, r);
        float alpha = clamp((flameTongue * 0.85 + shockRing * 1.05) * radialFade * charge * dissolve, 0.0, 1.0);
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
 * Layer 2 Shader: Getsuga Black-Flame Crescent Wave with carved negative cel-flame voids,
 * ridged white-lightning edge crackling, and domain-warped ash dissolve.
 */
function createObsidianGetsugaCrescentMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 1.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
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
      uniform float uSeed;
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${OBSIDIAN_NOISE_GLSL}

      void main() {
        float charge = smoothstep(0.0, 0.2, uProgress);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        float sweep = 1.0 - pow(1.0 - clamp(uLocalT * 2.1, 0.0, 1.0), 3.0);
        float headMask = smoothstep(sweep + 0.14, sweep - 0.05, vUv.x);

        vec2 warpedUv = vec2(vUv.x * 7.0 + uSeed, vUv.y * 5.0 - uTime * 4.5);
        float warp = osFbm(warpedUv);
        float ridged = osRidged(warpedUv + warp * 1.1);

        // Carved black-flame inner void + razor bright silver-violet Getsuga blade edge
        float outerArc = smoothstep(0.02, 0.26, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float carvedHollow = smoothstep(0.32, 0.58, vUv.y) * (1.0 - smoothstep(0.58, 0.80, vUv.y)) * step(0.45, warp);
        float razorSilver = smoothstep(0.66, 0.94, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
        float lightningCrack = smoothstep(0.76, 0.90, ridged);

        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, warp * (0.4 + 0.6 * vUv.y));
        float alpha = headMask * outerArc * (1.0 - carvedHollow * 0.72) * charge * dissolve;
        if (alpha < 0.02) discard;

        vec3 abyssViolet = mix(uColor * (1.35 + strike * 0.65), vec3(0.91, 0.47, 0.98) * 1.5, warp);
        vec3 col = mix(abyssViolet, uCoreColor * 1.65, clamp(razorSilver * 0.92 + lightningCrack * 0.75, 0.0, 1.0));
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
 * Layer 3 Shader: Colossal Plunging Abyssal Greatsword with branching white-lightning veins
 * and 3-phase ash dissolve.
 */
function createObsidianCataclysmSwordMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${OBSIDIAN_NOISE_GLSL}

      void main() {
        float charge = smoothstep(0.0, 0.2, uProgress);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);

        float zigMain = 0.025 * sin(vLocalPos.y * 12.0) + 0.012 * cos(vLocalPos.y * 28.0);
        float vein = smoothstep(0.024, 0.004, abs(vLocalPos.x - zigMain));
        float ashN = osFbm(vLocalPos.xy * 4.5 - vec2(0.0, uTime * 2.4));
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, ashN + rim * 0.25);

        vec3 violetRim = uColor * (1.3 + strike * 0.7);
        vec3 whiteLightning = uCoreColor * 1.7;
        vec3 col = mix(violetRim, whiteLightning, clamp(vein * 0.92 + pow(rim, 2.0) * 0.82, 0.0, 1.0));

        float alpha = clamp((0.45 + rim * 0.72 + vein * 0.55) * charge * dissolve, 0.0, 1.0);
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
 * Sculpted 14-Blade Jagged Abyssal Crater Shock-Crown Geometry replacing rounded domes
 * with ferocious angled Destined-Death obsidian energy blades bursting outward from impact.
 */
function createObsidianJaggedShockCrownGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const isMajor = i % 2 === 0;
    const len = isMajor ? 2.45 : 1.65;
    const tilt = isMajor ? -0.78 : -1.04;
    const blade = new THREE.ConeGeometry(isMajor ? 0.22 : 0.14, len, 4);
    blade.scale(0.55, 1.0, 0.28);
    blade.translate(0, len * 0.48, 0);
    blade.rotateZ(tilt);
    blade.rotateY(ang);
    blade.translate(Math.cos(ang) * 0.65, 0.02, Math.sin(ang) * 0.65);
    parts.push(blade);
  }
  return mergeSimpleGeos(parts);
}

/**
 * Layer 4 Shader: Towering Vertex-Warped Black-Flame & White-Lightning Cataclysm Spire
 * + Jagged Crater Shock-Crown (zero rounded dome).
 */
function createObsidianBlackFlamePillarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#a855f7') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float flare = 0.62 + 0.55 * pow(uv.y, 1.4) + 0.16 * sin(uv.y * 9.0 - uTime * 8.0);
        transformed.xz *= flare;
        vec4 mvPos = modelViewMatrix * vec4(transformed, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${OBSIDIAN_NOISE_GLSL}

      void main() {
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.2) / 0.3, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);
        if (uProgress < 0.32) discard;

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.55);

        vec2 flameUv = vec2(vUv.x * 8.0, vUv.y * 4.0 - uTime * 3.8);
        vec2 warp = vec2(osFbm(flameUv), osFbm(flameUv + vec2(3.7, 1.4)));
        float n = osFbm(flameUv + warp * 1.35);
        float ridged = osRidged(flameUv * 1.4 + warp);

        // Carved dark-flame hollows + blazing silver-violet lightning ribs
        float flameBand = smoothstep(0.36, 0.52, n) * (1.0 - smoothstep(0.66, 0.84, n) * 0.65);
        float bolt = smoothstep(0.74, 0.89, ridged);
        float vMask = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, n * (0.45 + 0.55 * (1.0 - vUv.y)));

        vec3 violetFlame = mix(uColor * (1.45 + strike * 0.7), vec3(0.91, 0.47, 0.98) * 1.55, fresnel);
        vec3 col = mix(violetFlame, uCoreColor * 1.75, clamp(bolt * 0.92 + fresnel * 0.55, 0.0, 1.0));

        float alpha = clamp((flameBand * 0.82 + bolt * 0.9 + fresnel * 0.38) * vMask * dissolve, 0.0, 1.0);
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
 * Layer 5 Shader: Flat Horizontal Jagged Mach-Blast Ring (sawtooth Destined-Death shockwave
 * erupting across the arena floor on greatsword slam — zero round dome).
 */
function createObsidianMachBlastRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#e879f9') },
      uCoreColor: { value: new THREE.Color('#f8fafc') },
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
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${OBSIDIAN_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || uProgress < 0.33) discard;
        float ang = atan(p.y, p.x);

        float boomT = clamp((uProgress - 0.33) / 0.22, 0.0, 1.0);
        float boomEase = 1.0 - pow(1.0 - boomT, 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        float jaggedTooth = 0.16 * pow(abs(cos(ang * 7.0 - uTime * 2.5)), 5.0)
          + 0.09 * pow(abs(sin(ang * 14.0 + uTime * 3.0)), 4.0);
        float blastR = mix(0.14, 0.84, boomEase) + jaggedTooth * boomEase;

        float outerRing = exp(-pow((r - blastR) * 18.0, 2.0));
        float innerRing = exp(-pow((r - blastR * 0.65) * 22.0, 2.0)) * (1.0 - boomEase * 0.55);
        float rays = pow(max(0.0, cos(ang * 14.0 + uTime * 1.5)), 16.0)
          * smoothstep(blastR + 0.12, blastR * 0.35, r) * smoothstep(0.10, 0.30, r);

        float ashN = osFbm(vec2(ang * 3.0, r * 6.0 - uTime * 3.2));
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, ashN + outerRing * 0.25);

        vec3 col = mix(uColor * 1.55, uCoreColor * 1.75, clamp(outerRing * 0.8 + rays * 0.7, 0.0, 1.0));
        float alpha = clamp((outerRing + innerRing * 0.75 + rays * 0.85) * smoothstep(0.99, 0.84, r) * dissolve, 0.0, 1.0);
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

interface ObsidianCrescentSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  baseScale: number;
  spinSpeed: number;
}

interface ObsidianSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  vortexMesh: THREE.Mesh;
  vortexMat: THREE.ShaderMaterial;
  crescents: ObsidianCrescentSlot[];
  swordMesh: THREE.Mesh;
  swordMat: THREE.ShaderMaterial;
  pillarMesh: THREE.Mesh;
  pillarMat: THREE.ShaderMaterial;
  crownMesh: THREE.Mesh;
  machMesh: THREE.Mesh;
  machMat: THREE.ShaderMaterial;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Obsidian Sovereign
 * ("Abyssal Eclipse: Black-Flame Greatsword Cataclysm").
 */
export class ObsidianSovereignSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: ObsidianSkillInstance[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const waveGeo = createObsidianGetsugaWaveGeometry(0.28, 1.05, Math.PI * 1.18, 36);
    const swordGeo = createAbyssalGreatswordGeometry();
    const pillarGeo = new THREE.CylinderGeometry(0.95, 1.15, 8.6, 24, 10, true);
    pillarGeo.translate(0, 4.3, 0);
    const crownGeo = createObsidianJaggedShockCrownGeometry();
    this.sharedGeos.push(planeGeo, waveGeo, swordGeo, pillarGeo, crownGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const vortexMat = createObsidianAbyssalVortexRingMaterial();
      const vortexMesh = new THREE.Mesh(planeGeo, vortexMat);
      vortexMesh.rotation.x = -Math.PI / 2;
      root.add(vortexMesh);
      this.allMats.push(vortexMat);

      const crescents: ObsidianCrescentSlot[] = [];
      for (let i = 0; i < CRESCENT_COUNT; i++) {
        const mat = createObsidianGetsugaCrescentMaterial();
        mat.uniforms.uSeed.value = (i + 1) * 4.31;
        const mesh = new THREE.Mesh(waveGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        crescents.push({ mesh, mat, delay: 0.42 + i * 0.14, baseScale: 5.5, spinSpeed: 4.5 });
      }

      const swordMat = createObsidianCataclysmSwordMaterial();
      const swordMesh = new THREE.Mesh(swordGeo, swordMat);
      swordMesh.visible = false;
      root.add(swordMesh);
      this.allMats.push(swordMat);

      const pillarMat = createObsidianBlackFlamePillarMaterial();
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.visible = false;
      root.add(pillarMesh);
      const crownMesh = new THREE.Mesh(crownGeo, pillarMat);
      crownMesh.visible = false;
      root.add(crownMesh);
      this.allMats.push(pillarMat);

      const machMat = createObsidianMachBlastRingMaterial();
      const machMesh = new THREE.Mesh(planeGeo, machMat);
      machMesh.rotation.x = -Math.PI / 2;
      machMesh.visible = false;
      root.add(machMesh);
      this.allMats.push(machMat);

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        impactFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        vortexMesh,
        vortexMat,
        crescents,
        swordMesh,
        swordMat,
        pillarMesh,
        pillarMat,
        crownMesh,
        machMesh,
        machMat,
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

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts: readonly WorldPoint3[];
    onImpact?: () => void;
  }): void {
    const inst = this.instances.find((s) => !s.active) ?? this.instances[0];
    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.impactFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;
    inst.vortexMesh.position.set(opts.cx, opts.cy + 0.18, opts.cz);
    inst.vortexMesh.scale.setScalar(11.8 * opts.areaScale);
    inst.vortexMat.uniforms.uProgress.value = 0;

    const waveSpecs: ReadonlyArray<{
      delay: number;
      dx: number;
      dy: number;
      dz: number;
      rx: number;
      ry: number;
      rz: number;
      sc: number;
      spin: number;
      c: string;
    }> = [
      { delay: 0.44, dx: -0.35, dy: 1.48, dz: 0.18, rx: 0.24, ry: 0.35, rz: 0.32, sc: 6.2, spin: 5.0, c: '#a855f7' },
      { delay: 0.58, dx: 0.35, dy: 1.58, dz: 0.0, rx: -0.26, ry: Math.PI - 0.35, rz: -0.34, sc: 6.6, spin: -5.2, c: '#e879f9' },
      { delay: 0.70, dx: 0.0, dy: 2.35, dz: 0.14, rx: Math.PI * 0.44, ry: 0.12, rz: 0.16, sc: 8.6, spin: -4.2, c: '#a855f7' },
      { delay: 0.88, dx: 0.0, dy: 1.15, dz: 0.0, rx: 0.05, ry: 0.0, rz: 0.0, sc: 8.4, spin: -5.0, c: '#e879f9' },
    ];

    const waveLimit = this.lowQuality ? 3 : CRESCENT_COUNT;
    for (let i = 0; i < inst.crescents.length; i++) {
      const slot = inst.crescents[i];
      if (i >= waveLimit) {
        slot.mesh.visible = false;
        continue;
      }
      const ws = waveSpecs[i];
      slot.delay = ws.delay;
      slot.baseScale = ws.sc * opts.areaScale;
      slot.spinSpeed = ws.spin;
      slot.mesh.position.set(opts.cx + ws.dx * opts.areaScale, opts.cy + ws.dy, opts.cz + ws.dz * opts.areaScale);
      slot.mesh.rotation.set(ws.rx, ws.ry, ws.rz);
      slot.mesh.scale.setScalar(0.01);
      slot.mesh.visible = false;
      slot.mat.uniforms.uColor.value.set(ws.c);
      slot.mat.uniforms.uProgress.value = 0;
      slot.mat.uniforms.uLocalT.value = 0;
    }

    inst.swordMesh.position.set(opts.cx, opts.cy + 8.4, opts.cz);
    inst.swordMesh.rotation.set(0.04, 0.12, Math.PI);
    inst.swordMesh.scale.setScalar(2.65 * Math.max(0.7, opts.areaScale));
    inst.swordMesh.visible = false;

    inst.pillarMesh.position.set(opts.cx, opts.cy + 0.12, opts.cz);
    inst.pillarMesh.scale.set(1.4 * opts.areaScale, 0.01, 1.4 * opts.areaScale);
    inst.pillarMesh.visible = false;

    inst.crownMesh.position.set(opts.cx, opts.cy + 0.16, opts.cz);
    inst.crownMesh.scale.setScalar(0.01);
    inst.crownMesh.visible = false;

    inst.machMesh.position.set(opts.cx, opts.cy + 0.22, opts.cz);
    inst.machMesh.scale.setScalar(13.2 * opts.areaScale);
    inst.machMesh.visible = false;

    this.hooks.onArenaDim?.(0.82, '#05020c', 1.1);
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

      inst.vortexMat.uniforms.uProgress.value = uProgress;
      inst.vortexMat.uniforms.uTime.value = timeSec;

      // Colossal Abyssal Greatsword overhead plunge (`0.54s -> 0.86s` slam)
      if (inst.elapsed >= 0.54) {
        inst.swordMesh.visible = true;
        const st = Math.min(1, (inst.elapsed - 0.54) / 0.32);
        const easeInExpo = st === 0 ? 0 : Math.pow(2, 8 * (st - 1));
        inst.swordMesh.position.set(
          inst.cx,
          THREE.MathUtils.lerp(inst.cy + 8.4, inst.cy + 1.8, easeInExpo),
          inst.cz
        );
        inst.swordMesh.rotation.set(0.05, 0.12, Math.PI + (1 - easeInExpo) * 0.18);
        inst.swordMat.uniforms.uProgress.value = uProgress;
        inst.swordMat.uniforms.uTime.value = timeSec;
      }

      // Cataclysmic Impact + Hit-Stop + Impact Frame (`~0.86s` | `uProgress ~ 0.344`)
      if (!inst.impactFired && inst.elapsed >= 0.86) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.05;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#e879f9', 0.068);
        this.hooks.onSpeedLines?.(1.0, 0.46);
        inst.onImpactCallback?.();
      }

      // Black-Flame Cataclysm Spire + Jagged Crater Shock-Crown + Mach Blast Ring (`uProgress >= 0.33`)
      if (uProgress >= 0.33) {
        const boomT = Math.min(1, (uProgress - 0.33) / 0.24);
        const boomEase = 1 - Math.pow(1 - boomT, 3);
        inst.pillarMesh.visible = true;
        inst.pillarMesh.scale.set(
          (0.85 + 0.75 * boomEase) * inst.areaScale,
          Math.max(0.08, boomEase * 1.15),
          (0.85 + 0.75 * boomEase) * inst.areaScale
        );
        inst.pillarMesh.rotation.y = -timeSec * 1.4;

        inst.crownMesh.visible = true;
        const crownS = (1.2 + 2.4 * boomEase) * inst.areaScale;
        inst.crownMesh.scale.set(crownS, crownS * 1.22, crownS);
        inst.crownMesh.rotation.y = boomEase * 0.4;

        inst.machMesh.visible = true;
        inst.machMat.uniforms.uProgress.value = uProgress;
        inst.machMat.uniforms.uTime.value = timeSec;

        inst.pillarMat.uniforms.uProgress.value = uProgress;
        inst.pillarMat.uniforms.uTime.value = timeSec;
      }

      // Getsuga Black-Flame Crescent Waves
      const waveLimit = this.lowQuality ? 3 : CRESCENT_COUNT;
      for (let i = 0; i < waveLimit; i++) {
        const slot = inst.crescents[i];
        if (inst.elapsed < slot.delay) continue;
        slot.mesh.visible = true;
        const localT = Math.min(1, (inst.elapsed - slot.delay) / 0.55);
        const sEase = 1 - Math.pow(1 - localT, 3);
        slot.mesh.scale.setScalar(slot.baseScale * (0.42 + 0.68 * sEase));
        slot.mesh.rotation.y += slot.spinSpeed * dt * (1 - 0.5 * localT);
        slot.mat.uniforms.uProgress.value = uProgress;
        slot.mat.uniforms.uTime.value = timeSec;
        slot.mat.uniforms.uLocalT.value = localT;
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
