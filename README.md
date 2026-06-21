# Claude Grove

A macOS desktop app for developers who live in git worktrees.

If you follow a workflow where every ticket gets its own worktree — branches auto-deleted on merge, multiple repos in flight at once, Claude Code sessions scattered across them — your mental overhead grows fast. Claude Grove gives you a single dashboard to see everything, act on it, and move on.

## What it does

### Dual layout: table and card view

Toggle between views using **≡ / ⊞** in the header.

**Table view** — a compact sortable/filterable/resizable table. Columns: Repo, Branch, State, Last commit (SHA link + subject), Modified, Sessions, Label, PR. Hover a row for floating action buttons. Shift+click rows for multi-select.

**Card view** — color-coded cards grouped by label. Each repo gets its own accent color on the left border. Cards are arranged in a configurable grid (default 3×3, adjustable in Settings). Each card shows State, PR, Commit, Path, Sessions, Upstream. Shift+click cards for multi-select.

### Labels

Assign persistent text labels to any worktree to group and filter them.

- **Shift+click** one or more cards / table rows to multi-select
- A **LabelBar** floats at the bottom — type a label and click **Set** (or press Enter)
- Empty label removes it. **✕** clears the selection without changing labels.
- In card view, cards are grouped by label with a colored section header and separator line
- **Labels ▾** filter dropdown in the filter bar — multi-select with search and select-all
- Labels persist across restarts and are instantly visible in both table and card view

### PR status at a glance

Shows CI check status and review decision (approved / changes requested / pending) without opening the browser. Hover State or PR badges for a tooltip with full details. Commit SHAs link directly to GitHub.

### In-app diff viewer

GitHub-style diff without leaving the app. Commit list on the left, per-commit diff or full diff vs base on the right. Drag the splitter to resize. Ignore-whitespace toggle.

### Claude Code session linkage

Finds which Claude session was working on which worktree by tallying file paths in session history. Cards show a **▶** button in the header for one-click resume. Multiple sessions show a picker.

### Copy to clipboard

**⎘** buttons appear next to: branch name, commit SHA, Path, and Upstream. Click to copy; flashes **✓** on success. Commit SHAs are also clickable links to GitHub.

### Filter bar

- **Repos ▾** — multi-select dropdown with search and select-all/deselect-all
- **Labels ▾** — same multi-select dropdown, filters to worktrees with specific labels
- **Sort** — by Repo, Branch, Last commit, Modified, Sessions, PR, Label
- **dirty / safe to delete / has PR / locked** — boolean filter chips
- **Search bar** — live filter across repo name, branch, path, and PR title
- All filters combine with AND logic. State persists per layout across restarts.

### Git actions (⎇ menu)

Rename, Delete, and Update operations are grouped under a **⎇ Git** submenu in both the ⋮ card menu and the table floating actions, keeping the top-level action list clean.

| Git action | Description |
|---|---|
| Update (pull) | `git pull` — fetch and merge the upstream branch |
| Rename branch | Rename locally and push to remote |
| Delete worktree | Remove worktree; optionally delete remote branch |

### All row/card actions

Actions are grouped into three sections:

| Section | Actions |
|---|---|
| View / Resume | Open detail view, Resume Claude session |
| Edit / Terminal / Finder | Open in editor, terminal, Finder |
| Git / GitHub | ⎇ Git submenu, Open on GitHub |

### Refresh button — context-aware

- **In list view**: reloads all worktrees from git
- **In detail view**: reloads only the current worktree's diff and commits — does not touch the list

### Theme toggle

**☀ / ☾** button in the header switches light/dark. First launch uses the system default. Persists to `localStorage`.

### Terminal adapters

- **Terminal.app** — opens a new window and runs `claude --resume <session-id>`
- **iTerm2** — same, in a new tab
- **Warp** — copies the resume command to clipboard and shows a macOS notification

### Settings

| Setting | Description |
|---|---|
| Roots | Folders to scan for git repos (up to 5 levels deep) |
| Default terminal | Terminal used for Resume actions |
| Editor | App bundle or CLI command (e.g. `code`, `cursor`) |
| Card layout | Columns and rows for the card grid (1–6 each, default 3×3) |
| Ignored branches | Hide `main` and/or `master` worktrees from the list to reduce noise when managing many repositories. |
| Default base branch | Fallback for diffs when no PR or `origin/HEAD` |
| PR cache TTL | Seconds to cache PR data before re-fetching |

Theme (☀/☾) is in the header, not Settings.

## Requirements

- macOS (AppleScript is used for terminal integration)
- Node.js 18+, pnpm
- `gh` CLI for PR status (optional): `brew install gh && gh auth login`
- Internet access for the Bangers display font (Google Fonts) — falls back to system `cursive` if offline

## First run

### macOS Gatekeeper

The DMG is ad-hoc signed but not notarized. macOS will block it on first open. To bypass:

**Option 1 — Terminal (recommended):**
```bash
xattr -cr "/Applications/Claude Grove.app"
```
Then open the app normally.

**Option 2 — System Settings:**
System Settings → Privacy & Security → scroll to "Claude Grove.app was blocked" → **Open Anyway**.

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

### Regenerate app icon
```bash
node scripts/create-icon.mjs
```

### Build .dmg → release/
```bash
pnpm package
```
