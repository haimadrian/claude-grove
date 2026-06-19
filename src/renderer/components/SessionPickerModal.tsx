import React from 'react';
import type { SessionLink, TerminalKind } from '../../shared/types';

interface Props {
  sessions: SessionLink[];
  terminal: TerminalKind;
  onResume: (session: SessionLink) => void;
  onClose: () => void;
}

function formatActivity(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const BTN: React.CSSProperties = {
  padding: '5px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
  background: 'var(--accent)', color: 'var(--bg)', border: 'none',
};
const CANCEL: React.CSSProperties = {
  padding: '5px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bg-secondary)', color: 'var(--fg)', border: '1px solid var(--border)',
};

export function SessionPickerModal({ sessions, terminal, onResume, onClose }: Props): React.JSX.Element {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        width: '70vw', maxWidth: 720, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px var(--shadow)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Pick a session to resume in {terminal}</span>
          <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>✕</button>
        </div>
        {/* Session list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sessions.map((s, i) => (
            <div
              key={s.sessionId}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px', borderBottom: '1px solid var(--bg-tertiary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              {/* Rank badge */}
              <span style={{
                fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--fg-muted)',
                minWidth: 20, textAlign: 'center',
              }}>
                #{i + 1}
              </span>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title ?? s.sessionId}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                  Last active: {formatActivity(s.lastActivity)} &nbsp;·&nbsp; {s.matchCount} path reference{s.matchCount !== 1 ? 's' : ''}
                </div>
              </div>
              {/* Resume button */}
              <button onClick={() => onResume(s)} style={BTN}>
                Resume
              </button>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={CANCEL}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
