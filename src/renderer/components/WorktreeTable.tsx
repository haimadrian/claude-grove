import React, { useState, useMemo, useCallback } from 'react';
import type { WorktreeRow } from '../../shared/types';
import { PrBadge } from './PrBadge';
import { SearchBar } from './SearchBar';
import { FilterBar, type Filters } from './FilterBar';

const DEFAULT_FILTERS: Filters = { repo: null, dirty: false, safeToDelete: false, hasPr: false, locked: false };

const TH: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
};
const TD: React.CSSProperties = {
  padding: '6px 10px', fontSize: 13, borderBottom: '1px solid var(--bg-tertiary)',
  verticalAlign: 'middle', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const ROW_BTN: React.CSSProperties = {
  fontSize: 11, padding: '2px 8px', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--fg)', whiteSpace: 'nowrap', boxShadow: '0 1px 3px var(--shadow)',
};

interface Props {
  worktrees: WorktreeRow[];
  loading: boolean;
  onSelect: (wt: WorktreeRow) => void;
}

export function WorktreeTable({ worktrees, loading, onSelect }: Props): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState('repo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSort = useCallback((key: string): void => {
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return worktrees
      .filter((w) => {
        if (filters.repo && w.repo.name !== filters.repo) return false;
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

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      <FilterBar
        worktrees={worktrees}
        filters={filters}
        sortKey={sortKey}
        sortDir={sortDir}
        onFilters={setFilters}
        onSort={handleSort}
      />
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading worktrees…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>No worktrees found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Repo</th>
              <th style={TH}>Branch</th>
              <th style={TH}>State</th>
              <th style={TH}>Last commit</th>
              <th style={TH}>Sessions</th>
              <th style={TH}>PR</th>
              <th style={{ ...TH, width: 0, padding: 0 }} />
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
                  <td style={{ ...TD, maxWidth: 'none' }}>
                    {w.isDirty && <span style={{ color: 'var(--warn)', marginRight: 4 }}>dirty</span>}
                    {w.ahead > 0 && <span style={{ color: 'var(--ok)', marginRight: 4 }}>↑{w.ahead}</span>}
                    {w.behind > 0 && <span style={{ color: 'var(--danger)', marginRight: 4 }}>↓{w.behind}</span>}
                    {w.isLocked && <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>🔒</span>}
                    {w.isPrunable && <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>prunable</span>}
                    {(w.upstreamGone || w.pr?.state === 'MERGED') && <span style={{ color: 'var(--ok)' }}>✓ safe</span>}
                  </td>
                  <td style={TD} title={w.lastCommitDate}>{w.lastCommitSubject || '—'}</td>
                  <td style={TD}>
                    {w.sessions.length > 0 ? (
                      <span title={w.sessions[0]?.title ?? undefined}>
                        {w.sessions.length} {w.sessions[0]?.title ? `· ${w.sessions[0].title.slice(0, 30)}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={TD}>
                    <PrBadge
                      pr={w.pr}
                      {...(w.pr ? { onClick: () => { void window.api.open.url(w.pr!.url); } } : {})}
                    />
                  </td>
                  {/* Floating actions — sticky right, fade in on row hover */}
                  <td style={{
                    ...TD, maxWidth: 'none', padding: '0 8px',
                    position: 'sticky', right: 0,
                    background: rowBg ?? 'var(--bg)',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{
                      display: 'flex', gap: 4, alignItems: 'center',
                      opacity: hovered ? 1 : 0,
                      transition: 'opacity 0.15s',
                      pointerEvents: hovered ? 'auto' : 'none',
                    }}>
                      <button onClick={() => onSelect(w)} style={ROW_BTN} title="View commits and diff">View</button>
                      <button onClick={() => void window.api.open.editor(w.path)} style={ROW_BTN} title="Open in editor">Edit</button>
                      <button onClick={() => void window.api.open.finder(w.path)} style={ROW_BTN} title="Reveal in Finder">Finder</button>
                      {w.repo.remoteUrl && (
                        <button onClick={() => void window.api.open.url(w.repo.remoteUrl!)} style={ROW_BTN} title="Open on GitHub">GitHub</button>
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
  );
}
