import * as THREE from 'three';
import { type PitEventKind } from '../game/PitEventsDomain';
import { type WeatherId } from '../game/WeatherData';
import { type ChibiDef } from './ChibiCatalog';
import { type OreVariantKey } from './MineWorldPalette';
import { type OrePit3D } from './OrePit3D';
import { type PlotPedestal3D } from './PlotPedestal3D';
import {
  getDualSlashArcTexture,
  getHitSparkStarTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
} from './ProceduralTextures3D';

export type PlotAttackStyle = 'crescent' | 'beam' | 'star' | 'twin' | 'meteor';

export type PlotOreBrokenCb = (
  variantKey: OreVariantKey,
  meteorWeatherId?: WeatherId,
  pitEventKind?: PitEventKind,
  worldPos?: { x: number; y: number; z: number }
) => void;

export type PlotOreHitCb = (
  dmg: number,
  worldX: number,
  worldY: number,
  worldZ: number,
  isMeteor?: boolean
) => void;

interface PlotUnitState {
  slotIndex: number;
  def: ChibiDef;
  style: PlotAttackStyle;
  dmg: number;
  speed: number;
  miningMult: number;
  cooldown: number;
  comboStep: number;
  targetOreId: number | null;
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
  targetOreId: number;
  strikeDamage: number;
  comboStep: number;
  accentColor: string;
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

type AliveNodeTarget = ReturnType<OrePit3D['getAliveNodesInfo']>[number];

const POOL_CAPACITY = 20;
const LOW_QUALITY_POOL_CAP = 12;

/**
 * Classifies each Chibi into one of 5 distinct plot-to-pit attack signatures.
 */
export function getChibiAttackStyle(def: ChibiDef): PlotAttackStyle {
  if (def.rarity === 'twin' || /twin|dual/.test(def.id)) {
    return 'twin';
  }
  if (
    def.rarity === 'omega' ||
    /cyber|chrono|void|pulse|prism|neon|laser|rail|circuit|plasma|techno|volt|arc|warden/.test(def.id)
  ) {
    return 'beam';
  }
  if (
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

export class PlotAttackController3D {
  public readonly group = new THREE.Group();

  private readonly units = new Map<number, PlotUnitState>();
  private readonly sharedQuadGeo = new THREE.PlaneGeometry(1, 1);
  private readonly pool: PooledProjectile[] = [];

  private readonly crescentTex: THREE.Texture | null;
  private readonly streakTex: THREE.Texture | null;
  private readonly starTex: THREE.Texture | null;
  private readonly ringTex: THREE.Texture | null;

  private readonly originVec = new THREE.Vector3();
  private readonly midVec = new THREE.Vector3();
  private readonly alongVec = new THREE.Vector3();
  private readonly toCamVec = new THREE.Vector3();
  private readonly binormalVec = new THREE.Vector3();
  private readonly normalVec = new THREE.Vector3();
  private readonly basisMat = new THREE.Matrix4();
  private readonly tmpWorldPos = { x: 0, y: 0, z: 0 };

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
        blending: THREE.AdditiveBlending,
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
        targetOreId: -1,
        strikeDamage: 0,
        comboStep: 0,
        accentColor: '#38bdf8',
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

  public setSlotUnit(
    slotIndex: number,
    def: ChibiDef | null,
    stats?: { dmg: number; speed: number; miningMult: number }
  ): void {
    if (!def) {
      this.units.delete(slotIndex);
      return;
    }
    const prev = this.units.get(slotIndex);
    const dmg = stats?.dmg ?? prev?.dmg ?? def.baseDps;
    const speed = stats?.speed ?? prev?.speed ?? 1;
    const miningMult = stats?.miningMult ?? prev?.miningMult ?? 1;
    this.units.set(slotIndex, {
      slotIndex,
      def,
      style: getChibiAttackStyle(def),
      dmg,
      speed,
      miningMult,
      cooldown: prev && prev.def.id === def.id ? prev.cooldown : 0.12 + (slotIndex % 5) * 0.11,
      comboStep: prev?.comboStep ?? slotIndex % 3,
      targetOreId: prev?.targetOreId ?? null,
    });
  }

  public setSlotStats(slotIndex: number, dmg: number, speed: number, miningMult: number): void {
    const unit = this.units.get(slotIndex);
    if (!unit) return;
    unit.dmg = dmg;
    unit.speed = speed;
    unit.miningMult = miningMult;
  }

  public getUnitCount(): number {
    return this.units.size;
  }

  public getActiveProjectileCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }

  public clearProjectiles(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      p.active = false;
      p.group.visible = false;
    }
  }

  private pickTarget(
    unit: PlotUnitState,
    alive: AliveNodeTarget[],
    pedestalX: number
  ): AliveNodeTarget | null {
    if (alive.length === 0) {
      unit.targetOreId = null;
      return null;
    }
    if (unit.targetOreId !== null) {
      for (let i = 0; i < alive.length; i++) {
        if (alive[i].id === unit.targetOreId) {
          return alive[i];
        }
      }
    }
    // Prefer spreading across pit nodes near pedestal X while balancing slot index
    let best = alive[(unit.slotIndex * 3) % alive.length];
    let bestScore = Infinity;
    for (let i = 0; i < alive.length; i++) {
      const n = alive[i];
      const dx = Math.abs(n.worldX - pedestalX);
      const eventBias = n.isMeteor || n.pitEventKind ? -3.0 : 0;
      const spreadBias = ((i + unit.slotIndex) % 3) * 0.75;
      const score = dx * 0.45 + spreadBias + eventBias;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }
    unit.targetOreId = best.id;
    return best;
  }

  private acquireProjectile(): PooledProjectile | null {
    const cap = this.lowQuality ? LOW_QUALITY_POOL_CAP : POOL_CAPACITY;
    for (let i = 0; i < cap; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  private applyImpact(
    pit: OrePit3D,
    targetOreId: number,
    fallbackTarget: AliveNodeTarget | null,
    strikeDamage: number,
    accentColor: string,
    originX: number,
    originZ: number,
    comboStep: number,
    renderVisuals: boolean,
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    const alive = pit.getAliveNodesInfo();
    let target: AliveNodeTarget | null = null;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i].id === targetOreId) {
        target = alive[i];
        break;
      }
    }
    if (!target) {
      target = fallbackTarget ?? alive[0] ?? null;
    }
    if (!target) return;

    const hitRes = pit.hitNode(
      target.id,
      strikeDamage,
      false,
      undefined,
      renderVisuals
        ? {
            accentColor,
            attackerX: originX,
            attackerZ: originZ,
            comboStep,
          }
        : undefined
    );
    if (!hitRes) return;

    const hitY = target.worldY + 0.7;
    if (renderVisuals) {
      onOreHit?.(hitRes.dmgDealt, target.worldX, hitY, target.worldZ, hitRes.isMeteor);
    }
    if (hitRes.broken) {
      this.tmpWorldPos.x = target.worldX;
      this.tmpWorldPos.y = hitY;
      this.tmpWorldPos.z = target.worldZ;
      onOreBroken?.(
        hitRes.variantKey,
        hitRes.meteorWeatherId,
        hitRes.pitEventKind,
        renderVisuals ? this.tmpWorldPos : undefined
      );
    }
  }

  private spawnAttackProjectile(
    unit: PlotUnitState,
    pedestal: PlotPedestal3D,
    target: AliveNodeTarget,
    strikeDamage: number,
    pit: OrePit3D,
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    pedestal.getAttackOriginWorldPosition(this.originVec);
    const sx = this.originVec.x;
    const sy = this.originVec.y;
    const sz = this.originVec.z;
    const ex = target.worldX;
    const ey = target.worldY + 0.65;
    const ez = target.worldZ;
    const accentColor = pedestal.getActiveAccentColor();

    const p1 = this.acquireProjectile();
    if (!p1) {
      // Fallback: if visual pool saturated under extreme speed, still deal damage reliably
      this.applyImpact(
        pit,
        target.id,
        target,
        strikeDamage,
        accentColor,
        sx,
        sz,
        unit.comboStep,
        true,
        onOreBroken,
        onOreHit
      );
      return;
    }

    const comboOffset = (unit.comboStep - 1) * 0.9;
    this.configureProjectile(
      p1,
      unit.style,
      unit.slotIndex,
      target.id,
      strikeDamage,
      unit.comboStep,
      accentColor,
      sx,
      sy,
      sz,
      ex,
      ey,
      ez,
      comboOffset,
      false
    );

    // Twin units fire a mirrored partner bolt in normal/high quality for signature crossed strike
    if (unit.style === 'twin' && !this.lowQuality) {
      const p2 = this.acquireProjectile();
      if (p2) {
        this.configureProjectile(
          p2,
          'twin',
          unit.slotIndex,
          target.id,
          0,
          (unit.comboStep + 1) % 3,
          accentColor,
          sx + 0.25,
          sy + 0.15,
          sz,
          ex,
          ey,
          ez,
          -1.35,
          true
        );
      }
    }
  }

  private configureProjectile(
    p: PooledProjectile,
    style: PlotAttackStyle,
    slotIndex: number,
    targetOreId: number,
    strikeDamage: number,
    comboStep: number,
    accentColor: string,
    sx: number,
    sy: number,
    sz: number,
    ex: number,
    ey: number,
    ez: number,
    curveLateral: number,
    isTwinMirror: boolean
  ): void {
    p.active = true;
    p.style = style;
    p.slotIndex = slotIndex;
    p.targetOreId = targetOreId;
    p.strikeDamage = strikeDamage;
    p.comboStep = comboStep;
    p.accentColor = accentColor;
    p.startX = sx;
    p.startY = sy;
    p.startZ = sz;
    p.endX = ex;
    p.endY = ey;
    p.endZ = ez;
    p.age = 0;

    const midX = (sx + ex) * 0.5;
    const midY = (sy + ey) * 0.5;
    const midZ = (sz + ez) * 0.5;

    p.coreMat.color.set(accentColor);
    p.trailMat.color.set('#ffffff').lerp(p.coreMat.color, 0.45);
    p.trailMesh.visible = false;
    p.coreMesh.rotation.set(0, 0, 0);
    p.trailMesh.rotation.set(0, 0, 0);
    p.group.rotation.set(0, 0, 0);

    if (style === 'beam') {
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
    } else if (style === 'meteor') {
      p.duration = 0.24;
      p.ctrlX = sx * 0.35 + ex * 0.65;
      p.ctrlY = Math.max(sy, ey) + 4.3;
      p.ctrlZ = midZ;
      p.baseScale = 1.55;
      p.spinSpeed = 9.5;
      p.startAngle = comboStep * 0.9;
      p.coreMat.map = this.starTex;
      p.trailMat.map = this.ringTex;
      p.trailMesh.visible = !this.lowQuality;
    } else if (style === 'star') {
      p.duration = 0.21;
      p.ctrlX = midX + curveLateral * 1.15;
      p.ctrlY = Math.max(sy, ey) + 2.1;
      p.ctrlZ = midZ;
      p.baseScale = 1.35;
      p.spinSpeed = comboStep % 2 === 0 ? 11.5 : -11.5;
      p.startAngle = slotIndex * 0.5;
      p.coreMat.map = this.starTex;
      p.trailMat.map = this.ringTex;
      p.trailMesh.visible = !this.lowQuality;
    } else if (style === 'twin') {
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
      // 'crescent' slash wave
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

    p.coreMat.needsUpdate = true;
    p.trailMat.needsUpdate = true;
    p.group.position.set(sx, sy, sz);
    p.group.visible = true;
  }

  private flushAllPendingForHeadless(
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      if (p.strikeDamage > 0) {
        const ped = pedestals[p.slotIndex];
        const originX = ped ? ped.group.position.x : p.startX;
        const originZ = ped ? ped.group.position.z : p.startZ;
        this.applyImpact(
          pit,
          p.targetOreId,
          null,
          p.strikeDamage,
          p.accentColor,
          originX,
          originZ,
          p.comboStep,
          false,
          onOreBroken,
          onOreHit
        );
      }
      p.active = false;
      p.group.visible = false;
    }
  }

  private stepActiveProjectiles(
    safeDt: number,
    camera: THREE.Camera,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
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
        this.toCamVec.subVectors(camera.position, this.midVec).normalize();
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
        p.coreMat.opacity = Math.min(1, 0.35 + pulse * 0.65);

        p.trailMesh.scale.set(beamLen, width * 0.38, 1);
        p.trailMat.opacity = Math.min(1, 0.5 + pulse * 0.5);
      } else {
        // Quadratic Bezier interpolation: (1-u)^2 * P0 + 2(1-u)u * P1 + u^2 * P2
        const inv = 1 - u;
        const a = inv * inv;
        const b = 2 * inv * u;
        const c = u * u;
        p.group.position.set(
          a * p.startX + b * p.ctrlX + c * p.endX,
          a * p.startY + b * p.ctrlY + c * p.endY,
          a * p.startZ + b * p.ctrlZ + c * p.endZ
        );
        p.group.quaternion.copy(camera.quaternion);

        const scalePulse = u < 0.2 ? 0.6 + u * 2.5 : u > 0.85 ? 1.1 - (u - 0.85) * 2.0 : 1.05;
        const s = p.baseScale * scalePulse;
        p.coreMesh.scale.set(s, s, 1);
        p.coreMesh.rotation.z = p.startAngle + p.age * p.spinSpeed;
        p.coreMat.opacity = u > 0.88 ? Math.max(0.2, 1 - (u - 0.88) * 6.5) : 0.96;

        if (p.trailMesh.visible) {
          const ts = s * (p.style === 'meteor' ? 1.25 : 0.88);
          p.trailMesh.scale.set(ts, ts, 1);
          p.trailMesh.rotation.z = -p.coreMesh.rotation.z * 0.65;
          p.trailMat.opacity = p.coreMat.opacity * 0.55;
        }
      }

      if (u >= 1) {
        if (p.strikeDamage > 0) {
          const ped = pedestals[p.slotIndex];
          const originX = ped ? ped.group.position.x : p.startX;
          const originZ = ped ? ped.group.position.z : p.startZ;
          this.applyImpact(
            pit,
            p.targetOreId,
            null,
            p.strikeDamage,
            p.accentColor,
            originX,
            originZ,
            p.comboStep,
            true,
            onOreBroken,
            onOreHit
          );
        }
        p.active = false;
        p.group.visible = false;
      }
    }
  }

  public update(
    dtSec: number,
    camera: THREE.Camera,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    renderVisuals: boolean,
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    if (this.disposed) return;
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);

    if (!renderVisuals) {
      this.flushAllPendingForHeadless(pit, pedestals, onOreBroken, onOreHit);
    }

    const alive = pit.getAliveNodesInfo();

    for (const unit of this.units.values()) {
      const ped = pedestals[unit.slotIndex];
      const pedX = ped ? ped.group.position.x : (unit.slotIndex - 2) * 3.22;
      const pedZ = ped ? ped.group.position.z : -4.58;

      if (alive.length === 0) {
        unit.cooldown = Math.max(0.08, unit.cooldown - safeDt);
        continue;
      }

      const target = this.pickTarget(unit, alive, pedX);
      if (!target) continue;

      unit.cooldown -= safeDt;
      if (unit.cooldown <= 0) {
        const attackInterval = Math.max(0.28, 0.85 / Math.max(1, unit.miningMult));
        unit.cooldown = attackInterval;
        const strikeDamage = Math.max(1, unit.dmg * attackInterval);

        if (renderVisuals && ped) {
          ped.setChibiFacing(target.worldX < pedX ? -1 : 1);
          ped.triggerChibiAttack(Math.min(0.45, attackInterval * 0.92), unit.comboStep);
          this.spawnAttackProjectile(
            unit,
            ped,
            target,
            strikeDamage,
            pit,
            onOreBroken,
            onOreHit
          );
        } else {
          this.applyImpact(
            pit,
            target.id,
            target,
            strikeDamage,
            ped ? ped.getActiveAccentColor() : unit.def.accentColor,
            pedX,
            pedZ,
            unit.comboStep,
            false,
            onOreBroken,
            onOreHit
          );
        }
        unit.comboStep = (unit.comboStep + 1) % 3;
      }
    }

    if (renderVisuals) {
      this.stepActiveProjectiles(safeDt, camera, pit, pedestals, onOreBroken, onOreHit);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearProjectiles();
    this.units.clear();
    this.sharedQuadGeo.dispose();
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].coreMat.dispose();
      this.pool[i].trailMat.dispose();
    }
  }
}
