import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { Settings } from '../../shared/types';
import { DEFAULT_SETTINGS } from './defaults';
import { mergeSettings } from './mergeSettings';

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return mergeSettings(DEFAULT_SETTINGS, parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = mergeSettings(current, patch);
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
