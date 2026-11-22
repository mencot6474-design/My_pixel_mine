# PETA STRUKTUR GAME — My Anime Mine 3D

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_chibi_mine`).
Baca peta ini terlebih dahulu untuk menemukan modul, jumlah baris, dan anchor simbol dengan cepat tanpa membaca file besar dari awal hingga akhir.

> **Terakhir diverifikasi**: `2026-11-22` (setelah 3-Beat Barrage `25% -> 30% -> 45% = 100%` sinkron dengan 2.5s shader VFX di Mine/Tower/Omega). Ukur ulang anchor dengan `Select-String` jika file berubah.
> **Watchlist modul > 1.000 baris**: `TierAttackVfx3D.ts` (3.178), `MeshFx3D.ts` (2.415), `ChibiSprite3D.ts` (1.497), `MineScene3D.ts` (1.287), `TowerArena3D.ts` (1.277), `OmegaArena3D.ts` (1.210), `GameHud.ts` (1.062), `PlotPedestal3D.ts` (1.020), `OrePit3D.ts` (1.009).

<details>
<summary>Riwayat update besar terbaru (Tier Omega/Twin VFX, Pit & Economy Rebalance, Fusion Lab, Sticker-Pop UI, Modularization)</summary>

- **Tier OMEGA & Tier TWIN Bespoke 3D GLSL Shaders**: Factory shader & geometri prosedural di `MeshFx3D.ts`, always-on 3D back-shader attachments untuk 5 unit `twin` dan 2 unit `omega` (+ greatsword blitz `omegaHandPivot` untuk `obsidian-sovereign`) di `ChibiSprite3D.ts`, serta koreografi zero-vertical-beam di `TierAttackVfx3D.ts` (terhubung ke `PlotAttackController3D.ts`, `OmegaArena3D.ts`, `TowerArena3D.ts`).
- **Expanded Mine Pit & Real 3–6 Ore AoE Cleave**: Pit `11.8×9.2m` (`BASE_PIT_NODE_COUNT = 5`, `MAX_PIT_NODE_COUNT = 20`, `BASE_ORE_RESPAWN_SEC = 3.5`, kamera `18.8`), `pendingStrikes` blitz `1.28s–2.05s` w/ `areaScale: 0.72` & `getAoeTargetCount` `3..6`, `combatScale` `1.0->0.58`, `speedLevel -> DMG Mult` (`+12%/lv`, max `×2.92`), `miningSpeedLevel -> Crit Chance` (`5% + 3%/lv`, max `80%`, `2.25×` Crit DMG), & `LootChestDomain` `2×` roll (`2/4/6`).
- **13-Tier Rainbow Kinetic Blitz & Full 3D Shader VFX**: `ImpactFrameShader`, curved slash ribbons, Fresnel domes, orbital beams, vortex cones, spatial rifts, `buildTierMotionWaypoints` multi-teleport blitz + 6 additive ghosts & `mythic`/`twin` Mirror Clone, serta `EffectComposer` + `UnrealBloomPass` (`threshold 0.90`) di `MineScene3D.ts`.
- **6-Stage Zero-Blur Perf, Live FPS & Low Default Preset**: `applySharpSpriteTexture` + `configureSceneTextureSharpness` (hingga `8×` anisotropy), lazy init `ShopWorld3D`/`FusionWorld3D`/`TowerArena3D`/`OmegaArena3D`, selective `castShadow = false`, default `'low'` preset (`maxPixelRatio` `1.25/1.5/2`), 30 FPS modal render throttle, `content-visibility: auto`, & live FPS pill.
- **Clean-Tech White Lab Bunker & Omega Sunset Rooftop**: `FusionLabBunker3D.ts` (5-wall cutaway bunker, 4 cryo capsules, 4 ore vats, robotic arms), `OmegaRooftopEnvironment3D.ts` & `OmegaArena3D.ts` (1.85s Sky-Drop Entrance, 30s 12-tap Invul Shield, 45s duel, Parry reticle, Victory/Defeat popups, `OmegaForgeCutscene.ts`), plus `TwinSummonCutscene.ts` & auto-scaling `twin` oleh world terbaru.
- **Sticker-Pop Deluxe UI & Modularization Passes**: Warm Cream `#fff8e7` + `#14111d` ink borders, `Rubik`/`Fredoka`, `hud.css` → 7 partials, `GameState` & `GameHud` domain/UI splits, Index 13 tab (`127` total entries: 63 ores + 64 chibis) w/ sidebar & Holo Foil, Battle Tower Floor 80 Tamat & 12 Blessings, Overclock Tier 1–3, Hold-to-Mine + Pit Events + Career Achievements + 7-Day Daily Login.

</details>

---

## 1. ATURAN KERJA SINGKAT

1. **Verifikasi wajib setelah edit**: jalankan `npm.cmd test` (Vitest) dan `npm.cmd run build` (`tsc --noEmit && vite build`), plus smoke-test browser jika UI/3D berubah.
2. **UI Styling**: gunakan utility classes Tailwind CSS v4 (atau konstanta `TW_*` di `src/ui/HudShared.ts`). Tema UI adalah **Sticker-Pop Deluxe** (Warm Cream `#fff8e7`/`#fcecc8`/`#ffffff`, border `#14111d`, zero outer drop shadows, font `Rubik` + `Fredoka`, `.mam-modal`, `.mam-wing-rail`, `.mam-title-plaque`, `.mam-inspector-well`, `.mam-hotbar-dock`, `.mam-rarity-badge`, `.mam-no-scrollbar`, `@media (forced-colors: active)`) pada `src/styles/hud.css` dan 7 partial CSS-nya (`hud-{base,rarity,fx,modals,hotbar,widgets,battle}.css`).
3. **Jaga kebersihan modul UI & State**: jaga file UI/State tetap di bawah ~800–1.000 baris; pecah layar/modal atau domain state baru ke modul terpisah di `src/ui/` atau `src/game/` (tanpa circular import terhadap `GameState`) lalu delegasikan dari `GameHud.ts` / `GameState.ts`.
4. **Pure game logic & 3D invariants**: pertahankan pure helper (`applyNodeDamagePure`, `rollEnchantDef`, dll.) agar unit test Vitest (`tests/world-3d.test.ts`) tidak butuh WebGL/DOM penuh.
5. **Aset `.glb` & sprites (`public/`)**: jangan timpa atau hapus model/sprite tanpa permintaan eksplisit user.

---

## 2. PETA FILE (`my_chibi_mine`)

### Root, Konfigurasi & `.agent/`

| File | Deskripsi |
|---|---|
| `index.html` | Entry HTML (Vite root, Google Fonts `Rubik`/`Fredoka` + 6 Fever display fonts) |
| `.gitignore` | Ignore `node_modules/`, `dist/`, `.vite/`, `_tmp/` (scratch scripts), file lokal/OS |
| `.github/workflows/deploy.yml` | GitHub Actions auto test, Vite build & deploy ke GitHub Pages (`main`) |
| `package.json` / `package-lock.json` | Dependencies: `three`, `@types/three`, `@tailwindcss/vite`, `tailwindcss`, `typescript`, `vitest`, `@types/node` |
| `vite.config.ts` | Standalone Vite + Tailwind CSS v4 (`base: './'`, `manualChunks`: `three-vendor`, `game-3d`, `game-ui`) |
| `tsconfig.json` | TypeScript strict config |
| `GAME_MAP.md` | Peta struktur file & anchor (dokumen ini) |
| `docs/superpowers/` | Design specs & implementation plans (`specs/`, `plans/`) |
| `.agent/rules/threejs-ts-standards.md` | Aturan wajib `.ts`: strict TypeScript (no `any`), delta clamp `<= 0.1`, `THREE.Clock`/explicit `Timer`, `InstancedMesh`, `.dispose()`, `SRGBColorSpace`, & larangan gyroscopic/armillary orbit rings |
| `.agent/skills/crazygames-sdk-v3/SKILL.md` | Standar lifecycle hooks SDK v3, pause/audio mute (`adStarted`/`adFinished`/`adError`), & larangan external links |
| `.agent/skills/ui-hud-design/SKILL.md` | Standar HUD, `tabular-nums`, viewport-first HUD, `pointer-events` discipline, & responsivitas iframe/desktop |
| `.agent/skills/procedural-3d-assets/SKILL.md` | Standar seni & arsitektur 3D prosedural multi-part, PBR + emissive, pivot `y = 0`, `InstancedMesh`, & `.dispose()` |

### Entry, SDK, Audio & Tests

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/main.ts` | 568 | Bootstrap `MineScene3D`, `GameState`, `GameHud` (plot drop, Fusion 3D ops & `setFusionRevealHold`, Omega 3D ops & `onOmegaEntranceSlam`, `onFpsUpdate`, `setModalBackdropThrottled`, weather & CC0 `AudioManager` sync, offline modal, Overclock chain, `recordCritTap`, `onHoldMineChange`, `triggerTapCombo`, `spawnLootVacuum`, `triggerPerfectStrikeFlash`, `spawnPitEvent`, `spawnMeteorIfAllowed`), CrazyGames SDK, Tower/Omega callbacks & game loop |
| `src/sdk/crazygames.ts` | 259 | CrazyGames SDK v3 wrapper (`isAdPlaying`, `cgInit`, `cgBindAdLifecycle`, `isCrazyGamesEnv`, `cgLoadingStart`, `cgGameplayStart`, `cgHappyTime`, `cgRequestRewardedAd`, `cgTryMidgameAd`) |
| `src/audio/AudioManager.ts` | 734 | Web Audio SFX synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`, `playEnchantEquip`, `playCrystalScaleNote`, `playCrystalChord`, `getMusicalScaleRate` `do..DO!`) & HTMLAudio BGM (`setSceneMode` incl. `omega` -> `boss`, `playOreHit`, `playOreBreak`, mute persistence, `setBgmVolumeScale`, `setSfxVolumeScale`, `setAdMuted`, `isEffectivelyMuted`) |
| `tests/hud-modules.test.ts` | 1.587 | **39 Vitest specs**: modul UI Tahap B, `GameSettings`, `AudioManager`, `SettingsModalUi`, `OfflineModalUi` + Return Rush, `BountiesModalUi`, `DailyLoginModalUi`, `IndexModalUi` (sidebar/Twin/Omega/Holo Foil/`MAXED`), `LootVacuumFx`, Overclock Tier 1–3 + Fever Rain, Hotbar, `TowerUi`/`TowerArenaHudUi`, `ShopModalsUi`/`TwinSummonCutscene`, `OmegaBossModalUi`/`OmegaArenaHudUi`/`HudOmegaBridge`, `WorldOverlayHudUi` (`TAP!`), & `TutorialUi` |
| `tests/state-modules.test.ts` | 1.603 | **32 Vitest specs**: `GameStateSave`, `PlotUnitsDomain`, `TowerRunDomain` (Boss Shield-Break/12 Blessings/Max-Stack/Reroll/Streak/Dice Pity/Spire Coin/`0.01%` `TWIN` drop/Floor 80 Tamat), `OmegaBossDomain` (`100Qa..15Sp`/Sky-Drop/30s 12-tap Invul Shield/Parry/Pillars/`OMEGA BREAK!`/Core drop/Awaken), `LootChestDomain`, `ShopWeatherDomain`, `OfflineEarningsDomain`, `BountiesDomain`, `OverclockDomain`, `FusionDomain`, `DailyLoginDomain`, `PremiumShopData`, & Twin Tier Auto-Scaling |
| `tests/world-3d.test.ts` | 3.414 | **76 Vitest specs**: `PlotAttackController3D` (incl. `splitBarrageDamage` 3-beat barrage `25%/30%/45%`) & `getChibiAttackStyle`, Tier OMEGA & TWIN bespoke GLSL shaders/geometries, `triggerPodiumCast` + `firePodiumWeaponCast`, always-on back-attachments, Altar dial/dice, crisp sprite sharpness, `setLowQuality`, `OrePit3D` background respawn, `FusionLabBunker3D` + `FusionSequence3D`, `ChibiSprite3D.getTierBadgeAnchorLocal`, `ShopCyberPlaza3D`/`ShopWorld3D` & `OmegaArena3D`, 3-beat combo + 5-layer `AttackImpactFxController`, `MineEnvironment3D`, `SeraphimBoss3D`, `TowerCityEnvironment3D`, `TowerArena3D`, Cave Railway/Chest Vault, CrazyGames SDK v3, research/worlds W1–W8, Tower/Weather/Meteor/Chibi 64 catalog, & Relic Forge |

### Game Data & State (`src/game/`)

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/game/GameData.ts` | 836 | Worlds (`underground`..`chrono` W1–W8), `WORLD_UPGRADE_COST_SCALE`, `getWorldUpgradeCostScale`, `getLatestWorldScaleAnchor`, `syncTwinCatalogDpsFromAnchor`, `ORES` `215` (58 world + 5 weather = 63), `WORLD_MINERS` `378` (40 world + 5 weather), `PICKAXES` `440`, `MUTATIONS` `455`, `ENCHANT_DICE_GEM_COST` `467`, `ENCHANTS` `469`, `isHighTierMutation` `531`, `GEM_SHOP_ITEMS` `541`, `rollMutation` `657`, `CHIBI_STAR_TIERS` `729`, `WORLD_RESONANCE_TIERS` `758`, `computeWorldResonances` `792`, `rollWorldOre` `827`, `rollWorldMiner` `832` |
| `src/game/GameState.ts` | 972 | State coordinator & re-exports (`PlotUnitState`, `ResearchLevelsMap`, `SavePayload`, `OfflineEarningsSummary`, `BountyEntry`, `OmegaBattleState`, `OmegaBattleSummary`, `getChibiUpgradeCostMult`), `subscribe()`/`emit()`, domain delegators, Enchant Dice roll, `spendTowerCoins`, `getActivePremiumPassives`, `getActiveOmegaPassives`, `buyPremiumShopItem`, `grantAdGems`, `grantTutorialStarterReward` |
| `src/game/GameMultipliersDomain.ts` | 194 | Pure Index counters (`getTotalIndexCountDomain`, `getDiscoveredCountDomain`, `getWorldIndexProgressDomain`) & Global Multipliers (`getTapDamageDomain`, `getMaxChestCapacityDomain`, `getActiveOreNodeCountDomain`, `getOreHpScaleDomain`, `getOreValueMultDomain`, `getEffectiveOreSellValueDomain`, `getOreOutputMultDomain`, `getTotalOreDropMultDomain`, `getRespawnSpeedMultDomain`, `getFindChanceBonusDomain`, `getCharacterLuckMultDomain`, `getOreLuckMultDomain`, `getMutationLuckMultDomain`) |
| `src/game/GameStateSave.ts` | 647 | `SAVE_KEY` `24`, `SavePayload`, `SaveableGameState`, `migrateOreId`, `isValidIndexId` (World + Weather + Fusion + Limited + Twin + Omega), `createEmptyResearchLevels`, `compactHotbarSlots`, `serializeSavePayload`, `deserializeSaveJson`, `saveToLocalStorage`, `loadFromLocalStorage` |
| `src/game/PlotUnitsDomain.ts` | 821 | `PlotUnitsContext` `73`, `getChibiUpgradeCostMult` `108`, `createFreshPlotUnit`, `getChibiStarCount`, `starUpUnit`, `autoStarUpAllUnits`, `getActiveWorldResonancesList`, `getActiveEnchantBonuses`, `computePlotUnitStats` (`speedLevel -> DMG Mult` `+12%/lv`, `miningSpeedLevel -> Crit Chance` `5%+3%/lv`, `critMult = 2.25×`, Overclock/Fusion/Premium/Enchant/Return Rush), `computeTotalPlotDps`, `computeDpsBreakdown`, `trimStashedUnits`, `equipChibiOnPlotSlot`, `rollUnitMutation`, `toggleUnitEnchant`, `equipBestUnitsToPlots` |
| `src/game/OmegaData.ts` | 248 | `OMEGA_BOSS_DEFS` (`Crimson Ronin` `omega-left` & `Obsidian Sovereign` `omega-right`, Tier I `100Qa/150Qa`..Tier V `10Sp/15Sp` HP), `OMEGA_KEY_GEM_COST = 50000`, `OMEGA_ENTRANCE_DURATION_SEC = 1.85`, `OMEGA_INVUL_DURATION_SEC = 30`, `OMEGA_INVUL_TAPS_REQUIRED = 12`, `10%..50%` Core drop, All-3 Passives, `5` Cores unlock & `1★→5★` Awaken (`+20%/star`), `computeOmegaScaledBaseDps`, `computeOmegaUpgradeCostScale`, `getOmegaPassiveStarScale`, `getActiveOmegaPassiveBonuses` |
| `src/game/OmegaBossDomain.ts` | 600 | `syncOmegaKeysDomain` (`5` max, `1h` regen, 0-key-loss), `startOmegaBossDomain` (`'entrance'` -> `'invul_shield'` -> `'active'` 45s duel), `tapOmegaInvulShieldDomain`, `stepOmegaBossTickDomain`, `applyOmegaSquadStrikeDomain`, `triggerOmegaParryDomain`, `hitOmegaTargetObjectDomain`, `OMEGA BREAK!` (`2.5×` DMG 7s), `unlockOmegaChibiDomain`, `awakenOmegaChibiDomain` |
| `src/game/TowerData.ts` | 841 | `TOWER_MAX_FLOOR` (80, W1–W8), `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (15m), `TOWER_KEY_GEM_COST` (5000), `TOWER_WAVES_PER_FLOOR` (10), `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_ORE_COIN_CHANCE` (0.5%), `TOWER_ORE_TWIN_CHANCE` (0.01%), `TOWER_BOSS_COIN_CHANCE` (5%), `TOWER_BOSS_COIN_DROP` (5), `TOWER_GEM_DROP_MULT` (0.2), `TOWER_HP_MULT` (4050), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BLESSING_REROLL_GEM_COST` (75), `TOWER_BOSS_INVUL_SEC` (5), `TOWER_BOSS_EXPOSE_SEC` (4s `+50%` DMG), `TOWER_DICE_PITY_MAX` (4), `getTowerStreakGemMult`, `TOWER_ANOMALIES`, `TOWER_BLESSINGS` (12), `rollTowerTwinDropChibiId`, `pickRandomTowerBossChibiId`, `TOWER_MILESTONES` |
| `src/game/TowerRunDomain.ts` | 746 | `TowerRunMeta` `35`, `TowerRunContext` `40`, `syncTowerKeysDomain` `89`, `getTowerEffectiveDpsDomain` `147`, `startTowerRunDomain` `194`, `finishTowerRunDomain` `322`, `rerollTowerBlessingsDomain`, `hitTowerBossShieldSweetSpotDomain`, `chooseTowerBlessingDomain` `456`, `stepTowerTickDomain` `473`, `applyTowerTargetDamageDomain` `516`, `quickSweepTowerDomain` `670` |
| `src/game/ResearchData.ts` | 461 | `ResearchTreeId` `13`, `DENSE_ORE_HP_MULT` (10) `29`, `DENSE_ORE_DROP_MULT` (3) `30`, `RESEARCH_TREE_META` `74`, `formatNodeEffectLine` `158`, `getNodeNextCost` `194`, `CORE_NODES` `202` (Strike I–VI, Vault Expansion I–II `+300K`), `RESEARCH_NODES` `435` |
| `src/game/ResearchWorldNodesData.ts` | 571 | `buildStandardWorldTree` `50` (12-node / 58-pt blueprint W1–W8), `UNDERGROUND_NODES`..`STARWELL_NODES` `455`, `ABYSSAL_NODES`, `CHRONO_NODES` |
| `src/game/ResearchRelicsDomain.ts` | 230 | Research trees & World unlock (`upgradeResearchDomain`, `unlockWorldDomain`, `getActiveResearchBonusDomain`) + Relic Forge (`canCraftRelicDomain`, `craftRelicDomain`, `toggleEquipRelicDomain`, `getRelicBonusDomain`) |
| `src/game/RelicData.ts` | 269 | `MAX_EQUIPPED_RELICS` (3), `RELICS` (12 relics: 6 World, 3 Weather, 3 Tower; `5K`–`300K` Gems; fokus `Team DMG`, `Sell Ore`, `Drop Ore`), `getRelicById`, `formatRelicEffects` |
| `src/game/FusionData.ts` | 165 | `FUSION_RECIPES` (5 Synchro Fusion: `Glitch Cheshire`, `Thorn Maiden`, `Monochrome Saint`, `Prism Seraph`, `Aether Monarch`), `getFusionRecipeById`, `getFusionRecipeByResultChibiId` |
| `src/game/FusionDomain.ts` | 165 | `getAvailableFusionMinerCount`, `getFusionOreCount`, `canFuseRecipeDomain`, `getReadyFusionCountDomain`, `fuseChibiRecipeDomain`, `getFusionPassiveStarScale` (`+20%/star`), `getActiveFusionPassiveBonuses` |
| `src/game/DailyLoginData.ts` | 112 | `DAILY_LOGIN_REWARDS` (7 Limited 5★ Chibis: `Cosmic Monarch`..`Ink Seraph`), `isNonSellableChibi` (Limited + Fusion + Twin + Omega), `getDailyLoginLimitedChibiIds`, `getDailyLoginRewardByChibiId` |
| `src/game/DailyLoginDomain.ts` | 101 | `getLocalDateKey`, `getNextDailyLoginDayDomain`, `canClaimDailyLoginDomain`, `getDailyLoginSnapshotDomain`, `claimDailyLoginDomain` |
| `src/game/PremiumShopData.ts` | 168 | `PREMIUM_SHOP_ITEMS` (`Yukikage`..`Clockwork Twins`, Spire Coins `50..120`, `dpsMult` `2.3..4.1`, `upgradeCostMult` `11..25`), `computeTwinScaledBaseDps`, `computeTwinUpgradeCostScale`, `getTwinPassiveStarScale`, `getActivePremiumPassiveBonuses`, `buyPremiumShopChibiDomain` |
| `src/game/IndexRewardsDomain.ts` | 336 | `ALL_INDEX_TABS` `58` (13 tabs), `INDEX_MILESTONES` `180` (50%/100% per tab: Gems/Dice + passive), `getIndexTabProgressDomain`, `getReadyIndexRewardCountDomain`, `claimIndexRewardDomain`, `getActiveIndexPassiveBonusesDomain` |
| `src/game/TeamPresetsDomain.ts` | 84 | `TEAM_PRESET_COUNT` (3), `createEmptyTeamPresets`, `isTeamPresetPopulated`, `saveTeamPresetDomain`, `applyTeamPresetDomain` |
| `src/game/AchievementsDomain.ts` | 278 | `ACHIEVEMENT_CATEGORIES` (8 categories × Tier I–V = 40 tiers, `+1% All DMG`/tier), `CareerStats`, `getReadyAchievementCountDomain`, `claimAchievementTierDomain`, `getAchievementAllDmgBonusDomain` |
| `src/game/LootChestDomain.ts` | 446 | `LootChestContext` `19`, `getChestItemCountDomain` `57`, Hotbar 1–9 (`swapHotbarSlotsDomain` `85`, `removeFromHotbarDomain` `122`, `toggleHotbarItemDomain` `136`), `shouldAutoSellOreDomain` `180`, `onOreBrokenDomain` `221`, `onMeteorBrokenDomain` `273`, `takeAllFromChestDomain` `362`, `isChestFullBonusReadyDomain` `390`, `sellAllChestOresDomain` `418` (+35%), `toggleAutoSellDomain` `432` |
| `src/game/ShopWeatherDomain.ts` | 389 | `ShopWeatherContext` `22`, `sellOreDomain` `71`, `sellAllOresDomain` `86`, `sellMinerDomain` `145` (protects `isNonSellableChibi`), `refreshPickaxeStockIfDueDomain` `160`, `buyPickaxeDomain` `183`, `sellBatchDomain` `230`, `buyGemShopItemDomain` `262`, `useGemPotionDomain` `276`, `isBoostActiveDomain` `304`, `scaleWeatherMultDomain` `326`, `syncWeatherDomain` `369`, `forceWeatherDomain` `381` |
| `src/game/WeatherData.ts` | 187 | `WeatherId` `1`, `WEATHER_DURATION_MS` (3m) `3`, `WEATHERS` `33` (Celestial 5%: 10x Ore / 4x Gem / 5x DMG), `getWeatherById` `175`, `rollWeatherDef` `179` |
| `src/game/OfflineEarningsDomain.ts` | 187 | `OFFLINE_MIN_SEC` (2m), `OFFLINE_MAX_SEC` (8h), `OFFLINE_EFFICIENCY` (0.5), `MAX_OFFLINE_ORES_PER_SEC` (3.5), `MAX_OFFLINE_GEMS` (15K), `RETURN_RUSH_DURATION_SEC` (10m boost >= 1h offline), `formatOfflineDuration`, `computeOfflineEarningsDomain`, `claimOfflineEarningsDomain` |
| `src/game/BountiesDomain.ts` | 250 | `BOUNTY_SLOT_COUNT` (3), `BountyKind` (7 aktivitas), `generateBountyEntry`, `ensureBountiesPopulatedDomain`, `recordBountyProgressDomain`, `getReadyBountyCountDomain`, `claimBountyDomain` |
| `src/game/OverclockDomain.ts` | 250 | `OVERCLOCK_DURATION_SEC` (15s), `OVERCLOCK_MAX_DURATION_SEC` (25s), `OVERCLOCK_SWEET_SPOT_CHARGE` (15%), `OVERCLOCK_METEOR_EXTEND_SEC` (5s), `OVERCLOCK_PIT_EVENT_EXTEND_SEC` (4s), `OVERCLOCK_GEODE_EXTEND_SEC` (1.5s), `getOverclockTierBuffs` (Tier 1–3), `chargeOverclockDomain`, `extendOverclockDomain`, `stepOverclockDomain`, `getOverclockSnapshotDomain` |
| `src/game/PitEventsDomain.ts` | 60 | `PIT_EVENT_DEFS` (`golden_vein` 5× Ore Drops, `crystal_surge` 3× Fever + Bonus Gems), `rollNextPitEventCooldownSec`, `rollPitEventKind`, `computePitEventBonusGems` |
| `src/game/UpgradeBulkHelper.ts` | 49 | `UpgradeBuyMode` (`'1'\|'10'\|'max'`), `getPlotStatUpgradeCost`, `computeBulkUpgradePlan` |
| `src/game/TapComboHelper.ts` | 33 | `TAP_COMBO_WINDOW_MS` (1350ms), `stepTapCombo`, `getTapComboTier` (`cool`..`godlike`) |
| `src/game/GameSettings.ts` | 150 | `GameSettings` (`mam_settings_v1`, default `graphicsQuality: 'low'`, incl. `cameraLocked`), `GRAPHICS_PRESETS` (`1.25×`/`1.5×`/`2×`), `normalizeGameSettings`, `gameSettings` |
| `src/game/NumberFormat.ts` | 45 | `fmtShort` `22`, `fmtMoney` `33`, `fmtInt` `37`, `fmtPct` `41` |
| `src/game/AssetUrl.ts` | 11 | `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./`) |

### UI HUD, Modals & CSS (`src/ui/`, `src/styles/`)

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/ui/GameHud.ts` | 1.062 | Thin UI coordinator: `activeModal`, `sceneMode`, `inspectedSlot`, `adPaused`, CSS `zoom` scaling (`updateViewportScale`), `Shop`/`Upgrades`/`Index` rails, toast stack, `isTutorialActive`, `updateSweetSpot`, `updateFps`, `setOnModalVisibilityChange`, `spawnLootVacuum`, `250ms` coalescer, `setFusionRevealHold`, Omega bridge & `TwinSummonCutscene` hooks |
| `src/ui/HudActionRouter.ts` | 393 | `renderActiveModalHtml`, `buildHudCoordinatorActions`, `updateHudCurrencyAndBadges`, `stepHudSlowTick`, `stepHudFastTick` |
| `src/ui/HudChromeRenderer.ts` | 414 | `renderAudioControlsHtml` (FPS pill + Camera Lock), `renderCurrencyRailHtml`, `renderMineQuickButtonsHtml`, `renderMineChromeHtml`, `renderFeverScreenFxHtml`, `syncFeverScreenFxDom` |
| `src/ui/HudTowerBridge.ts` | 195 | Tower combat HUD bridge: `syncTowerSceneVisual`, `handleTowerTargetClick`, `handleTowerFighterStrike`, `handleTowerMonolithClick`, `0.01%` `TWIN` jackpot toast |
| `src/ui/HudOmegaBridge.ts` | 154 | Omega Boss duel bridge: `startOmegaBattle`, `syncOmegaSceneVisual`, `handleOmegaTapInvulShield`, `handleOmegaFighterStrike`, `handleOmegaTargetClick`, `handleOmegaBossClick`, `handleOmegaParryClick` |
| `src/ui/HudShared.ts` | 633 | `chibiPortraitHtml`, `ModalKind`/`ModalThemeId`/`InvTab`/`PlotDropOps`, `rarityCardClasses`, `renderRarityBadgeHtml`, `renderMutationBadgeHtml`, `rarityVars`, `applyInspectRing`, `classifyToast`, `renderToastBannerHtml`, `formatCountdownTimer`, `refreshPotionTimersInDom`, `captureRootScrolls`/`restoreRootScrolls`, `TW_*` constants, `renderModalShell`, `shouldDismissModalBackdrop`, `renderInspectorPanel`, `buildEnchantHoverCardHtml`, `bindEnchantHoverInspector` |
| `src/ui/HudIcons.ts` | 432 | SVG & 2D art icon helpers (`HUD_ICONS`, `hudIconHtml`, `weatherIconHtml`, `towerIconHtml`, `omegaCrestIconHtml`, `spireCoinIconHtml`, `towerBlessingIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`, `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml` `326`) |
| `src/ui/LootVacuumFx.ts` | 286 | `spawnLootVacuumParticles`, `getLootVacuumBurstPlan`, `bounceHudPill`, `rollHudCurrencyValue`, `triggerPerfectStrikeFlash` |
| `src/ui/WeatherDpsHudUi.ts` | 724 | Weather widget, Forecast + Meteor popover, Auto Meteor toggle, `buildWorldSynergyBadgesHtml`, Active Potions + Return Rush dock, DPS pill + Breakdown popover, Overclock Fever Tier 1–3 gauge (`formatWeatherTimer`, `buildActivePotionsDockContent`, `buildWeatherWidgetInnerHtml`, `buildDpsMeterInnerHtml`, `buildOverclockGaugeInnerHtml`) |
| `src/ui/HotbarHudUi.ts` | 428 | Tactical Hotbar Dock (`1–9`), outside-click clear, & pointer drag-and-drop (`buildHotbarStateKey`, `canDropHotbarOnPlot`, `renderHotbarSlotsHtml`) |
| `src/ui/AltarShopHudUi.ts` | 467 | `renderShopWorldHudHtml` (Shop Plaza dock + `Omega` CTA), `renderAltarStripCardsHtml` (Enchant Altar HUD + Hover Inspector), `triggerSingleEnchantRoll` |
| `src/ui/FusionHudUi.ts` | 467 | `renderAltarChoiceModal` (Altar Gateway) & `renderFusionWorldHud` (5-card recipe strip, workbench, `3.65s` Glass-Shard Fracture + 16-note crystal scale, Reveal Card + `dismiss-fusion-reveal`) |
| `src/ui/WorldOverlayHudUi.ts` | 872 | 7 floating `document.body` layers (`plotOverlayLayer`, `oreBarLayer`, `sweetSpotLayer`, `dmgPopupLayer`, `shopOverlayLayer`, `shopBubbleLayer`, `omegaOverlayLayer` Parry Reticle & `TAP!` callouts), `buildPlotLabelPayload`, `buildMineOreBarsHtml`, `buildTowerOreBarsHtml` |
| `src/ui/IndexModalUi.ts` | 629 | `IndexModalUi` `33`: `X/127 Found` bar, Left Collection Sidebar (Worlds W1–W8 + Special Tiers), 13 tabs, `.mam-index-maxed-stamp`, `is-holo-foil`, live updaters |
| `src/ui/IndexInspectorUi.ts` | 375 | Extracted Index inspector & Chibi 4-pose `Review` `<dialog>` (`buildInspectorHtml`, `openChibiReviewDialog`, `closeReviewDialog`) |
| `src/ui/InventoryModalUi.ts` | 661 | `InventoryModalUi` `33`: Equip Best, Auto Star-Up, Star-Up, Search, `T1`–`T3` Team Preset bar, Inspector & live updaters |
| `src/ui/ChestModalUi.ts` | 234 | `ChestModalUi` `16`: Auto-Sell rarity pills, Ore lock, capacity bar, Take All / Sell Ores +35% |
| `src/ui/ForgeModalUi.ts` | 447 | `ForgeModalUi` `46`: Relic Forge (`renderForgeModal`, 3 equipped slots, 12-relic grid, `renderForgeInspector`, `renderOreSourcePopup`, `handleAction`, `bindEvents`) |
| `src/ui/SettingsModalUi.ts` | 194 | Graphics Quality `Low`/`Medium`/`High`, BGM/SFX sliders, Mute All, Damage Popups toggle |
| `src/ui/OfflineModalUi.ts` | 165 | Welcome Back modal, offline summary, 10m Return Rush card, Claim & `CG_ADS_ENABLED` 2x Ad Claim |
| `src/ui/BountiesModalUi.ts` | 113 | Mining Bounties modal (3 rotating contracts, progress bars, Claim & auto-refill) |
| `src/ui/AchievementsModalUi.ts` | 239 | 2-tab Achievements (Tier I–V Medal Frames) & Career Stats modal |
| `src/ui/DailyLoginModalUi.ts` | 152 | 7-Day Daily Login modal (scrollable Day 1–7 cards + horizontal Day 7 Apex finale, pinned Claim CTA) |
| `src/ui/ShopModalsUi.ts` | 829 | `ShopModalsUi` `48`: Pickaxe Shop, Gem Shop, Sell Shop, & Premium Shop (`renderPremiumShopModal` w/ Spire Coins, triggers `TwinSummonCutsceneController`) |
| `src/ui/TwinSummonCutscene.ts` | 617 | `TwinSummonCutsceneController`: Fullscreen (`z-[70]`) Three.js GLSL Cyber-Prism / Binary Star cutscene saat beli Chibi `TWIN` |
| `src/ui/TowerUi.ts` | 627 | `TowerUi` `25`: Gem Tower Hub modal (`renderTowerHubModal` `59`: World Hero Banner, `Twin Shop →`, 2-tab sidebar, Floor 80 Tamat, Checkpoints/Milestones, Anomalies, Quick Sweep, 4-pip Dice Pity, Near-Miss/Last Run, Instant Retry) |
| `src/ui/TowerArenaHudUi.ts` | 599 | Battle Tower HUD (`renderTowerArenaHud` w/ random 2D `TWIN` Boss, 10-tick HP bar, single-row `.mam-battle-dock` + popover, Blessing Overlay w/ preview & Reroll, 5s Boss Shield-Break, 5s auto-pick) |
| `src/ui/OmegaBossModalUi.ts` | 505 | Omega Duel Sanctum Hub (`omega-boss` theme, Boss tabs + `50K` Keys, 5-tier table, Forge panel, `▶ Cutscene` replay & Unlock/Awaken -> `OmegaForgeCutsceneController`) |
| `src/ui/OmegaForgeCutscene.ts` | 601 | `OmegaForgeCutsceneController`: Fullscreen (`z-[70]`) Three.js GLSL Singularity Vortex + Meteor + 90ms Sakuga Impact Frame + Silhouette-to-Color reveal |
| `src/ui/OmegaArenaHudUi.ts` | 574 | Raid Boss Battle HUD (10-tick HP, Sky-Drop banner, 30s Invul Shield screen-tap targets, Stagger/OMEGA BREAK gauge, Victory & Defeat Popups) |
| `src/ui/OmegaBattleIcons.ts` | 146 | `omegaBattleIconHtml`: 13 sculpted Raid Boss combat SVGs |
| `src/ui/TutorialUi.ts` | 659 | 5-stage responsive FTUE (`pose.webp` pop-out, `.mam-tut-target-ring`, `?tutorial=1`, Starter Bonus +150 Gems & +1 Dice) |
| `src/ui/UpgradesWorldsUi.ts` | 546 | `UpgradesWorldsUi` `18`: Research/Upgrades tree & delegasi World Teleport ke `WorldsModalUi` |
| `src/ui/WorldsModalUi.ts` | 356 | World Teleport full-banner modal (`public/worlds/*.webp`, `i` World Synergy Combo overlay) |
| `src/ui/PlotInspectUi.ts` | 696 | `PlotInspectUi` `49`: Plot Inspector (★Star, passive chips, World Resonance, Enchant Hover Inspector, Bulk Upgrades `×1/×10/MAX`, Auto-Roll Mutation `Frozen+` + `renderMutationConfirmOverlay`) |
| `src/styles/global.css` | 296 | Tailwind v4 entry (`@import "tailwindcss";`) + `Rubik`/`Fredoka`, pickaxe cursor, `.mam-pickaxe-combo`, hold-mine spark styles |
| `src/styles/hud.css` | 7 | Entry stylesheet mengimpor 7 partial CSS Sticker-Pop Deluxe di bawah ini |
| `src/styles/hud-base.css` | 613 | Base tokens Warm Cream, modal shell, `.mam-pill*`, `.mam-no-scrollbar`, `content-visibility: auto` |
| `src/styles/hud-rarity.css` | 630 | Rarity badges (`.mam-rarity-badge`), `.mam-mut-badge`, `.is-holo-foil`, `body.mam-quality-low` |
| `src/styles/hud-fx.css` | 410 | Fever FX strip, `.mam-sweet-spot-reticle`, `.mam-vacuum-orb`, `.is-hud-bounce`, toasts |
| `src/styles/hud-modals.css` | 642 | Layout modal, wing rails, inspector wells, & grid kartu |
| `src/styles/hud-hotbar.css` | 619 | Tactical Hotbar Dock (`1–9`), keycaps, drag/selection states |
| `src/styles/hud-widgets.css` | 481 | Weather widget, DPS breakdown, Overclock Fever gauge, FTUE tutorial |
| `src/styles/hud-battle.css` | 964 | Battle Tower & Omega Raid Boss HUD, 10-tick HP bar, Victory/Defeat & Parry overlays |

### 3D World & Renderers (`src/game3d/`)

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/game3d/MineScene3D.ts` | 1.287 | Main Three.js scene controller: mode `mine`/`shop`/`altar`/`fusion`/`tower`/`omega` + lazy builders, `EffectComposer` + `UnrealBloomPass` + `ImpactFrameShader`, `1024×1024` shadow map, default `'low'`, `ResizeObserver`, 30Hz low DOM emit, `setCameraLocked`/`applyCameraOrbitDrag`/`clampCameraZoomRadius`, `setModalBackdropThrottled`, `onFpsUpdate`, `setOverclockActive`, Fusion/Omega hooks, Sweet-Spot, `destroy()` |
| `src/game3d/MineSceneStage3D.ts` | 315 | `buildMineStageAndChest`, `applyMineWeatherAtmosphere` (incl. `isTower` & `isFusion`), `stepMineSceneCamera` |
| `src/game3d/MineSceneInput.ts` | 488 | `bindMineSceneEvents` (drag/orbit/hover/click, 2-finger pinch zoom, hold-to-mine, wheel), `raycastAtInScene`, `getPitFloorHitInScene`, `getPedestalAtClientPosInScene`, `performMineTapAtInScene` |
| `src/game3d/MineSceneProjector.ts` | 258 | `MineSceneProjector`: `projectWorldToScreen`, `emitSweetSpot`, `emitTowerSweetSpot`, `emitOreBars`, `emitDamageScreen`, `emitPlotAnchors`, `emitModeOverlays` |
| `src/game3d/MineEnvironment3D.ts` | 679 | Cyber-industrial deck terrain (`skyHandle`, `setWeatherSky`, `setLowQuality`), Holo-Display `"My Chibi Minerr"` Gantry (`z = -6.45`), lantern bollards, `20` GPU mana motes, city pillars + catenary cables, `CaveRailway3D` & `ChestVaultStation3D`, `dispose()` |
| `src/game3d/MeshHelpers3D.ts` | 354 | `getActiveTextureAnisotropy`, `applySharpSpriteTexture`, `configureSceneTextureSharpness`, `enableShadows`, `disposeObject3D`, `createChamferRectShape`, `createChamferSlabGeometry`, `createExtrudedProfileGeometry`, `createChamferPanelXYGeometry`, `createLatheProfileGeometry`, `mergeStaticMeshesByMaterial` |
| `src/game3d/CaveRailway3D.ts` | 882 | Left-wing Cyber Mine Elevator / Drop Shaft (`createCaveRailway` `290`), `createCyberRadarArray`, Portal Arch, maglev guideway (`InstancedMesh`), & Cyber Ore Pod shuttle |
| `src/game3d/ChestVaultStation3D.ts` | 615 | Right-wing Plasma Ore Refinery (`createChestVaultStation` at `z = 0.15`), cyclotron drum, plasma conduit, lantern pylons & neon escalator `InstancedMesh` cleats |
| `src/game3d/ProceduralTreasureChest3D.ts` | 383 | `createProceduralTreasureChest`, `createExtrudedSlabGeometry`, re-exports `disposeObject3D`/`enableShadows` |
| `src/game3d/CyberProps3D.ts` | 490 | `createCyberRadarArray` `131`, `createCyberLanternBollardFinial` `298`, `createCyberMonolithForkFinial` `346`, `createCyberCrystalCluster` `388`, `createCyberBotanicalCanopy` `447`, `disposeCyberProp` `41` |
| `src/game3d/WeatherSkyShader.ts` | 249 | `createWeatherSkyMaterial` `184`: GLSL sky gradient, FBM clouds (`uLowQuality` 2-octave), stars/nebula, Bloodmoon & Celestial moons |
| `src/game3d/WeatherFx3D.ts` | 335 | `WeatherFx3D` `76`: 3D weather particles + Fever Rain streaks (`setFeverTier`), `setShopMode()`, `setQualityScale()`, `dispose()` |
| `src/game3d/MineWorldPalette.ts` | 135 | `WORLD_PALETTES` `27` (8 worlds), `BASE_PIT_NODE_COUNT` (5), `MAX_PIT_NODE_COUNT` (20), `ORE_VARIANTS`, `rollOreVariant` |
| `src/game3d/OreBillboard3D.ts` | 485 | `OreBillboard2D` (merged basalt rubble + crystal collar, crater AO, squash-on-hit) + `applySharpSpriteTexture`, `getSoftContactShadowTexture`, `getGeodeGlowTexture`, `loadPublicSpriteTexture` |
| `src/game3d/OrePit3D.ts` | 1.009 | `PIT_NODE_COUNT = 5`, `PIT_CENTER_Z = 1.85`, `PIT_HALF_W = 4.8`, `PIT_HALF_D = 3.45`, `BASE_ORE_RESPAWN_SEC = 3.5`, `METEOR_HP_MULT = 375`, `computeMeteorDynamicHp`, `applyNodeDamagePure`, `isSweetSpotWindowPure`, `update(..., renderVisuals)`, `setLowQuality`, `spawnSweetSpot`, `consumeSweetSpotTap`, `getAliveNodesInfo`, `dispose()` |
| `src/game3d/OrePitStage3D.ts` | 607 | `buildOrePitEnvironmentMeshes`, `buildOrePitMeteorAndSpotFx`, `stepOrePitMeteorDrop`, `spawnOrePitShards`, `stepOrePitShards`, `updateSweetSpotRingMesh`, `resolveWorldIdFromPalette`, `pickWorldOreForVariant` |
| `src/game3d/AttackImpactFx3D.ts` | 781 | `AttackImpactFxController` `88` (pooled 5-layer cyber-anime impact/shatter + meteor trail/landing, `setLowQuality`, `dispose()`) |
| `src/game3d/PlotPedestal3D.ts` | 1.020 | `PLOT_PODIUM_SCALE = 1.5` Cyber-Showcase Plot Podiums (`idle` on podium), `01..05` apron, dual-shell Anime Aura (`setLowQuality`), `triggerChibiCast` (podium ring + aura pulse), `triggerChibiAttack`, `triggerChibiBlitz`, `setChibiFacing`, `getAttackOriginWorldPosition`, `getActiveAccentColor`, `dispose()` |
| `src/game3d/PlotAuraFx3D.ts` | 335 | `ENCHANT_SECONDARY_COLOR` `3`, `getPedestalHoloRingTexture`, `getEnchantSigilTexture`, `createAnimeAuraShaderMaterial`, `createAnimeParticlePoints` |
| `src/game3d/SignatureProjectilePool3D.ts` | 524 | Shared pooled signature projectiles (`getChibiAttackStyle`: `crescent`/`beam`/`star`/`twin`/`meteor`, 20-slot/12-low pool) |
| `src/game3d/MeshFx3D.ts` | 2.415 | Custom GLSL anime VFX shaders & 3D weapon/prop geometries (`ImpactFrameShader`, Slash/Fresnel/Energy/Orbital/Vortex/Rift, `createBladeMeshGeometry`, `createAbyssalGreatswordGeometry`, `createSpikedHaloGeometry`, `createCrimsonTsubaHaloShaderMaterial`, `createCrimsonKatanaShaderMaterial`, `createRoninKatanaGeometry`, `createObsidianCrownHaloShaderMaterial`, `createObsidianGreatswordShaderMaterial`, `createYukikageFrostSealShaderMaterial`, `createClockworkDialShaderMaterial`, `createClockworkGearGeometry`, `createAcademyWingGeometry`, `createHeldFrostSlashShaderMaterial`, `createYukikageShrineRingShaderMaterial`, `createYukikageKunaiShaderMaterial`, `createKunaiGeometry`, `createHalcyonRainShaderMaterial`, `createHalcyonPortalRippleShaderMaterial`, `createArrowGeometry`, `createNocturneWingShaderMaterial`/`Geometry`/`Meteor`/`CometTail`/`EclipseCrater`, `createLullabyWhiteWing`/`PinkAura`/`AngelWing`/`GothicMirrorCage`/`CrescentMoon`, `createClocktowerShaderMaterial`/`InvertedClocktower`) |
| `src/game3d/TierAttackVfx3D.ts` | 3.178 | `TierAttackVfxPool3D` (`CHIBI_ATTACK_ANIM_SEC = 2.5`, `CHIBI_BLITZ_SHADOW_SEC = 0.88`, `BARRAGE_BEAT_WEIGHTS = [0.25, 0.3, 0.45]`, `BARRAGE_FOLLOWUP_DELAYS = [0.75, 1.55]`, `splitBarrageDamage`, `computeAttackVfxSpeedScale`, `firePodiumWeaponCast` from behind podium, `fireAnticipation`, `fireTierAttack`, 13-tier + bespoke Tier OMEGA & 5 Tier TWIN multi-phase choreographies incl. Yukikage Sumi-e Ink & Glacial Spires, `buildTierMotionWaypoints`, `sampleTierMotionWaypoints`) |
| `src/game3d/PlotAttackController3D.ts` | 528 | Mine Plot-to-Pit controller (`pendingStrikes` 3-beat barrage `0.2s / 0.95s / 1.75s` -> `TierAttackVfxPool3D` 2.5s VFX + `firePodiumWeaponCast` & `triggerChibiCast`, `getAoeTargetCount` `3..6`, `setTierVfxHooks`, `setLowQuality`) |
| `src/game3d/FieldMiner3D.ts` | 371 | Active chibi miner placement & `ChibiFieldFxController` (dipakai di `TowerArena3D` & spec kompatibilitas), 3-beat swing & `dispose()` |
| `src/game3d/ChibiCatalog.ts` | 803 | `LEFT_FACING_WALK_IDS` `39`, `LEFT_FACING_ATTACK_IDS` `51`, `CHIBI_CATALOG` `69` (64 chibis: 40 W1–W8 + 5 weather + 5 `fusion` + 7 `limited` + 5 `twin` + 2 `omega`), `getChibiFrameUvOffset` `799` |
| `src/game3d/ChibiSprite3D.ts` | 1.497 | 2D-in-3D billboard sprite: 3-beat `triggerAttack`, `triggerPodiumCast` (podium glint + back-aura pulse while staying `idle`), `triggerBlitz`, always-on Tier TWIN & Tier OMEGA 3D back-attachments (`chibiBackAttachmentGroup` incl. Crimson Ronin Tsuba HUD Halo + 8 Katana Fan & Obsidian Sovereign Crown HUD Halo + 7-Spiked Crown + Colossal & 4 Floating Greatswords, `updateBackAttachmentGroup`, `shouldShowBackAttachment`), `setAccentColor`, `setHologramMode`, `getPoseDisplayMeta`, `applySharpSpriteTexture`, `getTierBadgeAnchorLocal`, `dispose()` |
| `src/game3d/FusionWorld3D.ts` | 770 | Clean-Tech Secret Lab Bunker controller (`2.8×` APEX & `1.48×` Stasis Tube podiums, Crescent Arc, 4 ore vats, hologram preview, `revealHold` zoom lock, `dispose()`) |
| `src/game3d/FusionLabBunker3D.ts` | 833 | Lab Bunker architecture (`buildLabBunkerFloorDeck`, `buildLabBunkerWallsAndCryoBays`, `buildLabCeilingCanopyAndArms`, `buildLabOperatorConsoles`, `buildOreContainmentVat`) |
| `src/game3d/FusionSequence3D.ts` | 667 | `3.65s` Chibi-Art Glass Fracture & 1-by-1 Reassembly (`buildFusionGlassShards`, `initFusionGlassShards`, `stepFusionWorldUpdate`) |
| `src/game3d/FusionWorldArena3D.ts` | 136 | `buildElevatedShowcaseStage`, `buildPerimeterTechPylons` |
| `src/game3d/FusionWorldPodium3D.ts` | 547 | `createCyberShowcasePodium` & `createLabTubePodium` |
| `src/game3d/ShopCyberPlaza3D.ts` | 864 | `createShopCyberPlaza` `42`: roundabout + fountain, road lanes, botanical trees & fork pylons, `InstancedMesh` props, wing helipads + `omega-left`/`omega-right` pads `(±17.6, -9.6)`, 3 `PointLight`s, `dispose()` |
| `src/game3d/ShopCyberPlazaKiosks3D.ts` | 515 | 4 container kiosks (Pickaxes, Sell, 2-story Gem Shop, Relic Forge) + Cargo Dock (`buildPlazaCyberKiosks`) |
| `src/game3d/ShopCyberPlazaAssets3D.ts` | 888 | `createCyberPlazaFloorTexture`, `createHologramSignTexture`, `createRoundaboutShadowTexture`, `buildPlazaOmegaBossPad`, `buildPlazaGemTowerSkyscraper` |
| `src/game3d/ShopWorld3D.ts` | 738 | `ShopWorld3D` `145`: Plaza walkers, 6 building emblems (`ArtBillboard2D`), 2 giant `omega-left`/`omega-right` guardians (`scale 9.45`), raised station badges, `dispose()` |
| `src/game3d/OmegaArena3D.ts` | 1.210 | Omega Skyscraper Rooftop Arena: stepped Lathe Boss Dais, Sky-Drop Entrance, Invul Shield dome, Boss & 5 stationary `idle` Chibi Podiums (`triggerPodiumCast` + `firePodiumWeaponCast` + `2.5s` VFX + `pendingBarrages` 3-beat `25%/30%/45%`), `SignatureProjectilePool3D` + `TierAttackVfxPool3D`, `scale 3.15` Boss, Phantom Blade/Obsidian Pillar/Rune Seal props, `dispose()` |
| `src/game3d/OmegaRooftopEnvironment3D.ts` | 621 | `createOmegaRooftopEnvironment`: Sunset sky dome, helipad deck + 38m shaft, 20 multi-tier skyscrapers w/ `InstancedMesh` windows/shards, beacons & city mist |
| `src/game3d/OmegaRooftopAssets3D.ts` | 718 | Rooftop textures (`createOmegaSunsetSkyTexture`, `createRooftopHelipadTexture`, `createRooftopBillboardTexture`, `createOmegaBossCircleTexture`, `createCityMistTexture`), `normalizeHorizontalSlabUVs`, `buildRooftopHvacUnit`, `buildRooftopBulkhead`, `buildRooftopSpotlightTower`, `buildRooftopBillboard`, `buildRooftopCommandBackdrop` |
| `src/game3d/EnchantAltarRoom3D.ts` | 623 | `buildEnchantAltarRoom`: Center Cyber-Chrono Core + 10 Enchant Podiums `"01".."10"`, radial conduits, outer ring, floating islands & monoliths |
| `src/game3d/HellAltarEye3D.ts` | 373 | `HellAltarEyeController` `151`: Outer Space starfield, cosmic floor ring, & Black Hole |
| `src/game3d/AltarSpinFx3D.ts` | 936 | `createAltarClockDial` `63`, `createAltarClockHand` `305`, `createAltarSubHand` `591`, `AltarParticleSystem` `715` |
| `src/game3d/AuraModels3D.ts` | 586 | `createEnchantAura3D` `276`, `createEnchantDice3D` `318`, `ArtBillboard2D` `413`, `EnchantBillboard2D` `577` |
| `src/game3d/SeraphimBoss3D.ts` | 954 | `createSeraphimBoss3D` (sculpted Corrupted Seraphim Boss, zero `BoxGeometry`), `update()`, `dispose()` |
| `src/game3d/SeraphimBossParts3D.ts` | 543 | `buildSeraphimHelmet`, `buildSeraphimWings` |
| `src/game3d/SeraphimBossGeometry3D.ts` | 269 | `createSculptedPlateGeometry`, `createLatheProfileGeometry`, `createTaperedTubeGeometry`, `createCurvedFeatherBladeGeometry`, `orientGroupAlongVector` |
| `src/game3d/TowerArena3D.ts` | 1.277 | Battle Tower combat/entity controller (`BOSS_CENTER_Z = -3.25`, random 2D `TWIN` Wave-10 Boss, Shield-Break Sweet-Spot, 5 wave ores, stationary `idle` Chibi Podiums + `triggerPodiumCast` + `firePodiumWeaponCast` + `2.5s` VFX + `pendingBarrages` 3-beat `25%/30%/45%`, `SignatureProjectilePool3D` + `TierAttackVfxPool3D`, `AttackImpactFxController`, `dispose()`) |
| `src/game3d/TowerArenaStage3D.ts` | 566 | `buildTowerArenaStage`, `stepTowerBossFeetFx`, `spawnTowerArenaShards`, `stepTowerShardPool` |
| `src/game3d/TowerCityEnvironment3D.ts` | 720 | `createTowerCityEnvironment` `52`: daytime sky/fog, holed highway, recessed crater, embers/ash/sparks, guardrails, streetlights |
| `src/game3d/TowerCitySkyscrapers3D.ts` | 356 | `buildTowerRuinedSkyscrapers` (22 ruined skyscrapers, instanced window grids & rooftop props) |
| `src/game3d/TowerCityAssets3D.ts` | 550 | Tower City geometries (`createGuardrailBeamGeometry`, `createHoledHighwayGeometry`, `createShatteredGlassShardGeometry`, `createJaggedCraterFissureGeometries`) & textures |
| `src/game3d/HudIcon3DRenderer.ts` | 785 | Offscreen WebGL fallback renderer (`init3dHudIcons`, 4 `other_*` icons on idle + `disposeObject3D`) |
| `src/game3d/HudIconOreModelsA3D.ts` | 653 | Procedural 3D ore icon builders W2–W4 + `toonMat` |
| `src/game3d/HudIconOreModelsB3D.ts` | 524 | Procedural 3D ore icon builders W5–W6 + `buildOreModel` |
| `src/game3d/ProceduralTextures3D.ts` | 816 | Procedural cyber-slate (`mixHex`) & VFX textures w/ anisotropy (`paintCachedTexture`, `getFusionMagicCircuitTexture`, `getFusionPortalVortexTexture`, `getRuneSealTexture`, `getGroundCrackTexture`, `getFlamePuffTexture`) |
| `src/game3d/GlbAssets3D.ts` | 135 | `mountGlbProp` `45`, `preloadCommonMineModels` `116` |

### Assets (`public/`)

| Folder | Jumlah File | Isi |
|---|---|---|
| `public/audio/` | 29 | CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`), 24 SFX (`sfx/*.ogg\|wav\|mp3`), `LICENSE.txt` |
| `public/badges/` | 2 | Custom animated tier crest emblems (`twin.svg`, `omega.svg`) |
| `public/chibi/` | 256 | 64 chibis × 4 poses (`attack`, `idle`, `pose`, `walk` `.webp` RGBA 300px) |
| `public/enchants/` | 11 | 10 fantasy aura icons (`blazing`..`spellbound`) + `enchant_dice.webp` |
| `public/hud/` | 18 | HUD & modal art icons (`shops`..`lock`, incl. `tower_boss.webp` & `game_banner.webp`) |
| `public/meteors/` | 5 | Weather Meteor sprites (`light_rain`, `snow_rain`, `bloodmoon`, `void`, `celestial`) |
| `public/models/` | 612 | Kenney & fantasy `.glb` packs (`castle/`, `factory/`, `fantasy-town/`, `mini-dungeon/`, `modular-cave/`, `nature/`, `platformer/`, `retro-fantasy/`, `survival/`, `train/`) |
| `public/ores/` | 63 | 58 W1–W8 ores (`underground`..`chrono`) + 5 weather-limited ores |
| `public/pickaxes/` | 12 | Pickaxe art icons (`starter`..`starwellcrown`) |
| `public/potions/` | 8 | Potion art icons (`ore-elixir-1`..`mutation-luck-1`) |
| `public/relics/` | 12 | Relic Forge 384×384 icons (`miner_lantern`..`commander_banner`) |
| `public/research/` | 13 | Research Node 256×256 icons (`strike`, `chibi_power`, `world_mastery`, dll.) |
| `public/weathers/` | 5 | Weather emblem icons (`light_rain`..`celestial`) |
| `public/worlds/` | 8 | World teleport banner WebPs (`underground`..`chrono`) |

---

## 3. QUICK TARGET LOOKUP (Edit Cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Miner (`Exotic`/`Secret`), Star-Up, World Resonance & Twin Anchor | `src/game/GameData.ts` (`ORES`, `WORLD_MINERS`, `CHIBI_STAR_TIERS`, `WORLD_RESONANCE_TIERS`, `computeWorldResonances`, `getLatestWorldScaleAnchor`, `getWorldUpgradeCostScale`) |
| Chibi Catalog, Facing Flags & 4-Pose Sprites | `src/game3d/ChibiCatalog.ts` (`CHIBI_CATALOG`, `LEFT_FACING_WALK_IDS`, `LEFT_FACING_ATTACK_IDS`), `public/chibi/<id>/*.webp` |
| Research Tree Nodes, Core Strike/Vault & `denseOreScale` | `src/game/ResearchData.ts` (`CORE_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`), `src/game/ResearchWorldNodesData.ts` |
| Gem Tower Scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather Config, Probabilities & Multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State Facade, Research, Relics & Global Multipliers | `src/game/GameState.ts`, `src/game/GameMultipliersDomain.ts`, `src/game/ResearchRelicsDomain.ts`, `src/game/NumberFormat.ts`, `src/game/AssetUrl.ts` |
| Save/Load Migration, Plot Units, Enchants & Tower Combat | `src/game/GameStateSave.ts`, `PlotUnitsDomain.ts`, `TowerRunDomain.ts`, `LootChestDomain.ts`, `ShopWeatherDomain.ts` |
| HUD Coordinator, Chrome, Router, Loot Vacuum & Icons | `src/ui/GameHud.ts`, `HudTowerBridge.ts`, `HudActionRouter.ts`, `HudChromeRenderer.ts`, `LootVacuumFx.ts`, `HudIcons.ts` |
| Weather HUD, Synergy Badges, DPS Breakdown & Overclock Fever | `src/ui/WeatherDpsHudUi.ts`, `src/ui/HudChromeRenderer.ts`, `src/game/OverclockDomain.ts` |
| Hotbar 1–9, Bag Toggle & Plot Drag-and-Drop | `src/ui/HotbarHudUi.ts` |
| Shop Plaza Dock, Enchant Altar Strip & Hover Inspector | `src/ui/AltarShopHudUi.ts`, `src/ui/HudShared.ts` (`buildEnchantHoverCardHtml`, `bindEnchantHoverInspector`) |
| 3D World Overlays (Ore HP, Sweet-Spot, Popups, Plot Labels) | `src/ui/WorldOverlayHudUi.ts` |
| Settings, Offline + Return Rush, Bounties & Achievements | `src/game/GameSettings.ts`, `SettingsModalUi.ts`, `OfflineEarningsDomain.ts`, `OfflineModalUi.ts`, `BountiesDomain.ts`, `BountiesModalUi.ts`, `AchievementsDomain.ts`, `AchievementsModalUi.ts` |
| 5-Stage FTUE Tutorial & Starter Bonus | `src/ui/TutorialUi.ts`, `src/game/GameState.ts` (`grantTutorialStarterReward`) |
| Shared Modal/Inspector Shell & Backdrop Guard | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `shouldDismissModalBackdrop`, `TW_*`) |
| Pickaxe/Gem/Sell/Premium Shop (`TWIN` & GLSL Cutscene) | `src/ui/ShopModalsUi.ts`, `TwinSummonCutscene.ts`, `src/game/PremiumShopData.ts`, `DailyLoginData.ts` (`isNonSellableChibi`), `public/badges/twin.svg` |
| Gem Tower Hub Modal, 3D Arena HUD & Blessings | `src/ui/TowerUi.ts`, `src/ui/TowerArenaHudUi.ts` |
| Omega Duel Sanctum (Bosses, 5 Tiers, Forge Cutscene, Rooftop Arena) | `src/game/OmegaData.ts`, `OmegaBossDomain.ts`, `src/ui/OmegaBossModalUi.ts`, `OmegaForgeCutscene.ts`, `OmegaArenaHudUi.ts`, `OmegaBattleIcons.ts`, `HudOmegaBridge.ts`, `src/game3d/OmegaArena3D.ts`, `OmegaRooftopEnvironment3D.ts`, `public/badges/omega.svg` |
| Relic Forge (12 Relics, 3 Slot, Ore Source Pop-up) | `src/game/RelicData.ts`, `src/ui/ForgeModalUi.ts`, `public/relics/*.webp` |
| Index (13 Tabs, 127 Entries), Inventory + Presets & Chest | `src/game/IndexRewardsDomain.ts`, `TeamPresetsDomain.ts`, `src/ui/IndexModalUi.ts`, `IndexInspectorUi.ts`, `InventoryModalUi.ts`, `ChestModalUi.ts` |
| 7-Day Daily Login (`limited` 5★ Chibis) | `src/game/DailyLoginData.ts`, `DailyLoginDomain.ts`, `src/ui/DailyLoginModalUi.ts` |
| 3D Chibi Fusion World (Lab Bunker & Recipes) | `src/game/FusionData.ts`, `FusionDomain.ts`, `src/ui/FusionHudUi.ts`, `src/game3d/FusionWorld{3D,Arena3D,Podium3D}.ts`, `FusionLabBunker3D.ts`, `FusionSequence3D.ts` |
| Research Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts`, `src/ui/WorldsModalUi.ts` |
| Plot Inspector, `DMG Mult`/`Crit Chance`, Bulk Upgrades & Mutation Guard | `src/ui/PlotInspectUi.ts`, `src/game/UpgradeBulkHelper.ts`, `src/game/PlotUnitsDomain.ts` |
| Hold-to-Mine, Sweet-Spot, Tap Combo & Pit Events | `src/game3d/MineScene3D.ts`, `MineSceneInput.ts`, `OrePit3D.ts`, `src/game/TapComboHelper.ts`, `PitEventsDomain.ts`, `src/styles/global.css` |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` (`hud-{base,rarity,fx,modals,hotbar,widgets,battle}.css`), `src/ui/HudShared.ts` |
| Audio (BGM, Musical Combo Scale, Synth SFX, Mute) | `src/audio/AudioManager.ts`, `public/audio/` |
| 3D Sky, Weather, Pit, Pedestals, Blitz VFX & 3D Icons | `src/game3d/MineScene{3D,Stage3D,Input,Projector}.ts`, `MineWorldPalette.ts`, `Weather{SkyShader,Fx3D}.ts`, `Ore{Billboard3D,Pit3D,PitStage3D}.ts`, `Plot{Pedestal3D,AuraFx3D,AttackController3D}.ts`, `SignatureProjectilePool3D.ts`, `MeshFx3D.ts`, `TierAttackVfx3D.ts`, `FieldMiner3D.ts`, `AttackImpactFx3D.ts`, `ChibiSprite3D.ts`, `ProceduralTextures3D.ts`, `HudIcon{3DRenderer,OreModelsA3D,OreModelsB3D}.ts`, `MeshHelpers3D.ts`, `GlbAssets3D.ts` |
| 3D Chest Vault, Escalator, Radar & Pillar Props | `src/game3d/CyberProps3D.ts`, `ProceduralTreasureChest3D.ts`, `ChestVaultStation3D.ts`, `CaveRailway3D.ts`, `MineEnvironment3D.ts` |
| 3D Shop Plaza, Enchant Altar & Tower Arena | `src/game3d/Shop{CyberPlaza3D,CyberPlazaKiosks3D,CyberPlazaAssets3D,World3D}.ts`, `EnchantAltarRoom3D.ts`, `AuraModels3D.ts`, `HellAltarEye3D.ts`, `AltarSpinFx3D.ts`, `SeraphimBoss{3D,Parts3D,Geometry3D}.ts`, `Tower{Arena3D,ArenaStage3D,CityEnvironment3D,CitySkyscrapers3D,CityAssets3D}.ts` |
| CrazyGames SDK v3, Rules & Skills | `src/sdk/crazygames.ts`, `.agent/rules/threejs-ts-standards.md`, `.agent/skills/{crazygames-sdk-v3,ui-hud-design,procedural-3d-assets}/SKILL.md` |

---

## 4. RILIS & DEPLOY

- **GitHub Pages**: auto-deploy via `.github/workflows/deploy.yml` setiap push ke `main` (test + Vite build + deploy). Hash assets Pages = build commit pushed terakhir.
- **CrazyGames**: upload **MANUAL** lewat developer dashboard (tidak auto-deploy). Folder build lokal: `Downloads/my_pixel_mine_cg_build` (nama folder legacy sengaja dipertahankan) — mirror persis `dist/`. Tiap update: copy `dist/.` ke folder tersebut lalu prune file `assets/*` hash lama yang tidak ada di `dist/assets`. Status sinkronisasi terakhir tercatat: commit `e4869e9` (`1.060` file identik dengan `dist/`).
- **Save pemain**: `localStorage` (`GameStateSave.ts`) + **APS (Automatic Progress Save)** CrazyGames otomatis backup/sync antar-device untuk user login CG tanpa kode tambahan. Guest tetap lokal. **Jika IAP ditambah nanti, APS dilarang** → migrasi ke SDK data module.
- **Build lokal vs CG**: perbedaan performa/visual antara lokal/Pages dan CG biasanya disebabkan umur build CG yang tertinggal commit terbaru. Cek hash assets terlebih dahulu.
