import * as THREE from 'three';
import type { OverclockTier } from '../game/OverclockDomain';
import { disposeObject3D } from './ChestVaultStation3D';
import type { MineWorldPalette } from './MineWorldPalette';
import { getBroadcastBannerTexture, getSkyscraperFacadeTexture } from './ProceduralTextures3D';
import {
  buildCyberZeppelin,
  createSkyscraperShaftGeometry,
  getCityMistTexture,
  getRooftopHoloSignTexture,
  getSearchlightBeamTexture,
  getSkyscraperVariantTexture,
  type HoloBillboardLabel,
} from './SkyMetropolisAssets3D';

type TowerArchetype = 0 | 1 | 2; // 0: Curtain Megatower, 1: Diagrid Tower, 2: Octagonal Arcology

interface SkyscraperSeed {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  rotY: number;
  archetype: TowerArchetype;
  hasSetback: boolean;
  setbackH: number;
  hasFins: boolean;
  hasCrown: boolean;
  hasRing: boolean;
  hasAntenna: boolean;
  holoLabel: HoloBillboardLabel | null;
}

interface SearchlightBeam {
  pivot: THREE.Group;
  phase: number;
  speed: number;
  baseRoll: number;
  basePitch: number;
}

interface SkyTrafficVehicle {
  laneRadiusX: number;
  laneRadiusZ: number;
  centerZ: number;
  y: number;
  angle: number;
  speed: number;
  scaleX: number;
}

interface HoloBillboardEntry {
  mesh: THREE.Mesh;
  label: HoloBillboardLabel;
  baseY: number;
  phase: number;
}

const CITY_BASE_Y = -42;
const BLIMP_START_X = 37.0;
const BLIMP_END_X = -37.0;
const BLIMP_BASE_Y = 2.95;
const BLIMP_BASE_Z = -21.5;
const BLIMP_SPEED = 2.65;
const BLIMP_PAUSE_SEC = 0.75;
const BLIMP_INITIAL_OFFSET_SEC = 4.2;

const HOLO_LABELS: readonly HoloBillboardLabel[] = ['MINE', 'CYBER', 'NEXUS'];

function disableRaycast(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    child.raycast = () => {};
  });
}

function buildCitySeeds(): SkyscraperSeed[] {
  const seeds: SkyscraperSeed[] = [];
  const rings: Array<{
    count: number;
    rx: number;
    rz: number;
    cz: number;
    minTop: number;
    maxTop: number;
    wRange: [number, number];
  }> = [
    // Deep abyss core towers below the floating pit & void shards
    { count: 14, rx: 11.2, rz: 9.2, cz: 0.5, minTop: -14.0, maxTop: -8.5, wRange: [2.3, 3.6] },
    // Mid-ring metropolitan towers framing the floating arena perimeter
    { count: 20, rx: 21.0, rz: 17.5, cz: -4.5, minTop: -10.2, maxTop: -4.4, wRange: [2.7, 4.2] },
    // Outer skyline canyon with soaring lateral supertall flanks
    { count: 24, rx: 36.0, rz: 25.0, cz: -18.5, minTop: -7.0, maxTop: -2.4, wRange: [3.0, 4.8] },
    // Deep horizon megatowers
    { count: 10, rx: 40.0, rz: 14.0, cz: -36.0, minTop: -5.2, maxTop: -0.6, wRange: [3.6, 5.4] },
  ];

  let idx = 0;
  let holoCount = 0;
  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.43;
      // Keep the elevated camera lens corridor clear
      if (rIdx >= 2 && Math.sin(a) > 0.46 && Math.abs(Math.cos(a)) < 0.62) continue;
      const jitterR = 0.84 + ((idx * 19) % 7) * 0.05;
      const x = Math.cos(a) * ring.rx * jitterR;
      const z = ring.cz + Math.sin(a) * ring.rz * jitterR;

      let topY = ring.minTop + (((idx * 29 + 7) % 11) / 10) * (ring.maxTop - ring.minTop);
      // Raise outer lateral flanks (|x| >= 16.5) into dramatic canyon spires while keeping central upper sky clear (max < 4.2)
      if (rIdx >= 2 && Math.abs(x) >= 16.5 && z < -8) {
        topY = Math.min(0.6, topY + 2.0 + ((idx * 17) % 5) * 0.42);
      }

      const w = ring.wRange[0] + (((idx * 13) % 5) / 4) * (ring.wRange[1] - ring.wRange[0]);
      const d = w * (0.84 + ((idx * 7) % 4) * 0.11);
      const archetype = (idx % 3) as TowerArchetype;
      const hasSetback = rIdx >= 1 && idx % 4 !== 3;
      const setbackH = hasSetback ? 2.4 + ((idx * 11) % 4) * 0.65 : 0;
      const hasFins = hasSetback && idx % 3 !== 2;
      const hasCrown = archetype === 2 || idx % 4 !== 3;
      const hasRing = true;
      const hasAntenna = topY > -11.5 && (idx % 2 === 1 || idx % 3 === 0);

      let holoLabel: HoloBillboardLabel | null = null;
      if (rIdx >= 1 && z < -6 && Math.abs(x) > 9.5 && topY > -6.5 && holoCount < 8 && idx % 3 === 1) {
        holoLabel = HOLO_LABELS[holoCount % HOLO_LABELS.length];
        holoCount += 1;
      }

      seeds.push({
        x,
        z,
        w,
        d,
        topY,
        rotY: (idx % 4) * (Math.PI * 0.25),
        archetype,
        hasSetback,
        setbackH,
        hasFins,
        hasCrown,
        hasRing,
        hasAntenna,
        holoLabel,
      });
      idx += 1;
    }
  }
  return seeds;
}

export class SkyMetropolis3D {
  public readonly group = new THREE.Group();

  private readonly cityGroup = new THREE.Group();
  private readonly blimpGroup = new THREE.Group();
  private readonly seeds: SkyscraperSeed[];

  private readonly curtainMat: THREE.MeshStandardMaterial;
  private readonly diagridMat: THREE.MeshStandardMaterial;
  private readonly megacorpMat: THREE.MeshStandardMaterial;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly cityNeonMat: THREE.MeshBasicMaterial;
  private readonly beaconMat: THREE.MeshBasicMaterial;
  private readonly searchlightMat: THREE.MeshBasicMaterial;
  private readonly mistMat: THREE.MeshBasicMaterial;

  private readonly curtainShaftInst: THREE.InstancedMesh;
  private readonly diagridShaftInst: THREE.InstancedMesh;
  private readonly octaShaftInst: THREE.InstancedMesh;
  private readonly setbackInst: THREE.InstancedMesh;
  private readonly finInst: THREE.InstancedMesh;
  private readonly crownInst: THREE.InstancedMesh;
  private readonly rooftopMechInst: THREE.InstancedMesh;
  private readonly ringInst: THREE.InstancedMesh;
  private readonly octaTrimInst: THREE.InstancedMesh;
  private readonly antennaInst: THREE.InstancedMesh;
  private readonly beaconInst: THREE.InstancedMesh;
  private readonly skyTrafficInst: THREE.InstancedMesh;

  private readonly skyTraffic: SkyTrafficVehicle[] = [];
  private readonly trafficDummy = new THREE.Object3D();
  private readonly searchlights: SearchlightBeam[] = [];
  private readonly holoBillboards: HoloBillboardEntry[] = [];
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
  private lowQuality = false;

  constructor(palette: MineWorldPalette) {
    this.activeAccentHex = palette.crystalColor;
    this.seeds = buildCitySeeds();

    const curtainTex = getSkyscraperFacadeTexture(palette.crystalColor);
    const diagridTex = getSkyscraperVariantTexture('diagrid', palette.crystalColor);
    const megacorpTex = getSkyscraperVariantTexture('megacorp', palette.crystalColor);

    const makeTowerMat = (tex: THREE.Texture, emissiveIntensity: number) =>
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        map: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: tex,
        emissiveIntensity,
        roughness: 0.48,
        metalness: 0.38,
        flatShading: true,
      });

    this.curtainMat = makeTowerMat(curtainTex, 0.78);
    this.diagridMat = makeTowerMat(diagridTex, 0.82);
    this.megacorpMat = makeTowerMat(megacorpTex, 0.88);
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0x111b30,
      roughness: 0.42,
      metalness: 0.52,
      flatShading: true,
    });
    this.cityNeonMat = new THREE.MeshBasicMaterial({
      color: palette.crystalColor,
      transparent: true,
      opacity: 0.92,
    });
    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      fog: false,
      transparent: true,
      opacity: 0.95,
    });
    this.searchlightMat = new THREE.MeshBasicMaterial({
      color: palette.crystalColor,
      map: getSearchlightBeamTexture(),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mistMat = new THREE.MeshBasicMaterial({
      map: getCityMistTexture(palette.crystalColor),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.holoSignMats = {
      MINE: new THREE.MeshBasicMaterial({
        map: getRooftopHoloSignTexture('MINE', palette.crystalColor),
        transparent: true,
        opacity: 0.92,
        fog: false,
        side: THREE.DoubleSide,
      }),
      CYBER: new THREE.MeshBasicMaterial({
        map: getRooftopHoloSignTexture('CYBER', palette.crystalColor),
        transparent: true,
        opacity: 0.92,
        fog: false,
        side: THREE.DoubleSide,
      }),
      NEXUS: new THREE.MeshBasicMaterial({
        map: getRooftopHoloSignTexture('NEXUS', palette.crystalColor),
        transparent: true,
        opacity: 0.92,
        fog: false,
        side: THREE.DoubleSide,
      }),
    };

    // 1. Multi-Archetype Instanced Skyscrapers + Setbacks + Vertical Neon Fins + Crowns + Spires
    const curtainSeeds = this.seeds.filter((s) => s.archetype === 0);
    const diagridSeeds = this.seeds.filter((s) => s.archetype === 1);
    const octaSeeds = this.seeds.filter((s) => s.archetype === 2);
    const setbackSeeds = this.seeds.filter((s) => s.hasSetback);
    const finSeeds = this.seeds.filter((s) => s.hasFins);
    const crownSeeds = this.seeds.filter((s) => s.hasCrown);
    const rectTrimSeeds = this.seeds.filter((s) => s.hasRing && s.archetype !== 2);
    const octaTrimSeeds = this.seeds.filter((s) => s.hasRing && s.archetype === 2);
    const antennaSeeds = this.seeds.filter((s) => s.hasAntenna);

    const chamferGeo = createSkyscraperShaftGeometry();
    const octaGeo = new THREE.CylinderGeometry(0.46, 0.56, 1, 8);
    // Razor-thin hollow neon parapet rim (4-sided for rectangular towers, 8-sided for octagonal arcologies)
    const rectTrimGeo = new THREE.RingGeometry(0.46, 0.495, 4);
    rectTrimGeo.rotateX(-Math.PI / 2);
    rectTrimGeo.rotateY(Math.PI / 4);
    const octaTrimGeo = new THREE.RingGeometry(0.435, 0.475, 8);
    octaTrimGeo.rotateX(-Math.PI / 2);

    this.curtainShaftInst = new THREE.InstancedMesh(chamferGeo, this.curtainMat, Math.max(1, curtainSeeds.length));
    this.diagridShaftInst = new THREE.InstancedMesh(chamferGeo, this.diagridMat, Math.max(1, diagridSeeds.length));
    this.octaShaftInst = new THREE.InstancedMesh(octaGeo, this.megacorpMat, Math.max(1, octaSeeds.length));
    this.setbackInst = new THREE.InstancedMesh(chamferGeo, this.megacorpMat, Math.max(1, setbackSeeds.length));
    this.finInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 1, 0.16),
      this.cityNeonMat,
      Math.max(1, finSeeds.length * 2)
    );
    this.crownInst = new THREE.InstancedMesh(chamferGeo, this.crownMat, Math.max(1, crownSeeds.length));
    this.rooftopMechInst = new THREE.InstancedMesh(chamferGeo, this.crownMat, Math.max(1, this.seeds.length * 2));
    this.ringInst = new THREE.InstancedMesh(rectTrimGeo, this.cityNeonMat, Math.max(1, rectTrimSeeds.length));
    this.octaTrimInst = new THREE.InstancedMesh(octaTrimGeo, this.cityNeonMat, Math.max(1, octaTrimSeeds.length));
    this.antennaInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.035, 0.09, 1, 6),
      this.cityNeonMat,
      Math.max(1, antennaSeeds.length)
    );
    this.beaconInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.16, 0),
      this.beaconMat,
      Math.max(1, antennaSeeds.length)
    );

    this.curtainShaftInst.count = curtainSeeds.length;
    this.diagridShaftInst.count = diagridSeeds.length;
    this.octaShaftInst.count = octaSeeds.length;
    this.setbackInst.count = setbackSeeds.length;
    this.finInst.count = finSeeds.length * 2;
    this.crownInst.count = crownSeeds.length;
    this.rooftopMechInst.count = this.seeds.length * 2;
    this.ringInst.count = rectTrimSeeds.length;
    this.octaTrimInst.count = octaTrimSeeds.length;
    this.antennaInst.count = antennaSeeds.length;
    this.beaconInst.count = antennaSeeds.length;

    const dummy = new THREE.Object3D();
    const shaftCounters: [number, number, number] = [0, 0, 0];
    let setbackIdx = 0;
    let finIdx = 0;
    let crownIdx = 0;
    let mechIdx = 0;
    let ringIdx = 0;
    let octaTrimIdx = 0;
    let antIdx = 0;
    const holoPlaneGeo = new THREE.PlaneGeometry(3.3, 1.65);

    for (let sIdx = 0; sIdx < this.seeds.length; sIdx++) {
      const s = this.seeds[sIdx];
      const shaftTop = s.topY - s.setbackH;
      const h = Math.max(4, shaftTop - CITY_BASE_Y);
      dummy.position.set(s.x, CITY_BASE_Y + h * 0.5, s.z);
      dummy.rotation.set(0, s.rotY, 0);
      dummy.scale.set(s.w, h, s.d);
      dummy.updateMatrix();

      if (s.archetype === 0) {
        this.curtainShaftInst.setMatrixAt(shaftCounters[0]++, dummy.matrix);
      } else if (s.archetype === 1) {
        this.diagridShaftInst.setMatrixAt(shaftCounters[1]++, dummy.matrix);
      } else {
        this.octaShaftInst.setMatrixAt(shaftCounters[2]++, dummy.matrix);
      }

      if (s.hasSetback) {
        const sw = s.w * 0.68;
        const sd = s.d * 0.68;
        dummy.position.set(s.x, shaftTop + s.setbackH * 0.5, s.z);
        dummy.rotation.set(0, s.rotY, 0);
        dummy.scale.set(sw, s.setbackH, sd);
        dummy.updateMatrix();
        this.setbackInst.setMatrixAt(setbackIdx++, dummy.matrix);

        if (s.hasFins) {
          const finH = s.setbackH + 1.45;
          const cosR = Math.cos(s.rotY);
          const sinR = Math.sin(s.rotY);
          for (const side of [-1, 1]) {
            const ox = side * (sw * 0.54);
            dummy.position.set(s.x + ox * cosR, shaftTop + finH * 0.48, s.z - ox * sinR);
            dummy.rotation.set(0, s.rotY, 0);
            dummy.scale.set(1, finH, 1);
            dummy.updateMatrix();
            this.finInst.setMatrixAt(finIdx++, dummy.matrix);
          }
        }
      }

      const roofW = s.hasSetback ? s.w * 0.68 : s.w;
      const roofD = s.hasSetback ? s.d * 0.68 : s.d;
      const crownH = 0.95 + (sIdx % 3) * 0.25;
      if (s.hasCrown) {
        dummy.position.set(s.x, s.topY + crownH * 0.5, s.z);
        dummy.rotation.set(0, s.rotY, 0);
        dummy.scale.set(roofW * 0.68, crownH, roofD * 0.68);
        dummy.updateMatrix();
        this.crownInst.setMatrixAt(crownIdx++, dummy.matrix);
      }
      // Offset HVAC / mechanical rooftop units on every building so no roof looks flat/bare
      const deckY = s.hasCrown ? s.topY + crownH : s.topY;
      const mechBaseW = s.hasCrown ? roofW * 0.68 : roofW;
      const mechBaseD = s.hasCrown ? roofD * 0.68 : roofD;
      const cosR = Math.cos(s.rotY);
      const sinR = Math.sin(s.rotY);
      for (const mSide of [-1, 1]) {
        const ox = mSide * mechBaseW * 0.2;
        const oz = (sIdx % 2 === 0 ? 1 : -1) * mSide * mechBaseD * 0.14;
        const mh = mSide < 0 ? 0.52 + (sIdx % 3) * 0.16 : 0.34 + (sIdx % 2) * 0.14;
        dummy.position.set(
          s.x + ox * cosR + oz * sinR,
          deckY + mh * 0.5,
          s.z - ox * sinR + oz * cosR
        );
        dummy.rotation.set(0, s.rotY, 0);
        dummy.scale.set(mechBaseW * 0.28, mh, mechBaseD * 0.32);
        dummy.updateMatrix();
        this.rooftopMechInst.setMatrixAt(mechIdx++, dummy.matrix);
      }

      if (s.hasRing) {
        const ringY = s.topY + 0.04;
        dummy.position.set(s.x, ringY, s.z);
        if (s.archetype === 2) {
          const octScale = s.hasSetback ? Math.min(roofW, roofD) * 0.96 : Math.min(roofW, roofD) * 0.92;
          dummy.rotation.set(0, s.rotY, 0);
          dummy.scale.setScalar(octScale);
          dummy.updateMatrix();
          this.octaTrimInst.setMatrixAt(octaTrimIdx++, dummy.matrix);
        } else {
          dummy.rotation.set(0, s.rotY, 0);
          dummy.scale.set(roofW * 1.42, 1, roofD * 1.42);
          dummy.updateMatrix();
          this.ringInst.setMatrixAt(ringIdx++, dummy.matrix);
        }
      }
      if (s.hasAntenna) {
        const antH = 1.65 + (sIdx % 4) * 0.32;
        const antBaseY = s.hasCrown ? s.topY + crownH : s.topY;
        dummy.position.set(s.x, antBaseY + antH * 0.5, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, antH, 1);
        dummy.updateMatrix();
        this.antennaInst.setMatrixAt(antIdx, dummy.matrix);

        dummy.position.set(s.x, antBaseY + antH + 0.12, s.z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        this.beaconInst.setMatrixAt(antIdx, dummy.matrix);
        antIdx += 1;
      }

      if (s.holoLabel) {
        const baseY = Math.min(2.8, (s.hasCrown ? s.topY + crownH : s.topY) + 1.35);
        const signMesh = new THREE.Mesh(holoPlaneGeo, this.holoSignMats[s.holoLabel]);
        signMesh.position.set(s.x, baseY, s.z + roofD * 0.25);
        signMesh.rotation.y = -Math.atan2(s.x, Math.max(8, 20 - s.z)) * 0.65;
        this.cityGroup.add(signMesh);
        this.holoBillboards.push({
          mesh: signMesh,
          label: s.holoLabel,
          baseY,
          phase: this.holoBillboards.length * 1.4,
        });
      }
    }

    for (const inst of [
      this.curtainShaftInst,
      this.diagridShaftInst,
      this.octaShaftInst,
      this.setbackInst,
      this.finInst,
      this.crownInst,
      this.rooftopMechInst,
      this.ringInst,
      this.octaTrimInst,
      this.antennaInst,
      this.beaconInst,
    ]) {
      inst.instanceMatrix.needsUpdate = true;
      this.cityGroup.add(inst);
    }

    // 2. Low-Altitude Additive City Mist Planes (depth separation between arena & deep city)
    const mistGeo = new THREE.PlaneGeometry(92, 74);
    mistGeo.rotateX(-Math.PI / 2);
    for (const [my, mz, scale] of [
      [-10.5, -14, 1.0],
      [-17.2, -16, 1.18],
    ] as const) {
      const mist = new THREE.Mesh(mistGeo, this.mistMat);
      mist.position.set(0, my, mz);
      mist.scale.setScalar(scale);
      this.cityGroup.add(mist);
    }

    // 3. Sky-Traffic Aerial Light Lanes (1 InstancedMesh of 28 cruising neon vehicles)
    const trafficCount = 28;
    const trafficMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
    this.skyTrafficInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.12, 0.24), trafficMat, trafficCount);
    const trafficPalette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xfbbf24),
      new THREE.Color(0xf472b6),
    ];
    for (let i = 0; i < trafficCount; i++) {
      const upperLane = i % 2 === 0;
      this.skyTraffic.push({
        laneRadiusX: upperLane ? 25 + (i % 5) * 2.2 : 17 + (i % 4) * 2.4,
        laneRadiusZ: upperLane ? 17 + (i % 4) * 1.8 : 13 + (i % 3) * 1.5,
        centerZ: upperLane ? -14.5 : -9.0,
        y: upperLane ? -6.8 - (i % 3) * 0.7 : -10.4 - (i % 3) * 0.65,
        angle: (i / trafficCount) * Math.PI * 2,
        speed: (upperLane ? 1 : -1) * (0.12 + (i % 5) * 0.025),
        scaleX: 0.75 + (i % 3) * 0.35,
      });
      this.skyTrafficInst.setColorAt(i, trafficPalette[i % trafficPalette.length]);
    }
    if (this.skyTrafficInst.instanceColor) this.skyTrafficInst.instanceColor.needsUpdate = true;
    this.cityGroup.add(this.skyTrafficInst);
    this.updateSkyTraffic(0);

    // 4. Four Soft-Gradient Searchlight Cones flanking the horizon
    const skyConeGeo = new THREE.ConeGeometry(3.1, 30, 14, 1, true);
    skyConeGeo.rotateX(Math.PI);
    skyConeGeo.translate(0, 15, 0);
    const beamSpecs: Array<[number, number, number, number, number, number]> = [
      [-25.5, -7.2, -26, 0.24, 0.14, 0.42],
      [-17.2, -10.5, -36, 0.14, 0.18, 0.31],
      [17.6, -10.5, -36, -0.16, 0.17, 0.36],
      [25.5, -7.2, -25, -0.22, 0.14, 0.48],
    ];
    for (let i = 0; i < beamSpecs.length; i++) {
      const [bx, by, bz, baseRoll, basePitch, speed] = beamSpecs[i];
      const pivot = new THREE.Group();
      pivot.position.set(bx, by, bz);
      pivot.add(new THREE.Mesh(skyConeGeo, this.searchlightMat));
      this.cityGroup.add(pivot);
      this.searchlights.push({ pivot, phase: i * 1.8, speed, baseRoll, basePitch });
    }

    // 5. Cyber Zeppelin + Curved Wrap-Around LED Banner ("MyChibiMine") + Escort Drones
    this.blimpHullMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.48,
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
      roughness: 0.44,
      metalness: 0.56,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.blimpScreenMat = new THREE.MeshBasicMaterial({
      map: getBroadcastBannerTexture(palette.crystalColor, false),
      fog: false,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    this.blimpBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
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

  private updateSkyTraffic(elapsed: number): void {
    for (let i = 0; i < this.skyTraffic.length; i++) {
      const v = this.skyTraffic[i];
      const a = v.angle + elapsed * v.speed;
      const x = Math.cos(a) * v.laneRadiusX;
      const z = v.centerZ + Math.sin(a) * v.laneRadiusZ;
      const dx = -Math.sin(a) * v.laneRadiusX * v.speed;
      const dz = Math.cos(a) * v.laneRadiusZ * v.speed;
      this.trafficDummy.position.set(x, v.y, z);
      this.trafficDummy.rotation.set(0, -Math.atan2(dz, dx), 0);
      this.trafficDummy.scale.set(v.scaleX, 1, 1);
      this.trafficDummy.updateMatrix();
      this.skyTrafficInst.setMatrixAt(i, this.trafficDummy.matrix);
    }
    this.skyTrafficInst.instanceMatrix.needsUpdate = true;
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
    return this.seeds.length;
  }

  public getBlimpWorldPosition(): THREE.Vector3 {
    return this.blimpGroup.position;
  }

  public isScreenFogDisabled(): boolean {
    return this.blimpScreenMat.fog === false;
  }

  public setPalette(palette: MineWorldPalette): void {
    this.activeAccentHex = palette.crystalColor;

    const applyFacade = (mat: THREE.MeshStandardMaterial, tex: THREE.Texture) => {
      mat.map = tex;
      mat.emissiveMap = tex;
      mat.needsUpdate = true;
    };
    applyFacade(this.curtainMat, getSkyscraperFacadeTexture(palette.crystalColor));
    applyFacade(this.diagridMat, getSkyscraperVariantTexture('diagrid', palette.crystalColor));
    applyFacade(this.megacorpMat, getSkyscraperVariantTexture('megacorp', palette.crystalColor));

    this.cityNeonMat.color.set(palette.crystalColor);
    this.searchlightMat.color.set(palette.crystalColor);
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
    const feverActive = this.overclockTier > 0;
    const accent =
      this.overclockTier === 3
        ? '#22d3ee'
        : this.overclockTier === 2
          ? '#fb7185'
          : this.overclockTier === 1
            ? '#fbbf24'
            : this.activeAccentHex;
    const nextTex = getBroadcastBannerTexture(accent, feverActive);
    nextTex.offset.x = this.blimpScrollOffset;
    this.blimpScreenMat.map = nextTex;
    this.blimpScreenMat.needsUpdate = true;

    this.blimpTrimMat.color.set(accent);
    this.blimpTrimMat.emissive.set(accent);
    this.blimpTrimMat.emissiveIntensity = feverActive ? 1.7 : 1.2;
    this.blimpHoloBeamMat.color.set(accent);

    const facadeBoost = feverActive ? 0.2 : 0;
    this.curtainMat.emissiveIntensity = 0.78 + facadeBoost;
    this.diagridMat.emissiveIntensity = 0.82 + facadeBoost;
    this.megacorpMat.emissiveIntensity = 0.88 + facadeBoost;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.searchlightMat.opacity = low ? 0.06 : 0.12;
    this.mistMat.opacity = low ? 0.12 : 0.22;
    this.skyTrafficInst.visible = !low;
  }

  public update(dtSec: number, elapsed: number): void {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    this.updateBlimpPlacement(elapsed);

    // Smooth marquee UV scroll across the curved MyChibiMine LED banner
    this.blimpScrollOffset = (this.blimpScrollOffset + safeDt * (this.overclockTier > 0 ? 0.24 : 0.15)) % 1;
    if (this.blimpScreenMat.map) {
      this.blimpScreenMat.map.offset.x = this.blimpScrollOffset;
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

    // Gentle hover on rooftop holographic billboards
    for (const sign of this.holoBillboards) {
      sign.mesh.position.y = sign.baseY + Math.sin(elapsed * 1.6 + sign.phase) * 0.12;
    }

    if (!this.lowQuality) {
      this.updateSkyTraffic(elapsed);
    }

    // Sweep searchlight beams across the skyline
    for (const b of this.searchlights) {
      b.pivot.rotation.z = b.baseRoll + Math.sin(elapsed * b.speed + b.phase) * 0.15;
      b.pivot.rotation.x = b.basePitch + Math.cos(elapsed * (b.speed * 0.85) + b.phase) * 0.08;
    }
  }

  public dispose(): void {
    for (const inst of [
      this.curtainShaftInst,
      this.diagridShaftInst,
      this.octaShaftInst,
      this.setbackInst,
      this.finInst,
      this.crownInst,
      this.rooftopMechInst,
      this.ringInst,
      this.octaTrimInst,
      this.antennaInst,
      this.beaconInst,
      this.skyTrafficInst,
    ]) {
      inst.dispose();
    }
    disposeObject3D(this.group);
  }
}
