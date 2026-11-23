import * as THREE from 'three';
import {
  getRaritySecondaryColor,
  resolvePitBounds,
  type TierAttackFireOpts,
} from './TierMotionPath3D';
import type { TierVfxChoreoContext } from './TierVfxChoreography3D';

/**
 * Executes bustling multi-wave GLSL shader & 3D choreography for all 5 Tier TWIN Chibis.
 */
export function fireTwinChibiChoreography(
  ctx: TierVfxChoreoContext,
  opts: TierAttackFireOpts
): void {
  const color = opts.colorHex;
  const secondary = opts.secondaryHex ?? getRaritySecondaryColor(opts.rarity);
  const { cx, cy, cz, pts } = resolvePitBounds(opts.allTargets ?? [], opts.target, opts.wideCenter);
  const sc = Math.max(0.55, Math.min(1.15, opts.speedScale ?? 1.0));
  const as = Math.max(0.45, Math.min(1.2, opts.areaScale ?? 1.0));

  switch (opts.chibiId) {
    case 'yukikage-twins': {
      // 1. YUKIKAGE TWINS: 2.5s Sakuga Makyo Shimo-Kagami (Fluid Ukiyo-e Spiral Ribbons + 7 Tilted Dome Ice Mirrors + 8 Light-Speed Pinball Ricochet Beams -> Convergent All-Mirror Shatter & Reality-Crack Dome!)
      ctx.fireYukikageTwinsSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onSlashBeat: (beatIdx, pt) => {
          const isAmber = beatIdx === 7;
          ctx.spawnSparks(
            pt.x,
            pt.y + 0.85,
            pt.z,
            isAmber ? '#fbbf24' : '#38bdf8',
            '#ffffff',
            5,
            7.4
          );
        },
        onImpact: () => {
          ctx.spawnSparks(cx, cy + 1.1, cz, '#e0f2fe', '#38bdf8', 18, 9.6);
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, i % 2 === 0 ? '#38bdf8' : '#e0f2fe', '#fbbf24', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#ffffff', '#38bdf8', 8, 8.2);
          });
        },
      });
      break;
    }

    case 'halcyon-twins': {
      // 2. HALCYON TWINS: 2.5s Sakuga Luminosité Standard & Azure Excalibur (Royal Knight Banner Plant + Billowing Crest Cloth + 6 Azure SDF Lightning Strikes -> Colossal Horizontal Excalibur Wave Sweep & 8-Sword Sky Halo Plunge -> Banner Crest Resonance Finale!)
      ctx.fireHalcyonTwinsSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onSlashBeat: (beatIdx, pt) => {
          const isAzure = beatIdx % 2 === 0;
          ctx.spawnSparks(
            pt.x,
            pt.y + 0.85,
            pt.z,
            isAzure ? '#38bdf8' : '#2dd4bf',
            '#fde047',
            6,
            7.0
          );
          if (pts.length > 1) {
            const other = pts[(beatIdx + 1) % pts.length];
            ctx.spawnLightning(
              new THREE.Vector3(pt.x, pt.y + 0.8, pt.z),
              new THREE.Vector3(other.x, other.y + 0.8, other.z),
              isAzure ? '#38bdf8' : '#fde047',
              0.17,
              0.18 * sc
            );
          }
        },
        onImpact: () => {
          ctx.spawnSparks(cx, cy + 1.1, cz, '#38bdf8', '#fde047', 14, 8.8);
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, i % 2 === 0 ? '#38bdf8' : '#fde047', '#ffffff', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#fde047', '#38bdf8', 8, 7.6);
          });
        },
      });
      break;
    }

    case 'nocturne-twins': {
      // 3. NOCTURNE TWINS: 2.5s Sakuga Abyssal Shadow-Garden (Vertex-Displaced Liquid Shadow Sea + 6 Ruined Gothic Pillars + 6 Binding Silver Chains -> Orbiting Silver/Void Orbs Fusing into Black-Hole Singularity Implosion -> 14-Plane Judgment Cut End Lattice & Rose-Petal/Star Detonation!)
      ctx.fireNocturneTwinsSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onSlashBeat: (beatIdx, pt) => {
          const isSilver = beatIdx % 2 === 0;
          ctx.spawnSparks(
            pt.x,
            pt.y + 0.88,
            pt.z,
            isSilver ? '#f8fafc' : '#a855f7',
            isSilver ? '#cbd5e1' : '#e879f9',
            6,
            7.2
          );
          if (pts.length > 1) {
            const other = pts[(beatIdx + 1) % pts.length];
            ctx.spawnLightning(
              new THREE.Vector3(pt.x, pt.y + 0.78, pt.z),
              new THREE.Vector3(other.x, other.y + 0.78, other.z),
              isSilver ? '#e2e8f0' : '#a855f7',
              0.17,
              0.18 * sc
            );
          }
        },
        onImpact: () => {
          ctx.spawnSparks(cx, cy + 1.05, cz, '#f8fafc', '#a855f7', 14, 8.8);
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, i % 2 === 0 ? '#09090b' : '#f8fafc', '#a855f7', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, i % 2 === 0 ? '#f8fafc' : '#a855f7', '#e879f9', 8, 7.8);
          });
        },
      });
      break;
    }

    case 'lullaby-twins': {
      // 4. LULLABY TWINS: 2.5s Sakuga Nightmare Lullaby Requiem (Gothic Rose-Window Domain -> 6-Hit Black-Core Sakura & Demon Blitz -> Shattering Mirror + Twin Scythe & Lance Slam -> Abyssal Sakura-Eclipse Spire & 36 Feathers -> Requiem Detonation)
      ctx.fireLullabyTwinsSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onSlashBeat: (beatIdx, pt) => {
          const isSakura = beatIdx % 2 === 0;
          ctx.spawnSparks(
            pt.x,
            pt.y + 0.88,
            pt.z,
            isSakura ? '#f472b6' : '#c084fc',
            isSakura ? '#e879f9' : '#f8fafc',
            6,
            6.8
          );
          if (pts.length > 1) {
            const other = pts[(beatIdx + 1) % pts.length];
            ctx.spawnLightning(
              new THREE.Vector3(pt.x, pt.y + 0.78, pt.z),
              new THREE.Vector3(other.x, other.y + 0.78, other.z),
              isSakura ? '#f472b6' : '#c084fc',
              0.17,
              0.18 * sc
            );
          }
        },
        onImpact: () => {
          ctx.spawnSparks(cx, cy + 1.05, cz, '#f472b6', '#f8fafc', 12, 8.6);
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, i % 2 === 0 ? '#f472b6' : '#c084fc', '#f8fafc', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, i % 2 === 0 ? '#f472b6' : '#e879f9', '#c084fc', 7, 7.6);
          });
        },
      });
      break;
    }

    case 'clockwork-twins': {
      // 5. CLOCKWORK TWINS: 2.5s Sakuga Chrono-Scissor Execution (Snappy 6-Hit Per-Ore Blitz -> Violent easeInExpo Great-Scythe Slam -> Judgment Sky-Pillar & Ballistic Spark Fountain -> 1.05s Time-Resume Overdrive)
      ctx.fireClockworkTwinsSakuga({
        cx,
        cy,
        cz,
        areaScale: as,
        pts,
        onSlashBeat: (beatIdx, pt) => {
          const isAmber = beatIdx % 2 === 0;
          ctx.spawnSparks(
            pt.x,
            pt.y + 0.85,
            pt.z,
            isAmber ? '#fbbf24' : '#2dd4bf',
            isAmber ? '#f472b6' : '#c084fc',
            6,
            7.4
          );
          if (pts.length > 1) {
            const other = pts[(beatIdx + 1) % pts.length];
            ctx.spawnLightning(
              new THREE.Vector3(pt.x, pt.y + 0.75, pt.z),
              new THREE.Vector3(other.x, other.y + 0.75, other.z),
              isAmber ? '#fbbf24' : '#2dd4bf',
              0.18,
              0.18 * sc
            );
          }
        },
        onImpact: () => {
          ctx.spawnSparks(cx, cy + 1.05, cz, '#fbbf24', '#ffffff', 14, 9.2);
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.85, n.z, i % 2 === 0 ? '#fbbf24' : '#2dd4bf', '#f472b6', 6);
            ctx.spawnSparks(n.x, n.y + 0.9, n.z, i % 2 === 0 ? '#fbbf24' : '#f472b6', '#2dd4bf', 8, 8.2);
          });
        },
      });
      break;
    }

    default: {
      ctx.hooks.onArenaDim?.(0.62, '#071c36', 0.76);
      for (let pass = 0; pass < 3; pass++) {
        ctx.after(pass * 0.1 * sc, () => {
          const nL = pts[(pass * 2) % pts.length];
          const nR = pts[(pass * 2 + 1) % pts.length];
          ctx.spawnSlash({ x: nL.x, y: nL.y + 0.8, z: nL.z, color, coreColor: '#ffffff', rx: 0.4, ry: pass * 1.4, rz: 0.35, s0: 1.4 * as, s1: 2.9 * as, life: 0.28 * sc, spinSpeed: 4.5 });
          ctx.spawnSlash({ x: nR.x, y: nR.y + 0.8, z: nR.z, color: secondary, coreColor: '#ffffff', rx: -0.4, ry: -pass * 1.4, rz: -0.35, s0: 1.4 * as, s1: 2.9 * as, life: 0.28 * sc, spinSpeed: -4.5 });
          ctx.spawnDirectedWeapon('blade', new THREE.Vector3(cx, cy + 2.0, cz), new THREE.Vector3(nL.x, nL.y + 0.4, nL.z), color, 1.15, 0.16 * sc);
          ctx.spawnDirectedWeapon('blade', new THREE.Vector3(cx, cy + 2.0, cz), new THREE.Vector3(nR.x, nR.y + 0.4, nR.z), secondary, 1.15, 0.16 * sc);
        });
      }
      ctx.after(0.36 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 0.0, color, 0.048);
        ctx.spawnBeam({ x: cx - 0.65 * as, y: cy, z: cz, color, coreColor: '#ffffff', radius: 0.68 * as, height: 1.05, life: 0.56 * sc });
        ctx.spawnBeam({ x: cx + 0.65 * as, y: cy, z: cz, color: secondary, coreColor: '#ffffff', radius: 0.68 * as, height: 1.05, life: 0.56 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color, coreColor: '#ffffff', s0: 0.75 * as, s1: 6.2 * as, yScale: 0.58, life: 0.5 * sc });
      });
      break;
    }
  }
}
