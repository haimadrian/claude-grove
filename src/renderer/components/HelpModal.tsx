import React from 'react';
import { X } from 'lucide-react';

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
            <div style={{
              fontFamily: "'Bangers', cursive",
              fontSize: 34,
              letterSpacing: '0.08em',
              lineHeight: 1,
              color: 'var(--fg)',
              WebkitTextStroke: '0.5px var(--accent)',
              textShadow: '2px 2px 0 var(--accent), 4px 4px 0 rgba(0,0,0,0.15)',
            } as React.CSSProperties}>Claude Grove</div>
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
              <thead>
                <tr>
                  <th style={TH_STYLE}>Column</th>
                  <th style={TH_STYLE}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Repo', 'Name of the git repository the worktree belongs to.'],
                  ['Branch', 'Current branch. Shows "detached" for detached HEAD state. ⎘ copies the branch name.'],
                  ['State', 'Badges: dirty (uncommitted changes), ↑N (ahead), ↓N (behind upstream), locked, prunable, remote gone, merged. Hover for details.'],
                  ['Last commit', 'Short SHA (click to open on GitHub) + commit subject. ⎘ copies the full SHA.'],
                  ['Modified', 'Time of the most recent commit. Click column header to sort.'],
                  ['Sessions', 'Linked Claude Code sessions count + primary session title.'],
                  ['PR', 'Pull request status, CI check result, and review decision. Hover for details. Requires gh CLI.'],
                ].map(([col, desc]) => (
                  <tr key={col}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 120 }}>{col}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>In table view: drag column header borders to resize. Click headers to sort ascending/descending.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Actions</div>
            <p style={P}>In <strong>table view</strong>, hover any row to reveal floating action buttons on the right. In <strong>card view</strong>, click the <strong>⋮</strong> menu. Both expose the same actions:</p>
            <table style={TABLE_STYLE}>
              <thead>
                <tr>
                  <th style={TH_STYLE}>Action</th>
                  <th style={TH_STYLE}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['View', 'Open the worktree detail page with commit history and in-app diff viewer.'],
                  ['Resume ▶', 'Resume the linked Claude Code session in your configured terminal. If multiple sessions are linked, a picker appears. In card view, the ▶ button in the card header is a quick shortcut — no need to open ⋮.'],
                  ['Edit', 'Open the worktree folder in your configured editor.'],
                  ['Terminal', 'Open the worktree folder in your configured terminal.'],
                  ['Rename', 'Rename the branch locally and on remote.'],
                  ['Delete', 'Remove the worktree. Optionally also delete the remote branch.'],
                  ['Finder', 'Reveal the worktree folder in Finder.'],
                  ['GitHub', 'Open the repository on GitHub. Only visible when the repo has a GitHub remote.'],
                ].map(([action, desc]) => (
                  <tr key={action}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap', width: 100 }}>{action}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={SECTION}>
            <div style={H2}>Card View</div>
            <p style={P}>Cards are color-coded by repository — all worktrees from the same repo share the same accent color on the left border. Each card shows all worktree details as labeled rows: State, Commit, Modified, Path, Upstream, Sessions, and PR.</p>
            <p style={P}>Card header shortcuts: <strong>⎘</strong> copies the branch name. <strong>▶</strong> (visible when a session is linked) resumes the primary Claude session directly. <strong>⋮</strong> opens the full action menu.</p>
            <p style={P}>The commit SHA in the Commit row links to GitHub. <strong>⎘</strong> next to it copies the full SHA. Path and Upstream rows also have <strong>⎘</strong> copy buttons.</p>
            <p style={P}>The card grid always shows 3 columns × 3 rows. Cards resize with the window. If there are more than 9 worktrees, the grid scrolls. Card content scrolls vertically within the card if it overflows.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Worktree Detail View</div>
            <p style={P}>Click any worktree to open its detail page. It shows the branch, repo, path, PR badge, and action buttons, plus a two-panel layout: commit list on the left, diff viewer on the right (drag the splitter to resize).</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li>Click a commit in the list to see its diff</li>
              <li>Click <strong>Full diff vs base</strong> for the complete PR diff</li>
              <li>The <strong>↺ Refresh</strong> button in detail view reloads only this worktree's diff and commits — it does not reload the full list</li>
            </ul>
          </div>

          <div style={SECTION}>
            <div style={H2}>Filters and Search</div>
            <p style={P}>The filter bar has:</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li><strong>Repos ▾</strong> — multi-select dropdown. Includes a search box to filter repos by name and a Select all / Deselect all checkbox.</li>
              <li><strong>Sort</strong> — click any sort chip to sort by that field; click again to reverse.</li>
              <li><strong>dirty</strong> — only worktrees with uncommitted changes</li>
              <li><strong>safe to delete</strong> — upstream gone or PR merged</li>
              <li><strong>has PR</strong> — worktrees with a linked PR</li>
              <li><strong>locked</strong> — locked worktrees only</li>
            </ul>
            <p style={P}>The search bar (above the filter bar) filters across repo name, branch, path, and PR title. All filters and search combine with AND logic. Filter and sort state persists across restarts separately for table and card view.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Settings</div>
            <table style={TABLE_STYLE}>
              <thead>
                <tr>
                  <th style={TH_STYLE}>Setting</th>
                  <th style={TH_STYLE}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Roots', 'Folders to scan for git repositories (up to 5 levels deep).'],
                  ['Default terminal', 'Terminal used for Resume actions. Terminal.app and iTerm2 auto-run the command; Warp copies it to clipboard.'],
                  ['Editor', 'Click "Choose app…" to pick an app bundle, or type a CLI command (e.g. code, cursor).'],
                  ['Default base branch', 'Fallback branch for ahead/behind counts and diffs when no PR exists and origin/HEAD is not set.'],
                  ['PR cache TTL', 'How long (seconds) PR data is cached before re-fetching from GitHub.'],
                ].map(([setting, desc]) => (
                  <tr key={setting}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 160 }}>{setting}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>Theme (light / dark) is controlled by the <strong>☀ / ☾</strong> button in the header — it is not in Settings. The preference is saved to local storage and remembered across restarts. On first launch, the system appearance is used.</p>
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
