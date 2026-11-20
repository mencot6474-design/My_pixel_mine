import * as THREE from 'three';
import { FUSION_RECIPES, FusionRecipeDef } from '../game/FusionData';
import { getOreById } from '../game/GameData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import {
  createCyberCrystalCluster,
  disposeCyberProp,
} from './CyberProps3D';
import {
  buildElevatedShowcaseStage,
  buildExpandedOctagonalArenaDeck,
  buildFloatingCosmicIslands,
  buildPerimeterTechPylons,
  buildSynchroPortal,
  type FloatingIslandNode,
  type FusionArenaBuildCtx,
} from './FusionWorldArena3D';
import {
  createCyberShowcasePodium,
  type CyberShowcasePodiumHandle,
} from './FusionWorldPodium3D';
import {
  getFusionMagicCircuitTexture,
  getFusionPortalVortexTexture,
} from './ProceduralTextures3D';
import type { ShopChibiBubbleAnchor } from './ShopWorld3D';
interface MaterialPedestalSlot {
  podium: CyberShowcasePodiumHandle;
  holoGridRing: THREE.Mesh;
  holoGridMat: THREE.MeshBasicMaterial;
  conduitGroup: THREE.Group;
  conduitMat: THREE.MeshBasicMaterial;
  conduitPulseMeshes: THREE.Mesh[];
  sprite: ChibiSprite3D | null;
  chibiId: string | null;
  ready: boolean;
  pos: THREE.Vector3;
}
interface OreCrystalNode {
  group: THREE.Group;
  crystalMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  floatingShards: THREE.Mesh[];
  oreSlotIndex: number;
  ready: boolean;
  baseY: number;
  phase: number;
}
interface FusionNpcWalker {
  id: string;
  sprite: ChibiSprite3D;
  holoCube: THREE.Mesh;
  homeX: number;
  homeZ: number;
  patrolX: number;
  patrolZ: number;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  pauseTimer: number;
  bubbleText: string | null;
  bubbleTimer: number;
  nextBubbleCooldown: number;
  facingRight: boolean;
}
interface EnergyOrb {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  dur: number;
  arcH: number;
}
const MAX_MAT_SLOTS = 3;
const PORTAL_CENTER = new THREE.Vector3(0, 5.15, -6.85);
const STAGE_CENTER_Z = -2.45;
const STAGE_DECK_Y = 0.76;
const APEX_PODIUM_SCALE = 1.32;
const MAT_PODIUM_SCALE = 1.12;
const DAIS_TOP_Y = STAGE_DECK_Y + 0.285 * APEX_PODIUM_SCALE;
const FUSION_NPC_DEFAULT_LINES: readonly string[] = [
  'Synthesizing cyber-core...',
  'Need more Azurine!',
  'Energy levels stable!',
  'Synchro Portal rings aligned!',
  'Calibrating quantum resonators...',
  'Hologram matrix locked!',
];
const FUSION_NPC_READY_LINES: readonly string[] = [
  'All materials ready! Hit FUSE!',
  'Synchro output at 100%!',
  'Energy levels stable!',
  'Portal resonance critical - ready!',
];
export class FusionWorld3D {
  public readonly group = new THREE.Group();
  private readonly impactFx = new AttackImpactFxController({ floorY: DAIS_TOP_Y });
  private readonly ownedGeos: THREE.BufferGeometry[] = [];
  private readonly ownedMats: THREE.Material[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];
  private readonly customDisposers: Array<() => void> = [];
  private readonly armorDarkMat: THREE.MeshStandardMaterial;
  private readonly armorSteelMat: THREE.MeshStandardMaterial;
  private readonly brightSteelMat: THREE.MeshStandardMaterial;
  private readonly deckTrimCyanMat: THREE.MeshStandardMaterial;
  private readonly deckTrimMagentaMat: THREE.MeshStandardMaterial;
  private readonly stageNeonMat: THREE.MeshStandardMaterial;
  private readonly magicCircleMesh: THREE.Mesh;
  private readonly magicCircleMat: THREE.MeshBasicMaterial;
  private readonly innerRingMesh: THREE.Mesh;
  private readonly outerRingMesh: THREE.Mesh;
  private readonly innerRingMat: THREE.MeshBasicMaterial;
  private readonly outerRingMat: THREE.MeshBasicMaterial;
  // Grand Apex ZZZ/HSR Cyber-Showcase Podium on the Elevated Rear Stage
  private readonly apexPodium: CyberShowcasePodiumHandle;
  // Triple Synchro Portal behind Rear Apex Stage
  private readonly portalOuterGroup = new THREE.Group();
  private readonly portalMidGroup = new THREE.Group();
  private readonly portalInnerGroup = new THREE.Group();
  private readonly portalOuterMat: THREE.MeshStandardMaterial;
  private readonly portalMidMat: THREE.MeshStandardMaterial;
  private readonly portalInnerMat: THREE.MeshStandardMaterial;
  private readonly portalVortexMesh: THREE.Mesh;
  private readonly portalVortexMat: THREE.MeshBasicMaterial;
  private readonly portalFlashMesh: THREE.Mesh;
  private readonly portalFlashMat: THREE.MeshBasicMaterial;
  // Skyward Light Beam
  private readonly lightBeamOuterMesh: THREE.Mesh;
  private readonly lightBeamInnerMesh: THREE.Mesh;
  private readonly lightBeamOuterMat: THREE.MeshBasicMaterial;
  private readonly lightBeamInnerMat: THREE.MeshBasicMaterial;
  private readonly starField: THREE.Points;
  private readonly floatingIslands: FloatingIslandNode[] = [];
  private readonly oreClusters: OreCrystalNode[] = [];
  private readonly fusionNpcs: FusionNpcWalker[] = [];
  private readonly npcProjVec = new THREE.Vector3();
  private readonly materialSlots: MaterialPedestalSlot[] = [];
  private readonly resultMount = new THREE.Group();
  private resultSprite: ChibiSprite3D | null = null;
  private resultChibiId: string | null = null;
  private activeRecipeId: string | null = null;
  private readonly orbGeo = new THREE.SphereGeometry(0.18, 10, 10);
  private readonly energyOrbs: EnergyOrb[] = [];
  private fusionAnimTimer = 0;
  private readonly fusionAnimDur = 3.45;
  private portalBurstFired = false;
  private fusionBurstFired = false;
  private landingEchoFired = false;
  private revealHold = false;
  private readonly camFocusPos = new THREE.Vector3();
  private readonly camFocusLook = new THREE.Vector3();
  private fusionAccentHex = '#22d3ee';
  private fusionGlowHex = '#d946ef';
  private allRequirementsReady = false;
  private missingOreName: string | null = null;
  private onFusionAnimComplete: (() => void) | null = null;
  private revealPopTimer = 0;
  private portalFlashTimer = 0;
  constructor() {
    this.group.visible = false;
    this.group.add(this.impactFx.group);
    // Shared structural materials
    const darkBasaltMat = new THREE.MeshStandardMaterial({
      color: '#0b1121',
      roughness: 0.78,
      metalness: 0.25,
      flatShading: true,
    });
    this.armorDarkMat = new THREE.MeshStandardMaterial({
      color: '#131b2b',
      roughness: 0.52,
      metalness: 0.44,
      flatShading: true,
    });
    this.armorSteelMat = new THREE.MeshStandardMaterial({
      color: '#1e2c44',
      roughness: 0.42,
      metalness: 0.52,
      flatShading: true,
    });
    this.brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#354764',
      roughness: 0.3,
      metalness: 0.62,
      flatShading: true,
    });
    this.deckTrimCyanMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true,
    });
    this.deckTrimMagentaMat = new THREE.MeshStandardMaterial({
      color: '#d946ef',
      emissive: '#d946ef',
      emissiveIntensity: 1.1,
      roughness: 0.24,
      metalness: 0.35,
      flatShading: true,
    });
    this.stageNeonMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.32,
      flatShading: true,
    });
    this.ownedMats.push(
      darkBasaltMat,
      this.armorDarkMat,
      this.armorSteelMat,
      this.brightSteelMat,
      this.deckTrimCyanMat,
      this.deckTrimMagentaMat,
      this.stageNeonMat
    );
    // 1. Wide Cosmic Starfield
    const starCount = 340;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 38;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.72 + 1.2;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 3;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#bae6fd',
      size: 0.24,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(starGeo);
    this.ownedMats.push(starMat);
    this.starField = new THREE.Points(starGeo, starMat);
    this.group.add(this.starField);
    // 2. Expanded 23m-Wide Multi-Layered Octagonal Arena Deck + Dual Neon Trims + 17.2m Circuit Grid
    this.buildExpandedOctagonalArenaDeck(darkBasaltMat);
    this.magicCircleMat = new THREE.MeshBasicMaterial({
      map: getFusionMagicCircuitTexture(),
      color: '#22d3ee',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const magicCircleGeo = new THREE.PlaneGeometry(17.2, 17.2);
    this.magicCircleMesh = new THREE.Mesh(magicCircleGeo, this.magicCircleMat);
    this.magicCircleMesh.rotation.x = -Math.PI / 2;
    this.magicCircleMesh.position.y = 0.036;
    this.magicCircleMesh.renderOrder = 1;
    this.group.add(this.magicCircleMesh);
    const innerRingGeo = new THREE.RingGeometry(2.75, 2.92, 48);
    this.innerRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.innerRingMesh = new THREE.Mesh(innerRingGeo, this.innerRingMat);
    this.innerRingMesh.rotation.x = -Math.PI / 2;
    // Center in the open front Crescent Arc arena instead of underneath the rear stage stairs
    this.innerRingMesh.position.set(0, 0.048, 1.35);
    this.innerRingMesh.renderOrder = 2;
    this.group.add(this.innerRingMesh);
    const outerRingGeo = new THREE.RingGeometry(6.85, 7.08, 64);
    this.outerRingMat = new THREE.MeshBasicMaterial({
      color: '#d946ef',
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.outerRingMesh = new THREE.Mesh(outerRingGeo, this.outerRingMat);
    this.outerRingMesh.rotation.x = -Math.PI / 2;
    this.outerRingMesh.position.y = 0.044;
    this.outerRingMesh.renderOrder = 2;
    this.group.add(this.outerRingMesh);
    this.ownedGeos.push(magicCircleGeo, innerRingGeo, outerRingGeo);
    this.ownedMats.push(this.magicCircleMat, this.innerRingMat, this.outerRingMat);
    // 3. Elevated Cyber-Holographic Rear Showcase Stage + Grand Apex ZZZ/HSR Podium + 6 Tech Towers
    this.buildElevatedShowcaseStage();
    this.apexPodium = this.createCyberShowcasePodium('APEX', APEX_PODIUM_SCALE, true);
    this.apexPodium.group.position.set(0, STAGE_DECK_Y, STAGE_CENTER_Z);
    this.group.add(this.apexPodium.group);
    this.buildPerimeterTechPylons(darkBasaltMat);
    // 4. Giant Rear Triple-Ring "Synchro Portal" Centerpiece
    this.portalOuterMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.15,
      roughness: 0.25,
      metalness: 0.55,
      flatShading: true,
    });
    this.portalMidMat = new THREE.MeshStandardMaterial({
      color: '#d946ef',
      emissive: '#d946ef',
      emissiveIntensity: 1.0,
      roughness: 0.28,
      metalness: 0.5,
      flatShading: true,
    });
    this.portalInnerMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: '#facc15',
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.45,
      flatShading: true,
    });
    this.portalVortexMat = new THREE.MeshBasicMaterial({
      map: getFusionPortalVortexTexture(),
      color: '#38bdf8',
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.portalFlashMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ownedMats.push(
      this.portalOuterMat,
      this.portalMidMat,
      this.portalInnerMat,
      this.portalVortexMat,
      this.portalFlashMat
    );
    const vortexGeo = new THREE.CircleGeometry(1.88, 36);
    const flashGeo = new THREE.CircleGeometry(2.85, 36);
    this.ownedGeos.push(vortexGeo, flashGeo);
    this.portalVortexMesh = new THREE.Mesh(vortexGeo, this.portalVortexMat);
    this.portalFlashMesh = new THREE.Mesh(flashGeo, this.portalFlashMat);
    this.portalFlashMesh.position.z = 0.08;
    this.portalFlashMesh.visible = false;
    this.buildSynchroPortal();
    // 5. Skyward Central Light Beam Pillar
    const beamOuterGeo = new THREE.CylinderGeometry(1.15, 1.85, 13.5, 24, 1, true);
    const beamInnerGeo = new THREE.CylinderGeometry(0.42, 0.85, 13.5, 18, 1, true);
    this.lightBeamOuterMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.lightBeamInnerMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ownedGeos.push(beamOuterGeo, beamInnerGeo);
    this.ownedMats.push(this.lightBeamOuterMat, this.lightBeamInnerMat);
    this.lightBeamOuterMesh = new THREE.Mesh(beamOuterGeo, this.lightBeamOuterMat);
    this.lightBeamOuterMesh.position.set(0, DAIS_TOP_Y + 6.75, STAGE_CENTER_Z);
    this.lightBeamInnerMesh = new THREE.Mesh(beamInnerGeo, this.lightBeamInnerMat);
    this.lightBeamInnerMesh.position.set(0, DAIS_TOP_Y + 6.75, STAGE_CENTER_Z);
    this.group.add(this.lightBeamOuterMesh, this.lightBeamInnerMesh);
    // Result Chibi mount above Grand Apex Podium
    this.resultMount.position.set(0, DAIS_TOP_Y + 0.04, STAGE_CENTER_Z);
    this.group.add(this.resultMount);
    // 6. Outer Material ZZZ/HSR Cyber-Showcase Podiums + Grooved Floor Energy Conduits
    this.buildMaterialPedestals();
    // 7. Physical Recipe Ore Crystal Clusters + 8 Large Floating Cosmic Islands
    this.buildRecipeOreClusters();
    this.buildFloatingCosmicIslands(darkBasaltMat);
    // 8. Alchemist / Cyber-Scientist NPCs + Holographic Consoles
    this.buildFusionNpcs();
    // Default initial preview
    if (FUSION_RECIPES[0]) {
      this.syncRecipe(FUSION_RECIPES[0], [false, false], [false, false], false);
    }
  }
  /**
   * Builds a ZZZ/HSR Cyber-Showcase Podium matching `PlotPedestal3D.ts` in Mining:
   * Chamfered composite dock bay, side bumper guards + cooling louvers, edge-lit seam strip,
   * stepped octagonal machinery plinth + brushed titanium collar, front-angled plaque,
   * waist-high rear holographic display stanchions & power manifold, frosted emitter lens,
   * 4 corner claws + diodes, ground sigil, dual-shell Fresnel aura, and GPU star-ember particles.
   */
  private createCyberShowcasePodium(plaqueLabel: string, scale = 1, withDualAuraShells = false): CyberShowcasePodiumHandle {
    return createCyberShowcasePodium(
      {
        armorDarkMat: this.armorDarkMat,
        armorSteelMat: this.armorSteelMat,
        brightSteelMat: this.brightSteelMat,
        ownedGeos: this.ownedGeos,
        ownedMats: this.ownedMats,
        ownedTextures: this.ownedTextures,
      },
      plaqueLabel,
      scale,
      withDualAuraShells
    );
  }
  private arenaBuildCtx(): FusionArenaBuildCtx {
    return {
      group: this.group, armorDarkMat: this.armorDarkMat, armorSteelMat: this.armorSteelMat, brightSteelMat: this.brightSteelMat,
      deckTrimCyanMat: this.deckTrimCyanMat, deckTrimMagentaMat: this.deckTrimMagentaMat, stageNeonMat: this.stageNeonMat,
      portalOuterMat: this.portalOuterMat, portalMidMat: this.portalMidMat, portalInnerMat: this.portalInnerMat,
      portalOuterGroup: this.portalOuterGroup, portalMidGroup: this.portalMidGroup, portalInnerGroup: this.portalInnerGroup,
      portalVortexMesh: this.portalVortexMesh, portalFlashMesh: this.portalFlashMesh, floatingIslands: this.floatingIslands,
      ownedGeos: this.ownedGeos, ownedMats: this.ownedMats, customDisposers: this.customDisposers,
    };
  }
  private buildExpandedOctagonalArenaDeck(darkBasaltMat: THREE.Material): void { buildExpandedOctagonalArenaDeck(this.arenaBuildCtx(), darkBasaltMat); }
  private buildElevatedShowcaseStage(): void { buildElevatedShowcaseStage(this.arenaBuildCtx()); }
  private buildPerimeterTechPylons(darkBasaltMat: THREE.Material): void { buildPerimeterTechPylons(this.arenaBuildCtx(), darkBasaltMat); }
  private buildSynchroPortal(): void { buildSynchroPortal(this.arenaBuildCtx()); }
  private buildMaterialPedestals(): void {
    const holoGridGeo = new THREE.RingGeometry(0.55, 0.92, 24);
    const trayGeo = new THREE.BoxGeometry(0.36, 0.055, 1.0);
    const conduitGeo = new THREE.PlaneGeometry(0.2, 1.0);
    const pulseGeo = new THREE.BoxGeometry(0.24, 0.075, 0.32);
    this.ownedGeos.push(holoGridGeo, trayGeo, conduitGeo, pulseGeo);
    for (let i = 0; i < MAX_MAT_SLOTS; i++) {
      const podium = this.createCyberShowcasePodium(`0${i + 1}`, MAT_PODIUM_SCALE, false);
      const holoGridMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      this.ownedMats.push(holoGridMat);
      const holoGridRing = new THREE.Mesh(holoGridGeo, holoGridMat);
      holoGridRing.rotation.x = -Math.PI / 2;
      holoGridRing.position.y = 0.302;
      holoGridRing.renderOrder = 3;
      podium.group.add(holoGridRing);
      // Grooved floor energy conduit channel + 2 travelling energy pulse nodes
      const conduitGroup = new THREE.Group();
      const trayMesh = new THREE.Mesh(trayGeo, this.armorSteelMat);
      trayMesh.position.y = 0.04;
      conduitGroup.add(trayMesh);
      const conduitMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      this.ownedMats.push(conduitMat);
      const conduitMesh = new THREE.Mesh(conduitGeo, conduitMat);
      conduitMesh.rotation.x = -Math.PI / 2;
      conduitMesh.position.y = 0.074;
      conduitMesh.renderOrder = 3;
      conduitGroup.add(conduitMesh);
      const conduitPulseMeshes: THREE.Mesh[] = [];
      for (let p = 0; p < 2; p++) {
        const pulseMesh = new THREE.Mesh(pulseGeo, conduitMat);
        pulseMesh.position.y = 0.088;
        pulseMesh.renderOrder = 4;
        conduitGroup.add(pulseMesh);
        conduitPulseMeshes.push(pulseMesh);
      }
      this.group.add(conduitGroup, podium.group);
      this.materialSlots.push({
        podium,
        holoGridRing,
        holoGridMat,
        conduitGroup,
        conduitMat,
        conduitPulseMeshes,
        sprite: null,
        chibiId: null,
        ready: false,
        pos: new THREE.Vector3(),
      });
    }
  }
  private buildRecipeOreClusters(): void {
    // 4 physical Ore Crystal Clusters flanking the expanded arena deck (Left pair = Ore 0, Right pair = Ore 1)
    const specs: ReadonlyArray<{
      x: number;
      z: number;
      scale: number;
      oreSlotIndex: number;
      defaultHex: string;
      phase: number;
    }> = [
      { x: -7.85, z: 2.15, scale: 1.45, oreSlotIndex: 0, defaultHex: '#38bdf8', phase: 0.2 },
      { x: -3.65, z: 5.85, scale: 1.15, oreSlotIndex: 0, defaultHex: '#38bdf8', phase: 1.5 },
      { x: 7.85, z: 2.15, scale: 1.45, oreSlotIndex: 1, defaultHex: '#facc15', phase: 0.8 },
      { x: 3.65, z: 5.85, scale: 1.15, oreSlotIndex: 1, defaultHex: '#facc15', phase: 2.3 },
    ];
    const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
    this.ownedGeos.push(shardGeo);
    for (const sp of specs) {
      const crystalMat = new THREE.MeshStandardMaterial({
        color: sp.defaultHex,
        emissive: sp.defaultHex,
        emissiveIntensity: 0.4,
        roughness: 0.22,
        metalness: 0.35,
        flatShading: true,
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: sp.defaultHex,
        emissiveIntensity: 0.65,
        roughness: 0.18,
        metalness: 0.4,
        flatShading: true,
      });
      this.ownedMats.push(crystalMat, accentMat);
      const clusterGroup = createCyberCrystalCluster({
        frameMat: this.armorSteelMat,
        crystalMat,
        accentMat,
        scale: sp.scale,
        shardCount: 6,
      });
      clusterGroup.position.set(sp.x, 0.04, sp.z);
      this.customDisposers.push(() => disposeCyberProp(clusterGroup));
      const floatingShards: THREE.Mesh[] = [];
      for (let s = 0; s < 2; s++) {
        const shard = new THREE.Mesh(shardGeo, s === 0 ? crystalMat : accentMat);
        shard.position.set(s === 0 ? -0.35 : 0.35, 1.08 + s * 0.26, 0);
        clusterGroup.add(shard);
        floatingShards.push(shard);
      }
      this.group.add(clusterGroup);
      this.oreClusters.push({
        group: clusterGroup,
        crystalMat,
        accentMat,
        floatingShards,
        oreSlotIndex: sp.oreSlotIndex,
        ready: false,
        baseY: 0.04,
        phase: sp.phase,
      });
    }
  }
  private buildFloatingCosmicIslands(darkBasaltMat: THREE.Material): void { buildFloatingCosmicIslands(this.arenaBuildCtx(), darkBasaltMat); }
  private buildFusionNpcs(): void {
    // 2 Alchemist / Cyber-Scientist NPCs with Holographic Control Consoles on the wide lateral observation bays
    const npcConfigs: ReadonlyArray<{
      id: string;
      chibiId: string;
      consoleX: number;
      consoleZ: number;
      homeX: number;
      homeZ: number;
      patrolX: number;
      patrolZ: number;
      accentHex: string;
    }> = [
      {
        id: 'fusion-npc-left',
        chibiId: 'chrono-sovereign',
        consoleX: -8.15,
        consoleZ: -0.95,
        homeX: -7.35,
        homeZ: -0.85,
        patrolX: -6.85,
        patrolZ: -2.45,
        accentHex: '#22d3ee',
      },
      {
        id: 'fusion-npc-right',
        chibiId: 'nebula-hex',
        consoleX: 8.15,
        consoleZ: -0.95,
        homeX: 7.35,
        homeZ: -0.85,
        patrolX: 6.85,
        patrolZ: -2.45,
        accentHex: '#d946ef',
      },
    ];
    const standGeo = new THREE.CylinderGeometry(0.26, 0.38, 0.9, 6);
    const screenFrameGeo = new THREE.BoxGeometry(0.84, 0.52, 0.08);
    const holoCubeGeo = new THREE.OctahedronGeometry(0.2, 0);
    this.ownedGeos.push(standGeo, screenFrameGeo, holoCubeGeo);
    for (let i = 0; i < npcConfigs.length; i++) {
      const cfg = npcConfigs[i];
      const screenMat = new THREE.MeshStandardMaterial({
        color: cfg.accentHex,
        emissive: cfg.accentHex,
        emissiveIntensity: 1.3,
        roughness: 0.2,
        metalness: 0.3,
        flatShading: true,
      });
      this.ownedMats.push(screenMat);
      const consoleGroup = new THREE.Group();
      consoleGroup.position.set(cfg.consoleX, 0.04, cfg.consoleZ);
      consoleGroup.lookAt(0, 0.04, STAGE_CENTER_Z);
      const stand = new THREE.Mesh(standGeo, this.armorSteelMat);
      stand.position.y = 0.45;
      stand.castShadow = true;
      const screen = new THREE.Mesh(screenFrameGeo, this.brightSteelMat);
      screen.position.set(0, 0.96, 0.06);
      screen.rotation.x = -0.55;
      const holoCube = new THREE.Mesh(holoCubeGeo, screenMat);
      holoCube.position.set(0, 1.38, 0.05);
      consoleGroup.add(stand, screen, holoCube);
      this.group.add(consoleGroup);
      const def = getChibiById(cfg.chibiId);
      if (!def) continue;
      const sprite = new ChibiSprite3D(def, 1.56, i * 1.7);
      sprite.group.position.set(cfg.homeX, 0.04, cfg.homeZ);
      sprite.setAccentColor(cfg.accentHex);
      this.group.add(sprite.group);
      this.fusionNpcs.push({
        id: cfg.id,
        sprite,
        holoCube,
        homeX: cfg.homeX,
        homeZ: cfg.homeZ,
        patrolX: cfg.patrolX,
        patrolZ: cfg.patrolZ,
        x: cfg.homeX,
        z: cfg.homeZ,
        targetX: cfg.patrolX,
        targetZ: cfg.patrolZ,
        pauseTimer: 1.2 + i * 1.4,
        bubbleText: i === 0 ? 'Synthesizing cyber-core...' : 'Energy levels stable!',
        bubbleTimer: 3.4,
        nextBubbleCooldown: 4.5 + i * 2.0,
        facingRight: cfg.homeX < 0,
      });
    }
  }
  public isAnimating(): boolean {
    return this.fusionAnimTimer > 0;
  }
  public setRevealHold(active: boolean): void {
    this.revealHold = active;
    if (!active && this.fusionAnimTimer <= 0) {
      for (const slot of this.materialSlots) {
        if (slot.sprite) {
          slot.sprite.group.position.set(0, 0.285, 0);
          slot.sprite.group.scale.setScalar(1);
        }
      }
    }
  }
  public isRevealHolding(): boolean {
    return this.revealHold;
  }
  public getCameraFocusState(): {
    active: boolean;
    camPos: THREE.Vector3;
    lookAt: THREE.Vector3;
  } {
    if (this.fusionAnimTimer > 0) {
      const elapsedAnim = this.fusionAnimDur - this.fusionAnimTimer;
      if (elapsedAnim < 1.72) {
        // Act 1 & 2: Glide closer to frame the levitating Material Chibis converging into the Synchro Gate
        const p = Math.min(1, elapsedAnim / 1.45);
        this.camFocusPos.set(0, 7.2 - p * 1.1, 13.2 - p * 2.4);
        this.camFocusLook.set(0, 1.85 + p * 1.1, -1.6 - p * 2.1);
      } else {
        // Act 3: Heroic low-angle close-up on the Grand APEX Podium & spinning Synchro Gate Halo
        this.camFocusPos.set(0, 3.35, 3.85);
        this.camFocusLook.set(0, 2.55, STAGE_CENTER_Z - 0.35);
      }
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    if (this.revealHold) {
      this.camFocusPos.set(0, 3.35, 3.85);
      this.camFocusLook.set(0, 2.55, STAGE_CENTER_Z - 0.35);
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    return { active: false, camPos: this.camFocusPos, lookAt: this.camFocusLook };
  }
  public cancelAnimation(): void {
    this.fusionAnimTimer = 0;
    this.portalBurstFired = false;
    this.fusionBurstFired = false;
    this.landingEchoFired = false;
    this.revealHold = false;
    this.portalFlashTimer = 0;
    this.portalFlashMesh.visible = false;
    this.portalVortexMesh.scale.setScalar(1);
    this.onFusionAnimComplete = null;
    this.resultMount.visible = true;
    for (const slot of this.materialSlots) {
      if (slot.sprite) {
        slot.sprite.group.position.set(0, 0.285, 0);
        slot.sprite.group.scale.setScalar(1);
      }
    }
    for (const orb of this.energyOrbs) {
      this.group.remove(orb.mesh);
      orb.mat.dispose();
    }
    this.energyOrbs.length = 0;
  }
  private applyPodiumTheme(
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
  public syncRecipe(
    recipe: FusionRecipeDef,
    ingredientReadyFlags: readonly boolean[],
    oreReadyFlags?: readonly boolean[],
    canFuse?: boolean
  ): void {
    const recipeChanged = this.activeRecipeId !== recipe.id;
    this.activeRecipeId = recipe.id;
    this.fusionAccentHex = recipe.accentColor;
    this.fusionGlowHex = recipe.glowColor;
    const minersAllReady =
      recipe.requiredMiners.length > 0 &&
      recipe.requiredMiners.every((_, idx) => Boolean(ingredientReadyFlags[idx]));
    const oresAllReady = oreReadyFlags
      ? recipe.requiredOres.every((_, idx) => Boolean(oreReadyFlags[idx]))
      : minersAllReady;
    this.allRequirementsReady = canFuse ?? (minersAllReady && oresAllReady);
    this.missingOreName = null;
    for (let i = 0; i < recipe.requiredOres.length; i++) {
      const oreReady = oreReadyFlags ? Boolean(oreReadyFlags[i]) : this.allRequirementsReady;
      if (!oreReady) {
        this.missingOreName =
          getOreById(recipe.requiredOres[i].oreId)?.name ?? recipe.requiredOres[i].oreId;
        break;
      }
    }
    // Update Grand Apex Podium Aura, Stage Trims & Rear Synchro Portal
    this.applyPodiumTheme(
      this.apexPodium,
      recipe.accentColor,
      recipe.glowColor,
      true,
      this.allRequirementsReady ? 1.45 : 0.95
    );
    if (this.allRequirementsReady) {
      this.stageNeonMat.color.set(recipe.accentColor);
      this.stageNeonMat.emissive.set(recipe.accentColor);
      this.stageNeonMat.emissiveIntensity = 1.45;
      this.magicCircleMat.color.set(recipe.accentColor);
      this.magicCircleMat.opacity = 0.68;
      this.innerRingMat.color.set('#facc15');
      this.innerRingMat.opacity = 0.85;
      this.outerRingMat.color.set(recipe.accentColor);
      this.outerRingMat.opacity = 0.72;
      this.portalOuterMat.color.set(recipe.accentColor);
      this.portalOuterMat.emissive.set(recipe.accentColor);
      this.portalOuterMat.emissiveIntensity = 1.45;
      this.portalMidMat.color.set('#facc15');
      this.portalMidMat.emissive.set('#facc15');
      this.portalMidMat.emissiveIntensity = 1.35;
      this.portalInnerMat.color.set(recipe.glowColor);
      this.portalInnerMat.emissive.set(recipe.glowColor);
      this.portalInnerMat.emissiveIntensity = 1.4;
      this.portalVortexMat.color.set(recipe.accentColor);
      this.portalVortexMat.opacity = 0.34;
      this.lightBeamOuterMat.color.set(recipe.accentColor);
      this.lightBeamInnerMat.color.set('#fef08a');
    } else {
      this.stageNeonMat.color.set('#be123c');
      this.stageNeonMat.emissive.set('#dc2626');
      this.stageNeonMat.emissiveIntensity = 0.65;
      this.magicCircleMat.color.set('#be123c');
      this.magicCircleMat.opacity = 0.26;
      this.innerRingMat.color.set('#e11d48');
      this.innerRingMat.opacity = 0.38;
      this.outerRingMat.color.set('#64748b');
      this.outerRingMat.opacity = 0.32;
      this.portalOuterMat.color.set('#7f1d1d');
      this.portalOuterMat.emissive.set('#be123c');
      this.portalOuterMat.emissiveIntensity = 0.48;
      this.portalMidMat.color.set('#475569');
      this.portalMidMat.emissive.set('#64748b');
      this.portalMidMat.emissiveIntensity = 0.35;
      this.portalInnerMat.color.set('#991b1b');
      this.portalInnerMat.emissive.set('#ef4444');
      this.portalInnerMat.emissiveIntensity = 0.52;
      this.portalVortexMat.color.set('#be123c');
      this.portalVortexMat.opacity = 0.14;
      this.lightBeamOuterMat.color.set(recipe.accentColor);
      this.lightBeamInnerMat.color.set('#bae6fd');
    }
    // Sync Physical Recipe Ore Crystal Clusters around the Arena
    for (const node of this.oreClusters) {
      const oreIng = recipe.requiredOres[node.oreSlotIndex] ?? recipe.requiredOres[0];
      const oreDef = oreIng ? getOreById(oreIng.oreId) : undefined;
      const oreHex = oreDef?.color ?? (node.oreSlotIndex === 0 ? '#38bdf8' : '#facc15');
      const isOreReady = oreReadyFlags
        ? Boolean(oreReadyFlags[node.oreSlotIndex])
        : this.allRequirementsReady;
      node.ready = isOreReady;
      node.crystalMat.color.set(oreHex);
      node.crystalMat.emissive.set(oreHex);
      node.crystalMat.emissiveIntensity = isOreReady ? 1.55 : 0.26;
      node.accentMat.emissive.set(oreHex);
      node.accentMat.emissiveIntensity = isOreReady ? 1.85 : 0.32;
    }
    // Position 2 or 3 ZZZ/HSR Cyber-Showcase Material Podiums in a Spacious Front Crescent Arc
    const count = recipe.requiredMiners.length;
    const coords: Array<[number, number]> =
      count === 2
        ? [
            [-4.55, 2.05],
            [4.55, 2.05],
          ]
        : [
            [-5.35, 1.05],
            [5.35, 1.05],
            [0, 3.45],
          ];
    for (let i = 0; i < MAX_MAT_SLOTS; i++) {
      const slot = this.materialSlots[i];
      if (i >= count) {
        slot.podium.group.visible = false;
        slot.conduitGroup.visible = false;
        continue;
      }
      const ing = recipe.requiredMiners[i];
      const ready = Boolean(ingredientReadyFlags[i]);
      slot.ready = ready;
      const [px, pz] = coords[i];
      slot.pos.set(px, slot.podium.topY, pz);
      slot.podium.group.position.set(px, 0, pz);
      slot.podium.group.visible = true;
      // Orient floor energy conduit channel from material podium into the Elevated Rear Stage (0, STAGE_CENTER_Z)
      const dx = px;
      const dz = pz - STAGE_CENTER_Z;
      const dist = Math.hypot(dx, dz);
      const conduitLen = Math.max(0.8, dist - 2.95);
      slot.conduitGroup.visible = true;
      slot.conduitGroup.position.set(px * 0.52, 0, STAGE_CENTER_Z + dz * 0.52);
      slot.conduitGroup.scale.set(1, 1, conduitLen);
      slot.conduitGroup.rotation.set(0, Math.atan2(dx, dz), 0);
      const def = getChibiById(ing.chibiId);
      const unitAccent = def?.accentColor ?? recipe.accentColor;
      const ringColor = ready
        ? this.allRequirementsReady
          ? '#facc15'
          : unitAccent
        : '#be123c';
      this.applyPodiumTheme(
        slot.podium,
        ringColor,
        recipe.glowColor,
        ready,
        ready ? 1.25 : 0.45
      );
      slot.holoGridRing.visible = !ready;
      slot.holoGridMat.color.set('#38bdf8');
      slot.conduitMat.color.set(
        this.allRequirementsReady ? '#facc15' : ready ? recipe.accentColor : '#991b1b'
      );
      slot.conduitMat.opacity = this.allRequirementsReady ? 0.92 : ready ? 0.72 : 0.34;
      if (slot.chibiId !== ing.chibiId || recipeChanged) {
        if (slot.sprite) {
          slot.podium.group.remove(slot.sprite.group);
          slot.sprite.dispose();
          slot.sprite = null;
        }
        slot.chibiId = ing.chibiId;
        if (def) {
          const sp = new ChibiSprite3D(def, 2.05 / MAT_PODIUM_SCALE);
          sp.group.position.set(0, 0.285, 0);
          sp.setAccentColor(def.accentColor);
          slot.podium.group.add(sp.group);
          slot.sprite = sp;
        }
      }
      if (slot.sprite) {
        slot.sprite.setHologramMode(!ready, '#38bdf8');
      }
    }
    // Update Result Fusion Chibi on the Grand Apex Podium
    if (this.resultChibiId !== recipe.resultChibiId) {
      if (this.resultSprite) {
        this.resultMount.remove(this.resultSprite.group);
        this.resultSprite.dispose();
        this.resultSprite = null;
      }
      this.resultChibiId = recipe.resultChibiId;
      const resDef = getChibiById(recipe.resultChibiId);
      if (resDef) {
        const sp = new ChibiSprite3D(resDef, 2.95);
        sp.setAccentColor(recipe.accentColor);
        this.resultMount.add(sp.group);
        this.resultSprite = sp;
      }
    }
  }
  public triggerFusionAnimation(recipe: FusionRecipeDef, onComplete: () => void): void {
    this.cancelAnimation();
    this.fusionAccentHex = recipe.accentColor;
    this.fusionGlowHex = recipe.glowColor;
    this.fusionAnimTimer = this.fusionAnimDur;
    this.portalBurstFired = false;
    this.fusionBurstFired = false;
    this.landingEchoFired = false;
    this.onFusionAnimComplete = onComplete;
    this.resultMount.visible = false;
    const count = recipe.requiredMiners.length;
    for (let s = 0; s < count; s++) {
      const slot = this.materialSlots[s];
      for (let k = 0; k < 8; k++) {
        const mat = new THREE.MeshBasicMaterial({
          color: k % 2 === 0 ? recipe.accentColor : '#fef08a',
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(this.orbGeo, mat);
        const startPos = slot.pos
          .clone()
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.55,
              1.65 + Math.random() * 0.45,
              (Math.random() - 0.5) * 0.55
            )
          );
        mesh.position.copy(startPos);
        mesh.visible = false;
        this.group.add(mesh);
        this.energyOrbs.push({
          mesh,
          mat,
          from: startPos,
          to: PORTAL_CENTER.clone(),
          age: -(0.78 + k * 0.08),
          dur: 0.68,
          arcH: 1.35 + Math.random() * 0.95,
        });
      }
    }
  }
  private pickNpcBubbleLine(): string {
    if (this.allRequirementsReady) {
      return (
        FUSION_NPC_READY_LINES[Math.floor(Math.random() * FUSION_NPC_READY_LINES.length)] ??
        'All materials ready! Hit FUSE!'
      );
    }
    if (this.missingOreName && Math.random() < 0.42) {
      return `Need more ${this.missingOreName}!`;
    }
    return (
      FUSION_NPC_DEFAULT_LINES[Math.floor(Math.random() * FUSION_NPC_DEFAULT_LINES.length)] ??
      'Synthesizing cyber-core...'
    );
  }
  private updateFusionNpcs(dt: number, elapsed: number, camera?: THREE.Camera): void {
    const walkSpeed = 1.55;
    for (let i = 0; i < this.fusionNpcs.length; i++) {
      const npc = this.fusionNpcs[i];
      npc.holoCube.rotation.y = elapsed * 1.8 + i;
      npc.holoCube.rotation.x = elapsed * 1.1;
      npc.holoCube.position.y = 1.38 + Math.sin(elapsed * 3.0 + i) * 0.06;
      if (npc.bubbleTimer > 0) {
        npc.bubbleTimer = Math.max(0, npc.bubbleTimer - dt);
        if (npc.bubbleTimer <= 0) {
          npc.bubbleText = null;
        }
      }
      if (npc.nextBubbleCooldown > 0) {
        npc.nextBubbleCooldown -= dt;
      }
      if (npc.pauseTimer > 0) {
        npc.pauseTimer -= dt;
        npc.sprite.setAnimState('idle');
        if (npc.nextBubbleCooldown <= 0) {
          npc.bubbleText = this.pickNpcBubbleLine();
          npc.bubbleTimer = 3.2;
          npc.nextBubbleCooldown = 5.2 + Math.random() * 3.5;
        }
        if (npc.pauseTimer <= 0) {
          const atHome = Math.hypot(npc.x - npc.homeX, npc.z - npc.homeZ) < 0.35;
          npc.targetX = atHome ? npc.patrolX : npc.homeX;
          npc.targetZ = atHome ? npc.patrolZ : npc.homeZ;
          npc.sprite.setAnimState('dash');
        }
      } else {
        const dx = npc.targetX - npc.x;
        const dz = npc.targetZ - npc.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.12) {
          npc.pauseTimer = 2.4 + Math.random() * 2.2;
          npc.sprite.setAnimState('idle');
          npc.facingRight = npc.x < 0;
        } else {
          const step = Math.min(dist, walkSpeed * dt);
          npc.x += (dx / dist) * step;
          npc.z += (dz / dist) * step;
          npc.facingRight = dx >= 0;
          npc.sprite.setAnimState('dash');
        }
      }
      npc.sprite.group.position.set(npc.x, 0.04, npc.z);
      npc.sprite.setFacing(npc.facingRight ? 1 : -1);
      if (camera) {
        npc.sprite.update(dt, elapsed, camera);
      }
    }
  }
  public getNpcBubbleAnchors(
    camera: THREE.Camera,
    width: number,
    height: number
  ): ShopChibiBubbleAnchor[] {
    if (!this.group.visible) return [];
    const out: ShopChibiBubbleAnchor[] = [];
    for (const npc of this.fusionNpcs) {
      if (!npc.bubbleText || npc.bubbleTimer <= 0) continue;
      this.npcProjVec.set(npc.x, 2.15, npc.z).project(camera);
      if (this.npcProjVec.z <= -1 || this.npcProjVec.z >= 1) continue;
      out.push({
        id: npc.id,
        x: (this.npcProjVec.x * 0.5 + 0.5) * width,
        y: (-this.npcProjVec.y * 0.5 + 0.5) * height,
        text: npc.bubbleText,
      });
    }
    return out;
  }
  private stepPodiumAura(podium: CyberShowcasePodiumHandle, elapsed: number): void {
    if (!podium.auraGroup.visible) return;
    podium.sigilMesh.rotation.z = elapsed * 0.16;
    podium.auraVeilMat.uniforms.uTime.value = elapsed;
    podium.auraOuterVeilMat.uniforms.uTime.value = elapsed * 0.85;
    podium.particleMat.uniforms.uTime.value = elapsed;
  }
  public update(dtSec: number, elapsed: number, camera?: THREE.Camera): void {
    if (!this.group.visible) return;
    const dt = Math.min(0.1, Math.max(0, dtSec));
    const isFusing = this.fusionAnimTimer > 0;
    const readyPulse = this.allRequirementsReady ? 0.5 + 0.5 * Math.sin(elapsed * 4.6) : 0;
    const spinBoost = isFusing ? 7.2 : this.allRequirementsReady ? 1.85 : 0.75;
    // 1. Rotate Cosmic Starfield, Floor Magic Circle, Podium Auras & Triple Synchro Portal Rings
    this.starField.rotation.y = elapsed * 0.025;
    this.magicCircleMesh.rotation.z = elapsed * 0.14 * (this.allRequirementsReady ? 1.6 : 0.6);
    this.innerRingMesh.rotation.z += dt * 0.78 * spinBoost;
    this.outerRingMesh.rotation.z -= dt * 0.46 * spinBoost;
    this.stepPodiumAura(this.apexPodium, elapsed);
    this.portalOuterGroup.rotation.z += dt * 0.42 * spinBoost;
    this.portalMidGroup.rotation.z -= dt * 0.68 * spinBoost;
    this.portalInnerGroup.rotation.z += dt * 1.15 * spinBoost;
    this.portalVortexMesh.rotation.z = -elapsed * 0.9 * spinBoost;
    // 2. Dynamic Readiness Pulse on Portal, Floor Circuit & Central Skyward Light Beam
    if (this.allRequirementsReady && !isFusing) {
      const pulseIntensity = 1.2 + readyPulse * 0.65;
      this.portalOuterMat.emissiveIntensity = pulseIntensity;
      this.portalMidMat.emissiveIntensity = pulseIntensity * 0.95;
      this.portalInnerMat.emissiveIntensity = pulseIntensity * 1.05;
      this.apexPodium.ringMat.emissiveIntensity = pulseIntensity;
      this.stageNeonMat.emissiveIntensity = pulseIntensity;
      this.magicCircleMat.opacity = 0.52 + readyPulse * 0.26;
      this.lightBeamOuterMat.opacity = 0.16 + readyPulse * 0.1;
      this.lightBeamInnerMat.opacity = 0.22 + readyPulse * 0.14;
    } else if (!isFusing) {
      this.lightBeamOuterMat.opacity = 0.07 + Math.sin(elapsed * 2.2) * 0.02;
      this.lightBeamInnerMat.opacity = 0.09 + Math.sin(elapsed * 2.2) * 0.025;
    } else {
      this.lightBeamOuterMat.opacity = 0.34;
      this.lightBeamInnerMat.opacity = 0.48;
    }
    if (this.portalFlashTimer > 0) {
      this.portalFlashTimer = Math.max(0, this.portalFlashTimer - dt);
      const fp = this.portalFlashTimer / 0.55;
      this.portalFlashMesh.visible = fp > 0;
      this.portalFlashMesh.scale.setScalar(1.0 + (1 - fp) * 2.1);
      this.portalFlashMat.opacity = fp * 0.96;
    }
    // 3. Animate Travelling Floor Conduit Pulses & ZZZ/HSR Material Podiums
    const elapsedAnim = isFusing ? this.fusionAnimDur - this.fusionAnimTimer : 0;
    if (isFusing && elapsedAnim >= 1.35 && elapsedAnim < 1.72) {
      // Anime Singularity Implosion hold right before portal supernova
      const imp = (elapsedAnim - 1.35) / 0.37;
      this.portalVortexMesh.scale.setScalar(1 - Math.sin(imp * Math.PI * 0.5) * 0.46);
    } else {
      this.portalVortexMesh.scale.setScalar(1);
    }
    for (let i = 0; i < this.materialSlots.length; i++) {
      const slot = this.materialSlots[i];
      if (!slot.podium.group.visible) continue;
      this.stepPodiumAura(slot.podium, elapsed + i * 0.65);
      slot.holoGridRing.rotation.z = elapsed * 1.4;
      const flowSpeed = isFusing ? 4.2 : this.allRequirementsReady ? 1.7 : slot.ready ? 1.0 : 0.35;
      for (let p = 0; p < slot.conduitPulseMeshes.length; p++) {
        const pulseMesh = slot.conduitPulseMeshes[p];
        const phase = ((elapsed * flowSpeed + p * 0.5 + i * 0.25) % 1 + 1) % 1;
        pulseMesh.position.z = 0.45 - phase * 0.9;
        pulseMesh.visible = slot.ready || this.allRequirementsReady || isFusing;
      }
      if (slot.sprite) {
        if (isFusing) {
          if (elapsedAnim < 0.85) {
            // Act 1: Dramatic levitation & overdrive charge
            const lp = elapsedAnim / 0.85;
            const ease = lp * (2 - lp);
            slot.sprite.group.position.set(0, 0.285 + ease * 1.65, 0);
            slot.sprite.group.scale.setScalar(1 + ease * 0.16);
          } else if (elapsedAnim < 1.45) {
            // Act 2: Morph into light streams & suction into the Synchro Gate
            const sp = (elapsedAnim - 0.85) / 0.6;
            slot.sprite.group.position.set(0, 1.93 + sp * 0.75, -sp * 1.45);
            slot.sprite.group.scale.setScalar(Math.max(0.01, 1.16 * (1 - sp)));
          } else {
            slot.sprite.group.scale.setScalar(0.001);
          }
        } else if (this.revealHold) {
          slot.sprite.group.scale.setScalar(0.001);
        } else {
          slot.sprite.group.position.set(0, 0.285, 0);
          slot.sprite.group.scale.setScalar(1);
        }
        if (camera) {
          slot.sprite.update(dt, elapsed, camera);
        }
      }
    }
    // 4. Animate Physical Ore Crystal Clusters & Floating Cosmic Islands
    for (const node of this.oreClusters) {
      const orePulse = node.ready ? 1.35 + Math.sin(elapsed * 4.2 + node.phase) * 0.4 : 0.26;
      node.crystalMat.emissiveIntensity = orePulse;
      node.accentMat.emissiveIntensity = node.ready ? orePulse * 1.2 : 0.32;
      const orbitSpeed = node.ready ? 2.6 : 0.8;
      for (let s = 0; s < node.floatingShards.length; s++) {
        const shard = node.floatingShards[s];
        const a = elapsed * orbitSpeed + node.phase + s * Math.PI;
        shard.position.set(
          Math.cos(a) * 0.38,
          1.02 + s * 0.22 + Math.sin(elapsed * 3.0 + s) * 0.08,
          Math.sin(a) * 0.38
        );
        shard.rotation.y = a;
        shard.rotation.x = elapsed * 1.5;
      }
    }
    for (const isl of this.floatingIslands) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * isl.bobSpeed + isl.phase) * 0.28;
      isl.group.rotation.y = Math.sin(elapsed * 0.25 + isl.phase) * 0.12;
    }
    // 5. Update Alchemist / Scientist NPCs
    this.updateFusionNpcs(dt, elapsed, camera);
    // 6. Levitate or Descend Result Fusion Chibi on Grand Apex Podium
    const popScale =
      this.revealPopTimer > 0 ? 1 + Math.sin((this.revealPopTimer / 0.58) * Math.PI) * 0.28 : 1;
    if (this.revealPopTimer > 0) this.revealPopTimer = Math.max(0, this.revealPopTimer - dt);
    if (isFusing && elapsedAnim >= 1.98) {
      const descendP = Math.min(1, (elapsedAnim - 1.98) / 0.42);
      const easeOut = 1 - Math.pow(1 - descendP, 3);
      this.resultMount.position.y = THREE.MathUtils.lerp(4.25, DAIS_TOP_Y + 0.04, easeOut);
    } else {
      this.resultMount.position.y = DAIS_TOP_Y + 0.04 + Math.sin(elapsed * 2.4) * 0.08;
    }
    this.resultMount.scale.setScalar(popScale);
    if (camera && this.resultSprite) {
      this.resultSprite.update(dt, elapsed, camera);
    }
    // 7. Step Converging Energy Orbs (Material Podiums -> Synchro Portal -> Grand Apex Podium)
    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      orb.age += dt;
      if (orb.age < 0) {
        orb.mesh.visible = false;
        continue;
      }
      orb.mesh.visible = true;
      const p = orb.age / orb.dur;
      if (p >= 1) {
        this.group.remove(orb.mesh);
        orb.mat.dispose();
        this.energyOrbs.splice(i, 1);
        continue;
      }
      const ease = p * p;
      orb.mesh.position.set(
        THREE.MathUtils.lerp(orb.from.x, orb.to.x, ease),
        THREE.MathUtils.lerp(orb.from.y, orb.to.y, ease) + Math.sin(p * Math.PI) * orb.arcH,
        THREE.MathUtils.lerp(orb.from.z, orb.to.z, ease)
      );
      orb.mesh.scale.setScalar(1.35 - p * 0.55);
      orb.mat.opacity = 1 - p * 0.28;
    }
    // 8. Step 4-Act Fusion Climax Sequence
    if (this.fusionAnimTimer > 0) {
      this.fusionAnimTimer = Math.max(0, this.fusionAnimTimer - dt);
      const curAnim = this.fusionAnimDur - this.fusionAnimTimer;
      // Act 2 Climax (1.72s): Portal Supernova Eruption + discharge stream from Portal to Grand Apex Podium
      if (!this.portalBurstFired && curAnim >= 1.72) {
        this.portalBurstFired = true;
        this.portalFlashTimer = 0.55;
        this.portalFlashMesh.visible = true;
        this.impactFx.spawnShatter({
          targetX: PORTAL_CENTER.x,
          targetY: PORTAL_CENTER.y,
          targetZ: PORTAL_CENTER.z + 0.35,
          oreColor: '#fef08a',
          secondaryColor: this.fusionAccentHex,
          isMeteor: true,
          camera,
        });
        for (let k = 0; k < 8; k++) {
          const mat = new THREE.MeshBasicMaterial({
            color: k % 2 === 0 ? '#ffffff' : this.fusionAccentHex,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(this.orbGeo, mat);
          mesh.position.copy(PORTAL_CENTER);
          this.group.add(mesh);
          this.energyOrbs.push({
            mesh,
            mat,
            from: PORTAL_CENTER.clone(),
            to: new THREE.Vector3(0, DAIS_TOP_Y + 1.05, STAGE_CENTER_Z),
            age: -k * 0.035,
            dur: 0.32,
            arcH: 0.75,
          });
        }
      }
      // Act 3 Climax (2.02s): Result unit descends into the skyward beam + initial Shatter Nova
      if (!this.fusionBurstFired && curAnim >= 2.02) {
        this.fusionBurstFired = true;
        this.resultMount.visible = true;
        this.revealPopTimer = 0.58;
        this.impactFx.spawnShatter({
          targetX: 0,
          targetY: DAIS_TOP_Y + 1.15,
          targetZ: STAGE_CENTER_Z,
          oreColor: this.fusionAccentHex,
          secondaryColor: this.fusionGlowHex,
          isMeteor: true,
          camera,
        });
      }
      // Act 3 Hero Landing Impact (2.38s): Second 5-layer Shatter Nova as feet touch down on APEX podium
      if (!this.landingEchoFired && curAnim >= 2.38) {
        this.landingEchoFired = true;
        this.impactFx.spawnShatter({
          targetX: 0,
          targetY: DAIS_TOP_Y + 0.65,
          targetZ: STAGE_CENTER_Z,
          oreColor: '#fef08a',
          secondaryColor: this.fusionAccentHex,
          isMeteor: true,
          camera,
        });
      }
      if (this.fusionAnimTimer <= 0) {
        this.resultMount.visible = true;
        this.revealHold = true;
        const cb = this.onFusionAnimComplete;
        this.onFusionAnimComplete = null;
        cb?.();
      }
    }
    this.impactFx.update(dt, camera);
  }
  public dispose(): void {
    this.cancelAnimation();
    this.impactFx.dispose();
    if (this.resultSprite) {
      this.resultMount.remove(this.resultSprite.group);
      this.resultSprite.dispose();
      this.resultSprite = null;
    }
    for (const slot of this.materialSlots) {
      if (slot.sprite) {
        slot.podium.group.remove(slot.sprite.group);
        slot.sprite.dispose();
        slot.sprite = null;
      }
    }
    for (const npc of this.fusionNpcs) {
      this.group.remove(npc.sprite.group);
      npc.sprite.dispose();
    }
    this.fusionNpcs.length = 0;
    for (const disposeFn of this.customDisposers) {
      disposeFn();
    }
    this.customDisposers.length = 0;
    this.orbGeo.dispose();
    for (const t of this.ownedTextures) t.dispose();
    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.ownedMats) m.dispose();
    this.ownedTextures.length = 0;
    this.ownedGeos.length = 0;
    this.ownedMats.length = 0;
  }
}
