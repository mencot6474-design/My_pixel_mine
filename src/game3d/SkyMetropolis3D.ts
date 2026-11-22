import * as THREE from 'three';
import type { OverclockTier } from '../game/OverclockDomain';
import { disposeObject3D } from './ChestVaultStation3D';
import type { MineWorldPalette } from './MineWorldPalette';
import { getBroadcastBannerTexture, getSkyscraperFacadeTexture } from './ProceduralTextures3D';

interface SkyscraperSeed {
  x: number;
  z: number;
  w: number;
  d: number;
  topY: number;
  hasCrown: boolean;
  hasRing: boolean;
  hasAntenna: boolean;
}

interface SearchlightBeam {
  pivot: THREE.Group;
  phase: number;
  speed: number;
  baseRoll: number;
  basePitch: number;
}

const CITY_BASE_Y = -42;
const BLIMP_START_X = 33.5;
const BLIMP_END_X = -33.5;
const BLIMP_BASE_Y = 2.15;
const BLIMP_BASE_Z = -22.5;
const BLIMP_SPEED = 2.55;
const BLIMP_PAUSE_SEC = 1.8;
const BLIMP_INITIAL_OFFSET_SEC = 3.4;

function disableRaycast(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    child.raycast = () => {};
  });
}

function buildCitySeeds(): SkyscraperSeed[] {
  const seeds: SkyscraperSeed[] = [];
  // High-altitude view: every skyscraper sits cleanly BELOW the floating sky arena (topY <= -4.8)
  const rings: Array<{ count: number; rx: number; rz: number; cz: number; minTop: number; maxTop: number; wRange: [number, number] }> = [
    // Deep abyss core towers directly below the floating pit & void shards
    { count: 14, rx: 10.5, rz: 9.0, cz: 0.5, minTop: -15.5, maxTop: -9.5, wRange: [2.2, 3.4] },
    // Mid-ring metropolitan towers framing the floating arena perimeter
    { count: 18, rx: 20.0, rz: 16.5, cz: -3.5, minTop: -12.0, maxTop: -6.2, wRange: [2.6, 4.0] },
    // Outer skyline canyon extending across the wide lower horizon
    { count: 22, rx: 35.0, rz: 24.0, cz: -18.0, minTop: -9.8, maxTop: -4.8, wRange: [2.8, 4.4] },
  ];

  let idx = 0;
  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.41;
      // Avoid crowding directly right in front of the elevated camera lens
      if (rIdx === 2 && Math.sin(a) > 0.52 && Math.abs(Math.cos(a)) < 0.55) continue;
      const jitterR = 0.82 + ((idx * 19) % 7) * 0.055;
      const x = Math.cos(a) * ring.rx * jitterR;
      const z = ring.cz + Math.sin(a) * ring.rz * jitterR;

      const topY = ring.minTop + (((idx * 29 + 7) % 11) / 10) * (ring.maxTop - ring.minTop);
      const w = ring.wRange[0] + (((idx * 13) % 5) / 4) * (ring.wRange[1] - ring.wRange[0]);
      const d = w * (0.82 + ((idx * 7) % 4) * 0.12);
      seeds.push({
        x,
        z,
        w,
        d,
        topY,
        hasCrown: idx % 2 === 0,
        hasRing: idx % 3 === 0,
        hasAntenna: topY > -8.5 && idx % 3 === 1,
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

  private readonly facadeMat: THREE.MeshStandardMaterial;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly cityNeonMat: THREE.MeshBasicMaterial;
  private readonly searchlightMat: THREE.MeshBasicMaterial;

  private readonly shaftInst: THREE.InstancedMesh;
  private readonly crownInst: THREE.InstancedMesh;
  private readonly ringInst: THREE.InstancedMesh;
  private readonly antennaInst: THREE.InstancedMesh;
  private readonly searchlights: SearchlightBeam[] = [];

  private readonly blimpHullMat: THREE.MeshStandardMaterial;
  private readonly blimpTrimMat: THREE.MeshStandardMaterial;
  private readonly blimpScreenMat: THREE.MeshBasicMaterial;
  private readonly blimpBeaconMat: THREE.MeshBasicMaterial;
  private readonly blimpFadableMats: Array<{ mat: THREE.Material; baseOpacity: number }> = [];

  private activeAccentHex: string;
  private overclockTier: 0 | OverclockTier = 0;
  private blimpScrollOffset = 0;

  constructor(palette: MineWorldPalette) {
    this.activeAccentHex = palette.crystalColor;
    this.seeds = buildCitySeeds();

    const facadeTex = getSkyscraperFacadeTexture(palette.crystalColor);
    this.facadeMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      map: facadeTex,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: facadeTex,
      emissiveIntensity: 0.72,
      roughness: 0.52,
      metalness: 0.34,
      flatShading: true,
    });
    this.crownMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.45,
      metalness: 0.48,
      flatShading: true,
    });
    this.cityNeonMat = new THREE.MeshBasicMaterial({
      color: palette.crystalColor,
      transparent: true,
      opacity: 0.9,
    });
    this.searchlightMat = new THREE.MeshBasicMaterial({
      color: palette.crystalColor,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // 1. Instanced Skyscraper Shafts + Rooftops + Flat Horizontal Rings + Antennas
    const total = this.seeds.length;
    const crownSeeds = this.seeds.filter((s) => s.hasCrown);
    const ringSeeds = this.seeds.filter((s) => s.hasRing);
    const antennaSeeds = this.seeds.filter((s) => s.hasAntenna);

    this.shaftInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.facadeMat, total);
    this.crownInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.crownMat,
      Math.max(1, crownSeeds.length)
    );
    const ringGeo = new THREE.RingGeometry(0.32, 0.44, 16);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringInst = new THREE.InstancedMesh(ringGeo, this.cityNeonMat, Math.max(1, ringSeeds.length));
    this.antennaInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.04, 0.08, 1, 6),
      this.cityNeonMat,
      Math.max(1, antennaSeeds.length)
    );

    const dummy = new THREE.Object3D();
    let crownIdx = 0;
    let ringIdx = 0;
    let antIdx = 0;
    for (let i = 0; i < total; i++) {
      const s = this.seeds[i];
      const h = Math.max(4, s.topY - CITY_BASE_Y);
      dummy.position.set(s.x, CITY_BASE_Y + h * 0.5, s.z);
      dummy.rotation.set(0, (i % 4) * (Math.PI * 0.25), 0);
      dummy.scale.set(s.w, h, s.d);
      dummy.updateMatrix();
      this.shaftInst.setMatrixAt(i, dummy.matrix);

      if (s.hasCrown) {
        const crownH = 1.15;
        dummy.position.set(s.x, s.topY + crownH * 0.5, s.z);
        dummy.scale.set(s.w * 0.68, crownH, s.d * 0.68);
        dummy.updateMatrix();
        this.crownInst.setMatrixAt(crownIdx++, dummy.matrix);
      }
      if (s.hasRing) {
        const ringY = s.hasCrown ? s.topY + 1.18 : s.topY + 0.05;
        const ringScale = Math.min(s.w, s.d) * 0.72;
        dummy.position.set(s.x, ringY, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(ringScale);
        dummy.updateMatrix();
        this.ringInst.setMatrixAt(ringIdx++, dummy.matrix);
      }
      if (s.hasAntenna) {
        const antH = 2.1;
        const antBaseY = s.hasCrown ? s.topY + 1.15 : s.topY;
        dummy.position.set(s.x, antBaseY + antH * 0.5, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, antH, 1);
        dummy.updateMatrix();
        this.antennaInst.setMatrixAt(antIdx++, dummy.matrix);
      }
    }
    this.shaftInst.instanceMatrix.needsUpdate = true;
    this.crownInst.instanceMatrix.needsUpdate = true;
    this.ringInst.instanceMatrix.needsUpdate = true;
    this.antennaInst.instanceMatrix.needsUpdate = true;
    this.cityGroup.add(this.shaftInst, this.crownInst, this.ringInst, this.antennaInst);

    // 2. Three Sweeping Hologram City Searchlight Cones flanking the central sky stage
    const skyConeGeo = new THREE.ConeGeometry(2.6, 26, 12, 1, true);
    skyConeGeo.rotateX(Math.PI);
    skyConeGeo.translate(0, 13, 0);
    const beamSpecs: Array<[number, number, number, number, number, number]> = [
      [-22.5, -7.5, -26, 0.22, 0.14, 0.42],
      [18.0, -9.5, -35, -0.24, 0.16, 0.34],
      [23.5, -7.5, -25, -0.18, 0.14, 0.48],
    ];
    for (let i = 0; i < beamSpecs.length; i++) {
      const [bx, by, bz, baseRoll, basePitch, speed] = beamSpecs[i];
      const pivot = new THREE.Group();
      pivot.position.set(bx, by, bz);
      const beamMesh = new THREE.Mesh(skyConeGeo, this.searchlightMat);
      pivot.add(beamMesh);
      this.cityGroup.add(pivot);
      this.searchlights.push({ pivot, phase: i * 2.1, speed, baseRoll, basePitch });
    }

    // 3. Modern Live Broadcast Blimp ("MyChibiMine" LED TV Banner)
    this.blimpHullMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.32,
      metalness: 0.45,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.blimpTrimMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.15,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    const bannerTex = getBroadcastBannerTexture(palette.crystalColor, false);
    this.blimpScreenMat = new THREE.MeshBasicMaterial({
      map: bannerTex,
      fog: false,
      transparent: true,
      opacity: 1,
    });
    this.blimpBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
      transparent: true,
      opacity: 0.95,
    });

    this.buildBroadcastBlimp();
    this.blimpGroup.position.set(BLIMP_START_X, BLIMP_BASE_Y, BLIMP_BASE_Z);

    this.group.add(this.cityGroup, this.blimpGroup);
    disableRaycast(this.group);
    this.updateBlimpPlacement(0);
  }

  private buildBroadcastBlimp(): void {
    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.44,
      metalness: 0.56,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.blimpFadableMats.push(
      { mat: this.blimpHullMat, baseOpacity: 1 },
      { mat: this.blimpTrimMat, baseOpacity: 1 },
      { mat: this.blimpScreenMat, baseOpacity: 1 },
      { mat: this.blimpBeaconMat, baseOpacity: 0.95 },
      { mat: darkFrameMat, baseOpacity: 1 }
    );

    // Aerodynamic envelope (nose points -X for Right->Left flight)
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.blimpHullMat);
    hull.scale.set(4.55, 1.0, 1.24);
    this.blimpGroup.add(hull);

    // Upper & nose cyber belt
    const spine = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 0.42), darkFrameMat);
    spine.position.y = 0.96;
    this.blimpGroup.add(spine);

    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.1, 10), this.blimpTrimMat);
    noseCone.rotation.z = Math.PI / 2;
    noseCone.position.set(-4.62, 0, 0);
    this.blimpGroup.add(noseCone);

    // Top navigation strobe beacon
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), this.blimpBeaconMat);
    beacon.position.set(-0.5, 1.15, 0);
    this.blimpGroup.add(beacon);

    // Rear tail stabilizer fins (+X)
    const vFinTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.02, 0.12), darkFrameMat);
    vFinTop.position.set(3.65, 0.72, 0);
    vFinTop.rotation.z = -0.28;
    const vFinBot = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.78, 0.12), darkFrameMat);
    vFinBot.position.set(3.65, -0.58, 0);
    vFinBot.rotation.z = 0.24;
    const hFin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 2.35), this.blimpTrimMat);
    hFin.position.set(3.8, 0, 0);
    this.blimpGroup.add(vFinTop, vFinBot, hFin);

    // Twin side turbine pods
    const podGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.45, 10);
    podGeo.rotateZ(Math.PI / 2);
    const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.26, 10);
    thrusterGeo.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(podGeo, darkFrameMat);
      pod.position.set(0.4, -0.22, side * 1.24);
      const glow = new THREE.Mesh(thrusterGeo, this.blimpTrimMat);
      glow.position.set(1.18, -0.22, side * 1.24);
      this.blimpGroup.add(pod, glow);
    }

    // Underslung broadcast gondola + prominent front-facing LED TV frame ("MyChibiMine" banner)
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.34, 1.1), darkFrameMat);
    gondola.position.set(0, -0.96, 0.12);
    this.blimpGroup.add(gondola);

    const tvBoard = new THREE.Group();
    tvBoard.position.set(0, -1.02, 1.02);
    tvBoard.rotation.x = 0.18; // tilted cleanly toward the elevated arena camera

    const tvHousing = new THREE.Mesh(new THREE.BoxGeometry(6.85, 2.15, 0.3), darkFrameMat);
    const tvNeonFrameTop = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.11, 0.36), this.blimpTrimMat);
    tvNeonFrameTop.position.y = 1.08;
    const tvNeonFrameBot = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.11, 0.36), this.blimpTrimMat);
    tvNeonFrameBot.position.y = -1.08;

    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.55, 1.88), this.blimpScreenMat);
    screenMesh.position.z = 0.17;

    tvBoard.add(tvHousing, tvNeonFrameTop, tvNeonFrameBot, screenMesh);
    this.blimpGroup.add(tvBoard);
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
    const y = BLIMP_BASE_Y + Math.sin(elapsed * 0.95) * 0.18;
    this.blimpGroup.position.set(x, y, BLIMP_BASE_Z);
    this.blimpGroup.rotation.z = Math.sin(elapsed * 0.85) * 0.02;

    // Smooth edge fade-in from right and fade-out at left boundary
    const enterFade = THREE.MathUtils.clamp((BLIMP_START_X - x) / 4.2, 0, 1);
    const exitFade = THREE.MathUtils.clamp((x - BLIMP_END_X) / 4.2, 0, 1);
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
    const facadeTex = getSkyscraperFacadeTexture(palette.crystalColor);
    this.facadeMat.map = facadeTex;
    this.facadeMat.emissiveMap = facadeTex;
    this.facadeMat.needsUpdate = true;

    this.cityNeonMat.color.set(palette.crystalColor);
    this.searchlightMat.color.set(palette.crystalColor);
    this.blimpTrimMat.color.set(palette.crystalColor);
    this.blimpTrimMat.emissive.set(palette.crystalColor);
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
    this.blimpTrimMat.emissiveIntensity = feverActive ? 1.65 : 1.15;
    this.facadeMat.emissiveIntensity = feverActive ? 0.92 : 0.72;
  }

  public setLowQuality(low: boolean): void {
    this.searchlightMat.opacity = low ? 0.05 : 0.08;
  }

  public update(dtSec: number, elapsed: number): void {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    this.updateBlimpPlacement(elapsed);

    // Smooth marquee UV scroll across LED broadcast banner
    this.blimpScrollOffset = (this.blimpScrollOffset + safeDt * (this.overclockTier > 0 ? 0.24 : 0.16)) % 1;
    if (this.blimpScreenMat.map) {
      this.blimpScreenMat.map.offset.x = this.blimpScrollOffset;
    }

    // Strobe top navigation beacon subtly
    const pulse = 0.55 + 0.45 * Math.sin(elapsed * 4.4);
    this.blimpBeaconMat.color.setRGB(1, 0.78 + pulse * 0.22, 0.65 + pulse * 0.35);

    // Sweep distant skyscraper searchlight cones gently
    for (const b of this.searchlights) {
      b.pivot.rotation.z = b.baseRoll + Math.sin(elapsed * b.speed + b.phase) * 0.14;
      b.pivot.rotation.x = b.basePitch + Math.cos(elapsed * (b.speed * 0.85) + b.phase) * 0.08;
    }
  }

  public dispose(): void {
    this.shaftInst.dispose();
    this.crownInst.dispose();
    this.ringInst.dispose();
    this.antennaInst.dispose();
    disposeObject3D(this.group);
  }
}
