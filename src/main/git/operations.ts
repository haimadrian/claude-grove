import fs from 'node:fs/promises';
import path from 'node:path';
import type { OpResult, SyncAction } from '../../shared/types';
import type { Runner } from './gitRunner';
import { git } from './gitRunner';
import { isValidBranchName } from '../security/validate';
import { resolveBaseBranch } from './baseBranch';
import { parseUnmergedFiles } from './mergeStatus';
import { logger } from '../logger';

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

export async function renameBranch(
  worktreePath: string,
  repoRoot: string,
  oldBranch: string,
  newBranch: string,
  hasUpstream: boolean,
  runner: Runner = git
): Promise<OpResult> {
  if (!isValidBranchName(newBranch)) return fail(`Invalid branch name: ${newBranch}`);

  // 1. Rename locally
  const local = await runner.run(['-C', worktreePath, 'branch', '-m', oldBranch, newBranch]);
  if (local.code !== 0) {
    logger.error(`operations: rename local failed: ${local.stderr}`);
    return fail('Failed to rename local branch', local.stderr);
  }
  logger.info(`operations: renamed local branch ${oldBranch} -> ${newBranch}`);

  // 2. Push new branch and set upstream
  const push = await runner.run(['-C', worktreePath, 'push', 'origin', '-u', newBranch]);
  if (push.code !== 0) {
    logger.warn(`operations: push new branch failed: ${push.stderr}`);
    return { success: true, message: `Renamed locally to ${newBranch}. Remote push failed: ${push.stderr}` };
  }

  // 3. Delete old remote branch (only if it had an upstream — i.e. existed on remote)
  if (hasUpstream) {
    const del = await runner.run(['-C', worktreePath, 'push', 'origin', '--delete', oldBranch]);
    if (del.code !== 0) {
      logger.warn(`operations: delete old remote branch failed: ${del.stderr}`);
      return { success: true, message: `Renamed to ${newBranch} and pushed. Old remote branch deletion failed: ${del.stderr}` };
    }
  }

  return ok(`Branch renamed to ${newBranch}`);
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

export async function rollbackFile(
  worktreePath: string,
  filePath: string,
  status: string,
  runner: Runner = git
): Promise<OpResult> {
  // Untracked files: git clean -f
  if (status === '??') {
    const abs = filePath.startsWith('/') ? filePath : `${worktreePath}/${filePath}`;
    const result = await runner.run(['-C', worktreePath, 'clean', '-f', '--', abs]);
    if (result.code !== 0) return fail(`Failed to remove untracked file`, result.stderr);
    return ok(`Removed untracked file ${filePath}`);
  }
  // Staged changes: reset first
  if (status[0] !== ' ' && status[0] !== '?') {
    await runner.run(['-C', worktreePath, 'reset', 'HEAD', '--', filePath]);
  }
  // Checkout from HEAD to discard changes
  const checkout = await runner.run(['-C', worktreePath, 'checkout', 'HEAD', '--', filePath]);
  if (checkout.code !== 0) return fail(`Failed to rollback file`, checkout.stderr);
  return ok(`Rolled back ${filePath}`);
}

export async function commitFiles(
  worktreePath: string,
  files: string[],
  message: string,
  runner: Runner = git
): Promise<OpResult> {
  if (!files.length) return fail('No files selected');
  if (!message.trim()) return fail('Commit message is required');
  // Stage the selected files
  const add = await runner.run(['-C', worktreePath, 'add', '--', ...files]);
  if (add.code !== 0) {
    logger.error(`operations: git add failed: ${add.stderr}`);
    return fail('Failed to stage files', add.stderr);
  }
  // Commit
  const commit = await runner.run(['-C', worktreePath, 'commit', '-m', message.trim()]);
  if (commit.code !== 0) {
    logger.error(`operations: git commit failed: ${commit.stderr}`);
    return fail('Commit failed', commit.stderr);
  }
  return ok(`Committed ${files.length} file${files.length !== 1 ? 's' : ''}`);
}

export async function mergeFrom(
  worktreePath: string,
  branch: string,
  runner: Runner = git
): Promise<OpResult & { conflictedFiles: string[] | null }> {
  if (!isValidBranchName(branch)) return { success: false, message: `Invalid branch name: ${branch}`, conflictedFiles: null };
  const result = await runner.run(['-C', worktreePath, '-c', 'merge.conflictStyle=diff3', 'merge', branch]);
  if (result.code === 0) return { success: true, message: `Merged ${branch}`, conflictedFiles: null };

  const status = await runner.run(['-C', worktreePath, 'status', '--porcelain']);
  const conflicted = parseUnmergedFiles(status.stdout);
  if (conflicted.length > 0) {
    logger.info(`operations: merge of ${branch} into ${worktreePath} has ${conflicted.length} conflicted files`);
    return {
      success: false,
      message: `Merge has ${conflicted.length} conflicted file${conflicted.length !== 1 ? 's' : ''}`,
      conflictedFiles: conflicted,
    };
  }
  logger.error(`operations: merge of ${branch} into ${worktreePath} failed: ${result.stderr}`);
  return { success: false, message: 'Merge failed', stderr: result.stderr, conflictedFiles: null };
}

export async function listConflictedFiles(worktreePath: string, runner: Runner = git): Promise<string[]> {
  const status = await runner.run(['-C', worktreePath, 'status', '--porcelain']);
  return parseUnmergedFiles(status.stdout);
}

export async function applyFileResolution(
  worktreePath: string,
  filePath: string,
  resolvedContent: string,
  runner: Runner = git
): Promise<OpResult> {
  const abs = path.join(worktreePath, filePath);
  try {
    await fs.writeFile(abs, resolvedContent, 'utf-8');
  } catch (e) {
    return fail(`Failed to write ${filePath}`, String(e));
  }
  const add = await runner.run(['-C', worktreePath, 'add', '--', filePath]);
  if (add.code !== 0) return fail(`Failed to stage ${filePath}`, add.stderr);
  return ok(`Resolved ${filePath}`);
}

export async function finishMerge(worktreePath: string, runner: Runner = git): Promise<OpResult> {
  const result = await runner.run(['-C', worktreePath, 'commit', '--no-edit']);
  return result.code === 0 ? ok('Merge completed') : fail('Failed to finish merge', result.stderr);
}

export async function abortMerge(worktreePath: string, runner: Runner = git): Promise<OpResult> {
  const result = await runner.run(['-C', worktreePath, 'merge', '--abort']);
  return result.code === 0 ? ok('Merge aborted') : fail('Failed to abort merge', result.stderr);
}
