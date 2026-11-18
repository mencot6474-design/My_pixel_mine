# Overclock / Cyber Fever Gauge — Design Spec

**Date:** 2026-11-19
**Status:** Approved

## Intent & Why
Make active play in the first 5 minutes feel punchy and rewarding on CrazyGames by charging a neon Overclock gauge from taps and ore breaks, automatically triggering a 15-second Cyber Fever overdrive state.

## Goals
- Pure domain module `src/game/OverclockDomain.ts`:
  - Charge range `0..100` (`OVERCLOCK_TAP_CHARGE = 4`, `OVERCLOCK_BREAK_CHARGE = 8`).
  - Gentle idle decay (`OVERCLOCK_DECAY_PER_SEC = 1.5`) after `OVERCLOCK_DECAY_DELAY_SEC = 5` seconds without charging.
  - Auto-activates immediately when charge reaches `100` for `OVERCLOCK_DURATION_SEC = 15` seconds.
  - Active buffs: `OVERCLOCK_SPEED_MULT = 2`, `OVERCLOCK_TAP_MULT = 2`, `OVERCLOCK_DROP_MULT = 1.5`.
- Integrate into `GameState.ts`:
  - `chargeOverclock(amount, nowMs)` (auto-called on `onOreBroken` and from `main.ts` on click tap), `stepOverclock(nowMs)`, `isOverclockActive(nowMs)`, `getOverclockSnapshot(nowMs)`.
  - Apply `2x` tap damage in `getTapDamage()` and `1.5x` ore drop in `getTotalOreDropMult()` while active.
- Integrate into `MineScene3D.ts`:
  - `setOverclockActive(active: boolean)` applies `2x` field miner speed (`dtSec * 2`) in Mine mode and overdrive neon lighting (`stageNeonMat` & `rimLight` electric amber-gold pulse), cleanly restoring world palette / weather atmosphere on exit.
- Compact HUD gauge (`src/ui/WeatherDpsHudUi.ts` or `GameHud.ts` top-center strip):
  - Shows `⚡ OVERCLOCK XX%` while charging and animated golden/magenta `⚡ OVERCLOCK ACTIVE 12.4s • 2x SPD • +50% ORE` while active, updated live on the 100ms HUD tick with zero full-HUD re-render!

## Constraints
- Strict TypeScript (no `any`), pure domain testable in Vitest, verify with `npm.cmd test` & `npm.cmd run build`.
