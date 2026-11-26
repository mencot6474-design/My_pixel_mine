import { audio } from '../audio/AudioManager';
import { getChibiById } from '../game3d/ChibiCatalog';
import { GameState } from '../game/GameState';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  buildTowerRunBuffPills,
  countTowerBlessingStacks,
  formatBlessingPickPreview,
  getTowerFloorDef,
  getTowerStreakGemMult,
  groupTowerBlessings,
  TOWER_BLESSING_REROLL_GEM_COST,
  TOWER_DICE_PITY_MAX,
  TOWER_MAX_FLOOR,
  TOWER_ORE_ROCKS_PER_WAVE,
} from '../game/TowerData';
import { towerBlessingIconHtml, towerIconHtml } from './HudIcons';
import { chibiPortraitHtml, ModalKind } from './HudShared';

const BATTLE_SHIELD_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" class="shrink-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.85)]" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="mam-b-shield" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="45%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <path d="M12 2.5L19.5 5.5V11.6C19.5 16.4 16.3 20.1 12 21.8C7.7 20.1 4.5 16.4 4.5 11.6V5.5L12 2.5Z" fill="url(#mam-b-shield)" stroke="#e0f2fe" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M12 5.2L16.8 7.2V11.5C16.8 14.8 14.7 17.5 12 18.8C9.3 17.5 7.2 14.8 7.2 11.5V7.2L12 5.2Z" fill="#0c4a6e" fill-opacity="0.55"/>
  <path d="M12 7.4L13.4 11L12 14.6L10.6 11L12 7.4Z" fill="#ffffff"/>
</svg>`;

const BATTLE_BOLT_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" class="shrink-0 drop-shadow-[0_0_5px_rgba(251,113,133,0.85)]" fill="none" aria-hidden="true">
  <path d="M13.5 2L5 13H11.5L10.2 22L19 10.6H12.6L13.5 2Z" fill="#fde047" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

const BATTLE_PICKAXE_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" class="shrink-0 drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="mam-b-pick" x1="3" y1="3" x2="21" y2="14" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <path d="M14.2 9.8L4.4 19.6" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M14.2 9.8L4.4 19.6" stroke="#fde68a" stroke-width="1" stroke-linecap="round"/>
  <path d="M8.2 4.2C12.2 3.4 16.5 5 19.6 8.2C20.5 9.1 21 10.2 21.2 11.4L17.8 11.9C17.2 10.6 16.3 9.5 15.2 8.7L12.1 11.8L10.3 10L13.4 6.9C11.9 6.2 10.2 5.9 8.6 6.2L8.2 4.2Z" fill="url(#mam-b-pick)" stroke="#e0f2fe" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

const BATTLE_TIMER_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" class="shrink-0" fill="none" aria-hidden="true">
  <circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2"/>
  <path d="M9.5 2.8H14.5M12 13L15.2 9.8M12 5V2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const MAX_INLINE_BUFF_PILLS = 5;

export class TowerArenaHudUi {
  private blessingsPopoverOpen = false;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onExitTowerArena: () => void,
    private readonly onRequestRender: () => void
  ) {}

  public isBlessingsPopoverOpen(): boolean {
    return this.blessingsPopoverOpen;
  }

  public setBlessingsPopoverOpen(open: boolean): void {
    this.blessingsPopoverOpen = open;
  }

  private renderOrePipsHtml(): string {
    const run = this.state.towerRun;
    if (!run || run.isBossWave) return '';
    return run.waveOres
      .map((ore) => {
        const bg = ore.alive ? ore.color : 'rgba(255,255,255,0.12)';
        const border = ore.alive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)';
        return `<span class="w-2.5 h-2.5 rounded-full border transition-all duration-150 ${
          ore.alive ? 'scale-100 shadow-[0_0_8px_rgba(255,255,255,0.35)]' : 'scale-75 opacity-40'
        }" style="background:${bg};border-color:${border}" title="${ore.name} (${ore.variantKey})"></span>`;
      })
      .join('');
  }

  public renderTowerArenaHud(currencyRailHtml: string, toastStackHtml: string): string {
    const run = this.state.towerRun;
    if (!run) return '';
    const floorDef = getTowerFloorDef(run.floor);
    const hpPct = run.maxHp > 0 ? Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100)) : 0;
    const timerDanger = run.timeLeft <= 5;
    const effDps = this.state.getTowerEffectiveDps();
    const effTap = this.state.getTowerEffectiveTapDamage();
    const aliveOres = run.waveOres.filter((o) => o.alive).length;

    const totalBlessings = run.blessings.length;
    if (totalBlessings === 0 && this.blessingsPopoverOpen) {
      this.blessingsPopoverOpen = false;
    }
    const groupedBlessings = groupTowerBlessings(run.blessings);
    const buffPills = buildTowerRunBuffPills(run.blessings);
    const inlineBuffPills = buffPills.slice(0, MAX_INLINE_BUFF_PILLS);
    const overflowBuffCount = Math.max(0, buffPills.length - inlineBuffPills.length);
    const ownedStacks = countTowerBlessingStacks(run.blessings);
    const showPopover = this.blessingsPopoverOpen && totalBlessings > 0 && !run.pendingBlessings;

    const blessingsSummaryBarHtml =
      totalBlessings > 0
        ? `
          <button
            type="button"
            class="mam-tower-pill mam-battle-blessing-summary-btn ${showPopover ? 'is-open' : ''}"
            data-action="tower-toggle-blessings"
            data-tower-blessings-summary="true"
            aria-expanded="${showPopover ? 'true' : 'false'}"
            title="Click to inspect all active Spire Blessings"
          >
            <span>✦ ${totalBlessings} ${totalBlessings === 1 ? 'Blessing' : 'Blessings'}</span>
            <span class="opacity-75">(${groupedBlessings.length} ${groupedBlessings.length === 1 ? 'Type' : 'Types'})</span>
            <span class="text-[9px] leading-none" aria-hidden="true">${showPopover ? '▾' : '▴'}</span>
          </button>
          <span class="w-[1.5px] h-4 rounded-full bg-[#14111d]/20 shrink-0" aria-hidden="true"></span>
          <div class="flex items-center gap-1.5 flex-nowrap overflow-x-auto mam-no-scrollbar min-w-0 flex-1" data-tower-run-buffs="true">
            ${inlineBuffPills
              .map(
                (p) =>
                  `<span class="mam-tower-pill ${p.bgClass} ${p.textClass}" data-tower-buff-pill="${p.id}">${p.label}</span>`
              )
              .join('')}
          </div>
          ${
            overflowBuffCount > 0
              ? `<button
                  type="button"
                  class="mam-tower-pill bg-[#fcecc8] hover:bg-[#fde047] text-[#14111d] cursor-pointer transition-transform active:scale-95 shrink-0"
                  data-action="tower-toggle-blessings"
                  data-tower-buffs-more="true"
                  title="Show all ${buffPills.length} active run buffs"
                >+${overflowBuffCount} more</button>`
              : ''
          }
        `
        : `<span class="mam-tower-pill bg-[#fcecc8] text-[#475569]">✦ Clear Wave 10 Boss for Blessings</span>`;

    const blessingsPopoverHtml = showPopover
      ? `
        <div class="mam-battle-blessing-popover" data-tower-blessings-popover="true" role="dialog" aria-label="Active Spire Blessings">
          <div class="flex items-center justify-between gap-2 pb-2 border-b-[1.5px] border-[#14111d]/15">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-[12px] font-black text-[#14111d] truncate">✦ Active Spire Blessings</span>
              <span class="mam-tower-pill bg-[#fcecc8] text-[#92400e]">${totalBlessings} Total • ${groupedBlessings.length} Types</span>
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded-lg border-2 border-[#14111d] bg-white hover:bg-[#fee2e2] text-[#14111d] text-[11px] font-black flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95"
              data-action="tower-close-blessings"
              aria-label="Close blessings list"
            >✕</button>
          </div>
          ${
            buffPills.length > 0
              ? `<div class="flex items-center gap-1.5 flex-wrap py-2 border-b-[1.5px] border-[#14111d]/15" data-popover-all-buffs="true">
                  ${buffPills
                    .map(
                      (p) =>
                        `<span class="mam-tower-pill ${p.bgClass} ${p.textClass}">${p.label}</span>`
                    )
                    .join('')}
                </div>`
              : ''
          }
          <div class="grid grid-cols-2 @max-[640px]:grid-cols-1 gap-1.5 pt-2 max-h-[220px] overflow-y-auto overscroll-contain pr-0.5">
            ${groupedBlessings
              .map((entry) => {
                const stackBadge = entry.maxed
                  ? `<span class="px-1.5 py-0.5 rounded-md border-[1.5px] border-[#14111d] bg-[#fde047] text-[#854d0e] text-[9.5px] font-black leading-none shrink-0">×${entry.count} MAX</span>`
                  : `<span class="px-1.5 py-0.5 rounded-md border-[1.5px] border-[#14111d] bg-[#fff8e7] text-[#14111d] text-[9.5px] font-black leading-none shrink-0">×${entry.count}${entry.def.maxStacks ? `/${entry.def.maxStacks}` : ''}</span>`;
                return `
                  <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border-2 border-[#14111d] bg-white min-w-0" data-popover-blessing-row="${entry.def.id}">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="w-6 h-6 rounded-lg border-[1.5px] border-[#14111d] flex items-center justify-center shrink-0" style="background:${entry.def.color}28">
                        ${towerBlessingIconHtml(entry.def.id, 16)}
                      </span>
                      <span class="text-[11px] font-black text-[#14111d] truncate">${entry.def.name}</span>
                      ${stackBadge}
                    </div>
                    <span class="text-[10.5px] font-black text-[#0369a1] tabular-nums whitespace-nowrap shrink-0">${entry.totalLabel}</span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

    const freeRerolls = run.freeBlessingRerolls ?? 0;
    const canPaidReroll = this.state.gems >= TOWER_BLESSING_REROLL_GEM_COST;
    const canReroll = freeRerolls > 0 || canPaidReroll;

    const blessingOverlay = run.pendingBlessings
      ? `
        <div class="absolute inset-0 z-40 bg-[#14111d]/60 flex items-center justify-center p-4 pointer-events-auto">
          <div class="mam-modal w-[min(780px,100%)] p-5 flex flex-col gap-3.5" data-modal-theme="tower">
            <div class="mam-modal-surface" aria-hidden="true"></div>
            <div class="mam-modal-rails" aria-hidden="true">
              <span class="mam-rail-stud is-tl"></span><span class="mam-rail-stud is-tr"></span>
              <span class="mam-rail-stud is-bl"></span><span class="mam-rail-stud is-br"></span>
            </div>
            <div class="text-center pt-1 relative z-[2]">
              <div class="text-[11px] font-black uppercase tracking-widest text-[#0284c7]">Floor ${run.floor} Boss Defeated!</div>
              <div class="text-[24px] font-black text-[#14111d]">Choose 1 Spire Blessing</div>
              <div class="mt-0.5 text-[12px] font-black text-[#b45309] tabular-nums" data-tower-blessing-timer="true">
                Auto-pick random in ${(run.blessingTimerLeft ?? 5).toFixed(1)}s
              </div>
            </div>
            <div class="grid grid-cols-3 @max-[720px]:grid-cols-1 gap-3 relative z-[2]">
              ${run.pendingBlessings
                .map((b) => {
                  const rarity = b.rarity ?? 'core';
                  const tagBg =
                    rarity === 'prismatic'
                      ? 'bg-[#f3e8ff] text-[#6b21a8]'
                      : rarity === 'tactical'
                        ? 'bg-[#e0f2fe] text-[#0369a1]'
                        : 'bg-[#fcecc8] text-[#92400e]';
                  const owned = ownedStacks[b.id] ?? 0;
                  const nextCount = owned + 1;
                  const willMax = b.maxStacks !== undefined && nextCount >= b.maxStacks;
                  const ownedBadgeHtml =
                    owned === 0
                      ? `<span class="mam-tower-pill bg-[#dcfce7] text-[#15803d]" data-blessing-owned-badge="${b.id}">NEW!${b.maxStacks ? ` • 0/${b.maxStacks}` : ''}</span>`
                      : willMax
                        ? `<span class="mam-tower-pill bg-[#fde047] text-[#854d0e]" data-blessing-owned-badge="${b.id}">Owned ×${owned} → ×${nextCount} MAX</span>`
                        : `<span class="mam-tower-pill bg-[#fff8e7] text-[#14111d]" data-blessing-owned-badge="${b.id}">Owned ×${owned} → ×${nextCount}${b.maxStacks ? `/${b.maxStacks}` : ''}</span>`;
                  const previewLabel = formatBlessingPickPreview(b, owned);
                  return `
                  <button class="mam-inspector-well mam-tower-blessing-card rounded-2xl p-4 pt-5 flex flex-col items-center text-center gap-2 cursor-pointer" data-tower-blessing="${b.id}">
                    <span class="absolute top-0 inset-x-0 h-2 border-b-[1.5px] border-[#14111d]" style="background:${b.color}"></span>
                    <div class="w-full flex items-center justify-between gap-1">
                      <span class="mam-tower-pill ${tagBg}">${b.tag ?? 'BUFF'}</span>
                      <span class="mam-tower-pill bg-white text-[#64748b] uppercase">${rarity}</span>
                    </div>
                    <div class="w-12 h-12 rounded-2xl border-2 border-[#14111d] flex items-center justify-center shrink-0" style="background:${b.color}2b">
                      ${towerBlessingIconHtml(b.id, 28)}
                    </div>
                    <div class="text-[16px] font-black text-[#14111d]">${b.name}</div>
                    ${ownedBadgeHtml}
                    <div class="text-[12px] font-bold text-[#475569]">${b.desc}</div>
                    <div class="w-full px-2.5 py-1 rounded-xl border-[1.5px] border-[#14111d]/25 bg-white text-[11px] font-black text-[#0369a1] tabular-nums" data-blessing-preview="${b.id}">${previewLabel}</div>
                    <span class="mt-auto px-3 py-1 rounded-xl bg-[#bae6fd] border-2 border-[#14111d] text-[11px] font-black text-[#14111d]">Enter Floor ${run.floor + 1}</span>
                  </button>
                `;
                })
                .join('')}
            </div>
            <div class="flex items-center justify-center gap-2.5 flex-wrap pt-0.5 relative z-[2]">
              <button
                class="px-4 py-1.5 rounded-xl border-2 border-[#14111d] text-[12px] font-black transition-transform ${
                  canReroll
                    ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95'
                    : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                }"
                data-action="tower-reroll-blessings"
                ${!canReroll ? 'disabled' : ''}
              >
                🎲 Reroll Blessings (${freeRerolls > 0 ? `FREE • ${freeRerolls}` : `${TOWER_BLESSING_REROLL_GEM_COST} Gems`})
              </button>
              <button
                class="px-4 py-1.5 rounded-xl border-2 border-[#14111d] bg-[#fecdd3] hover:bg-[#fda4af] text-[#881337] text-[12px] font-black cursor-pointer transition-transform hover:scale-[0.97] active:scale-95"
                data-action="tower-exit"
              >
                Exit Tower
              </button>
            </div>
          </div>
        </div>
      `
      : '';

    const waveBadge = run.isBossWave
      ? `<span class="mam-tower-status-pill bg-[#fde047] text-[#14111d]">★ BOSS WAVE</span>`
      : `<span class="mam-tower-status-pill bg-[#bae6fd] text-[#14111d]" data-tower-ores-badge="true">
          <span>${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ORES</span>
          <span class="inline-flex items-center gap-1" data-tower-ore-pips="true">${this.renderOrePipsHtml()}</span>
        </span>`;

    const invulLeft = run.isBossWave ? Math.max(0, run.bossInvulLeft ?? 0) : 0;
    const exposeLeft = run.isBossWave ? Math.max(0, run.bossExposeLeft ?? 0) : 0;
    const streakMult = getTowerStreakGemMult(run.floorsCleared);
    const streakLabel = `${streakMult.toFixed(2).replace(/\.00$/, '')}×`;
    const pity = Math.max(0, Math.min(TOWER_DICE_PITY_MAX - 1, this.state.towerDicePity ?? 0));
    const pityLabel = pity + 1 >= TOWER_DICE_PITY_MAX ? 'NEXT 100%!' : `${pity}/${TOWER_DICE_PITY_MAX}`;
    const hpPctLabel = Math.max(0, Math.min(100, Math.round(hpPct)));
    const hpLabel = `${fmtShort(Math.ceil(run.hp))} / ${fmtShort(run.maxHp)} HP (${hpPctLabel}%)`;
    const bossShieldBadge = run.isBossWave
      ? invulLeft > 0
        ? `<span class="mam-tower-status-pill bg-[#bae6fd] text-[#14111d] animate-pulse" data-tower-boss-shield="true" data-shield-mode="shield">${BATTLE_SHIELD_SVG}<span data-tower-shield-label="true">SHIELD ${invulLeft.toFixed(1)}s • TAP RING!</span></span>`
        : exposeLeft > 0
          ? `<span class="mam-tower-status-pill bg-[#fde047] text-[#14111d]" data-tower-boss-shield="true" data-shield-mode="exposed">${BATTLE_BOLT_SVG}<span data-tower-shield-label="true">EXPOSED +50% ${exposeLeft.toFixed(1)}s</span></span>`
          : `<span class="mam-tower-status-pill bg-[#fecdd3] text-[#881337]" data-tower-boss-shield="true" data-shield-mode="vuln">${BATTLE_BOLT_SVG}<span data-tower-shield-label="true">VULNERABLE</span></span>`
      : `<span class="mam-tower-status-pill bg-[#bae6fd] text-[#14111d]" data-tower-wave-rocks="true">${BATTLE_PICKAXE_SVG}<span data-tower-rocks-label="true">${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ROCKS LEFT</span></span>`;
    const bossDef = run.isBossWave && run.bossChibiId ? getChibiById(run.bossChibiId) : undefined;
    const emblemSvg = run.isBossWave
      ? bossDef
        ? `<span class="w-full h-full inline-flex items-center justify-center [&_.mam-chibi-portrait]:w-full [&_.mam-chibi-portrait]:h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain">${chibiPortraitHtml(bossDef, { draggable: false })}</span>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 17L6 7L12 11L18 7L20 17H4Z" fill="#fde047" stroke="#14111d" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.6" fill="#be123c"/></svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="#38bdf8" stroke="#14111d" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="#ffffff"/></svg>`;
    const stripeOverlay =
      'linear-gradient(-45deg,rgba(255,255,255,0.2) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.2) 50%,rgba(255,255,255,0.2) 75%,transparent 75%,transparent 100%)';
    const barFillBg = run.isBossWave
      ? invulLeft > 0
        ? `${stripeOverlay},linear-gradient(90deg,#0284c7,#22d3ee,#7dd3fc)`
        : `${stripeOverlay},linear-gradient(90deg,#be123c,#ef4444,#f59e0b)`
      : `${stripeOverlay},linear-gradient(90deg,#0284c7,#38bdf8,#8b5cf6)`;

    const hpCardStateCls = [
      run.isBossWave ? 'is-boss' : '',
      floorDef.isFinalBoss && run.isBossWave ? 'is-final-boss' : '',
      exposeLeft > 0 ? 'is-exposed' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <div class="absolute top-3 left-3 z-[45] pointer-events-auto">
        <button class="mam-battle-exit-btn" data-action="tower-exit">
          ${towerIconHtml(20)}
          <span>Exit Tower</span>
        </button>
      </div>

      ${currencyRailHtml}

      <div class="absolute top-3 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-500px))] @max-[1020px]:top-[64px] @max-[1020px]:w-[min(540px,calc(100%-300px))] @max-[660px]:top-[106px] @max-[660px]:w-[calc(100%-24px)] flex flex-col items-center gap-1.5 pointer-events-none z-20">
        <div class="mam-battle-hp-card ${hpCardStateCls} flex flex-col gap-2" data-tower-hp-card="true">
          <div class="w-full flex items-center justify-between gap-2 flex-wrap">
            <div class="inline-flex items-center gap-2 min-w-0">
              <span class="mam-battle-emblem">${emblemSvg}</span>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="mam-tower-pill bg-[#fff8e7] text-[#14111d]">
                    <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${floorDef.world.iconColor}"></span>
                    <span>W${floorDef.worldIndex + 1} ${floorDef.world.name.toUpperCase()}</span>
                  </span>
                  <span class="mam-tower-pill bg-[#bae6fd] text-[#14111d]" data-tower-floor-wave="true">
                    FL ${run.floor}/${TOWER_MAX_FLOOR} • W${run.wave}/${run.maxWaves}
                  </span>
                  <span class="mam-tower-pill bg-white text-[#7c3aed]">
                    ✦ ${floorDef.anomaly.name}
                  </span>
                </div>
                <div class="mt-1 flex items-center gap-1.5 min-w-0">
                  <span class="w-2 h-2 rounded-full shrink-0 ${
                    run.isBossWave
                      ? 'bg-[#e11d48] animate-ping'
                      : 'bg-[#0284c7] animate-pulse'
                  }"></span>
                  <span class="text-[13px] font-black uppercase tracking-wider truncate ${
                    run.isBossWave ? 'text-[#b45309]' : 'text-[#14111d]'
                  }" data-tower-wave-title="true">${
                    run.isBossWave
                      ? floorDef.isFinalBoss
                        ? `FINAL BOSS • ${(bossDef?.name ?? 'Twin Overlord').toUpperCase()}`
                        : `${(bossDef?.name ?? 'Twin Overlord').toUpperCase()} • TWIN BOSS`
                      : `WAVE ${run.wave}/9 • ${floorDef.world.name.toUpperCase()} ORES`
                  }</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              ${run.isBossWave ? bossShieldBadge : waveBadge}
              <span class="mam-tower-status-pill ${
                timerDanger
                  ? 'bg-[#fecdd3] text-[#881337] animate-pulse'
                  : 'bg-[#e0f2fe] text-[#14111d]'
              }" data-tower-timer="true">
                ${BATTLE_TIMER_SVG}<span data-tower-timer-label="true">${run.timeLeft.toFixed(1)}s</span>
              </span>
            </div>
          </div>

          <div class="mam-battle-hp-track">
            <div class="mam-battle-hp-fill" data-tower-hp-fill="true" style="width:${hpPct}%;background-image:${barFillBg}"></div>
            <div class="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-[1]"></div>
            <div class="mam-battle-hp-ticks" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="relative z-[2] text-[13.5px] font-black tabular-nums text-white mam-outline-sm" data-tower-hp-text="true">
              ${hpLabel}
            </div>
          </div>
        </div>
      </div>

      <div class="mam-battle-dock absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(820px,calc(100%-24px))] px-3 py-2 flex flex-col gap-1.5 pointer-events-auto z-20">
        ${blessingsPopoverHtml}
        <div class="w-full grid grid-cols-7 @max-[720px]:grid-cols-4 gap-1.5">
          <div class="mam-battle-stat-cell bg-[#fce7f3]">
            <span class="mam-battle-stat-label text-[#9d174d]">Run Gems</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-run-gems="true">+${fmtInt(run.gemsEarned)}</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#f3e8ff]">
            <span class="mam-battle-stat-label text-[#6b21a8]">Run Dice</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-run-dice="true">+${run.diceEarned} Dice</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#fef08a]">
            <span class="mam-battle-stat-label text-[#854d0e]">Run Coins</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-run-coins="true">+${fmtInt(run.coinsEarned)}</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#e0f2fe]">
            <span class="mam-battle-stat-label text-[#0369a1]">Team DPS</span>
            <span class="mam-battle-stat-val text-[#14111d]">${fmtShort(effDps)}/s</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#dcfce7]">
            <span class="mam-battle-stat-label text-[#15803d]">Tap DMG</span>
            <span class="mam-battle-stat-val text-[#14111d]">${fmtShort(effTap)}</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#ffedd5]">
            <span class="mam-battle-stat-label text-[#9a3412]">Streak</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-streak="true">🔥 ${streakLabel}</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#ede9fe]">
            <span class="mam-battle-stat-label text-[#5b21b6]">Dice Pity</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-pity="true">🎲 ${pityLabel}</span>
          </div>
        </div>
        <div class="w-full flex items-center gap-1.5 flex-nowrap pt-1.5 border-t border-[#14111d]/15 min-w-0" data-tower-blessing-bar="true">
          ${blessingsSummaryBarHtml}
        </div>
      </div>

      ${blessingOverlay}
      ${toastStackHtml}
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const run = this.state.towerRun;
    if (!run) return;
    const floorWaveEl = root.querySelector<HTMLElement>('[data-tower-floor-wave="true"]');
    if (floorWaveEl) {
      floorWaveEl.textContent = `FL ${run.floor}/${TOWER_MAX_FLOOR} • W${run.wave}/${run.maxWaves}`;
    }
    const waveTitleEl = root.querySelector<HTMLElement>('[data-tower-wave-title="true"]');
    if (waveTitleEl && !run.isBossWave) {
      const floorDef = getTowerFloorDef(run.floor);
      waveTitleEl.textContent = `WAVE ${run.wave}/9 • ${floorDef.world.name.toUpperCase()} ORES`;
    }
    const hpPct = run.maxHp > 0 ? Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100)) : 0;
    const aliveOres = run.waveOres.filter((o) => o.alive).length;
    const fill = root.querySelector<HTMLElement>('[data-tower-hp-fill="true"]');
    const invulLeft = run.isBossWave ? Math.max(0, run.bossInvulLeft ?? 0) : 0;
    if (fill) {
      fill.style.width = `${hpPct}%`;
      if (run.isBossWave) {
        const stripe =
          'repeating-linear-gradient(-45deg,rgba(255,255,255,0.2) 0px,rgba(255,255,255,0.2) 7px,transparent 7px,transparent 14px)';
        fill.style.backgroundImage =
          invulLeft > 0
            ? `${stripe},linear-gradient(90deg,#0284c7,#22d3ee,#7dd3fc)`
            : `${stripe},linear-gradient(90deg,#be123c,#ef4444,#f59e0b)`;
      }
    }
    const hpText = root.querySelector<HTMLElement>('[data-tower-hp-text="true"]');
    if (hpText) {
      const hpPctLabel = Math.max(0, Math.min(100, Math.round(hpPct)));
      hpText.textContent = `${fmtShort(Math.ceil(run.hp))} / ${fmtShort(run.maxHp)} HP (${hpPctLabel}%)`;
    }
    const waveRocksBadge = root.querySelector<HTMLElement>('[data-tower-wave-rocks="true"]');
    if (waveRocksBadge && !run.isBossWave) {
      const rocksLabel = waveRocksBadge.querySelector<HTMLElement>('[data-tower-rocks-label="true"]');
      const nextText = `${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ROCKS LEFT`;
      if (rocksLabel) {
        rocksLabel.textContent = nextText;
      } else {
        waveRocksBadge.innerHTML = `${BATTLE_PICKAXE_SVG}<span data-tower-rocks-label="true">${nextText}</span>`;
      }
    }
    const shieldBadge = root.querySelector<HTMLElement>('[data-tower-boss-shield="true"]');
    const exposeLeft = run.isBossWave ? Math.max(0, run.bossExposeLeft ?? 0) : 0;
    const hpCard = root.querySelector<HTMLElement>('[data-tower-hp-card="true"]');
    if (hpCard) {
      hpCard.classList.toggle('is-exposed', exposeLeft > 0);
    }
    if (shieldBadge && run.isBossWave) {
      const nextMode = invulLeft > 0 ? 'shield' : exposeLeft > 0 ? 'exposed' : 'vuln';
      if (invulLeft > 0) {
        shieldBadge.className = 'mam-tower-status-pill bg-[#bae6fd] text-[#14111d] animate-pulse';
        const txt = `SHIELD ${invulLeft.toFixed(1)}s • TAP RING!`;
        if (shieldBadge.dataset.shieldMode !== nextMode) {
          shieldBadge.dataset.shieldMode = nextMode;
          shieldBadge.innerHTML = `${BATTLE_SHIELD_SVG}<span data-tower-shield-label="true">${txt}</span>`;
        } else {
          const lbl = shieldBadge.querySelector<HTMLElement>('[data-tower-shield-label="true"]');
          if (lbl) lbl.textContent = txt;
        }
      } else if (exposeLeft > 0) {
        shieldBadge.className = 'mam-tower-status-pill bg-[#fde047] text-[#14111d]';
        const txt = `EXPOSED +50% ${exposeLeft.toFixed(1)}s`;
        if (shieldBadge.dataset.shieldMode !== nextMode) {
          shieldBadge.dataset.shieldMode = nextMode;
          shieldBadge.innerHTML = `${BATTLE_BOLT_SVG}<span data-tower-shield-label="true">${txt}</span>`;
        } else {
          const lbl = shieldBadge.querySelector<HTMLElement>('[data-tower-shield-label="true"]');
          if (lbl) lbl.textContent = txt;
        }
      } else {
        shieldBadge.className = 'mam-tower-status-pill bg-[#fecdd3] text-[#881337]';
        if (shieldBadge.dataset.shieldMode !== nextMode) {
          shieldBadge.dataset.shieldMode = nextMode;
          shieldBadge.innerHTML = `${BATTLE_BOLT_SVG}<span data-tower-shield-label="true">VULNERABLE</span>`;
        }
      }
    }
    const oresBadge = root.querySelector<HTMLElement>('[data-tower-ores-badge="true"]');
    if (oresBadge && !run.isBossWave) {
      const countSpan = oresBadge.firstElementChild;
      if (countSpan) countSpan.textContent = `${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ORES`;
      const pips = oresBadge.querySelector<HTMLElement>('[data-tower-ore-pips="true"]');
      if (pips) pips.innerHTML = this.renderOrePipsHtml();
    }
    const timer = root.querySelector<HTMLElement>('[data-tower-timer="true"]');
    if (timer) {
      const danger = run.timeLeft <= 5;
      const timerLabel = timer.querySelector<HTMLElement>('[data-tower-timer-label="true"]');
      if (timerLabel) {
        timerLabel.textContent = `${run.timeLeft.toFixed(1)}s`;
      } else {
        timer.innerHTML = `${BATTLE_TIMER_SVG}<span data-tower-timer-label="true">${run.timeLeft.toFixed(1)}s</span>`;
      }
      timer.classList.toggle('bg-[#fecdd3]', danger);
      timer.classList.toggle('text-[#881337]', danger);
      timer.classList.toggle('animate-pulse', danger);
      timer.classList.toggle('bg-[#e0f2fe]', !danger);
      timer.classList.toggle('text-[#14111d]', !danger);
    }
    const gemsEl = root.querySelector<HTMLElement>('[data-tower-run-gems="true"]');
    if (gemsEl) gemsEl.textContent = `+${fmtInt(run.gemsEarned)}`;
    const diceEl = root.querySelector<HTMLElement>('[data-tower-run-dice="true"]');
    if (diceEl) diceEl.textContent = `+${run.diceEarned} Dice`;
    const coinsEl = root.querySelector<HTMLElement>('[data-tower-run-coins="true"]');
    if (coinsEl) coinsEl.textContent = `+${fmtInt(run.coinsEarned)}`;
    const streakEl = root.querySelector<HTMLElement>('[data-tower-streak="true"]');
    if (streakEl) {
      const sMult = getTowerStreakGemMult(run.floorsCleared);
      streakEl.textContent = `🔥 ${sMult.toFixed(2).replace(/\.00$/, '')}×`;
    }
    const pityEl = root.querySelector<HTMLElement>('[data-tower-pity="true"]');
    if (pityEl) {
      const pVal = Math.max(0, Math.min(TOWER_DICE_PITY_MAX - 1, this.state.towerDicePity ?? 0));
      pityEl.textContent = pVal + 1 >= TOWER_DICE_PITY_MAX ? '🎲 NEXT 100%!' : `🎲 ${pVal}/${TOWER_DICE_PITY_MAX}`;
    }
    const blessingTimerEl = root.querySelector<HTMLElement>('[data-tower-blessing-timer="true"]');
    if (blessingTimerEl && run.pendingBlessings) {
      blessingTimerEl.textContent = `Auto-pick random in ${Math.max(0, run.blessingTimerLeft ?? 5).toFixed(1)}s`;
    }
  }

  public bindArenaEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-action="tower-exit"]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.playSfx('ui-close');
        this.blessingsPopoverOpen = false;
        this.state.abandonTowerRun();
        this.onExitTowerArena();
        this.onOpenModal('tower');
      });
    });

    root.querySelectorAll('[data-action="tower-toggle-blessings"]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.playSfx('ui-click');
        this.blessingsPopoverOpen = !this.blessingsPopoverOpen;
        this.onRequestRender();
      });
    });

    root.querySelector('[data-action="tower-close-blessings"]')?.addEventListener('click', () => {
      audio.playSfx('ui-close');
      this.blessingsPopoverOpen = false;
      this.onRequestRender();
    });

    root.querySelectorAll('[data-tower-blessing]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.towerBlessing;
        if (!id) return;
        if (this.state.chooseTowerBlessing(id)) {
          this.blessingsPopoverOpen = false;
          audio.playSfx('rare-fanfare', { volume: 0.65 });
          this.pushToast('Spire Blessing activated!');
          this.onRequestRender();
        }
      });
    });

    root.querySelector('[data-action="tower-reroll-blessings"]')?.addEventListener('click', () => {
      const res = this.state.rerollTowerBlessings();
      if (!res.ok) {
        audio.playSfx('ui-error');
        this.pushToast(`Need ${TOWER_BLESSING_REROLL_GEM_COST} Gems to reroll!`);
        return;
      }
      audio.playSfx('magic-roll', { volume: 0.65 });
      this.pushToast(res.usedFree ? '🎲 Free Blessing Reroll!' : `🎲 Rerolled Blessings (-${res.costGems} Gems)!`);
      this.onRequestRender();
    });
  }
}
