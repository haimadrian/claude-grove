import type { WorktreeRow, SessionLink } from '../../shared/types';
import type { ParsedSession } from './parseSession';

export function linkSessions(worktrees: WorktreeRow[], sessions: (ParsedSession & { jsonlPath?: string })[]): void {
  for (const wt of worktrees) {
    const links: SessionLink[] = sessions
      .filter((s) => (s.pathHits[wt.path] ?? 0) > 0)
      .map((s) => ({
        sessionId: s.sessionId,
        jsonlPath: s.jsonlPath ?? '',
        launchDir: s.launchDir ?? '',
        lastActivity: s.lastActivity ?? '',
        title: s.title ?? null,
        matchCount: s.pathHits[wt.path] ?? 0,
        isPrimary: false,
      }))
      .sort((a, b) => b.matchCount - a.matchCount);
    if (links.length > 0) links[0]!.isPrimary = true;
    wt.sessions = links;
  }
}
