import { assetUrl } from '../game/AssetUrl';
import { RARITY_BORDER, ItemRarity } from '../game/GameData';
import { GameState } from '../game/GameState';
import { ChibiDef } from '../game3d/ChibiCatalog';
import type { PlotLabelInfo } from '../game3d/PlotPedestal3D';
import { hudIconHtml } from './HudIcons';

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
  | 'upgrades'
  | 'worlds'
  | 'tower'
  | 'forge'
  | 'settings'
  | 'offline'
  | 'bounties'
  | 'altar-hub';

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
  if (extra) cls.push(extra);
  return cls.join(' ');
}

export function renderRarityBadgeHtml(rarity: ItemRarity, extraCls = ''): string {
  if (rarity === 'fusion') {
    return `<span class="mam-fusion-badge ${extraCls}"><span>✦</span><span>FUSION</span></span>`;
  }
  const borderColor = RARITY_BORDER[rarity];
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${extraCls}" style="color:${borderColor};border-color:${borderColor}88;background:${borderColor}20">${rarityLabel}</span>`;
}

export function rarityVars(rarity: ItemRarity): string {
  const border = RARITY_BORDER[rarity];
  return `--rarity-border:${border};--rarity-bg:${border}44;`;
}

export function applyInspectRing(el: Element, selected: boolean): void {
  el.classList.toggle('ring-[2.5px]', selected);
  el.classList.toggle('ring-[#38bdf8]', selected);
  el.classList.toggle('shadow-[0_0_12px_rgba(56,189,248,0.45)]', selected);
  if (!selected) {
    el.classList.remove(
      'shadow-[0_0_12px_rgba(56,189,248,0.4)]',
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
  'absolute top-4 @max-[720px]:top-2.5 left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] pointer-events-auto';
export const TW_SHOPS_PILL =
  'inline-flex items-center justify-center gap-2 @max-[720px]:gap-1.5 min-w-[152px] @max-[720px]:min-w-[122px] px-6 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-2 border-[#4ade80] bg-[linear-gradient(135deg,#16a34a_0%,#0f766e_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#064e3b,0_10px_24px_-4px_rgba(34,197,94,0.45)] text-white text-[19px] @max-[720px]:text-[15px] font-extrabold cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97]';
export const TW_TELEPORT_PILL =
  'relative inline-flex items-center justify-center gap-2 @max-[720px]:gap-1.5 min-w-[152px] @max-[720px]:min-w-[122px] px-6 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-2 border-[#38bdf8] bg-[linear-gradient(135deg,#0284c7_0%,#2563eb_55%,#4338ca_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_4px_0_#1e1b4b,0_10px_24px_-4px_rgba(56,189,248,0.48)] text-white text-[19px] @max-[720px]:text-[15px] font-extrabold cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97]';
export const TW_SIDE_BTN_BASE =
  'relative w-[88px] h-[82px] @max-[720px]:w-[74px] @max-[720px]:h-[70px] rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_0_#050812,0_10px_24px_-6px_rgba(0,0,0,0.72)] flex flex-col items-center justify-center gap-0.5 text-white cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]';
export const TW_SIDE_BTN_STD = `${TW_SIDE_BTN_BASE} border-2 border-[#60a5fa] bg-[linear-gradient(160deg,#1e3a8a_0%,#0f1a38_100%)]`;
export const TW_SIDE_BTN_UPGRADES = `${TW_SIDE_BTN_BASE} border-2 border-[#38bdf8] bg-[linear-gradient(160deg,#0e7490_0%,#0c1a36_100%)]`;
export const TW_SIDE_BTN_INDEX = `${TW_SIDE_BTN_BASE} border-2 border-[#c084fc] bg-[linear-gradient(160deg,#6b21a8_0%,#181033_100%)]`;
export const TW_SIDE_BTN_RAINBOW = `${TW_SIDE_BTN_BASE} border-[2.5px] border-transparent [background:linear-gradient(160deg,#312e81_0%,#11162e_100%)_padding-box,linear-gradient(135deg,#f43f5e,#f59e0b,#22c55e,#38bdf8,#c084fc)_border-box]`;
export const TW_BADGE_BASE =
  'mam-notif-badge absolute -top-[7px] -left-[7px] z-[4] bg-[linear-gradient(135deg,#fb7185_0%,#e11d48_100%)] border border-rose-200 text-white font-black flex items-center justify-center leading-none';
export const TW_CURRENCY_BAR =
  'flex items-center justify-end gap-2 min-w-[215px] @max-[720px]:min-w-[170px] py-[5px] pr-3 pl-5 @max-[720px]:pl-3.5 rounded-xl border-2 border-[#2a3b5c] bg-[linear-gradient(135deg,#131d36_0%,#0b1121_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_rgba(0,0,0,0.62)]';
export const TW_PLUS_BTN =
  'w-[26px] h-[26px] rounded-lg border border-[#4ade80] bg-[linear-gradient(135deg,#22c55e_0%,#15803d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_rgba(34,197,94,0.4)] text-white text-[18px] font-black leading-none flex items-center justify-center cursor-pointer transition-[transform,filter] duration-150 ease-out hover:brightness-110 active:scale-95';
export const TW_QUICK_BTN =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-2 border-[#38bdf8] bg-[linear-gradient(160deg,#0e7490_0%,#0f1c36_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_3px_0_#071022,0_6px_16px_rgba(0,0,0,0.58)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_DAILY =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-2 border-[#facc15] bg-[linear-gradient(160deg,#ca8a04_0%,#291c08_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_3px_0_#1c1304,0_6px_16px_rgba(0,0,0,0.58)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_CHEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-2 border-[#fb923c] bg-[linear-gradient(160deg,#c2410c_0%,#29150b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_3px_0_#1a0d06,0_6px_16px_rgba(0,0,0,0.58)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_QUEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-2 border-[#34d399] bg-[linear-gradient(160deg,#059669_0%,#0b2920_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_3px_0_#051a14,0_6px_16px_rgba(0,0,0,0.58)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_TRADE = TW_QUICK_BTN;
export const TW_HOTBAR_SLOT =
  'mam-hotbar-slot relative w-[66px] h-[66px] @max-[860px]:w-[56px] @max-[860px]:h-[56px] overflow-hidden cursor-pointer flex flex-col items-center justify-between p-0.5';
export const TW_HOTBAR_NUM = 'mam-hotbar-keycap';
export const TW_TOAST_STACK =
  'fixed bottom-[102px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-50';
export const TW_TOAST_ITEM =
  'px-4 py-1.5 rounded-xl bg-[#0e1528] border-2 border-[#4ade80] shadow-[0_8px_24px_rgba(0,0,0,0.68)] text-[14px] font-extrabold text-white';
export const TW_ACTIVE_POT_PILL =
  'pointer-events-auto flex items-center gap-[7px] min-w-0 px-2.5 py-[5px] rounded-xl border-2 border-[var(--pot-color,#4ade80)] bg-[linear-gradient(160deg,#16203a_0%,#0b1020_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.62)] cursor-default transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 @max-[720px]:px-[7px] @max-[720px]:py-1 @max-[720px]:gap-1.5';

export const TW_MODAL_BACKDROP =
  'fixed inset-0 bg-[rgba(4,7,15,0.66)] backdrop-blur-[5px] flex items-center justify-center p-3 pt-7 @max-[720px]:p-2 @max-[720px]:pt-6 pointer-events-auto z-40';
export const TW_MODAL_BOX =
  'mam-modal max-w-full h-[min(640px,calc(100%-18px))] min-h-0 flex flex-col pt-3 px-4 pb-4 gap-2.5';
export const TW_SHOP_MODAL_RESP =
  '@max-[720px]:px-3 @max-[720px]:pt-2.5 @max-[720px]:pb-3 [[data-hud-short=true]_&]:px-3.5 [[data-hud-short=true]_&]:py-2.5 [[data-hud-short=true]_&]:gap-2';
export const TW_CLOSE_BTN =
  'w-9 h-9 @max-[720px]:w-8 @max-[720px]:h-8 shrink-0 rounded-xl border-2 border-rose-400 bg-[linear-gradient(135deg,#e11d48_0%,#9f1239_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_3px_0_#4c0519,0_6px_16px_-2px_rgba(244,63,94,0.5)] text-white text-[17px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-px hover:scale-105 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_TAB_BTN =
  'mam-tab-btn inline-flex items-center gap-[7px] px-3.5 py-[7px] @max-[720px]:px-2.5 @max-[720px]:py-1 @max-[720px]:text-[13px] rounded-xl text-[14px] font-extrabold cursor-pointer';
export const TW_MODAL_GRID_BASE = 'mam-grid flex-1 min-h-0 content-start overflow-y-auto pr-0 grid';
export const TW_SHOP_DOCK_BTN_BASE =
  'relative overflow-hidden shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 @max-[760px]:px-2.5 @max-[760px]:py-1.5 @max-[760px]:gap-1 @max-[760px]:text-[11.5px] [&>img]:shrink-0 [&>svg]:shrink-0 @max-[760px]:[&>img]:w-[22px] @max-[760px]:[&>img]:h-[22px] @max-[760px]:[&>svg]:w-[20px] @max-[760px]:[&>svg]:h-[20px] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_3px_0_#050812,0_6px_16px_rgba(0,0,0,0.55)] text-white text-[13px] font-extrabold whitespace-nowrap cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_SHOP_BUY_BTN =
  'mam-sheen-hover relative overflow-hidden mt-auto w-full h-[34px] shrink-0 rounded-xl border-2 border-[#4ade80] bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_12px_-2px_rgba(34,197,94,0.45)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out [&:not(.disabled):not(.sold-out)]:hover:-translate-y-0.5 [&:not(.disabled):not(.sold-out)]:hover:brightness-110 [&:not(.disabled):not(.sold-out)]:active:translate-y-0.5 [&:not(.disabled):not(.sold-out)]:active:scale-95 [&.disabled]:bg-[#1a2236] [&.disabled]:bg-none [&.disabled]:border-[#2f3d5c] [&.disabled]:shadow-none [&.disabled]:text-[#94a3b8] [&.disabled]:active:scale-[0.97] [&.sold-out]:bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] [&.sold-out]:border-rose-400 [&.sold-out]:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_-2px_rgba(239,68,68,0.45)] [&.sold-out]:active:scale-[0.97]';
export const TW_SHOP_SIGN_BASE =
  'absolute -translate-x-1/2 translate-y-[calc(-100%-10px)] pointer-events-auto px-3 py-[5px] rounded-xl border-2 border-[#3b4f78] bg-[#10182b] text-white text-center whitespace-nowrap cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:translate-y-[calc(-100%-14px)] hover:scale-[1.05] hover:brightness-110 active:translate-y-[calc(-100%-6px)] active:scale-95';
export const TW_INSPECT_ARROW =
  'absolute top-[48%] -translate-y-1/2 w-10 h-10 rounded-xl border-2 border-[#3b4f78] bg-[#121c33] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#060a14,0_8px_20px_rgba(0,0,0,0.6)] text-white text-[22px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter,box-shadow] duration-150 ease-out hover:scale-[1.08] hover:border-[#38bdf8] active:scale-[0.93]';
export const TW_INSPECT_TAB =
  'h-10 @max-[920px]:h-9 rounded-xl border-2 border-[#2d3e61] bg-[#131c33] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_3px_0_#060a14,0_6px_16px_rgba(0,0,0,0.55)] text-[#cbd5e1] text-[15px] @max-[920px]:text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:bg-[#1c2947] hover:text-white active:scale-95 [&.active]:bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] [&.active]:border-[#4ade80] [&.active]:text-white [&.active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_18px_-2px_rgba(34,197,94,0.45)]';
export const TW_STAT_CARD =
  'flex-1 min-w-[190px] @max-[920px]:min-w-[155px] px-3 py-2.5 rounded-xl bg-[#131c31] border border-[#2a3b5c] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col items-center gap-1.5';
export const TW_STAT_BTN =
  'w-full h-[34px] rounded-xl border-2 border-[#4ade80] bg-[linear-gradient(135deg,#22c55e,#059669)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-2px_rgba(34,197,94,0.4)] text-white text-[14px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out [&:not(.maxed)]:hover:-translate-y-0.5 [&:not(.maxed)]:hover:brightness-110 [&:not(.maxed)]:active:scale-[0.97] [&.maxed]:border-[#eab308] [&.maxed]:bg-[#29200a] [&.maxed]:shadow-none [&.maxed]:text-[#fde047] [&.maxed]:cursor-default';
export const TW_STRIP_CARD =
  'mam-strip-card relative min-w-[86px] w-[86px] h-[86px] rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer [&.equipped]:shadow-[0_0_0_2px_#4ade80,0_0_14px_rgba(74,222,128,0.35)]';
export const TW_ALTAR_ROLL_BTN =
  'mam-altar-roll-btn relative overflow-hidden w-[280px] max-w-full h-[46px] rounded-2xl border-2 border-[#4ade80] bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_0_#064e3b,0_10px_28px_-4px_rgba(34,197,94,0.5)] text-white text-[20px] font-black cursor-pointer transition-[transform,filter,box-shadow,opacity] duration-150 ease-out [&:not(.is-empty):not(.is-spinning)]:hover:-translate-y-0.5 [&:not(.is-empty):not(.is-spinning)]:hover:brightness-110 [&:not(.is-empty):not(.is-spinning)]:active:scale-[0.96] [&.is-empty]:border-rose-400 [&.is-empty]:bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] [&.is-empty]:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_0_#450a0a,0_10px_24px_-4px_rgba(239,68,68,0.45)] [&.is-spinning]:border-purple-300 [&.is-spinning]:bg-[linear-gradient(135deg,#a855f7_0%,#6d28d9_100%)] [&.is-spinning]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-4px_rgba(168,85,247,0.5)] [&.is-spinning]:cursor-not-allowed [&.is-spinning]:pointer-events-none [&.is-spinning]:opacity-95';
export const TW_ALTAR_AUTO_BTN =
  'mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-xl border-2 border-sky-300 bg-[linear-gradient(135deg,#0ea5e9_0%,#0284c7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_#0c4a6e,0_8px_20px_-4px_rgba(14,165,233,0.45)] text-white text-[14px] font-black cursor-pointer transition-[transform,filter,box-shadow,background] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] [&.is-active]:border-rose-300 [&.is-active]:bg-[linear-gradient(135deg,#f43f5e_0%,#be123c_100%)] [&.is-active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_3px_0_#4c0519,0_8px_20px_-4px_rgba(244,63,94,0.45)]';

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
    ? `<div class="flex items-center justify-end gap-2.5 flex-wrap w-full">${opts.headerExtraHtml}</div>`
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
          <div class="mam-title-plaque">
            ${opts.iconHtml ? `<span class="mam-title-plaque-icon shrink-0 [&>img]:w-5 [&>img]:h-5 [&>svg]:w-5 [&>svg]:h-5">${opts.iconHtml}</span>` : ''}
            <span>${opts.title}</span>
          </div>
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
      ? 'border-[2.5px] border-transparent [background:radial-gradient(circle_at_50%_45%,rgba(250,204,21,0.35),#141821_82%)_padding-box,linear-gradient(135deg,#ef4444,#facc15,#22c55e,#38bdf8,#a855f7)_border-box]'
      : opts.rarity === 'exotic'
        ? 'border-[2.5px] border-transparent [background:radial-gradient(circle_at_50%_45%,rgba(20,184,166,0.42),#0d1820_84%)_padding-box,linear-gradient(135deg,#2dd4bf,#06b6d4,#34d399,#22d3ee)_border-box]'
        : opts.rarity === 'secret'
          ? 'border-[2.5px] border-transparent [background:radial-gradient(circle_at_50%_45%,rgba(244,63,94,0.45),#090a12_84%)_padding-box,linear-gradient(135deg,#f43f5e,#fbbf24,#9f1239,#f59e0b)_border-box]'
          : opts.rarity === 'fusion'
            ? 'border-[2.5px] border-transparent [background:radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.42),rgba(168,85,247,0.3)_50%,#090b18_86%)_padding-box,linear-gradient(135deg,#22d3ee,#818cf8,#e879f9,#facc15,#22d3ee)_border-box]'
            : 'border-[2.5px]';
  const showcaseStyle =
    opts.rarity === 'rainbow' || opts.rarity === 'exotic' || opts.rarity === 'secret' || opts.rarity === 'fusion'
      ? ''
      : `border-color:${borderColor};background:radial-gradient(circle at 50% 42%,${borderColor}40,rgba(15,19,27,0.96) 78%);`;
  const statsHtml = opts.stats
    .map(
      ([label, val, valClass]) => `
      <div class="px-2.5 py-1.5 rounded-xl bg-[#131c31] border border-[#2a3b5c] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] flex flex-col items-start text-left min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] leading-none">${label}</span>
        <span class="text-[13px] font-black tabular-nums leading-tight mt-0.5 truncate max-w-full ${valClass ?? 'text-white'}">${val}</span>
      </div>
    `
    )
    .join('');

  return `
    <div class="w-[106px] h-[106px] rounded-2xl ${showcaseBorder} flex items-center justify-center p-1.5 shrink-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)] [&>.mam-3d-icon]:w-[84px] [&>.mam-3d-icon]:h-[84px] [&>svg]:w-[82px] [&>svg]:h-[82px] [&_.mam-chibi-portrait_img]:max-w-[88px] [&_.mam-chibi-portrait_img]:max-h-[88px] ${opts.dimmed ? 'grayscale brightness-[0.55]' : ''}" style="${showcaseStyle}">
      ${opts.artHtml}
    </div>
    <div class="w-full flex flex-col items-center gap-0.5 min-w-0">
      <div class="text-[19px] font-black text-white leading-tight break-words w-full [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">${opts.title}</div>
      <div class="text-[11px] font-bold text-[#94a3b8] leading-tight">${opts.subtitle}</div>
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
  return `<div class="mam-placeholder-well flex-1 w-full flex flex-col items-center justify-center gap-2 text-center text-[13px] font-bold text-[#94a3b8] px-4 py-8">${msg}</div>`;
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

const TOAST_SVG_BOLT = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.5 2L4.5 13.2H11.4L10.3 22L19.5 10.6H12.7L13.5 2Z" fill="#fde047" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const TOAST_SVG_METEOR = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 5L11.5 12.5M14 5L9.5 9.5M19 10L14.5 14.5" stroke="#e9d5ff" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="15" r="5" fill="#c084fc" stroke="#f5d0fe" stroke-width="1.5"/></svg>`;
const TOAST_SVG_ERROR = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5L21 19.5H3L12 3.5Z" fill="#fb7185" fill-opacity="0.25" stroke="#fb7185" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.5V13.8M12 16.8H12.01" stroke="#ffe4e6" stroke-width="2" stroke-linecap="round"/></svg>`;
const TOAST_SVG_AUDIO = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 9.5H8L13.5 5V19L8 14.5H4.5A1.5 1.5 0 0 1 3 13V11A1.5 1.5 0 0 1 4.5 9.5Z" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="1.4" stroke-linejoin="round"/><path d="M16.5 8.8C18.2 10.5 18.2 13.5 16.5 15.2M19.2 6.5C22 9.5 22 14.5 19.2 17.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/></svg>`;

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
      <span class="text-[13.5px] font-extrabold text-white leading-snug mam-outline-sm">${cleanText}</span>
    </div>
  `;
}
