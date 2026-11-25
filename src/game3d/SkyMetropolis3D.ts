import * as THREE from 'three';
import type { OverclockTier } from '../game/OverclockDomain';
import {
  createChamferSlabGeometry,
  disposeObject3D,
  mergeStaticMeshesByMaterial,
} from './MeshHelpers3D';
import type { MineWorldPalette } from './MineWorldPalette';
import { getBroadcastBannerTexture } from './ProceduralTextures3D';
import {
  appendGridBuildingWindows,
  BLIMP_HOLO_LABELS,
  buildCyberZeppelin,
  createGridDistrictSpecs,
  getCityMistTexture,
  getRooftopHoloSignTexture,
  getZeppelinHoloTickerTexture,
  type BlimpHoloLabel,
  type GridBuildingSpec,
  type GridWindowCollectors,
  type HoloBillboardLabel,
} from './SkyMetropolisAssets3D';

const BLIMP_HOLO_SWITCH_SEC = 4.2;
const BLIMP_START_X = 37.0;
const BLIMP_END_X = -37.0;
const BLIMP_BASE_Y = 2.95;
const BLIMP_BASE_Z = -21.5;
const BLIMP_SPEED = 2.65;
const BLIMP_PAUSE_SEC = 0.75;
const BLIMP_INITIAL_OFFSET_SEC = 4.2;

const VIADUCT_X_OFFSET = 16.0;
const VIADUCT_Y = -3.8;
const VIADUCT_Z_MIN = -48.0;
const VIADUCT_Z_MAX = 16.0;
const TRAINS_PER_SIDE = 5;

const HOLO_LABELS: readonly HoloBillboardLabel[] = ['MINE', 'CYBER', 'NEXUS'];
const UP_AXIS = new THREE.Vector3(0, 1, 0);

type DistrictZone = 'left' | 'right' | 'center';

interface MonorailTrainSpec {
  readonly x: number;
  readonly zStart: number;
  readonly speed: number;
  readonly dir: 1 | -1;
}

interface TrainCluster {
  readonly bodyInst: THREE.InstancedMesh;
  readonly glowInst: THREE.InstancedMesh;
  readonly trains: readonly MonorailTrainSpec[];
}

function disableRaycast(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    child.raycast = () => {};
  });
}

function resolveZone(x: number): DistrictZone {
  if (x <= -16.0) return 'left';
  if (x >= 16.0) return 'right';
  return 'center';
}

/**
 * Option A: Grid Neo-Tokyo Sky-District surrounding the Mining Sky-Stage.
 * Combines Omega Rooftop & Rift City architectural craftsmanship (rotY=0 chamfered towers,
 * 3D InstancedMesh window bays, cornices, setback penthouses, HVAC, comms masts, grounded billboards,
 * and dual elevated monorail viaducts) with the Cyber Zeppelin & per-world palette reactivity.
 * Separates Left/Right flanking skylines from the Central Vista Valley so central upper sky remains unobstructed.
 */
export class SkyMetropolis3D {
  public readonly group = new THREE.Group();

  private readonly cityGroup = new THREE.Group();
  private readonly blimpGroup = new THREE.Group();
  private readonly specs: GridBuildingSpec[];

  private readonly concreteMats: THREE.MeshStandardMaterial[];
  private readonly penthouseMat: THREE.MeshStandardMaterial;
  private readonly trimMetalMat: THREE.MeshStandardMaterial;
  private readonly windowFrameMat: THREE.MeshStandardMaterial;
  private readonly windowWarmMat: THREE.MeshStandardMaterial;
  private readonly windowAccentMat: THREE.MeshStandardMaterial;
  private readonly windowReflectMat: THREE.MeshStandardMaterial;
  private readonly viaductNeonMat: THREE.MeshStandardMaterial;
  private readonly trainBodyMat: THREE.MeshStandardMaterial;
  private readonly trainGlowMat: THREE.MeshStandardMaterial;
  private readonly beaconMat: THREE.MeshBasicMaterial;
  private readonly mistMat: THREE.MeshBasicMaterial;
  private readonly upperMistMesh: THREE.Mesh;

  private readonly instancedMeshes: THREE.InstancedMesh[] = [];
  private readonly beaconInsts: THREE.InstancedMesh[] = [];
  private readonly trainClusters: TrainCluster[] = [];
  private readonly trainDummy = new THREE.Object3D();
  private readonly rooftopSigns: THREE.Mesh[] = [];
  private readonly holoSignMats: Record<HoloBillboardLabel, THREE.MeshBasicMaterial>;

  private readonly blimpHullMat: THREE.MeshStandardMaterial;
  private readonly blimpTrimMat: THREE.MeshStandardMaterial;
  private readonly blimpScreenMat: THREE.MeshBasicMaterial;
  private readonly blimpBeaconMat: THREE.MeshBasicMaterial;
  private readonly blimpHoloBeamMat: THREE.MeshBasicMaterial;
  private readonly blimpFanRotors: THREE.Group[] = [];
  private readonly blimpEscortDrones: Array<{ group: THREE.Group; basePos: THREE.Vector3; phase: number }> = [];
  private readonly blimpFadableMats: Array<{ mat: THREE.Material; baseOpacity: number }> = [];

  private activeAccentHex: string;
  private overclockTier: 0 | OverclockTier = 0;
  private blimpScrollOffset = 0;
  private blimpHoloTimer = 0;
  private blimpHoloIndex = 0;
  private lowQuality = false;

  constructor(palette: MineWorldPalette) {
    this.activeAccentHex = palette.crystalColor;
    this.specs = createGridDistrictSpecs();

    // 1. Concrete & Structural Materials matching Omega Rooftop + Rift City readable low-poly contrast
    const concreteColors = [0x24324a, 0x2e3f5b, 0x364968, 0x435675];
    this.concreteMats = concreteColors.map(
      (hex) =>
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.68,
          metalness: 0.28,
          flatShading: true,
        })
    );
    this.penthouseMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.54,
      metalness: 0.36,
      flatShading: true,
    });
    this.trimMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.42,
      metalness: 0.65,
      flatShading: true,
    });

    // 2. 3D Window Bay & Viaduct Materials (bright emissive + fog:false on lit windows so skyline sparkles)
    this.windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.48,
      metalness: 0.6,
    });
    this.windowWarmMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.55,
      roughness: 0.2,
      fog: false,
    });
    this.windowAccentMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.75,
      roughness: 0.18,
      fog: false,
    });
    this.windowReflectMat = new THREE.MeshStandardMaterial({
      color: 0x3b5984,
      emissive: 0x1e3a5f,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.78,
    });
    this.viaductNeonMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.65,
      roughness: 0.18,
      metalness: 0.2,
      fog: false,
    });
    this.trainBodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.55,
      flatShading: true,
    });
    this.trainGlowMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });

    const makeSignMat = (label: HoloBillboardLabel) =>
      new THREE.MeshBasicMaterial({
        map: getRooftopHoloSignTexture(label, palette.crystalColor),
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        fog: false,
      });
    this.holoSignMats = {
      MINE: makeSignMat('MINE'),
      CYBER: makeSignMat('CYBER'),
      NEXUS: makeSignMat('NEXUS'),
    };

    // 3. Build Per-Zone Skyscrapers + Cornices + Penthouses + HVAC + Masts + Grounded Signs
    const staticGroups: Record<DistrictZone, THREE.Group> = {
      left: new THREE.Group(),
      right: new THREE.Group(),
      center: new THREE.Group(),
    };
    const zoneCollectors: Record<DistrictZone, GridWindowCollectors> = {
      left: { frameMatrices: [], warmMatrices: [], accentMatrices: [], reflectMatrices: [] },
      right: { frameMatrices: [], warmMatrices: [], accentMatrices: [], reflectMatrices: [] },
      center: { frameMatrices: [], warmMatrices: [], accentMatrices: [], reflectMatrices: [] },
    };
    const zoneBeacons: Record<DistrictZone, THREE.Vector3[]> = { left: [], right: [], center: [] };

    const tmpObj = new THREE.Object3D();
    const mastPoleGeo = new THREE.CylinderGeometry(0.04, 0.075, 2.2, 6);
    const hvacGeo = createChamferSlabGeometry(0.95, 0.55, 0.95, 0.08, 0.015);
    const signPanelGeo = new THREE.PlaneGeometry(3.5, 1.72);
    const signBackGeo = new THREE.BoxGeometry(3.66, 1.88, 0.14);
    const signPostGeo = new THREE.BoxGeometry(0.16, 0.95, 0.16);

    for (let i = 0; i < this.specs.length; i++) {
      const b = this.specs[i];
      const zone = resolveZone(b.x);
      const targetStatic = staticGroups[zone];
      const h = b.topY - b.baseY;

      const bodyGeo = createChamferSlabGeometry(b.w, h, b.d, 0.36, 0.04);
      const body = new THREE.Mesh(bodyGeo, this.concreteMats[b.matIdx]);
      // createChamferSlabGeometry has bottom at local y = 0 and top at local y = h
      body.position.set(b.x, b.baseY, b.z);
      body.receiveShadow = true;
      targetStatic.add(body);

      const rimGeo = createChamferSlabGeometry(b.w + 0.34, 0.34, b.d + 0.34, 0.38, 0.03);
      const rim = new THREE.Mesh(rimGeo, this.penthouseMat);
      rim.position.set(b.x, b.topY - 0.12, b.z);
      targetStatic.add(rim);

      // Sleek architectural neon crown band beneath the cornice on main skyline buildings
      if (b.topY > -3.5) {
        const crownNeonGeo = createChamferSlabGeometry(b.w + 0.38, 0.11, b.d + 0.38, 0.38, 0.015);
        const crownNeon = new THREE.Mesh(crownNeonGeo, this.viaductNeonMat);
        crownNeon.position.set(b.x, b.topY - 0.24, b.z);
        targetStatic.add(crownNeon);
      }

      let roofDeckY = b.topY + 0.22;
      if (b.penthouse) {
        const tier1W = b.w * 0.56;
        const tier1D = b.d * 0.56;
        const tier1H = 1.05;
        const tier1 = new THREE.Mesh(createChamferSlabGeometry(tier1W, tier1H, tier1D, 0.22, 0.025), this.penthouseMat);
        tier1.position.set(b.x, roofDeckY, b.z);
        targetStatic.add(tier1);
        roofDeckY += tier1H;

        if (b.tiers === 2) {
          const tier2W = tier1W * 0.62;
          const tier2D = tier1D * 0.62;
          const tier2H = 0.88;
          const tier2 = new THREE.Mesh(createChamferSlabGeometry(tier2W, tier2H, tier2D, 0.16, 0.02), this.trimMetalMat);
          tier2.position.set(b.x, roofDeckY, b.z);
          targetStatic.add(tier2);
          roofDeckY += tier2H;
        }
      }

      if (b.hvac) {
        const hvac = new THREE.Mesh(hvacGeo, this.trimMetalMat);
        hvac.position.set(b.x - b.w * 0.24, b.topY + 0.22, b.z + b.d * 0.2);
        targetStatic.add(hvac);
      }

      if (b.mast) {
        const mx = b.x + b.w * 0.14;
        const mz = b.z - b.d * 0.12;
        const mastMesh = new THREE.Mesh(mastPoleGeo, this.trimMetalMat);
        mastMesh.position.set(mx, roofDeckY + 1.1, mz);
        targetStatic.add(mastMesh);
        if (b.beacon) {
          zoneBeacons[zone].push(new THREE.Vector3(mx, roofDeckY + 2.26, mz));
        }
      }

      if (b.billboard) {
        const rotY = b.billboardRotY ?? 0;
        const signBase = new THREE.Vector3(b.x, roofDeckY, b.z);

        const strutL = new THREE.Mesh(signPostGeo, this.trimMetalMat);
        strutL.position.set(-1.15, 0.48, -0.06).applyAxisAngle(UP_AXIS, rotY).add(signBase);
        strutL.rotation.y = rotY;
        const strutR = new THREE.Mesh(signPostGeo, this.trimMetalMat);
        strutR.position.set(1.15, 0.48, -0.06).applyAxisAngle(UP_AXIS, rotY).add(signBase);
        strutR.rotation.y = rotY;
        const backing = new THREE.Mesh(signBackGeo, this.trimMetalMat);
        backing.position.set(0, 1.56, -0.09).applyAxisAngle(UP_AXIS, rotY).add(signBase);
        backing.rotation.y = rotY;
        targetStatic.add(strutL, strutR, backing);

        const signMesh = new THREE.Mesh(signPanelGeo, this.holoSignMats[b.billboard]);
        signMesh.position.set(0, 1.56, 0).applyAxisAngle(UP_AXIS, rotY).add(signBase);
        signMesh.rotation.y = rotY;
        this.cityGroup.add(signMesh);
        this.rooftopSigns.push(signMesh);
      }

      appendGridBuildingWindows(b, zoneCollectors[zone], tmpObj);
    }

    // 4. Dual Elevated Monorail Viaducts flanking the abyss canyon (x = ±17.2, y = -4.2)
    const viaductLen = VIADUCT_Z_MAX - VIADUCT_Z_MIN;
    const viaductCenterZ = (VIADUCT_Z_MIN + VIADUCT_Z_MAX) * 0.5;
    const viaductDeckGeo = createChamferSlabGeometry(2.05, 0.46, viaductLen, 0.12, 0.025);
    const viaductRailGeo = new THREE.BoxGeometry(0.11, 0.14, viaductLen);
    const viaductPierGeo = createChamferSlabGeometry(1.1, 24.0, 1.4, 0.14, 0.025);
    const trainBodyGeo = createChamferSlabGeometry(0.76, 0.56, 3.8, 0.14, 0.02);
    const trainGlowGeo = new THREE.BoxGeometry(0.8, 0.14, 3.92);
    trainGlowGeo.translate(0, 0.28, 0);
    const spanZ = VIADUCT_Z_MAX - VIADUCT_Z_MIN;

    for (const side of [-1, 1] as const) {
      const zone: DistrictZone = side < 0 ? 'left' : 'right';
      const vx = side * VIADUCT_X_OFFSET;
      const targetStatic = staticGroups[zone];

      const deck = new THREE.Mesh(viaductDeckGeo, this.trimMetalMat);
      deck.position.set(vx, VIADUCT_Y - 0.23, viaductCenterZ);
      targetStatic.add(deck);

      for (const railSide of [-0.94, 0.94] as const) {
        const rail = new THREE.Mesh(viaductRailGeo, this.viaductNeonMat);
        rail.position.set(vx + railSide, VIADUCT_Y + 0.25, viaductCenterZ);
        targetStatic.add(rail);
      }

      for (let pz = VIADUCT_Z_MIN + 6; pz <= VIADUCT_Z_MAX - 4; pz += 14) {
        const pier = new THREE.Mesh(viaductPierGeo, this.concreteMats[0]);
        pier.position.set(vx, VIADUCT_Y - 24.2, pz);
        targetStatic.add(pier);
      }

      const trains: MonorailTrainSpec[] = [];
      for (let t = 0; t < TRAINS_PER_SIDE; t++) {
        const trackOffset = t % 2 === 0 ? -0.46 : 0.46;
        trains.push({
          x: vx + trackOffset,
          zStart: VIADUCT_Z_MIN + ((t / TRAINS_PER_SIDE) * spanZ) % spanZ,
          speed: 4.8 + ((t + (side > 0 ? 1 : 0)) % 3) * 0.85,
          dir: trackOffset > 0 ? 1 : -1,
        });
      }
      const bodyInst = new THREE.InstancedMesh(trainBodyGeo, this.trainBodyMat, TRAINS_PER_SIDE);
      const glowInst = new THREE.InstancedMesh(trainGlowGeo, this.trainGlowMat, TRAINS_PER_SIDE);
      bodyInst.frustumCulled = false;
      glowInst.frustumCulled = false;
      this.cityGroup.add(bodyInst, glowInst);
      this.instancedMeshes.push(bodyInst, glowInst);
      this.trainClusters.push({ bodyInst, glowInst, trains });
    }
    this.updateMonorailTrains(0);

    for (const zone of ['left', 'right', 'center'] as const) {
      mergeStaticMeshesByMaterial(staticGroups[zone]);
      this.cityGroup.add(staticGroups[zone]);
    }

    // 5. InstancedMesh 3D Window Bays & Aviation Beacons per Zone (PlaneGeometry avoids z-occlusion!)
    const frameGeo = new THREE.PlaneGeometry(0.84, 1.08);
    const paneGeo = new THREE.PlaneGeometry(0.7, 0.92);
    const beaconGeo = new THREE.OctahedronGeometry(0.2, 0);

    const buildWindowInst = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      matrices: readonly THREE.Matrix4[]
    ): void => {
      if (matrices.length === 0) return;
      const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      this.cityGroup.add(inst);
      this.instancedMeshes.push(inst);
    };

    for (const zone of ['left', 'right', 'center'] as const) {
      const col = zoneCollectors[zone];
      buildWindowInst(frameGeo, this.windowFrameMat, col.frameMatrices);
      buildWindowInst(paneGeo, this.windowWarmMat, col.warmMatrices);
      buildWindowInst(paneGeo, this.windowAccentMat, col.accentMatrices);
      buildWindowInst(paneGeo, this.windowReflectMat, col.reflectMatrices);

      const bPositions = zoneBeacons[zone];
      if (bPositions.length > 0) {
        const bInst = new THREE.InstancedMesh(beaconGeo, this.beaconMat, bPositions.length);
        for (let i = 0; i < bPositions.length; i++) {
          tmpObj.position.copy(bPositions[i]);
          tmpObj.rotation.set(0, 0, 0);
          tmpObj.scale.set(1, 1, 1);
          tmpObj.updateMatrix();
          bInst.setMatrixAt(i, tmpObj.matrix);
        }
        bInst.instanceMatrix.needsUpdate = true;
        this.cityGroup.add(bInst);
        this.instancedMeshes.push(bInst);
        this.beaconInsts.push(bInst);
      }
    }

    // 6. 2-Layer Additive City Mist separating floating Sky-Stage from Abyss Canyon
    this.mistMat = new THREE.MeshBasicMaterial({
      map: getCityMistTexture(palette.crystalColor),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mistGeo = new THREE.RingGeometry(15.0, 56.0, 48);
    mistGeo.rotateX(-Math.PI / 2);

    const lowerMist = new THREE.Mesh(mistGeo, this.mistMat);
    lowerMist.position.set(0, -13.5, -14.0);
    this.upperMistMesh = new THREE.Mesh(mistGeo, this.mistMat);
    this.upperMistMesh.position.set(0, -7.2, -16.0);
    this.cityGroup.add(lowerMist, this.upperMistMesh);

    // 7. Broadcast Cyber Zeppelin ("MyChibiMine" curved LED banner + holographic ticker)
    const bannerTex = getBroadcastBannerTexture(palette.crystalColor, false);
    this.blimpHullMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.34,
      metalness: 0.56,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.blimpTrimMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.42,
      metalness: 0.58,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.blimpScreenMat = new THREE.MeshBasicMaterial({
      map: bannerTex,
      fog: false,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    this.blimpBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      fog: false,
      transparent: true,
      opacity: 0.96,
    });

    this.blimpFadableMats.push(
      { mat: this.blimpHullMat, baseOpacity: 1 },
      { mat: this.blimpTrimMat, baseOpacity: 1 },
      { mat: darkFrameMat, baseOpacity: 1 },
      { mat: this.blimpScreenMat, baseOpacity: 1 },
      { mat: this.blimpBeaconMat, baseOpacity: 0.96 }
    );

    const zeppelin = buildCyberZeppelin({
      blimpGroup: this.blimpGroup,
      hullMat: this.blimpHullMat,
      trimMat: this.blimpTrimMat,
      darkFrameMat,
      screenMat: this.blimpScreenMat,
      beaconMat: this.blimpBeaconMat,
      fadableMats: this.blimpFadableMats,
    });
    this.blimpFanRotors = zeppelin.fanRotors;
    this.blimpEscortDrones = zeppelin.escortDrones;
    this.blimpHoloBeamMat = zeppelin.holoBeamMat;

    this.blimpGroup.position.set(BLIMP_START_X, BLIMP_BASE_Y, BLIMP_BASE_Z);
    this.group.add(this.cityGroup, this.blimpGroup);
    disableRaycast(this.group);
    this.updateBlimpPlacement(0);
  }

  private updateMonorailTrains(elapsed: number): void {
    const span = VIADUCT_Z_MAX - VIADUCT_Z_MIN;
    for (const cluster of this.trainClusters) {
      for (let i = 0; i < cluster.trains.length; i++) {
        const t = cluster.trains[i];
        const rawOffset = (elapsed * t.speed * t.dir + (t.zStart - VIADUCT_Z_MIN)) % span;
        const wrapped = ((rawOffset % span) + span) % span;
        const z = VIADUCT_Z_MIN + wrapped;
        this.trainDummy.position.set(t.x, VIADUCT_Y + 0.24, z);
        this.trainDummy.rotation.set(0, t.dir > 0 ? 0 : Math.PI, 0);
        this.trainDummy.scale.set(1, 1, 1);
        this.trainDummy.updateMatrix();
        cluster.bodyInst.setMatrixAt(i, this.trainDummy.matrix);
        cluster.glowInst.setMatrixAt(i, this.trainDummy.matrix);
      }
      cluster.bodyInst.instanceMatrix.needsUpdate = true;
      cluster.glowInst.instanceMatrix.needsUpdate = true;
    }
  }

  private updateBlimpPlacement(elapsed: number): void {
    const travelDist = BLIMP_START_X - BLIMP_END_X;
    const travelSec = travelDist / BLIMP_SPEED;
    const cycleSec = travelSec + BLIMP_PAUSE_SEC;
    const cyclePos = (elapsed + BLIMP_INITIAL_OFFSET_SEC) % cycleSec;

    if (cyclePos >= travelSec) {
      this.blimpGroup.visible = false;
      this.blimpGroup.position.set(BLIMP_START_X, BLIMP_BASE_Y, BLIMP_BASE_Z);
      return;
    }

    this.blimpGroup.visible = true;
    const x = BLIMP_START_X - cyclePos * BLIMP_SPEED;
    const y = BLIMP_BASE_Y + Math.sin(elapsed * 0.95) * 0.22;
    this.blimpGroup.position.set(x, y, BLIMP_BASE_Z);
    this.blimpGroup.rotation.z = Math.sin(elapsed * 0.85) * 0.022;

    const enterFade = THREE.MathUtils.clamp((BLIMP_START_X - x) / 4.8, 0, 1);
    const exitFade = THREE.MathUtils.clamp((x - BLIMP_END_X) / 4.8, 0, 1);
    const edgeAlpha = Math.min(enterFade, exitFade);
    for (const entry of this.blimpFadableMats) {
      (entry.mat as { opacity: number }).opacity = entry.baseOpacity * edgeAlpha;
    }
  }

  public getBuildingCount(): number {
    return this.specs.length;
  }

  public getBuildingSpecs(): readonly GridBuildingSpec[] {
    return this.specs;
  }

  public getBlimpWorldPosition(): THREE.Vector3 {
    return this.blimpGroup.position;
  }

  public isScreenFogDisabled(): boolean {
    return this.blimpScreenMat.fog === false;
  }

  public getCurrentBlimpHoloLabel(): BlimpHoloLabel {
    return BLIMP_HOLO_LABELS[this.blimpHoloIndex] ?? BLIMP_HOLO_LABELS[0];
  }

  private getActiveBlimpAccent(): { accent: string; feverActive: boolean } {
    const feverActive = this.overclockTier > 0;
    const accent =
      this.overclockTier === 3
        ? '#22d3ee'
        : this.overclockTier === 2
          ? '#fb7185'
          : this.overclockTier === 1
            ? '#fbbf24'
            : this.activeAccentHex;
    return { accent, feverActive };
  }

  private refreshHoloTickerTexture(): void {
    const { accent, feverActive } = this.getActiveBlimpAccent();
    const label = this.getCurrentBlimpHoloLabel();
    this.blimpHoloBeamMat.map = getZeppelinHoloTickerTexture(label, accent, feverActive);
    this.blimpHoloBeamMat.needsUpdate = true;
  }

  public setPalette(palette: MineWorldPalette): void {
    this.activeAccentHex = palette.crystalColor;

    this.windowAccentMat.color.set(palette.crystalColor);
    this.windowAccentMat.emissive.set(palette.crystalColor);
    this.viaductNeonMat.color.set(palette.crystalColor);
    this.viaductNeonMat.emissive.set(palette.crystalColor);
    this.trainGlowMat.color.set(palette.crystalColor);
    this.trainGlowMat.emissive.set(palette.crystalColor);

    this.mistMat.map = getCityMistTexture(palette.crystalColor);
    this.mistMat.needsUpdate = true;

    for (const label of HOLO_LABELS) {
      this.holoSignMats[label].map = getRooftopHoloSignTexture(label, palette.crystalColor);
      this.holoSignMats[label].needsUpdate = true;
    }

    this.refreshBannerTexture();
  }

  public setOverclockTier(tier: 0 | OverclockTier): void {
    if (this.overclockTier === tier) return;
    this.overclockTier = tier;
    this.refreshBannerTexture();
  }

  private refreshBannerTexture(): void {
    const { accent, feverActive } = this.getActiveBlimpAccent();
    const nextTex = getBroadcastBannerTexture(accent, feverActive);
    nextTex.offset.x = this.blimpScrollOffset;
    this.blimpScreenMat.map = nextTex;
    this.blimpScreenMat.needsUpdate = true;

    this.blimpTrimMat.color.set(accent);
    this.blimpTrimMat.emissive.set(accent);
    this.blimpTrimMat.emissiveIntensity = feverActive ? 1.7 : 1.2;
    this.refreshHoloTickerTexture();

    const windowBoost = feverActive ? 0.45 : 0;
    this.windowWarmMat.emissiveIntensity = 1.55 + windowBoost * 0.6;
    this.windowAccentMat.emissiveIntensity = 1.75 + windowBoost;
    this.viaductNeonMat.emissiveIntensity = 1.65 + windowBoost;
    this.trainGlowMat.emissiveIntensity = 1.65 + windowBoost;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.mistMat.opacity = low ? 0.12 : 0.22;
    this.upperMistMesh.visible = !low;
    for (const bInst of this.beaconInsts) {
      bInst.visible = !low;
    }
    for (const cluster of this.trainClusters) {
      cluster.bodyInst.visible = !low;
      cluster.glowInst.visible = !low;
    }
    for (const signMesh of this.rooftopSigns) {
      signMesh.visible = !low;
    }
  }

  public update(dtSec: number, elapsed: number): void {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    this.updateBlimpPlacement(elapsed);

    // Smooth marquee UV scroll across the curved MyChibiMine LED banner
    this.blimpScrollOffset = (this.blimpScrollOffset + safeDt * (this.overclockTier > 0 ? 0.24 : 0.15)) % 1;
    if (this.blimpScreenMat.map) {
      this.blimpScreenMat.map.offset.x = this.blimpScrollOffset;
    }

    // Cycle holographic label beneath the Zeppelin LED TV every ~4.2s
    this.blimpHoloTimer += safeDt;
    if (this.blimpHoloTimer >= BLIMP_HOLO_SWITCH_SEC) {
      this.blimpHoloTimer %= BLIMP_HOLO_SWITCH_SEC;
      if (BLIMP_HOLO_LABELS.length > 1) {
        const step = 1 + Math.floor(Math.random() * (BLIMP_HOLO_LABELS.length - 1));
        this.blimpHoloIndex = (this.blimpHoloIndex + step) % BLIMP_HOLO_LABELS.length;
        this.refreshHoloTickerTexture();
      }
    }

    if (this.lowQuality) {
      return;
    }

    // Spin 4 zeppelin turbofan rotors & bank escort drones
    const rotorSpeed = this.overclockTier > 0 ? 16 : 11;
    for (const rotor of this.blimpFanRotors) {
      rotor.rotation.x += safeDt * rotorSpeed;
    }
    for (const drone of this.blimpEscortDrones) {
      drone.group.position.y = drone.basePos.y + Math.sin(elapsed * 2.4 + drone.phase) * 0.28;
      drone.group.position.z = drone.basePos.z + Math.cos(elapsed * 1.5 + drone.phase) * 0.22;
      drone.group.rotation.x = Math.sin(elapsed * 2.1 + drone.phase) * 0.16;
    }

    // Pulse navigation beacon & city aviation strobes
    const pulse = 0.55 + 0.45 * Math.sin(elapsed * 4.4);
    this.blimpBeaconMat.color.setRGB(1, 0.78 + pulse * 0.22, 0.65 + pulse * 0.35);
    const cityStrobe = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * 3.1));
    this.beaconMat.opacity = 0.35 + cityStrobe * 0.65;

    this.updateMonorailTrains(elapsed);
  }

  public dispose(): void {
    for (const inst of this.instancedMeshes) {
      inst.dispose();
    }
    disposeObject3D(this.group);
  }
}
