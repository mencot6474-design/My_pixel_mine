import * as THREE from 'three';
import { type ChibiDef } from './ChibiCatalog';
import {
  getDualSlashArcTexture,
  getHitSparkStarTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
} from './ProceduralTextures3D';

export type PlotAttackStyle = 'crescent' | 'beam' | 'star' | 'twin' | 'meteor';

export interface SignatureProjectileLaunchOpts {
  style: PlotAttackStyle;
  slotIndex: number;
  targetId: number;
  dmg: number;
  comboStep: number;
  accentColor: string;
  sx: number;
  sy: number;
  sz: number;
  ex: number;
  ey: number;
  ez: number;
  attackInterval?: number;
  isBoss?: boolean;
  isUltimate?: boolean;
  hideVisual?: boolean;
}

export interface SignatureProjectileArrival {
  slotIndex: number;
  targetId: number;
  dmg: number;
  comboStep: number;
  accentColor: string;
  sx: number;
  sz: number;
  ex: number;
  ey: number;
  ez: number;
  attackInterval: number;
  isBoss: boolean;
  isUltimate: boolean;
}

interface PooledProjectile {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  trailMesh: THREE.Mesh;
  trailMat: THREE.MeshBasicMaterial;
  active: boolean;
  style: PlotAttackStyle;
  slotIndex: number;
  targetId: number;
  dmg: number;
  comboStep: number;
  accentColor: string;
  attackInterval: number;
  isBoss: boolean;
  isUltimate: boolean;
  startX: number;
  startY: number;
  startZ: number;
  ctrlX: number;
  ctrlY: number;
  ctrlZ: number;
  endX: number;
  endY: number;
  endZ: number;
  age: number;
  duration: number;
  baseScale: number;
  spinSpeed: number;
  startAngle: number;
}

const POOL_CAPACITY = 20;
const LOW_QUALITY_POOL_CAP = 12;

/**
 * Classifies each Chibi into one of 5 distinct ranged podium-attack signatures.
 */
export function getChibiAttackStyle(def: ChibiDef): PlotAttackStyle {
  if (def.rarity === 'twin' || /twin|dual/.test(def.id)) {
    return 'twin';
  }
  if (def.rarity === 'fusion') {
    if (def.id === 'glitch-cheshire') return 'beam';
    if (def.id === 'aether-monarch') return 'meteor';
    if (def.id === 'prism-seraph' || def.id === 'monochrome-saint' || def.id === 'chrono-crystallis') return 'star';
    return 'crescent';
  }
  if (
    def.rarity === 'omega' ||
    /cyber|chrono|void|pulse|prism|neon|laser|rail|circuit|plasma|techno|volt|arc|warden/.test(def.id)
  ) {
    return 'beam';
  }
  if (
    def.rarity === 'novel' ||
    def.rarity === 'rainbow' ||
    def.rarity === 'secret' ||
    def.rarity === 'limited' ||
    /astral|star|seraph|celestial|esper|monarch|comet|nova|luna|oracle|angel|fairy|dream|queen/.test(
      def.id
    )
  ) {
    return 'star';
  }
  if (
    def.rarity === 'exotic' ||
    def.rarity === 'mythic' ||
    /magma|pyre|abyssal|crimson|obsidian|titan|dragon|inferno|lava|flame|guardian|golem|vanguard|iron|quake|forge/.test(
      def.id
    )
  ) {
    return 'meteor';
  }
  return 'crescent';
}

export class SignatureProjectilePool3D {
  public readonly group = new THREE.Group();

  private readonly sharedQuadGeo = new THREE.PlaneGeometry(1, 1);
  private readonly pool: PooledProjectile[] = [];

  private readonly crescentTex: THREE.Texture | null;
  private readonly streakTex: THREE.Texture | null;
  private readonly starTex: THREE.Texture | null;
  private readonly ringTex: THREE.Texture | null;

  private readonly midVec = new THREE.Vector3();
  private readonly alongVec = new THREE.Vector3();
  private readonly toCamVec = new THREE.Vector3();
  private readonly binormalVec = new THREE.Vector3();
  private readonly normalVec = new THREE.Vector3();
  private readonly basisMat = new THREE.Matrix4();
  private readonly tmpArrival: SignatureProjectileArrival = {
    slotIndex: 0,
    targetId: 0,
    dmg: 0,
    comboStep: 0,
    accentColor: '#38bdf8',
    sx: 0,
    sz: 0,
    ex: 0,
    ey: 0,
    ez: 0,
    attackInterval: 0.85,
    isBoss: false,
    isUltimate: false,
  };

  private lowQuality = false;
  private disposed = false;

  constructor() {
    this.crescentTex = getDualSlashArcTexture();
    this.streakTex = getSparkStreakTexture();
    this.starTex = getHitSparkStarTexture();
    this.ringTex = getShockwaveRingTexture();

    for (let i = 0; i < POOL_CAPACITY; i++) {
      const pGroup = new THREE.Group();
      pGroup.visible = false;

      const coreMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        map: this.crescentTex,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreMesh = new THREE.Mesh(this.sharedQuadGeo, coreMat);
      pGroup.add(coreMesh);

      const trailMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        map: this.streakTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const trailMesh = new THREE.Mesh(this.sharedQuadGeo, trailMat);
      pGroup.add(trailMesh);

      this.group.add(pGroup);
      this.pool.push({
        group: pGroup,
        coreMesh,
        coreMat,
        trailMesh,
        trailMat,
        active: false,
        style: 'crescent',
        slotIndex: 0,
        targetId: -1,
        dmg: 0,
        comboStep: 0,
        accentColor: '#38bdf8',
        attackInterval: 0.85,
        isBoss: false,
        isUltimate: false,
        startX: 0,
        startY: 0,
        startZ: 0,
        ctrlX: 0,
        ctrlY: 0,
        ctrlZ: 0,
        endX: 0,
        endY: 0,
        endZ: 0,
        age: 0,
        duration: 0.18,
        baseScale: 1,
        spinSpeed: 0,
        startAngle: 0,
      });
    }
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }

  public clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      p.active = false;
      p.group.visible = false;
    }
  }

  private acquire(): PooledProjectile | null {
    const cap = this.lowQuality ? LOW_QUALITY_POOL_CAP : POOL_CAPACITY;
    for (let i = 0; i < cap; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  private configure(
    p: PooledProjectile,
    opts: SignatureProjectileLaunchOpts,
    dmg: number,
    comboStep: number,
    sx: number,
    sy: number,
    curveLateral: number,
    isTwinMirror: boolean
  ): void {
    p.active = true;
    p.style = opts.style;
    p.slotIndex = opts.slotIndex;
    p.targetId = opts.targetId;
    p.dmg = dmg;
    p.comboStep = comboStep;
    p.accentColor = opts.accentColor;
    p.attackInterval = opts.attackInterval ?? 0.85;
    p.isBoss = Boolean(opts.isBoss);
    p.isUltimate = Boolean(opts.isUltimate);
    p.startX = sx;
    p.startY = sy;
    p.startZ = opts.sz;
    p.endX = opts.ex;
    p.endY = opts.ey;
    p.endZ = opts.ez;
    p.age = 0;

    const midX = (sx + opts.ex) * 0.5;
    const midY = (sy + opts.ey) * 0.5;
    const midZ = (opts.sz + opts.ez) * 0.5;

    p.coreMat.color.set(opts.accentColor);
    p.trailMat.color.set('#ffffff').lerp(p.coreMat.color, 0.45);
    p.trailMesh.visible = false;
    p.coreMesh.rotation.set(0, 0, 0);
    p.trailMesh.rotation.set(0, 0, 0);
    p.group.rotation.set(0, 0, 0);

    if (opts.style === 'beam') {
      p.duration = 0.12;
      p.ctrlX = midX;
      p.ctrlY = midY;
      p.ctrlZ = midZ;
      p.baseScale = 0.68;
      p.spinSpeed = 0;
      p.startAngle = 0;
      p.coreMat.map = this.streakTex;
      p.trailMat.map = this.streakTex;
      p.trailMesh.visible = true;
    } else if (opts.style === 'meteor') {
      p.duration = 0.24;
      p.ctrlX = sx * 0.35 + opts.ex * 0.65;
      p.ctrlY = Math.max(sy, opts.ey) + 4.3;
      p.ctrlZ = midZ;
      p.baseScale = 1.55;
      p.spinSpeed = 9.5;
      p.startAngle = comboStep * 0.9;
      p.coreMat.map = this.starTex;
      p.trailMat.map = this.ringTex;
      p.trailMesh.visible = !this.lowQuality;
    } else if (opts.style === 'star') {
      p.duration = 0.21;
      p.ctrlX = midX + curveLateral * 1.15;
      p.ctrlY = Math.max(sy, opts.ey) + 2.1;
      p.ctrlZ = midZ;
      p.baseScale = 1.35;
      p.spinSpeed = comboStep % 2 === 0 ? 11.5 : -11.5;
      p.startAngle = opts.slotIndex * 0.5;
      p.coreMat.map = this.starTex;
      p.trailMat.map = this.ringTex;
      p.trailMesh.visible = !this.lowQuality;
    } else if (opts.style === 'twin') {
      p.duration = 0.16;
      const side = isTwinMirror ? -1.25 : 1.25;
      p.ctrlX = midX + side;
      p.ctrlY = midY + 1.05;
      p.ctrlZ = midZ;
      p.baseScale = this.lowQuality ? 1.45 : 1.15;
      p.spinSpeed = isTwinMirror ? -14 : 14;
      p.startAngle = isTwinMirror ? -0.6 : 0.6;
      p.coreMat.map = this.crescentTex;
      p.trailMat.map = this.starTex;
      p.trailMesh.visible = false;
    } else {
      p.duration = 0.17;
      p.ctrlX = midX + curveLateral * 0.75;
      p.ctrlY = midY + 0.75;
      p.ctrlZ = midZ;
      p.baseScale = 1.5;
      p.spinSpeed = comboStep % 2 === 0 ? 13.5 : -13.5;
      p.startAngle = (comboStep - 1) * 0.7;
      p.coreMat.map = this.crescentTex;
      p.trailMat.map = this.streakTex;
      p.trailMesh.visible = !this.lowQuality;
    }

    p.group.position.set(sx, sy, opts.sz);
    p.group.visible = !opts.hideVisual;
  }

  public launch(
    opts: SignatureProjectileLaunchOpts,
    onOverflow?: (arrival: SignatureProjectileArrival) => void
  ): void {
    if (this.disposed) return;
    const p1 = this.acquire();
    if (!p1) {
      if (opts.dmg > 0 && onOverflow) {
        const a = this.tmpArrival;
        a.slotIndex = opts.slotIndex;
        a.targetId = opts.targetId;
        a.dmg = opts.dmg;
        a.comboStep = opts.comboStep;
        a.accentColor = opts.accentColor;
        a.sx = opts.sx;
        a.sz = opts.sz;
        a.ex = opts.ex;
        a.ey = opts.ey;
        a.ez = opts.ez;
        a.attackInterval = opts.attackInterval ?? 0.85;
        a.isBoss = Boolean(opts.isBoss);
        a.isUltimate = Boolean(opts.isUltimate);
        onOverflow(a);
      }
      return;
    }

    const comboOffset = (opts.comboStep - 1) * 0.9;
    this.configure(p1, opts, opts.dmg, opts.comboStep, opts.sx, opts.sy, comboOffset, false);

    if (opts.style === 'twin' && !this.lowQuality && !opts.hideVisual) {
      const p2 = this.acquire();
      if (p2) {
        this.configure(
          p2,
          opts,
          0,
          (opts.comboStep + 1) % 3,
          opts.sx + 0.25,
          opts.sy + 0.15,
          -1.35,
          true
        );
      }
    }
  }

  public flushPending(onArrive: (arrival: SignatureProjectileArrival) => void): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      if (p.dmg > 0) {
        const a = this.tmpArrival;
        a.slotIndex = p.slotIndex;
        a.targetId = p.targetId;
        a.dmg = p.dmg;
        a.comboStep = p.comboStep;
        a.accentColor = p.accentColor;
        a.sx = p.startX;
        a.sz = p.startZ;
        a.ex = p.endX;
        a.ey = p.endY;
        a.ez = p.endZ;
        a.attackInterval = p.attackInterval;
        a.isBoss = p.isBoss;
        a.isUltimate = p.isUltimate;
        onArrive(a);
      }
      p.active = false;
      p.group.visible = false;
    }
  }

  public step(
    dtSec: number,
    camera: THREE.Camera | undefined,
    onArrive: (arrival: SignatureProjectileArrival) => void
  ): void {
    if (this.disposed) return;
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.age += safeDt;
      const u = Math.min(1, p.age / p.duration);

      if (p.style === 'beam') {
        const mx = (p.startX + p.endX) * 0.5;
        const my = (p.startY + p.endY) * 0.5;
        const mz = (p.startZ + p.endZ) * 0.5;
        p.group.position.set(mx, my, mz);

        this.alongVec.set(p.endX - p.startX, p.endY - p.startY, p.endZ - p.startZ);
        const beamLen = Math.max(0.4, this.alongVec.length());
        this.alongVec.multiplyScalar(1 / beamLen);

        this.midVec.set(mx, my, mz);
        if (camera) {
          this.toCamVec.subVectors(camera.position, this.midVec).normalize();
        } else {
          this.toCamVec.set(0, 0.5, 1).normalize();
        }
        this.binormalVec.crossVectors(this.toCamVec, this.alongVec);
        if (this.binormalVec.lengthSq() < 0.0001) {
          this.binormalVec.set(0, 1, 0);
        } else {
          this.binormalVec.normalize();
        }
        this.normalVec.crossVectors(this.alongVec, this.binormalVec).normalize();
        this.basisMat.makeBasis(this.alongVec, this.binormalVec, this.normalVec);
        p.group.quaternion.setFromRotationMatrix(this.basisMat);

        const pulse = Math.sin(u * Math.PI);
        const width = p.baseScale * (0.45 + pulse * 0.9);
        p.coreMesh.scale.set(beamLen, width, 1);
        p.coreMat.opacity = Math.min(1, 0.72 + pulse * 0.28);

        p.trailMesh.scale.set(beamLen, width * 0.42, 1);
        p.trailMat.opacity = Math.min(1, 0.68 + pulse * 0.32);
      } else {
        const inv = 1 - u;
        const a = inv * inv;
        const b = 2 * inv * u;
        const c = u * u;
        p.group.position.set(
          a * p.startX + b * p.ctrlX + c * p.endX,
          a * p.startY + b * p.ctrlY + c * p.endY,
          a * p.startZ + b * p.ctrlZ + c * p.endZ
        );
        if (camera) {
          p.group.quaternion.copy(camera.quaternion);
        }

        const scalePulse = u < 0.2 ? 0.6 + u * 2.5 : u > 0.85 ? 1.1 - (u - 0.85) * 2.0 : 1.05;
        const s = p.baseScale * scalePulse;
        p.coreMesh.scale.set(s, s, 1);
        p.coreMesh.rotation.z = p.startAngle + p.age * p.spinSpeed;
        p.coreMat.opacity = u > 0.88 ? Math.max(0.28, 1 - (u - 0.88) * 6.0) : 1.0;

        if (p.trailMesh.visible) {
          const ts = s * (p.style === 'meteor' ? 1.25 : 0.88);
          p.trailMesh.scale.set(ts, ts, 1);
          p.trailMesh.rotation.z = -p.coreMesh.rotation.z * 0.65;
          p.trailMat.opacity = p.coreMat.opacity * 0.78;
        }
      }

      if (u >= 1) {
        if (p.dmg > 0) {
          const a = this.tmpArrival;
          a.slotIndex = p.slotIndex;
          a.targetId = p.targetId;
          a.dmg = p.dmg;
          a.comboStep = p.comboStep;
          a.accentColor = p.accentColor;
          a.sx = p.startX;
          a.sz = p.startZ;
          a.ex = p.endX;
          a.ey = p.endY;
          a.ez = p.endZ;
          a.attackInterval = p.attackInterval;
          a.isBoss = p.isBoss;
          a.isUltimate = p.isUltimate;
          onArrive(a);
        }
        p.active = false;
        p.group.visible = false;
      }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.sharedQuadGeo.dispose();
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].coreMat.dispose();
      this.pool[i].trailMat.dispose();
    }
  }
}
