import * as THREE from 'three';
import { STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { PIT_CENTER_Z, PIT_FLOOR_Y, PIT_RADIUS, SWEET_SPOT_DMG_MULT } from './OrePit3D';
import { type PitEventKind } from '../game/PitEventsDomain';
import { getOverclockTierBuffs, type OverclockTier } from '../game/OverclockDomain';
import type { MineSceneCallbacks } from './MineScene3D';
import type { OrePit3D } from './OrePit3D';
import type { PlotPedestal3D } from './PlotPedestal3D';
import type { ShopWorld3D } from './ShopWorld3D';
import type { TowerArena3D } from './TowerArena3D';
import type { OmegaArena3D } from './OmegaArena3D';
import {
  applyCameraOrbitDrag,
  clampCameraZoomRadius,
  getDefaultOrbitPitchForMode,
  type SceneMode,
} from './MineSceneStage3D';

export const BASE_TAP_CRIT_CHANCE = 0.15;
export const OVERCLOCK_TAP_CRIT_CHANCE = 0.3;
export const TAP_CRIT_MULT = 2.5;
export const HOLD_MINE_INITIAL_DELAY_SEC = 0.22;
export const HOLD_MINE_INTERVAL_SEC = 0.18;

/** Advances hold-to-mine repeat timer and reports when a strike should fire. */
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

/** Rolls tap critical strike damage using Overclock crit tiers when active. */
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

export interface MineInputState {
  isDragging: boolean;
  dragMoved: boolean;
  dragPointerType: string;
  activePointerId: number | null;
  readonly activeTouchPoints: Map<number, { x: number; y: number }>;
  lastPinchDist: number | null;
  dragStartX: number;
  dragStartY: number;
  lastDragX: number;
  lastDragY: number;
  holdMineActive: boolean;
  holdMineElapsed: number;
  holdMineFiredInitial: boolean;
  holdMineClientX: number;
  holdMineClientY: number;
  targetOrbitYaw: number;
  targetOrbitPitch: number;
  targetCamRadius: number;
  cameraLocked: boolean;
  crateHovered: boolean;
  crateBounce: number;
  dragHighlightPlot: number | null;
}

export interface MineInputCtx {
  state: MineInputState;
  mountEl: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  pedestals: PlotPedestal3D[];
  pit: OrePit3D;
  getShopWorld: () => ShopWorld3D | null;
  getTowerArena: () => TowerArena3D | null;
  getOmegaArena: () => OmegaArena3D | null;
  clickableMeshes: THREE.Object3D[];
  callbacks: MineSceneCallbacks;
  getMode: () => SceneMode;
  isAdPaused: () => boolean;
  performMineTapAt: (clientX: number, clientY: number, preHit?: THREE.Object3D | null, isHold?: boolean) => boolean;
  emitDamageScreen: (dmg: number, wx: number, wy: number, wz: number, isClick: boolean, isCrit?: boolean) => void;
  onViewportResize: () => void;
}

export function getPitFloorHitInScene(ctx: MineInputCtx, clientX: number, clientY: number): { x: number; z: number } | null {
    const dom = ctx.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    ctx.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera);
    const dirY = ctx.raycaster.ray.direction.y;
    if (Math.abs(dirY) <= 0.001) return null;
    const t = (PIT_FLOOR_Y - ctx.raycaster.ray.origin.y) / dirY;
    if (t <= 0) return null;
    const px = ctx.raycaster.ray.origin.x + ctx.raycaster.ray.direction.x * t;
    const pz = ctx.raycaster.ray.origin.z + ctx.raycaster.ray.direction.z * t;
    const dx = px;
    const dz = pz - PIT_CENTER_Z;
    const maxHitR = PIT_RADIUS + 0.45;
    if (dx * dx + dz * dz <= maxHitR * maxHitR) {
      return { x: px, z: pz };
    }
    return null;
}

export function raycastAtInScene(ctx: MineInputCtx, clientX: number, clientY: number): THREE.Object3D | null {
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ctx.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ctx.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera);
    const targets =
      ctx.getMode() === 'mine'
        ? ctx.clickableMeshes
        : ctx.getMode() === 'shop'
          ? (ctx.getShopWorld()?.shopClickables ?? [])
          : ctx.getMode() === 'tower'
            ? (ctx.getTowerArena()?.getActiveClickables() ?? [])
            : ctx.getMode() === 'omega'
              ? (ctx.getOmegaArena()?.clickables ?? [])
              : [];
    if (!targets.length) return null;
    const hits = ctx.raycaster.intersectObjects(targets, false);
    const visibleHit = hits.find((h) => h.object.visible);
    return visibleHit ? visibleHit.object : null;
}

export function getPedestalAtClientPosInScene(ctx: MineInputCtx, clientX: number, clientY: number): number | null {
    if (ctx.getMode() !== 'mine') return null;
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    ctx.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ctx.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera);
    const pedMeshes = ctx.pedestals.map((p) => p.hitMesh);
    const hits = ctx.raycaster.intersectObjects(pedMeshes, false);
    if (!hits.length) return null;
    const slot = Number(hits[0].object.userData.slotIndex ?? -1);
    return slot >= 0 && slot < STAGE_PEDESTAL_COUNT ? slot : null;
}

export function bindMineSceneEvents(ctx: MineInputCtx): ResizeObserver | null {
  let mountResizeObserver: ResizeObserver | null = null;
    const dom = ctx.renderer.domElement;
    dom.style.touchAction = 'none';

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    const getTouchPinchDist = (): number | null => {
      if (ctx.state.activeTouchPoints.size < 2) return null;
      const pts = [...ctx.state.activeTouchPoints.values()];
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    dom.addEventListener('pointerdown', (e) => {
      if (ctx.isAdPaused()) return;
      if (e.pointerType !== 'touch' && e.button !== 0 && e.button !== 2) return;
      if (e.pointerType === 'touch') {
        ctx.state.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ctx.state.activeTouchPoints.size >= 2) {
          ctx.state.lastPinchDist = getTouchPinchDist();
          ctx.state.dragMoved = true;
          ctx.state.isDragging = false;
          ctx.state.activePointerId = null;
          ctx.state.holdMineActive = false;
          ctx.state.holdMineElapsed = 0;
          ctx.state.holdMineFiredInitial = false;
          return;
        }
      }
      ctx.state.isDragging = true;
      ctx.state.dragMoved = false;
      ctx.state.dragPointerType = e.pointerType || 'mouse';
      ctx.state.activePointerId = e.pointerId;
      ctx.state.dragStartX = e.clientX;
      ctx.state.dragStartY = e.clientY;
      ctx.state.lastDragX = e.clientX;
      ctx.state.lastDragY = e.clientY;
      ctx.state.holdMineActive = false;
      ctx.state.holdMineElapsed = 0;
      ctx.state.holdMineFiredInitial = false;
      if (ctx.getMode() === 'mine' && (e.button === 0 || e.pointerType === 'touch')) {
        const downHit = raycastAtInScene(ctx, e.clientX, e.clientY);
        const isOreTarget =
          downHit?.userData.kind === 'ore-node' ||
          (!downHit && getPitFloorHitInScene(ctx, e.clientX, e.clientY) !== null);
        if (isOreTarget) {
          ctx.state.holdMineActive = true;
          ctx.state.holdMineClientX = e.clientX;
          ctx.state.holdMineClientY = e.clientY;
        }
      }
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported in synthetic environments
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (ctx.isAdPaused()) {
        dom.classList.remove('mam-mining-cursor');
        return;
      }
      if (e.pointerType === 'touch' && ctx.state.activeTouchPoints.has(e.pointerId)) {
        ctx.state.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pinchDist = getTouchPinchDist();
        if (pinchDist !== null) {
          if (ctx.state.lastPinchDist !== null) {
            const pinchDelta = pinchDist - ctx.state.lastPinchDist;
            ctx.state.targetCamRadius = clampCameraZoomRadius(
              ctx.state.targetCamRadius - pinchDelta * 0.045,
              ctx.getMode()
            );
          }
          ctx.state.lastPinchDist = pinchDist;
          return;
        }
      }
      if (ctx.state.isDragging) {
        if (ctx.state.activePointerId !== null && e.pointerId !== ctx.state.activePointerId) return;
        const dx = e.clientX - ctx.state.lastDragX;
        const dy = e.clientY - ctx.state.lastDragY;
        const dragThreshold = ctx.state.dragPointerType === 'touch' ? 14 : 6;
        if (!ctx.state.dragMoved && Math.hypot(e.clientX - ctx.state.dragStartX, e.clientY - ctx.state.dragStartY) > dragThreshold) {
          ctx.state.dragMoved = true;
          ctx.state.holdMineActive = false;
          ctx.state.holdMineElapsed = 0;
          ctx.callbacks.onHoldMineChange?.(false);
          ctx.state.lastDragX = e.clientX;
          ctx.state.lastDragY = e.clientY;
          return;
        }
        if (ctx.state.holdMineActive) {
          ctx.state.holdMineClientX = e.clientX;
          ctx.state.holdMineClientY = e.clientY;
        }
        ctx.state.lastDragX = e.clientX;
        ctx.state.lastDragY = e.clientY;
        if (!ctx.state.dragMoved) return;
        const nextOrbit = applyCameraOrbitDrag({
          cameraLocked: ctx.state.cameraLocked,
          yaw: ctx.state.targetOrbitYaw,
          pitch: ctx.state.targetOrbitPitch,
          dx,
          dy,
          defaultPitch: getDefaultOrbitPitchForMode(ctx.getMode()),
        });
        ctx.state.targetOrbitYaw = nextOrbit.yaw;
        ctx.state.targetOrbitPitch = nextOrbit.pitch;
        return;
      }

      if (e.target !== dom) {
        dom.classList.remove('mam-mining-cursor');
        return;
      }

      const hit = raycastAtInScene(ctx, e.clientX, e.clientY);
      const hoveredSlot = hit?.userData.kind === 'pedestal' ? Number(hit.userData.slotIndex) : -1;
      const hoveredNode = hit?.userData.kind === 'ore-node' ? Number(hit.userData.nodeId) : -1;
      ctx.state.crateHovered = hit?.userData.kind === 'chest';
      ctx.pedestals.forEach((p, idx) => p.setHovered(idx === hoveredSlot || idx === ctx.state.dragHighlightPlot));
      ctx.pit.setHoveredNode(hoveredNode);

      let overMineArea =
        hoveredNode >= 0 || hit?.userData.kind === 'tower-ore' || hit?.userData.kind === 'tower-core';
      if (!overMineArea && ctx.getMode() === 'mine' && !ctx.state.crateHovered && hoveredSlot < 0) {
        overMineArea = getPitFloorHitInScene(ctx, e.clientX, e.clientY) !== null;
      }
      dom.classList.toggle('mam-mining-cursor', overMineArea);
    });

    const endDrag = (pointerId?: number): void => {
      if (pointerId !== undefined) {
        ctx.state.activeTouchPoints.delete(pointerId);
        if (ctx.state.activeTouchPoints.size < 2) {
          ctx.state.lastPinchDist = null;
        }
        try {
          if (dom.hasPointerCapture(pointerId)) dom.releasePointerCapture(pointerId);
        } catch {
          // Ignore
        }
      } else {
        ctx.state.activeTouchPoints.clear();
        ctx.state.lastPinchDist = null;
      }
      ctx.state.isDragging = false;
      ctx.state.activePointerId = null;
      ctx.state.holdMineActive = false;
      ctx.state.holdMineElapsed = 0;
      ctx.state.holdMineFiredInitial = false;
      ctx.callbacks.onHoldMineChange?.(false);
    };

    window.addEventListener('pointercancel', (e) => {
      if (e.pointerType === 'touch') {
        ctx.state.activeTouchPoints.delete(e.pointerId);
        if (ctx.state.activeTouchPoints.size < 2) ctx.state.lastPinchDist = null;
      }
      if (ctx.state.activePointerId === null || e.pointerId === ctx.state.activePointerId) {
        endDrag(e.pointerId);
      }
    });

    window.addEventListener('blur', () => endDrag());

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') {
        ctx.state.activeTouchPoints.delete(e.pointerId);
        if (ctx.state.activeTouchPoints.size < 2) ctx.state.lastPinchDist = null;
      }
      if (ctx.state.activePointerId !== null && e.pointerId !== ctx.state.activePointerId) return;
      const wasHoldMining = ctx.state.holdMineFiredInitial;
      const wasClick = ctx.state.isDragging && !ctx.state.dragMoved && !wasHoldMining && (e.button === 0 || e.pointerType === 'touch');
      endDrag(e.pointerId);
      if (!wasClick || ctx.isAdPaused()) return;

      if (e.target !== dom) {
        dom.classList.remove('mam-mining-cursor');
        return;
      }

      const hit = raycastAtInScene(ctx, e.clientX, e.clientY);
      if (!hit && ctx.getMode() === 'mine') {
        ctx.performMineTapAt(e.clientX, e.clientY, null);
        return;
      }
      if (!hit) return;
      if (hit.userData.kind === 'ore-node') {
        ctx.performMineTapAt(e.clientX, e.clientY, hit);
      } else if (hit.userData.kind === 'pedestal') {
        const slotIndex = Number(hit.userData.slotIndex ?? -1);
        ctx.pedestals[slotIndex]?.triggerChibiShowcase(1.4);
        ctx.callbacks.onPedestalClick?.(slotIndex);
      } else if (hit.userData.kind === 'chest') {
        ctx.state.crateBounce = 0.28;
        ctx.callbacks.onChestClick?.();
      } else if (hit.userData.kind === 'shop-pickaxe') {
        ctx.callbacks.onShopStationClick?.('pickaxe');
      } else if (hit.userData.kind === 'shop-sell') {
        ctx.callbacks.onShopStationClick?.('sell');
      } else if (hit.userData.kind === 'shop-gems') {
        ctx.callbacks.onShopStationClick?.('gems');
      } else if (hit.userData.kind === 'shop-altar') {
        ctx.callbacks.onShopStationClick?.('altar');
      } else if (hit.userData.kind === 'shop-tower') {
        ctx.callbacks.onShopStationClick?.('tower');
      } else if (hit.userData.kind === 'shop-forge') {
        ctx.callbacks.onShopStationClick?.('forge');
      } else if (hit.userData.kind === 'shop-omega-left') {
        ctx.callbacks.onShopStationClick?.('omega-left');
      } else if (hit.userData.kind === 'shop-omega-right') {
        ctx.callbacks.onShopStationClick?.('omega-right');
      } else if (hit.userData.kind === 'omega-target') {
        const targetId = String(hit.userData.targetId ?? '');
        if (targetId) ctx.callbacks.onOmegaTargetClick?.(targetId);
      } else if (hit.userData.kind === 'omega-boss') {
        ctx.callbacks.onOmegaBossClick?.();
      } else if (hit.userData.kind === 'tower-ore') {
        const oreIndex = Number(hit.userData.oreIndex ?? -1);
        const towerArena = ctx.getTowerArena();
        if (oreIndex >= 0 && towerArena) {
          const res = ctx.callbacks.onTowerTargetClick?.(oreIndex);
          if (res && res.dmg > 0) {
            towerArena.triggerOreHitBounce(oreIndex, Boolean(res.broken));
            const wp = towerArena.getOreWorldPos(oreIndex);
            ctx.emitDamageScreen(res.dmg, wp.x, wp.y + 0.35, wp.z, true, Boolean(res.isCrit));
          }
        }
      } else if (hit.userData.kind === 'tower-core') {
        const towerArena = ctx.getTowerArena();
        if (!towerArena) return;
        const isShieldBreak = towerArena.consumeBossSweetSpotTap();
        const res =
          ctx.callbacks.onTowerTargetClick?.(null, { isShieldBreak }) ??
          ctx.callbacks.onTowerMonolithClick?.();
        const shieldHit =
          res && (('shieldShaved' in res && res.shieldShaved) || ('shieldBroken' in res && res.shieldBroken));
        if (shieldHit) {
          towerArena.triggerBossShieldBreakFx();
        } else {
          towerArena.triggerHitBounce();
        }
        if (res && res.dmg > 0) {
          const wp = towerArena.getMonolithWorldPos();
          ctx.emitDamageScreen(
            res.dmg,
            wp.x,
            wp.y + 0.8,
            wp.z,
            true,
            'isCrit' in res ? Boolean(res.isCrit) : false
          );
        }
      }
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        if (ctx.isAdPaused()) return;
        e.preventDefault();
        ctx.state.targetCamRadius = clampCameraZoomRadius(ctx.state.targetCamRadius + e.deltaY * 0.01, ctx.getMode());
      },
      { passive: false }
    );

    window.addEventListener('resize', ctx.onViewportResize);
    window.visualViewport?.addEventListener('resize', ctx.onViewportResize);
    if (typeof ResizeObserver !== 'undefined') {
      mountResizeObserver = new ResizeObserver(ctx.onViewportResize);
      mountResizeObserver.observe(ctx.mountEl);
    }
  return mountResizeObserver;
}

export interface MineTapCtx {
  pit: OrePit3D;
  callbacks: MineSceneCallbacks;
  getMode: () => SceneMode;
  isAdPaused: () => boolean;
  getTapDamage: () => number;
  getOverclockActive: () => boolean;
  getOverclockTier: () => 0 | OverclockTier;
  inputCtx: () => MineInputCtx;
  projectWorldToScreen: (wx: number, wy: number, wz: number) => { x: number; y: number } | null;
  emitDamageScreen: (
    dmg: number,
    wx: number,
    wy: number,
    wz: number,
    isClick: boolean,
    isCrit?: boolean,
    pitEventKind?: PitEventKind,
    isMeteor?: boolean,
    isPerfect?: boolean
  ) => void;
}

  function executePitTapNodeInScene(ctx: MineTapCtx, 
    nodeId: number,
    wx: number,
    wy: number,
    wz: number,
    isHold: boolean
  ): boolean {
    const isPerfect = !isHold && ctx.pit.consumeSweetSpotTap(nodeId);
    const rolled = rollTapCriticalDamage(
      ctx.getTapDamage(),
      ctx.getOverclockActive(),
      Math.random,
      ctx.getOverclockTier()
    );
    const damage = isPerfect ? Math.max(1, Math.round(rolled.damage * SWEET_SPOT_DMG_MULT)) : rolled.damage;
    const fxOpts = isPerfect
      ? { accentColor: '#fde047', isPerfect: true }
      : isHold
        ? { accentColor: '#38bdf8' }
        : undefined;
    const res = ctx.pit.hitNode(nodeId, damage, true, isHold ? 5 : 4, fxOpts);
    if (!res) return false;

    ctx.emitDamageScreen(
      res.dmgDealt,
      wx,
      wy + 0.9,
      wz,
      true,
      rolled.isCrit || isPerfect,
      res.pitEventKind,
      res.isMeteor,
      isPerfect
    );
    if (res.broken) {
      const screenPos = ctx.projectWorldToScreen(wx, wy + 0.85, wz) ?? undefined;
      ctx.callbacks.onOreBroken?.(res.variantKey, res.meteorWeatherId, res.pitEventKind, screenPos);
    }
    return true;
  }

  export function performMineTapAtInScene(ctx: MineTapCtx, 
    clientX: number,
    clientY: number,
    preHit?: THREE.Object3D | null,
    isHold = false
  ): boolean {
    if (ctx.getMode() !== 'mine' || ctx.isAdPaused()) return false;
    const hit = preHit !== undefined ? preHit : raycastAtInScene(ctx.inputCtx(), clientX, clientY);
    if (hit && hit.userData.kind === 'ore-node') {
      const wp = new THREE.Vector3();
      hit.getWorldPosition(wp);
      return executePitTapNodeInScene(ctx, Number(hit.userData.nodeId || 0), wp.x, wp.y, wp.z, isHold);
    }
    if (!hit) {
      const pitPt = getPitFloorHitInScene(ctx.inputCtx(), clientX, clientY);
      if (pitPt) {
        const alive = ctx.pit.getAliveNodesInfo();
        if (alive.length > 0) {
          const nearby = alive.filter((n) => Math.hypot(n.worldX - pitPt.x, n.worldZ - pitPt.z) <= 6.5);
          const pool = nearby.length > 0 ? nearby : alive;
          let best = pool[0];
          for (let i = 1; i < pool.length; i++) {
            if (pool[i].hp > best.hp) best = pool[i];
          }
          return executePitTapNodeInScene(ctx, best.id, best.worldX, best.worldY, best.worldZ, isHold);
        }
      }
    }
    return false;
  }

