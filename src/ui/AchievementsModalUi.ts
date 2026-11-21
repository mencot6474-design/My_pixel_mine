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
        return `<img src="${assetUrl('worlds/chrono.webp')}" alt="World" class="w-9 h-9 rounded-lg object-cover border border-white/25" draggable="false" />`;
    }
  }

  private renderAchievementsGrid(): string {
    const snap = this.state.getAchievementSnapshot();
    return `
      <div class="grid grid-cols-2 @max-[720px]:grid-cols-1 content-start auto-rows-max gap-2.5 overflow-y-auto mam-no-scrollbar pr-1 flex-1 min-h-0">
        ${ACHIEVEMENT_CATEGORIES.map((cat) => {
          const activeTier = getActiveAchievementTierForCategory(cat, this.state.claimedAchievements);
          const allDone = this.state.claimedAchievements.has(activeTier.id);
          const val = getAchievementProgressValue(snap, cat.id);
          const pct = Math.min(100, Math.round((val / Math.max(1, activeTier.target)) * 100));
          const ready = !allDone && val >= activeTier.target;
          const style = TIER_MEDAL_STYLE[activeTier.tier];

          const cardBorder = allDone
            ? 'border-2 border-[#14111d] bg-[#d1fae5]'
            : ready
              ? 'border-2 border-[#14111d] bg-[#fef08a]'
              : 'border-2 border-[#14111d] bg-[#ffffff]';

          const actionHtml = allDone
            ? `<span class="mam-pill min-w-[82px] h-[28px] bg-[#2ee59d] text-[#14111d]">✓ Maxed</span>`
            : ready
              ? `<button type="button" class="mam-sheen-hover relative overflow-hidden mam-pill min-w-[82px] h-[28px] bg-[#ff4d2e] text-white text-[11.5px] cursor-pointer hover:brightness-105 active:scale-95 transition-[transform,filter]" data-claim-achievement="${activeTier.id}">${hudIconHtml('sparkle', 13, 'Claim')}Claim</button>`
              : `<span class="mam-pill min-w-[82px] h-[28px] bg-[#fcecc8] text-[#5b526e]">${fmtShort(Math.min(val, activeTier.target))}/${fmtShort(activeTier.target)}</span>`;

          return `
            <div class="relative overflow-hidden rounded-2xl ${cardBorder} px-3 py-3.5 flex items-center gap-3 min-h-max">
              <div class="absolute top-0 left-0 right-0 h-[3px] ${allDone ? 'bg-[#2ee59d]' : style.rail}" aria-hidden="true"></div>
              <div class="relative w-14 h-14 rounded-2xl border-2 ${style.ring} ${style.bg} flex items-center justify-center shrink-0">
                ${this.renderCategoryArt(cat.iconKind)}
                <span class="mam-pill-xs absolute -bottom-1.5 -right-1.5 min-w-[22px] ${style.badge}">${TIER_ROMAN[activeTier.tier]}</span>
              </div>

              <div class="min-w-0 flex-1 flex flex-col gap-1.5 text-left">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-[14px] font-black text-[#14111d] truncate">${cat.title} ${TIER_ROMAN[activeTier.tier]}</div>
                    <div class="text-[11px] font-bold text-[#5b526e] truncate">${cat.description}</div>
                  </div>
                  ${actionHtml}
                </div>

                <div class="w-full h-2.5 rounded-full bg-[#fcecc8] border-2 border-[#14111d] overflow-hidden">
                  <div class="h-full rounded-full transition-[width] duration-300 ${allDone ? 'bg-[#2ee59d]' : style.rail}" style="width:${allDone ? 100 : pct}%"></div>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="mam-pill-xs bg-[#bae6fd] text-[#14111d]">${hudIconHtml('gem', 11, 'Gems')}+${fmtShort(activeTier.gems)}</span>
                  ${
                    activeTier.enchantDice > 0
                      ? `<span class="mam-pill-xs bg-[#e9d5ff] text-[#14111d]">${enchantDiceIconHtml(12)}+${activeTier.enchantDice}</span>`
                      : ''
                  }
                  <span class="mam-pill-xs bg-[#fed7aa] text-[#14111d]">+1% All DMG</span>
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
      { label: 'Total Ores Mined', value: fmtInt(stats.oresBroken), accent: 'text-[#0284c7]' },
      { label: 'Critical Taps Landed', value: fmtInt(stats.critTaps), accent: 'text-[#ca8a04]' },
      { label: 'Highest Critical Hit', value: fmtShort(stats.highestCrit), accent: 'text-[#ea580c]' },
      { label: 'Overclock Fever Triggers', value: fmtInt(stats.overclockTriggers), accent: 'text-[#d97706]' },
      { label: 'Best Gem Tower Floor', value: `Floor ${fmtInt(this.state.towerBestFloor)}`, accent: 'text-[#9333ea]' },
      { label: 'Relics Forged', value: `${this.state.craftedRelics.size}/12`, accent: 'text-[#16a34a]' },
      { label: 'Bounties Completed', value: fmtInt(this.state.bountiesCompleted), accent: 'text-[#0369a1]' },
      { label: 'Chibi Fusions Completed', value: fmtInt(stats.fusionsCompleted), accent: 'text-[#db2777]' },
      { label: 'Index Discovered', value: `${this.state.getDiscoveredCount()}/${this.state.getTotalIndexCount()}`, accent: 'text-[#14111d]' },
      { label: 'Achievement DMG Bonus', value: `+${bonusPct}% (${claimedCount}/${TOTAL_ACHIEVEMENT_TIERS})`, accent: 'text-[#15803d]' },
    ];

    return `
      <div class="grid grid-cols-2 @max-[640px]:grid-cols-1 content-start auto-rows-max gap-2.5 overflow-y-auto mam-no-scrollbar pr-1 flex-1 min-h-0">
        ${entries
          .map(
            (e) => `
            <div class="rounded-xl border-[2.5px] border-[#14111d] bg-white px-4 py-3 flex items-center justify-between gap-3">
              <span class="text-[12px] font-black text-[#475569]">${e.label}</span>
              <span class="text-[16px] font-black tabular-nums ${e.accent}">${e.value}</span>
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
    const trophySvg = `<svg class="w-5 h-5 text-[#14111d]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z" fill="#fde047" stroke="#14111d" stroke-width="2"/><path d="M7 6H4V8.5C4 10.2 5.3 11.5 7 11.5M17 6H20V8.5C20 10.2 18.7 11.5 17 11.5M12 15V19M8.5 19H15.5" stroke="#14111d" stroke-width="2" stroke-linecap="round"/></svg>`;

    return renderModalShell({
      title: 'Achievements',
      theme: 'bounties',
      iconHtml: trophySvg,
      boxClass: 'w-[860px] max-w-[96vw]',
      headerExtraHtml: `
        <div class="mam-pill-lg rounded-full bg-white text-[#14111d]">
          <span>${claimedCount}/${TOTAL_ACHIEVEMENT_TIERS} Claimed</span>
          <span class="opacity-45">•</span>
          <span class="text-[#15803d]">+${bonusPct}% All DMG</span>
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
