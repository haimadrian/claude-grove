export interface ParsedSession {
  sessionId: string;
  launchDir: string | null;
  lastActivity: string | null;
  title: string | null;
  pathHits: Record<string, number>;
}

const PATH_RE = /\/[^\s"'`]+/g;

export function parseSessionContent(content: string, sessionIdFallback: string, worktreePaths: string[]): ParsedSession {
  let sessionId = sessionIdFallback, launchDir: string | null = null;
  let lastActivity: string | null = null, title: string | null = null;
  const pathHits: Record<string, number> = {};
  for (const p of worktreePaths) pathHits[p] = 0;

  for (const line of content.split('\n')) {
    if (!line) continue;
    // tally raw occurrences regardless of JSON validity
    const matches = line.match(PATH_RE);
    if (matches) {
      for (const m of matches) {
        for (const wt of worktreePaths) {
          if (m === wt || m.startsWith(wt + '/')) pathHits[wt] = (pathHits[wt] ?? 0) + 1;
        }
      }
    }
    let obj: Record<string, unknown>;
    try { obj = JSON.parse(line); } catch { continue; }
    if (typeof obj.sessionId === 'string') sessionId = obj.sessionId;
    if (typeof obj.cwd === 'string' && !launchDir) launchDir = obj.cwd;
    if (typeof obj.timestamp === 'string' && (!lastActivity || obj.timestamp > lastActivity)) lastActivity = obj.timestamp;
    if (!title && typeof obj.aiTitle === 'string') title = obj.aiTitle;
  }
  return { sessionId, launchDir, lastActivity, title, pathHits };
}
