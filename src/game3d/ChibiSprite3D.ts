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
import {
  createAbyssalGreatswordGeometry,
  createAcademyWingGeometry,
  createClockworkGearGeometry,
  createCrimsonKatanaShaderMaterial,
  createCrimsonTsubaHaloShaderMaterial,
  createEnergyWeaponMaterial,
  createKunaiGeometry,
  createLullabyAngelWingGeometry,
  createLullabyPinkAuraShaderMaterial,
  createLullabyWhiteWingShaderMaterial,
  createNocturneWingGeometry,
  createNocturneWingShaderMaterial,
  createRoninKatanaGeometry,
  createSpikedHaloGeometry,
  createYukikageKunaiShaderMaterial,
  createYukikageShrineRingShaderMaterial,
} from './MeshFx3D';
import {
  buildTierMotionWaypoints,
  getRaritySecondaryColor,
  sampleTierMotionWaypoints,
  type TierMotionWaypoint,
  type WorldPoint3,
} from './TierAttackVfx3D';

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
  private readonly blitzGhosts: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    life: number;
    maxLife: number;
    face: 1 | -1;
    rz: number;
    baseScale: number;
  }> = [];
  private readonly blitzCloneMesh: THREE.Mesh;
  private readonly blitzCloneMat: THREE.MeshBasicMaterial;
  private readonly blitzHeroPivot = new THREE.Group();
  private readonly blitzHeroMesh: THREE.Mesh;
  private readonly blitzHeroMat: THREE.MeshBasicMaterial;
  private readonly defaultBlitzHeroGeo: THREE.PlaneGeometry;
  private readonly blitzPoseMetas: Partial<Record<ChibiAnimState, LoadedPoseMeta>> = {};
  private readonly blitzPoseGeos: Partial<Record<ChibiAnimState, THREE.PlaneGeometry>> = {};
  private readonly glintMesh: THREE.Mesh;
  private readonly glintMat: THREE.MeshBasicMaterial;
  private omegaAuraGroup: THREE.Group | null = null;
  private omegaAuraMat: THREE.ShaderMaterial | null = null;
  private omegaAuraGeo: THREE.BufferGeometry | null = null;
  private omegaHaloMesh: THREE.Mesh | null = null;
  private readonly omegaOrbitKatanas: THREE.Mesh[] = [];
  private readonly roninFanKatanas: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    baseRotZ: number;
    outX: number;
    outY: number;
    phase: number;
  }> = [];
  private readonly twinWingMeshes: THREE.Mesh[] = [];
  private readonly twinGearMeshes: THREE.Mesh[] = [];
  private readonly twinCustomMats: THREE.ShaderMaterial[] = [];
  private readonly twinCustomGeos: THREE.BufferGeometry[] = [];
  private omegaHandPivot: THREE.Group | null = null;
  private omegaHandWeaponMesh: THREE.Mesh | null = null;
  private omegaHandWeaponMat: THREE.ShaderMaterial | null = null;
  private omegaHandWeaponGeo: THREE.BufferGeometry | null = null;

  private readonly def: ChibiDef;
  private readonly spriteHeight: number;
  private readonly phaseOffset: number;
  private readonly worldPos = new THREE.Vector3();
  private readonly blitzAnchorWorld = new THREE.Vector3();
  private readonly blitzScaleWorld = new THREE.Vector3(1, 1, 1);

  private animState: ChibiAnimState = 'idle';
  private facing: 1 | -1 = 1;
  private accentColorHex: string;
  private secondaryColorHex: string;
  private showcaseTimer = 0;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.42;
  private attackComboStep = 0;
  private nextComboStep = 0;
  private blitzActive = false;
  private blitzShadowOnly = true;
  private blitzLastPoseApplied: ChibiAnimState | null = null;
  private blitzTimer = 0;
  private blitzDuration = 0.65;
  private blitzGhostAccum = 0;
  private blitzTracks: { hero: TierMotionWaypoint[]; clone?: TierMotionWaypoint[] } | null = null;
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
    this.secondaryColorHex = getRaritySecondaryColor(def.rarity);

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

    for (let i = 0; i < 6; i++) {
      const bgMat = new THREE.MeshBasicMaterial({
        color: this.accentColorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight), bgMat);
      bgMesh.visible = false;
      this.group.add(bgMesh);
      this.blitzGhosts.push({ mesh: bgMesh, mat: bgMat, life: 0, maxLife: 0.3, face: 1, rz: 0, baseScale: 1 });
    }

    this.blitzCloneMat = new THREE.MeshBasicMaterial({
      color: this.secondaryColorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.blitzCloneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight),
      this.blitzCloneMat
    );
    this.blitzCloneMesh.visible = false;
    this.group.add(this.blitzCloneMesh);

    this.blitzHeroPivot.name = 'chibiBlitzHeroPivot';
    this.blitzHeroPivot.visible = false;
    this.blitzHeroMat = new THREE.MeshBasicMaterial({
      color: this.accentColorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.defaultBlitzHeroGeo = new THREE.PlaneGeometry(spriteHeight * 0.85, spriteHeight);
    this.blitzHeroMesh = new THREE.Mesh(this.defaultBlitzHeroGeo, this.blitzHeroMat);
    this.blitzHeroMesh.name = 'chibiBlitzHeroShadow';
    this.blitzHeroMesh.position.y = spriteHeight * 0.5;
    this.blitzHeroMesh.visible = false;
    this.blitzHeroPivot.add(this.blitzHeroMesh);
    this.group.add(this.blitzHeroPivot);

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

    // Omega & Twin unit bespoke 3D back-shader attachments (always-on outside hologram mode)
    if (this.def.id === 'crimson-ronin') {
      // Custom GLSL Cyber-Samurai Tsuba HUD Halo + 8 Floating Katana Fan Arsenal behind shoulders
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);

      const tsubaHaloMat = createCrimsonTsubaHaloShaderMaterial();
      const katanaMat = createCrimsonKatanaShaderMaterial();
      this.omegaAuraMat = katanaMat;
      this.twinCustomMats.push(tsubaHaloMat);

      const discGeo = new THREE.PlaneGeometry(2.12, 2.12);
      this.twinCustomGeos.push(discGeo);
      const tsubaDisc = new THREE.Mesh(discGeo, tsubaHaloMat);
      tsubaDisc.position.set(0, 0.04, -0.10);
      this.omegaAuraGroup.add(tsubaDisc);

      this.omegaAuraGeo = createRoninKatanaGeometry();
      const fanAngles = [0.36, 0.72, 1.06, 1.38, -0.36, -0.72, -1.06, -1.38];
      for (let i = 0; i < fanAngles.length; i++) {
        const ang = fanAngles[i];
        const tierIdx = i % 4;
        const rad = 0.66 + (tierIdx % 2) * 0.14;
        const baseX = -Math.sin(ang) * rad * 1.12;
        const baseY = 0.06 + Math.cos(ang) * rad * 0.78;
        const baseZ = tierIdx % 2 === 0 ? -0.02 : -0.055;
        const baseRotZ = ang * 0.92;
        const s = 0.62 - tierIdx * 0.03;

        const km = new THREE.Mesh(this.omegaAuraGeo, katanaMat);
        km.position.set(baseX, baseY, baseZ);
        km.rotation.set(0.06, ang >= 0 ? -0.14 : 0.14, baseRotZ);
        km.scale.set(ang >= 0 ? -s : s, s, s);
        this.omegaAuraGroup.add(km);
        this.roninFanKatanas.push({
          mesh: km,
          baseX,
          baseY,
          baseZ,
          baseRotZ,
          outX: -Math.sin(ang),
          outY: Math.cos(ang),
          phase: tierIdx * 0.85 + (ang < 0 ? 0.45 : 0),
        });
      }
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    } else if (this.def.id === 'obsidian-sovereign') {
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.16);
      this.omegaAuraMat = createEnergyWeaponMaterial();
      this.omegaAuraMat.uniforms.uColor.value.set('#a855f7');
      this.omegaAuraMat.uniforms.uCoreColor.value.set('#f8fafc');
      this.omegaAuraGeo = createSpikedHaloGeometry();
      this.omegaHaloMesh = new THREE.Mesh(this.omegaAuraGeo, this.omegaAuraMat);
      this.omegaHaloMesh.scale.setScalar(0.76);
      this.omegaAuraGroup.add(this.omegaHaloMesh);
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);

      this.omegaHandPivot = new THREE.Group();
      this.omegaHandPivot.position.set(0.22, spriteHeight * 0.52, 0.16);
      this.omegaHandWeaponMat = createEnergyWeaponMaterial();
      this.omegaHandWeaponMat.uniforms.uColor.value.set('#a855f7');
      this.omegaHandWeaponMat.uniforms.uCoreColor.value.set('#ffffff');
      this.omegaHandWeaponGeo = createAbyssalGreatswordGeometry();
      this.omegaHandWeaponMesh = new THREE.Mesh(this.omegaHandWeaponGeo, this.omegaHandWeaponMat);
      this.omegaHandPivot.add(this.omegaHandWeaponMesh);
      this.omegaHandPivot.visible = false;
      this.blitzHeroPivot.add(this.omegaHandPivot);
    } else if (this.def.id === 'yukikage-twins') {
      // Custom GLSL Cryo Shinto Shrine Seal Ring + 8 Orbiting Ice-Ink Kunai Daggers
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.54, -0.14);
      const shrineRingMat = createYukikageShrineRingShaderMaterial();
      const kunaiMat = createYukikageKunaiShaderMaterial();
      this.omegaAuraMat = kunaiMat;
      this.twinCustomMats.push(shrineRingMat, kunaiMat);

      const discGeo = new THREE.PlaneGeometry(1.92, 1.92);
      this.twinCustomGeos.push(discGeo);
      const shrineDisc = new THREE.Mesh(discGeo, shrineRingMat);
      shrineDisc.position.set(0, 0.04, -0.08);
      this.omegaAuraGroup.add(shrineDisc);

      this.omegaAuraGeo = createKunaiGeometry();
      for (let i = 0; i < 8; i++) {
        const km = new THREE.Mesh(this.omegaAuraGeo, kunaiMat);
        km.scale.setScalar(0.52);
        this.omegaAuraGroup.add(km);
        this.omegaOrbitKatanas.push(km);
      }
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    } else if (this.def.id === 'halcyon-twins') {
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
      this.omegaAuraMat = createEnergyWeaponMaterial();
      this.omegaAuraMat.uniforms.uColor.value.set('#22d3ee');
      this.omegaAuraMat.uniforms.uCoreColor.value.set('#fde047');
      this.twinCustomMats.push(this.omegaAuraMat);
      this.omegaAuraGeo = createAcademyWingGeometry();
      const leftWing = new THREE.Mesh(this.omegaAuraGeo, this.omegaAuraMat);
      leftWing.scale.set(-0.74, 0.74, 0.74);
      leftWing.position.set(-0.14, 0, 0);
      const rightWing = new THREE.Mesh(this.omegaAuraGeo, this.omegaAuraMat);
      rightWing.scale.set(0.74, 0.74, 0.74);
      rightWing.position.set(0.14, 0, 0);
      this.omegaAuraGroup.add(leftWing, rightWing);
      this.twinWingMeshes.push(leftWing, rightWing);
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    } else if (this.def.id === 'lullaby-twins') {
      // Custom GLSL Radiant Pink Dream-Halo Aura + 4 Pure-White Angel Wings
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.56, -0.15);
      const whiteWingMat = createLullabyWhiteWingShaderMaterial();
      const pinkAuraMat = createLullabyPinkAuraShaderMaterial();
      this.omegaAuraMat = whiteWingMat;
      this.twinCustomMats.push(whiteWingMat, pinkAuraMat);

      const discGeo = new THREE.PlaneGeometry(1.98, 1.98);
      this.twinCustomGeos.push(discGeo);
      const auraDisc = new THREE.Mesh(discGeo, pinkAuraMat);
      auraDisc.position.set(0, 0.05, -0.08);
      this.omegaAuraGroup.add(auraDisc);

      this.omegaAuraGeo = createLullabyAngelWingGeometry();
      const wUpperL = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wUpperL.scale.set(-0.80, 0.80, 0.80);
      wUpperL.position.set(-0.15, 0.08, -0.01);
      const wUpperR = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wUpperR.scale.set(0.80, 0.80, 0.80);
      wUpperR.position.set(0.15, 0.08, -0.01);
      const wLowerL = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wLowerL.scale.set(-0.58, 0.56, 0.72);
      wLowerL.position.set(-0.12, -0.13, -0.03);
      wLowerL.rotation.z = 0.25;
      const wLowerR = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wLowerR.scale.set(0.58, 0.56, 0.72);
      wLowerR.position.set(0.12, -0.13, -0.03);
      wLowerR.rotation.z = -0.25;

      this.omegaAuraGroup.add(wUpperL, wUpperR, wLowerL, wLowerR);
      this.twinWingMeshes.push(wUpperL, wUpperR, wLowerL, wLowerR);
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    } else if (this.def.id === 'nocturne-twins') {
      // Custom GLSL 4-Wing Dual Pure-White Lunar & Pitch-Black Abyssal Seraph Wings
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.55, -0.15);
      const whiteWingMat = createNocturneWingShaderMaterial(false);
      const blackWingMat = createNocturneWingShaderMaterial(true);
      this.omegaAuraMat = whiteWingMat;
      this.twinCustomMats.push(whiteWingMat, blackWingMat);

      this.omegaAuraGeo = createNocturneWingGeometry();
      const wUpperL = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wUpperL.scale.set(-0.78, 0.78, 0.78);
      wUpperL.position.set(-0.15, 0.08, 0);
      const wUpperR = new THREE.Mesh(this.omegaAuraGeo, blackWingMat);
      wUpperR.scale.set(0.78, 0.78, 0.78);
      wUpperR.position.set(0.15, 0.08, 0);
      const wLowerL = new THREE.Mesh(this.omegaAuraGeo, whiteWingMat);
      wLowerL.scale.set(-0.56, 0.54, 0.72);
      wLowerL.position.set(-0.12, -0.13, -0.03);
      wLowerL.rotation.z = 0.28;
      const wLowerR = new THREE.Mesh(this.omegaAuraGeo, blackWingMat);
      wLowerR.scale.set(0.56, 0.54, 0.72);
      wLowerR.position.set(0.12, -0.13, -0.03);
      wLowerR.rotation.z = -0.28;

      this.omegaAuraGroup.add(wUpperL, wUpperR, wLowerL, wLowerR);
      this.twinWingMeshes.push(wUpperL, wUpperR, wLowerL, wLowerR);
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    } else if (this.def.id === 'clockwork-twins') {
      this.omegaAuraGroup = new THREE.Group();
      this.omegaAuraGroup.position.set(0, spriteHeight * 0.54, -0.16);
      this.omegaAuraMat = createEnergyWeaponMaterial();
      this.omegaAuraMat.uniforms.uColor.value.set('#f59e0b');
      this.omegaAuraMat.uniforms.uCoreColor.value.set('#2dd4bf');
      this.twinCustomMats.push(this.omegaAuraMat);
      this.omegaAuraGeo = createClockworkGearGeometry();
      const gearL = new THREE.Mesh(this.omegaAuraGeo, this.omegaAuraMat);
      gearL.scale.setScalar(0.56);
      gearL.position.set(-0.32, 0.14, 0);
      const gearR = new THREE.Mesh(this.omegaAuraGeo, this.omegaAuraMat);
      gearR.scale.setScalar(0.46);
      gearR.position.set(0.34, -0.06, 0.02);
      this.omegaAuraGroup.add(gearL, gearR);
      this.twinGearMeshes.push(gearL, gearR);
      this.omegaAuraGroup.visible = true;
      this.spritePivot.add(this.omegaAuraGroup);
    }

    // Preload all 4 poses for instant state swaps and capture idle height reference
    const smooth = Boolean(this.def.smoothFilter);
    void loadPoseMeta(this.def.poses.idle, smooth).then(
      (meta) => {
        if (this.disposed) return;
        this.idlePixelHeight = meta.pixelHeight;
        this.blitzPoseMetas.idle = meta;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.walk, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.dash = meta;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.attack, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.attack = meta;
      },
      () => {}
    );
    void loadPoseMeta(this.def.poses.pose, smooth).then(
      (meta) => {
        if (!this.disposed) this.blitzPoseMetas.aura = meta;
      },
      () => {}
    );
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
      this.blitzPoseMetas[state] = meta;

      const h = this.computeNormalizedHeight(meta, state);
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

      for (let i = 0; i < this.blitzGhosts.length; i++) {
        const bg = this.blitzGhosts[i];
        bg.mesh.geometry.dispose();
        bg.mesh.geometry = new THREE.PlaneGeometry(width, h);
        bg.mat.map = meta.texture;
        bg.mat.needsUpdate = true;
      }
      this.blitzCloneMesh.geometry.dispose();
      this.blitzCloneMesh.geometry = new THREE.PlaneGeometry(width, h);
      this.blitzCloneMat.map = meta.texture;
      this.blitzCloneMat.needsUpdate = true;

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

  private isPoseLeftFacing(state: ChibiAnimState): boolean {
    if (state === 'dash') {
      return this.def.walkFacesLeft ?? LEFT_FACING_WALK_IDS.has(this.def.id);
    }
    if (state === 'attack') {
      return LEFT_FACING_ATTACK_IDS.has(this.def.id);
    }
    return false;
  }

  private computeNormalizedHeight(meta: LoadedPoseMeta, state: ChibiAnimState): number {
    const idlePx = this.idlePixelHeight ?? meta.pixelHeight;
    const refPx = idlePx * 0.65 + BASE_CHIBI_PIXEL_HEIGHT * 0.35;
    const unitPerPx = this.spriteHeight / Math.max(1, refPx);
    const rawH = meta.pixelHeight * unitPerPx;
    return state === 'aura'
      ? Math.min(Math.max(rawH, this.spriteHeight * 1.02), this.spriteHeight * 1.18)
      : Math.min(Math.max(rawH, this.spriteHeight * 0.96), this.spriteHeight * 1.14);
  }

  private syncBlitzShadowPose(state: ChibiAnimState): void {
    const meta = this.blitzPoseMetas[state] ?? this.blitzPoseMetas.attack ?? this.blitzPoseMetas.idle;
    if (!meta) {
      if (this.material.map && this.blitzHeroMat.map !== this.material.map) {
        this.blitzHeroMat.map = this.material.map;
        this.blitzHeroMat.needsUpdate = true;
      }
      return;
    }
    let geo = this.blitzPoseGeos[state];
    if (!geo) {
      const h = this.computeNormalizedHeight(meta, state);
      const w = h * (meta.pixelWidth / Math.max(1, meta.pixelHeight));
      geo = new THREE.PlaneGeometry(w, h);
      this.blitzPoseGeos[state] = geo;
    }
    if (this.blitzHeroMesh.geometry !== geo) {
      this.blitzHeroMesh.geometry = geo;
      const h = (geo.parameters as { height?: number }).height ?? this.currentSpriteHeight;
      this.blitzHeroMesh.position.y = h * 0.5;
    }
    if (this.blitzHeroMat.map !== meta.texture) {
      this.blitzHeroMat.map = meta.texture;
      this.blitzHeroMat.needsUpdate = true;
    }
    if (this.blitzCloneMat.map !== meta.texture) {
      this.blitzCloneMat.map = meta.texture;
      this.blitzCloneMat.needsUpdate = true;
    }
  }

  private applyFacing(): void {
    const invert = this.isPoseLeftFacing(this.animState);
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
    if (this.omegaAuraGroup) {
      this.omegaAuraGroup.visible = this.shouldShowBackAttachment();
    }
  }

  private shouldShowBackAttachment(): boolean {
    return !this.hologramMode && (this.def.rarity === 'twin' || this.def.rarity === 'omega');
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
  public getLabelAnchorWorldPosition(
    out: THREE.Vector3,
    extraLocalClearance = 0.13,
    forceMatrixUpdate = true
  ): THREE.Vector3 {
    if (forceMatrixUpdate) {
      this.spritePivot.updateWorldMatrix(true, false);
    }
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

  /**
   * Triggers Rainbow-standard world-space multi-teleport blitz choreography across
   * pit / tower / boss arenas without disturbing animGroup tests or pedestal scaling.
   */
  public triggerBlitz(opts: {
    rarity: string;
    targetX: number;
    targetY: number;
    targetZ: number;
    allTargets?: readonly WorldPoint3[];
    durationSec: number;
    colorHex?: string;
    secondaryHex?: string;
    wideCenter?: WorldPoint3;
    motionScale?: number;
    shadowOnly?: boolean;
  }): void {
    if (this.hologramMode) return;
    this.group.updateWorldMatrix(true, false);
    this.group.getWorldPosition(this.blitzAnchorWorld);
    this.group.getWorldScale(this.blitzScaleWorld);

    const col = opts.colorHex ?? this.accentColorHex;
    const sec = opts.secondaryHex ?? getRaritySecondaryColor(opts.rarity);
    this.secondaryColorHex = sec;
    this.blitzCloneMat.color.set(sec);

    this.blitzShadowOnly = opts.shadowOnly ?? true;
    this.blitzLastPoseApplied = null;
    this.blitzDuration = Math.max(0.28, opts.durationSec);
    this.blitzTimer = 0;
    this.blitzGhostAccum = 0;
    this.blitzActive = true;
    this.blitzTracks = buildTierMotionWaypoints(
      opts.rarity,
      { x: this.blitzAnchorWorld.x, y: this.blitzAnchorWorld.y, z: this.blitzAnchorWorld.z },
      { x: opts.targetX, y: opts.targetY, z: opts.targetZ },
      opts.allTargets ?? [{ x: opts.targetX, y: opts.targetY, z: opts.targetZ }],
      col,
      sec,
      opts.wideCenter,
      opts.motionScale ?? 1.0,
      this.def.id
    );
  }

  private spawnBlitzGhost(
    lx: number,
    ly: number,
    lz: number,
    rz: number,
    face: 1 | -1,
    col: string,
    baseScale = 1,
    poseTex: THREE.Texture | null = null
  ): void {
    const maxSlots = this.lowQuality ? Math.min(4, this.blitzGhosts.length) : this.blitzGhosts.length;
    for (let i = 0; i < maxSlots; i++) {
      const g = this.blitzGhosts[i];
      if (poseTex && g.mat.map !== poseTex) {
        g.mat.map = poseTex;
        g.mat.needsUpdate = true;
      }
      if (!g.mat.map) continue;
      if (g.life <= 0) {
        g.life = this.lowQuality ? 0.24 : 0.28;
        g.maxLife = g.life;
        g.face = face;
        g.rz = rz;
        g.baseScale = baseScale;
        g.mesh.position.set(lx, ly + this.currentSpriteHeight * 0.5 * baseScale, lz);
        g.mat.color.set(col);
        g.mat.opacity = 0.72;
        g.mesh.visible = true;
        return;
      }
    }
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
    const renderGhosts = showGhosts;
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

    // Fade world-anchored blitz afterimages
    for (let i = 0; i < this.blitzGhosts.length; i++) {
      const bg = this.blitzGhosts[i];
      if (bg.life > 0) {
        bg.life = Math.max(0, bg.life - dtSec);
        const gp = bg.life / bg.maxLife;
        bg.mesh.quaternion.copy(this.spritePivot.quaternion);
        bg.mesh.rotateZ(bg.rz);
        bg.mat.opacity = gp * 0.72;
        const sc = bg.baseScale * (1 + (1 - gp) * 0.18);
        bg.mesh.scale.set(bg.face * sc, sc, 1);
        if (bg.life <= 0) bg.mesh.visible = false;
      }
    }

    if (this.blitzActive && this.blitzTracks) {
      this.blitzTimer += dtSec;
      const bp = Math.min(1, this.blitzTimer / this.blitzDuration);
      const cur = sampleTierMotionWaypoints(this.blitzTracks.hero, bp);
      const invX = 1 / Math.max(0.01, this.blitzScaleWorld.x);
      const invY = 1 / Math.max(0.01, this.blitzScaleWorld.y);
      const invZ = 1 / Math.max(0.01, this.blitzScaleWorld.z);
      const lx = (cur.x - this.blitzAnchorWorld.x) * invX;
      const ly = (cur.y - this.blitzAnchorWorld.y) * invY;
      const lz = (cur.z - this.blitzAnchorWorld.z) * invZ;

      // Shrink chibi slightly as it moves forward (+Z) toward the camera into the pit
      // to counter perspective bloat and make aerial/blitz leaps look sleek and agile.
      const forwardDz = Math.max(0, cur.z - this.blitzAnchorWorld.z);
      const combatScale = 1.0 - Math.min(1, forwardDz / 7.5) * 0.42;

      this.blitzHeroPivot.position.set(lx, ly, lz);
      this.blitzHeroPivot.scale.setScalar(combatScale);
      this.blitzHeroPivot.quaternion.copy(this.spritePivot.quaternion);

      if (this.blitzLastPoseApplied !== cur.pose) {
        this.blitzLastPoseApplied = cur.pose;
        this.syncBlitzShadowPose(cur.pose);
      }

      const heroFaceFlip = this.isPoseLeftFacing(cur.pose) ? (-cur.face as 1 | -1) : cur.face;
      if (this.blitzShadowOnly) {
        this.spritePivot.position.set(0, 0, 0);
        this.spritePivot.scale.set(1, 1, 1);
        this.blitzHeroPivot.visible = true;
        this.blitzHeroMesh.visible = Boolean(this.blitzHeroMat.map);
        this.blitzHeroMesh.rotation.z = cur.rz;
        this.blitzHeroMesh.scale.set(heroFaceFlip, 1, 1);
        this.blitzHeroMat.color.set(cur.col);
        const fade = bp < 0.08 ? bp / 0.08 : bp > 0.86 ? Math.max(0, (1 - bp) / 0.14) : 1;
        this.blitzHeroMat.opacity = fade * 0.88;
      } else {
        this.blitzHeroMesh.visible = false;
        this.blitzHeroPivot.visible = Boolean(this.omegaHandPivot);
        this.spritePivot.position.set(lx, ly, lz);
        this.spritePivot.scale.setScalar(combatScale);
        if (this.facing !== cur.face) this.setFacing(cur.face);
        if (this.animState !== cur.pose) this.setAnimState(cur.pose);
      }

      if (bp > 0.08 && bp < 0.88) {
        this.blitzGhostAccum += dtSec;
        const spawnEvery = this.lowQuality ? 0.048 : cur.snapping ? 0.02 : 0.036;
        if (this.blitzGhostAccum >= spawnEvery) {
          this.blitzGhostAccum = 0;
          const faceFlip = this.blitzShadowOnly
            ? heroFaceFlip
            : this.mesh.scale.x < 0
              ? -1
              : 1;
          this.spawnBlitzGhost(
            lx,
            ly,
            lz,
            cur.rz,
            faceFlip,
            cur.col,
            combatScale,
            this.blitzHeroMat.map
          );
        }
      }

      if (this.blitzTracks.clone) {
        const cCur = sampleTierMotionWaypoints(this.blitzTracks.clone, bp);
        this.blitzCloneMesh.visible = cCur.opacity > 0.05 && Boolean(this.blitzCloneMat.map);
        if (this.blitzCloneMesh.visible) {
          const clx = (cCur.x - this.blitzAnchorWorld.x) * invX;
          const cly = (cCur.y - this.blitzAnchorWorld.y) * invY;
          const clz = (cCur.z - this.blitzAnchorWorld.z) * invZ;
          const cForwardDz = Math.max(0, cCur.z - this.blitzAnchorWorld.z);
          const cCombatScale = 1.0 - Math.min(1, cForwardDz / 7.5) * 0.42;
          const cloneScale = cCombatScale * Math.min(1.06, cCur.scale);
          this.blitzCloneMesh.position.set(clx, cly + this.currentSpriteHeight * 0.5 * cloneScale, clz);
          this.blitzCloneMesh.quaternion.copy(this.spritePivot.quaternion);
          this.blitzCloneMesh.rotateZ(cCur.rz);
          this.blitzCloneMesh.scale.set(cCur.face * cloneScale, cloneScale, 1);
          this.blitzCloneMat.opacity = cCur.opacity;
        }
      } else {
        this.blitzCloneMesh.visible = false;
      }

      if (!this.blitzShadowOnly) {
        this.shadowDisc.rotation.y = this.spritePivot.rotation.y;
        this.shadowDisc.position.set(lx, 0.012, lz);
        this.shadowDisc.scale.setScalar(combatScale * Math.max(0.45, 1 - Math.max(0, ly) * 0.25));
        this.shadowMat.opacity = this.baseShadowOpacity * Math.max(0.25, 1 - Math.max(0, ly) * 0.35);
      }

      // Animate Omega & Twin unit-specific 3D back-shader attachments
      if (this.omegaAuraGroup && this.omegaAuraMat) {
        const showAura = this.shouldShowBackAttachment();
        this.omegaAuraGroup.visible = showAura;
        if (showAura) {
          this.updateBackAttachmentGroup(elapsed, 0.96);
        }
      }

      if (this.omegaHandPivot && this.omegaHandWeaponMesh && this.omegaHandWeaponMat) {
        let showHand = false;
        let swScale = 1.0;
        let rx = 0.7;
        let ry = 0.2;
        let rz = 0;

        if (bp >= 0.05 && bp < 0.19) {
          showHand = true;
          const k = (bp - 0.05) / 0.14;
          swScale = 0.95;
          rz = 1.6 - 3.3 * (k * k);
        } else if (bp >= 0.19 && bp < 0.32) {
          showHand = true;
          const k = (bp - 0.19) / 0.13;
          swScale = 1.02;
          ry = -0.2;
          rz = -1.6 + 3.3 * (k * k);
        } else if (bp >= 0.32 && bp < 0.44) {
          showHand = true;
          const k = (bp - 0.32) / 0.12;
          swScale = 1.12;
          rx = 0.4;
          rz = -1.4 + 3.4 * (k * k);
        } else if (bp >= 0.44 && bp < 0.72) {
          // Giant Greatsword appears in hand at Sky Leap & carves downward Crescent Moon!
          showHand = true;
          swScale = 1.75;
          rx = 0.15;
          ry = 0.12;
          if (bp < 0.56) {
            rz = 2.35;
          } else {
            const k = Math.min(1, (bp - 0.56) / 0.12);
            rz = 2.35 - 4.0 * (k * k);
          }
        }

        this.omegaHandPivot.visible = showHand;
        if (showHand) {
          const handFace = this.blitzShadowOnly ? cur.face : this.facing;
          this.omegaHandPivot.position.set(handFace * 0.22, this.currentSpriteHeight * 0.54, 0.16);
          this.omegaHandPivot.rotation.set(rx, ry, rz);
          this.omegaHandWeaponMesh.scale.setScalar(swScale);
          this.omegaHandWeaponMat.uniforms.uTime.value = elapsed;
          this.omegaHandWeaponMat.uniforms.uOpacity.value = bp > 0.68 ? Math.max(0, 1 - (bp - 0.68) / 0.04) : 1.0;
        }
      }

      if (bp >= 1) {
        this.blitzActive = false;
        this.blitzTracks = null;
        this.blitzHeroPivot.visible = false;
        this.blitzHeroMesh.visible = false;
        this.blitzCloneMesh.visible = false;
        if (this.omegaAuraGroup) {
          this.omegaAuraGroup.visible = this.shouldShowBackAttachment();
        }
        if (this.omegaHandPivot) this.omegaHandPivot.visible = false;
        this.spritePivot.position.set(0, 0, 0);
        this.spritePivot.scale.set(1, 1, 1);
        if (!this.blitzShadowOnly) {
          this.setAnimState('attack');
        }
      }
      if (!this.blitzShadowOnly) return;
    } else {
      this.blitzHeroPivot.visible = false;
      this.blitzHeroMesh.visible = false;
      this.blitzCloneMesh.visible = false;
      if (this.omegaHandPivot) this.omegaHandPivot.visible = false;
      if (this.omegaAuraGroup) {
        if (this.shouldShowBackAttachment()) {
          this.omegaAuraGroup.visible = true;
          this.updateBackAttachmentGroup(elapsed, 0.90);
        } else {
          this.omegaAuraGroup.visible = false;
        }
      }
    }

    const yaw = this.spritePivot.rotation.y;
    const heightFactor = Math.max(0.42, 1 - posY * 1.45);
    this.spritePivot.position.set(0, 0, 0);
    this.spritePivot.scale.set(1, 1, 1);
    this.shadowDisc.rotation.y = yaw;
    this.shadowDisc.position.x = Math.cos(yaw) * posX * 0.65;
    this.shadowDisc.position.z = -Math.sin(yaw) * posX * 0.65;
    this.shadowDisc.scale.setScalar(shadowScale * (0.86 + 0.14 * heightFactor));
    this.shadowMat.opacity = this.baseShadowOpacity * heightFactor * (this.hologramMode ? 0.32 : 1);
    if (this.hologramMode && this.material.map) {
      this.material.opacity = 0.45 + Math.sin(elapsed * 4.5 + this.phaseOffset) * 0.1;
    }
  }

  private updateBackAttachmentGroup(elapsed: number, opacity: number): void {
    if (this.omegaAuraMat) {
      this.omegaAuraMat.uniforms.uTime.value = elapsed;
      this.omegaAuraMat.uniforms.uOpacity.value = opacity;
    }
    for (let i = 0; i < this.twinCustomMats.length; i++) {
      this.twinCustomMats[i].uniforms.uTime.value = elapsed;
      this.twinCustomMats[i].uniforms.uOpacity.value = opacity;
    }
    if (this.roninFanKatanas.length > 0) {
      for (let k = 0; k < this.roninFanKatanas.length; k++) {
        const slot = this.roninFanKatanas[k];
        const hover = Math.sin(elapsed * 2.4 + slot.phase);
        const expand = Math.sin(elapsed * 1.8 + slot.phase) * 0.032;
        slot.mesh.position.set(
          slot.baseX + slot.outX * expand,
          slot.baseY + hover * 0.044 + slot.outY * expand,
          slot.baseZ
        );
        slot.mesh.rotation.z = slot.baseRotZ + Math.sin(elapsed * 1.6 + slot.phase) * 0.034;
      }
    } else if (this.omegaOrbitKatanas.length > 0) {
      const isYukikage = this.def.id === 'yukikage-twins';
      for (let k = 0; k < this.omegaOrbitKatanas.length; k++) {
        const ang = elapsed * (isYukikage ? 2.4 : 2.8) + (k / this.omegaOrbitKatanas.length) * Math.PI * 2;
        const rad = isYukikage ? 0.86 + Math.sin(elapsed * 5.0 + k) * 0.04 : 0.82;
        this.omegaOrbitKatanas[k].position.set(
          Math.cos(ang) * rad,
          isYukikage ? 0.04 + Math.sin(ang) * rad * 0.88 : Math.sin(ang) * rad * 0.72,
          isYukikage ? -0.04 : 0
        );
        this.omegaOrbitKatanas[k].rotation.set(0, 0, ang - Math.PI * 0.5);
      }
    } else if (this.omegaHaloMesh) {
      this.omegaHaloMesh.rotation.z = elapsed * 2.2;
    } else if (this.twinWingMeshes.length >= 2) {
      const flap = Math.sin(elapsed * 12) * 0.20;
      this.twinWingMeshes[0].rotation.y = -0.16 + flap;
      this.twinWingMeshes[1].rotation.y = 0.16 - flap;
      if (this.twinWingMeshes.length >= 4) {
        const subFlap = Math.sin(elapsed * 12 - 0.55) * 0.16;
        this.twinWingMeshes[2].rotation.y = -0.12 + subFlap;
        this.twinWingMeshes[3].rotation.y = 0.12 - subFlap;
      }
    } else if (this.twinGearMeshes.length === 2) {
      this.twinGearMeshes[0].rotation.z = elapsed * 3.2;
      this.twinGearMeshes[1].rotation.z = -elapsed * 4.1;
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
    for (let i = 0; i < this.blitzGhosts.length; i++) {
      this.blitzGhosts[i].mesh.geometry.dispose();
      this.blitzGhosts[i].mat.dispose();
    }
    this.blitzCloneMesh.geometry.dispose();
    this.blitzCloneMat.dispose();
    this.defaultBlitzHeroGeo.dispose();
    for (const geo of Object.values(this.blitzPoseGeos)) {
      geo?.dispose();
    }
    this.blitzHeroMat.dispose();
    this.shadowDisc.geometry.dispose();
    this.shadowMat.dispose();
    this.omegaAuraGeo?.dispose();
    this.omegaAuraMat?.dispose();
    for (let i = 0; i < this.twinCustomMats.length; i++) {
      this.twinCustomMats[i].dispose();
    }
    for (let i = 0; i < this.twinCustomGeos.length; i++) {
      this.twinCustomGeos[i].dispose();
    }
    this.omegaHandWeaponGeo?.dispose();
    this.omegaHandWeaponMat?.dispose();
  }
}
