import * as THREE from 'three';
import { type OverclockTier } from '../game/OverclockDomain';
import { type PitEventKind } from '../game/PitEventsDomain';
import { type WeatherId } from '../game/WeatherData';
import { type ChibiDef } from './ChibiCatalog';
import { type OreVariantKey } from './MineWorldPalette';
import { type OrePit3D, PIT_CENTER_Z, PIT_FLOOR_Y, PIT_RADIUS } from './OrePit3D';
import { type PlotAttackStyle } from './SignatureProjectilePool3D';
import { type TierAttackVfxPool3D, type WorldPoint3 } from './TierAttackVfx3D';

export interface PlotUltFiredInfo {
  slotIndex: number;
  def: ChibiDef;
  accentColor: string;
  isEncore: boolean;
  encoreIndex: number;
  encoreTotal: number;
  overclockTier: 0 | OverclockTier;
}

export interface PendingBlitzStrike {
  slotIndex: number;
  targetId: number;
  beatIndex?: number;
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
  isEncoreFinisher?: boolean;
  isBasic?: boolean;
  affectedIds?: Set<number>;
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

export interface PlotUnitState {
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
  ultCharge: number;
  ultBankSec: number;
  ultArmed: boolean;
  ultActiveTimer: number;
  comboStep: number;
  targetOreId: number | null;
}

export type AliveNodeTarget = ReturnType<OrePit3D['getAliveNodesInfo']>[number];

export const MINE_PIT_VFX_SCALE = 0.56;
export const AOE_CLEAVE_RADIUS = 3.8;
export const MAX_AOE_TARGETS = 20;

/** Single-target (1 ore) for tiers common..limited; radius-wide AoE cleave for fusion, twin, omega & anomaly. */
export function getAoeTargetCount(rarity?: string): number {
  return rarity === 'fusion' || rarity === 'twin' || rarity === 'omega' || rarity === 'anomaly' ? MAX_AOE_TARGETS : 1;
}

/** Returns AoE cleave radius around the target ore (0 for single-target tiers). */
export function getAoeCleaveRadius(rarity?: string): number {
  return rarity === 'fusion' || rarity === 'twin' || rarity === 'omega' || rarity === 'anomaly' ? AOE_CLEAVE_RADIUS : 0;
}

function getAoeSplashDamageMult(rarity: string): number {
  return rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega' || rarity === 'anomaly' ? 1.0 : 0.8;
}

/** Centers the Ult AoE circle on the target ore, clamped slightly inside the pit wall so the 3.8m zone stays clean. */
export function computeZoneWideCenter(target?: WorldPoint3): WorldPoint3 {
  if (!target) {
    return { x: 0, y: PIT_FLOOR_Y, z: PIT_CENTER_Z };
  }
  const dx = target.x;
  const dz = target.z - PIT_CENTER_Z;
  const dist = Math.hypot(dx, dz);
  const maxCenterOffset = Math.max(0.5, PIT_RADIUS - 2.35);
  if (dist > maxCenterOffset && dist > 1e-4) {
    const s = maxCenterOffset / dist;
    return {
      x: dx * s,
      y: PIT_FLOOR_Y,
      z: PIT_CENTER_Z + dz * s,
    };
  }
  return {
    x: target.x,
    y: PIT_FLOOR_Y,
    z: target.z,
  };
}

export function computeSafePitAreaScale(center: WorldPoint3): number {
  const distFromPit = Math.hypot(center.x, center.z - PIT_CENTER_Z);
  return Math.min(MINE_PIT_VFX_SCALE, Math.max(0.48, (PIT_RADIUS - 0.35 - distFromPit) / 5.2));
}

export function pickPlotOreTarget(
  unit: PlotUnitState,
  alive: AliveNodeTarget[],
  pedestalX: number,
  units: Map<number, PlotUnitState>,
  claimCountsScratch: Map<number, number>
): AliveNodeTarget | null {
  if (alive.length === 0) {
    unit.targetOreId = null;
    return null;
  }

  claimCountsScratch.clear();
  for (let i = 0; i < alive.length; i++) {
    claimCountsScratch.set(alive[i].id, 0);
  }
  for (const other of units.values()) {
    if (other.slotIndex === unit.slotIndex || other.targetOreId === null) continue;
    const cur = claimCountsScratch.get(other.targetOreId);
    if (cur !== undefined) {
      claimCountsScratch.set(other.targetOreId, cur + 1);
    }
  }

  let minClaims = Infinity;
  for (const c of claimCountsScratch.values()) {
    if (c < minClaims) minClaims = c;
  }

  if (unit.targetOreId !== null) {
    for (let i = 0; i < alive.length; i++) {
      if (alive[i].id === unit.targetOreId && (claimCountsScratch.get(alive[i].id) ?? 0) <= minClaims) {
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
    const claims = claimCountsScratch.get(n.id) ?? 0;
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

export interface PlotImpactParams {
  pit: OrePit3D;
  tierVfx: TierAttackVfxPool3D;
  units: Map<number, PlotUnitState>;
  aoeTargetsScratch: AliveNodeTarget[];
  claimCountsScratch: Map<number, number>;
  tmpWorldPos: { x: number; y: number; z: number };
  targetOreId: number;
  fallbackTarget: AliveNodeTarget | null;
  strikeDamage: number;
  accentColor: string;
  originX: number;
  originZ: number;
  comboStep: number;
  renderVisuals: boolean;
  onOreBroken?: PlotOreBrokenCb;
  onOreHit?: PlotOreHitCb;
  critChance?: number;
  critMult?: number;
  rarity?: string;
  heavy?: boolean;
  unit?: PlotUnitState;
  beatIndex?: number;
  isBasic?: boolean;
  affectedIds?: Set<number>;
  anchorX?: number;
  anchorZ?: number;
}

export function applyPlotOreImpact(p: PlotImpactParams): void {
  const {
    pit,
    tierVfx,
    units,
    aoeTargetsScratch,
    claimCountsScratch,
    tmpWorldPos,
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
    critChance = 0,
    critMult = 2.25,
    rarity = 'common',
    heavy = false,
    unit,
    beatIndex,
    isBasic = false,
    affectedIds,
    anchorX,
    anchorZ,
  } = p;

  const alive = pit.getAliveNodesInfo();
  if (alive.length === 0) return;

  let target: AliveNodeTarget | null = null;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i].id === targetOreId) {
      target = alive[i];
      break;
    }
  }
  if (!target && affectedIds && affectedIds.size > 0) {
    for (let i = 0; i < alive.length; i++) {
      if (affectedIds.has(alive[i].id)) {
        target = alive[i];
        break;
      }
    }
  }
  if (!target && anchorX !== undefined && anchorZ !== undefined && !isBasic) {
    const aoeR = getAoeCleaveRadius(rarity);
    if (aoeR > 0) {
      const maxSq = aoeR * aoeR;
      let bestSq = maxSq;
      for (let i = 0; i < alive.length; i++) {
        const n = alive[i];
        const dx = n.worldX - anchorX;
        const dz = n.worldZ - anchorZ;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestSq) {
          bestSq = dSq;
          target = n;
        }
      }
    }
  }
  if (!target && unit) {
    // Do not jump to a faraway cluster for an Ult finisher if the original cluster is already 100% cleared
    if (heavy && affectedIds && affectedIds.size > 0) return;
    target = pickPlotOreTarget(unit, alive, originX, units, claimCountsScratch);
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

  const aoeRadius = isBasic ? 0 : getAoeCleaveRadius(rarity);
  aoeTargetsScratch.length = 0;
  aoeTargetsScratch.push(target);
  if (aoeRadius > 0 && alive.length > 1) {
    const primaryX = anchorX ?? target.worldX;
    const primaryZ = anchorZ ?? target.worldZ;
    const maxDistSq = aoeRadius * aoeRadius;
    for (let i = 0; i < alive.length; i++) {
      const n = alive[i];
      if (n.id === target.id) continue;
      const inCluster = affectedIds?.has(n.id) ?? false;
      const dx = n.worldX - primaryX;
      const dz = n.worldZ - primaryZ;
      if (inCluster || dx * dx + dz * dz <= maxDistSq) {
        aoeTargetsScratch.push(n);
      }
    }
  }

  const isCrit = critChance > 0 && Math.random() < critChance;
  const finalDmg = isCrit ? Math.max(1, Math.round(strikeDamage * critMult)) : strikeDamage;
  const splashMult = getAoeSplashDamageMult(rarity);
  const preventBreak = !isBasic && !heavy && beatIndex !== undefined;
  const secondaryCount = Math.max(0, aoeTargetsScratch.length - 1);
  const secondaryFxLimit = 3;
  const secondaryFxOffset = secondaryCount > secondaryFxLimit ? ((beatIndex ?? 0) * secondaryFxLimit) % secondaryCount : 0;

  for (let ti = 0; ti < aoeTargetsScratch.length; ti++) {
    const hitNodeTarget = aoeTargetsScratch[ti];
    const dmgForNode = ti === 0 ? finalDmg : Math.max(1, Math.round(finalDmg * splashMult));
    const emitTargetVisualFx =
      renderVisuals &&
      (ti === 0 ||
        secondaryCount <= secondaryFxLimit ||
        ((ti - 1 - secondaryFxOffset + secondaryCount) % secondaryCount) < secondaryFxLimit);

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
            preventBreak,
            beatIndex,
            skipVisualFx: !emitTargetVisualFx,
          }
        : preventBreak
          ? { preventBreak: true, beatIndex, skipVisualFx: true }
          : undefined
    );
    if (!hitRes) continue;
    if (preventBreak) {
      affectedIds?.add(hitNodeTarget.id);
    }

    const hitY = hitNodeTarget.worldY + 0.7;
    if (renderVisuals) {
      if (emitTargetVisualFx) {
        tierVfx.fireBarrageHitSlash({
          x: hitNodeTarget.worldX,
          y: hitNodeTarget.worldY + 0.72,
          z: hitNodeTarget.worldZ,
          colorHex: accentColor,
          beatIndex: beatIndex ?? 0,
          isFinisher: heavy,
          scale: hitNodeTarget.isMeteor ? (isBasic ? 1.05 : 1.35) : isBasic ? 0.74 : 0.96,
        });
      }
      if ((ti === 0 || (heavy && ti === 1)) && (hitRes.dmgDealt > 0 || heavy)) {
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
    }
    if (hitRes.broken) {
      tmpWorldPos.x = hitNodeTarget.worldX;
      tmpWorldPos.y = hitY;
      tmpWorldPos.z = hitNodeTarget.worldZ;
      onOreBroken?.(
        hitRes.variantKey,
        hitRes.meteorWeatherId,
        hitRes.pitEventKind,
        renderVisuals && emitTargetVisualFx ? tmpWorldPos : undefined
      );
    }
  }
}

export function getPedestalOriginXZ(
  slotIndex: number,
  ped?: { group: THREE.Group }
): { x: number; z: number } {
  return {
    x: ped ? ped.group.position.x : (slotIndex - 2) * 3.22,
    z: ped ? ped.group.position.z : -4.58,
  };
}
