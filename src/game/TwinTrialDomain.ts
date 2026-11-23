import { isPremiumShopChibi } from './PremiumShopData';
import type { PlotUnitState, TeamPresetSlots } from './GameStateSave';

export const TWIN_TRIAL_DURATION_MS = 20 * 60 * 1000;

export type TwinTrialStatus = 'locked' | 'available' | 'active' | 'expired';

export interface TwinTrialState {
  status: TwinTrialStatus;
  chibiId: string | null;
  startedAt: number;
  expiresAt: number;
}

export interface TwinTrialContext {
  twinTrial: TwinTrialState;
  miners: Record<string, number>;
  hotbar: (string | null)[];
  selectedHotbarSlot: number;
  plotMiners: (string | null)[];
  plotUnits: (PlotUnitState | null)[];
  stashedUnits: Record<string, PlotUnitState[]>;
  ownedPickaxes: Record<string, number>;
  teamPresets: TeamPresetSlots[];
}

export function createInitialTwinTrialState(): TwinTrialState {
  return {
    status: 'locked',
    chibiId: null,
    startedAt: 0,
    expiresAt: 0,
  };
}

export function getTrialOwnedCount(
  twinTrial: Pick<TwinTrialState, 'status' | 'chibiId'>,
  chibiId: string
): number {
  return twinTrial.status === 'active' && twinTrial.chibiId === chibiId ? 1 : 0;
}

export function getPermanentMinerCount(
  miners: Readonly<Record<string, number>>,
  twinTrial: Pick<TwinTrialState, 'status' | 'chibiId'>,
  chibiId: string
): number {
  const total = miners[chibiId] || 0;
  return Math.max(0, total - getTrialOwnedCount(twinTrial, chibiId));
}

export function getTwinTrialRemainingSec(
  twinTrial: Pick<TwinTrialState, 'status' | 'expiresAt'>,
  nowMs = Date.now()
): number {
  if (twinTrial.status !== 'active') return 0;
  return Math.max(0, Math.ceil((twinTrial.expiresAt - nowMs) / 1000));
}

/** Transitions a newly post-tutorial state from `'locked'` to `'available'` idempotently. */
export function unlockTwinTrialDomain(ctx: Pick<TwinTrialContext, 'twinTrial'>): boolean {
  if (ctx.twinTrial.status !== 'locked') return false;
  ctx.twinTrial.status = 'available';
  return true;
}

/** Grants 1 temporary read-only Twin Chibi for 20 minutes without adding it to `discovered`. */
export function claimTwinTrialDomain(
  ctx: Pick<TwinTrialContext, 'twinTrial' | 'miners' | 'hotbar'>,
  chibiId: string,
  nowMs = Date.now()
): boolean {
  if (ctx.twinTrial.status !== 'available') return false;
  if (!isPremiumShopChibi(chibiId)) return false;

  ctx.twinTrial.status = 'active';
  ctx.twinTrial.chibiId = chibiId;
  ctx.twinTrial.startedAt = nowMs;
  ctx.twinTrial.expiresAt = nowMs + TWIN_TRIAL_DURATION_MS;

  ctx.miners[chibiId] = (ctx.miners[chibiId] || 0) + 1;
  if (!ctx.hotbar.includes(chibiId)) {
    const emptyIdx = ctx.hotbar.indexOf(null);
    if (emptyIdx !== -1) ctx.hotbar[emptyIdx] = chibiId;
  }
  return true;
}

function compactHotbarSelection(ctx: Pick<TwinTrialContext, 'hotbar' | 'selectedHotbarSlot'>): void {
  const selectedItemId =
    ctx.selectedHotbarSlot >= 0 && ctx.selectedHotbarSlot < 9
      ? ctx.hotbar[ctx.selectedHotbarSlot]
      : null;
  const compact: (string | null)[] = ctx.hotbar.filter((id): id is string => Boolean(id));
  while (compact.length < 9) compact.push(null);
  ctx.hotbar = compact.slice(0, 9);
  if (selectedItemId) {
    ctx.selectedHotbarSlot = ctx.hotbar.indexOf(selectedItemId);
  } else if (ctx.selectedHotbarSlot >= 0 && !ctx.hotbar[ctx.selectedHotbarSlot]) {
    ctx.selectedHotbarSlot = -1;
  }
}

/** Removes the expired trial copy from inventory, hotbar, plots, stash, and presets while preserving any permanent copies. */
export function syncTwinTrialDomain(
  ctx: TwinTrialContext,
  nowMs = Date.now()
): { expired: boolean; chibiId: string | null } {
  if (ctx.twinTrial.status !== 'active') {
    return { expired: false, chibiId: null };
  }
  if (nowMs < ctx.twinTrial.expiresAt) {
    return { expired: false, chibiId: null };
  }

  const chibiId = ctx.twinTrial.chibiId;
  ctx.twinTrial.status = 'expired';
  if (!chibiId) {
    return { expired: true, chibiId: null };
  }

  const prevOwned = ctx.miners[chibiId] || 0;
  const nextOwned = Math.max(0, prevOwned - 1);
  if (nextOwned <= 0) {
    delete ctx.miners[chibiId];
  } else {
    ctx.miners[chibiId] = nextOwned;
  }

  // Remove the trial slot first, or excess slots beyond remaining permanent count
  const clearSlot = (idx: number): void => {
    const u = ctx.plotUnits[idx];
    if (u?.pickaxeId) {
      ctx.ownedPickaxes[u.pickaxeId] = (ctx.ownedPickaxes[u.pickaxeId] || 0) + 1;
    }
    ctx.plotMiners[idx] = null;
    ctx.plotUnits[idx] = null;
  };

  let remainingTrialSlotsToClear = 1;
  for (let i = 0; i < ctx.plotUnits.length && remainingTrialSlotsToClear > 0; i++) {
    const u = ctx.plotUnits[i];
    if (u && u.chibiId === chibiId && u.isTrial) {
      clearSlot(i);
      remainingTrialSlotsToClear--;
    }
  }

  // Fallback if a legacy/untagged trial slot exceeded permanent count
  let placedCount = ctx.plotMiners.filter((id) => id === chibiId).length;
  for (let i = ctx.plotMiners.length - 1; i >= 0 && placedCount > nextOwned; i--) {
    if (ctx.plotMiners[i] === chibiId) {
      clearSlot(i);
      placedCount--;
    }
  }

  // Clean stashed units for this chibiId (isTrial entries dropped first)
  const stashArr = ctx.stashedUnits[chibiId];
  if (Array.isArray(stashArr)) {
    const maxStash = Math.max(0, nextOwned - placedCount);
    const nonTrial = stashArr.filter((u) => !u.isTrial);
    if (maxStash <= 0 || nonTrial.length === 0) {
      delete ctx.stashedUnits[chibiId];
    } else {
      ctx.stashedUnits[chibiId] = nonTrial.slice(0, maxStash);
    }
  }

  if (nextOwned <= 0) {
    let hotbarChanged = false;
    for (let i = 0; i < ctx.hotbar.length; i++) {
      if (ctx.hotbar[i] === chibiId) {
        ctx.hotbar[i] = null;
        hotbarChanged = true;
      }
    }
    if (hotbarChanged) {
      compactHotbarSelection(ctx);
    }
    for (const preset of ctx.teamPresets) {
      if (!Array.isArray(preset)) continue;
      for (let s = 0; s < preset.length; s++) {
        if (preset[s] === chibiId) preset[s] = null;
      }
    }
  }

  return { expired: true, chibiId };
}
