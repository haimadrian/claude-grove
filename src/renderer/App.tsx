import React, { useState } from 'react';
import type { WorktreeRow } from '../shared/types';
import { ThemeProvider } from './theme/ThemeProvider';
import { WorktreeTable } from './components/WorktreeTable';
import { WorktreeDetail } from './components/WorktreeDetail';
import { GhMissingNotice } from './components/GhMissingNotice';
import { SettingsPage } from './components/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { Toast, useToast } from './components/Toast';
import { AboutModal } from './components/AboutModal';
import { useSettings } from './hooks/useSettings';
import { useWorktrees } from './hooks/useWorktrees';

export function App(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const { worktrees, loading, refresh } = useWorktrees();
  const [ghInstalled, setGhInstalled] = useState<boolean | null>(null);
  const [ghAuthed, setGhAuthed] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<WorktreeRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { toast, showToast, clearToast } = useToast();


  React.useEffect(() => {
    window.api.gh.status().then((s) => {
      setGhInstalled(s.installed);
      setGhAuthed(s.authed);
    });
  }, []);

  const showGhNotice = ghInstalled === false || ghAuthed === false;
  const noRoots = settings !== null && settings.roots.length === 0;

  const addRoot = async (): Promise<void> => {
    const res = await window.api.dialog.pickDirectory();
    if (!res.canceled && res.filePaths[0] !== undefined) {
      await updateSettings({ roots: [...(settings?.roots ?? []), res.filePaths[0]] });
      refresh();
    }
  };

  if (settings === null) {
    return <ThemeProvider setting="system"><div style={{ padding: 32 }}>Loading...</div></ThemeProvider>;
  }

  return (
    <ThemeProvider setting={settings.theme}>
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
          <button
            onClick={() => setAboutOpen(true)}
            style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)' }}
          >
            About
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
            }}
          >
            Settings
          </button>
        </header>
        <main style={{ flex: 1, overflow: 'hidden', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          {showGhNotice && <GhMissingNotice installed={ghInstalled ?? false} />}
          {noRoots ? (
            <Onboarding onAddRoot={addRoot} />
          ) : selected !== null ? (
            <WorktreeDetail
              worktree={selected}
              defaultTerminal={settings.defaultTerminal}
              onBack={() => setSelected(null)}
              onMessage={(msg, ok) => showToast(msg, ok ? 'ok' : 'error')}
            />
          ) : (
            <WorktreeTable
              worktrees={worktrees}
              loading={loading}
              defaultTerminal={settings.defaultTerminal}
              onSelect={setSelected}
              onMessage={(msg, ok) => showToast(msg, ok ? 'ok' : 'error')}
            />
          )}
        </main>
        {settingsOpen && (
          <SettingsPage
            settings={settings}
            onUpdate={async (patch) => { await updateSettings(patch); refresh(); }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
        {toast !== null && (
          <Toast message={toast.message} type={toast.type} onDone={clearToast} />
        )}
      </div>
    </ThemeProvider>
  );
}
