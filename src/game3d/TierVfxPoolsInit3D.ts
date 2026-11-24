import * as THREE from 'three';
import {
  createAbyssalGreatswordGeometry,
  createAetherMonarchCrownGeometry,
  createAetherMonarchCrownShaderMaterial,
  createAetherNexusSealShaderMaterial,
  createChronoCrystallisPropGeometry,
  createChronoCrystallisPropShaderMaterial,
  createChronoCrystallisSealShaderMaterial,
  createArrowGeometry,
  createBladeMeshGeometry,
  createCheshireGlitchCardShaderMaterial,
  createCheshireGlitchSealShaderMaterial,
  createClockworkDialShaderMaterial,
  createClockworkGearGeometry,
  createClockworkSakugaWeaponShaderMaterial,
  createClockworkScytheHandGeometry,
  createClocktowerShaderMaterial,
  createCrescentMoonShaderMaterial,
  createCrystalSpikeGeometry,
  createEnergyWeaponMaterial,
  createFresnelDomeMaterial,
  createGiantCrescentMoonGeometry,
  createGlitchPrismShardGeometry,
  createGothicMirrorCageGeometry,
  createGothicMirrorCageShaderMaterial,
  createHalcyonOrbitalSealShaderMaterial,
  createHalcyonRailPillarGeometry,
  createHalcyonRailPillarShaderMaterial,
  createHalcyonRainShaderMaterial,
  createInvertedClocktowerGeometry,
  createKunaiGeometry,
  createLullabyMusicBoxSealShaderMaterial,
  createMonochromeJudgementObeliskShaderMaterial,
  createMonochromeObeliskGeometry,
  createMonochromeSanctuarySealShaderMaterial,
  createNocturneEclipseCraterShaderMaterial,
  createNocturneEclipseMonolithGeometry,
  createNocturneEclipseMonolithShaderMaterial,
  createOrbitalBeamMaterial,
  createPrismOctahedronGeometry,
  createPrismRefractionSealShaderMaterial,
  createPrismShardColumnShaderMaterial,
  createRoninKatanaGeometry,
  createSlashArcGeometry,
  createSlashShaderMaterial,
  createSpatialRiftMaterial,
  createSpearGeometry,
  createThornRoseMandalaShaderMaterial,
  createThornVineLanceGeometry,
  createThornVineLanceShaderMaterial,
  createVortexConeMaterial,
  createYukikageFrostSealShaderMaterial,
  type FusionChibiVariant,
} from './MeshFx3D';
import type {
  BarrageLineSlot,
  BeamSlot,
  BoltSlot,
  ClockDialSlot,
  ClocktowerSlot,
  DebrisSlot,
  DomeSlot,
  FusionPropSlot,
  HalcyonPillarSlot,
  HalcyonRainSlot,
  LullabyCrescentMoonSlot,
  LullabyMirrorCageSlot,
  NocturneCraterSlot,
  NocturneEclipseSlot,
  OrbSlot,
  QuadSlot,
  RiftSlot,
  SlashSlot,
  VortexSlot,
  WeaponSlot,
} from './TierVfxUpdate3D';
import {
  getRaritySecondaryColor,
  isWideAoeRarity,
  resolvePitBounds,
  type WorldPoint3,
} from './TierMotionPath3D';
import type { TierVfxChoreoContext } from './TierVfxChoreography3D';

export interface UltOpeningBurstOpts {
  x: number;
  y: number;
  z: number;
  colorHex: string;
  secondaryHex?: string;
}

export function fireUltOpeningBurstChoreography(
  ctx: TierVfxChoreoContext,
  opts: UltOpeningBurstOpts
): void {
  const sec = opts.secondaryHex ?? '#fef08a';
  ctx.spawnBeam({
    x: opts.x,
    y: opts.y + 0.1,
    z: opts.z,
    color: opts.colorHex,
    coreColor: sec,
    radius: 0.95,
    height: 7.4,
    life: 0.38,
  });
  ctx.spawnQuad({
    tex: ctx.ringTex,
    x: opts.x,
    y: opts.y + 0.28,
    z: opts.z,
    color: opts.colorHex,
    s0: 0.75,
    s1: 4.2,
    life: 0.42,
    flatFloor: true,
    alpha: 0.95,
  });
  ctx.spawnQuad({
    tex: ctx.ringTex,
    x: opts.x,
    y: opts.y + 0.22,
    z: opts.z,
    color: sec,
    s0: 0.55,
    s1: 3.1,
    life: 0.46,
    flatFloor: true,
    alpha: 0.85,
  });
  ctx.spawnSparks(opts.x, opts.y + 1.35, opts.z, opts.colorHex, sec, ctx.lowQuality ? 4 : 9, 5.6);
}

export interface PodiumWeaponCastOpts {
  rarity: string;
  chibiId?: string;
  colorHex: string;
  origin: WorldPoint3;
  target: WorldPoint3;
  allTargets?: readonly WorldPoint3[];
  areaScale?: number;
  wideCenter?: WorldPoint3;
}

export function firePodiumWeaponCastChoreography(
  ctx: TierVfxChoreoContext,
  opts: PodiumWeaponCastOpts
): void {
  const { rarity, chibiId, colorHex, origin, target } = opts;
  const secondary = getRaritySecondaryColor(rarity);
  const wide = isWideAoeRarity(rarity);
  const allTargets = opts.allTargets && opts.allTargets.length > 0 ? opts.allTargets : [target];
  let destX = target.x;
  let destY = target.y;
  let destZ = target.z;
  if (wide) {
    const b = resolvePitBounds(allTargets, target, opts.wideCenter);
    destX = b.cx;
    destY = b.cy;
    destZ = b.cz;
  }
  const dest = new THREE.Vector3(destX, destY + 0.65, destZ);
  const ox = origin.x;
  const oy = origin.y + 1.45;
  const oz = origin.z - 0.12;

  if (rarity === 'omega' && chibiId === 'abyssal-leviathan') {
    [-0.55, 0, 0.55].forEach((dx, idx) => {
      const end = new THREE.Vector3(dest.x + dx * 0.85, dest.y, dest.z);
      ctx.spawnDirectedWeapon(
        idx === 1 ? 'spear' : 'blade',
        new THREE.Vector3(ox + dx, oy + 0.35 + (idx === 1 ? 0.35 : 0), oz),
        end,
        idx % 2 === 0 ? '#06b6d4' : '#67e8f9',
        1.22,
        0.24,
        () => ctx.spawnSparks(end.x, end.y, end.z, '#67e8f9', '#06b6d4', 5, 5.2)
      );
    });
    return;
  }

  if (rarity === 'omega' && chibiId === 'obsidian-sovereign') {
    ctx.spawnDirectedWeapon(
      'greatsword',
      new THREE.Vector3(ox, oy + 0.55, oz),
      dest,
      '#a855f7',
      0.95,
      0.26,
      () => ctx.spawnSparks(dest.x, dest.y, dest.z, '#f8fafc', '#a855f7', 6, 5.2)
    );
    return;
  }

  if (rarity === 'omega' && chibiId === 'crimson-ronin') {
    const offsets = [-0.65, 0, 0.65];
    offsets.forEach((dx, idx) => {
      const end = new THREE.Vector3(dest.x + dx * 0.9, dest.y, dest.z + (idx === 1 ? 0 : 0.25));
      ctx.spawnDirectedWeapon(
        'katana',
        new THREE.Vector3(ox + dx, oy + 0.25 + (idx === 1 ? 0.35 : 0), oz),
        end,
        idx === 1 ? '#fef08a' : '#ef4444',
        1.25,
        0.22,
        () => ctx.spawnSparks(end.x, end.y, end.z, '#ef4444', '#fef08a', 4, 4.8)
      );
    });
    return;
  }

  if (rarity === 'twin') {
    if (chibiId === 'clockwork-twins') {
      [-0.6, 0.6].forEach((dx, idx) => {
        ctx.spawnWeapon({
          kind: 'gear',
          color: idx === 0 ? '#f59e0b' : '#2dd4bf',
          coreColor: '#fef08a',
          startPos: new THREE.Vector3(ox + dx, oy + 0.25, oz),
          endPos: new THREE.Vector3(dest.x + dx * 0.85, dest.y, dest.z),
          startRot: new THREE.Euler(-Math.PI / 2, 0, 0),
          endRot: new THREE.Euler(-Math.PI / 2, 0, (idx === 0 ? 1 : -1) * Math.PI * 3),
          scale: 1.05,
          mode: 'swing',
          life: 0.24,
        });
      });
      ctx.spawnDirectedWeapon(
        'clockhand',
        new THREE.Vector3(ox, oy + 0.55, oz),
        dest,
        '#fbbf24',
        1.15,
        0.22
      );
      return;
    }
    if (chibiId === 'paradox-twins') {
      ctx.spawnWeapon({
        kind: 'gear',
        color: '#fbbf24',
        coreColor: '#fef08a',
        startPos: new THREE.Vector3(ox - 0.55, oy + 0.35, oz),
        endPos: new THREE.Vector3(dest.x - 0.45, dest.y, dest.z),
        startRot: new THREE.Euler(-Math.PI / 2, 0, 0),
        endRot: new THREE.Euler(-Math.PI / 2, 0, Math.PI * 3),
        scale: 1.08,
        mode: 'swing',
        life: 0.24,
      });
      ctx.spawnDirectedWeapon(
        'blade',
        new THREE.Vector3(ox + 0.55, oy + 0.35, oz),
        new THREE.Vector3(dest.x + 0.45, dest.y, dest.z),
        '#ef4444',
        1.18,
        0.22
      );
      return;
    }
    const twinKind: 'kunai' | 'arrow' | 'blade' | 'spear' | 'crystal' =
      chibiId === 'yukikage-twins'
        ? 'kunai'
        : chibiId === 'halcyon-twins'
          ? 'arrow'
          : chibiId === 'lullaby-twins'
            ? 'crystal'
            : 'blade';
    const twinColA =
      chibiId === 'yukikage-twins'
        ? '#38bdf8'
        : chibiId === 'halcyon-twins'
          ? '#22d3ee'
          : chibiId === 'nocturne-twins'
            ? '#f8fafc'
            : '#f472b6';
    const twinColB =
      chibiId === 'yukikage-twins'
        ? '#e0f2fe'
        : chibiId === 'halcyon-twins'
          ? '#fde047'
          : chibiId === 'nocturne-twins'
            ? '#a855f7'
            : '#c084fc';
    const offsets = twinKind === 'kunai' || twinKind === 'arrow' ? [-0.6, 0, 0.6] : [-0.45, 0.45];
    offsets.forEach((dx, idx) => {
      const end = new THREE.Vector3(dest.x + dx * 0.75, dest.y, dest.z);
      ctx.spawnDirectedWeapon(
        twinKind,
        new THREE.Vector3(ox + dx, oy + 0.25 + (idx === 1 ? 0.25 : 0), oz),
        end,
        idx % 2 === 0 ? twinColA : twinColB,
        chibiId === 'halcyon-twins' ? 1.24 : 1.15,
        0.22
      );
    });
    return;
  }

  if (rarity === 'fusion') {
    const fusionKind: 'kunai' | 'spear' | 'greatsword' | 'crystal' | 'blade' =
      chibiId === 'glitch-cheshire'
        ? 'kunai'
        : chibiId === 'thorn-maiden'
          ? 'spear'
          : chibiId === 'monochrome-saint'
            ? 'greatsword'
            : chibiId === 'prism-seraph'
              ? 'crystal'
              : chibiId === 'aether-monarch'
                ? 'spear'
                : chibiId === 'chrono-crystallis'
                  ? 'crystal'
                  : 'blade';
    const [colA, colB]: [string, string] =
      chibiId === 'glitch-cheshire'
        ? ['#22d3ee', '#d946ef']
        : chibiId === 'thorn-maiden'
          ? ['#f43f5e', '#fb7185']
          : chibiId === 'monochrome-saint'
            ? ['#f8fafc', '#18181b']
            : chibiId === 'prism-seraph'
              ? ['#facc15', '#38bdf8']
              : chibiId === 'aether-monarch'
                ? ['#fbbf24', '#22d3ee']
                : chibiId === 'chrono-crystallis'
                  ? ['#38bdf8', '#fbbf24']
                  : [colorHex, secondary];
    [-0.55, 0, 0.55].forEach((dx, idx) => {
      ctx.spawnDirectedWeapon(
        fusionKind,
        new THREE.Vector3(ox + dx, oy + 0.22 + (idx === 1 ? 0.22 : 0), oz),
        new THREE.Vector3(dest.x + dx * 0.65, dest.y, dest.z),
        idx % 2 === 0 ? colA : colB,
        1.1,
        0.22
      );
    });
    return;
  }

  if (rarity === 'limited' || rarity === 'secret' || rarity === 'mythic' || rarity === 'exotic') {
    const kind: 'blade' | 'spear' | 'crystal' =
      rarity === 'secret' || rarity === 'exotic' ? 'crystal' : rarity === 'mythic' ? 'spear' : 'blade';
    [-0.5, 0, 0.5].forEach((dx, idx) => {
      ctx.spawnDirectedWeapon(
        kind,
        new THREE.Vector3(ox + dx, oy + 0.2, oz),
        new THREE.Vector3(dest.x + dx * 0.65, dest.y, dest.z),
        idx === 1 ? secondary : colorHex,
        1.05,
        0.22
      );
    });
    return;
  }

  const kind: 'blade' | 'spear' = rarity === 'rare' || rarity === 'legendary' || rarity === 'rainbow' ? 'spear' : 'blade';
  ctx.spawnDirectedWeapon(
    kind,
    new THREE.Vector3(ox, oy + 0.15, oz),
    dest,
    colorHex,
    0.98,
    0.2
  );
}

export function createBarrageRazorLineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uColor: { value: new THREE.Color('#38bdf8') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float sweep = mix(-1.05, 1.15, smoothstep(0.0, 0.18, uProgress));
        float fade = 1.0 - smoothstep(0.38, 1.0, uProgress);
        float tipMask = smoothstep(1.0, 0.42, abs(p.x)) * smoothstep(sweep + 0.14, sweep - 0.08, p.x);
        float taper = mix(0.24, 1.0, smoothstep(1.0, 0.18, abs(p.x)));
        float d = abs(p.y) / max(0.20, taper);
        float core = smoothstep(0.052, 0.010, d);
        float needle = (0.016 / (d + 0.008)) * smoothstep(0.26, 0.0, d);
        float aura = (0.048 / (d + 0.032)) * smoothstep(0.72, 0.0, d);
        float intensity = (core * 1.2 + needle * 0.8 + aura * 0.65) * tipMask * fade;
        float alpha = clamp(intensity, 0.0, 1.0);
        if (alpha < 0.015) discard;
        vec3 col = uColor * clamp(aura * 1.45 + needle * 0.75, 0.0, 1.75) + vec3(1.0) * clamp(core * 1.4 + needle * 0.45, 0.0, 1.6);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function createTierVfxPoolCollections(
  group: THREE.Group,
  streakTex: THREE.Texture
): {
  sharedGeos: THREE.BufferGeometry[];
  slashes: SlashSlot[];
  barrageLines: BarrageLineSlot[];
  domes: DomeSlot[];
  beams: BeamSlot[];
  vortices: VortexSlot[];
  rifts: RiftSlot[];
  weapons: WeaponSlot[];
  clockDials: ClockDialSlot[];
  frostSeals: ClockDialSlot[];
  lullabySeals: ClockDialSlot[];
  halcyonSeals: ClockDialSlot[];
  fusionSeals: Record<FusionChibiVariant, ClockDialSlot[]>;
  fusionProps: FusionPropSlot[];
  halcyonPillars: HalcyonPillarSlot[];
  halcyonRain: HalcyonRainSlot[];
  nocturneEclipses: NocturneEclipseSlot[];
  nocturneCraters: NocturneCraterSlot[];
  lullabyMirrorCages: LullabyMirrorCageSlot[];
  lullabyCrescentMoons: LullabyCrescentMoonSlot[];
  clocktowers: ClocktowerSlot[];
  arrowGeo: THREE.BufferGeometry;
  bladeGeo: THREE.BufferGeometry;
  boltSegs: BoltSlot[];
  debris: DebrisSlot[];
  quads: QuadSlot[];
  orbs: OrbSlot[];
} {
  const sharedGeos: THREE.BufferGeometry[] = [];
  const slashes: SlashSlot[] = [];
  const barrageLines: BarrageLineSlot[] = [];
  const domes: DomeSlot[] = [];
  const beams: BeamSlot[] = [];
  const vortices: VortexSlot[] = [];
  const rifts: RiftSlot[] = [];
  const weapons: WeaponSlot[] = [];
  const clockDials: ClockDialSlot[] = [];
  const frostSeals: ClockDialSlot[] = [];
  const lullabySeals: ClockDialSlot[] = [];
  const halcyonSeals: ClockDialSlot[] = [];
  const fusionSeals: Record<FusionChibiVariant, ClockDialSlot[]> = {
    'glitch-cheshire': [],
    'thorn-maiden': [],
    'monochrome-saint': [],
    'prism-seraph': [],
    'aether-monarch': [],
    'chrono-crystallis': [],
  };
  const fusionProps: FusionPropSlot[] = [];
  const halcyonPillars: HalcyonPillarSlot[] = [];
  const halcyonRain: HalcyonRainSlot[] = [];
  const nocturneEclipses: NocturneEclipseSlot[] = [];
  const nocturneCraters: NocturneCraterSlot[] = [];
  const lullabyMirrorCages: LullabyMirrorCageSlot[] = [];
  const lullabyCrescentMoons: LullabyCrescentMoonSlot[] = [];
  const clocktowers: ClocktowerSlot[] = [];
  const boltSegs: BoltSlot[] = [];
  const debris: DebrisSlot[] = [];
  const quads: QuadSlot[] = [];
  const orbs: OrbSlot[] = [];

  const slashGeo = createSlashArcGeometry(0.34, 1.0, Math.PI * 1.48, 48);
  const domeGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const beamGeo = new THREE.CylinderGeometry(0.4, 0.62, 16, 18, 1, true);
  beamGeo.translate(0, 8, 0);
  const vortexGeo = new THREE.CylinderGeometry(1.15, 0.24, 2.2, 20, 6, true);
  vortexGeo.translate(0, 1.1, 0);
  const riftGeo = new THREE.PlaneGeometry(1, 0.34);
  const bladeGeo = createBladeMeshGeometry();
  const arrowGeo = createArrowGeometry();
  const kunaiGeo = createKunaiGeometry();
  const katanaGeo = createRoninKatanaGeometry();
  const spearGeo = createSpearGeometry();
  const crystalGeo = createCrystalSpikeGeometry();
  const greatswordGeo = createAbyssalGreatswordGeometry();
  const gearGeo = createClockworkGearGeometry();
  const clockHandGeo = createClockworkScytheHandGeometry();
  const eclipseMonolithGeo = createNocturneEclipseMonolithGeometry();
  const mirrorCageGeo = createGothicMirrorCageGeometry();
  const crescentMoonGeo = createGiantCrescentMoonGeometry();
  const clocktowerGeo = createInvertedClocktowerGeometry();
  const glitchCardGeo = createGlitchPrismShardGeometry();
  const thornLanceGeo = createThornVineLanceGeometry();
  const monoObeliskGeo = createMonochromeObeliskGeometry();
  const prismCrystalGeo = createPrismOctahedronGeometry();
  const aetherCrownGeo = createAetherMonarchCrownGeometry();
  const chronoCrystalGeo = createChronoCrystallisPropGeometry();
  const halcyonPillarGeo = createHalcyonRailPillarGeometry();
  const boltGeo = new THREE.PlaneGeometry(1, 1);
  boltGeo.translate(0, 0.5, 0);
  const chunkGeo = new THREE.IcosahedronGeometry(0.14, 0);
  const quadGeo = new THREE.PlaneGeometry(1, 1);
  const orbGeo = new THREE.IcosahedronGeometry(0.42, 1);

  let bladeGeoOut = bladeGeo;
  let arrowGeoOut = arrowGeo;

  sharedGeos.push(
    slashGeo, domeGeo, beamGeo, vortexGeo, riftGeo, bladeGeo, arrowGeo, kunaiGeo, katanaGeo, spearGeo, crystalGeo, greatswordGeo, gearGeo, clockHandGeo,
    eclipseMonolithGeo, mirrorCageGeo, crescentMoonGeo, clocktowerGeo,
    glitchCardGeo, thornLanceGeo, monoObeliskGeo, prismCrystalGeo, aetherCrownGeo, chronoCrystalGeo, halcyonPillarGeo,
    boltGeo, chunkGeo, quadGeo, orbGeo
  );

  for (let i = 0; i < 32; i++) {
    const mat = createSlashShaderMaterial();
    const mesh = new THREE.Mesh(slashGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    slashes.push({ mesh, mat, active: false, age: 0, life: 0.4, s0: 1, s1: 1, spinSpeed: 0 });
  }

  for (let i = 0; i < 24; i++) {
    const mat = createBarrageRazorLineMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 24;
    mesh.frustumCulled = false;
    group.add(mesh);
    barrageLines.push({
      mesh,
      mat,
      active: false,
      age: 0,
      life: 0.24,
      roll: 0,
      len: 2.5,
      thickness: 1.15,
    });
  }

  for (let i = 0; i < 16; i++) {
    const mat = createFresnelDomeMaterial();
    const mesh = new THREE.Mesh(domeGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    domes.push({ mesh, mat, active: false, age: 0, life: 0.5, s0: 0.4, s1: 4, yScale: 0.8 });
  }

  for (let i = 0; i < 10; i++) {
    const mat = createOrbitalBeamMaterial();
    const mesh = new THREE.Mesh(beamGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    beams.push({ mesh, mat, active: false, age: 0, life: 0.6, radius: 1, height: 1 });
  }

  for (let i = 0; i < 10; i++) {
    const mat = createVortexConeMaterial();
    const mesh = new THREE.Mesh(vortexGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    vortices.push({ mesh, mat, active: false, age: 0, life: 0.75, sx: 1, sy: 1, spin: 8 });
  }

  for (let i = 0; i < 26; i++) {
    const mat = createSpatialRiftMaterial();
    const mesh = new THREE.Mesh(riftGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    rifts.push({ mesh, mat, active: false, age: 0, life: 0.6, len: 5, height: 1 });
  }

  const addWeaponPool = (
    geo: THREE.BufferGeometry,
    count: number,
    kind: WeaponSlot['kind'],
    makeMat: () => THREE.ShaderMaterial = createEnergyWeaponMaterial
  ): void => {
    for (let i = 0; i < count; i++) {
      const mat = makeMat();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      group.add(mesh);
      weapons.push({
        kind,
        mesh,
        mat,
        active: false,
        age: 0,
        life: 0.5,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        startRot: new THREE.Euler(),
        endRot: new THREE.Euler(),
        scaleTarget: 1,
        mode: 'plunge',
        onArrive: null,
        arrived: false,
      });
    }
  };
  addWeaponPool(bladeGeo, 22, 'blade');
  addWeaponPool(spearGeo, 22, 'spear');
  addWeaponPool(crystalGeo, 28, 'crystal');
  addWeaponPool(greatswordGeo, 12, 'greatsword');
  addWeaponPool(gearGeo, 20, 'gear', createClockworkSakugaWeaponShaderMaterial);
  addWeaponPool(clockHandGeo, 12, 'clockhand', createClockworkSakugaWeaponShaderMaterial);
  addWeaponPool(katanaGeo, 8, 'katana');
  addWeaponPool(kunaiGeo, 10, 'kunai');
  addWeaponPool(arrowGeo, 10, 'arrow');

  for (let i = 0; i < 4; i++) {
    const mat = createClockworkDialShaderMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    clockDials.push({ mesh, mat, active: false, age: 0, life: 0.9, s0: 2.0, s1: 7.0 });
  }

  for (let i = 0; i < 4; i++) {
    const mat = createYukikageFrostSealShaderMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    frostSeals.push({ mesh, mat, active: false, age: 0, life: 1.0, s0: 2.0, s1: 8.4 });
  }

  for (let i = 0; i < 2; i++) {
    const mat = createLullabyMusicBoxSealShaderMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    lullabySeals.push({ mesh, mat, active: false, age: 0, life: 1.25, s0: 2.1, s1: 9.4 });
  }

  const fusionSealFactories: Record<FusionChibiVariant, () => THREE.ShaderMaterial> = {
    'glitch-cheshire': createCheshireGlitchSealShaderMaterial,
    'thorn-maiden': createThornRoseMandalaShaderMaterial,
    'monochrome-saint': createMonochromeSanctuarySealShaderMaterial,
    'prism-seraph': createPrismRefractionSealShaderMaterial,
    'aether-monarch': createAetherNexusSealShaderMaterial,
    'chrono-crystallis': createChronoCrystallisSealShaderMaterial,
  };
  for (const variant of Object.keys(fusionSealFactories) as FusionChibiVariant[]) {
    const makeMat = fusionSealFactories[variant];
    for (let i = 0; i < 2; i++) {
      const mat = makeMat();
      const mesh = new THREE.Mesh(quadGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      group.add(mesh);
      fusionSeals[variant].push({ mesh, mat, active: false, age: 0, life: 1.1, s0: 2.0, s1: 8.6 });
    }
  }

  const addFusionPropPool = (
    variant: FusionChibiVariant,
    geo: THREE.BufferGeometry,
    makeMat: () => THREE.ShaderMaterial,
    count: number
  ): void => {
    for (let i = 0; i < count; i++) {
      const mat = makeMat();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      group.add(mesh);
      fusionProps.push({
        variant,
        mesh,
        mat,
        active: false,
        age: 0,
        life: 0.65,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        startRot: new THREE.Euler(),
        endRot: new THREE.Euler(),
        scaleTarget: 1,
        mode: 'erupt',
        spinY: 0,
        onArrive: null,
        arrived: false,
      });
    }
  };
  addFusionPropPool('glitch-cheshire', glitchCardGeo, createCheshireGlitchCardShaderMaterial, 8);
  addFusionPropPool('thorn-maiden', thornLanceGeo, createThornVineLanceShaderMaterial, 10);
  addFusionPropPool('monochrome-saint', monoObeliskGeo, createMonochromeJudgementObeliskShaderMaterial, 6);
  addFusionPropPool('prism-seraph', prismCrystalGeo, createPrismShardColumnShaderMaterial, 6);
  addFusionPropPool('aether-monarch', aetherCrownGeo, createAetherMonarchCrownShaderMaterial, 2);
  addFusionPropPool('chrono-crystallis', chronoCrystalGeo, createChronoCrystallisPropShaderMaterial, 6);

  for (let i = 0; i < 2; i++) {
    const mat = createHalcyonOrbitalSealShaderMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    halcyonSeals.push({ mesh, mat, active: false, age: 0, life: 1.22, s0: 2.2, s1: 9.8 });
  }

  for (let i = 0; i < 4; i++) {
    const mat = createHalcyonRailPillarShaderMaterial();
    const mesh = new THREE.Mesh(halcyonPillarGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    halcyonPillars.push({
      mesh, mat, active: false, age: 0, life: 1.05,
      baseY: 0, baseScale: 1, charge: 0,
    });
  }

  for (let i = 0; i < 40; i++) {
    const mat = createHalcyonRainShaderMaterial();
    const mesh = new THREE.Mesh(arrowGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    halcyonRain.push({
      mesh, mat, active: false, age: 0, life: 0.72, arriveFrac: 0.26,
      startPos: new THREE.Vector3(), endPos: new THREE.Vector3(),
      arrived: false, onArrive: null,
    });
  }

  for (let idx = 0; idx < 2; idx++) {
    const mat = createNocturneEclipseMonolithShaderMaterial();
    const mesh = new THREE.Mesh(eclipseMonolithGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    nocturneEclipses.push({
      mesh, mat, active: false, age: 0, life: 1.05,
      baseY: 0, baseScale: 1, severTriggered: false, onSever: null,
    });
  }

  for (let i = 0; i < 2; i++) {
    const mat = createNocturneEclipseCraterShaderMaterial();
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    group.add(mesh);
    nocturneCraters.push({ mesh, mat, active: false, age: 0, life: 0.85, s0: 1.6, s1: 9.5 });
  }

  {
    const mat = createGothicMirrorCageShaderMaterial();
    const mesh = new THREE.Mesh(mirrorCageGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    lullabyMirrorCages.push({
      mesh, mat, active: false, age: 0, lockDur: 0.44, shatterDur: 0.48,
      baseScale: 1, shattering: false, shatterAge: 0, onShatter: null,
    });
  }

  {
    const mat = createCrescentMoonShaderMaterial();
    const mesh = new THREE.Mesh(crescentMoonGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    lullabyCrescentMoons.push({
      mesh, mat, active: false, age: 0, approachDur: 0.16, cleaveHoldDur: 0.24, slashThroughDur: 0.36,
      baseScale: 1.1, startPos: new THREE.Vector3(), midPos: new THREE.Vector3(), endPos: new THREE.Vector3(),
      hitCage: false, onHitCage: null,
    });
  }

  {
    const mat = createClocktowerShaderMaterial();
    const mesh = new THREE.Mesh(clocktowerGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    clocktowers.push({
      mesh, mat, active: false, age: 0, fallDur: 0.14, holdDur: 0.30, explodeDur: 0.38,
      startPos: new THREE.Vector3(), endPos: new THREE.Vector3(),
      baseScale: 1.0, landed: false, exploded: false, onLand: null, onExplode: null,
    });
  }

  for (let i = 0; i < 72; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: streakTex,
      color: '#34d399',
      transparent: true,
      opacity: 1,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(boltGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    boltSegs.push({ mesh, mat, active: false, age: 0, life: 0.25 });
  }

  for (let i = 0; i < 48; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
    const mesh = new THREE.Mesh(chunkGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    debris.push({
      mesh, mat, active: false, age: 0, life: 0.6, floorY: 0.08, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s0: 1,
    });
  }

  for (let i = 0; i < 140; i++) {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(quadGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    quads.push({
      mesh,
      mat,
      active: false,
      age: 0,
      life: 0.4,
      floorY: 0.08,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      drag: 1,
      s0: 1,
      s1: 1,
      spin: 0,
      billboard: true,
      flatFloor: false,
      baseRotZ: 0,
      baseAlpha: 1,
    });
  }

  for (let i = 0; i < 8; i++) {
    const mat = createEnergyWeaponMaterial();
    const mesh = new THREE.Mesh(orbGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    orbs.push({
      mesh,
      mat,
      active: false,
      age: 0,
      life: 0.45,
      p0: new THREE.Vector3(),
      p1: new THREE.Vector3(),
      s0: 1,
      s1: 1,
      trailTimer: 0,
      trailColor: '#fb923c',
      onArrive: null,
      arrived: false,
    });
  }

  return {
    sharedGeos,
    slashes,
    barrageLines,
    domes,
    beams,
    vortices,
    rifts,
    weapons,
    clockDials,
    frostSeals,
    lullabySeals,
    halcyonSeals,
    fusionSeals,
    fusionProps,
    halcyonPillars,
    halcyonRain,
    nocturneEclipses,
    nocturneCraters,
    lullabyMirrorCages,
    lullabyCrescentMoons,
    clocktowers,
    arrowGeo: arrowGeoOut,
    bladeGeo: bladeGeoOut,
    boltSegs,
    debris,
    quads,
    orbs,
  };
}
