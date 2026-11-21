export const OVERCLOCK_TAP_CHARGE = 4;
export const OVERCLOCK_METEOR_TAP_MULT = 2.0;
export const OVERCLOCK_CHIBI_METEOR_CHARGE = 1.5;
export const OVERCLOCK_BREAK_CHARGE = 8;
export const OVERCLOCK_METEOR_BREAK_CHARGE = 40;
export const OVERCLOCK_PIT_EVENT_CHARGE = 25;
export const OVERCLOCK_DURATION_SEC = 15;
export const OVERCLOCK_MAX_DURATION_SEC = 25;
export const OVERCLOCK_METEOR_EXTEND_SEC = 5;
export const OVERCLOCK_PIT_EVENT_EXTEND_SEC = 4;
export const OVERCLOCK_GEODE_EXTEND_SEC = 1.5;
export const OVERCLOCK_DECAY_DELAY_SEC = 5;
export const OVERCLOCK_DECAY_PER_SEC = 1.5;
export const OVERCLOCK_SPEED_MULT = 2.0;
export const OVERCLOCK_TAP_MULT = 2.0;
export const OVERCLOCK_DROP_MULT = 1.5;

export type OverclockTier = 1 | 2 | 3;

export interface OverclockTierBuffs {
  tier: 0 | OverclockTier;
  label: string;
  speedMult: number;
  tapMult: number;
  dropMult: number;
  critChance: number;
}

const TIER_BUFFS: Record<0 | OverclockTier, OverclockTierBuffs> = {
  0: {
    tier: 0,
    label: 'OVERCLOCK FEVER',
    speedMult: 1,
    tapMult: 1,
    dropMult: 1,
    critChance: 0.15,
  },
  1: {
    tier: 1,
    label: 'OVERCLOCK ACTIVE',
    speedMult: OVERCLOCK_SPEED_MULT,
    tapMult: OVERCLOCK_TAP_MULT,
    dropMult: OVERCLOCK_DROP_MULT,
    critChance: 0.3,
  },
  2: {
    tier: 2,
    label: 'SUPER FEVER LV.2',
    speedMult: 2.5,
    tapMult: 2.75,
    dropMult: 2.0,
    critChance: 0.4,
  },
  3: {
    tier: 3,
    label: 'HYPER FEVER LV.3',
    speedMult: 3.0,
    tapMult: 3.5,
    dropMult: 2.5,
    critChance: 0.5,
  },
};

export function getOverclockTierBuffs(tier: 0 | OverclockTier): OverclockTierBuffs {
  return TIER_BUFFS[tier] ?? TIER_BUFFS[0];
}

export interface OverclockState {
  charge: number;
  activeUntil: number;
  lastChargeAt: number;
  lastStepAt: number;
  tier: OverclockTier;
  maxDurationSec: number;
}

export interface OverclockSnapshot {
  active: boolean;
  tier: 0 | OverclockTier;
  chargePct: number;
  remainingSec: number;
  durationSec: number;
  speedMult: number;
  tapMult: number;
  dropMult: number;
  critChance: number;
}

export interface OverclockExtendResult {
  extended: boolean;
  tierUp: boolean;
  tier: OverclockTier;
  addedSec: number;
}

export function createInitialOverclockState(): OverclockState {
  return {
    charge: 0,
    activeUntil: 0,
    lastChargeAt: 0,
    lastStepAt: 0,
    tier: 1,
    maxDurationSec: OVERCLOCK_DURATION_SEC,
  };
}

export function isOverclockActiveDomain(oc: OverclockState, nowMs: number = Date.now()): boolean {
  return oc.activeUntil > nowMs;
}

/**
 * Advances Overclock state (expires active buff cleanly or applies gentle idle decay).
 * Returns true if Overclock was active and just expired on this step.
 */
export function stepOverclockDomain(oc: OverclockState, nowMs: number = Date.now()): boolean {
  if (oc.activeUntil > 0) {
    if (nowMs >= oc.activeUntil) {
      oc.activeUntil = 0;
      oc.charge = 0;
      oc.tier = 1;
      oc.maxDurationSec = OVERCLOCK_DURATION_SEC;
      oc.lastStepAt = nowMs;
      return true;
    }
    oc.lastStepAt = nowMs;
    return false;
  }

  if (oc.charge > 0 && oc.lastChargeAt > 0) {
    const decayStart = oc.lastChargeAt + OVERCLOCK_DECAY_DELAY_SEC * 1000;
    if (nowMs > decayStart) {
      const prev = Math.max(decayStart, oc.lastStepAt || decayStart);
      const dtSec = Math.max(0, (nowMs - prev) / 1000);
      if (dtSec > 0) {
        oc.charge = Math.max(0, oc.charge - dtSec * OVERCLOCK_DECAY_PER_SEC);
      }
    }
  }
  oc.lastStepAt = nowMs;
  return false;
}

/**
 * Adds charge to the Overclock meter and auto-activates when reaching 100%.
 * Returns true on the exact call that triggers Overclock activation.
 */
export function chargeOverclockDomain(
  oc: OverclockState,
  amount: number,
  nowMs: number = Date.now()
): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  stepOverclockDomain(oc, nowMs);
  if (isOverclockActiveDomain(oc, nowMs)) return false;

  oc.charge = Math.min(100, oc.charge + amount);
  oc.lastChargeAt = nowMs;
  oc.lastStepAt = nowMs;

  if (oc.charge >= 100) {
    oc.charge = 100;
    oc.tier = 1;
    oc.maxDurationSec = OVERCLOCK_DURATION_SEC;
    oc.activeUntil = nowMs + OVERCLOCK_DURATION_SEC * 1000;
    return true;
  }
  return false;
}

/**
 * Extends an active Overclock Fever run (up to OVERCLOCK_MAX_DURATION_SEC remaining)
 * and optionally advances Fever tier (1 -> 2 -> 3) for chain-extension hype.
 */
export function extendOverclockDomain(
  oc: OverclockState,
  extendSec: number,
  advanceTier = false,
  nowMs: number = Date.now()
): OverclockExtendResult {
  stepOverclockDomain(oc, nowMs);
  if (!isOverclockActiveDomain(oc, nowMs)) {
    return { extended: false, tierUp: false, tier: oc.tier ?? 1, addedSec: 0 };
  }

  const prevTier: OverclockTier = oc.tier === 2 || oc.tier === 3 ? oc.tier : 1;
  const nextTier: OverclockTier =
    advanceTier && prevTier < 3 ? ((prevTier + 1) as OverclockTier) : prevTier;
  const tierUp = nextTier > prevTier;
  oc.tier = nextTier;

  const prevRemainingMs = Math.max(0, oc.activeUntil - nowMs);
  const maxRemainingMs = OVERCLOCK_MAX_DURATION_SEC * 1000;
  const safeExtendMs = Number.isFinite(extendSec) && extendSec > 0 ? extendSec * 1000 : 0;
  const nextRemainingMs = Math.min(maxRemainingMs, prevRemainingMs + safeExtendMs);
  const addedSec = Math.max(0, (nextRemainingMs - prevRemainingMs) / 1000);

  oc.activeUntil = nowMs + nextRemainingMs;
  oc.maxDurationSec = Math.max(
    OVERCLOCK_DURATION_SEC,
    oc.maxDurationSec || OVERCLOCK_DURATION_SEC,
    nextRemainingMs / 1000
  );
  oc.lastStepAt = nowMs;

  return {
    extended: addedSec > 0 || tierUp,
    tierUp,
    tier: nextTier,
    addedSec,
  };
}

export function getOverclockSnapshotDomain(
  oc: OverclockState,
  nowMs: number = Date.now()
): OverclockSnapshot {
  const active = isOverclockActiveDomain(oc, nowMs);
  const tier: 0 | OverclockTier = active
    ? oc.tier === 2 || oc.tier === 3
      ? oc.tier
      : 1
    : 0;
  const buffs = getOverclockTierBuffs(tier);
  const maxDur = Math.max(OVERCLOCK_DURATION_SEC, oc.maxDurationSec || OVERCLOCK_DURATION_SEC);
  const remainingSec = active ? Math.max(0, (oc.activeUntil - nowMs) / 1000) : 0;
  const chargePct = active
    ? Math.max(0, Math.min(100, (remainingSec / maxDur) * 100))
    : Math.max(0, Math.min(100, oc.charge));
  return {
    active,
    tier,
    chargePct,
    remainingSec,
    durationSec: active ? maxDur : OVERCLOCK_DURATION_SEC,
    speedMult: buffs.speedMult,
    tapMult: buffs.tapMult,
    dropMult: buffs.dropMult,
    critChance: buffs.critChance,
  };
}
