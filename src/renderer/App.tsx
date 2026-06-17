import React, { useState } from 'react';
import type { WorktreeRow } from '../shared/types';
import { ThemeProvider } from './theme/ThemeProvider';
import { WorktreeTable } from './components/WorktreeTable';
import { WorktreeDetail } from './components/WorktreeDetail';
import { GhMissingNotice } from './components/GhMissingNotice';
import { SettingsPage } from './components/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { Toast, useToast } from './components/Toast';
import { HelpModal } from './components/HelpModal';
import { useSettings } from './hooks/useSettings';
import { useWorktrees } from './hooks/useWorktrees';

export function App(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const { worktrees, loading, refresh } = useWorktrees();
  const [ghInstalled, setGhInstalled] = useState<boolean | null>(null);
  const [ghAuthed, setGhAuthed] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Always use the live row from `worktrees` so PR data (fetched lazily) is reflected
  const selected = selectedId !== null ? (worktrees.find((w) => w.id === selectedId) ?? null) : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
            title="Refresh"
            style={{ marginLeft: 'auto', fontSize: 16, padding: '2px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', lineHeight: 1 }}
          >
            ↺
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            title="Help"
            style={{ fontSize: 14, fontWeight: 600, padding: '2px 9px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', lineHeight: 1 }}
          >
            ?
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            style={{ fontSize: 15, padding: '2px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', lineHeight: 1 }}
          >
            ⚙
          </button>
        </header>
        <main style={{ flex: 1, overflow: 'hidden', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          {showGhNotice && <GhMissingNotice installed={ghInstalled ?? false} />}
          {noRoots ? (
            <Onboarding onAddRoot={addRoot} />
          ) : (
            <>
              {/* Keep WorktreeTable mounted so sort/filter/column state persists across navigation */}
              <div style={{ display: selected !== null ? 'none' : 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <WorktreeTable
                  worktrees={worktrees}
                  loading={loading}
                  defaultTerminal={settings.defaultTerminal}
                  onSelect={(w) => setSelectedId(w.id)}
                  onMessage={(msg, ok) => showToast(msg, ok ? 'ok' : 'error')}
                />
              </div>
              {selected !== null && (
                <WorktreeDetail
                  worktree={selected}
                  defaultTerminal={settings.defaultTerminal}
                  onBack={() => setSelectedId(null)}
                  onMessage={(msg, ok) => showToast(msg, ok ? 'ok' : 'error')}
                />
              )}
            </>
          )}
        </main>
        {settingsOpen && (
          <SettingsPage
            settings={settings}
            onUpdate={async (patch) => { await updateSettings(patch); refresh(); }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        {toast !== null && (
          <Toast message={toast.message} type={toast.type} onDone={clearToast} />
        )}
      </div>
    </ThemeProvider>
  );
}
