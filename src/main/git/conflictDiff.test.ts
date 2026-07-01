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
});
