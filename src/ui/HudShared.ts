import { assetUrl } from '../game/AssetUrl';
import { EnchantDef, getEnchantById, ItemRarity, RARITY_BORDER } from '../game/GameData';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import { ChibiDef } from '../game3d/ChibiCatalog';
import type { PlotLabelInfo } from '../game3d/PlotPedestal3D';
import { enchantAuraIconHtml, hudIconHtml } from './HudIcons';

export interface PlotDropOps {
  raycastPlotAt: (clientX: number, clientY: number) => number | null;
  highlightPlot: (slotIndex: number | null) => void;
  pulsePlot: (slotIndex: number) => void;
  syncPlotLabel?: (slotIndex: number, info: PlotLabelInfo | null) => void;
}

export function chibiPortraitHtml(
  chibi: ChibiDef,
  opts?: { usePose?: boolean; draggable?: boolean }
): string {
  const src = assetUrl(opts?.usePose ? chibi.poses.pose : chibi.spriteUrl);
  const cls = chibi.smoothFilter ? ' class="mam-chibi-smooth"' : '';
  const drag = opts?.draggable === false ? ' draggable="false"' : '';
  return `<div class="mam-chibi-portrait"><img src="${src}" alt="${chibi.name}"${cls}${drag} /></div>`;
}

export type ModalKind =
  | 'none'
  | 'index'
  | 'inventory'
  | 'chest'
  | 'pickaxe-shop'
  | 'sell-shop'
  | 'gem-shop'
  | 'premium-shop'
  | 'upgrades'
  | 'worlds'
  | 'tower'
  | 'forge'
  | 'settings'
  | 'offline'
  | 'bounties'
  | 'achievements'
  | 'daily-login'
  | 'altar-hub'
  | 'omega-boss'
  | 'twin-trial'
  | 'rift';

export type ModalThemeId = Exclude<ModalKind, 'none'>;

export type InvTab = 'all' | 'miners' | 'ores' | 'other';
export type InspectTab = 'pickaxe' | 'stats' | 'mutation' | 'enchants';

export function rarityCardClasses(rarity: ItemRarity, extra = ''): string {
  const cls = ['mam-card'];
  if (rarity === 'rainbow') cls.push('rarity-rainbow');
  if (rarity === 'mythic') cls.push('rarity-mythic');
  if (rarity === 'exotic') cls.push('rarity-exotic');
  if (rarity === 'secret') cls.push('rarity-secret');
  if (rarity === 'fusion') cls.push('rarity-fusion');
  if (rarity === 'limited') cls.push('rarity-limited');
  if (rarity === 'twin') cls.push('rarity-twin');
  if (rarity === 'novel') cls.push('rarity-novel');
  if (rarity === 'omega') cls.push('rarity-omega');
  if (rarity === 'anomaly') cls.push('rarity-anomaly');
  if (extra) cls.push(extra);
  return cls.join(' ');
}

export function renderRarityBadgeHtml(rarity: ItemRarity, extraCls = ''): string {
  const extra = extraCls ? ` ${extraCls}` : '';
  if (rarity === 'anomaly') {
    const src = assetUrl('/badges/anomaly.svg');
    return `<span class="mam-rarity-badge mam-rarity-anomaly is-crest${extra}"><span class="mam-rarity-label sr-only">ANOMALY</span><img class="mam-rarity-crest-img" src="${src}" alt="ANOMALY" draggable="false" /></span>`;
  }
  if (rarity === 'omega') {
    const src = assetUrl('/badges/omega.svg');
    return `<span class="mam-rarity-badge mam-rarity-omega is-crest${extra}"><span class="mam-rarity-label sr-only">OMEGA</span><img class="mam-rarity-crest-img" src="${src}" alt="OMEGA" draggable="false" /></span>`;
  }
  if (rarity === 'twin') {
    const src = assetUrl('/badges/twin.svg');
    return `<span class="mam-rarity-badge mam-rarity-twin is-crest${extra}"><span class="mam-rarity-label sr-only">TWIN</span><img class="mam-rarity-crest-img" src="${src}" alt="TWIN" draggable="false" /></span>`;
  }
  if (rarity === 'novel') {
    const src = assetUrl('/badges/novel.svg');
    return `<span class="mam-rarity-badge mam-rarity-novel is-crest${extra}"><span class="mam-rarity-label sr-only">NOVEL</span><img class="mam-rarity-crest-img" src="${src}" alt="NOVEL" draggable="false" /></span>`;
  }
  if (rarity === 'fusion') {
    return `<span class="mam-rarity-badge mam-rarity-fusion mam-fusion-badge${extra}"><span class="mam-rarity-glint"></span><span class="mam-rarity-emblem" style="background:linear-gradient(135deg,#38bdf8,#e879f9);color:#fff"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z"/></svg></span><span class="mam-rarity-label">FUSION</span><span class="mam-rarity-spark s1">✦</span><span class="mam-rarity-spark s2">✧</span></span>`;
  }
  if (rarity === 'limited') {
    return `<span class="mam-rarity-badge mam-rarity-limited mam-limited-badge${extra}"><span class="mam-rarity-glint"></span><span class="mam-rarity-emblem" style="background:#fde047;color:#14111d"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v2H3v-2zm0-2l2-10 5 4 2-6 2 6 5-4 2 10H3z"/></svg></span><span class="mam-rarity-label">LIMITED</span><span class="mam-rarity-spark s1">★</span><span class="mam-rarity-spark s2">✦</span></span>`;
  }
  if (rarity === 'secret') {
    return `<span class="mam-rarity-badge mam-rarity-secret${extra}"><span class="mam-rarity-glint"></span><span class="mam-rarity-emblem" style="background:#fde047;color:#14111d;border-color:#14111d"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z"/></svg></span><span class="mam-rarity-label">SECRET</span><span class="mam-rarity-spark s1">✦</span><span class="mam-rarity-spark s2">✦</span></span>`;
  }
  const hasGlint = rarity === 'legendary' || rarity === 'rainbow' || rarity === 'mythic' || rarity === 'exotic';
  const glintHtml = hasGlint ? '<span class="mam-rarity-glint"></span>' : '';
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return `<span class="mam-rarity-badge mam-rarity-${rarity}${extra}">${glintHtml}<span class="mam-rarity-label">${rarityLabel}</span></span>`;
}

export function renderMutationBadgeHtml(mutationId: string, mutationName?: string, extraCls = ''): string {
  const id = mutationId.toLowerCase();
  const label = mutationName ?? (id.charAt(0).toUpperCase() + id.slice(1));
  const extra = extraCls ? ` ${extraCls}` : '';
  const hasRing = id === 'frozen' || id === 'inferno' || id === 'nightmare' || id === 'unreal';
  const hasGlint = hasRing || id === 'rainbow' || id === 'diamond' || id === 'platinum';
  const ringCls = hasRing ? ' has-ring' : '';
  const glintHtml = hasGlint ? '<span class="mam-rarity-glint"></span>' : '';
  const sparksHtml =
    id === 'nightmare' || id === 'unreal'
      ? '<span class="mam-rarity-spark s1">✦</span><span class="mam-rarity-spark s2">✧</span>'
      : '';

  return `<span class="mam-mut-badge mam-mut-${id}${ringCls}${extra}">${glintHtml}<span class="mam-mut-label">${label}</span>${sparksHtml}</span>`;
}

export function rarityVars(rarity: ItemRarity): string {
  const border = RARITY_BORDER[rarity];
  return `--rarity-border:${border};--rarity-bg:${border}7a;--rarity-bg-edge:${border}38;`;
}

export function applyInspectRing(el: Element, selected: boolean): void {
  el.classList.toggle('ring-[2.5px]', selected);
  el.classList.toggle('ring-inset', selected);
  el.classList.toggle('ring-[#38bdf8]', selected);
  if (!selected) {
    el.classList.remove(
      'shadow-[0_0_12px_rgba(56,189,248,0.4)]',
      'shadow-[0_0_12px_rgba(56,189,248,0.45)]',
      'shadow-[0_0_14px_rgba(56,189,248,0.45)]'
    );
  }
}

export function refreshPotionTimersInDom(root: ParentNode, state: GameState): void {
  const now = Date.now();
  root.querySelectorAll<HTMLElement>('[data-gem-timer]').forEach((el) => {
    const id = el.dataset.gemTimer;
    if (!id) return;
    const rem = state.getBoostRemainingSec(id, now);
    if (rem <= 0) {
      if (el.textContent) el.textContent = '';
      el.classList.remove('is-active');
      el.closest('[data-inv-potion-card="true"]')?.classList.remove('is-boost-active');
    } else {
      const timeStr = formatCountdownTimer(rem);
      const nextText = el.dataset.timerCompact === 'true' ? timeStr : `Active ${timeStr}`;
      if (el.textContent !== nextText) el.textContent = nextText;
      el.classList.add('is-active');
      el.closest('[data-inv-potion-card="true"]')?.classList.add('is-boost-active');
    }
  });
}

export const TW_TOP_CENTER =
  'absolute top-4 @max-[720px]:top-2.5 [[data-hud-compact=true]_&]:top-[98px] [[data-hud-compact=true]_&]:w-[calc(100%-20px)] left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] pointer-events-auto';
export const TW_SHOPS_PILL =
  'inline-flex items-center justify-center gap-2 @max-[720px]:gap-1.5 min-w-[152px] @max-[720px]:min-w-[122px] px-6 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-[3px] border-[#14111d] bg-[#2ee59d] shadow-none text-[#14111d] text-[19px] @max-[720px]:text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] hover:-rotate-1 hover:brightness-105 active:scale-[0.94]';
export const TW_TELEPORT_PILL =
  'relative inline-flex items-center justify-center gap-2 @max-[720px]:gap-1.5 min-w-[152px] @max-[720px]:min-w-[122px] px-6 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-[3px] border-[#14111d] bg-[#38bdf8] shadow-none text-[#14111d] text-[19px] @max-[720px]:text-[15px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.97] hover:rotate-1 hover:brightness-105 active:scale-[0.94]';
export const TW_SIDE_BTN_BASE =
  'relative w-[88px] h-[82px] @max-[720px]:w-[74px] @max-[720px]:h-[70px] rounded-2xl shadow-none flex flex-col items-center justify-center gap-0.5 text-[#14111d] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-[1.5deg] even:hover:rotate-[1.5deg] hover:brightness-105 active:scale-[0.93]';
export const TW_SIDE_BTN_STD = `${TW_SIDE_BTN_BASE} border-[3px] border-[#14111d] bg-[#fff8e7]`;
export const TW_SIDE_BTN_UPGRADES = `${TW_SIDE_BTN_BASE} border-[3px] border-[#14111d] bg-[#bae6fd]`;
export const TW_SIDE_BTN_INDEX = `${TW_SIDE_BTN_BASE} border-[3px] border-[#14111d] bg-[#e9d5ff]`;
export const TW_SIDE_BTN_RAINBOW = `${TW_SIDE_BTN_BASE} border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#fecdd3,#fef08a,#bbf7d0,#bae6fd,#e9d5ff)]`;
export const TW_BADGE_BASE =
  'mam-notif-badge absolute -top-[7px] -left-[7px] z-[4] bg-[#ff3b5c] border-2 border-[#14111d] text-white font-black flex items-center justify-center leading-none';
export const TW_CURRENCY_BAR =
  'relative flex items-center justify-center gap-2 w-[224px] h-[44px] @max-[720px]:w-[186px] @max-[720px]:h-[38px] px-3 rounded-full border-[3px] border-[#14111d] bg-[#fff8e7] text-[#14111d] shadow-none';
export const TW_PLUS_BTN =
  'w-[26px] h-[26px] rounded-full border-2 border-[#14111d] bg-[#2ee59d] shadow-none text-[#14111d] text-[18px] font-black leading-none flex items-center justify-center cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-105 active:scale-95';
export const TW_QUICK_BTN =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[2.5px] border-[#14111d] bg-[#bae6fd] shadow-none text-[#14111d] text-[13px] font-black inline-flex items-center justify-center gap-[5px] cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 even:hover:rotate-1 hover:brightness-105 active:scale-95';
export const TW_QUICK_BTN_DAILY =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[2.5px] border-[#14111d] bg-[#fde047] shadow-none text-[#14111d] text-[13px] font-black inline-flex items-center justify-center gap-[5px] cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 even:hover:rotate-1 hover:brightness-105 active:scale-95';
export const TW_QUICK_BTN_CHEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[2.5px] border-[#14111d] bg-[#fed7aa] shadow-none text-[#14111d] text-[13px] font-black inline-flex items-center justify-center gap-[5px] cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 even:hover:rotate-1 hover:brightness-105 active:scale-95';
export const TW_QUICK_BTN_QUEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[2.5px] border-[#14111d] bg-[#6ee7b7] shadow-none text-[#14111d] text-[13px] font-black inline-flex items-center justify-center gap-[5px] cursor-pointer touch-manipulation transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 even:hover:rotate-1 hover:brightness-105 active:scale-95';
export const TW_QUICK_BTN_TRADE = TW_QUICK_BTN;
export const TW_HOTBAR_SLOT =
  'mam-hotbar-slot relative w-[74px] h-[76px] @max-[860px]:w-[60px] @max-[860px]:h-[62px] overflow-hidden cursor-pointer flex flex-col items-center justify-between p-0.5';
export const TW_HOTBAR_NUM = 'mam-hotbar-keycap';
export const TW_TOAST_STACK =
  'absolute top-[78px] @max-[720px]:top-[66px] [[data-hud-compact=true]_&]:top-[158px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-50';
export const TW_TOAST_STACK_ARENA =
  'absolute top-[68px] left-3 @max-[660px]:top-[224px] flex flex-col items-start gap-1 pointer-events-none z-50';
export const TW_TOAST_ITEM =
  'px-4 py-1.5 rounded-xl bg-[#fff8e7] border-[2.5px] border-[#14111d] shadow-none text-[14px] font-black text-[#14111d]';
export const TW_ACTIVE_POT_PILL =
  'pointer-events-auto flex flex-col items-center justify-center gap-0.5 min-w-0 px-1.5 py-1.5 rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] text-[#14111d] shadow-none cursor-default transition-[transform,filter] duration-150 ease-out hover:brightness-105 @max-[720px]:px-1 @max-[720px]:py-1';

export const TW_MODAL_BACKDROP =
  'absolute inset-0 bg-[rgba(12,10,18,0.62)] flex items-center justify-center p-3 pt-9 @max-[720px]:p-2 @max-[720px]:pt-8 pointer-events-auto z-40';
export const TW_MODAL_BOX =
  'mam-modal max-w-full h-[min(640px,calc(100%-18px))] min-h-0 flex flex-col pt-3 px-4 pb-4 gap-2.5';
export const TW_SHOP_MODAL_RESP =
  '@max-[720px]:px-3 @max-[720px]:pt-2.5 @max-[720px]:pb-3 [[data-hud-short=true]_&]:px-3.5 [[data-hud-short=true]_&]:py-2.5 [[data-hud-short=true]_&]:gap-2';
export const TW_CLOSE_BTN =
  'w-9 h-9 @max-[720px]:w-8 @max-[720px]:h-8 shrink-0 rounded-xl border-[2.5px] border-[#14111d] bg-[#ff3b5c] shadow-none text-white text-[17px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter] duration-150 ease-out hover:scale-105 hover:rotate-3 hover:brightness-105 active:scale-95';
export const TW_TAB_BTN =
  'mam-tab-btn inline-flex items-center justify-center gap-[7px] h-[34px] px-3.5 @max-[720px]:h-[30px] @max-[720px]:px-2.5 @max-[720px]:text-[12.5px] rounded-xl text-[13.5px] font-black leading-none whitespace-nowrap cursor-pointer';
export const TW_MODAL_GRID_BASE = 'mam-grid flex-1 min-h-0 content-start overflow-y-auto pr-0 grid';
export const TW_SHOP_DOCK_BTN_BASE =
  'relative overflow-hidden shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 @max-[760px]:px-2.5 @max-[760px]:py-1.5 @max-[760px]:gap-1 @max-[760px]:text-[11.5px] [&>img]:shrink-0 [&>svg]:shrink-0 @max-[760px]:[&>img]:w-[22px] @max-[760px]:[&>img]:h-[22px] @max-[760px]:[&>svg]:w-[20px] @max-[760px]:[&>svg]:h-[20px] rounded-xl border-[2.5px] border-[#14111d] shadow-none text-[#14111d] text-[13px] font-black whitespace-nowrap cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[0.96] hover:-rotate-1 even:hover:rotate-1 hover:brightness-105 active:scale-95';
export const TW_SHOP_BUY_BTN =
  'mam-sheen-hover relative overflow-hidden mt-auto w-full h-[34px] shrink-0 rounded-xl border-2 border-[#14111d] bg-[#2ee59d] shadow-none text-[#14111d] text-[13px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out [&:not(.disabled):not(.sold-out)]:hover:brightness-105 [&:not(.disabled):not(.sold-out)]:active:scale-95 [&.disabled]:bg-[#e2e8f0] [&.disabled]:bg-none [&.disabled]:border-[#94a3b8] [&.disabled]:shadow-none [&.disabled]:text-[#64748b] [&.disabled]:active:scale-[0.97] [&.sold-out]:bg-[#ff3b5c] [&.sold-out]:text-white [&.sold-out]:border-[#14111d] [&.sold-out]:shadow-none [&.sold-out]:active:scale-[0.97]';
export const TW_SHOP_SIGN_BASE =
  'absolute -translate-x-1/2 translate-y-[calc(-100%-10px)] pointer-events-auto px-3 py-[5px] rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] text-[#14111d] text-center whitespace-nowrap cursor-pointer transition-[transform,filter] duration-150 ease-out hover:scale-[1.04] hover:brightness-105 active:scale-95';
export const TW_INSPECT_ARROW =
  'absolute top-[48%] -translate-y-1/2 w-10 h-10 rounded-xl border-[2.5px] border-[#14111d] bg-[#fff8e7] shadow-none text-[#14111d] text-[22px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter] duration-150 ease-out hover:scale-[1.06] hover:bg-[#fde047] active:scale-[0.93]';
export const TW_INSPECT_TAB =
  'h-10 @max-[920px]:h-9 rounded-xl border-[2.5px] border-[#14111d] bg-[#fcecc8] shadow-none text-[#14111d] text-[15px] @max-[920px]:text-[13px] font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-[transform,filter] duration-150 ease-out hover:bg-[#fde047] active:scale-95 [&.active]:bg-[#2ee59d] [&.active]:border-[#14111d] [&.active]:text-[#14111d]';
export const TW_STAT_CARD =
  'flex-1 min-w-[190px] @max-[920px]:min-w-[155px] px-3 py-2.5 rounded-xl bg-[#ffffff] border-2 border-[#14111d] shadow-none flex flex-col items-center gap-1.5 text-[#14111d]';
export const TW_STAT_BTN =
  'w-full h-[34px] rounded-xl border-2 border-[#14111d] bg-[#2ee59d] shadow-none text-[#14111d] text-[14px] font-black cursor-pointer transition-[transform,filter] duration-150 ease-out [&:not(.maxed)]:hover:brightness-105 [&:not(.maxed)]:active:scale-[0.97] [&.maxed]:border-[#14111d] [&.maxed]:bg-[#fde047] [&.maxed]:text-[#14111d] [&.maxed]:cursor-default';
export const TW_STRIP_CARD =
  'mam-strip-card relative min-w-[86px] w-[86px] h-[86px] rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer [&.equipped]:ring-[3px] [&.equipped]:ring-inset [&.equipped]:ring-[#16a34a]';
export const TW_ALTAR_ROLL_BTN =
  'mam-altar-roll-btn relative overflow-hidden w-[280px] max-w-full h-[46px] rounded-2xl border-[3px] border-[#14111d] bg-[#2ee59d] shadow-none text-[#14111d] text-[20px] font-black cursor-pointer transition-[transform,filter,opacity] duration-150 ease-out [&:not(.is-empty):not(.is-spinning)]:hover:brightness-105 [&:not(.is-empty):not(.is-spinning)]:active:scale-[0.96] [&.is-empty]:bg-[#ff3b5c] [&.is-empty]:text-white [&.is-spinning]:bg-[#a855f7] [&.is-spinning]:text-white [&.is-spinning]:cursor-not-allowed [&.is-spinning]:pointer-events-none [&.is-spinning]:opacity-95';
export const TW_ALTAR_AUTO_BTN =
  'mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-xl border-[2.5px] border-[#14111d] bg-[#38bdf8] shadow-none text-[#14111d] text-[14px] font-black cursor-pointer transition-[transform,filter,background] duration-150 ease-out hover:brightness-105 active:scale-[0.97] [&.is-active]:bg-[#ff3b5c] [&.is-active]:text-white';

export function shouldDismissModalBackdrop(opts: {
  pointerDownOnSelf: boolean;
  openedAtMs: number;
  nowMs: number;
  graceMs?: number;
}): boolean {
  if (!opts.pointerDownOnSelf) return false;
  const graceMs = opts.graceMs ?? 180;
  return opts.nowMs - opts.openedAtMs >= graceMs;
}

export function renderModalShell(opts: {
  title: string;
  theme?: ModalThemeId;
  iconHtml?: string;
  boxClass?: string;
  autoHeight?: boolean;
  headerExtraHtml?: string;
  bodyHtml: string;
}): string {
  const themeAttr = opts.theme ? `data-modal-theme="${opts.theme}"` : 'data-modal-theme="inventory"';
  const extraRow = opts.headerExtraHtml
    ? `<div class="shrink-0 flex items-center justify-end gap-2.5 flex-wrap w-full">${opts.headerExtraHtml}</div>`
    : '';
  const modalBoxClass = opts.autoHeight
    ? 'mam-modal max-w-full h-auto max-h-[calc(100%-18px)] min-h-0 flex flex-col pt-3 px-4 pb-4 gap-2.5'
    : TW_MODAL_BOX;
  return `
    <div class="${TW_MODAL_BACKDROP}" data-backdrop="true">
      <div class="${modalBoxClass} ${opts.boxClass ?? 'w-[780px]'}" ${themeAttr} role="dialog" aria-modal="true" aria-label="${opts.title}">
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
            ${opts.iconHtml ? `<span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${opts.iconHtml}</span>` : ''}
            <span>${opts.title}</span>
          </div>
          <span class="mam-wing-rail is-right" aria-hidden="true"></span>
          <button class="${TW_CLOSE_BTN} mam-close-rail-btn" data-action="close-modal" aria-label="Close ${opts.title}">✕</button>
        </div>
        ${extraRow}
        ${opts.bodyHtml}
      </div>
    </div>
  `;
}

export function renderInspectorPanel(opts: {
  rarity: ItemRarity;
  title: string;
  subtitle: string;
  badgesHtml?: string;
  artHtml: string;
  stats: Array<[string, string, string?]>;
  actionHtml?: string;
  dimmed?: boolean;
}): string {
  const borderColor = RARITY_BORDER[opts.rarity];
  const showcaseBorder =
    opts.rarity === 'rainbow'
      ? 'border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#fda4af,#fde047,#86efac,#7dd3fc,#d8b4fe)]'
      : opts.rarity === 'mythic'
        ? 'border-[3px] border-[#14111d] bg-[radial-gradient(circle_at_50%_42%,#fb7185_0%,#fecdd3_88%)]'
        : opts.rarity === 'exotic'
          ? 'border-[3px] border-[#14111d] bg-[radial-gradient(circle_at_50%_42%,#2dd4bf_0%,#99f6e4_88%)]'
          : opts.rarity === 'secret'
            ? 'border-[3px] border-[#14111d] bg-[linear-gradient(150deg,#fde047_0%,#e9d5ff_50%,#a78bfa_100%)]'
            : opts.rarity === 'fusion'
              ? 'border-[3px] border-[#14111d] bg-[linear-gradient(145deg,#7dd3fc_0%,#c084fc_50%,#f472b6_100%)]'
              : opts.rarity === 'limited'
                ? 'border-[3px] border-[#14111d] bg-[linear-gradient(155deg,#fef08a_0%,#fbbf24_55%,#fb923c_100%)]'
                : opts.rarity === 'twin'
                  ? 'border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#38bdf8_0%,#fde047_50%,#fb7185_100%)]'
                  : opts.rarity === 'novel'
                    ? 'border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#fffbeb_0%,#f5d07a_42%,#c69138_78%,#4a2c40_100%)]'
                    : opts.rarity === 'omega'
                      ? 'border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#f43f5e_0%,#fde047_50%,#64748b_100%)]'
                      : opts.rarity === 'anomaly'
                        ? 'border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#22d3ee_0%,#a855f7_50%,#f43f5e_100%)]'
                        : 'border-[3px] border-[#14111d]';
  const showcaseStyle =
    opts.rarity === 'rainbow' ||
    opts.rarity === 'mythic' ||
    opts.rarity === 'exotic' ||
    opts.rarity === 'secret' ||
    opts.rarity === 'fusion' ||
    opts.rarity === 'limited' ||
    opts.rarity === 'twin' ||
    opts.rarity === 'novel' ||
    opts.rarity === 'omega' ||
    opts.rarity === 'anomaly'
      ? ''
      : `background:radial-gradient(circle at 50% 42%,${borderColor}7a 0%,${borderColor}38 90%);`;
  const statsHtml = opts.stats
    .map(
      ([label, val, valClass]) => `
      <div class="px-2.5 py-1.5 rounded-xl bg-[#fcecc8] border-2 border-[#14111d] flex flex-col items-start text-left min-w-0">
        <span class="text-[10px] font-black uppercase tracking-wider text-[#5b526e] leading-none">${label}</span>
        <span class="text-[13px] font-black tabular-nums leading-tight mt-0.5 truncate max-w-full ${valClass === 'text-white' ? 'text-[#14111d]' : (valClass ?? 'text-[#14111d]')}">${val}</span>
      </div>
    `
    )
    .join('');

  return `
    <div class="w-[106px] h-[106px] rounded-2xl ${showcaseBorder} flex items-center justify-center p-1.5 shrink-0 [&>.mam-3d-icon]:w-[84px] [&>.mam-3d-icon]:h-[84px] [&>svg]:w-[82px] [&>svg]:h-[82px] [&_.mam-chibi-portrait_img]:max-w-[88px] [&_.mam-chibi-portrait_img]:max-h-[88px] ${opts.dimmed ? 'grayscale brightness-[0.65]' : ''}" style="${showcaseStyle}">
      ${opts.artHtml}
    </div>
    <div class="w-full flex flex-col items-center gap-0.5 min-w-0">
      <div class="text-[19px] font-black text-[#14111d] leading-tight break-words w-full">${opts.title}</div>
      <div class="text-[11px] font-extrabold text-[#5b526e] leading-tight">${opts.subtitle}</div>
      <div class="flex items-center justify-center gap-1.5 flex-wrap mt-1">
        ${renderRarityBadgeHtml(opts.rarity)}
        ${opts.badgesHtml ?? ''}
      </div>
    </div>
    <div class="w-full grid grid-cols-2 gap-1.5 mt-0.5">
      ${statsHtml}
    </div>
    ${opts.actionHtml ? `<div class="w-full mt-auto pt-1 flex flex-col gap-1.5">${opts.actionHtml}</div>` : ''}
  `;
}

export function renderEmptyInspectorPanel(msg: string): string {
  return `<div class="mam-placeholder-well flex-1 w-full flex flex-col items-center justify-center gap-2 text-center text-[13px] font-extrabold text-[#5b526e] px-4 py-8">${msg}</div>`;
}

export function formatCountdownTimer(sec: number): string {
  const safeSec = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const mm = Math.floor(safeSec / 60);
  const ss = String(safeSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface SavedScrollEntry {
  path: number[];
  scrollTop: number;
  scrollLeft: number;
}

export function getElementPath(root: HTMLElement, el: HTMLElement): number[] {
  const path: number[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) return [];
    const idx = Array.prototype.indexOf.call(parent.children, cur);
    if (idx < 0) return [];
    path.unshift(idx);
    cur = parent;
  }
  return cur === root ? path : [];
}

export function captureRootScrolls(root: HTMLElement): SavedScrollEntry[] {
  const entries: SavedScrollEntry[] = [];
  const all = root.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    if (el.scrollTop > 0 || el.scrollLeft > 0) {
      const path = getElementPath(root, el);
      if (path.length > 0) {
        entries.push({ path, scrollTop: el.scrollTop, scrollLeft: el.scrollLeft });
      }
    }
  }
  return entries;
}

export function restoreRootScrolls(root: HTMLElement, entries: SavedScrollEntry[]): void {
  for (const entry of entries) {
    let cur: Element | null = root;
    for (const idx of entry.path) {
      cur = cur.children.item(idx);
      if (!cur) break;
    }
    if (cur && (typeof HTMLElement === 'undefined' || cur instanceof HTMLElement)) {
      const htmlEl = cur as HTMLElement;
      if (entry.scrollTop > 0) htmlEl.scrollTop = entry.scrollTop;
      if (entry.scrollLeft > 0) htmlEl.scrollLeft = entry.scrollLeft;
    }
  }
}

export type ToastTone = 'overclock' | 'bounty' | 'meteor' | 'reward' | 'audio' | 'error' | 'info';

const TOAST_SVG_BOLT = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.8 2L4.2 13.4H11.2L10 22L19.8 10.4H12.8L13.8 2Z" fill="#fde047" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/></svg>`;
const TOAST_SVG_METEOR = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 5L12.5 11.5M14.5 4.5L10.5 8.5M19.5 9.5L15.5 13.5" stroke="#14111d" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="15" r="5.2" fill="#a855f7" stroke="#14111d" stroke-width="2"/><circle cx="7.6" cy="13.6" r="1.4" fill="#fef08a"/></svg>`;
const TOAST_SVG_ERROR = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2L21.2 19.6H2.8L12 3.2Z" fill="#ff3b5c" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/><path d="M12 9.4V14" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.3" fill="#ffffff"/></svg>`;
const TOAST_SVG_AUDIO = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 9.5H8.2L14 4.8V19.2L8.2 14.5H4.5A1.5 1.5 0 0 1 3 13V11A1.5 1.5 0 0 1 4.5 9.5Z" fill="#38bdf8" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/><path d="M16.8 8.8C18.4 10.5 18.4 13.5 16.8 15.2M19.4 6.5C22 9.5 22 14.5 19.4 17.5" stroke="#14111d" stroke-width="2" stroke-linecap="round"/></svg>`;

export function classifyToast(rawText: string): { tone: ToastTone; cleanText: string; iconHtml: string } {
  const cleanText = rawText.replace(/^[\s⚡☄️★✦🔥💎🪙🎉]+/u, '').trim();
  const lower = cleanText.toLowerCase();

  if (lower.includes('overclock') || lower.includes('fever')) {
    return { tone: 'overclock', cleanText, iconHtml: TOAST_SVG_BOLT };
  }
  if (lower.includes('bounty')) {
    return { tone: 'bounty', cleanText, iconHtml: hudIconHtml('quest', 18, 'Bounty') };
  }
  if (lower.includes('meteor') || lower.includes('weather')) {
    return { tone: 'meteor', cleanText, iconHtml: TOAST_SVG_METEOR };
  }
  if (
    lower.includes('empty') ||
    lower.includes('no ') ||
    lower.includes('not enough') ||
    lower.includes('cannot') ||
    lower.includes('already') ||
    lower.includes('unavailable') ||
    lower.includes('ended') ||
    lower.includes('select a miner')
  ) {
    return { tone: 'error', cleanText, iconHtml: TOAST_SVG_ERROR };
  }
  if (
    lower.includes('audio') ||
    lower.includes('graphics') ||
    lower.includes('damage popups') ||
    lower.includes('muted')
  ) {
    return { tone: 'audio', cleanText, iconHtml: TOAST_SVG_AUDIO };
  }
  if (
    lower.includes('sold') ||
    lower.includes('collected') ||
    lower.includes('offline reward') ||
    lower.includes('gem') ||
    lower.includes('starred') ||
    lower.includes('crafted')
  ) {
    return { tone: 'reward', cleanText, iconHtml: hudIconHtml('gem', 18, 'Reward') };
  }
  return { tone: 'info', cleanText, iconHtml: hudIconHtml('sparkle', 18, 'Notice') };
}

export function renderToastBannerHtml(rawText: string): string {
  const { tone, cleanText, iconHtml } = classifyToast(rawText);
  return `
    <div class="mam-toast-banner" data-toast-tone="${tone}">
      <span class="mam-toast-icon" aria-hidden="true">${iconHtml}</span>
      <span class="text-[13.5px] font-black text-[#14111d] leading-snug">${cleanText}</span>
    </div>
  `;
}

/** Builds Sticker-Pop hover inspector card HTML for an Enchant buff. */
export function buildEnchantHoverCardHtml(
  enchant: EnchantDef,
  opts: { owned: number; spare?: number; equipped?: boolean }
): string {
  const dmgBonusPct = Math.round((enchant.dmgMult - 1) * 100);
  const oreDropPct = Math.round(enchant.oreDropPct * 100);
  const sellValuePct = Math.round(enchant.sellValuePct * 100);
  const miningSpdPct = Math.round(enchant.miningSpeedPct * 100);
  const titleCls = enchant.rarity === 'rainbow' ? 'mam-rainbow-text' : '';
  const statusLabel =
    opts.spare !== undefined
      ? opts.equipped
        ? 'Equipped'
        : opts.spare > 0
          ? `x${fmtInt(opts.spare)} Ready`
          : opts.owned > 0
            ? 'In Use'
            : 'Locked'
      : `x${fmtInt(opts.owned)}`;
  const statusValueCls =
    opts.spare !== undefined
      ? opts.equipped || opts.spare > 0
        ? 'text-[#059669]'
        : opts.owned > 0
          ? 'text-[#d97706]'
          : 'text-[#64748b]'
      : opts.owned > 0
        ? 'text-[#d97706]'
        : 'text-[#64748b]';
  const secondStatLabel = opts.spare !== undefined ? 'Status' : 'Owned';

  return `
    <div
      class="w-[248px] rounded-2xl border-[3px] border-[#14111d] bg-[#fff8e7] text-[#14111d] p-2.5 flex flex-col gap-2 text-left"
      data-enchant-hover-card="${enchant.id}"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-11 h-11 rounded-xl border-2 border-[#14111d] flex items-center justify-center shrink-0 [&>.mam-3d-icon]:w-9 [&>.mam-3d-icon]:h-9"
          style="background:radial-gradient(circle at 50% 45%,${enchant.id === 'timeless' ? '#a5b4fc' : enchant.color}7a,${enchant.id === 'timeless' ? '#a5b4fc' : enchant.color}30 88%)"
        >
          ${enchantAuraIconHtml(enchant.id, enchant.color, 36, enchant.name)}
        </div>
        <div class="min-w-0 flex-1 flex flex-col items-start gap-0.5">
          <div class="text-[15px] font-black leading-tight truncate max-w-full ${titleCls || 'text-[#14111d]'}">${enchant.name}</div>
          ${renderRarityBadgeHtml(enchant.rarity, '!ml-0')}
        </div>
      </div>

      <div class="w-full grid grid-cols-2 gap-1.5">
        <div class="px-2 py-1 rounded-lg bg-[#ffffff] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">DMG Buff</div>
          <div class="text-[12.5px] font-black tabular-nums text-[#dc2626] leading-tight">${enchant.dmgMult}x (+${fmtInt(dmgBonusPct)}%)</div>
        </div>
        <div class="px-2 py-1 rounded-lg bg-[#ffffff] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">Mining Spd</div>
          <div class="text-[12.5px] font-black tabular-nums text-[#0284c7] leading-tight">+${fmtInt(miningSpdPct)}%</div>
        </div>
        <div class="px-2 py-1 rounded-lg bg-[#ffffff] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">Ore Drop</div>
          <div class="text-[12.5px] font-black tabular-nums text-[#d97706] leading-tight">+${fmtInt(oreDropPct)}%</div>
        </div>
        <div class="px-2 py-1 rounded-lg bg-[#ffffff] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">Sell Value</div>
          <div class="text-[12.5px] font-black tabular-nums text-[#059669] leading-tight">+${fmtInt(sellValuePct)}%</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <div class="px-2 py-1 rounded-lg bg-[#fcecc8] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">Roll Rate</div>
          <div class="text-[11.5px] font-black tabular-nums text-[#0284c7]">${enchant.chancePct}%</div>
        </div>
        <div class="px-2 py-1 rounded-lg bg-[#fcecc8] border-2 border-[#14111d]">
          <div class="text-[9px] font-black uppercase tracking-wider text-[#5b526e]">${secondStatLabel}</div>
          <div class="text-[11.5px] font-black tabular-nums ${statusValueCls}">${statusLabel}</div>
        </div>
      </div>
    </div>
  `;
}

/** Binds hover (and optional tap) Enchant buff inspector above cards inside #hudRoot. */
export function bindEnchantHoverInspector(opts: {
  root: HTMLElement;
  cardSelector: string;
  getEnchantId: (el: HTMLElement) => string | undefined;
  getCardProps: (enchantId: string) => { owned: number; spare?: number; equipped?: boolean };
  allowTapToggle?: boolean;
}): void {
  const cards = opts.root.querySelectorAll<HTMLElement>(opts.cardSelector);
  if (cards.length === 0) return;

  let tipEl = opts.root.querySelector<HTMLElement>('[data-enchant-hover-tip="true"]');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.dataset.enchantHoverTip = 'true';
    tipEl.className = 'hidden absolute left-0 top-0 z-[60] pointer-events-none';
    opts.root.appendChild(tipEl);
  }

  let activeCard: HTMLElement | null = null;

  const hideTip = (): void => {
    activeCard = null;
    if (tipEl) {
      tipEl.classList.add('hidden');
      tipEl.innerHTML = '';
    }
  };

  const showTipForCard = (card: HTMLElement): void => {
    if (!tipEl) return;
    const enchantId = opts.getEnchantId(card);
    const enchant = enchantId ? getEnchantById(enchantId) : null;
    if (!enchant) {
      hideTip();
      return;
    }

    activeCard = card;
    tipEl.innerHTML = buildEnchantHoverCardHtml(enchant, opts.getCardProps(enchant.id));
    tipEl.classList.remove('hidden');

    const rootRect = opts.root.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const rootW = opts.root.clientWidth || rootRect.width || 1280;
    const uiScale = rootW > 0 && rootRect.width > 0 ? rootRect.width / rootW : 1;
    const tipW = tipEl.offsetWidth || 232;
    const tipH = tipEl.offsetHeight || 164;

    const cardCenterX = (cardRect.left + cardRect.width * 0.5 - rootRect.left) / uiScale;
    const cardTopY = (cardRect.top - rootRect.top) / uiScale;
    const left = Math.max(8, Math.min(rootW - tipW - 8, cardCenterX - tipW * 0.5));
    const top = Math.max(8, cardTopY - tipH - 10);

    tipEl.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  };

  cards.forEach((card) => {
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      showTipForCard(card);
    });
    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      if (activeCard === card) hideTip();
    });
    card.addEventListener('focusin', () => showTipForCard(card));
    card.addEventListener('focusout', () => {
      if (activeCard === card) hideTip();
    });
    if (opts.allowTapToggle) {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeCard === card && tipEl && !tipEl.classList.contains('hidden')) {
          hideTip();
        } else {
          showTipForCard(card);
        }
      });
    }
  });

  if (opts.allowTapToggle) {
    opts.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(opts.cardSelector)) {
        hideTip();
      }
    });
  }
}
