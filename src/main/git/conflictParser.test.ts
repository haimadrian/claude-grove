import { describe, it, expect } from 'vitest';
import { parseConflictBlocks } from './conflictParser';

describe('parseConflictBlocks', () => {
  it('returns a single context segment when there are no conflicts', () => {
    const content = 'line one\nline two\nline three';
    expect(parseConflictBlocks(content)).toEqual([
      { type: 'context', lines: ['line one', 'line two', 'line three'] },
    ]);
  });

  it('parses a single diff3-style conflict block with surrounding context', () => {
    const content = [
      'before',
      '<<<<<<< HEAD',
      'ours line',
      '|||||||  merged common ancestors',
      'base line',
      '=======',
      'theirs line',
      '>>>>>>> origin/main',
      'after',
    ].join('\n');
    expect(parseConflictBlocks(content)).toEqual([
      { type: 'context', lines: ['before'] },
      { type: 'conflict', ours: ['ours line'], base: ['base line'], theirs: ['theirs line'] },
      { type: 'context', lines: ['after'] },
    ]);
  });

  it('parses multiple conflict blocks in one file', () => {
    const content = [
      '<<<<<<< HEAD',
      'a-ours',
      '|||||||',
      'a-base',
      '=======',
      'a-theirs',
      '>>>>>>> origin/main',
      'middle',
      '<<<<<<< HEAD',
      'b-ours',
      '|||||||',
      'b-base',
      '=======',
      'b-theirs',
      '>>>>>>> origin/main',
    ].join('\n');
    expect(parseConflictBlocks(content)).toEqual([
      { type: 'conflict', ours: ['a-ours'], base: ['a-base'], theirs: ['a-theirs'] },
      { type: 'context', lines: ['middle'] },
      { type: 'conflict', ours: ['b-ours'], base: ['b-base'], theirs: ['b-theirs'] },
    ]);
  });

  it('handles multi-line sides within one conflict block', () => {
    const content = [
      '<<<<<<< HEAD',
      'ours 1',
      'ours 2',
      '|||||||',
      'base 1',
      '=======',
      'theirs 1',
      'theirs 2',
      'theirs 3',
      '>>>>>>> origin/main',
    ].join('\n');
    expect(parseConflictBlocks(content)).toEqual([
      { type: 'conflict', ours: ['ours 1', 'ours 2'], base: ['base 1'], theirs: ['theirs 1', 'theirs 2', 'theirs 3'] },
    ]);
  });
});
