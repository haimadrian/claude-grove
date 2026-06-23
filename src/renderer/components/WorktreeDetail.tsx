import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X as XIcon } from 'lucide-react';
import type { WorktreeRow, TerminalKind } from '../../shared/types';

import { PrBadge } from './PrBadge';
import { CommitList } from './CommitList';
import { DiffViewer } from './DiffViewer';
import { SessionPickerModal } from './SessionPickerModal';

const LS_PIN_KEY = 'claude-grove:detail-pinned';
function loadPinned(): boolean {
  try { return localStorage.getItem(LS_PIN_KEY) !== 'false'; } catch { return true; }
}

const LS_DIFF_OPTIONS = 'claude-grove:diff-options';
function loadIgnoreWs(): boolean {
  try { return JSON.parse(localStorage.getItem(LS_DIFF_OPTIONS) ?? '{}').ignoreWhitespace === true; } catch { return false; }
}

interface Props {
  worktree: WorktreeRow;
  defaultTerminal: TerminalKind;
  refreshKey?: number;
  onBack: () => void;
  onMessage: (msg: string, ok: boolean | 'pending', resolveId?: string, subtitle?: string) => string;
  onRefresh?: () => void;
}

export function WorktreeDetail({ worktree, defaultTerminal, refreshKey, onBack, onMessage, onRefresh }: Props): React.JSX.Element {
  const [diff, setDiff] = useState<string>('');
  const [pinned, setPinned] = useState(loadPinned);
  const [leftWidth, setLeftWidth] = useState(300);
  const splitterDragging = useRef(false);
  const splitterMoved = useRef(false);
  const [renameState, setRenameState] = useState<{ value: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(loadIgnoreWs);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<{ activeMatchOrdinal: number; matches: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchNextRef = useRef<HTMLButtonElement>(null);
  const searchPrevRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try { localStorage.setItem(LS_DIFF_OPTIONS, JSON.stringify({ ignoreWhitespace })); } catch { /* ignore */ }
  }, [ignoreWhitespace]);
  useEffect(() => {
    try { localStorage.setItem(LS_PIN_KEY, String(pinned)); } catch { /* ignore */ }
  }, [pinned]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const selected = window.getSelection()?.toString().trim() ?? '';
        setSearchOpen(true);
        if (selected) setSearchTerm(selected);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchTerm('');
        setSearchResult(null);
        window.api.find.stop();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // findInPage steals focus to document.body on every call. Calling focus() to restore
  // it resets Chromium's session cursor to 0, breaking Enter navigation. Instead:
  // 1. Never call focus() after any findInPage call.
  // 2. Redirect typed characters / Enter / Backspace from body to the input via the
  //    native value setter (no focus change, no session reset).
  const searchTermRef = useRef(searchTerm);
  useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

  useEffect(() => {
    if (!searchOpen) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    const onBodyKey = (e: KeyboardEvent): void => {
      if (document.activeElement !== document.body) return;
      const input = searchInputRef.current;
      if (!input) return;
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.shiftKey) { window.api.find.prev(searchTermRef.current); }
        else { window.api.find.next(searchTermRef.current); }
        return;
      }
      if (e.key === 'Escape') {
        setSearchOpen(false); setSearchTerm(''); setSearchResult(null); window.api.find.stop();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault(); e.stopImmediatePropagation();
        const s = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const newVal = s !== end ? input.value.slice(0, s) + input.value.slice(end)
          : s > 0 ? input.value.slice(0, s - 1) + input.value.slice(s) : input.value;
        const newCursor = s !== end ? s : Math.max(0, s - 1);
        nativeSetter.call(input, newVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setSelectionRange(newCursor, newCursor);
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); e.stopImmediatePropagation();
        const s = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const newVal = input.value.slice(0, s) + e.key + input.value.slice(end);
        nativeSetter.call(input, newVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setSelectionRange(s + 1, s + 1);
      }
    };
    window.addEventListener('keydown', onBodyKey, { capture: true });
    return () => window.removeEventListener('keydown', onBodyKey, { capture: true });
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      window.api.find.stop();
      setSearchResult(null);
      return;
    }
    if (searchTerm.trim().length < 2) {
      setSearchResult(null);
      return;
    }
    // After findNext:false, Chromium's cursor is at position 0; the first findNext:true
    // confirms position 1 without advancing. Fire both synchronously so the session is
    // primed at position 1 before any user interaction — no focus() call needed.
    window.api.find.search(searchTerm);
    window.api.find.next(searchTerm);
  }, [searchTerm, searchOpen]);

  useEffect(() => {
    const unsub = window.api.find.onResult((result) => {
      setSearchResult({ activeMatchOrdinal: result.activeMatchOrdinal, matches: result.matches });
    });
    return unsub;
  }, []);

  const doRename = useCallback((): void => {
    if (!renameState) return;
    const val = renameState.value.trim();
    if (!val || val === worktree.branch) { setRenameState(null); return; }
    setRenameState(null);
    const renameId = onMessage('Renaming branch…', 'pending', undefined, val);
    window.api.worktrees.renameBranch(worktree.path, val)
      .then((r) => { onMessage(r.message, r.success, renameId); if (r.success) onRefresh?.(); })
      .catch((e) => onMessage(String(e), false, renameId));
  }, [renameState, worktree, onMessage, onRefresh]);

  const doDelete = useCallback((): void => {
    setShowDeleteConfirm(false);
    const delId = onMessage('Deleting worktree…', 'pending', undefined, worktree.branch ?? undefined);
    window.api.worktrees.remove(worktree.path, { force: false, deleteLocalBranch: deleteRemote })
      .then((r) => { onMessage(r.message, r.success, delId); if (r.success) { onRefresh?.(); onBack(); } })
      .catch((e) => onMessage(String(e), false, delId));
  }, [worktree, deleteRemote, onMessage, onBack, onRefresh]);

  const loadFullDiff = useCallback((): void => {
    window.api.worktrees.fullDiff(worktree.path, worktree.pr?.baseRefName ?? undefined, ignoreWhitespace).then(setDiff);
  }, [worktree.path, worktree.pr?.baseRefName, ignoreWhitespace]);

  useEffect(() => { loadFullDiff(); }, [worktree.path, ignoreWhitespace, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
  .detail-rename-input:focus {
    outline: none;
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px var(--accent-muted);
  }
`}</style>
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
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{worktree.branch ?? 'detached HEAD'}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{worktree.repo.name}</span>
          <PrBadge
            pr={worktree.pr}
            {...(worktree.pr ? { onClick: () => window.api.open.url(worktree.pr!.url) } : {})}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'monospace' }}>
          {worktree.path}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => window.api.open.editor(worktree.path)}
            style={ACTION_BTN}
            title="Open worktree folder in your configured editor"
          >
            Open in editor
          </button>
          <button
            onClick={() => window.api.open.finder(worktree.path)}
            style={ACTION_BTN}
            title="Reveal worktree folder in Finder"
          >
            Reveal in Finder
          </button>
          <button
            onClick={() =>
              window.api.terminals.openDir({ terminal: defaultTerminal, dir: worktree.path })
                .then((r) => onMessage(r.message, r.success))
                .catch((e) => onMessage(String(e), false))
            }
            style={ACTION_BTN}
            title={`Open worktree in ${defaultTerminal}`}
          >
            Terminal
          </button>
          {worktree.repo.remoteUrl && (
            <button
              onClick={() => window.api.open.url(worktree.repo.remoteUrl!)}
              style={ACTION_BTN}
              title="Open repository on GitHub in your browser"
            >
              View on GitHub
            </button>
          )}
          {worktree.sessions[0] && (
            <button
              onClick={() => {
                if (worktree.sessions.length > 1) {
                  setShowSessionPicker(true);
                } else {
                  window.api.terminals.resumeSession({
                    terminal: defaultTerminal,
                    launchDir: worktree.sessions[0]!.launchDir,
                    sessionId: worktree.sessions[0]!.sessionId,
                  }).then((r) => onMessage(r.message, r.success)).catch((e) => onMessage(String(e), false));
                }
              }}
              style={{ ...ACTION_BTN, background: 'var(--accent)', color: '#fff', borderColor: 'transparent', fontWeight: 500 }}
              title={worktree.sessions.length > 1
                ? `${worktree.sessions.length} sessions — click to pick`
                : `Resume Claude Code session in ${defaultTerminal}: ${worktree.sessions[0].title ?? worktree.sessions[0].sessionId}`}
            >
              {worktree.sessions.length > 1 ? `Resume (${worktree.sessions.length})` : 'Resume'}
            </button>
          )}
          {worktree.branch && (
            <button
              onClick={() => setRenameState({ value: worktree.branch! })}
              style={ACTION_BTN}
              title="Rename branch locally and on remote"
            >
              Rename
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...ACTION_BTN, color: 'var(--danger)', borderColor: 'var(--danger)', background: 'transparent' }}
            title="Remove this worktree (optionally also delete remote branch)"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Body: two-column layout with draggable splitter */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: commit list */}
        <div style={{
          width: pinned ? leftWidth : 0,
          flexShrink: 0,
          overflowY: pinned ? 'auto' : 'hidden',
          overflowX: 'hidden',
          minWidth: 0,
          transition: 'width 200ms ease-out',
        }}>
          <CommitList
            key={refreshKey}
            worktreePath={worktree.path}
            isDirty={worktree.isDirty}
            ignoreWhitespace={ignoreWhitespace}
            {...(worktree.pr?.baseRefName ? { prBase: worktree.pr.baseRefName } : {})}
            onDiff={setDiff}
            onFullDiff={loadFullDiff}
            onMessage={onMessage}
          />
        </div>
        {/* Splitter */}
        <div
          title={pinned ? 'Click to collapse commit list' : 'Click to expand commit list'}
          style={{
            width: 14,
            flexShrink: 0,
            cursor: 'pointer',
            background: 'var(--border)',
            transition: 'background 0.1s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)'; }}
          onMouseLeave={(e) => { if (!splitterDragging.current) (e.currentTarget as HTMLDivElement).style.background = 'var(--border)'; }}
          onClick={() => { if (!splitterMoved.current) setPinned((p) => !p); splitterMoved.current = false; }}
          onMouseDown={(e) => {
            if (!pinned) return;
            splitterMoved.current = false;
            e.preventDefault();
            splitterDragging.current = true;
            const startX = e.clientX;
            const startW = leftWidth;
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = 'var(--accent)';
            const onMove = (ev: MouseEvent): void => {
              splitterMoved.current = true;
              setLeftWidth(Math.max(150, Math.min(700, startW + ev.clientX - startX)));
            };
            const onUp = (): void => {
              splitterDragging.current = false;
              el.style.background = 'var(--border)';
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 2.5 }}>
                <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--fg-muted)', opacity: 0.5 }} />
                <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'var(--fg-muted)', opacity: 0.5 }} />
              </div>
            ))}
          </div>
          {pinned
            ? <ChevronLeft size={10} style={{ color: 'var(--fg-muted)', pointerEvents: 'none', flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: 'var(--fg-muted)', pointerEvents: 'none', flexShrink: 0 }} />}
        </div>
        {/* Right: diff viewer */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <DiffViewer
            rawDiff={diff}
            ignoreWhitespace={ignoreWhitespace}
            onIgnoreWhitespaceChange={setIgnoreWhitespace}
          />
        </div>
      </div>
      {renameState && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Rename branch</h3>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>Current: <code>{worktree.branch}</code></p>
            <input
              autoFocus
              className="detail-rename-input"
              value={renameState.value}
              onChange={(e) => setRenameState((s) => s ? { value: e.target.value } : null)}
              onKeyDown={(e) => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRenameState(null); }}
              style={{ width: '100%', padding: '6px 10px', marginBottom: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRenameState(null)} style={DETAIL_BTN}>Cancel</button>
              <button onClick={doRename} style={{ ...DETAIL_BTN, background: 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }}>Rename</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--shadow)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Delete worktree</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>Branch: <code style={{ color: 'var(--fg)' }}>{worktree.branch ?? 'detached'}</code></p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, wordBreak: 'break-all' }}>{worktree.path}</p>
            {(worktree.upstreamGone || worktree.pr?.state === 'MERGED') ? (
              <p style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 12 }}>✓ Safe to delete</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 12 }}>⚠ Branch may not be merged yet.</p>
            )}
            {worktree.branch && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={deleteRemote} onChange={(e) => setDeleteRemote(e.target.checked)} />
                Also delete remote branch
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={DETAIL_BTN}>Cancel</button>
              <button onClick={doDelete} style={{ ...DETAIL_BTN, background: 'var(--danger)', color: 'var(--bg)', borderColor: 'transparent' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {showSessionPicker && (
        <SessionPickerModal
          sessions={worktree.sessions}
          terminal={defaultTerminal}
          onResume={(s) => {
            setShowSessionPicker(false);
            window.api.terminals.resumeSession({
              terminal: defaultTerminal,
              launchDir: s.launchDir,
              sessionId: s.sessionId,
            }).then((r) => onMessage(r.message, r.success)).catch((e) => onMessage(String(e), false));
          }}
          onClose={() => setShowSessionPicker(false)}
        />
      )}
      {searchOpen && (
        <div style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 600,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 4px 16px var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          minWidth: 340,
        }}>
          <input
            ref={searchInputRef}
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey) { window.api.find.prev(searchTerm); }
                else { window.api.find.next(searchTerm); }
              }
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchTerm('');
                setSearchResult(null);
                window.api.find.stop();
              }
            }}
            placeholder="Find in diff (2+ chars)…"
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--fg)',
              fontSize: 12,
              padding: '3px 8px',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {searchResult
                ? searchResult.matches === 0
                  ? 'No results'
                  : `${searchResult.activeMatchOrdinal}/${searchResult.matches}`
                : '…'}
            </span>
          )}
          <button
            ref={searchPrevRef}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (searchTerm) window.api.find.prev(searchTerm); }}
            disabled={!searchTerm}
            title="Previous occurrence (Shift+Enter)"
            style={{ background: 'none', border: 'none', cursor: searchTerm ? 'pointer' : 'default', color: searchTerm ? 'var(--fg)' : 'var(--fg-muted)', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 3 }}
          >
            <ChevronUp size={14} />
          </button>
          <button
            ref={searchNextRef}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (searchTerm) window.api.find.next(searchTerm); }}
            disabled={!searchTerm}
            title="Next occurrence (Enter)"
            style={{ background: 'none', border: 'none', cursor: searchTerm ? 'pointer' : 'default', color: searchTerm ? 'var(--fg)' : 'var(--fg-muted)', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 3 }}
          >
            <ChevronDown size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setSearchOpen(false); setSearchTerm(''); setSearchResult(null); window.api.find.stop(); }}
            title="Close (Escape)"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 3 }}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

const ACTION_BTN: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)',
};

const DETAIL_BTN: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6,
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};
