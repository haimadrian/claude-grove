import React from 'react';
import type { WorktreeRow } from '../../shared/types';

export interface Filters {
  repo: string | null;
  dirty: boolean;
  safeToDelete: boolean;
  hasPr: boolean;
  locked: boolean;
}

interface Props {
  worktrees: WorktreeRow[];
  filters: Filters;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onFilters: (f: Filters) => void;
  onSort: (key: string) => void;
}

const CHIP_STYLE: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--fg)',
  userSelect: 'none',
};
const CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP_STYLE, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)',
};

export function FilterBar({ worktrees, filters, sortKey, sortDir, onFilters, onSort }: Props): React.JSX.Element {
  const repos = [...new Set(worktrees.map((w) => w.repo.name))].sort();

  const toggle = (key: keyof Omit<Filters, 'repo'>): void =>
    onFilters({ ...filters, [key]: !filters[key] });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '8px 0' }}>
      {repos.map((r) => (
        <span
          key={r}
          style={filters.repo === r ? CHIP_ACTIVE : CHIP_STYLE}
          onClick={() => onFilters({ ...filters, repo: filters.repo === r ? null : r })}
        >
          {r}
        </span>
      ))}
      <span style={filters.dirty ? CHIP_ACTIVE : CHIP_STYLE} onClick={() => toggle('dirty')}>dirty</span>
      <span style={filters.safeToDelete ? CHIP_ACTIVE : CHIP_STYLE} onClick={() => toggle('safeToDelete')}>safe to delete</span>
      <span style={filters.hasPr ? CHIP_ACTIVE : CHIP_STYLE} onClick={() => toggle('hasPr')}>has PR</span>
      <span style={filters.locked ? CHIP_ACTIVE : CHIP_STYLE} onClick={() => toggle('locked')}>locked</span>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
        Sort:{' '}
        {['repo', 'branch', 'lastCommit', 'sessions', 'pr'].map((k) => (
          <span
            key={k}
            style={{ ...CHIP_STYLE, display: 'inline', marginLeft: 4 }}
            onClick={() => onSort(k)}
          >
            {k}{sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </span>
        ))}
      </span>
    </div>
  );
}
