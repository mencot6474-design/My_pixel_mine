import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaBattlePhase, OmegaTargetObject } from '../game/OmegaBossDomain';
import type { SceneMode } from '../game3d/MineScene3D';
import type { ModalKind } from './HudShared';
import type { OmegaArenaHudUi } from './OmegaArenaHudUi';

export interface OmegaSceneOps {
  setBossConfig: (bossId: OmegaBossId) => void;
  startEntrance?: () => void;
  setBattlePhase?: (phase: OmegaBattlePhase | 'ended') => void;
  pulseInvulShield?: () => void;
  syncBattleVisuals: (targets: readonly OmegaTargetObject[], breakActive: boolean, parryActive: boolean) => void;
  triggerBossHit: (color?: string, isCrit?: boolean) => void;
  triggerTargetShatter: (wx: number, wz: number, color: string) => void;
}

/** Coordinates Omega Boss duel combat events between GameState, OmegaArena3D, and GameHud. */
export class HudOmegaBridge {
  constructor(
    private readonly root: HTMLElement,
    private readonly state: GameState,
    private readonly omegaArenaUi: OmegaArenaHudUi,
    private readonly getSceneMode: () => SceneMode,
    private readonly setSceneMode: (mode: SceneMode) => void,
    private readonly openModal: (kind: ModalKind) => void,
    private readonly pushToast: (msg: string) => void,
    private readonly render: () => void,
    private readonly omegaOps?: OmegaSceneOps
  ) {}

  public startOmegaBattle(bossId: OmegaBossId, tier: number): void {
    if (!this.state.startOmegaBoss(bossId, tier)) {
      this.pushToast('Deploy Chibis & ensure at least 1 Boss Key!');
      return;
    }
    this.omegaArenaUi.resetShieldTargets();
    this.omegaOps?.setBossConfig(bossId);
    this.setSceneMode('omega');
    this.omegaOps?.startEntrance?.();
    this.syncOmegaSceneVisual();
  }

  public syncOmegaSceneVisual(): void {
    const b = this.state.omegaBattle;
    if (!b) {
      this.omegaOps?.syncBattleVisuals([], false, false);
      this.omegaOps?.setBattlePhase?.('ended');
      return;
    }
    this.omegaOps?.setBattlePhase?.(b.phase);
    this.omegaOps?.syncBattleVisuals(b.targets, b.breakRemainingSec > 0, b.parryWindow.active);
  }

  public handleOmegaTapInvulShield(targetIndex: number): void {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return;
    const maxTaps = this.state.omegaBattle.invulMaxTaps;
    const res = this.state.tapOmegaInvulShield();
    if (!res.ok) return;
    const tapsDone = Math.max(1, maxTaps - res.tapsRemaining);
    audio.playCrystalScaleNote(tapsDone);
    this.omegaOps?.pulseInvulShield?.();
    this.omegaArenaUi.randomizeShieldTarget(targetIndex);
    if (res.shattered) {
      audio.playCrystalChord('fever');
      audio.playOreBreak('geode');
      this.omegaOps?.setBattlePhase?.('active');
      this.pushToast('💥 INVUL SHIELD SHATTERED! SQUAD ENGAGE!');
      this.render();
      return;
    }
    this.omegaArenaUi.updateLiveValues(this.root);
    this.omegaArenaUi.syncShieldTargetPos(this.root, targetIndex);
  }

  public handleOmegaFighterStrike(
    slotIndex: number,
    attackInterval: number,
    beatIndex = 0,
    isFinisher = false
  ): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return undefined;
    const res = this.state.applyOmegaSquadStrike(slotIndex, attackInterval);
    if (res.dmgDealt > 0) {
      audio.playBarrageHitSfx(beatIndex, Boolean(res.isCrit), isFinisher);
    }
    if (res.breakTriggered) {
      audio.playCrystalChord('fever');
      this.pushToast('⚡ OMEGA BREAK! 2.5× Team DMG!');
    }
    if (res.bossDefeated) {
      this.finishOmegaFromCombat();
      return { dmg: res.dmgDealt, isCrit: res.isCrit };
    }
    this.omegaArenaUi.updateLiveValues(this.root);
    return { dmg: res.dmgDealt, isCrit: res.isCrit };
  }

  public handleOmegaTargetClick(targetId: string): void {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return;
    const target = this.state.omegaBattle.targets.find((t) => t.id === targetId);
    const res = this.state.hitOmegaTargetObject(targetId);
    if (!res.ok) return;
    audio.playOreBreak('geode');
    if (target) {
      this.omegaOps?.triggerTargetShatter(target.xOffset, -3.4 + target.zOffset + 1.5, '#f43f5e');
    }
    if (res.breakTriggered) {
      audio.playCrystalChord('fever');
      this.pushToast('⚡ OMEGA BREAK! 2.5× Team DMG!');
    }
    if (res.bossDefeated) {
      this.finishOmegaFromCombat();
      return;
    }
    this.syncOmegaSceneVisual();
    this.render();
  }

  public handleOmegaBossClick(): void {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return;
    if (this.state.omegaBattle.parryWindow.active) {
      this.handleOmegaParryClick();
    }
  }

  public handleOmegaParryClick(): void {
    const res = this.state.triggerOmegaParry();
    if (!res.ok) return;
    audio.playCrystalChord('meteor');
    this.omegaOps?.triggerBossHit('#fde047', true);
    this.pushToast(`⚡ PERFECT PARRY! -${res.counterDmg.toLocaleString('en-US')} • +25% Stagger!`);
    if (res.breakTriggered) {
      audio.playCrystalChord('fever');
      this.pushToast('⚡ OMEGA BREAK! 2.5× Team DMG!');
    }
    if (res.bossDefeated) {
      this.finishOmegaFromCombat();
      return;
    }
    this.syncOmegaSceneVisual();
    this.render();
  }

  private finishOmegaFromCombat(): void {
    const summary = this.state.omegaLastSummary;
    this.omegaOps?.syncBattleVisuals([], false, false);
    this.omegaOps?.setBattlePhase?.('ended');
    if (summary?.victory) {
      audio.playSfx('rare-fanfare', { volume: 0.78 });
      this.render();
      return;
    }
    if (summary) {
      this.render();
      return;
    }
    this.setSceneMode('shop');
    this.openModal('omega-boss');
  }
}
