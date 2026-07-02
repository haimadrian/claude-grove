import React from 'react';
import { X } from 'lucide-react';
import { Logo } from './Logo';

interface Props { onClose: () => void; }

const SECTION: React.CSSProperties = { marginBottom: 28 };
const H2: React.CSSProperties = { fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--fg)', borderBottom: '1px solid var(--border)', paddingBottom: 6 };
const P: React.CSSProperties = { fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 6 };
const CODE: React.CSSProperties = { fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 };
const TABLE_STYLE: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, marginBottom: 8 };
const TH_STYLE: React.CSSProperties = { textAlign: 'left', padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' };
const TD_STYLE: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--bg-tertiary)', verticalAlign: 'top' };

export function HelpModal({ onClose }: Props): React.JSX.Element {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        width: '85vw', maxWidth: 860, height: '82vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 40px var(--shadow)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <Logo />
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>Created by Haim Adrian</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

          <div style={SECTION}>
            <div style={H2}>Overview</div>
            <p style={P}>Claude Grove is a macOS desktop app for managing git worktrees across multiple repositories. It shows PR status, links Claude Code sessions to worktrees, and provides an in-app diff viewer — all in one place.</p>
            <p style={P}>Add one or more <strong>root folders</strong> in Settings. Claude Grove scans them for git repositories and lists all their worktrees.</p>
            <p style={P}>The header toolbar has: <strong>↺</strong> Refresh, <strong>≡ / ⊞</strong> layout toggle (table / card), <strong>☀ / ☾</strong> theme toggle (light / dark), <strong>?</strong> Help, <strong>⚙</strong> Settings. The layout and theme preferences persist across restarts.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Table / Card Columns</div>
            <table style={TABLE_STYLE}>
              <thead><tr><th style={TH_STYLE}>Column</th><th style={TH_STYLE}>Description</th></tr></thead>
              <tbody>
                {[
                  ['Repo', 'Git repository name.'],
                  ['Branch', 'Current branch. ⎘ copies it.'],
                  ['State', 'Badges: dirty, ↑N ahead, ↓N behind, locked, prunable, remote gone, merged. Hover for details. Shows time since last commit inline.'],
                  ['Last commit', 'Short SHA (links to GitHub) + commit subject. ⎘ copies the full SHA.'],
                  ['Modified', 'Time of last commit. Sortable.'],
                  ['Sessions', 'Linked Claude Code sessions + primary title.'],
                  ['Label', 'User-assigned label (table view only as a column). Set via Shift+click multi-select.'],
                  ['PR', 'PR status, CI checks, review decision. Hover for details. Requires gh CLI.'],
                ].map(([col, desc]) => (
                  <tr key={col}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 110 }}>{col}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>In table view: drag column header borders to resize. Click headers to sort.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Actions</div>
            <p style={P}>Actions are grouped into three sections. In <strong>table view</strong>: hover a row to reveal floating icon buttons. In <strong>card view</strong>: click <strong>⋮</strong>. In card view, the <strong>▶</strong> button in the card header is a quick Resume shortcut without opening ⋮.</p>
            <table style={TABLE_STYLE}>
              <thead><tr><th style={TH_STYLE}>Section</th><th style={TH_STYLE}>Actions</th></tr></thead>
              <tbody>
                {[
                  ['View / Resume', 'View diff (open detail page) · Resume Claude session (▶ in card header or ⋮ menu)'],
                  ['Edit / Terminal / Finder', 'Open in editor · Open in terminal · Reveal in Finder'],
                  ['⎇ Git / GitHub', 'Update (pull) · Rename branch · Delete worktree · Open on GitHub'],
                ].map(([section, actions]) => (
                  <tr key={section}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 160 }}>{section}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>The <strong>⎇ Git</strong> submenu groups Rename, Delete, and Update (pull) to keep the top-level action list clean.</p>
            <p style={{ ...P, fontSize: 12 }}>Long-running git operations — <strong>Update (pull)</strong>, <strong>Rename branch</strong>, and <strong>Delete worktree</strong> — show a progress toast with the branch name while running. Multiple concurrent operations each get their own toast. The worktree list refreshes automatically on success.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Labels</div>
            <p style={P}>Assign a text label to any worktree to group and filter them. Labels persist across restarts and sync between table and card view instantly.</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li><strong>Shift+click</strong> cards or table rows to multi-select (accent outline on cards, tinted rows in table)</li>
              <li>A <strong>LabelBar</strong> floats at the bottom — type a label and press Enter or click <strong>Set</strong></li>
              <li>Empty label removes it. <strong>✕</strong> clears the selection without changing labels</li>
              <li>In card view, labeled cards are <strong>grouped by label</strong> with a colored section header</li>
              <li>The <strong>Labels ▾</strong> dropdown in the filter bar filters to specific labels</li>
              <li>The <strong>Label column</strong> in table view shows the current label for each row</li>
            </ul>
          </div>

          <div style={SECTION}>
            <div style={H2}>Card View</div>
            <p style={P}>Cards are color-coded by repository. Each card shows: State + time, PR, Commit (SHA links to GitHub), Path, Sessions, Upstream. Card body scrolls if content overflows.</p>
            <p style={P}>Header buttons: <strong>⎘</strong> copies branch name · <strong>▶</strong> resumes the primary Claude session · <strong>⋮</strong> opens the full action menu (flips upward automatically when near the bottom of the screen).</p>
            <p style={P}>The grid size (columns × rows) is configurable in Settings. Cards resize automatically to fill the visible area. If there are more cards than the grid shows, it scrolls.</p>
            <p style={P}>When any worktree has a label, cards are grouped into labeled sections separated by a colored horizontal rule.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Worktree Detail View</div>
            <p style={P}>Click <strong>View diff</strong> (⋮ menu, table floating action, or <strong>👁</strong> icon on card header) to open the detail page.</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li>Click a commit to see its diff · <strong>Full diff vs base</strong> for the complete PR diff</li>
              <li>A <strong>file tree</strong> panel always shows changed files — click any file to jump to it in the diff. Folders are collapsible. Drag the splitter between the tree and diff to resize it.</li>
              <li>The <strong>commit list splitter</strong> (left edge of diff area) can be clicked to collapse/expand the commit list. Drag it to resize.</li>
              <li><strong>Cmd+F</strong> — open find-in-page search. Type 2+ characters to highlight all matches. <strong>Enter</strong> = next, <strong>Shift+Enter</strong> = prev. Click ↑ ↓ buttons or press Escape to close.</li>
              <li><strong>↺ Refresh</strong> in detail view reloads only this worktree's diff and commits — not the full list</li>
            </ul>
          </div>

          <div style={SECTION}>
            <div style={H2}>Filters and Search</div>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li><strong>Repos ▾</strong> — multi-select with search and select-all checkbox</li>
              <li><strong>Labels ▾</strong> — same multi-select, filters by label; only appears when labels exist</li>
              <li><strong>Sort</strong> — Repo, Branch, Last commit, Modified, Sessions, PR, Label</li>
              <li><strong>dirty / safe to delete / has PR / locked</strong> — boolean chips</li>
            </ul>
            <p style={P}>The search bar filters repo name, branch, path, and PR title simultaneously. All filters combine with AND. State persists separately per layout across restarts.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Settings</div>
            <table style={TABLE_STYLE}>
              <thead><tr><th style={TH_STYLE}>Setting</th><th style={TH_STYLE}>Description</th></tr></thead>
              <tbody>
                {[
                  ['Roots', 'Folders to scan for git repositories (up to 5 levels deep).'],
                  ['Default terminal', 'Terminal for Resume. Terminal.app and iTerm2 auto-run the command; Warp copies it.'],
                  ['Default editor', 'App bundle or CLI command (e.g. code, cursor).'],
                  ['Card layout', 'Columns and rows for the card grid (1–6 each, default 3×3).'],
                  ['Base branch', 'Fallback branch for diffs. Also hides main / master worktrees from the list. Applied on Save.'],
                  ['PR cache TTL', 'Seconds to cache PR data before re-fetching.'],
                ].map(([setting, desc]) => (
                  <tr key={setting}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 140 }}>{setting}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>Theme (☀/☾) is in the header, not Settings. Persists to localStorage; system default on first launch.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>GitHub / PR Integration</div>
            <p style={P}>PR status requires the <code style={CODE}>gh</code> CLI to be installed and authenticated:</p>
            <pre style={{
              fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              padding: '8px 12px', marginBottom: 8, overflowX: 'auto',
              color: 'var(--fg)', lineHeight: 1.6,
            }}>{'brew install gh && gh auth login'}</pre>
            <p style={P}>PR data is fetched lazily per row and cached for the configured TTL. Commit SHAs in both table and card views are clickable links to the commit on GitHub (requires a GitHub remote).</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Claude Code Sessions</div>
            <p style={P}>Claude Grove scans <code style={CODE}>~/.claude/projects/</code> for session files and links them to worktrees by tallying path references in the session history. The session with the most references is the primary and is used for the Resume action.</p>
            <p style={P}>The <strong>launchDir</strong> (the directory Claude Code was launched from) is used when resuming — not the worktree path itself. Multiple sessions linked to one worktree show a picker when you click Resume.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
