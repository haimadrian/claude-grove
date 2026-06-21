import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'claude-grove:labels';

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, string>; }
  catch { return {}; }
}

function save(labels: Record<string, string>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(labels)); } catch { /* ignore */ }
}

// Module-level singleton so all useLabels instances share the same state
// and notify each other on update — prevents stale state when both
// WorktreeCardGrid and WorktreeTable are mounted simultaneously.
let _current: Record<string, string> = load();
const _listeners = new Set<(labels: Record<string, string>) => void>();

function broadcast(next: Record<string, string>): void {
  _current = next;
  save(next);
  _listeners.forEach((fn) => fn(next));
}

export function useLabels(): {
  labels: Record<string, string>;
  setLabel: (paths: string[], label: string) => void;
  clearLabel: (paths: string[]) => void;
} {
  const [labels, setLabels] = useState<Record<string, string>>(_current);

  useEffect(() => {
    // Sync with latest singleton state on mount (handles tab-switch cases)
    setLabels(_current);
    _listeners.add(setLabels);
    return () => { _listeners.delete(setLabels); };
  }, []);

  const setLabel = useCallback((paths: string[], label: string): void => {
    const next = { ..._current };
    for (const p of paths) {
      if (label.trim()) next[p] = label.trim();
      else delete next[p];
    }
    broadcast(next);
  }, []);

  const clearLabel = useCallback((paths: string[]): void => {
    const next = { ..._current };
    for (const p of paths) delete next[p];
    broadcast(next);
  }, []);

  return { labels, setLabel, clearLabel };
}
