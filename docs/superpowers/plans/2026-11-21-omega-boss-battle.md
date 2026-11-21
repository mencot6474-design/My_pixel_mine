# Omega Tier & Dual Boss Battle Sanctum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the exclusive `omega` Chibi tier (`Crimson Ronin` & `Obsidian Sovereign` with all-3 core dopamine passives), make the two Shop Plaza floating octagonal pads interactive gateways (`omega-left` & `omega-right`), and implement the dedicated 3D **Omega Duel Sanctum** Boss Battle world with 5 Boss Tiers and escalating Core drop percentages.

**Architecture:**
- **Assets & Badges**: Slice `omega 1` & `omega 2` RGBA sheets into tight-cropped 300px-tall WebPs in `public/chibi/{crimson-ronin,obsidian-sovereign}/{idle,walk,attack,pose}.webp` and add `public/badges/omega.svg` + `.rarity-omega` / `.mam-omega-badge`.
- **Data & Domain (`src/game/`)**: Add `OmegaData.ts` (boss defs, 5-tier HP/Core drop % table, Omega Chibi auto-scaling & all-3 passives), `OmegaBossDomain.ts` (keys/regen, combat state, Parry/Pillar/Seal mechanics, Stagger `OMEGA BREAK!`, Core drop roll, Unlock & Awaken 1★→5★), wire into `GameData.ts`, `DailyLoginData.ts`, `PlotUnitsDomain.ts`, `GameMultipliersDomain.ts`, `IndexRewardsDomain.ts`, `GameStateSave.ts`, and `GameState.ts`.
- **3D Scene (`src/game3d/`)**: Add clickable Boss pads + hovering Boss sprites on `ShopCyberPlaza3D` / `ShopWorld3D`, build `OmegaArena3D.ts` (Crimson Dojo & Obsidian Throne variants, 5 player Chibis, 3D Boss sprite, clickable 3D Phantom Blades / Obsidian Pillars / Rune Seals, 5-layer `AttackImpactFxController`), and wire `SceneMode = 'omega'` into `MineScene3D.ts` & `MineSceneProjector.ts`.
- **UI & Audio (`src/ui/`, `src/styles/`)**: Build `OmegaBossModalUi.ts` (Boss Hub, Tier I–V drop-rate table, Unlock & Awaken Forge) and `OmegaArenaHudUi.ts` (Boss HP, Stagger `OMEGA BREAK!` gauge, Parry Ring / Target prompts, Victory/Defeat summary), wire `'omega'` tab in `IndexModalUi.ts` / `IndexInspectorUi.ts`, and add `omega` styling in `hud-rarity.css`.
- **Tests & Docs**: Add unit & integration tests in `tests/state-modules.test.ts`, `tests/hud-modules.test.ts`, and `tests/world-3d.test.ts`, run `npm.cmd test` + `npm.cmd run build`, and update `GAME_MAP.md`.

---

### Task 1: Slice Omega Sprite Assets & Create `omega.svg` Crest
- [ ] Slice `omega 1` (`crimson-ronin`) and `omega 2` (`obsidian-sovereign`) into `public/chibi/<id>/{idle,walk,attack,pose}.webp` (300px tall, tight RGBA crop, clean column-gap split).
- [ ] Create `public/badges/omega.svg` animated crest emblem.

### Task 2: Add `OmegaData.ts`, `ChibiRarity` `'omega'`, & Core Economy Wiring
- [ ] Extend `ChibiRarity` in `src/game3d/ChibiCatalog.ts` with `'omega'` and register `crimson-ronin` & `obsidian-sovereign`.
- [ ] Create `src/game/OmegaData.ts` with `OMEGA_BOSS_DEFS`, 5-tier definitions (`20% / 40% / 65% / 85% / 100%` Core drop rates, Core quantities, Boss HP, First-Clear Gems/Dice), `computeOmegaScaledBaseDps`, `computeOmegaUpgradeCostScale`, and `getActiveOmegaPassiveBonuses`.
- [ ] Wire `OmegaData` into `GameData.ts` (`syncSpecialCatalogDpsFromAnchor` / `syncTwinCatalogDpsFromAnchor`), `DailyLoginData.ts` (`isNonSellableChibi`), `PlotUnitsDomain.ts` (`getChibiUpgradeCostMult` + `teamDmgPct`), `GameMultipliersDomain.ts` (`oreSellPct` + `oreDropPct`), `IndexRewardsDomain.ts` (`'omega'` tab & 50%/100% milestones), and `GameStateSave.ts` (`omega` persistence).

### Task 3: Implement Pure `OmegaBossDomain.ts` & Wire into `GameState.ts`
- [ ] Create `src/game/OmegaBossDomain.ts` covering Key regeneration (`5` max, `15m` regen, consumed only on Victory, Gem refill), Boss Battle state (`startOmegaBossDomain`, `stepOmegaBossTickDomain`, `triggerOmegaParryDomain`, `hitOmegaArenaObjectDomain`, `finishOmegaBossDomain`), Stagger `OMEGA BREAK!` (`2.5×` Team DMG for `7s`), Core drop rolling, `unlockOmegaChibiDomain` (`5` Cores), and `awakenOmegaChibiDomain` (`1★→5★`).
- [ ] Expose clean delegators on `GameState.ts` (keeping `GameState.ts` `< 1,000` lines).

### Task 4: Build 3D Shop Plaza Boss Pads & `OmegaArena3D.ts` (`SceneMode = 'omega'`)
- [ ] Update `ShopWorld3D.ts` with `'omega-left'` (`x = -28.4, z = -2.2`) and `'omega-right'` (`x = +28.4, z = -2.2`) clickable stations, hovering Boss `ChibiSprite3D` figures, and `ShopStationAnchor` labels.
- [ ] Create `src/game3d/OmegaArena3D.ts` with themed `crimson` & `obsidian` duel sanctum, 5 player fighter slots, 3D Boss sprite, Parry Ring / Phantom Blades / Obsidian Pillars / Rune Seals clickable targets, and `.dispose()`.
- [ ] Wire `'omega'` mode into `MineScene3D.ts`, `MineSceneInput.ts`, and `MineSceneProjector.ts` (keeping all files `< 1,000` lines).

### Task 5: Build Omega Boss UI, Index Tab, & CSS Theme
- [ ] Add `.rarity-omega` & `.mam-omega-badge` in `src/styles/hud-rarity.css` + battle styling in `src/styles/hud-battle.css`, and wire `'omega'` in `HudShared.ts`, `IndexModalUi.ts`, & `IndexInspectorUi.ts`.
- [ ] Create `src/ui/OmegaBossModalUi.ts` (Boss Hub, Tier I–V selector w/ drop %, Unlock & Awaken panel) and `src/ui/OmegaArenaHudUi.ts` (Duel HUD, Boss HP, Stagger bar, Parry prompt, Result summary).
- [ ] Wire `GameHud.ts`, `HudActionRouter.ts`, `WorldOverlayHudUi.ts`, and `src/main.ts` (battle tick, sound effects, ad-safe pause, BGM `'tower'`/`'boss'` mode).

### Task 6: Add Comprehensive Tests, Verify Build, & Update `GAME_MAP.md`
- [ ] Add Vitest specs in `tests/state-modules.test.ts`, `tests/hud-modules.test.ts`, and `tests/world-3d.test.ts`.
- [ ] Run `npm.cmd test` and `npm.cmd run build` until 100% green, then update `GAME_MAP.md`.
