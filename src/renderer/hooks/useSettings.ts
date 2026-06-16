import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../../shared/types';

export function useSettings(): { settings: Settings | null; updateSettings: (patch: Partial<Settings>) => Promise<void> } {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    window.api.settings.get().then(setSettings);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>): Promise<void> => {
    const updated = await window.api.settings.update(patch);
    setSettings(updated);
  }, []);

  return { settings, updateSettings };
}
