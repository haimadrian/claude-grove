import React, { useEffect, useState, useRef } from 'react';
import type { WorktreeRow, TerminalKind } from '../../shared/types';

interface Props {
  worktree: WorktreeRow;
  defaultTerminal: TerminalKind;
  onResult: (message: string, ok: boolean) => void;
}

export function TerminalSplitButton({ worktree, defaultTerminal, onResult }: Props): React.JSX.Element {
  const [available, setAvailable] = useState<TerminalKind[]>([defaultTerminal]);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.api.terminals.available().then(setAvailable);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFlyoutOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const primarySession = worktree.sessions[0];

  const resume = async (terminal: TerminalKind): Promise<void> => {
    setFlyoutOpen(false);
    if (!primarySession) {
      onResult('No linked session found for this worktree', false);
      return;
    }
    const r = await window.api.terminals.resumeSession({
      terminal,
      launchDir: primarySession.launchDir,
      sessionId: primarySession.sessionId,
    });
    onResult(r.message, r.success);
  };

  const openDir = async (terminal: TerminalKind): Promise<void> => {
    setFlyoutOpen(false);
    const r = await window.api.terminals.openDir({ terminal, dir: worktree.path });
    onResult(r.message, r.success);
  };

  const warpNote = 'Warp: command copied to clipboard — paste to resume.';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', gap: 0 }}>
      <button
        title={defaultTerminal === 'Warp' ? warpNote : undefined}
        onClick={() => resume(defaultTerminal)}
        style={{ ...BTN, borderRadius: '6px 0 0 6px', borderRight: 'none' }}
      >
        Resume in {defaultTerminal}
        {!primarySession && <span style={{ color: 'var(--warn)', marginLeft: 4 }}>·</span>}
      </button>
      <button
        onClick={() => setFlyoutOpen((o) => !o)}
        style={{ ...BTN, borderRadius: '0 6px 6px 0', padding: '4px 7px' }}
      >
        ▾
      </button>
      {flyoutOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 500, marginTop: 2,
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 12px var(--shadow)', minWidth: 180,
        }}>
          {available.map((t) => (
            <div key={t}>
              <div
                onClick={() => resume(t)}
                style={FLYOUT_ITEM}
              >
                Resume in {t}{t === 'Warp' ? ' (copies cmd)' : ''}
              </div>
              <div
                onClick={() => openDir(t)}
                style={{ ...FLYOUT_ITEM, color: 'var(--fg-muted)' }}
              >
                Open dir in {t}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BTN: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg)',
};
const FLYOUT_ITEM: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
};
