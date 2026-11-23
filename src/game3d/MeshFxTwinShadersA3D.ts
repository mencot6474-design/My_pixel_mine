import * as THREE from 'three';
import { mergeSimpleGeos } from './MeshHelpers3D';

/** Animated GLSL Clockwork Chrono-Astrolabe Dial shader with bevel cog rings, 60-tick dial, planetary sub-gears & sweeping hands. */
export function createClockworkDialShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color('#f59e0b') },
      uCoreColor: { value: new THREE.Color('#2dd4bf') },
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

      float sdSeg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float gearRingMask(vec2 p, float rad, float thick, float teeth, float toothDepth, float rot) {
        float r = length(p);
        float a = atan(p.y, p.x) + rot;
        float toothWave = smoothstep(-0.2, 0.25, cos(a * teeth));
        float rOuter = rad + toothDepth * toothWave;
        float rInner = rad - thick;
        return smoothstep(0.014, 0.0, r - rOuter) * smoothstep(0.014, 0.0, rInner - r);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float timeStopGlow = smoothstep(0.36, 0.48, uProgress) * smoothstep(0.72, 0.58, uProgress);
        float resumeBurst = smoothstep(0.62, 0.76, uProgress) * smoothstep(1.0, 0.80, uProgress);
        float dialSpeed = mix(1.25, 0.04, timeStopGlow) + resumeBurst * 2.4;
        float t = uTime * dialSpeed;

        float baseGlow = exp(-r * r * 2.8) * 0.48;
        float pulseWave = smoothstep(0.11, 0.0, abs(r - fract(uProgress * 1.55) * 0.96)) * 0.85;
        float burstRays = smoothstep(0.62, 0.96, abs(cos(ang * 12.0 - t * 2.2))) * smoothstep(0.15, 0.88, r) * (0.28 + resumeBurst * 1.15);

        float outerGear = gearRingMask(p, 0.90, 0.068, 28.0, 0.058, t * 0.55);
        float outerRim = smoothstep(0.028, 0.0, abs(r - 0.85));
        float secTicks = smoothstep(0.72, 0.98, cos(ang * 60.0)) * smoothstep(0.77, 0.80, r) * smoothstep(0.85, 0.82, r);

        float hrSector = fract((ang + 3.14159265) / 0.52359877) - 0.5;
        float hrDiamond = smoothstep(0.085, 0.02, abs(hrSector) * r * 1.25 + abs(r - 0.71) * 0.95);
        float midRing = smoothstep(0.030, 0.0, abs(r - 0.64));
        float innerGear = gearRingMask(p, 0.55, 0.056, 18.0, 0.045, -t * 1.15);
        float coreRing = smoothstep(0.026, 0.0, abs(r - 0.25));

        float subGears = 0.0;
        for (int i = 0; i < 6; i++) {
          float oa = float(i) * 1.0471975 + t * 0.75;
          float orad = i < 3 ? 0.41 : 0.72;
          vec2 cPos = vec2(cos(oa), sin(oa)) * orad;
          subGears += gearRingMask(p - cPos, i < 3 ? 0.13 : 0.085, 0.03, 10.0, 0.028, -t * 2.4 + float(i));
          subGears += smoothstep(0.038, 0.015, length(p - cPos)) * 0.95;
        }

        float secAng = -t * 5.2 - uProgress * 10.2;
        float minAng = -t * 1.5 - uProgress * 3.4;
        float hrAng  =  t * 0.5 + 0.8;
        vec2 secDir = vec2(cos(secAng), sin(secAng));
        vec2 minDir = vec2(cos(minAng), sin(minAng));
        vec2 hrDir  = vec2(cos(hrAng), sin(hrAng));

        float angDiff = mod(secAng - ang + 6.2831853, 6.2831853);
        float sweepTrail = smoothstep(1.65, 0.0, angDiff) * smoothstep(0.08, 0.34, r) * smoothstep(0.86, 0.70, r) * 0.82;
        float minDiff = mod(minAng - ang + 6.2831853, 6.2831853);
        float minSmear = smoothstep(0.85, 0.0, minDiff) * smoothstep(0.08, 0.68, r) * smoothstep(0.75, 0.62, r) * 0.68;

        float dSec = sdSeg(p, -secDir * 0.18, secDir * 0.86);
        float secHand = smoothstep(0.028, 0.008, dSec);
        float dMin = sdSeg(p, -minDir * 0.12, minDir * 0.75);
        float minWidth = mix(0.056, 0.010, clamp(dot(p, minDir) / 0.75, 0.0, 1.0));
        float minHand = smoothstep(minWidth, minWidth * 0.32, dMin) * step(-0.13, dot(p, minDir));
        float dHr = sdSeg(p, -hrDir * 0.10, hrDir * 0.52);
        float hrWidth = mix(0.068, 0.014, clamp(dot(p, hrDir) / 0.52, 0.0, 1.0));
        float hrHand = smoothstep(hrWidth, hrWidth * 0.32, dHr) * step(-0.11, dot(p, hrDir));
        float centerHub = smoothstep(0.11, 0.045, r);
        float crackRays = smoothstep(0.92, 0.99, abs(sin(ang * 7.0 + r * 14.0))) * smoothstep(0.1, 0.85, r) * timeStopGlow;

        float brassLayer = clamp(outerGear + outerRim + secTicks * 0.9 + midRing + innerGear + hrDiamond + hrHand + minHand + burstRays * 0.55, 0.0, 1.0);
        float tealLayer = clamp(subGears + coreRing + secHand + sweepTrail + minSmear + pulseWave + centerHub + crackRays, 0.0, 1.0);
        float inkOutline = smoothstep(0.032, 0.006, min(abs(r - 0.85), abs(r - 0.64))) * (1.0 - max(outerRim, midRing) * 0.6);
        float totalMask = clamp(brassLayer + tealLayer + baseGlow, 0.0, 1.0);
        float dialPlate = smoothstep(0.97, 0.72, r) * 0.82;

        float edgeFade = smoothstep(1.0, 0.91, r);
        float alpha = clamp(max(totalMask, dialPlate) * 1.24 * edgeFade * uOpacity, 0.0, 0.99);
        if (alpha < 0.015) discard;

        vec3 darkPlateCol = mix(vec3(0.03, 0.02, 0.008), vec3(0.01, 0.03, 0.04), timeStopGlow);
        vec3 brassCol = uColor * 1.48 + vec3(0.55, 0.42, 0.12) * (hrDiamond + minHand + burstRays);
        vec3 tealCol = uCoreColor * 1.72 + vec3(0.5, 0.55, 0.55) * (secHand + centerHub + crackRays);

        vec3 col = darkPlateCol + brassCol * brassLayer + tealCol * tealLayer + mix(uColor, uCoreColor, 0.5) * baseGlow;
        col = mix(col, vec3(0.02, 0.01, 0.004), inkOutline * 0.75);
        col = mix(col, vec3(0.75, 1.0, 0.98) * 1.9, timeStopGlow * (0.35 + tealLayer * 0.65));
        col += vec3(1.0, 0.92, 0.65) * resumeBurst * 0.95;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Procedural 12-tooth brass cogwheel geometry for Clockwork Twins. */
export function createClockworkGearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(0.78, 0.085, 6, 24));
  parts.push(new THREE.TorusGeometry(0.28, 0.06, 6, 16));
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(1.5, 0.08, 0.06);
    spoke.rotateZ((i / 4) * Math.PI);
    parts.push(spoke);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(0.14, 0.22, 0.08);
    tooth.translate(0, 0.92, 0);
    tooth.rotateZ(a);
    parts.push(tooth);
  }
  return mergeSimpleGeos(parts);
}

/** Burnished Bronze, Liquid-Gold & Teal Chrono-Circuit Shader for Clockwork Podium Apparatus. */
export function createClockworkChronoChassisShaderMaterial(): THREE.ShaderMaterial {
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
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float ndv = abs(dot(N, V));
        float cel = smoothstep(0.32, 0.38, max(0.0, dot(N, L)));
        float rim = smoothstep(0.48, 0.85, 1.0 - ndv);
        float inkRim = smoothstep(0.26, 0.14, ndv);
        float circuit = smoothstep(0.68, 0.94, sin(vLocalPos.x * 11.0 + vLocalPos.y * 11.0 - uTime * 9.0));

        vec3 darkBronze = vec3(0.06, 0.035, 0.01);
        vec3 gold = vec3(1.0, 0.74, 0.14);
        vec3 teal = vec3(0.18, 0.92, 0.82);

        vec3 col = mix(darkBronze, gold * 1.45, clamp(cel * 0.78 + rim * 0.45, 0.0, 1.0));
        col = mix(col, teal * 1.68, clamp(circuit * 0.68 + rim * 0.45, 0.0, 1.0));
        col = mix(col, vec3(0.025, 0.014, 0.005), inkRim * 0.92);
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sculpted Ornate Gothic Clock-Needle Blade Geometry for Clockwork Twins Podium Back. */
export function createClockworkScytheHandGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shaft = new THREE.CylinderGeometry(0.028, 0.055, 1.45, 6);
  shaft.translate(0, 0.42, 0);
  parts.push(shaft);

  const tipNeedle = new THREE.ConeGeometry(0.11, 0.68, 4);
  tipNeedle.scale(0.85, 1.0, 0.35);
  tipNeedle.translate(0, 1.42, 0);
  parts.push(tipNeedle);

  const crestDiamond = new THREE.OctahedronGeometry(0.16, 0);
  crestDiamond.scale(0.75, 1.15, 0.4);
  crestDiamond.translate(0, 0.85, 0);
  parts.push(crestDiamond);

  const hiltHub = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8);
  hiltHub.rotateX(Math.PI / 2);
  hiltHub.translate(0, -0.25, 0);
  parts.push(hiltHub);
  return mergeSimpleGeos(parts);
}

/** Halcyon Emerald-Mint, Azure & Solar-Gold Celestial Cross-Crest Halo Shader behind Podium Chibi (matches idle.webp!). */
export function createHalcyonValkyrieHaloShaderMaterial(): THREE.ShaderMaterial {
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

      float hcStar4(vec2 p, float r) {
        vec2 q = abs(p);
        return pow(pow(q.x, 0.50) + pow(q.y, 0.50), 1.0 / 0.50) - r;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float navyBg = smoothstep(0.95, 0.70, r) * 0.88;
        float outerRing = step(abs(r - 0.87), 0.022);
        float innerRing = step(abs(r - 0.56), 0.016);
        float ticks = step(0.80, abs(sin(ang * 12.0 - uTime * 2.4))) * step(abs(r - 0.72), 0.06);
        float polarity = step(0.0, sin(ang * 2.0 + uTime * 2.0));

        // Razor Celestial 4-Point Cross-Fleur Crest at apex (p.y ~ 0.84)
        vec2 apexP = p - vec2(0.0, 0.82);
        float apexCrest = step(hcStar4(apexP * 1.15, 0.19), 0.015);
        float glintRing = step(0.90, cos(ang * 8.0 + uTime * 3.0)) * step(abs(r - 0.87), 0.045);

        vec3 navy = vec3(0.015, 0.035, 0.12);
        vec3 mintAqua = vec3(0.18, 0.96, 0.92);
        vec3 azureBlue = vec3(0.14, 0.84, 1.0);
        vec3 solarGold = vec3(1.0, 0.88, 0.28);

        float mask = clamp(outerRing + innerRing + ticks + apexCrest + glintRing, 0.0, 1.0);
        vec3 col = navy
          + mix(mintAqua, solarGold, polarity) * (outerRing * 1.55 + innerRing * 1.25)
          + azureBlue * (ticks * 1.45 + glintRing * 1.55)
          + vec3(1.0) * (apexCrest * 1.65);
        float edge = smoothstep(0.99, 0.87, r);
        float alpha = clamp(max(navyBg, mask) * 1.14 * edge * uOpacity, 0.0, 0.98);
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

/** Halcyon Paladin Dark-Steel & Azure-Gold Shader for Podium Angel Wings & Twin Broadswords. */
export function createHalcyonRailBowShaderMaterial(): THREE.ShaderMaterial {
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
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float ndv = abs(dot(N, V));
        float cel = step(0.32, dot(N, L));
        float inkRim = step(ndv, 0.24);
        float edgeGlow = step(0.24, ndv) * step(ndv, 0.42);
        float pulse = step(0.72, sin(vLocalPos.y * 16.0 - uTime * 16.0));

        vec3 darkSteel = vec3(0.025, 0.05, 0.15);
        vec3 pearlWhite = vec3(0.92, 0.97, 1.0);
        vec3 gold = vec3(1.0, 0.88, 0.28);
        vec3 azure = vec3(0.14, 0.86, 1.0);

        vec3 col = mix(darkSteel, pearlWhite, cel * 0.85);
        col = mix(col, mix(gold * 1.45, azure * 1.75, pulse), max(edgeGlow * 0.85, pulse * 0.55));
        col = mix(col, vec3(0.01, 0.02, 0.06), inkRim * 0.92);
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sculpted Feathered Angel Wing-Blade Geometry for Halcyon Twins Podium Back (matches idle.webp white angel wings!). */
export function createHalcyonMechanicalWingBladeGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.06);
  s.lineTo(0.46, 0.22);
  s.lineTo(1.18, 0.14);
  s.lineTo(0.84, -0.04);
  s.lineTo(1.04, -0.14);
  s.lineTo(0.54, -0.18);
  s.lineTo(0, -0.06);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.010,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Upright Paladin Broadsword Geometry for Halcyon Twins Podium Back (matches idle.webp & pose.webp!). */
export function createHalcyonRailBowGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blade = new THREE.Shape();
  blade.moveTo(-0.025, -0.44);
  blade.lineTo(0.025, -0.44);
  blade.lineTo(0.03, -0.06);
  blade.lineTo(0.18, 0.02);
  blade.lineTo(0.08, 0.08);
  blade.lineTo(0.10, 0.88);
  blade.lineTo(0, 1.24);
  blade.lineTo(-0.10, 0.88);
  blade.lineTo(-0.08, 0.08);
  blade.lineTo(-0.18, 0.02);
  blade.lineTo(-0.03, -0.06);
  blade.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(blade, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.010,
    bevelSegments: 1,
  });
  bladeGeo.translate(0, 0, -0.016);
  parts.push(bladeGeo);

  const gem = new THREE.OctahedronGeometry(0.085, 0);
  gem.scale(0.85, 1.35, 0.55);
  gem.translate(0, 0.02, 0);
  parts.push(gem);
  return mergeSimpleGeos(parts);
}

/** Horizontal Emerald-Mint, Azure & Solar-Gold Sanctuary Floor Seal Shader for Halcyon Twins. */
export function createHalcyonOrbitalSealShaderMaterial(): THREE.ShaderMaterial {
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

      float hcStar4(vec2 p, float r) {
        vec2 q = abs(p);
        return pow(pow(q.x, 0.50) + pow(q.y, 0.50), 1.0 / 0.50) - r;
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = atan(p.y, p.x);

        float navyBg = smoothstep(0.96, 0.70, r) * 0.82;
        float wave = 0.025 * sin(ang * 4.0 - uTime * 2.0);
        float outerTrack = smoothstep(0.022, 0.0, abs(r - (0.88 + wave)));
        float midReticle = smoothstep(0.018, 0.0, abs(r - 0.58));
        float innerLock = smoothstep(0.020, 0.0, abs(r - 0.30));

        float sectorAng = mod(ang - uTime * 0.6 + 3.14159265, 1.5707963) - 0.78539816;
        vec2 slotP = vec2(sin(sectorAng) * r, r - 0.73);
        float crest = smoothstep(0.03, 0.0, hcStar4(slotP * 4.5, 0.58));
        float centerStar = smoothstep(0.025, 0.0, hcStar4(p, 0.24));
        float pulseWave = smoothstep(0.08, 0.0, abs(r - fract(uProgress * 2.2) * 0.94));

        vec3 navy = vec3(0.02, 0.06, 0.18);
        vec3 mintAqua = vec3(0.18, 0.92, 0.88);
        vec3 azure = vec3(0.16, 0.74, 1.0);
        vec3 gold = vec3(1.0, 0.86, 0.28);

        float polarity = 0.5 + 0.5 * sin(ang * 2.0 + uTime * 1.5);
        float lineMask = clamp(outerTrack + midReticle + innerLock + crest + centerStar + pulseWave, 0.0, 1.0);
        vec3 col = navy
          + mix(mintAqua, gold, polarity) * (outerTrack * 1.45 + midReticle * 1.2)
          + azure * (innerLock * 1.2 + pulseWave * 1.4)
          + gold * (crest * 1.45)
          + vec3(1.0) * (centerStar * 0.9);

        float edge = smoothstep(1.0, 0.89, r);
        float alpha = clamp(max(navyBg, lineMask) * 1.16 * edge * uOpacity, 0.0, 0.98);
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

/** Halcyon Orbital Judgement Rail-Pillar Shader (armored navy obelisk + golden rail ribs + surging cyan beam conduit). */
export function createHalcyonRailPillarShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uCharge: { value: 0.0 },
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
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.5));
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));

        float channel = smoothstep(0.65, 0.96, sin(vLocalPos.y * 8.0 - uTime * 12.0));
        float crownGlow = smoothstep(1.8, 3.3, vLocalPos.y);

        vec3 navy = vec3(0.03, 0.07, 0.18);
        vec3 gold = vec3(0.99, 0.84, 0.24);
        vec3 cyan = vec3(0.16, 0.86, 0.99);

        vec3 col = mix(navy, gold * 1.38, clamp(ndl * 0.45 + rim * 0.68, 0.0, 1.0));
        col = mix(col, cyan * 1.55, clamp(channel * 0.55 + crownGlow * (0.45 + uCharge * 0.45), 0.0, 1.0));
        col += vec3(1.0) * pow(rim, 2.4) * (0.55 + uCharge * 0.45);
        gl_FragColor = vec4(col, clamp(0.98 * uOpacity, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Sculpted Halcyon Orbital Rail-Bow Judgement Pillar Geometry (hex tower + twin rail fins + crown beacon prism). */
export function createHalcyonRailPillarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const plinth = new THREE.CylinderGeometry(0.42, 0.52, 0.34, 6);
  plinth.translate(0, 0.17, 0);
  parts.push(plinth);

  const shaft = new THREE.CylinderGeometry(0.24, 0.36, 2.45, 6);
  shaft.translate(0, 1.56, 0);
  parts.push(shaft);

  for (const sx of [-1, 1]) {
    const railFin = new THREE.ConeGeometry(0.11, 1.45, 4);
    railFin.rotateZ(sx * 0.22);
    railFin.translate(sx * 0.34, 2.35, 0);
    parts.push(railFin);
  }

  const beaconCrown = new THREE.OctahedronGeometry(0.32, 0);
  beaconCrown.scale(0.85, 1.45, 0.85);
  beaconCrown.translate(0, 3.15, 0);
  parts.push(beaconCrown);

  return mergeSimpleGeos(parts);
}

/** Stylized swept multi-feather wing blade geometry (legacy export kept for compatibility). */
export function createAcademyWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.45, 0.85, 1.25, 1.15);
  shape.lineTo(0.75, 0.62);
  shape.lineTo(1.08, 0.56);
  shape.lineTo(0.58, 0.26);
  shape.lineTo(0.84, 0.14);
  shape.quadraticCurveTo(0.32, -0.04, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.015);
  geo.computeVertexNormals();
  return geo;
}

/** Yukikage Held Frost-Ink Slash Shader: rapid slash draw -> frozen hold -> Voronoi ice-crystal shatter burst. */
export function createHeldFrostSlashShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#38bdf8') },
      uCoreColor: { value: new THREE.Color('#e0f2fe') },
      uDraw: { value: 1.0 },
      uShatter: { value: 0.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uDraw;
      uniform float uShatter;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453123);
      }

      void main() {
        if (vUv.x > uDraw + 0.05) discard;
        float drawMask = smoothstep(uDraw + 0.05, max(0.0, uDraw - 0.08), vUv.x);
        float tipTaper = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        float distY = abs(vUv.y - 0.5) * 2.0;

        vec2 cellUv = vec2(vUv.x * 18.0 + uSeed * 3.7, vUv.y * 4.5);
        vec2 iCell = floor(cellUv);
        vec2 fCell = fract(cellUv);
        float minDist = 8.0;
        float secondDist = 8.0;
        vec2 bestCell = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 pt = hash2(iCell + neighbor);
            pt = 0.5 + 0.38 * sin(uSeed * 5.0 + 6.2831 * pt);
            vec2 diff = neighbor + pt - fCell;
            float d = length(diff);
            if (d < minDist) {
              secondDist = minDist;
              minDist = d;
              bestCell = iCell + neighbor;
            } else if (d < secondDist) {
              secondDist = d;
            }
          }
        }
        float borderDist = secondDist - minDist;
        vec2 cellRand = hash2(bestCell + uSeed);

        float dispY = (cellRand.y - 0.5) * 2.35 * uShatter;
        float dispX = (cellRand.x - 0.5) * 0.45 * uShatter;
        float localY = abs((vUv.y - dispY * 0.45) - 0.5) * 2.0;
        float localX = clamp(vUv.x - dispX, 0.0, 1.0);
        float localTaper = smoothstep(0.0, 0.12, localX) * smoothstep(1.0, 0.88, localX);

        float gapThreshold = mix(0.0, 0.28 + 0.24 * cellRand.x, uShatter);
        float shardAlive = step(gapThreshold, borderDist) * step(uShatter, 0.72 + 0.28 * cellRand.y);

        float bladeWidth = max(0.03, tipTaper * (0.28 + 0.12 * sin(vUv.x * 19.0 + uSeed)));
        float coreBlade = smoothstep(bladeWidth, bladeWidth * 0.12, localY);
        float outerAura = smoothstep(bladeWidth * 3.1, bladeWidth * 0.25, localY) * (1.0 - uShatter * 0.65);

        float crackGlow = smoothstep(0.11, 0.015, borderDist) * smoothstep(bladeWidth * 2.4, 0.0, distY);
        float holdPulse = 0.88 + 0.18 * sin(uTime * 36.0 + vUv.x * 24.0 + uSeed);
        float inkRim = smoothstep(bladeWidth * 2.4, bladeWidth * 0.75, localY) * (1.0 - coreBlade);

        vec3 inkCol = vec3(0.02, 0.06, 0.14);
        vec3 frostCol = mix(uColor * 1.4, uCoreColor * 1.9, clamp(coreBlade + crackGlow * 0.75, 0.0, 1.0));
        float shatterFlash = sin(uShatter * 3.14159) * 1.35;
        vec3 col = mix(inkCol, frostCol * (holdPulse + shatterFlash), clamp(coreBlade + outerAura * 0.72 + crackGlow, 0.0, 1.0));

        float alpha = (coreBlade * 1.15 + outerAura * 0.85 + inkRim * 0.92 + crackGlow * 0.7)
          * drawMask * localTaper * shardAlive * (1.0 - uShatter * 0.78) * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, clamp(alpha * 1.3, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Yukikage Twins Back-Shader 1: Sakuga 24-Ribbed Black Wagasa Canopy, Dual Sumi-Ink & Voronoi
 * Cryo-Frost Crescent Streams, 6-Fold Snowflakes & Hitodama Spirit Wisps (2.5s 3-Phase Cycle).
 */
export function createYukikageShrineRingShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
      uProgress: { value: 0.0 },
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
      uniform float uProgress;
      varying vec2 vUv;

      float ykHash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 41.23);
        return fract(p.x * p.y);
      }

      float ykVnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = ykHash21(i);
        float b = ykHash21(i + vec2(1.0, 0.0));
        float c = ykHash21(i + vec2(0.0, 1.0));
        float d = ykHash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float ykFbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 3; i++) {
          v += a * ykVnoise(p);
          p = rot * p * 2.04 + vec2(1.9, 6.7);
          a *= 0.5;
        }
        return v;
      }

      vec2 ykVoronoi(vec2 p) {
        vec2 n = floor(p);
        vec2 f = fract(p);
        float f1 = 8.0;
        float f2 = 8.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = vec2(ykHash21(n + g), ykHash21(n + g + vec2(19.3, 47.1)));
            o = 0.5 + 0.42 * sin(6.2831853 * o + uTime * 0.65);
            vec2 diff = g + o - f;
            float d = dot(diff, diff);
            if (d < f1) {
              f2 = f1;
              f1 = d;
            } else if (d < f2) {
              f2 = d;
            }
          }
        }
        return vec2(sqrt(f1), sqrt(f2));
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99 || r < 0.16) discard;

        float cycle = fract(uTime * 0.4 + uProgress);
        float charge = smoothstep(0.0, 0.2, cycle);
        float strike = 1.0 - pow(1.0 - clamp((cycle - 0.2) / 0.3, 0.0, 1.0), 3.0);

        // Open-Air 6-Branch Akaza Snowflake Needles & Dual-Square Kekkai Barrier (ZERO round disc!)
        float rotA = uTime * 0.24;
        float cA = cos(rotA), sA = sin(rotA);
        vec2 rp = vec2(p.x * cA - p.y * sA, p.x * sA + p.y * cA);
        float sector = mod(atan(rp.y, rp.x) + 3.14159265, 1.04719755) - 0.52359877;
        vec2 q = vec2(cos(sector), abs(sin(sector))) * r;

        float needle = max(abs(q.y) - 0.024 * (1.0 - q.x * 0.4), q.x - 0.90);
        vec2 b1 = q - vec2(0.40, 0.0);
        vec2 r1 = vec2(b1.x * 0.7071 + b1.y * 0.7071, abs(b1.y * 0.7071 - b1.x * 0.7071));
        float barb = max(r1.y - 0.016, max(r1.x - 0.22, -r1.x));
        float dSnow = min(needle, barb);
        float snowInk = smoothstep(0.036, 0.012, dSnow);
        float snowBody = step(dSnow, 0.0);
        float snowCore = step(dSnow, -0.009);

        // Counter-rotating Japanese 8-Pointed Kekkai Shrine Frame
        float rotB = -uTime * 0.18;
        float cB = cos(rotB), sB = sin(rotB);
        vec2 kp = vec2(p.x * cB - p.y * sB, p.x * sB + p.y * cB);
        float dKekkai = min(abs(max(abs(kp.x), abs(kp.y)) - 0.64), abs((abs(kp.x) + abs(kp.y)) * 0.7071 - 0.64));
        float kekkaiInk = smoothstep(0.034, 0.012, dKekkai);
        float kekkaiBody = step(dKekkai, 0.012);

        // 4 Orbiting Amber-Gold Ofuda / Hitodama Diamond Talismans
        float talisman = 0.0;
        for (int i = 0; i < 4; i++) {
          float a = float(i) * 1.5707963 + rotB * 1.4;
          vec2 tPos = p - vec2(cos(a), sin(a)) * 0.80;
          talisman += step(abs(tPos.x) + abs(tPos.y), 0.095);
        }

        vec3 sumiInk = vec3(0.014, 0.028, 0.08);
        vec3 cryoCyan = vec3(0.20, 0.88, 1.0) * (1.35 + strike * 0.45);
        vec3 snowWhite = vec3(0.96, 0.99, 1.0) * (1.42 + charge * 0.35);
        vec3 bambooAmber = vec3(1.0, 0.82, 0.24) * 1.55;

        float inkMask = clamp(max(snowInk, kekkaiInk), 0.0, 1.0);
        vec3 col = sumiInk;
        col = mix(col, cryoCyan, clamp(snowBody, 0.0, 1.0));
        col = mix(col, bambooAmber, clamp(kekkaiBody * 0.95 + talisman, 0.0, 1.0));
        col = mix(col, snowWhite, clamp(snowCore + talisman * 0.4, 0.0, 1.0));

        float structureMask = clamp(max(inkMask * 0.85, max(snowBody, max(kekkaiBody, talisman))), 0.0, 1.0);
        float edgeFade = smoothstep(0.99, 0.90, r) * smoothstep(0.16, 0.24, r);
        float alpha = clamp(structureMask * 1.15 * edgeFade * uOpacity, 0.0, 0.98);
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

/**
 * Yukikage Twins Back-Shader 2: Voronoi Glacial Ice-Crystal, Sumi-Ink Cel-Rim & Specular Glint Shader
 * for the 3 erupting Glacial Ice-Crystal Clusters (and frost-ink blade props).
 */
export function createYukikageKunaiShaderMaterial(): THREE.ShaderMaterial {
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

      float ykPropHash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 41.23);
        return fract(p.x * p.y);
      }

      float ykPropVoronoi(vec2 p) {
        vec2 n = floor(p);
        vec2 f = fract(p);
        float f1 = 8.0;
        float f2 = 8.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = vec2(ykPropHash(n + g), ykPropHash(n + g + vec2(17.3, 31.7)));
            o = 0.5 + 0.38 * sin(6.2831853 * o);
            vec2 d = g + o - f;
            float dist = dot(d, d);
            if (dist < f1) {
              f2 = f1;
              f1 = dist;
            } else if (dist < f2) {
              f2 = dist;
            }
          }
        }
        return sqrt(f2) - sqrt(f1);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.42, 0.86, 0.52));
        float ndv = abs(dot(N, V));
        float cel = step(0.32, dot(N, L));
        float rim = step(ndv, 0.38);
        float inkBorder = step(ndv, 0.22);

        float vorEdge = ykPropVoronoi(vLocalPos.xy * 6.5 + vec2(0.0, -uTime * 0.8));
        float crystalRidge = step(vorEdge, 0.09);
        float frostPulse = step(0.55, sin(vLocalPos.y * 14.0 - uTime * 11.0));
        float tipSnow = step(0.38, vLocalPos.y);

        vec3 sumiInk = vec3(0.018, 0.042, 0.11);
        vec3 glacialBlue = vec3(0.14, 0.72, 0.98);
        vec3 cryoCyan = vec3(0.45, 0.92, 1.0);
        vec3 pureSnow = vec3(0.96, 0.99, 1.0);

        vec3 col = mix(sumiInk, glacialBlue, clamp(cel * 0.7 + tipSnow * 0.35, 0.0, 1.0));
        col = mix(col, cryoCyan * 1.48, clamp(rim * 0.82 + crystalRidge * frostPulse * 0.8, 0.0, 1.0));
        col = mix(col, pureSnow * 1.55, clamp(crystalRidge * tipSnow * 0.85, 0.0, 1.0));
        col = mix(col, sumiInk, inkBorder * 0.92);

        float alpha = clamp(0.97 * uOpacity, 0.0, 0.99);
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

/**
 * Yukikage Twins Back-Shader 3: Black Bamboo Wagasa Umbrella & Warm Amber-Teal Hitodama Lantern Shader.
 */
export function createYukikageWagasaShaderMaterial(): THREE.ShaderMaterial {
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
        vec3 L = normalize(vec3(0.38, 0.86, 0.52));
        float ndv = abs(dot(N, V));
        float ndl = 0.42 + 0.58 * max(0.0, dot(N, L));
        float rim = pow(max(0.0001, 1.0 - ndv), 1.55);

        float ang = atan(vLocalPos.y, vLocalPos.x);
        float rad = length(vLocalPos.xy);
        // 24 radial bamboo ribs on the camera-facing XY Wagasa canopy + warm lantern/hub core
        float bambooRib = pow(max(0.0, cos(ang * 12.0)), 14.0) * smoothstep(0.08, 0.52, rad);
        float hubAmber = smoothstep(0.22, 0.04, rad) * (0.75 + 0.25 * sin(uTime * 6.5));
        float snowRim = smoothstep(0.38, 0.56, rad) * (0.55 + 0.45 * rim);

        vec3 sumiCanopy = vec3(0.035, 0.05, 0.10);
        vec3 charcoalPaper = vec3(0.14, 0.17, 0.24);
        vec3 bambooGold = vec3(0.96, 0.72, 0.22);
        vec3 frostTeal = vec3(0.24, 0.86, 0.98);
        vec3 snowWhite = vec3(0.95, 0.99, 1.0);

        vec3 col = mix(sumiCanopy, charcoalPaper, ndl * 0.65);
        col = mix(col, bambooGold * 1.35, clamp(bambooRib * 0.72 + hubAmber * 0.85, 0.0, 1.0));
        col = mix(col, frostTeal * 1.38, clamp(rim * 0.78, 0.0, 1.0));
        col = mix(col, snowWhite * 1.45, clamp(snowRim * 0.85 + pow(rim, 2.5) * 0.65, 0.0, 1.0));

        float alpha = clamp(0.98 * uOpacity, 0.0, 0.99);
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

/**
 * Sculpted Multi-Part 3D Traditional Japanese Bamboo Wagasa Umbrella Geometry
 * oriented in the XY plane (shallow Z profile so it stays 100% behind the 2D chibi sprite without clipping).
 */
export function createYukikageWagasaUmbrellaGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. 16-sided shallow oil-paper Wagasa canopy cone facing the camera in the XY plane
  const canopy = new THREE.ConeGeometry(0.58, 0.11, 16, 1, true);
  canopy.rotateX(Math.PI / 2);
  parts.push(canopy);

  // 2. Center wooden rokurō hub & finial cap
  const topCap = new THREE.ConeGeometry(0.13, 0.07, 12);
  topCap.rotateX(Math.PI / 2);
  topCap.translate(0, 0, 0.035);
  parts.push(topCap);

  // 3. Inner bamboo stretcher ring & outer rim ring in the XY plane
  const bambooRing = new THREE.TorusGeometry(0.25, 0.016, 6, 16);
  bambooRing.translate(0, 0, 0.01);
  parts.push(bambooRing);

  const outerRim = new THREE.TorusGeometry(0.57, 0.016, 6, 16);
  outerRim.translate(0, 0, -0.045);
  parts.push(outerRim);

  // 4. Sculpted 3D radial bamboo rib spokes inside the XY canopy plane
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.CylinderGeometry(0.009, 0.009, 1.12, 6);
    spoke.rotateZ((i / 6) * Math.PI);
    spoke.translate(0, 0, -0.015);
    parts.push(spoke);
  }

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Multi-Part 3D Hitodama Spirit Flame & Shinto Tōrō Lantern Wisp Geometry
 * matching the floating spirit wisps & snow-topped stone lantern in idle.webp & pose.webp.
 */
export function createYukikageHitodamaLanternGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Glowing octahedral spirit lantern core
  const lanternCore = new THREE.OctahedronGeometry(0.14, 0);
  lanternCore.scale(0.85, 1.15, 0.85);
  parts.push(lanternCore);

  // 2. Snow-capped hexagonal Tōrō pagoda roof & finial jewel (宝珠 hōju)
  const roof = new THREE.ConeGeometry(0.20, 0.11, 6);
  roof.translate(0, 0.14, 0);
  parts.push(roof);

  const hojuGem = new THREE.OctahedronGeometry(0.055, 0);
  hojuGem.scale(0.8, 1.35, 0.8);
  hojuGem.translate(0, 0.23, 0);
  parts.push(hojuGem);

  // 3. Curling 2-part Hitodama soul-flame tail wisp below the core
  const tailUpper = new THREE.ConeGeometry(0.095, 0.26, 5);
  tailUpper.rotateX(Math.PI);
  tailUpper.rotateZ(0.22);
  tailUpper.translate(0.03, -0.18, 0);
  parts.push(tailUpper);

  const tailTip = new THREE.ConeGeometry(0.055, 0.22, 4);
  tailTip.rotateX(Math.PI);
  tailTip.rotateZ(-0.36);
  tailTip.translate(0.01, -0.32, 0);
  parts.push(tailTip);

  return mergeSimpleGeos(parts);
}

/**
 * Sculpted Multi-Part 3D Glacial Ice-Crystal Cluster Geometry (asymmetric 3-spire jagged
 * Voronoi cryo shards + base frost diamond) matching the erupting ice crystals in attack.webp.
 */
export function createYukikageGlacialClusterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Tall central faceted cryo crystal spire
  const mainCrystal = new THREE.ConeGeometry(0.12, 0.88, 5);
  mainCrystal.scale(0.78, 1.0, 0.52);
  mainCrystal.translate(0, 0.36, 0);
  parts.push(mainCrystal);

  // 2. Left & right canted secondary glacial shards
  const leftShard = new THREE.ConeGeometry(0.088, 0.56, 5);
  leftShard.scale(0.75, 1.0, 0.48);
  leftShard.rotateZ(0.38);
  leftShard.translate(-0.14, 0.18, 0.02);
  parts.push(leftShard);

  const rightShard = new THREE.ConeGeometry(0.082, 0.48, 4);
  rightShard.scale(0.75, 1.0, 0.48);
  rightShard.rotateZ(-0.44);
  rightShard.translate(0.13, 0.14, -0.02);
  parts.push(rightShard);

  // 3. Faceted frost root crystal
  const basePrism = new THREE.OctahedronGeometry(0.13, 0);
  basePrism.scale(1.15, 0.85, 0.65);
  basePrism.translate(0, -0.04, 0);
  parts.push(basePrism);

  return mergeSimpleGeos(parts);
}

/** 3D Ninja Kunai Geometry for Yukikage Twins (ring pommel + wrapped grip + 4-faceted diamond kunai blade). */
export function createKunaiGeometry(): THREE.BufferGeometry {
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.032, -0.45);
  bladeShape.lineTo(0.032, -0.45);
  bladeShape.lineTo(0.038, -0.06);
  bladeShape.lineTo(0.22, 0.18);
  bladeShape.lineTo(0.0, 0.98);
  bladeShape.lineTo(-0.22, 0.18);
  bladeShape.lineTo(-0.038, -0.06);
  bladeShape.closePath();

  const vaneA = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  vaneA.translate(0, 0, -0.018);

  const vaneB = vaneA.clone();
  vaneB.scale(0.55, 1, 1);
  vaneB.rotateY(Math.PI / 2);

  const ring = new THREE.TorusGeometry(0.10, 0.026, 6, 14);
  ring.translate(0, -0.55, 0);

  return mergeSimpleGeos([vaneA, vaneB, ring]);
}

/** Halcyon Celestial Blade & Arrow Rain Custom GLSL Shader (NormalBlending for crisp bloom-safe gold & cyan facets). */
export function createHalcyonRainShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#22d3ee') },
      uAccentColor: { value: new THREE.Color('#fde047') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 1.0 },
      uImpact: { value: 0.0 },
      uTime: { value: 0.0 },
      uSeed: { value: 0.0 },
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
      uniform vec3 uAccentColor;
      uniform vec3 uCoreColor;
      uniform float uOpacity;
      uniform float uImpact;
      uniform float uTime;
      uniform float uSeed;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.45, 0.82, 0.55));
        float ndv = abs(dot(N, V));
        float ndl = 0.5 + 0.5 * dot(N, L);
        float rim = pow(max(0.0001, 1.0 - ndv), 1.9);

        float hNorm = clamp((vLocalPos.y + 0.85) / 2.5, 0.0, 1.0);

        vec3 deepShade = mix(vec3(0.06, 0.14, 0.24), vec3(0.24, 0.16, 0.03), hNorm);
        vec3 midTone = mix(uColor * 0.92, uAccentColor * 0.96, smoothstep(0.22, 0.78, hNorm));
        vec3 bodyCol = mix(deepShade, midTone, 0.42 + 0.58 * ndl);

        float streakWave = sin(vLocalPos.y * 16.0 - uTime * 34.0 + uSeed * 6.2831);
        float streak = smoothstep(0.45, 0.95, streakWave) * (1.0 - uImpact * 0.75);

        float shockCenter = mix(1.05, -0.15, clamp(uImpact * 1.5, 0.0, 1.0));
        float shockBand = exp(-pow((hNorm - shockCenter) * 8.5, 2.0)) * step(0.01, uImpact) * (1.0 - uImpact * 0.6);

        bodyCol += uAccentColor * rim * 0.52;
        bodyCol += uCoreColor * (streak * 0.38 + shockBand * 0.95 + pow(hNorm, 3.0) * 0.24);

        float alpha = clamp((0.92 + rim * 0.08) * uOpacity, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(bodyCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** Halcyon Twins â€” Multi-Portal "Gate of Babylon" Golden-Cyan Liquid Ripple Portal Shader. */
export function createHalcyonPortalRippleShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#fde047') },
      uAccentColor: { value: new THREE.Color('#22d3ee') },
      uPulse: { value: 0.0 },
      uSeed: { value: 0.0 },
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
      uniform vec3 uColor;
      uniform vec3 uAccentColor;
      uniform float uPulse;
      uniform float uSeed;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(vec2(p.x, p.y * 1.12));
        if (r > 0.98) discard;
        float angle = atan(p.y, p.x);

        float rippleWave = sin(r * 26.0 - uTime * 15.0 + uSeed * 6.2831);
        float ripples = smoothstep(0.25, 0.95, rippleWave) * smoothstep(0.92, 0.14, r);

        float outerBezel = exp(-pow((r - 0.82) * 22.0, 2.0));
        float innerBezel = exp(-pow((r - 0.52) * 24.0, 2.0));
        float starRunes = smoothstep(0.45, 0.95, cos(angle * 8.0 + uTime * 3.5 + uSeed * 6.0)) * outerBezel;
        float coreWell = smoothstep(0.46, 0.04, r);

        vec3 darkGoldBg = vec3(0.18, 0.11, 0.02);
        vec3 solarGold = vec3(0.96, 0.74, 0.12);
        vec3 skyCyan = vec3(0.12, 0.78, 0.95);
        vec3 hotCore = vec3(1.0, 0.95, 0.75);

        vec3 col = darkGoldBg;
        col = mix(col, solarGold, clamp(ripples * 0.78 + outerBezel * 0.95 + starRunes * 0.65, 0.0, 1.0));
        col = mix(col, skyCyan, clamp(innerBezel * 0.85 + ripples * 0.28 * (1.0 - coreWell), 0.0, 1.0));
        col = mix(col, hotCore, clamp(coreWell * (0.65 + uPulse * 0.35), 0.0, 1.0));

        float edgeFade = smoothstep(0.98, 0.78, r);
        float alpha = clamp((0.72 + ripples * 0.45 + outerBezel * 0.9 + innerBezel * 0.85 + coreWell * 0.92) * edgeFade * uOpacity, 0.0, 0.98);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/** 3D Barbed & Fletched Celestial Arrow Geometry for Halcyon Twins. */
export function createArrowGeometry(): THREE.BufferGeometry {
  const headShape = new THREE.Shape();
  headShape.moveTo(0, 1.48);
  headShape.lineTo(0.17, 0.78);
  headShape.lineTo(0.032, 0.90);
  headShape.lineTo(0.026, -0.78);
  headShape.lineTo(0.15, -0.66);
  headShape.lineTo(0.13, -0.26);
  headShape.lineTo(0.024, -0.40);
  headShape.lineTo(-0.024, -0.40);
  headShape.lineTo(-0.13, -0.26);
  headShape.lineTo(-0.15, -0.66);
  headShape.lineTo(-0.026, -0.78);
  headShape.lineTo(-0.032, 0.90);
  headShape.lineTo(-0.17, 0.78);
  headShape.closePath();

  const vaneA = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  vaneA.translate(0, 0, -0.011);

  const vaneB = vaneA.clone();
  vaneB.rotateY(Math.PI / 2);

  return mergeSimpleGeos([vaneA, vaneB]);
}

