# Tutorial FTUE Clarity & Streamlining Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline the onboarding tutorial from 14 steps down to 11 action-focused English steps without manual-close steps, align terminology with the 3D Cargo Pod, add HUD spotlight dimming, and provide clear audio/visual feedback on blocked clicks.

**Architecture:** Refactor `TutorialUi` to drive an 11-step state machine (`exit-plot`, `close-chest`, `close-sell-shop` removed) with scheduled auto-close callbacks, multi-selector target highlighting, `document.body.dataset.tutorialActive`/`tutorialStep` synchronization, and throttled wrong-click nudges. Wire `GameHud` to handle auto-close transitions and `Select All` notifications safely, then layer `body[data-tutorial-active="true"]` dimming and `.mam-tut-nudge` keyframe feedback in `src/styles/hud-widgets.css`.

**Tech Stack:** TypeScript (strict, no `any`), Tailwind CSS v4 + custom CSS (`src/styles/hud-widgets.css`), Vitest (`tests/hud-modules.test.ts`), Vite.

**Spec:** [2026-11-24-tutorial-clarity-overhaul-design.md](file:///c:/Users/HDD/Documents/my_chibi_mine/docs/superpowers/specs/2026-11-24-tutorial-clarity-overhaul-design.md)

## Global Constraints
- Keep all tutorial copy in concise, natural English for the CrazyGames target audience and consistent with existing UI button labels (`Upgrade DMG`, `Take All`, `Plaza`, `Select All`, `Sell`).
- Preserve Starter Bonus amounts (`TUTORIAL_REWARD_GEMS = 150`, `TUTORIAL_REWARD_DICE = 1`), `localStorage` keys (`mam_tutorial_done_v1`, `mam_tutorial_rewarded_v1`), and post-tutorial Twin Trial unlock timing.
- Preserve existing 3D camera focus callbacks (`onSetPitZoom`, `onSetChestZoom`, `onSetSellShopZoom`) and `go-shop` copy substring `'Click Plaza at the top'` (verified by `tests/hud-modules.test.ts`).
- Strict TypeScript (no `any`); verify with `npm.cmd test` and `npm.cmd run build`.

## Review Focus
- **Pending auto-close timer after Skip or manual close**: If the player clicks `Skip` or manually clicks `×`/`Exit` during the `~350ms` auto-close delay after `Upgrade DMG`, `Take All`, or `Sell`, the timer must be cleared so it cannot later close a freshly opened panel or advance from `'done'`.
- **Sell `Select All` on empty or already-deselected state**: Clicking `[data-action="sell-select-all"]` during `select-ore-sell` toggles selection; if it deselects all items instead of selecting >= 1 item, `TutorialUi` must NOT advance to `click-sell-btn`.
- **Multi-selector `domSelector` matching & arrow highlighting**: `click-chest` (`#threeRoot` OR `[data-action="open-chest"]`), `click-sell-shop` (`[data-shop-station="sell"], [data-action="open-sell-shop"]`), and `select-ore-sell` (`[data-sell-key], [data-action="sell-select-all"]`) must allow clicks on any matching selector in `bindInputGuard` and safely resolve the first visible DOM match in `syncDomArrow`.
- **Wrong-click audio/nudge spam**: Rapidly clicking outside the target must throttle `audio.playSfx('ui-error', { volume: 0.35 })` (`>= 350ms`) and cleanly reset/restart the `~1.2s` `.mam-tut-nudge` hint timer without leaving stale hint text or classes after advancing steps.
- **`body.dataset.tutorialActive` / `tutorialStep` cleanup**: Completing, skipping, or unmounting during `'done'` must remove/clear `tutorialActive` and `tutorialStep` from `document.body.dataset` so normal HUD elements never stay dimmed.

---

### Task 1: Streamline `TutorialUi` 11-Step Flow, Auto-Close Timers, Multi-Selector & Wrong-Click Nudge

**Files:**
- Modify: `src/ui/TutorialUi.ts`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Produces:
  - `export type TutorialStep = 'welcome' | 'mine-ore' | 'click-plot' | 'upgrade-dmg' | 'click-chest' | 'take-all-chest' | 'go-shop' | 'click-sell-shop' | 'select-ore-sell' | 'click-sell-btn' | 'congrats' | 'done';`
  - `export const TUTORIAL_AUTO_CLOSE_DELAY_MS = 350;`
  - `export interface TutorialAutoCloseHooks { onClosePlotInspect?: () => void; onCloseModal?: () => void; }`
  - `TutorialUi` constructor:
    ```ts
    constructor(
      onSetPitZoom: (zoomed: boolean) => void,
      onSetChestZoom: (zoomed: boolean) => void,
      onSetSellShopZoom: (zoomed: boolean) => void,
      onComplete?: () => void,
      onClaimReward?: () => void,
      autoCloseHooks?: TutorialAutoCloseHooks
    )
    ```
  - `TutorialUi.prototype.handleBlockedInteraction(): void` (or triggered via `bindInputGuard` on blocked pointerdown/click)
  - `TutorialUi.prototype.notifyUpgraded(): void`, `notifyChestTaken(): void`, `notifySellCompleted(): void` schedule auto-close + transition (or advance immediately if modal/inspector already closed via `syncView`).

- [ ] **Step 1: Write failing tests in `tests/hud-modules.test.ts` covering the 11-step flow, copy updates, auto-close timer cancellation on `skip()`, and wrong-click nudge feedback**

Add/update assertions in `describe('TutorialUi FTUE Overhaul', ...)` in `tests/hud-modules.test.ts`:
```ts
    it('uses streamlined 11-step English copy without manual close steps, aligns Cargo Pod wording, and clears pending auto-close on skip', () => {
      expect(getTutorialStageMeta('mine-ore')).toEqual({ stage: 1, total: 5, label: 'Mine' });
      expect(getTutorialStageMeta('click-plot')).toEqual({ stage: 2, total: 5, label: 'Upgrade' });
      expect(getTutorialStageMeta('click-chest')).toEqual({ stage: 3, total: 5, label: 'Collect' });
      expect(getTutorialStageMeta('click-sell-shop')).toEqual({ stage: 4, total: 5, label: 'Sell' });

      const mineHtml = buildTutorialCardHtml('mine-ore');
      expect(mineHtml.toLowerCase()).toContain('tap or hold');

      const plotHtml = buildTutorialCardHtml('click-plot');
      expect(plotHtml.toLowerCase()).toContain('auto-mine');

      const chestHtml = buildTutorialCardHtml('click-chest');
      expect(chestHtml).toContain('Cargo Pod (Chest)');

      const selectSellHtml = buildTutorialCardHtml('select-ore-sell');
      expect(selectSellHtml).toContain('Select All');

      // Removed manual close steps should not exist in runtime TutorialUi copy
      // Verified via TutorialUi instance lifecycle with fake timers & DOM:
      // 1. Auto-close hook fires after TUTORIAL_AUTO_CLOSE_DELAY_MS on upgrade-dmg -> click-chest
      // 2. Calling skip() before timer fires cancels auto-close and clears body.dataset.tutorialActive
      // 3. Blocked click sets data-tutorial-nudge="true" and hint text "Follow the arrow!"
    });
```
Also write the concrete DOM lifecycle test inside the same `describe('TutorialUi FTUE Overhaul')` block using `vi.useFakeTimers()` + minimal mock `document` / `localStorage` if running in Node (check how existing `hud-modules.test.ts` tests DOM-free vs `window`/`document`). Wait: check the top of `tests/hud-modules.test.ts` first before assuming `document` exists in Vitest Node env!

- [ ] **Step 2: Run Vitest on the tutorial test to confirm it fails before editing `TutorialUi.ts`**

Run: `npx vitest run tests/hud-modules.test.ts -t "TutorialUi FTUE Overhaul"`
Expected: FAIL on missing `'Tap or Hold'` / `'Cargo Pod (Chest)'` / `TUTORIAL_AUTO_CLOSE_DELAY_MS` assertions.

- [ ] **Step 3: Update `src/ui/TutorialUi.ts` to implement the 11-step flow, copy, multi-selector arrow/guard, `body.dataset` sync, auto-close hooks, and wrong-click nudge**

Details to implement in `src/ui/TutorialUi.ts`:
1. Remove `'exit-plot'`, `'close-chest'`, `'close-sell-shop'` from `TutorialStep`.
2. Export `TUTORIAL_AUTO_CLOSE_DELAY_MS = 350` and `export interface TutorialAutoCloseHooks { onClosePlotInspect?: () => void; onCloseModal?: () => void; }`.
3. Update `DIALOG_COPY`:
   - `welcome`: `text: 'Mine glowing ores, collect loot from your Cargo Pod, and sell at the Plaza for Cash!'`, `cta: 'Start Mining!'`
   - `mine-ore`: `text: 'Tap or hold the glowing Ore in the pit until it shatters!'`, `hint: 'Tap or hold the center ore'`, `badge: 'TAP OR HOLD ORE'`
   - `click-plot`: `text: 'Nice! Your Chibi Onee auto-mines for you — click Plot #1 to boost her power!'`, `hint: 'Click Onee on Plot #1'`, `badge: 'PLOT #1'`
   - `upgrade-dmg`: `text: "Hit Upgrade DMG to boost Onee's mining power!"`, `hint: 'Click Upgrade DMG'`, `badge: 'UPGRADE DMG'`, `domSelector: '[data-inspect-action="up-dmg"]'`
   - `click-chest`: `text: 'Mined ores go into your Cargo Pod (Chest). Click the glowing Pod or Chest button to open it!'`, `hint: 'Click the Cargo Pod or Chest button'`, `badge: 'CARGO POD (CHEST)'`, `domSelector: '[data-action="open-chest"]'`, `allowCanvas: true`, `topCard: true`
   - `take-all-chest`: `text: 'Click Take All to move your mined ores into your Backpack!'`, `hint: 'Click Take All'`, `badge: 'TAKE ALL'`, `domSelector: '[data-action="chest-take-all"]'`, `topCard: true`
   - `go-shop`: `text: 'Time to get paid! Click Plaza at the top to visit Shop Plaza.'`, `hint: 'Click Plaza'`, `badge: 'PLAZA'`, `domSelector: '[data-action="shops-pill"]'`, `arrowPlacement: 'below'`
   - `click-sell-shop`: `text: 'Welcome to Shop Plaza! Click the Sell shop building or Sell button below.'`, `hint: 'Click Sell shop'`, `badge: 'SELL SHOP'`, `domSelector: '[data-shop-station="sell"], [data-action="open-sell-shop"]'`, `allowCanvas: true`, `topCard: true`
   - `select-ore-sell`: `text: 'Click an Ore card (or hit Select All) to mark ores for sale!'`, `hint: 'Select an Ore or click Select All'`, `badge: 'SELECT ORE'`, `domSelector: '[data-sell-key], [data-action="sell-select-all"]'`, `topCard: true`
   - `click-sell-btn`: `text: 'Now hit Sell to trade your ores for Cash!'`, `hint: 'Click Sell'`, `badge: 'SELL ORE'`, `domSelector: '[data-action="sell-selected"]'`, `topCard: true`
   - `congrats`: `text: 'Tutorial Complete! Claim your Starter Bonus to supercharge your mining empire!'`, `cta: 'Claim &amp; Start Playing!'`
4. Multi-selector handling in `syncDomArrow()` and `bindInputGuard()`:
   - Helper `findVisibleTarget(selector: string): HTMLElement | null` iterates `document.querySelectorAll<HTMLElement>(selector)` and returns the first element whose `getBoundingClientRect()` has `width > 0 && height > 0`.
   - In `click-chest`, `#tutorialArrow` stays anchored to `this.chestAnchorPos` on the 3D pod when `this.chestAnchorPos.visible` is true; otherwise falls back to `syncDomArrow()` on `[data-action="open-chest"]` (and always applies `.mam-tut-target-ring` to `[data-action="open-chest"]` if present!).
   - In `bindInputGuard()`: on `pointerdown` / `click` outside `copy.domSelector` (and outside `#threeRoot` when `copy.allowCanvas`), call `e.preventDefault()`, `e.stopPropagation()`, `e.stopImmediatePropagation()`, and invoke `triggerWrongClickNudge()` on `click` (or `pointerdown` if not followed immediately — throttle both SFX and nudge state by `>= 350ms`!).
5. `triggerWrongClickNudge()`:
   - Throttles `audio.playSfx('ui-error', { volume: 0.35 })` (`now - lastNudgeAtMs >= 350`).
   - Sets a `nudgeActive` flag / `data-tutorial-nudge="true"` on `.mam-tut-card` and `#tutorialArrow`, updates the hint element `[data-tutorial-hint="true"]` text to `"Follow the glowing arrow!"` for `1200ms`, then restores the step's normal `copy.hint` via a tracked `nudgeTimerId` (always cleared on `render()` / `complete()`).
6. Auto-close state transitions:
   - Track `pendingAdvanceTimer: number | null = null` and `pendingTransitionFrom: TutorialStep | null = null` (plus `clearPendingAdvance()` called in `complete()`, `skip()`, and before scheduling a new timer).
   - `notifyUpgraded()`: while `this.step === 'upgrade-dmg'`, schedule `TUTORIAL_AUTO_CLOSE_DELAY_MS` timer -> calls `this.autoCloseHooks?.onClosePlotInspect?.()`, advances to `'click-chest'`, calls `this.onSetChestZoom(true)`, and renders.
   - `notifyChestTaken()`: while `this.step === 'take-all-chest'`, schedule `TUTORIAL_AUTO_CLOSE_DELAY_MS` timer -> calls `this.autoCloseHooks?.onCloseModal?.()`, advances to `'go-shop'`, calls `this.onSetChestZoom(false)`, and renders.
   - `notifySellCompleted()`: while `this.step === 'click-sell-btn'`, schedule `TUTORIAL_AUTO_CLOSE_DELAY_MS` timer -> calls `this.autoCloseHooks?.onCloseModal?.()`, plays `'rare-fanfare'`, advances to `'congrats'`, and renders.
   - In `syncView(sceneMode, activeModal, inspectedSlot)`:
     - If `this.step === 'upgrade-dmg'` and `inspectedSlot === null`: if `pendingTransitionFrom === 'upgrade-dmg'`, cancel timer and advance immediately to `'click-chest'` (user closed manually right after upgrading); if not upgraded yet, stay/handle cleanly without breaking.
     - Same guard for `take-all-chest` when `activeModal === 'none'` and `pendingTransitionFrom === 'take-all-chest'`, and for `click-sell-btn` when `activeModal === 'none'` and `pendingTransitionFrom === 'click-sell-btn'`.
     - If `this.step === 'click-chest'` and `activeModal === 'chest'`, advance to `'take-all-chest'`.
     - If `this.step === 'go-shop'` and `sceneMode === 'shop'`, call `onSetSellShopZoom(true)` and advance to `'click-sell-shop'`.
     - If `this.step === 'click-sell-shop'` and `activeModal === 'sell-shop'`, call `onSetSellShopZoom(false)` and advance to `'select-ore-sell'`.
7. Sync `document.body.dataset.tutorialActive` (`'true'` when active, `delete document.body.dataset.tutorialActive` when `'done'`) and `document.body.dataset.tutorialStep` (`this.step` when active, `delete` when `'done'`) inside `render()` and `complete()`.

- [ ] **Step 4: Run Vitest on `tests/hud-modules.test.ts` to verify Task 1 passes**

Run: `npx vitest run tests/hud-modules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/ui/TutorialUi.ts tests/hud-modules.test.ts
git commit -m "feat(tutorial): streamline FTUE to 11 steps with auto-close and wrong-click nudge"
```

---

### Task 2: Wire `GameHud` Auto-Close Hooks & Sell `Select All` Detection

**Files:**
- Modify: `src/ui/GameHud.ts`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `TutorialAutoCloseHooks`, `TutorialUi` constructor from `src/ui/TutorialUi.ts`.
- Produces:
  - Pure helper `export function shouldAdvanceTutorialOnSellSelectAll(root: ParentNode): boolean` (or checked inside `GameHud` click capture after 20ms tick: checks whether `root.querySelectorAll('[data-sell-key].is-selected').length > 0`).

- [ ] **Step 1: Write failing test in `tests/hud-modules.test.ts` for `Select All` tutorial advancement logic**

Add a unit test verifying that:
- When Sell Shop cards are selected (`is-selected` present after click), tutorial advances from `select-ore-sell` to `click-sell-btn`.
- When `Select All` toggles back to deselected (no `.is-selected` cards), it does NOT advance.

- [ ] **Step 2: Run Vitest to confirm failure**

Run: `npx vitest run tests/hud-modules.test.ts -t "TutorialUi"`
Expected: FAIL

- [ ] **Step 3: Update `src/ui/GameHud.ts`**

1. Pass `autoCloseHooks` as the 6th argument to `new TutorialUi(...)` in `GameHud` constructor:
   ```ts
   {
     onClosePlotInspect: () => {
       if (this.inspectedSlot !== null) {
         this.openPlotInspector(null);
       }
     },
     onCloseModal: () => {
       if (this.activeModal !== 'none') {
         this.openModal('none');
       }
     },
   }
   ```
2. In the `this.root.addEventListener('click', ...)` capture handler (`GameHud.ts` lines ~342–359):
   - Add handling for `target.closest('[data-action="sell-select-all"]')`: inside the `window.setTimeout(..., 20)` callback, check `if (this.root.querySelectorAll('[data-sell-key].is-selected').length > 0)` before calling `this.tutorialUi.notifySellOreSelected()`.
   - Keep `up-dmg`, `chest-take-all`, `[data-sell-key]`, and `sell-selected` notifications intact.

- [ ] **Step 4: Run Vitest on `tests/hud-modules.test.ts` to verify Task 2 passes**

Run: `npx vitest run tests/hud-modules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/ui/GameHud.ts tests/hud-modules.test.ts
git commit -m "feat(hud): wire tutorial auto-close hooks and sell select-all detection"
```

---

### Task 3: Add Spotlight HUD Dimming & Nudge Animations in `hud-widgets.css` + Final Verification

**Files:**
- Modify: `src/styles/hud-widgets.css`
- Test: `tests/hud-modules.test.ts`

**Interfaces:**
- Consumes: `body[data-tutorial-active="true"]`, `body[data-tutorial-step="<step>"]`, `.mam-tut-target-ring`, `[data-tutorial-nudge="true"]` from `TutorialUi.ts`.

- [ ] **Step 1: Add CSS test check in `tests/hud-modules.test.ts`**

Read `src/styles/hud-widgets.css` (or verify via node `fs.readFileSync` test if appropriate, or keep CSS check in `hud-modules.test.ts`) to assert presence of `body[data-tutorial-active="true"]` dimming rules, step-specific target exemptions, and `@keyframes mamTutNudge`.

- [ ] **Step 2: Run Vitest to confirm test fails before CSS edit**

Run: `npx vitest run tests/hud-modules.test.ts -t "TutorialUi"`
Expected: FAIL on missing CSS selectors/keyframes.

- [ ] **Step 3: Update `src/styles/hud-widgets.css`**

Under `STICKER-POP FTUE TUTORIAL OVERLAY`:
1. Dim non-essential HUD clusters when `body[data-tutorial-active="true"]`:
   - Target `[data-hud-weather="true"]`, `[data-hud-dps="true"]`, `[data-hud-overclock="true"]`, `[data-active-pots="true"]`, `.mam-hotbar-dock`, `[data-action="open-worlds"]`, `[data-action="open-shop"]`, `[data-action="open-upgrades"]`, `[data-action="open-index"]`, `[data-action="open-daily-login"]`, `[data-action="open-bounties"]`, `[data-action="open-achievements"]`, `[data-action="open-chest"]`, `[data-action="shops-pill"]`, `[data-action="toggle-camera-lock"]`, `[data-action="open-settings"]`, `[data-action="toggle-audio"]`, `[data-action="gems-plus"]`, `[data-action="back-to-mine"]`, `[data-action="open-pickaxe-shop"]`, `[data-action="open-sell-shop"]`, `[data-action="open-relic-forge"]`, `[data-action="open-gem-shop"]`, `[data-action="open-enchant-altar"]`, `[data-action="open-gem-tower"]`, `[data-action="open-omega-boss"]`.
   - Apply `opacity: 0.24; filter: grayscale(0.35); transition: opacity 0.2s ease, filter 0.2s ease;`.
2. Exempt active tutorial targets so they shine brightly:
   - `body[data-tutorial-active="true"] .mam-tut-target-ring`,
   - `body[data-tutorial-step="click-chest"] [data-action="open-chest"]`,
   - `body[data-tutorial-step="go-shop"] [data-action="shops-pill"]`,
   - `body[data-tutorial-step="click-sell-shop"] [data-action="open-sell-shop"]`
   - Apply `opacity: 1 !important; filter: none !important;`.
3. Add `[data-tutorial-nudge="true"]` animation using `@keyframes mamTutNudge` (crisp horizontal shake on `.mam-tut-card` + scale pop on `#tutorialArrow`) and `[data-tutorial-hint="true"][data-nudge-hint="true"]` high-contrast `#dc2626` emphasis.

- [ ] **Step 4: Run full test suite & production build**

Run: `npm.cmd test`
Expected: All Vitest test suites pass (0 failures).

Run: `npm.cmd run build`
Expected: `tsc --noEmit && vite build` exits 0 with zero errors.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/styles/hud-widgets.css tests/hud-modules.test.ts
git commit -m "style(tutorial): add spotlight HUD dimmer and wrong-click nudge animation"
```

---

## Self-Review Checklist
1. **Spec coverage**:
   - 11-step streamlined English flow (no manual close steps): Task 1.
   - Cargo Pod (Chest) + Tap or Hold + Onee auto-mines copy: Task 1.
   - Auto-close Plot Inspector & Chest/Sell modals after `~350ms` + race guard: Tasks 1 & 2.
   - `Select All` support on `select-ore-sell`: Tasks 1 & 2.
   - Wrong-click audio/visual nudge: Tasks 1 & 3.
   - Spotlight HUD dimmer (`body[data-tutorial-active="true"]`): Tasks 1 & 3.
2. **Step scan**: Every step specifies exact files, signatures, selectors, and test/verification commands.
3. **Type consistency**: `TutorialStep`, `TUTORIAL_AUTO_CLOSE_DELAY_MS`, `TutorialAutoCloseHooks`, `data-tutorial-active`, `data-tutorial-step`, `data-tutorial-nudge`, and `data-tutorial-hint` match across all 3 tasks.
4. **Review Focus**: All 5 failure modes have explicit assertions or implementation guards in Tasks 1–3.
5. **Proportion**: Concise, task-focused, ~230 lines.
