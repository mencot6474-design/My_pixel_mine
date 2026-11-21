import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { getChibiById } from '../game3d/ChibiCatalog';
import { DAILY_LOGIN_REWARDS, getDailyLoginLimitedChibiIds } from '../game/DailyLoginData';
import { FUSION_RECIPES } from '../game/FusionData';
import {
  getMinerRarity,
  getMinersByWorld,
  getMinerSellValue,
  getMinerWorldId,
  getOresByWorld,
  getWeatherLimitedMiners,
  getWorldById,
  ItemRarity,
  RARITY_BORDER,
  WEATHER_ORES,
  WORLDS,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { IndexTabId, isIndexMilestoneUnlocked } from '../game/IndexRewardsDomain';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { getWeatherById } from '../game/WeatherData';
import { enchantDiceIconHtml, hudIconHtml, meteorIconHtml, oreIconSvg } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  renderRarityBadgeHtml,
  TW_CLOSE_BTN,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

export class IndexModalUi {
  private indexWorldId: IndexTabId = 'underground';
  private indexInspectId: string | null = null;
  private lastIndexInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly onRequestRender: () => void,
    private readonly onToast?: (msg: string) => void
  ) {}

  private getResolvedIndexInspectId(): string | null {
    let allIds: string[];
    if (this.indexWorldId === 'limited') {
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
    return rarity === 'fusion' || rarity === 'limited' || this.state.getChibiStar(id) >= 5;
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
        ? `<span class="absolute top-1 left-1 z-[4] px-1 py-px rounded-md bg-[#fde047] border-[1.5px] border-[#14111d] text-[#14111d] text-[8.5px] font-black leading-none">★5</span>`
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

  private renderReviewActionButton(chibiId: string, label: string, variant: 'special' | 'standard'): string {
    if (variant === 'special') {
      return `
        <button type="button" class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border-[2.5px] border-[#14111d] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#14111d] text-[13px] font-black cursor-pointer inline-flex items-center justify-center gap-1.5 transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]" data-review-chibi="${chibiId}">
          <span>${label}</span>
        </button>
      `;
    }
    return `
      <button
        type="button"
        class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]"
        data-review-chibi="${chibiId}"
      >${label}</button>
    `;
  }

  private buildIndexInspectorHtml(): string {
    const targetId = this.getResolvedIndexInspectId();
    if (!targetId) return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');

    const unlocked = this.state.discovered.has(targetId);
    const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-[#14111d] ${unlocked ? 'bg-[#6ee7b7] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${unlocked ? 'Discovered' : 'Locked'}</span>`;

    if (this.indexWorldId === 'limited') {
      const reward = DAILY_LOGIN_REWARDS.find((r) => r.chibiId === targetId);
      const chibi = reward?.chibiId ? getChibiById(reward.chibiId) : undefined;
      if (reward && chibi) {
        const owned = this.state.miners[chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
        return renderInspectorPanel({
          rarity: chibi.rarity,
          title: chibi.name,
          subtitle: `Day ${reward.day} Daily Login • Limited 5★`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          stats: [
            ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#b45309]'],
            ['Stars', '★★★★★ 5★', 'text-[#b45309]'],
            ['Trade', 'Non-Sellable', 'text-[#be123c]'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(chibi.id, 'Review 4 Poses', 'special'),
          dimmed: !unlocked,
        });
      }
      return renderEmptyInspectorPanel('Select any Limited Chibi to inspect details.');
    }

    if (this.indexWorldId === 'fusion') {
      const recipe = FUSION_RECIPES.find((r) => r.resultChibiId === targetId);
      const chibi = recipe ? getChibiById(recipe.resultChibiId) : undefined;
      if (recipe && chibi) {
        const owned = this.state.miners[chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
        return renderInspectorPanel({
          rarity: chibi.rarity,
          title: chibi.name,
          subtitle: `${recipe.subtitle} • Synchro Fusion`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          stats: [
            ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#b45309]'],
            ['Passive', recipe.passive.label, 'text-[#0369a1]'],
            ['Gem Cost', fmtInt(recipe.gemCost), 'text-[#0369a1]'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(chibi.id, 'Review 4 Poses', 'special'),
          dimmed: !unlocked,
        });
      }
      return renderEmptyInspectorPanel('Select any Fusion Chibi to inspect details.');
    }

    if (this.indexWorldId === 'weather') {
      const wOre = WEATHER_ORES.find((o) => o.id === targetId);
      if (wOre) {
        const wDef = getWeatherById(wOre.weatherId);
        const bagQty = this.state.ores[wOre.id] || 0;
        const chestQty = this.state.chestOres[wOre.id] || 0;
        const effVal = this.state.getEffectiveOreSellValue(wOre.id);
        return renderInspectorPanel({
          rarity: wOre.rarity,
          title: wOre.name,
          subtitle: `${wDef.name} • Meteor Ore`,
          badgesHtml: statusBadge,
          artHtml: `<img class="w-16 h-16 object-contain" src="${assetUrl(`/ores/${wOre.id}.webp`)}" alt="${wOre.name}" />`,
          dimmed: !unlocked,
          stats: [
            ['Source', wOre.meteorName, 'text-[#0369a1]'],
            ['Base Value', fmtMoney(wOre.sellValue), 'text-[#14111d]'],
            ['Your Value', fmtMoney(effVal), 'text-[#15803d]'],
            ['Owned', `Bag ${fmtInt(bagQty)} • Chest ${fmtInt(chestQty)}`, 'text-[#b45309]'],
          ],
        });
      }
      const wMiner = getWeatherLimitedMiners().find((m) => m.chibi.id === targetId);
      if (wMiner) {
        const wDef = getWeatherById(wMiner.weatherId);
        const owned = this.state.miners[wMiner.chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === wMiner.chibi.id).length;
        return renderInspectorPanel({
          rarity: wMiner.rarity,
          title: wMiner.chibi.name,
          subtitle: `${wDef.name} • Limited Chibi`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(wMiner.chibi, { usePose: true }),
          dimmed: !unlocked,
          stats: [
            ['Drop Chance', fmtPct(wMiner.chancePct), 'text-[#0369a1]'],
            ['Base DPS', `${fmtShort(wMiner.chibi.baseDps)}/s`, 'text-[#b45309]'],
            ['Sell Value', fmtMoney(getMinerSellValue(wMiner.chibi.id)), 'text-[#15803d]'],
            ['Owned', `x${fmtInt(owned)} (${fmtInt(onPlot)} on Plot)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(wMiner.chibi.id, 'Review', 'standard'),
        });
      }
      return renderEmptyInspectorPanel('Select any Weather Meteor Ore or Limited Chibi to inspect details.');
    }

    const worldDef = getWorldById(this.indexWorldId);

    const ore = getOresByWorld(this.indexWorldId).find((o) => o.id === targetId);
    if (ore) {
      const bagQty = this.state.ores[ore.id] || 0;
      const chestQty = this.state.chestOres[ore.id] || 0;
      const effVal = this.state.getEffectiveOreSellValue(ore.id);
      return renderInspectorPanel({
        rarity: ore.rarity,
        title: ore.name,
        subtitle: `${worldDef.name} • Ore`,
        badgesHtml: statusBadge,
        artHtml: oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `ix_${ore.id}`),
        dimmed: !unlocked,
        stats: [
          ['Drop Chance', fmtPct(ore.chancePct), 'text-[#0369a1]'],
          ['Base Value', fmtMoney(ore.sellValue), 'text-[#14111d]'],
          ['Your Value', fmtMoney(effVal), 'text-[#15803d]'],
          ['Owned', `Bag ${fmtInt(bagQty)} • Chest ${fmtInt(chestQty)}`, 'text-[#b45309]'],
        ],
      });
    }

    const minerMatch = getMinersByWorld(this.indexWorldId).find((m) => m.chibi.id === targetId);
    if (minerMatch) {
      const { entry, chibi } = minerMatch;
      const owned = this.state.miners[chibi.id] || 0;
      const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
      return renderInspectorPanel({
        rarity: entry.rarity,
        title: chibi.name,
        subtitle: `${worldDef.name} • Chibi Miner`,
        badgesHtml: statusBadge,
        artHtml: chibiPortraitHtml(chibi, { usePose: true }),
        dimmed: !unlocked,
        stats: [
          ['Drop Chance', fmtPct(entry.chancePct), 'text-[#0369a1]'],
          ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#b45309]'],
          ['Sell Value', fmtMoney(getMinerSellValue(chibi.id)), 'text-[#15803d]'],
          ['Owned', `x${fmtInt(owned)} (${fmtInt(onPlot)} on Plot)`, 'text-[#14111d]'],
        ],
        actionHtml: this.renderReviewActionButton(chibi.id, 'Review', 'standard'),
      });
    }

    return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');
  }

  private buildIndexCardsHtml(): string {
    const selectedId = this.getResolvedIndexInspectId();

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
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6ee7b7] border-2 border-[#14111d] text-[#14111d]">${this.buildPassiveBadgeIconSvg('oreSellPct')}+${Math.round(passives.oreSellPct * 100)}%</span>`
      );
    }
    if (passives.oreDropPct > 0) {
      activePassiveChips.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#bae6fd] border-2 border-[#14111d] text-[#14111d]">${this.buildPassiveBadgeIconSvg('oreDropPct')}+${Math.round(passives.oreDropPct * 100)}%</span>`
      );
    }
    if (passives.allDmgPct > 0) {
      activePassiveChips.push(
        `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fed7aa] border-2 border-[#14111d] text-[#14111d]">${this.buildPassiveBadgeIconSvg('allDmgPct')}+${Math.round(passives.allDmgPct * 100)}%</span>`
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
          `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#bae6fd] border border-[#14111d] text-[#14111d] text-[11px] font-black tabular-nums">${hudIconHtml('gem', 14, 'Gems')}+${fmtShort(m.gems)}</span>`,
        ];
        if (m.enchantDice > 0) {
          rewardChips.push(
            `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#e9d5ff] border border-[#14111d] text-[#14111d] text-[11px] font-black tabular-nums">${enchantDiceIconHtml(15)}+${m.enchantDice}</span>`
          );
        }
        if (m.passive) {
          rewardChips.push(
            `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#fef08a] border border-[#14111d] text-[#14111d] text-[11px] font-black">${this.buildPassiveBadgeIconSvg(m.passive.kind)}${m.passive.label}</span>`
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
          ? `<span class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2ee59d] border-2 border-[#14111d] text-[#14111d] text-[11px] font-black shrink-0"><svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Claimed</span>`
          : ready
            ? `<button type="button" class="mam-sheen-hover relative overflow-hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-[#14111d] bg-[#ff4d2e] text-white text-[11px] font-black cursor-pointer shrink-0 hover:brightness-105 active:scale-95 transition-[transform,filter]" data-claim-index-milestone="${m.id}">${hudIconHtml('sparkle', 13, 'Claim')}Claim</button>`
            : `<span class="px-2.5 py-1 rounded-lg bg-[#fcecc8] border-2 border-[#14111d] text-[#5b526e] text-[11px] font-black shrink-0 tabular-nums">${progress.found}/${needed}</span>`;

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
      boxClass: `w-[980px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `
        <div class="relative w-full max-w-[640px] mx-auto h-7 rounded-full bg-[#fcecc8] border-[2.5px] border-[#14111d] overflow-hidden flex items-center justify-center">
          <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#a855f7,#ec4899,#38bdf8)] rounded-full transition-[width] duration-250 ease-out" data-index-fill="true" style="width:${pct}%"></div>
          <div class="relative z-[2] w-full px-1.5 flex items-center justify-center text-[13px] font-black" data-index-progress-text="true">
            <span class="text-white mam-outline-sm tabular-nums leading-none tracking-wide" data-index-found-label="true">${found}/${total} Found</span>
            <span class="absolute right-1.5 px-2 py-px rounded-full bg-[#14111d] text-[#fff8e7] tabular-nums leading-tight" data-index-pct-label="true">${pct}%</span>
          </div>
        </div>
      `,
      bodyHtml: `
        <div class="flex flex-wrap items-center gap-1.5 py-0.5 shrink-0">
          ${WORLDS.map((w) => {
            const wp = this.state.getWorldIndexProgress(w.id);
            const wMaxed = wp.total > 0 && wp.found >= wp.total;
            return `
            <button class="${TW_TAB_BTN} !px-2.5 !py-1.5 !text-[12px] whitespace-nowrap shrink-0 ${this.indexWorldId === w.id ? 'active' : ''}" data-index-world="${w.id}">
              <span>${w.name}</span>
              <span class="text-[10.5px] font-bold opacity-85" data-index-world-count="${w.id}">(${wp.found}/${wp.total})</span>
              ${wMaxed ? '<span class="px-1 py-px rounded bg-[#fde047] border border-[#14111d] text-[#14111d] text-[9px] font-black leading-none" data-index-tab-maxed="true">MAXED</span>' : ''}
              ${this.buildTabReadyDotHtml(w.id)}
            </button>
          `;
          }).join('')}
          ${(() => {
            const wProg = this.state.getIndexTabProgress('weather');
            const fProg = this.state.getIndexTabProgress('fusion');
            const lProg = this.state.getIndexTabProgress('limited');
            return `
          <button class="${TW_TAB_BTN} !px-2.5 !py-1.5 !text-[12px] whitespace-nowrap shrink-0 ${this.indexWorldId === 'weather' ? 'active' : ''}" data-index-world="weather">
            <span class="inline-flex items-center gap-1">${meteorIconHtml('celestial', 14, 'Weather')} Weather</span>
            <span class="text-[10.5px] font-bold opacity-85" data-index-tab-count="weather">(${wProg.found}/${wProg.total})</span>
            ${wProg.total > 0 && wProg.found >= wProg.total ? '<span class="px-1 py-px rounded bg-[#fde047] border border-[#14111d] text-[#14111d] text-[9px] font-black leading-none" data-index-tab-maxed="true">MAXED</span>' : ''}
            ${this.buildTabReadyDotHtml('weather')}
          </button>
          <button class="${TW_TAB_BTN} !px-2.5 !py-1.5 !text-[12px] whitespace-nowrap shrink-0 ${this.indexWorldId === 'fusion' ? 'active' : ''}" data-index-world="fusion">
            <span class="inline-flex items-center gap-1">✦ Fusion</span>
            <span class="text-[10.5px] font-bold opacity-85" data-index-tab-count="fusion">(${fProg.found}/${fProg.total})</span>
            ${fProg.total > 0 && fProg.found >= fProg.total ? '<span class="px-1 py-px rounded bg-[#fde047] border border-[#14111d] text-[#14111d] text-[9px] font-black leading-none" data-index-tab-maxed="true">MAXED</span>' : ''}
            ${this.buildTabReadyDotHtml('fusion')}
          </button>
          <button class="${TW_TAB_BTN} !px-2.5 !py-1.5 !text-[12px] whitespace-nowrap shrink-0 ${this.indexWorldId === 'limited' ? 'active' : ''}" data-index-world="limited">
            <span class="inline-flex items-center gap-1">★ Limited</span>
            <span class="text-[10.5px] font-bold opacity-85" data-index-tab-count="limited">(${lProg.found}/${lProg.total})</span>
            ${lProg.total > 0 && lProg.found >= lProg.total ? '<span class="px-1 py-px rounded bg-[#fde047] border border-[#14111d] text-[#14111d] text-[9px] font-black leading-none" data-index-tab-maxed="true">MAXED</span>' : ''}
            ${this.buildTabReadyDotHtml('limited')}
          </button>`;
          })()}
        </div>

        ${this.buildMilestoneRewardsStripHtml()}

        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-0 @max-[920px]:min-h-[200px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-index-grid="true">
            ${this.buildIndexCardsHtml()}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-index-inspector="true">
            ${inspHtml}
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
    if (typeof document === 'undefined') return;
    document.querySelectorAll<HTMLDialogElement>('dialog[data-chibi-review-dialog="true"]').forEach((dlg) => {
      if (dlg.open) dlg.close();
      dlg.remove();
    });
  }

  private openChibiReviewDialog(chibiId: string): void {
    if (typeof document === 'undefined') return;
    const chibi = getChibiById(chibiId);
    if (!chibi) return;

    this.closeReviewDialog();

    const rarity = getMinerRarity(chibi.id);
    const borderColor = RARITY_BORDER[rarity];
    const unlocked = this.state.discovered.has(chibi.id);
    const worldDef = getWorldById(
      getMinerWorldId(chibi.id) ??
        (this.indexWorldId === 'weather' || this.indexWorldId === 'fusion' || this.indexWorldId === 'limited'
          ? 'underground'
          : this.indexWorldId)
    );
    const smoothCls = chibi.smoothFilter ? ' class="mam-chibi-smooth"' : '';
    const poses: Array<[string, string]> = [
      ['Idle', chibi.poses.idle],
      ['Walk', chibi.poses.walk],
      ['Attack', chibi.poses.attack],
      ['Pose', chibi.poses.pose],
    ];

    const dialog = document.createElement('dialog');
    dialog.className = 'mam-review-dialog mam-modal text-[#14111d]';
    dialog.dataset.modalTheme = 'index';
    dialog.dataset.chibiReviewDialog = 'true';
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-labelledby', 'mam-review-title');

    dialog.innerHTML = `
      <div class="mam-modal-surface" aria-hidden="true"></div>
      <div class="mam-modal-rails" aria-hidden="true">
        <span class="mam-rail-stud is-tl"></span>
        <span class="mam-rail-stud is-tr"></span>
        <span class="mam-rail-stud is-bl"></span>
        <span class="mam-rail-stud is-br"></span>
      </div>
      <div class="mam-modal-rail-head">
        <span class="mam-wing-rail is-left" aria-hidden="true"></span>
        <div class="mam-title-plaque">
          <span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${hudIconHtml('indexBook', 22, 'Review')}</span>
          <span id="mam-review-title">${chibi.name} — Pose Review</span>
        </div>
        <span class="mam-wing-rail is-right" aria-hidden="true"></span>
        <form method="dialog" class="m-0 pointer-events-auto">
          <button type="submit" class="${TW_CLOSE_BTN} mam-close-rail-btn" aria-label="Close Review" autofocus>✕</button>
        </form>
      </div>

      <div class="flex items-center justify-between gap-2 flex-wrap px-1">
        <div class="flex items-center gap-2 flex-wrap">
          ${renderRarityBadgeHtml(rarity)}
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border-2 border-[#14111d] ${unlocked ? 'bg-[#6ee7b7] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${unlocked ? 'Discovered' : 'Locked • Full Preview'}</span>
          <span class="text-[12px] font-black text-[#5b526e]">${worldDef.name} • Base DPS <span class="text-[#d97706] font-black">${fmtShort(chibi.baseDps)}/s</span></span>
        </div>
      </div>

      <div class="mam-review-poses-grid flex-1 min-h-0 grid grid-cols-4 gap-3 w-full overflow-y-auto mam-no-scrollbar">
        ${poses
          .map(
            ([label, url]) => `
            <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-[#ffffff] p-2.5 flex flex-col items-center gap-2" style="background:radial-gradient(circle at 50% 44%,${borderColor}28,#ffffff 84%)">
              <div class="mam-review-pose-art w-full h-[210px] flex items-center justify-center overflow-hidden">
                <div class="mam-chibi-portrait"><img src="${assetUrl(url)}" alt="${chibi.name} ${label}"${smoothCls} draggable="false" /></div>
              </div>
              <span class="px-3 py-0.5 rounded-full bg-[#14111d] text-[12px] font-black tracking-wide text-[#fff8e7] uppercase">${label}</span>
            </div>
          `
          )
          .join('')}
      </div>
    `;

    const isOutsideDialog = (e: PointerEvent): boolean => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutsideDialog(e);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutsideDialog(e)) dialog.close();
        pressedOutside = false;
      });
    }

    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
      dialog.remove();
    });

    document.body.appendChild(dialog);
    audio.playSfx('ui-open');
    dialog.showModal();
  }

  private bindIndexInspectorEvents(scope: ParentNode): void {
    scope.querySelectorAll<HTMLElement>('[data-review-chibi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reviewChibi;
        if (!id) return;
        this.openChibiReviewDialog(id);
      });
    });
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
      const wBadge = root.querySelector<HTMLElement>(`[data-index-world-count="${w.id}"]`);
      if (wBadge) {
        const wp = this.state.getWorldIndexProgress(w.id);
        wBadge.textContent = `(${wp.found}/${wp.total})`;
      }
    }
    for (const tabId of ['weather', 'fusion', 'limited'] as const) {
      const badge = root.querySelector<HTMLElement>(`[data-index-tab-count="${tabId}"]`);
      if (badge) {
        const tp = this.state.getIndexTabProgress(tabId);
        badge.textContent = `(${tp.found}/${tp.total})`;
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
