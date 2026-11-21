# Omega Tier & Dual Boss Battle Sanctum — Design Spec

**Date:** 2026-11-21
**Status:** Approved

## Intent & Why
Turn the two decorative floating octagonal helipad outposts on the left (`x = -28.4`, Cyan) and right (`x = +28.4`, Magenta) flanks of Shop Cyber Plaza into interactive **Battle Boss** gateways leading to a dedicated new 3D duel world (**Omega Duel Sanctum**), introducing the endgame **`omega`** tier (`Crimson Ronin` and `Obsidian Sovereign`) powered by **all-3 core dopamine passives** (`Team DMG`, `Sell Ore`, `Drop Ore`). Unlike Gem Tower's 9-wave grind for `twin` Spire Coins, Omega Boss Battles deliver fast, active 45-second 1-on-5 squad duels with interactive parry/pillar mechanics, an `OMEGA BREAK!` stagger window, and 5 escalating Boss Tiers with increasing Core drop percentages.

## Goals
- **Assets (`public/chibi/` + `public/badges/`)**:
  - Slice `C:\Users\HDD\Downloads\cadangan asset\omega 1\gemini-generated-image-m6mijim6mijim6mi-sheet-32px.png` (`crimson-ronin`) and `omega 2\gemini-generated-image-81w0a181w0a181w0-sheet-32px.png` (`obsidian-sovereign`) into tight-cropped 300px-tall RGBA WebPs (`idle.webp`, `walk.webp`, `attack.webp`, `pose.webp`).
  - Add custom animated SVG badge crest `public/badges/omega.svg` and `.rarity-omega` / `.mam-omega-badge` Sticker-Pop styling (`crimson-gold-obsidian` holo shimmer).
- **`omega` Rarity Tier (`ChibiCatalog.ts` + `OmegaData.ts`)**:
  - Add `'omega'` to `ChibiRarity` (`crimson-ronin` = `5.5×` latest World Secret DPS, `obsidian-sovereign` = `6.5×`; upgrade cost scale `32×` and `40×` of `getWorldUpgradeCostScale(anchor.worldId)`).
  - Auto-sync via `syncTwinCatalogDpsFromAnchor` (or generalized `syncSpecialCatalogDpsFromAnchor`), mark `isNonSellableChibi`, and grant **all 3 core dopamine passives simultaneously** when deployed on plots:
    - `Crimson Ronin`: `+200% Team DMG • +120% Drop Ore • +80% Sell Ore`
    - `Obsidian Sovereign`: `+220% Team DMG • +90% Drop Ore • +140% Sell Ore`
  - Add **Omega Awaken (Star-Up 1★ → 5★)** using extra Boss Cores (`+15%` passive boost per star above 1★, or leverages `chibiStars` + `CHIBI_STAR_TIERS` seamlessly!). Leveraging existing `chibiStars` + `CHIBI_STAR_TIERS` via a dedicated "Awaken with Cores" action in the Omega Boss Hub avoids inventing parallel star math and scales both DPS and star-up nicely!
- **Plaza Integration (`ShopCyberPlaza3D.ts` / `ShopWorld3D.ts`)**:
  - Add two clickable `ShopStationId` entries (`'omega-left'` at `x = -28.4, z = -2.2` and `'omega-right'` at `x = +28.4, z = -2.2`), render animated `ChibiSprite3D` Boss guardians hovering on each pad, add `ShopStationAnchor` labels (`Crimson Ronin • Tier N` / `Obsidian Sovereign • Tier N`), and open the corresponding Omega Boss Hub modal on click.
- **Dedicated 3D World (`OmegaArena3D.ts`, `SceneMode = 'omega'`)**:
  - New self-contained 3D duel world (**Omega Duel Sanctum**) matching Boss theme (`crimson` cyber dojo vs `obsidian` iron throne), featuring an elevated Boss dais, 5 player Chibi fighter slots (`ChibiFieldFxController`), 3D Boss sprite (`ChibiSprite3D`), clickable 3D mechanical targets (Crimson Phantom Blades / Obsidian Aegis Pillars), unified `AttackImpactFxController` 5-layer slashes & shatter novas, and `dispose()` cleanup.
- **5-Tier Boss Battle System & Escalating Core Drop % (`OmegaBossDomain.ts`)**:
  - Each Boss has **5 Tiers (`I`..`V`)** unlocked sequentially (defeating Tier `N` unlocks `N + 1`).
  - **Entry**: Uses **Boss Keys** (`OMEGA_MAX_KEYS = 5`, 1 key regens every 15m; **key is only consumed on Victory**, never lost on defeat/timeout/retreat!). Extra keys purchasable with Gems (`150` Gems) or Rewarded Ad (`CG_ADS_ENABLED`).
  - **Active 45s Battle Loop**:
    - Your 5 plot Chibis auto-strike the Boss (`Team DMG` + `Pickaxe` + `Relics` + `Enchants` + `Overclock` synergy; **never** depends on `Tap DMG`).
    - **Crimson Ronin (`omega-left`)**: Spawns **Parry Ring** telegraphs every ~6s (click in golden window → **PARRY!** deals 8% Boss Max HP burst + `+25%` Stagger, miss → Boss gains temporary 8% barrier) and summons **2 Phantom Blades** at `60%` & `30%` HP (clicking them shatters them for `+20%` Stagger).
    - **Obsidian Sovereign (`omega-right`)**: Plants **2 Obsidian Pillars** (`-60%` incoming DMG until clicked/shattered for `+25%` Stagger each) every ~10s and drops **Rune Seals** (clicking grants `+20%` Stagger + instant squad crit volley).
    - **Stagger Gauge (`0% → 100%`) → `OMEGA BREAK!` (`7s`)**: Boss takes **`2.5×` Team DMG**, glows exposed, and plays crystal chord audio.
  - **Escalating Core Drop % per Tier**:
    - Tier I (`Initiate`): **20%** (`1` Core)
    - Tier II (`Challenger`): **40%** (`1` Core)
    - Tier III (`Master`): **65%** (`1–2` Cores)
    - Tier IV (`Nightmare`): **85%** (`2` Cores)
    - Tier V (`Omega Apex`): **100%** (`2–3` Cores)
  - **Forge / Unlock & Awaken**: **5 Cores** unlock the corresponding `OMEGA` Chibi (placed into inventory/hotbar + Index discovered). Additional Cores can Awaken (`1★ → 5★`, costing `3 / 5 / 8 / 12` Cores per star) to boost `chibiStars`.
- **Index, Save & UI Parity**:
  - Add `'omega'` tab to `IndexRewardsDomain.ts` (`ALL_INDEX_TABS`), `IndexModalUi.ts` (`Special Tiers`), and `IndexInspectorUi.ts` (`Ω OMEGA` crest, `is-holo-foil`).
  - Persist `omega` state (`keys`, `lastKeyRegenAt`, `cores`, `bestTier`, `kills`, `claimedFirstClears`) in `GameStateSave.ts` safely with backward-compatible defaults.
  - Sticker-Pop Warm Cream UI (`OmegaBossModalUi.ts` for Hub & Tier selector + `OmegaArenaHudUi.ts` for Battle HUD & Victory/Defeat summary).

## Non-Goals
- No `tapDmgPct` scaling in Boss Battles (combat scales from deployed Chibi Team DMG + interactive Parry/Pillar clicks + Stagger Break).
- No filler ore waves inside Omega Duel Sanctum (immediate 1v5 Boss duel).
- No changes to existing Gem Tower floors/rewards or `twin` Spire Coin costs.

## Approaches Considered
1. **Dedicated `OmegaArena3D` Scene Mode + Pure `OmegaBossDomain` (Chosen)**: Mirrors the clean `TowerArena3D` / `TowerRunDomain` separation while keeping Plaza pads lightweight (`ArtBillboard2D`/`ChibiSprite3D` previews + clickable stations). Keeps `MineScene3D.ts` under 1,000 lines and makes all Boss math, drop rates, and unlock/awaken rules unit-testable in Node without WebGL.
2. **Zooming Camera onto Plaza Floating Pads (Rejected)**: Rejected by user in favor of a dedicated new 3D world for stronger spectacle and arena focus.

## Constraints
- Strict TypeScript (`no any`), `delta <= 0.1`, explicit `.dispose()` on all `OmegaArena3D` meshes/materials/textures.
- Keep every modified/new file `< 1,000` lines (`OmegaData.ts`, `OmegaBossDomain.ts`, `OmegaArena3D.ts`, `OmegaBossModalUi.ts`, `OmegaArenaHudUi.ts`).
- Sticker-Pop Deluxe Warm Cream theme (`#fff8e7` / `#14111d` borders, `TW_*` shared classes, no `backdrop-blur`).
- Verify with `npm.cmd test`, `npm.cmd run build`, and update `GAME_MAP.md`.
