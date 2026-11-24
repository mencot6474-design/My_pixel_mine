export const OVERCLOCK_TAP_CHARGE = 4;
export const OVERCLOCK_SWEET_SPOT_CHARGE = 15;
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
export const OVERCLOCK_PERFECT_EXTEND_SEC = 1.2;
export const OVERCLOCK_DECAY_DELAY_SEC = 5;
export const OVERCLOCK_DECAY_PER_SEC = 1.5;
export const OVERCLOCK_CHIBI_DMG_MULT = 2.0;
export const OVERCLOCK_SPEED_MULT = 1.0;
export const OVERCLOCK_TAP_MULT = 2.0;
export const OVERCLOCK_DROP_MULT = 1.5;
export const OVERCLOCK_HYPER_ENCORE_ULTS = 5;
export const OVERCLOCK_HYPER_ENCORE_MIN_SAFETY_SEC = 15;
export const OVERCLOCK_TIER1_CHARGE_MULT = 0.65;
export const OVERCLOCK_TIER2_CHARGE_MULT = 0.5;
export const OVERCLOCK_GEODE_FEVER_CHARGE = 24;

export type OverclockTier = 1 | 2 | 3;

/** Returns the number of basic attacks required to charge an Ult for the active Fever tier. */
export function getOverclockUltChargeReq(tier: 0 | OverclockTier): number {
  if (tier === 3) return 1;
  if (tier === 2) return 3;
  if (tier === 1) return 4;
  return 5;
}

export interface OverclockTierBuffs {
  tier: 0 | OverclockTier;
  label: string;
  chibiDmgMult: number;
  speedMult: number;
  tapMult: number;
  dropMult: number;
  critChance: number;
}

const TIER_BUFFS: Record<0 | OverclockTier, OverclockTierBuffs> = {
  0: {
    tier: 0,
    label: 'OVERCLOCK FEVER',
    chibiDmgMult: 1,
    speedMult: 1,
    tapMult: 1,
    dropMult: 1,
    critChance: 0.15,
  },
  1: {
    tier: 1,
    label: 'OVERCLOCK ACTIVE',
    chibiDmgMult: OVERCLOCK_CHIBI_DMG_MULT,
    speedMult: OVERCLOCK_SPEED_MULT,
    tapMult: OVERCLOCK_TAP_MULT,
    dropMult: OVERCLOCK_DROP_MULT,
    critChance: 0.3,
  },
  2: {
    tier: 2,
    label: 'SUPER FEVER LV.2',
    chibiDmgMult: 2.5,
    speedMult: 1,
    tapMult: 2.75,
    dropMult: 2.0,
    critChance: 0.4,
  },
  3: {
    tier: 3,
    label: 'HYPER FEVER LV.3',
    chibiDmgMult: 3.0,
    speedMult: 1,
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
  encoreTotal: number;
  encoreRemaining: number;
  encoreCompleted: number;
}

export interface OverclockSnapshot {
  active: boolean;
  tier: 0 | OverclockTier;
  chargePct: number;
  remainingSec: number;
  durationSec: number;
  chibiDmgMult: number;
  speedMult: number;
  tapMult: number;
  dropMult: number;
  critChance: number;
  encoreTotal: number;
  encoreRemaining: number;
  encoreCompleted: number;
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
    encoreTotal: 0,
    encoreRemaining: 0,
    encoreCompleted: 0,
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
      oc.encoreTotal = 0;
      oc.encoreRemaining = 0;
      oc.encoreCompleted = 0;
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
 * Adds charge to the Overclock meter and auto-activates Lv.1 at 100%,
 * or fills the active Lv.1 / Lv.2 tier bar to promote Lv.1 -> Lv.2 -> Lv.3 at 100%.
 * Returns true on the exact call that triggers activation or tier promotion.
 */
export function chargeOverclockDomain(
  oc: OverclockState,
  amount: number,
  nowMs: number = Date.now()
): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  stepOverclockDomain(oc, nowMs);

  if (isOverclockActiveDomain(oc, nowMs)) {
    const curTier: OverclockTier = oc.tier === 2 || oc.tier === 3 ? oc.tier : 1;
    if (curTier >= 3) return false;
    const mult = curTier === 2 ? OVERCLOCK_TIER2_CHARGE_MULT : OVERCLOCK_TIER1_CHARGE_MULT;
    oc.charge = Math.min(100, oc.charge + amount * mult);
    oc.lastChargeAt = nowMs;
    oc.lastStepAt = nowMs;
    if (oc.charge >= 100) {
      const nextTier = (curTier + 1) as OverclockTier;
      oc.charge = 0;
      oc.tier = nextTier;
      const prevRemainingMs = Math.max(0, oc.activeUntil - nowMs);
      const maxRemainingMs = OVERCLOCK_MAX_DURATION_SEC * 1000;
      const minNextMs =
        nextTier === 3
          ? OVERCLOCK_HYPER_ENCORE_MIN_SAFETY_SEC * 1000
          : OVERCLOCK_DURATION_SEC * 1000;
      const nextRemainingMs = Math.min(
        maxRemainingMs,
        Math.max(prevRemainingMs + 4_000, minNextMs)
      );
      oc.activeUntil = nowMs + nextRemainingMs;
      oc.maxDurationSec = Math.max(OVERCLOCK_DURATION_SEC, nextRemainingMs / 1000);
      if (nextTier === 3) {
        oc.encoreTotal = OVERCLOCK_HYPER_ENCORE_ULTS;
        oc.encoreRemaining = OVERCLOCK_HYPER_ENCORE_ULTS;
        oc.encoreCompleted = 0;
      }
      return true;
    }
    return false;
  }

  oc.charge = Math.min(100, oc.charge + amount);
  oc.lastChargeAt = nowMs;
  oc.lastStepAt = nowMs;

  if (oc.charge >= 100) {
    oc.charge = 0;
    oc.tier = 1;
    oc.maxDurationSec = OVERCLOCK_DURATION_SEC;
    oc.encoreTotal = 0;
    oc.encoreRemaining = 0;
    oc.encoreCompleted = 0;
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
  if (tierUp) {
    oc.charge = 0;
  }

  const prevRemainingMs = Math.max(0, oc.activeUntil - nowMs);
  const maxRemainingMs = OVERCLOCK_MAX_DURATION_SEC * 1000;
  const safeExtendMs = Number.isFinite(extendSec) && extendSec > 0 ? extendSec * 1000 : 0;
  let nextRemainingMs = Math.min(maxRemainingMs, prevRemainingMs + safeExtendMs);
  if (tierUp && nextTier === 3) {
    oc.encoreTotal = OVERCLOCK_HYPER_ENCORE_ULTS;
    oc.encoreRemaining = OVERCLOCK_HYPER_ENCORE_ULTS;
    oc.encoreCompleted = 0;
    nextRemainingMs = Math.min(
      maxRemainingMs,
      Math.max(nextRemainingMs, OVERCLOCK_HYPER_ENCORE_MIN_SAFETY_SEC * 1000)
    );
  }
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

/** Consumes one Tier 3 Hyper Encore Ult launch and preserves a safety margin for the finisher. */
export function consumeOverclockEncoreUltDomain(
  oc: OverclockState,
  nowMs: number = Date.now()
): { remaining: number; completed: number; total: number } {
  if (!isOverclockActiveDomain(oc, nowMs) || oc.tier !== 3 || oc.encoreTotal <= 0) {
    return { remaining: 0, completed: 0, total: 0 };
  }
  oc.encoreRemaining = Math.max(0, oc.encoreRemaining - 1);
  oc.encoreCompleted = Math.min(oc.encoreTotal, oc.encoreCompleted + 1);
  oc.activeUntil = Math.max(oc.activeUntil, nowMs + 6_000);
  oc.lastStepAt = nowMs;
  return {
    remaining: oc.encoreRemaining,
    completed: oc.encoreCompleted,
    total: oc.encoreTotal,
  };
}

/** Immediately ends Overclock Fever and resets charge to 0% after the 5th Hyper Encore finisher lands. */
export function finishOverclockEncoreDomain(oc: OverclockState, nowMs: number = Date.now()): boolean {
  if (oc.activeUntil <= 0 && oc.charge <= 0) {
    return false;
  }
  oc.activeUntil = 0;
  oc.charge = 0;
  oc.tier = 1;
  oc.maxDurationSec = OVERCLOCK_DURATION_SEC;
  oc.encoreTotal = 0;
  oc.encoreRemaining = 0;
  oc.encoreCompleted = 0;
  oc.lastStepAt = nowMs;
  return true;
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
  const encoreTotal = active && tier === 3 ? Math.max(0, oc.encoreTotal || 0) : 0;
  const encoreRemaining =
    active && tier === 3 ? Math.max(0, Math.min(encoreTotal, oc.encoreRemaining || 0)) : 0;
  const encoreCompleted =
    active && tier === 3 ? Math.max(0, Math.min(encoreTotal, oc.encoreCompleted || 0)) : 0;
  const chargePct = active
    ? tier === 3
      ? encoreTotal > 0
        ? Math.max(0, Math.min(100, (encoreRemaining / encoreTotal) * 100))
        : Math.max(0, Math.min(100, (remainingSec / maxDur) * 100))
      : Math.max(0, Math.min(100, oc.charge))
    : Math.max(0, Math.min(100, oc.charge));
  return {
    active,
    tier,
    chargePct,
    remainingSec,
    durationSec: active ? maxDur : OVERCLOCK_DURATION_SEC,
    chibiDmgMult: buffs.chibiDmgMult,
    speedMult: buffs.speedMult,
    tapMult: buffs.tapMult,
    dropMult: buffs.dropMult,
    critChance: buffs.critChance,
    encoreTotal,
    encoreRemaining,
    encoreCompleted,
  };
}
