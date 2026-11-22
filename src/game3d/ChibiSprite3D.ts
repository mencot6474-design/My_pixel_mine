import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import {
  ChibiAnimState,
  ChibiDef,
  LEFT_FACING_ATTACK_IDS,
  LEFT_FACING_WALK_IDS,
} from './ChibiCatalog';
import { getWindupGlintTexture } from './ProceduralTextures3D';
import { applySharpSpriteTexture } from './MeshHelpers3D';

interface LoadedPoseMeta {
  texture: THREE.Texture;
  pixelWidth: number;
  pixelHeight: number;
  topTrimRatio: number;
}

const BASE_CHIBI_PIXEL_HEIGHT = 350;
const poseCache = new Map<string, Promise<LoadedPoseMeta>>();
const textureLoader = new THREE.TextureLoader();
let contactShadowTex: THREE.CanvasTexture | null | undefined;

function getSoftContactShadowTexture(): THREE.CanvasTexture | null {
  if (contactShadowTex !== undefined) return contactShadowTex;
  if (typeof document === 'undefined') {
    contactShadowTex = null;
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    contactShadowTex = null;
    return null;
  }
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.4, 'rgba(2, 6, 23, 0.44)');
  grad.addColorStop(0.74, 'rgba(2, 6, 23, 0.14)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  contactShadowTex = tex;
  return tex;
}

let trimScratchCanvas: HTMLCanvasElement | null = null;
let trimScratchCtx: CanvasRenderingContext2D | null = null;

function measureTopTrimRatio(img: HTMLImageElement): number {
  if (typeof document === 'undefined' || !img.width || !img.height) return 0;
  try {
    const sw = Math.min(64, img.width);
    const sh = Math.min(64, img.height);
    if (!trimScratchCanvas) {
      trimScratchCanvas = document.createElement('canvas');
      trimScratchCanvas.width = 64;
      trimScratchCanvas.height = 64;
      trimScratchCtx = trimScratchCanvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = trimScratchCtx;
    if (!ctx) return 0;
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, 0, 0, sw, sh);
    const data = ctx.getImageData(0, 0, sw, sh).data;
    for (let y = 0; y < sh; y++) {
      const rowOffset = y * sw * 4;
      for (let x = 0; x < sw; x++) {
        if (data[rowOffset + x * 4 + 3] > 20) {
          return Math.min(0.45, Math.max(0, y / sh));
        }
      }
    }
  } catch {
    // Fallback cleanly when canvas pixel readback is unavailable
  }
  return 0;
}

function loadPoseMeta(url: string, smoothFilter = false): Promise<LoadedPoseMeta> {
  const resolved = assetUrl(url);
  const cacheKey = `${resolved}|${smoothFilter ? 'smooth' : 'pixel'}`;
  const cached = poseCache.get(cacheKey);
  if (cached) return cached;

  const promise = new Promise<LoadedPoseMeta>((resolve, reject) => {
    textureLoader.load(
      resolved,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        applySharpSpriteTexture(tex, !smoothFilter);

        const img = tex.image as HTMLImageElement;
        resolve({
          texture: tex,
          pixelWidth: img.width,
          pixelHeight: img.height,
          topTrimRatio: measureTopTrimRatio(img),
        });
      },
      undefined,
      (err) => reject(err)
    );
  });

  poseCache.set(cacheKey, promise);
  return promise;
}

function stateToPoseUrl(def: ChibiDef, state: ChibiAnimState): string {
  if (state === 'dash') return def.poses.walk;
  if (state === 'attack') return def.poses.attack;
  if (state === 'aura') return def.poses.pose;
  return def.poses.idle;
}

export class ChibiSprite3D {
  public readonly group = new THREE.Group();
  private readonly spritePivot = new THREE.Group();
  private readonly animGroup = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly depthMaterial: THREE.MeshDepthMaterial;
  private readonly shadowDisc: THREE.Mesh;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly baseShadowOpacity: number;
  private readonly ghostMeshes: THREE.Mesh[] = [];
  private readonly ghostMats: THREE.MeshBasicMaterial[] = [];
  private readonly glintMesh: THREE.Mesh;
  private readonly glintMat: THREE.MeshBasicMaterial;

  private readonly def: ChibiDef;
  private readonly spriteHeight: number;
  private readonly phaseOffset: number;
  private readonly worldPos = new THREE.Vector3();

  private animState: ChibiAnimState = 'idle';
  private facing: 1 | -1 = 1;
  private accentColorHex: string;
  private showcaseTimer = 0;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.42;
  private attackComboStep = 0;
  private nextComboStep = 0;
  private idlePixelHeight: number | null = null;
  private currentSpriteHeight: number;
  private topTrimRatio = 0;
  private hologramMode = false;
  private hologramTintHex = '#38bdf8';
  private lowQuality = false;
  private disposed = false;

  constructor(def: ChibiDef, spriteHeight = 1.24, phaseOffset = 0) {
    this.def = def;
    this.spriteHeight = spriteHeight;
    this.currentSpriteHeight = spriteHeight;
    this.phaseOffset = phaseOffset;
    this.accentColorHex = def.accentColor;

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      depthWrite: true,
      opacity: 0,
    });

    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight), this.material);
    this.mesh.position.y = spriteHeight * 0.5;
    this.mesh.customDepthMaterial = this.depthMaterial;
    this.mesh.castShadow = false;
    this.animGroup.add(this.mesh);

    this.glintMat = new THREE.MeshBasicMaterial({
      map: getWindupGlintTexture(),
      color: this.accentColorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.glintMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), this.glintMat);
    this.glintMesh.position.set(0, spriteHeight * 0.56, 0.04);
    this.glintMesh.visible = false;
    this.animGroup.add(this.glintMesh);

    this.spritePivot.add(this.animGroup);

    for (let i = 0; i < 2; i++) {
      const gMat = new THREE.MeshBasicMaterial({
        color: this.accentColorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const gMesh = new THREE.Mesh(new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight), gMat);
      gMesh.position.set(0, spriteHeight * 0.5, -0.04 - i * 0.03);
      gMesh.visible = false;
      this.ghostMats.push(gMat);
      this.ghostMeshes.push(gMesh);
      this.spritePivot.add(gMesh);
    }

    this.group.add(this.spritePivot);

    const shadowTex = getSoftContactShadowTexture();
    this.baseShadowOpacity = shadowTex ? 0.85 : 0.3;
    this.shadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      color: shadowTex ? 0xffffff : 0x020617,
      transparent: true,
      opacity: this.baseShadowOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.shadowDisc = new THREE.Mesh(
      shadowTex ? new THREE.PlaneGeometry(1.18, 0.74) : new THREE.CircleGeometry(0.42, 20),
      this.shadowMat
    );
    this.shadowDisc.rotation.order = 'YXZ';
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.012;
    this.group.add(this.shadowDisc);

    // Preload all 4 poses for instant state swaps and capture idle height reference
    const smooth = Boolean(this.def.smoothFilter);
    void loadPoseMeta(this.def.poses.idle, smooth).then(
      (meta) => {
        if (!this.disposed) this.idlePixelHeight = meta.pixelHeight;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.walk, smooth).catch(() => {});
    void loadPoseMeta(this.def.poses.attack, smooth).catch(() => {});
    void loadPoseMeta(this.def.poses.pose, smooth).catch(() => {});
    void this.applyPose('idle');
  }

  private async applyPose(state: ChibiAnimState): Promise<void> {
    try {
      const url = stateToPoseUrl(this.def, state);
      const smooth = Boolean(this.def.smoothFilter);
      const [meta, idleMeta] = await Promise.all([
        loadPoseMeta(url, smooth),
        this.idlePixelHeight !== null ? Promise.resolve(null) : loadPoseMeta(this.def.poses.idle, smooth),
      ]);
      if (idleMeta && this.idlePixelHeight === null) {
        this.idlePixelHeight = idleMeta.pixelHeight;
      }
      if (this.disposed || this.animState !== state) return;

      const idlePx = this.idlePixelHeight ?? meta.pixelHeight;
      const refPx = idlePx * 0.65 + BASE_CHIBI_PIXEL_HEIGHT * 0.35;
      const unitPerPx = this.spriteHeight / Math.max(1, refPx);
      const rawH = meta.pixelHeight * unitPerPx;

      // Prevent shorter walk/attack frames from shrinking vertically ("gepeng")
      // while preserving exact 1:1 pixel aspect ratio.
      const h =
        state === 'aura'
          ? Math.min(Math.max(rawH, this.spriteHeight * 1.02), this.spriteHeight * 1.18)
          : Math.min(Math.max(rawH, this.spriteHeight * 0.96), this.spriteHeight * 1.14);
      const width = h * (meta.pixelWidth / Math.max(1, meta.pixelHeight));
      this.currentSpriteHeight = h;
      this.topTrimRatio = meta.topTrimRatio;

      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(width, h);
      this.mesh.position.y = h * 0.5;
      this.glintMesh.position.y = h * 0.56;

      for (let i = 0; i < this.ghostMeshes.length; i++) {
        const gm = this.ghostMeshes[i];
        gm.geometry.dispose();
        gm.geometry = new THREE.PlaneGeometry(width, h);
        gm.position.y = h * 0.5;
        this.ghostMats[i].map = meta.texture;
        this.ghostMats[i].needsUpdate = true;
      }

      this.material.map = meta.texture;
      this.material.color.set(this.hologramMode ? this.hologramTintHex : '#ffffff');
      this.material.opacity = this.hologramMode ? 0.52 : 1;
      this.material.depthWrite = !this.hologramMode;
      this.material.needsUpdate = true;

      this.depthMaterial.map = meta.texture;
      this.depthMaterial.needsUpdate = true;
      this.mesh.castShadow = !this.hologramMode;
    } catch {
      // Keep previous texture if asset fails to load
    }
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    if (low) {
      for (let i = 0; i < this.ghostMeshes.length; i++) {
        this.ghostMeshes[i].visible = false;
      }
    }
  }

  public setAnimState(state: ChibiAnimState): void {
    if (this.animState === state) return;
    this.animState = state;
    if (state !== 'attack') {
      this.attackSwingTimer = 0;
    }
    this.applyFacing();
    void this.applyPose(state);
  }

  public setFacing(sign: 1 | -1): void {
    this.facing = sign;
    this.applyFacing();
  }

  private applyFacing(): void {
    const invert =
      this.animState === 'dash'
        ? (this.def.walkFacesLeft ?? LEFT_FACING_WALK_IDS.has(this.def.id))
        : this.animState === 'attack'
          ? LEFT_FACING_ATTACK_IDS.has(this.def.id)
          : false;
    this.mesh.scale.x = invert ? -this.facing : this.facing;
  }

  public setAccentColor(hex: string): void {
    if (this.accentColorHex === hex) return;
    this.accentColorHex = hex;
    this.glintMat.color.set(hex);
    for (const gm of this.ghostMats) {
      gm.color.set(hex);
    }
  }

  public setHologramMode(enabled: boolean, tintHex = '#38bdf8'): void {
    this.hologramMode = enabled;
    this.hologramTintHex = tintHex;
    this.material.color.set(enabled ? tintHex : '#ffffff');
    this.material.depthWrite = !enabled;
    if (this.material.map) {
      this.material.opacity = enabled ? 0.52 : 1;
    } else if (enabled) {
      this.material.opacity = 0.52;
    }
    this.mesh.castShadow = !enabled && Boolean(this.material.map);
    this.material.needsUpdate = true;
  }

  public isHologramMode(): boolean {
    return this.hologramMode;
  }

  public getPoseDisplayMeta(): { texture: THREE.Texture | null; width: number; height: number } {
    const tex = this.material.map ?? null;
    const h = this.currentSpriteHeight;
    const img = tex?.image as { width?: number; height?: number } | undefined;
    const w = img?.width && img?.height ? h * (img.width / img.height) : h * 0.85;
    return { texture: tex, width: w, height: h };
  }

  /** Computes steady world-space anchor just above the tilted chibi sprite top. */
  public getLabelAnchorWorldPosition(out: THREE.Vector3, extraLocalClearance = 0.13): THREE.Vector3 {
    this.spritePivot.updateWorldMatrix(true, false);
    const peakPosY = this.animState === 'aura' ? 0.19 : 0.035;
    const peakScaleY = this.animState === 'aura' ? 1.04 : 1.032;
    const visibleRatio = Math.max(0.55, 1 - this.topTrimRatio);
    const localTopY = peakPosY + this.currentSpriteHeight * peakScaleY * visibleRatio + extraLocalClearance;
    out.set(0, localTopY, 0);
    return this.spritePivot.localToWorld(out);
  }

  public getComboStep(): number {
    return this.attackComboStep;
  }

  public triggerAttack(durationSec = 0.42, comboStep?: number): void {
    this.attackComboStep =
      comboStep !== undefined ? ((comboStep % 3) + 3) % 3 : this.nextComboStep;
    this.nextComboStep = (this.attackComboStep + 1) % 3;
    this.attackSwingDuration = Math.max(0.22, durationSec);
    this.attackSwingTimer = this.attackSwingDuration;
  }

  public triggerShowcase(durationSec = 1.4): void {
    this.showcaseTimer = durationSec;
  }

  public update(dtSec: number, elapsed: number, camera: THREE.Camera): void {
    this.group.getWorldPosition(this.worldPos);
    const dx = camera.position.x - this.worldPos.x;
    const dy = camera.position.y - this.worldPos.y;
    const dz = camera.position.z - this.worldPos.z;
    const horizDist = Math.max(0.001, Math.hypot(dx, dz));
    const camPitch = Math.atan2(dy, horizDist);

    // Partial spherical billboard: tilt back slightly toward elevated camera so chibis
    // stand squarely upright toward the viewer without foreshortening ("gepeng").
    this.spritePivot.rotation.order = 'YXZ';
    this.spritePivot.rotation.y = Math.atan2(dx, dz);
    this.spritePivot.rotation.x = -Math.max(0, Math.min(0.66, camPitch * 0.72));

    if (this.showcaseTimer > 0) {
      this.showcaseTimer = Math.max(0, this.showcaseTimer - dtSec);
      if (this.showcaseTimer > 0.7) {
        if (this.animState !== 'attack') {
          this.setAnimState('attack');
          this.triggerAttack(0.45);
        }
      } else if (this.showcaseTimer > 0) {
        this.setAnimState('aura');
      }
      if (this.showcaseTimer === 0) {
        this.setAnimState('idle');
      }
    }

    const t = elapsed * 2.8 + this.phaseOffset;
    let posX = 0;
    let posY = 0;
    let rotZ = 0;
    let scaleX = 1;
    let scaleY = 1;
    let shadowScale = 1;
    let showGlint = false;
    let glintProgress = 0;
    let showGhosts = false;
    let ghostAlpha = 0;

    if (this.animState === 'aura') {
      const hover = Math.sin(t * 1.7) * 0.05;
      posY = 0.14 + hover;
      rotZ = Math.sin(t * 0.9) * 0.025;
      scaleX = 1.02;
      scaleY = 1.04;
      shadowScale = 0.82 - hover * 0.4;
    } else if (this.animState === 'attack') {
      if (this.attackSwingTimer > 0) {
        this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dtSec);
        const p = 1 - this.attackSwingTimer / this.attackSwingDuration;

        if (p >= 0.02 && p <= 0.24) {
          showGlint = true;
          glintProgress = (p - 0.02) / 0.22;
        }
        if (p >= 0.16 && p <= 0.64) {
          showGhosts = true;
          ghostAlpha = 1 - (p - 0.16) / 0.48;
        }

        if (this.attackComboStep === 1) {
          // Beat 1: Quick low coil -> wider snap cross dash -> fast settle
          if (p < 0.18) {
            const k = p / 0.18;
            const ease = k * k;
            posX = -this.facing * 0.13 * ease;
            posY = 0.01 * ease;
            rotZ = this.facing * 0.14 * ease;
            scaleY = 1 - 0.06 * ease;
            scaleX = 1 + 0.05 * ease;
            shadowScale = 1.04;
          } else if (p < 0.44) {
            const k = (p - 0.18) / 0.26;
            const snap = 1 - (1 - k) * (1 - k);
            const arc = Math.sin(k * Math.PI);
            posX = this.facing * (-0.13 + 0.34 * snap);
            posY = 0.01 + 0.06 * arc;
            rotZ = this.facing * (0.14 - 0.38 * snap);
            scaleY = 0.94 + 0.08 * arc;
            scaleX = 1.05 + 0.06 * arc;
            shadowScale = 1.1;
          } else {
            const k = (p - 0.44) / 0.56;
            const rem = 1 - (1 - Math.pow(1 - k, 3));
            posX = this.facing * 0.21 * rem;
            posY = 0.015 * rem;
            rotZ = -this.facing * 0.24 * rem;
            scaleY = 1 + 0.025 * rem;
            scaleX = 1 - 0.02 * rem;
            shadowScale = 1.07 - 0.05 * (1 - rem);
          }
        } else if (this.attackComboStep === 2) {
          // Beat 2: Deep spring crouch -> high airborne jump smash -> landing bounce
          if (p < 0.22) {
            const k = p / 0.22;
            const ease = k * k;
            posX = -this.facing * 0.14 * ease;
            posY = 0;
            rotZ = this.facing * 0.2 * ease;
            scaleY = 1 - 0.1 * ease;
            scaleX = 1 + 0.08 * ease;
            shadowScale = 1.06;
          } else if (p < 0.48) {
            const k = (p - 0.22) / 0.26;
            const snap = 1 - (1 - k) * (1 - k);
            const arc = Math.sin(k * Math.PI);
            posX = this.facing * (-0.14 + 0.36 * snap);
            posY = 0.19 * arc;
            rotZ = this.facing * (0.2 - 0.48 * snap);
            scaleY = 0.9 + 0.2 * arc;
            scaleX = 1.08 - 0.11 * arc;
            shadowScale = 1.02 - 0.12 * arc;
          } else {
            const k = (p - 0.48) / 0.52;
            const rem = 1 - (1 - Math.pow(1 - k, 3));
            const landing = Math.sin(Math.min(1, k * 2.2) * Math.PI);
            posX = this.facing * 0.22 * rem;
            posY = 0.02 * rem;
            rotZ = -this.facing * 0.28 * rem;
            scaleY = 1 - 0.05 * landing + 0.03 * rem;
            scaleX = 1 + 0.04 * landing;
            shadowScale = 1.1 - 0.08 * (1 - rem);
          }
        } else if (p < 0.2) {
          // Beat 0 Phase 1: Quick anticipation coil & pullback
          const k = p / 0.2;
          const ease = k * k;
          posX = -this.facing * 0.11 * ease;
          posY = 0.02 * ease;
          rotZ = this.facing * 0.16 * ease;
          scaleY = 1 - 0.04 * ease;
          scaleX = 1 + 0.03 * ease;
          shadowScale = 1.02;
        } else if (p < 0.44) {
          // Beat 0 Phase 2: Snappy forward strike lunge & upright extension
          const k = (p - 0.2) / 0.24;
          const snap = 1 - (1 - k) * (1 - k);
          const arc = Math.sin(k * Math.PI);
          posX = this.facing * (-0.11 + 0.27 * snap);
          posY = 0.02 + 0.1 * arc;
          rotZ = this.facing * (0.16 - 0.4 * snap);
          scaleY = 0.96 + 0.12 * arc;
          scaleX = 1.03 - 0.07 * arc;
          shadowScale = 1.08;
        } else {
          // Beat 0 Phase 3: Smooth follow-through settle into ready stance
          const k = (p - 0.44) / 0.56;
          const settle = 1 - Math.pow(1 - k, 3);
          const rem = 1 - settle;
          posX = this.facing * 0.16 * rem;
          posY = 0.02 * rem;
          rotZ = -this.facing * 0.24 * rem;
          scaleY = 1 + 0.03 * rem;
          scaleX = 1 - 0.015 * rem;
          shadowScale = 1.06 - 0.05 * settle;
        }
      } else {
        // Alert upright combat-ready bounce between swings
        const ready = (Math.sin(t * 2.5) + 1) * 0.5;
        posY = 0.02 + ready * 0.035;
        rotZ = -this.facing * 0.035 + Math.sin(t * 2.5) * 0.025;
        scaleY = 1.0 + ready * 0.03;
        scaleX = 1.0 - ready * 0.015;
        shadowScale = 1.02;
      }
    } else if (this.animState === 'dash') {
      // Crisp 2-beat chibi stride: alternating lean + hop + tall mid-stride stretch
      const stepPhase = elapsed * 10.5 + this.phaseOffset;
      const sinStep = Math.sin(stepPhase);
      const hop = Math.pow(Math.abs(sinStep), 0.78);
      const stretch = (hop - 0.3) * 0.055;
      posY = hop * 0.14;
      rotZ = sinStep * 0.075 - this.facing * 0.045;
      scaleY = 1.0 + stretch;
      scaleX = 1.0 - stretch * 0.5;
      shadowScale = 1.0 - hop * 0.14;
    } else {
      // Upright breathing idle & gentle weight shift (never squashed flat)
      const breath = (Math.sin(elapsed * 2.5 + this.phaseOffset) + 1) * 0.5;
      posY = breath * 0.026;
      rotZ = Math.sin(elapsed * 1.25 + this.phaseOffset) * 0.022;
      scaleY = 1.0 + breath * 0.032;
      scaleX = 1.0 - breath * 0.014;
      shadowScale = 1.0 - breath * 0.04;
    }

    this.animGroup.position.set(posX, posY, 0);
    this.animGroup.rotation.z = rotZ;
    this.animGroup.scale.set(scaleX, scaleY, 1);

    this.glintMesh.visible = showGlint;
    if (showGlint) {
      const pulse = Math.sin(glintProgress * Math.PI);
      this.glintMesh.position.x = -this.facing * 0.16;
      this.glintMesh.rotation.z = glintProgress * Math.PI * 0.75;
      this.glintMesh.scale.setScalar(0.36 + pulse * 0.84);
      this.glintMat.opacity = 0.94 * pulse;
    }

    const baseHeightOffset = this.mesh.position.y;
    const renderGhosts = showGhosts && !this.lowQuality;
    for (let i = 0; i < this.ghostMeshes.length; i++) {
      const gm = this.ghostMeshes[i];
      const gMat = this.ghostMats[i];
      gm.visible = renderGhosts;
      if (renderGhosts) {
        const trailDist = 0.14 + i * 0.15;
        gm.position.set(
          posX - this.facing * trailDist,
          baseHeightOffset + posY * (0.72 - i * 0.2),
          -0.04 - i * 0.03
        );
        gm.rotation.z = rotZ * (0.65 - i * 0.22);
        gm.scale.set(this.mesh.scale.x * scaleX, scaleY, 1);
        gMat.opacity = gMat.map ? Math.max(0, (0.48 - i * 0.18) * ghostAlpha) : 0;
      }
    }

    const yaw = this.spritePivot.rotation.y;
    const heightFactor = Math.max(0.42, 1 - posY * 1.45);
    this.shadowDisc.rotation.y = yaw;
    this.shadowDisc.position.x = Math.cos(yaw) * posX * 0.65;
    this.shadowDisc.position.z = -Math.sin(yaw) * posX * 0.65;
    this.shadowDisc.scale.setScalar(shadowScale * (0.86 + 0.14 * heightFactor));
    this.shadowMat.opacity = this.baseShadowOpacity * heightFactor * (this.hologramMode ? 0.32 : 1);
    if (this.hologramMode && this.material.map) {
      this.material.opacity = 0.45 + Math.sin(elapsed * 4.5 + this.phaseOffset) * 0.1;
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.glintMesh.geometry.dispose();
    this.glintMat.dispose();
    for (let i = 0; i < this.ghostMeshes.length; i++) {
      this.ghostMeshes[i].geometry.dispose();
      this.ghostMats[i].dispose();
    }
    this.shadowDisc.geometry.dispose();
    this.shadowMat.dispose();
  }
}
