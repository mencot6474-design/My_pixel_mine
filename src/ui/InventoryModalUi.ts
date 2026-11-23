import { audio } from '../audio/AudioManager';
import { CHIBI_CATALOG, ChibiDef, getChibiById } from '../game3d/ChibiCatalog';
import {
  GEM_SHOP_ITEMS,
  getChibiStarTier,
  getGemShopItemById,
  getMinerRarity,
  getMinerWorldId,
  getNextChibiStarTier,
  getOreById,
  getWorldById,
  RARITY_BORDER,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
import { isTeamPresetPopulated, TEAM_PRESET_COUNT } from '../game/TeamPresetsDomain';
import { gemPotionIconHtml, hudIconHtml, oreIconSvg } from './HudIcons';
import {
  applyInspectRing,
  chibiPortraitHtml,
  InvTab,
  rarityCardClasses,
  rarityVars,
  refreshPotionTimersInDom,
  renderEmptyInspectorPanel,
  renderInspectorPanel,
  renderModalShell,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

/** Orders Backpack Chibis with Hotbar-equipped Chibis first in consecutive slot order (1..9), followed by remaining Chibis sorted by effective DPS. */
export function sortInventoryMiners<T extends { def: ChibiDef; effDps: number }>(
  items: readonly T[],
  hotbar: readonly (string | null)[]
): T[] {
  return [...items].sort((a, b) => {
    const aIdx = hotbar.indexOf(a.def.id);
    const bIdx = hotbar.indexOf(b.def.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return b.effDps - a.effDps;
  });
}

export class InventoryModalUi {
  private invTab: InvTab = 'all';
  private invSearch = '';
  private invInspectTarget: { kind: 'miner' | 'ore' | 'gem-item'; id: string } | null = null;
  private lastInvCardsHtml = '';
  private lastInvInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void
  ) {}

  private getResolvedInvInspectTarget(): { kind: 'miner' | 'ore' | 'gem-item'; id: string } | null {
    const t = this.invInspectTarget;
    if (t) {
      if (t.kind === 'miner' && (this.state.miners[t.id] || 0) > 0 && getChibiById(t.id)) return t;
      if (t.kind === 'ore' && (this.state.ores[t.id] || 0) > 0 && getOreById(t.id)) return t;
      if (t.kind === 'gem-item' && (this.state.others[t.id] || 0) > 0 && getGemShopItemById(t.id)) return t;
    }

    const q = this.invSearch.trim().toLowerCase();
    if (this.invTab === 'all' || this.invTab === 'miners') {
      const sortedMiners = sortInventoryMiners(
        Object.entries(this.state.miners)
          .filter(([, qty]) => qty > 0)
          .map(([id]) => getChibiById(id))
          .filter((d): d is NonNullable<typeof d> => Boolean(d))
          .filter((d) => !q || d.name.toLowerCase().includes(q))
          .map((def) => {
            const star = this.state.getChibiStar(def.id);
            const effDps = Math.round(
              this.state.getEffectiveChibiDps(def.id) * getChibiStarTier(star).dmgMult
            );
            return { def, effDps };
          }),
        this.state.hotbar
      );
      const firstMiner = sortedMiners[0]?.def;
      if (firstMiner) {
        this.invInspectTarget = { kind: 'miner', id: firstMiner.id };
        return this.invInspectTarget;
      }
    }
    if (this.invTab === 'all' || this.invTab === 'other') {
      const firstPot = GEM_SHOP_ITEMS.find(
        (p) => (this.state.others[p.id] || 0) > 0 && (!q || p.name.toLowerCase().includes(q))
      );
      if (firstPot) {
        this.invInspectTarget = { kind: 'gem-item', id: firstPot.id };
        return this.invInspectTarget;
      }
    }
    if (this.invTab === 'all' || this.invTab === 'ores') {
      const firstOre = Object.entries(this.state.ores)
        .filter(([, qty]) => qty > 0)
        .map(([id]) => getOreById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .filter((d) => !q || d.name.toLowerCase().includes(q))
        .sort((a, b) => b.sellValue - a.sellValue)[0];
      if (firstOre) {
        this.invInspectTarget = { kind: 'ore', id: firstOre.id };
        return this.invInspectTarget;
      }
    }
    this.invInspectTarget = null;
    return null;
  }

  private buildInventoryInspectorHtml(): string {
    const target = this.getResolvedInvInspectTarget();
    if (!target) return renderEmptyInspectorPanel('Your Backpack is empty. Mine ores or collect Chest items!');

    if (target.kind === 'miner') {
      const def = getChibiById(target.id);
      if (!def) return renderEmptyInspectorPanel('Select any item to inspect details.');
      const qty = this.state.miners[def.id] || 0;
      const rarity = getMinerRarity(def.id);
      const hotbarIdx = this.state.hotbar.indexOf(def.id);
      const isEq = hotbarIdx !== -1;
      const onPlot = this.state.plotMiners.filter((id) => id === def.id).length;
      const star = this.state.getChibiStar(def.id);
      const starTier = getChibiStarTier(star);
      const nextTier = getNextChibiStarTier(star);
      const spare = this.state.getSpareChibiDuplicates(def.id);
      const worldId = getMinerWorldId(def.id);
      const worldName = worldId ? getWorldById(worldId).name : 'Unknown';
      const canStarUp = Boolean(nextTier && spare >= nextTier.dupCost);
      const starBonusParts = [`+${Math.round((starTier.dmgMult - 1) * 100)}% DPS`];
      if (starTier.miningSpeedBonus > 0) starBonusParts.push(`+${Math.round(starTier.miningSpeedBonus * 100)}% Spd`);
      if (starTier.dropBonusPct > 0) starBonusParts.push(`+${Math.round(starTier.dropBonusPct * 100)}% Drop/Gem`);

      const isTrialOnly = this.state.isTrialOnlyChibi(def.id);
      const trialBadge = isTrialOnly
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-[#14111d] bg-[#fef08a] text-[#78350f]">TRIAL</span>`
        : '';

      return renderInspectorPanel({
        rarity,
        title: def.name,
        subtitle: `Backpack • ${worldName} Miner`,
        badgesHtml: `
          <div class="flex items-center justify-center gap-1 flex-wrap">
            ${trialBadge}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-[#14111d] ${isEq ? 'bg-[#6ee7b7] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${isEq ? `Hotbar #${hotbarIdx + 1}` : 'Not Equipped'}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-[#14111d] ${star > 0 ? 'bg-[#fde047] text-[#14111d]' : 'bg-[#e2e8f0] text-[#5b526e]'}">${'★'.repeat(Math.max(1, star))}${star === 0 ? ' 0' : ` ${star}/5`}</span>
          </div>
        `,
        artHtml: chibiPortraitHtml(def),
        stats: [
          ['Owned', `x${fmtInt(qty)} (${fmtInt(spare)} spare)`, 'text-[#14111d]'],
          ['Effective DPS', `${fmtShort(Math.round(this.state.getEffectiveChibiDps(def.id) * starTier.dmgMult))}/s`, 'text-[#d97706]'],
          ['Star Bonus', star > 0 ? starBonusParts.join(' • ') : 'None (★0)', star > 0 ? 'text-[#b45309]' : 'text-[#5b526e]'],
          ['On Plot', `${fmtInt(onPlot)} placed`, 'text-[#0284c7]'],
        ],
        actionHtml: `
          <div class="flex flex-col gap-1.5">
            <button class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border-2 border-[#14111d] ${isEq ? 'bg-[#ff922b] text-[#14111d]' : 'bg-[#2ee59d] text-[#14111d]'} text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:brightness-105 active:scale-[0.96]" data-insp-inv-action="toggle-miner" data-insp-id="${def.id}">
              ${isEq ? 'Unequip from Hotbar' : 'Equip to Hotbar'}
            </button>
            ${
              isTrialOnly
                ? `<div class="w-full rounded-xl border-2 border-[#14111d] bg-[#fef9c3] px-2 py-1.5 text-[11px] font-black text-[#78350f]">Trial Unit • Read-Only (Not in Index)</div>`
                : `<button class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border-2 border-[#14111d] transition-[transform,filter] duration-150 ease-out ${
                    !nextTier
                      ? 'disabled bg-[#fef08a] text-[#b45309] cursor-default'
                      : canStarUp
                        ? 'bg-[#fde047] text-[#14111d] cursor-pointer hover:brightness-105 active:scale-[0.96]'
                        : 'disabled bg-[#e2e8f0] text-[#64748b] border-[#94a3b8] cursor-not-allowed opacity-75'
                  } text-[12.5px] font-black" data-insp-inv-action="star-up-miner" data-insp-id="${def.id}" ${!nextTier || !canStarUp ? 'disabled' : ''}>
                    ${
                      nextTier
                        ? `★ Star Up → ★${nextTier.star} (${fmtInt(spare)}/${nextTier.dupCost} dupes)`
                        : '★ MAX STAR (★5) ★'
                    }
                  </button>`
            }
          </div>
        `,
      });
    }

    if (target.kind === 'ore') {
      const def = getOreById(target.id);
      if (!def) return renderEmptyInspectorPanel('Select any item to inspect details.');
      const qty = this.state.ores[def.id] || 0;
      const unitVal = this.state.getEffectiveOreSellValue(def.id);
      const totalVal = unitVal * qty;
      const worldName = getWorldById(def.worldId).name;

      return renderInspectorPanel({
        rarity: def.rarity,
        title: def.name,
        subtitle: `Backpack • ${worldName} Ore`,
        badgesHtml: '<span class="mam-pill rounded-full text-[10px] font-black border-2 border-[#14111d] bg-[#fcecc8] text-[#14111d]">In Bag</span>',
        artHtml: oreIconSvg(def.color, def.secondaryColor, def.rarity, `inv_${def.id}`),
        stats: [
          ['Quantity', `x${fmtInt(qty)}`, 'text-[#14111d]'],
          ['Drop Rate', fmtPct(def.chancePct), 'text-[#0284c7]'],
          ['Unit Value', fmtMoney(unitVal), 'text-[#15803d]'],
          ['Stack Value', fmtMoney(totalVal), 'text-[#b45309]'],
        ],
        actionHtml: `
          <button class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border-[2.5px] border-[#14111d] bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] text-[13px] font-black cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.97] active:scale-[0.94]" data-insp-inv-action="sell-ore-all" data-insp-id="${def.id}">
            Sell All
          </button>
        `,
      });
    }

    const pot = getGemShopItemById(target.id);
    if (!pot) return renderEmptyInspectorPanel('Select any item to inspect details.');
    const qty = this.state.others[pot.id] || 0;
    const rem = this.state.getBoostRemainingSec(pot.id);
    const isActive = rem > 0;
    const mm = Math.floor(rem / 60);
    const ss = String(rem % 60).padStart(2, '0');

    return renderInspectorPanel({
      rarity: pot.rarity,
      title: pot.name,
      subtitle: 'Backpack • Boost Potion',
      badgesHtml: isActive
        ? `<span class="mam-pill rounded-full text-[10px] font-black bg-[#bbf7d0] border-2 border-[#14111d] text-[#14532d] tabular-nums">Active ${mm}:${ss}</span>`
        : `<span class="mam-pill rounded-full text-[10px] font-black bg-[#fcecc8] border-2 border-[#14111d] text-[#14111d]">Ready</span>`,
      artHtml: gemPotionIconHtml(pot.id, 84, pot.name, pot.color),
      stats: [
        ['In Bag', `x${fmtInt(qty)}`, 'text-[#14111d]'],
        ['Duration', pot.durationLabel, 'text-[#0284c7]'],
        ['Effect', pot.effectText, 'text-[#15803d]'],
        ['Timer', isActive ? `${mm}:${ss}` : 'Inactive', isActive ? 'text-[#15803d]' : 'text-[#64748b]'],
      ],
      actionHtml: `
        <button class="mam-sheen-hover relative overflow-hidden w-full h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] text-[14px] font-black cursor-pointer transition-transform duration-150 ease-out hover:scale-[0.97] hover:rotate-[1deg] active:scale-[0.94]" data-insp-inv-action="use-potion" data-insp-id="${pot.id}">
          Use Potion (x${fmtInt(qty)})
        </button>
      `,
    });
  }

  private buildInventoryCardsHtml(): string {
    const q = this.invSearch.trim().toLowerCase();
    const cards: string[] = [];
    const selTarget = this.invInspectTarget;

    if (this.invTab === 'all' || this.invTab === 'miners') {
      const minerList = sortInventoryMiners(
        Object.entries(this.state.miners)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => {
            const def = getChibiById(id) ?? CHIBI_CATALOG[0];
            const star = this.state.getChibiStar(def.id);
            const effDps = Math.round(
              this.state.getEffectiveChibiDps(def.id) * getChibiStarTier(star).dmgMult
            );
            return { def, qty, star, effDps };
          }),
        this.state.hotbar
      );

      for (const { def, qty, star, effDps } of minerList) {
        if (q && !def.name.toLowerCase().includes(q)) continue;
        const rarity = getMinerRarity(def.id);
        const hotbarIdx = this.state.hotbar.indexOf(def.id);
        const isEquipped = hotbarIdx !== -1;
        const isInsp = selTarget?.kind === 'miner' && selTarget.id === def.id;
        const isHolo =
          star >= 5 ||
          rarity === 'fusion' ||
          rarity === 'limited' ||
          rarity === 'twin' ||
          rarity === 'omega';
        const extraCls = [
          isHolo ? 'is-holo-foil' : '',
          isInsp ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const isTrialOnly = this.state.isTrialOnlyChibi(def.id);
        cards.push(`
          <div class="${rarityCardClasses(rarity, extraCls)}" style="${rarityVars(rarity)}" data-equip-miner="${def.id}" title="Click to Equip / Unequip">
            ${isTrialOnly ? '<span class="mam-pill-xs absolute bottom-1 left-1 z-[4] bg-[#fef08a] text-[#78350f]">TRIAL</span>' : star > 0 ? `<span class="mam-pill-xs absolute bottom-1 left-1 z-[4] bg-[#fde047] text-[#14111d]">★${star}</span>` : ''}
            ${isEquipped ? `<span class="mam-equipped-tag">${hotbarIdx + 1}</span>` : ''}
            <div class="mam-card-art">
              ${chibiPortraitHtml(def)}
            </div>
            <div class="mam-card-name truncate ${isEquipped ? '!text-left pl-1 pr-[22px]' : 'px-1'}">${def.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-dps">${fmtShort(effDps)}</span>
              <span class="mam-card-qty">x${fmtInt(qty)}</span>
            </div>
          </div>
        `);
      }
    }

    if (this.invTab === 'all' || this.invTab === 'other') {
      for (const pot of GEM_SHOP_ITEMS) {
        const qty = this.state.others[pot.id] || 0;
        if (qty <= 0) continue;
        if (q && !pot.name.toLowerCase().includes(q)) continue;
        const isInsp = selTarget?.kind === 'gem-item' && selTarget.id === pot.id;
        cards.push(`
          <div class="${rarityCardClasses(pot.rarity, `${isInsp ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : ''} [&.is-boost-active]:ring-[3px] [&.is-boost-active]:ring-inset [&.is-boost-active]:ring-[#22c55e]`.trim())}" style="${rarityVars(pot.rarity)}" data-inv-potion-card="true" data-inspect-inv-only="gem-item:${pot.id}" title="${pot.name} • ${pot.effectText} ${pot.durationLabel} — Click to Inspect, USE to Activate">
            <button type="button" class="mam-pill-xs absolute top-1 right-1 z-[4] bg-[#38bdf8] text-[#14111d] cursor-pointer hover:bg-[#7dd3fc] hover:scale-95 transition-transform" data-use-potion="${pot.id}">USE</button>
            <div class="mam-card-art">${gemPotionIconHtml(pot.id, 54, pot.name, pot.color)}</div>
            <div class="mam-card-name truncate !text-left pl-1 pr-[34px]">${pot.name}</div>
            <div class="mam-card-bottom">
              <span class="text-[10px] font-black tabular-nums text-[#15803d] leading-[1.05]" data-gem-timer="${pot.id}" data-timer-compact="true"></span>
              <span class="mam-card-qty">x${fmtInt(qty)}</span>
            </div>
          </div>
        `);
      }
    }

    if (this.invTab === 'all' || this.invTab === 'ores') {
      const oreList = Object.entries(this.state.ores)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ def: getOreById(id), qty }))
        .filter((x): x is { def: NonNullable<ReturnType<typeof getOreById>>; qty: number } => Boolean(x.def))
        .sort((a, b) => b.def.sellValue - a.def.sellValue);

      for (const { def, qty } of oreList) {
        if (q && !def.name.toLowerCase().includes(q)) continue;
        const isInsp = selTarget?.kind === 'ore' && selTarget.id === def.id;
        cards.push(`
          <div class="${rarityCardClasses(def.rarity, isInsp ? 'ring-[2.5px] ring-inset ring-[#38bdf8]' : '')}" style="${rarityVars(def.rarity)}" data-inspect-inv-only="ore:${def.id}" title="${def.name} (${fmtMoney(def.sellValue)}) — Click to Inspect">
            <div class="mam-card-art">${oreIconSvg(def.color, def.secondaryColor, def.rarity, `inv_${def.id}`)}</div>
            <div class="mam-card-name truncate px-1">${def.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-val">${fmtMoney(def.sellValue)}</span>
              <span class="mam-card-qty">x${fmtInt(qty)}</span>
            </div>
          </div>
        `);
      }
    }

    return cards.length
      ? cards.join('')
      : '<div class="mam-placeholder-well col-span-full text-center py-10 px-4 text-[#475569] text-[15px] font-black">No matching items in Backpack.</div>';
  }

  private buildTeamPresetsBarHtml(): string {
    const squadIconSvg = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5L16.5 5.2V10.1C16.5 14 13.7 16.9 10 18C6.3 16.9 3.5 14 3.5 10.1V5.2L10 2.5Z" fill="#38bdf8" stroke="#14111d" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 6.2L11.2 8.7L13.9 9.1L11.9 11L12.4 13.7L10 12.4L7.6 13.7L8.1 11L6.1 9.1L8.8 8.7L10 6.2Z" fill="#fde047" stroke="#14111d" stroke-width="1"/></svg>`;
    const saveIconSvg = `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 2.5H11L13.5 5V13.5H3V2.5Z" fill="#ffffff" stroke="#14111d" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 2.5V6H10.5V2.5M5.5 13.5V9.5H10.5V13.5" stroke="#14111d" stroke-width="1.3"/></svg>`;
    const slotPillColors = ['bg-[#7dd3fc]', 'bg-[#d8b4fe]', 'bg-[#6ee7b7]'];

    const itemsHtml = Array.from({ length: TEAM_PRESET_COUNT }, (_, idx) => {
      const preset = this.state.teamPresets[idx];
      const populated = isTeamPresetPopulated(preset);
      const isCurrentActive =
        populated &&
        this.state.plotMiners.every((id, slotIdx) => (id ?? null) === (preset[slotIdx] ?? null));

      const thumbsHtml = populated
        ? preset
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
            .slice(0, 5)
            .map((id) => {
              const chibi = getChibiById(id);
              if (!chibi) return '';
              const r = getMinerRarity(chibi.id);
              const accent = RARITY_BORDER[r];
              return `<span class="w-6 h-6 rounded-md overflow-hidden border-[1.5px] border-[#14111d] inline-flex items-center justify-center shrink-0 [&_.mam-chibi-portrait]:w-full [&_.mam-chibi-portrait]:h-full" style="background:radial-gradient(circle at 50% 45%,${accent}70,#fff8e7 88%)">${chibiPortraitHtml(chibi)}</span>`;
            })
            .join('')
        : `<span class="text-[11px] font-black text-[#5b526e] px-1">Empty</span>`;

      const wrapCls = isCurrentActive
        ? 'border-2 border-[#14111d] bg-[#dcfce7] ring-2 ring-inset ring-[#22c55e]'
        : populated
          ? 'border-2 border-[#14111d] bg-[#fff8e7]'
          : 'border-2 border-dashed border-[#14111d]/40 bg-[#fcecc8]';

      const tBadgeCls = isCurrentActive
        ? 'bg-[#2ee59d] text-[#14111d]'
        : populated
          ? `${slotPillColors[idx % slotPillColors.length]} text-[#14111d]`
          : 'bg-[#ffffff] text-[#5b526e]';

      return `
        <div class="min-w-0 flex items-stretch justify-between rounded-xl overflow-hidden ${wrapCls} transition-colors">
          <button
            type="button"
            class="flex-1 min-w-0 px-2 py-1 inline-flex items-center gap-1.5 text-left cursor-pointer hover:bg-[#fde047]/40 active:scale-[0.98] transition-[background-color,transform] border-0 bg-transparent"
            data-team-preset-load="${idx}"
            title="${populated ? `Equip Team ${idx + 1}` : `Save current plot team to Team ${idx + 1}`}"
          >
            <span class="mam-pill-xs !px-1.5 rounded-md text-[10px] uppercase tracking-wide border-[1.5px] border-[#14111d] shrink-0 ${tBadgeCls}">T${idx + 1}</span>
            <span class="inline-flex items-center gap-1 min-w-0 overflow-hidden">${thumbsHtml}</span>
          </button>
          <button
            type="button"
            class="px-2.5 shrink-0 inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase bg-[#fde047] text-[#14111d] border-l-2 border-[#14111d] cursor-pointer hover:bg-[#facc15] active:scale-95 transition-colors"
            data-team-preset-save="${idx}"
            title="Save current plot team to Team ${idx + 1}"
          >${saveIconSvg}<span>Save</span></button>
        </div>
      `;
    }).join('');

    return `
      <div class="flex flex-col gap-1.5 px-2.5 py-2 rounded-xl bg-[#ffffff] border-2 border-[#14111d]" data-team-presets-bar="true">
        <div class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#14111d]">${squadIconSvg}<span>Team Loadouts</span></span>
          <span class="text-[10.5px] font-bold text-[#5b526e] @max-[640px]:hidden">Click slot to equip • Save overwrites</span>
        </div>
        <div class="grid grid-cols-3 @max-[760px]:grid-cols-1 gap-2 w-full">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  public renderModal(): string {
    this.getResolvedInvInspectTarget();
    const cardsHtml = this.buildInventoryCardsHtml();
    this.lastInvCardsHtml = cardsHtml;
    const inspHtml = this.buildInventoryInspectorHtml();
    this.lastInvInspectorHtml = inspHtml;

    return renderModalShell({
      title: 'Inventory',
      theme: 'inventory',
      iconHtml: hudIconHtml('backpack', 26, 'Inventory'),
      boxClass: `w-[980px] ${TW_SHOP_MODAL_RESP}`,
      headerExtraHtml: `
        <div class="flex items-center gap-1.5">
          <button class="mam-sheen-hover mam-pill-lg relative overflow-hidden gap-1 rounded-xl border-2 border-[#14111d] bg-[#fde047] text-[#14111d] text-[13px] cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 active:scale-[0.94]" data-action="auto-star-up" title="Merge all spare Chibi duplicates into Stars">
            <span>★ Auto Star-Up</span>
          </button>
          <button class="mam-equip-best-btn mam-sheen-hover mam-pill-lg relative overflow-hidden gap-1.5 rounded-xl border-2 border-[#14111d] bg-[#2ee59d] text-[#14111d] text-[13.5px] cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:rotate-1 active:scale-[0.94]" data-action="equip-best">
            ${hudIconHtml('sparkle', 17, 'Equip Best')}
            <span>Equip Best</span>
          </button>
        </div>
      `,
      bodyHtml: `
        <div class="flex items-center gap-2 flex-wrap">
          <button class="${TW_TAB_BTN} ${this.invTab === 'all' ? 'active' : ''}" data-inv-tab="all">All</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'miners' ? 'active' : ''}" data-inv-tab="miners">Miners</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'ores' ? 'active' : ''}" data-inv-tab="ores">Ores</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'other' ? 'active' : ''}" data-inv-tab="other">Other</button>
          <input class="flex-1 min-w-[160px] h-9 px-3.5 rounded-xl border-2 border-[#14111d] bg-[#ffffff] text-[#14111d] text-[14px] font-bold outline-none placeholder:text-[#5b526e]/70 focus:bg-[#fef9c3] transition-colors duration-150" type="search" placeholder="Search items..." value="${this.invSearch.replace(/"/g, '&quot;')}" data-inv-search="true" />
        </div>

        ${this.buildTeamPresetsBarHtml()}

        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto mam-no-scrollbar">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-inv-grid="true">
            ${cardsHtml}
          </div>
          <div class="mam-inspector-well mam-no-scrollbar w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-inv-inspector="true">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

  private bindTeamPresetEvents(root: HTMLElement): void {
    const bar = root.querySelector<HTMLElement>('[data-team-presets-bar="true"]');
    if (!bar) return;

    const refreshBar = () => {
      const next = this.buildTeamPresetsBarHtml();
      const wrap = document.createElement('div');
      wrap.innerHTML = next.trim();
      const nextBar = wrap.firstElementChild as HTMLElement | null;
      if (nextBar && bar.parentElement) {
        bar.replaceWith(nextBar);
        this.bindTeamPresetEvents(root);
      }
    };

    bar.querySelectorAll<HTMLElement>('[data-team-preset-save]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.teamPresetSave ?? -1);
        if (this.state.saveTeamPreset(idx)) {
          audio.playSfx('ui-click');
          this.pushToast(`Saved current plot team to Team ${idx + 1}!`);
          refreshBar();
        } else {
          this.pushToast('Place at least 1 Chibi on a plot first.');
        }
      });
    });

    bar.querySelectorAll<HTMLElement>('[data-team-preset-load]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.teamPresetLoad ?? -1);
        if (!isTeamPresetPopulated(this.state.teamPresets[idx])) {
          if (this.state.saveTeamPreset(idx)) {
            audio.playSfx('ui-click');
            this.pushToast(`Saved current plot team to Team ${idx + 1}!`);
            refreshBar();
          } else {
            this.pushToast('Place at least 1 Chibi on a plot first.');
          }
          return;
        }
        const res = this.state.applyTeamPreset(idx);
        if (res && res.equippedCount > 0) {
          audio.playSfx('ui-open');
          const skipMsg = res.skippedCount > 0 ? ` (${res.skippedCount} unavailable)` : '';
          this.pushToast(`Equipped Team ${idx + 1}: ${res.equippedCount} Chibis${skipMsg}`);
          this.updateLive(root);
        } else {
          this.pushToast(`Team ${idx + 1} has no available Chibis.`);
        }
      });
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-inv-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        this.invTab = (el as HTMLElement).dataset.invTab as InvTab;
        root.querySelectorAll<HTMLElement>('[data-inv-tab]').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.invTab === this.invTab);
        });
        this.updateLive(root);
      });
    });

    const searchInput = root.querySelector<HTMLInputElement>('[data-inv-search="true"]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.invSearch = searchInput.value;
        this.updateLive(root);
      });
    }

    this.bindTeamPresetEvents(root);
    this.bindInventoryGridEvents(root, root);
    const invPanel = root.querySelector<HTMLElement>('[data-inv-inspector="true"]');
    if (invPanel) {
      this.lastInvInspectorHtml = invPanel.innerHTML;
      this.bindInventoryInspectorEvents(root, invPanel);
    }
  }

  private bindInventoryGridEvents(root: HTMLElement, scope: ParentNode): void {
    scope.querySelectorAll('[data-inspect-inv-only]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const raw = (el as HTMLElement).dataset.inspectInvOnly;
        if (!raw) return;
        const colon = raw.indexOf(':');
        if (colon <= 0) return;
        const kind = raw.slice(0, colon) as 'miner' | 'ore' | 'gem-item';
        const id = raw.slice(colon + 1);
        if (!id) return;
        this.invInspectTarget = { kind, id };
        this.refreshInventoryInspectorLive(root);
      });
    });

    scope.querySelectorAll('[data-equip-miner]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.equipMiner;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.invInspectTarget = { kind: 'miner', id };
        this.state.toggleEquipMiner(id);
        this.refreshInventoryInspectorLive(root);
      });
    });

    scope.querySelectorAll('[data-use-potion]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.usePotion;
        if (!id) return;
        this.invInspectTarget = { kind: 'gem-item', id };
        const def = getGemShopItemById(id);
        if (this.state.useGemPotion(id)) {
          audio.playSfx('potion');
          this.pushToast(`${def?.name ?? 'Potion'} activated (${def?.durationLabel ?? ''})!`);
        }
        this.refreshInventoryInspectorLive(root);
      });
    });
  }

  private bindInventoryInspectorEvents(root: HTMLElement, scope: ParentNode): void {
    scope.querySelectorAll('[data-insp-inv-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const btn = el as HTMLElement;
        const act = btn.dataset.inspInvAction;
        const id = btn.dataset.inspId;
        if (!act || !id) return;
        if (act === 'toggle-miner') {
          audio.playSfx('ui-tab');
          this.invInspectTarget = { kind: 'miner', id };
          this.state.toggleEquipMiner(id);
        } else if (act === 'star-up-miner') {
          this.invInspectTarget = { kind: 'miner', id };
          const res = this.state.starUpChibi(id);
          if (res.ok) {
            const def = getChibiById(id);
            audio.playSfx('upgrade');
            this.pushToast(`${def?.name ?? id} reached ★${res.newStar}!`);
            this.updateLive(root);
          } else {
            audio.playSfx('ui-error');
            this.pushToast(res.reason === 'max' ? 'Already MAX ★5!' : 'Not enough spare duplicates!');
          }
        } else if (act === 'sell-ore-all') {
          const def = getOreById(id);
          const earned = this.state.sellOre(id, true);
          if (earned > 0) {
            audio.playSfx('coin');
            this.pushToast(`Sold ${def?.name ?? id} for ${fmtMoney(earned)}!`);
          }
          this.updateLive(root);
        } else if (act === 'use-potion') {
          this.invInspectTarget = { kind: 'gem-item', id };
          const def = getGemShopItemById(id);
          if (this.state.useGemPotion(id)) {
            audio.playSfx('potion');
            this.pushToast(`${def?.name ?? 'Potion'} activated (${def?.durationLabel ?? ''})!`);
          }
        }
        this.refreshInventoryInspectorLive(root);
      });
    });
  }

  public refreshInventoryInspectorLive(root: HTMLElement): void {
    const target = this.getResolvedInvInspectTarget();
    root.querySelectorAll<HTMLElement>('[data-equip-miner]').forEach((el) => {
      applyInspectRing(el, target?.kind === 'miner' && el.dataset.equipMiner === target.id);
    });
    root.querySelectorAll<HTMLElement>('[data-inspect-inv-only]').forEach((el) => {
      const raw = el.dataset.inspectInvOnly ?? '';
      const active =
        (target?.kind === 'ore' && raw === `ore:${target.id}`) ||
        (target?.kind === 'gem-item' && raw === `gem-item:${target.id}`);
      applyInspectRing(el, active);
    });
    const panel = root.querySelector<HTMLElement>('[data-inv-inspector="true"]');
    if (!panel) return;
    const nextHtml = this.buildInventoryInspectorHtml();
    if (this.lastInvInspectorHtml !== nextHtml) {
      this.lastInvInspectorHtml = nextHtml;
      panel.innerHTML = nextHtml;
      this.bindInventoryInspectorEvents(root, panel);
    }
  }

  public updateLive(root: HTMLElement): void {
    const grid = root.querySelector<HTMLElement>('[data-inv-grid="true"]');
    if (!grid) return;
    const nextHtml = this.buildInventoryCardsHtml();
    if (this.lastInvCardsHtml !== nextHtml) {
      const prevScroll = grid.scrollTop;
      this.lastInvCardsHtml = nextHtml;
      grid.innerHTML = nextHtml;
      grid.scrollTop = prevScroll;
      this.bindInventoryGridEvents(root, grid);
    }
    refreshPotionTimersInDom(root, this.state);
    this.refreshInventoryInspectorLive(root);
  }
}
