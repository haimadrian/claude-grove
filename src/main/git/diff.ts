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
  const result = await runner.run([
    '-C', worktreePath, 'show', sha, '--no-color', '--format=', '--patch',
  ]);
  return result.stdout;
}

export async function fullDiff(worktreePath: string, base: string, runner: Runner = git): Promise<string> {
  const result = await runner.run([
    '-C', worktreePath, 'diff', '--no-color', `${base}...HEAD`,
  ]);
  return result.stdout;
}
