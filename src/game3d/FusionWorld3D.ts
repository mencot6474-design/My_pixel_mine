import * as THREE from 'three';
import { FUSION_RECIPES, FusionRecipeDef } from '../game/FusionData';
import { getOreById } from '../game/GameData';
import { AttackImpactFxController } from './AttackImpactFx3D';
import { getChibiById } from './ChibiCatalog';
import { ChibiSprite3D } from './ChibiSprite3D';
import {
  createCyberCrystalCluster,
  createCyberLanternBollardFinial,
  createCyberMonolithForkFinial,
  disposeCyberProp,
} from './CyberProps3D';
import {
  createAnimeAuraShaderMaterial,
  createAnimeParticlePoints,
  getEnchantSigilTexture,
  getPedestalHoloRingTexture,
} from './PlotPedestal3D';
import {
  getFusionMagicCircuitTexture,
  getFusionPortalVortexTexture,
} from './ProceduralTextures3D';
import type { ShopChibiBubbleAnchor } from './ShopWorld3D';
interface CyberShowcasePodiumHandle {
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  holoDiscMat: THREE.MeshBasicMaterial;
  sigilMesh: THREE.Mesh;
  sigilMat: THREE.MeshBasicMaterial;
  auraVeilMat: THREE.ShaderMaterial;
  auraOuterVeilMat: THREE.ShaderMaterial;
  particleMat: THREE.ShaderMaterial;
  auraGroup: THREE.Group;
  topY: number;
}
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
interface FloatingIslandNode {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
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
function createChamferPadGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer: number,
  bevel = 0.015
): THREE.ExtrudeGeometry {
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const c = Math.min(chamfer, hw * 0.42, hd * 0.42);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();
  const innerH = Math.max(0.015, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}
function createPodiumPlaqueTexture(label: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#09111f';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
  ctx.fillRect(8, 12, 6, 24);
  ctx.fillRect(c.width - 14, 12, 6, 24);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '900 20px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width * 0.5, c.height * 0.52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
/**
 * Expanded 3D Outer-Space Cyber-Synchro Fusion World:
 * - Massive 23m-wide multi-tiered octagonal cyber arena deck with Cyan & Magenta neon floor trims,
 *   17.2m cyber-magic circuit sigil, elevated rear Cyber-Holographic Showcase Stage (modeled after Mining),
 *   and 6 perimeter mechanical tech/crystal towers.
 * - ZZZ/HSR Cyber-Showcase Podiums (chamfered dock bay, side bumper guards + cooling louvers, stepped titanium
 *   dais, front numeric/APEX apron plaque, waist-high rear projector stanchions, frosted holo lens, corner
 *   claws/diodes, Dual-Shell Anime-RPG Aura & GPU star-ember wisps from `PlotPedestal3D.ts`).
 * - Front Crescent Arc 2-3 material podiums + gigantic rear Triple-Ring "Synchro Portal" + grooved floor
 *   energy conduits with dynamic readiness status colors.
 * - 4 physical recipe Ore Crystal Clusters, 8 floating cosmic islands, skyward Light Beam, 2 Alchemist/Scientist
 *   NPCs with speech bubbles, blue hologram preview for missing units, and 3-phase Fusion animation.
 */
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
  private readonly fusionAnimDur = 1.35;
  private portalBurstFired = false;
  private fusionBurstFired = false;
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
  private createCyberShowcasePodium(
    plaqueLabel: string,
    scale = 1,
    withDualAuraShells = false
  ): CyberShowcasePodiumHandle {
    const group = new THREE.Group();
    group.scale.setScalar(scale);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#22d3ee',
      emissiveIntensity: 1.0,
      roughness: 0.22,
      metalness: 0.3,
      flatShading: true,
    });
    this.ownedMats.push(ringMat);
    // Tier 1: Wide Chamfered Composite Display Bay Foundation + Lateral Cooling Fins
    const bayDockGeo = createChamferPadGeometry(1.94, 0.088, 1.78, 0.28, 0.016);
    const guardGeo = createChamferPadGeometry(0.14, 0.11, 1.04, 0.04, 0.012);
    const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
    const edgeSeamGeo = new THREE.CylinderGeometry(0.79, 0.81, 0.024, 8);
    const plinthGeo = new THREE.CylinderGeometry(0.68, 0.78, 0.128, 8);
    const topRimGeo = new THREE.CylinderGeometry(0.63, 0.69, 0.036, 8);
    const frontApronGeo = createChamferPadGeometry(0.58, 0.095, 0.24, 0.05, 0.012);
    const plaqueFaceGeo = new THREE.PlaneGeometry(0.44, 0.16);
    const rearManifoldGeo = createChamferPadGeometry(1.18, 0.18, 0.26, 0.08, 0.014);
    const manifoldGlowGeo = createChamferPadGeometry(0.84, 0.035, 0.06, 0.01, 0.006);
    const stanchionGeo = createChamferPadGeometry(0.14, 0.56, 0.18, 0.03, 0.012);
    const stanchionCapGeo = createChamferPadGeometry(0.18, 0.06, 0.22, 0.04, 0.01);
    const stanchionBladeGeo = new THREE.BoxGeometry(0.035, 0.44, 0.045);
    const ringTorusGeo = new THREE.TorusGeometry(0.59, 0.025, 6, 8);
    const clawGeo = new THREE.CylinderGeometry(0.04, 0.056, 0.072, 6);
    const diodeGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.028, 6);
    this.ownedGeos.push(
      bayDockGeo,
      guardGeo,
      ventGeo,
      edgeSeamGeo,
      plinthGeo,
      topRimGeo,
      frontApronGeo,
      plaqueFaceGeo,
      rearManifoldGeo,
      manifoldGlowGeo,
      stanchionGeo,
      stanchionCapGeo,
      stanchionBladeGeo,
      ringTorusGeo,
      clawGeo,
      diodeGeo
    );
    const bayDock = new THREE.Mesh(bayDockGeo, this.armorDarkMat);
    bayDock.receiveShadow = true;
    bayDock.castShadow = true;
    group.add(bayDock);
    for (const sx of [-1, 1]) {
      const guard = new THREE.Mesh(guardGeo, this.armorSteelMat);
      guard.position.set(sx * 0.92, 0.055, -0.02);
      guard.castShadow = true;
      guard.receiveShadow = true;
      group.add(guard);
      for (const vz of [-0.32, 0, 0.32]) {
        const vent = new THREE.Mesh(ventGeo, this.brightSteelMat);
        vent.position.set(sx * 0.995, 0.105, vz);
        group.add(vent);
      }
    }
    // Recessed Edge-Lit Acrylic Seam Strip
    const edgeSeamRing = new THREE.Mesh(edgeSeamGeo, ringMat);
    edgeSeamRing.position.y = 0.1;
    edgeSeamRing.rotation.y = Math.PI / 8;
    // Tier 2: Stepped Octagonal Machinery Dais + Brushed Titanium Collar
    const machineryPlinth = new THREE.Mesh(plinthGeo, this.armorSteelMat);
    machineryPlinth.position.y = 0.176;
    machineryPlinth.rotation.y = Math.PI / 8;
    machineryPlinth.receiveShadow = true;
    machineryPlinth.castShadow = true;
    const topBevelRim = new THREE.Mesh(topRimGeo, this.brightSteelMat);
    topBevelRim.position.y = 0.256;
    topBevelRim.rotation.y = Math.PI / 8;
    topBevelRim.receiveShadow = true;
    group.add(edgeSeamRing, machineryPlinth, topBevelRim);
    // Tier 3: Sleek Front-Angled Slot Plaque ("01".."03" or "APEX") Mounted Proud on Forward Apron
    const frontApron = new THREE.Mesh(frontApronGeo, this.brightSteelMat);
    frontApron.position.set(0, 0.02, 0.84);
    frontApron.rotation.x = 0.34;
    frontApron.castShadow = true;
    const plaqueTex = createPodiumPlaqueTexture(plaqueLabel);
    if (plaqueTex) this.ownedTextures.push(plaqueTex);
    const plaqueMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(plaqueTex ? { map: plaqueTex } : { color: 0x0f172a }),
    });
    this.ownedMats.push(plaqueMat);
    const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueMat);
    plaqueFace.position.set(0, 0.099, 0);
    plaqueFace.rotation.x = -Math.PI / 2;
    frontApron.add(plaqueFace);
    group.add(frontApron);
    // Tier 4: ZZZ/HSR Low-Profile Rear Holographic Display Stanchions & Power Manifold
    const rearManifold = new THREE.Mesh(rearManifoldGeo, this.armorDarkMat);
    rearManifold.position.set(0, 0.04, -0.78);
    rearManifold.castShadow = true;
    rearManifold.receiveShadow = true;
    const manifoldGlow = new THREE.Mesh(manifoldGlowGeo, ringMat);
    manifoldGlow.position.set(0, 0.22, -0.78);
    group.add(rearManifold, manifoldGlow);
    for (const sx of [-1, 1]) {
      const pylonPivot = new THREE.Group();
      pylonPivot.position.set(sx * 0.76, 0.08, -0.68);
      pylonPivot.rotation.z = -sx * 0.12;
      pylonPivot.rotation.x = 0.08;
      const body = new THREE.Mesh(stanchionGeo, this.armorSteelMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const cap = new THREE.Mesh(stanchionCapGeo, this.brightSteelMat);
      cap.position.y = 0.56;
      cap.castShadow = true;
      const glowBlade = new THREE.Mesh(stanchionBladeGeo, ringMat);
      glowBlade.position.set(-sx * 0.072, 0.28, 0.045);
      pylonPivot.add(body, cap, glowBlade);
      group.add(pylonPivot);
    }
    // Core Frosted Emitter Lens & Recessed Octagonal Neon Collar + 4 Corner Claws & Diodes
    const pedHoloTex = getPedestalHoloRingTexture();
    const holoDiscMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      ...(pedHoloTex ? { map: pedHoloTex } : {}),
      transparent: true,
      opacity: pedHoloTex ? 0.78 : 0.38,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.ownedMats.push(holoDiscMat);
    const holoLensGeo = pedHoloTex
      ? new THREE.PlaneGeometry(1.18, 1.18)
      : new THREE.RingGeometry(0.24, 0.54, 24);
    this.ownedGeos.push(holoLensGeo);
    const holoLensDisc = new THREE.Mesh(holoLensGeo, holoDiscMat);
    holoLensDisc.rotation.x = -Math.PI / 2;
    holoLensDisc.position.y = 0.282;
    holoLensDisc.renderOrder = 2;
    const ringMesh = new THREE.Mesh(ringTorusGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.rotation.z = Math.PI / 8;
    ringMesh.position.y = 0.286;
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + (i * Math.PI) / 2;
      const rx = Math.cos(ang) * 0.635;
      const rz = Math.sin(ang) * 0.635;
      const claw = new THREE.Mesh(clawGeo, this.brightSteelMat);
      claw.position.set(rx, 0.254, rz);
      claw.castShadow = true;
      const diode = new THREE.Mesh(diodeGeo, ringMat);
      diode.position.set(rx, 0.295, rz);
      group.add(claw, diode);
    }
    group.add(holoLensDisc, ringMesh);
    // Tier 5: Anime-RPG Ground Sigil + Dual-Shell Fresnel Rim Aura + GPU Star-Ember Particles
    const auraGroup = new THREE.Group();
    const sigilTex = getEnchantSigilTexture();
    const sigilMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      ...(sigilTex ? { map: sigilTex } : {}),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: sigilTex ? 0.64 : 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const sigilGeo = sigilTex
      ? new THREE.PlaneGeometry(1.96, 1.96)
      : new THREE.RingGeometry(0.58, 0.84, 32);
    this.ownedGeos.push(sigilGeo);
    this.ownedMats.push(sigilMat);
    const sigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
    sigilMesh.rotation.x = -Math.PI / 2;
    sigilMesh.position.y = 0.298;
    sigilMesh.renderOrder = 3;
    auraGroup.add(sigilMesh);
    const auraVeilMat = createAnimeAuraShaderMaterial('#22d3ee', '#d946ef', withDualAuraShells ? 0.72 : 0.36);
    const auraOuterVeilMat = createAnimeAuraShaderMaterial('#d946ef', '#22d3ee', withDualAuraShells ? 0.42 : 0.2);
    const veilGeo1 = new THREE.CylinderGeometry(0.76, 0.58, 1.62, 28, 1, true);
    const veilGeo2 = new THREE.CylinderGeometry(0.9, 0.64, 1.7, 28, 1, true);
    this.ownedGeos.push(veilGeo1, veilGeo2);
    this.ownedMats.push(auraVeilMat, auraOuterVeilMat);
    const auraVeil = new THREE.Mesh(veilGeo1, auraVeilMat);
    auraVeil.position.y = 1.06;
    const outerAuraVeil = new THREE.Mesh(veilGeo2, auraOuterVeilMat);
    outerAuraVeil.position.y = 1.1;
    auraGroup.add(auraVeil, outerAuraVeil);
    const particles = createAnimeParticlePoints('#22d3ee', '#d946ef', {
      count: withDualAuraShells ? 38 : 24,
      minRadius: 0.44,
      maxRadius: 0.78,
      baseY: 0.28,
      sizeScale: scale,
    });
    this.ownedGeos.push(particles.geo);
    this.ownedMats.push(particles.mat);
    auraGroup.add(particles.points);
    group.add(auraGroup);
    return {
      group,
      ringMat,
      holoDiscMat,
      sigilMesh,
      sigilMat,
      auraVeilMat,
      auraOuterVeilMat,
      particleMat: particles.mat,
      auraGroup,
      topY: 0.285 * scale,
    };
  }
  private buildExpandedOctagonalArenaDeck(darkBasaltMat: THREE.Material): void {
    // Massive 23m-wide Octagonal Cyber-Synchro Arena Platform (1.55x larger than previous 14.8m deck)
    const hullGeo = new THREE.CylinderGeometry(11.8, 10.1, 0.68, 8);
    const hullMesh = new THREE.Mesh(hullGeo, this.armorDarkMat);
    hullMesh.position.y = -0.52;
    hullMesh.receiveShadow = true;
    const deckGeo = new THREE.CylinderGeometry(11.35, 11.75, 0.38, 8);
    const deckMesh = new THREE.Mesh(deckGeo, darkBasaltMat);
    deckMesh.position.y = -0.19;
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;
    const plateGeo = new THREE.CylinderGeometry(10.2, 10.35, 0.04, 8);
    const plateMesh = new THREE.Mesh(plateGeo, this.armorSteelMat);
    plateMesh.position.y = 0.0;
    plateMesh.receiveShadow = true;
    this.ownedGeos.push(hullGeo, deckGeo, plateGeo);
    this.group.add(hullMesh, deckMesh, plateMesh);
    // 8 Perimeter Neon Floor Trim Rails (Outer Cyan + Inner Magenta) & 8 Heavy Corner Armor Bastions
    const outerRailGeo = new THREE.BoxGeometry(8.18, 0.075, 0.11);
    const innerRailGeo = new THREE.BoxGeometry(7.65, 0.06, 0.09);
    const cornerBumperGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.28, 6);
    const cornerStudGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.09, 6);
    this.ownedGeos.push(outerRailGeo, innerRailGeo, cornerBumperGeo, cornerStudGeo);
    for (let i = 0; i < 8; i++) {
      const edgeAngle = (i + 0.5) * (Math.PI / 4);
      const outerR = 10.42;
      const innerR = 9.95;
      const cyanRail = new THREE.Mesh(outerRailGeo, this.deckTrimCyanMat);
      cyanRail.position.set(Math.sin(edgeAngle) * outerR, 0.045, Math.cos(edgeAngle) * outerR);
      cyanRail.rotation.y = edgeAngle;
      const magentaRail = new THREE.Mesh(innerRailGeo, this.deckTrimMagentaMat);
      magentaRail.position.set(Math.sin(edgeAngle) * innerR, 0.048, Math.cos(edgeAngle) * innerR);
      magentaRail.rotation.y = edgeAngle;
      const vertAngle = i * (Math.PI / 4);
      const vertR = 10.95;
      const bumper = new THREE.Mesh(cornerBumperGeo, this.brightSteelMat);
      bumper.position.set(Math.sin(vertAngle) * vertR, 0.1, Math.cos(vertAngle) * vertR);
      bumper.castShadow = true;
      bumper.receiveShadow = true;
      const stud = new THREE.Mesh(
        cornerStudGeo,
        i % 2 === 0 ? this.deckTrimCyanMat : this.deckTrimMagentaMat
      );
      stud.position.set(Math.sin(vertAngle) * vertR, 0.26, Math.cos(vertAngle) * vertR);
      this.group.add(cyanRail, magentaRail, bumper, stud);
    }
  }
  /**
   * Builds the Elevated Cyber-Holographic Rear Showcase Stage (inspired by the Mining `"My Chibi"`
   * stage in `MineScene3D.ts`) with steel bay dividers, rear busbar, neon trims, and a wide
   * illuminated cyber stairwell descending into the front Crescent Arc arena.
   */
  private buildElevatedShowcaseStage(): void {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0, STAGE_CENTER_Z);
    this.group.add(stageGroup);
    const stageBaseGeo = createChamferPadGeometry(7.6, 0.46, 3.8, 0.55, 0.02);
    const rackDeckGeo = createChamferPadGeometry(7.1, 0.3, 3.4, 0.48, 0.018);
    const rearBridgeGeo = new THREE.BoxGeometry(1.45, 0.07, 2.4);
    const frontTrimGeo = new THREE.BoxGeometry(2.25, 0.07, 0.11);
    const rearTrimGeo = new THREE.BoxGeometry(6.8, 0.07, 0.11);
    const sideWingGeo = createChamferPadGeometry(1.45, 0.14, 2.4, 0.22, 0.014);
    const stepGeo = new THREE.BoxGeometry(2.48, 0.16, 0.36);
    const stepLedGeo = new THREE.BoxGeometry(2.42, 0.035, 0.055);
    const cheekGeo = new THREE.BoxGeometry(0.24, 0.88, 1.62);
    const cheekCapGeo = new THREE.BoxGeometry(0.28, 0.07, 1.66);
    const cheekLedGeo = new THREE.BoxGeometry(0.06, 0.035, 1.62);
    this.ownedGeos.push(
      stageBaseGeo,
      rackDeckGeo,
      rearBridgeGeo,
      frontTrimGeo,
      rearTrimGeo,
      sideWingGeo,
      stepGeo,
      stepLedGeo,
      cheekGeo,
      cheekCapGeo,
      cheekLedGeo
    );
    const stageBase = new THREE.Mesh(stageBaseGeo, this.armorDarkMat);
    stageBase.receiveShadow = true;
    stageBase.castShadow = true;
    const rackDeck = new THREE.Mesh(rackDeckGeo, this.armorSteelMat);
    rackDeck.position.y = 0.46;
    rackDeck.receiveShadow = true;
    rackDeck.castShadow = true;
    // Low-profile floor conduit runway connecting stage to rear portal dock (zero collision with floating rings)
    const rearBridge = new THREE.Mesh(rearBridgeGeo, this.armorSteelMat);
    rearBridge.position.set(0, 0.035, -2.55);
    rearBridge.receiveShadow = true;
    stageGroup.add(stageBase, rackDeck, rearBridge);
    for (const sx of [-1, 1]) {
      const sideWing = new THREE.Mesh(sideWingGeo, this.brightSteelMat);
      sideWing.position.set(sx * 2.45, STAGE_DECK_Y - 0.02, 0);
      sideWing.receiveShadow = true;
      sideWing.castShadow = true;
      const frontTrim = new THREE.Mesh(frontTrimGeo, this.stageNeonMat);
      frontTrim.position.set(sx * 2.38, STAGE_DECK_Y - 0.02, 1.71);
      stageGroup.add(sideWing, frontTrim);
    }
    const rearTrim = new THREE.Mesh(rearTrimGeo, this.stageNeonMat);
    rearTrim.position.set(0, STAGE_DECK_Y - 0.02, -1.71);
    stageGroup.add(rearTrim);
    // Futuristic Steel Stairwell & Illuminated Treads Descending Forward from the Apex Stage
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, this.armorSteelMat);
      cheek.position.set(sx * 1.36, 0.38, 2.15);
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      const cheekCap = new THREE.Mesh(cheekCapGeo, this.brightSteelMat);
      cheekCap.position.set(sx * 1.36, 0.84, 2.15);
      cheekCap.castShadow = true;
      const cheekLed = new THREE.Mesh(cheekLedGeo, this.stageNeonMat);
      cheekLed.position.set(sx * 1.36, 0.88, 2.15);
      stageGroup.add(cheek, cheekCap, cheekLed);
    }
    const stairStepCount = 4;
    for (let s = 0; s < stairStepCount; s++) {
      const t = (s + 0.5) / stairStepCount;
      const stepY = STAGE_DECK_Y - 0.06 - t * 0.64;
      const stepZ = 1.56 + t * 1.32;
      const stepMesh = new THREE.Mesh(stepGeo, this.armorSteelMat);
      stepMesh.position.set(0, stepY, stepZ);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      const stepLed = new THREE.Mesh(stepLedGeo, this.stageNeonMat);
      stepLed.position.set(0, stepY + 0.085, stepZ + 0.15);
      stageGroup.add(stepMesh, stepLed);
    }
  }
  private buildPerimeterTechPylons(darkBasaltMat: THREE.Material): void {
    const pylonCoords: ReadonlyArray<readonly [number, number, number]> = [
      [-9.15, -2.15, 0.35],
      [-5.85, -7.85, 0.65],
      [5.85, -7.85, -0.65],
      [9.15, -2.15, -0.35],
    ];
    const plinthGeo = new THREE.CylinderGeometry(0.68, 0.88, 0.52, 8);
    const shaftGeo = new THREE.CylinderGeometry(0.34, 0.46, 3.65, 8);
    const collarGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.22, 8);
    const neonStripGeo = new THREE.BoxGeometry(0.09, 3.1, 0.09);
    const overheadBeamGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 6);
    this.ownedGeos.push(plinthGeo, shaftGeo, collarGeo, neonStripGeo, overheadBeamGeo);
    for (let i = 0; i < pylonCoords.length; i++) {
      const [px, pz, rotY] = pylonCoords[i];
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(px, 0, pz);
      pylonGroup.rotation.y = rotY;
      const plinth = new THREE.Mesh(plinthGeo, darkBasaltMat);
      plinth.position.y = 0.26;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      const shaft = new THREE.Mesh(shaftGeo, this.armorSteelMat);
      shaft.position.y = 2.25;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      const lowerCollar = new THREE.Mesh(collarGeo, this.brightSteelMat);
      lowerCollar.position.y = 1.35;
      const upperCollar = new THREE.Mesh(collarGeo, this.brightSteelMat);
      upperCollar.position.y = 3.25;
      const neonMat = i % 2 === 0 ? this.deckTrimCyanMat : this.deckTrimMagentaMat;
      const stripFront = new THREE.Mesh(neonStripGeo, neonMat);
      stripFront.position.set(0, 2.28, 0.39);
      const stripSide = new THREE.Mesh(neonStripGeo, neonMat);
      stripSide.position.set(i < 2 ? 0.39 : -0.39, 2.28, 0);
      const finial = createCyberMonolithForkFinial({
        frameMat: this.armorSteelMat,
        steelMat: this.brightSteelMat,
        coreMat: neonMat,
        scale: 1.55,
      });
      finial.position.y = 4.05;
      this.customDisposers.push(() => disposeCyberProp(finial));
      const crownCrystal = createCyberCrystalCluster({
        frameMat: this.brightSteelMat,
        crystalMat: this.stageNeonMat,
        accentMat: neonMat,
        scale: 0.85,
        shardCount: 4,
      });
      crownCrystal.position.y = 4.62;
      this.customDisposers.push(() => disposeCyberProp(crownCrystal));
      pylonGroup.add(plinth, shaft, lowerCollar, upperCollar, stripFront, stripSide, finial, crownCrystal);
      this.group.add(pylonGroup);
      // Overhead energy conduit beam linking pylon crown to the outer Gantry Yoke Towers (never crossing portal face)
      const topPoint = new THREE.Vector3(px, 4.55, pz);
      const portalAnchor = new THREE.Vector3(
        px < 0 ? -4.65 : 4.65,
        4.75,
        PORTAL_CENTER.z
      );
      const dist = topPoint.distanceTo(portalAnchor);
      const beam = new THREE.Mesh(overheadBeamGeo, neonMat);
      beam.position.copy(topPoint).lerp(portalAnchor, 0.5);
      beam.scale.set(1, dist, 1);
      beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        portalAnchor.clone().sub(topPoint).normalize()
      );
      this.group.add(beam);
    }
    // 2 Front-Flank Armored Lantern Bollards framing the expanded front arena entrance
    for (const sx of [-1, 1]) {
      const bollard = createCyberLanternBollardFinial({
        frameMat: this.armorDarkMat,
        steelMat: this.brightSteelMat,
        coreMat: sx < 0 ? this.deckTrimCyanMat : this.deckTrimMagentaMat,
        scale: 1.45,
      });
      bollard.position.set(sx * 8.95, 0.04, 3.85);
      this.customDisposers.push(() => disposeCyberProp(bollard));
      this.group.add(bollard);
    }
  }
  /**
   * Builds the HSR/ZZZ/Stargate "Astral Quantum Synchro Gate":
   * - Low-profile recessed magnetic levitation dock (y = 0..0.82m) with a 0.50m levitation air-gap
   *   beneath the lowest outer ring clamps (y = 1.32m) â€” zero floor/base collision.
   * - Flanking Monolithic Gantry Yoke Towers positioned outside the outer ring radius (x = Â±4.65m)
   *   with inward magnetic emitter projectors â€” zero struts cutting across the rings.
   * - 3 concentric sculpted counter-rotating chrono/astrolabe rings + swirling quantum vortex core.
   */
  private buildSynchroPortal(): void {
    const portalRoot = new THREE.Group();
    portalRoot.position.copy(PORTAL_CENTER);
    this.group.add(portalRoot);
    // 1. Low-Profile Recessed Magnetic Levitation Dock (y = 0..0.82m, cleanly below ring bottom at y = 1.32m)
    const dockPadGeo = createChamferPadGeometry(9.8, 0.26, 2.15, 0.52, 0.018);
    const dockTier2Geo = createChamferPadGeometry(8.2, 0.22, 1.68, 0.42, 0.016);
    const emitterWellGeo = new THREE.CylinderGeometry(1.35, 1.58, 0.24, 12);
    const emitterRingGeo = new THREE.TorusGeometry(1.22, 0.045, 8, 32);
    const yokeTowerGeo = createChamferPadGeometry(0.76, 4.45, 0.96, 0.16, 0.016);
    const yokeButtressGeo = createChamferPadGeometry(0.46, 2.85, 0.72, 0.1, 0.014);
    const yokeCollarGeo = createChamferPadGeometry(0.88, 0.18, 1.08, 0.18, 0.012);
    const yokeStripGeo = new THREE.BoxGeometry(0.08, 3.85, 0.09);
    const projectorNoseGeo = new THREE.CylinderGeometry(0.16, 0.28, 0.46, 8);
    projectorNoseGeo.rotateZ(Math.PI / 2);
    this.ownedGeos.push(
      dockPadGeo,
      dockTier2Geo,
      emitterWellGeo,
      emitterRingGeo,
      yokeTowerGeo,
      yokeButtressGeo,
      yokeCollarGeo,
      yokeStripGeo,
      projectorNoseGeo
    );
    const dockPad = new THREE.Mesh(dockPadGeo, this.armorDarkMat);
    dockPad.position.set(0, 0, PORTAL_CENTER.z);
    dockPad.castShadow = true;
    dockPad.receiveShadow = true;
    const dockTier2 = new THREE.Mesh(dockTier2Geo, this.armorSteelMat);
    dockTier2.position.set(0, 0.26, PORTAL_CENTER.z);
    dockTier2.castShadow = true;
    dockTier2.receiveShadow = true;
    const emitterWell = new THREE.Mesh(emitterWellGeo, this.brightSteelMat);
    emitterWell.position.set(0, 0.6, PORTAL_CENTER.z);
    emitterWell.castShadow = true;
    emitterWell.receiveShadow = true;
    const emitterRing = new THREE.Mesh(emitterRingGeo, this.portalOuterMat);
    emitterRing.rotation.x = Math.PI / 2;
    emitterRing.position.set(0, 0.74, PORTAL_CENTER.z);
    this.group.add(dockPad, dockTier2, emitterWell, emitterRing);
    // 2. Flanking Monolithic Gantry Yoke Towers OUTSIDE the Portal (x = +-4.65m, clear of r = 3.82m outer clamps)
    for (const sx of [-1, 1]) {
      const yokeGroup = new THREE.Group();
      yokeGroup.position.set(sx * 4.65, 0.48, PORTAL_CENTER.z);
      const tower = new THREE.Mesh(yokeTowerGeo, this.armorSteelMat);
      tower.castShadow = true;
      tower.receiveShadow = true;
      const buttress = new THREE.Mesh(yokeButtressGeo, this.armorDarkMat);
      buttress.position.set(sx * 0.42, 0, 0);
      buttress.castShadow = true;
      const lowCollar = new THREE.Mesh(yokeCollarGeo, this.brightSteelMat);
      lowCollar.position.y = 1.35;
      const highCollar = new THREE.Mesh(yokeCollarGeo, this.brightSteelMat);
      highCollar.position.y = 3.25;
      const frontStrip = new THREE.Mesh(yokeStripGeo, this.portalOuterMat);
      frontStrip.position.set(0, 2.22, 0.49);
      // Inward Magnetic Clamp Projector aimed at the outer ring equator (stops at x = +-4.06m, outside r = 3.82m)
      const nose = new THREE.Mesh(projectorNoseGeo, this.brightSteelMat);
      nose.position.set(-sx * 0.46, PORTAL_CENTER.y - 0.48, 0);
      const noseCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8).rotateZ(Math.PI / 2),
        this.portalInnerMat
      );
      this.ownedGeos.push(noseCore.geometry);
      noseCore.position.set(-sx * 0.68, PORTAL_CENTER.y - 0.48, 0);
      const crownFinial = createCyberMonolithForkFinial({
        frameMat: this.armorSteelMat,
        steelMat: this.brightSteelMat,
        coreMat: this.portalOuterMat,
        scale: 1.45,
      });
      crownFinial.position.y = 4.45;
      this.customDisposers.push(() => disposeCyberProp(crownFinial));
      yokeGroup.add(
        tower,
        buttress,
        lowCollar,
        highCollar,
        frontStrip,
        nose,
        noseCore,
        crownFinial
      );
      this.group.add(yokeGroup);
    }
    // 3. Ring 1 (Outer Chrono-Stator Ring, r = 3.55m): Dual concentric tracks + 12 Beveled Armor Fin Clamps
    const outerTorusGeo = new THREE.TorusGeometry(3.55, 0.12, 10, 56);
    const outerSubTorusGeo = new THREE.TorusGeometry(3.32, 0.05, 8, 56);
    const outerClampGeo = createChamferPadGeometry(0.38, 0.28, 0.56, 0.08, 0.012);
    const outerToothGeo = new THREE.BoxGeometry(0.16, 0.3, 0.18);
    this.ownedGeos.push(outerTorusGeo, outerSubTorusGeo, outerClampGeo, outerToothGeo);
    this.portalOuterGroup.add(
      new THREE.Mesh(outerTorusGeo, this.brightSteelMat),
      new THREE.Mesh(outerSubTorusGeo, this.portalOuterMat)
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const clamp = new THREE.Mesh(outerClampGeo, this.armorSteelMat);
      clamp.position.set(Math.cos(a) * 3.56, Math.sin(a) * 3.56, 0);
      clamp.rotation.z = a + Math.PI / 2;
      const tooth = new THREE.Mesh(outerToothGeo, this.portalOuterMat);
      tooth.position.set(Math.cos(a) * 3.22, Math.sin(a) * 3.22, 0);
      tooth.rotation.z = a + Math.PI / 2;
      this.portalOuterGroup.add(clamp, tooth);
    }
    // 4. Ring 2 (Middle Counter-Rotating Astrolabe Ring, r = 2.72m) + 8 Beveled Capacitor Fin Pods
    const midTorusGeo = new THREE.TorusGeometry(2.72, 0.085, 10, 48);
    const midInnerTorusGeo = new THREE.TorusGeometry(2.54, 0.04, 8, 48);
    const midPodGeo = createChamferPadGeometry(0.3, 0.24, 0.44, 0.06, 0.01);
    const midLedGeo = new THREE.BoxGeometry(0.12, 0.28, 0.26);
    this.ownedGeos.push(midTorusGeo, midInnerTorusGeo, midPodGeo, midLedGeo);
    this.portalMidGroup.add(
      new THREE.Mesh(midTorusGeo, this.brightSteelMat),
      new THREE.Mesh(midInnerTorusGeo, this.portalMidMat)
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const pod = new THREE.Mesh(midPodGeo, this.armorDarkMat);
      pod.position.set(Math.cos(a) * 2.72, Math.sin(a) * 2.72, 0);
      pod.rotation.z = a + Math.PI / 2;
      const led = new THREE.Mesh(midLedGeo, this.portalMidMat);
      led.position.set(Math.cos(a) * 2.72, Math.sin(a) * 2.72, 0);
      led.rotation.z = a + Math.PI / 2;
      this.portalMidGroup.add(pod, led);
    }
    // 5. Ring 3 (Inner High-Speed Quantum Emitter Ring, r = 1.94m) + 6 Faceted Crystal Prong Emitters
    const innerTorusGeo = new THREE.TorusGeometry(1.94, 0.065, 10, 44);
    const prongCollarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.16, 6);
    const prongGeo = new THREE.ConeGeometry(0.11, 0.44, 6);
    this.ownedGeos.push(innerTorusGeo, prongCollarGeo, prongGeo);
    this.portalInnerGroup.add(new THREE.Mesh(innerTorusGeo, this.portalInnerMat));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const collar = new THREE.Mesh(prongCollarGeo, this.brightSteelMat);
      collar.position.set(Math.cos(a) * 1.92, Math.sin(a) * 1.92, 0);
      collar.rotation.z = a + Math.PI / 2;
      const prong = new THREE.Mesh(prongGeo, this.portalInnerMat);
      prong.position.set(Math.cos(a) * 1.66, Math.sin(a) * 1.66, 0);
      prong.rotation.z = a + Math.PI / 2;
      this.portalInnerGroup.add(collar, prong);
    }
    portalRoot.add(
      this.portalVortexMesh,
      this.portalFlashMesh,
      this.portalOuterGroup,
      this.portalMidGroup,
      this.portalInnerGroup
    );
  }
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
  private buildFloatingCosmicIslands(darkBasaltMat: THREE.Material): void {
    const islandSpecs: ReadonlyArray<{
      x: number;
      y: number;
      z: number;
      scale: number;
      crystalHex: string;
      phase: number;
      bobSpeed: number;
    }> = [
      { x: -15.8, y: 1.2, z: -3.2, scale: 1.65, crystalHex: '#22d3ee', phase: 0.0, bobSpeed: 1.3 },
      { x: 15.8, y: 1.45, z: -3.2, scale: 1.65, crystalHex: '#facc15', phase: 1.6, bobSpeed: 1.25 },
      { x: -18.2, y: 4.4, z: -10.8, scale: 1.95, crystalHex: '#d946ef', phase: 2.4, bobSpeed: 1.05 },
      { x: 18.2, y: 4.6, z: -10.8, scale: 1.95, crystalHex: '#38bdf8', phase: 0.9, bobSpeed: 1.1 },
      { x: -10.4, y: 5.8, z: -15.2, scale: 1.45, crystalHex: '#facc15', phase: 3.1, bobSpeed: 1.4 },
      { x: 10.4, y: 5.65, z: -15.2, scale: 1.45, crystalHex: '#22d3ee', phase: 4.2, bobSpeed: 1.35 },
      { x: -14.2, y: -0.6, z: 5.4, scale: 1.35, crystalHex: '#38bdf8', phase: 1.1, bobSpeed: 1.2 },
      { x: 14.2, y: -0.4, z: 5.4, scale: 1.35, crystalHex: '#d946ef', phase: 2.8, bobSpeed: 1.18 },
    ];
    const rockConeGeo = new THREE.ConeGeometry(1.35, 1.75, 7);
    rockConeGeo.rotateX(Math.PI);
    const capGeo = new THREE.CylinderGeometry(1.42, 1.32, 0.26, 7);
    const rimGeo = new THREE.TorusGeometry(1.38, 0.045, 6, 21);
    this.ownedGeos.push(rockConeGeo, capGeo, rimGeo);
    for (const sp of islandSpecs) {
      const islandGroup = new THREE.Group();
      islandGroup.position.set(sp.x, sp.y, sp.z);
      islandGroup.scale.setScalar(sp.scale);
      const underside = new THREE.Mesh(rockConeGeo, darkBasaltMat);
      underside.position.y = -0.88;
      underside.castShadow = true;
      const cap = new THREE.Mesh(capGeo, this.armorSteelMat);
      cap.position.y = 0.12;
      cap.receiveShadow = true;
      const crystalMat = new THREE.MeshStandardMaterial({
        color: sp.crystalHex,
        emissive: sp.crystalHex,
        emissiveIntensity: 1.25,
        roughness: 0.22,
        metalness: 0.35,
        flatShading: true,
      });
      this.ownedMats.push(crystalMat);
      const rim = new THREE.Mesh(rimGeo, crystalMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.22;
      const crystalCluster = createCyberCrystalCluster({
        frameMat: this.armorSteelMat,
        crystalMat,
        scale: 0.95,
        shardCount: 5,
      });
      crystalCluster.position.y = 0.25;
      this.customDisposers.push(() => disposeCyberProp(crystalCluster));
      islandGroup.add(underside, cap, rim, crystalCluster);
      this.group.add(islandGroup);
      this.floatingIslands.push({
        group: islandGroup,
        baseY: sp.y,
        phase: sp.phase,
        bobSpeed: sp.bobSpeed,
      });
    }
  }
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
  public cancelAnimation(): void {
    this.fusionAnimTimer = 0;
    this.portalBurstFired = false;
    this.fusionBurstFired = false;
    this.portalFlashTimer = 0;
    this.portalFlashMesh.visible = false;
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
        sp.setAnimState('aura');
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
    this.onFusionAnimComplete = onComplete;
    this.resultMount.visible = false;
    const count = recipe.requiredMiners.length;
    for (let s = 0; s < count; s++) {
      const slot = this.materialSlots[s];
      for (let k = 0; k < 6; k++) {
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
              (Math.random() - 0.5) * 0.45,
              1.35 + Math.random() * 0.35,
              (Math.random() - 0.5) * 0.45
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
          age: -(0.28 + k * 0.06),
          dur: 0.46,
          arcH: 1.1 + Math.random() * 0.8,
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
      const fp = this.portalFlashTimer / 0.35;
      this.portalFlashMesh.visible = fp > 0;
      this.portalFlashMesh.scale.setScalar(1.0 + (1 - fp) * 1.45);
      this.portalFlashMat.opacity = fp * 0.92;
    }
    // 3. Animate Travelling Floor Conduit Pulses & ZZZ/HSR Material Podiums
    const elapsedAnim = isFusing ? this.fusionAnimDur - this.fusionAnimTimer : 0;
    for (let i = 0; i < this.materialSlots.length; i++) {
      const slot = this.materialSlots[i];
      if (!slot.podium.group.visible) continue;
      this.stepPodiumAura(slot.podium, elapsed + i * 0.65);
      slot.holoGridRing.rotation.z = elapsed * 1.4;
      const flowSpeed = isFusing ? 3.6 : this.allRequirementsReady ? 1.7 : slot.ready ? 1.0 : 0.35;
      for (let p = 0; p < slot.conduitPulseMeshes.length; p++) {
        const pulseMesh = slot.conduitPulseMeshes[p];
        const phase = ((elapsed * flowSpeed + p * 0.5 + i * 0.25) % 1 + 1) % 1;
        pulseMesh.position.z = 0.45 - phase * 0.9;
        pulseMesh.visible = slot.ready || this.allRequirementsReady || isFusing;
      }
      if (slot.sprite) {
        if (isFusing) {
          if (elapsedAnim < 0.38) {
            const lp = elapsedAnim / 0.38;
            const ease = lp * (2 - lp);
            slot.sprite.group.position.set(0, 0.285 + ease * 1.38, 0);
            slot.sprite.group.scale.setScalar(1 + ease * 0.12);
          } else if (elapsedAnim < 0.76) {
            const sp = (elapsedAnim - 0.38) / 0.38;
            slot.sprite.group.position.set(0, 1.66 + sp * 0.45, -sp * 0.85);
            slot.sprite.group.scale.setScalar(Math.max(0.01, 1.12 * (1 - sp)));
          } else {
            slot.sprite.group.scale.setScalar(0.001);
          }
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
      this.revealPopTimer > 0 ? 1 + Math.sin((this.revealPopTimer / 0.48) * Math.PI) * 0.26 : 1;
    if (this.revealPopTimer > 0) this.revealPopTimer = Math.max(0, this.revealPopTimer - dt);
    if (isFusing && elapsedAnim >= 0.82) {
      const descendP = Math.min(1, (elapsedAnim - 0.82) / 0.36);
      const easeOut = 1 - Math.pow(1 - descendP, 3);
      this.resultMount.position.y = THREE.MathUtils.lerp(3.55, DAIS_TOP_Y + 0.04, easeOut);
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
      orb.mesh.scale.setScalar(1.3 - p * 0.55);
      orb.mat.opacity = 1 - p * 0.3;
    }
    // 8. Step 3-Phase Fusion Climax Sequence
    if (this.fusionAnimTimer > 0) {
      this.fusionAnimTimer = Math.max(0, this.fusionAnimTimer - dt);
      const curAnim = this.fusionAnimDur - this.fusionAnimTimer;
      // Phase 2 Climax (0.68s): Synchro Portal flash + discharge stream from Portal to Grand Apex Podium
      if (!this.portalBurstFired && curAnim >= 0.68) {
        this.portalBurstFired = true;
        this.portalFlashTimer = 0.35;
        this.portalFlashMesh.visible = true;
        for (let k = 0; k < 5; k++) {
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
            age: -k * 0.03,
            dur: 0.22,
            arcH: 0.55,
          });
        }
      }
      // Phase 3 Climax (0.85s): Result unit descends onto Grand Apex Podium + 5-layer Shatter Nova
      if (!this.fusionBurstFired && curAnim >= 0.85) {
        this.fusionBurstFired = true;
        this.resultMount.visible = true;
        this.revealPopTimer = 0.48;
        this.resultSprite?.triggerShowcase(1.25);
        this.impactFx.spawnShatter({
          targetX: 0,
          targetY: DAIS_TOP_Y + 1.05,
          targetZ: STAGE_CENTER_Z,
          oreColor: this.fusionAccentHex,
          secondaryColor: this.fusionGlowHex,
          isMeteor: true,
          camera,
        });
      }
      if (this.fusionAnimTimer <= 0) {
        this.resultMount.visible = true;
        for (const slot of this.materialSlots) {
          if (slot.sprite) {
            slot.sprite.group.position.set(0, 0.285, 0);
            slot.sprite.group.scale.setScalar(1);
          }
        }
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
