# Tutorial FTUE Clarity & Streamlining Overhaul — Design Spec

**Date:** 2026-11-24
**Status:** Approved

## Intent & Why
First-time players on CrazyGames still find the initial tutorial confusing despite the earlier visual overhaul (`2026-11-19-tutorial-ftue-overhaul-design.md`). Specifically:
1. **Silent input blocking without feedback**: `TutorialUi.bindInputGuard()` drops clicks outside the target silently without audio/visual feedback or spotlight dimming on unrelated HUD buttons, making the game feel frozen when players click elsewhere.
2. **Too many tedious manual-close steps (14 steps total)**: Three steps (`exit-plot`, `close-chest`, `close-sell-shop`) only ask the player to click `×` or `Exit`, breaking gameplay rhythm.
3. **Visual-term mismatch**: `click-chest` asks players to *"Click the 3D Chest"*, whereas the right-side station in the 3D arena is now a sci-fi **Cyber Cargo Pod** (`CyberCargoPod3D.ts`).
4. **Missing "why" & interaction clarity**: Players are told to click `Plot #1` without learning that Chibis auto-mine, and `mine-ore` does not mention that players can **Tap or Hold** the ore.
5. **Cluttered HUD on Frame 1**: All advanced HUD buttons (`Shop`, `Upgrades`, `Index`, `Teleport`, `Overclock`, `Weather`, `Daily`, `Bounties`, `Achievements`, `Hotbar`) remain full-brightness while blocked.

## Goals
- **Streamlined 11-Step Flow (Zero Manual-Close Steps)** in concise, natural **English** (matching CrazyGames target audience and UI button labels):
  1. `welcome` (Stage 1/5 • *Mine*): Crisp 1-sentence core loop intro (*"Mine glowing ores, collect loot from your Cargo Pod, and sell at the Plaza for Cash!"*) + `"Start Mining!"` CTA.
  2. `mine-ore` (Stage 1/5 • *Mine*): Prompts **"Tap or Hold"** on the zoomed center ore (*"Tap or hold the glowing Ore in the pit until it shatters!"*).
  3. `click-plot` (Stage 2/5 • *Upgrade*): Explains **why** (*"Nice! Your Chibi Onee auto-mines for you — click Plot #1 to boost her power!"*).
  4. `upgrade-dmg` (Stage 2/5 • *Upgrade*): Points to `[data-inspect-action="up-dmg"]`. After clicking `Upgrade DMG`, a brief celebratory beat (`~350ms`) auto-closes the Plot Inspector and advances straight to `click-chest` (eliminating `exit-plot`).
  5. `click-chest` (Stage 3/5 • *Collect*): Aligns copy with the 3D visual (*"Mined ores go into your Cargo Pod (Chest). Click the glowing Pod or Chest button to open it!"*). Allows clicking either the zoomed 3D pod (`#threeRoot`) or `[data-action="open-chest"]`.
  6. `take-all-chest` (Stage 3/5 • *Collect*): Points to `[data-action="chest-take-all"]`. After clicking `Take All`, a brief beat (`~350ms`) auto-closes the Chest modal and advances straight to `go-shop` (eliminating `close-chest`).
  7. `go-shop` (Stage 4/5 • *Sell*): Points to `[data-action="shops-pill"]` (*"Time to get paid! Click Plaza to visit the Shop Plaza."*).
  8. `click-sell-shop` (Stage 4/5 • *Sell*): In Shop Plaza, points to the Sell Shop building/badge (`[data-shop-station="sell"]` or 3D station, plus `[data-action="open-sell-shop"]`).
  9. `select-ore-sell` (Stage 4/5 • *Sell*): Inside the Sell modal, guides the player to click an Ore card (`[data-sell-key]`) or `Select All` (`[data-action="sell-select-all"]`) so they learn how Sell Shop item selection works.
  10. `click-sell-btn` (Stage 4/5 • *Sell*): Points to `[data-action="sell-selected"]`. After selling, auto-closes the Sell modal after `~350ms` straight to `congrats` (eliminating `close-sell-shop`).
  11. `congrats` (Stage 5/5 • *Reward*): Shows **+150 Gems** & **+1 Enchant Dice** reward chips and `"Claim & Start Playing!"`.
- **Spotlight Dimmer & Clean Onboarding HUD**:
  - Add a subtle dark scrim (`rgba(15, 23, 42, 0.45)`) behind the active target or mark `#hudRoot` / `document.body` with `data-tutorial-active="true"` & `data-tutorial-step="<step>"` so non-relevant HUD clusters (side rails, quick buttons other than Chest when active, Overclock, Weather, Teleport, Hotbar, Potions) are visually dimmed and de-emphasized (`opacity: 0.22; filter: grayscale(0.4)`) while active target elements and the Currency Rail stay crisp and bright.
- **Wrong-Click Feedback (Never Silent Freeze)**:
  - When `bindInputGuard` blocks a click outside the allowed target/canvas, trigger:
    1. Subtle audio feedback (`audio.playSfx('ui-error', { volume: 0.35 })`, throttled e.g. `>= 350ms` so spamming doesn't stack).
    2. Visual nudge: briefly add a nudge/pulse class on `#tutorialArrow` / `.mam-tut-target-ring` / `.mam-tut-card` and update the card's hint line temporarily (or show a compact pill `"Follow the arrow!"`) for `~1.2s` so the player immediately understands why other buttons are locked.

## Non-Goals
- No localization system / Indonesian translation (target audience is English on CrazyGames).
- No changes to the Starter Bonus amounts (`+150 Gems`, `+1 Enchant Dice`), `localStorage` keys (`mam_tutorial_done_v1`, `mam_tutorial_rewarded_v1`), or post-tutorial Twin Trial unlock timing.
- No changes to 3D camera zoom targets (`setTutorialPitZoom`, `setTutorialChestZoom`, `setTutorialSellShopZoom`) other than keeping existing behavior working cleanly.

## Approaches Considered
1. **Approach A — Copy & Wrong-Click Feedback Only**: Update strings and add wrong-click nudge, keeping all 14 steps (including 3 manual close steps) and full-brightness cluttered HUD. *Rejected*: still feels repetitive and visually overwhelming in the first 30 seconds.
2. **Approach B — Streamlined Core Loop + Auto-Advance Modals + Spotlight Dimmer (Chosen)**: Condense to action-only steps with automatic modal close after `Upgrade DMG`, `Take All`, and `Sell`, dim unrelated HUD chrome during tutorial, match "Cargo Pod (Chest)" wording to 3D art, explain Hold-to-Mine & Chibi auto-mining, and give clear audio/visual feedback on blocked clicks.
3. **Approach C — Skip Plaza & Sell Inside Chest + Multi-Stage Progressive Unlock**: Remove Plaza from the tutorial completely and gate Shop/Tower/Forge behind post-tutorial level triggers. *Rejected*: players would not discover the Shop Plaza location (where Pickaxes, Relics, Enchant Altar, Tower, and Omega live), and gating post-tutorial features alters progression balance beyond tutorial clarity.

## Architecture & Touchpoints
1. **`src/ui/TutorialUi.ts`**:
   - Update `TutorialStep` union: remove `'exit-plot'`, `'close-chest'`, `'close-sell-shop'`. Keep `'welcome'`, `'mine-ore'`, `'click-plot'`, `'upgrade-dmg'`, `'click-chest'`, `'take-all-chest'`, `'go-shop'`, `'click-sell-shop'`, `'select-ore-sell'`, `'click-sell-btn'`, `'congrats'`, `'done'`.
   - Update `DIALOG_COPY` strings to concise, natural English explaining **Tap or Hold**, **Onee auto-mines**, **Cargo Pod (Chest)**, and clearer Sell instructions (including allowing `[data-action="sell-select-all"]` during `select-ore-sell`, and allowing `[data-action="open-chest"]` as an alternate selector on `click-chest`, and `[data-action="open-sell-shop"]` as fallback on `click-sell-shop`).
   - Add `onAutoClosePlotInspect?: () => void` and `onAutoCloseModal?: () => void` callbacks (or pass a single `onStepAutoClose` callback) invoked after a `350ms` transition delay in `notifyUpgraded()`, `notifyChestTaken()`, and `notifySellCompleted()`, guarded against double-invocation/skip/unmount (cancel pending timer in `complete()`/`skip()`).
   - Enhance `bindInputGuard`:
     - Support multi-selector `domSelector` (comma-separated CSS selectors, e.g., `'[data-shop-station="sell"], [data-action="open-sell-shop"]'`, or `'[data-sell-key], [data-action="sell-select-all"]'`).
     - On blocked click/pointerdown, trigger throttled `audio.playSfx('ui-error', { volume: 0.35 })` and toggle a temporary `is-nudge` CSS animation + hint flash (`"Click the highlighted target!"` or `"Follow the arrow!"`) for `1.2s`.
   - Sync `document.body.dataset.tutorialActive = 'true' | 'false'` and `document.body.dataset.tutorialStep = this.step` in `render()` and `complete()` (cleaned up on `done`).
2. **`src/ui/GameHud.ts`**:
   - Pass auto-close callbacks into `TutorialUi` (or invoke `this.openPlotInspector(null)` / `this.openModal('none')` from `TutorialUi` callbacks) so finishing `upgrade-dmg`, `take-all-chest`, and `click-sell-btn` smoothly closes the panel/modal and advances to the next stage.
   - Ensure clicking `[data-action="sell-select-all"]` during `select-ore-sell` also notifies `this.tutorialUi.notifySellOreSelected()` if at least 1 item becomes selected (or let `TutorialUi` check selection).
   - Note: While `TutorialUi` auto-closes, guard `syncView` against race conditions if the user manually clicks `×` or backdrop before the `350ms` timer fires (e.g., if `inspectedSlot === null` during `upgrade-dmg` after upgrade already fired, or just advance immediately if already closed).
3. **`src/styles/hud-widgets.css` & `src/ui/HudChromeRenderer.ts` / `src/ui/AltarShopHudUi.ts`**:
   - Add CSS rules scoped under `body[data-tutorial-active="true"]` (without breaking modal layouts) that dim non-essential HUD clusters (`pointer-events` already guarded, visually `opacity: 0.24; filter: grayscale(0.35); transition: opacity 200ms`) while exempting `.mam-tut-target-ring` and the tutorial overlay itself (`#tutorialOverlayLayer`) and currency counters.
   - Add `.mam-tut-nudge` keyframe animation (quick horizontal shake / scale pop) for `#tutorialArrow` and `.mam-tut-card` when a player clicks outside the target.
4. **`tests/hud-modules.test.ts`**:
   - Update `TutorialUi FTUE Overhaul` unit tests for the new step set (verifying no manual-close steps remain, Cargo Pod / Hold-to-Mine copy, stage metadata `1..5`, wrong-click nudge state, and auto-close callbacks / timer cancellation on `skip()`).

## Left to the Builder
- Exact CSS selectors used to identify non-essential HUD groups for dimming under `body[data-tutorial-active="true"]` (preferring existing data attributes / layout containers in `HudChromeRenderer.ts` & `AltarShopHudUi.ts` without changing normal post-tutorial appearance).
- Exact `setTimeout` duration (`~300–400ms`) for auto-closing the inspector/modals so the player sees the stat/loot feedback before transitioning.
