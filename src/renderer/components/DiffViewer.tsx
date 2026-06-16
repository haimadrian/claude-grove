import React, { useState } from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { FileData, HunkData } from 'react-diff-view';

interface Props { rawDiff: string; }

export function DiffViewer({ rawDiff }: Props): React.JSX.Element {
  if (!rawDiff.trim()) {
    return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>No diff available.</div>;
  }

  let files: FileData[];
  try {
    files = parseDiff(rawDiff);
  } catch {
    return <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>Failed to parse diff.</div>;
  }

  return (
    <div style={{ fontSize: 13, fontFamily: 'monospace' }}>
      {files.map((file, i) => (
        <FileSection key={i} file={file} />
      ))}
    </div>
  );
}

function FileSection({ file }: { file: FileData }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const adds = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'insert').length, 0);
  const dels = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'delete').length, 0);
  const name = file.newPath || file.oldPath || 'unknown';

  return (
    <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <div
        style={{
          padding: '6px 10px', background: 'var(--bg-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span style={{ fontWeight: 500 }}>{name}</span>
        <span style={{ color: 'var(--ok)' }}>+{adds}</span>
        <span style={{ color: 'var(--danger)' }}>-{dels}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <Diff viewType="unified" diffType={file.type} hunks={file.hunks}>
            {(hunks: HunkData[]) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
          </Diff>
        </div>
      )}
    </div>
  );
}
