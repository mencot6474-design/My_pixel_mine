import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ChibiDef, getChibiById } from './ChibiCatalog';
import { ProceduralChestHandle } from './ChestVaultStation3D';
import { PlotAttackController3D } from './PlotAttackController3D';
import { type TierVfxHooks } from './TierAttackVfx3D';
import { preloadCommonMineModels } from './GlbAssets3D';
import { MineEnvironment3D } from './MineEnvironment3D';
import { DEFAULT_WORLD_PALETTE, MineWorldPalette, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { OrePit3D } from './OrePit3D';
import { PlotLabelInfo, PlotPedestal3D } from './PlotPedestal3D';
import { FusionRecipeDef } from '../game/FusionData';
import { FusionWorld3D } from './FusionWorld3D';
import { ShopWorld3D } from './ShopWorld3D';
import { TowerArena3D, TowerFighterConfig } from './TowerArena3D';
import { OmegaArena3D } from './OmegaArena3D';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaBattlePhase, OmegaTargetObject } from '../game/OmegaBossDomain';
import { TowerWaveOreState } from '../game/TowerData';
import { GRAPHICS_PRESETS, GraphicsQuality } from '../game/GameSettings';
import { type OverclockTier } from '../game/OverclockDomain';
import { WeatherId } from '../game/WeatherData';
import { type PitEventKind } from '../game/PitEventsDomain';
import { WeatherFx3D } from './WeatherFx3D';
import {
  applyCameraOrbitDrag,
  applyMineGraphicsQuality,
  applyMineOverclockVisual,
  applyMineSceneModeTransition,
  applyMineWeatherAtmosphere,
  buildMineStageAndChest,
  clampCameraZoomRadius,
  createMineRendererAndLights,
  getDefaultOrbitPitchForMode,
  type MineSceneCallbacks,
  type OreHpScreen,
  type PlotAnchorScreen,
  stepMineActiveWorldEntities,
  stepMinePostFxAndDim,
  stepMineSceneCamera,
  type SceneMode,
  type SweetSpotScreen,
} from './MineSceneStage3D';
import { MineSceneProjector } from './MineSceneProjector';
import {
  BASE_TAP_CRIT_CHANCE,
  bindMineSceneEvents,
  getPedestalAtClientPosInScene,
  HOLD_MINE_INITIAL_DELAY_SEC,
  HOLD_MINE_INTERVAL_SEC,
  OVERCLOCK_TAP_CRIT_CHANCE,
  performMineTapAtInScene,
  rollTapCriticalDamage,
  stepHoldMineTimer,
  TAP_CRIT_MULT,
  type MineInputCtx,
  type MineInputState,
} from './MineSceneInput';
import { configureSceneTextureSharpness } from './MeshHelpers3D';
import { disposeObject3D } from './ChestVaultStation3D';

export {
  applyCameraOrbitDrag,
  BASE_TAP_CRIT_CHANCE,
  clampCameraZoomRadius,
  getDefaultOrbitPitchForMode,
  HOLD_MINE_INITIAL_DELAY_SEC,
  HOLD_MINE_INTERVAL_SEC,
  OVERCLOCK_TAP_CRIT_CHANCE,
  rollTapCriticalDamage,
  stepHoldMineTimer,
  TAP_CRIT_MULT,
};
export type {
  MineSceneCallbacks,
  OreHpScreen,
  PlotAnchorScreen,
  SceneMode,
  SweetSpotScreen,
};

export class MineScene3D {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly impactPass: ShaderPass;
  private impactFrameTimer = 0;
  private impactFrameCooldown = 0;
  private speedLinesTimer = 0;
  private arenaDimTimer = 0;
  private arenaDimCooldown = 0;
  private arenaDimCurrent = 0;
  private arenaDimTarget = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private readonly pedestals: PlotPedestal3D[] = [];
  private readonly plotAttackController = new PlotAttackController3D();
  private readonly slotEnchants: (string | null)[] = Array(STAGE_PEDESTAL_COUNT).fill(null);
  private readonly slotCombatStats = new Map<
    number,
    { dmg: number; speed: number; miningMult: number; critChance: number; critMult: number }
  >();
  private readonly env: MineEnvironment3D;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly pit: OrePit3D;
  private shopWorld: ShopWorld3D | null = null;
  private fusionWorld: FusionWorld3D | null = null;
  private towerArena: TowerArena3D | null = null;
  private omegaArena: OmegaArena3D | null = null;
  private lastSyncedPlazaChibiIds: (string | null)[] = [];
  private readonly weatherFx = new WeatherFx3D();
  private readonly clickableMeshes: THREE.Object3D[] = [];
  private mode: SceneMode = 'mine';
  private activePalette: MineWorldPalette = DEFAULT_WORLD_PALETTE;
  private activeWeatherId: WeatherId = 'light_rain';
  private graphicsQuality: GraphicsQuality = 'low';
  private overclockActive = false;
  private overclockTier: 0 | OverclockTier = 0;
  private tapDamage = 45;
  private tapShakeIntensity = 0;

  private readonly crateGroup = new THREE.Group();
  private readonly chestVisual: ProceduralChestHandle;
  private readonly stageNeonMat: THREE.MeshStandardMaterial;
  private readonly stageHoloMat: THREE.MeshBasicMaterial;

  private elapsed = 0;
  private baseCamPos = new THREE.Vector3(0, 11.7, 20.55);
  private lookAtPos = new THREE.Vector3(0, 0.85, 0.15);
  private orbitYaw = 0;
  private orbitPitch = -0.18;
  private camRadius = 20.4;
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
    targetOrbitPitch: -0.18,
    targetCamRadius: 20.4,
    cameraLocked: false,
    crateHovered: false,
    crateBounce: 0,
    dragHighlightPlot: null,
  };
  private rafId = 0;
  private lastTime = performance.now();
  private adPaused = false;
  private modalBackdropThrottled = false;
  private lastThrottledRenderMs = 0;
  private lastOverlayEmitMs = 0;
  private fpsFrames = 0;
  private fpsSampleStartMs = performance.now();
  private focusedPlotIndex: number | null = null;
  private tutorialFocusChest = false;
  private tutorialFocusSellShop = false;
  private currentLookAt = new THREE.Vector3(0, 0.85, 0.15);
  private readonly projVec = new THREE.Vector3();
  private readonly projector: MineSceneProjector;
  private mountResizeObserver: ResizeObserver | null = null;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private readonly handleViewportResize = (): void => {
    const w = Math.max(1, this.mountEl.clientWidth);
    const h = Math.max(1, this.mountEl.clientHeight);
    this.viewportWidth = w;
    this.viewportHeight = h;
    const preset = GRAPHICS_PRESETS[this.graphicsQuality];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(Math.max(1, Math.round(w * 0.5)), Math.max(1, Math.round(h * 0.5)));
  };

  constructor(
    private readonly mountEl: HTMLElement,
    private readonly callbacks: MineSceneCallbacks = {}
  ) {
    const palette = DEFAULT_WORLD_PALETTE;
    const initGfx = createMineRendererAndLights({
      mountEl,
      scene: this.scene,
      palette,
      graphicsQuality: this.graphicsQuality,
      baseCamPos: this.baseCamPos,
      lookAtPos: this.lookAtPos,
    });
    this.viewportWidth = initGfx.viewportWidth;
    this.viewportHeight = initGfx.viewportHeight;
    this.camera = initGfx.camera;
    this.renderer = initGfx.renderer;
    this.composer = initGfx.composer;
    this.bloomPass = initGfx.bloomPass;
    this.impactPass = initGfx.impactPass;
    this.hemiLight = initGfx.hemiLight;
    this.sunLight = initGfx.sunLight;
    this.rimLight = initGfx.rimLight;

    preloadCommonMineModels();

    // Dark Basalt / Cyber-Industrial Mine Island Environment
    this.env = new MineEnvironment3D(palette);
    this.env.setLowQuality(this.graphicsQuality === 'low');
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
    this.pit.setLowQuality(this.graphicsQuality === 'low');
    this.pit.onMeteorLanded = () => {
      this.tapShakeIntensity = Math.max(this.tapShakeIntensity, 0.34);
    };
    this.scene.add(this.pit.group);
    for (const m of this.pit.clickableMeshes) {
      this.clickableMeshes.push(m);
    }
    this.plotAttackController.setLowQuality(this.graphicsQuality === 'low');
    this.plotAttackController.setTierVfxHooks(this.createTierVfxHooks());
    this.plotAttackController.setSkillPulseHook((colorHex, strength) => {
      this.pit.triggerSkillPulse(colorHex, strength);
    });
    this.plotAttackController.setUltFiredHook((info) => {
      this.callbacks.onPlotUltFired?.(info);
    });
    this.plotAttackController.setEncoreUltCompletedHook(() => {
      this.callbacks.onEncoreUltCompleted?.();
    });
    this.plotAttackController.setHyperEncoreCompleteHook(() => {
      this.callbacks.onHyperEncoreComplete?.();
    });
    this.scene.add(this.plotAttackController.group);

    this.projector = new MineSceneProjector({
      mountEl: this.mountEl,
      getViewportSize: () => ({ width: this.viewportWidth, height: this.viewportHeight }),
      camera: this.camera,
      projVec: this.projVec,
      pit: this.pit,
      getTowerArena: () => this.towerArena,
      getOmegaArena: () => this.omegaArena,
      pedestals: this.pedestals,
      crateGroup: this.crateGroup,
      callbacks: this.callbacks,
      getFocusedPlotIndex: () => this.focusedPlotIndex,
      getPlotUltState: (slotIndex) => this.plotAttackController.getSlotUltState(slotIndex),
    });
    this.weatherFx.setQualityScale(0);
    this.scene.add(this.weatherFx.group);
    configureSceneTextureSharpness(this.renderer, this.scene, this.getTextureAnisoCap());

    this.bindEvents();
    this.loop(performance.now());
  }

  private createTierVfxHooks(): TierVfxHooks {
    return {
      onArenaDim: (level, _tintHex, duration) => {
        if (this.arenaDimCooldown > 0) return;
        this.arenaDimCooldown = 2.0;
        this.arenaDimTarget = Math.min(0.65, level);
        this.arenaDimTimer = Math.min(0.75, duration);
      },
      onImpactFrame: () => {
        // Disabled full-screen B&W/invert strobe flash to avoid eye strain in medium/high presets
      },
      onSpeedLines: () => {
        // Disabled full-screen edge flicker streaks to avoid eye strain in medium/high presets
      },
      onFlash: () => {
        // Keep bloom strength steady at 0.12 without sudden full-screen flash spikes
      },
    };
  }

  private getTextureAnisoCap(): number {
    return 8;
  }

  private ensureShopWorld(): ShopWorld3D {
    if (!this.shopWorld) {
      const sw = new ShopWorld3D();
      this.shopWorld = sw;
      this.scene.add(sw.shopGroup);
      this.scene.add(sw.altarGroup);
      configureSceneTextureSharpness(this.renderer, sw.shopGroup, this.getTextureAnisoCap());
      configureSceneTextureSharpness(this.renderer, sw.altarGroup, this.getTextureAnisoCap());
      if (this.lastSyncedPlazaChibiIds.length > 0) {
        sw.syncPlazaMiners(this.lastSyncedPlazaChibiIds);
      }
    }
    return this.shopWorld;
  }

  private ensureFusionWorld(): FusionWorld3D {
    if (!this.fusionWorld) {
      const fw = new FusionWorld3D();
      this.fusionWorld = fw;
      this.scene.add(fw.group);
      configureSceneTextureSharpness(this.renderer, fw.group, this.getTextureAnisoCap());
    }
    return this.fusionWorld;
  }

  private ensureTowerArena(): TowerArena3D {
    if (!this.towerArena) {
      const ta = new TowerArena3D();
      ta.setLowQuality(this.graphicsQuality === 'low');
      ta.setTierVfxHooks(this.createTierVfxHooks());
      this.towerArena = ta;
      this.scene.add(ta.group);
      configureSceneTextureSharpness(this.renderer, ta.group, this.getTextureAnisoCap());
      this.syncTowerFighters();
    }
    return this.towerArena;
  }

  private ensureOmegaArena(): OmegaArena3D {
    if (!this.omegaArena) {
      const oa = new OmegaArena3D();
      oa.setLowQuality(this.graphicsQuality === 'low');
      oa.setTierVfxHooks(this.createTierVfxHooks());
      this.omegaArena = oa;
      this.scene.add(oa.group);
      configureSceneTextureSharpness(this.renderer, oa.group, this.getTextureAnisoCap());
      this.syncTowerFighters();
    }
    return this.omegaArena;
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
      getShopWorld: () => this.shopWorld,
      getTowerArena: () => this.towerArena,
      getOmegaArena: () => this.omegaArena,
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
    this.camera.updateMatrixWorld();

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

    stepMineActiveWorldEntities({
      mode: this.mode,
      dtSec,
      rawDt,
      elapsed: this.elapsed,
      camera: this.camera,
      env: this.env,
      pit: this.pit,
      pedestals: this.pedestals,
      plotAttackController: this.plotAttackController,
      weatherFx: this.weatherFx,
      shopWorld: this.shopWorld,
      fusionWorld: this.fusionWorld,
      towerArena: this.towerArena,
      omegaArena: this.omegaArena,
      crateGroup: this.crateGroup,
      chestVisual: this.chestVisual,
      inputState: this.inputState,
      onTowerFighterStrike: this.callbacks.onTowerFighterStrike,
      onOmegaFighterStrike: this.callbacks.onOmegaFighterStrike,
      onOmegaEntranceSlam: () => {
        this.tapShakeIntensity = Math.max(this.tapShakeIntensity, 0.34);
        this.callbacks.onOmegaEntranceSlam?.();
      },
      onOreBroken: this.callbacks.onOreBroken,
      emitDamageScreen: (dmg, wx, wy, wz, isClick, isCrit, pitEventKind, isMeteor, isPerfect, beatIndex, isFinisher) =>
        this.emitDamageScreen(dmg, wx, wy, wz, isClick, isCrit, pitEventKind, isMeteor, isPerfect, beatIndex, isFinisher),
      projectWorldToScreen: (wx, wy, wz) => this.projectWorldToScreen(wx, wy, wz),
    });

    const postFxTimers = {
      impactFrameCooldown: this.impactFrameCooldown,
      arenaDimCooldown: this.arenaDimCooldown,
      impactFrameTimer: this.impactFrameTimer,
      speedLinesTimer: this.speedLinesTimer,
      arenaDimTimer: this.arenaDimTimer,
      arenaDimTarget: this.arenaDimTarget,
      arenaDimCurrent: this.arenaDimCurrent,
    };
    stepMinePostFxAndDim({
      dtSec,
      nowMs: now,
      inMine,
      timers: postFxTimers,
      impactPass: this.impactPass,
      bloomPass: this.bloomPass,
      hemiLight: this.hemiLight,
      sunLight: this.sunLight,
    });
    this.impactFrameCooldown = postFxTimers.impactFrameCooldown;
    this.arenaDimCooldown = postFxTimers.arenaDimCooldown;
    this.impactFrameTimer = postFxTimers.impactFrameTimer;
    this.speedLinesTimer = postFxTimers.speedLinesTimer;
    this.arenaDimTimer = postFxTimers.arenaDimTimer;
    this.arenaDimTarget = postFxTimers.arenaDimTarget;
    this.arenaDimCurrent = postFxTimers.arenaDimCurrent;

    const fullscreenCutsceneActive =
      typeof document !== 'undefined' && document.body?.dataset.fullscreenCutscene === 'true';
    const shouldRenderFrame =
      !fullscreenCutsceneActive &&
      (!this.modalBackdropThrottled || now - this.lastThrottledRenderMs >= 33);
    if (shouldRenderFrame) {
      this.lastThrottledRenderMs = now;
      const postFxActive = this.graphicsQuality === 'high';
      if (!postFxActive) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.composer.render();
      }
      if (this.graphicsQuality !== 'low' || now - this.lastOverlayEmitMs >= 32) {
        this.lastOverlayEmitMs = now;
        this.projector.emitModeOverlays(this.mode, this.shopWorld, this.fusionWorld);
      }
      this.fpsFrames++;
    }
    const fpsElapsedMs = now - this.fpsSampleStartMs;
    if (fpsElapsedMs >= 500) {
      const measuredFps = Math.max(0, Math.round((this.fpsFrames * 1000) / fpsElapsedMs));
      this.fpsFrames = 0;
      this.fpsSampleStartMs = now;
      this.callbacks.onFpsUpdate?.(measuredFps);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private projectWorldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } | null {
    return this.projector.projectWorldToScreen(wx, wy, wz);
  }
  private emitDamageScreen(
    dmg: number,
    wx: number,
    wy: number,
    wz: number,
    isClick: boolean,
    isCrit = false,
    pitEventKind?: PitEventKind,
    isMeteor?: boolean,
    isPerfect = false,
    beatIndex?: number,
    isFinisher?: boolean
  ): void {
    this.projector.emitDamageScreen(
      dmg,
      wx,
      wy,
      wz,
      isClick,
      isCrit,
      pitEventKind,
      isMeteor,
      isPerfect,
      beatIndex,
      isFinisher
    );
  }
  public setMode(mode: SceneMode): void {
    const modeChanged = this.mode !== mode;
    this.mode = mode;
    this.lastOverlayEmitMs = 0;
    this.tapShakeIntensity = 0;
    if (modeChanged) {
      this.focusPlot(null);
      this.tutorialFocusChest = false;
      this.tutorialFocusSellShop = false;
    }
    applyMineSceneModeTransition({
      mode,
      modeChanged,
      overclockTier: this.overclockTier,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      weatherFx: this.weatherFx,
      env: this.env,
      pit: this.pit,
      crateGroup: this.crateGroup,
      pedestals: this.pedestals,
      plotAttackController: this.plotAttackController,
      shopWorld: this.shopWorld,
      fusionWorld: this.fusionWorld,
      towerArena: this.towerArena,
      omegaArena: this.omegaArena,
      ensureShopWorld: () => this.ensureShopWorld(),
      ensureFusionWorld: () => this.ensureFusionWorld(),
      ensureTowerArena: () => this.ensureTowerArena(),
      ensureOmegaArena: () => this.ensureOmegaArena(),
      applyWeatherAtmosphere: () => this.applyWeatherAtmosphere(),
      syncTowerFighters: () => this.syncTowerFighters(),
      inputState: this.inputState,
      lookAtPos: this.lookAtPos,
      currentLookAt: this.currentLookAt,
      baseCamPos: this.baseCamPos,
      setOrbitImmediate: (yaw, pitch, radius) => {
        this.orbitYaw = yaw;
        this.orbitPitch = pitch;
        this.camRadius = radius;
      },
    });
  }


  private applyWeatherAtmosphere(): void {
    applyMineWeatherAtmosphere({
      activeWeatherId: this.activeWeatherId,
      activePalette: this.activePalette,
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
      if (this.renderer.shadowMap.enabled) {
        this.renderer.shadowMap.needsUpdate = true;
      }
      this.applyWeatherAtmosphere();
      this.callbacks.onOreBars?.([]);
    }
  }

  public setCameraLocked(locked: boolean): void {
    this.inputState.cameraLocked = locked;
    if (locked) {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode(this.mode);
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
    this.ensureTowerArena().setFloorVisual(isBoss, anomalyColorHex, equippedMinerCount, floorNumber, paused);
  }

  public syncTowerWave(opts: {
    floor: number;
    wave: number;
    isBossWave: boolean;
    waveOres: readonly TowerWaveOreState[];
    anomalyColorHex: string;
    equippedMinerCount: number;
    paused: boolean;
    bossShieldActive?: boolean;
    bossChibiId?: string;
  }): void {
    this.ensureTowerArena().syncWaveState(opts);
  }

  public setTowerBossShieldActive(active: boolean): void {
    this.towerArena?.setBossShieldActive(active);
  }

  private syncTowerFighters(): void {
    if (!this.towerArena && !this.omegaArena) return;
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
    this.towerArena?.syncFighters(configs);
    this.omegaArena?.syncFighters(configs);
  }

  public setOmegaBossConfig(bossId: OmegaBossId): void { this.ensureOmegaArena().setBossId(bossId); }
  public startOmegaEntrance(): void { this.ensureOmegaArena().startEntranceCutscene(); }
  public setOmegaBattlePhase(phase: OmegaBattlePhase | 'ended'): void { this.omegaArena?.setBattlePhase(phase); }
  public pulseOmegaInvulShield(): void { this.omegaArena?.pulseInvulShield(); }
  public syncOmegaBattleVisuals(targets: readonly OmegaTargetObject[], breakActive: boolean, parryActive: boolean): void {
    const oa = this.omegaArena;
    if (!oa) return;
    oa.syncBattleTargets(targets);
    oa.setBattleStatus(breakActive, parryActive);
  }
  public triggerOmegaBossHit(color?: string, isCrit = false): void { this.omegaArena?.triggerBossHitEffect(color, isCrit); }
  public triggerOmegaTargetShatter(wx: number, wz: number, color: string): void { this.omegaArena?.triggerTargetShatterFx(wx, wz, color); }

  public triggerEnchantSpin(targetEnchantId: string, onComplete?: () => void): void {
    this.ensureShopWorld().triggerSpin(targetEnchantId, onComplete);
  }

  public isEnchantSpinning(): boolean {
    return this.shopWorld?.isSpinning() ?? false;
  }

  public syncFusionRecipe(
    recipe: FusionRecipeDef,
    readyFlags: readonly boolean[],
    oreReadyFlags?: readonly boolean[],
    canFuse?: boolean
  ): void {
    this.ensureFusionWorld().syncRecipe(recipe, readyFlags, oreReadyFlags, canFuse);
  }

  public triggerFusionAnimation(recipe: FusionRecipeDef, onComplete: () => void): void {
    this.ensureFusionWorld().triggerFusionAnimation(recipe, onComplete);
  }

  public setFusionRevealHold(active: boolean): void {
    this.fusionWorld?.setRevealHold(active);
  }

  public isFusionAnimating(): boolean {
    return this.fusionWorld?.isAnimating() ?? false;
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
      this.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('mine');
      this.inputState.targetCamRadius = 20.4;
    }
  }

  public setTutorialChestZoom(zoomed: boolean): void {
    this.tutorialFocusChest = zoomed;
    this.tutorialFocusSellShop = false;
    if (zoomed) {
      this.focusedPlotIndex = null;
    } else {
      this.inputState.targetOrbitYaw = 0;
      this.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('mine');
      this.inputState.targetCamRadius = 20.4;
    }
  }

  public setTutorialSellShopZoom(zoomed: boolean): void {
    this.tutorialFocusSellShop = zoomed;
    this.tutorialFocusChest = false;
    if (zoomed) {
      this.focusedPlotIndex = null;
    }
  }

  public syncPlotUnitStats(
    slotIndex: number,
    dmg: number,
    speed: number,
    miningMult: number,
    critChance = 0.05,
    critMult = 2.25
  ): void {
    this.slotCombatStats.set(slotIndex, { dmg, speed, miningMult, critChance, critMult });
    this.plotAttackController.setSlotStats(slotIndex, dmg, speed, miningMult, critChance, critMult);
    if (this.mode === 'tower') this.syncTowerFighters();
  }

  public syncPlotEnchant(slotIndex: number, enchantId: string | null): void {
    if (slotIndex < 0 || slotIndex >= STAGE_PEDESTAL_COUNT) return;
    this.slotEnchants[slotIndex] = enchantId;
    this.pedestals[slotIndex]?.setEnchant(enchantId);
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
    this.lastSyncedPlazaChibiIds = [...chibiIds];
    this.shopWorld?.syncPlazaMiners(chibiIds);
  }

  public setPlotChibi(slotIndex: number, chibiId: string | null): void {
    const ped = this.pedestals[slotIndex];
    if (!ped) return;
    const def = chibiId ? getChibiById(chibiId) ?? null : null;
    ped.setChibi(def);
    const activeEnchant = def ? this.slotEnchants[slotIndex] ?? null : null;
    ped.setEnchant(activeEnchant);

    if (def) {
      this.plotAttackController.setSlotUnit(slotIndex, def, this.slotCombatStats.get(slotIndex));
    } else {
      this.plotAttackController.setSlotUnit(slotIndex, null);
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
    applyMineOverclockVisual({
      active,
      tier: nextTier,
      mode: this.mode,
      activePalette: this.activePalette,
      weatherFx: this.weatherFx,
      env: this.env,
      pit: this.pit,
      pedestals: this.pedestals,
      plotAttackController: this.plotAttackController,
      stageNeonMat: this.stageNeonMat,
      stageHoloMat: this.stageHoloMat,
      rimLight: this.rimLight,
      applyWeatherAtmosphere: () => this.applyWeatherAtmosphere(),
    });
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    this.impactFrameTimer = 0;
    this.speedLinesTimer = 0;
    this.impactPass.uniforms.uImpactStrength.value = 0;
    this.impactPass.uniforms.uSpeedLines.value = 0;
    this.bloomPass.strength = 0.12;
    applyMineGraphicsQuality({
      quality,
      anisoCap: this.getTextureAnisoCap(),
      scene: this.scene,
      renderer: this.renderer,
      bloomPass: this.bloomPass,
      sunLight: this.sunLight,
      weatherFx: this.weatherFx,
      env: this.env,
      pit: this.pit,
      towerArena: this.towerArena,
      omegaArena: this.omegaArena,
      pedestals: this.pedestals,
      plotAttackController: this.plotAttackController,
    });
  }

  public setModalBackdropThrottled(throttled: boolean): void {
    this.modalBackdropThrottled = throttled;
    if (!throttled) {
      this.lastThrottledRenderMs = 0;
    }
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
    this.plotAttackController.dispose();
    this.chestVisual.dispose();
    disposeObject3D(this.crateGroup);
    this.stageNeonMat.dispose();
    this.stageHoloMat.dispose();
    this.env.dispose();
    this.pit.dispose();
    this.shopWorld?.dispose();
    this.fusionWorld?.dispose();
    this.towerArena?.dispose();
    this.omegaArena?.dispose();
    this.weatherFx.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
