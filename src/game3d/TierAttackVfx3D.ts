import * as THREE from 'three';
import { type ChibiDef } from './ChibiCatalog';
import {
  createBladeMeshGeometry,
  createCrystalSpikeGeometry,
  createEnergyWeaponMaterial,
  createFresnelDomeMaterial,
  createOrbitalBeamMaterial,
  createSlashArcGeometry,
  createSlashShaderMaterial,
  createSpatialRiftMaterial,
  createSpearGeometry,
  createVortexConeMaterial,
} from './MeshFx3D';
import {
  getFlamePuffTexture,
  getGroundCrackTexture,
  getHitSparkStarTexture,
  getRuneSealTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
} from './ProceduralTextures3D';

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
  colorHex: string;
  secondaryHex?: string;
  target: WorldPoint3;
  allTargets?: readonly WorldPoint3[];
  comboStep?: number;
  speedScale?: number;
  areaScale?: number;
  wideCenter?: WorldPoint3;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
  return rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega';
}

function resolvePitBounds(
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
  motionScale = 1.0
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

    case 'fusion':
      return {
        hero: [
          restStart,
          { t: 0.15, x: cx - 3.0 * ms, y: cy + 0.75, z: cz - 1.0 * ms, face: 1, rz: -0.28, pose: 'attack', snap: true, col: '#22d3ee', scale: 1.14 },
          { t: 0.31, x: cx + 3.0 * ms, y: cy + 0.95, z: cz - 0.9 * ms, face: -1, rz: 0.28, pose: 'attack', snap: true, col: '#ec4899', scale: 1.14 },
          { t: 0.47, x: cx - 2.6 * ms, y: cy + 0.7, z: cz + 1.3 * ms, face: 1, rz: -0.24, pose: 'attack', snap: true, col: '#22d3ee', scale: 1.14 },
          { t: 0.63, x: cx + 2.7 * ms, y: cy + 1.05, z: cz + 1.2 * ms, face: -1, rz: 0.24, pose: 'attack', snap: true, col: '#ec4899', scale: 1.14 },
          { t: 0.84, x: cx, y: cy + 1.7, z: cz, face: 1, rz: 0, pose: 'aura', snap: true, col: '#ffffff', scale: 1.24 },
          restEnd,
        ],
      };

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

    case 'omega':
      return {
        hero: [
          restStart,
          { t: 0.12, x: cx - 3.3 * ms, y: cy + 0.75, z: cz - 1.0 * ms, face: 1, rz: -0.32, pose: 'attack', snap: true, col: '#ef4444', scale: 1.16 },
          { t: 0.24, x: cx + 3.2 * ms, y: cy + 1.05, z: cz + 1.1 * ms, face: -1, rz: 0.32, pose: 'attack', snap: true, col: '#fbbf24', scale: 1.16 },
          { t: 0.36, x: cx + 3.1 * ms, y: cy + 0.8, z: cz - 1.0 * ms, face: -1, rz: 0.28, pose: 'attack', snap: true, col: '#ef4444', scale: 1.16 },
          { t: 0.48, x: cx - 2.8 * ms, y: cy + 0.95, z: cz + 1.2 * ms, face: 1, rz: -0.28, pose: 'attack', snap: true, col: '#ffffff', scale: 1.18 },
          { t: 0.64, x: cx, y: cy + 1.85, z: cz - 0.3, face: 1, rz: 0, pose: 'aura', snap: true, col: '#ef4444', scale: 1.28 },
          { t: 0.86, x: cx, y: cy + 1.65, z: cz - 0.3, face: 1, rz: 0, pose: 'aura', snap: false, col: '#fbbf24', scale: 1.22 },
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
        const ease = localT < 0.42 ? 0 : easeOutCubic((localT - 0.42) / 0.58);
        return {
          x: lerpNum(a.x, b.x, ease),
          y: lerpNum(a.y, b.y, ease),
          z: lerpNum(a.z, b.z, ease),
          face: localT < 0.42 ? a.face : b.face,
          rz: lerpNum(a.rz, b.rz, ease),
          pose: localT < 0.42 ? a.pose : b.pose,
          col: localT < 0.42 ? a.col : b.col,
          scale: lerpNum(a.scale, b.scale, ease),
          opacity: lerpNum(a.opacity ?? 1, b.opacity ?? 1, ease),
          snapping: localT >= 0.38 && localT <= 0.78,
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

interface SlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
  spinSpeed: number;
}
interface DomeSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  s0: number;
  s1: number;
  yScale: number;
}
interface BeamSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  radius: number;
  height: number;
}
interface VortexSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  sx: number;
  sy: number;
  spin: number;
}
interface RiftSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  len: number;
  height: number;
}
interface WeaponSlot {
  kind: 'blade' | 'spear' | 'crystal';
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startRot: THREE.Euler;
  endRot: THREE.Euler;
  scaleTarget: number;
  mode: 'plunge' | 'erupt' | 'swing';
  onArrive: (() => void) | null;
  arrived: boolean;
}
interface BoltSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
}
interface DebrisSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  floorY: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  s0: number;
}
interface QuadSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  floorY: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  s0: number;
  s1: number;
  spin: number;
  billboard: boolean;
  flatFloor: boolean;
  baseRotZ: number;
  baseAlpha: number;
}
interface OrbSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  s0: number;
  s1: number;
  trailTimer: number;
  trailColor: string;
  onArrive: (() => void) | null;
  arrived: boolean;
}

/**
 * Pooled multi-primitive 3D Anime-Vanguard Tier VFX System reused across Mine Pit, Tower & Omega arenas.
 * Uses pure THREE.Mesh pools (zero InstancedMesh side-effects) + dt-scaled timeline cues.
 */
export class TierAttackVfxPool3D {
  public readonly group = new THREE.Group();

  private readonly starTex: THREE.Texture;
  private readonly streakTex: THREE.Texture;
  private readonly ringTex: THREE.Texture;
  private readonly runeTex: THREE.Texture;
  private readonly crackTex: THREE.Texture;
  private readonly flameTex: THREE.Texture;

  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly slashes: SlashSlot[] = [];
  private readonly domes: DomeSlot[] = [];
  private readonly beams: BeamSlot[] = [];
  private readonly vortices: VortexSlot[] = [];
  private readonly rifts: RiftSlot[] = [];
  private readonly weapons: WeaponSlot[] = [];
  private readonly boltSegs: BoltSlot[] = [];
  private readonly debris: DebrisSlot[] = [];
  private readonly quads: QuadSlot[] = [];
  private readonly orbs: OrbSlot[] = [];

  private readonly events: Array<{ delay: number; fn: () => void }> = [];
  private hooks: TierVfxHooks = {};
  private lowQuality = false;
  private time = 0;
  private disposed = false;

  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;

    this.starTex = getHitSparkStarTexture();
    this.streakTex = getSparkStreakTexture();
    this.ringTex = getShockwaveRingTexture();
    this.runeTex = getRuneSealTexture();
    this.crackTex = getGroundCrackTexture();
    this.flameTex = getFlamePuffTexture();

    const slashGeo = createSlashArcGeometry(0.44, 1.0, Math.PI * 1.25, 30);
    const domeGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const beamGeo = new THREE.CylinderGeometry(0.4, 0.62, 16, 18, 1, true);
    beamGeo.translate(0, 8, 0);
    const vortexGeo = new THREE.CylinderGeometry(1.15, 0.24, 2.2, 20, 6, true);
    vortexGeo.translate(0, 1.1, 0);
    const riftGeo = new THREE.PlaneGeometry(1, 0.34);
    const bladeGeo = createBladeMeshGeometry();
    const spearGeo = createSpearGeometry();
    const crystalGeo = createCrystalSpikeGeometry();
    const boltGeo = new THREE.PlaneGeometry(1, 1);
    boltGeo.translate(0, 0.5, 0);
    const chunkGeo = new THREE.IcosahedronGeometry(0.14, 0);
    const quadGeo = new THREE.PlaneGeometry(1, 1);
    const orbGeo = new THREE.IcosahedronGeometry(0.42, 1);

    this.sharedGeos.push(
      slashGeo, domeGeo, beamGeo, vortexGeo, riftGeo, bladeGeo, spearGeo, crystalGeo, boltGeo, chunkGeo, quadGeo, orbGeo
    );

    for (let i = 0; i < 24; i++) {
      const mat = createSlashShaderMaterial();
      const mesh = new THREE.Mesh(slashGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.slashes.push({ mesh, mat, active: false, age: 0, life: 0.4, s0: 1, s1: 1, spinSpeed: 0 });
    }

    for (let i = 0; i < 14; i++) {
      const mat = createFresnelDomeMaterial();
      const mesh = new THREE.Mesh(domeGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.domes.push({ mesh, mat, active: false, age: 0, life: 0.5, s0: 0.4, s1: 4, yScale: 0.8 });
    }

    for (let i = 0; i < 10; i++) {
      const mat = createOrbitalBeamMaterial();
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.beams.push({ mesh, mat, active: false, age: 0, life: 0.6, radius: 1, height: 1 });
    }

    for (let i = 0; i < 6; i++) {
      const mat = createVortexConeMaterial();
      const mesh = new THREE.Mesh(vortexGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.vortices.push({ mesh, mat, active: false, age: 0, life: 0.75, sx: 1, sy: 1, spin: 8 });
    }

    for (let i = 0; i < 18; i++) {
      const mat = createSpatialRiftMaterial();
      const mesh = new THREE.Mesh(riftGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rifts.push({ mesh, mat, active: false, age: 0, life: 0.6, len: 5, height: 1 });
    }

    const addWeaponPool = (geo: THREE.BufferGeometry, count: number, kind: 'blade' | 'spear' | 'crystal'): void => {
      for (let i = 0; i < count; i++) {
        const mat = createEnergyWeaponMaterial();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        this.group.add(mesh);
        this.weapons.push({
          kind,
          mesh,
          mat,
          active: false,
          age: 0,
          life: 0.5,
          startPos: new THREE.Vector3(),
          endPos: new THREE.Vector3(),
          startRot: new THREE.Euler(),
          endRot: new THREE.Euler(),
          scaleTarget: 1,
          mode: 'plunge',
          onArrive: null,
          arrived: false,
        });
      }
    };
    addWeaponPool(bladeGeo, 16, 'blade');
    addWeaponPool(spearGeo, 16, 'spear');
    addWeaponPool(crystalGeo, 24, 'crystal');

    for (let i = 0; i < 72; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.streakTex,
        color: '#34d399',
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(boltGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.boltSegs.push({ mesh, mat, active: false, age: 0, life: 0.25 });
    }

    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
      const mesh = new THREE.Mesh(chunkGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.debris.push({
        mesh, mat, active: false, age: 0, life: 0.6, floorY: 0.08, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s0: 1,
      });
    }

    for (let i = 0; i < 140; i++) {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(quadGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.quads.push({
        mesh,
        mat,
        active: false,
        age: 0,
        life: 0.4,
        floorY: 0.08,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        drag: 1,
        s0: 1,
        s1: 1,
        spin: 0,
        billboard: true,
        flatFloor: false,
        baseRotZ: 0,
        baseAlpha: 1,
      });
    }

    for (let i = 0; i < 8; i++) {
      const mat = createEnergyWeaponMaterial();
      const mesh = new THREE.Mesh(orbGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.orbs.push({
        mesh,
        mat,
        active: false,
        age: 0,
        life: 0.45,
        p0: new THREE.Vector3(),
        p1: new THREE.Vector3(),
        s0: 1,
        s1: 1,
        trailTimer: 0,
        trailColor: '#fb923c',
        onArrive: null,
        arrived: false,
      });
    }
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public clear(): void {
    this.events.length = 0;
    const resetArr = (arr: ReadonlyArray<{ active: boolean; mesh: THREE.Mesh }>): void => {
      for (let i = 0; i < arr.length; i++) {
        arr[i].active = false;
        arr[i].mesh.visible = false;
      }
    };
    resetArr(this.slashes);
    resetArr(this.domes);
    resetArr(this.beams);
    resetArr(this.vortices);
    resetArr(this.rifts);
    resetArr(this.weapons);
    resetArr(this.boltSegs);
    resetArr(this.debris);
    resetArr(this.quads);
    resetArr(this.orbs);
  }

  private after(delay: number, fn: () => void): void {
    if (delay <= 0.001) fn();
    else this.events.push({ delay, fn });
  }

  private spawnSlash(opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; s0?: number; s1?: number; life?: number; spinSpeed?: number;
  }): void {
    const slot = this.slashes.find((s) => !s.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.s0 = opts.s0 ?? 1.5;
    slot.s1 = opts.s1 ?? 2.7;
    slot.spinSpeed = opts.spinSpeed ?? 3.0;
    slot.mesh.position.set(opts.x, opts.y, opts.z);
    slot.mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    slot.mesh.scale.setScalar(slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = Math.random() * 20;
    slot.mesh.visible = true;
  }

  private spawnDome(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    s0?: number; s1?: number; yScale?: number; life?: number;
  }): void {
    let activeDomes = 0;
    let slot: DomeSlot | null = null;
    for (let i = 0; i < this.domes.length; i++) {
      if (this.domes[i].active) activeDomes++;
      else if (!slot) slot = this.domes[i];
    }
    if (!slot || activeDomes >= 3) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.48;
    slot.s0 = opts.s0 ?? 0.45;
    slot.s1 = opts.s1 ?? 3.8;
    slot.yScale = opts.yScale ?? 0.72;
    slot.mesh.position.set(opts.x, opts.y ?? 0.04, opts.z);
    slot.mesh.scale.set(slot.s0, slot.s0 * slot.yScale, slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnBeam(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    radius?: number; height?: number; life?: number;
  }): void {
    let activeBeams = 0;
    let slot: BeamSlot | null = null;
    for (let i = 0; i < this.beams.length; i++) {
      if (this.beams[i].active) activeBeams++;
      else if (!slot) slot = this.beams[i];
    }
    if (!slot || activeBeams >= 2) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.56;
    slot.radius = opts.radius ?? 0.8;
    slot.height = opts.height ?? 1.0;
    slot.mesh.position.set(opts.x, opts.y ?? 0.0, opts.z);
    slot.mesh.scale.set(slot.radius, slot.height, slot.radius);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnVortex(opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    sx?: number; sy?: number; twist?: number; spin?: number; life?: number;
  }): void {
    const slot = this.vortices.find((v) => !v.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.65;
    slot.sx = opts.sx ?? 1.4;
    slot.sy = opts.sy ?? 1.8;
    slot.spin = opts.spin ?? 9;
    slot.mesh.position.set(opts.x, opts.y ?? 0.05, opts.z);
    slot.mesh.scale.set(slot.sx, slot.sy, slot.sx);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uTwist.value = opts.twist ?? 7.0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnRift(opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; len?: number; height?: number; life?: number;
  }): void {
    const slot = this.rifts.find((r) => !r.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.58;
    slot.len = opts.len ?? 5.5;
    slot.height = opts.height ?? 1.0;
    slot.mesh.position.set(opts.x, opts.y, opts.z);
    slot.mesh.rotation.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    slot.mesh.scale.set(slot.len, slot.height, 1);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mat.uniforms.uSeed.value = Math.random() * 15;
    slot.mesh.visible = true;
  }

  private spawnWeapon(opts: {
    kind: 'blade' | 'spear' | 'crystal';
    color: string;
    coreColor?: string;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startRot: THREE.Euler;
    endRot: THREE.Euler;
    scale?: number;
    mode?: 'plunge' | 'erupt' | 'swing';
    life?: number;
    onArrive?: () => void;
  }): void {
    const slot = this.weapons.find((w) => !w.active && w.kind === opts.kind);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.45;
    slot.mode = opts.mode ?? 'plunge';
    slot.scaleTarget = opts.scale ?? 1;
    slot.onArrive = opts.onArrive ?? null;
    slot.arrived = false;
    slot.startPos.copy(opts.startPos);
    slot.endPos.copy(opts.endPos);
    slot.startRot.copy(opts.startRot);
    slot.endRot.copy(opts.endRot);
    slot.mesh.position.copy(opts.startPos);
    slot.mesh.rotation.copy(opts.startRot);
    slot.mesh.scale.setScalar(slot.mode === 'erupt' ? slot.scaleTarget * 0.15 : slot.scaleTarget);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnDirectedWeapon(
    kind: 'blade' | 'spear',
    fromVec: THREE.Vector3,
    toVec: THREE.Vector3,
    color: string,
    scale = 1.2,
    life = 0.2,
    onArrive?: () => void
  ): void {
    this.tmpDir.subVectors(toVec, fromVec).normalize();
    this.tmpQuat.setFromUnitVectors(this.tmpUp, this.tmpDir);
    const euler = new THREE.Euler().setFromQuaternion(this.tmpQuat);
    this.spawnWeapon({
      kind,
      color,
      coreColor: '#ffffff',
      startPos: fromVec,
      endPos: toVec,
      startRot: euler,
      endRot: euler,
      scale,
      mode: 'plunge',
      life,
      onArrive,
    });
  }

  private spawnLightning(a: THREE.Vector3, b: THREE.Vector3, color: string, width = 0.22, life = 0.22): void {
    const steps = 4;
    let prev = a.clone();
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const cur = new THREE.Vector3().lerpVectors(a, b, t);
      if (s < steps) {
        cur.x += (Math.random() - 0.5) * 0.72;
        cur.y += (Math.random() - 0.5) * 0.4 + 0.14;
        cur.z += (Math.random() - 0.5) * 0.72;
      }
      const slot = this.boltSegs.find((bSeg) => !bSeg.active);
      if (slot) {
        slot.active = true;
        slot.age = 0;
        slot.life = life;
        this.tmpDir.subVectors(cur, prev);
        const len = this.tmpDir.length();
        slot.mesh.position.copy(prev);
        if (len > 0.001) {
          this.tmpDir.normalize();
          slot.mesh.quaternion.setFromUnitVectors(this.tmpUp, this.tmpDir);
        }
        slot.mesh.scale.set(width, len, 1);
        slot.mat.color.set(s % 2 === 0 ? '#ffffff' : color);
        slot.mat.opacity = 1;
        slot.mesh.visible = true;
      }
      prev = cur;
    }
  }

  private spawnDebrisBurst(x: number, y: number, z: number, color: string, secondary: string, count = 5): void {
    const cap = this.lowQuality ? Math.max(1, Math.ceil(count * 0.4)) : count;
    for (let i = 0; i < cap; i++) {
      const slot = this.debris.find((d) => !d.active);
      if (!slot) break;
      const a = Math.random() * Math.PI * 2;
      const spd = 2.6 + Math.random() * 4.2;
      slot.active = true;
      slot.age = 0;
      slot.life = 0.45 + Math.random() * 0.22;
      slot.floorY = Math.max(0.08, y - 0.35);
      slot.vx = Math.cos(a) * spd;
      slot.vy = 3.2 + Math.random() * 3.8;
      slot.vz = Math.sin(a) * spd;
      slot.rx = (Math.random() - 0.5) * 18;
      slot.ry = (Math.random() - 0.5) * 18;
      slot.s0 = 0.65 + Math.random() * 0.8;
      slot.mesh.position.set(x, y + 0.25, z);
      slot.mesh.scale.setScalar(slot.s0);
      slot.mat.color.set(i % 2 === 0 ? color : secondary);
      slot.mesh.visible = true;
    }
  }

  private spawnQuad(opts: {
    tex: THREE.Texture; x: number; y: number; z: number; color?: string;
    s0?: number; s1?: number; life?: number; floorY?: number;
    vx?: number; vy?: number; vz?: number; gravity?: number; drag?: number;
    spin?: number; billboard?: boolean; flatFloor?: boolean; rotZ?: number; alpha?: number;
  }): void {
    const slot = this.quads.find((q) => !q.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.floorY = opts.floorY ?? 0.06;
    slot.vx = opts.vx ?? 0;
    slot.vy = opts.vy ?? 0;
    slot.vz = opts.vz ?? 0;
    slot.gravity = opts.gravity ?? 0;
    slot.drag = opts.drag ?? 1;
    slot.s0 = opts.s0 ?? 1;
    slot.s1 = opts.s1 ?? 1;
    slot.spin = opts.spin ?? 0;
    slot.billboard = opts.billboard ?? true;
    slot.flatFloor = opts.flatFloor ?? false;
    slot.baseRotZ = opts.rotZ ?? 0;
    slot.baseAlpha = opts.alpha ?? 1;
    slot.mesh.position.set(opts.x, opts.y, opts.z);
    slot.mesh.scale.setScalar(slot.s0);
    if (slot.flatFloor) slot.mesh.rotation.set(-Math.PI / 2, 0, slot.baseRotZ);
    else slot.mesh.rotation.set(0, 0, slot.baseRotZ);
    slot.mat.map = opts.tex;
    slot.mat.color.set(opts.color ?? '#ffffff');
    slot.mat.opacity = slot.baseAlpha;
    slot.mat.needsUpdate = true;
    slot.mesh.visible = true;
  }

  private spawnOrb(opts: {
    p0: THREE.Vector3; p1: THREE.Vector3; color: string; coreColor?: string;
    trailColor?: string; s0?: number; s1?: number; life?: number; onArrive?: () => void;
  }): void {
    const slot = this.orbs.find((o) => !o.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = opts.life ?? 0.34;
    slot.p0.copy(opts.p0);
    slot.p1.copy(opts.p1);
    slot.s0 = opts.s0 ?? 0.9;
    slot.s1 = opts.s1 ?? 1.25;
    slot.trailColor = opts.trailColor ?? opts.color;
    slot.trailTimer = 0;
    slot.onArrive = opts.onArrive ?? null;
    slot.arrived = false;
    slot.mesh.position.copy(opts.p0);
    slot.mesh.scale.setScalar(slot.s0);
    slot.mat.uniforms.uColor.value.set(opts.color);
    slot.mat.uniforms.uCoreColor.value.set(opts.coreColor ?? '#ffffff');
    slot.mat.uniforms.uOpacity.value = 1;
    slot.mesh.visible = true;
  }

  private spawnSparks(x: number, y: number, z: number, color: string, secondary: string, count = 6, speed = 4.4): void {
    const cap = this.lowQuality ? Math.max(2, Math.ceil(count * 0.4)) : count;
    for (let i = 0; i < cap; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.85);
      this.spawnQuad({
        tex: i % 3 === 0 ? this.starTex : this.streakTex,
        x,
        y: y + 0.25,
        z,
        color: i % 2 === 0 ? color : secondary,
        s0: 0.45 + Math.random() * 0.32,
        s1: 0.06,
        life: 0.24 + Math.random() * 0.2,
        floorY: Math.max(0.06, y - 0.5),
        vx: Math.cos(a) * spd,
        vy: 1.8 + Math.random() * 3.6,
        vz: Math.sin(a) * spd,
        gravity: 9.8,
        drag: 0.94,
        rotZ: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 11,
      });
    }
  }

  public fireAnticipation(
    rarity: string,
    colorHex: string,
    target: WorldPoint3,
    allTargets: readonly WorldPoint3[] = [],
    areaScale = 1,
    wideCenter?: WorldPoint3
  ): void {
    const wide = isWideAoeRarity(rarity);
    const as = Math.max(0.45, Math.min(1.2, areaScale));
    const { cx, cy, cz } = wide
      ? resolvePitBounds(allTargets, target, wideCenter)
      : { cx: target.x, cy: target.y, cz: target.z };

    if (rarity === 'secret' || wide) {
      this.hooks.onArenaDim?.(wide ? 0.55 : 0.42, rarity === 'omega' ? '#1c0408' : '#050b18', 0.65);
      this.hooks.onSpeedLines?.(0.65, 0.28);
      this.spawnQuad({
        tex: this.runeTex,
        x: cx,
        y: cy + 0.08,
        z: cz,
        color: colorHex,
        s0: 0.9,
        s1: wide ? 10.5 * as : 3.4,
        life: 0.52,
        flatFloor: true,
        spin: 4.0,
      });
    } else if (rarity !== 'common') {
      this.hooks.onSpeedLines?.(0.35, 0.18);
    }
  }

  public fireTierAttack(opts: TierAttackFireOpts): void {
    const rarity = opts.rarity;
    const color = opts.colorHex;
    const secondary = opts.secondaryHex ?? getRaritySecondaryColor(rarity);
    const tx = opts.target.x;
    const ty = opts.target.y;
    const tz = opts.target.z;
    const comboStep = opts.comboStep ?? 0;
    const sc = opts.speedScale ?? 1.0;
    const as = Math.max(0.45, Math.min(1.2, opts.areaScale ?? 1.0));
    const allTargets = opts.allTargets && opts.allTargets.length > 0 ? opts.allTargets : [opts.target];
    const { cx, cy, cz, pts } = resolvePitBounds(allTargets, opts.target, opts.wideCenter);

    switch (rarity) {
      case 'common': {
        const tilt = comboStep === 0 ? 0.42 : comboStep === 1 ? -0.46 : 0.1;
        this.spawnSlash({
          x: tx, y: ty + 0.65, z: tz, color, coreColor: '#ffffff',
          rx: tilt, ry: -Math.PI * 0.3 + comboStep * 0.8, rz: 0.25, s0: 1.4, s1: 2.5, life: 0.32 * sc, spinSpeed: 3.2,
        });
        this.spawnQuad({ tex: this.ringTex, x: tx, y: ty + 0.06, z: tz, color, s0: 0.55, s1: 2.3, life: 0.26 * sc, flatFloor: true });
        this.spawnSparks(tx, ty + 0.6, tz, color, '#ffffff', 7, 4.2);
        this.spawnDebrisBurst(tx, ty + 0.5, tz, color, '#94a3b8', 3);
        break;
      }

      case 'uncommon': {
        const shots = [
          new THREE.Vector3(tx - 1.5, ty + 2.1, tz - 0.7),
          new THREE.Vector3(tx + 1.5, ty + 2.3, tz - 0.5),
          new THREE.Vector3(tx, ty + 2.5, tz + 0.9),
        ];
        shots.forEach((pt, i) => {
          this.after(i * 0.1 * sc, () => {
            this.spawnSlash({
              x: tx, y: ty + 0.8, z: tz, color: i === 1 ? secondary : color, coreColor: '#ffffff',
              rx: (i - 1) * 0.4, ry: i * 1.4, rz: 0.25, s0: 1.25, s1: 2.3, life: 0.26 * sc, spinSpeed: 3.6,
            });
            this.spawnDirectedWeapon('spear', pt, new THREE.Vector3(tx, ty + 0.35, tz), i === 1 ? secondary : color, 1.28, 0.2 * sc, () => {
              this.spawnQuad({ tex: this.ringTex, x: tx, y: ty + 0.08, z: tz, color, s0: 0.5, s1: 2.5, life: 0.26 * sc, flatFloor: true });
              this.spawnSparks(tx, ty + 0.6, tz, color, secondary, 5, 4.2);
              this.spawnDebrisBurst(tx, ty + 0.5, tz, color, secondary, 3);
            });
          });
        });
        break;
      }

      case 'rare': {
        for (let wave = 0; wave < 2; wave++) {
          this.after(wave * 0.12 * sc, () => {
            const sideSign = wave === 0 ? -1 : 1;
            this.spawnSlash({
              x: tx, y: ty + 0.75, z: tz, color: wave === 0 ? color : secondary, coreColor: '#ffffff',
              rx: sideSign * 0.35, ry: wave * 2.2, rz: 0.3, s0: 1.35, s1: 2.65, life: 0.28 * sc, spinSpeed: sideSign * 3.8,
            });
            for (let k = 0; k < 3; k++) {
              const ang = (k + wave * 3) * (Math.PI / 3);
              const sx = tx + Math.cos(ang) * 0.72;
              const sz = tz + Math.sin(ang) * 0.72;
              const tilt = new THREE.Euler(Math.sin(ang) * 0.35, ang, -Math.cos(ang) * 0.35);
              this.spawnWeapon({
                kind: 'crystal',
                color: wave === 0 ? color : secondary,
                coreColor: '#ffffff',
                startPos: new THREE.Vector3(sx, ty - 0.3, sz),
                endPos: new THREE.Vector3(sx, ty + 0.04, sz),
                startRot: tilt,
                endRot: tilt,
                scale: wave === 1 && k === 0 ? 2.1 : 1.45,
                mode: 'erupt',
                life: 0.44 * sc,
              });
            }
            this.spawnDebrisBurst(tx, ty + 0.6, tz, color, '#e0f2fe', 4);
          });
        }
        break;
      }

      case 'epic': {
        const idx0 = Math.max(0, allTargets.indexOf(opts.target));
        const chainCount = Math.min(4, pts.length);
        for (let step = 0; step < chainCount; step++) {
          const curNode = pts[(idx0 + step) % pts.length];
          const prevNode = step > 0 ? pts[(idx0 + step - 1) % pts.length] : null;
          this.after(step * 0.095 * sc, () => {
            const col = step % 2 === 0 ? color : secondary;
            const curPt = new THREE.Vector3(curNode.x, curNode.y + 0.7, curNode.z);
            this.spawnLightning(new THREE.Vector3(curNode.x, curNode.y + 5.8, curNode.z), curPt, col, 0.24, 0.22 * sc);
            if (prevNode) {
              this.spawnLightning(new THREE.Vector3(prevNode.x, prevNode.y + 0.75, prevNode.z), curPt, secondary, 0.21, 0.22 * sc);
            }
            this.spawnSlash({
              x: curNode.x, y: curNode.y + 0.8, z: curNode.z, color: col, coreColor: '#ffffff',
              rx: 0.35, ry: step * 1.3, rz: -0.25, s0: 1.25, s1: 2.35, life: 0.24 * sc, spinSpeed: 4,
            });
            this.spawnQuad({ tex: this.crackTex, x: curNode.x, y: curNode.y + 0.06, z: curNode.z, color, s0: 2.0, s1: 2.3, life: 0.42 * sc, flatFloor: true });
            this.spawnSparks(curNode.x, curNode.y + 0.7, curNode.z, col, '#ffffff', 5, 4.2);
          });
        }
        break;
      }

      case 'legendary': {
        this.spawnSlash({ x: tx - 1.0, y: ty + 2.0, z: tz - 0.6, color, coreColor: '#ffffff', rx: 0.4, ry: 0.8, rz: 0.5, s0: 1.4, s1: 2.7, life: 0.28 * sc, spinSpeed: 4 });
        this.after(0.11 * sc, () => {
          this.spawnSlash({ x: tx + 0.9, y: ty + 1.5, z: tz - 0.2, color: secondary, coreColor: '#ffffff', rx: -0.4, ry: 2.4, rz: -0.5, s0: 1.5, s1: 2.9, life: 0.28 * sc, spinSpeed: -4 });
        });
        this.spawnOrb({
          p0: new THREE.Vector3(tx - 3.2, ty + 8.0, tz - 2.8),
          p1: new THREE.Vector3(tx, ty + 0.4, tz),
          color: secondary,
          coreColor: '#ffffff',
          trailColor: secondary,
          s0: 1.05,
          s1: 1.5,
          life: 0.28 * sc,
          onArrive: () => {
            this.hooks.onImpactFrame?.(0.7, 0.0, secondary, 0.038);
            this.spawnDome({ x: tx, y: ty + 0.04, z: tz, color: secondary, coreColor: '#ffffff', s0: 0.45, s1: 3.9, yScale: 0.78, life: 0.46 * sc });
            this.spawnQuad({ tex: this.crackTex, x: tx, y: ty + 0.06, z: tz, color: secondary, s0: 2.8, s1: 3.2, life: 0.6 * sc, flatFloor: true });
            this.spawnDebrisBurst(tx, ty + 0.7, tz, secondary, color, 7);
            this.spawnSparks(tx, ty + 0.7, tz, secondary, color, 10, 5.4);
          },
        });
        break;
      }

      case 'rainbow': {
        // Exact approved Rainbow benchmark!
        const palette = ['#ef4444', '#fbbf24', '#22d3ee', '#a855f7', '#4ade80', '#f43f5e'];
        for (let i = 0; i < 6; i++) {
          this.after(i * 0.048 * sc, () => {
            const col = palette[i];
            const ang = (i / 6) * Math.PI * 2;
            this.spawnSlash({
              x: tx, y: ty + 0.75 + i * 0.12, z: tz, color: col, coreColor: '#ffffff',
              rx: (i - 2.5) * 0.35, ry: ang, rz: (i % 2 === 0 ? 1 : -1) * 0.45,
              s0: 1.45, s1: 3.0, life: 0.34 * sc, spinSpeed: (i % 2 === 0 ? 1 : -1) * 4.2,
            });
            this.spawnDirectedWeapon(
              'blade',
              new THREE.Vector3(tx + Math.cos(ang) * 2.2, ty + 2.2, tz + Math.sin(ang) * 2.2),
              new THREE.Vector3(tx, ty + 0.45, tz),
              col,
              1.08,
              0.18 * sc,
              () => {
                this.spawnSparks(tx, ty + 0.7, tz, col, '#ffffff', 4, 4.4);
                this.spawnDebrisBurst(tx, ty + 0.6, tz, col, '#ffffff', 2);
              }
            );
          });
        }
        break;
      }

      case 'mythic': {
        this.spawnBeam({ x: tx, y: ty, z: tz, color, coreColor: '#ffffff', radius: 0.68, height: 1.0, life: 0.56 * sc });
        for (let i = 0; i < 6; i++) {
          const arcAng = (i / 6) * Math.PI * 2;
          const hover = new THREE.Vector3(tx + Math.cos(arcAng) * 2.0, ty + 4.1, tz + Math.sin(arcAng) * 2.0);
          this.after(i * 0.055 * sc, () => {
            this.spawnSlash({
              x: tx, y: ty + 0.85 + (i % 3) * 0.2, z: tz, color: i % 2 === 0 ? color : '#ffffff', coreColor: '#ffffff',
              rx: (i - 2.5) * 0.3, ry: arcAng, rz: 0.35, s0: 1.3, s1: 2.7, life: 0.28 * sc, spinSpeed: 4,
            });
            this.spawnDirectedWeapon('blade', hover, new THREE.Vector3(tx, ty + 0.4, tz), color, 1.35, 0.2 * sc, () => {
              this.spawnQuad({ tex: this.ringTex, x: tx, y: ty + 0.08, z: tz, color, s0: 0.55, s1: 2.9, life: 0.28 * sc, flatFloor: true });
              if (i === 5) {
                this.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.55, s1: 3.8, yScale: 0.82, life: 0.44 * sc });
                this.spawnDebrisBurst(tx, ty + 0.6, tz, color, '#ffffff', 6);
              }
            });
          });
        }
        break;
      }

      case 'exotic': {
        this.spawnVortex({ x: tx, y: ty + 0.04, z: tz, color, coreColor: secondary, sx: 1.45, sy: 2.0, twist: 8, spin: 11, life: 0.56 * sc });
        for (let i = 0; i < 4; i++) {
          this.after(i * 0.075 * sc, () => {
            this.spawnSlash({
              x: tx, y: ty + 0.7 + i * 0.22, z: tz, color: i % 2 === 0 ? color : secondary, coreColor: '#ffffff',
              rx: 0.3, ry: i * 1.6, rz: -0.35, s0: 1.4, s1: 3.0, life: 0.28 * sc, spinSpeed: 5.5,
            });
          });
        }
        this.after(0.32 * sc, () => {
          this.spawnBeam({ x: tx, y: ty, z: tz, color: secondary, coreColor: '#ffffff', radius: 0.78, height: 1.0, life: 0.42 * sc });
          this.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.5, s1: 4.1, yScale: 0.8, life: 0.44 * sc });
          this.spawnDebrisBurst(tx, ty + 0.75, tz, secondary, color, 7);
        });
        break;
      }

      case 'secret': {
        this.hooks.onArenaDim?.(0.6, '#020617', 0.48);
        for (let i = 0; i < 3; i++) {
          this.after(i * 0.08 * sc, () => {
            const c = i % 2 === 0 ? color : secondary;
            this.spawnSlash({
              x: tx, y: ty + 0.85 + i * 0.18, z: tz, color: c, coreColor: '#ffffff',
              rx: (i - 1) * 0.45, ry: i * 2.1, rz: 0.4, s0: 1.5, s1: 3.1, life: 0.28 * sc, spinSpeed: 4.5,
            });
          });
        }
        this.after(0.28 * sc, () => {
          this.hooks.onImpactFrame?.(1.0, 1.0, color, 0.048);
          this.spawnRift({ x: tx, y: ty + 1.05, z: tz, color: secondary, coreColor: '#ffffff', rz: 0.4, len: 5.8 * as, height: 1.15 * as, life: 0.54 * sc });
          this.spawnRift({ x: tx, y: ty + 1.05, z: tz, color, coreColor: '#ffffff', rz: -0.46, len: 5.4 * as, height: 1.1 * as, life: 0.54 * sc });
          this.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.5, s1: 4.2 * as, yScale: 0.82, life: 0.46 * sc });
          this.spawnDebrisBurst(tx, ty + 0.75, tz, color, secondary, 8);
        });
        break;
      }

      case 'fusion': {
        // FULL WIDE AoE: RGB Glitch Spatial Rifts + Prism Crystal Eruptions across ALL pit targets!
        this.hooks.onArenaDim?.(0.64, '#0b1024', 0.7);
        pts.forEach((n, idx) => {
          this.after(idx * 0.06 * sc, () => {
            const c = idx % 2 === 0 ? color : secondary;
            this.spawnSlash({
              x: n.x, y: n.y + 0.85, z: n.z, color: c, coreColor: '#ffffff',
              rx: (idx % 2 === 0 ? 1 : -1) * 0.45, ry: idx * 1.2, rz: 0.35, s0: 1.3 * as, s1: 2.7 * as, life: 0.3 * sc, spinSpeed: 4.5,
            });
            this.spawnRift({
              x: n.x, y: n.y + 1.0, z: n.z, color: c, coreColor: '#ffffff',
              rz: idx % 2 === 0 ? 0.35 : -0.35, len: 3.9 * as, height: 0.78 * as, life: 0.48 * sc,
            });
            for (let k = 0; k < 2; k++) {
              this.spawnWeapon({
                kind: 'crystal',
                color: k === 0 ? c : secondary,
                coreColor: '#ffffff',
                startPos: new THREE.Vector3(n.x + (k === 0 ? -0.22 : 0.22), n.y - 0.25, n.z),
                endPos: new THREE.Vector3(n.x + (k === 0 ? -0.22 : 0.22), n.y + 0.04, n.z),
                startRot: new THREE.Euler((k - 0.5) * 0.4, idx, (k - 0.5) * 0.4),
                endRot: new THREE.Euler((k - 0.5) * 0.4, idx, (k - 0.5) * 0.4),
                scale: (k === 0 ? 1.95 : 1.45) * Math.max(0.75, as),
                mode: 'erupt',
                life: 0.48 * sc,
              });
            }
            this.spawnDebrisBurst(n.x, n.y + 0.6, n.z, color, secondary, 3);
          });
        });

        this.after(Math.min(0.42, pts.length * 0.06) * sc, () => {
          this.hooks.onImpactFrame?.(1.0, 1.0, secondary, 0.048);
          this.spawnRift({ x: cx, y: cy + 1.35, z: cz, color: secondary, coreColor: '#ffffff', rz: 0.26, len: 11.8 * as, height: 1.25 * as, life: 0.56 * sc });
          this.spawnRift({ x: cx, y: cy + 1.35, z: cz, color, coreColor: '#ffffff', rz: -0.26, len: 11.8 * as, height: 1.25 * as, life: 0.56 * sc });
          this.spawnDome({ x: cx, y: cy + 0.04, z: cz, color, coreColor: secondary, s0: 0.8 * as, s1: 6.2 * as, yScale: 0.58, life: 0.48 * sc });
        });
        break;
      }

      case 'limited': {
        // FULL WIDE AoE: Left -> Right 13m Eclipse Moon Slashes + Central Solar Pillar + 6 Golden Spears!
        this.hooks.onArenaDim?.(0.7, '#3b0712', 0.78);
        this.spawnSlash({ x: cx - 1.5 * as, y: cy + 1.15, z: cz, color: secondary, coreColor: color, rx: 0.35, ry: -0.4, rz: 0.35, s0: 2.8 * as, s1: 6.6 * as, life: 0.42 * sc, spinSpeed: 3.5 });
        this.after(0.12 * sc, () => {
          this.spawnSlash({ x: cx + 1.5 * as, y: cy + 1.25, z: cz, color, coreColor: '#ffffff', rx: -0.35, ry: 2.7, rz: -0.35, s0: 2.8 * as, s1: 6.6 * as, life: 0.42 * sc, spinSpeed: -3.5 });
        });
        this.after(0.24 * sc, () => {
          this.hooks.onImpactFrame?.(1.0, 0.0, color, 0.05);
          this.spawnBeam({ x: cx, y: cy, z: cz, color, coreColor: '#ffffff', radius: 1.05 * as, height: 1.05, life: 0.62 * sc });
          this.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: secondary, coreColor: color, s0: 0.85 * as, s1: 6.6 * as, yScale: 0.54, life: 0.54 * sc });
          pts.forEach((n, idx) => {
            this.after(idx * 0.038 * sc, () => {
              this.spawnDirectedWeapon(
                'spear',
                new THREE.Vector3(n.x + (idx % 2 === 0 ? -1.6 : 1.6), n.y + 7.0, n.z - 1.8),
                new THREE.Vector3(n.x, n.y + 0.4, n.z),
                color,
                1.68 * Math.max(0.78, as),
                0.22 * sc,
                () => {
                  this.spawnQuad({ tex: this.ringTex, x: n.x, y: n.y + 0.08, z: n.z, color, s0: 0.55, s1: 3.2 * as, life: 0.34 * sc, flatFloor: true });
                  this.spawnDebrisBurst(n.x, n.y + 0.6, n.z, color, secondary, 4);
                }
              );
            });
          });
        });
        break;
      }

      case 'twin': {
        // FULL WIDE AoE: Criss-Cross Twin Slashes across all pit targets -> Binary Center Mega Slashes + Vortex!
        this.hooks.onArenaDim?.(0.62, '#071c36', 0.76);
        for (let pass = 0; pass < 3; pass++) {
          this.after(pass * 0.1 * sc, () => {
            const nL = pts[(pass * 2) % pts.length];
            const nR = pts[(pass * 2 + 1) % pts.length];
            this.spawnSlash({ x: nL.x, y: nL.y + 0.8, z: nL.z, color, coreColor: '#ffffff', rx: 0.4, ry: pass * 1.4, rz: 0.35, s0: 1.4 * as, s1: 2.9 * as, life: 0.28 * sc, spinSpeed: 4.5 });
            this.spawnSlash({ x: nR.x, y: nR.y + 0.8, z: nR.z, color: secondary, coreColor: '#ffffff', rx: -0.4, ry: -pass * 1.4, rz: -0.35, s0: 1.4 * as, s1: 2.9 * as, life: 0.28 * sc, spinSpeed: -4.5 });
            this.spawnDirectedWeapon('blade', new THREE.Vector3(cx, cy + 2.0, cz), new THREE.Vector3(nL.x, nL.y + 0.4, nL.z), color, 1.15, 0.16 * sc);
            this.spawnDirectedWeapon('blade', new THREE.Vector3(cx, cy + 2.0, cz), new THREE.Vector3(nR.x, nR.y + 0.4, nR.z), secondary, 1.15, 0.16 * sc);
          });
        }
        this.after(0.36 * sc, () => {
          this.hooks.onImpactFrame?.(1.0, 0.0, color, 0.048);
          this.spawnBeam({ x: cx - 0.65 * as, y: cy, z: cz, color, coreColor: '#ffffff', radius: 0.68 * as, height: 1.05, life: 0.56 * sc });
          this.spawnBeam({ x: cx + 0.65 * as, y: cy, z: cz, color: secondary, coreColor: '#ffffff', radius: 0.68 * as, height: 1.05, life: 0.56 * sc });
          this.spawnVortex({ x: cx, y: cy + 0.04, z: cz, color, coreColor: secondary, sx: 2.6 * as, sy: 2.1 * as, twist: 8.5, spin: 10.5, life: 0.58 * sc });
          this.spawnDome({ x: cx, y: cy + 0.04, z: cz, color, coreColor: '#ffffff', s0: 0.75 * as, s1: 6.2 * as, yScale: 0.58, life: 0.5 * sc });
          this.spawnSlash({ x: cx, y: cy + 1.2, z: cz, color, coreColor: '#ffffff', rx: 0.2, ry: 0, rz: 0.32, s0: 3.0 * as, s1: 7.2 * as, life: 0.46 * sc, spinSpeed: 4.8 });
          this.spawnSlash({ x: cx, y: cy + 1.4, z: cz, color: secondary, coreColor: '#ffffff', rx: -0.2, ry: Math.PI, rz: -0.32, s0: 3.0 * as, s1: 7.2 * as, life: 0.46 * sc, spinSpeed: -4.8 });
        });
        break;
      }

      case 'omega': {
        // FULL WIDE AoE BOSS ULT: Judgement Cut End!
        this.hooks.onArenaDim?.(0.76, '#160307', 0.92);
        const cuts = [
          { x: cx - 2.8 * as, z: cz - 1.0 * as, rz: 0.35, c: '#ef4444' },
          { x: cx + 2.8 * as, z: cz + 1.1 * as, rz: -0.4, c: '#fbbf24' },
          { x: cx + 2.9 * as, z: cz - 0.9 * as, rz: 0.25, c: '#ef4444' },
          { x: cx - 2.5 * as, z: cz + 1.1 * as, rz: -0.32, c: '#ffffff' },
          { x: cx, z: cz, rz: -0.18, c: '#ef4444' },
        ];
        cuts.forEach((ct, idx) => {
          this.after(idx * 0.072 * sc, () => {
            this.spawnRift({
              x: ct.x, y: cy + 1.15, z: ct.z, color: ct.c, coreColor: '#ffffff',
              ry: idx % 2 === 0 ? 0.25 : -0.25, rz: ct.rz, len: (idx === 4 ? 13.0 : 5.4) * as, height: (idx === 4 ? 1.65 : 0.85) * as, life: 0.72 * sc,
            });
            this.spawnSlash({
              x: ct.x, y: cy + 0.95, z: ct.z, color: ct.c, coreColor: '#ffffff',
              rx: (idx % 2 === 0 ? 1 : -1) * 0.45, ry: idx * 1.1, rz: ct.rz, s0: (idx === 4 ? 3.2 : 1.6) * as, s1: (idx === 4 ? 7.2 : 3.2) * as, life: 0.38 * sc, spinSpeed: 4.5,
            });
          });
        });

        this.after(0.34 * sc, () => {
          this.spawnWeapon({
            kind: 'blade',
            color: '#ef4444',
            coreColor: '#fef08a',
            startPos: new THREE.Vector3(cx - 4.0 * as, cy + 6.2, cz - 1.4 * as),
            endPos: new THREE.Vector3(cx + 3.4 * as, cy + 0.8, cz + 1.4 * as),
            startRot: new THREE.Euler(0.45, 0.2, 1.2),
            endRot: new THREE.Euler(-0.35, 0.2, -2.05),
            scale: 4.9 * Math.max(0.7, as),
            mode: 'swing',
            life: 0.24 * sc,
            onArrive: () => {
              this.hooks.onImpactFrame?.(1.0, 0.0, '#ef4444', 0.056);
              this.hooks.onSpeedLines?.(0.95, 0.4);
              this.spawnBeam({ x: cx, y: cy, z: cz, color: '#ef4444', coreColor: '#fef08a', radius: 1.15 * as, height: 1.1, life: 0.64 * sc });
              this.spawnDome({ x: cx, y: cy + 0.04, z: cz, color, coreColor: secondary, s0: 0.85 * as, s1: 7.0 * as, yScale: 0.54, life: 0.58 * sc });
              pts.forEach((n, idx) => {
                this.after(idx * 0.032 * sc, () => {
                  this.spawnLightning(
                    new THREE.Vector3(n.x + (Math.random() - 0.5) * 1.1, n.y + 7.2, n.z - 0.5),
                    new THREE.Vector3(n.x, n.y + 0.25, n.z),
                    idx % 2 === 0 ? color : secondary,
                    0.24,
                    0.24 * sc
                  );
                  this.spawnQuad({ tex: this.crackTex, x: n.x, y: n.y + 0.08, z: n.z, color, s0: 2.7, s1: 3.1, life: 0.62 * sc, flatFloor: true });
                  this.spawnDebrisBurst(n.x, n.y + 0.75, n.z, color, secondary, 5);
                });
              });
            },
          });
        });
        break;
      }
    }
  }

  public update(dtSec: number, camera: THREE.Camera): void {
    if (this.disposed) return;
    const dt = Math.min(Math.max(0, dtSec), 0.1);
    this.time += dt;

    for (let i = this.events.length - 1; i >= 0; i--) {
      this.events[i].delay -= dt;
      if (this.events[i].delay <= 0) {
        const fn = this.events[i].fn;
        this.events.splice(i, 1);
        fn();
      }
    }

    for (let i = 0; i < this.slashes.length; i++) {
      const s = this.slashes[i];
      if (!s.active) continue;
      s.age += dt;
      const p = Math.min(1, s.age / s.life);
      s.mat.uniforms.uProgress.value = p;
      s.mat.uniforms.uOpacity.value = Math.sin(Math.min(1, p * 1.1) * Math.PI);
      const sc = s.s0 + (s.s1 - s.s0) * easeOutCubic(p);
      s.mesh.scale.setScalar(sc);
      s.mesh.rotation.y += s.spinSpeed * dt;
      if (p >= 1) { s.active = false; s.mesh.visible = false; }
    }

    for (let i = 0; i < this.domes.length; i++) {
      const d = this.domes[i];
      if (!d.active) continue;
      d.age += dt;
      const p = Math.min(1, d.age / d.life);
      const sc = d.s0 + (d.s1 - d.s0) * easeOutCubic(p);
      d.mesh.scale.set(sc, sc * d.yScale, sc);
      d.mat.uniforms.uProgress.value = p;
      d.mat.uniforms.uOpacity.value = 1 - easeInQuad(p);
      if (p >= 1) { d.active = false; d.mesh.visible = false; }
    }

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i];
      if (!b.active) continue;
      b.age += dt;
      const p = Math.min(1, b.age / b.life);
      const pop = easeOutCubic(Math.min(1, p / 0.14));
      const shrink = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
      b.mesh.scale.set(b.radius * (0.4 + 0.6 * pop) * shrink, b.height, b.radius * (0.4 + 0.6 * pop) * shrink);
      b.mat.uniforms.uTime.value = this.time;
      b.mat.uniforms.uProgress.value = p;
      b.mat.uniforms.uOpacity.value = shrink;
      if (p >= 1) { b.active = false; b.mesh.visible = false; }
    }

    for (let i = 0; i < this.vortices.length; i++) {
      const v = this.vortices[i];
      if (!v.active) continue;
      v.age += dt;
      const p = Math.min(1, v.age / v.life);
      const pop = easeOutBack(Math.min(1, p / 0.22));
      const fade = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
      v.mesh.scale.set(v.sx * pop, v.sy * pop, v.sx * pop);
      v.mesh.rotation.y += v.spin * dt;
      v.mat.uniforms.uTime.value = this.time;
      v.mat.uniforms.uOpacity.value = Math.max(0, fade);
      if (p >= 1) { v.active = false; v.mesh.visible = false; }
    }

    for (let i = 0; i < this.rifts.length; i++) {
      const r = this.rifts[i];
      if (!r.active) continue;
      r.age += dt;
      const p = Math.min(1, r.age / r.life);
      const pop = easeOutCubic(Math.min(1, p / 0.16));
      r.mesh.scale.set(r.len * pop, r.height * (1 - p * 0.32), 1);
      r.mat.uniforms.uProgress.value = p;
      r.mat.uniforms.uOpacity.value = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
      if (p >= 1) { r.active = false; r.mesh.visible = false; }
    }

    for (let i = 0; i < this.weapons.length; i++) {
      const w = this.weapons[i];
      if (!w.active) continue;
      w.age += dt;
      w.mat.uniforms.uTime.value = this.time;
      const p = Math.min(1, w.age / w.life);
      if (w.mode === 'erupt') {
        const up = easeOutBack(Math.min(1, p / 0.24));
        w.mesh.scale.setScalar(w.scaleTarget * (0.2 + 0.8 * up));
        w.mesh.position.lerpVectors(w.startPos, w.endPos, Math.min(1, p * 4));
        w.mat.uniforms.uOpacity.value = p > 0.58 ? 1 - (p - 0.58) / 0.42 : 1;
      } else if (w.mode === 'swing') {
        const k = easeInQuad(Math.min(1, p * 1.15));
        w.mesh.position.lerpVectors(w.startPos, w.endPos, k);
        w.mesh.rotation.x = w.startRot.x + (w.endRot.x - w.startRot.x) * k;
        w.mesh.rotation.y = w.startRot.y + (w.endRot.y - w.startRot.y) * k;
        w.mesh.rotation.z = w.startRot.z + (w.endRot.z - w.startRot.z) * k;
        w.mat.uniforms.uOpacity.value = p > 0.72 ? 1 - (p - 0.72) / 0.28 : 1;
        if (!w.arrived && p >= 0.76) {
          w.arrived = true;
          w.onArrive?.();
        }
      } else {
        const moveT = easeInQuad(Math.min(1, p / 0.58));
        w.mesh.position.lerpVectors(w.startPos, w.endPos, moveT);
        if (!w.arrived && p >= 0.58) {
          w.arrived = true;
          w.onArrive?.();
        }
        w.mat.uniforms.uOpacity.value = p > 0.62 ? 1 - (p - 0.62) / 0.38 : 1;
      }
      if (p >= 1) { w.active = false; w.mesh.visible = false; }
    }

    for (let i = 0; i < this.boltSegs.length; i++) {
      const b = this.boltSegs[i];
      if (!b.active) continue;
      b.age += dt;
      const p = Math.min(1, b.age / b.life);
      b.mat.opacity = 1 - p * p;
      if (p >= 1) { b.active = false; b.mesh.visible = false; }
    }

    for (let i = 0; i < this.debris.length; i++) {
      const db = this.debris[i];
      if (!db.active) continue;
      db.age += dt;
      const p = Math.min(1, db.age / db.life);
      db.vy -= 14.5 * dt;
      db.mesh.position.x += db.vx * dt;
      db.mesh.position.y += db.vy * dt;
      db.mesh.position.z += db.vz * dt;
      if (db.mesh.position.y < db.floorY) {
        db.mesh.position.y = db.floorY;
        db.vy = Math.abs(db.vy) * 0.42;
        db.vx *= 0.75;
        db.vz *= 0.75;
      }
      db.mesh.rotation.x += db.rx * dt;
      db.mesh.rotation.y += db.ry * dt;
      db.mesh.scale.setScalar(db.s0 * (1 - p * 0.85));
      if (p >= 1) { db.active = false; db.mesh.visible = false; }
    }

    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (!o.active) continue;
      o.age += dt;
      o.mat.uniforms.uTime.value = this.time;
      const p = Math.min(1, o.age / o.life);
      o.mesh.position.lerpVectors(o.p0, o.p1, easeInQuad(p));
      o.mesh.rotation.x += dt * 11;
      o.mesh.rotation.y += dt * 9;
      o.mesh.scale.setScalar(o.s0 + (o.s1 - o.s0) * p);
      o.trailTimer += dt;
      if (o.trailTimer >= 0.025) {
        o.trailTimer = 0;
        this.spawnQuad({
          tex: this.flameTex,
          x: o.mesh.position.x + (Math.random() - 0.5) * 0.25,
          y: o.mesh.position.y + (Math.random() - 0.5) * 0.25,
          z: o.mesh.position.z + (Math.random() - 0.5) * 0.25,
          color: o.trailColor,
          s0: o.s0 * 1.4,
          s1: 0.12,
          life: 0.22,
        });
      }
      if (!o.arrived && p >= 1) {
        o.arrived = true;
        o.onArrive?.();
        o.active = false;
        o.mesh.visible = false;
      }
    }

    for (let i = 0; i < this.quads.length; i++) {
      const q = this.quads[i];
      if (!q.active) continue;
      q.age += dt;
      const p = Math.min(1, q.age / q.life);
      q.vy -= q.gravity * dt;
      q.vx *= q.drag;
      q.vz *= q.drag;
      q.mesh.position.x += q.vx * dt;
      q.mesh.position.y += q.vy * dt;
      q.mesh.position.z += q.vz * dt;
      if (q.mesh.position.y < q.floorY && q.gravity > 0) {
        q.mesh.position.y = q.floorY;
        q.vy = Math.abs(q.vy) * 0.35;
      }
      const sc = q.s0 + (q.s1 - q.s0) * easeOutCubic(p);
      q.mesh.scale.setScalar(Math.max(0.01, sc));
      if (q.billboard && !q.flatFloor) {
        q.mesh.quaternion.copy(camera.quaternion);
        if (q.spin !== 0 || q.baseRotZ !== 0) q.mesh.rotateZ(q.baseRotZ + q.spin * q.age);
      } else if (q.flatFloor) {
        q.mesh.rotation.z = q.baseRotZ + q.spin * q.age;
      }
      q.mat.opacity = q.baseAlpha * (1 - p * p);
      if (p >= 1) { q.active = false; q.mesh.visible = false; }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    const mats = new Set<THREE.Material>();
    for (const s of this.slashes) mats.add(s.mat);
    for (const d of this.domes) mats.add(d.mat);
    for (const b of this.beams) mats.add(b.mat);
    for (const v of this.vortices) mats.add(v.mat);
    for (const r of this.rifts) mats.add(r.mat);
    for (const w of this.weapons) mats.add(w.mat);
    for (const b of this.boltSegs) mats.add(b.mat);
    for (const d of this.debris) mats.add(d.mat);
    for (const q of this.quads) mats.add(q.mat);
    for (const o of this.orbs) mats.add(o.mat);
    mats.forEach((m) => m.dispose());
    this.sharedGeos.forEach((g) => g.dispose());
  }
}
