# Design: Inter-World 1,000× Capability Scaling & Starter Chibi Grant (Opsi A)

**Date:** 2026-11-23  
**Project:** My Chibi Mine (`my_chibi_mine`)  
**Status:** Draft — awaiting user approval  

---

## 1. Intent & Why

Currently, Chibi `baseDps` only grows ~3–4× per World (`8` in World 1 to `4.4M` in World 8), and World `oreHpMult` grows 40–180× per World without granting any new-world starter Chibi on unlock. Because `plotMiners` are global and special Chibis (`Twin`, `Omega`, `Limited`) scale globally to World 8, strong Chibis from earlier Worlds or global units can carry too easily into newly unlocked Worlds instead of letting each World feel like a distinct power bracket.

The goal of this design is to establish a clean **1,000× per World** capability ladder (`1K–1M` → `1M–1B` → `1B–1T` → `1T–1Qa` → `1Qa–1Qi` → `1Qi–1Sx` → `1Sx–1Sp` → `1Sp–1Oc`) and automatically award the **lowest-tier Chibi of each newly unlocked World** so the player starts each World on its natural baseline and grinds upward through that World's roster, ores, and research.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **1,000× Capability Ladder (`W1`–`W8`):** Align Chibi `baseDps`, World `oreHpMult`, Ore `sellValue`, World `unlockCost`, `WORLD_UPGRADE_COST_SCALE`, World Research costs, and Tower/Omega HP scales so each World cleanly spans one `1,000×` tier bracket:
  - W1 (`underground`): `1K – 1M` (Unlock W2: `1M`)
  - W2 (`crystal`): `1M – 1B` (Unlock W3: `1B`)
  - W3 (`magma`): `1B – 1T` (Unlock W4: `1T`)
  - W4 (`ruins`): `1T – 1Qa` (Unlock W5: `1Qa`)
  - W5 (`astral`): `1Qa – 1Qi` (Unlock W6: `1Qi`)
  - W6 (`starwell`): `1Qi – 1Sx` (Unlock W7: `1Sx`)
  - W7 (`abyssal`): `1Sx – 1Sp` (Unlock W8: `1Sp`)
  - W8 (`chrono`): `1Sp – 1Oc`
- **Starter Chibi on World Unlock:** Unlocking any World `W2`–`W8` automatically grants **1× the lowest-`baseDps` Chibi** from `WORLD_MINERS` for that World, marks it discovered in the Index, and notifies the player.
- **No Premature Endgame Carry:** Cap progression-scaled units (`Twin`, `Omega`, `Limited` daily rewards) based on the player's **highest unlocked World** (and discovered tier inside it), and match `Weather` / `Fusion` units strictly to their source Worlds.

### Non-Goals
- Separate per-world plot slots or locking/banning old Chibis when entering a new World (excluded because the user chose **Opsi A**).
- Redesigning the 14 existing Shop Pickaxes (`PICKAXES`), whose cost curve (`0` → `1.2Sx`) and `dmgMult` (`1` → `20,000`) already match the `1K–1Sp` World progression.

### Anti-Goals
- Breaking or wiping existing player saves when loading migrated numbers.
- Allowing a Day-7 `Limited` or early `Twin` purchase to one-shot Worlds `2`–`7` immediately upon unlock.

---

## 3. Approaches Considered

1. **Opsi A — Natural 1,000× Scaling + Starter Chibi Grant + Progression Cap (Chosen):**  
   Scale Chibi `baseDps`, Ore HP/Sell values, World unlock costs, upgrade scales, and research costs cleanly by ~`1,000×` per World (`1000^w`). Award 1× the lowest-tier Chibi when unlocking a World. Cap global/special units (`Twin`/`Omega`/`Limited`) dynamically to the player's unlocked World progression.
   - *Tradeoff:* Existing save/DPS balance changes noticeably (old W1–W8 units adopt the new curve), and static catalog tests must be updated alongside the new math; however, players keep full plot freedom, Resonance synergies stay intact, and no extra per-world deck UI is needed.
2. **Opsi B — Strict World Isolation (Rejected):**  
   Separate plot decks per World or hard DMG penalties (`-99%`) on older-World Chibis. Rejected as heavier friction than needed once the `1,000×` natural gap makes old-world units obsolete anyway.

---

## 4. Detailed Architecture & Decisions

### 4.1 World Progression Multipliers (`W1`–`W8`)
For world index `w ∈ {0..7}`:

| World (`w`) | Id | Tier Range | Unlock Next World | World Miner `baseDps` (5 tiers) | `oreHpMult` | `WORLD_UPGRADE_COST_SCALE` |
|---|---|---|---|---|---|---|
| W1 (`0`) | `underground` | `1K – 1M` | `1_000_000` (`1M` -> W2) | `10` → `100` | `1` | `1` |
| W2 (`1`) | `crystal` | `1M – 1B` | `1_000_000_000` (`1B` -> W3) | `10_000` → `100_000` | `2_000` | `1_000` |
| W3 (`2`) | `magma` | `1B – 1T` | `1_000_000_000_000` (`1T` -> W4) | `10_000_000` → `100_000_000` | `4_000_000` | `1_000_000` |
| W4 (`3`) | `ruins` | `1T – 1Qa` | `1e15` (`1Qa` -> W5) | `10B` → `100B` | `8_000_000_000` | `1_000_000_000` |
| W5 (`4`) | `astral` | `1Qa – 1Qi` | `1e18` (`1Qi` -> W6) | `10T` → `100T` | `1.6e13` | `1e12` |
| W6 (`5`) | `starwell` | `1Qi – 1Sx` | `1e21` (`1Sx` -> W7) | `10Qa` → `100Qa` | `3.2e16` | `1e15` |
| W7 (`6`) | `abyssal` | `1Sx – 1Sp` | `1e24` (`1Sp` -> W8) | `10Qi` → `100Qi` | `6.4e19` | `1e18` |
| W8 (`7`) | `chrono` | `1Sp – 1Oc` | — | `10Sx` → `100Sx` | `1.28e23` | `1e21` |

*Design Call — Why `oreHpMult` uses `2,000^w` while `baseDps` uses `1,000^w`:*  
Pickaxes already add a `~3×`–`4×` global multiplier per World (`1×` in W1 up to `20,000×` in W8). Scaling `oreHpMult` by `2,000×` per World (`2,000^w`) absorbs global Pickaxe growth so neither old Pickaxes nor maxed prior-World Secret Chibis can trivialize a newly unlocked World before picking up that World's starter Chibi + gear.

*Intra-world 5-tier Chibi curve:*  
`[10, 20, 35, 65, 100] × 1000^w` (common/lowest → mid1 → mid2 → exotic → secret). Notice `10_000` at W2 Lv.1 is **100× stronger** than W1 Secret (`100` baseDps), naturally forcing grind-over on World transition.

### 4.2 Ores & World Research Costs
- **World Ores (`ORES`):** Scale `sellValue` across `W1`–`W8` in steps of `1,000×` per World so W1 earns `15 – 55K` (targeting `1M` unlock), W2 earns `15K – 55M` (targeting `1B` unlock), ..., W8 earns in the `Sp–Oc` bracket.
- **World Research (`ResearchWorldNodesData`):** Align `costs` (`root`, `tier1`, `dense`, `tier2`, `apex`) per World to `1,000^w` matching each World's economy so completing a World's tree remains a meaningful gate inside that World's capability bracket (`1K–1M`, `1M–1B`, etc.).

### 4.3 Starter Chibi Grant on World Unlock
- Helper `getWorldStarterChibiId(worldId)`: finds the entry in `WORLD_MINERS` for `worldId` with the lowest `baseDps` (e.g., W2 `volt-kensei`, W3 `mantis-monarch`, W4 `tempest-drake`, W5 `nebula-archon`, W6 `draconic-blademaster`, W7 `scroll-wraith`, W8 `glitch-warden`).
- Inside `unlockWorldDomain`: after deducting `def.unlockCost`, adding `worldId` to `unlockedWorlds`, and setting `activeWorldId = worldId`:
  - Increment `ctx.miners[starterId] = (ctx.miners[starterId] || 0) + 1`.
  - Add `starterId` to `ctx.discovered` (when present on context / wired in `GameState.unlockWorld`).
  - *Builder Call:* Starter Chibi goes safely to inventory (`miners`) rather than auto-overwriting an occupied plot slot; players can click **Equip Best** or place it manually, avoiding accidental loss of custom enchants/mutations on slots.
  - UI updates (`WorldsModalUi.ts` / toast) inform the player: `"Unlocked <World>! Starter Chibi gained: <Name>"`.

### 4.4 Special & Non-World Chibis (Anti-Carry Rule)
- **Weather Chibis (`WEATHER_METEOR_CHIBIS`):** Fixed `baseDps` & `WEATHER_UPGRADE_COST_SCALE` calibrated to their meteor's home World (`underground`, `crystal`, `magma`, `astral`, `starwell`).
- **Fusion Chibis (`FUSION_RECIPES`):** Fixed `baseDps` & `upgradeCostScale` calibrated to the highest World required by their recipe ingredients (since players cannot craft them before reaching those Worlds).
- **Daily Login Limited (`DAILY_LOGIN_REWARDS`):** Scale sequentially across W1–W7 OR dynamically cap to `unlockedWorlds` so an early-game player claiming Day 7 does not break World 1–6. *(Recommended & chosen call: dynamic progression cap matching player's highest unlocked World anchor, `Limited` ranging from `1.2×` to `1.8×` of that World's current anchor.)*
- **Twin (`PREMIUM_SHOP_ITEMS`) & Omega (`OMEGA_BOSS_DEFS`):**
  - Static catalog anchor (`syncTwinCatalogDpsFromAnchor`) continues targeting W8 Secret (`100Sx`) so Index / endgame previews stay consistent (`100Sx × dpsMult`).
  - At runtime (`computePlotUnitStats` & UI inspection via optional progression anchor), `Twin`, `Omega`, and `Limited` units have their effective `baseDps` (and upgrade scale) dynamically bounded by the player's **highest unlocked World**: specifically anchored to the highest `baseDps` among `WORLD_MINERS` that the player has discovered in their highest unlocked World (falling back to that World's starter `baseDps`). That way, entering W2 does not immediately jump a `Twin` to W2 Secret strength before W2 progression is earned, while unlocking and progressing in W8 brings them to full endgame Apex power.

### 4.5 Tap Damage & Downstream Systems
- **Tap Damage (`getTapDamageDomain`):** Add a modest scaling floor (`+ 3%` of active plot total DPS, or world-scaled tap component alongside flat tap) so manual tapping and Omega parry/invul-phase mechanics remain responsive across `1K` to `1Oc` without out-DPSing plot Chibis.
- **Tower (`TowerData.ts`) & Omega Boss HP (`OmegaData.ts`):** Because `getTowerWorldScale` already interpolates `WORLDS[i].oreHpMult`, Tower HP updates automatically with `oreHpMult`; verify `TOWER_HP_MULT` and `OMEGA_BOSS_DEFS` tier HPs fit the W8 (`1Sp–1Oc`) scale cleanly.
- **Offline Earnings, Shop / Relics / Bounties / Achievements:** Review constants and unit tests referencing explicit `baseDps`, `oreHpMult`, `unlockCost`, `sellValue`, or `secretBaseDps` values.

---

## 5. Open for Builder / Implementation Plan

Exact numeric tables for all 8 Worlds' `ORES`, `WEATHER_ORES`, `ResearchWorldNodesData` costs, `FusionData`, `OmegaData` boss HP tiers, save-compatibility validation (zero breaking save migrations needed), and test suite updates will be detailed step-by-step in the implementation plan after approval.
