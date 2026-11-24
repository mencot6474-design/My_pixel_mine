import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { getChibiById } from '../game3d/ChibiCatalog';
import { DAILY_LOGIN_REWARDS } from '../game/DailyLoginData';
import { FUSION_RECIPES } from '../game/FusionData';
import {
  getMinerRarity,
  getMinersByWorld,
  getMinerSellValue,
  getMinerWorldId,
  getOresByWorld,
  getWeatherLimitedMiners,
  getWorldById,
  RARITY_BORDER,
  WEATHER_ORES,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { IndexTabId } from '../game/IndexRewardsDomain';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { getOmegaBossByChibiId } from '../game/OmegaData';
import { getAnomalyChibiById, RIFT_SHARD_PITY_COST } from '../game/AnomalyData';
import { getPremiumShopItemByChibiId } from '../game/PremiumShopData';
import { getWeatherById } from '../game/WeatherData';
import { hudIconHtml, oreIconSvg } from './HudIcons';
import {
  chibiPortraitHtml,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderRarityBadgeHtml,
  TW_CLOSE_BTN,
} from './HudShared';

export class IndexInspectorUi {
  constructor(private readonly state: GameState) {}

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

  public buildInspectorHtml(indexWorldId: IndexTabId, targetId: string | null): string {
    if (!targetId) return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');

    const unlocked = this.state.discovered.has(targetId);
    const statusBadge = `<span class="mam-pill rounded-full text-[10px] font-black border-2 border-[#14111d] ${unlocked ? 'bg-[#6ee7b7] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${unlocked ? 'Discovered' : 'Locked'}</span>`;

    if (indexWorldId === 'anomaly') {
      const anom = getAnomalyChibiById(targetId);
      const chibi = anom ? getChibiById(anom.chibiId) : undefined;
      if (anom && chibi) {
        const owned = this.state.miners[chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
        return renderInspectorPanel({
          rarity: chibi.rarity,
          title: chibi.name,
          subtitle: `${anom.title} • Hourly Rift`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          stats: [
            ['Base DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#b45309]'],
            ['Triple Passive', anom.passiveLabel, 'text-[#0284c7]'],
            ['Source', `Hourly Rift / ${RIFT_SHARD_PITY_COST} Shards`, 'text-[#9333ea]'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(chibi.id, 'Review 4 Poses', 'special'),
          dimmed: !unlocked,
        });
      }
      return renderEmptyInspectorPanel('Select any Anomaly Chibi to inspect details.');
    }

    if (indexWorldId === 'omega') {
      const boss = getOmegaBossByChibiId(targetId);
      const chibi = boss ? getChibiById(boss.chibiId) : undefined;
      if (boss && chibi) {
        const owned = this.state.miners[chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
        const cores = this.state.omegaCores[boss.id] || 0;
        return renderInspectorPanel({
          rarity: chibi.rarity,
          title: chibi.name,
          subtitle: `${boss.bossTitle} • Omega Boss`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          stats: [
            ['Base DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#b45309]'],
            ['Triple Passive', boss.passiveSummary, 'text-[#dc2626]'],
            ['Unlock Cost', `${boss.unlockCoreCost} ${boss.coreName}s (Have ${cores})`, 'text-[#0369a1]'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(chibi.id, 'Review 4 Poses', 'special'),
          dimmed: !unlocked,
        });
      }
      return renderEmptyInspectorPanel('Select any Omega Boss Chibi to inspect details.');
    }

    if (indexWorldId === 'twin') {
      const item = getPremiumShopItemByChibiId(targetId);
      const chibi = item ? getChibiById(item.chibiId) : undefined;
      if (item && chibi) {
        const owned = this.state.miners[chibi.id] || 0;
        const onPlot = this.state.plotMiners.filter((id) => id === chibi.id).length;
        return renderInspectorPanel({
          rarity: chibi.rarity,
          title: chibi.name,
          subtitle: `${item.titleTag} • Spire Shop Duo`,
          badgesHtml: statusBadge,
          artHtml: chibiPortraitHtml(chibi, { usePose: true }),
          stats: [
            ['Base DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#b45309]'],
            ['Passive', item.passiveSummary, 'text-[#0369a1]'],
            ['Shop Cost', `${fmtInt(item.coinCost)} Coins`, 'text-[#be123c]'],
            ['Owned', `${fmtInt(owned)} (${onPlot}/5)`, 'text-[#14111d]'],
          ],
          actionHtml: this.renderReviewActionButton(chibi.id, 'Review 4 Poses', 'special'),
          dimmed: !unlocked,
        });
      }
      return renderEmptyInspectorPanel('Select any Twin Duo Chibi to inspect details.');
    }

    if (indexWorldId === 'limited') {
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
            ['Base DPS', `${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s`, 'text-[#b45309]'],
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

    if (indexWorldId === 'fusion') {
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

    if (indexWorldId === 'weather') {
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

    const worldDef = getWorldById(indexWorldId);

    const ore = getOresByWorld(indexWorldId).find((o) => o.id === targetId);
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

    const minerMatch = getMinersByWorld(indexWorldId).find((m) => m.chibi.id === targetId);
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

  public closeReviewDialog(): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll<HTMLDialogElement>('dialog[data-chibi-review-dialog="true"]').forEach((dlg) => {
      if (dlg.open) dlg.close();
      dlg.remove();
    });
  }

  public openChibiReviewDialog(chibiId: string, indexWorldId: IndexTabId): void {
    if (typeof document === 'undefined') return;
    const chibi = getChibiById(chibiId);
    if (!chibi) return;

    this.closeReviewDialog();

    const rarity = getMinerRarity(chibi.id);
    const borderColor = RARITY_BORDER[rarity];
    const unlocked = this.state.discovered.has(chibi.id);
    const worldDef = getWorldById(
      getMinerWorldId(chibi.id) ??
        (indexWorldId === 'weather' ||
        indexWorldId === 'fusion' ||
        indexWorldId === 'limited' ||
        indexWorldId === 'twin' ||
        indexWorldId === 'omega' ||
        indexWorldId === 'anomaly'
          ? 'underground'
          : indexWorldId)
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
          <span class="text-[12px] font-black text-[#5b526e]">${worldDef.name} • Base DPS <span class="text-[#d97706] font-black">${fmtShort(this.state.getEffectiveChibiDps(chibi.id))}/s</span></span>
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

  public bindEvents(scope: ParentNode, indexWorldId: IndexTabId): void {
    scope.querySelectorAll<HTMLElement>('[data-review-chibi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reviewChibi;
        if (!id) return;
        this.openChibiReviewDialog(id, indexWorldId);
      });
    });
  }
}
