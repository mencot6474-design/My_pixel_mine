import { audio } from '../audio/AudioManager';
import { CHIBI_CATALOG, getChibiById } from '../game3d/ChibiCatalog';
import {
  GEM_SHOP_ITEMS,
  getChibiStarTier,
  getGemShopItemById,
  getMinerRarity,
  getMinerWorldId,
  getNextChibiStarTier,
  getOreById,
  getWorldById,
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
      const firstMiner = Object.entries(this.state.miners)
        .filter(([, qty]) => qty > 0)
        .map(([id]) => getChibiById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .filter((d) => !q || d.name.toLowerCase().includes(q))
        .sort((a, b) => b.baseDps - a.baseDps)[0];
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

      return renderInspectorPanel({
        rarity,
        title: def.name,
        subtitle: `Backpack • ${worldName} Miner`,
        badgesHtml: `
          <div class="flex items-center justify-center gap-1 flex-wrap">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${isEq ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#cbd5e1]'}">${isEq ? `Hotbar #${hotbarIdx + 1}` : 'Not Equipped'}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${star > 0 ? 'bg-amber-500/20 border-amber-400/70 text-amber-300' : 'bg-[#1e293b] border-[#475569] text-[#94a3b8]'}">${'★'.repeat(Math.max(1, star))}${star === 0 ? ' 0' : ` ${star}/5`}</span>
          </div>
        `,
        artHtml: chibiPortraitHtml(def),
        stats: [
          ['Owned', `x${fmtInt(qty)} (${fmtInt(spare)} spare)`, 'text-white'],
          ['Effective DPS', `${fmtShort(Math.round(def.baseDps * starTier.dmgMult))}/s`, 'text-[#facc15]'],
          ['Star Bonus', star > 0 ? starBonusParts.join(' • ') : 'None (★0)', star > 0 ? 'text-amber-300' : 'text-[#94a3b8]'],
          ['On Plot', `${fmtInt(onPlot)} placed`, 'text-[#7dd3fc]'],
        ],
        actionHtml: `
          <div class="flex flex-col gap-1.5">
            <button class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-[7px] border-2 ${isEq ? 'border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)] shadow-[0_3px_0_#7c2d12]' : 'border-[#14532d] bg-[linear-gradient(180deg,#4ade80,#16a34a)] shadow-[0_3px_0_#14532d]'} text-white text-[13px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] mam-outline-sm" data-insp-inv-action="toggle-miner" data-insp-id="${def.id}">
              ${isEq ? 'Unequip from Hotbar' : 'Equip to Hotbar'}
            </button>
            <button class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-[7px] border-2 transition-[transform,filter,box-shadow] duration-150 ease-out ${
              !nextTier
                ? 'disabled border-amber-600/60 bg-amber-950/60 text-amber-300 cursor-default'
                : canStarUp
                  ? 'border-[#854d0e] bg-[linear-gradient(180deg,#facc15,#eab308)] shadow-[0_3px_0_#854d0e] text-[#1e293b] cursor-pointer hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]'
                  : 'disabled border-slate-700 bg-slate-800/80 text-slate-400 cursor-not-allowed opacity-75'
            } text-[12.5px] font-black" data-insp-inv-action="star-up-miner" data-insp-id="${def.id}" ${!nextTier || !canStarUp ? 'disabled' : ''}>
              ${
                nextTier
                  ? `★ Star Up → ★${nextTier.star} (${fmtInt(spare)}/${nextTier.dupCost} dupes)`
                  : '★ MAX STAR (★5) ★'
              }
            </button>
          </div>
        `,
      });
    }

    if (target.kind === 'ore') {
      const def = getOreById(target.id);
      if (!def) return renderEmptyInspectorPanel('Select any item to inspect details.');
      const qty = this.state.ores[def.id] || 0;
      const hotbarIdx = this.state.hotbar.indexOf(def.id);
      const isEq = hotbarIdx !== -1;
      const unitVal = this.state.getEffectiveOreSellValue(def.id);
      const totalVal = unitVal * qty;
      const worldName = getWorldById(def.worldId).name;

      return renderInspectorPanel({
        rarity: def.rarity,
        title: def.name,
        subtitle: `Backpack • ${worldName} Ore`,
        badgesHtml: `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${isEq ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#cbd5e1]'}">${isEq ? `Hotbar #${hotbarIdx + 1}` : 'In Bag'}</span>`,
        artHtml: oreIconSvg(def.color, def.secondaryColor, def.rarity, `inv_${def.id}`),
        stats: [
          ['Quantity', `x${fmtInt(qty)}`, 'text-white'],
          ['Drop Rate', fmtPct(def.chancePct), 'text-[#7dd3fc]'],
          ['Unit Value', fmtMoney(unitVal), 'text-[#4ade80]'],
          ['Stack Value', fmtMoney(totalVal), 'text-[#facc15]'],
        ],
        actionHtml: `
          <div class="grid grid-cols-2 gap-1.5">
            <button class="mam-sheen-hover relative overflow-hidden h-9 rounded-[7px] border-2 ${isEq ? 'border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)]' : 'border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8,#0284c7)]'} text-white text-[12.5px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] mam-outline-sm" data-insp-inv-action="toggle-ore" data-insp-id="${def.id}">
              ${isEq ? 'Unequip' : 'Equip'}
            </button>
            <button class="mam-sheen-hover relative overflow-hidden h-9 rounded-[7px] border-2 border-[#14532d] bg-[linear-gradient(180deg,#4ade80,#16a34a)] text-white text-[12.5px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] mam-outline-sm" data-insp-inv-action="sell-ore-all" data-insp-id="${def.id}">
              Sell All
            </button>
          </div>
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
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#14532d]/60 border border-[#4ade80]/70 text-[#86efac] tabular-nums">Active ${mm}:${ss}</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1e293b] border border-[#475569] text-[#cbd5e1]">Ready</span>`,
      artHtml: gemPotionIconHtml(pot.id, 84, pot.name, pot.color),
      stats: [
        ['In Bag', `x${fmtInt(qty)}`, 'text-white'],
        ['Duration', pot.durationLabel, 'text-[#7dd3fc]'],
        ['Effect', pot.effectText, 'text-[#4ade80]'],
        ['Timer', isActive ? `${mm}:${ss}` : 'Inactive', isActive ? 'text-[#4ade80]' : 'text-[#94a3b8]'],
      ],
      actionHtml: `
        <button class="mam-sheen-hover relative overflow-hidden w-full h-10 rounded-[7px] border-2 border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8,#0284c7)] shadow-[0_3px_0_#075985] text-white text-[14px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] mam-outline-sm" data-insp-inv-action="use-potion" data-insp-id="${pot.id}">
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
      const minerList = Object.entries(this.state.miners)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const def = getChibiById(id) ?? CHIBI_CATALOG[0];
          const star = this.state.getChibiStar(def.id);
          const effDps = Math.round(def.baseDps * getChibiStarTier(star).dmgMult);
          return { def, qty, star, effDps };
        })
        .sort((a, b) => b.effDps - a.effDps);

      for (const { def, qty, star, effDps } of minerList) {
        if (q && !def.name.toLowerCase().includes(q)) continue;
        const rarity = getMinerRarity(def.id);
        const hotbarIdx = this.state.hotbar.indexOf(def.id);
        const isEquipped = hotbarIdx !== -1;
        const isInsp = selTarget?.kind === 'miner' && selTarget.id === def.id;
        cards.push(`
          <div class="${rarityCardClasses(rarity, isInsp ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : '')}" style="${rarityVars(rarity)}" data-equip-miner="${def.id}" title="Click to Equip / Unequip">
            ${star > 0 ? `<span class="absolute bottom-1 left-1 z-[4] px-1 py-px rounded bg-amber-500/90 border border-amber-200/70 text-[#0f172a] text-[9px] font-black leading-none">★${star}</span>` : ''}
            ${isEquipped ? `<span class="mam-equipped-tag">${hotbarIdx + 1}</span>` : ''}
            <div class="mam-card-art">
              ${chibiPortraitHtml(def)}
            </div>
            <div class="mam-card-name mam-outline-sm truncate ${isEquipped ? '!text-left pl-1 pr-[22px]' : 'px-1'}">${def.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-dps mam-outline-sm">${fmtShort(effDps)}</span>
              <span class="mam-card-qty mam-outline-sm">x${fmtInt(qty)}</span>
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
          <div class="${rarityCardClasses(pot.rarity, `${isInsp ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : ''} [&.is-boost-active]:shadow-[inset_0_0_12px_rgba(74,222,128,0.35)]`.trim())}" style="${rarityVars(pot.rarity)}" data-inv-potion-card="true" data-inspect-inv-only="gem-item:${pot.id}" title="${pot.name} • ${pot.effectText} ${pot.durationLabel} — Click to Inspect, USE to Activate">
            <button type="button" class="absolute top-0.5 right-[3px] z-[4] px-1 py-px rounded bg-[#0284c7] border border-[#082f49] text-[9px] font-black text-white cursor-pointer hover:brightness-110" data-use-potion="${pot.id}">USE</button>
            <div class="mam-card-art">${gemPotionIconHtml(pot.id, 54, pot.name, pot.color)}</div>
            <div class="mam-card-name mam-outline-sm truncate !text-left pl-1 pr-[32px]">${pot.name}</div>
            <div class="mam-card-bottom">
              <span class="text-[10px] font-black tabular-nums text-[#4ade80] leading-[1.05] mam-outline-sm" data-gem-timer="${pot.id}" data-timer-compact="true"></span>
              <span class="mam-card-qty mam-outline-sm">x${fmtInt(qty)}</span>
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
        const hotbarIdx = this.state.hotbar.indexOf(def.id);
        const isEquipped = hotbarIdx !== -1;
        const isInsp = selTarget?.kind === 'ore' && selTarget.id === def.id;
        cards.push(`
          <div class="${rarityCardClasses(def.rarity, isInsp ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : '')}" style="${rarityVars(def.rarity)}" data-equip-ore="${def.id}" title="${def.name} (${fmtMoney(def.sellValue)}) — Click to Equip / Unequip">
            ${isEquipped ? `<span class="mam-equipped-tag">${hotbarIdx + 1}</span>` : ''}
            <div class="mam-card-art">${oreIconSvg(def.color, def.secondaryColor, def.rarity, `inv_${def.id}`)}</div>
            <div class="mam-card-name mam-outline-sm truncate ${isEquipped ? '!text-left pl-1 pr-[22px]' : 'px-1'}">${def.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-val mam-outline-sm">${fmtMoney(def.sellValue)}</span>
              <span class="mam-card-qty mam-outline-sm">x${fmtInt(qty)}</span>
            </div>
          </div>
        `);
      }
    }

    return cards.length
      ? cards.join('')
      : '<div class="mam-placeholder-well col-span-full text-center py-10 px-4 text-[#cbd5e1] text-[15px] font-extrabold mam-outline-sm">No matching items in Backpack.</div>';
  }

  private buildTeamPresetsBarHtml(): string {
    const squadIconSvg = `<svg class="w-4 h-4 text-[#38bdf8] shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5L16.5 5.2V10.1C16.5 14 13.7 16.9 10 18C6.3 16.9 3.5 14 3.5 10.1V5.2L10 2.5Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 6.5L11.2 9L13.9 9.4L11.9 11.3L12.4 14L10 12.7L7.6 14L8.1 11.3L6.1 9.4L8.8 9L10 6.5Z" fill="currentColor"/></svg>`;
    const saveIconSvg = `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 2.5H11L13.5 5V13.5H3V2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.5 2.5V6H10.5V2.5M5.5 13.5V9.5H10.5V13.5" stroke="currentColor" stroke-width="1.3"/></svg>`;

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
              return `<span class="w-5 h-5 rounded-md overflow-hidden border border-white/25 bg-[#090e1a] inline-flex items-center justify-center shrink-0 [&_.mam-chibi-portrait]:w-full [&_.mam-chibi-portrait]:h-full">${chibiPortraitHtml(chibi)}</span>`;
            })
            .join('')
        : `<span class="text-[10px] font-bold text-[#64748b] italic">Empty Slot</span>`;

      const wrapCls = isCurrentActive
        ? 'border-[#38bdf8] bg-[#10243d] shadow-[0_0_12px_rgba(56,189,248,0.3)]'
        : populated
          ? 'border-[#38bdf8]/45 bg-[#0e192d]'
          : 'border-white/12 bg-[#0c1220]';

      return `
        <div class="inline-flex items-stretch rounded-xl overflow-hidden border ${wrapCls} transition-colors">
          <button
            type="button"
            class="px-2.5 py-1.5 inline-flex items-center gap-2 text-left cursor-pointer hover:bg-white/[0.06] active:scale-[0.98] transition-[background-color,transform] border-0 bg-transparent"
            data-team-preset-load="${idx}"
            title="${populated ? `Equip Team ${idx + 1}` : `Save current plot team to Team ${idx + 1}`}"
          >
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${isCurrentActive ? 'bg-[#38bdf8] text-[#081220]' : 'bg-white/10 text-white'}">T${idx + 1}</span>
            <span class="inline-flex items-center gap-1">${thumbsHtml}</span>
          </button>
          <button
            type="button"
            class="px-2 inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase bg-[#152238] text-[#7dd3fc] border-l border-white/12 cursor-pointer hover:bg-[#1d3254] hover:text-white active:scale-95 transition-colors"
            data-team-preset-save="${idx}"
            title="Save current plot team to Team ${idx + 1}"
          >${saveIconSvg}<span>Save</span></button>
        </div>
      `;
    }).join('');

    return `
      <div class="flex items-center gap-2 flex-wrap px-2.5 py-1.5 rounded-xl bg-[#0a101d] border border-white/10" data-team-presets-bar="true">
        <span class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#bae6fd] mr-0.5">${squadIconSvg}<span>Loadouts</span></span>
        ${itemsHtml}
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
          <button class="mam-sheen-hover relative overflow-hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-300/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.88),rgba(217,119,6,0.92))] shadow-[0_6px_16px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[13px] font-extrabold cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="auto-star-up" title="Merge all spare Chibi duplicates into Stars">
            <span>★ Auto Star-Up</span>
          </button>
          <button class="mam-equip-best-btn mam-sheen-hover relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(34,197,94,0.88),rgba(5,150,105,0.92))] shadow-[0_6px_16px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[14px] font-extrabold cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.96] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="equip-best">
            ${hudIconHtml('sparkle', 18, 'Equip Best')}
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
          <input class="flex-1 min-w-[160px] h-9 px-3.5 rounded-xl border border-white/15 bg-[rgba(10,14,24,0.72)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] text-white text-[14px] font-semibold outline-none placeholder:text-slate-400/80 focus:border-sky-400/70 focus:bg-[rgba(14,20,36,0.88)] transition-[border-color,background-color] duration-150" type="search" placeholder="Search items..." value="${this.invSearch.replace(/"/g, '&quot;')}" data-inv-search="true" />
        </div>

        ${this.buildTeamPresetsBarHtml()}

        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-inv-grid="true">
            ${cardsHtml}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-inv-inspector="true">
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

    scope.querySelectorAll('[data-equip-ore]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.equipOre;
        if (!id) return;
        audio.playSfx('ui-tab');
        this.invInspectTarget = { kind: 'ore', id };
        this.state.toggleEquipOre(id);
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
        } else if (act === 'toggle-ore') {
          audio.playSfx('ui-tab');
          this.invInspectTarget = { kind: 'ore', id };
          this.state.toggleEquipOre(id);
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
    root.querySelectorAll<HTMLElement>('[data-equip-ore]').forEach((el) => {
      applyInspectRing(el, target?.kind === 'ore' && el.dataset.equipOre === target.id);
    });
    root.querySelectorAll<HTMLElement>('[data-inv-potion-card="true"]').forEach((el) => {
      applyInspectRing(
        el,
        target?.kind === 'gem-item' && el.dataset.inspectInvOnly === `gem-item:${target.id}`
      );
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
