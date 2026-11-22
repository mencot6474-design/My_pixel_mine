import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createProceduralTreasureChest, ProceduralChestHandle } from './ChestVaultStation3D';
import { configureSceneTextureSharpness, createChamferSlabGeometry, mergeStaticMeshesByMaterial } from './MeshHelpers3D';
import { ImpactFrameShader } from './MeshFx3D';
import type { MineEnvironment3D } from './MineEnvironment3D';
import { type MineWorldPalette, type OreVariantKey, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { PlotPedestal3D } from './PlotPedestal3D';
import { GRAPHICS_PRESETS, type GraphicsQuality } from '../game/GameSettings';
import { type OverclockTier } from '../game/OverclockDomain';
import { type PitEventKind } from '../game/PitEventsDomain';
import { getWeatherById, type WeatherId } from '../game/WeatherData';
import type { FusionWorld3D } from './FusionWorld3D';
import type { MineInputState } from './MineSceneInput';
import type { OmegaArena3D, OmegaTargetScreenAnchor } from './OmegaArena3D';
import type { OrePit3D } from './OrePit3D';
import type { PlotAttackController3D } from './PlotAttackController3D';
import type {
  AltarPedestalAnchor,
  ShopChibiBubbleAnchor,
  ShopStationAnchor,
  ShopStationId,
  ShopWorld3D,
} from './ShopWorld3D';
import type { TowerArena3D, TowerOreBarScreen } from './TowerArena3D';
import type { WeatherFx3D } from './WeatherFx3D';

export type SceneMode = 'mine' | 'shop' | 'altar' | 'fusion' | 'tower' | 'omega';

export interface PlotAnchorScreen {
  slotIndex: number;
  labelX: number;
  labelY: number;
  btnX: number;
  btnY: number;
  visible: boolean;
}

export interface OreHpScreen {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  variantKey: OreVariantKey;
  isMeteor?: boolean;
  meteorWeatherId?: WeatherId;
  pitEventKind?: PitEventKind;
}

export interface SweetSpotScreen {
  nodeId: number;
  x: number;
  y: number;
  progress: number;
  inWindow: boolean;
  isMeteor: boolean;
  isTowerShield?: boolean;
}

export interface MineSceneCallbacks {
  onOreBroken?: (
    variantKey: OreVariantKey,
    meteorWeatherId?: WeatherId,
    pitEventKind?: PitEventKind,
    screenPos?: { x: number; y: number }
  ) => void;
  onOreDamage?: (
    dmg: number,
    screenX: number,
    screenY: number,
    isClick: boolean,
    isCrit?: boolean,
    pitEventKind?: PitEventKind,
    isMeteor?: boolean,
    isPerfect?: boolean
  ) => void;
  onSweetSpot?: (spot: SweetSpotScreen | null) => void;
  onHoldMineChange?: (active: boolean) => void;
  onChestClick?: () => void;
  onPedestalClick?: (slotIndex: number) => void;
  onPlotAnchors?: (anchors: PlotAnchorScreen[]) => void;
  onChestAnchor?: (anchor: { x: number; y: number; visible: boolean }) => void;
  onOreBars?: (bars: OreHpScreen[]) => void;
  onShopStationClick?: (station: ShopStationId) => void;
  onShopAnchors?: (anchors: ShopStationAnchor[]) => void;
  onShopChibiBubbles?: (bubbles: ShopChibiBubbleAnchor[]) => void;
  onAltarAnchors?: (anchors: AltarPedestalAnchor[]) => void;
  onTowerMonolithClick?: () => { dmg: number } | void;
  onTowerTargetClick?: (
    targetOreIndex: number | null,
    opts?: { isShieldBreak?: boolean }
  ) => { dmg: number; broken?: boolean; isCrit?: boolean; shieldBroken?: boolean; shieldShaved?: boolean } | void;
  onTowerFighterStrike?: (
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number
  ) => { dmg: number; broken?: boolean; isCrit?: boolean } | void;
  onTowerOreBars?: (bars: TowerOreBarScreen[]) => void;
  onOmegaTargetClick?: (targetId: string) => void;
  onOmegaBossClick?: () => void;
  onOmegaEntranceSlam?: () => void;
  onOmegaFighterStrike?: (slotIndex: number, attackInterval: number) => { dmg: number; isCrit?: boolean } | void;
  onOmegaArenaOverlay?: (data: { bossHead: { x: number; y: number } | null; targets: OmegaTargetScreenAnchor[] } | null) => void;
  onFpsUpdate?: (fps: number) => void;
}

/** Returns the resting camera pitch angle for each scene mode. */
export function getDefaultOrbitPitchForMode(mode: SceneMode): number {
  switch (mode) {
    case 'shop':
      return 0.02;
    case 'altar':
      return -0.18;
    case 'fusion':
      return -0.18;
    case 'tower':
      return -0.34;
    case 'omega':
      return -0.32;
    default:
      return -0.22;
  }
}

/** Clamps and applies pointer orbit drag deltas unless camera orbit is locked. */
export function applyCameraOrbitDrag(opts: {
  cameraLocked: boolean;
  yaw: number;
  pitch: number;
  dx: number;
  dy: number;
  defaultYaw?: number;
  defaultPitch?: number;
}): { yaw: number; pitch: number } {
  if (opts.cameraLocked) {
    return { yaw: opts.defaultYaw ?? 0, pitch: opts.defaultPitch ?? 0 };
  }
  return {
    yaw: Math.max(-1.35, Math.min(1.35, opts.yaw - opts.dx * 0.005)),
    pitch: Math.max(-0.45, Math.min(0.42, opts.pitch + opts.dy * 0.004)),
  };
}

/** Clamps camera zoom radius to the mode's safe orbit bounds. */
export function clampCameraZoomRadius(radius: number, mode: SceneMode): number {
  const maxRad = mode === 'shop' ? 38 : mode === 'fusion' ? 34 : 28;
  return Math.max(9, Math.min(maxRad, radius));
}

const tmpCamPos = new THREE.Vector3();
const tmpLookTarget = new THREE.Vector3();

export interface CrescentSlotTransform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visualYaw: number;
}

/** 3-tier curved crescent amphitheater slots framing the 5 Chibi showcase podiums. */
export const STAGE_CRESCENT_SLOTS: readonly CrescentSlotTransform[] = [
  { x: -7.05, y: 0.28, z: -4.35, visualYaw: 0.46 },
  { x: -3.6, y: 0.48, z: -5.45, visualYaw: 0.24 },
  { x: 0, y: 0.72, z: -6.05, visualYaw: 0 },
  { x: 3.6, y: 0.48, z: -5.45, visualYaw: -0.24 },
  { x: 7.05, y: 0.28, z: -4.35, visualYaw: -0.46 },
] as const;

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
  // Cyber-Holographic Crescent Amphitheater Stage for Chibi Skill Showcase
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
  const tierDarkMat = new THREE.MeshStandardMaterial({
    color: 0x161f30,
    roughness: 0.58,
    metalness: 0.3,
    flatShading: true,
  });
  const tierDeckMat = new THREE.MeshStandardMaterial({
    color: 0x223047,
    roughness: 0.44,
    metalness: 0.36,
    flatShading: true,
  });
  const bayDivMat = new THREE.MeshStandardMaterial({
    color: 0x131b2b,
    roughness: 0.45,
    metalness: 0.5,
    flatShading: true,
  });

  const stageStaticGroup = new THREE.Group();
  // Stepped Crescent Plinths: Outer Wing (y=0.28), Mid Flank (y=0.48), Ace Centerpiece (y=0.72)
  const plinthSpecs: ReadonlyArray<{
    x: number;
    y: number;
    z: number;
    w: number;
    d: number;
    yaw: number;
  }> = [
    { x: 0, y: 0.72, z: -6.05, w: 3.7, d: 3.1, yaw: 0 },
    { x: -3.6, y: 0.48, z: -5.45, w: 3.45, d: 2.95, yaw: 0.24 },
    { x: 3.6, y: 0.48, z: -5.45, w: 3.45, d: 2.95, yaw: -0.24 },
    { x: -7.05, y: 0.28, z: -4.35, w: 3.3, d: 2.85, yaw: 0.46 },
    { x: 7.05, y: 0.28, z: -4.35, w: 3.3, d: 2.85, yaw: -0.46 },
  ];
  for (const spec of plinthSpecs) {
    const tierH = spec.y + 0.08;
    const plinth = new THREE.Mesh(
      createChamferSlabGeometry(spec.w, tierH, spec.d, 0.38, 0.02),
      tierDarkMat
    );
    plinth.position.set(spec.x, -0.08, spec.z);
    plinth.rotation.y = spec.yaw;
    plinth.receiveShadow = true;
    plinth.castShadow = true;

    const deckPlate = new THREE.Mesh(
      createChamferSlabGeometry(spec.w - 0.28, 0.06, spec.d - 0.28, 0.3, 0.012),
      tierDeckMat
    );
    deckPlate.position.set(spec.x, spec.y - 0.06, spec.z);
    deckPlate.rotation.y = spec.yaw;
    deckPlate.receiveShadow = true;

    const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(spec.w - 0.75, 0.045, 0.07), stageNeonMat);
    const fwdDist = spec.d * 0.5 - 0.14;
    frontTrim.position.set(
      spec.x + Math.sin(spec.yaw) * fwdDist,
      spec.y + 0.015,
      spec.z + Math.cos(spec.yaw) * fwdDist
    );
    frontTrim.rotation.y = spec.yaw;
    stageStaticGroup.add(plinth, deckPlate, frontTrim);
  }

  // Rear Crescent Conduits & Angled Bay Dividers Between Podiums
  for (let i = 0; i < STAGE_CRESCENT_SLOTS.length - 1; i++) {
    const a = STAGE_CRESCENT_SLOTS[i];
    const b = STAGE_CRESCENT_SLOTS[i + 1];
    const mx = (a.x + b.x) * 0.5;
    const my = Math.min(a.y, b.y) + 0.04;
    const mz = (a.z + b.z) * 0.5;
    const yaw = (a.visualYaw + b.visualYaw) * 0.5;
    const divBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 2.2), bayDivMat);
    divBar.position.set(mx, my, mz);
    divBar.rotation.y = yaw;
    divBar.castShadow = true;
    const divLed = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 2.05), stageNeonMat);
    divLed.position.set(mx, my + 0.04, mz);
    divLed.rotation.y = yaw;
    stageStaticGroup.add(divBar, divLed);
  }

  // Central Main Energy Conduit Channel Replacing Legacy Quarry Stairwell (z = -4.60 -> -2.96)
  const conduitRampLen = 1.82;
  const conduitSlope = 0.24;
  const conduitFrame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, conduitRampLen), tierDarkMat);
  conduitFrame.position.set(0, 0.36, -3.78);
  conduitFrame.rotation.x = conduitSlope;
  conduitFrame.receiveShadow = true;
  conduitFrame.castShadow = true;
  stageStaticGroup.add(conduitFrame);

  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, conduitRampLen), tierDeckMat);
    rail.position.set(sx * 0.82, 0.42, -3.78);
    rail.rotation.x = conduitSlope;
    rail.castShadow = true;
    const railLed = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, conduitRampLen - 0.08), stageNeonMat);
    railLed.position.set(sx * 0.82, 0.52, -3.78);
    railLed.rotation.x = conduitSlope;
    stageStaticGroup.add(rail, railLed);
  }

  const conduitCore = new THREE.Mesh(new THREE.PlaneGeometry(1.12, conduitRampLen - 0.1), stageHoloMat);
  conduitCore.position.set(0, 0.445, -3.78);
  conduitCore.rotation.x = -Math.PI / 2 + conduitSlope;
  ctx.envGroup.add(conduitCore);

  mergeStaticMeshesByMaterial(stageStaticGroup);
  ctx.envGroup.add(stageStaticGroup);

  // 5 Stepped Crescent Plot Pedestals (visualYaw isolates podium rotation from ChibiSprite3D blitz axes)
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const slot = STAGE_CRESCENT_SLOTS[i] ?? {
      x: (i - (STAGE_PEDESTAL_COUNT - 1) / 2) * 3.22,
      y: 0.27,
      z: -4.58,
      visualYaw: 0,
    };
    const ped = new PlotPedestal3D(i, slot.x, slot.z, slot.visualYaw);
    ped.group.position.y = slot.y;
    ctx.pedestals.push(ped);
    ctx.scene.add(ped.group);
    ctx.clickableMeshes.push(ped.hitMesh);
  }

  // Right Wing Cyber Vault Container on Vault Core Dais (aligned to Z = 0.15, angled toward center)
  ctx.crateGroup.position.set(8.45, 0.48, 0.15);
  const chestVisual = createProceduralTreasureChest({
    scale: 1.08,
    woodColor: 0x1e293b,
    ironColor: 0x3b4d6b,
    trimColor: 0x7084a3,
    gemColor: palette.crystalColor,
  });
  chestVisual.group.rotation.y = -Math.PI / 2 - 0.18;
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

/** Initializes WebGLRenderer, EffectComposer passes, and primary scene lights. */
export function createMineRendererAndLights(opts: {
  mountEl: HTMLElement;
  scene: THREE.Scene;
  palette: MineWorldPalette;
  graphicsQuality: GraphicsQuality;
  baseCamPos: THREE.Vector3;
  lookAtPos: THREE.Vector3;
}): {
  viewportWidth: number;
  viewportHeight: number;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  impactPass: ShaderPass;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
} {
  opts.scene.background = new THREE.Color(opts.palette.skyBottom);
  opts.scene.fog = new THREE.Fog(opts.palette.fogColor, 42, 105);

  const w = Math.max(1, opts.mountEl.clientWidth);
  const h = Math.max(1, opts.mountEl.clientHeight);
  const camera = new THREE.PerspectiveCamera(42, w / h, 1.0, 220);
  camera.position.copy(opts.baseCamPos);
  camera.lookAt(opts.lookAtPos);

  const isMobileTouch =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobileTouch, powerPreference: 'high-performance' });
  const initialPreset = GRAPHICS_PRESETS[opts.graphicsQuality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, initialPreset.maxPixelRatio));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = initialPreset.shadowsEnabled;
  renderer.shadowMap.type = opts.graphicsQuality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  opts.mountEl.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(opts.scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.12, 0.22, 0.9);
  composer.addPass(bloomPass);
  const impactPass = new ShaderPass(ImpactFrameShader);
  composer.addPass(impactPass);
  composer.addPass(new OutputPass());

  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b4f6e, 1.18);
  opts.scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
  sunLight.position.set(11, 18, 12);
  sunLight.castShadow = initialPreset.shadowsEnabled;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 48;
  sunLight.shadow.camera.left = -14;
  sunLight.shadow.camera.right = 14;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.bias = -0.0002;
  sunLight.shadow.normalBias = 0.035;
  opts.scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
  rimLight.position.set(-12, 8, -10);
  opts.scene.add(rimLight);

  return {
    viewportWidth: w,
    viewportHeight: h,
    camera,
    renderer,
    composer,
    bloomPass,
    impactPass,
    hemiLight,
    sunLight,
    rimLight,
  };
}

/** Applies scene visibility, atmosphere, and camera orbit defaults for a mode transition. */
export function applyMineSceneModeTransition(ctx: {
  mode: SceneMode;
  modeChanged: boolean;
  overclockTier: 0 | OverclockTier;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  weatherFx: WeatherFx3D;
  env: MineEnvironment3D;
  pit: OrePit3D;
  crateGroup: THREE.Group;
  pedestals: PlotPedestal3D[];
  plotAttackController: PlotAttackController3D;
  shopWorld: ShopWorld3D | null;
  fusionWorld: FusionWorld3D | null;
  towerArena: TowerArena3D | null;
  omegaArena: OmegaArena3D | null;
  ensureShopWorld: () => ShopWorld3D;
  ensureFusionWorld: () => FusionWorld3D;
  ensureTowerArena: () => TowerArena3D;
  ensureOmegaArena: () => OmegaArena3D;
  applyWeatherAtmosphere: () => void;
  syncTowerFighters: () => void;
  inputState: MineInputState;
  lookAtPos: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  baseCamPos: THREE.Vector3;
  setOrbitImmediate: (yaw: number, pitch: number, radius: number) => void;
}): void {
  const { mode } = ctx;
  ctx.weatherFx.setShopMode(mode === 'shop');
  ctx.weatherFx.setFeverTier(mode === 'mine' ? ctx.overclockTier : 0);
  if (mode !== 'mine' && mode !== 'tower') {
    ctx.renderer.domElement.classList.remove('mam-mining-cursor');
  }
  if (mode !== 'altar') ctx.shopWorld?.cancelSpin();
  if (mode !== 'fusion') ctx.fusionWorld?.cancelAnimation();

  if (mode === 'shop' || mode === 'altar') ctx.ensureShopWorld();
  else if (mode === 'fusion') ctx.ensureFusionWorld();
  else if (mode === 'tower') ctx.ensureTowerArena();
  else if (mode === 'omega') ctx.ensureOmegaArena();

  const isMine = mode === 'mine';
  if (ctx.shopWorld) {
    ctx.shopWorld.shopGroup.visible = mode === 'shop';
    ctx.shopWorld.altarGroup.visible = mode === 'altar';
  }
  if (ctx.fusionWorld) ctx.fusionWorld.group.visible = mode === 'fusion';
  if (ctx.towerArena) ctx.towerArena.group.visible = mode === 'tower';
  if (ctx.omegaArena) ctx.omegaArena.group.visible = mode === 'omega';

  ctx.env.group.visible = isMine;
  ctx.env.skyDome.visible = mode === 'mine' || mode === 'shop';
  ctx.pit.group.visible = isMine;
  ctx.crateGroup.visible = isMine;
  ctx.pedestals.forEach((p) => {
    p.group.visible = isMine;
  });
  ctx.plotAttackController.group.visible = isMine;

  if (mode === 'altar') {
    ctx.scene.background = new THREE.Color(0x020208);
    ctx.scene.fog = new THREE.Fog(0x040312, 34, 86);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('altar');
    ctx.inputState.targetCamRadius = 12.2;
    ctx.lookAtPos.set(0, 1.05, -2.4);
  } else if (mode === 'fusion') {
    ctx.scene.background = new THREE.Color(0x0c1422);
    ctx.scene.fog = new THREE.Fog(0x0c1422, 46, 112);
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('fusion');
    ctx.inputState.targetCamRadius = 23.4;
    ctx.lookAtPos.set(0, 2.85, -2.5);
    ctx.applyWeatherAtmosphere();
  } else if (mode === 'tower') {
    ctx.scene.background = new THREE.Color(0x7dd3fc);
    ctx.scene.fog = new THREE.Fog(0xbae6fd, 34, 96);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('tower');
    ctx.inputState.targetCamRadius = 16.4;
    ctx.lookAtPos.set(0, 2.25, -1.6);
    ctx.syncTowerFighters();
    ctx.towerArena?.resetFloorCharge();
  } else if (mode === 'omega') {
    ctx.scene.background = new THREE.Color(0xfda4af);
    ctx.scene.fog = new THREE.Fog(0xfecdd3, 38, 108);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('omega');
    ctx.inputState.targetCamRadius = 16.4;
    ctx.lookAtPos.set(0, 2.1, -1.5);
    ctx.syncTowerFighters();
  } else if (mode === 'shop') {
    const aspect = ctx.camera.aspect || 1;
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('shop');
    ctx.inputState.targetCamRadius = aspect < 0.85 ? 37.6 : aspect < 1.15 ? 33.2 : 30.4;
    ctx.lookAtPos.set(0, 2.95, -2.9);
    ctx.applyWeatherAtmosphere();
  } else {
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('mine');
    ctx.inputState.targetCamRadius = 18.4;
    ctx.lookAtPos.set(0, 0.95, -0.35);
    ctx.applyWeatherAtmosphere();
  }

  if (ctx.modeChanged) {
    const yaw = ctx.inputState.targetOrbitYaw;
    const pitch = ctx.inputState.targetOrbitPitch;
    const radius = ctx.inputState.targetCamRadius;
    ctx.setOrbitImmediate(yaw, pitch, radius);
    ctx.currentLookAt.copy(ctx.lookAtPos);
    const camY = (ctx.baseCamPos.y + pitch * 7) * (radius / 16.5);
    ctx.camera.position.set(
      ctx.lookAtPos.x + Math.sin(yaw) * radius,
      camY,
      ctx.lookAtPos.z + Math.cos(yaw) * radius
    );
    ctx.camera.lookAt(ctx.currentLookAt);
    ctx.camera.updateMatrixWorld();
  }
}

export interface MinePostFxTimers {
  impactFrameCooldown: number;
  arenaDimCooldown: number;
  impactFrameTimer: number;
  speedLinesTimer: number;
  arenaDimTimer: number;
  arenaDimTarget: number;
  arenaDimCurrent: number;
}

/** Advances Sakuga impact-frame, arena dim, and bloom decay post-FX uniforms. */
export function stepMinePostFxAndDim(opts: {
  dtSec: number;
  nowMs: number;
  inMine: boolean;
  timers: MinePostFxTimers;
  impactPass: ShaderPass;
  bloomPass: UnrealBloomPass;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
}): void {
  const { dtSec, nowMs, inMine, timers } = opts;
  opts.impactPass.uniforms.uTime.value = nowMs * 0.001;
  if (timers.impactFrameCooldown > 0) timers.impactFrameCooldown = Math.max(0, timers.impactFrameCooldown - dtSec);
  if (timers.arenaDimCooldown > 0) timers.arenaDimCooldown = Math.max(0, timers.arenaDimCooldown - dtSec);
  if (timers.impactFrameTimer > 0) {
    timers.impactFrameTimer = Math.max(0, timers.impactFrameTimer - dtSec);
    if (timers.impactFrameTimer <= 0) opts.impactPass.uniforms.uImpactStrength.value = 0;
  }
  if (timers.speedLinesTimer > 0) {
    timers.speedLinesTimer = Math.max(0, timers.speedLinesTimer - dtSec);
    if (timers.speedLinesTimer <= 0) opts.impactPass.uniforms.uSpeedLines.value = 0;
  }
  if (timers.arenaDimTimer > 0) {
    timers.arenaDimTimer = Math.max(0, timers.arenaDimTimer - dtSec);
    if (timers.arenaDimTimer <= 0) timers.arenaDimTarget = 0;
  }
  const dimRate = timers.arenaDimTarget > timers.arenaDimCurrent ? 12 : 4.5;
  timers.arenaDimCurrent += (timers.arenaDimTarget - timers.arenaDimCurrent) * Math.min(1, dtSec * dimRate);
  if (inMine && (timers.arenaDimCurrent > 0.005 || timers.arenaDimTarget > 0)) {
    const k = 1 - timers.arenaDimCurrent * 0.52;
    opts.hemiLight.intensity = 1.18 * k;
    opts.sunLight.intensity = 1.85 * k;
  }
  opts.bloomPass.strength += (0.12 - opts.bloomPass.strength) * Math.min(1, dtSec * 7);
}

/** Updates active world/arena entities and catches up backgrounded mine ticks. */
export function stepMineActiveWorldEntities(ctx: {
  mode: SceneMode;
  dtSec: number;
  rawDt: number;
  elapsed: number;
  camera: THREE.PerspectiveCamera;
  env: MineEnvironment3D;
  pit: OrePit3D;
  pedestals: PlotPedestal3D[];
  plotAttackController: PlotAttackController3D;
  weatherFx: WeatherFx3D;
  shopWorld: ShopWorld3D | null;
  fusionWorld: FusionWorld3D | null;
  towerArena: TowerArena3D | null;
  omegaArena: OmegaArena3D | null;
  crateGroup: THREE.Group;
  chestVisual: ProceduralChestHandle;
  inputState: MineInputState;
  onTowerFighterStrike?: (
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number
  ) => { dmg: number; broken?: boolean; isCrit?: boolean } | void;
  onOmegaFighterStrike?: (slotIndex: number, attackInterval: number) => { dmg: number; isCrit?: boolean } | void;
  onOmegaEntranceSlam: () => void;
  onOreBroken?: (
    variantKey: import('./MineWorldPalette').OreVariantKey,
    meteorWeatherId?: WeatherId,
    pitEventKind?: import('../game/PitEventsDomain').PitEventKind,
    screenPos?: { x: number; y: number }
  ) => void;
  emitDamageScreen: (
    dmg: number,
    wx: number,
    wy: number,
    wz: number,
    isClick: boolean,
    isCrit?: boolean,
    pitEventKind?: import('../game/PitEventsDomain').PitEventKind,
    isMeteor?: boolean
  ) => void;
  projectWorldToScreen: (wx: number, wy: number, wz: number) => { x: number; y: number } | null;
}): void {
  const { mode, dtSec, rawDt, elapsed } = ctx;
  const inMine = mode === 'mine';
  const inShopOrAltar = mode === 'shop' || mode === 'altar';

  if (inMine) {
    ctx.env.update(dtSec, elapsed, ctx.inputState.crateHovered, ctx.inputState.crateBounce);
    for (let i = 0; i < ctx.pedestals.length; i++) {
      ctx.pedestals[i].update(dtSec, elapsed, ctx.camera);
    }
  }
  ctx.pit.update(dtSec, elapsed, ctx.camera, inMine);
  if (inShopOrAltar) {
    ctx.shopWorld?.update(dtSec, elapsed, mode === 'shop' ? 'shop' : 'altar', ctx.camera);
  } else if (mode === 'fusion') {
    ctx.fusionWorld?.update(dtSec, elapsed, ctx.camera);
  } else if (mode === 'tower' && ctx.towerArena) {
    const towerArena = ctx.towerArena;
    towerArena.update(dtSec, elapsed, ctx.camera, (strike) => {
      const res = ctx.onTowerFighterStrike?.(strike.slotIndex, strike.targetOreIndex, strike.attackInterval);
      const shownDmg = res ? res.dmg : strike.dmg;
      if (res && res.dmg > 0 && strike.targetOreIndex !== null) {
        towerArena.triggerOreHitBounce(strike.targetOreIndex, Boolean(res.broken), strike);
      }
      if (shownDmg > 0) {
        ctx.emitDamageScreen(shownDmg, strike.wx, strike.wy, strike.wz, false, Boolean(res?.isCrit));
      }
    });
  } else if (mode === 'omega' && ctx.omegaArena) {
    const omegaArena = ctx.omegaArena;
    omegaArena.update(
      dtSec,
      elapsed,
      ctx.camera,
      (strike) => {
        const res = ctx.onOmegaFighterStrike?.(strike.slotIndex, strike.attackInterval);
        const shownDmg = res ? res.dmg : strike.dmg;
        if (shownDmg > 0) {
          omegaArena.triggerBossHitEffect(strike.accentColor, Boolean(res?.isCrit));
          ctx.emitDamageScreen(shownDmg, strike.wx, strike.wy, strike.wz, false, Boolean(res?.isCrit));
        }
      },
      ctx.onOmegaEntranceSlam
    );
  }
  ctx.weatherFx.update(dtSec, elapsed, inMine || mode === 'shop');

  const hitCb = inMine
    ? (dmg: number, wx: number, wy: number, wz: number, isMeteor?: boolean, isCrit?: boolean) =>
        ctx.emitDamageScreen(dmg, wx, wy, wz, false, Boolean(isCrit), undefined, isMeteor)
    : undefined;
  const minerBreakCb = (
    variantKey: import('./MineWorldPalette').OreVariantKey,
    meteorWeatherId?: WeatherId,
    pitEventKind?: import('../game/PitEventsDomain').PitEventKind,
    worldPos?: { x: number; y: number; z: number }
  ): void => {
    const screenPos = worldPos ? (ctx.projectWorldToScreen(worldPos.x, worldPos.y, worldPos.z) ?? undefined) : undefined;
    ctx.onOreBroken?.(variantKey, meteorWeatherId, pitEventKind, screenPos);
  };
  ctx.plotAttackController.update(dtSec, ctx.camera, ctx.pit, ctx.pedestals, inMine, minerBreakCb, hitCb);

  if (rawDt > 0.12 && ctx.plotAttackController.getUnitCount() > 0) {
    let rem = Math.min(180, rawDt - dtSec);
    const step = 0.25;
    while (rem > 0) {
      const s = Math.min(step, rem);
      rem -= s;
      ctx.pit.update(s, elapsed);
      ctx.plotAttackController.update(s, ctx.camera, ctx.pit, ctx.pedestals, false, ctx.onOreBroken, undefined);
    }
  }

  if (inMine) {
    if (ctx.inputState.crateBounce > 0) {
      ctx.inputState.crateBounce = Math.max(0, ctx.inputState.crateBounce - dtSec * 1.4);
    }
    const crateScale = (ctx.inputState.crateHovered ? 1.07 : 1.0) + ctx.inputState.crateBounce * 0.32;
    ctx.crateGroup.scale.set(crateScale, Math.max(0.84, crateScale - ctx.inputState.crateBounce * 0.25), crateScale);
    ctx.chestVisual.setInteraction(ctx.inputState.crateHovered, ctx.inputState.crateBounce, elapsed);
  }
  if (inMine || mode === 'shop') {
    ctx.env.updateSky(elapsed, ctx.camera.position);
  }
}

/** Updates Overclock Fever emissive/rim visuals on the mine stage. */
export function applyMineOverclockVisual(ctx: {
  active: boolean;
  tier: 0 | OverclockTier;
  mode: SceneMode;
  activePalette: MineWorldPalette;
  weatherFx: WeatherFx3D;
  stageNeonMat: THREE.MeshStandardMaterial;
  stageHoloMat: THREE.MeshBasicMaterial;
  rimLight: THREE.DirectionalLight;
  applyWeatherAtmosphere: () => void;
}): void {
  ctx.weatherFx.setFeverTier(ctx.mode === 'mine' ? ctx.tier : 0);
  if (ctx.active) {
    const hex = ctx.tier === 3 ? 0x22d3ee : ctx.tier === 2 ? 0xfb7185 : 0xf59e0b;
    ctx.stageNeonMat.color.setHex(hex);
    ctx.stageNeonMat.emissive.setHex(hex);
    ctx.stageNeonMat.emissiveIntensity = ctx.tier === 3 ? 2.4 : ctx.tier === 2 ? 2.1 : 1.85;
    ctx.stageHoloMat.color.setHex(hex);
    ctx.rimLight.color.setHex(hex);
    ctx.rimLight.intensity = ctx.tier === 3 ? 1.55 : ctx.tier === 2 ? 1.4 : 1.25;
  } else {
    ctx.stageNeonMat.color.set(ctx.activePalette.crystalColor);
    ctx.stageNeonMat.emissive.set(ctx.activePalette.crystalColor);
    ctx.stageNeonMat.emissiveIntensity = 1.15;
    ctx.stageHoloMat.color.set(ctx.activePalette.crystalColor);
    ctx.rimLight.intensity = 0.72;
    ctx.applyWeatherAtmosphere();
  }
}

/** Applies graphics quality preset across renderer, shadows, weather, arenas, and textures. */
export function applyMineGraphicsQuality(ctx: {
  quality: GraphicsQuality;
  anisoCap: number;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sunLight: THREE.DirectionalLight;
  weatherFx: WeatherFx3D;
  env: MineEnvironment3D;
  pit: OrePit3D;
  towerArena: TowerArena3D | null;
  omegaArena: OmegaArena3D | null;
  pedestals: PlotPedestal3D[];
  plotAttackController: PlotAttackController3D;
}): void {
  const low = ctx.quality === 'low';
  const preset = GRAPHICS_PRESETS[ctx.quality];
  ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
  ctx.renderer.shadowMap.enabled = preset.shadowsEnabled;
  ctx.renderer.shadowMap.type = ctx.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  ctx.sunLight.castShadow = preset.shadowsEnabled;
  ctx.renderer.shadowMap.needsUpdate = true;
  ctx.weatherFx.setQualityScale(preset.weatherParticleScale);
  ctx.env.setLowQuality(low);
  ctx.pit.setLowQuality(low);
  ctx.towerArena?.setLowQuality(low);
  ctx.omegaArena?.setLowQuality(low);
  for (let i = 0; i < ctx.pedestals.length; i++) {
    ctx.pedestals[i].setLowQuality(low);
  }
  ctx.plotAttackController.setLowQuality(low);
  configureSceneTextureSharpness(ctx.renderer, ctx.scene, ctx.anisoCap);
}
