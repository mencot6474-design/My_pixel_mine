import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';

export interface PlotLabelInfo {
  name: string;
  level: number;
  rarityLabel: string;
  rarityColor: string;
  mutationId: string;
  mutationLabel: string;
  mutationColor: string;
  mutationRainbow: boolean;
  enchantId: string | null;
  enchantLabel: string;
  enchantColor: string;
  enchantRainbow: boolean;
  dmgText: string;
}

const enchantIconCache = new Map<string, HTMLImageElement | null>();
const enchantIconPromises = new Map<string, Promise<HTMLImageElement | null>>();

export function getCachedEnchantIconImage(enchantId: string): HTMLImageElement | null {
  return enchantIconCache.get(enchantId) ?? null;
}

export function hasCachedEnchantIconEntry(enchantId: string): boolean {
  return enchantIconCache.has(enchantId);
}

/** Preloads and caches an enchant icon image for pedestal nameplate canvas rendering. */
export function loadEnchantIconImage(enchantId: string): Promise<HTMLImageElement | null> {
  if (enchantIconCache.has(enchantId)) {
    return Promise.resolve(enchantIconCache.get(enchantId) ?? null);
  }
  const existing = enchantIconPromises.get(enchantId);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      enchantIconCache.set(enchantId, null);
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      enchantIconCache.set(enchantId, img);
      resolve(img);
    };
    img.onerror = () => {
      enchantIconCache.set(enchantId, null);
      resolve(null);
    };
    img.src = assetUrl(`/enchants/${enchantId}.webp`);
  });
  enchantIconPromises.set(enchantId, promise);
  return promise;
}

/** Creates the pedestal slot index plaque texture ("01".."05"). */
export function createSlotPlaqueTexture(slotIndex: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.fillRect(8, 12, 6, 24);
  ctx.fillRect(c.width - 14, 12, 6, 24);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = '900 22px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`0${slotIndex + 1}`, c.width * 0.5, c.height * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawMutationBadgeIcon(
  ctx: CanvasRenderingContext2D,
  mutationId: string,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(2, 6, 23, 0.96)';
  ctx.shadowBlur = 5;

  const strokeBg = (width = 5): void => {
    ctx.lineWidth = width;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.98)';
    ctx.stroke();
  };

  if (mutationId === 'inferno') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.25, r * 0.72, r * 0.65);
    ctx.quadraticCurveTo(0, r * 1.12, -r * 0.72, r * 0.65);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.15, -r * 0.25, -r * 0.45);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.85, 0, -r * 1.15);
    strokeBg(5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.35);
    ctx.quadraticCurveTo(r * 0.42, r * 0.15, 0, r * 0.72);
    ctx.quadraticCurveTo(-r * 0.42, r * 0.15, 0, -r * 0.35);
    ctx.fillStyle = '#fde047';
    ctx.fill();
  } else if (mutationId === 'frozen') {
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.98)';
    ctx.lineWidth = 6.5;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -r * 0.98, Math.sin(a) * -r * 0.98);
      ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -r * 0.95, Math.sin(a) * -r * 0.95);
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
  } else if (mutationId === 'nightmare') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    strokeBg(5);
    ctx.fillStyle = '#3b0764';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
  } else if (mutationId === 'rainbow') {
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, '#fb7185');
    grad.addColorStop(0.28, '#fbbf24');
    grad.addColorStop(0.54, '#4ade80');
    grad.addColorStop(0.78, '#38bdf8');
    grad.addColorStop(1, '#c084fc');
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    strokeBg(5);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  } else if (mutationId === 'unreal') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r * 1.08 : r * 0.44;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    strokeBg(5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e0e7ff';
    ctx.fill();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      const px = Math.cos(a) * r * 0.95;
      const py = Math.sin(a) * r * 0.95;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    strokeBg(5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(r * 0.45, 0);
    ctx.lineTo(0, r * 0.52);
    ctx.lineTo(-r * 0.45, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  }
  ctx.restore();
}

function drawOutlinedCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillStyle: string | CanvasGradient,
  strokeWidth: number
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.shadowColor = 'rgba(2, 6, 23, 0.98)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = strokeWidth + 2;
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.98)';
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Renders a 2x HiDPI CanvasTexture for a pedestal chibi nameplate. */
export function renderPlotLabelTexture(
  info: PlotLabelInfo,
  enchantImg: HTMLImageElement | null
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const logicalW = 480;
  const logicalH = 192;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, logicalW, logicalH);
  ctx.textBaseline = 'middle';

  const lvText = `Lv.${info.level}`;
  let namePx = 43;
  let lvlPx = 34;
  let nameW = 0;
  let lvW = 0;
  const gap1 = 10;
  while (namePx > 24) {
    ctx.font = `900 ${namePx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
    nameW = ctx.measureText(info.name).width;
    ctx.font = `800 ${lvlPx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
    lvW = ctx.measureText(lvText).width;
    if (nameW + gap1 + lvW <= logicalW - 20) break;
    namePx -= 2;
    lvlPx -= 1.5;
  }
  let startX = (logicalW - (nameW + gap1 + lvW)) * 0.5;
  ctx.textAlign = 'left';
  ctx.font = `900 ${namePx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
  drawOutlinedCanvasText(ctx, info.name, startX, 42, '#ffffff', 9);
  ctx.font = `800 ${lvlPx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
  drawOutlinedCanvasText(ctx, lvText, startX + nameW + gap1, 43, '#94a3b8', 7);

  const hasMut = Boolean(info.mutationLabel && info.mutationId !== 'normal');
  const hasEnc = Boolean(info.enchantId);
  const rarityFont = '800 35px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.font = rarityFont;
  const rarityW = ctx.measureText(info.rarityLabel).width;
  const mutSize = 32;
  const encSize = 38;
  const iconGap = 10;
  const row2TotalW =
    rarityW + (hasMut ? iconGap + mutSize : 0) + (hasEnc ? iconGap + encSize : 0);
  let cursorX = (logicalW - row2TotalW) * 0.5;
  const row2Y = 96;

  drawOutlinedCanvasText(ctx, info.rarityLabel, cursorX, row2Y, info.rarityColor, 8);
  cursorX += rarityW;

  if (hasMut) {
    cursorX += iconGap;
    drawMutationBadgeIcon(ctx, info.mutationId, cursorX + mutSize * 0.5, row2Y - 1, mutSize * 0.46, info.mutationColor);
    cursorX += mutSize;
  }

  if (hasEnc && info.enchantId) {
    cursorX += iconGap;
    const encCenterX = cursorX + encSize * 0.5;
    const encCenterY = row2Y - 1;
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, 0.98)';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(encCenterX, encCenterY, encSize * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = info.enchantColor;
    ctx.stroke();
    ctx.restore();

    if (enchantImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(encCenterX, encCenterY, encSize * 0.44, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        enchantImg,
        encCenterX - encSize * 0.46,
        encCenterY - encSize * 0.46,
        encSize * 0.92,
        encSize * 0.92
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = info.enchantColor;
      ctx.beginPath();
      ctx.arc(encCenterX, encCenterY, encSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const dmgFont = '900 42px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.font = dmgFont;
  const dmgW = ctx.measureText(info.dmgText).width;
  const iconSize = 28;
  const gap3 = 10;
  startX = (logicalW - (iconSize + gap3 + dmgW)) * 0.5;
  const cx = startX + iconSize * 0.5;
  const cy = 152;
  ctx.save();
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy - 3);
  ctx.lineTo(cx + 14, cy - 14);
  ctx.stroke();
  ctx.restore();

  drawOutlinedCanvasText(ctx, info.dmgText, startX + iconSize + gap3, cy + 1, '#f87171', 8.5);

  const nextTex = new THREE.CanvasTexture(canvas);
  nextTex.colorSpace = THREE.SRGBColorSpace;
  nextTex.generateMipmaps = false;
  nextTex.minFilter = THREE.LinearFilter;
  nextTex.magFilter = THREE.LinearFilter;
  nextTex.needsUpdate = true;
  return nextTex;
}
