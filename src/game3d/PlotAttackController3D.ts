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
} from './SignatureProjectilePool3D';
import {
  TierAttackVfxPool3D,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierAttackVfx3D';

export { getChibiAttackStyle, type PlotAttackStyle };

interface PendingBlitzStrike {
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
  delayLeft: number;
}

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
  isMeteor?: boolean,
  isCrit?: boolean
) => void;

interface PlotUnitState {
  slotIndex: number;
  def: ChibiDef;
  style: PlotAttackStyle;
  dmg: number;
  speed: number;
  miningMult: number;
  critChance: number;
  critMult: number;
  cooldown: number;
  comboStep: number;
  targetOreId: number | null;
}

type AliveNodeTarget = ReturnType<OrePit3D['getAliveNodesInfo']>[number];

const MINE_PIT_VFX_SCALE = 0.72;
const MINE_PIT_MOTION_SCALE = 0.84;

/** Minimum 3 ore nodes hit per AoE attack, scaling up to 6 for wide-AoE apex rarities. */
export function getAoeTargetCount(rarity: string): number {
  if (rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega') return 6;
  if (rarity === 'secret') return 5;
  if (
    rarity === 'epic' ||
    rarity === 'legendary' ||
    rarity === 'rainbow' ||
    rarity === 'mythic' ||
    rarity === 'exotic'
  ) {
    return 4;
  }
  return 3;
}

function getAoeSplashDamageMult(rarity: string): number {
  return rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega' ? 1.0 : 0.8;
}

function getMineAttackIntervalSec(miningMult: number): number {
  const safeMult = Math.max(1, miningMult);
  return Math.max(1.28, Math.min(2.05, 1.85 / (1 + (safeMult - 1) * 0.25)));
}

function getMineBlitzDurationSec(rarity: string, attackInterval: number): number {
  let target = 1.02;
  if (rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega') {
    target = 1.42;
  } else if (
    rarity === 'epic' ||
    rarity === 'legendary' ||
    rarity === 'rainbow' ||
    rarity === 'mythic' ||
    rarity === 'exotic' ||
    rarity === 'secret'
  ) {
    target = 1.2;
  }
  return Math.max(0.88, Math.min(attackInterval * 0.94, target));
}

function computeZoneWideCenter(
  target: WorldPoint3,
  allTargets: readonly WorldPoint3[]
): WorldPoint3 {
  if (allTargets.length === 0) return target;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < allTargets.length; i++) {
    cx += allTargets[i].x;
    cy += allTargets[i].y;
    cz += allTargets[i].z;
  }
  cx /= allTargets.length;
  cy /= allTargets.length;
  cz /= allTargets.length;
  // Blend 68% target stone + 32% pit center so multi-unit wide AoEs spread across pit zones cleanly
  const bx = Math.max(-2.6, Math.min(2.6, target.x * 0.68 + cx * 0.32));
  const bz = Math.max(0.35, Math.min(3.35, target.z * 0.68 + cz * 0.32));
  return { x: bx, y: target.y * 0.68 + cy * 0.32, z: bz };
}

export class PlotAttackController3D {
  public readonly group = new THREE.Group();

  private readonly units = new Map<number, PlotUnitState>();
  private readonly pendingStrikes: PendingBlitzStrike[] = [];
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly alivePointScratch: WorldPoint3[] = [];
  private readonly aoeTargetsScratch: AliveNodeTarget[] = [];
  private readonly originVec = new THREE.Vector3();
  private readonly tmpWorldPos = { x: 0, y: 0, z: 0 };

  private disposed = false;

  constructor() {
    this.group.add(this.tierVfx.group);
  }

  public setTierVfxHooks(hooks: TierVfxHooks): void {
    this.tierVfx.setHooks(hooks);
  }

  public setLowQuality(low: boolean): void {
    this.tierVfx.setLowQuality(low);
  }

  public setSlotUnit(
    slotIndex: number,
    def: ChibiDef | null,
    stats?: { dmg: number; speed: number; miningMult: number; critChance?: number; critMult?: number }
  ): void {
    if (!def) {
      this.units.delete(slotIndex);
      return;
    }
    const prev = this.units.get(slotIndex);
    const dmg = stats?.dmg ?? prev?.dmg ?? def.baseDps;
    const speed = stats?.speed ?? prev?.speed ?? 1;
    const miningMult = stats?.miningMult ?? prev?.miningMult ?? 1;
    const critChance = stats?.critChance ?? prev?.critChance ?? 0.05;
    const critMult = stats?.critMult ?? prev?.critMult ?? 2.25;
    this.units.set(slotIndex, {
      slotIndex,
      def,
      style: getChibiAttackStyle(def),
      dmg,
      speed,
      miningMult,
      critChance,
      critMult,
      cooldown: prev && prev.def.id === def.id ? prev.cooldown : 0.12 + (slotIndex % 5) * 0.34,
      comboStep: prev?.comboStep ?? slotIndex % 3,
      targetOreId: prev?.targetOreId ?? null,
    });
  }

  public setSlotStats(
    slotIndex: number,
    dmg: number,
    speed: number,
    miningMult: number,
    critChance?: number,
    critMult?: number
  ): void {
    const unit = this.units.get(slotIndex);
    if (!unit) return;
    unit.dmg = dmg;
    unit.speed = speed;
    unit.miningMult = miningMult;
    if (critChance !== undefined) unit.critChance = critChance;
    if (critMult !== undefined) unit.critMult = critMult;
  }

  public getUnitCount(): number {
    return this.units.size;
  }

  public getActiveProjectileCount(): number {
    return this.pendingStrikes.length;
  }

  public clearProjectiles(): void {
    this.pendingStrikes.length = 0;
    this.tierVfx.clear();
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
      let claimedPenalty = 0;
      for (const other of this.units.values()) {
        if (other.slotIndex !== unit.slotIndex && other.targetOreId === n.id) {
          claimedPenalty += 3.2;
        }
      }
      const spreadBias = ((i + unit.slotIndex) % 3) * 0.75;
      const score = dx * 0.45 + spreadBias + eventBias + claimedPenalty;
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
    onOreHit?: PlotOreHitCb,
    critChance = 0,
    critMult = 2.25,
    rarity = 'common'
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

    const maxTargets = Math.min(alive.length, getAoeTargetCount(rarity));
    this.aoeTargetsScratch.length = 0;
    this.aoeTargetsScratch.push(target);
    if (maxTargets > 1 && alive.length > 1) {
      // Pick closest surrounding ores so AoE strikes cleave at least 3 nodes simultaneously
      const primaryX = target.worldX;
      const primaryZ = target.worldZ;
      const candidates: Array<{ node: AliveNodeTarget; distSq: number }> = [];
      for (let i = 0; i < alive.length; i++) {
        const n = alive[i];
        if (n.id === target.id) continue;
        const dx = n.worldX - primaryX;
        const dz = n.worldZ - primaryZ;
        candidates.push({ node: n, distSq: dx * dx + dz * dz });
      }
      candidates.sort((a, b) => a.distSq - b.distSq);
      for (let i = 0; i < candidates.length && this.aoeTargetsScratch.length < maxTargets; i++) {
        this.aoeTargetsScratch.push(candidates[i].node);
      }
    }

    const isCrit = critChance > 0 && Math.random() < critChance;
    const finalDmg = isCrit ? Math.max(1, Math.round(strikeDamage * critMult)) : strikeDamage;
    const splashMult = getAoeSplashDamageMult(rarity);

    for (let ti = 0; ti < this.aoeTargetsScratch.length; ti++) {
      const hitNodeTarget = this.aoeTargetsScratch[ti];
      const dmgForNode = ti === 0 ? finalDmg : Math.max(1, Math.round(finalDmg * splashMult));

      const hitRes = pit.hitNode(
        hitNodeTarget.id,
        dmgForNode,
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
      if (!hitRes) continue;

      const hitY = hitNodeTarget.worldY + 0.7;
      if (renderVisuals) {
        onOreHit?.(hitRes.dmgDealt, hitNodeTarget.worldX, hitY, hitNodeTarget.worldZ, hitRes.isMeteor, isCrit);
      }
      if (hitRes.broken) {
        this.tmpWorldPos.x = hitNodeTarget.worldX;
        this.tmpWorldPos.y = hitY;
        this.tmpWorldPos.z = hitNodeTarget.worldZ;
        onOreBroken?.(
          hitRes.variantKey,
          hitRes.meteorWeatherId,
          hitRes.pitEventKind,
          renderVisuals ? this.tmpWorldPos : undefined
        );
      }
    }
  }

  private handleArrival(
    a: PendingBlitzStrike,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    renderVisuals: boolean,
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    const ped = pedestals[a.slotIndex];
    const originX = ped ? ped.group.position.x : a.sx;
    const originZ = ped ? ped.group.position.z : a.sz;
    if (renderVisuals) {
      const unit = this.units.get(a.slotIndex);
      if (unit) {
        const alive = pit.getAliveNodesInfo();
        this.alivePointScratch.length = 0;
        for (let ai = 0; ai < alive.length; ai++) {
          const an = alive[ai];
          this.alivePointScratch.push({ x: an.worldX, y: an.worldY, z: an.worldZ });
        }
        const speedScale = Math.max(0.9, Math.min(1.24, a.attackInterval / 1.45));
        const targetPt: WorldPoint3 = { x: a.ex, y: Math.max(-0.68, a.ey - 0.65), z: a.ez };
        const wideCenter = computeZoneWideCenter(targetPt, this.alivePointScratch);
        this.tierVfx.fireTierAttack({
          rarity: unit.def.rarity,
          colorHex: a.accentColor,
          target: targetPt,
          allTargets: this.alivePointScratch,
          comboStep: a.comboStep,
          speedScale,
          areaScale: MINE_PIT_VFX_SCALE,
          wideCenter,
        });
      }
    }
    const arrivalUnit = this.units.get(a.slotIndex);
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
      onOreHit,
      arrivalUnit?.critChance ?? 0,
      arrivalUnit?.critMult ?? 2.25,
      arrivalUnit?.def.rarity ?? 'common'
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

    if (!renderVisuals && this.pendingStrikes.length > 0) {
      for (let i = 0; i < this.pendingStrikes.length; i++) {
        this.handleArrival(this.pendingStrikes[i], pit, pedestals, false, onOreBroken, onOreHit);
      }
      this.pendingStrikes.length = 0;
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
        const attackInterval = getMineAttackIntervalSec(unit.miningMult);
        unit.cooldown = attackInterval;
        const strikeDamage = Math.max(1, unit.dmg * attackInterval);

        if (renderVisuals && ped) {
          this.alivePointScratch.length = 0;
          for (let ai = 0; ai < alive.length; ai++) {
            const an = alive[ai];
            this.alivePointScratch.push({ x: an.worldX, y: an.worldY, z: an.worldZ });
          }
          const targetPt: WorldPoint3 = { x: target.worldX, y: target.worldY, z: target.worldZ };
          const wideCenter = computeZoneWideCenter(targetPt, this.alivePointScratch);
          const accentColor = ped.getActiveAccentColor();
          const blitzDur = getMineBlitzDurationSec(unit.def.rarity, attackInterval);

          ped.setChibiFacing(target.worldX < pedX ? -1 : 1);
          ped.triggerChibiAttack(Math.min(0.65, attackInterval * 0.55), unit.comboStep);
          ped.triggerChibiBlitz({
            rarity: unit.def.rarity,
            targetX: targetPt.x,
            targetY: targetPt.y,
            targetZ: targetPt.z,
            allTargets: this.alivePointScratch,
            durationSec: blitzDur,
            colorHex: accentColor,
            wideCenter,
            motionScale: MINE_PIT_MOTION_SCALE,
          });
          this.tierVfx.fireAnticipation(
            unit.def.rarity,
            accentColor,
            targetPt,
            this.alivePointScratch,
            MINE_PIT_VFX_SCALE,
            wideCenter
          );

          ped.getAttackOriginWorldPosition(this.originVec);
          this.pendingStrikes.push({
            slotIndex: unit.slotIndex,
            targetId: target.id,
            dmg: strikeDamage,
            comboStep: unit.comboStep,
            accentColor,
            sx: this.originVec.x,
            sz: this.originVec.z,
            ex: target.worldX,
            ey: target.worldY + 0.65,
            ez: target.worldZ,
            attackInterval,
            delayLeft: Math.max(0.18, blitzDur * 0.18),
          });
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
            onOreHit,
            unit.critChance,
            unit.critMult,
            unit.def.rarity
          );
        }
        unit.comboStep = (unit.comboStep + 1) % 3;
      }
    }

    if (renderVisuals) {
      for (let i = this.pendingStrikes.length - 1; i >= 0; i--) {
        const st = this.pendingStrikes[i];
        st.delayLeft -= safeDt;
        if (st.delayLeft <= 0) {
          this.pendingStrikes.splice(i, 1);
          this.handleArrival(st, pit, pedestals, true, onOreBroken, onOreHit);
        }
      }
      this.tierVfx.update(safeDt, camera);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.units.clear();
    this.pendingStrikes.length = 0;
    this.tierVfx.dispose();
  }
}
