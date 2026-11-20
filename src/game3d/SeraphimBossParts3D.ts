import * as THREE from 'three';
import {
  createCurvedFeatherBladeGeometry,
  createCurvedFeatherEmberGeometry,
  createLatheProfileGeometry,
  createSculptedPlateGeometry,
  createTaperedTubeGeometry,
  enableShadows,
  mirrorPoints2D,
} from './SeraphimBossGeometry3D';

export interface SeraphimBossMaterials {
  armorDarkMat: THREE.MeshStandardMaterial;
  armorCharredMat: THREE.MeshStandardMaterial;
  gunmetalMat: THREE.MeshStandardMaterial;
  cableMat: THREE.MeshStandardMaterial;
  singularityMat: THREE.MeshBasicMaterial;
  magmaGlowMat: THREE.MeshStandardMaterial;
  coreCrimsonMat: THREE.MeshStandardMaterial;
}

export interface WingAnimSpec {
  pivot: THREE.Group;
  side: -1 | 1;
  baseYaw: number;
  baseRoll: number;
  phaseOffset: number;
  tier: number;
}

export function buildSeraphimHelmet(hoverRoot: THREE.Group, mats: SeraphimBossMaterials): THREE.Group {
  const { armorDarkMat, armorCharredMat, gunmetalMat, cableMat, singularityMat, magmaGlowMat, coreCrimsonMat } = mats;
  // =========================================================================
  // 2. SCULPTED MECHA HELMET (V-FIN BROW, CHEEK FANGS, SHARP CHIN, CURVED HORNS)
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.18, 0.08);
  hoverRoot.add(headGroup);

  // Multi-ribbed Servo Neck Column (LatheGeometry) + Twin Neck Cables (TubeGeometry)
  const neckCol = new THREE.Mesh(
    createLatheProfileGeometry(
      [
        [0.22, -0.36],
        [0.18, -0.24],
        [0.21, -0.18],
        [0.16, -0.08],
        [0.19, 0.0],
      ],
      8
    ),
    cableMat
  );
  enableShadows(neckCol);
  headGroup.add(neckCol);

  for (const sx of [-1, 1] as const) {
    const neckTube = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(sx * 0.2, -0.34, -0.04),
          new THREE.Vector3(sx * 0.24, -0.18, 0.06),
          new THREE.Vector3(sx * 0.18, -0.02, 0.02),
        ],
        6,
        0.036,
        0.024,
        5
      ),
      gunmetalMat
    );
    headGroup.add(neckTube);
  }

  // Main Helm Cranium Shell (Side-swept armored dome profile rotated onto sagittal plane)
  const craniumSidePts: [number, number][] = [
    [-0.34, -0.16],
    [-0.44, 0.14], // Aggressive backward occipital tail fin
    [-0.16, 0.34],
    [0.18, 0.32],
    [0.34, 0.14], // Slanted brow overhang
    [0.24, -0.14],
    [-0.08, -0.22],
  ];
  const craniumGeo = createSculptedPlateGeometry(craniumSidePts, 0.44, 0.032, {
    foldZ: 0.06,
    archSpan: 0.45,
  });
  craniumGeo.rotateY(Math.PI / 2);
  const helmSkull = new THREE.Mesh(craniumGeo, armorDarkMat);
  helmSkull.position.set(0, 0.04, -0.04);
  enableShadows(helmSkull);
  headGroup.add(helmSkull);

  // Layered Upper Crown Cowl Plate
  const crownCapPts: [number, number][] = [
    [-0.26, -0.08],
    [-0.16, 0.16],
    [0, 0.24],
    [0.16, 0.16],
    [0.26, -0.08],
    [0, -0.02],
  ];
  const crownCap = new THREE.Mesh(
    createSculptedPlateGeometry(crownCapPts, 0.56, 0.02, {
      foldZ: 0.08,
      archX: 0.1,
      archSpan: 0.28,
    }),
    armorCharredMat
  );
  crownCap.position.set(0, 0.24, -0.04);
  crownCap.rotation.x = -0.32;
  enableShadows(crownCap);
  headGroup.add(crownCap);

  // Central Dorsal Shark-Fin Sensor Crest
  const dorsalCrestSidePts: [number, number][] = [
    [-0.42, 0.04],
    [-0.5, 0.34],
    [-0.08, 0.44],
    [0.34, 0.24],
    [0.3, 0.08],
  ];
  const dorsalCrestGeo = createSculptedPlateGeometry(dorsalCrestSidePts, 0.075, 0.012);
  dorsalCrestGeo.rotateY(Math.PI / 2);
  const crestFin = new THREE.Mesh(dorsalCrestGeo, gunmetalMat);
  crestFin.position.set(0, 0.18, -0.02);
  enableShadows(crestFin);
  headGroup.add(crestFin);

  // Pelat Dahi Menyudut ke Bawah (Sharp Downward V-Brow Cowl + Twin Swept V-Fin Blades)
  const vBrowPts: [number, number][] = [
    [-0.31, 0.2],
    [0, 0.1],
    [0.31, 0.2],
    [0.22, 0.02],
    [0, -0.1], // Sharp aggressive center brow dip between optics
    [-0.22, 0.02],
  ];
  const browCowl = new THREE.Mesh(
    createSculptedPlateGeometry(vBrowPts, 0.18, 0.018, {
      foldZ: 0.09,
      archX: 0.11,
      archSpan: 0.32,
    }),
    armorCharredMat
  );
  browCowl.position.set(0, 0.15, 0.26);
  browCowl.rotation.x = 0.24;
  enableShadows(browCowl);
  headGroup.add(browCowl);

  const rightVFinPts: [number, number][] = [
    [0.0, 0.0],
    [0.08, 0.05],
    [0.44, 0.32],
    [0.52, 0.36],
    [0.16, 0.04],
    [0.03, -0.04],
  ];
  for (const sx of [-1, 1] as const) {
    const vFinPts = sx > 0 ? rightVFinPts : mirrorPoints2D(rightVFinPts);
    const vFin = new THREE.Mesh(
      createSculptedPlateGeometry(vFinPts, 0.055, 0.008, {
        archX: 0.12,
        archSpan: 0.52,
      }),
      gunmetalMat
    );
    vFin.position.set(0, 0.2, 0.31);
    vFin.rotation.x = -0.18;
    enableShadows(vFin);
    headGroup.add(vFin);
  }

  // Glowing Forehead Crest Core
  const browGem = new THREE.Mesh(
    createSculptedPlateGeometry(
      [
        [0, 0.075],
        [0.035, 0.0],
        [0, -0.075],
        [-0.035, 0.0],
      ],
      0.045,
      0.006
    ),
    coreCrimsonMat
  );
  browGem.position.set(0, 0.22, 0.34);
  browGem.rotation.x = 0.18;
  headGroup.add(browGem);

  // Recessed Dark Visor Cavity + Glowing Red-Orange V-Slit Visor Optics (Zero BoxGeometry!)
  const visorRecessPts: [number, number][] = [
    [-0.24, 0.07],
    [0, -0.015],
    [0.24, 0.07],
    [0.21, -0.025],
    [0, -0.09],
    [-0.21, -0.025],
  ];
  const visorRecess = new THREE.Mesh(
    createSculptedPlateGeometry(visorRecessPts, 0.12, 0.008, {
      foldZ: 0.06,
      archX: 0.09,
      archSpan: 0.25,
    }),
    singularityMat
  );
  visorRecess.position.set(0, 0.055, 0.27);
  headGroup.add(visorRecess);

  const visorSlitPts: [number, number][] = [
    [-0.22, 0.052],
    [0, -0.026],
    [0.22, 0.052],
    [0.19, 0.014],
    [0, -0.058],
    [-0.19, 0.014],
  ];
  const visorSlit = new THREE.Mesh(
    createSculptedPlateGeometry(visorSlitPts, 0.05, 0.006, {
      foldZ: 0.07,
      archX: 0.08,
      archSpan: 0.22,
    }),
    magmaGlowMat
  );
  visorSlit.position.set(0, 0.052, 0.32);
  headGroup.add(visorSlit);

  // Pelindung Pipi Meruncing (Pointed Tapered Cheek Guards)
  const rightCheekPts: [number, number][] = [
    [0.12, 0.1],
    [0.29, 0.12],
    [0.32, -0.04],
    [0.2, -0.28], // Sharp downward cheek fang point
    [0.09, -0.14],
  ];
  for (const sx of [-1, 1] as const) {
    const cheekPts = sx > 0 ? rightCheekPts : mirrorPoints2D(rightCheekPts);
    const cheekGuard = new THREE.Mesh(
      createSculptedPlateGeometry(cheekPts, 0.24, 0.018, {
        archX: 0.08,
        archSpan: 0.34,
      }),
      gunmetalMat
    );
    cheekGuard.position.set(sx * 0.02, -0.01, 0.18);
    cheekGuard.rotation.set(0.12, sx * -0.26, 0);
    enableShadows(cheekGuard);
    headGroup.add(cheekGuard);
  }

  // Pelindung Dagu Tajam (Sharp Faceted Faceplate + Razor Chin Blade)
  const faceMaskPts: [number, number][] = [
    [-0.17, 0.06],
    [0, -0.01],
    [0.17, 0.06],
    [0.13, -0.16],
    [0, -0.28], // Sharp chin point
    [-0.13, -0.16],
  ];
  const facePlate = new THREE.Mesh(
    createSculptedPlateGeometry(faceMaskPts, 0.18, 0.016, {
      foldZ: 0.09,
      archSpan: 0.18,
    }),
    armorDarkMat
  );
  facePlate.position.set(0, -0.06, 0.23);
  facePlate.rotation.x = 0.16;
  enableShadows(facePlate);

  const chinSpikePts: [number, number][] = [
    [-0.085, 0.04],
    [0, 0.08],
    [0.085, 0.04],
    [0.048, -0.14],
    [0, -0.26], // Razor lower chin guard spur
    [-0.048, -0.14],
  ];
  const chinGuard = new THREE.Mesh(
    createSculptedPlateGeometry(chinSpikePts, 0.14, 0.014, {
      foldZ: 0.08,
      archSpan: 0.09,
    }),
    gunmetalMat
  );
  chinGuard.position.set(0, -0.18, 0.28);
  chinGuard.rotation.x = -0.22;
  enableShadows(chinGuard);
  headGroup.add(facePlate, chinGuard);

  // Pair of Curved Mechanical Horns (Tapered TubeGeometry sweeping to razor points + Temple Sockets)
  for (const sx of [-1, 1] as const) {
    const hornSocket = new THREE.Mesh(
      createLatheProfileGeometry(
        [
          [0.09, -0.06],
          [0.11, 0.0],
          [0.08, 0.07],
        ],
        6
      ),
      gunmetalMat
    );
    hornSocket.position.set(sx * 0.25, 0.12, -0.02);
    hornSocket.rotation.z = sx * -Math.PI * 0.42;
    enableShadows(hornSocket);

    const hornGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 5, 8), coreCrimsonMat);
    hornGlowRing.position.set(sx * 0.28, 0.14, -0.02);
    hornGlowRing.rotation.y = Math.PI / 2;
    hornGlowRing.rotation.x = sx * -0.45;

    const hornGeo = createTaperedTubeGeometry(
      [
        new THREE.Vector3(sx * 0.24, 0.13, -0.02),
        new THREE.Vector3(sx * 0.46, 0.26, -0.08),
        new THREE.Vector3(sx * 0.56, 0.56, -0.18),
        new THREE.Vector3(sx * 0.44, 0.86, -0.14),
        new THREE.Vector3(sx * 0.25, 0.98, 0.02),
      ],
      14,
      0.068,
      0.004,
      6,
      0.82
    );
    const hornMesh = new THREE.Mesh(hornGeo, armorCharredMat);
    enableShadows(hornMesh);
    headGroup.add(hornSocket, hornGlowRing, hornMesh);
  }

  return headGroup;
}

export function buildSeraphimWings(
  hoverRoot: THREE.Group,
  mats: SeraphimBossMaterials
): { wingSpecs: WingAnimSpec[]; wingPivots: THREE.Group[] } {
  const { armorDarkMat, armorCharredMat, gunmetalMat, magmaGlowMat, coreCrimsonMat } = mats;
  // =========================================================================
  // 5. SIX LAYERED CURVED FEATHER-BLADE WINGS (3 TIERED PAIRS WITH MECHANICAL JOINTS)
  // =========================================================================
  const wingPivots: THREE.Group[] = [];
  const wingSpecs: WingAnimSpec[] = [];

  const wingTiers: {
    y: number;
    z: number;
    roll: number;
    yaw: number;
    span: number;
    archY: number;
    sweepZ: number;
    bladeCount: number;
    bladeLen: number;
  }[] = [
    // Upper Mega Seraphim Wing
    { y: 3.68, z: -0.36, roll: 0.34, yaw: 0.22, span: 3.35, archY: 0.85, sweepZ: -0.78, bladeCount: 6, bladeLen: 1.56 },
    // Middle Pinion Wing
    { y: 3.18, z: -0.42, roll: -0.02, yaw: 0.28, span: 2.75, archY: 0.52, sweepZ: -0.68, bladeCount: 5, bladeLen: 1.32 },
    // Lower Raptor Wing
    { y: 2.68, z: -0.46, roll: -0.34, yaw: 0.34, span: 2.15, archY: 0.28, sweepZ: -0.58, bladeCount: 4, bladeLen: 1.08 },
  ];

  const yokePts: [number, number][] = [
    [-0.22, -0.18],
    [0.14, -0.22],
    [0.34, 0.0],
    [0.14, 0.22],
    [-0.22, 0.18],
  ];

  for (let tierIdx = 0; tierIdx < wingTiers.length; tierIdx++) {
    const wt = wingTiers[tierIdx];

    for (const sx of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(sx * 0.48, wt.y, wt.z);
      // Note: negative yaw with sx sweeps +X/-X wings cleanly backward (-Z)!
      wingPivot.rotation.set(0, sx * wt.yaw, sx * wt.roll);
      hoverRoot.add(wingPivot);
      wingPivots.push(wingPivot);

      // 5a. Mechanical Rotary Joint Hub + Yoke Armor Clamp + Piston Strut at Wing Base
      const hubHousing = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.12, -0.12],
            [0.21, -0.06],
            [0.21, 0.06],
            [0.12, 0.12],
          ],
          8
        ),
        gunmetalMat
      );
      hubHousing.rotation.x = Math.PI / 2;

      const hubGlowCore = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.01, -0.13],
            [0.09, -0.08],
            [0.09, 0.08],
            [0.01, 0.13],
          ],
          6
        ),
        magmaGlowMat
      );
      hubGlowCore.rotation.x = Math.PI / 2;

      const yoke = new THREE.Mesh(
        createSculptedPlateGeometry(sx > 0 ? yokePts : mirrorPoints2D(yokePts), 0.22, 0.018),
        armorCharredMat
      );
      yoke.position.set(sx * 0.12, 0, 0);

      enableShadows(hubHousing);
      enableShadows(yoke);
      wingPivot.add(hubHousing, hubGlowCore, yoke);

      // 5b. Curved Primary Wing Arm Spine (TubeGeometry) + Elbow Shroud + Energy Rail
      const spinePts = [
        new THREE.Vector3(sx * 0.08, 0.0, 0.0),
        new THREE.Vector3(sx * wt.span * 0.34, wt.archY * 0.92, wt.sweepZ * 0.2),
        new THREE.Vector3(sx * wt.span * 0.68, wt.archY * 0.72, wt.sweepZ * 0.56),
        new THREE.Vector3(sx * wt.span, wt.archY * 0.16, wt.sweepZ),
      ];
      const wingCurve = new THREE.CatmullRomCurve3(spinePts);

      const wingArmTube = new THREE.Mesh(
        createTaperedTubeGeometry(spinePts, 14, 0.082, 0.018, 6, 0.85),
        armorCharredMat
      );
      enableShadows(wingArmTube);
      wingPivot.add(wingArmTube);

      // Glowing magma conduit tucked along the curved wing spine
      const emberConduitPts = spinePts.map(
        (p, idx) => new THREE.Vector3(p.x, p.y - 0.055 + idx * 0.008, p.z + 0.03)
      );
      const wingEmberTube = new THREE.Mesh(
        createTaperedTubeGeometry(emberConduitPts, 12, 0.028, 0.009, 5, 0.9),
        coreCrimsonMat
      );
      wingPivot.add(wingEmberTube);

      // Mid-wing Mechanical Elbow Knuckle Joint
      const elbowPt = wingCurve.getPointAt(0.36);
      const wingElbowNode = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.06, -0.09],
            [0.13, 0.0],
            [0.06, 0.09],
          ],
          6
        ),
        gunmetalMat
      );
      wingElbowNode.position.copy(elbowPt);
      wingElbowNode.rotation.x = Math.PI / 2;
      enableShadows(wingElbowNode);

      // Hydraulic Strut connecting root hub to elbow knuckle
      const strutPts = [
        new THREE.Vector3(sx * 0.1, -0.14, 0.04),
        new THREE.Vector3(elbowPt.x * 0.92, elbowPt.y - 0.09, elbowPt.z + 0.04),
      ];
      const wingStrut = new THREE.Mesh(
        createTaperedTubeGeometry(strutPts, 4, 0.028, 0.022, 5),
        gunmetalMat
      );
      enableShadows(wingStrut);
      wingPivot.add(wingElbowNode, wingStrut);

      // 5c. Layered Curved & Tapered Metal Feather Blades + Glowing Red-Orange Ember Edges
      for (let b = 0; b < wt.bladeCount; b++) {
        const u = 0.2 + (b / Math.max(1, wt.bladeCount - 1)) * 0.74;
        const anchor = wingCurve.getPointAt(u);
        const tangent = wingCurve.getTangentAt(u);
        const frac = (b + 0.4) / wt.bladeCount;

        const bLen = wt.bladeLen * (0.76 + Math.sin(frac * Math.PI * 0.82) * 0.42);
        const rootW = 0.25 + (1 - frac) * 0.09;
        const curveBow = bLen * (0.15 + (1 - frac) * 0.06);

        const bladeGeo = createCurvedFeatherBladeGeometry(bLen, rootW, curveBow, 0.046, 0.01, sx);
        const emberGeo = createCurvedFeatherEmberGeometry(bLen, rootW, curveBow, 0.052, sx);

        const bladeGroup = new THREE.Group();
        bladeGroup.position.copy(anchor);
        bladeGroup.position.z += (b % 2 === 0 ? 1 : -1) * 0.024;
        // Fan feather blades gracefully downward & outward from the arched wing curve
        const fanAngle = -0.96 + frac * 0.76 + Math.atan2(tangent.y, Math.abs(tangent.x)) * 0.35;
        bladeGroup.rotation.set(0.06 * (b % 2 === 0 ? 1 : -1), sx * 0.08, sx * fanAngle);

        const bladeMesh = new THREE.Mesh(bladeGeo, b % 2 === 0 ? armorDarkMat : gunmetalMat);
        const emberMesh = new THREE.Mesh(emberGeo, b % 2 === 0 ? magmaGlowMat : coreCrimsonMat);
        enableShadows(bladeMesh);

        bladeGroup.add(bladeMesh, emberMesh);
        wingPivot.add(bladeGroup);
      }

      // Secondary Overlapping Shorter Covert Armor Feathers along Upper Wing Ridge
      const covertCount = wt.bladeCount - 1;
      for (let c = 0; c < covertCount; c++) {
        const u = 0.16 + (c / Math.max(1, covertCount - 1)) * 0.56;
        const anchor = wingCurve.getPointAt(u);
        const covLen = wt.bladeLen * 0.48;
        const covGeo = createCurvedFeatherBladeGeometry(covLen, 0.19, covLen * 0.14, 0.038, 0.009, sx);

        const covGroup = new THREE.Group();
        covGroup.position.set(anchor.x, anchor.y + 0.04, anchor.z + 0.06);
        covGroup.rotation.set(0.08, sx * -0.05, sx * (-0.72 + (c / Math.max(1, covertCount)) * 0.48));

        const covMesh = new THREE.Mesh(covGeo, armorCharredMat);
        enableShadows(covMesh);
        covGroup.add(covMesh);
        wingPivot.add(covGroup);
      }

      wingSpecs.push({
        pivot: wingPivot,
        side: sx,
        tier: tierIdx,
        baseYaw: sx * wt.yaw,
        baseRoll: sx * wt.roll,
        phaseOffset: tierIdx * 0.65,
      });
    }
  }

  return { wingSpecs, wingPivots };
}
