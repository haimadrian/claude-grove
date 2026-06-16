import React, { useState, useEffect } from 'react';
import type { Commit } from '../../shared/types';

interface Props {
  worktreePath: string;
  onDiff: (diff: string) => void;
  onFullDiff: () => void;
}

export function CommitList({ worktreePath, onDiff, onFullDiff }: Props): React.JSX.Element {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.api.worktrees.commits(worktreePath).then((c) => {
      setCommits(c);
      setLoading(false);
    });
  }, [worktreePath]);

  const handleSelect = (commit: Commit): void => {
    setSelected(commit.sha);
    window.api.worktrees.commitDiff(worktreePath, commit.sha).then(onDiff);
  };

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>Loading commits...</div>;
  }
  if (commits.length === 0) {
    return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>No commits beyond base branch.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>COMMITS</span>
        <button
          onClick={onFullDiff}
          style={{
            fontSize: 11, padding: '2px 8px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--fg)',
          }}
        >
          Full diff vs base
        </button>
      </div>
      {commits.map((c) => (
        <div
          key={c.sha}
          onClick={() => handleSelect(c)}
          style={{
            padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13,
            background: selected === c.sha ? 'var(--bg-secondary)' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={(e) => {
            if (selected !== c.sha) {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              selected === c.sha ? 'var(--bg-secondary)' : 'transparent';
          }}
        >
          <code style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>{c.shortSha}</code>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>{c.author}</span>
        </div>
      ))}
    </div>
  );
}
