import * as THREE from 'three';
import { ChibiDef, getChibiById } from './ChibiCatalog';
import { ProceduralChestHandle } from './ChestVaultStation3D';
import { FieldMiner3D } from './FieldMiner3D';
import { preloadCommonMineModels } from './GlbAssets3D';
import { MineEnvironment3D } from './MineEnvironment3D';
import { DEFAULT_WORLD_PALETTE, MineWorldPalette, OreVariantKey, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { OrePit3D } from './OrePit3D';
import { PlotLabelInfo, PlotPedestal3D } from './PlotPedestal3D';
import { FusionRecipeDef } from '../game/FusionData';
import { FusionWorld3D } from './FusionWorld3D';
import { AltarPedestalAnchor, ShopChibiBubbleAnchor, ShopStationAnchor, ShopStationId, ShopWorld3D } from './ShopWorld3D';
import { TowerArena3D, TowerFighterConfig, TowerOreBarScreen } from './TowerArena3D';
import { TowerWaveOreState } from '../game/TowerData';
import { GRAPHICS_PRESETS, GraphicsQuality } from '../game/GameSettings';
import { getOverclockTierBuffs, type OverclockTier } from '../game/OverclockDomain';
import { WeatherId } from '../game/WeatherData';
import { type PitEventKind } from '../game/PitEventsDomain';
import { WeatherFx3D } from './WeatherFx3D';
import { applyMineWeatherAtmosphere, buildMineStageAndChest, stepMineSceneCamera } from './MineSceneStage3D';
import { MineSceneProjector } from './MineSceneProjector';
import { bindMineSceneEvents, getPedestalAtClientPosInScene, performMineTapAtInScene, type MineInputCtx, type MineInputState } from './MineSceneInput';

export type SceneMode = 'mine' | 'shop' | 'altar' | 'fusion' | 'tower';

export function applyCameraOrbitDrag(opts: {
  cameraLocked: boolean;
  yaw: number;
  pitch: number;
  dx: number;
  dy: number;
}): { yaw: number; pitch: number } {
  if (opts.cameraLocked) {
    return { yaw: 0, pitch: 0 };
  }
  return {
    yaw: Math.max(-1.35, Math.min(1.35, opts.yaw - opts.dx * 0.005)),
    pitch: Math.max(-0.45, Math.min(0.42, opts.pitch + opts.dy * 0.004)),
  };
}

export function clampCameraZoomRadius(radius: number, mode: SceneMode): number {
  const maxRad = mode === 'shop' ? 38 : mode === 'fusion' ? 34 : 28;
  return Math.max(9, Math.min(maxRad, radius));
}

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

export const BASE_TAP_CRIT_CHANCE = 0.15;
export const OVERCLOCK_TAP_CRIT_CHANCE = 0.3;
export const TAP_CRIT_MULT = 2.5;
export const HOLD_MINE_INITIAL_DELAY_SEC = 0.22;
export const HOLD_MINE_INTERVAL_SEC = 0.18;

export function stepHoldMineTimer(opts: {
  holding: boolean;
  elapsedSec: number;
  firedInitial: boolean;
  dtSec: number;
}): { elapsedSec: number; firedInitial: boolean; shouldMine: boolean } {
  if (!opts.holding) {
    return { elapsedSec: 0, firedInitial: false, shouldMine: false };
  }
  const nextElapsed = Math.max(0, opts.elapsedSec) + Math.max(0, opts.dtSec);
  const threshold = opts.firedInitial ? HOLD_MINE_INTERVAL_SEC : HOLD_MINE_INITIAL_DELAY_SEC;
  if (nextElapsed >= threshold) {
    return {
      elapsedSec: Math.max(0, nextElapsed - threshold),
      firedInitial: true,
      shouldMine: true,
    };
  }
  return {
    elapsedSec: nextElapsed,
    firedInitial: opts.firedInitial,
    shouldMine: false,
  };
}

export function rollTapCriticalDamage(
  baseTapDamage: number,
  overclockActive: boolean,
  rng: () => number = Math.random,
  overclockTier: 0 | OverclockTier = overclockActive ? 1 : 0
): { damage: number; isCrit: boolean } {
  const safeBase = Math.max(1, Math.round(baseTapDamage));
  const critChance = overclockActive
    ? getOverclockTierBuffs(overclockTier || 1).critChance
    : BASE_TAP_CRIT_CHANCE;
  const isCrit = rng() < critChance;
  return {
    damage: isCrit ? Math.max(1, Math.round(safeBase * TAP_CRIT_MULT)) : safeBase,
    isCrit,
  };
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
}

export class MineScene3D {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private readonly pedestals: PlotPedestal3D[] = [];
  private readonly fieldMiners = new Map<number, FieldMiner3D>();
  private readonly slotEnchants: (string | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
  private readonly slotCombatStats = new Map<number, { dmg: number; speed: number; miningMult: number }>();
  private readonly env: MineEnvironment3D;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly pit: OrePit3D;
  private readonly shopWorld = new ShopWorld3D();
  private readonly fusionWorld = new FusionWorld3D();
  private readonly towerArena = new TowerArena3D();
  private readonly weatherFx = new WeatherFx3D();
  private readonly clickableMeshes: THREE.Object3D[] = [];
  private mode: SceneMode = 'mine';
  private activePalette: MineWorldPalette = DEFAULT_WORLD_PALETTE;
  private activeWeatherId: WeatherId = 'light_rain';
  private graphicsQuality: GraphicsQuality = 'high';
  private overclockActive = false;
  private overclockTier: 0 | OverclockTier = 0;
  private tapDamage = 45;
  private tapShakeIntensity = 0;

  private readonly crateGroup = new THREE.Group();
  private readonly chestVisual: ProceduralChestHandle;
  private readonly stageNeonMat: THREE.MeshStandardMaterial;
  private readonly stageHoloMat: THREE.MeshBasicMaterial;

  private elapsed = 0;
  private baseCamPos = new THREE.Vector3(0, 11.7, 15.6);
  private lookAtPos = new THREE.Vector3(0, 0.55, -0.55);
  private orbitYaw = 0;
  private orbitPitch = 0;
  private camRadius = 16.5;
  private readonly inputState: MineInputState = {
    isDragging: false,
    dragMoved: false,
    dragPointerType: 'mouse',
    activePointerId: null,
    activeTouchPoints: new Map<number, { x: number; y: number }>(),
    lastPinchDist: null,
    dragStartX: 0,
    dragStartY: 0,
    lastDragX: 0,
    lastDragY: 0,
    holdMineActive: false,
    holdMineElapsed: 0,
    holdMineFiredInitial: false,
    holdMineClientX: 0,
    holdMineClientY: 0,
    targetOrbitYaw: 0,
    targetOrbitPitch: 0,
    targetCamRadius: 16.5,
    cameraLocked: false,
    crateHovered: false,
    crateBounce: 0,
    dragHighlightPlot: null,
  };
  private rafId = 0;
  private lastTime = performance.now();
  private adPaused = false;
  private focusedPlotIndex: number | null = null;
  private tutorialFocusChest = false;
  private tutorialFocusSellShop = false;
  private currentLookAt = new THREE.Vector3(0, 0.55, -0.55);
  private readonly projVec = new THREE.Vector3();
  private readonly projector: MineSceneProjector;
  private mountResizeObserver: ResizeObserver | null = null;
  private readonly handleViewportResize = (): void => {
    const w = Math.max(1, this.mountEl.clientWidth);
    const h = Math.max(1, this.mountEl.clientHeight);
    const preset = GRAPHICS_PRESETS[this.graphicsQuality];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
    this.renderer.setSize(w, h);
  };

  constructor(
    private readonly mountEl: HTMLElement,
    private readonly callbacks: MineSceneCallbacks = {}
  ) {
    const palette = DEFAULT_WORLD_PALETTE;
    this.scene.background = new THREE.Color(palette.skyBottom);
    this.scene.fog = new THREE.Fog(palette.fogColor, 42, 105);

    const w = Math.max(1, mountEl.clientWidth);
    const h = Math.max(1, mountEl.clientHeight);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 1.0, 220);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.lookAtPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, GRAPHICS_PRESETS[this.graphicsQuality].maxPixelRatio)
    );
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(this.renderer.domElement);

    // Urban Night Cyber Hemisphere + Directional Key & Cool Cyan Rim Light
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b4f6e, 1.18);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    this.sunLight.position.set(11, 18, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 48;
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -12;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    this.rimLight.position.set(-12, 8, -10);
    this.scene.add(this.rimLight);

    preloadCommonMineModels();

    // Dark Basalt / Cyber-Industrial Mine Island Environment
    this.env = new MineEnvironment3D(palette);
    this.scene.add(this.env.group);
    // Keep Sky Dome directly in scene so both Mine and Shop World share the weather sky
    this.scene.add(this.env.skyDome);

    const builtStage = buildMineStageAndChest({
      palette,
      scene: this.scene,
      envGroup: this.env.group,
      pedestals: this.pedestals,
      clickableMeshes: this.clickableMeshes,
      crateGroup: this.crateGroup,
    });
    this.stageNeonMat = builtStage.stageNeonMat;
    this.stageHoloMat = builtStage.stageHoloMat;
    this.chestVisual = builtStage.chestVisual;

    this.pit = new OrePit3D(palette);
    this.pit.onMeteorLanded = () => {
      this.tapShakeIntensity = Math.max(this.tapShakeIntensity, 0.34);
    };
    this.scene.add(this.pit.group);
    for (const m of this.pit.clickableMeshes) {
      this.clickableMeshes.push(m);
    }

    this.projector = new MineSceneProjector({
      mountEl: this.mountEl,
      camera: this.camera,
      projVec: this.projVec,
      pit: this.pit,
      towerArena: this.towerArena,
      pedestals: this.pedestals,
      crateGroup: this.crateGroup,
      callbacks: this.callbacks,
      getFocusedPlotIndex: () => this.focusedPlotIndex,
    });
    this.scene.add(this.shopWorld.shopGroup);
    this.scene.add(this.shopWorld.altarGroup);
    this.scene.add(this.fusionWorld.group);
    this.scene.add(this.towerArena.group);
    this.scene.add(this.weatherFx.group);

    this.bindEvents();
    this.loop(performance.now());
  }

  private inputCtx(): MineInputCtx {
    return {
      state: this.inputState,
      mountEl: this.mountEl,
      renderer: this.renderer,
      camera: this.camera,
      raycaster: this.raycaster,
      pointer: this.pointer,
      pedestals: this.pedestals,
      pit: this.pit,
      shopWorld: this.shopWorld,
      towerArena: this.towerArena,
      clickableMeshes: this.clickableMeshes,
      callbacks: this.callbacks,
      getMode: () => this.mode,
      isAdPaused: () => this.adPaused,
      performMineTapAt: (x, y, preHit, isHold) => this.performMineTapAt(x, y, preHit, isHold),
      emitDamageScreen: (dmg, wx, wy, wz, isClick, isCrit) => this.emitDamageScreen(dmg, wx, wy, wz, isClick, isCrit),
      onViewportResize: this.handleViewportResize,
    };
  }

  private bindEvents(): void {
    this.mountResizeObserver = bindMineSceneEvents(this.inputCtx());
  }

  public getPedestalAtClientPos(clientX: number, clientY: number): number | null {
    return getPedestalAtClientPosInScene(this.inputCtx(), clientX, clientY);
  }
  public setDragHoveredPedestal(slotIndex: number | null): void {
    this.inputState.dragHighlightPlot = slotIndex;
    this.pedestals.forEach((p, idx) => p.setHovered(idx === slotIndex));
  }

  public pulsePedestal(slotIndex: number): void {
    this.pedestals[slotIndex]?.triggerChibiShowcase(1.4);
  }

  private performMineTapAt(
    clientX: number,
    clientY: number,
    preHit?: THREE.Object3D | null,
    isHold = false
  ): boolean {
    return performMineTapAtInScene(
      {
        pit: this.pit,
        callbacks: this.callbacks,
        getMode: () => this.mode,
        isAdPaused: () => this.adPaused,
        getTapDamage: () => this.tapDamage,
        getOverclockActive: () => this.overclockActive,
        getOverclockTier: () => this.overclockTier,
        inputCtx: () => this.inputCtx(),
        projectWorldToScreen: (wx, wy, wz) => this.projectWorldToScreen(wx, wy, wz),
        emitDamageScreen: (dmg, wx, wy, wz, isClick, isCrit, pitEventKind, isMeteor, isPerfect) =>
          this.emitDamageScreen(dmg, wx, wy, wz, isClick, isCrit, pitEventKind, isMeteor, isPerfect),
      },
      clientX,
      clientY,
      preHit,
      isHold
    );
  }

  private loop = (now: number): void => {
    if (this.adPaused) {
      this.lastTime = now;
      this.rafId = 0;
      return;
    }
    const rawDt = Math.max(0, (now - this.lastTime) / 1000);
    const dtSec = Math.min(rawDt, 0.05);
    this.lastTime = now;
    this.elapsed += dtSec;

    this.env.update(dtSec, this.elapsed, this.inputState.crateHovered, this.inputState.crateBounce);
    this.pedestals.forEach((p) => p.update(dtSec, this.elapsed, this.camera));
    this.pit.update(dtSec, this.elapsed, this.camera);
    this.shopWorld.update(dtSec, this.elapsed, this.mode === 'fusion' ? 'mine' : this.mode, this.camera);
    this.fusionWorld.update(dtSec, this.elapsed, this.camera);
    this.towerArena.update(dtSec, this.elapsed, this.camera, (strike) => {
      const res = this.callbacks.onTowerFighterStrike?.(
        strike.slotIndex,
        strike.targetOreIndex,
        strike.attackInterval
      );
      const shownDmg = res ? res.dmg : strike.dmg;
      if (res && res.dmg > 0 && strike.targetOreIndex !== null) {
        this.towerArena.triggerOreHitBounce(strike.targetOreIndex, Boolean(res.broken), strike);
      }
      if (shownDmg > 0) {
        this.emitDamageScreen(shownDmg, strike.wx, strike.wy, strike.wz, false, Boolean(res?.isCrit));
      }
    });
    this.weatherFx.update(dtSec, this.elapsed, this.mode === 'mine' || this.mode === 'shop' || this.mode === 'fusion');

    const inMine = this.mode === 'mine';
    const wasHoldFired = this.inputState.holdMineFiredInitial;
    const holdTick = stepHoldMineTimer({
      holding: inMine && this.inputState.holdMineActive && !this.inputState.dragMoved && !this.adPaused,
      elapsedSec: this.inputState.holdMineElapsed,
      firedInitial: this.inputState.holdMineFiredInitial,
      dtSec,
    });
    this.inputState.holdMineElapsed = holdTick.elapsedSec;
    this.inputState.holdMineFiredInitial = holdTick.firedInitial;
    if (!wasHoldFired && holdTick.firedInitial) {
      this.callbacks.onHoldMineChange?.(true);
    }
    if (holdTick.shouldMine) {
      this.performMineTapAt(this.inputState.holdMineClientX, this.inputState.holdMineClientY, undefined, true);
    }

    const hitCb = inMine
      ? (dmg: number, wx: number, wy: number, wz: number, isMeteor?: boolean) =>
          this.emitDamageScreen(dmg, wx, wy, wz, false, false, undefined, isMeteor)
      : undefined;

    const minerBreakCb = (
      variantKey: OreVariantKey,
      meteorWeatherId?: WeatherId,
      pitEventKind?: PitEventKind,
      worldPos?: { x: number; y: number; z: number }
    ): void => {
      const screenPos = worldPos ? (this.projectWorldToScreen(worldPos.x, worldPos.y, worldPos.z) ?? undefined) : undefined;
      this.callbacks.onOreBroken?.(variantKey, meteorWeatherId, pitEventKind, screenPos);
    };

    const minerDt =
      inMine && this.overclockActive
        ? dtSec * getOverclockTierBuffs(this.overclockTier || 1).speedMult
        : dtSec;
    for (const fm of this.fieldMiners.values()) {
      fm.update(minerDt, this.elapsed, this.camera, this.pit, minerBreakCb, hitCb, inMine);
    }

    // If the browser tab was backgrounded/throttled (rawDt > 0.12s), catch up missed mine ticks seamlessly
    if (rawDt > 0.12 && this.fieldMiners.size > 0) {
      let rem = Math.min(180, rawDt - dtSec);
      const step = 0.25;
      while (rem > 0) {
        const s = Math.min(step, rem);
        rem -= s;
        this.pit.update(s, this.elapsed);
        for (const fm of this.fieldMiners.values()) {
          fm.update(s, this.elapsed, this.camera, this.pit, this.callbacks.onOreBroken, undefined, false);
        }
      }
    }

    if (this.inputState.crateBounce > 0) {
      this.inputState.crateBounce = Math.max(0, this.inputState.crateBounce - dtSec * 1.4);
    }
    const crateScale = (this.inputState.crateHovered ? 1.07 : 1.0) + this.inputState.crateBounce * 0.32;
    this.crateGroup.scale.set(crateScale, Math.max(0.84, crateScale - this.inputState.crateBounce * 0.25), crateScale);
    this.chestVisual.setInteraction(this.inputState.crateHovered, this.inputState.crateBounce, this.elapsed);

    const camState = {
      orbitYaw: this.orbitYaw,
      orbitPitch: this.orbitPitch,
      camRadius: this.camRadius,
      tapShakeIntensity: this.tapShakeIntensity,
    };
    stepMineSceneCamera({
      dtSec,
      elapsed: this.elapsed,
      mode: this.mode,
      camera: this.camera,
      currentLookAt: this.currentLookAt,
      baseCamPos: this.baseCamPos,
      lookAtPos: this.lookAtPos,
      focusedPlotIndex: this.focusedPlotIndex,
      pedestals: this.pedestals,
      crateGroup: this.crateGroup,
      tutorialFocusChest: this.tutorialFocusChest,
      tutorialFocusSellShop: this.tutorialFocusSellShop,
      fusionWorld: this.fusionWorld,
      inputState: this.inputState,
      state: camState,
    });
    this.orbitYaw = camState.orbitYaw;
    this.orbitPitch = camState.orbitPitch;
    this.camRadius = camState.camRadius;
    this.tapShakeIntensity = camState.tapShakeIntensity;
    this.env.updateSky(this.elapsed, this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.projector.emitModeOverlays(this.mode, this.shopWorld, this.fusionWorld);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private projectWorldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } | null {
    return this.projector.projectWorldToScreen(wx, wy, wz);
  }
  private emitDamageScreen(dmg: number, wx: number, wy: number, wz: number, isClick: boolean, isCrit = false, pitEventKind?: PitEventKind, isMeteor?: boolean, isPerfect = false): void {
    this.projector.emitDamageScreen(dmg, wx, wy, wz, isClick, isCrit, pitEventKind, isMeteor, isPerfect);
  }
  public setMode(mode: SceneMode): void {
    this.mode = mode;
    this.weatherFx.setShopMode(mode === 'shop' || mode === 'fusion');
    this.weatherFx.setFeverTier(mode === 'mine' ? this.overclockTier : 0);
    if (mode !== 'mine' && mode !== 'tower') {
      this.renderer.domElement.classList.remove('mam-mining-cursor');
    }
    if (mode !== 'altar') {
      this.shopWorld.cancelSpin();
    }
    if (mode !== 'fusion') {
      this.fusionWorld.cancelAnimation();
    }
    const isMine = mode === 'mine';
    this.fusionWorld.group.visible = mode === 'fusion';
    this.towerArena.group.visible = mode === 'tower';
    this.env.group.visible = isMine;
    this.env.skyDome.visible = mode === 'mine' || mode === 'shop' || mode === 'fusion';
    this.pit.group.visible = isMine;
    this.crateGroup.visible = isMine;
    this.pedestals.forEach((p) => {
      p.group.visible = isMine;
    });
    for (const fm of this.fieldMiners.values()) {
      fm.sprite.group.visible = isMine;
    }

    if (mode === 'altar') {
      this.scene.background = new THREE.Color(0x020208);
      this.scene.fog = new THREE.Fog(0x040312, 34, 86);
      this.applyWeatherAtmosphere();
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = -0.18;
      this.inputState.targetCamRadius = 12.2;
      this.lookAtPos.set(0, 1.05, -2.4);
    } else if (mode === 'fusion') {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = -0.04;
      this.inputState.targetCamRadius = 18.2;
      this.lookAtPos.set(0, 1.85, -1.15);
      this.applyWeatherAtmosphere();
    } else if (mode === 'tower') {
      this.scene.background = new THREE.Color(0x101a30);
      this.scene.fog = new THREE.Fog(0x182338, 26, 76);
      this.applyWeatherAtmosphere();
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = -0.34;
      this.inputState.targetCamRadius = 16.4;
      this.lookAtPos.set(0, 2.25, -1.6);
      this.syncTowerFighters();
      this.towerArena.resetFloorCharge();
    } else if (mode === 'shop') {
      const aspect = this.camera.aspect || 1;
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0.02;
      this.inputState.targetCamRadius = aspect < 0.85 ? 37.6 : aspect < 1.15 ? 33.2 : 30.4;
      this.lookAtPos.set(0, 2.95, -2.9);
      this.applyWeatherAtmosphere();
    } else {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0;
      this.inputState.targetCamRadius = 16.5;
      this.lookAtPos.set(0, 0.55, -0.55);
      this.applyWeatherAtmosphere();
    }
  }


  private applyWeatherAtmosphere(): void {
    applyMineWeatherAtmosphere({
      activeWeatherId: this.activeWeatherId,
      mode: this.mode,
      env: this.env,
      hemiLight: this.hemiLight,
      sunLight: this.sunLight,
      rimLight: this.rimLight,
      scene: this.scene,
    });
  }

  public setWeather(weatherId: WeatherId): void {
    this.activeWeatherId = weatherId;
    this.weatherFx.setWeather(weatherId);
    this.applyWeatherAtmosphere();
  }

  public spawnWeatherMeteor(weatherId: WeatherId, hpScale: number, minBossHp = 0): void {
    this.pit.spawnWeatherMeteor(weatherId, hpScale, minBossHp);
  }

  public clearWeatherMeteor(): void {
    this.pit.clearWeatherMeteor();
  }

  public hasAliveMeteor(): boolean {
    return this.pit.hasAliveMeteor();
  }

  public setWorldState(
    palette: MineWorldPalette,
    hpScale: number,
    activeOreNodes: number,
    tapDamage: number,
    respawnSpeedMult: number
  ): void {
    this.tapDamage = Math.max(1, Math.round(tapDamage));
    this.pit.setHpScale(hpScale);
    this.pit.setActiveNodeCount(activeOreNodes);
    this.pit.setRespawnSpeedMult(respawnSpeedMult);
    if (this.activePalette !== palette) {
      this.activePalette = palette;
      this.env.setPalette(palette);
      this.stageNeonMat.color.set(palette.crystalColor);
      this.stageNeonMat.emissive.set(palette.crystalColor);
      this.stageHoloMat.color.set(palette.crystalColor);
      this.chestVisual.setAccentColor(palette.crystalColor);
      this.pit.setPalette(palette, true);
      this.applyWeatherAtmosphere();
      this.callbacks.onOreBars?.([]);
    }
  }

  public setCameraLocked(locked: boolean): void {
    this.inputState.cameraLocked = locked;
    if (locked) {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0;
    }
  }

  public isCameraLocked(): boolean {
    return this.inputState.cameraLocked;
  }

  public setRespawnSpeedMult(mult: number): void {
    this.pit.setRespawnSpeedMult(mult);
  }

  public getMode(): SceneMode {
    return this.mode;
  }

  public spawnPitEvent(kind: PitEventKind): boolean {
    if (this.pit.hasAliveMeteor()) return false;
    return this.pit.activatePitEvent(kind) !== null;
  }

  public clearPitEvent(): void {
    this.pit.clearPitEvent();
  }

  public setTowerVisual(
    isBoss: boolean,
    anomalyColorHex: string,
    equippedMinerCount: number,
    floorNumber = 1,
    paused = false
  ): void {
    this.towerArena.setFloorVisual(isBoss, anomalyColorHex, equippedMinerCount, floorNumber, paused);
  }

  public syncTowerWave(opts: {
    floor: number;
    wave: number;
    isBossWave: boolean;
    isCheckpointFloor: boolean;
    waveOres: readonly TowerWaveOreState[];
    anomalyColorHex: string;
    equippedMinerCount: number;
    paused: boolean;
    bossShieldActive?: boolean;
  }): void {
    this.towerArena.syncWaveState(opts);
  }

  public setTowerBossShieldActive(active: boolean): void {
    this.towerArena.setBossShieldActive(active);
  }

  private syncTowerFighters(): void {
    const configs: TowerFighterConfig[] = [];
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const def = this.pedestals[i]?.getChibi() ?? null;
      if (!def) continue;
      const st = this.slotCombatStats.get(i);
      configs.push({
        slotIndex: i,
        def,
        enchantId: this.slotEnchants[i] ?? null,
        dmg: st?.dmg ?? def.baseDps,
        speed: st?.speed ?? 10,
        miningMult: st?.miningMult ?? 1,
      });
    }
    this.towerArena.syncFighters(configs);
  }

  public triggerEnchantSpin(targetEnchantId: string, onComplete?: () => void): void {
    this.shopWorld.triggerSpin(targetEnchantId, onComplete);
  }

  public isEnchantSpinning(): boolean {
    return this.shopWorld.isSpinning();
  }

  public syncFusionRecipe(
    recipe: FusionRecipeDef,
    readyFlags: readonly boolean[],
    oreReadyFlags?: readonly boolean[],
    canFuse?: boolean
  ): void {
    this.fusionWorld.syncRecipe(recipe, readyFlags, oreReadyFlags, canFuse);
  }

  public triggerFusionAnimation(recipe: FusionRecipeDef, onComplete: () => void): void {
    this.fusionWorld.triggerFusionAnimation(recipe, onComplete);
  }

  public setFusionRevealHold(active: boolean): void {
    this.fusionWorld.setRevealHold(active);
  }

  public isFusionAnimating(): boolean {
    return this.fusionWorld.isAnimating();
  }

  public focusPlot(slotIndex: number | null): void {
    this.focusedPlotIndex = slotIndex;
    const showLabels = slotIndex === null;
    this.pedestals.forEach((p) => p.setLabelVisible(showLabels));
  }

  public syncPlotLabel(slotIndex: number, info: PlotLabelInfo | null): void {
    this.pedestals[slotIndex]?.setLabel(info);
  }

  public setTutorialPitZoom(zoomed: boolean): void {
    this.tutorialFocusChest = false;
    if (zoomed) {
      this.focusedPlotIndex = null;
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0.06;
      this.inputState.targetCamRadius = 8.4;
      this.pit.spawnTutorialCenterOre(Math.max(100, this.tapDamage * 10));
    } else {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0;
      this.inputState.targetCamRadius = 16.5;
    }
  }

  public setTutorialChestZoom(zoomed: boolean): void {
    this.tutorialFocusChest = zoomed;
    this.tutorialFocusSellShop = false;
    if (zoomed) {
      this.focusedPlotIndex = null;
    } else {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = 0;
      this.inputState.targetCamRadius = 16.5;
    }
  }

  public setTutorialSellShopZoom(zoomed: boolean): void {
    this.tutorialFocusSellShop = zoomed;
    this.tutorialFocusChest = false;
    if (zoomed) {
      this.focusedPlotIndex = null;
    }
  }

  public syncPlotUnitStats(slotIndex: number, dmg: number, speed: number, miningMult: number): void {
    this.slotCombatStats.set(slotIndex, { dmg, speed, miningMult });
    this.fieldMiners.get(slotIndex)?.setCombatStats(dmg, speed, miningMult);
    if (this.mode === 'tower') this.syncTowerFighters();
  }

  public syncPlotEnchant(slotIndex: number, enchantId: string | null): void {
    if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return;
    this.slotEnchants[slotIndex] = enchantId;
    this.pedestals[slotIndex]?.setEnchant(enchantId);
    this.fieldMiners.get(slotIndex)?.setEnchant(enchantId);
    if (this.mode === 'tower') this.syncTowerFighters();
  }

  public syncPlotMiners(chibiIds: (string | null)[]): void {
    for (let i = 0; i < this.pedestals.length; i++) {
      const nextId = chibiIds[i] ?? null;
      const current = this.pedestals[i].getChibi()?.id ?? null;
      if (current !== nextId) {
        this.setPlotChibi(i, nextId);
      }
    }
    this.shopWorld.syncPlazaMiners(chibiIds);
  }

  public setPlotChibi(slotIndex: number, chibiId: string | null): void {
    const ped = this.pedestals[slotIndex];
    if (!ped) return;
    const def = chibiId ? getChibiById(chibiId) ?? null : null;
    ped.setChibi(def);
    const activeEnchant = def ? this.slotEnchants[slotIndex] ?? null : null;
    ped.setEnchant(activeEnchant);

    const existing = this.fieldMiners.get(slotIndex);
    if (existing) {
      this.scene.remove(existing.sprite.group);
      existing.dispose();
      this.fieldMiners.delete(slotIndex);
    }

    if (def) {
      const fm = new FieldMiner3D(def, slotIndex);
      fm.setEnchant(activeEnchant);
      this.fieldMiners.set(slotIndex, fm);
      this.scene.add(fm.sprite.group);
    } else {
      this.slotCombatStats.delete(slotIndex);
    }
    this.syncTowerFighters();
  }

  public getPlotChibi(slotIndex: number): ChibiDef | null {
    return this.pedestals[slotIndex]?.getChibi() ?? null;
  }

  public setOverclockActive(active: boolean, tier: 0 | OverclockTier = active ? 1 : 0): void {
    const nextTier: 0 | OverclockTier = active ? (tier === 2 || tier === 3 ? tier : 1) : 0;
    if (this.overclockActive === active && this.overclockTier === nextTier) return;
    this.overclockActive = active;
    this.overclockTier = nextTier;
    this.weatherFx.setFeverTier(this.mode === 'mine' ? nextTier : 0);
    if (active) {
      const hex = nextTier === 3 ? 0x22d3ee : nextTier === 2 ? 0xfb7185 : 0xf59e0b;
      this.stageNeonMat.color.setHex(hex);
      this.stageNeonMat.emissive.setHex(hex);
      this.stageNeonMat.emissiveIntensity = nextTier === 3 ? 2.4 : nextTier === 2 ? 2.1 : 1.85;
      this.stageHoloMat.color.setHex(hex);
      this.rimLight.color.setHex(hex);
      this.rimLight.intensity = nextTier === 3 ? 1.55 : nextTier === 2 ? 1.4 : 1.25;
    } else {
      this.stageNeonMat.color.set(this.activePalette.crystalColor);
      this.stageNeonMat.emissive.set(this.activePalette.crystalColor);
      this.stageNeonMat.emissiveIntensity = 1.15;
      this.stageHoloMat.color.set(this.activePalette.crystalColor);
      this.rimLight.intensity = 0.72;
      this.applyWeatherAtmosphere();
    }
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const preset = GRAPHICS_PRESETS[quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
    this.renderer.shadowMap.enabled = preset.shadowsEnabled;
    this.sunLight.castShadow = preset.shadowsEnabled;
    this.renderer.shadowMap.needsUpdate = true;
    this.weatherFx.setQualityScale(preset.weatherParticleScale);
  }

  public setAdPaused(paused: boolean): void {
    if (this.adPaused === paused) return;
    this.adPaused = paused;
    if (paused) {
      this.inputState.isDragging = false;
      this.inputState.activePointerId = null;
      this.inputState.holdMineActive = false;
      this.inputState.holdMineElapsed = 0;
      this.inputState.holdMineFiredInitial = false;
      this.renderer.domElement.classList.remove('mam-mining-cursor');
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    } else {
      this.lastTime = performance.now();
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(this.loop);
      }
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleViewportResize);
    window.visualViewport?.removeEventListener('resize', this.handleViewportResize);
    this.mountResizeObserver?.disconnect();
    this.mountResizeObserver = null;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.pedestals.forEach((p) => p.dispose());
    this.chestVisual.dispose();
    this.env.dispose();
    this.pit.dispose();
    this.shopWorld.dispose();
    this.fusionWorld.dispose();
    this.towerArena.dispose();
    this.weatherFx.dispose();
    this.renderer.dispose();
  }
}
