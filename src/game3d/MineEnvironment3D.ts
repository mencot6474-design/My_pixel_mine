import * as THREE from 'three';
import type { WeatherId } from '../game/WeatherData';
import type { MineWorldPalette } from './MineWorldPalette';
import {
  createNexusLeftGate,
  createVaultCoreDais,
  type NexusLeftGateHandle,
  type VaultCoreDaisHandle,
} from './ArenaWings3D';
import { disposeObject3D } from './ChestVaultStation3D';
import { createCyberLanternBollardFinial, createCyberMonolithForkFinial } from './CyberProps3D';
import { mergeStaticMeshesByMaterial } from './MeshHelpers3D';
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
  private readonly dustPoints: THREE.Points;
  private lowQuality = false;

  private readonly clouds: CloudCluster[] = [];
  private readonly cableCurves: THREE.CatmullRomCurve3[] = [];
  private cableFlowInst: THREE.InstancedMesh | null = null;
  private readonly cableDummy = new THREE.Object3D();
  private readonly cablePosTmp = new THREE.Vector3();
  private readonly cableTanTmp = new THREE.Vector3();
  private readonly cableUpAxis = new THREE.Vector3(0, 1, 0);
  private readonly leftGate: NexusLeftGateHandle;
  private readonly vaultDais: VaultCoreDaisHandle;

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

    // Shared Cyber-Slate & Gunmetal Industrial Materials (low metalness so floor stays bright without envMap)
    this.terrainMat = new THREE.MeshStandardMaterial({
      map: getTerrainTexture(palette.terrainColor, palette.crystalColor),
      color: 0xcbd5e1,
      roughness: 0.82,
      metalness: 0.08,
    });
    this.cobbleMat = new THREE.MeshStandardMaterial({
      map: getCobblePathTexture(palette.pitFloorColor),
      color: 0xc2d0e6,
      roughness: 0.8,
      metalness: 0.08,
    });
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x26354d,
      roughness: 0.78,
      metalness: 0.1,
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
    const cliffLower = new THREE.Mesh(new THREE.BoxGeometry(25.2, 2.0, 17.6), this.cliffMat);
    cliffLower.position.set(0, -2.75, 0.85);
    const cliffUpper = new THREE.Mesh(new THREE.BoxGeometry(28.6, 1.3, 20.2), this.cliffMat);
    cliffUpper.position.set(0, -1.42, 0.85);
    cliffUpper.receiveShadow = true;

    const hullNeonBand = new THREE.Mesh(
      new THREE.BoxGeometry(29.0, 0.08, 20.6),
      this.cyberDeckTrimMat
    );
    hullNeonBand.position.set(0, -1.06, 0.85);
    const deckGroup = new THREE.Group();
    deckGroup.add(cliffLower, cliffUpper, hullNeonBand);

    // 4. Continuous Symmetrical Dark Basalt Courtyard Framing Nexus Crater Pit
    // Pit hole: x [-5.78..5.78], z [-2.63..6.33]
    const courtyardSpecs: [number, number, number, number][] = [
      [0, -5.04, 19.6, 4.82],
      [0, 7.65, 19.6, 2.64],
      [-7.79, 1.85, 4.02, 8.96],
      [7.79, 1.85, 4.02, 8.96],
    ];
    for (const [cx, cz, cw, cd] of courtyardSpecs) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.28, cd), this.cobbleMat);
      slab.position.set(cx, -0.14, cz);
      slab.receiveShadow = true;
      deckGroup.add(slab);

      const underSkirt = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.5, cd), this.cliffMat);
      underSkirt.position.set(cx, -0.54, cz);
      deckGroup.add(underSkirt);
    }

    // Symmetrical Dark Basalt Outer Wing Terraces & Crescent Rear Support Deck (x = +-12.4)
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 19.17), this.terrainMat);
    wingLeft.position.set(-12.4, -0.305, 0.785);
    wingLeft.receiveShadow = true;

    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.95, 19.17), this.terrainMat);
    wingRight.position.set(12.4, -0.305, 0.785);
    wingRight.receiveShadow = true;

    const frontDeck = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.8, 2.4), this.terrainMat);
    frontDeck.position.set(0, -0.38, 10.17);
    frontDeck.receiveShadow = true;

    const backDeck = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.99, 4.2), this.terrainMat);
    backDeck.position.set(0, -0.285, -8.1);
    backDeck.receiveShadow = true;
    deckGroup.add(wingLeft, wingRight, frontDeck, backDeck);

    // Continuous Retaining Gunmetal Curbs + Perimeter Neon Trim Strips
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
      deckGroup.add(curb, trim);
    };
    addSideCurbSeg(-9.66, -4.875, 6.05);
    addSideCurbSeg(-9.66, 5.75, 7.2);
    addSideCurbSeg(9.66, -4.875, 6.05);
    addSideCurbSeg(9.66, 5.75, 7.2);

    for (const sx of [-1, 1]) {
      const outerFlankTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.05, 19.12),
        this.cyberDeckTrimMat
      );
      outerFlankTrim.position.set(sx * 14.96, 0.2, 0.785);
      deckGroup.add(outerFlankTrim);
    }

    // Front & Back Deck Thin Perimeter Neon Strips
    const frontPerimeterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(19.04, 0.05, 0.07),
      this.cyberDeckTrimMat
    );
    frontPerimeterTrim.position.set(0, 0.04, 8.99);
    const frontOuterTrim = new THREE.Mesh(
      new THREE.BoxGeometry(18.84, 0.05, 0.07),
      this.cyberDeckTrimMat
    );
    frontOuterTrim.position.set(0, 0.04, 11.33);
    deckGroup.add(frontPerimeterTrim, frontOuterTrim);
    mergeStaticMeshesByMaterial(deckGroup);
    this.group.add(deckGroup);

    // 5. Left Wing: Dimensional Nexus Gate / Energy Beacon Pylon
    this.leftGate = createNexusLeftGate({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.leftGate.group);

    // 7. Right Wing: Vault Core Dais Framing Clickable Chest
    this.vaultDais = createVaultCoreDais({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.vaultDais.group);

    // 8. Sculpted Cyber Deck Beacon Pylons + Lateral Sub-City Infrastructure Pillars & Energy Cables
    this.buildDeckBeacons(darkMetalMat, steelMat);
    this.buildDistantCityInfrastructure(darkMetalMat, steelMat);

    // 9. Ambient Soft Bokeh Cyber Mana Motes (GPU radial glow replacing raw square Points)
    const dustCount = 20;
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
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.group.add(this.dustPoints);

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
    // Architectural Armored Lantern Caps on Deck Beacons (zero plain box/diamond/ring clutter)
    const placements: [number, number, number][] = [
      [-11.8, 0.17, -5.6],
      [-11.8, 0.17, 6.9],
      [11.8, 0.17, -5.6],
      [11.8, 0.17, 6.7],
    ];
    for (const [bx, by, bz] of placements) {
      const bg = new THREE.Group();
      bg.position.set(bx, by, bz);

      const body = new THREE.Mesh(pylonBodyGeo, darkMetalMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const finial = createCyberLanternBollardFinial({
        frameMat: darkMetalMat,
        steelMat,
        coreMat: this.crystalAccentMat,
        scale: 0.92,
      });
      finial.position.y = 1.62;

      bg.add(body, finial);
      mergeStaticMeshesByMaterial(bg);
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
    const subInfraLeft = new THREE.Group();
    const subInfraRight = new THREE.Group();
    for (const [px, pz] of subSpecs) {
      const pylon = new THREE.Mesh(subPylonGeo, darkMetalMat);
      pylon.position.set(px, -6.5, pz);
      const collar = new THREE.Mesh(subCollarGeo, this.cyberDeckTrimMat);
      collar.position.set(px, -2.2, pz);
      (px < 0 ? subInfraLeft : subInfraRight).add(pylon, collar);
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
      const crownRelay = createCyberMonolithForkFinial({
        frameMat: darkMetalMat,
        steelMat,
        coreMat: this.cyberDeckTrimMat,
        scale: 1.55,
      });
      crownRelay.position.y = topY + 0.22;

      tg.add(body, crown, ring, crownRelay);
      mergeStaticMeshesByMaterial(tg);
      this.group.add(tg);
    }

    // 3. Sweeping Lateral Catenary Power Cables Anchored Socket-to-Socket into Left Nexus Gate & Right Vault Dais
    const cableChains: THREE.Vector3[][] = [
      [
        this.leftGate.cableSocketWorld.clone(),
        new THREE.Vector3(-14.2, 3.35, -4.8),
        new THREE.Vector3(-16.8, 3.05, -8.8),
      ],
      [
        new THREE.Vector3(-16.8, 3.0, -8.8),
        new THREE.Vector3(-18.2, 2.35, -12.2),
        new THREE.Vector3(-19.6, 3.35, -15.4),
      ],
      [
        this.vaultDais.cableSocketWorld.clone(),
        new THREE.Vector3(14.0, 2.25, -4.2),
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
      this.cableCurves.push(curve);
      const cableGeo = new THREE.TubeGeometry(curve, 14, 0.065, 6, false);
      const cableMesh = new THREE.Mesh(cableGeo, darkMetalMat);
      (cableChains[idx][0].x < 0 ? subInfraLeft : subInfraRight).add(cableMesh);
    }
    mergeStaticMeshesByMaterial(subInfraLeft);
    mergeStaticMeshesByMaterial(subInfraRight);
    this.group.add(subInfraLeft, subInfraRight);

    // Animated Flowing Energy Pulses Along All Overhead Power Cables
    const pulseCount = this.cableCurves.length * 3;
    const pulseGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.56, 6);
    this.cableFlowInst = new THREE.InstancedMesh(pulseGeo, this.cyberDeckTrimMat, pulseCount);
    this.group.add(this.cableFlowInst);
  }

  public setPalette(palette: MineWorldPalette): void {
    this.terrainMat.map = getTerrainTexture(palette.terrainColor, palette.crystalColor);
    this.terrainMat.needsUpdate = true;

    this.cobbleMat.map = getCobblePathTexture(palette.pitFloorColor);
    this.cobbleMat.needsUpdate = true;

    this.cliffMat.color.setHex(0x24334a).lerp(new THREE.Color(palette.cliffColor), 0.28);
    this.cyberDeckTrimMat.color.set(palette.crystalColor);
    this.cyberDeckTrimMat.emissive.set(palette.crystalColor);

    this.crystalAccentMat.color.set(palette.crystalColor);
    this.crystalAccentMat.emissive.set(palette.crystalColor);
    this.leftGate.setPalette(palette.crystalColor, palette.cliffColor);
    this.vaultDais.setPalette(palette.crystalColor, palette.cliffColor);
    (this.dustMat.uniforms.uColor.value as THREE.Color).set(palette.crystalColor);
  }

  public setWeatherSky(weatherId: WeatherId, cloudHex: string): void {
    this.skyHandle.setWeather(weatherId);

    const cc = new THREE.Color(cloudHex);
    this.cloudMat.color.copy(cc);
    this.cloudMat.emissive.copy(cc);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.skyHandle.setLowQuality(low);
    this.leftGate.setLowQuality(low);
    this.vaultDais.setLowQuality(low);
    this.dustPoints.visible = !low;
    if (this.cableFlowInst) {
      this.cableFlowInst.visible = !low;
    }
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

    this.leftGate.update(dtSec, elapsed);
    this.vaultDais.update(dtSec, elapsed, chestHovered, chestBounce);

    this.cyberDeckTrimMat.emissiveIntensity = 1.0 + Math.sin(elapsed * 2.2) * 0.14;
    if (!this.lowQuality) {
      this.dustMat.uniforms.uTime.value = elapsed;
    }

    if (!this.lowQuality && this.cableFlowInst && this.cableCurves.length > 0) {
      let idx = 0;
      for (let c = 0; c < this.cableCurves.length; c++) {
        const curve = this.cableCurves[c];
        for (let p = 0; p < 3; p++) {
          const t = (elapsed * 0.38 + p / 3 + c * 0.17) % 1;
          curve.getPointAt(t, this.cablePosTmp);
          curve.getTangentAt(t, this.cableTanTmp);
          this.cableDummy.position.copy(this.cablePosTmp);
          this.cableDummy.quaternion.setFromUnitVectors(this.cableUpAxis, this.cableTanTmp);
          this.cableDummy.updateMatrix();
          this.cableFlowInst.setMatrixAt(idx++, this.cableDummy.matrix);
        }
      }
      this.cableFlowInst.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.leftGate.dispose();
    this.vaultDais.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    disposeObject3D(this.group);
    this.skyDome.geometry.dispose();
    this.skyHandle.material.dispose();
  }
}
