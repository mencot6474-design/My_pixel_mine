import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { getChibiById } from '../game3d/ChibiCatalog';
import { DAILY_LOGIN_REWARDS, getDailyLoginLimitedChibiIds } from '../game/DailyLoginData';
import { FUSION_RECIPES } from '../game/FusionData';
import {
  getMinersByWorld,
  getOresByWorld,
  getWeatherLimitedMiners,
  ItemRarity,
  WEATHER_ORES,
  WORLDS,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { IndexTabId, isIndexMilestoneUnlocked } from '../game/IndexRewardsDomain';
import { fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { OMEGA_BOSS_DEFS } from '../game/OmegaData';
import { PREMIUM_SHOP_ITEMS } from '../game/PremiumShopData';
import { getWeatherById } from '../game/WeatherData';
import { enchantDiceIconHtml, hudIconHtml, meteorIconHtml, oreIconSvg } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
} from './HudShared';
import { IndexInspectorUi } from './IndexInspectorUi';

export class IndexModalUi {
  private indexWorldId: IndexTabId = 'underground';
  private indexInspectId: string | null = null;
  private lastIndexInspectorHtml = '';
  private readonly inspectorUi: IndexInspectorUi;

  constructor(
    private readonly state: GameState,
    private readonly onRequestRender: () => void,
    private readonly onToast?: (msg: string) => void
  ) {
    this.inspectorUi = new IndexInspectorUi(this.state);
  }

  private getResolvedIndexInspectId(): string | null {
    let allIds: string[];
    if (this.indexWorldId === 'omega') {
      allIds = OMEGA_BOSS_DEFS.map((b) => b.chibiId);
    } else if (this.indexWorldId === 'twin') {
      allIds = PREMIUM_SHOP_ITEMS.map((item) => item.chibiId);
    } else if (this.indexWorldId === 'limited') {
      allIds = getDailyLoginLimitedChibiIds();
    } else if (this.indexWorldId === 'fusion') {
      allIds = FUSION_RECIPES.map((r) => r.resultChibiId);
    } else if (this.indexWorldId === 'weather') {
      const weatherMiners = getWeatherLimitedMiners();
      allIds = [...WEATHER_ORES.map((o) => o.id), ...weatherMiners.map((m) => m.chibi.id)];
    } else {
      const ores = getOresByWorld(this.indexWorldId);
      const miners = getMinersByWorld(this.indexWorldId);
      allIds = [...ores.map((o) => o.id), ...miners.map((m) => m.chibi.id)];
    }

    if (this.indexInspectId && allIds.includes(this.indexInspectId)) return this.indexInspectId;
    this.indexInspectId = allIds[0] ?? null;
    return this.indexInspectId;
  }

  private isHoloChibiCard(id: string, rarity: ItemRarity, unlocked: boolean): boolean {
    if (!unlocked || !getChibiById(id)) return false;
    return rarity === 'fusion' || rarity === 'limited' || rarity === 'twin' || rarity === 'omega' || this.state.getChibiStar(id) >= 5;
  }

  private renderIndexCard(opts: {
    id: string;
    name: string;
    rarity: ItemRarity;
    title: string;
    artHtml: string;
    bottomHtml: string;
    unlocked: boolean;
    selected: boolean;
    isChibi?: boolean;
  }): string {
    const isHolo = opts.isChibi ? this.isHoloChibiCard(opts.id, opts.rarity, opts.unlocked) : false;
    const star = opts.isChibi && opts.unlocked ? this.state.getChibiStar(opts.id) : 0;
    const extraCls = [
      opts.unlocked ? '' : 'locked',
      isHolo ? 'is-holo-foil' : '',
      opts.selected ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const starBadge =
      star >= 5
        ? `<span class="absolute top-1 left-1 z-[4] mam-pill-xs !px-1.5 rounded-md bg-[#fde047] border-[1.5px] border-[#14111d] text-[#14111d] text-[9px]">★5</span>`
        : '';
    return `
      <div class="${rarityCardClasses(opts.rarity, extraCls)}" style="${rarityVars(opts.rarity)}" data-index-id="${opts.id}" title="${opts.title}">
        ${starBadge}
        <div class="mam-card-art">${opts.artHtml}</div>
        <div class="mam-card-name truncate px-1">${opts.name}</div>
        <div class="mam-card-bottom">${opts.bottomHtml}</div>
      </div>
    `;
  }

  private buildIndexInspectorHtml(): string {
    return this.inspectorUi.buildInspectorHtml(this.indexWorldId, this.getResolvedIndexInspectId());
  }

  private buildIndexCardsHtml(): string {
    const selectedId = this.getResolvedIndexInspectId();

    if (this.indexWorldId === 'omega') {
      return OMEGA_BOSS_DEFS.map((boss) => {
        const chibi = getChibiById(boss.chibiId);
        if (!chibi) return '';
        return this.renderIndexCard({
          id: chibi.id,
          name: chibi.name,
          rarity: chibi.rarity,
          title: `${chibi.name} (${boss.bossTitle})`,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          bottomHtml: `${renderRarityBadgeHtml(chibi.rarity, 'is-compact mb-0.5')}<span class="mam-card-pct">${fmtShort(chibi.baseDps)}/s</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
          isChibi: true,
        });
      }).join('');
    }

    if (this.indexWorldId === 'twin') {
      return PREMIUM_SHOP_ITEMS.map((item) => {
        const chibi = getChibiById(item.chibiId);
        if (!chibi) return '';
        return this.renderIndexCard({
          id: chibi.id,
          name: chibi.name,
          rarity: chibi.rarity,
          title: `${chibi.name} (${item.titleTag})`,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          bottomHtml: `${renderRarityBadgeHtml(chibi.rarity, 'is-compact mb-0.5')}<span class="mam-card-pct">${fmtShort(chibi.baseDps)}/s</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
          isChibi: true,
        });
      }).join('');
    }

    if (this.indexWorldId === 'limited') {
      return DAILY_LOGIN_REWARDS.filter((r) => Boolean(r.chibiId))
        .map((reward) => {
          const chibi = getChibiById(reward.chibiId as string);
          if (!chibi) return '';
          return this.renderIndexCard({
            id: chibi.id,
            name: chibi.name,
            rarity: chibi.rarity,
            title: `${chibi.name} (Day ${reward.day} Limited)`,
            artHtml: chibiPortraitHtml(chibi, { usePose: true }),
            bottomHtml: `${renderRarityBadgeHtml(chibi.rarity, 'is-compact mb-0.5')}<span class="mam-card-pct">${fmtShort(chibi.baseDps)}/s</span>`,
            unlocked: this.state.discovered.has(chibi.id),
            selected: selectedId === chibi.id,
            isChibi: true,
          });
        })
        .join('');
    }

    if (this.indexWorldId === 'fusion') {
      return FUSION_RECIPES.map((recipe) => {
        const chibi = getChibiById(recipe.resultChibiId);
        if (!chibi) return '';
        return this.renderIndexCard({
          id: chibi.id,
          name: chibi.name,
          rarity: chibi.rarity,
          title: `${chibi.name} (${recipe.subtitle})`,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          bottomHtml: `${renderRarityBadgeHtml(chibi.rarity, 'is-compact mb-0.5')}<span class="mam-card-pct">${fmtShort(chibi.baseDps)}/s</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
          isChibi: true,
        });
      }).join('');
    }

    if (this.indexWorldId === 'weather') {
      const oreCards = WEATHER_ORES.map((wOre) => {
        const wDef = getWeatherById(wOre.weatherId);
        return this.renderIndexCard({
          id: wOre.id,
          name: wOre.name,
          rarity: wOre.rarity,
          title: `${wOre.name} (${fmtMoney(wOre.sellValue)})`,
          artHtml: `<img class="w-12 h-12 object-contain" src="${assetUrl(`/ores/${wOre.id}.webp`)}" alt="${wOre.name}" />`,
          bottomHtml: `<span class="mam-card-pct">${wDef.shortName}</span>`,
          unlocked: this.state.discovered.has(wOre.id),
          selected: selectedId === wOre.id,
        });
      }).join('');

      const minerCards = getWeatherLimitedMiners()
        .map(({ weatherId, chibi, rarity, chancePct }) => {
          const wDef = getWeatherById(weatherId);
          return this.renderIndexCard({
            id: chibi.id,
            name: chibi.name,
            rarity,
            title: `${chibi.name} (${wDef.name} • ${fmtPct(chancePct)})`,
            artHtml: chibiPortraitHtml(chibi, { usePose: true }),
            bottomHtml: `<span class="mam-card-pct">${wDef.shortName}</span>`,
            unlocked: this.state.discovered.has(chibi.id),
            selected: selectedId === chibi.id,
            isChibi: true,
          });
        })
        .join('');
      return `${oreCards}${minerCards}`;
    }

    const oreCards = getOresByWorld(this.indexWorldId)
      .map((ore) =>
        this.renderIndexCard({
          id: ore.id,
          name: ore.name,
          rarity: ore.rarity,
          title: `${ore.name} (${fmtMoney(ore.sellValue)})`,
          artHtml: oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `ix_${ore.id}`),
          bottomHtml: `<span class="mam-card-pct">${fmtPct(ore.chancePct)}</span>`,
          unlocked: this.state.discovered.has(ore.id),
          selected: selectedId === ore.id,
        })
      )
      .join('');

    const minerCards = getMinersByWorld(this.indexWorldId)
      .map(({ entry, chibi }) =>
        this.renderIndexCard({
          id: chibi.id,
          name: chibi.name,
          rarity: entry.rarity,
          title: `${chibi.name} (${fmtShort(chibi.baseDps)} DPS)`,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          bottomHtml: `<span class="mam-card-pct">${fmtPct(entry.chancePct)}</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
          isChibi: true,
        })
      )
      .join('');

    return `${oreCards}${minerCards}`;
  }

  private buildTabReadyDotHtml(tabId: IndexTabId): string {
    const ready = this.state.getTabReadyIndexRewardCount(tabId);
    if (ready <= 0) return '';
    return `<span class="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#ff3b5c] border-[1.5px] border-[#14111d] text-white text-[10px] font-black leading-none" data-index-tab-ready="${tabId}">${ready}</span>`;
  }

  private buildPassiveBadgeIconSvg(kind: 'oreSellPct' | 'oreDropPct' | 'allDmgPct'): string {
    if (kind === 'oreSellPct') {
      return `<svg class="w-3.5 h-3.5 shrink-0 text-[#4ade80]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.8"/><path d="M10 5.5v9M12.3 7.8c0-.9-1-1.6-2.3-1.6s-2.3.7-2.3 1.6c0 1 1 1.4 2.3 1.7 1.3.3 2.3.7 2.3 1.7 0 .9-1 1.6-2.3 1.6s-2.3-.7-2.3-1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    }
    if (kind === 'oreDropPct') {
      return `<svg class="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5L16.5 7.5L14 16.5H6L3.5 7.5L10 2.5Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 2.5V16.5M3.5 7.5H16.5" stroke="currentColor" stroke-width="1.2" opacity="0.7"/></svg>`;
    }
    return `<svg class="w-3.5 h-3.5 shrink-0 text-[#fb923c]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15.5 3.5L16.5 4.5L9.2 11.8L11 13.6L9.6 15L7.8 13.2L5 16L4 15L6.8 12.2L5 10.4L6.4 9L8.2 10.8L15.5 3.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
  }

  private buildMilestoneRewardsStripHtml(): string {
    const progress = this.state.getIndexTabProgress(this.indexWorldId);
    const milestones = this.state.getIndexMilestones(this.indexWorldId);
    const passives = this.state.getActiveIndexPassiveBonuses();
    const activePassiveChips: string[] = [];
    if (passives.oreSellPct > 0) {
      activePassiveChips.push(
        `<span class="mam-pill bg-[#6ee7b7] text-[#14111d]">${this.buildPassiveBadgeIconSvg('oreSellPct')}+${Math.round(passives.oreSellPct * 100)}%</span>`
      );
    }
    if (passives.oreDropPct > 0) {
      activePassiveChips.push(
        `<span class="mam-pill bg-[#bae6fd] text-[#14111d]">${this.buildPassiveBadgeIconSvg('oreDropPct')}+${Math.round(passives.oreDropPct * 100)}%</span>`
      );
    }
    if (passives.allDmgPct > 0) {
      activePassiveChips.push(
        `<span class="mam-pill bg-[#fed7aa] text-[#14111d]">${this.buildPassiveBadgeIconSvg('allDmgPct')}+${Math.round(passives.allDmgPct * 100)}%</span>`
      );
    }

    const cardsHtml = milestones
      .map((m) => {
        const claimed = this.state.claimedIndexRewards.has(m.id);
        const unlocked = isIndexMilestoneUnlocked(this.state.discovered, m);
        const ready = unlocked && !claimed;
        const needed = m.thresholdPct === 100 ? progress.total : Math.ceil((progress.total * m.thresholdPct) / 100);
        const fillPct = needed > 0 ? Math.min(100, Math.round((progress.found / needed) * 100)) : 0;

        const rewardChips: string[] = [
          `<span class="mam-pill bg-[#bae6fd] text-[#14111d]">${hudIconHtml('gem', 13, 'Gems')}+${fmtShort(m.gems)}</span>`,
        ];
        if (m.enchantDice > 0) {
          rewardChips.push(
            `<span class="mam-pill bg-[#e9d5ff] text-[#14111d]">${enchantDiceIconHtml(14)}+${m.enchantDice}</span>`
          );
        }
        if (m.passive) {
          rewardChips.push(
            `<span class="mam-pill bg-[#fef08a] text-[#14111d]">${this.buildPassiveBadgeIconSvg(m.passive.kind)}${m.passive.label}</span>`
          );
        }

        const topRail = claimed
          ? 'bg-[#2ee59d]'
          : ready
            ? 'bg-[#f59e0b]'
            : m.thresholdPct === 100
              ? 'bg-[#a855f7]'
              : 'bg-[#38bdf8]';

        const cardBorder = claimed
          ? 'border-2 border-[#14111d] bg-[#d1fae5]'
          : ready
            ? 'border-2 border-[#14111d] bg-[#fef08a]'
            : 'border-2 border-[#14111d] bg-[#ffffff]';

        const actionHtml = claimed
          ? `<span class="mam-pill min-w-[78px] h-[28px] bg-[#2ee59d] text-[#14111d]"><svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Claimed</span>`
          : ready
            ? `<button type="button" class="mam-sheen-hover relative overflow-hidden mam-pill min-w-[78px] h-[28px] bg-[#ff4d2e] text-white cursor-pointer hover:brightness-105 active:scale-95 transition-[transform,filter]" data-claim-index-milestone="${m.id}">${hudIconHtml('sparkle', 13, 'Claim')}Claim</button>`
            : `<span class="mam-pill min-w-[78px] h-[28px] bg-[#fcecc8] text-[#5b526e]">${progress.found}/${needed}</span>`;

        return `
          <div class="relative overflow-hidden rounded-xl ${cardBorder} px-2.5 py-1.5 flex items-center justify-between gap-2">
            <div class="absolute top-0 left-0 right-0 h-[3px] ${topRail}" aria-hidden="true"></div>
            <div class="min-w-0 flex-1 flex flex-col gap-1 text-left">
              <div class="flex items-center gap-1 flex-wrap">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border-[1.5px] border-[#14111d] text-[11px] font-black text-[#14111d] ${m.thresholdPct === 100 ? 'bg-[#fde047]' : 'bg-[#7dd3fc]'} tabular-nums">
                  <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.5z"/></svg>
                  ${m.thresholdPct}%
                </span>
                ${rewardChips.join('')}
              </div>
              <div class="w-full h-2 rounded-full bg-[#fcecc8] border-[1.5px] border-[#14111d] overflow-hidden">
                <div class="h-full rounded-full transition-[width] duration-300 ${topRail}" style="width:${fillPct}%"></div>
              </div>
            </div>
            ${actionHtml}
          </div>
        `;
      })
      .join('');

    const passiveSummaryHtml =
      activePassiveChips.length > 0
        ? `<div class="col-span-2 @max-[640px]:col-span-1 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffffff] border-2 border-[#14111d] text-[11px] font-black text-[#14111d]">${hudIconHtml('sparkle', 13, 'Bonus')}${activePassiveChips.join('')}</div>`
        : '';

    const isTabMaxed = progress.total > 0 && progress.found >= progress.total;
    const maxedStampHtml = isTabMaxed
      ? `<div class="col-span-2 @max-[640px]:col-span-1 flex items-center justify-center gap-2 px-3 py-1 rounded-xl bg-[#fef08a] border-2 border-[#14111d]" data-index-maxed-stamp="true"><span class="mam-index-maxed-stamp">★ MAXED 100%</span><span class="text-[11px] font-black text-[#14111d]">All entries discovered in this collection!</span></div>`
      : '';

    return `
      <div class="grid grid-cols-2 @max-[640px]:grid-cols-1 gap-2 shrink-0" data-index-milestones="true">
        ${maxedStampHtml}
        ${cardsHtml}
        ${passiveSummaryHtml}
      </div>
    `;
  }

  private renderSidebarTabButton(opts: {
    tabId: IndexTabId;
    labelHtml: string;
    found: number;
    total: number;
    accentColor: string;
    countAttrName: 'data-index-world-count' | 'data-index-tab-count';
  }): string {
    const active = this.indexWorldId === opts.tabId;
    const maxed = opts.total > 0 && opts.found >= opts.total;
    const pct = opts.total > 0 ? Math.min(100, Math.round((opts.found / opts.total) * 100)) : 0;
    const readyDot = this.buildTabReadyDotHtml(opts.tabId);
    const btnBg = active
      ? 'bg-[#fef08a] ring-[2px] ring-inset ring-[#38bdf8]'
      : 'bg-[#ffffff] hover:bg-[#fcecc8]';
    const barColor = maxed ? '#2ee59d' : opts.accentColor;

    return `
      <button
        type="button"
        class="group relative w-full @max-[920px]:w-auto shrink-0 rounded-xl border-2 border-[#14111d] ${btnBg} px-2.5 py-1.5 @max-[920px]:py-1 flex flex-col gap-1 text-left cursor-pointer transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] ${active ? 'active' : ''}"
        data-index-world="${opts.tabId}"
      >
        <div class="flex items-center justify-between gap-1.5 w-full whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 min-w-0 text-[12px] font-black text-[#14111d] truncate">${opts.labelHtml}</span>
          <span class="inline-flex items-center gap-1 shrink-0">
            <span class="text-[10.5px] font-extrabold text-[#5b526e] tabular-nums" ${opts.countAttrName}="${opts.tabId}">(${opts.found}/${opts.total})</span>
            ${maxed ? '<span class="mam-pill-xs !px-1 rounded bg-[#fde047] border border-[#14111d] text-[#14111d] text-[9px]" data-index-tab-maxed="true">MAX</span>' : ''}
            ${readyDot}
          </span>
        </div>
        <div class="w-full h-[4px] rounded-full bg-[#fcecc8] border border-[#14111d]/35 overflow-hidden @max-[920px]:hidden">
          <div class="h-full rounded-full transition-[width] duration-250" data-index-tab-bar="${opts.tabId}" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </button>
    `;
  }

  private buildCollectionSidebarHtml(): string {
    const worldButtons = WORLDS.map((w) => {
      const wp = this.state.getWorldIndexProgress(w.id);
      return this.renderSidebarTabButton({
        tabId: w.id,
        labelHtml: `<span class="w-2.5 h-2.5 rounded-full shrink-0 border border-[#14111d]" style="background:${w.iconColor}"></span><span class="truncate">${w.name}</span>`,
        found: wp.found,
        total: wp.total,
        accentColor: w.iconColor,
        countAttrName: 'data-index-world-count',
      });
    }).join('');

    const specialSpecs: Array<{
      tabId: Extract<IndexTabId, 'weather' | 'fusion' | 'limited' | 'twin' | 'omega'>;
      labelHtml: string;
      accentColor: string;
    }> = [
      {
        tabId: 'weather',
        labelHtml: `${meteorIconHtml('celestial', 14, 'Weather')}<span>Weather</span>`,
        accentColor: '#38bdf8',
      },
      {
        tabId: 'fusion',
        labelHtml: `<span class="text-[#a855f7]">✦</span><span>Fusion</span>`,
        accentColor: '#c084fc',
      },
      {
        tabId: 'limited',
        labelHtml: `<span class="text-[#d97706]">★</span><span>Limited</span>`,
        accentColor: '#f59e0b',
      },
      {
        tabId: 'twin',
        labelHtml: `<img class="w-4 h-4 object-contain shrink-0" src="${assetUrl('/badges/twin.svg')}" alt="" aria-hidden="true" /><span>Twin</span>`,
        accentColor: '#ec4899',
      },
      {
        tabId: 'omega',
        labelHtml: `<img class="w-4 h-4 object-contain shrink-0" src="${assetUrl('/badges/omega.svg')}" alt="" aria-hidden="true" /><span>Omega</span>`,
        accentColor: '#ef4444',
      },
    ];

    const specialButtons = specialSpecs
      .map((spec) => {
        const prog = this.state.getIndexTabProgress(spec.tabId);
        return this.renderSidebarTabButton({
          tabId: spec.tabId,
          labelHtml: spec.labelHtml,
          found: prog.found,
          total: prog.total,
          accentColor: spec.accentColor,
          countAttrName: 'data-index-tab-count',
        });
      })
      .join('');

    return `
      <aside class="mam-inspector-well mam-no-scrollbar w-[212px] @max-[920px]:w-full shrink-0 rounded-xl p-2 flex flex-col @max-[920px]:flex-row @max-[920px]:items-center gap-1.5 overflow-y-auto @max-[920px]:overflow-y-hidden @max-[920px]:overflow-x-auto" data-index-sidebar="true">
        <div class="px-1.5 pt-0.5 text-[10px] font-black tracking-[0.08em] uppercase text-[#5b526e] @max-[920px]:hidden">Worlds (W1–W8)</div>
        ${worldButtons}
        <div class="px-1.5 pt-1.5 mt-0.5 border-t border-[#14111d]/15 text-[10px] font-black tracking-[0.08em] uppercase text-[#5b526e] @max-[920px]:hidden">Special Tiers</div>
        <span class="hidden @max-[920px]:inline-block w-[2px] h-6 bg-[#14111d]/20 shrink-0 mx-0.5" aria-hidden="true"></span>
        ${specialButtons}
      </aside>
    `;
  }

  public renderModal(): string {
    const found = this.state.getDiscoveredCount();
    const total = this.state.getTotalIndexCount();
    const pct = total > 0 ? Math.round((found / total) * 100) : 0;
    const inspHtml = this.buildIndexInspectorHtml();
    this.lastIndexInspectorHtml = inspHtml;

    return renderModalShell({
      title: 'Index',
      theme: 'index',
      iconHtml: hudIconHtml('indexBook', 26, 'Index'),
      boxClass: `w-[1060px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `
        <div class="relative w-full max-w-[640px] mx-auto h-7 rounded-full bg-[#fcecc8] border-[2.5px] border-[#14111d] overflow-hidden flex items-center justify-center">
          <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#a855f7,#ec4899,#38bdf8)] rounded-full transition-[width] duration-250 ease-out" data-index-fill="true" style="width:${pct}%"></div>
          <div class="relative z-[2] w-full px-1.5 flex items-center justify-center text-[13px] font-black" data-index-progress-text="true">
            <span class="text-white mam-outline-sm tabular-nums leading-none tracking-wide" data-index-found-label="true">${found}/${total} Found</span>
            <span class="absolute right-1 mam-pill-xs rounded-full bg-[#14111d] text-[#fff8e7] text-[11px] tabular-nums" data-index-pct-label="true">${pct}%</span>
          </div>
        </div>
      `,
      bodyHtml: `
        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col">
          ${this.buildCollectionSidebarHtml()}

          <div class="flex-1 min-w-0 min-h-0 flex flex-col gap-2.5">
            ${this.buildMilestoneRewardsStripHtml()}

            <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
              <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-0 @max-[920px]:min-h-[200px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-index-grid="true">
                ${this.buildIndexCardsHtml()}
              </div>
              <div class="mam-inspector-well mam-no-scrollbar w-[262px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-index-inspector="true">
                ${inspHtml}
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-index-world]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.indexWorld as IndexTabId;
        this.indexWorldId = wid;
        this.onRequestRender();
      });
    });

    root.querySelectorAll('[data-index-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.indexId;
        if (!id) return;
        this.indexInspectId = id;
        this.refreshIndexInspectorLive(root);
      });
    });

    root.querySelectorAll('[data-claim-index-milestone]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.claimIndexMilestone;
        if (!id) return;
        const res = this.state.claimIndexReward(id);
        if (!res) return;
        audio.playSfx('coin');
        const parts: string[] = [`+${fmtShort(res.gemsGranted)} Gems`];
        if (res.diceGranted > 0) parts.push(`+${res.diceGranted} Dice`);
        if (res.milestone.passive) parts.push(res.milestone.passive.label);
        this.onToast?.(`Index Reward Claimed: ${parts.join(' • ')}`);
        this.onRequestRender();
      });
    });

    const idxPanel = root.querySelector<HTMLElement>('[data-index-inspector="true"]');
    if (idxPanel) {
      this.lastIndexInspectorHtml = idxPanel.innerHTML;
      this.bindIndexInspectorEvents(idxPanel);
    }
  }

  public closeReviewDialog(): void {
    this.inspectorUi.closeReviewDialog();
  }

  private bindIndexInspectorEvents(scope: ParentNode): void {
    this.inspectorUi.bindEvents(scope, this.indexWorldId);
  }

  public refreshIndexInspectorLive(root: HTMLElement): void {
    const resolvedId = this.getResolvedIndexInspectId();
    root.querySelectorAll<HTMLElement>('[data-index-id]').forEach((card) => {
      applyInspectRing(card, card.dataset.indexId === resolvedId);
    });
    const panel = root.querySelector<HTMLElement>('[data-index-inspector="true"]');
    if (!panel) return;
    const nextHtml = this.buildIndexInspectorHtml();
    if (this.lastIndexInspectorHtml !== nextHtml) {
      this.lastIndexInspectorHtml = nextHtml;
      panel.innerHTML = nextHtml;
      this.bindIndexInspectorEvents(panel);
    }
  }

  public updateLive(root: HTMLElement): void {
    const found = this.state.getDiscoveredCount();
    const total = this.state.getTotalIndexCount();
    const pct = total > 0 ? Math.round((found / total) * 100) : 0;

    const fill = root.querySelector<HTMLElement>('[data-index-fill="true"]');
    if (fill) fill.style.width = `${pct}%`;
    const foundLabel = root.querySelector<HTMLElement>('[data-index-found-label="true"]');
    if (foundLabel) foundLabel.textContent = `${found}/${total} Found`;
    const pctLabel = root.querySelector<HTMLElement>('[data-index-pct-label="true"]');
    if (pctLabel) pctLabel.textContent = `${pct}%`;

    for (const w of WORLDS) {
      const wp = this.state.getWorldIndexProgress(w.id);
      const wBadge = root.querySelector<HTMLElement>(`[data-index-world-count="${w.id}"]`);
      if (wBadge) wBadge.textContent = `(${wp.found}/${wp.total})`;
      const wBar = root.querySelector<HTMLElement>(`[data-index-tab-bar="${w.id}"]`);
      if (wBar) {
        wBar.style.width = `${wp.total > 0 ? Math.min(100, Math.round((wp.found / wp.total) * 100)) : 0}%`;
      }
    }
    for (const tabId of ['weather', 'fusion', 'limited', 'twin', 'omega'] as const) {
      const tp = this.state.getIndexTabProgress(tabId);
      const badge = root.querySelector<HTMLElement>(`[data-index-tab-count="${tabId}"]`);
      if (badge) badge.textContent = `(${tp.found}/${tp.total})`;
      const bar = root.querySelector<HTMLElement>(`[data-index-tab-bar="${tabId}"]`);
      if (bar) {
        bar.style.width = `${tp.total > 0 ? Math.min(100, Math.round((tp.found / tp.total) * 100)) : 0}%`;
      }
    }

    root.querySelectorAll<HTMLElement>('[data-index-id]').forEach((card) => {
      const id = card.dataset.indexId;
      if (!id) return;
      card.classList.toggle('locked', !this.state.discovered.has(id));
    });
    this.refreshIndexInspectorLive(root);
  }
}
