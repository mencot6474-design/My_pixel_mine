import * as THREE from 'three';
import { type PitEventKind } from '../game/PitEventsDomain';
import { type WeatherId } from '../game/WeatherData';
import { type ChibiDef } from './ChibiCatalog';
import { type OreVariantKey } from './MineWorldPalette';
import { type OrePit3D } from './OrePit3D';
import { type PlotPedestal3D } from './PlotPedestal3D';
import {
  getChibiAttackStyle,
  type PlotAttackStyle,
  type SignatureProjectileArrival,
  SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';

export { getChibiAttackStyle, type PlotAttackStyle };

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

type AliveNodeTarget = ReturnType<OrePit3D['getAliveNodesInfo']>[number];

export class PlotAttackController3D {
  public readonly group = new THREE.Group();

  private readonly units = new Map<number, PlotUnitState>();
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly originVec = new THREE.Vector3();
  private readonly tmpWorldPos = { x: 0, y: 0, z: 0 };

  private disposed = false;

  constructor() {
    this.group.add(this.projectiles.group);
  }

  public setLowQuality(low: boolean): void {
    this.projectiles.setLowQuality(low);
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
    return this.projectiles.getActiveCount();
  }

  public clearProjectiles(): void {
    this.projectiles.clear();
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

  private handleArrival(
    a: SignatureProjectileArrival,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    renderVisuals: boolean,
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    const ped = pedestals[a.slotIndex];
    const originX = ped ? ped.group.position.x : a.sx;
    const originZ = ped ? ped.group.position.z : a.sz;
    this.applyImpact(
      pit,
      a.targetId,
      null,
      a.dmg,
      a.accentColor,
      originX,
      originZ,
      a.comboStep,
      renderVisuals,
      onOreBroken,
      onOreHit
    );
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
      this.projectiles.flushPending((a) =>
        this.handleArrival(a, pit, pedestals, false, onOreBroken, onOreHit)
      );
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
          ped.getAttackOriginWorldPosition(this.originVec);
          const accentColor = ped.getActiveAccentColor();
          this.projectiles.launch(
            {
              style: unit.style,
              slotIndex: unit.slotIndex,
              targetId: target.id,
              dmg: strikeDamage,
              comboStep: unit.comboStep,
              accentColor,
              sx: this.originVec.x,
              sy: this.originVec.y,
              sz: this.originVec.z,
              ex: target.worldX,
              ey: target.worldY + 0.65,
              ez: target.worldZ,
            },
            (a) => this.handleArrival(a, pit, pedestals, true, onOreBroken, onOreHit)
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
      this.projectiles.step(safeDt, camera, (a) =>
        this.handleArrival(a, pit, pedestals, true, onOreBroken, onOreHit)
      );
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.units.clear();
    this.projectiles.dispose();
  }
}
