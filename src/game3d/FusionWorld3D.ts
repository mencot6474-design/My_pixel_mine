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
  buildPerimeterTechPylons,
  type FloatingIslandNode,
  type FusionArenaBuildCtx,
} from './FusionWorldArena3D';
import {
  buildLabBunkerFloorDeck,
  buildLabBunkerWallsAndCryoBays,
  buildLabCeilingCanopyAndArms,
  buildLabOperatorConsoles,
  buildOreContainmentVat,
  type LabBunkerAnimHandles,
  type LabBunkerBuildCtx,
} from './FusionLabBunker3D';
import {
  createLabTubePodium,
  type CyberShowcasePodiumHandle,
} from './FusionWorldPodium3D';
import { getFusionMagicCircuitTexture } from './ProceduralTextures3D';
import type { ShopChibiBubbleAnchor } from './ShopWorld3D';
import {
  buildFusionGlassShards,
  hideFusionGlassShards,
  initFusionGlassShards,
  stepFusionWorldUpdate,
  type FusionGlassShard,
  type FusionSeqState,
} from './FusionSequence3D';
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
const MAX_MAT_SLOTS = 3;
const STAGE_CENTER_Z = -6.45;
const STAGE_DECK_Y = 0.76;
const APEX_PODIUM_SCALE = 2.8;
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
  // Grand 2x Apex Cylindrical Stasis Tube Podium on the Rear Circular Containment Dais
  private readonly apexPodium: CyberShowcasePodiumHandle;
  private readonly floatingIslands: FloatingIslandNode[] = [];
  private readonly labDarkFrameMat: THREE.MeshStandardMaterial;
  private readonly labAnim: LabBunkerAnimHandles = {
    irisRotorGroup: null,
    cryoBubbleGroups: [],
    cryoMistMats: [],
    emitterTipMats: [],
  };
  private readonly oreClusters: OreCrystalNode[] = [];
  private readonly materialSlots: MaterialPedestalSlot[] = [];
  private readonly glassShards: FusionGlassShard[];
  private readonly resultMount = new THREE.Group();
  private resultSprite: ChibiSprite3D | null = null;
  private resultChibiId: string | null = null;
  private activeRecipeId: string | null = null;
  private readonly seq: FusionSeqState = {
    allRequirementsReady: false,
    fusionAnimTimer: 0,
    fusionAnimDur: 3.65,
    portalFlashTimer: 0,
    revealPopTimer: 0,
    revealHold: false,
    materialShattered: false,
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
    // Shared Clean-Tech White Lab Bunker materials (Rhine Lab × Herta Space Station)
    this.labDarkFrameMat = new THREE.MeshStandardMaterial({
      color: '#253348',
      roughness: 0.48,
      metalness: 0.4,
      flatShading: true,
    });
    this.armorDarkMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.48,
      metalness: 0.46,
      flatShading: true,
    });
    this.armorSteelMat = new THREE.MeshStandardMaterial({
      color: '#eaf1f9',
      roughness: 0.5,
      metalness: 0.14,
      flatShading: true,
    });
    this.brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.3,
      metalness: 0.5,
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
      this.labDarkFrameMat,
      this.armorDarkMat,
      this.armorSteelMat,
      this.brightSteelMat,
      this.deckTrimCyanMat,
      this.deckTrimMagentaMat,
      this.stageNeonMat
    );
    // 1. Clean-Tech White Octagonal Bunker Floor Deck + Grating Vents + 17.2m Circuit Grid
    const bunkerCtx = this.bunkerBuildCtx();
    buildLabBunkerFloorDeck(bunkerCtx);
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
    // 3. Elevated Clean-Tech Circular Containment Dais + Grand 2x Apex Tube Podium
    this.buildElevatedShowcaseStage();
    this.apexPodium = this.createLabTubePodium('APEX', APEX_PODIUM_SCALE, true);
    this.apexPodium.group.position.set(0, STAGE_DECK_Y + 0.016, STAGE_CENTER_Z);
    this.group.add(this.apexPodium.group);
    this.buildPerimeterTechPylons();
    // 4. Reusable 16-piece interlocking Chibi-art prism glass shard pool for Fusion assembly
    this.glassShards = buildFusionGlassShards(this.group, this.ownedGeos, this.ownedMats);
    // Result Chibi mount above Grand Apex Podium
    this.resultMount.position.set(0, DAIS_TOP_Y + 0.04, STAGE_CENTER_Z);
    this.group.add(this.resultMount);
    // 6. Outer Material ZZZ/HSR Cyber-Showcase Podiums + Grooved Floor Energy Conduits
    this.buildMaterialPedestals();
    // 7. Mineral Ore Containment Vats + Cutaway Lab Bunker Walls, Cryo Bays, Ceiling Iris & Consoles
    this.buildRecipeOreClusters();
    buildLabBunkerWallsAndCryoBays(bunkerCtx);
    buildLabCeilingCanopyAndArms(bunkerCtx);
    buildLabOperatorConsoles(bunkerCtx);
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
  private createLabTubePodium(plaqueLabel: string, scale = 1, withDualAuraShells = false): CyberShowcasePodiumHandle {
    return createLabTubePodium(
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
      ownedGeos: this.ownedGeos, ownedMats: this.ownedMats, customDisposers: this.customDisposers,
    };
  }
  private bunkerBuildCtx(): LabBunkerBuildCtx {
    return {
      group: this.group,
      labWhiteMat: this.armorSteelMat,
      labSilverMat: this.brightSteelMat,
      labSlateMat: this.armorDarkMat,
      labDarkFrameMat: this.labDarkFrameMat,
      stageNeonMat: this.stageNeonMat,
      deckTrimCyanMat: this.deckTrimCyanMat,
      deckTrimMagentaMat: this.deckTrimMagentaMat,
      ownedGeos: this.ownedGeos,
      ownedMats: this.ownedMats,
      ownedTextures: this.ownedTextures,
      animHandles: this.labAnim,
    };
  }
  private buildElevatedShowcaseStage(): void { buildElevatedShowcaseStage(this.arenaBuildCtx()); }
  private buildPerimeterTechPylons(): void { buildPerimeterTechPylons(this.arenaBuildCtx()); }
  private buildMaterialPedestals(): void {
    const holoGridGeo = new THREE.RingGeometry(0.55, 0.92, 24);
    const trayGeo = new THREE.BoxGeometry(0.42, 0.06, 1.0);
    const conduitGeo = new THREE.PlaneGeometry(0.24, 1.0);
    const pulseGeo = new THREE.BoxGeometry(0.28, 0.085, 0.36);
    this.ownedGeos.push(holoGridGeo, trayGeo, conduitGeo, pulseGeo);
    for (let i = 0; i < MAX_MAT_SLOTS; i++) {
      const podium = this.createLabTubePodium(`0${i + 1}`, MAT_PODIUM_SCALE, false);
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
      holoGridRing.position.y = 0.306;
      holoGridRing.renderOrder = 3;
      podium.group.add(holoGridRing);
      // Dark slate floor cable trough + vivid high-contrast energy conduit & travelling pulse nodes
      const conduitGroup = new THREE.Group();
      const trayMesh = new THREE.Mesh(trayGeo, this.armorDarkMat);
      trayMesh.position.y = 0.04;
      conduitGroup.add(trayMesh);
      const conduitMat = new THREE.MeshBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
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
    const bunkerCtx = this.bunkerBuildCtx();
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
      const vatGroup = buildOreContainmentVat(bunkerCtx, sp.x, sp.z, sp.scale * 0.92);
      const clusterGroup = createCyberCrystalCluster({
        frameMat: this.armorDarkMat,
        crystalMat,
        accentMat,
        scale: 0.92,
        shardCount: 6,
      });
      clusterGroup.position.set(0, 0.3, 0);
      this.customDisposers.push(() => disposeCyberProp(clusterGroup));
      const floatingShards: THREE.Mesh[] = [];
      for (let s = 0; s < 2; s++) {
        const shard = new THREE.Mesh(shardGeo, s === 0 ? crystalMat : accentMat);
        shard.position.set(s === 0 ? -0.35 : 0.35, 0.95 + s * 0.22, 0);
        clusterGroup.add(shard);
        floatingShards.push(shard);
      }
      vatGroup.add(clusterGroup);
      this.group.add(vatGroup);
      this.oreClusters.push({
        group: clusterGroup,
        crystalMat,
        accentMat,
        floatingShards,
        oreSlotIndex: sp.oreSlotIndex,
        ready: false,
        baseY: 0.3,
        phase: sp.phase,
      });
    }
  }
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
      if (elapsedAnim < 0.85) {
        // Phase 1: Frame the Material Chibis shattering into floating prism glass shards
        const p = Math.min(1, elapsedAnim / 0.85);
        this.camFocusPos.set(0, 7.8 - p * 3.55, 13.8 - p * 13.75);
        this.camFocusLook.set(0, 2.0 + p * 1.45, -0.4 - p * 6.05);
      } else {
        // Phase 2-4: Positioned cleanly forward of the front-center Material Tube (z = 2.45) to frame the 2x APEX Tube unobstructed
        this.camFocusPos.set(0, 4.25, 0.05);
        this.camFocusLook.set(0, 3.45, STAGE_CENTER_Z);
      }
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    if (this.seq.revealHold) {
      this.camFocusPos.set(0, 4.25, 0.05);
      this.camFocusLook.set(0, 3.45, STAGE_CENTER_Z);
      return { active: true, camPos: this.camFocusPos, lookAt: this.camFocusLook };
    }
    return { active: false, camPos: this.camFocusPos, lookAt: this.camFocusLook };
  }
  public cancelAnimation(): void {
    this.seq.fusionAnimTimer = 0;
    this.seq.materialShattered = false;
    this.seq.portalBurstFired = false;
    this.seq.fusionBurstFired = false;
    this.seq.landingEchoFired = false;
    this.seq.revealHold = false;
    this.seq.portalFlashTimer = 0;
    this.seq.onFusionAnimComplete = null;
    this.resultMount.visible = true;
    hideFusionGlassShards(this.glassShards);
    for (const slot of this.materialSlots) {
      if (slot.sprite) {
        slot.sprite.group.position.set(0, 0.285, 0);
        slot.sprite.group.scale.setScalar(1);
      }
    }
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
    // Position 2 or 3 Cylindrical Stasis Tube Material Podiums in a Spacious Front Crescent Arc
    const count = recipe.requiredMiners.length;
    const coords: Array<[number, number]> =
      count === 2
        ? [
            [-4.65, 0.65],
            [4.65, 0.65],
          ]
        : [
            [-4.95, 0.25],
            [4.95, 0.25],
            [0, 2.45],
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
      // Orient floor energy conduit radially from Circular Dais outer rim (r = 4.12m) to Material Podium rim
      const dx = px;
      const dz = pz - STAGE_CENTER_Z;
      const dist = Math.hypot(dx, dz);
      const nx = dist > 0.001 ? dx / dist : 0;
      const nz = dist > 0.001 ? dz / dist : 1;
      const daisRimDist = 4.12;
      const podRimOffset = 1.38;
      const conduitLen = Math.max(0.4, dist - daisRimDist - podRimOffset);
      const midDist = daisRimDist + conduitLen * 0.5;
      slot.conduitGroup.visible = true;
      slot.conduitGroup.position.set(nx * midDist, 0, STAGE_CENTER_Z + nz * midDist);
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
      const conduitColor = this.seq.allRequirementsReady
        ? '#eab308'
        : ready
          ? recipe.accentColor.toLowerCase() === '#e2e8f0'
            ? '#0284c7'
            : recipe.accentColor
          : '#ef4444';
      slot.conduitMat.color.set(conduitColor);
      slot.conduitMat.opacity = this.seq.allRequirementsReady ? 1 : ready ? 0.96 : 0.92;
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
        const sp = new ChibiSprite3D(resDef, 3.95);
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
    this.seq.materialShattered = false;
    this.seq.portalBurstFired = false;
    this.seq.fusionBurstFired = false;
    this.seq.landingEchoFired = false;
    this.seq.onFusionAnimComplete = onComplete;
    this.resultMount.visible = false;
    initFusionGlassShards(
      this.glassShards,
      this.materialSlots,
      recipe.requiredMiners.length,
      this.resultSprite,
      recipe.accentColor,
      recipe.glowColor
    );
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
        glassShards: this.glassShards,
        materialSlots: this.materialSlots,
        oreClusters: this.oreClusters,
        floatingIslands: this.floatingIslands,
        apexPodium: this.apexPodium,
        magicCircleMesh: this.magicCircleMesh,
        magicCircleMat: this.magicCircleMat,
        innerRingMesh: this.innerRingMesh,
        outerRingMesh: this.outerRingMesh,
        stageNeonMat: this.stageNeonMat,
        labAnim: this.labAnim,
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
    for (const t of this.ownedTextures) t.dispose();
    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.ownedMats) m.dispose();
    this.ownedTextures.length = 0;
    this.ownedGeos.length = 0;
    this.ownedMats.length = 0;
  }
}
