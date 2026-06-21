import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorktreeRow, Settings } from '../../shared/types';
import { buildStateLines, buildPrLines } from '../utils/tooltips';
import { PrBadge } from './PrBadge';
import { CopyButton } from './CopyButton';
import { SessionPickerModal } from './SessionPickerModal';
import { Eye, Play, Code2, Terminal, FolderOpen, GitBranch, ExternalLink, ArrowDownToLine, Pencil, Trash2, MoreVertical } from 'lucide-react';

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
  onToast: (msg: string, type?: 'ok' | 'error' | 'pending', resolveId?: string, subtitle?: string) => string;
  onRename: () => void;
  onDelete: () => void;
  openMenuId: string | null;
  onMenuOpen: (id: string | null) => void;
}

function KebabMenu({ row, settings, onSelect, onToast, onRename, onDelete, openMenuId, onMenuOpen }: KebabMenuProps): React.JSX.Element {
  const open = openMenuId === row.id;
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [gitExpanded, setGitExpanded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openMenu = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (open) { onMenuOpen(null); return; }
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 200;
    const menuHEstimate = 260;
    let left = rect.right + 4;
    if (left + menuW > window.innerWidth) {
      left = rect.left - menuW - 4;
    }
    if (window.innerHeight - rect.bottom - 4 >= menuHEstimate) {
      setMenuPos({ top: rect.bottom + 4, left });
    } else {
      // Anchor bottom of menu to just above the button (no height knowledge needed)
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, left });
    }
    onMenuOpen(row.id);
  };

  useEffect(() => {
    if (!open) { setGitExpanded(false); return; }
    const close = (): void => onMenuOpen(null);
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onMenuOpen(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', close, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const item = (icon: React.ReactNode, label: string, action: () => void, color?: string): React.JSX.Element => (
    <button
      key={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onMenuOpen(null); action(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', minHeight: 32, width: '100%', textAlign: 'left',
        background: 'none', border: 'none', color: color ?? 'var(--fg)',
        fontSize: 13, cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        aria-label="Worktree actions"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openMenu}
        style={{
          background: 'none', border: 'none', color: 'var(--fg-muted)',
          lineHeight: 1, padding: '2px 6px', borderRadius: 4,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
        }}
      >
        <MoreVertical size={16} />
      </button>
      {open && menuPos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            ...(menuPos.top !== undefined ? { top: menuPos.top } : { bottom: menuPos.bottom }),
            left: menuPos.left,
            width: 200, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)', zIndex: 2000,
            paddingTop: 4, paddingBottom: 4, overflow: 'hidden',
            maxHeight: window.innerHeight - 8,
            overflowY: 'auto',
          }}
        >
          {item(<Eye size={14} />, 'View diff', () => onSelect(row))}
          {row.sessions.length > 0 && item(<Play size={14} />, 'Resume Claude', () => {
            const s = row.sessions[0]!;
            window.api.terminals.resumeSession({
              terminal: settings.defaultTerminal,
              launchDir: s.launchDir,
              sessionId: s.sessionId,
            }).then((r) => onToast(r.message)).catch((e) => onToast(String(e)));
          })}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {item(<Code2 size={14} />, 'Edit in IDE', () => {
            window.api.open.editor(row.path)
              .then((r) => { if (!r.success) onToast(r.message); else onToast('Opened in editor'); })
              .catch((e) => onToast(String(e)));
          })}
          {item(<Terminal size={14} />, 'Open in terminal', () => {
            window.api.terminals.openDir({ terminal: settings.defaultTerminal, dir: row.path })
              .then((r) => onToast(r.message)).catch((e) => onToast(String(e)));
          })}
          {item(<FolderOpen size={14} />, 'Open in Finder', () => {
            void window.api.open.finder(row.path);
            onToast('Opened in Finder');
          })}
          {/* Git section */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setGitExpanded((g) => !g); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 12px', minHeight: 32, width: '100%', textAlign: 'left',
              background: 'none', border: 'none', color: 'var(--fg)',
              fontSize: 13, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GitBranch size={14} /></span>
              <span>Git</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{gitExpanded ? '▾' : '▸'}</span>
          </button>
          {gitExpanded && (
            <>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuOpen(null);
                  window.api.worktrees.sync(row.path, 'pull')
                    .then((r) => onToast(r.message))
                    .catch((err) => onToast(String(err)));
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px 0 28px', minHeight: 30, width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', color: 'var(--fg)',
                  fontSize: 12, cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', width: 14 }}><ArrowDownToLine size={13} /></span>
                <span>Update (pull)</span>
              </button>
              {row.branch && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onMenuOpen(null); onRename(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 12px 0 28px', minHeight: 30, width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', color: 'var(--fg)',
                    fontSize: 12, cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', width: 14 }}><Pencil size={13} /></span>
                  <span>Rename branch</span>
                </button>
              )}
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onMenuOpen(null); onDelete(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px 0 28px', minHeight: 30, width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', color: 'var(--danger)',
                  fontSize: 12, cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', width: 14 }}><Trash2 size={13} /></span>
                <span>Delete worktree</span>
              </button>
            </>
          )}
          {row.repo.remoteUrl && item(<ExternalLink size={14} />, 'Open on GitHub', () => {
            void window.api.open.url(row.repo.remoteUrl!);
          })}
        </div>
      )}
    </>
  );
}

function InfoRow({ label, children, copyText }: { label: string; children: React.ReactNode; copyText?: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minHeight: 20 }}>
      <span style={{
        width: 68, flexShrink: 0, fontSize: 11, fontWeight: 600,
        color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
        paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      {copyText !== undefined && <CopyButton text={copyText} />}
    </div>
  );
}

export interface WorktreeCardProps {
  row: WorktreeRow;
  settings: Settings;
  onSelect: (row: WorktreeRow) => void;
  onRefresh: () => void;
  onToast: (msg: string, type?: 'ok' | 'error' | 'pending', resolveId?: string, subtitle?: string) => string;
  openMenuId: string | null;
  onMenuOpen: (id: string | null) => void;
  cardHeight?: number;
  selected?: boolean;
  onShiftClick?: (id: string) => void;
}

export function WorktreeCard({ row, settings, onSelect, onRefresh, onToast, openMenuId, onMenuOpen, cardHeight, selected, onShiftClick }: WorktreeCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [renameState, setRenameState] = useState<{ value: string } | null>(null);
  const [deleteState, setDeleteState] = useState<{ deleteRemote: boolean } | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [tooltip, setTooltip] = useState<{ lines: string[]; x: number; y: number } | null>(null);

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
    const id = onToast('Deleting worktree…', 'pending', undefined, row.branch ?? undefined);
    window.api.worktrees.remove(row.path, { force: false, deleteLocalBranch: deleteRemote })
      .then((r) => { onToast(r.message, r.success ? 'ok' : 'error', id); if (r.success) onRefresh(); })
      .catch((e) => onToast(String(e), 'error', id));
  }, [deleteState, row.path, onToast, onRefresh]);

  const sha = row.headSha.slice(0, 7);

  return (
    <>
      <div
        onClick={(e) => {
          if (e.shiftKey && onShiftClick) {
            e.stopPropagation();
            onShiftClick(row.id);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 8,
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${repoColor}`,
          background: 'var(--bg-secondary)',
          boxShadow: hovered
            ? '0 6px 16px var(--shadow)'
            : '0 1px 3px var(--shadow)',
          transition: 'box-shadow 150ms ease-out',
          cursor: 'default',
          overflow: 'hidden',
          height: cardHeight,
          display: 'flex',
          flexDirection: 'column',
          ...(selected ? { outline: '2px solid var(--accent)', outlineOffset: '-2px' } : {}),
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 8px 8px 12px', flexShrink: 0, position: 'relative',
            background: repoTint,
          }}
        >
          {selected && (
            <span style={{
              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, color: '#fff',
            }}>✓</span>
          )}
          <span style={{ fontWeight: 600, fontSize: 13, color: repoColor }}>
            {row.repo.name}
          </span>
          <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>›</span>
          <span style={{
            fontSize: 13, color: 'var(--fg)', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.branch ?? <em style={{ color: 'var(--fg-muted)' }}>detached</em>}
          </span>
          {row.branch && <CopyButton text={row.branch} />}
          {row.sessions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (row.sessions.length > 1) {
                  setShowSessionPicker(true);
                } else {
                  const s = row.sessions[0]!;
                  window.api.terminals.resumeSession({
                    terminal: settings.defaultTerminal,
                    launchDir: s.launchDir,
                    sessionId: s.sessionId,
                  }).then((r) => onToast(r.message)).catch((e2) => onToast(String(e2)));
                }
              }}
              title={row.sessions.length > 1
                ? `${row.sessions.length} sessions — click to pick`
                : `Resume Claude session: ${row.sessions[0]?.title ?? row.sessions[0]?.sessionId ?? ''}`}
              style={{
                background: 'none',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                padding: '1px 6px',
                fontSize: 12,
                color: 'var(--accent)',
                lineHeight: 1,
                flexShrink: 0,
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Play size={13} />
            </button>
          )}
          <KebabMenu
            row={row}
            settings={settings}
            onSelect={onSelect}
            onToast={onToast}
            onRename={() => setRenameState({ value: row.branch ?? '' })}
            onDelete={() => setDeleteState({ deleteRemote: false })}
            openMenuId={openMenuId}
            onMenuOpen={onMenuOpen}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* Body */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* State row */}
          <InfoRow label="State">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
                onMouseEnter={(e) => {
                  const lines = buildStateLines(row);
                  if (lines.length > 0) setTooltip({ lines, x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setTooltip(null)}
              >
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
                {!row.isDirty && row.ahead === 0 && row.behind === 0 && !row.isLocked && !row.isPrunable && !row.upstreamGone && row.pr?.state !== 'MERGED' && (
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>clean</span>
                )}
              </div>
              <span
                title={new Date(row.lastCommitDate).toLocaleString()}
                style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}
              >
                {relTime(row.lastCommitDate)}
              </span>
            </div>
          </InfoRow>

          {/* PR row — second, right after State */}
          {row.pr && (
            <InfoRow label="PR">
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={(e) => setTooltip({ lines: buildPrLines(row.pr!), x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setTooltip(null)}
              >
                <PrBadge pr={row.pr} onClick={() => { void window.api.open.url(row.pr!.url); }} />
              </div>
            </InfoRow>
          )}

          {/* Commit row */}
          <InfoRow label="Commit">
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, overflow: 'hidden' }}>
              {row.repo.remoteUrl ? (
                <button
                  onClick={(e) => { e.stopPropagation(); void window.api.open.url(`${row.repo.remoteUrl}/commit/${row.headSha}`); }}
                  style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, textDecoration: 'underline' }}
                  title={`Open commit ${row.headSha} on GitHub`}
                >
                  {sha}
                </button>
              ) : (
                <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--fg-muted)', flexShrink: 0 }}>{sha}</code>
              )}
              <CopyButton text={row.headSha} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg)' }}>
                {row.lastCommitSubject || '—'}
              </span>
            </span>
          </InfoRow>

          {/* Path row */}
          <InfoRow label="Path" copyText={row.path}>
            <span title={row.path} style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--fg-muted)' }}>
              {row.path}
            </span>
          </InfoRow>

          {/* Sessions row — before Upstream */}
          {row.sessions.length > 0 && (
            <InfoRow label="Sessions">
              <span style={{ color: 'var(--fg)' }}>
                {row.sessions.length}
                {row.sessions[0]?.title ? <span style={{ color: 'var(--fg-muted)' }}> · {row.sessions[0].title}</span> : null}
              </span>
            </InfoRow>
          )}

          {/* Upstream row */}
          {row.upstream && (
            <InfoRow label="Upstream" copyText={row.upstream}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--fg-muted)' }}>{row.upstream}</span>
            </InfoRow>
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
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y + 14,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--fg)',
          boxShadow: '0 4px 14px var(--shadow)',
          zIndex: 1000,
          pointerEvents: 'none',
          maxWidth: 320,
          lineHeight: 1.9,
        }}>
          {tooltip.lines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      {showSessionPicker && (
        <SessionPickerModal
          sessions={row.sessions}
          terminal={settings.defaultTerminal}
          onResume={(s) => {
            setShowSessionPicker(false);
            window.api.terminals.resumeSession({
              terminal: settings.defaultTerminal,
              launchDir: s.launchDir,
              sessionId: s.sessionId,
            }).then((r) => onToast(r.message)).catch((e) => onToast(String(e)));
          }}
          onClose={() => setShowSessionPicker(false)}
        />
      )}
    </>
  );
}
