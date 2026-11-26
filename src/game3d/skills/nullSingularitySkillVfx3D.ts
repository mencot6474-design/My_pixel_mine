import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const MIRROR_COUNT = 8;
const SHARDS_PER_DOOR = 3;
const SHARD_COUNT = MIRROR_COUNT * SHARDS_PER_DOOR;
const SHOCK_RING_COUNT = 2;
const STAR_SPARK_COUNT = 36;

const NULL_SINGULARITY_GLSL = `
  float nsHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float nsVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(nsHash21(i), nsHash21(i + vec2(1.0, 0.0)), f.x),
      mix(nsHash21(i + vec2(0.0, 1.0)), nsHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float nsFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += nsVnoise(p) * a;
      p = rot * p * 2.07 + vec2(2.3, 5.1);
      a *= 0.5;
    }
    return v;
  }
  float nsStarfield(vec2 p) {
    vec2 gv = fract(p) - 0.5;
    vec2 id = floor(p);
    float rnd = nsHash21(id);
    float d = length(gv - (vec2(rnd, fract(rnd * 17.3)) - 0.5) * 0.55);
    return smoothstep(0.15, 0.01, d) * step(0.50, rnd);
  }
`;

/** Back-attachment Halo Disc for Null Singularity: cosmic nebula + 4-point golden star flare + RGB glitch scanlines. */
export function createNullSingularityHaloShaderMaterial(): THREE.ShaderMaterial {
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
      ${NULL_SINGULARITY_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        float band = floor(vUv.y * 28.0);
        float jit = (step(0.88, nsHash21(vec2(band, floor(uTime * 10.0)))) - 0.5) * 0.08;
        vec2 gp = p + vec2(jit, 0.0);

        float neb = nsFbm(gp * 3.4 + vec2(cos(ang), sin(ang)) * (uTime * 0.5));
        float stars = nsStarfield(gp * 9.0 + vec2(uTime * 0.15, -uTime * 0.1));
        float ring = smoothstep(0.76, 0.81, r) * (1.0 - smoothstep(0.85, 0.92, r));
        float star4 = exp(-abs(gp.x) * 14.0) * exp(-abs(gp.y) * 2.6) + exp(-abs(gp.y) * 14.0) * exp(-abs(gp.x) * 2.6);
        float edgeFade = 1.0 - smoothstep(0.82, 0.99, r);

        vec3 col = mix(vec3(0.14, 0.04, 0.34), vec3(0.66, 0.33, 0.97), neb);
        col += vec3(0.13, 0.83, 0.93) * ring * 0.9;
        col += vec3(1.0, 0.88, 0.32) * star4 * 0.95;
        col += vec3(1.0, 0.96, 1.0) * stars * 1.1;

        float alpha = clamp((neb * 0.58 + ring * 0.85 + star4 * 0.72 + stars) * edgeFade * uOpacity, 0.0, 1.0);
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

/** Back-attachment & Skill Dimensional Mirror-Card Shader: galaxy starfield inside glowing RGB-glitch frame. */
export function createNullMirrorCardShaderMaterial(): THREE.ShaderMaterial {
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
      ${NULL_SINGULARITY_GLSL}

      void main() {
        vec2 edge = min(vUv, 1.0 - vUv);
        float border = 1.0 - smoothstep(0.05, 0.14, min(edge.x, edge.y));
        float neb = nsFbm(vUv * 4.2 + vec2(0.0, uTime * 0.45));
        float stars = nsStarfield(vUv * 12.0 + vec2(uTime * 0.25, 0.0));
        float scan = 0.85 + 0.15 * sin(vUv.y * 42.0 - uTime * 8.0);

        vec3 interior = mix(vec3(0.08, 0.03, 0.24), vec3(0.58, 0.24, 0.92), neb) + vec3(1.0) * stars;
        vec3 frameCol = mix(vec3(0.13, 0.83, 0.93), vec3(0.96, 0.35, 0.68), 0.5 + 0.5 * sin(uTime * 4.0 + vUv.y * 6.0));
        vec3 col = mix(interior, frameCol * 1.25, border) * scan;
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

/** Beveled 3D floating dimensional mirror-card slab geometry. */
export function createNullMirrorCardGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(0.46, 0.78, 0.04);
}

/** Faceted void-amethyst twin-pointed crystal geometry. */
export function createNullCrystalGeometry(): THREE.BufferGeometry {
  return new THREE.OctahedronGeometry(0.22, 0);
}

function createSpiralGalaxyFloorMaterial(): THREE.ShaderMaterial {
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
      ${NULL_SINGULARITY_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        float spiral = 0.5 + 0.5 * sin(ang * 3.0 + r * 9.0 - uTime * 3.5);
        float neb = nsFbm(p * 3.4 + vec2(cos(ang), sin(ang)) * (uTime * 0.55));
        float stars = nsStarfield(p * 12.0);
        float ring = smoothstep(0.86, 0.90, r) * (1.0 - smoothstep(0.94, 0.99, r));
        float edgeFade = 1.0 - smoothstep(0.76, 1.0, r);
        float reveal = smoothstep(0.0, 0.10, uProgress) * (1.0 - smoothstep(0.74, 0.98, uProgress));

        vec3 col = mix(vec3(0.48, 0.16, 0.92), vec3(0.13, 0.83, 0.93), spiral * 0.75 + neb * 0.4);
        col += vec3(0.98, 0.28, 0.68) * ring * 1.1;
        col += vec3(1.0, 0.92, 0.45) * stars * 1.3;
        float alpha = clamp((spiral * 0.48 + neb * 0.35 + ring + stars * 0.85) * edgeFade * reveal * uOpacity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createFourPointStarFlareMaterial(): THREE.ShaderMaterial {
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
        float haloC = exp(-abs(r - (0.24 + uProgress * 0.08)) * 18.0);
        float haloM = exp(-abs(r - (0.30 + uProgress * 0.08)) * 16.0);

        float starEnergy = (rayH + rayV + rayDiag) * pulse;
        vec3 col = vec3(1.0, 0.88, 0.34) * starEnergy * 1.35;
        col += vec3(1.0, 0.99, 0.96) * (core * 1.8 + pow(starEnergy, 2.0) * 0.85);
        col += vec3(0.13, 0.85, 0.98) * haloC * 0.95;
        col += vec3(0.96, 0.30, 0.72) * haloM * 0.85;

        float alpha = clamp((starEnergy + core * 1.2 + haloC * 0.6 + haloM * 0.5) * edgeFade * uOpacity, 0.0, 1.0);
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

function createPrismEdgeShaderMaterial(): THREE.ShaderMaterial {
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

      void main() {
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0), 2.4);
        float shift = 0.5 + 0.5 * sin(uTime * 8.0 + vUv.y * 6.0);
        vec3 edgeCol = mix(vec3(0.13, 0.85, 0.98), vec3(1.0, 0.88, 0.34), shift);
        vec3 col = mix(vec3(0.18, 0.04, 0.42), edgeCol * 1.6, fresnel);
        col += vec3(1.0, 0.96, 1.0) * pow(fresnel, 3.0) * 0.95;
        gl_FragColor = vec4(col, clamp((0.28 + fresnel * 0.72) * uOpacity, 0.0, 1.0));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createStarSparkShaderMaterial(): THREE.ShaderMaterial {
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
        float core = exp(-abs(p.x) * 4.2 - abs(p.y) * 2.0);
        vec3 col = mix(vec3(0.13, 0.83, 0.93), vec3(1.0, 0.92, 0.45), core);
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

function createQuasarJetBeamMaterial(): THREE.ShaderMaterial {
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
        float flare = 1.0 + sin(uv.y * 9.0 - uTime * 12.0) * 0.16;
        pos.xz *= flare;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      varying vec2 vUv;
      ${NULL_SINGULARITY_GLSL}

      void main() {
        float neb = nsFbm(vec2(vUv.x * 5.0, vUv.y * 4.5 - uTime * 5.5));
        float stars = nsStarfield(vec2(vUv.x * 10.0, vUv.y * 14.0 - uTime * 6.5));
        float vFade = smoothstep(0.0, 0.10, vUv.y) * (1.0 - smoothstep(0.66, 1.0, vUv.y));
        vec3 col = mix(vec3(0.58, 0.22, 0.96), vec3(0.13, 0.83, 0.93), neb);
        col += vec3(1.0, 0.92, 0.42) * stars * 1.5;
        float alpha = clamp(vFade * (0.55 + neb * 0.6 + stars * 0.7) * uOpacity, 0.0, 1.0);
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

interface MirrorSlot {
  mirrorMesh: THREE.Mesh;
  mirrorMat: THREE.ShaderMaterial;
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

interface SparkSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface NullSingularityInstance {
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
  mirrors: MirrorSlot[];
  starFlareA: THREE.Mesh;
  starFlareB: THREE.Mesh;
  starFlareMat: THREE.ShaderMaterial;
  prismMesh: THREE.Mesh;
  prismMat: THREE.ShaderMaterial;
  jetMesh: THREE.Mesh;
  jetMat: THREE.ShaderMaterial;
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  shards: ShardSlot[];
  sparks: SparkSlot[];
}

export class NullSingularitySkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly instances: NullSingularityInstance[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const mirrorGeo = new THREE.BoxGeometry(2.4, 4.2, 0.14);
    const starFlareGeo = new THREE.PlaneGeometry(9.0, 9.0);
    const prismGeo = new THREE.OctahedronGeometry(2.1, 0);
    const jetGeo = new THREE.CylinderGeometry(1.4, 2.8, 12.0, 20, 8, true);
    jetGeo.translate(0, 6.0, 0);
    const shockGeo = new THREE.PlaneGeometry(1, 1);
    shockGeo.rotateX(-Math.PI / 2);
    const shardGeo = new THREE.BoxGeometry(1.0, 1.6, 0.08);
    const sparkGeo = new THREE.PlaneGeometry(0.35, 0.85);
    this.sharedGeos.push(floorGeo, mirrorGeo, starFlareGeo, prismGeo, jetGeo, shockGeo, shardGeo, sparkGeo);

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createSpiralGalaxyFloorMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = 0.06;
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const mirrors: MirrorSlot[] = [];
      for (let m = 0; m < MIRROR_COUNT; m++) {
        const angle = (m / MIRROR_COUNT) * Math.PI * 2;
        const mirrorMat = createNullMirrorCardShaderMaterial();
        const mirrorMesh = new THREE.Mesh(mirrorGeo, mirrorMat);
        mirrorMesh.visible = false;
        root.add(mirrorMesh);
        this.allMats.push(mirrorMat);
        mirrors.push({ mirrorMesh, mirrorMat, angle });
      }

      const starFlareMat = createFourPointStarFlareMaterial();
      const starFlareA = new THREE.Mesh(starFlareGeo, starFlareMat);
      const starFlareB = new THREE.Mesh(starFlareGeo, starFlareMat);
      starFlareA.visible = false;
      starFlareB.visible = false;
      root.add(starFlareA, starFlareB);
      this.allMats.push(starFlareMat);

      const prismMat = createPrismEdgeShaderMaterial();
      const prismMesh = new THREE.Mesh(prismGeo, prismMat);
      prismMesh.visible = false;
      root.add(prismMesh);
      this.allMats.push(prismMat);

      const jetMat = createQuasarJetBeamMaterial();
      const jetMesh = new THREE.Mesh(jetGeo, jetMat);
      jetMesh.visible = false;
      root.add(jetMesh);
      this.allMats.push(jetMat);

      const rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }> = [];
      for (let r = 0; r < SHOCK_RING_COUNT; r++) {
        const mat = createSpiralGalaxyFloorMaterial();
        const mesh = new THREE.Mesh(shockGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        rings.push({ mesh, mat, delay: 0.82 + r * 0.18 });
      }

      const shards: ShardSlot[] = [];
      for (let s = 0; s < SHARD_COUNT; s++) {
        const doorIndex = Math.floor(s / SHARDS_PER_DOOR);
        const subIndex = s % SHARDS_PER_DOOR;
        const mat = createNullMirrorCardShaderMaterial();
        const mesh = new THREE.Mesh(shardGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        shards.push({
          mesh,
          mat,
          doorIndex,
          subIndex,
          angle: (doorIndex / MIRROR_COUNT) * Math.PI * 2 + (subIndex - 1) * 0.42,
          speed: 2.5 + subIndex * 0.85 + (doorIndex % 2) * 0.45,
          ySpeed: 2.2 + (2 - subIndex) * 1.15,
        });
      }

      const sparks: SparkSlot[] = [];
      for (let k = 0; k < STAR_SPARK_COUNT; k++) {
        const mat = createStarSparkShaderMaterial();
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        sparks.push({
          mesh,
          mat,
          angle: (k / STAR_SPARK_COUNT) * Math.PI * 2,
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
        mirrors,
        starFlareA,
        starFlareB,
        starFlareMat,
        prismMesh,
        prismMat,
        jetMesh,
        jetMat,
        rings,
        shards,
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
    inst.floorMesh.scale.setScalar(15.0 * opts.areaScale);
    inst.mirrors.forEach((m) => {
      m.mirrorMesh.visible = false;
    });
    inst.starFlareA.visible = false;
    inst.starFlareB.visible = false;
    inst.prismMesh.visible = false;
    inst.jetMesh.visible = false;
    inst.jetMesh.position.set(opts.cx, opts.cy + 0.05, opts.cz);
    inst.rings.forEach((r) => (r.mesh.visible = false));
    inst.shards.forEach((s) => (s.mesh.visible = false));
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

      const dt = Math.min(0.05, dtSec);
      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;

      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uOpacity.value = 1;
      inst.floorMesh.rotation.y -= dt * 0.55;

      const mirrorLimit = this.lowQuality ? 4 : MIRROR_COUNT;
      const dropStepSec = this.lowQuality ? 0.055 : 0.028;
      const shatterStepSec = this.lowQuality ? 0.068 : 0.036;

      // Phase 1-2: 8 Giant Galaxy Doors drop in 1-by-1 from above, resonate, and shatter 1-by-1
      if (inst.elapsed < 0.86) {
        const beamT = Math.max(0, Math.min(1, (inst.elapsed - 0.16) / 0.65));
        const r = 4.6 * as;

        for (let m = 0; m < MIRROR_COUNT; m++) {
          const mr = inst.mirrors[m];
          if (m >= mirrorLimit) {
            mr.mirrorMesh.visible = false;
            continue;
          }

          const dropDelay = m * dropStepSec;
          const localDrop = inst.elapsed - dropDelay;
          const shatterTime = 0.54 + m * shatterStepSec;
          if (localDrop < 0 || inst.elapsed >= shatterTime) {
            mr.mirrorMesh.visible = false;
            continue;
          }

          const dropT = Math.min(1, localDrop / 0.16);
          const dropEase = 1 - Math.pow(1 - dropT, 3);
          const settle = dropT > 0.78 ? Math.sin(((dropT - 0.78) / 0.22) * Math.PI) : 0;

          // Brief crack-shake right before this door shatters
          const crackT = Math.max(0, Math.min(1, (inst.elapsed - (shatterTime - 0.055)) / 0.055));
          const shakeOffset = crackT > 0 ? Math.sin(inst.elapsed * 95.0 + m * 3.1) * 0.14 * crackT * as : 0;

          const a = mr.angle + inst.elapsed * 0.35;
          const mx = inst.cx + Math.cos(a) * r + shakeOffset;
          const mz = inst.cz + Math.sin(a) * r;
          const my = inst.cy + (8.6 - 6.4 * dropEase) * as;

          const scaleX = (1 + 0.06 * settle + 0.08 * crackT) * as;
          const scaleY = (1 - 0.07 * settle + 0.08 * crackT) * as;
          const opacity = Math.min(1, dropT * 3.0);

          mr.mirrorMesh.visible = opacity > 0.015;
          mr.mirrorMesh.position.set(mx, my, mz);
          mr.mirrorMesh.lookAt(inst.cx, my, inst.cz);
          mr.mirrorMesh.scale.set(scaleX, scaleY, as);
          mr.mirrorMat.uniforms.uTime.value = timeSec;
          mr.mirrorMat.uniforms.uOpacity.value = opacity;
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

        const collapseScale =
          (inst.elapsed > 0.62
            ? Math.max(0.18, 1.0 - (inst.elapsed - 0.62) / 0.22)
            : 0.72 + 0.35 * beamT) * as;
        inst.prismMesh.visible = true;
        inst.prismMesh.position.set(inst.cx, coreY, inst.cz);
        inst.prismMesh.scale.setScalar(collapseScale);
        inst.prismMesh.rotation.y += dt * 5.8;
        inst.prismMesh.rotation.x += dt * 3.4;
        inst.prismMat.uniforms.uTime.value = timeSec;
        inst.prismMat.uniforms.uOpacity.value = 1;
      } else {
        inst.mirrors.forEach((m) => {
          m.mirrorMesh.visible = false;
        });
        inst.starFlareA.visible = false;
        inst.starFlareB.visible = false;
        inst.prismMesh.visible = false;
      }

      // 1-by-1 Shattered Door Shards: each door bursts into 3 tumbling shards at its shatterTime
      const shardFade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);
      for (let s = 0; s < SHARD_COUNT; s++) {
        const sh = inst.shards[s];
        if (sh.doorIndex >= mirrorLimit || shardFade <= 0.02) {
          sh.mesh.visible = false;
          continue;
        }
        const shatterTime = 0.54 + sh.doorIndex * shatterStepSec;
        const dtShard = inst.elapsed - shatterTime;
        if (dtShard < 0) {
          sh.mesh.visible = false;
          continue;
        }
        const doorAngle = inst.mirrors[sh.doorIndex].angle + shatterTime * 0.35;
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
        sh.mesh.scale.setScalar(1.05 * shardFade * as);
        sh.mat.uniforms.uTime.value = timeSec;
        sh.mat.uniforms.uOpacity.value = shardFade;
      }

      // Hit-Stop Impact Frame
      if (!inst.impactFired && inst.elapsed >= 0.82) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.095;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#a855f7', 0.095);
        this.hooks.onSpeedLines?.(1.0, 0.6);
        this.hooks.onFlash?.('#fde047', 0.8);
        inst.onImpactCallback?.();
      }

      // Finale: Colossal 12.0m Quasar Jet Beam + 2 Massive Shock Rings + 36 Sparks
      if (uProgress >= 0.33) {
        const bt = Math.min(1, (uProgress - 0.33) / 0.18);
        const ease = 1 - Math.pow(1 - bt, 3);
        const fade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);

        inst.jetMesh.visible = fade > 0.02;
        inst.jetMesh.scale.set((0.85 + 0.65 * ease) * as, Math.max(0.1, ease * 1.15), (0.85 + 0.65 * ease) * as);
        inst.jetMesh.rotation.y -= dt * 4.0;
        inst.jetMat.uniforms.uTime.value = timeSec;
        inst.jetMat.uniforms.uProgress.value = uProgress;
        inst.jetMat.uniforms.uOpacity.value = fade;

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

        const dtBoom = Math.max(0, inst.elapsed - 0.82);

        const sparkLimit = this.lowQuality ? 10 : 18;
        for (let k = 0; k < sparkLimit; k++) {
          const sp = inst.sparks[k];
          if (fade <= 0.02) {
            sp.mesh.visible = false;
            continue;
          }
          sp.mesh.visible = true;
          const r = dtBoom * sp.speed * as;
          const y = Math.max(0.15, 0.8 + dtBoom * sp.ySpeed - 2.3 * dtBoom * dtBoom);
          sp.mesh.position.set(inst.cx + Math.cos(sp.angle) * r, inst.cy + y, inst.cz + Math.sin(sp.angle) * r);
          sp.mesh.rotation.y = -sp.angle;
          sp.mesh.scale.setScalar(1.1 * fade * as);
          sp.mat.uniforms.uTime.value = timeSec;
          sp.mat.uniforms.uOpacity.value = fade;
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
