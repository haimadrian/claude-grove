import { describe, it, expect } from 'vitest';
import { parseCommits } from './parseCommits';
const US = '\x1f';

describe('parseCommits', () => {
  it('parses rows with subjects containing spaces', () => {
    const out = [
      ['aaa', 'aaa1', 'Jane Doe', '2026-06-16T10:00:00+03:00', 'fix: handle empty diff'].join(US),
      ['bbb', 'bbb1', 'Jane Doe', '2026-06-15T09:00:00+03:00', 'feat: add table, sort & filter'].join(US),
    ].join('\n');
    expect(parseCommits(out)).toEqual([
      { sha: 'aaa', shortSha: 'aaa1', author: 'Jane Doe', date: '2026-06-16T10:00:00+03:00', subject: 'fix: handle empty diff' },
      { sha: 'bbb', shortSha: 'bbb1', author: 'Jane Doe', date: '2026-06-15T09:00:00+03:00', subject: 'feat: add table, sort & filter' },
    ]);
  });
  it('empty output -> empty array', () => expect(parseCommits('')).toEqual([]));
});
