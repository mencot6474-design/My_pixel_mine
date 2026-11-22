import * as THREE from 'three';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaBattlePhase, OmegaTargetObject } from '../game/OmegaBossDomain';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { ChibiDef, getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import { ChibiFieldFxController } from './FieldMiner3D';
import {
  createCyberShowcasePodium,
  type CyberShowcasePodiumHandle,
  type FusionPodiumBuildCtx,
} from './FusionWorldPodium3D';
import { createChamferSlabGeometry, createLatheProfileGeometry, disposeObject3D, enableShadows } from './MeshHelpers3D';
import {
  buildRooftopCommandBackdrop,
  createOmegaBossCircleTexture,
} from './OmegaRooftopAssets3D';
import {
  createOmegaRooftopEnvironment,
  type OmegaRooftopEnvironmentHandle,
} from './OmegaRooftopEnvironment3D';
import type { TowerFighterConfig } from './TowerArena3D';
import {
  getChibiAttackStyle,
  type PlotAttackStyle,
  type SignatureProjectileArrival,
  SignatureProjectilePool3D,
} from './SignatureProjectilePool3D';
import {
  CHIBI_ATTACK_ANIM_SEC,
  computeAttackVfxSpeedScale,
  TierAttackVfxPool3D,
  type TierVfxHooks,
  type WorldPoint3,
} from './TierAttackVfx3D';

export interface OmegaStrikeEvent {
  slotIndex: number;
  attackInterval: number;
  dmg: number;
  wx: number;
  wy: number;
  wz: number;
  accentColor?: string;
}

export interface OmegaTargetScreenAnchor {
  id: string;
  kind: OmegaTargetObject['kind'];
  x: number;
  y: number;
}

interface OmegaFighterEntry {
  slotIndex: number;
  chibiId: string;
  rarity: ChibiDef['rarity'];
  style: PlotAttackStyle;
  sprite: ChibiSprite3D;
  fx: ChibiFieldFxController;
  spawnPos: THREE.Vector3;
  dmg: number;
  attackInterval: number;
  attackCooldown: number;
  comboStep: number;
  colorHex: string;
}

interface OmegaTargetMeshEntry {
  id: string;
  kind: OmegaTargetObject['kind'];
  root: THREE.Group;
  hitMesh: THREE.Mesh;
  x: number;
  z: number;
}

const BOSS_POS_Z = -3.4;
const BOSS_DAIS_Y = 0.52;
const EMBER_COUNT = 54;
const PLAYER_PAD_POSITIONS: ReadonlyArray<[number, number]> = [
  [-3.8, 2.7],
  [-1.95, 3.65],
  [0, 4.05],
  [1.95, 3.65],
  [3.8, 2.7],
];

function buildTargetPropMesh(
  kind: OmegaTargetObject['kind'],
  accentHex: number,
  darkMat: THREE.Material,
  goldMat: THREE.Material
): THREE.Group {
  const prop = new THREE.Group();
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.45,
    flatShading: true,
  });

  if (kind === 'obsidian_pillar') {
    const plinth = new THREE.Mesh(createChamferSlabGeometry(1.18, 0.34, 1.18, 0.22, 0.03), darkMat);
    plinth.position.y = 0.17;
    const shaft = new THREE.Mesh(createChamferSlabGeometry(0.76, 2.05, 0.76, 0.16, 0.03), darkMat);
    shaft.position.y = 1.32;
    const runeCollar = new THREE.Mesh(createChamferSlabGeometry(0.94, 0.22, 0.94, 0.18, 0.02), glowMat);
    runeCollar.position.y = 1.68;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.68, 6), glowMat);
    cap.position.y = 2.68;
    enableShadows(plinth);
    enableShadows(shaft);
    prop.add(plinth, shaft, runeCollar, cap);
    return prop;
  }

  if (kind === 'phantom_blade') {
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 20),
      new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.04;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.75, 4), glowMat);
    blade.position.y = 1.15;
    blade.rotation.x = Math.PI;
    const tsuba = new THREE.Mesh(createChamferSlabGeometry(0.72, 0.14, 0.28, 0.06, 0.015), goldMat);
    tsuba.position.y = 2.02;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.48, 6), darkMat);
    hilt.position.y = 2.3;
    enableShadows(blade);
    enableShadows(tsuba);
    prop.add(floorRing, blade, tsuba, hilt);
    return prop;
  }

  // rune_seal: faceted astral diamond core + dual flat horizontal seal rings
  const floorSeal = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.86, 24),
    new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
  );
  floorSeal.rotation.x = -Math.PI / 2;
  floorSeal.position.y = 0.04;
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.055, 6, 20), goldMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 1.25;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), glowMat);
  core.position.y = 1.25;
  const spireTop = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 5), goldMat);
  spireTop.position.y = 1.92;
  enableShadows(core);
  prop.add(floorSeal, innerRing, core, spireTop);
  return prop;
}

/** Dedicated 3D "Omega Duel Sanctum" arena for 1v5 Boss battles against Crimson Ronin & Obsidian Sovereign. */
export class OmegaArena3D {
  public readonly group = new THREE.Group();
  public readonly clickables: THREE.Object3D[] = [];

  private bossId: OmegaBossId = 'crimson-ronin';
  private bossSprite: ChibiSprite3D | null = null;
  private readonly bossHitMesh: THREE.Mesh;
  private readonly bossDaisRingMat: THREE.MeshBasicMaterial;
  private readonly trimNeonMat: THREE.MeshBasicMaterial;
  private readonly secondaryNeonMat: THREE.MeshBasicMaterial;
  private readonly goldTrimMat: THREE.MeshStandardMaterial;
  private readonly darkArmorMat: THREE.MeshStandardMaterial;
  private readonly shrineLight: THREE.PointLight;
  private readonly squadFillLight: THREE.PointLight;
  private readonly breakFloorRing: THREE.Mesh;
  private readonly breakFloorMat: THREE.MeshBasicMaterial;
  private readonly daisSigilMesh: THREE.Mesh;
  private readonly daisOuterRingMesh: THREE.Mesh;
  private readonly outerSealRingMesh: THREE.Mesh;
  private readonly outerFloorSealMat: THREE.MeshBasicMaterial;
  private readonly shrineCrownCrystal: THREE.Mesh;
  private readonly shrineCrownCrystalBaseY: number;
  private readonly bossPodium: CyberShowcasePodiumHandle;
  private readonly bossStageY: number;
  private readonly playerPodiums: CyberShowcasePodiumHandle[] = [];
  private readonly conduitFlows: Array<{
    slotIndex: number;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    coreMat: THREE.MeshBasicMaterial;
    pulses: THREE.Mesh[];
  }> = [];
  private readonly podiumGeos: THREE.BufferGeometry[] = [];
  private readonly podiumMats: THREE.Material[] = [];
  private readonly podiumTextures: THREE.Texture[] = [];
  private readonly rooftopEnv: OmegaRooftopEnvironmentHandle;
  private readonly entranceDropBeam: THREE.Mesh;
  private readonly entranceDropMat: THREE.MeshBasicMaterial;
  private readonly entranceTargetRing: THREE.Mesh;
  private readonly entranceTargetMat: THREE.MeshBasicMaterial;
  private readonly invulShieldMesh: THREE.Mesh;
  private readonly invulShieldMat: THREE.MeshBasicMaterial;
  private readonly emberPoints: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberTexture: THREE.CanvasTexture | null;

  private readonly fighters = new Map<number, OmegaFighterEntry>();
  private readonly targetEntries = new Map<string, OmegaTargetMeshEntry>();
  private readonly targetsGroup = new THREE.Group();
  private readonly impactFx = new AttackImpactFxController();
  private readonly projectiles = new SignatureProjectilePool3D();
  private readonly tierVfx = new TierAttackVfxPool3D();
  private readonly projVec = new THREE.Vector3();
  private lowQuality = false;

  private battlePhase: OmegaBattlePhase | 'ended' = 'active';
  private entranceElapsed = 0;
  private entranceSlammed = true;
  private bossLandingBounce = 0;
  private invulShieldPulse = 0;
  private breakActive = false;
  private parryActive = false;
  private bossHitBounce = 0;

  constructor() {
    this.group.visible = false;

    this.trimNeonMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
    });
    this.secondaryNeonMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
    });
    const omegaCircleTex = createOmegaBossCircleTexture();
    if (omegaCircleTex) this.podiumTextures.push(omegaCircleTex);
    this.bossDaisRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      ...(omegaCircleTex ? { map: omegaCircleTex } : {}),
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.outerFloorSealMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      ...(omegaCircleTex ? { map: omegaCircleTex } : {}),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.breakFloorMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xca8a04,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.78,
      flatShading: true,
    });
    this.darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x26314a,
      roughness: 0.52,
      metalness: 0.45,
      flatShading: true,
    });

    this.shrineLight = new THREE.PointLight(0xe879f9, 18, 26, 1.3);
    this.shrineLight.position.set(0, 5.2, -3.6);
    this.squadFillLight = new THREE.PointLight(0x93c5fd, 14, 24, 1.3);
    this.squadFillLight.position.set(0, 4.4, 4.8);
    this.group.add(this.shrineLight, this.squadFillLight);

    this.rooftopEnv = createOmegaRooftopEnvironment();
    this.group.add(this.rooftopEnv.group);

    const stageHandles = this.buildArenaStage();
    this.daisSigilMesh = stageHandles.daisSigil;
    this.daisOuterRingMesh = stageHandles.daisOuterRing;
    this.outerSealRingMesh = stageHandles.outerSealRing;
    this.shrineCrownCrystal = stageHandles.shrineCrownCrystal;
    this.shrineCrownCrystalBaseY = stageHandles.crystalBaseY;
    this.bossPodium = stageHandles.bossPodium;
    this.bossStageY = BOSS_DAIS_Y + 0.04 + this.bossPodium.topY;

    // Rising atmospheric Sanctum embers
    const emberGeo = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      this.emberPositions[i * 3] = ((i * 37) % 18) - 9;
      this.emberPositions[i * 3 + 1] = ((i * 19) % 8);
      this.emberPositions[i * 3 + 2] = ((i * 29) % 14) - 7;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberTexture = this.createEmberDotTexture();
    const emberMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.28,
      ...(this.emberTexture ? { map: this.emberTexture } : {}),
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.group.add(this.emberPoints);

    this.bossHitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.15, 4.4, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    this.bossHitMesh.position.set(0, this.bossStageY + 2.2, BOSS_POS_Z);
    this.bossHitMesh.userData = { kind: 'omega-boss' };
    this.group.add(this.bossHitMesh);
    this.clickables.push(this.bossHitMesh);

    this.breakFloorRing = new THREE.Mesh(new THREE.RingGeometry(2.82, 3.08, 48), this.breakFloorMat);
    this.breakFloorRing.rotation.x = -Math.PI / 2;
    this.breakFloorRing.position.set(0, BOSS_DAIS_Y + 0.032, BOSS_POS_Z);
    this.group.add(this.breakFloorRing);

    // Boss Sky-Drop Entrance Beam + Landing Ring + 30s Invul Energy Shield Dome
    this.entranceDropMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamGeo = new THREE.CylinderGeometry(0.42, 1.05, 26, 12, 1, true);
    this.entranceDropBeam = new THREE.Mesh(beamGeo, this.entranceDropMat);
    this.entranceDropBeam.position.set(0, this.bossStageY + 13, BOSS_POS_Z);
    this.entranceDropBeam.visible = false;

    this.entranceTargetMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const dropRingGeo = new THREE.RingGeometry(1.5, 2.05, 32);
    this.entranceTargetRing = new THREE.Mesh(dropRingGeo, this.entranceTargetMat);
    this.entranceTargetRing.rotation.x = -Math.PI / 2;
    this.entranceTargetRing.position.set(0, BOSS_DAIS_Y + 0.045, BOSS_POS_Z);
    this.entranceTargetRing.visible = false;

    this.invulShieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const shieldGeo = new THREE.IcosahedronGeometry(2.55, 1);
    this.invulShieldMesh = new THREE.Mesh(shieldGeo, this.invulShieldMat);
    this.invulShieldMesh.position.set(0, this.bossStageY + 1.85, BOSS_POS_Z);
    this.invulShieldMesh.visible = false;

    this.podiumGeos.push(beamGeo, dropRingGeo, shieldGeo);
    this.podiumMats.push(this.entranceDropMat, this.entranceTargetMat, this.invulShieldMat);
    this.group.add(this.entranceDropBeam, this.entranceTargetRing, this.invulShieldMesh);

    this.group.add(this.targetsGroup, this.impactFx.group, this.projectiles.group, this.tierVfx.group);
    this.setBossId('crimson-ronin');
  }

  private createEmberDotTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(253,224,71,0.75)');
    g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  private applyPodiumColors(
    podium: CyberShowcasePodiumHandle,
    primaryHex: string,
    secondaryHex: string,
    activeAura: boolean,
    intensity = 1.15
  ): void {
    podium.ringMat.color.set(primaryHex);
    podium.ringMat.emissive.set(primaryHex);
    podium.ringMat.emissiveIntensity = intensity;
    podium.holoDiscMat.color.set(primaryHex);
    podium.sigilMat.color.set(primaryHex);
    podium.auraGroup.visible = activeAura;
    if (activeAura) {
      podium.auraVeilMat.uniforms.uColorA.value.set(primaryHex);
      podium.auraVeilMat.uniforms.uColorB.value.set(secondaryHex);
      podium.auraOuterVeilMat.uniforms.uColorA.value.set(secondaryHex);
      podium.auraOuterVeilMat.uniforms.uColorB.value.set(primaryHex);
      podium.particleMat.uniforms.uColorA.value.set(primaryHex);
      podium.particleMat.uniforms.uColorB.value.set(secondaryHex);
    }
  }

  private buildArenaStage(): {
    daisSigil: THREE.Mesh;
    daisOuterRing: THREE.Mesh;
    outerSealRing: THREE.Mesh;
    shrineCrownCrystal: THREE.Mesh;
    crystalBaseY: number;
    bossPodium: CyberShowcasePodiumHandle;
  } {
    const darkDeckMat = new THREE.MeshStandardMaterial({ color: 0x3b4963, roughness: 0.64, metalness: 0.22, flatShading: true });
    const rimMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.62, flatShading: true });
    const podiumSteelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.48, flatShading: true });
    const podiumBrightMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.52, flatShading: true });
    this.podiumMats.push(darkDeckMat, rimMetalMat, podiumSteelMat, podiumBrightMat);

    const podiumCtx: FusionPodiumBuildCtx = {
      armorDarkMat: rimMetalMat,
      armorSteelMat: podiumSteelMat,
      brightSteelMat: podiumBrightMat,
      ownedGeos: this.podiumGeos,
      ownedMats: this.podiumMats,
      ownedTextures: this.podiumTextures,
    };

    // Sculpted 3D Circular Stepped Boss Command Dais (r = 3.45m outer curb -> r = 2.88m top stage at y = BOSS_DAIS_Y)
    const circularDaisGeo = createLatheProfileGeometry(
      [
        [0.01, 0],
        [3.45, 0],
        [3.34, 0.22],
        [3.12, 0.26],
        [3.0, 0.48],
        [2.88, BOSS_DAIS_Y],
        [0.01, BOSS_DAIS_Y],
      ],
      24
    );
    const circularDais = new THREE.Mesh(circularDaisGeo, rimMetalMat);
    circularDais.position.set(0, 0, BOSS_POS_Z);
    enableShadows(circularDais);

    const daisTopCapGeo = new THREE.CylinderGeometry(2.84, 2.84, 0.02, 24);
    const daisTopCap = new THREE.Mesh(daisTopCapGeo, darkDeckMat);
    daisTopCap.position.set(0, BOSS_DAIS_Y, BOSS_POS_Z);
    daisTopCap.receiveShadow = true;

    const midAccentRingGeo = new THREE.RingGeometry(3.06, 3.24, 32);
    const midAccentRing = new THREE.Mesh(midAccentRingGeo, this.trimNeonMat);
    midAccentRing.rotation.x = -Math.PI / 2;
    midAccentRing.position.set(0, 0.265, BOSS_POS_Z);

    // 8 Radial Titanium Anchor Cleats bolted around the circular dais rim
    const cleatGeo = createChamferSlabGeometry(0.46, 0.3, 0.56, 0.08, 0.02);
    this.podiumGeos.push(circularDaisGeo, daisTopCapGeo, midAccentRingGeo, cleatGeo);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const cleat = new THREE.Mesh(cleatGeo, podiumBrightMat);
      cleat.position.set(Math.cos(ang) * 3.26, 0, BOSS_POS_Z + Math.sin(ang) * 3.26);
      cleat.rotation.y = -ang + Math.PI / 2;
      enableShadows(cleat);
      this.group.add(cleat);
    }

    const hasCircleTex = Boolean(this.bossDaisRingMat.map);
    const daisSigil = new THREE.Mesh(
      hasCircleTex ? new THREE.PlaneGeometry(5.2, 5.2) : new THREE.RingGeometry(2.1, 2.48, 32),
      this.bossDaisRingMat
    );
    daisSigil.rotation.x = -Math.PI / 2;
    daisSigil.position.set(0, BOSS_DAIS_Y + 0.016, BOSS_POS_Z);
    daisSigil.renderOrder = 2;

    const daisOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(2.62, 2.8, 32),
      this.secondaryNeonMat
    );
    daisOuterRing.rotation.x = -Math.PI / 2;
    daisOuterRing.position.set(0, BOSS_DAIS_Y + 0.025, BOSS_POS_Z);

    const bossPodium = createCyberShowcasePodium(podiumCtx, 'OMEGA', 1.85, true);
    bossPodium.group.position.set(0, BOSS_DAIS_Y + 0.04, BOSS_POS_Z);
    this.group.add(bossPodium.group);

    // Large High-Contrast Omega Seal Circle framing the entire circular dais on the rooftop
    const outerSealRing = new THREE.Mesh(
      hasCircleTex ? new THREE.PlaneGeometry(9.2, 9.2) : new THREE.RingGeometry(3.98, 4.18, 48),
      this.outerFloorSealMat
    );
    outerSealRing.rotation.x = -Math.PI / 2;
    outerSealRing.position.set(0, 0.008, BOSS_POS_Z);
    outerSealRing.renderOrder = 1;

    this.group.add(circularDais, daisTopCap, midAccentRing, daisSigil, daisOuterRing, outerSealRing);

    // Non-pillar Helipad Jet-Blast Deflector & Swept V-Wing Command Array behind Boss Dais
    const backdrop = buildRooftopCommandBackdrop(
      rimMetalMat,
      podiumSteelMat,
      podiumBrightMat,
      this.trimNeonMat,
      this.secondaryNeonMat,
      this.podiumGeos
    );
    backdrop.group.position.set(0, 0, -7.35);
    this.group.add(backdrop.group);
    const shrineCrownCrystal = backdrop.crystalMesh;
    const crystalBaseY = backdrop.crystalBaseY;

    // 5 Player Chibi Cyber-Showcase Podiums + multi-layer glowing Ley-Line Conduits toward Boss Dais
    const pulseGeo = new THREE.OctahedronGeometry(0.085, 0);
    pulseGeo.scale(0.85, 0.55, 2.2);
    this.podiumGeos.push(pulseGeo);

    for (let i = 0; i < PLAYER_PAD_POSITIONS.length; i++) {
      const [sx, sz] = PLAYER_PAD_POSITIONS[i];
      const podium = createCyberShowcasePodium(podiumCtx, `0${i + 1}`, 0.92, false);
      podium.group.position.set(sx, 0, sz);
      this.applyPodiumColors(podium, '#38bdf8', '#a855f7', false, 0.65);
      this.group.add(podium.group);
      this.playerPodiums.push(podium);

      const dx = -sx;
      const dz = BOSS_POS_Z - sz;
      const totalDist = Math.hypot(dx, dz);
      const startOff = 0.92;
      const endOff = 3.42;
      const segLen = totalDist - startOff - endOff;
      if (segLen > 0.4) {
        const nx = dx / totalDist;
        const nz = dz / totalDist;
        const startX = sx + nx * startOff;
        const startZ = sz + nz * startOff;
        const endX = sx + nx * (totalDist - endOff);
        const endZ = sz + nz * (totalDist - endOff);
        const yaw = Math.atan2(dx, dz);

        const conduitGroup = new THREE.Group();
        conduitGroup.position.set((startX + endX) * 0.5, 0, (startZ + endZ) * 0.5);
        conduitGroup.rotation.y = yaw;

        const channelGeo = new THREE.BoxGeometry(0.28, 0.026, segLen);
        const coreGeo = new THREE.BoxGeometry(0.095, 0.02, Math.max(0.2, segLen - 0.06));
        const railGeo = new THREE.BoxGeometry(0.024, 0.016, Math.max(0.2, segLen - 0.02));
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
        this.podiumGeos.push(channelGeo, coreGeo, railGeo);
        this.podiumMats.push(coreMat);

        const channel = new THREE.Mesh(channelGeo, rimMetalMat);
        channel.position.y = 0.024;
        const coreVein = new THREE.Mesh(coreGeo, coreMat);
        coreVein.position.y = 0.042;
        conduitGroup.add(channel, coreVein);

        for (const rx of [-0.125, 0.125]) {
          const rail = new THREE.Mesh(railGeo, this.secondaryNeonMat);
          rail.position.set(rx, 0.043, 0);
          conduitGroup.add(rail);
        }
        this.group.add(conduitGroup);

        const pulses: THREE.Mesh[] = [];
        for (let p = 0; p < 2; p++) {
          const pulse = new THREE.Mesh(pulseGeo, coreMat);
          pulse.rotation.y = yaw;
          pulse.position.set(startX, 0.065, startZ);
          pulse.visible = false;
          this.group.add(pulse);
          pulses.push(pulse);
        }
        this.conduitFlows.push({ slotIndex: i, startX, startZ, endX, endZ, coreMat, pulses });
      }
    }

    return { daisSigil, daisOuterRing, outerSealRing, shrineCrownCrystal, crystalBaseY, bossPodium };
  }

  public setBossId(bossId: OmegaBossId): void {
    this.bossId = bossId;
    const isSovereign = bossId === 'obsidian-sovereign';
    const accentHex = isSovereign ? '#a855f7' : '#ef4444';
    const secHex = isSovereign ? '#38bdf8' : '#fde047';

    this.trimNeonMat.color.set(accentHex);
    this.secondaryNeonMat.color.set(secHex);
    this.bossDaisRingMat.color.set(accentHex);
    this.outerFloorSealMat.color.set(secHex);
    this.shrineLight.color.set(accentHex);
    this.squadFillLight.color.set(secHex);
    this.applyPodiumColors(this.bossPodium, accentHex, secHex, true, 1.35);

    if (this.bossSprite) {
      this.group.remove(this.bossSprite.group);
      this.bossSprite.dispose();
      this.bossSprite = null;
    }

    const chibiDef: ChibiDef | undefined = getChibiById(bossId);
    if (chibiDef) {
      this.bossSprite = new ChibiSprite3D(chibiDef);
      this.bossSprite.group.position.set(0, this.bossStageY, BOSS_POS_Z);
      this.bossSprite.group.scale.setScalar(3.15);
      this.bossSprite.setFacing(-1);
      this.bossSprite.setLowQuality(this.lowQuality);
      this.group.add(this.bossSprite.group);
    }
  }

  public setTierVfxHooks(hooks: TierVfxHooks): void {
    this.tierVfx.setHooks(hooks);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.impactFx.setLowQuality(low);
    this.projectiles.setLowQuality(low);
    this.tierVfx.setLowQuality(low);
    this.bossSprite?.setLowQuality(low);
    this.bossPodium?.setLowQuality(low);
    this.emberPoints.visible = !low;
    for (let i = 0; i < this.playerPodiums.length; i++) {
      this.playerPodiums[i].setLowQuality(low);
    }
    for (const f of this.fighters.values()) {
      f.sprite.setLowQuality(low);
      f.fx.setLowQuality(low);
    }
  }

  public startEntranceCutscene(): void {
    this.battlePhase = 'entrance';
    this.entranceElapsed = 0;
    this.entranceSlammed = false;
    this.bossLandingBounce = 0;
    this.invulShieldPulse = 0;
    this.invulShieldMesh.visible = false;
    this.entranceDropBeam.visible = true;
    this.entranceTargetRing.visible = true;
    if (this.bossSprite) {
      this.bossSprite.group.position.set(0, 22, BOSS_POS_Z);
      this.bossSprite.group.scale.set(3.15 * 0.85, 3.15 * 1.25, 3.15);
      this.bossSprite.setAnimState('idle');
    }
    this.projectiles.clear();
    for (const f of this.fighters.values()) {
      f.sprite.setAnimState('idle');
      f.sprite.group.position.copy(f.spawnPos);
    }
  }

  public setBattlePhase(phase: OmegaBattlePhase | 'ended'): void {
    const prev = this.battlePhase;
    this.battlePhase = phase;
    this.invulShieldMesh.visible = phase === 'invul_shield';
    if (phase !== 'entrance') {
      this.entranceDropBeam.visible = false;
      this.entranceTargetRing.visible = false;
    }
    if (prev === 'invul_shield' && phase === 'active') {
      this.impactFx.spawnShatter({
        targetX: 0,
        targetY: this.bossStageY + 1.8,
        targetZ: BOSS_POS_Z + 0.4,
        oreColor: '#38bdf8',
        secondaryColor: '#fde047',
      });
    }
    if (phase !== 'active') {
      this.projectiles.clear();
      for (const f of this.fighters.values()) {
        f.sprite.setAnimState('idle');
        if (phase === 'ended') {
          f.sprite.group.position.copy(f.spawnPos);
        }
      }
    }
  }

  public pulseInvulShield(): void {
    this.invulShieldPulse = 0.28;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 1.2,
      targetY: this.bossStageY + 1.4 + Math.random() * 1.1,
      targetZ: BOSS_POS_Z + 0.8,
      accentColor: '#38bdf8',
      heavy: false,
      shockwaveScale: 1.25,
    });
  }

  public setBattleStatus(breakActive: boolean, parryActive: boolean): void {
    this.breakActive = breakActive;
    this.parryActive = parryActive;
    if (this.bossSprite) {
      this.bossSprite.setAnimState(parryActive ? 'attack' : 'idle');
    }
  }

  public syncFighters(configs: TowerFighterConfig[]): void {
    const incomingSlots = new Set<number>(configs.map((c) => c.slotIndex));
    for (const [slot, entry] of this.fighters.entries()) {
      if (!incomingSlots.has(slot)) {
        this.group.remove(entry.sprite.group);
        entry.fx.dispose();
        entry.sprite.dispose();
        this.fighters.delete(slot);
        const pod = this.playerPodiums[slot % this.playerPodiums.length];
        if (pod) this.applyPodiumColors(pod, '#38bdf8', '#a855f7', false, 0.55);
        const flow = this.conduitFlows.find((cf) => cf.slotIndex === slot % PLAYER_PAD_POSITIONS.length);
        if (flow) {
          flow.coreMat.color.set('#38bdf8');
          flow.coreMat.opacity = 0.35;
          flow.pulses.forEach((p) => {
            p.visible = false;
          });
        }
      }
    }

    for (const cfg of configs) {
      const podIdx = cfg.slotIndex % this.playerPodiums.length;
      const playerPod = this.playerPodiums[podIdx];
      if (playerPod) {
        this.applyPodiumColors(playerPod, cfg.def.accentColor, '#38bdf8', true, 1.15);
      }
      const flow = this.conduitFlows.find((cf) => cf.slotIndex === podIdx);
      if (flow) {
        flow.coreMat.color.set(cfg.def.accentColor);
        flow.coreMat.opacity = 0.92;
        flow.pulses.forEach((p) => {
          p.visible = true;
        });
      }
      const existing = this.fighters.get(cfg.slotIndex);
      if (existing && existing.chibiId === cfg.def.id) {
        existing.dmg = cfg.dmg;
        existing.attackInterval = Math.max(CHIBI_ATTACK_ANIM_SEC, Math.min(2.85, 2.85 / Math.max(0.4, cfg.miningMult)));
        existing.fx.setEnchant(cfg.enchantId);
        existing.sprite.setAccentColor(cfg.def.accentColor);
        existing.sprite.setAnimState('idle');
        continue;
      }
      if (existing) {
        this.group.remove(existing.sprite.group);
        existing.fx.dispose();
        existing.sprite.dispose();
        this.fighters.delete(cfg.slotIndex);
      }
      const [sx, sz] = PLAYER_PAD_POSITIONS[cfg.slotIndex % PLAYER_PAD_POSITIONS.length];
      const standY = playerPod ? playerPod.topY : 0.26;
      const sprite = new ChibiSprite3D(cfg.def);
      sprite.group.position.set(sx, standY, sz);
      sprite.setAnimState('idle');
      sprite.setFacing(sx <= 0 ? 1 : -1);
      sprite.setLowQuality(this.lowQuality);
      const fx = new ChibiFieldFxController(sprite.group, cfg.def.accentColor, cfg.slotIndex);
      fx.setEnchant(cfg.enchantId);
      fx.setLowQuality(this.lowQuality);
      this.group.add(sprite.group);

      this.fighters.set(cfg.slotIndex, {
        slotIndex: cfg.slotIndex,
        chibiId: cfg.def.id,
        rarity: cfg.def.rarity,
        style: getChibiAttackStyle(cfg.def),
        sprite,
        fx,
        spawnPos: new THREE.Vector3(sx, standY, sz),
        dmg: cfg.dmg,
        attackInterval: Math.max(CHIBI_ATTACK_ANIM_SEC, Math.min(2.85, 2.85 / Math.max(0.4, cfg.miningMult))),
        attackCooldown: 0.08 + cfg.slotIndex * 0.1,
        comboStep: 0,
        colorHex: cfg.def.accentColor,
      });
    }
  }

  public syncBattleTargets(targets: readonly OmegaTargetObject[]): void {
    const aliveIds = new Set(targets.map((t) => t.id));
    for (const [id, entry] of this.targetEntries.entries()) {
      if (!aliveIds.has(id)) {
        this.targetsGroup.remove(entry.root);
        const cIdx = this.clickables.indexOf(entry.hitMesh);
        if (cIdx >= 0) this.clickables.splice(cIdx, 1);
        disposeObject3D(entry.root);
        this.targetEntries.delete(id);
      }
    }

    for (const t of targets) {
      if (this.targetEntries.has(t.id)) continue;
      const root = new THREE.Group();
      const tx = t.xOffset;
      const tz = BOSS_POS_Z + t.zOffset + 1.5;
      root.position.set(tx, 0.1, tz);

      const colorHex = t.kind === 'phantom_blade' ? 0xf43f5e : t.kind === 'obsidian_pillar' ? 0xa855f7 : 0x38bdf8;
      const prop = buildTargetPropMesh(t.kind, colorHex, this.darkArmorMat, this.goldTrimMat);

      const hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 2.8, 1.65),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitMesh.position.y = 1.4;
      hitMesh.userData = { kind: 'omega-target', targetId: t.id };

      root.add(prop, hitMesh);
      this.targetsGroup.add(root);
      this.clickables.push(hitMesh);
      this.targetEntries.set(t.id, { id: t.id, kind: t.kind, root, hitMesh, x: tx, z: tz });
    }
  }

  public triggerBossHitEffect(accentColor?: string, isCrit = false): void {
    this.bossHitBounce = 0.24;
    this.impactFx.spawnImpact({
      targetX: (Math.random() - 0.5) * 0.5,
      targetY: this.bossStageY + 1.45,
      targetZ: BOSS_POS_Z + 0.35,
      accentColor: accentColor ?? (this.bossId === 'crimson-ronin' ? '#ef4444' : '#e879f9'),
      heavy: isCrit,
      shockwaveScale: isCrit ? 1.55 : 1.1,
    });
  }

  public triggerTargetShatterFx(wx: number, wz: number, colorHex: string): void {
    this.impactFx.spawnShatter({
      targetX: wx,
      targetY: 1.1,
      targetZ: wz,
      oreColor: colorHex,
      secondaryColor: '#fde047',
    });
  }

  public getBossHeadScreenAnchor(camera: THREE.Camera, width: number, height: number): { x: number; y: number } | null {
    this.projVec.set(0, this.bossStageY + 3.45, BOSS_POS_Z).project(camera);
    if (this.projVec.z <= -1 || this.projVec.z >= 1) return null;
    return {
      x: (this.projVec.x * 0.5 + 0.5) * width,
      y: (-this.projVec.y * 0.5 + 0.5) * height,
    };
  }

  public getTargetScreenAnchors(camera: THREE.Camera, width: number, height: number): OmegaTargetScreenAnchor[] {
    const out: OmegaTargetScreenAnchor[] = [];
    for (const entry of this.targetEntries.values()) {
      const anchorY =
        entry.kind === 'obsidian_pillar' ? 3.24 : entry.kind === 'phantom_blade' ? 2.74 : 2.38;
      this.projVec.set(entry.x, anchorY, entry.z).project(camera);
      if (this.projVec.z <= -1 || this.projVec.z >= 1) continue;
      out.push({
        id: entry.id,
        kind: entry.kind,
        x: (this.projVec.x * 0.5 + 0.5) * width,
        y: (-this.projVec.y * 0.5 + 0.5) * height,
      });
    }
    return out;
  }

  public update(
    dt: number,
    elapsed: number,
    camera: THREE.Camera,
    onStrike?: (ev: OmegaStrikeEvent) => void,
    onEntranceSlam?: () => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);

    if (this.bossHitBounce > 0) {
      this.bossHitBounce = Math.max(0, this.bossHitBounce - safeDt);
    }
    if (this.bossLandingBounce > 0) {
      this.bossLandingBounce = Math.max(0, this.bossLandingBounce - safeDt);
    }
    if (this.invulShieldPulse > 0) {
      this.invulShieldPulse = Math.max(0, this.invulShieldPulse - safeDt);
    }

    if (this.battlePhase === 'entrance') {
      this.entranceElapsed += safeDt;
      const t = this.entranceElapsed;
      if (t < 0.52) {
        const p = t / 0.52;
        this.entranceDropBeam.visible = true;
        this.entranceDropMat.opacity = p * 0.55;
        this.entranceDropBeam.scale.set(1.35 - p * 0.45, 1, 1.35 - p * 0.45);
        this.entranceTargetRing.visible = true;
        this.entranceTargetMat.opacity = 0.75;
        this.entranceTargetRing.scale.setScalar(1.4 - p * 0.55);
        if (this.bossSprite) {
          this.bossSprite.group.position.set(0, 22, BOSS_POS_Z);
        }
      } else if (t < 0.95) {
        const fallP = (t - 0.52) / (0.95 - 0.52);
        const eased = Math.pow(fallP, 2.3);
        const dropY = 22 + (this.bossStageY - 22) * eased;
        this.entranceDropBeam.visible = true;
        this.entranceDropMat.opacity = 0.75;
        this.entranceTargetRing.visible = true;
        this.entranceTargetMat.opacity = 0.9;
        this.entranceTargetRing.scale.setScalar(0.85 + fallP * 0.3);
        if (this.bossSprite) {
          this.bossSprite.group.position.set(0, dropY, BOSS_POS_Z);
          this.bossSprite.group.scale.set(3.15 * 0.82, 3.15 * 1.32, 3.15);
        }
      } else {
        if (!this.entranceSlammed) {
          this.entranceSlammed = true;
          this.bossLandingBounce = 0.42;
          this.impactFx.spawnShatter({
            targetX: 0,
            targetY: this.bossStageY + 0.5,
            targetZ: BOSS_POS_Z + 0.4,
            oreColor: this.bossId === 'crimson-ronin' ? '#ef4444' : '#e879f9',
            secondaryColor: '#fde047',
          });
          this.impactFx.spawnImpact({
            targetX: 0,
            targetY: this.bossStageY + 0.45,
            targetZ: BOSS_POS_Z + 0.5,
            accentColor: '#fde047',
            heavy: true,
            shockwaveScale: 2.4,
          });
          onEntranceSlam?.();
        }
        const postP = Math.min(1, (t - 0.95) / 0.55);
        this.entranceDropMat.opacity = (1 - postP) * 0.7;
        this.entranceTargetMat.opacity = (1 - postP) * 0.85;
        this.entranceTargetRing.scale.setScalar(1.15 + postP * 1.2);
        if (postP >= 1) {
          this.entranceDropBeam.visible = false;
          this.entranceTargetRing.visible = false;
        }
      }
    }

    if (this.bossSprite) {
      if (this.battlePhase !== 'entrance' || this.entranceSlammed) {
        const bob = this.breakActive ? -0.14 : Math.sin(elapsed * 2.4) * 0.08;
        const bounceZ = this.bossHitBounce > 0 ? -Math.sin((this.bossHitBounce / 0.24) * Math.PI) * 0.16 : 0;
        this.bossSprite.group.position.set(0, this.bossStageY + bob, BOSS_POS_Z + bounceZ);
        if (this.bossLandingBounce > 0) {
          const sq = Math.sin((this.bossLandingBounce / 0.42) * Math.PI);
          this.bossSprite.group.scale.set(3.15 * (1 + sq * 0.25), 3.15 * (1 - sq * 0.24), 3.15);
        } else {
          this.bossSprite.group.scale.setScalar(3.15);
        }
      }
      this.bossSprite.update(safeDt, elapsed, camera);
    }

    if (this.invulShieldMesh.visible) {
      this.invulShieldMesh.rotation.y = elapsed * 0.85;
      this.invulShieldMesh.rotation.z = Math.sin(elapsed * 1.4) * 0.08;
      const pulseFactor = this.invulShieldPulse > 0 ? this.invulShieldPulse / 0.28 : 0;
      this.invulShieldMat.opacity = 0.28 + Math.sin(elapsed * 4.5) * 0.08 + pulseFactor * 0.45;
      this.invulShieldMesh.scale.setScalar(1 + pulseFactor * 0.08);
    }

    const animatePodium = (pod: CyberShowcasePodiumHandle, phaseOffset: number): void => {
      const pTime = elapsed + phaseOffset;
      pod.sigilMesh.rotation.z = pTime * 0.28;
      if (pod.auraGroup.visible) {
        pod.auraVeilMat.uniforms.uTime.value = pTime;
        pod.auraVeilMat.uniforms.uOpacity.value = 0.65 + Math.sin(pTime * 1.8) * 0.12;
        pod.auraOuterVeilMat.uniforms.uTime.value = pTime + 0.6;
        pod.auraOuterVeilMat.uniforms.uOpacity.value = 0.36 + Math.sin(pTime * 1.8) * 0.08;
        pod.particleMat.uniforms.uTime.value = pTime;
      }
    };
    animatePodium(this.bossPodium, 0);
    for (let i = 0; i < this.playerPodiums.length; i++) {
      animatePodium(this.playerPodiums[i], i * 0.55);
    }

    this.breakFloorMat.opacity = this.breakActive ? 0.55 + Math.sin(elapsed * 12) * 0.25 : 0;
    this.bossDaisRingMat.opacity = this.parryActive ? 0.96 : 0.7 + Math.sin(elapsed * 3) * 0.14;
    this.daisSigilMesh.rotation.z = elapsed * 0.35;
    this.daisOuterRingMesh.rotation.z = Math.PI / 8 - elapsed * 0.16;
    this.outerSealRingMesh.rotation.z = -elapsed * 0.18;
    this.shrineCrownCrystal.rotation.y = elapsed * 1.3;
    this.shrineCrownCrystal.position.y = this.shrineCrownCrystalBaseY + Math.sin(elapsed * 2.2) * 0.14;
    this.rooftopEnv.update(safeDt, elapsed);

    if (!this.lowQuality) {
      const emberAttr = this.emberPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < EMBER_COUNT; i++) {
        let py = this.emberPositions[i * 3 + 1] + safeDt * (0.9 + (i % 4) * 0.22);
        if (py > 8.2) py = 0.2;
        this.emberPositions[i * 3 + 1] = py;
      }
      emberAttr.needsUpdate = true;
    }

    for (const entry of this.targetEntries.values()) {
      entry.root.rotation.y = elapsed * (entry.kind === 'obsidian_pillar' ? 0.8 : 2.2);
    }

    for (const flow of this.conduitFlows) {
      if (!flow.pulses[0]?.visible) continue;
      for (let pIdx = 0; pIdx < flow.pulses.length; pIdx++) {
        const frac = (elapsed * 0.85 + flow.slotIndex * 0.19 + pIdx * 0.5) % 1;
        const pulse = flow.pulses[pIdx];
        pulse.position.x = flow.startX + (flow.endX - flow.startX) * frac;
        pulse.position.z = flow.startZ + (flow.endZ - flow.startZ) * frac;
      }
    }

    const canAttack = this.battlePhase === 'active';
    if (!canAttack) {
      this.projectiles.clear();
      this.tierVfx.clear();
    }

    const handleOmegaArrival = (a: SignatureProjectileArrival): void => {
      const fighter = this.fighters.get(a.slotIndex);
      if (fighter) {
        const bossPt: WorldPoint3 = { x: 0, y: this.bossStageY, z: BOSS_POS_Z + 0.25 };
        const speedScale = computeAttackVfxSpeedScale(a.attackInterval);
        this.tierVfx.fireTierAttack({
          rarity: fighter.rarity,
          chibiId: fighter.chibiId,
          colorHex: a.accentColor,
          target: bossPt,
          allTargets: [bossPt],
          comboStep: a.comboStep,
          speedScale,
        });
      }
      onStrike?.({
        slotIndex: a.slotIndex,
        attackInterval: a.attackInterval,
        dmg: a.dmg,
        wx: a.ex,
        wy: a.ey,
        wz: a.ez,
        accentColor: a.accentColor,
      });
    };

    for (const f of this.fighters.values()) {
      f.fx.update(elapsed);
      f.colorHex = f.fx.getAccentColor();
      f.sprite.setAccentColor(f.colorHex);
      f.sprite.group.position.copy(f.spawnPos);
      f.sprite.setAnimState('idle');
      if (canAttack) {
        f.attackCooldown -= safeDt;
        if (f.attackCooldown <= 0) {
          f.attackCooldown = f.attackInterval;
          const step = f.comboStep;
          f.comboStep = (f.comboStep + 1) % 3;
          const bossPt: WorldPoint3 = { x: 0, y: this.bossStageY, z: BOSS_POS_Z + 0.25 };
          const blitzDur = CHIBI_ATTACK_ANIM_SEC;

          f.sprite.triggerBlitz({
            rarity: f.rarity,
            targetX: bossPt.x,
            targetY: bossPt.y,
            targetZ: bossPt.z,
            allTargets: [bossPt],
            durationSec: blitzDur,
            colorHex: f.colorHex,
            shadowOnly: true,
          });
          this.tierVfx.fireAnticipation(f.rarity, f.colorHex, bossPt, [bossPt]);

          this.projectiles.launch(
            {
              style: f.style,
              slotIndex: f.slotIndex,
              targetId: -1,
              dmg: f.dmg,
              comboStep: step,
              accentColor: f.colorHex,
              sx: f.spawnPos.x,
              sy: f.spawnPos.y + 1.25,
              sz: f.spawnPos.z,
              ex: (Math.random() - 0.5) * 0.9,
              ey: this.bossStageY + 1.85,
              ez: BOSS_POS_Z + 0.25,
              attackInterval: f.attackInterval,
              isBoss: true,
            },
            handleOmegaArrival
          );
        }
      } else {
        f.sprite.setAnimState('idle');
      }
      f.sprite.update(safeDt, elapsed, camera);
    }

    if (canAttack) {
      this.projectiles.step(safeDt, camera, handleOmegaArrival);
      if (camera) {
        this.tierVfx.update(safeDt, camera);
      }
    }

    this.impactFx.update(safeDt, camera);
  }

  public dispose(): void {
    this.projectiles.dispose();
    this.tierVfx.dispose();
    if (this.bossSprite) {
      this.bossSprite.dispose();
      this.bossSprite = null;
    }
    for (const f of this.fighters.values()) {
      f.fx.dispose();
      f.sprite.dispose();
    }
    this.fighters.clear();
    this.targetEntries.clear();
    this.impactFx.dispose();
    this.rooftopEnv.dispose();
    this.emberTexture?.dispose();
    for (const g of this.podiumGeos) g.dispose();
    for (const m of this.podiumMats) m.dispose();
    for (const t of this.podiumTextures) t.dispose();
    this.podiumGeos.length = 0;
    this.podiumMats.length = 0;
    this.podiumTextures.length = 0;
    this.playerPodiums.length = 0;
    this.conduitFlows.length = 0;
    disposeObject3D(this.group);
  }
}
