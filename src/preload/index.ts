import { contextBridge, ipcRenderer } from 'electron';
import { CH } from '../shared/ipcChannels';
import type { Settings, WorktreeRow, Commit, PrInfo, OpResult, GhStatus, SyncAction, TerminalKind } from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(CH.settingsGet),
    update: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke(CH.settingsUpdate, patch),
  },
  worktrees: {
    list: (): Promise<WorktreeRow[]> => ipcRenderer.invoke(CH.worktreesList),
    commits: (path: string, base?: string): Promise<Commit[]> => ipcRenderer.invoke(CH.worktreesCommits, path, base),
    commitDiff: (path: string, sha: string): Promise<string> => ipcRenderer.invoke(CH.worktreesCommitDiff, path, sha),
    fullDiff: (path: string, base?: string): Promise<string> => ipcRenderer.invoke(CH.worktreesFullDiff, path, base),
    remove: (path: string, opts: { force: boolean; deleteLocalBranch: boolean }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesRemove, path, opts),
    deleteRemoteBranch: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesDeleteRemote, path),
    create: (input: { repoPath: string; branch: string; base: string }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesCreate, input),
    sync: (path: string, action: SyncAction): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesSync, path, action),
  },
  pr: {
    get: (ownerRepo: string, branch: string): Promise<PrInfo | null> => ipcRenderer.invoke(CH.prGet, ownerRepo, branch),
  },
  gh: {
    status: (): Promise<GhStatus> => ipcRenderer.invoke(CH.ghStatus),
  },
  terminals: {
    available: (): Promise<TerminalKind[]> => ipcRenderer.invoke(CH.terminalsAvailable),
    resumeSession: (input: { terminal: TerminalKind; launchDir: string; sessionId: string }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.terminalsResume, input),
    openDir: (input: { terminal: TerminalKind; dir: string }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.terminalsOpenDir, input),
  },
  open: {
    editor: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.openEditor, path),
    finder: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.openFinder, path),
    url: (url: string): Promise<OpResult> => ipcRenderer.invoke(CH.openUrl, url),
  },
  dialog: {
    pickDirectory: (): Promise<{ canceled: boolean; filePaths: string[] }> => ipcRenderer.invoke(CH.pickDirectory),
  },
});
