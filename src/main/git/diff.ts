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

export interface WorkingFile {
  path: string;       // relative file path
  status: string;     // short status like 'M', 'A', 'D', '??', 'MM'
  label: string;      // human-readable: 'modified', 'added', 'deleted', 'untracked'
}

export async function listWorkingFiles(worktreePath: string, runner: Runner = git): Promise<WorkingFile[]> {
  const result = await runner.run(['-C', worktreePath, 'status', '--porcelain']);
  if (result.code !== 0 || !result.stdout.trim()) return [];
  return result.stdout.split('\n').filter((l) => l.length >= 4).map((line) => {
    const xy = line.slice(0, 2);
    const filePath = line.slice(3).trim().replace(/^"(.*)"$/, '$1'); // strip git quoting
    const label = xy === '??' ? 'untracked'
      : xy.includes('D') ? 'deleted'
      : xy.includes('A') ? 'added'
      : 'modified';
    return { path: filePath, status: xy, label };
  });
}

export async function workingFileDiff(worktreePath: string, filePath: string, runner: Runner = git): Promise<string> {
  // For tracked files: diff HEAD vs working tree
  const result = await runner.run(['-C', worktreePath, 'diff', 'HEAD', '--no-color', '--', filePath]);
  if (result.code === 0 && result.stdout.trim()) return result.stdout;
  // For staged-only (new file staged): diff --cached
  const staged = await runner.run(['-C', worktreePath, 'diff', '--cached', '--no-color', '--', filePath]);
  if (staged.code === 0 && staged.stdout.trim()) return staged.stdout;
  // For untracked files: show full content as new file via --no-index
  const abs = filePath.startsWith('/') ? filePath : `${worktreePath}/${filePath}`;
  const noIndex = await runner.run(['-C', worktreePath, 'diff', '--no-color', '--no-index', '--', '/dev/null', abs]);
  // git diff --no-index returns exit code 1 when files differ (which is always for new files) - that's OK
  return noIndex.stdout;
}
