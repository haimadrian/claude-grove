import type { Commit } from '../../shared/types';
import type { Runner } from './gitRunner';
import { git } from './gitRunner';
import { parseCommits } from './parseCommits';

export async function listCommits(worktreePath: string, base: string, runner: Runner = git): Promise<Commit[]> {
  const result = await runner.run([
    '-C', worktreePath, 'log', `${base}..HEAD`,
    '--format=%H\x1f%h\x1f%an\x1f%cI\x1f%s',
  ]);
  if (result.code !== 0) return [];
  return parseCommits(result.stdout.trim());
}

export async function commitDiff(worktreePath: string, sha: string, runner: Runner = git): Promise<string> {
  // Use git diff parent..commit for a standard 2-way diff (works for merge commits too).
  // git show produces combined diff format for merges which react-diff-view cannot parse.
  const result = await runner.run(['-C', worktreePath, 'diff', '--no-color', `${sha}^1`, sha]);
  if (result.code === 0 && result.stdout.trim()) return result.stdout;
  // Fallback for root commits (no parent) or other edge cases
  const fallback = await runner.run(['-C', worktreePath, 'show', sha, '--no-color', '--format=', '--patch']);
  return fallback.stdout;
}

export async function fullDiff(worktreePath: string, base: string, runner: Runner = git): Promise<string> {
  const result = await runner.run([
    '-C', worktreePath, 'diff', '--no-color', `${base}...HEAD`,
  ]);
  return result.stdout;
}
