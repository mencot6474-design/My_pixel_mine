import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import type { ChibiAnimState, ChibiDef, ChibiRarity } from './ChibiCatalog';
import { buildApexBackAttachment } from './ChibiBackApexBuilders3D';
import { buildFusionOrTierBackAttachment } from './ChibiBackFusionTierBuilders3D';
import { applySharpSpriteTexture } from './MeshHelpers3D';

export interface RoninFanKatanaSlot {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotZ: number;
  outX: number;
  outY: number;
  phase: number;
}

export interface ChibiBackAttachmentHandle {
  omegaAuraGroup: THREE.Group | null;
  omegaAuraMat: THREE.ShaderMaterial | null;
  omegaAuraGeo: THREE.BufferGeometry | null;
  omegaHaloMesh: THREE.Mesh | null;
  omegaOrbitKatanas: THREE.Mesh[];
  roninFanKatanas: RoninFanKatanaSlot[];
  twinWingMeshes: THREE.Mesh[];
  twinGearMeshes: THREE.Mesh[];
  twinCustomMats: THREE.ShaderMaterial[];
  twinCustomGeos: THREE.BufferGeometry[];
  omegaHandPivot: THREE.Group | null;
  omegaHandWeaponMesh: THREE.Mesh | null;
  omegaHandWeaponMat: THREE.ShaderMaterial | null;
  omegaHandWeaponGeo: THREE.BufferGeometry | null;
  tierRarity: ChibiRarity | null;
}

export function createChibiBackAttachments(
  defId: string,
  spriteHeight: number,
  spritePivot: THREE.Group,
  blitzHeroPivot: THREE.Group,
  rarity?: ChibiRarity,
  accentColor?: string
): ChibiBackAttachmentHandle {
  const handle: ChibiBackAttachmentHandle = {
    omegaAuraGroup: null,
    omegaAuraMat: null,
    omegaAuraGeo: null,
    omegaHaloMesh: null,
    omegaOrbitKatanas: [],
    roninFanKatanas: [],
    twinWingMeshes: [],
    twinGearMeshes: [],
    twinCustomMats: [],
    twinCustomGeos: [],
    omegaHandPivot: null,
    omegaHandWeaponMesh: null,
    omegaHandWeaponMat: null,
    omegaHandWeaponGeo: null,
    tierRarity: null,
  };

  if (!buildApexBackAttachment(handle, defId, spriteHeight, spritePivot, blitzHeroPivot)) {
    buildFusionOrTierBackAttachment(handle, defId, spriteHeight, spritePivot, rarity, accentColor);
  }

  if (handle.omegaAuraGroup) {
    handle.omegaAuraGroup.name = 'chibiBackAttachmentGroup';
  }

  return handle;
}

export function updateChibiBackAttachmentGroup(
  handle: ChibiBackAttachmentHandle,
  defId: string,
  elapsed: number,
  opacity: number
): void {
  if (handle.omegaAuraMat) {
    handle.omegaAuraMat.uniforms.uTime.value = elapsed;
    handle.omegaAuraMat.uniforms.uOpacity.value = opacity;
  }
  for (let i = 0; i < handle.twinCustomMats.length; i++) {
    handle.twinCustomMats[i].uniforms.uTime.value = elapsed;
    handle.twinCustomMats[i].uniforms.uOpacity.value = opacity;
  }
  if (handle.roninFanKatanas.length > 0) {
    const isCheshire = defId === 'glitch-cheshire' || defId === 'null-singularity';
    const isMonochrome = defId === 'monochrome-saint';
    const isObsidianMonolith = defId === 'obsidian-sovereign' || defId === 'void-asura';
    const isLeviathanTide = defId === 'abyssal-leviathan';
    const isAureliaNoctis = defId === 'gilded-chain-noble';
    const isEpicTier = handle.tierRarity === 'epic';
    const isSecretTier = handle.tierRarity === 'secret';
    const isRareTier = handle.tierRarity === 'rare';
    const isCommonTier = handle.tierRarity === 'common';
    for (let k = 0; k < handle.roninFanKatanas.length; k++) {
      const slot = handle.roninFanKatanas[k];
      const hover = Math.sin(elapsed * (isCommonTier ? 1.9 : isAureliaNoctis ? 3.2 : isLeviathanTide ? 2.2 : 2.4) + slot.phase);
      const expand = Math.sin(elapsed * (isAureliaNoctis ? 2.6 : 1.8) + slot.phase) * (isCommonTier ? 0.018 : isAureliaNoctis ? 0.14 : isLeviathanTide ? 0.044 : 0.032);
      const glitchJump =
        isCheshire && Math.sin(elapsed * 19.0 + k * 2.7) > 0.86
          ? (k % 2 === 0 ? 1 : -1) * 0.042
          : 0;
      const epicSnap =
        isEpicTier && Math.sin(elapsed * 22.0 + k * 2.3) > 0.90
          ? (k % 2 === 0 ? 1 : -1) * 0.026
          : 0;
      const monolithTremor =
        isObsidianMonolith || isSecretTier
          ? Math.sin(elapsed * 26.0 + k * 3.1) * 0.007
          : 0;
      slot.mesh.position.set(
        slot.baseX + slot.outX * expand + glitchJump + epicSnap + monolithTremor,
        slot.baseY + hover * (isAureliaNoctis ? 0.12 : isObsidianMonolith ? 0.068 : isLeviathanTide ? 0.056 : isCommonTier ? 0.024 : 0.044) + slot.outY * expand,
        slot.baseZ
      );
      slot.mesh.rotation.z = isMonochrome
        ? Math.sin(elapsed * 1.4 + slot.phase) * 0.014
        : slot.baseRotZ + Math.sin(elapsed * (isAureliaNoctis ? 2.8 : 1.6) + slot.phase) * (isCommonTier ? 0.018 : isAureliaNoctis ? 0.18 : isLeviathanTide ? 0.048 : 0.034);
      if (isRareTier) {
        slot.mesh.rotation.y = elapsed * (k % 2 === 0 ? 0.85 : -0.85);
      } else if (isAureliaNoctis) {
        slot.mesh.rotation.y = Math.sin(elapsed * 2.4 + slot.phase) * 0.28;
      }
    }
    if (handle.omegaHaloMesh) {
      if (defId === 'obsidian-sovereign') {
        handle.omegaHaloMesh.position.y = 0.14 + Math.sin(elapsed * 2.1) * 0.022;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.032;
      } else if (defId === 'abyssal-leviathan') {
        handle.omegaHaloMesh.position.y = 0.08 + Math.sin(elapsed * 2.0) * 0.024;
        handle.omegaHaloMesh.rotation.z = elapsed * 0.42;
      } else if (defId === 'yukikage-twins') {
        handle.omegaHaloMesh.position.y = 0.26 + Math.sin(elapsed * 2.2) * 0.024;
        handle.omegaHaloMesh.rotation.set(0, 0, elapsed * 0.55);
      } else if (defId === 'crimson-clock-marshal') {
        handle.omegaHaloMesh.position.y = 0.06 + Math.sin(elapsed * 2.0) * 0.022;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.2) * 0.028;
      } else if (defId === 'gilded-chain-noble') {
        handle.omegaHaloMesh.position.y = 0.08 + Math.sin(elapsed * 2.4) * 0.045;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.6) * 0.14;
      } else if (handle.tierRarity === 'limited') {
        handle.omegaHaloMesh.position.y = 0.44 + Math.sin(elapsed * 2.0) * 0.026;
        handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.4) * 0.028;
      } else {
        handle.omegaHaloMesh.rotation.z = elapsed * 0.45;
      }
    }
    if ((handle.tierRarity === 'exotic' || defId === 'paradox-twins' || defId === 'chrono-crystallis') && handle.twinGearMeshes.length >= 2) {
      for (let g = 0; g < handle.twinGearMeshes.length; g++) {
        if (defId === 'paradox-twins' || defId === 'chrono-crystallis') {
          handle.twinGearMeshes[g].rotation.z = elapsed * (g % 2 === 0 ? 1 : -1) * (2.6 + g * 0.9);
        } else {
          handle.twinGearMeshes[g].position.y = 0.42 + Math.sin(elapsed * 2.6 + g * 1.5) * 0.04;
          handle.twinGearMeshes[g].rotation.y = elapsed * (g % 2 === 0 ? 1.4 : -1.4);
        }
      }
    }
  } else if (handle.omegaOrbitKatanas.length > 0) {
    const isYukikage = defId === 'yukikage-twins';
    for (let k = 0; k < handle.omegaOrbitKatanas.length; k++) {
      const ang = elapsed * (isYukikage ? 2.4 : 2.8) + (k / handle.omegaOrbitKatanas.length) * Math.PI * 2;
      const rad = isYukikage ? 0.86 + Math.sin(elapsed * 5.0 + k) * 0.04 : 0.82;
      handle.omegaOrbitKatanas[k].position.set(
        Math.cos(ang) * rad,
        isYukikage ? 0.04 + Math.sin(ang) * rad * 0.88 : Math.sin(ang) * rad * 0.72,
        isYukikage ? -0.04 : 0
      );
      handle.omegaOrbitKatanas[k].rotation.set(0, 0, ang - Math.PI * 0.5);
    }
  } else if (handle.twinWingMeshes.length >= 2) {
    const isUncommon = handle.tierRarity === 'uncommon';
    const isMythic = handle.tierRarity === 'mythic';
    const isLullaby = defId === 'lullaby-twins';
    const flapSpeed = isUncommon ? 6.0 : isLullaby ? 6.2 : isMythic ? 7.5 : 10.5;
    const flapAmp = isUncommon ? 0.10 : isLullaby ? 0.16 : isMythic ? 0.14 : 0.18;
    const flap = Math.sin(elapsed * flapSpeed) * flapAmp;
    handle.twinWingMeshes[0].rotation.y = -0.14 + flap;
    handle.twinWingMeshes[1].rotation.y = 0.14 - flap;
    if (handle.twinWingMeshes.length >= 4) {
      const subFlap = Math.sin(elapsed * flapSpeed - 0.55) * (flapAmp * 0.8);
      handle.twinWingMeshes[2].rotation.y = -0.10 + subFlap;
      handle.twinWingMeshes[3].rotation.y = 0.10 - subFlap;
    }
    if (handle.twinWingMeshes.length >= 6) {
      const thirdFlap = Math.sin(elapsed * flapSpeed - 1.1) * (flapAmp * 0.7);
      handle.twinWingMeshes[4].rotation.y = -0.08 + thirdFlap;
      handle.twinWingMeshes[5].rotation.y = 0.08 - thirdFlap;
    }
    if (handle.omegaHaloMesh && defId === 'prism-seraph') {
      handle.omegaHaloMesh.position.y = 0.56 + Math.sin(elapsed * 2.6) * 0.032;
      handle.omegaHaloMesh.rotation.z = -0.18 + Math.sin(elapsed * 1.8) * 0.045;
    } else if (handle.omegaHaloMesh && isMythic) {
      handle.omegaHaloMesh.position.y = 0.42 + Math.sin(elapsed * 2.0) * 0.024;
      handle.omegaHaloMesh.rotation.z = Math.sin(elapsed * 1.3) * 0.024;
    }
  } else if (handle.omegaHaloMesh) {
    handle.omegaHaloMesh.rotation.z = elapsed * 2.2;
  } else if (handle.twinGearMeshes.length >= 2) {
    for (let g = 0; g < handle.twinGearMeshes.length; g++) {
      handle.twinGearMeshes[g].rotation.z = elapsed * (g % 2 === 0 ? 1 : -1) * (3.2 + g * 1.1);
    }
  }
}

export function updateOmegaHandBlitzWeapon(
  handle: ChibiBackAttachmentHandle,
  bp: number,
  elapsed: number,
  handFace: 1 | -1,
  currentSpriteHeight: number
): void {
  if (!handle.omegaHandPivot || !handle.omegaHandWeaponMesh || !handle.omegaHandWeaponMat) return;
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

  handle.omegaHandPivot.visible = showHand;
  if (showHand) {
    handle.omegaHandPivot.position.set(handFace * 0.22, currentSpriteHeight * 0.54, 0.16);
    handle.omegaHandPivot.rotation.set(rx, ry, rz);
    handle.omegaHandWeaponMesh.scale.setScalar(swScale);
    handle.omegaHandWeaponMat.uniforms.uTime.value = elapsed;
    handle.omegaHandWeaponMat.uniforms.uOpacity.value = bp > 0.68 ? Math.max(0, 1 - (bp - 0.68) / 0.04) : 1.0;
  }
}

export function stepChibiAttackComboKinematics(
  p: number,
  attackComboStep: number,
  facing: 1 | -1
): { posX: number; posY: number; rotZ: number; scaleX: number; scaleY: number; shadowScale: number } {
  if (attackComboStep === 1) {
    if (p < 0.18) {
      const k = p / 0.18;
      const ease = k * k;
      return {
        posX: -facing * 0.13 * ease,
        posY: 0.01 * ease,
        rotZ: facing * 0.14 * ease,
        scaleY: 1 - 0.06 * ease,
        scaleX: 1 + 0.05 * ease,
        shadowScale: 1.04,
      };
    }
    if (p < 0.44) {
      const k = (p - 0.18) / 0.26;
      const snap = 1 - (1 - k) * (1 - k);
      const arc = Math.sin(k * Math.PI);
      return {
        posX: facing * (-0.13 + 0.34 * snap),
        posY: 0.01 + 0.06 * arc,
        rotZ: facing * (0.14 - 0.38 * snap),
        scaleY: 0.94 + 0.08 * arc,
        scaleX: 1.05 + 0.06 * arc,
        shadowScale: 1.1,
      };
    }
    const k = (p - 0.44) / 0.56;
    const rem = 1 - (1 - Math.pow(1 - k, 3));
    return {
      posX: facing * 0.21 * rem,
      posY: 0.015 * rem,
      rotZ: -facing * 0.24 * rem,
      scaleY: 1 + 0.025 * rem,
      scaleX: 1 - 0.02 * rem,
      shadowScale: 1.07 - 0.05 * (1 - rem),
    };
  }
  if (attackComboStep === 2) {
    if (p < 0.22) {
      const k = p / 0.22;
      const ease = k * k;
      return {
        posX: -facing * 0.14 * ease,
        posY: 0,
        rotZ: facing * 0.2 * ease,
        scaleY: 1 - 0.1 * ease,
        scaleX: 1 + 0.08 * ease,
        shadowScale: 1.06,
      };
    }
    if (p < 0.48) {
      const k = (p - 0.22) / 0.26;
      const snap = 1 - (1 - k) * (1 - k);
      const arc = Math.sin(k * Math.PI);
      return {
        posX: facing * (-0.14 + 0.36 * snap),
        posY: 0.19 * arc,
        rotZ: facing * (0.2 - 0.48 * snap),
        scaleY: 0.9 + 0.2 * arc,
        scaleX: 1.08 - 0.11 * arc,
        shadowScale: 1.02 - 0.12 * arc,
      };
    }
    const k = (p - 0.48) / 0.52;
    const rem = 1 - (1 - Math.pow(1 - k, 3));
    const landing = Math.sin(Math.min(1, k * 2.2) * Math.PI);
    return {
      posX: facing * 0.22 * rem,
      posY: 0.02 * rem,
      rotZ: -facing * 0.28 * rem,
      scaleY: 1 - 0.05 * landing + 0.03 * rem,
      scaleX: 1 + 0.04 * landing,
      shadowScale: 1.1 - 0.08 * (1 - rem),
    };
  }
  if (p < 0.2) {
    const k = p / 0.2;
    const ease = k * k;
    return {
      posX: -facing * 0.11 * ease,
      posY: 0.02 * ease,
      rotZ: facing * 0.16 * ease,
      scaleY: 1 - 0.04 * ease,
      scaleX: 1 + 0.03 * ease,
      shadowScale: 1.02,
    };
  }
  if (p < 0.44) {
    const k = (p - 0.2) / 0.24;
    const snap = 1 - (1 - k) * (1 - k);
    const arc = Math.sin(k * Math.PI);
    return {
      posX: facing * (-0.11 + 0.27 * snap),
      posY: 0.02 + 0.1 * arc,
      rotZ: facing * (0.16 - 0.4 * snap),
      scaleY: 0.96 + 0.12 * arc,
      scaleX: 1.03 - 0.07 * arc,
      shadowScale: 1.08,
    };
  }
  const k = (p - 0.44) / 0.56;
  const settle = 1 - Math.pow(1 - k, 3);
  const rem = 1 - settle;
  return {
    posX: facing * 0.16 * rem,
    posY: 0.02 * rem,
    rotZ: -facing * 0.24 * rem,
    scaleY: 1 + 0.03 * rem,
    scaleX: 1 - 0.015 * rem,
    shadowScale: 1.06 - 0.05 * settle,
  };
}

export interface LoadedPoseMeta {
  texture: THREE.Texture;
  pixelWidth: number;
  pixelHeight: number;
  topTrimRatio: number;
}

const poseCache = new Map<string, Promise<LoadedPoseMeta>>();
const textureLoader = new THREE.TextureLoader();
let contactShadowTex: THREE.CanvasTexture | null | undefined;

export function getSoftContactShadowTexture(): THREE.CanvasTexture | null {
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

export function loadPoseMeta(url: string, smoothFilter = false): Promise<LoadedPoseMeta> {
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

export function stateToPoseUrl(def: ChibiDef, state: ChibiAnimState): string {
  if (state === 'dash') return def.poses.walk;
  if (state === 'attack') return def.poses.attack;
  if (state === 'aura') return def.poses.pose;
  return def.poses.idle;
}

export function disposeChibiBackAttachments(handle: ChibiBackAttachmentHandle): void {
  handle.omegaAuraGeo?.dispose();
  handle.omegaAuraMat?.dispose();
  for (let i = 0; i < handle.twinCustomMats.length; i++) {
    handle.twinCustomMats[i].dispose();
  }
  for (let i = 0; i < handle.twinCustomGeos.length; i++) {
    handle.twinCustomGeos[i].dispose();
  }
  handle.omegaHandWeaponGeo?.dispose();
  handle.omegaHandWeaponMat?.dispose();
}
