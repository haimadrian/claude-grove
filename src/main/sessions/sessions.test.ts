import { describe, it, expect } from 'vitest';
import { parseSessionContent } from './parseSession';
import { linkSessions } from './sessionLinker';
import type { WorktreeRow } from '../../shared/types';

const WT = '/Users/me/git/MainApp/worktrees/feat';
const OTHER = '/Users/me/git/MainApp/worktrees/other';

const jsonl = [
  JSON.stringify({ type: 'mode', sessionId: 'sess-1' }),
  JSON.stringify({ cwd: '/Users/me/git/MainApp', timestamp: '2026-06-16T08:00:00Z', aiTitle: 'Fix feat' }),
  JSON.stringify({ message: { content: `edited ${WT}/a.ts and ${WT}/b.ts` }, timestamp: '2026-06-16T09:00:00Z' }),
  JSON.stringify({ toolUseResult: { stdout: `ran in ${WT}` }, timestamp: '2026-06-16T09:30:00Z' }),
  'this is a malformed line {',
  JSON.stringify({ message: { content: `also touched ${OTHER}/c.ts` }, timestamp: '2026-06-16T09:40:00Z' }),
].join('\n');

describe('parseSessionContent', () => {
  const p = parseSessionContent(jsonl, 'sess-1', [WT, OTHER]);
  it('extracts launchDir from cwd', () => expect(p.launchDir).toBe('/Users/me/git/MainApp'));
  it('uses aiTitle as title', () => expect(p.title).toBe('Fix feat'));
  it('takes max timestamp as lastActivity', () => expect(p.lastActivity).toBe('2026-06-16T09:40:00Z'));
  it('skips malformed lines and tallies path hits', () => {
    expect(p.pathHits[WT]).toBe(3);   // WT appears 3 times across the file
    expect(p.pathHits[OTHER]).toBe(1);
  });
});

describe('linkSessions', () => {
  it('attaches sessions to the dominant worktree as primary', () => {
    const wts = [{ path: WT, sessions: [] } as unknown as WorktreeRow, { path: OTHER, sessions: [] } as unknown as WorktreeRow];
    const sessions = [parseSessionContent(jsonl, 'sess-1', [WT, OTHER])];
    linkSessions(wts, sessions);
    const wtFeat = wts[0]!;
    const wtOther = wts[1]!;
    const featLink = wtFeat.sessions[0]!;
    const otherLink = wtOther.sessions[0]!;
    expect(featLink).toMatchObject({ sessionId: 'sess-1', isPrimary: true });
    expect(featLink.matchCount).toBeGreaterThan(otherLink.matchCount);
  });
});
