import * as THREE from 'three';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaTargetObject } from '../game/OmegaBossDomain';
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
import { getFusionMagicCircuitTexture } from './ProceduralTextures3D';
import type { TowerFighterConfig } from './TowerArena3D';

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
  sprite: ChibiSprite3D;
  fx: ChibiFieldFxController;
  spawnPos: THREE.Vector3;
  attackPos: THREE.Vector3;
  dmg: number;
  attackInterval: number;
  attackCooldown: number;
  comboStep: number;
  lungeTimer: number;
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
  private readonly floatingIslets: Array<{ group: THREE.Group; baseY: number; phase: number }> = [];
  private readonly emberPoints: THREE.Points;
  private readonly emberPositions: Float32Array;
  private readonly emberTexture: THREE.CanvasTexture | null;

  private readonly fighters = new Map<number, OmegaFighterEntry>();
  private readonly targetEntries = new Map<string, OmegaTargetMeshEntry>();
  private readonly targetsGroup = new THREE.Group();
  private readonly impactFx = new AttackImpactFxController();
  private readonly projVec = new THREE.Vector3();

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
    const circuitTex = getFusionMagicCircuitTexture();
    this.bossDaisRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      ...(circuitTex ? { map: circuitTex } : {}),
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.outerFloorSealMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      ...(circuitTex ? { map: circuitTex } : {}),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
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

    const stageHandles = this.buildArenaStage();
    this.daisSigilMesh = stageHandles.daisSigil;
    this.daisOuterRingMesh = stageHandles.daisOuterRing;
    this.outerSealRingMesh = stageHandles.outerSealRing;
    this.shrineCrownCrystal = stageHandles.shrineCrownCrystal;
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

    this.breakFloorRing = new THREE.Mesh(new THREE.RingGeometry(2.42, 2.74, 48), this.breakFloorMat);
    this.breakFloorRing.rotation.x = -Math.PI / 2;
    this.breakFloorRing.position.set(0, BOSS_DAIS_Y + 0.036, BOSS_POS_Z);
    this.group.add(this.breakFloorRing);

    this.group.add(this.targetsGroup, this.impactFx.group);
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
    bossPodium: CyberShowcasePodiumHandle;
  } {
    const darkDeckMat = new THREE.MeshStandardMaterial({ color: 0x2a3754, roughness: 0.68, metalness: 0.22, flatShading: true });
    const rimMetalMat = new THREE.MeshStandardMaterial({ color: 0x1d2942, roughness: 0.42, metalness: 0.55, flatShading: true });
    const podiumSteelMat = new THREE.MeshStandardMaterial({ color: 0x3b4d74, roughness: 0.4, metalness: 0.42, flatShading: true });
    const podiumBrightMat = new THREE.MeshStandardMaterial({ color: 0x7c90ad, roughness: 0.34, metalness: 0.48, flatShading: true });
    this.podiumMats.push(darkDeckMat, rimMetalMat, podiumSteelMat, podiumBrightMat);

    const podiumCtx: FusionPodiumBuildCtx = {
      armorDarkMat: rimMetalMat,
      armorSteelMat: podiumSteelMat,
      brightSteelMat: podiumBrightMat,
      ownedGeos: this.podiumGeos,
      ownedMats: this.podiumMats,
      ownedTextures: this.podiumTextures,
    };

    // Main octagonal floating sanctum deck (top surface strictly at y = 0.0)
    const underHull = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [3.6, -2.8],
          [7.4, -1.4],
          [10.2, -0.44],
        ],
        8
      ),
      rimMetalMat
    );
    const mainSlab = new THREE.Mesh(createChamferSlabGeometry(19.6, 0.44, 16.2, 3.8, 0.06), darkDeckMat);
    mainSlab.position.set(0, -0.44, 0.2);
    enableShadows(mainSlab);

    const trimRing = new THREE.Mesh(createChamferSlabGeometry(19.9, 0.14, 16.5, 3.9, 0.02), this.trimNeonMat);
    trimRing.position.set(0, -0.18, 0.2);

    // Dual-stepped Boss Shrine Dais (top strictly at y = BOSS_DAIS_Y) + Grand Cyber-Showcase Boss Podium
    const daisBase = new THREE.Mesh(createChamferSlabGeometry(7.6, 0.26, 6.0, 1.5, 0.04), rimMetalMat);
    daisBase.position.set(0, 0, BOSS_POS_Z);
    enableShadows(daisBase);

    const daisStep = new THREE.Mesh(createChamferSlabGeometry(6.2, BOSS_DAIS_Y - 0.26, 4.8, 1.2, 0.03), darkDeckMat);
    daisStep.position.set(0, 0.26, BOSS_POS_Z);
    enableShadows(daisStep);

    const hasCircuitTex = Boolean(this.bossDaisRingMat.map);
    const daisSigil = new THREE.Mesh(
      hasCircuitTex ? new THREE.PlaneGeometry(5.1, 5.1) : new THREE.RingGeometry(2.1, 2.48, 32),
      this.bossDaisRingMat
    );
    daisSigil.rotation.x = -Math.PI / 2;
    daisSigil.position.set(0, BOSS_DAIS_Y + 0.015, BOSS_POS_Z);
    daisSigil.renderOrder = 2;

    const daisOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(2.38, 2.5, 8),
      this.secondaryNeonMat
    );
    daisOuterRing.rotation.x = -Math.PI / 2;
    daisOuterRing.rotation.z = Math.PI / 8;
    daisOuterRing.position.set(0, BOSS_DAIS_Y + 0.03, BOSS_POS_Z);

    const bossPodium = createCyberShowcasePodium(podiumCtx, 'OMEGA', 1.85, true);
    bossPodium.group.position.set(0, BOSS_DAIS_Y + 0.04, BOSS_POS_Z);
    this.group.add(bossPodium.group);

    const outerSealRing = new THREE.Mesh(
      hasCircuitTex ? new THREE.PlaneGeometry(8.6, 8.6) : new THREE.RingGeometry(3.98, 4.18, 48),
      this.outerFloorSealMat
    );
    outerSealRing.rotation.x = -Math.PI / 2;
    outerSealRing.position.set(0, 0.012, BOSS_POS_Z);
    outerSealRing.renderOrder = 1;

    this.group.add(underHull, mainSlab, trimRing, daisBase, daisStep, daisSigil, daisOuterRing, outerSealRing);

    // Sculpted Rear Torii / Sanctum Portal Gate framing Boss dais cleanly below top HUD bar
    const gateZ = -5.9;
    for (const sx of [-1, 1]) {
      const gatePlinth = new THREE.Mesh(createChamferSlabGeometry(1.4, 0.48, 1.4, 0.2, 0.03), rimMetalMat);
      gatePlinth.position.set(sx * 4.15, 0.24, gateZ);
      const gatePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 3.85, 6), rimMetalMat);
      gatePillar.position.set(sx * 4.15, 2.15, gateZ);
      const pillarBand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.24, 6), this.trimNeonMat);
      pillarBand.position.set(sx * 4.15, 2.95, gateZ);
      enableShadows(gatePlinth);
      enableShadows(gatePillar);
      this.group.add(gatePlinth, gatePillar, pillarBand);
    }
    const lowerCrossbar = new THREE.Mesh(createChamferSlabGeometry(9.8, 0.3, 0.6, 0.12, 0.02), rimMetalMat);
    lowerCrossbar.position.set(0, 3.55, gateZ);
    const upperKasagi = new THREE.Mesh(createChamferSlabGeometry(11.4, 0.42, 0.84, 0.18, 0.03), darkDeckMat);
    upperKasagi.position.set(0, 4.12, gateZ);
    const kasagiTrim = new THREE.Mesh(createChamferSlabGeometry(10.8, 0.14, 0.9, 0.12, 0.015), this.secondaryNeonMat);
    kasagiTrim.position.set(0, 4.38, gateZ);
    const shrineCrownCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.54, 0), this.trimNeonMat);
    shrineCrownCrystal.position.set(0, 4.98, gateZ);
    enableShadows(lowerCrossbar);
    enableShadows(upperKasagi);
    this.group.add(lowerCrossbar, upperKasagi, kasagiTrim, shrineCrownCrystal);

    // 8 Perimeter cyber-monolith pillars framing the arena
    for (let i = 0; i < 8; i++) {
      const angle = ((i + 0.5) / 8) * Math.PI * 2;
      const px = Math.cos(angle) * 8.8;
      const pz = Math.sin(angle) * 7.0 + 0.2;
      if (pz > 4.6 && Math.abs(px) < 4.5) continue;
      const h = pz < 0 ? 4.4 : 2.8;
      const base = new THREE.Mesh(createChamferSlabGeometry(1.1, 0.35, 1.1, 0.18, 0.02), rimMetalMat);
      base.position.set(px, 0.175, pz);
      const pillar = new THREE.Mesh(createChamferSlabGeometry(0.75, h, 0.75, 0.12, 0.02), rimMetalMat);
      pillar.position.set(px, h * 0.5, pz);
      enableShadows(base);
      enableShadows(pillar);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.64, 6), this.secondaryNeonMat);
      cap.position.set(px, h + 0.36, pz);
      this.group.add(base, pillar, cap);
    }

    // 6 Distant Floating Shattered Shrine Islets for aerial abyssal depth
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const islet = new THREE.Group();
      const ix = side * (12.8 + (i % 3) * 2.1);
      const iy = 0.6 + (i % 3) * 1.45;
      const iz = -6.5 + Math.floor(i / 2) * 5.2;
      islet.position.set(ix, iy, iz);
      const rockUnder = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 6), rimMetalMat);
      rockUnder.rotation.x = Math.PI;
      rockUnder.position.y = -1.1;
      const rockTop = new THREE.Mesh(createChamferSlabGeometry(2.5, 0.34, 2.2, 0.55, 0.04), darkDeckMat);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), i % 2 === 0 ? this.trimNeonMat : this.secondaryNeonMat);
      crystal.position.y = 0.85;
      islet.add(rockUnder, rockTop, crystal);
      this.group.add(islet);
      this.floatingIslets.push({ group: islet, baseY: iy, phase: i * 1.15 });
    }

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
      const endOff = 2.95;
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
        channel.position.y = 0.013;
        const coreVein = new THREE.Mesh(coreGeo, coreMat);
        coreVein.position.y = 0.032;
        conduitGroup.add(channel, coreVein);

        for (const rx of [-0.125, 0.125]) {
          const rail = new THREE.Mesh(railGeo, this.secondaryNeonMat);
          rail.position.set(rx, 0.033, 0);
          conduitGroup.add(rail);
        }
        this.group.add(conduitGroup);

        const pulses: THREE.Mesh[] = [];
        for (let p = 0; p < 2; p++) {
          const pulse = new THREE.Mesh(pulseGeo, coreMat);
          pulse.rotation.y = yaw;
          pulse.position.set(startX, 0.056, startZ);
          pulse.visible = false;
          this.group.add(pulse);
          pulses.push(pulse);
        }
        this.conduitFlows.push({ slotIndex: i, startX, startZ, endX, endZ, coreMat, pulses });
      }
    }

    return { daisSigil, daisOuterRing, outerSealRing, shrineCrownCrystal, bossPodium };
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
      this.group.add(this.bossSprite.group);
    }
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
        existing.attackInterval = Math.max(0.32, 0.9 / Math.max(0.4, cfg.miningMult));
        existing.fx.setEnchant(cfg.enchantId);
        existing.sprite.setAccentColor(cfg.def.accentColor);
        existing.sprite.setAnimState('attack');
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
      sprite.setAnimState('attack');
      sprite.setFacing(sx <= 0 ? 1 : -1);
      const fx = new ChibiFieldFxController(sprite.group, cfg.def.accentColor, cfg.slotIndex);
      fx.setEnchant(cfg.enchantId);
      this.group.add(sprite.group);

      const angleToBoss = Math.atan2(sz - BOSS_POS_Z, sx);
      const attackPos = new THREE.Vector3(Math.cos(angleToBoss) * 1.9, standY + 0.14, BOSS_POS_Z + Math.sin(angleToBoss) * 1.7);
      this.fighters.set(cfg.slotIndex, {
        slotIndex: cfg.slotIndex,
        chibiId: cfg.def.id,
        sprite,
        fx,
        spawnPos: new THREE.Vector3(sx, standY, sz),
        attackPos,
        dmg: cfg.dmg,
        attackInterval: Math.max(0.32, 0.9 / Math.max(0.4, cfg.miningMult)),
        attackCooldown: 0.15 + cfg.slotIndex * 0.14,
        comboStep: 0,
        lungeTimer: 0,
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
    onStrike?: (ev: OmegaStrikeEvent) => void
  ): void {
    if (!this.group.visible) return;
    const safeDt = Math.min(Math.max(0, dt), 0.1);

    if (this.bossHitBounce > 0) {
      this.bossHitBounce = Math.max(0, this.bossHitBounce - safeDt);
    }
    if (this.bossSprite) {
      const bob = this.breakActive ? -0.14 : Math.sin(elapsed * 2.4) * 0.08;
      const bounceZ = this.bossHitBounce > 0 ? -Math.sin((this.bossHitBounce / 0.24) * Math.PI) * 0.16 : 0;
      this.bossSprite.group.position.set(0, this.bossStageY + bob, BOSS_POS_Z + bounceZ);
      this.bossSprite.update(safeDt, elapsed, camera);
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
    this.shrineCrownCrystal.position.y = 4.98 + Math.sin(elapsed * 2.2) * 0.14;

    for (const isl of this.floatingIslets) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * 1.15 + isl.phase) * 0.32;
    }

    const emberAttr = this.emberPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < EMBER_COUNT; i++) {
      let py = this.emberPositions[i * 3 + 1] + safeDt * (0.9 + (i % 4) * 0.22);
      if (py > 8.2) py = 0.2;
      this.emberPositions[i * 3 + 1] = py;
    }
    emberAttr.needsUpdate = true;

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

    for (const f of this.fighters.values()) {
      f.sprite.setAnimState('attack');
      f.attackCooldown -= safeDt;
      if (f.lungeTimer > 0) f.lungeTimer = Math.max(0, f.lungeTimer - safeDt);

      if (f.attackCooldown <= 0) {
        f.attackCooldown = f.attackInterval;
        f.lungeTimer = 0.24;
        f.comboStep = (f.comboStep + 1) % 3;
        f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), f.comboStep);
        onStrike?.({
          slotIndex: f.slotIndex,
          attackInterval: f.attackInterval,
          dmg: f.dmg,
          wx: (Math.random() - 0.5) * 0.9,
          wy: this.bossStageY + 1.85,
          wz: BOSS_POS_Z,
          accentColor: f.colorHex,
        });
      }

      const t = f.lungeTimer > 0 ? Math.sin((f.lungeTimer / 0.24) * Math.PI) * 0.24 : 0;
      f.sprite.group.position.lerpVectors(f.spawnPos, f.attackPos, t);
      f.fx.update(elapsed);
      f.sprite.update(safeDt, elapsed, camera);
    }

    this.impactFx.update(safeDt, camera);
  }

  public dispose(): void {
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
