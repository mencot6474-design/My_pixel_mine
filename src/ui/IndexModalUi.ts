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
  WorldId,
  WORLDS,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { getWeatherById } from '../game/WeatherData';
import { hudIconHtml, meteorIconHtml, oreIconSvg } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  rarityCardClasses,
  rarityVars,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  TW_CLOSE_BTN,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

type IndexTabId = WorldId | 'weather' | 'fusion' | 'limited';

export class IndexModalUi {
  private indexWorldId: IndexTabId = 'underground';
  private indexInspectId: string | null = null;
  private lastIndexInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly onRequestRender: () => void
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

  private renderIndexCard(opts: {
    id: string;
    name: string;
    rarity: ItemRarity;
    title: string;
    artHtml: string;
    bottomHtml: string;
    unlocked: boolean;
    selected: boolean;
  }): string {
    const extraCls = `${opts.unlocked ? '' : 'locked'} ${
      opts.selected ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.45)]' : ''
    }`.trim();
    return `
      <div class="${rarityCardClasses(opts.rarity, extraCls)}" style="${rarityVars(opts.rarity)}" data-index-id="${opts.id}" title="${opts.title}">
        <div class="mam-card-art">${opts.artHtml}</div>
        <div class="mam-card-name mam-outline-sm">${opts.name}</div>
        <div class="mam-card-bottom">${opts.bottomHtml}</div>
      </div>
    `;
  }

  private renderReviewActionButton(chibiId: string, label: string, variant: 'special' | 'standard'): string {
    if (variant === 'special') {
      return `
        <button type="button" class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border border-[#c084fc]/65 bg-[linear-gradient(135deg,#9333ea_0%,#4f46e5_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-2px_rgba(147,51,234,0.45)] text-white text-[13px] font-black cursor-pointer inline-flex items-center justify-center gap-1.5 transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] mam-outline-sm" data-review-chibi="${chibiId}">
          <span>${label}</span>
        </button>
      `;
    }
    return `
      <button
        type="button"
        class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border border-sky-300/60 bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_12px_-2px_rgba(56,189,248,0.4)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
        data-review-chibi="${chibiId}"
      >${label}</button>
    `;
  }

  private buildIndexInspectorHtml(): string {
    const targetId = this.getResolvedIndexInspectId();
    if (!targetId) return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');

    const unlocked = this.state.discovered.has(targetId);
    const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${unlocked ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#94a3b8]'}">${unlocked ? 'Discovered' : 'Locked'}</span>`;

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
            ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#facc15]'],
            ['Stars', '★★★★★ (Max 5★)', 'text-amber-300'],
            ['Trade', 'Non-Sellable', 'text-rose-300'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-white'],
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
            ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#facc15]'],
            ['Passive', recipe.passive.label, 'text-cyan-300'],
            ['Gem Cost', fmtInt(recipe.gemCost), 'text-sky-300'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-white'],
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
            ['Source', wOre.meteorName, 'text-[#7dd3fc]'],
            ['Base Value', fmtMoney(wOre.sellValue), 'text-[#e2e8f0]'],
            ['Your Value', fmtMoney(effVal), 'text-[#4ade80]'],
            ['Owned', `Bag ${fmtInt(bagQty)} • Chest ${fmtInt(chestQty)}`, 'text-[#facc15]'],
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
            ['Drop Chance', fmtPct(wMiner.chancePct), 'text-[#7dd3fc]'],
            ['Base DPS', `${fmtShort(wMiner.chibi.baseDps)}/s`, 'text-[#facc15]'],
            ['Sell Value', fmtMoney(getMinerSellValue(wMiner.chibi.id)), 'text-[#4ade80]'],
            ['Owned', `x${fmtInt(owned)} (${fmtInt(onPlot)} on Plot)`, 'text-white'],
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
          ['Drop Chance', fmtPct(ore.chancePct), 'text-[#7dd3fc]'],
          ['Base Value', fmtMoney(ore.sellValue), 'text-[#e2e8f0]'],
          ['Your Value', fmtMoney(effVal), 'text-[#4ade80]'],
          ['Owned', `Bag ${fmtInt(bagQty)} • Chest ${fmtInt(chestQty)}`, 'text-[#facc15]'],
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
          ['Drop Chance', fmtPct(entry.chancePct), 'text-[#7dd3fc]'],
          ['Base DPS', `${fmtShort(chibi.baseDps)}/s`, 'text-[#facc15]'],
          ['Sell Value', fmtMoney(getMinerSellValue(chibi.id)), 'text-[#4ade80]'],
          ['Owned', `x${fmtInt(owned)} (${fmtInt(onPlot)} on Plot)`, 'text-white'],
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
            bottomHtml: `<span class="mam-limited-badge !px-1.5 !py-[1px] !text-[8px] mb-0.5">✦ LIMITED</span><span class="mam-card-pct mam-outline-sm">${fmtShort(chibi.baseDps)}/s</span>`,
            unlocked: this.state.discovered.has(chibi.id),
            selected: selectedId === chibi.id,
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
          bottomHtml: `<span class="mam-fusion-badge !px-1.5 !py-[1px] !text-[8px] mb-0.5">✦ FUSION</span><span class="mam-card-pct mam-outline-sm">${fmtShort(chibi.baseDps)}/s</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
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
          bottomHtml: `<span class="mam-card-pct mam-outline-sm">${wDef.shortName}</span>`,
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
            bottomHtml: `<span class="mam-card-pct mam-outline-sm">${wDef.shortName}</span>`,
            unlocked: this.state.discovered.has(chibi.id),
            selected: selectedId === chibi.id,
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
          bottomHtml: `<span class="mam-card-pct mam-outline-sm">${fmtPct(ore.chancePct)}</span>`,
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
          bottomHtml: `<span class="mam-card-pct mam-outline-sm">${fmtPct(entry.chancePct)}</span>`,
          unlocked: this.state.discovered.has(chibi.id),
          selected: selectedId === chibi.id,
        })
      )
      .join('');

    return `${oreCards}${minerCards}`;
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
        <div class="relative flex-1 max-w-[440px] h-7 rounded-full bg-[rgba(12,15,28,0.85)] border border-white/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.65)] overflow-hidden flex items-center justify-center backdrop-blur-md">
          <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#a855f7,#ec4899,#38bdf8)] rounded-full transition-[width] duration-250 ease-out shadow-[0_0_12px_rgba(192,132,252,0.55)]" data-index-fill="true" style="width:${pct}%"></div>
          <div class="relative z-[2] w-full px-3.5 flex items-center justify-between text-[14px] font-extrabold mam-outline-sm" data-index-progress-text="true">
            <span></span>
            <span>${found}/${total} Found</span>
            <span>${pct}%</span>
          </div>
        </div>
      `,
      bodyHtml: `
        <div class="flex items-center gap-2 flex-wrap">
          ${WORLDS.map((w) => {
            const wp = this.state.getWorldIndexProgress(w.id);
            return `
            <button class="${TW_TAB_BTN} mam-outline-sm ${this.indexWorldId === w.id ? 'active' : ''}" data-index-world="${w.id}">
              <span>${w.name}</span>
              <span class="text-[11px] font-bold opacity-85" data-index-world-count="${w.id}">(${wp.found}/${wp.total})</span>
            </button>
          `;
          }).join('')}
          <button class="${TW_TAB_BTN} mam-outline-sm ${this.indexWorldId === 'weather' ? 'active' : ''}" data-index-world="weather">
            <span class="inline-flex items-center gap-1">${meteorIconHtml('celestial', 16, 'Weather')} Weather</span>
            <span class="text-[11px] font-bold opacity-85">(${WEATHER_ORES.filter((o) => this.state.discovered.has(o.id)).length + getWeatherLimitedMiners().filter((m) => this.state.discovered.has(m.chibi.id)).length}/${WEATHER_ORES.length + getWeatherLimitedMiners().length})</span>
          </button>
          <button class="${TW_TAB_BTN} mam-outline-sm ${this.indexWorldId === 'fusion' ? 'active' : ''}" data-index-world="fusion">
            <span class="inline-flex items-center gap-1">✦ Fusion</span>
            <span class="text-[11px] font-bold opacity-85">(${FUSION_RECIPES.filter((r) => this.state.discovered.has(r.resultChibiId)).length}/${FUSION_RECIPES.length})</span>
          </button>
          <button class="${TW_TAB_BTN} mam-outline-sm ${this.indexWorldId === 'limited' ? 'active' : ''}" data-index-world="limited">
            <span class="inline-flex items-center gap-1 text-amber-200">★ Limited</span>
            <span class="text-[11px] font-bold opacity-85">(${getDailyLoginLimitedChibiIds().filter((id) => this.state.discovered.has(id)).length}/${getDailyLoginLimitedChibiIds().length})</span>
          </button>
        </div>

        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-0 @max-[920px]:min-h-[200px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-index-grid="true">
            ${this.buildIndexCardsHtml()}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-index-inspector="true">
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
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
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
    dialog.className = 'mam-review-dialog mam-modal text-white';
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
        <div class="mam-title-plaque">
          <span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${hudIconHtml('indexBook', 22, 'Review')}</span>
          <span id="mam-review-title">${chibi.name} — Pose Review</span>
        </div>
        <form method="dialog" class="m-0 pointer-events-auto">
          <button type="submit" class="${TW_CLOSE_BTN} mam-close-rail-btn" aria-label="Close Review" autofocus>✕</button>
        </form>
      </div>

      <div class="flex items-center justify-between gap-2 flex-wrap px-1">
        <div class="flex items-center gap-2 flex-wrap">
          ${
            rarity === 'fusion'
              ? `<span class="mam-fusion-badge">✦ FUSION</span>`
              : rarity === 'limited'
                ? `<span class="mam-limited-badge">✦ LIMITED</span>`
                : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border" style="color:${borderColor};border-color:${borderColor}88;background:${borderColor}20">${rarityLabel}</span>`
          }
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border ${unlocked ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#94a3b8]'}">${unlocked ? 'Discovered' : 'Locked • Full Preview'}</span>
          <span class="text-[12px] font-bold text-[#94a3b8]">${worldDef.name} • Base DPS <span class="text-[#facc15] font-black">${fmtShort(chibi.baseDps)}/s</span></span>
        </div>
      </div>

      <div class="mam-review-poses-grid flex-1 min-h-0 grid grid-cols-4 gap-3 w-full overflow-y-auto mam-no-scrollbar">
        ${poses
          .map(
            ([label, url]) => `
            <div class="rounded-2xl border bg-[rgba(12,16,28,0.88)] p-2.5 flex flex-col items-center gap-2 shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)]" style="border-color:${borderColor}66;background:radial-gradient(circle at 50% 44%,${borderColor}26,rgba(10,14,24,0.94) 80%)">
              <div class="mam-review-pose-art w-full h-[210px] flex items-center justify-center overflow-hidden">
                <div class="mam-chibi-portrait"><img src="${assetUrl(url)}" alt="${chibi.name} ${label}"${smoothCls} draggable="false" /></div>
              </div>
              <span class="px-3 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-[12px] font-black tracking-wide text-white uppercase mam-outline-sm">${label}</span>
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
    const spans = root.querySelectorAll<HTMLElement>('[data-index-progress-text="true"] span');
    if (spans.length >= 3) {
      spans[1].textContent = `${found}/${total} Found`;
      spans[2].textContent = `${pct}%`;
    }

    for (const w of WORLDS) {
      const wBadge = root.querySelector<HTMLElement>(`[data-index-world-count="${w.id}"]`);
      if (wBadge) {
        const wp = this.state.getWorldIndexProgress(w.id);
        wBadge.textContent = `(${wp.found}/${wp.total})`;
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
