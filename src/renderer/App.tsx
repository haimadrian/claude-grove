import React, { useState } from 'react';
import type { WorktreeRow } from '../shared/types';
import { ThemeProvider } from './theme/ThemeProvider';
import { WorktreeTable } from './components/WorktreeTable';
import { WorktreeDetail } from './components/WorktreeDetail';
import { GhMissingNotice } from './components/GhMissingNotice';
import { useSettings } from './hooks/useSettings';
import { useWorktrees } from './hooks/useWorktrees';

export function App(): React.JSX.Element {
  const { settings } = useSettings();
  const { worktrees, loading, refresh } = useWorktrees();
  const [ghInstalled, setGhInstalled] = useState<boolean | null>(null);
  const [ghAuthed, setGhAuthed] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<WorktreeRow | null>(null);

  React.useEffect(() => {
    window.api.gh.status().then((s) => {
      setGhInstalled(s.installed);
      setGhAuthed(s.authed);
    });
  }, []);

  const showGhNotice = ghInstalled === false || ghAuthed === false;

  return (
    <ThemeProvider setting={settings?.theme ?? 'system'}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Claude Grove</span>
          <button
            onClick={refresh}
            style={{
              marginLeft: 'auto', fontSize: 12, padding: '4px 10px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
            }}
          >
            Refresh
          </button>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {showGhNotice && <GhMissingNotice installed={ghInstalled ?? false} />}
          {selected ? (
            <WorktreeDetail worktree={selected} onBack={() => setSelected(null)} />
          ) : (
            <WorktreeTable worktrees={worktrees} loading={loading} onSelect={setSelected} />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
