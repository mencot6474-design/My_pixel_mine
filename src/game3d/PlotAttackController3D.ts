import * as THREE from 'three';
import { type OverclockTier, getOverclockUltChargeReq, OVERCLOCK_HYPER_ENCORE_ULTS } from '../game/OverclockDomain';
import { type ChibiDef } from './ChibiCatalog';
import { type OrePit3D, PIT_CENTER_Z, PIT_FLOOR_Y, PIT_RADIUS } from './OrePit3D';
import { type PlotPedestal3D } from './PlotPedestal3D';
import {
  getChibiAttackStyle,
  type PlotAttackStyle,
} from './SignatureProjectilePool3D';
import {
  BARRAGE_FOLLOWUP_DELAYS,
  computeAttackVfxSpeedScale,
  computeSpotlightMaxChargeSec,
  getBasicAttackIntervalSec,
  HYPER_ENCORE_RELAY_LOCK_SEC,
  splitBarrageDamage,
  SpotlightAttackQueue,
  TierAttackVfxPool3D,
  ULT_CHARGE_BASIC_ATTACKS,
  ULT_SPOTLIGHT_LOCK_SEC,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierAttackVfx3D';
import {
  type AliveNodeTarget,
  AOE_CLEAVE_RADIUS,
  applyPlotOreImpact,
  computeSafePitAreaScale,
  computeZoneWideCenter,
  getAoeCleaveRadius,
  getAoeTargetCount,
  getPedestalOriginXZ,
  MAX_AOE_TARGETS,
  type PendingBlitzStrike,
  pickPlotOreTarget,
  type PlotOreBrokenCb,
  type PlotOreHitCb,
  type PlotUltFiredInfo,
  type PlotUnitState,
} from './PlotAttackImpact3D';

export {
  AOE_CLEAVE_RADIUS,
  getAoeCleaveRadius,
  getAoeTargetCount,
  getChibiAttackStyle,
  MAX_AOE_TARGETS,
  type PlotAttackStyle,
  type PlotOreBrokenCb,
  type PlotOreHitCb,
  type PlotUltFiredInfo,
};

const BASIC_ATTACK_DPS_SHARE = 0.65;

function getMineAttackIntervalSec(miningMult: number): number {
  return getBasicAttackIntervalSec(miningMult);
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
  private onUltFiredHook?: (info: PlotUltFiredInfo) => void;
  private onEncoreUltCompletedHook?: () => void;
  private onHyperEncoreCompleteHook?: () => void;

  private overclockTier: 0 | OverclockTier = 0;
  private hyperEncoreActive = false;
  private hyperEncoreTotal = 0;
  private hyperEncoreShotsLeft = 0;
  private hyperEncoreCursorSlot = 0;
  private hyperEncorePendingFinishers = 0;

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

  public setUltFiredHook(cb?: (info: PlotUltFiredInfo) => void): void {
    this.onUltFiredHook = cb;
  }

  public setEncoreUltCompletedHook(cb?: () => void): void {
    this.onEncoreUltCompletedHook = cb;
  }

  public setHyperEncoreCompleteHook(cb?: () => void): void {
    this.onHyperEncoreCompleteHook = cb;
  }

  public getHyperEncoreState(): {
    active: boolean;
    total: number;
    shotsLeft: number;
    pendingFinishers: number;
  } {
    return {
      active: this.hyperEncoreActive,
      total: this.hyperEncoreTotal,
      shotsLeft: this.hyperEncoreShotsLeft,
      pendingFinishers: this.hyperEncorePendingFinishers,
    };
  }

  public setOverclockTier(tier: 0 | OverclockTier): void {
    const prevTier = this.overclockTier;
    this.overclockTier = tier;
    if (tier === 0) {
      this.hyperEncoreActive = false;
      this.hyperEncoreTotal = 0;
      this.hyperEncoreShotsLeft = 0;
      this.hyperEncoreCursorSlot = 0;
      this.hyperEncorePendingFinishers = 0;
      return;
    }
    if (tier === 3 && prevTier !== 3) {
      if (this.units.size > 0) {
        this.hyperEncoreActive = true;
        this.hyperEncoreTotal = OVERCLOCK_HYPER_ENCORE_ULTS;
        this.hyperEncoreShotsLeft = OVERCLOCK_HYPER_ENCORE_ULTS;
        this.hyperEncoreCursorSlot = 0;
        this.hyperEncorePendingFinishers = 0;
        for (const unit of this.units.values()) {
          unit.ultCharge = ULT_CHARGE_BASIC_ATTACKS;
          unit.ultArmed = true;
        }
        this.spotlight.clampLock(0.35);
      } else {
        this.hyperEncoreActive = false;
      }
    }
  }

  public setLowQuality(low: boolean): void {
    this.tierVfx.setLowQuality(low);
  }

  public warmupShaders(renderer: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene): void {
    const activeIds: string[] = [];
    for (const unit of this.units.values()) {
      activeIds.push(unit.def.id);
    }
    this.tierVfx.warmupShaders(renderer, camera, scene, activeIds);
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
    const sameUnit = Boolean(prev && prev.def.id === def.id);
    this.units.set(slotIndex, {
      slotIndex,
      def,
      style: getChibiAttackStyle(def),
      dmg,
      speed,
      miningMult,
      critChance,
      critMult,
      cooldown: sameUnit && prev ? prev.cooldown : 0.12 + (slotIndex % 5) * 0.16,
      chargeSec: sameUnit && prev ? prev.chargeSec : 0,
      ultCharge: sameUnit && prev ? prev.ultCharge : 0,
      ultBankSec: sameUnit && prev ? prev.ultBankSec : 0,
      ultArmed: sameUnit && prev ? prev.ultArmed : false,
      ultActiveTimer: sameUnit && prev ? prev.ultActiveTimer : 0,
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

  public getSlotUltState(slotIndex: number): {
    charge: number;
    maxCharge: number;
    armed: boolean;
    ulting: boolean;
  } | null {
    const unit = this.units.get(slotIndex);
    if (!unit) return null;
    return {
      charge: unit.ultCharge,
      maxCharge: this.hyperEncoreActive
        ? ULT_CHARGE_BASIC_ATTACKS
        : getOverclockUltChargeReq(this.overclockTier),
      armed: unit.ultArmed,
      ulting: unit.ultActiveTimer > 0,
    };
  }

  public getActiveProjectileCount(): number {
    return this.pendingStrikes.length;
  }

  public clearProjectiles(): void {
    this.pendingStrikes.length = 0;
    this.hyperEncorePendingFinishers = 0;
    this.finishEncoreIfComplete();
    this.spotlight.reset();
    this.tierVfx.clear();
  }

  private pickNextEncoreUnit(): PlotUnitState | null {
    let bestAfterCursor: PlotUnitState | null = null;
    let bestWrap: PlotUnitState | null = null;
    for (const u of this.units.values()) {
      if (u.slotIndex >= this.hyperEncoreCursorSlot) {
        if (!bestAfterCursor || u.slotIndex < bestAfterCursor.slotIndex) {
          bestAfterCursor = u;
        }
      } else {
        if (!bestWrap || u.slotIndex < bestWrap.slotIndex) {
          bestWrap = u;
        }
      }
    }
    return bestAfterCursor ?? bestWrap;
  }

  private finishEncoreIfComplete(): void {
    if (
      this.hyperEncoreActive &&
      this.hyperEncoreShotsLeft <= 0 &&
      this.hyperEncorePendingFinishers <= 0
    ) {
      this.hyperEncoreActive = false;
      this.hyperEncoreTotal = 0;
      for (const u of this.units.values()) {
        u.ultCharge = 0;
        u.ultArmed = false;
      }
      this.onHyperEncoreCompleteHook?.();
    }
  }

  private pickTarget(
    unit: PlotUnitState,
    alive: AliveNodeTarget[],
    pedestalX: number
  ): AliveNodeTarget | null {
    return pickPlotOreTarget(unit, alive, pedestalX, this.units, this.claimCountsScratch);
  }

  private applyUnitImpact(
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
    beatIndex?: number,
    isBasic = false,
    affectedIds?: Set<number>,
    anchorX?: number,
    anchorZ?: number
  ): void {
    applyPlotOreImpact({
      pit,
      tierVfx: this.tierVfx,
      units: this.units,
      aoeTargetsScratch: this.aoeTargetsScratch,
      claimCountsScratch: this.claimCountsScratch,
      tmpWorldPos: this.tmpWorldPos,
      targetOreId,
      fallbackTarget,
      strikeDamage,
      accentColor,
      originX,
      originZ,
      comboStep,
      renderVisuals,
      onOreBroken,
      onOreHit,
      critChance,
      critMult,
      rarity,
      heavy,
      unit,
      beatIndex,
      isBasic,
      affectedIds,
      anchorX,
      anchorZ,
    });
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
        const wideCenter = computeZoneWideCenter(targetPt);
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
    this.applyUnitImpact(
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
      a.beatIndex,
      Boolean(a.isBasic),
      a.affectedIds,
      a.ex,
      a.ez
    );
    if (a.isEncoreFinisher) {
      this.hyperEncorePendingFinishers = Math.max(0, this.hyperEncorePendingFinishers - 1);
      this.onEncoreUltCompletedHook?.();
      this.finishEncoreIfComplete();
    }
  }

  private fireVisualBasicStrike(
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
    const accentColor = ped.getActiveAccentColor();

    ped.triggerChibiCast(0.24);
    ped.getAttackOriginWorldPosition(this.originVec);
    this.tierVfx.firePodiumWeaponCast({
      rarity: 'common',
      chibiId: unit.def.id,
      colorHex: accentColor,
      origin: { x: ped.group.position.x, y: ped.group.position.y, z: ped.group.position.z },
      target: targetPt,
      allTargets: this.alivePointScratch,
      areaScale: 0.55,
    });
    this.pendingStrikes.push({
      slotIndex: unit.slotIndex,
      targetId: target.id,
      dmg: Math.max(1, Math.round(strikeDamage)),
      comboStep: unit.comboStep % 2,
      accentColor,
      sx: this.originVec.x,
      sz: this.originVec.z,
      ex: target.worldX,
      ey: target.worldY + 0.65,
      ez: target.worldZ,
      attackInterval,
      delayLeft: 0.18,
      fireShader: false,
      isFinisher: false,
      isBasic: true,
    });
  }

  private fireVisualUnitStrike(
    unit: PlotUnitState,
    ped: PlotPedestal3D,
    target: AliveNodeTarget,
    alive: AliveNodeTarget[],
    attackInterval: number,
    strikeDamage: number,
    isEncore = false
  ): void {
    this.alivePointScratch.length = 0;
    for (let ai = 0; ai < alive.length; ai++) {
      const an = alive[ai];
      this.alivePointScratch.push({ x: an.worldX, y: an.worldY, z: an.worldZ });
    }
    const targetPt: WorldPoint3 = { x: target.worldX, y: target.worldY, z: target.worldZ };
    const wideCenter = computeZoneWideCenter(targetPt);
    const areaScale = computeSafePitAreaScale(wideCenter);
    const accentColor = ped.getActiveAccentColor();

    ped.triggerChibiUltOpening(0.52);
    ped.getAttackOriginWorldPosition(this.originVec);
    this.tierVfx.fireUltOpeningBurst({
      x: ped.group.position.x,
      y: ped.group.position.y,
      z: ped.group.position.z,
      colorHex: accentColor,
    });
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
    const affectedIds = new Set<number>([target.id]);
    for (let bi = 0; bi < beatDmgs.length; bi++) {
      const isFinisher = bi === lastBeatIdx;
      const beatDmg = isFinisher ? Math.max(1, beatDmgs[bi]) : beatDmgs[bi];
      if (beatDmg <= 0) continue;
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
        isEncoreFinisher: isEncore && isFinisher,
        affectedIds,
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
      this.stepHeadlessUnits(safeDt, maxChargeSec, alive, pit, pedestals, onOreBroken, onOreHit);
      return;
    }

    this.spotlight.step(safeDt);
    const ultReq = getOverclockUltChargeReq(this.overclockTier);
    this.stepUnitTimers(safeDt, maxChargeSec, alive.length > 0, ultReq);

    if (this.hyperEncoreActive && this.units.size === 0) {
      this.hyperEncoreActive = false;
      this.hyperEncoreTotal = 0;
      this.hyperEncoreShotsLeft = 0;
      this.hyperEncoreCursorSlot = 0;
      this.hyperEncorePendingFinishers = 0;
    }

    if (alive.length > 0) {
      if (this.hyperEncoreActive) {
        this.stepHyperEncoreTurn(alive, pit, pedestals, onOreBroken, onOreHit);
      } else {
        this.stepUltRelayTurn(alive, pit, pedestals, onOreBroken, onOreHit);
      }
      this.stepParallelBasicAttacks(alive, maxChargeSec, ultReq, pit, pedestals, onOreBroken, onOreHit);
    }

    this.stepPendingStrikes(safeDt, pit, pedestals, onOreBroken, onOreHit);
    this.tierVfx.update(safeDt, camera);
  }

  private stepHeadlessUnits(
    safeDt: number,
    maxChargeSec: number,
    alive: AliveNodeTarget[],
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    this.spotlight.reset();
    for (const unit of this.units.values()) {
      const ped = pedestals[unit.slotIndex];
      const origin = getPedestalOriginXZ(unit.slotIndex, ped);
      if (alive.length === 0) {
        unit.cooldown = Math.max(0.08, unit.cooldown - safeDt);
        continue;
      }
      const target = this.pickTarget(unit, alive, origin.x);
      if (!target) continue;

      unit.cooldown -= safeDt;
      unit.chargeSec = Math.min(maxChargeSec, unit.chargeSec + safeDt);
      if (unit.cooldown <= 0) {
        const attackInterval = getMineAttackIntervalSec(unit.miningMult);
        const effectiveSec = Math.max(0.01, unit.chargeSec + unit.ultBankSec);
        unit.cooldown = attackInterval;
        unit.chargeSec = 0;
        unit.ultBankSec = 0;
        const strikeDamage = Math.max(1, unit.dmg * effectiveSec);
        this.applyUnitImpact(
          pit,
          target.id,
          target,
          strikeDamage,
          ped ? ped.getActiveAccentColor() : unit.def.accentColor,
          origin.x,
          origin.z,
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
  }

  private stepUnitTimers(
    safeDt: number,
    maxChargeSec: number,
    hasAliveOres: boolean,
    ultReq: number
  ): void {
    for (const unit of this.units.values()) {
      unit.cooldown = Math.max(0, unit.cooldown - safeDt);
      if (unit.ultActiveTimer > 0) {
        unit.ultActiveTimer = Math.max(0, unit.ultActiveTimer - safeDt);
      }
      if (hasAliveOres) {
        unit.chargeSec = Math.min(maxChargeSec, unit.chargeSec + safeDt);
      }
      if (!this.hyperEncoreActive && unit.ultCharge >= ultReq && !unit.ultArmed) {
        const basicInterval = getMineAttackIntervalSec(unit.miningMult);
        if (unit.cooldown <= basicInterval * 0.55) {
          unit.ultArmed = true;
        }
      }
    }
  }

  private stepHyperEncoreTurn(
    alive: AliveNodeTarget[],
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    if (this.hyperEncoreShotsLeft <= 0 || this.spotlight.getLockRemaining() > 0) return;
    const encoreUnit = this.pickNextEncoreUnit();
    if (!encoreUnit) return;
    const ped = pedestals[encoreUnit.slotIndex];
    const origin = getPedestalOriginXZ(encoreUnit.slotIndex, ped);
    const target = this.pickTarget(encoreUnit, alive, origin.x);
    if (!target) return;

    this.hyperEncoreCursorSlot = encoreUnit.slotIndex + 1;
    this.hyperEncoreShotsLeft -= 1;
    const encoreIndex = this.hyperEncoreTotal - this.hyperEncoreShotsLeft;
    const attackInterval = getMineAttackIntervalSec(encoreUnit.miningMult);
    const ultSec = Math.max(1.25, encoreUnit.ultBankSec + encoreUnit.chargeSec);
    const accentColor = ped ? ped.getActiveAccentColor() : encoreUnit.def.accentColor;
    encoreUnit.cooldown = Math.max(attackInterval, HYPER_ENCORE_RELAY_LOCK_SEC);
    encoreUnit.chargeSec = 0;
    encoreUnit.ultBankSec = 0;
    encoreUnit.ultActiveTimer = HYPER_ENCORE_RELAY_LOCK_SEC;
    this.spotlight.claim(encoreUnit.slotIndex, HYPER_ENCORE_RELAY_LOCK_SEC);
    this.skillPulseHook?.(accentColor, 1.2);
    this.onUltFiredHook?.({
      slotIndex: encoreUnit.slotIndex,
      def: encoreUnit.def,
      accentColor,
      isEncore: true,
      encoreIndex,
      encoreTotal: this.hyperEncoreTotal,
      overclockTier: this.overclockTier,
    });
    const strikeDamage = Math.max(1, encoreUnit.dmg * ultSec);
    if (ped) {
      this.hyperEncorePendingFinishers += 1;
      this.fireVisualUnitStrike(encoreUnit, ped, target, alive, attackInterval, strikeDamage, true);
    } else {
      this.applyUnitImpact(
        pit,
        target.id,
        target,
        strikeDamage,
        encoreUnit.def.accentColor,
        origin.x,
        origin.z,
        encoreUnit.comboStep,
        false,
        onOreBroken,
        onOreHit,
        encoreUnit.critChance,
        encoreUnit.critMult,
        encoreUnit.def.rarity,
        true,
        encoreUnit
      );
      this.onEncoreUltCompletedHook?.();
      this.finishEncoreIfComplete();
    }
    encoreUnit.comboStep = (encoreUnit.comboStep + 1) % 3;
  }

  private stepUltRelayTurn(
    alive: AliveNodeTarget[],
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    const activeUltUnit = this.spotlight.pickNextReady(this.units.values(), (u) => (u.ultArmed ? 0 : 1));
    if (!activeUltUnit) return;
    const ped = pedestals[activeUltUnit.slotIndex];
    const origin = getPedestalOriginXZ(activeUltUnit.slotIndex, ped);
    const target = this.pickTarget(activeUltUnit, alive, origin.x);
    if (!target) return;

    const attackInterval = getMineAttackIntervalSec(activeUltUnit.miningMult);
    const ultSec = Math.max(0.01, activeUltUnit.ultBankSec + activeUltUnit.chargeSec);
    const accentColor = ped ? ped.getActiveAccentColor() : activeUltUnit.def.accentColor;
    activeUltUnit.cooldown = Math.max(attackInterval, ULT_SPOTLIGHT_LOCK_SEC);
    activeUltUnit.chargeSec = 0;
    activeUltUnit.ultBankSec = 0;
    activeUltUnit.ultCharge = 0;
    activeUltUnit.ultArmed = false;
    activeUltUnit.ultActiveTimer = ULT_SPOTLIGHT_LOCK_SEC;
    this.spotlight.claim(activeUltUnit.slotIndex, ULT_SPOTLIGHT_LOCK_SEC);
    if (this.overclockTier >= 1) {
      this.skillPulseHook?.(accentColor, this.overclockTier >= 2 ? 1.0 : 0.78);
    }
    this.onUltFiredHook?.({
      slotIndex: activeUltUnit.slotIndex,
      def: activeUltUnit.def,
      accentColor,
      isEncore: false,
      encoreIndex: 0,
      encoreTotal: 0,
      overclockTier: this.overclockTier,
    });
    const strikeDamage = Math.max(1, activeUltUnit.dmg * ultSec);
    if (ped) {
      this.fireVisualUnitStrike(activeUltUnit, ped, target, alive, attackInterval, strikeDamage);
    } else {
      this.applyUnitImpact(
        pit,
        target.id,
        target,
        strikeDamage,
        activeUltUnit.def.accentColor,
        origin.x,
        origin.z,
        activeUltUnit.comboStep,
        false,
        onOreBroken,
        onOreHit,
        activeUltUnit.critChance,
        activeUltUnit.critMult,
        activeUltUnit.def.rarity,
        false,
        activeUltUnit
      );
    }
    activeUltUnit.comboStep = (activeUltUnit.comboStep + 1) % 3;
  }

  private stepParallelBasicAttacks(
    alive: AliveNodeTarget[],
    maxChargeSec: number,
    ultReq: number,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
    for (const unit of this.units.values()) {
      if (unit.cooldown > 0 || unit.ultActiveTimer > 0) continue;
      const ped = pedestals[unit.slotIndex];
      const origin = getPedestalOriginXZ(unit.slotIndex, ped);
      const target = this.pickTarget(unit, alive, origin.x);
      if (!target) continue;

      const basicInterval = getMineAttackIntervalSec(unit.miningMult);
      const elapsedSec = Math.max(0.01, unit.chargeSec);
      const basicSec = elapsedSec * BASIC_ATTACK_DPS_SHARE;
      unit.ultBankSec = Math.min(maxChargeSec, unit.ultBankSec + elapsedSec * (1 - BASIC_ATTACK_DPS_SHARE));
      unit.chargeSec = 0;
      unit.cooldown = basicInterval;
      if (!this.hyperEncoreActive) {
        unit.ultCharge = Math.min(ultReq, unit.ultCharge + 1);
      }
      const strikeDamage = Math.max(1, unit.dmg * basicSec);
      if (ped) {
        this.fireVisualBasicStrike(unit, ped, target, alive, basicInterval, strikeDamage);
      } else {
        this.applyUnitImpact(
          pit,
          target.id,
          target,
          strikeDamage,
          unit.def.accentColor,
          origin.x,
          origin.z,
          unit.comboStep,
          false,
          onOreBroken,
          onOreHit,
          unit.critChance,
          unit.critMult,
          unit.def.rarity,
          false,
          unit,
          undefined,
          true
        );
      }
      unit.comboStep = (unit.comboStep + 1) % 3;
    }
  }

  private stepPendingStrikes(
    safeDt: number,
    pit: OrePit3D,
    pedestals: readonly PlotPedestal3D[],
    onOreBroken?: PlotOreBrokenCb,
    onOreHit?: PlotOreHitCb
  ): void {
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
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.skillPulseHook = undefined;
    this.onUltFiredHook = undefined;
    this.onEncoreUltCompletedHook = undefined;
    this.onHyperEncoreCompleteHook = undefined;
    this.hyperEncoreActive = false;
    this.hyperEncoreTotal = 0;
    this.hyperEncoreShotsLeft = 0;
    this.hyperEncorePendingFinishers = 0;
    this.units.clear();
    this.pendingStrikes.length = 0;
    this.tierVfx.dispose();
  }
}
