import { resolve, sep } from 'node:path';

export function isPathWithinRoots(target: string, roots: string[]): boolean {
  const t = resolve(target);
  return roots.some((r) => {
    const root = resolve(r);
    return t === root || t.startsWith(root + sep);
  });
}

export function isValidBranchName(name: string): boolean {
  return /^[A-Za-z0-9._\-/]+$/.test(name);
}
