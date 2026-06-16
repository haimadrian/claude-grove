import { describe, it, expect } from 'vitest';
import { isPathWithinRoots, isValidBranchName } from './validate';

describe('isPathWithinRoots', () => {
  const roots = ['/Users/me/git'];
  it('accepts a path inside a root', () => expect(isPathWithinRoots('/Users/me/git/repo/wt', roots)).toBe(true));
  it('accepts the root itself', () => expect(isPathWithinRoots('/Users/me/git', roots)).toBe(true));
  it('rejects a path outside roots', () => expect(isPathWithinRoots('/etc/passwd', roots)).toBe(false));
  it('rejects a sibling-prefix trick', () => expect(isPathWithinRoots('/Users/me/git-evil', roots)).toBe(false));
});

describe('isValidBranchName', () => {
  it('accepts normal names', () => expect(isValidBranchName('t2a/2026-06/feat_1.2')).toBe(true));
  it('rejects shell metachars', () => expect(isValidBranchName('feat; rm -rf /')).toBe(false));
  it('rejects empty', () => expect(isValidBranchName('')).toBe(false));
});
