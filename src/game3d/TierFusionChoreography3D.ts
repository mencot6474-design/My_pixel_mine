import * as THREE from 'three';
import {
  getRaritySecondaryColor,
  resolvePitBounds,
  type TierAttackFireOpts,
} from './TierMotionPath3D';
import type { TierVfxChoreoContext } from './TierVfxChoreography3D';

/**
 * Executes bespoke GLSL shader & 3D mesh choreography for each of the 5 Synchro Fusion Chibis.
 */
export function fireFusionChibiChoreography(
  ctx: TierVfxChoreoContext,
  opts: TierAttackFireOpts
): void {
  const color = opts.colorHex;
  const secondary = opts.secondaryHex ?? getRaritySecondaryColor(opts.rarity);
  const { cx, cy, cz, pts } = resolvePitBounds(opts.allTargets ?? [], opts.target, opts.wideCenter);
  const sc = Math.max(0.55, Math.min(1.15, opts.speedScale ?? 1.0));
  const as = Math.max(0.45, Math.min(1.2, opts.areaScale ?? 1.0));

  switch (opts.chibiId) {
    case 'glitch-cheshire': {
      // 1. GLITCH CHESHIRE: Cyber-Matrix Grin Floor Seal + 3-Claw Glitch Slashes (Mode 7) + 6 Cyber Holo Cards
      ctx.hooks.onArenaDim?.(0.68, '#09031c', 0.92 * sc);
      ctx.spawnFusionSeal({
        variant: 'glitch-cheshire',
        x: cx,
        y: cy + 0.08,
        z: cz,
        s0: 2.0 * as,
        s1: 9.2 * as,
        life: 1.15 * sc,
      });

      const clawAngles = [
        { rx: 0.28, ry: 0.25, rz: 0.36, spin: 5.2, c: '#22d3ee', core: '#d946ef' },
        { rx: -0.26, ry: Math.PI - 0.3, rz: -0.34, spin: -5.2, c: '#d946ef', core: '#22d3ee' },
        { rx: 0.44, ry: 0.72, rz: 0.42, spin: 5.6, c: '#22d3ee', core: '#ffffff' },
      ];
      clawAngles.forEach((sl, idx) => {
        ctx.after(idx * 0.1 * sc, () => {
          ctx.spawnSlash({
            x: cx + (idx - 1) * 0.35 * as,
            y: cy + 1.15 + idx * 0.14,
            z: cz,
            color: sl.c,
            coreColor: sl.core,
            rx: sl.rx,
            ry: sl.ry,
            rz: sl.rz,
            s0: 2.1 * as,
            s1: 6.4 * as,
            life: 0.34 * sc,
            spinSpeed: sl.spin,
            shaderMode: 7,
          });
        });
      });

      const cardCount = 6;
      for (let k = 0; k < cardCount; k++) {
        const tgt = pts[k % pts.length];
        const ang = (k / cardCount) * Math.PI * 2;
        const from = new THREE.Vector3(cx + Math.cos(ang) * 3.4 * as, cy + 2.8, cz + Math.sin(ang) * 2.2 * as);
        const to = new THREE.Vector3(tgt.x, tgt.y + 0.65, tgt.z);
        ctx.after((0.12 + k * 0.05) * sc, () => {
          ctx.spawnFusionProp({
            variant: 'glitch-cheshire',
            mode: 'hover',
            startPos: from,
            endPos: to,
            startRot: new THREE.Euler(0.25, ang, 0),
            endRot: new THREE.Euler(0.15, ang + Math.PI * 1.5, 0.2),
            scale: 1.35 * Math.max(0.75, as),
            life: 0.56 * sc,
            spinY: 7.5,
            seed: k * 0.41,
            onArrive: () => {
              ctx.spawnLightning(from, to, k % 2 === 0 ? '#22d3ee' : '#d946ef', 0.12, 0.18 * sc);
              ctx.spawnSparks(to.x, to.y, to.z, '#22d3ee', '#d946ef', 5, 5.4);
            },
          });
        });
      }

      ctx.after(0.52 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, '#d946ef', 0.054);
        ctx.hooks.onSpeedLines?.(0.95, 0.4);
        ctx.spawnRift({ x: cx, y: cy + 1.45, z: cz, color: '#22d3ee', coreColor: '#d946ef', rz: 0.3, len: 11.4 * as, height: 1.35 * as, life: 0.56 * sc });
        ctx.spawnRift({ x: cx, y: cy + 1.45, z: cz, color: '#d946ef', coreColor: '#ffffff', rz: -0.3, len: 11.4 * as, height: 1.35 * as, life: 0.56 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#22d3ee', coreColor: '#d946ef', s0: 0.85 * as, s1: 7.0 * as, yScale: 0.56, life: 0.52 * sc });
        pts.forEach((n) => ctx.spawnDebrisBurst(n.x, n.y + 0.6, n.z, '#22d3ee', '#d946ef', 4));
      });
      break;
    }

    case 'thorn-maiden': {
      // 2. THORN MAIDEN: Stained-Glass Crimson Rose Mandala + Spiral Thorn Lances + Rose-Thorn Slashes (Mode 8)
      ctx.hooks.onArenaDim?.(0.72, '#1f030b', 0.96 * sc);
      ctx.spawnFusionSeal({
        variant: 'thorn-maiden',
        x: cx,
        y: cy + 0.08,
        z: cz,
        s0: 2.1 * as,
        s1: 9.4 * as,
        life: 1.18 * sc,
      });

      const lanceCount = 8;
      for (let k = 0; k < lanceCount; k++) {
        const tgt = pts[k % pts.length];
        const ang = (k / lanceCount) * Math.PI * 2;
        const sx = tgt.x + Math.cos(ang) * 0.45 * as;
        const sz = tgt.z + Math.sin(ang) * 0.35 * as;
        const tilt = 0.28;
        const rot = new THREE.Euler(Math.sin(ang) * tilt, ang, -Math.cos(ang) * tilt);
        ctx.after(k * 0.042 * sc, () => {
          ctx.spawnFusionProp({
            variant: 'thorn-maiden',
            mode: 'erupt',
            startPos: new THREE.Vector3(sx, tgt.y - 1.15, sz),
            endPos: new THREE.Vector3(sx, tgt.y + 0.02, sz),
            startRot: rot,
            endRot: rot,
            scale: (1.8 + (k % 2) * 0.45) * Math.max(0.75, as),
            life: 0.72 * sc,
            seed: k * 0.33,
          });
          ctx.spawnSlash({
            x: tgt.x,
            y: tgt.y + 0.9,
            z: tgt.z,
            color: k % 2 === 0 ? '#f43f5e' : '#fb7185',
            coreColor: '#ffffff',
            rx: (k % 2 === 0 ? 1 : -1) * 0.36,
            ry: ang,
            rz: 0.34,
            s0: 1.4 * as,
            s1: 3.3 * as,
            life: 0.32 * sc,
            spinSpeed: k % 2 === 0 ? 4.8 : -4.8,
            shaderMode: 8,
          });
        });
      }

      ctx.after(0.48 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 0.0, '#f43f5e', 0.056);
        ctx.hooks.onSpeedLines?.(1.0, 0.42);
        // Colossal Empress Crimson Thorn Lance right through center
        ctx.spawnFusionProp({
          variant: 'thorn-maiden',
          mode: 'erupt',
          startPos: new THREE.Vector3(cx, cy - 1.8, cz),
          endPos: new THREE.Vector3(cx, cy + 0.05, cz),
          scale: 3.1 * Math.max(0.75, as),
          life: 0.68 * sc,
        });
        ctx.spawnSlash({
          x: cx, y: cy + 1.35, z: cz, color: '#f43f5e', coreColor: '#ffe4e6',
          rx: 0.16, ry: 0.2, rz: -0.32, s0: 2.8 * as, s1: 8.2 * as, life: 0.44 * sc, spinSpeed: 5.0, shaderMode: 8,
        });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#f43f5e', coreColor: '#fb7185', s0: 0.9 * as, s1: 7.4 * as, yScale: 0.56, life: 0.54 * sc });
        pts.forEach((n) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.65, n.z, '#f43f5e', '#881337', 5);
          ctx.spawnSparks(n.x, n.y + 0.85, n.z, '#fb7185', '#ffffff', 7, 6.2);
        });
      });
      break;
    }

    case 'monochrome-saint': {
      // 3. MONOCHROME SAINT: Sumi-e Sanctuary Floor Seal + Plunging Judgement Obelisks + Calligraphy Slashes (Mode 9)
      ctx.hooks.onArenaDim?.(0.78, '#040406', 0.98 * sc);
      ctx.spawnFusionSeal({
        variant: 'monochrome-saint',
        x: cx,
        y: cy + 0.08,
        z: cz,
        s0: 2.1 * as,
        s1: 9.2 * as,
        life: 1.18 * sc,
      });

      const obeliskTargets = pts.slice(0, 5);
      obeliskTargets.forEach((n, idx) => {
        ctx.after(idx * 0.065 * sc, () => {
          ctx.spawnSlash({
            x: n.x,
            y: n.y + 1.0,
            z: n.z,
            color: idx % 2 === 0 ? '#f8fafc' : '#94a3b8',
            coreColor: '#ffffff',
            rx: idx % 2 === 0 ? 0.38 : -0.38,
            ry: idx * 1.15,
            rz: idx % 2 === 0 ? 0.4 : -0.4,
            s0: 1.6 * as,
            s1: 3.9 * as,
            life: 0.34 * sc,
            spinSpeed: (idx % 2 === 0 ? 1 : -1) * 5.0,
            shaderMode: 9,
          });
          ctx.spawnFusionProp({
            variant: 'monochrome-saint',
            mode: 'plunge',
            startPos: new THREE.Vector3(n.x, n.y + 7.2, n.z),
            endPos: new THREE.Vector3(n.x, n.y + 0.12, n.z),
            scale: 1.65 * Math.max(0.75, as),
            life: 0.7 * sc,
            seed: idx * 0.5,
            onArrive: () => {
              ctx.spawnQuad({ tex: ctx.ringTex, x: n.x, y: n.y + 0.16, z: n.z, color: '#f8fafc', s0: 0.5, s1: 3.2 * as, life: 0.34 * sc, flatFloor: true });
              ctx.spawnSparks(n.x, n.y + 0.6, n.z, '#f8fafc', '#18181b', 6, 5.6);
            },
          });
        });
      });

      ctx.after(0.46 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, '#f8fafc', 0.064);
        ctx.hooks.onSpeedLines?.(1.0, 0.45);
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#09090b', coreColor: '#f8fafc', s0: 0.9 * as, s1: 7.8 * as, yScale: 0.56, life: 0.56 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#f8fafc', coreColor: '#94a3b8', s0: 0.65 * as, s1: 6.0 * as, yScale: 0.64, life: 0.48 * sc });
        ctx.spawnSlash({
          x: cx, y: cy + 1.4, z: cz, color: '#f8fafc', coreColor: '#ffffff',
          rx: 0.15, ry: 0, rz: 0.25, s0: 3.0 * as, s1: 8.6 * as, life: 0.46 * sc, spinSpeed: 5.2, shaderMode: 9,
        });
        pts.forEach((n) => ctx.spawnDebrisBurst(n.x, n.y + 0.7, n.z, '#09090b', '#f8fafc', 5));
      });
      break;
    }

    case 'prism-seraph': {
      // 4. PRISM SERAPH: Rainbow Diamond Refraction Floor Seal + Faceted Prism Octahedrons + Spectral Slashes (Mode 10)
      ctx.hooks.onArenaDim?.(0.68, '#061529', 0.95 * sc);
      ctx.spawnFusionSeal({
        variant: 'prism-seraph',
        x: cx,
        y: cy + 0.08,
        z: cz,
        s0: 2.1 * as,
        s1: 9.4 * as,
        life: 1.18 * sc,
      });

      const prismCount = 6;
      const apexCenter = new THREE.Vector3(cx, cy + 1.1, cz);
      for (let k = 0; k < prismCount; k++) {
        const ang = (k / prismCount) * Math.PI * 2;
        const px = cx + Math.cos(ang) * 3.1 * as;
        const pz = cz + Math.sin(ang) * 2.1 * as;
        const start = new THREE.Vector3(px, cy + 4.4, pz);
        const hover = new THREE.Vector3(px, cy + 1.45, pz);
        ctx.after(k * 0.055 * sc, () => {
          ctx.spawnFusionProp({
            variant: 'prism-seraph',
            mode: 'hover',
            startPos: start,
            endPos: hover,
            scale: 1.35 * Math.max(0.75, as),
            life: 0.72 * sc,
            spinY: 3.8,
            seed: k * 0.65,
            onArrive: () => {
              ctx.spawnLightning(hover, apexCenter, k % 2 === 0 ? '#facc15' : '#38bdf8', 0.14, 0.24 * sc);
              ctx.spawnSlash({
                x: px, y: cy + 1.0, z: pz, color: '#facc15', coreColor: '#38bdf8',
                rx: 0.34, ry: ang, rz: 0.32, s0: 1.3 * as, s1: 3.2 * as, life: 0.3 * sc, spinSpeed: 4.5, shaderMode: 10,
              });
            },
          });
        });
      }

      ctx.after(0.46 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 0.0, '#38bdf8', 0.058);
        ctx.hooks.onSpeedLines?.(1.0, 0.44);
        ctx.spawnBeam({ x: cx, y: cy + 0.08, z: cz, color: '#38bdf8', coreColor: '#facc15', radius: 1.35 * as, height: 1.18, life: 0.68 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#facc15', coreColor: '#38bdf8', s0: 0.85 * as, s1: 7.4 * as, yScale: 0.56, life: 0.56 * sc });
        ctx.spawnSlash({
          x: cx, y: cy + 1.35, z: cz, color: '#facc15', coreColor: '#38bdf8',
          rx: 0.2, ry: 0.35, rz: -0.28, s0: 2.9 * as, s1: 8.4 * as, life: 0.44 * sc, spinSpeed: 5.2, shaderMode: 10,
        });
        pts.forEach((n) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.7, n.z, '#facc15', '#38bdf8', 5);
          ctx.spawnSparks(n.x, n.y + 0.85, n.z, '#facc15', '#38bdf8', 8, 6.4);
        });
      });
      break;
    }

    case 'aether-monarch': {
      // 5. AETHER MONARCH: Imperial Nexus Astrolabe Seal + Sovereign 3D Crown Descent + Aether Decree Slashes (Mode 11)
      ctx.hooks.onArenaDim?.(0.76, '#0d061f', 1.02 * sc);
      ctx.spawnFusionSeal({
        variant: 'aether-monarch',
        x: cx,
        y: cy + 0.08,
        z: cz,
        s0: 2.2 * as,
        s1: 9.8 * as,
        life: 1.24 * sc,
      });

      // Sovereign Imperial Crown descending above center of pit
      ctx.spawnFusionProp({
        variant: 'aether-monarch',
        mode: 'crown',
        startPos: new THREE.Vector3(cx, cy + 6.4, cz),
        endPos: new THREE.Vector3(cx, cy + 2.65, cz),
        scale: 1.85 * Math.max(0.78, as),
        life: 1.05 * sc,
        spinY: 1.85,
        onArrive: () => {
          ctx.spawnSparks(cx, cy + 2.65, cz, '#fbbf24', '#22d3ee', 10, 6.5);
        },
      });

      pts.forEach((n, idx) => {
        ctx.after(idx * 0.055 * sc, () => {
          const c = idx % 2 === 0 ? '#fbbf24' : '#22d3ee';
          ctx.spawnSlash({
            x: n.x, y: n.y + 1.0, z: n.z, color: '#fbbf24', coreColor: '#22d3ee',
            rx: (idx % 2 === 0 ? 1 : -1) * 0.36, ry: idx * 1.1, rz: 0.32,
            s0: 1.5 * as, s1: 3.6 * as, life: 0.34 * sc, spinSpeed: (idx % 2 === 0 ? 1 : -1) * 4.8, shaderMode: 11,
          });
          ctx.spawnDirectedWeapon(
            'spear',
            new THREE.Vector3(cx, cy + 2.65, cz),
            new THREE.Vector3(n.x, n.y + 0.35, n.z),
            c,
            1.45 * Math.max(0.75, as),
            0.22 * sc
          );
        });
      });

      ctx.after(0.46 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, '#fbbf24', 0.062);
        ctx.hooks.onSpeedLines?.(1.0, 0.48);
        ctx.spawnBeam({ x: cx, y: cy + 0.08, z: cz, color: '#fbbf24', coreColor: '#22d3ee', radius: 1.5 * as, height: 1.24, life: 0.72 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#fbbf24', coreColor: '#ffffff', s0: 0.9 * as, s1: 8.2 * as, yScale: 0.56, life: 0.58 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#22d3ee', coreColor: '#fbbf24', s0: 0.65 * as, s1: 6.4 * as, yScale: 0.64, life: 0.5 * sc });
        ctx.spawnSlash({
          x: cx, y: cy + 1.35, z: cz, color: '#fbbf24', coreColor: '#22d3ee',
          rx: 0.14, ry: 0, rz: 0.24, s0: 3.1 * as, s1: 8.8 * as, life: 0.46 * sc, spinSpeed: 5.4, shaderMode: 11,
        });
        pts.forEach((n) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.8, n.z, '#fbbf24', '#22d3ee', 6);
          ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#fbbf24', '#22d3ee', 9, 7.0);
        });
      });
      break;
    }

    case 'chrono-crystallis': {
      // 6. CHRONO CRYSTALLIS: Time-Crystal Clockwork Floor Seal + Hovering Gear-Crystal Spires + Azure-Gold Slashes (Mode 11)
      ctx.hooks.onArenaDim?.(0.76, '#041224', 1.02 * sc);
      ctx.spawnFusionSeal({
        variant: 'chrono-crystallis',
        x: cx,
        y: cy + 0.16,
        z: cz,
        s0: 2.2 * as,
        s1: 9.8 * as,
        life: 1.24 * sc,
      });

      const spireCount = 6;
      const apexCenter = new THREE.Vector3(cx, cy + 1.3, cz);
      for (let k = 0; k < spireCount; k++) {
        const ang = (k / spireCount) * Math.PI * 2 + 0.25;
        const px = cx + Math.cos(ang) * 3.15 * as;
        const pz = cz + Math.sin(ang) * 2.15 * as;
        const start = new THREE.Vector3(px, cy + 5.2, pz);
        const hover = new THREE.Vector3(px, cy + 1.55, pz);
        ctx.after(k * 0.055 * sc, () => {
          ctx.spawnFusionProp({
            variant: 'chrono-crystallis',
            mode: 'hover',
            startPos: start,
            endPos: hover,
            scale: 1.45 * Math.max(0.76, as),
            life: 0.78 * sc,
            spinY: k % 2 === 0 ? 3.4 : -3.4,
            seed: k * 0.7,
            onArrive: () => {
              ctx.spawnLightning(hover, apexCenter, k % 2 === 0 ? '#38bdf8' : '#fbbf24', 0.15, 0.24 * sc);
              ctx.spawnSlash({
                x: px, y: cy + 1.15, z: pz, color: '#38bdf8', coreColor: '#fbbf24',
                rx: 0.32, ry: ang, rz: 0.28, s0: 1.35 * as, s1: 3.3 * as, life: 0.32 * sc, spinSpeed: 4.8, shaderMode: 11,
              });
            },
          });
        });
      }

      ctx.after(0.46 * sc, () => {
        ctx.hooks.onImpactFrame?.(1.0, 1.0, '#38bdf8', 0.062);
        ctx.hooks.onSpeedLines?.(1.0, 0.48);
        ctx.spawnBeam({ x: cx, y: cy + 0.08, z: cz, color: '#38bdf8', coreColor: '#fbbf24', radius: 1.48 * as, height: 1.22, life: 0.72 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#38bdf8', coreColor: '#ffffff', s0: 0.9 * as, s1: 8.1 * as, yScale: 0.56, life: 0.58 * sc });
        ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color: '#fbbf24', coreColor: '#38bdf8', s0: 0.65 * as, s1: 6.3 * as, yScale: 0.64, life: 0.50 * sc });
        ctx.spawnSlash({
          x: cx, y: cy + 1.4, z: cz, color: '#38bdf8', coreColor: '#fbbf24',
          rx: 0.16, ry: 0.2, rz: -0.22, s0: 3.1 * as, s1: 8.8 * as, life: 0.46 * sc, spinSpeed: 5.4, shaderMode: 11,
        });
        pts.forEach((n) => {
          ctx.spawnDebrisBurst(n.x, n.y + 0.8, n.z, '#38bdf8', '#fbbf24', 6);
          ctx.spawnSparks(n.x, n.y + 0.9, n.z, '#38bdf8', '#fbbf24', 9, 7.0);
        });
      });
      break;
    }

    default: {
      // Fallback generic fusion strike
      ctx.hooks.onArenaDim?.(0.64, '#0b1024', 0.7);
      ctx.spawnDome({ x: cx, y: cy + 0.16, z: cz, color, coreColor: secondary, s0: 0.8 * as, s1: 6.2 * as, yScale: 0.58, life: 0.48 * sc });
      break;
    }
  }
}
