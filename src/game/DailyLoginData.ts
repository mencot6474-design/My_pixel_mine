import { getFusionRecipeByResultChibiId } from './FusionData';

export interface DailyLoginRewardDef {
  day: number;
  chibiId: string | null;
  stars: number;
  nonSellable: boolean;
  label: string;
  subtitle: string;
}

export const DAILY_LOGIN_REWARDS: readonly DailyLoginRewardDef[] = [
  {
    day: 1,
    chibiId: 'cosmic-monarch',
    stars: 5,
    nonSellable: true,
    label: 'Cosmic Monarch',
    subtitle: 'Day 1 Exclusive • 5★ Full Star',
  },
  {
    day: 2,
    chibiId: 'crimson-eye-sovereign',
    stars: 5,
    nonSellable: true,
    label: 'Crimson Eye Sovereign',
    subtitle: 'Day 2 Exclusive • 5★ Full Star',
  },
  {
    day: 3,
    chibiId: 'crimson-gaze-maiden',
    stars: 5,
    nonSellable: true,
    label: 'Crimson Gaze Maiden',
    subtitle: 'Day 3 Exclusive • 5★ Full Star',
  },
  {
    day: 4,
    chibiId: 'kasa-watcher',
    stars: 5,
    nonSellable: true,
    label: 'Kasa Watcher',
    subtitle: 'Day 4 Exclusive • 5★ Full Star',
  },
  {
    day: 5,
    chibiId: 'prism-fracture-eye',
    stars: 5,
    nonSellable: true,
    label: 'Prism Fracture Eye',
    subtitle: 'Day 5 Exclusive • 5★ Full Star',
  },
  {
    day: 6,
    chibiId: 'chrono-maiden',
    stars: 5,
    nonSellable: true,
    label: 'Chrono Maiden',
    subtitle: 'Day 6 Exclusive • 5★ Full Star',
  },
  {
    day: 7,
    chibiId: 'ink-seraph',
    stars: 5,
    nonSellable: true,
    label: 'Ink Seraph',
    subtitle: 'Day 7 Apex Finale • 5★ Full Star',
  },
] as const;

const NON_SELLABLE_CHIBI_IDS = new Set<string>(
  DAILY_LOGIN_REWARDS.filter((r) => r.nonSellable && r.chibiId).map((r) => r.chibiId as string)
);

/** Returns true if this chibi is a non-sellable Limited or Fusion reward. */
export function isNonSellableChibi(chibiId: string): boolean {
  return NON_SELLABLE_CHIBI_IDS.has(chibiId) || Boolean(getFusionRecipeByResultChibiId(chibiId));
}

/** Returns all configured Daily Login Limited Chibi IDs. */
export function getDailyLoginLimitedChibiIds(): string[] {
  return [...NON_SELLABLE_CHIBI_IDS];
}

/** Looks up a Daily Login day definition (1..7). */
export function getDailyLoginRewardByDay(day: number): DailyLoginRewardDef | undefined {
  return DAILY_LOGIN_REWARDS.find((r) => r.day === day);
}
