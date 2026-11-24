import { assetUrl } from '../game/AssetUrl';
import { GameState } from '../game/GameState';
import { fmtInt, fmtPct, fmtShort } from '../game/NumberFormat';
import type { OmegaBattleSummary } from '../game/OmegaBossDomain';
import {
  getOmegaBossById,
  getOmegaTierDef,
  OMEGA_BREAK_DMG_MULT,
  OMEGA_MAX_KEYS,
  type OmegaBossId,
} from '../game/OmegaData';
import { getChibiById } from '../game3d/ChibiCatalog';
import { bossKeyIconHtml, enchantDiceIconHtml, hudIconHtml, omegaCrestIconHtml } from './HudIcons';
import { TW_CLOSE_BTN } from './HudShared';
import { omegaBattleIconHtml } from './OmegaBattleIcons';

export class OmegaArenaHudUi {
  private shieldTargets: Array<{ leftPct: number; topPct: number }> = [
    { leftPct: 24, topPct: 42 },
    { leftPct: 74, topPct: 40 },
    { leftPct: 48, topPct: 62 },
  ];

  constructor(
    private readonly state: GameState,
    private readonly onExitOmega: () => void,
    private readonly onTriggerParry: () => void,
    private readonly onVictoryToHub?: () => void,
    private readonly onVictoryRetry?: (bossId: OmegaBossId, tier: number) => void,
    private readonly onTapInvulShield?: (targetIdx: number) => void
  ) {}

  public resetShieldTargets(): void {
    for (let i = 0; i < this.shieldTargets.length; i++) {
      this.randomizeShieldTarget(i);
    }
  }

  public randomizeShieldTarget(targetIdx: number): void {
    const idx = Math.max(0, Math.min(this.shieldTargets.length - 1, targetIdx));
    let leftPct = 20 + Math.random() * 60;
    let topPct = 30 + Math.random() * 40;
    for (let tries = 0; tries < 6; tries++) {
      const candL = 16 + Math.random() * 68;
      const candT = 28 + Math.random() * 44;
      const tooClose = this.shieldTargets.some(
        (other, oi) => oi !== idx && Math.hypot(other.leftPct - candL, other.topPct - candT) < 18
      );
      if (!tooClose) {
        leftPct = candL;
        topPct = candT;
        break;
      }
    }
    this.shieldTargets[idx] = {
      leftPct: Math.round(leftPct * 10) / 10,
      topPct: Math.round(topPct * 10) / 10,
    };
  }

  public syncShieldTargetPos(root: HTMLElement, targetIdx: number): void {
    const pos = this.shieldTargets[targetIdx];
    const btn = root.querySelector<HTMLElement>(`[data-omega-shield-tap="${targetIdx}"]`);
    if (pos && btn) {
      btn.style.left = `${pos.leftPct}%`;
      btn.style.top = `${pos.topPct}%`;
    }
  }

  public renderOmegaArenaHud(): string {
    const battle = this.state.omegaBattle;
    if (!battle) {
      const summary = this.state.omegaLastSummary;
      if (!summary) return '';
      return summary.victory ? this.renderOmegaVictoryPopup(summary) : this.renderOmegaDefeatPopup(summary);
    }
    const boss = getOmegaBossById(battle.bossId);
    const chibi = boss ? getChibiById(boss.chibiId) : undefined;
    const hpPct = Math.max(0, Math.min(100, (battle.hp / Math.max(1, battle.maxHp)) * 100));
    const isEntrance = battle.phase === 'entrance';
    const isInvul = battle.phase === 'invul_shield';
    const isBreak = battle.phase === 'active' && battle.breakRemainingSec > 0;
    const hasArmor =
      (battle.bossId === 'obsidian-sovereign' || battle.bossId === 'abyssal-leviathan') &&
      battle.phase === 'active' &&
      !isBreak &&
      battle.targets.some((t) => t.kind === 'obsidian_pillar');
    const squadDps = this.state.getOmegaSquadEffectiveDps();
    const activeSecLeft = isInvul ? battle.invulRemainingSec : battle.timeRemainingSec;
    const timerDanger = !isEntrance && activeSecLeft <= 10;
    const shieldPct = Math.max(0, Math.min(100, (battle.invulTapsRemaining / Math.max(1, battle.invulMaxTaps)) * 100));
    const barFillBg = isInvul
      ? 'linear-gradient(90deg, #0284c7 0%, #38bdf8 52%, #7dd3fc 100%)'
      : isBreak
        ? 'linear-gradient(90deg, #f59e0b 0%, #fde047 50%, #fb923c 100%)'
        : battle.bossId === 'abyssal-leviathan'
          ? 'linear-gradient(90deg, #0891b2 0%, #06b6d4 52%, #67e8f9 100%)'
          : battle.bossId === 'obsidian-sovereign'
            ? 'linear-gradient(90deg, #9333ea 0%, #c084fc 52%, #e879f9 100%)'
            : 'linear-gradient(90deg, #dc2626 0%, #ef4444 52%, #fb7185 100%)';

    const emblemHtml = chibi
      ? `<img src="${assetUrl(chibi.poses.pose)}" alt="${boss?.name ?? 'Boss'}" class="w-full h-full object-contain" />`
      : omegaBattleIconHtml('parryClash', 24);

    const tacticalCallout = isEntrance
      ? {
          icon: omegaBattleIconHtml('skyDrop', 17),
          pillBg: 'bg-[#fde047]',
          text: `${boss?.name ?? 'OMEGA BOSS'} IS DESCENDING FROM THE SKY!`,
        }
      : isInvul
        ? {
            icon: omegaBattleIconHtml('crackShield', 17),
            pillBg: 'bg-[#bae6fd]',
            text: `TAP RANDOM TARGETS ON SCREEN TO SHATTER 30s INVUL SHIELD (${battle.invulTapsRemaining}/${battle.invulMaxTaps})!`,
          }
        : isBreak
          ? {
              icon: omegaBattleIconHtml('breakBolt', 17),
              pillBg: 'bg-[#fef08a]',
              text: `OMEGA BREAK ACTIVE — ALL ATTACKS DEAL ${OMEGA_BREAK_DMG_MULT}× DMG!`,
            }
          : battle.targets.length > 0
            ? {
                icon: omegaBattleIconHtml('crackShield', 17),
                pillBg: 'bg-[#ffe4e6]',
                text: `Click floating Targets (${battle.targets.length} active) to shatter & charge Stagger!`,
              }
            : battle.bossId === 'crimson-ronin'
              ? {
                  icon: omegaBattleIconHtml('clashBlades', 17),
                  pillBg: 'bg-[#e0f2fe]',
                  text: 'Watch for shrinking golden Parry Rings to counter-slash & build Stagger!',
                }
              : {
                  icon: omegaBattleIconHtml('armorShield', 17),
                  pillBg: 'bg-[#f3e8ff]',
                  text: 'Shatter Obsidian Pillars & Rune Seals to crack Boss Armor & fill Stagger!',
                };

    const randomShieldTargetsHtml = isInvul
      ? this.shieldTargets
          .map(
            (pos, idx) => `
              <button
                type="button"
                class="pointer-events-auto fixed -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-2xl border-[3px] border-[#14111d] bg-[linear-gradient(135deg,#fde047_0%,#38bdf8_100%)] hover:scale-105 active:scale-90 text-[#14111d] font-black cursor-pointer transition-transform animate-bounce"
                style="left:${pos.leftPct}%;top:${pos.topPct}%"
                data-omega-shield-tap="${idx}"
              >
                <span class="inline-flex items-center gap-1.5 text-[13px] tracking-wide">
                  <span class="w-6 h-6 rounded-lg bg-white border-[1.5px] border-[#14111d] flex items-center justify-center shrink-0">${omegaBattleIconHtml('crackShield', 17)}</span>
                  <span>TAP!</span>
                </span>
                <span class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-white border border-[#14111d]">CRACK SHIELD</span>
              </button>
            `
          )
          .join('')
      : '';

    const phaseBannerHtml = isEntrance
      ? `
        <div class="mt-1.5 mx-auto px-4 py-1.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fde047] text-[#14111d] text-[12px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 w-full animate-pulse" data-omega-entrance-banner="true">
          ${omegaBattleIconHtml('skyDrop', 18)}
          <span>OMEGA BOSS INCOMING — STAND BY TO BREAK SHIELD!</span>
          ${omegaBattleIconHtml('skyDrop', 18)}
        </div>
      `
      : isInvul
        ? `
          <div class="mt-1.5 mx-auto px-4 py-1.5 rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(90deg,#bae6fd_0%,#fde047_50%,#fecdd3_100%)] text-[#14111d] text-[12px] font-black uppercase tracking-wide inline-flex items-center justify-center gap-2 w-full" data-omega-invul-banner="true">
            ${omegaBattleIconHtml('invulAegis', 18)}
            <span>INVULNERABLE SHIELD! TAP TARGETS TO BREAK (<span data-omega-invul-count>${battle.invulTapsRemaining}</span>/${battle.invulMaxTaps} LEFT)</span>
          </div>
        `
        : '';

    return `
      <div class="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3.5 @max-[720px]:p-2.5">
        <div class="flex items-start justify-between gap-3">
          <button
            class="pointer-events-auto mam-battle-exit-btn shrink-0"
            data-omega-exit="true"
            title="Retreat without losing a Boss Key"
          >
            ${omegaBattleIconHtml('retreat', 18)}
            <span>Retreat (0 Key Lost)</span>
          </button>

          <div class="flex-1 max-w-[560px] mx-auto pointer-events-none @max-[920px]:max-w-[440px]">
            <div class="mam-battle-hp-card ${isBreak ? 'is-exposed' : 'is-boss'} flex flex-col gap-2" data-omega-hp-card="true">
              <div class="w-full flex items-center justify-between gap-2 flex-wrap">
                <div class="inline-flex items-center gap-2.5 min-w-0">
                  <span class="mam-battle-emblem shrink-0 overflow-hidden p-0.5">${emblemHtml}</span>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="mam-pill-xs bg-[#14111d] text-[#fde047]">TIER ${battle.tier}</span>
                      <span class="mam-pill-xs bg-white text-[#b91c1c] border-[1.5px] border-[#14111d] inline-flex items-center gap-1">${omegaBattleIconHtml('bossCrown', 12)}<span>OMEGA RAID</span></span>
                      ${isInvul ? `<span class="mam-pill-xs bg-[#38bdf8] text-[#14111d] inline-flex items-center gap-1" data-omega-invul-pill>${omegaBattleIconHtml('invulAegis', 13)}<span>INVULNERABLE</span></span>` : ''}
                      ${hasArmor ? `<span class="mam-pill-xs bg-[#f5d0fe] text-[#701a75] inline-flex items-center gap-1" data-omega-armor-pill>${omegaBattleIconHtml('armorShield', 13)}<span>-60% Armor</span></span>` : ''}
                      ${battle.barrierHp > 0 ? `<span class="mam-pill-xs bg-[#bae6fd] text-[#0369a1] inline-flex items-center gap-1" data-omega-barrier-pill>${omegaBattleIconHtml('invulAegis', 13)}<span>Shield ${fmtShort(battle.barrierHp)}</span></span>` : ''}
                    </div>
                    <div class="mt-0.5 flex items-center gap-1.5 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0 ${isInvul ? 'bg-[#38bdf8] animate-ping' : isBreak ? 'bg-[#f59e0b] animate-ping' : 'bg-[#dc2626] animate-pulse'}"></span>
                      <span class="text-[14px] font-black uppercase tracking-wide truncate text-[#14111d]">${boss?.name ?? battle.bossId}</span>
                    </div>
                  </div>
                </div>

                <span
                  class="mam-tower-status-pill shrink-0 tabular-nums ${
                    isInvul
                      ? 'bg-[#bae6fd] text-[#0c4a6e]'
                      : timerDanger
                        ? 'bg-[#fecdd3] text-[#881337] animate-pulse'
                        : 'bg-[#fff8e7] text-[#14111d]'
                  }"
                  data-omega-timer
                >${omegaBattleIconHtml('timer', 15)}<span data-omega-timer-val>${isEntrance ? 'DROP' : isInvul ? `SHIELD ${Math.ceil(battle.invulRemainingSec)}s` : `${Math.ceil(battle.timeRemainingSec)}s`}</span></span>
              </div>

              <div class="mam-battle-hp-track">
                <div class="mam-battle-hp-fill" data-omega-hp-bar style="width:${(isInvul ? shieldPct : hpPct).toFixed(2)}%;background-image:${barFillBg}"></div>
                <div class="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-[1]"></div>
                <div class="mam-battle-hp-ticks" aria-hidden="true">
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div class="relative z-[2] text-[13px] font-black tabular-nums text-white mam-outline-sm" data-omega-hp-text>
                  ${
                    isInvul
                      ? `INVUL SHIELD: ${battle.invulTapsRemaining} / ${battle.invulMaxTaps} TAPS LEFT`
                      : `${fmtShort(battle.hp)} / ${fmtShort(battle.maxHp)} (${fmtPct(hpPct)})`
                  }
                </div>
              </div>

              <div class="w-full h-4 rounded-lg border-2 border-[#14111d] bg-[#1e1b2e] overflow-hidden relative flex items-center justify-center">
                <div
                  class="absolute left-0 top-0 bottom-0 transition-[width] duration-75 ${isBreak ? 'bg-[linear-gradient(90deg,#fde047,#f59e0b)]' : 'bg-[linear-gradient(90deg,#0284c7,#38bdf8)]'}"
                  data-omega-stagger-bar
                  style="width:${isBreak ? 100 : Math.min(100, battle.staggerPct)}%"
                ></div>
                <div class="relative z-[2] inline-flex items-center gap-1 text-[10px] font-black tracking-wide text-white mam-outline-sm tabular-nums">
                  <span data-omega-break-icon class="${isBreak ? 'inline-flex items-center' : 'hidden'}">${omegaBattleIconHtml('breakBolt', 13)}</span>
                  <span data-omega-stagger-text>${isBreak ? `OMEGA BREAK! ${OMEGA_BREAK_DMG_MULT}× DMG (${battle.breakRemainingSec.toFixed(1)}s)` : `STAGGER ${Math.round(battle.staggerPct)}%`}</span>
                </div>
              </div>
            </div>
            ${phaseBannerHtml}
          </div>

          <div class="flex flex-col gap-1.5 shrink-0 @max-[720px]:hidden">
            <div class="bg-[#fff8e7] border-[2.5px] border-[#14111d] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg border-[1.5px] border-[#14111d] bg-[#e0f2fe] flex items-center justify-center shrink-0">${omegaBattleIconHtml('squadPower', 15)}</span>
              <div class="flex flex-col items-end">
                <span class="text-[9.5px] font-black uppercase tracking-wider text-[#0369a1]">Squad DPS</span>
                <span class="text-[13.5px] font-black tabular-nums text-[#14111d]">${fmtShort(squadDps)}/s</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <div class="bg-[#fef08a] border-2 border-[#14111d] rounded-xl px-2 py-1 flex flex-col items-center gap-0.5">
                <span class="inline-flex items-center gap-1 text-[8.5px] font-black uppercase text-[#854d0e]">${omegaBattleIconHtml('clashBlades', 11)}<span>Parries</span></span>
                <span class="text-[12px] font-black tabular-nums text-[#14111d]" data-omega-parries-count>${fmtInt(battle.parriesLanded)}</span>
              </div>
              <div class="bg-[#e0f2fe] border-2 border-[#14111d] rounded-xl px-2 py-1 flex flex-col items-center gap-0.5">
                <span class="inline-flex items-center gap-1 text-[8.5px] font-black uppercase text-[#0369a1]">${omegaBattleIconHtml('shatterPrism', 11)}<span>Shatter</span></span>
                <span class="text-[12px] font-black tabular-nums text-[#14111d]" data-omega-shatter-count>${fmtInt(battle.targetsShattered)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-2 mb-1">
          ${
            battle.phase === 'active' && battle.parryWindow.active && !battle.parryWindow.consumed
              ? `<button class="pointer-events-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border-[3px] border-[#14111d] bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] text-[15px] font-black cursor-pointer animate-bounce" data-omega-parry-btn="true">${omegaBattleIconHtml('parryClash', 21)}<span>PARRY NOW! (+8% HP &amp; +25% Stagger)</span></button>`
              : ''
          }
          <div class="inline-flex items-center gap-2 bg-[#fff8e7] border-[2.5px] border-[#14111d] rounded-2xl px-3.5 py-1.5 text-[11.5px] font-black text-[#14111d] shadow-none" data-omega-tactical-bar>
            <span class="w-6 h-6 rounded-lg border-2 border-[#14111d] ${tacticalCallout.pillBg} flex items-center justify-center shrink-0">${tacticalCallout.icon}</span>
            <span>${tacticalCallout.text}</span>
          </div>
        </div>
        ${randomShieldTargetsHtml}
      </div>
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const battle = this.state.omegaBattle;
    if (!battle) return;
    const isEntrance = battle.phase === 'entrance';
    const isInvul = battle.phase === 'invul_shield';
    const hpPct = Math.max(0, Math.min(100, (battle.hp / Math.max(1, battle.maxHp)) * 100));
    const shieldPct = Math.max(0, Math.min(100, (battle.invulTapsRemaining / Math.max(1, battle.invulMaxTaps)) * 100));
    const isBreak = battle.phase === 'active' && battle.breakRemainingSec > 0;

    const timerVal = root.querySelector<HTMLElement>('[data-omega-timer-val]');
    if (timerVal) {
      timerVal.textContent = isEntrance
        ? 'DROP'
        : isInvul
          ? `SHIELD ${Math.ceil(battle.invulRemainingSec)}s`
          : `${Math.ceil(battle.timeRemainingSec)}s`;
    }

    const hpBar = root.querySelector<HTMLElement>('[data-omega-hp-bar]');
    if (hpBar) hpBar.style.width = `${(isInvul ? shieldPct : hpPct).toFixed(2)}%`;

    const hpText = root.querySelector<HTMLElement>('[data-omega-hp-text]');
    if (hpText) {
      hpText.textContent = isInvul
        ? `INVUL SHIELD: ${battle.invulTapsRemaining} / ${battle.invulMaxTaps} TAPS LEFT`
        : `${fmtShort(battle.hp)} / ${fmtShort(battle.maxHp)} (${fmtPct(hpPct)})`;
    }

    const invulCount = root.querySelector<HTMLElement>('[data-omega-invul-count]');
    if (invulCount) invulCount.textContent = String(battle.invulTapsRemaining);

    const stagBar = root.querySelector<HTMLElement>('[data-omega-stagger-bar]');
    if (stagBar) {
      stagBar.style.width = `${isBreak ? 100 : Math.min(100, battle.staggerPct)}%`;
    }

    const stagIcon = root.querySelector<HTMLElement>('[data-omega-break-icon]');
    if (stagIcon) {
      stagIcon.classList.toggle('hidden', !isBreak);
      stagIcon.classList.toggle('inline-flex', isBreak);
    }
    const stagText = root.querySelector<HTMLElement>('[data-omega-stagger-text]');
    if (stagText) {
      stagText.textContent = isBreak
        ? `OMEGA BREAK! ${OMEGA_BREAK_DMG_MULT}× DMG (${battle.breakRemainingSec.toFixed(1)}s)`
        : `STAGGER ${Math.round(battle.staggerPct)}%`;
    }

    const parriesEl = root.querySelector<HTMLElement>('[data-omega-parries-count]');
    if (parriesEl) parriesEl.textContent = fmtInt(battle.parriesLanded);

    const shatterEl = root.querySelector<HTMLElement>('[data-omega-shatter-count]');
    if (shatterEl) shatterEl.textContent = fmtInt(battle.targetsShattered);
  }

  public bindArenaEvents(root: HTMLElement): void {
    root.querySelector<HTMLElement>('[data-omega-exit]')?.addEventListener('click', () => {
      this.onExitOmega();
    });
    root.querySelector<HTMLElement>('[data-omega-parry-btn]')?.addEventListener('click', () => {
      this.onTriggerParry();
    });
    root.querySelectorAll<HTMLElement>('[data-omega-shield-tap]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.omegaShieldTap ?? 0);
        this.onTapInvulShield?.(idx);
      });
    });
    root.querySelectorAll<HTMLElement>('[data-omega-victory-hub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onVictoryToHub?.();
      });
    });
    root.querySelector<HTMLElement>('[data-omega-victory-retry]')?.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      const bossId = el.dataset.omegaVictoryBoss as OmegaBossId | undefined;
      const tier = Number(el.dataset.omegaVictoryRetry || 1);
      if (bossId && this.state.omegaKeys > 0) {
        this.onVictoryRetry?.(bossId, tier);
      }
    });
  }

  private renderOmegaVictoryPopup(summary: OmegaBattleSummary): string {
    const boss = getOmegaBossById(summary.bossId);
    const tierDef = getOmegaTierDef(summary.bossId, summary.tier);
    const chibi = boss ? getChibiById(boss.chibiId) : undefined;
    const dropped = summary.coresAwarded > 0;
    const coreName = boss?.coreName ?? 'Omega Core';
    const coresOwned = this.state.omegaCores[summary.bossId] || 0;
    const unlockCost = boss?.unlockCoreCost ?? 5;
    const dropPct = Math.round(tierDef.coreDropChance * 100);
    const hasKeys = this.state.omegaKeys > 0;

    const portraitHtml = chibi
      ? `<img src="${assetUrl(chibi.poses.pose)}" alt="${boss?.name ?? 'Boss'}" class="w-full h-full object-contain" />`
      : omegaCrestIconHtml(34);

    const dropSectionHtml = dropped
      ? `
        <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-[linear-gradient(135deg,#dcfce7_0%,#fef08a_100%)] p-3 flex items-center gap-3" data-omega-drop-status="dropped">
          <div class="w-14 h-14 rounded-2xl border-[2.5px] border-[#14111d] bg-white flex items-center justify-center shrink-0">
            ${omegaCrestIconHtml(36)}
          </div>
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded-full bg-[#16a34a] text-white border border-[#14111d] text-[10px] font-black uppercase tracking-wider">ITEM DROPPED!</span>
              <span class="text-[10.5px] font-black text-[#15803d] tabular-nums">${dropPct}% Drop Rate</span>
            </div>
            <div class="text-[17px] font-black text-[#14111d] leading-tight truncate">+${fmtInt(summary.coresAwarded)} ${coreName}</div>
            <div class="text-[11px] font-extrabold text-[#334155] tabular-nums">
              Owned: ${fmtInt(coresOwned)} / ${unlockCost} ${coresOwned >= unlockCost ? '• Ready to Forge!' : 'for Unlock'}
            </div>
          </div>
        </div>
      `
      : `
        <div class="rounded-2xl border-[2.5px] border-[#14111d] bg-[#f1f5f9] p-3 flex items-center gap-3" data-omega-drop-status="none">
          <div class="w-14 h-14 rounded-2xl border-[2.5px] border-[#94a3b8] bg-white/80 flex items-center justify-center shrink-0 opacity-60 grayscale">
            ${omegaCrestIconHtml(36)}
          </div>
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded-full bg-[#e2e8f0] text-[#475569] border border-[#14111d] text-[10px] font-black uppercase tracking-wider">NO ITEM DROP</span>
              <span class="text-[10.5px] font-black text-[#64748b] tabular-nums">${dropPct}% Chance (Tier ${summary.tier})</span>
            </div>
            <div class="text-[15px] font-black text-[#334155] leading-tight truncate">0 ${coreName} Dropped</div>
            <div class="text-[11px] font-bold text-[#64748b] tabular-nums">
              Owned: ${fmtInt(coresOwned)} / ${unlockCost} • Fight higher tiers for better drop odds!
            </div>
          </div>
        </div>
      `;

    return `
      <div class="pointer-events-auto fixed inset-0 z-40 bg-[rgba(12,10,18,0.68)] flex items-center justify-center p-3 mam-backdrop-enter" data-omega-victory-popup="true">
        <div class="mam-modal mam-modal-enter w-[min(460px,calc(100%-12px))] max-h-[calc(100%-12px)] overflow-y-auto p-4 flex flex-col gap-3" data-modal-theme="omega-boss">
          <div class="rounded-2xl border-[2.5px] border-[#14111d] px-3.5 py-2.5 flex items-center justify-between gap-2.5" style="background:linear-gradient(135deg,#fde047 0%,#fef08a 45%,#bbf7d0 100%)">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-13 h-13 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                ${portraitHtml}
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="mam-pill-xs bg-[#16a34a] text-white inline-flex items-center gap-1">${omegaBattleIconHtml('trophyStar', 12)}<span>VICTORY!</span></span>
                  <span class="mam-pill-xs bg-[#14111d] text-[#fde047]">TIER ${summary.tier}</span>
                  ${summary.firstClear ? `<span class="mam-pill-xs bg-[#fb923c] text-[#14111d]">1ST CLEAR!</span>` : ''}
                </div>
                <div class="text-[17px] font-black uppercase leading-tight text-[#14111d] truncate">${boss?.name ?? summary.bossId} Defeated!</div>
                <div class="text-[11px] font-extrabold text-[#334155] tabular-nums">
                  Cleared in ${summary.timeUsedSec}s • ${fmtShort(summary.damageDealt)} Total DMG
                </div>
              </div>
            </div>
            <button class="${TW_CLOSE_BTN}" data-omega-victory-hub="true" aria-label="Return to Sanctum">✕</button>
          </div>

          ${dropSectionHtml}

          <div class="grid ${summary.diceAwarded > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2">
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-2.5 py-2 flex items-center gap-2">
              <span class="shrink-0">${hudIconHtml('gem', 24, 'Gems')}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Gems</span>
                <span class="text-[14px] font-black text-[#14111d] tabular-nums">+${fmtInt(summary.gemsAwarded)}</span>
              </div>
            </div>
            ${
              summary.diceAwarded > 0
                ? `<div class="rounded-xl border-2 border-[#14111d] bg-white px-2.5 py-2 flex items-center gap-2">
                    <span class="shrink-0">${enchantDiceIconHtml(24)}</span>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[9.5px] font-black uppercase text-[#64748b]">1st Clear Dice</span>
                      <span class="text-[14px] font-black text-[#0369a1] tabular-nums">+${fmtInt(summary.diceAwarded)}</span>
                    </div>
                  </div>`
                : ''
            }
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-2.5 py-2 flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg border-[1.5px] border-[#14111d] bg-[#fef08a] flex items-center justify-center shrink-0">${omegaBattleIconHtml('clashBlades', 17)}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Raid Style</span>
                <span class="text-[12px] font-black text-[#14111d] tabular-nums">${summary.parriesLanded} Parry • ${summary.targetsShattered} Hit</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-0.5">
            <button
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] bg-[#2ee59d] hover:brightness-105 active:scale-95 text-[#14111d] text-[14px] font-black cursor-pointer transition-transform"
              data-omega-victory-hub="true"
            >Back to Sanctum</button>
            <button
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] inline-flex items-center justify-center gap-1.5 text-[13.5px] font-black transition-transform ${
                hasKeys
                  ? 'bg-[#fde047] hover:bg-[#fef08a] active:scale-95 text-[#14111d] cursor-pointer'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              }"
              data-omega-victory-retry="${summary.tier}"
              data-omega-victory-boss="${summary.bossId}"
              ${hasKeys ? '' : 'disabled'}
            >
              ${bossKeyIconHtml(16)}
              <span>${hasKeys ? `Fight Again (${this.state.omegaKeys}/${OMEGA_MAX_KEYS})` : `No Keys (0/${OMEGA_MAX_KEYS})`}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderOmegaDefeatPopup(summary: OmegaBattleSummary): string {
    const boss = getOmegaBossById(summary.bossId);
    const chibi = boss ? getChibiById(boss.chibiId) : undefined;
    const hasKeys = this.state.omegaKeys > 0;
    const remHpPct = summary.remainingHpPct ?? 100;
    const portraitHtml = chibi
      ? `<img src="${assetUrl(chibi.poses.pose)}" alt="${boss?.name ?? 'Boss'}" class="w-full h-full object-contain" />`
      : omegaCrestIconHtml(34);

    return `
      <div class="pointer-events-auto fixed inset-0 z-40 bg-[rgba(12,10,18,0.68)] flex items-center justify-center p-3 mam-backdrop-enter" data-omega-defeat-popup="true">
        <div class="mam-modal mam-modal-enter w-[min(450px,calc(100%-12px))] max-h-[calc(100%-12px)] overflow-y-auto p-4 flex flex-col gap-3" data-modal-theme="omega-boss">
          <div class="rounded-2xl border-[2.5px] border-[#14111d] px-3.5 py-2.5 flex items-center justify-between gap-2.5" style="background:linear-gradient(135deg,#fecdd3 0%,#fda4af 50%,#e2e8f0 100%)">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-13 h-13 rounded-2xl border-[2.5px] border-[#14111d] bg-[#fff8e7] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                ${portraitHtml}
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="mam-pill-xs bg-[#dc2626] text-white inline-flex items-center gap-1">${omegaBattleIconHtml('bossCrown', 12)}<span>DEFEAT</span></span>
                  <span class="mam-pill-xs bg-[#14111d] text-[#fde047]">TIER ${summary.tier}</span>
                  <span class="mam-pill-xs bg-white text-[#15803d] border border-[#14111d]">0 KEY LOST</span>
                </div>
                <div class="text-[17px] font-black uppercase leading-tight text-[#14111d] truncate">${summary.shieldFailed ? 'Shield Held!' : `${boss?.name ?? summary.bossId} Survived!`}</div>
                <div class="text-[11px] font-extrabold text-[#334155] tabular-nums">
                  ${summary.shieldFailed ? 'Failed to shatter the 30s Invul Shield in time.' : `Time up • ${remHpPct}% Boss HP Remaining`}
                </div>
              </div>
            </div>
            <button class="${TW_CLOSE_BTN}" data-omega-victory-hub="true" aria-label="Return to Sanctum">✕</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-3 py-2 flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl border-[1.5px] border-[#14111d] bg-[#e0f2fe] flex items-center justify-center shrink-0">${omegaBattleIconHtml('squadPower', 18)}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Damage Dealt</span>
                <span class="text-[15px] font-black text-[#14111d] tabular-nums">${fmtShort(summary.damageDealt)}</span>
              </div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-white px-3 py-2 flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl border-[1.5px] border-[#14111d] bg-[#ffe4e6] flex items-center justify-center shrink-0">${omegaBattleIconHtml(summary.shieldFailed ? 'invulAegis' : 'bossCrown', 18)}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[9.5px] font-black uppercase text-[#64748b]">Boss HP Left</span>
                <span class="text-[15px] font-black text-[#dc2626] tabular-nums">${remHpPct}%</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-0.5">
            <button
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] bg-[#e2e8f0] hover:bg-white active:scale-95 text-[#14111d] text-[14px] font-black cursor-pointer transition-transform"
              data-omega-victory-hub="true"
            >Back to Sanctum</button>
            <button
              class="flex-1 h-11 rounded-2xl border-[2.5px] border-[#14111d] inline-flex items-center justify-center gap-1.5 text-[13.5px] font-black transition-transform ${
                hasKeys
                  ? 'bg-[#fde047] hover:bg-[#fef08a] active:scale-95 text-[#14111d] cursor-pointer'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              }"
              data-omega-victory-retry="${summary.tier}"
              data-omega-victory-boss="${summary.bossId}"
              ${hasKeys ? '' : 'disabled'}
            >
              ${bossKeyIconHtml(16)}
              <span>${hasKeys ? `Try Again (${this.state.omegaKeys}/${OMEGA_MAX_KEYS})` : `No Keys (0/${OMEGA_MAX_KEYS})`}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
