import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  createEmptyTeamPresets,
  isTeamPresetPopulated,
  TEAM_PRESET_COUNT,
  type TeamPresetSlots,
} from './GameStateSave';
import {
  equipChibiOnPlotSlot,
  PlotUnitsContext,
  removeMinerFromPlotSlot,
} from './PlotUnitsDomain';

export { createEmptyTeamPresets, isTeamPresetPopulated, TEAM_PRESET_COUNT };
export type { TeamPresetSlots };

export interface TeamPresetsContext extends PlotUnitsContext {
  teamPresets: TeamPresetSlots[];
}

export interface ApplyTeamPresetResult {
  equippedCount: number;
  skippedCount: number;
}

export function saveTeamPresetDomain(
  ctx: TeamPresetsContext,
  presetIndex: number
): boolean {
  if (!Number.isInteger(presetIndex) || presetIndex < 0 || presetIndex >= TEAM_PRESET_COUNT) {
    return false;
  }
  const snapshot: TeamPresetSlots = Array.from(
    { length: STAGE_PEDESTAL_COUNT },
    (_, i) => ctx.plotMiners[i] ?? null
  );
  if (!isTeamPresetPopulated(snapshot)) {
    return false;
  }
  ctx.teamPresets[presetIndex] = snapshot;
  return true;
}

export function applyTeamPresetDomain(
  ctx: TeamPresetsContext,
  presetIndex: number
): ApplyTeamPresetResult | null {
  if (!Number.isInteger(presetIndex) || presetIndex < 0 || presetIndex >= TEAM_PRESET_COUNT) {
    return null;
  }
  const preset = ctx.teamPresets[presetIndex];
  if (!isTeamPresetPopulated(preset)) {
    return null;
  }

  // Safely stash all currently placed units first so upgrades/pickaxes/mutations/enchants are preserved.
  const noop = () => {};
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    if (ctx.plotMiners[i]) {
      removeMinerFromPlotSlot(ctx, i, noop);
    }
  }

  let equippedCount = 0;
  let skippedCount = 0;
  for (let i = 0; i < STAGE_PEDESTAL_COUNT; i++) {
    const chibiId = preset[i] ?? null;
    if (!chibiId) continue;
    const res = equipChibiOnPlotSlot(ctx, i, chibiId, noop);
    if (res === 'placed') {
      equippedCount++;
    } else {
      skippedCount++;
    }
  }

  return { equippedCount, skippedCount };
}
