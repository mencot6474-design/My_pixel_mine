# Overclock / Cyber Fever Gauge Implementation Plan

> **For agentic workers:** Execute inline (Native) task-by-task with TDD.

**Goal:** Add an auto-activating Overclock / Cyber Fever gauge that charges on ore taps & breaks, grants 15s of 2x Chibi speed, 2x tap damage, and 1.5x ore drops, with neon 3D lighting overdrive and a live HUD bar.

**Architecture:** Pure state & timer logic in `src/game/OverclockDomain.ts`, integrated into `GameState.ts`, live 3D overdrive in `MineScene3D.ts`, live HUD bar in `GameHud.ts` (100ms DOM updater, no full re-render), and tap/sync wiring in `src/main.ts`.

**Tech Stack:** TypeScript (strict), Three.js, Tailwind CSS v4, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-19-overclock-cyber-fever-design.md`

---

### Task 1: `OverclockDomain.ts` & `GameState` Integration
- **Files:** Create `src/game/OverclockDomain.ts`, Modify `src/game/GameState.ts`
- **Tests:** `tests/state-modules.test.ts`
- **Steps:**
  - [ ] Write failing tests verifying charge accumulation, idle decay after 5s, auto-activation at 100% for 15s, active multipliers (`getTapDamage` 2x, `getTotalOreDropMult` 1.5x), and clean reset to 0% after 15s expires.
  - [ ] Implement `src/game/OverclockDomain.ts` and integrate into `src/game/GameState.ts`.
  - [ ] Verify tests pass.

### Task 2: 3D Overdrive (`MineScene3D.ts`), Live HUD Bar (`GameHud.ts`) & `main.ts` Wiring
- **Files:** Modify `src/game3d/MineScene3D.ts`, `src/ui/GameHud.ts`, `src/main.ts`, `GAME_MAP.md`
- **Tests:** `tests/hud-modules.test.ts`
- **Steps:**
  - [ ] Write failing test for `buildOverclockBarContent` (charging state vs active overdrive state with countdown & buffs).
  - [ ] Implement `MineScene3D.setOverclockActive(active: boolean)`, compact top-center Overclock HUD bar + 100ms live DOM sync in `GameHud.ts`, and tap/overclock sync + fanfare SFX in `src/main.ts`.
  - [ ] Run `npm.cmd test`, `npm.cmd run build`, and update `GAME_MAP.md`.
