import * as THREE from 'three';
import type { OverclockTier } from '../game/OverclockDomain';
import { getWeatherById, WeatherId } from '../game/WeatherData';

const PARTICLE_COUNT = 120;
const FEVER_PARTICLE_COUNT = 80;
const FIELD_HALF_W = 19;
const FIELD_HALF_D = 16;
const TOP_Y = 14.5;
const BOTTOM_Y = -0.8;

type ParticleSpriteKind = 'rain' | 'snow' | 'orb' | 'star';

function makeParticleTexture(kind: ParticleSpriteKind): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  if (kind === 'rain') {
    const grad = ctx.createLinearGradient(32, 4, 28, 60);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(34, 6);
    ctx.lineTo(29, 58);
    ctx.stroke();
  } else if (kind === 'snow') {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.38, 'rgba(224, 242, 254, 0.85)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'star') {
    const glow = ctx.createRadialGradient(32, 32, 1, 32, 32, 28);
    glow.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.28, 'rgba(254, 240, 138, 0.72)');
    glow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    for (const [rx, ry] of [
      [24, 2.2],
      [2.2, 24],
    ]) {
      ctx.beginPath();
      ctx.ellipse(32, 32, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 28);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class WeatherFx3D {
  public readonly group = new THREE.Group();

  private weatherId: WeatherId = 'light_rain';
  private shopMode = false;
  private feverTier: 0 | OverclockTier = 0;
  private activeParticleCount = PARTICLE_COUNT;
  private activeFeverCount = FEVER_PARTICLE_COUNT;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly drifts: Float32Array;
  private readonly geom: THREE.BufferGeometry;
  private readonly pointsMat: THREE.PointsMaterial;
  private readonly points: THREE.Points;
  private readonly feverPositions: Float32Array;
  private readonly feverSpeeds: Float32Array;
  private readonly feverGeom: THREE.BufferGeometry;
  private readonly feverMat: THREE.PointsMaterial;
  private readonly feverPoints: THREE.Points;
  private readonly particleTextures: Record<ParticleSpriteKind, THREE.Texture | null>;

  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.speeds = new Float32Array(PARTICLE_COUNT);
    this.drifts = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * FIELD_HALF_W;
      this.positions[i * 3 + 1] = BOTTOM_Y + Math.random() * (TOP_Y - BOTTOM_Y);
      this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * FIELD_HALF_D - 2;
      this.speeds[i] = 0.7 + Math.random() * 0.65;
      this.drifts[i] = Math.random() * Math.PI * 2;
    }

    this.particleTextures = {
      rain: makeParticleTexture('rain'),
      snow: makeParticleTexture('snow'),
      orb: makeParticleTexture('orb'),
      star: makeParticleTexture('star'),
    };

    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.pointsMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      ...(this.particleTextures.rain ? { map: this.particleTextures.rain } : {}),
      size: 0.42,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      fog: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geom, this.pointsMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.group.add(this.points);

    this.feverPositions = new Float32Array(FEVER_PARTICLE_COUNT * 3);
    this.feverSpeeds = new Float32Array(FEVER_PARTICLE_COUNT);
    for (let i = 0; i < FEVER_PARTICLE_COUNT; i++) {
      this.feverPositions[i * 3] = (Math.random() * 2 - 1) * FIELD_HALF_W;
      this.feverPositions[i * 3 + 1] = BOTTOM_Y + Math.random() * (TOP_Y - BOTTOM_Y);
      this.feverPositions[i * 3 + 2] = (Math.random() * 2 - 1) * FIELD_HALF_D - 2;
      this.feverSpeeds[i] = 0.8 + Math.random() * 0.7;
    }
    this.feverGeom = new THREE.BufferGeometry();
    this.feverGeom.setAttribute('position', new THREE.BufferAttribute(this.feverPositions, 3));
    this.feverMat = new THREE.PointsMaterial({
      color: 0xfde047,
      ...(this.particleTextures.rain ? { map: this.particleTextures.rain } : {}),
      size: 0.56,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.feverPoints = new THREE.Points(this.feverGeom, this.feverMat);
    this.feverPoints.frustumCulled = false;
    this.feverPoints.renderOrder = 5;
    this.feverPoints.visible = false;
    this.group.add(this.feverPoints);

    this.setWeather('light_rain');
  }

  public setFeverTier(tier: 0 | OverclockTier): void {
    if (this.feverTier === tier) return;
    this.feverTier = tier;
    if (tier === 3) {
      this.feverMat.color.setHex(0x22d3ee);
      this.feverMat.size = 0.78;
      this.feverMat.opacity = 0.96;
    } else if (tier === 2) {
      this.feverMat.color.setHex(0xfb7185);
      this.feverMat.size = 0.66;
      this.feverMat.opacity = 0.92;
    } else {
      this.feverMat.color.setHex(0xfde047);
      this.feverMat.size = 0.56;
      this.feverMat.opacity = 0.88;
    }
  }

  public setShopMode(isShop: boolean): void {
    if (this.shopMode === isShop) return;
    this.shopMode = isShop;
    this.group.scale.setScalar(isShop ? 1.35 : 1.0);
    this.applyParticleStyle();
  }

  public setQualityScale(scale: number): void {
    const clamped = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
    this.activeParticleCount = Math.round(PARTICLE_COUNT * clamped);
    this.geom.setDrawRange(0, this.activeParticleCount);
    this.activeFeverCount = Math.round(FEVER_PARTICLE_COUNT * clamped);
    this.feverGeom.setDrawRange(0, this.activeFeverCount);
    if (this.activeParticleCount <= 0 && this.activeFeverCount <= 0) {
      this.group.visible = false;
    }
  }

  public getActiveParticleCount(): number {
    return this.activeParticleCount;
  }

  private applyParticleStyle(): void {
    const weatherId = this.weatherId;
    const scaleBoost = this.shopMode ? 1.65 : 1.0;

    if (weatherId === 'light_rain') {
      this.pointsMat.size = 0.44 * scaleBoost;
      this.pointsMat.opacity = this.shopMode ? 0.72 : 0.6;
    } else if (weatherId === 'snow_rain') {
      this.pointsMat.size = 0.3 * scaleBoost;
      this.pointsMat.opacity = this.shopMode ? 0.95 : 0.85;
    } else if (weatherId === 'bloodmoon') {
      this.pointsMat.size = 0.22 * scaleBoost;
      this.pointsMat.opacity = this.shopMode ? 0.82 : 0.68;
    } else if (weatherId === 'void') {
      this.pointsMat.size = 0.22 * scaleBoost;
      this.pointsMat.opacity = this.shopMode ? 0.82 : 0.68;
    } else {
      this.pointsMat.size = 0.34 * scaleBoost;
      this.pointsMat.opacity = this.shopMode ? 0.92 : 0.85;
    }
  }

  public setWeather(weatherId: WeatherId): void {
    this.weatherId = weatherId;
    const def = getWeatherById(weatherId);
    this.pointsMat.color.set(def.particleColor);

    const spriteKind: ParticleSpriteKind =
      weatherId === 'light_rain'
        ? 'rain'
        : weatherId === 'snow_rain'
          ? 'snow'
          : weatherId === 'celestial'
            ? 'star'
            : 'orb';
    const nextTex = this.particleTextures[spriteKind] ?? null;
    if (this.pointsMat.map !== nextTex) {
      this.pointsMat.map = nextTex;
      this.pointsMat.needsUpdate = true;
    }

    const nextBlending = def.particleAdditive ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (this.pointsMat.blending !== nextBlending) {
      this.pointsMat.blending = nextBlending;
      this.pointsMat.needsUpdate = true;
    }

    this.applyParticleStyle();
  }

  public update(dtSec: number, elapsed: number, active: boolean): void {
    const weatherEnabled = active && this.activeParticleCount > 0;
    const feverEnabled = active && !this.shopMode && this.feverTier > 0 && this.activeFeverCount > 0;
    this.points.visible = weatherEnabled;
    this.feverPoints.visible = feverEnabled;
    this.group.visible = weatherEnabled || feverEnabled;
    if (!this.group.visible) return;

    if (weatherEnabled) {
      const w = this.weatherId;
      const count = this.activeParticleCount;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const spd = this.speeds[i];
        const ph = this.drifts[i];

        if (w === 'light_rain') {
          this.positions[idx] -= dtSec * 2.2 * spd;
          this.positions[idx + 1] -= dtSec * 16.5 * spd;
        } else if (w === 'snow_rain') {
          this.positions[idx] += Math.sin(elapsed * 1.6 + ph) * dtSec * 1.25;
          this.positions[idx + 1] -= dtSec * 3.2 * spd;
          this.positions[idx + 2] += Math.cos(elapsed * 1.3 + ph) * dtSec * 0.65;
        } else if (w === 'bloodmoon') {
          this.positions[idx] += Math.sin(elapsed * 0.9 + ph) * dtSec * 0.8;
          this.positions[idx + 1] += dtSec * 1.45 * spd;
        } else if (w === 'void') {
          this.positions[idx] += Math.cos(elapsed * 1.2 + ph) * dtSec * 0.9;
          this.positions[idx + 1] += dtSec * 1.8 * spd;
        } else {
          this.positions[idx] += Math.sin(elapsed * 1.4 + ph) * dtSec * 1.1;
          this.positions[idx + 1] -= dtSec * 2.3 * spd;
        }

        if (this.positions[idx + 1] < BOTTOM_Y) {
          this.positions[idx + 1] = TOP_Y;
          this.positions[idx] = (Math.random() * 2 - 1) * FIELD_HALF_W;
          this.positions[idx + 2] = (Math.random() * 2 - 1) * FIELD_HALF_D - 2;
        } else if (this.positions[idx + 1] > TOP_Y) {
          this.positions[idx + 1] = BOTTOM_Y;
          this.positions[idx] = (Math.random() * 2 - 1) * FIELD_HALF_W;
          this.positions[idx + 2] = (Math.random() * 2 - 1) * FIELD_HALF_D - 2;
        }
        if (this.positions[idx] < -FIELD_HALF_W) this.positions[idx] = FIELD_HALF_W;
        if (this.positions[idx] > FIELD_HALF_W) this.positions[idx] = -FIELD_HALF_W;
      }

      const posAttr = this.geom.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
    }

    if (feverEnabled) {
      const tierMult = this.feverTier === 3 ? 1.65 : this.feverTier === 2 ? 1.3 : 1.0;
      const feverCount = this.activeFeverCount;
      for (let i = 0; i < feverCount; i++) {
        const idx = i * 3;
        const spd = this.feverSpeeds[i] * tierMult;
        this.feverPositions[idx] -= dtSec * 4.2 * spd;
        this.feverPositions[idx + 1] -= dtSec * 21.0 * spd;
        if (this.feverPositions[idx + 1] < BOTTOM_Y) {
          this.feverPositions[idx + 1] = TOP_Y;
          this.feverPositions[idx] = (Math.random() * 2 - 1) * FIELD_HALF_W;
          this.feverPositions[idx + 2] = (Math.random() * 2 - 1) * FIELD_HALF_D - 2;
        }
        if (this.feverPositions[idx] < -FIELD_HALF_W) this.feverPositions[idx] = FIELD_HALF_W;
      }
      const feverAttr = this.feverGeom.getAttribute('position') as THREE.BufferAttribute;
      feverAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geom.dispose();
    this.pointsMat.dispose();
    this.feverGeom.dispose();
    this.feverMat.dispose();
    for (const tex of Object.values(this.particleTextures)) {
      tex?.dispose();
    }
  }
}
