import * as THREE from 'three';
import { getSoftContactShadowTexture, loadPublicSpriteTexture } from './OrePit3D';

function auraMat(
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation = color,
  emissiveIntensity = 0.45,
  roughness = 0.22,
  metalness = 0.25
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  });
}

function addFlameBlazing(g: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.3, 0),
    auraMat(0xfde047, 0xf97316, 0.85, 0.2, 0.1)
  );
  g.add(core);

  const outerMat = auraMat(0xf97316, 0xea580c, 0.65, 0.28, 0.1);
  const tipMat = auraMat(0xfef08a, 0xfacc15, 0.8, 0.2, 0.05);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.64, 5), i % 2 === 0 ? outerMat : tipMat);
    spike.position.set(Math.cos(ang) * 0.34, 0.14 + (i % 2) * 0.08, Math.sin(ang) * 0.34);
    spike.rotation.z = -Math.cos(ang) * 0.35;
    spike.rotation.x = Math.sin(ang) * 0.35;
    g.add(spike);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.055, 8, 28), auraMat(0xef4444, 0xdc2626, 0.55));
  ring.rotation.set(Math.PI / 2.3, 0.2, 0);
  g.add(ring);
}

function addFrostGlacial(g: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    auraMat(0xe0f2fe, 0x38bdf8, 0.75, 0.12, 0.35)
  );
  core.scale.set(0.9, 1.3, 0.9);
  g.add(core);

  const shardMat = auraMat(0x38bdf8, 0x0284c7, 0.55, 0.15, 0.4);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.68, 4), shardMat);
    shard.position.set(Math.cos(ang) * 0.36, 0.08, Math.sin(ang) * 0.36);
    shard.rotation.z = -Math.cos(ang) * 0.55;
    shard.rotation.x = Math.sin(ang) * 0.55;
    g.add(shard);
  }

  const hexRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 6, 6), auraMat(0xbae6fd, 0x38bdf8, 0.6));
  hexRing.rotation.set(Math.PI / 2.2, 0, Math.PI / 6);
  g.add(hexRing);
}

function addEarthQuaking(g: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.36, 0),
    auraMat(0x92400e, 0x78350f, 0.3, 0.72, 0.15)
  );
  g.add(core);

  const rockMat = auraMat(0xd97706, 0xb45309, 0.45, 0.58, 0.2);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.56, 4), rockMat);
    spire.position.set(Math.cos(ang) * 0.4, -0.02, Math.sin(ang) * 0.4);
    spire.rotation.z = -Math.cos(ang) * 0.48;
    spire.rotation.x = Math.sin(ang) * 0.48;
    g.add(spire);
  }

  const shock = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 20), auraMat(0xf59e0b, 0xd97706, 0.55));
  shock.rotation.x = Math.PI / 2.15;
  shock.position.y = -0.18;
  g.add(shock);
}

function addWaveSurging(g: THREE.Group): void {
  const pearl = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 14),
    auraMat(0x67e8f9, 0x06b6d4, 0.75, 0.12, 0.3)
  );
  g.add(pearl);

  const waveMatA = auraMat(0x22d3ee, 0x0891b2, 0.6, 0.18, 0.25);
  const waveMatB = auraMat(0x38bdf8, 0x0284c7, 0.55, 0.18, 0.25);
  for (let i = 0; i < 2; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.085, 10, 22, Math.PI * 1.35), i === 0 ? waveMatA : waveMatB);
    arc.rotation.set(0.55 + i * 0.4, i * Math.PI, 0.45);
    g.add(arc);
  }

  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), waveMatA);
    drop.position.set(Math.cos(ang) * 0.64, Math.sin(ang * 2) * 0.24, Math.sin(ang) * 0.64);
    g.add(drop);
  }
}

function addSunRadiant(g: THREE.Group): void {
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 14),
    auraMat(0xfef08a, 0xfacc15, 0.95, 0.15, 0.2)
  );
  g.add(sun);

  const rayMat = auraMat(0xfacc15, 0xeab308, 0.7, 0.2, 0.55);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 4), rayMat);
    ray.position.set(Math.cos(ang) * 0.54, Math.sin(ang) * 0.54, 0);
    ray.rotation.z = ang - Math.PI / 2;
    g.add(ray);
  }

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 28), auraMat(0xfef08a, 0xf59e0b, 0.7));
  halo.rotation.x = 0.35;
  g.add(halo);
}

function addStormThundering(g: THREE.Group): void {
  const cloudMat = auraMat(0x4c1d95, 0x3b0764, 0.35, 0.65, 0.1);
  for (const [cx, cy, cz, cr] of [
    [0, 0.28, 0, 0.27],
    [-0.26, 0.2, 0.06, 0.21],
    [0.26, 0.22, -0.04, 0.22],
  ]) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(cr, 1), cloudMat);
    puff.position.set(cx, cy, cz);
    g.add(puff);
  }

  const boltMat = auraMat(0xfde047, 0xfacc15, 0.95, 0.15, 0.4);
  for (const bx of [-0.14, 0.18]) {
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.08), boltMat);
    seg1.position.set(bx, -0.06, 0.05);
    seg1.rotation.z = -0.35;
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), boltMat);
    seg2.position.set(bx + 0.05, -0.34, 0.05);
    seg2.rotation.z = 0.28;
    g.add(seg1, seg2);
  }

  const arcRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 8, 24), auraMat(0xa855f7, 0x9333ea, 0.7));
  arcRing.rotation.set(Math.PI / 2.2, 0.25, 0);
  g.add(arcRing);
}

function addAtomCataclysmic(g: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    auraMat(0xfef08a, 0xf59e0b, 0.9, 0.18, 0.35)
  );
  g.add(core);

  const ringMat = auraMat(0xf59e0b, 0xd97706, 0.65, 0.22, 0.65);
  const orbMat = auraMat(0xfde047, 0xfacc15, 0.9, 0.15, 0.3);
  const tilts: Array<[number, number, number]> = [
    [0.55, 0.2, 0],
    [-0.55, 0.8, 0.45],
    [0.2, -0.75, 1.15],
  ];
  for (let i = 0; i < tilts.length; i++) {
    const [rx, ry, rz] = tilts[i];
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.set(rx, ry, rz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.048, 8, 28), ringMat);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), orbMat);
    orb.position.set(0.68, 0, 0);
    orbitGroup.add(ring, orb);
    g.add(orbitGroup);
  }
}

function addSlashSundering(g: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    auraMat(0x7f1d1d, 0xef4444, 0.65, 0.2, 0.4)
  );
  g.add(core);

  const bladeMat = auraMat(0xef4444, 0xdc2626, 0.8, 0.18, 0.65);
  for (let i = 0; i < 2; i++) {
    const slash = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 20, Math.PI * 1.15), bladeMat);
    slash.rotation.set(0.45, i === 0 ? 0.4 : -0.4, i === 0 ? 0.65 : -0.65);
    g.add(slash);
  }

  const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 28), auraMat(0xf87171, 0xef4444, 0.6));
  vortex.rotation.x = Math.PI / 2.25;
  vortex.position.y = -0.15;
  g.add(vortex);
}

function addHourglassTimeless(g: THREE.Group): void {
  const frameMat = auraMat(0xfde047, 0xca8a04, 0.45, 0.22, 0.78);
  const glassMat = auraMat(0xf8fafc, 0xcbd5e1, 0.55, 0.12, 0.35);
  const sandMat = auraMat(0xfacc15, 0xf59e0b, 0.8, 0.3, 0.2);

  for (const cy of [-0.46, 0.46]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12), frameMat);
    cap.position.y = cy;
    g.add(cap);
  }
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.9, 6), frameMat);
    post.position.set(Math.cos(ang) * 0.29, 0, Math.sin(ang) * 0.29);
    g.add(post);
  }

  const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.44, 12), glassMat);
  topCone.rotation.x = Math.PI;
  topCone.position.y = 0.21;
  const botCone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.44, 12), glassMat);
  botCone.position.y = -0.21;
  const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.26, 10), sandMat);
  sandBot.position.y = -0.28;
  g.add(topCone, botCone, sandBot);

  const chronoRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.042, 8, 28), auraMat(0xf8fafc, 0xe2e8f0, 0.65));
  chronoRing.rotation.set(Math.PI / 2.4, 0.25, 0);
  g.add(chronoRing);
}

function addPortalSpellbound(g: THREE.Group): void {
  const star1 = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0),
    auraMat(0xf0abfc, 0xe879f9, 0.9, 0.12, 0.45)
  );
  const star2 = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    auraMat(0x67e8f9, 0x22d3ee, 0.85, 0.12, 0.45)
  );
  star2.rotation.set(Math.PI / 4, Math.PI / 4, 0);
  g.add(star1, star2);

  const ringSpecs: Array<[number, number, number, number, number]> = [
    [0.54, 0xe879f9, 0.7, 0.3, 0],
    [0.66, 0x22d3ee, -0.65, 0.85, 0.4],
    [0.76, 0xfacc15, 0.25, -0.6, 1.05],
  ];
  for (const [r, col, rx, ry, rz] of ringSpecs) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.048, 8, 28), auraMat(col, col, 0.72));
    ring.rotation.set(rx, ry, rz);
    g.add(ring);
  }

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const rune = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      auraMat(i % 2 === 0 ? 0xfacc15 : 0x38bdf8, i % 2 === 0 ? 0xf59e0b : 0x0284c7, 0.85)
    );
    rune.position.set(Math.cos(ang) * 0.68, Math.sin(ang) * 0.22, Math.sin(ang) * 0.68);
    g.add(rune);
  }
}

/**
 * Creates a sculpted, multi-part 3D Aura asset tailored to each Enchant in ENCHANTS.
 * Shared across the 3D Enchant Altar spin pedestals and 3D-rendered HUD aura icons.
 */
export function createEnchantAura3D(enchantId: string, scale = 1): THREE.Group {
  const g = new THREE.Group();
  switch (enchantId) {
    case 'blazing':
      addFlameBlazing(g);
      break;
    case 'glacial':
      addFrostGlacial(g);
      break;
    case 'quaking':
      addEarthQuaking(g);
      break;
    case 'surging':
      addWaveSurging(g);
      break;
    case 'radiant':
      addSunRadiant(g);
      break;
    case 'thundering':
      addStormThundering(g);
      break;
    case 'cataclysmic':
      addAtomCataclysmic(g);
      break;
    case 'sundering':
      addSlashSundering(g);
      break;
    case 'timeless':
      addHourglassTimeless(g);
      break;
    case 'spellbound':
    default:
      addPortalSpellbound(g);
      break;
  }
  if (scale !== 1) g.scale.setScalar(scale);
  return g;
}

/**
 * Creates a stylized 3D Enchanted Dice mesh for the Altar Dice counter card.
 */
export function createEnchantDice3D(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.92, 0.92),
    auraMat(0x1e1b4b, 0x4c1d95, 0.55, 0.22, 0.45)
  );
  g.add(body);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.98, 0.98),
    new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xa855f7,
      emissiveIntensity: 0.7,
      wireframe: true,
    })
  );
  g.add(frame);

  const pipMat = auraMat(0xf0abfc, 0xe879f9, 0.95, 0.15, 0.2);
  // Front face (+Z) 5-pip pattern
  for (const [px, py] of [
    [0, 0],
    [-0.24, 0.24],
    [0.24, 0.24],
    [-0.24, -0.24],
    [0.24, -0.24],
  ]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), pipMat);
    pip.position.set(px, py, 0.47);
    g.add(pip);
  }
  // Top face (+Y) 3-pip diagonal
  for (const [px, pz] of [
    [0, 0],
    [-0.22, -0.22],
    [0.22, 0.22],
  ]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), auraMat(0xfde047, 0xfacc15, 0.9));
    pip.position.set(px, 0.47, pz);
    g.add(pip);
  }

  g.rotation.set(0.45, -0.58, 0.12);
  return g;
}

let enchantHaloTex: THREE.CanvasTexture | null | undefined;

function getEnchantHaloTexture(): THREE.CanvasTexture | null {
  if (enchantHaloTex !== undefined) return enchantHaloTex;
  if (typeof document === 'undefined') {
    enchantHaloTex = null;
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    enchantHaloTex = null;
    return null;
  }
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.16)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  enchantHaloTex = tex;
  return tex;
}

export interface ArtBillboardOptions {
  baseSize?: number;
  phase?: number;
  centerY?: number;
  showPedestalBase?: boolean;
  bobAmp?: number;
  swayAmp?: number;
  haloScale?: number;
  tintHex?: number | string;
}

/**
 * Reusable 2.5D illustrated billboard sprite with backlit color-matched aura halo,
 * optional pedestal contact shadow + ring, bob/sway animation, and camera-pitch tilt.
 */
export class ArtBillboard2D {
  public readonly root = new THREE.Group();
  public readonly spritePivot = new THREE.Group();
  private readonly visualGroup = new THREE.Group();
  private readonly spriteMesh: THREE.Mesh;
  private readonly spriteMat: THREE.MeshBasicMaterial;
  private readonly haloMesh: THREE.Mesh;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly shadowDisc: THREE.Mesh | null;
  private readonly baseRingMat: THREE.MeshBasicMaterial | null;
  private readonly tmpWorldPos = new THREE.Vector3();

  private readonly baseSize: number;
  private readonly phase: number;
  private readonly bobAmp: number;
  private readonly swayAmp: number;
  private curScale = 1;

  constructor(publicPath: string, color: string, opts: ArtBillboardOptions = {}) {
    const baseSize = opts.baseSize ?? 1.38;
    const phase = opts.phase ?? 0;
    const centerY = opts.centerY ?? 0.54;
    const showPedestalBase = opts.showPedestalBase ?? true;
    const haloScale = opts.haloScale ?? 1.38;

    this.baseSize = baseSize;
    this.phase = phase;
    this.bobAmp = opts.bobAmp ?? 0.06;
    this.swayAmp = opts.swayAmp ?? 0.036;

    this.spritePivot.rotation.order = 'YXZ';
    this.visualGroup.scale.set(baseSize, baseSize, 1);
    this.spritePivot.add(this.visualGroup);
    this.root.add(this.spritePivot);

    const haloTex = getEnchantHaloTexture();
    this.haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      color,
      transparent: true,
      opacity: haloTex ? 0.45 : 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.haloMesh = new THREE.Mesh(
      haloTex ? new THREE.PlaneGeometry(Math.max(0.01, haloScale), Math.max(0.01, haloScale)) : new THREE.CircleGeometry(0.58, 24),
      this.haloMat
    );
    this.haloMesh.position.set(0, centerY, -0.06);
    this.haloMesh.visible = haloScale > 0;
    this.visualGroup.add(this.haloMesh);

    this.spriteMat = new THREE.MeshBasicMaterial({
      color: opts.tintHex ?? 0xffffff,
      transparent: true,
      alphaTest: 0.12,
      side: THREE.DoubleSide,
      depthWrite: true,
      opacity: 0,
    });
    this.spriteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.spriteMat);
    this.spriteMesh.position.set(0, centerY, 0.02);
    this.visualGroup.add(this.spriteMesh);

    if (showPedestalBase) {
      const shadowTex = getSoftContactShadowTexture();
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        color: shadowTex ? 0xffffff : 0x020617,
        transparent: true,
        opacity: shadowTex ? 0.72 : 0.25,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      this.shadowDisc = new THREE.Mesh(
        shadowTex ? new THREE.PlaneGeometry(1.22, 0.76) : new THREE.CircleGeometry(0.48, 20),
        shadowMat
      );
      this.shadowDisc.rotation.x = -Math.PI / 2;
      this.shadowDisc.position.y = 0.012;
      this.root.add(this.shadowDisc);

      this.baseRingMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.86, 28), this.baseRingMat);
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = 0.018;
      this.root.add(baseRing);
    } else {
      this.shadowDisc = null;
      this.baseRingMat = null;
    }

    void loadPublicSpriteTexture(publicPath)
      .then((tex) => {
        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img?.width && img?.height && img.height > 0) {
          this.spriteMesh.scale.set(img.width / img.height, 1, 1);
        }
        this.spriteMat.map = tex;
        this.spriteMat.opacity = 1;
        this.spriteMat.needsUpdate = true;
      })
      .catch(() => {
        // Safe no-op in headless tests
      });
  }

  public updateTransform(
    dt: number,
    elapsed: number,
    highlighted: boolean,
    isSpinning: boolean,
    camera?: THREE.Camera
  ): void {
    if (camera) {
      this.root.getWorldPosition(this.tmpWorldPos);
      const dx = camera.position.x - this.tmpWorldPos.x;
      const dy = camera.position.y - this.tmpWorldPos.y;
      const dz = camera.position.z - this.tmpWorldPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      const camPitch = Math.atan2(dy, horizDist);
      this.spritePivot.rotation.y = Math.atan2(dx, dz);
      this.spritePivot.rotation.x = -Math.max(0, Math.min(0.5, camPitch * 0.52));
    }

    const targetScale = highlighted ? 1.32 : isSpinning ? 0.94 : 1.0;
    const damp = 1 - Math.exp(-Math.max(0.001, dt) * 14);
    this.curScale += (targetScale - this.curScale) * damp;

    const bob =
      Math.sin(elapsed * 2.1 + this.phase) * this.bobAmp +
      (highlighted ? 0.14 + Math.abs(Math.sin(elapsed * 7.5)) * 0.06 : 0);
    const sway = Math.sin(elapsed * 1.55 + this.phase) * (highlighted ? this.swayAmp * 2.08 : this.swayAmp);

    const s = this.baseSize * this.curScale;
    this.visualGroup.scale.set(s, s, 1);
    this.visualGroup.position.set(0, bob, 0);
    this.visualGroup.rotation.z = sway;

    const haloPulse = 1 + Math.sin(elapsed * (highlighted ? 6.5 : 2.4) + this.phase) * (highlighted ? 0.14 : 0.07);
    this.haloMesh.scale.setScalar(haloPulse);
    this.haloMat.opacity = highlighted ? 0.85 : isSpinning ? 0.28 : 0.45 + Math.sin(elapsed * 2.0 + this.phase) * 0.08;
    if (this.baseRingMat) {
      this.baseRingMat.opacity = highlighted ? 0.82 : 0.34;
    }
    if (this.shadowDisc) {
      this.shadowDisc.scale.setScalar(Math.max(0.7, (1 - bob * 0.65) * (0.92 + (this.curScale - 1) * 0.4)));
    }
  }
}

/**
 * 2.5D illustrated Enchant billboard sprite for the Enchant Altar pedestals.
 */
export class EnchantBillboard2D extends ArtBillboard2D {
  constructor(enchantId: string, color: string, baseSize = 1.38, phase = 0) {
    super(`/enchants/${enchantId}.webp`, color, {
      baseSize,
      phase,
      centerY: 0.54,
      showPedestalBase: true,
    });
  }
}
