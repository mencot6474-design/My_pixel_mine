import { assetUrl } from '../game/AssetUrl';
import { GameState } from '../game/GameState';
import { fmtInt, fmtPct, fmtShort } from '../game/NumberFormat';
import { getOmegaBossById, OMEGA_BREAK_DMG_MULT } from '../game/OmegaData';
import { getChibiById } from '../game3d/ChibiCatalog';

const SVG_RETREAT = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M8.5 4.5L3 10l5.5 5.5M4 10h11.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_TIMER = `<svg viewBox="0 0 18 18" width="14" height="14" fill="none" aria-hidden="true"><circle cx="9" cy="10" r="6" stroke="currentColor" stroke-width="2"/><path d="M7 2.5h4M9 7v3.2l2 1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const SVG_ARMOR_SHIELD = `<svg viewBox="0 0 18 18" width="13" height="13" fill="none" aria-hidden="true"><path d="M9 2L15 4.5V9c0 3.6-2.5 6-6 7-3.5-1-6-3.4-6-7V4.5L9 2Z" fill="#e879f9" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const SVG_BARRIER = `<svg viewBox="0 0 18 18" width="13" height="13" fill="none" aria-hidden="true"><polygon points="9,2 15,5.5 15,12.5 9,16 3,12.5 3,5.5" fill="#7dd3fc" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const SVG_CLASH_BLADES = `<svg viewBox="0 0 22 22" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 17L16.5 4.5M18 17L5.5 4.5" stroke="#14111d" stroke-width="3.6" stroke-linecap="round"/><path d="M4 17L16.5 4.5M18 17L5.5 4.5" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="11" r="2.8" fill="#ffffff" stroke="#14111d" stroke-width="1.4"/></svg>`;
const SVG_TARGET_RETICLE = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="#ef4444" stroke-width="2.1"/><circle cx="10" cy="10" r="2.2" fill="#ef4444"/><path d="M10 1.8v2.6M10 15.6v2.6M1.8 10h2.6M15.6 10h2.6" stroke="#14111d" stroke-width="2" stroke-linecap="round"/></svg>`;
const SVG_BREAK_BOLT = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><polygon points="11,1.5 4,11 9.5,11 8.5,18.5 16,8.5 10.5,8.5" fill="#fde047" stroke="#14111d" stroke-width="1.7" stroke-linejoin="round"/></svg>`;

export class OmegaArenaHudUi {
  constructor(
    private readonly state: GameState,
    private readonly onExitOmega: () => void,
    private readonly onTriggerParry: () => void
  ) {}

  public renderOmegaArenaHud(): string {
    const battle = this.state.omegaBattle;
    if (!battle) return '';
    const boss = getOmegaBossById(battle.bossId);
    const chibi = boss ? getChibiById(boss.chibiId) : undefined;
    const hpPct = Math.max(0, Math.min(100, (battle.hp / Math.max(1, battle.maxHp)) * 100));
    const isBreak = battle.breakRemainingSec > 0;
    const hasArmor =
      battle.bossId === 'obsidian-sovereign' &&
      !isBreak &&
      battle.targets.some((t) => t.kind === 'obsidian_pillar');
    const squadDps = this.state.getOmegaSquadEffectiveDps();
    const timerDanger = battle.timeRemainingSec <= 10;
    const barFillBg = isBreak
      ? 'linear-gradient(90deg, #f59e0b 0%, #fde047 50%, #fb923c 100%)'
      : battle.bossId === 'obsidian-sovereign'
        ? 'linear-gradient(90deg, #9333ea 0%, #c084fc 52%, #e879f9 100%)'
        : 'linear-gradient(90deg, #dc2626 0%, #ef4444 52%, #fb7185 100%)';

    const emblemHtml = chibi
      ? `<img src="${assetUrl(chibi.poses.pose)}" alt="${boss?.name ?? 'Boss'}" class="w-full h-full object-contain" />`
      : SVG_CLASH_BLADES;

    const tacticalCallout = isBreak
      ? {
          icon: SVG_BREAK_BOLT,
          pillBg: 'bg-[#fef08a]',
          text: `OMEGA BREAK ACTIVE — ALL ATTACKS DEAL ${OMEGA_BREAK_DMG_MULT}× DMG!`,
        }
      : battle.targets.length > 0
        ? {
            icon: SVG_TARGET_RETICLE,
            pillBg: 'bg-[#ffe4e6]',
            text: `Click floating Targets (${battle.targets.length} active) to shatter & charge Stagger!`,
          }
        : battle.bossId === 'crimson-ronin'
          ? {
              icon: SVG_CLASH_BLADES,
              pillBg: 'bg-[#e0f2fe]',
              text: 'Watch for shrinking golden Parry Rings to counter-slash & build Stagger!',
            }
          : {
              icon: SVG_ARMOR_SHIELD,
              pillBg: 'bg-[#f3e8ff]',
              text: 'Shatter Obsidian Pillars & Rune Seals to crack Boss Armor & fill Stagger!',
            };

    return `
      <div class="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3.5 @max-[720px]:p-2.5">
        <div class="flex items-start justify-between gap-3">
          <button
            class="pointer-events-auto mam-battle-exit-btn shrink-0"
            data-omega-exit="true"
            title="Retreat without losing a Boss Key"
          >
            ${SVG_RETREAT}
            <span>Retreat (0 Key Lost)</span>
          </button>

          <div class="flex-1 max-w-[560px] mx-auto pointer-events-none @max-[920px]:max-w-[440px]">
            <div class="mam-battle-hp-card ${isBreak ? 'is-exposed' : 'is-boss'} flex flex-col gap-2" data-omega-hp-card="true">
              <div class="w-full flex items-center justify-between gap-2 flex-wrap">
                <div class="inline-flex items-center gap-2.5 min-w-0">
                  <span class="mam-battle-emblem shrink-0 overflow-hidden p-0.5">${emblemHtml}</span>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="mam-pill-xs bg-[#14111d] text-[#fde047]">TIER ${battle.tier}</span>
                      <span class="mam-pill-xs bg-white text-[#b91c1c] border-[1.5px] border-[#14111d]">OMEGA RAID</span>
                      ${hasArmor ? `<span class="mam-pill-xs bg-[#f5d0fe] text-[#701a75] inline-flex items-center gap-1" data-omega-armor-pill>${SVG_ARMOR_SHIELD}<span>-60% Armor</span></span>` : ''}
                      ${battle.barrierHp > 0 ? `<span class="mam-pill-xs bg-[#bae6fd] text-[#0369a1] inline-flex items-center gap-1" data-omega-barrier-pill>${SVG_BARRIER}<span>Shield ${fmtShort(battle.barrierHp)}</span></span>` : ''}
                    </div>
                    <div class="mt-0.5 flex items-center gap-1.5 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0 ${isBreak ? 'bg-[#f59e0b] animate-ping' : 'bg-[#dc2626] animate-pulse'}"></span>
                      <span class="text-[14px] font-black uppercase tracking-wide truncate text-[#14111d]">${boss?.name ?? battle.bossId}</span>
                    </div>
                  </div>
                </div>

                <span
                  class="mam-tower-status-pill shrink-0 tabular-nums ${
                    timerDanger ? 'bg-[#fecdd3] text-[#881337] animate-pulse' : 'bg-[#fff8e7] text-[#14111d]'
                  }"
                  data-omega-timer
                >${SVG_TIMER}<span data-omega-timer-val>${Math.ceil(battle.timeRemainingSec)}s</span></span>
              </div>

              <div class="mam-battle-hp-track">
                <div class="mam-battle-hp-fill" data-omega-hp-bar style="width:${hpPct.toFixed(2)}%;background-image:${barFillBg}"></div>
                <div class="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-[1]"></div>
                <div class="mam-battle-hp-ticks" aria-hidden="true">
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div class="relative z-[2] text-[13px] font-black tabular-nums text-white mam-outline-sm" data-omega-hp-text>
                  ${fmtShort(battle.hp)} / ${fmtShort(battle.maxHp)} (${fmtPct(hpPct)})
                </div>
              </div>

              <div class="w-full h-4 rounded-lg border-2 border-[#14111d] bg-[#1e1b2e] overflow-hidden relative flex items-center justify-center">
                <div
                  class="absolute left-0 top-0 bottom-0 transition-[width] duration-75 ${isBreak ? 'bg-[linear-gradient(90deg,#fde047,#f59e0b)]' : 'bg-[linear-gradient(90deg,#0284c7,#38bdf8)]'}"
                  data-omega-stagger-bar
                  style="width:${isBreak ? 100 : Math.min(100, battle.staggerPct)}%"
                ></div>
                <div class="relative z-[2] inline-flex items-center gap-1 text-[10px] font-black tracking-wide text-white mam-outline-sm tabular-nums" data-omega-stagger-text>
                  ${isBreak ? `⚡ OMEGA BREAK! ${OMEGA_BREAK_DMG_MULT}× DMG (${battle.breakRemainingSec.toFixed(1)}s)` : `STAGGER ${Math.round(battle.staggerPct)}%`}
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 shrink-0 @max-[720px]:hidden">
            <div class="bg-[#fff8e7] border-[2.5px] border-[#14111d] rounded-xl px-3 py-1.5 flex flex-col items-end">
              <span class="text-[9.5px] font-black uppercase tracking-wider text-[#0369a1]">Squad DPS</span>
              <span class="text-[13.5px] font-black tabular-nums text-[#14111d]">${fmtShort(squadDps)}/s</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <div class="bg-[#fef08a] border-2 border-[#14111d] rounded-xl px-2 py-1 flex flex-col items-center">
                <span class="text-[8.5px] font-black uppercase text-[#854d0e]">Parries</span>
                <span class="text-[12px] font-black tabular-nums text-[#14111d]" data-omega-parries-count>${fmtInt(battle.parriesLanded)}</span>
              </div>
              <div class="bg-[#e0f2fe] border-2 border-[#14111d] rounded-xl px-2 py-1 flex flex-col items-center">
                <span class="text-[8.5px] font-black uppercase text-[#0369a1]">Shatter</span>
                <span class="text-[12px] font-black tabular-nums text-[#14111d]" data-omega-shatter-count>${fmtInt(battle.targetsShattered)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-2 mb-1">
          ${
            battle.parryWindow.active && !battle.parryWindow.consumed
              ? `<button class="pointer-events-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border-[3px] border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] text-[15px] font-black cursor-pointer animate-bounce" data-omega-parry-btn="true">${SVG_CLASH_BLADES}<span>PARRY NOW! (+8% HP &amp; +25% Stagger)</span></button>`
              : ''
          }
          <div class="inline-flex items-center gap-2 bg-[#fff8e7] border-[2.5px] border-[#14111d] rounded-2xl px-3.5 py-1.5 text-[11.5px] font-black text-[#14111d] shadow-none" data-omega-tactical-bar>
            <span class="w-6 h-6 rounded-lg border-2 border-[#14111d] ${tacticalCallout.pillBg} flex items-center justify-center shrink-0">${tacticalCallout.icon}</span>
            <span>${tacticalCallout.text}</span>
          </div>
        </div>
      </div>
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const battle = this.state.omegaBattle;
    if (!battle) return;
    const hpPct = Math.max(0, Math.min(100, (battle.hp / Math.max(1, battle.maxHp)) * 100));
    const isBreak = battle.breakRemainingSec > 0;

    const timerVal = root.querySelector<HTMLElement>('[data-omega-timer-val]');
    if (timerVal) timerVal.textContent = `${Math.ceil(battle.timeRemainingSec)}s`;

    const hpBar = root.querySelector<HTMLElement>('[data-omega-hp-bar]');
    if (hpBar) hpBar.style.width = `${hpPct.toFixed(2)}%`;

    const hpText = root.querySelector<HTMLElement>('[data-omega-hp-text]');
    if (hpText) hpText.textContent = `${fmtShort(battle.hp)} / ${fmtShort(battle.maxHp)} (${fmtPct(hpPct)})`;

    const stagBar = root.querySelector<HTMLElement>('[data-omega-stagger-bar]');
    if (stagBar) {
      stagBar.style.width = `${isBreak ? 100 : Math.min(100, battle.staggerPct)}%`;
    }

    const stagText = root.querySelector<HTMLElement>('[data-omega-stagger-text]');
    if (stagText) {
      stagText.textContent = isBreak
        ? `⚡ OMEGA BREAK! ${OMEGA_BREAK_DMG_MULT}× DMG (${battle.breakRemainingSec.toFixed(1)}s)`
        : `STAGGER ${Math.round(battle.staggerPct)}%`;
    }

    const parriesEl = root.querySelector<HTMLElement>('[data-omega-parries-count]');
    if (parriesEl) parriesEl.textContent = fmtInt(battle.parriesLanded);

    const shatterEl = root.querySelector<HTMLElement>('[data-omega-shatter-count]');
    if (shatterEl) shatterEl.textContent = fmtInt(battle.targetsShattered);
  }

  public bindArenaEvents(root: HTMLElement): void {
    root.querySelector<HTMLElement>('[data-omega-exit]')?.addEventListener('click', () => {
      this.onExitOmega();
    });
    root.querySelector<HTMLElement>('[data-omega-parry-btn]')?.addEventListener('click', () => {
      this.onTriggerParry();
    });
  }
}
