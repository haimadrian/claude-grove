import React, { useState } from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { FileData, HunkData } from 'react-diff-view';

type ViewType = 'unified' | 'split';

interface Props { rawDiff: string; }

export function DiffViewer({ rawDiff }: Props): React.JSX.Element {
  const [viewType, setViewType] = useState<ViewType>('unified');

  if (!rawDiff.trim()) {
    return <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>No diff available.</div>;
  }

  if (rawDiff === '\x00MERGE\x00') {
    return (
      <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Merge commit</div>
        Integrates upstream changes into this branch. No feature-specific diff to display.
      </div>
    );
  }

  let files: FileData[];
  try {
    files = parseDiff(rawDiff);
  } catch {
    return <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>Failed to parse diff.</div>;
  }

  return (
    <div style={{ fontSize: 13, fontFamily: 'monospace' }}>
      <div style={{ padding: '4px 10px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', borderRadius: 5, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {(['unified', 'split'] as ViewType[]).map((vt) => (
            <button
              key={vt}
              onClick={() => setViewType(vt)}
              style={{
                fontSize: 11, padding: '3px 10px', border: 'none', cursor: 'pointer',
                borderLeft: vt === 'split' ? '1px solid var(--border)' : undefined,
                background: viewType === vt ? 'var(--accent)' : 'var(--bg-secondary)',
                color: viewType === vt ? 'var(--bg)' : 'var(--fg)',
                textTransform: 'capitalize',
              }}
            >
              {vt}
            </button>
          ))}
        </div>
      </div>
      {files.map((file, i) => (
        <FileSection key={i} file={file} viewType={viewType} />
      ))}
    </div>
  );
}

function FileSection({ file, viewType }: { file: FileData; viewType: ViewType }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [viewed, setViewed] = useState(false);
  const adds = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'insert').length, 0);
  const dels = file.hunks.reduce((n, h) => n + h.changes.filter((c) => c.type === 'delete').length, 0);
  const name = file.newPath || file.oldPath || 'unknown';

  return (
    <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', opacity: viewed ? 0.55 : 1 }}>
      <div
        style={{
          padding: '6px 10px', background: 'var(--bg-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <input
          type="checkbox"
          checked={viewed}
          title="Mark as viewed"
          style={{ cursor: 'pointer', accentColor: 'var(--ok)', flexShrink: 0 }}
          onChange={(e) => {
            e.stopPropagation();
            const next = e.target.checked;
            setViewed(next);
            if (next) setCollapsed(true);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <span style={{ fontWeight: 500, color: viewed ? 'var(--fg-muted)' : undefined, textDecoration: viewed ? 'line-through' : undefined }}>{name}</span>
        <span style={{ color: 'var(--ok)' }}>+{adds}</span>
        <span style={{ color: 'var(--danger)' }}>-{dels}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-muted)' }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <Diff viewType={viewType} diffType={file.type} hunks={file.hunks}>
            {(hunks: HunkData[]) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
          </Diff>
        </div>
      )}
    </div>
  );
}
