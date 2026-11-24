import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const SHOCK_RING_COUNT = 2;
const EMBER_SPARK_COUNT = 36;

const VOID_ASURA_NOISE_GLSL = `
  float vaHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 39.47);
    return fract(p.x * p.y);
  }
  float vaVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(vaHash21(i), vaHash21(i + vec2(1.0, 0.0)), f.x),
      mix(vaHash21(i + vec2(0.0, 1.0)), vaHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float vaFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += vaVnoise(p) * a;
      p = rot * p * 2.09 + vec2(1.9, 4.7);
      a *= 0.5;
    }
    return v;
  }
  float vaRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(vaVnoise(p) * 2.0 - 1.0);
      v += (n * n * n) * a;
      p *= 2.18;
      a *= 0.5;
    }
    return v;
  }
`;

/** Back-attachment Halo Disc for Void Asura: ink-black eclipse core + volcanic crimson corona + 6 wrath seals. */
export function createVoidAsuraHaloShaderMaterial(): THREE.ShaderMaterial {
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
      ${VOID_ASURA_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        float cycle = fract(uTime * 0.4);
        float surge = smoothstep(0.08, 0.34, cycle) * (1.0 - smoothstep(0.68, 0.96, cycle));

        float spikes6 = pow(max(0.0, cos(ang * 6.0 - uTime * 1.4)), 4.0);
        float corona = vaFbm(p * 3.8 + vec2(cos(ang), sin(ang)) * (uTime * 0.85));
        float outerMask = smoothstep(0.98, 0.52 - spikes6 * 0.14 - corona * 0.14, r);
        float ringMask = smoothstep(0.24, 0.34, r) * outerMask;

        float veins = smoothstep(0.62, 0.92, vaRidged(p * 4.4 - vec2(0.0, uTime * 1.9)));
        float eclipseRim = smoothstep(0.29, 0.33, r) * (1.0 - smoothstep(0.35, 0.42, r));

        vec3 col = mix(vec3(0.38, 0.02, 0.04), vec3(0.95, 0.12, 0.16), corona * 0.85 + spikes6 * 0.55);
        col += vec3(1.0, 0.92, 0.88) * (veins * 0.72 + eclipseRim * 1.15);
        col *= 1.0 + surge * 0.45;

        float alpha = clamp((ringMask * (0.48 + corona * 0.45 + spikes6 * 0.35) + eclipseRim * 0.9) * uOpacity, 0.0, 1.0);
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

/** Back-attachment Spectral Demon Claw shader for Void Asura. */
export function createVoidAsuraClawShaderMaterial(): THREE.ShaderMaterial {
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
      ${VOID_ASURA_NOISE_GLSL}

      void main() {
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0), 2.1);
        float flow = vaRidged(vec2(vUv.x * 4.0, vUv.y * 5.0 - uTime * 2.2));
        float tipGlow = smoothstep(0.55, 0.98, vUv.y);
        vec3 baseCol = mix(vec3(0.08, 0.03, 0.06), vec3(0.92, 0.14, 0.18), flow * 0.75 + tipGlow * 0.45);
        vec3 rimCol = mix(vec3(0.98, 0.25, 0.25), vec3(1.0, 0.96, 0.94), tipGlow);
        vec3 col = baseCol + rimCol * (fresnel * 1.15 + flow * 0.35);
        float alpha = clamp((0.62 + fresnel * 0.38) * uOpacity, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Sculpted curved 3D demon claw-blade geometry for Void Asura back-attachment. */
export function createVoidAsuraClawGeometry(): THREE.BufferGeometry {
  const forearm = new THREE.ConeGeometry(0.11, 0.92, 5, 1);
  forearm.translate(0, 0.46, 0);
  const talon = new THREE.ConeGeometry(0.075, 0.54, 4, 1);
  talon.rotateZ(0.28);
  talon.translate(-0.08, 1.02, 0);
  const spur = new THREE.ConeGeometry(0.045, 0.28, 4, 1);
  spur.rotateZ(-0.52);
  spur.translate(0.10, 0.72, 0);
  return mergeSimpleGeos([forearm, talon, spur]);
}

/** Faceted jagged obsidian horn-shard geometry. */
export function createVoidAsuraObsidianShardGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.16, 0.88, 4, 1);
  geo.translate(0, 0.44, 0);
  return geo;
}

/** Clean pulsing crimson-obsidian circular ground warning aura (no square grid). */
function createCleaveTargetRingMaterial(): THREE.ShaderMaterial {
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
      ${VOID_ASURA_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edgeMask = 1.0 - smoothstep(0.84, 0.99, r);

        float pulse = 0.82 + 0.18 * sin(uTime * 10.0);
        float outerRing = exp(-abs(r - 0.82) * 28.0);
        float innerRing = exp(-abs(r - 0.56) * 22.0) * 0.45;
        float mist = vaFbm(p * 3.0 - vec2(0.0, uTime * 1.1)) * (1.0 - smoothstep(0.15, 0.88, r));

        vec3 col = mix(vec3(0.32, 0.02, 0.05), vec3(0.95, 0.08, 0.16), mist * 0.8 + outerRing * 0.7);
        col += vec3(1.0, 0.92, 0.88) * (pow(outerRing, 2.0) * 0.95);
        col *= pulse;

        float reveal = smoothstep(0.0, 0.08, uProgress) * (1.0 - smoothstep(0.74, 0.99, uProgress));
        float alpha = clamp((outerRing * 0.9 + innerRing + mist * 0.34) * edgeMask * reveal * uOpacity, 0.0, 1.0);
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

/** Razor-sharp expanding circular crimson-white shockwave ring (no square grid). */
function createCleaveShockRingMaterial(): THREE.ShaderMaterial {
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
        vec3 col = vec3(0.98, 0.08, 0.16) * (ring + trail) + vec3(1.0, 0.96, 0.94) * pow(ring, 2.0) * 1.25;

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

/** Single Giant Animated Falling Sukuna Waffle-Net: vertex wind-bowing + ground ripple + slash-carving & burn-out. */
function createWaffleNetGridMaterial(): THREE.ShaderMaterial {
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
      ${VOID_ASURA_NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        vec2 borderDist = 1.0 - abs(p);
        float vignette = smoothstep(0.0, 0.16, min(borderDist.x, borderDist.y));

        // Slash-carving reveal sweeping outward from center in mid-air
        float sweep = uDraw * 1.35;
        float carveX = smoothstep(sweep, sweep - 0.25, abs(p.x));
        float carveY = smoothstep(sweep, sweep - 0.25, abs(p.y));
        float carveMask = carveX * carveY;

        vec2 cell = abs(fract(vUv * 5.0 - 0.5) - 0.5);
        float dLine = min(cell.x, cell.y);

        float outerGlow = exp(-dLine * 13.0);
        float razorCore = exp(-dLine * 46.0);
        float nodeFlare = exp(-(cell.x + cell.y) * 16.0);

        float shimmer = 0.88 + 0.12 * sin((vUv.x + vUv.y) * 24.0 - uTime * 22.0);
        float flashBoost = 1.0 + uDropVel * 0.45 + uImpact * 1.15;

        // Clean fbm burn-out dissolve on impact
        float burnNoise = vaFbm(vUv * 7.5 + vec2(0.0, uTime * 0.6));
        float dissolve = 1.0 - smoothstep(1.0 - uImpact * 1.25, 1.2 - uImpact * 1.25, burnNoise);

        vec3 crimson = vec3(0.98, 0.06, 0.14) * outerGlow * 1.2;
        vec3 whiteHot = vec3(1.0, 0.97, 0.95) * (razorCore * 1.55 + nodeFlare * 1.25);
        vec3 col = (crimson + whiteHot) * shimmer * flashBoost;

        float alpha = clamp((outerGlow * 0.88 + razorCore + nodeFlare * 0.72) * vignette * carveMask * dissolve * uOpacity, 0.0, 1.0);
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

function createCleaveRupturePillarMaterial(): THREE.ShaderMaterial {
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
      ${VOID_ASURA_NOISE_GLSL}

      void main() {
        float streak = vaRidged(vec2(vUv.x * 6.0, vUv.y * 4.5 - uTime * 6.0));
        float vFade = smoothstep(0.0, 0.10, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
        vec3 col = mix(vec3(0.92, 0.06, 0.12), vec3(1.0, 0.96, 0.92), streak * 0.9 + (1.0 - vUv.y) * 0.35);
        float alpha = clamp(vFade * (0.58 + streak * 0.65) * uOpacity, 0.0, 1.0);
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

function createEmberSparkShaderMaterial(): THREE.ShaderMaterial {
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
        float core = exp(-abs(p.x) * 4.5 - abs(p.y) * 2.2);
        vec3 col = mix(vec3(0.98, 0.12, 0.18), vec3(1.0, 0.96, 0.90), core);
        float alpha = clamp(core * 1.2 * uOpacity, 0.0, 1.0);
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

interface EmberSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface VoidAsuraInstance {
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
  waffleMesh: THREE.Mesh;
  waffleMat: THREE.ShaderMaterial;
  pillarMesh: THREE.Mesh;
  pillarMat: THREE.ShaderMaterial;
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  embers: EmberSlot[];
}

export class VoidAsuraSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly instances: VoidAsuraInstance[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const waffleGeo = new THREE.PlaneGeometry(13.5, 13.5, 24, 24);
    waffleGeo.rotateX(-Math.PI / 2);
    const pillarGeo = new THREE.CylinderGeometry(1.8, 3.2, 11.5, 20, 8, true);
    pillarGeo.translate(0, 5.75, 0);
    const shockGeo = new THREE.PlaneGeometry(1, 1);
    shockGeo.rotateX(-Math.PI / 2);
    const emberGeo = new THREE.PlaneGeometry(0.32, 0.85);
    this.sharedGeos.push(floorGeo, waffleGeo, pillarGeo, shockGeo, emberGeo);

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createCleaveTargetRingMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = 0.06;
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const waffleMat = createWaffleNetGridMaterial();
      const waffleMesh = new THREE.Mesh(waffleGeo, waffleMat);
      waffleMesh.visible = false;
      root.add(waffleMesh);
      this.allMats.push(waffleMat);

      const pillarMat = createCleaveRupturePillarMaterial();
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.visible = false;
      root.add(pillarMesh);
      this.allMats.push(pillarMat);

      const rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }> = [];
      for (let r = 0; r < SHOCK_RING_COUNT; r++) {
        const mat = createCleaveShockRingMaterial();
        const mesh = new THREE.Mesh(shockGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        rings.push({ mesh, mat, delay: 0.78 + r * 0.18 });
      }

      const embers: EmberSlot[] = [];
      for (let e = 0; e < EMBER_SPARK_COUNT; e++) {
        const mat = createEmberSparkShaderMaterial();
        const mesh = new THREE.Mesh(emberGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        embers.push({
          mesh,
          mat,
          angle: (e / EMBER_SPARK_COUNT) * Math.PI * 2,
          speed: 3.5 + (e % 5) * 1.1,
          ySpeed: 4.0 + (e % 4) * 1.4,
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
        waffleMesh,
        waffleMat,
        pillarMesh,
        pillarMat,
        rings,
        embers,
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

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts?: readonly WorldPoint3[];
    onImpact?: () => void;
  }): void {
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
    inst.floorMesh.scale.setScalar(14.5 * opts.areaScale);
    inst.waffleMesh.visible = false;
    inst.pillarMesh.visible = false;
    inst.pillarMesh.position.set(opts.cx, opts.cy + 0.05, opts.cz);
    inst.rings.forEach((r) => (r.mesh.visible = false));
    inst.embers.forEach((e) => (e.mesh.visible = false));
  }

  public update(dtSec: number, timeSec: number): void {
    for (let idx = 0; idx < this.instances.length; idx++) {
      const inst = this.instances[idx];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer -= dtSec;
        continue;
      }

      const dt = Math.min(0.05, dtSec);
      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;

      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uOpacity.value = 1;

      // Single Giant Animated Falling Sukuna Waffle-Net
      if (inst.elapsed >= 0.04 && inst.elapsed < 1.22) {
        inst.waffleMesh.visible = true;
        inst.waffleMat.uniforms.uTime.value = timeSec;

        if (inst.elapsed < 0.34) {
          // Phase 1 (0.04s -> 0.34s): Sky Carve & Lock
          const carveT = (inst.elapsed - 0.04) / 0.30;
          const easeCarve = 1 - Math.pow(1 - carveT, 2);
          inst.waffleMesh.position.set(inst.cx, inst.cy + 7.2 * as, inst.cz);
          inst.waffleMesh.rotation.set(0.14, 0.25, -0.08);
          inst.waffleMesh.scale.setScalar((0.85 + 0.23 * easeCarve) * as);
          inst.waffleMat.uniforms.uDraw.value = carveT;
          inst.waffleMat.uniforms.uDropVel.value = 0;
          inst.waffleMat.uniforms.uImpact.value = 0;
          inst.waffleMat.uniforms.uOpacity.value = Math.min(1, carveT * 2.5);
        } else if (inst.elapsed < 0.78) {
          // Phase 2 (0.34s -> 0.78s): Accelerating Guillotine Slam with wind-drag bowing
          const fallT = (inst.elapsed - 0.34) / 0.44;
          const easeFall = fallT * fallT * fallT;
          const yPos = inst.cy + (7.2 - 6.98 * easeFall) * as;
          const tiltScale = 1 - easeFall;
          inst.waffleMesh.position.set(inst.cx, yPos, inst.cz);
          inst.waffleMesh.rotation.set(0.14 * tiltScale, 0.25, -0.08 * tiltScale);
          inst.waffleMesh.scale.setScalar(1.08 * as);
          inst.waffleMat.uniforms.uDraw.value = 1;
          inst.waffleMat.uniforms.uDropVel.value = Math.sin(fallT * Math.PI * 0.85);
          inst.waffleMat.uniforms.uImpact.value = 0;
          inst.waffleMat.uniforms.uOpacity.value = 1;
        } else {
          // Phase 3 (0.78s -> 1.22s): Ground Slice-Through & Burn-Out
          const impT = Math.min(1, (inst.elapsed - 0.78) / 0.44);
          inst.waffleMesh.position.set(inst.cx, inst.cy + 0.22 * as, inst.cz);
          inst.waffleMesh.rotation.set(0, 0.25, 0);
          inst.waffleMesh.scale.setScalar((1.08 + 0.16 * impT) * as);
          inst.waffleMat.uniforms.uDraw.value = 1;
          inst.waffleMat.uniforms.uDropVel.value = 0;
          inst.waffleMat.uniforms.uImpact.value = impT;
          inst.waffleMat.uniforms.uOpacity.value = 1 - impT * impT;
        }
      } else {
        inst.waffleMesh.visible = false;
      }

      // Hit-Stop Impact Frame
      if (!inst.impactFired && inst.elapsed >= 0.78) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.085;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ef4444', 0.09);
        this.hooks.onSpeedLines?.(1.0, 0.58);
        this.hooks.onFlash?.('#fca5a5', 0.78);
        inst.onImpactCallback?.();
      }

      // Colossal 11.5m Crimson-White Rupture Pillar + 2 Massive Circular Shock Rings + 36 Sparks
      if (uProgress >= 0.31) {
        const bt = Math.min(1, (uProgress - 0.31) / 0.18);
        const ease = 1 - Math.pow(1 - bt, 3);
        const fade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);

        inst.pillarMesh.visible = fade > 0.02;
        inst.pillarMesh.scale.set((0.85 + 0.65 * ease) * as, Math.max(0.1, ease * 1.15), (0.85 + 0.65 * ease) * as);
        inst.pillarMesh.rotation.y += dt * 4.2;
        inst.pillarMat.uniforms.uTime.value = timeSec;
        inst.pillarMat.uniforms.uProgress.value = uProgress;
        inst.pillarMat.uniforms.uOpacity.value = fade;

        for (let r = 0; r < SHOCK_RING_COUNT; r++) {
          const rg = inst.rings[r];
          const rt = (inst.elapsed - rg.delay) / 0.75;
          if (rt < 0 || rt > 1) {
            rg.mesh.visible = false;
            continue;
          }
          rg.mesh.visible = true;
          rg.mesh.position.set(inst.cx, inst.cy + 0.10 + r * 0.05, inst.cz);
          rg.mesh.scale.setScalar((3.8 + 11.0 * rt) * as);
          rg.mat.uniforms.uTime.value = timeSec;
          rg.mat.uniforms.uProgress.value = rt;
          rg.mat.uniforms.uOpacity.value = 1 - rt;
        }

        const dtBoom = Math.max(0, inst.elapsed - 0.78);
        const sparkLimit = this.lowQuality ? 16 : EMBER_SPARK_COUNT;
        for (let e = 0; e < sparkLimit; e++) {
          const em = inst.embers[e];
          if (fade <= 0.02) {
            em.mesh.visible = false;
            continue;
          }
          em.mesh.visible = true;
          const r = dtBoom * em.speed * as;
          const y = Math.max(0.15, 0.6 + dtBoom * em.ySpeed - 2.2 * dtBoom * dtBoom);
          em.mesh.position.set(inst.cx + Math.cos(em.angle) * r, inst.cy + y, inst.cz + Math.sin(em.angle) * r);
          em.mesh.rotation.y = -em.angle;
          em.mesh.scale.setScalar(1.1 * fade * as);
          em.mat.uniforms.uTime.value = timeSec;
          em.mat.uniforms.uOpacity.value = fade;
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
      this.instances[i].onImpactCallback = null;
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) this.allMats[i].dispose();
    for (let i = 0; i < this.sharedGeos.length; i++) this.sharedGeos[i].dispose();
  }
}
