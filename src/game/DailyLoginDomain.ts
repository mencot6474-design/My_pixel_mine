import { CHIBI_MAX_STARS } from './GameData';
import {
  DAILY_LOGIN_REWARDS,
  DailyLoginRewardDef,
  getDailyLoginRewardByDay,
} from './DailyLoginData';

export interface DailyLoginContext {
  dailyLoginLastClaimDate: string;
  dailyLoginClaimedDays: number[];
  miners: Record<string, number>;
  chibiStars: Record<string, number>;
  discovered: Set<string>;
  hotbar: Array<string | null>;
}

export interface DailyLoginSnapshot {
  todayKey: string;
  canClaim: boolean;
  nextDay: number | null;
  claimedDays: readonly number[];
  rewards: readonly DailyLoginRewardDef[];
}

/** Returns the local calendar date key as YYYY-MM-DD. */
export function getLocalDateKey(now = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the next unclaimed day number (1..7) that has an active reward configured. */
export function getNextDailyLoginDayDomain(ctx: Pick<DailyLoginContext, 'dailyLoginClaimedDays'>): number | null {
  const claimed = new Set(ctx.dailyLoginClaimedDays);
  for (const r of DAILY_LOGIN_REWARDS) {
    if (!claimed.has(r.day) && r.chibiId) {
      return r.day;
    }
  }
  return null;
}

/** Returns true if the player can claim today's Daily Login Limited Chibi reward. */
export function canClaimDailyLoginDomain(
  ctx: Pick<DailyLoginContext, 'dailyLoginLastClaimDate' | 'dailyLoginClaimedDays'>,
  now = Date.now()
): boolean {
  const today = getLocalDateKey(now);
  if (ctx.dailyLoginLastClaimDate === today) return false;
  return getNextDailyLoginDayDomain(ctx) !== null;
}

/** Builds a UI-ready snapshot of Daily Login state. */
export function getDailyLoginSnapshotDomain(
  ctx: Pick<DailyLoginContext, 'dailyLoginLastClaimDate' | 'dailyLoginClaimedDays'>,
  now = Date.now()
): DailyLoginSnapshot {
  return {
    todayKey: getLocalDateKey(now),
    canClaim: canClaimDailyLoginDomain(ctx, now),
    nextDay: getNextDailyLoginDayDomain(ctx),
    claimedDays: [...ctx.dailyLoginClaimedDays],
    rewards: DAILY_LOGIN_REWARDS,
  };
}

/** Claims the next Daily Login Limited 5-star Chibi reward and places it in an empty hotbar slot if available. */
export function claimDailyLoginDomain(
  ctx: DailyLoginContext,
  now = Date.now(),
  emit: () => void = () => {}
): DailyLoginRewardDef | null {
  if (!canClaimDailyLoginDomain(ctx, now)) return null;
  const nextDay = getNextDailyLoginDayDomain(ctx);
  if (nextDay === null) return null;
  const reward = getDailyLoginRewardByDay(nextDay);
  if (!reward || !reward.chibiId) return null;

  const chibiId = reward.chibiId;
  ctx.miners[chibiId] = (ctx.miners[chibiId] || 0) + 1;
  const targetStars = Math.max(1, Math.min(CHIBI_MAX_STARS, reward.stars));
  ctx.chibiStars[chibiId] = Math.max(ctx.chibiStars[chibiId] || 0, targetStars);
  ctx.discovered.add(chibiId);

  if (!ctx.hotbar.includes(chibiId)) {
    const emptyIdx = ctx.hotbar.slice(0, 9).findIndex((slot) => !slot);
    if (emptyIdx !== -1) {
      ctx.hotbar[emptyIdx] = chibiId;
    }
  }

  ctx.dailyLoginLastClaimDate = getLocalDateKey(now);
  if (!ctx.dailyLoginClaimedDays.includes(reward.day)) {
    ctx.dailyLoginClaimedDays = [...ctx.dailyLoginClaimedDays, reward.day].sort((a, b) => a - b);
  }

  emit();
  return reward;
}
