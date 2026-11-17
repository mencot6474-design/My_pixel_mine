import { audio } from '../audio/AudioManager';
import { assetUrl } from '../game/AssetUrl';
import { CHIBI_CATALOG, getChibiById } from '../game3d/ChibiCatalog';
import {
  GEM_SHOP_ITEMS,
  getGemShopItemById,
  getMinerRarity,
  getMinerSellValue,
  getMinersByWorld,
  getOreById,
  getOresByWorld,
  getWorldById,
  RARITY_BORDER,
  WorldId,
  WORLDS,
} from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt, fmtMoney, fmtPct, fmtShort } from '../game/NumberFormat';
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
  TW_CLOSE_BTN,
  TW_MODAL_GRID_BASE,
  TW_SHOP_MODAL_RESP,
  TW_TAB_BTN,
} from './HudShared';

export class CollectionModalsUi {
  private indexWorldId: WorldId = 'underground';
  private invTab: InvTab = 'all';
  private invSearch = '';
  private indexInspectId: string | null = null;
  private invInspectTarget: { kind: 'miner' | 'ore' | 'gem-item'; id: string } | null = null;
  private lastChestCardsHtml = '';
  private lastInvCardsHtml = '';
  private lastIndexInspectorHtml = '';
  private lastInvInspectorHtml = '';

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onRequestRender: () => void
  ) {}

  private getResolvedIndexInspectId(): string | null {
    const ores = getOresByWorld(this.indexWorldId);
    const miners = getMinersByWorld(this.indexWorldId);
    const allIds = [...ores.map((o) => o.id), ...miners.map((m) => m.chibi.id)];
    if (this.indexInspectId && allIds.includes(this.indexInspectId)) return this.indexInspectId;
    this.indexInspectId = allIds[0] ?? null;
    return this.indexInspectId;
  }

  private buildIndexInspectorHtml(): string {
    const targetId = this.getResolvedIndexInspectId();
    if (!targetId) return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');

    const unlocked = this.state.discovered.has(targetId);
    const worldDef = getWorldById(this.indexWorldId);
    const statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${unlocked ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#94a3b8]'}">${unlocked ? 'Discovered' : 'Locked'}</span>`;

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
        actionHtml: `
          <button
            type="button"
            class="mam-sheen-hover relative overflow-hidden w-full h-9 rounded-xl border border-sky-300/60 bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_12px_-2px_rgba(56,189,248,0.4)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
            data-review-chibi="${chibi.id}"
          >Review</button>
        `,
      });
    }

    return renderEmptyInspectorPanel('Select any Ore or Miner to inspect details.');
  }

  private buildIndexCardsHtml(): string {
    const ores = getOresByWorld(this.indexWorldId);
    const miners = getMinersByWorld(this.indexWorldId);
    const selectedId = this.getResolvedIndexInspectId();

    const oreCards = ores
      .map((ore) => {
        const unlocked = this.state.discovered.has(ore.id);
        const isSel = selectedId === ore.id;
        return `
          <div class="${rarityCardClasses(ore.rarity, `${unlocked ? '' : 'locked'} ${isSel ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.45)]' : ''}`.trim())}" style="${rarityVars(ore.rarity)}" data-index-id="${ore.id}" title="${ore.name} (${fmtMoney(ore.sellValue)})">
            <div class="mam-card-art">${oreIconSvg(ore.color, ore.secondaryColor, ore.rarity, `ix_${ore.id}`)}</div>
            <div class="mam-card-name mam-outline-sm">${ore.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-pct mam-outline-sm">${fmtPct(ore.chancePct)}</span>
            </div>
          </div>
        `;
      })
      .join('');

    const minerCards = miners
      .map(({ entry, chibi }) => {
        const unlocked = this.state.discovered.has(chibi.id);
        const isSel = selectedId === chibi.id;
        return `
          <div class="${rarityCardClasses(entry.rarity, `${unlocked ? '' : 'locked'} ${isSel ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.45)]' : ''}`.trim())}" style="${rarityVars(entry.rarity)}" data-index-id="${chibi.id}" title="${chibi.name} (${fmtShort(chibi.baseDps)} DPS)">
            <div class="mam-card-art">
              ${chibiPortraitHtml(chibi, { usePose: true })}
            </div>
            <div class="mam-card-name mam-outline-sm">${chibi.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-pct mam-outline-sm">${fmtPct(entry.chancePct)}</span>
            </div>
          </div>
        `;
      })
      .join('');

    return `${oreCards}${minerCards}`;
  }

  public renderIndexModal(): string {
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
        </div>

        <div class="flex items-stretch gap-3 flex-1 min-h-0 @max-[920px]:flex-col @max-[920px]:overflow-y-auto">
          <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[720px]:grid-cols-3 gap-2 flex-1 min-h-[220px] @max-[920px]:flex-none @max-[920px]:max-h-[340px]" data-index-grid="true">
            ${this.buildIndexCardsHtml()}
          </div>
          <div class="mam-inspector-well w-[268px] @max-[920px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center overflow-y-auto" data-index-inspector="true">
            ${inspHtml}
          </div>
        </div>
      `,
    });
  }

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

      return renderInspectorPanel({
        rarity,
        title: def.name,
        subtitle: 'Backpack • Chibi Miner',
        badgesHtml: `<span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${isEq ? 'bg-[#14532d]/60 border-[#4ade80]/70 text-[#86efac]' : 'bg-[#1e293b] border-[#475569] text-[#cbd5e1]'}">${isEq ? `Hotbar #${hotbarIdx + 1}` : 'Not Equipped'}</span>`,
        artHtml: chibiPortraitHtml(def),
        stats: [
          ['Owned', `x${fmtInt(qty)}`, 'text-white'],
          ['Base DPS', `${fmtShort(def.baseDps)}/s`, 'text-[#facc15]'],
          ['On Plot', `${fmtInt(onPlot)} placed`, 'text-[#7dd3fc]'],
          ['Sell Value', fmtMoney(getMinerSellValue(def.id)), 'text-[#4ade80]'],
        ],
        actionHtml: `
          <button class="w-full h-10 rounded-[7px] border-2 ${isEq ? 'border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)] shadow-[0_3px_0_#7c2d12]' : 'border-[#14532d] bg-[linear-gradient(180deg,#4ade80,#16a34a)] shadow-[0_3px_0_#14532d]'} text-white text-[14px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-insp-inv-action="toggle-miner" data-insp-id="${def.id}">
            ${isEq ? 'Unequip from Hotbar' : 'Equip to Hotbar'}
          </button>
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
            <button class="h-9 rounded-[7px] border-2 ${isEq ? 'border-[#7c2d12] bg-[linear-gradient(180deg,#fb923c,#ea580c)]' : 'border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8,#0284c7)]'} text-white text-[12.5px] font-black cursor-pointer hover:brightness-110 mam-outline-sm" data-insp-inv-action="toggle-ore" data-insp-id="${def.id}">
              ${isEq ? 'Unequip' : 'Equip'}
            </button>
            <button class="h-9 rounded-[7px] border-2 border-[#14532d] bg-[linear-gradient(180deg,#4ade80,#16a34a)] text-white text-[12.5px] font-black cursor-pointer hover:brightness-110 mam-outline-sm" data-insp-inv-action="sell-ore-all" data-insp-id="${def.id}">
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
        <button class="w-full h-10 rounded-[7px] border-2 border-[#0369a1] bg-[linear-gradient(180deg,#38bdf8,#0284c7)] shadow-[0_3px_0_#075985] text-white text-[14px] font-black cursor-pointer hover:brightness-110 active:translate-y-0.5 mam-outline-sm" data-insp-inv-action="use-potion" data-insp-id="${pot.id}">
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
        .map(([id, qty]) => ({ def: getChibiById(id) ?? CHIBI_CATALOG[0], qty }))
        .sort((a, b) => b.def.baseDps - a.def.baseDps);

      for (const { def, qty } of minerList) {
        if (q && !def.name.toLowerCase().includes(q)) continue;
        const rarity = getMinerRarity(def.id);
        const isEquipped = this.state.hotbar.includes(def.id);
        const isInsp = selTarget?.kind === 'miner' && selTarget.id === def.id;
        cards.push(`
          <div class="${rarityCardClasses(rarity, isInsp ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : '')}" style="${rarityVars(rarity)}" data-equip-miner="${def.id}" title="Click to Equip / Unequip">
            ${isEquipped ? '<span class="mam-equipped-tag">EQ</span>' : ''}
            <div class="mam-card-art">
              ${chibiPortraitHtml(def)}
            </div>
            <div class="mam-card-name mam-outline-sm truncate ${isEquipped ? '!text-left pl-1 pr-[24px]' : 'px-1'}">${def.name}</div>
            <div class="mam-card-bottom">
              <span class="mam-card-dps mam-outline-sm">${fmtShort(def.baseDps)}</span>
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
        const isEquipped = this.state.hotbar.includes(def.id);
        const isInsp = selTarget?.kind === 'ore' && selTarget.id === def.id;
        cards.push(`
          <div class="${rarityCardClasses(def.rarity, isInsp ? 'ring-[2.5px] ring-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.4)]' : '')}" style="${rarityVars(def.rarity)}" data-equip-ore="${def.id}" title="${def.name} (${fmtMoney(def.sellValue)}) — Click to Equip / Unequip">
            ${isEquipped ? '<span class="mam-equipped-tag">EQ</span>' : ''}
            <div class="mam-card-art">${oreIconSvg(def.color, def.secondaryColor, def.rarity, `inv_${def.id}`)}</div>
            <div class="mam-card-name mam-outline-sm truncate ${isEquipped ? '!text-left pl-1 pr-[24px]' : 'px-1'}">${def.name}</div>
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

  public renderInventoryModal(): string {
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
        <button class="mam-equip-best-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(34,197,94,0.88),rgba(5,150,105,0.92))] shadow-[0_6px_16px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[14px] font-extrabold cursor-pointer transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="equip-best">
          ${hudIconHtml('sparkle', 18, 'Equip Best')}
          <span>Equip Best</span>
        </button>
      `,
      bodyHtml: `
        <div class="flex items-center gap-2 flex-wrap">
          <button class="${TW_TAB_BTN} ${this.invTab === 'all' ? 'active' : ''}" data-inv-tab="all">All</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'miners' ? 'active' : ''}" data-inv-tab="miners">Miners</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'ores' ? 'active' : ''}" data-inv-tab="ores">Ores</button>
          <button class="${TW_TAB_BTN} ${this.invTab === 'other' ? 'active' : ''}" data-inv-tab="other">Other</button>
          <input class="flex-1 min-w-[160px] h-9 px-3.5 rounded-xl border border-white/15 bg-[rgba(10,14,24,0.72)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] text-white text-[14px] font-semibold outline-none placeholder:text-slate-400/80 focus:border-sky-400/70 focus:bg-[rgba(14,20,36,0.88)] transition-[border-color,background-color] duration-150" type="search" placeholder="Search items..." value="${this.invSearch.replace(/"/g, '&quot;')}" data-inv-search="true" />
        </div>

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

  private buildChestCardsHtml(): string {
    const cards: string[] = [];
    for (const [id, qty] of Object.entries(this.state.chestMiners)) {
      if (qty <= 0) continue;
      const def = getChibiById(id);
      if (!def) continue;
      const rarity = getMinerRarity(def.id);
      cards.push(`
        <div class="${rarityCardClasses(rarity)}" style="${rarityVars(rarity)}">
          <div class="mam-card-art">
            ${chibiPortraitHtml(def)}
          </div>
          <div class="mam-card-name mam-outline-sm">${def.name}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-dps mam-outline-sm">${fmtShort(def.baseDps)}</span>
            <span class="mam-card-qty mam-outline-sm">x${fmtInt(qty)}</span>
          </div>
        </div>
      `);
    }

    for (const [id, qty] of Object.entries(this.state.chestOres)) {
      if (qty <= 0) continue;
      const def = getOreById(id);
      if (!def) continue;
      cards.push(`
        <div class="${rarityCardClasses(def.rarity)}" style="${rarityVars(def.rarity)}">
          <div class="mam-card-art">${oreIconSvg(def.color, def.secondaryColor, def.rarity, `ch_${def.id}`)}</div>
          <div class="mam-card-name mam-outline-sm">${def.name}</div>
          <div class="mam-card-bottom">
            <span class="mam-card-val mam-outline-sm">${fmtMoney(def.sellValue)}</span>
            <span class="mam-card-qty mam-outline-sm">x${fmtInt(qty)}</span>
          </div>
        </div>
      `);
    }

    return cards.length
      ? cards.join('')
      : '<div class="mam-placeholder-well col-span-full text-center p-7 text-[#fde68a] font-extrabold mam-outline-sm">Mine ores in the pit to fill your Chest!</div>';
  }

  public renderChestModal(): string {
    const count = this.state.getChestItemCount();
    const cap = this.state.getMaxChestCapacity();
    const pct = Math.min(100, Math.round((count / Math.max(1, cap)) * 100));
    const cardsHtml = this.buildChestCardsHtml();
    this.lastChestCardsHtml = cardsHtml;

    return renderModalShell({
      title: 'Chest',
      theme: 'chest',
      iconHtml: hudIconHtml('chest', 26, 'Chest'),
      boxClass: `w-[640px] ${TW_SHOP_MODAL_RESP}`,
      bodyHtml: `
        <div class="${TW_MODAL_GRID_BASE} grid-cols-5 @max-[680px]:grid-cols-4 @max-[520px]:grid-cols-3 gap-2 flex-1 min-h-[180px]" data-chest-grid="true">
          ${cardsHtml}
        </div>

        <div class="relative h-6 rounded-full bg-[rgba(15,18,28,0.82)] border border-amber-300/35 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center backdrop-blur-sm">
          <div class="absolute left-0 top-0 bottom-0 bg-[linear-gradient(90deg,#f59e0b,#fbbf24)] rounded-full shadow-[0_0_12px_rgba(251,191,36,0.45)]" data-chest-cap-fill="true" style="width:${pct}%"></div>
          <div class="relative z-[2] text-[12px] font-extrabold text-white tracking-wide [text-shadow:0_1px_4px_rgba(0,0,0,0.75)]" data-chest-cap-text="true">${fmtInt(count)}/${fmtShort(cap)} Items</div>
        </div>

        <div class="flex flex-wrap justify-center items-center gap-3">
          <button class="mam-sheen-hover relative overflow-hidden h-11 min-w-[200px] px-6 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(34,197,94,0.9),rgba(5,150,105,0.94))] shadow-[0_8px_20px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[16px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="chest-take-all">Take All</button>
          <button class="mam-sheen-hover relative overflow-hidden h-11 min-w-[200px] px-6 rounded-xl border border-amber-300/50 bg-[linear-gradient(135deg,rgba(245,158,11,0.92),rgba(217,119,6,0.96))] shadow-[0_8px_20px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] text-white text-[16px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]" data-action="chest-sell-ores">${this.state.isChestFullBonusReady() ? 'Sell Ores (+35%)' : 'Sell Ores'}</button>
        </div>
      `,
    });
  }

  public bindEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-index-world]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.indexWorld as WorldId;
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

    root.querySelectorAll('[data-inv-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        this.invTab = (el as HTMLElement).dataset.invTab as InvTab;
        root.querySelectorAll<HTMLElement>('[data-inv-tab]').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.invTab === this.invTab);
        });
        this.updateInventoryModalLive(root);
      });
    });

    const searchInput = root.querySelector<HTMLInputElement>('[data-inv-search="true"]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.invSearch = searchInput.value;
        this.updateInventoryModalLive(root);
      });
    }

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
          this.updateInventoryModalLive(root);
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

  public updateChestModalLive(root: HTMLElement): void {
    const count = this.state.getChestItemCount();
    const cap = this.state.getMaxChestCapacity();
    const pct = Math.min(100, Math.round((count / Math.max(1, cap)) * 100));

    const fill = root.querySelector<HTMLElement>('[data-chest-cap-fill="true"]');
    if (fill) fill.style.width = `${pct}%`;
    const capText = root.querySelector<HTMLElement>('[data-chest-cap-text="true"]');
    if (capText) capText.textContent = `${fmtInt(count)}/${fmtShort(cap)} Items`;
    const sellBtn = root.querySelector<HTMLElement>('[data-action="chest-sell-ores"]');
    if (sellBtn) {
      sellBtn.textContent = this.state.isChestFullBonusReady() ? 'Sell Ores (+35%)' : 'Sell Ores';
    }

    const grid = root.querySelector<HTMLElement>('[data-chest-grid="true"]');
    if (!grid) return;
    const nextHtml = this.buildChestCardsHtml();
    if (this.lastChestCardsHtml !== nextHtml) {
      const prevScroll = grid.scrollTop;
      this.lastChestCardsHtml = nextHtml;
      grid.innerHTML = nextHtml;
      grid.scrollTop = prevScroll;
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
    const worldDef = getWorldById(this.indexWorldId);
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
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border" style="color:${borderColor};border-color:${borderColor}88;background:${borderColor}20">${rarityLabel}</span>
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

  public updateInventoryModalLive(root: HTMLElement): void {
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

  public updateIndexModalLive(root: HTMLElement): void {
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
