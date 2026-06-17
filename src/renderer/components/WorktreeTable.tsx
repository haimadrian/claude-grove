import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { WorktreeRow, TerminalKind } from '../../shared/types';
import { PrBadge } from './PrBadge';
import { SearchBar } from './SearchBar';
import { FilterBar, type Filters } from './FilterBar';

const DEFAULT_FILTERS: Filters = { repo: [], dirty: false, safeToDelete: false, hasPr: false, locked: false };
const COL_COUNT = 7; // Repo, Branch, State, Last commit, Modified, Sessions, PR

const LS_KEY = 'claude-grove:table-state';

interface PersistedTableState {
  filters: Filters;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  colWidths: (number | null)[];
}

function loadPersistedState(): Partial<PersistedTableState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedTableState>) : {};
  } catch { return {}; }
}

function savePersistedState(state: PersistedTableState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const TH: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 20,
  userSelect: 'none', overflow: 'hidden',
};
const TD: React.CSSProperties = {
  padding: '6px 10px', fontSize: 13, borderBottom: '1px solid var(--bg-tertiary)',
  verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const ROW_BTN: React.CSSProperties = {
  fontSize: 14, padding: '2px 6px', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: 4, minWidth: 26, textAlign: 'center' as const,
  color: 'var(--fg)', whiteSpace: 'nowrap', boxShadow: '0 1px 3px var(--shadow)',
};
const DIALOG_BTN: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6,
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};
const RESIZE_HANDLE: React.CSSProperties = {
  position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
  cursor: 'col-resize', zIndex: 2,
};

function buildPrLines(pr: import('../../shared/types').PrInfo): string[] {
  const lines: string[] = [];
  lines.push(`#${pr.number} — ${pr.isDraft ? 'draft ' : ''}${pr.state.toLowerCase()} pull request`);
  if (pr.title) lines.push(`Title: ${pr.title}`);
  if (pr.baseRefName) lines.push(`Target branch: ${pr.baseRefName}`);
  if (pr.checksState === 'PASSING') lines.push('✓ — all CI checks passing');
  else if (pr.checksState === 'FAILING') lines.push('✗ — one or more CI checks failing');
  else if (pr.checksState === 'PENDING') lines.push('○ — CI checks in progress');
  if (pr.reviewDecision === 'APPROVED') lines.push('✓rev — approved by reviewer(s)');
  else if (pr.reviewDecision === 'CHANGES_REQUESTED') lines.push('✗rev — reviewer requested changes');
  else if (pr.reviewDecision === 'REVIEW_REQUIRED') lines.push('review required — awaiting review');
  return lines;
}

function buildStateLines(w: WorktreeRow): string[] {
  const lines: string[] = [];
  if (w.isDirty) lines.push('dirty — uncommitted changes present');
  if (w.ahead > 0) lines.push(`↑${w.ahead} — ${w.ahead} commit${w.ahead !== 1 ? 's' : ''} ahead of upstream`);
  if (w.behind > 0) lines.push(`↓${w.behind} — ${w.behind} commit${w.behind !== 1 ? 's' : ''} behind upstream`);
  if (w.isLocked) lines.push(`🔒 locked${w.lockedReason ? ` — ${w.lockedReason}` : ''}`);
  if (w.isPrunable) lines.push(`prunable${w.prunableReason ? ` — ${w.prunableReason}` : ' — worktree can be pruned'}`);
  if (w.upstreamGone) lines.push('🗑 remote gone — upstream branch was deleted (click badge to remove local worktree)');
  else if (w.pr?.state === 'MERGED') lines.push('✓ merged — PR is merged on GitHub');
  return lines;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface Props {
  worktrees: WorktreeRow[];
  loading: boolean;
  defaultTerminal: TerminalKind;
  onSelect: (wt: WorktreeRow) => void;
  onMessage: (msg: string, ok: boolean) => void;
}

export function WorktreeTable({ worktrees, loading, defaultTerminal, onSelect, onMessage }: Props): React.JSX.Element {
  const [search, setSearch] = useState('');
  const persisted = loadPersistedState();
  const [filters, setFilters] = useState<Filters>(persisted.filters ?? DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState(persisted.sortKey ?? 'repo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(persisted.sortDir ?? 'asc');

  // Drop repo selections that no longer exist in the current worktree list
  useEffect(() => {
    if (filters.repo.length === 0) return;
    const names = new Set(worktrees.map((w) => w.repo.name));
    const valid = filters.repo.filter((r) => names.has(r));
    if (valid.length !== filters.repo.length) {
      setFilters((f) => ({ ...f, repo: valid }));
    }
  }, [worktrees]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [prHoveredId, setPrHoveredId] = useState<string | null>(null);
  const [stateTooltip, setStateTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  const [prTooltip, setPrTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  // null = auto-sized by browser; number = user-set pixel width (restored from localStorage)
  const [colWidths, setColWidths] = useState<(number | null)[]>(
    persisted.colWidths?.length === COL_COUNT ? persisted.colWidths : Array(COL_COUNT).fill(null)
  );
  const [renameState, setRenameState] = useState<{ wt: WorktreeRow; value: string } | null>(null);

  // Persist filter + sort + colWidths whenever they change (after all state is declared)
  useEffect(() => {
    savePersistedState({ filters, sortKey, sortDir, colWidths });
  }, [filters, sortKey, sortDir, colWidths]);
  const [deleteState, setDeleteState] = useState<{ wt: WorktreeRow; deleteRemote: boolean } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const dragging = useRef<{ idx: number; startX: number; startW: number } | null>(null);

  const handleSort = useCallback((key: string): void => {
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number): void => {
    e.preventDefault();
    e.stopPropagation();
    // Snapshot all column widths from the DOM the first time any column is dragged
    const getStartWidth = (): number => {
      if (colWidths[idx] !== null) return colWidths[idx] as number;
      if (!tableRef.current) return 120;
      const ths = Array.from(tableRef.current.querySelectorAll('thead th')).slice(0, COL_COUNT);
      const snapped = ths.map((th) => (th as HTMLElement).getBoundingClientRect().width);
      setColWidths(snapped);
      return snapped[idx] ?? 120;
    };
    const startW = getStartWidth();
    dragging.current = { idx, startX: e.clientX, startW };

    const onMove = (ev: MouseEvent): void => {
      if (!dragging.current) return;
      const delta = ev.clientX - dragging.current.startX;
      const newW = Math.max(60, dragging.current.startW + delta);
      setColWidths((prev) => {
        const next = [...prev];
        next[dragging.current!.idx] = newW;
        return next;
      });
    };
    const onUp = (): void => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const doRename = useCallback((): void => {
    if (!renameState) return;
    const { wt, value } = renameState;
    if (!value.trim() || value === wt.branch) { setRenameState(null); return; }
    setRenameState(null);
    void window.api.worktrees.renameBranch(wt.path, value.trim());
  }, [renameState]);

  const doDelete = useCallback((): void => {
    if (!deleteState) return;
    const { wt, deleteRemote } = deleteState;
    setDeleteState(null);
    window.api.worktrees.remove(wt.path, { force: false, deleteLocalBranch: deleteRemote })
      .then((r) => onMessage(r.message, r.success))
      .catch((e) => onMessage(String(e), false));
  }, [deleteState, onMessage]);

  const hasFixed = colWidths.some((w) => w !== null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return worktrees
      .filter((w) => {
        if (filters.repo.length > 0 && !filters.repo.includes(w.repo.name)) return false;
        if (filters.dirty && !w.isDirty) return false;
        if (filters.safeToDelete && !(w.upstreamGone || w.pr?.state === 'MERGED')) return false;
        if (filters.hasPr && !w.pr) return false;
        if (filters.locked && !w.isLocked) return false;
        if (q) {
          const hay = [w.repo.name, w.branch ?? '', w.path, w.pr?.title ?? ''].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let av = '', bv = '';
        if (sortKey === 'repo') { av = a.repo.name + a.path; bv = b.repo.name + b.path; }
        else if (sortKey === 'branch') { av = a.branch ?? ''; bv = b.branch ?? ''; }
        else if (sortKey === 'lastCommit') { av = a.lastCommitDate; bv = b.lastCommitDate; }
        else if (sortKey === 'modified') { av = a.lastCommitDate; bv = b.lastCommitDate; }
        else if (sortKey === 'sessions') {
          const cmp = a.sessions.length - b.sessions.length;
          return sortDir === 'asc' ? cmp : -cmp;
        } else if (sortKey === 'pr') {
          const cmp = (a.pr?.number ?? 0) - (b.pr?.number ?? 0);
          return sortDir === 'asc' ? cmp : -cmp;
        }
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [worktrees, search, filters, sortKey, sortDir]);

  const thStyle = (idx: number): React.CSSProperties => ({
    ...TH,
    position: 'sticky',
    ...(colWidths[idx] !== null ? { width: colWidths[idx] } : {}),
  });

  const HEADERS = ['Repo', 'Branch', 'State', 'Last commit', 'Modified', 'Sessions', 'PR'];
  // Sort key per header (empty string = not sortable, e.g. State)
  const HEADER_SORT_KEYS = ['repo', 'branch', '', 'lastCommit', 'modified', 'sessions', 'pr'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <SearchBar value={search} onChange={setSearch} />
      <FilterBar
        worktrees={worktrees}
        filters={filters}
        sortKey={sortKey}
        sortDir={sortDir}
        onFilters={setFilters}
        onSort={handleSort}
      />
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading worktrees…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>No worktrees found.</div>
      ) : (
        <table
          ref={tableRef}
          style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: hasFixed ? 'fixed' : 'auto' }}
        >
          <thead>
            <tr>
              {HEADERS.map((label, idx) => {
                const sk = HEADER_SORT_KEYS[idx] ?? '';
                return (
                <th
                  key={label}
                  style={{ ...thStyle(idx), cursor: sk ? 'pointer' : 'default' }}
                  onClick={() => { if (sk) handleSort(sk); }}
                >
                  {label}{sk && sortKey === sk ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  <div style={RESIZE_HANDLE} onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, idx); }} />
                </th>
                );
              })}
              {/* Zero-width th — actions float absolutely, no layout contribution */}
              <th style={{ ...TH, width: 0, padding: 0, overflow: 'visible' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const hovered = hoveredId === w.id;
              const rowBg = hovered ? 'var(--bg-secondary)' : undefined;
              return (
                <tr
                  key={w.id}
                  style={{ background: rowBg }}
                  onMouseEnter={() => setHoveredId(w.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <td style={TD} title={w.repo.path}>{w.repo.name}</td>
                  <td style={TD} title={w.path}>{w.branch ?? <em style={{ color: 'var(--fg-muted)' }}>detached</em>}</td>
                  <td
                    style={{ ...TD, overflow: 'visible', whiteSpace: 'normal' }}
                    onMouseEnter={(e) => { if (buildStateLines(w).length > 0) setStateTooltip({ id: w.id, x: e.clientX, y: e.clientY }); }}
                    onMouseMove={(e) => { if (stateTooltip?.id === w.id) setStateTooltip({ id: w.id, x: e.clientX, y: e.clientY }); }}
                    onMouseLeave={() => setStateTooltip(null)}
                  >
                    {w.isDirty && <span style={{ color: 'var(--warn)', marginRight: 4 }}>dirty</span>}
                    {w.ahead > 0 && <span style={{ color: 'var(--ok)', marginRight: 4 }}>↑{w.ahead}</span>}
                    {w.behind > 0 && <span style={{ color: 'var(--danger)', marginRight: 4 }}>↓{w.behind}</span>}
                    {w.isLocked && <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>🔒</span>}
                    {w.isPrunable && <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>prunable</span>}
                    {w.upstreamGone && (
                      <span
                        style={{ color: 'var(--warn)', cursor: 'pointer', marginRight: 4 }}
                        title="Remote branch deleted — click to delete local worktree"
                        onClick={(e) => { e.stopPropagation(); setDeleteState({ wt: w, deleteRemote: false }); }}
                      >
                        🗑 remote gone
                      </span>
                    )}
                    {!w.upstreamGone && w.pr?.state === 'MERGED' && (
                      <span style={{ color: 'var(--ok)' }}>✓ merged</span>
                    )}
                  </td>
                  <td style={TD} title={w.lastCommitDate}>{w.lastCommitSubject || '—'}</td>
                  <td style={TD} title={w.lastCommitDate}>{formatDate(w.lastCommitDate)}</td>
                  <td style={TD}>
                    {w.sessions.length > 0 ? (
                      <span title={w.sessions[0]?.title ?? undefined}>
                        {w.sessions.length} {w.sessions[0]?.title ? `· ${w.sessions[0].title}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td
                    style={TD}
                    onMouseEnter={(e) => {
                      setPrHoveredId(w.id);
                      if (w.pr) setPrTooltip({ id: w.id, x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => { if (prTooltip?.id === w.id) setPrTooltip({ id: w.id, x: e.clientX, y: e.clientY }); }}
                    onMouseLeave={() => { setPrHoveredId(null); setPrTooltip(null); }}
                  >
                    <PrBadge
                      pr={w.pr}
                      {...(w.pr ? { onClick: () => { void window.api.open.url(w.pr!.url); } } : {})}
                    />
                  </td>
                  {/* Floating actions — absolutely positioned so they don't affect table width */}
                  <td style={{
                    padding: 0, width: 0,
                    borderBottom: '1px solid var(--bg-tertiary)',
                    position: 'relative', overflow: 'visible',
                  }}>
                    <div style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', gap: 4, alignItems: 'center',
                      opacity: (hovered && prHoveredId !== w.id) ? 1 : 0,
                      transition: 'opacity 0.15s',
                      pointerEvents: (hovered && prHoveredId !== w.id) ? 'auto' : 'none',
                      background: rowBg ?? 'var(--bg)',
                      padding: '2px 4px', borderRadius: 6,
                      boxShadow: hovered ? '0 2px 8px var(--shadow)' : 'none',
                      whiteSpace: 'nowrap', zIndex: 10,
                    }}>
                      <button onClick={() => onSelect(w)} style={ROW_BTN} title="View commits and diff">👁</button>
                      {w.sessions[0] && (
                        <button
                          onClick={() => {
                            window.api.terminals.resumeSession({
                              terminal: defaultTerminal,
                              launchDir: w.sessions[0]!.launchDir,
                              sessionId: w.sessions[0]!.sessionId,
                            }).then((r) => onMessage(r.message, r.success)).catch((e) => onMessage(String(e), false));
                          }}
                          style={{ ...ROW_BTN, color: 'var(--accent)' }}
                          title={`Resume Claude session: ${w.sessions[0].title ?? w.sessions[0].sessionId}`}
                        >▶</button>
                      )}
                      <button
                        onClick={() => window.api.open.editor(w.path).then((r) => { if (!r.success) onMessage(r.message, false); }).catch((e) => onMessage(String(e), false))}
                        style={ROW_BTN} title="Open in editor"
                      >✏</button>
                      {w.branch && (
                        <button
                          onClick={() => setRenameState({ wt: w, value: w.branch! })}
                          style={ROW_BTN}
                          title="Rename branch locally and on remote"
                        >✎</button>
                      )}
                      <button
                        onClick={() => setDeleteState({ wt: w, deleteRemote: false })}
                        style={{ ...ROW_BTN, color: 'var(--danger)' }}
                        title="Delete worktree"
                      >🗑</button>
                      <button onClick={() => void window.api.open.finder(w.path)} style={ROW_BTN} title="Reveal in Finder">📂</button>
                      {w.repo.remoteUrl && (
                        <button onClick={() => void window.api.open.url(w.repo.remoteUrl!)} style={ROW_BTN} title="Open on GitHub">↗</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
      {stateTooltip && (() => {
        const row = filtered.find((w) => w.id === stateTooltip.id);
        const lines = row ? buildStateLines(row) : [];
        if (lines.length === 0) return null;
        return (
          <div style={{
            position: 'fixed', left: stateTooltip.x + 14, top: stateTooltip.y + 14,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--fg)',
            boxShadow: '0 4px 14px var(--shadow)', zIndex: 1000, pointerEvents: 'none',
            maxWidth: 320, lineHeight: 1.9,
          }}>
            {lines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        );
      })()}
      {prTooltip && (() => {
        const row = filtered.find((w) => w.id === prTooltip.id);
        if (!row?.pr) return null;
        const lines = buildPrLines(row.pr);
        return (
          <div style={{
            position: 'fixed', left: prTooltip.x + 14, top: prTooltip.y + 14,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--fg)',
            boxShadow: '0 4px 14px var(--shadow)', zIndex: 1000, pointerEvents: 'none',
            maxWidth: 360, lineHeight: 1.9,
          }}>
            {lines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        );
      })()}
      {renameState && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px var(--shadow)',
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Rename branch</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
              Current: <code>{renameState.wt.branch}</code><br />
              Renames locally and on remote.
            </p>
            <input
              autoFocus
              value={renameState.value}
              onChange={(e) => setRenameState((s) => s ? { ...s, value: e.target.value } : null)}
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
      {deleteState && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--shadow)',
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Delete worktree</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>
              Branch: <code style={{ color: 'var(--fg)' }}>{deleteState.wt.branch ?? 'detached'}</code>
            </p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, wordBreak: 'break-all' }}>
              {deleteState.wt.path}
            </p>
            {(deleteState.wt.upstreamGone || deleteState.wt.pr?.state === 'MERGED') ? (
              <p style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 12 }}>✓ Safe to delete (upstream gone or PR merged)</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 12 }}>⚠ Branch may not be merged yet.</p>
            )}
            {deleteState.wt.branch && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteState.deleteRemote}
                  onChange={(e) => setDeleteState((s) => s ? { ...s, deleteRemote: e.target.checked } : null)}
                />
                Also delete remote branch
                {deleteState.wt.upstreamGone && (
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
    </div>
  );
}
