import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';
import type { MineWorldPalette } from './MineWorldPalette';
import { mountGlbProp } from './GlbAssets3D';
import {
  getCobblePathTexture,
  getHazardStripeTexture,
  getTerrainTexture,
} from './ProceduralTextures3D';
import { createWeatherSkyMaterial, WeatherSkyMaterialHandle } from './WeatherSkyShader';

interface MovingOrePacket {
  mesh: THREE.Mesh;
  progress: number;
}

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
  private readonly trimMat: THREE.MeshStandardMaterial;
  private readonly crystalAccentMat: THREE.MeshStandardMaterial;
  private readonly foliagePrimaryMat: THREE.MeshStandardMaterial;
  private readonly foliageSecondaryMat: THREE.MeshStandardMaterial;
  private readonly dustMat: THREE.PointsMaterial;

  private readonly clouds: CloudCluster[] = [];
  private readonly skyIslands: FloatingIsland[] = [];
  private readonly conveyorPackets: MovingOrePacket[] = [];
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
    this.trimMat = new THREE.MeshStandardMaterial({
      map: getHazardStripeTexture(palette.crystalColor),
      roughness: 0.42,
      metalness: 0.2,
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

    // 6. Left Mining Portal: Clean Stone Cave Arch + Timber Brace + Sloped Descent Rail + Coal Cart
    this.buildLeftMineTunnel();

    // 7. Right Loot Vault Pad: Inclined Conveyor Rising Out of Sunken Pit -> Clean Vault Pad
    this.buildRightConveyorAndDeck(darkMetalMat);

    // 8. True 3D Low-Poly Trees & Quarry Stones Only (Zero Blurry Billboard Image Trees)
    const meadowProps: [string, number, number, number, number, number][] = [
      ['/models/fantasy-town/tree-high-round.glb', -10.65, -3.35, 3.65, 0.35, 0.17],
      ['/models/fantasy-town/tree-crooked.glb', -10.55, 2.75, 3.25, -0.4, 0.17],
      ['/models/mini-dungeon/rocks.glb', -10.15, 4.35, 0.85, 0.8, 0.17],
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

    // Recessed Stone-Framed Backdrop Parapet between pillars with matching slate coping
    const wallBase = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.85, 0.32), darkMetalMat);
    wallBase.position.set(0, 0.42, 0.12);
    wallBase.castShadow = true;
    wallBase.receiveShadow = true;
    const wallTopTrim = new THREE.Mesh(new THREE.BoxGeometry(12.7, 0.12, 0.38), steelMat);
    wallTopTrim.position.set(0, 0.87, 0.12);
    wallTopTrim.receiveShadow = true;
    g.add(wallBase, wallTopTrim);

    // Twin Tall Carved Quarry Pillars using Kenney mini-dungeon column.glb + Stepped Plinth, Mid-Band & Finial Caps
    for (const sx of [-1, 1]) {
      const px = sx * 6.6;
      const plinthLower = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.44, 1.48), this.cliffMat);
      plinthLower.position.set(px, 0.22, 0);
      plinthLower.castShadow = true;
      plinthLower.receiveShadow = true;

      const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.28), darkMetalMat);
      plinthCap.position.set(px, 0.52, 0);

      mountGlbProp('/models/mini-dungeon/column.glb', g, {
        position: [px, 0, 0],
        targetHeight: 3.95,
        alignBottomY: 0.58,
      });

      const midBand = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 1.06), steelMat);
      midBand.position.set(px, 2.55, 0);

      const collar = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.24, 1.22), steelMat);
      collar.position.set(px, 4.52, 0);

      const capstone = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.18, 1.02), this.cliffMat);
      capstone.position.set(px, 5.12, 0);
      capstone.castShadow = true;

      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.52, 0.38, 4), darkMetalMat);
      finial.rotation.y = Math.PI / 4;
      finial.position.set(px, 5.4, 0);
      finial.castShadow = true;

      g.add(plinthLower, plinthCap, midBand, collar, capstone, finial);
    }

    // Clean Sculpted Quarry Stone Lintel & Cornice (Zero Flat 2D Signboard / Neon Bars / SVG Gyro)
    const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.28, 0.68), darkMetalMat);
    lowerBeam.position.set(0, 4.72, 0);
    lowerBeam.castShadow = true;

    const upperCanopy = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.22, 0.92), steelMat);
    upperCanopy.position.set(0, 4.96, 0);
    upperCanopy.castShadow = true;

    // Central Carved Stone Pediment + Pure 3D Sanctuary Jewel Crest
    const centerKeystone = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.38, 0.8), this.cliffMat);
    centerKeystone.position.set(0, 4.92, 0.04);
    centerKeystone.castShadow = true;

    const crestPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.18, 0.6), darkMetalMat);
    crestPlinth.position.set(0, 5.18, 0.04);
    g.add(lowerBeam, upperCanopy, centerKeystone, crestPlinth);

    mountGlbProp('/models/platformer/jewel.glb', g, {
      position: [0, 0, 0.04],
      targetHeight: 0.68,
      alignBottomY: 5.26,
    });

    // Standing Quarry Lanterns Framing the Sanctuary (banners removed for clean view)
    for (const sx of [-1, 1]) {
      mountGlbProp('/models/fantasy-town/lantern.glb', g, {
        position: [sx * 5.45, 0, 0.52],
        targetHeight: 1.65,
        alignBottomY: 0,
      });
    }

    this.group.add(g);
  }

  private buildLeftMineTunnel(): void {
    // Anchored cleanly to OrePit3D left rail spur (world z = +0.15, pit wall edge = world x -5.9 => local x +3.2)
    const g = new THREE.Group();
    g.position.set(-9.1, 0, 0.15);

    // Cohesive stone cave mound matching active Sector cliff color + dark interior
    const moundMain = new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, 0), this.cliffMat);
    moundMain.position.set(-0.92, 1.15, 0);
    moundMain.scale.set(0.95, 1.02, 1.22);
    moundMain.castShadow = true;
    moundMain.receiveShadow = true;

    const caveDark = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.75, 1.55),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    caveDark.position.set(-0.22, 0.88, 0);
    g.add(moundMain, caveDark);

    // Flanking stone boulders matching pit rocks + timber portal + single lantern
    mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
      position: [-0.45, 0, 1.38],
      rotationY: 0.4,
      targetHeight: 1.05,
      alignBottomY: 0,
    });
    mountGlbProp('/models/mini-dungeon/rocks.glb', g, {
      position: [-0.55, 0, -1.32],
      rotationY: -0.7,
      targetHeight: 1.15,
      alignBottomY: 0,
    });
    mountGlbProp('/models/mini-dungeon/wood-support.glb', g, {
      position: [0.35, 0, 0],
      rotationY: Math.PI / 2,
      targetHeight: 1.98,
      alignBottomY: 0,
    });
    mountGlbProp('/models/fantasy-town/lantern.glb', g, {
      position: [0.68, 0, -0.92],
      targetHeight: 1.68,
      alignBottomY: 0,
    });

    // Clean level rail bed on upper terrace + sloped stone chute descending into the sunken pit
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 });
    const ballast = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 1.18), ballastMat);
    ballast.position.set(0.75, 0.015, 0);
    ballast.receiveShadow = true;
    g.add(ballast);

    for (const tx of [-0.3, 0.7, 1.6]) {
      mountGlbProp('/models/train/track-detailed.glb', g, {
        position: [tx, 0, 0],
        rotationY: Math.PI / 2,
        targetWidth: 1.02,
        alignBottomY: 0.015,
      });
    }

    // Sloped track ramp smoothly descending from terrace (local x=2.05, y=0) down into sunken pit (x=3.35, y=-0.66)
    const rampGroup = new THREE.Group();
    rampGroup.position.set(2.68, -0.33, 0);
    rampGroup.rotation.z = -0.47;
    const rampBed = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 1.16), ballastMat);
    rampBed.position.y = -0.06;
    rampBed.receiveShadow = true;
    rampGroup.add(rampBed);
    mountGlbProp('/models/train/track-detailed.glb', rampGroup, {
      position: [0, 0, 0],
      rotationY: Math.PI / 2,
      targetWidth: 1.44,
      alignBottomY: 0.01,
    });
    g.add(rampGroup);

    // Real Kenney Coal Minecart parked cleanly on the level upper track outside the descent
    mountGlbProp('/models/train/train-carriage-coal.glb', g, {
      position: [1.15, 0, 0],
      rotationY: Math.PI / 2,
      targetHeight: 0.92,
      alignBottomY: 0.13,
    });

    this.group.add(g);
  }

  private buildRightConveyorAndDeck(darkMetalMat: THREE.Material): void {
    // Clean, Uncluttered Quarry Loot Vault Pad (shifted right so inclined conveyor never collides with wall or chest!)
    const deck = new THREE.Group();
    deck.position.set(8.45, 0, 1.7);

    const baseStep = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.14, 2.65), this.cliffMat);
    baseStep.position.y = 0.07;
    baseStep.receiveShadow = true;

    const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 2.35), darkMetalMat);
    baseSlab.position.y = 0.19;
    baseSlab.receiveShadow = true;
    baseSlab.castShadow = true;

    const vaultRim = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 2.42), this.trimMat);
    vaultRim.position.y = 0.24;

    deck.add(baseStep, baseSlab, vaultRim);
    this.group.add(deck);

    // Inclined Ore Conveyor / Escalator rising cleanly THROUGH the open right pit gateway up to the Vault Pad edge
    const convGroup = new THREE.Group();
    convGroup.position.set(6.28, -0.36, 1.7);
    convGroup.rotation.z = 0.32;
    mountGlbProp('/models/factory/conveyor-long.glb', convGroup, {
      position: [0, 0, 0],
      targetDepth: 0.88,
      alignBottomY: 0,
    });
    this.group.add(convGroup);

    for (let i = 0; i < 2; i++) {
      const pkt = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), this.crystalAccentMat);
      pkt.position.set(5.5, -0.18, 1.7);
      pkt.castShadow = true;
      this.group.add(pkt);
      this.conveyorPackets.push({ mesh: pkt, progress: i * 0.5 });
    }
  }

  public setPalette(palette: MineWorldPalette): void {
    this.terrainMat.map = getTerrainTexture(palette.terrainColor, palette.foliageColor);
    this.terrainMat.needsUpdate = true;

    this.cobbleMat.map = getCobblePathTexture(palette.pitFloorColor);
    this.cobbleMat.needsUpdate = true;

    this.cliffMat.color.set(palette.cliffColor);
    this.foliagePrimaryMat.color.set(palette.foliageColor);
    this.foliageSecondaryMat.color.set(palette.foliageColor).offsetHSL(0.02, -0.05, 0.07);

    this.trimMat.map = getHazardStripeTexture(palette.crystalColor);
    this.trimMat.needsUpdate = true;

    this.crystalAccentMat.color.set(palette.crystalColor);
    this.crystalAccentMat.emissive.set(palette.crystalColor);
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

  public update(dtSec: number, elapsed: number): void {
    for (const isl of this.skyIslands) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * 0.8 + isl.phase) * 0.22;
    }

    for (const c of this.clouds) {
      c.group.position.x += c.speed * dtSec;
      if (c.group.position.x > 26) c.group.position.x = -26;
    }

    for (const pkt of this.conveyorPackets) {
      pkt.progress = (pkt.progress + dtSec * 0.55) % 1;
      pkt.mesh.position.x = 5.5 + pkt.progress * 1.6;
      pkt.mesh.position.y = -0.18 + pkt.progress * 0.54 + Math.sin(pkt.progress * Math.PI) * 0.04;
      pkt.mesh.rotation.y += dtSec * 2.5;
    }

    this.dustPoints.rotation.y = Math.sin(elapsed * 0.1) * 0.06;
    this.dustPoints.position.y = Math.sin(elapsed * 0.6) * 0.12;
  }
}
