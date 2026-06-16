import { describe, it, expect } from 'vitest';
import { mapChecksState } from './mapChecks';

describe('mapChecksState', () => {
  it('empty -> NONE', () => expect(mapChecksState([])).toBe('NONE'));
  it('a failing conclusion -> FAILING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { status: 'COMPLETED', conclusion: 'FAILURE' }])).toBe('FAILING'));
  it('an in-progress check -> PENDING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { status: 'IN_PROGRESS', conclusion: null }])).toBe('PENDING'));
  it('all success -> PASSING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }])).toBe('PASSING'));
  it('state FAILURE counts as failing', () =>
    expect(mapChecksState([{ state: 'FAILURE' }])).toBe('FAILING'));
});
