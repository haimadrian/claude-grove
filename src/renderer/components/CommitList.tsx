import React, { useState, useEffect } from 'react';
import type { Commit } from '../../shared/types';

interface Props {
  worktreePath: string;
  isDirty: boolean;
  prBase?: string;
  onDiff: (diff: string) => void;
  onFullDiff: () => void;
  onMessage: (msg: string, ok: boolean) => void;
}

const MODAL_BTN: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6,
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};

export function CommitList({ worktreePath, isDirty, prBase, onDiff, onFullDiff, onMessage }: Props): React.JSX.Element {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const [workingFiles, setWorkingFiles] = useState<Array<{ path: string; status: string; label: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [commitMsg, setCommitMsg] = useState('');
  const [showCommitModal, setShowCommitModal] = useState(false);
  // rollbackTarget: null = hidden; string[] = specific file(s) to rollback
  const [rollbackTarget, setRollbackTarget] = useState<{ files: Array<{ path: string; status: string }>; label: string } | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    window.api.worktrees.commits(worktreePath, prBase).then((c) => {
      setCommits(c);
      setLoading(false);
    });
  }, [worktreePath]);

  useEffect(() => {
    if (!isDirty) { setWorkingFiles([]); return; }
    window.api.worktrees.workingFiles(worktreePath).then((files) => {
      setWorkingFiles(files);
      setSelectedFiles(new Set(files.filter((f) => f.status !== '??').map((f) => f.path)));
    });
  }, [worktreePath, isDirty]);

  const handleSelect = (commit: Commit): void => {
    setSelected(commit.sha);
    window.api.worktrees.commitDiff(worktreePath, commit.sha).then(onDiff);
  };

  const allSelected = workingFiles.length > 0 && selectedFiles.size === workingFiles.length;
  const toggleAll = (): void => {
    if (allSelected) { setSelectedFiles(new Set()); }
    else { setSelectedFiles(new Set(workingFiles.map((f) => f.path))); }
  };
  const toggleFile = (path: string): void => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) { next.delete(path); } else { next.add(path); }
      return next;
    });
  };

  const doRollback = async (): Promise<void> => {
    if (!rollbackTarget) return;
    const { files } = rollbackTarget;
    setRollbackTarget(null);
    try {
      await Promise.all(files.map((f) => window.api.worktrees.rollbackFile(worktreePath, f.path, f.status)));
      onMessage(`Rolled back ${files.length} file${files.length !== 1 ? 's' : ''}`, true);
      const updated = await window.api.worktrees.workingFiles(worktreePath);
      setWorkingFiles(updated);
      setSelectedFiles(new Set(updated.filter((f) => f.status !== '??').map((f) => f.path)));
    } catch (e) { onMessage(String(e), false); }
  };

  const doCommit = async (): Promise<void> => {
    if (!commitMsg.trim() || selectedFiles.size === 0) return;
    setCommitting(true);
    try {
      const r = await window.api.worktrees.commitFiles(worktreePath, [...selectedFiles], commitMsg);
      onMessage(r.message, r.success);
      if (r.success) {
        setShowCommitModal(false);
        setCommitMsg('');
        setWorkingFiles([]);
        setSelectedFiles(new Set());
      }
    } catch (e) { onMessage(String(e), false); }
    finally { setCommitting(false); }
  };

  return (
    <div>
      {workingFiles.length > 0 && (
        <div style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              WORKING CHANGES ({workingFiles.length})
            </label>
            {selectedFiles.size > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setRollbackTarget({
                    files: workingFiles.filter((f) => selectedFiles.has(f.path)),
                    label: `${selectedFiles.size} selected file${selectedFiles.size !== 1 ? 's' : ''}`,
                  })}
                  style={{ fontSize: 11, padding: '2px 10px', background: 'var(--danger)', border: 'none', borderRadius: 4, color: 'var(--bg)', cursor: 'pointer' }}
                  title={`Rollback ${selectedFiles.size} selected file${selectedFiles.size !== 1 ? 's' : ''}`}
                >
                  ↩ Rollback {selectedFiles.size}…
                </button>
                <button
                  onClick={() => setShowCommitModal(true)}
                  style={{ fontSize: 11, padding: '2px 10px', background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'var(--bg)', cursor: 'pointer' }}
                >
                  Commit {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}…
                </button>
              </div>
            )}
          </div>
          {workingFiles.map((f) => (
            <div
              key={f.path}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12 }}
              onClick={() => window.api.worktrees.workingFileDiff(worktreePath, f.path).then(onDiff)}
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(f.path)}
                onChange={(e) => { e.stopPropagation(); toggleFile(f.path); }}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 600,
                background: f.label === 'deleted' ? 'var(--danger)' : f.label === 'added' ? 'var(--ok)' : 'var(--warn)',
                color: 'var(--bg)', flexShrink: 0,
              }}>{f.label[0]!.toUpperCase()}</span>
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg)' }}
                title={`${f.path.split('/').pop() ?? f.path}\n${f.path}`}
              >
                {f.path.split('/').pop() ?? f.path}
              </span>
              <span
                style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={`${f.path.split('/').pop() ?? f.path}\n${f.path}`}
              >
                {f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : ''}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRollbackTarget({ files: [f], label: f.path.split('/').pop() ?? f.path });
                }}
                title={`Rollback changes to ${f.path}`}
                style={{
                  fontSize: 11, padding: '1px 5px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
                  color: 'var(--fg-muted)', marginLeft: 'auto', flexShrink: 0,
                }}
              >
                ↩
              </button>
            </div>
          ))}
        </div>
      )}

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
      {loading ? (
        <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>Loading commits...</div>
      ) : commits.length === 0 ? (
        <div style={{ padding: 16, color: 'var(--fg-muted)', fontSize: 13 }}>No commits beyond base branch.</div>
      ) : (
        commits.map((c) => (
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
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontStyle: c.subject.startsWith('Merge ') ? 'italic' : undefined,
                color: c.subject.startsWith('Merge ') ? 'var(--fg-muted)' : undefined,
              }}
            >
              {c.subject.startsWith('Merge ') ? '⤵ ' : ''}{c.subject}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>{c.author}</span>
          </div>
        ))
      )}

      {showCommitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 440, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 8, fontSize: 15 }}>Commit changes</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>{selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected</p>
            <textarea
              autoFocus
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message…"
              rows={4}
              style={{ width: '100%', padding: '8px 10px', marginBottom: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCommitModal(false)} style={MODAL_BTN}>Cancel</button>
              <button
                onClick={doCommit}
                disabled={committing || !commitMsg.trim() || selectedFiles.size === 0}
                style={{ ...MODAL_BTN, background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent', opacity: (committing || !commitMsg.trim()) ? 0.6 : 1 }}
              >
                {committing ? 'Committing…' : 'Commit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {rollbackTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Rollback changes?</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
              This will discard all changes to <strong style={{ color: 'var(--fg)' }}>{rollbackTarget.label}</strong>. This cannot be undone.
            </p>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, maxHeight: 120, overflowY: 'auto' }}>
              {rollbackTarget.files.map((f) => (
                <div key={f.path} style={{ padding: '1px 0' }}>{f.path}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRollbackTarget(null)} style={MODAL_BTN}>Cancel</button>
              <button onClick={doRollback} style={{ ...MODAL_BTN, background: 'var(--danger)', color: 'var(--bg)', borderColor: 'transparent' }}>Rollback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
