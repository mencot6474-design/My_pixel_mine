import * as THREE from 'three';
import type { FusionChibiVariant } from './MeshFx3D';
import { fireFusionChibiChoreography } from './TierFusionChoreography3D';
import { fireTwinChibiChoreography } from './TierTwinChoreography3D';
import {
  getRaritySecondaryColor,
  resolvePitBounds,
  type TierAttackFireOpts,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierMotionPath3D';
import type { WeaponSlot } from './TierVfxUpdate3D';

export interface TierVfxChoreoContext {
  readonly lowQuality: boolean;
  readonly hooks: TierVfxHooks;
  readonly ringTex: THREE.Texture;
  readonly crackTex: THREE.Texture;
  after: (delay: number, fn: () => void) => void;
  spawnSlash: (opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; s0?: number; s1?: number; life?: number; spinSpeed?: number; darkCore?: boolean; shaderMode?: number;
  }) => void;
  spawnClockDial: (opts: {
    x: number; y: number; z: number; color?: string; coreColor?: string; s0?: number; s1?: number; life?: number;
  }) => void;
  spawnFrostSeal: (opts: {
    x: number; y: number; z: number; s0?: number; s1?: number; life?: number;
  }) => void;
  spawnLullabySeal: (opts: {
    x: number; y: number; z: number; s0?: number; s1?: number; life?: number;
  }) => void;
  spawnHalcyonSeal: (opts: {
    x: number; y: number; z: number; s0?: number; s1?: number; life?: number;
  }) => void;
  spawnFusionSeal: (opts: {
    variant: FusionChibiVariant; x: number; y: number; z: number; s0?: number; s1?: number; life?: number;
  }) => void;
  spawnFusionProp: (opts: {
    variant: FusionChibiVariant;
    mode: 'erupt' | 'plunge' | 'hover' | 'crown';
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startRot?: THREE.Euler;
    endRot?: THREE.Euler;
    scale?: number;
    life?: number;
    spinY?: number;
    seed?: number;
    onArrive?: () => void;
  }) => void;
  spawnHalcyonRailPillars: (opts: {
    cx: number; cy: number; cz: number; areaScale: number; life: number;
  }) => THREE.Vector3[];
  spawnHalcyonRainWeapon: (opts: {
    kind: 'arrow' | 'blade';
    fromVec: THREE.Vector3;
    toVec: THREE.Vector3;
    color: string;
    accentColor: string;
    scale: number;
    life: number;
    arriveFrac?: number;
    seed?: number;
    onArrive?: () => void;
  }) => void;
  spawnNocturneEclipseMonolith: (opts: {
    cx: number; cy: number; cz: number; areaScale: number; life: number; onSever?: () => void;
  }) => void;
  spawnNocturneCrater: (opts: {
    x: number; y: number; z: number; s0: number; s1: number; life: number;
  }) => void;
  spawnLullabyMirrorMoonCataclysm: (opts: {
    cx: number; cy: number; cz: number; areaScale: number;
    lockDur: number; shatterDur: number;
    onMoonStrike?: () => void; onShatter?: () => void;
  }) => void;
  spawnInvertedClocktower: (opts: {
    cx: number; cy: number; cz: number; areaScale: number;
    fallDur: number; holdDur: number; explodeDur: number;
    onLand?: () => void; onExplode?: () => void;
  }) => void;
  spawnDome: (opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    s0?: number; s1?: number; yScale?: number; life?: number;
  }) => void;
  spawnBeam: (opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    radius?: number; height?: number; life?: number;
  }) => void;
  spawnVortex: (opts: {
    x: number; y?: number; z: number; color: string; coreColor?: string;
    sx?: number; sy?: number; twist?: number; spin?: number; life?: number;
  }) => void;
  spawnRift: (opts: {
    x: number; y: number; z: number; color: string; coreColor?: string;
    rx?: number; ry?: number; rz?: number; len?: number; height?: number; life?: number;
  }) => void;
  spawnWeapon: (opts: {
    kind: WeaponSlot['kind'];
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
  }) => void;
  spawnDirectedWeapon: (
    kind: 'blade' | 'spear' | 'katana' | 'kunai' | 'arrow' | 'greatsword' | 'crystal' | 'clockhand',
    fromVec: THREE.Vector3,
    toVec: THREE.Vector3,
    color: string,
    scale?: number,
    life?: number,
    onArrive?: () => void
  ) => void;
  spawnLightning: (a: THREE.Vector3, b: THREE.Vector3, color: string, width?: number, life?: number) => void;
  spawnDebrisBurst: (x: number, y: number, z: number, color: string, secondary: string, count?: number) => void;
  spawnQuad: (opts: {
    tex: THREE.Texture; x: number; y: number; z: number; color?: string;
    s0?: number; s1?: number; life?: number; floorY?: number;
    vx?: number; vy?: number; vz?: number; gravity?: number; drag?: number;
    spin?: number; billboard?: boolean; flatFloor?: boolean; rotZ?: number; alpha?: number;
  }) => void;
  spawnOrb: (opts: {
    p0: THREE.Vector3; p1: THREE.Vector3; color: string; coreColor?: string;
    trailColor?: string; s0?: number; s1?: number; life?: number; onArrive?: () => void;
  }) => void;
  spawnSparks: (x: number, y: number, z: number, color: string, secondary: string, count?: number, speed?: number) => void;
  fireCrimsonRoninSakuga: (opts: {
    cx: number; cy: number; cz: number; areaScale: number; pts: readonly WorldPoint3[]; onImpact?: () => void;
  }) => void;
  fireObsidianSovereignSakuga: (opts: {
    cx: number; cy: number; cz: number; areaScale: number; pts: readonly WorldPoint3[]; onImpact?: () => void;
  }) => void;
}

export function fireTierAttackChoreography(
  ctx: TierVfxChoreoContext,
  opts: TierAttackFireOpts
): void {
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
      ctx.spawnSlash({
        x: tx, y: ty + 0.65, z: tz, color, coreColor: '#ffffff',
        rx: tilt, ry: -Math.PI * 0.3 + comboStep * 0.8, rz: 0.25, s0: 1.4, s1: 2.5, life: 0.32 * sc, spinSpeed: 3.2,
      });
      ctx.spawnQuad({ tex: ctx.ringTex, x: tx, y: ty + 0.06, z: tz, color, s0: 0.55, s1: 2.3, life: 0.26 * sc, flatFloor: true });
      ctx.spawnSparks(tx, ty + 0.6, tz, color, '#ffffff', 7, 4.2);
      ctx.spawnDebrisBurst(tx, ty + 0.5, tz, color, '#94a3b8', 3);
      break;
    }

    case 'uncommon': {
      const shots = [
        new THREE.Vector3(tx - 1.5, ty + 2.1, tz - 0.7),
        new THREE.Vector3(tx + 1.5, ty + 2.3, tz - 0.5),
        new THREE.Vector3(tx, ty + 2.5, tz + 0.9),
      ];
      shots.forEach((pt, i) => {
        ctx.after(i * 0.1 * sc, () => {
          ctx.spawnSlash({
            x: tx, y: ty + 0.8, z: tz, color: i === 1 ? secondary : color, coreColor: '#ffffff',
            rx: (i - 1) * 0.4, ry: i * 1.4, rz: 0.25, s0: 1.25, s1: 2.3, life: 0.26 * sc, spinSpeed: 3.6,
          });
          ctx.spawnDirectedWeapon('spear', pt, new THREE.Vector3(tx, ty + 0.35, tz), i === 1 ? secondary : color, 1.28, 0.2 * sc, () => {
            ctx.spawnQuad({ tex: ctx.ringTex, x: tx, y: ty + 0.08, z: tz, color, s0: 0.5, s1: 2.5, life: 0.26 * sc, flatFloor: true });
            ctx.spawnSparks(tx, ty + 0.6, tz, color, secondary, 5, 4.2);
            ctx.spawnDebrisBurst(tx, ty + 0.5, tz, color, secondary, 3);
          });
        });
      });
      break;
    }

    case 'rare': {
      for (let wave = 0; wave < 2; wave++) {
        ctx.after(wave * 0.12 * sc, () => {
          const sideSign = wave === 0 ? -1 : 1;
          ctx.spawnSlash({
            x: tx, y: ty + 0.75, z: tz, color: wave === 0 ? color : secondary, coreColor: '#ffffff',
            rx: sideSign * 0.35, ry: wave * 2.2, rz: 0.3, s0: 1.35, s1: 2.65, life: 0.28 * sc, spinSpeed: sideSign * 3.8,
          });
          for (let k = 0; k < 3; k++) {
            const ang = (k + wave * 3) * (Math.PI / 3);
            const sx = tx + Math.cos(ang) * 0.72;
            const sz = tz + Math.sin(ang) * 0.72;
            const tilt = new THREE.Euler(Math.sin(ang) * 0.35, ang, -Math.cos(ang) * 0.35);
            ctx.spawnWeapon({
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
          ctx.spawnDebrisBurst(tx, ty + 0.6, tz, color, '#e0f2fe', 4);
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
        ctx.after(step * 0.095 * sc, () => {
          const col = step % 2 === 0 ? color : secondary;
          const curPt = new THREE.Vector3(curNode.x, curNode.y + 0.7, curNode.z);
          ctx.spawnLightning(new THREE.Vector3(curNode.x, curNode.y + 5.8, curNode.z), curPt, col, 0.24, 0.22 * sc);
          if (prevNode) {
            ctx.spawnLightning(new THREE.Vector3(prevNode.x, prevNode.y + 0.75, prevNode.z), curPt, secondary, 0.21, 0.22 * sc);
          }
          ctx.spawnSlash({
            x: curNode.x, y: curNode.y + 0.8, z: curNode.z, color: col, coreColor: '#ffffff',
            rx: 0.35, ry: step * 1.3, rz: -0.25, s0: 1.25, s1: 2.35, life: 0.24 * sc, spinSpeed: 4,
          });
          ctx.spawnQuad({ tex: ctx.crackTex, x: curNode.x, y: curNode.y + 0.06, z: curNode.z, color, s0: 2.0, s1: 2.3, life: 0.42 * sc, flatFloor: true });
          ctx.spawnSparks(curNode.x, curNode.y + 0.7, curNode.z, col, '#ffffff', 5, 4.2);
        });
      }
      break;
    }

    case 'legendary': {
      ctx.spawnSlash({ x: tx - 1.0, y: ty + 2.0, z: tz - 0.6, color, coreColor: '#ffffff', rx: 0.4, ry: 0.8, rz: 0.5, s0: 1.4, s1: 2.7, life: 0.28 * sc, spinSpeed: 4 });
      ctx.after(0.11 * sc, () => {
        ctx.spawnSlash({ x: tx + 0.9, y: ty + 1.5, z: tz - 0.2, color: secondary, coreColor: '#ffffff', rx: -0.4, ry: 2.4, rz: -0.5, s0: 1.5, s1: 2.9, life: 0.28 * sc, spinSpeed: -4 });
      });
      ctx.spawnOrb({
        p0: new THREE.Vector3(tx - 3.2, ty + 8.0, tz - 2.8),
        p1: new THREE.Vector3(tx, ty + 0.4, tz),
        color: secondary,
        coreColor: '#ffffff',
        trailColor: secondary,
        s0: 1.05,
        s1: 1.5,
        life: 0.28 * sc,
        onArrive: () => {
          ctx.hooks.onImpactFrame?.(0.7, 0.0, secondary, 0.038);
          ctx.spawnDome({ x: tx, y: ty + 0.04, z: tz, color: secondary, coreColor: '#ffffff', s0: 0.45, s1: 3.9, yScale: 0.78, life: 0.46 * sc });
          ctx.spawnQuad({ tex: ctx.crackTex, x: tx, y: ty + 0.06, z: tz, color: secondary, s0: 2.8, s1: 3.2, life: 0.6 * sc, flatFloor: true });
          ctx.spawnDebrisBurst(tx, ty + 0.7, tz, secondary, color, 7);
          ctx.spawnSparks(tx, ty + 0.7, tz, secondary, color, 10, 5.4);
        },
      });
      break;
    }

    case 'rainbow': {
      // Exact approved Rainbow benchmark!
      const palette = ['#ef4444', '#fbbf24', '#22d3ee', '#a855f7', '#4ade80', '#f43f5e'];
      for (let i = 0; i < 6; i++) {
        ctx.after(i * 0.048 * sc, () => {
          const col = palette[i];
          const ang = (i / 6) * Math.PI * 2;
          ctx.spawnSlash({
            x: tx, y: ty + 0.75 + i * 0.12, z: tz, color: col, coreColor: '#ffffff',
            rx: (i - 2.5) * 0.35, ry: ang, rz: (i % 2 === 0 ? 1 : -1) * 0.45,
            s0: 1.45, s1: 3.0, life: 0.34 * sc, spinSpeed: (i % 2 === 0 ? 1 : -1) * 4.2,
          });
          ctx.spawnDirectedWeapon(
            'blade',
            new THREE.Vector3(tx + Math.cos(ang) * 2.2, ty + 2.2, tz + Math.sin(ang) * 2.2),
            new THREE.Vector3(tx, ty + 0.45, tz),
            col,
            1.08,
            0.18 * sc,
            () => {
              ctx.spawnSparks(tx, ty + 0.7, tz, col, '#ffffff', 4, 4.4);
              ctx.spawnDebrisBurst(tx, ty + 0.6, tz, col, '#ffffff', 2);
            }
          );
        });
      }
      break;
    }

    case 'mythic': {
      ctx.spawnBeam({ x: tx, y: ty, z: tz, color, coreColor: '#ffffff', radius: 0.68, height: 1.0, life: 0.56 * sc });
      for (let i = 0; i < 6; i++) {
        const arcAng = (i / 6) * Math.PI * 2;
        const hover = new THREE.Vector3(tx + Math.cos(arcAng) * 2.0, ty + 4.1, tz + Math.sin(arcAng) * 2.0);
        ctx.after(i * 0.055 * sc, () => {
          ctx.spawnSlash({
            x: tx, y: ty + 0.85 + (i % 3) * 0.2, z: tz, color: i % 2 === 0 ? color : '#ffffff', coreColor: '#ffffff',
            rx: (i - 2.5) * 0.3, ry: arcAng, rz: 0.35, s0: 1.3, s1: 2.7, life: 0.28 * sc, spinSpeed: 4,
          });
          ctx.spawnDirectedWeapon('blade', hover, new THREE.Vector3(tx, ty + 0.4, tz), color, 1.35, 0.2 * sc, () => {
            ctx.spawnQuad({ tex: ctx.ringTex, x: tx, y: ty + 0.08, z: tz, color, s0: 0.55, s1: 2.9, life: 0.28 * sc, flatFloor: true });
            if (i === 5) {
              ctx.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.55, s1: 3.8, yScale: 0.82, life: 0.44 * sc });
              ctx.spawnDebrisBurst(tx, ty + 0.6, tz, color, '#ffffff', 6);
            }
          });
        });
      }
      break;
    }

    case 'exotic': {
      ctx.spawnVortex({ x: tx, y: ty + 0.04, z: tz, color, coreColor: secondary, sx: 1.45, sy: 2.0, twist: 8, spin: 11, life: 0.56 * sc });
      for (let i = 0; i < 4; i++) {
        ctx.after(i * 0.075 * sc, () => {
          ctx.spawnSlash({
            x: tx, y: ty + 0.7 + i * 0.22, z: tz, color: i % 2 === 0 ? color : secondary, coreColor: '#ffffff',
            rx: 0.3, ry: i * 1.6, rz: -0.35, s0: 1.4, s1: 3.0, life: 0.28 * sc, spinSpeed: 5.5,
          });
        });
      }
      ctx.after(0.32 * sc, () => {
        ctx.spawnBeam({ x: tx, y: ty, z: tz, color: secondary, coreColor: '#ffffff', radius: 0.78, height: 1.0, life: 0.42 * sc });
        ctx.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.5, s1: 4.1, yScale: 0.8, life: 0.44 * sc });
        ctx.spawnDebrisBurst(tx, ty + 0.75, tz, secondary, color, 7);
      });
      break;
    }

    case 'secret': {
      ctx.hooks.onArenaDim?.(0.6, '#020617', 0.48);
      for (let i = 0; i < 3; i++) {
        ctx.after(i * 0.08 * sc, () => {
          const c = i % 2 === 0 ? color : secondary;
          ctx.spawnSlash({
            x: tx, y: ty + 0.85 + i * 0.18, z: tz, color: c, coreColor: '#ffffff',
            rx: (i - 1) * 0.45, ry: i * 2.1, rz: 0.4, s0: 1.5, s1: 3.1, life: 0.28 * sc, spinSpeed: 4.5,
          });
        });
      }
      ctx.after(0.28 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, color, 0.048);
        ctx.spawnRift({ x: tx, y: ty + 1.05, z: tz, color: secondary, coreColor: '#ffffff', rz: 0.4, len: 5.8 * as, height: 1.15 * as, life: 0.54 * sc });
        ctx.spawnRift({ x: tx, y: ty + 1.05, z: tz, color, coreColor: '#ffffff', rz: -0.46, len: 5.4 * as, height: 1.1 * as, life: 0.54 * sc });
        ctx.spawnDome({ x: tx, y: ty + 0.04, z: tz, color, coreColor: '#ffffff', s0: 0.5, s1: 4.2 * as, yScale: 0.82, life: 0.46 * sc });
        ctx.spawnDebrisBurst(tx, ty + 0.75, tz, color, secondary, 8);
      });
      break;
    }

    case 'fusion': {
      fireFusionChibiChoreography(ctx, opts);
      break;
    }

    case 'limited': {
      // FULL WIDE AoE: Left -> Right 13m Eclipse Moon Slashes + Central Solar Pillar + 6 Golden Spears!
      ctx.hooks.onArenaDim?.(0.7, '#3b0712', 0.78);
      ctx.spawnSlash({ x: cx - 1.5 * as, y: cy + 1.15, z: cz, color: secondary, coreColor: color, rx: 0.35, ry: -0.4, rz: 0.35, s0: 2.8 * as, s1: 6.6 * as, life: 0.42 * sc, spinSpeed: 3.5 });
      ctx.after(0.12 * sc, () => {
        ctx.spawnSlash({ x: cx + 1.5 * as, y: cy + 1.25, z: cz, color, coreColor: '#ffffff', rx: -0.35, ry: 2.7, rz: -0.35, s0: 2.8 * as, s1: 6.6 * as, life: 0.42 * sc, spinSpeed: -3.5 });
      });
      ctx.after(0.24 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 0.0, color, 0.05);
        ctx.spawnBeam({ x: cx, y: cy, z: cz, color, coreColor: '#ffffff', radius: 1.05 * as, height: 1.05, life: 0.62 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: secondary, coreColor: color, s0: 0.85 * as, s1: 6.6 * as, yScale: 0.54, life: 0.54 * sc });
        pts.forEach((n, idx) => {
          ctx.after(idx * 0.038 * sc, () => {
            ctx.spawnDirectedWeapon(
              'spear',
              new THREE.Vector3(n.x + (idx % 2 === 0 ? -1.6 : 1.6), n.y + 7.0, n.z - 1.8),
              new THREE.Vector3(n.x, n.y + 0.4, n.z),
              color,
              1.68 * Math.max(0.78, as),
              0.22 * sc,
              () => {
                ctx.spawnQuad({ tex: ctx.ringTex, x: n.x, y: n.y + 0.08, z: n.z, color, s0: 0.55, s1: 3.2 * as, life: 0.34 * sc, flatFloor: true });
                ctx.spawnDebrisBurst(n.x, n.y + 0.6, n.z, color, secondary, 4);
              }
            );
          });
        });
      });
      break;
    }

    case 'twin': {
      fireTwinChibiChoreography(ctx, opts);
      break;
    }

    case 'omega': {
      if (opts.chibiId === 'obsidian-sovereign') {
        ctx.fireObsidianSovereignSakuga({
          cx,
          cy,
          cz,
          areaScale: as,
          pts,
          onImpact: () => {
            pts.forEach((n) => {
              ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, '#09090b', '#e879f9', 6);
              ctx.spawnSparks(n.x, n.y + 0.95, n.z, '#f8fafc', '#e879f9', 8, 7.2);
            });
          },
        });
        break;
      }

      ctx.fireCrimsonRoninSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onImpact: () => {
          pts.forEach((n) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.8, n.z, '#ef4444', '#fbbf24', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#fef08a', '#ffffff', 8, 7.0);
          });
        },
      });
      break;
    }
  }
}
