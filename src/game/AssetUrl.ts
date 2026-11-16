/**
 * Resolves public asset paths against Vite's BASE_URL so relative `./` builds
 * work cleanly at root domains, GitHub Pages subpaths, and CrazyGames.
 */
export function assetUrl(path: string): string {
  if (!path || /^(https?:|data:|blob:|\.)/i.test(path)) return path;
  const clean = path.replace(/^\/+/, '');
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
  const normBase = base.endsWith('/') ? base : `${base}/`;
  return `${normBase}${clean}`;
}
