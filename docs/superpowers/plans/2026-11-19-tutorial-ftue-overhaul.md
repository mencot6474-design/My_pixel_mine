# Tutorial FTUE Overhaul Implementation Plan

> **For agentic workers:** Execute inline (Native) with TDD.

**Goal:** Overhaul `TutorialUi` with a streamlined 5-stage FTUE flow, pop-out Cyber-Anime guide card, target highlight pulse ring, Skip button, and +150 Gems + 1 Enchant Dice completion reward.

**Architecture:** Export pure `buildTutorialCardHtml` & `getTutorialStageMeta` helpers in `src/ui/TutorialUi.ts`, add `.mam-tut-*` styles in `src/styles/hud.css`, add `grantTutorialStarterReward()` in `src/game/GameState.ts`, and wire reward claim callback in `src/ui/GameHud.ts`.

**Tech Stack:** TypeScript (strict), Tailwind CSS v4, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-19-tutorial-ftue-overhaul-design.md`

---

### Task 1: Streamlined `TutorialUi` Flow, Cyber-Anime Card, Highlight Ring & Starter Reward
- **Files:** Modify `src/ui/TutorialUi.ts`, `src/styles/hud.css`, `src/game/GameState.ts`, `src/ui/GameHud.ts`, `GAME_MAP.md`
- **Tests:** `tests/hud-modules.test.ts`
- **Steps:**
  - [ ] Write failing unit tests in `tests/hud-modules.test.ts` for `getTutorialStageMeta` (5 stages), `buildTutorialCardHtml` (pop-out `pose.webp`, 5-stage progress bar, `Skip` button, Starter Bonus `+150 Gems` & `+1 Enchant Dice` on `congrats`), and `GameState.grantTutorialStarterReward()`.
  - [ ] Add `.mam-tut-card`, `.mam-tut-portrait`, `.mam-tut-target-ring`, and `@keyframes mamTutFloat` / `mamTutRingPulse` in `src/styles/hud.css`.
  - [ ] Overhaul `src/ui/TutorialUi.ts` with streamlined flow, `Skip` button, highlight ring management, and `onClaimReward` callback.
  - [ ] Add `grantTutorialStarterReward()` to `src/game/GameState.ts` and wire `onClaimReward` in `src/ui/GameHud.ts`.
  - [ ] Run `npm.cmd test`, `npm.cmd run build`, and visually preview the redesigned Tutorial in the browser!
