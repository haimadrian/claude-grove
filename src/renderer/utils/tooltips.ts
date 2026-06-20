import type { WorktreeRow, PrInfo } from '../../shared/types';

export function buildStateLines(w: WorktreeRow): string[] {
  const lines: string[] = [];
  if (w.isDirty) lines.push('dirty — uncommitted changes present');
  if (w.ahead > 0) lines.push(`↑${w.ahead} — ${w.ahead} commit${w.ahead !== 1 ? 's' : ''} ahead of upstream`);
  if (w.behind > 0) lines.push(`↓${w.behind} — ${w.behind} commit${w.behind !== 1 ? 's' : ''} behind upstream`);
  if (w.isLocked) lines.push(`locked${w.lockedReason ? ` — ${w.lockedReason}` : ''}`);
  if (w.isPrunable) lines.push(`prunable${w.prunableReason ? ` — ${w.prunableReason}` : ' — worktree can be pruned'}`);
  if (w.upstreamGone) lines.push('remote gone — upstream branch was deleted');
  else if (w.pr?.state === 'MERGED') lines.push('✓ merged — PR is merged on GitHub');
  return lines;
}

export function buildPrLines(pr: PrInfo): string[] {
  const lines: string[] = [];
  lines.push(`#${pr.number} — ${pr.isDraft ? 'draft ' : ''}${pr.state.toLowerCase()} pull request`);
  if (pr.title) lines.push(`Title: ${pr.title}`);
  if (pr.baseRefName) lines.push(`Target branch: ${pr.baseRefName}`);
  if (pr.checksState === 'PASSING') lines.push('✓ — all CI checks passing');
  else if (pr.checksState === 'FAILING') lines.push('✗ — one or more CI checks failing');
  else if (pr.checksState === 'PENDING') lines.push('○ — CI checks in progress');
  if (pr.reviewDecision === 'APPROVED') lines.push('✓rev — approved by reviewer(s)');
  else if (pr.reviewDecision === 'CHANGES_REQUESTED') lines.push('✗rev — reviewer requested changes');
  else if (pr.reviewDecision === 'REVIEW_REQUIRED') lines.push('review required — awaiting review');
  return lines;
}
