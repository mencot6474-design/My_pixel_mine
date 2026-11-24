import type { ChibiDef } from './ChibiCatalog';

export interface WorldPoint3 {
  x: number;
  y: number;
  z: number;
}

export interface TierMotionWaypoint {
  t: number;
  x: number;
  y: number;
  z: number;
  face: 1 | -1;
  rz: number;
  pose: 'idle' | 'attack' | 'aura';
  snap: boolean;
  col: string;
  scale: number;
  opacity?: number;
}

export interface SampledMotionFrame {
  x: number;
  y: number;
  z: number;
  face: 1 | -1;
  rz: number;
  pose: 'idle' | 'attack' | 'aura';
  col: string;
  scale: number;
  opacity: number;
  snapping: boolean;
}

export interface TierVfxHooks {
  onArenaDim?: (level: number, tintHex: string, duration: number) => void;
  onImpactFrame?: (strength: number, invert: number, tintHex: string, duration: number) => void;
  onSpeedLines?: (level: number, duration: number) => void;
  onCameraPush?: (zoomAmt: number, pitchKick: number) => void;
  onFlash?: (colorHex: string, strength: number) => void;
}

export interface TierAttackFireOpts {
  rarity: ChibiDef['rarity'] | string;
  chibiId?: string;
  colorHex: string;
  secondaryHex?: string;
  target: WorldPoint3;
  allTargets?: readonly WorldPoint3[];
  comboStep?: number;
  speedScale?: number;
  areaScale?: number;
  wideCenter?: WorldPoint3;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const CHIBI_ATTACK_ANIM_SEC = 2.5;
export const CHIBI_BLITZ_SHADOW_SEC = 0.88;
export const BARRAGE_BEAT_WEIGHTS = [0.08, 0.1, 0.11, 0.13, 0.15, 0.18, 0.25] as const;
export const BARRAGE_FOLLOWUP_DELAYS = [0.18, 0.36, 0.56, 0.78, 1.04, 1.48] as const;

export type BarrageDamageTuple = [number, number, number, number, number, number, number];

export function splitBarrageDamage(totalDmg: number): BarrageDamageTuple {
  const safe = Math.max(1, Math.round(totalDmg));
  const out: BarrageDamageTuple = [0, 0, 0, 0, 0, 0, 0];
  if (safe < BARRAGE_BEAT_WEIGHTS.length) {
    for (let i = 0; i < safe; i++) {
      out[i] = 1;
    }
    return out;
  }
  let used = 0;
  const lastIdx = BARRAGE_BEAT_WEIGHTS.length - 1;
  for (let i = 0; i < lastIdx; i++) {
    const remainingMin = lastIdx - i;
    const raw = Math.max(1, Math.round(safe * BARRAGE_BEAT_WEIGHTS[i]));
    const clamped = Math.min(safe - used - remainingMin, raw);
    out[i] = clamped;
    used += clamped;
  }
  out[lastIdx] = Math.max(1, safe - used);
  return out;
}

export function computeAttackVfxSpeedScale(attackInterval: number): number {
  return Math.max(1.65, Math.min(1.95, attackInterval / 1.35));
}

export function computeSpotlightMaxChargeSec(unitCount: number): number {
  return Math.max(CHIBI_ATTACK_ANIM_SEC, Math.max(1, unitCount) * CHIBI_ATTACK_ANIM_SEC * 1.5);
}

/**
 * Enforces strict single-Chibi Sakuga spotlight turns across up to 5 podium slots.
 * Guarantees zero overlapping 2.5s skill shaders while advancing in round-robin order.
 */
export class SpotlightAttackQueue {
  private lockRemaining = 0;
  private nextCursorSlot = 0;

  public reset(): void {
    this.lockRemaining = 0;
    this.nextCursorSlot = 0;
  }

  public getLockRemaining(): number {
    return this.lockRemaining;
  }

  public step(dtSec: number): void {
    if (this.lockRemaining > 0) {
      const next = this.lockRemaining - dtSec;
      this.lockRemaining = next <= 1e-6 ? 0 : next;
    }
  }

  public pickNextReady<T extends { slotIndex: number }>(
    units: Iterable<T>,
    getCooldown: (unit: T) => number
  ): T | null {
    if (this.lockRemaining > 0) return null;

    let bestAfterCursor: T | null = null;
    let bestWrap: T | null = null;

    for (const u of units) {
      if (getCooldown(u) > 0) continue;
      if (u.slotIndex >= this.nextCursorSlot) {
        if (!bestAfterCursor || u.slotIndex < bestAfterCursor.slotIndex) {
          bestAfterCursor = u;
        }
      } else {
        if (!bestWrap || u.slotIndex < bestWrap.slotIndex) {
          bestWrap = u;
        }
      }
    }

    return bestAfterCursor ?? bestWrap;
  }

  public claim(firedSlot: number, durationSec = CHIBI_ATTACK_ANIM_SEC): void {
    this.lockRemaining = Math.max(0, durationSec);
    this.nextCursorSlot = firedSlot + 1;
  }
}

export function getRaritySecondaryColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon':
    case 'epic':
    case 'exotic':
      return '#fef08a';
    case 'legendary':
      return '#fb923c';
    case 'rainbow':
      return '#22d3ee';
    case 'mythic':
      return '#ffffff';
    case 'secret':
      return '#c084fc';
    case 'fusion':
      return '#ec4899';
    case 'limited':
      return '#e11d48';
    case 'twin':
      return '#f43f5e';
    case 'omega':
      return '#fbbf24';
    default:
      return '#e0f2fe';
  }
}

export function isWideAoeRarity(rarity: string): boolean {
  return rarity === 'fusion' || rarity === 'twin' || rarity === 'omega';
}

export function resolvePitBounds(
  allTargets: readonly WorldPoint3[],
  target: WorldPoint3,
  wideCenter?: WorldPoint3
): { cx: number; cy: number; cz: number; pts: WorldPoint3[] } {
  if (allTargets.length >= 2) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let avgY = 0;
    for (let i = 0; i < allTargets.length; i++) {
      const p = allTargets[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      avgY += p.y;
    }
    const cx = wideCenter ? wideCenter.x : (minX + maxX) * 0.5;
    const cz = wideCenter ? wideCenter.z : (minZ + maxZ) * 0.5;
    const cy = wideCenter ? wideCenter.y : avgY / allTargets.length;
    const pts =
      allTargets.length <= 6
        ? [...allTargets]
        : [...allTargets]
            .sort(
              (a, b) =>
                (a.x - cx) * (a.x - cx) +
                (a.z - cz) * (a.z - cz) -
                ((b.x - cx) * (b.x - cx) + (b.z - cz) * (b.z - cz))
            )
            .slice(0, 6);
    return { cx, cy, cz, pts };
  }
  const cx = wideCenter ? wideCenter.x : target.x;
  const cy = wideCenter ? wideCenter.y : target.y;
  const cz = wideCenter ? wideCenter.z : target.z;
  return {
    cx,
    cy,
    cz,
    pts: [
      { x: cx - 2.4, y: cy, z: cz - 1.1 },
      { x: cx + 2.4, y: cy, z: cz - 1.0 },
      { x: cx - 2.1, y: cy, z: cz + 1.2 },
      { x: cx + 2.2, y: cy, z: cz + 1.1 },
      { x: cx, y: cy, z: cz },
    ],
  };
}

/**
 * Generates clean world-space multi-teleport kinetic motion waypoints per Chibi rarity.
 */
export function buildTierMotionWaypoints(
  rarity: string,
  anchor: WorldPoint3,
  target: WorldPoint3,
  allTargets: readonly WorldPoint3[],
  color: string,
  secondary: string,
  wideCenter?: WorldPoint3,
  motionScale = 1.0,
  chibiId?: string
): { hero: TierMotionWaypoint[]; clone?: TierMotionWaypoint[] } {
  const ax = anchor.x;
  const ay = anchor.y;
  const az = anchor.z;
  const tx = target.x;
  const ty = target.y;
  const tz = target.z;
  const side: 1 | -1 = tx < ax ? 1 : -1;
  const faceToward: 1 | -1 = tx < ax ? -1 : 1;

  const restStart: TierMotionWaypoint = {
    t: 0.0, x: ax, y: ay, z: az, face: faceToward, rz: 0, pose: 'attack', snap: false, col: color, scale: 1,
  };
  const restEnd: TierMotionWaypoint = {
    t: 1.0, x: ax, y: ay, z: az, face: faceToward, rz: 0, pose: 'idle', snap: false, col: color, scale: 1,
  };

  const bounds = resolvePitBounds(allTargets, target, wideCenter);
  const cx = bounds.cx;
  const cy = bounds.cy;
  const cz = bounds.cz;
  const pts = bounds.pts;
  const ms = Math.max(0.55, Math.min(1.2, motionScale));

  switch (rarity) {
    case 'common':
      return {
        hero: [
          restStart,
          { t: 0.14, x: ax - side * 0.25, y: ay, z: az, face: faceToward, rz: 0.14, pose: 'attack', snap: false, col: color, scale: 1.04 },
          { t: 0.32, x: tx + side * 1.15, y: ty + 0.25, z: tz + 0.32, face: faceToward, rz: -0.28, pose: 'attack', snap: false, col: color, scale: 1.1 },
          { t: 0.66, x: tx + side * 0.72, y: ty + 0.1, z: tz + 0.32, face: faceToward, rz: -0.08, pose: 'attack', snap: false, col: color, scale: 1.05 },
          restEnd,
        ],
      };

    case 'uncommon':
      return {
        hero: [
          restStart,
          { t: 0.18, x: tx - 1.55, y: ty + 1.55, z: tz - 0.7, face: 1, rz: -0.22, pose: 'aura', snap: true, col: color, scale: 1.08 },
          { t: 0.45, x: tx + 1.55, y: ty + 1.7, z: tz - 0.5, face: -1, rz: 0.22, pose: 'attack', snap: true, col: secondary, scale: 1.08 },
          { t: 0.74, x: tx, y: ty + 1.25, z: tz + 0.85, face: 1, rz: 0, pose: 'aura', snap: true, col: color, scale: 1.12 },
          restEnd,
        ],
      };

    case 'rare':
      return {
        hero: [
          restStart,
          { t: 0.2, x: tx - 1.7, y: ty + 0.45, z: tz + 0.35, face: 1, rz: -0.18, pose: 'attack', snap: true, col: color, scale: 1.08 },
          { t: 0.5, x: tx + 1.7, y: ty + 0.45, z: tz - 0.35, face: -1, rz: 0.18, pose: 'attack', snap: true, col: secondary, scale: 1.08 },
          { t: 0.78, x: tx, y: ty + 1.0, z: tz - 0.95, face: 1, rz: 0, pose: 'aura', snap: true, col: color, scale: 1.14 },
          restEnd,
        ],
      };

    case 'epic': {
      const p0 = pts[0 % pts.length];
      const p1 = pts[1 % pts.length];
      const p2 = pts[2 % pts.length];
      const p3 = pts[3 % pts.length];
      return {
        hero: [
          restStart,
          { t: 0.18, x: p0.x, y: p0.y + 1.05, z: p0.z, face: 1, rz: -0.22, pose: 'attack', snap: false, col: color, scale: 1.1 },
          { t: 0.38, x: p1.x, y: p1.y + 1.15, z: p1.z, face: -1, rz: 0.22, pose: 'attack', snap: false, col: secondary, scale: 1.1 },
          { t: 0.58, x: p2.x, y: p2.y + 1.05, z: p2.z, face: 1, rz: -0.22, pose: 'attack', snap: false, col: color, scale: 1.1 },
          { t: 0.78, x: p3.x, y: p3.y + 1.2, z: p3.z, face: -1, rz: 0.18, pose: 'aura', snap: false, col: secondary, scale: 1.14 },
          restEnd,
        ],
      };
    }

    case 'legendary':
      return {
        hero: [
          restStart,
          { t: 0.16, x: tx - 2.3, y: ty + 2.6, z: tz - 1.2, face: 1, rz: -0.28, pose: 'aura', snap: true, col: color, scale: 1.14 },
          { t: 0.44, x: tx + 1.4, y: ty + 1.9, z: tz - 0.45, face: -1, rz: 0.3, pose: 'attack', snap: true, col: secondary, scale: 1.14 },
          { t: 0.72, x: tx, y: ty + 0.85, z: tz + 0.75, face: 1, rz: 0, pose: 'aura', snap: true, col: secondary, scale: 1.16 },
          restEnd,
        ],
      };

    case 'rainbow':
      return {
        hero: [
          restStart,
          { t: 0.18, x: ax, y: ay + 0.2, z: az, face: 1, rz: 0, pose: 'aura', snap: false, col: '#ef4444', scale: 1.05 },
          { t: 0.4, x: tx - 1.5, y: ty + 0.42, z: tz + 0.45, face: 1, rz: -0.28, pose: 'attack', snap: true, col: '#fbbf24', scale: 1.08 },
          { t: 0.64, x: tx + 1.5, y: ty + 0.68, z: tz - 0.55, face: -1, rz: 0.28, pose: 'attack', snap: true, col: '#22d3ee', scale: 1.08 },
          { t: 0.84, x: tx, y: ty + 0.5, z: tz + 1.35, face: 1, rz: -0.18, pose: 'aura', snap: true, col: '#a855f7', scale: 1.1 },
          restEnd,
        ],
      };

    case 'mythic':
      return {
        hero: [
          restStart,
          { t: 0.18, x: tx - 1.9, y: ty + 1.1, z: tz + 0.35, face: 1, rz: -0.15, pose: 'attack', snap: true, col: color, scale: 1.12 },
          { t: 0.5, x: tx + 1.9, y: ty + 1.3, z: tz - 0.45, face: -1, rz: 0.15, pose: 'attack', snap: true, col: secondary, scale: 1.12 },
          { t: 0.8, x: tx, y: ty + 1.6, z: tz + 0.25, face: 1, rz: 0, pose: 'aura', snap: true, col: color, scale: 1.18 },
          restEnd,
        ],
        clone: [
          { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: secondary, scale: 1, opacity: 0 },
          { t: 0.18, x: tx + 1.9, y: ty + 1.1, z: tz + 0.35, face: -1, rz: 0.15, pose: 'attack', snap: true, col: secondary, scale: 1.1, opacity: 0.88 },
          { t: 0.5, x: tx - 1.9, y: ty + 1.3, z: tz - 0.45, face: 1, rz: -0.15, pose: 'attack', snap: true, col: secondary, scale: 1.1, opacity: 0.88 },
          { t: 0.82, x: tx, y: ty + 1.85, z: tz - 0.55, face: -1, rz: 0, pose: 'aura', snap: true, col: secondary, scale: 1.1, opacity: 0.72 },
          { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: secondary, scale: 1, opacity: 0 },
        ],
      };

    case 'exotic':
      return {
        hero: [
          restStart,
          { t: 0.18, x: tx - 1.85, y: ty + 0.6, z: tz, face: 1, rz: -0.22, pose: 'attack', snap: true, col: color, scale: 1.1 },
          { t: 0.38, x: tx, y: ty + 0.9, z: tz - 1.65, face: -1, rz: 0.22, pose: 'attack', snap: true, col: secondary, scale: 1.1 },
          { t: 0.58, x: tx + 1.85, y: ty + 1.05, z: tz + 0.35, face: -1, rz: -0.22, pose: 'attack', snap: true, col: color, scale: 1.12 },
          { t: 0.8, x: tx, y: ty + 1.7, z: tz + 0.95, face: 1, rz: 0, pose: 'aura', snap: true, col: secondary, scale: 1.18 },
          restEnd,
        ],
      };

    case 'secret':
      return {
        hero: [
          restStart,
          { t: 0.16, x: tx - 1.75, y: ty + 0.85, z: tz + 0.55, face: 1, rz: -0.32, pose: 'attack', snap: true, col: color, scale: 1.1 },
          { t: 0.34, x: tx + 1.75, y: ty + 1.1, z: tz - 0.6, face: -1, rz: 0.32, pose: 'attack', snap: true, col: secondary, scale: 1.1 },
          { t: 0.54, x: tx, y: ty + 1.8, z: tz - 0.2, face: 1, rz: 0, pose: 'aura', snap: true, col: '#ffffff', scale: 1.2 },
          { t: 0.78, x: tx, y: ty + 0.55, z: tz + 0.45, face: 1, rz: -0.14, pose: 'attack', snap: true, col: color, scale: 1.16 },
          restEnd,
        ],
      };

    case 'fusion': {
      const [colA, colB]: [string, string] =
        chibiId === 'glitch-cheshire'
          ? ['#22d3ee', '#d946ef']
          : chibiId === 'thorn-maiden'
            ? ['#f43f5e', '#fb7185']
            : chibiId === 'monochrome-saint'
              ? ['#f8fafc', '#475569']
              : chibiId === 'prism-seraph'
                ? ['#facc15', '#38bdf8']
                : chibiId === 'aether-monarch'
                  ? ['#fbbf24', '#22d3ee']
                  : ['#22d3ee', '#ec4899'];
      return {
        hero: [
          restStart,
          { t: 0.15, x: cx - 3.0 * ms, y: cy + 0.75, z: cz - 1.0 * ms, face: 1, rz: -0.28, pose: 'attack', snap: true, col: colA, scale: 1.14 },
          { t: 0.31, x: cx + 3.0 * ms, y: cy + 0.95, z: cz - 0.9 * ms, face: -1, rz: 0.28, pose: 'attack', snap: true, col: colB, scale: 1.14 },
          { t: 0.47, x: cx - 2.6 * ms, y: cy + 0.7, z: cz + 1.3 * ms, face: 1, rz: -0.24, pose: 'attack', snap: true, col: colA, scale: 1.14 },
          { t: 0.63, x: cx + 2.7 * ms, y: cy + 1.05, z: cz + 1.2 * ms, face: -1, rz: 0.24, pose: 'attack', snap: true, col: colB, scale: 1.14 },
          { t: 0.84, x: cx, y: cy + 1.7, z: cz, face: 1, rz: 0, pose: 'aura', snap: true, col: '#ffffff', scale: 1.24 },
          restEnd,
        ],
      };
    }

    case 'limited':
      return {
        hero: [
          restStart,
          { t: 0.16, x: cx - 3.6 * ms, y: cy + 1.25, z: cz, face: 1, rz: -0.26, pose: 'attack', snap: true, col: color, scale: 1.16 },
          { t: 0.36, x: cx + 3.6 * ms, y: cy + 1.4, z: cz + 0.15, face: -1, rz: 0.26, pose: 'attack', snap: true, col: secondary, scale: 1.16 },
          { t: 0.62, x: cx, y: cy + 2.05, z: cz - 0.35, face: 1, rz: 0, pose: 'aura', snap: true, col: color, scale: 1.25 },
          { t: 0.85, x: cx, y: cy + 1.55, z: cz + 0.2, face: 1, rz: 0, pose: 'aura', snap: false, col: secondary, scale: 1.2 },
          restEnd,
        ],
      };

    case 'twin':
      switch (chibiId) {
        case 'yukikage-twins':
          return {
            hero: [
              restStart,
              { t: 0.032, x: cx - 3.3 * ms, y: cy + 1.45, z: cz + 0.9 * ms, face: 1, rz: -0.44, pose: 'attack', snap: true, col: '#0f172a', scale: 1.24 },
              { t: 0.082, x: cx + 3.4 * ms, y: cy + 1.85, z: cz - 1.0 * ms, face: -1, rz: 0.48, pose: 'attack', snap: true, col: '#38bdf8', scale: 1.26 },
              { t: 0.132, x: cx - 2.9 * ms, y: cy + 1.25, z: cz - 0.8 * ms, face: 1, rz: -0.46, pose: 'attack', snap: true, col: '#ffffff', scale: 1.28 },
              { t: 0.184, x: cx - 0.6, y: cy + 3.45, z: cz - 0.5, face: 1, rz: 0.16, pose: 'aura', snap: true, col: '#e0f2fe', scale: 1.30 },
              { t: 0.224, x: cx + 1.4 * ms, y: cy + 0.95, z: cz + 0.35 * ms, face: -1, rz: 0.50, pose: 'attack', snap: true, col: '#ffffff', scale: 1.36 },
              { t: 0.384, x: cx - 0.7, y: cy + 1.65, z: cz - 0.25, face: 1, rz: 0, pose: 'aura', snap: true, col: '#fbbf24', scale: 1.26 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'aura', snap: false, col: '#38bdf8', scale: 1, opacity: 0 },
              { t: 0.056, x: cx + 3.3 * ms, y: cy + 1.65, z: cz - 0.9 * ms, face: -1, rz: 0.44, pose: 'attack', snap: true, col: '#38bdf8', scale: 1.24, opacity: 0.96 },
              { t: 0.108, x: cx - 3.3 * ms, y: cy + 1.35, z: cz + 0.9 * ms, face: 1, rz: -0.46, pose: 'attack', snap: true, col: '#ffffff', scale: 1.26, opacity: 0.96 },
              { t: 0.156, x: cx + 2.8 * ms, y: cy + 2.05, z: cz + 0.7 * ms, face: -1, rz: 0.46, pose: 'attack', snap: true, col: '#2dd4bf', scale: 1.26, opacity: 0.96 },
              { t: 0.184, x: cx + 0.6, y: cy + 3.45, z: cz - 0.5, face: -1, rz: -0.16, pose: 'aura', snap: true, col: '#ffffff', scale: 1.30, opacity: 0.98 },
              { t: 0.224, x: cx, y: cy + 2.55, z: cz - 0.3, face: -1, rz: 0, pose: 'aura', snap: true, col: '#38bdf8', scale: 1.32, opacity: 0.99 },
              { t: 0.384, x: cx + 0.7, y: cy + 1.65, z: cz - 0.25, face: -1, rz: 0, pose: 'aura', snap: true, col: '#38bdf8', scale: 1.24, opacity: 0.94 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: '#38bdf8', scale: 1, opacity: 0 },
            ],
          };

        case 'halcyon-twins':
          return {
            hero: [
              restStart,
              { t: 0.028, x: cx, y: cy + 2.45, z: cz - 0.8 * ms, face: 1, rz: -0.20, pose: 'aura', snap: true, col: '#38bdf8', scale: 1.24 },
              { t: 0.056, x: cx - 3.3 * ms, y: cy + 1.15, z: cz + 0.9 * ms, face: 1, rz: -0.44, pose: 'attack', snap: true, col: '#38bdf8', scale: 1.26 },
              { t: 0.096, x: cx + 3.2 * ms, y: cy + 1.25, z: cz + 0.7 * ms, face: -1, rz: 0.44, pose: 'attack', snap: true, col: '#ffffff', scale: 1.28 },
              { t: 0.136, x: cx - 2.6 * ms, y: cy + 1.85, z: cz - 0.4 * ms, face: 1, rz: -0.40, pose: 'attack', snap: true, col: '#38bdf8', scale: 1.28 },
              { t: 0.185, x: cx, y: cy + 3.85, z: cz - 0.3 * ms, face: 1, rz: 0.12, pose: 'aura', snap: true, col: '#fde047', scale: 1.32 },
              { t: 0.244, x: cx + 0.4 * ms, y: cy + 0.75, z: cz + 0.35 * ms, face: 1, rz: -0.48, pose: 'attack', snap: true, col: '#ffffff', scale: 1.35 },
              { t: 0.376, x: cx - 0.65, y: cy + 1.65, z: cz - 0.3, face: 1, rz: 0, pose: 'aura', snap: true, col: '#fde047', scale: 1.24 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'aura', snap: false, col: '#fde047', scale: 1, opacity: 0 },
              { t: 0.028, x: cx + 0.35, y: cy + 1.15, z: cz - 0.85 * ms, face: -1, rz: 0.16, pose: 'aura', snap: true, col: '#2dd4bf', scale: 1.24, opacity: 0.98 },
              { t: 0.14, x: cx + 3.1 * ms, y: cy + 1.95, z: cz - 0.7 * ms, face: -1, rz: 0.34, pose: 'aura', snap: true, col: '#fde047', scale: 1.22, opacity: 0.96 },
              { t: 0.244, x: cx, y: cy + 2.95, z: cz - 0.6, face: -1, rz: 0, pose: 'aura', snap: true, col: '#ffffff', scale: 1.28, opacity: 0.99 },
              { t: 0.376, x: cx + 0.65, y: cy + 1.65, z: cz - 0.3, face: -1, rz: 0, pose: 'aura', snap: true, col: '#38bdf8', scale: 1.22, opacity: 0.94 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: '#fde047', scale: 1, opacity: 0 },
            ],
          };

        case 'nocturne-twins':
          return {
            hero: [
              restStart,
              { t: 0.08, x: cx - 3.0 * ms, y: cy + 1.35, z: cz + 0.9 * ms, face: 1, rz: -0.28, pose: 'aura', snap: true, col: '#f8fafc', scale: 1.20 },
              { t: 0.18, x: cx + 2.8 * ms, y: cy + 1.55, z: cz - 0.9 * ms, face: -1, rz: 0.30, pose: 'attack', snap: true, col: '#f8fafc', scale: 1.22 },
              { t: 0.216, x: cx - 0.85, y: cy + 2.35, z: cz + 0.15, face: 1, rz: -0.22, pose: 'aura', snap: true, col: '#f8fafc', scale: 1.28 },
              { t: 0.304, x: cx - 1.55, y: cy + 1.15, z: cz + 0.25, face: 1, rz: 0.18, pose: 'attack', snap: true, col: '#f8fafc', scale: 1.26 },
              { t: 0.464, x: cx - 0.75, y: cy + 1.45, z: cz + 0.15, face: 1, rz: -0.10, pose: 'aura', snap: true, col: '#a855f7', scale: 1.20 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'aura', snap: false, col: '#a855f7', scale: 1, opacity: 0 },
              { t: 0.08, x: cx + 3.0 * ms, y: cy + 1.35, z: cz - 0.9 * ms, face: -1, rz: 0.28, pose: 'aura', snap: true, col: '#a855f7', scale: 1.18, opacity: 0.95 },
              { t: 0.18, x: cx - 2.8 * ms, y: cy + 1.55, z: cz + 0.9 * ms, face: 1, rz: -0.30, pose: 'attack', snap: true, col: '#a855f7', scale: 1.20, opacity: 0.96 },
              { t: 0.216, x: cx + 0.85, y: cy + 2.35, z: cz + 0.15, face: -1, rz: 0.22, pose: 'aura', snap: true, col: '#a855f7', scale: 1.26, opacity: 0.98 },
              { t: 0.304, x: cx + 1.55, y: cy + 1.15, z: cz + 0.25, face: -1, rz: -0.18, pose: 'attack', snap: true, col: '#a855f7', scale: 1.24, opacity: 0.94 },
              { t: 0.464, x: cx + 0.75, y: cy + 1.45, z: cz + 0.15, face: -1, rz: 0.10, pose: 'aura', snap: true, col: '#f8fafc', scale: 1.16, opacity: 0.82 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: '#a855f7', scale: 1, opacity: 0 },
            ],
          };

        case 'lullaby-twins':
          return {
            hero: [
              restStart,
              { t: 0.08, x: cx - 3.0 * ms, y: cy + 1.65, z: cz + 0.9 * ms, face: 1, rz: -0.32, pose: 'aura', snap: true, col: '#f472b6', scale: 1.20 },
              { t: 0.16, x: cx + 2.9 * ms, y: cy + 0.85, z: cz - 0.8 * ms, face: -1, rz: 0.38, pose: 'attack', snap: true, col: '#c084fc', scale: 1.20 },
              { t: 0.22, x: cx - 2.6 * ms, y: cy + 1.05, z: cz + 0.7 * ms, face: 1, rz: -0.36, pose: 'attack', snap: true, col: '#f472b6', scale: 1.22 },
              { t: 0.295, x: cx - 0.7, y: cy + 2.45, z: cz + 0.15, face: 1, rz: -0.28, pose: 'aura', snap: true, col: '#f472b6', scale: 1.28 },
              { t: 0.42, x: cx - 0.65, y: cy + 0.95, z: cz + 0.15, face: 1, rz: 0.20, pose: 'attack', snap: true, col: '#f8fafc', scale: 1.24 },
              { t: 0.68, x: cx - 0.8, y: cy + 1.35, z: cz + 0.15, face: 1, rz: 0, pose: 'aura', snap: false, col: '#f472b6', scale: 1.16 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'aura', snap: false, col: '#c084fc', scale: 1, opacity: 0 },
              { t: 0.08, x: cx + 3.0 * ms, y: cy + 1.65, z: cz - 0.9 * ms, face: -1, rz: 0.32, pose: 'aura', snap: true, col: '#c084fc', scale: 1.18, opacity: 0.95 },
              { t: 0.16, x: cx - 2.9 * ms, y: cy + 0.85, z: cz + 0.8 * ms, face: 1, rz: -0.38, pose: 'attack', snap: true, col: '#f472b6', scale: 1.18, opacity: 0.95 },
              { t: 0.22, x: cx + 2.6 * ms, y: cy + 1.05, z: cz - 0.7 * ms, face: -1, rz: 0.36, pose: 'attack', snap: true, col: '#f8fafc', scale: 1.20, opacity: 0.96 },
              { t: 0.295, x: cx + 0.7, y: cy + 2.45, z: cz + 0.15, face: -1, rz: 0.28, pose: 'aura', snap: true, col: '#f8fafc', scale: 1.26, opacity: 0.98 },
              { t: 0.42, x: cx + 0.65, y: cy + 0.95, z: cz + 0.15, face: -1, rz: -0.20, pose: 'attack', snap: true, col: '#e879f9', scale: 1.22, opacity: 0.94 },
              { t: 0.68, x: cx + 0.8, y: cy + 1.35, z: cz + 0.15, face: -1, rz: 0, pose: 'aura', snap: false, col: '#c084fc', scale: 1.14, opacity: 0.75 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: '#c084fc', scale: 1, opacity: 0 },
            ],
          };

        case 'clockwork-twins':
          return {
            hero: [
              restStart,
              { t: 0.09, x: cx - 3.2 * ms, y: cy + 1.9, z: cz - 0.8 * ms, face: 1, rz: -0.34, pose: 'aura', snap: true, col: '#fbbf24', scale: 1.22 },
              { t: 0.16, x: cx + 2.8 * ms, y: cy + 0.85, z: cz + 1.0 * ms, face: -1, rz: 0.42, pose: 'attack', snap: true, col: '#f472b6', scale: 1.2 },
              { t: 0.22, x: cx - 2.6 * ms, y: cy + 0.95, z: cz - 0.8 * ms, face: 1, rz: -0.42, pose: 'attack', snap: true, col: '#fbbf24', scale: 1.22 },
              { t: 0.295, x: cx - 0.75, y: cy + 2.55, z: cz + 0.15, face: 1, rz: -0.32, pose: 'aura', snap: true, col: '#fbbf24', scale: 1.3 },
              { t: 0.42, x: cx - 0.65, y: cy + 0.95, z: cz + 0.15, face: 1, rz: 0.24, pose: 'attack', snap: true, col: '#2dd4bf', scale: 1.26 },
              { t: 0.68, x: cx - 0.85, y: cy + 1.35, z: cz + 0.15, face: 1, rz: 0, pose: 'aura', snap: false, col: '#fbbf24', scale: 1.16 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'aura', snap: false, col: '#2dd4bf', scale: 1, opacity: 0 },
              { t: 0.09, x: cx + 3.2 * ms, y: cy + 1.9, z: cz - 0.8 * ms, face: -1, rz: 0.34, pose: 'aura', snap: true, col: '#2dd4bf', scale: 1.2, opacity: 0.96 },
              { t: 0.16, x: cx - 2.8 * ms, y: cy + 0.85, z: cz - 1.0 * ms, face: 1, rz: -0.42, pose: 'attack', snap: true, col: '#c084fc', scale: 1.18, opacity: 0.96 },
              { t: 0.22, x: cx + 2.6 * ms, y: cy + 0.95, z: cz + 0.8 * ms, face: -1, rz: 0.42, pose: 'attack', snap: true, col: '#2dd4bf', scale: 1.2, opacity: 0.96 },
              { t: 0.295, x: cx + 0.75, y: cy + 2.55, z: cz + 0.15, face: -1, rz: 0.32, pose: 'aura', snap: true, col: '#2dd4bf', scale: 1.28, opacity: 0.98 },
              { t: 0.42, x: cx + 0.65, y: cy + 0.95, z: cz + 0.15, face: -1, rz: -0.24, pose: 'attack', snap: true, col: '#f472b6', scale: 1.24, opacity: 0.94 },
              { t: 0.68, x: cx + 0.85, y: cy + 1.35, z: cz + 0.15, face: -1, rz: 0, pose: 'aura', snap: false, col: '#2dd4bf', scale: 1.14, opacity: 0.74 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: '#2dd4bf', scale: 1, opacity: 0 },
            ],
          };

        default:
          return {
            hero: [
              restStart,
              { t: 0.16, x: cx - 3.1 * ms, y: cy + 0.8, z: cz - 1.1 * ms, face: 1, rz: -0.3, pose: 'attack', snap: true, col: color, scale: 1.14 },
              { t: 0.38, x: cx + 3.0 * ms, y: cy + 0.95, z: cz + 1.2 * ms, face: -1, rz: 0.3, pose: 'attack', snap: true, col: color, scale: 1.14 },
              { t: 0.62, x: cx - 0.65, y: cy + 1.45, z: cz + 0.1, face: 1, rz: -0.1, pose: 'aura', snap: true, col: '#ffffff', scale: 1.2 },
              { t: 0.85, x: cx - 0.75, y: cy + 1.3, z: cz + 0.1, face: 1, rz: 0, pose: 'attack', snap: false, col: color, scale: 1.15 },
              restEnd,
            ],
            clone: [
              { t: 0.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: secondary, scale: 1, opacity: 0 },
              { t: 0.16, x: cx + 3.1 * ms, y: cy + 0.8, z: cz - 1.1 * ms, face: -1, rz: 0.3, pose: 'attack', snap: true, col: secondary, scale: 1.12, opacity: 0.92 },
              { t: 0.38, x: cx - 3.0 * ms, y: cy + 0.95, z: cz + 1.2 * ms, face: 1, rz: -0.3, pose: 'attack', snap: true, col: secondary, scale: 1.12, opacity: 0.92 },
              { t: 0.62, x: cx + 0.65, y: cy + 1.45, z: cz + 0.1, face: -1, rz: 0.1, pose: 'aura', snap: true, col: secondary, scale: 1.18, opacity: 0.92 },
              { t: 0.85, x: cx + 0.75, y: cy + 1.3, z: cz + 0.1, face: -1, rz: 0, pose: 'attack', snap: false, col: secondary, scale: 1.14, opacity: 0.78 },
              { t: 1.0, x: ax, y: ay, z: az, face: -1, rz: 0, pose: 'attack', snap: false, col: secondary, scale: 1, opacity: 0 },
            ],
          };
      }

    case 'omega':
      if (chibiId === 'obsidian-sovereign') {
        return {
          hero: [
            restStart,
            { t: 0.08, x: cx - 3.0 * ms, y: cy + 0.55, z: cz + 0.65 * ms, face: 1, rz: -0.34, pose: 'attack', snap: true, col: '#f8fafc', scale: 1.18 },
            { t: 0.2, x: cx + 3.1 * ms, y: cy + 0.7, z: cz - 0.45 * ms, face: -1, rz: 0.34, pose: 'attack', snap: true, col: '#e879f9', scale: 1.2 },
            { t: 0.32, x: cx - 0.55 * ms, y: cy + 0.95, z: cz + 0.35 * ms, face: 1, rz: -0.22, pose: 'attack', snap: true, col: '#ffffff', scale: 1.24 },
            { t: 0.46, x: cx, y: cy + 3.65, z: cz - 0.25, face: 1, rz: -0.18, pose: 'aura', snap: true, col: '#f8fafc', scale: 1.3 },
            { t: 0.56, x: cx, y: cy + 3.85, z: cz - 0.25, face: 1, rz: -0.24, pose: 'aura', snap: false, col: '#e879f9', scale: 1.34 },
            { t: 0.66, x: cx, y: cy + 0.45, z: cz + 0.25, face: 1, rz: 0.26, pose: 'attack', snap: true, col: '#ffffff', scale: 1.32 },
            { t: 0.82, x: cx, y: cy + 0.45, z: cz + 0.25, face: 1, rz: 0.08, pose: 'aura', snap: false, col: '#e879f9', scale: 1.22 },
            restEnd,
          ],
        };
      }
      return {
        hero: [
          restStart,
          { t: 0.12, x: cx - 3.3 * ms, y: cy + 0.75, z: cz - 1.0 * ms, face: 1, rz: -0.32, pose: 'attack', snap: true, col: '#ef4444', scale: 1.16 },
          { t: 0.24, x: cx + 3.2 * ms, y: cy + 1.05, z: cz + 1.1 * ms, face: -1, rz: 0.32, pose: 'attack', snap: true, col: '#22d3ee', scale: 1.16 },
          { t: 0.36, x: cx + 3.1 * ms, y: cy + 0.8, z: cz - 1.0 * ms, face: -1, rz: 0.28, pose: 'attack', snap: true, col: '#ef4444', scale: 1.16 },
          { t: 0.48, x: cx - 2.8 * ms, y: cy + 0.95, z: cz + 1.2 * ms, face: 1, rz: -0.28, pose: 'attack', snap: true, col: '#fbbf24', scale: 1.18 },
          { t: 0.64, x: cx, y: cy + 2.2, z: cz - 0.3, face: 1, rz: 0, pose: 'aura', snap: true, col: '#ef4444', scale: 1.28 },
          { t: 0.86, x: cx, y: cy + 2.0, z: cz - 0.3, face: 1, rz: 0, pose: 'aura', snap: false, col: '#fef08a', scale: 1.24 },
          restEnd,
        ],
      };

    default:
      return { hero: [restStart, restEnd] };
  }
}

export function sampleTierMotionWaypoints(track: readonly TierMotionWaypoint[], p: number): SampledMotionFrame {
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    if (p >= a.t && p <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const localT = (p - a.t) / span;
      if (b.snap) {
        const ease = localT < 0.2 ? 0 : easeOutCubic((localT - 0.2) / 0.8);
        return {
          x: lerpNum(a.x, b.x, ease),
          y: lerpNum(a.y, b.y, ease),
          z: lerpNum(a.z, b.z, ease),
          face: localT < 0.2 ? a.face : b.face,
          rz: lerpNum(a.rz, b.rz, ease),
          pose: localT < 0.2 ? a.pose : b.pose,
          col: localT < 0.2 ? a.col : b.col,
          scale: lerpNum(a.scale, b.scale, ease),
          opacity: lerpNum(a.opacity ?? 1, b.opacity ?? 1, ease),
          snapping: localT >= 0.18 && localT <= 0.68,
        };
      }
      const ease = easeOutCubic(localT);
      return {
        x: lerpNum(a.x, b.x, ease),
        y: lerpNum(a.y, b.y, ease),
        z: lerpNum(a.z, b.z, ease),
        face: b.face,
        rz: lerpNum(a.rz, b.rz, ease),
        pose: localT < 0.25 ? a.pose : b.pose,
        col: b.col,
        scale: lerpNum(a.scale, b.scale, ease),
        opacity: lerpNum(a.opacity ?? 1, b.opacity ?? 1, ease),
        snapping: false,
      };
    }
  }
  const last = track[track.length - 1];
  return { ...last, opacity: last.opacity ?? 1, snapping: false };
}

