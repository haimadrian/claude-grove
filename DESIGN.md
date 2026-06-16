# Claude Grove - Technical Design & Implementation Spec

> Repo: `claude-grove`. A macOS desktop app to view and manage all your local git
> worktrees - PR status, Claude Code sessions, and GitHub-style diffs in one place.

A cross-user, shareable macOS desktop app to view and manage local git worktrees across
multiple repositories, with Claude Code session linkage, GitHub PR status, an in-app
GitHub-style diff viewer, and worktree lifecycle operations.

This document is the implementation contract. Follow it precisely. Where a command,
field name, or type is specified, use it exactly. Do not invent fields, paths, or flags
that are not listed here. When something is genuinely ambiguous, prefer the simplest
behavior described and leave a clearly-marked `TODO(impl):` comment rather than guessing.

---

## 0. Critical implementation rules (read first)

1. **No shell string interpolation for git/gh.** Always use `execFile`/`spawn` with an
   **argument array**. Never build a command by concatenating user/branch/path strings
   into a single shell string. This prevents command injection and quoting bugs. The only
   exception is the terminal-launch AppleScript in §9, which is carefully escaped.
2. **No hardcoded paths, usernames, or org names** anywhere in source. Everything
   machine-specific comes from Settings (§8). The app must run unchanged on someone
   else's Mac. `~/.claude/projects` is the one well-known path and is itself overridable
   in Settings.
3. **All privileged work runs in the Electron main process.** The renderer never calls
   `child_process`, `fs`, or touches git directly. It talks only through the typed IPC
   bridge (§7).
4. **`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`** on the
   BrowserWindow. The preload exposes a minimal frozen API via `contextBridge`.
5. **Validate every path argument in main**: a worktree/repo path passed from the
   renderer must be inside one of the configured roots (or be a known discovered worktree
   path). Reject otherwise. Sanitize branch names against `^[A-Za-z0-9._\-/]+$`.
6. **macOS only** for v1 (AppleScript terminal integration). Keep platform-specific code
   isolated in `terminals/` so other platforms can be added later. Do not add Windows/
   Linux branches now.
7. **No Playwright. No e2e.** Tests are vitest unit tests on pure logic only (§11).

---

## 1. Stack & tooling

Mirror the `claude-village` project exactly (it is the reference template at
`~/Documents/GIT/claude-village`). Pinned versions:

- `electron` ^33.0.0
- `electron-vite` ^2.3.0
- `electron-builder` ^25.0.0
- `vite` ^5.4.21
- `react` ^18.3.1, `react-dom` ^18.3.1
- `typescript` ^5.6.0
- `vitest` ^2.1.0, `@vitest/coverage-v8` ^2.1.0
- `@vitejs/plugin-react` ^4.7.0
- `electron-log` ^5.4.3 (logging)
- ESLint + Prettier configs copied from claude-village

Package manager: **pnpm**. `"type": "module"`. Build via `electron-vite build`, package
via `electron-builder --mac --publish never`.

Diff rendering library (new dependency, not in claude-village):
- `react-diff-view` (latest 3.x) for rendering unified diffs, plus its peer
  `gitdiff-parser` (used by react-diff-view's `parseDiff`). Do not hand-roll a diff
  parser for rendering.

Do NOT pull in: `@react-three/*`, `three`, `pathfinding` (those are village-specific).

---

## 2. Project structure

```
claude-grove/
  package.json
  electron.vite.config.ts          # copy/adapt from claude-village
  electron-builder.yml             # copy/adapt; appId com.<you>.worktree-manager
  tsconfig.base.json / tsconfig.node.json / tsconfig.web.json
  vitest.config.ts
  eslint.config.js / .prettierrc
  src/
    main/
      index.ts                     # app lifecycle, BrowserWindow, registers IPC
      ipc.ts                       # all ipcMain.handle registrations -> services
      logger.ts                    # electron-log wrapper (copy from village)
      git/
        gitRunner.ts               # execFile wrapper; injectable for tests
        repoScanner.ts             # walk roots -> list of git repos
        worktrees.ts               # `git worktree list --porcelain` + enrichment
        diff.ts                    # commit log, per-commit diff, full diff vs base
        operations.ts              # remove / deleteRemote / create / sync
        remoteUrl.ts               # normalize remote URL -> https browse URL
        baseBranch.ts              # resolve base branch for a worktree
      gh/
        ghRunner.ts                # execFile wrapper for `gh`; status checks
        pr.ts                      # PR lookup + TTL cache
      sessions/
        sessionScanner.ts          # scan claudeProjectsDir, parse jsonl (cached by mtime)
        sessionLinker.ts           # path-tally linkage of sessions -> worktrees
      settings/
        settings.ts                # load/save userData/settings.json + defaults
      security/
        validate.ts                # path-within-roots + branch-name validation
    preload/
      index.ts                     # contextBridge -> window.api (typed)
    renderer/
      index.html
      main.tsx
      App.tsx
      theme/
        ThemeProvider.tsx          # system/light/dark, CSS variables
        tokens.css                 # :root + [data-theme] variable definitions
      components/
        WorktreeTable.tsx          # flat sortable/filterable table
        SearchBar.tsx              # live text filter
        FilterBar.tsx              # repo / state filter chips + column sort controls
        WorktreeDetail.tsx         # right pane / route for a single worktree
        CommitList.tsx
        DiffViewer.tsx             # react-diff-view wrapper
        OperationsMenu.tsx         # remove / delete-remote / sync / create
        TerminalSplitButton.tsx    # primary + flyout (Terminal/iTerm2/Warp)
        PrBadge.tsx
        GhMissingNotice.tsx
        SettingsPage.tsx
        Onboarding.tsx             # first-run: add a root
        Toast.tsx / ConfirmDialog.tsx
      hooks/
        useWorktrees.ts            # calls api, holds list + refresh + focus refresh
        useSettings.ts
      context/
        AppDataContext.tsx
    shared/
      types.ts                     # ALL cross-process types (the data contract)
      ipcChannels.ts               # channel name string constants
```

---

## 3. Data model (`src/shared/types.ts`)

Define these exactly. These are the IPC contract; renderer and main both import them.

```ts
export type Theme = 'system' | 'light' | 'dark';
export type TerminalKind = 'Terminal' | 'iTerm2' | 'Warp';
export type SyncAction = 'fetch' | 'pull' | 'mergeBase' | 'prune';

export interface Settings {
  version: 1;
  roots: string[];                 // absolute folders to scan for git repos
  claudeProjectsDir: string;       // default: <home>/.claude/projects
  defaultBaseBranch: string;       // default: 'main'
  prCacheTtlSeconds: number;       // default: 60
  editorCommand: string;           // default: 'code' (CLI command name)
  defaultTerminal: TerminalKind;   // default: 'Terminal'
  newWorktreeParentDir: string | null; // null -> <repoRoot>/worktrees
  theme: Theme;                    // default: 'system'
}

export interface RepoRef {
  name: string;                    // basename of repo root
  path: string;                    // absolute repo root (the main working tree)
  remoteUrl: string | null;        // normalized https browse URL or null
  ownerRepo: string | null;        // "owner/repo" if a GitHub remote, else null
}

export interface SessionLink {
  sessionId: string;               // uuid (jsonl filename without extension)
  jsonlPath: string;
  launchDir: string;               // session 'cwd' field == CLAUDE_PROJECT_DIR
  lastActivity: string;            // ISO; last entry timestamp (fallback: file mtime)
  title: string | null;           // 'aiTitle' if present, else first user prompt snippet
  matchCount: number;              // # of path references to this worktree (see §6)
  isPrimary: boolean;              // highest matchCount session for the worktree
}

export interface PrInfo {
  number: number;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  checksState: 'PASSING' | 'FAILING' | 'PENDING' | 'NONE';
  baseRefName: string;
  title: string;
}

export interface WorktreeRow {
  id: string;                      // stable id: the worktree absolute path
  repo: RepoRef;
  path: string;                    // worktree absolute path
  branch: string | null;          // short branch name; null if detached
  isMainWorktree: boolean;         // the repo's primary working tree
  headSha: string;
  isDetached: boolean;
  isBare: boolean;
  isLocked: boolean;
  lockedReason: string | null;
  isPrunable: boolean;
  prunableReason: string | null;
  isDirty: boolean;                // uncommitted changes present
  ahead: number;                   // commits ahead of upstream (0 if no upstream)
  behind: number;                  // commits behind upstream
  upstream: string | null;         // e.g. 'origin/feature' or null
  upstreamGone: boolean;           // upstream tracked but deleted on remote -> merged hint
  lastCommitDate: string;          // ISO 8601
  lastCommitSubject: string;
  sessions: SessionLink[];         // linked Claude sessions, primary first
  pr: PrInfo | null;               // null until fetched / no PR / gh unavailable
}

export interface Commit {
  sha: string;
  shortSha: string;
  author: string;
  date: string;                    // ISO 8601
  subject: string;
}

export interface OpResult {
  success: boolean;
  message: string;                 // human-readable summary for a toast
  stderr?: string;                 // raw stderr when success === false
}

export interface GhStatus { installed: boolean; authed: boolean; }
```

`WorktreeRow.pr` is fetched lazily (§5) so the initial list is fast; the row renders with
`pr: null` and the UI fills it in per-row.

---

## 4. Git layer (`src/main/git/`)

### 4.1 `gitRunner.ts`

A thin injectable wrapper. Signature:

```ts
export interface GitRunner {
  run(args: string[], opts?: { cwd?: string }): Promise<{ code: number; stdout: string; stderr: string }>;
}
```

Implementation uses `child_process.execFile('git', args, { cwd, maxBuffer: 1024*1024*64 })`.
Never throw on non-zero exit; return `{ code, stdout, stderr }` and let callers decide.
Export a default real instance and accept an injected one in every consumer for testing.
`ghRunner.ts` mirrors this for the `gh` binary.

### 4.2 `repoScanner.ts`

`scanRepos(roots: string[]): Promise<string[]>` returns absolute repo roots.

- For each root, walk the directory tree (breadth-first). A directory is a git repo root
  if it contains a `.git` entry (directory OR file - worktrees use a `.git` file).
- When a repo root is found, **do not descend into it** (don't treat its worktrees/
  subdir as nested repos; `git worktree list` handles those).
- Skip `node_modules`, `.git`, and dot-directories during the walk.
- Limit depth to a sane bound (e.g. 5 levels) to avoid runaway scans; log if hit.

### 4.3 `worktrees.ts`

`listWorktrees(repoRoot: string): Promise<WorktreeRow[]>` per repo, then the IPC handler
aggregates across all repos.

Step 1 - enumerate. Run:
```
git -C <repoRoot> worktree list --porcelain
```
Parse the **porcelain v1** format precisely. Records are separated by a blank line. Lines
within a record:
- `worktree <absolute-path>`  (always present, first line of a record)
- `HEAD <sha>`                (full 40-char sha)
- `branch refs/heads/<name>`  (present when on a branch)
- `detached`                  (present instead of `branch` when detached)
- `bare`                      (present for a bare repo)
- `locked` or `locked <reason>`     (optional)
- `prunable` or `prunable <reason>` (optional)

Map: `branch` = strip `refs/heads/` prefix -> short name (null if `detached`).
`isMainWorktree` = the record whose path === `repoRoot` (the first record git returns is
the main working tree). `isLocked`/`lockedReason`, `isPrunable`/`prunableReason` from the
optional lines.

Step 2 - enrich each worktree (run with `-C <worktreePath>`):
- Dirty: `git status --porcelain` -> dirty if stdout non-empty.
- Upstream + ahead/behind + gone, in one call:
  `git for-each-ref --format='%(upstream:short)%09%(upstream:track)' refs/heads/<branch>`
  - `%(upstream:short)` -> `upstream` (empty -> null).
  - `%(upstream:track)` -> may contain `[ahead N]`, `[behind M]`, `[ahead N, behind M]`,
    or `[gone]`. Parse: `upstreamGone = track.includes('[gone]')`; extract ahead/behind
    via regex `ahead (\d+)` / `behind (\d+)`, default 0.
  - Skip this call when `branch` is null (detached) -> ahead/behind 0, upstream null.
- Last commit: `git log -1 --format=%cI%x1f%s` -> split on `\x1f` -> `lastCommitDate`,
  `lastCommitSubject`.
- `headSha` comes from the porcelain `HEAD` line.

Step 3 - `repo: RepoRef`: compute once per repoRoot (§4.4 for remoteUrl/ownerRepo);
`name` = basename(repoRoot).

`sessions` and `pr` are filled by later stages (§5, §6), not here.

### 4.4 `remoteUrl.ts`

`normalizeRemote(raw: string): { browseUrl: string | null; ownerRepo: string | null }`.

Input from `git -C <path> remote get-url origin` (if `origin` missing, use the first
remote from `git remote`). Handle these forms and convert to `https://<host>/<owner>/<repo>`:
- `git@github.com:owner/repo.git`        -> `https://github.com/owner/repo`
- `ssh://git@github.com/owner/repo.git`  -> `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`    -> `https://github.com/owner/repo`
- `https://github.com/owner/repo`        -> unchanged

Always strip a trailing `.git`. `ownerRepo` = `"owner/repo"` only when host is
`github.com` (used for `gh --repo`); null for non-GitHub hosts (but still return a
browseUrl so the remote link works). Return `{ null, null }` if there is no remote.

### 4.5 `baseBranch.ts`

`resolveBaseBranch(worktree, { pr, defaultBaseBranch, gitRunner }): Promise<string>`
in this priority order:
1. If `pr` exists -> `pr.baseRefName`.
2. Else the repo default branch:
   `git -C <path> symbolic-ref --short refs/remotes/origin/HEAD` -> strip leading
   `origin/` -> that name (e.g. `main`). If it errors, continue.
3. Else `defaultBaseBranch` from settings, but only if it exists as a ref
   (`git -C <path> rev-parse --verify --quiet <name>`); try `main` then `master`.

The resolved base is used as `<base>` in §4.6 (`<base>..HEAD` / `<base>...HEAD`). Prefer
the remote-tracking form when available (e.g. `origin/main`) so the diff is against the
integration target, not a stale local `main`. Specifically: if `origin/<base>` verifies,
use `origin/<base>`; else use `<base>`.

### 4.6 `diff.ts`

- `listCommits(path, base): Promise<Commit[]>`:
  `git -C <path> log <base>..HEAD --format=%H%x1f%h%x1f%an%x1f%cI%x1f%s`
  Split each line on `\x1f`. Empty output -> `[]` (worktree has no commits beyond base).
- `commitDiff(path, sha): Promise<string>` (raw unified diff text):
  `git -C <path> show <sha> --no-color --format= --patch`
- `fullDiff(path, base): Promise<string>`:
  `git -C <path> diff --no-color <base>...HEAD`   (three-dot = vs merge-base, GitHub style)

Return raw diff strings to the renderer; the renderer parses with `react-diff-view`'s
`parseDiff` and renders file-by-file (file tree, add/del counts, expand/collapse, syntax
highlight). Do not parse diffs in main.

---

## 5. GitHub / PR layer (`src/main/gh/`)

### 5.1 `ghRunner.ts`

`execFile('gh', args, ...)` wrapper, same shape as GitRunner. Plus:

- `status(): Promise<GhStatus>`:
  - `installed`: `gh --version` exits 0.
  - `authed`: `gh auth status` exits 0.
  Cache the result for the process lifetime (re-check on a manual "retry" from the UI).

### 5.2 `pr.ts`

`getPr(ownerRepo, branch): Promise<PrInfo | null>` with an in-memory TTL cache keyed by
`${ownerRepo}#${branch}`, TTL = `settings.prCacheTtlSeconds`.

- If `gh` not installed/authed, or `ownerRepo` null -> return null (UI shows the notice).
- Command:
  ```
  gh pr list --repo <ownerRepo> --head <branch> --state all
     --json number,url,state,isDraft,reviewDecision,statusCheckRollup,baseRefName,title
  ```
  Take the first element (most recent). No element -> null.
- Map `statusCheckRollup` (array of check runs) -> `checksState`:
  - empty array -> `'NONE'`
  - any check with conclusion in {FAILURE, CANCELLED, TIMED_OUT, ACTION_REQUIRED} or state
    FAILURE -> `'FAILING'`
  - any still pending/in-progress (status != COMPLETED) -> `'PENDING'`
  - otherwise -> `'PASSING'`
- `state` from gh is `OPEN|CLOSED|MERGED`; pass through. `reviewDecision` may be empty
  string -> map to null.

The UI requests PR info per visible row (lazy), so a 50-worktree list does not block on
50 `gh` calls up front.

---

## 6. Claude session layer (`src/main/sessions/`)

This implements the linkage model validated against real jsonl data. Two distinct facts:

- **Launch dir** = the `cwd` field recorded in the jsonl. In the reference setup it is the
  same for every session (the dir Claude Code was launched from, e.g. a workspace root).
  This is the directory used to **resume** a session (§9). It is NOT the worktree.
- **Which worktree a session worked on** is NOT in any single field (`cwd` is constant and
  `gitBranch` is often `"HEAD"`). It must be inferred by tallying the absolute paths the
  session referenced. Validated: a real session referenced its worktree path 610 times vs
  2 for any other - the dominant match is reliable.

### 6.1 `sessionScanner.ts`

`scanSessions(claudeProjectsDir): Promise<ParsedSession[]>`

- Enumerate every `<claudeProjectsDir>/*/**.jsonl`. (Top level is one dir per launch path;
  files inside are `<sessionId>.jsonl`.)
- **Cache by `(absolutePath, mtimeMs, size)`**: if unchanged since last scan, reuse the
  prior parse result. jsonl files can be large (hundreds-thousands of lines); never
  re-parse unchanged files.
- Parse each file line-by-line (NDJSON; one JSON object per line; tolerate malformed
  lines by skipping them). From the whole file extract:
  - `sessionId`: prefer the `sessionId` field; fallback to the filename stem.
  - `cwd`: first entry that has a `cwd` field -> `launchDir`.
  - `lastActivity`: max `timestamp` seen (ISO); fallback to file mtime.
  - `title`: first `aiTitle` field if present; else the first user-message text snippet
    (trim to ~80 chars); else null.
  - `pathHits: Map<string,number>`: count occurrences of absolute paths. Implementation:
    for each line, run `/\/[^\s"'`]+/g`, and for each configured worktree path `wt`,
    increment `pathHits[wt]` when a matched path `=== wt` or `startsWith(wt + '/')`.
    (Pass the current worktree path list into the scanner so it only tallies known
    worktrees - cheaper and avoids noise.)

`ParsedSession = { sessionId, jsonlPath, launchDir, lastActivity, title, pathHits }`.

### 6.2 `sessionLinker.ts`

`linkSessions(worktrees: WorktreeRow[], sessions: ParsedSession[]): void`

- For each worktree, collect sessions where `pathHits[worktree.path] > 0`, build a
  `SessionLink` with `matchCount = pathHits[worktree.path]`.
- Sort that worktree's links by `matchCount` desc; mark the top one `isPrimary: true`.
- Attach to `worktree.sessions`. Worktrees with no hits get `sessions: []`.
- A session may link to multiple worktrees (if it genuinely touched several); that is
  allowed - it appears under each, with its respective matchCount.
- Sessions whose only matches are to non-existent (removed) worktrees are simply dropped.

---

## 7. IPC contract (`src/shared/ipcChannels.ts` + `preload/index.ts`)

Use `ipcMain.handle(channel, handler)` in `main/ipc.ts` and `ipcRenderer.invoke(channel,
...)` in preload. Channel names are constants in `ipcChannels.ts`. The preload exposes a
single frozen object `window.api` with this exact shape (types from §3):

```ts
window.api = {
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;   // merge + persist + return full
  };
  worktrees: {
    list(): Promise<WorktreeRow[]>;                         // full scan (no PRs)
    commits(path: string, base?: string): Promise<Commit[]>;
    commitDiff(path: string, sha: string): Promise<string>;
    fullDiff(path: string, base?: string): Promise<string>;
    remove(path: string, opts: { force: boolean; deleteLocalBranch: boolean }): Promise<OpResult>;
    deleteRemoteBranch(path: string): Promise<OpResult>;
    create(input: { repoPath: string; branch: string; base: string }): Promise<OpResult>;
    sync(path: string, action: SyncAction): Promise<OpResult>;
  };
  pr: {
    get(ownerRepo: string, branch: string): Promise<PrInfo | null>;
  };
  gh: { status(): Promise<GhStatus> };
  terminals: {
    available(): Promise<TerminalKind[]>;
    resumeSession(input: { terminal: TerminalKind; launchDir: string; sessionId: string }): Promise<OpResult>;
    openDir(input: { terminal: TerminalKind; dir: string }): Promise<OpResult>;
  };
  open: {
    editor(path: string): Promise<OpResult>;   // spawn `${settings.editorCommand} <path>`
    finder(path: string): Promise<OpResult>;   // shell.openPath
    url(url: string): Promise<OpResult>;        // shell.openExternal
  };
};
```

When `commits`/`fullDiff` are called without `base`, main resolves it via §4.5.

---

## 8. Settings (`src/main/settings/settings.ts`)

- File: `path.join(app.getPath('userData'), 'settings.json')`. This is per-user and
  outside any repo (portable, never committed).
- On load: read JSON if present, deep-merge over `DEFAULT_SETTINGS`, return. On write:
  merge patch -> write pretty JSON -> return full settings.
- `DEFAULT_SETTINGS`:
  ```ts
  {
    version: 1,
    roots: [],                                   // empty -> Onboarding prompts to add one
    claudeProjectsDir: join(os.homedir(), '.claude', 'projects'),
    defaultBaseBranch: 'main',
    prCacheTtlSeconds: 60,
    editorCommand: 'code',
    defaultTerminal: 'Terminal',
    newWorktreeParentDir: null,
    theme: 'system',
  }
  ```
- `roots` empty triggers the first-run Onboarding (§10). Never auto-insert a hardcoded
  path; the onboarding may *offer* to add `~/Documents/GIT` (or the user's home) as a
  convenience the user confirms, but the default stored value is empty.

---

## 9. Terminal integration (`src/main/terminals/adapters.ts`)

macOS only. A `TerminalAdapter` per kind with: detection, `resume(launchDir, sessionId)`,
`openDir(dir)`. Detection: check the app bundle exists.

- Terminal.app: always present.
- iTerm2: `/Applications/iTerm.app` exists (app name is `iTerm`).
- Warp: `/Applications/Warp.app` exists.

`available()` returns the detected kinds. `defaultTerminal` from settings is the primary.

**Command to run on resume** = `cd <quoted launchDir> && claude --resume <sessionId>`.
Note: we `cd` to the **launchDir** (the session's `cwd`, = CLAUDE_PROJECT_DIR), NEVER to
the worktree. Quote the dir with single quotes and escape embedded single quotes.

Implementation per kind (via `execFile('osascript', ['-e', script, ...])`, building the
script string with the command already safely quoted):

- **Terminal.app** - open a new window running the command:
  ```applescript
  tell application "Terminal"
    activate
    do script "<CMD>"
  end tell
  ```
  (`do script` opens a new window/tab and runs `<CMD>`. A new-tab variant via System
  Events keystroke "t" is optional polish; the window form is the reliable default.)

- **iTerm2** - new window, write the command:
  ```applescript
  tell application "iTerm"
    activate
    set w to (create window with default profile)
    tell current session of w to write text "<CMD>"
  end tell
  ```
  (Tab variant: `tell current window to create tab with default profile` when a window
  already exists - optional polish.)

- **Warp** - Warp has **no supported scripting hook to run a command in a new tab**. Do
  NOT fake it. Behavior: `execFile('open', ['-a', 'Warp', launchDir])` to open Warp at the
  dir, AND copy the `claude --resume <sessionId>` command to the clipboard
  (`clipboard.writeText`). Return an `OpResult` whose `message` tells the user the command
  was copied and to paste it. This limitation must be visible in the UI tooltip for Warp.

`openDir(dir)` is the same but the command is just `cd <quoted dir>` (or for Warp,
`open -a <App> <dir>` with no command). `<CMD>` here must `cd` to the **given dir** (used
by the "Open in terminal" worktree action, where dir IS the worktree path - that action
legitimately opens the worktree; only Resume uses launchDir).

`escapeForAppleScript(s)`: escape `\` and `"` for the AppleScript string literal; the
inner shell `cd` path is wrapped in single quotes with `'` -> `'\''`.

---

## 10. Operations & safety (`src/main/git/operations.ts` + UI)

All operations return `OpResult`. Destructive ones require a renderer-side `ConfirmDialog`
that names the exact branch and path before the IPC call.

- **remove(path, { force, deleteLocalBranch })**:
  1. `git -C <repoRoot> worktree remove <path>` (add `--force` only when `force` true,
     used when the worktree is dirty and the user confirmed).
  2. If `deleteLocalBranch` and a branch exists: `git -C <repoRoot> branch -D <branch>`.
  Never use `rm`. `repoRoot` is the worktree's repo (the main working tree path).
- **deleteRemoteBranch(path)**: `git -C <path> push origin --delete <branch>`. Requires a
  branch and a remote; otherwise return a failed OpResult with a clear message.
- **create({ repoPath, branch, base })**:
  - Target dir = `settings.newWorktreeParentDir ?? join(repoPath, 'worktrees')` + `/<branch-leaf>`.
  - `git -C <repoPath> fetch origin` then
    `git -C <repoPath> worktree add -b <branch> <targetDir> <base>`
    where `<base>` defaults to `origin/<defaultBaseBranch>` (form the new branch off the
    remote base). Validate `branch` against the allowed charset (§0.5).
- **sync(path, action)**:
  - `fetch`     -> `git -C <path> fetch --all --prune`
  - `pull`      -> `git -C <path> pull`
  - `mergeBase` -> resolve base (§4.5), `git -C <path> merge <base>` (no rebase; the user's
    workflow forbids rebase). On conflict, return failure with stderr; do not auto-abort.
  - `prune`     -> `git -C <path> worktree prune` (run at repo level; safe).

**Merged / safe-to-delete hint (UI):** a worktree is "safe to delete" when
`upstreamGone === true` OR `pr?.state === 'MERGED'`. Show a green hint; otherwise the
remove confirm dialog shows a warning (and dirty worktrees additionally warn + require the
`force` checkbox).

---

## 11. Renderer UI

- **Main view:** a single **flat table** of all worktrees (not grouped), default-sorted by
  `repo.name` then `path`. Columns: Repo, Branch, State (dirty/clean + ahead/behind +
  locked/prunable badges), Last commit (relative + absolute on hover), Sessions (count +
  primary session title), PR (PrBadge: state + checks + review), Actions.
  - **Sortable** by any column (click header).
  - **FilterBar:** filter chips by repo and by state (dirty, merged/safe, has-PR, locked).
  - **SearchBar:** live text filter; matches substring across repo name, branch, path, and
    PR title as the user types. Combine with active filters (AND).
- **WorktreeDetail** (route or right pane): header (repo/branch/path/PR link), action
  buttons (OperationsMenu + TerminalSplitButton), CommitList, DiffViewer.
- **CommitList:** from `worktrees.commits`. Clicking a commit loads `commitDiff` into the
  DiffViewer. A "Full diff vs <base>" toggle loads `fullDiff`.
- **DiffViewer:** `react-diff-view` - per-file collapsible sections, add/del counts,
  syntax highlight, unified or split view (unified default).
- **TerminalSplitButton:** primary button = `settings.defaultTerminal`; flyout lists every
  kind from `terminals.available()`. Resume action uses the primary linked session's
  `sessionId` + `launchDir`. Warp shows the clipboard-limitation tooltip.
- **GhMissingNotice:** when `gh.status()` reports not installed/authed, show an inline
  banner in the PR column area with copy-paste commands `brew install gh` and
  `gh auth login`, and a link to `https://cli.github.com`. Remote links still work.
- **SettingsPage:** edit every field in `Settings` (roots add/remove via folder picker
  using a main-side `dialog.showOpenDirectory`; editor command; default terminal; default
  base branch; PR cache TTL; theme). Save -> `settings.update` -> triggers a refresh.
- **Onboarding:** shown when `roots` is empty - prompt to add a root folder (folder
  picker), optionally offering the user's home or `~/Documents/GIT` as a one-click suggestion.

**Refresh model (no live watching):** a manual Refresh button + refresh on window focus
(`window.addEventListener('focus', ...)` debounced ~1s). `useWorktrees` calls
`worktrees.list()`, then lazily requests `pr.get` per row.

**Theming (`renderer/theme/`):** `ThemeProvider` reads `settings.theme`. For `'system'`,
follow `nativeTheme.shouldUseDarkColors` (exposed via IPC or `matchMedia('(prefers-color-scheme: dark)')`).
Apply `data-theme="light|dark"` on `<html>`; all colors via CSS variables in `tokens.css`
(`:root` light + `[data-theme="dark"]` overrides). No hardcoded hex in components.

---

## 12. Testing (vitest, unit only)

Pure-function tests, runner dependencies injected/mocked. No Electron, no real git/gh, no
Playwright. Required suites:

- `worktrees.parsePorcelain` - multi-record porcelain incl. detached, bare, locked,
  prunable, main vs linked.
- `worktrees.parseUpstreamTrack` - `[ahead 2]`, `[behind 3]`, `[ahead 1, behind 4]`,
  `[gone]`, empty.
- `remoteUrl.normalizeRemote` - all 4 URL forms + non-GitHub host + no remote.
- `baseBranch.resolveBaseBranch` - PR present, origin/HEAD path, default fallback,
  main-vs-master.
- `diff.listCommits` - field splitting incl. subjects containing spaces; empty output.
- `sessionScanner` - cwd extraction, title fallback, pathHits tally, malformed-line skip,
  mtime cache hit (no re-parse).
- `sessionLinker` - primary selection by matchCount, multi-worktree session, zero hits.
- `pr.mapChecksState` - NONE/PASSING/FAILING/PENDING from sample statusCheckRollup arrays.
- `settings` - default merge, partial patch, version present.
- `security.validate` - path inside/outside roots; branch-name accept/reject.

Aim for high coverage of the parsing/mapping logic; the thin runner wrappers and React
components are out of scope for v1 tests.

---

## 13. Non-goals (v1)

- No live filesystem/jsonl watching (manual + focus refresh only).
- No Windows/Linux support (mac AppleScript terminals); keep `terminals/` isolated.
- No git operations beyond those in §10 (no rebase ever; no cherry-pick; no stash UI).
- No GitHub auth management beyond detecting `gh` and surfacing install/login commands.
- No multi-account / enterprise GitHub host config beyond what the remote URL yields.
- No exporting/sharing of diffs to standalone HTML (in-app viewer only).

---

## 14. Build & run

- `pnpm install`
- `pnpm dev`      - electron-vite dev (HMR renderer + main reload)
- `pnpm typecheck`- `tsc -p tsconfig.node.json --noEmit && tsc -p tsconfig.web.json --noEmit`
- `pnpm test`     - vitest run
- `pnpm lint`     - eslint + prettier check
- `pnpm package`  - `electron-vite build && electron-builder --mac --publish never` -> `.dmg`

App name: **Claude Grove** (repo: `claude-grove`). `electron-builder.yml`
`appId: com.<yourname>.claude-grove`, productName `Claude Grove`, mac target dmg,
category `public.app-category.developer-tools`.
