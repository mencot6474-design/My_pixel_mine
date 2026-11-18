# Mining Bounties / Contracts — Design Spec

**Date:** 2026-11-19
**Status:** Approved

## Intent & Why
Increase session length during the critical 10–30 minute window on CrazyGames by giving players 3 rotating, bite-sized goals that automatically refill when claimed and reward Gems, Enchant Dice, or Cash.

## Goals
- Pure domain module `src/game/BountiesDomain.ts` managing 3 active contracts (`BOUNTY_SLOT_COUNT = 3`) across 7 gameplay activities (`mine_ores`, `break_rare_ore`, `sell_ores`, `upgrade_chibi`, `roll_enchant_or_mut`, `clear_tower_wave`, `shatter_meteor`).
- Persist `bounties` and `bountiesCompleted` in `GameStateSave.ts` cleanly (backward-compatible with existing saves).
- Wire automatic progress hooks inside `GameState.ts` (`onOreBroken`, `onMeteorBroken`, selling ores, upgrading plot stats, rolling mutations/enchants, clearing tower waves).
- Add a quick **Bounties** button beside the Chest button in `GameHud.ts` (with live ready-count badge) and a compact Dark-Glass `BountiesModalUi` (`ModalKind = 'bounties'`, `autoHeight: true`).

## Constraints
- Pure domain logic with zero circular imports to `GameState.ts`.
- Strict TypeScript (no `any`), Vitest unit tests in `tests/state-modules.test.ts` & `tests/hud-modules.test.ts`.
- Verify with `npm.cmd test` and `npm.cmd run build`.
