import * as THREE from 'three';

export function toonMat(
  color: THREE.ColorRepresentation,
  roughness = 0.32,
  metalness = 0.15,
  emissive: THREE.ColorRepresentation = 0x000000,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
  });
}


export function buildCrystalCavesOreModel(oreId: string, color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const darkRock = toonMat(secondary, 0.72, 0.14);

  if (oreId === 'glowquartz') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), darkRock);
    base.scale.set(1.28, 0.56, 1.05);
    base.position.y = -0.38;
    g.add(base);
    const iceMat = toonMat(color, 0.14, 0.25, color, 0.45);
    const tipMat = toonMat(0xf8fafc, 0.1, 0.35, 0xbae6fd, 0.72);
    for (const [x, z, h, r, rz, rx, useTip] of [
      [-0.36, 0.06, 0.76, 0.17, 0.28, 0.08, false],
      [0.34, 0.08, 0.7, 0.16, -0.32, 0.06, false],
      [-0.14, -0.18, 0.9, 0.19, 0.12, -0.14, false],
      [0.06, 0.08, 1.18, 0.23, -0.05, 0.08, true],
      [0.2, -0.22, 0.62, 0.14, -0.22, -0.18, false],
    ] as Array<[number, number, number, number, number, number, boolean]>) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), useTip ? tipMat : iceMat);
      spire.position.set(x, -0.04 + h * 0.28, z);
      spire.rotation.set(rx, 0, rz);
      g.add(spire);
    }
    const glowOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), tipMat);
    glowOrb.position.set(0.06, 0.72, 0.1);
    g.add(glowOrb);
    g.rotation.set(0.22, -0.38, 0);
    return g;
  }

  if (oreId === 'frostquartz') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.66, 0), darkRock);
    base.scale.set(1.25, 0.58, 1.05);
    base.position.y = -0.36;
    g.add(base);
    const frostMat = toonMat(0x22d3ee, 0.12, 0.25, 0x67e8f9, 0.6);
    const branchSpecs: Array<[number, number, number, number, number, number]> = [
      [0, -0.02, 0.02, 1.15, 0.13, 0],
      [-0.24, 0.24, 0.06, 0.74, 0.1, 0.62],
      [0.24, 0.26, 0.06, 0.74, 0.1, -0.62],
      [-0.36, 0.44, 0.08, 0.48, 0.08, 0.98],
      [0.36, 0.46, 0.08, 0.48, 0.08, -0.98],
      [0, 0.36, -0.12, 0.58, 0.09, 0.22],
    ];
    for (const [x, y, z, h, r, rz] of branchSpecs) {
      const shard = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r, h, 6), frostMat);
      shard.position.set(x, y, z);
      shard.rotation.z = rz;
      g.add(shard);
    }
    g.rotation.set(0.2, -0.35, 0);
    return g;
  }

  if (oreId === 'prismite') {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), darkRock);
    slab.scale.set(1.42, 0.46, 0.92);
    slab.position.y = -0.4;
    g.add(slab);
    const rainbow = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < rainbow.length; i++) {
      const t = i / (rainbow.length - 1) - 0.5;
      const h = 0.78 + (1 - Math.abs(t) * 1.6) * 0.42;
      const mat = toonMat(rainbow[i], 0.14, 0.25, rainbow[i], 0.48);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, h, 5), mat);
      spike.position.set(t * 1.18, -0.02 + h * 0.28, (i % 2 === 0 ? 0.04 : -0.05));
      spike.rotation.z = -t * 0.46;
      g.add(spike);
    }
    g.rotation.set(0.24, -0.32, 0);
    return g;
  }

  if (oreId === 'hushstone') {
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), darkRock);
    body.scale.set(1.18, 0.94, 0.96);
    body.position.y = -0.08;
    g.add(body);
    const visorMat = toonMat(0x22d3ee, 0.1, 0.2, 0x38bdf8, 0.92);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.26), visorMat);
    visor.position.set(0.06, 0.08, 0.64);
    visor.rotation.z = -0.06;
    g.add(visor);
    for (const [x, y, z, s] of [
      [-0.58, -0.24, 0.34, 0.14],
      [0.54, 0.34, 0.22, 0.12],
      [-0.22, 0.56, 0.18, 0.11],
    ] as Array<[number, number, number, number]>) {
      const fleck = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), visorMat);
      fleck.position.set(x, y, z);
      g.add(fleck);
    }
    g.rotation.set(0.2, -0.38, 0);
    return g;
  }

  if (oreId === 'azurine') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), darkRock);
    base.scale.set(1.3, 0.52, 1.05);
    base.position.y = -0.4;
    g.add(base);
    const deepAzure = toonMat(0x2563eb, 0.14, 0.3, 0x1d4ed8, 0.42);
    const brightAzure = toonMat(0x38bdf8, 0.12, 0.28, 0x60a5fa, 0.55);
    const prisms: Array<[number, number, number, number, number, boolean]> = [
      [-0.38, 0.8, 0.19, 0.42, 0.12, false],
      [-0.14, 1.18, 0.24, 0.14, -0.08, true],
      [0.16, 1.08, 0.22, -0.18, 0.1, false],
      [0.42, 0.72, 0.17, -0.45, -0.06, true],
      [0.02, 0.72, 0.16, 0.04, 0.28, true],
    ];
    for (const [x, h, r, rz, z, bright] of prisms) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), bright ? brightAzure : deepAzure);
      p.position.set(x, -0.06 + h * 0.32, z);
      p.rotation.z = rz;
      g.add(p);
    }
    g.rotation.set(0.22, -0.38, 0);
    return g;
  }

  if (oreId === 'glimmerite') {
    const quartzBase = toonMat(0xe2e8f0, 0.48, 0.15, 0xf8fafc, 0.08);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), quartzBase);
    base.scale.set(1.32, 0.56, 1.08);
    base.position.y = -0.36;
    g.add(base);
    const goldMat = toonMat(0xfacc15, 0.14, 0.55, 0xf59e0b, 0.52);
    const center = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), goldMat);
    center.scale.set(0.85, 1.48, 0.85);
    center.position.set(0, 0.26, 0.04);
    g.add(center);
    for (const [x, z, h, rz] of [
      [-0.42, 0.12, 0.64, 0.48],
      [0.42, 0.08, 0.68, -0.44],
      [-0.18, -0.22, 0.56, 0.2],
      [0.2, -0.22, 0.54, -0.22],
    ] as Array<[number, number, number, number]>) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.16, h, 5), goldMat);
      shard.position.set(x, 0.06, z);
      shard.rotation.z = rz;
      g.add(shard);
    }
    g.rotation.set(0.22, -0.36, 0);
    return g;
  }

  if (oreId === 'spectrine') {
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), toonMat(0x0f172a, 0.35, 0.4, 0x312e81, 0.25));
    g.add(core);
    const neonColors = [0xec4899, 0x22d3ee, 0xfacc15, 0xa855f7, 0x38bdf8, 0xf43f5e];
    for (let i = 0; i < neonColors.length; i++) {
      const ang = (i / neonColors.length) * Math.PI * 2;
      const mat = toonMat(neonColors[i], 0.12, 0.3, neonColors[i], 0.72);
      const seg = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.085, 8, 12, Math.PI / 3.1), mat);
      seg.rotation.z = ang;
      g.add(seg);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 4), mat);
      spike.position.set(Math.cos(ang) * 0.86, Math.sin(ang) * 0.86, 0);
      spike.rotation.z = ang - Math.PI / 2;
      g.add(spike);
    }
    g.rotation.set(0.32, -0.28, 0.18);
    return g;
  }

  if (oreId === 'celestium') {
    const darkCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), toonMat(0x09090b, 0.45, 0.25, 0xec4899, 0.25));
    darkCore.scale.set(0.95, 1.24, 0.95);
    g.add(darkCore);
    const auraPink = toonMat(0xec4899, 0.12, 0.35, 0xf472b6, 0.82);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.075, 10, 28), auraPink);
    halo.rotation.set(1.12, 0.26, 0.22);
    g.add(halo);
    const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 24), toonMat(0xa855f7, 0.14, 0.35, 0xc084fc, 0.68));
    halo2.rotation.set(-0.85, 0.5, -0.35);
    g.add(halo2);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), auraPink);
      sat.position.set(Math.cos(ang) * 0.82, Math.sin(ang) * 0.46, Math.sin(ang * 2) * 0.2);
      g.add(sat);
    }
    g.rotation.set(0.22, -0.36, 0);
    return g;
  }

  return null;
}

export function buildMagmaHollowsOreModel(oreId: string, _color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const basalt = toonMat(secondary || 0x1c1917, 0.78, 0.14);

  if (oreId === 'emberstone') {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), basalt);
    boulder.scale.set(1.16, 0.96, 0.98);
    g.add(boulder);
    const fissureMat = toonMat(0xf97316, 0.15, 0.1, 0xfb923c, 0.85);
    const tipMat = toonMat(0xfef08a, 0.1, 0.1, 0xfacc15, 0.95);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.24), fissureMat);
    stem.position.set(0.02, -0.22, 0.62);
    g.add(stem);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.24), fissureMat);
    leftArm.position.set(-0.18, 0.14, 0.63);
    leftArm.rotation.z = -0.62;
    g.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.24), tipMat);
    rightArm.position.set(0.18, 0.12, 0.64);
    rightArm.rotation.z = 0.56;
    g.add(rightArm);
    g.rotation.set(0.18, -0.26, 0);
    return g;
  }

  if (oreId === 'ashglass') {
    const obsidian = toonMat(0x18181b, 0.24, 0.45, 0x0f172a, 0.15);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), obsidian);
    base.scale.set(1.22, 0.82, 0.95);
    base.position.y = -0.18;
    g.add(base);
    for (const [x, y, h, rz] of [
      [-0.3, 0.22, 0.82, 0.36],
      [0.06, 0.34, 0.98, -0.08],
      [0.36, 0.18, 0.74, -0.44],
    ] as Array<[number, number, number, number]>) {
      const glassShard = new THREE.Mesh(new THREE.ConeGeometry(0.24, h, 4), obsidian);
      glassShard.position.set(x, y, 0.04);
      glassShard.rotation.z = rz;
      g.add(glassShard);
    }
    const tealFleck = toonMat(0x2dd4bf, 0.12, 0.2, 0x14b8a6, 0.8);
    const emberFleck = toonMat(0xf97316, 0.12, 0.2, 0xef4444, 0.85);
    for (const [x, y, z, s, isTeal] of [
      [-0.44, -0.14, 0.42, 0.13, true],
      [-0.24, 0.28, 0.3, 0.11, true],
      [0.24, 0.16, 0.4, 0.12, false],
      [0.42, -0.18, 0.36, 0.14, false],
      [0.04, -0.06, 0.56, 0.12, true],
    ] as Array<[number, number, number, number, boolean]>) {
      const bit = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), isTeal ? tealFleck : emberFleck);
      bit.position.set(x, y, z);
      g.add(bit);
    }
    g.rotation.set(0.2, -0.34, 0);
    return g;
  }

  if (oreId === 'magmite') {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.9, 0.96), basalt);
    block.position.y = -0.14;
    block.rotation.set(0.08, -0.18, -0.06);
    g.add(block);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.54, 0), basalt);
    cap.scale.set(1.25, 0.52, 1.0);
    cap.position.set(0, 0.26, 0);
    g.add(cap);
    const magmaMat = toonMat(0xef4444, 0.12, 0.2, 0xf97316, 0.88);
    for (const [x, y, z, r] of [
      [-0.36, 0.36, 0.28, 0.14],
      [-0.08, 0.42, 0.24, 0.16],
      [0.2, 0.4, 0.2, 0.15],
      [0.42, 0.28, 0.3, 0.13],
      [-0.18, 0.04, 0.52, 0.13],
      [0.26, -0.08, 0.5, 0.12],
    ] as Array<[number, number, number, number]>) {
      const orb = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), magmaMat);
      orb.position.set(x, y, z);
      g.add(orb);
    }
    g.rotation.set(0.22, -0.34, 0);
    return g;
  }

  if (oreId === 'cindershard') {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), basalt);
    slab.scale.set(1.38, 0.48, 0.98);
    slab.position.y = -0.38;
    g.add(slab);
    const hornBase = toonMat(0x991b1b, 0.35, 0.2, 0xef4444, 0.5);
    const hornTip = toonMat(0xfb923c, 0.12, 0.2, 0xf97316, 0.92);
    for (const [x, z, h, rz, rx, bright] of [
      [-0.44, 0.06, 0.78, 0.42, 0.08, false],
      [-0.2, -0.04, 1.08, 0.22, -0.06, true],
      [0.06, 0.08, 1.18, -0.04, 0.1, true],
      [0.32, -0.02, 0.96, -0.26, -0.08, false],
      [0.48, 0.1, 0.68, -0.48, 0.05, true],
    ] as Array<[number, number, number, number, number, boolean]>) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, h, 5), bright ? hornTip : hornBase);
      horn.position.set(x, -0.06 + h * 0.34, z);
      horn.rotation.set(rx, 0, rz);
      g.add(horn);
    }
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  if (oreId === 'scorchgold') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.74, 0.96), basalt);
    slab.position.set(0, -0.14, 0);
    slab.rotation.set(0.18, -0.22, 0.16);
    g.add(slab);
    const goldFire = toonMat(0xfacc15, 0.12, 0.45, 0xf59e0b, 0.85);
    const lavaGlow = toonMat(0xf97316, 0.1, 0.2, 0xea580c, 0.92);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.52), i % 2 === 0 ? goldFire : lavaGlow);
      bar.position.set(-0.34 + i * 0.23, 0.34 - i * 0.03, 0.18);
      bar.rotation.set(0.28, -0.12, 0.16);
      g.add(bar);
    }
    const moltenPool = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldFire);
    moltenPool.scale.set(1.25, 0.72, 0.8);
    moltenPool.position.set(-0.08, -0.18, 0.52);
    g.add(moltenPool);
    g.rotation.set(0.18, -0.26, 0);
    return g;
  }

  if (oreId === 'pyroclast') {
    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.58, 1),
      toonMat(0xfef08a, 0.08, 0.2, 0xf59e0b, 0.98)
    );
    sunCore.position.set(0, 0.02, 0.12);
    g.add(sunCore);
    const ringGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.14, 8, 18),
      toonMat(0xf97316, 0.12, 0.15, 0xea580c, 0.88)
    );
    ringGlow.position.z = -0.02;
    g.add(ringGlow);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.35;
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (i % 2) * 0.08, 0), basalt);
      chunk.position.set(Math.cos(ang) * 0.68, Math.sin(ang) * 0.62, -0.14 + (i % 2) * 0.14);
      chunk.rotation.set(ang, ang * 0.7, 0);
      g.add(chunk);
    }
    g.rotation.set(0.16, -0.28, 0);
    return g;
  }

  if (oreId === 'moltenite') {
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), basalt);
    crag.scale.set(1.22, 0.95, 0.95);
    crag.position.set(0.06, -0.08, -0.06);
    g.add(crag);
    const brightLava = toonMat(0xfacc15, 0.1, 0.15, 0xf97316, 0.92);
    const deepLava = toonMat(0xef4444, 0.12, 0.15, 0xf97316, 0.85);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.96, 8), brightLava);
    stream.position.set(-0.08, -0.02, 0.5);
    stream.rotation.z = 0.24;
    g.add(stream);
    const pool = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), deepLava);
    pool.scale.set(1.35, 0.42, 0.85);
    pool.position.set(-0.22, -0.46, 0.56);
    g.add(pool);
    for (const [x, y, z, r] of [
      [-0.14, 0.56, 0.24, 0.16],
      [0.14, 0.62, 0.16, 0.18],
      [0.36, 0.46, 0.2, 0.14],
    ] as Array<[number, number, number, number]>) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), brightLava);
      bubble.position.set(x, y, z);
      g.add(bubble);
    }
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  if (oreId === 'pyrecore') {
    const darkCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), toonMat(0x09090b, 0.4, 0.25, 0x991b1b, 0.35));
    g.add(darkCore);
    const flameMat = toonMat(0xef4444, 0.12, 0.25, 0xf97316, 0.86);
    const pinkAura = toonMat(0xec4899, 0.1, 0.3, 0xf472b6, 0.9);
    for (const [x, y, h, rz] of [
      [-0.36, 0.42, 0.72, 0.36],
      [-0.08, 0.6, 0.92, 0.08],
      [0.24, 0.54, 0.82, -0.22],
      [0.44, 0.28, 0.62, -0.52],
    ] as Array<[number, number, number, number]>) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, h, 5), flameMat);
      spike.position.set(x, y * 0.7, 0.06);
      spike.rotation.z = rz;
      g.add(spike);
    }
    const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 10, 28), pinkAura);
    vortex.rotation.set(1.06, 0.22, -0.28);
    g.add(vortex);
    const vortex2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 24), toonMat(0xf472b6, 0.12, 0.3, 0xe879f9, 0.78));
    vortex2.rotation.set(-0.78, 0.42, 0.35);
    g.add(vortex2);
    for (const [x, y, z] of [
      [-0.64, -0.3, 0.35],
      [0.62, 0.24, 0.3],
      [0.12, -0.54, 0.46],
    ] as Array<[number, number, number]>) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), pinkAura);
      shard.position.set(x, y, z);
      g.add(shard);
    }
    g.rotation.set(0.22, -0.32, 0);
    return g;
  }

  return null;
}

export function buildAncientRuinsOreModel(oreId: string, _color: string, secondary: string): THREE.Group | null {
  const g = new THREE.Group();
  const ruinStone = toonMat(secondary || 0x334155, 0.72, 0.14);

  if (oreId === 'runestone') {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.32, 0.56), ruinStone);
    pillar.position.y = -0.02;
    g.add(pillar);
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), ruinStone);
    cap.scale.set(1.05, 0.44, 0.65);
    cap.position.y = 0.62;
    g.add(cap);
    const runeMat = toonMat(0x2dd4bf, 0.1, 0.2, 0x5eead4, 0.92);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.78, 0.12), runeMat);
    vBar.position.set(0, -0.02, 0.28);
    g.add(vBar);
    const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.12), runeMat);
    diag1.position.set(0.14, 0.2, 0.28);
    diag1.rotation.z = -0.55;
    g.add(diag1);
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.12), runeMat);
    diag2.position.set(-0.14, -0.06, 0.28);
    diag2.rotation.z = 0.62;
    g.add(diag2);
    g.rotation.set(0.16, -0.3, 0);
    return g;
  }

  if (oreId === 'dustglyph') {
    const sandStone = toonMat(0x57534e, 0.8, 0.08);
    const mossAccent = toonMat(0x4d7c0f, 0.76, 0.08);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.02, 0.54), sandStone);
    slab.position.y = -0.04;
    slab.rotation.z = -0.06;
    g.add(slab);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.56), mossAccent);
    moss.position.set(0.16, 0.42, 0.01);
    moss.rotation.z = -0.06;
    g.add(moss);
    const goldGlyph = toonMat(0xfacc15, 0.1, 0.25, 0xeab308, 0.95);
    const glyphOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldGlyph);
    glyphOrb.position.set(-0.28, -0.14, 0.28);
    g.add(glyphOrb);
    const glyphBar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), goldGlyph);
    glyphBar.position.set(-0.14, -0.28, 0.28);
    glyphBar.rotation.z = 0.35;
    g.add(glyphBar);
    g.rotation.set(0.16, -0.34, 0);
    return g;
  }

  if (oreId === 'relicore') {
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), ruinStone);
    base.scale.set(1.25, 0.82, 0.88);
    base.position.y = -0.1;
    g.add(base);
    const bronzeMat = toonMat(0xb45309, 0.38, 0.55);
    const relicGlow = toonMat(0x22d3ee, 0.08, 0.2, 0x67e8f9, 0.96);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 10, 22), relicGlow);
    outerRing.position.set(-0.08, 0.02, 0.46);
    g.add(outerRing);
    const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), relicGlow);
    innerCore.position.set(-0.08, 0.02, 0.48);
    g.add(innerCore);
    const cog = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 8), bronzeMat);
    cog.rotation.x = Math.PI / 2;
    cog.position.set(0.42, 0.22, 0.3);
    g.add(cog);
    g.rotation.set(0.18, -0.28, 0);
    return g;
  }

  if (oreId === 'sanctite') {
    const jadeStone = toonMat(0x99f6e4, 0.22, 0.25, 0x5eead4, 0.28);
    const mossBase = toonMat(0x365314, 0.72, 0.1);
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), mossBase);
    base.scale.set(1.26, 0.48, 0.96);
    base.position.y = -0.38;
    g.add(base);
    for (const [x, z, h, r, rz] of [
      [-0.36, 0.06, 0.68, 0.15, 0.2],
      [0.36, 0.04, 0.64, 0.15, -0.22],
      [-0.14, -0.14, 0.84, 0.18, 0.08],
      [0.16, -0.12, 0.78, 0.17, -0.1],
      [0, 0.08, 1.06, 0.22, 0],
    ] as Array<[number, number, number, number, number]>) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), jadeStone);
      spire.position.set(x, -0.06 + h * 0.28, z);
      spire.rotation.z = rz;
      g.add(spire);
    }
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 10),
      toonMat(0xf0fdfa, 0.06, 0.2, 0x67e8f9, 0.96)
    );
    beacon.position.set(0, 0.68, 0.08);
    g.add(beacon);
    g.rotation.set(0.2, -0.3, 0);
    return g;
  }

  if (oreId === 'gildium') {
    const mossRock = toonMat(0x3f6212, 0.68, 0.12);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.76, 0), mossRock);
    boulder.scale.set(1.3, 0.78, 1.02);
    boulder.position.y = -0.16;
    g.add(boulder);
    const goldMat = toonMat(0xfacc15, 0.16, 0.72, 0xd97706, 0.35);
    for (const [x, y, z, rx, ry, rz] of [
      [-0.34, 0.14, 0.24, 0.2, 0.3, 0.18],
      [0.28, 0.18, 0.2, -0.15, -0.25, -0.2],
      [0.02, -0.04, 0.44, 0.3, 0.1, 0.05],
    ] as Array<[number, number, number, number, number, number]>) {
      const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.32), goldMat);
      ingot.position.set(x, y, z);
      ingot.rotation.set(rx, ry, rz);
      g.add(ingot);
    }
    const emerald = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      toonMat(0x22c55e, 0.1, 0.25, 0x4ade80, 0.85)
    );
    emerald.scale.set(0.9, 1.35, 0.9);
    emerald.position.set(0, 0.48, 0.04);
    g.add(emerald);
    g.rotation.set(0.2, -0.34, 0);
    return g;
  }

  if (oreId === 'oathstone') {
    const slate = toonMat(0x1e293b, 0.48, 0.32);
    const goldTrim = toonMat(0xf59e0b, 0.2, 0.75, 0xfbbf24, 0.25);
    const aquaRune = toonMat(0x22d3ee, 0.08, 0.2, 0x38bdf8, 0.95);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.14, 0.78), slate);
    body.position.y = -0.06;
    g.add(body);
    const crestL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.82), goldTrim);
    crestL.position.set(-0.36, 0.44, 0);
    crestL.rotation.z = 0.22;
    g.add(crestL);
    const crestR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.82), goldTrim);
    crestR.position.set(0.36, 0.44, 0);
    crestR.rotation.z = -0.22;
    g.add(crestR);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.14, 0.84), goldTrim);
    belt.position.y = -0.5;
    g.add(belt);
    for (const [x, rz] of [[-0.22, 0.32], [0.22, -0.32]]) {
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.12), aquaRune);
      glyph.position.set(x, -0.04, 0.4);
      glyph.rotation.z = rz;
      g.add(glyph);
    }
    const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), aquaRune);
    centerGem.position.set(0, -0.04, 0.43);
    g.add(centerGem);
    g.rotation.set(0.18, -0.34, 0);
    return g;
  }

  if (oreId === 'idolshard') {
    const headStone = toonMat(0x4d7c0f, 0.65, 0.12);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.02, 0.72), headStone);
    head.position.y = -0.14;
    g.add(head);
    const limeMat = toonMat(0x4ade80, 0.08, 0.25, 0x22c55e, 0.92);
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5;
      const h = 0.54 + (1 - Math.abs(t)) * 0.28;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.13, h, 5), limeMat);
      crown.position.set(t * 0.72, 0.48 + h * 0.2, 0.04);
      crown.rotation.z = -t * 0.3;
      g.add(crown);
    }
    for (const x of [-0.2, 0.2]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), limeMat);
      eye.position.set(x, 0.04, 0.36);
      g.add(eye);
      const tear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.1), limeMat);
      tear.position.set(x, -0.22, 0.36);
      g.add(tear);
    }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.18), ruinStone);
    nose.position.set(0, -0.1, 0.38);
    g.add(nose);
    g.rotation.set(0.16, -0.3, 0);
    return g;
  }

  if (oreId === 'immortite') {
    const relicBase = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62, 0),
      toonMat(0x3f6212, 0.6, 0.18)
    );
    relicBase.scale.set(1.24, 0.6, 0.96);
    relicBase.position.y = -0.28;
    g.add(relicBase);
    const goldEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.18, 0.64),
      toonMat(0xf59e0b, 0.18, 0.72, 0xfacc15, 0.3)
    );
    goldEdge.position.y = -0.06;
    g.add(goldEdge);
    const immortalGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      toonMat(0x2dd4bf, 0.08, 0.25, 0x5eead4, 0.94)
    );
    immortalGem.scale.set(0.95, 1.32, 0.95);
    immortalGem.position.set(0, 0.3, 0.06);
    g.add(immortalGem);
    const auraPink = toonMat(0xec4899, 0.08, 0.25, 0xf472b6, 0.92);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.075, 10, 28), auraPink);
    ring.rotation.set(1.08, 0.28, -0.22);
    g.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.045, 8, 24),
      toonMat(0xfef08a, 0.1, 0.3, 0xf472b6, 0.72)
    );
    ring2.rotation.set(-0.76, 0.45, 0.3);
    g.add(ring2);
    g.rotation.set(0.2, -0.32, 0);
    return g;
  }

  return null;
}

