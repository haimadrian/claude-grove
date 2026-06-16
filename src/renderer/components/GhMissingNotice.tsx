import React from 'react';

export function GhMissingNotice({ installed }: { installed: boolean }): React.JSX.Element {
  return (
    <div style={{
      padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 6, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8,
    }}>
      {!installed ? (
        <>
          <strong>gh CLI not found.</strong> Install with: <code>brew install gh</code>, then <code>gh auth login</code>.{' '}
          <a href="https://cli.github.com" onClick={(e) => { e.preventDefault(); window.api.open.url('https://cli.github.com'); }}>
            cli.github.com
          </a>
        </>
      ) : (
        <>
          <strong>gh CLI not authenticated.</strong> Run: <code>gh auth login</code>
        </>
      )}
    </div>
  );
}
