# Offline Earnings Modal Implementation Plan

> **For agentic workers:** Execute inline (Native) task-by-task with TDD.

**Goal:** Persist `lastSavedAt`, compute balanced offline earnings (2m–8h, 50% efficiency), and present a compact Dark-Glass `OfflineModalUi` with `Claim` and `CG_ADS_ENABLED`-gated `2x Claim (Watch Ad)`.

**Architecture:** Add pure calculation/claim domain in `src/game/OfflineEarningsDomain.ts`, persist `lastSavedAt` in `GameStateSave.ts` + expose `pendingOfflineEarnings` / `computeOfflineEarnings` / `claimOfflineEarnings` on `GameState`, and build `src/ui/OfflineModalUi.ts` wired into `GameHud.ts`, `HudShared.ts`, `hud.css`, and `main.ts`. Also tighten `SettingsModalUi` height (`h-auto min-h-0`).

**Tech Stack:** TypeScript (strict), Tailwind CSS v4, Vitest, Vite, CrazyGames SDK v3.

**Spec:** `docs/superpowers/specs/2026-11-19-offline-earnings-design.md`

---

### Task 1: `OfflineEarningsDomain.ts` & `GameStateSave` `lastSavedAt`
- **Files:** Create `src/game/OfflineEarningsDomain.ts`, Modify `src/game/GameStateSave.ts`, `src/game/GameState.ts`
- **Tests:** `tests/state-modules.test.ts`
- **Steps:**
  - [ ] Write failing unit tests for: `< 120s` returns `null`, `totalPlotDps <= 0` returns `null`, negative/future `lastSavedAt` returns `null`, `> 8h` caps at `28800s` with `capped: true`, computes Cash/Gems/Ores, `claimOfflineEarnings(1 | 2)` applies rewards (doubling Cash/Gems and respecting chest cap) and clears `pendingOfflineEarnings`, and `serializeSavePayload`/`deserializeSaveJson` preserves `lastSavedAt`.
  - [ ] Implement `OfflineEarningsDomain.ts` (`OFFLINE_MIN_SEC = 120`, `OFFLINE_MAX_SEC = 28800`, `OFFLINE_EFFICIENCY = 0.5`, `formatOfflineDuration`, `computeOfflineEarningsDomain`, `claimOfflineEarningsDomain`).
  - [ ] Wire `lastSavedAt`, `pendingOfflineEarnings`, `evaluateOfflineEarnings(nowMs)`, and `claimOfflineEarnings(mult)` into `GameStateSave.ts` and `GameState.ts`.
  - [ ] Verify tests pass.

### Task 2: `OfflineModalUi`, `GameHud` Integration, `SettingsModalUi` Height Polish & `main.ts` Boot
- **Files:** Create `src/ui/OfflineModalUi.ts`, Modify `src/ui/SettingsModalUi.ts`, `src/ui/HudShared.ts`, `src/ui/GameHud.ts`, `src/styles/hud.css`, `src/main.ts`
- **Tests:** `tests/hud-modules.test.ts`
- **Steps:**
  - [ ] Write failing tests for `OfflineModalUi.renderModal` (renders duration, Cash/Gems/Ores, Claim button, hides 2x Ad button when `adsEnabled: false` and renders it when `adsEnabled: true`) and `SettingsModalUi` compact `h-auto` class.
  - [ ] Implement `src/ui/OfflineModalUi.ts`, add `'offline'` to `ModalKind`, add `[data-modal-theme='offline']` in `hud.css`, tighten `SettingsModalUi` with `h-auto min-h-0`, wire into `GameHud.ts` (including `cgRequestRewardedAd` on 2x claim) and `main.ts` (evaluate offline earnings on boot when `!hud.isTutorialActive()`, open `'offline'` modal if pending, and save timestamp on `visibilitychange` / `beforeunload`).
  - [ ] Run full `npm.cmd test` and `npm.cmd run build`, and update `GAME_MAP.md`.
