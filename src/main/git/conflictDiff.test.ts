import { describe, it, expect } from 'vitest';
import { computeSideDiff } from './conflictDiff';

describe('computeSideDiff', () => {
  it('marks unchanged lines as context', () => {
    expect(computeSideDiff(['a', 'b'], ['a', 'b'])).toEqual([
      { type: 'context', text: 'a' },
      { type: 'context', text: 'b' },
    ]);
  });

  it('marks an added line', () => {
    expect(computeSideDiff(['a'], ['a', 'b'])).toEqual([
      { type: 'context', text: 'a' },
      { type: 'add', text: 'b' },
    ]);
  });

  it('marks a removed line', () => {
    expect(computeSideDiff(['a', 'b'], ['a'])).toEqual([
      { type: 'context', text: 'a' },
      { type: 'del', text: 'b' },
    ]);
  });

  it('handles an empty base (pure addition)', () => {
    expect(computeSideDiff([], ['new line'])).toEqual([
      { type: 'add', text: 'new line' },
    ]);
  });

  it('preserves a genuine leading blank line when base is empty', () => {
    // Regression: a blank first line in `side` reads identically to the boundary artifact a
    // naive join-and-append-newline diff strategy introduces, and can get silently dropped.
    expect(computeSideDiff([], ['', 'new line'])).toEqual([
      { type: 'add', text: '' },
      { type: 'add', text: 'new line' },
    ]);
  });
});
