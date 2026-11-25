# Omega Duel Sanctum — 30s Rift-Style DPS Check & Shared Core Token Design

**Date:** 2026-11-26
**Status:** Approved by user

## Intent & Why
Replace Omega Duel Sanctum's multi-phase kill-boss duel (sky-drop entrance, 30s invul shield, 45s Parry/Pillar/Stagger/OMEGA BREAK) with a fast, high-dopamine **30-second cumulative DPS check** modeled after Dimensional Rift, while unifying Boss Cores into a **single shared `Omega Core` token** and scaling Tier 1–5 damage targets from **World 6** upward per Boss.

## Goals
1. **30-Second DPS Check Battle**:
   - Instant combat start (`30.0s` timer) in `OmegaArena3D` without `entrance` delay, `invul_shield` screen taps, Parry windows, Pillars, Rune Seals, or Stagger/Break.
   - Squad Chibis auto-attack + player taps on the Boss/arena contribute cumulative damage to climb **Tier 1 → Tier 5** (with `8`-tap Ult charge synergy like Rift).
   - **1 Boss Key** is consumed on battle entry; retreating early or finishing at `0.0s` awards the Cores/Gems for the highest Tier reached (`0..5`).
2. **Tier 1–5 Damage Targets (Starting World 6, Scaled per Boss)**:
   - Base (`W6–W10` ladder from `RIFT_TIER_DEFS`): `5e19`, `5e22`, `5e25`, `5e28`, `5e31`.
   - **Crimson Ronin (`1×` target, `1×` cores)**: `5e19`, `5e22`, `5e25`, `5e28`, `5e31` → `1, 2, 3, 4, 5` Cores.
   - **Obsidian Sovereign (`10×` target, `2×` cores)**: `5e20`, `5e23`, `5e26`, `5e29`, `5e32` → `2, 4, 6, 8, 10` Cores.
   - **Abyssal Leviathan (`20×` target, `3×` cores)**: `1e21`, `1e24`, `1e27`, `1e30`, `1e33` → `3, 6, 9, 12, 15` Cores.
3. **Shared `Omega Core` Token & Buffed Unlock/Awaken Costs**:
   - All 3 Bosses drop and spend from a single shared balance: `omegaCoreTokens` (`Omega Core`).
   - Legacy saves containing per-boss `omegaCores` migrate seamlessly by summing existing balances into `omegaCoreTokens`.
   - Buffed unlock costs: **Crimson Ronin `100`**, **Obsidian Sovereign `250`**, **Abyssal Leviathan `500`** Cores.
   - Proportionally scaled Awaken costs (`★1→★5`, preserving `[0.4×, 0.6×, 0.9×, 1.2×]` ratio):
     - Crimson Ronin: `[40, 60, 90, 120]`
     - Obsidian Sovereign: `[100, 150, 220, 300]`
     - Abyssal Leviathan: `[200, 300, 440, 600]`
4. **Gems & First-Clear Rewards**:
   - Reaching Tier `T` (`1..5`) awards First Clear Gems + Enchant Dice for every newly cleared tier in `1..T` for that Boss (`${bossId}:${tier}`), or `repeatGems` for Tier `T` if all tiers `1..T` were already cleared.

## Non-Goals
- Do not modify `RiftDomain`, `RiftArena3D`, or `OMEGA` Chibi passive stats (`teamDmgPct`/`oreDropPct`/`oreSellPct`) or `OmegaForgeCutscene`.
- Do not break `OmegaRooftopEnvironment3D` or player podium/Ult relay visuals.

## Approaches Considered
- **Chosen — Mirror `RiftDomain` + `RiftArenaHudUi` pattern inside Omega**: Cleanly converts `OmegaBossDomain`, `HudOmegaBridge`, `OmegaArenaHudUi`, `OmegaBossModalUi`, and `OmegaArena3D` to a 30s DPS-check loop while preserving `OmegaRooftopEnvironment3D`, `OmegaForgeCutscene`, `omegaKeys`, and per-boss `omegaBestTier`/`omegaBestDamage`/`omegaClaimedFirstClears`.
- **Rejected — Keep `invul_shield` & Parry in 30s**: Breaks tap-damage flow and eats into the 30s DPS timer.
