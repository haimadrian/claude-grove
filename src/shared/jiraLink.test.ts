import { describe, it, expect } from 'vitest';
import { extractJiraId } from './jiraLink';

describe('extractJiraId', () => {
  it('extracts and uppercases a lowercase project-prefixed id', () => {
    expect(extractJiraId('t2a-3131')).toBe('T2A-3131');
  });
  it('extracts an id embedded in a longer branch name', () => {
    expect(extractJiraId('feature/eco-2120-fix-thing')).toBe('ECO-2120');
  });
  it('returns null when no id is present', () => {
    expect(extractJiraId('main')).toBeNull();
  });
  it('returns null for a null branch', () => {
    expect(extractJiraId(null)).toBeNull();
  });
  it('picks the first match when multiple are present', () => {
    expect(extractJiraId('t2a-1-vs-eco-2')).toBe('T2A-1');
  });
});
