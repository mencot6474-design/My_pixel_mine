import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney } from '../game/NumberFormat';
import { formatOfflineDuration } from '../game/OfflineEarningsDomain';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { hudIconHtml } from './HudIcons';
import { renderModalShell } from './HudShared';

const CLOCK_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="#fde047" stroke-width="2"/>
  <path d="M12 7v5l3.2 2" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export class OfflineModalUi {
  private claimingAd = false;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (msg: string) => void = () => undefined,
    private readonly closeModal: () => void = () => undefined,
    private readonly adsEnabled: boolean = CG_ADS_ENABLED
  ) {}

  public renderModal(): string {
    const summary = this.state.pendingOfflineEarnings;
    if (!summary) return '';

    const durStr = formatOfflineDuration(summary.elapsedSec);
    const capBadge = summary.capped
      ? `<span class="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-300/50 text-[10px] font-black uppercase text-amber-200">Max 8h</span>`
      : '';

    const oresRow =
      summary.totalBonusOres > 0
        ? `
          <div class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300">Chest Ores</span>
            <span class="text-[18px] font-black tabular-nums text-sky-300 mam-outline-sm">+${fmtInt(summary.totalBonusOres)}</span>
          </div>
        `
        : '';

    const gridCols = summary.totalBonusOres > 0 ? 'grid-cols-3' : 'grid-cols-2';
    const adBtnHtml = this.adsEnabled
      ? `
        <button
          type="button"
          class="flex-1 py-3 px-4 rounded-xl border border-amber-300/75 bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_-4px_rgba(245,158,11,0.5)] text-white text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm"
          data-offline-claim="2"
        >
          2x Claim (Watch Ad)
        </button>
      `
      : '';

    const bodyHtml = `
      <div class="w-full flex flex-col gap-3.5 text-center">
        <div class="mam-inspector-well p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
          <div class="text-[12px] font-extrabold uppercase tracking-wider text-amber-200/90">
            Your Chibis kept mining in ${summary.worldName}!
          </div>
          <div class="flex items-center justify-center gap-2">
            <span class="text-[22px] font-black tabular-nums text-white mam-outline-sm">${durStr}</span>
            ${capBadge}
          </div>
          <div class="text-[12px] font-bold text-slate-300 tabular-nums">
            ~${fmtInt(summary.oresBroken)} ores mined while away
          </div>
        </div>

        <div class="grid ${gridCols} gap-2">
          <div class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300">Cash</span>
            <span class="text-[18px] font-black tabular-nums text-[#4ade80] mam-outline-sm">+${fmtMoney(summary.cash)}</span>
          </div>
          <div class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300">Gems</span>
            <span class="inline-flex items-center gap-1 text-[18px] font-black tabular-nums text-sky-200 mam-outline-sm">
              ${hudIconHtml('gem', 18, 'Gems')} +${fmtInt(summary.gems)}
            </span>
          </div>
          ${oresRow}
        </div>

        <div class="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-xl border border-[#4ade80]/70 bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_-4px_rgba(34,197,94,0.45)] text-white text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm"
            data-offline-claim="1"
          >
            Claim
          </button>
          ${adBtnHtml}
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Welcome Back!',
      theme: 'offline',
      iconHtml: CLOCK_ICON_SVG,
      boxClass: 'w-[480px] max-w-[94%]',
      autoHeight: true,
      bodyHtml,
    });
  }

  public bindEvents(root: HTMLElement): void {
    const finishClaim = (mult: 1 | 2): void => {
      const res = this.state.claimOfflineEarnings(mult);
      if (res) {
        audio.playSfx('coin-alt', { volume: 0.65 });
        const extras = [
          `+${fmtMoney(res.cash)}`,
          res.gems > 0 ? `+${fmtInt(res.gems)} Gems` : null,
          res.totalOresAdded > 0 ? `+${fmtInt(res.totalOresAdded)} Ores` : null,
        ].filter(Boolean);
        this.pushToast(`${mult === 2 ? '2x ' : ''}Offline Reward: ${extras.join(' • ')}`);
      }
      this.closeModal();
    };

    root.querySelector<HTMLElement>('[data-offline-claim="1"]')?.addEventListener('click', () => {
      if (this.claimingAd) return;
      finishClaim(1);
    });

    root.querySelector<HTMLElement>('[data-offline-claim="2"]')?.addEventListener('click', () => {
      if (this.claimingAd) return;
      this.claimingAd = true;
      cgRequestRewardedAd(
        () => {
          this.claimingAd = false;
          finishClaim(2);
        },
        () => {
          this.claimingAd = false;
          this.pushToast('Ad unavailable right now — try Claim instead!');
        }
      );
    });
  }
}
