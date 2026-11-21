import * as THREE from 'three';
import { createCyberCrystalCluster, createCyberMonolithForkFinial } from './CyberProps3D';
import {
  createChamferPanelXYGeometry,
  createChamferSlabGeometry,
  createExtrudedProfileGeometry,
  createLatheProfileGeometry,
  enableShadows,
} from './MeshHelpers3D';
import { createHologramSignTexture } from './ShopCyberPlazaAssets3D';

export interface PlazaCyberKiosksCtx {
  group: THREE.Group;
  ownedTextures: THREE.Texture[];
  animatedCrystals: THREE.Object3D[];
  animatedRings: THREE.Object3D[];
  gunmetalMat: THREE.MeshStandardMaterial;
  slateConcreteMat: THREE.MeshStandardMaterial;
  containerDarkMat: THREE.MeshStandardMaterial;
  containerMidMat: THREE.MeshStandardMaterial;
  towerRibMat: THREE.MeshStandardMaterial;
  brushedSteelMat: THREE.MeshStandardMaterial;
  darkHullMat: THREE.MeshStandardMaterial;
  cyanNeonMat: THREE.MeshStandardMaterial;
  blueNeonMat: THREE.MeshStandardMaterial;
  violetNeonMat: THREE.MeshStandardMaterial;
  magentaNeonMat: THREE.MeshStandardMaterial;
  emeraldNeonMat: THREE.MeshStandardMaterial;
  amberNeonMat: THREE.MeshStandardMaterial;
  makeNeonMat: (
    colorHex: number,
    emissiveIntensity?: number,
    pulseAmp?: number,
    speed?: number,
    phase?: number
  ) => THREE.MeshStandardMaterial;
}

export function buildPlazaCyberKiosks(ctx: PlazaCyberKiosksCtx): void {
  const {
    group,
    ownedTextures,
    animatedCrystals,
    animatedRings,
    gunmetalMat,
    slateConcreteMat,
    containerDarkMat,
    containerMidMat,
    towerRibMat,
    brushedSteelMat,
    darkHullMat,
    cyanNeonMat,
    blueNeonMat,
    violetNeonMat,
    magentaNeonMat,
    emeraldNeonMat,
    amberNeonMat,
    makeNeonMat,
  } = ctx;

  const addHologramSign = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    title: string,
    subtitle: string,
    accentHexStr: string,
    accentMat: THREE.MeshStandardMaterial,
    rotY = 0
  ): void => {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);
    sg.rotation.y = rotY;

    const frame = new THREE.Mesh(
      createChamferPanelXYGeometry(w + 0.24, h + 0.2, 0.14, 0.08, 0.015),
      gunmetalMat
    );
    frame.position.z = -0.02;

    const holoTex = createHologramSignTexture(title, subtitle, accentHexStr);
    if (holoTex) ownedTextures.push(holoTex);
    const screenMat = new THREE.MeshBasicMaterial({
      color: holoTex ? 0xffffff : accentHexStr,
      ...(holoTex ? { map: holoTex } : {}),
      transparent: true,
      opacity: 0.96,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screen.position.z = 0.08;

    const topRail = new THREE.Mesh(createChamferSlabGeometry(w + 0.28, 0.06, 0.18, 0.03, 0.008), accentMat);
    topRail.position.y = h * 0.5 + 0.09;
    const botRail = new THREE.Mesh(createChamferSlabGeometry(w + 0.28, 0.06, 0.18, 0.03, 0.008), accentMat);
    botRail.position.y = -h * 0.5 - 0.15;

    enableShadows(frame);
    sg.add(frame, screen, topRail, botRail);
    parent.add(sg);
  };

  // Full-scale Cyber Vending Machine (w = 1.05, h = 1.88, d = 0.74) with clean non-clipped front display
  const buildCyberVendingMachine = (
    x: number,
    y: number,
    z: number,
    accentMat: THREE.MeshStandardMaterial,
    rotY = 0,
    itemColors: readonly number[] = [0x38bdf8, 0xf472b6, 0x4ade80, 0xfacc15]
  ): THREE.Group => {
    const vg = new THREE.Group();
    vg.position.set(x, y, z);
    vg.rotation.y = rotY;

    const body = new THREE.Mesh(createChamferSlabGeometry(1.05, 1.72, 0.74, 0.1, 0.02), containerDarkMat);
    const hood = new THREE.Mesh(createChamferSlabGeometry(1.14, 0.16, 0.82, 0.1, 0.015), gunmetalMat);
    hood.position.y = 1.72;

    const glassFrame = new THREE.Mesh(
      createChamferSlabGeometry(0.68, 1.02, 0.08, 0.05, 0.01),
      slateConcreteMat
    );
    glassFrame.position.set(-0.1, 0.56, 0.36);

    const sideStrip = new THREE.Mesh(createChamferSlabGeometry(0.08, 1.56, 0.08, 0.02, 0.008), accentMat);
    sideStrip.position.set(0.47, 0.08, 0.36);

    const keypad = new THREE.Mesh(createChamferSlabGeometry(0.2, 0.34, 0.08, 0.03, 0.008), accentMat);
    keypad.position.set(0.32, 0.94, 0.37);

    const tray = new THREE.Mesh(createChamferSlabGeometry(0.64, 0.24, 0.14, 0.04, 0.01), darkHullMat);
    tray.position.set(-0.1, 0.2, 0.38);

    const cellGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 6);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cHex = itemColors[(row * 3 + col) % itemColors.length];
        const cellMat = makeNeonMat(cHex, 1.25, 0, 1, 0);
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(-0.26 + col * 0.16, 0.82 + row * 0.38, 0.42);
        vg.add(cell);
      }
    }

    enableShadows(body);
    enableShadows(hood);
    vg.add(body, hood, glassFrame, sideStrip, keypad, tray);
    return vg;
  };

  // High-Clearance Cyberpunk Container Shell so awnings never clip foreground props
  const buildCyberContainerShell = (
    w: number,
    h: number,
    d: number,
    accentMat: THREE.MeshStandardMaterial
  ): THREE.Group => {
    const cg = new THREE.Group();

    const mainHull = new THREE.Mesh(createChamferSlabGeometry(w, h, d, 0.18, 0.03), containerDarkMat);
    const foundationPlinth = new THREE.Mesh(
      createChamferSlabGeometry(w + 0.16, 0.16, d + 0.16, 0.2, 0.015),
      gunmetalMat
    );
    foundationPlinth.position.y = -0.02;
    enableShadows(foundationPlinth);
    const roofCap = new THREE.Mesh(createChamferSlabGeometry(w + 0.2, 0.22, d + 0.2, 0.18, 0.02), gunmetalMat);
    roofCap.position.y = h;

    // High-mounted slanted awning (+0.68 beyond front face, high clearance above pad)
    const awningPts: [number, number][] = [
      [-d * 0.5, 0],
      [d * 0.5 + 0.68, -0.18],
      [d * 0.5 + 0.68, -0.32],
      [-d * 0.5, -0.14],
    ];
    const awningGeo = createExtrudedProfileGeometry(awningPts, w + 0.14, 0.015);
    awningGeo.rotateY(-Math.PI / 2);
    const awning = new THREE.Mesh(awningGeo, containerMidMat);
    awning.position.set(0, h * 0.86, 0);

    const frontTrim = new THREE.Mesh(
      createChamferSlabGeometry(w + 0.18, 0.08, 0.1, 0.02, 0.008),
      accentMat
    );
    frontTrim.position.set(0, h * 0.86 - 0.34, d * 0.5 + 0.68);

    // Side structural armor ribs on outer left/right walls (cleanly clear of front storefront!)
    const ribGeo = createChamferSlabGeometry(0.14, h * 0.95, d + 0.1, 0.04, 0.01);
    for (const rx of [-w * 0.5 + 0.04, w * 0.5 - 0.04]) {
      const rib = new THREE.Mesh(ribGeo, towerRibMat);
      rib.position.set(rx, -0.01, 0);
      enableShadows(rib);
      cg.add(rib);
    }

    // Glowing Storefront Display Window & Security Door protruding cleanly forward
    const windowPanel = new THREE.Mesh(
      createChamferSlabGeometry(w * 0.48, h * 0.42, 0.12, 0.05, 0.012),
      accentMat
    );
    windowPanel.position.set(w * 0.18, h * 0.3, d * 0.5 + 0.06);

    const doorPanel = new THREE.Mesh(
      createChamferSlabGeometry(w * 0.28, h * 0.72, 0.12, 0.04, 0.012),
      slateConcreteMat
    );
    doorPanel.position.set(-w * 0.24, -0.01, d * 0.5 + 0.06);

    // Rooftop HVAC & Sculpted Antenna Mast Finial
    const hvac = new THREE.Mesh(createChamferSlabGeometry(w * 0.34, 0.38, d * 0.44, 0.06, 0.015), towerRibMat);
    hvac.position.set(-w * 0.2, h + 0.2, -d * 0.12);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.06, 1.05, 6), brushedSteelMat);
    mast.position.set(w * 0.32, h + 0.72, -d * 0.24);
    const beacon = createCyberMonolithForkFinial({
      frameMat: gunmetalMat,
      steelMat: brushedSteelMat,
      coreMat: accentMat,
      scale: 0.45,
    });
    beacon.position.set(w * 0.32, h + 1.22, -d * 0.24);

    enableShadows(mainHull);
    enableShadows(roofCap);
    enableShadows(awning);
    cg.add(mainHull, foundationPlinth, roofCap, awning, frontTrim, windowPanel, doorPanel, hvac, mast, beacon);
    return cg;
  };


  // =========================================================================
  // 3. CYBER KIOSKS: TALLER BUILDINGS, WIDE FRONT DECKS, ZERO PROP CLIPPING
  // =========================================================================

  /** Creates a non-overlapping cyber deck with an inset slate top and glowing outer perimeter skirt. */
  const createShopPadMeshes = (
    width: number,
    depth: number,
    zCenter: number,
    neonMat: THREE.MeshStandardMaterial
  ): [THREE.Mesh, THREE.Mesh] => {
    const padTrim = new THREE.Mesh(
      createChamferSlabGeometry(width + 0.22, 0.08, depth + 0.22, 0.25, 0.008),
      neonMat
    );
    padTrim.position.set(0, 0, zCenter);
    const pad = new THREE.Mesh(
      createChamferSlabGeometry(width, 0.14, depth, 0.22, 0.018),
      slateConcreteMat
    );
    pad.position.set(0, 0.08, zCenter);
    pad.receiveShadow = true;
    return [padTrim, pad];
  };

  // 3a. PICKAXE CYBER-ARMORY KIOSK (x = -11.4, z = -9.6)
  {
    const armory = new THREE.Group();
    armory.position.set(-11.4, 0.18, -9.6);

    const [padTrim, pad] = createShopPadMeshes(5.72, 4.92, 0.25, cyanNeonMat);

    const container = buildCyberContainerShell(4.4, 2.95, 2.15, cyanNeonMat);
    container.position.set(0, 0.22, -0.75);

    addHologramSign(
      armory,
      0,
      3.85,
      0.35,
      2.85,
      0.92,
      'PICKAXE ARMORY',
      'LASER DRILLS & GEAR',
      '#38bdf8',
      blueNeonMat
    );

    // Front Open Deck Props (z = +1.45, cleanly ahead of awning tip z = +1.0)
    const vending = buildCyberVendingMachine(1.65, 0.22, 1.48, blueNeonMat, -0.22, [0x38bdf8, 0x22d3ee, 0xe0f2fe]);
    const workbench = new THREE.Mesh(createChamferSlabGeometry(1.75, 0.92, 0.96, 0.1, 0.016), gunmetalMat);
    workbench.position.set(-0.95, 0.22, 1.52);
    const benchHolo = new THREE.Mesh(createChamferSlabGeometry(1.45, 0.05, 0.72, 0.05, 0.006), cyanNeonMat);
    benchHolo.position.set(-0.95, 1.14, 1.52);

    const pickDisplay = new THREE.Group();
    pickDisplay.position.set(-0.95, 1.72, 1.52);
    pickDisplay.rotation.z = 0.48;
    const pickShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.1, 6), brushedSteelMat);
    const pickHead = new THREE.Mesh(
      createExtrudedProfileGeometry(
        [
          [-0.54, 0.08],
          [0, 0.24],
          [0.54, 0.08],
          [0.34, -0.06],
          [0, 0.06],
          [-0.34, -0.06],
        ],
        0.1,
        0.012
      ),
      cyanNeonMat
    );
    pickHead.position.y = 0.44;
    pickDisplay.add(pickShaft, pickHead);
    animatedCrystals.push(pickDisplay);

    enableShadows(workbench);
    armory.add(pad, padTrim, container, vending, workbench, benchHolo, pickDisplay);
    group.add(armory);
  }

  // 3b. SELL ITEMS CYBER-EXCHANGE KIOSK (x = -10.2, z = 0.8)
  {
    const market = new THREE.Group();
    market.position.set(-10.2, 0.18, 0.8);

    const [padTrim, pad] = createShopPadMeshes(5.52, 4.22, 0.15, emeraldNeonMat);

    const container = buildCyberContainerShell(4.3, 2.8, 1.95, emeraldNeonMat);
    container.position.set(0, 0.22, -0.75);

    addHologramSign(
      market,
      0,
      3.62,
      0.28,
      2.75,
      0.88,
      'CYBER EXCHANGE',
      'SELL ORES & UNITS',
      '#4ade80',
      emeraldNeonMat
    );

    const termLeft = buildCyberVendingMachine(-1.68, 0.22, 1.32, emeraldNeonMat, 0.22, [0x4ade80, 0xfacc15, 0x22d3ee]);
    const crate1 = new THREE.Mesh(createChamferSlabGeometry(1.1, 0.82, 1.05, 0.1, 0.016), containerMidMat);
    crate1.position.set(-0.22, 0.22, 1.38);
    const crate1Glow = new THREE.Mesh(createChamferSlabGeometry(1.14, 0.06, 1.08, 0.1, 0.006), emeraldNeonMat);
    crate1Glow.position.set(-0.22, 1.04, 1.38);

    const creditPod = new THREE.Mesh(createChamferSlabGeometry(0.98, 0.64, 0.98, 0.1, 0.015), gunmetalMat);
    creditPod.position.set(1.48, 0.22, 1.32);
    const creditCrystal = createCyberCrystalCluster({
      frameMat: gunmetalMat,
      crystalMat: emeraldNeonMat,
      accentMat: cyanNeonMat,
      scale: 0.9,
      shardCount: 4,
    });
    creditCrystal.position.set(1.48, 1.16, 1.32);
    animatedCrystals.push(creditCrystal);

    enableShadows(crate1);
    enableShadows(creditPod);
    market.add(pad, padTrim, container, termLeft, crate1, crate1Glow, creditPod, creditCrystal);
    group.add(market);
  }

  // 3c. RELIC FORGE PLASMA FOUNDRY (x = 10.2, z = 0.8)
  {
    const forge = new THREE.Group();
    forge.position.set(10.2, 0.18, 0.8);

    const [padTrim, pad] = createShopPadMeshes(5.42, 4.22, 0.15, amberNeonMat);

    const container = buildCyberContainerShell(3.4, 2.85, 1.9, amberNeonMat);
    container.position.set(-0.75, 0.22, -0.75);

    addHologramSign(
      forge,
      -0.75,
      3.65,
      0.26,
      2.65,
      0.86,
      'PLASMA FORGE',
      'CRAFT CYBER RELICS',
      '#f97316',
      amberNeonMat
    );

    // Tall Industrial Plasma Energy Furnace cleanly beside container on the right
    const furnace = new THREE.Group();
    furnace.position.set(1.68, 0.22, -0.25);

    const furnaceBase = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.86, 0.0],
          [0.8, 0.56],
          [0.6, 0.72],
        ],
        8
      ),
      gunmetalMat
    );
    const furnaceTop = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.6, 1.68],
          [0.82, 1.92],
          [0.72, 2.55],
          [0.42, 3.0],
        ],
        8
      ),
      containerDarkMat
    );
    const plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), amberNeonMat);
    plasmaCore.position.y = 1.2;

    const plasmaRingGeo = new THREE.TorusGeometry(0.56, 0.05, 6, 18);
    plasmaRingGeo.rotateX(Math.PI / 2);
    const plasmaRing1 = new THREE.Mesh(plasmaRingGeo, amberNeonMat);
    plasmaRing1.position.y = 0.92;
    const plasmaRing2 = new THREE.Mesh(plasmaRingGeo, amberNeonMat);
    plasmaRing2.position.y = 1.48;
    animatedRings.push(plasmaRing1, plasmaRing2);

    for (let s = 0; s < 3; s++) {
      const ang = (s / 3) * Math.PI * 2 + 0.4;
      const strut = new THREE.Mesh(createChamferSlabGeometry(0.16, 1.25, 0.18, 0.03, 0.01), towerRibMat);
      strut.position.set(Math.cos(ang) * 0.62, 0.62, Math.sin(ang) * 0.62);
      enableShadows(strut);
      furnace.add(strut);
    }

    enableShadows(furnaceBase);
    enableShadows(furnaceTop);
    furnace.add(furnaceBase, furnaceTop, plasmaCore, plasmaRing1, plasmaRing2);

    // Laser-Anvil Calibration Table + Plasma Conduit Pipe cleanly in front
    const laserAnvil = new THREE.Mesh(createChamferSlabGeometry(1.38, 0.98, 0.92, 0.1, 0.016), gunmetalMat);
    laserAnvil.position.set(-0.75, 0.22, 1.35);
    const anvilPad = new THREE.Mesh(createChamferSlabGeometry(1.06, 0.06, 0.68, 0.05, 0.008), amberNeonMat);
    anvilPad.position.set(-0.75, 1.2, 1.35);

    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.25, 0.85, 0.25),
      new THREE.Vector3(0.55, 0.45, 0.92),
      new THREE.Vector3(-0.2, 0.72, 1.32),
    ]);
    const plasmaPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 10, 0.085, 6, false), amberNeonMat);

    enableShadows(laserAnvil);
    forge.add(pad, padTrim, container, furnace, laserAnvil, anvilPad, plasmaPipe);
    group.add(forge);
  }

  // 3d. GEM & ELIXIR CYBER-MART EMPORIUM (x = 11.4, z = -9.6)
  {
    const emporium = new THREE.Group();
    emporium.position.set(11.4, 0.18, -9.6);

    const [padTrim, pad] = createShopPadMeshes(5.72, 4.92, 0.25, magentaNeonMat);

    const lowerBay = buildCyberContainerShell(4.4, 2.85, 2.1, magentaNeonMat);
    lowerBay.position.set(0, 0.22, -0.75);

    const upperBay = new THREE.Mesh(createChamferSlabGeometry(2.95, 1.85, 1.95, 0.18, 0.025), containerMidMat);
    upperBay.position.set(0, 3.07, -0.75);
    const upperWindow = new THREE.Mesh(createChamferSlabGeometry(2.35, 0.82, 0.12, 0.06, 0.01), violetNeonMat);
    upperWindow.position.set(0, 3.55, 0.24);
    const upperCrown = new THREE.Mesh(createChamferSlabGeometry(3.1, 0.2, 2.1, 0.18, 0.015), gunmetalMat);
    upperCrown.position.set(0, 4.92, -0.75);

    addHologramSign(
      emporium,
      0,
      5.76,
      0.34,
      2.9,
      0.92,
      'CYBER GEM MART',
      'ELIXIRS & BOOSTS',
      '#f472b6',
      magentaNeonMat
    );

    const vend1 = buildCyberVendingMachine(-1.72, 0.22, 1.48, magentaNeonMat, 0.18, [0xf97316, 0xfacc15, 0x22c55e]);
    const vend2 = buildCyberVendingMachine(1.75, 0.22, 1.45, cyanNeonMat, -0.22, [0x06b6d4, 0xec4899, 0xa855f7]);

    const barCounter = new THREE.Mesh(createChamferSlabGeometry(1.95, 0.82, 0.78, 0.08, 0.014), gunmetalMat);
    barCounter.position.set(0.02, 0.22, 1.56);

    const bottleColors = [0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0xec4899];
    const flaskGeo = createLatheProfileGeometry(
      [
        [0.11, 0.0],
        [0.15, 0.14],
        [0.12, 0.28],
        [0.06, 0.4],
        [0.08, 0.48],
      ],
      8
    );
    for (let i = 0; i < bottleColors.length; i++) {
      const bottle = new THREE.Mesh(flaskGeo, makeNeonMat(bottleColors[i], 1.2, 0, 1, 0));
      bottle.position.set(-0.62 + i * 0.32, 1.04, 1.56);
      emporium.add(bottle);
    }

    enableShadows(upperBay);
    enableShadows(upperCrown);
    enableShadows(barCounter);
    emporium.add(pad, padTrim, lowerBay, upperBay, upperWindow, upperCrown, vend1, vend2, barCounter);
    group.add(emporium);
  }

}
