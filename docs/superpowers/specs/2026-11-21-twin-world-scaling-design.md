# Twin Tier Auto-Scaling by Latest World & Non-Sellable Protection — Design Spec

**Date:** 2026-11-21
**Status:** Approved

## Intent & Why
Keep the exclusive `twin` tier (`yukikage-twins` through `clockwork-twins` in the Premium Shop) automatically balanced at the endgame whenever new Worlds (`W9+`) are added to `WORLDS` and `WORLD_MINERS`, without manually editing `baseDps` or `upgradeCostScale`, and guarantee `twin` units can never be sold. The `fusion` tier remains static per recipe because each fusion is tied to its own world materials.

## Goals
- Derive `twin` `baseDps` automatically from the highest-DPS miner in the latest World (`WORLDS[WORLDS.length - 1]`) via clean multipliers (`2.3×`, `2.75×`, `3.2×`, `3.65×`, `4.1×`) with 2-significant-digit nice rounding (producing the exact current `10M / 12M / 14M / 16M / 18M` values at W8 `chrono-seraph = 4.4M`).
- Derive `twin` `upgradeCostScale` automatically from the latest World's upgrade cost scale via multipliers (`11×`, `14×`, `17.5×`, `21×`, `25×`, producing `220B..500B` at W8 `20B`).
- Add progressive `×30` fallback in `getWorldUpgradeCostScale(worldId)` for worlds added beyond W8 if `WORLD_UPGRADE_COST_SCALE` doesn't list them yet.
- Sync `CHIBI_CATALOG` `twin` entries automatically when `GameData.ts` initializes (zero circular imports), so all UIs, DPS calculations, Equip Best, and 3D miners read the scaled values seamlessly.
- Guarantee every `twin` Chibi (`rarity === 'twin'` as well as `isPremiumShopChibi`) is blocked from selling in `isNonSellableChibi`, `getSellableMinerCountDomain`, `sellMinerDomain`, and Sell Shop UI.

## Non-Goals
- No runtime scaling by player's `unlockedWorlds` progression (scaling is driven by content definitions in `WORLDS` / `WORLD_MINERS`).
- No changes to `fusion` or `limited` tier `baseDps` / `upgradeCostScale`.

## Approaches Considered
1. **Central World Anchor + Auto-Sync (Chosen):** Store multipliers on `PREMIUM_SHOP_ITEMS`, compute the latest-world anchor in `GameData.ts` using pure helpers, and sync `CHIBI_CATALOG` + `getChibiUpgradeCostMult` cleanly. Zero caller churn across UI/3D modules and no stale `.baseDps` reads.
2. **Separate Getter (`getEffectiveBaseDps`) at All Callers (Rejected):** Requires updating 10+ UI/3D/domain read sites and risks future callers reading raw `chibi.baseDps`.

## Constraints
- Strict TypeScript (no `any`), zero circular imports between `ChibiCatalog.ts`, `PremiumShopData.ts`, `DailyLoginData.ts`, `GameData.ts`, and `PlotUnitsDomain.ts`.
- Pure testable scaling helpers (`computeTwinScaledBaseDps`, `getLatestWorldScaleAnchor`, `getWorldUpgradeCostScale`, `syncTwinCatalogDps`) covered by Vitest unit tests in `tests/state-modules.test.ts` (including simulated `W9` cases and `twin` non-sellable checks).
- Verify with `npm.cmd test` and `npm.cmd run build`, plus update `GAME_MAP.md`.
