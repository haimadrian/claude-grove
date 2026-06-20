import React, { useState, useMemo, useEffect } from 'react';
import type { WorktreeRow, Settings } from '../../shared/types';
import { SearchBar } from './SearchBar';
import { FilterBar, type Filters } from './FilterBar';
import { WorktreeCard } from './WorktreeCard';
import { Toast, useToast } from './Toast';

const DEFAULT_FILTERS: Filters = { repo: [], dirty: false, safeToDelete: false, hasPr: false, locked: false };

const LS_KEY = 'claude-grove:card-state';

interface PersistedCardState {
  filters: Filters;
  sortKey: string;
  sortDir: 'asc' | 'desc';
}

function loadPersistedState(): Partial<PersistedCardState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedCardState>) : {};
  } catch { return {}; }
}

function savePersistedState(state: PersistedCardState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export interface WorktreeCardGridProps {
  worktrees: WorktreeRow[];
  settings: Settings;
  onSelect: (row: WorktreeRow) => void;
  onRefresh: () => void;
}

export function WorktreeCardGrid({ worktrees, settings, onSelect, onRefresh }: WorktreeCardGridProps): React.JSX.Element {
  const persisted = loadPersistedState();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(persisted.filters ?? DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState(persisted.sortKey ?? 'repo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(persisted.sortDir ?? 'asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  // Drop repo selections that no longer exist in the current worktree list
  useEffect(() => {
    if (filters.repo.length === 0 || worktrees.length === 0) return;
    const names = new Set(worktrees.map((w) => w.repo.name));
    const valid = filters.repo.filter((r) => names.has(r));
    if (valid.length !== filters.repo.length) {
      setFilters((f) => ({ ...f, repo: valid }));
    }
  }, [worktrees]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist filter + sort whenever they change
  useEffect(() => {
    savePersistedState({ filters, sortKey, sortDir });
  }, [filters, sortKey, sortDir]);

  const handleSort = (key: string): void => {
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  };

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
      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>
          No worktrees match the current filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
            padding: 12,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {filtered.map((row) => (
            <WorktreeCard
              key={row.id}
              row={row}
              settings={settings}
              onSelect={onSelect}
              onRefresh={onRefresh}
              onToast={(msg) => showToast(msg, 'ok')}
              openMenuId={openMenuId}
              onMenuOpen={setOpenMenuId}
            />
          ))}
        </div>
      )}
      {toast !== null && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
