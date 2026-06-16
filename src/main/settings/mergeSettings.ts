import type { Settings } from '../../shared/types';

export function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch, version: 1 };
}
