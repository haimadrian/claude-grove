import React, { useState } from 'react';

interface Props {
  count: number;
  onSetLabel: (label: string) => void;
  onClear: () => void;
}

export function LabelBar({ count, onSetLabel, onClear }: Props): React.JSX.Element {
  const [value, setValue] = useState('');

  const submit = (): void => {
    onSetLabel(value);
    setValue('');
  };

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: '0 4px 16px var(--shadow)',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', zIndex: 300, whiteSpace: 'nowrap',
      animation: 'fadeInSlide var(--transition-fast)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClear(); }}
        placeholder="Label…"
        style={{
          width: 140, padding: '3px 8px', fontSize: 13,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 5, color: 'var(--fg)', outline: 'none',
        }}
        autoFocus
      />
      <button
        onClick={submit}
        style={{
          padding: '3px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 500,
        }}
      >Set</button>
      <button
        onClick={onClear}
        title="Clear selection"
        style={{
          padding: '2px 6px', fontSize: 13, borderRadius: 5, cursor: 'pointer',
          background: 'none', border: 'none', color: 'var(--fg-muted)',
        }}
      >✕</button>
    </div>
  );
}
