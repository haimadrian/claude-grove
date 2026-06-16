import { describe, it, expect } from 'vitest';
import { normalizeRemote } from './remoteUrl';

describe('normalizeRemote', () => {
  it('converts ssh scp-style github to https and ownerRepo', () => {
    expect(normalizeRemote('git@github.com:owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('converts ssh:// form', () => {
    expect(normalizeRemote('ssh://git@github.com/owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('strips .git from https form', () => {
    expect(normalizeRemote('https://github.com/owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('passes through clean https form', () => {
    expect(normalizeRemote('https://github.com/owner/repo')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('non-github host yields browseUrl but null ownerRepo', () => {
    expect(normalizeRemote('git@gitlab.com:grp/proj.git')).toEqual({
      browseUrl: 'https://gitlab.com/grp/proj', ownerRepo: null,
    });
  });
  it('empty input yields nulls', () => {
    expect(normalizeRemote('')).toEqual({ browseUrl: null, ownerRepo: null });
  });
});
