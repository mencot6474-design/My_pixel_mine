import * as THREE from 'three';
import { getEnchantById } from '../game/GameData';
import { type OverclockTier } from '../game/OverclockDomain';
import { ChibiAnimState, ChibiDef } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { createChamferSlabGeometry, disposeObject3D, mergeStaticMeshesByMaterial } from './MeshHelpers3D';
import {
  createSlotPlaqueTexture,
  getCachedEnchantIconImage,
  hasCachedEnchantIconEntry,
  loadEnchantIconImage,
  type PlotLabelInfo,
  renderPlotLabelTexture,
} from './PlotPedestalLabel3D';

import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  createEnchantAuraSheetHandle,
  createThrusterBeamShaderMaterial,
  ENCHANT_SECONDARY_COLOR,
  type EnchantAuraSheetHandle,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
  getThrusterHoloProjectionTexture,
} from './PlotAuraFx3D';
export {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  ENCHANT_SECONDARY_COLOR,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
};
export type { AnimeParticleOptions } from './PlotAuraFx3D';
export type { PlotLabelInfo };

function createChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.015
): THREE.ExtrudeGeometry {
  return createChamferSlabGeometry(width, height, depth, chamfer, bevel);
}

const PLOT_PODIUM_SCALE = 1.5;

export class PlotPedestal3D {
  public readonly group = new THREE.Group();
  public readonly hitMesh: THREE.Mesh;
  public readonly index: number;
  private readonly visualYaw: number;
  private readonly podiumBodyGroup = new THREE.Group();

  private readonly ringMat: THREE.MeshStandardMaterial;
  private readonly holoDiscMat: THREE.MeshBasicMaterial;
  private readonly thrusterBeamOuterMat: THREE.ShaderMaterial;
  private readonly thrusterBeamCoreMat: THREE.ShaderMaterial;
  private readonly holoProjOuterMat: THREE.MeshBasicMaterial;
  private readonly holoProjInnerMat: THREE.MeshBasicMaterial;
  private readonly holoProjOuterMesh: THREE.Mesh;
  private readonly holoProjInnerMesh: THREE.Mesh;
  private readonly whiteColor = new THREE.Color('#ffffff');
  private hoverBobOffset = 0;
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
  private auraSheetHandle: EnchantAuraSheetHandle | null = null;
  private auraMoteGeo: THREE.BufferGeometry | null = null;
  private auraMoteMat: THREE.ShaderMaterial | null = null;
  private auraMotePoints: THREE.Points | null = null;
  private lowQuality = false;
  private overclockTier: 0 | OverclockTier = 0;
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

  constructor(index: number, x: number, z: number, visualYaw = 0) {
    this.index = index;
    this.visualYaw = visualYaw;
    this.group.position.set(x, 0, z);
    this.group.scale.set(PLOT_PODIUM_SCALE, PLOT_PODIUM_SCALE, PLOT_PODIUM_SCALE);
    this.podiumBodyGroup.rotation.y = visualYaw;
    this.group.add(this.podiumBodyGroup);

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
    this.podiumBodyGroup.add(bayDock);

    // Side Heavy Bumper Guards + Vertical Cooling Louvers
    const guardGeo = createChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
    const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
    for (const sx of [-1, 1]) {
      const guard = new THREE.Mesh(guardGeo, baseMat);
      guard.position.set(sx * 0.92, 0.055, -0.02);
      guard.castShadow = true;
      guard.receiveShadow = true;
      this.podiumBodyGroup.add(guard);

      for (const vz of [-0.32, 0, 0.32]) {
        const vent = new THREE.Mesh(ventGeo, titaniumMat);
        vent.position.set(sx * 0.995, 0.105, vz);
        this.podiumBodyGroup.add(vent);
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
    this.podiumBodyGroup.add(edgeSeamRing, machineryPlinth, topBevelRim);

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
    this.podiumBodyGroup.add(frontApron);

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
    this.podiumBodyGroup.add(rearManifold, manifoldGlow);

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
      this.podiumBodyGroup.add(pylonPivot);
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
      this.podiumBodyGroup.add(claw, diode);
    }

    this.podiumBodyGroup.add(holoLensDisc, ringMesh);

    // Anti-grav tapered underside keel & downward additive thruster plume for open-sky floating podiums
    const thrusterKeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.28, 0.34, 8),
      armorDarkMat
    );
    thrusterKeel.position.y = -0.17;
    thrusterKeel.rotation.y = Math.PI / 8;
    thrusterKeel.castShadow = true;

    const thrusterEmitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.22, 0.055, 8),
      this.ringMat
    );
    thrusterEmitter.position.y = -0.365;
    thrusterEmitter.rotation.y = Math.PI / 8;

    // Layered Holographic Anti-Grav Projector Beam + Dual Counter-Rotating Holo Rings underneath podium
    this.thrusterBeamOuterMat = createThrusterBeamShaderMaterial('#22d3ee', 0.44);
    const thrusterBeamOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.58, 0.56, 20, 1, true),
      this.thrusterBeamOuterMat
    );
    thrusterBeamOuter.position.y = -0.64;

    this.thrusterBeamCoreMat = createThrusterBeamShaderMaterial('#e0f2fe', 0.62);
    const thrusterBeamCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.27, 0.34, 16, 1, true),
      this.thrusterBeamCoreMat
    );
    thrusterBeamCore.position.y = -0.52;

    const projTex = getThrusterHoloProjectionTexture();
    this.holoProjOuterMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      ...(projTex ? { map: projTex } : {}),
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.holoProjOuterMesh = new THREE.Mesh(
      projTex ? new THREE.PlaneGeometry(1.36, 1.36) : new THREE.RingGeometry(0.36, 0.58, 24),
      this.holoProjOuterMat
    );
    this.holoProjOuterMesh.rotation.x = -Math.PI / 2;
    this.holoProjOuterMesh.position.y = -0.45;

    this.holoProjInnerMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      ...(projTex ? { map: projTex } : {}),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.holoProjInnerMesh = new THREE.Mesh(
      projTex ? new THREE.PlaneGeometry(0.86, 0.86) : new THREE.RingGeometry(0.2, 0.34, 20),
      this.holoProjInnerMat
    );
    this.holoProjInnerMesh.rotation.x = -Math.PI / 2;
    this.holoProjInnerMesh.position.y = -0.58;

    this.podiumBodyGroup.add(
      thrusterKeel,
      thrusterEmitter,
      thrusterBeamOuter,
      thrusterBeamCore,
      this.holoProjOuterMesh,
      this.holoProjInnerMesh
    );

    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 1.9, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.95;
    hitMesh.userData = { kind: 'pedestal', slotIndex: index };
    this.hitMesh = hitMesh;
    this.group.add(hitMesh);

    mergeStaticMeshesByMaterial(
      this.podiumBodyGroup,
      new Set<THREE.Object3D>([
        holoLensDisc,
        thrusterBeamOuter,
        thrusterBeamCore,
        this.holoProjOuterMesh,
        this.holoProjInnerMesh,
        frontApron,
      ])
    );

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
      this.syncUnderHoloColors();
      return;
    }

    if (!this.enchantId) {
      this.ringMat.color.set(def.accentColor);
      this.ringMat.emissive.set(def.accentColor);
      this.holoDiscMat.color.set(def.accentColor);
      this.syncUnderHoloColors();
    }

    const sprite = new ChibiSprite3D(def, 2.05, this.index * 0.75);
    sprite.group.position.y = 0.28 + this.hoverBobOffset;
    sprite.setAnimState('idle');
    sprite.setLowQuality(this.lowQuality);
    this.chibiSprite = sprite;
    this.group.add(sprite.group);
  }

  public setEnchant(enchantId: string | null): void {
    const targetId = this.chibiDef ? enchantId : null;
    if (targetId === this.enchantId) return;

    if (this.auraGroup) {
      this.auraSheetHandle?.dispose();
      this.auraSheetHandle = null;
      disposeObject3D(this.auraGroup);
      this.group.remove(this.auraGroup);
      this.auraGroup = null;
      this.auraSigilMesh = null;
      this.auraGroundMat = null;
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
      this.syncUnderHoloColors();
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
    this.syncUnderHoloColors();

    const auraGroup = new THREE.Group();
    auraGroup.position.y = this.hoverBobOffset;

    // 1. Clean Minimalist Ground Sigil Decal (serene slow drift, zero square clutter)
    const sigilTex = getEnchantSigilTexture();
    const groundMat = new THREE.MeshBasicMaterial({
      color: enc.color,
      ...(sigilTex ? { map: sigilTex } : {}),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: sigilTex ? 0.88 : 0.68,
      blending: THREE.NormalBlending,
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

    // 2. 14 FPS 4x2 Animated 2D Sprite-Sheet Aura ("Pas" scale behind Chibi & back-attachments)
    const auraSheet = createEnchantAuraSheetHandle(enc.id, 2.05, {
      baseY: 0.25,
      zOffset: -0.32,
      phaseOffset: this.index * 0.13,
      opacity: 0.96,
      renderOrder: 2,
    });
    auraGroup.add(auraSheet.pivotGroup);
    this.auraSheetHandle = auraSheet;

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
    if (this.auraMotePoints) {
      this.auraMotePoints.visible = !low;
    }
    this.holoProjInnerMesh.visible = !low;
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
      this.chibiSprite.getLabelAnchorWorldPosition(out, extraLocalClearance, forceMatrixUpdate);
      // Keep projected HUD tier badge/nameplate vertically steady while 3D podium & sprite gently hover
      out.y -= this.hoverBobOffset * this.group.scale.y;
      return out;
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

  public triggerChibiUltOpening(durationSec = 0.52): void {
    this.chibiSprite?.triggerUltOpening(durationSec);
    this.castRingPulse = 1.65;
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

  public getVisualYaw(): number {
    return this.visualYaw;
  }

  public getHoverBobOffset(): number {
    return this.hoverBobOffset;
  }

  public getAttackOriginWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    const fwd = 0.35 * PLOT_PODIUM_SCALE;
    return out.set(
      this.group.position.x + Math.sin(this.visualYaw) * fwd,
      this.group.position.y + 1.35 * PLOT_PODIUM_SCALE,
      this.group.position.z + Math.cos(this.visualYaw) * fwd
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

  private syncUnderHoloColors(): void {
    (this.thrusterBeamOuterMat.uniforms.uColor.value as THREE.Color).copy(this.ringMat.color);
    (this.thrusterBeamCoreMat.uniforms.uColor.value as THREE.Color)
      .copy(this.ringMat.color)
      .lerp(this.whiteColor, 0.48);
    this.holoProjOuterMat.color.copy(this.ringMat.color);
    this.holoProjInnerMat.color.copy(this.ringMat.color).lerp(this.whiteColor, 0.42);
  }

  public setHovered(hover: boolean): void {
    this.hovered = hover;
    this.ringMat.emissiveIntensity = hover ? 1.3 : this.enchantId ? 1.05 : 0.85;
    this.holoDiscMat.opacity = hover ? 0.86 : 0.68;
  }

  public setOverclockTier(tier: 0 | OverclockTier): void {
    this.overclockTier = tier;
  }

  public update(dtSec: number, elapsed = 0, camera?: THREE.Camera): void {
    this.lastElapsed = elapsed;
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    const feverScale = this.overclockTier;
    this.hoverBobOffset = Math.sin(elapsed * (1.85 + feverScale * 0.55) + this.index * 1.15) * 0.045;
    this.podiumBodyGroup.position.y = this.hoverBobOffset;
    if (this.chibiSprite) {
      this.chibiSprite.group.position.y = 0.28 + this.hoverBobOffset;
    }
    if (this.auraGroup) {
      this.auraGroup.position.y = this.hoverBobOffset;
    }
    if (this.castRingPulse > 0) {
      this.castRingPulse = Math.max(0, this.castRingPulse - safeDt * 2.6);
    }
    const baseRingIntensity = (this.hovered ? 1.3 : this.enchantId ? 1.05 : 0.85) + feverScale * 0.18;
    this.ringMat.emissiveIntensity = baseRingIntensity + this.castRingPulse * 0.95;
    this.holoDiscMat.opacity = Math.min(
      0.95,
      (this.hovered ? 0.86 : 0.68) + this.castRingPulse * 0.22 + feverScale * 0.05
    );
    const pulseWave = Math.sin(elapsed * 4.2 + this.index) * 0.05;
    this.syncUnderHoloColors();
    const beamBoost = feverScale * 0.08;
    this.thrusterBeamOuterMat.uniforms.uTime.value = elapsed + this.index * 0.7;
    this.thrusterBeamOuterMat.uniforms.uOpacity.value =
      (this.hovered ? 0.56 : 0.42) + this.castRingPulse * 0.28 + beamBoost + pulseWave;
    this.thrusterBeamCoreMat.uniforms.uTime.value = elapsed * 1.2 + this.index * 0.7;
    this.thrusterBeamCoreMat.uniforms.uOpacity.value =
      (this.hovered ? 0.74 : 0.58) + this.castRingPulse * 0.3 + beamBoost + pulseWave;
    const ringSpinMult = 1 + feverScale * 0.45;
    const ringBoost = feverScale * 0.07;
    this.holoProjOuterMat.opacity = (this.hovered ? 0.78 : 0.56) + this.castRingPulse * 0.25 + ringBoost;
    this.holoProjOuterMesh.rotation.z = elapsed * 0.48 * ringSpinMult + this.index;
    this.holoProjInnerMat.opacity = (this.hovered ? 0.6 : 0.4) + this.castRingPulse * 0.25 + ringBoost;
    if (!this.lowQuality) {
      this.holoProjInnerMesh.rotation.z = -elapsed * 0.76 * ringSpinMult - this.index;
    }
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
      this.auraSheetHandle?.update(elapsed, camera);
      if (this.enchantIsRainbow && this.auraGroundMat && this.auraMoteMat) {
        const hue = (phase * 0.08) % 1;
        this.auraGroundMat.color.setHSL(hue, 0.85, 0.62);
        (this.auraMoteMat.uniforms.uColorA.value as THREE.Color).setHSL(hue, 0.88, 0.62);
        (this.auraMoteMat.uniforms.uColorB.value as THREE.Color).setHSL((hue + 0.28) % 1, 0.92, 0.7);
        this.ringMat.color.setHSL(hue, 0.82, 0.6);
        this.ringMat.emissive.setHSL(hue, 0.82, 0.56);
      }
      if (this.auraSigilMesh) {
        this.auraSigilMesh.rotation.z = phase * 0.12;
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

    const enchantImg = info.enchantId ? getCachedEnchantIconImage(info.enchantId) : null;
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

    if (info.enchantId && !hasCachedEnchantIconEntry(info.enchantId)) {
      const targetEnchant = info.enchantId;
      void loadEnchantIconImage(targetEnchant).then((loaded) => {
        if (!loaded || this.disposed || this.currentLabelInfo?.enchantId !== targetEnchant) return;
        this.lastLabelSignature = '';
        this.setLabel(this.currentLabelInfo);
      });
    }

    const nextTex = renderPlotLabelTexture(info, enchantImg);
    if (!nextTex) return;

    this.labelTex?.dispose();
    this.labelTex = nextTex;
    this.labelMat.map = nextTex;
    this.labelMat.needsUpdate = true;
    this.labelSprite.visible = false;
  }

  public dispose(): void {
    this.disposed = true;
    this.auraSheetHandle?.dispose();
    this.auraSheetHandle = null;
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
