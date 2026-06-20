import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorktreeRow, Settings } from '../../shared/types';
import { PrBadge } from './PrBadge';

const REPO_HUES = [217, 142, 271, 24, 180, 329, 90, 45, 195, 0, 260, 158];

function repoColorIndex(name: string): number {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h) % REPO_HUES.length;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const DIALOG_BTN: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};

interface KebabMenuProps {
  row: WorktreeRow;
  settings: Settings;
  onSelect: (row: WorktreeRow) => void;
  onToast: (msg: string) => void;
  onRename: () => void;
  onDelete: () => void;
}

function KebabMenu({ row, settings, onSelect, onToast, onRename, onDelete }: KebabMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openMenu = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 200;
    let left = rect.right + 4;
    if (left + menuW > window.innerWidth) {
      left = rect.left - menuW - 4;
    }
    setMenuPos({ top: rect.bottom + 4, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const item = (icon: string, label: string, action: () => void, color?: string): React.JSX.Element => (
    <button
      key={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); setOpen(false); action(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', minHeight: 32, width: '100%', textAlign: 'left',
        background: 'none', border: 'none', color: color ?? 'var(--fg)',
        fontSize: 13, cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ width: 16, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        aria-label="Worktree actions"
        onClick={openMenu}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none', color: 'var(--fg-muted)',
          fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 4,
          cursor: 'pointer', zIndex: 1,
        }}
      >
        ⋮
      </button>
      {open && menuPos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left,
            width: 200, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)', zIndex: 2000,
            paddingTop: 4, paddingBottom: 4, overflow: 'hidden',
          }}
        >
          {item('👁', 'View diff', () => onSelect(row))}
          {row.sessions.length > 0 && item('▶', 'Resume Claude', () => {
            const s = row.sessions[0]!;
            window.api.terminals.resumeSession({
              terminal: settings.defaultTerminal,
              launchDir: s.launchDir,
              sessionId: s.sessionId,
            }).then((r) => onToast(r.message)).catch((e) => onToast(String(e)));
          })}
          {item('✏', 'Edit in IDE', () => {
            window.api.open.editor(row.path)
              .then((r) => { if (!r.success) onToast(r.message); else onToast('Opened in editor'); })
              .catch((e) => onToast(String(e)));
          })}
          {item('>_', 'Open in terminal', () => {
            window.api.terminals.openDir({ terminal: settings.defaultTerminal, dir: row.path })
              .then((r) => onToast(r.message)).catch((e) => onToast(String(e)));
          })}
          {row.branch && item('✎', 'Rename branch', onRename)}
          {item('🗑', 'Delete worktree', onDelete, 'var(--danger)')}
          {item('📂', 'Open in Finder', () => {
            void window.api.open.finder(row.path);
            onToast('Opened in Finder');
          })}
          {row.repo.remoteUrl && item('↗', 'Open on GitHub', () => {
            void window.api.open.url(row.repo.remoteUrl!);
          })}
        </div>
      )}
    </>
  );
}

export interface WorktreeCardProps {
  row: WorktreeRow;
  settings: Settings;
  onSelect: (row: WorktreeRow) => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function WorktreeCard({ row, settings, onSelect, onRefresh, onToast }: WorktreeCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [renameState, setRenameState] = useState<{ value: string } | null>(null);
  const [deleteState, setDeleteState] = useState<{ deleteRemote: boolean } | null>(null);

  const hueIdx = repoColorIndex(row.repo.name);
  const hue = REPO_HUES[hueIdx]!;
  const repoColor = `hsl(${hue}, 60%, 55%)`;
  const repoTint = `hsla(${hue}, 70%, 55%, 0.08)`;

  const doRename = useCallback((): void => {
    if (!renameState) return;
    const val = renameState.value.trim();
    if (!val || val === row.branch) { setRenameState(null); return; }
    setRenameState(null);
    void window.api.worktrees.renameBranch(row.path, val);
  }, [renameState, row.branch, row.path]);

  const doDelete = useCallback((): void => {
    if (!deleteState) return;
    const { deleteRemote } = deleteState;
    setDeleteState(null);
    window.api.worktrees.remove(row.path, { force: false, deleteLocalBranch: deleteRemote })
      .then((r) => { onToast(r.message); if (r.success) onRefresh(); })
      .catch((e) => onToast(String(e)));
  }, [deleteState, row.path, onToast, onRefresh]);

  const sha = row.headSha.slice(0, 7);

  return (
    <>
      <div
        onClick={() => onSelect(row)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 8,
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${repoColor}`,
          background: 'var(--bg-secondary)',
          boxShadow: hovered
            ? '0 4px 12px var(--shadow)'
            : '0 1px 3px var(--shadow)',
          transform: hovered ? 'translateY(-1px)' : 'none',
          transition: 'all 150ms ease-out',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            position: 'relative',
            background: repoTint,
            padding: '8px 40px 8px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13, color: repoColor }}>
            {row.repo.name}
          </span>
          <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>›</span>
          <span style={{
            fontSize: 13, color: 'var(--fg)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.branch ?? <em style={{ color: 'var(--fg-muted)' }}>detached</em>}
          </span>
          <KebabMenu
            row={row}
            settings={settings}
            onSelect={onSelect}
            onToast={onToast}
            onRename={() => setRenameState({ value: row.branch ?? '' })}
            onDelete={() => setDeleteState({ deleteRemote: false })}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Body */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* State badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 20 }}>
            {row.isDirty && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(154,103,0,0.12)', color: 'var(--warn)', border: '1px solid rgba(154,103,0,0.25)' }}>dirty</span>
            )}
            {row.ahead > 0 && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(26,127,55,0.10)', color: 'var(--ok)', border: '1px solid rgba(26,127,55,0.2)' }}>↑{row.ahead}</span>
            )}
            {row.behind > 0 && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(207,34,46,0.10)', color: 'var(--danger)', border: '1px solid rgba(207,34,46,0.2)' }}>↓{row.behind}</span>
            )}
            {row.isLocked && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'var(--bg-tertiary)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>locked</span>
            )}
            {row.isPrunable && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'var(--bg-tertiary)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>prunable</span>
            )}
            {row.upstreamGone && (
              <span
                style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(154,103,0,0.12)', color: 'var(--warn)', border: '1px solid rgba(154,103,0,0.25)', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setDeleteState({ deleteRemote: false }); }}
                title="Remote branch deleted — click to delete local worktree"
              >
                remote gone
              </span>
            )}
            {!row.upstreamGone && row.pr?.state === 'MERGED' && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(26,127,55,0.10)', color: 'var(--ok)', border: '1px solid rgba(26,127,55,0.2)' }}>merged</span>
            )}
          </div>

          {/* Commit info */}
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', gap: 6, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--fg-muted)' }}>{sha}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {row.lastCommitSubject ? `· ${row.lastCommitSubject}` : ''}
            </span>
          </div>

          {/* Modified time */}
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            Modified: {relTime(row.lastCommitDate)}
          </div>

          {/* Sessions */}
          {row.sessions.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Sessions: {row.sessions.length}{row.sessions[0]?.title ? ` · ${row.sessions[0].title}` : ''}
            </div>
          )}

          {/* PR badge */}
          {row.pr && (
            <div onClick={(e) => e.stopPropagation()}>
              <PrBadge
                pr={row.pr}
                onClick={() => { void window.api.open.url(row.pr!.url); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Rename modal */}
      {renameState && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setRenameState(null)}
        >
          <div
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Rename branch</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
              Current: <code>{row.branch}</code><br />
              Renames locally and on remote.
            </p>
            <input
              autoFocus
              value={renameState.value}
              onChange={(e) => setRenameState({ value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doRename();
                if (e.key === 'Escape') setRenameState(null);
              }}
              style={{
                width: '100%', padding: '6px 10px', marginBottom: 16,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)', fontSize: 13,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRenameState(null)} style={DIALOG_BTN}>Cancel</button>
              <button
                onClick={doRename}
                style={{ ...DIALOG_BTN, background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteState && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDeleteState(null)}
        >
          <div
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Delete worktree</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>
              Branch: <code style={{ color: 'var(--fg)' }}>{row.branch ?? 'detached'}</code>
            </p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, wordBreak: 'break-all' }}>
              {row.path}
            </p>
            {(row.upstreamGone || row.pr?.state === 'MERGED') ? (
              <p style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 12 }}>✓ Safe to delete (upstream gone or PR merged)</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 12 }}>⚠ Branch may not be merged yet.</p>
            )}
            {row.branch && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteState.deleteRemote}
                  onChange={(e) => setDeleteState({ deleteRemote: e.target.checked })}
                />
                Also delete remote branch
                {row.upstreamGone && (
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11, marginLeft: 6 }}>(already deleted on remote)</span>
                )}
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteState(null)} style={DIALOG_BTN}>Cancel</button>
              <button
                onClick={doDelete}
                style={{ ...DIALOG_BTN, background: 'var(--danger)', color: 'var(--bg)', borderColor: 'transparent' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
