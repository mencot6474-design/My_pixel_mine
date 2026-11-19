import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import {
  GEM_SHOP_ITEMS,
  GemShopItemDef,
  getWeatherOreByWeatherId,
  WEATHER_METEOR_CHIBIS,
  WEATHER_METEOR_DICE_CHANCE,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import { type OverclockSnapshot } from '../game/OverclockDomain';
import { WeatherId, WEATHERS } from '../game/WeatherData';
import { getChibiById } from '../game3d/ChibiCatalog';
import { enchantDiceIconHtml, gemPotionIconHtml, hudIconHtml, meteorIconHtml, weatherIconHtml } from './HudIcons';
import { formatCountdownTimer, TW_ACTIVE_POT_PILL } from './HudShared';

export interface ActivePotionsDockContent {
  single: boolean;
  empty: boolean;
  key: string;
  html: string;
  active: Array<{ def: GemShopItemDef; rem: number }>;
}

/** Formats seconds into clamped `m:ss` countdown text for weather and potion timers. */
export const formatWeatherTimer = formatCountdownTimer;

/** Builds active potions dock layout rows, keys, and pill HTML. */
export function buildActivePotionsDockContent(
  state: GameState,
  now = Date.now()
): ActivePotionsDockContent {
  const active: Array<{ def: GemShopItemDef; rem: number }> = [];
  for (const def of GEM_SHOP_ITEMS) {
    const rem = state.getBoostRemainingSec(def.id, now);
    if (rem > 0) active.push({ def, rem });
  }
  const rows: Array<Array<{ def: GemShopItemDef; rem: number }>> = [];
  for (let i = 0; i < active.length; i += 2) {
    rows.push(active.slice(i, i + 2));
  }
  const ordered = rows.reverse().flat();
  const key = ordered.map((x) => x.def.id).join(',');
  const html = ordered
    .map(({ def, rem }) => {
      return `
          <div class="${TW_ACTIVE_POT_PILL}" style="--pot-color:${def.color}" data-hud-pot="${def.id}" title="${def.name} • ${def.effectText}">
            <div class="w-[30px] h-[30px] shrink-0 flex items-center justify-center @max-[720px]:w-[26px] @max-[720px]:h-[26px]">${gemPotionIconHtml(def.id, 30, def.name, def.color)}</div>
            <div class="flex-1 min-w-0 flex flex-col gap-px">
              <div class="text-[11px] font-extrabold text-[#f8fafc] leading-[1.15] whitespace-nowrap overflow-hidden text-ellipsis mam-outline-sm">${def.name}</div>
              <div class="flex items-center gap-[5px]">
                <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0 animate-[mamPotDotPulse_1.4s_ease-in-out_infinite]"></span>
                <span class="text-[12px] font-black text-[#4ade80] tabular-nums leading-[1.1] mam-outline-sm" data-hud-pot-timer="${def.id}">${formatWeatherTimer(rem)}</span>
              </div>
            </div>
          </div>
        `;
    })
    .join('');
  return {
    single: ordered.length === 1,
    empty: ordered.length === 0,
    key,
    html,
    active: ordered,
  };
}

/** Builds inner HTML for the top-left Weather widget and optional Forecast popover. */
export function buildWeatherWidgetInnerHtml(
  state: GameState,
  opts: { popoverOpen: boolean; inspectId: WeatherId | null },
  now = Date.now()
): string {
  const w = state.getActiveWeather();
  const timerTxt = formatWeatherTimer(state.getWeatherRemainingSec(now));
  const inspectedId = opts.inspectId ?? w.id;
  const inspected = WEATHERS.find((x) => x.id === inspectedId) ?? w;
  const inspOre = getWeatherOreByWeatherId(inspected.id);
  const inspChibiEntries = WEATHER_METEOR_CHIBIS[inspected.id] ?? [];
  const inspChibi = inspChibiEntries[0] ? getChibiById(inspChibiEntries[0].chibiId) : null;
  const inspDicePct = Math.round((WEATHER_METEOR_DICE_CHANCE[inspected.id] ?? 0.2) * 100);
  const inspOreQtyRange =
    inspected.id === 'celestial' ? '3-4x' : inspected.id === 'void' || inspected.id === 'bloodmoon' ? '2-3x' : '1-2x';

  const popoverHtml = opts.popoverOpen
    ? `
      <div
        class="relative w-[596px] @max-[640px]:w-[310px] max-w-[calc(100vw-24px)] max-h-[76vh] overflow-y-auto mam-no-scrollbar rounded-2xl border-2 bg-[linear-gradient(180deg,#121c33_0%,#090e1c_100%)] shadow-[0_0_0_1px_#04070f,0_20px_48px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.18)]"
        style="border-color:${inspected.accentColor};box-shadow:0 0 0 1px #04070f,0 20px 48px rgba(0,0,0,0.88),0 0 28px -8px ${inspected.glowColor}66,inset 0 1px 0 rgba(255,255,255,0.18)"
      >
        <div
          class="h-[3px] w-full"
          style="background:linear-gradient(90deg,transparent 0%,${inspected.accentColor} 22%,#ffffff 50%,${inspected.accentColor} 78%,transparent 100%)"
        ></div>
        <div class="flex items-center justify-between gap-2 px-3 py-2 bg-[#0c1326] border-b border-[#253657]">
          <div class="inline-flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${inspected.accentColor};box-shadow:0 0 8px ${inspected.glowColor}"></span>
            <span class="text-[12px] font-black uppercase tracking-wider text-white mam-outline-sm">Weather Forecast</span>
          </div>
          <span class="px-2 py-0.5 rounded-lg bg-[#11203d] border border-sky-400/60 text-[10px] font-black text-sky-200 tabular-nums">Rolls every 3:00</span>
        </div>

        <div class="grid grid-cols-[276px_minmax(0,1fr)] @max-[640px]:grid-cols-1 gap-2.5 p-2.5 items-stretch">
          <div class="flex flex-col gap-1.5">
            ${WEATHERS.map((item) => {
              const isActive = item.id === w.id;
              const isInsp = item.id === inspected.id;
              return `
                <button
                  type="button"
                  class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 cursor-pointer transition-[transform,background,border-color,box-shadow] duration-150 ${
                    isInsp
                      ? 'bg-[#1a2948] translate-x-0.5'
                      : isActive
                        ? 'bg-[#142038] hover:bg-[#1a2845]'
                        : 'bg-[#0e1629] border-[#22314f] hover:bg-[#16223b]'
                  }"
                  style="${isInsp || isActive ? `border-color:${item.accentColor};${isInsp ? `box-shadow:0 0 14px -2px ${item.glowColor}66,inset 0 1px 0 rgba(255,255,255,0.16)` : ''}` : ''}"
                  data-weather-inspect="${item.id}"
                >
                  <div
                    class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center border border-[#32466b] [&>.mam-3d-icon]:w-8 [&>.mam-3d-icon]:h-8"
                    style="background:radial-gradient(circle at 50% 45%,${item.glowColor}44,#0a1020 82%)"
                  >
                    ${weatherIconHtml(item.id, 32, item.name)}
                  </div>
                  <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-[12px] font-black leading-tight truncate mam-outline-sm" style="color:${item.accentColor}">${item.name}${isActive ? ' • Now' : ''}</span>
                      <span class="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md bg-[#080d18] text-slate-100 border border-[#2d4066]">${item.chancePct}%</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] font-extrabold leading-tight mt-0.5 whitespace-nowrap">
                      <span class="text-amber-300">${item.oreDropMult}x Ore</span>
                      <span class="text-slate-500">•</span>
                      <span class="text-fuchsia-300">${item.gemDropMult}x Gems</span>
                      <span class="text-slate-500">•</span>
                      <span class="text-rose-300">${item.damageMult}x DMG</span>
                    </div>
                  </div>
                  ${isInsp ? `<span class="text-[12px] font-black shrink-0" style="color:${item.accentColor}" aria-hidden="true">▸</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div
            class="rounded-xl border-2 bg-[#0a1020] p-2.5 flex flex-col gap-2 shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)]"
            style="border-color:${inspected.accentColor}88"
          >
            <div class="flex items-center gap-2.5 pb-2 border-b border-[#22314f]">
              <div
                class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border-2"
                style="border-color:${inspected.accentColor};background:radial-gradient(circle at 50% 45%,${inspected.glowColor}55,#0d1529 85%)"
              >
                ${meteorIconHtml(inspected.id, 28, inspOre.meteorName)}
              </div>
              <div class="flex-1 min-w-0 flex flex-col">
                <span class="text-[13px] font-black leading-tight truncate mam-outline-sm" style="color:${inspected.accentColor}">${inspOre.meteorName} Drops</span>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="px-1.5 py-0.5 rounded-md bg-[#16223b] border border-[#2f4369] text-[9.5px] font-black text-slate-200 uppercase tracking-wide">500x Pit HP</span>
                  <span class="text-[10px] font-extrabold text-slate-400">Meteor Loot</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 flex-1 justify-between">
              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#121c33] border border-[#2a3d61]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#0a1020] border border-[#2a3d61] flex items-center justify-center shrink-0">
                    <img class="w-6 h-6 object-contain" src="${assetUrl(`/ores/${inspOre.id}.webp`)}" alt="${inspOre.name}" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-white truncate">${inspOre.name}</span>
                    <span class="text-[10px] font-bold text-slate-300">${inspOreQtyRange} per meteor</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg bg-[#0d3325] text-emerald-300 border border-emerald-400 shrink-0">100%</span>
              </div>

              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#121c33] border border-[#2a3d61]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#0a1020] border border-[#2a3d61] flex items-center justify-center shrink-0 overflow-hidden">
                    ${
                      inspChibi
                        ? `<img class="w-7 h-7 object-contain" src="${assetUrl(inspChibi.poses.pose)}" alt="${inspChibi.name}" />`
                        : `${hudIconHtml('lock', 20, 'Locked')}`
                    }
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-white truncate">${inspChibi ? inspChibi.name : 'Celestial Limited'}</span>
                    <span class="text-[10px] font-bold text-slate-300">${
                      inspChibi && inspChibiEntries[0]
                        ? `${inspChibiEntries[0].rarity.toUpperCase()} Chibi`
                        : 'Coming Soon'
                    }</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg ${
                  inspChibi ? 'bg-[#36134a] text-fuchsia-300 border-fuchsia-400' : 'bg-[#1e293b] text-slate-300 border-[#334155]'
                } border shrink-0">${inspChibi && inspChibiEntries[0] ? `${inspChibiEntries[0].chancePct}%` : 'Soon'}</span>
              </div>

              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#121c33] border border-[#2a3d61]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#0a1020] border border-[#2a3d61] flex items-center justify-center shrink-0 [&>img]:w-6 [&>img]:h-6">${enchantDiceIconHtml(24)}</div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-white truncate">Enchant Dice + Gems</span>
                    <span class="text-[10px] font-bold text-slate-300">Bonus meteor reward</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg bg-[#0c2d4a] text-sky-300 border border-sky-400 shrink-0">${inspDicePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    : '';

  return `
      <button
        class="group relative flex items-center gap-2.5 @max-[720px]:gap-2 pl-2 pr-3 py-1.5 rounded-2xl border-2 bg-[linear-gradient(135deg,#141e36_0%,#0b1121_100%)] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
        style="border-color:${w.accentColor};box-shadow:0 0 18px ${w.glowColor}44,inset 0 1px 0 rgba(255,255,255,0.22),0_4px_0 #050812,0_10px_24px rgba(0,0,0,0.65)"
        data-action="toggle-weather-info"
        title="${w.name} (${w.chancePct}%): ${w.oreDropMult}x Ore • ${w.gemDropMult}x Gems • ${w.damageMult}x Damage — Click for forecast"
      >
        <div
          class="w-[42px] h-[42px] @max-[720px]:w-[36px] @max-[720px]:h-[36px] rounded-xl shrink-0 flex items-center justify-center border border-[#3b4f78] [&>.mam-3d-icon]:w-[38px] [&>.mam-3d-icon]:h-[38px] @max-[720px]:[&>.mam-3d-icon]:w-[32px] @max-[720px]:[&>.mam-3d-icon]:h-[32px]"
          style="background:radial-gradient(circle at 50% 42%,${w.glowColor}55,#0f172a 82%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.25)"
        >
          ${weatherIconHtml(w.id, 38, w.name)}
        </div>
        <div class="flex flex-col items-start min-w-0 leading-none">
          <div class="flex items-center gap-1.5">
            <span class="text-[14px] @max-[720px]:text-[13px] font-black tracking-tight mam-outline-sm" style="color:${w.accentColor}">${w.name}</span>
            <span class="px-1.5 py-[2px] rounded-md bg-[#0a1020] border border-[#2f4266] text-[10px] font-black text-white tabular-nums mam-outline-sm" data-hud-weather-timer="true">${timerTxt}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1 text-[11px] @max-[720px]:text-[10px] font-extrabold whitespace-nowrap mam-outline-sm">
            <span class="text-amber-300">${w.oreDropMult}x Ore</span>
            <span class="text-white/35">•</span>
            <span class="text-fuchsia-300">${w.gemDropMult}x Gem</span>
            <span class="text-white/35">•</span>
            <span class="text-rose-300">${w.damageMult}x DMG</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border-2 cursor-pointer transition-[transform,filter,border-color,background] duration-150 hover:brightness-110 active:scale-[0.97] ${
          state.autoMeteor
            ? 'border-cyan-400 bg-[#0e223d] shadow-[0_3px_0_#061020,0_4px_14px_rgba(34,211,238,0.28)]'
            : 'border-[#2a3b5c] bg-[#10182b] shadow-[0_3px_0_#060a14]'
        }"
        data-action="toggle-auto-meteor"
        aria-pressed="${state.autoMeteor}"
        title="Toggle automatic Meteor spawn on weather change"
      >
        ${meteorIconHtml(w.id, 16, 'Auto Meteor')}
        <span class="text-[11px] font-black text-slate-200 mam-outline-sm">Auto Meteor</span>
        <span class="relative inline-flex items-center w-9 h-[18px] rounded-full transition-colors duration-150 ${
          state.autoMeteor ? 'bg-emerald-500' : 'bg-slate-600'
        }">
          <span class="inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-150 ${
            state.autoMeteor ? 'translate-x-[19px]' : 'translate-x-[3px]'
          }"></span>
        </span>
        <span class="text-[10px] font-black uppercase ${state.autoMeteor ? 'text-emerald-300' : 'text-slate-400'}">${
          state.autoMeteor ? 'ON' : 'OFF'
        }</span>
      </button>
      ${popoverHtml}
    `;
}

const DPS_SWORD_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
  <path d="M19.5 4.5L11.2 12.8M19.5 4.5L15.2 4.9L9.8 10.3L13.7 14.2L19.1 8.8L19.5 4.5Z" fill="url(#mam-dps-blade)" stroke="#e0f2fe" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M8.5 11.5L12.5 15.5M6.2 17.8L10.2 13.8M5 19L7.4 16.6" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
  <defs>
    <linearGradient id="mam-dps-blade" x1="10" y1="5" x2="19" y2="14" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="55%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
</svg>`;

const DPS_CHEVRON_UP = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="M4 10L8 6L12 10" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const DPS_CHEVRON_DOWN = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="M4 6L8 10L12 6" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Builds inner HTML for the bottom-left DPS Meter pill and breakdown panel. */
export function buildDpsMeterInnerHtml(state: GameState, dpsMeterOpen: boolean): string {
  const bd = state.getDpsBreakdown();
  const total = bd.totalPlotDps;
  const panelHtml = dpsMeterOpen
    ? `
        <div class="mam-dps-panel flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <span class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-sky-200 mam-outline-sm">
              ${DPS_SWORD_SVG}
              <span>Damage Breakdown</span>
            </span>
            <span class="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-300/40 text-[10.5px] font-black text-amber-200 tabular-nums">Tap ${fmtShort(bd.tapDamage)}</span>
          </div>
          ${
            bd.units.length > 0
              ? `<div class="flex flex-col gap-1.5 max-h-[172px] overflow-y-auto mam-no-scrollbar pr-0.5" data-dps-scroll="true">
                  ${bd.units
                    .map((u) => {
                      const pctStr = `${u.pct >= 10 ? Math.round(u.pct) : u.pct.toFixed(1)}%`;
                      const starTag = u.stars > 0 ? ` <span class="text-amber-300">★${u.stars}</span>` : '';
                      return `
                        <button type="button" class="w-full text-left flex flex-col gap-1 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-sky-400/10 hover:border-sky-300/35 cursor-pointer transition-colors" data-dps-inspect-slot="${u.slotIndex}" title="Inspect ${u.name} (Plot ${u.slotIndex + 1})">
                          <div class="flex items-center justify-between text-[11px] font-extrabold text-slate-100 gap-2">
                            <span class="truncate"><span class="text-[9.5px] text-slate-400 font-black mr-1">#${u.slotIndex + 1}</span>${u.name}${starTag}</span>
                            <span class="shrink-0 text-sky-300 font-black tabular-nums">${fmtShort(u.dps)} <span class="text-slate-400 font-bold text-[10px]">(${pctStr})</span></span>
                          </div>
                          <div class="h-1.5 w-full rounded-full bg-slate-950/90 border border-white/10 overflow-hidden">
                            <div class="h-full rounded-full bg-[linear-gradient(90deg,#0284c7,#38bdf8,#a855f7)]" style="width:${Math.min(100, Math.max(2, u.pct))}%"></div>
                          </div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>`
              : '<div class="text-[11px] font-bold text-slate-400 py-1">Place Chibis on plots to track DPS.</div>'
          }
        </div>
      `
    : '';

  return `
      ${panelHtml}
      <button type="button" class="mam-dps-pill text-white text-[12px] font-black tabular-nums cursor-pointer mam-outline-sm" data-action="toggle-dps-meter" title="Toggle DPS Breakdown">
        <span class="mam-dps-emblem" aria-hidden="true">${DPS_SWORD_SVG}</span>
        <span class="flex-1 min-w-0 flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 min-w-0">
            <span class="text-sky-300 truncate">${fmtShort(total)}/s</span>
            <span class="w-1 h-1 rounded-full bg-slate-500 shrink-0"></span>
            <span class="text-amber-300 shrink-0">Tap ${fmtShort(bd.tapDamage)}</span>
          </span>
          <span class="shrink-0 opacity-90" data-dps-chevron="${dpsMeterOpen ? 'down' : 'up'}">${dpsMeterOpen ? DPS_CHEVRON_DOWN : DPS_CHEVRON_UP}</span>
        </span>
      </button>
    `;
}

/** Coordinates Weather Forecast, DPS Meter, and Active Potions dock widgets on the HUD. */
export class WeatherDpsHudUi {
  private weatherPopoverOpen = false;
  private weatherInspectId: WeatherId | null = null;
  private dpsMeterOpen = false;
  private lastDpsMeterHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly onOpenPlotInspector: (slotIndex: number) => void,
    private readonly onToggleAutoMeteor?: (enabled: boolean) => void
  ) {}

  public renderWeatherWidget(now = Date.now()): string {
    const w = this.state.getActiveWeather();
    const inner = buildWeatherWidgetInnerHtml(
      this.state,
      { popoverOpen: this.weatherPopoverOpen, inspectId: this.weatherInspectId },
      now
    );
    return `
      <div class="absolute top-[14px] left-4 @max-[720px]:top-2.5 @max-[720px]:left-2.5 z-[5] flex flex-col items-start gap-1.5 pointer-events-auto" data-hud-weather="true" data-weather-key="${w.id}:${this.weatherPopoverOpen ? 1 : 0}:${this.state.autoMeteor ? 1 : 0}">
        ${inner}
      </div>
    `;
  }

  public renderDpsMeterWidget(includeOverclock = false, now = Date.now()): string {
    const inner = buildDpsMeterInnerHtml(this.state, this.dpsMeterOpen);
    this.lastDpsMeterHtml = inner;
    if (!includeOverclock) {
      return `
        <div class="absolute bottom-[14px] left-4 [[data-hud-pots-above=true]_&]:bottom-[108px] @max-[860px]:bottom-[94px] @max-[720px]:left-2.5 z-[5] w-[236px] @max-[1100px]:w-[218px] max-w-[calc(100vw-24px)] flex flex-col items-stretch gap-1.5 pointer-events-auto" data-hud-dps="true">
          ${inner}
        </div>
      `;
    }
    return `
      <div class="absolute bottom-[14px] left-4 [[data-hud-pots-above=true]_&]:bottom-[108px] @max-[860px]:bottom-[94px] @max-[720px]:left-2.5 z-[5] w-[236px] @max-[1100px]:w-[218px] max-w-[calc(100vw-24px)] flex flex-col items-stretch gap-1.5 pointer-events-none">
        <div class="w-full flex flex-col items-stretch gap-1.5 pointer-events-auto" data-hud-dps="true">
          ${inner}
        </div>
        ${this.renderOverclockWidget(now)}
      </div>
    `;
  }

  public renderActivePotionsDock(now = Date.now()): string {
    const { single, empty, key, html } = buildActivePotionsDockContent(this.state, now);
    const cls = `mam-active-pots${single ? ' is-single' : ''}${empty ? ' is-empty' : ''}`;
    return `<div class="${cls}" data-active-pots="true" data-pots-key="${key}">${html}</div>`;
  }

  public bindEvents(root: HTMLElement): void {
    const weatherHost = root.querySelector<HTMLElement>('[data-hud-weather="true"]');
    if (weatherHost) {
      this.bindWeatherHostEvents(root, weatherHost);
    }
    this.bindDpsMeterEvents(root);
  }

  private bindWeatherHostEvents(root: HTMLElement, host: HTMLElement): void {
    host.querySelector('[data-action="toggle-weather-info"]')?.addEventListener('click', () => {
      audio.playSfx('ui-tab');
      this.weatherPopoverOpen = !this.weatherPopoverOpen;
      this.syncWeatherWidget(root, true);
    });
    host.querySelector('[data-action="toggle-auto-meteor"]')?.addEventListener('click', () => {
      const enabled = this.state.toggleAutoMeteor();
      audio.playSfx('ui-tab');
      this.onToggleAutoMeteor?.(enabled);
      this.syncWeatherWidget(root, true);
    });
    host.querySelectorAll<HTMLElement>('[data-weather-inspect]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const wid = el.dataset.weatherInspect as WeatherId | undefined;
        if (!wid) return;
        audio.playSfx('ui-tab');
        this.weatherInspectId = wid;
        this.syncWeatherWidget(root, true);
      });
    });
  }

  private bindDpsMeterEvents(root: HTMLElement): void {
    const host = root.querySelector<HTMLElement>('[data-hud-dps="true"]');
    if (!host) return;
    const toggleBtn = host.querySelector<HTMLElement>('[data-action="toggle-dps-meter"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.dpsMeterOpen = !this.dpsMeterOpen;
        audio.playSfx('ui-tab');
        this.syncDpsMeterWidget(root);
      });
    }
    host.querySelectorAll<HTMLElement>('[data-dps-inspect-slot]').forEach((el) => {
      el.addEventListener('click', () => {
        const slot = Number(el.dataset.dpsInspectSlot);
        if (!Number.isFinite(slot)) return;
        audio.playSfx('ui-tab');
        this.onOpenPlotInspector(slot);
      });
    });
  }

  public syncWeatherWidget(root: HTMLElement, forceRebuild: boolean, now = Date.now()): void {
    const host = root.querySelector<HTMLElement>('[data-hud-weather="true"]');
    if (!host) return;
    const w = this.state.getActiveWeather();
    const nextKey = `${w.id}:${this.weatherPopoverOpen ? 1 : 0}:${this.state.autoMeteor ? 1 : 0}`;
    if (forceRebuild || host.dataset.weatherKey !== nextKey) {
      host.dataset.weatherKey = nextKey;
      host.innerHTML = buildWeatherWidgetInnerHtml(
        this.state,
        { popoverOpen: this.weatherPopoverOpen, inspectId: this.weatherInspectId },
        now
      );
      this.bindWeatherHostEvents(root, host);
      return;
    }
    const timerEl = host.querySelector<HTMLElement>('[data-hud-weather-timer="true"]');
    const nextText = formatWeatherTimer(this.state.getWeatherRemainingSec(now));
    if (timerEl && timerEl.textContent !== nextText) {
      timerEl.textContent = nextText;
    }
  }

  public syncDpsMeterWidget(root: HTMLElement): void {
    const host = root.querySelector<HTMLElement>('[data-hud-dps="true"]');
    if (!host) return;
    const nextHtml = buildDpsMeterInnerHtml(this.state, this.dpsMeterOpen);
    if (this.lastDpsMeterHtml === nextHtml) return;
    const prevScroll = host.querySelector<HTMLElement>('[data-dps-scroll="true"]')?.scrollTop ?? 0;
    this.lastDpsMeterHtml = nextHtml;
    host.innerHTML = nextHtml;
    const scroller = host.querySelector<HTMLElement>('[data-dps-scroll="true"]');
    if (scroller && prevScroll > 0) scroller.scrollTop = prevScroll;
    this.bindDpsMeterEvents(root);
  }

  public syncActivePotionsHud(root: HTMLElement, now = Date.now()): void {
    const dock = root.querySelector<HTMLElement>('[data-active-pots="true"]');
    if (!dock) return;
    const next = buildActivePotionsDockContent(this.state, now);
    dock.classList.toggle('is-single', next.single);
    dock.classList.toggle('is-empty', next.empty);
    if (dock.dataset.potsKey !== next.key) {
      dock.dataset.potsKey = next.key;
      dock.innerHTML = next.html;
      return;
    }
    for (const { def, rem } of next.active) {
      const nextText = formatWeatherTimer(rem);
      const timerEl = dock.querySelector<HTMLElement>(`[data-hud-pot-timer="${def.id}"]`);
      if (timerEl && timerEl.textContent !== nextText) {
        timerEl.textContent = nextText;
      }
    }
  }

  public renderOverclockWidget(now = Date.now()): string {
    const snap = this.state.getOverclockSnapshot(now);
    return `
      <div class="w-full pointer-events-none select-none" data-hud-overclock="true">
        ${buildOverclockGaugeInnerHtml(snap)}
      </div>
    `;
  }

  public syncOverclockWidget(root: HTMLElement, now = Date.now()): void {
    const host = root.querySelector<HTMLElement>('[data-hud-overclock="true"]');
    if (!host) return;
    const snap = this.state.getOverclockSnapshot(now);
    const key = snap.active
      ? `active:${snap.remainingSec.toFixed(1)}`
      : `charge:${Math.round(snap.chargePct)}`;
    if (host.dataset.ocKey === key) return;
    host.dataset.ocKey = key;
    host.innerHTML = buildOverclockGaugeInnerHtml(snap);
  }
}

const OVERCLOCK_BOLT_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
  <path d="M13.5 2L4.5 13.2H11.4L10.3 22L19.5 10.6H12.7L13.5 2Z" fill="url(#mam-oc-bolt)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="mam-oc-bolt" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="55%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#e879f9"/>
    </linearGradient>
  </defs>
</svg>`;

const OVERCLOCK_TICKS_HTML = '<div class="mam-fever-ticks" aria-hidden="true">' + '<span></span>'.repeat(10) + '</div>';

export function buildOverclockGaugeInnerHtml(snap: OverclockSnapshot): string {
  const pct = Math.max(0, Math.min(100, Math.round(snap.chargePct)));
  if (snap.active) {
    return `
      <div class="mam-fever-shell is-active" data-overclock-state="active">
        <div class="mam-fever-emblem">${OVERCLOCK_BOLT_SVG}</div>
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <div class="flex items-center justify-between gap-1.5 leading-none">
            <span class="text-[11px] font-black italic uppercase tracking-[0.08em] text-[#fef08a] mam-outline-sm">OVERCLOCK ACTIVE</span>
            <span class="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-[11px] font-black tabular-nums text-white leading-none mam-outline-sm">${snap.remainingSec.toFixed(1)}s</span>
          </div>
          <div class="mam-fever-track">
            <div class="mam-fever-fill" style="width:${pct}%"></div>
            ${OVERCLOCK_TICKS_HTML}
          </div>
          <div class="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider leading-none">
            <span class="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-300/50 text-amber-200">2x SPD</span>
            <span class="px-1.5 py-0.5 rounded bg-fuchsia-500/25 border border-fuchsia-300/50 text-fuchsia-200">2x TAP</span>
            <span class="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-300/50 text-sky-200">+50% ORE</span>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="mam-fever-shell" data-overclock-state="charging">
      <div class="mam-fever-emblem">${OVERCLOCK_BOLT_SVG}</div>
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-1.5 leading-none">
          <span class="text-[10.5px] font-black italic uppercase tracking-[0.1em] text-sky-200 mam-outline-sm">OVERCLOCK FEVER</span>
          <span class="text-[11px] font-black tabular-nums text-white mam-outline-sm">${pct}%</span>
        </div>
        <div class="mam-fever-track">
          <div class="mam-fever-fill" style="width:${pct}%"></div>
          ${OVERCLOCK_TICKS_HTML}
        </div>
      </div>
    </div>
  `;
}
