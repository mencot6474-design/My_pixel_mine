import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

/** Nocturne Hard-Step Cel-Shaded Silver-Star vs Pitch-Black Electric Violet Wing-Pinion Shader (NormalBlending). */
export function createNocturneWingShaderMaterial(isBlack = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIsBlack: { value: isBlack ? 1.0 : 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uIsBlack;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.35, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.26, 0.38, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.4);
        float inkRim = smoothstep(0.24, 0.12, ndv);
        float vein = smoothstep(0.58, 0.94, sin(vLocalPos.y * 10.0 - uTime * 9.0 + vLocalPos.x * 4.0));

        vec3 inkBlack = vec3(0.016, 0.008, 0.036);
        vec3 silverBody = mix(vec3(0.76, 0.80, 0.90), vec3(0.98, 0.99, 1.0), cel);
        silverBody = mix(silverBody, vec3(0.74, 0.44, 1.0), clamp(vein * 0.45 + rim * 0.55, 0.0, 1.0));
        silverBody = mix(silverBody, inkBlack, inkRim * 0.90);

        vec3 voidBody = mix(inkBlack, vec3(0.68, 0.34, 0.98) * 1.48, clamp(rim * 0.92 + vein * 0.68 + cel * 0.18, 0.0, 1.0));
        voidBody += vec3(0.96, 0.92, 1.0) * pow(rim, 2.3) * 0.85;

        vec3 col = mix(silverBody, voidBody, uIsBlack);
        float alpha = clamp((0.97 + rim * 0.03) * uOpacity, 0.0, 0.99);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Spiky Jagged Abyssal Wing-Claw & Gothic Cross Pinion Geometry for Nocturne Twins Podium Back (matches attack.webp!). */
export function createNocturneWingGeometry(): THREE.BufferGeometry {
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.34);
  bladeShape.lineTo(0.055, -0.10);
  bladeShape.lineTo(0.26, 0.14);
  bladeShape.lineTo(0.11, 0.24);
  bladeShape.lineTo(0.20, 0.68);
  bladeShape.lineTo(0.09, 0.74);
  bladeShape.lineTo(0, 1.42);
  bladeShape.lineTo(-0.09, 0.74);
  bladeShape.lineTo(-0.20, 0.68);
  bladeShape.lineTo(-0.11, 0.24);
  bladeShape.lineTo(-0.26, 0.14);
  bladeShape.lineTo(-0.055, -0.10);
  bladeShape.closePath();

  const geo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.021);
  geo.computeVertexNormals();
  return geo;
}

/** Nocturne Upright Abyssal Shadow-Mist & Gothic Cross Eclipse Halo Shader behind the Podium Chibi. */
export function createNocturneEclipseHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      float ncHash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float ncNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(ncHash(i), ncHash(i + vec2(1.0, 0.0)), f.x), mix(ncHash(i + vec2(0.0, 1.0)), ncHash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float ncStar4(vec2 p, float r) {
        vec2 q = abs(p);
        return pow(pow(q.x, 0.52) + pow(q.y, 0.52), 1.0 / 0.52) - r;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float polarity = smoothstep(-0.08, 0.08, p.x + 0.08 * sin(p.y * 4.0 - uTime * 1.6));
        float swirlMist = ncNoise(vec2(ang * 3.0 + r * 4.0 - uTime * 1.8, r * 5.0));
        float wisp = smoothstep(0.45, 0.65, swirlMist) * smoothstep(0.92, 0.35, r);

        float spikeFlare = 0.055 * pow(abs(cos(ang * 8.0 - uTime * 2.4)), 3.0);
        float coronaEdge = smoothstep(0.036, 0.0, abs(r - (0.52 + spikeFlare)));
        float chainTicks = smoothstep(0.55, 0.95, abs(cos(ang * 16.0 + uTime * 1.6))) * smoothstep(0.025, 0.0, abs(r - 0.84));
        float outerRing = smoothstep(0.020, 0.0, abs(r - 0.88));
        float starCore = smoothstep(0.025, 0.0, ncStar4(p, 0.25)) * (0.75 + 0.25 * sin(uTime * 4.5));

        vec3 voidBlack = vec3(0.016, 0.008, 0.036);
        vec3 violetGlow = vec3(0.66, 0.34, 0.98);
        vec3 silverWhite = vec3(0.96, 0.98, 1.0);
        vec3 twinAccent = mix(silverWhite, violetGlow, polarity);

        float discBg = smoothstep(0.95, 0.70, r) * 0.86;
        float lineMask = clamp(coronaEdge + outerRing + chainTicks + wisp * 0.75 + starCore, 0.0, 1.0);
        vec3 col = voidBlack
          + twinAccent * (coronaEdge * 1.4 + outerRing * 1.2 + wisp * 0.75)
          + silverWhite * (chainTicks * 1.35 + starCore * 1.35);

        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp(max(discBg, lineMask) * 1.15 * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Nocturne Total Eclipse Monolith Shader (hard-step void core + silver-violet corona + horizontal sever flash). */
export function createNocturneEclipseMonolithShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uCharge: { value: 0.0 },
      uSever: { value: 0.0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uCharge;
      uniform float uSever;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.45);
        float isLeft = step(0.0, -vLocalPos.x);
        float severCut = smoothstep(0.14, 0.01, abs(vLocalPos.y - 2.15 - vLocalPos.x * 0.25)) * uSever;

        vec3 voidObsidian = vec3(0.02, 0.012, 0.045);
        vec3 paleSilver = vec3(0.95, 0.97, 1.0);
        vec3 abyssViolet = vec3(0.68, 0.36, 0.98);

        vec3 baseCol = mix(paleSilver * 0.85, voidObsidian, isLeft);
        vec3 col = mix(baseCol, abyssViolet * 1.45, clamp(rim * (0.75 + uCharge * 0.45), 0.0, 1.0));
        col += vec3(1.0) * clamp(severCut * 1.4 + pow(rim, 2.5) * 0.75, 0.0, 1.0);

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.99);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Upright Total Eclipse Monolith & Flanking Twin Void/Silver Scythe Pillars Geometry (zero tilted orbit rings). */
export function createNocturneEclipseMonolithGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const eclipseCore = new THREE.CylinderGeometry(1.18, 1.18, 0.14, 20);
  eclipseCore.rotateX(Math.PI / 2);
  eclipseCore.translate(0, 2.25, 0);
  parts.push(eclipseCore);

  for (const sx of [-1, 1]) {
    const scytheColumn = new THREE.ConeGeometry(0.28, 3.85, 4);
    scytheColumn.scale(0.7, 1.0, 0.45);
    scytheColumn.rotateZ(sx * 0.14);
    scytheColumn.translate(sx * 1.85, 1.95, 0.06);
    parts.push(scytheColumn);

    const hornTip = new THREE.ConeGeometry(0.16, 1.45, 4);
    hornTip.rotateZ(sx * -0.45);
    hornTip.translate(sx * 1.45, 3.92, 0.06);
    parts.push(hornTip);
  }
  return mergeSimpleGeos(parts);
}

/** Nocturne Hard-Step Cel-Shaded Abyssal Shadow-Mist & Gothic Cross Floor Seal Shader. */
export function createNocturneEclipseCraterShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
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
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      float ncHash2(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float ncNoise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(ncHash2(i), ncHash2(i + vec2(1.0, 0.0)), f.x), mix(ncHash2(i + vec2(0.0, 1.0)), ncHash2(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float ncCross2(vec2 p, float w, float h, float barY) {
        return min(max(abs(p.x) - w, abs(p.y) - h), max(abs(p.x) - h * 0.68, abs(p.y - barY) - w * 1.05));
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        float swirl = angle + 2.0 / (r + 0.25) - uTime * 2.5;
        float mist = ncNoise2(vec2(swirl * 1.6, r * 4.5));
        float wisp = smoothstep(0.42, 0.60, mist) * (1.0 - smoothstep(0.70, 0.88, mist));
        float polarity = smoothstep(-0.08, 0.08, sin(angle * 2.0 + r * 2.5 - uTime * 1.6));

        float coronaRing = smoothstep(0.028, 0.0, abs(r - (0.34 + 0.04 * sin(angle * 10.0 - uTime * 5.0))));
        float outerRing = smoothstep(0.022, 0.0, abs(r - 0.88));
        float sectorAng = mod(angle - uTime * 0.7 + 3.14159265, 0.78539816) - 0.39269908;
        float crossGlyph = smoothstep(0.024, 0.0, ncCross2(vec2(sin(sectorAng) * r, r - 0.72) * 9.5, 0.18, 0.78, 0.25));
        float riftSlash = smoothstep(0.032, 0.0, abs(p.y - p.x * 0.42)) * smoothstep(0.95, 0.18, abs(p.x));

        vec3 voidBlack = vec3(0.016, 0.008, 0.036);
        vec3 pureSilver = vec3(0.96, 0.98, 1.0);
        vec3 violet = vec3(0.68, 0.34, 0.98);

        vec3 col = voidBlack
          + mix(violet, pureSilver, polarity) * (wisp * 0.9 + outerRing * 1.3 + coronaRing * 1.3)
          + violet * crossGlyph * 1.4
          + pureSilver * clamp(riftSlash * 1.3 + coronaRing * 0.45, 0.0, 1.0);

        float baseBg = smoothstep(0.95, 0.65, r) * 0.86;
        float lineMask = clamp(coronaRing + outerRing + crossGlyph + wisp + riftSlash, 0.0, 1.0);
        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp(max(baseBg, lineMask) * 1.16 * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Lullaby Gothic Rose-Window & Split Angel/Demon Nightmare Halo Shader behind the Chibi. */
export function createLullabyPinkAuraShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      float lbSdHeart(vec2 p) {
        p.x = abs(p.x);
        p.y += 0.35;
        if (p.y + p.x > 1.0) {
          return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.353553;
        }
        return sqrt(min(
          dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
          dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
        )) * sign(p.x - p.y);
      }

      float lbSdStar4(vec2 p, float r) {
        vec2 q = abs(p);
        return pow(pow(q.x, 0.52) + pow(q.y, 0.52), 1.0 / 0.52) - r;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        // Deep gothic obsidian velvet backdrop for razor contrast on bright & dark worlds
        float plateMask = smoothstep(0.95, 0.70, r) * 0.86;
        float polarity = smoothstep(-0.08, 0.08, p.x + 0.08 * sin(p.y * 4.0 - uTime * 1.4));

        // 12-petal Gothic Cathedral Rose-Window pointed lace arches
        float laceWave = 0.062 * pow(abs(cos(angle * 6.0 - uTime * 0.55)), 2.2);
        float outerLace = smoothstep(0.022, 0.0, abs(r - (0.86 + laceWave * 0.6)));
        float innerRose = smoothstep(0.020, 0.0, abs(r - (0.58 - laceWave * 0.85)));
        float coreHalo = smoothstep(0.020, 0.0, abs(r - 0.32));
        float spokes = smoothstep(0.88, 0.985, abs(cos(angle * 6.0 - uTime * 0.55))) * smoothstep(0.28, 0.36, r) * smoothstep(0.88, 0.78, r);

        // 6 orbiting Gothic Stitched Hearts + 4-Point Cross-Stars
        float sectorAng = mod(angle - uTime * 0.75 + 3.14159265, 1.04719755) - 0.52359877;
        vec2 slotP = vec2(sin(sectorAng) * r, r - 0.73);
        float heartGlyph = smoothstep(0.03, 0.0, lbSdHeart(slotP * 11.5));
        float starBurst = smoothstep(0.02, 0.0, lbSdStar4(p, 0.24)) * (0.7 + 0.3 * sin(uTime * 4.2));
        float beatPulse = smoothstep(0.045, 0.0, abs(r - fract(uTime * 0.42) * 0.92)) * 0.65;

        vec3 obsidianBg = mix(vec3(0.03, 0.008, 0.065), vec3(0.075, 0.022, 0.14), polarity * 0.55);
        vec3 sakuraPink = vec3(0.96, 0.38, 0.74);
        vec3 abyssViolet = vec3(0.68, 0.34, 0.98);
        vec3 porcelainWhite = vec3(0.98, 0.95, 1.0);

        vec3 twinAccent = mix(abyssViolet, sakuraPink, polarity);
        float lineEnergy = clamp(outerLace + innerRose + coreHalo + spokes * 0.8 + heartGlyph + starBurst + beatPulse, 0.0, 1.0);

        vec3 col = obsidianBg
          + twinAccent * (outerLace * 1.35 + innerRose * 1.15 + spokes * 0.85 + beatPulse)
          + sakuraPink * (heartGlyph * 1.45)
          + porcelainWhite * (coreHalo * 1.1 + starBurst * 1.35);

        float edgeFade = smoothstep(0.99, 0.87, r);
        float alpha = clamp(max(plateMask, lineEnergy) * 1.12 * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Upright 3D Asymmetric Gothic Sanctuary Crown & Demon-Horn / Angel-Ribbon Arch Geometry for Lullaby Twins Podium Back. */
export function createLullabyMoonCradleArchGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const extrudeCfg: THREE.ExtrudeGeometryOptions = {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  };

  // Top Gothic Ribboned Halo Crest (flat Z-facing crescent arch above the twins, zero tilted hoops)
  const arch = new THREE.Shape();
  arch.moveTo(-0.76, 0.54);
  arch.quadraticCurveTo(0.0, 1.02, 0.76, 0.54);
  arch.quadraticCurveTo(0.0, 0.84, -0.76, 0.54);
  const archGeo = new THREE.ExtrudeGeometry(arch, extrudeCfg);
  archGeo.translate(0, -0.02, -0.0225);
  parts.push(archGeo);

  // Center Gothic Cross-Bow Finial at top of the crown
  const bowCenter = new THREE.OctahedronGeometry(0.11, 0);
  bowCenter.scale(0.85, 1.35, 0.55);
  bowCenter.translate(0, 0.82, 0);
  parts.push(bowCenter);

  // Left Demon Horn Pinion (Left Twin motif)
  const leftHorn = new THREE.Shape();
  leftHorn.moveTo(-0.56, 0.44);
  leftHorn.quadraticCurveTo(-0.96, 0.72, -0.72, 1.04);
  leftHorn.quadraticCurveTo(-0.78, 0.68, -0.44, 0.46);
  leftHorn.closePath();
  const leftHornGeo = new THREE.ExtrudeGeometry(leftHorn, extrudeCfg);
  leftHornGeo.translate(0, 0, -0.0225);
  parts.push(leftHornGeo);

  // Right Angel Ribbon Streamer (Right Twin motif)
  const rightRibbon = new THREE.Shape();
  rightRibbon.moveTo(0.46, 0.48);
  rightRibbon.quadraticCurveTo(0.95, 0.66, 0.88, 0.14);
  rightRibbon.lineTo(0.76, 0.18);
  rightRibbon.quadraticCurveTo(0.82, 0.56, 0.42, 0.42);
  rightRibbon.closePath();
  const rightRibGeo = new THREE.ExtrudeGeometry(rightRibbon, extrudeCfg);
  rightRibGeo.translate(0, 0, -0.0225);
  parts.push(rightRibGeo);

  // Twin hanging Gothic Heart/Crystal Chimes
  for (const sx of [-1, 1]) {
    const gem = new THREE.OctahedronGeometry(0.085, 0);
    gem.scale(0.78, 1.48, 0.55);
    gem.translate(sx * 0.78, 0.36, 0);
    parts.push(gem);
  }
  return mergeSimpleGeos(parts);
}

/** Sculpted Single Gothic Wing Pinion Geometry for Lullaby Twins Animated Back Wings. */
export function createLullabyWingFeatherGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.08);
  s.quadraticCurveTo(0.48, 0.24, 0.98, 0.04);
  s.quadraticCurveTo(0.62, -0.09, 0.42, -0.22);
  s.quadraticCurveTo(0.18, -0.08, 0, -0.08);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.010,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

/** Asymmetric Cel-Shaded Obsidian-Sakura (Left Demon) vs Porcelain-Violet (Right Angel) Shader for Lullaby Podium Wings & Crown. */
export function createLullabyMoonCradleShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.35, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.36, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.45);
        float inkRim = smoothstep(0.24, 0.12, ndv);
        float pulse = 0.5 + 0.5 * sin(vLocalPos.x * 8.0 - uTime * 5.2);

        float isRightSide = smoothstep(-0.08, 0.08, vLocalPos.x);
        vec3 obsidianInk = vec3(0.03, 0.01, 0.06);
        vec3 sakuraPink = vec3(0.96, 0.38, 0.74);
        vec3 abyssViolet = vec3(0.68, 0.34, 0.98);
        vec3 porcelain = vec3(0.97, 0.95, 1.0);

        vec3 leftDemonCol = mix(obsidianInk, mix(abyssViolet, sakuraPink, pulse), clamp(rim * 0.88 + cel * 0.25, 0.0, 1.0));
        vec3 rightAngelCol = mix(vec3(0.72, 0.66, 0.88), porcelain, cel);
        rightAngelCol = mix(rightAngelCol, sakuraPink * 1.25, rim * 0.68);
        rightAngelCol = mix(rightAngelCol, obsidianInk, inkRim * 0.92);

        vec3 col = mix(leftDemonCol, rightAngelCol, isRightSide);
        col += sakuraPink * pow(rim, 2.2) * 0.75;
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Per-Wing Shader for Lullaby Twins Animated Back Wings (Left = Black-Ink Sakura Demon, Right = Porcelain-White Violet Angel). */
export function createLullabyWingFeatherShaderMaterial(isWhiteAngel: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
      uIsWhite: { value: isWhiteAngel ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      uniform float uIsWhite;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.35, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.28, 0.36, max(0.0, dot(N, L)));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.45);
        float inkRim = smoothstep(0.24, 0.12, ndv);
        float vein = smoothstep(0.68, 0.96, sin(vLocalPos.x * 12.0 - uTime * 7.0));

        vec3 inkBlack = vec3(0.025, 0.008, 0.055);
        vec3 sakuraPink = vec3(0.96, 0.38, 0.74);
        vec3 abyssViolet = vec3(0.70, 0.36, 0.98);
        vec3 porcelain = vec3(0.98, 0.96, 1.0);

        vec3 demonCol = mix(inkBlack, sakuraPink * 1.42, clamp(rim * 0.92 + vein * 0.65, 0.0, 1.0));
        vec3 angelCol = mix(vec3(0.74, 0.68, 0.90), porcelain, cel);
        angelCol = mix(angelCol, abyssViolet * 1.45, clamp(vein * 0.45 + rim * 0.55, 0.0, 1.0));
        angelCol = mix(angelCol, inkBlack, inkRim * 0.92);

        vec3 col = mix(demonCol, angelCol, uIsWhite);
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Horizontal Gothic Rose-Window & Split Angel/Demon Nightmare Floor Seal for Lullaby Twins. */
export function createLullabyMusicBoxSealShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
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
      varying vec2 vUv;

      float lbSdHeart(vec2 p) {
        p.x = abs(p.x);
        p.y += 0.35;
        if (p.y + p.x > 1.0) {
          return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.353553;
        }
        return sqrt(min(
          dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
          dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
        )) * sign(p.x - p.y);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float discBg = smoothstep(0.96, 0.70, r) * 0.84;
        float polarity = smoothstep(-0.08, 0.08, sin(ang + r * 2.4 - uTime * 2.0));
        float roseWave = 0.065 * pow(abs(cos(ang * 6.0 - uTime * 0.75)), 2.2);

        float outerRing = smoothstep(0.022, 0.0, abs(r - (0.88 + roseWave * 0.6)));
        float midArch = smoothstep(0.020, 0.0, abs(r - (0.60 - roseWave * 0.8)));
        float innerHalo = smoothstep(0.020, 0.0, abs(r - 0.33));
        float spokes = smoothstep(0.88, 0.985, abs(cos(ang * 6.0 - uTime * 0.75))) * smoothstep(0.28, 0.36, r) * smoothstep(0.90, 0.80, r);

        float sectorAng = mod(ang - uTime * 0.95 + 3.14159265, 1.04719755) - 0.52359877;
        vec2 slotP = vec2(sin(sectorAng) * r, r - 0.74);
        float heartMask = smoothstep(0.03, 0.0, lbSdHeart(slotP * 10.5));
        float ripple = smoothstep(0.06, 0.0, abs(r - fract(uProgress * 2.3) * 0.94));

        vec3 nightObsidian = mix(vec3(0.035, 0.01, 0.068), vec3(0.09, 0.03, 0.16), polarity * 0.6);
        vec3 sakuraPink = vec3(0.96, 0.38, 0.74);
        vec3 abyssViolet = vec3(0.68, 0.34, 0.98);
        vec3 porcelain = vec3(0.98, 0.95, 1.0);

        float linesMask = clamp(outerRing + midArch + innerHalo + spokes * 0.8 + heartMask + ripple, 0.0, 1.0);
        vec3 col = nightObsidian
          + mix(sakuraPink, abyssViolet, polarity) * (outerRing * 1.4 + midArch * 1.2 + spokes * 0.9)
          + sakuraPink * (heartMask * 1.5 + ripple * 1.1)
          + porcelain * (innerHalo * 1.2 + ripple * 0.5);

        float edgeFade = smoothstep(1.0, 0.89, r);
        float alpha = clamp(max(discBg, linesMask) * 1.15 * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Lullaby Twins Finale Shader 1 (Option B): Astral Music-Box Wind-Up Key & Crystal Chime Pillars Shrine. */
export function createGothicMirrorCageShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCrack: { value: 0.0 },
      uShatter: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uCrack;
      uniform float uShatter;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        float hash = sin(p.y * 8.0 + p.x * 6.0 + p.z * 6.0);
        float chimeVib = sin(uTime * 38.0 + p.y * 8.0) * 0.025 * uCrack * (1.0 - uShatter);
        p.xz += normalize(p.xz + vec2(0.0001)) * (chimeVib + uShatter * (1.1 + 0.65 * abs(hash)));
        p.y += uShatter * (0.65 + 0.55 * hash);
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uCrack;
      uniform float uShatter;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.35, 0.85, 0.5));
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.45);
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));

        float rHoriz = length(vLocalPos.xz);
        float isCenterKey = step(rHoriz, 1.35);
        float harmonicWave = smoothstep(0.55, 0.96, sin(vLocalPos.y * 9.0 - uTime * 11.0 + rHoriz * 2.0));

        vec3 darkTwilight = vec3(0.08, 0.03, 0.16);
        vec3 roseGold = vec3(0.98, 0.76, 0.52);
        vec3 sakuraPink = vec3(0.96, 0.36, 0.72);
        vec3 starCyan = vec3(0.22, 0.86, 0.98);

        vec3 keyCol = mix(darkTwilight, roseGold * 1.35, 0.45 + ndl * 0.55);
        keyCol = mix(keyCol, vec3(1.0, 0.95, 0.82), clamp(rim * 0.65 + uCrack * 0.35, 0.0, 1.0));

        vec3 chimeCol = mix(darkTwilight, mix(sakuraPink, starCyan, harmonicWave), 0.42 + ndl * 0.58);
        chimeCol += vec3(1.0) * (rim * 0.68 + harmonicWave * uCrack * 0.45);

        vec3 col = mix(chimeCol, keyCol, isCenterKey);
        col += vec3(1.0, 0.92, 0.98) * uShatter * 0.85;

        float alpha = clamp((0.96 - uShatter * 0.72) * uOpacity, 0.0, 0.98);
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Lullaby Twins Finale Shader 2 (Option B): Astral Starlight Full-Moon Sphere & Voronoi Shatter Shader. */
export function createCrescentMoonShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCharge: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uCharge;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.45 + 0.55 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.5);

        float fracture = abs(sin(vLocalPos.x * 5.2 + vLocalPos.y * 4.8) * cos(vLocalPos.z * 5.5 - vLocalPos.y * 4.4));
        float goldenCrack = smoothstep(0.20, 0.03, fracture) * smoothstep(0.15, 0.95, uCharge);
        float aurora = 0.5 + 0.5 * sin(vLocalPos.y * 3.5 + vLocalPos.x * 2.5 - uTime * 6.0);

        vec3 deepIndigo = vec3(0.12, 0.05, 0.26);
        vec3 sakuraPearl = vec3(0.98, 0.52, 0.80);
        vec3 starCyan = vec3(0.24, 0.86, 0.98);
        vec3 luminousWhite = vec3(1.0, 0.95, 0.98);

        vec3 col = mix(deepIndigo, mix(sakuraPearl, starCyan, aurora * 0.55), 0.4 + 0.6 * ndl);
        col = mix(col, luminousWhite, clamp(rim * 0.72 + goldenCrack * 1.1 + uCharge * 0.35, 0.0, 1.0));

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.98);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sculpted Giant Astral Wind-Up Key + 6 Crystal Chime Bell Pillars Shrine Geometry for Lullaby Twins. */
export function createGothicMirrorCageGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Center Giant Ornate Wind-Up Music-Box Key (shaft + cross-pin + twin bow loops + star crest)
  const keyShaft = new THREE.CylinderGeometry(0.11, 0.15, 2.35, 8);
  keyShaft.translate(0, 2.35, 0);
  parts.push(keyShaft);

  const keyCollar = new THREE.CylinderGeometry(0.24, 0.18, 0.26, 8);
  keyCollar.translate(0, 1.32, 0);
  parts.push(keyCollar);

  const keyBowBar = new THREE.CylinderGeometry(0.08, 0.08, 1.72, 6);
  keyBowBar.rotateZ(Math.PI / 2);
  keyBowBar.translate(0, 3.65, 0);
  parts.push(keyBowBar);

  for (const sx of [-1, 1]) {
    const bowLoop = new THREE.OctahedronGeometry(0.56, 0);
    bowLoop.scale(0.85, 1.05, 0.26);
    bowLoop.translate(sx * 0.62, 3.85, 0);
    parts.push(bowLoop);
  }
  const keyStar = new THREE.OctahedronGeometry(0.26, 0);
  keyStar.scale(0.9, 1.4, 0.5);
  keyStar.translate(0, 4.35, 0);
  parts.push(keyStar);

  // 2. Six Faceted Crystal Chime Bell Pillars ringing the pit perimeter (r = 2.68, zero horizontal/tilted hoops)
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = Math.cos(ang) * 2.68;
    const pz = Math.sin(ang) * 2.68;

    const chimeBody = new THREE.CylinderGeometry(0.11, 0.22, 1.95, 6);
    chimeBody.translate(px, 1.15, pz);
    parts.push(chimeBody);

    const chimeSpire = new THREE.ConeGeometry(0.14, 0.58, 6);
    chimeSpire.translate(px, 2.38, pz);
    parts.push(chimeSpire);

    const chimeStar = new THREE.OctahedronGeometry(0.18, 0);
    chimeStar.scale(0.75, 1.35, 0.75);
    chimeStar.translate(px, 2.86, pz);
    parts.push(chimeStar);
  }

  return mergeSimpleGeos(parts);
}

/** Sculpted Astral Starlight Full-Moon Orb + Vertical Cradle Fins Geometry for Lullaby Twins Finale. */
export function createGiantCrescentMoonGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const fullMoonCore = new THREE.IcosahedronGeometry(1.18, 2);
  parts.push(fullMoonCore);

  // Twin vertical side crescent wings/ears framing the full moon orb
  const earShape = new THREE.Shape();
  earShape.moveTo(0, 1.48);
  earShape.quadraticCurveTo(0.85, 0.92, 0.85, 0);
  earShape.quadraticCurveTo(0.85, -0.92, 0, -1.48);
  earShape.quadraticCurveTo(0.45, -0.58, 0.45, 0);
  earShape.quadraticCurveTo(0.45, 0.58, 0, 1.48);
  const earR = new THREE.ExtrudeGeometry(earShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  earR.translate(0.95, 0, -0.07);
  parts.push(earR);

  const earL = earR.clone();
  earL.scale(-1, 1, 1);
  parts.push(earL);

  const starTop = new THREE.OctahedronGeometry(0.28, 0);
  starTop.scale(0.75, 1.5, 0.75);
  starTop.translate(0, 1.65, 0);
  parts.push(starTop);

  return mergeSimpleGeos(parts);
}

/** Clockwork Twins â€” Inverted Giant Clocktower Custom GLSL Shader with 4-sided Roman Clock Dials & Shatter Detonation. */
export function createClocktowerShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uEmbedProgress: { value: 0.0 },
      uExplode: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      uniform float uEmbedProgress;
      uniform float uExplode;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 p = position;
        float tremor = sin(p.y * 16.0 + uTime * 62.0) * 0.032 * uEmbedProgress * (1.0 - uExplode);
        p.x += tremor;
        p.z -= tremor * 0.7;
        p += normal * (uExplode * 0.55 * (0.5 + 0.5 * sin(p.y * 7.0 + p.x * 9.0 + p.z * 9.0)));
        vLocalPos = p;
        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uEmbedProgress;
      uniform float uExplode;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      float sdSegment2D(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.42, 0.84, 0.52));
        float ndv = abs(dot(N, V));
        float ndl = max(0.0, dot(N, L));
        float cel1 = smoothstep(0.26, 0.32, ndl);
        float cel2 = smoothstep(0.70, 0.76, ndl);
        float inkSilhouette = smoothstep(0.30, 0.14, ndv);

        float y = vLocalPos.y;
        float hNorm = clamp(y / 5.1, 0.0, 1.0);

        float cellNoise = abs(sin(vLocalPos.x * 8.5 + y * 6.5) * cos(vLocalPos.z * 8.5 - y * 7.5 + uTime * 12.0));
        float shatterCrack = smoothstep(0.28 * (1.0 - uExplode * 0.48), 0.02, cellNoise) * step(0.01, uExplode);
        if (uExplode > 0.14 && cellNoise > (1.10 - uExplode * 0.88)) discard;

        vec3 inkBlack = vec3(0.02, 0.012, 0.004);
        vec3 darkBronze = vec3(0.05, 0.035, 0.015);
        vec3 midBronze = vec3(0.22, 0.14, 0.05);
        vec3 brassGold = vec3(0.92, 0.60, 0.10);
        vec3 brightGold = vec3(1.0, 0.84, 0.28);
        vec3 chronoTeal = vec3(0.14, 0.90, 0.82);

        vec3 col = mix(darkBronze, midBronze, cel1);
        col = mix(col, brassGold, cel2 * 0.45);

        if (y < 1.72) {
          float roofSlate = step(0.5, fract(y * 7.5));
          float roofRibs = smoothstep(0.70, 0.96, abs(sin(vLocalPos.x * 12.0)) + abs(sin(vLocalPos.z * 12.0)));
          float tipHeat = smoothstep(1.05, -0.15, y);
          col = mix(vec3(0.02, 0.03, 0.05), vec3(0.12, 0.18, 0.24), clamp(cel1 * 0.7 + roofSlate * 0.35, 0.0, 1.0));
          col = mix(col, brassGold * 1.15, roofRibs * 0.82);
          col = mix(col, mix(chronoTeal, brightGold, 0.55) * 1.35, tipHeat * 0.92);
        } else if (y <= 3.22) {
          vec2 faceUv = abs(vLocalPos.z) > abs(vLocalPos.x)
            ? vec2(vLocalPos.x, y - 2.46)
            : vec2(vLocalPos.z, y - 2.46);
          float r = length(faceUv) / 0.64;
          if (r < 1.0) {
            float ang = atan(faceUv.y, faceUv.x);
            float outerBezel = exp(-pow((r - 0.90) * 18.0, 2.0));
            float innerBezel = exp(-pow((r - 0.64) * 20.0, 2.0));
            float ticks = smoothstep(0.62, 0.94, cos(ang * 12.0)) * smoothstep(0.66, 0.72, r) * smoothstep(0.92, 0.82, r);
            float speedMult = 1.2 + uEmbedProgress * 4.5;
            float minAng = -uTime * 11.0 * speedMult;
            float hrAng = -uTime * 2.5 * speedMult + 1.1;
            float smearDiff = mod(minAng - ang + 6.2831853, 6.2831853);
            float handSmear = smoothstep(1.35, 0.0, smearDiff) * smoothstep(0.14, 0.62, r) * smoothstep(0.86, 0.68, r) * 0.72;
            float dMin = sdSegment2D(faceUv, vec2(0.0), vec2(cos(minAng), sin(minAng)) * 0.52);
            float dHr = sdSegment2D(faceUv, vec2(0.0), vec2(cos(hrAng), sin(hrAng)) * 0.36);
            float hands = smoothstep(0.052, 0.016, min(dMin, dHr));
            float hub = smoothstep(0.11, 0.04, length(faceUv));

            vec3 dialBg = mix(inkBlack, vec3(0.04, 0.11, 0.15), 1.0 - r);
            dialBg = mix(dialBg, chronoTeal * 1.35, clamp(ticks + innerBezel * 0.85 + handSmear * 0.75, 0.0, 1.0));
            dialBg = mix(dialBg, brassGold * 1.25, clamp(outerBezel, 0.0, 1.0));
            dialBg = mix(dialBg, vec3(1.0, 0.96, 0.76) * 1.45, clamp(hands + hub, 0.0, 1.0));
            col = dialBg;
          } else {
            float cornerEdge = smoothstep(0.58, 0.78, max(abs(vLocalPos.x), abs(vLocalPos.z)));
            col = mix(col, brassGold * 1.18, cornerEdge * 0.78);
          }
        } else {
          float winX = min(abs(vLocalPos.x - 0.28), abs(vLocalPos.x + 0.28));
          float winZ = min(abs(vLocalPos.z - 0.28), abs(vLocalPos.z + 0.28));
          float winSlot = smoothstep(0.11, 0.03, min(winX, winZ)) * smoothstep(3.42, 3.65, y) * smoothstep(4.72, 4.50, y);
          float cornice = smoothstep(0.14, 0.02, abs(y - 3.25)) + smoothstep(0.16, 0.02, abs(y - 4.92));
          col = mix(col, chronoTeal * 1.28, winSlot * 0.92);
          col = mix(col, brassGold * 1.2, clamp(cornice * 0.85, 0.0, 1.0));
        }

        float surgeWave = exp(-pow((hNorm - uEmbedProgress * 0.95) * 6.0, 2.0)) * step(0.02, uEmbedProgress);
        float stasisCrack = smoothstep(0.24, 0.04, abs(sin(vLocalPos.x * 9.0 + y * 5.0))) * uEmbedProgress * 0.65;
        col = mix(col, chronoTeal * 1.45, surgeWave * 0.68 + stasisCrack);
        col = mix(col, brightGold * 1.35, surgeWave * 0.42);
        col += vec3(1.0, 0.92, 0.55) * (shatterCrack * 1.25 + uExplode * 0.75);
        col = mix(col, inkBlack, inkSilhouette * 0.9);

        float alpha = clamp(uOpacity * (1.0 - uExplode * 0.78), 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sakuga Cel-Ink Weapon Shader for pooled Clockwork Gears & Clock-Hand Scythes. */
export function createClockworkSakugaWeaponShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#f59e0b') },
      uCoreColor: { value: new THREE.Color('#fef08a') },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float cel1 = smoothstep(0.28, 0.34, max(0.0, dot(N, L)));
        float cel2 = smoothstep(0.72, 0.78, max(0.0, dot(N, L)));
        float inkOutline = smoothstep(0.30, 0.16, ndv);
        float circuit = smoothstep(0.72, 0.95, sin(vLocalPos.y * 14.0 - uTime * 16.0 + vLocalPos.x * 8.0));
        vec3 col = mix(uColor * 0.24, uColor * 1.48, cel1);
        col = mix(col, uCoreColor * 1.78, cel2 * 0.74 + circuit * 0.68);
        col = mix(col, vec3(0.02, 0.012, 0.004), inkOutline * 0.94);
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Colossal Inverted 3D Gothic Clocktower Geometry (Spire Needle at bottom y=-0.22 pointing DOWN, Clock Belfry at y=2.46). */
export function createInvertedClocktowerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const spireTip = new THREE.ConeGeometry(0.36, 1.15, 4);
  spireTip.rotateX(Math.PI);
  spireTip.rotateY(Math.PI / 4);
  spireTip.translate(0, 0.35, 0);
  parts.push(spireTip);

  const spireRoof = new THREE.ConeGeometry(1.32, 1.18, 4);
  spireRoof.rotateX(Math.PI);
  spireRoof.rotateY(Math.PI / 4);
  spireRoof.translate(0, 1.15, 0);
  parts.push(spireRoof);

  const roofEaves = new THREE.BoxGeometry(1.94, 0.14, 1.94);
  roofEaves.translate(0, 1.72, 0);
  parts.push(roofEaves);

  const corners: Array<[number, number]> = [[-0.86, -0.86], [0.86, -0.86], [-0.86, 0.86], [0.86, 0.86]];
  for (const [cx, cz] of corners) {
    const pin = new THREE.ConeGeometry(0.20, 0.82, 4);
    pin.rotateX(Math.PI);
    pin.rotateY(Math.PI / 4);
    pin.translate(cx, 1.28, cz);
    parts.push(pin);
  }

  const belfryBox = new THREE.BoxGeometry(1.54, 1.50, 1.54);
  belfryBox.translate(0, 2.46, 0);
  parts.push(belfryBox);

  const bezelFB = new THREE.CylinderGeometry(0.68, 0.68, 1.66, 20);
  bezelFB.rotateX(Math.PI / 2);
  bezelFB.translate(0, 2.46, 0);
  parts.push(bezelFB);

  const bezelLR = new THREE.CylinderGeometry(0.68, 0.68, 1.66, 20);
  bezelLR.rotateZ(Math.PI / 2);
  bezelLR.translate(0, 2.46, 0);
  parts.push(bezelLR);

  const corniceA = new THREE.BoxGeometry(1.88, 0.18, 1.88);
  corniceA.translate(0, 3.25, 0);
  parts.push(corniceA);

  const towerShaft = new THREE.BoxGeometry(1.32, 1.65, 1.32);
  towerShaft.translate(0, 4.12, 0);
  parts.push(towerShaft);

  for (const [cx, cz] of [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]] as Array<[number, number]>) {
    const col = new THREE.BoxGeometry(0.24, 1.68, 0.24);
    col.translate(cx, 4.12, cz);
    parts.push(col);
  }

  const topCrown = new THREE.BoxGeometry(1.76, 0.24, 1.76);
  topCrown.translate(0, 5.02, 0);
  parts.push(topCrown);

  return mergeSimpleGeos(parts);
}

