import React, { useState } from 'react';

interface Props {
  text: string;
  style?: React.CSSProperties;
}

export function CopyButton({ text, style }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* ignore */ });
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      style={{
        background: copied ? 'rgba(26,127,55,0.10)' : 'var(--bg-tertiary)',
        border: `1px solid ${copied ? 'rgba(26,127,55,0.4)' : 'var(--border)'}`,
        borderRadius: 4,
        cursor: 'pointer',
        padding: '2px 7px',
        fontSize: 14,
        fontWeight: 600,
        color: copied ? 'var(--ok)' : 'var(--fg-muted)',
        lineHeight: 1,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out',
        ...style,
      }}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}
