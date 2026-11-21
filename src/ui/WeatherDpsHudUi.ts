import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import {
  GEM_SHOP_ITEMS,
  GemShopItemDef,
  getWeatherOreByWeatherId,
  getWorldById,
  RARITY_BORDER,
  WEATHER_METEOR_CHIBIS,
  WEATHER_METEOR_DICE_CHANCE,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtShort } from '../game/NumberFormat';
import {
  getOverclockTierBuffs,
  type OverclockSnapshot,
  type OverclockTier,
} from '../game/OverclockDomain';
import { WeatherId, WEATHERS } from '../game/WeatherData';
import { getChibiById } from '../game3d/ChibiCatalog';
import { enchantDiceIconHtml, gemPotionIconHtml, hudIconHtml, meteorIconHtml, weatherIconHtml } from './HudIcons';
import { formatCountdownTimer, chibiPortraitHtml, TW_ACTIVE_POT_PILL } from './HudShared';

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
            <div class="w-[28px] h-[28px] shrink-0 flex items-center justify-center @max-[720px]:w-[24px] @max-[720px]:h-[24px]">${gemPotionIconHtml(def.id, 28, def.name, def.color)}</div>
            <div class="flex items-center justify-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0 animate-[mamPotDotPulse_1.4s_ease-in-out_infinite]"></span>
              <span class="text-[11px] font-black text-[#059669] tabular-nums leading-none" data-hud-pot-timer="${def.id}">${formatWeatherTimer(rem)}</span>
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

const SYNERGY_STAR_SVG = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
  <path d="M10 1.8L12.3 7.7L18.2 10L12.3 12.3L10 18.2L7.7 12.3L1.8 10L7.7 7.7L10 1.8Z" fill="#fde047" stroke="#14111d" stroke-width="1.7" stroke-linejoin="round"/>
</svg>`;

export function buildWorldSynergyBadgesHtml(state: GameState): string {
  const resonances = state.getActiveWorldResonances();
  if (!resonances.length) return '';
  const cards = resonances
    .map((r) => {
      const wDef = getWorldById(r.worldId);
      const dmgPct = Math.round(r.tier.dmgBonusPct * 100);
      const orePct = Math.round(r.tier.oreDropBonusPct * 100);
      const sellPct = Math.round(r.tier.sellBonusPct * 100);
      const gemPct = Math.round(r.tier.gemBonusPct * 100);
      return `
        <div
          class="inline-flex items-center gap-2 @max-[720px]:gap-1.5 pl-1.5 pr-2.5 py-1 rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] text-[#14111d] pointer-events-none select-none"
          data-world-synergy-badge="${r.worldId}"
          title="World Synergy • ${r.worldName} (${r.count}/5 Chibis • ${r.worldScale}×)"
        >
          <span
            class="w-7 h-7 @max-[720px]:w-6 @max-[720px]:h-6 rounded-lg border-2 border-[#14111d] flex items-center justify-center shrink-0"
            style="background:radial-gradient(circle at 35% 30%,#ffffff 0%,${wDef.iconColor} 88%)"
          >${SYNERGY_STAR_SVG}</span>
          <div class="flex flex-col items-start min-w-0 leading-none gap-1">
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] font-black uppercase tracking-wider text-[#6d28d9]">Synergy</span>
              <span class="text-[11.5px] @max-[720px]:text-[10.5px] font-black text-[#14111d] truncate">${r.worldName}</span>
              <span class="px-1.5 py-[1px] rounded-md bg-[#14111d] text-[#fff8e7] text-[9.5px] font-black tabular-nums">${r.count}/5</span>
            </div>
            <div class="flex items-center gap-1 text-[9.5px] font-black tabular-nums whitespace-nowrap flex-wrap">
              <span class="px-1.5 py-[1px] rounded bg-[#fee2e2] border border-[#14111d] text-[#dc2626]">+${dmgPct}% DMG</span>
              ${orePct > 0 ? `<span class="px-1.5 py-[1px] rounded bg-[#fef08a] border border-[#14111d] text-[#b45309]">+${orePct}% Ore</span>` : ''}
              ${sellPct > 0 ? `<span class="px-1.5 py-[1px] rounded bg-[#dcfce7] border border-[#14111d] text-[#15803d]">+${sellPct}% Sell</span>` : ''}
              ${gemPct > 0 ? `<span class="px-1.5 py-[1px] rounded bg-[#f3e8ff] border border-[#14111d] text-[#7e22ce]">+${gemPct}% Gem</span>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
  return `<div class="flex flex-col items-start gap-1" data-hud-synergy="true">${cards}</div>`;
}

/** Builds inner HTML for the top-left Weather widget and optional Forecast popover. */
export function buildWeatherWidgetInnerHtml(
  state: GameState,
  opts: { popoverOpen: boolean; inspectId: WeatherId | null; showSynergy?: boolean },
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
        class="relative w-[596px] @max-[640px]:w-[310px] max-w-[calc(100vw-24px)] max-h-[76vh] overflow-y-auto mam-no-scrollbar rounded-2xl border-[3px] border-[#14111d] bg-[#fff8e7] text-[#14111d]"
      >
        <div
          class="h-[6px] w-full border-b-2 border-[#14111d]"
          style="background:${inspected.accentColor}"
        ></div>
        <div class="flex items-center justify-between gap-2 px-3 py-2 bg-[#fcecc8] border-b-2 border-[#14111d]">
          <div class="inline-flex items-center gap-2">
            <span class="w-3 h-3 rounded-full shrink-0 border-2 border-[#14111d]" style="background:${inspected.accentColor}"></span>
            <span class="text-[12px] font-black uppercase tracking-wider text-[#14111d]">Weather Forecast</span>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-[#bae6fd] border-2 border-[#14111d] text-[10px] font-black text-[#14111d] tabular-nums">Rolls every 3:00</span>
        </div>

        <div class="grid grid-cols-[276px_minmax(0,1fr)] @max-[640px]:grid-cols-1 gap-2.5 p-2.5 items-stretch">
          <div class="flex flex-col gap-1.5">
            ${WEATHERS.map((item) => {
              const isActive = item.id === w.id;
              const isInsp = item.id === inspected.id;
              return `
                <button
                  type="button"
                  class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 border-[#14111d] cursor-pointer transition-[transform,background] duration-150 ${
                    isInsp
                      ? 'bg-[#fde047] translate-x-0.5'
                      : isActive
                        ? 'bg-[#d1fae5] hover:bg-[#fef08a]'
                        : 'bg-[#ffffff] hover:bg-[#fcecc8]'
                  }"
                  data-weather-inspect="${item.id}"
                >
                  <div
                    class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center border-2 border-[#14111d] [&>.mam-3d-icon]:w-8 [&>.mam-3d-icon]:h-8"
                    style="background:radial-gradient(circle at 50% 45%,${item.glowColor}33,#ffffff 85%)"
                  >
                    ${weatherIconHtml(item.id, 32, item.name)}
                  </div>
                  <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-[12px] font-black leading-tight truncate text-[#14111d]">${item.name}${isActive ? ' • Now' : ''}</span>
                      <span class="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md bg-[#14111d] text-[#fff8e7]">${item.chancePct}%</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] font-black leading-tight mt-0.5 whitespace-nowrap">
                      <span class="text-[#b45309]">${item.oreDropMult}x Ore</span>
                      <span class="text-[#94a3b8]">•</span>
                      <span class="text-[#7e22ce]">${item.gemDropMult}x Gems</span>
                      <span class="text-[#94a3b8]">•</span>
                      <span class="text-[#dc2626]">${item.damageMult}x DMG</span>
                    </div>
                  </div>
                  ${isInsp ? `<span class="text-[12px] font-black shrink-0 text-[#14111d]" aria-hidden="true">▸</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div
            class="rounded-xl border-2 border-[#14111d] bg-[#ffffff] p-2.5 flex flex-col gap-2"
          >
            <div class="flex items-center gap-2.5 pb-2 border-b-2 border-[#14111d]/15">
              <div
                class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border-2 border-[#14111d]"
                style="background:radial-gradient(circle at 50% 45%,${inspected.glowColor}44,#fff8e7 85%)"
              >
                ${meteorIconHtml(inspected.id, 28, inspOre.meteorName)}
              </div>
              <div class="flex-1 min-w-0 flex flex-col">
                <span class="text-[13px] font-black leading-tight truncate text-[#14111d]">${inspOre.meteorName} Drops</span>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="px-1.5 py-0.5 rounded-md bg-[#fcecc8] border border-[#14111d] text-[9.5px] font-black text-[#14111d] uppercase tracking-wide">500x Pit HP</span>
                  <span class="text-[10px] font-extrabold text-[#5b526e]">Meteor Loot</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 flex-1 justify-between">
              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#fff8e7] border-2 border-[#14111d]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#ffffff] border-2 border-[#14111d] flex items-center justify-center shrink-0">
                    <img class="w-6 h-6 object-contain" src="${assetUrl(`/ores/${inspOre.id}.webp`)}" alt="${inspOre.name}" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-[#14111d] truncate">${inspOre.name}</span>
                    <span class="text-[10px] font-bold text-[#5b526e]">${inspOreQtyRange} per meteor</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg bg-[#2ee59d] text-[#14111d] border-2 border-[#14111d] shrink-0">100%</span>
              </div>

              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#fff8e7] border-2 border-[#14111d]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#ffffff] border-2 border-[#14111d] flex items-center justify-center shrink-0 overflow-hidden">
                    ${
                      inspChibi
                        ? `<img class="w-7 h-7 object-contain" src="${assetUrl(inspChibi.poses.pose)}" alt="${inspChibi.name}" />`
                        : `${hudIconHtml('lock', 20, 'Locked')}`
                    }
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-[#14111d] truncate">${inspChibi ? inspChibi.name : 'Celestial Limited'}</span>
                    <span class="text-[10px] font-bold text-[#5b526e]">${
                      inspChibi && inspChibiEntries[0]
                        ? `${inspChibiEntries[0].rarity.toUpperCase()} Chibi`
                        : 'Coming Soon'
                    }</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg ${
                  inspChibi ? 'bg-[#f472b6] text-white border-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e] border-[#14111d]'
                } border-2 shrink-0">${inspChibi && inspChibiEntries[0] ? `${inspChibiEntries[0].chancePct}%` : 'Soon'}</span>
              </div>

              <div class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#fff8e7] border-2 border-[#14111d]">
                <div class="inline-flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-[#ffffff] border-2 border-[#14111d] flex items-center justify-center shrink-0 [&>img]:w-6 [&>img]:h-6">${enchantDiceIconHtml(24)}</div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[12px] font-black text-[#14111d] truncate">Enchant Dice + Gems</span>
                    <span class="text-[10px] font-bold text-[#5b526e]">Bonus meteor reward</span>
                  </div>
                </div>
                <span class="text-[10.5px] font-black tabular-nums px-2 py-0.5 rounded-lg bg-[#7dd3fc] text-[#14111d] border-2 border-[#14111d] shrink-0">${inspDicePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    : '';

  return `
      <button
        class="group relative flex items-center gap-2.5 @max-[720px]:gap-2 pl-2 pr-3 py-1.5 rounded-2xl border-[3px] border-[#14111d] bg-[#fff8e7] text-[#14111d] cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] hover:-rotate-1 active:scale-95"
        data-action="toggle-weather-info"
        title="${w.name} (${w.chancePct}%): ${w.oreDropMult}x Ore • ${w.gemDropMult}x Gems • ${w.damageMult}x Damage — Click for forecast"
      >
        <div
          class="w-[42px] h-[42px] @max-[720px]:w-[36px] @max-[720px]:h-[36px] rounded-xl shrink-0 flex items-center justify-center border-2 border-[#14111d] [&>.mam-3d-icon]:w-[38px] [&>.mam-3d-icon]:h-[38px] @max-[720px]:[&>.mam-3d-icon]:w-[32px] @max-[720px]:[&>.mam-3d-icon]:h-[32px]"
          style="background:radial-gradient(circle at 50% 42%,${w.glowColor}44,#ffffff 85%)"
        >
          ${weatherIconHtml(w.id, 38, w.name)}
        </div>
        <div class="flex flex-col items-start min-w-0 leading-none">
          <div class="flex items-center gap-1.5">
            <span class="text-[14px] @max-[720px]:text-[13px] font-black tracking-tight text-[#14111d]">${w.name}</span>
            <span class="px-1.5 py-[2px] rounded-md bg-[#14111d] text-[10px] font-black text-[#fff8e7] tabular-nums" data-hud-weather-timer="true">${timerTxt}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1 text-[11px] @max-[720px]:text-[10px] font-black whitespace-nowrap">
            <span class="text-[#b45309]">${w.oreDropMult}x Ore</span>
            <span class="text-[#94a3b8]">•</span>
            <span class="text-[#7e22ce]">${w.gemDropMult}x Gem</span>
            <span class="text-[#94a3b8]">•</span>
            <span class="text-[#dc2626]">${w.damageMult}x DMG</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border-[2.5px] border-[#14111d] cursor-pointer transition-[transform,filter,background] duration-150 hover:scale-[0.97] active:scale-[0.95] ${
          state.autoMeteor
            ? 'bg-[#d1fae5]'
            : 'bg-[#fff8e7]'
        }"
        data-action="toggle-auto-meteor"
        aria-pressed="${state.autoMeteor}"
        title="Toggle automatic Meteor spawn on weather change"
      >
        ${meteorIconHtml(w.id, 16, 'Auto Meteor')}
        <span class="text-[11px] font-black text-[#14111d]">Auto Meteor</span>
        <span class="relative inline-flex items-center w-9 h-[18px] rounded-full border-2 border-[#14111d] transition-colors duration-150 ${
          state.autoMeteor ? 'bg-[#2ee59d]' : 'bg-[#cbd5e1]'
        }">
          <span class="inline-block w-3 h-3 rounded-full bg-white border border-[#14111d] transition-transform duration-150 ${
            state.autoMeteor ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }"></span>
        </span>
        <span class="text-[10px] font-black uppercase ${state.autoMeteor ? 'text-[#059669]' : 'text-[#5b526e]'}">${
          state.autoMeteor ? 'ON' : 'OFF'
        }</span>
      </button>
      ${opts.showSynergy && !opts.popoverOpen ? buildWorldSynergyBadgesHtml(state) : ''}
      ${popoverHtml}
    `;
}

const DPS_SWORD_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
  <path d="M20 4L14.5 4.8L8.4 10.9L13.1 15.6L19.2 9.5L20 4Z" fill="#fef08a" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
  <path d="M7.2 10.2L13.8 16.8" stroke="#ff4d2e" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M9.6 14.4L5.2 18.8" stroke="#14111d" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="4.8" cy="19.2" r="1.4" fill="#fde047" stroke="#14111d" stroke-width="1.2"/>
</svg>`;

const DPS_CHEVRON_UP = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="M4 10L8 6L12 10" stroke="#14111d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const DPS_CHEVRON_DOWN = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="M4 6L8 10L12 6" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Builds inner HTML for the bottom-left DPS Meter pill and breakdown panel. */
export function buildDpsMeterInnerHtml(state: GameState, dpsMeterOpen: boolean): string {
  const bd = state.getDpsBreakdown();
  const total = bd.totalPlotDps;
  const panelHtml = dpsMeterOpen
    ? `
        <div class="mam-dps-panel flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2 border-b-2 border-[#14111d]/15 pb-2">
            <span class="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.06em] text-[#14111d]">
              ${DPS_SWORD_SVG}
              <span>Damage Breakdown</span>
            </span>
            <div class="flex items-center gap-1 shrink-0">
              <span class="px-1.5 py-0.5 rounded-md bg-[#bae6fd] border border-[#14111d] text-[10.5px] font-black text-[#0369a1] tabular-nums">${fmtShort(total)}/s</span>
              <span class="px-1.5 py-0.5 rounded-md bg-[#fde047] border border-[#14111d] text-[10.5px] font-black text-[#14111d] tabular-nums">Tap ${fmtShort(bd.tapDamage)}</span>
            </div>
          </div>
          ${
            bd.units.length > 0
              ? `<div class="flex flex-col gap-1.5 max-h-[214px] overflow-y-auto mam-no-scrollbar" data-dps-scroll="true">
                  ${bd.units
                    .map((u) => {
                      const chibi = getChibiById(u.chibiId);
                      const pctStr = `${u.pct >= 10 ? Math.round(u.pct) : u.pct.toFixed(1)}%`;
                      const starTag =
                        u.stars > 0
                          ? `<span class="px-1 py-[1px] rounded bg-[#fef08a] border border-[#d97706] text-[#92400e] text-[9.5px] font-black leading-none shrink-0">★${u.stars}</span>`
                          : '';
                      const borderHex = RARITY_BORDER[u.rarity] ?? '#94a3b8';
                      return `
                        <button type="button" class="w-full text-left flex items-center gap-2.5 p-2 rounded-xl bg-[#ffffff] border-2 border-[#14111d] hover:bg-[#fef9c3] cursor-pointer transition-colors" data-dps-inspect-slot="${u.slotIndex}" title="Inspect ${u.name} (Plot ${u.slotIndex + 1})">
                          <div class="w-10 h-10 shrink-0 rounded-lg border-2 border-[#14111d] overflow-hidden flex items-center justify-center p-0.5" style="background:radial-gradient(circle at 50% 45%, ${borderHex}33, #fffbeb)">
                            ${chibi ? chibiPortraitHtml(chibi, { draggable: false }) : ''}
                          </div>
                          <div class="flex-1 min-w-0 flex flex-col gap-1">
                            <div class="flex items-center justify-between gap-2">
                              <span class="inline-flex items-center gap-1 min-w-0">
                                <span class="px-1.5 py-[1px] rounded bg-[#14111d] text-white text-[9.5px] font-black leading-tight shrink-0">#${u.slotIndex + 1}</span>
                                <span class="text-[12px] font-black text-[#14111d] truncate">${u.name}</span>
                                ${starTag}
                              </span>
                              <span class="shrink-0 inline-flex items-center gap-1 tabular-nums">
                                <span class="text-[12px] font-black text-[#0284c7]">${fmtShort(u.dps)}/s</span>
                                <span class="px-1.5 py-[1px] rounded-md bg-[#e0f2fe] border border-[#0284c7]/40 text-[#0369a1] font-black text-[9.5px]">${pctStr}</span>
                              </span>
                            </div>
                            <div class="h-2 w-full rounded-full bg-[#fcecc8] border border-[#14111d] overflow-hidden">
                              <div class="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#0284c7)]" style="width:${Math.min(100, Math.max(2, u.pct))}%"></div>
                            </div>
                          </div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>`
              : '<div class="text-[11.5px] font-bold text-[#5b526e] py-1.5 text-center">Place Chibis on plots to track DPS.</div>'
          }
        </div>
      `
    : '';

  return `
      ${panelHtml}
      <button type="button" class="mam-dps-pill h-[44px] @max-[720px]:h-[38px] text-[#14111d] text-[12px] @max-[720px]:text-[11px] font-black tabular-nums cursor-pointer" data-action="toggle-dps-meter" title="Toggle DPS Breakdown">
        <span class="mam-dps-emblem" aria-hidden="true">${DPS_SWORD_SVG}</span>
        <span class="flex-1 min-w-0 flex items-center justify-center gap-1 text-center">
          <span class="text-[#0284c7] truncate">${fmtShort(total)}/s</span>
          <span class="w-1 h-1 rounded-full bg-[#94a3b8] shrink-0"></span>
          <span class="text-[#d97706] shrink-0">Tap ${fmtShort(bd.tapDamage)}</span>
        </span>
        <span class="shrink-0 opacity-90" data-dps-chevron="${dpsMeterOpen ? 'down' : 'up'}">${dpsMeterOpen ? DPS_CHEVRON_DOWN : DPS_CHEVRON_UP}</span>
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

  private buildWeatherStateKey(showSynergy: boolean): string {
    const w = this.state.getActiveWeather();
    const synKey = showSynergy
      ? this.state
          .getActiveWorldResonances()
          .map((r) => `${r.worldId}:${r.count}`)
          .join(',')
      : '';
    return `${w.id}:${this.weatherPopoverOpen ? 1 : 0}:${this.state.autoMeteor ? 1 : 0}:${showSynergy ? 1 : 0}:${synKey}`;
  }

  public renderWeatherWidget(now = Date.now(), showSynergy = false): string {
    const inner = buildWeatherWidgetInnerHtml(
      this.state,
      { popoverOpen: this.weatherPopoverOpen, inspectId: this.weatherInspectId, showSynergy },
      now
    );
    return `
      <div class="absolute top-[14px] left-4 @max-[720px]:top-2.5 @max-[720px]:left-2.5 z-[5] flex flex-col items-start gap-1.5 pointer-events-auto" data-hud-weather="true" data-show-synergy="${showSynergy ? '1' : '0'}" data-weather-key="${this.buildWeatherStateKey(showSynergy)}">
        ${inner}
      </div>
    `;
  }

  public renderInlineDpsMeter(): string {
    const inner = buildDpsMeterInnerHtml(this.state, this.dpsMeterOpen);
    this.lastDpsMeterHtml = inner;
    return `
      <div class="relative w-[224px] @max-[720px]:w-[186px] flex flex-col items-stretch gap-1 pointer-events-auto [&_.mam-dps-panel]:absolute [&_.mam-dps-panel]:top-0 [&_.mam-dps-panel]:right-full [&_.mam-dps-panel]:mr-2 [&_.mam-dps-panel]:w-[320px] @max-[720px]:[&_.mam-dps-panel]:w-[258px] [&_.mam-dps-panel]:p-3 [&_.mam-dps-panel]:z-20" data-hud-dps="true">
        ${inner}
      </div>
    `;
  }

  public renderDpsMeterWidget(includeOverclock = false, now = Date.now()): string {
    const inner = buildDpsMeterInnerHtml(this.state, this.dpsMeterOpen);
    this.lastDpsMeterHtml = inner;
    if (!includeOverclock) {
      return `
        <div class="absolute bottom-[12px] left-3 [[data-hud-dps-above=true]_&]:bottom-[104px] @max-[860px]:bottom-[92px] @max-[720px]:left-2.5 z-[5] w-[224px] @max-[720px]:w-[186px] max-w-[calc(100vw-24px)] flex flex-col items-stretch gap-1 pointer-events-auto [&_.mam-dps-panel]:w-[320px] @max-[720px]:[&_.mam-dps-panel]:w-[258px] [&_.mam-dps-panel]:p-3" data-hud-dps="true">
          ${inner}
        </div>
      `;
    }
    return `
      <div class="absolute bottom-[12px] left-3 [[data-hud-dps-above=true]_&]:bottom-[104px] @max-[860px]:bottom-[92px] @max-[720px]:left-2.5 z-[5] w-[224px] @max-[720px]:w-[186px] max-w-[calc(100vw-24px)] flex flex-col items-stretch gap-1 pointer-events-none">
        <div class="w-full flex flex-col items-stretch gap-1 pointer-events-auto [&_.mam-dps-panel]:w-[320px] @max-[720px]:[&_.mam-dps-panel]:w-[258px] [&_.mam-dps-panel]:p-3" data-hud-dps="true">
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
    const showSynergy = host.dataset.showSynergy === '1';
    const nextKey = this.buildWeatherStateKey(showSynergy);
    if (forceRebuild || host.dataset.weatherKey !== nextKey) {
      host.dataset.weatherKey = nextKey;
      host.innerHTML = buildWeatherWidgetInnerHtml(
        this.state,
        { popoverOpen: this.weatherPopoverOpen, inspectId: this.weatherInspectId, showSynergy },
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
      ? `active:${snap.tier}:${snap.remainingSec.toFixed(1)}`
      : `charge:${Math.round(snap.chargePct)}`;
    if (host.dataset.ocKey === key) return;
    host.dataset.ocKey = key;

    const shell = host.querySelector<HTMLElement>('.mam-fever-shell');
    const titleEl = host.querySelector<HTMLElement>('[data-oc-title]');
    const valEl = host.querySelector<HTMLElement>('[data-oc-value]');
    const fillEl = host.querySelector<HTMLElement>('.mam-fever-fill');
    const badgesEl = host.querySelector<HTMLElement>('[data-oc-badges]');
    if (!shell || !titleEl || !valEl || !fillEl || !badgesEl) {
      host.innerHTML = buildOverclockGaugeInnerHtml(snap);
      return;
    }

    const tier: 0 | OverclockTier = snap.active ? (snap.tier === 2 || snap.tier === 3 ? snap.tier : 1) : 0;
    const buffs = getOverclockTierBuffs(tier);
    const pct = Math.max(0, Math.min(100, Math.round(snap.chargePct)));
    shell.classList.toggle('is-active', snap.active);
    shell.classList.toggle('is-tier-2', tier === 2);
    shell.classList.toggle('is-tier-3', tier === 3);
    shell.dataset.overclockState = snap.active ? 'active' : 'charging';
    shell.dataset.overclockTier = String(tier);
    fillEl.style.width = `${pct}%`;

    titleEl.textContent = snap.active ? buffs.label : 'OVERCLOCK FEVER';
    titleEl.className = OVERCLOCK_TITLE_CLASS;

    valEl.textContent = snap.active ? `${snap.remainingSec.toFixed(1)}s` : `${pct}%`;
    valEl.className = getOverclockValueClass(snap.active, tier);

    badgesEl.className = getOverclockBadgesClass(snap.active);
    if (badgesEl.dataset.ocTier !== String(tier)) {
      badgesEl.dataset.ocTier = String(tier);
      badgesEl.innerHTML = buildOverclockBadgesInnerHtml(tier);
    }
  }
}

const OVERCLOCK_TITLE_CLASS =
  'text-[10px] font-black italic uppercase tracking-[0.06em] text-[#14111d] truncate transition-colors duration-300';

function getOverclockValueClass(active: boolean, tier: 0 | OverclockTier = active ? 1 : 0): string {
  if (!active) {
    return 'px-1.5 py-[1px] rounded bg-[#bae6fd] border border-[#14111d] text-[10px] font-black tabular-nums text-[#14111d] leading-none shrink-0 transition-all duration-300';
  }
  const bgCls = tier === 3 ? 'bg-[#0284c7]' : tier === 2 ? 'bg-[#e11d48]' : 'bg-[#ff4d2e]';
  return `px-1.5 py-[1px] rounded ${bgCls} border border-[#14111d] text-[10px] font-black tabular-nums text-white leading-none shrink-0 transition-all duration-300`;
}

function getOverclockBadgesClass(active: boolean): string {
  return `flex items-center justify-center gap-1 mt-[2px] text-[8.5px] font-black uppercase tracking-wide leading-none whitespace-nowrap transition-opacity duration-300 ${
    active ? 'opacity-100' : 'opacity-75'
  }`;
}

function buildOverclockBadgesInnerHtml(tier: 0 | OverclockTier): string {
  const buffs = getOverclockTierBuffs(tier === 0 ? 1 : tier);
  const orePct = Math.round((buffs.dropMult - 1) * 100);
  return `
    <span class="px-1 py-[1px] rounded bg-[#fde047] border border-[#14111d] text-[#14111d]">${buffs.speedMult}x SPD</span>
    <span class="px-1 py-[1px] rounded bg-[#f9a8d4] border border-[#14111d] text-[#14111d]">${buffs.tapMult}x TAP</span>
    <span class="px-1 py-[1px] rounded bg-[#7dd3fc] border border-[#14111d] text-[#14111d]">+${orePct}% ORE</span>
  `;
}

const OVERCLOCK_TICKS_HTML = '<div class="mam-fever-ticks" aria-hidden="true">' + '<span></span>'.repeat(10) + '</div>';

export function buildOverclockGaugeInnerHtml(
  snap: Pick<OverclockSnapshot, 'active' | 'chargePct' | 'remainingSec' | 'durationSec'> &
    Partial<Pick<OverclockSnapshot, 'tier'>>
): string {
  const pct = Math.max(0, Math.min(100, Math.round(snap.chargePct)));
  const tier: 0 | OverclockTier = snap.active ? (snap.tier === 2 || snap.tier === 3 ? snap.tier : 1) : 0;
  const buffs = getOverclockTierBuffs(tier);
  const tierCls = tier === 3 ? ' is-tier-3' : tier === 2 ? ' is-tier-2' : '';
  const shellCls = snap.active ? `mam-fever-shell is-active${tierCls}` : 'mam-fever-shell';
  const stateAttr = snap.active ? 'active' : 'charging';
  const titleText = snap.active ? buffs.label : 'OVERCLOCK FEVER';
  const valText = snap.active ? `${snap.remainingSec.toFixed(1)}s` : `${pct}%`;

  return `
    <div class="${shellCls}" data-overclock-state="${stateAttr}" data-overclock-tier="${tier}">
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <div class="flex items-center justify-center gap-1.5 leading-none">
          <span class="${OVERCLOCK_TITLE_CLASS}" data-oc-title="true">${titleText}</span>
          <span class="${getOverclockValueClass(snap.active, tier)}" data-oc-value="true">${valText}</span>
        </div>
        <div class="mam-fever-track">
          <div class="mam-fever-fill" style="width:${pct}%"></div>
          ${OVERCLOCK_TICKS_HTML}
        </div>
        <div class="${getOverclockBadgesClass(snap.active)}" data-oc-badges="true" data-oc-tier="${tier}">
          ${buildOverclockBadgesInnerHtml(tier)}
        </div>
      </div>
    </div>
  `;
}
