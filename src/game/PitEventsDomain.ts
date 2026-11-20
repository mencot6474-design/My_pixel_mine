export type PitEventKind = 'golden_vein' | 'crystal_surge';

export interface PitEventDef {
  kind: PitEventKind;
  title: string;
  badgeText: string;
  subtitle: string;
  colorHex: string;
  hexNum: number;
  durationSec: number;
  oreDropMult: number;
  feverChargeMult: number;
  baseBonusGems: number;
}

export const PIT_EVENT_COOLDOWN_MIN_SEC = 55;
export const PIT_EVENT_COOLDOWN_MAX_SEC = 85;

export const PIT_EVENT_DEFS: Record<PitEventKind, PitEventDef> = {
  golden_vein: {
    kind: 'golden_vein',
    title: 'GOLDEN VEIN',
    badgeText: '★ GOLDEN VEIN 5×',
    subtitle: '5× Ore Drops on break!',
    colorHex: '#fbbf24',
    hexNum: 0xfbbf24,
    durationSec: 25,
    oreDropMult: 5,
    feverChargeMult: 1,
    baseBonusGems: 0,
  },
  crystal_surge: {
    kind: 'crystal_surge',
    title: 'CRYSTAL SURGE',
    badgeText: '⚡ CRYSTAL SURGE 3×',
    subtitle: '3× Fever Charge + Bonus Gems!',
    colorHex: '#22d3ee',
    hexNum: 0x22d3ee,
    durationSec: 25,
    oreDropMult: 1.5,
    feverChargeMult: 3,
    baseBonusGems: 25,
  },
};

export function rollNextPitEventCooldownSec(rng: () => number = Math.random): number {
  const span = PIT_EVENT_COOLDOWN_MAX_SEC - PIT_EVENT_COOLDOWN_MIN_SEC;
  return PIT_EVENT_COOLDOWN_MIN_SEC + Math.max(0, Math.min(1, rng())) * span;
}

export function rollPitEventKind(rng: () => number = Math.random): PitEventKind {
  return rng() < 0.55 ? 'golden_vein' : 'crystal_surge';
}

export function computePitEventBonusGems(worldIndex: number, kind: PitEventKind): number {
  const def = PIT_EVENT_DEFS[kind];
  if (def.baseBonusGems <= 0) return 0;
  const safeWorldIdx = Math.max(0, Math.floor(worldIndex));
  return def.baseBonusGems * (safeWorldIdx + 1);
}
