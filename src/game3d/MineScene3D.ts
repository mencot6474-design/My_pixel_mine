import * as THREE from 'three';
import { ChibiDef, getChibiById } from './ChibiCatalog';
import { FieldMiner3D } from './FieldMiner3D';
import { mountGlbProp, preloadCommonMineModels } from './GlbAssets3D';
import { MineEnvironment3D } from './MineEnvironment3D';
import { DEFAULT_WORLD_PALETTE, MineWorldPalette, OreVariantKey, STAGE_PEDESTAL_COUNT } from './MineWorldPalette';
import { OrePit3D } from './OrePit3D';
import { PlotPedestal3D } from './PlotPedestal3D';
import { getHazardStripeTexture } from './ProceduralTextures3D';
import { AltarPedestalAnchor, ShopStationAnchor, ShopStationId, ShopWorld3D } from './ShopWorld3D';
import { TowerArena3D, TowerFighterConfig, TowerOreBarScreen } from './TowerArena3D';
import { TowerWaveOreState } from '../game/TowerData';
import { getWeatherById, WeatherId } from '../game/WeatherData';
import { WeatherFx3D } from './WeatherFx3D';

export type SceneMode = 'mine' | 'shop' | 'altar' | 'tower';

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
}

export interface MineSceneCallbacks {
  onOreBroken?: (variantKey: OreVariantKey) => void;
  onOreDamage?: (dmg: number, screenX: number, screenY: number, isClick: boolean) => void;
  onChestClick?: () => void;
  onPedestalClick?: (slotIndex: number) => void;
  onPlotAnchors?: (anchors: PlotAnchorScreen[]) => void;
  onOreBars?: (bars: OreHpScreen[]) => void;
  onShopStationClick?: (station: ShopStationId) => void;
  onShopAnchors?: (anchors: ShopStationAnchor[]) => void;
  onAltarAnchors?: (anchors: AltarPedestalAnchor[]) => void;
  onTowerMonolithClick?: () => { dmg: number } | void;
  onTowerTargetClick?: (targetOreIndex: number | null) => { dmg: number; broken?: boolean } | void;
  onTowerFighterStrike?: (
    slotIndex: number,
    targetOreIndex: number | null,
    attackInterval: number
  ) => { dmg: number; broken?: boolean } | void;
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
  private readonly towerArena = new TowerArena3D();
  private readonly weatherFx = new WeatherFx3D();
  private readonly clickableMeshes: THREE.Object3D[] = [];
  private mode: SceneMode = 'mine';
  private dragHighlightPlot: number | null = null;
  private activePalette: MineWorldPalette = DEFAULT_WORLD_PALETTE;
  private activeWeatherId: WeatherId = 'light_rain';
  private tapDamage = 45;

  private readonly crateGroup = new THREE.Group();
  private readonly crateTrimMat: THREE.MeshStandardMaterial;
  private crateBounce = 0;
  private crateHovered = false;

  private elapsed = 0;
  private baseCamPos = new THREE.Vector3(0, 11.7, 15.6);
  private lookAtPos = new THREE.Vector3(0, 0.55, -0.55);
  private orbitYaw = 0;
  private orbitPitch = 0;
  private targetOrbitYaw = 0;
  private targetOrbitPitch = 0;
  private camRadius = 16.5;
  private targetCamRadius = 16.5;
  private isDragging = false;
  private dragMoved = false;
  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastDragX = 0;
  private lastDragY = 0;
  private rafId = 0;
  private lastTime = performance.now();
  private focusedPlotIndex: number | null = null;
  private currentLookAt = new THREE.Vector3(0, 0.55, -0.55);
  private readonly projVec = new THREE.Vector3();

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(this.renderer.domElement);

    // Bright Stylized Sunlight + Sky Fill Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    this.sunLight.position.set(11, 18, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 48;
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -12;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.55);
    this.rimLight.position.set(-12, 8, -10);
    this.scene.add(this.rimLight);

    preloadCommonMineModels();

    // 360 Stylized Quarry Island Environment backed by Kenney CC0 .glb assets
    this.env = new MineEnvironment3D(palette);
    this.scene.add(this.env.group);
    // Keep Sky Dome directly in scene so both Mine and Shop World share the weather sky
    this.scene.add(this.env.skyDome);

    // Elevated Carved Stone Terrace & Kenney Stairs in front of Rear Sanctuary Gate
    const rackDeck = new THREE.Mesh(
      new THREE.BoxGeometry(12.8, 0.26, 2.75),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.72,
        metalness: 0.1,
      })
    );
    rackDeck.position.set(0, 0.13, -4.55);
    rackDeck.receiveShadow = true;
    rackDeck.castShadow = true;
    this.env.group.add(rackDeck);

    const trimMat = new THREE.MeshStandardMaterial({
      map: getHazardStripeTexture(palette.crystalColor),
      roughness: 0.45,
    });
    for (const sx of [-1, 1]) {
      const rackFrontTrim = new THREE.Mesh(new THREE.BoxGeometry(5.13, 0.08, 0.14), trimMat);
      rackFrontTrim.position.set(sx * 3.865, 0.25, -3.18);
      this.env.group.add(rackFrontTrim);
    }

    // Center Stone Stairwell Bay
    const cheekMat = new THREE.MeshStandardMaterial({
      color: palette.cliffColor,
      roughness: 0.8,
      metalness: 0.12,
    });
    const copingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.52,
      metalness: 0.35,
    });
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.96, 1.36), cheekMat);
      cheek.position.set(sx * 1.32, -0.2, -2.52);
      cheek.castShadow = true;
      cheek.receiveShadow = true;

      const cheekCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 1.4), copingMat);
      cheekCap.position.set(sx * 1.32, 0.31, -2.52);
      cheekCap.castShadow = true;
      this.env.group.add(cheek, cheekCap);
    }

    mountGlbProp('/models/fantasy-town/stairs-wide-stone.glb', this.env.group, {
      position: [0, 0, -2.52],
      rotationY: Math.PI / 2,
      targetHeight: 0.94,
      scaleMultiplier: [1.38, 1.0, 2.55],
      alignBottomY: -0.68,
    });

    // 5 3D Stone Stage Pedestals on the rear terrace (chibi sprites ready to mount via setPlotChibi)
    for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
      const px = (i - (STAGE_PEDESTAL_COUNT - 1) / 2) * 2.15;
      const pz = -4.25;
      const ped = new PlotPedestal3D(i, px, pz);
      ped.group.position.y = 0.26;
      this.pedestals.push(ped);
      this.scene.add(ped.group);
      this.clickableMeshes.push(ped.hitMesh);
    }

    // Center Quarry Pit with 3D Ore & Crystal Nodes
    this.pit = new OrePit3D(palette);
    this.scene.add(this.pit.group);
    for (const m of this.pit.clickableMeshes) {
      this.clickableMeshes.push(m);
    }

    // Right Wing Treasure Chest Prop
    this.crateGroup.position.set(8.45, 0.27, 1.7);
    this.crateTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.25,
      roughness: 0.25,
    });
    const ringTrim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.055, 8, 24), this.crateTrimMat);
    ringTrim.rotation.x = Math.PI / 2;
    ringTrim.position.y = 0.04;
    this.crateGroup.add(ringTrim);

    mountGlbProp('/models/mini-dungeon/chest.glb', this.crateGroup, {
      position: [0, 0.02, 0],
      rotationY: -0.45,
      targetWidth: 0.96,
      alignBottomY: 0,
    });

    const crateHit = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 2.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    crateHit.position.y = 0.95;
    crateHit.userData = { kind: 'chest' };
    this.crateGroup.add(crateHit);

    this.scene.add(this.crateGroup);
    this.clickableMeshes.push(crateHit);

    this.scene.add(this.shopWorld.shopGroup);
    this.scene.add(this.shopWorld.altarGroup);
    this.scene.add(this.towerArena.group);
    this.scene.add(this.weatherFx.group);

    this.bindEvents();
    this.loop(performance.now());
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.isDragging = true;
      this.dragMoved = false;
      this.activePointerId = e.pointerId;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported in synthetic environments
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        const dx = e.clientX - this.lastDragX;
        const dy = e.clientY - this.lastDragY;
        if (!this.dragMoved && Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 6) {
          this.dragMoved = true;
        }
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
        this.targetOrbitYaw = Math.max(-1.35, Math.min(1.35, this.targetOrbitYaw - dx * 0.005));
        this.targetOrbitPitch = Math.max(-0.45, Math.min(0.42, this.targetOrbitPitch + dy * 0.004));
        return;
      }

      const hit = this.raycastAt(e.clientX, e.clientY);
      const hoveredSlot = hit?.userData.kind === 'pedestal' ? Number(hit.userData.slotIndex) : -1;
      const hoveredNode = hit?.userData.kind === 'ore-node' ? Number(hit.userData.nodeId) : -1;
      this.crateHovered = hit?.userData.kind === 'chest';
      this.pedestals.forEach((p, idx) => p.setHovered(idx === hoveredSlot || idx === this.dragHighlightPlot));
      this.pit.setHoveredNode(hoveredNode);
    });

    const endDrag = (pointerId?: number): void => {
      if (pointerId !== undefined) {
        try {
          if (dom.hasPointerCapture(pointerId)) dom.releasePointerCapture(pointerId);
        } catch {
          // Ignore
        }
      }
      this.isDragging = false;
      this.activePointerId = null;
    };

    window.addEventListener('pointercancel', (e) => {
      if (this.activePointerId === null || e.pointerId === this.activePointerId) {
        endDrag(e.pointerId);
      }
    });

    window.addEventListener('blur', () => endDrag());

    window.addEventListener('pointerup', (e) => {
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
      const wasClick = this.isDragging && !this.dragMoved && e.button === 0;
      endDrag(e.pointerId);
      if (!wasClick) return;

      const hit = this.raycastAt(e.clientX, e.clientY);
      if (!hit) return;
      if (hit.userData.kind === 'ore-node') {
        const res = this.pit.hitNode(Number(hit.userData.nodeId || 0), this.tapDamage, true);
        if (res) {
          const wp = new THREE.Vector3();
          hit.getWorldPosition(wp);
          this.emitDamageScreen(res.dmgDealt, wp.x, wp.y + 0.9, wp.z, true);
          if (res.broken) {
            this.callbacks.onOreBroken?.(res.variantKey);
          }
        }
      } else if (hit.userData.kind === 'pedestal') {
        const slotIndex = Number(hit.userData.slotIndex ?? -1);
        this.pedestals[slotIndex]?.triggerChibiShowcase(1.4);
        this.callbacks.onPedestalClick?.(slotIndex);
      } else if (hit.userData.kind === 'chest') {
        this.crateBounce = 0.28;
        this.callbacks.onChestClick?.();
      } else if (hit.userData.kind === 'shop-pickaxe') {
        this.callbacks.onShopStationClick?.('pickaxe');
      } else if (hit.userData.kind === 'shop-sell') {
        this.callbacks.onShopStationClick?.('sell');
      } else if (hit.userData.kind === 'shop-gems') {
        this.callbacks.onShopStationClick?.('gems');
      } else if (hit.userData.kind === 'shop-altar') {
        this.callbacks.onShopStationClick?.('altar');
      } else if (hit.userData.kind === 'shop-tower') {
        this.callbacks.onShopStationClick?.('tower');
      } else if (hit.userData.kind === 'tower-ore') {
        const oreIndex = Number(hit.userData.oreIndex ?? -1);
        if (oreIndex >= 0) {
          const res = this.callbacks.onTowerTargetClick?.(oreIndex);
          if (res && res.dmg > 0) {
            this.towerArena.triggerOreHitBounce(oreIndex, Boolean(res.broken));
            const wp = this.towerArena.getOreWorldPos(oreIndex);
            this.emitDamageScreen(res.dmg, wp.x, wp.y + 0.35, wp.z, true);
          }
        }
      } else if (hit.userData.kind === 'tower-core') {
        this.towerArena.triggerHitBounce();
        const res = this.callbacks.onTowerTargetClick?.(null) ?? this.callbacks.onTowerMonolithClick?.();
        if (res && res.dmg > 0) {
          const wp = this.towerArena.getMonolithWorldPos();
          this.emitDamageScreen(res.dmg, wp.x, wp.y + 0.8, wp.z, true);
        }
      }
    });

    window.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const maxRad = this.mode === 'shop' ? 38 : 28;
        this.targetCamRadius = Math.max(9, Math.min(maxRad, this.targetCamRadius + e.deltaY * 0.01));
      },
      { passive: false }
    );

    window.addEventListener('resize', () => {
      const w = Math.max(1, this.mountEl.clientWidth);
      const h = Math.max(1, this.mountEl.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  public getPedestalAtClientPos(clientX: number, clientY: number): number | null {
    if (this.mode !== 'mine') return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const pedMeshes = this.pedestals.map((p) => p.hitMesh);
    const hits = this.raycaster.intersectObjects(pedMeshes, false);
    if (!hits.length) return null;
    const slot = Number(hits[0].object.userData.slotIndex ?? -1);
    return slot >= 0 && slot < STAGE_PEDESTAL_COUNT ? slot : null;
  }

  public setDragHoveredPedestal(slotIndex: number | null): void {
    this.dragHighlightPlot = slotIndex;
    this.pedestals.forEach((p, idx) => p.setHovered(idx === slotIndex));
  }

  public pulsePedestal(slotIndex: number): void {
    this.pedestals[slotIndex]?.triggerChibiShowcase(1.4);
  }

  private raycastAt(clientX: number, clientY: number): THREE.Object3D | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets =
      this.mode === 'mine'
        ? this.clickableMeshes
        : this.mode === 'shop'
          ? this.shopWorld.shopClickables
          : this.mode === 'tower'
            ? this.towerArena.getActiveClickables()
            : [];
    if (!targets.length) return null;
    const hits = this.raycaster.intersectObjects(targets, false);
    const visibleHit = hits.find((h) => h.object.visible);
    return visibleHit ? visibleHit.object : null;
  }

  private loop = (now: number): void => {
    const rawDt = Math.max(0, (now - this.lastTime) / 1000);
    const dtSec = Math.min(rawDt, 0.05);
    this.lastTime = now;
    this.elapsed += dtSec;

    this.env.update(dtSec, this.elapsed);
    this.pedestals.forEach((p) => p.update(dtSec, this.elapsed, this.camera));
    this.pit.update(dtSec, this.elapsed, this.camera);
    this.shopWorld.update(dtSec, this.elapsed, this.mode, this.camera);
    this.towerArena.update(dtSec, this.elapsed, this.camera, (strike) => {
      const res = this.callbacks.onTowerFighterStrike?.(
        strike.slotIndex,
        strike.targetOreIndex,
        strike.attackInterval
      );
      const shownDmg = res ? res.dmg : strike.dmg;
      if (res && res.dmg > 0 && strike.targetOreIndex !== null) {
        this.towerArena.triggerOreHitBounce(strike.targetOreIndex, Boolean(res.broken));
      }
      if (shownDmg > 0) {
        this.emitDamageScreen(shownDmg, strike.wx, strike.wy, strike.wz, false);
      }
    });
    this.weatherFx.update(dtSec, this.elapsed, this.mode === 'mine' || this.mode === 'shop');

    const inMine = this.mode === 'mine';
    const hitCb = inMine
      ? (dmg: number, wx: number, wy: number, wz: number) => this.emitDamageScreen(dmg, wx, wy, wz, false)
      : undefined;

    for (const fm of this.fieldMiners.values()) {
      fm.update(dtSec, this.elapsed, this.camera, this.pit, this.callbacks.onOreBroken, hitCb, inMine);
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

    if (this.crateBounce > 0) {
      this.crateBounce = Math.max(0, this.crateBounce - dtSec * 1.4);
    }
    const crateScale = (this.crateHovered ? 1.09 : 1.0) + this.crateBounce * 0.45;
    this.crateGroup.scale.set(crateScale, Math.max(0.82, crateScale - this.crateBounce * 0.35), crateScale);
    this.crateTrimMat.emissiveIntensity = this.crateHovered ? 0.65 : 0.25;

    const damp = 1 - Math.exp(-dtSec * 16);
    if (this.focusedPlotIndex !== null && this.pedestals[this.focusedPlotIndex]) {
      const pPos = this.pedestals[this.focusedPlotIndex].group.position;
      const targetCam = new THREE.Vector3(pPos.x, pPos.y + 1.45, pPos.z + 3.85);
      const targetLook = new THREE.Vector3(pPos.x, pPos.y + 1.05, pPos.z);
      this.camera.position.lerp(targetCam, damp);
      this.currentLookAt.lerp(targetLook, damp);
      this.camera.lookAt(this.currentLookAt);
    } else {
      this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * damp;
      this.orbitPitch += (this.targetOrbitPitch - this.orbitPitch) * damp;
      this.camRadius += (this.targetCamRadius - this.camRadius) * damp;
      const camY = (this.baseCamPos.y + this.orbitPitch * 7) * (this.camRadius / 16.5);

      const targetCam = new THREE.Vector3(
        this.lookAtPos.x + Math.sin(this.orbitYaw) * this.camRadius,
        camY,
        this.lookAtPos.z + Math.cos(this.orbitYaw) * this.camRadius
      );
      this.camera.position.lerp(targetCam, damp);
      this.currentLookAt.lerp(this.lookAtPos, damp);
      this.camera.lookAt(this.currentLookAt);
    }

    this.env.updateSky(this.elapsed, this.camera.position);
    this.renderer.render(this.scene, this.camera);
    if (this.mode === 'mine') {
      this.emitPlotAnchors();
      this.emitOreBars();
      this.callbacks.onShopAnchors?.([]);
      this.callbacks.onAltarAnchors?.([]);
      this.callbacks.onTowerOreBars?.([]);
    } else if (this.mode === 'shop') {
      this.callbacks.onPlotAnchors?.([]);
      this.callbacks.onOreBars?.([]);
      const w = this.mountEl.clientWidth || 1;
      const h = this.mountEl.clientHeight || 1;
      this.callbacks.onShopAnchors?.(this.shopWorld.getShopAnchors(this.camera, w, h, this.projVec));
      this.callbacks.onAltarAnchors?.([]);
      this.callbacks.onTowerOreBars?.([]);
    } else if (this.mode === 'altar') {
      this.callbacks.onPlotAnchors?.([]);
      this.callbacks.onOreBars?.([]);
      this.callbacks.onShopAnchors?.([]);
      const w = this.mountEl.clientWidth || 1;
      const h = this.mountEl.clientHeight || 1;
      this.callbacks.onAltarAnchors?.(this.shopWorld.getAltarAnchors(this.camera, w, h, this.projVec));
      this.callbacks.onTowerOreBars?.([]);
    } else if (this.mode === 'tower') {
      this.callbacks.onPlotAnchors?.([]);
      this.callbacks.onOreBars?.([]);
      this.callbacks.onShopAnchors?.([]);
      this.callbacks.onAltarAnchors?.([]);
      const w = this.mountEl.clientWidth || 1;
      const h = this.mountEl.clientHeight || 1;
      this.callbacks.onTowerOreBars?.(this.towerArena.getAliveOreScreenBars(this.camera, w, h, this.projVec));
    } else {
      this.callbacks.onPlotAnchors?.([]);
      this.callbacks.onOreBars?.([]);
      this.callbacks.onShopAnchors?.([]);
      this.callbacks.onAltarAnchors?.([]);
      this.callbacks.onTowerOreBars?.([]);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private emitOreBars(): void {
    if (!this.callbacks.onOreBars) return;
    if (this.focusedPlotIndex !== null) {
      this.callbacks.onOreBars([]);
      return;
    }
    const w = this.mountEl.clientWidth || 1;
    const h = this.mountEl.clientHeight || 1;
    const bars: OreHpScreen[] = [];
    for (const node of this.pit.getAliveNodesInfo()) {
      if (node.hp >= node.maxHp) continue;
      this.projVec.set(node.worldX, node.worldY + 1.42, node.worldZ).project(this.camera);
      if (this.projVec.z <= -1 || this.projVec.z >= 1) continue;
      bars.push({
        id: node.id,
        x: (this.projVec.x * 0.5 + 0.5) * w,
        y: (-this.projVec.y * 0.5 + 0.5) * h,
        hp: node.hp,
        maxHp: node.maxHp,
        variantKey: node.variantKey,
      });
    }
    this.callbacks.onOreBars(bars);
  }

  private emitDamageScreen(dmg: number, wx: number, wy: number, wz: number, isClick: boolean): void {
    if (!this.callbacks.onOreDamage || dmg <= 0) return;
    const w = this.mountEl.clientWidth || 1;
    const h = this.mountEl.clientHeight || 1;
    this.projVec.set(wx, wy, wz).project(this.camera);
    if (this.projVec.z <= -1 || this.projVec.z >= 1) return;
    const sx = (this.projVec.x * 0.5 + 0.5) * w;
    const sy = (-this.projVec.y * 0.5 + 0.5) * h;
    this.callbacks.onOreDamage(dmg, sx, sy, isClick);
  }

  private emitPlotAnchors(): void {
    if (!this.callbacks.onPlotAnchors) return;
    const w = this.mountEl.clientWidth || 1;
    const h = this.mountEl.clientHeight || 1;
    const anchors: PlotAnchorScreen[] = [];

    for (const ped of this.pedestals) {
      if (!ped.getChibi() || this.focusedPlotIndex !== null) {
        anchors.push({ slotIndex: ped.index, labelX: 0, labelY: 0, btnX: 0, btnY: 0, visible: false });
        continue;
      }

      const p = ped.group.position;
      this.projVec.set(p.x, p.y + 2.18, p.z).project(this.camera);
      const labelVisible = this.projVec.z > -1 && this.projVec.z < 1;
      const labelX = (this.projVec.x * 0.5 + 0.5) * w;
      const labelY = (-this.projVec.y * 0.5 + 0.5) * h;

      this.projVec.set(p.x, p.y + 0.15, p.z + 0.92).project(this.camera);
      const btnVisible = this.projVec.z > -1 && this.projVec.z < 1;
      const btnX = (this.projVec.x * 0.5 + 0.5) * w;
      const btnY = (-this.projVec.y * 0.5 + 0.5) * h;

      anchors.push({
        slotIndex: ped.index,
        labelX,
        labelY,
        btnX,
        btnY,
        visible: labelVisible && btnVisible,
      });
    }

    this.callbacks.onPlotAnchors(anchors);
  }

  public setMode(mode: SceneMode): void {
    this.mode = mode;
    if (mode !== 'altar') {
      this.shopWorld.cancelSpin();
    }
    const isMine = mode === 'mine';
    this.towerArena.group.visible = mode === 'tower';
    this.env.group.visible = isMine;
    this.env.skyDome.visible = mode === 'mine' || mode === 'shop';
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
      this.targetOrbitYaw = 0;
      this.targetOrbitPitch = -0.18;
      this.targetCamRadius = 12.2;
      this.lookAtPos.set(0, 1.05, -2.4);
    } else if (mode === 'tower') {
      this.scene.background = new THREE.Color(0x020614);
      this.scene.fog = new THREE.Fog(0x040b1e, 38, 96);
      this.targetOrbitYaw = 0;
      this.targetOrbitPitch = -0.34;
      this.targetCamRadius = 16.4;
      this.lookAtPos.set(0, 2.25, -1.6);
      this.syncTowerFighters();
      this.towerArena.resetFloorCharge();
    } else if (mode === 'shop') {
      const aspect = this.camera.aspect || 1;
      this.targetOrbitYaw = 0;
      this.targetOrbitPitch = 0.02;
      this.targetCamRadius = aspect < 0.85 ? 37.6 : aspect < 1.15 ? 33.2 : 30.4;
      this.lookAtPos.set(0, 2.95, -2.9);
      this.applyWeatherAtmosphere();
    } else {
      this.targetOrbitYaw = 0;
      this.targetOrbitPitch = 0;
      this.targetCamRadius = 16.5;
      this.lookAtPos.set(0, 0.55, -0.55);
      this.applyWeatherAtmosphere();
    }
  }

  private applyWeatherAtmosphere(): void {
    const weather = getWeatherById(this.activeWeatherId);
    this.env.setWeatherSky(weather.id, weather.cloudHex);
    this.hemiLight.color.set(weather.hemiTintHex);
    this.hemiLight.intensity = weather.hemiIntensity;
    this.sunLight.intensity = weather.sunIntensity;
    this.rimLight.color.set(weather.rimTintHex);

    if (this.mode !== 'mine' && this.mode !== 'shop') return;
    const fogColor = new THREE.Color(weather.fogTintHex);
    this.scene.background = fogColor;
    // Softly blend distant terrain border into the sky shader's horizon mist band
    this.scene.fog =
      this.mode === 'shop' ? new THREE.Fog(fogColor, 46, 94) : new THREE.Fog(fogColor, 26, 72);
  }

  public setWeather(weatherId: WeatherId): void {
    this.activeWeatherId = weatherId;
    this.weatherFx.setWeather(weatherId);
    this.applyWeatherAtmosphere();
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
      this.pit.setPalette(palette, true);
      this.applyWeatherAtmosphere();
      this.callbacks.onOreBars?.([]);
    }
  }

  public setRespawnSpeedMult(mult: number): void {
    this.pit.setRespawnSpeedMult(mult);
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
  }): void {
    this.towerArena.syncWaveState(opts);
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

  public focusPlot(slotIndex: number | null): void {
    this.focusedPlotIndex = slotIndex;
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

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer.dispose();
  }
}
