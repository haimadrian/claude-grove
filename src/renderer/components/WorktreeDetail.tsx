import React, { useState, useCallback } from 'react';
import type { WorktreeRow } from '../../shared/types';
import { PrBadge } from './PrBadge';
import { CommitList } from './CommitList';
import { DiffViewer } from './DiffViewer';

interface Props {
  worktree: WorktreeRow;
  onBack: () => void;
}

export function WorktreeDetail({ worktree, onBack }: Props): React.JSX.Element {
  const [diff, setDiff] = useState<string>('');

  const loadFullDiff = useCallback((): void => {
    window.api.worktrees.fullDiff(worktree.path).then(setDiff);
  }, [worktree.path]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', marginBottom: 12, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, padding: '3px 8px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
            color: 'var(--fg)', marginBottom: 8,
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{worktree.branch ?? 'detached HEAD'}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{worktree.repo.name}</span>
          <PrBadge
            pr={worktree.pr}
            {...(worktree.pr ? { onClick: () => window.api.open.url(worktree.pr!.url) } : {})}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'monospace' }}>
          {worktree.path}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => window.api.open.editor(worktree.path)}
            style={ACTION_BTN}
          >
            Open in editor
          </button>
          <button
            onClick={() => window.api.open.finder(worktree.path)}
            style={ACTION_BTN}
          >
            Reveal in Finder
          </button>
          {worktree.repo.remoteUrl && (
            <button
              onClick={() => window.api.open.url(worktree.repo.remoteUrl!)}
              style={ACTION_BTN}
            >
              View on GitHub
            </button>
          )}
        </div>
      </div>

      {/* Body: two-column layout */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Left: commit list */}
        <div style={{ width: 300, flexShrink: 0, overflowY: 'auto' }}>
          <CommitList
            worktreePath={worktree.path}
            onDiff={setDiff}
            onFullDiff={loadFullDiff}
          />
        </div>
        {/* Right: diff viewer */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DiffViewer rawDiff={diff} />
        </div>
      </div>
    </div>
  );
}

const ACTION_BTN: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
};
