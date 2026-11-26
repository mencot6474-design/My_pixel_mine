import * as THREE from 'three';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const IMPACT_TIME_SEC = 0.80;
const HIT_STOP_DURATION_SEC = 0.09;
const POOL_SIZE = 2;
const FAN_CARD_COUNT = 10;
const SHOCK_RING_COUNT = 2;
const CASCADE_CARD_COUNT = 14;
const SPARK_COUNT = 18;

const SCARLET_ARCANA_GLSL = `
  float saHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 43.17);
    return fract(p.x * p.y);
  }
  float saVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(saHash21(i), saHash21(i + vec2(1.0, 0.0)), f.x),
      mix(saHash21(i + vec2(0.0, 1.0)), saHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float saFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 2; i++) {
      v += saVnoise(p) * a;
      p = rot * p * 2.09 + vec2(1.7, 4.3);
      a *= 0.5;
    }
    return v;
  }
  float saSegmentDist(vec2 p, vec2 a, vec2 b, float drawFrac) {
    vec2 ab = b - a;
    float lenSq = max(dot(ab, ab), 0.0001);
    float t = clamp(dot(p - a, ab) / lenSq, 0.0, clamp(drawFrac, 0.0, 1.0));
    return length(p - (a + ab * t));
  }
  float saEightPointStar(vec2 p, float scale) {
    vec2 q = p * scale;
    float s1 = exp(-abs(q.x) * 14.0) * exp(-abs(q.y) * 2.4)
             + exp(-abs(q.y) * 14.0) * exp(-abs(q.x) * 2.4);
    vec2 d = vec2(q.x + q.y, q.x - q.y) * 0.7071;
    float s2 = (exp(-abs(d.x) * 18.0) * exp(-abs(d.y) * 4.2)
              + exp(-abs(d.y) * 18.0) * exp(-abs(d.x) * 4.2)) * 0.58;
    float core = exp(-length(q) * 5.8);
    return clamp(s1 + s2 + core * 0.85, 0.0, 2.5);
  }
`;

/** Back-attachment Halo Disc for Scarlet Arcana: glowing crimson pentagram circle + 8-pt star core. */
export function createScarletArcanaHaloShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uOpacity;
      varying vec2 vUv;
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float edgeFade = 1.0 - smoothstep(0.86, 0.99, r);

        float cycle = fract(uTime * 0.4);
        float surge = smoothstep(0.08, 0.34, cycle) * (1.0 - smoothstep(0.66, 0.96, cycle));

        // Subtle rotation of the 5-pointed pentagram inscribed inside double crimson rings
        float rot = uTime * 0.28;
        float c = cos(rot);
        float s = sin(rot);
        vec2 rp = mat2(c, -s, s, c) * p;

        float rad = 0.78;
        vec2 v0 = vec2(cos(1.5708), sin(1.5708)) * rad;
        vec2 v1 = vec2(cos(1.5708 + 1.2566), sin(1.5708 + 1.2566)) * rad;
        vec2 v2 = vec2(cos(1.5708 + 2.5133), sin(1.5708 + 2.5133)) * rad;
        vec2 v3 = vec2(cos(1.5708 + 3.7699), sin(1.5708 + 3.7699)) * rad;
        vec2 v4 = vec2(cos(1.5708 + 5.0265), sin(1.5708 + 5.0265)) * rad;

        float dStar = saSegmentDist(rp, v0, v2, 1.0);
        dStar = min(dStar, saSegmentDist(rp, v2, v4, 1.0));
        dStar = min(dStar, saSegmentDist(rp, v4, v1, 1.0));
        dStar = min(dStar, saSegmentDist(rp, v1, v3, 1.0));
        dStar = min(dStar, saSegmentDist(rp, v3, v0, 1.0));

        float starLine = smoothstep(0.052, 0.012, dStar);
        float outerRing = exp(-abs(r - 0.80) * 32.0);
        float innerRing = exp(-abs(r - 0.68) * 38.0) * 0.72;
        float ticks = pow(max(0.0, cos((ang - rot) * 10.0)), 14.0) * smoothstep(0.66, 0.72, r) * (1.0 - smoothstep(0.78, 0.83, r));
        float mist = saFbm(p * 3.4 - vec2(0.0, uTime * 0.65)) * (1.0 - smoothstep(0.12, 0.82, r));
        float centerStar = saEightPointStar(rp, 2.2) * 0.45;

        vec3 crimson = vec3(0.92, 0.08, 0.24);
        vec3 roseBright = vec3(1.0, 0.36, 0.52);
        vec3 ivoryGold = vec3(1.0, 0.92, 0.86);

        vec3 col = crimson * (mist * 0.75 + outerRing * 0.9 + innerRing * 0.8 + starLine * 1.15);
        col += roseBright * (ticks * 0.95 + centerStar * 0.65);
        col += ivoryGold * (pow(starLine, 2.0) * 0.85 + pow(outerRing, 2.0) * 0.75);
        col *= 1.0 + surge * 0.35;

        float alpha = clamp((starLine * 0.88 + outerRing * 0.82 + innerRing * 0.55 + ticks * 0.5 + mist * 0.28 + centerStar * 0.35) * edgeFade * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Back-attachment Procedural Crimson Tarot Card Shader (double frame + 8-point scarlet star emblem). */
export function createScarletTarotCardBackShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uOpacity;
      varying vec2 vUv;
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 edge = min(vUv, 1.0 - vUv);
        float minE = min(edge.x, edge.y);
        float outerBorder = 1.0 - smoothstep(0.04, 0.095, minE);
        float innerFrame = exp(-abs(minE - 0.135) * 48.0);

        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 0.68;
        float star = saEightPointStar(p, 1.45);
        float shimmer = exp(-abs((vUv.x + vUv.y * 0.75) - fract(uTime * 0.42) * 2.4 + 0.3) * 14.0);
        float velvet = saFbm(vUv * 4.5 + vec2(0.0, uTime * 0.35));

        // 4 tiny corner cross marks
        vec2 cPos = abs(vUv - 0.5) - vec2(0.32, 0.34);
        float cornerCross = (exp(-abs(cPos.x) * 65.0) * exp(-abs(cPos.y) * 18.0)
                           + exp(-abs(cPos.y) * 65.0) * exp(-abs(cPos.x) * 18.0)) * 0.85;

        vec3 interior = mix(vec3(0.24, 0.02, 0.08), vec3(0.55, 0.05, 0.16), velvet);
        vec3 col = interior * 0.85;
        col += vec3(0.96, 0.14, 0.32) * (outerBorder * 1.15 + innerFrame * 0.9 + star * 0.95 + cornerCross);
        col += vec3(1.0, 0.88, 0.62) * (outerBorder * 0.45 + pow(star, 1.6) * 0.55 + shimmer * 0.55);

        float alpha = clamp((0.72 + outerBorder * 0.28 + star * 0.25) * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Back-attachment 4-point Scarlet Star-Pin Shader. */
export function createScarletBackStarPinShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float pulse = 0.85 + 0.15 * sin(uTime * 5.2);
        float ray = exp(-abs(p.x) * 9.0) * exp(-abs(p.y) * 2.0)
                  + exp(-abs(p.y) * 9.0) * exp(-abs(p.x) * 2.0);
        float core = exp(-length(p) * 4.5);
        vec3 col = mix(vec3(0.98, 0.18, 0.36), vec3(1.0, 0.94, 0.86), clamp(core * 1.1, 0.0, 1.0)) * (ray + core) * pulse;
        float alpha = clamp((ray * 0.9 + core) * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Crisp 3D Tarot Card slab geometry for Scarlet Arcana back-attachment. */
export function createScarletTarotCardGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(0.42, 0.68, 0.025);
}

/** Faceted 4-point Scarlet Star-Pin geometry with clean 0..1 UVs. */
export function createScarletStarPinGeometry(): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(0.48, 0.48);
}

/** Layer 1: Cardcaptor Sakura 5-Stroke Animated Pentagram Seal Floor. */
function createPentagramSealFloorMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uDraw: { value: 0 },
      uImpact: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uDraw;
      uniform float uImpact;
      uniform float uOpacity;
      varying vec2 vUv;
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float edgeMask = 1.0 - smoothstep(0.86, 0.99, r);

        // 5 pentagram vertices inscribed at r = 0.80
        float rad = 0.80;
        vec2 v0 = vec2(cos(1.5708), sin(1.5708)) * rad;
        vec2 v1 = vec2(cos(1.5708 + 1.2566), sin(1.5708 + 1.2566)) * rad;
        vec2 v2 = vec2(cos(1.5708 + 2.5133), sin(1.5708 + 2.5133)) * rad;
        vec2 v3 = vec2(cos(1.5708 + 3.7699), sin(1.5708 + 3.7699)) * rad;
        vec2 v4 = vec2(cos(1.5708 + 5.0265), sin(1.5708 + 5.0265)) * rad;

        // Sequential 5-stroke tracing: stroke i draws during uDraw in [i*0.2 .. (i+1)*0.2]
        float s0 = clamp(uDraw * 5.0, 0.0, 1.0);
        float s1 = clamp(uDraw * 5.0 - 1.0, 0.0, 1.0);
        float s2 = clamp(uDraw * 5.0 - 2.0, 0.0, 1.0);
        float s3 = clamp(uDraw * 5.0 - 3.0, 0.0, 1.0);
        float s4 = clamp(uDraw * 5.0 - 4.0, 0.0, 1.0);

        float dLines = 10.0;
        if (s0 > 0.001) dLines = min(dLines, saSegmentDist(p, v0, v2, s0));
        if (s1 > 0.001) dLines = min(dLines, saSegmentDist(p, v2, v4, s1));
        if (s2 > 0.001) dLines = min(dLines, saSegmentDist(p, v4, v1, s2));
        if (s3 > 0.001) dLines = min(dLines, saSegmentDist(p, v1, v3, s3));
        if (s4 > 0.001) dLines = min(dLines, saSegmentDist(p, v3, v0, s4));

        float pentagramGlow = exp(-dLines * 26.0);
        float pentagramCore = smoothstep(0.036, 0.009, dLines);

        // Sweeping outer double circle + 10 occult tick marks
        float circleReveal = smoothstep(0.0, 0.25, uDraw);
        float outerRing = exp(-abs(r - 0.82) * 30.0) * circleReveal;
        float innerRing = exp(-abs(r - 0.72) * 34.0) * 0.65 * circleReveal;
        float ticks = pow(max(0.0, cos(ang * 10.0)), 14.0) * smoothstep(0.70, 0.74, r) * (1.0 - smoothstep(0.80, 0.84, r)) * circleReveal;

        float mist = saFbm(p * 3.2 - vec2(0.0, uTime * 0.8)) * (1.0 - smoothstep(0.10, 0.84, r)) * circleReveal;
        float dissolveNoise = saFbm(p * 4.4 + vec2(uTime * 0.35, -uTime * 0.25));
        float dissolveFade = 1.0 - smoothstep(0.68, 0.98, uProgress + (dissolveNoise - 0.5) * 0.22);

        float impactBoost = 1.0 + uImpact * 1.15;
        vec3 col = vec3(0.92, 0.06, 0.24) * (pentagramGlow * 1.15 + outerRing * 0.95 + innerRing + ticks * 0.85 + mist * 0.42);
        col += vec3(1.0, 0.86, 0.68) * (pentagramCore * 1.05 + pow(outerRing, 2.0) * 0.75) * impactBoost;
        col += vec3(1.0, 0.98, 0.96) * (pentagramCore * uImpact * 1.1);

        float alpha = clamp((pentagramGlow * 0.92 + outerRing * 0.85 + innerRing * 0.55 + ticks * 0.45 + mist * 0.32) * edgeMask * dissolveFade * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Layer 2 & 6: Skill Tarot Card Material (Persona 5 Arcana Fan & Cascade Cards). */
function createSkillTarotCardMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlipFlash: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uFlipFlash;
      uniform float uOpacity;
      varying vec2 vUv;
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 edge = min(vUv, 1.0 - vUv);
        float minE = min(edge.x, edge.y);
        float border = 1.0 - smoothstep(0.035, 0.088, minE);
        float innerLine = exp(-abs(minE - 0.13) * 52.0);

        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 0.64;
        float star = saEightPointStar(p, 1.48);

        vec2 cPos = abs(vUv - 0.5) - vec2(0.32, 0.34);
        float cornerCross = (exp(-abs(cPos.x) * 65.0) * exp(-abs(cPos.y) * 18.0)
                           + exp(-abs(cPos.y) * 65.0) * exp(-abs(cPos.x) * 18.0)) * 0.8;

        float velvet = saFbm(vUv * 4.0 + vec2(0.0, uTime * 0.5));
        vec3 baseCol = mix(vec3(0.26, 0.02, 0.09), vec3(0.62, 0.06, 0.18), velvet);
        vec3 col = baseCol * 0.88;
        col += vec3(0.98, 0.12, 0.30) * (border * 1.25 + innerLine * 0.95 + star * 1.05 + cornerCross);
        col += vec3(1.0, 0.90, 0.65) * (border * 0.5 + pow(star, 1.6) * 0.65);
        col += vec3(1.0, 0.96, 0.94) * uFlipFlash * 1.35;

        float alpha = clamp((0.76 + border * 0.24 + uFlipFlash * 0.24) * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Layer 3: Giant Arcana Card Slam Material (vertex wind-bow + 8-pt scarlet star + FBM burn-out). */
function createGiantArcanaCardMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDropVel: { value: 0 },
      uImpact: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      uniform float uDropVel;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Subtle aerodynamic flex along the card face during guillotine descent
        float edgeBend = (abs(uv.x - 0.5) * 2.0) * (abs(uv.y - 0.5) * 2.0);
        pos.z -= edgeBend * uDropVel * 0.36;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDropVel;
      uniform float uImpact;
      uniform float uOpacity;
      varying vec2 vUv;
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 edge = min(vUv, 1.0 - vUv);
        float minE = min(edge.x, edge.y);
        float outerBorder = 1.0 - smoothstep(0.032, 0.078, minE);
        float innerBorder = exp(-abs(minE - 0.118) * 58.0);
        float innerFrame2 = exp(-abs(minE - 0.155) * 65.0) * 0.55;

        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 0.64;
        float r = length(p);
        float star = saEightPointStar(p, 1.32);
        float halo = exp(-abs(r - 0.42) * 24.0) * 0.72;

        // 4 tarot corner crosses
        vec2 cPos = abs(vUv - 0.5) - vec2(0.34, 0.36);
        float cornerCross = (exp(-abs(cPos.x) * 70.0) * exp(-abs(cPos.y) * 18.0)
                           + exp(-abs(cPos.y) * 70.0) * exp(-abs(cPos.x) * 18.0)) * 0.95;

        float velvet = saFbm(vUv * 5.0 - vec2(0.0, uTime * 1.1));
        float burnNoise = saFbm(vUv * 6.2 + vec2(uTime * 0.6, -uTime * 0.9));

        // Dramatic fracture cracks & white-crimson shatter flash on impact (BOOM PECAH!)
        float crackGrid = abs(sin((vUv.x * 5.2 + vUv.y * 3.1 + burnNoise * 1.4) * 3.14159))
                        * abs(sin((vUv.x * 2.7 - vUv.y * 6.4 + burnNoise * 1.2) * 3.14159));
        float crackLine = exp(-crackGrid * 18.0) * step(0.02, uImpact);
        float shatterMask = 1.0 - smoothstep(0.45, 0.98, uImpact + (burnNoise - 0.5) * 0.35);

        vec3 interior = mix(vec3(0.28, 0.02, 0.10), vec3(0.72, 0.06, 0.20), velvet);
        vec3 col = interior * 0.88;
        col += vec3(0.98, 0.10, 0.28) * (outerBorder * 1.35 + innerBorder * 1.05 + innerFrame2 + halo + star * 1.2 + cornerCross);
        col += vec3(1.0, 0.88, 0.58) * (outerBorder * 0.55 + pow(star, 1.65) * 0.85 + crackLine * 1.6);
        col += vec3(1.0, 0.98, 0.96) * (pow(star, 2.2) * (0.6 + uDropVel * 0.75) + crackLine * 1.8 + uImpact * 1.35);

        float alpha = clamp((0.84 + outerBorder * 0.16 + star * 0.22 + crackLine * 0.85) * shatterMask * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Layer 4: Spiky 5-Major + 5-Minor Crimson Starburst Impact (matches attack.webp, zero vertical pillar). */
function createCrimsonStarburstMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
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
      ${SCARLET_ARCANA_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        // 5 major razor spikes + 5 alternating minor spikes like anime impact bursts
        float majorSpikes = pow(max(0.0, cos(ang * 5.0 - 1.5708)), 5.0);
        float minorSpikes = pow(max(0.0, cos(ang * 5.0 - 1.5708 + 3.14159)), 7.0) * 0.62;
        float spikeReach = 0.36 + majorSpikes * 0.60 + minorSpikes * 0.42;

        float n = saFbm(vec2(ang * 3.0, r * 4.5 - uTime * 3.2));
        float burstBody = smoothstep(spikeReach + 0.05, spikeReach - 0.14, r - (n - 0.5) * 0.08);
        float burstRim = exp(-abs(r - spikeReach) * 26.0);
        float innerCore = exp(-r * 4.2);

        // Radial sakuga streak lines
        float streaks = pow(max(0.0, cos(ang * 15.0 + uTime * 1.4)), 10.0) * (1.0 - smoothstep(0.15, 0.94, r));

        vec3 crimson = vec3(0.96, 0.08, 0.26);
        vec3 hotRose = vec3(1.0, 0.42, 0.56);
        vec3 whiteGold = vec3(1.0, 0.96, 0.90);

        vec3 col = crimson * (burstBody * 0.85 + burstRim * 1.25 + streaks * 0.75);
        col += hotRose * (burstBody * innerCore * 1.1 + burstRim * 0.6);
        col += whiteGold * (innerCore * 1.65 + pow(burstRim, 2.0) * 0.95);

        float edgeFade = 1.0 - smoothstep(0.90, 0.99, r);
        float alpha = clamp((burstBody * 0.82 + burstRim * 0.95 + innerCore * 0.9 + streaks * 0.42) * edgeFade * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Layer 5: Expanding 5-Star-Edged Crimson Shockwave Ring. */
function createPentagramShockRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
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
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float edgeMask = 1.0 - smoothstep(0.88, 0.99, r);

        float starMod = 0.055 * cos(ang * 5.0 - 1.5708);
        float ring = exp(-abs(r - (0.78 + starMod)) * 30.0);
        float trail = exp(-abs(r - (0.68 + starMod * 0.7)) * 15.0) * 0.45;
        vec3 col = vec3(0.98, 0.10, 0.28) * (ring + trail) + vec3(1.0, 0.92, 0.86) * pow(ring, 2.0) * 1.25;

        float alpha = clamp((ring + trail) * edgeMask * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Layer 6B: Crimson-Gold Arcana Spark Material. */
function createScarletSparkMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
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
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float spark = exp(-abs(p.x) * 8.0) * exp(-abs(p.y) * 2.4)
                    + exp(-abs(p.y) * 8.0) * exp(-abs(p.x) * 2.4);
        vec3 col = mix(vec3(0.98, 0.14, 0.34), vec3(1.0, 0.92, 0.68), clamp(spark * 0.7, 0.0, 1.0));
        float alpha = clamp(spark * uOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

interface FanCardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  ringAngle: number;
  ringRadius: number;
  dropDelay: number;
  tiltZ: number;
}

interface CascadeCardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
  spinX: number;
  spinY: number;
  spinZ: number;
}

interface SparkSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  angle: number;
  speed: number;
  ySpeed: number;
}

interface ScarletArcanaInstance {
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  impactFired: boolean;
  onImpactCallback: (() => void) | null;
  root: THREE.Group;
  floorMesh: THREE.Mesh;
  floorMat: THREE.ShaderMaterial;
  fanCards: FanCardSlot[];
  giantCardMesh: THREE.Mesh;
  giantCardMat: THREE.ShaderMaterial;
  starburstMesh: THREE.Mesh;
  starburstMat: THREE.ShaderMaterial;
  rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }>;
  cascadeCards: CascadeCardSlot[];
  sparks: SparkSlot[];
}

/** Angular fractured tarot-card shard geometry with clean 0..1 UVs for the shatter explosion. */
function createShatteredCardShardGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.36, -0.52, 0,
     0.32, -0.24, 0,
     0.42,  0.48, 0,
    -0.22,  0.56, 0,
  ]);
  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.22,
    1.0, 1.0,
    0.12, 1.0,
  ]);
  const indices = [0, 1, 2, 0, 2, 3];
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Dedicated 2.5s Sakuga Skill Pool for Scarlet Arcana (`crimson-tarot-witch`, Tier NOVEL).
 * Concept: Sequential sky-drop small tarot cards slamming into the pentagram ring,
 * followed by the final Giant Tarot Card plummeting from high sky and shattering in a crimson starburst boom.
 */
export class ScarletArcanaSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly instances: ScarletArcanaInstance[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    this.group.name = 'scarletArcanaSkillPool';

    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const fanCardGeo = new THREE.PlaneGeometry(1.18, 1.92);
    const giantCardGeo = new THREE.PlaneGeometry(5.0, 7.8, 8, 12);
    const starburstGeo = new THREE.PlaneGeometry(1, 1);
    starburstGeo.rotateX(-Math.PI / 2);
    const shockGeo = new THREE.PlaneGeometry(1, 1);
    shockGeo.rotateX(-Math.PI / 2);
    const cascadeCardGeo = createShatteredCardShardGeometry();
    const sparkGeo = new THREE.PlaneGeometry(0.34, 0.84);
    this.sharedGeos.push(floorGeo, fanCardGeo, giantCardGeo, starburstGeo, shockGeo, cascadeCardGeo, sparkGeo);

    for (let i = 0; i < POOL_SIZE; i++) {
      const root = new THREE.Group();
      root.visible = false;
      this.group.add(root);

      const floorMat = createPentagramSealFloorMaterial();
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.name = 'pentagramSealFloor';
      floorMesh.position.y = 0.06;
      root.add(floorMesh);
      this.allMats.push(floorMat);

      const fanCards: FanCardSlot[] = [];
      for (let f = 0; f < FAN_CARD_COUNT; f++) {
        const mat = createSkillTarotCardMaterial();
        const mesh = new THREE.Mesh(fanCardGeo, mat);
        mesh.name = 'tarotFanCard';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        fanCards.push({
          mesh,
          mat,
          ringAngle: (f / FAN_CARD_COUNT) * Math.PI * 2 - Math.PI * 0.5,
          ringRadius: 4.1 + (f % 2) * 0.75,
          dropDelay: 0.02 + f * 0.042,
          tiltZ: (f % 2 === 0 ? 1 : -1) * 0.14,
        });
      }

      const giantCardMat = createGiantArcanaCardMaterial();
      const giantCardMesh = new THREE.Mesh(giantCardGeo, giantCardMat);
      giantCardMesh.name = 'giantArcanaCard';
      giantCardMesh.visible = false;
      root.add(giantCardMesh);
      this.allMats.push(giantCardMat);

      const starburstMat = createCrimsonStarburstMaterial();
      const starburstMesh = new THREE.Mesh(starburstGeo, starburstMat);
      starburstMesh.name = 'crimsonStarburst';
      starburstMesh.visible = false;
      root.add(starburstMesh);
      this.allMats.push(starburstMat);

      const rings: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; delay: number }> = [];
      for (let r = 0; r < SHOCK_RING_COUNT; r++) {
        const mat = createPentagramShockRingMaterial();
        const mesh = new THREE.Mesh(shockGeo, mat);
        mesh.name = 'pentagramShockRing';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        rings.push({ mesh, mat, delay: IMPACT_TIME_SEC + r * 0.17 });
      }

      const cascadeCards: CascadeCardSlot[] = [];
      for (let c = 0; c < CASCADE_CARD_COUNT; c++) {
        const mat = createSkillTarotCardMaterial();
        const mesh = new THREE.Mesh(cascadeCardGeo, mat);
        mesh.name = 'cascadeCard';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        cascadeCards.push({
          mesh,
          mat,
          angle: (c / CASCADE_CARD_COUNT) * Math.PI * 2 + (c % 2) * 0.24,
          speed: 3.1 + (c % 5) * 0.85,
          ySpeed: 4.8 + (c % 4) * 1.15,
          spinX: 3.2 + (c % 3) * 1.1,
          spinY: 4.6 + (c % 4) * 0.9,
          spinZ: 2.4 + (c % 5) * 0.7,
        });
      }

      const sparks: SparkSlot[] = [];
      for (let k = 0; k < SPARK_COUNT; k++) {
        const mat = createScarletSparkMaterial();
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.name = 'scarletSpark';
        mesh.visible = false;
        root.add(mesh);
        this.allMats.push(mat);
        sparks.push({
          mesh,
          mat,
          angle: (k / SPARK_COUNT) * Math.PI * 2 + 0.14,
          speed: 3.6 + (k % 5) * 1.05,
          ySpeed: 4.2 + (k % 4) * 1.25,
        });
      }

      this.instances.push({
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        impactFired: false,
        onImpactCallback: null,
        root,
        floorMesh,
        floorMat,
        fanCards,
        giantCardMesh,
        giantCardMat,
        starburstMesh,
        starburstMat,
        rings,
        cascadeCards,
        sparks,
      });
    }
  }

  public getMaterials(): THREE.ShaderMaterial[] {
    return this.allMats;
  }

  public setHooks(hooks: TierVfxHooks): void {
    this.hooks = hooks;
  }

  public setLowQuality(low: boolean): void {
    this.lowQuality = low;
  }

  public fire(opts: {
    cx: number;
    cy: number;
    cz: number;
    areaScale: number;
    pts?: readonly WorldPoint3[];
    onImpact?: () => void;
  }): void {
    let inst = this.instances.find((x) => !x.active);
    if (!inst) {
      inst = this.instances.reduce((a, b) => (a.elapsed >= b.elapsed ? a : b));
    }
    inst.active = true;
    inst.elapsed = 0;
    inst.hitStopTimer = 0;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.impactFired = false;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;
    inst.floorMesh.position.set(opts.cx, opts.cy + 0.06, opts.cz);
    inst.floorMesh.scale.setScalar(14.6 * opts.areaScale);
    inst.fanCards.forEach((f) => {
      f.mesh.visible = false;
    });
    inst.giantCardMesh.visible = false;
    inst.starburstMesh.visible = false;
    inst.rings.forEach((r) => {
      r.mesh.visible = false;
    });
    inst.cascadeCards.forEach((c) => {
      c.mesh.visible = false;
    });
    inst.sparks.forEach((s) => {
      s.mesh.visible = false;
    });
  }

  public update(dtSec: number, timeSec: number): void {
    for (let idx = 0; idx < this.instances.length; idx++) {
      const inst = this.instances[idx];
      if (!inst.active) continue;

      if (inst.hitStopTimer > 0) {
        inst.hitStopTimer -= dtSec;
        continue;
      }

      const dt = Math.min(0.05, dtSec);
      inst.elapsed += dt;
      const uProgress = Math.min(1, inst.elapsed / SKILL_DURATION_SEC);
      const as = inst.areaScale;

      // 1. 5-Stroke Pentagram Seal Floor
      const drawFrac = Math.min(1, inst.elapsed / 0.38);
      const floorImpact =
        inst.elapsed >= IMPACT_TIME_SEC
          ? Math.max(0, 1 - (inst.elapsed - IMPACT_TIME_SEC) / 0.48)
          : 0;
      inst.floorMat.uniforms.uTime.value = timeSec;
      inst.floorMat.uniforms.uProgress.value = uProgress;
      inst.floorMat.uniforms.uDraw.value = drawFrac;
      inst.floorMat.uniforms.uImpact.value = floorImpact;
      inst.floorMat.uniforms.uOpacity.value = 1;
      inst.floorMesh.rotation.y += dt * 0.22;

      // 2. Act 1: 10 (or 5 Low) Small Tarot Cards plummet sequentially from high sky and slam into the ground
      const fanLimit = this.lowQuality ? 5 : FAN_CARD_COUNT;
      const dropStepSec = this.lowQuality ? 0.078 : 0.042;
      if (inst.elapsed < IMPACT_TIME_SEC + 0.04) {
        for (let f = 0; f < FAN_CARD_COUNT; f++) {
          const fc = inst.fanCards[f];
          if (f >= fanLimit) {
            fc.mesh.visible = false;
            continue;
          }

          const delay = 0.02 + f * dropStepSec;
          const localT = inst.elapsed - delay;
          if (localT < 0) {
            fc.mesh.visible = false;
            continue;
          }

          const dropDur = 0.18;
          const fallT = Math.min(1, localT / dropDur);
          const fallEase = fallT * fallT * fallT; // Heavy sky-drop acceleration
          const landedTime = Math.max(0, localT - dropDur);

          // Drop from high sky (y = 12.2 * as) straight into the pit floor (y = 0.92 * as)
          const startY = 12.2 * as;
          const groundY = 0.92 * as;
          const yPos = inst.cy + startY + (groundY - startY) * fallEase;

          // Brief recoil squash + impact flash right when this small card slams the ground
          const settle = landedTime > 0 && landedTime < 0.14 ? Math.sin((landedTime / 0.14) * Math.PI) : 0;
          const landFlash = landedTime > 0 ? Math.max(0, 1 - landedTime / 0.18) : 0;
          const preBoomTremor =
            inst.elapsed > IMPACT_TIME_SEC - 0.12
              ? Math.sin(inst.elapsed * 92.0 + f * 2.3) * 0.08 * as
              : 0;

          const r = fc.ringRadius * as;
          const x = inst.cx + Math.cos(fc.ringAngle) * r + preBoomTremor;
          const z = inst.cz + Math.sin(fc.ringAngle) * r;

          fc.mesh.visible = true;
          fc.mesh.position.set(x, yPos, z);
          fc.mesh.lookAt(inst.cx, yPos, inst.cz);
          fc.mesh.rotateZ(fc.tiltZ);
          fc.mesh.scale.set((1 + 0.10 * settle) * as, (1 - 0.12 * settle) * as, as);
          fc.mat.uniforms.uTime.value = timeSec;
          fc.mat.uniforms.uFlipFlash.value = landFlash * 0.95;
          fc.mat.uniforms.uOpacity.value = Math.min(1, fallT * 4.0);
        }
      } else {
        // Shattered instantly by the Giant Card BOOM!
        for (let f = 0; f < FAN_CARD_COUNT; f++) {
          inst.fanCards[f].mesh.visible = false;
        }
      }

      // 3. Act 2: Final Giant Arcana Tarot Card plummets from high sky (y = 15.6 * as -> ground) and SHATTERS on BOOM!
      if (inst.elapsed >= 0.44 && inst.elapsed < IMPACT_TIME_SEC + 0.18) {
        inst.giantCardMesh.visible = true;
        inst.giantCardMat.uniforms.uTime.value = timeSec;

        if (inst.elapsed < 0.56) {
          // High-sky lock-on gleam before dropping
          const lockT = (inst.elapsed - 0.44) / 0.12;
          const lockEase = 1 - Math.pow(1 - lockT, 2);
          inst.giantCardMesh.position.set(inst.cx, inst.cy + 15.2 * as, inst.cz);
          inst.giantCardMesh.rotation.set(0.16, 0.22, -0.20);
          inst.giantCardMesh.scale.setScalar((0.68 + 0.36 * lockEase) * as);
          inst.giantCardMat.uniforms.uDropVel.value = 0;
          inst.giantCardMat.uniforms.uImpact.value = 0;
          inst.giantCardMat.uniforms.uOpacity.value = Math.min(1, lockT * 3.0);
        } else if (inst.elapsed < IMPACT_TIME_SEC) {
          // High-velocity sky-drop guillotine slam all the way into the pentagram
          const fallT = (inst.elapsed - 0.56) / (IMPACT_TIME_SEC - 0.56);
          const fallEase = fallT * fallT * fallT;
          const yPos = inst.cy + (15.2 - 12.65 * fallEase) * as;
          inst.giantCardMesh.position.set(inst.cx, yPos, inst.cz);
          inst.giantCardMesh.rotation.set(0.16, 0.22, -0.20 + 0.06 * fallEase);
          inst.giantCardMesh.scale.setScalar(1.06 * as);
          inst.giantCardMat.uniforms.uDropVel.value = Math.sin(fallT * Math.PI * 0.9);
          inst.giantCardMat.uniforms.uImpact.value = 0;
          inst.giantCardMat.uniforms.uOpacity.value = 1;
        } else {
          // Instant fracture-flash & SHATTER right after Hit-Stop (0.80s -> 0.98s)
          const shatterT = Math.min(1, (inst.elapsed - IMPACT_TIME_SEC) / 0.18);
          inst.giantCardMesh.position.set(inst.cx, inst.cy + 2.55 * as, inst.cz);
          inst.giantCardMesh.rotation.set(0.16, 0.22, -0.14);
          inst.giantCardMesh.scale.setScalar((1.06 + 0.22 * shatterT) * as);
          inst.giantCardMat.uniforms.uDropVel.value = 0;
          inst.giantCardMat.uniforms.uImpact.value = shatterT;
          inst.giantCardMat.uniforms.uOpacity.value = 1 - shatterT * shatterT;
        }
      } else {
        inst.giantCardMesh.visible = false;
      }

      // 4. Hit-Stop Impact Frame (0.80s)
      if (!inst.impactFired && inst.elapsed >= IMPACT_TIME_SEC) {
        inst.impactFired = true;
        inst.hitStopTimer = HIT_STOP_DURATION_SEC;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#e11d48', HIT_STOP_DURATION_SEC);
        this.hooks.onSpeedLines?.(1.0, 0.60);
        this.hooks.onFlash?.('#fda4af', 0.80);
        inst.onImpactCallback?.();
      }

      // 5. Act 3 Finale: Spiky 5-Point Crimson Starburst + 2 Pentagram Shock Rings + Card Cascade & Sparks
      if (inst.elapsed >= IMPACT_TIME_SEC) {
        const dtBoom = inst.elapsed - IMPACT_TIME_SEC;
        const burstT = Math.min(1, dtBoom / 0.85);
        const burstEase = 1 - Math.pow(1 - Math.min(1, dtBoom / 0.18), 3);
        const burstFade = 1 - Math.max(0, (burstT - 0.35) / 0.65);

        inst.starburstMesh.visible = burstFade > 0.02;
        inst.starburstMesh.position.set(inst.cx, inst.cy + 0.14, inst.cz);
        inst.starburstMesh.scale.setScalar((3.8 + 11.4 * burstEase) * as);
        inst.starburstMesh.rotation.y += dt * 0.65;
        inst.starburstMat.uniforms.uTime.value = timeSec;
        inst.starburstMat.uniforms.uProgress.value = burstT;
        inst.starburstMat.uniforms.uOpacity.value = burstFade;

        for (let r = 0; r < SHOCK_RING_COUNT; r++) {
          const rg = inst.rings[r];
          const rt = (inst.elapsed - rg.delay) / 0.78;
          if (rt < 0 || rt > 1) {
            rg.mesh.visible = false;
            continue;
          }
          rg.mesh.visible = true;
          rg.mesh.position.set(inst.cx, inst.cy + 0.11 + r * 0.05, inst.cz);
          rg.mesh.scale.setScalar((3.8 + 11.4 * rt) * as);
          rg.mat.uniforms.uTime.value = timeSec;
          rg.mat.uniforms.uProgress.value = rt;
          rg.mat.uniforms.uOpacity.value = 1 - rt;
        }

        const tailFade = 1 - Math.max(0, (uProgress - 0.66) / 0.32);
        const cardLimit = this.lowQuality ? 6 : CASCADE_CARD_COUNT;
        for (let c = 0; c < CASCADE_CARD_COUNT; c++) {
          const cc = inst.cascadeCards[c];
          if (c >= cardLimit || tailFade <= 0.02) {
            cc.mesh.visible = false;
            continue;
          }
          cc.mesh.visible = true;
          const dist = (0.65 + dtBoom * cc.speed * 1.35) * as;
          const y = Math.max(0.24, 1.35 + dtBoom * (cc.ySpeed * 1.15) - 3.1 * dtBoom * dtBoom);
          cc.mesh.position.set(inst.cx + Math.cos(cc.angle) * dist, inst.cy + y, inst.cz + Math.sin(cc.angle) * dist);
          cc.mesh.rotation.set(dtBoom * cc.spinX * 1.4, dtBoom * cc.spinY * 1.4, dtBoom * cc.spinZ * 1.3);
          cc.mesh.scale.setScalar(1.18 * tailFade * as);
          cc.mat.uniforms.uTime.value = timeSec;
          cc.mat.uniforms.uFlipFlash.value = Math.max(0, 1 - dtBoom * 2.8) * 0.95;
          cc.mat.uniforms.uOpacity.value = tailFade;
        }

        const sparkLimit = this.lowQuality ? 10 : SPARK_COUNT;
        for (let k = 0; k < SPARK_COUNT; k++) {
          const sp = inst.sparks[k];
          if (k >= sparkLimit || tailFade <= 0.02) {
            sp.mesh.visible = false;
            continue;
          }
          sp.mesh.visible = true;
          const dist = dtBoom * sp.speed * as;
          const y = Math.max(0.16, 0.7 + dtBoom * sp.ySpeed - 2.2 * dtBoom * dtBoom);
          sp.mesh.position.set(inst.cx + Math.cos(sp.angle) * dist, inst.cy + y, inst.cz + Math.sin(sp.angle) * dist);
          sp.mesh.rotation.y = -sp.angle;
          sp.mesh.scale.setScalar(1.12 * tailFade * as);
          sp.mat.uniforms.uTime.value = timeSec;
          sp.mat.uniforms.uOpacity.value = tailFade;
        }
      }

      if (inst.elapsed >= SKILL_DURATION_SEC) {
        inst.active = false;
        inst.root.visible = false;
        inst.onImpactCallback = null;
      }
    }
  }

  /** Pushes any active instance past impact into dissolve tail when superseded by consecutive Ult. */
  public fastForwardToDissolve(): void {
    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      if (!inst.active) continue;
      inst.hitStopTimer = 0;
      inst.impactFired = true;
      inst.onImpactCallback = null;
      inst.elapsed = Math.max(inst.elapsed, 1.58);
    }
  }

  public clear(): void {
    for (let i = 0; i < this.instances.length; i++) {
      this.instances[i].active = false;
      this.instances[i].root.visible = false;
      this.instances[i].onImpactCallback = null;
    }
  }

  public dispose(): void {
    this.clear();
    for (let i = 0; i < this.allMats.length; i++) this.allMats[i].dispose();
    for (let i = 0; i < this.sharedGeos.length; i++) this.sharedGeos[i].dispose();
  }
}
