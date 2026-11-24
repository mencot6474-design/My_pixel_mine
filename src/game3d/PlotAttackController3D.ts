import * as THREE from 'three';
import { type PitEventKind } from '../game/PitEventsDomain';
import { type WeatherId } from '../game/WeatherData';
import { type ChibiDef } from './ChibiCatalog';
import { type OreVariantKey } from './MineWorldPalette';
import { type OrePit3D, PIT_CENTER_Z, PIT_FLOOR_Y, PIT_RADIUS } from './OrePit3D';
import { type PlotPedestal3D } from './PlotPedestal3D';
import {
  getChibiAttackStyle,
  type PlotAttackStyle,
} from './SignatureProjectilePool3D';
import {
  BARRAGE_FOLLOWUP_DELAYS,
  CHIBI_ATTACK_ANIM_SEC,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  splitBarrageDamage,
  SpotlightAttackQueue,
  TierAttackVfxPool3D,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierAttackVfx3D';

export { getChibiAttackStyle, type PlotAttackStyle };

interface PendingBlitzStrike {
  slotIndex: number;
  targetId: number;
  beatIndex: number;
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
  fireShader: boolean;
  isFinisher?: boolean;
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
  isCrit?: boolean,
  beatIndex?: number,
  isFinisher?: boolean
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
  chargeSec: number;
  comboStep: number;
  targetOreId: number | null;
}

type AliveNodeTarget = ReturnType<OrePit3D['getAliveNodesInfo']>[number];

const MINE_PIT_VFX_SCALE = 0.72;
export const MAX_AOE_TARGETS = 3;

/** Single-target (1 ore) for tiers common..limited; up to 3-ore AoE cleave for fusion, twin & omega. */
export function getAoeTargetCount(rarity?: string): number {
  return rarity === 'fusion' || rarity === 'twin' || rarity === 'omega' ? MAX_AOE_TARGETS : 1;
}

function getAoeSplashDamageMult(rarity: string): number {
  return rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega' ? 1.0 : 0.8;
}

function getMineAttackIntervalSec(miningMult: number): number {
  const safeMult = Math.max(1, miningMult);
  return Math.max(CHIBI_ATTACK_ANIM_SEC, Math.min(2.85, 2.85 / (1 + (safeMult - 1) * 0.15)));
}

/** Locks true AoE domain skills (fusion/twin/omega) cleanly to the circular Mine Pit center. */
function computeZoneWideCenter(): WorldPoint3 {
  return { x: 0, y: PIT_FLOOR_Y, z: PIT_CENTER_Z };
}

function computeSafePitAreaScale(center: WorldPoint3): number {
  const distFromPit = Math.hypot(center.x, center.z - PIT_CENTER_Z);
  return Math.min(MINE_PIT_VFX_SCALE, Math.max(0.45, (PIT_RADIUS - 0.45 - distFromPit) / 4.7));
}

export class PlotAttackController3D {
  public readonly group = new THREE.Group();

  private readonly units = new Map<number, PlotUnitState>();
  private readonly pendingStrikes: PendingBlitzStrike[] = [];
  private readonly spotlight = new SpotlightAttackQueue();
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly alivePointScratch: WorldPoint3[] = [];
  private readonly aoeTargetsScratch: AliveNodeTarget[] = [];
  private readonly claimCountsScratch = new Map<number, number>();
  private readonly originVec = new THREE.Vector3();
  private readonly tmpWorldPos = { x: 0, y: 0, z: 0 };
  private skillPulseHook?: (colorHex: string, strength: number) => void;

  private disposed = false;

  constructor() {
    this.tierVfx.setPitBounds({
      centerX: 0,
      floorY: PIT_FLOOR_Y,
      centerZ: PIT_CENTER_Z,
      radius: PIT_RADIUS - 0.18,
    });
    this.group.add(this.tierVfx.group);
  }

  public setTierVfxHooks(hooks: TierVfxHooks): void {
    this.tierVfx.setHooks(hooks);
  }

  public setSkillPulseHook(cb?: (colorHex: string, strength: number) => void): void {
    this.skillPulseHook = cb;
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
      if (this.units.size === 0) {
        this.spotlight.reset();
      }
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
      chargeSec: prev && prev.def.id === def.id ? prev.chargeSec : 0,
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
    this.spotlight.reset();
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

    const claimCounts = this.claimCountsScratch;
    claimCounts.clear();
    for (let i = 0; i < alive.length; i++) {
      claimCounts.set(alive[i].id, 0);
    }
    for (const other of this.units.values()) {
      if (other.slotIndex === unit.slotIndex || other.targetOreId === null) continue;
      const cur = claimCounts.get(other.targetOreId);
      if (cur !== undefined) {
        claimCounts.set(other.targetOreId, cur + 1);
      }
    }

    let minClaims = Infinity;
    for (const c of claimCounts.values()) {
      if (c < minClaims) minClaims = c;
    }

    if (unit.targetOreId !== null) {
      for (let i = 0; i < alive.length; i++) {
        if (alive[i].id === unit.targetOreId && (claimCounts.get(alive[i].id) ?? 0) <= minClaims) {
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
      const claims = claimCounts.get(n.id) ?? 0;
      const spreadBias = ((i + unit.slotIndex) % 3) * 0.75;
      // Strictly prefer unclaimed ores first so different Chibis never share the same ore target
      const score = claims * 1000 + dx * 0.45 + spreadBias + eventBias;
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
    rarity = 'common',
    heavy = false,
    unit?: PlotUnitState,
    beatIndex = 0
  ): void {
    const alive = pit.getAliveNodesInfo();
    if (alive.length === 0) return;
    let target: AliveNodeTarget | null = null;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i].id === targetOreId) {
        target = alive[i];
        break;
      }
    }
    if (!target && unit) {
      target = this.pickTarget(unit, alive, originX);
    }
    if (!target && fallbackTarget) {
      for (let i = 0; i < alive.length; i++) {
        if (alive[i].id === fallbackTarget.id) {
          target = alive[i];
          break;
        }
      }
    }
    if (!target) {
      target = alive[0] ?? null;
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
        heavy,
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
        this.tierVfx.fireBarrageHitSlash({
          x: hitNodeTarget.worldX,
          y: hitNodeTarget.worldY + 0.72,
          z: hitNodeTarget.worldZ,
          colorHex: accentColor,
          beatIndex,
          isFinisher: heavy,
          scale: hitNodeTarget.isMeteor ? 1.35 : 0.96,
        });
        onOreHit?.(
          hitRes.dmgDealt,
          hitNodeTarget.worldX,
          hitY,
          hitNodeTarget.worldZ,
          hitRes.isMeteor,
          isCrit,
          beatIndex,
          heavy
        );
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
    if (renderVisuals && a.fireShader) {
      const unit = this.units.get(a.slotIndex);
      if (unit) {
        const alive = pit.getAliveNodesInfo();
        this.alivePointScratch.length = 0;
        for (let ai = 0; ai < alive.length; ai++) {
          const an = alive[ai];
          this.alivePointScratch.push({ x: an.worldX, y: an.worldY, z: an.worldZ });
        }
        const speedScale = computeAttackVfxSpeedScale(a.attackInterval);
        const targetPt: WorldPoint3 = { x: a.ex, y: Math.max(PIT_FLOOR_Y, a.ey - 0.65), z: a.ez };
        const wideCenter = computeZoneWideCenter();
        const areaScale = computeSafePitAreaScale(wideCenter);
        this.tierVfx.fireTierAttack({
          rarity: unit.def.rarity,
          chibiId: unit.def.id,
          colorHex: a.accentColor,
          target: targetPt,
          allTargets: this.alivePointScratch,
          comboStep: a.comboStep,
          speedScale,
          areaScale,
          wideCenter,
        });
        const r = unit.def.rarity;
        if (r === 'secret' || r === 'fusion' || r === 'limited' || r === 'twin' || r === 'omega') {
          this.skillPulseHook?.(a.accentColor, r === 'twin' || r === 'omega' ? 1.1 : 0.85);
        }
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
      arrivalUnit?.def.rarity ?? 'common',
      Boolean(a.isFinisher),
      arrivalUnit,
      a.beatIndex
    );
  }

  private fireVisualUnitStrike(
    unit: PlotUnitState,
    ped: PlotPedestal3D,
    target: AliveNodeTarget,
    alive: AliveNodeTarget[],
    attackInterval: number,
    strikeDamage: number
  ): void {
    this.alivePointScratch.length = 0;
    for (let ai = 0; ai < alive.length; ai++) {
      const an = alive[ai];
      this.alivePointScratch.push({ x: an.worldX, y: an.worldY, z: an.worldZ });
    }
    const targetPt: WorldPoint3 = { x: target.worldX, y: target.worldY, z: target.worldZ };
    const wideCenter = computeZoneWideCenter();
    const areaScale = computeSafePitAreaScale(wideCenter);
    const accentColor = ped.getActiveAccentColor();

    ped.triggerChibiCast(0.36);
    ped.getAttackOriginWorldPosition(this.originVec);
    this.tierVfx.firePodiumWeaponCast({
      rarity: unit.def.rarity,
      chibiId: unit.def.id,
      colorHex: accentColor,
      origin: { x: ped.group.position.x, y: ped.group.position.y, z: ped.group.position.z },
      target: targetPt,
      allTargets: this.alivePointScratch,
      areaScale,
      wideCenter,
    });
    this.tierVfx.fireAnticipation(
      unit.def.rarity,
      accentColor,
      targetPt,
      this.alivePointScratch,
      areaScale,
      wideCenter
    );

    const beatDmgs = splitBarrageDamage(strikeDamage);
    const lastBeatIdx = beatDmgs.length - 1;
    for (let bi = 0; bi < beatDmgs.length; bi++) {
      const beatDmg = beatDmgs[bi];
      if (beatDmg <= 0) continue;
      const isFinisher = bi === lastBeatIdx;
      const delayLeft = bi === 0 ? 0.2 : 0.2 + BARRAGE_FOLLOWUP_DELAYS[bi - 1];
      this.pendingStrikes.push({
        slotIndex: unit.slotIndex,
        targetId: target.id,
        beatIndex: bi,
        dmg: beatDmg,
        comboStep: isFinisher ? 2 : (unit.comboStep + bi) % 2,
        accentColor,
        sx: this.originVec.x,
        sz: this.originVec.z,
        ex: target.worldX,
        ey: target.worldY + 0.65,
        ez: target.worldZ,
        attackInterval,
        delayLeft,
        fireShader: bi === 0,
        isFinisher,
      });
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

    if (!renderVisuals && this.pendingStrikes.length > 0) {
      for (let i = 0; i < this.pendingStrikes.length; i++) {
        this.handleArrival(this.pendingStrikes[i], pit, pedestals, false, onOreBroken, onOreHit);
      }
      this.pendingStrikes.length = 0;
    }

    const alive = pit.getAliveNodesInfo();
    const maxChargeSec = computeSpotlightMaxChargeSec(this.units.size);

    if (!renderVisuals) {
      this.spotlight.reset();
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
        unit.chargeSec = Math.min(maxChargeSec, unit.chargeSec + safeDt);
        if (unit.cooldown <= 0) {
          const attackInterval = getMineAttackIntervalSec(unit.miningMult);
          const effectiveSec = Math.max(attackInterval, unit.chargeSec);
          unit.cooldown = attackInterval;
          unit.chargeSec = 0;
          const strikeDamage = Math.max(1, unit.dmg * effectiveSec);
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
            unit.def.rarity,
            false,
            unit
          );
          unit.comboStep = (unit.comboStep + 1) % 3;
        }
      }
      return;
    }

    this.spotlight.step(safeDt);

    for (const unit of this.units.values()) {
      unit.cooldown = Math.max(0, unit.cooldown - safeDt);
      if (alive.length > 0) {
        unit.chargeSec = Math.min(maxChargeSec, unit.chargeSec + safeDt);
      }
    }

    if (alive.length > 0) {
      const activeUnit = this.spotlight.pickNextReady(this.units.values(), (u) => u.cooldown);
      if (activeUnit) {
        const ped = pedestals[activeUnit.slotIndex];
        const pedX = ped ? ped.group.position.x : (activeUnit.slotIndex - 2) * 3.22;
        const pedZ = ped ? ped.group.position.z : -4.58;
        const target = this.pickTarget(activeUnit, alive, pedX);
        if (target) {
          const attackInterval = getMineAttackIntervalSec(activeUnit.miningMult);
          const effectiveSec = Math.max(attackInterval, activeUnit.chargeSec);
          activeUnit.cooldown = attackInterval;
          activeUnit.chargeSec = 0;
          this.spotlight.claim(activeUnit.slotIndex, CHIBI_ATTACK_ANIM_SEC);
          const strikeDamage = Math.max(1, activeUnit.dmg * effectiveSec);
          if (ped) {
            this.fireVisualUnitStrike(activeUnit, ped, target, alive, attackInterval, strikeDamage);
          } else {
            this.applyImpact(
              pit,
              target.id,
              target,
              strikeDamage,
              activeUnit.def.accentColor,
              pedX,
              pedZ,
              activeUnit.comboStep,
              false,
              onOreBroken,
              onOreHit,
              activeUnit.critChance,
              activeUnit.critMult,
              activeUnit.def.rarity,
              false,
              activeUnit
            );
          }
          activeUnit.comboStep = (activeUnit.comboStep + 1) % 3;
        }
      }
    }

    for (let i = this.pendingStrikes.length - 1; i >= 0; i--) {
      if (this.pendingStrikes.length === 0) break;
      if (i >= this.pendingStrikes.length) {
        i = this.pendingStrikes.length - 1;
      }
      const st = this.pendingStrikes[i];
      if (!st) continue;
      st.delayLeft -= safeDt;
      if (st.delayLeft <= 0) {
        this.pendingStrikes.splice(i, 1);
        this.handleArrival(st, pit, pedestals, true, onOreBroken, onOreHit);
      }
    }
    this.tierVfx.update(safeDt, camera);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.skillPulseHook = undefined;
    this.units.clear();
    this.pendingStrikes.length = 0;
    this.tierVfx.dispose();
  }
}
