import path from 'node:path';
import type { WorktreeRow, RepoRef } from '../../shared/types';
import type { Runner } from './gitRunner';
import { git } from './gitRunner';
import { parseWorktreePorcelain } from './parseWorktrees';
import { parseUpstream } from './parseUpstream';
import { normalizeRemote } from './remoteUrl';

async function getRepoRef(repoRoot: string, runner: Runner): Promise<RepoRef> {
  const remoteResult = await runner.run(['-C', repoRoot, 'remote', 'get-url', 'origin']);
  let rawUrl = remoteResult.stdout.trim();
  if (!rawUrl) {
    // fallback to first remote
    const remotes = await runner.run(['-C', repoRoot, 'remote']);
    const first = remotes.stdout.trim().split('\n')[0]?.trim() ?? '';
    if (first) {
      const u = await runner.run(['-C', repoRoot, 'remote', 'get-url', first]);
      rawUrl = u.stdout.trim();
    }
  }
  const { browseUrl, ownerRepo } = normalizeRemote(rawUrl);
  return {
    name: path.basename(repoRoot),
    path: repoRoot,
    remoteUrl: browseUrl,
    ownerRepo,
  };
}

async function enrichWorktree(
  wt: ReturnType<typeof parseWorktreePorcelain>[number],
  repo: RepoRef,
  runner: Runner
): Promise<WorktreeRow> {
  // dirty check
  const statusResult = await runner.run(['-C', wt.path, 'status', '--porcelain']);
  const isDirty = statusResult.stdout.trim().length > 0;

  // upstream info
  let upstream: string | null = null, ahead = 0, behind = 0, upstreamGone = false;
  if (wt.branch && !wt.isDetached) {
    const ref = await runner.run([
      '-C', wt.path, 'for-each-ref',
      '--format=%(upstream:short)\t%(upstream:track)',
      `refs/heads/${wt.branch}`,
    ]);
    const line = ref.stdout.trim();
    if (line) {
      const parsed = parseUpstream(line);
      upstream = parsed.upstream;
      ahead = parsed.ahead;
      behind = parsed.behind;
      upstreamGone = parsed.upstreamGone;
    }
  }

  // last commit
  const logResult = await runner.run(['-C', wt.path, 'log', '-1', '--format=%cI\x1f%s']);
  const [lastCommitDate = '', lastCommitSubject = ''] = logResult.stdout.trim().split('\x1f');

  return {
    id: wt.path,
    repo,
    path: wt.path,
    branch: wt.branch,
    isMainWorktree: wt.isMainWorktree,
    headSha: wt.headSha,
    isDetached: wt.isDetached,
    isBare: wt.isBare,
    isLocked: wt.isLocked,
    lockedReason: wt.lockedReason,
    isPrunable: wt.isPrunable,
    prunableReason: wt.prunableReason,
    isDirty,
    ahead,
    behind,
    upstream,
    upstreamGone,
    lastCommitDate,
    lastCommitSubject,
    sessions: [],
    pr: null,
  };
}

export async function listWorktrees(repoRoot: string, runner: Runner = git): Promise<WorktreeRow[]> {
  const result = await runner.run(['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  if (result.code !== 0) return [];
  const parsed = parseWorktreePorcelain(result.stdout, repoRoot);
  const repo = await getRepoRef(repoRoot, runner);
  return Promise.all(parsed.map((wt) => enrichWorktree(wt, repo, runner)));
}

export async function listAllWorktrees(repoRoots: string[], runner: Runner = git): Promise<WorktreeRow[]> {
  const arrays = await Promise.all(repoRoots.map((r) => listWorktrees(r, runner)));
  return arrays.flat();
}
