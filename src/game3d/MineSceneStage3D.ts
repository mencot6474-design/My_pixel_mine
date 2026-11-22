import * as THREE from 'three';
import { createProceduralTreasureChest, ProceduralChestHandle } from './ChestVaultStation3D';
import { mergeStaticMeshesByMaterial } from './MeshHelpers3D';
import type { MineEnvironment3D } from './MineEnvironment3D';
import { type MineWorldPalette, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { PlotPedestal3D } from './PlotPedestal3D';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import { getDefaultOrbitPitchForMode, type SceneMode } from './MineScene3D';
import type { FusionWorld3D } from './FusionWorld3D';
import type { MineInputState } from './MineSceneInput';

const tmpCamPos = new THREE.Vector3();
const tmpLookTarget = new THREE.Vector3();

export function buildMineStageAndChest(ctx: {
  palette: MineWorldPalette;
  scene: THREE.Scene;
  envGroup: THREE.Group;
  pedestals: PlotPedestal3D[];
  clickableMeshes: THREE.Object3D[];
  crateGroup: THREE.Group;
}): {
  stageNeonMat: THREE.MeshStandardMaterial;
  stageHoloMat: THREE.MeshBasicMaterial;
  chestVisual: ProceduralChestHandle;
} {
  const { palette } = ctx;
    // Cyber-Holographic Rear Stage Platform for "My Chibi" Showcase
    const stageNeonMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.15,
      roughness: 0.2,
      metalness: 0.28,
      flatShading: true,
    });
    const stageHoloMat = new THREE.MeshBasicMaterial({
      color: palette.crystalColor,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const stageBase = new THREE.Mesh(
      new THREE.BoxGeometry(17.2, 0.16, 3.64),
      new THREE.MeshStandardMaterial({
        color: 0x161f30,
        roughness: 0.62,
        metalness: 0.28,
        flatShading: true,
      })
    );
    stageBase.position.set(0, 0.08, -4.85);
    stageBase.receiveShadow = true;
    stageBase.castShadow = true;

    const rackDeck = new THREE.Mesh(
      new THREE.BoxGeometry(16.8, 0.12, 3.34),
      new THREE.MeshStandardMaterial({
        color: 0x223047,
        roughness: 0.44,
        metalness: 0.36,
        flatShading: true,
      })
    );
    rackDeck.position.set(0, 0.21, -4.85);
    rackDeck.receiveShadow = true;
    rackDeck.castShadow = true;
    const stageStaticGroup = new THREE.Group();
    stageStaticGroup.add(stageBase, rackDeck);
    ctx.envGroup.add(stageStaticGroup);

    // Clean Rear Stage Holo Underglow Strip + Sculpted Steel Bay Dividers Between Plots (zero pedestal overlap)
    const holoRunwayStrip = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 0.48), stageHoloMat);
    holoRunwayStrip.rotation.x = -Math.PI / 2;
    holoRunwayStrip.position.set(0, 0.273, -5.96);
    ctx.envGroup.add(holoRunwayStrip);

    const bayDivMat = new THREE.MeshStandardMaterial({
      color: 0x131b2b,
      roughness: 0.45,
      metalness: 0.5,
      flatShading: true,
    });
    const bayDivGeo = new THREE.BoxGeometry(0.09, 0.06, 2.58);
    const bayDivLedGeo = new THREE.BoxGeometry(0.03, 0.025, 2.4);
    for (let i = 0; i < STAGE_PEDESTAL_COUNT - 1; i++) {
      const divX = (i - (STAGE_PEDESTAL_COUNT - 2) / 2) * 3.22;
      const divBar = new THREE.Mesh(bayDivGeo, bayDivMat);
      divBar.position.set(divX, 0.298, -4.58);
      divBar.castShadow = true;
      divBar.receiveShadow = true;
      const divLed = new THREE.Mesh(bayDivLedGeo, stageNeonMat);
      divLed.position.set(divX, 0.33, -4.58);
      stageStaticGroup.add(divBar, divLed);
    }

    const rearBusConduit = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.08, 0.18), bayDivMat);
    rearBusConduit.position.set(0, 0.305, -5.92);
    rearBusConduit.castShadow = true;
    stageStaticGroup.add(rearBusConduit);

    for (const sx of [-1, 1]) {
      const rackFrontTrim = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.06, 0.1), stageNeonMat);
      rackFrontTrim.position.set(sx * 4.88, 0.26, -3.22);
      stageStaticGroup.add(rackFrontTrim);
    }

    const stageRearTrim = new THREE.Mesh(new THREE.BoxGeometry(16.86, 0.06, 0.09), stageNeonMat);
    stageRearTrim.position.set(0, 0.26, -6.54);
    stageStaticGroup.add(stageRearTrim);

    // Futuristic Steel Stairwell & Illuminated Treads Descending into Quarry Pit
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0x1b263b,
      roughness: 0.5,
      metalness: 0.36,
      flatShading: true,
    });
    const copingMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d6b,
      roughness: 0.36,
      metalness: 0.44,
      flatShading: true,
    });
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.96, 1.36), cheekMat);
      cheek.position.set(sx * 1.32, -0.2, -2.52);
      cheek.castShadow = true;
      cheek.receiveShadow = true;

      const cheekCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 1.4), copingMat);
      cheekCap.position.set(sx * 1.32, 0.31, -2.52);
      cheekCap.castShadow = true;

      const cheekLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 1.38), stageNeonMat);
      cheekLed.position.set(sx * 1.32, 0.36, -2.52);
      stageStaticGroup.add(cheek, cheekCap, cheekLed);
    }

    const stairStepCount = 4;
    for (let s = 0; s < stairStepCount; s++) {
      const t = (s + 0.5) / stairStepCount;
      const stepY = 0.2 - t * 0.84;
      const stepZ = -3.14 + t * 1.24;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.18, 0.34), cheekMat);
      stepMesh.position.set(0, stepY, stepZ);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;

      const stepLed = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.03, 0.05), stageNeonMat);
      stepLed.position.set(0, stepY + 0.09, stepZ + 0.14);
      stageStaticGroup.add(stepMesh, stepLed);
    }
    mergeStaticMeshesByMaterial(stageStaticGroup);

    // 5 Cyber-Holographic Plot Pedestals Centered Cleanly Away From Side HUD Bars (spacing 3.22m for +50% podiums)
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const px = (i - (STAGE_PEDESTAL_COUNT - 1) / 2) * 3.22;
      const pz = -4.58;
      const ped = new PlotPedestal3D(i, px, pz);
      ped.group.position.y = 0.27;
      ctx.pedestals.push(ped);
      ctx.scene.add(ped.group);
      ctx.clickableMeshes.push(ped.hitMesh);
    }

    // Right Wing Cyber Vault Container on Elevated Plasma Refinery Dais (aligned to rail Z = 0.15)
    ctx.crateGroup.position.set(8.45, 0.48, 0.15);
    const chestVisual = createProceduralTreasureChest({
      scale: 1.08,
      woodColor: 0x1e293b,
      ironColor: 0x3b4d6b,
      trimColor: 0x7084a3,
      gemColor: palette.crystalColor,
    });
    chestVisual.group.rotation.y = -Math.PI / 2;
    ctx.crateGroup.add(chestVisual.group);

    const crateHit = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.3, 2.6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    crateHit.position.y = 0.72;
    crateHit.userData = { kind: 'chest' };
    ctx.crateGroup.add(crateHit);

    ctx.scene.add(ctx.crateGroup);
    ctx.clickableMeshes.push(crateHit);
  return { stageNeonMat, stageHoloMat, chestVisual };
}

export function applyMineWeatherAtmosphere(ctx: {
  activeWeatherId: WeatherId;
  mode: SceneMode;
  env: MineEnvironment3D;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  scene: THREE.Scene;
}): void {
    const weather = getWeatherById(ctx.activeWeatherId);
    ctx.env.setWeatherSky(weather.id, weather.cloudHex);
    const isShop = ctx.mode === 'shop';
    const isFusion = ctx.mode === 'fusion';
    const isTowerScene = ctx.mode === 'tower';
    const isOmegaScene = ctx.mode === 'omega';
    ctx.hemiLight.color.set(
      isTowerScene ? 0xe0f2fe : isOmegaScene ? 0xffedd5 : isFusion ? 0xf8fafc : weather.hemiTintHex
    );
    ctx.hemiLight.intensity = isTowerScene
      ? 1.68
      : isOmegaScene
        ? 1.74
        : isFusion
          ? 1.88
          : isShop
            ? Math.max(weather.hemiIntensity, 1.24)
            : Math.max(weather.hemiIntensity, 1.18);
    ctx.sunLight.intensity = isTowerScene
      ? 2.18
      : isOmegaScene
        ? 2.28
        : isFusion
          ? 2.24
          : isShop
            ? Math.max(weather.sunIntensity, 1.62)
            : Math.max(weather.sunIntensity, 1.55);
    ctx.rimLight.color.set(
      isTowerScene ? 0xbae6fd : isOmegaScene ? 0xfb923c : isShop || isFusion ? 0x38bdf8 : weather.rimTintHex
    );

    if (ctx.mode !== 'mine' && !isShop) return;
    const fogColor = new THREE.Color(weather.fogTintHex);
    fogColor.lerp(new THREE.Color(0x0b162b), isShop ? 0.56 : 0.28);
    ctx.scene.background = fogColor;
    // Softly blend distant terrain border into the sky shader's horizon mist band
    ctx.scene.fog = isShop
      ? new THREE.Fog(fogColor, 50, 108)
      : new THREE.Fog(fogColor, 30, 78);
}

export function stepMineSceneCamera(ctx: {
  dtSec: number;
  elapsed: number;
  mode: SceneMode;
  camera: THREE.PerspectiveCamera;
  currentLookAt: THREE.Vector3;
  baseCamPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
  focusedPlotIndex: number | null;
  pedestals: PlotPedestal3D[];
  crateGroup: THREE.Group;
  tutorialFocusChest: boolean;
  tutorialFocusSellShop: boolean;
  fusionWorld: FusionWorld3D | null;
  inputState: MineInputState;
  state: { orbitYaw: number; orbitPitch: number; camRadius: number; tapShakeIntensity: number };
}): void {
  const dtSec = ctx.dtSec;
    const damp = 1 - Math.exp(-dtSec * 16);
    const fusionCam = ctx.mode === 'fusion' ? (ctx.fusionWorld?.getCameraFocusState() ?? null) : null;
    if (fusionCam?.active) {
      const cineDamp = 1 - Math.exp(-dtSec * 6.5);
      ctx.camera.position.lerp(fusionCam.camPos, cineDamp);
      ctx.currentLookAt.lerp(fusionCam.lookAt, cineDamp);
      ctx.camera.lookAt(ctx.currentLookAt);
    } else if (ctx.focusedPlotIndex !== null && ctx.pedestals[ctx.focusedPlotIndex]) {
      const pPos = ctx.pedestals[ctx.focusedPlotIndex].group.position;
      tmpCamPos.set(pPos.x, pPos.y + 2.15, pPos.z + 5.35);
      tmpLookTarget.set(pPos.x, pPos.y + 1.55, pPos.z);
      ctx.camera.position.lerp(tmpCamPos, damp);
      ctx.currentLookAt.lerp(tmpLookTarget, damp);
      ctx.camera.lookAt(ctx.currentLookAt);
    } else if (ctx.tutorialFocusChest && ctx.mode === 'mine') {
      const cPos = ctx.crateGroup.position;
      tmpCamPos.set(cPos.x + 0.8, cPos.y + 4.3, cPos.z + 7.2);
      tmpLookTarget.set(cPos.x, cPos.y + 0.65, cPos.z);
      ctx.camera.position.lerp(tmpCamPos, damp);
      ctx.currentLookAt.lerp(tmpLookTarget, damp);
      ctx.camera.lookAt(ctx.currentLookAt);
    } else if (ctx.tutorialFocusSellShop && ctx.mode === 'shop') {
      tmpCamPos.set(-4.6, 5.2, 11.4);
      tmpLookTarget.set(-6.95, 2.3, 2.8);
      ctx.camera.position.lerp(tmpCamPos, damp);
      ctx.currentLookAt.lerp(tmpLookTarget, damp);
      ctx.camera.lookAt(ctx.currentLookAt);
    } else {
      if (ctx.inputState.cameraLocked) {
        ctx.inputState.targetOrbitYaw = 0;
        ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode(ctx.mode);
      }
      ctx.state.orbitYaw += (ctx.inputState.targetOrbitYaw - ctx.state.orbitYaw) * damp;
      ctx.state.orbitPitch += (ctx.inputState.targetOrbitPitch - ctx.state.orbitPitch) * damp;
      ctx.state.camRadius += (ctx.inputState.targetCamRadius - ctx.state.camRadius) * damp;
      const camY = (ctx.baseCamPos.y + ctx.state.orbitPitch * 7) * (ctx.state.camRadius / 16.5);

      ctx.currentLookAt.lerp(ctx.lookAtPos, damp);
      ctx.camera.position.set(
        ctx.currentLookAt.x + Math.sin(ctx.state.orbitYaw) * ctx.state.camRadius,
        camY,
        ctx.currentLookAt.z + Math.cos(ctx.state.orbitYaw) * ctx.state.camRadius
      );
      if ((ctx.mode === 'mine' || ctx.mode === 'omega') && ctx.state.tapShakeIntensity > 0.001) {
        const sx = (Math.sin(ctx.elapsed * 95) * 0.7 + Math.cos(ctx.elapsed * 143) * 0.3) * ctx.state.tapShakeIntensity;
        const sy = Math.cos(ctx.elapsed * 117) * ctx.state.tapShakeIntensity * 0.75;
        ctx.camera.position.x += sx;
        ctx.camera.position.y += sy;
        ctx.state.tapShakeIntensity = Math.max(0, ctx.state.tapShakeIntensity - dtSec * 1.4);
      }
      ctx.camera.lookAt(ctx.currentLookAt);
    }

}
