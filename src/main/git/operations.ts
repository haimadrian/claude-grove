import path from 'node:path';
import type { OpResult, SyncAction } from '../../shared/types';
import type { Runner } from './gitRunner';
import { git } from './gitRunner';
import { isValidBranchName } from '../security/validate';
import { resolveBaseBranch } from './baseBranch';

function ok(message: string): OpResult { return { success: true, message }; }
function fail(message: string, stderr?: string): OpResult {
  return stderr !== undefined ? { success: false, message, stderr } : { success: false, message };
}

export async function removeWorktree(
  worktreePath: string,
  repoRoot: string,
  opts: { force: boolean; deleteLocalBranch: boolean; branch: string | null },
  runner: Runner = git
): Promise<OpResult> {
  const args = ['-C', repoRoot, 'worktree', 'remove', worktreePath];
  if (opts.force) args.push('--force');
  const result = await runner.run(args);
  if (result.code !== 0) return fail(`Failed to remove worktree`, result.stderr);

  if (opts.deleteLocalBranch && opts.branch) {
    if (!isValidBranchName(opts.branch)) return fail(`Invalid branch name: ${opts.branch}`);
    const del = await runner.run(['-C', repoRoot, 'branch', '-D', opts.branch]);
    if (del.code !== 0) return fail(`Worktree removed but branch deletion failed`, del.stderr);
  }
  return ok(`Removed worktree ${path.basename(worktreePath)}`);
}

export async function deleteRemoteBranch(
  worktreePath: string,
  branch: string | null,
  runner: Runner = git
): Promise<OpResult> {
  if (!branch) return fail('No branch to delete');
  if (!isValidBranchName(branch)) return fail(`Invalid branch name: ${branch}`);
  const result = await runner.run(['-C', worktreePath, 'push', 'origin', '--delete', branch]);
  if (result.code !== 0) return fail(`Failed to delete remote branch`, result.stderr);
  return ok(`Deleted remote branch ${branch}`);
}

export async function createWorktree(
  input: { repoPath: string; branch: string; base: string },
  newWorktreeParentDir: string | null,
  runner: Runner = git
): Promise<OpResult> {
  if (!isValidBranchName(input.branch)) return fail(`Invalid branch name: ${input.branch}`);
  const parentDir = newWorktreeParentDir ?? path.join(input.repoPath, 'worktrees');
  const branchLeaf = input.branch.replace(/\//g, '-');
  const targetDir = path.join(parentDir, branchLeaf);

  const fetch = await runner.run(['-C', input.repoPath, 'fetch', 'origin']);
  if (fetch.code !== 0) return fail('Failed to fetch origin', fetch.stderr);

  const result = await runner.run(['-C', input.repoPath, 'worktree', 'add', '-b', input.branch, targetDir, input.base]);
  if (result.code !== 0) return fail('Failed to create worktree', result.stderr);
  return ok(`Created worktree at ${targetDir}`);
}

export async function syncWorktree(
  worktreePath: string,
  action: SyncAction,
  defaultBaseBranch: string,
  runner: Runner = git
): Promise<OpResult> {
  if (action === 'fetch') {
    const result = await runner.run(['-C', worktreePath, 'fetch', '--all', '--prune']);
    return result.code === 0 ? ok('Fetched all remotes') : fail('Fetch failed', result.stderr);
  }
  if (action === 'pull') {
    const result = await runner.run(['-C', worktreePath, 'pull']);
    return result.code === 0 ? ok('Pulled latest') : fail('Pull failed', result.stderr);
  }
  if (action === 'mergeBase') {
    const base = await resolveBaseBranch(worktreePath, { pr: null, defaultBaseBranch, runner });
    const result = await runner.run(['-C', worktreePath, 'merge', base]);
    return result.code === 0 ? ok(`Merged ${base}`) : fail(`Merge conflict or failure`, result.stderr);
  }
  if (action === 'prune') {
    const result = await runner.run(['-C', worktreePath, 'worktree', 'prune']);
    return result.code === 0 ? ok('Pruned stale worktrees') : fail('Prune failed', result.stderr);
  }
  return fail(`Unknown sync action: ${action as string}`);
}
