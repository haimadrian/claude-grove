import React, { useState } from 'react';
import type { WorktreeRow } from '../shared/types';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { WorktreeTable } from './components/WorktreeTable';
import { WorktreeCardGrid } from './components/WorktreeCardGrid';
import { WorktreeDetail } from './components/WorktreeDetail';
import { GhMissingNotice } from './components/GhMissingNotice';
import { SettingsPage } from './components/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { Toast, useToast } from './components/Toast';
import { HelpModal } from './components/HelpModal';
import { useSettings } from './hooks/useSettings';
import { useWorktrees } from './hooks/useWorktrees';

function AppInner(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const { worktrees, loading, refresh } = useWorktrees();
  const { theme, toggle: toggleTheme } = useTheme();
  const [ghInstalled, setGhInstalled] = useState<boolean | null>(null);
  const [ghAuthed, setGhAuthed] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId !== null ? (worktrees.find((w) => w.id === selectedId) ?? null) : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
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
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  const BTN: React.CSSProperties = {
    fontSize: 15, padding: '4px 10px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', lineHeight: 1,
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Bangers', cursive",
          fontSize: 34,
          letterSpacing: '0.08em',
          userSelect: 'none',
          color: 'var(--fg)',
          WebkitTextStroke: '0.5px var(--accent)',
          textShadow: '2px 2px 0 var(--accent), 4px 4px 0 rgba(0,0,0,0.15)',
          lineHeight: 1,
        } as React.CSSProperties}>
          Claude Grove
        </span>
        <button
          onClick={selected !== null
            ? () => setDetailRefreshKey((k) => k + 1)
            : refresh}
          title={selected !== null
            ? 'Refresh — reload this worktree and its diff'
            : 'Refresh — reload all worktrees'}
          style={{ ...BTN, marginLeft: 'auto', fontSize: 16 }}
        >
          <span style={loading && selected === null ? { display: 'inline-block', animation: 'spin 0.8s linear infinite' } : undefined}>↺</span>
        </button>
        {/* Layout toggle — only relevant on the worktree list, hidden in detail view */}
        <div style={{ display: selected !== null ? 'none' : 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => void updateSettings({ layout: 'table' })}
            title="Table view — sortable columns with resizable headers"
            style={{
              fontSize: 15, padding: '4px 10px', lineHeight: 1,
              background: settings.layout === 'table' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: settings.layout === 'table' ? 'var(--bg)' : 'var(--fg)',
              border: 'none', borderRadius: 0,
            }}
          >
            ≡
          </button>
          <button
            onClick={() => void updateSettings({ layout: 'card' })}
            title="Card view — color-coded cards per repository, full detail rows, ⋮ action menu"
            style={{
              fontSize: 15, padding: '4px 10px', lineHeight: 1,
              background: settings.layout === 'card' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: settings.layout === 'card' ? 'var(--bg)' : 'var(--fg)',
              border: 'none', borderLeft: '1px solid var(--border)', borderRadius: 0,
            }}
          >
            ⊞
          </button>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={BTN}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button onClick={() => setHelpOpen(true)} title="Help" style={{ ...BTN, fontSize: 14, fontWeight: 600 }}>?</button>
        <button onClick={() => setSettingsOpen(true)} title="Settings" style={BTN}>⚙</button>
      </header>
      <main style={{ flex: 1, overflow: 'hidden', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {showGhNotice && <GhMissingNotice installed={ghInstalled ?? false} />}
        {noRoots ? (
          <Onboarding onAddRoot={addRoot} />
        ) : (
          <>
            <div style={{ display: selected !== null || settings.layout !== 'table' ? 'none' : 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <WorktreeTable
                worktrees={worktrees}
                loading={loading}
                defaultTerminal={settings.defaultTerminal}
                onSelect={(w) => setSelectedId(w.id)}
                onMessage={(msg, ok) => showToast(msg, ok ? 'ok' : 'error')}
              />
            </div>
            <div style={{ display: selected !== null || settings.layout !== 'card' ? 'none' : 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <WorktreeCardGrid
                worktrees={worktrees}
                settings={settings}
                onSelect={(w) => setSelectedId(w.id)}
                onRefresh={refresh}
              />
            </div>
            {selected !== null && (
              <WorktreeDetail
                worktree={selected}
                defaultTerminal={settings.defaultTerminal}
                refreshKey={detailRefreshKey}
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
  );
}

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
