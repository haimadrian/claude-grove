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
  // Stop at any .git entry. If it's a directory, this is a main repo — add it.
  // If it's a file, this is a linked worktree — don't add (git worktree list handles it),
  // but still stop descending so we don't spam depth-limit warnings inside worktrees.
  const gitEntry = entries.find((e) => e.name === '.git');
  if (gitEntry) {
    if (gitEntry.isDirectory()) repos.push(dir);
    return;
  }
  // recurse into non-hidden, non-node_modules subdirs
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    await walk(path.join(dir, e.name), depth + 1, repos);
  }
}
