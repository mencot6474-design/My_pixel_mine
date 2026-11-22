import * as THREE from 'three';
import { assetUrl } from '../game/AssetUrl';
import { getEnchantById } from '../game/GameData';
import { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { disposeObject3D } from './ChestVaultStation3D';
import { createChamferSlabGeometry, mergeStaticMeshesByMaterial } from './MeshHelpers3D';

import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotAuraFx3D';
export {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
};
export type { AnimeParticleOptions } from './PlotAuraFx3D';
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

function createChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.015
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel);
}

function createSlotPlaqueTexture(slotIndex: number): THREE.CanvasTexture | null {
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

const PLOT_PODIUM_SCALE = 1.5;

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
  private enchantColorHex: string | null = null;
  private enchantIsRainbow = false;
  private lastElapsed = 0;
  private readonly activeColorHelper = new THREE.Color('#22d3ee');
  private auraGroup: THREE.Group | null = null;
  private auraSigilMesh: THREE.Mesh | null = null;
  private auraGroundMat: THREE.MeshBasicMaterial | null = null;
  private auraVeilMat: THREE.ShaderMaterial | null = null;
  private auraVeilMesh: THREE.Mesh | null = null;
  private auraOuterVeilMat: THREE.ShaderMaterial | null = null;
  private auraOuterVeilMesh: THREE.Mesh | null = null;
  private auraMoteGeo: THREE.BufferGeometry | null = null;
  private auraMoteMat: THREE.ShaderMaterial | null = null;
  private auraMotePoints: THREE.Points | null = null;
  private lowQuality = false;
  private castRingPulse = 0;
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);

  private readonly labelMat: THREE.SpriteMaterial;
  private readonly labelSprite: THREE.Sprite;
  private labelTex: THREE.CanvasTexture | null = null;
  private slotPlaqueTex: THREE.CanvasTexture | null = null;
  private lastLabelSignature = '';
  private currentLabelInfo: PlotLabelInfo | null = null;
  private hasLabel = false;
  private labelEnabled = true;
  private disposed = false;

  constructor(index: number, x: number, z: number) {
    this.index = index;
    this.group.position.set(x, 0, z);
    this.group.scale.set(PLOT_PODIUM_SCALE, PLOT_PODIUM_SCALE, PLOT_PODIUM_SCALE);

    const armorDarkMat = new THREE.MeshStandardMaterial({
      color: 0x131b2b,
      roughness: 0.52,
      metalness: 0.42,
      flatShading: true,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e2c44,
      roughness: 0.42,
      metalness: 0.46,
      flatShading: true,
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x354764,
      roughness: 0.3,
      metalness: 0.58,
      flatShading: true,
    });

    // Clean Grounded Cyber Holo-Pad & Edge-Lit Acrylic Collar (zero dizzy orbiting hoops)
    this.ringMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.92,
      roughness: 0.22,
      metalness: 0.3,
      flatShading: true,
    });

    // Tier 1: Wide Chamfered Composite Display Bay Foundation + Lateral Cooling Fins (y = 0 .. 0.088)
    const bayDock = new THREE.Mesh(
      createChamferPadGeometry(1.94, 0.088, 1.78, 0.28, 0.016),
      armorDarkMat
    );
    bayDock.receiveShadow = true;
    bayDock.castShadow = true;
    this.group.add(bayDock);

    // Side Heavy Bumper Guards + Vertical Cooling Louvers
    const guardGeo = createChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
    const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
    for (const sx of [-1, 1]) {
      const guard = new THREE.Mesh(guardGeo, baseMat);
      guard.position.set(sx * 0.92, 0.055, -0.02);
      guard.castShadow = true;
      guard.receiveShadow = true;
      this.group.add(guard);

      for (const vz of [-0.32, 0, 0.32]) {
        const vent = new THREE.Mesh(ventGeo, titaniumMat);
        vent.position.set(sx * 0.995, 0.105, vz);
        this.group.add(vent);
      }
    }

    // Recessed Edge-Lit Acrylic Seam Strip (y = 0.088 .. 0.112)
    const edgeSeamRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.79, 0.81, 0.024, 8),
      this.ringMat
    );
    edgeSeamRing.position.y = 0.1;
    edgeSeamRing.rotation.y = Math.PI / 8;

    // Tier 2: Stepped Octagonal Machinery Dais + Brushed Titanium Collar (y = 0.112 .. 0.242)
    const machineryPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.78, 0.128, 8),
      baseMat
    );
    machineryPlinth.position.y = 0.176;
    machineryPlinth.rotation.y = Math.PI / 8;
    machineryPlinth.receiveShadow = true;
    machineryPlinth.castShadow = true;

    const topBevelRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.63, 0.69, 0.036, 8),
      titaniumMat
    );
    topBevelRim.position.y = 0.256;
    topBevelRim.rotation.y = Math.PI / 8;
    topBevelRim.receiveShadow = true;
    this.group.add(edgeSeamRing, machineryPlinth, topBevelRim);

    // Tier 3: Sleek Front-Angled Numeric Slot Plaque ("01" .. "05") Mounted Proud on Forward Apron
    const frontApron = new THREE.Mesh(
      createChamferPadGeometry(0.58, 0.095, 0.24, 0.05, 0.012),
      titaniumMat
    );
    frontApron.position.set(0, 0.02, 0.84);
    frontApron.rotation.x = 0.34;
    frontApron.castShadow = true;

    this.slotPlaqueTex = createSlotPlaqueTexture(index);
    const plaqueMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(this.slotPlaqueTex ? { map: this.slotPlaqueTex } : { color: 0x0f172a }),
    });
    const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.16), plaqueMat);
    plaqueFace.position.set(0, 0.099, 0);
    plaqueFace.rotation.x = -Math.PI / 2;
    frontApron.add(plaqueFace);
    this.group.add(frontApron);

    // Tier 4: ZZZ/HSR Low-Profile Rear Holographic Display Stanchions & Power Manifold (waist height 0.74m)
    const rearManifold = new THREE.Mesh(
      createChamferPadGeometry(1.18, 0.18, 0.26, 0.08, 0.014),
      armorDarkMat
    );
    rearManifold.position.set(0, 0.04, -0.78);
    rearManifold.castShadow = true;
    rearManifold.receiveShadow = true;
    const manifoldGlow = new THREE.Mesh(
      createChamferPadGeometry(0.84, 0.035, 0.06, 0.01, 0.006),
      this.ringMat
    );
    manifoldGlow.position.set(0, 0.22, -0.78);
    this.group.add(rearManifold, manifoldGlow);

    const stanchionGeo = createChamferPadGeometry(0.14, 0.56, 0.18, 0.03, 0.012);
    const stanchionCapGeo = createChamferPadGeometry(0.18, 0.06, 0.22, 0.04, 0.01);
    const stanchionBladeGeo = new THREE.BoxGeometry(0.035, 0.44, 0.045);
    for (const sx of [-1, 1]) {
      const pylonPivot = new THREE.Group();
      pylonPivot.position.set(sx * 0.76, 0.08, -0.68);
      pylonPivot.rotation.z = -sx * 0.12;
      pylonPivot.rotation.x = 0.08;

      const body = new THREE.Mesh(stanchionGeo, baseMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const cap = new THREE.Mesh(stanchionCapGeo, titaniumMat);
      cap.position.y = 0.56;
      cap.castShadow = true;
      const glowBlade = new THREE.Mesh(stanchionBladeGeo, this.ringMat);
      glowBlade.position.set(-sx * 0.072, 0.28, 0.045);

      pylonPivot.add(body, cap, glowBlade);
      this.group.add(pylonPivot);
    }

    // Core Frosted Emitter Lens & Recessed Octagonal Neon Collar (top y = 0.275 .. 0.282)
    const pedHoloTex = getPedestalHoloRingTexture();
    this.holoDiscMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      ...(pedHoloTex ? { map: pedHoloTex } : {}),
      transparent: true,
      opacity: pedHoloTex ? 0.74 : 0.34,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const holoLensDisc = new THREE.Mesh(
      pedHoloTex ? new THREE.PlaneGeometry(1.18, 1.18) : new THREE.RingGeometry(0.24, 0.54, 24),
      this.holoDiscMat
    );
    holoLensDisc.rotation.x = -Math.PI / 2;
    holoLensDisc.position.y = 0.276;

    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.025, 6, 8), this.ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.rotation.z = Math.PI / 8;
    ringMesh.position.y = 0.282;

    const clawGeo = new THREE.CylinderGeometry(0.04, 0.056, 0.072, 6);
    const diodeGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.028, 6);
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + (i * Math.PI) / 2;
      const rx = Math.cos(ang) * 0.635;
      const rz = Math.sin(ang) * 0.635;
      const claw = new THREE.Mesh(clawGeo, titaniumMat);
      claw.position.set(rx, 0.254, rz);
      claw.castShadow = true;
      const diode = new THREE.Mesh(diodeGeo, this.ringMat);
      diode.position.set(rx, 0.295, rz);
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

    mergeStaticMeshesByMaterial(this.group, new Set<THREE.Object3D>([holoLensDisc, hitMesh]));

    this.labelMat = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
    });
    this.labelSprite = new THREE.Sprite(this.labelMat);
    this.labelSprite.center.set(0.5, 0);
    this.labelSprite.scale.set(2.72, 1.12, 1);
    this.labelSprite.position.set(0, 2.72, 0);
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
    sprite.setAnimState('idle');
    sprite.setLowQuality(this.lowQuality);
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
      this.auraVeilMesh = null;
      this.auraOuterVeilMat = null;
      this.auraOuterVeilMesh = null;
      this.auraMoteGeo?.dispose();
      this.auraMoteGeo = null;
      this.auraMoteMat?.dispose();
      this.auraMoteMat = null;
      this.auraMotePoints = null;
    }

    this.enchantId = targetId;
    this.enchantColorHex = null;
    this.enchantIsRainbow = false;
    if (!targetId || !this.chibiDef) {
      if (this.chibiDef) {
        this.ringMat.color.set(this.chibiDef.accentColor);
        this.ringMat.emissive.set(this.chibiDef.accentColor);
        this.holoDiscMat.color.set(this.chibiDef.accentColor);
        this.chibiSprite?.setAccentColor(this.chibiDef.accentColor);
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

    this.enchantColorHex = enc.color;
    this.enchantIsRainbow = enc.rarity === 'rainbow';
    this.chibiSprite?.setAccentColor(enc.color);
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

    // 2. Concentric Thick Outward-Flared Fresnel Rim Aura Shells (parallel to rear stanchions, keeps face clear)
    const veilMat = createAnimeAuraShaderMaterial(enc.color, secondaryHex, 0.72);
    const auraVeil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.58, 1.62, 28, 1, true),
      veilMat
    );
    auraVeil.position.y = 1.06;

    const outerVeilMat = createAnimeAuraShaderMaterial(secondaryHex, enc.color, 0.42);
    const outerAuraVeil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.64, 1.7, 28, 1, true),
      outerVeilMat
    );
    outerAuraVeil.position.y = 1.1;

    auraGroup.add(auraVeil, outerAuraVeil);
    this.auraVeilMat = veilMat;
    this.auraVeilMesh = auraVeil;
    this.auraOuterVeilMat = outerVeilMat;
    this.auraOuterVeilMesh = outerAuraVeil;
    auraVeil.visible = !this.lowQuality;
    outerAuraVeil.visible = !this.lowQuality;

    // 3. GPU Lifetime-Shaded Anime Aura Wisps & Vertical Energy Streaks (smooth birth/death fade)
    const particles = createAnimeParticlePoints(enc.color, secondaryHex, {
      count: 17,
      minRadius: 0.44,
      maxRadius: 0.77,
      baseY: 0.28,
      sizeScale: 1,
    });
    particles.points.visible = !this.lowQuality;
    auraGroup.add(particles.points);
    this.auraMoteGeo = particles.geo;
    this.auraMoteMat = particles.mat;
    this.auraMotePoints = particles.points;

    this.auraGroup = auraGroup;
    this.group.add(auraGroup);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.chibiSprite?.setLowQuality(low);
    if (this.auraVeilMesh) {
      this.auraVeilMesh.visible = !low;
    }
    if (this.auraOuterVeilMesh) {
      this.auraOuterVeilMesh.visible = !low;
    }
    if (this.auraMotePoints) {
      this.auraMotePoints.visible = !low;
    }
  }

  public getChibi(): ChibiDef | null {
    return this.chibiDef;
  }

  public getEnchantId(): string | null {
    return this.enchantId;
  }

  public getLabelAnchorWorldPosition(
    out: THREE.Vector3,
    extraLocalClearance = 0.13,
    forceMatrixUpdate = true
  ): THREE.Vector3 {
    if (this.chibiSprite) {
      return this.chibiSprite.getLabelAnchorWorldPosition(out, extraLocalClearance, forceMatrixUpdate);
    }
    return out.set(this.group.position.x, this.group.position.y + 3.85, this.group.position.z);
  }

  public setChibiAnimState(state: ChibiAnimState): void {
    this.chibiSprite?.setAnimState(state);
  }

  public triggerChibiAttack(durationSec = 0.42, comboStep?: number): void {
    if (!this.chibiSprite) return;
    this.chibiSprite.setAnimState('attack');
    this.chibiSprite.triggerAttack(durationSec, comboStep);
  }

  public triggerChibiCast(durationSec = 0.42): void {
    this.chibiSprite?.triggerPodiumCast(durationSec);
    this.castRingPulse = 1.0;
  }

  public triggerChibiBlitz(opts: {
    rarity: string;
    targetX: number;
    targetY: number;
    targetZ: number;
    allTargets?: ReadonlyArray<{ x: number; y: number; z: number }>;
    durationSec: number;
    colorHex?: string;
    wideCenter?: { x: number; y: number; z: number };
    motionScale?: number;
    shadowOnly?: boolean;
  }): void {
    this.chibiSprite?.triggerBlitz(opts);
  }

  public setChibiFacing(sign: 1 | -1): void {
    this.chibiSprite?.setFacing(sign);
  }

  public getAttackOriginWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.set(
      this.group.position.x,
      this.group.position.y + 1.35 * PLOT_PODIUM_SCALE,
      this.group.position.z + 0.35 * PLOT_PODIUM_SCALE
    );
  }

  public getActiveAccentColor(): string {
    if (this.enchantIsRainbow) {
      const hue = ((this.lastElapsed + this.index * 0.65) * 0.08) % 1;
      this.activeColorHelper.setHSL(hue, 0.85, 0.62);
      return `#${this.activeColorHelper.getHexString()}`;
    }
    return this.enchantColorHex ?? this.chibiDef?.accentColor ?? '#22d3ee';
  }

  public triggerChibiShowcase(_durationSec = 1.4): void {
    this.chibiSprite?.setAnimState('idle');
  }

  public setHovered(hover: boolean): void {
    this.hovered = hover;
    this.ringMat.emissiveIntensity = hover ? 1.3 : this.enchantId ? 1.05 : 0.85;
    this.holoDiscMat.opacity = hover ? 0.86 : 0.68;
  }

  public update(dtSec: number, elapsed = 0, camera?: THREE.Camera): void {
    this.lastElapsed = elapsed;
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    if (this.castRingPulse > 0) {
      this.castRingPulse = Math.max(0, this.castRingPulse - safeDt * 2.6);
    }
    const baseRingIntensity = this.hovered ? 1.3 : this.enchantId ? 1.05 : 0.85;
    this.ringMat.emissiveIntensity = baseRingIntensity + this.castRingPulse * 0.95;
    this.holoDiscMat.opacity = Math.min(0.95, (this.hovered ? 0.86 : 0.68) + this.castRingPulse * 0.22);
    const targetScale = (this.hovered ? 1.06 : 1) * PLOT_PODIUM_SCALE;
    this.tmpScale.set(targetScale, PLOT_PODIUM_SCALE, targetScale);
    this.group.scale.lerp(this.tmpScale, Math.min(1, safeDt * 12));
    this.labelSprite.scale.x = 2.72 / Math.max(0.01, this.group.scale.x);
    this.labelSprite.scale.y = 1.12 / Math.max(0.01, this.group.scale.y);
    if (this.chibiSprite && camera) {
      this.chibiSprite.update(safeDt, elapsed, camera);
    }
    if (this.auraGroup) {
      const phase = elapsed + this.index * 0.65;
      if (this.enchantIsRainbow && this.auraGroundMat && this.auraVeilMat && this.auraOuterVeilMat && this.auraMoteMat) {
        const hue = (phase * 0.08) % 1;
        this.auraGroundMat.color.setHSL(hue, 0.85, 0.62);
        (this.auraMoteMat.uniforms.uColorA.value as THREE.Color).setHSL(hue, 0.88, 0.62);
        (this.auraMoteMat.uniforms.uColorB.value as THREE.Color).setHSL((hue + 0.28) % 1, 0.92, 0.7);
        (this.auraVeilMat.uniforms.uColorA.value as THREE.Color).setHSL(hue, 0.85, 0.62);
        (this.auraVeilMat.uniforms.uColorB.value as THREE.Color).setHSL((hue + 0.3) % 1, 0.9, 0.68);
        (this.auraOuterVeilMat.uniforms.uColorA.value as THREE.Color).setHSL((hue + 0.3) % 1, 0.88, 0.66);
        (this.auraOuterVeilMat.uniforms.uColorB.value as THREE.Color).setHSL(hue, 0.85, 0.6);
        this.ringMat.color.setHSL(hue, 0.82, 0.6);
        this.ringMat.emissive.setHSL(hue, 0.82, 0.56);
      }
      if (this.auraSigilMesh) {
        this.auraSigilMesh.rotation.z = phase * 0.12;
      }
      if (!this.lowQuality && this.auraVeilMat) {
        this.auraVeilMat.uniforms.uTime.value = phase;
        this.auraVeilMat.uniforms.uOpacity.value = 0.7 + Math.sin(phase * 1.8) * 0.12;
      }
      if (!this.lowQuality && this.auraOuterVeilMat) {
        this.auraOuterVeilMat.uniforms.uTime.value = phase + 0.7;
        this.auraOuterVeilMat.uniforms.uOpacity.value = 0.4 + Math.sin(phase * 1.8) * 0.08;
      }
      if (this.auraGroundMat) {
        this.auraGroundMat.opacity = 0.76 + Math.sin(phase * 1.8) * 0.12;
      }
      if (!this.lowQuality && this.auraMoteMat) {
        this.auraMoteMat.uniforms.uTime.value = phase;
      }
    }
  }

  public setLabelVisible(visible: boolean): void {
    this.labelEnabled = visible;
    this.labelSprite.visible = false;
  }

  public setLabel(info: PlotLabelInfo | null): void {
    this.currentLabelInfo = info;
    this.labelSprite.visible = false;
    if (!info) {
      this.hasLabel = false;
      this.lastLabelSignature = '';
      return;
    }

    const enchantImg = info.enchantId ? enchantIconCache.get(info.enchantId) ?? null : null;
    const sig = `${info.name}|${info.level}|${info.rarityLabel}|${info.mutationId}|${info.enchantId ?? ''}|${enchantImg ? '1' : '0'}|${info.dmgText}`;
    if (sig === this.lastLabelSignature) {
      this.hasLabel = true;
      return;
    }
    this.lastLabelSignature = sig;
    this.hasLabel = true;
    this.labelSprite.visible = false;

    if (typeof document === 'undefined' || !this.labelEnabled || !this.hasLabel) {
      this.labelSprite.visible = false;
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

    const logicalW = 480;
    const logicalH = 192;
    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalW, logicalH);
    ctx.textBaseline = 'middle';

    // Row 1: Chibi Name + Level (auto-fits inside compact 480px logical width, rendered 2x HiDPI)
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

    // Row 2: Rarity Label + Mutation Icon + Enchant WebP Icon (compact, zero neighbor overlap)
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

    // Row 3: Crisp Target Reticle + Damage Value
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

    this.labelTex?.dispose();
    this.labelTex = nextTex;
    this.labelMat.map = nextTex;
    this.labelMat.needsUpdate = true;
    this.labelSprite.visible = false;
  }

  public dispose(): void {
    this.disposed = true;
    this.auraMoteGeo?.dispose();
    this.auraMoteGeo = null;
    this.auraMoteMat?.dispose();
    this.auraMoteMat = null;
    this.labelTex?.dispose();
    this.labelTex = null;
    this.slotPlaqueTex?.dispose();
    this.slotPlaqueTex = null;
    this.labelMat.dispose();
    this.chibiSprite?.dispose();
    disposeObject3D(this.group);
  }
}
