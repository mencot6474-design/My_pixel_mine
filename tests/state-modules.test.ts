import { describe, expect, it } from 'vitest';
import { isNonSellableChibi } from '../src/game/DailyLoginData';
import {
  getRiftHourlyBossId,
  getRiftTierProgress,
  RIFT_BATTLE_DURATION_SEC,
  RIFT_MAX_ATTEMPTS_PER_WINDOW,
  RIFT_PASS_GEM_COST,
  RIFT_TIER_DEFS,
} from '../src/game/AnomalyData';
import { getRiftWindowSnapshot } from '../src/game/RiftDomain';
import {
  TOWER_BOSS_COIN_CHANCE,
  TOWER_BOSS_COIN_DROP,
  TOWER_KEY_GEM_COST,
  TOWER_ORE_COIN_CHANCE,
  TOWER_ORE_TWIN_CHANCE,
} from '../src/game/TowerData';
import { computeBulkUpgradePlan, getPlotStatUpgradeCost } from '../src/game/UpgradeBulkHelper';
import { ALL_INDEX_TABS, getIndexTabEntryIds } from '../src/game/IndexRewardsDomain';
import { rollTapCriticalDamage, TAP_CRIT_MULT } from '../src/game3d/MineScene3D';
import {
  getEffectiveChibiBaseDps,
  getLatestWorldScaleAnchor,
  getMinersByWorld,
  getOreById,
  getUnlockedWorldScaleAnchor,
  getWorldStarterChibiId,
  getWorldUpgradeCostScale,
  ORES,
  syncTwinCatalogDpsFromAnchor,
  WORLDS,
  WORLD_MINERS,
} from '../src/game/GameData';
import {
  computeTwinScaledBaseDps,
  computeTwinUpgradeCostScale,
  PREMIUM_SHOP_ITEMS,
} from '../src/game/PremiumShopData';
import { FUSION_RECIPES } from '../src/game/FusionData';
import {
  getOmegaTierProgress,
  OMEGA_BATTLE_DURATION_SEC,
  OMEGA_BOSS_DEFS,
  OMEGA_KEY_GEM_COST,
  OMEGA_KEY_REGEN_MS,
  OMEGA_MAX_KEYS,
} from '../src/game/OmegaData';
import { CHIBI_CATALOG, getChibiById } from '../src/game3d/ChibiCatalog';
import { GameState, getChibiUpgradeCostMult } from '../src/game/GameState';
import {
  createEmptyResearchLevels,
  deserializeSaveJson,
  isValidIndexId,
  migrateOreId,
  type PlotUnitState,
  serializeSavePayload,
} from '../src/game/GameStateSave';
import {
  BOUNTY_SLOT_COUNT,
  claimBountyDomain,
  getReadyBountyCountDomain,
  recordBountyProgressDomain,
} from '../src/game/BountiesDomain';
import {
  chargeOverclockDomain,
  consumeOverclockEncoreUltDomain,
  createInitialOverclockState,
  extendOverclockDomain,
  finishOverclockEncoreDomain,
  getOverclockSnapshotDomain,
  getOverclockUltChargeReq,
  OVERCLOCK_DURATION_SEC,
  OVERCLOCK_HYPER_ENCORE_ULTS,
  OVERCLOCK_MAX_DURATION_SEC,
  OVERCLOCK_TIER1_CHARGE_MULT,
  OVERCLOCK_TIER2_CHARGE_MULT,
  stepOverclockDomain,
} from '../src/game/OverclockDomain';
import {
  claimOfflineEarningsDomain,
  computeOfflineEarningsDomain,
  formatOfflineDuration,
  MAX_OFFLINE_GEMS,
  MAX_OFFLINE_ORES_PER_SEC,
  OFFLINE_MAX_SEC,
  OFFLINE_MIN_SEC,
  RETURN_RUSH_BOOST_ID,
  RETURN_RUSH_DURATION_SEC,
  RETURN_RUSH_FEVER_CHARGE_BONUS,
  RETURN_RUSH_MIN_OFFLINE_SEC,
  RETURN_RUSH_SPEED_BONUS,
} from '../src/game/OfflineEarningsDomain';
import {
  claimTwinTrialDomain,
  createInitialTwinTrialState,
  getPermanentMinerCount,
  getTrialOwnedCount,
  getTwinTrialRemainingSec,
  syncTwinTrialDomain,
  TWIN_TRIAL_DURATION_MS,
  unlockTwinTrialDomain,
} from '../src/game/TwinTrialDomain';
import {
  autoStarUpAllUnits,
  computeDpsBreakdown,
  computePlotUnitStats,
  createFreshPlotUnit,
  equipBestUnitsToPlots,
  getAvailableEnchantUnitsCount,
  starUpUnit,
  toggleUnitEnchant,
} from '../src/game/PlotUnitsDomain';
import { RELICS } from '../src/game/RelicData';
import { getResearchNodesForTree } from '../src/game/ResearchData';
import {
  buildTowerRunBuffPills,
  formatBlessingPickPreview,
  getTowerFloorDef,
  getTowerStreakGemMult,
  getTowerWaveDef,
  groupTowerBlessings,
  pickTowerBlessingChoices,
  TOWER_BLESSINGS,
  TOWER_BLESSING_REROLL_GEM_COST,
  TOWER_BOSS_EXPOSE_DMG_MULT,
  TOWER_BOSS_EXPOSE_SEC,
  TOWER_BOSS_INVUL_SEC,
  TOWER_DICE_PITY_MAX,
  TOWER_GEM_DROP_MULT,
  TOWER_KEY_REGEN_MS,
  TOWER_MAX_FLOOR,
  TOWER_MAX_KEYS,
} from '../src/game/TowerData';
import {
  applyTowerTargetDamageDomain,
  getTowerEffectiveDpsDomain,
  hitTowerBossShieldSweetSpotDomain,
  quickSweepTowerDomain,
  rerollTowerBlessingsDomain,
  startTowerRunDomain,
  stepTowerTickDomain,
  syncTowerKeysDomain,
} from '../src/game/TowerRunDomain';
import {
  onMeteorBrokenDomain,
  onOreBrokenDomain,
  sellAllChestOresDomain,
  shouldAutoSellOreDomain,
  swapHotbarSlotsDomain,
} from '../src/game/LootChestDomain';
import {
  buyPickaxeDomain,
  getWeatherDamageMultDomain,
  refreshPickaxeStockIfDueDomain,
  scaleWeatherMultDomain,
  sellBatchDomain,
  syncWeatherDomain,
  useGemPotionDomain,
} from '../src/game/ShopWeatherDomain';

describe('Tahap C GameState Domain Modules', () => {
  describe('GameStateSave (Task 1)', () => {
    it('migrates legacy ore IDs, validates index entries, and creates empty research maps', () => {
      expect(migrateOreId('topaz')).toBe('glowquartz');
      expect(migrateOreId('eternium')).toBe('immortite');
      expect(migrateOreId(ORES[0].id)).toBe(ORES[0].id);

      expect(isValidIndexId(ORES[0].id)).toBe(true);
      expect(isValidIndexId('astral-recruit')).toBe(true);
      expect(isValidIndexId('stormwraith')).toBe(true);
      expect(isValidIndexId('prism-seraph')).toBe(true);
      expect(isValidIndexId('non-existent-item')).toBe(false);

      const empty = createEmptyResearchLevels();
      expect(Object.keys(empty).sort()).toEqual([
        'abyssal',
        'astral',
        'chrono',
        'core',
        'crystal',
        'elysium',
        'magma',
        'nightmare',
        'ruins',
        'singularity',
        'solaris',
        'starwell',
        'underground',
      ]);
      const idxState = new GameState();
      expect(idxState.getTotalIndexCount()).toBe(172);
      expect(ALL_INDEX_TABS).toContain('nightmare');
      expect(ALL_INDEX_TABS).toContain('singularity');
    });

    it('serializes, migrates legacy saves, refunds excess plot pickaxes, and ignores corrupt JSON', () => {
      const state = new GameState();
      const firstOre = ORES[0].id;
      const relic0 = RELICS[0].id;
      const relic1 = RELICS[1].id;

      const legacyPayload = {
        cash: 999,
        gems: 555,
        miners: { 'astral-recruit': 1 },
        ores: { topaz: 4, [firstOre]: 2 },
        chestOres: { sapphire: 3 },
        others: { 'summon-scroll': 2, 'ore-elixir-1': 1 },
        hotbar: ['topaz', 'astral-recruit', null, null, null, null, null, null, null],
        plotMiners: ['astral-recruit', 'astral-recruit', null, null, null, null, null, null],
        plotUnits: [
          null,
          {
            chibiId: 'astral-recruit',
            damageLevel: 2,
            speedLevel: 1,
            miningSpeedLevel: 1,
            pickaxeId: 'copper',
            mutationId: 'normal',
            enchantId: null,
          },
          null,
          null,
          null,
          {
            chibiId: 'astral-recruit',
            damageLevel: 1,
            speedLevel: 1,
            miningSpeedLevel: 1,
            pickaxeId: 'iron',
            mutationId: 'normal',
            enchantId: null,
          },
        ],
        stashedUnits: {
          'astral-recruit': [
            {
              chibiId: 'astral-recruit',
              damageLevel: 3,
              speedLevel: 1,
              miningSpeedLevel: 1,
              pickaxeId: 'gold',
              mutationId: 'normal',
              enchantId: null,
            },
          ],
        },
        lockedOreIds: ['ruby'],
        craftedRelics: [relic0],
        equippedRelics: [relic1, relic0, relic0],
        discovered: ['topaz', 'fake-item'],
        tower: { bestFloor: 12, keys: 99, lastKeyRegenAt: 1000, claimedMilestones: [5, 'bad'] },
        weather: { id: 'not-a-weather', expiresAt: 5000 },
      };

      const compactCalled = { count: 0 };
      deserializeSaveJson(state, JSON.stringify(legacyPayload), () => {
        compactCalled.count++;
      });

      expect(compactCalled.count).toBe(1);
      expect(state.cash).toBe(999);
      expect(state.ores['glowquartz']).toBe(4);
      expect(state.ores[firstOre]).toBe(2);
      expect(state.chestOres['frostquartz']).toBe(3);
      expect(state.others['summon-scroll']).toBeUndefined();
      expect(state.others['ore-elixir-1']).toBe(1);
      expect(state.hotbar[0]).toBeNull();
      expect(state.hotbar[1]).toBe('astral-recruit');
      expect(state.hotbar).not.toContain('glowquartz');
      expect(state.hotbar).not.toContain('topaz');
      // Slot 1 exceeded owned count (1) and slot 5 was trimmed beyond pedestal count
      expect(state.plotMiners[1]).toBeNull();
      expect(state.ownedPickaxes['copper']).toBe(1);
      expect(state.ownedPickaxes['iron']).toBe(1);
      expect(state.stashedUnits['astral-recruit']?.[0].pickaxeId).toBe('');
      expect(state.lockedOreIds.has('prismite')).toBe(true);
      expect(state.equippedRelics).toEqual([relic0]);
      expect(state.discovered.has('glowquartz')).toBe(true);
      expect(state.discovered.has('fake-item')).toBe(false);
      expect(state.towerKeys).toBe(TOWER_MAX_KEYS);
      expect(state.towerClaimedMilestones).toEqual([5]);
      expect(state.weatherId).not.toBe('not-a-weather');

      const serialized = serializeSavePayload(state);
      expect(serialized.cash).toBe(999);
      expect(serialized.craftedRelics).toEqual([relic0]);

      // Corrupt JSON leaves current state untouched without throwing
      deserializeSaveJson(state, '{corrupt json', () => {});
      expect(state.cash).toBe(999);
    });

    it('defaults autoMeteor to false for new players while preserving explicit saved preference', () => {
      const fresh = new GameState();
      expect(fresh.autoMeteor).toBe(false);

      deserializeSaveJson(fresh, JSON.stringify({ cash: 100 }), () => {});
      expect(fresh.autoMeteor).toBe(false);

      deserializeSaveJson(fresh, JSON.stringify({ autoMeteor: true }), () => {});
      expect(fresh.autoMeteor).toBe(true);
    });
  });

  describe('PlotUnitsDomain (Task 2)', () => {
    it('computes upgrade scaling, unit stats, DPS breakdown, and fresh unit defaults', () => {
      const state = new GameState();
      expect(getChibiUpgradeCostMult('astral-recruit')).toBeGreaterThanOrEqual(1);
      expect(createFreshPlotUnit('astral-recruit')).toEqual({
        chibiId: 'astral-recruit',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
      });

      const stats = computePlotUnitStats(state, 0);
      expect(stats).not.toBeNull();
      expect(stats?.dmg).toBeGreaterThan(0);
      expect(stats?.dmgMult).toBe(1);
      expect(stats?.critChance).toBe(0.05);
      expect(stats?.critMult).toBe(2.25);

      state.cash = 10_000;
      expect(state.upgradePlotSpeed(0)).toBe(true);
      expect(state.upgradePlotMiningSpeed(0)).toBe(true);
      const upgradedStats = computePlotUnitStats(state, 0)!;
      expect(upgradedStats.dmgMult).toBe(1.12);
      expect(upgradedStats.dmg).toBeGreaterThan(stats!.dmg);
      expect(upgradedStats.critChance).toBeCloseTo(0.08, 3);

      const dps = computeDpsBreakdown(state);
      expect(dps.units).toHaveLength(1);
      expect(dps.totalPlotDps).toBe(dps.units[0].dps);
    });

    it('handles Star-Up validation, 1-per-unit Enchant exclusivity, and stash preservation in equipBest', () => {
      const state = new GameState();
      expect(starUpUnit(state, 'non-existent')).toEqual({ ok: false, reason: 'invalid' });
      expect(starUpUnit(state, 'astral-recruit')).toEqual({ ok: false, reason: 'insufficient' });

      state.miners['astral-recruit'] = 10;
      expect(starUpUnit(state, 'astral-recruit')).toEqual({ ok: true, newStar: 1 });
      expect(autoStarUpAllUnits(state)).toBeGreaterThanOrEqual(1);

      state.miners['solar-striker'] = 1;
      // Rarity-balanced Star-Up costs: Exotic/Secret cost 12 dupes total (1+1+2+3+5), Fusion/Twin/Anomaly cost 8 dupes total (1+1+1+2+3)
      state.miners['cyber-ki-brawler'] = 13; // 1 base + 12 spares -> full 5★
      expect(autoStarUpAllUnits(state)).toBe(5);
      expect(state.getChibiStar('cyber-ki-brawler')).toBe(5);
      expect(state.miners['cyber-ki-brawler']).toBe(1);
      state.miners['paradox-twins'] = 9; // 1 base + 8 spares -> full 5★
      expect(autoStarUpAllUnits(state)).toBe(5);
      expect(state.getChibiStar('paradox-twins')).toBe(5);
      expect(state.miners['paradox-twins']).toBe(1);
      delete state.miners['cyber-ki-brawler'];
      delete state.chibiStars['cyber-ki-brawler'];
      delete state.miners['paradox-twins'];
      delete state.chibiStars['paradox-twins'];
      state.cash = 1_000_000;
      state.upgradePlotDamage(0);
      if (state.plotUnits[0]) state.plotUnits[0].enchantId = 'blazing';
      state.ownedEnchants['blazing'] = 1;
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(0);

      state.removeMinerFromPlot(0);
      // Stashed upgraded unit keeps its enchant reservation
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(0);

      equipBestUnitsToPlots(state);
      const astralSlot = state.plotMiners.indexOf('astral-recruit');
      expect(astralSlot).toBeGreaterThanOrEqual(0);
      expect(state.plotUnits[astralSlot]?.damageLevel).toBeGreaterThanOrEqual(2);
      expect(toggleUnitEnchant(state, astralSlot, 'blazing')).toBe(true);
      expect(getAvailableEnchantUnitsCount(state, 'blazing')).toBe(1);
    });
  });

  describe('TowerRunDomain (Task 3)', () => {
    it('regenerates Tower keys on elapsed interval and enforces key guards on start & sweep', () => {
      const state = new GameState();
      state.towerKeys = 1;
      state.towerLastKeyRegenAt = 1_000;
      let savedCount = 0;
      syncTowerKeysDomain(state, 1_000 + TOWER_KEY_REGEN_MS * 2 + 50, () => {
        savedCount++;
      });
      expect(state.towerKeys).toBe(3);
      expect(savedCount).toBe(1);

      expect(quickSweepTowerDomain(state, 5000)).toEqual({ ok: false, gemsAwarded: 0 });
      state.towerBestFloor = 5;
      const sweep = quickSweepTowerDomain(state, 5000);
      expect(sweep.ok).toBe(true);
      expect(sweep.gemsAwarded).toBeGreaterThan(0);

      state.towerKeys = 0;
      expect(startTowerRunDomain(state, 1, 5000)).toBe(false);
    });

    it('enforces Wave 10 Boss invulnerability, blessing auto-pick, and tower DPS calculation', () => {
      const state = new GameState();
      const t0 = 10_000;
      expect(startTowerRunDomain(state, 1, t0, () => 0.1)).toBe(true);
      expect(getTowerEffectiveDpsDomain(state)).toBeGreaterThan(0);

      // Jump to Wave 10 Boss manually inside towerRun
      if (state.towerRun) {
        state.towerRun.wave = 10;
        state.towerRun.isBossWave = true;
        state.towerRun.hp = 500;
        state.towerRun.maxHp = 500;
        state.towerRun.bossInvulLeft = TOWER_BOSS_INVUL_SEC;
      }

      // Blocked while invulnerable
      const invulHit = applyTowerTargetDamageDomain(state, null, 9999);
      expect(invulHit.dmgDealt).toBe(0);

      // Step down boss invulnerability, then defeat boss -> triggers pendingBlessings
      stepTowerTickDomain(state, TOWER_BOSS_INVUL_SEC + 0.1);
      expect(state.towerRun?.bossInvulLeft).toBe(0);
      const bossKill = applyTowerTargetDamageDomain(state, null, 9999, () => 0.1);
      expect(bossKill.floorCleared).toBe(true);
      expect(state.towerRun?.pendingBlessings).not.toBeNull();

      // Blessing auto-picks after 5s countdown
      const autoRes = stepTowerTickDomain(state, 5.5, () => 0);
      expect(autoRes.status).toBe('blessing-auto-picked');
      expect(state.towerRun?.floor).toBe(2);
      expect(state.towerRun?.wave).toBe(1);
    });

    it('supports Boss Shield-Break Sweet-Spot (+50% Exposed DMG), 12 Blessings (Overkill/Chain/Reroll), Streak Mult, Dice Pity & Near-Miss Summary', () => {
      expect(TOWER_BLESSINGS.length).toBeGreaterThanOrEqual(12);
      expect(getTowerStreakGemMult(0)).toBe(1);
      expect(getTowerStreakGemMult(2)).toBe(1.5);
      expect(getTowerStreakGemMult(10)).toBe(3);

      const state = new GameState();
      state.gems = TOWER_BLESSING_REROLL_GEM_COST;
      expect(startTowerRunDomain(state, 1, 20_000, () => 0.1)).toBe(true);

      // Jump to Boss Wave -> 2 Sweet-Spot hits shatter 5s shield and trigger 4s EXPOSED (+50% DMG)
      if (state.towerRun) {
        state.towerRun.wave = 10;
        state.towerRun.isBossWave = true;
        state.towerRun.hp = 10_000;
        state.towerRun.maxHp = 10_000;
        state.towerRun.bossInvulLeft = TOWER_BOSS_INVUL_SEC;
      }
      const firstCrack = hitTowerBossShieldSweetSpotDomain(state);
      expect(firstCrack.hit).toBe(true);
      expect(firstCrack.shieldBroken).toBe(false);
      expect(firstCrack.remainingShieldSec).toBeCloseTo(2.5, 5);

      const shatter = hitTowerBossShieldSweetSpotDomain(state);
      expect(shatter.hit).toBe(true);
      expect(shatter.shieldBroken).toBe(true);
      expect(shatter.bossExposeLeft).toBe(TOWER_BOSS_EXPOSE_SEC);

      const exposedHit = applyTowerTargetDamageDomain(state, null, 1000, () => 0.99);
      expect(exposedHit.dmgDealt).toBe(Math.round(1000 * TOWER_BOSS_EXPOSE_DMG_MULT));

      // Kill Boss -> test free reroll + paid gem reroll
      const bossKill = applyTowerTargetDamageDomain(state, null, 50_000, () => 0.99);
      expect(bossKill.floorCleared).toBe(true);
      expect(state.towerDicePity).toBe(1); // missed dice drop increments pity

      const firstSet = state.towerRun!.pendingBlessings!.map((b) => b.id);
      const freeReroll = rerollTowerBlessingsDomain(state, () => 0.25);
      expect(freeReroll).toEqual({ ok: true, usedFree: true, costGems: 0 });
      const secondSet = state.towerRun!.pendingBlessings!.map((b) => b.id);
      expect(secondSet.some((id) => !firstSet.includes(id))).toBe(true);

      const gemsBeforePaid = state.gems;
      const paidReroll = rerollTowerBlessingsDomain(state, () => 0.5);
      expect(paidReroll).toEqual({ ok: true, usedFree: false, costGems: TOWER_BLESSING_REROLL_GEM_COST });
      expect(state.gems).toBe(gemsBeforePaid - TOWER_BLESSING_REROLL_GEM_COST);

      // Test Overkill Splash & Chain Spark on normal wave
      stepTowerTickDomain(state, 5.5, () => 0); // enter Floor 2 Wave 1
      const splashDef = TOWER_BLESSINGS.find((b) => b.id === 'overkill-splash')!;
      const chainDef = TOWER_BLESSINGS.find((b) => b.id === 'chain-spark')!;
      state.towerRun!.blessings = [splashDef, chainDef];
      for (const ore of state.towerRun!.waveOres) {
        ore.hp = 100;
        ore.maxHp = 100;
        ore.alive = true;
      }
      applyTowerTargetDamageDomain(state, 0, 200, () => 0.99);
      // Ore 0 breaks (excess 100 * 0.8 = 80 splashed to Ore 1), plus Chain Spark hits 2 other alive ores for 70
      expect(state.towerRun!.waveOres[0].alive).toBe(false);
      expect(state.towerRun!.waveOres[1].hp).toBeLessThan(100);
      expect(state.towerRun!.waveOres[2].hp).toBeLessThan(100);

      // Verify Dice Pity guarantees dice on the 4th Boss miss and resets to 0
      state.towerDicePity = TOWER_DICE_PITY_MAX - 1;
      const diceBeforePity = state.enchantDice;
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 100;
      state.towerRun!.maxHp = 100;
      const pityKill = applyTowerTargetDamageDomain(state, null, 500, () => 0.99); // rng=0.99 fails normal roll
      expect(pityKill.pityTriggered).toBe(true);
      expect(pityKill.diceAwarded).toBeGreaterThanOrEqual(1);
      expect(state.enchantDice).toBeGreaterThan(diceBeforePity);
      expect(state.towerDicePity).toBe(0);

      // Verify Near-Miss Summary when timer expires
      stepTowerTickDomain(state, 5.5, () => 0); // enter Floor 3 Wave 1
      state.towerRun!.hp = 20;
      state.towerRun!.maxHp = 200;
      const timeoutRes = stepTowerTickDomain(state, state.towerRun!.timeLeft + 1);
      expect(timeoutRes.status).toBe('timeout');
      expect(timeoutRes.summary?.remainingHpPct).toBe(10);
      expect(timeoutRes.summary?.bestStreakMult).toBe(getTowerStreakGemMult(2));

      // Verify every run starts at Floor 1 (no checkpoints) and Floor 80 Final Boss victory completes the Tower ("tamat")
      state.towerBestFloor = TOWER_MAX_FLOOR;
      state.towerKeys = 3;
      expect(startTowerRunDomain(state, TOWER_MAX_FLOOR, 30_000, () => 0.1)).toBe(true);
      expect(state.towerRun!.floor).toBe(1);
      state.towerRun!.floor = TOWER_MAX_FLOOR;
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 1000;
      state.towerRun!.maxHp = 1000;
      const finalWin = applyTowerTargetDamageDomain(state, null, 5000, () => 0.5);
      expect(finalWin.floorCleared).toBe(true);
      expect(finalWin.towerCompleted).toBe(true);
      expect(state.towerRun).toBeNull();
      expect(state.towerLastSummary?.reason).toBe('victory');
      expect(state.towerLastSummary?.highestReached).toBe(TOWER_MAX_FLOOR);
      expect(getTowerFloorDef(99).floor).toBe(TOWER_MAX_FLOOR);
      expect(TOWER_GEM_DROP_MULT).toBeCloseTo(0.2, 6);
      expect(getTowerFloorDef(1).gemReward).toBe(7);
      expect(getTowerFloorDef(50).gemReward).toBe(335); // includes Floor 50 Gem Surge (1.45x) at 0.2x scale
      expect(getTowerWaveDef(1, 1).waveGemReward).toBe(1);
      expect(getTowerWaveDef(49, 1).waveGemReward).toBe(16);
    });

    it('filters maxed mechanical blessings out of RNG & reroll pools and summarizes grouped buffs & previews', () => {
      const cappedDefs = TOWER_BLESSINGS.filter((b) => b.maxStacks !== undefined);
      expect(cappedDefs.length).toBeGreaterThanOrEqual(6);

      // Fill every capped mechanical blessing to its maxStacks
      const maxedOwned = cappedDefs.flatMap((def) =>
        Array.from({ length: def.maxStacks! }, () => def)
      );
      const cappedIds = new Set(cappedDefs.map((b) => b.id));

      for (let i = 0; i < 10; i++) {
        const choices = pickTowerBlessingChoices(() => (i * 0.17) % 1, [], maxedOwned);
        expect(choices).toHaveLength(3);
        expect(choices.every((c) => !cappedIds.has(c.id))).toBe(true);
      }

      // Even when rerolling excludes 3 uncapped choices, maxed blessings stay excluded
      const state = new GameState();
      state.gems = TOWER_BLESSING_REROLL_GEM_COST * 2;
      expect(startTowerRunDomain(state, 1, 40_000, () => 0.1)).toBe(true);
      state.towerRun!.blessings = [...maxedOwned];
      state.towerRun!.pendingBlessings = pickTowerBlessingChoices(() => 0.2, [], state.towerRun!.blessings);
      const reroll = rerollTowerBlessingsDomain(state, () => 0.7);
      expect(reroll.ok).toBe(true);
      expect(state.towerRun!.pendingBlessings).toHaveLength(3);
      expect(state.towerRun!.pendingBlessings!.every((c) => !cappedIds.has(c.id))).toBe(true);

      // Verify grouping, MAX flag, before->after preview, and run buff summary pills
      const gemMagnet = TOWER_BLESSINGS.find((b) => b.id === 'gem-magnet')!;
      const chainSpark = TOWER_BLESSINGS.find((b) => b.id === 'chain-spark')!;
      const grouped = groupTowerBlessings([gemMagnet, chainSpark, gemMagnet, chainSpark, gemMagnet]);
      expect(grouped[0]).toMatchObject({ def: gemMagnet, count: 3, maxed: false, totalLabel: '+90% Gems' });
      expect(grouped[1]).toMatchObject({ def: chainSpark, count: 2, maxed: true, totalLabel: 'Chain 4 Ores' });

      expect(formatBlessingPickPreview(gemMagnet, 6)).toBe('Gems +180% → +210%');
      expect(formatBlessingPickPreview(chainSpark, 1)).toBe('Chain 2 → 4 Ores');

      const pills = buildTowerRunBuffPills([gemMagnet, gemMagnet, chainSpark]);
      expect(pills.map((p) => p.label)).toEqual(['+60% Gems', 'Chain 2']);
    });
  });

  describe('LootChestDomain (Task 4)', () => {
    it('swaps hotbar slots while tracking selection and obeys ore lock over auto-sell', () => {
      const state = new GameState();
      state.hotbar = ['item-a', 'item-b', null, null, null, null, null, null, null];
      state.selectedHotbarSlot = 0;

      expect(swapHotbarSlotsDomain(state, 0, 1)).toBe(true);
      expect(state.hotbar[0]).toBe('item-b');
      expect(state.hotbar[1]).toBe('item-a');
      expect(state.selectedHotbarSlot).toBe(1);
      expect(swapHotbarSlotsDomain(state, 2, 0)).toBe(false);

      const firstOre = ORES[0];
      state.autoSellRarities.add(firstOre.rarity);
      expect(shouldAutoSellOreDomain(state, firstOre.id)).toBe(true);
      state.lockedOreIds.add(firstOre.id);
      expect(shouldAutoSellOreDomain(state, firstOre.id)).toBe(false);
    });

    it('processes ore/meteor drops, respects chest lock, and applies +35% full-chest bonus', () => {
      const state = new GameState();
      state.cash = 0;
      const lockedOre = ORES[0];
      const unlockedOre = ORES[1];
      state.chestOres[lockedOre.id] = 10;
      state.lockedOreIds.add(lockedOre.id);
      state.chestOres[unlockedOre.id] = state.getMaxChestCapacity();

      const sale = sellAllChestOresDomain(state);
      expect(sale.bonusApplied).toBe(true);
      expect(sale.earned).toBeGreaterThan(0);
      expect(state.chestOres[lockedOre.id]).toBe(10);
      expect(state.chestOres[unlockedOre.id]).toBeUndefined();

      state.chestOres = {};
      onOreBrokenDomain(state, 'geode', () => 0);
      expect(Object.keys(state.chestOres).length).toBeGreaterThanOrEqual(1);

      const meteorRes = onMeteorBrokenDomain(state, 'celestial', () => 0);
      expect(meteorRes.weatherOreQty).toBeGreaterThanOrEqual(1);
      expect(meteorRes.gemsAwarded).toBeGreaterThanOrEqual(10);
    });
  });

  describe('ShopWeatherDomain (Task 5)', () => {
    it('refreshes pickaxe stock when due, validates pickaxe purchases, and sells mixed batches once', () => {
      const state = new GameState();
      state.pickaxeStock['sunwheel'] = 0;
      state.pickaxeRestockAt = 10_000;
      expect(refreshPickaxeStockIfDueDomain(state, 9_999)).toBe(false);
      expect(refreshPickaxeStockIfDueDomain(state, 10_000)).toBe(true);
      expect(state.pickaxeStock['sunwheel']).toBeGreaterThan(0);

      state.cash = 0;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('no_cash');
      state.pickaxeStock['sunwheel'] = 0;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('sold_out');

      state.pickaxeStock['sunwheel'] = 1;
      state.cash = 100_000;
      expect(buyPickaxeDomain(state, 'sunwheel', 10_001)).toBe('bought');
      expect(state.ownedPickaxes['sunwheel']).toBe(1);

      const firstOre = ORES[0].id;
      state.ores[firstOre] = 2;
      state.miners['astral-recruit'] = 2; // 1 on plot, 1 sellable
      let emitted = 0;
      const earned = sellBatchDomain(
        state,
        [`ore:${firstOre}`, 'miner:astral-recruit', 'pickaxe:sunwheel'],
        () => {
          emitted++;
        }
      );
      expect(earned).toBeGreaterThan(0);
      expect(emitted).toBe(1);
      expect(state.ores[firstOre]).toBeUndefined();
      expect(state.miners['astral-recruit']).toBe(1);
      expect(state.ownedPickaxes['sunwheel']).toBeUndefined();
    });

    it('stacks gem potion durations and scales positive weather buffs with equipped relics', () => {
      const state = new GameState();
      state.others['ore-elixir-1'] = 2;
      expect(useGemPotionDomain(state, 'ore-elixir-1', 50_000)).toBe(true);
      const firstExpiry = state.activeBoosts['ore-elixir-1'];
      expect(firstExpiry).toBeGreaterThan(50_000);
      expect(useGemPotionDomain(state, 'ore-elixir-1', 55_000)).toBe(true);
      expect(state.activeBoosts['ore-elixir-1']).toBe(firstExpiry + (firstExpiry - 50_000));
      expect(useGemPotionDomain(state, 'ore-elixir-1', 60_000)).toBe(false);

      state.weatherExpiresAt = 100_000;
      expect(syncWeatherDomain(state, 99_999)).toBeNull();
      const rolled = syncWeatherDomain(state, 100_000, () => 0.95);
      expect(rolled).not.toBeNull();
      expect(scaleWeatherMultDomain(state, 0.8)).toBe(0.8);
      expect(scaleWeatherMultDomain(state, 1.5)).toBe(1.5);
      expect(getWeatherDamageMultDomain(state)).toBeGreaterThanOrEqual(1);

      // All 12 Relics strictly use the 3 core dopamine passives: Team DMG, Sell Ore, Drop Ore
      const allowedRelicStats = new Set(['minerDmgPct', 'oreValuePct', 'oreDropPct']);
      for (const relic of RELICS) {
        const keys = Object.keys(relic.effects);
        expect(keys.length).toBeGreaterThanOrEqual(2);
        for (const key of keys) {
          expect(allowedRelicStats.has(key)).toBe(true);
        }
      }
    });
  });

  describe('OfflineEarningsDomain', () => {
    it('returns null when away < 2m, clock skew is negative, or no plot DPS, and caps duration at 8h', () => {
      const state = new GameState();
      const baseNow = 1_000_000_000;

      // < 2 minutes -> null
      state.lastSavedAt = baseNow - (OFFLINE_MIN_SEC - 10) * 1000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // future timestamp (clock skew) -> null
      state.lastSavedAt = baseNow + 60_000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // no miners on plots -> null
      state.plotMiners = [null, null, null, null, null];
      state.plotUnits = [null, null, null, null, null];
      state.lastSavedAt = baseNow - 3600 * 1000;
      expect(computeOfflineEarningsDomain(state, baseNow, () => 0.5)).toBeNull();

      // restore 1 miner and test 12h away -> capped at 8h
      state.miners['astral-recruit'] = 1;
      state.plotMiners[0] = 'astral-recruit';
      state.plotUnits[0] = createFreshPlotUnit('astral-recruit');
      state.lastSavedAt = baseNow - 12 * 3600 * 1000;

      const summary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(summary).not.toBeNull();
      expect(summary!.elapsedSec).toBe(OFFLINE_MAX_SEC);
      expect(summary!.capped).toBe(true);
      expect(summary!.cash).toBeGreaterThan(0);
      expect(summary!.oresBroken).toBeGreaterThan(0);
      expect(formatOfflineDuration(summary!.elapsedSec)).toBe('8h 00m');
      expect(formatOfflineDuration(135)).toBe('2m 15s');
    });

    it('claims 1x or 2x offline rewards, respects chest capacity, and persists lastSavedAt in save payload', () => {
      const state = new GameState();
      const baseNow = 2_000_000_000;
      state.lastSavedAt = baseNow - 3600 * 1000; // 1h away

      const summary = computeOfflineEarningsDomain(state, baseNow, () => 0.25);
      expect(summary).not.toBeNull();

      const startCash = state.cash;
      const startGems = state.gems;
      const startChest = state.getChestItemCount();

      const claimed = claimOfflineEarningsDomain(state, summary!, 2);
      expect(claimed.cash).toBe(summary!.cash * 2);
      expect(claimed.gems).toBe(summary!.gems * 2);
      expect(state.cash).toBe(startCash + claimed.cash);
      expect(state.gems).toBe(startGems + claimed.gems);
      expect(state.getChestItemCount()).toBe(startChest + claimed.totalOresAdded);
      expect(state.getChestItemCount()).toBeLessThanOrEqual(state.getMaxChestCapacity());

      state.lastSavedAt = baseNow;
      const raw = JSON.stringify(serializeSavePayload(state));
      const restored = new GameState();
      deserializeSaveJson(restored, raw);
      expect(restored.lastSavedAt).toBe(baseNow);

      // High-DPS unit in World 1 must respect physical rock-break rate & gem cap (never 10^21 ores)
      state.miners['prism-seraph'] = 1;
      state.plotMiners[0] = 'prism-seraph';
      state.plotUnits[0] = { ...createFreshPlotUnit('prism-seraph'), damageLevel: 60 };
      state.activeWorldId = 'underground';
      state.lastSavedAt = baseNow - 406 * 1000; // 6m 46s away
      const cappedSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(cappedSummary).not.toBeNull();
      expect(cappedSummary!.oresBroken).toBe(Math.floor(MAX_OFFLINE_ORES_PER_SEC * 406));
      expect(cappedSummary!.gems).toBeLessThanOrEqual(MAX_OFFLINE_GEMS);

      // Temporary Weather (Celestial 5x DMG / 10x Ore), Overclock, and 1-min Potions must NOT inflate 8h offline rewards
      const testNow = Date.now();
      state.forceWeather('light_rain', testNow);
      state.lastSavedAt = testNow;
      const baseline8h = computeOfflineEarningsDomain(state, testNow + 8 * 3600 * 1000, () => 0.5)!;
      state.forceWeather('celestial', testNow);
      state.chargeOverclock(100, testNow);
      state.activeBoosts['ore-elixir-3'] = testNow + 60_000;
      state.activeBoosts['ore-luck-potion'] = testNow + 60_000;
      state.activeBoosts['midas-elixir-3'] = testNow + 60_000;
      state.lastSavedAt = testNow;
      const boosted8h = computeOfflineEarningsDomain(state, testNow + 8 * 3600 * 1000, () => 0.5)!;
      expect(boosted8h.cash).toBe(baseline8h.cash);
      expect(boosted8h.gems).toBe(baseline8h.gems);
      expect(boosted8h.totalBonusOres).toBe(baseline8h.totalBonusOres);
    });
  });

  describe('BountiesDomain', () => {
    it('populates 3 unique contracts, tracks clamped progress, claims rewards with refill, and persists via save', () => {
      const state = new GameState();
      expect(state.bounties).toHaveLength(BOUNTY_SLOT_COUNT);
      expect(new Set(state.bounties.map((b) => b.kind)).size).toBe(BOUNTY_SLOT_COUNT);

      const first = state.bounties[0];
      expect(claimBountyDomain(state, first.id, () => 0.3)).toBeNull();

      const newlyReady = recordBountyProgressDomain(state, first.kind, first.target + 5);
      expect(newlyReady).toBe(1);
      expect(first.progress).toBe(first.target);
      expect(getReadyBountyCountDomain(state.bounties)).toBe(1);

      const startGems = state.gems;
      const startCash = state.cash;
      const startDice = state.enchantDice;

      const claimed = claimBountyDomain(state, first.id, () => 0.4);
      expect(claimed).not.toBeNull();
      expect(state.bountiesCompleted).toBe(1);
      if (claimed!.rewardKind === 'gems') {
        expect(state.gems).toBe(startGems + claimed!.rewardAmount);
      } else if (claimed!.rewardKind === 'dice') {
        expect(state.enchantDice).toBe(startDice + claimed!.rewardAmount);
      } else {
        expect(state.cash).toBe(startCash + claimed!.rewardAmount);
      }

      // Slot refilled with a fresh contract keeping all 3 kinds unique
      expect(state.bounties).toHaveLength(BOUNTY_SLOT_COUNT);
      expect(new Set(state.bounties.map((b) => b.kind)).size).toBe(BOUNTY_SLOT_COUNT);
      expect(state.bounties[0].id).not.toBe(first.id);

      const raw = JSON.stringify(serializeSavePayload(state));
      const restored = new GameState();
      deserializeSaveJson(restored, raw);
      expect(restored.bountiesCompleted).toBe(1);
      expect(restored.bounties).toEqual(state.bounties);
    });
  });

  describe('OverclockDomain', () => {
    it('charges, decays after idle delay, auto-activates at 100% for 15s, and boosts tap/drop multipliers', () => {
      const oc = createInitialOverclockState();
      let now = 10_000;

      // Charge 40%
      expect(chargeOverclockDomain(oc, 40, now)).toBe(false);
      expect(oc.charge).toBe(40);

      // No decay during first 5s
      stepOverclockDomain(oc, now + 4_000);
      expect(oc.charge).toBe(40);

      // Decay after 5s idle (2s past delay -> -3%)
      stepOverclockDomain(oc, now + 7_000);
      expect(oc.charge).toBeCloseTo(37, 2);

      // Push to 100% -> auto-activates
      now += 7_500;
      expect(chargeOverclockDomain(oc, 70, now)).toBe(true);
      expect(oc.activeUntil).toBe(now + OVERCLOCK_DURATION_SEC * 1000);

      // Verify GameState multipliers boost while active and return to normal after expiry
      const state = new GameState();
      state.equipBestMiners();
      const baseTap = state.getTapDamage();
      const baseDrop = state.getTotalOreDropMult();
      const baseUnitDmg = state.getPlotUnitStats(0, now)?.dmg ?? 0;

      expect(state.chargeOverclock(100, now)).toBe(true);
      expect(state.isOverclockActive(now + 1000)).toBe(true);
      expect(state.getTapDamage(now + 1000)).toBe(baseTap * 2);
      expect(state.getTotalOreDropMult(now + 1000)).toBeCloseTo(baseDrop * 1.5, 6);
      const ocUnitDmg = state.getPlotUnitStats(0, now + 1000)?.dmg ?? 0;
      expect(ocUnitDmg).toBeGreaterThan(baseUnitDmg);
      expect(Math.abs(ocUnitDmg - baseUnitDmg * 2)).toBeLessThanOrEqual(1);

      // Expires after 15s
      state.stepOverclock(now + OVERCLOCK_DURATION_SEC * 1000 + 100);
      expect(state.isOverclockActive(now + OVERCLOCK_DURATION_SEC * 1000 + 100)).toBe(false);
      expect(state.getTapDamage(now + OVERCLOCK_DURATION_SEC * 1000 + 100)).toBe(baseTap);
      expect(state.getPlotUnitStats(0, now + OVERCLOCK_DURATION_SEC * 1000 + 100)?.dmg).toBe(baseUnitDmg);
    });

    it('chains Overclock Fever Tier 1 -> Tier 2 -> Tier 3 with time extension capped at 25s and scales buffs', () => {
      const oc = createInitialOverclockState();
      const t0 = 50_000;
      expect(chargeOverclockDomain(oc, 100, t0)).toBe(true);
      expect(getOverclockSnapshotDomain(oc, t0 + 1000).tier).toBe(1);

      // Extend without tier jump (e.g. Geode break +1.5s)
      const geodeExt = extendOverclockDomain(oc, 1.5, false, t0 + 2_000);
      expect(geodeExt.extended).toBe(true);
      expect(geodeExt.tierUp).toBe(false);
      expect(geodeExt.tier).toBe(1);

      // Advance to Tier 2 (SUPER FEVER)
      const t2Ext = extendOverclockDomain(oc, 4, true, t0 + 3_000);
      expect(t2Ext.tierUp).toBe(true);
      expect(t2Ext.tier).toBe(2);
      const snap2 = getOverclockSnapshotDomain(oc, t0 + 3_000);
      expect(snap2.chibiDmgMult).toBe(2.5);
      expect(snap2.speedMult).toBe(1);
      expect(snap2.tapMult).toBe(2.75);
      expect(snap2.dropMult).toBe(2.0);
      expect(snap2.critChance).toBe(0.4);

      // Advance to Tier 3 (HYPER FEVER) & verify remaining time cap (25s) + 5-Ult Encore init
      const t3Ext = extendOverclockDomain(oc, 20, true, t0 + 3_500);
      expect(t3Ext.tierUp).toBe(true);
      expect(t3Ext.tier).toBe(3);
      const snap3 = getOverclockSnapshotDomain(oc, t0 + 3_500);
      expect(snap3.remainingSec).toBeCloseTo(OVERCLOCK_MAX_DURATION_SEC, 2);
      expect(snap3.chibiDmgMult).toBe(3.0);
      expect(snap3.speedMult).toBe(1);
      expect(snap3.tapMult).toBe(3.5);
      expect(snap3.dropMult).toBe(2.5);
      expect(snap3.critChance).toBe(0.5);
      expect(snap3.encoreTotal).toBe(OVERCLOCK_HYPER_ENCORE_ULTS);
      expect(snap3.encoreRemaining).toBe(OVERCLOCK_HYPER_ENCORE_ULTS);
      expect(snap3.encoreCompleted).toBe(0);
      expect(getOverclockUltChargeReq(0)).toBe(5);
      expect(getOverclockUltChargeReq(1)).toBe(4);
      expect(getOverclockUltChargeReq(2)).toBe(3);
      expect(getOverclockUltChargeReq(3)).toBe(1);

      // Consume 5 Hyper Encore Ults then finish Encore -> immediate reset to 0%
      for (let i = 1; i <= 5; i++) {
        const res = consumeOverclockEncoreUltDomain(oc, t0 + 4_000 + i * 1000);
        expect(res.completed).toBe(i);
        expect(res.remaining).toBe(5 - i);
      }
      expect(finishOverclockEncoreDomain(oc, t0 + 10_000)).toBe(true);
      const resetSnap = getOverclockSnapshotDomain(oc, t0 + 10_000);
      expect(resetSnap.active).toBe(false);
      expect(resetSnap.tier).toBe(0);
      expect(resetSnap.chargePct).toBe(0);
      expect(resetSnap.encoreTotal).toBe(0);

      // GameState pit event & expiry reset tier back to 1
      const state = new GameState();
      const baseTap = state.getTapDamage();
      const baseDrop = state.getTotalOreDropMult();
      expect(state.chargeOverclock(100, t0)).toBe(true);
      const pitExt = state.onPitEventBroken(t0 + 1_000);
      expect(pitExt.tierUp).toBe(true);
      expect(pitExt.tier).toBe(2);
      expect(state.getTapDamage(t0 + 1_000)).toBe(Math.round(baseTap * 2.75));
      expect(state.getTotalOreDropMult(t0 + 1_000)).toBeCloseTo(baseDrop * 2.0, 6);

      // After expiry, tier resets to 0 (inactive) and next trigger starts at Tier 1
      state.stepOverclock(t0 + 30_000);
      expect(state.getOverclockTier(t0 + 30_000)).toBe(0);
      expect(state.chargeOverclock(100, t0 + 31_000)).toBe(true);
      expect(state.getOverclockTier(t0 + 31_000)).toBe(1);

      // GameState consumeOverclockEncoreUlt + finishOverclockEncore wrappers
      state.extendOverclock(5, true, t0 + 31_500);
      state.extendOverclock(5, true, t0 + 32_000);
      expect(state.getOverclockTier(t0 + 32_000)).toBe(3);
      expect(state.consumeOverclockEncoreUlt(t0 + 32_500).remaining).toBe(4);
      expect(state.finishOverclockEncore(t0 + 33_000)).toBe(true);
      expect(state.isOverclockActive(t0 + 33_000)).toBe(false);
    });

    it('fills active Lv.1 & Lv.2 bars to 100% via chargeOverclockDomain / ore breaks to auto-promote Lv.1 -> Lv.2 -> Lv.3', () => {
      const oc = createInitialOverclockState();
      const t0 = 100_000;
      expect(chargeOverclockDomain(oc, 100, t0)).toBe(true);
      expect(getOverclockSnapshotDomain(oc, t0).tier).toBe(1);
      expect(getOverclockSnapshotDomain(oc, t0).chargePct).toBe(0);

      // Partial active charge in Lv.1 keeps tier 1 & raises bar %
      const step1 = Math.ceil(50 / OVERCLOCK_TIER1_CHARGE_MULT);
      expect(chargeOverclockDomain(oc, 40, t0 + 500)).toBe(false);
      expect(getOverclockSnapshotDomain(oc, t0 + 500).chargePct).toBeCloseTo(40 * OVERCLOCK_TIER1_CHARGE_MULT, 4);
      expect(getOverclockSnapshotDomain(oc, t0 + 500).tier).toBe(1);

      // Crossing 100% in Lv.1 promotes to Lv.2, resets bar to 0%, and adds +4s (min 15s)
      expect(chargeOverclockDomain(oc, step1 + 60, t0 + 1_000)).toBe(true);
      const snap2 = getOverclockSnapshotDomain(oc, t0 + 1_000);
      expect(snap2.tier).toBe(2);
      expect(snap2.chargePct).toBe(0);
      expect(snap2.remainingSec).toBeCloseTo(18, 2);

      // Crossing 100% in Lv.2 promotes to Lv.3 Hyper Encore (5/5)
      const fullLv2 = Math.ceil(100 / OVERCLOCK_TIER2_CHARGE_MULT);
      expect(chargeOverclockDomain(oc, fullLv2, t0 + 2_000)).toBe(true);
      const snap3 = getOverclockSnapshotDomain(oc, t0 + 2_000);
      expect(snap3.tier).toBe(3);
      expect(snap3.encoreTotal).toBe(OVERCLOCK_HYPER_ENCORE_ULTS);
      expect(snap3.encoreRemaining).toBe(OVERCLOCK_HYPER_ENCORE_ULTS);

      // Further chargeOverclockDomain calls at Lv.3 return false
      expect(chargeOverclockDomain(oc, 100, t0 + 2_500)).toBe(false);

      // GameState.onOreBroken feeds active Lv.1 bar toward Lv.2 without inflating overclockTriggers
      const state = new GameState();
      state.chargeOverclock(100, t0);
      const triggersBefore = state.careerStats.overclockTriggers;
      state.onOreBroken('common');
      expect(state.getOverclockSnapshot().chargePct).toBeGreaterThan(0);
      expect(state.careerStats.overclockTriggers).toBe(triggersBefore);
    });
  });

  describe('FusionDomain', () => {
    it('validates all 6 Fusion recipes, protects placed plot chibis, consumes bag+chest ores & gems, and grants Fusion Chibi', () => {
      expect(FUSION_RECIPES.length).toBe(6);
      for (const r of FUSION_RECIPES) {
        expect(getChibiById(r.resultChibiId)).toBeDefined();
        expect(r.requiredMiners.length).toBeGreaterThanOrEqual(2);
        for (const m of r.requiredMiners) expect(getChibiById(m.chibiId)).toBeDefined();
        for (const o of r.requiredOres) expect(getOreById(o.oreId)).toBeDefined();
      }

      const state = new GameState();
      const recipe = FUSION_RECIPES[0]; // Glitch Cheshire
      expect(state.canFuseRecipe(recipe.id)).toBe(false);

      // Give exact ingredients, but put 1 required miner on a plot -> must stay protected!
      state.gems = recipe.gemCost;
      for (const m of recipe.requiredMiners) {
        state.miners[m.chibiId] = m.count;
      }
      for (const o of recipe.requiredOres) {
        state.ores[o.oreId] = Math.floor(o.count / 2);
        state.chestOres[o.oreId] = o.count - state.ores[o.oreId];
      }
      state.plotMiners[0] = recipe.requiredMiners[0].chibiId;
      expect(state.getAvailableFusionMinerCount(recipe.requiredMiners[0].chibiId)).toBe(0);
      expect(state.canFuseRecipe(recipe.id)).toBe(false);

      // Add an extra unplaced copy -> now fuseable!
      state.miners[recipe.requiredMiners[0].chibiId] += 1;
      expect(state.canFuseRecipe(recipe.id)).toBe(true);
      expect(state.getReadyFusionCount()).toBe(1);

      const fused = state.fuseChibiRecipe(recipe.id);
      expect(fused?.resultChibiId).toBe(recipe.resultChibiId);
      expect(state.gems).toBe(0);
      expect(state.miners[recipe.resultChibiId]).toBe(1);
      expect(state.discovered.has(recipe.resultChibiId)).toBe(true);
      // Placed plot unit copy was preserved!
      expect(state.miners[recipe.requiredMiners[0].chibiId]).toBe(1);
      expect(state.plotMiners[0]).toBe(recipe.requiredMiners[0].chibiId);

      // Verify balanced Fusion upgrade cost scaling & all 6 unique Fusion Passives
      expect(getChibiUpgradeCostMult('glitch-cheshire')).toBe(1_500);
      expect(getChibiUpgradeCostMult('thorn-maiden')).toBe(1_500_000_000);
      expect(getChibiUpgradeCostMult('monochrome-saint')).toBe(1_500_000_000_000);
      expect(getChibiUpgradeCostMult('prism-seraph')).toBe(1_500_000_000_000_000);
      expect(getChibiUpgradeCostMult('aether-monarch')).toBe(1_500_000_000_000_000_000_000);
      expect(getChibiUpgradeCostMult('chrono-crystallis')).toBe(1_500_000_000_000_000_000_000_000_000);

      const baseSell = state.getOreValueMult();
      const baseDrop = state.getOreOutputMult();

      // Deploy all 5 Fusion Chibis on plots 0..4 -> activate all 5 passives (strictly Team DMG / Sell Ore / Drop Ore)
      state.plotMiners[0] = 'glitch-cheshire';
      state.plotMiners[1] = 'thorn-maiden';
      state.plotMiners[2] = 'monochrome-saint';
      state.plotMiners[3] = 'prism-seraph';
      state.plotMiners[4] = 'aether-monarch';

      const passives = state.getActiveFusionPassives();
      expect(passives.oreDropPct).toBeCloseTo(1.5, 5);
      expect(passives.oreSellPct).toBeCloseTo(2.0, 5);
      expect(passives.teamDmgPct).toBeCloseTo(1.55, 5);

      expect(state.getOreValueMult()).toBeCloseTo(baseSell + 2.0, 5);
      expect(state.getOreOutputMult()).toBeCloseTo(baseDrop + 1.5, 5);
      state.plotMiners[4] = 'chrono-crystallis';
      expect(state.getActiveFusionPassives().oreSellPct).toBeCloseTo(4.5, 5);
      state.plotMiners[4] = 'aether-monarch';
      for (const r of FUSION_RECIPES) {
        expect(['teamDmgPct', 'oreSellPct', 'oreDropPct']).toContain(r.passive.stat);
      }

      // Star-Up Fusion Chibis scales their passive by +20% per star
      state.chibiStars['glitch-cheshire'] = 2; // +40% -> 0.3 * 1.4 = 0.42 (+0.12)
      state.chibiStars['thorn-maiden'] = 1; // +20% -> 1.5 * 1.2 = 1.80
      state.chibiStars['monochrome-saint'] = 5; // +100% -> 2.0 * 2.0 = 4.00
      const starredPassives = state.getActiveFusionPassives();
      expect(starredPassives.teamDmgPct).toBeCloseTo(1.67, 5);
      expect(starredPassives.oreDropPct).toBeCloseTo(1.8, 5);
      expect(starredPassives.oreSellPct).toBeCloseTo(4.0, 5);
    });
  });

  describe('DailyLoginDomain', () => {
    it('claims Day 1 Cosmic Monarch at 5 stars, blocks selling it, and persists across save/load', () => {
      const state = new GameState();
      const day1Now = new Date(2026, 10, 19, 10, 0, 0).getTime();

      expect(state.canClaimDailyLogin(day1Now)).toBe(true);
      const reward = state.claimDailyLogin(day1Now);
      expect(reward?.day).toBe(1);
      expect(reward?.chibiId).toBe('cosmic-monarch');

      expect(state.miners['cosmic-monarch']).toBe(1);
      expect(state.chibiStars['cosmic-monarch']).toBe(5);
      expect(state.discovered.has('cosmic-monarch')).toBe(true);
      expect(state.hotbar).toContain('cosmic-monarch');
      expect(state.getSellableMinerCount('cosmic-monarch')).toBe(0);
      expect(state.sellMiner('cosmic-monarch', true)).toBe(0);
      expect(state.canClaimDailyLogin(day1Now)).toBe(false);

      // Fusion Chibis are also non-sellable
      state.miners['glitch-cheshire'] = 1;
      expect(state.getSellableMinerCount('glitch-cheshire')).toBe(0);
      expect(state.sellMiner('glitch-cheshire', true)).toBe(0);

      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.dailyLoginClaimedDays).toEqual([1]);
      expect(reloaded.dailyLoginLastClaimDate).toBe('2026-11-19');
      expect(reloaded.chibiStars['cosmic-monarch']).toBe(5);

      // Verify balanced Daily Login Limited Chibi upgrade cost scaling (Days 1..7)
      expect(getChibiUpgradeCostMult('cosmic-monarch')).toBe(2);
      expect(getChibiUpgradeCostMult('crimson-eye-sovereign')).toBe(2_000);
      expect(getChibiUpgradeCostMult('crimson-gaze-maiden')).toBe(2_000_000);
      expect(getChibiUpgradeCostMult('kasa-watcher')).toBe(2_000_000_000);
      expect(getChibiUpgradeCostMult('prism-fracture-eye')).toBe(2_000_000_000_000);
      expect(getChibiUpgradeCostMult('chrono-maiden')).toBe(2_000_000_000_000_000);
      expect(getChibiUpgradeCostMult('ink-seraph')).toBe(2_000_000_000_000_000_000);
    });
  });

  describe('Enchant Multi-Stat Buffs', () => {
    it('applies Ore Drop, Sell Value, and Mining Speed bonuses from equipped plot Enchants', () => {
      const state = new GameState();
      const baseDrop = state.getOreOutputMult();
      const baseSell = state.getOreValueMult();
      const baseUnitMining = state.getPlotUnitStats(0)!.miningMult;

      state.ownedEnchants['spellbound'] = 1;
      expect(state.togglePlotEnchant(0, 'spellbound')).toBe(true);

      expect(state.getActiveEnchantBonuses()).toEqual({ oreDropPct: 1.2, sellValuePct: 1.5 });
      expect(state.getOreOutputMult()).toBeCloseTo(baseDrop + 1.2, 5);
      expect(state.getOreValueMult()).toBeCloseTo(baseSell + 1.5, 5);
      expect(state.getPlotUnitStats(0)!.miningMult).toBeCloseTo(baseUnitMining + 0.85, 2);
    });
  });

  describe('Index Completion Rewards', () => {
    it('unlocks 50% and 100% milestones, grants Gems/Dice + permanent passives, and persists via save/load', () => {
      const state = new GameState();
      const ids = getIndexTabEntryIds('underground');
      expect(ids.length).toBeGreaterThanOrEqual(8);

      // Initially not enough discovered for 50%
      expect(state.getTabReadyIndexRewardCount('underground')).toBe(0);
      expect(state.claimIndexReward('underground:50')).toBeNull();

      // Discover half of underground entries -> 50% milestone unlocks
      const halfCount = Math.ceil(ids.length / 2);
      for (let i = 0; i < halfCount; i++) {
        state.discovered.add(ids[i]);
      }
      expect(state.getTabReadyIndexRewardCount('underground')).toBe(1);
      const gemsBefore = state.gems;
      const halfClaim = state.claimIndexReward('underground:50');
      expect(halfClaim).not.toBeNull();
      expect(halfClaim!.gemsGranted).toBe(500);
      expect(state.gems).toBe(gemsBefore + 500);
      expect(state.claimIndexReward('underground:50')).toBeNull();

      // Discover all underground entries -> 100% milestone unlocks (+1500 Gems, +1 Dice, +5% Ore Sell)
      for (const id of ids) state.discovered.add(id);
      const sellBefore = state.getOreValueMult();
      const diceBefore = state.enchantDice;
      const fullClaim = state.claimIndexReward('underground:100');
      expect(fullClaim).not.toBeNull();
      expect(fullClaim!.gemsGranted).toBe(1500);
      expect(fullClaim!.diceGranted).toBe(1);
      expect(state.enchantDice).toBe(diceBefore + 1);
      expect(state.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
      expect(state.getOreValueMult()).toBeCloseTo(sellBefore + 0.05, 5);

      // Verify save/load persistence
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.claimedIndexRewards.has('underground:50')).toBe(true);
      expect(reloaded.claimedIndexRewards.has('underground:100')).toBe(true);
      expect(reloaded.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
    });
  });

  describe('Critical Tap Damage', () => {
    it('rolls 2.5x critical tap damage at 15% base and 30% during Overclock Fever', () => {
      const normalHit = rollTapCriticalDamage(100, false, () => 0.2);
      expect(normalHit).toEqual({ damage: 100, isCrit: false });

      const critHit = rollTapCriticalDamage(100, false, () => 0.1);
      expect(critHit).toEqual({ damage: Math.round(100 * TAP_CRIT_MULT), isCrit: true });

      const overclockCrit = rollTapCriticalDamage(100, true, () => 0.25);
      expect(overclockCrit).toEqual({ damage: Math.round(100 * TAP_CRIT_MULT), isCrit: true });
    });
  });

  describe('Team Presets Domain', () => {
    it('saves and switches 3 team presets while preserving unit upgrades and persisting via save/load', () => {
      const state = new GameState();
      state.cash = 1_000_000;
      state.miners['astral-recruit'] = 1;
      state.miners['cosmic-monarch'] = 1;

      // Upgrade slot 0 (astral-recruit) and save as Team 1
      expect(state.upgradePlotDamage(0)).toBe(true);
      const dmgLvlBefore = state.plotUnits[0]!.damageLevel;
      expect(state.saveTeamPreset(0)).toBe(true);

      // Swap slot 0 to cosmic-monarch and save as Team 2
      state.removeMinerFromPlot(0);
      state.hotbar[1] = 'cosmic-monarch';
      expect(state.placeHotbarItemOnPlot(1, 0)).toBe('placed');
      expect(state.saveTeamPreset(1)).toBe(true);

      // Switch back to Team 1 -> astral-recruit restored with its upgraded damageLevel
      const res1 = state.applyTeamPreset(0);
      expect(res1).toEqual({ equippedCount: 1, skippedCount: 0 });
      expect(state.plotMiners[0]).toBe('astral-recruit');
      expect(state.plotUnits[0]!.damageLevel).toBe(dmgLvlBefore);

      // Switch to Team 2 -> cosmic-monarch restored
      const res2 = state.applyTeamPreset(1);
      expect(res2).toEqual({ equippedCount: 1, skippedCount: 0 });
      expect(state.plotMiners[0]).toBe('cosmic-monarch');

      // Persist presets via save/load
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.teamPresets[0][0]).toBe('astral-recruit');
      expect(reloaded.teamPresets[1][0]).toBe('cosmic-monarch');
    });
  });

  describe('Career Achievements & Stats', () => {
    it('tracks career stats, unlocks & claims achievement tiers, grants +1% All DMG, and persists via save/load', () => {
      const state = new GameState();
      expect(state.getReadyAchievementCount()).toBe(0);

      // Record 10 crit taps -> unlocks crit_striker:1
      for (let i = 0; i < 10; i++) {
        state.recordCritTap(250 + i * 10);
      }
      expect(state.careerStats.critTaps).toBe(10);
      expect(state.careerStats.highestCrit).toBe(340);
      expect(state.getReadyAchievementCount()).toBeGreaterThanOrEqual(1);

      const gemsBefore = state.gems;
      const tapBefore = state.getTapDamage();
      const res = state.claimAchievementTier('crit_striker:1');
      expect(res).not.toBeNull();
      expect(res!.gemsGranted).toBe(300);
      expect(state.gems).toBe(gemsBefore + 300);
      expect(state.getAchievementAllDmgBonus()).toBeCloseTo(0.01, 5);
      expect(state.getTapDamage()).toBeGreaterThanOrEqual(tapBefore);
      expect(state.claimAchievementTier('crit_striker:1')).toBeNull();

      // Persist via save/load
      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.careerStats.critTaps).toBe(10);
      expect(reloaded.careerStats.highestCrit).toBe(340);
      expect(reloaded.claimedAchievements.has('crit_striker:1')).toBe(true);

      // World Explorer & Index Collector scale across all 8 Worlds (119 total index entries)
      reloaded.unlockedWorlds = ['underground', 'crystal', 'magma', 'ruins', 'astral', 'starwell', 'abyssal', 'chrono'];
      const explorerTier5 = reloaded.claimAchievementTier('world_explorer:5');
      expect(explorerTier5).not.toBeNull();
      expect(explorerTier5!.tier.target).toBe(8);
    });
  });

  describe('Bulk Upgrade Multiplier (x1 / x10 / MAX)', () => {
    it('computes exact multi-level plans and respects currency and maxLevel caps', () => {
      const linearCost = (lvl: number) => lvl * 100;
      expect(
        computeBulkUpgradePlan({ currentLevel: 1, maxLevel: 20, currency: 50, mode: '10', costAtLevel: linearCost })
      ).toEqual({ levels: 0, totalCost: 100, targetLevel: 1 });

      // Currency 650 buys lv1 (100) + lv2 (200) + lv3 (300) = 600
      expect(
        computeBulkUpgradePlan({ currentLevel: 1, maxLevel: 20, currency: 650, mode: '10', costAtLevel: linearCost })
      ).toEqual({ levels: 3, totalCost: 600, targetLevel: 4 });

      // Mode MAX caps at maxLevel
      expect(
        computeBulkUpgradePlan({ currentLevel: 18, maxLevel: 20, currency: 999_999, mode: 'max', costAtLevel: linearCost })
      ).toEqual({ levels: 2, totalCost: 3700, targetLevel: 20 });

      // Plot stat cost formula matches PlotUnitsDomain
      expect(getPlotStatUpgradeCost('dmg', 1, 1)).toBe(50);
      expect(getPlotStatUpgradeCost('speed', 1, 1)).toBe(75);
      expect(getPlotStatUpgradeCost('mining', 1, 1)).toBe(90);
    });
  });

  describe('Welcome-Back Return Rush (10m Boost >= 1h Offline)', () => {
    it('grants 10m Return Rush (+50% Fever Charge & +25% Speed) when returning after >= 1h offline', () => {
      const state = new GameState();
      const baseNow = 2_000_000_000;

      // Under 1h offline -> not eligible
      state.lastSavedAt = baseNow - 1800 * 1000;
      const shortSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(shortSummary?.returnRushEligible).toBe(false);
      if (shortSummary) {
        const shortClaim = claimOfflineEarningsDomain(state, shortSummary, 1, () => {}, baseNow);
        expect(shortClaim.returnRushActivated).toBe(false);
        expect(state.isReturnRushActive(baseNow)).toBe(false);
      }

      // >= 1h offline -> eligible and activates 10m Return Rush
      state.lastSavedAt = baseNow - RETURN_RUSH_MIN_OFFLINE_SEC * 1000;
      const longSummary = computeOfflineEarningsDomain(state, baseNow, () => 0.5);
      expect(longSummary?.returnRushEligible).toBe(true);
      const speedBefore = state.getPlotUnitStats(0, baseNow)!.miningMult;
      const longClaim = claimOfflineEarningsDomain(state, longSummary!, 1, () => {}, baseNow);
      expect(longClaim.returnRushActivated).toBe(true);
      expect(state.isReturnRushActive(baseNow)).toBe(true);
      expect(state.getReturnRushRemainingSec(baseNow)).toBe(RETURN_RUSH_DURATION_SEC);
      expect(state.activeBoosts[RETURN_RUSH_BOOST_ID]).toBe(baseNow + RETURN_RUSH_DURATION_SEC * 1000);

      // +25% Speed reflected on Plot Unit miningMult
      const speedAfter = state.getPlotUnitStats(0, baseNow)!.miningMult;
      expect(speedAfter).toBeCloseTo(speedBefore + RETURN_RUSH_SPEED_BONUS, 2);

      // +50% Fever Charge rate reflected on chargeOverclock
      state.chargeOverclock(20, baseNow);
      expect(state.overclock.charge).toBeCloseTo(20 * (1 + RETURN_RUSH_FEVER_CHARGE_BONUS), 4);
    });
  });

  describe('Spire Coin Tower Drops & Save Persistence', () => {
    it('drops 1 Spire Coin at 0.5% per broken wave ore rock, 5 Spire Coins at 5% on Boss defeat, and persists across save/load', () => {
      const state = new GameState();
      expect(TOWER_ORE_COIN_CHANCE).toBeCloseTo(0.005, 6);
      expect(TOWER_BOSS_COIN_CHANCE).toBeCloseTo(0.05, 6);
      expect(TOWER_BOSS_COIN_DROP).toBe(5);

      state.startTowerRun(1);
      expect(state.towerCoins).toBe(0);
      expect(state.towerRun?.coinsEarned).toBe(0);

      // Break rock #0 with luck (< 0.005) -> +1 Spire Coin
      const luckyOreRes = state.applyTowerTargetDamage(0, 999_999, () => 0.004);
      expect(luckyOreRes.rockBroken).toBe(true);
      expect(luckyOreRes.coinsAwarded).toBe(1);
      expect(state.towerCoins).toBe(1);
      expect(state.towerRun?.coinsEarned).toBe(1);

      // Break rock #1 without luck (>= 0.005) -> +0 Spire Coins
      const unluckyOreRes = state.applyTowerTargetDamage(1, 999_999, () => 0.006);
      expect(unluckyOreRes.rockBroken).toBe(true);
      expect(unluckyOreRes.coinsAwarded).toBe(0);
      expect(state.towerCoins).toBe(1);

      // Defeat Wave 10 Boss with luck (< 0.05) -> +5 Spire Coins
      state.towerRun!.wave = 10;
      state.towerRun!.isBossWave = true;
      state.towerRun!.bossInvulLeft = 0;
      state.towerRun!.hp = 100;
      state.towerRun!.maxHp = 100;
      const bossRes = state.applyTowerTargetDamage(null, 500, () => 0.02);
      expect(bossRes.floorCleared).toBe(true);
      expect(bossRes.coinsAwarded).toBe(5);
      expect(state.towerCoins).toBe(6);
      expect(state.towerRun?.coinsEarned).toBe(6);

      // Summary records coinsEarned and save/load restores towerCoins
      const summary = state.abandonTowerRun();
      expect(summary?.coinsEarned).toBe(6);

      const saved = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, saved);
      expect(reloaded.towerCoins).toBe(6);
      expect(reloaded.spendTowerCoins(4)).toBe(true);
      expect(reloaded.towerCoins).toBe(2);
      expect(reloaded.spendTowerCoins(10)).toBe(false);

      // 0.01% TWIN chibi jackpot drop from broken wave 1-9 ore rock
      expect(TOWER_ORE_TWIN_CHANCE).toBeCloseTo(0.0001, 6);
      const twinState = new GameState();
      twinState.startTowerRun(1);
      const noTwinRes = twinState.applyTowerTargetDamage(0, 999_999, () => 0.001);
      expect(noTwinRes.twinsAwarded ?? []).toHaveLength(0);
      const twinRes = twinState.applyTowerTargetDamage(1, 999_999, () => 0.00005);
      expect(twinRes.twinsAwarded).toHaveLength(1);
      const droppedId = twinRes.twinsAwarded![0];
      expect(twinState.miners[droppedId]).toBe(1);
      expect(twinState.discovered.has(droppedId)).toBe(true);
      expect(twinState.hotbar).toContain(droppedId);
      const twinSummary = twinState.abandonTowerRun();
      expect(twinSummary?.twinsEarned).toEqual([droppedId]);

      // Tower Key Gem price = 5,000 & cooldown = 15 minutes
      expect(TOWER_KEY_GEM_COST).toBe(5_000);
      expect(TOWER_KEY_REGEN_MS).toBe(15 * 60 * 1000);
      twinState.towerKeys = 0;
      twinState.gems = 4_999;
      expect(twinState.buyTowerKeyWithGems()).toBe('no_gems');
      twinState.gems = 6_000;
      expect(twinState.buyTowerKeyWithGems()).toBe('bought');
      expect(twinState.towerKeys).toBe(1);
      expect(twinState.gems).toBe(1_000);
      const tRegenStart = 1_000_000;
      twinState.towerLastKeyRegenAt = tRegenStart;
      expect(twinState.getTowerNextKeyRegenSec(tRegenStart)).toBe(900);
      twinState.syncTowerKeys(tRegenStart + TOWER_KEY_REGEN_MS);
      expect(twinState.towerKeys).toBe(2);
    });

    it('purchases Yukikage, Halcyon, Nocturne, Lullaby & Clockwork Twins (TWIN tier) with Spire Coins, protects from selling, and stacks Dual Passives', () => {
      const state = new GameState();
      expect(state.buyPremiumShopItem('yukikage-twins')).toBe('no_coins');
      state.towerCoins = 425;
      const baseOreDrop = state.getOreOutputMult();

      expect(state.buyPremiumShopItem('yukikage-twins')).toBe('bought');
      expect(state.towerCoins).toBe(375);
      expect(state.miners['yukikage-twins']).toBe(1);
      expect(state.discovered.has('yukikage-twins')).toBe(true);
      expect(isNonSellableChibi('yukikage-twins')).toBe(true);
      expect(state.getSellableMinerCount('yukikage-twins')).toBe(0);

      expect(state.buyPremiumShopItem('halcyon-twins')).toBe('bought');
      expect(state.towerCoins).toBe(310);
      expect(state.miners['halcyon-twins']).toBe(1);
      expect(state.discovered.has('halcyon-twins')).toBe(true);
      expect(isNonSellableChibi('halcyon-twins')).toBe(true);
      expect(state.getSellableMinerCount('halcyon-twins')).toBe(0);

      expect(state.buyPremiumShopItem('nocturne-twins')).toBe('bought');
      expect(state.towerCoins).toBe(230);
      expect(state.miners['nocturne-twins']).toBe(1);
      expect(state.discovered.has('nocturne-twins')).toBe(true);
      expect(isNonSellableChibi('nocturne-twins')).toBe(true);
      expect(state.getSellableMinerCount('nocturne-twins')).toBe(0);

      expect(state.buyPremiumShopItem('lullaby-twins')).toBe('bought');
      expect(state.towerCoins).toBe(130);
      expect(state.miners['lullaby-twins']).toBe(1);
      expect(state.discovered.has('lullaby-twins')).toBe(true);
      expect(isNonSellableChibi('lullaby-twins')).toBe(true);
      expect(state.getSellableMinerCount('lullaby-twins')).toBe(0);

      expect(state.buyPremiumShopItem('clockwork-twins')).toBe('bought');
      expect(state.towerCoins).toBe(10);
      expect(state.miners['clockwork-twins']).toBe(1);
      expect(state.discovered.has('clockwork-twins')).toBe(true);
      expect(isNonSellableChibi('clockwork-twins')).toBe(true);
      expect(state.getSellableMinerCount('clockwork-twins')).toBe(0);

      // Equip on plots #1-#4 and verify stacked Dual Passives
      const basePlot0Dmg = state.getPlotUnitStats(0)!.dmg;
      const hbYukikage = state.hotbar.indexOf('yukikage-twins');
      const hbHalcyon = state.hotbar.indexOf('halcyon-twins');
      const hbNocturne = state.hotbar.indexOf('nocturne-twins');
      const hbLullaby = state.hotbar.indexOf('lullaby-twins');
      const hbClockwork = state.hotbar.indexOf('clockwork-twins');
      expect(hbYukikage).toBeGreaterThanOrEqual(0);
      expect(hbHalcyon).toBeGreaterThanOrEqual(0);
      expect(hbNocturne).toBeGreaterThanOrEqual(0);
      expect(hbLullaby).toBeGreaterThanOrEqual(0);
      expect(hbClockwork).toBeGreaterThanOrEqual(0);
      state.selectedHotbarSlot = hbYukikage;
      state.placeSelectedOnPlot(1);
      state.selectedHotbarSlot = hbHalcyon;
      state.placeSelectedOnPlot(2);
      state.selectedHotbarSlot = hbNocturne;
      state.placeSelectedOnPlot(3);
      state.selectedHotbarSlot = hbLullaby;
      state.placeSelectedOnPlot(4);
      const passives = state.getActivePremiumPassives();
      expect(passives.teamDmgPct).toBeCloseTo(3.6, 5);
      expect(passives.oreDropPct).toBeCloseTo(1.9, 5);
      expect(passives.oreSellPct).toBeCloseTo(1.5, 5);
      expect(state.getPlotUnitStats(0)!.dmg).toBeCloseTo(basePlot0Dmg * 4.6, -1);
      expect(state.getOreOutputMult()).toBeCloseTo(baseOreDrop + 1.9, 4);

      // Swap plot #4 to Clockwork Twins & verify +160% Team / +110% Ore Sell
      state.selectedHotbarSlot = hbClockwork;
      state.placeSelectedOnPlot(4);
      const clockworkPassives = state.getActivePremiumPassives();
      expect(clockworkPassives.teamDmgPct).toBeCloseTo(3.85, 5);
      expect(clockworkPassives.oreDropPct).toBeCloseTo(1.05, 5);
      expect(clockworkPassives.oreSellPct).toBeCloseTo(2.6, 5);
      expect(state.getPlotUnitStats(0)!.dmg).toBeCloseTo(basePlot0Dmg * 4.85, -1);

      // Star-Up Twin Chibis scales their dual passives by +20% per star
      state.chibiStars['yukikage-twins'] = 1; // +20% -> (+0.20 teamDmg, +0.08 oreDrop)
      state.chibiStars['clockwork-twins'] = 5; // +100% -> (+1.60 teamDmg, +1.10 oreSell)
      const starredTwinPassives = state.getActivePremiumPassives();
      expect(starredTwinPassives.teamDmgPct).toBeCloseTo(3.85 + 0.2 + 1.6, 5);
      expect(starredTwinPassives.oreDropPct).toBeCloseTo(1.05 + 0.08, 5);
      expect(starredTwinPassives.oreSellPct).toBeCloseTo(2.6 + 1.1, 5);

      // Verify Twin Index tab progress & 50%/100% milestones
      expect(getIndexTabEntryIds('twin')).toEqual([
        'yukikage-twins',
        'halcyon-twins',
        'nocturne-twins',
        'lullaby-twins',
        'clockwork-twins',
        'paradox-twins',
      ]);
      expect(state.getIndexTabProgress('twin')).toEqual({ found: 5, total: 6, pct: 83 });
      expect(state.getTabReadyIndexRewardCount('twin')).toBe(1);
      const twinHalf = state.claimIndexReward('twin:50');
      expect(twinHalf?.gemsGranted).toBe(6000);
      state.towerCoins = 145;
      expect(state.buyPremiumShopItem('paradox-twins')).toBe('bought');
      expect(state.towerCoins).toBe(0);
      expect(state.miners['paradox-twins']).toBe(1);
      expect(isNonSellableChibi('paradox-twins')).toBe(true);
      expect(state.getSellableMinerCount('paradox-twins')).toBe(0);
      expect(state.getIndexTabProgress('twin')).toEqual({ found: 6, total: 6, pct: 100 });
      expect(state.getTabReadyIndexRewardCount('twin')).toBe(1);
      const twinFull = state.claimIndexReward('twin:100');
      expect(twinFull?.gemsGranted).toBe(20000);
      expect(twinFull?.milestone.passive?.label).toBe('+5% Ore Sell');
      expect(state.getActiveIndexPassiveBonuses().oreSellPct).toBeCloseTo(0.05, 5);
    });
  });

  describe('Twin Tier Auto-Scaling by Latest World & Non-Sellable Protection', () => {
    it('matches current W12 Twin baseDps and upgradeCostScale from latest world anchor', () => {
      const anchor = getLatestWorldScaleAnchor();
      expect(anchor.worldId).toBe('singularity');
      expect(anchor.secretBaseDps).toBe(1e35);
      expect(anchor.upgradeCostScale).toBe(1e37);

      expect(getChibiById('yukikage-twins')?.baseDps).toBe(2.3e35);
      expect(getChibiById('halcyon-twins')?.baseDps).toBe(2.8e35);
      expect(getChibiById('nocturne-twins')?.baseDps).toBe(3.2e35);
      expect(getChibiById('lullaby-twins')?.baseDps).toBe(3.7e35);
      expect(getChibiById('clockwork-twins')?.baseDps).toBe(4.1e35);

      expect(getChibiUpgradeCostMult('yukikage-twins')).toBe(1.1e38);
      expect(getChibiUpgradeCostMult('halcyon-twins')).toBe(1.4e38);
      expect(getChibiUpgradeCostMult('nocturne-twins')).toBe(1.75e38);
      expect(getChibiUpgradeCostMult('lullaby-twins')).toBe(2.1e38);
      expect(getChibiUpgradeCostMult('clockwork-twins')).toBe(2.5e38);
    });

    it('computes clean scaled Twin DPS and upgrade costs for boundaries and simulated W13+', () => {
      expect(computeTwinScaledBaseDps(4_400_000, 2.3)).toBe(10_000_000);
      expect(computeTwinScaledBaseDps(25_000_000, 2.3)).toBe(58_000_000);
      expect(computeTwinScaledBaseDps(25_000_000, 4.1)).toBe(100_000_000);
      expect(computeTwinScaledBaseDps(1_000, 1)).toBe(1_000);
      expect(computeTwinScaledBaseDps(0, 2.3)).toBe(1);
      expect(computeTwinScaledBaseDps(-100, 2.3)).toBe(1);

      const simW13Id = 'astral_w13' as unknown as (typeof WORLDS)[number]['id'];
      const simW14Id = 'celestia_w14' as unknown as (typeof WORLDS)[number]['id'];
      const simWorlds = [
        ...WORLDS,
        { id: simW13Id, name: 'W13', iconColor: '#fff', unlockCost: 1.2e44, oreHpMult: 6.227e45 },
        { id: simW14Id, name: 'W14', iconColor: '#fff', unlockCost: 3e47, oreHpMult: 8.7178e49 },
      ];
      expect(getWorldUpgradeCostScale(simW13Id, simWorlds)).toBe(1e40);
      expect(getWorldUpgradeCostScale(simW14Id, simWorlds)).toBe(1e43);

      // W13 added to WORLDS without miners yet falls back to latest populated world (singularity 1e35)
      const noMinerAnchor = getLatestWorldScaleAnchor(simWorlds, WORLD_MINERS);
      expect(noMinerAnchor.secretBaseDps).toBe(1e35);
      expect(noMinerAnchor.upgradeCostScale).toBe(1e43);

      // W13 with a 1e38 Secret miner scales anchor and Twin catalog while leaving Fusion untouched
      const simCatalogLookup = (id: string) =>
        id === 'w13-secret' ? { baseDps: 1e38 } : getChibiById(id);
      const simMiners = [
        ...WORLD_MINERS,
        { chibiId: 'w13-secret', worldId: simW13Id, chancePct: 0.0003, rarity: 'secret' as const },
      ];
      const w13Anchor = getLatestWorldScaleAnchor(
        simWorlds.slice(0, WORLDS.length + 1),
        simMiners,
        simCatalogLookup
      );
      expect(w13Anchor.worldId).toBe(simW13Id);
      expect(w13Anchor.secretBaseDps).toBe(1e38);
      expect(w13Anchor.upgradeCostScale).toBe(1e40);
      expect(computeTwinUpgradeCostScale(w13Anchor.upgradeCostScale, PREMIUM_SHOP_ITEMS[0].upgradeCostMult)).toBe(1.1e41);

      const aetherBefore = getChibiById('aether-monarch')?.baseDps;
      try {
        syncTwinCatalogDpsFromAnchor(w13Anchor);
        expect(getChibiById('yukikage-twins')?.baseDps).toBe(2.3e38);
        expect(getChibiById('clockwork-twins')?.baseDps).toBe(4.1e38);
        expect(getChibiById('aether-monarch')?.baseDps).toBe(aetherBefore);
      } finally {
        syncTwinCatalogDpsFromAnchor();
      }
      expect(getChibiById('yukikage-twins')?.baseDps).toBe(2.3e35);
    });

    it('blocks all Twin chibis from selling even with unplaced excess duplicates or custom twin rarity entries', () => {
      const state = new GameState();
      state.cash = 0;

      for (const item of PREMIUM_SHOP_ITEMS) {
        state.miners[item.chibiId] = 5;
        expect(isNonSellableChibi(item.chibiId)).toBe(true);
        expect(state.getSellableMinerCount(item.chibiId)).toBe(0);
        expect(state.sellMiner(item.chibiId, false)).toBe(0);
        expect(state.sellMiner(item.chibiId, true)).toBe(0);
        expect(state.sellBatch([`miner:${item.chibiId}`])).toBe(0);
        expect(state.miners[item.chibiId]).toBe(5);
      }
      expect(state.cash).toBe(0);

      // Even a hypothetical rarity:'twin' entry outside PREMIUM_SHOP_ITEMS is blocked
      const mutableCatalog = CHIBI_CATALOG as unknown as Array<(typeof CHIBI_CATALOG)[number]>;
      const fakeTwin = {
        ...CHIBI_CATALOG[0],
        id: 'test-custom-twin',
        name: 'Test Custom Twin',
        rarity: 'twin' as const,
      };
      mutableCatalog.push(fakeTwin);
      try {
        expect(isNonSellableChibi('test-custom-twin')).toBe(true);
        state.miners['test-custom-twin'] = 3;
        expect(state.getSellableMinerCount('test-custom-twin')).toBe(0);
        expect(state.sellMiner('test-custom-twin', true)).toBe(0);
        expect(state.miners['test-custom-twin']).toBe(3);
      } finally {
        mutableCatalog.pop();
      }
    });
  });

  describe('OmegaBossDomain & Omega Tier', () => {
    it('runs 30s Rift-style Omega DPS check from W6 targets (1x/10x/20x), shared Omega Core tokens (1x/2x/3x), buffed 100/250/500 unlock, and legacy save migration', () => {
      const state = new GameState();
      expect(OMEGA_BATTLE_DURATION_SEC).toBe(30);
      expect(state.omegaKeys).toBe(OMEGA_MAX_KEYS);
      expect(OMEGA_KEY_GEM_COST).toBe(50_000);
      expect(OMEGA_KEY_REGEN_MS).toBe(60 * 60 * 1000);
      state.omegaKeys = 0;
      state.gems = 49_999;
      expect(state.buyOmegaKeyWithGems()).toBe('no_gems');
      state.gems = 55_000;
      expect(state.buyOmegaKeyWithGems()).toBe('bought');
      expect(state.omegaKeys).toBe(1);
      expect(state.gems).toBe(5_000);
      const oRegenStart = 2_000_000;
      state.omegaLastKeyRegenAt = oRegenStart;
      expect(state.getOmegaNextKeyRegenSec(oRegenStart)).toBe(3600);
      state.syncOmegaKeys(oRegenStart + OMEGA_KEY_REGEN_MS);
      expect(state.omegaKeys).toBe(2);
      state.omegaKeys = OMEGA_MAX_KEYS;

      expect(OMEGA_BOSS_DEFS.map((b) => b.tiers.map((t) => t.damageTarget))).toEqual([
        [5e19, 5e22, 5e25, 5e28, 5e31],
        [5e20, 5e23, 5e26, 5e29, 5e32],
        [1e21, 1e24, 1e27, 1e30, 1e33],
      ]);
      expect(OMEGA_BOSS_DEFS.map((b) => b.tiers.map((t) => t.cores))).toEqual([
        [1, 2, 3, 4, 5],
        [2, 4, 6, 8, 10],
        [3, 6, 9, 12, 15],
      ]);
      expect(OMEGA_BOSS_DEFS.map((b) => b.unlockCoreCost)).toEqual([100, 250, 500]);

      // Start battle consumes 1 Boss Key immediately; Retreat settles reached tiers
      expect(state.startOmegaBoss('crimson-ronin')).toBe(true);
      expect(state.omegaKeys).toBe(OMEGA_MAX_KEYS - 1);
      expect(state.omegaBattle?.timeRemainingSec).toBe(30);
      const tapNoTier = state.applyOmegaTapDamage(1e10, 0, 1);
      expect(tapNoTier.newTier).toBe(0);
      const retreatTier0 = state.retreatOmegaBoss();
      expect(retreatTier0?.tierReached).toBe(0);
      expect(retreatTier0?.coresAwarded).toBe(0);
      expect(retreatTier0?.retreated).toBe(true);

      // Climbing to Tier 3 on Crimson Ronin grants 3 shared Omega Cores + unclaimed 1st Clear Gems/Dice for Tiers 1..3
      expect(state.startOmegaBoss('crimson-ronin')).toBe(true);
      const tier3Tap = state.applyOmegaTapDamage(5e25, 0, 1);
      expect(tier3Tap.newTier).toBe(3);
      expect(tier3Tap.tierUp).toBe(true);
      const prog = getOmegaTierProgress('crimson-ronin', 5e25);
      expect(prog.tier).toBe(3);
      expect(prog.cores).toBe(3);

      // Tick down 30s to settle automatically
      const tickRes = state.stepOmegaBossTick(30);
      expect(tickRes.finished).toBe(true);
      expect(tickRes.summary?.tierReached).toBe(3);
      expect(tickRes.summary?.coresAwarded).toBe(3);
      expect(tickRes.summary?.firstClear).toBe(true);
      expect(tickRes.summary?.gemsAwarded).toBe(400 + 900 + 1800);
      expect(tickRes.summary?.diceAwarded).toBe(1 + 1 + 2);
      expect(state.omegaCoreTokens).toBe(3);
      expect(state.omegaBestTier['crimson-ronin']).toBe(3);
      expect(state.omegaBestDamage['crimson-ronin']).toBeGreaterThanOrEqual(5e25);

      // Obsidian (2x Cores) & Leviathan (3x Cores) feed the same shared omegaCoreTokens pool
      expect(state.startOmegaBoss('obsidian-sovereign')).toBe(true);
      expect(state.applyOmegaTapDamage(5e23, 0, 1).newTier).toBe(2); // 4 Cores
      state.stepOmegaBossTick(30);
      expect(state.omegaCoreTokens).toBe(3 + 4);

      expect(state.startOmegaBoss('abyssal-leviathan')).toBe(true);
      expect(state.applyOmegaTapDamage(1e24, 0, 1).newTier).toBe(2); // 6 Cores
      state.stepOmegaBossTick(30);
      expect(state.omegaCoreTokens).toBe(3 + 4 + 6);

      // Buffed unlock costs (100 / 250 / 500) & Awaken from shared pool
      state.omegaCoreTokens = 99;
      expect(state.unlockOmegaChibi('crimson-ronin')).toBe('no_cores');
      state.omegaCoreTokens = 140; // 100 unlock + 40 awaken 1★->2★
      expect(state.unlockOmegaChibi('crimson-ronin')).toBe('unlocked');
      expect(state.omegaCoreTokens).toBe(40);
      expect(state.starUpChibi('crimson-ronin')).toEqual({ ok: false, reason: 'max' });
      expect(isNonSellableChibi('crimson-ronin')).toBe(true);
      expect(state.sellMiner('crimson-ronin', true)).toBe(0);
      expect(state.discovered.has('crimson-ronin')).toBe(true);

      state.plotMiners[0] = 'crimson-ronin';
      const baseOmegaPassives = state.getActiveOmegaPassives();
      expect(baseOmegaPassives.teamDmgPct).toBeCloseTo(2.0, 5);
      expect(baseOmegaPassives.oreDropPct).toBeCloseTo(1.2, 5);
      expect(baseOmegaPassives.oreSellPct).toBeCloseTo(0.8, 5);

      expect(state.awakenOmegaChibi('crimson-ronin')).toBe('awakened'); // spends 40 -> 2★ (+20%)
      expect(state.omegaCoreTokens).toBe(0);
      const star2Passives = state.getActiveOmegaPassives();
      expect(star2Passives.teamDmgPct).toBeCloseTo(2.4, 5);
      expect(star2Passives.oreDropPct).toBeCloseTo(1.44, 5);
      expect(star2Passives.oreSellPct).toBeCloseTo(0.96, 5);

      // Save / Load persistence + legacy per-boss cores migration
      state.omegaCoreTokens = 77;
      const json = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, json);
      expect(reloaded.omegaBestTier['crimson-ronin']).toBe(3);
      expect(reloaded.omegaCoreTokens).toBe(77);
      expect(reloaded.chibiStars['crimson-ronin']).toBe(2);

      const legacyPayload = serializeSavePayload(state);
      expect(legacyPayload.omega).toBeDefined();
      delete legacyPayload.omega!.coreTokens;
      legacyPayload.omega!.cores = { 'crimson-ronin': 12, 'obsidian-sovereign': 18, 'abyssal-leviathan': 5 };
      const migrated = new GameState();
      deserializeSaveJson(migrated, JSON.stringify(legacyPayload));
      expect(migrated.omegaCoreTokens).toBe(35);

      // Obsidian (250 Cores) & Abyssal (500 Cores)
      state.omegaCoreTokens = 249;
      expect(state.unlockOmegaChibi('obsidian-sovereign')).toBe('no_cores');
      state.omegaCoreTokens = 499;
      expect(state.unlockOmegaChibi('abyssal-leviathan')).toBe('no_cores');
      state.omegaCoreTokens = 500;
      expect(state.unlockOmegaChibi('abyssal-leviathan')).toBe('unlocked');
      expect(state.omegaCoreTokens).toBe(0);
      expect(isNonSellableChibi('abyssal-leviathan')).toBe(true);
      state.plotMiners[1] = 'abyssal-leviathan';
      const combinedOmegaPassives = state.getActiveOmegaPassives();
      expect(combinedOmegaPassives.teamDmgPct).toBeCloseTo(4.8, 5);
      expect(combinedOmegaPassives.oreDropPct).toBeCloseTo(2.84, 5);
      expect(combinedOmegaPassives.oreSellPct).toBeCloseTo(2.56, 5);
    });

    it('unlocks supplied Chibi IDs in miners and discovered cleanly via unlockChibisByIds', () => {
      const state = new GameState();
      const added = state.unlockChibisByIds(['glitch-cheshire', 'halcyon-twins', 'crimson-ronin']);
      expect(added).toBe(3);
      expect(state.miners['glitch-cheshire']).toBeGreaterThanOrEqual(1);
      expect(state.miners['halcyon-twins']).toBeGreaterThanOrEqual(1);
      expect(state.miners['crimson-ronin']).toBeGreaterThanOrEqual(1);
      expect(state.discovered.has('halcyon-twins')).toBe(true);
      expect(state.unlockChibisByIds(['halcyon-twins'])).toBe(0);
    });
  });

  describe('1000x World Scaling Ladder', () => {
    it('scales WORLDS unlockCost ($12M..$54Dd), progressive oreHpMult (2000..12000 step), upgradeCostScale, and 5 miners/world', () => {
      const grindSteps = [1, 2.5, 6, 15, 35, 80, 180, 400, 900, 2_000, 4_500, 10_000];
      expect(WORLDS).toHaveLength(12);
      let expectedHp = 1;
      for (let w = 0; w < WORLDS.length; w++) {
        if (w > 0) expectedHp *= (w + 1) * 1000;
        const expectedUnlock = w === 0 ? 0 : Number((12e6 * Math.pow(1000, w - 1) * grindSteps[w - 1]).toPrecision(4));
        expect(WORLDS[w].unlockCost).toBe(expectedUnlock);
        expect(WORLDS[w].oreHpMult).toBe(Number(expectedHp.toPrecision(12)));
        expect(getWorldUpgradeCostScale(WORLDS[w].id)).toBe(Number((Math.pow(1000, w) * grindSteps[w]).toPrecision(4)));

        const worldDps = getMinersByWorld(WORLDS[w].id)
          .map((m) => m.chibi.baseDps)
          .sort((a, b) => a - b);
        expect(worldDps).toEqual([10, 20, 35, 65, 100].map((v) => Number(`${v}e${3 * w}`)));
      }

      const simW13Id = 'astral_w13' as unknown as (typeof WORLDS)[number]['id'];
      const simWorlds = [
        ...WORLDS,
        { id: simW13Id, name: 'W13', iconColor: '#fff', unlockCost: 1.2e44, oreHpMult: 6.227e45 },
      ];
      expect(getWorldUpgradeCostScale(simW13Id, simWorlds)).toBe(1e40);

      expect(getWorldStarterChibiId('underground')).toBe('astral-recruit');
      expect(getWorldStarterChibiId('crystal')).toBe('volt-kensei');
      expect(getWorldStarterChibiId('chrono')).toBe('glitch-warden');
      expect(getWorldStarterChibiId('solaris')).toBe('crimson-inkweaver');
      expect(getWorldStarterChibiId('elysium')).toBe('verdant-runeborn');
      expect(getWorldStarterChibiId('nightmare')).toBe('bramble-cat');
      expect(getWorldStarterChibiId('singularity')).toBe('azure-esper');
    });

    it('caps Twin, Omega, and Limited effective baseDps via unlocked-world anchor while preserving catalog sync', () => {
      const anchor = getLatestWorldScaleAnchor();
      expect(anchor.secretBaseDps).toBe(1e35);
      expect(getChibiById('yukikage-twins')?.baseDps).toBe(
        computeTwinScaledBaseDps(1e35, 2.3)
      );

      // W1 with only starter discovered: anchor sits at W1 starter (10 baseDps)
      const w1Anchor = getUnlockedWorldScaleAnchor(['underground'], new Set(['astral-recruit']));
      expect(w1Anchor.worldId).toBe('underground');
      expect(w1Anchor.secretBaseDps).toBe(10);
      expect(w1Anchor.upgradeCostScale).toBe(1);
      expect(getEffectiveChibiBaseDps('yukikage-twins', ['underground'], new Set(['astral-recruit']))).toBe(23);

      // Discovering W1 Secret raises W1 anchor to 100
      expect(
        getEffectiveChibiBaseDps('yukikage-twins', ['underground'], new Set(['astral-recruit', 'cyber-ki-brawler']))
      ).toBe(230);

      // Newly unlocking W2 with only W2 starter discovered anchors at W2 starter (10_000) -> 23_000 Twin
      expect(getEffectiveChibiBaseDps('yukikage-twins', ['underground', 'crystal'], new Set(['volt-kensei']))).toBe(
        23_000
      );

      // Day 7 Limited unit is capped inside W1 capability when only W1 is unlocked
      const cappedInk = getEffectiveChibiBaseDps('ink-seraph', ['underground'], new Set(['astral-recruit']));
      expect(cappedInk).toBeLessThan(1_000);
      expect(cappedInk).toBeLessThanOrEqual(getChibiById('ink-seraph')!.baseDps);

      // World miners always keep their own fixed catalog baseDps
      expect(getEffectiveChibiBaseDps('volt-kensei', ['underground'], new Set(['astral-recruit']))).toBe(10_000);
    });

    it('aligns World Research tree root/apex costs to hardcore idle ladder inside unlock affordability and keeps valuePerLv bounded', () => {
      const grindSteps = [1, 2.5, 6, 15, 35, 80, 180, 400, 900, 2_000, 4_500, 10_000];
      for (let w = 0; w < WORLDS.length; w++) {
        const nodes = getResearchNodesForTree(WORLDS[w].id);
        const root = nodes.find((n) => n.requires.length === 0)!;
        const apex = nodes.find((n) => n.row === 3)!;
        const valNode = nodes.find((n) => n.effectType === 'oreValuePct')!;
        expect(root.baseCost).toBe(Number((6_000 * Math.pow(1000, w) * grindSteps[w]).toPrecision(4)));
        expect(apex.baseCost).toBe(Number((600_000 * Math.pow(1000, w) * grindSteps[w]).toPrecision(4)));
        expect(valNode.perLevel).toBeLessThanOrEqual(0.5);
        if (w < WORLDS.length - 1) {
          expect(apex.baseCost).toBeLessThan(WORLDS[w + 1].unlockCost);
        }
      }
    });

    it('preserves W6-W8 endgame cash >= 1e24 on save/reload, caps Twin upgrade cost, and avoids tap Overclock double-counting', () => {
      const state = new GameState();
      state.cash = 2.5e25;
      state.unlockedWorlds = ['underground'];
      state.miners['yukikage-twins'] = 1;
      state.plotMiners[0] = 'yukikage-twins';
      state.plotUnits[0] = {
        chibiId: 'yukikage-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
      };

      const raw = JSON.stringify(serializeSavePayload(state));
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, raw);
      expect(reloaded.cash).toBe(2.5e25);
      expect(getChibiUpgradeCostMult('yukikage-twins', reloaded.unlockedWorlds, reloaded.discovered)).toBe(11);
      expect(reloaded.getPlotUnitStats(0)?.dmgCost).toBe(550);

      // W8 Chrono Seraph on plot: Overclock Tier 1 doubles tap damage cleanly without 4x double-counting
      reloaded.unlockedWorlds = WORLDS.map((w) => w.id);
      reloaded.miners['chrono-seraph'] = 1;
      reloaded.plotMiners[0] = 'chrono-seraph';
      reloaded.plotUnits[0] = {
        chibiId: 'chrono-seraph',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
      };
      const now = 5_000_000;
      const baseTap = reloaded.getTapDamage(now);
      expect(reloaded.chargeOverclock(100, now)).toBe(true);
      const ocTap = reloaded.getTapDamage(now + 1000);
      expect(ocTap).toBeGreaterThanOrEqual(baseTap * 2 - 1);
      expect(ocTap).toBeLessThanOrEqual(baseTap * 2 + 1);

      // W11-W12 endgame cash (5.4e40+), unlocked worlds, and Rift Tier 12 survive save/reload without clamp
      reloaded.cash = 5.4e40;
      reloaded.riftBestTier = 12;
      reloaded.riftBestDamage = 5e37;
      const w11w12Raw = JSON.stringify(serializeSavePayload(reloaded));
      const w11w12Loaded = new GameState();
      deserializeSaveJson(w11w12Loaded, w11w12Raw);
      expect(w11w12Loaded.cash).toBe(5.4e40);
      expect(w11w12Loaded.unlockedWorlds).toContain('nightmare');
      expect(w11w12Loaded.unlockedWorlds).toContain('singularity');
      expect(w11w12Loaded.riftBestTier).toBe(12);
      expect(w11w12Loaded.riftBestDamage).toBe(5e37);
    });
  });

  describe('TwinTrialDomain', () => {
    function makeTrialCtx() {
      return {
        twinTrial: createInitialTwinTrialState(),
        miners: { 'astral-recruit': 1 } as Record<string, number>,
        hotbar: ['astral-recruit', null, null, null, null, null, null, null, null] as (string | null)[],
        selectedHotbarSlot: 0,
        plotMiners: ['astral-recruit', null, null, null, null] as (string | null)[],
        plotUnits: [
          {
            chibiId: 'astral-recruit',
            damageLevel: 1,
            speedLevel: 1,
            miningSpeedLevel: 1,
            pickaxeId: '',
            mutationId: 'normal',
            enchantId: null,
          },
          null,
          null,
          null,
          null,
        ] as (PlotUnitState | null)[],
        stashedUnits: {} as Record<string, PlotUnitState[]>,
        ownedPickaxes: {} as Record<string, number>,
        teamPresets: [
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ] as (string | null)[][],
        discovered: new Set<string>(['astral-recruit']),
      };
    }

    it('unlocks once from locked to available and rejects duplicate unlocks', () => {
      const ctx = makeTrialCtx();
      expect(ctx.twinTrial.status).toBe('locked');
      expect(unlockTwinTrialDomain(ctx)).toBe(true);
      expect(ctx.twinTrial.status).toBe('available');
      expect(unlockTwinTrialDomain(ctx)).toBe(false);
    });

    it('claims 1 of 5 Twin Chibis for 20 minutes without adding to discovered', () => {
      const ctx = makeTrialCtx();
      expect(claimTwinTrialDomain(ctx, 'yukikage-twins', 1_000_000)).toBe(false);
      unlockTwinTrialDomain(ctx);

      expect(claimTwinTrialDomain(ctx, 'astral-recruit', 1_000_000)).toBe(false);
      expect(claimTwinTrialDomain(ctx, 'yukikage-twins', 1_000_000)).toBe(true);

      expect(ctx.twinTrial).toEqual({
        status: 'active',
        chibiId: 'yukikage-twins',
        startedAt: 1_000_000,
        expiresAt: 1_000_000 + TWIN_TRIAL_DURATION_MS,
      });
      expect(ctx.miners['yukikage-twins']).toBe(1);
      expect(ctx.hotbar[1]).toBe('yukikage-twins');
      expect(ctx.discovered.has('yukikage-twins')).toBe(false);
      expect(getTrialOwnedCount(ctx.twinTrial, 'yukikage-twins')).toBe(1);
      expect(getPermanentMinerCount(ctx.miners, ctx.twinTrial, 'yukikage-twins')).toBe(0);
      expect(getTwinTrialRemainingSec(ctx.twinTrial, 1_000_000 + 30_000)).toBe(1170);

      // Cannot claim a second time while active or expired
      expect(claimTwinTrialDomain(ctx, 'halcyon-twins', 1_010_000)).toBe(false);
    });

    it('purges trial unit from miners, hotbar, plots, stash, and teamPresets on expiry', () => {
      const ctx = makeTrialCtx();
      unlockTwinTrialDomain(ctx);
      claimTwinTrialDomain(ctx, 'clockwork-twins', 1_000_000);

      // Simulate trial unit placed on plot 1, stashed, and saved in preset 0
      ctx.plotMiners[1] = 'clockwork-twins';
      ctx.plotUnits[1] = {
        chibiId: 'clockwork-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: 'sunwheel',
        mutationId: 'normal',
        enchantId: null,
        isTrial: true,
      };
      ctx.stashedUnits['clockwork-twins'] = [
        {
          chibiId: 'clockwork-twins',
          damageLevel: 1,
          speedLevel: 1,
          miningSpeedLevel: 1,
          pickaxeId: '',
          mutationId: 'normal',
          enchantId: null,
          isTrial: true,
        },
      ];
      ctx.teamPresets[0] = ['astral-recruit', 'clockwork-twins', null, null, null];
      ctx.selectedHotbarSlot = 1;

      const res = syncTwinTrialDomain(ctx, 1_000_000 + TWIN_TRIAL_DURATION_MS);
      expect(res).toEqual({ expired: true, chibiId: 'clockwork-twins' });
      expect(ctx.twinTrial.status).toBe('expired');
      expect(ctx.miners['clockwork-twins']).toBeUndefined();
      expect(ctx.hotbar.includes('clockwork-twins')).toBe(false);
      expect(ctx.selectedHotbarSlot).toBe(-1);
      expect(ctx.plotMiners[1]).toBeNull();
      expect(ctx.plotUnits[1]).toBeNull();
      expect(ctx.ownedPickaxes['sunwheel']).toBe(1);
      expect(ctx.stashedUnits['clockwork-twins']).toBeUndefined();
      expect(ctx.teamPresets[0]).toEqual(['astral-recruit', null, null, null, null]);
    });

    it('keeps permanent copy intact if player acquires the same Twin before trial expires', () => {
      const ctx = makeTrialCtx();
      unlockTwinTrialDomain(ctx);
      claimTwinTrialDomain(ctx, 'nocturne-twins', 1_000_000);

      // Player later buys a permanent copy and places both (slot 1 permanent, slot 2 trial)
      ctx.miners['nocturne-twins'] = 2;
      ctx.discovered.add('nocturne-twins');
      ctx.plotMiners[1] = 'nocturne-twins';
      ctx.plotUnits[1] = {
        chibiId: 'nocturne-twins',
        damageLevel: 5,
        speedLevel: 2,
        miningSpeedLevel: 2,
        pickaxeId: 'sunwheel',
        mutationId: 'diamond',
        enchantId: 'blazing',
      };
      ctx.plotMiners[2] = 'nocturne-twins';
      ctx.plotUnits[2] = {
        chibiId: 'nocturne-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
        isTrial: true,
      };
      ctx.teamPresets[0] = ['astral-recruit', 'nocturne-twins', null, null, null];

      const res = syncTwinTrialDomain(ctx, 1_000_000 + TWIN_TRIAL_DURATION_MS + 1000);
      expect(res.expired).toBe(true);
      expect(ctx.miners['nocturne-twins']).toBe(1);
      expect(ctx.hotbar.includes('nocturne-twins')).toBe(true);
      expect(ctx.plotMiners[1]).toBe('nocturne-twins');
      expect(ctx.plotUnits[1]?.damageLevel).toBe(5);
      expect(ctx.plotMiners[2]).toBeNull();
      expect(ctx.plotUnits[2]).toBeNull();
      expect(ctx.discovered.has('nocturne-twins')).toBe(true);
      expect(ctx.teamPresets[0]).toEqual(['astral-recruit', 'nocturne-twins', null, null, null]);
    });

    it('serializes and reloads twinTrial without auto-adding trial unit to discovered, and expires offline saves', () => {
      const state = new GameState();
      const start = Date.now() - 60_000;
      state.twinTrial = {
        status: 'active',
        chibiId: 'halcyon-twins',
        startedAt: start,
        expiresAt: start + TWIN_TRIAL_DURATION_MS,
      };
      state.miners['halcyon-twins'] = 1;
      state.plotMiners[1] = 'halcyon-twins';
      state.plotUnits[1] = {
        chibiId: 'halcyon-twins',
        damageLevel: 1,
        speedLevel: 1,
        miningSpeedLevel: 1,
        pickaxeId: '',
        mutationId: 'normal',
        enchantId: null,
        isTrial: true,
      };
      state.discovered.delete('halcyon-twins');

      const rawActive = JSON.stringify(serializeSavePayload(state));
      const reloadedActive = new GameState();
      deserializeSaveJson(reloadedActive, rawActive);
      expect(reloadedActive.twinTrial.status).toBe('active');
      expect(reloadedActive.miners['halcyon-twins']).toBe(1);
      expect(reloadedActive.plotUnits[1]?.isTrial).toBe(true);
      expect(reloadedActive.discovered.has('halcyon-twins')).toBe(false);

      // Expired save payload purges on deserialize
      state.twinTrial.expiresAt = Date.now() - 5_000;
      const rawExpired = JSON.stringify(serializeSavePayload(state));
      const reloadedExpired = new GameState();
      deserializeSaveJson(reloadedExpired, rawExpired);
      expect(reloadedExpired.twinTrial.status).toBe('expired');
      expect(reloadedExpired.miners['halcyon-twins']).toBeUndefined();
      expect(reloadedExpired.plotMiners[1]).toBeNull();
      expect(reloadedExpired.discovered.has('halcyon-twins')).toBe(false);
    });

    it('enforces read-only trial unit guards across PlotUnitsDomain, star-up, equipBest, and GameState API', () => {
      const state = new GameState();
      state.cash = 1_000_000;
      state.gems = 10_000;
      state.ownedPickaxes['sunwheel'] = 1;
      expect(state.isTwinTrialVisible()).toBe(false);
      expect(state.unlockTwinTrial()).toBe(true);
      expect(state.isTwinTrialVisible()).toBe(true);

      const now = Date.now();
      expect(state.claimTwinTrial('lullaby-twins', now)).toBe(true);
      expect(state.isTwinTrialActive(now)).toBe(true);
      expect(state.isTrialOnlyChibi('lullaby-twins')).toBe(true);
      expect(state.getTwinTrialRemainingSec(now)).toBe(1200);

      // Equip onto plot 1 via hotbar (claimTwinTrial auto-inserted into hotbar[0])
      expect(state.placeHotbarItemOnPlot(0, 1)).toBe('placed');
      expect(state.isTrialPlotSlot(1)).toBe(true);
      expect(state.plotUnits[1]?.isTrial).toBe(true);

      // Read-only: upgrades, pickaxe, mutation, enchant, and star-up are all blocked
      expect(state.upgradePlotDamage(1)).toBe(false);
      expect(state.upgradePlotSpeed(1)).toBe(false);
      expect(state.upgradePlotMiningSpeed(1)).toBe(false);
      expect(state.buyOrEquipPickaxe(1, 'sunwheel')).toBe('locked');
      expect(state.rollPlotMutation(1)).toBeNull();
      expect(state.togglePlotEnchant(1, 'blazing')).toBe(false);
      expect(state.cash).toBe(1_000_000);
      expect(state.gems).toBe(10_000);
      expect(state.ownedPickaxes['sunwheel']).toBe(1);

      // Even if player later gets 1 permanent copy (total 2), trial copy is not counted for star-up (0 spare dupes)
      state.miners['lullaby-twins'] = 2;
      state.discovered.add('lullaby-twins');
      expect(state.isTrialOnlyChibi('lullaby-twins')).toBe(false);
      expect(state.starUpChibi('lullaby-twins').ok).toBe(false);
      expect(state.autoStarUpAll()).toBe(0);

      // Equip best keeps 1 permanent (non-trial) and 1 trial (isTrial: true)
      state.equipBestMiners();
      const lullabySlots = state.plotUnits.filter((u) => u?.chibiId === 'lullaby-twins');
      expect(lullabySlots).toHaveLength(2);
      expect(lullabySlots.filter((u) => u?.isTrial)).toHaveLength(1);
      expect(lullabySlots.filter((u) => !u?.isTrial)).toHaveLength(1);

      // Permanent slot can upgrade, trial slot remains read-only
      const permIdx = state.plotUnits.findIndex((u) => u?.chibiId === 'lullaby-twins' && !u.isTrial);
      const trialIdx = state.plotUnits.findIndex((u) => u?.chibiId === 'lullaby-twins' && u.isTrial);
      expect(state.upgradePlotDamage(permIdx)).toBe(true);
      expect(state.upgradePlotDamage(trialIdx)).toBe(false);
    });
  });

  describe('Hourly Rift & AnomalyData', () => {
    it('opens automatically during :00-:15, allows 500K Gem Rift Pass when closed, grants Shards & 100-Shard pity', () => {
      const openMs = new Date(2026, 10, 25, 14, 5, 0).getTime();
      const closedMs = new Date(2026, 10, 25, 14, 25, 0).getTime();

      const openSnap = getRiftWindowSnapshot(openMs, 0);
      expect(openSnap.isOpen).toBe(true);
      expect(openSnap.source).toBe('hourly');
      expect(openSnap.remainingSec).toBe(600);

      const closedSnap = getRiftWindowSnapshot(closedMs, 0);
      expect(closedSnap.isOpen).toBe(false);
      expect(closedSnap.source).toBe('closed');
      expect(closedSnap.nextOpenSec).toBe(2100);

      const state = new GameState();
      state.gems = 100_000;
      expect(state.buyRiftPass(closedMs)).toBe('no_gems');

      state.gems = RIFT_PASS_GEM_COST;
      expect(state.buyRiftPass(closedMs)).toBe('bought');
      expect(state.gems).toBe(0);
      const passSnap = state.getRiftWindowSnapshot(closedMs);
      expect(passSnap.isOpen).toBe(true);
      expect(passSnap.source).toBe('pass');

      const claimRes = state.claimRiftBreachReward(closedMs, () => 0.01);
      expect(claimRes.shardsEarned).toBeGreaterThanOrEqual(18);
      expect(claimRes.droppedChibiId).toBeTruthy();
      expect(state.riftShards).toBe(claimRes.shardsEarned);

      state.riftShards = 499;
      expect(state.redeemAnomalyChibi('void-asura')).toBe('no_shards');
      state.riftShards = 500;
      expect(state.redeemAnomalyChibi('void-asura')).toBe('redeemed');
      expect(state.riftShards).toBe(0);
      expect(state.discovered.has('void-asura')).toBe(true);
      expect(isNonSellableChibi('void-asura')).toBe(true);

      state.riftShards = 249;
      expect(state.redeemAnomalyChibi('null-singularity')).toBe('no_shards');
      state.riftShards = 250;
      expect(state.redeemAnomalyChibi('null-singularity')).toBe('redeemed');
      expect(state.riftShards).toBe(0);
      expect(state.discovered.has('null-singularity')).toBe(true);
    });

    it('defines Tier 1-12 damage thresholds (1 Shard per Tier), tier progress math, and hourly boss rotation', () => {
      expect(RIFT_BATTLE_DURATION_SEC).toBe(30);
      expect(RIFT_MAX_ATTEMPTS_PER_WINDOW).toBe(3);
      expect(RIFT_TIER_DEFS).toHaveLength(12);
      expect(RIFT_TIER_DEFS[0]).toMatchObject({ tier: 1, damageTarget: 5_000, shards: 1 });
      expect(RIFT_TIER_DEFS[3]).toMatchObject({ tier: 4, damageTarget: 50_000_000_000_000, shards: 4 });
      expect(RIFT_TIER_DEFS[9]).toMatchObject({ tier: 10, damageTarget: 5e31, shards: 10 });
      expect(RIFT_TIER_DEFS[10]).toMatchObject({ tier: 11, worldLabel: 'W11 Nightmare', damageTarget: 5e34, shards: 11, dropChance: 0.14 });
      expect(RIFT_TIER_DEFS[11]).toMatchObject({ tier: 12, worldLabel: 'W12 Singularity', damageTarget: 5e37, shards: 12, dropChance: 0.16 });

      expect(getRiftTierProgress(0)).toMatchObject({ tier: 0, shards: 0, nextTarget: 5_000, progressPct: 0 });
      expect(getRiftTierProgress(2_500)).toMatchObject({ tier: 0, shards: 0, nextTarget: 5_000, progressPct: 50 });
      expect(getRiftTierProgress(5_000)).toMatchObject({ tier: 1, shards: 1, currentTarget: 5_000, nextTarget: 50_000_000 });
      expect(getRiftTierProgress(50_000_000_000_000)).toMatchObject({ tier: 4, shards: 4 });
      expect(getRiftTierProgress(5e31)).toMatchObject({ tier: 10, shards: 10, nextTarget: 5e34 });
      expect(getRiftTierProgress(5e34)).toMatchObject({ tier: 11, shards: 11, nextTarget: 5e37 });
      expect(getRiftTierProgress(5e37)).toMatchObject({ tier: 12, shards: 12, nextTarget: null, progressPct: 100 });

      expect(getRiftHourlyBossId(0)).toBe('void-asura');
      expect(getRiftHourlyBossId(1)).toBe('null-singularity');
      expect(getRiftHourlyBossId(0)).not.toBe(getRiftHourlyBossId(1));
    });

    it('enforces 3-attempt dual-bucket quota across :05/:15 Force Open and :55/:00 hourly overlap without double grants', () => {
      const state = new GameState();
      const emptyOpenMs = new Date(2026, 10, 25, 14, 5, 0).getTime();
      // Empty plot squad guard
      state.plotMiners = [null, null, null, null, null];
      state.plotUnits = [null, null, null, null, null];
      expect(state.startRiftBattle(emptyOpenMs)).toBe(false);

      // Deploy a unit
      state.miners['astral-recruit'] = 1;
      state.equipBestMiners();
      expect(state.getRiftWindowSnapshot(emptyOpenMs).attemptsRemaining).toBe(3);

      // Spend all 3 hourly attempts at :05
      for (let i = 0; i < 3; i++) {
        expect(state.startRiftBattle(emptyOpenMs)).toBe(true);
        state.retreatRiftBattle(emptyOpenMs);
        state.clearRiftSummary();
      }
      expect(state.getRiftWindowSnapshot(emptyOpenMs).attemptsRemaining).toBe(0);
      expect(state.startRiftBattle(emptyOpenMs)).toBe(false);

      // Buy Force Open pass at :05 when 0 attempts left -> switches to pass bucket with 3 attempts
      state.gems = RIFT_PASS_GEM_COST;
      expect(state.buyRiftPass(emptyOpenMs)).toBe('bought');
      expect(state.getRiftWindowSnapshot(emptyOpenMs)).toMatchObject({
        isOpen: true,
        source: 'pass',
        attemptsRemaining: 3,
      });
      // Spend 1 pass attempt at :06, then cross :15 -> must still have 2 pass attempts (no reset to 3)
      const at06Ms = emptyOpenMs + 60_000;
      expect(state.startRiftBattle(at06Ms)).toBe(true);
      state.retreatRiftBattle(at06Ms);
      const at16Ms = new Date(2026, 10, 25, 14, 16, 0).getTime();
      expect(state.getRiftWindowSnapshot(at16Ms)).toMatchObject({
        isOpen: true,
        source: 'pass',
        attemptsRemaining: 2,
      });

      // Fresh scenario: buy pass at :55, spend 1 pass attempt, then cross :00 -> gets 3 hourly attempts while keeping 2 pass attempts
      const stateB = new GameState();
      stateB.miners['astral-recruit'] = 1;
      stateB.equipBestMiners();
      stateB.gems = RIFT_PASS_GEM_COST;
      const at55Ms = new Date(2026, 10, 25, 14, 55, 0).getTime();
      expect(stateB.buyRiftPass(at55Ms)).toBe('bought');
      expect(stateB.startRiftBattle(at55Ms)).toBe(true);
      stateB.retreatRiftBattle(at55Ms);
      expect(stateB.getRiftWindowSnapshot(at55Ms).attemptsRemaining).toBe(2);

      const at00Ms = new Date(2026, 10, 25, 15, 0, 0).getTime();
      expect(stateB.getRiftWindowSnapshot(at00Ms)).toMatchObject({
        isOpen: true,
        source: 'hourly',
        attemptsRemaining: 3,
      });
      // Exhaust all 3 free hourly attempts -> should fall back to the 2 unused pass attempts (still valid until :10)
      for (let i = 0; i < 3; i++) {
        expect(stateB.startRiftBattle(at00Ms)).toBe(true);
        stateB.retreatRiftBattle(at00Ms);
      }
      expect(stateB.getRiftWindowSnapshot(at00Ms)).toMatchObject({
        isOpen: true,
        source: 'pass',
        attemptsRemaining: 2,
      });
    });

    it('runs 30s Rift battle with combat anomalies (overclock-surge, hyper-crit, mirror-echo, meteor-storm), settles 1 Shard/Tier, and persists quota/best', () => {
      // Find hour indices for each anomaly (hourIndex % 4 === 0..3)
      const baseHourMs = Math.floor(new Date(2026, 10, 25, 16, 2, 0).getTime() / 3_600_000) * 3_600_000 + 120_000;
      const findHourMs = (mod: number) => {
        for (let h = 0; h < 8; h++) {
          const ms = baseHourMs + h * 3_600_000;
          if (Math.floor(ms / 3_600_000) % 4 === mod) return ms;
        }
        return baseHourMs;
      };

      const hyperCritMs = findHourMs(0);
      const meteorStormMs = findHourMs(1);
      const overclockSurgeMs = findHourMs(2);
      const mirrorEchoMs = findHourMs(3);

      // 1. overclock-surge: 1.3x squad strike DMG
      const stateSurge = new GameState();
      stateSurge.miners['astral-recruit'] = 1;
      stateSurge.equipBestMiners();
      expect(stateSurge.startRiftBattle(overclockSurgeMs)).toBe(true);
      const unitDmg = stateSurge.getPlotUnitStats(0)!.dmg;
      const surgeStrike = stateSurge.applyRiftSquadStrike(0, 1, false, () => 0.99);
      expect(surgeStrike.dmgDealt).toBe(Math.round(unitDmg * 1.3));

      // 2. mirror-echo: 1.35x on Ult strike
      const stateEcho = new GameState();
      stateEcho.miners['astral-recruit'] = 1;
      stateEcho.equipBestMiners();
      const echoUnitDmg = stateEcho.getPlotUnitStats(0)!.dmg;
      expect(stateEcho.startRiftBattle(mirrorEchoMs)).toBe(true);
      const echoBase = stateEcho.applyRiftSquadStrike(0, 1, false, () => 0.99);
      const echoUlt = stateEcho.applyRiftSquadStrike(0, 1, true, () => 0.99);
      expect(echoBase.dmgDealt).toBe(Math.round(echoUnitDmg));
      expect(echoUlt.dmgDealt).toBe(Math.round(echoUnitDmg * 1.35));

      // 3. hyper-crit: +25% crit chance & 1.5x crit mult (rng = 0.25 triggers crit because base 0.05 + 0.25 = 0.30 > 0.25)
      const stateCrit = new GameState();
      stateCrit.miners['astral-recruit'] = 1;
      stateCrit.equipBestMiners();
      const critUnitDmg = stateCrit.getPlotUnitStats(0)!.dmg;
      expect(stateCrit.startRiftBattle(hyperCritMs)).toBe(true);
      const critStrike = stateCrit.applyRiftSquadStrike(0, 1, false, () => 0.25);
      expect(critStrike.isCrit).toBe(true);
      expect(critStrike.dmgDealt).toBe(Math.round(critUnitDmg * 2.25 * 1.5));

      // 4. meteor-storm: 4s meteor burst + 30s finish awards exact Tier N = N Shards (Tier 4 -> 4 Shards) & persists
      const stateMeteor = new GameState();
      stateMeteor.miners['astral-recruit'] = 1;
      stateMeteor.equipBestMiners();
      expect(stateMeteor.startRiftBattle(meteorStormMs)).toBe(true);
      const tick4s = stateMeteor.stepRiftBattleTick(4.0, 1000, meteorStormMs, () => 0.99);
      expect(tick4s.meteorDmg).toBe(4000);
      expect(tick4s.finished).toBe(false);

      // Push damage to Tier 4 (50T) via tap and finish timer
      stateMeteor.applyRiftTapDamage(50_000_000_000_000, 0, 1, () => 0.99);
      const finishTick = stateMeteor.stepRiftBattleTick(26.0, 1000, meteorStormMs, () => 0.01);
      expect(finishTick.finished).toBe(true);
      expect(finishTick.summary).toMatchObject({
        tierReached: 4,
        shardsEarned: 4,
        isNewBest: true,
        attemptsRemaining: 2,
      });
      expect(finishTick.summary?.droppedChibiId).toBeTruthy();
      expect(stateMeteor.riftShards).toBe(4);
      expect(stateMeteor.riftBestTier).toBe(4);
      expect(stateMeteor.riftBestDamage).toBeGreaterThanOrEqual(50_000_000_000_000);

      // Save & reload round-trip preserves quota & personal best
      const saved = serializeSavePayload(stateMeteor);
      const reloaded = new GameState();
      deserializeSaveJson(reloaded, JSON.stringify(saved));
      expect(reloaded.riftHourlyAttemptsUsed).toBe(1);
      expect(reloaded.riftBestTier).toBe(4);
      expect(reloaded.riftBestDamage).toBe(stateMeteor.riftBestDamage);
      expect(reloaded.getRiftWindowSnapshot(meteorStormMs).attemptsRemaining).toBe(2);
    });

    it('isolates Rift squad DPS, squad strikes, and tap damage from Overclock Fever buffs', () => {
      const state = new GameState();
      state.miners['astral-recruit'] = 1;
      state.equipBestMiners();
      const baseRiftDps = state.getRiftSquadEffectiveDps();
      const baseTap = state.getTapDamage(Date.now(), false);

      state.chargeOverclock(100);
      expect(state.isOverclockActive()).toBe(true);
      expect(state.getTapDamage()).toBeGreaterThan(baseTap);
      expect(state.getTapDamage(Date.now(), false)).toBe(baseTap);
      expect(state.getRiftSquadEffectiveDps()).toBe(baseRiftDps);

      const openMs = new Date(2026, 10, 25, 14, 5, 0).getTime();
      expect(state.startRiftBattle(openMs)).toBe(true);
      const strike = state.applyRiftSquadStrike(0, 1, false, () => 0.99);
      const unboostedUnitDmg = state.getPlotUnitStats(0, Date.now(), false)!.dmg;
      expect(strike.dmgDealt).toBe(unboostedUnitDmg);
    });
  });
});
