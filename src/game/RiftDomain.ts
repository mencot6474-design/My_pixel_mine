import {
  ANOMALY_CHIBI_DEFS,
  AnomalyChibiId,
  getAnomalyChibiById,
  RIFT_ANOMALIES,
  RIFT_INSTANT_DROP_CHANCE,
  RIFT_PASS_DURATION_MS,
  RIFT_PASS_GEM_COST,
  RIFT_SHARD_PITY_COST,
  RIFT_WINDOW_DURATION_MIN,
  RiftAnomalyDef,
} from './AnomalyData';

export interface RiftWindowSnapshot {
  isOpen: boolean;
  source: 'hourly' | 'pass' | 'closed';
  remainingSec: number;
  nextOpenSec: number;
  anomaly: RiftAnomalyDef;
}

export interface RiftDomainContext {
  gems: number;
  riftShards: number;
  riftPassExpiresAt: number;
  riftBreachesCompleted: number;
  miners: Record<string, number>;
  discovered: Set<string>;
}

export interface RiftBreachClaimResult {
  shardsEarned: number;
  droppedChibiId: AnomalyChibiId | null;
}

/** Computes real-time hourly `:00–:15` Rift status, pass override, and active hourly Anomaly. */
export function getRiftWindowSnapshot(nowMs: number, riftPassExpiresAt: number): RiftWindowSnapshot {
  const date = new Date(nowMs);
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const hourIndex = Math.max(0, Math.floor(nowMs / 3_600_000));
  const anomaly = RIFT_ANOMALIES[hourIndex % RIFT_ANOMALIES.length];

  if (min < RIFT_WINDOW_DURATION_MIN) {
    const remainingSec = Math.max(1, (RIFT_WINDOW_DURATION_MIN - min) * 60 - sec);
    return {
      isOpen: true,
      source: 'hourly',
      remainingSec,
      nextOpenSec: 0,
      anomaly,
    };
  }

  if (riftPassExpiresAt > nowMs) {
    const remainingSec = Math.max(1, Math.ceil((riftPassExpiresAt - nowMs) / 1000));
    return {
      isOpen: true,
      source: 'pass',
      remainingSec,
      nextOpenSec: Math.max(1, (60 - min) * 60 - sec),
      anomaly,
    };
  }

  const nextOpenSec = Math.max(1, (60 - min) * 60 - sec);
  return {
    isOpen: false,
    source: 'closed',
    remainingSec: 0,
    nextOpenSec,
    anomaly,
  };
}

/** Spends 500,000 Gems to force-open a personal 15-minute Rift session. */
export function buyRiftPassDomain(
  ctx: RiftDomainContext,
  nowMs = Date.now(),
  onSave?: () => void
): 'bought' | 'no_gems' {
  if (ctx.gems < RIFT_PASS_GEM_COST) return 'no_gems';
  ctx.gems -= RIFT_PASS_GEM_COST;
  ctx.riftPassExpiresAt = Math.max(nowMs, ctx.riftPassExpiresAt) + RIFT_PASS_DURATION_MS;
  onSave?.();
  return 'bought';
}

/** Grants Rift Shards on a 100% Core Breach and rolls the 8% instant ANOMALY Chibi drop. */
export function claimRiftBreachRewardDomain(
  ctx: RiftDomainContext,
  nowMs = Date.now(),
  rng: () => number = Math.random,
  onSave?: () => void
): RiftBreachClaimResult {
  const snap = getRiftWindowSnapshot(nowMs, ctx.riftPassExpiresAt);
  const baseShards = snap.anomaly.id === 'overclock-surge' ? 24 : 18;
  const meteorBonus = snap.anomaly.id === 'meteor-storm' ? 3 : 0;
  const shardsEarned = baseShards + meteorBonus;

  ctx.riftShards = Math.max(0, Math.floor(ctx.riftShards) + shardsEarned);
  ctx.riftBreachesCompleted = Math.max(0, Math.floor(ctx.riftBreachesCompleted) + 1);

  let droppedChibiId: AnomalyChibiId | null = null;
  if (rng() < RIFT_INSTANT_DROP_CHANCE) {
    const pickIdx = Math.min(ANOMALY_CHIBI_DEFS.length - 1, Math.floor(rng() * ANOMALY_CHIBI_DEFS.length));
    const picked = ANOMALY_CHIBI_DEFS[Math.max(0, pickIdx)];
    if (picked) {
      droppedChibiId = picked.chibiId;
      ctx.miners[droppedChibiId] = (ctx.miners[droppedChibiId] || 0) + 1;
      ctx.discovered.add(droppedChibiId);
    }
  }

  onSave?.();
  return { shardsEarned, droppedChibiId };
}

/** Redeems 100 Rift Shards for a guaranteed ANOMALY Chibi unlock or star-up duplicate. */
export function redeemAnomalyChibiDomain(
  ctx: RiftDomainContext,
  chibiId: string,
  onSave?: () => void
): 'redeemed' | 'no_shards' | 'invalid' {
  const def = getAnomalyChibiById(chibiId);
  if (!def) return 'invalid';
  if (ctx.riftShards < RIFT_SHARD_PITY_COST) return 'no_shards';
  ctx.riftShards -= RIFT_SHARD_PITY_COST;
  ctx.miners[def.chibiId] = (ctx.miners[def.chibiId] || 0) + 1;
  ctx.discovered.add(def.chibiId);
  onSave?.();
  return 'redeemed';
}
