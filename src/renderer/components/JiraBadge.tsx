import React from 'react';
import { extractJiraId } from '../../shared/jiraLink';

interface Props {
  branch: string | null;
  jiraBaseUrl: string;
}

export function JiraBadge({ branch, jiraBaseUrl }: Props): React.JSX.Element | null {
  if (!jiraBaseUrl.trim()) return null;
  const id = extractJiraId(branch);
  if (!id) return null;
  const base = jiraBaseUrl.trim().replace(/\/$/, '');
  return (
    <button
      onClick={(e) => { e.stopPropagation(); void window.api.open.url(`${base}/${id}`); }}
      title={`Open ${id} in Jira`}
      style={{
        fontFamily: 'monospace', fontSize: 10, padding: '1px 6px', borderRadius: 10,
        background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)',
        cursor: 'pointer', flexShrink: 0, fontWeight: 600, lineHeight: 1.6,
      }}
    >
      {id}
    </button>
  );
}
