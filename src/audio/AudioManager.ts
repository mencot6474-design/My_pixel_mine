import { assetUrl } from '../game/AssetUrl';
import type { SceneMode } from '../game3d/MineScene3D';
import type { OreVariantKey } from '../game3d/MineWorldPalette';

export type BgmKind = 'mine' | 'shop' | 'tower' | 'boss';

export type SfxKey =
  | 'ui-click'
  | 'ui-open'
  | 'ui-close'
  | 'ui-tab'
  | 'ui-error'
  | 'ore-hit-1'
  | 'ore-hit-2'
  | 'ore-hit-3'
  | 'ore-break-1'
  | 'ore-break-2'
  | 'ore-break-gem'
  | 'coin'
  | 'coin-alt'
  | 'upgrade'
  | 'unlock'
  | 'place-chibi'
  | 'equip-pick'
  | 'potion'
  | 'teleport'
  | 'spin-start'
  | 'magic-roll'
  | 'rare-fanfare'
  | 'chibi-swing'
  | 'wave-clear';

const MUTE_STORAGE_KEY = 'mam_audio_muted_v1';

const BGM_URLS: Record<BgmKind, string> = {
  mine: '/audio/bgm/bgm-mine.mp3',
  shop: '/audio/bgm/bgm-shop.mp3',
  tower: '/audio/bgm/bgm-tower.mp3',
  boss: '/audio/bgm/bgm-boss.mp3',
};

const SFX_URLS: Record<SfxKey, string> = {
  'ui-click': '/audio/sfx/ui-click.wav',
  'ui-open': '/audio/sfx/ui-open.wav',
  'ui-close': '/audio/sfx/ui-close.wav',
  'ui-tab': '/audio/sfx/ui-tab.wav',
  'ui-error': '/audio/sfx/ui-error.mp3',
  'ore-hit-1': '/audio/sfx/ore-hit-1.ogg',
  'ore-hit-2': '/audio/sfx/ore-hit-2.ogg',
  'ore-hit-3': '/audio/sfx/ore-hit-3.ogg',
  'ore-break-1': '/audio/sfx/ore-break-1.ogg',
  'ore-break-2': '/audio/sfx/ore-break-2.ogg',
  'ore-break-gem': '/audio/sfx/ore-break-gem.ogg',
  coin: '/audio/sfx/coin.ogg',
  'coin-alt': '/audio/sfx/coin-alt.ogg',
  upgrade: '/audio/sfx/upgrade.mp3',
  unlock: '/audio/sfx/unlock.mp3',
  'place-chibi': '/audio/sfx/place-chibi.ogg',
  'equip-pick': '/audio/sfx/equip-pick.ogg',
  potion: '/audio/sfx/potion.wav',
  teleport: '/audio/sfx/teleport.mp3',
  'spin-start': '/audio/sfx/spin-start.mp3',
  'magic-roll': '/audio/sfx/magic-roll.wav',
  'rare-fanfare': '/audio/sfx/rare-fanfare.mp3',
  'chibi-swing': '/audio/sfx/chibi-swing.wav',
  'wave-clear': '/audio/sfx/wave-clear.mp3',
};

const PRELOAD_SFX: readonly SfxKey[] = [
  'ore-hit-1',
  'ore-hit-2',
  'ore-hit-3',
  'ore-break-1',
  'ore-break-2',
  'ore-break-gem',
  'ui-click',
  'ui-open',
  'ui-close',
  'ui-tab',
  'ui-error',
  'coin',
  'upgrade',
];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private readonly buffers = new Map<SfxKey, AudioBuffer>();
  private readonly loading = new Map<SfxKey, Promise<AudioBuffer | null>>();
  private readonly lastPlayedAt = new Map<string, number>();

  private bgmAudio: HTMLAudioElement | null = null;
  private desiredBgm: BgmKind = 'mine';
  private activeBgm: BgmKind | null = null;
  private bgmVolume = 0.28;
  private sfxVolume = 0.58;
  private userMuted = false;
  private adMuted = false;
  private hiddenMuted = false;
  private unlocked = false;
  private gestureBound = false;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.userMuted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      // ignore storage errors
    }
    this.bindLifecycle();
  }

  public isMuted(): boolean {
    return this.userMuted;
  }

  public isEffectivelyMuted(): boolean {
    return this.userMuted || this.adMuted || this.hiddenMuted;
  }

  public toggleMuted(): boolean {
    this.userMuted = !this.userMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, this.userMuted ? '1' : '0');
      } catch {
        // ignore storage errors
      }
    }
    this.syncAudioState();
    if (!this.userMuted) {
      this.unlock();
      this.playSfx('ui-click', { volume: 0.45 });
    }
    return this.userMuted;
  }

  public setAdMuted(muted: boolean): void {
    this.adMuted = muted;
    this.syncAudioState();
  }

  public setSceneMode(mode: SceneMode, isBossWave = false): void {
    const nextBgm: BgmKind =
      mode === 'tower' ? (isBossWave ? 'boss' : 'tower') : mode === 'shop' || mode === 'altar' ? 'shop' : 'mine';
    this.playBgm(nextBgm);
  }

  public playBgm(kind: BgmKind): void {
    if (typeof window === 'undefined') return;
    this.desiredBgm = kind;
    if (!this.unlocked) return;
    this.startDesiredBgm();
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    this.unlocked = true;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    if (!this.isEffectivelyMuted()) {
      this.startDesiredBgm();
    }
    for (const key of PRELOAD_SFX) {
      void this.loadBuffer(key);
    }
  }

  public playSfx(
    key: SfxKey,
    opts?: { volume?: number; pitchMin?: number; pitchMax?: number; cooldownMs?: number; bucket?: string }
  ): void {
    if (typeof window === 'undefined' || this.isEffectivelyMuted()) return;
    if (!this.unlocked) this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const nowMs = performance.now();
    const bucket = opts?.bucket ?? key;
    const cooldown = opts?.cooldownMs ?? 35;
    const prev = this.lastPlayedAt.get(bucket) ?? 0;
    if (nowMs - prev < cooldown) return;
    this.lastPlayedAt.set(bucket, nowMs);

    const playFromBuf = (buf: AudioBuffer) => {
      if (this.isEffectivelyMuted()) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const minRate = opts?.pitchMin ?? 0.97;
      const maxRate = opts?.pitchMax ?? 1.03;
      src.playbackRate.value = minRate + Math.random() * (maxRate - minRate);
      const gain = ctx.createGain();
      gain.gain.value = opts?.volume ?? 1;
      src.connect(gain);
      gain.connect(this.sfxGain!);
      src.start();
    };

    const cached = this.buffers.get(key);
    if (cached) {
      playFromBuf(cached);
    } else {
      void this.loadBuffer(key).then((buf) => {
        if (buf) playFromBuf(buf);
      });
    }
  }

  public playOreHit(isClick: boolean, crystalTone = false): void {
    const key: SfxKey = crystalTone
      ? 'ore-hit-3'
      : Math.random() < 0.55
        ? 'ore-hit-1'
        : Math.random() < 0.7
          ? 'ore-hit-2'
          : 'ore-hit-3';
    this.playSfx(key, {
      volume: isClick ? 0.62 : 0.22,
      pitchMin: isClick ? 0.93 : 0.9,
      pitchMax: isClick ? 1.12 : 1.08,
      cooldownMs: isClick ? 45 : 220,
      bucket: isClick ? 'ore-hit-tap' : 'ore-hit-auto',
    });
  }

  public playOreBreak(variantKey: OreVariantKey | 'tower' = 'common'): void {
    const key: SfxKey =
      variantKey === 'geode' || variantKey === 'tower'
        ? 'ore-break-gem'
        : Math.random() < 0.5
          ? 'ore-break-1'
          : 'ore-break-2';
    this.playSfx(key, {
      volume: variantKey === 'geode' ? 0.72 : 0.56,
      pitchMin: 0.94,
      pitchMax: 1.08,
      cooldownMs: 85,
      bucket: 'ore-break',
    });
  }

  private bindLifecycle(): void {
    if (this.gestureBound || typeof window === 'undefined') return;
    this.gestureBound = true;

    const onFirstGesture = () => {
      this.unlock();
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('keydown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
    };
    window.addEventListener('pointerdown', onFirstGesture, true);
    window.addEventListener('keydown', onFirstGesture, true);
    window.addEventListener('touchstart', onFirstGesture, true);

    document.addEventListener('visibilitychange', () => {
      this.hiddenMuted = document.hidden;
      this.syncAudioState();
    });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    this.ctx = new AudioCtx();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.isEffectivelyMuted() ? 0 : this.sfxVolume;
    this.sfxGain.connect(this.ctx.destination);
    return this.ctx;
  }

  private async loadBuffer(key: SfxKey): Promise<AudioBuffer | null> {
    const existing = this.buffers.get(key);
    if (existing) return existing;
    const pending = this.loading.get(key);
    if (pending) return pending;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const task = fetch(assetUrl(SFX_URLS[key]))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr))
      .then((decoded) => {
        this.buffers.set(key, decoded);
        return decoded;
      })
      .catch(() => null)
      .finally(() => {
        this.loading.delete(key);
      });

    this.loading.set(key, task);
    return task;
  }

  private startDesiredBgm(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (this.activeBgm === this.desiredBgm && this.bgmAudio) {
      if (!this.isEffectivelyMuted() && this.bgmAudio.paused) {
        void this.bgmAudio.play().catch(() => undefined);
      }
      return;
    }

    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = '';
      this.bgmAudio = null;
    }

    const next = new Audio(assetUrl(BGM_URLS[this.desiredBgm]));
    next.loop = true;
    next.preload = 'auto';
    next.volume = this.isEffectivelyMuted() ? 0 : this.bgmVolume;
    this.bgmAudio = next;
    this.activeBgm = this.desiredBgm;

    if (!this.isEffectivelyMuted()) {
      void next.play().catch(() => undefined);
    }
  }

  private syncAudioState(): void {
    const muted = this.isEffectivelyMuted();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.sfxVolume, this.ctx.currentTime, 0.02);
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = muted ? 0 : this.bgmVolume;
      if (muted) {
        this.bgmAudio.pause();
      } else if (this.unlocked) {
        void this.bgmAudio.play().catch(() => undefined);
      }
    } else if (!muted && this.unlocked) {
      this.startDesiredBgm();
    }
  }
}

export const audio = new AudioManager();
