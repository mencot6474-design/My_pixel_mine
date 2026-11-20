import { audio } from '../audio/AudioManager';
import {
  ACHIEVEMENT_CATEGORIES,
  AchievementCategoryDef,
  getAchievementProgressValue,
  getActiveAchievementTierForCategory,
  TOTAL_ACHIEVEMENT_TIERS,
} from '../game/AchievementsDomain';
import { assetUrl } from '../game/AssetUrl';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import { enchantDiceIconHtml, hudIconHtml, pickaxeIconHtml } from './HudIcons';
import { renderModalShell, TW_TAB_BTN } from './HudShared';

type AchievementsTab = 'achievements' | 'stats';

const TIER_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'] as const;

const TIER_MEDAL_STYLE: Record<
  1 | 2 | 3 | 4 | 5,
  { ring: string; bg: string; badge: string; rail: string }
> = {
  1: {
    ring: 'border-[#cd7f32]/85 shadow-[0_0_12px_rgba(205,127,50,0.35)]',
    bg: 'bg-[radial-gradient(circle_at_50%_40%,#3f2614,#120d0a_82%)]',
    badge: 'bg-[#7c4a1d] border-[#f59e0b]/60 text-[#fde68a]',
    rail: 'bg-[linear-gradient(90deg,#b45309,#f59e0b)]',
  },
  2: {
    ring: 'border-[#cbd5e1]/85 shadow-[0_0_12px_rgba(203,213,225,0.35)]',
    bg: 'bg-[radial-gradient(circle_at_50%_40%,#2a3547,#0e131d_82%)]',
    badge: 'bg-[#475569] border-[#e2e8f0]/60 text-white',
    rail: 'bg-[linear-gradient(90deg,#94a3b8,#e2e8f0)]',
  },
  3: {
    ring: 'border-[#facc15]/90 shadow-[0_0_16px_rgba(250,204,21,0.45)]',
    bg: 'bg-[radial-gradient(circle_at_50%_40%,#42320d,#141008_82%)]',
    badge: 'bg-[#a16207] border-[#fde047]/80 text-[#fef9c3]',
    rail: 'bg-[linear-gradient(90deg,#eab308,#fde047,#f97316)]',
  },
  4: {
    ring: 'border-[#38bdf8]/95 shadow-[0_0_18px_rgba(56,189,248,0.5)]',
    bg: 'bg-[radial-gradient(circle_at_50%_40%,#10334f,#081220_82%)]',
    badge: 'bg-[#0369a1] border-[#7dd3fc]/85 text-[#e0f2fe]',
    rail: 'bg-[linear-gradient(90deg,#0ea5e9,#38bdf8,#818cf8)]',
  },
  5: {
    ring: 'border-[#e879f9]/95 shadow-[0_0_20px_rgba(232,121,249,0.55)]',
    bg: 'bg-[radial-gradient(circle_at_50%_40%,#3d154f,#10091c_82%)]',
    badge: 'bg-[linear-gradient(135deg,#a855f7,#ec4899)] border-[#f5d0fe]/85 text-white',
    rail: 'bg-[linear-gradient(90deg,#38bdf8,#c084fc,#f472b6,#facc15)]',
  },
};

export class AchievementsModalUi {
  private activeTab: AchievementsTab = 'achievements';

  constructor(
    private readonly state: GameState,
    private readonly onRequestRender: () => void,
    private readonly onToast: (msg: string) => void
  ) {}

  private renderCategoryArt(iconKind: AchievementCategoryDef['iconKind']): string {
    switch (iconKind) {
      case 'pickaxe':
        return pickaxeIconHtml('starwellcrown', 38);
      case 'crit':
        return `
          <svg class="w-9 h-9 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M14 1.5L17.2 9.4L25.5 7.5L19.6 13.8L26.5 18.5L17.6 18.6L14 26.5L10.4 18.6L1.5 18.5L8.4 13.8L2.5 7.5L10.8 9.4L14 1.5Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M14 5.5L16.1 11.1L21.8 11.4L17.1 14.9L18.8 20.5L14 17.2L9.2 20.5L10.9 14.9L6.2 11.4L11.9 11.1L14 5.5Z" fill="#fffbeb"/>
          </svg>
        `;
      case 'overclock':
        return hudIconHtml('sparkle', 36, 'Overclock');
      case 'index':
        return hudIconHtml('indexBook', 36, 'Index');
      case 'tower':
        return `<img src="${assetUrl('hud/tower_boss.webp')}" alt="Tower" class="w-9 h-9 object-contain" draggable="false" />`;
      case 'relic':
        return `<img src="${assetUrl('relics/miner_lantern.webp')}" alt="Relic" class="w-9 h-9 object-contain" draggable="false" />`;
      case 'bounty':
        return hudIconHtml('quest', 36, 'Bounty');
      case 'world':
        return `<img src="${assetUrl('worlds/astral.webp')}" alt="World" class="w-9 h-9 rounded-lg object-cover border border-white/25" draggable="false" />`;
    }
  }

  private renderAchievementsGrid(): string {
    const snap = this.state.getAchievementSnapshot();
    return `
      <div class="grid grid-cols-2 @max-[720px]:grid-cols-1 gap-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
        ${ACHIEVEMENT_CATEGORIES.map((cat) => {
          const activeTier = getActiveAchievementTierForCategory(cat, this.state.claimedAchievements);
          const allDone = this.state.claimedAchievements.has(activeTier.id);
          const val = getAchievementProgressValue(snap, cat.id);
          const pct = Math.min(100, Math.round((val / Math.max(1, activeTier.target)) * 100));
          const ready = !allDone && val >= activeTier.target;
          const style = TIER_MEDAL_STYLE[activeTier.tier];

          const cardBorder = allDone
            ? 'border-[#22c55e]/50 bg-[#0d1c19]'
            : ready
              ? 'border-[#facc15]/85 bg-[#1b1811] shadow-[0_0_16px_rgba(250,204,21,0.24)]'
              : 'border-white/14 bg-[#0d1323]';

          const actionHtml = allDone
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14532d]/80 border border-[#4ade80]/60 text-[#86efac] text-[11px] font-black shrink-0">✓ Maxed</span>`
            : ready
              ? `<button type="button" class="mam-sheen-hover relative overflow-hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#fde047] bg-[linear-gradient(135deg,#eab308_0%,#f97316_100%)] text-white text-[12px] font-black cursor-pointer shrink-0 shadow-[0_4px_14px_rgba(234,179,8,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-95 transition-[transform,filter] mam-outline-sm" data-claim-achievement="${activeTier.id}">${hudIconHtml('sparkle', 13, 'Claim')}Claim</button>`
              : `<span class="px-2.5 py-1 rounded-lg bg-[#131b2e] border border-white/12 text-[#94a3b8] text-[11px] font-black shrink-0 tabular-nums">${fmtShort(Math.min(val, activeTier.target))}/${fmtShort(activeTier.target)}</span>`;

          return `
            <div class="relative overflow-hidden rounded-2xl border ${cardBorder} p-3 flex items-center gap-3">
              <div class="absolute top-0 left-0 right-0 h-[2.5px] ${allDone ? 'bg-[linear-gradient(90deg,#22c55e,#4ade80)]' : style.rail}" aria-hidden="true"></div>
              <div class="relative w-14 h-14 rounded-2xl border-2 ${style.ring} ${style.bg} flex items-center justify-center shrink-0">
                ${this.renderCategoryArt(cat.iconKind)}
                <span class="absolute -bottom-1.5 -right-1.5 px-1.5 py-[1px] rounded-md border text-[10px] font-black leading-tight ${style.badge}">${TIER_ROMAN[activeTier.tier]}</span>
              </div>

              <div class="min-w-0 flex-1 flex flex-col gap-1.5 text-left">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-[14px] font-black text-white truncate mam-outline-sm">${cat.title} ${TIER_ROMAN[activeTier.tier]}</div>
                    <div class="text-[11px] font-bold text-[#94a3b8] truncate">${cat.description}</div>
                  </div>
                  ${actionHtml}
                </div>

                <div class="w-full h-2 rounded-full bg-black/55 border border-white/10 overflow-hidden">
                  <div class="h-full rounded-full transition-[width] duration-300 ${allDone ? 'bg-[linear-gradient(90deg,#22c55e,#4ade80)]' : style.rail}" style="width:${allDone ? 100 : pct}%"></div>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#111c33] border border-[#38bdf8]/30 text-[#bae6fd] text-[10px] font-black tabular-nums">${hudIconHtml('gem', 12, 'Gems')}+${fmtShort(activeTier.gems)}</span>
                  ${
                    activeTier.enchantDice > 0
                      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1f1333] border border-[#c084fc]/35 text-[#e9d5ff] text-[10px] font-black tabular-nums">${enchantDiceIconHtml(13)}+${activeTier.enchantDice}</span>`
                      : ''
                  }
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#26160e] border border-[#fb923c]/35 text-[#fdba74] text-[10px] font-black">+1% All DMG</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderCareerStatsGrid(): string {
    const stats = this.state.careerStats;
    const claimedCount = this.state.claimedAchievements.size;
    const bonusPct = Math.round(this.state.getAchievementAllDmgBonus() * 100);
    const entries: Array<{ label: string; value: string; accent: string }> = [
      { label: 'Total Ores Mined', value: fmtInt(stats.oresBroken), accent: 'text-[#38bdf8]' },
      { label: 'Critical Taps Landed', value: fmtInt(stats.critTaps), accent: 'text-[#fde047]' },
      { label: 'Highest Critical Hit', value: fmtShort(stats.highestCrit), accent: 'text-[#fb923c]' },
      { label: 'Overclock Fever Triggers', value: fmtInt(stats.overclockTriggers), accent: 'text-[#facc15]' },
      { label: 'Best Gem Tower Floor', value: `Floor ${fmtInt(this.state.towerBestFloor)}`, accent: 'text-[#c084fc]' },
      { label: 'Relics Forged', value: `${this.state.craftedRelics.size}/12`, accent: 'text-[#4ade80]' },
      { label: 'Bounties Completed', value: fmtInt(this.state.bountiesCompleted), accent: 'text-[#7dd3fc]' },
      { label: 'Chibi Fusions Completed', value: fmtInt(stats.fusionsCompleted), accent: 'text-[#f472b6]' },
      { label: 'Index Discovered', value: `${this.state.getDiscoveredCount()}/${this.state.getTotalIndexCount()}`, accent: 'text-white' },
      { label: 'Achievement DMG Bonus', value: `+${bonusPct}% (${claimedCount}/${TOTAL_ACHIEVEMENT_TIERS})`, accent: 'text-[#86efac]' },
    ];

    return `
      <div class="grid grid-cols-2 @max-[640px]:grid-cols-1 gap-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
        ${entries
          .map(
            (e) => `
            <div class="rounded-xl border border-white/12 bg-[#0d1323] px-4 py-3 flex items-center justify-between gap-3">
              <span class="text-[12px] font-extrabold text-[#94a3b8]">${e.label}</span>
              <span class="text-[16px] font-black tabular-nums ${e.accent} mam-outline-sm">${e.value}</span>
            </div>
          `
          )
          .join('')}
      </div>
    `;
  }

  public renderModal(): string {
    const claimedCount = this.state.claimedAchievements.size;
    const bonusPct = Math.round(this.state.getAchievementAllDmgBonus() * 100);
    const trophySvg = `<svg class="w-6 h-6 text-[#fde047]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.8"/><path d="M7 6H4V8.5C4 10.2 5.3 11.5 7 11.5M17 6H20V8.5C20 10.2 18.7 11.5 17 11.5M12 15V19M8.5 19H15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

    return renderModalShell({
      title: 'Achievements',
      theme: 'bounties',
      iconHtml: trophySvg,
      boxClass: 'w-[860px] max-w-[96vw] h-[640px] max-h-[90vh]',
      headerExtraHtml: `
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1424] border border-[#facc15]/45 text-[12px] font-black text-[#fef08a] tabular-nums">
          <span>${claimedCount}/${TOTAL_ACHIEVEMENT_TIERS} Claimed</span>
          <span class="opacity-45">•</span>
          <span class="text-[#86efac]">+${bonusPct}% All DMG</span>
        </div>
      `,
      bodyHtml: `
        <div class="flex items-center gap-2">
          <button type="button" class="${TW_TAB_BTN} ${this.activeTab === 'achievements' ? 'active' : ''}" data-ach-tab="achievements">Achievements</button>
          <button type="button" class="${TW_TAB_BTN} ${this.activeTab === 'stats' ? 'active' : ''}" data-ach-tab="stats">Career Stats</button>
        </div>
        ${this.activeTab === 'achievements' ? this.renderAchievementsGrid() : this.renderCareerStatsGrid()}
      `,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-ach-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.achTab as AchievementsTab;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          audio.playSfx('ui-tab');
          this.onRequestRender();
        }
      });
    });

    root.querySelectorAll<HTMLElement>('[data-claim-achievement]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tierId = btn.dataset.claimAchievement;
        if (!tierId) return;
        const res = this.state.claimAchievementTier(tierId);
        if (!res) return;
        audio.playSfx('coin');
        const parts = [`+${fmtShort(res.gemsGranted)} Gems`];
        if (res.diceGranted > 0) parts.push(`+${res.diceGranted} Dice`);
        parts.push('+1% All DMG');
        this.onToast(`${res.category.title} ${TIER_ROMAN[res.tier.tier]}: ${parts.join(' • ')}`);
        this.onRequestRender();
      });
    });
  }
}
