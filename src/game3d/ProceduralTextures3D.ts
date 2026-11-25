import * as THREE from 'three';
import { getActiveTextureAnisotropy } from './MeshHelpers3D';

const texCache = new Map<string, THREE.Texture>();

function finalizeTex(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = getActiveTextureAnisotropy();
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

/** Builds and caches a 2D procedural CanvasTexture, falling back to a 1x1 DataTexture in headless Node. */
export function paintCachedTexture(
  key: string,
  w: number,
  h: number,
  repeatX: number,
  repeatY: number,
  fallbackRgba: [number, number, number, number],
  paint: (ctx: CanvasRenderingContext2D) => void
): THREE.Texture {
  const hit = texCache.get(key);
  if (hit) return hit;

  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array(fallbackRgba), 1, 1, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    texCache.set(key, tex);
    return tex;
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) paint(ctx);
  const tex = finalizeTex(c, repeatX, repeatY);
  texCache.set(key, tex);
  return tex;
}

function mixHex(baseHex: string, tintHex: string, ratio: number): string {
  const c = new THREE.Color(baseHex);
  c.lerp(new THREE.Color(tintHex), ratio);
  return `#${c.getHexString()}`;
}

export function getCircularNexusPoolTexture(
  stoneHex: string,
  crystalHex: string,
  biomeKey = 'underground'
): THREE.Texture {
  return paintCachedTexture(
    `circular-nexus-pool-v3|${stoneHex}|${crystalHex}|${biomeKey}`,
    512,
    512,
    1,
    1,
    [8, 12, 22, 255],
    (ctx) => {
      // Deep dark-center pool for high Sakuga shader contrast + richer biome-colored outer sanctum ring
      const grad = ctx.createRadialGradient(256, 256, 16, 256, 256, 256);
      grad.addColorStop(0, mixHex('#101d38', crystalHex, 0.24));
      grad.addColorStop(0.45, mixHex('#0a1224', stoneHex, 0.18));
      grad.addColorStop(0.82, mixHex('#080d1a', stoneHex, 0.22));
      grad.addColorStop(1, '#040710');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle low-poly stone / rune floor facets
      ctx.strokeStyle = mixHex('#334155', stoneHex, 0.45);
      ctx.globalAlpha = 0.26;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(a) * 58, 256 + Math.sin(a) * 58);
        ctx.lineTo(256 + Math.cos(a) * 248, 256 + Math.sin(a) * 248);
        ctx.stroke();
      }

      // Sacred Colosseum concentric rings & glowing biome octagram
      ctx.strokeStyle = crystalHex;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 2.4;
      for (const r of [66, 126, 186, 236]) {
        ctx.beginPath();
        ctx.arc(256, 256, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Twin rotated squares (8-point Sanctum Seal)
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 2.2;
      for (const rotOff of [0, Math.PI / 4]) {
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) {
          const a = rotOff + (k * Math.PI) / 2;
          const px = 256 + Math.cos(a) * 184;
          const py = 256 + Math.sin(a) * 184;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Segmented outer sanctum alignment arcs & keystone ticks
      ctx.globalAlpha = 0.44;
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 8; i++) {
        const a0 = (i * Math.PI) / 4 + 0.08;
        ctx.beginPath();
        ctx.arc(256, 256, 214, a0, a0 + Math.PI / 4 - 0.16);
        ctx.stroke();
      }

      // World-specific subtle biome floor motif
      ctx.globalAlpha = 0.34;
      ctx.lineWidth = 2;
      if (biomeKey === 'magma') {
        ctx.strokeStyle = '#fb923c';
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10 + 0.2;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * 135, 256 + Math.sin(a) * 135);
          ctx.lineTo(256 + Math.cos(a + 0.14) * 195, 256 + Math.sin(a + 0.14) * 195);
          ctx.lineTo(256 + Math.cos(a - 0.06) * 242, 256 + Math.sin(a - 0.06) * 242);
          ctx.stroke();
        }
      } else if (biomeKey === 'starwell' || biomeKey === 'crystal') {
        ctx.strokeStyle = '#bae6fd';
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = 256 + Math.cos(a) * 156;
          const py = 256 + Math.sin(a) * 156;
          ctx.beginPath();
          ctx.moveTo(px - 10, py);
          ctx.lineTo(px + 10, py);
          ctx.moveTo(px, py - 10);
          ctx.lineTo(px, py + 10);
          ctx.stroke();
        }
      } else if (biomeKey === 'chrono') {
        ctx.strokeStyle = '#fde68a';
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI * 2) / 24;
          const r0 = i % 2 === 0 ? 196 : 204;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
          ctx.lineTo(256 + Math.cos(a) * 212, 256 + Math.sin(a) * 212);
          ctx.stroke();
        }
      } else if (biomeKey === 'solaris') {
        ctx.strokeStyle = '#fde047';
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI * 2) / 16;
          const rIn = i % 2 === 0 ? 148 : 168;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * rIn, 256 + Math.sin(a) * rIn);
          ctx.lineTo(256 + Math.cos(a) * 224, 256 + Math.sin(a) * 224);
          ctx.stroke();
        }
      } else if (biomeKey === 'elysium') {
        ctx.strokeStyle = '#e879f9';
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const px = 256 + Math.cos(a) * 164;
          const py = 256 + Math.sin(a) * 164;
          ctx.beginPath();
          ctx.ellipse(px, py, 24, 10, a, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (biomeKey === 'nightmare') {
        ctx.strokeStyle = '#c084fc';
        for (let r = 136; r <= 196; r += 20) {
          ctx.beginPath();
          ctx.arc(256, 256, r, 0, Math.PI * 1.65);
          ctx.stroke();
        }
        ctx.strokeStyle = '#f43f5e';
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * 164, 256 + Math.sin(a) * 164);
          ctx.lineTo(256 + Math.cos(a + 0.08) * 218, 256 + Math.sin(a + 0.08) * 218);
          ctx.stroke();
        }
      } else if (biomeKey === 'singularity') {
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(256, 256, 152, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * 168, 256 + Math.sin(a) * 168);
          ctx.lineTo(256 + Math.cos(a) * 212, 256 + Math.sin(a) * 212);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  );
}

/** Sleek silver-titanium segmented tournament deck texture for the Cyber Sky-Stage rim. */
export function getCyberColosseumDeckTexture(
  accentHex = '#38bdf8',
  deckTintHex = '#64748b'
): THREE.Texture {
  return paintCachedTexture(
    `cyber-colosseum-deck-v3|${accentHex}|${deckTintHex}`,
    256,
    64,
    12,
    1,
    [56, 74, 102, 255],
    (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0.0, mixHex('#94a3b8', deckTintHex, 0.35));
      grad.addColorStop(0.5, mixHex('#475569', deckTintHex, 0.35));
      grad.addColorStop(1.0, mixHex('#334155', deckTintHex, 0.35));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 64);

      // Crisp clean armor plate seam lines & alloy trim
      ctx.fillStyle = 'rgba(248, 250, 252, 0.32)';
      for (let x = 0; x < 256; x += 64) {
        ctx.fillRect(x, 6, 3, 52);
      }
      ctx.fillRect(0, 31, 256, 2);

      // Bright stage light-bars & inner/outer neon rails
      ctx.fillStyle = accentHex;
      ctx.globalAlpha = 0.96;
      ctx.fillRect(0, 2, 256, 5);
      ctx.fillRect(0, 57, 256, 5);
      for (let x = 14; x < 256; x += 64) {
        ctx.fillRect(x, 18, 36, 6);
      }
      ctx.globalAlpha = 1;
    }
  );
}

function paintConcaveStar(
  ctx: CanvasRenderingContext2D,
  mid: number,
  outerR: number,
  innerR: number,
  rotationRad = 0
): void {
  ctx.save();
  ctx.translate(mid, mid);
  ctx.rotate(rotationRad);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Tapered asymmetric anime crescent slash with outer tintable glow and white-hot core. */
export function getDualSlashArcTexture(): THREE.Texture {
  return paintCachedTexture('vfx-dual-slash-v1', 256, 256, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const mid = 128;

    // Outer colored glow crescent (wide tapered sweep)
    ctx.save();
    ctx.translate(mid, mid);
    const outerGrad = ctx.createRadialGradient(0, 0, 44, 0, 0, 122);
    outerGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    outerGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.25)');
    outerGrad.addColorStop(0.68, 'rgba(255, 255, 255, 0.72)');
    outerGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.22)');
    outerGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 118, -Math.PI * 0.72, Math.PI * 0.28);
    ctx.arc(-18, 12, 92, Math.PI * 0.28, -Math.PI * 0.72, true);
    ctx.closePath();
    ctx.fill();

    // Inner razor-sharp white-hot blade ribbon
    const coreGrad = ctx.createRadialGradient(0, 0, 60, 0, 0, 114);
    coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    coreGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.65)');
    coreGrad.addColorStop(0.74, 'rgba(255, 255, 255, 1)');
    coreGrad.addColorStop(0.94, 'rgba(255, 255, 255, 0.3)');
    coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 110, -Math.PI * 0.66, Math.PI * 0.22);
    ctx.arc(-12, 8, 96, Math.PI * 0.22, -Math.PI * 0.66, true);
    ctx.closePath();
    ctx.fill();

    // Fine trailing energy wisps near arc apex
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(2, -2, 113, -Math.PI * 0.48, Math.PI * 0.08);
    ctx.stroke();
    ctx.restore();
  });
}

/** 4-point sharp anime impact cross star with diagonal needles and bright flash core. */
export function getHitSparkStarTexture(): THREE.Texture {
  return paintCachedTexture('vfx-hitspark-star-v1', 128, 128, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    const mid = 64;

    const halo = ctx.createRadialGradient(mid, mid, 2, mid, mid, 58);
    halo.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    halo.addColorStop(0.24, 'rgba(255, 255, 255, 0.72)');
    halo.addColorStop(0.6, 'rgba(255, 255, 255, 0.16)');
    halo.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    paintConcaveStar(ctx, mid, 60, 10, 0);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    paintConcaveStar(ctx, mid, 38, 5, Math.PI / 4);
  });
}

/** Crisp cyber-anime ground shockwave ring with radial energy streaks. */
export function getShockwaveRingTexture(): THREE.Texture {
  return paintCachedTexture('vfx-shockwave-ring-v1', 256, 256, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const mid = 128;

    const ringGrad = ctx.createRadialGradient(mid, mid, 58, mid, mid, 124);
    ringGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    ringGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.14)');
    ringGrad.addColorStop(0.72, 'rgba(255, 255, 255, 0.92)');
    ringGrad.addColorStop(0.86, 'rgba(255, 255, 255, 0.5)');
    ringGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(mid, mid, 124, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.1;
      const r0 = 76 + (i % 3) * 6;
      const r1 = 114 + (i % 2) * 7;
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
      ctx.lineTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
      ctx.stroke();
    }
  });
}

/** Compact 4-point wind-up glint flash for chibi anticipation frames. */
export function getWindupGlintTexture(): THREE.Texture {
  return paintCachedTexture('vfx-windup-glint-v1', 128, 128, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    const mid = 64;

    const glow = ctx.createRadialGradient(mid, mid, 2, mid, mid, 44);
    glow.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    glow.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
    glow.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    paintConcaveStar(ctx, mid, 56, 7, 0);
  });
}

/** Elongated diamond spark streak texture for directional hit burst particles. */
export function getSparkStreakTexture(): THREE.Texture {
  return paintCachedTexture('vfx-spark-streak-v1', 64, 128, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 64, 128);
    const grad = ctx.createRadialGradient(32, 64, 4, 32, 64, 58);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.78)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.lineTo(52, 64);
    ctx.lineTo(32, 124);
    ctx.lineTo(12, 64);
    ctx.closePath();
    ctx.fill();
  });
}

/** Cyber-arcane magic circle & circuit grid floor texture for the 3D Fusion World altar deck. */
export function getFusionMagicCircuitTexture(): THREE.Texture {
  return paintCachedTexture('fusion-magic-circuit-v1', 512, 512, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    const mid = 256;

    // Soft radial circuit glow base
    const glow = ctx.createRadialGradient(mid, mid, 24, mid, mid, 244);
    glow.addColorStop(0.0, 'rgba(255, 255, 255, 0.24)');
    glow.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
    glow.addColorStop(0.88, 'rgba(255, 255, 255, 0.22)');
    glow.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mid, mid, 244, 0, Math.PI * 2);
    ctx.fill();

    // Concentric circuit rings
    const radii = [74, 118, 168, 214, 236];
    for (let i = 0; i < radii.length; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = i === 3 ? 3.2 : 1.8;
      ctx.beginPath();
      ctx.arc(mid, mid, radii[i], 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dual rotated octagonal cyber-magic sigil frames
    for (let rot = 0; rot < 2; rot++) {
      const offset = rot * (Math.PI / 8);
      const r = rot === 0 ? 192 : 146;
      ctx.strokeStyle = rot === 0 ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let s = 0; s <= 8; s++) {
        const a = (s / 8) * Math.PI * 2 + offset;
        const x = mid + Math.cos(a) * r;
        const y = mid + Math.sin(a) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 16 radial circuit traces & terminal nodes
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r0 = i % 2 === 0 ? 74 : 118;
      const r1 = i % 2 === 0 ? 236 : 214;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
      ctx.lineTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
      ctx.stroke();

      // Circuit node dot
      const nx = mid + Math.cos(a) * 168;
      const ny = mid + Math.sin(a) * 168;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(nx, ny, i % 2 === 0 ? 4.2 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 32 outer rune tick marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * 218, mid + Math.sin(a) * 218);
      ctx.lineTo(mid + Math.cos(a) * 232, mid + Math.sin(a) * 232);
      ctx.stroke();
    }
  });
}

/** Summoning hexagram rune seal for AoE & tier attack anchors. */
export function getRuneSealTexture(): THREE.Texture {
  return paintCachedTexture('vfx-rune-seal-v1', 256, 256, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const m = 128;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m, m, 114, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(m, m, 98, 0, Math.PI * 2);
    ctx.stroke();

    for (let rot = 0; rot < 2; rot++) {
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * Math.PI * 2 + rot * (Math.PI / 3);
        const x = m + Math.cos(a) * 98;
        const y = m + Math.sin(a) * 98;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(m + Math.cos(a) * 100, m + Math.sin(a) * 100);
      ctx.lineTo(m + Math.cos(a) * 112, m + Math.sin(a) * 112);
      ctx.stroke();
    }
  });
}

/** Radial ground fracture fissures for lightning & meteor slams. */
export function getGroundCrackTexture(): THREE.Texture {
  return paintCachedTexture('vfx-ground-crack-v1', 256, 256, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const m = 128;
    const g = ctx.createRadialGradient(m, m, 2, m, m, 90);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    g.addColorStop(0.45, 'rgba(255, 255, 255, 0.2)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m, m, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    for (let arm = 0; arm < 7; arm++) {
      const baseA = (arm / 7) * Math.PI * 2;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(m, m);
      let cx = m;
      let cy = m;
      for (let s = 1; s <= 4; s++) {
        const a = baseA + (s % 2 === 0 ? 0.25 : -0.25);
        cx += Math.cos(a) * 24;
        cy += Math.sin(a) * 24;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  });
}

/** Soft additive flame/energy puff for meteor trails and orb wakes. */
export function getFlamePuffTexture(): THREE.Texture {
  return paintCachedTexture('vfx-flame-puff-v1', 128, 128, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    const m = 64;
    const g = ctx.createRadialGradient(m, m, 4, m, m, 56);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.4, 'rgba(255, 255, 255, 0.72)');
    g.addColorStop(0.75, 'rgba(255, 255, 255, 0.16)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m, m, 56, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Seamless glowing cyber-metropolis window grid facade for distant skyscrapers. */
export function getSkyscraperFacadeTexture(accentHex: string): THREE.Texture {
  const tex = paintCachedTexture(
    `sky-city-facade-v2|${accentHex}`,
    256,
    512,
    1,
    3,
    [16, 26, 46, 255],
    (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#182947');
      grad.addColorStop(0.55, '#0c162b');
      grad.addColorStop(1.0, '#060c18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);

      // Curtain-wall vertical mullions & sleek glass reflections
      ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
      for (const rx of [0, 62, 126, 190, 248]) {
        ctx.fillRect(rx, 0, 6, 512);
      }
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(16, 0, 34, 512);
      ctx.fillRect(142, 0, 28, 512);

      const rows = 28;
      const cols = 12;
      const rowH = 512 / rows;
      const colW = 256 / cols;
      for (let r = 0; r < rows; r++) {
        if (r % 7 === 2) {
          ctx.fillStyle = accentHex;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(6, r * rowH + rowH * 0.3, 244, 4);
          ctx.globalAlpha = 1;
          continue;
        }
        const floorSeed = (r * 37 + 11) % 10;
        for (let c = 0; c < cols; c++) {
          const hash = (r * 53 + c * 29 + 7) % 17;
          if (hash < 6) continue;
          const x = c * colW + 3.5;
          const y = r * rowH + 3.5;
          const w = colW - 7;
          const h = rowH - 7;
          if (hash >= 14 || (floorSeed === 3 && c % 3 === 0)) {
            ctx.fillStyle = accentHex;
            ctx.globalAlpha = 0.88;
          } else if (hash >= 11) {
            ctx.fillStyle = '#fde68a';
            ctx.globalAlpha = 0.72;
          } else {
            ctx.fillStyle = '#bae6fd';
            ctx.globalAlpha = 0.58;
          }
          ctx.fillRect(x, y, w, h);
        }
      }
      ctx.globalAlpha = 1;
    }
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Wide LED broadcast banner texture featuring top/bottom neon lines and MyChibiMine marquee text. */
export function getBroadcastBannerTexture(accentHex: string, feverActive = false): THREE.Texture {
  const key = `blimp-tv-banner-v2|${accentHex}|${feverActive ? 1 : 0}`;
  const tex = paintCachedTexture(key, 768, 224, 1, 1, [8, 14, 28, 255], (ctx) => {
    const W = 768;
    const H = 224;
    const barColor = feverActive ? '#fde047' : accentHex;
    const secondaryColor = feverActive ? '#fb7185' : '#38bdf8';

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0.0, '#040814');
    bg.addColorStop(0.5, '#0b1832');
    bg.addColorStop(1.0, '#040814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle LED pixel scanlines & diagonal cyber shimmer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let y = 28; y < H - 28; y += 6) {
      ctx.fillRect(0, y, W, 2);
    }

    // Thick top & bottom glowing banner rails + inner tech rules
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 14;
    ctx.fillRect(0, 10, W, 12);
    ctx.fillRect(0, H - 22, W, 12);
    ctx.shadowBlur = 0;

    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(0, 29, W, 3);
    ctx.fillRect(0, H - 32, W, 3);
    ctx.globalAlpha = 1;

    // Leading cyber chevrons (>>>)
    ctx.fillStyle = barColor;
    for (let i = 0; i < 3; i++) {
      const cx = 36 + i * 20;
      const cy = H * 0.51;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 16);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx - 8, cy + 16);
      ctx.lineTo(cx - 14, cy + 16);
      ctx.lineTo(cx - 2, cy);
      ctx.lineTo(cx - 14, cy - 16);
      ctx.closePath();
      ctx.fill();
    }

    // Seamless horizontally-wrapping "MyChibiMine" broadcast headline
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '900 72px "Fredoka", "Rubik", "Segoe UI", sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#030712';
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 20;
    ctx.strokeText('MyChibiMine', W * 0.45, H * 0.52);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MyChibiMine', W * 0.45, H * 0.52);
    ctx.shadowBlur = 0;

    // Trailing diamond emblem + LIVE / FEVER broadcast pill
    const tagX = W * 0.855;
    const tagY = H * 0.51;
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.moveTo(tagX - 66, tagY);
    ctx.lineTo(tagX - 54, tagY - 12);
    ctx.lineTo(tagX - 42, tagY);
    ctx.lineTo(tagX - 54, tagY + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = feverActive ? '#ef4444' : '#0284c7';
    ctx.fillRect(tagX - 28, tagY - 21, 96, 42);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tagX - 28, tagY - 21, 96, 42);

    ctx.font = '800 24px "Rubik", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(feverActive ? 'FEVER' : 'LIVE', tagX + 20, tagY + 2);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
