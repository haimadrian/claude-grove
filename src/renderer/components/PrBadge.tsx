import React from 'react';
import type { PrInfo } from '../../shared/types';

interface Props { pr: PrInfo | null; onClick?: () => void; }

export function PrBadge({ pr, onClick }: Props): React.JSX.Element {
  if (!pr) return <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>;

  const stateColor = pr.state === 'OPEN' ? 'var(--ok)' : pr.state === 'MERGED' ? 'var(--accent)' : 'var(--fg-muted)';
  const checksIcon = pr.checksState === 'PASSING' ? '✓' : pr.checksState === 'FAILING' ? '✗' : pr.checksState === 'PENDING' ? '○' : '';
  const checksColor = pr.checksState === 'PASSING' ? 'var(--ok)' : pr.checksState === 'FAILING' ? 'var(--danger)' : 'var(--warn)';

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span style={{ color: stateColor, fontWeight: 500, fontSize: 12 }}>
        #{pr.number} {pr.state}
      </span>
      {pr.isDraft && <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>draft</span>}
      {checksIcon && <span style={{ color: checksColor, fontSize: 12 }}>{checksIcon}</span>}
      {pr.reviewDecision === 'APPROVED' && <span style={{ color: 'var(--ok)', fontSize: 12 }}>✓rev</span>}
      {pr.reviewDecision === 'CHANGES_REQUESTED' && <span style={{ color: 'var(--danger)', fontSize: 12 }}>✗rev</span>}
    </span>
  );
}
