# Tutorial FTUE Visual & Flow Overhaul — Design Spec

**Date:** 2026-11-19
**Status:** Approved

## Intent & Why
Maximize First-Time User Experience (FTUE) retention on CrazyGames by turning the tutorial into a crisp, high-energy Cyber-Anime RPG onboarding sequence (~45–60s) with zero filler dialogs, a 5-stage progress bar, a Skip option, target highlight rings, and a tangible Starter Bonus reward (+150 Gems & +1 Enchant Dice).

## Goals
- **Streamlined Flow**: Remove redundant filler `Next ▶` steps (`ready`, `ore-broken`, `chest-intro`, `go-shop-intro`, `shop-plaza-intro`) so every step drives immediate player action across 5 clear stages (`Mine`, `Upgrade`, `Collect`, `Sell`, `Reward`).
- **Cyber-Anime Visuals (`TutorialUi.ts` + `hud.css`)**:
  - Pop-out Chibi guide portrait (`public/chibi/astral-recruit/pose.webp`) with radial cyan halo and subtle float animation.
  - Layered Dark-Glass dialogue card with luminous top rail, skewed `ONEE // GUIDE` nameplate, 5-stage progress bar, and subtle `Skip` button.
  - Target highlight pulse ring (`.mam-tut-target-ring`) applied to the active `domSelector` element and always cleaned up on step change/completion.
- **Starter Bonus Reward**:
  - On `congrats`, render visual reward chips (**+150 Gems** & **+1 Enchant Dice**) and CTA `"Claim & Start Playing!"`.
  - Grant reward via `GameState.claimTutorialReward()` only on full completion (not on Skip), guarded against double-claim.

## Constraints
- Keep `TutorialUi` compatible with all existing `GameHud` notification hooks (`notifyOreBroken`, `notifyUpgraded`, `notifyChestTaken`, `notifySellOreSelected`, `notifySellCompleted`, `syncView`).
- Strict TypeScript (no `any`), Vitest tests in `tests/hud-modules.test.ts`, verify with `npm.cmd test` & `npm.cmd run build`.
