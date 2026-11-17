import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import {
  ChibiAnimState,
  ChibiDef,
  LEFT_FACING_ATTACK_IDS,
  LEFT_FACING_WALK_IDS,
} from './ChibiCatalog';

interface LoadedPoseMeta {
  texture: THREE.Texture;
  pixelWidth: number;
  pixelHeight: number;
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
        if (smoothFilter) {
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
        } else {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
        }
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;

        const img = tex.image as HTMLImageElement;
        resolve({ texture: tex, pixelWidth: img.width, pixelHeight: img.height });
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

  private readonly def: ChibiDef;
  private readonly spriteHeight: number;
  private readonly phaseOffset: number;
  private readonly worldPos = new THREE.Vector3();

  private animState: ChibiAnimState = 'idle';
  private facing: 1 | -1 = 1;
  private showcaseTimer = 0;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.42;
  private idlePixelHeight: number | null = null;
  private disposed = false;

  constructor(def: ChibiDef, spriteHeight = 1.24, phaseOffset = 0) {
    this.def = def;
    this.spriteHeight = spriteHeight;
    this.phaseOffset = phaseOffset;

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
    this.spritePivot.add(this.animGroup);
    this.group.add(this.spritePivot);

    const shadowTex = getSoftContactShadowTexture();
    this.baseShadowOpacity = shadowTex ? 0.85 : 0.3;
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
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

      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(width, h);
      this.mesh.position.y = h * 0.5;

      this.material.map = meta.texture;
      this.material.opacity = 1;
      this.material.needsUpdate = true;

      this.depthMaterial.map = meta.texture;
      this.depthMaterial.needsUpdate = true;
      this.mesh.castShadow = true;
    } catch {
      // Keep previous texture if asset fails to load
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

  public triggerAttack(durationSec = 0.42): void {
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

        if (p < 0.2) {
          // Phase 1: Quick anticipation coil & pullback
          const k = p / 0.2;
          const ease = k * k;
          posX = -this.facing * 0.11 * ease;
          posY = 0.02 * ease;
          rotZ = this.facing * 0.16 * ease;
          scaleY = 1 - 0.04 * ease;
          scaleX = 1 + 0.03 * ease;
          shadowScale = 1.02;
        } else if (p < 0.44) {
          // Phase 2: Snappy forward strike lunge & upright extension (slash reaches target, body stays outside)
          const k = (p - 0.2) / 0.24;
          const snap = 1 - (1 - k) * (1 - k);
          const arc = Math.sin(k * Math.PI);
          posX = this.facing * (-0.11 + 0.25 * snap);
          posY = 0.02 + 0.09 * arc;
          rotZ = this.facing * (0.16 - 0.38 * snap);
          scaleY = 0.96 + 0.11 * arc;
          scaleX = 1.03 - 0.07 * arc;
          shadowScale = 1.08;
        } else {
          // Phase 3: Smooth follow-through settle into ready stance
          const k = (p - 0.44) / 0.56;
          const settle = 1 - Math.pow(1 - k, 3);
          const rem = 1 - settle;
          posX = this.facing * 0.14 * rem;
          posY = 0.02 * rem;
          rotZ = -this.facing * 0.22 * rem;
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

    const yaw = this.spritePivot.rotation.y;
    const heightFactor = Math.max(0.42, 1 - posY * 1.45);
    this.shadowDisc.rotation.y = yaw;
    this.shadowDisc.position.x = Math.cos(yaw) * posX * 0.65;
    this.shadowDisc.position.z = -Math.sin(yaw) * posX * 0.65;
    this.shadowDisc.scale.setScalar(shadowScale * (0.86 + 0.14 * heightFactor));
    this.shadowMat.opacity = this.baseShadowOpacity * heightFactor;
  }

  public dispose(): void {
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.shadowDisc.geometry.dispose();
    this.shadowMat.dispose();
  }
}
