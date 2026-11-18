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
      <div class="w-[315px] max-h-[76vh] overflow-y-auto mam-no-scrollbar rounded-2xl border border-white/15 bg-[rgba(10,14,24,0.95)] backdrop-blur-xl shadow-[0_18px_38px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.16)] p-2.5 flex flex-col gap-1.5">
        <div class="flex items-center justify-between px-1 pb-1 border-b border-white/10">
          <span class="text-[11px] font-black uppercase tracking-wider text-slate-300">Weather Forecast</span>
          <span class="text-[10px] font-extrabold text-sky-300">Rolls every 3:00</span>
        </div>
        ${WEATHERS.map((item) => {
          const isActive = item.id === w.id;
          const isInsp = item.id === inspected.id;
          return `
            <button
              type="button"
              class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-xl border cursor-pointer transition-[background,border-color] duration-150 ${
                isInsp ? 'bg-white/12' : isActive ? 'bg-white/[0.06]' : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07]'
              }"
              style="${isInsp || isActive ? `border-color:${item.accentColor};${isInsp ? `box-shadow:0 0 12px ${item.glowColor}44` : ''}` : ''}"
              data-weather-inspect="${item.id}"
            >
              <div class="w-8 h-8 shrink-0 flex items-center justify-center [&>.mam-3d-icon]:w-8 [&>.mam-3d-icon]:h-8">${weatherIconHtml(item.id, 32, item.name)}</div>
              <div class="flex-1 min-w-0 flex flex-col">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[12px] font-black leading-tight truncate mam-outline-sm" style="color:${item.accentColor}">${item.name}${isActive ? ' • Now' : ''}</span>
                  <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-black/40 text-slate-200 border border-white/10">${item.chancePct}%</span>
                </div>
                <div class="text-[10px] font-bold text-slate-300 leading-tight mt-0.5">${item.oreDropMult}x Ore • ${item.gemDropMult}x Gems • ${item.damageMult}x DMG</div>
              </div>
            </button>
          `;
        }).join('')}

        <div class="mt-0.5 pt-2 border-t border-white/12 flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2 px-1">
            <div class="inline-flex items-center gap-1.5 min-w-0">
              ${meteorIconHtml(inspected.id, 20, inspOre.meteorName)}
              <span class="text-[11px] font-black truncate mam-outline-sm" style="color:${inspected.accentColor}">${inspOre.meteorName} Drops</span>
            </div>
            <span class="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide">1000x Pit HP</span>
          </div>

          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
            <div class="inline-flex items-center gap-2 min-w-0">
              <img class="w-6 h-6 object-contain shrink-0" src="${assetUrl(`/ores/${inspOre.id}.webp`)}" alt="${inspOre.name}" />
              <div class="flex flex-col min-w-0">
                <span class="text-[11px] font-black text-white truncate">${inspOre.name}</span>
                <span class="text-[9.5px] font-bold text-slate-400">${inspOreQtyRange} per meteor</span>
              </div>
            </div>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 shrink-0">100%</span>
          </div>

          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
            <div class="inline-flex items-center gap-2 min-w-0">
              ${
                inspChibi
                  ? `<img class="w-6 h-6 object-contain shrink-0 rounded-md bg-black/30" src="${assetUrl(inspChibi.poses.pose)}" alt="${inspChibi.name}" />`
                  : `${hudIconHtml('lock', 20, 'Locked')}`
              }
              <div class="flex flex-col min-w-0">
                <span class="text-[11px] font-black text-white truncate">${inspChibi ? inspChibi.name : 'Celestial Limited'}</span>
                <span class="text-[9.5px] font-bold text-slate-400">${
                  inspChibi && inspChibiEntries[0]
                    ? `${inspChibiEntries[0].rarity.toUpperCase()} Chibi`
                    : 'Coming Soon'
                }</span>
              </div>
            </div>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md ${
              inspChibi ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/35' : 'bg-slate-700/50 text-slate-300 border-white/15'
            } border shrink-0">${inspChibi && inspChibiEntries[0] ? `${inspChibiEntries[0].chancePct}%` : 'Soon'}</span>
          </div>

          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
            <div class="inline-flex items-center gap-2 min-w-0">
              <div class="w-6 h-6 flex items-center justify-center shrink-0 [&>img]:w-5 [&>img]:h-5">${enchantDiceIconHtml(20)}</div>
              <div class="flex flex-col min-w-0">
                <span class="text-[11px] font-black text-white truncate">Enchant Dice + Gems</span>
                <span class="text-[9.5px] font-bold text-slate-400">Bonus meteor reward</span>
              </div>
            </div>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/35 shrink-0">${inspDicePct}%</span>
          </div>
        </div>
      </div>
    `
    : '';

  return `
      <button
        class="group relative flex items-center gap-2.5 @max-[720px]:gap-2 pl-2 pr-3 py-1.5 rounded-2xl border backdrop-blur-xl bg-[rgba(12,16,28,0.84)] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
        style="border-color:${w.accentColor}99;box-shadow:0 0 18px ${w.glowColor}3d,inset 0_1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(0,0,0,0.52)"
        data-action="toggle-weather-info"
        title="${w.name} (${w.chancePct}%): ${w.oreDropMult}x Ore • ${w.gemDropMult}x Gems • ${w.damageMult}x Damage — Click for forecast"
      >
        <div
          class="w-[42px] h-[42px] @max-[720px]:w-[36px] @max-[720px]:h-[36px] rounded-xl shrink-0 flex items-center justify-center border border-white/20 [&>.mam-3d-icon]:w-[38px] [&>.mam-3d-icon]:h-[38px] @max-[720px]:[&>.mam-3d-icon]:w-[32px] @max-[720px]:[&>.mam-3d-icon]:h-[32px]"
          style="background:radial-gradient(circle at 50% 42%,${w.glowColor}55,rgba(15,23,42,0.92) 82%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.25)"
        >
          ${weatherIconHtml(w.id, 38, w.name)}
        </div>
        <div class="flex flex-col items-start min-w-0 leading-none">
          <div class="flex items-center gap-1.5">
            <span class="text-[14px] @max-[720px]:text-[13px] font-black tracking-tight mam-outline-sm" style="color:${w.accentColor}">${w.name}</span>
            <span class="px-1.5 py-[2px] rounded-md bg-white/10 border border-white/15 text-[10px] font-black text-white tabular-nums mam-outline-sm" data-hud-weather-timer="true">${timerTxt}</span>
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
        class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border backdrop-blur-xl cursor-pointer transition-[transform,filter,border-color,background] duration-150 hover:brightness-110 active:scale-[0.97] ${
          state.autoMeteor
            ? 'border-cyan-300/60 bg-[rgba(12,24,42,0.88)] shadow-[0_4px_14px_rgba(34,211,238,0.22)]'
            : 'border-white/15 bg-[rgba(12,16,28,0.82)]'
        }"
        data-action="toggle-auto-meteor"
        aria-pressed="${state.autoMeteor}"
        title="Toggle automatic Meteor spawn on weather change"
      >
        ${meteorIconHtml(w.id, 16, 'Auto Meteor')}
        <span class="text-[11px] font-black text-slate-200 mam-outline-sm">Auto Meteor</span>
        <span class="relative inline-flex items-center w-9 h-[18px] rounded-full transition-colors duration-150 ${
          state.autoMeteor ? 'bg-emerald-500/85' : 'bg-slate-600/85'
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

/** Builds inner HTML for the bottom-left DPS Meter pill and breakdown panel. */
export function buildDpsMeterInnerHtml(state: GameState, dpsMeterOpen: boolean): string {
  const bd = state.getDpsBreakdown();
  const total = bd.totalPlotDps;
  const panelHtml = dpsMeterOpen
    ? `
        <div class="w-[248px] max-w-[calc(100vw-32px)] p-2.5 rounded-2xl border border-cyan-300/35 bg-[rgba(10,15,28,0.9)] backdrop-blur-md shadow-[0_12px_28px_rgba(0,0,0,0.55)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px] font-black text-cyan-200 border-b border-white/10 pb-1">
            <span>⚔️ Damage Breakdown</span>
            <span class="text-amber-300 tabular-nums">Tap: ${fmtShort(bd.tapDamage)}</span>
          </div>
          ${
            bd.units.length > 0
              ? `<div class="flex flex-col gap-1 max-h-[168px] overflow-y-auto mam-no-scrollbar pr-0.5" data-dps-scroll="true">
                  ${bd.units
                    .map((u) => {
                      const pctStr = `${u.pct >= 10 ? Math.round(u.pct) : u.pct.toFixed(1)}%`;
                      const starTag = u.stars > 0 ? ` <span class="text-amber-300">★${u.stars}</span>` : '';
                      return `
                        <button type="button" class="w-full text-left flex flex-col gap-0.5 px-1.5 py-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors" data-dps-inspect-slot="${u.slotIndex}" title="Inspect ${u.name} (Plot ${u.slotIndex + 1})">
                          <div class="flex items-center justify-between text-[11px] font-bold text-slate-100 gap-2">
                            <span class="truncate">${u.name}${starTag}</span>
                            <span class="shrink-0 text-cyan-300 font-extrabold tabular-nums">${fmtShort(u.dps)} <span class="text-slate-400 font-bold">(${pctStr})</span></span>
                          </div>
                          <div class="h-1.5 w-full rounded-full bg-slate-800/90 overflow-hidden">
                            <div class="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#818cf8)]" style="width:${Math.min(100, Math.max(2, u.pct))}%"></div>
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
      <button type="button" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-cyan-300/35 bg-[rgba(10,15,28,0.82)] backdrop-blur-md shadow-[0_6px_16px_rgba(0,0,0,0.45)] text-white text-[12px] font-extrabold tabular-nums cursor-pointer transition-all hover:border-cyan-300/60 hover:brightness-110 mam-outline-sm" data-action="toggle-dps-meter" title="Toggle DPS Breakdown">
        <span class="text-cyan-300">⚔️ ${fmtShort(total)}/s</span>
        <span class="text-slate-400">•</span>
        <span class="text-amber-300">Tap ${fmtShort(bd.tapDamage)}</span>
        <span class="text-[10px] text-slate-400">${dpsMeterOpen ? '▼' : '▲'}</span>
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

  public renderDpsMeterWidget(): string {
    const inner = buildDpsMeterInnerHtml(this.state, this.dpsMeterOpen);
    this.lastDpsMeterHtml = inner;
    return `
      <div class="absolute bottom-[14px] left-4 @max-[860px]:bottom-[78px] @max-[720px]:left-2.5 z-[5] flex flex-col items-start gap-1.5 pointer-events-auto" data-hud-dps="true">
        ${inner}
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
}
