import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';

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

export function getTerrainTexture(_baseHex: string, accentHex: string): THREE.Texture {
  return paintCachedTexture(`terrain3-cyber|${accentHex}`, 256, 256, 4, 3, [13, 20, 34, 255], (ctx) => {
    // Dark basalt / cyber-industrial deck plates (replaces bright green grass)
    ctx.fillStyle = '#0d1422';
    ctx.fillRect(0, 0, 256, 256);

    const step = 64;
    for (let gy = 0; gy < 256; gy += step) {
      for (let gx = 0; gx < 256; gx += step) {
        const parity = ((gx + gy) / step) % 2 === 0;
        ctx.fillStyle = parity ? '#131d31' : '#0f172a';
        ctx.fillRect(gx + 2, gy + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gx + 2, gy + 2, step - 4, step - 4);

        // Subtle industrial rivet & diagonal basalt grain ticks
        ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.fillRect(gx + 6, gy + 6, 3, 3);
        ctx.fillRect(gx + step - 9, gy + step - 9, 3, 3);
      }
    }

    // Thin glowing cyber circuit traces accented softly by world crystal color
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 63, 256, 2);
    ctx.fillRect(127, 0, 2, 256);
    ctx.globalAlpha = 0.36;
    ctx.fillRect(28, 28, 12, 2);
    ctx.fillRect(156, 156, 14, 2);
    ctx.globalAlpha = 1;
  });
}

export function getQuarryFloorTexture(_stoneHex: string, crystalHex: string): THREE.Texture {
  return paintCachedTexture(`quarry3-cyber|${crystalHex}`, 256, 256, 3, 2, [18, 25, 40, 255], (ctx) => {
    // Deep dark basalt blast-deck floor so vibrant ores, chibis, & slash VFX pop clearly
    ctx.fillStyle = '#121928';
    ctx.fillRect(0, 0, 256, 256);

    const step = 64;
    for (let gx = 0; gx < 256; gx += step) {
      for (let gy = 0; gy < 256; gy += step) {
        const parity = ((gx + gy) / step) % 2 === 0;
        ctx.fillStyle = parity ? '#192338' : '#141d2f';
        ctx.fillRect(gx + 2, gy + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx + 1, gy + 1, step - 2, step - 2);
      }
    }

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = crystalHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, 128, 128);
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

export function getSlashArcTexture(): THREE.Texture {
  return paintCachedTexture('slash-arc', 128, 128, 1, 1, [255, 255, 255, 0], (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);
    const grad = ctx.createRadialGradient(0, 0, 26, 0, 0, 60);
    grad.addColorStop(0.0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.45, 'rgba(243,230,0,0.85)');
    grad.addColorStop(0.8, 'rgba(255,255,255,1)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 58, -Math.PI * 0.65, Math.PI * 0.25);
    ctx.arc(-10, 6, 46, Math.PI * 0.25, -Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

export function getCobblePathTexture(_stoneHex: string): THREE.Texture {
  return paintCachedTexture('cobble3-cyber-basalt', 256, 256, 4, 3, [21, 30, 48, 255], (ctx) => {
    // Dark basalt / cyber-industrial deck concrete matching Neo-Cyber City Plaza
    ctx.fillStyle = '#151e30';
    ctx.fillRect(0, 0, 256, 256);

    const step = 64;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * step;
        const y = row * step;
        ctx.fillStyle = (row + col) % 2 === 0 ? '#1b263b' : '#131c2c';
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, step - 6, step - 6);
      }
    }
  });
}
