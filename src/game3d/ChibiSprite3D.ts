import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import { ChibiAnimState, ChibiDef } from './ChibiCatalog';

interface LoadedPoseMeta {
  texture: THREE.Texture;
  pixelWidth: number;
  pixelHeight: number;
}

const BASE_CHIBI_PIXEL_HEIGHT = 350;
const poseCache = new Map<string, Promise<LoadedPoseMeta>>();
const textureLoader = new THREE.TextureLoader();

function loadPoseMeta(url: string): Promise<LoadedPoseMeta> {
  const resolved = assetUrl(url);
  const cached = poseCache.get(resolved);
  if (cached) return cached;

  const promise = new Promise<LoadedPoseMeta>((resolve, reject) => {
    textureLoader.load(
      resolved,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
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

  poseCache.set(url, promise);
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
  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly shadowDisc: THREE.Mesh;

  private readonly def: ChibiDef;
  private readonly spriteHeight: number;
  private readonly phaseOffset: number;
  private readonly worldPos = new THREE.Vector3();

  private animState: ChibiAnimState = 'idle';
  private showcaseTimer = 0;
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

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight), this.material);
    this.mesh.position.y = spriteHeight * 0.48;
    this.spritePivot.add(this.mesh);
    this.group.add(this.spritePivot);

    this.shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 20),
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.008;
    this.group.add(this.shadowDisc);

    // Preload all 4 poses for instant state swaps
    void loadPoseMeta(this.def.poses.walk);
    void loadPoseMeta(this.def.poses.attack);
    void loadPoseMeta(this.def.poses.pose);
    void this.applyPose('idle');
  }

  private async applyPose(state: ChibiAnimState): Promise<void> {
    try {
      const url = stateToPoseUrl(this.def, state);
      const meta = await loadPoseMeta(url);
      if (this.disposed || this.animState !== state) return;

      const unitPerPx = this.spriteHeight / BASE_CHIBI_PIXEL_HEIGHT;
      const h = meta.pixelHeight * unitPerPx;
      const width = meta.pixelWidth * unitPerPx;
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(width, h);
      this.mesh.position.y = h * 0.48;

      this.material.map = meta.texture;
      this.material.opacity = 1;
      this.material.needsUpdate = true;
    } catch {
      // Keep previous texture if asset fails to load
    }
  }

  public setAnimState(state: ChibiAnimState): void {
    if (this.animState === state) return;
    this.animState = state;
    void this.applyPose(state);
  }

  public setFacing(sign: 1 | -1): void {
    this.mesh.scale.x = sign;
  }

  public triggerShowcase(durationSec = 1.4): void {
    this.showcaseTimer = durationSec;
  }

  public update(dtSec: number, elapsed: number, camera: THREE.Camera): void {
    this.group.getWorldPosition(this.worldPos);
    const dx = camera.position.x - this.worldPos.x;
    const dz = camera.position.z - this.worldPos.z;
    this.spritePivot.rotation.y = Math.atan2(dx, dz);

    if (this.showcaseTimer > 0) {
      this.showcaseTimer = Math.max(0, this.showcaseTimer - dtSec);
      if (this.showcaseTimer > 0.7) {
        this.setAnimState('attack');
      } else if (this.showcaseTimer > 0) {
        this.setAnimState('aura');
      }
      if (this.showcaseTimer === 0) {
        this.setAnimState('idle');
      }
    }

    const t = elapsed * 3.2 + this.phaseOffset;
    if (this.animState === 'aura') {
      const hoverY = 0.14 + Math.sin(t * 1.8) * 0.05;
      this.spritePivot.position.y = hoverY;
      this.spritePivot.scale.set(1.04, 1.04, 1);
      this.shadowDisc.scale.setScalar(0.82);
    } else if (this.animState === 'attack') {
      const pulse = 1 + Math.sin(t * 6) * 0.05;
      this.spritePivot.position.y = 0.04;
      this.spritePivot.scale.set(pulse, 1 / pulse, 1);
      this.shadowDisc.scale.setScalar(1.08);
    } else if (this.animState === 'dash') {
      this.spritePivot.position.y = Math.abs(Math.sin(t * 3.5)) * 0.08;
      this.spritePivot.scale.set(1.02, 0.98, 1);
      this.shadowDisc.scale.setScalar(0.95);
    } else {
      const bob = Math.sin(t) * 0.018;
      this.spritePivot.position.y = Math.max(0, bob);
      this.spritePivot.scale.set(1 - bob * 0.5, 1 + bob * 0.8, 1);
      this.shadowDisc.scale.setScalar(1);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.shadowDisc.geometry.dispose();
    (this.shadowDisc.material as THREE.Material).dispose();
  }
}
