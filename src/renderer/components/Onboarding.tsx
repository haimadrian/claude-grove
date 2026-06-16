import React from 'react';

interface Props { onAddRoot: () => Promise<void>; }

export function Onboarding({ onAddRoot }: Props): React.JSX.Element {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16, padding: 32,
    }}>
      <h2 style={{ fontSize: 18 }}>Welcome to Claude Grove</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>
        Add a root folder to scan for git repos and worktrees.
      </p>
      <button
        onClick={onAddRoot}
        style={{ fontSize: 14, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)',
          border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        Choose root folder...
      </button>
    </div>
  );
}
