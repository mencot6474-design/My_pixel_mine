import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';
import type { MineWorldPalette } from './MineWorldPalette';
import { CaveRailwayHandle, createCaveRailway } from './CaveRailway3D';
import { ChestVaultStationHandle, createChestVaultStation } from './ChestVaultStation3D';
import { mountGlbProp } from './GlbAssets3D';
import { loadPublicSpriteTexture } from './OrePit3D';
import { getCobblePathTexture, getTerrainTexture } from './ProceduralTextures3D';
import { createWeatherSkyMaterial, WeatherSkyMaterialHandle } from './WeatherSkyShader';

interface CloudCluster {
  group: THREE.Group;
  speed: number;
}

interface FloatingIsland {
  group: THREE.Group;
  baseY: number;
  phase: number;
}

export class MineEnvironment3D {
  public readonly group = new THREE.Group();
  public readonly skyDome: THREE.Mesh;

  private readonly skyHandle: WeatherSkyMaterialHandle;
  private readonly cloudMat: THREE.MeshStandardMaterial;
  private readonly terrainMat: THREE.MeshStandardMaterial;
  private readonly cobbleMat: THREE.MeshStandardMaterial;
  private readonly cliffMat: THREE.MeshStandardMaterial;
  private readonly crystalAccentMat: THREE.MeshStandardMaterial;
  private readonly foliagePrimaryMat: THREE.MeshStandardMaterial;
  private readonly foliageSecondaryMat: THREE.MeshStandardMaterial;
  private readonly dustMat: THREE.PointsMaterial;

  private readonly clouds: CloudCluster[] = [];
  private readonly skyIslands: FloatingIsland[] = [];
  private readonly caveRailway: CaveRailwayHandle;
  private readonly chestVault: ChestVaultStationHandle;
  private readonly dustPoints: THREE.Points;

  constructor(palette: MineWorldPalette) {
    // 1. Procedural 3D Atmospheric Sky Dome Shader (clouds, stars, aurora & celestial bodies at infinity)
    this.skyHandle = createWeatherSkyMaterial('light_rain');
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), this.skyHandle.material);
    this.skyDome.renderOrder = -100;
    this.group.add(this.skyDome);

    // 2. Soft Layered Drifting Clouds
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      flatShading: true,
      fog: false,
    });
    const cloudLayout: [number, number, number, number][] = [
      [-15, 6.2, -16, 1.15],
      [-4, 7.1, -20, 1.35],
      [8, 6.0, -17, 1.1],
      [18, 6.8, -19, 1.25],
    ];
    for (const [cx, cy, cz, scale] of cloudLayout) {
      const cg = new THREE.Group();
      const p1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), this.cloudMat);
      const p2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), this.cloudMat);
      p2.position.set(0.95, -0.14, 0.08);
      const p3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), this.cloudMat);
      p3.position.set(-0.9, -0.18, -0.08);
      cg.add(p1, p2, p3);
      cg.position.set(cx, cy, cz);
      cg.scale.set(scale * 1.45, scale * 0.65, scale);
      cg.visible = false;
      this.group.add(cg);
      this.clouds.push({ group: cg, speed: 0.2 + (scale - 1) * 0.14 });
    }

    // Shared Dynamic Biome Materials
    this.terrainMat = new THREE.MeshStandardMaterial({
      map: getTerrainTexture(palette.terrainColor, palette.foliageColor),
      roughness: 0.88,
      metalness: 0.02,
    });
    this.cobbleMat = new THREE.MeshStandardMaterial({
      map: getCobblePathTexture(palette.pitFloorColor),
      color: 0xe2e8f0,
      roughness: 0.88,
      metalness: 0.04,
    });
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: palette.cliffColor,
      roughness: 0.86,
      metalness: 0.06,
      flatShading: true,
    });
    this.crystalAccentMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.35,
      flatShading: true,
    });
    this.foliagePrimaryMat = new THREE.MeshStandardMaterial({
      color: palette.foliageColor,
      roughness: 0.82,
      flatShading: true,
    });
    this.foliageSecondaryMat = new THREE.MeshStandardMaterial({
      color: palette.foliageColor,
      roughness: 0.78,
      flatShading: true,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.38,
      roughness: 0.48,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.3,
      roughness: 0.56,
    });

    // 3. Distant Floating Sky-Islands for Horizon Depth
    this.buildDistantSkyIslands();

    // 4. Stepped Multi-Elevation Main Island Base (Paved Quarry Courtyard Framing Real Sunken Excavation!)
    const cliffLower = new THREE.Mesh(new THREE.BoxGeometry(25.2, 2.0, 15.2), this.cliffMat);
    cliffLower.position.set(0, -2.75, -0.35);
    const cliffUpper = new THREE.Mesh(new THREE.BoxGeometry(28.4, 1.3, 17.6), this.cliffMat);
    cliffUpper.position.set(0, -1.42, -0.35);
    cliffUpper.receiveShadow = true;
    this.group.add(cliffLower, cliffUpper);

    // Flagstone Quarry Courtyard Slabs Framing Sunken Pit + Center Stairwell Bay + Open Left Rail & Right Conveyor Channels
    // Pit hole: x [-5.78..5.78], z [-2.63..3.93]
    // Center stairwell bay: x [-1.30..1.30], z [-3.18..-2.63]
    // Left rail descent trench: x [-7.15..-5.78], z [-0.55..0.85]
    // Right conveyor rise channel: x [5.78..7.12], z [1.05..2.35]
    const courtyardSpecs: [number, number, number, number][] = [
      [0, -5.14, 19.6, 3.92],
      [-5.55, -2.905, 8.5, 0.55],
      [5.55, -2.905, 8.5, 0.55],
      [0, 5.315, 19.6, 2.77],
      [-8.475, 0.65, 2.65, 6.56],
      [-6.465, -1.59, 1.37, 2.08],
      [-6.465, 2.39, 1.37, 3.08],
      [8.46, 0.65, 2.68, 6.56],
      [6.45, -0.79, 1.34, 3.68],
      [6.45, 3.14, 1.34, 1.58],
    ];
    for (const [cx, cz, cw, cd] of courtyardSpecs) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.28, cd), this.cobbleMat);
      slab.position.set(cx, -0.14, cz);
      slab.receiveShadow = true;
      this.group.add(slab);

      const underSkirt = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.5, cd), this.cliffMat);
      underSkirt.position.set(cx, -0.54, cz);
      this.group.add(underSkirt);
    }

    // Sunken stone trench floors under both portals (y = -0.68) so neither channel shows an empty void
    const leftTrench = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.44), this.cliffMat);
    leftTrench.position.set(-6.465, -0.74, 0.15);
    const rightTrench = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.34), this.cliffMat);
    rightTrench.position.set(6.45, -0.74, 1.7);
    this.group.add(leftTrench, rightTrench);

    // Raised Green Meadow Terraces solidly grounded down to cliffUpper (y = -0.77)
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.95, 16.8), this.terrainMat);
    wingLeft.position.set(-12.2, -0.305, -0.4);
    wingLeft.receiveShadow = true;

    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.95, 16.8), this.terrainMat);
    wingRight.position.set(12.2, -0.305, -0.4);
    wingRight.receiveShadow = true;

    const frontMeadow = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.8, 2.4), this.terrainMat);
    frontMeadow.position.set(0, -0.38, 7.9);
    frontMeadow.receiveShadow = true;

    const backMeadow = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.99, 3.6), this.terrainMat);
    backMeadow.position.set(0, -0.285, -7.8);
    backMeadow.receiveShadow = true;

    // Stone retaining kerbs bordering raised meadows along the courtyard edges
    for (const sx of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 15.0), this.cliffMat);
      curb.position.set(sx * 9.5, 0.1, -0.4);
      curb.receiveShadow = true;
      curb.castShadow = true;
      this.group.add(curb);
    }
    this.group.add(wingLeft, wingRight, frontMeadow, backMeadow);

    // 5. REAR PORTAL SANCTUARY (Pure 3D Quarry Pillars & Lintel)
    this.buildSanctuaryGate(darkMetalMat, steelMat);

    // 6. Left Mining Cave Mountain: Multi-Tiered Quarry Cliff + Timber Portal + Continuous Steel Railway + 2-Car Train
    this.caveRailway = createCaveRailway({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
      foliageColor: palette.foliageColor,
    });
    this.group.add(this.caveRailway.group);

    // 7. Right Loot Vault Station: Procedural Escalator Bridge Rising from Pit -> Connected Vault Sanctuary
    this.chestVault = createChestVaultStation({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.chestVault.group);

    // 8. True 3D Low-Poly Trees & Quarry Stones Only (Zero Blurry Billboard Image Trees)
    const meadowProps: [string, number, number, number, number, number][] = [
      ['/models/fantasy-town/tree-high-round.glb', -11.75, -4.15, 3.65, 0.35, 0.17],
      ['/models/fantasy-town/tree-crooked.glb', -11.75, 3.75, 3.25, -0.4, 0.17],
      ['/models/mini-dungeon/rocks.glb', -10.15, 4.65, 0.85, 0.8, 0.17],
      ['/models/fantasy-town/tree-crooked.glb', 10.55, -3.35, 3.45, -0.5, 0.17],
      ['/models/fantasy-town/tree-high-round.glb', 10.65, 2.85, 3.35, 1.2, 0.17],
      ['/models/mini-dungeon/rocks.glb', 10.15, 4.35, 0.85, -0.6, 0.17],
    ];
    for (const [url, px, pz, height, rotY, bottomY] of meadowProps) {
      mountGlbProp(url, this.group, {
        position: [px, 0, pz],
        rotationY: rotY,
        targetHeight: height,
        alignBottomY: bottomY,
      });
    }

    // 9. Ambient Floating Crystal Sparks
    const dustCount = 50;
    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = 0.7 + Math.random() * 3.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustMat = new THREE.PointsMaterial({
      color: palette.crystalColor,
      size: 0.11,
      transparent: true,
      opacity: 0.55,
    });
    this.dustPoints = new THREE.Points(dustGeo, this.dustMat);
    this.group.add(this.dustPoints);

    this.setPalette(palette);
  }

  private buildDistantSkyIslands(): void {
    // Kept clear so floating sky islands never clip awkwardly across the upper corners of the viewport.
  }

  private buildSanctuaryGate(
    darkMetalMat: THREE.Material,
    steelMat: THREE.Material
  ): void {
    const g = new THREE.Group();
    g.position.set(0, 0.21, -6.0);

    // Grounded Stone-Framed Game Banner Wall (3:1 aspect ratio, elevated above the 5-Chibi stage nametags)
    const bannerW = 8.4;
    const bannerH = 2.8;
    const bannerCenterY = 3.95;

    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.44, 0.92), this.cliffMat);
    plinthBase.position.set(0, 0.22, 0);
    plinthBase.castShadow = true;
    plinthBase.receiveShadow = true;

    const lowerStoneWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.08, 0.54), this.cliffMat);
    lowerStoneWall.position.set(0, 1.48, -0.02);
    lowerStoneWall.castShadow = true;
    lowerStoneWall.receiveShadow = true;

    const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(9.35, 0.14, 0.72), steelMat);
    plinthTop.position.set(0, 2.52, 0);
    plinthTop.receiveShadow = true;

    const wallBacking = new THREE.Mesh(new THREE.BoxGeometry(bannerW + 0.36, bannerH + 0.28, 0.42), darkMetalMat);
    wallBacking.position.set(0, bannerCenterY, -0.02);
    wallBacking.castShadow = true;
    wallBacking.receiveShadow = true;

    const topCornice = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.22, 0.64), this.cliffMat);
    topCornice.position.set(0, bannerCenterY + bannerH * 0.5 + 0.24, 0);
    topCornice.castShadow = true;

    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(9.15, 0.1, 0.52), steelMat);
    topTrim.position.set(0, bannerCenterY + bannerH * 0.5 + 0.12, 0);

    g.add(plinthBase, lowerStoneWall, plinthTop, wallBacking, topCornice, topTrim);

    // Side Stone Pilasters Framing the Banner Wall
    for (const sx of [-1, 1]) {
      const px = sx * (bannerW * 0.5 + 0.32);
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.48, bannerH + 2.65, 0.62), this.cliffMat);
      pilaster.position.set(px, 2.74, 0.02);
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.72), steelMat);
      cap.position.set(px, bannerCenterY + bannerH * 0.5 + 0.36, 0.02);
      cap.castShadow = true;
      g.add(pilaster, cap);
    }

    // 3:1 Game Banner Plane ("My Chibi Minerr")
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const bannerPlane = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerH), bannerMat);
    bannerPlane.position.set(0, bannerCenterY, 0.21);
    g.add(bannerPlane);

    void loadPublicSpriteTexture('/hud/game_banner.webp')
      .then((tex) => {
        bannerMat.map = tex;
        bannerMat.opacity = 1;
        bannerMat.needsUpdate = true;
      })
      .catch(() => {
        // Safe no-op in headless tests
      });

    // Standing Quarry Lanterns Framing the Banner Wall
    for (const sx of [-1, 1]) {
      mountGlbProp('/models/fantasy-town/lantern.glb', g, {
        position: [sx * 5.65, 0, 0.45],
        targetHeight: 1.75,
        alignBottomY: 0,
      });
    }

    this.group.add(g);
  }

  public setPalette(palette: MineWorldPalette): void {
    this.terrainMat.map = getTerrainTexture(palette.terrainColor, palette.foliageColor);
    this.terrainMat.needsUpdate = true;

    this.cobbleMat.map = getCobblePathTexture(palette.pitFloorColor);
    this.cobbleMat.needsUpdate = true;

    this.cliffMat.color.set(palette.cliffColor);
    this.foliagePrimaryMat.color.set(palette.foliageColor);
    this.foliageSecondaryMat.color.set(palette.foliageColor).offsetHSL(0.02, -0.05, 0.07);

    this.crystalAccentMat.color.set(palette.crystalColor);
    this.crystalAccentMat.emissive.set(palette.crystalColor);
    this.caveRailway.setPalette(palette.crystalColor, palette.cliffColor, palette.foliageColor);
    this.chestVault.setPalette(palette.crystalColor, palette.cliffColor);
    this.dustMat.color.set(palette.crystalColor);
  }

  public setWeatherSky(weatherId: WeatherId, cloudHex: string): void {
    this.skyHandle.setWeather(weatherId);

    const cc = new THREE.Color(cloudHex);
    this.cloudMat.color.copy(cc);
    this.cloudMat.emissive.copy(cc);
  }

  public updateSky(elapsed: number, camPos: THREE.Vector3): void {
    this.skyHandle.update(elapsed);
    this.skyDome.position.copy(camPos);
  }

  public update(
    dtSec: number,
    elapsed: number,
    chestHovered = false,
    chestBounce = 0
  ): void {
    for (const isl of this.skyIslands) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * 0.8 + isl.phase) * 0.22;
    }

    for (const c of this.clouds) {
      c.group.position.x += c.speed * dtSec;
      if (c.group.position.x > 26) c.group.position.x = -26;
    }

    this.caveRailway.update(dtSec, elapsed);
    this.chestVault.update(dtSec, elapsed, chestHovered, chestBounce);

    this.dustPoints.rotation.y = Math.sin(elapsed * 0.1) * 0.06;
    this.dustPoints.position.y = Math.sin(elapsed * 0.6) * 0.12;
  }

  public dispose(): void {
    this.caveRailway.dispose();
    this.chestVault.dispose();
  }
}
