const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'Ud',
  'Dd',
  'Td',
  'Qad',
  'Qid',
  'Sxd',
] as const;

export function fmtShort(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 1000) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(value) / 3));
  const scaled = value / Math.pow(1000, tier);
  const formatted = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '');
  return `${formatted}${SUFFIXES[tier]}`;
}

export function fmtMoney(value: number): string {
  return `$${fmtShort(value)}`;
}

export function fmtInt(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('en-US');
}

export function fmtPct(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}
