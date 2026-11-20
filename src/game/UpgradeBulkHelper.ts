export type UpgradeBuyMode = '1' | '10' | 'max';

export interface BulkUpgradePlan {
  levels: number;
  totalCost: number;
  targetLevel: number;
}

export function getPlotStatUpgradeCost(
  stat: 'dmg' | 'speed' | 'mining',
  level: number,
  upgradeCostMult: number
): number {
  const safeLvl = Math.max(1, Math.floor(level));
  if (stat === 'dmg') return Math.round(50 * Math.pow(1.32, safeLvl - 1) * upgradeCostMult);
  if (stat === 'speed') return Math.round(75 * Math.pow(1.42, safeLvl - 1) * upgradeCostMult);
  return Math.round(90 * Math.pow(1.45, safeLvl - 1) * upgradeCostMult);
}

export function computeBulkUpgradePlan(opts: {
  currentLevel: number;
  maxLevel: number;
  currency: number;
  mode: UpgradeBuyMode;
  costAtLevel: (level: number) => number;
}): BulkUpgradePlan {
  const { currentLevel, maxLevel, currency, mode, costAtLevel } = opts;
  if (currentLevel >= maxLevel) {
    return { levels: 0, totalCost: 0, targetLevel: currentLevel };
  }
  const desired = mode === '1' ? 1 : mode === '10' ? 10 : maxLevel - currentLevel;
  const maxSteps = Math.min(desired, maxLevel - currentLevel);

  let levels = 0;
  let totalCost = 0;
  for (let i = 0; i < maxSteps; i++) {
    const stepCost = costAtLevel(currentLevel + i);
    if (currency >= totalCost + stepCost) {
      totalCost += stepCost;
      levels += 1;
    } else {
      break;
    }
  }
  if (levels === 0) {
    return { levels: 0, totalCost: costAtLevel(currentLevel), targetLevel: currentLevel };
  }
  return { levels, totalCost, targetLevel: currentLevel + levels };
}
