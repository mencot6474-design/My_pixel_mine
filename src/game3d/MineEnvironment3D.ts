import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';
import type { MineWorldPalette } from './MineWorldPalette';
import { CaveRailwayHandle, createCaveRailway } from './CaveRailway3D';
import { ChestVaultStationHandle, createChestVaultStation, disposeObject3D } from './ChestVaultStation3D';
import { loadPublicSpriteTexture } from './OrePit3D';
import { getCobblePathTexture, getTerrainTexture } from './ProceduralTextures3D';
import { createWeatherSkyMaterial, WeatherSkyMaterialHandle } from './WeatherSkyShader';

interface CloudCluster {
  group: THREE.Group;
  speed: number;
}

export class MineEnvironment3D {
  public readonly group = new THREE.Group();
  public readonly skyDome: THREE.Mesh;

  private readonly skyHandle: WeatherSkyMaterialHandle;
  private readonly cloudMat: THREE.MeshStandardMaterial;
  private readonly terrainMat: THREE.MeshStandardMaterial;
  private readonly cobbleMat: THREE.MeshStandardMaterial;
  private readonly cliffMat: THREE.MeshStandardMaterial;
  private readonly cyberDeckTrimMat: THREE.MeshStandardMaterial;
  private readonly crystalAccentMat: THREE.MeshStandardMaterial;
  private readonly dustGeo: THREE.BufferGeometry;
  private readonly dustMat: THREE.ShaderMaterial;
  private readonly bannerMat: THREE.MeshBasicMaterial;

  private readonly clouds: CloudCluster[] = [];
  private readonly caveRailway: CaveRailwayHandle;
  private readonly chestVault: ChestVaultStationHandle;

  constructor(palette: MineWorldPalette) {
    // 1. Procedural 3D Atmospheric Sky Dome Shader (stars, aurora, Bloodmoon, Void Black Hole & Celestial star)
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

    // Shared Cyber-Basalt & Gunmetal Industrial Materials (synced visually with Neo-Cyber City Plaza)
    this.terrainMat = new THREE.MeshStandardMaterial({
      map: getTerrainTexture(palette.terrainColor, palette.crystalColor),
      roughness: 0.68,
      metalness: 0.24,
    });
    this.cobbleMat = new THREE.MeshStandardMaterial({
      map: getCobblePathTexture(palette.pitFloorColor),
      color: 0xdbeafe,
      roughness: 0.66,
      metalness: 0.22,
    });
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x151e30,
      roughness: 0.72,
      metalness: 0.26,
      flatShading: true,
    });
    this.cyberDeckTrimMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.28,
      flatShading: true,
    });
    this.crystalAccentMat = new THREE.MeshStandardMaterial({
      color: palette.crystalColor,
      emissive: palette.crystalColor,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      metalness: 0.32,
      flatShading: true,
    });
    this.bannerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x4c607f,
      metalness: 0.42,
      roughness: 0.36,
      flatShading: true,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1c273c,
      metalness: 0.36,
      roughness: 0.46,
      flatShading: true,
    });

    // 3. Multi-Tiered Dark Basalt Floating Substructure + Hull Neon Band (harmonizes with Neo-Cyber City Plaza)
    const cliffLower = new THREE.Mesh(new THREE.BoxGeometry(25.2, 2.0, 15.2), this.cliffMat);
    cliffLower.position.set(0, -2.75, -0.35);
    const cliffUpper = new THREE.Mesh(new THREE.BoxGeometry(28.6, 1.3, 17.8), this.cliffMat);
    cliffUpper.position.set(0, -1.42, -0.35);
    cliffUpper.receiveShadow = true;

    const hullNeonBand = new THREE.Mesh(
      new THREE.BoxGeometry(29.0, 0.08, 18.2),
      this.cyberDeckTrimMat
    );
    hullNeonBand.position.set(0, -1.06, -0.35);
    this.group.add(cliffLower, cliffUpper, hullNeonBand);

    // 4. Dark Basalt Courtyard Armor Slabs Framing Sunken Pit + Stairwell Bay + Drop Shaft & Refinery Channels
    // Pit hole: x [-5.78..5.78], z [-2.63..3.93]
    // Center stairwell bay: x [-1.30..1.30], z [-3.18..-2.63]
    // Left Drop Shaft trench: x [-7.15..-5.78], z [-0.55..0.85]
    // Right Plasma Refinery escalator channel: x [5.78..7.12], z [1.05..2.35]
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

    // Sunken Basalt Trench Floors Under Left Track & Right Escalator (y = -0.74)
    const leftTrench = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.44), this.cliffMat);
    leftTrench.position.set(-6.465, -0.74, 0.15);
    const rightTrench = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.34), this.cliffMat);
    rightTrench.position.set(6.45, -0.74, 1.7);
    this.group.add(leftTrench, rightTrench);

    // Dark Basalt / Cyber-Industrial Outer Deck Terraces cleanly abutting courtyard x = +-9.80 (zero overlap!)
    // Split wingLeft around the Drop Shaft & Maglev Track corridor (z in [-1.85 .. +2.15]) so terrain never clips rails
    const wingLeftNorth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 6.95), this.terrainMat);
    wingLeftNorth.position.set(-12.4, -0.305, -5.325);
    wingLeftNorth.receiveShadow = true;

    const wingLeftBay = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.78, 4.0), this.cliffMat);
    wingLeftBay.position.set(-12.4, -0.39, 0.15);
    wingLeftBay.receiveShadow = true;

    const wingLeftSouth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 5.85), this.terrainMat);
    wingLeftSouth.position.set(-12.4, -0.305, 5.075);
    wingLeftSouth.receiveShadow = true;

    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 16.8), this.terrainMat);
    wingRight.position.set(12.4, -0.305, -0.4);
    wingRight.receiveShadow = true;

    const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.8, 2.4), this.terrainMat);
    frontDeck.position.set(0, -0.38, 7.9);
    frontDeck.receiveShadow = true;

    const backDeck = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.99, 3.6), this.terrainMat);
    backDeck.position.set(0, -0.285, -7.8);
    backDeck.receiveShadow = true;
    this.group.add(wingLeftNorth, wingLeftBay, wingLeftSouth, wingRight, frontDeck, backDeck);

    // Retaining Gunmetal Curbs + Thin Perimeter Neon Trim Strips (segmented cleanly around Drop Shaft & Refinery Vault)
    const addSideCurbSeg = (cx: number, zCenter: number, lenZ: number): void => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, lenZ), darkMetalMat);
      curb.position.set(cx, 0.1, zCenter);
      curb.receiveShadow = true;
      curb.castShadow = true;

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, lenZ),
        this.cyberDeckTrimMat
      );
      trim.position.set(cx, 0.24, zCenter);
      this.group.add(curb, trim);
    };
    addSideCurbSeg(-9.66, -4.875, 6.05);
    addSideCurbSeg(-9.66, 4.625, 4.95);
    addSideCurbSeg(9.66, -4.15, 7.5);
    addSideCurbSeg(9.66, 5.15, 3.9);

    for (const sx of [-1, 1]) {
      const outerFlankTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.05, 16.75),
        this.cyberDeckTrimMat
      );
      outerFlankTrim.position.set(sx * 14.96, 0.2, -0.4);
      this.group.add(outerFlankTrim);
    }

    // Front & Back Deck Thin Perimeter Neon Strips
    const frontPerimeterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(19.04, 0.05, 0.07),
      this.cyberDeckTrimMat
    );
    frontPerimeterTrim.position.set(0, 0.04, 6.72);
    const frontOuterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(18.84, 0.05, 0.07),
      this.cyberDeckTrimMat
    );
    frontOuterTrim.position.set(0, 0.04, 9.06);
    this.group.add(frontPerimeterTrim, frontOuterTrim);

    // 5. Rear "My Chibi Minerr" Holographic Stage Gantry (elevated neatly above Chibi nameplates)
    this.buildSanctuaryGate(darkMetalMat, steelMat);

    // 6. Left Wing: Cyber Mine Elevator / Drop Shaft + Cyan Energy Gate + Maglev Track
    this.caveRailway = createCaveRailway({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
      foliageColor: palette.foliageColor,
    });
    this.group.add(this.caveRailway.group);

    // 7. Right Wing: Plasma Ore Refinery + Cyber Vault Escalator Station
    this.chestVault = createChestVaultStation({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.chestVault.group);

    // 8. Sculpted Cyber Deck Beacon Pylons + Lateral Sub-City Infrastructure Pillars & Energy Cables
    this.buildDeckBeacons(darkMetalMat, steelMat);
    this.buildDistantCityInfrastructure(darkMetalMat, steelMat);

    // 9. Ambient Soft Bokeh Cyber Mana Motes (GPU radial glow replacing raw square Points)
    const dustCount = 42;
    const positions = new Float32Array(dustCount * 3);
    const phases = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = 0.7 + Math.random() * 3.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9;
      phases[i] = Math.random();
    }
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(palette.crystalColor) },
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aPhase;
        varying float vTwinkle;
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.75 + aPhase * 6.283) * 0.16;
          pos.x += cos(uTime * 0.45 + aPhase * 9.42) * 0.12;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          vTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.4 + aPhase * 12.56));
          gl_PointSize = (8.5 + aPhase * 6.0) * vTwinkle * uPixelRatio * (15.0 / max(1.0, -mvPos.z));
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float glow = pow(clamp(1.0 - d * 2.0, 0.0, 1.0), 2.2);
          vec3 col = mix(uColor, vec3(1.0), glow * 0.45);
          gl_FragColor = vec4(col, glow * vTwinkle * 0.55);
        }
      `,
    });
    const dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.group.add(dustPoints);

    this.setPalette(palette);
  }

  private buildDeckBeacons(
    darkMetalMat: THREE.Material,
    steelMat: THREE.Material
  ): void {
    const pylonBodyGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0.0),
        new THREE.Vector2(0.32, 0.0),
        new THREE.Vector2(0.26, 0.25),
        new THREE.Vector2(0.16, 0.48),
        new THREE.Vector2(0.16, 1.38),
        new THREE.Vector2(0.24, 1.56),
        new THREE.Vector2(0.001, 1.65),
      ],
      8
    );
    // Stylized Cyber Holoprojector Core (hex plasma prism + stabilizer collar fin + chamfer cap)
    const lensGeo = new THREE.CylinderGeometry(0.115, 0.135, 0.24, 6);
    const stabilizerGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.045, 6);
    const ringGeo = new THREE.TorusGeometry(0.22, 0.025, 6, 16);
    ringGeo.rotateX(Math.PI / 2);

    const placements: [number, number, number][] = [
      [-11.8, 0.17, -5.6],
      [-11.8, 0.17, 4.6],
      [11.8, 0.17, -5.6],
      [11.8, 0.17, 4.4],
    ];
    for (const [bx, by, bz] of placements) {
      const bg = new THREE.Group();
      bg.position.set(bx, by, bz);

      const body = new THREE.Mesh(pylonBodyGeo, darkMetalMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const collar = new THREE.Mesh(ringGeo, this.cyberDeckTrimMat);
      collar.position.y = 1.48;
      const emitter = new THREE.Mesh(lensGeo, this.crystalAccentMat);
      emitter.position.y = 1.79;
      const stabilizer = new THREE.Mesh(stabilizerGeo, steelMat);
      stabilizer.position.y = 1.79;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.1, 6), steelMat);
      cap.position.y = 1.98;

      bg.add(body, collar, emitter, stabilizer, cap);
      this.group.add(bg);
    }
  }

  private buildDistantCityInfrastructure(
    darkMetalMat: THREE.Material,
    steelMat: THREE.Material
  ): void {
    // 1. Sub-Island Cyber Support Mega-Pylons anchored beneath mine bedrock (-11.5 .. -1.2)
    const subPylonGeo = new THREE.CylinderGeometry(0.65, 0.95, 10.6, 8);
    const subCollarGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.28, 8);
    const subSpecs: [number, number][] = [
      [-11.4, -7.2],
      [11.4, -7.2],
      [-12.2, 5.2],
      [12.2, 5.2],
    ];
    for (const [px, pz] of subSpecs) {
      const pylon = new THREE.Mesh(subPylonGeo, darkMetalMat);
      pylon.position.set(px, -6.5, pz);
      const collar = new THREE.Mesh(subCollarGeo, this.cyberDeckTrimMat);
      collar.position.set(px, -2.2, pz);
      this.group.add(pylon, collar);
    }

    // 2. Lateral Distant City Conduit Towers tucked cleanly outside Void Black Hole / Bloodmoon azimuth windows
    // (|x| >= 16.8, max roof y <= 3.6 so skybox Void Black Hole & WeatherFx3D remain 100% unobstructed)
    const towerColumnGeo = new THREE.CylinderGeometry(0.85, 1.35, 14.5, 8);
    const crownCapGeo = new THREE.CylinderGeometry(1.15, 0.95, 0.65, 8);
    const beaconRingGeo = new THREE.TorusGeometry(1.05, 0.06, 6, 18);
    beaconRingGeo.rotateX(Math.PI / 2);

    const lateralTowers: [number, number, number][] = [
      [-16.8, -8.8, 3.2],
      [-19.6, -15.4, 3.6],
      [16.8, -8.8, 3.1],
      [19.6, -15.4, 3.5],
    ];
    for (const [tx, tz, topY] of lateralTowers) {
      const tg = new THREE.Group();
      tg.position.set(tx, 0, tz);

      const body = new THREE.Mesh(towerColumnGeo, darkMetalMat);
      body.position.y = topY - 7.25;
      const crown = new THREE.Mesh(crownCapGeo, steelMat);
      crown.position.y = topY - 0.1;
      const ring = new THREE.Mesh(beaconRingGeo, this.cyberDeckTrimMat);
      ring.position.y = topY + 0.16;

      tg.add(body, crown, ring);
      this.group.add(tg);
    }

    // 3. Sweeping Lateral Catenary Power Cables Anchored Socket-to-Socket into Drop Shaft & Refinery Caps
    const cableChains: THREE.Vector3[][] = [
      [
        new THREE.Vector3(-11.78, 4.72, -1.02),
        new THREE.Vector3(-14.4, 3.35, -4.8),
        new THREE.Vector3(-16.8, 3.05, -8.8),
      ],
      [
        new THREE.Vector3(-16.8, 3.0, -8.8),
        new THREE.Vector3(-18.2, 2.35, -12.2),
        new THREE.Vector3(-19.6, 3.35, -15.4),
      ],
      [
        new THREE.Vector3(9.51, 2.52, 0.22),
        new THREE.Vector3(13.2, 2.15, -4.2),
        new THREE.Vector3(16.8, 2.95, -8.8),
      ],
      [
        new THREE.Vector3(16.8, 2.9, -8.8),
        new THREE.Vector3(18.2, 2.25, -12.2),
        new THREE.Vector3(19.6, 3.25, -15.4),
      ],
    ];
    for (let idx = 0; idx < cableChains.length; idx++) {
      const curve = new THREE.CatmullRomCurve3(cableChains[idx]);
      const cableGeo = new THREE.TubeGeometry(curve, 14, 0.065, 6, false);
      const cableMesh = new THREE.Mesh(
        cableGeo,
        idx % 2 === 0 ? this.cyberDeckTrimMat : darkMetalMat
      );
      this.group.add(cableMesh);
    }
  }

  private buildSanctuaryGate(
    darkMetalMat: THREE.Material,
    steelMat: THREE.Material
  ): void {
    const g = new THREE.Group();
    g.position.set(0, 0.21, -6.05);

    // Grounded Dark Gunmetal Holo-Display Gantry (3:1 banner lifted cleanly above staggered Chibi nameplates)
    const bannerW = 8.4;
    const bannerH = 2.68;
    const bannerCenterY = 4.32;

    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.44, 0.96), darkMetalMat);
    plinthBase.position.set(0, 0.22, 0);
    plinthBase.castShadow = true;
    plinthBase.receiveShadow = true;

    const plinthNeon = new THREE.Mesh(new THREE.BoxGeometry(11.44, 0.055, 0.98), this.cyberDeckTrimMat);
    plinthNeon.position.set(0, 0.46, 0);

    const lowerBackdrop = new THREE.Mesh(new THREE.BoxGeometry(10.4, 2.42, 0.54), this.cliffMat);
    lowerBackdrop.position.set(0, 1.68, -0.02);
    lowerBackdrop.castShadow = true;
    lowerBackdrop.receiveShadow = true;

    const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.14, 0.72), steelMat);
    plinthTop.position.set(0, 2.92, 0);
    plinthTop.receiveShadow = true;

    const wallBacking = new THREE.Mesh(
      new THREE.BoxGeometry(bannerW + 0.4, bannerH + 0.3, 0.42),
      darkMetalMat
    );
    wallBacking.position.set(0, bannerCenterY, -0.02);
    wallBacking.castShadow = true;
    wallBacking.receiveShadow = true;

    const topCornice = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 0.66), darkMetalMat);
    topCornice.position.set(0, bannerCenterY + bannerH * 0.5 + 0.24, 0);
    topCornice.castShadow = true;

    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(9.3, 0.08, 0.54),
      this.cyberDeckTrimMat
    );
    topTrim.position.set(0, bannerCenterY + bannerH * 0.5 + 0.12, 0);

    g.add(plinthBase, plinthNeon, lowerBackdrop, plinthTop, wallBacking, topCornice, topTrim);

    // Sleek Gunmetal & Glowing Cyan Side Pilasters Framing the Hologram Wall
    for (const sx of [-1, 1]) {
      const px = sx * (bannerW * 0.5 + 0.36);
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.48, bannerH + 3.05, 0.62), steelMat);
      pilaster.position.set(px, 2.94, 0.02);
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;

      const edgeStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, bannerH + 2.8, 0.09),
        this.cyberDeckTrimMat
      );
      edgeStrip.position.set(px - sx * 0.25, 2.96, 0.3);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.72), darkMetalMat);
      cap.position.set(px, bannerCenterY + bannerH * 0.5 + 0.36, 0.02);
      cap.castShadow = true;
      g.add(pilaster, edgeStrip, cap);
    }

    // 3:1 Game Banner Plane ("My Chibi Minerr")
    const bannerPlane = new THREE.Mesh(new THREE.PlaneGeometry(bannerW, bannerH), this.bannerMat);
    bannerPlane.position.set(0, bannerCenterY, 0.21);
    g.add(bannerPlane);

    void loadPublicSpriteTexture('/hud/game_banner.webp')
      .then((tex) => {
        this.bannerMat.map = tex;
        this.bannerMat.opacity = 1;
        this.bannerMat.needsUpdate = true;
      })
      .catch(() => {
        // Safe no-op in headless tests
      });

    // Twin Cyber Stage Holo-Speaker / Projector Columns Flanking the Widened Rear Stage
    for (const sx of [-1, 1]) {
      const proj = new THREE.Group();
      proj.position.set(sx * 6.35, 0, 0.55);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 8), darkMetalMat);
      base.position.y = 0.11;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.55, 8), steelMat);
      body.position.y = 0.98;
      const lensRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.175, 0.14, 8),
        this.crystalAccentMat
      );
      lensRing.position.y = 1.825;
      const louverHood = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.19, 0.11, 8), darkMetalMat);
      louverHood.position.y = 1.95;
      proj.add(base, body, lensRing, louverHood);
      g.add(proj);
    }

    this.group.add(g);
  }

  public setPalette(palette: MineWorldPalette): void {
    this.terrainMat.map = getTerrainTexture(palette.terrainColor, palette.crystalColor);
    this.terrainMat.needsUpdate = true;

    this.cobbleMat.map = getCobblePathTexture(palette.pitFloorColor);
    this.cobbleMat.needsUpdate = true;

    this.cliffMat.color.setHex(0x111828).lerp(new THREE.Color(palette.cliffColor), 0.16);
    this.cyberDeckTrimMat.color.set(palette.crystalColor);
    this.cyberDeckTrimMat.emissive.set(palette.crystalColor);

    this.crystalAccentMat.color.set(palette.crystalColor);
    this.crystalAccentMat.emissive.set(palette.crystalColor);
    this.caveRailway.setPalette(palette.crystalColor, palette.cliffColor, palette.foliageColor);
    this.chestVault.setPalette(palette.crystalColor, palette.cliffColor);
    (this.dustMat.uniforms.uColor.value as THREE.Color).set(palette.crystalColor);
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
    for (const c of this.clouds) {
      c.group.position.x += c.speed * dtSec;
      if (c.group.position.x > 26) c.group.position.x = -26;
    }

    this.caveRailway.update(dtSec, elapsed);
    this.chestVault.update(dtSec, elapsed, chestHovered, chestBounce);

    this.cyberDeckTrimMat.emissiveIntensity = 1.0 + Math.sin(elapsed * 2.2) * 0.14;
    this.dustMat.uniforms.uTime.value = elapsed;
  }

  public dispose(): void {
    this.caveRailway.dispose();
    this.chestVault.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    this.bannerMat.dispose();
    disposeObject3D(this.group);
    this.skyDome.geometry.dispose();
    this.skyHandle.material.dispose();
  }
}
