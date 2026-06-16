import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logger';

const MAX_DEPTH = 5;

export async function scanRepos(roots: string[]): Promise<string[]> {
  const repos: string[] = [];
  for (const root of roots) {
    await walk(root, 0, repos);
  }
  return repos;
}

async function walk(dir: string, depth: number, repos: string[]): Promise<void> {
  if (depth > MAX_DEPTH) {
    logger.warn(`repoScanner: max depth ${MAX_DEPTH} reached at ${dir}`);
    return;
  }
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // Intentionally no isDirectory() guard: linked worktrees use a .git FILE, not a dir.
  const hasGit = entries.some((e) => e.name === '.git');
  if (hasGit) {
    repos.push(dir);
    return; // don't descend into repos
  }
  // recurse into non-hidden, non-node_modules subdirs
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    await walk(path.join(dir, e.name), depth + 1, repos);
  }
}
