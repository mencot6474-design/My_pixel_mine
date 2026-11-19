import { getOresByWorld, getWorldById, rollWorldOre, WorldId } from './GameData';
import { DENSE_ORE_HP_MULT } from './ResearchData';
import { getGlobalGemGainBonus } from './TowerData';

export const OFFLINE_MIN_SEC = 120; // 2 minutes
export const OFFLINE_MAX_SEC = 8 * 3600; // 8 hours
export const OFFLINE_EFFICIENCY = 0.5;
/** Physical rock-break ceiling per second (1 swing breaks at most 1 rock, bounded by walk + pit respawn intervals). */
export const MAX_OFFLINE_ORES_PER_SEC = 3.5;
export const MAX_OFFLINE_GEMS = 15_000;
const BASE_AVG_ROCK_HP = 180 * 1.25;
const MAX_OFFLINE_CHEST_ORES = 200;

export interface OfflineEarningsSummary {
  elapsedSec: number;
  capped: boolean;
  worldId: WorldId;
  worldName: string;
  oresBroken: number;
  cash: number;
  gems: number;
  bonusOres: Record<string, number>;
  totalBonusOres: number;
}

export interface OfflineClaimResult {
  cash: number;
  gems: number;
  totalOresAdded: number;
  multiplier: 1 | 2;
}

export interface OfflineEarningsContext {
  cash: number;
  gems: number;
  activeWorldId: WorldId;
  lastSavedAt: number;
  chestOres: Record<string, number>;
  discovered: Set<string>;
  towerBestFloor: number;
  getTotalPlotDps: () => number;
  getEffectiveOreSellValue: (oreId: string) => number;
  getTotalOreDropMult: () => number;
  getOreLuckMult: () => number;
  getActiveResearchBonus: (key: 'denseOreScale') => number;
  getActiveStarDropAndGemBonus: () => { oreDropBonusPct: number; gemBonusPct: number };
  getRelicBonus: (key: 'gemGainPct') => number;
  getChestItemCount: () => number;
  getMaxChestCapacity: () => number;
}

export function formatOfflineDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function computeOfflineEarningsDomain(
  ctx: OfflineEarningsContext,
  nowMs: number = Date.now(),
  rng: () => number = Math.random
): OfflineEarningsSummary | null {
  if (!Number.isFinite(ctx.lastSavedAt) || ctx.lastSavedAt <= 0) return null;
  const rawElapsedSec = Math.floor((nowMs - ctx.lastSavedAt) / 1000);
  if (rawElapsedSec < OFFLINE_MIN_SEC) return null;

  const totalDps = ctx.getTotalPlotDps();
  if (!Number.isFinite(totalDps) || totalDps <= 0) return null;

  const capped = rawElapsedSec > OFFLINE_MAX_SEC;
  const elapsedSec = Math.min(rawElapsedSec, OFFLINE_MAX_SEC);

  const world = getWorldById(ctx.activeWorldId);
  const denseActive = ctx.getActiveResearchBonus('denseOreScale') > 0;
  const avgRockHp = Math.max(
    10,
    Math.round(BASE_AVG_ROCK_HP * world.oreHpMult * (denseActive ? DENSE_ORE_HP_MULT : 1))
  );

  const rawOresPerSec = (totalDps * OFFLINE_EFFICIENCY) / avgRockHp;
  const effectiveOresPerSec = Math.min(MAX_OFFLINE_ORES_PER_SEC, rawOresPerSec);
  const oresBroken = Math.max(1, Math.floor(effectiveOresPerSec * elapsedSec));

  const worldOres = getOresByWorld(ctx.activeWorldId);
  let weightedSell = 0;
  let totalWeight = 0;
  for (const ore of worldOres) {
    const w = Math.max(0.01, ore.chancePct);
    weightedSell += ctx.getEffectiveOreSellValue(ore.id) * w;
    totalWeight += w;
  }
  const avgOreSellValue = totalWeight > 0 ? weightedSell / totalWeight : 5;
  const dropMult = Math.max(1, ctx.getTotalOreDropMult());
  const cash = Math.max(1, Math.round(oresBroken * dropMult * avgOreSellValue));

  const { gemBonusPct } = ctx.getActiveStarDropAndGemBonus();
  const gemMult = 1 + getGlobalGemGainBonus(ctx.towerBestFloor) + gemBonusPct + ctx.getRelicBonus('gemGainPct');
  const gems = Math.min(MAX_OFFLINE_GEMS, Math.max(0, Math.round(oresBroken * 0.18 * gemMult)));

  const capLeft = Math.max(0, ctx.getMaxChestCapacity() - ctx.getChestItemCount());
  const oreTarget = Math.min(capLeft, MAX_OFFLINE_CHEST_ORES, Math.max(1, Math.floor(oresBroken * 0.25)));
  const bonusOres: Record<string, number> = {};
  const oreLuck = ctx.getOreLuckMult();

  // Sample up to 24 rolls and scale cleanly so large offline durations stay O(1)
  if (oreTarget > 0) {
    const sampleCount = Math.min(oreTarget, 24);
    const perSample = Math.floor(oreTarget / sampleCount);
    let remainder = oreTarget - perSample * sampleCount;
    for (let i = 0; i < sampleCount; i++) {
      const ore = rollWorldOre(ctx.activeWorldId, rng, oreLuck);
      const qty = perSample + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      bonusOres[ore.id] = (bonusOres[ore.id] || 0) + qty;
    }
  }

  return {
    elapsedSec,
    capped,
    worldId: world.id,
    worldName: world.name,
    oresBroken,
    cash,
    gems,
    bonusOres,
    totalBonusOres: oreTarget,
  };
}

export function claimOfflineEarningsDomain(
  ctx: OfflineEarningsContext,
  summary: OfflineEarningsSummary,
  multiplier: 1 | 2 = 1,
  emit: () => void = () => {}
): OfflineClaimResult {
  const mult: 1 | 2 = multiplier === 2 ? 2 : 1;
  const cashAwarded = Math.max(0, Math.round(summary.cash * mult));
  const gemsAwarded = Math.max(0, Math.round(summary.gems * mult));

  ctx.cash += cashAwarded;
  ctx.gems += gemsAwarded;

  let capLeft = Math.max(0, ctx.getMaxChestCapacity() - ctx.getChestItemCount());
  let totalOresAdded = 0;
  for (const [oreId, qty] of Object.entries(summary.bonusOres)) {
    if (capLeft <= 0) break;
    const add = Math.min(capLeft, Math.max(0, Math.floor(qty * mult)));
    if (add > 0) {
      ctx.chestOres[oreId] = (ctx.chestOres[oreId] || 0) + add;
      ctx.discovered.add(oreId);
      capLeft -= add;
      totalOresAdded += add;
    }
  }

  emit();
  return {
    cash: cashAwarded,
    gems: gemsAwarded,
    totalOresAdded,
    multiplier: mult,
  };
}
