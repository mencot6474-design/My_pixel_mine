import * as THREE from 'three';
import { loadPublicSpriteTexture } from './OreBillboard3D';

export const ENCHANT_SECONDARY_COLOR: Record<string, string> = {
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
let cachedThrusterProjTex: THREE.CanvasTexture | null | undefined;

export function getPedestalHoloRingTexture(): THREE.CanvasTexture | null {
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

export function getEnchantSigilTexture(): THREE.CanvasTexture | null {
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

/**
 * Crisp cached radial hologram projector ring texture for beneath floating pedestals.
 */
export function getThrusterHoloProjectionTexture(): THREE.CanvasTexture | null {
  if (cachedThrusterProjTex !== undefined) return cachedThrusterProjTex;
  if (typeof document === 'undefined') {
    cachedThrusterProjTex = null;
    return null;
  }
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) {
    cachedThrusterProjTex = null;
    return null;
  }
  const mid = size * 0.5;

  const coreGrad = ctx.createRadialGradient(mid, mid, 4, mid, mid, 122);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.52)');
  coreGrad.addColorStop(0.28, 'rgba(255,255,255,0.20)');
  coreGrad.addColorStop(0.68, 'rgba(255,255,255,0.06)');
  coreGrad.addColorStop(0.84, 'rgba(255,255,255,0.28)');
  coreGrad.addColorStop(0.93, 'rgba(255,255,255,0.04)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer crisp segmented hologram ring
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3.2;
  for (let i = 0; i < 6; i++) {
    const a0 = (i * Math.PI) / 3 + 0.08;
    ctx.beginPath();
    ctx.arc(mid, mid, 108, a0, a0 + Math.PI / 3 - 0.16);
    ctx.stroke();
  }

  // Mid fine hairline circuit circle
  ctx.strokeStyle = 'rgba(255,255,255,0.68)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(mid, mid, 84, 0, Math.PI * 2);
  ctx.stroke();

  // Inner dashed reticle ring + 4 cardinal ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.86)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 + 0.16;
    ctx.beginPath();
    ctx.arc(mid, mid, 56, a0, a0 + Math.PI / 2 - 0.32);
    ctx.stroke();

    const ta = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(ta) * 62, mid + Math.sin(ta) * 62);
    ctx.lineTo(mid + Math.cos(ta) * 98, mid + Math.sin(ta) * 98);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedThrusterProjTex = tex;
  return tex;
}

/**
 * Animated holographic anti-grav light cone shader with soft feathered bottom edge & scanlines.
 */
export function createThrusterBeamShaderMaterial(
  colorHex = '#22d3ee',
  baseOpacity = 0.44
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: { value: 0 },
      uOpacity: { value: baseOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewPos;
      void main() {
        // vUv.y = 1.0 at top emitter neck, 0.0 at bottom flared air fade
        float topSoft = smoothstep(1.0, 0.86, vUv.y);
        float bottomFade = pow(clamp(vUv.y, 0.0, 1.0), 1.75);
        float scan = 0.68 + 0.32 * sin(vUv.y * 30.0 + uTime * 6.5);
        float ribs = 0.78 + 0.22 * sin(vUv.x * 37.699 + uTime * 1.8);
        float ndotv = abs(dot(normalize(vNormalW), normalize(vViewPos)));
        float edgeSoft = pow(clamp(ndotv, 0.0, 1.0), 0.72);
        float alpha = topSoft * bottomFade * scan * ribs * edgeSoft * uOpacity;
        vec3 hotCore = mix(uColor, vec3(1.0), smoothstep(0.55, 0.92, vUv.y) * 0.58);
        gl_FragColor = vec4(hotCore, alpha);
      }
    `,
  });
}

export function createAnimeAuraShaderMaterial(
  primaryHex: string,
  secondaryHex: string,
  baseOpacity = 0.92
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uColorA: { value: new THREE.Color(primaryHex) },
      uColorB: { value: new THREE.Color(secondaryHex) },
      uTime: { value: 0 },
      uOpacity: { value: baseOpacity },
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
        float rim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 0.95) * 0.94 + 0.14;
        float vFade = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.20, vUv.y);
        float waveA = 0.5 + 0.5 * sin(vUv.x * 25.1327 + sin(vUv.y * 3.5 - uTime * 1.05) * 0.9);
        float waveB = 0.5 + 0.5 * sin(vUv.x * 12.5663 + vUv.y * 4.5 - uTime * 1.45);
        float streaks = smoothstep(0.20, 0.88, waveA * 0.56 + waveB * 0.44);
        float glow = vFade * (0.62 + streaks * 0.88) * rim;
        vec3 baseTint = mix(uColorB * 0.72, uColorA * 1.25, vUv.y * 0.55 + streaks * 0.25);
        vec3 col = mix(baseTint, vec3(1.0), clamp(streaks * rim * 0.48, 0.0, 0.62));
        gl_FragColor = vec4(col, clamp(glow * uOpacity * 1.38, 0.0, 0.96));
      }
    `,
  });
}

export interface AnimeParticleOptions {
  count?: number;
  minRadius?: number;
  maxRadius?: number;
  baseY?: number;
  sizeScale?: number;
}

function createAnimeParticleShaderMaterial(
  primaryHex: string,
  secondaryHex: string,
  sizeScale = 1
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
      uPixelRatio: { value: dpr * sizeScale },
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
        float flare = 1.0 + p * 0.24;
        pos.x = pos.x * flare + sin(uTime * 1.35 + aSeed.x * 6.283) * 0.055 * (1.0 - p);
        pos.z = pos.z * flare + cos(uTime * 1.15 + aSeed.x * 9.42) * 0.04 * (1.0 - p);
        pos.y += p * (aSeed.z > 0.5 ? 1.55 : 1.38);

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;

        float scaleIn = smoothstep(0.0, 0.16, p);
        float scaleOut = 1.0 - smoothstep(0.62, 1.0, p);
        float curve = scaleIn * scaleOut;
        vAlpha = curve;

        float baseSize = aSeed.z > 0.5 ? 25.0 : 21.0 + mod(aSeed.x * 7.3, 1.0) * 9.0;
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
        vec3 finalCol = mix(baseCol, vec3(1.0), clamp(shape * 0.68, 0.0, 0.85));
        gl_FragColor = vec4(finalCol, clamp(shape * vAlpha * 1.25, 0.0, 1.0));
      }
    `,
  });
}

/**
 * Shared GPU-driven star-ember + vertical streak wisp particle emitter for enchanted Chibis.
 */
export function createAnimeParticlePoints(
  primaryHex: string,
  secondaryHex: string,
  options: AnimeParticleOptions = {}
): { points: THREE.Points; geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial } {
  const count = options.count ?? 34;
  const minR = options.minRadius ?? 0.44;
  const maxR = options.maxRadius ?? 0.77;
  const baseY = options.baseY ?? 0.28;
  const sizeScale = options.sizeScale ?? 1;

  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);
  const span = Math.max(0.05, maxR - minR);

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.19;
    const r = minR + ((i % 4) / 3) * span;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = baseY + (i % 5) * 0.04;
    pos[i * 3 + 2] = Math.sin(a) * r;

    seeds[i * 3] = (i * 0.37) % 1;
    seeds[i * 3 + 1] = 0.78 + (i % 4) * 0.16;
    seeds[i * 3 + 2] = i % 3 === 0 ? 1.0 : 0.0;
    lifetimes[i] = 1.85 + (i % 5) * 0.24;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
  const mat = createAnimeParticleShaderMaterial(primaryHex, secondaryHex, sizeScale);
  const points = new THREE.Points(geo, mat);
  return { points, geo, mat };
}

export const ENCHANT_AURA_FPS = 14;
export const ENCHANT_AURA_COLS = 4;
export const ENCHANT_AURA_ROWS = 2;
/** "Pas" aura scale relative to Chibi spriteHeight (2.05 / 1.56 from prototype). */
export const ENCHANT_AURA_SIZE_RATIO = 2.05 / 1.56;

const ENCHANT_AURA_STEADY_FRAMES: Record<string, readonly number[]> = {
  blazing: [2, 3, 4, 5, 6, 7],
};
const DEFAULT_AURA_FRAMES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

export function getEnchantAuraSheetUrl(enchantId: string): string {
  return `/enchants/auras/${enchantId}.webp`;
}

export function getEnchantAuraSequence(enchantId: string): readonly number[] {
  return ENCHANT_AURA_STEADY_FRAMES[enchantId] ?? DEFAULT_AURA_FRAMES;
}

export interface EnchantAuraSheetOptions {
  baseY?: number;
  zOffset?: number;
  phaseOffset?: number;
  opacity?: number;
  renderOrder?: number;
}

export interface EnchantAuraSheetHandle {
  pivotGroup: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  geo: THREE.PlaneGeometry;
  update: (elapsed: number, camera?: THREE.Camera) => void;
  dispose: () => void;
}

/**
 * Creates a camera-aligned 14 FPS 4x2 animated 2D sprite-sheet aura billboard
 * grounded at the Chibi's feet and tucked cleanly behind the sprite & back-attachments.
 */
export function createEnchantAuraSheetHandle(
  enchantId: string,
  chibiSpriteHeight: number,
  options: EnchantAuraSheetOptions = {}
): EnchantAuraSheetHandle {
  const auraSize = chibiSpriteHeight * ENCHANT_AURA_SIZE_RATIO;
  const baseY = options.baseY ?? 0;
  const zOffset = options.zOffset ?? -0.3;
  const phaseOffset = options.phaseOffset ?? 0;
  const baseOpacity = options.opacity ?? 0.96;

  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(0, baseY, 0);
  pivotGroup.rotation.order = 'YXZ';

  const geo = new THREE.PlaneGeometry(auraSize, auraSize);
  const seq = getEnchantAuraSequence(enchantId);
  const initialFrame = seq[0] ?? 0;
  const initCol = initialFrame % ENCHANT_AURA_COLS;
  const initRow = Math.floor(initialFrame / ENCHANT_AURA_COLS);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uUvRect: {
        value: new THREE.Vector4(
          initCol / ENCHANT_AURA_COLS + 0.002,
          (ENCHANT_AURA_ROWS - 1 - initRow) / ENCHANT_AURA_ROWS + 0.002,
          1 / ENCHANT_AURA_COLS - 0.004,
          1 / ENCHANT_AURA_ROWS - 0.004
        ),
      },
      uOpacity: { value: baseOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform vec4 uUvRect;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        if (uHasMap < 0.5) discard;
        vec2 atlasUv = vUv * uUvRect.zw + uUvRect.xy;
        vec4 tex = texture2D(uMap, atlasUv);
        float a = tex.a * uOpacity;
        if (a < 0.015) discard;
        gl_FragColor = vec4(tex.rgb, a);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, auraSize * 0.5 - auraSize * 0.03, zOffset);
  mesh.renderOrder = options.renderOrder ?? 2;
  mesh.raycast = () => {};
  pivotGroup.add(mesh);

  let disposed = false;
  void loadPublicSpriteTexture(getEnchantAuraSheetUrl(enchantId))
    .then((tex) => {
      if (disposed) return;
      mat.uniforms.uMap.value = tex;
      mat.uniforms.uHasMap.value = 1;
    })
    .catch(() => {
      // Headless / test environments without DOM Image skip texture load safely
    });

  const worldPos = new THREE.Vector3();
  let lastFrameIdx = initialFrame;

  return {
    pivotGroup,
    mesh,
    mat,
    geo,
    update(elapsed: number, camera?: THREE.Camera): void {
      if (disposed) return;
      const step = Math.floor((elapsed + phaseOffset) * ENCHANT_AURA_FPS);
      const seqIdx = ((step % seq.length) + seq.length) % seq.length;
      const frameIdx = seq[seqIdx];
      if (frameIdx !== lastFrameIdx) {
        lastFrameIdx = frameIdx;
        const col = frameIdx % ENCHANT_AURA_COLS;
        const row = Math.floor(frameIdx / ENCHANT_AURA_COLS);
        const uvRect = mat.uniforms.uUvRect.value as THREE.Vector4;
        uvRect.set(
          col / ENCHANT_AURA_COLS + 0.002,
          (ENCHANT_AURA_ROWS - 1 - row) / ENCHANT_AURA_ROWS + 0.002,
          1 / ENCHANT_AURA_COLS - 0.004,
          1 / ENCHANT_AURA_ROWS - 0.004
        );
      }

      if (camera) {
        pivotGroup.getWorldPosition(worldPos);
        const dx = camera.position.x - worldPos.x;
        const dy = camera.position.y - worldPos.y;
        const dz = camera.position.z - worldPos.z;
        const horizDist = Math.max(0.001, Math.hypot(dx, dz));
        const camPitch = Math.atan2(dy, horizDist);
        pivotGroup.rotation.y = Math.atan2(dx, dz);
        pivotGroup.rotation.x = -Math.max(0, Math.min(0.66, camPitch * 0.72));
      }
    },
    dispose(): void {
      disposed = true;
      geo.dispose();
      mat.dispose();
    },
  };
}


