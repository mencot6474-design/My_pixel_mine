import { STAGE_PEDESTAL_COUNT } from '../game3d/MineWorldPalette';
import {
  equipChibiOnPlotSlot,
  PlotUnitsContext,
  removeMinerFromPlotSlot,
} from './PlotUnitsDomain';

export const TEAM_PRESET_COUNT = 3;

export type TeamPresetSlots = (string | null)[];

export interface TeamPresetsContext extends PlotUnitsContext {
  teamPresets: TeamPresetSlots[];
}

export interface ApplyTeamPresetResult {
  equippedCount: number;
  skippedCount: number;
}

export function createEmptyTeamPresets(): TeamPresetSlots[] {
  return Array.from({ length: TEAM_PRESET_COUNT }, () =>
    Array.from({ length: STAGE_PEDESTAL_COUNT }, () => null)
  );
}

export function isTeamPresetPopulated(preset: TeamPresetSlots | undefined): boolean {
  if (!Array.isArray(preset)) return false;
  return preset.some((id) => typeof id === 'string' && id.length > 0);
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
