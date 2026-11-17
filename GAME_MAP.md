# PETA STRUKTUR GAME — My Pixel Mine

3D voxel/chibi mining idle game built with **TypeScript + Vite + Three.js + Tailwind CSS v4** (`my_pixel_mine`).
Read this map first to locate modules and line anchors quickly instead of reading large files end-to-end.
Line numbers measured on **2026-11-18** after **Weather Meteor event (`public/meteors/*.webp`, Auto Meteor toggle, Weather Forecast drop inspector), 5 Weather Limited Ores (`WEATHER_ORES`, 53 ores total) & 5 Weather Limited Chibis (`getWeatherLimitedMiners`, 35 chibis total), Weather Index tab (`CollectionModalsUi`), anti-one-hit boss cap, modal scroll preservation, tower key/sweep rebalance, audio toggle upgrade**, plus **Chibi & Enchant placement limits, pit-floor auto-target, animated Pickaxe cursor, 2.5D Tower Boss sprite, Interactive Tutorial (`TutorialUi.ts`), CrazyGames QA readiness, & World 3–6 economy rebalance**; re-measure with `Select-String` if files change.

## 1. ATURAN KERJA SINGKAT

1. **Verifikasi wajib setelah edit**: jalankan `npm.cmd test` (Vitest) dan `npm.cmd run build` (`tsc --noEmit && vite build`), plus smoke-test browser jika UI/3D berubah.
2. **UI Styling**: gunakan utility classes Tailwind CSS v4 (atau helper constants `TW_*` di `src/ui/HudShared.ts`). Tema UI menggunakan **Modern Dark-Glass + Luminous Gradient Rails** (`data-modal-theme`, `.mam-modal`, `.mam-modal-rails`, `.mam-title-plaque`, `.mam-inspector-well`, `.mam-no-scrollbar`, `@media (forced-colors: active)`) yang tersimpan di `src/styles/hud.css`.
3. **Jaga kebersihan modul UI**: jangan tumbuhkan file UI di atas ~800–1.000 baris; pecah layar/modal baru ke domain module terpisah di `src/ui/` lalu delegasikan dari `GameHud.ts`.
4. **Pure game logic & 3D invariants**: pertahankan pure helper (`applyNodeDamagePure`, `rollEnchantDef`, dll.) agar unit test Vitest (`tests/world-3d.test.ts`) tidak butuh WebGL/DOM penuh.
5. **Aset `.glb` & sprites (`public/`)**: jangan timpa/hapus model atau sprite tanpa permintaan eksplisit user.

---

## 2. PETA FILE (`my_pixel_mine`)

```
index.html                      Entry HTML (Vite root)
.gitignore                      Ignore `node_modules/`, `dist/`, `.vite/`, local/OS files
.github/workflows/deploy.yml    GitHub Actions auto test, Vite build & deploy ke GitHub Pages (`main`)
package.json                    Dependencies: three, vite, typescript, vitest, @tailwindcss/vite, @types/node
vite.config.ts                  Standalone Vite + Tailwind CSS v4 config (`base: './'`)
tsconfig.json                   TypeScript strict config
GAME_MAP.md                     Peta struktur file & anchor (dokumen ini)

=== ENTRY & TESTS ===
src/main.ts                     243 baris — Bootstrap Three.js scene (`MineScene3D`), `GameState`, `GameHud` (+ plot drop ops, `'limit'` toast,
                                            weather & CC0 `AudioManager` sync), CrazyGames SDK init, Tower callbacks & game loop
tests/world-3d.test.ts        1.564 baris — 39 Vitest unit & integration specs (3D world, Altar dial/dice & 2.5D billboard pedestals,
                                            Equip Best stat preservation, Chibi/Enchant 1-per-unit plot exclusivity, pure ore damage, research trees
                                            incl. Core-only tap damage, +300K Core Vault Expansion, & W1-W6
                                            denseOreScale HP x10 / Drop x3, Gem Tower 10-wave 5-ore + Boss
                                            + 5s Boss Invulnerability + 5s Blessing Auto-Pick + strike-only damage + anti-one-hit boss cap
                                            + 5-floor milestones, Shop Plaza, Megacorp Mainframe Arena, background mining,
                                            hotbar drag reorder & hotbar-to-plot swap/equip, 5-Weather 5% Celestial buffs,
                                            Weather Meteor & Weather Limited Ores/Chibis, world/chibi-scaled upgrade costs,
                                            Frozen+ mutation roll protection, 35 chibis, Exotic/Secret tiers, buffed miner drops,
                                            World 6 Starwell, Chibi Star-Up & World Resonance synergy)

=== GAME DATA & STATE ===
src/game/GameData.ts            668 baris — World (`underground`..`starwell` W1-W6), `ORES` 112 (48 world + 5 `WEATHER_ORES` = 53 ores),
                                            `WORLD_MINERS` 261 (30 world miners: 5/world incl. Exotic & Secret + 5 `getWeatherLimitedMiners`),
                                            `PICKAXES` 307 (12 tiers W1–W6), `MUTATIONS` 322, `ENCHANTS` 336 (`ENCHANT_DICE_GEM_COST` 334),
                                            `isHighTierMutation` 398 (`frozen`..`unreal`), `GEM_SHOP_ITEMS` 408,
                                            `rollMutation` 524, `CHIBI_STAR_TIERS` 596, `WORLD_RESONANCE_TIERS` 624,
                                            `computeWorldResonances` 637, `rollWorldOre` 659, `rollWorldMiner` 664
src/game/ResearchData.ts      1.533 baris — `ResearchTreeId` (`core` | WorldId) 3, `DENSE_ORE_HP_MULT` (10) /
                                            `DENSE_ORE_DROP_MULT` (3) 19–20, `RESEARCH_TREE_META` 63,
                                            `formatNodeEffectLine` 129, `getNodeNextCost` 164, `CORE_NODES` 172
                                            (Strike I–VI sole `tapDamageFlat`, Vault Expansion I–II `+300K`),
                                            `STARWELL_NODES` 1326, `RESEARCH_NODES` 1509
src/game/TowerData.ts           360 baris — `TOWER_MAX_KEYS` (5), `TOWER_KEY_REGEN_MS` (10m), `TOWER_WAVES_PER_FLOOR` (10),
                                            `TOWER_ORE_ROCKS_PER_WAVE` (5), `TOWER_BLESSING_AUTO_PICK_SEC` (5), `TOWER_BOSS_INVUL_SEC` (5),
                                            `TOWER_CHECKPOINT_STEP` (5), `TOWER_ANOMALIES`, `TOWER_BLESSINGS`,
                                            `TOWER_MILESTONES` (per 5 floor: 5..50), `getTowerFloorDef`, `getTowerWaveDef`,
                                            `rollTowerWaveOres`, `getTowerCheckpoints`, `getTowerSweepGemReward`, `getGlobalGemGainBonus`
src/game/WeatherData.ts         187 baris — `WeatherId` (`light_rain` | `snow_rain` | `bloodmoon` | `void` | `celestial`) 1,
                                            `WEATHER_DURATION_MS` (3m) 3, `WEATHERS` 33 (Celestial 5%: 10x Ore / 4x Gem / 5x DMG),
                                            `getWeatherById` 175, `rollWeatherDef` 179
src/game/GameState.ts         2.170 baris — `PlotUnitState` 139, `SavePayload` 149, `getChibiUpgradeCostMult` 205
                                            (skala biaya upgrade per world & mild rarity premium), `GameState` 232: plot loadout/
                                            leveling, Chibi Star-Up (`getChibiStar` 422, `starUpChibi` 442, `autoStarUpAll` 458),
                                            World Resonance synergy (`getActiveWorldResonances` 474), 1-per-unit Chibi & Enchant plot limits
                                            (`equipChibiOnPlot` `'limit'`, `getAvailableEnchantCount`, `togglePlotEnchant`, `clearHotbarSelection`),
                                            `rollPlotMutation`, buffed `onOreBroken` miner drops, chests (+35% Full-Chest `sellAllChestOres`),
                                            inventory/ore stack, hotbar 1..9, shop stock, potions, research, altar enchant, weather sync/timer/buffs,
                                            Weather Meteor event & Auto Meteor toggle, `getOreHpScale` / `getOreOutputMult` (`denseOreScale`),
                                            global gem bonus, Gem Tower 10-wave/strike-only state/keys/runs/sweep (+ 5s Boss Invul,
                                            5s Blessing Auto-Pick & anti-one-hit boss cap), localStorage save (+ excess plot sanitization)
src/game/AssetUrl.ts             11 baris — `assetUrl` (resolusi URL aset `public/` terhadap `BASE_URL` `./` agar aman di subpath)
src/game/NumberFormat.ts         45 baris — `fmtShort` 22, `fmtMoney` 33, `fmtInt` 37, `fmtPct` 41
src/audio/AudioManager.ts       588 baris — Web Audio SFX pool + synth (`playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`,
                                            `playEnchantEquip`) & HTMLAudio BGM switcher (`audio` singleton, `setSceneMode`,
                                            `playOreHit`, `playOreBreak`, `playSfx`, mute persistence & tab/ad auto-mute)
src/sdk/crazygames.ts           200 baris — CrazyGames SDK v3 wrapper (`isCrazyGamesEnv` 36, `cgLoadingStart` 64,
                                            `cgGameplayStart` 80, `cgHappyTime` 100, `cgRequestRewardedAd` 108)

=== UI HUD, MODALS & CSS (Modular Architecture) ===
src/ui/GameHud.ts             2.173 baris — `GameHud`: Thin UI coordinator; manages 3D overlay layers (incl. Tower ore bars & Meteor bar),
                                            viewport scaling (`updateViewportScale`), currency rail + upgraded audio mute toggle, Weather top-left
                                            3D HUD (`renderWeatherWidget`, Forecast drop inspector, Auto Meteor toggle), hotbar 1..9 (click + drag
                                            reorder + plot drop + auto-clear on outside click), modal scroll preservation, active potion pills,
                                            World Resonance HUD badges, Shop Plaza HUD, Altar HUD + Auto Roll (`triggerSingleEnchantRoll`),
                                            100ms Tower timer tick (incl. 5s Blessing auto-pick) & real chibi strike dispatch
src/ui/HudShared.ts             240 baris — `chibiPortraitHtml` 6 (smooth/pixel portrait), shared types (`ModalKind` 16,
                                            `ModalThemeId` 28, `InvTab` 30), rarity/ring helpers (`rarityCardClasses` 33 incl.
                                            `exotic`/`secret`, `rarityVars`, `applyInspectRing`), `refreshPotionTimersInDom`,
                                            dark-glass Tailwind `TW_*` constants, shared shell builders (`renderModalShell` 148,
                                            `renderInspectorPanel` 184)
src/ui/CollectionModalsUi.ts  1.069 baris — `CollectionModalsUi` 42: Index modal (6 worlds + Weather Index tab + Inspector + Chibi 4-pose `Review` `<dialog>`),
                                            Backpack/Inventory (Equip Best / Auto Star-Up / Star-Up Miner / Search / Inspect), Chest modal & live updaters
src/ui/ShopModalsUi.ts          653 baris — `ShopModalsUi` 42: Pickaxe Shop, Gem Shop, Sell Shop + Inspectors & updaters
src/ui/TowerUi.ts               561 baris — `TowerUi` 19: Gem Tower Hub Dark-Glass modal (`renderTowerHubModal` 44:
                                            Keys, 5-Floor Checkpoints & Milestones, Anomalies, Quick Sweep, Run Summary) &
                                            3D Arena HUD (`renderTowerArenaHud`, unified Boss & Wave HP bar styling, 5s Boss Invul shield, 5s Blessing auto-pick)
src/ui/TutorialUi.ts            553 baris — `TutorialUi`: Interactive step-by-step onboarding spotlight & arrow guide
src/ui/UpgradesWorldsUi.ts      596 baris — `UpgradesWorldsUi` 17: Research/Upgrades tree & World Teleport full-banner
                                            modal (`buildWorldsListHtml` 308 pakai `public/worlds/*.jpg`) & live updaters
src/ui/PlotInspectUi.ts         412 baris — `PlotInspectUi` 27: Plot Inspector overlay (incl. ★Star, World Resonance & per-unit Enchant `In Use`/`Equipped` status), live updater & modal
                                            konfirmasi peringatan roll mutasi Frozen+ (`renderMutationConfirmOverlay`
                                            219: `Stop (Keep)` / `Continue`, proteksi obtain & overwrite)
src/ui/HudIcons.ts              371 baris — SVG, 2D fantasy art (`public/{enchants,hud,meteors,ores,pickaxes,potions,weathers}/*.png|webp`), & 3D-thumbnail icon helpers (`HUD_ICONS`, `hudIconHtml`,
                                            `weatherIconHtml`, `towerIconHtml`, `pickaxeIconHtml`, `gemPotionIconHtml`,
                                            `enchantAuraIconHtml`, `enchantDiceIconHtml`, `researchIconHtml`)
src/styles/global.css            73 baris — Tailwind v4 entry (`@import "tailwindcss";`) + base font/reset + pickaxe cursor styles
src/styles/hud.css              992 baris — Modern Dark-Glass + Luminous Gradient Rail system (`[data-modal-theme]`,
                                            `.mam-modal`, `.mam-modal-rails`, `dialog.mam-review-dialog`, `.mam-grid` `max-content` rows, `.mam-no-scrollbar`, `.mam-chibi-smooth`,
                                            `.rarity-exotic`, `.rarity-secret`, `.mam-hotbar-dragging` / `.mam-hotbar-drop-target`, keyframes, a11y)

=== 3D WORLD & RENDERERS ===
src/game3d/MineScene3D.ts     1.008 baris — Main Three.js scene controller: switches `mine` / `shop` / `altar` / `tower`,
                                            runs background pit/miner ticks, pit-floor click auto-target highest-HP alive ore (`getPitFloorHit`),
                                            animated pickaxe cursor (`mine` / `tower-core` hover only, hidden behind modals),
                                            weather sky/fog/lighting (`setWeather`, `applyWeatherAtmosphere`), raycasts & emits plot/station/tower-ore anchors
src/game3d/MineEnvironment3D.ts 531 baris — Surrounding terrain, sky dome (`skyHandle` `WeatherSkyMaterialHandle` 32,
                                            `setWeatherSky` 498), cliff walls, Sanctuary gate pillars & world lighting
src/game3d/WeatherSkyShader.ts  237 baris — Animated GLSL Atmospheric Sky Shader (`createWeatherSkyMaterial` 184:
                                            sky gradient, layered FBM clouds, stars/nebula, Bloodmoon & Celestial moons)
src/game3d/WeatherFx3D.ts       213 baris — `WeatherFx3D` 74: 3D weather particles (rain/snow/embers/void/starfall)
                                            with soft radial/streak canvas textures
src/game3d/MineWorldPalette.ts  113 baris — `WORLD_PALETTES` 25 (6 worlds incl. `starwell`), `ORE_VARIANTS` 99, `rollOreVariant` 105
src/game3d/OrePit3D.ts          960 baris — Pit floor, shared `OreBillboard2D` 2D ore sprites (`public/ores/*.png`) & Weather Meteor node
                                            (`public/meteors/*.webp`) + squash-on-hit, hit VFX (skipped when hidden),
                                            `getAliveNodesInfo` & `applyNodeDamagePure` 41
src/game3d/PlotPedestal3D.ts    263 baris — Plot pedestals around the pit & camera-aligned enchant rings
src/game3d/FieldMiner3D.ts      179 baris — Active chibi miner placement, swing/background mining tick & movement in mine
src/game3d/ChibiCatalog.ts      465 baris — `CHIBI_CATALOG` 63 (35 chibi poses WebP: 30 world + 5 weather-limited, `ChibiRarity` `common`..`secret`,
                                            baseDps, `smoothFilter` W1–W6, world roster, `getChibiFrameUvOffset`)
src/game3d/ChibiSprite3D.ts     390 baris — Animated 2D-in-3D upright billboard sprite (`triggerAttack`, `smoothFilter` linear/mipmap vs nearest, camera-pitch tilt, normalized pose sizing, alpha-clipped directional shadow + soft AO contact shadow)
src/game3d/ShopWorld3D.ts     1.388 baris — 3D Shop Plaza dengan aset Kenney (`fantasy-town/`, `castle/`, `nature/`), Plaza walkers, &
                                            5 emblem bangunan 2.5D (`ArtBillboard2D`), elevated station badges,
                                            & Outer Space Altar clock room (10 pedestal 2.5D `EnchantBillboard2D`)
src/game3d/TowerArena3D.ts    1.363 baris — Megacorp Mainframe Core 3D Cyber-Arena: cyberspace wireframe grid dome,
                                            Holographic AI Core, server monolith towers + vertical data stream beams, PCB circuit deck,
                                            8 server pylons, 5 2D wave ore slots (Waves 1–9), 2.5D Seraphim AI Overlord Boss (`tower-core`, Wave 10), & Chibi Fighters
src/game3d/AltarSpinFx3D.ts     529 baris — `createAltarClockDial` 34, `createAltarClockHand` 156,
                                            `createAltarSubHand` 254, `AltarParticleSystem` 308
src/game3d/HellAltarEye3D.ts    372 baris — `HellAltarEyeController` 151: Outer Space starfield, cosmic astrolabe floor ring,
                                            & distant Pitch-Black Black Hole (`#000000` event horizon, photon ring, lensing arches, accretion disk)
src/game3d/AuraModels3D.ts      584 baris — `createEnchantAura3D` 276, `createEnchantDice3D` 318, `ArtBillboard2D` 412 & `EnchantBillboard2D` 571 (2.5D sprites)
src/game3d/HudIcon3DRenderer.ts 2.002 baris — Offscreen WebGL renderer generating cached data-URL 3D icons (`buildStarwellOreModel` 1351)
                                            & 5 3D weather icons (`init3dHudIcons` 1842)
src/game3d/ProceduralTextures3D.ts 441 baris — Procedural canvas textures (sky dome, terrain, quarry floor, cobble, etc.)
src/game3d/GlbAssets3D.ts       135 baris — Async GLTF/GLB loader & cache (`mountGlbProp` 45, `preloadCommonMineModels` 116)

=== ASSETS (`public/`) ===
public/audio/                   CC0 BGM (`bgm/bgm-{mine,shop,tower,boss}.mp3`) & 24 SFX (`sfx/*.ogg|wav|mp3`) + `LICENSE.txt`
public/chibi/                   35 chibi (`<id>/{attack,idle,pose,walk}.webp` W1–W6 + 5 weather-limited non-pixel anime art, 140 files)
public/enchants/                11 transparent PNG fantasy aura & dice icons (`blazing`..`spellbound`, `enchant_dice`)
public/hud/                     17 HUD & modal art icons (`shops`..`lock`, incl. `tower_boss.webp` 2.5D Tower Boss sprite)
public/meteors/                 5 Weather Meteor `.webp` sprites (`light_rain`, `snow_rain`, `bloodmoon`, `void`, `celestial`)
public/models/                  Kenney & fantasy `.glb` packs (`castle/`, `factory/`, `fantasy-town/`, `mini-dungeon/`,
                                `modular-cave/`, `nature/`, `platformer/`, `retro-fantasy/`, `survival/`, `train/`)
public/ores/                    53 transparent PNG fantasy ore icons (48 W1–W6 `underground`..`starwell` + 5 weather-limited)
public/pickaxes/                12 transparent PNG fantasy pickaxe art icons (`starter`..`starwellcrown`)
public/potions/                 8 transparent PNG fantasy potion art icons (`ore-elixir-1`..`mutation-luck-1`)
public/weathers/                5 transparent PNG fantasy weather emblem icons (`light_rain`..`celestial`)
public/worlds/                  6 full-bleed teleport banner JPGs (`underground`, `crystal`, `magma`, `ruins`, `astral`, `starwell`)
```

---

## 3. QUICK TARGET LOOKUP (Edit cepat)

| Tugas / Area | File & Simbol |
|---|---|
| Ore, Miner (`Exotic`/`Secret`), Star-Up & World Resonance | `src/game/GameData.ts` (`ORES`, `WORLD_MINERS`, `CHIBI_STAR_TIERS`, `WORLD_RESONANCE_TIERS`, `computeWorldResonances`) |
| Research tree nodes, Core Strike/Vault & `denseOreScale` | `src/game/ResearchData.ts` (`CORE_NODES`, `STARWELL_NODES`, `RESEARCH_NODES`, `DENSE_ORE_HP_MULT`, `getNodeNextCost`) |
| Gem Tower scaling, Anomalies, Blessings, Milestones | `src/game/TowerData.ts` (`getTowerFloorDef`, `TOWER_BLESSINGS`, `TOWER_MILESTONES`) |
| Weather config, probabilities & multipliers | `src/game/WeatherData.ts` (`WEATHERS`, `WEATHER_DURATION_MS`, `rollWeatherDef`) |
| State, Star-Up, Resonance, Save/Load, Hotbar/Plot, Weather | `src/game/GameState.ts` (`GameState`, `starUpChibi`, `autoStarUpAll`, `getActiveWorldResonances`, `getChibiUpgradeCostMult`, `syncWeather`) |
| Responsive HUD scale, Topbar, Weather HUD, Altar Auto Roll, Hotbar | `src/ui/GameHud.ts` (`updateViewportScale`, `render`, `setSceneMode`, `triggerSingleEnchantRoll`) |
| Shared Modal Shell, Inspector Shell, Tailwind `TW_*` | `src/ui/HudShared.ts` (`renderModalShell`, `renderInspectorPanel`, `TW_*`) |
| Pickaxe Shop, Gem Shop, Sell Shop + Inspectors | `src/ui/ShopModalsUi.ts` (`ShopModalsUi`) |
| Gem Tower Hub Modal, 3D Arena HUD, Blessings picker | `src/ui/TowerUi.ts` (`TowerUi`) |
| Index (6 Worlds), Backpack/Inventory, Chest + Inspectors | `src/ui/CollectionModalsUi.ts` (`CollectionModalsUi`) |
| Research/Upgrades Tree & World Teleport Banner Modal | `src/ui/UpgradesWorldsUi.ts` (`UpgradesWorldsUi`, `buildWorldsListHtml`) |
| Plot Inspector Overlay & Frozen+ Mutation Confirm Modal | `src/ui/PlotInspectUi.ts` (`PlotInspectUi`, `renderMutationConfirmOverlay`) |
| Modal/HUD CSS & Responsive Breakpoints | `src/styles/hud.css` + `src/ui/HudShared.ts` (`TW_*`) |
| Audio (BGM switcher, Web Audio Synth Roll/Spin SFX, Mute toggle) | `src/audio/AudioManager.ts` (`audio`, `playMutationRoll`, `playEnchantSpinStart`, `playEnchantSpinLand`) + `public/audio/` |
| 3D Sky Shader, Weather FX, Ore Pit & 3D HUD Icons | `src/game3d/WeatherSkyShader.ts`, `WeatherFx3D.ts`, `OrePit3D.ts`, `HudIcon3DRenderer.ts` |
| 3D Shop Plaza, Outer Space Enchant Altar + Black Hole & Tower Arena | `src/game3d/ShopWorld3D.ts`, `src/game3d/HellAltarEye3D.ts`, `src/game3d/AltarSpinFx3D.ts`, `src/game3d/TowerArena3D.ts` |
