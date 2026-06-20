# Claude Grove Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build Claude Grove, a macOS Electron desktop app to view and manage local git worktrees across repos, with PR status, Claude Code session linkage, an in-app GitHub-style diff viewer, and worktree lifecycle operations.

**Architecture:** Electron three-layer (main / preload / renderer) mirroring the `claude-village` template. All git/`gh`/fs work runs in the main process behind a typed IPC bridge; the renderer is a React UI. Pure logic (parsers, mappers, linkers) is extracted into runner-injected modules and unit-tested with vitest; the thin runner wrappers, Electron wiring, and React components are verified by running the app.

**Tech Stack:** electron ^33, electron-vite ^2.3, vite ^5.4, react ^18.3, typescript ^5.6, vitest ^2.1, react-diff-view 3.x, electron-log. Package manager: pnpm. macOS only (AppleScript terminal integration).

**Spec:** This plan implements `DESIGN.md` in the repo root. Section references like `(spec §4.3)` point there. The `src/shared/types.ts` type contract in spec §3 is authoritative — copy it verbatim in Task 1; later tasks assume those exact names.

**Conventions for every task:**
- Commits are made normally; the repo's local `prepare-commit-msg` hook auto-appends the personal co-author trailer. Append `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` to messages you author.
- Never interpolate values into shell strings for git/gh — always `execFile(cmd, argsArray)` (spec §0.1).
- Run `pnpm typecheck` before each commit in TypeScript tasks; it must pass.

---

## File Structure

See spec §2 for the full tree. Decomposition recap (one responsibility per file):

- `src/shared/types.ts` — the cross-process data contract (spec §3).
- `src/shared/ipcChannels.ts` — channel-name constants.
- `src/main/git/*` — one file per concern: `gitRunner`, `repoScanner`, `worktrees`, `diff`, `operations`, `remoteUrl`, `baseBranch`.
- `src/main/gh/*` — `ghRunner`, `pr`.
- `src/main/sessions/*` — `sessionScanner`, `sessionLinker`.
- `src/main/settings/settings.ts`, `src/main/security/validate.ts`.
- `src/main/terminals/adapters.ts`.
- `src/main/index.ts` (lifecycle/window), `src/main/ipc.ts` (handlers).
- `src/preload/index.ts` (contextBridge).
- `src/renderer/**` — React UI, one component per file (spec §2, §11).

Test files live beside source as `<name>.test.ts` under `src/`, picked up by vitest.

---

## Phase 0 — Scaffold

### Task 1: Project scaffold from claude-village template

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `electron-builder.yml`, `tsconfig.base.json`, `tsconfig.node.json`, `tsconfig.web.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `.npmrc`
- Create: `src/main/index.ts`, `src/main/logger.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`

- [x] **Step 1: Copy config files from the template**

```bash
cd ~/Documents/GIT/claude-grove
T=~/Documents/GIT/claude-village
cp "$T"/electron.vite.config.ts "$T"/tsconfig.base.json "$T"/tsconfig.node.json \
   "$T"/tsconfig.web.json "$T"/vitest.config.ts "$T"/eslint.config.js \
   "$T"/.prettierrc "$T"/.npmrc .
cp "$T"/src/main/logger.ts src/main/logger.ts
```

- [x] **Step 2: Write `package.json`**

```jsonc
{
  "name": "claude-grove",
  "version": "0.3.0",
  "description": "A macOS desktop app to view and manage all your local git worktrees - PR status, Claude Code sessions, and GitHub-style diffs in one place.",
  "author": { "name": "Haim Adrian", "email": "haimadrian@gmail.com" },
  "repository": { "type": "git", "url": "https://github.com/haimadrian/claude-grove.git" },
  "license": "MIT",
  "private": true,
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder --mac --publish never",
    "typecheck": "tsc -p tsconfig.node.json --noEmit && tsc -p tsconfig.web.json --noEmit",
    "lint": "eslint src && prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "lint:fix": "eslint src --fix && prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "pnpm": { "onlyBuiltDependencies": ["electron", "esbuild"] },
  "dependencies": {
    "electron-log": "^5.4.3",
    "react-diff-view": "^3.2.0",
    "gitdiff-parser": "^0.3.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/node": "^22.7.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "@vitejs/plugin-react": "^4.7.0",
    "@vitest/coverage-v8": "^2.1.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "eslint": "^9.39.4",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "prettier": "^3.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.6.0",
    "vite": "^5.4.21",
    "vitest": "^2.1.0"
  }
}
```

- [x] **Step 3: Write `electron-builder.yml`**

```yaml
appId: com.haimadrian.claude-grove
productName: Claude Grove
directories:
  output: release
files:
  - out/**/*
mac:
  category: public.app-category.developer-tools
  target: dmg
```

- [x] **Step 4: Minimal main/preload/renderer so the app boots**

`src/main/index.ts`:
```ts
import { app, BrowserWindow, nativeTheme } from 'electron';
import { join } from 'node:path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.on('ready-to-show', () => win.show());
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
export { nativeTheme };
```

`src/preload/index.ts` (filled in Task 14):
```ts
import { contextBridge } from 'electron';
contextBridge.exposeInMainWorld('api', {});
```

`src/renderer/index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /><title>Claude Grove</title></head>
  <body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

`src/renderer/main.tsx`:
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

`src/renderer/App.tsx`:
```tsx
import React from 'react';
export function App(): React.JSX.Element {
  return <div>Claude Grove</div>;
}
```

- [x] **Step 5: Install and verify boot**

Run: `pnpm install && pnpm typecheck`
Expected: install succeeds, typecheck passes (0 errors).
Run: `pnpm dev` (manual) — expected: a window titled Claude Grove shows "Claude Grove". Close it.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold electron-vite app from template

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared types and IPC channel constants

**Files:**
- Create: `src/shared/types.ts`, `src/shared/ipcChannels.ts`

- [x] **Step 1: Copy the type contract verbatim from spec §3**

Copy every interface/type from `DESIGN.md` §3 into `src/shared/types.ts` exactly:
`Theme, TerminalKind, SyncAction, Settings, RepoRef, SessionLink, PrInfo, WorktreeRow, Commit, OpResult, GhStatus`.

- [x] **Step 2: Write `src/shared/ipcChannels.ts`**

```ts
export const CH = {
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  worktreesList: 'worktrees:list',
  worktreesCommits: 'worktrees:commits',
  worktreesCommitDiff: 'worktrees:commitDiff',
  worktreesFullDiff: 'worktrees:fullDiff',
  worktreesRemove: 'worktrees:remove',
  worktreesDeleteRemote: 'worktrees:deleteRemoteBranch',
  worktreesCreate: 'worktrees:create',
  worktreesSync: 'worktrees:sync',
  prGet: 'pr:get',
  ghStatus: 'gh:status',
  terminalsAvailable: 'terminals:available',
  terminalsResume: 'terminals:resumeSession',
  terminalsOpenDir: 'terminals:openDir',
  openEditor: 'open:editor',
  openFinder: 'open:finder',
  openUrl: 'open:url',
  pickDirectory: 'dialog:pickDirectory',
} as const;
```

- [x] **Step 3: Verify + commit**

Run: `pnpm typecheck` — Expected: PASS.
```bash
git add src/shared
git commit -m "feat: add shared type contract and ipc channel constants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Pure logic (TDD)

All Phase 1 modules are runner-agnostic pure functions (or take a `GitRunner`/`GhRunner` interface) so they are unit-testable without spawning processes. Write the test first, watch it fail, implement, watch it pass, commit.

### Task 3: Remote URL normalization

**Files:**
- Create: `src/main/git/remoteUrl.ts`, `src/main/git/remoteUrl.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeRemote } from './remoteUrl';

describe('normalizeRemote', () => {
  it('converts ssh scp-style github to https and ownerRepo', () => {
    expect(normalizeRemote('git@github.com:owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('converts ssh:// form', () => {
    expect(normalizeRemote('ssh://git@github.com/owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('strips .git from https form', () => {
    expect(normalizeRemote('https://github.com/owner/repo.git')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('passes through clean https form', () => {
    expect(normalizeRemote('https://github.com/owner/repo')).toEqual({
      browseUrl: 'https://github.com/owner/repo', ownerRepo: 'owner/repo',
    });
  });
  it('non-github host yields browseUrl but null ownerRepo', () => {
    expect(normalizeRemote('git@gitlab.com:grp/proj.git')).toEqual({
      browseUrl: 'https://gitlab.com/grp/proj', ownerRepo: null,
    });
  });
  it('empty input yields nulls', () => {
    expect(normalizeRemote('')).toEqual({ browseUrl: null, ownerRepo: null });
  });
});
```

- [x] **Step 2: Run, expect fail**

Run: `pnpm vitest run src/main/git/remoteUrl.test.ts`
Expected: FAIL (`normalizeRemote` not exported).

- [x] **Step 3: Implement**

```ts
export interface NormalizedRemote { browseUrl: string | null; ownerRepo: string | null; }

export function normalizeRemote(raw: string): NormalizedRemote {
  const s = (raw || '').trim();
  if (!s) return { browseUrl: null, ownerRepo: null };

  let host = '', path = '';
  const scp = s.match(/^[^@]+@([^:]+):(.+)$/);          // git@host:owner/repo.git
  const url = s.match(/^[a-z]+:\/\/(?:[^@/]+@)?([^/]+)\/(.+)$/i); // scheme://[user@]host/owner/repo(.git)
  if (scp) { host = scp[1]; path = scp[2]; }
  else if (url) { host = url[1]; path = url[2]; }
  else return { browseUrl: null, ownerRepo: null };

  path = path.replace(/\.git$/, '').replace(/^\/+/, '');
  const browseUrl = `https://${host}/${path}`;
  const ownerRepo = host === 'github.com' ? path : null;
  return { browseUrl, ownerRepo };
}
```

- [x] **Step 4: Run, expect pass**

Run: `pnpm vitest run src/main/git/remoteUrl.test.ts` — Expected: PASS (6 tests).

- [x] **Step 5: Commit**

```bash
git add src/main/git/remoteUrl.ts src/main/git/remoteUrl.test.ts
git commit -m "feat: normalize git remote urls to https browse url + ownerRepo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Worktree porcelain parser

**Files:**
- Create: `src/main/git/parseWorktrees.ts`, `src/main/git/parseWorktrees.test.ts`

This is the pure parser for `git worktree list --porcelain` (spec §4.3 step 1). `worktrees.ts` (Task 11) will call git and feed the raw stdout here.

- [x] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseWorktreePorcelain } from './parseWorktrees';

const SAMPLE = [
  'worktree /repo',
  'HEAD 1111111111111111111111111111111111111111',
  'branch refs/heads/main',
  '',
  'worktree /repo/worktrees/feat',
  'HEAD 2222222222222222222222222222222222222222',
  'branch refs/heads/feature',
  'locked needs review',
  'prunable gitdir missing',
  '',
  'worktree /repo/worktrees/detached',
  'HEAD 3333333333333333333333333333333333333333',
  'detached',
  '',
].join('\n');

describe('parseWorktreePorcelain', () => {
  const r = parseWorktreePorcelain(SAMPLE, '/repo');
  it('parses three records', () => expect(r).toHaveLength(3));
  it('marks the main worktree', () => {
    expect(r[0]).toMatchObject({ path: '/repo', branch: 'main', isMainWorktree: true, isDetached: false });
  });
  it('parses branch, locked, prunable on linked worktree', () => {
    expect(r[1]).toMatchObject({
      path: '/repo/worktrees/feat', branch: 'feature', isMainWorktree: false,
      isLocked: true, lockedReason: 'needs review', isPrunable: true, prunableReason: 'gitdir missing',
    });
  });
  it('handles detached head', () => {
    expect(r[2]).toMatchObject({ branch: null, isDetached: true, headSha: '3333333333333333333333333333333333333333' });
  });
});
```

- [x] **Step 2: Run, expect fail.** `pnpm vitest run src/main/git/parseWorktrees.test.ts` → FAIL.

- [x] **Step 3: Implement**

```ts
export interface ParsedWorktree {
  path: string; headSha: string; branch: string | null;
  isMainWorktree: boolean; isDetached: boolean; isBare: boolean;
  isLocked: boolean; lockedReason: string | null;
  isPrunable: boolean; prunableReason: string | null;
}

export function parseWorktreePorcelain(stdout: string, repoRoot: string): ParsedWorktree[] {
  const records: ParsedWorktree[] = [];
  let cur: Partial<ParsedWorktree> | null = null;
  const push = (): void => {
    if (!cur || !cur.path) return;
    records.push({
      path: cur.path, headSha: cur.headSha ?? '', branch: cur.branch ?? null,
      isMainWorktree: cur.path === repoRoot, isDetached: cur.isDetached ?? false,
      isBare: cur.isBare ?? false, isLocked: cur.isLocked ?? false,
      lockedReason: cur.lockedReason ?? null, isPrunable: cur.isPrunable ?? false,
      prunableReason: cur.prunableReason ?? null,
    });
  };
  for (const line of stdout.split('\n')) {
    if (line === '') { push(); cur = null; continue; }
    if (line.startsWith('worktree ')) { cur = { path: line.slice(9) }; continue; }
    if (!cur) continue;
    if (line.startsWith('HEAD ')) cur.headSha = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (line === 'detached') cur.isDetached = true;
    else if (line === 'bare') cur.isBare = true;
    else if (line === 'locked' || line.startsWith('locked ')) {
      cur.isLocked = true; cur.lockedReason = line.length > 6 ? line.slice(7) : null;
    } else if (line === 'prunable' || line.startsWith('prunable ')) {
      cur.isPrunable = true; cur.prunableReason = line.length > 8 ? line.slice(9) : null;
    }
  }
  push();
  return records;
}
```

- [x] **Step 4: Run, expect pass** (4 tests).
- [x] **Step 5: Commit** `feat: parse git worktree list --porcelain output`

---

### Task 5: Upstream-track parser (ahead/behind/gone)

**Files:** Create `src/main/git/parseUpstream.ts`, `src/main/git/parseUpstream.test.ts`

Parses the `%(upstream:short)\t%(upstream:track)` line from spec §4.3 step 2.

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseUpstream } from './parseUpstream';

describe('parseUpstream', () => {
  it('parses ahead only', () =>
    expect(parseUpstream('origin/feat\t[ahead 2]')).toEqual({ upstream: 'origin/feat', ahead: 2, behind: 0, upstreamGone: false }));
  it('parses behind only', () =>
    expect(parseUpstream('origin/feat\t[behind 3]')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 3, upstreamGone: false }));
  it('parses ahead and behind', () =>
    expect(parseUpstream('origin/feat\t[ahead 1, behind 4]')).toEqual({ upstream: 'origin/feat', ahead: 1, behind: 4, upstreamGone: false }));
  it('parses gone', () =>
    expect(parseUpstream('origin/feat\t[gone]')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 0, upstreamGone: true }));
  it('no upstream -> nulls', () =>
    expect(parseUpstream('\t')).toEqual({ upstream: null, ahead: 0, behind: 0, upstreamGone: false }));
  it('in sync (empty track)', () =>
    expect(parseUpstream('origin/feat\t')).toEqual({ upstream: 'origin/feat', ahead: 0, behind: 0, upstreamGone: false }));
});
```

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

```ts
export interface UpstreamInfo { upstream: string | null; ahead: number; behind: number; upstreamGone: boolean; }

export function parseUpstream(line: string): UpstreamInfo {
  const [shortRaw = '', trackRaw = ''] = line.split('\t');
  const upstream = shortRaw.trim() || null;
  const track = trackRaw.trim();
  const ahead = Number(track.match(/ahead (\d+)/)?.[1] ?? 0);
  const behind = Number(track.match(/behind (\d+)/)?.[1] ?? 0);
  return { upstream, ahead, behind, upstreamGone: track.includes('[gone]') };
}
```

- [x] **Step 4: Run, expect pass** (6 tests).
- [x] **Step 5: Commit** `feat: parse upstream tracking (ahead/behind/gone)`

---

### Task 6: Commit-log parser

**Files:** Create `src/main/git/parseCommits.ts`, `src/main/git/parseCommits.test.ts`

Parses output of `git log <base>..HEAD --format=%H%x1f%h%x1f%an%x1f%cI%x1f%s` (spec §4.6).

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseCommits } from './parseCommits';
const US = '\x1f';

describe('parseCommits', () => {
  it('parses rows with subjects containing spaces', () => {
    const out = [
      ['aaa', 'aaa1', 'Jane Doe', '2026-06-16T10:00:00+03:00', 'fix: handle empty diff'].join(US),
      ['bbb', 'bbb1', 'Jane Doe', '2026-06-15T09:00:00+03:00', 'feat: add table, sort & filter'].join(US),
    ].join('\n');
    expect(parseCommits(out)).toEqual([
      { sha: 'aaa', shortSha: 'aaa1', author: 'Jane Doe', date: '2026-06-16T10:00:00+03:00', subject: 'fix: handle empty diff' },
      { sha: 'bbb', shortSha: 'bbb1', author: 'Jane Doe', date: '2026-06-15T09:00:00+03:00', subject: 'feat: add table, sort & filter' },
    ]);
  });
  it('empty output -> empty array', () => expect(parseCommits('')).toEqual([]));
});
```

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

```ts
import type { Commit } from '../../shared/types';
const US = '\x1f';

export function parseCommits(stdout: string): Commit[] {
  return stdout.split('\n').filter((l) => l.length > 0).map((line) => {
    const [sha, shortSha, author, date, ...rest] = line.split(US);
    return { sha, shortSha, author, date, subject: rest.join(US) };
  });
}
```

- [x] **Step 4: Run, expect pass** (2 tests).
- [x] **Step 5: Commit** `feat: parse git log commit rows`

---

### Task 7: PR checks-state mapper

**Files:** Create `src/main/gh/mapChecks.ts`, `src/main/gh/mapChecks.test.ts`

Implements the `statusCheckRollup -> checksState` rule from spec §5.2.

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { mapChecksState } from './mapChecks';

describe('mapChecksState', () => {
  it('empty -> NONE', () => expect(mapChecksState([])).toBe('NONE'));
  it('a failing conclusion -> FAILING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { status: 'COMPLETED', conclusion: 'FAILURE' }])).toBe('FAILING'));
  it('an in-progress check -> PENDING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { status: 'IN_PROGRESS', conclusion: null }])).toBe('PENDING'));
  it('all success -> PASSING', () =>
    expect(mapChecksState([{ status: 'COMPLETED', conclusion: 'SUCCESS' }])).toBe('PASSING'));
  it('state FAILURE counts as failing', () =>
    expect(mapChecksState([{ state: 'FAILURE' }])).toBe('FAILING'));
});
```

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

```ts
import type { PrInfo } from '../../shared/types';

interface RollupItem { status?: string | null; conclusion?: string | null; state?: string | null; }
const FAIL = new Set(['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED']);

export function mapChecksState(rollup: RollupItem[]): PrInfo['checksState'] {
  if (!rollup || rollup.length === 0) return 'NONE';
  const isFail = (c: RollupItem): boolean =>
    (c.conclusion != null && FAIL.has(c.conclusion)) || c.state === 'FAILURE';
  const isPending = (c: RollupItem): boolean =>
    (c.status != null && c.status !== 'COMPLETED') ||
    (c.state != null && !['SUCCESS', 'FAILURE', 'ERROR'].includes(c.state));
  if (rollup.some(isFail)) return 'FAILING';
  if (rollup.some(isPending)) return 'PENDING';
  return 'PASSING';
}
```

- [x] **Step 4: Run, expect pass** (5 tests).
- [x] **Step 5: Commit** `feat: map gh statusCheckRollup to checks state`

---

### Task 8: Settings load/merge

**Files:** Create `src/main/settings/defaults.ts`, `src/main/settings/mergeSettings.ts`, `src/main/settings/mergeSettings.test.ts`

Pure merge logic is separated from disk IO (the IO wrapper is Task 13).

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './defaults';
import { mergeSettings } from './mergeSettings';

describe('mergeSettings', () => {
  it('returns defaults for empty input', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, {});
    expect(s.theme).toBe('system');
    expect(s.roots).toEqual([]);
    expect(s.version).toBe(1);
    expect(s.prCacheTtlSeconds).toBe(60);
  });
  it('applies a partial patch', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, { theme: 'dark', roots: ['/x'] });
    expect(s.theme).toBe('dark');
    expect(s.roots).toEqual(['/x']);
    expect(s.editorCommand).toBe('code'); // untouched default
  });
});
```

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

`src/main/settings/defaults.ts`:
```ts
import os from 'node:os';
import { join } from 'node:path';
import type { Settings } from '../../shared/types';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  roots: [],
  claudeProjectsDir: join(os.homedir(), '.claude', 'projects'),
  defaultBaseBranch: 'main',
  prCacheTtlSeconds: 60,
  editorCommand: 'code',
  defaultTerminal: 'Terminal',
  newWorktreeParentDir: null,
  theme: 'system',
};
```

`src/main/settings/mergeSettings.ts`:
```ts
import type { Settings } from '../../shared/types';

export function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch, version: 1 };
}
```

- [x] **Step 4: Run, expect pass** (2 tests).
- [x] **Step 5: Commit** `feat: settings defaults and merge`

---

### Task 9: Path/branch security validation

**Files:** Create `src/main/security/validate.ts`, `src/main/security/validate.test.ts`

Implements spec §0.5 / §5-renderer guard: a path must be inside a configured root; branch names restricted.

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { isPathWithinRoots, isValidBranchName } from './validate';

describe('isPathWithinRoots', () => {
  const roots = ['/Users/me/git'];
  it('accepts a path inside a root', () => expect(isPathWithinRoots('/Users/me/git/repo/wt', roots)).toBe(true));
  it('accepts the root itself', () => expect(isPathWithinRoots('/Users/me/git', roots)).toBe(true));
  it('rejects a path outside roots', () => expect(isPathWithinRoots('/etc/passwd', roots)).toBe(false));
  it('rejects a sibling-prefix trick', () => expect(isPathWithinRoots('/Users/me/git-evil', roots)).toBe(false));
});

describe('isValidBranchName', () => {
  it('accepts normal names', () => expect(isValidBranchName('t2a/2026-06/feat_1.2')).toBe(true));
  it('rejects shell metachars', () => expect(isValidBranchName('feat; rm -rf /')).toBe(false));
  it('rejects empty', () => expect(isValidBranchName('')).toBe(false));
});
```

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

```ts
import { resolve, sep } from 'node:path';

export function isPathWithinRoots(target: string, roots: string[]): boolean {
  const t = resolve(target);
  return roots.some((r) => {
    const root = resolve(r);
    return t === root || t.startsWith(root + sep);
  });
}

export function isValidBranchName(name: string): boolean {
  return /^[A-Za-z0-9._\-/]+$/.test(name);
}
```

- [x] **Step 4: Run, expect pass** (7 tests).
- [x] **Step 5: Commit** `feat: path-within-roots and branch-name validation`

---

### Task 10: Session jsonl parser + worktree linker

**Files:** Create `src/main/sessions/parseSession.ts`, `src/main/sessions/sessionLinker.ts`, `src/main/sessions/sessions.test.ts`

Implements the validated linkage model (spec §6): `cwd` = launch dir; worktree inferred by path-reference tally.

- [x] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseSessionContent } from './parseSession';
import { linkSessions } from './sessionLinker';
import type { WorktreeRow } from '../../shared/types';

const WT = '/Users/me/git/MainApp/worktrees/feat';
const OTHER = '/Users/me/git/MainApp/worktrees/other';

const jsonl = [
  JSON.stringify({ type: 'mode', sessionId: 'sess-1' }),
  JSON.stringify({ cwd: '/Users/me/git/MainApp', timestamp: '2026-06-16T08:00:00Z', aiTitle: 'Fix feat' }),
  JSON.stringify({ message: { content: `edited ${WT}/a.ts and ${WT}/b.ts` }, timestamp: '2026-06-16T09:00:00Z' }),
  JSON.stringify({ toolUseResult: { stdout: `ran in ${WT}` }, timestamp: '2026-06-16T09:30:00Z' }),
  'this is a malformed line {',
  JSON.stringify({ message: { content: `also touched ${OTHER}/c.ts` }, timestamp: '2026-06-16T09:40:00Z' }),
].join('\n');

describe('parseSessionContent', () => {
  const p = parseSessionContent(jsonl, 'sess-1', [WT, OTHER]);
  it('extracts launchDir from cwd', () => expect(p.launchDir).toBe('/Users/me/git/MainApp'));
  it('uses aiTitle as title', () => expect(p.title).toBe('Fix feat'));
  it('takes max timestamp as lastActivity', () => expect(p.lastActivity).toBe('2026-06-16T09:40:00Z'));
  it('skips malformed lines and tallies path hits', () => {
    expect(p.pathHits[WT]).toBe(3);   // a.ts + b.ts on one line counts the line refs; see impl note
    expect(p.pathHits[OTHER]).toBe(1);
  });
});

describe('linkSessions', () => {
  it('attaches sessions to the dominant worktree as primary', () => {
    const wts = [{ path: WT } as WorktreeRow, { path: OTHER } as WorktreeRow];
    const sessions = [parseSessionContent(jsonl, 'sess-1', [WT, OTHER])];
    linkSessions(wts, sessions);
    expect(wts[0].sessions[0]).toMatchObject({ sessionId: 'sess-1', isPrimary: true });
    expect(wts[0].sessions[0].matchCount).toBeGreaterThan(wts[1].sessions[0].matchCount);
  });
});
```

> Impl note for the hit count: count **each occurrence** of a worktree path across the file (not lines). The line `edited ${WT}/a.ts and ${WT}/b.ts` contains 2 occurrences, plus 1 in the toolUseResult line = 3.

- [x] **Step 2: Run, expect fail.**

- [x] **Step 3: Implement**

`src/main/sessions/parseSession.ts`:
```ts
export interface ParsedSession {
  sessionId: string;
  launchDir: string | null;
  lastActivity: string | null;
  title: string | null;
  pathHits: Record<string, number>;
}

const PATH_RE = /\/[^\s"'`]+/g;

export function parseSessionContent(content: string, sessionIdFallback: string, worktreePaths: string[]): ParsedSession {
  let sessionId = sessionIdFallback, launchDir: string | null = null;
  let lastActivity: string | null = null, title: string | null = null;
  const pathHits: Record<string, number> = {};
  for (const p of worktreePaths) pathHits[p] = 0;

  for (const line of content.split('\n')) {
    if (!line) continue;
    // tally raw occurrences regardless of JSON validity
    const matches = line.match(PATH_RE);
    if (matches) {
      for (const m of matches) {
        for (const wt of worktreePaths) {
          if (m === wt || m.startsWith(wt + '/')) pathHits[wt] += 1;
        }
      }
    }
    let obj: Record<string, unknown>;
    try { obj = JSON.parse(line); } catch { continue; }
    if (typeof obj.sessionId === 'string') sessionId = obj.sessionId;
    if (typeof obj.cwd === 'string' && !launchDir) launchDir = obj.cwd;
    if (typeof obj.timestamp === 'string' && (!lastActivity || obj.timestamp > lastActivity)) lastActivity = obj.timestamp;
    if (!title && typeof obj.aiTitle === 'string') title = obj.aiTitle;
  }
  return { sessionId, launchDir, lastActivity, title, pathHits };
}
```

`src/main/sessions/sessionLinker.ts`:
```ts
import type { WorktreeRow, SessionLink } from '../../shared/types';
import type { ParsedSession } from './parseSession';

export function linkSessions(worktrees: WorktreeRow[], sessions: (ParsedSession & { jsonlPath?: string })[]): void {
  for (const wt of worktrees) {
    const links: SessionLink[] = sessions
      .filter((s) => (s.pathHits[wt.path] ?? 0) > 0)
      .map((s) => ({
        sessionId: s.sessionId,
        jsonlPath: s.jsonlPath ?? '',
        launchDir: s.launchDir ?? '',
        lastActivity: s.lastActivity ?? '',
        title: s.title,
        matchCount: s.pathHits[wt.path],
        isPrimary: false,
      }))
      .sort((a, b) => b.matchCount - a.matchCount);
    if (links.length > 0) links[0].isPrimary = true;
    wt.sessions = links;
  }
}
```

- [x] **Step 4: Run, expect pass.**
- [x] **Step 5: Commit** `feat: parse claude session jsonl and link to worktrees by path tally`

---

## Phase 2 — Git/gh services (runner wiring)

These wrap real processes around the Phase 1 parsers. Verified by `pnpm typecheck` + a manual smoke run against this repo; no unit tests (thin IO per spec §12).

### Task 11: GitRunner, GhRunner, repoScanner, worktrees enrichment

**Files:** Create `src/main/git/gitRunner.ts`, `src/main/gh/ghRunner.ts`, `src/main/git/repoScanner.ts`, `src/main/git/worktrees.ts`

- [x] **Step 1: `gitRunner.ts` and `ghRunner.ts`**

```ts
// gitRunner.ts
import { execFile } from 'node:child_process';
export interface RunResult { code: number; stdout: string; stderr: string; }
export interface Runner { run(args: string[], opts?: { cwd?: string }): Promise<RunResult>; }

function make(bin: string): Runner {
  return {
    run: (args, opts) => new Promise((resolve) => {
      execFile(bin, args, { cwd: opts?.cwd, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
        const code = err && typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : err ? 1 : 0;
        resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
      });
    }),
  };
}
export const git: Runner = make('git');
```
`ghRunner.ts`: same factory exporting `export const gh = make('gh');` plus:
```ts
let cached: { installed: boolean; authed: boolean } | null = null;
export async function ghStatus(force = false) {
  if (cached && !force) return cached;
  const v = await gh.run(['--version']);
  const a = v.code === 0 ? await gh.run(['auth', 'status']) : { code: 1 } as RunResult;
  cached = { installed: v.code === 0, authed: a.code === 0 };
  return cached;
}
```

- [x] **Step 2: `repoScanner.ts`** — implement spec §4.2 (BFS walk, `.git` file OR dir = repo, don't descend into repos, skip `node_modules`/dotdirs, depth ≤ 5). Use `fs.promises.readdir(dir, { withFileTypes: true })`.

- [x] **Step 3: `worktrees.ts`** — implement spec §4.3: call `git.run(['-C', repoRoot, 'worktree', 'list', '--porcelain'])`, feed stdout to `parseWorktreePorcelain`. For each parsed worktree, enrich via runner calls:
  - dirty: `['-C', wt.path, 'status', '--porcelain']` → dirty if stdout trimmed non-empty.
  - upstream: `['-C', wt.path, 'for-each-ref', "--format=%(upstream:short)%09%(upstream:track)", 'refs/heads/' + branch]` → `parseUpstream(stdout.trim())` (skip when detached).
  - last commit: `['-C', wt.path, 'log', '-1', '--format=%cI\x1f%s']` → split on `\x1f`.
  - remote (per repoRoot, computed once): `['-C', repoRoot, 'remote', 'get-url', 'origin']` (fallback first remote) → `normalizeRemote`.
  Assemble `WorktreeRow` (spec §3). Export `listAllWorktrees(repoRoots: string[]): Promise<WorktreeRow[]>` that flattens across repos.

- [x] **Step 4: Verify** `pnpm typecheck` → PASS. Smoke (manual, temporary script ok): log `listAllWorktrees(['~/Documents/GIT/MainApp'])` and confirm worktree paths/branches look right.

- [x] **Step 5: Commit** `feat: git/gh runners, repo scanner, worktree enrichment`

---

### Task 12: baseBranch, diff, operations, pr

**Files:** Create `src/main/git/baseBranch.ts`, `src/main/git/diff.ts`, `src/main/git/operations.ts`, `src/main/gh/pr.ts`

- [x] **Step 1: `baseBranch.ts`** — implement spec §4.5 resolution order using the runner; prefer `origin/<base>` when it verifies (`rev-parse --verify --quiet`).
- [x] **Step 2: `diff.ts`** — implement the three commands in spec §4.6 (`listCommits` feeds `parseCommits`; `commitDiff` and `fullDiff` return raw strings).
- [x] **Step 3: `operations.ts`** — implement spec §10 (`remove`, `deleteRemoteBranch`, `create`, `sync`). Each returns `OpResult` mapping runner `{code,stdout,stderr}`: `success = code === 0`; `message` human summary; include `stderr` on failure. Validate branch names with `isValidBranchName` before any branch op; throw/return failure if invalid.
- [x] **Step 4: `pr.ts`** — implement spec §5.2: TTL cache keyed `${ownerRepo}#${branch}`; run `gh pr list ... --json ...`; first element → `PrInfo` via JSON.parse + `mapChecksState`; null on no PR / gh unavailable.
- [x] **Step 5: Verify** `pnpm typecheck` → PASS. **Commit** `feat: base-branch resolution, diff, worktree operations, pr lookup`

---

## Phase 3 — IPC + preload

### Task 13: Settings IO + IPC handlers + preload bridge

**Files:** Create `src/main/settings/settings.ts`, `src/main/ipc.ts`; Modify `src/main/index.ts`, `src/preload/index.ts`; Create `src/renderer/types/api.d.ts`

- [x] **Step 1: `settings.ts`** — disk IO around the pure merge (Task 8): `load()` reads `join(app.getPath('userData'),'settings.json')`, `mergeSettings(DEFAULT_SETTINGS, parsed)`; `update(patch)` merges current+patch, writes pretty JSON, returns full. Wrap read in try/catch (missing file → defaults).

- [x] **Step 2: `ipc.ts`** — register one `ipcMain.handle` per `CH` channel, delegating to the services. Guard every path arg with `isPathWithinRoots(path, settings.roots)` (also allow known discovered worktree paths); reject otherwise. Include `dialog:pickDirectory` → `dialog.showOpenDialog({ properties: ['openDirectory'] })`. `open:editor` → `execFile(settings.editorCommand, [path])`; `open:finder` → `shell.openPath`; `open:url` → `shell.openExternal`.

- [x] **Step 3:** Call `registerIpc()` from `app.whenReady()` in `index.ts` before `createWindow()`.

- [x] **Step 4: `preload/index.ts`** — expose `window.api` with the exact shape in spec §7, each method calling `ipcRenderer.invoke(CH.x, ...args)`. Add `src/renderer/types/api.d.ts` declaring `interface Window { api: <the spec §7 type> }` importing types from `shared/types`.

- [x] **Step 5: Verify** `pnpm typecheck` → PASS. Manual: from devtools console `await window.api.worktrees.list()` returns rows. **Commit** `feat: settings IO, ipc handlers, preload bridge`

---

## Phase 4 — Renderer UI

Verified by running the app (`pnpm dev`) and visual check. Keep each component in its own file (spec §2). Use CSS variables for all colors (spec §11 theming).

### Task 14: Theme system

**Files:** Create `src/renderer/theme/tokens.css`, `src/renderer/theme/ThemeProvider.tsx`

- [x] **Step 1:** `tokens.css` — `:root` light vars (`--bg`, `--fg`, `--border`, `--accent`, `--danger`, `--ok`, `--warn`, `--muted`) + `[data-theme="dark"]` overrides. Import in `main.tsx`.
- [x] **Step 2:** `ThemeProvider.tsx` — read `settings.theme`; for `system`, use `matchMedia('(prefers-color-scheme: dark)')` + listener; set `document.documentElement.dataset.theme`. Expose current theme via context.
- [x] **Step 3: Verify** dev run toggles light/dark by OS appearance. **Commit** `feat: theme provider and design tokens`

### Task 15: Data hooks + worktree table + search/filter

**Files:** Create `src/renderer/hooks/useSettings.ts`, `src/renderer/hooks/useWorktrees.ts`, `src/renderer/components/WorktreeTable.tsx`, `SearchBar.tsx`, `FilterBar.tsx`, `PrBadge.tsx`, `GhMissingNotice.tsx`; Modify `App.tsx`

- [x] **Step 1:** `useWorktrees` — calls `api.worktrees.list()`, holds rows, `refresh()`, refresh on `window` focus (debounced ~1s), and lazily calls `api.pr.get(repo.ownerRepo, branch)` per row to fill `pr`.
- [x] **Step 2:** `WorktreeTable` — flat table, columns per spec §11, sortable headers (sort by repo→path default). `PrBadge` renders state+checks+review; clicking PR opens `api.open.url`.
- [x] **Step 3:** `SearchBar` live substring filter across repo/branch/path/PR title; `FilterBar` chips (dirty, merged/safe, has-PR, locked). Combine AND.
- [x] **Step 4:** `GhMissingNotice` shown when `api.gh.status()` reports not installed/authed (copy `brew install gh`, `gh auth login`, link to cli.github.com).
- [x] **Step 5: Verify** dev run shows the real worktree list, search/sort/filter work. **Commit** `feat: worktree dashboard table with search, sort, filter`

### Task 16: Worktree detail + diff viewer + commit list

**Files:** Create `src/renderer/components/WorktreeDetail.tsx`, `CommitList.tsx`, `DiffViewer.tsx`

- [x] **Step 1:** `DiffViewer` wraps `react-diff-view`: `parseDiff(rawDiff)` → render per-file (`Diff`/`Hunk`), unified default, add/del counts, collapsible. Import its CSS.
- [x] **Step 2:** `CommitList` from `api.worktrees.commits(path)`; click a commit → `api.worktrees.commitDiff(path, sha)` into DiffViewer. A "Full diff vs base" toggle → `api.worktrees.fullDiff(path)`.
- [x] **Step 3:** `WorktreeDetail` header (repo/branch/path, PR link) + mounts CommitList + DiffViewer; opened from a table row.
- [x] **Step 4: Verify** dev run: selecting a worktree shows commits; clicking renders a GitHub-style diff. **Commit** `feat: worktree detail with commit list and in-app diff viewer`

### Task 17: Operations menu, terminal split button, settings, onboarding

**Files:** Create `src/renderer/components/OperationsMenu.tsx`, `TerminalSplitButton.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`, `SettingsPage.tsx`, `Onboarding.tsx`

- [x] **Step 1:** `ConfirmDialog` + `Toast` primitives. Destructive ops (remove/deleteRemote/force) require confirm naming exact branch+path (spec §10). Dirty worktree → force checkbox + warning; show green "safe to delete" when `upstreamGone || pr?.state==='MERGED'`.
- [x] **Step 2:** `OperationsMenu` wires `api.worktrees.remove/deleteRemoteBranch/sync/create` + `api.open.editor/finder`. Results → toasts; refresh on success.
- [x] **Step 3:** `TerminalSplitButton` — primary = `settings.defaultTerminal`; flyout from `api.terminals.available()`. Resume uses primary linked session's `sessionId`+`launchDir` → `api.terminals.resumeSession`. Warp option shows clipboard-limitation tooltip.
- [x] **Step 4:** `SettingsPage` edits every `Settings` field (roots via `api dialog:pickDirectory`; editor cmd; default terminal; default base; PR TTL; theme) → `api.settings.update` → triggers refresh. `Onboarding` shown when `roots` empty (folder picker, optional `~/Documents/GIT` suggestion).
- [x] **Step 5: Verify** dev run: create/remove/sync work with confirms+toasts; Resume opens the right terminal at launchDir; settings persist across restart. **Commit** `feat: operations, terminal split button, settings page, onboarding`

---

## Phase 5 — Terminal adapters

### Task 18: macOS terminal adapters

**Files:** Create `src/main/terminals/adapters.ts`; Modify `src/main/ipc.ts` (wire `terminalsAvailable/Resume/OpenDir`)

- [x] **Step 1:** Implement spec §9: `available()` by checking `/Applications/iTerm.app`, `/Applications/Warp.app` (Terminal always present). `resume(kind, launchDir, sessionId)` and `openDir(kind, dir)` build `cmd = cd '<dir>' && claude --resume <id>` (resume) with `escapeForAppleScript`. Terminal.app + iTerm2 via `osascript -e <script>`; Warp via `open -a Warp <dir>` + `clipboard.writeText('claude --resume <id>')` returning an explanatory `OpResult`.
- [x] **Step 2:** `escapeForAppleScript(s)` escapes `\` and `"`; shell path wrapped in single quotes with `'` → `'\''`.
- [x] **Step 3: Verify** dev run: each installed terminal opens correctly at the launch dir; Warp copies the command. **Commit** `feat: macOS terminal adapters (Terminal/iTerm2/Warp)`

---

## Phase 6 — Package

### Task 19: Build, package, README

**Files:** Create `README.md`; Modify `package.json` if needed

- [x] **Step 1:** `README.md` — what it is, requirements (`gh` for PR detail, macOS), `pnpm install && pnpm dev`, and the co-author hook note (local-only; re-create on fresh clones, see `DESIGN.md` §"Local hook").
- [x] **Step 2:** Run `pnpm lint && pnpm typecheck && pnpm test` → all PASS.
- [x] **Step 3:** Run `pnpm package` → produces a `.dmg` under `release/`. Launch it once to confirm it boots.
- [x] **Step 4: Commit** `chore: add README and verify packaging`

---

## Self-Review (completed)

- **Spec coverage:** §1 stack→Task 1; §2 structure→all tasks; §3 types→Task 2; §4 git→Tasks 3-6,11,12; §5 gh/PR→Tasks 7,12; §6 sessions→Task 10; §7 IPC→Task 13; §8 settings→Tasks 8,13; §9 terminals→Task 18; §10 ops→Task 12,17; §11 UI→Tasks 14-17; §12 tests→Tasks 3-10; §13 non-goals respected (no watcher/e2e/rebase); §14 build→Task 19. No gaps.
- **Placeholders:** none — pure-logic tasks carry full test+impl code; wiring tasks reference exact spec sections and exact commands/signatures.
- **Type consistency:** all task code uses the spec §3 names (`WorktreeRow.sessions: SessionLink[]`, `PrInfo.checksState`, `OpResult.success/message/stderr`, `parseUpstream`/`parseCommits`/`mapChecksState`/`normalizeRemote`/`linkSessions`). Runner interface `Runner.run(args, opts)` is consistent across git/gh consumers.

---

## Phase 7 — Post-Launch Improvements (all shipped, 2026-06-17/18)

All items in this phase were implemented after the initial v0.1.0 release based on real usage. Each is committed and pushed to `main`.

---

### UX / Table

- **Sticky headers fix**: `border-collapse: collapse` breaks `position: sticky` in Chromium — changed to `border-separate + border-spacing: 0`. Sticky headers moved to a self-scrolling container (`overflow: auto` inner div); `<main>` changed to `overflow: hidden` so the scroll context is correct.
- **Floating row actions**: Removed click-to-select from `<tr>`; action buttons appear floating on row hover (`opacity: 0 → 1`), positioned absolutely with `width: 0` last column so they don't cause horizontal scroll.
- **Row actions as icons** (500ms tooltips): Replaced button text with icons (👁 ▶ ✏ ✎ 🗑 📂 >_ ↗). Native `title` delay (~1s) replaced with a global `data-tip` tooltip system (`src/renderer/tooltip.ts`) that uses `position: fixed` (escapes overflow clipping) with a configurable 500ms delay.
- **PR column badge hidden during hover**: `prHoveredId` state hides floating actions when mouse is over the PR cell (prevents accidental row-enter when clicking PR link).
- **Sortable headers**: Column header `<th>` elements are now clickable to sort; resize handle uses `stopPropagation` to avoid triggering sort on drag.
- **Drag-to-resize columns**: Click-drag on column header right edge; first drag snapshots all widths from DOM and switches to `tableLayout: fixed`.
- **Modified column**: New sortable column showing last-commit date/time in local timezone.
- **Multi-select repo chips**: `filters.repo` changed from `string | null` to `string[]`; multiple repos can be active simultaneously.
- **State column tooltip**: Dynamic hover popup on State cell explaining only the visible badges (dirty/ahead/behind/locked/prunable/remote-gone/merged).
- **PR column tooltip**: Hover popup explaining PR number/state, title, target branch, CI checks, review decision.
- **No focus-based refresh**: Removed the 1s debounced window-focus refresh; only the manual Refresh button triggers a reload.
- **Persist across restarts** (localStorage): `claude-grove:table-state` stores `filters`, `sortKey`, `sortDir`, `colWidths` — fully restored on startup. Stale repo selections auto-cleaned when worktrees change.
- **Window state persistence**: `userData/window-state.json` stores window size, position, and screen. On startup, validates position is still on a connected display.

---

### Worktree Detail View

- **Working changes panel** (`CommitList.tsx`): Appears when `isDirty`. Lists changed files (tracked modified, added, deleted, untracked) with status badges (M/A/D/U). Features:
  - Checkboxes per file + select-all toggle
  - Click file → loads per-file diff (tracked: `git diff HEAD`, untracked: `git diff --no-index /dev/null <file>`)
  - File tooltip showing full filename + path (both truncated spans)
  - ↩ rollback button per file (`git checkout HEAD --` or `git clean -f` for untracked)
  - "Commit N files…" button → modal with textarea for commit message
- **PR baseRefName for commits**: Passes `pr.baseRefName` to the commits IPC call so the diff is always relative to the actual PR target, not the stale `origin/HEAD` (which pointed to `master` while repo used `main`).
- **Live selected row**: `selectedId` (string) instead of `selected` (WorktreeRow) in App.tsx — WorktreeDetail always gets the latest row from `worktrees` array, so PR data loaded lazily is visible.
- **Keep table mounted**: `WorktreeTable` is never unmounted when viewing detail — `display: none` toggle preserves all filter/sort/column state.
- **Terminal button**: Opens configured terminal at worktree path (`window.api.terminals.openDir`).
- **Rename branch**: Renames locally (`git branch -m`) + pushes new name + deletes old remote.
- **Merge commit diffs**: `commitDiff` now uses `git diff <sha>^1 <sha>` instead of `git show` (merge commits produce combined diff format that `parseDiff` can't parse).

---

### State Column Enhancements

- **Remote-gone badge**: `upstreamGone` rows show clickable `🗑 remote gone` badge (amber) that opens the delete dialog pre-set with `deleteRemote: false`. Distinct from `✓ merged` (green, for PR-merged-but-remote-exists).
- **Stale-selection cleanup**: `useEffect` drops `filters.repo` entries that no longer exist in current worktree list (prevents "No worktrees found" when worktrees are refreshed).

---

### PR / GitHub Integration

- **PR checks detail** (`checksDetail: string[]` on `PrInfo`): When `checksState = FAILING`, hover the ✗ badge to see which checks failed (e.g. `✗ ci/build`, `○ ci/test (pending)`).
- **`checksDetail` population**: Extracted from `statusCheckRollup` in `pr.ts`; only failing/pending checks included.

---

### Git Operations

- **Rollback file** (`worktrees:rollbackFile`): Reverts a single file from working changes. Tracked files: `git checkout HEAD --`. Untracked files: `git clean -f`. Also handles staged files by resetting first.
- **Scanner fix**: `repoScanner` stops descending when it finds a `.git` FILE (linked worktree) — previously descended all the way in and spammed "max depth reached" warnings. Only `.git` DIRECTORY registers a new repo.

---

### Settings / Editor

- **Native app picker**: "Choose app…" button opens `dialog.showOpenDialog` filtered to `.app` files at `/Applications`. Selected `.app` path stored in `editorCommand`. Opening logic: `.app` path → `execFile('/usr/bin/open', ['-a', appPath, filePath])`. CLI commands (`code`, `cursor`) → direct `execFile`.
- **PATH augmentation**: On app startup, `/opt/homebrew/bin`, `/usr/local/bin`, etc. prepended to `process.env.PATH` so `git`, `gh`, editor CLIs are found even when launched from macOS's limited Electron PATH.

---

### Terminal Adapters

- **Warp native notification**: When Resume copies command to clipboard for Warp, fires a macOS native `Notification` (visible even after Warp steals focus) saying "paste to run".
- **Window close = quit**: `app.on('window-all-closed')` now calls `app.quit()` unconditionally (removed the macOS-specific skip).

---

### Help / Documentation

- **Help modal** (`HelpModal.tsx`): Large scrollable modal (85vw, 82vh) with sections: Overview, Table Columns, Row Actions, Worktree Detail View, Filters and Search, Settings, GitHub/PR Integration, Claude Code Sessions.
- **Header icon buttons**: Refresh (↺), Help (?), Settings (⚙) — compact square buttons with `title` tooltips.

---

### Theming / Visuals

- **Dark mode diff colors**: `html[data-theme="dark"]` overrides react-diff-view CSS variables. Must use `html[data-theme]` (specificity 0,1,1) to beat react-diff-view's `:root` vars (0,1,0) regardless of stylesheet source order.
- **Theme-aware scrollbars**: `::-webkit-scrollbar*` rules in `tokens.css` using `--bg-secondary`, `--border`, `--muted`.
- **Global button hover**: `button:not(:disabled):hover { filter: brightness(0.9) }` in `tokens.css`.
- **Chip active border fix**: CHIP_ACTIVE uses `border: '1px solid var(--accent)'` (full shorthand) instead of `borderColor` to prevent residue after deselect.

---

### CI / Release

- **GitHub Actions — CI** (`.github/workflows/ci.yml`): lint + typecheck + unit tests on every push/PR.
- **GitHub Actions — Release** (`.github/workflows/release.yml`): triggered on `v*` tags; builds DMG on `macos-latest`, creates GitHub Release with DMG attached. Also runnable manually.
- **GitHub Actions — Pages** (`.github/workflows/pages.yml`): deploys unit test HTML report + coverage to GitHub Pages on every push to `main`.
- **`build-pages.mjs`** (`scripts/`): Builds `_pages/` site with home page, unit test report, and coverage report.
- **`@vitest/ui`** added as dev dep; vitest config uses `["default", "junit", "html"]` reporters in CI.
- **v0.1.0 release**: Tagged, DMG pushed to GitHub Releases.

---

### Logging

- **Structured IPC logging**: `logger.info`/`logger.error` added to all mutating IPC handlers (remove, create, sync, rename, commitFiles) + worktrees list (repo/worktree counts).
- **Operations logging**: Error/warn logs in `renameBranch`, `commitFiles` in `operations.ts`.

---

## Phase 8 — Session 2026-06-20 (all shipped)

### Card layout view
- **`WorktreeCardGrid`** + **`WorktreeCard`**: repo-colored left border (hash → hue), 3×3 responsive grid via `ResizeObserver`, scrollable card bodies, `overflow: hidden` on card root.
- **Kebab menu (`⋮`)**: `openMenuId` lifted to grid level — only one menu open at a time. `onMouseDown` stopPropagation on the button fixes toggle-close behavior. `transform: translateY` removed from card hover (was breaking `position: fixed` dropdown via CSS stacking context).
- **Card info rows**: All table columns shown as labeled `InfoRow` components: State, PR, Commit, Modified, Path, Upstream, Sessions.
- **▶ session button**: In card header — quick resume (single session) or session picker (multiple). Uses `SessionPickerModal`.
- **⎘ copy buttons**: `CopyButton` component (shows `⎘`, flashes `✓`). Present on: branch (card header + table hover), commit SHA, Path, Upstream.
- **Commit SHA links**: SHA in both card Commit row and table Last commit column is a clickable link to `{remoteUrl}/commit/{fullSha}` on GitHub.
- **State + PR tooltips on cards**: Same tooltip content as table (via shared `src/renderer/utils/tooltips.ts`).

### Filter bar
- **Repos multi-select dropdown**: Replaced individual repo chips. Dropdown has: text search input (auto-focused), Select all / Deselect all checkbox (with indeterminate state), per-repo checkboxes, `position: fixed` for overflow safety.
- **Sort moved left**: No longer `margin-left: auto` pushed right — flows naturally after the Repos dropdown.

### UI/UX improvements (all screens)
- **Skeleton loading** (WorktreeTable): 6 shimmer rows with staggered `animationDelay`, replacing bare "Loading…" text.
- **State badge pills**: Colored tint + matching border + `borderRadius: 10` in both table and card.
- **Button hierarchy** (WorktreeDetail): Resume = accent primary; Delete = danger outline; others = secondary.
- **Focus rings**: `.settings-input` and `.detail-rename-input` get `border-color: accent + box-shadow: accent-muted` on focus.
- **Segmented controls**: Theme and Terminal in Settings use the same segmented control pattern as the header layout toggle.
- **Save feedback**: Settings Save button shows "✓ Saved" briefly before closing.
- **Design tokens**: `--radius-sm/md/lg/xl`, `--bg-hover`, `--accent-muted`, `--transition-fast/base`, `--modal-backdrop` added to `tokens.css`. Keyframes: `shimmer`, `fadeInSlide`, `spin`.
- **Floating action fade-in**: `fadeInSlide` animation on table row hover actions.
- **"← Back" button** + path `11→12px` in detail view. Splitter `5→8px`.

### Theme
- `ThemeProvider` is now self-contained: reads `claude-grove:theme` from `localStorage`, falls back to `matchMedia` on first launch. No longer takes a `setting` prop.
- **☀ / ☾ toggle** added to header. Removed Theme section from Settings.

### Graffiti title
- **Bangers** Google Font loaded via `@import` in `tokens.css`.
- Title uses `fontSize: 34, letterSpacing: 0.08em, -webkit-text-stroke: 0.5px accent, text-shadow: 2px/4px flat shadow`.
- Same style used in HelpModal header.

### Context-aware refresh
- List view: `refresh()` reloads all worktrees.
- Detail view: increments `detailRefreshKey` → `WorktreeDetail` reloads diff + remounts `CommitList`. Does NOT reload the full list.
- Layout toggle hidden in detail view (`display: none` when `selected !== null`).

### HelpModal updated
- All sections updated to reflect: theme toggle, ▶ card button, ⎘ copy buttons, SHA links, Repos dropdown, refresh behavior, Settings changes.

---

## Current State (2026-06-20)

- **Tests**: 37/37 passing (8 test files, pure logic only)
- **Typecheck**: clean (both `tsconfig.node.json` and `tsconfig.web.json`)
- **Latest tag**: `v0.3.0`
- **GitHub Pages**: https://haimadrian.github.io/claude-grove/
- **Repo**: https://github.com/haimadrian/claude-grove
- **Local path**: `~/Documents/GIT/claude-grove`
- **Local git config**: `user.email = haimadrian@gmail.com`
- **Branch**: `main` (all changes committed, clean working tree)

### Key files added/changed in Phase 8
- `src/renderer/components/WorktreeCard.tsx` — card component
- `src/renderer/components/WorktreeCardGrid.tsx` — grid container
- `src/renderer/components/CopyButton.tsx` — ⎘ copy button
- `src/renderer/components/FilterBar.tsx` — repos dropdown + sort
- `src/renderer/components/HelpModal.tsx` — updated docs
- `src/renderer/utils/tooltips.ts` — shared tooltip builders
- `src/renderer/theme/ThemeProvider.tsx` — localStorage-based theme
- `src/renderer/App.tsx` — header controls, context-aware refresh
- `src/renderer/theme/tokens.css` — new tokens + keyframes + Bangers font
- `src/shared/types.ts` — `layout: 'table' | 'card'` in Settings
- `src/main/settings/defaults.ts` — `layout: 'table'` default

### Development commands
```bash
pnpm dev          # hot-reload dev
pnpm test         # 37 unit tests
pnpm typecheck    # tsc both configs
pnpm package      # build DMG → release/
git tag vX.Y.Z && git push origin vX.Y.Z  # trigger release workflow
```
