import * as THREE from 'three';
import { type PitEventKind } from '../game/PitEventsDomain';
import type { MineSceneCallbacks, OreHpScreen, PlotAnchorScreen, SceneMode } from './MineScene3D';
import type { FusionWorld3D } from './FusionWorld3D';
import type { ShopWorld3D } from './ShopWorld3D';
import type { OrePit3D } from './OrePit3D';
import type { PlotPedestal3D } from './PlotPedestal3D';
import type { TowerArena3D } from './TowerArena3D';
import type { OmegaArena3D } from './OmegaArena3D';

export interface MineProjectorCtx {
  mountEl: HTMLElement;
  getViewportSize?: () => { width: number; height: number };
  camera: THREE.PerspectiveCamera;
  projVec: THREE.Vector3;
  pit: OrePit3D;
  getTowerArena: () => TowerArena3D | null;
  getOmegaArena: () => OmegaArena3D | null;
  pedestals: PlotPedestal3D[];
  crateGroup: THREE.Group;
  callbacks: MineSceneCallbacks;
  getFocusedPlotIndex: () => number | null;
}

export class MineSceneProjector {
  private lastOverlayMode: SceneMode | null = null;

  constructor(private readonly ctx: MineProjectorCtx) {}

  private getViewportSize(): { width: number; height: number } {
    if (this.ctx.getViewportSize) return this.ctx.getViewportSize();
    return {
      width: this.ctx.mountEl.clientWidth || 1,
      height: this.ctx.mountEl.clientHeight || 1,
    };
  }

  public projectWorldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } | null {
    const { width: w, height: h } = this.getViewportSize();
    this.ctx.projVec.set(wx, wy, wz).project(this.ctx.camera);
    if (this.ctx.projVec.z <= -1 || this.ctx.projVec.z >= 1) return null;
    return {
      x: (this.ctx.projVec.x * 0.5 + 0.5) * w,
      y: (-this.ctx.projVec.y * 0.5 + 0.5) * h,
    };
  }

  public emitSweetSpot(): void {
    if (!this.ctx.callbacks.onSweetSpot) return;
    if (this.ctx.getFocusedPlotIndex() !== null) {
      this.ctx.callbacks.onSweetSpot(null);
      return;
    }
    const spot = this.ctx.pit.getSweetSpotState();
    if (!spot) {
      this.ctx.callbacks.onSweetSpot(null);
      return;
    }
    const pt = this.projectWorldToScreen(
      spot.worldX,
      spot.worldY + (spot.isMeteor ? 1.15 : 1.08),
      spot.worldZ
    );
    if (!pt) {
      this.ctx.callbacks.onSweetSpot(null);
      return;
    }
    this.ctx.callbacks.onSweetSpot({
      nodeId: spot.nodeId,
      x: pt.x,
      y: pt.y,
      progress: spot.progress,
      inWindow: spot.inWindow,
      isMeteor: spot.isMeteor,
    });
  }

  public emitTowerSweetSpot(): void {
    if (!this.ctx.callbacks.onSweetSpot) return;
    const spot = this.ctx.getTowerArena()?.getBossSweetSpotState() ?? null;
    if (!spot) {
      this.ctx.callbacks.onSweetSpot(null);
      return;
    }
    const pt = this.projectWorldToScreen(spot.worldX, spot.worldY, spot.worldZ);
    if (!pt) {
      this.ctx.callbacks.onSweetSpot(null);
      return;
    }
    this.ctx.callbacks.onSweetSpot({
      nodeId: -1,
      x: pt.x,
      y: pt.y,
      progress: spot.progress,
      inWindow: spot.inWindow,
      isMeteor: true,
      isTowerShield: true,
    });
  }

  public emitOreBars(): void {
    if (!this.ctx.callbacks.onOreBars) return;
    if (this.ctx.getFocusedPlotIndex() !== null) {
      this.ctx.callbacks.onOreBars([]);
      return;
    }
    const bars: OreHpScreen[] = [];
    for (const node of this.ctx.pit.getAliveNodesInfo()) {
      if (!node.isMeteor && !node.pitEventKind && node.hp >= node.maxHp) continue;
      const yOffset = node.isMeteor ? 2.22 : node.pitEventKind ? 2.28 : 1.92;
      const pt = this.projectWorldToScreen(node.worldX, node.worldY + yOffset, node.worldZ);
      if (!pt) continue;
      bars.push({
        id: node.id,
        x: pt.x,
        y: pt.y,
        hp: node.hp,
        maxHp: node.maxHp,
        variantKey: node.variantKey,
        isMeteor: node.isMeteor,
        meteorWeatherId: node.meteorWeatherId,
        pitEventKind: node.pitEventKind,
      });
    }
    this.ctx.callbacks.onOreBars(bars);
  }

  public emitDamageScreen(
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
    if (!this.ctx.callbacks.onOreDamage || dmg <= 0) return;
    const pt = this.projectWorldToScreen(wx, wy, wz);
    if (!pt) return;
    this.ctx.callbacks.onOreDamage(
      dmg,
      pt.x,
      pt.y,
      isClick,
      isCrit,
      pitEventKind,
      isMeteor,
      isPerfect,
      beatIndex,
      isFinisher
    );
  }

  public emitPlotAnchors(): void {
    if (!this.ctx.callbacks.onPlotAnchors) return;
    const { width: w, height: h } = this.getViewportSize();
    const anchors: PlotAnchorScreen[] = [];

    for (const ped of this.ctx.pedestals) {
      if (!ped.getChibi() || this.ctx.getFocusedPlotIndex() !== null) {
        anchors.push({ slotIndex: ped.index, labelX: 0, labelY: 0, btnX: 0, btnY: 0, visible: false });
        continue;
      }

      const p = ped.group.position;
      ped.getLabelAnchorWorldPosition(this.ctx.projVec, 0.13, false).project(this.ctx.camera);
      const labelVisible = this.ctx.projVec.z > -1 && this.ctx.projVec.z < 1;
      const labelX = (this.ctx.projVec.x * 0.5 + 0.5) * w;
      const labelY = (-this.ctx.projVec.y * 0.5 + 0.5) * h;

      this.ctx.projVec.set(p.x, p.y + 0.15, p.z + 0.92).project(this.ctx.camera);
      const btnVisible = this.ctx.projVec.z > -1 && this.ctx.projVec.z < 1;
      const btnX = (this.ctx.projVec.x * 0.5 + 0.5) * w;
      const btnY = (-this.ctx.projVec.y * 0.5 + 0.5) * h;

      anchors.push({
        slotIndex: ped.index,
        labelX,
        labelY,
        btnX,
        btnY,
        visible: labelVisible && btnVisible,
      });
    }

    this.ctx.callbacks.onPlotAnchors(anchors);

    if (this.ctx.callbacks.onChestAnchor) {
      const cPos = this.ctx.crateGroup.position;
      this.ctx.projVec.set(cPos.x, cPos.y + 1.35, cPos.z).project(this.ctx.camera);
      const visible = this.ctx.getFocusedPlotIndex() === null && this.ctx.projVec.z > -1 && this.ctx.projVec.z < 1;
      this.ctx.callbacks.onChestAnchor({
        x: (this.ctx.projVec.x * 0.5 + 0.5) * w,
        y: (-this.ctx.projVec.y * 0.5 + 0.5) * h,
        visible,
      });
    }
  }
  public emitModeOverlays(
    mode: SceneMode,
    shopWorld: ShopWorld3D | null,
    fusionWorld: FusionWorld3D | null
  ): void {
    const modeChanged = this.lastOverlayMode !== mode;
    if (modeChanged) {
      this.lastOverlayMode = mode;
      if (mode !== 'mine') {
        this.ctx.callbacks.onPlotAnchors?.([]);
        this.ctx.callbacks.onOreBars?.([]);
      }
      if (mode !== 'mine' && mode !== 'tower') {
        this.ctx.callbacks.onSweetSpot?.(null);
      }
      if (mode !== 'shop') {
        this.ctx.callbacks.onShopAnchors?.([]);
      }
      if (mode !== 'shop' && mode !== 'fusion') {
        this.ctx.callbacks.onShopChibiBubbles?.([]);
      }
      if (mode !== 'altar') {
        this.ctx.callbacks.onAltarAnchors?.([]);
      }
      if (mode !== 'tower') {
        this.ctx.callbacks.onTowerOreBars?.([]);
      }
      if (mode !== 'omega') {
        this.ctx.callbacks.onOmegaArenaOverlay?.(null);
      }
    }

    if (mode === 'mine') {
      this.emitPlotAnchors();
      this.emitOreBars();
      this.emitSweetSpot();
    } else if (mode === 'shop' && shopWorld) {
      const { width: w, height: h } = this.getViewportSize();
      this.ctx.callbacks.onShopAnchors?.(shopWorld.getShopAnchors(this.ctx.camera, w, h, this.ctx.projVec));
      this.ctx.callbacks.onShopChibiBubbles?.(shopWorld.getPlazaBubbleAnchors(this.ctx.camera, w, h));
    } else if (mode === 'altar' && shopWorld) {
      const { width: w, height: h } = this.getViewportSize();
      this.ctx.callbacks.onAltarAnchors?.(shopWorld.getAltarAnchors(this.ctx.camera, w, h, this.ctx.projVec));
    } else if (mode === 'tower') {
      this.emitTowerSweetSpot();
      const towerArena = this.ctx.getTowerArena();
      if (towerArena) {
        const { width: w, height: h } = this.getViewportSize();
        this.ctx.callbacks.onTowerOreBars?.(towerArena.getAliveOreScreenBars(this.ctx.camera, w, h, this.ctx.projVec));
      }
    } else if (mode === 'omega') {
      const omegaArena = this.ctx.getOmegaArena();
      if (omegaArena && this.ctx.callbacks.onOmegaArenaOverlay) {
        const { width: w, height: h } = this.getViewportSize();
        this.ctx.callbacks.onOmegaArenaOverlay({
          bossHead: omegaArena.getBossHeadScreenAnchor(this.ctx.camera, w, h),
          targets: omegaArena.getTargetScreenAnchors(this.ctx.camera, w, h),
        });
      }
    } else if (mode === 'fusion' && fusionWorld) {
      if (fusionWorld.isAnimating() || fusionWorld.isRevealHolding()) {
        this.ctx.callbacks.onShopChibiBubbles?.([]);
      } else {
        const { width: w, height: h } = this.getViewportSize();
        this.ctx.callbacks.onShopChibiBubbles?.(fusionWorld.getNpcBubbleAnchors(this.ctx.camera, w, h));
      }
    }
  }
}
