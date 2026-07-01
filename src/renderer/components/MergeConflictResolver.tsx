// src/renderer/components/MergeConflictResolver.tsx
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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

// A 'del' op marks a line the base had that this side removed — it isn't part of this side's
// actual file content, so rendering it would show text that doesn't really exist in this branch.
// Only 'context' and 'add' reconstruct this side's real content; 'add' stays highlighted since
// it's genuinely new relative to base.
function renderSide(ops: DiffLineOp[]): React.JSX.Element {
  return (
    <>
      {ops.filter((op) => op.type !== 'del').map((op, i) => (
        <div key={i} style={{ ...DIFF_LINE_STYLE[op.type], fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>
          {op.text || ' '}
        </div>
      ))}
    </>
  );
}

// Sizing via a `rows` count (logical newlines) undercounts wrapped lines, silently clipping
// content with `overflow: hidden`. Measuring the real rendered scrollHeight instead accounts
// for wrapping regardless of column width or font metrics.
function ResolvedTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ display: 'block', width: '100%', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5, padding: '0 8px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', resize: 'none', overflow: 'hidden' }}
    />
  );
}

export function MergeConflictResolver({ worktreePath, conflictedFiles, localBranch, remoteBranch, onDone, onClose }: Props): React.JSX.Element {
  const [fileIndex, setFileIndex] = useState(0);
  const [segments, setSegments] = useState<ConflictFileSegment[]>([]);
  const [resolutions, setResolutions] = useState<Record<number, string>>({});
  const [activeConflict, setActiveConflict] = useState(0);
  const [busy, setBusy] = useState(false);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const currentFile = conflictedFiles[fileIndex];
  const conflictSegments = segments.filter((s): s is Extract<ConflictFileSegment, { type: 'conflict' }> => s.type === 'conflict');

  useEffect(() => {
    if (!currentFile) return;
    setResolutions({});
    setActiveConflict(0);
    rowRefs.current = {};
    window.api.worktrees.getConflictBlocks(worktreePath, currentFile).then(setSegments);
  }, [worktreePath, currentFile]);

  // Scroll to the active conflict whenever it changes, and on initial load (opens at the first one).
  useEffect(() => {
    const target = conflictSegments[activeConflict];
    if (!target) return;
    rowRefs.current[target.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeConflict, segments]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '90vw', height: '82vh', minWidth: 640, minHeight: 360, maxWidth: '96vw', maxHeight: '96vh', resize: 'both', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px var(--shadow)' }}>
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

        {/* 3-column body: one grid row per segment, with accept-arrow gutters flanking Result */}
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 32px 1fr 32px 1fr', alignContent: 'start' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)', fontSize: 11, color: 'var(--fg-muted)', padding: '8px 12px 6px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>MINE ({localBranch})</div>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }} />
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)', fontSize: 11, color: 'var(--fg-muted)', padding: '8px 12px 6px', borderBottom: '1px solid var(--border)' }}>RESULT</div>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }} />
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)', fontSize: 11, color: 'var(--fg-muted)', padding: '8px 12px 6px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>THEIRS ({remoteBranch})</div>

          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              <div style={{ borderRight: '1px solid var(--border)' }}>
                {seg.type === 'context'
                  ? <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                  : renderSide(seg.ours)}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                {seg.type === 'conflict' && (
                  <button
                    onClick={() => accept(seg.id, seg.oursText)}
                    style={{ marginTop: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, width: 24, height: 24, fontSize: 13, cursor: 'pointer', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Accept Mine"
                  >
                    »
                  </button>
                )}
              </div>
              <div ref={seg.type === 'conflict' ? (el) => { rowRefs.current[seg.id] = el; } : undefined}>
                {seg.type === 'context' ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                ) : resolutions[seg.id] !== undefined ? (
                  <ResolvedTextarea value={resolutions[seg.id]!} onChange={(v) => accept(seg.id, v)} />
                ) : (
                  <div style={{ margin: '4px 12px', padding: '6px 8px', border: '1px dashed var(--border)', borderRadius: 4, color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 11.5 }}>
                    not resolved — accept a side or edit directly
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                {seg.type === 'conflict' && (
                  <button
                    onClick={() => accept(seg.id, seg.theirsText)}
                    style={{ marginTop: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, width: 24, height: 24, fontSize: 13, cursor: 'pointer', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Accept Theirs"
                  >
                    «
                  </button>
                )}
              </div>
              <div style={{ borderLeft: '1px solid var(--border)' }}>
                {seg.type === 'context'
                  ? <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '0 8px', whiteSpace: 'pre-wrap' }}>{seg.lines.join('\n')}</div>
                  : renderSide(seg.theirs)}
              </div>
            </React.Fragment>
          ))}
        </div>

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
