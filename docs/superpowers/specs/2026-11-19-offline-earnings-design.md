# Offline Earnings Modal — Design Spec

**Date:** 2026-11-19
**Status:** Approved

## Intent & Why
Boost Day-1 Retention on CrazyGames by rewarding players when they return after being away, while seamlessly supporting optional **2x Claim (Watch Ad)** once `CG_ADS_ENABLED` is enabled for Full Launch.

## Goals
- Persist `lastSavedAt` timestamp in `SavePayload` (`GameStateSave.ts`), updated on save and page visibility/unload.
- Compute deterministic, balanced offline earnings in a pure domain module (`src/game/OfflineEarningsDomain.ts`):
  - Minimum away time: **120 seconds** (2 minutes).
  - Maximum away time: **28,800 seconds** (8 hours).
  - Requires `totalPlotDps > 0` (at least 1 active Chibi on plots) and non-tutorial session.
  - Efficiency factor: **50%** (`0.5`) so active play stays faster than AFK.
  - Awards **Cash**, **Gems**, and **Bonus Ores** (capped to remaining chest capacity & 200 ore items max so chest never overflows).
- Render a compact Dark-Glass `OfflineModalUi` (`ModalKind = 'offline'`, `h-auto`), showing formatted away duration, Cash/Gems/Ores earned, **Claim** button, and conditional **2x Claim (Watch Ad)** button when `CG_ADS_ENABLED === true` (using `cgRequestRewardedAd`).
- Also tighten `SettingsModalUi` modal height (`h-auto min-h-0`) so there is no empty bottom whitespace.

## Non-Goals
- No background server/cloud clock verification (client timestamp with safe negative/clock-skew clamp).
- No offline Tower or Weather Meteor simulation.

## Constraints
- Pure domain helper in `src/game/OfflineEarningsDomain.ts` (zero circular imports with `GameState.ts`).
- Strict TypeScript (no `any`), Vitest unit tests in `tests/state-modules.test.ts` & `tests/hud-modules.test.ts`.
- Verify with `npm.cmd test` and `npm.cmd run build`.
