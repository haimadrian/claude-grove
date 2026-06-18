import React, { useState, useCallback, useRef } from 'react';
import type { WorktreeRow, TerminalKind } from '../../shared/types';
import { PrBadge } from './PrBadge';
import { CommitList } from './CommitList';
import { DiffViewer } from './DiffViewer';

interface Props {
  worktree: WorktreeRow;
  defaultTerminal: TerminalKind;
  onBack: () => void;
  onMessage: (msg: string, ok: boolean) => void;
}

export function WorktreeDetail({ worktree, defaultTerminal, onBack, onMessage }: Props): React.JSX.Element {
  const [diff, setDiff] = useState<string>('');
  const [leftWidth, setLeftWidth] = useState(300);
  const splitterDragging = useRef(false);
  const [renameState, setRenameState] = useState<{ value: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRemote, setDeleteRemote] = useState(false);

  const doRename = useCallback((): void => {
    if (!renameState) return;
    const val = renameState.value.trim();
    if (!val || val === worktree.branch) { setRenameState(null); return; }
    setRenameState(null);
    window.api.worktrees.renameBranch(worktree.path, val)
      .then((r) => onMessage(r.message, r.success))
      .catch((e) => onMessage(String(e), false));
  }, [renameState, worktree, onMessage]);

  const doDelete = useCallback((): void => {
    setShowDeleteConfirm(false);
    window.api.worktrees.remove(worktree.path, { force: false, deleteLocalBranch: deleteRemote })
      .then((r) => { onMessage(r.message, r.success); if (r.success) onBack(); })
      .catch((e) => onMessage(String(e), false));
  }, [worktree, deleteRemote, onMessage, onBack]);

  const loadFullDiff = useCallback((): void => {
    window.api.worktrees.fullDiff(worktree.path, worktree.pr?.baseRefName ?? undefined).then(setDiff);
  }, [worktree.path, worktree.pr?.baseRefName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', marginBottom: 12, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, padding: '3px 8px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
            color: 'var(--fg)', marginBottom: 8,
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{worktree.branch ?? 'detached HEAD'}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{worktree.repo.name}</span>
          <PrBadge
            pr={worktree.pr}
            {...(worktree.pr ? { onClick: () => window.api.open.url(worktree.pr!.url) } : {})}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'monospace' }}>
          {worktree.path}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => window.api.open.editor(worktree.path)}
            style={ACTION_BTN}
            title="Open worktree folder in your configured editor"
          >
            Open in editor
          </button>
          <button
            onClick={() => window.api.open.finder(worktree.path)}
            style={ACTION_BTN}
            title="Reveal worktree folder in Finder"
          >
            Reveal in Finder
          </button>
          <button
            onClick={() =>
              window.api.terminals.openDir({ terminal: defaultTerminal, dir: worktree.path })
                .then((r) => onMessage(r.message, r.success))
                .catch((e) => onMessage(String(e), false))
            }
            style={ACTION_BTN}
            title={`Open worktree in ${defaultTerminal}`}
          >
            Terminal
          </button>
          {worktree.repo.remoteUrl && (
            <button
              onClick={() => window.api.open.url(worktree.repo.remoteUrl!)}
              style={ACTION_BTN}
              title="Open repository on GitHub in your browser"
            >
              View on GitHub
            </button>
          )}
          {worktree.sessions[0] && (
            <button
              onClick={() =>
                window.api.terminals.resumeSession({
                  terminal: defaultTerminal,
                  launchDir: worktree.sessions[0]!.launchDir,
                  sessionId: worktree.sessions[0]!.sessionId,
                }).then((r) => onMessage(r.message, r.success)).catch((e) => onMessage(String(e), false))
              }
              style={{ ...ACTION_BTN, color: 'var(--accent)' }}
              title={`Resume Claude Code session in ${defaultTerminal}: ${worktree.sessions[0].title ?? worktree.sessions[0].sessionId}`}
            >
              Resume
            </button>
          )}
          {worktree.branch && (
            <button
              onClick={() => setRenameState({ value: worktree.branch! })}
              style={ACTION_BTN}
              title="Rename branch locally and on remote"
            >
              Rename
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...ACTION_BTN, color: 'var(--danger)' }}
            title="Remove this worktree (optionally also delete remote branch)"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Body: two-column layout with draggable splitter */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: commit list */}
        <div style={{ width: leftWidth, flexShrink: 0, overflowY: 'auto', minWidth: 150 }}>
          <CommitList
            worktreePath={worktree.path}
            isDirty={worktree.isDirty}
            {...(worktree.pr?.baseRefName ? { prBase: worktree.pr.baseRefName } : {})}
            onDiff={setDiff}
            onFullDiff={loadFullDiff}
            onMessage={onMessage}
          />
        </div>
        {/* Splitter */}
        <div
          style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)', transition: 'background 0.1s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)'; }}
          onMouseLeave={(e) => { if (!splitterDragging.current) (e.currentTarget as HTMLDivElement).style.background = 'var(--border)'; }}
          onMouseDown={(e) => {
            e.preventDefault();
            splitterDragging.current = true;
            const startX = e.clientX;
            const startW = leftWidth;
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = 'var(--accent)';
            const onMove = (ev: MouseEvent): void => {
              setLeftWidth(Math.max(150, Math.min(700, startW + ev.clientX - startX)));
            };
            const onUp = (): void => {
              splitterDragging.current = false;
              el.style.background = 'var(--border)';
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />
        {/* Right: diff viewer */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <DiffViewer rawDiff={diff} />
        </div>
      </div>
      {renameState && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Rename branch</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>Current: <code>{worktree.branch}</code></p>
            <input
              autoFocus
              value={renameState.value}
              onChange={(e) => setRenameState((s) => s ? { value: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenameState(null); }}
              style={{ width: '100%', padding: '6px 10px', marginBottom: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRenameState(null)} style={DETAIL_BTN}>Cancel</button>
              <button onClick={doRename} style={{ ...DETAIL_BTN, background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }}>Rename</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Delete worktree</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>Branch: <code style={{ color: 'var(--fg)' }}>{worktree.branch ?? 'detached'}</code></p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, wordBreak: 'break-all' }}>{worktree.path}</p>
            {(worktree.upstreamGone || worktree.pr?.state === 'MERGED') ? (
              <p style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 12 }}>✓ Safe to delete</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 12 }}>⚠ Branch may not be merged yet.</p>
            )}
            {worktree.branch && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={deleteRemote} onChange={(e) => setDeleteRemote(e.target.checked)} />
                Also delete remote branch
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={DETAIL_BTN}>Cancel</button>
              <button onClick={doDelete} style={{ ...DETAIL_BTN, background: 'var(--danger)', color: 'var(--bg)', borderColor: 'transparent' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ACTION_BTN: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
};

const DETAIL_BTN: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6,
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};
