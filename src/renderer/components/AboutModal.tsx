import React from 'react';

interface Props { onClose: () => void; }

const SECTION: React.CSSProperties = { marginBottom: 28 };
const H2: React.CSSProperties = { fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--fg)', borderBottom: '1px solid var(--border)', paddingBottom: 6 };
const P: React.CSSProperties = { fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 6 };
const CODE: React.CSSProperties = { fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 };
const TABLE_STYLE: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, marginBottom: 8 };
const TH_STYLE: React.CSSProperties = { textAlign: 'left', padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' };
const TD_STYLE: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--bg-tertiary)', verticalAlign: 'top' };

export function AboutModal({ onClose }: Props): React.JSX.Element {
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
            <div style={{ fontWeight: 700, fontSize: 17 }}>Claude Grove</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>Created by Haim Adrian</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

          <div style={SECTION}>
            <div style={H2}>Overview</div>
            <p style={P}>Claude Grove is a macOS desktop app for managing git worktrees across multiple repositories. It shows PR status, links Claude Code sessions to worktrees, and provides an in-app diff viewer — all in one place.</p>
            <p style={P}>Add one or more <strong>root folders</strong> in Settings. Claude Grove scans them for git repositories and lists all their worktrees in the main table.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Table Columns</div>
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
                  ['Branch', 'Current branch. Shows "detached" for detached HEAD state.'],
                  ['State', 'Badges: dirty (uncommitted changes), ↑N (ahead), ↓N (behind upstream), 🔒 (locked), prunable, ✓ safe (upstream gone or PR merged — safe to delete).'],
                  ['Last commit', 'Subject of the most recent commit.'],
                  ['Modified', 'Date and time of the most recent commit in your local timezone. Click the column header to sort by this field.'],
                  ['Sessions', 'Number of linked Claude Code sessions + primary session title. Sessions are matched by scanning which worktree paths they referenced most.'],
                  ['PR', 'Pull request status (OPEN / CLOSED / MERGED), check-run result (✓ passing, ✗ failing, ○ pending), and review decision. Requires gh CLI to be installed and authenticated.'],
                ].map(([col, desc]) => (
                  <tr key={col}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 120 }}>{col}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...P, fontSize: 12 }}>Drag column header borders to resize columns. Column headers are clickable to sort ascending/descending.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Row Actions</div>
            <p style={P}>Hover over any row to reveal the floating action buttons on the right:</p>
            <table style={TABLE_STYLE}>
              <thead>
                <tr>
                  <th style={TH_STYLE}>Action</th>
                  <th style={TH_STYLE}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['View', 'Open the worktree detail page showing commit history and in-app GitHub-style diff viewer.'],
                  ['Resume', 'Resume the linked Claude Code session in your configured terminal. For Warp: copies the resume command to clipboard and shows a notification. Only visible when a session is linked.'],
                  ['Edit', 'Open the worktree folder in your configured editor (set in Settings).'],
                  ['Rename', 'Rename the branch locally and on remote (push new name, delete old remote branch).'],
                  ['Delete', 'Remove the worktree. Optionally also delete the remote branch. Shows a safety warning if the branch may not be merged.'],
                  ['Finder', 'Reveal the worktree folder in Finder.'],
                  ['GitHub', 'Open the repository on GitHub in your browser. Only visible when the repo has a GitHub remote.'],
                ].map(([action, desc]) => (
                  <tr key={action}>
                    <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', width: 80 }}>{action}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={SECTION}>
            <div style={H2}>Worktree Detail View</div>
            <p style={P}>Click <strong>View</strong> on any row to open the detail page. It shows:</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li>Branch name, repo, full path, PR badge</li>
              <li>Action buttons: Resume, Open in editor, Reveal in Finder, View on GitHub, Rename, Delete</li>
              <li>Commit list (commits beyond the base branch)</li>
              <li>In-app diff viewer — click a commit to see its diff, or click <strong>Full diff vs base</strong> for the complete PR diff</li>
            </ul>
          </div>

          <div style={SECTION}>
            <div style={H2}>Filters and Search</div>
            <p style={P}>The filter bar above the table offers quick filters:</p>
            <ul style={{ paddingLeft: 20, color: 'var(--fg-muted)', fontSize: 13, lineHeight: 2 }}>
              <li><strong>Repo chips</strong> — filter to worktrees of a specific repository</li>
              <li><strong>dirty</strong> — only show worktrees with uncommitted changes</li>
              <li><strong>safe to delete</strong> — only show worktrees where upstream is gone or PR is merged</li>
              <li><strong>has PR</strong> — only show worktrees with an open or closed PR</li>
              <li><strong>locked</strong> — only show locked worktrees</li>
            </ul>
            <p style={P}>The search bar filters across repo name, branch, path, and PR title simultaneously. Filters and search combine with AND logic.</p>
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
                  ['Roots', 'Folders to scan for git repositories. Claude Grove finds all repos within these folders (up to 5 levels deep).'],
                  ['Theme', 'Light, dark, or follow the system setting.'],
                  ['Default terminal', 'Terminal used for Resume actions. Terminal.app and iTerm2 auto-run the command; Warp copies it to clipboard and shows a notification.'],
                  ['Editor', 'Click "Choose app…" to pick an application bundle, or type a CLI command (e.g. code, cursor).'],
                  ['Default base branch', 'Branch used to compute ahead/behind counts and diffs when no PR is found and origin/HEAD is not set.'],
                  ['PR cache TTL', 'How long (in seconds) PR information is cached before re-fetching from GitHub.'],
                ].map(([setting, desc]) => (
                  <tr key={setting}>
                    <td style={{ ...TD_STYLE, fontWeight: 500, whiteSpace: 'nowrap', width: 160 }}>{setting}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--fg-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={SECTION}>
            <div style={H2}>GitHub / PR Integration</div>
            <p style={P}>PR status requires the <code style={CODE}>gh</code> CLI to be installed and authenticated:</p>
            <p style={{ ...P, fontFamily: 'monospace', fontSize: 12 }}>brew install gh &amp;&amp; gh auth login</p>
            <p style={P}>PR information is fetched lazily per row and cached for the configured TTL. The Refresh button re-fetches the worktree list but PR cache is only invalidated when the TTL expires.</p>
          </div>

          <div style={SECTION}>
            <div style={H2}>Claude Code Sessions</div>
            <p style={P}>Claude Grove scans <code style={CODE}>~/.claude/projects/</code> for session files and links them to worktrees by tallying how many times each session referenced the worktree path. The session with the most references is shown as the primary session and used for the Resume action.</p>
            <p style={P}>The <strong>launchDir</strong> (the directory Claude Code was launched from) is used when resuming a session, not the worktree path itself.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
