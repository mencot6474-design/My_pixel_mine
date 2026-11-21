import { audio } from '../audio/AudioManager';
import { GameState } from '../game/GameState';
import { fmtInt } from '../game/NumberFormat';
import type { OmegaBossId } from '../game/OmegaData';
import type { OmegaTargetObject } from '../game/OmegaBossDomain';
import type { SceneMode } from '../game3d/MineScene3D';
import type { ModalKind } from './HudShared';
import type { OmegaArenaHudUi } from './OmegaArenaHudUi';

export interface OmegaSceneOps {
  setBossConfig: (bossId: OmegaBossId) => void;
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
    this.omegaOps?.setBossConfig(bossId);
    this.setSceneMode('omega');
    this.syncOmegaSceneVisual();
  }

  public syncOmegaSceneVisual(): void {
    const b = this.state.omegaBattle;
    if (!b) return;
    this.omegaOps?.syncBattleVisuals(b.targets, b.breakRemainingSec > 0, b.parryWindow.active);
  }

  public handleOmegaFighterStrike(slotIndex: number, attackInterval: number): { dmg: number; isCrit?: boolean } | undefined {
    if (this.getSceneMode() !== 'omega' || !this.state.omegaBattle) return undefined;
    const res = this.state.applyOmegaSquadStrike(slotIndex, attackInterval);
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
    if (summary?.victory) {
      audio.playSfx('rare-fanfare', { volume: 0.78 });
      this.pushToast(
        `VICTORY!${summary.coresAwarded > 0 ? ` +${summary.coresAwarded} Omega Core!` : ''} +${fmtInt(summary.gemsAwarded)} Gems`
      );
    }
    this.setSceneMode('shop');
    this.openModal('omega-boss');
  }
}
