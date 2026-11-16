import { assetUrl } from '../game/AssetUrl';
import { RARITY_BORDER, ItemRarity } from '../game/GameData';
import { GameState } from '../game/GameState';
import { ChibiDef } from '../game3d/ChibiCatalog';

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
  | 'tower';

export type ModalThemeId = Exclude<ModalKind, 'none'>;

export type InvTab = 'all' | 'miners' | 'ores' | 'other';
export type InspectTab = 'pickaxe' | 'stats' | 'mutation' | 'enchants';

export function rarityCardClasses(rarity: ItemRarity, extra = ''): string {
  const cls = ['mam-card'];
  if (rarity === 'rainbow') cls.push('rarity-rainbow');
  if (rarity === 'mythic') cls.push('rarity-mythic');
  if (rarity === 'exotic') cls.push('rarity-exotic');
  if (rarity === 'secret') cls.push('rarity-secret');
  if (extra) cls.push(extra);
  return cls.join(' ');
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
      const mm = Math.floor(rem / 60);
      const ss = String(rem % 60).padStart(2, '0');
      const nextText = el.dataset.timerCompact === 'true' ? `${mm}:${ss}` : `Active ${mm}:${ss}`;
      if (el.textContent !== nextText) el.textContent = nextText;
      el.classList.add('is-active');
      el.closest('[data-inv-potion-card="true"]')?.classList.add('is-boost-active');
    }
  });
}

export const TW_TOP_CENTER =
  'absolute top-4 @max-[720px]:top-2.5 left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] pointer-events-auto';
export const TW_SHOPS_PILL =
  'inline-flex items-center gap-2 @max-[720px]:gap-1.5 px-6 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-[1.5px] border-[#4ade80]/70 bg-[linear-gradient(135deg,rgba(22,163,74,0.88)_0%,rgba(15,118,110,0.88)_100%)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_24px_-4px_rgba(34,197,94,0.45)] text-white text-[19px] @max-[720px]:text-[15px] font-extrabold cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97]';
export const TW_SIDE_BTN_BASE =
  'relative w-[88px] h-[82px] @max-[720px]:w-[74px] @max-[720px]:h-[70px] rounded-2xl backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_24px_-6px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center gap-0.5 text-white cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-[0.96]';
export const TW_SIDE_BTN_STD = `${TW_SIDE_BTN_BASE} border-[1.5px] border-[#60a5fa]/55 bg-[linear-gradient(160deg,rgba(30,58,138,0.78)_0%,rgba(12,18,36,0.9)_100%)]`;
export const TW_SIDE_BTN_UPGRADES = `${TW_SIDE_BTN_BASE} border-[1.5px] border-[#38bdf8]/60 bg-[linear-gradient(160deg,rgba(14,116,144,0.78)_0%,rgba(10,18,36,0.9)_100%)]`;
export const TW_SIDE_BTN_INDEX = `${TW_SIDE_BTN_BASE} border-[1.5px] border-[#c084fc]/60 bg-[linear-gradient(160deg,rgba(107,33,168,0.78)_0%,rgba(16,12,34,0.9)_100%)]`;
export const TW_SIDE_BTN_RAINBOW = `${TW_SIDE_BTN_BASE} border-[2px] border-transparent [background:linear-gradient(160deg,rgba(49,46,129,0.84)_0%,rgba(12,15,32,0.94)_100%)_padding-box,linear-gradient(135deg,#f43f5e,#f59e0b,#22c55e,#38bdf8,#c084fc)_border-box]`;
export const TW_BADGE_BASE =
  'absolute -top-[6px] -left-[6px] z-[4] rounded-lg bg-[linear-gradient(135deg,#fb7185_0%,#e11d48_100%)] border border-rose-200/60 shadow-[0_4px_12px_rgba(244,63,94,0.5)] text-white font-extrabold flex items-center justify-center';
export const TW_CURRENCY_BAR =
  'flex items-center justify-end gap-2 min-w-[215px] @max-[720px]:min-w-[170px] py-[5px] pr-3 pl-7 @max-[720px]:pl-4 rounded-xl border border-white/15 backdrop-blur-md bg-[linear-gradient(90deg,rgba(12,16,28,0.1)_0%,rgba(12,16,28,0.72)_38%,rgba(14,20,36,0.88)_100%)] shadow-[0_8px_20px_rgba(0,0,0,0.4)]';
export const TW_PLUS_BTN =
  'w-[26px] h-[26px] rounded-lg border border-[#4ade80]/70 bg-[linear-gradient(135deg,#22c55e_0%,#15803d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_rgba(34,197,94,0.4)] text-white text-[18px] font-black leading-none flex items-center justify-center cursor-pointer transition-[transform,filter] duration-150 ease-out hover:brightness-110 active:scale-95';
export const TW_QUICK_BTN =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[1.5px] border-[#38bdf8]/55 bg-[linear-gradient(160deg,rgba(14,116,144,0.75)_0%,rgba(12,18,34,0.88)_100%)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_6px_16px_rgba(0,0,0,0.45)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_DAILY =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[1.5px] border-[#facc15]/60 bg-[linear-gradient(160deg,rgba(202,138,4,0.78)_0%,rgba(28,20,8,0.9)_100%)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_16px_rgba(0,0,0,0.45)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_CHEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[1.5px] border-[#fb923c]/60 bg-[linear-gradient(160deg,rgba(194,65,12,0.78)_0%,rgba(28,16,10,0.9)_100%)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_rgba(0,0,0,0.45)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_QUEST =
  'relative h-[36px] min-w-[36px] px-3 rounded-xl border-[1.5px] border-[#34d399]/60 bg-[linear-gradient(160deg,rgba(5,150,105,0.78)_0%,rgba(8,28,22,0.9)_100%)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_rgba(0,0,0,0.45)] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-[5px] cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_QUICK_BTN_TRADE = TW_QUICK_BTN;
export const TW_HOTBAR_SLOT =
  'relative w-[66px] h-[66px] @max-[860px]:w-[56px] @max-[860px]:h-[56px] rounded-xl overflow-hidden cursor-pointer flex flex-col items-center justify-between p-0.5 transition-transform duration-150 ease-out hover:-translate-y-0.5';
export const TW_HOTBAR_NUM = 'absolute top-0.5 left-[6px] text-[11px] font-extrabold text-white/90 z-[3]';
export const TW_TOAST_STACK =
  'fixed bottom-[94px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-50';
export const TW_TOAST_ITEM =
  'px-4 py-1.5 rounded-xl backdrop-blur-md bg-[rgba(12,17,30,0.9)] border border-[#4ade80]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-[14px] font-extrabold text-white';
export const TW_ACTIVE_POT_PILL =
  'pointer-events-auto flex items-center gap-[7px] min-w-0 px-2.5 py-[5px] rounded-xl border border-[var(--pot-color,#4ade80)]/65 backdrop-blur-md bg-[linear-gradient(160deg,rgba(18,26,46,0.88)_0%,rgba(10,14,24,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.48)] cursor-default transition-[transform,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 @max-[720px]:px-[7px] @max-[720px]:py-1 @max-[720px]:gap-1.5';

export const TW_MODAL_BACKDROP =
  'fixed inset-0 bg-[rgba(4,7,15,0.58)] backdrop-blur-[5px] flex items-center justify-center p-3 pt-7 @max-[720px]:p-2 @max-[720px]:pt-6 pointer-events-auto z-40';
export const TW_MODAL_BOX =
  'mam-modal max-w-full min-h-[min(460px,100%)] max-h-[min(760px,calc(100%-18px))] flex flex-col pt-3 px-4 pb-4 gap-2.5';
export const TW_SHOP_MODAL_RESP =
  '@max-[720px]:px-3 @max-[720px]:pt-2.5 @max-[720px]:pb-3 @max-[720px]:min-h-0 [[data-hud-short=true]_&]:min-h-0 [[data-hud-short=true]_&]:px-3.5 [[data-hud-short=true]_&]:py-2.5 [[data-hud-short=true]_&]:gap-2';
export const TW_CLOSE_BTN =
  'w-9 h-9 @max-[720px]:w-8 @max-[720px]:h-8 shrink-0 rounded-xl border-[1.5px] border-rose-400/50 bg-[linear-gradient(135deg,rgba(225,29,72,0.92)_0%,rgba(159,18,57,0.95)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-2px_rgba(244,63,94,0.45)] text-white text-[17px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-px hover:scale-105 hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_TAB_BTN =
  'mam-tab-btn inline-flex items-center gap-[7px] px-3.5 py-[7px] @max-[720px]:px-2.5 @max-[720px]:py-1 @max-[720px]:text-[13px] rounded-xl text-[14px] font-extrabold cursor-pointer';
export const TW_MODAL_GRID_BASE = 'mam-grid flex-1 min-h-0 content-start overflow-y-auto pr-0 grid';
export const TW_SHOP_DOCK_BTN_BASE =
  'relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_16px_rgba(0,0,0,0.45)] text-white text-[13px] font-extrabold whitespace-nowrap cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-95';
export const TW_SHOP_BUY_BTN =
  'mam-sheen-hover relative overflow-hidden mt-auto w-full h-[34px] shrink-0 rounded-xl border border-[#4ade80]/60 bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_12px_-2px_rgba(34,197,94,0.4)] text-white text-[13px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out [&:not(.disabled):not(.sold-out)]:hover:-translate-y-0.5 [&:not(.disabled):not(.sold-out)]:hover:brightness-110 [&:not(.disabled):not(.sold-out)]:active:translate-y-0.5 [&:not(.disabled):not(.sold-out)]:active:scale-95 [&.disabled]:bg-white/[0.06] [&.disabled]:bg-none [&.disabled]:border-white/15 [&.disabled]:shadow-none [&.disabled]:text-[#94a3b8] [&.disabled]:active:scale-[0.97] [&.sold-out]:bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] [&.sold-out]:border-rose-400/50 [&.sold-out]:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_-2px_rgba(239,68,68,0.4)] [&.sold-out]:active:scale-[0.97]';
export const TW_SHOP_SIGN_BASE =
  'absolute -translate-x-1/2 translate-y-[calc(-100%-10px)] pointer-events-auto px-3 py-[5px] rounded-xl border border-white/25 backdrop-blur-md text-white text-center whitespace-nowrap cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:translate-y-[calc(-100%-14px)] hover:scale-[1.05] hover:brightness-110 active:translate-y-[calc(-100%-6px)] active:scale-95';
export const TW_INSPECT_ARROW =
  'absolute top-[48%] -translate-y-1/2 w-10 h-10 rounded-xl border border-white/25 bg-[rgba(15,23,42,0.82)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.45)] text-white text-[22px] font-black cursor-pointer flex items-center justify-center transition-[transform,filter,box-shadow] duration-150 ease-out hover:scale-[1.08] hover:border-[#38bdf8]/70 active:scale-[0.93]';
export const TW_INSPECT_TAB =
  'h-10 @max-[920px]:h-9 rounded-xl border border-white/15 bg-[rgba(15,23,42,0.78)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_16px_rgba(0,0,0,0.4)] text-[#cbd5e1] text-[15px] @max-[920px]:text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out hover:bg-[rgba(30,41,59,0.9)] hover:text-white active:scale-95 [&.active]:bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] [&.active]:border-[#4ade80]/70 [&.active]:text-white [&.active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_18px_-2px_rgba(34,197,94,0.45)]';
export const TW_STAT_CARD =
  'flex-1 min-w-[190px] @max-[920px]:min-w-[155px] px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col items-center gap-1.5';
export const TW_STAT_BTN =
  'w-full h-[34px] rounded-xl border border-[#4ade80]/60 bg-[linear-gradient(135deg,#22c55e,#059669)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-2px_rgba(34,197,94,0.35)] text-white text-[14px] font-black cursor-pointer transition-[transform,filter,box-shadow] duration-150 ease-out [&:not(.maxed)]:hover:-translate-y-0.5 [&:not(.maxed)]:hover:brightness-110 [&:not(.maxed)]:active:scale-[0.97] [&.maxed]:border-[#facc15]/45 [&.maxed]:bg-[rgba(250,204,21,0.12)] [&.maxed]:shadow-none [&.maxed]:text-[#fde047] [&.maxed]:cursor-default';
export const TW_STRIP_CARD =
  'mam-strip-card relative min-w-[86px] w-[86px] h-[86px] rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer [&.equipped]:shadow-[0_0_0_2px_#4ade80,0_0_14px_rgba(74,222,128,0.35)]';
export const TW_ALTAR_ROLL_BTN =
  'mam-altar-roll-btn relative overflow-hidden w-[280px] max-w-full h-[46px] rounded-2xl border-[1.5px] border-[#4ade80]/70 bg-[linear-gradient(135deg,#22c55e_0%,#059669_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_28px_-4px_rgba(34,197,94,0.5)] text-white text-[20px] font-black cursor-pointer transition-[transform,filter,box-shadow,opacity] duration-150 ease-out [&:not(.is-empty):not(.is-spinning)]:hover:-translate-y-0.5 [&:not(.is-empty):not(.is-spinning)]:hover:brightness-110 [&:not(.is-empty):not(.is-spinning)]:active:scale-[0.96] [&.is-empty]:border-rose-400/60 [&.is-empty]:bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] [&.is-empty]:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_-4px_rgba(239,68,68,0.45)] [&.is-spinning]:border-purple-300/60 [&.is-spinning]:bg-[linear-gradient(135deg,#a855f7_0%,#6d28d9_100%)] [&.is-spinning]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-4px_rgba(168,85,247,0.5)] [&.is-spinning]:cursor-not-allowed [&.is-spinning]:pointer-events-none [&.is-spinning]:opacity-95';
export const TW_ALTAR_AUTO_BTN =
  'mam-sheen-hover relative overflow-hidden w-full px-[18px] py-2 rounded-lg border-[2.5px] border-[#0c4a6e] bg-[linear-gradient(180deg,#38bdf8_0%,#0284c7_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_0_#0c4a6e] text-white text-[14px] font-black cursor-pointer transition-[transform,filter,box-shadow,background] duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-[1.09] active:translate-y-[3px] active:scale-[0.96] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_1px_0_#0c4a6e] [&.is-active]:border-[#7f1d1d] [&.is-active]:bg-[linear-gradient(180deg,#f87171_0%,#dc2626_100%)] [&.is-active]:shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#7f1d1d] [&.is-active]:active:shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_1px_0_#7f1d1d]';

export function renderModalShell(opts: {
  title: string;
  theme?: ModalThemeId;
  iconHtml?: string;
  boxClass?: string;
  headerExtraHtml?: string;
  bodyHtml: string;
}): string {
  const themeAttr = opts.theme ? `data-modal-theme="${opts.theme}"` : 'data-modal-theme="inventory"';
  const extraRow = opts.headerExtraHtml
    ? `<div class="flex items-center justify-end gap-2.5 flex-wrap w-full">${opts.headerExtraHtml}</div>`
    : '';
  return `
    <div class="${TW_MODAL_BACKDROP}" data-backdrop="true">
      <div class="${TW_MODAL_BOX} ${opts.boxClass ?? 'w-[780px]'}" ${themeAttr} role="dialog" aria-modal="true" aria-label="${opts.title}">
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
          : 'border-[2.5px]';
  const showcaseStyle =
    opts.rarity === 'rainbow' || opts.rarity === 'exotic' || opts.rarity === 'secret'
      ? ''
      : `border-color:${borderColor};background:radial-gradient(circle at 50% 42%,${borderColor}40,rgba(15,19,27,0.96) 78%);`;
  const rarityLabel = opts.rarity.charAt(0).toUpperCase() + opts.rarity.slice(1);
  const statsHtml = opts.stats
    .map(
      ([label, val, valClass]) => `
      <div class="px-2.5 py-1.5 rounded-xl bg-white/[0.045] border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col items-start text-left min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] leading-none">${label}</span>
        <span class="text-[13px] font-black leading-tight mt-0.5 truncate max-w-full ${valClass ?? 'text-white'}">${val}</span>
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
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border" style="color:${borderColor};border-color:${borderColor}88;background:${borderColor}20">${rarityLabel}</span>
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
