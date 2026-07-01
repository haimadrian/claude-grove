import { describe, it, expect } from 'vitest';
import { parseUnmergedFiles } from './mergeStatus';

describe('parseUnmergedFiles', () => {
  it('extracts paths with unmerged status codes', () => {
    const porcelain = [
      'UU src/session/cache.ts',
      'M  src/other/clean.ts',
      'AA src/new/both-added.ts',
      '?? src/untracked.ts',
    ].join('\n');
    expect(parseUnmergedFiles(porcelain)).toEqual(['src/session/cache.ts', 'src/new/both-added.ts']);
  });

  it('returns empty array when nothing is unmerged', () => {
    expect(parseUnmergedFiles('M  clean.ts\n?? new.ts')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(parseUnmergedFiles('')).toEqual([]);
  });
});
