import { describe, it, expect } from 'vitest';
import { parseUpstream } from './parseUpstream';

describe('parseUpstream', () => {
  it('parses ahead only', () =>
    expect(parseUpstream('origin/feat\t[ahead 2]')).toEqual({ upstream: 'origin/feat', ahead: 2, behind: 0, upstreamGone: false }));
  it('parses behind only', () =>
    expect(parseUpstream('origin/feat\t[behind 3]')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 3, upstreamGone: false }));
  it('parses ahead and behind', () =>
    expect(parseUpstream('origin/feat\t[ahead 1, behind 4]')).toEqual({ upstream: 'origin/feat', ahead: 1, behind: 4, upstreamGone: false }));
  it('parses gone', () =>
    expect(parseUpstream('origin/feat\t[gone]')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 0, upstreamGone: true }));
  it('no upstream -> nulls', () =>
    expect(parseUpstream('\t')).toEqual({ upstream: null, ahead: 0, behind: 0, upstreamGone: false }));
  it('in sync (empty track)', () =>
    expect(parseUpstream('origin/feat\t')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 0, upstreamGone: false }));
});
