import * as THREE from 'three';
import { getWeatherById, WeatherId } from '../game/WeatherData';

export interface WeatherSkyMaterialHandle {
  material: THREE.ShaderMaterial;
  setWeather: (weatherId: WeatherId) => void;
  update: (elapsed: number) => void;
}

const WEATHER_TYPE_INDEX: Record<WeatherId, number> = {
  light_rain: 0,
  snow_rain: 1,
  bloodmoon: 2,
  void: 3,
  celestial: 4,
};

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uWeatherType;
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uMistColor;
  uniform vec3 uCloudDarkColor;
  uniform vec3 uCloudLitColor;
  uniform vec3 uCelestialDir;
  uniform vec3 uCelestialColor;
  uniform vec3 uAuroraColor;

  varying vec3 vLocalPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise2(p);
      p = rot * p * 2.04 + vec2(17.1, 31.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vLocalPos);

    // Map isometric/pitched-down camera rays into atmospheric sky elevation:
    // Behind island terrain edge (~dir.y = -0.35), skyAlt starts cleanly at horizon mist (0.0).
    float skyAlt = clamp((dir.y + 0.35) * 2.35, -0.35, 1.0);
    float hNorm = clamp(skyAlt, 0.0, 1.0);

    // Smooth 3-stop atmospheric sky dome gradient
    vec3 skyCol = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.36, hNorm));
    skyCol = mix(skyCol, uZenithColor, smoothstep(0.32, 0.92, hNorm));

    // Spherical azimuth angle for seamless 360 horizontal wrap
    float az = atan(dir.x, -dir.z);
    vec2 cloudUv = vec2(az * 2.2 + uTime * 0.016, hNorm * 3.4);

    // Soft starfield for night / twilight / snow / void / celestial (type > 0.5)
    float starMask = step(0.5, uWeatherType) * smoothstep(0.08, 0.42, hNorm);
    if (starMask > 0.01) {
      vec2 grid = vec2(az * 38.0, hNorm * 28.0);
      vec2 cell = floor(grid);
      vec2 f = fract(grid) - 0.5;
      float rnd = hash21(cell);
      if (rnd > 0.84) {
        float dist = length(f - (vec2(hash21(cell + 3.1), hash21(cell + 7.7)) - 0.5) * 0.55);
        float twinkle = 0.62 + 0.38 * sin(uTime * (1.8 + rnd * 3.5) + rnd * 25.0);
        float star = smoothstep(0.11, 0.015, dist) * twinkle * starMask;
        skyCol += mix(vec3(0.85, 0.92, 1.0), uCelestialColor, 0.25) * star * 0.9;
      }
    }

    // Northern Aurora / Cosmic Nebula ribbons (Snow Rain = 1, Void = 3, Celestial = 4)
    if (uWeatherType > 0.5 && (abs(uWeatherType - 1.0) < 0.2 || uWeatherType > 2.5)) {
      float wave = sin(az * 2.6 + uTime * 0.22 + fbm(vec2(az * 1.4, uTime * 0.06)) * 2.2);
      float band = smoothstep(0.35, 0.0, abs(hNorm - 0.34 - wave * 0.075));
      float shimmer = fbm(vec2(az * 5.0 - uTime * 0.09, hNorm * 4.5));
      float auroraAlpha = band * shimmer * smoothstep(0.05, 0.24, hNorm) * 0.42;
      skyCol += uAuroraColor * auroraAlpha;
    }

    // Atmospheric Celestial Phenomenon embedded at sky infinity (behind drifting clouds!)
    vec3 celDir = normalize(uCelestialDir);
    float ang = acos(clamp(dot(dir, celDir), -1.0, 1.0));

    // Ambient Mie sky glow around celestial direction
    float mieGlow = exp(-ang * 5.5) * 0.36 + exp(-ang * 14.0) * 0.42;
    if (abs(uWeatherType - 2.0) < 0.2) {
      // BLOODMOON: Atmospheric crimson glow + cratered lunar disc
      skyCol += uCelestialColor * mieGlow * 0.72;
      float moonMask = smoothstep(0.056, 0.050, ang);
      if (moonMask > 0.001) {
        // Subtle procedural lunar maria shading inside the moon
        vec2 mUv = vec2(dir.x - celDir.x, dir.y - celDir.y) * 26.0;
        float craters = fbm(mUv + vec2(2.4, 1.1));
        vec3 moonSurface = mix(vec3(0.45, 0.06, 0.08), vec3(1.0, 0.62, 0.55), craters * 0.85 + 0.15);
        float limb = smoothstep(0.056, 0.025, ang);
        moonSurface = mix(uCelestialColor * 1.15, moonSurface, 0.75 * limb + 0.25);
        skyCol = mix(skyCol, moonSurface, moonMask * 0.92);
      }
      // Faint atmospheric lunar halo ring
      float haloRing = smoothstep(0.018, 0.0, abs(ang - 0.072)) * 0.18;
      skyCol += uCelestialColor * haloRing;
    } else if (abs(uWeatherType - 3.0) < 0.2) {
      // VOID: Sleek Cosmic Black-Hole Eclipse integrated into deep sky
      skyCol += uCelestialColor * mieGlow * 0.8;
      float ring = smoothstep(0.016, 0.0, abs(ang - 0.050)) * 0.95;
      float outerArc = smoothstep(0.025, 0.0, abs(ang - 0.075)) * 0.26;
      float coreMask = smoothstep(0.047, 0.042, ang);
      skyCol += uCelestialColor * (ring + outerArc);
      skyCol = mix(skyCol, vec3(0.015, 0.005, 0.04), coreMask * 0.96);
    } else if (abs(uWeatherType - 4.0) < 0.2) {
      // CELESTIAL: Radiant Astral Star + wide golden sunfall glow + soft star rays
      skyCol += uCelestialColor * (exp(-ang * 4.2) * 0.42 + exp(-ang * 12.0) * 0.65);
      vec2 rel = vec2(dir.x - celDir.x, (dir.y - celDir.y) * 1.45);
      float flareH = exp(-abs(rel.y) * 95.0) * exp(-abs(rel.x) * 9.0) * 0.55;
      float flareV = exp(-abs(rel.x) * 95.0) * exp(-abs(rel.y) * 9.0) * 0.55;
      skyCol += vec3(1.0, 0.97, 0.84) * (flareH + flareV);
      float sunCore = smoothstep(0.044, 0.018, ang);
      skyCol = mix(skyCol, vec3(1.0, 0.98, 0.88), sunCore * 0.94);
    }

    // Layered FBM drifting volumetric sky clouds — clouds naturally veil stars AND celestial body!
    float cloudNoise1 = fbm(cloudUv);
    float cloudNoise2 = fbm(cloudUv * 1.9 + vec2(-uTime * 0.024, 4.3));
    float cloudBase = cloudNoise1 * 0.68 + cloudNoise2 * 0.32;

    float stormBias = abs(uWeatherType) < 0.2 ? 0.40 : 0.49;
    float cloudDensity = smoothstep(stormBias, stormBias + 0.26, cloudBase);
    cloudDensity *= smoothstep(0.01, 0.16, hNorm) * smoothstep(0.98, 0.38, hNorm);

    // Clouds catch warm/bright horizon light underneath, darker at tops
    float cloudLit = smoothstep(0.2, 0.7, cloudNoise2) * smoothstep(0.45, 0.05, hNorm);
    vec3 cloudCol = mix(uCloudDarkColor, uCloudLitColor, cloudLit * 0.72 + 0.15);

    // Subtle distant lightning pulse inside clouds during Light Rain (weather 0)
    if (abs(uWeatherType) < 0.2) {
      float boltSeed = floor(uTime * 0.55);
      float boltTrig = step(0.84, hash21(vec2(boltSeed, 9.2)));
      float pulse = pow(fract(uTime * 0.55), 0.35) * (1.0 - fract(uTime * 0.55));
      float flashPatch = smoothstep(0.35, 0.85, sin(az * 3.0 + boltSeed * 5.1));
      cloudCol += vec3(0.55, 0.78, 1.0) * boltTrig * pulse * flashPatch * 0.75;
    }

    skyCol = mix(skyCol, cloudCol, cloudDensity * (abs(uWeatherType) < 0.2 ? 0.82 : 0.56));

    // Smooth atmospheric mist band right above & below horizon so terrain fog blends with zero seam!
    float mistFactor = smoothstep(0.16, -0.04, skyAlt);
    skyCol = mix(skyCol, uMistColor, mistFactor);

    gl_FragColor = vec4(skyCol, 1.0);
  }
`;

export function createWeatherSkyMaterial(initialWeather: WeatherId): WeatherSkyMaterialHandle {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWeatherType: { value: WEATHER_TYPE_INDEX[initialWeather] ?? 0 },
      uZenithColor: { value: new THREE.Color('#0f172a') },
      uMidColor: { value: new THREE.Color('#1e293b') },
      uHorizonColor: { value: new THREE.Color('#475569') },
      uMistColor: { value: new THREE.Color('#64748b') },
      uCloudDarkColor: { value: new THREE.Color('#1e293b') },
      uCloudLitColor: { value: new THREE.Color('#94a3b8') },
      uCelestialDir: { value: new THREE.Vector3(-0.34, -0.24, -0.91).normalize() },
      uCelestialColor: { value: new THREE.Color('#f87171') },
      uAuroraColor: { value: new THREE.Color('#38bdf8') },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const setWeather = (weatherId: WeatherId): void => {
    const def = getWeatherById(weatherId);
    mat.uniforms.uWeatherType.value = WEATHER_TYPE_INDEX[def.id] ?? 0;
    mat.uniforms.uZenithColor.value.set(def.skyTopHex);
    mat.uniforms.uMidColor.value.set(def.skyMidHex);
    mat.uniforms.uHorizonColor.value.set(def.skyBottomHex);
    mat.uniforms.uMistColor.value.setHex(def.fogTintHex);
    mat.uniforms.uCloudDarkColor.value.set(def.cloudDarkHex);
    mat.uniforms.uCloudLitColor.value.set(def.cloudHex);
    mat.uniforms.uCelestialColor.value.set(def.accentColor);
    mat.uniforms.uAuroraColor.value.set(def.auroraHex);

    // Position celestial phenomenon in the open upper-left or upper-right sky band
    // calibrated for camera pitch (-34 deg, top ray dir.y ~ -0.22):
    // dir.y = -0.258 -> skyAlt ~ 0.22, clean margin below HUD top bar & above grass horizon!
    if (def.id === 'bloodmoon') {
      mat.uniforms.uCelestialDir.value.set(-0.34, -0.285, -0.896).normalize();
    } else {
      mat.uniforms.uCelestialDir.value.set(0.34, -0.285, -0.896).normalize();
    }
  };

  setWeather(initialWeather);

  return {
    material: mat,
    setWeather,
    update: (elapsed: number) => {
      mat.uniforms.uTime.value = elapsed;
    },
  };
}
