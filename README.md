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

GitHub-style diff without leaving the app. Commit list on the left, per-commit diff or full diff vs base on the right.

- **File tree sidebar** — always-visible collapsible panel showing changed files grouped by folder. `+`/`-` counts on each file. Click any file to jump straight to its section in the diff. Drag the splitter to resize (220 px default).
- **Collapsible commit list** — click the splitter between the commit list and diff area to pin it open or closed. Drag to resize. State persists across sessions.
- **Eye button** on cards — open the diff view directly from the worktree card without entering the detail screen first.
- **Find in diff** (`Cmd+F`) — floating search bar with match counter (`n/m`), next/prev buttons, Enter / Shift+Enter navigation. Works reliably even when Chromium steals focus during search.
- **Ignore-whitespace toggle** and unified/split view selector.
- **Parent branch override** — a searchable branch picker next to the PR badge lets you diff against any local or remote branch instead of the auto-detected base. Defaults to "Auto (\<detected branch\>)"; your override is remembered per worktree across restarts until you pick "Auto" again.

### Jira ticket links

If a branch name contains a Jira-style ticket id (e.g. `t2a-3131`, `eco-2120`), a small badge showing the uppercased id appears next to the branch name in table view, card view, and the diff detail page. Click it to open the ticket. Configure the base URL in **Settings → Jira base URL** (default: `https://honeybook.atlassian.net/browse`); clearing the field hides the badge everywhere.

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

Rename, Delete, Update, and Merge from operations are grouped under a **⎇ Git** submenu in both the ⋮ card menu and the table floating actions, keeping the top-level action list clean.

| Git action | Description |
|---|---|
| Update (pull) | `git pull` — fetch and merge the upstream branch |
| Rename branch | Rename locally and push to remote |
| Delete worktree | Remove worktree; optionally delete remote branch |
| Merge from… | Merge any local or remote branch into this worktree. Clean merges just show a toast; conflicts open the in-app conflict resolver (see below). The worktree's own branch is excluded from the picker (merging a branch into itself is meaningless), but its remote-tracking counterpart (`origin/<same-name>`) stays available for pulling latest. |

### Merge conflict resolver

When **Merge from…** can't merge cleanly, an in-app 3-way resolver opens instead of dropping you to the command line.

- **Mine / Result / Theirs** — three columns, each labeled with the actual branch name (e.g. `MINE (feature/foo)`, `THEIRS (origin/main)`). Mine and Theirs show each branch's real file content with newly-added lines highlighted — never raw `<<<<<<<`/`=======`/`>>>>>>>` conflict-marker text.
- **Per-conflict accept arrows** — a `»` button between Mine and Result, and a `«` button between Result and Theirs, right beside each conflict's row. Click either to take that side for just that conflict; the Result column is also directly editable if neither side is exactly right.
- **Sticky header, synced scrolling** — the column headers stay pinned while you scroll; the file tabs (when more than one file has conflicts), the `↑`/`↓` conflict navigator, and the "opens at the first conflict" behavior all help you move through a large file without losing your place.
- **Abort merge** is always available, at any point, even after resolving some files — it runs `git merge --abort` and discards all progress.
- Finishing every conflicted file automatically completes the merge (`git commit`, no prompt) — same one-step feel as a clean merge.

Most merges are clean and never show this dialog at all — it only appears when git genuinely can't auto-resolve something.

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
| Default editor | App bundle or CLI command (e.g. `code`, `cursor`) |
| Card layout | Columns and rows for the card grid (1–6 each, default 3×3) |
| Base branch | Default base branch for diffs (fallback when no PR or `origin/HEAD`). Also configure which branches (`main`, `master`) to hide from the list. |
| Jira base URL | Base URL for the Jira ticket badge shown on branch names (default: `https://honeybook.atlassian.net/browse`). Clear to disable the badge. |
| PR cache TTL | Seconds to cache PR data before re-fetching |

Theme (☀/☾) is in the header, not Settings.

Long-running operations (pull, rename branch, delete worktree) show an animated progress toast with the branch name. Multiple concurrent operations each get their own independent toast. The list refreshes automatically on success.

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

### Troubleshooting

**`dyld: Library not loaded: @rpath/Electron Framework.framework/Electron Framework`**

Electron's postinstall download was interrupted, leaving an incomplete `dist/Electron.app` (only `MacOS/` and `Resources/`, missing `Frameworks/`). Fix by re-extracting from the cached zip:

```bash
cd node_modules/electron/dist
unzip -o ~/Library/Caches/electron/electron-v33.4.11-darwin-arm64.zip
```

Replace `arm64` with `x64` if you are on an Intel Mac. After extraction, `pnpm dev` should start normally.

If the zip is missing from the cache (first-ever install, cache cleared), force a re-download:

```bash
node node_modules/electron/install.js
```

**`Error: Electron uninstall` / `Error: Electron failed to install correctly`**

If your environment sets `ELECTRON_SKIP_BINARY_DOWNLOAD`, `electron`'s own postinstall script exits immediately without extracting the binary or writing its `path.txt` marker — `pnpm install` completes with no error, but `require('electron')` fails. Extract manually from the cached zip and write the marker yourself:

```bash
cd node_modules/.pnpm/electron@<version>/node_modules/electron/dist
ditto -x -k ~/Library/Caches/electron/electron-v<version>-darwin-arm64.zip .
echo -n "Electron.app/Contents/MacOS/Electron" > ../path.txt
```

Use `ditto`, not `unzip` — `unzip` doesn't reliably preserve the code-signature resources macOS app bundles need, which shows up next as `spctl: code has no resources but signature indicates they must be present`.

**Electron launches then exits immediately with code 1 and no output (`spctl -a` reports `rejected`)**

The downloaded Electron binary is ad-hoc signed but not notarized, so Gatekeeper blocks it — same root cause as the DMG note above, just hitting the raw dev binary instead of the packaged app. Ad-hoc re-sign it, then clear the quarantine/provenance attributes:

```bash
codesign --force --deep --sign - node_modules/.pnpm/electron@<version>/node_modules/electron/dist/Electron.app
xattr -cr node_modules/.pnpm/electron@<version>/node_modules/electron/dist/Electron.app
```

`pnpm dev` should launch normally afterward.

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
