import * as THREE from 'three';
import { mergeSimpleGeos } from '../MeshHelpers3D';
import type { TierVfxHooks, WorldPoint3 } from '../TierMotionPath3D';

const SKILL_DURATION_SEC = 2.5;
const POOL_SIZE = 2;
const MIRROR_COUNT = 6;
const KATANA_ARC_COUNT = 6;
const ORE_FLASH_COUNT = 6;
const SHARD_PARTICLE_COUNT = 36;

const YUKIKAGE_GLSL = `
  vec2 ykHash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float ykHash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.23);
    return fract(p.x * p.y);
  }

  float ykVnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(ykHash21(i), ykHash21(i + vec2(1.0, 0.0)), f.x),
      mix(ykHash21(i + vec2(0.0, 1.0)), ykHash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float ykRidged(vec2 p) {
    float v = 0.0;
    float a = 0.56;
    float freq = 1.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(ykVnoise(p * freq) * 2.0 - 1.0);
      v += (n * n * n * n) * a;
      freq *= 2.24;
      a *= 0.5;
    }
    return v;
  }

  vec3 ykVoronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = ykHash22(n + g);
        o = 0.5 + 0.40 * sin(timeOffset + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = ykHash21(n + g);
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }

  float ykSdHex(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
  }

  float ykSdStar4(vec2 p, float r, float sharpness) {
    vec2 q = abs(p);
    return pow(pow(q.x, sharpness) + pow(q.y, sharpness), 1.0 / sharpness) - r;
  }
`;

/**
 * Faceted Beveled Hexagonal Ice Mirror Geometry (facing +Z).
 */
function createIceMirrorGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const rx = 0.78;
  const ry = 1.14;
  shape.moveTo(0, ry);
  shape.lineTo(rx, ry * 0.48);
  shape.lineTo(rx, -ry * 0.48);
  shape.lineTo(0, -ry);
  shape.lineTo(-rx, -ry * 0.48);
  shape.lineTo(-rx, ry * 0.48);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.04);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Fluid Whipping Asymmetric Katana Slash Crescent Geometry (dynamic tapered whip arc, zero stiff straight lines!).
 */
function createKatanaWhipArcGeometry(
  innerR = 0.42,
  outerR = 1.12,
  sweepRad = Math.PI * 1.18,
  segments = 36
): THREE.BufferGeometry {
  const cols = segments + 1;
  const rows = 3;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  for (let i = 0; i < cols; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * sweepRad;
    // Skewed anime smear taper: razor-sharp needle start, thick blazing whip belly toward leading tip
    const belly = Math.pow(Math.sin(u * Math.PI), 0.36) * (0.65 + 0.55 * u);
    const curInner = outerR - (outerR - innerR) * Math.min(1.0, belly);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      const r = curInner + (outerR - curInner) * v;
      const camberY = j === 1 ? 0.14 * belly : 0.0;
      const idx = i * rows + j;
      positions[idx * 3] = cosA * r;
      positions[idx * 3 + 1] = camberY;
      positions[idx * 3 + 2] = sinA * r;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      const c = (i + 1) * rows + (j + 1);
      const d = i * rows + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Supersonic Expanding Detonation Shockwave Torus Ring Geometry (for violent post-slash blast!).
 */
function createShockwaveRingGeometry(): THREE.BufferGeometry {
  const geo = new THREE.RingGeometry(0.68, 1.0, 8, 1);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Vertical Cryo-Burst Core Pillar Geometry for Post-Slash Detonation.
 */
function createDetonationPillarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const core = new THREE.CylinderGeometry(0.45, 0.18, 6.2, 16, 1, true);
  core.translate(0, 3.1, 0);
  parts.push(core);
  const outer = new THREE.CylinderGeometry(1.15, 0.35, 5.4, 16, 1, true);
  outer.translate(0, 2.7, 0);
  parts.push(outer);
  return mergeSimpleGeos(parts);
}

/**
 * Akaza Compass-Needle Dendritic Snowflake + Japanese Kekkai Diamond Frame & Frost Veins
 * (ZERO circular sticker disc, ZERO outer circle border — crisp open-air geometric needles shooting outward!).
 */
function createCrystallineShrineSealMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uBlastT: { value: 0.0 },
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
      uniform float uBlastT;
      varying vec2 vUv;
      ${YUKIKAGE_GLSL}

      // Signed distance to a crisp 6-branch dendritic snowflake compass needle with side barbs
      float sdSnowflakeCompass(vec2 p, float deploy) {
        float ang = atan(p.y, p.x);
        float r = length(p);
        // Fold into 60-degree wedge symmetry (6 primary compass needles)
        float sector = mod(ang + 3.14159265, 1.04719755) - 0.52359877;
        vec2 q = vec2(cos(sector), abs(sin(sector))) * r;

        // Primary razor spear needle shooting outward to r = 0.94 * deploy
        float maxR = 0.94 * deploy;
        float stem = max(abs(q.y) - 0.022 * (1.0 - q.x * 0.45), q.x - maxR);
        float backClip = -q.x + 0.04;
        float needle = max(stem, backClip);

        // Two pairs of sharp 45-deg crystal side-barbs branching off each compass arm (Akaza Rashin!)
        vec2 b1 = q - vec2(0.34 * deploy, 0.0);
        vec2 r1 = vec2(b1.x * 0.7071 + b1.y * 0.7071, abs(b1.y * 0.7071 - b1.x * 0.7071));
        float barb1 = max(r1.y - 0.015, max(r1.x - 0.24 * deploy, -r1.x));

        vec2 b2 = q - vec2(0.58 * deploy, 0.0);
        vec2 r2 = vec2(b2.x * 0.7071 + b2.y * 0.7071, abs(b2.y * 0.7071 - b2.x * 0.7071));
        float barb2 = max(r2.y - 0.013, max(r2.x - 0.17 * deploy, -r2.x));

        return min(needle, min(barb1, barb2));
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        // Explosive 85ms Akaza Compass-Needle deployment shoot-out from center
        float deploy = 1.0 - pow(1.0 - clamp(uProgress / 0.045, 0.0, 1.0), 4.0);
        float dissolveT = clamp((uProgress - 0.68) / 0.32, 0.0, 1.0);

        // 1. 6-Branch Akaza Compass-Needle Snowflake Geometry
        float dCompass = sdSnowflakeCompass(p, deploy);
        float needleInk = smoothstep(0.036, 0.012, dCompass);
        float needleFill = step(dCompass, 0.0);
        float needleWhite = step(dCompass, -0.008);

        // 2. Dual-Rotated Japanese Kekkai Shrine Square/Diamond Frame (NOT a circle!)
        float sq1 = max(abs(p.x), abs(p.y)) - 0.56 * deploy;
        float sq2 = (abs(p.x) + abs(p.y)) * 0.7071 - 0.56 * deploy;
        float dKekkai = min(abs(sq1), abs(sq2));
        float kekkaiInk = smoothstep(0.032, 0.012, dKekkai);
        float kekkaiCore = step(dKekkai, 0.011);

        // 3. 4 Glowing Warm-Amber Ofuda Shrine Talisman Rectangles at Cardinal Points
        vec2 cardP = vec2(min(abs(p.x), abs(p.y)), max(abs(p.x), abs(p.y)) - 0.78 * deploy);
        float dOfuda = max(abs(cardP.x) - 0.045, abs(cardP.y) - 0.09);
        float ofudaCore = step(dOfuda, 0.0);
        float ofudaInk = smoothstep(0.022, 0.005, dOfuda);

        // 4. Organic Spreading Permafrost Cracks (no circular border!)
        vec3 vor = ykVoronoi(p * 6.8, 0.12);
        float frostVeins = smoothstep(0.048, 0.010, vor.y) * smoothstep(0.95 * deploy, 0.12, r) * step(vor.x, 0.42);

        // 5. Sharp Diamond Shock-Frame Wave on Detonation (square/diamond pulse, NOT a circle!)
        float diaDist = (abs(p.x) + abs(p.y)) * 0.7071;
        float blastD = fract(uBlastT) * 0.94;
        float diamondBlast = step(abs(diaDist - blastD), 0.028) * step(0.02, uBlastT) * (1.0 - smoothstep(0.65, 1.0, blastD));

        float shardDissolve = step(dissolveT, vor.z * 0.84 + (1.0 - r) * 0.16);
        if (shardDissolve < 0.5) discard;

        vec3 sumiInk = vec3(0.012, 0.022, 0.068);
        vec3 frostCyan = vec3(0.18, 0.88, 1.0);
        vec3 amberGold = vec3(1.0, 0.82, 0.24);
        vec3 whiteHot = vec3(0.98, 1.0, 1.0);

        float inkMask = clamp(max(needleInk, max(kekkaiInk, ofudaInk)), 0.0, 1.0);
        float glowMask = clamp(max(needleFill, max(kekkaiCore, max(ofudaCore, max(frostVeins * 0.85, diamondBlast)))), 0.0, 1.0);

        vec3 col = sumiInk;
        col = mix(col, frostCyan * 1.65, clamp(needleFill + frostVeins * 0.95 + diamondBlast * 1.4, 0.0, 1.0));
        col = mix(col, amberGold * 1.65, clamp(kekkaiCore * 0.9 + ofudaCore * 1.25, 0.0, 1.0));
        col = mix(col, whiteHot * 1.9, clamp(needleWhite + diamondBlast * 0.65, 0.0, 1.0));

        float alpha = clamp(max(inkMask * 0.88, glowMask), 0.0, 0.97);
        if (alpha < 0.02) discard;
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
 * Dynamic Whipping Katana Slash Arc Shader (Progressive 65ms UV Draw -> Retina Hold -> Voronoi Fracture!).
 */
function createKatanaWhipSlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uSeed: { value: 1.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
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
      uniform float uLocalT;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${YUKIKAGE_GLSL}

      void main() {
        // Ultra-fast whip draw front (reaches 1.0 by uLocalT = 0.22!), then holds taut before shattering tail-to-head
        float head = 1.0 - pow(1.0 - clamp(uLocalT * 4.6, 0.0, 1.0), 5.0);
        float tail = max(0.0, (uLocalT - 0.34) * 1.52);
        float arcMask = step(vUv.x, head) * step(tail, vUv.x);
        if (arcMask < 0.5) discard;

        // Sharp crystalline ice fractures & ink spine along blade width
        vec3 vor = ykVoronoi(vec2(vUv.x * 16.0 + uSeed, vUv.y * 4.5), 0.1);
        float crackShatter = smoothstep(0.45, 0.95, uLocalT);
        if (crackShatter > 0.05 && vor.z < crackShatter * 0.95) discard;

        float body = smoothstep(0.04, 0.24, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
        float sumiInkCore = step(0.14, vUv.y) * step(vUv.y, 0.46);
        float razorWhite = step(0.72, vUv.y) * step(vUv.y, 0.97);
        float crystalEdge = smoothstep(0.08, 0.015, vor.y);
        float leadTip = step(abs(vUv.x - head), 0.11);

        vec3 col = mix(uColor * 1.9, vec3(0.012, 0.022, 0.08), sumiInkCore * 0.92);
        col = mix(col, uCoreColor * 2.2, clamp(razorWhite + crystalEdge * 0.8 + leadTip, 0.0, 1.0));

        float alpha = clamp(max(body, razorWhite) * (1.0 - smoothstep(0.78, 1.0, uLocalT)), 0.0, 1.0);
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
 * Faceted Hexagonal Ice Mirror Shader (Clean crystal sheen -> Target Lock Flash -> Voronoi Glass Fracture!).
 */
function createIceMirrorShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uCrackT: { value: 0.0 },
      uLockFlash: { value: 0.0 },
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
      uniform float uCrackT;
      uniform float uLockFlash;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      ${YUKIKAGE_GLSL}

      void main() {
        float dissolveT = clamp((uProgress - 0.65) / 0.35, 0.0, 1.0);
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(0.4, 0.85, 0.55));
        float ndv = abs(dot(N, V));
        float inkRim = step(ndv, 0.25);

        float sheen = step(0.68, cos((vLocalPos.x * 2.2 + vLocalPos.y * 1.4) - uTime * 5.0));
        vec3 vor = ykVoronoi(vLocalPos.xy * 4.2, 0.15);
        float crackEdge = step(vor.y, 0.10 * uCrackT) * step(0.05, uCrackT);
        float dissolve = step(dissolveT, vor.z * 0.82 + 0.15);
        if (dissolve < 0.5) discard;

        vec3 glassDeep = vec3(0.04, 0.16, 0.34);
        vec3 glassBright = vec3(0.38, 0.88, 1.0);
        float cel = step(0.32, dot(N, L));

        vec3 col = mix(glassDeep, glassBright, cel * 0.65);
        col += vec3(0.92, 0.99, 1.0) * (sheen * 0.55 + uLockFlash * 0.95);
        col = mix(col, vec3(1.0) * 1.95, crackEdge);
        col = mix(col, vec3(0.01, 0.02, 0.06), inkRim * 0.92);

        gl_FragColor = vec4(col, 0.94);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Post-Slash Blinding Supersonic Detonation Shockwave Ring Shader.
 */
function createBlastShockwaveRingMaterial(isAmber: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uIsAmber: { value: isAmber ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLocalT;
      uniform float uIsAmber;
      varying vec2 vUv;
      varying vec3 vLocalPos;
      ${YUKIKAGE_GLSL}

      void main() {
        float r = length(vLocalPos.xz);
        float band = smoothstep(0.62, 0.84, r) * smoothstep(1.0, 0.94, r);
        float ang = atan(vLocalPos.z, vLocalPos.x);
        float streak = step(0.35, ykRidged(vec2(ang * 4.0, r * 6.0)));
        float whiteHot = smoothstep(0.82, 0.96, r) * band;

        vec3 mainCol = mix(vec3(0.18, 0.90, 1.0) * 2.1, vec3(1.0, 0.84, 0.28) * 2.1, uIsAmber);
        vec3 col = mix(mainCol, vec3(1.0) * 2.35, clamp(whiteHot + streak * 0.45, 0.0, 1.0));
        float fade = 1.0 - smoothstep(0.45, 1.0, uLocalT);
        float alpha = clamp(band * (0.7 + 0.5 * streak) * fade, 0.0, 1.0);
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
 * Post-Slash Cryo-Supernova Vertical Pillar & 4-Point Blinding Starburst Flash.
 */
function createSupernovaDetonationMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
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
      uniform float uLocalT;
      uniform float uTime;
      varying vec2 vUv;
      ${YUKIKAGE_GLSL}

      void main() {
        // High-energy vertical cryo-plasma streaks tearing upward
        float streaks = ykRidged(vec2(vUv.x * 14.0, vUv.y * 2.5 - uTime * 14.0));
        float vMask = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
        float core = smoothstep(0.35, 0.85, streaks);
        float fade = 1.0 - smoothstep(0.32, 1.0, uLocalT);

        vec3 col = mix(vec3(0.16, 0.86, 1.0) * 2.1, vec3(1.0, 0.99, 0.94) * 2.4, core);
        float alpha = clamp((0.35 + streaks * 0.95) * vMask * fade, 0.0, 1.0);
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
 * Screen-Facing 4-Point Blinding Lens-Starburst Flare for Explosive Detonation Pop.
 */
function createStarFlareBillboardMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLocalT;
      varying vec2 vUv;
      ${YUKIKAGE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float spikeH = (0.045 / (abs(p.y) + 0.015)) * smoothstep(0.98, 0.04, abs(p.x));
        float spikeV = (0.045 / (abs(p.x) + 0.015)) * smoothstep(0.98, 0.04, abs(p.y));
        float core = smoothstep(0.34, 0.02, r);
        float star = step(ykSdStar4(p, 0.44, 0.42), 0.015);
        float fade = 1.0 - smoothstep(0.28, 1.0, uLocalT);

        vec3 col = vec3(0.24, 0.90, 1.0) * (spikeH + spikeV) + vec3(1.0) * (core * 2.2 + star * 1.4);
        float alpha = clamp(((spikeH + spikeV) * 0.55 + core + star) * smoothstep(0.99, 0.85, r) * fade, 0.0, 1.0);
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
 * Direct Per-Ore Mirror-Shatter & Popcorn Explosion Cross Flash.
 */
function createMirrorOreFlashMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalT: { value: 0.0 },
      uColor: { value: new THREE.Color('#38bdf8') },
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
      uniform float uLocalT;
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${YUKIKAGE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 0.99) discard;

        float pop = 1.0 - pow(1.0 - clamp(uLocalT * 4.5, 0.0, 1.0), 4.0);
        float ring = exp(-pow((r - mix(0.10, 0.90, pop)) * 24.0, 2.0));
        float hex = step(abs(ykSdHex(p, mix(0.14, 0.82, pop))), 0.048);
        float starH = step(abs(p.y), 0.085 * (1.0 - abs(p.x))) * step(abs(p.x), 0.96);
        float starV = step(abs(p.x), 0.085 * (1.0 - abs(p.y))) * step(abs(p.y), 0.96);

        float fade = 1.0 - smoothstep(0.36, 1.0, uLocalT);
        vec3 col = mix(uColor * 2.0, uCoreColor * 2.2, max(hex, ring)) + vec3(1.0) * (starH + starV);
        float alpha = clamp((ring + hex + starH + starV) * smoothstep(0.99, 0.86, r) * fade, 0.0, 1.0);
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
 * Shattering Mirror Glass Shards & Amber Toro Embers (NormalBlending).
 */
function createGlassShardParticleMaterial(isAmber: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLocalLife: { value: 0.0 },
      uIsAmber: { value: isAmber ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLocalLife;
      uniform float uIsAmber;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        if (p.y < -0.5 || p.y > 0.85 || abs(p.x) > (0.85 - p.y) * 0.58) discard;
        float edgeInk = step(0.46, abs(p.x) / max(0.01, (0.85 - p.y) * 0.58)) + step(p.y, -0.36);

        vec3 baseCol = mix(vec3(0.36, 0.92, 1.0) * 1.85, vec3(1.0, 0.82, 0.24) * 1.9, uIsAmber);
        vec3 col = mix(baseCol, vec3(0.015, 0.03, 0.08), clamp(edgeInk, 0.0, 1.0) * 0.85);
        col += vec3(1.0) * step(p.y, 0.1) * 0.45;

        float fade = 1.0 - smoothstep(0.60, 1.0, uLocalLife);
        if (fade < 0.02) discard;
        gl_FragColor = vec4(col, fade * 0.96);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

interface MirrorSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  basePos: THREE.Vector3;
  burstDir: THREE.Vector3;
}

interface KatanaArcSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  delay: number;
  fired: boolean;
  startSpinY: number;
  baseRot: THREE.Euler;
  targetIdx: number;
}

interface OreFlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  baseScale: number;
}

interface GlassShardSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  floorY: number;
  baseScale: number;
  spin: number;
}

interface YukikageSkillInstance {
  root: THREE.Group;
  active: boolean;
  elapsed: number;
  hitStopTimer: number;
  lockSilenceFired: boolean;
  finalCutFired: boolean;
  primaryBlastFired: boolean;
  popcornIdxFired: number;
  finaleFired: boolean;
  cx: number;
  cy: number;
  cz: number;
  areaScale: number;
  pts: WorldPoint3[];
  sealMesh: THREE.Mesh;
  sealMat: THREE.ShaderMaterial;
  mirrors: MirrorSlot[];
  katanaArcs: KatanaArcSlot[];
  finalSlashMesh: THREE.Mesh;
  finalSlashMat: THREE.ShaderMaterial;
  shockRingCyanMesh: THREE.Mesh;
  shockRingCyanMat: THREE.ShaderMaterial;
  shockRingAmberMesh: THREE.Mesh;
  shockRingAmberMat: THREE.ShaderMaterial;
  detoPillarMesh: THREE.Mesh;
  detoPillarMat: THREE.ShaderMaterial;
  starFlareMesh: THREE.Mesh;
  starFlareMat: THREE.ShaderMaterial;
  oreFlashes: OreFlashSlot[];
  particles: GlassShardSlot[];
  onSlashBeatCallback: ((beatIdx: number, pt: WorldPoint3) => void) | null;
  onImpactCallback: (() => void) | null;
}

/**
 * Self-contained 2.5s High-Dopamine Sakuga Skill Pool for Yukikage Twins
 * ("Makyo Shimo-Zero: Dimensional Mirror Whip-Slash & Chained Cryo-Supernova":
 *  - ZERO water-whirlpool halo! Replaced with Geometric 6-Fold Snowflake Crystal Mandate Seal.
 *  - ZERO stiff straight slash sticks or constantly spinning rings! Uses Curved Whipping Asymmetric Katana Arcs with 65ms fast draw -> retina scar hold -> Voronoi shatter.
 *  - HIGH-DOPAMINE POST-SLASH DETONATION:
 *    Act 0->1 (0.00s->0.46s): 6 Faceted Ice Mirrors pop around 3D dome + 6 Curved Whipping Katana Scars bisect targets every 62ms!
 *    Act 2a (0.46s->0.56s): Sheathe Silence Pull-Back -> Climax Final Horizon Cut at 0.56s (0.088s Hit-Stop + B&W Negative Impact Frame!)
 *    Act 2b (0.66s): PRIMARY DETONATION — Twin Shockwave Torus Rings + Vertical Cryo-Supernova Pillar + Blinding 4-Point Lens Starburst + All-Mirror Shatter + 36 Razor Shards!
 *    Act 3 (0.80s->1.15s): Staccato "Popcorn" Chained Detonations per ore -> Second Negative Impact Frame & Amber-White Finale Ring at 0.96s!).
 */
export class YukikageTwinsSkillVfxPool {
  public readonly group = new THREE.Group();
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly allMats: THREE.ShaderMaterial[] = [];
  private readonly instances: YukikageSkillInstance[] = [];
  private readonly tmpTargetPos = new THREE.Vector3();
  private hooks: TierVfxHooks;
  private lowQuality = false;

  constructor(hooks: TierVfxHooks = {}) {
    this.hooks = hooks;
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const mirrorGeo = createIceMirrorGeometry();
    const arcGeo = createKatanaWhipArcGeometry(0.42, 1.12, Math.PI * 1.18, 36);
    const shockGeo = createShockwaveRingGeometry();
    const pillarGeo = createDetonationPillarGeometry();
    this.sharedGeos.push(planeGeo, mirrorGeo, arcGeo, shockGeo, pillarGeo);

    for (let p = 0; p < POOL_SIZE; p++) {
      const root = new THREE.Group();
      root.visible = false;

      const sealMat = createCrystallineShrineSealMaterial();
      const sealMesh = new THREE.Mesh(planeGeo, sealMat);
      sealMesh.rotation.x = -Math.PI / 2;
      root.add(sealMesh);
      this.allMats.push(sealMat);

      const mirrors: MirrorSlot[] = [];
      for (let i = 0; i < MIRROR_COUNT; i++) {
        const mMat = createIceMirrorShaderMaterial();
        const mMesh = new THREE.Mesh(mirrorGeo, mMat);
        mMesh.visible = false;
        root.add(mMesh);
        this.allMats.push(mMat);
        mirrors.push({
          mesh: mMesh,
          mat: mMat,
          delay: 0.03 + i * 0.036,
          basePos: new THREE.Vector3(),
          burstDir: new THREE.Vector3(),
        });
      }

      const katanaArcs: KatanaArcSlot[] = [];
      for (let i = 0; i < KATANA_ARC_COUNT; i++) {
        const aMat = createKatanaWhipSlashMaterial();
        aMat.uniforms.uSeed.value = (i + 1) * 3.1;
        aMat.uniforms.uColor.value.set(i % 2 === 0 ? '#38bdf8' : '#2dd4bf');
        const aMesh = new THREE.Mesh(arcGeo, aMat);
        aMesh.visible = false;
        root.add(aMesh);
        this.allMats.push(aMat);
        katanaArcs.push({
          mesh: aMesh,
          mat: aMat,
          delay: 0.08 + i * 0.062,
          fired: false,
          startSpinY: -Math.PI * 0.4 + i * 1.05,
          baseRot: new THREE.Euler((i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.14), 0, (i - 2.5) * 0.22),
          targetIdx: i,
        });
      }

      // Climax Final Horizon Cut
      const finalSlashMat = createKatanaWhipSlashMaterial();
      finalSlashMat.uniforms.uColor.value.set('#38bdf8');
      finalSlashMat.uniforms.uCoreColor.value.set('#ffffff');
      const finalSlashMesh = new THREE.Mesh(arcGeo, finalSlashMat);
      finalSlashMesh.visible = false;
      root.add(finalSlashMesh);
      this.allMats.push(finalSlashMat);

      // Post-Slash Explosion Layer 1 & 2: Twin Supersonic Shockwave Rings
      const shockRingCyanMat = createBlastShockwaveRingMaterial(false);
      const shockRingCyanMesh = new THREE.Mesh(shockGeo, shockRingCyanMat);
      shockRingCyanMesh.visible = false;
      root.add(shockRingCyanMesh);

      const shockRingAmberMat = createBlastShockwaveRingMaterial(true);
      const shockRingAmberMesh = new THREE.Mesh(shockGeo, shockRingAmberMat);
      shockRingAmberMesh.visible = false;
      root.add(shockRingAmberMesh);
      this.allMats.push(shockRingCyanMat, shockRingAmberMat);

      // Post-Slash Explosion Layer 3: Cryo-Supernova Vertical Pillar
      const detoPillarMat = createSupernovaDetonationMaterial();
      const detoPillarMesh = new THREE.Mesh(pillarGeo, detoPillarMat);
      detoPillarMesh.visible = false;
      root.add(detoPillarMesh);
      this.allMats.push(detoPillarMat);

      // Post-Slash Explosion Layer 4: Blinding 4-Point Lens Starburst Flare
      const starFlareMat = createStarFlareBillboardMaterial();
      const starFlareMesh = new THREE.Mesh(planeGeo, starFlareMat);
      starFlareMesh.rotation.set(-0.5, 0, 0);
      starFlareMesh.visible = false;
      root.add(starFlareMesh);
      this.allMats.push(starFlareMat);

      const oreFlashes: OreFlashSlot[] = [];
      for (let i = 0; i < ORE_FLASH_COUNT; i++) {
        const fMat = createMirrorOreFlashMaterial();
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
          life: 0.22,
          baseScale: 3.6,
        });
      }

      const particles: GlassShardSlot[] = [];
      for (let i = 0; i < SHARD_PARTICLE_COUNT; i++) {
        const isAmber = i % 4 === 0;
        const pMat = createGlassShardParticleMaterial(isAmber);
        const pMesh = new THREE.Mesh(planeGeo, pMat);
        pMesh.visible = false;
        root.add(pMesh);
        this.allMats.push(pMat);
        particles.push({
          mesh: pMesh,
          mat: pMat,
          active: false,
          age: 0,
          life: 0.48,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          floorY: 0,
          baseScale: 0.65,
          spin: (i % 2 === 0 ? 1 : -1) * (12 + (i % 7) * 3),
        });
      }

      this.group.add(root);
      this.instances.push({
        root,
        active: false,
        elapsed: 0,
        hitStopTimer: 0,
        lockSilenceFired: false,
        finalCutFired: false,
        primaryBlastFired: false,
        popcornIdxFired: 0,
        finaleFired: false,
        cx: 0,
        cy: 0,
        cz: 0,
        areaScale: 1,
        pts: [],
        sealMesh,
        sealMat,
        mirrors,
        katanaArcs,
        finalSlashMesh,
        finalSlashMat,
        shockRingCyanMesh,
        shockRingCyanMat,
        shockRingAmberMesh,
        shockRingAmberMat,
        detoPillarMesh,
        detoPillarMat,
        starFlareMesh,
        starFlareMat,
        oreFlashes,
        particles,
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

  private triggerOreFlash(inst: YukikageSkillInstance, slotIdx: number, pt: WorldPoint3, scale: number, isAmber: boolean): void {
    const f = inst.oreFlashes[slotIdx % inst.oreFlashes.length];
    if (!f) return;
    f.active = true;
    f.age = 0;
    f.life = 0.22;
    f.baseScale = scale;
    f.mesh.position.set(pt.x, pt.y + 0.95, pt.z + 0.16);
    f.mesh.scale.setScalar(scale * 0.48);
    f.mat.uniforms.uColor.value.set(isAmber ? '#fbbf24' : '#38bdf8');
    f.mat.uniforms.uCoreColor.value.set('#ffffff');
    f.mat.uniforms.uLocalT.value = 0;
    f.mesh.visible = true;
  }

  private launchShardBurst(inst: YukikageSkillInstance, origin: THREE.Vector3, startIdx: number, count: number, speedMult: number): void {
    const limit = Math.min(inst.particles.length, startIdx + count);
    for (let i = startIdx; i < limit; i++) {
      const sp = inst.particles[i];
      sp.active = true;
      sp.age = 0;
      sp.life = 0.38 + ((i * 19) % 10) * 0.025;
      sp.pos.copy(origin);
      sp.floorY = inst.cy + 0.08;
      const az = ((i - startIdx) / Math.max(1, count)) * Math.PI * 2 + (i % 3) * 0.29;
      const spd = (9.6 + ((i * 29) % 10) * 1.1) * speedMult * Math.max(0.75, inst.areaScale);
      const vy = (5.8 + ((i * 23) % 10) * 0.85) * speedMult;
      sp.vel.set(Math.cos(az) * spd, vy, Math.sin(az) * spd * 0.78);
      sp.baseScale = (0.62 + (i % 3) * 0.24) * Math.max(0.75, inst.areaScale);
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
    inst.lockSilenceFired = false;
    inst.finalCutFired = false;
    inst.primaryBlastFired = false;
    inst.popcornIdxFired = 0;
    inst.finaleFired = false;
    inst.cx = opts.cx;
    inst.cy = opts.cy;
    inst.cz = opts.cz;
    inst.areaScale = opts.areaScale;
    inst.pts = opts.pts.length > 0 ? [...opts.pts] : [{ x: opts.cx, y: opts.cy, z: opts.cz }];
    inst.onSlashBeatCallback = opts.onSlashBeat ?? null;
    inst.onImpactCallback = opts.onImpact ?? null;

    inst.root.visible = true;

    inst.sealMesh.position.set(opts.cx, opts.cy + 0.08, opts.cz);
    inst.sealMesh.scale.setScalar(12.2 * opts.areaScale);
    inst.sealMat.uniforms.uProgress.value = 0;
    inst.sealMat.uniforms.uBlastT.value = 0;

    // 6 Faceted Hex Ice Mirrors in a 3D Hemisphere (each facing inward cleanly)
    const mirrorLimit = this.lowQuality ? 3 : MIRROR_COUNT;
    this.tmpTargetPos.set(opts.cx, opts.cy + 0.85, opts.cz);
    for (let i = 0; i < inst.mirrors.length; i++) {
      const m = inst.mirrors[i];
      if (i >= mirrorLimit) {
        m.mesh.visible = false;
        continue;
      }
      const ang = (i / mirrorLimit) * Math.PI * 2 + 0.35;
      const tierLift = i % 2 === 0 ? 1.85 : 3.05;
      const domeR = (i % 2 === 0 ? 3.55 : 3.05) * opts.areaScale;
      const mx = opts.cx + Math.cos(ang) * domeR;
      const mz = opts.cz + Math.sin(ang) * domeR * 0.84;
      const my = opts.cy + tierLift;
      m.basePos.set(mx, my, mz);
      m.burstDir.subVectors(m.basePos, this.tmpTargetPos).normalize();
      m.mesh.position.copy(m.basePos);
      m.mesh.lookAt(this.tmpTargetPos);
      m.mesh.scale.setScalar(0.01);
      m.mesh.visible = false;
      m.mat.uniforms.uCrackT.value = 0;
      m.mat.uniforms.uLockFlash.value = 0;
    }

    // 6 Curved Dynamic Katana Crescent Slashes bisecting ores across distinct tilted planes!
    const arcLimit = this.lowQuality ? 3 : KATANA_ARC_COUNT;
    for (let i = 0; i < inst.katanaArcs.length; i++) {
      const ka = inst.katanaArcs[i];
      ka.fired = false;
      if (i >= arcLimit) {
        ka.mesh.visible = false;
        continue;
      }
      ka.targetIdx = i % inst.pts.length;
      const tgt = inst.pts[ka.targetIdx];
      ka.delay = 0.08 + i * 0.062;
      ka.mesh.position.set(tgt.x, tgt.y + 1.05 + (i % 3) * 0.22, tgt.z);
      ka.mesh.rotation.copy(ka.baseRot);
      ka.mesh.rotation.y = ka.startSpinY;
      ka.mesh.scale.setScalar((2.8 + (i % 2) * 0.8) * opts.areaScale);
      ka.mesh.visible = false;
      ka.mat.uniforms.uLocalT.value = 0;
    }

    inst.finalSlashMesh.position.set(opts.cx, opts.cy + 1.25, opts.cz);
    inst.finalSlashMesh.rotation.set(0.32, -Math.PI * 0.5, 0.24);
    inst.finalSlashMesh.scale.setScalar(6.2 * opts.areaScale);
    inst.finalSlashMesh.visible = false;

    inst.shockRingCyanMesh.position.set(opts.cx, opts.cy + 0.14, opts.cz);
    inst.shockRingCyanMesh.visible = false;
    inst.shockRingAmberMesh.position.set(opts.cx, opts.cy + 0.18, opts.cz);
    inst.shockRingAmberMesh.visible = false;
    inst.detoPillarMesh.position.set(opts.cx, opts.cy + 0.05, opts.cz);
    inst.detoPillarMesh.visible = false;
    inst.starFlareMesh.position.set(opts.cx, opts.cy + 1.35, opts.cz + 0.25);
    inst.starFlareMesh.visible = false;

    for (let i = 0; i < inst.oreFlashes.length; i++) {
      inst.oreFlashes[i].active = false;
      inst.oreFlashes[i].mesh.visible = false;
    }

    for (let i = 0; i < inst.particles.length; i++) {
      inst.particles[i].active = false;
      inst.particles[i].mesh.visible = false;
    }

    this.hooks.onArenaDim?.(0.86, '#020714', 1.45);
    this.hooks.onSpeedLines?.(1.0, 0.54);
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
      const as = inst.areaScale;

      // Clean Geometric Crystal Seal (no water vortex!)
      inst.sealMat.uniforms.uProgress.value = uProgress;
      inst.sealMat.uniforms.uTime.value = timeSec;
      inst.sealMesh.rotation.z = timeSec * 0.25;
      if (inst.elapsed >= 0.66) {
        inst.sealMat.uniforms.uBlastT.value = Math.min(1, (inst.elapsed - 0.66) / 0.42);
      }

      // 6 Hex Ice Mirrors: Snap Open -> Lock Target -> Detonate Outward!
      const mirrorLimit = this.lowQuality ? 3 : MIRROR_COUNT;
      for (let i = 0; i < mirrorLimit; i++) {
        const m = inst.mirrors[i];
        m.mat.uniforms.uProgress.value = uProgress;
        m.mat.uniforms.uTime.value = timeSec;
        if (inst.elapsed < m.delay) continue;

        if (inst.elapsed < 0.66) {
          m.mesh.visible = true;
          const popT = Math.min(1, (inst.elapsed - m.delay) / 0.10);
          const c1 = 1.70158;
          const popScale = 1 + (c1 + 1) * Math.pow(popT - 1, 3) + c1 * Math.pow(popT - 1, 2);
          m.mesh.scale.setScalar(Math.max(0.01, popScale) * 1.12 * Math.max(0.75, as));
          m.mat.uniforms.uLockFlash.value = inst.elapsed >= 0.46 ? 1.0 : 0.0;
          m.mat.uniforms.uCrackT.value = inst.elapsed >= 0.56 ? 0.9 : 0.0;
        } else if (inst.elapsed < 1.04) {
          const shT = Math.min(1, (inst.elapsed - 0.66) / 0.28);
          m.mesh.visible = true;
          m.mat.uniforms.uCrackT.value = 1.0;
          m.mesh.position.copy(m.basePos).addScaledVector(m.burstDir, shT * 4.2 * as);
          m.mesh.rotation.z += dt * (i % 2 === 0 ? 11 : -11);
          m.mesh.scale.setScalar(1.12 * Math.max(0.75, as) * Math.max(0.01, 1.0 - shT));
        } else {
          m.mesh.visible = false;
        }
      }

      // 6 Fluid Whipping Curved Katana Scars (65ms fast snap curve -> hold on retina -> shatter!)
      const arcLimit = this.lowQuality ? 3 : KATANA_ARC_COUNT;
      for (let i = 0; i < arcLimit; i++) {
        const ka = inst.katanaArcs[i];
        if (inst.elapsed < ka.delay) continue;
        if (inst.elapsed >= ka.delay + 0.55) {
          ka.mesh.visible = false;
          continue;
        }
        ka.mesh.visible = true;
        if (!ka.fired) {
          ka.fired = true;
          const pt = inst.pts[ka.targetIdx];
          this.triggerOreFlash(inst, i, pt, 3.0 * as, false);
          this.hooks.onCameraPush?.(0.09, 0.014);
          inst.onSlashBeatCallback?.(i, pt);
        }
        const kt = Math.min(1, (inst.elapsed - ka.delay) / 0.55);
        // Quick whip swing only in the first 80ms, then HOLD razor-taut in space!
        const whip = 1 - Math.pow(1 - Math.min(1, kt * 6.0), 4);
        ka.mesh.rotation.y = ka.startSpinY + whip * 0.52;
        ka.mat.uniforms.uLocalT.value = kt;
      }

      // 0.46s: Sheathe Silence Pull-Back (tension before final slice)
      if (!inst.lockSilenceFired && inst.elapsed >= 0.46) {
        inst.lockSilenceFired = true;
        this.hooks.onCameraPush?.(-0.28, -0.030);
      }

      // 0.56s: FINAL ZERO-CLEAVE CUT + 0.085s HIT-STOP + B&W INVERTED IMPACT FRAME!
      if (inst.elapsed >= 0.56 && inst.elapsed < 0.94) {
        const ft = Math.min(1, (inst.elapsed - 0.56) / 0.36);
        const fWhip = 1 - Math.pow(1 - Math.min(1, ft * 6.5), 5);
        inst.finalSlashMesh.visible = true;
        inst.finalSlashMesh.rotation.y = THREE.MathUtils.lerp(-2.3, -1.1, fWhip);
        inst.finalSlashMat.uniforms.uLocalT.value = ft;
      } else {
        inst.finalSlashMesh.visible = false;
      }

      if (!inst.finalCutFired && inst.elapsed >= 0.56) {
        inst.finalCutFired = true;
        inst.hitStopTimer = 0.085;
        this.hooks.onImpactFrame?.(1.0, 1.0, '#ffffff', 0.088);
        this.hooks.onFlash?.('#ffffff', 0.85);
        this.hooks.onCameraPush?.(0.32, 0.045);
        this.hooks.onSpeedLines?.(1.0, 0.78);
      }

      // 0.66s: PRIMARY POST-SLASH CRYO-SUPERNOVA EXPLOSION! (Multi-layer blast right when freeze releases!)
      if (!inst.primaryBlastFired && inst.elapsed >= 0.66) {
        inst.primaryBlastFired = true;
        this.tmpTargetPos.set(inst.cx, inst.cy + 1.15, inst.cz);
        this.launchShardBurst(inst, this.tmpTargetPos, 0, this.lowQuality ? 12 : 24, 1.65);
        for (let i = 0; i < Math.min(inst.pts.length, ORE_FLASH_COUNT); i++) {
          this.triggerOreFlash(inst, i, inst.pts[i], 4.4 * as, false);
        }
        this.hooks.onCameraPush?.(0.54, 0.080);
        this.hooks.onFlash?.('#38bdf8', 0.95);
        inst.onImpactCallback?.();
      }

      // Animate Post-Slash Explosion Layers (Shockwave Rings + Vertical Pillar + Blinding Starburst)
      if (inst.elapsed >= 0.66 && inst.elapsed < 1.12) {
        const blastP = Math.min(1, (inst.elapsed - 0.66) / 0.44);
        const expOut = 1 - Math.pow(1 - blastP, 4);

        inst.shockRingCyanMesh.visible = true;
        inst.shockRingCyanMesh.scale.setScalar((1.4 + 9.2 * expOut) * as);
        inst.shockRingCyanMat.uniforms.uLocalT.value = blastP;

        const amberDelay = Math.max(0, (inst.elapsed - 0.72) / 0.40);
        if (amberDelay > 0) {
          const expAmber = 1 - Math.pow(1 - Math.min(1, amberDelay), 4);
          inst.shockRingAmberMesh.visible = true;
          inst.shockRingAmberMesh.scale.setScalar((1.2 + 8.6 * expAmber) * as);
          inst.shockRingAmberMat.uniforms.uLocalT.value = Math.min(1, amberDelay);
        }

        inst.detoPillarMesh.visible = true;
        const pScaleX = (1.6 + 2.4 * expOut) * as;
        const pScaleY = (1.1 + 0.65 * Math.sin(Math.min(1, blastP * 1.4) * Math.PI)) * Math.max(0.75, as);
        inst.detoPillarMesh.scale.set(pScaleX, pScaleY, pScaleX);
        inst.detoPillarMat.uniforms.uLocalT.value = blastP;
        inst.detoPillarMat.uniforms.uTime.value = timeSec;

        const flareT = Math.min(1, (inst.elapsed - 0.66) / 0.28);
        if (flareT < 1) {
          inst.starFlareMesh.visible = true;
          inst.starFlareMesh.scale.setScalar((3.8 + 7.2 * (1 - Math.pow(1 - flareT, 4))) * as);
          inst.starFlareMat.uniforms.uLocalT.value = flareT;
        } else {
          inst.starFlareMesh.visible = false;
        }
      } else {
        inst.shockRingCyanMesh.visible = false;
        inst.shockRingAmberMesh.visible = false;
        inst.detoPillarMesh.visible = false;
        inst.starFlareMesh.visible = false;
      }

      // ACT 3 (0.78s -> 0.96s): Staccato Delayed "Popcorn" Chained Ore Explosions ("POP! POP! POP!")
      const popcornCount = Math.min(4, inst.pts.length);
      while (inst.popcornIdxFired < popcornCount && inst.elapsed >= 0.78 + inst.popcornIdxFired * 0.042) {
        const idx = inst.popcornIdxFired;
        const pt = inst.pts[idx];
        this.triggerOreFlash(inst, idx, pt, 4.2 * as, idx % 2 === 1);
        this.tmpTargetPos.set(pt.x, pt.y + 0.85, pt.z);
        this.launchShardBurst(inst, this.tmpTargetPos, 24 + (idx % 3) * 3, 3, 1.35);
        this.hooks.onCameraPush?.(0.16, 0.024);
        inst.onSlashBeatCallback?.(idx + 6, pt);
        inst.popcornIdxFired++;
      }

      // 0.96s: SECOND NEGATIVE IMPACT FRAME + AMBER-CYAN FINALE SHOCK!
      if (!inst.finaleFired && inst.elapsed >= 0.96) {
        inst.finaleFired = true;
        this.hooks.onImpactFrame?.(0.95, 1.0, '#38bdf8', 0.062);
        this.hooks.onCameraPush?.(0.36, 0.052);
        this.hooks.onFlash?.('#fbbf24', 0.72);
        inst.onImpactCallback?.();
      }

      for (let i = 0; i < inst.oreFlashes.length; i++) {
        const f = inst.oreFlashes[i];
        if (!f.active) continue;
        f.age += dt;
        const lp = Math.min(1, f.age / f.life);
        const pop = 1 - Math.pow(1 - Math.min(1, lp * 3.5), 4);
        f.mesh.scale.setScalar(f.baseScale * (0.48 + 0.85 * pop));
        f.mat.uniforms.uLocalT.value = lp;
        if (lp >= 1) {
          f.active = false;
          f.mesh.visible = false;
        }
      }

      for (let i = 0; i < inst.particles.length; i++) {
        const sp = inst.particles[i];
        if (!sp.active) continue;
        sp.age += dt;
        const lp = Math.min(1, sp.age / sp.life);
        sp.vel.y -= 14.5 * dt;
        sp.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        sp.pos.addScaledVector(sp.vel, dt);
        if (sp.pos.y < sp.floorY) {
          sp.pos.y = sp.floorY;
          sp.vel.y = Math.abs(sp.vel.y) * 0.25;
        }
        sp.mesh.position.copy(sp.pos);
        sp.mesh.scale.setScalar(sp.baseScale);
        sp.mesh.rotation.set(sp.age * sp.spin, Math.atan2(sp.vel.x, sp.vel.z), sp.age * sp.spin * 0.7);
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
