import * as THREE from 'three';

function createAccretionDiskTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  // Base radial accretion plasma glow (pitch-black center -> blinding photon edge -> fiery violet/cyan/gold -> 0 alpha)
  const rad = ctx.createRadialGradient(cx, cy, 118, cx, cy, 490);
  rad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  rad.addColorStop(0.06, 'rgba(0, 0, 0, 1)');
  rad.addColorStop(0.11, 'rgba(255, 250, 235, 0.98)');
  rad.addColorStop(0.19, 'rgba(251, 191, 36, 0.92)');
  rad.addColorStop(0.34, 'rgba(192, 132, 252, 0.78)');
  rad.addColorStop(0.55, 'rgba(56, 189, 248, 0.45)');
  rad.addColorStop(0.78, 'rgba(88, 28, 135, 0.18)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Swirling relativistic spiral arms inside the accretion disk
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 140; i++) {
    const startA = (i / 140) * Math.PI * 2;
    const r0 = 135 + (i % 7) * 14;
    const r1 = 360 + (i % 9) * 14;
    ctx.beginPath();
    for (let s = 0; s <= 18; s++) {
      const t = s / 18;
      const r = r0 + (r1 - r0) * t;
      const a = startA + t * 2.1;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (i % 3 === 0) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.34)';
      ctx.lineWidth = 3.2;
    } else if (i % 3 === 1) {
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.28)';
      ctx.lineWidth = 2.6;
    } else {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
      ctx.lineWidth = 2.2;
    }
    ctx.stroke();
  }
  ctx.restore();

  // Keep the inner event horizon core 100% pitch-black
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, 124, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLensingHaloTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  // Gravitational lensing corona around the pitch-black singularity
  const grad = ctx.createRadialGradient(cx, cy, 88, cx, cy, 250);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.14, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.96)');
  grad.addColorStop(0.28, 'rgba(253, 224, 71, 0.78)');
  grad.addColorStop(0.45, 'rgba(168, 85, 247, 0.44)');
  grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.16)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, 102, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCosmicFloorGridTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 256);
  bg.addColorStop(0, 'rgba(30, 27, 75, 0.65)');
  bg.addColorStop(0.55, 'rgba(15, 23, 42, 0.45)');
  bg.addColorStop(1, 'rgba(2, 2, 8, 0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);
  for (const r of [88, 152, 212, 244]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = r === 152 ? 'rgba(56, 189, 248, 0.48)' : 'rgba(168, 85, 247, 0.42)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 55, Math.sin(a) * 55);
    ctx.lineTo(Math.cos(a) * 244, Math.sin(a) * 244);
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class HellAltarEyeController {
  public readonly root = new THREE.Group();
  private readonly blackHoleGroup = new THREE.Group();
  private readonly accretionDiskMesh: THREE.Mesh;
  private readonly innerPhotonRing: THREE.Mesh;
  private readonly warpedUpperArc: THREE.Mesh;
  private readonly warpedLowerArc: THREE.Mesh;
  private readonly cosmicFloorMesh: THREE.Mesh;
  private readonly orbitParticles: THREE.Points;
  private readonly orbitAngles: Float32Array;
  private readonly orbitRadii: Float32Array;
  private readonly orbitPos: Float32Array;
  private readonly orbitCount = 280;

  constructor() {
    let dotTex: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.8)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
        dotTex = new THREE.CanvasTexture(c);
      }
    }

    // 1. Deep Outer Space Multi-Color Starfield (720 stars behind the Black Hole)
    const starCount = 720;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starColors = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbae6fd),
      new THREE.Color(0xe9d5ff),
      new THREE.Color(0xfef08a),
      new THREE.Color(0x7dd3fc),
    ];
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 160;
      starPos[i * 3 + 1] = -14 + (Math.random() - 0.35) * 84;
      starPos[i * 3 + 2] = -62 - Math.random() * 40;
      const c = starColors[i % starColors.length];
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.48,
        map: dotTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        fog: false,
      })
    );
    this.root.add(stars);

    // 2. Subtle Cosmic Astrolabe Floor Ring beneath the floating space pedestals
    const floorTex = createCosmicFloorGridTexture();
    const floorMat = new THREE.MeshBasicMaterial({
      color: floorTex ? 0xffffff : 0x312e81,
      map: floorTex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.cosmicFloorMesh = new THREE.Mesh(new THREE.CircleGeometry(13.5, 48), floorMat);
    this.cosmicFloorMesh.rotation.x = -Math.PI / 2;
    this.cosmicFloorMesh.position.set(0, -1.15, -2.4);
    this.root.add(this.cosmicFloorMesh);

    // 3. COLOSSAL PITCH-BLACK BLACK HOLE IN THE SKY (3x farther in deep space at z = -54)
    this.blackHoleGroup.position.set(0, -8.2, -54.0);
    this.blackHoleGroup.scale.setScalar(2.55);
    this.blackHoleGroup.rotation.x = 0.22;
    this.root.add(this.blackHoleGroup);

    // 3a. Gravitational Lensing Halo Backdrop (warped light around the black hole)
    const lensingTex = createLensingHaloTexture();
    const lensingMat = new THREE.MeshBasicMaterial({
      color: lensingTex ? 0xffffff : 0xa855f7,
      map: lensingTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const lensingPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 5.2), lensingMat);
    lensingPlane.position.z = -0.5;
    this.blackHoleGroup.add(lensingPlane);

    // 3b. Warped Gravitational Lensing Light Arches (curving over & under the pitch-black sphere)
    const archMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
      fog: false,
    });
    this.warpedUpperArc = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.09, 12, 48, Math.PI), archMat);
    this.warpedUpperArc.scale.set(1.18, 0.78, 1);
    this.warpedUpperArc.position.set(0, 0.06, -0.2);

    this.warpedLowerArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.76, 0.065, 12, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.72, fog: false })
    );
    this.warpedLowerArc.rotation.z = Math.PI;
    this.warpedLowerArc.scale.set(1.18, 0.68, 1);
    this.warpedLowerArc.position.set(0, -0.06, -0.2);
    this.blackHoleGroup.add(this.warpedUpperArc, this.warpedLowerArc);

    // 3c. PITCH-BLACK EVENT HORIZON SINGULARITY SPHERE (100% #000000 "hitam pekat")
    const eventHorizonSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.48, 40, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })
    );
    this.blackHoleGroup.add(eventHorizonSphere);

    // Razor-sharp glowing photon ring hugging the pitch-black event horizon
    this.innerPhotonRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.045, 12, 56),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
    );
    this.innerPhotonRing.position.z = 0.06;
    this.blackHoleGroup.add(this.innerPhotonRing);

    // 3d. Tilted Relativistic Swirling Accretion Disk wrapping around the black hole
    const diskTex = createAccretionDiskTexture();
    const diskMat = new THREE.MeshBasicMaterial({
      color: diskTex ? 0xffffff : 0xfacc15,
      map: diskTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.accretionDiskMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.8, 11.8), diskMat);
    this.accretionDiskMesh.rotation.x = 1.24;
    this.accretionDiskMesh.rotation.y = -0.12;
    this.blackHoleGroup.add(this.accretionDiskMesh);

    // 3e. Spiraling Matter Particles being sucked into the Black Hole
    this.orbitAngles = new Float32Array(this.orbitCount);
    this.orbitRadii = new Float32Array(this.orbitCount);
    this.orbitPos = new Float32Array(this.orbitCount * 3);
    const orbitCol = new Float32Array(this.orbitCount * 3);
    for (let i = 0; i < this.orbitCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.65 + Math.random() * 4.2;
      this.orbitAngles[i] = a;
      this.orbitRadii[i] = r;
      this.orbitPos[i * 3] = Math.cos(a) * r;
      this.orbitPos[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
      this.orbitPos[i * 3 + 2] = Math.sin(a) * r * 0.28;
      const col = starColors[i % starColors.length];
      orbitCol[i * 3] = col.r;
      orbitCol[i * 3 + 1] = col.g;
      orbitCol[i * 3 + 2] = col.b;
    }
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(this.orbitPos, 3));
    orbitGeo.setAttribute('color', new THREE.BufferAttribute(orbitCol, 3));
    this.orbitParticles = new THREE.Points(
      orbitGeo,
      new THREE.PointsMaterial({
        size: 0.18,
        map: dotTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    this.orbitParticles.rotation.z = -0.1;
    this.blackHoleGroup.add(this.orbitParticles);
  }

  public glanceAtWorldX(_worldX: number): void {
    // No-op kept for ShopWorld3D interface compatibility
  }

  public update(dt: number, elapsed: number, isSpinning: boolean, _needleAngle: number): void {
    const safeDt = Math.min(Math.max(0, dt), 0.1);
    const speedMult = isSpinning ? 2.8 : 1.0;

    // Spin the relativistic accretion disk & cosmic floor ring (no pulsing/throbbing)
    this.accretionDiskMesh.rotation.z -= safeDt * 0.95 * speedMult;
    this.cosmicFloorMesh.rotation.z = elapsed * 0.06;

    // Spiral matter particles inward toward the pitch-black event horizon
    for (let i = 0; i < this.orbitCount; i++) {
      let r = this.orbitRadii[i] - safeDt * (0.45 + (6.0 - this.orbitRadii[i]) * 0.22) * speedMult;
      if (r < 1.58) {
        r = 5.4 + Math.random() * 0.5;
      }
      this.orbitRadii[i] = r;
      const angSpeed = (2.6 / Math.max(1.2, r)) * speedMult;
      const a = this.orbitAngles[i] + safeDt * angSpeed;
      this.orbitAngles[i] = a;

      this.orbitPos[i * 3] = Math.cos(a) * r;
      this.orbitPos[i * 3 + 1] = Math.sin(a * 2 + i) * 0.14;
      this.orbitPos[i * 3 + 2] = Math.sin(a) * r * 0.26;
    }
    const posAttr = this.orbitParticles.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (posAttr) posAttr.needsUpdate = true;
  }
}
