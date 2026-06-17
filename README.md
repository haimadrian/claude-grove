# Claude Grove

A macOS desktop app for developers who live in git worktrees.

If you follow a workflow where every ticket gets its own worktree — branches auto-deleted on merge, multiple repos in flight at once, Claude Code sessions scattered across them — your mental overhead grows fast. Claude Grove gives you a single dashboard to see everything, act on it, and move on.

## What it does

### Worktree dashboard
One table across all repos and all worktrees. Columns: repo, branch, state (dirty / ahead / behind / locked), last commit message, modified time, linked Claude session, PR status. Sticky, sortable, resizable columns. Search and filter chips.

### PR status at a glance
Shows CI check status and review decision (approved / changes requested / pending) without opening the browser. Branches whose remote was deleted after merge are flagged as safe to clean up.

### In-app diff viewer
GitHub-style diff without leaving the app. Commit list on the left, per-commit diff or full diff vs base. Staged/unstaged file panel with checkboxes — commit directly from the UI.

### Claude Code session linkage
Finds which Claude session was working on which worktree by tallying file paths in session history. The Resume button opens that session directly in your terminal.

### Terminal adapters
- **Terminal.app** — opens a new window and runs `claude --resume <session-id>`
- **iTerm2** — same, in a new tab
- **Warp** — copies the resume command to clipboard and shows a notification (Warp's AppleScript API doesn't support auto-run)

### Row actions
Hover any row to get: View diff, Resume Claude, Edit in IDE, Rename branch, Delete worktree, Open in Finder, Open on GitHub.

### Settings
Configure root folders to scan, your editor (native app picker), default terminal, and theme (light / dark / system). Window state persists between launches.

## Requirements

- macOS (AppleScript is used for terminal integration)
- Node.js 18+, pnpm
- `gh` CLI for PR status (optional): `brew install gh && gh auth login`

## First run

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
