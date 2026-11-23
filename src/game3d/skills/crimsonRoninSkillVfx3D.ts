import * as THREE from 'three';
import { createRoninKatanaGeometry } from '../MeshFxOmegaShaders3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const SMEAR_COUNT = 8;

const ATOMIC_NOISE_GLSL = `
  float atHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float atVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = atHash21(i);
    float b = atHash21(i + vec2(1.0, 0.0));
    float c = atHash21(i + vec2(0.0, 1.0));
    float d = atHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float atFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * atVnoise(p);
      p = rot * p * 2.04 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * Ultra-sharp tapered smear crescent geometry for Atomic Samurai multiple-exposure katana swings.
 */
function createAtomicSmearArcGeometry(
  innerR = 0.58,
  outerR = 1.0,
  sweepRad = Math.PI * 1.15,
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
    const widthScale = Math.pow(Math.sin(u * Math.PI), 0.32);
    const curInner = outerR - (outerR - innerR) * widthScale;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = 0.0;
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
 * Layer 1 Shader: Atomic Slash Multi-Plane Procedural Razor-Line Lattice
 * Uses inverse-distance needle core math (`0.0032 / dist` + `0.028 / (dist + 0.01)`) across
 * 14 rotated diagonal slash planes per layer—recreating One-Punch Man's blinding flurry of
 * crisscrossing white-hot & crimson katana flash lines.
 */
function createAtomicSlashLatticeShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uLayerSeed: { value: 0.0 },
      uColor: { value: new THREE.Color('#ef4444') },
      uCoreColor: { value: new THREE.Color('#fbbf24') },
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
      uniform float uLayerSeed;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${ATOMIC_NOISE_GLSL}

      float atomicLine(vec2 p, float ang, float offset, float jitterPhase) {
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 rp = rot * p;
        float jag = (atVnoise(vec2(rp.x * 9.0, jitterPhase)) - 0.5) * 0.018;
        float dist = abs(rp.y - offset + jag);
        float lenMask = smoothstep(0.95, 0.45, abs(rp.x));
        float needle = 0.0030 / (dist + 0.0018);
        float aura = 0.022 / (dist + 0.012);
        return (needle + aura * 0.65) * lenMask;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float charge = smoothstep(0.0, 0.16, uProgress);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        // Phase 1 (0.0 - 0.16): Single razor sheath-draw glint line
        float stanceGlint = atomicLine(p, 0.32 + uLayerSeed * 0.5, 0.0, uTime * 8.0)
          * smoothstep(0.02, 0.14, uProgress) * (1.0 - smoothstep(0.16, 0.24, uProgress));

        // Phase 2 (0.14 - 0.50): 12 ultra-fast crisscrossing Atomic Slash razor lines
        float flurrySum = 0.0;
        float coreSum = 0.0;
        float tick = floor(uTime * 34.0);
        for (int i = 0; i < 12; i++) {
          float fi = float(i);
          float triggerT = 0.14 + fi * 0.011;
          float activeWin = smoothstep(triggerT - 0.02, triggerT + 0.01, uProgress);
          float pulse = 0.55 + 0.45 * step(0.35, atHash21(vec2(fi + uLayerSeed * 7.0, tick)));
          float ang = atHash21(vec2(fi * 3.1, uLayerSeed + 1.7)) * 3.14159265;
          float off = (atHash21(vec2(fi * 5.7, uLayerSeed + 4.3)) - 0.5) * 1.15;

          mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          vec2 rp = rot * p;
          float jag = (atVnoise(vec2(rp.x * 11.0, tick * 0.7 + fi)) - 0.5) * 0.014;
          float d = abs(rp.y - off + jag);
          float lenMask = smoothstep(0.96, 0.35, abs(rp.x));
          float core = smoothstep(0.012, 0.001, d) * lenMask;
          float glow = (0.018 / (d + 0.014)) * lenMask;

          float w = activeWin * pulse;
          flurrySum += glow * w;
          coreSum += core * w;
        }

        // Phase 3 (0.24 - 0.50): Delayed Kiri-Sute detonation flash & outer cut ring
        float strikePop = 1.0 - pow(1.0 - clamp((uProgress - 0.24) / 0.26, 0.0, 1.0), 3.0);
        float shockRing = exp(-pow((r - mix(0.18, 0.94, strikePop)) * 22.0, 2.0)) * step(0.24, uProgress);

        float n = atFbm(p * 7.5 + vec2(uLayerSeed, -uTime * 2.5));
        float dissolve = smoothstep(dissolveT - 0.09, dissolveT + 0.09, n + clamp(coreSum, 0.0, 0.45));

        vec3 crimson = uColor * 1.55;
        vec3 gold = uCoreColor * 1.35;
        vec3 col = mix(crimson, gold, clamp(shockRing * 0.55 + flurrySum * 0.15, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.98, 0.96), clamp(coreSum * 0.95 + stanceGlint * 0.9 + shockRing * 0.65, 0.0, 1.0));

        float radialFade = smoothstep(0.99, 0.82, r);
        float alpha = clamp((flurrySum * 0.42 + coreSum * 1.15 + stanceGlint * 0.9 + shockRing) * radialFade * charge * dissolve, 0.0, 1.0);
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
 * Layer 2 Shader: Multiple-Exposure Afterimage Katana Smear Crescent
 * (ultra-thin white-hot leading razor arc + trailing crimson-gold speed smear).
 */
function createAtomicSmearArcShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uSeed: { value: 1.0 },
      uColor: { value: new THREE.Color('#ef4444') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
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
      uniform float uLocalT;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${ATOMIC_NOISE_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);
        float sweep = 1.0 - pow(1.0 - clamp(uLocalT * 3.4, 0.0, 1.0), 3.0);
        float tail = max(0.0, (uLocalT - 0.25) * 1.35);

        float headMask = smoothstep(sweep + 0.08, sweep - 0.02, vUv.x);
        float tailMask = smoothstep(tail - 0.10, tail + 0.06, vUv.x);

        float razorWhite = smoothstep(0.76, 0.96, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
        float crimsonTrail = smoothstep(0.05, 0.45, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float n = atFbm(vec2(vUv.x * 20.0 - uTime * 6.0 + uSeed, vUv.y * 8.0));
        float dissolve = smoothstep(dissolveT - 0.09, dissolveT + 0.09, n * (0.4 + 0.6 * vUv.y));

        float alpha = headMask * tailMask * crimsonTrail * dissolve;
        if (alpha < 0.02) discard;

        vec3 col = mix(uColor * 1.55, uCoreColor * 1.85, clamp(razorWhite * 1.15, 0.0, 1.0));
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
 * Layer 3 Shader: Delayed "Kiri-Sute" Geometric Cut Grid Overlay on the Pit Horizon
 * (crisp intersecting red-white cut seams lighting up simultaneously before detonation).
 */
function createAtomicKiriSuteGridShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
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
      uniform float uTime;
      varying vec2 vUv;
      ${ATOMIC_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        if (uProgress < 0.22) discard;

        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.22) / 0.28, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        // Two rotated skewed grid lattices representing Atomic Slash dice cuts
        mat2 rotA = mat2(0.866, -0.5, 0.5, 0.866);
        mat2 rotB = mat2(0.707, 0.707, -0.707, 0.707);
        vec2 gA = abs(fract((rotA * p) * 4.2) - 0.5);
        vec2 gB = abs(fract((rotB * p) * 3.4 + 0.25) - 0.5);

        float lineA = smoothstep(0.038, 0.004, min(gA.x, gA.y));
        float lineB = smoothstep(0.032, 0.004, min(gB.x, gB.y));
        float grid = max(lineA, lineB * 0.85);

        // Expanding detonation core wave sweeping across the cut grid
        float boomR = mix(0.05, 0.95, strike);
        float boomEdge = exp(-pow((r - boomR) * 16.0, 2.0));
        float centerFlash = exp(-r * r * 14.0) * (1.0 - strike * 0.7);

        float n = atFbm(p * 9.0 + vec2(0.0, -uTime * 2.2));
        float dissolve = smoothstep(dissolveT - 0.09, dissolveT + 0.09, n + grid * 0.2);

        vec3 crimson = vec3(0.95, 0.14, 0.16) * (1.45 + strike * 0.8);
        vec3 col = mix(crimson, vec3(1.0, 0.97, 0.92), clamp(grid * 0.72 + boomEdge * 0.65 + centerFlash, 0.0, 1.0));

        float radialFade = smoothstep(0.99, 0.78, r);
        float alpha = clamp((grid * 0.88 + boomEdge + centerFlash) * radialFade * dissolve, 0.0, 1.0);
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
 * Layer 4 Shader: High-Speed Katana Stance & Quick-Draw Afterimage Blade Shader.
 */
function createAtomicPhantomKatanaShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
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
      uniform float uProgress;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${ATOMIC_NOISE_GLSL}

      void main() {
        float charge = smoothstep(0.0, 0.16, uProgress);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);

        float n = atFbm(vLocalPos.xy * 5.0 - vec2(0.0, uTime * 3.0));
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, n + rim * 0.25);

        vec3 col = mix(vec3(0.95, 0.16, 0.16) * 1.55, vec3(1.0, 0.98, 0.94), clamp(pow(rim, 1.8) * 0.95, 0.0, 1.0));
        float alpha = clamp((0.45 + rim * 0.78) * charge * dissolve, 0.0, 1.0);
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

interface AtomicSmearSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  baseScale: number;
  spinSpeed: number;
}

interface AtomicSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  latticeFloorMesh: THREE.Mesh;
  latticeMidMesh: THREE.Mesh;
  latticeTiltMesh: THREE.Mesh;
  latticeMats: THREE.ShaderMaterial[];
  gridMesh: THREE.Mesh;
  gridMat: THREE.ShaderMaterial;
  smears: AtomicSmearSlot[];
  katanaMesh: THREE.Mesh;
  katanaMat: THREE.ShaderMaterial;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Crimson Ronin
 * ("Atomic Samurai — Atomic Slash: High-Speed Razor Lattice & Kiri-Sute Detonation").
 */
export class CrimsonRoninSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: AtomicSkillInstance[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const smearGeo = createAtomicSmearArcGeometry(0.60, 1.0, Math.PI * 1.22, 32);
    const katanaGeo = createRoninKatanaGeometry();
    this.sharedGeos.push(planeGeo, smearGeo, katanaGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const latticeMatA = createAtomicSlashLatticeShaderMaterial();
      latticeMatA.uniforms.uLayerSeed.value = 1.0;
      const latticeMatB = createAtomicSlashLatticeShaderMaterial();
      latticeMatB.uniforms.uLayerSeed.value = 2.7;
      const latticeMatC = createAtomicSlashLatticeShaderMaterial();
      latticeMatC.uniforms.uLayerSeed.value = 4.9;
      this.allMats.push(latticeMatA, latticeMatB, latticeMatC);

      const latticeFloorMesh = new THREE.Mesh(planeGeo, latticeMatA);
      latticeFloorMesh.rotation.x = -Math.PI / 2;
      const latticeMidMesh = new THREE.Mesh(planeGeo, latticeMatB);
      latticeMidMesh.rotation.x = -Math.PI * 0.42;
      const latticeTiltMesh = new THREE.Mesh(planeGeo, latticeMatC);
      latticeTiltMesh.rotation.set(-0.35, 0.25, 0.2);
      root.add(latticeFloorMesh, latticeMidMesh, latticeTiltMesh);

      const gridMat = createAtomicKiriSuteGridShaderMaterial();
      const gridMesh = new THREE.Mesh(planeGeo, gridMat);
      gridMesh.rotation.x = -Math.PI / 2;
      gridMesh.visible = false;
      root.add(gridMesh);
      this.allMats.push(gridMat);

      const smears: AtomicSmearSlot[] = [];
      for (let i = 0; i < SMEAR_COUNT; i++) {
        const mat = createAtomicSmearArcShaderMaterial();
        mat.uniforms.uSeed.value = (i + 1) * 2.13;
        const mesh = new THREE.Mesh(smearGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        smears.push({ mesh, mat, delay: 0.36 + i * 0.025, baseScale: 5.5, spinSpeed: 10.0 });
      }

      const katanaMat = createAtomicPhantomKatanaShaderMaterial();
      const katanaMesh = new THREE.Mesh(katanaGeo, katanaMat);
      katanaMesh.visible = false;
      root.add(katanaMesh);
      this.allMats.push(katanaMat);

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
        latticeFloorMesh,
        latticeMidMesh,
        latticeTiltMesh,
        latticeMats: [latticeMatA, latticeMatB, latticeMatC],
        gridMesh,
        gridMat,
        smears,
        katanaMesh,
        katanaMat,
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

    inst.latticeFloorMesh.position.set(opts.cx, opts.cy + 0.12, opts.cz);
    inst.latticeFloorMesh.scale.setScalar(11.6 * opts.areaScale);

    inst.latticeMidMesh.position.set(opts.cx, opts.cy + 1.05, opts.cz);
    inst.latticeMidMesh.scale.setScalar(10.8 * opts.areaScale);

    inst.latticeTiltMesh.position.set(opts.cx, opts.cy + 1.45, opts.cz);
    inst.latticeTiltMesh.scale.setScalar(9.8 * opts.areaScale);
    inst.latticeTiltMesh.visible = !this.lowQuality;

    for (const m of inst.latticeMats) {
      m.uniforms.uProgress.value = 0;
    }

    inst.gridMesh.position.set(opts.cx, opts.cy + 0.08, opts.cz);
    inst.gridMesh.scale.setScalar(11.8 * opts.areaScale);
    inst.gridMesh.visible = false;

    const smearLimit = this.lowQuality ? 4 : SMEAR_COUNT;
    for (let i = 0; i < inst.smears.length; i++) {
      const slot = inst.smears[i];
      if (i >= smearLimit) {
        slot.mesh.visible = false;
        continue;
      }
      const isLeft = i % 2 === 0;
      const tgt = opts.pts[i % opts.pts.length];
      slot.delay = 0.34 + i * 0.026;
      slot.baseScale = (3.8 + (i % 3) * 1.4) * opts.areaScale;
      slot.spinSpeed = (isLeft ? 1 : -1) * (11.0 + i * 0.8);
      slot.mesh.position.set(
        i >= 5 ? opts.cx : tgt.x,
        (i >= 5 ? opts.cy + 1.1 : tgt.y + 0.85) + (i % 3) * 0.22,
        i >= 5 ? opts.cz : tgt.z
      );
      slot.mesh.rotation.set(
        (isLeft ? 1 : -1) * (0.18 + (i % 3) * 0.16),
        i * 0.85,
        (isLeft ? -1 : 1) * (0.15 + (i % 2) * 0.22)
      );
      slot.mesh.scale.setScalar(slot.baseScale);
      slot.mesh.visible = false;
      slot.mat.uniforms.uColor.value.set(i % 3 === 2 ? '#fbbf24' : '#ef4444');
      slot.mat.uniforms.uProgress.value = 0;
      slot.mat.uniforms.uLocalT.value = 0;
    }

    inst.katanaMesh.position.set(opts.cx - 2.6 * opts.areaScale, opts.cy + 4.2, opts.cz - 0.6 * opts.areaScale);
    inst.katanaMesh.rotation.set(0.32, 0.2, 1.38);
    inst.katanaMesh.scale.setScalar(4.4 * Math.max(0.7, opts.areaScale));
    inst.katanaMesh.visible = false;

    this.hooks.onArenaDim?.(0.84, '#120205', 1.08);
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

      for (const m of inst.latticeMats) {
        m.uniforms.uProgress.value = uProgress;
        m.uniforms.uTime.value = timeSec;
      }

      // Multiple-exposure high-speed Atomic Slash smears (`0.34s -> 0.65s`)
      const smearLimit = this.lowQuality ? 4 : SMEAR_COUNT;
      for (let i = 0; i < smearLimit; i++) {
        const slot = inst.smears[i];
        if (inst.elapsed < slot.delay) continue;
        slot.mesh.visible = true;
        const localT = Math.min(1, (inst.elapsed - slot.delay) / 0.34);
        slot.mesh.rotation.y += slot.spinSpeed * dt;
        slot.mat.uniforms.uProgress.value = uProgress;
        slot.mat.uniforms.uTime.value = timeSec;
        slot.mat.uniforms.uLocalT.value = localT;
      }

      // Final Sheath-Snap Katana Silhouette (`0.42s -> 0.62s`)
      if (inst.elapsed >= 0.42) {
        inst.katanaMesh.visible = true;
        const kt = Math.min(1, (inst.elapsed - 0.42) / 0.18);
        const snapK = 1 - Math.pow(1 - kt, 3);
        inst.katanaMesh.position.set(
          THREE.MathUtils.lerp(inst.cx - 2.8 * inst.areaScale, inst.cx + 2.4 * inst.areaScale, snapK),
          THREE.MathUtils.lerp(inst.cy + 4.4, inst.cy + 0.9, snapK),
          THREE.MathUtils.lerp(inst.cz - 0.6 * inst.areaScale, inst.cz + 0.8 * inst.areaScale, snapK)
        );
        inst.katanaMesh.rotation.set(0.32, 0.2, THREE.MathUtils.lerp(1.38, -2.18, snapK));
        inst.katanaMat.uniforms.uProgress.value = uProgress;
        inst.katanaMat.uniforms.uTime.value = timeSec;
      }

      // Delayed "Kiri-Sute" Atomic Grid Detonation + Hit-Stop + Impact Frame (`~0.60s` | `uProgress >= 0.24`)
      if (uProgress >= 0.22) {
        inst.gridMesh.visible = true;
        inst.gridMat.uniforms.uProgress.value = uProgress;
        inst.gridMat.uniforms.uTime.value = timeSec;
      }

      if (!inst.impactFired && uProgress >= 0.24) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.055;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ef4444', 0.068);
        this.hooks.onSpeedLines?.(1.0, 0.50);
        inst.onImpactCallback?.();
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
