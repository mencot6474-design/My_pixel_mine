import * as THREE from 'three';
import {
  createCyberLanternBollardFinial,
  disposeCyberProp,
} from './CyberProps3D';
import { createChamferPadGeometry } from './FusionWorldPodium3D';
import { enableShadows } from './MeshHelpers3D';

export interface FloatingIslandNode {
  group: THREE.Group;
  baseY: number;
  phase: number;
  bobSpeed: number;
}

export interface FusionArenaBuildCtx {
  group: THREE.Group;
  armorDarkMat: THREE.MeshStandardMaterial;
  armorSteelMat: THREE.MeshStandardMaterial;
  brightSteelMat: THREE.MeshStandardMaterial;
  deckTrimCyanMat: THREE.MeshStandardMaterial;
  deckTrimMagentaMat: THREE.MeshStandardMaterial;
  stageNeonMat: THREE.MeshStandardMaterial;
  ownedGeos: THREE.BufferGeometry[];
  ownedMats: THREE.Material[];
  customDisposers: Array<() => void>;
}

const STAGE_CENTER_Z = -6.45;
const STAGE_DECK_Y = 0.76;

/**
 * Builds an Aperture × Herta Space Station inspired 3-Tier Concentric Circular Containment Dais
 * positioned at the rear (z = -6.45m) directly in front of the Blast Door, sized for the 2x APEX Tube:
 * - Tier 1..3 concentric stepped circular hydraulic platforms (r = 4.15m -> 3.55m -> 3.00m)
 * - Recessed neon perimeter rings + radial front curved step arc
 * - Grounded rear power/coolant manifold connecting flush into the Rear Blast Door bulkhead
 */
export function buildElevatedShowcaseStage(ctx: FusionArenaBuildCtx): void {
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0, STAGE_CENTER_Z);
  ctx.group.add(stageGroup);

  const tier1Geo = new THREE.CylinderGeometry(3.92, 4.15, 0.24, 40);
  const tier2Geo = new THREE.CylinderGeometry(3.36, 3.55, 0.26, 40);
  const tier3Geo = new THREE.CylinderGeometry(2.84, 3.0, 0.26, 40);
  const rim2Geo = new THREE.TorusGeometry(3.42, 0.04, 8, 52);
  const rim3Geo = new THREE.TorusGeometry(2.9, 0.04, 8, 52);
  const step2ArcGeo = new THREE.CylinderGeometry(
    3.72,
    3.82,
    0.21,
    20,
    1,
    false,
    -Math.PI * 0.2,
    Math.PI * 0.4
  );
  const step1ArcGeo = new THREE.CylinderGeometry(
    4.32,
    4.42,
    0.19,
    22,
    1,
    false,
    -Math.PI * 0.24,
    Math.PI * 0.48
  );
  const rearBridgeGeo = createChamferPadGeometry(2.8, 0.19, 1.4, 0.22, 0.016);
  const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.45, 8);
  pipeGeo.rotateX(Math.PI / 2);
  ctx.ownedGeos.push(
    tier1Geo,
    tier2Geo,
    tier3Geo,
    rim2Geo,
    rim3Geo,
    step2ArcGeo,
    step1ArcGeo,
    rearBridgeGeo,
    pipeGeo
  );

  const tier1 = new THREE.Mesh(tier1Geo, ctx.armorDarkMat);
  tier1.position.y = 0.12;
  enableShadows(tier1, true, true);
  const tier2 = new THREE.Mesh(tier2Geo, ctx.brightSteelMat);
  tier2.position.y = 0.372;
  enableShadows(tier2, true, true);
  const tier3 = new THREE.Mesh(tier3Geo, ctx.armorSteelMat);
  tier3.position.y = 0.634;
  enableShadows(tier3, true, true);

  const rim2 = new THREE.Mesh(rim2Geo, ctx.stageNeonMat);
  rim2.rotation.x = Math.PI / 2;
  rim2.position.y = 0.495;
  const rim3 = new THREE.Mesh(rim3Geo, ctx.stageNeonMat);
  rim3.rotation.x = Math.PI / 2;
  rim3.position.y = STAGE_DECK_Y - 0.005;

  // Offset step top heights cleanly below tier1/tier2 tops so coplanar z-fighting never occurs
  const step1Arc = new THREE.Mesh(step1ArcGeo, ctx.brightSteelMat);
  step1Arc.position.y = 0.095;
  enableShadows(step1Arc, true, true);
  const step2Arc = new THREE.Mesh(step2ArcGeo, ctx.armorSteelMat);
  step2Arc.position.y = 0.345;
  enableShadows(step2Arc, true, true);

  // Rear coolant manifold anchoring the Circular Dais flush into the Blast Door bulkhead (z = -6.45 -> -10.89)
  const rearBridge = new THREE.Mesh(rearBridgeGeo, ctx.armorDarkMat);
  rearBridge.position.set(0, 0.0, -3.95);
  enableShadows(rearBridge, true, true);
  stageGroup.add(tier1, tier2, tier3, rim2, rim3, step1Arc, step2Arc, rearBridge);

  for (const px of [-0.72, 0.72]) {
    const pipe = new THREE.Mesh(pipeGeo, ctx.brightSteelMat);
    pipe.position.set(px, 0.32, -3.95);
    enableShadows(pipe, true, true);
    stageGroup.add(pipe);
  }
}

export function buildPerimeterTechPylons(ctx: FusionArenaBuildCtx): void {
  // Low-profile front cutaway threshold corner bollards only
  for (const sx of [-1, 1]) {
    const bollard = createCyberLanternBollardFinial({
      frameMat: ctx.armorDarkMat,
      steelMat: ctx.brightSteelMat,
      coreMat: ctx.deckTrimCyanMat,
      scale: 1.35,
    });
    bollard.position.set(sx * 9.35, 0.04, 4.45);
    ctx.customDisposers.push(() => disposeCyberProp(bollard));
    ctx.group.add(bollard);
  }
}
