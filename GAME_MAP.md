# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_chibi_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-20** after **Mine & Shop Plaza Floor Brightness + Battle Tower Raid HUD Polish (world-tinted cyber-slate floor textures `mixHex` in `ProceduralTextures3D.ts`, low-metalness deck/pit/plaza concrete & lifted mine/shop light floors in `MineScene3D.ts`, & top-left Exit + unified Cyber-Armor Raid Header + 2-zone Tactical Telemetry Bottom Dock in `TowerUi.ts`)**, **Playtime & QoL Update (Hold-to-Mine `stepHoldMineTimer` + continuous pickaxe swing + crackling SVG electric sparks, Random Pit Events `PitEventsDomain.ts` Golden Vein 5× & Crystal Surge 3× Fever+Gems, Bulk Upgrade `×1/×10/MAX` via `UpgradeBulkHelper.ts` in Plot Inspector & Research Tree, Auto-Roll Mutation `shouldStopAutoMutationRoll` w/ Frozen+ auto-stop, Plot Inspector & Index Modal layout polish, & 2× HiDPI enlarged Plot Nametags)**, **Career Achievements + Stats & Cyber-Anime Fever Cut-In Banner (`AchievementsDomain.ts` 8-category Tier I–V + `+1% All DMG`/tier + `AchievementsModalUi.ts` Medal Frames, & ZZZ-style slanted `OVERCLOCK FEVER!` cut-in banner + edge pulse FX)**, **Basic Launch Retention & Polish Pass (Index Completion Rewards 50%/100% milestones + Gems/Dice/permanent passives in `IndexRewardsDomain.ts`, Critical Tap 2.5× + Overclock synergy + micro camera shake + Cyber-Anime `CRIT` starburst SVG popup, & 3-Slot Team Loadouts with mini Chibi portraits in `TeamPresetsDomain.ts` + `InventoryModalUi.ts`)**, **Weather Sky & Tower Brightness Pass (brighter `WeatherData` sky/fog hexes across all 5 weathers, tower bg `0x101a30` + fog `0x182338` + `isTower` hemi/sun boost via `applyWeatherAtmosphere`)**, **Enchant Altar Rate Buff & Multi-Stat Enchant Buffs (`Thundering` `2%`..`Spellbound` `0.01%`, 4-stat `dmgMult`/`miningSpeedPct`/`oreDropPct`/`sellValuePct` + `getActiveEnchantBonuses`, & Enchant Buff Hover Inspector `buildEnchantHoverCardHtml`/`bindEnchantHoverInspector`)**, **Code Health Refactor (`IndexModalUi.ts`/`InventoryModalUi.ts`/`ChestModalUi.ts` split, Vite `manualChunks`, clean conditional Three.js material `map`s), Mobile Chest Backdrop Ghost-Click Guard (`shouldDismissModalBackdrop`) & Touch Threshold, Front-Facing Camera Lock + 2-Finger Pinch Zoom (`cameraLocked`, `applyCameraOrbitDrag`, `clampCameraZoomRadius`), Meteor HP Bar Plaque & Position Fix (`WorldOverlayHudUi.ts`), & Meteor HP -25% (`METEOR_HP_MULT = 375`) + Daily Login Limited Upgrade Cost Balance**, **Mining Performance Optimization (`AttackImpactFx3D`/`OrePit3D` mesh+material pooling, `WorldOverlayHudUi` `oreBarCache` + `translate3d`, `1024×1024` sun shadow map, & ~50% particle/shard reduction), Daily Login Responsive Scrollable Grid + Horizontal Day 7 Apex Card & Icon-Only Bounties Button**, **7-Day Limited Chibi Daily Login (`DailyLoginData.ts`, `DailyLoginDomain.ts`, `DailyLoginModalUi.ts`, exclusive `limited` tier + full-bleed `.rarity-limited`/`.rarity-fusion` & `.mam-limited-badge`, 7 Limited 5★ Chibis `Cosmic Monarch`/`Crimson Eye Sovereign`/`Crimson Gaze Maiden`/`Kasa Watcher`/`Prism Fracture Eye`/`Chrono Maiden`/`Ink Seraph`, non-sellable Limited & Fusion protection, & Index `★ Limited` tab)**, **3D Chibi Fusion World & Exclusive `fusion` Tier Overhaul**, **Cyber-Anime Battle Tower Raid HUD & Custom SVGs**, **Solid Cyber-Armor UI Overhaul, Tactical Hotbar 1–9 Dock, 2-Column Weather Forecast, Teleport Pill & 5-Layer Ore Hit/Shatter VFX Pass**, **CrazyGames Retention & Polish Pass**, **Research World Tree Symmetric Overhaul**, **Chibi Sprite & Name Overhaul & Relic Forge 12-Icon Cleanup**, **Mine/Plaza 3D Props, Cave Radar & Animated Conduits Overhaul**, **Tahap C `GameState.ts` Modularization**, **Tahap B `GameHud.ts` Modularization**, **Unified Chibi 3-Beat Attack Combo & Impact VFX Overhaul**, **Cyber-Industrial MineScene3D**, **Neo-Cyber City Plaza**, **Sculpted Non-Box `SeraphimBoss3D.ts`**, & **Ruined Cyber City Battle Tower**; re-measure with `Select-String` if files change.

## 1. ATURAN KERJA SINGKAT

1. **Verifikasi wajib setelah edit**: jalankan `npm.cmd test` (Vitest) dan `npm.cmd run build` (`tsc --noEmit && vite build`), plus smoke-test browser jika UI/3D berubah.
2. **UI Styling**: gunakan utility classes Tailwind CSS v4 (atau helper constants `TW_*` di `src/ui/HudShared.ts`). Tema UI menggunakan **Solid Cyber-Armor + Luminous Gradient Rails** (`data-modal-theme`, `.mam-modal`, `.mam-modal-rails`, `.mam-title-plaque`, `.mam-inspector-well`, `.mam-hotbar-dock`, `.mam-no-scrollbar`, `@media (forced-colors: active)`) yang tersimpan di `src/styles/hud.css` (seluruh frame modal, tombol, & panel HUD solid/non-transparan).
3. **Jaga kebersihan modul UI & State**: jangan tumbuhkan file UI/State di atas ~800–1.000 baris; pecah layar/modal atau domain state baru ke modul terpisah di `src/ui/` atau `src/game/` (tanpa circular import terhadap `GameState`) lalu delegasikan dari `GameHud.ts` / `GameState.ts`.
4. **Pure game logic & 3D invariants**: pertahankan pure helper (`applyNodeDamagePure`, `rollEnchantDef`, dll.) agar unit test Vitest (`tests/world-3d.test.ts`) tidak butuh WebGL/DOM penuh.
5. **Aset `.glb` & sprites (`public/`)**: jangan timpa/hapus model atau sprite tanpa permintaan eksplisit user.

---

## 2. PETA FILE (`my_chibi_mine`)

```
index.html                      Entry HTML (Vite root)
.gitignore                      Ignore `node_modules/`, `dist/`, `.vite/`, `_tmp/` (scratch scripts), local/OS files
.github/workflows/deploy.yml    GitHub Actions auto test, Vite build & deploy ke GitHub Pages (`main`)
package.json                    Dependencies: three, @types/three, @tailwindcss/vite, tailwindcss, typescript, vitest, @types/node
package-lock.json               NPM dependency lockfile
vite.config.ts                  Standalone Vite + Tailwind CSS v4 config (`base: './'`, `manualChunks` `three-vendor`/`game-3d`/`game-ui`)
tsconfig.json                   TypeScript strict config
GAME_MAP.md                     Peta struktur file & anchor (dokumen ini)
docs/superpowers/               Design specs & implementation plans (`specs/`, `plans/`)

=== AGENT RULES & SKILLS (`.agent/`) ===
.agent/rules/threejs-ts-standards.md        Aturan wajib `.ts`: strict TypeScript (no `any`), delta clamp `<= 0.1`, `THREE.Clock`/explicit `Timer`, `InstancedMesh`, `.dispose()`, `SRGBColorSpace`, & larangan Gyroscopic/Armillary tilted tumbling orbit rings
.agent/skills/crazygames-sdk-v3/SKILL.md    Standar lifecycle hooks SDK v3, pause/audio mute pada `adStarted`/`adFinished`/`adError`, & larangan external links
.agent/skills/ui-hud-design/SKILL.md        Standar Dark-Glass 1px, `tabular-nums`, viewport-first HUD, `pointer-events` discipline, & responsivitas iframe/desktop
.agent/skills/procedural-3d-assets/SKILL.md Standar seni & arsitektur 3D prosedural multi-part, larangan gyroscopic/armillary tumbling hoops, PBR material + emissive, pivot `y = 0`, `InstancedMesh`, & `.dispose()`

=== ENTRY & TESTS ===
src/main.ts                     299 baris — Bootstrap Three.js scene (`MineScene3D`), `GameState`, `GameHud` (+ plot drop, Fusion 3D ops & `setFusionRevealHold` camera lock, 3D label sync ops, `'limit'` toast,
                                            weather & CC0 `AudioManager` sync, `gameSettings` live sync, offline earnings boot modal, Overclock tap/sync, tutorial-guarded `spawnMeteorIfAllowed`), CrazyGames SDK init & ad-pause lifecycle, Tower callbacks & game loop
tests/hud-modules.test.ts         822 baris — 23 Vitest specs untuk modul UI Tahap B + `GameSettings`, `AudioManager` volume scaling, `SettingsModalUi`,
                                            `OfflineModalUi`, `BountiesModalUi`, `DailyLoginModalUi` layout, Overclock HUD + semantic toast banners, Tactical Hotbar (`mam-hotbar-keycap`/`mam-hotbar-bag`), & `TutorialUi` 5-stage FTUE
tests/state-modules.test.ts       689 baris — 17 Vitest specs untuk modul domain state (`GameStateSave`, `PlotUnitsDomain`,
                                            `TowerRunDomain`, `LootChestDomain`, `ShopWeatherDomain`, `OfflineEarningsDomain` + physical rock-break & gem caps, `BountiesDomain`, `OverclockDomain`, `FusionDomain` + 4 Passives & cost scaling, `DailyLoginDomain` + Limited/Fusion non-sellable protection)
tests/world-3d.test.ts        2.616 baris — 63 Vitest unit & integration specs (3D world, Altar dial/dice & 2.5D billboard pedestals,
                                            3D Fusion World Synchro Portal triple rings + ore crystal clusters + floating cosmic islands + hologram preview + NPC bubbles + 4-act `3.45s` cinematic fusion sequence & `getCameraFocusState`/`isRevealHolding`,
                                            Unified 3-beat `ChibiSprite3D` combo/afterimage/glint + 5-layer `AttackImpactFxController` (`spawnImpact` + `spawnShatter`) + `FieldMiner3D` & `TowerArena3D` accent/rainbow sync,
                                            Cyber-Industrial Mine (`MineEnvironment3D` + Drop Shaft + Plasma Refinery + Void sky clearance + `PlotPedestal3D.dispose`),
                                            Neo-Cyber City Plaza (`ShopCyberPlaza3D` roundabout shadow & trimmed lane clearance + `ShopWorld3D.dispose` + `WeatherFx3D`),
                                            Full 3D Sculpted Non-Box Seraphim Boss (`SeraphimBoss3D` + `TowerCityEnvironment3D` + `TowerArena3D.dispose`),
                                            procedural Chest Vault + Escalator & Cave Railway + hollow minecart, CrazyGames SDK v3 & ad-mute preservation,
                                            Equip Best stat preservation, Chibi/Enchant 1-per-unit plot exclusivity, pure ore damage, research trees
                                            incl. Core-only tap damage, +300K Core Vault Expansion, & W1-W6
                                            denseOreScale HP x10 / Drop x3, Gem Tower 10-wave 5-ore + Boss
                                            + 5s Boss Invulnerability + 5s Blessing Auto-Pick + strike-only damage + anti-one-hit boss cap
                                            + 5-floor milestones, Shop Plaza, Megacorp Mainframe Arena, background mining,
                                            hotbar drag reorder & hotbar-to-plot swap/equip, 5-Weather 5% Celestial buffs,
                                            Weather Meteor & Weather Limited Ores/Chibis, world/chibi-scaled upgrade costs,
                                            Frozen+ mutation roll protection, 46 chibis, Exotic/Secret tiers, buffed miner drops,
                                            World 6 Starwell, Chibi Star-Up, World Resonance synergy, & Relic Forge crafting/slots/buffs)

=== GAME DATA & STATE ===
src/game/GameData.ts            673 baris — World (`underground`..`starwell` W1-W6), `ORES` 117 (48 world + 5 `WEATHER_ORES` = 53 ores),
                                            `WORLD_MINERS` 266 (30 world miners: 5/world incl. Exotic & Secret + 5 `getWeatherLimitedMiners`),
                                            `PICKAXES` 312 (12 tiers W1–W6), `MUTATIONS` 327, `ENCHANTS` 341 (`ENCHANT_DICE_GEM_COST` 339, multi-stat `dmgMult`/`oreDropPct`/`sellValuePct`/`miningSpeedPct`),
                                            `isHighTierMutation` 403 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 413,
                                            `rollMutation` 529, `CHIBI_STAR_TIERS` 601, `WORLD_RESONANCE_TIERS` 629,
                                            `computeWorldResonances` 642, `rollWorldOre` 664, `rollWorldMiner` 669
src/game/RelicData.ts           289 baris — `MAX_EQUIPPED_RELICS` (3), `RELICS` (12 relics: 6 World, 3 Weather, 3 Tower; `5K`–`300K` Gems),
                                            `getRelicById`, `formatRelicEffects`
src/game/FusionData.ts          141 baris — `FUSION_RECIPES` (4 Synchro Fusion recipes: `Glitch Cheshire` `+150% Tap DMG`, `Thorn Maiden` `+150% Ore Drop`, `Monochrome Saint` `+200% Ore Sell`, `Prism Seraph` `+50% Team DMG` + balanced `upgradeCostScale`), `getFusionRecipeById`, `getFusionRecipeByResultChibiId`
src/game/FusionDomain.ts        154 baris — `getAvailableFusionMinerCount` (protects placed plot units), `getFusionOreCount` (bag+chest), `canFuseRecipeDomain`, `getReadyFusionCountDomain`, `fuseChibiRecipeDomain`, `getActiveFusionPassiveBonuses`
src/game/DailyLoginData.ts      101 baris — `DAILY_LOGIN_REWARDS` (7-Day Limited 5★ Chibis: `Cosmic Monarch`..`Ink Seraph` + balanced `upgradeCostScale`), `isNonSellableChibi` (Limited + Fusion), `getDailyLoginLimitedChibiIds`, `getDailyLoginRewardByChibiId`
src/game/DailyLoginDomain.ts    101 baris — `getLocalDateKey`, `getNextDailyLoginDayDomain`, `canClaimDailyLoginDomain`, `getDailyLoginSnapshotDomain`, `claimDailyLoginDomain` (grants 5★ full-star + hotbar auto-place)
src/game/IndexRewardsDomain.ts  238 baris — `INDEX_MILESTONES` (50%/100% per all 9 Index tabs: Gems/Dice + permanent `+5% Ore Sell`/`Ore Drop`/`All DMG`), `getIndexTabProgressDomain`, `getReadyIndexRewardCountDomain`, `claimIndexRewardDomain`, `getActiveIndexPassiveBonusesDomain`
src/game/TeamPresetsDomain.ts    83 baris — `TEAM_PRESET_COUNT` (3), `createEmptyTeamPresets`, `isTeamPresetPopulated`, `saveTeamPresetDomain`, `applyTeamPresetDomain` (stashes active plot units safely before swapping)
src/game/AchievementsDomain.ts  245 baris — `ACHIEVEMENT_CATEGORIES` (8 categories × Tier I–V = 40 tiers, `+1% All DMG`/tier), `CareerStats`, `getReadyAchievementCountDomain`, `claimAchievementTierDomain`, `getAchievementAllDmgBonusDomain`
src/game/ResearchData.ts        920 baris — `ResearchTreeId` (`core` | WorldId) 3, `DENSE_ORE_HP_MULT` (10) /
                                            `DENSE_ORE_DROP_MULT` (3) 19–20, `RESEARCH_TREE_META` 64,
                                            `formatNodeEffectLine` 130, `getNodeNextCost` 165, `CORE_NODES` 173
                                            (Strike I–VI balanced sole `tapDamageFlat`, Vault Expansion I–II `+300K`),
                                            `buildStandardWorldTree` 452 (symmetric 12-node / 58-pt blueprint W1–W6),
                                            `STARWELL_NODES` 857, `RESEARCH_NODES` 896
src/game/TowerData.ts           360 baris — `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (10m), `TOWER_WAVES_PER_FLOOR` (10),
                                            `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BOSS_INVUL_SEC` (5),
                                            `TOWER_CHECKPOINT_STEP` (5), `TOWER_ANOMALIES`, `TOWER_BLESSINGS`,
                                            `TOWER_MILESTONES` (per 5 floor: 5..50), `getTowerFloorDef`, `getTowerWaveDef`,
                                            `rollTowerWaveOres`, `getTowerCheckpoints`, `getTowerSweepGemReward`, `getGlobalGemGainBonus`
src/game/WeatherData.ts         187 baris — `WeatherId` (`light_rain` | `snow_rain` | `bloodmoon` | `void` | `celestial`) 1,
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (brightened sky/fog hexes; Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         1.132 baris — State coordinator + re-exports (`PlotUnitState`, `ResearchLevelsMap`, `SavePayload`, `OfflineEarningsSummary`, `BountyEntry`,
                                            `getChibiUpgradeCostMult`), `GameState`: public fields, `subscribe()`/`emit()`, Index/Discovery,
                                            Research trees & World unlock (`getActiveResearchBonus`), Global Multipliers (`denseOreScale`,
                                            potions, relics, Overclock 2x Tap / 1.5x Ore, active Fusion Passives, `getActiveEnchantBonuses`), Relic Forge, Chibi Fusion (`canFuseRecipe`, `fuseChibiRecipe`, `getActiveFusionPassives`), Daily Login (`canClaimDailyLogin`, `claimDailyLogin`, `getDailyLoginSnapshot`),
                                            Enchant Dice roll, `grantAdGems`, `grantTutorialStarterReward`, serta delegasi ke modul domain di bawah
src/game/GameStateSave.ts       514 baris — `SAVE_KEY` 16, `ResearchLevelsMap`, `PlotUnitState`, `SavePayload` (+ `lastSavedAt`, `bounties`, `bountiesCompleted`, `dailyLoginLastClaimDate`, `dailyLoginClaimedDays`), `SaveableGameState`,
                                            `migrateOreId`, `isValidIndexId` (World + Weather + Fusion), `createEmptyResearchLevels`, `compactHotbarSlots`,
                                            `serializeSavePayload`, `deserializeSaveJson` (migrasi legacy, sanitasi overflow cash/gems/levels, refund excess pickaxes, resync `discovered` incl. `chibiStars`/`stashedUnits`),
                                            `saveToLocalStorage`, `loadFromLocalStorage`
src/game/PlotUnitsDomain.ts     738 baris — `PlotUnitsContext` 58, `getChibiUpgradeCostMult` 99 (incl. balanced Fusion & Daily Login Limited scales), `createFreshPlotUnit`, `getChibiStarCount`,
                                            `starUpUnit`, `autoStarUpAllUnits`, `getActiveWorldResonancesList`, `getActiveEnchantBonuses`, `computePlotUnitStats` (+ Fusion `teamDmgPct` & Enchant `miningSpeedPct`),
                                            `computeTotalPlotDps`, `computeDpsBreakdown`, `trimStashedUnits`, `equipChibiOnPlotSlot` (`'limit'`),
                                            slot upgrade/pickaxe/mutation (`rollUnitMutation`), 1-per-unit Enchant (`toggleUnitEnchant`), `equipBestUnitsToPlots`
src/game/TowerRunDomain.ts      507 baris — `TowerRunMeta` 25, `TowerRunContext` 30, `syncTowerKeysDomain` 71, `getTowerEffectiveDpsDomain` 130,
                                            `startTowerRunDomain` 177, `finishTowerRunDomain` 294, `chooseTowerBlessingDomain` 319,
                                            `stepTowerTickDomain` 336 (5s Blessing Auto-Pick + timeout), `applyTowerTargetDamageDomain` 375
                                            (Wave 10 Boss 5s invul, anti-one-hit cap, milestones, dice/ore rewards), `quickSweepTowerDomain` 462
src/game/LootChestDomain.ts     461 baris — `LootChestContext` 20, `getChestItemCountDomain` 59, Hotbar 1..9 (`swapHotbarSlotsDomain` 87,
                                            `removeFromHotbarDomain` 124, `toggleHotbarItemDomain` 138), ore lock/auto-sell (`shouldAutoSellOreDomain` 182),
                                            `onOreBrokenDomain` 223, `onMeteorBrokenDomain` 277, `takeAllFromChestDomain` 378,
                                            `isChestFullBonusReadyDomain` 406, `sellAllChestOresDomain` 434 (+35% Full-Chest), `toggleAutoSellDomain` 448
src/game/ShopWeatherDomain.ts   392 baris — `ShopWeatherContext` 23, `sellOreDomain` 73, `sellAllOresDomain` 88, `sellMinerDomain` 147 (protects `isNonSellableChibi` Limited + Fusion),
                                            pickaxe stock (`refreshPickaxeStockIfDueDomain` 162, `buyPickaxeDomain` 185), `sellBatchDomain` 232,
                                            gem shop & potions (`buyGemShopItemDomain` 264, `useGemPotionDomain` 278, `isBoostActiveDomain` 306),
                                            weather & relic scaling (`scaleWeatherMultDomain` 328, `syncWeatherDomain` 372, `forceWeatherDomain` 384)
src/game/OfflineEarningsDomain.ts 169 baris — `OFFLINE_MIN_SEC` (2m), `OFFLINE_MAX_SEC` (8h), `OFFLINE_EFFICIENCY` (0.5), `MAX_OFFLINE_ORES_PER_SEC` (3.5), `MAX_OFFLINE_GEMS` (15K), `formatOfflineDuration`,
                                            `computeOfflineEarningsDomain`, `claimOfflineEarningsDomain` (1x/2x + chest cap)
src/game/BountiesDomain.ts      250 baris — `BOUNTY_SLOT_COUNT` (3), `BountyKind` (7 aktivitas), `generateBountyEntry`, `ensureBountiesPopulatedDomain`,
                                            `recordBountyProgressDomain`, `getReadyBountyCountDomain`, `claimBountyDomain`
src/game/OverclockDomain.ts     107 baris — `OVERCLOCK_DURATION_SEC` (15s), `OVERCLOCK_SPEED_MULT` (2x), `OVERCLOCK_DROP_MULT` (1.5x),
                                            `chargeOverclockDomain` (auto-activate at 100%), `stepOverclockDomain`, `getOverclockSnapshotDomain`
src/game/PitEventsDomain.ts      52 baris — `PIT_EVENT_DEFS` (`golden_vein` 5× Ore Drops, `crystal_surge` 3× Fever + world-scaled Bonus Gems), `rollNextPitEventCooldownSec`, `rollPitEventKind`, `computePitEventBonusGems`
src/game/UpgradeBulkHelper.ts    45 baris — `UpgradeBuyMode` (`'1'|'10'|'max'`), `getPlotStatUpgradeCost`, `computeBulkUpgradePlan` (shared by Plot Inspector & Research Tree)
src/game/AssetUrl.ts             11 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/GameSettings.ts        150 baris — `GameSettings` (`mam_settings_v1`, incl. `cameraLocked`), `GRAPHICS_PRESETS` (`low`/`medium`/`high`), `normalizeGameSettings`, `gameSettings`
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       623 baris — Web Audio SFX pool + synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`,
                                            `playEnchantEquip`) & HTMLAudio BGM switcher (`audio`, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence, `setBgmVolumeScale` / `setSfxVolumeScale`, `setAdMuted` & `isEffectivelyMuted`)
src/sdk/crazygames.ts           259 baris — CrazyGames SDK v3 wrapper (`isAdPlaying`, `cgInit` uninitialized-domain guard, `cgBindAdLifecycle`, `isCrazyGamesEnv`,
                                            `cgLoadingStart`, `cgGameplayStart`, `cgHappyTime`, `cgRequestRewardedAd`, `cgTryMidgameAd`)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             1.157 baris — `GameHud`: Thin UI coordinator (`activeModal` incl. `altar-hub`/`daily-login`, `sceneMode` incl. `fusion`, `inspectedSlot`, `adPaused`, viewport scaling `updateViewportScale` + `hudPotsAbove` `< 1080`,
                                            top `Shops` + `Overclock Fever (224px)` + `Teleport` (`TW_TELEPORT_PILL` + Warp Portal icon + `1`–`6` world badge), solid currency rail w/ inline DPS above Gems + Camera Lock (`toggle-camera-lock`), Settings gear & audio mute toggle + Daily Login & icon-only Bounties quick btns w/ live badges, World Resonance HUD badges, modal router `renderActiveModal`, semantic toast stack,
                                            1000ms/100ms timers + Overclock live sync, `isTutorialActive`, `handleTower*` dispatch & public pass-through API incl. `setFusionRevealHold` untuk `main.ts`)
src/ui/HudShared.ts             588 baris — `chibiPortraitHtml`, shared types (`ModalKind` incl. `settings`/`offline`/`bounties`/`daily-login`/`altar-hub`, `ModalThemeId`, `InvTab`, `PlotDropOps`),
                                            rarity/ring/timer/scroll helpers (`rarityCardClasses` incl. `rarity-fusion`/`rarity-limited`, `renderRarityBadgeHtml`, `rarityVars`, `applyInspectRing`, `classifyToast`, `renderToastBannerHtml`,
                                            `formatCountdownTimer`, `refreshPotionTimersInDom`, `captureRootScrolls`, `restoreRootScrolls`),
                                            solid cyber-armor Tailwind `TW_*` constants (`TW_TELEPORT_PILL`, `mam-notif-badge`), shared shell builders (`renderModalShell` w/ `autoHeight`, `shouldDismissModalBackdrop`, `renderInspectorPanel`, `buildEnchantHoverCardHtml`, `bindEnchantHoverInspector`)
src/ui/WeatherDpsHudUi.ts       616 baris — `WeatherDpsHudUi`: Solid top-left Weather widget + 2-column side-by-side Weather Forecast & Meteor Drops inspector + Auto Meteor toggle, bottom-right compact `62px` icon+timer Active Potions dock,
                                            inline DPS pill above Gems w/ left-opening `214px` Damage Breakdown popover, & top-center `224px` uniform-height Overclock Fever dock w/ smooth in-place transition (`formatWeatherTimer`, `buildActivePotionsDockContent`,
                                            `buildWeatherWidgetInnerHtml`, `buildDpsMeterInnerHtml`, `buildOverclockGaugeInnerHtml`)
src/ui/HotbarHudUi.ts           422 baris — `HotbarHudUi`: Solid Cyber-Anime Tactical Hotbar Dock (`.mam-hotbar-dock`, slots 1–9 w/ `.mam-hotbar-keycap`, `.mam-hotbar-qty`, `.mam-hotbar-val-bar`, `.is-hotbar-selected`, `.mam-hotbar-divider`, & `.mam-hotbar-bag`),
                                            outside-click selection clear, & pointer drag-and-drop reorder / plot swap (`buildHotbarStateKey`, `canDropHotbarOnPlot`, `renderHotbarSlotsHtml`)
src/ui/AltarShopHudUi.ts        452 baris — `AltarShopHudUi`: Shop Plaza dock HUD (`renderShopWorldHudHtml`), Enchant Altar HUD (`renderAltarStripCardsHtml` + Enchant Buff Hover Inspector & quick `Chibi Fusion` switch),
                                            roll/auto-roll timer controller (`triggerSingleEnchantRoll`), & live counters
src/ui/FusionHudUi.ts           455 baris — `FusionHudUi`: Plaza `Altar Gateway` choice popup (`renderAltarChoiceModal`: Enchant Altar vs Chibi Fusion) & 3D Fusion World HUD (`renderFusionWorldHud`: 4 recipe cards, passive pills, unplaced miner/ore/gem ingredient chips, live 3D readiness sync, 4-act `3.45s` `FUSE CHIBI` trigger + multi-beat SFX choreography + cinematic progress banner, `"✦ SYNCHRO FUSION COMPLETE! ✦"` Prismatic Gacha Reveal Overlay Card (`renderRevealOverlayHtml`) + `dismiss-fusion-reveal` camera release, & quick `Enchant Altar` switch)
src/ui/WorldOverlayHudUi.ts     557 baris — `WorldOverlayHudUi`: 5 floating `document.body` overlay layers (`plotOverlayLayer`, `oreBarLayer`, `dmgPopupLayer`,
                                            `shopOverlayLayer`, `shopBubbleLayer`), `oreBarCache` + `translate3d` Mine/Tower segmented solid ore HP bars, `showDamagePopups`-gated damage popups, Shop station badges & Plaza/Fusion NPC speech bubbles,
                                            Altar anchor pills, & 3D plot nametag sync (`buildPlotLabelPayload`, `buildMineOreBarsHtml`, `buildTowerOreBarsHtml`)
src/ui/IndexModalUi.ts          616 baris — `IndexModalUi` 40: Index modal (6 worlds + Weather + `✦ Fusion` + `★ Limited` tabs + Inspector + Chibi 4-pose `Review` `<dialog>`) & live updaters
src/ui/InventoryModalUi.ts      518 baris — `InventoryModalUi` 31: Backpack/Inventory modal (Equip Best / Auto Star-Up / Star-Up Miner / Search / Inspect) & live updaters
src/ui/ChestModalUi.ts          234 baris — `ChestModalUi` 16: Loot Chest modal (Auto-Sell rarity pills, Ore lock, capacity bar, Take All / Sell Ores +35%) & live updaters
src/ui/ForgeModalUi.ts          452 baris — `ForgeModalUi` 45: Relic Forge Dark-Glass modal (`renderForgeModal`: 3 equipped slots, All/World/Weather/Tower tabs,
                                            12-relic grid, `renderForgeInspector`, `?` Ore Source Pop-up `renderOreSourcePopup`, `handleAction`, & `bindEvents`)
src/ui/SettingsModalUi.ts       194 baris — `SettingsModalUi`: Dark-Glass Settings modal (`autoHeight`, Graphics Quality `Low`/`Medium`/`High`, BGM/SFX volume sliders, Mute All, Damage Popups toggle)
src/ui/OfflineModalUi.ts        147 baris — `OfflineModalUi`: Dark-Glass Welcome Back modal (offline duration, compact/truncated Cash/Gems/Ores summary, Claim & `CG_ADS_ENABLED`-gated 2x Ad Claim)
src/ui/BountiesModalUi.ts       115 baris — `BountiesModalUi`: Dark-Glass Mining Bounties modal (3 rotating contracts, progress bars, Claim & auto-refill)
src/ui/AchievementsModalUi.ts   232 baris — `AchievementsModalUi`: 2-tab Achievements (Tier I–V Bronze..Prismatic Medal Frames over 2D WebP art) & Career Stats modal
src/ui/DailyLoginModalUi.ts     152 baris — `DailyLoginModalUi`: Cosmic-Gold 7-Day Daily Login modal (scrollable Day 1–7 Limited 5★ Chibi cards + horizontal `DAY 7 • APEX FINALE` card, `★★★★★` + `✦ LIMITED` badges, pinned `shrink-0` 1x/day Claim CTA)
src/ui/ShopModalsUi.ts          653 baris — `ShopModalsUi` 43: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               647 baris — `TowerUi` 55: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 80:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            Solid Cyber-Anime Raid Battle HUD (`renderTowerArenaHud`: top-left `.mam-battle-exit-btn`, unified top-center `.mam-battle-hp-card` 10-tick animated HP bar + telemetry strip, 2-zone `.mam-battle-dock` `.mam-battle-stat-cell`, custom Pickaxe/Shield/Bolt/Timer SVGs, 5s Boss Invul shield, 5s Blessing auto-pick)
src/ui/TutorialUi.ts            659 baris — `TutorialUi`: Cyber-Anime 5-stage responsive click-through FTUE (`pose.webp` pop-out, opposite-side placement, `--mam-float-scale`, progress bar, `Skip`, `.mam-tut-target-ring`, `?tutorial=1`, Starter Bonus +150 Gems & +1 Dice)
src/ui/UpgradesWorldsUi.ts      636 baris — `UpgradesWorldsUi` 17: Research/Upgrades tree (opaque Dark-Glass nodes w/ world glow, edge-trimmed SVG lines & `.webp` icons) & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 319 pakai `public/worlds/*.webp`, synced Warp Portal title icon) & live updaters
src/ui/PlotInspectUi.ts         451 baris — `PlotInspectUi` 31: Plot Inspector overlay (incl. ★Star, `✦ FUSION` / `✦ LIMITED` badge + Fusion Passive, World Resonance, Enchant Buff Hover Inspector & per-unit Enchant `In Use`/`Equipped` status), live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              314 baris — SVG, 2D fantasy art (`public/{enchants,hud,meteors,ores,pickaxes,potions,research,weathers}/*.webp`), & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml` 305)
src/styles/global.css            73 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset + pickaxe cursor styles
src/styles/hud.css            2.399 baris — Solid Cyber-Armor + Luminous Gradient Rail system (`[data-modal-theme]` 14 opaque themes incl. `forge`/`settings`/`offline`/`bounties`/`daily-login`,
                                            `.mam-modal`, `.mam-modal-rails`, sculpted `.mam-title-plaque`, full-bleed `.rarity-fusion` / `.rarity-limited` + `.mam-fusion-badge` + `.mam-limited-badge` + `.mam-fusion-text`, `dialog.mam-review-dialog`, `.mam-grid`, `.mam-no-scrollbar`, `.mam-chibi-smooth`,
                                            `.mam-hotbar-dock`/`-slot`/`-keycap`/`-qty`/`-val-bar`/`-bag`, `.mam-battle-hp-*`/`.mam-battle-dock` Raid HUD, `.mam-fever-*` Overclock Gauge, `.mam-dps-*` Breakdown dock, `.mam-toast-banner`, `.mam-notif-badge`, `.mam-tut-*` FTUE card & target ring, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts     1.500 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `fusion` / `tower`, `SRGBColorSpace` renderer (`1024×1024` sun shadow map),
                                            `setCameraLocked` / `applyCameraOrbitDrag` / `clampCameraZoomRadius` + 2-finger touch pinch zoom, cyber-holographic rear `"My Chibi"` stage (`2.44m` pedestal pitch, steel bay dividers, rear busbar & illuminated cyber stairwell), procedural Cyber Loot Chest on Refinery Dais,
                                            `setGraphicsQuality` (`low`/`medium`/`high`), `setOverclockActive` (2x miner speed + amber-gold overdrive lights), `syncFusionRecipe`/`triggerFusionAnimation`/`setFusionRevealHold` + dynamic Fusion cinematic camera zoom & NPC bubble gating, `setAdPaused` pause/resume, background pit/miner ticks, pit-floor click auto-target, Tower strike FX pass-through,
                                            weather sky/fog/safe-zone shop lighting + tower night lift (`setWeather`, `applyWeatherAtmosphere` w/ `isTower` hemi/sun boost), syncs 3D pedestal labels (`syncPlotLabel`) & plot/station/tower-ore anchors, & `destroy()` (`pedestals`, `pit`, `shopWorld`, `fusionWorld`, `towerArena`, `weatherFx.dispose`)
src/game3d/MineEnvironment3D.ts 654 baris — Dark basalt / cyber-industrial deck terrain + thin perimeter neon trims (`skyHandle`, `setWeatherSky`),
                                            elevated gunmetal & cyan Holo-Display `"My Chibi Minerr"` Gantry + monolith split-prong finials, `CyberProps3D` armored lantern bollards, `20` GPU bokeh mana motes (`dustMat` ShaderMaterial), lateral distant city support pillars & socket-anchored catenary cables with animated energy flow pulses
                                            (unobstructed Void black-hole sky window), integrates `CaveRailway3D` (left) & `ChestVaultStation3D` (right), & `dispose()`
src/game3d/CaveRailway3D.ts     905 baris — Left-wing Futuristic Cyber Mine Elevator / Drop Shaft tower (`createCaveRailway` 321) with hollow open shaft well & vertical lift cage,
                                            cool steel-blue turret crown + hard-surface rotating Cyber Radar Array (`createCyberRadarArray`) + twin comms whip rods + Track-Centered Chamfered Cyan Energy Portal Arch, non-overlapping maglev guideway (`InstancedMesh`), & 1 Cyber Ore Pod shuttle
src/game3d/ChestVaultStation3D.ts 1.027 baris — Right-wing Plasma Ore Refinery (`createChestVaultStation` 470: cyclotron smelter drum placed cleanly on right terrace, single precision-socketed plasma conduit w/ animated energy flow pulses, armored lantern bollard pylons & neon escalator `InstancedMesh` cleats)
                                            & stylized Loot Chest (`createProceduralTreasureChest` 188, `disposeObject3D` 53)
src/game3d/CyberProps3D.ts      490 baris — Reusable architectural low-poly sci-fi 3D props (`createCyberRadarArray` 131, `createCyberLanternBollardFinial` 298,
                                            `createCyberMonolithForkFinial` 346, `createCyberCrystalCluster` 388, `createCyberBotanicalCanopy` 447, `disposeCyberProp` 41) — zero floating hoops/plain diamonds
src/game3d/WeatherSkyShader.ts  237 baris — Animated GLSL Atmospheric Sky Shader (`createWeatherSkyMaterial` 184:
                                            sky gradient, layered FBM clouds, stars/nebula, Bloodmoon & Celestial moons)
src/game3d/WeatherFx3D.ts       254 baris — `WeatherFx3D` 74: 3D weather particles (rain/snow/embers/void/starfall)
                                            with `setShopMode()` safe-zone boost (`fog: false`), `setQualityScale()` (`low`/`medium`/`high`), radial/streak canvas textures & `dispose()`
src/game3d/MineWorldPalette.ts  113 baris — `WORLD_PALETTES` 25 (6 worlds incl. `starwell`), `ORE_VARIANTS` 99, `rollOreVariant` 105
src/game3d/OrePit3D.ts         1.395 baris — Dark basalt pit floor, basalt retaining walls + diagonal yellow/black hazard stripe collar + thin neon rim + armored lantern corner bollards (`METEOR_HP_MULT` 375, `computeMeteorDynamicHp`),
                                            2.5D-grounded `OreBillboard2D` (3D basalt rubble + crystal collar skirt, horizontal hit recoil, cracked crater AO socket decal, feathered Geode glow seams, Weather Meteor crater impact),
                                            pooled bouncing 3D crystal prism + basalt rock shards (`spawnShardsAt` / `shardFreeCrystal` / `shardFreeRock`, `maxCap 36`), 5-layer `AttackImpactFxController` (`hitNode` + `spawnShatter` on break, `getImpactFxCounts`), `getAliveNodesInfo`, `applyNodeDamagePure` 47, & `dispose()`
src/game3d/AttackImpactFx3D.ts  664 baris — Shared 5-layer cyber-anime impact & shatter VFX pool (`AttackImpactFxController` 88: per-layer free-list mesh/material pooling `acquireMesh`/`clearFreeList`, directional dual-pass slash arc, 4-point anime hitspark star / 8-point shatter nova, directional & 360° radial spark streaks, single/twin ground shockwave rings, rising luminescent crystal motes, `spawnImpact` + `spawnShatter`, oldest-recycling caps & `dispose()`)
src/game3d/PlotPedestal3D.ts  1.252 baris — ZZZ/HSR Cyber-Showcase Plot Podiums (chamfered dock bay w/ cooling fins, edge-lit seam strip, titanium dais, front `01..05` numeric apron plaque, waist-high rear projector stanchions, dual-shell outward-flaring thick Anime-RPG Aura + `17` GPU star embers/streak wisps via shared `createAnimeParticlePoints`, world-space nametag sejajar di `y = 2.68m`) & `dispose()`
src/game3d/FieldMiner3D.ts      344 baris — Active chibi miner placement & shared `ChibiFieldFxController` (calm RPG feathered ground halo + Enchant ground sigil, live `def.accentColor`/Enchant/Rainbow sync, `12` rising GPU particles via `createAnimeParticlePoints`, tanpa aura shell vertikal), 3-beat swing/background mining tick & `dispose()`
src/game3d/ChibiCatalog.ts      589 baris — `LEFT_FACING_WALK_IDS` 37, `LEFT_FACING_ATTACK_IDS` 46, `CHIBI_CATALOG` 64 (46 chibi poses WebP: 30 world + 5 weather-limited + 4 `fusion` + 7 `limited` Daily Login exclusives, `ChibiRarity` `common`..`limited`,
                                            baseDps, `smoothFilter` W1–W6, world roster, `getChibiFrameUvOffset`)
src/game3d/FusionWorld3D.ts   2.066 baris — 3D Outer-Space Cyber-Synchro Fusion World (`FusionWorld3D`: expanded 23m octagonal cyber arena deck w/ Cyan & Magenta neon floor trims + 17.2m magic circuit sigil (`polygonOffset` anti-Z-fight) + elevated rear Cyber-Holographic Showcase Stage (`z = -2.45`) & 4-step illuminated stairs + 4 corner tech/crystal pylons + 2 entrance lantern bollards,
                                            ZZZ/HSR Cyber-Showcase Podiums (`01`..`03` & `APEX` w/ chamfered dock bay, cooling louvers, front plaque, rear projector stanchions, frosted holo lens, Dual-Shell Anime-RPG Aura & GPU star-ember wisps),
                                            Front Crescent Arc 2–3 material podiums (`[-5.35, 1.05]`, `[0, 3.45]`, `[5.35, 1.05]`) + HSR/ZZZ/Stargate "Astral Quantum Synchro Gate" (`z = -6.85`: recessed magnetic levitation dock, outer flanking Gantry Yoke Towers at `x = ±4.65m`, 3 counter-rotating sculpted chrono/astrolabe rings, & swirling quantum vortex core) + grooved floor energy conduits w/ dynamic dormant-crimson vs ready-cyan/gold pulse,
                                            4 physical recipe Ore Crystal Clusters + 8 floating cosmic islands + skyward Light Beam, 2 Alchemist/Scientist NPCs w/ holo-consoles & speech bubbles, blue hologram preview for unplaced material units, consistent `'idle'` chibi pose state, 4-Act `3.45s` cinematic fusion sequence (levitation -> portal singularity implosion + supernova -> central descent + dual 5-layer `AttackImpactFxController.spawnShatter` landing -> `revealHold` camera zoom lock via `getCameraFocusState`/`setRevealHold`) & `dispose()`)
src/game3d/ChibiSprite3D.ts     592 baris — Animated 2D-in-3D upright billboard sprite (3-beat combo `triggerAttack`, 2 tinted ghost afterimages, wind-up glint, `setAccentColor`, `setHologramMode`, `smoothFilter` sharp `LinearFilter` w/o mipmap blur vs nearest, camera-pitch tilt, normalized pose sizing, alpha-clipped directional shadow + soft AO contact shadow, & `dispose()`)
src/game3d/ShopCyberPlaza3D.ts 1.764 baris — Procedural "Neo-Cyber City Plaza" 3D Lobby (`createShopCyberPlaza` 254):
                                            open sky Gem Tower skyscraper + access terminals, circular roundabout curb + thin neon trim + radial contact shadow (`createRoundaboutShadowTexture`) + Neon Crystal Cluster Fountain (`createCyberCrystalCluster`),
                                            4 high-clearance container kiosks (Pickaxes, Sell, centered 2-story Gem Shop `'CYBER GEM MART'`, Plasma Relic Forge, `createShopPadMeshes`) + vending machines & hologram signs,
                                            dark concrete plaza deck + trimmed neon road lanes, cyber-botanical trees & monolith fork pylons (`CyberProps3D`), modern barriers/benches/streetlights (`InstancedMesh`), safe-zone lighting, & `dispose()`
src/game3d/ShopWorld3D.ts     1.266 baris — 3D Neo-Cyber Shop Plaza controller (`ShopWorld3D` 231, `ShopCyberPlaza3D`), Plaza walkers, &
                                            6 emblem bangunan 2.5D tinggi (`ArtBillboard2D`), preserved hitboxes & non-overlapping aligned `stationPositions` badges,
                                            Outer Space Altar clock room (Center Cyber-Chrono Core Podium + 10 ZZZ/HSR Cyber-Showcase Enchant Podiums `"01".."10"` w/ thruster under-hull, frosted holo lens, flat horizontal sigil, Dual-Shell Anime Aura & GPU star-ember particles, 10 radial energy conduits + 30 traveling pulses, outer elliptical synchro ring, 6 floating cosmic crystal islands & 4 chrono-monolith pylons, 2.5D `EnchantBillboard2D`), & `dispose()`
src/game3d/SeraphimBoss3D.ts  1.722 baris — Full 3D hard-surface Corrupted Seraphim AI Overlord Boss (`createSeraphimBoss3D`, zero `BoxGeometry`):
                                            beveled `ExtrudeGeometry` + `LatheGeometry` + tapered `TubeGeometry` armor, V-fin visor helmet + curved horns,
                                            curved layered pauldrons + aerodynamic arms + 5-clawed hands, dangling cables, & 6 curved feather-blade wings + `update()` + `dispose()`
src/game3d/TowerArena3D.ts    1.277 baris — Battle Tower combat/entity controller (coordinates `TowerCityEnvironment3D` + `SeraphimBoss3D`), elevated Holographic AI Core,
                                            full 3D Seraphim Boss mounted slightly behind crater center (`BOSS_CENTER_Z`), feet-level crater shockwave + anti-gravity rocks + ground-to-body sparks,
                                            5 wave ore slots (Waves 1–9 dengan 2.5D basalt collar, horizontal recoil & feathered `getGeodeGlowTexture`), Chibi Fighters (`ChibiFieldFxController`: ground halo/sigil + live Enchant/Rainbow color sync + rising GPU particles), feathered summon pads, unified 5-layer `AttackImpactFxController` (`spawnImpact` + `spawnShatter`) + bouncing 3D crystal/basalt debris (`spawnTowerShardsAt`), & `dispose()`
src/game3d/TowerCityEnvironment3D.ts 1.575 baris — Procedural "Ruined Cyber City & Deep Central Meteor Crater" (`createTowerCityEnvironment`):
                                            raised holed highway (`y = 0.52`), recessed crater (`y = 0.08`) with jagged charred fissures + core embers,
                                            crater fire embers + dark ash flakes (`InstancedMesh`) + street electric sparks, dented guardrails,
                                            flickering streetlights, & 22 ruined skyscrapers (`InstancedMesh` varied/shattered window grids + glass shards + rooftop ducts/stairs)
src/game3d/AltarSpinFx3D.ts     936 baris — Ornate Astral Astrolabe Dial & Chrono-Spear Hands (`createAltarClockDial` 63 w/ beveled arrow hour markers, 12-tooth gearRing, counter-rotating flat horizontal `outerTrackRing` & skyward chrono light beam, `createAltarClockHand` 305 skeletonized split-rail spear w/ crescent counterweight tail, swept crossguard wings, horizontal sighting reticle & fleur-de-lis spearhead,
                                            `createAltarSubHand` 591 Breguet moon-eye vernier hand, `AltarParticleSystem` 715)
src/game3d/HellAltarEye3D.ts    373 baris — `HellAltarEyeController` 151: Outer Space starfield, cosmic astrolabe floor ring (`dt`-clamped `update`),
                                            & distant Pitch-Black Black Hole (`#000000` event horizon, photon ring, lensing arches, accretion disk)
src/game3d/AuraModels3D.ts      586 baris — `createEnchantAura3D` 276, `createEnchantDice3D` 318, `ArtBillboard2D` 413 & `EnchantBillboard2D` 577 (2.5D sprites)
src/game3d/HudIcon3DRenderer.ts 2.002 baris — Offscreen WebGL renderer generating cached data-URL 3D icons (`buildStarwellOreModel` 1351)
                                            & 5 3D weather icons (`init3dHudIcons` 1842)
src/game3d/ProceduralTextures3D.ts 720 baris — Procedural cyber-slate (world-tinted `mixHex`) / hazard & cyber-anime VFX canvas textures (`paintCachedTexture` + `DataTexture` Node fallback for sky dome, cyber deck, basalt pavers, hazard stripes, dual slash, hitspark star, shockwave ring, wind-up glint, spark streak, `getFusionMagicCircuitTexture`, `getFusionPortalVortexTexture`)
src/game3d/GlbAssets3D.ts       135 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 45, `preloadCommonMineModels` 116)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   46 chibi (`<id>/{attack,idle,pose,walk}.webp` W1–W6 + 5 weather-limited + 4 Fusion + 7 Daily Login Limited tight-cropped RGBA 300px-tall WebP, 184 files)
public/enchants/                11 transparent WebP fantasy aura & dice icons (`blazing`..`spellbound`, `enchant_dice`)
public/hud/                     18 HUD & modal art icons (`shops`..`lock`, incl. `tower_boss.webp` & `game_banner.webp` 3:1 Mine banner)
public/meteors/                 5 Weather Meteor `.webp` sprites (`light_rain`, `snow_rain`, `bloodmoon`, `void`, `celestial`)
public/models/                  Kenney & fantasy `.glb` packs (`castle/`, `factory/`, `fantasy-town/`, `mini-dungeon/`,
                                `modular-cave/`, `nature/`, `platformer/`, `retro-fantasy/`, `survival/`, `train/`)
public/ores/                    53 transparent WebP fantasy ore icons (48 W1–W6 `underground`..`starwell` + 5 weather-limited)
public/pickaxes/                12 transparent WebP fantasy pickaxe art icons (`starter`..`starwellcrown`)
public/potions/                 8 transparent WebP fantasy potion art icons (`ore-elixir-1`..`mutation-luck-1`)
public/relics/                  12 edge-cleaned transparent WebP 384×384 Relic Forge icons (`miner_lantern`..`commander_banner`)
public/research/                13 transparent 2D fantasy WebP 256×256 Research Node icons (`strike`, `chibi_power`, `world_mastery`, etc.)
public/weathers/                5 transparent WebP fantasy weather emblem icons (`light_rain`..`celestial`)
public/worlds/                  6 full-bleed teleport banner WebPs (`underground`, `crystal`, `magma`, `ruins`, `astral`, `starwell`)
```

---

## 3. QUICK TARGET LOOKUP (Edit cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Miner (`Exotic`/`Secret`), Star-Up & World Resonance | `src/game/GameData.ts` (`ORES`, `WORLD_MINERS`, `CHIBI_STAR_TIERS`, `WORLD_RESONANCE_TIERS`, `computeWorldResonances`) |
| Chibi Catalog, Facing Flags & 4-Pose Sprites | `src/game3d/ChibiCatalog.ts` (`CHIBI_CATALOG`, `LEFT_FACING_WALK_IDS`, `LEFT_FACING_ATTACK_IDS`), `public/chibi/<id>/*.webp` |
| Research tree nodes, Core Strike/Vault & `denseOreScale` | `src/game/ResearchData.ts` (`CORE_NODES`, `STARWELL_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`) |
| Gem Tower scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather config, probabilities & multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State Facade, Research, Relics & Global Multipliers | `src/game/GameState.ts` (`GameState`, `getActiveResearchBonus`, `canCraftRelic`, `craftRelic`, `getRelicBonus`) |
| Save/Load Migration, Plot Units, Multi-Stat Enchants & Tower Combat | `src/game/GameStateSave.ts`, `PlotUnitsDomain.ts` (`starUpUnit`, `equipBestUnitsToPlots`, `getChibiUpgradeCostMult`, `getActiveEnchantBonuses`), `TowerRunDomain.ts`, `LootChestDomain.ts`, `ShopWeatherDomain.ts` (`syncWeatherDomain`) |
| Responsive HUD scale, Topbar, Modal Router, Currency/Audio Rail | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`, `openModal`) |
| Weather HUD, Forecast Popover, DPS Breakdown, Overclock Fever & Active Potions | `src/ui/WeatherDpsHudUi.ts` (`WeatherDpsHudUi`, `buildDpsMeterInnerHtml`, `buildOverclockGaugeInnerHtml`, `buildWeatherWidgetInnerHtml`), `src/game/OverclockDomain.ts` |
| Hotbar 1–9, Bag Toggle & Plot Pointer Drag-and-Drop | `src/ui/HotbarHudUi.ts` (`HotbarHudUi`, `canDropHotbarOnPlot`, `renderHotbarSlotsHtml`) |
| Shop Plaza Dock HUD, Enchant Altar Strip, Hover Inspector & Auto Roll | `src/ui/AltarShopHudUi.ts` (`AltarShopHudUi`, `getAltarRollButtonState`, `renderShopWorldHudHtml`), `src/ui/HudShared.ts` (`buildEnchantHoverCardHtml`, `bindEnchantHoverInspector`) |
| 3D World Overlays (Ore HP, Damage Popups, Shop Signs, Plot Labels) | `src/ui/WorldOverlayHudUi.ts` (`WorldOverlayHudUi`, `buildPlotLabelPayload`, `buildMineOreBarsHtml`, `buildTowerOreBarsHtml`) |
| Performance & Audio Settings, Offline Earnings, Bounties & Career Achievements | `src/game/GameSettings.ts`, `src/ui/SettingsModalUi.ts`, `src/game/OfflineEarningsDomain.ts`, `src/ui/OfflineModalUi.ts`, `src/game/BountiesDomain.ts`, `src/ui/BountiesModalUi.ts`, `src/game/AchievementsDomain.ts`, `src/ui/AchievementsModalUi.ts` |
| Responsive 5-Stage Cyber-Anime FTUE Tutorial & Starter Bonus | `src/ui/TutorialUi.ts` (`TutorialUi`, `buildTutorialCardHtml`, `getTutorialStageMeta`, `?tutorial=1`), `src/game/GameState.ts` (`grantTutorialStarterReward`) |
| Shared Modal Shell, Inspector Shell, Enchant Hover Card, Backdrop Guard | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `buildEnchantHoverCardHtml`, `bindEnchantHoverInspector`, `shouldDismissModalBackdrop`, `classifyToast`, `renderToastBannerHtml`, `formatCountdownTimer`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Relic Forge (12 Relics, resep, 3 slot, Ore Source pop-up) | `src/game/RelicData.ts` (`RELICS`, `MAX_EQUIPPED_RELICS`), `src/ui/ForgeModalUi.ts` (`ForgeModalUi`), `public/relics/*.webp` |
| Index (6 Worlds + Weather + Fusion + Limited), Completion Rewards, Backpack/Inventory + Team Loadouts, Chest | `src/game/IndexRewardsDomain.ts`, `src/game/TeamPresetsDomain.ts`, `src/ui/IndexModalUi.ts`, `src/ui/InventoryModalUi.ts`, `src/ui/ChestModalUi.ts` |
| 7-Day Daily Login, Exclusive `limited` 5★ Chibis, Upgrade Scales & Protection | `src/game/DailyLoginData.ts` (`DAILY_LOGIN_REWARDS`, `getDailyLoginRewardByChibiId`, `isNonSellableChibi`), `src/game/DailyLoginDomain.ts`, `src/ui/DailyLoginModalUi.ts` |
| 3D Chibi Fusion World, Recipes, Exclusive `fusion` Tier & 4 Plot Passives | `src/game/FusionData.ts`, `src/game/FusionDomain.ts`, `src/ui/FusionHudUi.ts`, `src/game3d/FusionWorld3D.ts` |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay, Bulk Upgrades (`×1/×10/MAX`), Auto-Roll Mutation (`Frozen+`) & Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `shouldStopAutoMutationRoll`, `renderMutationConfirmOverlay`), `src/game/UpgradeBulkHelper.ts` |
| Hold-to-Mine (`stepHoldMineTimer` + Electric Sparks) & Random Pit Events (`Golden Vein` / `Crystal Surge`) | `src/game3d/MineScene3D.ts` (`stepHoldMineTimer`, `spawnPitEvent`), `src/game/PitEventsDomain.ts`, `src/game3d/OrePit3D.ts` (`activatePitEvent`), `src/styles/global.css` (`.is-hold-mining`, `.mam-electric-spark`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, Web Audio Synth Roll/Spin SFX, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit, Camera Lock, Attack VFX & 3D HUD Icons | `src/game3d/MineScene3D.ts` (`setCameraLocked`, `applyCameraOrbitDrag`, `clampCameraZoomRadius`), `WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts` (`METEOR_HP_MULT`, `computeMeteorDynamicHp`), `AttackImpactFx3D.ts`, `ChibiSprite3D.ts`, `ProceduralTextures3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Chest Vault, Escalator, Cave Radar & Architectural Pillar Props | `src/game3d/CyberProps3D.ts` (`createCyberRadarArray`, `createCyberLanternBollardFinial`, `createCyberMonolithForkFinial`, `createCyberCrystalCluster`, `createCyberBotanicalCanopy`), `ChestVaultStation3D.ts`, `CaveRailway3D.ts`, `MineEnvironment3D.ts` |
| 3D Shop Plaza, Outer Space Enchant Altar + Black Hole & Tower Arena | `src/game3d/ShopCyberPlaza3D.ts` (`createShopCyberPlaza`), `src/game3d/ShopWorld3D.ts` (`ShopWorld3D`), `src/game3d/HellAltarEye3D.ts`, `src/game3d/AltarSpinFx3D.ts`, `src/game3d/SeraphimBoss3D.ts` (`createSeraphimBoss3D`), `src/game3d/TowerArena3D.ts`, `src/game3d/TowerCityEnvironment3D.ts` (`createTowerCityEnvironment`) |
| Rules, CrazyGames SDK v3, UI/HUD & Procedural 3D Skills | `.agent/rules/threejs-ts-standards.md`, `.agent/skills/{crazygames-sdk-v3,ui-hud-design,procedural-3d-assets}/SKILL.md` |

---

## 4. RILIS & DEPLOY

- **GitHub Pages**: auto-deploy via `.github/workflows/deploy.yml` setiap push ke `main` (test + Vite build + deploy). Hash assets Pages = build commit pushed terakhir.
- **CrazyGames**: upload **MANUAL** lewat developer dashboard (tidak auto-deploy). Folder build lokal: `Downloads/my_pixel_mine_cg_build` (nama folder masih legacy `my_pixel_mine`; sengaja tidak di-rename agar alur upload tidak berubah) — mirror persis `dist/` (`index.html` di root). Tiap update: copy `dist/.` ke folder itu, lalu prune file `assets/*` hash lama yang tidak ada di `dist/assets`; verifikasi file set identik + hash di `index.html` ada semua. Status 2026-11-20: build Weather Sky & Tower Brightness Pass (`03f7d79`) **sudah di-upload user ke dashboard CG** (file set + hash assets terverifikasi identik dengan `dist/`).
- **Save pemain**: `localStorage` (`GameStateSave.ts`) + **APS (Automatic Progress Save)** CrazyGames otomatis backup/sync antar-device untuk user login CG — tanpa kode tambahan. Guest tetap lokal. **Kalau IAP ditambah nanti: APS dilarang** → migrasi ke SDK data module (API identik `localStorage`, ganti wrapper save + toggle Progress Save di submission flow).
- **Build lokal vs CG**: rasa smooth/visual yang berbeda antara lokal/Pages dan CG biasanya = umur build CG (upload manual tertinggal commit perf). Cek hash assets sebelum nuduh kode.
