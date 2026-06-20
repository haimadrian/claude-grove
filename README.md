# Claude Grove

A macOS desktop app for developers who live in git worktrees.

If you follow a workflow where every ticket gets its own worktree — branches auto-deleted on merge, multiple repos in flight at once, Claude Code sessions scattered across them — your mental overhead grows fast. Claude Grove gives you a single dashboard to see everything, act on it, and move on.

## What it does

### Dual layout: table and card view

Toggle between views using **≡ / ⊞** in the header.

**Table view** — a compact sortable/filterable/resizable table. Each row is one worktree. Columns: Repo, Branch, State, Last commit (SHA link + subject), Modified, Sessions, PR. Hover a row for floating action buttons.

**Card view** — color-coded cards, one per worktree. Each repo gets its own consistent accent color on the card's left border. Cards always show 3 columns × 3 rows; extra cards scroll. Each card shows all fields as labeled rows (State, Commit, Modified, Path, Upstream, Sessions, PR). The card body scrolls if content overflows.

### PR status at a glance

Shows CI check status and review decision (approved / changes requested / pending) without opening the browser. Hover State or PR badges for a tooltip with full details. Commit SHAs are clickable links to the commit on GitHub.

### In-app diff viewer

GitHub-style diff without leaving the app. Commit list on the left, per-commit diff or full diff vs base on the right. Drag the splitter to resize. Ignore-whitespace toggle.

### Claude Code session linkage

Finds which Claude session was working on which worktree by tallying file paths in session history. Cards show a **▶** button in the header for one-click resume of the primary session. Multiple sessions show a picker. The Resume button is also available in the table's floating actions and the worktree detail page.

### Copy to clipboard

**⎘** buttons appear next to: branch name (card header, table row hover), commit SHA, Path, and Upstream. Click to copy; the icon briefly changes to **✓**. Commit SHAs link to GitHub when the repo has a remote.

### Filter bar

- **Repos ▾** — multi-select dropdown with a search box and a select-all / deselect-all checkbox
- **Sort** — sortable by Repo, Branch, Last commit, Modified, Sessions, PR
- **dirty / safe to delete / has PR / locked** — boolean filter chips
- **Search bar** — live substring filter across repo name, branch, path, and PR title
- All filters combine with AND. State persists separately for table and card view across restarts.

### Worktree operations (row actions / ⋮ menu)

| Action | Description |
|---|---|
| View diff | Open detail view |
| Resume Claude ▶ | Resume linked Claude Code session |
| Edit in IDE | Open worktree in configured editor |
| Terminal | Open worktree in configured terminal |
| Rename branch | Rename locally and push to remote |
| Delete worktree | Remove worktree; optionally delete remote branch |
| Open in Finder | Reveal in macOS Finder |
| Open on GitHub | Open repo in browser |

### Refresh button — context-aware

- **In list view**: reloads all worktrees from git.
- **In detail view**: reloads only the current worktree's diff and commit list — does not touch the list.

### Theme toggle

**☀ / ☾** button in the header switches between light and dark. On first launch, the system appearance is used. The preference is saved to `localStorage` and persists across restarts.

### Terminal adapters

- **Terminal.app** — opens a new window and runs `claude --resume <session-id>`
- **iTerm2** — same, in a new tab
- **Warp** — copies the resume command to clipboard and shows a macOS notification

### Settings

Configure root folders to scan, your editor (native app picker), default terminal, default base branch, and PR cache TTL. Theme is controlled by the ☀/☾ header button, not Settings.

## Requirements

- macOS (AppleScript is used for terminal integration)
- Node.js 18+, pnpm
- `gh` CLI for PR status (optional): `brew install gh && gh auth login`
- Internet access for the Bangers display font (Google Fonts) — falls back to system `cursive` if offline

## First run

### macOS Gatekeeper

The DMG is ad-hoc signed but not notarized (no Apple Developer certificate). macOS will block it on first open. To bypass:

**Option 1 — Terminal (recommended):**
```bash
xattr -cr "/Applications/Claude Grove.app"
```
Then open the app normally.

**Option 2 — System Settings:**
System Settings → Privacy & Security → scroll to the "Claude Grove.app was blocked" notice → click **Open Anyway**.

### Initial setup

On first launch, add a root folder (e.g. `~/Documents/GIT`) in Settings. Claude Grove walks the directory tree, finds every git repo, and lists all their worktrees.

## Development

```bash
pnpm install
```

### Hot-reload dev mode
```bash
pnpm dev
```

### TypeScript check
```bash
pnpm typecheck
```

### Unit tests (vitest)
```bash
pnpm test
```

### Build .dmg -> release/
```bash
pnpm package
```
