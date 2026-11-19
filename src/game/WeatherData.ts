export type WeatherId = 'light_rain' | 'snow_rain' | 'bloodmoon' | 'void' | 'celestial';

export const WEATHER_DURATION_MS = 3 * 60 * 1000;

export interface WeatherDef {
  id: WeatherId;
  name: string;
  shortName: string;
  chancePct: number;
  oreDropMult: number;
  gemDropMult: number;
  damageMult: number;
  accentColor: string;
  glowColor: string;
  particleColor: string;
  fogTintHex: number;
  tintStrength: number;
  skyTopHex: string;
  skyMidHex: string;
  skyBottomHex: string;
  skyBlend: number;
  cloudHex: string;
  cloudDarkHex: string;
  auroraHex: string;
  hemiTintHex: number;
  hemiIntensity: number;
  sunIntensity: number;
  rimTintHex: number;
  particleAdditive: boolean;
  description: string;
}

export const WEATHERS: readonly WeatherDef[] = [
  {
    id: 'light_rain',
    name: 'Light Rain',
    shortName: 'Rain',
    chancePct: 32,
    oreDropMult: 1.5,
    gemDropMult: 1.25,
    damageMult: 1.25,
    accentColor: '#7dd3fc',
    glowColor: '#0284c7',
    particleColor: '#e0f2fe',
    fogTintHex: 0x9db8cf,
    tintStrength: 0.85,
    skyTopHex: '#38699e',
    skyMidHex: '#7ba3c9',
    skyBottomHex: '#d3e5f2',
    skyBlend: 1,
    cloudHex: '#cbd5e1',
    cloudDarkHex: '#475569',
    auroraHex: '#38bdf8',
    hemiTintHex: 0xdbeafe,
    hemiIntensity: 0.96,
    sunIntensity: 1.52,
    rimTintHex: 0x7dd3fc,
    particleAdditive: false,
    description: 'Gentle shower rinsing rich surface veins.',
  },
  {
    id: 'snow_rain',
    name: 'Snow Rain',
    shortName: 'Snow',
    chancePct: 28,
    oreDropMult: 2,
    gemDropMult: 1.5,
    damageMult: 1.5,
    accentColor: '#bae6fd',
    glowColor: '#38bdf8',
    particleColor: '#f8fafc',
    fogTintHex: 0xb9cfe0,
    tintStrength: 0.85,
    skyTopHex: '#2f5580',
    skyMidHex: '#7396bd',
    skyBottomHex: '#dbe9f4',
    skyBlend: 1,
    cloudHex: '#e2e8f0',
    cloudDarkHex: '#334155',
    auroraHex: '#5eead4',
    hemiTintHex: 0xe0f2fe,
    hemiIntensity: 1.0,
    sunIntensity: 1.65,
    rimTintHex: 0xbae6fd,
    particleAdditive: false,
    description: 'Frostbite crystals brittle-crack rock formations.',
  },
  {
    id: 'bloodmoon',
    name: 'Bloodmoon',
    shortName: 'Bloodmoon',
    chancePct: 20,
    oreDropMult: 3,
    gemDropMult: 2,
    damageMult: 2.5,
    accentColor: '#f87171',
    glowColor: '#dc2626',
    particleColor: '#fb7185',
    fogTintHex: 0x6e3038,
    tintStrength: 0.9,
    skyTopHex: '#26101c',
    skyMidHex: '#5c2233',
    skyBottomHex: '#a34a4a',
    skyBlend: 1,
    cloudHex: '#9f4a52',
    cloudDarkHex: '#17090e',
    auroraHex: '#ef4444',
    hemiTintHex: 0xfecdd3,
    hemiIntensity: 0.82,
    sunIntensity: 1.38,
    rimTintHex: 0xf87171,
    particleAdditive: true,
    description: 'Crimson eclipse awakens relentless strike power.',
  },
  {
    id: 'void',
    name: 'Void',
    shortName: 'Void',
    chancePct: 15,
    oreDropMult: 5,
    gemDropMult: 2.5,
    damageMult: 3,
    accentColor: '#c084fc',
    glowColor: '#7c3aed',
    particleColor: '#d8b4fe',
    fogTintHex: 0x3a2a5c,
    tintStrength: 0.92,
    skyTopHex: '#120a26',
    skyMidHex: '#2a1850',
    skyBottomHex: '#563a86',
    skyBlend: 1,
    cloudHex: '#7e5bef',
    cloudDarkHex: '#0e071c',
    auroraHex: '#a855f7',
    hemiTintHex: 0xe9d5ff,
    hemiIntensity: 0.84,
    sunIntensity: 1.42,
    rimTintHex: 0xc084fc,
    particleAdditive: true,
    description: 'Abyssal rift tears open deep dimensional ore.',
  },
  {
    id: 'celestial',
    name: 'Celestial',
    shortName: 'Celestial',
    chancePct: 5,
    oreDropMult: 10,
    gemDropMult: 4,
    damageMult: 5,
    accentColor: '#fde047',
    glowColor: '#f59e0b',
    particleColor: '#fef08a',
    fogTintHex: 0x8a6a3a,
    tintStrength: 0.88,
    skyTopHex: '#1c2452',
    skyMidHex: '#4a4290',
    skyBottomHex: '#d19a4e',
    skyBlend: 1,
    cloudHex: '#fcd34d',
    cloudDarkHex: '#312e81',
    auroraHex: '#38bdf8',
    hemiTintHex: 0xfef3c7,
    hemiIntensity: 1.08,
    sunIntensity: 1.92,
    rimTintHex: 0xfde047,
    particleAdditive: true,
    description: 'Mythic starfall blesses miners with radiant abundance.',
  },
];

export function isValidWeatherId(id: unknown): id is WeatherId {
  return typeof id === 'string' && WEATHERS.some((w) => w.id === id);
}

export function getWeatherById(id: string | null | undefined): WeatherDef {
  return WEATHERS.find((w) => w.id === id) ?? WEATHERS[0];
}

export function rollWeatherDef(rng: () => number = Math.random): WeatherDef {
  const roll = Math.max(0, Math.min(0.999999999, rng())) * 100;
  let acc = 0;
  for (const w of WEATHERS) {
    acc += w.chancePct;
    if (roll < acc) return w;
  }
  return WEATHERS[WEATHERS.length - 1];
}
