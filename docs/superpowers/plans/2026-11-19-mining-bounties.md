# Mining Bounties / Contracts Implementation Plan

> **For agentic workers:** Execute inline (Native) task-by-task with TDD.

**Goal:** Add 3 rotating Mining Bounties persisted in save state, automatically tracked during gameplay, and claimable in a Dark-Glass `BountiesModalUi` with a live HUD badge.

**Architecture:** Pure domain module `src/game/BountiesDomain.ts`, persistence in `GameStateSave.ts`, hooks and facade methods in `GameState.ts`, and `src/ui/BountiesModalUi.ts` wired into `GameHud.ts`, `HudShared.ts`, and `hud.css`.

**Tech Stack:** TypeScript (strict), Tailwind CSS v4, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-19-mining-bounties-design.md`

---

### Task 1: `BountiesDomain.ts`, `GameStateSave` Persistence & `GameState` Hooks
- **Files:** Create `src/game/BountiesDomain.ts`, Modify `src/game/GameStateSave.ts`, `src/game/GameState.ts`
- **Tests:** `tests/state-modules.test.ts`
- **Steps:**
  - [ ] Write failing tests verifying 3 unique active bounties populate on init, progress clamps at `target`, claiming before ready returns `null`, claiming when ready grants Gems/Dice/Cash, increments `bountiesCompleted`, replaces slot with a fresh unique bounty, and save/load preserves bounties & `bountiesCompleted`.
  - [ ] Implement `src/game/BountiesDomain.ts` and wire into `GameStateSave.ts` and `GameState.ts` (including gameplay progress hooks).
  - [ ] Verify tests pass.

### Task 2: `BountiesModalUi`, HUD Quick Button + Live Badge & Styling
- **Files:** Create `src/ui/BountiesModalUi.ts`, Modify `src/ui/HudShared.ts`, `src/ui/GameHud.ts`, `src/styles/hud.css`, `GAME_MAP.md`
- **Tests:** `tests/hud-modules.test.ts`
- **Steps:**
  - [ ] Write failing tests for `BountiesModalUi.renderModal` (renders `data-modal-theme="bounties"`, 3 contracts, progress text, ready Claim button vs disabled In Progress state, completed counter).
  - [ ] Implement `src/ui/BountiesModalUi.ts`, add `'bounties'` to `ModalKind`, add `[data-modal-theme='bounties']` in `hud.css`, add quick Bounties button with ready badge in `GameHud.ts` (and live badge refresh).
  - [ ] Run `npm.cmd test`, `npm.cmd run build`, and update `GAME_MAP.md`.
