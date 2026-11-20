export const OVERCLOCK_TAP_CHARGE = 4;
export const OVERCLOCK_METEOR_TAP_MULT = 2.0;
export const OVERCLOCK_CHIBI_METEOR_CHARGE = 1.5;
export const OVERCLOCK_BREAK_CHARGE = 8;
export const OVERCLOCK_METEOR_BREAK_CHARGE = 40;
export const OVERCLOCK_DURATION_SEC = 15;
export const OVERCLOCK_DECAY_DELAY_SEC = 5;
export const OVERCLOCK_DECAY_PER_SEC = 1.5;
export const OVERCLOCK_SPEED_MULT = 2.0;
export const OVERCLOCK_TAP_MULT = 2.0;
export const OVERCLOCK_DROP_MULT = 1.5;

export interface OverclockState {
  charge: number;
  activeUntil: number;
  lastChargeAt: number;
  lastStepAt: number;
}

export interface OverclockSnapshot {
  active: boolean;
  chargePct: number;
  remainingSec: number;
  durationSec: number;
}

export function createInitialOverclockState(): OverclockState {
  return {
    charge: 0,
    activeUntil: 0,
    lastChargeAt: 0,
    lastStepAt: 0,
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
    oc.activeUntil = nowMs + OVERCLOCK_DURATION_SEC * 1000;
    return true;
  }
  return false;
}

export function getOverclockSnapshotDomain(
  oc: OverclockState,
  nowMs: number = Date.now()
): OverclockSnapshot {
  const active = isOverclockActiveDomain(oc, nowMs);
  const remainingSec = active ? Math.max(0, (oc.activeUntil - nowMs) / 1000) : 0;
  const chargePct = active
    ? Math.max(0, Math.min(100, (remainingSec / OVERCLOCK_DURATION_SEC) * 100))
    : Math.max(0, Math.min(100, oc.charge));
  return {
    active,
    chargePct,
    remainingSec,
    durationSec: OVERCLOCK_DURATION_SEC,
  };
}
