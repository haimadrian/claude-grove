import React, { useState } from 'react';
import type { Settings, TerminalKind, Theme } from '../../shared/types';

interface Props {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => Promise<void>;
  onClose: () => void;
}

export function SettingsPage({ settings, onUpdate, onClose }: Props): React.JSX.Element {
  const [editorCommand, setEditorCommand] = useState(settings.editorCommand);
  const [defaultBaseBranch, setDefaultBaseBranch] = useState(settings.defaultBaseBranch);
  const [prCacheTtl, setPrCacheTtl] = useState(String(settings.prCacheTtlSeconds));
  const [theme, setThemeLocal] = useState(settings.theme);
  const [terminal, setTerminalLocal] = useState(settings.defaultTerminal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addRoot = async (): Promise<void> => {
    const res = await window.api.dialog.pickDirectory();
    if (!res.canceled && res.filePaths[0] !== undefined) {
      await onUpdate({ roots: [...settings.roots, res.filePaths[0]] });
    }
  };

  const removeRoot = async (root: string): Promise<void> => {
    await onUpdate({ roots: settings.roots.filter((r) => r !== root) });
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    await onUpdate({
      editorCommand,
      defaultBaseBranch,
      prCacheTtlSeconds: Number(prCacheTtl) || 60,
      theme,
      defaultTerminal: terminal,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  return (
    <>
    <style>{`
  .settings-input:focus {
    outline: none;
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px var(--accent-muted);
  }
`}</style>
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 28, maxWidth: 500, width: '90%', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 32px var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, flex: 1 }}>Settings</h2>
          <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)' }}>✕</button>
        </div>

        <Section title="Roots" first>
          {settings.roots.map((r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <code style={{ flex: 1, fontSize: 12, color: 'var(--fg-muted)' }}>{r}</code>
              <button onClick={() => removeRoot(r)} style={{ ...BTN_SMALL, color: 'var(--danger)' }}>Remove</button>
            </div>
          ))}
          <button onClick={addRoot} style={BTN_SMALL}>+ Add root folder</button>
        </Section>

        <Section title="Theme">
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
            {(['system', 'light', 'dark'] as Theme[]).map((t, i) => (
              <button
                key={t}
                onClick={() => setThemeLocal(t)}
                style={{
                  fontSize: 13, padding: '4px 14px',
                  background: theme === t ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: theme === t ? '#fff' : 'var(--fg)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  borderRadius: 0, cursor: 'pointer',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Default terminal">
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
            {(['Terminal', 'iTerm2', 'Warp'] as TerminalKind[]).map((t, i) => (
              <button
                key={t}
                onClick={() => setTerminalLocal(t)}
                style={{
                  fontSize: 13, padding: '4px 14px',
                  background: terminal === t ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: terminal === t ? '#fff' : 'var(--fg)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  borderRadius: 0, cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Editor">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              flex: 1, fontSize: 13, padding: '5px 8px',
              background: 'var(--bg-tertiary)', borderRadius: 6, color: 'var(--fg)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {editorCommand
                ? editorCommand.endsWith('.app')
                  ? (editorCommand.split('/').pop()?.replace('.app', '') ?? editorCommand)
                  : editorCommand
                : <span style={{ color: 'var(--fg-muted)' }}>Not configured</span>}
            </span>
            <button
              onClick={async () => {
                const res = await window.api.dialog.pickApplication();
                if (!res.canceled && res.filePaths[0] !== undefined) setEditorCommand(res.filePaths[0]);
              }}
              style={BTN_SMALL}
            >
              Choose app...
            </button>
            {editorCommand && (
              <button onClick={() => setEditorCommand('')} style={{ ...BTN_SMALL, color: 'var(--fg-muted)' }}>✕</button>
            )}
          </div>
          <input
            className="settings-input"
            value={editorCommand.endsWith('.app') ? '' : editorCommand}
            onChange={(e) => setEditorCommand(e.target.value)}
            style={INPUT}
            placeholder="Or type a CLI command: code, cursor…"
          />
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
            Pick an app above, or type a CLI command manually.
          </div>
        </Section>

        <Section title="Default base branch">
          <input
            className="settings-input"
            value={defaultBaseBranch}
            onChange={(e) => setDefaultBaseBranch(e.target.value)}
            style={INPUT}
            placeholder="main"
          />
        </Section>

        <Section title="PR cache TTL (seconds)">
          <input
            className="settings-input"
            type="number"
            value={prCacheTtl}
            onChange={(e) => setPrCacheTtl(e.target.value)}
            style={{ ...INPUT, width: 80 }}
          />
        </Section>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={BTN_SECONDARY}>Close</button>
          <button onClick={save} disabled={saving} style={{ ...BTN_SECONDARY, background: saved ? 'var(--ok)' : 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 20, paddingTop: first ? 0 : 16, borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      {children}
    </div>
  );
}

const BTN_SMALL: React.CSSProperties = { fontSize: 12, padding: '3px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--fg)' };
const BTN_SECONDARY: React.CSSProperties = { padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)' };
const INPUT: React.CSSProperties = { padding: '5px 8px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', width: '100%' };
