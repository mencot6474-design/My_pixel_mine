# PETA STRUKTUR GAME — My Anime Mine 3D

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_chibi_mine`).
Baca peta ini terlebih dahulu untuk menemukan modul, jumlah baris, dan anchor simbol dengan cepat tanpa membaca file besar dari awal hingga akhir.

> **Terakhir diverifikasi**: `2026-11-23` (setelah overhaul **Stylized World Sky Mining & Golden-Blue Hour Plaza** + **Multi-Part Skyline Rooftops**: `WorldSkyTextures3D.ts`, `MineEnvironment3D.ts`, `MineSceneStage3D.ts`, `ShopCyberPlazaSkyline3D.ts`, `ShopCyberPlaza3D.ts`, & `SkyMetropolis3D.ts`). Ukur ulang anchor dengan `Select-String` jika file berubah.
> **Watchlist modul >= 1.000 baris**: `ProceduralTextures3D.ts` (`1.087` baris) & `TierAttackVfx3D.ts` (`1.000` baris); seluruh file `src/` lain `<= 985` baris (`GameState.ts` 985, `MeshFxTwinShadersB3D.ts` 980, `GameHud.ts` 980, `MineScene3D.ts` 979, `OrePit3D.ts` 967).

<details>
<summary>Riwayat update besar terbaru (Stylized World Sky & Multi-Part Skyline Rooftops, Neo-Tokyo Skyline & Cyber Zeppelin, Clean Colosseum & Cargo Pod, VFX Pit Clipping, Open-Sky Circular Arena)</summary>

- **Stylized World Sky & Multi-Part Skyline Rooftops (Mining & Plaza)**: Tekstur langit cached `1024×512` (`WorldSkyTextures3D.ts`) dengan identitas twilight 8 world + underlit cyber clouds + bintang 4-sudut + bulan sabit/lengkung orbital 2D (`getMiningSkyDomeTexture`), langit khusus *Golden-Blue Hour* Plaza (`getPlazaSkyDomeTexture`) & kabut terharmonisasi (`getHarmonizedWorldFogColor` di `MineEnvironment3D.ts`/`MineSceneStage3D.ts`), ring skyline Plaza bertajuk multi-part (`ShopCyberPlazaSkyline3D.ts`), serta upgrade atap gedung `SkyMetropolis3D.ts` (setback penthouse caps, unit HVAC mekanikal, bingkai parapet neon 4/8-sisi tanpa cakram helipad, & spire beacon).

- **Neo-Tokyo Cyber Skyline, Cyber Zeppelin, Clean Colosseum & VFX Pit Clipping**: 3 arketipe gedung `InstancedMesh` ber-setback + neon fins + holo billboards + sky-traffic + city mist (`SkyMetropolis3D.ts`, `SkyMetropolisAssets3D.ts`), **Cyber Zeppelin** ber-layar melengkung `MyChibiMine` + 4 rotor & 2 escort drones, penghapusan gerbang portal kiri & 4 pilar conduit/kabel (`MineEnvironment3D.ts`), deck dark-titanium + under-hull stabilizer fins (`OrePitStage3D.ts`), **Cyber Cargo Pod** di hover-pad kanan (`CyberCargoPod3D.ts`), serta `TierVfxPitClip3D.ts` world-space circular pit clipping agar shader skill tidak menembus dinding/lantai arena.

- **Open-Sky Circular Arena & Floating Podiums (Mining World Overhaul)**: Kolam kawah lingkaran besar & dalam (`PIT_RADIUS = 6.4`, diameter `12.8m`, kedalaman `PIT_FLOOR_Y = -1.95`, `LatheGeometry` 3 undakan + 3 cincin neon horizontal reaktif skill + lantai `getCircularNexusPoolTexture`), penghapusan seluruh slab kotak pulau luar (`MineEnvironment3D.ts` open sky + `InstancedMesh` under-void shards), 5 podium melayang (`STAGE_CRESCENT_SLOTS` w/ thruster plume & hover bob terisolasi di `PlotPedestal3D.ts`), sayap satelit melayang (`ArenaWings3D.ts`), & kamera lebar (`pitch = -0.18`, `targetCamRadius = 20.4`).

- **Tier OMEGA, Tier TWIN Sakuga & 5 Synchro Fusion Bespoke GLSL Shaders**: Ekstraksi shader (`MeshFxTwinShadersA3D.ts`, `MeshFxTwinShadersB3D.ts`, `MeshFxOmegaShaders3D.ts`, `MeshFxFusionShaders3D.ts`), koreografi multi-wave (`TierTwinChoreography3D.ts`, `TierFusionChoreography3D.ts`), `Clockwork` Sakuga Mode-6 smear slash / 3-Act Chrono-Astrolabe seal / `clockhand` weapon pool & 6-element back-attachment, `Halcyon` Rail-Bow/Pillars, `Nocturne` Void Eclipse, `Lullaby` Music-Box/Starlight Cradle, podium banner removal (`MineEnvironment3D.ts`), serta dev unlocker (`?unlock=1` / `__unlockAllChibis`).
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
| `.agent/skills/sakuga-skill-shaders/SKILL.md` | Standar Three.js Sakuga VFX shaders per chibi (riset anime/VFX wajib, custom `ShaderMaterial`, timeline 3-fase `2.5s`, eskalasi Fusion/Twin/Omega, & zero memory leak) |

### Entry, SDK, Audio & Tests

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/main.ts` | 587 | Bootstrap `MineScene3D`, `GameState`, `GameHud` (plot drop, Fusion 3D ops & `setFusionRevealHold`, Omega 3D ops & `onOmegaEntranceSlam`, `onFpsUpdate`, `setModalBackdropThrottled`, weather & CC0 `AudioManager` sync, offline modal, Overclock chain, `recordCritTap`, `onHoldMineChange`, `triggerTapCombo`, `spawnLootVacuum`, `triggerPerfectStrikeFlash`, `spawnPitEvent`, `spawnMeteorIfAllowed`, dev-only `?unlock=1` / `__unlockAllChibis`), CrazyGames SDK, Tower/Omega callbacks & game loop |
| `src/sdk/crazygames.ts` | 259 | CrazyGames SDK v3 wrapper (`isAdPlaying`, `cgInit`, `cgBindAdLifecycle`, `isCrazyGamesEnv`, `cgLoadingStart`, `cgGameplayStart`, `cgHappyTime`, `cgRequestRewardedAd`, `cgTryMidgameAd`) |
| `src/audio/AudioManager.ts` | 734 | Web Audio SFX synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`, `playEnchantEquip`, `playCrystalScaleNote`, `playCrystalChord`, `getMusicalScaleRate` `do..DO!`) & HTMLAudio BGM (`setSceneMode` incl. `omega` -> `boss`, `playOreHit`, `playOreBreak`, mute persistence, `setBgmVolumeScale`, `setSfxVolumeScale`, `setAdMuted`, `isEffectivelyMuted`) |
| `tests/hud-modules.test.ts` | 1.587 | **39 Vitest specs**: modul UI Tahap B, `GameSettings`, `AudioManager`, `SettingsModalUi`, `OfflineModalUi` + Return Rush, `BountiesModalUi`, `DailyLoginModalUi`, `IndexModalUi` (sidebar/Twin/Omega/Holo Foil/`MAXED`), `LootVacuumFx`, Overclock Tier 1–3 + Fever Rain, Hotbar, `TowerUi`/`TowerArenaHudUi`, `ShopModalsUi`/`TwinSummonCutscene`, `OmegaBossModalUi`/`OmegaArenaHudUi`/`HudOmegaBridge`, `WorldOverlayHudUi` (`TAP!`), & `TutorialUi` |
| `tests/state-modules.test.ts` | 1.614 | **33 Vitest specs**: `GameStateSave`, `PlotUnitsDomain`, `TowerRunDomain` (Boss Shield-Break/12 Blessings/Max-Stack/Reroll/Streak/Dice Pity/Spire Coin/`0.01%` `TWIN` drop/Floor 80 Tamat), `OmegaBossDomain` (`100Qa..15Sp`/Sky-Drop/30s 12-tap Invul Shield/Parry/Pillars/`OMEGA BREAK!`/Core drop/Awaken), `LootChestDomain`, `ShopWeatherDomain`, `OfflineEarningsDomain`, `BountiesDomain`, `OverclockDomain`, `FusionDomain`, `DailyLoginDomain`, `PremiumShopData`, `unlockChibisByIds`, & Twin Tier Auto-Scaling |
| `tests/world-3d.test.ts` | 4.065 | **85 Vitest specs**: Clean Cyber-Colosseum + `CyberCargoPod3D` + Vault Hover-Pad (tanpa portal kiri/pilar melayang), `TierVfxPitClip3D` world-space pit clipping, Neo-Tokyo Sky-Metropolis + Cyber Zeppelin (`MyChibiMine` curved LED banner & stylized per-world `WorldSkyTextures3D` / Plaza Golden-Blue Hour sky + distant skyline), Open-Sky Circular Arena (`PIT_RADIUS = 6.4`, `PIT_FLOOR_Y = -1.95`, circular spawns, `STAGE_CRESCENT_SLOTS` floating thrusters & hover bob, pitch `-0.18`), `PlotAttackController3D` (incl. `splitBarrageDamage` 3-beat barrage `25%/30%/45%`) & `getChibiAttackStyle`, Tier OMEGA, TWIN, & 5 Fusion bespoke GLSL shaders/geometries, `triggerPodiumCast` + `firePodiumWeaponCast`, always-on back-attachments, Altar dial/dice, crisp sprite sharpness, `setLowQuality`, `OrePit3D` background respawn, `FusionLabBunker3D` + `FusionSequence3D`, `ChibiSprite3D.getTierBadgeAnchorLocal`, `ShopCyberPlaza3D`/`ShopWorld3D` & `OmegaArena3D`, 3-beat combo + 5-layer `AttackImpactFxController`, `MineEnvironment3D`, `SeraphimBoss3D`, `TowerCityEnvironment3D`, `TowerArena3D`, Cave Railway/Chest Vault, CrazyGames SDK v3, research/worlds W1–W8, Tower/Weather/Meteor/Chibi 64 catalog, & Relic Forge |

### Game Data & State (`src/game/`)

| File | Baris | Ringkasan & Anchor |
|---|---|---|
| `src/game/GameData.ts` | 836 | Worlds (`underground`..`chrono` W1–W8), `WORLD_UPGRADE_COST_SCALE`, `getWorldUpgradeCostScale`, `getLatestWorldScaleAnchor`, `syncTwinCatalogDpsFromAnchor`, `ORES` `215` (58 world + 5 weather = 63), `WORLD_MINERS` `378` (40 world + 5 weather), `PICKAXES` `440`, `MUTATIONS` `455`, `ENCHANT_DICE_GEM_COST` `467`, `ENCHANTS` `469`, `isHighTierMutation` `531`, `GEM_SHOP_ITEMS` `541`, `rollMutation` `657`, `CHIBI_STAR_TIERS` `729`, `WORLD_RESONANCE_TIERS` `758`, `computeWorldResonances` `792`, `rollWorldOre` `827`, `rollWorldMiner` `832` |
| `src/game/GameState.ts` | 985 | State coordinator & re-exports (`PlotUnitState`, `ResearchLevelsMap`, `SavePayload`, `OfflineEarningsSummary`, `BountyEntry`, `OmegaBattleState`, `OmegaBattleSummary`, `getChibiUpgradeCostMult`), `subscribe()`/`emit()`, domain delegators, Enchant Dice roll, `spendTowerCoins`, `getActivePremiumPassives`, `getActiveOmegaPassives`, `buyPremiumShopItem`, `grantAdGems`, `grantTutorialStarterReward`, `unlockChibisByIds` |
| `src/game/GameMultipliersDomain.ts` | 194 | Pure Index counters (`getTotalIndexCountDomain`, `getDiscoveredCountDomain`, `getWorldIndexProgressDomain`) & Global Multipliers (`getTapDamageDomain`, `getMaxChestCapacityDomain`, `getActiveOreNodeCountDomain`, `getOreHpScaleDomain`, `getOreValueMultDomain`, `getEffectiveOreSellValueDomain`, `getOreOutputMultDomain`, `getTotalOreDropMultDomain`, `getRespawnSpeedMultDomain`, `getFindChanceBonusDomain`, `getCharacterLuckMultDomain`, `getOreLuckMultDomain`, `getMutationLuckMultDomain`) |
| `src/game/GameStateSave.ts` | 663 | `SAVE_KEY` `23`, `SavePayload`, `SaveableGameState`, `migrateOreId`, `isValidIndexId` (World + Weather + Fusion + Limited + Twin + Omega), `createEmptyResearchLevels`, `compactHotbarSlots`, `TEAM_PRESET_COUNT`/`createEmptyTeamPresets`, `serializeSavePayload`, `deserializeSaveJson`, `saveToLocalStorage`, `loadFromLocalStorage` |
| `src/game/PlotUnitsDomain.ts` | 821 | `PlotUnitsContext` `85`, `getChibiUpgradeCostMult` `122`, `createFreshPlotUnit`, `getChibiStarCount`, `starUpUnit`, `autoStarUpAllUnits`, `getActiveWorldResonancesList`, `getActiveEnchantBonuses`, `computePlotUnitStats` (`speedLevel -> DMG Mult` `+12%/lv`, `miningSpeedLevel -> Crit Chance` `5%+3%/lv`, `critMult = 2.25×`, Overclock/Fusion/Premium/Enchant/Return Rush), `computeTotalPlotDps`, `computeDpsBreakdown`, `trimStashedUnits`, `equipChibiOnPlotSlot`, `rollUnitMutation`, `toggleUnitEnchant`, `equipBestUnitsToPlots` |
| `src/game/OmegaData.ts` | 248 | `OMEGA_BOSS_DEFS` (`Crimson Ronin` `omega-left` & `Obsidian Sovereign` `omega-right`, Tier I `100Qa/150Qa`..Tier V `10Sp/15Sp` HP), `OMEGA_KEY_GEM_COST = 50000`, `OMEGA_ENTRANCE_DURATION_SEC = 1.85`, `OMEGA_INVUL_DURATION_SEC = 30`, `OMEGA_INVUL_TAPS_REQUIRED = 12`, `10%..50%` Core drop, All-3 Passives, `5` Cores unlock & `1★→5★` Awaken (`+20%/star`), `computeOmegaScaledBaseDps`, `computeOmegaUpgradeCostScale`, `getOmegaPassiveStarScale`, `getActiveOmegaPassiveBonuses` |
| `src/game/OmegaBossDomain.ts` | 600 | `syncOmegaKeysDomain` (`5` max, `1h` regen, 0-key-loss), `startOmegaBossDomain` (`'entrance'` -> `'invul_shield'` -> `'active'` 45s duel), `tapOmegaInvulShieldDomain`, `stepOmegaBossTickDomain`, `applyOmegaSquadStrikeDomain`, `triggerOmegaParryDomain`, `hitOmegaTargetObjectDomain`, `OMEGA BREAK!` (`2.5×` DMG 7s), `unlockOmegaChibiDomain`, `awakenOmegaChibiDomain` |
| `src/game/TowerData.ts` | 841 | `TOWER_MAX_FLOOR` (80, W1–W8), `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (15m), `TOWER_KEY_GEM_COST` (5000), `TOWER_WAVES_PER_FLOOR` (10), `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_ORE_COIN_CHANCE` (0.5%), `TOWER_ORE_TWIN_CHANCE` (0.01%), `TOWER_BOSS_COIN_CHANCE` (5%), `TOWER_BOSS_COIN_DROP` (5), `TOWER_GEM_DROP_MULT` (0.2), `TOWER_HP_MULT` (4050), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BLESSING_REROLL_GEM_COST` (75), `TOWER_BOSS_INVUL_SEC` (5), `TOWER_BOSS_EXPOSE_SEC` (4s `+50%` DMG), `TOWER_DICE_PITY_MAX` (4), `getTowerStreakGemMult`, `TOWER_ANOMALIES`, `TOWER_BLESSINGS` (12), `rollTowerTwinDropChibiId`, `pickRandomTowerBossChibiId`, `TOWER_MILESTONES` |
| `src/game/TowerRunDomain.ts` | 746 | `TowerRunMeta` `38`, `TowerRunContext` `43`, `syncTowerKeysDomain` `96`, `getTowerEffectiveDpsDomain` `154`, `startTowerRunDomain` `204`, `finishTowerRunDomain` `365`, `rerollTowerBlessingsDomain`, `hitTowerBossShieldSweetSpotDomain`, `chooseTowerBlessingDomain` `468`, `stepTowerTickDomain` `485`, `applyTowerTargetDamageDomain` `528`, `quickSweepTowerDomain` `701` |
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
| `src/game/TeamPresetsDomain.ts` | 78 | `TEAM_PRESET_COUNT` (3), `createEmptyTeamPresets`, `isTeamPresetPopulated`, `saveTeamPresetDomain`, `applyTeamPresetDomain` |
| `src/game/AchievementsDomain.ts` | 278 | `ACHIEVEMENT_CATEGORIES` (8 categories × Tier I–V = 40 tiers, `+1% All DMG`/tier), `CareerStats`, `getReadyAchievementCountDomain`, `claimAchievementTierDomain`, `getAchievementAllDmgBonusDomain` |
| `src/game/LootChestDomain.ts` | 446 | `LootChestContext` `19`, `getChestItemCountDomain` `57`, Hotbar 1–9 (`swapHotbarSlotsDomain` `85`, `removeFromHotbarDomain` `122`, `toggleHotbarItemDomain` `136`), `shouldAutoSellOreDomain` `180`, `onOreBrokenDomain` `221`, `onMeteorBrokenDomain` `274`, `takeAllFromChestDomain` `363`, `isChestFullBonusReadyDomain` `391`, `sellAllChestOresDomain` `419` (+35%), `toggleAutoSellDomain` `433` |
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
| `src/ui/GameHud.ts` | 980 | Thin UI coordinator: `activeModal`, `sceneMode`, `inspectedSlot`, `adPaused`, `Shop`/`Upgrades`/`Index` rails, toast stack, `isTutorialActive`, `updateSweetSpot`, `updateFps`, `setOnModalVisibilityChange`, `spawnLootVacuum`, `250ms` coalescer, `setFusionRevealHold`, Omega bridge & `TwinSummonCutscene` hooks |
| `src/ui/HudActionRouter.ts` | 505 | `renderActiveModalHtml`, `buildHudCoordinatorActions`, `updateHudCurrencyAndBadges`, `stepHudSlowTick`, `stepHudFastTick`, `syncHudLiveSubView`, `bindHudRootEvents` |
| `src/ui/HudChromeRenderer.ts` | 457 | `renderAudioControlsHtml` (FPS pill + Camera Lock), `renderCurrencyRailHtml`, `renderMineQuickButtonsHtml`, `renderMineChromeHtml`, `renderFeverScreenFxHtml`, `syncFeverScreenFxDom`, `applyHudViewportScale`, `updateFpsBadgeDom` |
| `src/ui/HudTowerBridge.ts` | 195 | Tower combat HUD bridge: `syncTowerSceneVisual`, `handleTowerTargetClick`, `handleTowerFighterStrike`, `handleTowerMonolithClick`, `0.01%` `TWIN` jackpot toast |
| `src/ui/HudOmegaBridge.ts` | 154 | Omega Boss duel bridge: `startOmegaBattle`, `syncOmegaSceneVisual`, `handleOmegaTapInvulShield`, `handleOmegaFighterStrike`, `handleOmegaTargetClick`, `handleOmegaBossClick`, `handleOmegaParryClick` |
| `src/ui/HudShared.ts` | 633 | `chibiPortraitHtml`, `ModalKind`/`ModalThemeId`/`InvTab`/`PlotDropOps`, `rarityCardClasses`, `renderRarityBadgeHtml`, `renderMutationBadgeHtml`, `rarityVars`, `applyInspectRing`, `classifyToast`, `renderToastBannerHtml`, `formatCountdownTimer`, `refreshPotionTimersInDom`, `captureRootScrolls`/`restoreRootScrolls`, `TW_*` constants, `renderModalShell`, `shouldDismissModalBackdrop`, `renderInspectorPanel`, `buildEnchantHoverCardHtml`, `bindEnchantHoverInspector` |
| `src/ui/HudIcons.ts` | 432 | SVG & 2D art icon helpers (`HUD_ICONS`, `hudIconHtml`, `weatherIconHtml`, `towerIconHtml`, `omegaCrestIconHtml`, `spireCoinIconHtml`, `towerBlessingIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`, `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml` `332`) |
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
| `src/ui/ShopModalsUi.ts` | 829 | `ShopModalsUi` `53`: Pickaxe Shop, Gem Shop, Sell Shop, & Premium Shop (`renderPremiumShopModal` w/ Spire Coins, triggers `TwinSummonCutsceneController`) |
| `src/ui/TwinSummonCutscene.ts` | 618 | `TwinSummonCutsceneController`: Fullscreen (`z-[70]`) Three.js GLSL Cyber-Prism / Binary Star cutscene saat beli Chibi `TWIN` |
| `src/ui/TowerUi.ts` | 627 | `TowerUi` `28`: Gem Tower Hub modal (`renderTowerHubModal` `63`: World Hero Banner, `Twin Shop →`, 2-tab sidebar, Floor 80 Tamat, Checkpoints/Milestones, Anomalies, Quick Sweep, 4-pip Dice Pity, Near-Miss/Last Run, Instant Retry) |
| `src/ui/TowerArenaHudUi.ts` | 599 | Battle Tower HUD (`renderTowerArenaHud` w/ random 2D `TWIN` Boss, 10-tick HP bar, single-row `.mam-battle-dock` + popover, Blessing Overlay w/ preview & Reroll, 5s Boss Shield-Break, 5s auto-pick) |
| `src/ui/OmegaBossModalUi.ts` | 505 | Omega Duel Sanctum Hub (`omega-boss` theme, Boss tabs + `50K` Keys, 5-tier table, Forge panel, `▶ Cutscene` replay & Unlock/Awaken -> `OmegaForgeCutsceneController`) |
| `src/ui/OmegaForgeCutscene.ts` | 602 | `OmegaForgeCutsceneController`: Fullscreen (`z-[70]`) Three.js GLSL Singularity Vortex + Meteor + 90ms Sakuga Impact Frame + Silhouette-to-Color reveal |
| `src/ui/OmegaArenaHudUi.ts` | 574 | Raid Boss Battle HUD (10-tick HP, Sky-Drop banner, 30s Invul Shield screen-tap targets, Stagger/OMEGA BREAK gauge, Victory & Defeat Popups) |
| `src/ui/OmegaBattleIcons.ts` | 146 | `omegaBattleIconHtml`: 13 sculpted Raid Boss combat SVGs |
| `src/ui/TutorialUi.ts` | 659 | 5-stage responsive FTUE (`pose.webp` pop-out, `.mam-tut-target-ring`, `?tutorial=1`, Starter Bonus +150 Gems & +1 Dice) |
| `src/ui/UpgradesWorldsUi.ts` | 546 | `UpgradesWorldsUi` `18`: Research/Upgrades tree & delegasi World Teleport ke `WorldsModalUi` |
| `src/ui/WorldsModalUi.ts` | 356 | World Teleport full-banner modal (`public/worlds/*.webp`, `i` World Synergy Combo overlay) |
| `src/ui/PlotInspectUi.ts` | 696 | `PlotInspectUi` `50`: Plot Inspector (★Star, passive chips, World Resonance, Enchant Hover Inspector, Bulk Upgrades `×1/×10/MAX`, Auto-Roll Mutation `Frozen+` + `renderMutationConfirmOverlay`) |
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
| `src/game3d/MineScene3D.ts` | 979 | Main Three.js scene controller: mode `mine`/`shop`/`altar`/`fusion`/`tower`/`omega` + lazy builders, `1024×1024` shadow map, default `'low'`, `ResizeObserver`, 30Hz low DOM emit, `setCameraLocked`, `setModalBackdropThrottled`, `onFpsUpdate`, `setOverclockActive` (incl. metropolis/blimp fever), skill-pulse hook, Fusion/Omega hooks, Sweet-Spot, `destroy()` |
| `src/game3d/MineSceneStage3D.ts` | 832 | `SceneMode`, `STAGE_CRESCENT_SLOTS` (5 floating crescent slots), `getDefaultOrbitPitchForMode`, `applyCameraOrbitDrag`, `clampCameraZoomRadius`, `createMineRendererAndLights`, `buildMineStageAndChest` (floating pedestals + right satellite chest), `applyMineSceneModeTransition` (switches `setSkyMode`), `applyMineWeatherAtmosphere` (`getHarmonizedWorldFogColor`), `stepMineSceneCamera`, `stepMineActiveWorldEntities`, `stepMinePostFxAndDim`, `applyMineOverclockVisual`, `applyMineGraphicsQuality` (disables `WeatherFx3D` particles for smooth FPS) |
| `src/game3d/MineSceneInput.ts` | 545 | `rollTapCriticalDamage`, `stepHoldMineTimer`, `bindMineSceneEvents` (drag/orbit/hover/click, 2-finger pinch zoom, hold-to-mine, wheel), `raycastAtInScene`, `getPitFloorHitInScene` (circular pool plane `y = PIT_FLOOR_Y`), `getPedestalAtClientPosInScene`, `performMineTapAtInScene` |
| `src/game3d/MineSceneProjector.ts` | 258 | `MineSceneProjector`: `projectWorldToScreen`, `emitSweetSpot`, `emitTowerSweetSpot`, `emitOreBars`, `emitDamageScreen`, `emitPlotAnchors`, `emitModeOverlays` |
| `src/game3d/MineEnvironment3D.ts` | 256 | Open-sky floating environment w/ cached stylized `skyDome` (`MeshBasicMaterial` + `getMiningSkyDomeTexture`/`getPlazaSkyDomeTexture`, `setSkyMode`), `SkyMetropolis3D` (`getMetropolis`, `setOverclockTier`), `20` GPU mana motes (non-raycast), `16` under-void crystal shards (`InstancedMesh`), `vaultDais` Hover-Pad (sisi kiri bersih tanpa portal/pilar), `dispose()` |
| `src/game3d/WorldSkyTextures3D.ts` | 280 | Cached `1024×512` stylized sky domes: `getMiningSkyDomeTexture` (8-world twilight, underlit cyber clouds, 4-pt stars, 2D crescent moon/orbital backdrop), `getPlazaSkyDomeTexture` (Golden-Blue Hour twilight sky), `getHarmonizedWorldFogColor` |
| `src/game3d/SkyMetropolis3D.ts` | 795 | Neo-Tokyo Cyber Skyline (`InstancedMesh` 3 arketipe gedung ber-setback, penthouse caps, HVAC rooftop units, hollow parapet trim, vertical neon fins, beacons, holo billboards, sky-traffic, city mist, 4 soft searchlights) & Cyber Zeppelin (`buildCyberZeppelin`, curved `MyChibiMine` LED banner, 4 spinning rotors, 2 escort drones) |
| `src/game3d/SkyMetropolisAssets3D.ts` | 430 | Aset prosedural Sky-Metropolis (`getSkyscraperVariantTexture`, `getRooftopHoloSignTexture`, `getSearchlightBeamTexture`, `getCityMistTexture`, `createSkyscraperShaftGeometry`, `buildCyberZeppelin`) |
| `src/game3d/ArenaWings3D.ts` | 393 | `createVaultCoreDais` (sleek octagonal Cyber Hover-Pad untuk `CyberCargoPod3D` tanpa pilar/dinding belakang) + legacy `createNexusLeftGate` (kompatibilitas spec), `setPalette`, `setLowQuality`, `update`, `dispose()` |
| `src/game3d/CyberCargoPod3D.ts` | 280 | `createCyberCargoPod`: pengganti peti klasik di Hover-Pad kanan (hull chamfered titanium, dual sliding top hatches, 5 LED capacity bar `InstancedMesh`, inner loot core, & holo emblem `fog: false`) |
| `src/game3d/MeshHelpers3D.ts` | 375 | `getActiveTextureAnisotropy`, `applySharpSpriteTexture`, `configureSceneTextureSharpness`, `enableShadows`, `disposeObject3D`, `createChamferRectShape`, `createChamferSlabGeometry`, `createExtrudedProfileGeometry`, `createChamferPanelXYGeometry`, `createLatheProfileGeometry`, `mergeStaticMeshesByMaterial`, `mergeSimpleGeos` |
| `src/game3d/CaveRailway3D.ts` | 882 | Legacy left-wing railway builder (`createCaveRailway`, `createCyberRadarArray`, `InstancedMesh` guideway) dipertahankan untuk kompatibilitas spec |
| `src/game3d/ChestVaultStation3D.ts` | 615 | Legacy right-wing refinery builder (`createChestVaultStation`) + shared `disposeObject3D` helper |
| `src/game3d/ProceduralTreasureChest3D.ts` | 383 | `createProceduralTreasureChest`, `createExtrudedSlabGeometry`, re-exports `disposeObject3D`/`enableShadows` |
| `src/game3d/CyberProps3D.ts` | 490 | `createCyberRadarArray` `131`, `createCyberLanternBollardFinial` `298`, `createCyberMonolithForkFinial` `346`, `createCyberCrystalCluster` `388`, `createCyberBotanicalCanopy` `447`, `disposeCyberProp` `41` |
| `src/game3d/WeatherSkyShader.ts` | 249 | Legacy `createWeatherSkyMaterial` `192` (dipertahankan untuk spec; diganti gradien statis `getSkyDomeTexture` di `MineEnvironment3D` demi FPS mulus) |
| `src/game3d/WeatherFx3D.ts` | 335 | `WeatherFx3D` `76`: 3D weather particles + Fever Rain (`setQualityScale(0)` di `MineScene3D`/`MineSceneStage3D` demi performa stabil; dipertahankan untuk spec) |
| `src/game3d/MineWorldPalette.ts` | 135 | `WORLD_PALETTES` `27` (8 worlds), `BASE_PIT_NODE_COUNT` (5), `MAX_PIT_NODE_COUNT` (20), `ORE_VARIANTS`, `rollOreVariant` |
| `src/game3d/OreBillboard3D.ts` | 485 | `OreBillboard2D` (merged basalt rubble + crystal collar, crater AO, squash-on-hit) + `applySharpSpriteTexture`, `getSoftContactShadowTexture`, `getGeodeGlowTexture`, `loadPublicSpriteTexture` |
| `src/game3d/OrePit3D.ts` | 967 | Pit ore controller & re-exports (`PIT_RADIUS = 6.4`, `PIT_FLOOR_Y = -1.95`, `PIT_CENTER_Z = 1.65`): circular disc spawns, `setPalette`, `setActiveNodeCount`, `setHpScale`, `spawnWeatherMeteor`, `hitNode`, `triggerSkillPulse`, `activatePitEvent`, `spawnSweetSpot`, `consumeSweetSpotTap`, `getAliveNodesInfo`, `update(..., renderVisuals)`, `setLowQuality`, `dispose()` |
| `src/game3d/OrePitStage3D.ts` | 735 | Pure pit constants/helpers (`PIT_*`, `METEOR_HP_MULT`, `BASE_ORE_RESPAWN_SEC`, `computeMeteorDynamicHp`, `applyNodeDamagePure`, `isSweetSpotWindowPure`) + `buildOrePitEnvironmentMeshes` (Sleek Cyber-Colosseum `LatheGeometry` bowl, deck titanium `getCyberColosseumDeckTexture`, under-hull stabilizer fins & thruster vents, 3 concentric neon rings), `buildOrePitMeteorAndSpotFx`, `stepOrePitMeteorDrop`, `spawnOrePitShards`, `stepOrePitShards`, `updateSweetSpotRingMesh`, `resolveWorldIdFromPalette`, `pickWorldOreForVariant` |
| `src/game3d/AttackImpactFx3D.ts` | 781 | `AttackImpactFxController` `88` (pooled 5-layer cyber-anime impact/shatter + meteor trail/landing, `setLowQuality`, `dispose()`) |
| `src/game3d/PlotPedestal3D.ts` | 716 | `PLOT_PODIUM_SCALE = 1.5` Floating Cyber-Showcase Plot Podiums (`idle`, isolated `visualYaw`, anti-grav thruster keel/plume & steady-badge hover bob), `01..05` apron, dual-shell Anime Aura (`setLowQuality`), `triggerChibiCast`, `triggerChibiAttack`, `triggerChibiBlitz`, `setChibiFacing`, `getVisualYaw`, `getHoverBobOffset`, `getAttackOriginWorldPosition`, `getActiveAccentColor`, `dispose()` |
| `src/game3d/PlotPedestalLabel3D.ts` | 401 | `PlotLabelInfo`, `createSlotPlaqueTexture`, `loadEnchantIconImage`, `renderPlotLabelTexture` (2x HiDPI canvas nameplate + mutation/enchant badges) |
| `src/game3d/PlotAuraFx3D.ts` | 335 | `ENCHANT_SECONDARY_COLOR` `3`, `getPedestalHoloRingTexture`, `getEnchantSigilTexture`, `createAnimeAuraShaderMaterial`, `createAnimeParticlePoints` |
| `src/game3d/SignatureProjectilePool3D.ts` | 530 | Shared pooled signature projectiles (`getChibiAttackStyle`: `crescent`/`beam`/`star`/`twin`/`meteor`, 20-slot/12-low pool) |
| `src/game3d/MeshFx3D.ts` | 673 | Core GLSL anime VFX shaders & geometries (`ImpactFrameShader`, Slash modes `0..11`/Sakuga Mode 6/Fresnel/Energy/Orbital/Vortex/Rift, `createBladeMeshGeometry`, `createSpearGeometry`, `createCrystalSpikeGeometry`, `createAbyssalGreatswordGeometry`, `createSpikedHaloGeometry`) + re-exports Twin/Omega/Fusion shader modules |
| `src/game3d/MeshFxFusionShaders3D.ts` | 501 | 5 Synchro Fusion GLSL floor seals, 3D prop shaders & geometries (`glitch-cheshire` glitch cyber cards, `thorn-maiden` rose mandala & spiral bramble lances, `monochrome-saint` Sumi-e ink seal & judgement obelisks, `prism-seraph` rainbow prism seal & octahedrons, `aether-monarch` nexus astrolabe seal & 8-spire crown) |
| `src/game3d/MeshFxTwinShadersA3D.ts` | 957 | Clockwork, Yukikage, & Halcyon Valkyrie Rail-Bow GLSL shaders & geometries (`createClockworkDialShaderMaterial`, `createClockworkChronoChassisShaderMaterial`, `createClockworkScytheHandGeometry`, `createClockworkGearGeometry`, `createHalcyonValkyrieHaloShaderMaterial`, `createHalcyonRailBowShaderMaterial`, `createHalcyonMechanicalWingBladeGeometry`, `createHalcyonRailBowGeometry`, `createHalcyonOrbitalSealShaderMaterial`, `createHalcyonRailPillarShaderMaterial`, `createHalcyonRailPillarGeometry`, `createHeldFrostSlashShaderMaterial`, `createYukikageShrineRingShaderMaterial`, `createYukikageKunaiShaderMaterial`, `createKunaiGeometry`, `createHalcyonRainShaderMaterial`, `createArrowGeometry`) |
| `src/game3d/MeshFxTwinShadersB3D.ts` | 980 | Nocturne Void Eclipse/Twin-Blade (`createNocturneEclipseHaloShaderMaterial`/`WingShaderMaterial`/`WingGeometry`/`EclipseMonolith`/`EclipseCrater`), Lullaby Music-Box/Starlight Cradle (`createLullabyPinkAura`/`MoonCradleArch`/`MusicBoxSeal`/`GothicMirrorCage`/`CrescentMoon`), & Clocktower/Sakuga Weapon GLSL shaders & geometries (`createClocktowerShaderMaterial`, `createClockworkSakugaWeaponShaderMaterial`) |
| `src/game3d/MeshFxOmegaShaders3D.ts` | 427 | Crimson Ronin, Yukikage Frost Seal, & Obsidian Sovereign GLSL shaders & geometries (`createCrimsonTsubaHaloShaderMaterial`, `createCrimsonKatanaShaderMaterial`, `createRoninKatanaGeometry`, `createYukikageFrostSealShaderMaterial`, `createObsidianCrownHaloShaderMaterial`, `createObsidianGreatswordShaderMaterial`) |
| `src/game3d/TierAttackVfx3D.ts` | 1.000 | `TierAttackVfxPool3D` facade + spawners (`setPitBounds`, `spawnSlash..spawnSparks`, `spawnNocturneEclipseMonolith`, `spawnLullabySeal`, `spawnHalcyonRailPillars`, `spawnFusionSeal`, `spawnFusionProp`, `fireAnticipation`, `firePodiumWeaponCast`, `fireTierAttack`, `update`, `dispose`) & re-exports from `TierMotionPath3D` |
| `src/game3d/TierVfxPitClip3D.ts` | 157 | `createPitArenaClipUniforms`, `patchShaderMaterialWithPitClip`, `patchTierVfxPoolMaterialsWithPitClip` (world-space circular pit wall & floor GLSL clipping) |
| `src/game3d/TierMotionPath3D.ts` | 564 | Pure trajectory constants & motion (`CHIBI_ATTACK_ANIM_SEC`, `CHIBI_BLITZ_SHADOW_SEC`, `BARRAGE_BEAT_WEIGHTS`, `BARRAGE_FOLLOWUP_DELAYS`, `splitBarrageDamage`, `computeAttackVfxSpeedScale`, `buildTierMotionWaypoints`, `sampleTierMotionWaypoints`) |
| `src/game3d/TierVfxPoolsInit3D.ts` | 735 | `createTierVfxPoolCollections` + `firePodiumWeaponCastChoreography` (podium cast weapon launcher incl. 5 Fusion Chibi variants, `clockhand`/Sakuga gear & Lullaby/Halcyon projectiles) |
| `src/game3d/TierVfxUpdate3D.ts` | 736 | VFX slot interfaces & `stepTierAttackVfxPool` (per-frame simulation of all VFX pools incl. `nocturneEclipses`, `lullabySeals`, `halcyonSeals`, `halcyonPillars`, `fusionSeals` & `fusionProps`) |
| `src/game3d/TierVfxChoreography3D.ts` | 550 | `TierVfxChoreoContext` & `fireTierAttackChoreography` (13-tier + 5 Fusion via `TierFusionChoreography3D` + 5 Tier TWIN via `TierTwinChoreography3D` + 2 Tier OMEGA choreographies) |
| `src/game3d/TierTwinChoreography3D.ts` | 542 | `fireTwinChibiChoreography` (koreografi serangan multi-wave custom GLSL + 3D mesh untuk ke-5 Tier TWIN Chibi: Yukikage, Halcyon, Nocturne, Lullaby, Clockwork Sakuga) |
| `src/game3d/TierFusionChoreography3D.ts` | 365 | `fireFusionChibiChoreography` (koreografi serangan custom GLSL + 3D mesh untuk ke-5 Synchro Fusion Chibi) |
| `src/game3d/PlotAttackController3D.ts` | 557 | Mine Plot-to-Pit controller (`pendingStrikes` 3-beat barrage `0.2s / 0.95s / 1.75s` -> `TierAttackVfxPool3D` 2.5s VFX w/ `setPitBounds` & `computeSafePitAreaScale`, `firePodiumWeaponCast` & `triggerChibiCast`, `PIT_FLOOR_Y` & radial `wideCenter`, `getAoeTargetCount` `3..6`, `setTierVfxHooks`, `setSkillPulseHook`, `setLowQuality`) |
| `src/game3d/FieldMiner3D.ts` | 371 | Active chibi miner placement & `ChibiFieldFxController` (dipakai di `TowerArena3D` & spec kompatibilitas), 3-beat swing & `dispose()` |
| `src/game3d/ChibiCatalog.ts` | 803 | `LEFT_FACING_WALK_IDS` `39`, `LEFT_FACING_ATTACK_IDS` `51`, `CHIBI_CATALOG` `69` (64 chibis: 40 W1–W8 + 5 weather + 5 `fusion` + 7 `limited` + 5 `twin` + 2 `omega`), `getChibiFrameUvOffset` `799` |
| `src/game3d/ChibiSprite3D.ts` | 914 | 2D-in-3D billboard sprite: 3-beat `triggerAttack`, `triggerPodiumCast`, `triggerBlitz`, `setAccentColor`, `setHologramMode`, `getPoseDisplayMeta`, `getTierBadgeAnchorLocal`, `dispose()` |
| `src/game3d/ChibiBackAttachments3D.ts` | 752 | Always-on Tier TWIN & Tier OMEGA 3D back-attachments (`createChibiBackAttachments`, `updateChibiBackAttachmentGroup`, `updateOmegaHandBlitzWeapon`, `stepChibiAttackComboKinematics`, pose cache & contact shadow helpers) |
| `src/game3d/FusionWorld3D.ts` | 770 | Clean-Tech Secret Lab Bunker controller (`2.8×` APEX & `1.48×` Stasis Tube podiums, Crescent Arc, 4 ore vats, hologram preview, `revealHold` zoom lock, `dispose()`) |
| `src/game3d/FusionLabBunker3D.ts` | 833 | Lab Bunker architecture (`buildLabBunkerFloorDeck`, `buildLabBunkerWallsAndCryoBays`, `buildLabCeilingCanopyAndArms`, `buildLabOperatorConsoles`, `buildOreContainmentVat`) |
| `src/game3d/FusionSequence3D.ts` | 667 | `3.65s` Chibi-Art Glass Fracture & 1-by-1 Reassembly (`buildFusionGlassShards`, `initFusionGlassShards`, `stepFusionWorldUpdate`) |
| `src/game3d/FusionWorldArena3D.ts` | 136 | `buildElevatedShowcaseStage`, `buildPerimeterTechPylons` |
| `src/game3d/FusionWorldPodium3D.ts` | 547 | `createCyberShowcasePodium` & `createLabTubePodium` |
| `src/game3d/ShopCyberPlaza3D.ts` | 878 | `createShopCyberPlaza` `46`: roundabout + fountain, road lanes, botanical trees & fork pylons, `InstancedMesh` props + `addPlazaDistantSkyline`, wing helipads + `omega-left`/`omega-right` pads `(±17.6, -9.6)`, 3 `PointLight`s, `dispose()` |
| `src/game3d/ShopCyberPlazaSkyline3D.ts` | 188 | `addPlazaDistantSkyline`: distant Golden-Blue Hour skyline ring (`InstancedMesh` shafts, architectural setbacks, dark penthouse caps, hollow neon parapet trims, spires & aviation beacons) |
| `src/game3d/ShopCyberPlazaKiosks3D.ts` | 515 | 4 container kiosks (Pickaxes, Sell, 2-story Gem Shop, Relic Forge) + Cargo Dock (`buildPlazaCyberKiosks`) |
| `src/game3d/ShopCyberPlazaAssets3D.ts` | 888 | `createCyberPlazaFloorTexture`, `createHologramSignTexture`, `createRoundaboutShadowTexture`, `buildPlazaOmegaBossPad`, `buildPlazaGemTowerSkyscraper` |
| `src/game3d/ShopWorld3D.ts` | 738 | `ShopWorld3D` `145`: Plaza walkers, 6 building emblems (`ArtBillboard2D`), 2 giant `omega-left`/`omega-right` guardians (`scale 9.45`), raised station badges, `dispose()` |
| `src/game3d/OmegaArena3D.ts` | 815 | Omega Skyscraper Rooftop Arena: stepped Lathe Boss Dais, Sky-Drop Entrance, Invul Shield dome, Boss & 5 stationary `idle` Chibi Podiums (`triggerPodiumCast` + `firePodiumWeaponCast` + `2.5s` VFX + `pendingBarrages` 3-beat `25%/30%/45%`), `SignatureProjectilePool3D` + `TierAttackVfxPool3D`, `scale 3.15` Boss, `dispose()` |
| `src/game3d/OmegaArenaStage3D.ts` | 495 | `buildOmegaArenaStage`, `buildOmegaTargetPropMesh` (Phantom Blade/Obsidian Pillar/Rune Seal), `syncOmegaFighterEntries`, `syncOmegaBattleTargetMeshes`, `applyOmegaPodiumColors` |
| `src/game3d/OmegaRooftopEnvironment3D.ts` | 621 | `createOmegaRooftopEnvironment`: Sunset sky dome, helipad deck + 38m shaft, 20 multi-tier skyscrapers w/ `InstancedMesh` windows/shards, beacons & city mist |
| `src/game3d/OmegaRooftopAssets3D.ts` | 718 | Rooftop textures (`createOmegaSunsetSkyTexture`, `createRooftopHelipadTexture`, `createRooftopBillboardTexture`, `createOmegaBossCircleTexture`, `createCityMistTexture`), `normalizeHorizontalSlabUVs`, `buildRooftopHvacUnit`, `buildRooftopBulkhead`, `buildRooftopSpotlightTower`, `buildRooftopBillboard`, `buildRooftopCommandBackdrop` |
| `src/game3d/EnchantAltarRoom3D.ts` | 623 | `buildEnchantAltarRoom`: Center Cyber-Chrono Core + 10 Enchant Podiums `"01".."10"`, radial conduits, outer ring, floating islands & monoliths |
| `src/game3d/HellAltarEye3D.ts` | 373 | `HellAltarEyeController` `151`: Outer Space starfield, cosmic floor ring, & Black Hole |
| `src/game3d/AltarSpinFx3D.ts` | 936 | `createAltarClockDial` `63`, `createAltarClockHand` `305`, `createAltarSubHand` `591`, `AltarParticleSystem` `715` |
| `src/game3d/AuraModels3D.ts` | 586 | `createEnchantAura3D` `276`, `createEnchantDice3D` `318`, `ArtBillboard2D` `413`, `EnchantBillboard2D` `577` |
| `src/game3d/SeraphimBoss3D.ts` | 954 | `createSeraphimBoss3D` (sculpted Corrupted Seraphim Boss, zero `BoxGeometry`), `update()`, `dispose()` |
| `src/game3d/SeraphimBossParts3D.ts` | 543 | `buildSeraphimHelmet`, `buildSeraphimWings` |
| `src/game3d/SeraphimBossGeometry3D.ts` | 269 | `createSculptedPlateGeometry`, `createLatheProfileGeometry`, `createTaperedTubeGeometry`, `createCurvedFeatherBladeGeometry`, `orientGroupAlongVector` |
| `src/game3d/TowerArena3D.ts` | 792 | Battle Tower combat/entity controller (`BOSS_CENTER_Z = -3.25`, random 2D `TWIN` Wave-10 Boss, Shield-Break Sweet-Spot, 5 wave ores, `AttackImpactFxController`, `dispose()`) |
| `src/game3d/TowerArenaCombat3D.ts` | 563 | `createTowerWaveOreSlot`, `pickTowerTargetOreForFighter`, `stepTowerWaveRocks`, `stepTowerFightersAndBarrages` (stationary `idle` Chibi Podiums + `triggerPodiumCast` + `firePodiumWeaponCast` + `2.5s` VFX + `pendingBarrages` 3-beat `25%/30%/45%`) |
| `src/game3d/TowerArenaStage3D.ts` | 566 | `buildTowerArenaStage`, `stepTowerBossFeetFx`, `spawnTowerArenaShards`, `stepTowerShardPool` |
| `src/game3d/TowerCityEnvironment3D.ts` | 720 | `createTowerCityEnvironment` `52`: daytime sky/fog, holed highway, recessed crater, embers/ash/sparks, guardrails, streetlights |
| `src/game3d/TowerCitySkyscrapers3D.ts` | 356 | `buildTowerRuinedSkyscrapers` (22 ruined skyscrapers, instanced window grids & rooftop props) |
| `src/game3d/TowerCityAssets3D.ts` | 550 | Tower City geometries (`createGuardrailBeamGeometry`, `createHoledHighwayGeometry`, `createShatteredGlassShardGeometry`, `createJaggedCraterFissureGeometries`) & textures |
| `src/game3d/HudIcon3DRenderer.ts` | 785 | Offscreen WebGL fallback renderer (`init3dHudIcons`, 4 `other_*` icons on idle + `disposeObject3D`) |
| `src/game3d/HudIconOreModelsA3D.ts` | 653 | Procedural 3D ore icon builders W2–W4 + `toonMat` |
| `src/game3d/HudIconOreModelsB3D.ts` | 524 | Procedural 3D ore icon builders W5–W6 + `buildOreModel` |
| `src/game3d/ProceduralTextures3D.ts` | 1.087 | Procedural cyber-slate (`mixHex`), `getCircularNexusPoolTexture`, `getCyberColosseumDeckTexture`, `getSkyscraperFacadeTexture`, `getBroadcastBannerTexture` (`MyChibiMine` TV) & VFX textures w/ anisotropy (`paintCachedTexture`, `getFusionMagicCircuitTexture`, `getFusionPortalVortexTexture`, `getRuneSealTexture`, `getGroundCrackTexture`, `getFlamePuffTexture`) |
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
| Omega Duel Sanctum (Bosses, 5 Tiers, Forge Cutscene, Rooftop Arena) | `src/game/OmegaData.ts`, `OmegaBossDomain.ts`, `src/ui/OmegaBossModalUi.ts`, `OmegaForgeCutscene.ts`, `OmegaArenaHudUi.ts`, `OmegaBattleIcons.ts`, `HudOmegaBridge.ts`, `src/game3d/OmegaArena{3D,Stage3D}.ts`, `OmegaRooftop{Environment3D,Assets3D}.ts`, `public/badges/omega.svg` |
| Relic Forge (12 Relics, 3 Slot, Ore Source Pop-up) | `src/game/RelicData.ts`, `src/ui/ForgeModalUi.ts`, `public/relics/*.webp` |
| Index (13 Tabs, 127 Entries), Inventory + Presets & Chest | `src/game/IndexRewardsDomain.ts`, `TeamPresetsDomain.ts`, `src/ui/IndexModalUi.ts`, `IndexInspectorUi.ts`, `InventoryModalUi.ts`, `ChestModalUi.ts` |
| 7-Day Daily Login (`limited` 5★ Chibis) | `src/game/DailyLoginData.ts`, `DailyLoginDomain.ts`, `src/ui/DailyLoginModalUi.ts` |
| 3D Chibi Fusion World (Lab Bunker & Recipes) | `src/game/FusionData.ts`, `FusionDomain.ts`, `src/ui/FusionHudUi.ts`, `src/game3d/FusionWorld{3D,Arena3D,Podium3D}.ts`, `FusionLabBunker3D.ts`, `FusionSequence3D.ts` |
| Research Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts`, `src/ui/WorldsModalUi.ts` |
| Plot Inspector, `DMG Mult`/`Crit Chance`, Bulk Upgrades & Mutation Guard | `src/ui/PlotInspectUi.ts`, `src/game/UpgradeBulkHelper.ts`, `src/game/PlotUnitsDomain.ts` |
| Hold-to-Mine, Sweet-Spot, Tap Combo & Pit Events | `src/game3d/MineScene3D.ts`, `MineSceneInput.ts`, `OrePit3D.ts`, `src/game/TapComboHelper.ts`, `PitEventsDomain.ts`, `src/styles/global.css` |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` (`hud-{base,rarity,fx,modals,hotbar,widgets,battle}.css`), `src/ui/HudShared.ts` |
| Audio (BGM, Musical Combo Scale, Synth SFX, Mute) | `src/audio/AudioManager.ts`, `public/audio/` |
| 3D Sky, Weather, Pit, Pedestals, Blitz VFX & 3D Icons | `src/game3d/MineScene{3D,Stage3D,Input,Projector}.ts`, `WorldSkyTextures3D.ts`, `MineWorldPalette.ts`, `Weather{SkyShader,Fx3D}.ts`, `Ore{Billboard3D,Pit3D,PitStage3D}.ts`, `Plot{Pedestal3D,PedestalLabel3D,AuraFx3D,AttackController3D}.ts`, `SignatureProjectilePool3D.ts`, `MeshFx{3D,FusionShaders3D,TwinShadersA3D,TwinShadersB3D,OmegaShaders3D}.ts`, `Tier{AttackVfx3D,MotionPath3D,VfxPitClip3D,VfxPoolsInit3D,VfxUpdate3D,VfxChoreography3D,TwinChoreography3D,FusionChoreography3D}.ts`, `FieldMiner3D.ts`, `AttackImpactFx3D.ts`, `Chibi{Sprite3D,BackAttachments3D}.ts`, `ProceduralTextures3D.ts`, `HudIcon{3DRenderer,OreModelsA3D,OreModelsB3D}.ts`, `MeshHelpers3D.ts`, `GlbAssets3D.ts` |
| 3D Chest Vault, Escalator, Radar & Pillar Props | `src/game3d/CyberProps3D.ts`, `CyberCargoPod3D.ts`, `ProceduralTreasureChest3D.ts`, `ChestVaultStation3D.ts`, `CaveRailway3D.ts`, `ArenaWings3D.ts`, `MineEnvironment3D.ts`, `SkyMetropolis3D.ts`, `SkyMetropolisAssets3D.ts` |
| 3D Shop Plaza, Enchant Altar & Tower Arena | `src/game3d/Shop{CyberPlaza3D,CyberPlazaSkyline3D,CyberPlazaKiosks3D,CyberPlazaAssets3D,World3D}.ts`, `EnchantAltarRoom3D.ts`, `AuraModels3D.ts`, `HellAltarEye3D.ts`, `AltarSpinFx3D.ts`, `SeraphimBoss{3D,Parts3D,Geometry3D}.ts`, `Tower{Arena3D,ArenaCombat3D,ArenaStage3D,CityEnvironment3D,CitySkyscrapers3D,CityAssets3D}.ts` |
| CrazyGames SDK v3, Rules & Skills | `src/sdk/crazygames.ts`, `.agent/rules/threejs-ts-standards.md`, `.agent/skills/{crazygames-sdk-v3,ui-hud-design,procedural-3d-assets,sakuga-skill-shaders}/SKILL.md` |

---

## 4. RILIS & DEPLOY

- **GitHub Pages**: auto-deploy via `.github/workflows/deploy.yml` setiap push ke `main` (test + Vite build + deploy). Hash assets Pages = build commit pushed terakhir.
- **CrazyGames**: upload **MANUAL** lewat developer dashboard (tidak auto-deploy). Folder build lokal: `Downloads/my_pixel_mine_cg_build` (nama folder legacy sengaja dipertahankan) — mirror persis `dist/`. Tiap update: copy `dist/.` ke folder tersebut lalu prune file `assets/*` hash lama yang tidak ada di `dist/assets`. Status sinkronisasi terakhir tercatat: commit `e4869e9` (`1.060` file identik dengan `dist/`).
- **Save pemain**: `localStorage` (`GameStateSave.ts`) + **APS (Automatic Progress Save)** CrazyGames otomatis backup/sync antar-device untuk user login CG tanpa kode tambahan. Guest tetap lokal. **Jika IAP ditambah nanti, APS dilarang** → migrasi ke SDK data module.
- **Build lokal vs CG**: perbedaan performa/visual antara lokal/Pages dan CG biasanya disebabkan umur build CG yang tertinggal commit terbaru. Cek hash assets terlebih dahulu.
