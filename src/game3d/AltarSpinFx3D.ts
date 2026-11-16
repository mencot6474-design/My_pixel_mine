import * as THREE from 'three';

const ALTAR_CENTER_X = 0;
const ALTAR_CENTER_Z = -2.4;

function createGlowParticleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.82)');
  grad.addColorStop(0.62, 'rgba(255, 255, 255, 0.28)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface AltarClockDialParts {
  group: THREE.Group;
  gearRing: THREE.Group;
  centerOrb: THREE.Mesh;
}

export function createAltarClockDial(
  pedestalTargets: ReadonlyArray<{ x: number; z: number; color: string }>
): AltarClockDialParts {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.28, ALTAR_CENTER_Z);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x92400e,
    emissiveIntensity: 0.45,
    roughness: 0.24,
    metalness: 0.82,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x090b1a,
    roughness: 0.35,
    metalness: 0.28,
  });

  // Obsidian dial plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.5, 0.14, 36), faceMat);
  plate.position.y = 0.02;
  group.add(plate);

  // Outer gold bezel torus
  const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.075, 10, 48), goldMat);
  outerBezel.rotation.x = Math.PI / 2;
  outerBezel.position.y = 0.09;
  group.add(outerBezel);

  // Concentric arcane rune rings
  const violetRing = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.11, 36),
    new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide })
  );
  violetRing.rotation.x = -Math.PI / 2;
  violetRing.position.y = 0.1;
  group.add(violetRing);

  const cyanRing = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.54, 28),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
  );
  cyanRing.rotation.x = -Math.PI / 2;
  cyanRing.position.y = 0.102;
  group.add(cyanRing);

  // 10 color-matched hour / pedestal ticks around perimeter
  for (const target of pedestalTargets) {
    const dx = target.x - ALTAR_CENTER_X;
    const dz = target.z - ALTAR_CENTER_Z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    const tickAng = Math.atan2(-dz, dx);

    const tickGroup = new THREE.Group();
    tickGroup.position.set(nx * 1.24, 0.11, nz * 1.24);
    tickGroup.rotation.y = tickAng;

    const stud = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.08), goldMat);
    tickGroup.add(stud);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.065, 0),
      new THREE.MeshBasicMaterial({ color: target.color })
    );
    gem.position.set(0.11, 0.03, 0);
    tickGroup.add(gem);

    group.add(tickGroup);
  }

  // Rotating astrolabe clockwork gear ring
  const gearRing = new THREE.Group();
  gearRing.position.y = 0.12;
  const gearTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.036, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.6,
    })
  );
  gearTorus.rotation.x = Math.PI / 2;
  gearRing.add(gearTorus);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.07), goldMat);
    tooth.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75);
    tooth.rotation.y = -a;
    gearRing.add(tooth);
  }
  group.add(gearRing);

  // Center pivot spire
  const pivotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.38, 12), goldMat);
  pivotBase.position.y = 0.2;
  group.add(pivotBase);

  // Center pivot cap (hidden finial orb kept for interface compatibility)
  const centerOrb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.05, 16),
    goldMat
  );
  centerOrb.position.y = 0.4;
  centerOrb.visible = false;
  group.add(centerOrb);

  return { group, gearRing, centerOrb };
}

export interface AltarClockHandParts {
  group: THREE.Group;
  tipGlowMat: THREE.MeshBasicMaterial;
  beamMesh: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
}

export function createAltarClockHand(): AltarClockHandParts {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.56, ALTAR_CENTER_Z);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xb45309,
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.85,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.35,
    metalness: 0.65,
  });
  const tipGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // Center octagonal collar boss
  const hubBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.14, 8), goldMat);
  group.add(hubBoss);

  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.05, 16), goldMat);
  hubCap.position.y = 0.08;
  group.add(hubCap);

  // Counterweight tail (-X side)
  const tailShaft = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.14), darkMetalMat);
  tailShaft.position.set(-0.42, 0, 0);
  group.add(tailShaft);

  const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.044, 8, 24), goldMat);
  tailRing.rotation.x = Math.PI / 2;
  tailRing.position.set(-0.92, 0, 0);
  group.add(tailRing);

  const tailJewel = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e })
  );
  tailJewel.position.set(-0.92, 0.03, 0);
  group.add(tailJewel);

  // Sleek crossguard wings near hub (+X = 0.52)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.13), goldMat);
    wing.position.set(0.46, 0.01, side * 0.28);
    wing.rotation.y = side * 0.48;
    group.add(wing);
  }

  // Main tapered clock blade along +X (0.2 -> 2.75)
  const bladeFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.24, 2.55, 4), darkMetalMat);
  bladeFrame.rotation.z = -Math.PI / 2;
  bladeFrame.scale.set(0.4, 1, 1.15);
  bladeFrame.position.set(1.48, 0, 0);
  group.add(bladeFrame);

  const bladeGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.27, 2.48, 4), goldMat);
  bladeGoldRim.rotation.z = -Math.PI / 2;
  bladeGoldRim.scale.set(0.24, 1, 1.28);
  bladeGoldRim.position.set(1.44, -0.015, 0);
  group.add(bladeGoldRim);

  // Glowing plasma energy spine along top of hand
  const plasmaVein = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.075, 2.55, 6), tipGlowMat);
  plasmaVein.rotation.z = -Math.PI / 2;
  plasmaVein.position.set(1.48, 0.055, 0);
  group.add(plasmaVein);

  // Sharp glowing arrowhead crystal tip (+X = 2.7 -> 3.45)
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.78, 4), tipGlowMat);
  arrowHead.rotation.z = -Math.PI / 2;
  arrowHead.scale.set(0.48, 1, 1.15);
  arrowHead.position.set(3.04, 0.01, 0);
  group.add(arrowHead);

  const tipHalo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), goldMat);
  tipHalo.rotation.y = Math.PI / 2;
  tipHalo.position.set(2.74, 0.01, 0);
  group.add(tipHalo);

  // Translucent targeting beam extending ahead of tip
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.16, 1.45, 8, 1, true), beamMat);
  beamMesh.rotation.z = -Math.PI / 2;
  beamMesh.position.set(4.12, 0.01, 0);
  group.add(beamMesh);

  return { group, tipGlowMat, beamMesh, beamMat };
}

export function createAltarSubHand(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(ALTAR_CENTER_X, 0.44, ALTAR_CENTER_Z);

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.8,
  });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.09), silverMat);
  tail.position.set(-0.26, 0, 0);
  group.add(tail);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.11, 2.05, 4), silverMat);
  shaft.rotation.z = -Math.PI / 2;
  shaft.scale.set(0.35, 1, 1);
  shaft.position.set(1.02, 0, 0);
  group.add(shaft);

  const tipRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), cyanMat);
  tipRing.rotation.x = Math.PI / 2;
  tipRing.position.set(2.12, 0, 0);
  group.add(tipRing);

  return group;
}

interface VortexParticle {
  angle: number;
  radius: number;
  baseY: number;
  speed: number;
  yAmp: number;
  phase: number;
  tint: THREE.Color;
}

interface SparkParticle {
  alive: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: THREE.Color;
}

export class AltarParticleSystem {
  public readonly group = new THREE.Group();

  private readonly vortexCount = 150;
  private readonly vortexPos = new Float32Array(this.vortexCount * 3);
  private readonly vortexCol = new Float32Array(this.vortexCount * 3);
  private readonly vortexGeo = new THREE.BufferGeometry();
  private readonly vortexData: VortexParticle[] = [];

  private readonly sparkCount = 200;
  private readonly sparkPos = new Float32Array(this.sparkCount * 3);
  private readonly sparkCol = new Float32Array(this.sparkCount * 3);
  private readonly sparkGeo = new THREE.BufferGeometry();
  private readonly sparks: SparkParticle[] = [];
  private sparkCursor = 0;

  private readonly shockwaveRing: THREE.Mesh;
  private readonly shockwaveMat: THREE.MeshBasicMaterial;
  private shockwaveTimer = 0;
  private readonly shockwaveDuration = 0.85;

  private readonly tmpColor = new THREE.Color();

  constructor() {
    const tex = createGlowParticleTexture();

    const palette = [0xc084fc, 0x38bdf8, 0xfacc15, 0xf472b6];
    for (let i = 0; i < this.vortexCount; i++) {
      const p: VortexParticle = {
        angle: Math.random() * Math.PI * 2,
        radius: 1.05 + Math.random() * 5.3,
        baseY: -0.25 + Math.random() * 2.4,
        speed: 0.45 + Math.random() * 0.75,
        yAmp: 0.12 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        tint: new THREE.Color(palette[i % palette.length]),
      };
      this.vortexData.push(p);
      this.vortexPos[i * 3] = ALTAR_CENTER_X + Math.cos(p.angle) * p.radius;
      this.vortexPos[i * 3 + 1] = p.baseY;
      this.vortexPos[i * 3 + 2] = ALTAR_CENTER_Z + Math.sin(p.angle) * p.radius * 0.76;
      this.vortexCol[i * 3] = p.tint.r;
      this.vortexCol[i * 3 + 1] = p.tint.g;
      this.vortexCol[i * 3 + 2] = p.tint.b;
    }

    this.vortexGeo.setAttribute('position', new THREE.BufferAttribute(this.vortexPos, 3));
    this.vortexGeo.setAttribute('color', new THREE.BufferAttribute(this.vortexCol, 3));
    const vortexPoints = new THREE.Points(
      this.vortexGeo,
      new THREE.PointsMaterial({
        size: 0.34,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: tex ?? undefined,
      })
    );
    this.group.add(vortexPoints);

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparks.push({
        alive: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        color: new THREE.Color(0xffffff),
      });
      this.sparkPos[i * 3 + 1] = -999;
    }
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3));
    const sparkPoints = new THREE.Points(
      this.sparkGeo,
      new THREE.PointsMaterial({
        size: 0.42,
        vertexColors: true,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: tex ?? undefined,
      })
    );
    this.group.add(sparkPoints);

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.18, 36), this.shockwaveMat);
    this.shockwaveRing.rotation.x = -Math.PI / 2;
    this.shockwaveRing.visible = false;
    this.group.add(this.shockwaveRing);
  }

  public spawnNeedleTrail(tipX: number, tipY: number, tipZ: number, hexColor: string, count = 4): void {
    this.tmpColor.set(hexColor);
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount;
      s.alive = true;
      s.life = 0;
      s.maxLife = 0.42 + Math.random() * 0.35;
      s.x = tipX + (Math.random() - 0.5) * 0.28;
      s.y = tipY + (Math.random() - 0.5) * 0.22;
      s.z = tipZ + (Math.random() - 0.5) * 0.28;
      s.vx = (Math.random() - 0.5) * 1.4;
      s.vy = 0.8 + Math.random() * 1.8;
      s.vz = (Math.random() - 0.5) * 1.4;
      s.color.copy(this.tmpColor).lerp(new THREE.Color(0xffffff), Math.random() * 0.4);
    }
  }

  public spawnBurst(x: number, y: number, z: number, hexColor: string, count = 24, speedScale = 1): void {
    this.tmpColor.set(hexColor);
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCount;
      const ang = Math.random() * Math.PI * 2;
      const spd = (1.4 + Math.random() * 3.2) * speedScale;
      s.alive = true;
      s.life = 0;
      s.maxLife = 0.55 + Math.random() * 0.55;
      s.x = x + (Math.random() - 0.5) * 0.3;
      s.y = y + Math.random() * 0.25;
      s.z = z + (Math.random() - 0.5) * 0.3;
      s.vx = Math.cos(ang) * spd;
      s.vy = (1.8 + Math.random() * 3.4) * speedScale;
      s.vz = Math.sin(ang) * spd;
      s.color.copy(this.tmpColor).lerp(new THREE.Color(0xfef08a), Math.random() * 0.45);
    }
  }

  public triggerWinShockwave(x: number, y: number, z: number, hexColor: string): void {
    this.shockwaveRing.position.set(x, y + 0.14, z);
    this.shockwaveRing.scale.setScalar(1);
    this.shockwaveMat.color.set(hexColor);
    this.shockwaveMat.opacity = 0.95;
    this.shockwaveRing.visible = true;
    this.shockwaveTimer = this.shockwaveDuration;
  }

  public update(dt: number, elapsed: number, spinRatio: number, activeHex?: string): void {
    const safeDt = Math.min(dt, 0.05);
    const swirlBoost = 1 + spinRatio * 5.8;
    const accent = activeHex ? this.tmpColor.set(activeHex) : null;

    for (let i = 0; i < this.vortexCount; i++) {
      const p = this.vortexData[i];
      p.angle += p.speed * swirlBoost * safeDt;
      const radialPull = spinRatio > 0 ? 1 - spinRatio * 0.14 * Math.sin(elapsed * 5 + p.phase) : 1;
      const r = p.radius * radialPull;
      const x = ALTAR_CENTER_X + Math.cos(p.angle) * r;
      const z = ALTAR_CENTER_Z + Math.sin(p.angle) * r * 0.76;
      const y = p.baseY + Math.sin(elapsed * 2.1 + p.phase) * p.yAmp + spinRatio * 0.55;

      this.vortexPos[i * 3] = x;
      this.vortexPos[i * 3 + 1] = y;
      this.vortexPos[i * 3 + 2] = z;

      if (accent && i % 3 === 0) {
        const mix = 0.35 + spinRatio * 0.55;
        this.vortexCol[i * 3] = THREE.MathUtils.lerp(p.tint.r, accent.r, mix);
        this.vortexCol[i * 3 + 1] = THREE.MathUtils.lerp(p.tint.g, accent.g, mix);
        this.vortexCol[i * 3 + 2] = THREE.MathUtils.lerp(p.tint.b, accent.b, mix);
      } else {
        this.vortexCol[i * 3] = p.tint.r;
        this.vortexCol[i * 3 + 1] = p.tint.g;
        this.vortexCol[i * 3 + 2] = p.tint.b;
      }
    }
    (this.vortexGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.vortexGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    for (let i = 0; i < this.sparkCount; i++) {
      const s = this.sparks[i];
      if (!s.alive) continue;
      s.life += safeDt;
      if (s.life >= s.maxLife) {
        s.alive = false;
        this.sparkPos[i * 3 + 1] = -999;
        continue;
      }
      const fade = 1 - s.life / s.maxLife;
      s.vy -= 2.6 * safeDt;
      s.x += s.vx * safeDt;
      s.y += s.vy * safeDt;
      s.z += s.vz * safeDt;

      this.sparkPos[i * 3] = s.x;
      this.sparkPos[i * 3 + 1] = s.y;
      this.sparkPos[i * 3 + 2] = s.z;
      this.sparkCol[i * 3] = s.color.r * fade;
      this.sparkCol[i * 3 + 1] = s.color.g * fade;
      this.sparkCol[i * 3 + 2] = s.color.b * fade;
    }
    (this.sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer = Math.max(0, this.shockwaveTimer - safeDt);
      const t = 1 - this.shockwaveTimer / this.shockwaveDuration;
      this.shockwaveRing.scale.setScalar(1 + t * 2.1);
      this.shockwaveMat.opacity = (1 - t) * 0.92;
      if (this.shockwaveTimer === 0) {
        this.shockwaveRing.visible = false;
      }
    }
  }
}
