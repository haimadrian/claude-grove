import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { WorktreeRow, Settings } from '../../shared/types';
import { SearchBar } from './SearchBar';
import { FilterBar, type Filters } from './FilterBar';
import { WorktreeCard } from './WorktreeCard';
import { Toast, useToast } from './Toast';
import { useLabels } from '../hooks/useLabels';
import { LabelBar } from './LabelBar';

const DEFAULT_FILTERS: Filters = { repo: [], dirty: false, safeToDelete: false, hasPr: false, locked: false, label: [] };

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
  loading?: boolean;
  onSelect: (row: WorktreeRow) => void;
  onRefresh: () => void;
}

function shimmerBlock(width: number | string, delay: number, height = 13): React.CSSProperties {
  return {
    height,
    width,
    borderRadius: 4,
    background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
    animationDelay: `${delay}ms`,
    flexShrink: 0,
  };
}

function SkeletonCard({ height, delay }: { height: number; delay: number }): React.JSX.Element {
  const d = (offset: number): number => delay + offset;
  return (
    <div style={{
      borderRadius: 8,
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--bg-tertiary)',
      background: 'var(--bg-secondary)',
      boxShadow: '0 1px 3px var(--shadow)',
      height,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', gap: 8 }}>
        <div style={shimmerBlock(70, d(0))} />
        <div style={shimmerBlock(110, d(40))} />
      </div>
      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />
      {/* Body rows */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
        <div style={shimmerBlock(160, d(80))} />
        <div style={shimmerBlock(200, d(120))} />
        <div style={shimmerBlock(140, d(160))} />
        <div style={shimmerBlock(180, d(200))} />
        <div style={shimmerBlock(120, d(240))} />
        <div style={shimmerBlock(90, d(280))} />
      </div>
    </div>
  );
}

function GroupHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', gridColumn: '1 / -1' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
      }}>
        {label || 'All'}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export function WorktreeCardGrid({ worktrees, settings, loading, onSelect, onRefresh }: WorktreeCardGridProps): React.JSX.Element {
  const persisted = loadPersistedState();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(persisted.filters ?? DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState(persisted.sortKey ?? 'repo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(persisted.sortDir ?? 'asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { labels, setLabel } = useLabels();

  const handleShiftClick = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const gridRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const GAP = 12;
    const PAD = 12;
    const compute = (): void => {
      const h = el.clientHeight;
      const rowH = Math.floor((h - PAD * 2 - GAP * 2) / 3);
      setCardHeight(Math.max(rowH, 160));
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
        if (filters.label.length > 0) {
          const wLabel = labels[w.path] ?? '';
          if (!filters.label.includes(wLabel)) return false;
        }
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
  }, [worktrees, search, filters, sortKey, sortDir, labels]);

  const hasAnyLabel = filtered.some((r) => labels[r.path]);

  const groups: { label: string; rows: typeof filtered }[] = hasAnyLabel
    ? (() => {
        const unlabeled = filtered.filter((r) => !labels[r.path]);
        const labelMap = new Map<string, typeof filtered>();
        for (const r of filtered.filter((r) => labels[r.path])) {
          const l = labels[r.path]!;
          if (!labelMap.has(l)) labelMap.set(l, []);
          labelMap.get(l)!.push(r);
        }
        const result: { label: string; rows: typeof filtered }[] = [];
        if (unlabeled.length > 0) result.push({ label: '', rows: unlabeled });
        for (const [l, rows] of labelMap) result.push({ label: l, rows });
        return result;
      })()
    : [{ label: '', rows: filtered }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      <SearchBar value={search} onChange={setSearch} />
      <FilterBar
        worktrees={worktrees}
        filters={filters}
        sortKey={sortKey}
        sortDir={sortDir}
        onFilters={setFilters}
        onSort={handleSort}
      />
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: cardHeight,
          gap: 12,
          padding: 12,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {loading ? (
          /* Skeleton cards while loading — 9 to fill the 3×3 grid */
          Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} height={cardHeight} delay={i * 80} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-muted)', fontSize: 13,
          }}>
            No worktrees match the current filters.
          </div>
        ) : (
          groups.map(({ label, rows }) => (
            <React.Fragment key={label || '__all__'}>
              {hasAnyLabel && <GroupHeader label={label} />}
              {rows.map((row) => (
                <WorktreeCard
                  key={row.id}
                  row={row}
                  settings={settings}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                  onToast={(msg) => showToast(msg, 'ok')}
                  openMenuId={openMenuId}
                  onMenuOpen={setOpenMenuId}
                  cardHeight={cardHeight}
                  selected={selectedIds.has(row.id)}
                  onShiftClick={handleShiftClick}
                />
              ))}
            </React.Fragment>
          ))
        )}
      </div>
      {selectedIds.size > 0 && (
        <LabelBar
          count={selectedIds.size}
          onSetLabel={(label) => {
            const paths = filtered
              .filter((r) => selectedIds.has(r.id))
              .map((r) => r.path);
            setLabel(paths, label);
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
      {toast !== null && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </div>
  );
}
