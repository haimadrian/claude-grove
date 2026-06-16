import React from 'react';

interface Props { value: string; onChange: (v: string) => void; }

export function SearchBar({ value, onChange }: Props): React.JSX.Element {
  return (
    <input
      type="search"
      placeholder="Search repo, branch, path, PR…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', padding: '6px 10px', background: 'var(--bg-secondary)',
        border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)',
        fontSize: 13, outline: 'none',
      }}
    />
  );
}
