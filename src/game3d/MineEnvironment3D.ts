import * as THREE from 'three';
import type { OverclockTier } from '../game/OverclockDomain';
import type { WeatherId } from '../game/WeatherData';
import type { MineWorldPalette } from './MineWorldPalette';
import {
  createVaultCoreDais,
  type VaultCoreDaisHandle,
} from './ArenaWings3D';
import { disposeObject3D } from './ChestVaultStation3D';
import { getSkyDomeTexture } from './ProceduralTextures3D';
import { SkyMetropolis3D } from './SkyMetropolis3D';

interface VoidShardSeed {
  angle: number;
  radius: number;
  baseY: number;
  scale: number;
  speed: number;
}

function getCleanSkyColors(palette: MineWorldPalette): { topHex: string; bottomHex: string } {
  const topHex = '#' + new THREE.Color(palette.skyTop).lerp(new THREE.Color(0x091124), 0.72).getHexString();
  const bottomHex = '#' + new THREE.Color(palette.fogColor).lerp(new THREE.Color(0x162544), 0.68).getHexString();
  return { topHex, bottomHex };
}

export class MineEnvironment3D {
  public readonly group = new THREE.Group();
  public readonly skyDome: THREE.Mesh;

  private readonly skyMat: THREE.MeshBasicMaterial;
  private readonly metropolis: SkyMetropolis3D;
  private readonly cliffMat: THREE.MeshStandardMaterial;
  private readonly cyberDeckTrimMat: THREE.MeshStandardMaterial;
  private readonly dustGeo: THREE.BufferGeometry;
  private readonly dustMat: THREE.ShaderMaterial;
  private readonly dustPoints: THREE.Points;
  private lowQuality = false;

  private readonly voidShardsInst: THREE.InstancedMesh;
  private readonly voidShardSeeds: VoidShardSeed[] = [];
  private readonly shardDummy = new THREE.Object3D();
  private readonly vaultDais: VaultCoreDaisHandle;

  constructor(palette: MineWorldPalette) {
    // 1. Lightweight Static Gradient Sky Dome (zero per-pixel weather shader or cloud overhead)
    const { topHex, bottomHex } = getCleanSkyColors(palette);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: getSkyDomeTexture(topHex, bottomHex),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), this.skyMat);
    this.skyDome.renderOrder = -100;
    this.skyDome.raycast = () => {};
    this.group.add(this.skyDome);

    // 2. Hologram Sky-Metropolis Skyline + Live Broadcast Blimp ("MyChibiMine")
    this.metropolis = new SkyMetropolis3D(palette);
    this.group.add(this.metropolis.group);

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

    // 3. Right Floating Satellite Cyber Hover-Pad for Cargo Pod (left side kept 100% open to Neo-Tokyo sky)
    this.vaultDais = createVaultCoreDais({
      crystalColor: palette.crystalColor,
      cliffColor: palette.cliffColor,
    });
    this.group.add(this.vaultDais.group);

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
    this.dustPoints.raycast = () => {};
    this.group.add(this.dustPoints);

    this.setPalette(palette);
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

  public getMetropolis(): SkyMetropolis3D {
    return this.metropolis;
  }

  public setPalette(palette: MineWorldPalette): void {
    const { topHex, bottomHex } = getCleanSkyColors(palette);
    this.skyMat.map = getSkyDomeTexture(topHex, bottomHex);
    this.skyMat.needsUpdate = true;

    this.cliffMat.color.setHex(0x24334a).lerp(new THREE.Color(palette.cliffColor), 0.28);
    this.cyberDeckTrimMat.color.set(palette.crystalColor);
    this.cyberDeckTrimMat.emissive.set(palette.crystalColor);
    this.vaultDais.setPalette(palette.crystalColor, palette.cliffColor);
    this.metropolis.setPalette(palette);
    (this.dustMat.uniforms.uColor.value as THREE.Color).set(palette.crystalColor);
  }

  public setWeatherSky(_weatherId: WeatherId, _cloudHex: string): void {
    // Sky weather dome shader removed for maximum FPS; world sky gradient stays crisp and lag-free.
  }

  public setOverclockTier(tier: 0 | OverclockTier): void {
    this.metropolis.setOverclockTier(tier);
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.metropolis.setLowQuality(low);
    this.vaultDais.setLowQuality(low);
    this.dustPoints.visible = !low;
    this.updateVoidShards(0);
  }

  public updateSky(_elapsed: number, camPos: THREE.Vector3): void {
    this.skyDome.position.copy(camPos);
  }

  public update(
    dtSec: number,
    elapsed: number,
    chestHovered = false,
    chestBounce = 0
  ): void {
    const safeDt = Math.min(Math.max(0, dtSec), 0.1);
    this.metropolis.update(safeDt, elapsed);
    this.vaultDais.update(safeDt, elapsed, chestHovered, chestBounce);

    this.cyberDeckTrimMat.emissiveIntensity = 1.0 + Math.sin(elapsed * 2.2) * 0.14;
    if (!this.lowQuality) {
      this.dustMat.uniforms.uTime.value = elapsed;
      this.updateVoidShards(elapsed);
    }
  }

  public dispose(): void {
    this.metropolis.dispose();
    this.vaultDais.dispose();
    this.voidShardsInst.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    disposeObject3D(this.group);
    this.skyDome.geometry.dispose();
    this.skyMat.dispose();
  }
}
