import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const BARRAGE_BEAT_COUNT = 6;
const ORE_FLASH_COUNT = 6;
const SPARK_PARTICLE_COUNT = 36;

const CLOCKWORK_NOISE_GLSL = `
  vec2 cwHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float cwHash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float cwVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(cwHash21(i), cwHash21(i + vec2(1.0, 0.0)), f.x),
      mix(cwHash21(i + vec2(0.0, 1.0)), cwHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float cwRidged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(cwVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n) * a;
      freq *= 2.15;
      a *= 0.5;
    }
    return v;
  }

  vec3 cwVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = cwHash22(n + g);
        o = 0.5 + 0.42 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = cwHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  float cwGearTooth(float angle, float teeth, float rot) {
    float wave = cos((angle + rot) * teeth);
    return smoothstep(-0.15, 0.25, wave);
  }
`;

/**
 * Bold 16-tooth Steampunk Chrono-Cogwheel geometry for flanking rings.
 */
function createChronoFlankGearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.TorusGeometry(0.86, 0.065, 6, 32));
  parts.push(new THREE.TorusGeometry(0.48, 0.04, 6, 22));
  parts.push(new THREE.TorusGeometry(0.20, 0.036, 6, 16));

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(1.68, 0.065, 0.045);
    spoke.rotateZ((i / 4) * Math.PI);
    parts.push(spoke);
  }

  const teeth = 16;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(0.11, 0.18, 0.065);
    tooth.translate(0, 0.98, 0);
    tooth.rotateZ(a);
    parts.push(tooth);
  }

  return mergeSimpleGeos(parts);
}

/**
 * Colossal Sculpted Ornate Clock-Hand Great-Scythe geometry (bold silhouette for slamming into the pit).
 */
function createColossalClockScytheGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const shaft = new THREE.CylinderGeometry(0.035, 0.072, 2.6, 6);
  shaft.translate(0, 1.1, 0);
  parts.push(shaft);

  const needleTip = new THREE.ConeGeometry(0.16, 1.15, 4);
  needleTip.scale(0.9, 1.0, 0.34);
  needleTip.translate(0, 2.85, 0);
  parts.push(needleTip);

  const scytheBlade = new THREE.ConeGeometry(0.24, 1.45, 4);
  scytheBlade.scale(0.9, 1.0, 0.28);
  scytheBlade.rotateZ(-1.12);
  scytheBlade.translate(0.58, 1.98, 0);
  parts.push(scytheBlade);

  const counterBlade = new THREE.ConeGeometry(0.14, 0.85, 4);
  counterBlade.scale(0.85, 1.0, 0.28);
  counterBlade.rotateZ(1.16);
  counterBlade.translate(-0.34, 2.1, 0);
  parts.push(counterBlade);

  const guardRing = new THREE.TorusGeometry(0.26, 0.052, 6, 18);
  guardRing.translate(0, 0.25, 0);
  parts.push(guardRing);

  const pommelRing = new THREE.TorusGeometry(0.16, 0.036, 6, 14);
  pommelRing.translate(0, -0.35, 0);
  parts.push(pommelRing);

  return mergeSimpleGeos(parts);
}

/**
 * Layer 1 Shader: Bold Luminous Zafkiel Astral Clock Backdrop (strong golden rings & snapping 12:00 hands).
 */
function createSkyClockBackdropMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
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
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${CLOCKWORK_NOISE_GLSL}

      float sdSeg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float sampleClock(vec2 p, float tRot, float lockBlend) {
        float r = length(p);
        float ang = atan(p.y, p.x);

        float outerRing = exp(-pow((r - 0.88) * 20.0, 2.0));
        float innerRing = exp(-pow((r - 0.62) * 22.0, 2.0));
        float hubRing = exp(-pow((r - 0.22) * 24.0, 2.0));

        float gearOuter = cwGearTooth(ang, 24.0, tRot * 0.6) * smoothstep(0.02, 0.0, abs(r - 0.94) - 0.028);
        float hourWedges = smoothstep(0.90, 0.985, cos(ang * 12.0)) * smoothstep(0.64, 0.70, r) * smoothstep(0.87, 0.81, r);
        float secTicks = smoothstep(0.75, 0.98, cos(ang * 60.0)) * smoothstep(0.81, 0.84, r) * smoothstep(0.89, 0.86, r);

        float minAng = mix(1.570796 - tRot * 10.0, 1.570796, lockBlend);
        float hrAng = mix(1.570796 + tRot * 2.5 + 1.1, 1.570796, lockBlend);
        vec2 minDir = vec2(cos(minAng), sin(minAng));
        vec2 hrDir = vec2(cos(hrAng), sin(hrAng));

        float minHand = smoothstep(0.030, 0.008, sdSeg(p, -minDir * 0.12, minDir * 0.80));
        float hrHand = smoothstep(0.044, 0.012, sdSeg(p, -hrDir * 0.08, hrDir * 0.54));
        float hub = smoothstep(0.10, 0.03, r);

        return clamp(outerRing + innerRing + hubRing + gearOuter * 0.85 + hourWedges + secTicks * 0.7 + minHand + hrHand + hub, 0.0, 1.4);
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float charge = smoothstep(0.0, 0.08, uProgress);
        float lockBlend = smoothstep(0.18, 0.25, uProgress);
        float shatterT = 1.0 - pow(1.0 - clamp((uProgress - 0.29) / 0.21, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        float tRot = uTime * (1.0 - lockBlend * 0.9) + uProgress * 4.5;
        vec3 vor = cwVoronoi(p * 4.6, 0.35);
        float crackEdge = smoothstep(0.08, 0.01, vor.y) * smoothstep(0.27, 0.34, uProgress);

        float split = 0.010 + 0.036 * shatterT;
        vec2 dir = r > 0.001 ? p / r : vec2(1.0, 0.0);
        vec2 shift = dir * shatterT * 0.12 * vor.z;

        float mR = sampleClock(p + shift + dir * split, tRot, lockBlend);
        float mG = sampleClock(p + shift, tRot, lockBlend);
        float mB = sampleClock(p + shift - dir * split, tRot, lockBlend);

        float glowField = exp(-r * r * 3.2) * 0.38;
        vec3 col = vec3(mR, 0.0, 0.0) * (uColor * 1.65)
                 + vec3(0.0, mG, 0.0) * (uCoreColor * 1.7)
                 + vec3(0.0, 0.0, mB) * vec3(0.95, 0.45, 0.85) * 1.65;
        col += mix(uColor, uCoreColor, 0.45) * (mG * 0.8 + glowField);
        col += vec3(1.0) * (smoothstep(0.7, 1.2, mG) * 0.9 + crackEdge * 1.2);

        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + vor.y * 0.32);
        float alpha = clamp((max(max(mR, mG), mB) * 0.95 + glowField + crackEdge) * smoothstep(1.0, 0.88, r) * charge * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 2B Shader: Direct Per-Ore Hit Flash Star & Shockwave Ring (proves every combo beat lands on ore!).
 */
function createOreHitFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
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
      uniform float uProgress;
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${CLOCKWORK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 3.5, 0.0, 1.0), 3.0);
        float ring = exp(-pow((r - mix(0.15, 0.88, pop)) * 18.0, 2.0));
        float starX = (0.025 / (abs(p.y) + 0.02)) * smoothstep(0.95, 0.05, abs(p.x));
        float starY = (0.025 / (abs(p.x) + 0.02)) * smoothstep(0.95, 0.05, abs(p.y));
        float core = exp(-r * r * 14.0) * (1.0 - uLocalT * 0.7);

        float n = cwVnoise(p * 8.0);
        float localDissolve = smoothstep(uLocalT - 0.12, uLocalT + 0.12, n * 0.65 + (1.0 - r) * 0.45);
        float skillDissolve = smoothstep(clamp((uProgress - 0.5) / 0.5, 0.0, 1.0) - 0.1, clamp((uProgress - 0.5) / 0.5, 0.0, 1.0) + 0.1, n);

        float mask = clamp((ring + (starX + starY) * 0.7 + core) * smoothstep(0.99, 0.78, r), 0.0, 1.3);
        vec3 col = mix(uColor * 1.6, uCoreColor * 1.7, ring) + vec3(1.0) * clamp(core + (starX + starY) * 0.55, 0.0, 1.0);
        float alpha = clamp(mask * localDissolve * skillDissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 3 Shader: Colossal Clock-Hand Great-Scythes & Flanking Gears Material.
 */
function createChronoScytheMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#f472b6') },
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
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${CLOCKWORK_NOISE_GLSL}

      void main() {
        float charge = smoothstep(0.0, 0.08, uProgress);
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.16) / 0.34, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.35);
        float circuit = smoothstep(0.68, 0.96, sin(vLocalPos.y * 14.0 - uTime * 18.0));

        vec3 vor = cwVoronoi(vLocalPos.xy * 3.8, 0.35);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + rim * 0.35);

        vec3 col = mix(uColor * (1.45 + strike * 0.65), uCoreColor * 1.75, circuit * 0.72);
        col = mix(col, vec3(1.0), clamp(pow(rim, 1.6) * 0.95, 0.0, 1.0));

        float alpha = clamp((0.52 + rim * 0.85 + circuit * 0.42) * charge * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 4A Shader: Towering Chrono-Judgment Sky-Beam Pillar (blazing vertical energy & ridged lightning — ZERO dome!).
 */
function createChronoJudgmentPillarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#2dd4bf') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float flare = 1.0 + 0.58 * pow(1.0 - uv.y, 2.2) + 0.12 * sin(uv.y * 16.0 - uTime * 28.0);
        transformed.xz *= flare;
        vec4 mvPos = modelViewMatrix * vec4(transformed, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      ${CLOCKWORK_NOISE_GLSL}

      void main() {
        if (uProgress < 0.29) discard;
        float strike = 1.0 - pow(1.0 - clamp((uProgress - 0.29) / 0.18, 0.0, 1.0), 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float centerHot = pow(abs(dot(N, V)), 1.4);
        float fresnel = pow(max(0.0001, 1.0 - abs(dot(N, V))), 1.5);

        vec2 beamUv = vec2(vUv.x * 10.0, vUv.y * 3.5 - uTime * 5.2);
        float ridged = cwRidged(beamUv);
        float bolt = smoothstep(0.68, 0.88, ridged);
        float spiral = smoothstep(0.60, 0.95, sin(vUv.x * 18.849 + vUv.y * 12.0 - uTime * 20.0));

        vec3 vor = cwVoronoi(beamUv * 1.4, 0.25);
        float dissolve = smoothstep(dissolveT - 0.11, dissolveT + 0.11, vor.z * 0.72 + (1.0 - vUv.y) * 0.32);

        float vFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.18, vUv.y);
        vec3 col = mix(uColor * (1.55 + strike * 0.65), uCoreColor * 1.75, clamp(spiral * 0.7 + fresnel * 0.5, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.99, 0.95), clamp(centerHot * 0.88 + bolt * 0.9, 0.0, 1.0));

        float alpha = clamp((centerHot * 0.88 + bolt * 0.85 + spiral * 0.45 + fresnel * 0.4) * vFade * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 4B Shader: Flat Horizontal Mach-Sawtooth Shockwave & Cracks.
 */
function createGroundShockwaveMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
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
      uniform float uProgress;
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${CLOCKWORK_NOISE_GLSL}

      void main() {
        if (uProgress < 0.29) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;
        float ang = atan(p.y, p.x);

        float boomT = clamp((uProgress - 0.29) / 0.18, 0.0, 1.0);
        float boomEase = 1.0 - pow(1.0 - boomT, 3.0);
        float dissolveT = clamp((uProgress - 0.5) / 0.5, 0.0, 1.0);

        float jagged = 0.12 * pow(abs(cos(ang * 12.0 - uTime * 3.0)), 6.0);
        float waveR = mix(0.10, 0.86, boomEase) + jagged * boomEase;

        float ringR = exp(-pow((r - (waveR + 0.025)) * 22.0, 2.0));
        float ringG = exp(-pow((r - waveR) * 24.0, 2.0));
        float ringB = exp(-pow((r - (waveR - 0.025)) * 22.0, 2.0));

        float rays = pow(max(0.0, cos(ang * 24.0 + uTime * 2.0)), 14.0) * smoothstep(waveR + 0.08, 0.15, r) * smoothstep(0.08, 0.25, r);
        vec3 vor = cwVoronoi(p * 6.0, 0.25);
        float crackWeb = smoothstep(0.075, 0.01, vor.y) * smoothstep(waveR + 0.04, 0.08, r);
        float dissolve = smoothstep(dissolveT - 0.10, dissolveT + 0.10, vor.z * 0.78 + ringG * 0.35);

        vec3 col = vec3(ringR, 0.0, 0.0) * (uColor * 1.75)
                 + vec3(0.0, ringG, 0.0) * (uCoreColor * 1.8)
                 + vec3(0.0, 0.0, ringB) * vec3(0.95, 0.45, 0.85) * 1.75
                 + mix(uColor, uCoreColor, 0.5) * (crackWeb * 1.25 + rays * 1.45)
                 + vec3(1.0) * (ringG * 0.75 + crackWeb * 0.45);

        float alpha = clamp((max(max(ringR, ringG), ringB) + crackWeb * 0.85 + rays * 0.9) * smoothstep(0.99, 0.85, r) * dissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Layer 5 Shader: High-Velocity Explosive Spark Streaks.
 */
function createExplosiveSparkStreakMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uLocalLife: { value: 0.0 },
      uSeed: { value: 1.0 },
      uColor: { value: new THREE.Color('#fbbf24') },
      uCoreColor: { value: new THREE.Color('#ffffff') },
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
      uniform float uLocalLife;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${CLOCKWORK_NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float needle = exp(-abs(p.x) * 6.5) * exp(-abs(p.y) * 2.0);
        float starCross = (0.055 / (abs(p.x) + 0.04)) * (0.055 / (abs(p.y) + 0.04)) * smoothstep(0.95, 0.0, r);
        float shape = clamp(needle + starCross * 0.7, 0.0, 1.0);

        float n = cwHash21(floor(vUv * 8.0 + uSeed));
        float dissolve = smoothstep(uLocalLife - 0.14, uLocalLife + 0.14, n * 0.65 + (1.0 - r) * 0.45);
        float skillDissolve = smoothstep(clamp((uProgress - 0.5) / 0.5, 0.0, 1.0) - 0.1, clamp((uProgress - 0.5) / 0.5, 0.0, 1.0) + 0.1, n * 0.7 + 0.3);

        vec3 col = mix(uColor * 1.75, uCoreColor * 1.95, clamp(shape * 0.88, 0.0, 1.0));
        float alpha = clamp(shape * dissolve * skillDissolve, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

interface BarrageBeatSlot {
  delay: number;
  beatFired: boolean;
  targetIndex: number;
}

interface OreFlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseScale: number;
}

interface SparkParticleSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseLen: number;
}

interface ClockworkSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  impactFired: boolean;
  overdriveFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  skyClockMesh: THREE.Mesh;
  skyClockMat: THREE.ShaderMaterial;
  leftGearMesh: THREE.Mesh;
  rightGearMesh: THREE.Mesh;
  leftGearMat: THREE.ShaderMaterial;
  rightGearMat: THREE.ShaderMaterial;
  barrageBeats: BarrageBeatSlot[];
  oreFlashes: OreFlashSlot[];
  hourScytheMesh: THREE.Mesh;
  minuteScytheMesh: THREE.Mesh;
  hourScytheMat: THREE.ShaderMaterial;
  minuteScytheMat: THREE.ShaderMaterial;
  pillarMesh: THREE.Mesh;
  pillarMat: THREE.ShaderMaterial;
  climaxFlareMesh: THREE.Mesh;
  climaxFlareMat: THREE.ShaderMaterial;
  groundShockMesh: THREE.Mesh;
  groundShockMat: THREE.ShaderMaterial;
  sparks: SparkParticleSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s Sakuga Skill Pool for Clockwork Twins
 * ("Chrono-Scissor Execution": Snappy 6-Hit Per-Ore Blitz Barrage -> Violent easeInExpo Twin Great-Scythe Slam
 * -> Hit-Stop + Blazing Chrono-Judgment Sky-Pillar + 36-Streak Ballistic Spark Explosion -> 1.05s Time-Resume Overdrive!).
 */
export class ClockworkTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: ClockworkSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const gearGeo = createChronoFlankGearGeometry();
    const scytheGeo = createColossalClockScytheGeometry();
    const pillarGeo = new THREE.CylinderGeometry(0.95, 1.35, 9.5, 24, 10, true);
    pillarGeo.translate(0, 4.75, 0);
    this.sharedGeos.push(planeGeo, gearGeo, scytheGeo, pillarGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const skyClockMat = createSkyClockBackdropMaterial();
      const skyClockMesh = new THREE.Mesh(planeGeo, skyClockMat);
      skyClockMesh.rotation.set(-0.22, 0, 0);
      root.add(skyClockMesh);
      this.allMats.push(skyClockMat);

      const leftGearMat = createChronoScytheMaterial();
      leftGearMat.uniforms.uColor.value.set('#c084fc');
      leftGearMat.uniforms.uCoreColor.value.set('#fbbf24');
      const leftGearMesh = new THREE.Mesh(gearGeo, leftGearMat);
      root.add(leftGearMesh);

      const rightGearMat = createChronoScytheMaterial();
      rightGearMat.uniforms.uColor.value.set('#f472b6');
      rightGearMat.uniforms.uCoreColor.value.set('#2dd4bf');
      const rightGearMesh = new THREE.Mesh(gearGeo, rightGearMat);
      root.add(rightGearMesh);
      this.allMats.push(leftGearMat, rightGearMat);

      const barrageBeats: BarrageBeatSlot[] = [];
      for (let i = 0; i < BARRAGE_BEAT_COUNT; i++) {
        barrageBeats.push({
          delay: 0.22 + i * 0.068,
          beatFired: false,
          targetIndex: i,
        });
      }

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createOreHitFlashMaterial();
        const fMesh = new THREE.Mesh(planeGeo, fMat);
        fMesh.rotation.set(-0.55, 0, 0);
        fMesh.visible = false;
        root.add(fMesh);
        this.allMats.push(fMat);
        oreFlashes.push({
          mesh: fMesh,
          mat: fMat,
          active: false,
          age: 0,
          life: 0.24,
          baseScale: 3.2,
        });
      }

      const hourScytheMat = createChronoScytheMaterial();
      hourScytheMat.uniforms.uColor.value.set('#fbbf24');
      hourScytheMat.uniforms.uCoreColor.value.set('#f472b6');
      const hourScytheMesh = new THREE.Mesh(scytheGeo, hourScytheMat);
      hourScytheMesh.visible = false;
      root.add(hourScytheMesh);

      const minuteScytheMat = createChronoScytheMaterial();
      minuteScytheMat.uniforms.uColor.value.set('#2dd4bf');
      minuteScytheMat.uniforms.uCoreColor.value.set('#c084fc');
      const minuteScytheMesh = new THREE.Mesh(scytheGeo, minuteScytheMat);
      minuteScytheMesh.visible = false;
      root.add(minuteScytheMesh);
      this.allMats.push(hourScytheMat, minuteScytheMat);

      const pillarMat = createChronoJudgmentPillarMaterial();
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.visible = false;
      root.add(pillarMesh);
      this.allMats.push(pillarMat);

      const climaxFlareMat = createOreHitFlashMaterial();
      climaxFlareMat.uniforms.uColor.value.set('#fbbf24');
      climaxFlareMat.uniforms.uCoreColor.value.set('#2dd4bf');
      const climaxFlareMesh = new THREE.Mesh(planeGeo, climaxFlareMat);
      climaxFlareMesh.rotation.set(-0.48, 0, 0);
      climaxFlareMesh.visible = false;
      root.add(climaxFlareMesh);
      this.allMats.push(climaxFlareMat);

      const groundShockMat = createGroundShockwaveMaterial();
      const groundShockMesh = new THREE.Mesh(planeGeo, groundShockMat);
      groundShockMesh.rotation.x = -Math.PI / 2;
      groundShockMesh.visible = false;
      root.add(groundShockMesh);
      this.allMats.push(groundShockMat);

      const sparks: SparkParticleSlot[] = [];
      for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
        const sMat = createExplosiveSparkStreakMaterial();
        sMat.uniforms.uSeed.value = (i + 1) * 1.91;
        sMat.uniforms.uColor.value.set(i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#2dd4bf' : '#f472b6');
        sMat.uniforms.uCoreColor.value.set('#ffffff');
        const sMesh = new THREE.Mesh(planeGeo, sMat);
        sMesh.visible = false;
        root.add(sMesh);
        this.allMats.push(sMat);
        sparks.push({
          mesh: sMesh,
          mat: sMat,
          active: false,
          age: 0,
          life: 0.55,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseLen: 0.9,
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        impactFired: false,
        overdriveFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        skyClockMesh,
        skyClockMat,
        leftGearMesh,
        rightGearMesh,
        leftGearMat,
        rightGearMat,
        barrageBeats,
        oreFlashes,
        hourScytheMesh,
        minuteScytheMesh,
        hourScytheMat,
        minuteScytheMat,
        pillarMesh,
        pillarMat,
        climaxFlareMesh,
        climaxFlareMat,
        groundShockMesh,
        groundShockMat,
        sparks,
        onSlashBeatCallback: null,
        onImpactCallback: null,
      });
    }
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public getMaterials(): THREE.ShaderMaterial[] {
    return this.allMats;
  }

  private triggerOreFlash(inst: ClockworkSkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isAmber: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.24;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.9, pt.z + 0.15);
    f.mesh.scale.setScalar(scale * 0.4);
    f.mat.uniforms.uColor.value.set(isAmber ? '#fbbf24' : '#2dd4bf');
    f.mat.uniforms.uCoreColor.value.set(isAmber ? '#f472b6' : '#c084fc');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchSparkBurst(inst: ClockworkSkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.sparks.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.sparks[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.40 + ((i * 19) % 10) * 0.032;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.16;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 5) * 0.21;
      const spd = (5.4 + ((i * 31) % 10) * 0.65) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (3.2 + ((i * 23) % 10) * 0.62) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseLen = (0.72 + (i % 4) * 0.22) * Math.max(0.75, inst.areaScale);
      sp.mesh.position.copy(sp.pos);
      sp.mesh.visible = true;
      sp.mat.uniforms.uLocalLife.value = 0;
    }
  }

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts: readonly WorldPoint3[];
    onSlashBeat?: (beatIdx: number, pt: WorldPoint3) => void;
    onImpact?: () => void;
  }): void {
    const inst = this.instances.find((s) => !s.active) ?? this.instances[0];
    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.impactFired = false;
    inst.overdriveFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    inst.skyClockMesh.position.set(opts.cx, opts.cy + 3.4 * opts.areaScale, opts.cz - 1.45 * opts.areaScale);
    inst.skyClockMesh.scale.setScalar(0.01);
    inst.skyClockMat.uniforms.uProgress.value = 0;

    inst.leftGearMesh.position.set(opts.cx - 3.15 * opts.areaScale, opts.cy + 2.65 * opts.areaScale, opts.cz - 0.9 * opts.areaScale);
    inst.leftGearMesh.rotation.set(0.18, 0.34, 0);
    inst.leftGearMesh.scale.setScalar(0.01);
    inst.leftGearMat.uniforms.uProgress.value = 0;

    inst.rightGearMesh.position.set(opts.cx + 3.15 * opts.areaScale, opts.cy + 2.65 * opts.areaScale, opts.cz - 0.9 * opts.areaScale);
    inst.rightGearMesh.rotation.set(0.18, -0.34, 0);
    inst.rightGearMesh.scale.setScalar(0.01);
    inst.rightGearMat.uniforms.uProgress.value = 0;

    const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
    for (let i = 0; i < inst.barrageBeats.length; i++) {
      const slot = inst.barrageBeats[i];
      slot.beatFired = i >= beatLimit;
      slot.targetIndex = i % inst.pts.length;
      slot.delay = 0.22 + i * 0.068;
    }

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    inst.hourScytheMesh.position.set(opts.cx - 4.6 * opts.areaScale, opts.cy + 7.5, opts.cz);
    inst.hourScytheMesh.rotation.set(0.12, 0.08, 2.35);
    inst.hourScytheMesh.scale.setScalar(3.1 * Math.max(0.7, opts.areaScale));
    inst.hourScytheMesh.visible = false;

    inst.minuteScytheMesh.position.set(opts.cx + 4.6 * opts.areaScale, opts.cy + 7.5, opts.cz);
    inst.minuteScytheMesh.rotation.set(-0.12, -0.08, -2.35);
    inst.minuteScytheMesh.scale.setScalar(3.1 * Math.max(0.7, opts.areaScale));
    inst.minuteScytheMesh.visible = false;

    inst.pillarMesh.position.set(opts.cx, opts.cy + 0.12, opts.cz);
    inst.pillarMesh.scale.set(1.25 * opts.areaScale, 0.01, 1.25 * opts.areaScale);
    inst.pillarMesh.visible = false;

    inst.climaxFlareMesh.position.set(opts.cx, opts.cy + 1.35, opts.cz + 0.25);
    inst.climaxFlareMesh.scale.setScalar(0.01);
    inst.climaxFlareMesh.visible = false;

    inst.groundShockMesh.position.set(opts.cx, opts.cy + 0.18, opts.cz);
    inst.groundShockMesh.scale.setScalar(11.6 * opts.areaScale);
    inst.groundShockMesh.visible = false;

    for (let i = 0; i < inst.sparks.length; i++) {
      inst.sparks[i].active = false;
      inst.sparks[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.86, '#05040d', 1.28);
    this.hooks.onSpeedLines?.(0.82, 0.42);
  }

  public update(dtSec: number, timeSec: number): void {
    const dt = Math.min(0.1, Math.max(0, dtSec));
    for (let p = 0; p < this.instances.length; p++) {
      const inst = this.instances[p];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer = Math.max(0, inst.hitStopTimer - dt);
        continue;
      }

      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);

      // Instant snap-in for Sky-Clock & Flanking Gears (reaches full scale in 0.12s!)
      const snapIn = 1 - Math.pow(1 - Math.min(1, inst.elapsed / 0.12), 4);
      inst.skyClockMesh.scale.setScalar(7.6 * inst.areaScale * Math.max(0.05, snapIn));
      inst.skyClockMat.uniforms.uProgress.value = uProgress;
      inst.skyClockMat.uniforms.uTime.value = timeSec;

      const gearS = 2.15 * snapIn * Math.max(0.75, inst.areaScale);
      inst.leftGearMesh.scale.setScalar(Math.max(0.01, gearS));
      inst.rightGearMesh.scale.setScalar(Math.max(0.01, gearS));
      const spinMult = uProgress >= 0.20 && uProgress <= 0.29 ? 0.08 : 1.0;
      inst.leftGearMesh.rotation.z += 5.8 * spinMult * dt;
      inst.rightGearMesh.rotation.z -= 5.8 * spinMult * dt;
      inst.leftGearMat.uniforms.uProgress.value = uProgress;
      inst.leftGearMat.uniforms.uTime.value = timeSec;
      inst.rightGearMat.uniforms.uProgress.value = uProgress;
      inst.rightGearMat.uniforms.uTime.value = timeSec;

      // ACT 1 (0.22s -> 0.62s): Snappy 6-Hit Per-Ore Hit Flashes, Sparks & Lightning (slash shaders removed)
      const beatLimit = this.lowQuality ? 3 : BARRAGE_BEAT_COUNT;
      for (let i = 0; i < beatLimit; i++) {
        const slot = inst.barrageBeats[i];
        if (inst.elapsed < slot.delay) continue;
        if (!slot.beatFired) {
          slot.beatFired = true;
          const pt = inst.pts[slot.targetIndex];
          this.triggerOreFlash(inst, i, pt, 3.2 * inst.areaScale, i % 2 === 0);
          this.tmpTargetPos.set(pt.x, pt.y + 0.88, pt.z);
          this.launchSparkBurst(inst, this.tmpTargetPos, (i * 2) % 12, 2, 0.88);
          inst.onSlashBeatCallback?.(i, pt);
        }
      }

      // ACT 2 (0.60s -> 0.76s): Violent easeInExpo Twin Great-Scythe Slam!
      if (inst.elapsed >= 0.56) {
        inst.hourScytheMesh.visible = true;
        inst.minuteScytheMesh.visible = true;
        const bt = Math.min(1, (inst.elapsed - 0.56) / 0.18);
        const slamExpo = bt === 0 ? 0 : Math.pow(2, 8 * (bt - 1));
        const as = inst.areaScale;
        const tremor = bt >= 1 ? Math.sin(timeSec * 82.0) * 0.06 * Math.max(0, 1 - (inst.elapsed - 0.74) * 2.5) : 0;

        inst.hourScytheMesh.position.set(
          THREE.MathUtils.lerp(inst.cx - 4.6 * as, inst.cx - 0.35 * as, slamExpo) + tremor,
          THREE.MathUtils.lerp(inst.cy + 7.5, inst.cy + 0.75, slamExpo),
          inst.cz + 0.15
        );
        inst.hourScytheMesh.rotation.set(0.12, 0.08, THREE.MathUtils.lerp(2.35, -0.62, slamExpo));

        inst.minuteScytheMesh.position.set(
          THREE.MathUtils.lerp(inst.cx + 4.6 * as, inst.cx + 0.35 * as, slamExpo) - tremor,
          THREE.MathUtils.lerp(inst.cy + 7.5, inst.cy + 0.75, slamExpo),
          inst.cz + 0.15
        );
        inst.minuteScytheMesh.rotation.set(-0.12, -0.08, THREE.MathUtils.lerp(-2.35, 0.62, slamExpo));

        inst.hourScytheMat.uniforms.uProgress.value = uProgress;
        inst.hourScytheMat.uniforms.uTime.value = timeSec;
        inst.minuteScytheMat.uniforms.uProgress.value = uProgress;
        inst.minuteScytheMat.uniforms.uTime.value = timeSec;
      }

      // 12:00 Midnight Execution (0.74s): Hit-Stop + Impact Frame + Judgment Pillar + Spark Fountain!
      if (!inst.impactFired && inst.elapsed >= 0.74) {
        inst.impactFired = true;
        inst.hitStopTimer = 0.056;
        this.tmpTargetPos.set(inst.cx, inst.cy + 0.95, inst.cz);
        this.launchSparkBurst(inst, this.tmpTargetPos, 12, this.lowQuality ? 10 : 18, 1.45);
        this.hooks.onImpactFrame?.(1.0, 1.0, '#2dd4bf', 0.075);
        this.hooks.onSpeedLines?.(1.0, 0.58);
        this.hooks.onCameraPush?.(0.38, 0.055);
        this.hooks.onFlash?.('#fef08a', 0.65);
        inst.onImpactCallback?.();
      }

      // ACT 3 (1.05s): Time-Resume Secondary Chain Detonation on all ores!
      if (!inst.overdriveFired && inst.elapsed >= 1.05) {
        inst.overdriveFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.0, inst.cz);
        this.launchSparkBurst(inst, this.tmpTargetPos, 30, this.lowQuality ? 4 : 6, 1.25);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 3.8 * inst.areaScale, i % 2 === 1);
        }
        this.hooks.onImpactFrame?.(0.85, 0.0, '#fbbf24', 0.045);
        this.hooks.onSpeedLines?.(0.95, 0.35);
        inst.onImpactCallback?.();
      }

      if (uProgress >= 0.29) {
        const boomT = Math.min(1, (uProgress - 0.29) / 0.16);
        const boomEase = 1 - Math.pow(1 - boomT, 4);

        inst.pillarMesh.visible = true;
        inst.pillarMesh.scale.set(
          (0.9 + 0.75 * boomEase) * inst.areaScale,
          Math.max(0.1, boomEase * 1.15),
          (0.9 + 0.75 * boomEase) * inst.areaScale
        );
        inst.pillarMesh.rotation.y += 4.5 * dt;
        inst.pillarMat.uniforms.uProgress.value = uProgress;
        inst.pillarMat.uniforms.uTime.value = timeSec;

        inst.climaxFlareMesh.visible = true;
        inst.climaxFlareMesh.scale.setScalar((3.5 + 7.5 * boomEase) * inst.areaScale);
        inst.climaxFlareMat.uniforms.uProgress.value = uProgress;
        inst.climaxFlareMat.uniforms.uLocalT.value = Math.min(1, (inst.elapsed - 0.72) / 0.55);

        inst.groundShockMesh.visible = true;
        inst.groundShockMat.uniforms.uProgress.value = uProgress;
        inst.groundShockMat.uniforms.uTime.value = timeSec;
      }

      // Update Per-Ore Hit Flashes
      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 2.5), 3);
        f.mesh.scale.setScalar(f.baseScale * (0.4 + 0.8 * pop));
        f.mat.uniforms.uProgress.value = uProgress;
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      // Update Ballistic Explosive Spark Streaks
      for (let i = 0; i < inst.sparks.length; i++) {
        const sp = inst.sparks[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 11.0 * dt;
        sp.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.44;
        }
        sp.mesh.position.copy(sp.pos);
        const speedMag = sp.vel.length();
        const stretch = Math.min(1.8, 0.4 + speedMag * 0.16);
        sp.mesh.scale.set(sp.baseLen * stretch, sp.baseLen * 0.36, 1);
        sp.mesh.rotation.set(-0.35, Math.atan2(sp.vel.x, sp.vel.z), Math.atan2(sp.vel.y, Math.hypot(sp.vel.x, sp.vel.z)));
        sp.mat.uniforms.uProgress.value = uProgress;
        sp.mat.uniforms.uLocalLife.value = lp;
        if (lp >= 1) {
          sp.active = false;
          sp.mesh.visible = false;
        }
      }

      if (inst.elapsed >= SKILL_DURATION_SEC) {
        inst.active = false;
        inst.root.visible = false;
      }
    }
  }

  public clear(): void {
    for (let i = 0; i < this.instances.length; i++) {
      this.instances[i].active = false;
      this.instances[i].root.visible = false;
      this.instances[i].onSlashBeatCallback = null;
      this.instances[i].onImpactCallback = null;
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) {
      this.allMats[i].dispose();
    }
    for (let i = 0; i < this.sharedGeos.length; i++) {
      this.sharedGeos[i].dispose();
    }
  }
}
