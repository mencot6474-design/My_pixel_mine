import * as THREE from 'three';
import {
  getDualSlashArcTexture,
  getHitSparkStarTexture,
  getShockwaveRingTexture,
  getSparkStreakTexture,
} from './ProceduralTextures3D';

export interface AttackImpactSpawnOptions {
  targetX: number;
  targetY: number;
  targetZ: number;
  accentColor: string;
  heavy?: boolean;
  comboStep?: number;
  attackerX?: number;
  attackerZ?: number;
  shockwaveScale?: number;
}

interface PooledMeshBase {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  dur: number;
}

interface SlashItem extends PooledMeshBase {
  roll: number;
  rollVel: number;
  tiltX: number;
  flipX: number;
  startScale: number;
  endScale: number;
}

interface HitsparkItem extends PooledMeshBase {
  roll: number;
  rollVel: number;
  peakScale: number;
}

interface StreakItem extends PooledMeshBase {
  vx: number;
  vy: number;
  vz: number;
  baseScale: number;
}

interface ShockwaveItem extends PooledMeshBase {
  startScale: number;
  endScale: number;
  spinSpeed: number;
}

const MAX_SLASHES = 18;
const MAX_HITSPARKS = 16;
const MAX_STREAKS = 64;
const MAX_SHOCKWAVES = 12;

/**
 * Shared 4-layer cyber-anime impact VFX pool (directional dual-pass slash arc,
 * 4-point anime hitspark star, directional spark streaks, and ground shockwave ring)
 * reused across Mine Pit and Battle Tower without InstancedMesh side effects.
 */
export class AttackImpactFxController {
  public readonly group = new THREE.Group();

  private readonly floorY: number;
  private readonly sharedSlashGeo = new THREE.PlaneGeometry(1.75, 1.75);
  private readonly sharedHitsparkGeo = new THREE.PlaneGeometry(1.25, 1.25);
  private readonly sharedStreakGeo = new THREE.PlaneGeometry(0.16, 0.72);
  private readonly sharedShockwaveGeo = new THREE.PlaneGeometry(1.0, 1.0);

  private readonly slashes: SlashItem[] = [];
  private readonly hitsparks: HitsparkItem[] = [];
  private readonly streaks: StreakItem[] = [];
  private readonly shockwaves: ShockwaveItem[] = [];

  private readonly tmpDir = new THREE.Vector2();
  private readonly tmpCamRight = new THREE.Vector3();
  private readonly tmpCamUp = new THREE.Vector3();
  private readonly tmpVel = new THREE.Vector3();

  constructor(opts?: { floorY?: number }) {
    this.floorY = opts?.floorY ?? 0.045;
  }

  private pushPooled<T extends PooledMeshBase>(pool: T[], maxCap: number, item: T): void {
    if (pool.length >= maxCap) {
      const oldest = pool.shift();
      if (oldest) {
        this.group.remove(oldest.mesh);
        oldest.mat.dispose();
      }
    }
    this.group.add(item.mesh);
    pool.push(item);
  }

  private createAdditiveMat(map: THREE.Texture, color: string, opacity: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  public spawnImpact(opts: AttackImpactSpawnOptions): void {
    const heavy = Boolean(opts.heavy);
    const step = (((opts.comboStep ?? 0) % 3) + 3) % 3;
    const isSmash = heavy || step === 2;

    // Direction vector pointing from target toward attacker (keeps VFX visible on front flank)
    let toAttackerX = 0;
    let toAttackerZ = 1;
    if (opts.attackerX !== undefined || opts.attackerZ !== undefined) {
      const dx = (opts.attackerX ?? opts.targetX) - opts.targetX;
      const dz = (opts.attackerZ ?? opts.targetZ + 1) - opts.targetZ;
      const len = Math.hypot(dx, dz);
      if (len > 0.001) {
        toAttackerX = dx / len;
        toAttackerZ = dz / len;
      }
    } else {
      toAttackerX = (Math.random() - 0.5) * 0.6;
      toAttackerZ = 0.85;
      this.tmpDir.set(toAttackerX, toAttackerZ).normalize();
      toAttackerX = this.tmpDir.x;
      toAttackerZ = this.tmpDir.y;
    }

    const contactX = opts.targetX + toAttackerX * 0.3;
    const contactY = opts.targetY;
    const contactZ = opts.targetZ + toAttackerZ * 0.3 + 0.14;
    const sideSign = toAttackerX >= 0 ? 1 : -1;

    // 1. Directional Dual-Pass Slash Arc(s)
    const slashTex = getDualSlashArcTexture();
    const spawnSingleSlash = (roll: number, rollVel: number, flipX: number, scaleMul: number, color: string): void => {
      const mat = this.createAdditiveMat(slashTex, color, 0.96);
      const mesh = new THREE.Mesh(this.sharedSlashGeo, mat);
      mesh.position.set(
        contactX + (Math.random() - 0.5) * 0.12,
        contactY + (Math.random() - 0.5) * 0.12,
        contactZ
      );
      const startScale = 0.72 * scaleMul;
      mesh.scale.set(startScale * flipX, startScale, startScale);
      mesh.rotation.z = roll;
      this.pushPooled(this.slashes, MAX_SLASHES, {
        mesh,
        mat,
        age: 0,
        dur: isSmash ? 0.21 : 0.17,
        roll,
        rollVel,
        tiltX: (Math.random() - 0.5) * 0.35,
        flipX,
        startScale,
        endScale: 1.28 * scaleMul,
      });
    };

    if (isSmash) {
      spawnSingleSlash(-0.58 * sideSign, -2.6 * sideSign, sideSign, 1.2, opts.accentColor);
      spawnSingleSlash(0.68 * sideSign, 2.8 * sideSign, -sideSign, 1.12, '#ffffff');
    } else if (step === 1) {
      spawnSingleSlash(0.64 * sideSign, 2.4 * sideSign, -sideSign, 1.0, opts.accentColor);
    } else {
      spawnSingleSlash(-0.52 * sideSign, -2.2 * sideSign, sideSign, 1.0, opts.accentColor);
    }

    // 2. 4-Point Anime Hitspark Star
    const sparkMat = this.createAdditiveMat(getHitSparkStarTexture(), isSmash ? '#ffffff' : opts.accentColor, 0.98);
    const sparkMesh = new THREE.Mesh(this.sharedHitsparkGeo, sparkMat);
    sparkMesh.position.set(contactX, contactY, contactZ + 0.06);
    const sparkRoll = (Math.random() - 0.5) * 0.45;
    sparkMesh.rotation.z = sparkRoll;
    const peakSparkScale = isSmash ? 1.48 : 1.08;
    sparkMesh.scale.setScalar(0.42);
    this.pushPooled(this.hitsparks, MAX_HITSPARKS, {
      mesh: sparkMesh,
      mat: sparkMat,
      age: 0,
      dur: isSmash ? 0.16 : 0.13,
      roll: sparkRoll,
      rollVel: (Math.random() - 0.5) * 4.2,
      peakScale: peakSparkScale,
    });

    // 3. Directional Spark Streaks
    const streakTex = getSparkStreakTexture();
    const streakCount = isSmash ? 9 : 5;
    const baseAngle = Math.atan2(toAttackerZ, toAttackerX);
    for (let i = 0; i < streakCount; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.45;
      const ang = baseAngle + spread;
      const speed = (isSmash ? 4.4 : 3.2) + Math.random() * 2.8;
      const streakColor = i % 3 === 0 ? '#ffffff' : opts.accentColor;
      const sMat = this.createAdditiveMat(streakTex, streakColor, 0.94);
      const sMesh = new THREE.Mesh(this.sharedStreakGeo, sMat);
      sMesh.position.set(
        contactX + (Math.random() - 0.5) * 0.24,
        contactY + (Math.random() - 0.5) * 0.24,
        contactZ + 0.04
      );
      const baseScale = (isSmash ? 1.15 : 0.88) * (0.75 + Math.random() * 0.45);
      sMesh.scale.setScalar(baseScale);
      this.pushPooled(this.streaks, MAX_STREAKS, {
        mesh: sMesh,
        mat: sMat,
        age: 0,
        dur: (isSmash ? 0.21 : 0.18) + Math.random() * 0.05,
        vx: Math.cos(ang) * speed,
        vy: 1.5 + Math.random() * 3.1,
        vz: Math.sin(ang) * speed,
        baseScale,
      });
    }

    // 4. Ground Shockwave Ring
    const ringMat = this.createAdditiveMat(getShockwaveRingTexture(), opts.accentColor, isSmash ? 0.88 : 0.64);
    const ringMesh = new THREE.Mesh(this.sharedShockwaveGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(opts.targetX, this.floorY, opts.targetZ);
    const swScale = opts.shockwaveScale ?? 1.0;
    const startSw = (isSmash ? 0.72 : 0.56) * swScale;
    ringMesh.scale.setScalar(startSw);
    this.pushPooled(this.shockwaves, MAX_SHOCKWAVES, {
      mesh: ringMesh,
      mat: ringMat,
      age: 0,
      dur: isSmash ? 0.26 : 0.22,
      startScale: startSw,
      endScale: (isSmash ? 2.75 : 2.05) * swScale,
      spinSpeed: (Math.random() < 0.5 ? -1 : 1) * 2.4,
    });
  }

  public update(dtSec: number, camera?: THREE.Camera): void {
    let rem = Math.max(0, dtSec);
    while (rem > 0) {
      const step = Math.min(0.1, rem);
      rem -= step;
      this.stepPools(step, camera);
    }
  }

  private stepPools(dtSec: number, camera?: THREE.Camera): void {
    if (camera) {
      this.tmpCamRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      this.tmpCamUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.age += dtSec;
      if (s.age >= s.dur) {
        this.group.remove(s.mesh);
        s.mat.dispose();
        this.slashes.splice(i, 1);
        continue;
      }
      const p = s.age / s.dur;
      const easeOut = 1 - Math.pow(1 - p, 2.5);
      const scale = s.startScale + (s.endScale - s.startScale) * easeOut;
      s.roll += s.rollVel * dtSec;
      s.mat.opacity = 0.96 * Math.pow(1 - p, 1.45);
      s.mesh.scale.set(scale * s.flipX, scale, scale);
      if (camera) {
        s.mesh.quaternion.copy(camera.quaternion);
        s.mesh.rotateZ(s.roll);
        s.mesh.rotateX(s.tiltX);
      } else {
        s.mesh.rotation.set(s.tiltX, 0, s.roll);
      }
    }

    for (let i = this.hitsparks.length - 1; i >= 0; i--) {
      const h = this.hitsparks[i];
      h.age += dtSec;
      if (h.age >= h.dur) {
        this.group.remove(h.mesh);
        h.mat.dispose();
        this.hitsparks.splice(i, 1);
        continue;
      }
      const p = h.age / h.dur;
      const pop = p < 0.28 ? 0.45 + (p / 0.28) * (h.peakScale - 0.45) : h.peakScale * (1 - ((p - 0.28) / 0.72) * 0.82);
      h.roll += h.rollVel * dtSec;
      h.mat.opacity = p < 0.2 ? 0.98 : 0.98 * Math.pow(1 - (p - 0.2) / 0.8, 1.3);
      h.mesh.scale.setScalar(Math.max(0.05, pop));
      if (camera) {
        h.mesh.quaternion.copy(camera.quaternion);
        h.mesh.rotateZ(h.roll);
      } else {
        h.mesh.rotation.set(0, 0, h.roll);
      }
    }

    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const st = this.streaks[i];
      st.age += dtSec;
      if (st.age >= st.dur) {
        this.group.remove(st.mesh);
        st.mat.dispose();
        this.streaks.splice(i, 1);
        continue;
      }
      const p = st.age / st.dur;
      st.vy -= 9.5 * dtSec;
      st.mesh.position.x += st.vx * dtSec;
      st.mesh.position.y = Math.max(this.floorY + 0.04, st.mesh.position.y + st.vy * dtSec);
      st.mesh.position.z += st.vz * dtSec;
      const widthScale = st.baseScale * (1 - p * 0.75);
      const lenScale = st.baseScale * (1.25 - p * 0.9);
      st.mesh.scale.set(Math.max(0.04, widthScale), Math.max(0.08, lenScale), 1);
      st.mat.opacity = 0.94 * (1 - p);

      if (camera) {
        this.tmpVel.set(st.vx, st.vy, st.vz);
        const screenX = this.tmpVel.dot(this.tmpCamRight);
        const screenY = this.tmpVel.dot(this.tmpCamUp);
        const angle = Math.atan2(screenY, screenX) - Math.PI / 2;
        st.mesh.quaternion.copy(camera.quaternion);
        st.mesh.rotateZ(angle);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dtSec;
      if (sw.age >= sw.dur) {
        this.group.remove(sw.mesh);
        sw.mat.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const p = sw.age / sw.dur;
      const easeOut = 1 - Math.pow(1 - p, 3);
      const scale = sw.startScale + (sw.endScale - sw.startScale) * easeOut;
      sw.mesh.scale.setScalar(scale);
      sw.mesh.rotation.z += sw.spinSpeed * dtSec;
      sw.mat.opacity = 0.85 * Math.pow(1 - p, 1.5);
    }
  }

  public getActiveCounts(): { slashes: number; hitsparks: number; streaks: number; shockwaves: number } {
    return {
      slashes: this.slashes.length,
      hitsparks: this.hitsparks.length,
      streaks: this.streaks.length,
      shockwaves: this.shockwaves.length,
    };
  }

  private clearPool(pool: PooledMeshBase[]): void {
    for (const item of pool) {
      this.group.remove(item.mesh);
      item.mat.dispose();
    }
    pool.length = 0;
  }

  public dispose(): void {
    this.clearPool(this.slashes);
    this.clearPool(this.hitsparks);
    this.clearPool(this.streaks);
    this.clearPool(this.shockwaves);
    this.sharedSlashGeo.dispose();
    this.sharedHitsparkGeo.dispose();
    this.sharedStreakGeo.dispose();
    this.sharedShockwaveGeo.dispose();
  }
}
