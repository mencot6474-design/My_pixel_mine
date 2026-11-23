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
      // 1. YUKIKAGE TWINS: Frost-Ink Seal + Sumi-e Triple Slashes + Kunai Storm + 8 Glacial Spires -> Absolute Zero Shatter!
      ctx.hooks.onArenaDim?.(0.74, '#041322', 1.04 * sc);
      ctx.spawnFrostSeal({ x: cx, y: cy + 0.08, z: cz, s0: 2.0 * as, s1: 9.4 * as, life: 1.24 * sc });

      ctx.spawnSlash({
        x: cx - 0.35 * as, y: cy + 1.05, z: cz + 0.2 * as, color: '#38bdf8', coreColor: '#e0f2fe',
        rx: 0.24, ry: 0.25, rz: 0.28, s0: 2.3 * as, s1: 6.8 * as, life: 0.34 * sc, spinSpeed: 4.8, shaderMode: 2, darkCore: true,
      });
      ctx.after(0.11 * sc, () => {
        ctx.spawnSlash({
          x: cx + 0.35 * as, y: cy + 1.2, z: cz - 0.1 * as, color: '#e0f2fe', coreColor: '#38bdf8',
          rx: -0.26, ry: Math.PI - 0.3, rz: -0.32, s0: 2.5 * as, s1: 7.2 * as, life: 0.34 * sc, spinSpeed: -4.8, shaderMode: 2, darkCore: true,
        });
        ctx.spawnSparks(cx, cy + 1.0, cz, '#e0f2fe', '#38bdf8', 7, 5.4);
      });
      ctx.after(0.22 * sc, () => {
        ctx.spawnSlash({
          x: cx, y: cy + 1.35, z: cz, color: '#38bdf8', coreColor: '#ffffff',
          rx: 0.44, ry: 0.72, rz: 0.46, s0: 2.7 * as, s1: 7.8 * as, life: 0.36 * sc, spinSpeed: 5.2, shaderMode: 2, darkCore: true,
        });
        pts.forEach((n, idx) => {
          ctx.spawnDirectedWeapon(
            'kunai',
            new THREE.Vector3(cx + (idx % 2 === 0 ? -3.2 : 3.2) * as, cy + 4.4, cz - 1.2),
            new THREE.Vector3(n.x, n.y + 0.3, n.z),
            idx % 2 === 0 ? '#38bdf8' : '#e0f2fe',
            1.15 * Math.max(0.75, as),
            0.2 * sc,
            () => ctx.spawnSparks(n.x, n.y + 0.35, n.z, '#e0f2fe', '#38bdf8', 4, 5.2)
          );
        });
      });

      ctx.after(0.28 * sc, () => {
        ctx.hooks.onSpeedLines?.(0.88, 0.32);
        const spireCount = 8;
        for (let s = 0; s < spireCount; s++) {
          const ang = (s / spireCount) * Math.PI * 2;
          const sx = cx + Math.cos(ang) * (2.45 + (s % 2) * 0.65) * as;
          const sz = cz + Math.sin(ang) * (1.75 + (s % 2) * 0.45) * as;
          const rot = new THREE.Euler(Math.sin(ang) * 0.26, ang, -Math.cos(ang) * 0.26);
          ctx.spawnWeapon({
            kind: 'crystal',
            color: s % 2 === 0 ? '#38bdf8' : '#e0f2fe',
            coreColor: '#ffffff',
            startPos: new THREE.Vector3(sx, cy - 1.2, sz),
            endPos: new THREE.Vector3(sx, cy + 0.02, sz),
            startRot: rot,
            endRot: rot,
            scale: (2.1 + (s % 2) * 0.65) * Math.max(0.75, as),
            mode: 'erupt',
            life: 0.74 * sc,
          });
        }
      });

      ctx.after(0.62 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, '#38bdf8', 0.058);
        ctx.hooks.onSpeedLines?.(1.0, 0.44);
        ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: '#0f172a', coreColor: '#e0f2fe', s0: 0.9 * as, s1: 8.2 * as, yScale: 0.56, life: 0.56 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: '#38bdf8', coreColor: '#ffffff', s0: 0.65 * as, s1: 6.4 * as, yScale: 0.62, life: 0.48 * sc });
        ctx.spawnSlash({
          x: cx, y: cy + 1.15, z: cz, color: '#38bdf8', coreColor: '#ffffff',
          rx: 0.14, ry: 0, rz: 0.28, s0: 3.0 * as, s1: 8.6 * as, life: 0.46 * sc, spinSpeed: 5.4, shaderMode: 2, darkCore: true,
        });
        ctx.spawnSlash({
          x: cx, y: cy + 1.35, z: cz, color: '#e0f2fe', coreColor: '#38bdf8',
          rx: -0.14, ry: Math.PI, rz: -0.28, s0: 3.0 * as, s1: 8.6 * as, life: 0.46 * sc, spinSpeed: -5.4, shaderMode: 2, darkCore: true,
        });
        pts.forEach((n) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.65, n.z, '#38bdf8', '#e0f2fe', 6);
          ctx.spawnSparks(n.x, n.y + 0.75, n.z, '#e0f2fe', '#38bdf8', 8, 6.6);
        });
      });
      break;
    }

    case 'halcyon-twins': {
      // 2. HALCYON TWINS: Orbital Barrage Overdrive (4 Rail-Pillars + Laser Grid + 24-32 Cross-Fire Salvo + 4 Orbs -> TRIPLE Celestial Beams!)
      ctx.hooks.onArenaDim?.(0.72, '#041326', 1.06 * sc);
      ctx.spawnHalcyonSeal({ x: cx, y: cy + 0.08, z: cz, s0: 2.2 * as, s1: 9.8 * as, life: 1.24 * sc });

      const slashAngles = [0.35, -0.35, 0.75, -0.75];
      slashAngles.forEach((rz, idx) => {
        ctx.after(idx * 0.065 * sc, () => {
          ctx.spawnSlash({
            x: cx + (idx % 2 === 0 ? -0.7 : 0.7) * as,
            y: cy + 1.15 + idx * 0.1,
            z: cz,
            color: idx % 2 === 0 ? '#22d3ee' : '#fde047',
            coreColor: idx % 2 === 0 ? '#fde047' : '#ffffff',
            rx: idx % 2 === 0 ? 0.38 : -0.38,
            ry: idx * 0.9,
            rz,
            s0: 2.0 * as,
            s1: 6.2 * as,
            life: 0.32 * sc,
            spinSpeed: (idx % 2 === 0 ? 1 : -1) * 5.2,
            shaderMode: 3,
          });
        });
      });

      const pillarCrowns = ctx.spawnHalcyonRailPillars({ cx, cy, cz, areaScale: as, life: 1.12 * sc });
      ctx.after(0.14 * sc, () => {
        if (pillarCrowns.length >= 4) {
          ctx.spawnLightning(pillarCrowns[0], pillarCrowns[3], '#22d3ee', 0.16, 0.28 * sc);
          ctx.spawnLightning(pillarCrowns[1], pillarCrowns[2], '#fde047', 0.16, 0.28 * sc);
          ctx.spawnLightning(pillarCrowns[0], pillarCrowns[1], '#fde047', 0.13, 0.24 * sc);
          ctx.spawnLightning(pillarCrowns[2], pillarCrowns[3], '#22d3ee', 0.13, 0.24 * sc);
          ctx.spawnLightning(pillarCrowns[0], pillarCrowns[2], '#22d3ee', 0.13, 0.24 * sc);
          ctx.spawnLightning(pillarCrowns[1], pillarCrowns[3], '#fde047', 0.13, 0.24 * sc);
        }

        // 4 Energy Orbs racing from pillars straight into pit center
        const apexCenter = new THREE.Vector3(cx, cy + 0.55, cz);
        pillarCrowns.forEach((pOrigin, i) => {
          ctx.spawnOrb({
            p0: pOrigin.clone(),
            p1: apexCenter,
            color: i % 2 === 0 ? '#22d3ee' : '#fde047',
            coreColor: '#ffffff',
            trailColor: i % 2 === 0 ? '#38bdf8' : '#facc15',
            s0: 0.45 * as,
            s1: 0.95 * as,
            life: 0.34 * sc,
          });
        });

        // Rapid crossfire salvo from all 4 pillars
        const totalSalvo = 32;
        for (let k = 0; k < totalSalvo; k++) {
          const delay = Math.floor(k / 4) * 0.028 * sc;
          ctx.after(delay, () => {
            const isArrow = k % 2 === 0;
            const pIdx = k % pillarCrowns.length;
            const pOrigin = pillarCrowns[pIdx] ?? new THREE.Vector3(cx, cy + 3.0, cz);
            const targetNode = pts[k % pts.length];
            const wx = targetNode.x + ((k % 5) - 2) * 0.14 * as;
            const wz = targetNode.z + ((k % 3) - 1) * 0.14 * as;
            const wy = targetNode.y + (isArrow ? 0.65 : 0.78) * as;
            const cyanLead = (k + pIdx) % 2 === 0;

            ctx.spawnHalcyonRainWeapon({
              kind: isArrow ? 'arrow' : 'blade',
              fromVec: pOrigin.clone(),
              toVec: new THREE.Vector3(wx, wy, wz),
              color: cyanLead ? '#22d3ee' : '#fde047',
              accentColor: cyanLead ? '#fde047' : '#22d3ee',
              scale: (isArrow ? 1.18 : 1.08) * Math.max(0.75, as),
              life: 0.6 * sc,
              arriveFrac: 0.2,
              seed: (k * 0.37) % 1,
              onArrive: () => {
                if (k < pts.length || k % 3 === 0) {
                  ctx.spawnSparks(wx, cy + 0.35, wz, cyanLead ? '#22d3ee' : '#fde047', '#ffffff', 5, 5.8);
                }
              },
            });
          });
        }
      });

      ctx.after(0.50 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 0.0, '#fde047', 0.062);
        ctx.hooks.onSpeedLines?.(1.0, 0.46);
        // Triple Orbital Celestial Beams (Center + Twin Flanks)
        ctx.spawnBeam({ x: cx, y: cy, z: cz, color: '#22d3ee', coreColor: '#fde047', radius: 1.55 * as, height: 1.24, life: 0.7 * sc });
        ctx.spawnBeam({ x: cx - 2.35 * as, y: cy, z: cz, color: '#fde047', coreColor: '#ffffff', radius: 0.92 * as, height: 1.12, life: 0.6 * sc });
        ctx.spawnBeam({ x: cx + 2.35 * as, y: cy, z: cz, color: '#fde047', coreColor: '#ffffff', radius: 0.92 * as, height: 1.12, life: 0.6 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: '#22d3ee', coreColor: '#fde047', s0: 0.9 * as, s1: 8.2 * as, yScale: 0.54, life: 0.58 * sc });
        for (let ring = 0; ring < 3; ring++) {
          ctx.after(ring * 0.06 * sc, () => {
            ctx.spawnQuad({
              tex: ctx.ringTex, x: cx, y: cy + 0.1 + ring * 0.12, z: cz,
              color: ring % 2 === 0 ? '#fde047' : '#22d3ee', s0: 1.0 * as, s1: (6.2 + ring * 1.8) * as,
              life: 0.34 * sc, flatFloor: true, alpha: 0.95,
            });
          });
        }
        pts.forEach((n, i) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.75, n.z, i % 2 === 0 ? '#22d3ee' : '#fde047', '#ffffff', 5);
          ctx.spawnSparks(n.x, n.y + 0.85, n.z, '#fde047', '#22d3ee', 8, 6.8);
        });
      });
      break;
    }

    case 'nocturne-twins': {
      // 3. NOCTURNE TWINS: Acheron Void Reality-Fracture Storm (Per-Node Slashes/Rifts + 6-8 Plunging Black/Silver Swords + Twin Abyssal Vortexes + Double Invert!)
      ctx.hooks.onArenaDim?.(0.88, '#030108', 1.15 * sc);
      ctx.spawnNocturneCrater({ x: cx, y: cy + 0.06, z: cz, s0: 2.0 * as, s1: 10.2 * as, life: 1.24 * sc });

      // Wave 1: Chained teleporting slashes & dimension rifts weaving across every ore target
      pts.forEach((n, idx) => {
        ctx.after(idx * 0.048 * sc, () => {
          const isWhite = idx % 2 === 0;
          ctx.spawnSlash({
            x: n.x, y: n.y + 0.95, z: n.z,
            color: isWhite ? '#f8fafc' : '#a855f7', coreColor: '#ffffff',
            rx: (isWhite ? 1 : -1) * 0.42, ry: idx * 1.15, rz: isWhite ? 0.36 : -0.36,
            s0: 1.5 * as, s1: 3.9 * as, life: 0.3 * sc, spinSpeed: (isWhite ? 1 : -1) * 5.6, shaderMode: 4,
          });
          ctx.spawnRift({
            x: n.x, y: n.y + 1.05, z: n.z,
            color: isWhite ? '#f8fafc' : '#a855f7', coreColor: '#ffffff',
            rz: isWhite ? 0.44 : -0.44, len: 4.5 * as, height: 0.88 * as, life: 0.62 * sc,
          });
          if (idx > 0) {
            const prev = pts[idx - 1];
            ctx.spawnLightning(
              new THREE.Vector3(prev.x, prev.y + 0.8, prev.z),
              new THREE.Vector3(n.x, n.y + 0.8, n.z),
              isWhite ? '#f8fafc' : '#a855f7', 0.14, 0.22 * sc
            );
          }
        });
      });

      // Wave 2: Opposing Black vs Silver Broadswords plunging into pit + Monolith Eclipse crest
      const swordSalvo = 8;
      for (let s = 0; s < swordSalvo; s++) {
        const isBlack = s % 2 === 1;
        const tgt = pts[s % pts.length];
        ctx.after((0.18 + Math.floor(s / 2) * 0.045) * sc, () => {
          ctx.spawnDirectedWeapon(
            s % 4 < 2 ? 'greatsword' : 'blade',
            new THREE.Vector3(cx + (isBlack ? -4.8 : 4.8) * as, cy + 6.6 + (s % 3) * 0.6, cz + ((s % 3) - 1) * 0.8),
            new THREE.Vector3(tgt.x, tgt.y + 0.25, tgt.z),
            isBlack ? '#18181b' : '#f8fafc',
            (s % 4 < 2 ? 1.32 : 1.45) * Math.max(0.75, as),
            0.22 * sc,
            () => ctx.spawnSparks(tgt.x, tgt.y + 0.45, tgt.z, isBlack ? '#a855f7' : '#f8fafc', '#ffffff', 4, 5.6)
          );
        });
      }

      ctx.spawnNocturneEclipseMonolith({
        cx, cy, cz, areaScale: as, life: 1.12 * sc,
        onSever: () => {
          // Wave 3 Climax: Double Invert Impact Frame + Twin Abyssal Vortexes + 4 Full-Screen X Rifts!
          ctx.hooks.onImpactFrame?.(1.0, 1.0, '#f8fafc', 0.068);
          ctx.hooks.onSpeedLines?.(1.0, 0.5);
          ctx.after(0.11 * sc, () => ctx.hooks.onImpactFrame?.(0.95, 1.0, '#a855f7', 0.048));

          ctx.spawnVortex({ x: cx - 1.4 * as, y: cy, z: cz, color: '#09090b', coreColor: '#a855f7', sx: 2.3 * as, sy: 2.1, spin: 10.5, life: 0.72 * sc });
          ctx.spawnVortex({ x: cx + 1.4 * as, y: cy, z: cz, color: '#f8fafc', coreColor: '#a855f7', sx: 2.3 * as, sy: 2.1, spin: -10.5, life: 0.72 * sc });

          const riftAngles = [0.26, -0.26, 0.64, -0.64];
          riftAngles.forEach((rz, ri) => {
            ctx.spawnRift({
              x: cx, y: cy + 1.55 + (ri % 2) * 0.25, z: cz,
              color: ri % 2 === 0 ? '#f8fafc' : '#a855f7', coreColor: '#ffffff',
              rz, len: 13.0 * as, height: 1.45 * as, life: 0.64 * sc,
            });
          });
          ctx.spawnSlash({
            x: cx, y: cy + 1.35, z: cz, color: '#f8fafc', coreColor: '#a855f7',
            rx: 0.16, ry: 0, rz: 0.28, s0: 3.1 * as, s1: 9.2 * as, life: 0.48 * sc, spinSpeed: 6.4, shaderMode: 4,
          });
          ctx.spawnSlash({
            x: cx, y: cy + 1.5, z: cz, color: '#18181b', coreColor: '#ffffff',
            rx: -0.16, ry: Math.PI, rz: -0.28, s0: 3.1 * as, s1: 9.2 * as, life: 0.48 * sc, spinSpeed: -6.4, shaderMode: 4,
          });
          pts.forEach((n, i) => {
            ctx.spawnDebrisBurst(n.x, n.y + 0.7, n.z, i % 2 === 0 ? '#09090b' : '#f8fafc', '#a855f7', 6);
            ctx.spawnSparks(n.x, n.y + 0.85, n.z, '#f8fafc', '#a855f7', 9, 7.2);
          });
        },
      });
      break;
    }

    case 'lullaby-twins': {
      // 4. LULLABY TWINS: Starlight Music-Box Crescendo (4 Mode-5 Arcs + Wind-Up Shrine + 4 Sonic Shockwaves + 16 Chime Rain + Resonance Vortex + 12 Crystal Burst!)
      ctx.hooks.onArenaDim?.(0.76, '#0c051d', 1.08 * sc);
      ctx.spawnLullabySeal({ x: cx, y: cy + 0.08, z: cz, s0: 2.1 * as, s1: 9.8 * as, life: 1.28 * sc });

      for (let pass = 0; pass < 4; pass++) {
        ctx.after(pass * 0.065 * sc, () => {
          const tgt = pts[pass % pts.length];
          ctx.spawnSlash({
            x: tgt.x, y: tgt.y + 0.95 + (pass % 2) * 0.2, z: tgt.z,
            color: pass % 2 === 0 ? '#f472b6' : '#38bdf8', coreColor: '#fef08a',
            rx: (pass % 2 === 0 ? 1 : -1) * 0.36, ry: pass * 1.35, rz: pass % 2 === 0 ? 0.38 : -0.38,
            s0: 1.6 * as, s1: 4.3 * as, life: 0.32 * sc, spinSpeed: (pass % 2 === 0 ? 1 : -1) * 5.2, shaderMode: 5,
          });
        });
      }

      for (let wave = 0; wave < 4; wave++) {
        ctx.after((0.14 + wave * 0.11) * sc, () => {
          ctx.spawnQuad({
            tex: ctx.ringTex, x: cx, y: cy + 0.14 + wave * 0.22, z: cz,
            color: wave % 2 === 0 ? '#f472b6' : '#38bdf8', s0: 1.1 * as, s1: (5.6 + wave * 1.3) * as,
            life: 0.38 * sc, flatFloor: true, alpha: 0.95,
          });
        });
      }

      const chimeCount = 16;
      for (let k = 0; k < chimeCount; k++) {
        ctx.after((0.14 + Math.floor(k / 3) * 0.048) * sc, () => {
          const tgt = pts[k % pts.length];
          const ang = (k / chimeCount) * Math.PI * 2;
          const from = new THREE.Vector3(cx + Math.cos(ang) * 3.1 * as, cy + 6.0, cz + Math.sin(ang) * 2.1 * as);
          const to = new THREE.Vector3(tgt.x, tgt.y + 0.32, tgt.z);
          ctx.spawnDirectedWeapon(
            k % 2 === 0 ? 'crystal' : 'arrow', from, to,
            k % 2 === 0 ? '#f472b6' : '#38bdf8',
            1.12 * Math.max(0.75, as), 0.22 * sc,
            () => ctx.spawnSparks(to.x, to.y + 0.28, to.z, '#f472b6', '#38bdf8', 5, 5.2)
          );
        });
      }

      ctx.after(0.16 * sc, () => {
        ctx.spawnLullabyMirrorMoonCataclysm({
          cx, cy, cz, areaScale: as, lockDur: 0.44 * sc, shatterDur: 0.5 * sc,
          onMoonStrike: () => ctx.spawnSparks(cx, cy + 2.0, cz, '#f472b6', '#fef08a', 12, 6.8),
          onShatter: () => {
            ctx.hooks.onImpactFrame?.(1.0, 1.0, '#f472b6', 0.068);
            ctx.hooks.onSpeedLines?.(1.0, 0.48);
            ctx.spawnVortex({ x: cx, y: cy, z: cz, color: '#f472b6', coreColor: '#38bdf8', sx: 2.7 * as, sy: 2.15, spin: 9.0, life: 0.68 * sc });
            ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: '#f472b6', coreColor: '#ffffff', s0: 0.9 * as, s1: 8.0 * as, yScale: 0.58, life: 0.58 * sc });
            ctx.spawnDome({ x: cx, y: cy + 0.04, z: cz, color: '#38bdf8', coreColor: '#fbcfe8', s0: 0.65 * as, s1: 6.4 * as, yScale: 0.64, life: 0.5 * sc });

            const petalCrystals = 12;
            for (let c = 0; c < petalCrystals; c++) {
              const ringIdx = Math.floor(c / 6);
              const ang = (c / 6) * Math.PI * 2 + ringIdx * 0.52;
              const dist = (2.8 + ringIdx * 1.2) * as;
              ctx.spawnWeapon({
                kind: 'crystal', color: c % 2 === 0 ? '#f472b6' : '#38bdf8', coreColor: '#ffffff',
                startPos: new THREE.Vector3(cx, cy + 1.85, cz),
                endPos: new THREE.Vector3(cx + Math.cos(ang) * dist, cy + 0.6 + (c % 2) * 0.5, cz + Math.sin(ang) * dist * 0.72),
                startRot: new THREE.Euler(0.4, ang, 0),
                endRot: new THREE.Euler(0.4, ang + Math.PI * 2, Math.PI),
                scale: (1.08 + (c % 2) * 0.22) * as, mode: 'swing', life: (0.48 + ringIdx * 0.08) * sc,
              });
            }
            pts.forEach((n, i) => {
              ctx.spawnDebrisBurst(n.x, n.y + 0.8, n.z, i % 2 === 0 ? '#f472b6' : '#38bdf8', '#fef08a', 6);
              ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#f472b6', '#38bdf8', 9, 7.0);
            });
          },
        });
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
