const UNMERGED_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);

export function parseUnmergedFiles(porcelain: string): string[] {
  return porcelain
    .split('\n')
    .filter((line) => line.length >= 3 && UNMERGED_CODES.has(line.slice(0, 2)))
    .map((line) => line.slice(3).trim());
}
