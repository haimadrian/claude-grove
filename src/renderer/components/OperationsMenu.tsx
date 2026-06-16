import React, { useState } from 'react';
import type { WorktreeRow } from '../../shared/types';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  worktree: WorktreeRow;
  onResult: (message: string, ok: boolean) => void;
  onRefresh: () => void;
}

export function OperationsMenu({ worktree, onResult, onRefresh }: Props): React.JSX.Element {
  const [confirm, setConfirm] = useState<null | 'remove' | 'deleteRemote'>(null);
  const [forceRemove, setForceRemove] = useState(false);
  const [deleteLocalBranch, setDeleteLocalBranch] = useState(false);

  const isSafe = worktree.upstreamGone || worktree.pr?.state === 'MERGED';

  const doRemove = async (): Promise<void> => {
    setConfirm(null);
    try {
      const r = await window.api.worktrees.remove(worktree.path, { force: forceRemove, deleteLocalBranch });
      onResult(r.message, r.success);
      if (r.success) onRefresh();
    } catch (e) { onResult(String(e), false); }
  };

  const doDeleteRemote = async (): Promise<void> => {
    setConfirm(null);
    try {
      const r = await window.api.worktrees.deleteRemoteBranch(worktree.path);
      onResult(r.message, r.success);
      if (r.success) onRefresh();
    } catch (e) { onResult(String(e), false); }
  };

  const doSync = async (action: 'fetch' | 'pull' | 'mergeBase' | 'prune'): Promise<void> => {
    try {
      const r = await window.api.worktrees.sync(worktree.path, action);
      onResult(r.message, r.success);
      if (r.success) onRefresh();
    } catch (e) { onResult(String(e), false); }
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button style={BTN} onClick={() => doSync('fetch')}>Fetch</button>
      <button style={BTN} onClick={() => doSync('pull')}>Pull</button>
      <button style={BTN} onClick={() => doSync('mergeBase')}>Merge base</button>
      <button style={{ ...BTN, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setConfirm('remove')}>
        Remove worktree
      </button>
      {worktree.branch !== null && (
        <button style={{ ...BTN, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setConfirm('deleteRemote')}>
          Delete remote branch
        </button>
      )}

      {confirm === 'remove' && (
        <ConfirmDialog
          title={`Remove worktree: ${worktree.branch ?? 'detached'}`}
          danger
          confirmLabel="Remove"
          body={
            <div>
              <p>Path: <code>{worktree.path}</code></p>
              {isSafe
                ? <p style={{ color: 'var(--ok)', marginTop: 8 }}>Safe to delete (upstream gone or PR merged)</p>
                : <p style={{ color: 'var(--warn)', marginTop: 8 }}>This branch may not be fully merged.</p>}
              {worktree.isDirty && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <input type="checkbox" checked={forceRemove} onChange={(e) => setForceRemove(e.target.checked)} />
                  Force remove (dirty worktree)
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <input type="checkbox" checked={deleteLocalBranch} onChange={(e) => setDeleteLocalBranch(e.target.checked)} />
                Also delete local branch
              </label>
            </div>
          }
          onConfirm={doRemove}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'deleteRemote' && (
        <ConfirmDialog
          title={`Delete remote branch: ${worktree.branch ?? ''}`}
          danger
          confirmLabel="Delete remote"
          body={<p>This will delete <code>origin/{worktree.branch}</code> permanently.</p>}
          onConfirm={doDeleteRemote}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

const BTN: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
};
