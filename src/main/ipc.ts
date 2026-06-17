import { ipcMain, dialog, shell } from 'electron';
import { execFile } from 'node:child_process';
import { CH } from '../shared/ipcChannels';
import { loadSettings, updateSettings } from './settings/settings';
import { scanRepos } from './git/repoScanner';
import { listAllWorktrees } from './git/worktrees';
import { listCommits, commitDiff, fullDiff } from './git/diff';
import { resolveBaseBranch } from './git/baseBranch';
import { removeWorktree, deleteRemoteBranch, createWorktree, syncWorktree, renameBranch } from './git/operations';
import { getPr } from './gh/pr';
import { ghStatus } from './gh/ghRunner';
import { isPathWithinRoots } from './security/validate';
import { logger } from './logger';
import type { Settings, SyncAction, TerminalKind } from '../shared/types';
import { available as terminalsAvailable, resumeSession, openDir as terminalOpenDir } from './terminals/adapters';
import { scanSessions } from './sessions/sessionScanner';
import { linkSessions } from './sessions/sessionLinker';

let cachedRepos: string[] = [];

async function getRepos(settings: Settings): Promise<string[]> {
  if (cachedRepos.length === 0 && settings.roots.length > 0) {
    cachedRepos = await scanRepos(settings.roots);
  }
  return cachedRepos;
}

function invalidateRepoCache(): void {
  cachedRepos = [];
}

function guardPath(p: string, settings: Settings): boolean {
  return isPathWithinRoots(p, settings.roots) || cachedRepos.some((r) => p === r || p.startsWith(r + '/'));
}

export function registerIpc(): void {
  // Settings
  ipcMain.handle(CH.settingsGet, async () => {
    return loadSettings();
  });

  ipcMain.handle(CH.settingsUpdate, async (_e, patch: Partial<Settings>) => {
    const result = await updateSettings(patch);
    invalidateRepoCache();
    return result;
  });

  // Worktrees
  ipcMain.handle(CH.worktreesList, async () => {
    const settings = await loadSettings();
    const repos = await getRepos(settings);
    const worktrees = await listAllWorktrees(repos);
    const wtPaths = worktrees.map((w) => w.path);
    const sessions = await scanSessions(settings.claudeProjectsDir, wtPaths);
    linkSessions(worktrees, sessions);
    return worktrees;
  });

  ipcMain.handle(CH.worktreesCommits, async (_e, wtPath: string, base?: string) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) { logger.warn(`ipc: rejected path ${wtPath}`); return []; }
    const resolvedBase = base ?? await resolveBaseBranch(wtPath, { pr: null, defaultBaseBranch: settings.defaultBaseBranch });
    return listCommits(wtPath, resolvedBase);
  });

  ipcMain.handle(CH.worktreesCommitDiff, async (_e, wtPath: string, sha: string) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return '';
    return commitDiff(wtPath, sha);
  });

  ipcMain.handle(CH.worktreesFullDiff, async (_e, wtPath: string, base?: string) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return '';
    const resolvedBase = base ?? await resolveBaseBranch(wtPath, { pr: null, defaultBaseBranch: settings.defaultBaseBranch });
    return fullDiff(wtPath, resolvedBase);
  });

  ipcMain.handle(CH.worktreesRemove, async (_e, wtPath: string, opts: { force: boolean; deleteLocalBranch: boolean }) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return { success: false, message: 'Path not allowed' };
    const repos = await getRepos(settings);
    const repoRoot = repos.find((r) => wtPath.startsWith(r + '/')) ?? '';
    if (!repoRoot) return { success: false, message: 'Cannot find repo root for worktree' };
    const wts = await listAllWorktrees(repos);
    const branch = wts.find((w) => w.path === wtPath)?.branch ?? null;
    const result = await removeWorktree(wtPath, repoRoot, { ...opts, branch });
    if (result.success) invalidateRepoCache();
    return result;
  });

  ipcMain.handle(CH.worktreesDeleteRemote, async (_e, wtPath: string) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return { success: false, message: 'Path not allowed' };
    const wts = await listAllWorktrees(await getRepos(settings));
    const wt = wts.find((w) => w.path === wtPath);
    return deleteRemoteBranch(wtPath, wt?.branch ?? null);
  });

  ipcMain.handle(CH.worktreesCreate, async (_e, input: { repoPath: string; branch: string; base: string }) => {
    const settings = await loadSettings();
    if (!guardPath(input.repoPath, settings)) return { success: false, message: 'Path not allowed' };
    const result = await createWorktree(input, settings.newWorktreeParentDir);
    if (result.success) invalidateRepoCache();
    return result;
  });

  ipcMain.handle(CH.worktreesSync, async (_e, wtPath: string, action: SyncAction) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return { success: false, message: 'Path not allowed' };
    return syncWorktree(wtPath, action, settings.defaultBaseBranch);
  });

  ipcMain.handle(CH.worktreesRenameBranch, async (_e, wtPath: string, newBranch: string) => {
    const settings = await loadSettings();
    if (!guardPath(wtPath, settings)) return { success: false, message: 'Path not allowed' };
    const repos = await getRepos(settings);
    const repoRoot = repos.find((r) => wtPath.startsWith(r + '/')) ?? '';
    if (!repoRoot) return { success: false, message: 'Cannot find repo root for worktree' };
    const wts = await listAllWorktrees(repos);
    const wt = wts.find((w) => w.path === wtPath);
    if (!wt?.branch) return { success: false, message: 'Worktree has no branch (detached HEAD)' };
    const result = await renameBranch(wtPath, repoRoot, wt.branch, newBranch, wt.upstream !== null);
    if (result.success) invalidateRepoCache();
    return result;
  });

  // PR
  ipcMain.handle(CH.prGet, async (_e, ownerRepo: string, branch: string) => {
    const settings = await loadSettings();
    return getPr(ownerRepo, branch, settings.prCacheTtlSeconds);
  });

  // GH
  ipcMain.handle(CH.ghStatus, async () => ghStatus());

  // Terminals
  ipcMain.handle(CH.terminalsAvailable, async () => terminalsAvailable());
  ipcMain.handle(CH.terminalsResume, async (_e, input: { terminal: TerminalKind; launchDir: string; sessionId: string }) => {
    const settings = await loadSettings();
    if (!guardPath(input.launchDir, settings)) return { success: false, message: 'Path not allowed' };
    return resumeSession(input.terminal, input.launchDir, input.sessionId);
  });
  ipcMain.handle(CH.terminalsOpenDir, async (_e, input: { terminal: TerminalKind; dir: string }) => {
    const settings = await loadSettings();
    if (!guardPath(input.dir, settings)) return { success: false, message: 'Path not allowed' };
    return terminalOpenDir(input.terminal, input.dir);
  });

  // Open
  ipcMain.handle(CH.openEditor, async (_e, p: string) => {
    const settings = await loadSettings();
    if (!guardPath(p, settings)) return { success: false, message: 'Path not allowed' };
    const cmd = settings.editorCommand.trim();
    if (!cmd) return { success: false, message: 'No editor configured. Set one in Settings.' };
    return new Promise<{ success: boolean; message: string }>((resolve) => {
      // .app bundle path → use /usr/bin/open -a
      if (cmd.endsWith('.app')) {
        execFile('/usr/bin/open', ['-a', cmd, p], (err) => {
          if (err) resolve({ success: false, message: `Failed to open in ${cmd}: ${err.message}` });
          else resolve({ success: true, message: `Opened in editor` });
        });
      } else {
        // CLI command — split on spaces, use first token as binary
        const parts = cmd.split(/\s+/);
        const binary = parts[0] === 'open' ? '/usr/bin/open' : (parts[0] ?? 'code');
        const preArgs = parts[0] === 'open' ? parts.slice(1) : parts.slice(1);
        execFile(binary, [...preArgs, p], (err) => {
          if (err) resolve({ success: false, message: `Failed to open editor (${binary}): ${err.message}` });
          else resolve({ success: true, message: `Opened in editor` });
        });
      }
    });
  });

  ipcMain.handle(CH.openFinder, async (_e, p: string) => {
    const settings = await loadSettings();
    if (!guardPath(p, settings)) return { success: false, message: 'Path not allowed' };
    const res = await shell.openPath(p);
    return { success: !res, message: res || `Opened ${p}` };
  });

  ipcMain.handle(CH.openUrl, async (_e, url: string) => {
    if (!/^https?:\/\//i.test(url)) return { success: false, message: 'Only http/https URLs allowed' };
    await shell.openExternal(url);
    return { success: true, message: `Opened ${url}` };
  });

  // Dialog
  ipcMain.handle(CH.pickDirectory, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result;
  });

  ipcMain.handle(CH.pickApplication, async () => {
    return dialog.showOpenDialog({
      title: 'Select editor application',
      defaultPath: '/Applications',
      properties: ['openFile'],
      filters: [{ name: 'Applications', extensions: ['app'] }],
    });
  });

  logger.info(`ipc: registered ${Object.keys(CH).length} handlers`);
}
