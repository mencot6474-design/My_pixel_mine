import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { enchantDiceIconHtml, hudIconHtml } from './HudIcons';
import { renderModalShell } from './HudShared';

const SCROLL_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z" stroke="#6ee7b7" stroke-width="1.9" stroke-linejoin="round"/>
  <path d="M8.5 9h7M8.5 13h7M8.5 17h4.5" stroke="#a7f3d0" stroke-width="1.9" stroke-linecap="round"/>
</svg>`;

export class BountiesModalUi {
  constructor(
    private readonly state: GameState,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly requestRender: () => void = () => undefined
  ) {}

  public renderModal(): string {
    const cardsHtml = this.state.bounties
      .map((b) => {
        const pct = Math.max(0, Math.min(100, Math.round((b.progress / Math.max(1, b.target)) * 100)));
        const ready = b.progress >= b.target;

        const rewardHtml =
          b.rewardKind === 'gems'
            ? `<span class="inline-flex items-center gap-1 text-sky-200">${hudIconHtml('gem', 16, 'Gems')} +${fmtInt(b.rewardAmount)}</span>`
            : b.rewardKind === 'dice'
              ? `<span class="inline-flex items-center gap-1 text-purple-200">${enchantDiceIconHtml(16)} +${fmtInt(b.rewardAmount)} Dice</span>`
              : `<span class="text-[#4ade80]">+${fmtMoney(b.rewardAmount)}</span>`;

        const actionBtn = ready
          ? `<button
              type="button"
              class="min-w-[92px] px-3.5 py-2 rounded-xl border border-[#4ade80]/75 bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_-2px_rgba(34,197,94,0.5)] text-white text-[13px] font-black uppercase tracking-wide cursor-pointer transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.96] mam-outline-sm"
              data-bounty-claim="${b.id}"
            >
              Claim
            </button>`
          : `<span class="min-w-[92px] text-center px-3 py-2 rounded-xl border border-[#2a3b5c] bg-[#162038] text-slate-400 text-[12px] font-extrabold uppercase tracking-wide">
              In Progress
            </span>`;

        const cardBorder = ready ? 'border-emerald-400 bg-[#0f2920]' : 'border-[#253654] bg-[#111a2e]';
        const barFill = ready
          ? 'bg-[linear-gradient(90deg,#22c55e,#4ade80)]'
          : 'bg-[linear-gradient(90deg,#0284c7,#38bdf8)]';

        return `
          <div class="p-3.5 rounded-2xl border-2 ${cardBorder} flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0 flex flex-col gap-1.5 text-left">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="text-[14px] font-black text-white leading-tight">${b.title}</span>
                <span class="text-[12px] font-black tabular-nums px-2 py-0.5 rounded-lg bg-[#090f1d] border border-[#2a3b5c]">${rewardHtml}</span>
              </div>
              <div class="relative w-full h-3 rounded-full bg-[#090e1a] border border-[#253654] overflow-hidden">
                <div class="h-full ${barFill} transition-[width] duration-200 ease-out" style="width:${pct}%"></div>
              </div>
              <div class="flex items-center justify-between text-[11px] font-extrabold text-slate-300 tabular-nums">
                <span>${fmtInt(b.progress)} / ${fmtInt(b.target)}</span>
                <span>${pct}%</span>
              </div>
            </div>
            ${actionBtn}
          </div>
        `;
      })
      .join('');

    const headerExtraHtml = `
      <span class="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-[12px] font-black text-emerald-200 tabular-nums">
        Completed: ${fmtInt(this.state.bountiesCompleted)}
      </span>
    `;

    const bodyHtml = `
      <div class="w-full flex flex-col gap-2.5">
        <div class="text-[12px] font-bold text-slate-300 text-left">
          Complete active contracts to earn Gems, Enchant Dice & Cash. Claimed slots refresh automatically!
        </div>
        ${cardsHtml}
      </div>
    `;

    return renderModalShell({
      title: 'Mining Bounties',
      theme: 'bounties',
      iconHtml: SCROLL_ICON_SVG,
      boxClass: 'w-[540px] max-w-[95%]',
      autoHeight: true,
      headerExtraHtml,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-bounty-claim]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.bountyClaim;
        if (!id) return;
        const res = this.state.claimBounty(id);
        if (!res) return;
        audio.playSfx('coin-alt', { volume: 0.65 });
        const rewardText =
          res.rewardKind === 'gems'
            ? `+${fmtInt(res.rewardAmount)} Gems`
            : res.rewardKind === 'dice'
              ? `+${fmtInt(res.rewardAmount)} Enchant Dice`
              : `+${fmtMoney(res.rewardAmount)}`;
        this.pushToast(`Bounty Claimed: ${rewardText}!`);
        this.requestRender();
      });
    });
  }
}
