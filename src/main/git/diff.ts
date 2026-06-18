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

export async function commitDiff(worktreePath: string, sha: string, ignoreWhitespace = false, runner: Runner = git): Promise<string> {
  // Detect merge commits (sha^2 exists = has a second parent)
  const mergeCheck = await runner.run(['-C', worktreePath, 'rev-parse', '--verify', '--quiet', `${sha}^2`]);
  if (mergeCheck.code === 0) return '\x00MERGE\x00';

  const diffArgs = ['-C', worktreePath, 'diff', '--no-color'];
  if (ignoreWhitespace) diffArgs.push('-w');
  diffArgs.push(`${sha}^1`, sha);
  const result = await runner.run(diffArgs);
  if (result.code === 0 && result.stdout.trim()) return result.stdout;

  // Fallback for root commits
  const showArgs = ['-C', worktreePath, 'show', sha, '--no-color', '--format=', '--patch'];
  if (ignoreWhitespace) showArgs.push('-w');
  const fallback = await runner.run(showArgs);
  return fallback.stdout;
}

export async function fullDiff(worktreePath: string, base: string, ignoreWhitespace = false, runner: Runner = git): Promise<string> {
  const args = ['-C', worktreePath, 'diff', '--no-color'];
  if (ignoreWhitespace) args.push('-w');
  args.push(`${base}...HEAD`);
  const result = await runner.run(args);
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
