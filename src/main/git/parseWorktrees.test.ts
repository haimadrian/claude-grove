import { describe, it, expect } from 'vitest';
import { parseWorktreePorcelain } from './parseWorktrees';

const SAMPLE = [
  'worktree /repo',
  'HEAD 1111111111111111111111111111111111111111',
  'branch refs/heads/main',
  '',
  'worktree /repo/worktrees/feat',
  'HEAD 2222222222222222222222222222222222222222',
  'branch refs/heads/feature',
  'locked needs review',
  'prunable gitdir missing',
  '',
  'worktree /repo/worktrees/detached',
  'HEAD 3333333333333333333333333333333333333333',
  'detached',
  '',
].join('\n');

describe('parseWorktreePorcelain', () => {
  const r = parseWorktreePorcelain(SAMPLE, '/repo');
  it('parses three records', () => expect(r).toHaveLength(3));
  it('marks the main worktree', () => {
    expect(r[0]).toMatchObject({ path: '/repo', branch: 'main', isMainWorktree: true, isDetached: false });
  });
  it('parses branch, locked, prunable on linked worktree', () => {
    expect(r[1]).toMatchObject({
      path: '/repo/worktrees/feat', branch: 'feature', isMainWorktree: false,
      isLocked: true, lockedReason: 'needs review', isPrunable: true, prunableReason: 'gitdir missing',
    });
  });
  it('handles detached head', () => {
    expect(r[2]).toMatchObject({ branch: null, isDetached: true, headSha: '3333333333333333333333333333333333333333' });
  });
});
