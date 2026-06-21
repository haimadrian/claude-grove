import { useState, useCallback } from 'react';

const LS_KEY = 'claude-grove:labels';

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
  }, []);

  const clearLabel = useCallback((paths: string[]): void => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const p of paths) delete next[p];
      save(next);
      return next;
    });
  }, []);

  return { labels, setLabel, clearLabel };
}
