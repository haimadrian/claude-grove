import React, { useState, useRef, useEffect } from 'react';

interface BranchPickerProps {
  branches: string[];
  value: string | null;
  autoLabel: string;
  onChange: (branch: string | null) => void;
  placeholder?: string;
  triggerLabel: string;
  showAuto?: boolean;
}

const CHIP: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--fg)',
  userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
};

export function BranchPicker({ branches, value, autoLabel, onChange, placeholder, triggerLabel, showAuto = true }: BranchPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openDropdown = (): void => {
    if (open) { setOpen(false); return; }
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setSearch('');
    setOpen(true);
  };

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const visible = search.trim()
    ? branches.filter((b) => b.toLowerCase().includes(search.toLowerCase()))
    : branches;

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openDropdown}
        style={CHIP}
        title="Pick a branch"
      >
        <span>{triggerLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {open && pos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)',
            zIndex: 2000, width: 260, padding: '6px 0',
          }}
        >
          <div style={{ padding: '0 10px 6px' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder={placeholder ?? 'Search branches…'}
              style={{
                width: '100%', padding: '5px 8px', fontSize: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)', outline: 'none',
              }}
            />
          </div>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />
          {showAuto && !search.trim() && (
            <div
              onClick={() => { onChange(null); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer',
                fontSize: 13, color: value === null ? 'var(--accent)' : 'var(--fg)', fontWeight: value === null ? 600 : 400,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              Auto ({autoLabel})
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {visible.length === 0 && (
              <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>No match</div>
            )}
            {visible.map((b) => (
              <div
                key={b}
                onClick={() => { onChange(b); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer',
                  fontSize: 13, color: value === b ? 'var(--accent)' : 'var(--fg)', fontWeight: value === b ? 600 : 400,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
