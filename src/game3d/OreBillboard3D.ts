import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import { type WeatherId } from '../game/WeatherData';
import { applySharpSpriteTexture } from './MeshHelpers3D';

const spriteTexCache = new Map<string, Promise<THREE.Texture>>();
const spriteTexLoader = new THREE.TextureLoader();
let softContactShadowTex: THREE.CanvasTexture | null | undefined;
let oreCraterSocketTex: THREE.CanvasTexture | null | undefined;
let geodeGlowTex: THREE.CanvasTexture | null | undefined;

const sharedCollarRockGeo = new THREE.DodecahedronGeometry(0.18, 0);
const sharedCollarPebbleGeo = new THREE.DodecahedronGeometry(0.105, 0);
const sharedCollarCrystalGeo = new THREE.CylinderGeometry(0.012, 0.056, 0.24, 5);
let sharedCollarRockMat: THREE.MeshStandardMaterial | null = null;

function getSharedCollarRockMaterial(): THREE.MeshStandardMaterial {
  if (!sharedCollarRockMat) {
    sharedCollarRockMat = new THREE.MeshStandardMaterial({
      color: 0x354764,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: true,
    });
  }
  return sharedCollarRockMat;
}

export function getSoftContactShadowTexture(): THREE.CanvasTexture | null {
  if (softContactShadowTex !== undefined) return softContactShadowTex;
  if (typeof document === 'undefined') {
    softContactShadowTex = null;
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    softContactShadowTex = null;
    return null;
  }
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.45, 'rgba(2, 6, 23, 0.42)');
  grad.addColorStop(0.78, 'rgba(2, 6, 23, 0.14)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  softContactShadowTex = tex;
  return tex;
}

/**
 * Procedural cracked basalt impact socket & deep crevice ambient occlusion decal
 * used to anchor 2.5D ore sprites physically onto quarry stone.
 */
function getOreCraterSocketTexture(): THREE.CanvasTexture | null {
  if (oreCraterSocketTex !== undefined) return oreCraterSocketTex;
  if (typeof document === 'undefined') {
    oreCraterSocketTex = null;
    return null;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    oreCraterSocketTex = null;
    return null;
  }
  const mid = size * 0.5;

  // Deep centered contact AO pool fading outward so rock edges melt into floor
  const aoGrad = ctx.createRadialGradient(mid, mid, 6, mid, mid, 118);
  aoGrad.addColorStop(0, 'rgba(2, 5, 14, 0.94)');
  aoGrad.addColorStop(0.36, 'rgba(4, 9, 22, 0.76)');
  aoGrad.addColorStop(0.62, 'rgba(8, 15, 32, 0.34)');
  aoGrad.addColorStop(0.84, 'rgba(10, 18, 36, 0.08)');
  aoGrad.addColorStop(1, 'rgba(10, 18, 36, 0)');
  ctx.fillStyle = aoGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle carved basalt rim highlight
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(mid, mid, 68, 0.25, Math.PI - 0.25);
  ctx.stroke();

  // Radial stress fractures & bevel highlights radiating into the quarry floor
  const crackCount = 8;
  for (let i = 0; i < crackCount; i++) {
    const baseAngle = (i / crackCount) * Math.PI * 2 + (i % 2 === 0 ? 0.14 : -0.18);
    const len1 = 36 + ((i * 19) % 14);
    const len2 = 66 + ((i * 23) % 18);
    const len3 = 96 + ((i * 17) % 18);
    const a1 = baseAngle + (i % 2 === 0 ? 0.09 : -0.09);
    const a2 = baseAngle + (i % 3 === 0 ? -0.14 : 0.12);

    const x0 = mid + Math.cos(baseAngle) * 24;
    const y0 = mid + Math.sin(baseAngle) * 24;
    const x1 = mid + Math.cos(a1) * len1;
    const y1 = mid + Math.sin(a1) * len1;
    const x2 = mid + Math.cos(a2) * len2;
    const y2 = mid + Math.sin(a2) * len2;
    const x3 = mid + Math.cos(baseAngle) * len3;
    const y3 = mid + Math.sin(baseAngle) * len3;

    ctx.strokeStyle = 'rgba(2, 4, 12, 0.72)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.09)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x0 + 1.5, y0 + 1.5);
    ctx.lineTo(x1 + 1.5, y1 + 1.5);
    ctx.lineTo(x2 + 1.2, y2 + 1.2);
    ctx.stroke();
  }

  // Scattered dark basalt & slate gravel specks around the socket
  for (let i = 0; i < 20; i++) {
    const ang = (i * 2.39996) % (Math.PI * 2);
    const dist = 48 + ((i * 29) % 52);
    const px = mid + Math.cos(ang) * dist;
    const py = mid + Math.sin(ang) * dist;
    const rad = 1.8 + (i % 3) * 0.9;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(148, 163, 184, 0.22)' : 'rgba(2, 6, 18, 0.58)';
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  oreCraterSocketTex = tex;
  return tex;
}

export function getGeodeGlowTexture(): THREE.CanvasTexture | null {
  if (geodeGlowTex !== undefined) return geodeGlowTex;
  if (typeof document === 'undefined') {
    geodeGlowTex = null;
    return null;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    geodeGlowTex = null;
    return null;
  }
  const mid = size * 0.5;
  const rad = ctx.createRadialGradient(mid, mid, 14, mid, mid, 122);
  rad.addColorStop(0, 'rgba(255,255,255,0.12)');
  rad.addColorStop(0.54, 'rgba(255,255,255,0.16)');
  rad.addColorStop(0.78, 'rgba(255,255,255,0.52)');
  rad.addColorStop(0.92, 'rgba(255,255,255,0.1)');
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(mid, mid, 94, 0, Math.PI * 2);
  ctx.stroke();

  // Six feathered mineral fissure beams seeping from under the rock collar
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.22;
    const g = ctx.createLinearGradient(
      mid + Math.cos(a) * 44,
      mid + Math.sin(a) * 44,
      mid + Math.cos(a) * 114,
      mid + Math.sin(a) * 114
    );
    g.addColorStop(0, 'rgba(255,255,255,0.72)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * 44, mid + Math.sin(a) * 44);
    ctx.lineTo(mid + Math.cos(a + 0.06) * 82, mid + Math.sin(a + 0.06) * 82);
    ctx.lineTo(mid + Math.cos(a) * 114, mid + Math.sin(a) * 114);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  geodeGlowTex = tex;
  return tex;
}

export function loadPublicSpriteTexture(publicPath: string): Promise<THREE.Texture> {
  const url = assetUrl(publicPath);
  const cached = spriteTexCache.get(url);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('No DOM Image available'));
      return;
    }
    spriteTexLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        applySharpSpriteTexture(tex, false);
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
  spriteTexCache.set(url, promise);
  return promise;
}

/**
 * Reusable 2D illustrated ore billboard sprite with directional + contact shadows
 * and squash-on-hit ("gepeng") animation shared by OrePit3D and TowerArena3D.
 */
export class OreBillboard2D {
  public readonly root = new THREE.Group();
  private readonly spritePivot = new THREE.Group();
  private readonly visualGroup = new THREE.Group();
  private readonly spriteMesh: THREE.Mesh;
  private readonly spriteMat: THREE.MeshBasicMaterial;
  private readonly depthMat: THREE.MeshDepthMaterial;
  private readonly shadowDisc: THREE.Mesh;
  private readonly rockSkirtGroup = new THREE.Group();
  private readonly collarCrystalMat: THREE.MeshStandardMaterial;
  private readonly tmpWorldPos = new THREE.Vector3();

  private baseSize = 1.45;
  private oreId = '';

  constructor(initialSize = 1.45) {
    this.baseSize = initialSize;
    this.spritePivot.rotation.order = 'YXZ';
    this.visualGroup.scale.set(initialSize, initialSize, 1);
    this.spritePivot.add(this.visualGroup);
    this.root.add(this.spritePivot);

    this.spriteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      depthWrite: true,
      opacity: 0,
    });
    this.depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    });

    this.spriteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.spriteMat);
    // Anchor rock base deep into floor socket so transparent sprite margins sink cleanly behind 3D rubble
    this.spriteMesh.position.y = 0.35;
    this.spriteMesh.customDepthMaterial = this.depthMat;
    this.spriteMesh.castShadow = false;
    this.visualGroup.add(this.spriteMesh);

    const craterTex = getOreCraterSocketTexture() ?? getSoftContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      ...(craterTex ? { map: craterTex } : {}),
      color: craterTex ? 0xffffff : 0x020617,
      transparent: true,
      opacity: craterTex ? 0.92 : 0.34,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.shadowDisc = new THREE.Mesh(
      craterTex ? new THREE.PlaneGeometry(2.05, 1.82) : new THREE.CircleGeometry(0.68, 20),
      shadowMat
    );
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.024;
    this.root.add(this.shadowDisc);

    // 3D Low-Poly Basalt Rubble + Crystal Collar wrapping the 2D sprite seam onto the floor
    const rockMat = getSharedCollarRockMaterial();
    this.collarCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.25,
      flatShading: true,
    });

    const chunkSpecs: readonly [number, number, number, number, number, number, number, number][] = [
      // Tightly hugging front & flank basalt chunks physically bridge the bottom seam of every sprite
      [-0.02, 0.088, 0.33, 1.24, 0.72, 0.9, 0.16, 0.22],
      [-0.25, 0.082, 0.32, 1.12, 0.68, 0.86, 0.28, -0.35],
      [0.25, 0.084, 0.31, 1.08, 0.68, 0.86, -0.22, 0.42],
      [-0.42, 0.09, 0.12, 0.98, 0.78, 0.9, 0.4, 0.85],
      [0.42, 0.092, 0.11, 1.0, 0.8, 0.88, -0.34, -0.75],
      [-0.36, 0.095, -0.22, 1.06, 0.84, 0.92, 0.15, 1.4],
      [0.36, 0.095, -0.21, 1.04, 0.82, 0.92, -0.18, -1.2],
      [0.01, 0.096, -0.36, 1.2, 0.78, 0.86, 0.12, 0.65],
    ];
    for (const [cx, cy, cz, sx, sy, sz, rx, ry] of chunkSpecs) {
      const chunk = new THREE.Mesh(sharedCollarRockGeo, rockMat);
      chunk.position.set(cx, cy, cz);
      chunk.scale.set(sx, sy, sz);
      chunk.rotation.set(rx, ry, rx * 0.6);
      chunk.castShadow = true;
      chunk.receiveShadow = true;
      this.rockSkirtGroup.add(chunk);
    }

    const pebbleSpecs: readonly [number, number, number, number][] = [
      [-0.56, 0.044, 0.28, 1.02],
      [0.56, 0.042, 0.29, 0.95],
      [-0.14, 0.046, 0.49, 0.92],
      [0.18, 0.044, 0.48, 0.84],
    ];
    for (const [px, py, pz, s] of pebbleSpecs) {
      const p = new THREE.Mesh(sharedCollarPebbleGeo, rockMat);
      p.position.set(px, py, pz);
      p.scale.set(s * 1.15, s * 0.58, s);
      p.rotation.set(px, pz * 2, py * 3);
      p.castShadow = true;
      p.receiveShadow = true;
      this.rockSkirtGroup.add(p);
    }

    const crystalSpecs: readonly [number, number, number, number, number][] = [
      [-0.33, 0.12, 0.26, 0.36, 0.28],
      [0.34, 0.125, 0.25, -0.34, -0.28],
      [0.02, 0.135, -0.34, 0.12, -0.3],
    ];
    for (const [kx, ky, kz, rz, rx] of crystalSpecs) {
      const shard = new THREE.Mesh(sharedCollarCrystalGeo, this.collarCrystalMat);
      shard.position.set(kx, ky, kz);
      shard.rotation.set(rx, ky * 3, rz);
      shard.castShadow = true;
      this.rockSkirtGroup.add(shard);
    }

    this.root.add(this.rockSkirtGroup);
    const initScale = initialSize / 1.45;
    this.shadowDisc.scale.setScalar(initScale);
    this.rockSkirtGroup.scale.setScalar(initScale);
  }

  public setCollarAccent(colorHex: string | number): void {
    this.collarCrystalMat.color.set(colorHex);
    this.collarCrystalMat.emissive.set(colorHex);
  }

  public setCollarVisible(visible: boolean): void {
    this.rockSkirtGroup.visible = visible;
    this.shadowDisc.visible = visible;
  }

  public setOre(oreId: string, baseSize: number): void {
    this.setSprite(`ore:${oreId}`, `/ores/${oreId}.webp`, baseSize);
  }

  public setMeteor(weatherId: WeatherId, baseSize: number): void {
    this.setSprite(`meteor:${weatherId}`, `/meteors/${weatherId}.webp`, baseSize);
  }

  private setSprite(spriteKey: string, urlPath: string, baseSize: number): void {
    this.baseSize = baseSize;
    const collarScale = baseSize / 1.45;
    this.shadowDisc.scale.setScalar(collarScale);
    this.rockSkirtGroup.scale.setScalar(collarScale);
    if (spriteKey === this.oreId) return;
    this.oreId = spriteKey;

    void loadPublicSpriteTexture(urlPath)
      .then((tex) => {
        if (this.oreId !== spriteKey) return;
        this.spriteMat.map = tex;
        this.spriteMat.opacity = 1;
        this.spriteMat.needsUpdate = true;
        this.depthMat.map = tex;
        this.depthMat.needsUpdate = true;
        this.spriteMesh.castShadow = true;
      })
      .catch(() => {
        // Safe no-op in headless tests
      });
  }

  public updateTransform(
    elapsed: number,
    phase: number,
    squashAmt: number,
    scaleMult: number,
    flashActive: boolean,
    camera?: THREE.Camera,
    recoilX = 0,
    rollOverride = 0,
    stretchY = 1
  ): void {
    if (camera) {
      this.root.getWorldPosition(this.tmpWorldPos);
      const dx = camera.position.x - this.tmpWorldPos.x;
      const dy = camera.position.y - this.tmpWorldPos.y;
      const dz = camera.position.z - this.tmpWorldPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      const camPitch = Math.atan2(dy, horizDist);
      this.spritePivot.rotation.y = Math.atan2(dx, dz);
      this.spritePivot.rotation.x = -Math.max(0, Math.min(0.62, camPitch * 0.65));
    }

    const sy = Math.max(0.32, 1 - squashAmt) * this.baseSize * scaleMult * stretchY;
    const sx = (1 + squashAmt * 0.85) * this.baseSize * scaleMult / Math.sqrt(Math.max(0.6, stretchY));
    const tremor = squashAmt > 0.005 ? Math.sin(elapsed * 64 + phase) * squashAmt * 0.14 : 0;
    this.visualGroup.scale.set(sx, sy, 1);
    // Keep rock firmly grounded in its stone crater (zero idle hover float)
    this.visualGroup.position.set(tremor + recoilX, 0, 0);
    this.visualGroup.rotation.z = rollOverride !== 0 ? rollOverride : recoilX === 0 ? 0 : -recoilX * 0.42;
    const collarMult = (this.baseSize / 1.45) * Math.max(0.08, Math.min(1.06, scaleMult));
    this.shadowDisc.scale.setScalar(collarMult * (1 + squashAmt * 0.25));
    this.rockSkirtGroup.scale.set(
      collarMult * (1 + squashAmt * 0.16),
      collarMult,
      collarMult * (1 + squashAmt * 0.16)
    );
    this.spriteMat.color.setHex(flashActive ? 0xffe4b5 : 0xffffff);
  }

  public dispose(): void {
    this.spriteMesh.geometry.dispose();
    this.shadowDisc.geometry.dispose();
    (this.shadowDisc.material as THREE.Material).dispose();
    this.spriteMat.dispose();
    this.depthMat.dispose();
    this.collarCrystalMat.dispose();
  }
}
