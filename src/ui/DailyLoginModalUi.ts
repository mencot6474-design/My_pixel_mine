import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { GameState } from '../game/GameState';
import { chibiPortraitHtml, rarityCardClasses, rarityVars, renderModalShell, renderRarityBadgeHtml } from './HudShared';

const DAILY_CALENDAR_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <rect x="3" y="5" width="18" height="16" rx="3" fill="#ffffff" stroke="#14111d" stroke-width="2"/>
  <path d="M3 10h18M8 3v4M16 3v4" stroke="#14111d" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 12.6l1.1 2.2 2.4.35-1.75 1.7.42 2.4-2.17-1.15-2.17 1.15.42-2.4-1.75-1.7 2.4-.35L12 12.6Z" fill="#a855f7" stroke="#14111d" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

export class DailyLoginModalUi {
  constructor(
    private readonly state: GameState,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly requestRender: () => void = () => undefined
  ) {}

  public renderModal(): string {
    const snap = this.state.getDailyLoginSnapshot();
    const claimedSet = new Set(snap.claimedDays);

    const cardsHtml = snap.rewards
      .map((r) => {
        const isClaimed = claimedSet.has(r.day);
        const isNext = snap.nextDay === r.day;
        const isClaimable = isNext && snap.canClaim;
        const chibi = r.chibiId ? getChibiById(r.chibiId) : undefined;
        const isApexDay = r.day === 7;

        const portraitSizeCls = isApexDay ? 'w-[68px] h-[68px] shrink-0' : 'w-[62px] h-[62px] mx-auto';
        const portraitHtml = chibi
          ? `<div class="${portraitSizeCls} flex items-center justify-center overflow-hidden">${chibiPortraitHtml(chibi, { usePose: true, draggable: false })}</div>`
          : `<div class="${portraitSizeCls} flex items-center justify-center rounded-xl bg-[#090d1c] border border-slate-700/80 text-slate-500 text-[24px] font-black select-none">?</div>`;

        const spanClass = isApexDay ? 'col-span-2 sm:col-span-3' : '';
        const layoutClass = isApexDay
          ? `${spanClass} !h-auto !aspect-auto !px-3.5 !py-2 !rounded-2xl !flex-row items-center !justify-between gap-3 text-left relative`
          : `${spanClass} !h-auto !aspect-auto !p-2 !rounded-2xl flex flex-col items-center gap-1 text-center relative`;
        const cardCls = chibi
          ? `${rarityCardClasses(chibi.rarity, `${layoutClass} ${isClaimed ? 'opacity-80' : ''}`.trim())}`
          : `${spanClass} ${isApexDay ? 'px-3.5 py-2 flex-row items-center justify-between gap-3 text-left' : 'p-2 flex-col items-center gap-1 text-center'} rounded-2xl border-2 border-[#2b385a] bg-[#10172b] opacity-85 flex relative`;
        const cardStyle = chibi ? `style="${rarityVars(chibi.rarity)}"` : '';

        const statusBadge = isClaimed
          ? `<span class="px-2 py-0.5 rounded-md bg-[#2ee59d] border border-[#14111d] text-[#14111d] text-[10px] font-black uppercase">Claimed</span>`
          : isClaimable
            ? `<span class="px-2 py-0.5 rounded-md bg-[#ff4d2e] border border-[#14111d] text-white text-[10px] font-black uppercase animate-pulse">Ready!</span>`
            : chibi
              ? `<span class="px-2 py-0.5 rounded-md bg-[#e9d5ff] border border-[#14111d] text-[#14111d] text-[10px] font-black uppercase">Tomorrow</span>`
              : `<span class="px-2 py-0.5 rounded-md bg-[#e2e8f0] border border-[#14111d] text-[#5b526e] text-[10px] font-black uppercase">Soon</span>`;

        const rarityHtml = chibi ? renderRarityBadgeHtml(chibi.rarity) : '';

        if (isApexDay) {
          return `
            <div class="${cardCls}" ${cardStyle}>
              ${portraitHtml}
              <div class="flex-1 min-w-0 flex flex-col gap-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2 py-0.5 rounded-md bg-[#14111d] text-[11px] font-black text-[#fde047] tabular-nums">DAY ${r.day} • APEX FINALE</span>
                  ${statusBadge}
                </div>
                <div class="flex items-baseline justify-between gap-2 min-w-0">
                  <div class="text-[14px] font-black text-[#14111d] leading-tight truncate">${r.label}</div>
                  <div class="text-[10px] font-bold text-[#5b526e] leading-tight shrink-0">${r.nonSellable ? 'Non-Sellable' : r.subtitle}</div>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="inline-flex items-center px-2 py-[2px] rounded-full bg-[#14111d] text-[#fde047] text-[10px] font-black tracking-[0.12em]">★★★★★</span>
                  ${rarityHtml}
                </div>
              </div>
            </div>
          `;
        }

        return `
          <div class="${cardCls}" ${cardStyle}>
            <div class="w-full flex items-center justify-between gap-1">
              <span class="px-2 py-0.5 rounded-md bg-[#14111d] text-[11px] font-black text-[#fff8e7] tabular-nums">DAY ${r.day}</span>
              ${statusBadge}
            </div>
            ${portraitHtml}
            <div class="text-[12px] font-black text-[#14111d] leading-tight truncate w-full">${r.label}</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <span class="inline-flex items-center px-2 py-[1px] rounded-full bg-[#14111d] text-[#fde047] text-[9.5px] font-black tracking-[0.12em]">★★★★★</span>
              ${rarityHtml}
            </div>
            <div class="text-[10px] font-bold text-[#5b526e] leading-tight">${r.nonSellable ? 'Non-Sellable' : r.subtitle}</div>
          </div>
        `;
      })
      .join('');

    const nextReward = snap.nextDay ? snap.rewards.find((r) => r.day === snap.nextDay) : undefined;
    const actionAreaHtml = snap.canClaim && nextReward
      ? `<button
          type="button"
          class="w-full py-2.5 px-4 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] text-[#14111d] text-[14px] font-black uppercase tracking-wider cursor-pointer transition-[transform,filter] duration-150 hover:scale-[0.98] active:scale-[0.95]"
          data-action="claim-daily-login"
        >
          ✦ Claim Day ${nextReward.day}: ${nextReward.label} (5★)
        </button>`
      : `<div class="w-full py-2 px-3 rounded-xl border-2 border-[#14111d] bg-[#fcecc8] text-center text-[12px] font-black text-[#5b526e]">
          ${snap.claimedDays.length >= 7 && !snap.nextDay ? 'All 7 Daily Login Limited Chibis claimed!' : 'Already claimed today — come back tomorrow!'}
        </div>`;

    const headerExtraHtml = `
      <span class="px-3 py-1 rounded-xl bg-[#e9d5ff] border-2 border-[#14111d] text-[12px] font-black text-[#14111d] tabular-nums">
        Claimed: ${snap.claimedDays.length} / 7
      </span>
    `;

    const bodyHtml = `
      <div class="w-full flex-1 min-h-0 flex flex-col gap-2.5">
        <div class="shrink-0 px-3 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#ffffff] text-[12px] font-bold text-[#14111d] text-left">
          Claim exclusive <span class="text-[#b45309] font-black">5★ Full-Star Limited Chibis</span> every day! Limited Chibis start at Max 5★ and <span class="text-[#dc2626] font-black">cannot be sold</span>.
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain mam-no-scrollbar p-0.5">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${cardsHtml}
          </div>
        </div>
        <div class="shrink-0 pt-0.5 relative z-10">
          ${actionAreaHtml}
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Daily Login',
      theme: 'daily-login',
      iconHtml: DAILY_CALENDAR_SVG,
      boxClass: 'w-[580px] max-w-[95%]',
      autoHeight: true,
      headerExtraHtml,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    const claimBtn = root.querySelector<HTMLElement>('[data-action="claim-daily-login"]');
    if (!claimBtn) return;
    claimBtn.addEventListener('click', () => {
      const reward = this.state.claimDailyLogin();
      if (!reward) return;
      audio.playSfx('coin-alt', { volume: 0.75 });
      this.pushToast(`Claimed Limited 5★ ${reward.label}!`);
      this.requestRender();
    });
  }
}
