# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_pixel_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-19** after **Solid Cyber-Armor UI Overhaul, Tactical Hotbar 1–9 Dock, 2-Column Weather Forecast, Teleport Pill & 5-Layer Ore Hit/Shatter VFX Pass (opaque `.mam-modal` 13-theme frames & sculpted `.mam-title-plaque`, non-transparent HUD/modal buttons & panels, `.mam-hotbar-dock` + `.mam-hotbar-keycap`/`is-hotbar-selected`/`mam-hotbar-bag`, `TW_TELEPORT_PILL` + Warp Portal icon + `1`–`6` badge, 2-column side-by-side Weather Forecast + Meteor Drops, bottom HUD clearance `108px`, & 5-layer `AttackImpactFx3D.spawnShatter` + rising motes + bouncing 3D crystal/basalt shards in `OrePit3D` & `TowerArena3D`)**, **CrazyGames Retention & Polish Pass (Performance & Audio `SettingsModalUi` + `GameSettings.ts`, `OfflineEarningsDomain` + `OfflineModalUi` 2x Ad hook, `BountiesDomain` + `BountiesModalUi`, Cyber-Anime `OverclockDomain` Fever Gauge & Bottom-Left DPS Breakdown Dock, Semantic Toast Banners `renderToastBannerHtml`, & 5-Stage Responsive Click-Through `TutorialUi` FTUE + Starter Bonus)**, **Research World Tree Symmetric Overhaul (`buildStandardWorldTree` 12-node/58-pt blueprint across W1–W6, balanced Core Tap vs Chibi DPS, `public/research/*.webp` 13 fantasy 2D icons, & Dark-Glass node cards in `UpgradesWorldsUi.ts`)**, **Chibi Sprite & Name Overhaul (`AkaneFlare`, `CrazyMan`, `BangJoo`, `BladeGhost`, `IMbot` pose circle removal) & Relic Forge 12-Icon Transparency Cleanup (`public/relics/*.webp`)**, **Mine/Plaza 3D Props, Cave Radar & Animated Conduits Overhaul (`CyberProps3D.ts`, `CaveRailway3D.ts` rotating radar, `ChestVaultStation3D.ts` relocated refinery + single precision animated conduit, `MineEnvironment3D.ts` flowing overhead cables, `ShopCyberPlaza3D.ts` centered `'CYBER GEM MART'` + cyber-botanical trees & monolith pylons, `ShopWorld3D.ts` badge alignment)**, **Tahap C `GameState.ts` Modularization (`GameStateSave.ts`, `PlotUnitsDomain.ts`, `TowerRunDomain.ts`, `LootChestDomain.ts`, `ShopWeatherDomain.ts` + `tests/state-modules.test.ts`)**, **Tahap B `GameHud.ts` Modularization (`WeatherDpsHudUi.ts`, `HotbarHudUi.ts`, `AltarShopHudUi.ts`, `WorldOverlayHudUi.ts` + `ForgeModalUi.bindEvents` + `HudShared.ts` scroll/timer helpers, plus Tahap A VFX minors cleanup)**, **Unified Chibi 3-Beat Attack Combo & 4-Layer Cyber-Anime Impact VFX Overhaul (`AttackImpactFx3D.ts`, 3-beat `ChibiSprite3D` + afterimages + glint, `FieldMiner3D` / `TowerArena3D` live Enchant/Rainbow color sync, `OreBillboard2D` recoil)**, **Plot Pedestals, Aura VFX, 2.5D Ore Grounding & Field Chibi Rings Overhaul**, **Mine Visual Polish & Responsive Bugfix Pass**, **Cyber-Industrial MineScene3D Redesign**, **Neo-Cyber City Plaza Roundabout Curb**, **Sculpted Non-Box `SeraphimBoss3D.ts`**, **CrazyGames SDK v3 Startup Hardening**, & **Ruined Cyber City Battle Tower**; re-measure with `Select-String` if files change.

## 1. ATURAN KERJA SINGKAT

1. **Verifikasi wajib setelah edit**: jalankan `npm.cmd test` (Vitest) dan `npm.cmd run build` (`tsc --noEmit && vite build`), plus smoke-test browser jika UI/3D berubah.
2. **UI Styling**: gunakan utility classes Tailwind CSS v4 (atau helper constants `TW_*` di `src/ui/HudShared.ts`). Tema UI menggunakan **Solid Cyber-Armor + Luminous Gradient Rails** (`data-modal-theme`, `.mam-modal`, `.mam-modal-rails`, `.mam-title-plaque`, `.mam-inspector-well`, `.mam-hotbar-dock`, `.mam-no-scrollbar`, `@media (forced-colors: active)`) yang tersimpan di `src/styles/hud.css` (seluruh frame modal, tombol, & panel HUD solid/non-transparan).
3. **Jaga kebersihan modul UI & State**: jangan tumbuhkan file UI/State di atas ~800–1.000 baris; pecah layar/modal atau domain state baru ke modul terpisah di `src/ui/` atau `src/game/` (tanpa circular import terhadap `GameState`) lalu delegasikan dari `GameHud.ts` / `GameState.ts`.
4. **Pure game logic & 3D invariants**: pertahankan pure helper (`applyNodeDamagePure`, `rollEnchantDef`, dll.) agar unit test Vitest (`tests/world-3d.test.ts`) tidak butuh WebGL/DOM penuh.
5. **Aset `.glb` & sprites (`public/`)**: jangan timpa/hapus model atau sprite tanpa permintaan eksplisit user.

---

## 2. PETA FILE (`my_pixel_mine`)

```
index.html                      Entry HTML (Vite root)
.gitignore                      Ignore `node_modules/`, `dist/`, `.vite/`, local/OS files
.github/workflows/deploy.yml    GitHub Actions auto test, Vite build & deploy ke GitHub Pages (`main`)
package.json                    Dependencies: three, @types/three, @tailwindcss/vite, tailwindcss, typescript, vitest, @types/node
package-lock.json               NPM dependency lockfile
vite.config.ts                  Standalone Vite + Tailwind CSS v4 config (`base: './'`)
tsconfig.json                   TypeScript strict config
GAME_MAP.md                     Peta struktur file & anchor (dokumen ini)
docs/superpowers/               Design specs & implementation plans (`specs/`, `plans/`)

=== AGENT RULES & SKILLS (`.agent/`) ===
.agent/rules/threejs-ts-standards.md        Aturan wajib `.ts`: strict TypeScript (no `any`), delta clamp `<= 0.1`, `THREE.Clock`/explicit `Timer`, `InstancedMesh`, `.dispose()`, `SRGBColorSpace`
.agent/skills/crazygames-sdk-v3/SKILL.md    Standar lifecycle hooks SDK v3, pause/audio mute pada `adStarted`/`adFinished`/`adError`, & larangan external links
.agent/skills/ui-hud-design/SKILL.md        Standar Dark-Glass 1px, `tabular-nums`, viewport-first HUD, `pointer-events` discipline, & responsivitas iframe/desktop
.agent/skills/procedural-3d-assets/SKILL.md Standar seni & arsitektur 3D prosedural multi-part, PBR material + emissive, pivot `y = 0`, `InstancedMesh`, & `.dispose()`

=== ENTRY & TESTS ===
src/main.ts                     291 baris — Bootstrap Three.js scene (`MineScene3D`), `GameState`, `GameHud` (+ plot drop & 3D label sync ops, `'limit'` toast,
                                            weather & CC0 `AudioManager` sync, `gameSettings` live sync, offline earnings boot modal, Overclock tap/sync, tutorial-guarded `spawnMeteorIfAllowed`), CrazyGames SDK init & ad-pause lifecycle, Tower callbacks & game loop
tests/hud-modules.test.ts         710 baris — 19 Vitest specs untuk modul UI Tahap B + `GameSettings`, `AudioManager` volume scaling, `SettingsModalUi`,
                                            `OfflineModalUi`, `BountiesModalUi`, Overclock HUD + semantic toast banners, Tactical Hotbar (`mam-hotbar-keycap`/`mam-hotbar-bag`), & `TutorialUi` 5-stage FTUE
tests/state-modules.test.ts       545 baris — 14 Vitest specs untuk modul domain state (`GameStateSave`, `PlotUnitsDomain`,
                                            `TowerRunDomain`, `LootChestDomain`, `ShopWeatherDomain`, `OfflineEarningsDomain`, `BountiesDomain`, `OverclockDomain`)
tests/world-3d.test.ts        2.510 baris — 59 Vitest unit & integration specs (3D world, Altar dial/dice & 2.5D billboard pedestals,
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
                                            Frozen+ mutation roll protection, 35 chibis, Exotic/Secret tiers, buffed miner drops,
                                            World 6 Starwell, Chibi Star-Up, World Resonance synergy, & Relic Forge crafting/slots/buffs)

=== GAME DATA & STATE ===
src/game/GameData.ts            668 baris — World (`underground`..`starwell` W1-W6), `ORES` 112 (48 world + 5 `WEATHER_ORES` = 53 ores),
                                            `WORLD_MINERS` 261 (30 world miners: 5/world incl. Exotic & Secret + 5 `getWeatherLimitedMiners`),
                                            `PICKAXES` 307 (12 tiers W1–W6), `MUTATIONS` 322, `ENCHANTS` 336 (`ENCHANT_DICE_GEM_COST` 334),
                                            `isHighTierMutation` 398 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 408,
                                            `rollMutation` 524, `CHIBI_STAR_TIERS` 596, `WORLD_RESONANCE_TIERS` 624,
                                            `computeWorldResonances` 637, `rollWorldOre` 659, `rollWorldMiner` 664
src/game/RelicData.ts           289 baris — `MAX_EQUIPPED_RELICS` (3), `RELICS` (12 relics: 6 World, 3 Weather, 3 Tower; `5K`–`300K` Gems),
                                            `getRelicById`, `formatRelicEffects`
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
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         1.036 baris — State coordinator + re-exports (`PlotUnitState`, `ResearchLevelsMap`, `SavePayload`, `OfflineEarningsSummary`, `BountyEntry`,
                                            `getChibiUpgradeCostMult`), `GameState`: public fields, `subscribe()`/`emit()`, Index/Discovery,
                                            Research trees & World unlock (`getActiveResearchBonus`), Global Multipliers (`denseOreScale`,
                                            potions, relics, Overclock 2x Tap / 1.5x Ore), Relic Forge (`canCraftRelic`, `craftRelic`, `toggleEquipRelic`, `getRelicBonus`)
                                            + Enchant Dice roll, `grantAdGems`, `grantTutorialStarterReward`, serta delegasi ke modul domain di bawah
src/game/GameStateSave.ts       476 baris — `SAVE_KEY` 17, `ResearchLevelsMap`, `PlotUnitState`, `SavePayload` (+ `lastSavedAt`, `bounties`, `bountiesCompleted`), `SaveableGameState`,
                                            `migrateOreId`, `isValidIndexId`, `createEmptyResearchLevels`, `compactHotbarSlots`,
                                            `serializeSavePayload`, `deserializeSaveJson` (migrasi legacy, refund excess pickaxes, resync `discovered`),
                                            `saveToLocalStorage`, `loadFromLocalStorage`
src/game/PlotUnitsDomain.ts     707 baris — `PlotUnitsContext` 55, `getChibiUpgradeCostMult` 96, `createFreshPlotUnit` 123, `getChibiStarCount` 146,
                                            `starUpUnit` 169, `autoStarUpAllUnits` 189, `getActiveWorldResonancesList` 205, `computePlotUnitStats` 241,
                                            `computeTotalPlotDps` 312, `computeDpsBreakdown` 321, `trimStashedUnits` 364, `equipChibiOnPlotSlot` 406 (`'limit'`),
                                            slot upgrade/pickaxe/mutation (`rollUnitMutation` 554), 1-per-unit Enchant (`toggleUnitEnchant` 589), `equipBestUnitsToPlots` 612
src/game/TowerRunDomain.ts      507 baris — `TowerRunMeta` 25, `TowerRunContext` 30, `syncTowerKeysDomain` 71, `getTowerEffectiveDpsDomain` 130,
                                            `startTowerRunDomain` 177, `finishTowerRunDomain` 294, `chooseTowerBlessingDomain` 319,
                                            `stepTowerTickDomain` 336 (5s Blessing Auto-Pick + timeout), `applyTowerTargetDamageDomain` 375
                                            (Wave 10 Boss 5s invul, anti-one-hit cap, milestones, dice/ore rewards), `quickSweepTowerDomain` 462
src/game/LootChestDomain.ts     461 baris — `LootChestContext` 20, `getChestItemCountDomain` 59, Hotbar 1..9 (`swapHotbarSlotsDomain` 87,
                                            `removeFromHotbarDomain` 124, `toggleHotbarItemDomain` 138), ore lock/auto-sell (`shouldAutoSellOreDomain` 182),
                                            `onOreBrokenDomain` 223, `onMeteorBrokenDomain` 277, `takeAllFromChestDomain` 378,
                                            `isChestFullBonusReadyDomain` 406, `sellAllChestOresDomain` 434 (+35% Full-Chest), `toggleAutoSellDomain` 448
src/game/ShopWeatherDomain.ts   390 baris — `ShopWeatherContext` 22, `sellOreDomain` 72, `sellAllOresDomain` 87, `sellMinerDomain` 145,
                                            pickaxe stock (`refreshPickaxeStockIfDueDomain` 160, `buyPickaxeDomain` 183), `sellBatchDomain` 230,
                                            gem shop & potions (`buyGemShopItemDomain` 262, `useGemPotionDomain` 276, `isBoostActiveDomain` 304),
                                            weather & relic scaling (`scaleWeatherMultDomain` 326, `syncWeatherDomain` 370, `forceWeatherDomain` 382)
src/game/OfflineEarningsDomain.ts 164 baris — `OFFLINE_MIN_SEC` (2m), `OFFLINE_MAX_SEC` (8h), `OFFLINE_EFFICIENCY` (0.5), `formatOfflineDuration`,
                                            `computeOfflineEarningsDomain`, `claimOfflineEarningsDomain` (1x/2x + chest cap)
src/game/BountiesDomain.ts      250 baris — `BOUNTY_SLOT_COUNT` (3), `BountyKind` (7 aktivitas), `generateBountyEntry`, `ensureBountiesPopulatedDomain`,
                                            `recordBountyProgressDomain`, `getReadyBountyCountDomain`, `claimBountyDomain`
src/game/OverclockDomain.ts     107 baris — `OVERCLOCK_DURATION_SEC` (15s), `OVERCLOCK_SPEED_MULT` (2x), `OVERCLOCK_DROP_MULT` (1.5x),
                                            `chargeOverclockDomain` (auto-activate at 100%), `stepOverclockDomain`, `getOverclockSnapshotDomain`
src/game/AssetUrl.ts             11 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/GameSettings.ts        143 baris — `GameSettings` (`mam_settings_v1`), `GRAPHICS_PRESETS` (`low`/`medium`/`high`), `normalizeGameSettings`, `gameSettings`
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       617 baris — Web Audio SFX pool + synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`,
                                            `playEnchantEquip`) & HTMLAudio BGM switcher (`audio`, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence, `setBgmVolumeScale` / `setSfxVolumeScale`, `setAdMuted` & `isEffectivelyMuted`)
src/sdk/crazygames.ts           259 baris — CrazyGames SDK v3 wrapper (`isAdPlaying`, `cgInit` uninitialized-domain guard, `cgBindAdLifecycle`, `isCrazyGamesEnv`,
                                            `cgLoadingStart`, `cgGameplayStart`, `cgHappyTime`, `cgRequestRewardedAd`, `cgTryMidgameAd`)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             1.013 baris — `GameHud`: Thin UI coordinator (`activeModal`, `sceneMode`, `inspectedSlot`, `adPaused`, viewport scaling `updateViewportScale`,
                                            top `Shops` & `Teleport` (`TW_TELEPORT_PILL` + Warp Portal icon + `1`–`6` world badge), solid currency rail + Settings gear & audio mute toggle + Bounties quick btn w/ live badge, World Resonance HUD badges, modal router `renderActiveModal`, semantic toast stack,
                                            1000ms/100ms timers + Overclock live sync, `isTutorialActive`, `handleTower*` dispatch & public pass-through API untuk `main.ts`)
src/ui/HudShared.ts             377 baris — `chibiPortraitHtml`, shared types (`ModalKind` incl. `settings`/`offline`/`bounties`, `ModalThemeId`, `InvTab`, `PlotDropOps`),
                                            rarity/ring/timer/scroll helpers (`rarityCardClasses`, `rarityVars`, `applyInspectRing`, `classifyToast`, `renderToastBannerHtml`,
                                            `formatCountdownTimer`, `refreshPotionTimersInDom`, `captureRootScrolls`, `restoreRootScrolls`),
                                            solid cyber-armor Tailwind `TW_*` constants (`TW_TELEPORT_PILL`, `mam-notif-badge`), shared shell builders (`renderModalShell` w/ `autoHeight`, `renderInspectorPanel`)
src/ui/WeatherDpsHudUi.ts       584 baris — `WeatherDpsHudUi`: Solid top-left Weather widget + 2-column side-by-side Weather Forecast & Meteor Drops inspector + Auto Meteor toggle, Active Potions dock,
                                            & bottom-left unified DPS Breakdown + Cyber-Anime Overclock Fever dock (hotbar clearance `108px` on narrow viewports) (`formatWeatherTimer`, `buildActivePotionsDockContent`,
                                            `buildWeatherWidgetInnerHtml`, `buildDpsMeterInnerHtml`, `buildOverclockGaugeInnerHtml`)
src/ui/HotbarHudUi.ts           422 baris — `HotbarHudUi`: Solid Cyber-Anime Tactical Hotbar Dock (`.mam-hotbar-dock`, slots 1–9 w/ `.mam-hotbar-keycap`, `.mam-hotbar-qty`, `.mam-hotbar-val-bar`, `.is-hotbar-selected`, `.mam-hotbar-divider`, & `.mam-hotbar-bag`),
                                            outside-click selection clear, & pointer drag-and-drop reorder / plot swap (`buildHotbarStateKey`, `canDropHotbarOnPlot`, `renderHotbarSlotsHtml`)
src/ui/AltarShopHudUi.ts        428 baris — `AltarShopHudUi`: Shop Plaza dock HUD (`renderShopWorldHudHtml`), Enchant Altar HUD (`renderAltarStripCardsHtml`),
                                            roll/auto-roll timer controller (`triggerSingleEnchantRoll`), & live counters
src/ui/WorldOverlayHudUi.ts     499 baris — `WorldOverlayHudUi`: 5 floating `document.body` overlay layers (`plotOverlayLayer`, `oreBarLayer`, `dmgPopupLayer`,
                                            `shopOverlayLayer`, `shopBubbleLayer`), Mine/Tower segmented solid ore HP bars, `showDamagePopups`-gated damage popups, Shop station badges & NPC bubbles,
                                            Altar anchor pills, & 3D plot nametag sync (`buildPlotLabelPayload`, `buildMineOreBarsHtml`, `buildTowerOreBarsHtml`)
src/ui/CollectionModalsUi.ts  1.185 baris — `CollectionModalsUi` 43: Index modal (6 worlds + Weather Index tab + Inspector + Chibi 4-pose `Review` `<dialog>`),
                                            Backpack/Inventory (Equip Best / Auto Star-Up / Star-Up Miner / Search / Inspect), Chest modal & live updaters
src/ui/ForgeModalUi.ts          452 baris — `ForgeModalUi` 45: Relic Forge Dark-Glass modal (`renderForgeModal`: 3 equipped slots, All/World/Weather/Tower tabs,
                                            12-relic grid, `renderForgeInspector`, `?` Ore Source Pop-up `renderOreSourcePopup`, `handleAction`, & `bindEvents`)
src/ui/SettingsModalUi.ts       194 baris — `SettingsModalUi`: Dark-Glass Settings modal (`autoHeight`, Graphics Quality `Low`/`Medium`/`High`, BGM/SFX volume sliders, Mute All, Damage Popups toggle)
src/ui/OfflineModalUi.ts        143 baris — `OfflineModalUi`: Dark-Glass Welcome Back modal (offline duration, Cash/Gems/Ores summary, Claim & `CG_ADS_ENABLED`-gated 2x Ad Claim)
src/ui/BountiesModalUi.ts       115 baris — `BountiesModalUi`: Dark-Glass Mining Bounties modal (3 rotating contracts, progress bars, Claim & auto-refill)
src/ui/ShopModalsUi.ts          653 baris — `ShopModalsUi` 43: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               628 baris — `TowerUi` 55: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 80:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            Solid Cyber-Anime Raid Battle HUD (`renderTowerArenaHud`, `.mam-battle-hp-card` 10-tick animated HP bar, `.mam-battle-dock`, custom Pickaxe/Shield/Bolt/Timer SVGs, 5s Boss Invul shield, 5s Blessing auto-pick)
src/ui/TutorialUi.ts            659 baris — `TutorialUi`: Cyber-Anime 5-stage responsive click-through FTUE (`pose.webp` pop-out, opposite-side placement, `--mam-float-scale`, progress bar, `Skip`, `.mam-tut-target-ring`, `?tutorial=1`, Starter Bonus +150 Gems & +1 Dice)
src/ui/UpgradesWorldsUi.ts      636 baris — `UpgradesWorldsUi` 17: Research/Upgrades tree (opaque Dark-Glass nodes w/ world glow, edge-trimmed SVG lines & `.webp` icons) & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 315 pakai `public/worlds/*.webp`, synced Warp Portal title icon) & live updaters
src/ui/PlotInspectUi.ts         412 baris — `PlotInspectUi` 28: Plot Inspector overlay (incl. ★Star, World Resonance & per-unit Enchant `In Use`/`Equipped` status), live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`
                                            222: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              314 baris — SVG, 2D fantasy art (`public/{enchants,hud,meteors,ores,pickaxes,potions,research,weathers}/*.webp`), & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml` 305)
src/styles/global.css            73 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset + pickaxe cursor styles
src/styles/hud.css            1.984 baris — Solid Cyber-Armor + Luminous Gradient Rail system (`[data-modal-theme]` 13 opaque themes incl. `forge`/`settings`/`offline`/`bounties`,
                                            `.mam-modal` + anti-flicker entrance, `.mam-modal-rails`, sculpted `.mam-title-plaque`, `dialog.mam-review-dialog`, `.mam-grid`, `.mam-no-scrollbar`, `.mam-chibi-smooth`,
                                            `.mam-hotbar-dock`/`-slot`/`-keycap`/`-qty`/`-val-bar`/`-bag`, `.mam-battle-hp-*`/`.mam-battle-dock` Raid HUD, `.mam-fever-*` Overclock Gauge, `.mam-dps-*` Breakdown dock, `.mam-toast-banner`, `.mam-notif-badge`, `.mam-tut-*` FTUE card & target ring, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts     1.169 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `tower`, `SRGBColorSpace` renderer,
                                            cyber-holographic rear `"My Chibi"` stage (`2.44m` pedestal pitch, steel bay dividers, rear busbar & illuminated cyber stairwell), procedural Cyber Loot Chest on Refinery Dais,
                                            `setGraphicsQuality` (`low`/`medium`/`high`), `setOverclockActive` (2x miner speed + amber-gold overdrive lights), `setAdPaused` pause/resume, background pit/miner ticks, pit-floor click auto-target, Tower strike FX pass-through,
                                            weather sky/fog/safe-zone shop lighting (`setWeather`, `applyWeatherAtmosphere`), syncs 3D pedestal labels (`syncPlotLabel`) & plot/station/tower-ore anchors, & `destroy()` (`pedestals`, `pit`, `shopWorld`, `towerArena`, `weatherFx.dispose`)
src/game3d/MineEnvironment3D.ts 654 baris — Dark basalt / cyber-industrial deck terrain + thin perimeter neon trims (`skyHandle`, `setWeatherSky`),
                                            elevated gunmetal & cyan Holo-Display `"My Chibi Minerr"` Gantry + monolith split-prong finials, `CyberProps3D` armored lantern bollards, GPU bokeh mana motes (`dustMat` ShaderMaterial), lateral distant city support pillars & socket-anchored catenary cables with animated energy flow pulses
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
src/game3d/OrePit3D.ts         1.375 baris — Dark basalt pit floor, basalt retaining walls + diagonal yellow/black hazard stripe collar + thin neon rim + armored lantern corner bollards,
                                            2.5D-grounded `OreBillboard2D` (3D basalt rubble + crystal collar skirt, horizontal hit recoil, cracked crater AO socket decal, feathered Geode glow seams, Weather Meteor crater impact),
                                            bouncing 3D crystal prism + basalt rock shards (`spawnShardsAt`), 5-layer `AttackImpactFxController` (`hitNode` + `spawnShatter` on break, `getImpactFxCounts`), `getAliveNodesInfo`, `applyNodeDamagePure` 40, & `dispose()`
src/game3d/AttackImpactFx3D.ts  593 baris — Shared 5-layer cyber-anime impact & shatter VFX pool (`AttackImpactFxController` 77: directional dual-pass slash arc, 4-point anime hitspark star / 8-point shatter nova, directional & 360° radial spark streaks, single/twin ground shockwave rings, rising luminescent crystal motes, `spawnImpact` + `spawnShatter`, oldest-recycling caps & `dispose()`)
src/game3d/PlotPedestal3D.ts  1.252 baris — ZZZ/HSR Cyber-Showcase Plot Podiums (chamfered dock bay w/ cooling fins, edge-lit seam strip, titanium dais, front `01..05` numeric apron plaque, waist-high rear projector stanchions, dual-shell outward-flaring thick Anime-RPG Aura + 34 GPU star embers/streak wisps via shared `createAnimeParticlePoints`, world-space nametag sejajar di `y = 2.68m`) & `dispose()`
src/game3d/FieldMiner3D.ts      344 baris — Active chibi miner placement & shared `ChibiFieldFxController` (calm RPG feathered ground halo + Enchant ground sigil, live `def.accentColor`/Enchant/Rainbow sync, rising GPU particles via `createAnimeParticlePoints`, tanpa aura shell vertikal), 3-beat swing/background mining tick & `dispose()`
src/game3d/ChibiCatalog.ts      464 baris — `LEFT_FACING_WALK_IDS` 35, `LEFT_FACING_ATTACK_IDS` 44, `CHIBI_CATALOG` 62 (35 chibi poses WebP: 30 world + 5 weather-limited, `ChibiRarity` `common`..`secret`,
                                            baseDps, `smoothFilter` W1–W6, world roster, `getChibiFrameUvOffset` 460)
src/game3d/ChibiSprite3D.ts     567 baris — Animated 2D-in-3D upright billboard sprite (3-beat combo `triggerAttack`, 2 tinted ghost afterimages, wind-up glint, `setAccentColor`, `smoothFilter` linear/mipmap vs nearest, camera-pitch tilt, normalized pose sizing, alpha-clipped directional shadow + soft AO contact shadow, & `dispose()`)
src/game3d/ShopCyberPlaza3D.ts 1.764 baris — Procedural "Neo-Cyber City Plaza" 3D Lobby (`createShopCyberPlaza` 254):
                                            open sky Gem Tower skyscraper + access terminals, circular roundabout curb + thin neon trim + radial contact shadow (`createRoundaboutShadowTexture`) + Neon Crystal Cluster Fountain (`createCyberCrystalCluster`),
                                            4 high-clearance container kiosks (Pickaxes, Sell, centered 2-story Gem Shop `'CYBER GEM MART'`, Plasma Relic Forge, `createShopPadMeshes`) + vending machines & hologram signs,
                                            dark concrete plaza deck + trimmed neon road lanes, cyber-botanical trees & monolith fork pylons (`CyberProps3D`), modern barriers/benches/streetlights (`InstancedMesh`), safe-zone lighting, & `dispose()`
src/game3d/ShopWorld3D.ts       701 baris — 3D Neo-Cyber Shop Plaza controller (`ShopWorld3D` 140, `ShopCyberPlaza3D`), Plaza walkers, &
                                            6 emblem bangunan 2.5D tinggi (`ArtBillboard2D`), preserved hitboxes & non-overlapping aligned `stationPositions` badges,
                                            Outer Space Altar clock room (10 pedestal 2.5D `EnchantBillboard2D`), & `dispose()`
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
src/game3d/AltarSpinFx3D.ts     529 baris — `createAltarClockDial` 34, `createAltarClockHand` 156,
                                            `createAltarSubHand` 254, `AltarParticleSystem` 308
src/game3d/HellAltarEye3D.ts    373 baris — `HellAltarEyeController` 151: Outer Space starfield, cosmic astrolabe floor ring (`dt`-clamped `update`),
                                            & distant Pitch-Black Black Hole (`#000000` event horizon, photon ring, lensing arches, accretion disk)
src/game3d/AuraModels3D.ts      586 baris — `createEnchantAura3D` 276, `createEnchantDice3D` 318, `ArtBillboard2D` 413 & `EnchantBillboard2D` 577 (2.5D sprites)
src/game3d/HudIcon3DRenderer.ts 2.002 baris — Offscreen WebGL renderer generating cached data-URL 3D icons (`buildStarwellOreModel` 1351)
                                            & 5 3D weather icons (`init3dHudIcons` 1842)
src/game3d/ProceduralTextures3D.ts 580 baris — Procedural cyber-basalt/hazard & cyber-anime VFX canvas textures (`paintCachedTexture` + `DataTexture` Node fallback for sky dome, cyber deck, basalt pavers, hazard stripes, dual slash, hitspark star, shockwave ring, wind-up glint, spark streak)
src/game3d/GlbAssets3D.ts       135 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 45, `preloadCommonMineModels` 116)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   35 chibi (`<id>/{attack,idle,pose,walk}.webp` W1–W6 + 5 weather-limited tight-cropped RGBA 300px-tall WebP, 140 files; incl. `AkaneFlare`, `CrazyMan`, `BangJoo`, `BladeGhost`, `IMbot`)
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
| Save/Load Migration, Plot Units, Tower Combat, Chest & Shop/Weather | `src/game/GameStateSave.ts`, `PlotUnitsDomain.ts` (`starUpUnit`, `equipBestUnitsToPlots`, `getChibiUpgradeCostMult`), `TowerRunDomain.ts`, `LootChestDomain.ts`, `ShopWeatherDomain.ts` (`syncWeatherDomain`) |
| Responsive HUD scale, Topbar, Modal Router, Currency/Audio Rail | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`, `openModal`) |
| Weather HUD, Forecast Popover, DPS Breakdown, Overclock Fever & Active Potions | `src/ui/WeatherDpsHudUi.ts` (`WeatherDpsHudUi`, `buildDpsMeterInnerHtml`, `buildOverclockGaugeInnerHtml`, `buildWeatherWidgetInnerHtml`), `src/game/OverclockDomain.ts` |
| Hotbar 1–9, Bag Toggle & Plot Pointer Drag-and-Drop | `src/ui/HotbarHudUi.ts` (`HotbarHudUi`, `canDropHotbarOnPlot`, `renderHotbarSlotsHtml`) |
| Shop Plaza Dock HUD, Enchant Altar Strip & Auto Roll | `src/ui/AltarShopHudUi.ts` (`AltarShopHudUi`, `getAltarRollButtonState`, `renderShopWorldHudHtml`) |
| 3D World Overlays (Ore HP, Damage Popups, Shop Signs, Plot Labels) | `src/ui/WorldOverlayHudUi.ts` (`WorldOverlayHudUi`, `buildPlotLabelPayload`, `buildMineOreBarsHtml`, `buildTowerOreBarsHtml`) |
| Performance & Audio Settings, Offline Earnings & Mining Bounties | `src/game/GameSettings.ts`, `src/ui/SettingsModalUi.ts`, `src/game/OfflineEarningsDomain.ts`, `src/ui/OfflineModalUi.ts`, `src/game/BountiesDomain.ts`, `src/ui/BountiesModalUi.ts` |
| Responsive 5-Stage Cyber-Anime FTUE Tutorial & Starter Bonus | `src/ui/TutorialUi.ts` (`TutorialUi`, `buildTutorialCardHtml`, `getTutorialStageMeta`, `?tutorial=1`), `src/game/GameState.ts` (`grantTutorialStarterReward`) |
| Shared Modal Shell, Inspector Shell, Semantic Toasts, Scroll/Timer Helpers | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `classifyToast`, `renderToastBannerHtml`, `formatCountdownTimer`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Relic Forge (12 Relics, resep, 3 slot, Ore Source pop-up) | `src/game/RelicData.ts` (`RELICS`, `MAX_EQUIPPED_RELICS`), `src/ui/ForgeModalUi.ts` (`ForgeModalUi`), `public/relics/*.webp` |
| Index (6 Worlds), Backpack/Inventory, Chest + Inspectors | `src/ui/CollectionModalsUi.ts` (`CollectionModalsUi`) |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay & Frozen+ Mutation Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `renderMutationConfirmOverlay`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, Web Audio Synth Roll/Spin SFX, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit, Attack VFX & 3D HUD Icons | `src/game3d/WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts`, `AttackImpactFx3D.ts` (`AttackImpactFxController`), `ChibiSprite3D.ts`, `ProceduralTextures3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Chest Vault, Escalator, Cave Radar & Architectural Pillar Props | `src/game3d/CyberProps3D.ts` (`createCyberRadarArray`, `createCyberLanternBollardFinial`, `createCyberMonolithForkFinial`, `createCyberCrystalCluster`, `createCyberBotanicalCanopy`), `ChestVaultStation3D.ts`, `CaveRailway3D.ts`, `MineEnvironment3D.ts` |
| 3D Shop Plaza, Outer Space Enchant Altar + Black Hole & Tower Arena | `src/game3d/ShopCyberPlaza3D.ts` (`createShopCyberPlaza`), `src/game3d/ShopWorld3D.ts` (`ShopWorld3D`), `src/game3d/HellAltarEye3D.ts`, `src/game3d/AltarSpinFx3D.ts`, `src/game3d/SeraphimBoss3D.ts` (`createSeraphimBoss3D`), `src/game3d/TowerArena3D.ts`, `src/game3d/TowerCityEnvironment3D.ts` (`createTowerCityEnvironment`) |
| Rules, CrazyGames SDK v3, UI/HUD & Procedural 3D Skills | `.agent/rules/threejs-ts-standards.md`, `.agent/skills/{crazygames-sdk-v3,ui-hud-design,procedural-3d-assets}/SKILL.md` |
