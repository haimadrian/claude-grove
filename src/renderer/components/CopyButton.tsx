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
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 3px',
        fontSize: 12,
        color: copied ? 'var(--ok)' : 'var(--fg-muted)',
        lineHeight: 1,
        flexShrink: 0,
        borderRadius: 3,
        transition: 'color 120ms ease-out',
        ...style,
      }}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}
