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
import { createCyberMonolithForkFinial } from './CyberProps3D';
import { mergeStaticMeshesByMaterial } from './MeshHelpers3D';
import { createWeatherSkyMaterial, WeatherSkyMaterialHandle } from './WeatherSkyShader';

interface CloudCluster {
  group: THREE.Group;
  speed: number;
}

interface VoidShardSeed {
  angle: number;
  radius: number;
  baseY: number;
  scale: number;
  speed: number;
}

export class MineEnvironment3D {
  public readonly group = new THREE.Group();
  public readonly skyDome: THREE.Mesh;

  private readonly skyHandle: WeatherSkyMaterialHandle;
  private readonly cloudMat: THREE.MeshStandardMaterial;
  private readonly cliffMat: THREE.MeshStandardMaterial;
  private readonly cyberDeckTrimMat: THREE.MeshStandardMaterial;
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
  private readonly voidShardsInst: THREE.InstancedMesh;
  private readonly voidShardSeeds: VoidShardSeed[] = [];
  private readonly shardDummy = new THREE.Object3D();
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

    // 3. Left & Right Floating Satellite Platforms (Open-Sky Flanking Islands — zero rectangular deck slabs)
    this.leftGate = createNexusLeftGate({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.leftGate.group);

    this.vaultDais = createVaultCoreDais({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.vaultDais.group);

    // 4. Distant Lateral Conduit Spires + Energy Tethers (rear central sky window kept 100% clear)
    this.buildDistantCityInfrastructure(darkMetalMat, steelMat);

    // 5. Drifting Under-Void Crystal Shards Beneath the Floating Circular Arena Ring (InstancedMesh)
    const shardCount = 16;
    const shardGeo = new THREE.OctahedronGeometry(0.45, 0);
    shardGeo.scale(0.65, 1.85, 0.65);
    this.voidShardsInst = new THREE.InstancedMesh(shardGeo, this.cliffMat, shardCount);
    for (let i = 0; i < shardCount; i++) {
      this.voidShardSeeds.push({
        angle: (i / shardCount) * Math.PI * 2 + (i % 3) * 0.2,
        radius: 8.4 + (i % 5) * 1.15,
        baseY: -2.9 - (i % 4) * 0.55,
        scale: 0.55 + (i % 3) * 0.25,
        speed: 0.04 + (i % 4) * 0.015,
      });
    }
    this.group.add(this.voidShardsInst);
    this.updateVoidShards(0);

    // 6. Ambient Soft Bokeh Cyber Mana Motes
    const dustCount = 20;
    const positions = new Float32Array(dustCount * 3);
    const phases = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = 0.6 + Math.random() * 4.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 11;
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

  private buildDistantCityInfrastructure(
    darkMetalMat: THREE.Material,
    steelMat: THREE.Material
  ): void {
    // Lateral Distant Conduit Spire Buoys (|x| >= 16.8, max roof y <= 3.6 so central sky window stays clear)
    const towerColumnGeo = new THREE.CylinderGeometry(0.85, 1.35, 14.5, 8);
    const crownCapGeo = new THREE.CylinderGeometry(1.15, 0.95, 0.65, 8);
    const beaconRingGeo = new THREE.TorusGeometry(1.05, 0.06, 6, 18);
    beaconRingGeo.rotateX(Math.PI / 2);

    const lateralTowers: [number, number, number][] = [
      [-17.2, -9.2, 3.2],
      [-20.2, -15.8, 3.6],
      [17.2, -9.2, 3.1],
      [20.2, -15.8, 3.5],
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

    // Sweeping Catenary Power Tethers (merged per side so left/right bounding centers stay outside central sky window)
    const leftChains: THREE.Vector3[][] = [
      [
        new THREE.Vector3(-8.2, 0.0, 1.65),
        new THREE.Vector3(-9.7, -0.35, 1.45),
        new THREE.Vector3(-11.4, 0.55, 1.15),
      ],
      [
        this.leftGate.cableSocketWorld.clone(),
        new THREE.Vector3(-14.6, 3.45, -4.8),
        new THREE.Vector3(-17.2, 3.05, -9.2),
      ],
      [
        new THREE.Vector3(-17.2, 3.0, -9.2),
        new THREE.Vector3(-18.7, 2.35, -12.5),
        new THREE.Vector3(-20.2, 3.35, -15.8),
      ],
    ];
    const rightChains: THREE.Vector3[][] = [
      [
        new THREE.Vector3(8.2, 0.0, 1.65),
        new THREE.Vector3(9.2, -0.25, 1.65),
        new THREE.Vector3(10.25, 0.55, 1.65),
      ],
      [
        this.vaultDais.cableSocketWorld.clone(),
        new THREE.Vector3(14.8, 2.35, -4.2),
        new THREE.Vector3(17.2, 2.95, -9.2),
      ],
      [
        new THREE.Vector3(17.2, 2.9, -9.2),
        new THREE.Vector3(18.7, 2.25, -12.5),
        new THREE.Vector3(20.2, 3.25, -15.8),
      ],
    ];
    for (const sideChains of [leftChains, rightChains]) {
      const sideGroup = new THREE.Group();
      for (const pts of sideChains) {
        const curve = new THREE.CatmullRomCurve3(pts);
        this.cableCurves.push(curve);
        sideGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.055, 6, false), darkMetalMat));
      }
      mergeStaticMeshesByMaterial(sideGroup);
      this.group.add(sideGroup);
    }

    const pulseCount = this.cableCurves.length * 3;
    const pulseGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.56, 6);
    this.cableFlowInst = new THREE.InstancedMesh(pulseGeo, this.cyberDeckTrimMat, pulseCount);
    this.group.add(this.cableFlowInst);
  }

  private updateVoidShards(elapsed: number): void {
    const activeCount = this.lowQuality ? 8 : this.voidShardSeeds.length;
    this.voidShardsInst.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const s = this.voidShardSeeds[i];
      const ang = s.angle + elapsed * s.speed;
      this.shardDummy.position.set(
        Math.cos(ang) * s.radius,
        s.baseY + Math.sin(elapsed * 0.9 + i) * 0.24,
        1.65 + Math.sin(ang) * s.radius
      );
      this.shardDummy.rotation.set(0.15 * Math.sin(i), ang, 0.12 * Math.cos(i));
      this.shardDummy.scale.setScalar(s.scale);
      this.shardDummy.updateMatrix();
      this.voidShardsInst.setMatrixAt(i, this.shardDummy.matrix);
    }
    this.voidShardsInst.instanceMatrix.needsUpdate = true;
  }

  public setPalette(palette: MineWorldPalette): void {
    this.cliffMat.color.setHex(0x24334a).lerp(new THREE.Color(palette.cliffColor), 0.28);
    this.cyberDeckTrimMat.color.set(palette.crystalColor);
    this.cyberDeckTrimMat.emissive.set(palette.crystalColor);
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
    this.updateVoidShards(0);
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
      this.updateVoidShards(elapsed);
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
