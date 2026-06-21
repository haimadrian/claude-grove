import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'claude-grove:labels';
const SYNC_EVENT = 'claude-grove:labels-changed';

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, string>; }
  catch { return {}; }
}

function save(labels: Record<string, string>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(labels)); } catch { /* ignore */ }
}

export function useLabels(): {
  labels: Record<string, string>;
  setLabel: (paths: string[], label: string) => void;
  clearLabel: (paths: string[]) => void;
} {
  const [labels, setLabels] = useState<Record<string, string>>(load);

  // Re-read from localStorage whenever another useLabels instance writes
  useEffect(() => {
    const handler = (): void => setLabels(load());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const setLabel = useCallback((paths: string[], label: string): void => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const p of paths) {
        if (label.trim()) next[p] = label.trim();
        else delete next[p];
      }
      save(next);
      return next;
    });
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const clearLabel = useCallback((paths: string[]): void => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const p of paths) delete next[p];
      save(next);
      return next;
    });
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  return { labels, setLabel, clearLabel };
}
