import * as THREE from 'three';
import { type OverclockTier } from '../game/OverclockDomain';
import { type PitEventKind } from '../game/PitEventsDomain';
import { type WeatherId } from '../game/WeatherData';
import { type ProceduralChestHandle } from './CyberCargoPod3D';
import { type RiftGateHandle } from './RiftGate3D';
import type { FusionWorld3D } from './FusionWorld3D';
import type { MineEnvironment3D } from './MineEnvironment3D';
import type { MineInputState } from './MineSceneInput';
import type { OreVariantKey } from './MineWorldPalette';
import type { OmegaArena3D } from './OmegaArena3D';
import type { OrePit3D } from './OrePit3D';
import type { PlotAttackController3D } from './PlotAttackController3D';
import type { PlotPedestal3D } from './PlotPedestal3D';
import type { RiftArena3D } from './RiftArena3D';
import type { ShopWorld3D } from './ShopWorld3D';
import type { TowerArena3D } from './TowerArena3D';
import type { WeatherFx3D } from './WeatherFx3D';

export type SceneMode = 'mine' | 'shop' | 'altar' | 'fusion' | 'tower' | 'omega' | 'rift';

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
      return -0.22;
    case 'omega':
      return -0.32;
    case 'rift':
      return -0.24;
    default:
      return -0.18;
  }
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
  riftGate?: RiftGateHandle;
  pedestals: PlotPedestal3D[];
  plotAttackController: PlotAttackController3D;
  shopWorld: ShopWorld3D | null;
  fusionWorld: FusionWorld3D | null;
  towerArena: TowerArena3D | null;
  omegaArena: OmegaArena3D | null;
  riftArena?: RiftArena3D | null;
  ensureShopWorld: () => ShopWorld3D;
  ensureFusionWorld: () => FusionWorld3D;
  ensureTowerArena: () => TowerArena3D;
  ensureOmegaArena: () => OmegaArena3D;
  ensureRiftArena?: () => RiftArena3D;
  applyWeatherAtmosphere: () => void;
  syncTowerFighters: () => void;
  inputState: MineInputState;
  lookAtPos: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  baseCamPos: THREE.Vector3;
  setOrbitImmediate: (yaw: number, pitch: number, radius: number) => void;
}): void {
  const { mode } = ctx;
  const mineTier: 0 | OverclockTier = mode === 'mine' ? ctx.overclockTier : 0;
  ctx.weatherFx.setShopMode(mode === 'shop');
  ctx.weatherFx.setFeverTier(mineTier);
  ctx.env.setOverclockTier(mineTier);
  ctx.pit.setOverclockTier(mineTier);
  ctx.pedestals.forEach((p) => p.setOverclockTier(mineTier));
  if (mode !== 'mine' && mode !== 'tower') {
    ctx.renderer.domElement.classList.remove('mam-mining-cursor');
  }

  let shopWorld = ctx.shopWorld;
  let fusionWorld = ctx.fusionWorld;
  let towerArena = ctx.towerArena;
  let omegaArena = ctx.omegaArena;
  let riftArena = ctx.riftArena ?? null;

  if (mode !== 'altar') shopWorld?.cancelSpin();
  if (mode !== 'fusion') fusionWorld?.cancelAnimation();

  if (mode === 'shop' || mode === 'altar') shopWorld = ctx.ensureShopWorld();
  else if (mode === 'fusion') fusionWorld = ctx.ensureFusionWorld();
  else if (mode === 'tower') towerArena = ctx.ensureTowerArena();
  else if (mode === 'omega') omegaArena = ctx.ensureOmegaArena();
  else if (mode === 'rift' && ctx.ensureRiftArena) riftArena = ctx.ensureRiftArena();

  const isMine = mode === 'mine';
  if (shopWorld) {
    shopWorld.shopGroup.visible = mode === 'shop';
    shopWorld.altarGroup.visible = mode === 'altar';
  }
  if (fusionWorld) fusionWorld.group.visible = mode === 'fusion';
  if (towerArena) towerArena.group.visible = mode === 'tower';
  if (omegaArena) omegaArena.group.visible = mode === 'omega';
  if (riftArena) riftArena.group.visible = mode === 'rift';

  ctx.env.group.visible = isMine;
  ctx.env.skyDome.visible = mode === 'mine' || mode === 'shop';
  if (mode === 'mine' || mode === 'shop') {
    ctx.env.setSkyMode(mode);
  }
  ctx.pit.group.visible = isMine;
  ctx.crateGroup.visible = isMine;
  if (ctx.riftGate) ctx.riftGate.group.visible = isMine;
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
    const rawAspect = ctx.camera.aspect;
    const aspect = Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : 1;
    ctx.scene.background = new THREE.Color(0x7dd3fc);
    ctx.scene.fog = new THREE.Fog(0xbae6fd, 40, 108);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('tower');
    ctx.inputState.targetCamRadius = aspect < 0.85 ? 27.8 : aspect < 1.15 ? 24.8 : 23.6;
    ctx.lookAtPos.set(0, 1.5, -1.35);
    ctx.syncTowerFighters();
    towerArena?.resetFloorCharge();
  } else if (mode === 'omega') {
    ctx.scene.background = new THREE.Color(0xfda4af);
    ctx.scene.fog = new THREE.Fog(0xfecdd3, 38, 108);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('omega');
    ctx.inputState.targetCamRadius = 18.4;
    ctx.lookAtPos.set(0, 2.1, -1.5);
    ctx.syncTowerFighters();
  } else if (mode === 'rift') {
    ctx.scene.background = new THREE.Color(0x090418);
    ctx.scene.fog = new THREE.Fog(0x14082e, 42, 112);
    ctx.applyWeatherAtmosphere();
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('rift');
    ctx.inputState.targetCamRadius = 21.0;
    ctx.lookAtPos.set(0, 1.85, -1.5);
    ctx.syncTowerFighters();
    riftArena?.resetCombatState();
  } else if (mode === 'shop') {
    const rawAspect = ctx.camera.aspect;
    const aspect = Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : 1;
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('shop');
    ctx.inputState.targetCamRadius = aspect < 0.85 ? 37.6 : aspect < 1.15 ? 33.2 : 30.4;
    ctx.lookAtPos.set(0, 2.95, -2.9);
    ctx.applyWeatherAtmosphere();
  } else {
    ctx.inputState.targetOrbitYaw = 0;
    ctx.inputState.targetOrbitPitch = getDefaultOrbitPitchForMode('mine');
    ctx.inputState.targetCamRadius = 20.4;
    ctx.lookAtPos.set(0, 0.85, 0.15);
    ctx.applyWeatherAtmosphere();
  }

  if (ctx.modeChanged) {
    if (ctx.renderer.shadowMap?.enabled) {
      ctx.renderer.shadowMap.needsUpdate = true;
    }
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
  riftArena?: RiftArena3D | null;
  crateGroup: THREE.Group;
  chestVisual: ProceduralChestHandle;
  riftGate: RiftGateHandle;
  riftIsOpen: boolean;
  riftLabelText: string;
  inputState: MineInputState;
  onTowerFighterStrike?: (
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number,
    beatIndex?: number,
    isFinisher?: boolean
  ) => { dmg: number; broken?: boolean; isCrit?: boolean } | void;
  onOmegaFighterStrike?: (
    slotIndex: number,
    attackInterval: number,
    beatIndex?: number,
    isFinisher?: boolean
  ) => { dmg: number; isCrit?: boolean } | void;
  onRiftFighterStrike?: (
    slotIndex: number,
    attackInterval: number,
    isUltimate: boolean,
    beatIndex: number,
    isFinisher: boolean
  ) => { dmg: number; isCrit?: boolean } | void;
  onOmegaEntranceSlam: () => void;
  onOreBroken?: (
    variantKey: OreVariantKey,
    meteorWeatherId?: WeatherId,
    pitEventKind?: PitEventKind,
    screenPos?: { x: number; y: number }
  ) => void;
  emitDamageScreen: (
    dmg: number,
    wx: number,
    wy: number,
    wz: number,
    isClick: boolean,
    isCrit?: boolean,
    pitEventKind?: PitEventKind,
    isMeteor?: boolean,
    isPerfect?: boolean,
    beatIndex?: number,
    isFinisher?: boolean
  ) => void;
  projectWorldToScreen: (wx: number, wy: number, wz: number) => { x: number; y: number } | null;
}): void {
  const { mode, dtSec, rawDt, elapsed } = ctx;
  const inMine = mode === 'mine';
  const inShopOrAltar = mode === 'shop' || mode === 'altar';

  if (inMine) {
    ctx.env.update(dtSec, elapsed, ctx.inputState.crateHovered, ctx.inputState.crateBounce);
    ctx.riftGate.update(dtSec, elapsed, ctx.riftIsOpen, ctx.riftLabelText);
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
      const res = ctx.onTowerFighterStrike?.(
        strike.slotIndex,
        strike.targetOreIndex,
        strike.attackInterval,
        strike.beatIndex,
        strike.isFinisher
      );
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
        const res = ctx.onOmegaFighterStrike?.(
          strike.slotIndex,
          strike.attackInterval,
          strike.beatIndex,
          strike.isFinisher
        );
        const shownDmg = res ? res.dmg : strike.dmg;
        if (shownDmg > 0) {
          omegaArena.triggerBossHitEffect(strike.accentColor, Boolean(res?.isCrit));
          ctx.emitDamageScreen(shownDmg, strike.wx, strike.wy, strike.wz, false, Boolean(res?.isCrit));
        }
      },
      ctx.onOmegaEntranceSlam
    );
  } else if (mode === 'rift' && ctx.riftArena) {
    const riftArena = ctx.riftArena;
    riftArena.update(dtSec, elapsed, ctx.camera, (strike) => {
      const res = ctx.onRiftFighterStrike?.(
        strike.slotIndex,
        strike.attackInterval,
        strike.isUltimate,
        strike.beatIndex,
        strike.isFinisher
      );
      if (res && res.dmg > 0) {
        riftArena.triggerBossHit(strike.accentColor, Boolean(res.isCrit));
        ctx.emitDamageScreen(
          res.dmg,
          strike.wx,
          strike.wy,
          strike.wz,
          false,
          Boolean(res.isCrit),
          undefined,
          false,
          false,
          strike.beatIndex,
          strike.isFinisher
        );
      }
    });
  }
  ctx.weatherFx.update(dtSec, elapsed, inMine || mode === 'shop');

  const hitCb = inMine
    ? (
        dmg: number,
        wx: number,
        wy: number,
        wz: number,
        isMeteor?: boolean,
        isCrit?: boolean,
        beatIndex?: number,
        isFinisher?: boolean
      ) =>
        ctx.emitDamageScreen(
          dmg,
          wx,
          wy,
          wz,
          false,
          Boolean(isCrit),
          undefined,
          isMeteor,
          false,
          beatIndex,
          isFinisher
        )
    : undefined;
  const minerBreakCb = (
    variantKey: OreVariantKey,
    meteorWeatherId?: WeatherId,
    pitEventKind?: PitEventKind,
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
