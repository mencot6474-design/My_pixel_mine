import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { hudIconHtml } from './HudIcons';
import { TW_CURRENCY_BAR, TW_PLUS_BTN } from './HudShared';

export function renderAudioControlsHtml(opts: {
  floating: boolean;
  muted: boolean;
  cameraLocked: boolean;
}): string {
  const { floating, muted, cameraLocked } = opts;
  const audioIcon = muted
    ? `<svg viewBox="0 0 28 28" width="24" height="24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mam-spk-mute" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fda4af"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
        </defs>
        <path d="M5 10.5H8.8L14.5 5.5V22.5L8.8 17.5H5C3.9 17.5 3 16.6 3 15.5V12.5C3 11.4 3.9 10.5 5 10.5Z" fill="url(#mam-spk-mute)" stroke="#ffe4e6" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M18.5 10.5L24.5 16.5M24.5 10.5L18.5 16.5" stroke="#fb7185" stroke-width="2.6" stroke-linecap="round"/>
      </svg>`
    : `<svg viewBox="0 0 28 28" width="24" height="24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mam-spk-on" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        <path d="M5 10.5H8.8L14.5 5.5V22.5L8.8 17.5H5C3.9 17.5 3 16.6 3 15.5V12.5C3 11.4 3.9 10.5 5 10.5Z" fill="url(#mam-spk-on)" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M18.2 9.8C19.6 11.2 19.6 16.8 18.2 18.2" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M21.4 6.8C24.2 9.8 24.2 18.2 21.4 21.2" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`;

  const frameCls = muted
    ? 'border-rose-400 bg-[linear-gradient(160deg,#881337,#131b31)] shadow-[0_4px_0_#2b0714,0_8px_22px_rgba(225,29,72,0.32),inset_0_1px_0_rgba(255,255,255,0.28)]'
    : 'border-sky-400 bg-[linear-gradient(160deg,#0e7490,#0f1c36)] shadow-[0_4px_0_#071022,0_8px_22px_rgba(56,189,248,0.34),inset_0_1px_0_rgba(255,255,255,0.32)]';
  const placementCls = floating ? 'absolute top-[14px] right-4 z-[15]' : 'mt-0.5';
  const gearIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="#e2e8f0" stroke-width="2"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#94a3b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const gearFrameCls =
    'border-[#4b6085] bg-[linear-gradient(160deg,#2b3a55,#10182b)] shadow-[0_4px_0_#060a14,0_8px_22px_rgba(15,23,42,0.58),inset_0_1px_0_rgba(255,255,255,0.24)]';
  const camFrameCls = cameraLocked
    ? 'border-amber-400 bg-[linear-gradient(160deg,#b45309,#2e1065)] shadow-[0_4px_0_#1e1b4b,0_8px_22px_rgba(245,158,11,0.38),inset_0_1px_0_rgba(255,255,255,0.3)]'
    : gearFrameCls;
  const camIcon = cameraLocked
    ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path d="M3.5 9.5a2 2 0 0 1 2-2h2l1.2-1.8a1.5 1.5 0 0 1 1.25-.7h4.1a1.5 1.5 0 0 1 1.25.7L16.5 7.5h2a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V9.5Z" stroke="#fde68a" stroke-width="1.8" stroke-linejoin="round"/>
        <rect x="9" y="12.2" width="6" height="4.6" rx="1.2" fill="#facc15" stroke="#451a03" stroke-width="1.2"/>
        <path d="M10.4 12.2v-1.1a1.6 1.6 0 0 1 3.2 0v1.1" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`
    : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path d="M3.5 9.5a2 2 0 0 1 2-2h2l1.2-1.8a1.5 1.5 0 0 1 1.25-.7h4.1a1.5 1.5 0 0 1 1.25.7L16.5 7.5h2a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V9.5Z" stroke="#cbd5e1" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="12" cy="13.2" r="2.7" stroke="#38bdf8" stroke-width="1.8"/>
        <path d="M7.5 21l-2-1.8m11 1.8 2-1.8" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
  const utilBtnCls =
    'w-12 h-12 @max-[720px]:w-10 @max-[720px]:h-10 rounded-2xl border-2 flex items-center justify-center cursor-pointer touch-manipulation transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-105 hover:brightness-110 active:translate-y-0.5 active:scale-95 pointer-events-auto';

  return `
    <div class="${placementCls} flex items-center gap-2 @max-[720px]:gap-1.5 pointer-events-none">
      <button
        class="${utilBtnCls} ${camFrameCls}"
        data-action="toggle-camera-lock"
        data-camera-locked="${cameraLocked ? 'true' : 'false'}"
        title="${cameraLocked ? 'Camera Locked (Front + Zoom Only) — Click to Unlock' : 'Lock Camera Front (Zoom Only)'}"
        aria-label="${cameraLocked ? 'Unlock Camera' : 'Lock Camera Front'}"
        aria-pressed="${cameraLocked ? 'true' : 'false'}"
      >
        ${camIcon}
      </button>
      <button
        class="${utilBtnCls} ${gearFrameCls}"
        data-action="open-settings"
        title="Settings"
        aria-label="Open Settings"
      >
        ${gearIcon}
      </button>
      <button
        class="${utilBtnCls} ${frameCls}"
        data-action="toggle-audio"
        title="${muted ? 'Unmute Audio' : 'Mute Audio'}"
        aria-label="${muted ? 'Unmute Audio' : 'Mute Audio'}"
      >
        ${audioIcon}
      </button>
    </div>
  `;
}

export function renderCurrencyRailHtml(opts: {
  gems: number;
  cash: number;
  topAlign?: boolean;
  showGemsPlus?: boolean;
  showCash?: boolean;
  dpsAboveHtml?: string;
  quickButtonsHtml?: string;
  audioBelowHtml?: string;
}): string {
  const posCls = opts.topAlign
    ? 'top-[14px] right-4'
    : 'top-[42%] right-4 -translate-y-1/2 [[data-hud-compact=true]_&]:top-[72px] [[data-hud-compact=true]_&]:translate-y-0 [[data-hud-short=true]_&]:top-[36%]';
  const plusBtn = opts.showGemsPlus
    ? `<button class="${TW_PLUS_BTN} mam-outline-sm" data-action="gems-plus">+</button>`
    : '';
  const cashBar = opts.showCash
    ? `<div class="${TW_CURRENCY_BAR}">
        <span class="text-[28px] font-black tabular-nums text-[#4ade80] tracking-[0.3px] mam-outline" data-hud-cash="true">${fmtMoney(opts.cash)}</span>
      </div>`
    : '';
  const quickRow = opts.quickButtonsHtml
    ? `<div class="flex items-center gap-2 mt-0.5">${opts.quickButtonsHtml}</div>`
    : '';

  return `
    <div class="absolute ${posCls} flex flex-col items-end gap-1.5">
      ${opts.dpsAboveHtml ?? ''}
      <div class="flex items-center gap-2">
        <div class="${TW_CURRENCY_BAR}">
          ${hudIconHtml('gem', 28, 'Gems')}
          <span class="text-[20px] font-extrabold tabular-nums text-white mam-outline-sm" data-hud-gems="true">${fmtInt(opts.gems)}</span>
          ${plusBtn}
        </div>
      </div>
      ${cashBar}
      ${quickRow}
      ${opts.audioBelowHtml ?? ''}
    </div>
  `;
}

export function renderFeverScreenFxHtml(active: boolean): string {
  return `
    <div class="mam-fever-screen-fx ${active ? 'is-active' : ''}" data-fever-screen-fx="true" aria-hidden="true">
      <div class="mam-fever-vignette"></div>
      <span class="mam-fever-corner is-tl"></span>
      <span class="mam-fever-corner is-tr"></span>
      <span class="mam-fever-corner is-bl"></span>
      <span class="mam-fever-corner is-br"></span>
      <div class="mam-fever-burst" data-fever-burst="true">
        <div class="mam-fever-ticker">OVERCLOCK // FEVER // OVERCLOCK // FEVER // OVERCLOCK // FEVER //</div>
        <div class="mam-fever-slash"></div>
        <div class="mam-fever-burst-row">
          <span class="mam-fever-chevrons">&gt;&gt;&gt;</span>
          <div class="mam-fever-burst-title">OVERCLOCK FEVER!</div>
          <span class="mam-fever-chevrons">&lt;&lt;&lt;</span>
        </div>
        <div class="mam-fever-burst-sub">
          <span>2× TAP</span>
          <span>•</span>
          <span>1.5× ORE</span>
          <span>•</span>
          <span>30% CRIT</span>
        </div>
      </div>
    </div>
  `;
}

export function syncFeverScreenFxDom(
  root: HTMLElement,
  inMine: boolean,
  active: boolean,
  triggerBurst: boolean
): void {
  const fx = root.querySelector<HTMLElement>('[data-fever-screen-fx="true"]');
  if (!fx) return;
  fx.classList.toggle('is-active', active && inMine);
  if (triggerBurst && active && inMine) {
    const burst = fx.querySelector<HTMLElement>('[data-fever-burst="true"]');
    if (burst) {
      burst.classList.remove('is-bursting');
      void burst.offsetWidth;
      burst.classList.add('is-bursting');
    }
  }
}
