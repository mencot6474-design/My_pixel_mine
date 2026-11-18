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
  private noiseBuffer: AudioBuffer | null = null;
  private activeSpinGain: GainNode | null = null;

  private bgmAudio: HTMLAudioElement | null = null;
  private desiredBgm: BgmKind = 'mine';
  private activeBgm: BgmKind | null = null;
  private bgmVolume = 0.28;
  private sfxVolume = 0.58;
  private userMuted = false;
  private adMuted = false;
  private portalMuted = false;
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
    return this.userMuted || this.adMuted || this.portalMuted || this.hiddenMuted;
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

  public setPortalMuted(muted: boolean): void {
    this.portalMuted = muted;
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

  private prepareSynthCtx(cooldownMs: number, bucket: string): { ctx: AudioContext; gain: GainNode } | null {
    if (typeof window === 'undefined' || this.isEffectivelyMuted()) return null;
    if (!this.unlocked) this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return null;

    const nowMs = performance.now();
    const prev = this.lastPlayedAt.get(bucket) ?? 0;
    if (nowMs - prev < cooldownMs) return null;
    this.lastPlayedAt.set(bucket, nowMs);
    return { ctx, gain: this.sfxGain };
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.06));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private scheduleTone(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    opts: {
      type: OscillatorType;
      freqStart: number;
      freqEnd?: number;
      dur: number;
      peakGain: number;
      attack?: number;
    }
  ): void {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const attack = opts.attack ?? 0.006;
    const endTime = startTime + Math.max(0.02, opts.dur);

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freqStart, startTime);
    if (opts.freqEnd !== undefined && opts.freqEnd !== opts.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), endTime);
    }

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(opts.peakGain, startTime + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, endTime);

    osc.connect(env);
    env.connect(dest);
    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  private scheduleNoiseClick(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    opts: { centerFreq: number; q?: number; dur: number; peakGain: number }
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opts.centerFreq, startTime);
    filter.Q.setValueAtTime(opts.q ?? 2.4, startTime);

    const env = ctx.createGain();
    const endTime = startTime + Math.max(0.015, opts.dur);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(opts.peakGain, startTime + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, endTime);

    src.connect(filter);
    filter.connect(env);
    env.connect(dest);
    src.start(startTime);
    src.stop(endTime + 0.01);
  }

  /**
   * Snappy crystalline dice roll SFX for Plot Mutation rolls.
   */
  public playMutationRoll(isHighTier = false): void {
    const audioCtx = this.prepareSynthCtx(45, 'mutation-roll');
    if (!audioCtx) return;
    const { ctx, gain } = audioCtx;
    const t0 = ctx.currentTime + 0.005;
    const jitter = 0.96 + Math.random() * 0.08;

    // Tactile crystal-dice snap
    this.scheduleNoiseClick(ctx, gain, t0, { centerFreq: 2500 * jitter, q: 2.2, dur: 0.03, peakGain: 0.28 });
    this.scheduleNoiseClick(ctx, gain, t0 + 0.045, { centerFreq: 3100 * jitter, q: 2.6, dur: 0.025, peakGain: 0.22 });

    // Fast ascending shimmer triad
    const notes = isHighTier
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
      : [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const start = t0 + i * (isHighTier ? 0.055 : 0.042);
      const dur = isHighTier ? (i >= 3 ? 0.34 : 0.16) : i === notes.length - 1 ? 0.19 : 0.11;
      this.scheduleTone(ctx, gain, start, {
        type: i % 2 === 0 ? 'triangle' : 'sine',
        freqStart: freq * jitter,
        dur,
        peakGain: isHighTier ? 0.22 : 0.19,
      });
    });

    if (isHighTier) {
      // Warm harmonic pad + high bell sparkle for Frozen+
      this.scheduleTone(ctx, gain, t0 + 0.12, {
        type: 'sine',
        freqStart: 261.63,
        dur: 0.48,
        peakGain: 0.18,
        attack: 0.015,
      });
      this.scheduleTone(ctx, gain, t0 + 0.28, {
        type: 'sine',
        freqStart: 2093.0,
        dur: 0.42,
        peakGain: 0.14,
      });
    }
  }

  /**
   * Decelerating enchanted clock-wheel ticks synced to the 3D Altar spin.
   */
  public playEnchantSpinStart(durationSec = 1.9): void {
    this.cancelEnchantSpinSfx();
    const audioCtx = this.prepareSynthCtx(120, 'enchant-spin');
    if (!audioCtx) return;
    const { ctx, gain } = audioCtx;
    const spinBus = ctx.createGain();
    spinBus.gain.value = 1;
    spinBus.connect(gain);
    this.activeSpinGain = spinBus;

    const t0 = ctx.currentTime + 0.005;
    // Launch arcane whoosh chime
    this.scheduleTone(ctx, spinBus, t0, {
      type: 'triangle',
      freqStart: 280,
      freqEnd: 680,
      dur: 0.2,
      peakGain: 0.18,
      attack: 0.015,
    });

    // 18 decelerating clock peg clicks ending just before the wheel settles
    const tickCount = 18;
    const span = Math.max(0.6, durationSec - 0.14);
    for (let i = 0; i < tickCount; i++) {
      const u = i / (tickCount - 1);
      const tickTime = t0 + 0.04 + span * Math.pow(u, 1.85);
      const pitch = 740 + u * 340;
      const vol = 0.22 - u * 0.05;
      this.scheduleNoiseClick(ctx, spinBus, tickTime, {
        centerFreq: 1700 + u * 900,
        q: 2.8,
        dur: 0.024,
        peakGain: vol,
      });
      this.scheduleTone(ctx, spinBus, tickTime, {
        type: 'sine',
        freqStart: pitch,
        freqEnd: pitch * 1.18,
        dur: 0.036,
        peakGain: vol * 0.85,
        attack: 0.002,
      });
    }
  }

  public cancelEnchantSpinSfx(): void {
    if (!this.activeSpinGain || !this.ctx) return;
    try {
      this.activeSpinGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.015);
    } catch {
      // ignore audio node errors
    }
    this.activeSpinGain = null;
  }

  /**
   * Bright lock-in chime when the Enchant Altar wheel lands on a result.
   */
  public playEnchantSpinLand(isRare = false): void {
    this.activeSpinGain = null;
    const audioCtx = this.prepareSynthCtx(60, 'enchant-land');
    if (!audioCtx) return;
    const { ctx, gain } = audioCtx;
    const t0 = ctx.currentTime + 0.005;

    // Crisp mechanical latch
    this.scheduleNoiseClick(ctx, gain, t0, { centerFreq: 1400, q: 1.8, dur: 0.04, peakGain: 0.24 });

    const chord = isRare ? [329.63, 415.3, 493.88, 659.25, 830.61, 987.77, 1318.51] : [329.63, 415.3, 493.88, 659.25];
    chord.forEach((freq, i) => {
      this.scheduleTone(ctx, gain, t0 + i * 0.036, {
        type: i === 0 ? 'triangle' : 'sine',
        freqStart: freq,
        dur: isRare ? 0.42 : 0.28,
        peakGain: isRare ? 0.21 : 0.18,
        attack: 0.006,
      });
    });
  }

  /**
   * Crisp crystal latch when equipping/unequipping an Enchant on a plot.
   */
  public playEnchantEquip(): void {
    const audioCtx = this.prepareSynthCtx(40, 'enchant-equip');
    if (!audioCtx) return;
    const { ctx, gain } = audioCtx;
    const t0 = ctx.currentTime + 0.005;
    this.scheduleTone(ctx, gain, t0, { type: 'triangle', freqStart: 587.33, dur: 0.09, peakGain: 0.18 });
    this.scheduleTone(ctx, gain, t0 + 0.045, { type: 'sine', freqStart: 880.0, dur: 0.16, peakGain: 0.2 });
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
    if (muted) {
      this.cancelEnchantSpinSfx();
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.sfxVolume, this.ctx.currentTime, 0.015);
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
