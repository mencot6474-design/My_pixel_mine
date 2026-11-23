import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';
export * from './MeshFxFusionBackShaders3D';

export type FusionChibiVariant =
  | 'glitch-cheshire'
  | 'thorn-maiden'
  | 'monochrome-saint'
  | 'prism-seraph'
  | 'aether-monarch';

const FUSION_NOISE_GLSL = `
  float fHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }
  float fVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = fHash21(i);
    float b = fHash21(i + vec2(1.0, 0.0));
    float c = fHash21(i + vec2(0.0, 1.0));
    float d = fHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`;

function buildFusionFloorSealMaterial(
  colorHex: string,
  coreColorHex: string,
  fragmentMain: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color(colorHex) },
      uCoreColor: { value: new THREE.Color(coreColorHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${FUSION_NOISE_GLSL}
      ${fragmentMain}
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

function buildFusionPropMaterial(
  colorHex: string,
  coreColorHex: string,
  fragmentMain: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uSeed: { value: 0.0 },
      uColor: { value: new THREE.Color(colorHex) },
      uCoreColor: { value: new THREE.Color(coreColorHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${FUSION_NOISE_GLSL}
      ${fragmentMain}
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** 1. GLITCH CHESHIRE: Flat Cyber-Matrix & Neon Cheshire Grin Floor Seal shader. */
export function createCheshireGlitchSealShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionFloorSealMaterial('#22d3ee', '#d946ef', `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float jitterTick = floor(uTime * 18.0 + uProgress * 9.0);
      float rowBand = floor(p.y * 16.0);
      float glitchJump = (fHash21(vec2(rowBand, jitterTick)) - 0.5) * 0.14 * step(0.76, fHash21(vec2(jitterTick, rowBand * 0.7)));
      vec2 gp = vec2(p.x + glitchJump, p.y);
      float r = length(gp);
      if (r > 1.0) discard;
      float ang = atan(gp.y, gp.x);

      // Quantized hex/circuit square lattice
      vec2 grid = abs(fract(gp * 6.5) - 0.5);
      float hexCircuit = smoothstep(0.06, 0.012, min(grid.x, grid.y)) * smoothstep(0.92, 0.4, r);

      // Dual chromatic dashed rings
      float ringOuter = smoothstep(0.024, 0.0, abs(r - 0.90)) * step(0.22, fract(ang * 2.546 + uTime * 1.4));
      float ringCyan = smoothstep(0.022, 0.0, abs(length(gp + vec2(0.02, 0.0)) - 0.74));
      float ringMag = smoothstep(0.022, 0.0, abs(length(gp - vec2(0.02, 0.0)) - 0.74));

      // Stylised Cheshire crescent grin + twin glowing eyes inside center core
      float grinArc = smoothstep(0.036, 0.008, abs(length(gp - vec2(0.0, 0.14)) - 0.42)) * smoothstep(-0.08, -0.34, gp.y);
      float grinTeeth = smoothstep(0.72, 0.94, cos(gp.x * 36.0)) * grinArc;
      float eyeL = smoothstep(0.075, 0.03, length((gp - vec2(-0.17, 0.18)) * vec2(1.0, 1.55)));
      float eyeR = smoothstep(0.075, 0.03, length((gp - vec2(0.17, 0.18)) * vec2(1.0, 1.55)));

      float scanPulse = smoothstep(0.10, 0.0, abs(r - fract(uProgress * 1.6) * 0.96));
      float darkPlate = smoothstep(0.96, 0.72, r) * 0.68;

      float mask = clamp(hexCircuit * 0.55 + ringOuter + ringCyan + ringMag + grinArc + eyeL + eyeR + scanPulse, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.90, r);
      float alpha = clamp(max(mask, darkPlate) * 1.15 * edge * uOpacity, 0.0, 0.98);
      if (alpha < 0.015) discard;

      vec3 col = vec3(0.02, 0.03, 0.08);
      col += uColor * (ringCyan * 1.4 + hexCircuit * 0.8 + eyeL * 1.6 + eyeR * 1.6 + grinTeeth * 1.5);
      col += uCoreColor * (ringMag * 1.4 + ringOuter * 1.35 + grinArc * 1.25 + scanPulse * 1.1);
      col += vec3(1.0) * (grinTeeth * 0.8 + (eyeL + eyeR) * 0.45);
      gl_FragColor = vec4(col, alpha);
    }
  `);
}

/** 2. GLITCH CHESHIRE: Cyber Holo Error-Card / Claw Prism shader. */
export function createCheshireGlitchCardShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionPropMaterial('#22d3ee', '#d946ef', `
    void main() {
      vec3 N = normalize(vNormalView);
      vec3 V = normalize(vViewPos);
      float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.75);
      float scan = step(0.45, fract(vLocalPos.y * 12.0 - uTime * 9.0 + uSeed));
      float stripe = smoothstep(0.38, 0.62, sin((vLocalPos.x + vLocalPos.y) * 16.0 + uTime * 6.0));
      float frame = step(0.76, max(abs(vUv.x - 0.5) * 2.0, abs(vUv.y - 0.5) * 2.0));

      vec3 darkInk = vec3(0.03, 0.02, 0.08);
      vec3 neonMix = mix(uColor * 1.45, uCoreColor * 1.55, stripe);
      vec3 col = mix(darkInk, neonMix, clamp(fresnel * 0.85 + scan * 0.35 + frame * 0.65, 0.0, 1.0));
      col += vec3(1.0) * pow(fresnel, 3.0) * 0.95;
      gl_FragColor = vec4(col, clamp(uOpacity * 0.98, 0.0, 0.98));
    }
  `);
}

/** 3. THORN MAIDEN: Crimson Velvet Stained-Glass Rose Mandala Floor Seal shader. */
export function createThornRoseMandalaShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionFloorSealMaterial('#f43f5e', '#fb7185', `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;
      float ang = atan(p.y, p.x);

      // Rotating 8-petal outer rose + counter-rotating 6-petal inner rose
      float aOuter = ang + uTime * 0.45;
      float aInner = ang - uTime * 0.72;
      float petalOuter = 0.68 + 0.16 * cos(aOuter * 8.0) - 0.04 * abs(sin(aOuter * 16.0));
      float petalInner = 0.40 + 0.11 * cos(aInner * 6.0);

      float outlineOuter = smoothstep(0.028, 0.0, abs(r - petalOuter));
      float outlineInner = smoothstep(0.024, 0.0, abs(r - petalInner));

      // Sharp bramble thorns pointing out along the rim
      float thornWave = max(0.0, 1.0 - abs(fract((ang + uTime * 0.3) * 2.546) - 0.5) * 4.5);
      float thornRim = smoothstep(0.035, 0.0, abs(r - (0.85 + thornWave * 0.12)));

      // Floral crimson vein spirals inside petals
      float vein = smoothstep(0.84, 0.98, cos(ang * 8.0 + r * 9.0 + uTime * 1.4)) * smoothstep(0.76, 0.18, r);
      float velvetBody = smoothstep(0.92, 0.15, r) * 0.72;

      float mask = clamp(outlineOuter + outlineInner + thornRim + vein * 0.85, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.90, r);
      float alpha = clamp(max(mask, velvetBody) * 1.15 * edge * uOpacity, 0.0, 0.98);
      if (alpha < 0.015) discard;

      vec3 darkWine = vec3(0.09, 0.01, 0.04);
      vec3 col = darkWine + uColor * (velvetBody * 0.45 + vein * 1.25 + thornRim * 1.45);
      col += uCoreColor * (outlineOuter * 1.55 + outlineInner * 1.65);
      col += vec3(1.0, 0.92, 0.94) * (outlineInner * 0.45 + smoothstep(0.12, 0.0, r) * 0.9);
      gl_FragColor = vec4(col, alpha);
    }
  `);
}

/** 4. THORN MAIDEN: Spiral Crimson Bramble Thorn Lance shader. */
export function createThornVineLanceShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionPropMaterial('#f43f5e', '#fb7185', `
    void main() {
      vec3 N = normalize(vNormalView);
      vec3 V = normalize(vViewPos);
      float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.7);
      float ang = atan(vLocalPos.z, vLocalPos.x);
      float spiral = smoothstep(0.45, 0.92, sin(vLocalPos.y * 8.5 + ang * 3.0 - uTime * 7.0) * 0.5 + 0.5);
      float tipGlow = smoothstep(0.4, 1.5, vLocalPos.y);

      vec3 darkBark = vec3(0.06, 0.01, 0.03);
      vec3 roseGlow = mix(uColor * 1.35, uCoreColor * 1.65, clamp(tipGlow + fresnel * 0.65, 0.0, 1.0));
      vec3 col = mix(darkBark, roseGlow, clamp(spiral * 0.68 + fresnel * 0.85 + tipGlow * 0.45, 0.0, 1.0));
      col += vec3(1.0, 0.88, 0.92) * pow(fresnel, 3.0) * 0.85;
      gl_FragColor = vec4(col, clamp(uOpacity * 0.98, 0.0, 0.98));
    }
  `);
}

/** 5. MONOCHROME SAINT: Stark Sumi-e Ink & Sanctuary Cross Floor Seal shader. */
export function createMonochromeSanctuarySealShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionFloorSealMaterial('#f8fafc', '#18181b', `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;
      float ang = atan(p.y, p.x);

      // Calligraphic brush outer ring with ink jitter
      float brushNoise = fVnoise(vec2(ang * 9.0, uTime * 0.5));
      float brushRing = smoothstep(0.042, 0.008, abs(r - (0.85 + (brushNoise - 0.5) * 0.06)));
      float innerHalo = smoothstep(0.022, 0.0, abs(r - 0.54));

      // Sharp 4-point Cathedral Cross reticle
      float cAng = ang + 0.785398 * 0.0 + uProgress * 0.35;
      vec2 rp = vec2(cos(cAng) * p.x + sin(cAng) * p.y, -sin(cAng) * p.x + cos(cAng) * p.y);
      float crossH = smoothstep(0.032, 0.006, abs(rp.y)) * smoothstep(0.94, 0.15, abs(rp.x));
      float crossV = smoothstep(0.032, 0.006, abs(rp.x)) * smoothstep(0.94, 0.15, abs(rp.y));
      float crossMask = max(crossH, crossV);

      // Manga halftone ring pattern inside mid annulus
      vec2 dots = fract(p * 14.0) - 0.5;
      float halftone = smoothstep(0.32, 0.16, length(dots)) * smoothstep(0.55, 0.60, r) * smoothstep(0.84, 0.78, r);
      float inkBacking = smoothstep(0.96, 0.72, r) * 0.76;

      float whiteLine = clamp(brushRing + innerHalo + crossMask, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.90, r);
      float alpha = clamp(max(whiteLine, inkBacking) * 1.16 * edge * uOpacity, 0.0, 0.99);
      if (alpha < 0.015) discard;

      vec3 col = mix(vec3(0.02, 0.02, 0.035), vec3(0.32, 0.34, 0.40), halftone * 0.65);
      col = mix(col, uColor * 1.45, whiteLine);
      col += vec3(1.0) * crossMask * 0.4;
      gl_FragColor = vec4(col, alpha);
    }
  `);
}

/** 6. MONOCHROME SAINT: Sculpted Judgement Cathedral Obelisk shader. */
export function createMonochromeJudgementObeliskShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionPropMaterial('#f8fafc', '#18181b', `
    void main() {
      vec3 N = normalize(vNormalView);
      vec3 V = normalize(vViewPos);
      float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.55);
      float runeBand = smoothstep(0.82, 0.96, sin(vLocalPos.y * 14.0 - uTime * 6.0));
      float facingLight = max(0.0, dot(N, normalize(vec3(0.4, 0.8, 0.5))));
      float halftone = step(0.32, length(fract(vUv * 12.0) - 0.5));

      vec3 obsidian = vec3(0.025, 0.025, 0.04);
      vec3 ivory = uColor * 1.4;
      vec3 col = mix(obsidian, ivory, clamp(fresnel * 1.15 + facingLight * 0.42 * halftone + runeBand * 0.85, 0.0, 1.0));
      gl_FragColor = vec4(col, clamp(uOpacity * 0.99, 0.0, 0.99));
    }
  `);
}

/** 7. PRISM SERAPH: Rainbow Chromatic Diamond Prism Floor Seal shader. */
export function createPrismRefractionSealShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionFloorSealMaterial('#facc15', '#38bdf8', `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      // Octagonal radial distance
      float r = length(p);
      if (r > 1.0) discard;
      float ang = atan(p.y, p.x);
      float octR = max(abs(p.x), abs(p.y)) * 0.7071 + (abs(p.x) + abs(p.y)) * 0.5;
      float diamondR = mix(r, octR, 0.65);

      float outerFacet = smoothstep(0.025, 0.0, abs(diamondR - 0.88));
      float innerStar = smoothstep(0.022, 0.0, abs(r - (0.46 + 0.14 * cos(ang * 8.0 + uTime * 1.2))));
      float rays = smoothstep(0.88, 0.99, cos(ang * 12.0 - uTime * 2.2)) * smoothstep(0.88, 0.16, r);

      // Chromatic rainbow spectral gradient
      float phase = ang * 1.5 + r * 5.0 - uTime * 3.5;
      vec3 rainbow = 0.55 + 0.45 * cos(phase + vec3(0.0, 2.094, 4.188));
      vec3 prismTint = mix(mix(uColor, uCoreColor, 0.5 + 0.5 * sin(phase)), rainbow, 0.55);

      float sapphireBase = smoothstep(0.95, 0.72, r) * 0.68;
      float mask = clamp(outerFacet + innerStar + rays * 0.85, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.90, r);
      float alpha = clamp(max(mask, sapphireBase) * 1.15 * edge * uOpacity, 0.0, 0.98);
      if (alpha < 0.015) discard;

      vec3 col = vec3(0.03, 0.06, 0.15) + prismTint * (sapphireBase * 0.55 + rays * 1.3 + outerFacet * 1.45);
      col += vec3(1.0) * (innerStar * 1.35 + smoothstep(0.14, 0.0, r) * 0.95);
      gl_FragColor = vec4(col, alpha);
    }
  `);
}

/** 8. PRISM SERAPH: Iridescent Seraph Octahedron Crystal shader. */
export function createPrismShardColumnShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionPropMaterial('#facc15', '#38bdf8', `
    void main() {
      vec3 N = normalize(vNormalView);
      vec3 V = normalize(vViewPos);
      float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);
      float phase = vLocalPos.y * 4.5 + dot(N, vec3(1.0, 0.6, 0.8)) * 3.0 - uTime * 4.5 + uSeed;
      vec3 rainbow = 0.55 + 0.45 * cos(phase + vec3(0.0, 2.094, 4.188));
      vec3 facetCol = mix(mix(uColor, uCoreColor, 0.5 + 0.5 * sin(phase)), rainbow, 0.48);

      vec3 deepSapphire = vec3(0.04, 0.08, 0.22);
      vec3 col = mix(deepSapphire, facetCol * 1.5, clamp(0.45 + fresnel * 0.9, 0.0, 1.0));
      col += vec3(1.0) * pow(fresnel, 2.6) * 0.95;
      gl_FragColor = vec4(col, clamp(uOpacity * 0.96, 0.0, 0.96));
    }
  `);
}

/** 9. AETHER MONARCH: Imperial Twilight Astrolabe & Crown Floor Seal shader. */
export function createAetherNexusSealShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionFloorSealMaterial('#fbbf24', '#22d3ee', `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;
      float ang = atan(p.y, p.x);

      // Dual counter-rotating 8-point imperial nexus polygons
      float sA = cos((ang + uTime * 0.55) * 4.0);
      float sB = cos((ang - uTime * 0.75) * 4.0);
      float polyA = smoothstep(0.022, 0.0, abs(r - (0.72 + 0.14 * abs(sA))));
      float polyB = smoothstep(0.020, 0.0, abs(r - (0.48 + 0.12 * abs(sB))));

      // Outer crown-spire notches + cyan lightning nexus conduits
      float crownTeeth = smoothstep(0.75, 0.96, cos((ang - uTime * 0.25) * 16.0)) * smoothstep(0.80, 0.84, r) * smoothstep(0.95, 0.91, r);
      float ringOuter = smoothstep(0.018, 0.0, abs(r - 0.91));
      float aetherArcs = smoothstep(0.86, 0.98, sin(ang * 8.0 + r * 14.0 - uTime * 5.0)) * smoothstep(0.85, 0.15, r);

      float indigoPlate = smoothstep(0.96, 0.72, r) * 0.72;
      float mask = clamp(polyA + polyB + crownTeeth + ringOuter + aetherArcs, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.90, r);
      float alpha = clamp(max(mask, indigoPlate) * 1.16 * edge * uOpacity, 0.0, 0.99);
      if (alpha < 0.015) discard;

      vec3 royalIndigo = vec3(0.04, 0.03, 0.12);
      vec3 col = royalIndigo + uColor * (polyA * 1.5 + crownTeeth * 1.55 + ringOuter * 1.4);
      col += uCoreColor * (polyB * 1.55 + aetherArcs * 1.45);
      col += vec3(1.0, 0.95, 0.8) * smoothstep(0.16, 0.0, r) * 0.95;
      gl_FragColor = vec4(col, alpha);
    }
  `);
}

/** 10. AETHER MONARCH: Sovereign Liquid-Gold & Cyan Nexus Crown shader. */
export function createAetherMonarchCrownShaderMaterial(): THREE.ShaderMaterial {
  return buildFusionPropMaterial('#fbbf24', '#22d3ee', `
    void main() {
      vec3 N = normalize(vNormalView);
      vec3 V = normalize(vViewPos);
      float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.55);
      float vein = smoothstep(0.74, 0.96, sin(vLocalPos.y * 10.0 + atan(vLocalPos.z, vLocalPos.x) * 4.0 - uTime * 6.5));
      float spec = pow(max(0.0, dot(N, normalize(vec3(0.3, 0.8, 0.5)))), 4.0);

      vec3 darkRoyal = vec3(0.08, 0.05, 0.16);
      vec3 col = mix(darkRoyal, uColor * 1.45, clamp(0.45 + spec * 0.85 + fresnel * 0.65, 0.0, 1.0));
      col = mix(col, uCoreColor * 1.75, clamp(vein * 0.78 + pow(fresnel, 2.5) * 0.55, 0.0, 1.0));
      gl_FragColor = vec4(col, clamp(uOpacity * 0.99, 0.0, 0.99));
    }
  `);
}

/** Custom 3D cyber holo diamond shard geometry for Glitch Cheshire. */
export function createGlitchPrismShardGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const card = new THREE.OctahedronGeometry(0.48, 0);
  card.scale(0.65, 1.45, 0.24);
  parts.push(card);
  const crossShard = new THREE.OctahedronGeometry(0.34, 0);
  crossShard.scale(1.15, 0.22, 0.2);
  parts.push(crossShard);
  return mergeSimpleGeos(parts);
}

/** Custom 3D spiral-horned rose bramble lance geometry for Thorn Maiden. */
export function createThornVineLanceGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const mainCone = new THREE.ConeGeometry(0.24, 1.75, 6);
  mainCone.translate(0, 0.875, 0);
  parts.push(mainCone);

  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const ang = t * Math.PI * 3.2;
    const barb = new THREE.ConeGeometry(0.08, 0.38, 4);
    barb.rotateZ(-0.95);
    barb.rotateY(ang);
    barb.translate(
      Math.cos(ang) * (0.2 - t * 0.12),
      0.28 + t * 1.05,
      Math.sin(ang) * (0.2 - t * 0.12)
    );
    parts.push(barb);
  }
  return mergeSimpleGeos(parts);
}

/** Custom 3D Judgement Cathedral Obelisk geometry for Monochrome Saint. */
export function createMonochromeObeliskGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const spire = new THREE.ConeGeometry(0.32, 2.15, 4);
  spire.rotateX(Math.PI);
  spire.translate(0, 0.95, 0);
  parts.push(spire);

  const crossArm = new THREE.OctahedronGeometry(0.55, 0);
  crossArm.scale(1.65, 0.22, 0.28);
  crossArm.translate(0, 1.55, 0);
  parts.push(crossArm);

  const crownHead = new THREE.OctahedronGeometry(0.26, 0);
  crownHead.scale(0.9, 1.4, 0.9);
  crownHead.translate(0, 2.02, 0);
  parts.push(crownHead);
  return mergeSimpleGeos(parts);
}

/** Custom 3D bipyramid prism column geometry for Prism Seraph. */
export function createPrismOctahedronGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const core = new THREE.OctahedronGeometry(0.52, 0);
  core.scale(0.68, 1.75, 0.68);
  parts.push(core);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const wingCrystal = new THREE.OctahedronGeometry(0.22, 0);
    wingCrystal.scale(0.45, 1.45, 0.45);
    wingCrystal.rotateZ(-0.32);
    wingCrystal.rotateY(ang);
    wingCrystal.translate(Math.cos(ang) * 0.56, 0.05, Math.sin(ang) * 0.56);
    parts.push(wingCrystal);
  }
  return mergeSimpleGeos(parts);
}

/** Custom 3D sculpted 8-spire Imperial Crown geometry for Aether Monarch (horizontal/upright, zero tilted rings). */
export function createAetherMonarchCrownGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Octagonal diadem band lying flat horizontally around Y axis
  const band = new THREE.CylinderGeometry(0.98, 0.86, 0.34, 8, 1, true);
  parts.push(band);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const isMajor = i % 2 === 0;
    const spire = new THREE.ConeGeometry(isMajor ? 0.16 : 0.11, isMajor ? 0.92 : 0.58, 4);
    spire.translate(0, isMajor ? 0.52 : 0.36, 0);
    spire.rotateZ(-0.24);
    spire.rotateY(ang);
    spire.translate(Math.cos(ang) * 0.88, 0.12, Math.sin(ang) * 0.88);
    parts.push(spire);
  }

  const apexCrystal = new THREE.OctahedronGeometry(0.36, 0);
  apexCrystal.scale(0.75, 1.45, 0.75);
  apexCrystal.translate(0, 0.55, 0);
  parts.push(apexCrystal);
  return mergeSimpleGeos(parts);
}
