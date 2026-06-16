export interface ParsedWorktree {
  path: string; headSha: string; branch: string | null;
  isMainWorktree: boolean; isDetached: boolean; isBare: boolean;
  isLocked: boolean; lockedReason: string | null;
  isPrunable: boolean; prunableReason: string | null;
}

export function parseWorktreePorcelain(stdout: string, repoRoot: string): ParsedWorktree[] {
  const records: ParsedWorktree[] = [];
  let cur: Partial<ParsedWorktree> | null = null;
  const push = (): void => {
    if (!cur || !cur.path) return;
    records.push({
      path: cur.path, headSha: cur.headSha ?? '', branch: cur.branch ?? null,
      isMainWorktree: cur.path === repoRoot, isDetached: cur.isDetached ?? false,
      isBare: cur.isBare ?? false, isLocked: cur.isLocked ?? false,
      lockedReason: cur.lockedReason ?? null, isPrunable: cur.isPrunable ?? false,
      prunableReason: cur.prunableReason ?? null,
    });
  };
  for (const line of stdout.split('\n')) {
    if (line === '') { push(); cur = null; continue; }
    if (line.startsWith('worktree ')) { cur = { path: line.slice(9) }; continue; }
    if (!cur) continue;
    if (line.startsWith('HEAD ')) cur.headSha = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (line === 'detached') cur.isDetached = true;
    else if (line === 'bare') cur.isBare = true;
    else if (line === 'locked' || line.startsWith('locked ')) {
      cur.isLocked = true; cur.lockedReason = line.length > 6 ? line.slice(7) : null;
    } else if (line === 'prunable' || line.startsWith('prunable ')) {
      cur.isPrunable = true; cur.prunableReason = line.length > 8 ? line.slice(9) : null;
    }
  }
  push();
  return records;
}
