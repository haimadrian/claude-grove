import React, { useState, useRef, useEffect } from 'react';
import type { WorktreeRow } from '../../shared/types';
import { useLabels } from '../hooks/useLabels';

export interface Filters {
  repo: string[];
  dirty: boolean;
  safeToDelete: boolean;
  hasPr: boolean;
  locked: boolean;
  label: string[];
}

interface Props {
  worktrees: WorktreeRow[];
  filters: Filters;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onFilters: (f: Filters) => void;
  onSort: (key: string) => void;
}

const CHIP: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--fg)',
  userSelect: 'none',
};
const CHIP_ON: React.CSSProperties = {
  ...CHIP, background: 'var(--accent)', color: 'var(--bg)', border: '1px solid var(--accent)',
};

const SORT_KEYS = ['repo', 'branch', 'lastCommit', 'modified', 'sessions', 'pr'] as const;
const SORT_LABEL: Record<string, string> = {
  repo: 'Repo', branch: 'Branch', lastCommit: 'Last commit',
  modified: 'Modified', sessions: 'Sessions', pr: 'PR',
};

export function FilterBar({ worktrees, filters, sortKey, sortDir, onFilters, onSort }: Props): React.JSX.Element {
  const repos = [...new Set(worktrees.map((w) => w.repo.name))].sort();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { labels } = useLabels();
  const allLabels = [...new Set(Object.values(labels).filter((v): v is string => Boolean(v)))].sort();

  const [labelOpen, setLabelOpen] = useState(false);
  const [labelPos, setLabelPos] = useState<{ top: number; left: number } | null>(null);
  const [labelSearch, setLabelSearch] = useState('');
  const labelBtnRef = useRef<HTMLButtonElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);

  const toggle = (key: keyof Omit<Filters, 'repo' | 'label'>): void =>
    onFilters({ ...filters, [key]: !filters[key] });

  const toggleRepo = (r: string): void => {
    const next = filters.repo.includes(r)
      ? filters.repo.filter((x) => x !== r)
      : [...filters.repo, r];
    onFilters({ ...filters, repo: next });
  };

  const openDropdown = (): void => {
    if (open) { setOpen(false); return; }
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setRepoSearch('');
    setOpen(true);
  };

  // Focus the search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggleLabel = (l: string): void => {
    const next = filters.label.includes(l)
      ? filters.label.filter((x) => x !== l)
      : [...filters.label, l];
    onFilters({ ...filters, label: next });
  };

  const openLabelDropdown = (): void => {
    if (labelOpen) { setLabelOpen(false); return; }
    if (!labelBtnRef.current) return;
    const rect = labelBtnRef.current.getBoundingClientRect();
    setLabelPos({ top: rect.bottom + 4, left: rect.left });
    setLabelSearch('');
    setLabelOpen(true);
  };

  useEffect(() => {
    if (labelOpen) setTimeout(() => labelSearchRef.current?.focus(), 50);
  }, [labelOpen]);

  useEffect(() => {
    if (!labelOpen) return;
    const close = (): void => setLabelOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [labelOpen]);

  const allLabelsSelected = allLabels.length > 0 && allLabels.every((l) => filters.label.includes(l));
  const someLabelsSelected = filters.label.length > 0 && !allLabelsSelected;

  const toggleAllLabels = (): void => {
    onFilters({ ...filters, label: allLabelsSelected ? [] : [...allLabels] });
  };

  const selectedCount = filters.repo.length;
  const repoLabel = selectedCount === 0
    ? 'All repos'
    : selectedCount === 1
    ? filters.repo[0]!
    : `${selectedCount} repos`;

  const visibleRepos = repoSearch.trim()
    ? repos.filter((r) => r.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos;

  const allSelected = repos.length > 0 && repos.every((r) => filters.repo.includes(r));
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleAll = (): void => {
    onFilters({ ...filters, repo: allSelected ? [] : [...repos] });
  };

  const selectedLabelCount = filters.label.length;
  const labelBtnLabel = selectedLabelCount === 0
    ? 'All labels'
    : selectedLabelCount === 1
    ? filters.label[0]!
    : `${selectedLabelCount} labels`;

  const visibleLabels = labelSearch.trim()
    ? allLabels.filter((l) => l.toLowerCase().includes(labelSearch.toLowerCase()))
    : allLabels;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', margin: '8px 0' }}>

      {/* Repos multi-select dropdown */}
      <button
        ref={btnRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openDropdown}
        style={{
          ...CHIP,
          minWidth: 120,
          ...(selectedCount > 0 ? { background: 'var(--accent)', color: 'var(--bg)', border: '1px solid var(--accent)' } : {}),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        }}
      >
        <span>{repoLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {open && pos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)',
            zIndex: 2000, width: 240, padding: '6px 0',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '0 10px 6px' }}>
            <input
              ref={searchRef}
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder="Search repos…"
              style={{
                width: '100%', padding: '5px 8px', fontSize: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)', outline: 'none',
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />

          {/* Select all checkbox — only shown when not filtering by text */}
          {!repoSearch.trim() && repos.length > 0 && (
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = ''; }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              All repos
            </label>
          )}

          {/* Repo list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {visibleRepos.length === 0 && (
              <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>No match</div>
            )}
            {visibleRepos.map((r) => (
              <label
                key={r}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = ''; }}
              >
                <input
                  type="checkbox"
                  checked={filters.repo.includes(r)}
                  onChange={() => toggleRepo(r)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                {r}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Labels multi-select dropdown */}
      <button
        ref={labelBtnRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openLabelDropdown}
        style={{
          ...CHIP,
          minWidth: 120,
          ...(selectedLabelCount > 0 ? { background: 'var(--accent)', color: 'var(--bg)', border: '1px solid var(--accent)' } : {}),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        }}
      >
        <span>{labelBtnLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {labelOpen && labelPos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: labelPos.top, left: labelPos.left,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)',
            zIndex: 2000, width: 200, padding: '6px 0',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '0 10px 6px' }}>
            <input
              ref={labelSearchRef}
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setLabelOpen(false); }}
              placeholder="Search labels…"
              style={{
                width: '100%', padding: '5px 8px', fontSize: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)', outline: 'none',
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />

          {/* Select all checkbox — only shown when not filtering by text */}
          {!labelSearch.trim() && allLabels.length > 0 && (
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--fg-muted)', fontWeight: 500 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = ''; }}
            >
              <input
                type="checkbox"
                checked={allLabelsSelected}
                ref={(el) => { if (el) el.indeterminate = someLabelsSelected; }}
                onChange={toggleAllLabels}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              All labels
            </label>
          )}

          {/* Label list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {visibleLabels.length === 0 && (
              <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>No match</div>
            )}
            {visibleLabels.map((l) => (
              <label
                key={l}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = ''; }}
              >
                <input
                  type="checkbox"
                  checked={filters.label.includes(l)}
                  onChange={() => toggleLabel(l)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sort — flows naturally after the dropdown */}
      <span style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        Sort:
        {SORT_KEYS.map((k) => (
          <span key={k} style={{ ...CHIP, padding: '3px 7px' }} onClick={() => onSort(k)}>
            {SORT_LABEL[k]}{sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </span>
        ))}
      </span>

      {/* Boolean filter chips */}
      <span style={filters.dirty ? CHIP_ON : CHIP} onClick={() => toggle('dirty')}>dirty</span>
      <span style={filters.safeToDelete ? CHIP_ON : CHIP} onClick={() => toggle('safeToDelete')}>safe to delete</span>
      <span style={filters.hasPr ? CHIP_ON : CHIP} onClick={() => toggle('hasPr')}>has PR</span>
      <span style={filters.locked ? CHIP_ON : CHIP} onClick={() => toggle('locked')}>locked</span>
    </div>
  );
}
