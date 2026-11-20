export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GraphicsPreset {
  maxPixelRatio: number;
  shadowsEnabled: boolean;
  weatherParticleScale: number;
}

export interface GameSettingsData {
  graphicsQuality: GraphicsQuality;
  bgmVolume: number;
  sfxVolume: number;
  showDamagePopups: boolean;
  cameraLocked: boolean;
}

export const SETTINGS_STORAGE_KEY = 'mam_settings_v1';

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
  low: {
    maxPixelRatio: 1.5,
    shadowsEnabled: false,
    weatherParticleScale: 0,
  },
  medium: {
    maxPixelRatio: 2,
    shadowsEnabled: true,
    weatherParticleScale: 0.5,
  },
  high: {
    maxPixelRatio: 2.5,
    shadowsEnabled: true,
    weatherParticleScale: 1,
  },
};

export const DEFAULT_GAME_SETTINGS: GameSettingsData = {
  graphicsQuality: 'high',
  bgmVolume: 1,
  sfxVolume: 1,
  showDamagePopups: true,
  cameraLocked: false,
};

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'low' || value === 'medium' || value === 'high';
}

function clampUnitNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function normalizeGameSettings(raw: unknown): GameSettingsData {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    graphicsQuality: isGraphicsQuality(obj.graphicsQuality)
      ? obj.graphicsQuality
      : DEFAULT_GAME_SETTINGS.graphicsQuality,
    bgmVolume: clampUnitNumber(obj.bgmVolume, DEFAULT_GAME_SETTINGS.bgmVolume),
    sfxVolume: clampUnitNumber(obj.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    showDamagePopups:
      typeof obj.showDamagePopups === 'boolean'
        ? obj.showDamagePopups
        : DEFAULT_GAME_SETTINGS.showDamagePopups,
    cameraLocked:
      typeof obj.cameraLocked === 'boolean'
        ? obj.cameraLocked
        : DEFAULT_GAME_SETTINGS.cameraLocked,
  };
}

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class GameSettings {
  private data: GameSettingsData;
  private readonly listeners = new Set<(settings: GameSettingsData) => void>();
  private readonly storage: Storage | null;

  constructor(storage?: Storage | null) {
    this.storage = storage === undefined ? getDefaultStorage() : storage;
    this.data = this.load();
  }

  public get(): GameSettingsData {
    return { ...this.data };
  }

  public update(patch: Partial<GameSettingsData>): GameSettingsData {
    const next = normalizeGameSettings({ ...this.data, ...patch });
    const changed =
      next.graphicsQuality !== this.data.graphicsQuality ||
      next.bgmVolume !== this.data.bgmVolume ||
      next.sfxVolume !== this.data.sfxVolume ||
      next.showDamagePopups !== this.data.showDamagePopups ||
      next.cameraLocked !== this.data.cameraLocked;
    this.data = next;
    this.save();
    if (changed) {
      const snapshot = this.get();
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    }
    return this.get();
  }

  public reset(): GameSettingsData {
    return this.update(DEFAULT_GAME_SETTINGS);
  }

  public subscribe(listener: (settings: GameSettingsData) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): GameSettingsData {
    if (!this.storage) return { ...DEFAULT_GAME_SETTINGS };
    try {
      const raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GAME_SETTINGS };
      return normalizeGameSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  private save(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore storage quota / privacy mode failures
    }
  }
}

export const gameSettings = new GameSettings();
