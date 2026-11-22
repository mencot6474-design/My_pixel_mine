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
  camera?: THREE.Camera;
}

export interface OreShatterSpawnOptions {
  targetX: number;
  targetY: number;
  targetZ: number;
  oreColor: string;
  secondaryColor?: string;
  isMeteor?: boolean;
  camera?: THREE.Camera;
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

interface MoteItem extends PooledMeshBase {
  vx: number;
  vy: number;
  vz: number;
  baseScale: number;
  phase: number;
  roll: number;
  rollVel: number;
}

const MAX_SLASHES = 18;
const MAX_HITSPARKS = 16;
const MAX_STREAKS = 64;
const MAX_SHOCKWAVES = 12;
const MAX_MOTES = 48;

/**
 * Shared 5-layer cyber-anime impact & ore shatter VFX pool (directional dual-pass slash arc,
 * 4-point anime hitspark star, directional spark streaks, ground shockwave ring, and rising
 * luminescent crystal motes) reused across Mine Pit and Battle Tower without InstancedMesh side effects.
 */
export class AttackImpactFxController {
  public readonly group = new THREE.Group();

  private readonly floorY: number;
  private readonly sharedSlashGeo = new THREE.PlaneGeometry(1.75, 1.75);
  private readonly sharedHitsparkGeo = new THREE.PlaneGeometry(1.25, 1.25);
  private readonly sharedStreakGeo = new THREE.PlaneGeometry(0.18, 0.82);
  private readonly sharedShockwaveGeo = new THREE.PlaneGeometry(1.0, 1.0);
  private readonly sharedMoteGeo = new THREE.PlaneGeometry(0.42, 0.42);

  private readonly slashes: SlashItem[] = [];
  private readonly hitsparks: HitsparkItem[] = [];
  private readonly streaks: StreakItem[] = [];
  private readonly shockwaves: ShockwaveItem[] = [];
  private readonly motes: MoteItem[] = [];

  private readonly slashFree: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
  private readonly hitsparkFree: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
  private readonly streakFree: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
  private readonly shockwaveFree: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
  private readonly moteFree: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];

  private readonly tmpDir = new THREE.Vector2();
  private readonly tmpCamRight = new THREE.Vector3();
  private readonly tmpCamUp = new THREE.Vector3();
  private readonly tmpVel = new THREE.Vector3();
  private lastCamera?: THREE.Camera;
  private lowQuality = false;

  constructor(opts?: { floorY?: number }) {
    this.floorY = opts?.floorY ?? 0.045;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  private pushPooled<T extends PooledMeshBase>(
    pool: T[],
    freeList: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>,
    maxCap: number,
    item: T
  ): void {
    if (pool.length >= maxCap) {
      const oldest = pool.shift();
      if (oldest) {
        this.group.remove(oldest.mesh);
        if (freeList.length < maxCap) {
          freeList.push({ mesh: oldest.mesh, mat: oldest.mat });
        } else {
          oldest.mat.dispose();
        }
      }
    }
    this.group.add(item.mesh);
    pool.push(item);
  }

  private acquireMesh(
    freeList: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>,
    geo: THREE.BufferGeometry,
    map: THREE.Texture,
    color: string,
    opacity: number
  ): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
    const reused = freeList.pop();
    if (reused) {
      if (reused.mat.map !== map) {
        reused.mat.map = map;
        reused.mat.needsUpdate = true;
      }
      reused.mat.color.set(color);
      reused.mat.opacity = opacity;
      reused.mesh.rotation.set(0, 0, 0);
      reused.mesh.quaternion.identity();
      return reused;
    }
    const mat = this.createAdditiveMat(map, color, opacity);
    const mesh = new THREE.Mesh(geo, mat);
    return { mesh, mat };
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

  private prepareCameraAxes(camera?: THREE.Camera): void {
    if (!camera) return;
    this.tmpCamRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.tmpCamUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  }

  private orientBillboard(mesh: THREE.Mesh, roll: number, tiltX: number, camera?: THREE.Camera): void {
    if (camera) {
      mesh.quaternion.copy(camera.quaternion);
      mesh.rotateZ(roll);
      if (tiltX !== 0) mesh.rotateX(tiltX);
    } else {
      mesh.rotation.set(tiltX, 0, roll);
    }
  }

  private orientStreak(st: StreakItem, camera?: THREE.Camera): void {
    if (!camera) return;
    this.tmpVel.set(st.vx, st.vy, st.vz);
    const screenX = this.tmpVel.dot(this.tmpCamRight);
    const screenY = this.tmpVel.dot(this.tmpCamUp);
    const angle = Math.atan2(screenY, screenX) - Math.PI / 2;
    st.mesh.quaternion.copy(camera.quaternion);
    st.mesh.rotateZ(angle);
  }

  public spawnImpact(opts: AttackImpactSpawnOptions): void {
    const heavy = Boolean(opts.heavy);
    const step = (((opts.comboStep ?? 0) % 3) + 3) % 3;
    const isSmash = heavy || step === 2;
    const activeCam = opts.camera ?? this.lastCamera;
    this.prepareCameraAxes(activeCam);

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
      const { mesh, mat } = this.acquireMesh(this.slashFree, this.sharedSlashGeo, slashTex, color, 0.96);
      mesh.position.set(
        contactX + (Math.random() - 0.5) * 0.12,
        contactY + (Math.random() - 0.5) * 0.12,
        contactZ
      );
      const startScale = 0.72 * scaleMul;
      const tiltX = (Math.random() - 0.5) * 0.35;
      mesh.scale.set(startScale * flipX, startScale, startScale);
      this.orientBillboard(mesh, roll, tiltX, activeCam);
      this.pushPooled(this.slashes, this.slashFree, this.lowQuality ? 6 : MAX_SLASHES, {
        mesh,
        mat,
        age: 0,
        dur: isSmash ? 0.21 : 0.17,
        roll,
        rollVel,
        tiltX,
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
    const { mesh: sparkMesh, mat: sparkMat } = this.acquireMesh(
      this.hitsparkFree,
      this.sharedHitsparkGeo,
      getHitSparkStarTexture(),
      isSmash ? '#ffffff' : opts.accentColor,
      0.98
    );
    sparkMesh.position.set(contactX, contactY, contactZ + 0.06);
    const sparkRoll = (Math.random() - 0.5) * 0.45;
    this.orientBillboard(sparkMesh, sparkRoll, 0, activeCam);
    const peakSparkScale = isSmash ? 1.48 : 1.08;
    sparkMesh.scale.setScalar(0.42);
    this.pushPooled(this.hitsparks, this.hitsparkFree, this.lowQuality ? 6 : MAX_HITSPARKS, {
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
    const streakCount = this.lowQuality ? (isSmash ? 3 : 1) : isSmash ? 8 : 3;
    const baseAngle = Math.atan2(toAttackerZ, toAttackerX);
    for (let i = 0; i < streakCount; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.55;
      const ang = baseAngle + spread;
      const speed = (isSmash ? 4.8 : 3.5) + Math.random() * 3.1;
      const streakColor = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? opts.accentColor : '#fde047';
      const { mesh: sMesh, mat: sMat } = this.acquireMesh(
        this.streakFree,
        this.sharedStreakGeo,
        streakTex,
        streakColor,
        0.96
      );
      sMesh.position.set(
        contactX + (Math.random() - 0.5) * 0.24,
        contactY + (Math.random() - 0.5) * 0.24,
        contactZ + 0.04
      );
      const baseScale = (isSmash ? 1.22 : 0.94) * (0.75 + Math.random() * 0.5);
      sMesh.scale.setScalar(baseScale);
      const streakItem: StreakItem = {
        mesh: sMesh,
        mat: sMat,
        age: 0,
        dur: (isSmash ? 0.24 : 0.2) + Math.random() * 0.06,
        vx: Math.cos(ang) * speed,
        vy: 1.7 + Math.random() * 3.4,
        vz: Math.sin(ang) * speed,
        baseScale,
      };
      this.orientStreak(streakItem, activeCam);
      this.pushPooled(this.streaks, this.streakFree, this.lowQuality ? 12 : MAX_STREAKS, streakItem);
    }

    // 4. Ground Shockwave Ring
    const { mesh: ringMesh, mat: ringMat } = this.acquireMesh(
      this.shockwaveFree,
      this.sharedShockwaveGeo,
      getShockwaveRingTexture(),
      opts.accentColor,
      isSmash ? 0.9 : 0.68
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(opts.targetX, this.floorY, opts.targetZ);
    const swScale = opts.shockwaveScale ?? 1.0;
    const startSw = (isSmash ? 0.72 : 0.56) * swScale;
    ringMesh.scale.setScalar(startSw);
    this.pushPooled(this.shockwaves, this.shockwaveFree, this.lowQuality ? 4 : MAX_SHOCKWAVES, {
      mesh: ringMesh,
      mat: ringMat,
      age: 0,
      dur: isSmash ? 0.26 : 0.22,
      startScale: startSw,
      endScale: (isSmash ? 2.85 : 2.15) * swScale,
      spinSpeed: (Math.random() < 0.5 ? -1 : 1) * 2.4,
    });

    // 5. Rising Luminescent Hit Motes
    const moteTex = getHitSparkStarTexture();
    const moteCount = this.lowQuality ? 0 : isSmash ? 2 : 1;
    for (let i = 0; i < moteCount; i++) {
      const mColor = i % 2 === 0 ? opts.accentColor : '#ffffff';
      const { mesh: mMesh, mat: mMat } = this.acquireMesh(this.moteFree, this.sharedMoteGeo, moteTex, mColor, 0.9);
      mMesh.position.set(
        contactX + (Math.random() - 0.5) * 0.45,
        contactY + (Math.random() - 0.3) * 0.35,
        contactZ + (Math.random() - 0.5) * 0.35
      );
      const baseScale = (isSmash ? 1.05 : 0.8) * (0.65 + Math.random() * 0.55);
      const roll = Math.random() * Math.PI * 2;
      mMesh.scale.setScalar(baseScale);
      this.orientBillboard(mMesh, roll, 0, activeCam);
      this.pushPooled(this.motes, this.moteFree, MAX_MOTES, {
        mesh: mMesh,
        mat: mMat,
        age: 0,
        dur: 0.38 + Math.random() * 0.24,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.5 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 1.4,
        baseScale,
        phase: Math.random() * Math.PI * 2,
        roll,
        rollVel: (Math.random() - 0.5) * 5.0,
      });
    }
  }

  /**
   * Dedicated explosive ore-shatter burst: 8-point dual starburst nova, twin counter-spinning
   * shockwave rings, 360-degree radial spark spray, and rising luminescent crystal motes.
   */
  public spawnShatter(opts: OreShatterSpawnOptions): void {
    const isMeteor = Boolean(opts.isMeteor);
    const activeCam = opts.camera ?? this.lastCamera;
    this.prepareCameraAxes(activeCam);
    const secColor = opts.secondaryColor ?? '#fde047';

    // 1. Dual Counter-Rotated 8-Point Shatter Nova Flash
    const starTex = getHitSparkStarTexture();
    const spawnNova = (color: string, roll: number, peakScale: number, dur: number, zOff: number): void => {
      const { mesh, mat } = this.acquireMesh(this.hitsparkFree, this.sharedHitsparkGeo, starTex, color, 1.0);
      mesh.position.set(opts.targetX, opts.targetY, opts.targetZ + zOff);
      mesh.scale.setScalar(0.5);
      this.orientBillboard(mesh, roll, 0, activeCam);
      this.pushPooled(this.hitsparks, this.hitsparkFree, this.lowQuality ? 6 : MAX_HITSPARKS, {
        mesh,
        mat,
        age: 0,
        dur,
        roll,
        rollVel: roll >= 0 ? 3.2 : -3.2,
        peakScale,
      });
    };
    spawnNova('#ffffff', 0.08, isMeteor ? 2.65 : 1.9, isMeteor ? 0.26 : 0.2, 0.14);
    spawnNova(opts.oreColor, Math.PI / 4 + 0.08, isMeteor ? 2.35 : 1.65, isMeteor ? 0.3 : 0.23, 0.1);

    // 2. Twin Counter-Spinning Ground Shockwaves (inner hot flash + outer colored blast)
    const ringTex = getShockwaveRingTexture();
    const spawnWave = (color: string, startS: number, endS: number, dur: number, spin: number, yOff: number): void => {
      const { mesh, mat } = this.acquireMesh(this.shockwaveFree, this.sharedShockwaveGeo, ringTex, color, 0.94);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(opts.targetX, this.floorY + yOff, opts.targetZ);
      mesh.scale.setScalar(startS);
      this.pushPooled(this.shockwaves, this.shockwaveFree, this.lowQuality ? 4 : MAX_SHOCKWAVES, {
        mesh,
        mat,
        age: 0,
        dur,
        startScale: startS,
        endScale: endS,
        spinSpeed: spin,
      });
    };
    const scaleBoost = isMeteor ? 1.55 : 1.0;
    spawnWave('#ffffff', 0.6 * scaleBoost, 2.6 * scaleBoost, 0.24, 3.6, 0.02);
    spawnWave(opts.oreColor, 0.8 * scaleBoost, 3.85 * scaleBoost, 0.34, -2.8, 0.01);

    // 3. 360-Degree Explosive Radial Spark Spray
    const streakTex = getSparkStreakTexture();
    const streakCount = this.lowQuality ? (isMeteor ? 8 : 5) : isMeteor ? 22 : 14;
    for (let i = 0; i < streakCount; i++) {
      const ang = (i / streakCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.28;
      const speed = (isMeteor ? 5.8 : 4.2) + Math.random() * 3.6;
      const sColor = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? opts.oreColor : secColor;
      const { mesh: sMesh, mat: sMat } = this.acquireMesh(
        this.streakFree,
        this.sharedStreakGeo,
        streakTex,
        sColor,
        0.98
      );
      sMesh.position.set(
        opts.targetX + Math.cos(ang) * 0.22,
        opts.targetY + (Math.random() - 0.3) * 0.35,
        opts.targetZ + Math.sin(ang) * 0.22
      );
      const baseScale = (isMeteor ? 1.45 : 1.15) * (0.75 + Math.random() * 0.5);
      sMesh.scale.setScalar(baseScale);
      const item: StreakItem = {
        mesh: sMesh,
        mat: sMat,
        age: 0,
        dur: (isMeteor ? 0.34 : 0.27) + Math.random() * 0.08,
        vx: Math.cos(ang) * speed,
        vy: 2.2 + Math.random() * 4.2,
        vz: Math.sin(ang) * speed,
        baseScale,
      };
      this.orientStreak(item, activeCam);
      this.pushPooled(this.streaks, this.streakFree, this.lowQuality ? 12 : MAX_STREAKS, item);
    }

    // 4. Rising Luminescent Crystal Loot Motes
    const moteCount = this.lowQuality ? 0 : isMeteor ? 10 : 6;
    for (let i = 0; i < moteCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.15 + Math.random() * (isMeteor ? 0.9 : 0.55);
      const mColor = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? opts.oreColor : secColor;
      const { mesh: mMesh, mat: mMat } = this.acquireMesh(this.moteFree, this.sharedMoteGeo, starTex, mColor, 0.96);
      mMesh.position.set(
        opts.targetX + Math.cos(ang) * rad,
        opts.targetY * 0.65 + Math.random() * 0.55,
        opts.targetZ + Math.sin(ang) * rad
      );
      const baseScale = (isMeteor ? 1.45 : 1.15) * (0.65 + Math.random() * 0.65);
      const roll = Math.random() * Math.PI * 2;
      mMesh.scale.setScalar(baseScale);
      this.orientBillboard(mMesh, roll, 0, activeCam);
      this.pushPooled(this.motes, this.moteFree, MAX_MOTES, {
        mesh: mMesh,
        mat: mMat,
        age: 0,
        dur: (isMeteor ? 0.72 : 0.56) + Math.random() * 0.28,
        vx: Math.cos(ang) * (0.9 + Math.random() * 1.4),
        vy: 1.9 + Math.random() * 2.4,
        vz: Math.sin(ang) * (0.9 + Math.random() * 1.4),
        baseScale,
        phase: Math.random() * Math.PI * 2,
        roll,
        rollVel: (Math.random() - 0.5) * 6.5,
      });
    }
  }

  public spawnMeteorTrail(opts: {
    x: number;
    y: number;
    z: number;
    accentColor: string;
    camera?: THREE.Camera;
  }): void {
    const activeCam = opts.camera ?? this.lastCamera;
    this.prepareCameraAxes(activeCam);
    const streakTex = getSparkStreakTexture();
    const starTex = getHitSparkStarTexture();

    for (let i = 0; i < 2; i++) {
      const sColor = i === 0 ? '#ffffff' : opts.accentColor;
      const { mesh: sMesh, mat: sMat } = this.acquireMesh(
        this.streakFree,
        this.sharedStreakGeo,
        streakTex,
        sColor,
        0.95
      );
      sMesh.position.set(
        opts.x + (Math.random() - 0.5) * 0.55,
        opts.y + (Math.random() - 0.3) * 0.45,
        opts.z + (Math.random() - 0.5) * 0.55
      );
      const baseScale = 1.05 + Math.random() * 0.55;
      sMesh.scale.setScalar(baseScale);
      // Shoot upward-back along atmospheric entry wake
      const item: StreakItem = {
        mesh: sMesh,
        mat: sMat,
        age: 0,
        dur: 0.24 + Math.random() * 0.08,
        vx: -1.8 + (Math.random() - 0.5) * 1.4,
        vy: 3.4 + Math.random() * 2.4,
        vz: -1.2 + (Math.random() - 0.5) * 1.4,
        baseScale,
      };
      this.orientStreak(item, activeCam);
      this.pushPooled(this.streaks, this.streakFree, MAX_STREAKS, item);
    }

    const { mesh: mMesh, mat: mMat } = this.acquireMesh(
      this.moteFree,
      this.sharedMoteGeo,
      starTex,
      opts.accentColor,
      0.92
    );
    mMesh.position.set(
      opts.x + (Math.random() - 0.5) * 0.6,
      opts.y + Math.random() * 0.4,
      opts.z + (Math.random() - 0.5) * 0.6
    );
    const baseScale = 1.15 + Math.random() * 0.5;
    const roll = Math.random() * Math.PI * 2;
    mMesh.scale.setScalar(baseScale);
    this.orientBillboard(mMesh, roll, 0, activeCam);
    this.pushPooled(this.motes, this.moteFree, MAX_MOTES, {
      mesh: mMesh,
      mat: mMat,
      age: 0,
      dur: 0.36 + Math.random() * 0.14,
      vx: -0.9 + (Math.random() - 0.5) * 1.2,
      vy: 1.6 + Math.random() * 1.4,
      vz: -0.7 + (Math.random() - 0.5) * 1.2,
      baseScale,
      phase: Math.random() * Math.PI * 2,
      roll,
      rollVel: (Math.random() - 0.5) * 8,
    });
  }

  public spawnMeteorLanding(opts: {
    targetX: number;
    targetZ: number;
    accentColor: string;
    camera?: THREE.Camera;
  }): void {
    this.spawnShatter({
      targetX: opts.targetX,
      targetY: 0.65,
      targetZ: opts.targetZ,
      oreColor: opts.accentColor,
      secondaryColor: '#ffffff',
      isMeteor: true,
      camera: opts.camera,
    });

    const ringTex = getShockwaveRingTexture();
    const { mesh, mat } = this.acquireMesh(
      this.shockwaveFree,
      this.sharedShockwaveGeo,
      ringTex,
      opts.accentColor,
      0.92
    );
    mesh.position.set(opts.targetX, this.floorY + 0.03, opts.targetZ);
    mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    mesh.scale.setScalar(1.2);
    this.pushPooled(this.shockwaves, this.shockwaveFree, MAX_SHOCKWAVES, {
      mesh,
      mat,
      age: 0,
      dur: 0.46,
      startScale: 1.2,
      endScale: 6.4,
      spinSpeed: 2.2,
    });
  }

  public update(dtSec: number, camera?: THREE.Camera): void {
    if (camera) this.lastCamera = camera;
    const activeCam = camera ?? this.lastCamera;
    let rem = Math.max(0, dtSec);
    while (rem > 0) {
      const step = Math.min(0.1, rem);
      rem -= step;
      this.stepPools(step, activeCam);
    }
  }

  private stepPools(dtSec: number, camera?: THREE.Camera): void {
    this.prepareCameraAxes(camera);

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.age += dtSec;
      if (s.age >= s.dur) {
        this.group.remove(s.mesh);
        if (this.slashFree.length < MAX_SLASHES) this.slashFree.push({ mesh: s.mesh, mat: s.mat });
        else s.mat.dispose();
        this.slashes.splice(i, 1);
        continue;
      }
      const p = s.age / s.dur;
      const easeOut = 1 - Math.pow(1 - p, 2.5);
      const scale = s.startScale + (s.endScale - s.startScale) * easeOut;
      s.roll += s.rollVel * dtSec;
      s.mat.opacity = 0.96 * Math.pow(1 - p, 1.45);
      s.mesh.scale.set(scale * s.flipX, scale, scale);
      this.orientBillboard(s.mesh, s.roll, s.tiltX, camera);
    }

    for (let i = this.hitsparks.length - 1; i >= 0; i--) {
      const h = this.hitsparks[i];
      h.age += dtSec;
      if (h.age >= h.dur) {
        this.group.remove(h.mesh);
        if (this.hitsparkFree.length < MAX_HITSPARKS) this.hitsparkFree.push({ mesh: h.mesh, mat: h.mat });
        else h.mat.dispose();
        this.hitsparks.splice(i, 1);
        continue;
      }
      const p = h.age / h.dur;
      const pop = p < 0.28 ? 0.45 + (p / 0.28) * (h.peakScale - 0.45) : h.peakScale * (1 - ((p - 0.28) / 0.72) * 0.82);
      h.roll += h.rollVel * dtSec;
      h.mat.opacity = p < 0.2 ? 0.98 : 0.98 * Math.pow(1 - (p - 0.2) / 0.8, 1.3);
      h.mesh.scale.setScalar(Math.max(0.05, pop));
      this.orientBillboard(h.mesh, h.roll, 0, camera);
    }

    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const st = this.streaks[i];
      st.age += dtSec;
      if (st.age >= st.dur) {
        this.group.remove(st.mesh);
        if (this.streakFree.length < MAX_STREAKS) this.streakFree.push({ mesh: st.mesh, mat: st.mat });
        else st.mat.dispose();
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

      this.orientStreak(st, camera);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dtSec;
      if (sw.age >= sw.dur) {
        this.group.remove(sw.mesh);
        if (this.shockwaveFree.length < MAX_SHOCKWAVES) this.shockwaveFree.push({ mesh: sw.mesh, mat: sw.mat });
        else sw.mat.dispose();
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

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dtSec;
      if (m.age >= m.dur) {
        this.group.remove(m.mesh);
        if (this.moteFree.length < MAX_MOTES) this.moteFree.push({ mesh: m.mesh, mat: m.mat });
        else m.mat.dispose();
        this.motes.splice(i, 1);
        continue;
      }
      const p = m.age / m.dur;
      const drag = Math.max(0.2, 1 - dtSec * 3.2);
      m.vx *= drag;
      m.vz *= drag;
      m.vy = Math.max(0.55, m.vy - 1.8 * dtSec);
      const sway = Math.sin(m.age * 11 + m.phase) * 0.45 * dtSec;
      m.mesh.position.x += m.vx * dtSec + sway;
      m.mesh.position.y += m.vy * dtSec;
      m.mesh.position.z += m.vz * dtSec;
      m.roll += m.rollVel * dtSec;
      const twinkle = 0.72 + 0.28 * Math.sin(m.age * 24 + m.phase);
      const scaleFade = p < 0.2 ? 0.4 + (p / 0.2) * 0.6 : 1 - (p - 0.2) / 0.8;
      m.mesh.scale.setScalar(Math.max(0.05, m.baseScale * scaleFade * twinkle));
      m.mat.opacity = 0.94 * Math.pow(1 - p, 1.25) * twinkle;
      this.orientBillboard(m.mesh, m.roll, 0, camera);
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

  private clearFreeList(freeList: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>): void {
    for (const item of freeList) {
      item.mat.dispose();
    }
    freeList.length = 0;
  }

  public dispose(): void {
    this.lastCamera = undefined;
    this.clearPool(this.slashes);
    this.clearPool(this.hitsparks);
    this.clearPool(this.streaks);
    this.clearPool(this.shockwaves);
    this.clearPool(this.motes);
    this.clearFreeList(this.slashFree);
    this.clearFreeList(this.hitsparkFree);
    this.clearFreeList(this.streakFree);
    this.clearFreeList(this.shockwaveFree);
    this.clearFreeList(this.moteFree);
    this.sharedSlashGeo.dispose();
    this.sharedHitsparkGeo.dispose();
    this.sharedStreakGeo.dispose();
    this.sharedShockwaveGeo.dispose();
    this.sharedMoteGeo.dispose();
  }
}
