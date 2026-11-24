import { assetUrl } from '../game/AssetUrl';
import type { ItemRarity } from '../game/GameData';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import type { OverclockTier } from '../game/OverclockDomain';
import type { SceneMode } from '../game3d/MineScene3D';
import { hudIconHtml } from './HudIcons';
import {
  formatCountdownTimer,
  renderRarityBadgeHtml,
  TW_BADGE_BASE,
  TW_CURRENCY_BAR,
  TW_PLUS_BTN,
  TW_QUICK_BTN_CHEST,
  TW_QUICK_BTN_DAILY,
  TW_QUICK_BTN_QUEST,
  TW_SHOPS_PILL,
  TW_SIDE_BTN_INDEX,
  TW_SIDE_BTN_RAINBOW,
  TW_SIDE_BTN_UPGRADES,
  TW_TELEPORT_PILL,
  TW_TOP_CENTER,
} from './HudShared';

export function shouldShowTwinTrialHudButton(sceneMode: SceneMode, trialVisible: boolean): boolean {
  return trialVisible && (sceneMode === 'mine' || sceneMode === 'shop');
}

export function renderAudioControlsHtml(opts: {
  floating: boolean;
  muted: boolean;
  cameraLocked: boolean;
  fps?: number;
  twinTrial?: {
    visible: boolean;
    active: boolean;
    remainingSec: number;
  };
}): string {
  const { floating, muted, cameraLocked, fps = 0 } = opts;
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
    ? 'border-[#14111d] bg-[#fda4af]'
    : 'border-[#14111d] bg-[#bae6fd]';
  const placementCls = floating ? 'absolute top-[14px] right-4 z-[15]' : 'mt-0.5';
  const gearIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="#14111d" stroke-width="2.2"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#14111d" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const gearFrameCls = 'border-[#14111d] bg-[#fff8e7]';
  const camFrameCls = cameraLocked
    ? 'border-[#14111d] bg-[#fde047]'
    : gearFrameCls;
  const camIcon = cameraLocked
    ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
        <path d="M3 9.5a2 2 0 0 1 2-2h2l1.1-1.7A1.5 1.5 0 0 1 9.35 5h4.3a1.5 1.5 0 0 1 1.25.8L16 7.5h2a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5Z" fill="#ffffff" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="10.2" cy="13" r="3" fill="#bae6fd" stroke="#14111d" stroke-width="1.8"/>
        <rect x="14.2" y="12.5" width="7.5" height="6.5" rx="1.6" fill="#ff3b5c" stroke="#14111d" stroke-width="1.8"/>
        <path d="M16 12.5v-1.4a2 2 0 0 1 4 0v1.4" stroke="#14111d" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="18" cy="15.8" r="1" fill="#fde047"/>
      </svg>`
    : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
        <path d="M3 9.5a2 2 0 0 1 2-2h2l1.1-1.7A1.5 1.5 0 0 1 9.35 5h5.3a1.5 1.5 0 0 1 1.25.8L17 7.5h2a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5Z" fill="#ffffff" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13.2" r="3.4" fill="#38bdf8" stroke="#14111d" stroke-width="1.9"/>
        <circle cx="10.9" cy="12.1" r="1" fill="#ffffff"/>
        <path d="M7.5 21.4l-2-1.8m11 1.8 2-1.8" stroke="#14111d" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  const utilBtnCls =
    'w-12 h-12 @max-[720px]:w-10 @max-[720px]:h-10 rounded-2xl border-[2.5px] flex items-center justify-center cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.95] hover:-rotate-2 even:hover:rotate-2 hover:brightness-105 active:scale-90 pointer-events-auto';

  const fpsText = fps > 0 ? String(fps) : '--';
  const fpsDotColor = fps >= 50 ? '#22c55e' : fps >= 30 ? '#f59e0b' : '#ef4444';
  const trialVisible = Boolean(opts.twinTrial?.visible);
  const trialActive = Boolean(opts.twinTrial?.active);
  const trialTimerText = trialActive
    ? formatCountdownTimer(opts.twinTrial?.remainingSec ?? 0)
    : 'FREE';
  const trialBgCls = trialActive
    ? 'bg-[linear-gradient(135deg,#bbf7d0_0%,#bae6fd_100%)]'
    : 'bg-[linear-gradient(135deg,#fde047_0%,#bae6fd_55%,#fbcfe8_100%)]';
  const trialBadgeCls = trialActive
    ? 'bg-[#dcfce7] text-[#14532d]'
    : 'bg-[#fde047] text-[#14111d]';
  const trialBtnHtml = trialVisible
    ? `
      <button
        class="relative ${utilBtnCls} border-[#14111d] ${trialBgCls}"
        data-action="open-twin-trial"
        title="${trialActive ? `Twin Chibi Trial Active (${trialTimerText} left)` : 'Claim 20m Twin Chibi Free Trial!'}"
        aria-label="${trialActive ? 'Inspect Active Twin Trial' : 'Open Twin Chibi Free Trial'}"
      >
        <img src="${assetUrl('/badges/twin.svg')}" alt="Twin Trial" class="w-7 h-7 @max-[720px]:w-6 @max-[720px]:h-6 object-contain pointer-events-none" draggable="false" />
        <span
          class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full border-[1.5px] border-[#14111d] ${trialBadgeCls} text-[9px] font-black leading-tight tracking-tight tabular-nums whitespace-nowrap pointer-events-none"
          data-twin-trial-timer="true"
        >${trialTimerText}</span>
      </button>
    `
    : '';

  return `
    <div class="${placementCls} flex flex-col items-end gap-2 @max-[720px]:gap-1.5 pointer-events-none">
      <div class="flex items-center gap-2 @max-[720px]:gap-1.5 pointer-events-none">
        <div
          class="h-12 @max-[720px]:h-10 px-2.5 @max-[720px]:px-2 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7] flex items-center gap-1.5 select-none pointer-events-auto"
          title="Live Frames Per Second"
          aria-label="FPS Counter"
        >
          <span
            data-fps-dot
            class="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#14111d] shrink-0"
            style="background:${fpsDotColor}"
          ></span>
          <span class="font-extrabold text-[13px] @max-[720px]:text-[11px] text-[#14111d] tabular-nums leading-none whitespace-nowrap">
            <span data-fps-value>${fpsText}</span> <span class="text-[10px] @max-[720px]:text-[9px] text-[#64748b] font-black">FPS</span>
          </span>
        </div>
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
      ${trialBtnHtml}
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
    : 'top-[42%] right-4 -translate-y-1/2 [[data-hud-compact=true]_&]:top-[72px] [[data-hud-compact=true][data-hud-trial=true]_&]:top-[128px] [[data-hud-compact=true]_&]:translate-y-0 [[data-hud-short=true]_&]:top-[36%]';
  const plusBtn = opts.showGemsPlus
    ? `<button class="${TW_PLUS_BTN} absolute right-2 top-1/2 -translate-y-1/2" data-action="gems-plus" aria-label="Buy Gems"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M8 2.8v10.4M2.8 8h10.4" stroke="#14111d" stroke-width="2.8" stroke-linecap="round"/></svg></button>`
    : '';
  const cashBar = opts.showCash
    ? `<div class="${TW_CURRENCY_BAR}">
        <span class="text-[21px] @max-[720px]:text-[18px] leading-none font-black tabular-nums text-[#059669] tracking-[0.2px] text-center" data-hud-cash="true">${fmtMoney(opts.cash)}</span>
      </div>`
    : '';
  const quickRow = opts.quickButtonsHtml
    ? `<div class="flex items-center gap-2 mt-0.5">${opts.quickButtonsHtml}</div>`
    : '';

  return `
    <div class="absolute ${posCls} flex flex-col items-end gap-1.5">
      ${opts.dpsAboveHtml ?? ''}
      <div class="flex items-center gap-2">
        <div class="${TW_CURRENCY_BAR} px-9">
          ${hudIconHtml('gem', 24, 'Gems')}
          <span class="text-[20px] @max-[720px]:text-[17px] leading-none font-black tabular-nums text-[#14111d] text-center" data-hud-gems="true">${fmtInt(opts.gems)}</span>
          ${plusBtn}
        </div>
      </div>
      ${cashBar}
      ${quickRow}
      ${opts.audioBelowHtml ?? ''}
    </div>
  `;
}

const FEVER_CORNER_SVG = `<svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden="true"><path d="M5 34V11C5 7.7 7.7 5 11 5H34C36.2 5 38 6.8 38 9C38 11.2 36.2 13 34 13H13V34C13 36.2 11.2 38 9 38C6.8 38 5 36.2 5 34Z" fill="currentColor" stroke="#14111d" stroke-width="3" stroke-linejoin="round"/></svg>`;

export interface FeverEncoreHudInfo {
  remaining: number;
  completed: number;
  total: number;
}

function getFeverBurstCopy(tier: 0 | OverclockTier): {
  ticker: string;
  title: string;
} {
  const safeTier: 0 | OverclockTier = tier === 2 || tier === 3 ? tier : 1;
  if (safeTier === 3) {
    return {
      ticker: 'HYPER ENCORE // 5x SQUAD ULT // OVERDRIVE // HYPER ENCORE //',
      title: 'HYPER ENCORE!!',
    };
  }
  if (safeTier === 2) {
    return {
      ticker: 'SUPER FEVER // LV.2 // CHAIN EXTEND // SUPER FEVER // LV.2 //',
      title: 'SUPER FEVER LV.2!',
    };
  }
  return {
    ticker: 'OVERCLOCK // FEVER // OVERCLOCK // FEVER // OVERCLOCK // FEVER //',
    title: 'OVERCLOCK FEVER!',
  };
}

function buildFeverEncorePipsHtml(encore?: FeverEncoreHudInfo): string {
  const total = Math.max(0, encore?.total ?? 0);
  const completed = Math.max(0, Math.min(total, encore?.completed ?? 0));
  const remaining = Math.max(0, Math.min(total, encore?.remaining ?? 0));
  let pips = '';
  for (let i = 0; i < Math.max(5, total); i++) {
    const isSpent = i < completed;
    const isNext = i === completed && remaining > 0;
    pips += `<span class="mam-fever-encore-pip ${isSpent ? 'is-spent' : isNext ? 'is-next' : 'is-ready'}"></span>`;
  }
  return `
    <span class="text-[10px] font-black italic uppercase tracking-[0.08em] text-[#14111d]">HYPER ENCORE</span>
    <span class="flex items-center gap-1">${pips}</span>
    <span class="mam-pill-xs bg-[#14111d] text-[#67e8f9] tabular-nums" data-fever-encore-count="true">${remaining}/${total || 5}</span>
  `;
}

export function renderFeverScreenFxHtml(
  active: boolean,
  tier: 0 | OverclockTier = active ? 1 : 0,
  encore?: FeverEncoreHudInfo
): string {
  const effectiveTier: 0 | OverclockTier = active ? (tier === 2 || tier === 3 ? tier : 1) : 0;
  const copy = getFeverBurstCopy(effectiveTier);
  const showEncore = active && effectiveTier === 3 && (encore?.total ?? 0) > 0;
  return `
    <div class="mam-fever-screen-fx ${active ? 'is-active' : ''}" data-fever-screen-fx="true" data-fever-tier="${effectiveTier}" aria-hidden="true">
      <div class="mam-fever-speedlines"></div>
      <div class="mam-fever-vignette"></div>
      <div class="mam-fever-frame"><div class="mam-fever-frame-spin"></div></div>
      <span class="mam-fever-corner is-tl">${FEVER_CORNER_SVG}</span>
      <span class="mam-fever-corner is-tr">${FEVER_CORNER_SVG}</span>
      <span class="mam-fever-corner is-bl">${FEVER_CORNER_SVG}</span>
      <span class="mam-fever-corner is-br">${FEVER_CORNER_SVG}</span>
      <div class="mam-fever-encore-pill ${showEncore ? 'is-visible' : ''}" data-fever-encore-pill="true">
        ${buildFeverEncorePipsHtml(encore)}
      </div>
      <div class="mam-fever-cutin" data-fever-cutin="true"></div>
      <div class="mam-fever-burst" data-fever-burst="true">
        <div class="mam-fever-fold-crease"></div>
        <div class="mam-fever-ticker" data-fever-ticker="true">${copy.ticker}</div>
        <div class="mam-fever-slash"></div>
        <div class="mam-fever-burst-row">
          <span class="mam-fever-chevrons">&gt;&gt;&gt;</span>
          <div class="mam-fever-burst-title" data-fever-title="true">${copy.title}</div>
          <span class="mam-fever-chevrons">&lt;&lt;&lt;</span>
        </div>
      </div>
    </div>
  `;
}

export function syncFeverScreenFxDom(
  root: HTMLElement,
  inMine: boolean,
  active: boolean,
  triggerBurst: boolean,
  tier: 0 | OverclockTier = active ? 1 : 0,
  encore?: FeverEncoreHudInfo
): void {
  const fx = root.querySelector<HTMLElement>('[data-fever-screen-fx="true"]');
  if (!fx) return;
  const effectiveTier: 0 | OverclockTier = active && inMine ? (tier === 2 || tier === 3 ? tier : 1) : 0;
  fx.classList.toggle('is-active', active && inMine);
  fx.dataset.feverTier = String(effectiveTier);
  if (active && inMine) {
    const copy = getFeverBurstCopy(effectiveTier);
    const tickerEl = fx.querySelector<HTMLElement>('[data-fever-ticker="true"]');
    const titleEl = fx.querySelector<HTMLElement>('[data-fever-title="true"]');
    if (tickerEl) tickerEl.textContent = copy.ticker;
    if (titleEl) titleEl.textContent = copy.title;
  }
  const encorePill = fx.querySelector<HTMLElement>('[data-fever-encore-pill="true"]');
  if (encorePill) {
    const showEncore = active && inMine && effectiveTier === 3 && (encore?.total ?? 0) > 0;
    encorePill.classList.toggle('is-visible', showEncore);
    if (showEncore) {
      const nextKey = `${encore?.remaining ?? 0}:${encore?.completed ?? 0}:${encore?.total ?? 0}`;
      if (encorePill.dataset.encoreKey !== nextKey) {
        encorePill.dataset.encoreKey = nextKey;
        encorePill.innerHTML = buildFeverEncorePipsHtml(encore);
      }
    } else if (encorePill.dataset.encoreKey) {
      delete encorePill.dataset.encoreKey;
    }
  }
  if (!active || !inMine) {
    const cutinEl = fx.querySelector<HTMLElement>('[data-fever-cutin="true"]');
    if (cutinEl) {
      cutinEl.classList.remove('is-showing');
    }
  }
  if (triggerBurst && active && inMine) {
    const burst = fx.querySelector<HTMLElement>('[data-fever-burst="true"]');
    if (burst) {
      burst.classList.remove('is-bursting');
      void burst.offsetWidth;
      burst.classList.add('is-bursting');
    }
  }
}

function escapeCutInText(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const VALID_CUTIN_RARITIES = new Set<ItemRarity>([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'rainbow',
  'mythic',
  'exotic',
  'secret',
  'fusion',
  'limited',
  'twin',
  'omega',
]);

function normalizeCutInRarity(raw: string): ItemRarity {
  const lower = raw.toLowerCase() as ItemRarity;
  return VALID_CUTIN_RARITIES.has(lower) ? lower : 'common';
}

/** Triggers a widescreen cyber-anime slash cut-in banner with real rarity badge when a Chibi fires an Ult during Fever Lv.2/Lv.3. */
export function triggerFeverUltCutInDom(
  root: HTMLElement,
  info: {
    chibiId: string;
    name: string;
    rarity: string;
    accentColor: string;
    isEncore: boolean;
    encoreIndex: number;
    encoreTotal: number;
    tier: 0 | OverclockTier;
  }
): void {
  const cutinEl = root.querySelector<HTMLElement>('[data-fever-cutin="true"]');
  if (!cutinEl) return;
  const tagText = info.isEncore
    ? `ENCORE ${info.encoreIndex}/${info.encoreTotal}`
    : info.tier === 3
      ? 'HYPER ULT!'
      : 'FEVER ULT!';
  const safeName = escapeCutInText(info.name);
  const safeRarity = normalizeCutInRarity(info.rarity);
  const rarityBadgeHtml = renderRarityBadgeHtml(safeRarity, '!ml-0 mam-cutin-rarity');
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(info.accentColor) ? info.accentColor : '#38bdf8';
  const portraitSrc = assetUrl(`chibi/${encodeURIComponent(info.chibiId)}/attack.webp`);
  const mode = info.isEncore ? 'encore' : info.tier === 3 ? 'hyper' : 'super';

  cutinEl.style.setProperty('--cutin-accent', safeAccent);
  cutinEl.dataset.cutinMode = mode;
  cutinEl.innerHTML = `
    <div class="mam-fever-cutin-plate" aria-hidden="true">
      <div class="mam-fever-cutin-bg"></div>
      <div class="mam-fever-cutin-halftone"></div>
      <div class="mam-fever-cutin-speedlines"></div>
      <div class="mam-fever-cutin-watermark">${tagText}</div>
      <div class="mam-fever-cutin-glint"></div>
      <div class="mam-fever-cutin-chevrons">&gt;&gt;&gt;</div>
    </div>
    <div class="mam-fever-cutin-portrait-wrap" aria-hidden="true">
      <div class="mam-fever-cutin-aura"></div>
      <img class="mam-fever-cutin-img" src="${portraitSrc}" alt="" draggable="false" />
    </div>
    <div class="mam-fever-cutin-body">
      <div class="mam-fever-cutin-meta">
        <span class="mam-fever-cutin-tag ${info.isEncore ? 'is-encore' : ''}">${tagText}</span>
        ${rarityBadgeHtml}
      </div>
      <div class="mam-fever-cutin-name">${safeName}</div>
      <div class="mam-fever-cutin-bar" aria-hidden="true"><span class="mam-fever-cutin-bar-fill"></span></div>
    </div>
  `;
  cutinEl.classList.remove('is-showing');
  void cutinEl.offsetWidth;
  cutinEl.classList.add('is-showing');
}

export function renderMineQuickButtonsHtml(opts: {
  chestCount: number;
  readyBounties: number;
  readyAchievements: number;
  dailyReady: boolean;
  riftOpen?: boolean;
}): string {
  const riftBtnCls = opts.riftOpen
    ? 'relative h-[36px] min-w-[36px] px-2.5 rounded-xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#67e8f9,#e879f9)] shadow-none text-[#14111d] text-[12px] font-black inline-flex items-center justify-center gap-1 cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] active:scale-95'
    : 'relative h-[36px] min-w-[36px] px-2.5 rounded-xl border-[2.5px] border-[#14111d] bg-[#e9d5ff] shadow-none text-[#14111d] text-[12px] font-black inline-flex items-center justify-center gap-1 cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] active:scale-95';
  return `
    <button class="${riftBtnCls}" title="Dimensional Rift (:00–:15)" data-action="open-rift">
      <span class="${TW_BADGE_BASE} min-w-[16px] h-4 px-1 text-[9px] ${opts.riftOpen ? '' : 'hidden'}" data-rift-badge="true">!</span>
      <span>RIFT</span>
    </button>
    <button class="${TW_QUICK_BTN_DAILY}" title="Daily Login" data-action="open-daily-login">
      <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] ${opts.dailyReady ? '' : 'hidden'}" data-daily-badge="true">1</span>
      <span class="text-[#b45309] text-[15px] leading-none" aria-hidden="true">✦</span>
      <span>Daily</span>
    </button>
    <button class="${TW_QUICK_BTN_QUEST} !px-2" title="Mining Bounties" data-action="open-bounties">
      <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] ${opts.readyBounties > 0 ? '' : 'hidden'}" data-bounties-badge="true">${opts.readyBounties}</span>
      ${hudIconHtml('quest', 22, 'Bounties')}
    </button>
    <button class="${TW_QUICK_BTN_QUEST} !px-2" title="Achievements & Career Stats" data-action="open-achievements">
      <span class="${TW_BADGE_BASE} min-w-[20px] h-5 px-1 text-[11px] ${opts.readyAchievements > 0 ? '' : 'hidden'}" data-achievements-badge="true">${opts.readyAchievements}</span>
      <svg class="w-[21px] h-[21px] text-[#14111d]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z" fill="#fde047" stroke="currentColor" stroke-width="2"/><path d="M7 6H4V8.5C4 10.2 5.3 11.5 7 11.5M17 6H20V8.5C20 10.2 18.7 11.5 17 11.5M12 15V19M8.5 19H15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <button class="${TW_QUICK_BTN_CHEST}" title="Chest (${fmtInt(opts.chestCount)})" data-action="open-chest">
      ${hudIconHtml('chest', 22, 'Chest')}
    </button>
  `;
}

export function renderMineChromeHtml(opts: {
  weatherHtml: string;
  overclockHtml: string;
  activeWorldName: string;
  activeWorldColor: string;
  activeWorldNum: number;
  upgradeCount: number;
  readyIndexCount: number;
  audioHtml: string;
  currencyRailHtml: string;
  hotbarHtml: string;
  potionsHtml: string;
  feverFxHtml: string;
  modalHtml: string;
  toastStackHtml: string;
}): string {
  const modalOpen = opts.modalHtml.trim().length > 0;
  return `
    <div class="${modalOpen ? 'hidden pointer-events-none' : 'contents'}">
      ${opts.weatherHtml}
      <div class="${TW_TOP_CENTER} flex flex-wrap items-center justify-center gap-2.5 @max-[720px]:gap-1.5">
        <button class="${TW_SHOPS_PILL} whitespace-nowrap" data-action="shops-pill" title="Go to Shop Plaza">
          ${hudIconHtml('shops', 28, 'Plaza')}
          <span>Plaza</span>
        </button>
        <div class="w-[224px] @max-[720px]:w-[202px] shrink-0">
          ${opts.overclockHtml}
        </div>
        <button class="${TW_TELEPORT_PILL} whitespace-nowrap" data-action="open-worlds" title="Teleport • World ${opts.activeWorldNum}: ${opts.activeWorldName}">
          <svg viewBox="0 0 32 32" width="28" height="28" class="shrink-0" aria-hidden="true">
            <defs>
              <radialGradient id="mam-tp-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="32%" stop-color="#67e8f9"/>
                <stop offset="68%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#1e1b4b"/>
              </radialGradient>
              <linearGradient id="mam-tp-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e0f2fe"/>
                <stop offset="50%" stop-color="#38bdf8"/>
                <stop offset="100%" stop-color="#c084fc"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="13" fill="url(#mam-tp-core)" stroke="#14111d" stroke-width="2.4"/>
            <ellipse cx="16" cy="16" rx="12" ry="5.4" transform="rotate(-26 16 16)" fill="none" stroke="#bae6fd" stroke-width="1.8"/>
            <ellipse cx="16" cy="16" rx="11" ry="4.4" transform="rotate(34 16 16)" fill="none" stroke="#e879f9" stroke-width="1.4" opacity="0.9"/>
            <path d="M16 7.5L17.9 14.1L24.5 16L17.9 17.9L16 24.5L14.1 17.9L7.5 16L14.1 14.1Z" fill="#ffffff"/>
            <circle cx="25.5" cy="7.5" r="1.7" fill="#fde047"/>
            <circle cx="6.5" cy="24.5" r="1.3" fill="#67e8f9"/>
          </svg>
          <span>Teleport</span>
          <span
            class="absolute -top-2 -right-2 min-w-[23px] h-[23px] px-1 rounded-full border-2 border-[#14111d] text-[12px] font-black tabular-nums leading-none text-[#14111d] flex items-center justify-center"
            style="background:${opts.activeWorldColor}"
            data-teleport-world-badge="true"
          >${opts.activeWorldNum}</span>
        </button>
      </div>

      <div class="absolute left-4 @max-[720px]:left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 @max-[720px]:gap-2">
        <button class="${TW_SIDE_BTN_RAINBOW}" data-action="open-shop" title="Premium Shop">
          ${hudIconHtml('shopBasket', 44, 'Shop')}
          <span class="text-[14px] font-black leading-none text-[#14111d]">Shop</span>
        </button>
        <button class="${TW_SIDE_BTN_UPGRADES}" data-action="open-upgrades">
          <span class="${TW_BADGE_BASE} min-w-[24px] h-6 px-1.5 text-[13px] ${opts.upgradeCount > 0 ? '' : 'hidden'}" data-upgrades-badge="true">${opts.upgradeCount}</span>
          ${hudIconHtml('hourglass', 44, 'Upgrades')}
          <span class="text-[14px] font-black leading-none text-[#14111d]">Upgrades</span>
        </button>
        <button class="${TW_SIDE_BTN_INDEX}" data-action="open-index">
          <span class="${TW_BADGE_BASE} min-w-[24px] h-6 px-1.5 text-[13px] ${opts.readyIndexCount > 0 ? '' : 'hidden'}" data-index-badge="true">${opts.readyIndexCount}</span>
          ${hudIconHtml('indexBook', 44, 'Index')}
          <span class="text-[14px] font-black leading-none text-[#14111d]">Index</span>
        </button>
      </div>

      ${opts.audioHtml}
      ${opts.currencyRailHtml}
      ${opts.hotbarHtml}
      ${opts.potionsHtml}
    </div>
    ${opts.feverFxHtml}
    ${opts.modalHtml}
    ${opts.toastStackHtml}
  `;
}

/** Updates HUD root CSS zoom & responsive data attributes to fit the current viewport. */
export function applyHudViewportScale(root: HTMLElement): void {
  if (typeof window === 'undefined') return;
  const vw = Math.max(320, window.innerWidth || 1280);
  const vh = Math.max(240, window.innerHeight || 720);
  const scale = Math.max(0.5, Math.min(1, vw / 1160, vh / 660));
  const logicalW = vw / scale;
  const logicalH = vh / scale;

  if (scale >= 0.999) {
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.transform = 'none';
    root.style.setProperty('zoom', '1');
  } else {
    root.style.width = `${logicalW.toFixed(2)}px`;
    root.style.height = `${logicalH.toFixed(2)}px`;
    root.style.transform = 'none';
    root.style.setProperty('zoom', scale.toFixed(4));
  }
  root.style.transformOrigin = 'top left';
  root.dataset.hudCompact = logicalW < 920 ? 'true' : 'false';
  root.dataset.hudPotsAbove = logicalW < 1080 ? 'true' : 'false';
  root.dataset.hudDpsAbove = logicalW < 1140 ? 'true' : 'false';
  root.dataset.hudShort = logicalH < 640 ? 'true' : 'false';

  const floatScale = Math.max(0.72, Math.min(1, scale));
  document.documentElement.style.setProperty('--mam-ui-scale', scale.toFixed(4));
  document.documentElement.style.setProperty('--mam-float-scale', floatScale.toFixed(4));
}

/** Updates the live FPS pill text and status color inside the HUD root. */
export function updateFpsBadgeDom(root: HTMLElement, fps: number): void {
  const valEl = root.querySelector<HTMLElement>('[data-fps-value]');
  if (valEl) {
    valEl.textContent = fps > 0 ? String(fps) : '--';
  }
  const dotEl = root.querySelector<HTMLElement>('[data-fps-dot]');
  if (dotEl) {
    dotEl.style.background = fps >= 50 ? '#22c55e' : fps >= 30 ? '#f59e0b' : '#ef4444';
  }
}
