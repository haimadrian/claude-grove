import { describe, it, expect } from 'vitest';
import { parseBranchList } from './listBranches';

describe('parseBranchList', () => {
  it('parses local and remote branches, strips HEAD pointer, dedupes and sorts', () => {
    const raw = [
      '  main',
      '* feature/foo',
      '  remotes/origin/main',
      '  remotes/origin/HEAD -> origin/main',
      '  remotes/origin/feature/foo',
      '  remotes/origin/bar',
    ].join('\n');
    expect(parseBranchList(raw)).toEqual([
      'feature/foo',
      'main',
      'origin/bar',
      'origin/feature/foo',
      'origin/main',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseBranchList('')).toEqual([]);
  });
});
