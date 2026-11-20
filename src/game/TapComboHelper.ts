export const TAP_COMBO_WINDOW_MS = 1350;

export type TapComboTierId = 'cool' | 'super' | 'hyper' | 'overdrive' | 'godlike';

export interface TapComboTierInfo {
  id: TapComboTierId;
  badgeText: string;
}

export interface TapComboState {
  count: number;
  lastTapAtMs: number;
}

export function getTapComboTier(count: number): TapComboTierInfo {
  if (count >= 100) return { id: 'godlike', badgeText: 'GODLIKE!' };
  if (count >= 50) return { id: 'overdrive', badgeText: 'OVERDRIVE!' };
  if (count >= 25) return { id: 'hyper', badgeText: 'HYPER!' };
  if (count >= 10) return { id: 'super', badgeText: 'SUPER!' };
  return { id: 'cool', badgeText: 'COMBO' };
}

export function stepTapCombo(
  prev: TapComboState,
  nowMs: number,
  windowMs = TAP_COMBO_WINDOW_MS
): TapComboState {
  const active = prev.count > 0 && nowMs - prev.lastTapAtMs <= windowMs;
  return {
    count: active ? prev.count + 1 : 1,
    lastTapAtMs: nowMs,
  };
}
