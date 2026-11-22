import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';
import { getActiveTextureAnisotropy } from './MeshHelpers3D';

const texCache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

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
function paintCachedTexture(
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

export function getSkyDomeTexture(topHex: string, bottomHex: string): THREE.Texture {
  return paintCachedTexture(`sky2|${topHex}|${bottomHex}`, 64, 256, 1, 1, [15, 23, 42, 255], (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, topHex);
    grad.addColorStop(0.32, topHex);
    grad.addColorStop(0.49, bottomHex);
    grad.addColorStop(0.65, bottomHex);
    grad.addColorStop(1.0, topHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
  });
}

function paintSeamlessEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colorInner: string
): void {
  for (const offsetX of [0, -1024, 1024]) {
    const cx = x + offsetX;
    if (cx + rx < -40 || cx - rx > 1064) continue;
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
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - len, cy);
  ctx.lineTo(cx + len, cy);
  ctx.moveTo(cx, cy - len);
  ctx.lineTo(cx, cy + len);
  ctx.stroke();
  ctx.restore();
}

export function getWeatherSkyDomeTexture(weatherId: WeatherId): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const key = `weather-sky-v2|${weatherId}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const W = 1024;
  const H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const grad = ctx.createLinearGradient(0, 0, 0, H);

  if (weatherId === 'light_rain') {
    grad.addColorStop(0.0, '#0b1120');
    grad.addColorStop(0.24, '#1e293b');
    grad.addColorStop(0.41, '#334155');
    grad.addColorStop(0.5, '#64748b');
    grad.addColorStop(0.62, '#334155');
    grad.addColorStop(1.0, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Distant crepuscular light shafts
    for (let i = 0; i < 6; i++) {
      const x = 90 + i * 175;
      const beam = ctx.createLinearGradient(x, 120, x - 60, 268);
      beam.addColorStop(0, 'rgba(148, 163, 184, 0)');
      beam.addColorStop(0.5, 'rgba(186, 230, 253, 0.08)');
      beam.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x - 24, 120);
      ctx.lineTo(x + 28, 120);
      ctx.lineTo(x - 16, 268);
      ctx.lineTo(x - 76, 268);
      ctx.closePath();
      ctx.fill();
    }

    // Layered storm clouds across horizon band
    for (let i = 0; i < 14; i++) {
      const x = (i * 79 + 30) % W;
      const y = 148 + (i % 3) * 28;
      paintSeamlessEllipse(ctx, x, y, 115 + (i % 4) * 24, 34, 'rgba(15, 23, 42, 0.45)');
      paintSeamlessEllipse(ctx, x + 22, y - 10, 95, 22, 'rgba(148, 163, 184, 0.16)');
    }
  } else if (weatherId === 'snow_rain') {
    grad.addColorStop(0.0, '#071329');
    grad.addColorStop(0.24, '#172554');
    grad.addColorStop(0.4, '#2563eb');
    grad.addColorStop(0.49, '#93c5fd');
    grad.addColorStop(0.54, '#e0f2fe');
    grad.addColorStop(0.68, '#1e3a8a');
    grad.addColorStop(1.0, '#09152f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft pale-teal boreal aurora ribbons
    for (let i = 0; i < 7; i++) {
      const x = i * 155 + 60;
      const y = 152 + Math.sin(i * 1.4) * 22;
      paintSeamlessEllipse(ctx, x, y, 165, 36, 'rgba(103, 232, 249, 0.14)');
      paintSeamlessEllipse(ctx, x + 40, y + 12, 130, 26, 'rgba(167, 243, 208, 0.1)');
    }

    // Soft winter frost clouds near horizon
    for (let i = 0; i < 10; i++) {
      paintSeamlessEllipse(ctx, (i * 107) % W, 228 + (i % 2) * 14, 120, 24, 'rgba(224, 242, 254, 0.2)');
    }

    // Crisp winter starfield
    for (let i = 0; i < 200; i++) {
      const sx = (i * 293 + 31) % W;
      const sy = 24 + ((i * 137 + 19) % 190);
      const r = i % 10 === 0 ? 1.5 : 0.85;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(186, 230, 253, 0.88)' : 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weatherId === 'bloodmoon') {
    grad.addColorStop(0.0, '#040004');
    grad.addColorStop(0.22, '#180209');
    grad.addColorStop(0.38, '#450a0a');
    grad.addColorStop(0.49, '#991b1b');
    grad.addColorStop(0.54, '#dc2626');
    grad.addColorStop(0.68, '#3b0712');
    grad.addColorStop(1.0, '#070104');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sweeping dark bloodstorm clouds catching scarlet underglow
    for (let i = 0; i < 12; i++) {
      const x = (i * 91 + 25) % W;
      const y = 158 + (i % 3) * 26;
      paintSeamlessEllipse(ctx, x, y, 130, 32, 'rgba(20, 4, 8, 0.5)');
      paintSeamlessEllipse(ctx, x - 18, y + 12, 115, 22, 'rgba(248, 113, 113, 0.16)');
    }

    // Crimson & ember stars
    for (let i = 0; i < 220; i++) {
      const sx = (i * 317 + 41) % W;
      const sy = 20 + ((i * 149 + 11) % 205);
      const r = i % 11 === 0 ? 1.5 : 0.8;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(254, 202, 202, 0.9)' : 'rgba(255, 237, 213, 0.72)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weatherId === 'void') {
    grad.addColorStop(0.0, '#020109');
    grad.addColorStop(0.24, '#09031c');
    grad.addColorStop(0.4, '#1e0b3e');
    grad.addColorStop(0.49, '#4c1d95');
    grad.addColorStop(0.55, '#6d28d9');
    grad.addColorStop(0.7, '#17072c');
    grad.addColorStop(1.0, '#04010c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Rich cosmic purple & rose nebula clouds
    for (let i = 0; i < 10; i++) {
      const x = (i * 112 + 40) % W;
      const y = 165 + (i % 3) * 24;
      paintSeamlessEllipse(
        ctx,
        x,
        y,
        145,
        42,
        i % 2 === 0 ? 'rgba(139, 92, 246, 0.18)' : 'rgba(232, 121, 249, 0.12)'
      );
    }

    // Pin-sharp twinkling stars + glints
    for (let i = 0; i < 280; i++) {
      const sx = (i * 293 + 47) % W;
      const sy = 18 + ((i * 157 + 23) % 220);
      const r = i % 12 === 0 ? 1.55 : 0.85;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(216, 180, 254, 0.92)' : 'rgba(224, 242, 254, 0.78)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      if (i % 35 === 0) paintFourPointStar(ctx, sx, sy, 5, 'rgba(232, 121, 249, 0.55)');
    }
  } else {
    // Celestial Starfall Golden Twilight + Aurora
    grad.addColorStop(0.0, '#03071e');
    grad.addColorStop(0.22, '#1e1b4b');
    grad.addColorStop(0.38, '#312e81');
    grad.addColorStop(0.47, '#b45309');
    grad.addColorStop(0.52, '#f59e0b');
    grad.addColorStop(0.64, '#78350f');
    grad.addColorStop(1.0, '#090d24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sweeping celestial aurora waves (turquoise + warm gold)
    for (let i = 0; i < 9; i++) {
      const x = (i * 122 + 30) % W;
      const y = 152 + Math.sin(i * 1.1) * 20;
      paintSeamlessEllipse(ctx, x, y, 160, 34, 'rgba(56, 189, 248, 0.15)');
      paintSeamlessEllipse(ctx, x + 48, y + 22, 145, 28, 'rgba(253, 224, 71, 0.18)');
    }

    // Sparkling golden & cyan starlight pinpoints + 4-point glints
    for (let i = 0; i < 300; i++) {
      const sx = (i * 277 + 53) % W;
      const sy = 16 + ((i * 163 + 29) % 218);
      const r = i % 10 === 0 ? 1.65 : 0.9;
      ctx.fillStyle =
        i % 3 === 0 ? 'rgba(254, 240, 138, 0.94)' : i % 5 === 0 ? 'rgba(103, 232, 249, 0.88)' : 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      if (i % 24 === 0) paintFourPointStar(ctx, sx, sy, 6, 'rgba(254, 240, 138, 0.72)');
    }
  }

  const tex = finalizeTex(c);
  tex.wrapS = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

function mixHex(baseHex: string, tintHex: string, ratio: number): string {
  const c = new THREE.Color(baseHex);
  c.lerp(new THREE.Color(tintHex), ratio);
  return `#${c.getHexString()}`;
}

export function getTerrainTexture(baseHex: string, accentHex: string): THREE.Texture {
  return paintCachedTexture(`terrain4-cyber|${baseHex}|${accentHex}`, 256, 256, 4, 3, [46, 63, 90, 255], (ctx) => {
    // Brightened cyber-slate deck plates subtly tinted by each world's terrain palette
    ctx.fillStyle = mixHex('#27364d', baseHex, 0.28);
    ctx.fillRect(0, 0, 256, 256);

    const tileLight = mixHex('#334663', baseHex, 0.3);
    const tileMid = mixHex('#2b3b54', baseHex, 0.28);
    const step = 64;
    for (let gy = 0; gy < 256; gy += step) {
      for (let gx = 0; gx < 256; gx += step) {
        const parity = ((gx + gy) / step) % 2 === 0;
        ctx.fillStyle = parity ? tileLight : tileMid;
        ctx.fillRect(gx + 2, gy + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gx + 2, gy + 2, step - 4, step - 4);

        // Subtle industrial rivet & diagonal basalt grain ticks
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillRect(gx + 6, gy + 6, 3, 3);
        ctx.fillRect(gx + step - 9, gy + step - 9, 3, 3);
      }
    }

    // Thin glowing cyber circuit traces accented softly by world crystal color
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 63, 256, 2);
    ctx.fillRect(127, 0, 2, 256);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(28, 28, 12, 2);
    ctx.fillRect(156, 156, 14, 2);
    ctx.globalAlpha = 1;
  });
}

export function getQuarryFloorTexture(stoneHex: string, crystalHex: string): THREE.Texture {
  return paintCachedTexture(`quarry4-cyber|${stoneHex}|${crystalHex}`, 256, 256, 3, 2, [54, 73, 102, 255], (ctx) => {
    // Readable mid-slate quarry blast-deck tinted by world stone palette so ores & VFX stay crisp
    ctx.fillStyle = mixHex('#2c3c54', stoneHex, 0.3);
    ctx.fillRect(0, 0, 256, 256);

    const tileLight = mixHex('#384c69', stoneHex, 0.32);
    const tileMid = mixHex('#30415c', stoneHex, 0.3);
    const step = 64;
    for (let gx = 0; gx < 256; gx += step) {
      for (let gy = 0; gy < 256; gy += step) {
        const parity = ((gx + gy) / step) % 2 === 0;
        ctx.fillStyle = parity ? tileLight : tileMid;
        ctx.fillRect(gx + 2, gy + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx + 1, gy + 1, step - 2, step - 2);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx + 3, gy + 3, step - 6, step - 6);
      }
    }

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = crystalHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, 128, 128);
    ctx.globalAlpha = 1;
  });
}

export function getNexusArenaFloorTexture(stoneHex: string, crystalHex: string): THREE.Texture {
  return paintCachedTexture(`nexus-arena-floor|${stoneHex}|${crystalHex}`, 256, 256, 1, 1, [11, 17, 30, 255], (ctx) => {
    // Dark-matte cyber-slate crater floor so additive GLSL skill shaders pop cleanly
    ctx.fillStyle = mixHex('#0b111e', stoneHex, 0.14);
    ctx.fillRect(0, 0, 256, 256);

    const radial = ctx.createRadialGradient(128, 128, 12, 128, 128, 134);
    radial.addColorStop(0, mixHex('#131d33', crystalHex, 0.12));
    radial.addColorStop(0.62, mixHex('#0b111e', stoneHex, 0.12));
    radial.addColorStop(1, '#070b14');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    const gridStep = 32;
    for (let i = gridStep; i < 256; i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    ctx.strokeStyle = crystalHex;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1.5;
    for (const r of [42, 82, 114]) {
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function getCircularNexusPoolTexture(stoneHex: string, crystalHex: string): THREE.Texture {
  return paintCachedTexture(`circular-nexus-pool|${stoneHex}|${crystalHex}`, 512, 512, 1, 1, [6, 10, 20, 255], (ctx) => {
    // Deep dark-matte abyssal circular pool so additive GLSL skill shaders pop brilliantly
    const grad = ctx.createRadialGradient(256, 256, 18, 256, 256, 256);
    grad.addColorStop(0, mixHex('#0e172c', crystalHex, 0.14));
    grad.addColorStop(0.55, mixHex('#080d1a', stoneHex, 0.1));
    grad.addColorStop(0.92, '#050811');
    grad.addColorStop(1, '#03050b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = crystalHex;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 2;
    for (const r of [58, 118, 178, 228]) {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 58, 256 + Math.sin(a) * 58);
      ctx.lineTo(256 + Math.cos(a) * 242, 256 + Math.sin(a) * 242);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function getHazardStripeTexture(accentHex = '#38bdf8'): THREE.Texture {
  return paintCachedTexture(`quarry-hazard3|${accentHex}`, 128, 64, 6, 1, [15, 23, 42, 255], (ctx) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 64);

    // Industrial diagonal hazard chevrons along pit rim collar
    ctx.fillStyle = '#f59e0b';
    for (let x = -64; x < 192; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x + 16, 12);
      ctx.lineTo(x + 34, 52);
      ctx.lineTo(x + 18, 52);
      ctx.closePath();
      ctx.fill();
    }

    // Thin crisp cyber neon trim rail capping top edge of hazard stripe
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 2, 128, 6);
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(0, 56, 128, 8);
  });
}

export function getWoodPlankTexture(): THREE.Texture {
  return paintCachedTexture('wood-planks', 128, 128, 2, 2, [139, 90, 43, 255], (ctx) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) {
      ctx.fillStyle = (y / 32) % 2 === 0 ? '#7c4d23' : '#966332';
      ctx.fillRect(0, y + 2, 128, 28);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, y, 128, 2);
    }
  });
}

export function getCobblePathTexture(stoneHex: string): THREE.Texture {
  return paintCachedTexture(`cobble4-cyber|${stoneHex}`, 256, 256, 4, 3, [50, 68, 96, 255], (ctx) => {
    // Brightened cyber-slate courtyard concrete tinted by world stone palette
    ctx.fillStyle = mixHex('#2b3b54', stoneHex, 0.25);
    ctx.fillRect(0, 0, 256, 256);

    const tileLight = mixHex('#364966', stoneHex, 0.28);
    const tileMid = mixHex('#2d3e57', stoneHex, 0.25);
    const step = 64;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * step;
        const y = row * step;
        ctx.fillStyle = (row + col) % 2 === 0 ? tileLight : tileMid;
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, step - 6, step - 6);
      }
    }
  });
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

/** Swirling quantum event-horizon vortex texture for the center of the 3D Synchro Portal. */
export function getFusionPortalVortexTexture(): THREE.Texture {
  return paintCachedTexture('fusion-portal-vortex-v1', 256, 256, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const mid = 128;

    const coreGrad = ctx.createRadialGradient(mid, mid, 6, mid, mid, 122);
    coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.45)');
    coreGrad.addColorStop(0.68, 'rgba(255, 255, 255, 0.18)');
    coreGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.55)');
    coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(mid, mid, 122, 0, Math.PI * 2);
    ctx.fill();

    // 10 logarithmic spiral energy arms
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 10; arm++) {
      const baseAngle = (arm / 10) * Math.PI * 2;
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = arm % 2 === 0 ? 2.6 : 1.6;
      ctx.beginPath();
      for (let step = 0; step <= 28; step++) {
        const t = step / 28;
        const r = 14 + t * 102;
        const a = baseAngle + t * 2.25;
        const x = mid + Math.cos(a) * r;
        const y = mid + Math.sin(a) * r;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Inner astrolabe target rings
    for (const r of [36, 76, 108]) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mid, mid, r, 0, Math.PI * 2);
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
    `sky-city-facade-v1|${accentHex}`,
    256,
    512,
    1,
    3,
    [16, 26, 46, 255],
    (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#132038');
      grad.addColorStop(0.55, '#0c1528');
      grad.addColorStop(1.0, '#070d1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);

      // Vertical architectural ribs
      ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
      for (const rx of [0, 62, 126, 190, 248]) {
        ctx.fillRect(rx, 0, 6, 512);
      }

      const rows = 28;
      const cols = 12;
      const rowH = 512 / rows;
      const colW = 256 / cols;
      for (let r = 0; r < rows; r++) {
        // Every 7th floor has an accent cyber-trim band
        if (r % 7 === 2) {
          ctx.fillStyle = accentHex;
          ctx.globalAlpha = 0.72;
          ctx.fillRect(8, r * rowH + rowH * 0.35, 240, 3.5);
          ctx.globalAlpha = 1;
          continue;
        }
        const floorSeed = (r * 37 + 11) % 10;
        for (let c = 0; c < cols; c++) {
          const hash = (r * 53 + c * 29 + 7) % 17;
          if (hash < 6) continue;
          const x = c * colW + 4;
          const y = r * rowH + 4;
          const w = colW - 8;
          const h = rowH - 8;
          if (hash >= 14 || floorSeed === 3 && c % 3 === 0) {
            ctx.fillStyle = accentHex;
            ctx.globalAlpha = 0.82;
          } else if (hash >= 11) {
            ctx.fillStyle = '#fde68a';
            ctx.globalAlpha = 0.68;
          } else {
            ctx.fillStyle = '#bae6fd';
            ctx.globalAlpha = 0.56;
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
  const key = `blimp-tv-banner-v1|${accentHex}|${feverActive ? 1 : 0}`;
  const tex = paintCachedTexture(key, 512, 160, 1, 1, [8, 14, 28, 255], (ctx) => {
    const W = 512;
    const H = 160;
    const barColor = feverActive ? '#fde047' : accentHex;
    const secondaryColor = feverActive ? '#fb7185' : '#e0f2fe';

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0.0, '#050914');
    bg.addColorStop(0.5, '#0b162c');
    bg.addColorStop(1.0, '#050914');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle LED matrix scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let y = 24; y < H - 24; y += 5) {
      ctx.fillRect(0, y, W, 1.5);
    }

    // Thick top & bottom glowing banner stripes + inner fine accent rules
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(0, 10, W, 10);
    ctx.fillRect(0, H - 20, W, 10);
    ctx.shadowBlur = 0;

    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, 26, W, 2.5);
    ctx.fillRect(0, H - 28.5, W, 2.5);
    ctx.globalAlpha = 1;

    // Seamless horizontally-wrapping "MyChibiMine" broadcast headline + diamond divider
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '900 50px "Fredoka", "Rubik", "Segoe UI", sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#040814';
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 16;
    ctx.strokeText('MyChibiMine', W * 0.42, H * 0.51);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MyChibiMine', W * 0.42, H * 0.51);
    ctx.shadowBlur = 0;

    // Compact diamond emblem + LIVE badge tag on trailing edge
    const tagX = W * 0.84;
    const tagY = H * 0.51;
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.moveTo(tagX - 58, tagY);
    ctx.lineTo(tagX - 48, tagY - 10);
    ctx.lineTo(tagX - 38, tagY);
    ctx.lineTo(tagX - 48, tagY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = feverActive ? '#ef4444' : '#0ea5e9';
    ctx.fillRect(tagX - 24, tagY - 16, 70, 32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(tagX - 24, tagY - 16, 70, 32);

    ctx.font = '800 18px "Rubik", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(feverActive ? 'FEVER' : 'LIVE', tagX + 11, tagY + 1);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
