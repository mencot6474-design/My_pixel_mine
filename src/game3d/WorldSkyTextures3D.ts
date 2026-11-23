import * as THREE from 'three';
import type { MineWorldPalette } from './MineWorldPalette';
import { paintCachedTexture } from './ProceduralTextures3D';

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255),
  ];
}

function rgbaStr(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  return '#' + new THREE.Color(hexA).lerp(new THREE.Color(hexB), t).getHexString();
}

function paintSeamlessEllipse(
  ctx: CanvasRenderingContext2D,
  w: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colorInner: string
): void {
  for (const offsetX of [0, -w, w]) {
    const cx = x + offsetX;
    if (cx + rx < -40 || cx - rx > w + 40) continue;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
    g.addColorStop(0, colorInner);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function paintFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  len: number,
  color: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx - len, cy);
  ctx.lineTo(cx + len, cy);
  ctx.moveTo(cx, cy - len);
  ctx.lineTo(cx, cy + len);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.9, len * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintDistantOrbitalBackdrop(
  ctx: CanvasRenderingContext2D,
  moonX: number,
  moonY: number,
  accentRgb: [number, number, number],
  skyDarkRgb: [number, number, number]
): void {
  // Subtle sweeping 2D orbital megastructure arc painted on the far skybox (zero 3D hoop geometry)
  ctx.save();
  ctx.translate(moonX + 120, moonY + 135);
  ctx.rotate(-0.22);
  ctx.strokeStyle = rgbaStr(accentRgb, 0.14);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 310, 62, 0, Math.PI * 1.06, Math.PI * 1.94);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.18)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 316, 65, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.restore();

  // Soft outer lunar halo
  const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 92);
  halo.addColorStop(0, 'rgba(248, 250, 252, 0.32)');
  halo.addColorStop(0.42, rgbaStr(accentRgb, 0.18));
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 92, 0, Math.PI * 2);
  ctx.fill();

  // Crisp crescent cyber moon
  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
  ctx.fill();

  ctx.globalCompositeOperation = 'source-atop';
  ctx.beginPath();
  ctx.arc(moonX + 9, moonY - 5, 21, 0, Math.PI * 2);
  ctx.fillStyle = rgbaStr(skyDarkRgb, 0.88);
  ctx.fill();
  ctx.restore();
}

/**
 * Generates a cached 1024x512 Neo-Tokyo Twilight & Per-World Identity sky dome texture
 * with underlit cyberpunk clouds, 4-point anime stars, distant 2D orbital moon backdrop,
 * and horizon neon light-bleed tailored to each world's palette.
 */
export function getMiningSkyDomeTexture(palette: MineWorldPalette): THREE.Texture {
  const key = `mine-sky-v3|${palette.skyTop}|${palette.skyBottom}|${palette.fogColor}|${palette.crystalColor}`;
  const fallback = hexToRgb(lerpHex(palette.fogColor, '#162544', 0.45));
  return paintCachedTexture(key, 1024, 512, 1, 1, [fallback[0], fallback[1], fallback[2], 255], (ctx) => {
    const W = 1024;
    const H = 512;
    const zenithHex = lerpHex(palette.skyTop, '#070b1a', 0.62);
    const upperMidHex = lerpHex(palette.skyTop, '#0f172a', 0.36);
    const horizonTopHex = lerpHex(palette.fogColor, palette.crystalColor, 0.32);
    const horizonPeakHex = lerpHex(palette.skyBottom, palette.crystalColor, 0.42);
    const abyssHex = lerpHex(palette.fogColor, '#091124', 0.72);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, zenithHex);
    grad.addColorStop(0.24, upperMidHex);
    grad.addColorStop(0.43, lerpHex(horizonTopHex, '#162544', 0.38));
    grad.addColorStop(0.5, lerpHex(horizonPeakHex, '#1e293b', 0.25));
    grad.addColorStop(0.58, lerpHex(palette.fogColor, '#0f172a', 0.56));
    grad.addColorStop(0.76, abyssHex);
    grad.addColorStop(1.0, '#050814');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const crystalRgb = hexToRgb(palette.crystalColor);
    const fogRgb = hexToRgb(palette.fogColor);
    const zenithRgb = hexToRgb(zenithHex);

    // Horizon city light-bleed band behind SkyMetropolis3D skyline
    const horizonGlow = ctx.createLinearGradient(0, 200, 0, 292);
    horizonGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    horizonGlow.addColorStop(0.45, rgbaStr(crystalRgb, 0.22));
    horizonGlow.addColorStop(0.62, rgbaStr(fogRgb, 0.26));
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 200, W, 92);

    // Soft distant aurora ribbon in upper sky
    for (let i = 0; i < 6; i++) {
      const ax = i * 180 + 70;
      const ay = 112 + Math.sin(i * 1.35) * 18;
      paintSeamlessEllipse(ctx, W, ax, ay, 160, 28, rgbaStr(crystalRgb, 0.08));
    }

    // Crisp upper starfield & stylized 4-point anime sparkles
    for (let i = 0; i < 165; i++) {
      const sx = (i * 277 + 31) % W;
      const sy = 18 + ((i * 131 + 19) % 175);
      const r = i % 11 === 0 ? 1.55 : i % 4 === 0 ? 1.15 : 0.75;
      const alpha = i % 5 === 0 ? 0.85 : 0.55;
      ctx.fillStyle = i % 7 === 0 ? rgbaStr(crystalRgb, alpha) : `rgba(248, 250, 252, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 10; i++) {
      const sx = 64 + ((i * 197) % (W - 128));
      const sy = 38 + ((i * 73) % 128);
      paintFourPointStar(ctx, sx, sy, 3.6 + (i % 3) * 1.4, 'rgba(248, 250, 252, 0.78)');
    }

    // Distant crescent moon & faint 2D orbital arc in north-west sky (u ~ 0.68 aligns behind camera view)
    paintDistantOrbitalBackdrop(ctx, 700, 118, crystalRgb, zenithRgb);

    // Stylized anime clouds underlit by Neo-Tokyo neon horizon
    for (let i = 0; i < 13; i++) {
      const cx = (i * 83 + 22) % W;
      const cy = 166 + (i % 3) * 24;
      const rx = 95 + (i % 4) * 24;
      const ry = 20 + (i % 3) * 5;
      paintSeamlessEllipse(ctx, W, cx, cy - 6, rx, ry, rgbaStr(zenithRgb, 0.42));
      paintSeamlessEllipse(ctx, W, cx + 14, cy + 8, rx * 0.84, ry * 0.68, rgbaStr(crystalRgb, 0.19));
      paintSeamlessEllipse(ctx, W, cx - 18, cy + 4, rx * 0.6, ry * 0.45, 'rgba(248, 250, 252, 0.08)');
    }
  });
}

/**
 * Generates a cached 1024x512 Penacony-inspired Golden-Blue Hour sky dome texture
 * exclusively for the Plaza ('shop') district: royal indigo zenith, twilight violet,
 * golden-cyan horizon glow, sunlit pastel clouds, and crisp anime stars.
 */
export function getPlazaSkyDomeTexture(): THREE.Texture {
  return paintCachedTexture('plaza-sky-golden-blue-v1', 1024, 512, 1, 1, [45, 40, 84, 255], (ctx) => {
    const W = 1024;
    const H = 512;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, '#121338');
    grad.addColorStop(0.22, '#221f56');
    grad.addColorStop(0.37, '#4c2c7a');
    grad.addColorStop(0.46, '#9d4d8e');
    grad.addColorStop(0.51, '#f3a678');
    grad.addColorStop(0.56, '#7dd3fc');
    grad.addColorStop(0.68, '#1e325c');
    grad.addColorStop(1.0, '#0c1328');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Warm golden-cyan twilight horizon bloom
    const warmGlow = ctx.createRadialGradient(512, 260, 22, 512, 260, 360);
    warmGlow.addColorStop(0.0, 'rgba(254, 240, 138, 0.42)');
    warmGlow.addColorStop(0.32, 'rgba(251, 146, 60, 0.24)');
    warmGlow.addColorStop(0.68, 'rgba(103, 232, 249, 0.12)');
    warmGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, 120, W, 240);

    // Upper twilight starfield & 4-point sparkles
    for (let i = 0; i < 140; i++) {
      const sx = (i * 307 + 19) % W;
      const sy = 16 + ((i * 127 + 29) % 158);
      const r = i % 10 === 0 ? 1.45 : 0.85;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(254, 243, 199, 0.88)' : 'rgba(224, 242, 254, 0.72)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const sx = 54 + ((i * 179) % (W - 108));
      const sy = 32 + ((i * 61) % 116);
      paintFourPointStar(ctx, sx, sy, 3.8 + (i % 3) * 1.2, 'rgba(254, 249, 195, 0.85)');
    }

    // Distant crescent moon in upper-right twilight sky
    paintDistantOrbitalBackdrop(ctx, 790, 108, [253, 224, 71], [24, 21, 66]);

    // Sunlit Golden-Hour pastel cumulus cloud bands
    for (let i = 0; i < 14; i++) {
      const cx = (i * 77 + 36) % W;
      const cy = 164 + (i % 3) * 23;
      const rx = 104 + (i % 4) * 22;
      const ry = 21 + (i % 3) * 5;
      paintSeamlessEllipse(ctx, W, cx, cy - 5, rx, ry, 'rgba(56, 38, 96, 0.34)');
      paintSeamlessEllipse(ctx, W, cx + 18, cy + 7, rx * 0.82, ry * 0.65, 'rgba(253, 186, 116, 0.28)');
      paintSeamlessEllipse(ctx, W, cx - 10, cy + 3, rx * 0.52, ry * 0.44, 'rgba(254, 240, 138, 0.16)');
    }
  });
}

/** Computes harmonized scene fog/background hex matching the Mining or Plaza sky dome horizon. */
export function getHarmonizedWorldFogColor(
  palette: MineWorldPalette | undefined,
  fallbackHex: string | number,
  mode: 'mine' | 'shop'
): THREE.Color {
  if (mode === 'shop') {
    return new THREE.Color('#43386b');
  }
  const base = new THREE.Color(palette?.fogColor ?? fallbackHex);
  if (palette?.crystalColor) {
    base.lerp(new THREE.Color(palette.crystalColor), 0.16);
  }
  base.lerp(new THREE.Color(0x162544), 0.44);
  return base;
}
