import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { mergeSettings } from './mergeSettings';

describe('mergeSettings', () => {
  it('returns defaults for empty input', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, {});
    expect(s.theme).toBe('system');
    expect(s.roots).toEqual([]);
    expect(s.version).toBe(1);
    expect(s.prCacheTtlSeconds).toBe(60);
  });
  it('applies a partial patch', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, { theme: 'dark', roots: ['/x'] });
    expect(s.theme).toBe('dark');
    expect(s.roots).toEqual(['/x']);
    expect(s.editorCommand).toBe('code'); // untouched default
  });
});
