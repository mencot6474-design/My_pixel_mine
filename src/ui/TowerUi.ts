import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { CG_ADS_ENABLED, cgRequestRewardedAd } from '../sdk/crazygames';
import { fmtInt, fmtShort } from '../game/NumberFormat';
import {
  getGlobalGemGainBonus,
  getTowerCheckpoints,
  getTowerFloorDef,
  getTowerSweepGemReward,
  getTowerWaveDef,
  TOWER_KEY_GEM_COST,
  TOWER_MAX_KEYS,
  TOWER_MILESTONES,
  TOWER_ORE_ROCKS_PER_WAVE,
  TOWER_WAVES_PER_FLOOR,
} from '../game/TowerData';
import { hudIconHtml, towerIconHtml } from './HudIcons';
import { ModalKind, renderModalShell, TW_TOP_CENTER } from './HudShared';

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

    const headerExtraHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-cyan-300/35 bg-[rgba(12,18,34,0.85)] text-[13px] font-extrabold text-cyan-200" data-tower-keys-pill="true">
          <span>🔑 ${this.state.towerKeys}/${TOWER_MAX_KEYS}</span>
          <span class="text-[11px] text-slate-400 font-bold" data-tower-regen="true">(${regenStr})</span>
        </div>
        ${
          this.state.towerKeys < TOWER_MAX_KEYS
            ? `<button class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-amber-300/45 bg-[linear-gradient(135deg,rgba(245,158,11,0.85),rgba(180,83,9,0.92))] text-white text-[12px] font-black cursor-pointer hover:brightness-110 active:scale-95" data-action="tower-buy-key">+1 Key (${hudIconHtml('gem', 13, 'Gems')} ${fmtInt(TOWER_KEY_GEM_COST)})</button>${
                CG_ADS_ENABLED
                  ? `<button class="px-2.5 py-1 rounded-xl border border-emerald-300/45 bg-[linear-gradient(135deg,rgba(16,185,129,0.88),rgba(4,120,87,0.94))] text-white text-[12px] font-black cursor-pointer hover:brightness-110 active:scale-95" data-action="tower-ad-key">🎬 +1 Key (Ad)</button>`
                  : ''
              }`
            : ''
        }
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-pink-400/35 bg-[rgba(24,14,38,0.85)] text-[13px] font-black text-pink-200" data-tower-gems-pill="true">
          ${hudIconHtml('gem', 16, 'Gems')}
          <span>${fmtInt(this.state.gems)}</span>
        </div>
      </div>
    `;

    const summaryBannerHtml = summary
      ? `
        <div class="rounded-xl border border-cyan-400/40 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(139,92,246,0.14))] px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="text-[12px] font-black uppercase tracking-wider text-cyan-300">Last Run Summary</span>
              ${summary.newRecord ? '<span class="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-[10px] font-black text-amber-200">NEW RECORD</span>' : ''}
            </div>
            <div class="text-[13px] font-bold text-slate-200">
              Cleared <span class="text-white font-black">${summary.floorsCleared}</span> floor(s) (${summary.wavesCleared} waves) • Reached <span class="text-cyan-200 font-black">Floor ${summary.highestReached} • Wave ${summary.highestWave}/${TOWER_WAVES_PER_FLOOR}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 text-[13px] font-black">
            <span class="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-300/40 text-pink-200">+${fmtInt(summary.gemsEarned)} Gems</span>
            ${summary.diceEarned > 0 ? `<span class="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-300/40 text-purple-200">+${summary.diceEarned} Dice</span>` : ''}
          </div>
        </div>
      `
      : '';

    const checkpointChips = cps
      .map((cp) => {
        const active = cp === startFloor;
        const cls = active
          ? 'border-cyan-300/75 bg-[linear-gradient(135deg,rgba(56,189,248,0.34),rgba(139,92,246,0.34))] text-white shadow-[0_0_12px_rgba(56,189,248,0.32)]'
          : 'border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]';
        return `<button class="px-3 py-1.5 rounded-xl border text-[12px] font-black cursor-pointer transition-all duration-150 active:scale-95 ${cls}" data-tower-cp="${cp}">Floor ${cp}</button>`;
      })
      .join('');

    const milestonesHtml = TOWER_MILESTONES.map((m) => {
      const done = this.state.towerBestFloor >= m.floor;
      return `
        <div class="w-full rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${
          done ? 'border-emerald-400/45 bg-emerald-500/10' : 'border-white/12 bg-white/[0.03]'
        }">
          <div class="flex flex-col text-left">
            <div class="text-[12px] font-black ${done ? 'text-emerald-300' : 'text-white'}">Floor ${m.floor} • ${m.title}</div>
            <div class="text-[11px] font-semibold text-slate-300">+${fmtInt(m.gemBonus)} Gems • +${m.diceBonus} Dice • +${Math.round(m.globalGemPct * 100)}% Global Gems</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            done ? 'bg-emerald-400/20 border border-emerald-300/50 text-emerald-200' : 'bg-white/[0.06] border border-white/15 text-slate-400'
          }">${done ? 'CLAIMED' : `${Math.min(this.state.towerBestFloor, m.floor)}/${m.floor}`}</span>
        </div>
      `;
    }).join('');

    const bodyHtml = `
      <div class="flex-1 min-h-0 flex items-stretch gap-3 @max-[860px]:flex-col overflow-x-hidden overflow-y-auto mam-no-scrollbar">
        <div class="flex-1 min-w-0 flex flex-col gap-3">
          ${summaryBannerHtml}

          <div class="mam-inspector-well rounded-xl p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div class="text-[11px] font-black uppercase tracking-wider text-cyan-300">Starting Checkpoint</div>
                <div class="text-[12px] font-semibold text-slate-300">Best Floor: <span class="text-white font-black">${this.state.towerBestFloor}</span> • Every 5 floors unlocks a Checkpoint & Spire Milestone</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">${checkpointChips}</div>
          </div>

          <div class="mam-inspector-well rounded-xl p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div class="text-[18px] font-black text-white">${previewDef.title} • 10 Waves</div>
                <div class="text-[12px] font-bold" style="color:${previewDef.anomaly.color}">Anomaly: ${previewDef.anomaly.name} — ${previewDef.anomaly.desc}</div>
                <div class="text-[11px] font-semibold text-slate-300 mt-0.5">Waves 1–9: Break ${TOWER_ORE_ROCKS_PER_WAVE} Random Ore Rocks/Wave • Wave 10: Floor Boss</div>
              </div>
              <span class="px-2.5 py-1 rounded-full border text-[11px] font-black ${
                previewDef.isBoss
                  ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                  : 'border-cyan-300/40 bg-cyan-500/15 text-cyan-200'
              }">${previewDef.isBoss ? 'CHECKPOINT BOSS' : '9 WAVES + BOSS'}</span>
            </div>

            <div class="grid grid-cols-3 @max-[560px]:grid-cols-1 gap-2">
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wave 1 Rock / W10 Boss</div>
                <div class="text-[14px] font-black text-white">${fmtShort(wave1Def.rockBaseHp)} / ${fmtShort(previewDef.hp)} HP</div>
              </div>
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timer (Ore / Boss)</div>
                <div class="text-[14px] font-black text-cyan-200">${wave1Def.durationSec}s / ${previewDef.durationSec}s</div>
              </div>
              <div class="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boss Clear Reward</div>
                <div class="text-[14px] font-black text-pink-300">+${fmtInt(Math.round(previewDef.gemReward * globalMult))} Gems${previewDef.diceDropChance > 0 ? ' + Dice%' : ''}</div>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                class="mam-sheen-hover relative overflow-hidden flex-1 min-w-[200px] h-11 px-5 rounded-xl border ${
                  this.state.towerKeys > 0
                    ? 'border-cyan-300/55 bg-[linear-gradient(135deg,#0ea5e9_0%,#7c3aed_100%)] shadow-[0_8px_22px_rgba(56,189,248,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] text-white cursor-pointer hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5'
                    : 'border-white/15 bg-white/[0.06] text-slate-400 cursor-not-allowed'
                } text-[15px] font-black transition-[transform,filter] duration-150"
                data-action="tower-enter-run"
                ${this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                ${this.state.towerKeys > 0 ? `Enter Floor ${startFloor} (1 Key)` : 'Out of Tower Keys'}
              </button>

              <button
                class="h-11 px-4 rounded-xl border ${
                  this.state.towerBestFloor >= 1 && this.state.towerKeys > 0
                    ? 'border-emerald-300/45 bg-[linear-gradient(135deg,rgba(16,185,129,0.85),rgba(5,150,105,0.92))] text-white cursor-pointer hover:brightness-110 active:scale-95'
                    : 'border-white/12 bg-white/[0.04] text-slate-500 cursor-not-allowed'
                } text-[13px] font-black transition-all duration-150"
                data-action="tower-quick-sweep"
                ${this.state.towerBestFloor < 1 || this.state.towerKeys <= 0 ? 'disabled' : ''}
              >
                Quick Sweep (+${fmtInt(Math.round(sweepGems * globalMult))} Gems)
              </button>
            </div>
          </div>
        </div>

        <div class="mam-inspector-well w-[300px] @max-[860px]:w-full shrink-0 rounded-xl p-3.5 flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto mam-no-scrollbar">
          <div class="text-[12px] font-black uppercase tracking-wider text-purple-300">Combat Readiness</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">ACTIVE MINERS</div>
              <div class="text-[14px] font-black text-white">${placedCount}/5</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">TEAM DPS</div>
              <div class="text-[14px] font-black text-cyan-300">${fmtShort(teamDps)}/s</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">TAP DAMAGE</div>
              <div class="text-[14px] font-black text-emerald-300">${fmtShort(tapDmg)}</div>
            </div>
            <div class="rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-2">
              <div class="text-[10px] font-bold text-slate-400">GLOBAL GEM BONUS</div>
              <div class="text-[14px] font-black text-pink-300">+${globalBonusPct}%</div>
            </div>
          </div>

          <div class="text-[12px] font-black uppercase tracking-wider text-purple-300 pt-1">Milestones (Every 5 Floors)</div>
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
        return `<span class="w-3 h-3 rounded-full border transition-all duration-150 ${
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
                `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-[#0c1428] text-[10.5px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" style="color:${b.color};border-color:${b.color}">✦ ${b.name}</span>`
            )
            .join('')
        : `<span class="px-2.5 py-1 rounded-lg border border-[#243454] bg-[#0b1120] text-[11px] font-bold text-slate-400">Defeat Wave 10 Boss to pick a Spire Blessing</span>`;

    const blessingOverlay = run.pendingBlessings
      ? `
        <div class="fixed inset-0 z-40 bg-[rgba(4,7,15,0.68)] backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div class="mam-modal w-[min(780px,100%)] p-5 flex flex-col gap-3.5" data-modal-theme="tower">
            <div class="mam-modal-surface" aria-hidden="true"></div>
            <div class="mam-modal-rails" aria-hidden="true">
              <span class="mam-rail-stud is-tl"></span><span class="mam-rail-stud is-tr"></span>
              <span class="mam-rail-stud is-bl"></span><span class="mam-rail-stud is-br"></span>
            </div>
            <div class="text-center pt-1">
              <div class="text-[11px] font-black uppercase tracking-widest text-cyan-300">Floor ${run.floor} Boss Defeated!</div>
              <div class="text-[24px] font-black text-white">Choose 1 Spire Blessing</div>
              <div class="mt-0.5 text-[12px] font-bold text-amber-300 tabular-nums" data-tower-blessing-timer="true">
                Auto-pick random in ${(run.blessingTimerLeft ?? 5).toFixed(1)}s
              </div>
            </div>
            <div class="grid grid-cols-3 @max-[720px]:grid-cols-1 gap-3">
              ${run.pendingBlessings
                .map(
                  (b) => `
                  <button class="mam-inspector-well rounded-2xl p-4 flex flex-col items-center text-center gap-2 cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:border-cyan-300/60 active:scale-95" data-tower-blessing="${b.id}">
                    <div class="w-11 h-11 rounded-2xl border border-white/20 bg-white/[0.06] flex items-center justify-center text-[20px] font-black" style="color:${b.color}">✦</div>
                    <div class="text-[16px] font-black text-white">${b.name}</div>
                    <div class="text-[12px] font-bold text-slate-300">${b.desc}</div>
                    <span class="mt-1 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-300/40 text-[11px] font-black text-cyan-200">Enter Floor ${run.floor + 1}</span>
                  </button>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      `
      : '';

    const waveBadge = run.isBossWave
      ? `<span class="px-3 py-1 rounded-xl border-2 border-amber-400 bg-[linear-gradient(135deg,#78220c,#3b0d06)] text-[12px] font-black tracking-wide text-amber-200 shadow-[0_3px_10px_rgba(0,0,0,0.6)] mam-outline-sm">★ BOSS WAVE</span>`
      : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-cyan-400 bg-[#0d182d] text-[12px] font-black text-cyan-200 shadow-[0_3px_10px_rgba(0,0,0,0.6)] mam-outline-sm" data-tower-ores-badge="true">
          <span>${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ORES</span>
          <span class="inline-flex items-center gap-1" data-tower-ore-pips="true">${this.renderOrePipsHtml()}</span>
        </span>`;

    const invulLeft = run.isBossWave ? Math.max(0, run.bossInvulLeft ?? 0) : 0;
    const hpPctLabel = Math.max(0, Math.min(100, Math.round(hpPct)));
    const hpLabel = `${fmtShort(Math.ceil(run.hp))} / ${fmtShort(run.maxHp)} HP (${hpPctLabel}%)`;
    const bossShieldBadge = run.isBossWave
      ? invulLeft > 0
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 border-cyan-300 bg-[#0c324a] text-cyan-100 text-[10.5px] font-black tracking-wider animate-pulse mam-outline-sm" data-tower-boss-shield="true">${BATTLE_SHIELD_SVG}<span data-tower-shield-label="true">SHIELD ${invulLeft.toFixed(1)}s</span></span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 border-rose-400 bg-[#470b1d] text-rose-100 text-[10.5px] font-black tracking-wider mam-outline-sm" data-tower-boss-shield="true">${BATTLE_BOLT_SVG}<span data-tower-shield-label="true">VULNERABLE</span></span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 border-cyan-400 bg-[#0c2740] text-cyan-100 text-[10.5px] font-black tracking-wider mam-outline-sm" data-tower-wave-rocks="true">${BATTLE_PICKAXE_SVG}<span data-tower-rocks-label="true">${aliveOres}/${TOWER_ORE_ROCKS_PER_WAVE} ROCKS LEFT</span></span>`;
    const emblemSvg = run.isBossWave
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 17L6 7L12 11L18 7L20 17H4Z" fill="#fde047" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.6" fill="#be123c"/></svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="#38bdf8" fill-opacity="0.3" stroke="#bae6fd" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="#ffffff"/></svg>`;
    const stripeOverlay =
      'repeating-linear-gradient(-45deg,rgba(255,255,255,0.2) 0px,rgba(255,255,255,0.2) 7px,transparent 7px,transparent 14px)';
    const barFillBg = run.isBossWave
      ? invulLeft > 0
        ? `${stripeOverlay},linear-gradient(90deg,#0284c7,#22d3ee,#7dd3fc)`
        : `${stripeOverlay},linear-gradient(90deg,#be123c,#ef4444,#f59e0b)`
      : `${stripeOverlay},linear-gradient(90deg,#0284c7,#38bdf8,#8b5cf6)`;

    return `
      <div class="${TW_TOP_CENTER}">
        <button class="inline-flex items-center justify-center gap-2 @max-[720px]:gap-1.5 px-5 @max-[720px]:px-4 py-2 @max-[720px]:py-1.5 rounded-2xl border-2 border-rose-400 bg-[linear-gradient(135deg,#dc2626_0%,#991b1b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_0_#450a0a,0_10px_24px_-4px_rgba(239,68,68,0.45)] text-white text-[18px] @max-[720px]:text-[15px] font-extrabold cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:scale-[0.97] mam-outline" data-action="tower-exit">
          ${towerIconHtml(24)}
          <span>Exit Tower</span>
        </button>
      </div>

      ${currencyRailHtml}

      <div class="fixed top-[68px] left-1/2 -translate-x-1/2 w-[min(640px,calc(100%-24px))] flex flex-col items-center gap-2 pointer-events-none z-20">
        <div class="flex items-center gap-2 flex-wrap justify-center">
          <span class="px-3 py-1 rounded-xl border-2 border-cyan-400 bg-[linear-gradient(135deg,#132242,#0b1326)] text-[13px] font-black text-white shadow-[0_3px_10px_rgba(0,0,0,0.65)] mam-outline-sm">
            FLOOR ${run.floor} • WAVE ${run.wave}/${run.maxWaves}
          </span>
          ${waveBadge}
          <span class="px-3 py-1 rounded-xl border-2 border-[#354c73] bg-[#0e182e] text-[12px] font-black shadow-[0_3px_10px_rgba(0,0,0,0.6)] mam-outline-sm" style="color:${floorDef.anomaly.color}">
            ✦ ${floorDef.anomaly.name}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 ${
            timerDanger
              ? 'border-rose-400 bg-[#4a0b1d] text-rose-100 animate-pulse'
              : 'border-[#354c73] bg-[#0e182e] text-cyan-200'
          } text-[13px] font-black tabular-nums shadow-[0_3px_10px_rgba(0,0,0,0.6)] mam-outline-sm" data-tower-timer="true">
            ${BATTLE_TIMER_SVG}<span data-tower-timer-label="true">${run.timeLeft.toFixed(1)}s</span>
          </span>
        </div>

        <div class="mam-battle-hp-card ${run.isBossWave ? 'is-boss' : ''} flex flex-col gap-1.5">
          <div class="w-full flex items-center justify-between gap-2">
            <div class="inline-flex items-center gap-2 min-w-0">
              <span class="mam-battle-emblem">${emblemSvg}</span>
              <span class="w-2 h-2 rounded-full shrink-0 ${
                run.isBossWave
                  ? 'bg-rose-400 shadow-[0_0_8px_#fb7185] animate-ping'
                  : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse'
              }"></span>
              <span class="text-[13px] font-black uppercase tracking-wider truncate ${
                run.isBossWave ? 'text-amber-200' : 'text-cyan-100'
              } mam-outline-sm">${
                run.isBossWave ? 'SERAPHIM AI OVERLORD' : `WAVE ${run.wave}/9 • DATA NODES`
              }</span>
            </div>
            ${bossShieldBadge}
          </div>

          <div class="mam-battle-hp-track">
            <div class="mam-battle-hp-fill" data-tower-hp-fill="true" style="width:${hpPct}%;background-image:${barFillBg}"></div>
            <div class="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-[1]"></div>
            <div class="mam-battle-hp-ticks" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="relative z-[2] text-[14px] font-black tabular-nums text-white mam-outline-sm" data-tower-hp-text="true">
              ${hpLabel}
            </div>
          </div>
        </div>
      </div>

      <div class="mam-battle-dock fixed bottom-3.5 left-1/2 -translate-x-1/2 w-[min(780px,calc(100%-24px))] px-3.5 py-2.5 flex items-center justify-between gap-2.5 flex-wrap pointer-events-auto z-20">
        <div class="flex items-center gap-2 flex-wrap text-[12.5px] font-black tabular-nums">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-pink-400/70 bg-[#2b102c] text-pink-200 mam-outline-sm" data-tower-run-gems="true">+${fmtInt(run.gemsEarned)} Gems</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-purple-400/70 bg-[#20133d] text-purple-200 mam-outline-sm" data-tower-run-dice="true">+${run.diceEarned} Dice</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-cyan-400/70 bg-[#0d243b] text-cyan-200 mam-outline-sm">${fmtShort(effDps)}/s DPS</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-emerald-400/70 bg-[#0c2e22] text-emerald-200 mam-outline-sm">${fmtShort(effTap)} Tap</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">${blessingsStrip}</div>
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
    if (shieldBadge && run.isBossWave) {
      const nextMode = invulLeft > 0 ? 'shield' : 'vuln';
      if (invulLeft > 0) {
        shieldBadge.className =
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 border-cyan-300 bg-[#0c324a] text-cyan-100 text-[10.5px] font-black tracking-wider animate-pulse mam-outline-sm';
        if (shieldBadge.dataset.shieldMode !== nextMode) {
          shieldBadge.dataset.shieldMode = nextMode;
          shieldBadge.innerHTML = `${BATTLE_SHIELD_SVG}<span data-tower-shield-label="true">SHIELD ${invulLeft.toFixed(1)}s</span>`;
        } else {
          const lbl = shieldBadge.querySelector<HTMLElement>('[data-tower-shield-label="true"]');
          if (lbl) lbl.textContent = `SHIELD ${invulLeft.toFixed(1)}s`;
        }
      } else {
        shieldBadge.className =
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 border-rose-400 bg-[#470b1d] text-rose-100 text-[10.5px] font-black tracking-wider mam-outline-sm';
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
      timer.classList.toggle('border-rose-400', danger);
      timer.classList.toggle('bg-[#4a0b1d]', danger);
      timer.classList.toggle('text-rose-100', danger);
      timer.classList.toggle('animate-pulse', danger);
      timer.classList.toggle('border-[#354c73]', !danger);
      timer.classList.toggle('bg-[#0e182e]', !danger);
      timer.classList.toggle('text-cyan-200', !danger);
    }
    const gemsEl = root.querySelector<HTMLElement>('[data-tower-run-gems="true"]');
    if (gemsEl) gemsEl.textContent = `+${fmtInt(run.gemsEarned)} Gems`;
    const diceEl = root.querySelector<HTMLElement>('[data-tower-run-dice="true"]');
    if (diceEl) diceEl.textContent = `+${run.diceEarned} Dice`;
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
  }
}
