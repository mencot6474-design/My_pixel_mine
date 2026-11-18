import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import { getEnchantById } from '../game/GameData';
import { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { disposeObject3D } from './ChestVaultStation3D';

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

function loadEnchantIconImage(enchantId: string): Promise<HTMLImageElement | null> {
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
    // Hexagonal metallic/crystalline prism emblem (bronze, diamond, platinum)
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

const ENCHANT_SECONDARY_COLOR: Record<string, string> = {
  blazing: '#fde047',
  glacial: '#e0f2fe',
  quaking: '#fbbf24',
  surging: '#6366f1',
  radiant: '#fef9c3',
  thundering: '#38bdf8',
  cataclysmic: '#ef4444',
  sundering: '#f97316',
  timeless: '#38bdf8',
  spellbound: '#22d3ee',
};

let cachedPedestalHoloTex: THREE.CanvasTexture | null | undefined;
let cachedEnchantSigilTex: THREE.CanvasTexture | null | undefined;

function getPedestalHoloRingTexture(): THREE.CanvasTexture | null {
  if (cachedPedestalHoloTex !== undefined) return cachedPedestalHoloTex;
  if (typeof document === 'undefined') {
    cachedPedestalHoloTex = null;
    return null;
  }
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) {
    cachedPedestalHoloTex = null;
    return null;
  }
  const mid = size * 0.5;
  // Clean dark-compatible radial floor glow with crisp minimal tech perimeter
  const glow = ctx.createRadialGradient(mid, mid, 6, mid, mid, 118);
  glow.addColorStop(0, 'rgba(255,255,255,0.22)');
  glow.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  glow.addColorStop(0.86, 'rgba(255,255,255,0.42)');
  glow.addColorStop(0.92, 'rgba(255,255,255,0.06)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(mid, mid, 108, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(mid, mid, 82, 0, Math.PI * 2);
  ctx.stroke();

  // Four minimal cardinal hairlines connecting inner & outer rings cleanly
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * 86, mid + Math.sin(a) * 86);
    ctx.lineTo(mid + Math.cos(a) * 105, mid + Math.sin(a) * 105);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedPedestalHoloTex = tex;
  return tex;
}

function getEnchantSigilTexture(): THREE.CanvasTexture | null {
  if (cachedEnchantSigilTex !== undefined) return cachedEnchantSigilTex;
  if (typeof document === 'undefined') {
    cachedEnchantSigilTex = null;
    return null;
  }
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) {
    cachedEnchantSigilTex = null;
    return null;
  }
  const mid = size * 0.5;
  // Soft feathered Anime-RPG / HSR ground aura pool (zero harsh square border)
  const rad = ctx.createRadialGradient(mid, mid, 10, mid, mid, 122);
  rad.addColorStop(0, 'rgba(255,255,255,0.28)');
  rad.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  rad.addColorStop(0.82, 'rgba(255,255,255,0.42)');
  rad.addColorStop(0.92, 'rgba(255,255,255,0.08)');
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(mid, mid, 106, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(mid, mid, 92, 0, Math.PI * 2);
  ctx.stroke();

  // Four subtle cardinal celestial chevrons + fine divider ticks (minimal, clean silhouette)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.save();
    ctx.translate(mid + Math.cos(a) * 100, mid + Math.sin(a) * 100);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 2);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.62)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * 94, mid + Math.sin(a) * 94);
    ctx.lineTo(mid + Math.cos(a) * 104, mid + Math.sin(a) * 104);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedEnchantSigilTex = tex;
  return tex;
}

function createAnimeAuraShaderMaterial(
  primaryHex: string,
  secondaryHex: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColorA: { value: new THREE.Color(primaryHex) },
      uColorB: { value: new THREE.Color(secondaryHex) },
      uTime: { value: 0 },
      uOpacity: { value: 0.42 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float ndotv = abs(dot(N, V));
        float rim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 1.45) * 0.92 + 0.08;
        float vFade = smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.26, vUv.y);
        float waveA = 0.5 + 0.5 * sin(vUv.x * 25.1327 + sin(vUv.y * 3.5 - uTime * 0.95) * 0.85);
        float waveB = 0.5 + 0.5 * sin(vUv.x * 12.5663 + vUv.y * 4.5 - uTime * 1.35);
        float streaks = smoothstep(0.38, 0.96, waveA * 0.6 + waveB * 0.4);
        float glow = vFade * (0.34 + streaks * 0.66) * rim;
        vec3 col = mix(uColorB, uColorA, vUv.y * 0.65 + streaks * 0.35);
        gl_FragColor = vec4(col, glow * uOpacity);
      }
    `,
  });
}

function createAnimeParticleShaderMaterial(
  primaryHex: string,
  secondaryHex: string
): THREE.ShaderMaterial {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColorA: { value: new THREE.Color(primaryHex) },
      uColorB: { value: new THREE.Color(secondaryHex) },
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute vec3 aSeed;
      attribute float aLifetime;
      varying float vProgress;
      varying float vAlpha;
      varying float vKind;

      void main() {
        float localT = mod(uTime * aSeed.y + aSeed.x * 13.7, aLifetime);
        float p = localT / aLifetime;
        vProgress = p;
        vKind = aSeed.z;

        vec3 pos = position;
        pos.y += p * (aSeed.z > 0.5 ? 1.55 : 1.38);
        pos.x += sin(uTime * 1.35 + aSeed.x * 6.283) * 0.065 * (1.0 - p);
        pos.z += cos(uTime * 1.15 + aSeed.x * 9.42) * 0.045 * (1.0 - p);

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;

        float scaleIn = smoothstep(0.0, 0.16, p);
        float scaleOut = 1.0 - smoothstep(0.62, 1.0, p);
        float curve = scaleIn * scaleOut;
        vAlpha = curve;

        float baseSize = aSeed.z > 0.5 ? 16.5 : 13.5 + mod(aSeed.x * 7.3, 1.0) * 6.5;
        gl_PointSize = baseSize * curve * uPixelRatio * (14.5 / max(1.0, -mvPos.z));
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vProgress;
      varying float vAlpha;
      varying float vKind;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float shape = 0.0;

        if (vKind > 0.5) {
          // Elongated vertical anime energy wisp / streak
          vec2 s = vec2(uv.x * 3.8, uv.y * 1.15);
          float d2 = dot(s, s);
          if (d2 > 0.25) discard;
          float halo = exp(-d2 * 14.0);
          float core = exp(-d2 * 46.0);
          shape = halo * 0.72 + core * 0.85;
        } else {
          // Smooth luminous 4-point star ember with soft radial aura
          float dist = length(uv);
          if (dist > 0.5) discard;
          float orb = pow(clamp(1.0 - dist * 2.0, 0.0, 1.0), 2.1);
          float starH = max(0.0, 1.0 - abs(uv.y) * 9.5) * max(0.0, 1.0 - abs(uv.x) * 2.6);
          float starV = max(0.0, 1.0 - abs(uv.x) * 9.5) * max(0.0, 1.0 - abs(uv.y) * 2.6);
          shape = orb * 0.78 + (starH + starV) * 0.72;
        }

        vec3 baseCol = mix(uColorA, uColorB, 1.0 - vProgress * 0.65);
        vec3 finalCol = mix(baseCol, vec3(1.0), clamp(shape * 0.62, 0.0, 0.82));
        gl_FragColor = vec4(finalCol, clamp(shape * vAlpha * 0.92, 0.0, 1.0));
      }
    `,
  });
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

export class PlotPedestal3D {
  public readonly group = new THREE.Group();
  public readonly hitMesh: THREE.Mesh;
  public readonly index: number;

  private readonly ringMat: THREE.MeshStandardMaterial;
  private readonly holoDiscMat: THREE.MeshBasicMaterial;
  private hovered = false;
  private chibiDef: ChibiDef | null = null;
  private chibiSprite: ChibiSprite3D | null = null;

  private enchantId: string | null = null;
  private enchantIsRainbow = false;
  private auraGroup: THREE.Group | null = null;
  private auraSigilMesh: THREE.Mesh | null = null;
  private auraGroundMat: THREE.MeshBasicMaterial | null = null;
  private auraVeilMat: THREE.ShaderMaterial | null = null;
  private auraMoteGeo: THREE.BufferGeometry | null = null;
  private auraMoteMat: THREE.ShaderMaterial | null = null;
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);

  private readonly labelMat: THREE.SpriteMaterial;
  private readonly labelSprite: THREE.Sprite;
  private labelTex: THREE.CanvasTexture | null = null;
  private lastLabelSignature = '';
  private currentLabelInfo: PlotLabelInfo | null = null;
  private hasLabel = false;
  private labelEnabled = true;
  private disposed = false;

  constructor(index: number, x: number, z: number) {
    this.index = index;
    this.group.position.set(x, 0, z);

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1b263b,
      roughness: 0.44,
      metalness: 0.4,
      flatShading: true,
    });
    const lowerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.84, 0.14, 8), baseMat);
    lowerBase.position.y = 0.07;
    lowerBase.rotation.y = Math.PI / 8;
    lowerBase.receiveShadow = true;
    lowerBase.castShadow = true;

    const upperCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.7, 0.13, 8),
      new THREE.MeshStandardMaterial({
        color: 0x26354f,
        roughness: 0.34,
        metalness: 0.36,
        flatShading: true,
      })
    );
    upperCap.position.y = 0.205;
    upperCap.rotation.y = Math.PI / 8;
    upperCap.receiveShadow = true;
    upperCap.castShadow = true;
    this.group.add(lowerBase, upperCap);

    // Clean Grounded Cyber Holo-Pad & Architectural Rim Ring (zero dizzy orbiting hoops)
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.85,
      roughness: 0.24,
      metalness: 0.34,
      flatShading: true,
    });
    const pedHoloTex = getPedestalHoloRingTexture();
    this.holoDiscMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      ...(pedHoloTex ? { map: pedHoloTex } : {}),
      transparent: true,
      opacity: pedHoloTex ? 0.68 : 0.32,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const holoLensDisc = new THREE.Mesh(
      pedHoloTex ? new THREE.PlaneGeometry(1.22, 1.22) : new THREE.RingGeometry(0.24, 0.56, 24),
      this.holoDiscMat
    );
    holoLensDisc.rotation.x = -Math.PI / 2;
    holoLensDisc.position.y = 0.274;

    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.615, 0.028, 6, 8), this.ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.rotation.z = Math.PI / 8;
    ringMesh.position.y = 0.282;

    const clawGeo = new THREE.CylinderGeometry(0.044, 0.062, 0.065, 6);
    const diodeGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.03, 6);
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + (i * Math.PI) / 2;
      const rx = Math.cos(ang) * 0.648;
      const rz = Math.sin(ang) * 0.648;
      const claw = new THREE.Mesh(clawGeo, baseMat);
      claw.position.set(rx, 0.248, rz);
      claw.castShadow = true;
      const diode = new THREE.Mesh(diodeGeo, this.ringMat);
      diode.position.set(rx, 0.292, rz);
      this.group.add(claw, diode);
    }

    this.group.add(holoLensDisc, ringMesh);

    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 1.9, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.95;
    hitMesh.userData = { kind: 'pedestal', slotIndex: index };
    this.hitMesh = hitMesh;
    this.group.add(hitMesh);

    this.labelMat = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
    });
    this.labelSprite = new THREE.Sprite(this.labelMat);
    this.labelSprite.center.set(0.5, 0);
    this.labelSprite.scale.set(2.28, 0.91, 1);
    this.labelSprite.position.set(0, 2.68, 0);
    this.labelSprite.renderOrder = 15;
    this.labelSprite.raycast = () => {};
    this.labelSprite.visible = false;
    this.group.add(this.labelSprite);
  }

  public setChibi(def: ChibiDef | null): void {
    if (this.chibiSprite) {
      this.group.remove(this.chibiSprite.group);
      this.chibiSprite.dispose();
      this.chibiSprite = null;
    }

    this.chibiDef = def;
    if (!def) {
      this.setEnchant(null);
      this.setLabel(null);
      this.ringMat.color.setHex(0x22d3ee);
      this.ringMat.emissive.setHex(0x22d3ee);
      this.holoDiscMat.color.setHex(0x22d3ee);
      return;
    }

    if (!this.enchantId) {
      this.ringMat.color.set(def.accentColor);
      this.ringMat.emissive.set(def.accentColor);
      this.holoDiscMat.color.set(def.accentColor);
    }

    const sprite = new ChibiSprite3D(def, 2.05, this.index * 0.75);
    sprite.group.position.y = 0.28;
    sprite.setAnimState('aura');
    this.chibiSprite = sprite;
    this.group.add(sprite.group);
  }

  public setEnchant(enchantId: string | null): void {
    const targetId = this.chibiDef ? enchantId : null;
    if (targetId === this.enchantId) return;

    if (this.auraGroup) {
      disposeObject3D(this.auraGroup);
      this.group.remove(this.auraGroup);
      this.auraGroup = null;
      this.auraSigilMesh = null;
      this.auraGroundMat = null;
      this.auraVeilMat = null;
      this.auraMoteGeo?.dispose();
      this.auraMoteGeo = null;
      this.auraMoteMat?.dispose();
      this.auraMoteMat = null;
    }

    this.enchantId = targetId;
    this.enchantIsRainbow = false;
    if (!targetId || !this.chibiDef) {
      if (this.chibiDef) {
        this.ringMat.color.set(this.chibiDef.accentColor);
        this.ringMat.emissive.set(this.chibiDef.accentColor);
        this.holoDiscMat.color.set(this.chibiDef.accentColor);
      } else {
        this.ringMat.color.setHex(0x22d3ee);
        this.ringMat.emissive.setHex(0x22d3ee);
        this.holoDiscMat.color.setHex(0x22d3ee);
      }
      this.ringMat.emissiveIntensity = this.hovered ? 1.15 : 0.85;
      return;
    }

    const enc = getEnchantById(targetId);
    if (!enc) return;

    this.enchantIsRainbow = enc.rarity === 'rainbow';
    const secondaryHex = ENCHANT_SECONDARY_COLOR[enc.id] ?? enc.color;

    this.ringMat.color.set(enc.color);
    this.ringMat.emissive.set(enc.color);
    this.ringMat.emissiveIntensity = 1.05;
    this.holoDiscMat.color.set(enc.color);

    const auraGroup = new THREE.Group();

    // 1. Clean Minimalist Ground Sigil Decal (serene slow drift, zero square clutter)
    const sigilTex = getEnchantSigilTexture();
    const groundMat = new THREE.MeshBasicMaterial({
      color: enc.color,
      ...(sigilTex ? { map: sigilTex } : {}),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: sigilTex ? 0.62 : 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundSigil = new THREE.Mesh(
      sigilTex ? new THREE.PlaneGeometry(1.96, 1.96) : new THREE.RingGeometry(0.58, 0.84, 32),
      groundMat
    );
    groundSigil.rotation.x = -Math.PI / 2;
    groundSigil.position.y = 0.292;
    auraGroup.add(groundSigil);
    this.auraSigilMesh = groundSigil;
    this.auraGroundMat = groundMat;

    // 2. Smooth Vertical Fresnel Rim Aura Veil (frames silhouette cleanly, keeps face 100% clear)
    const veilMat = createAnimeAuraShaderMaterial(enc.color, secondaryHex);
    const auraVeil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.8, 1.48, 28, 1, true),
      veilMat
    );
    auraVeil.position.y = 1.01;
    auraGroup.add(auraVeil);
    this.auraVeilMat = veilMat;

    // 3. GPU Lifetime-Shaded Anime Aura Wisps & Vertical Energy Streaks (smooth birth/death fade)
    const moteCount = 26;
    const pos = new Float32Array(moteCount * 3);
    const seeds = new Float32Array(moteCount * 3);
    const lifetimes = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      const a = (i / moteCount) * Math.PI * 2 + (i % 3) * 0.19;
      const r = 0.44 + (i % 4) * 0.11;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.28 + (i % 5) * 0.04;
      pos[i * 3 + 2] = Math.sin(a) * r;

      seeds[i * 3] = (i * 0.37) % 1;
      seeds[i * 3 + 1] = 0.78 + (i % 4) * 0.16;
      seeds[i * 3 + 2] = i % 3 === 0 ? 1.0 : 0.0;
      lifetimes[i] = 1.85 + (i % 5) * 0.24;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    moteGeo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    const moteMat = createAnimeParticleShaderMaterial(enc.color, secondaryHex);
    const motes = new THREE.Points(moteGeo, moteMat);
    auraGroup.add(motes);
    this.auraMoteGeo = moteGeo;
    this.auraMoteMat = moteMat;

    this.auraGroup = auraGroup;
    this.group.add(auraGroup);
  }

  public getChibi(): ChibiDef | null {
    return this.chibiDef;
  }

  public getEnchantId(): string | null {
    return this.enchantId;
  }

  public setChibiAnimState(state: ChibiAnimState): void {
    this.chibiSprite?.setAnimState(state);
  }

  public triggerChibiShowcase(_durationSec = 1.4): void {
    this.chibiSprite?.setAnimState('aura');
  }

  public setHovered(hover: boolean): void {
    this.hovered = hover;
    this.ringMat.emissiveIntensity = hover ? 1.3 : this.enchantId ? 1.05 : 0.85;
    this.holoDiscMat.opacity = hover ? 0.86 : 0.68;
  }

  public update(dtSec: number, elapsed = 0, camera?: THREE.Camera): void {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const targetScale = this.hovered ? 1.06 : 1;
    this.tmpScale.set(targetScale, 1, targetScale);
    this.group.scale.lerp(this.tmpScale, Math.min(1, safeDt * 12));
    this.labelSprite.scale.x = 2.28 / Math.max(0.01, this.group.scale.x);
    if (this.chibiSprite && camera) {
      this.chibiSprite.update(safeDt, elapsed, camera);
    }
    if (this.auraGroup) {
      const phase = elapsed + this.index * 0.65;
      if (this.enchantIsRainbow && this.auraGroundMat && this.auraVeilMat && this.auraMoteMat) {
        const hue = (phase * 0.08) % 1;
        this.auraGroundMat.color.setHSL(hue, 0.85, 0.62);
        (this.auraMoteMat.uniforms.uColorA.value as THREE.Color).setHSL(hue, 0.88, 0.62);
        (this.auraMoteMat.uniforms.uColorB.value as THREE.Color).setHSL((hue + 0.28) % 1, 0.92, 0.7);
        (this.auraVeilMat.uniforms.uColorA.value as THREE.Color).setHSL(hue, 0.85, 0.62);
        (this.auraVeilMat.uniforms.uColorB.value as THREE.Color).setHSL((hue + 0.3) % 1, 0.9, 0.68);
        this.ringMat.color.setHSL(hue, 0.82, 0.6);
        this.ringMat.emissive.setHSL(hue, 0.82, 0.56);
      }
      if (this.auraSigilMesh) {
        this.auraSigilMesh.rotation.z = phase * 0.12;
      }
      if (this.auraVeilMat) {
        this.auraVeilMat.uniforms.uTime.value = phase;
        this.auraVeilMat.uniforms.uOpacity.value = 0.36 + Math.sin(phase * 1.8) * 0.08;
      }
      if (this.auraGroundMat) {
        this.auraGroundMat.opacity = 0.52 + Math.sin(phase * 1.8) * 0.1;
      }
      if (this.auraMoteMat) {
        this.auraMoteMat.uniforms.uTime.value = phase;
      }
    }
  }

  public setLabelVisible(visible: boolean): void {
    this.labelEnabled = visible;
    this.labelSprite.visible = visible && this.hasLabel;
  }

  public setLabel(info: PlotLabelInfo | null): void {
    this.currentLabelInfo = info;
    if (!info) {
      this.hasLabel = false;
      this.lastLabelSignature = '';
      this.labelSprite.visible = false;
      return;
    }

    const enchantImg = info.enchantId ? enchantIconCache.get(info.enchantId) ?? null : null;
    const sig = `${info.name}|${info.level}|${info.rarityLabel}|${info.mutationId}|${info.enchantId ?? ''}|${enchantImg ? '1' : '0'}|${info.dmgText}`;
    if (sig === this.lastLabelSignature) {
      this.hasLabel = true;
      this.labelSprite.visible = this.labelEnabled;
      return;
    }
    this.lastLabelSignature = sig;
    this.hasLabel = true;

    if (typeof document === 'undefined') {
      this.labelSprite.visible = this.labelEnabled;
      return;
    }

    if (info.enchantId && !enchantIconCache.has(info.enchantId)) {
      const targetEnchant = info.enchantId;
      void loadEnchantIconImage(targetEnchant).then((loaded) => {
        if (!loaded || this.disposed || this.currentLabelInfo?.enchantId !== targetEnchant) return;
        this.lastLabelSignature = '';
        this.setLabel(this.currentLabelInfo);
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';

    // Row 1: Chibi Name + Level (auto-fits inside compact 480px width)
    const lvText = `Lv.${info.level}`;
    let namePx = 38;
    let lvlPx = 31;
    let nameW = 0;
    let lvW = 0;
    const gap1 = 10;
    while (namePx > 24) {
      ctx.font = `900 ${namePx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
      nameW = ctx.measureText(info.name).width;
      ctx.font = `800 ${lvlPx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
      lvW = ctx.measureText(lvText).width;
      if (nameW + gap1 + lvW <= canvas.width - 20) break;
      namePx -= 2;
      lvlPx -= 1.5;
    }
    let startX = (canvas.width - (nameW + gap1 + lvW)) * 0.5;
    ctx.textAlign = 'left';
    ctx.font = `900 ${namePx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
    drawOutlinedCanvasText(ctx, info.name, startX, 42, '#ffffff', 9);
    ctx.font = `800 ${lvlPx}px "Nunito", "Segoe UI", system-ui, sans-serif`;
    drawOutlinedCanvasText(ctx, lvText, startX + nameW + gap1, 43, '#94a3b8', 7);

    // Row 2: Rarity Label + Mutation Icon + Enchant WebP Icon (compact, zero neighbor overlap)
    const hasMut = Boolean(info.mutationLabel && info.mutationId !== 'normal');
    const hasEnc = Boolean(info.enchantId);
    const rarityFont = '800 31px "Nunito", "Segoe UI", system-ui, sans-serif';
    ctx.font = rarityFont;
    const rarityW = ctx.measureText(info.rarityLabel).width;
    const mutSize = 32;
    const encSize = 38;
    const iconGap = 10;
    const row2TotalW =
      rarityW + (hasMut ? iconGap + mutSize : 0) + (hasEnc ? iconGap + encSize : 0);
    let cursorX = (canvas.width - row2TotalW) * 0.5;
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

    // Row 3: Crisp Target Reticle + Damage Value
    const dmgFont = '900 37px "Nunito", "Segoe UI", system-ui, sans-serif';
    ctx.font = dmgFont;
    const dmgW = ctx.measureText(info.dmgText).width;
    const iconSize = 28;
    const gap3 = 10;
    startX = (canvas.width - (iconSize + gap3 + dmgW)) * 0.5;
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
    nextTex.minFilter = THREE.LinearMipmapLinearFilter;
    nextTex.magFilter = THREE.LinearFilter;
    nextTex.anisotropy = 4;
    nextTex.needsUpdate = true;

    this.labelTex?.dispose();
    this.labelTex = nextTex;
    this.labelMat.map = nextTex;
    this.labelMat.needsUpdate = true;
    this.labelSprite.visible = this.labelEnabled;
  }

  public dispose(): void {
    this.disposed = true;
    this.auraMoteGeo?.dispose();
    this.auraMoteGeo = null;
    this.auraMoteMat?.dispose();
    this.auraMoteMat = null;
    this.labelTex?.dispose();
    this.labelTex = null;
    this.labelMat.dispose();
    this.chibiSprite?.dispose();
    disposeObject3D(this.group);
  }
}
