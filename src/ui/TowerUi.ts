import { audio } from '../audio/AudioManager';
import { WORLDS } from '../game/GameData';
import { GameState } from '../game/GameState';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerStreakGemMult,
  getTowerSweepGemReward,
  getTowerWaveDef,
  getTowerWorldTier,
  TOWER_BLESSING_REROLL_GEM_COST,
  TOWER_DICE_PITY_MAX,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../game/TowerData';
import { hudIconHtml, towerIconHtml } from './HudIcons';
import { ModalKind, renderModalShell } from './HudShared';

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

export class TowerUi {
  private selectedCheckpoint = 1;

  constructor(
    private readonly state: GameState,
    private readonly pushToast: (text: string) => void,
    private readonly onOpenModal: (kind: ModalKind) => void,
    private readonly onEnterTowerArena: () => void,
    private readonly onExitTowerArena: () => void,
    private readonly onRequestRender: () => void
  ) {}

  private ensureValidCheckpoint(): number {
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
    if (!cps.includes(this.selectedCheckpoint)) {
      this.selectedCheckpoint = cps[cps.length - 1] ?? 1;
    }
    return this.selectedCheckpoint;
  }

  public syncDefaultCheckpoint(): void {
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
    this.selectedCheckpoint = cps[cps.length - 1] ?? 1;
  }

  public renderTowerHubModal(): string {
    this.state.syncTowerKeys();
    const startFloor = this.ensureValidCheckpoint();
    const cps = getTowerCheckpoints(this.state.towerBestFloor);
    const previewDef = getTowerFloorDef(startFloor);
    const wave1Def = getTowerWaveDef(startFloor, 1);
    const regenSec = this.state.getTowerNextKeyRegenSec();
    const regenStr =
      regenSec > 0 ? `+1 in ${Math.floor(regenSec / 60)}:${String(regenSec % 60).padStart(2, '0')}` : 'Full';
    const sweepGems = getTowerSweepGemReward(this.state.towerBestFloor);
    const globalBonusPct = Math.round(getGlobalGemGainBonus(this.state.towerBestFloor) * 100);
    const globalMult = 1 + getGlobalGemGainBonus(this.state.towerBestFloor);
    const teamDps = this.state.getTotalPlotDps();
    const tapDmg = this.state.getTapDamage();
    const placedCount = this.state.plotMiners.filter(Boolean).length;
    const summary = this.state.towerLastSummary;
    const pity = Math.max(0, Math.min(TOWER_DICE_PITY_MAX - 1, this.state.towerDicePity ?? 0));
    const pityReady = pity + 1 >= TOWER_DICE_PITY_MAX;
    const spireConquered = this.state.towerBestFloor >= TOWER_MAX_FLOOR;
    const pityPipsHtml = Array.from({ length: TOWER_DICE_PITY_MAX }, (_, idx) => {
      const filled = idx < pity || (pityReady && idx === TOWER_DICE_PITY_MAX - 1);
      const cls = filled
        ? pityReady
          ? 'bg-[#a855f7]'
          : 'bg-[#c084fc]'
        : 'bg-[#e2e8f0]';
      return `<span class="w-4 h-2.5 rounded-sm border-[1.5px] border-[#14111d] ${cls}"></span>`;
    }).join('');

    const headerExtraHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <div class="mam-tower-hub-chip bg-[#e0f2fe] text-[#14111d]" data-tower-keys-pill="true">
          <span>🔑 ${this.state.towerKeys}/${TOWER_MAX_KEYS}</span>
          <span class="text-[11px] text-[#475569] font-bold" data-tower-regen="true">(${regenStr})</span>
        </div>
        ${
          this.state.towerKeys < TOWER_MAX_KEYS
            ? `<button class="mam-tower-hub-chip bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95 transition-transform" data-action="tower-buy-key"><span>+1 Key</span>${hudIconHtml('gem', 14, 'Gems')}<span>${fmtInt(TOWER_KEY_GEM_COST)}</span></button>${
                CG_ADS_ENABLED
                  ? `<button class="mam-tower-hub-chip bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95 transition-transform" data-action="tower-ad-key">🎬 +1 Key (Ad)</button>`
                  : ''
              }`
            : ''
        }
        <div class="mam-tower-hub-chip bg-[#fce7f3] text-[#14111d]" data-tower-gems-pill="true">
          ${hudIconHtml('gem', 15, 'Gems')}
          <span>${fmtInt(this.state.gems)}</span>
        </div>
      </div>
    `;

    const nearMissHtml =
      summary && summary.reason === 'timeout' && (summary.remainingHpPct ?? 0) > 0
        ? `<div class="mt-1.5 mam-tower-pill ${
            (summary.remainingHpPct ?? 100) <= 25
              ? 'bg-[#fecdd3] text-[#881337]'
              : 'bg-[#fef3c7] text-[#92400e]'
          } w-fit">
            <span>${(summary.remainingHpPct ?? 100) <= 25 ? '🔥 SO CLOSE!' : '⏱ TIME UP!'}</span>
            <span>${summary.wasBossWave ? 'Boss' : `Wave ${summary.highestWave}`} had ${summary.remainingHpPct}% HP left!</span>
          </div>`
        : '';

    const isVictory = summary?.reason === 'victory';
    const summaryBg = isVictory ? 'bg-[#fef3c7]' : 'bg-[#e0f2fe]';
    const summaryTitle = isVictory ? '🏆 SPIRE CONQUERED • FLOOR 80 TAMAT!' : 'Last Run Summary';
    const summaryTitleColor = isVictory ? 'text-[#b45309]' : 'text-[#0369a1]';

    const summaryBannerHtml = summary
      ? `
        <div class="rounded-xl border-[2.5px] border-[#14111d] ${summaryBg} px-3.5 py-2.5 flex items-center justify-between gap-2.5 flex-wrap">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[12px] font-black uppercase tracking-wider ${summaryTitleColor}">${summaryTitle}</span>
              ${summary.newRecord ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">NEW RECORD</span>' : ''}
              ${(summary.bestStreakMult ?? 1) > 1 ? `<span class="mam-tower-pill bg-[#ffedd5] text-[#9a3412]">🔥 ${(summary.bestStreakMult ?? 1).toFixed(2).replace(/\.00$/, '')}× STREAK</span>` : ''}
            </div>
            <div class="text-[13px] font-bold text-[#334155] mt-0.5">
              Cleared <span class="text-[#14111d] font-black">${summary.floorsCleared}</span> floor(s) (${summary.wavesCleared} waves) • Reached <span class="text-[#0369a1] font-black">Floor ${summary.highestReached}/${TOWER_MAX_FLOOR} • Wave ${summary.highestWave}/${TOWER_WAVES_PER_FLOOR}</span>
            </div>
            ${nearMissHtml}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap shrink-0">
            <span class="mam-tower-hub-chip bg-[#fce7f3] text-[#9d174d]">+${fmtInt(summary.gemsEarned)} Gems</span>
            ${summary.diceEarned > 0 ? `<span class="mam-tower-hub-chip bg-[#f3e8ff] text-[#6b21a8]">+${summary.diceEarned} Dice</span>` : ''}
            <button
              class="mam-tower-hub-chip ${
                this.state.towerKeys > 0
                  ? 'bg-[#fde047] hover:bg-[#fef08a] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95'
                  : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
              } transition-transform"
              data-action="tower-retry-run"
              data-retry-floor="${summary.startFloor}"
              ${this.state.towerKeys <= 0 ? 'disabled' : ''}
            >⚡ ${isVictory ? `Replay Fl ${summary.startFloor}` : `Retry Floor ${summary.startFloor}`}</button>
          </div>
        </div>
      `
      : '';

    const worldCampaignStripHtml = WORLDS.map((w, idx) => {
      const minFl = idx * 10 + 1;
      const maxFl = (idx + 1) * 10;
      const cleared = this.state.towerBestFloor >= maxFl;
      const activeTier = previewDef.worldIndex === idx;
      return `
        <div class="flex-1 min-w-[64px] h-[44px] rounded-xl border-2 border-[#14111d] px-1.5 flex flex-col items-center justify-center text-center transition-colors ${
          activeTier ? 'bg-[#e0f2fe] ring-2 ring-inset ring-[#0284c7]' : cleared ? 'bg-[#dcfce7]' : 'bg-[#fff8e7]'
        }">
          <div class="flex items-center justify-center gap-1 leading-none">
            <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${w.iconColor}"></span>
            <span class="text-[10.5px] font-black text-[#14111d]">W${idx + 1}${cleared ? ' ✓' : ''}</span>
          </div>
          <span class="text-[9.5px] font-bold text-[#475569] tabular-nums leading-tight mt-0.5">F${minFl}-${maxFl}</span>
        </div>
      `;
    }).join('');

    const checkpointChips = cps
      .map((cp) => {
        const active = cp === startFloor;
        const tier = getTowerWorldTier(cp);
        const cls = active
          ? 'bg-[#38bdf8] text-[#14111d]'
          : 'bg-[#fcecc8] text-[#14111d] hover:bg-[#fde047]';
        return `<button class="mam-tower-cp-btn ${cls}" data-tower-cp="${cp}"><span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${tier.world.iconColor}"></span><span>Fl ${cp}</span></button>`;
      })
      .join('');

    const milestonesHtml = TOWER_MILESTONES.map((m) => {
      const done = this.state.towerBestFloor >= m.floor;
      return `
        <div class="w-full rounded-xl border-2 border-[#14111d] px-3 py-2 flex items-center justify-between gap-2 ${
          done ? 'bg-[#dcfce7]' : 'bg-[#fcecc8]'
        }">
          <div class="flex flex-col text-left min-w-0">
            <div class="text-[12px] font-black truncate ${done ? 'text-[#14532d]' : 'text-[#14111d]'}">Floor ${m.floor} • ${m.title}</div>
            <div class="text-[10.5px] font-bold text-[#475569] truncate">+${fmtShort(m.gemBonus)} Gems • +${m.diceBonus} Dice • +${Math.round(m.globalGemPct * 100)}% Global</div>
          </div>
          <span class="mam-tower-pill min-w-[66px] ${
            done ? 'bg-[#4ade80] text-[#14111d]' : 'bg-white text-[#475569]'
          }">${done ? 'CLAIMED' : `${Math.min(this.state.towerBestFloor, m.floor)}/${m.floor}`}</span>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[860px]:flex-col overflow-x-hidden overflow-y-auto mam-no-scrollbar">
        <div class="flex-1 min-w-0 flex flex-col gap-3">
          ${summaryBannerHtml}

          <div class="mam-inspector-well rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-black uppercase tracking-wider text-[#0284c7]">Spire Campaign (W1–W8)</span>
                ${spireConquered ? '<span class="mam-tower-pill bg-[#fde047] text-[#14111d]">🏆 80/80 TAMAT!</span>' : ''}
              </div>
              <div class="text-[12px] font-bold text-[#475569]">Best Floor: <span class="text-[#14111d] font-black tabular-nums">${this.state.towerBestFloor}/${TOWER_MAX_FLOOR}</span></div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">${worldCampaignStripHtml}</div>
            <div class="text-[11px] font-bold text-[#64748b] pt-0.5">Select Checkpoint (every 5 floors unlocks a Checkpoint &amp; Spire Milestone):</div>
            <div class="flex items-center gap-1.5 flex-wrap">${checkpointChips}</div>
          </div>

          <div class="mam-inspector-well rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span class="mam-tower-pill bg-[#fff8e7] text-[#14111d]">
                    <span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${previewDef.world.iconColor}"></span>
                    <span>W${previewDef.worldIndex + 1} • ${previewDef.world.name.toUpperCase()}</span>
                  </span>
                  <span class="mam-tower-pill bg-[#fcecc8] text-[#475569]">Stage ${previewDef.floorInWorld}/10</span>
                </div>
                <div class="text-[18px] font-black text-[#14111d]">${previewDef.title} • 10 Waves</div>
                <div class="text-[12px] font-black text-[#7c3aed]">Anomaly: ${previewDef.anomaly.name} — ${previewDef.anomaly.desc}</div>
                <div class="text-[11px] font-bold text-[#475569] mt-0.5">Waves 1–9: Break ${TOWER_ORE_ROCKS_PER_WAVE} ${previewDef.world.name} Ores/Wave • Wave 10: ${previewDef.isFinalBoss ? 'FINAL SPIRE OVERLORD' : 'Floor Boss'}</div>
              </div>
              <span class="mam-tower-pill ${
                previewDef.isFinalBoss
                  ? 'bg-[#f43f5e] text-white'
                  : previewDef.isBoss
                    ? 'bg-[#fde047] text-[#14111d]'
                    : 'bg-[#bae6fd] text-[#14111d]'
              }">${previewDef.isFinalBoss ? 'FINAL BOSS 80' : previewDef.isBoss ? 'CHECKPOINT BOSS' : '9 WAVES + BOSS'}</span>
            </div>

            <div class="grid grid-cols-3 @max-[560px]:grid-cols-1 gap-2">
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Wave 1 Rock / W10 Boss</div>
                <div class="text-[14px] font-black text-[#14111d] tabular-nums">${fmtShort(wave1Def.rockBaseHp)} / ${fmtShort(previewDef.hp)} HP</div>
              </div>
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Timer (Ore / Boss)</div>
                <div class="text-[14px] font-black text-[#0369a1] tabular-nums">${wave1Def.durationSec}s / ${previewDef.durationSec}s</div>
              </div>
              <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-3 py-2">
                <div class="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Boss Clear Reward</div>
                <div class="text-[14px] font-black text-[#db2777] tabular-nums">+${fmtInt(Math.round(previewDef.gemReward * globalMult))} Gems${previewDef.diceDropChance >= 1 ? ' + 1 Dice' : previewDef.diceDropChance > 0 ? ' + Dice%' : ''}</div>
              </div>
            </div>

            <div class="rounded-xl border-2 border-[#14111d] ${pityReady ? 'bg-[#f3e8ff]' : 'bg-[#fff8e7]'} px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="text-[12px] font-black text-[#6b21a8]">🎲 Boss Dice Pity</span>
                <span class="text-[11px] font-bold text-[#475569]">${
                  pityReady
                    ? 'Next Boss defeat guarantees +1 Enchant Dice!'
                    : `Every Boss clear without Dice builds pity (${pity}/${TOWER_DICE_PITY_MAX})`
                }</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="inline-flex items-center gap-1">${pityPipsHtml}</div>
                <span class="text-[11px] font-black ${pityReady ? 'text-[#7c3aed]' : 'text-[#14111d]'} tabular-nums">${
                  pityReady ? 'GUARANTEED!' : `${pity}/${TOWER_DICE_PITY_MAX}`
                }</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                class="mam-sheen-hover relative overflow-hidden flex-1 min-w-[200px] h-11 px-5 rounded-xl border-[2.5px] border-[#14111d] ${
                  this.state.towerKeys > 0
                    ? 'bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#14111d] cursor-pointer hover:scale-[0.98] active:scale-[0.95]'
                    : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                } text-[15px] font-black transition-transform duration-150"
                data-action="tower-enter-run"
                ${this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                ${this.state.towerKeys > 0 ? `Enter Floor ${startFloor} (1 Key)` : 'Out of Tower Keys'}
              </button>

              <button
                class="h-11 px-4 rounded-xl border-[2.5px] border-[#14111d] ${
                  this.state.towerBestFloor >= 1 && this.state.towerKeys > 0
                    ? 'bg-[#4ade80] hover:bg-[#86efac] text-[#14111d] cursor-pointer hover:scale-[0.97] active:scale-95'
                    : 'bg-[#e2e8f0] text-[#64748b] cursor-not-allowed'
                } text-[13px] font-black transition-transform duration-150"
                data-action="tower-quick-sweep"
                ${this.state.towerBestFloor < 1 || this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                Quick Sweep (+${fmtInt(Math.round(sweepGems * globalMult))} Gems)
              </button>
            </div>
          </div>
        </div>

        <div class="mam-inspector-well w-[300px] @max-[860px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar">
          <div class="text-[12px] font-black uppercase tracking-wider text-[#7c3aed]">Combat Readiness</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">ACTIVE MINERS</div>
              <div class="text-[14px] font-black text-[#14111d]">${placedCount}/5</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">TEAM DPS</div>
              <div class="text-[14px] font-black text-[#0284c7]">${fmtShort(teamDps)}/s</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">TAP DAMAGE</div>
              <div class="text-[14px] font-black text-[#15803d]">${fmtShort(tapDmg)}</div>
            </div>
            <div class="rounded-xl border-2 border-[#14111d] bg-[#fcecc8] px-2.5 py-2">
              <div class="text-[10px] font-black text-[#64748b]">GLOBAL GEM BONUS</div>
              <div class="text-[14px] font-black text-[#db2777]">+${globalBonusPct}%</div>
            </div>
          </div>

          <div class="text-[12px] font-black uppercase tracking-wider text-[#7c3aed] pt-1">Milestones (Every 5 Floors)</div>
          <div class="flex flex-col gap-1.5">${milestonesHtml}</div>
        </div>
      </div>
    `;

    return renderModalShell({
      title: 'Gem Tower',
      theme: 'tower',
      iconHtml: towerIconHtml(22),
      boxClass: 'w-[960px] h-[min(640px,calc(100%-16px))] @max-[920px]:w-full @max-[920px]:h-full',
      headerExtraHtml,
      bodyHtml,
    });
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

    const blessingsStrip =
      run.blessings.length > 0
        ? run.blessings
            .map(
              (b) =>
                `<span class="mam-tower-pill bg-white text-[#14111d]"><span class="w-2 h-2 rounded-full border border-[#14111d] shrink-0" style="background:${b.color}"></span><span>${b.name}</span></span>`
            )
            .join('')
        : `<span class="mam-tower-pill bg-[#fcecc8] text-[#475569]">✦ Clear Wave 10 Boss for Blessings</span>`;

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
                  return `
                  <button class="mam-inspector-well mam-tower-blessing-card rounded-2xl p-4 pt-5 flex flex-col items-center text-center gap-2 cursor-pointer" data-tower-blessing="${b.id}">
                    <span class="absolute top-0 inset-x-0 h-2 border-b-[1.5px] border-[#14111d]" style="background:${b.color}"></span>
                    <div class="w-full flex items-center justify-between gap-1">
                      <span class="mam-tower-pill ${tagBg}">${b.tag ?? 'BUFF'}</span>
                      <span class="mam-tower-pill bg-white text-[#64748b] uppercase">${rarity}</span>
                    </div>
                    <div class="w-11 h-11 rounded-2xl border-2 border-[#14111d] bg-[#fcecc8] flex items-center justify-center text-[20px] font-black text-[#14111d]">✦</div>
                    <div class="text-[16px] font-black text-[#14111d]">${b.name}</div>
                    <div class="text-[12px] font-bold text-[#475569]">${b.desc}</div>
                    <span class="mt-1 px-3 py-1 rounded-xl bg-[#bae6fd] border-2 border-[#14111d] text-[11px] font-black text-[#14111d]">Enter Floor ${run.floor + 1}</span>
                  </button>
                `;
                })
                .join('')}
            </div>
            <div class="flex items-center justify-center pt-0.5 relative z-[2]">
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
    const emblemSvg = run.isBossWave
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 17L6 7L12 11L18 7L20 17H4Z" fill="#fde047" stroke="#14111d" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.6" fill="#be123c"/></svg>`
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
      <div class="absolute top-3 left-3 z-20 pointer-events-auto">
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
                  <span class="mam-tower-pill bg-[#bae6fd] text-[#14111d]">
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
                  }">${
                    run.isBossWave
                      ? floorDef.isFinalBoss
                        ? 'FINAL BOSS • CHRONO SERAPHIM OVERLORD'
                        : 'SERAPHIM AI OVERLORD'
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

      <div class="mam-battle-dock absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(740px,calc(100%-24px))] px-3 py-2 flex flex-col gap-1.5 pointer-events-auto z-20">
        <div class="w-full grid grid-cols-6 @max-[640px]:grid-cols-3 gap-1.5">
          <div class="mam-battle-stat-cell bg-[#fce7f3]">
            <span class="mam-battle-stat-label text-[#9d174d]">Run Gems</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-run-gems="true">+${fmtInt(run.gemsEarned)}</span>
          </div>
          <div class="mam-battle-stat-cell bg-[#f3e8ff]">
            <span class="mam-battle-stat-label text-[#6b21a8]">Run Dice</span>
            <span class="mam-battle-stat-val text-[#14111d]" data-tower-run-dice="true">+${run.diceEarned} Dice</span>
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
        <div class="w-full flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[#14111d]/15">
          ${blessingsStrip}
        </div>
      </div>

      ${blessingOverlay}
      ${toastStackHtml}
    `;
  }

  public updateLiveValues(root: HTMLElement): void {
    const run = this.state.towerRun;
    if (!run) return;
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

  public bindHubEvents(root: HTMLElement): void {
    root.querySelectorAll('[data-tower-cp]').forEach((el) => {
      el.addEventListener('click', () => {
        const cp = Number((el as HTMLElement).dataset.towerCp || 1);
        if (cp >= 1) {
          audio.playSfx('ui-tab');
          this.selectedCheckpoint = cp;
          this.onRequestRender();
        }
      });
    });

    root.querySelector('[data-action="tower-buy-key"]')?.addEventListener('click', () => {
      const res = this.state.buyTowerKeyWithGems();
      if (res === 'bought') {
        audio.playSfx('coin-alt');
        this.pushToast('+1 Tower Key purchased!');
      } else if (res === 'full') {
        audio.playSfx('ui-error');
        this.pushToast('Tower Keys are already full!');
      } else {
        audio.playSfx('ui-error');
        this.pushToast('Not enough Gems!');
      }
      this.onRequestRender();
    });

    root.querySelector('[data-action="tower-ad-key"]')?.addEventListener('click', () => {
      if (this.state.towerKeys >= TOWER_MAX_KEYS) {
        audio.playSfx('ui-error');
        this.pushToast('Tower Keys are already full!');
        return;
      }
      cgRequestRewardedAd(
        () => {
          if (this.state.grantFreeTowerKey()) {
            audio.playSfx('coin-alt');
            this.pushToast('+1 Free Tower Key!');
          }
          this.onRequestRender();
        },
        () => {
          audio.playSfx('ui-error');
          this.pushToast('Ad not available right now.');
        },
        (muted) => audio.setAdMuted(muted)
      );
    });

    root.querySelector('[data-action="tower-enter-run"]')?.addEventListener('click', () => {
      const cp = this.ensureValidCheckpoint();
      if (!this.state.startTowerRun(cp)) {
        audio.playSfx('ui-error');
        this.pushToast('Out of Tower Keys!');
        return;
      }
      audio.playSfx('teleport');
      this.onOpenModal('none');
      this.onEnterTowerArena();
    });

    root.querySelector('[data-action="tower-retry-run"]')?.addEventListener('click', (e) => {
      const floorAttr = Number((e.currentTarget as HTMLElement).dataset.retryFloor || 0);
      const cp = floorAttr >= 1 ? floorAttr : this.ensureValidCheckpoint();
      this.selectedCheckpoint = cp;
      if (!this.state.startTowerRun(cp)) {
        audio.playSfx('ui-error');
        this.pushToast('Out of Tower Keys!');
        return;
      }
      audio.playSfx('teleport');
      this.onOpenModal('none');
      this.onEnterTowerArena();
    });

    root.querySelector('[data-action="tower-quick-sweep"]')?.addEventListener('click', () => {
      const res = this.state.quickSweepTower();
      if (res.ok) {
        audio.playSfx('coin');
        this.pushToast(`Quick Sweep: +${fmtInt(res.gemsAwarded)} Gems!`);
      } else {
        audio.playSfx('ui-error');
        this.pushToast('Clear Floor 1 first or need a Tower Key!');
      }
      this.onRequestRender();
    });
  }

  public bindArenaEvents(root: HTMLElement): void {
    root.querySelector('[data-action="tower-exit"]')?.addEventListener('click', () => {
      audio.playSfx('ui-close');
      this.state.abandonTowerRun();
      this.onExitTowerArena();
      this.onOpenModal('tower');
    });

    root.querySelectorAll('[data-tower-blessing]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.towerBlessing;
        if (!id) return;
        if (this.state.chooseTowerBlessing(id)) {
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
