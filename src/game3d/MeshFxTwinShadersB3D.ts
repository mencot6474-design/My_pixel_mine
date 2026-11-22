import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

/** Nocturne Hard-Step Cel-Shaded Black-Violet vs Radiant-Silver Twin Blade Shader (NormalBlending). */
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
        float rim = pow(1.0 - abs(dot(N, V)), 1.5);
        float sweep = smoothstep(0.42, 0.50, sin(vLocalPos.y * 8.0 - uTime * 9.0));
        float edgeBevel = smoothstep(0.06, 0.015, abs(vLocalPos.x));

        vec3 silverBody = mix(vec3(0.86, 0.90, 0.98), vec3(1.0, 1.0, 1.0), clamp(sweep + rim * 0.6, 0.0, 1.0));
        silverBody = mix(silverBody, vec3(0.04, 0.03, 0.09), edgeBevel * 0.72);
        silverBody += vec3(0.72, 0.45, 0.98) * rim * 0.55;

        vec3 voidBody = mix(vec3(0.02, 0.015, 0.045), vec3(0.14, 0.06, 0.24), sweep * 0.55);
        voidBody = mix(voidBody, vec3(0.76, 0.48, 1.0), clamp(rim * 0.95 + edgeBevel * 0.75, 0.0, 1.0));
        voidBody += vec3(1.0) * pow(rim, 2.5) * 0.85;

        vec3 col = mix(silverBody, voidBody, uIsBlack);
        float alpha = clamp((0.96 + rim * 0.04) * uOpacity, 0.0, 0.99);
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

/** Sharp Faceted Twin Blade Geometry for Nocturne Twins (diamond eclipse sword + twin crescent guard). */
export function createNocturneWingGeometry(): THREE.BufferGeometry {
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.42);
  bladeShape.lineTo(0.042, -0.42);
  bladeShape.lineTo(0.05, -0.05);
  bladeShape.lineTo(0.24, 0.06);
  bladeShape.lineTo(0.11, 0.14);
  bladeShape.lineTo(0.13, 0.92);
  bladeShape.lineTo(0, 1.38);
  bladeShape.lineTo(-0.13, 0.92);
  bladeShape.lineTo(-0.11, 0.14);
  bladeShape.lineTo(-0.24, 0.06);
  bladeShape.lineTo(-0.05, -0.05);
  bladeShape.lineTo(-0.042, -0.42);
  bladeShape.closePath();

  const geo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.021);
  geo.computeVertexNormals();
  return geo;
}

/** Nocturne Upright Total Eclipse Corona Halo Shader behind the Podium Chibi (Acheron-style hard-step contrast). */
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        // Pitch black eclipse disc center + jagged silver-violet corona rim
        float flare = 0.06 * sin(ang * 12.0 - uTime * 3.5) + 0.03 * cos(ang * 20.0 + uTime * 4.5);
        float voidHole = smoothstep(0.48 + flare, 0.44 + flare, r);
        float coronaEdge = smoothstep(0.045, 0.0, abs(r - (0.48 + flare)));
        float outerRing = smoothstep(0.020, 0.0, abs(r - 0.88));
        float polarity = smoothstep(-0.03, 0.03, sin(ang + uTime * 0.65));

        vec3 voidBlack = vec3(0.015, 0.01, 0.035);
        vec3 violetGlow = vec3(0.66, 0.34, 0.98);
        vec3 silverWhite = vec3(0.98, 0.99, 1.0);

        float discBg = smoothstep(0.95, 0.72, r) * 0.82;
        vec3 ringCol = mix(violetGlow * 1.4, silverWhite * 1.35, polarity);
        vec3 col = mix(voidBlack, ringCol, clamp(coronaEdge + outerRing, 0.0, 1.0));
        col = mix(col, voidBlack, voidHole);
        col += silverWhite * coronaEdge * 0.55;

        float edgeFade = smoothstep(0.99, 0.88, r);
        float alpha = clamp(max(discBg, clamp(coronaEdge + outerRing, 0.0, 1.0)) * 1.15 * edgeFade * uOpacity, 0.0, 0.98);
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
        float rim = pow(1.0 - abs(dot(N, V)), 1.45);
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

/** Nocturne Hard-Step Cel-Shaded Total Eclipse & Yin-Yang Dimension Scar Floor Seal Shader. */
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float angle = atan(p.y, p.x);

        // Hard-step cel-shaded Yin-Yang swirl & central void eclipse hole
        float swirl = angle + r * 2.8 - uTime * 3.8;
        float polarity = smoothstep(-0.025, 0.025, sin(swirl));
        float eclipseHole = smoothstep(0.32, 0.28, r);
        float coronaRing = smoothstep(0.026, 0.0, abs(r - (0.31 + 0.04 * sin(angle * 12.0 - uTime * 6.0))));
        float shockRing = smoothstep(0.030, 0.0, abs(r - min(0.93, 0.22 + uProgress * 0.92)));
        float riftSlash = smoothstep(0.032, 0.0, abs(p.y - p.x * 0.45)) * smoothstep(0.95, 0.2, abs(p.x));

        vec3 voidBlack = vec3(0.02, 0.015, 0.04);
        vec3 pureSilver = vec3(0.96, 0.98, 1.0);
        vec3 violet = vec3(0.68, 0.34, 0.98);

        vec3 col = mix(voidBlack, pureSilver, polarity);
        col = mix(col, voidBlack, eclipseHole);
        col = mix(col, violet * 1.45, clamp(coronaRing * 0.8 + shockRing * 0.9, 0.0, 1.0));
        col += pureSilver * clamp(riftSlash * 1.2 + coronaRing * 0.45, 0.0, 1.0);

        float baseBg = smoothstep(0.95, 0.65, r) * 0.84;
        float lineMask = clamp(coronaRing + shockRing + riftSlash, 0.0, 1.0);
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

/** Lullaby Astral Music-Box Dial & Starlight Score Halo Shader behind the Chibi. */
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.98) discard;
        float angle = atan(p.y, p.x);

        // Midnight indigo music-box velvet backdrop for sharp contrast on bright worlds
        float plateMask = smoothstep(0.94, 0.72, r) * 0.84;

        // 5 concentric rotating musical score staff rings
        float staffRings = 0.0;
        for (int i = 0; i < 5; i++) {
          float rr = 0.48 + float(i) * 0.068;
          staffRings += smoothstep(0.014, 0.0, abs(r - rr)) * 0.62;
        }
        float outerRim = smoothstep(0.022, 0.0, abs(r - 0.89));
        float innerRim = smoothstep(0.020, 0.0, abs(r - 0.36));

        // Flowing musical note dots riding the staff rings
        float notePhase = angle * 6.0 - uTime * 2.2;
        float noteRadius = 0.58 + 0.11 * sin(floor(notePhase / 6.2831853 + 10.0) * 2.3 + uTime);
        float noteDot = smoothstep(0.045, 0.016, length(vec2(abs(fract(notePhase * 0.15915) - 0.5) * r * 1.4, r - noteRadius)));

        // Subtle lower moon cradle gleam & 4-point star ticks
        float starTicks = pow(max(0.0, cos(angle * 4.0 + uTime * 1.4)), 14.0) * smoothstep(0.92, 0.32, r);
        float cradleArc = smoothstep(0.036, 0.0, abs(r - 0.82)) * smoothstep(0.15, -0.35, p.y);

        vec3 nightBg = vec3(0.05, 0.02, 0.14);
        vec3 sakuraPink = vec3(0.96, 0.36, 0.72);
        vec3 starCyan = vec3(0.24, 0.86, 0.98);
        vec3 roseGold = vec3(1.0, 0.86, 0.62);

        vec3 col = nightBg
          + sakuraPink * (staffRings * 0.75 + cradleArc * 1.25 + innerRim * 0.8)
          + starCyan * (starTicks * 1.15 + noteDot * 1.4)
          + roseGold * (outerRim * 1.2 + noteDot * 0.45);

        float lineEnergy = clamp(staffRings + outerRim + innerRim + noteDot + starTicks + cradleArc, 0.0, 1.0);
        float edgeFade = smoothstep(0.98, 0.86, r);
        float alpha = clamp(max(plateMask, lineEnergy) * edgeFade * uOpacity, 0.0, 0.98);
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

/** Upright 3D Moon Cradle Arch & Suspended Chime Geometry for Lullaby Twins Podium Back. */
export function createLullabyMoonCradleArchGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Vertical half-moon cradle arc behind the upper shoulders (pure vertical Z-facing curve, zero tilted rings)
  const crescent = new THREE.Shape();
  crescent.moveTo(-0.88, 0.42);
  crescent.quadraticCurveTo(0.0, -1.08, 0.88, 0.42);
  crescent.quadraticCurveTo(0.0, -0.82, -0.88, 0.42);
  const cradleGeo = new THREE.ExtrudeGeometry(crescent, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  cradleGeo.translate(0, -0.05, -0.0225);
  parts.push(cradleGeo);

  // Twin side star finials & dangling music chime crystals
  for (const sx of [-1, 1]) {
    const tipStar = new THREE.OctahedronGeometry(0.11, 0);
    tipStar.scale(0.85, 1.35, 0.65);
    tipStar.translate(sx * 0.90, 0.42, 0);
    parts.push(tipStar);

    const chime = new THREE.OctahedronGeometry(0.075, 0);
    chime.scale(0.65, 1.55, 0.65);
    chime.translate(sx * 0.72, 0.02, 0);
    parts.push(chime);
  }
  return mergeSimpleGeos(parts);
}

/** Rose-Gold & Starlight Cyan Shader for Lullaby Upright Moon Cradle & Chimes. */
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
        float rim = pow(1.0 - abs(dot(N, V)), 1.5);
        float notePulse = 0.5 + 0.5 * sin(vLocalPos.x * 7.0 - uTime * 5.0);

        vec3 deepIndigo = vec3(0.08, 0.03, 0.18);
        vec3 roseGold = vec3(0.98, 0.74, 0.58);
        vec3 starCyan = vec3(0.24, 0.86, 0.98);
        vec3 sakuraPink = vec3(0.96, 0.40, 0.74);

        vec3 col = mix(deepIndigo, mix(roseGold, sakuraPink, notePulse * 0.55), 0.42 + rim * 0.58);
        col += starCyan * pow(rim, 2.2) * 0.85;
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Horizontal Astral Music-Box & Flowing Score Floor Seal for Lullaby Twins Pit Ult. */
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

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        // Midnight indigo music-box disc base
        float discBg = smoothstep(0.96, 0.72, r) * 0.82;

        // 5-line concentric circular musical score staff
        float staffLines = 0.0;
        for (int i = 0; i < 5; i++) {
          float rr = 0.52 + float(i) * 0.068;
          staffLines += smoothstep(0.013, 0.0, abs(r - rr)) * 0.65;
        }
        float outerRing = smoothstep(0.020, 0.0, abs(r - 0.91));
        float innerMoonRing = smoothstep(0.022, 0.0, abs(r - 0.34));

        // 6 crystal chime anchor glyphs + golden musical note markers rotating on staff
        float beatAngle = ang - uTime * 1.15;
        float noteArc = fract((beatAngle + 3.14159265) / 0.52359877) - 0.5;
        float noteLane = 0.56 + 0.16 * (0.5 + 0.5 * sin(floor((beatAngle + 3.14159) / 0.5236) * 2.7));
        float noteHeads = smoothstep(0.048, 0.014, length(vec2(noteArc * r * 1.35, r - noteLane)));
        float stem = smoothstep(0.014, 0.003, abs(noteArc) * r) * smoothstep(noteLane - 0.01, noteLane + 0.02, r) * smoothstep(noteLane + 0.12, noteLane + 0.08, r);

        // Sonic resonance shock ripples pulsing outward
        float ripple = smoothstep(0.06, 0.0, abs(r - fract(uProgress * 2.4) * 0.94));
        float starRays = pow(max(0.0, cos(ang * 6.0 + uTime * 1.4)), 14.0) * smoothstep(0.92, 0.18, r);

        vec3 nightIndigo = vec3(0.04, 0.02, 0.12);
        vec3 sakuraPink = vec3(0.96, 0.38, 0.74);
        vec3 starCyan = vec3(0.22, 0.84, 0.98);
        vec3 roseGold = vec3(1.0, 0.84, 0.56);

        float linesMask = clamp(staffLines + outerRing + innerMoonRing + noteHeads + stem + ripple + starRays, 0.0, 1.0);
        vec3 col = nightIndigo
          + sakuraPink * (staffLines * 0.85 + innerMoonRing * 1.35)
          + starCyan * (ripple * 1.35 + starRays * 1.2)
          + roseGold * (outerRing * 1.3 + noteHeads * 1.55 + stem * 1.25);

        float edgeFade = smoothstep(1.0, 0.90, r);
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
        float rim = pow(1.0 - abs(dot(N, V)), 1.45);
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
        float rim = pow(1.0 - ndv, 1.5);

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

