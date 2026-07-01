// src/renderer/components/MergeConflictResolver.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { DiffLineOp, ConflictFileSegment } from '../../shared/types';

interface Props {
  worktreePath: string;
  conflictedFiles: string[];
  localBranch: string;
  remoteBranch: string;
  onDone: (message: string, success: boolean) => void;
  onClose: () => void;
}

const DIFF_LINE_STYLE: Record<DiffLineOp['type'], React.CSSProperties> = {
  context: {},
  add: { background: 'var(--diff-code-insert-background-color, rgba(70,200,70,0.18))' },
  del: { background: 'var(--diff-code-delete-background-color, rgba(255,80,80,0.18))', textDecoration: 'line-through', opacity: 0.75 },
};

function renderSide(ops: DiffLineOp[]): React.JSX.Element {
  return (
    <>
      {ops.map((op, i) => (
        <div key={i} style={{ ...DIFF_LINE_STYLE[op.type], fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>
          {op.text || ' '}
        </div>
      ))}
    </>
  );
}

export function MergeConflictResolver({ worktreePath, conflictedFiles, localBranch, remoteBranch, onDone, onClose }: Props): React.JSX.Element {
  const [fileIndex, setFileIndex] = useState(0);
  const [segments, setSegments] = useState<ConflictFileSegment[]>([]);
  const [resolutions, setResolutions] = useState<Record<number, string>>({});
  const [activeConflict, setActiveConflict] = useState(0);
  const [busy, setBusy] = useState(false);

  const currentFile = conflictedFiles[fileIndex];
  const conflictSegments = segments.filter((s): s is Extract<ConflictFileSegment, { type: 'conflict' }> => s.type === 'conflict');

  useEffect(() => {
    if (!currentFile) return;
    setResolutions({});
    setActiveConflict(0);
    window.api.worktrees.getConflictBlocks(worktreePath, currentFile).then(setSegments);
  }, [worktreePath, currentFile]);

  const allResolved = conflictSegments.length > 0 && conflictSegments.every((c) => resolutions[c.id] !== undefined);

  const accept = (id: number, text: string): void => {
    setResolutions((prev) => ({ ...prev, [id]: text }));
  };

  const goToConflict = useCallback((delta: number): void => {
    if (conflictSegments.length === 0) return;
    setActiveConflict((i) => Math.max(0, Math.min(conflictSegments.length - 1, i + delta)));
  }, [conflictSegments.length]);

  const applyAndAdvance = async (): Promise<void> => {
    if (!currentFile || !allResolved) return;
    setBusy(true);
    const resolvedContent = segments
      .map((seg) => (seg.type === 'context' ? seg.lines.join('\n') : resolutions[seg.id]!))
      .join('\n');
    const result = await window.api.worktrees.applyFileResolution(worktreePath, currentFile, resolvedContent);
    setBusy(false);
    if (!result.success) { onDone(result.message, false); return; }
    if (fileIndex + 1 < conflictedFiles.length) {
      setFileIndex((i) => i + 1);
    } else {
      setBusy(true);
      const finish = await window.api.worktrees.finishMerge(worktreePath);
      setBusy(false);
      onDone(finish.message, finish.success);
    }
  };

  const doAbort = async (): Promise<void> => {
    setBusy(true);
    const result = await window.api.worktrees.abortMerge(worktreePath);
    setBusy(false);
    onDone(result.message, result.success);
  };

  if (!currentFile) return <></>;

  const active = conflictSegments[activeConflict] ?? null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '90vw', maxWidth: 1100, height: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px var(--shadow)' }}>
        {/* Title bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{currentFile}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>file {fileIndex + 1} of {conflictedFiles.length}</span>
        </div>

        {/* File tabs */}
        {conflictedFiles.length > 1 && (
          <div style={{ display: 'flex', gap: 4, padding: '6px 14px 0', flexShrink: 0 }}>
            {conflictedFiles.map((f, i) => (
              <div
                key={f}
                style={{
                  padding: '5px 10px', fontSize: 11.5, borderRadius: '6px 6px 0 0',
                  background: i === fileIndex ? 'var(--bg-secondary)' : 'transparent',
                  border: '1px solid var(--border)', borderBottom: 'none',
                  color: i === fileIndex ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: i === fileIndex ? 600 : 400,
                }}
              >
                {f.split('/').pop()}
              </div>
            ))}
          </div>
        )}

        {/* Conflict nav toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>
          <span>conflict {conflictSegments.length === 0 ? 0 : activeConflict + 1}/{conflictSegments.length}</span>
          <button onClick={() => goToConflict(-1)} style={{ background: 'none', border: 'none', color: 'var(--fg)', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 3, cursor: 'pointer' }} title="Previous conflict"><ChevronUp size={14} /></button>
          <button onClick={() => goToConflict(1)} style={{ background: 'none', border: 'none', color: 'var(--fg)', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 3, cursor: 'pointer' }} title="Next conflict"><ChevronDown size={14} /></button>
          <span style={{ marginLeft: 'auto' }}>unresolved: {conflictSegments.filter((c) => resolutions[c.id] === undefined).length}</span>
        </div>

        {/* 3-column body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 32px 1fr 32px 1fr' }}>
          <div style={{ padding: '8px 0', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '0 12px 6px' }}>Mine ({localBranch})</div>
            {segments.map((seg, i) =>
              seg.type === 'context'
                ? <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                : <div key={i}>{renderSide(seg.ours)}</div>
            )}
          </div>
          <div />
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '0 12px 6px' }}>Result</div>
            {segments.map((seg, i) =>
              seg.type === 'context'
                ? <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                : resolutions[seg.id] !== undefined
                ? (
                  <textarea
                    key={i}
                    value={resolutions[seg.id]}
                    onChange={(e) => accept(seg.id, e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', resize: 'vertical' }}
                  />
                ) : (
                  <div key={i} style={{ margin: '0 12px', padding: '6px 8px', border: '1px dashed var(--border)', borderRadius: 4, color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 11.5 }}>
                    not resolved — accept a side or edit directly
                  </div>
                )
            )}
          </div>
          <div />
          <div style={{ padding: '8px 0', borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '0 12px 6px' }}>Theirs ({remoteBranch})</div>
            {segments.map((seg, i) =>
              seg.type === 'context'
                ? <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                : <div key={i}>{renderSide(seg.theirs)}</div>
            )}
          </div>
        </div>

        {/* Per-conflict accept buttons for the active conflict */}
        {active && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '6px 0', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={() => accept(active.id, active.oursText)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--fg)', cursor: 'pointer' }}>« Accept Mine</button>
            <button onClick={() => accept(active.id, active.theirsText)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--fg)', cursor: 'pointer' }}>Accept Theirs »</button>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={doAbort} disabled={busy} style={{ borderRadius: 6, padding: '6px 14px', fontSize: 12.5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}>Abort merge</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={busy} style={{ borderRadius: 6, padding: '6px 14px', fontSize: 12.5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>Close</button>
            <button
              onClick={applyAndAdvance}
              disabled={busy || !allResolved}
              style={{ borderRadius: 6, padding: '6px 14px', fontSize: 12.5, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: allResolved ? 'pointer' : 'default', opacity: allResolved ? 1 : 0.5 }}
            >
              {fileIndex + 1 < conflictedFiles.length ? 'Apply & next file' : 'Apply & finish merge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
