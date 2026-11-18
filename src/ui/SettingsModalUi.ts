import { audio } from '../audio/AudioManager';
import { GameSettings, gameSettings, GraphicsQuality } from '../game/GameSettings';
import { renderModalShell } from './HudShared';

const QUALITY_OPTIONS: ReadonlyArray<{
  id: GraphicsQuality;
  label: string;
  desc: string;
}> = [
  { id: 'low', label: 'Low', desc: 'Max FPS • Shadows & Weather FX Off' },
  { id: 'medium', label: 'Medium', desc: 'Balanced • 50% Weather Particles' },
  { id: 'high', label: 'High', desc: 'Full Sharpness • Shadows & Weather On' },
];

const GEAR_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="#bae6fd" stroke-width="2"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#38bdf8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export class SettingsModalUi {
  constructor(
    private readonly settings: GameSettings = gameSettings,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly requestRender: () => void = () => undefined
  ) {}

  public renderModal(): string {
    const s = this.settings.get();
    const muted = audio.isMuted();
    const bgmPct = Math.round(s.bgmVolume * 100);
    const sfxPct = Math.round(s.sfxVolume * 100);
    const activeQualityMeta = QUALITY_OPTIONS.find((q) => q.id === s.graphicsQuality) ?? QUALITY_OPTIONS[2];

    const qualityBtnsHtml = QUALITY_OPTIONS.map((opt) => {
      const isSelected = s.graphicsQuality === opt.id;
      const cls = isSelected
        ? 'border-sky-300/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.42),rgba(37,99,235,0.45))] text-white shadow-[0_0_16px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.32)]'
        : 'border-white/12 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white';
      return `
        <button
          type="button"
          class="flex-1 py-2.5 px-3 rounded-xl border text-[14px] font-black cursor-pointer transition-[transform,filter,background,border-color] duration-150 ease-out active:scale-[0.97] ${cls}"
          data-settings-quality="${opt.id}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
        >
          ${opt.label}
        </button>
      `;
    }).join('');

    const togglePill = (on: boolean): string =>
      on
        ? 'border-emerald-300/70 bg-[linear-gradient(135deg,rgba(34,197,94,0.88),rgba(5,150,105,0.92))] text-white shadow-[0_4px_14px_rgba(34,197,94,0.35)]'
        : 'border-slate-500/45 bg-slate-800/80 text-slate-300';

    const mutePill = muted
      ? 'border-rose-400/70 bg-[linear-gradient(135deg,rgba(244,63,94,0.88),rgba(190,18,60,0.92))] text-white shadow-[0_4px_14px_rgba(244,63,94,0.35)]'
      : 'border-sky-300/60 bg-[linear-gradient(135deg,rgba(14,165,233,0.82),rgba(2,132,199,0.9))] text-white shadow-[0_4px_14px_rgba(56,189,248,0.3)]';

    const bodyHtml = `
      <div class="w-full flex flex-col gap-3.5 text-left">
        <section class="mam-inspector-well p-3.5 rounded-2xl flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-[14px] font-black text-white tracking-wide uppercase">Graphics Quality</div>
              <div class="text-[12px] font-bold text-slate-300" data-settings-quality-desc="true">${activeQualityMeta.desc}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${qualityBtnsHtml}
          </div>
        </section>

        <section class="mam-inspector-well p-3.5 rounded-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <div class="text-[14px] font-black text-white tracking-wide uppercase">Audio</div>
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-xl border text-[12px] font-black uppercase tracking-wide cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.97] ${mutePill}"
              data-settings-action="toggle-mute"
            >
              ${muted ? 'Muted' : 'Audio ON'}
            </button>
          </div>

          <label class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-[13px] font-extrabold text-slate-200">
              <span>Music (BGM)</span>
              <span class="tabular-nums text-sky-300" data-settings-val="bgm">${bgmPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value="${bgmPct}"
              data-settings-slider="bgm"
              class="w-full accent-sky-400 cursor-pointer h-2 rounded-lg bg-slate-800/90"
              aria-label="Music Volume"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-[13px] font-extrabold text-slate-200">
              <span>Sound Effects (SFX)</span>
              <span class="tabular-nums text-sky-300" data-settings-val="sfx">${sfxPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value="${sfxPct}"
              data-settings-slider="sfx"
              class="w-full accent-sky-400 cursor-pointer h-2 rounded-lg bg-slate-800/90"
              aria-label="Sound Effects Volume"
            />
          </label>
        </section>

        <section class="mam-inspector-well p-3.5 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <div class="text-[14px] font-black text-white tracking-wide uppercase">Damage Popups</div>
            <div class="text-[12px] font-bold text-slate-300">Show floating damage numbers when mining</div>
          </div>
          <button
            type="button"
            class="min-w-[74px] px-3.5 py-1.5 rounded-xl border text-[13px] font-black uppercase tracking-wide cursor-pointer transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.97] ${togglePill(s.showDamagePopups)}"
            data-settings-action="toggle-dmg-popups"
            aria-pressed="${s.showDamagePopups ? 'true' : 'false'}"
          >
            ${s.showDamagePopups ? 'ON' : 'OFF'}
          </button>
        </section>
      </div>
    `;

    return renderModalShell({
      title: 'Settings',
      theme: 'settings',
      iconHtml: GEAR_ICON_SVG,
      boxClass: 'w-[500px] max-w-[94%]',
      autoHeight: true,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-settings-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const quality = btn.dataset.settingsQuality as GraphicsQuality | undefined;
        if (quality !== 'low' && quality !== 'medium' && quality !== 'high') return;
        this.settings.update({ graphicsQuality: quality });
        audio.playSfx('ui-click', { volume: 0.45 });
        const label = quality[0].toUpperCase() + quality.slice(1);
        this.pushToast(`Graphics: ${label}`);
        this.requestRender();
      });
    });

    root.querySelectorAll<HTMLInputElement>('[data-settings-slider]').forEach((input) => {
      input.addEventListener('input', () => {
        const kind = input.dataset.settingsSlider;
        const pct = Math.max(0, Math.min(100, Math.round(Number(input.value) || 0)));
        const readout = root.querySelector<HTMLElement>(`[data-settings-val="${kind}"]`);
        if (readout) readout.textContent = `${pct}%`;
        if (kind === 'bgm') {
          this.settings.update({ bgmVolume: pct / 100 });
        } else if (kind === 'sfx') {
          this.settings.update({ sfxVolume: pct / 100 });
        }
      });
      input.addEventListener('change', () => {
        if (input.dataset.settingsSlider === 'sfx') {
          audio.playSfx('ui-click', { volume: 0.5 });
        }
      });
    });

    root.querySelector<HTMLElement>('[data-settings-action="toggle-mute"]')?.addEventListener('click', () => {
      const nextMuted = audio.toggleMuted();
      this.pushToast(nextMuted ? 'Audio Muted' : 'Audio On');
      this.requestRender();
    });

    root.querySelector<HTMLElement>('[data-settings-action="toggle-dmg-popups"]')?.addEventListener('click', () => {
      const next = !this.settings.get().showDamagePopups;
      this.settings.update({ showDamagePopups: next });
      audio.playSfx('ui-click', { volume: 0.45 });
      this.pushToast(`Damage Popups: ${next ? 'ON' : 'OFF'}`);
      this.requestRender();
    });
  }
}
