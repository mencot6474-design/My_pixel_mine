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
import { stepFusionWorldUpdate, type FusionSeqState } from './FusionSequence3D';
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
const PORTAL_CENTER = new THREE.Vector3(0, 5.45, -7.15);
const STAGE_CENTER_Z = -2.85;
const STAGE_DECK_Y = 0.76;
const APEX_PODIUM_SCALE = 1.68;
const MAT_PODIUM_SCALE = 1.48;
const DAIS_TOP_Y = STAGE_DECK_Y + 0.285 * APEX_PODIUM_SCALE;
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
  private readonly floatingIslands: FloatingIslandNode[] = [];
  private readonly oreClusters: OreCrystalNode[] = [];
  private readonly materialSlots: MaterialPedestalSlot[] = [];
  private readonly resultMount = new THREE.Group();
  private resultSprite: ChibiSprite3D | null = null;
  private resultChibiId: string | null = null;
  private activeRecipeId: string | null = null;
  private readonly orbGeo = new THREE.SphereGeometry(0.18, 10, 10);
  private readonly energyOrbs: EnergyOrb[] = [];
  private readonly seq: FusionSeqState = {
    allRequirementsReady: false,
    fusionAnimTimer: 0,
    fusionAnimDur: 3.45,
    portalFlashTimer: 0,
    revealPopTimer: 0,
    revealHold: false,
    portalBurstFired: false,
    fusionBurstFired: false,
    landingEchoFired: false,
    fusionAccentHex: '#22d3ee',
    fusionGlowHex: '#d946ef',
    onFusionAnimComplete: null,
  };
  private readonly camFocusPos = new THREE.Vector3();
  private readonly camFocusLook = new THREE.Vector3();
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
    // 1. Expanded 23m-Wide Multi-Layered Octagonal Arena Deck + Dual Neon Trims + 17.2m Circuit Grid
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
    const innerRingGeo = new THREE.RingGeometry(3.45, 3.65, 56);
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
    this.innerRingMesh.position.set(0, 0.048, 0.35);
    this.innerRingMesh.renderOrder = 2;
    this.group.add(this.innerRingMesh);
    const outerRingGeo = new THREE.RingGeometry(7.25, 7.48, 64);
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
    // 4 physical Ore Crystal Clusters flanking the stage & material podiums (Left pair = Ore 0, Right pair = Ore 1)
    const specs: ReadonlyArray<{
      x: number;
      z: number;
      scale: number;
      oreSlotIndex: number;
      defaultHex: string;
      phase: number;
    }> = [
      { x: -6.85, z: -2.85, scale: 1.45, oreSlotIndex: 0, defaultHex: '#38bdf8', phase: 0.2 },
      { x: -7.55, z: 1.85, scale: 1.3, oreSlotIndex: 0, defaultHex: '#38bdf8', phase: 1.5 },
      { x: 6.85, z: -2.85, scale: 1.45, oreSlotIndex: 1, defaultHex: '#facc15', phase: 0.8 },
      { x: 7.55, z: 1.85, scale: 1.3, oreSlotIndex: 1, defaultHex: '#facc15', phase: 2.3 },
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
  public isAnimating(): boolean {
    return this.seq.fusionAnimTimer > 0;
  }
  public setRevealHold(active: boolean): void {
    this.seq.revealHold = active;
    if (!active && this.seq.fusionAnimTimer <= 0) {
      for (const slot of this.materialSlots) {
        if (slot.sprite) {
          slot.sprite.group.position.set(0, 0.285, 0);
          slot.sprite.group.scale.setScalar(1);
        }
      }
    }
  }
  public isRevealHolding(): boolean {
    return this.seq.revealHold;
  }
  public getCameraFocusState(): {
    active: boolean;
    camPos: THREE.Vector3;
    lookAt: THREE.Vector3;
  } {
    if (this.seq.fusionAnimTimer > 0) {
      const elapsedAnim = this.seq.fusionAnimDur - this.seq.fusionAnimTimer;
      if (elapsedAnim < 1.72) {
        // Act 1 & 2: Glide closer to frame the levitating Material Chibis converging into the Synchro Gate
        const p = Math.min(1, elapsedAnim / 1.45);
        this.camFocusPos.set(0, 7.8 - p * 1.1, 14.2 - p * 2.4);
        this.camFocusLook.set(0, 2.1 + p * 1.1, -1.8 - p * 2.1);
      } else {
        // Act 3: Heroic low-angle close-up on the Grand APEX Podium & spinning Synchro Gate Halo
        this.camFocusPos.set(0, 3.75, 4.35);
        this.camFocusLook.set(0, 3.05, STAGE_CENTER_Z - 0.3);
      }
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    if (this.seq.revealHold) {
      this.camFocusPos.set(0, 3.75, 4.35);
      this.camFocusLook.set(0, 3.05, STAGE_CENTER_Z - 0.3);
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    return { active: false, camPos: this.camFocusPos, lookAt: this.camFocusLook };
  }
  public cancelAnimation(): void {
    this.seq.fusionAnimTimer = 0;
    this.seq.portalBurstFired = false;
    this.seq.fusionBurstFired = false;
    this.seq.landingEchoFired = false;
    this.seq.revealHold = false;
    this.seq.portalFlashTimer = 0;
    this.portalFlashMesh.visible = false;
    this.portalVortexMesh.scale.setScalar(1);
    this.seq.onFusionAnimComplete = null;
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
    this.seq.fusionAccentHex = recipe.accentColor;
    this.seq.fusionGlowHex = recipe.glowColor;
    const minersAllReady =
      recipe.requiredMiners.length > 0 &&
      recipe.requiredMiners.every((_, idx) => Boolean(ingredientReadyFlags[idx]));
    const oresAllReady = oreReadyFlags
      ? recipe.requiredOres.every((_, idx) => Boolean(oreReadyFlags[idx]))
      : minersAllReady;
    this.seq.allRequirementsReady = canFuse ?? (minersAllReady && oresAllReady);
    // Update Grand Apex Podium Aura, Stage Trims & Rear Synchro Portal
    this.applyPodiumTheme(
      this.apexPodium,
      recipe.accentColor,
      recipe.glowColor,
      true,
      this.seq.allRequirementsReady ? 1.45 : 0.95
    );
    if (this.seq.allRequirementsReady) {
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
        : this.seq.allRequirementsReady;
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
            [-4.65, 0.95],
            [4.65, 0.95],
          ]
        : [
            [-4.95, 0.55],
            [4.95, 0.55],
            [0, 2.35],
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
      // Orient floor energy conduit cleanly from podium rim into the stage/stair threshold without clipping treads
      const isCenterFront = count === 3 && i === 2;
      const targetX = isCenterFront ? 0 : px * 0.38;
      const targetZ = isCenterFront ? STAGE_CENTER_Z + 3.05 : STAGE_CENTER_Z + 1.65;
      const dx = px - targetX;
      const dz = pz - targetZ;
      const dist = Math.hypot(dx, dz);
      const startPad = 1.28;
      const endPad = 0.08;
      const conduitLen = Math.max(0.55, dist - startPad - endPad);
      const nx = dist > 0.001 ? dx / dist : 0;
      const nz = dist > 0.001 ? dz / dist : 1;
      const midDist = endPad + conduitLen * 0.5;
      slot.conduitGroup.visible = true;
      slot.conduitGroup.position.set(targetX + nx * midDist, 0, targetZ + nz * midDist);
      slot.conduitGroup.scale.set(1, 1, conduitLen);
      slot.conduitGroup.rotation.set(0, Math.atan2(dx, dz), 0);
      const def = getChibiById(ing.chibiId);
      const unitAccent = def?.accentColor ?? recipe.accentColor;
      const ringColor = ready
        ? this.seq.allRequirementsReady
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
        this.seq.allRequirementsReady ? '#facc15' : ready ? recipe.accentColor : '#991b1b'
      );
      slot.conduitMat.opacity = this.seq.allRequirementsReady ? 0.92 : ready ? 0.72 : 0.34;
      if (slot.chibiId !== ing.chibiId || recipeChanged) {
        if (slot.sprite) {
          slot.podium.group.remove(slot.sprite.group);
          slot.sprite.dispose();
          slot.sprite = null;
        }
        slot.chibiId = ing.chibiId;
        if (def) {
          const sp = new ChibiSprite3D(def, 2.95 / MAT_PODIUM_SCALE);
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
        const sp = new ChibiSprite3D(resDef, 3.85);
        sp.setAccentColor(recipe.accentColor);
        this.resultMount.add(sp.group);
        this.resultSprite = sp;
      }
    }
  }
  public triggerFusionAnimation(recipe: FusionRecipeDef, onComplete: () => void): void {
    this.cancelAnimation();
    this.seq.fusionAccentHex = recipe.accentColor;
    this.seq.fusionGlowHex = recipe.glowColor;
    this.seq.fusionAnimTimer = this.seq.fusionAnimDur;
    this.seq.portalBurstFired = false;
    this.seq.fusionBurstFired = false;
    this.seq.landingEchoFired = false;
    this.seq.onFusionAnimComplete = onComplete;
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
  public getNpcBubbleAnchors(
    _camera: THREE.Camera,
    _width: number,
    _height: number
  ): ShopChibiBubbleAnchor[] {
    return [];
  }
  public update(dtSec: number, elapsed: number, camera?: THREE.Camera): void {
    stepFusionWorldUpdate(
      {
        seq: this.seq,
        group: this.group,
        impactFx: this.impactFx,
        orbGeo: this.orbGeo,
        energyOrbs: this.energyOrbs,
        materialSlots: this.materialSlots,
        oreClusters: this.oreClusters,
        floatingIslands: this.floatingIslands,
        apexPodium: this.apexPodium,
        magicCircleMesh: this.magicCircleMesh,
        magicCircleMat: this.magicCircleMat,
        innerRingMesh: this.innerRingMesh,
        outerRingMesh: this.outerRingMesh,
        portalOuterGroup: this.portalOuterGroup,
        portalMidGroup: this.portalMidGroup,
        portalInnerGroup: this.portalInnerGroup,
        portalOuterMat: this.portalOuterMat,
        portalMidMat: this.portalMidMat,
        portalInnerMat: this.portalInnerMat,
        portalVortexMesh: this.portalVortexMesh,
        portalFlashMesh: this.portalFlashMesh,
        portalFlashMat: this.portalFlashMat,
        stageNeonMat: this.stageNeonMat,
        lightBeamOuterMat: this.lightBeamOuterMat,
        lightBeamInnerMat: this.lightBeamInnerMat,
        resultMount: this.resultMount,
        resultSprite: this.resultSprite,
      },
      dtSec,
      elapsed,
      camera
    );
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
