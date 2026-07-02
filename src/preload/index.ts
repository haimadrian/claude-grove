import { contextBridge, ipcRenderer } from 'electron';
import { CH } from '../shared/ipcChannels';
import type { Settings, WorktreeRow, Commit, PrInfo, OpResult, GhStatus, SyncAction, TerminalKind, ConflictFileSegment } from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(CH.settingsGet),
    update: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke(CH.settingsUpdate, patch),
  },
  worktrees: {
    list: (): Promise<WorktreeRow[]> => ipcRenderer.invoke(CH.worktreesList),
    commits: (path: string, base?: string): Promise<Commit[]> => ipcRenderer.invoke(CH.worktreesCommits, path, base),
    commitDiff: (path: string, sha: string, ignoreWhitespace?: boolean): Promise<string> => ipcRenderer.invoke(CH.worktreesCommitDiff, path, sha, ignoreWhitespace),
    fullDiff: (path: string, base?: string, ignoreWhitespace?: boolean): Promise<string> => ipcRenderer.invoke(CH.worktreesFullDiff, path, base, ignoreWhitespace),
    remove: (path: string, opts: { force: boolean; deleteLocalBranch: boolean }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesRemove, path, opts),
    deleteRemoteBranch: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesDeleteRemote, path),
    create: (input: { repoPath: string; branch: string; base: string }): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesCreate, input),
    sync: (path: string, action: SyncAction): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesSync, path, action),
    renameBranch: (path: string, newBranch: string): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesRenameBranch, path, newBranch),
    listBranches: (path: string): Promise<string[]> =>
      ipcRenderer.invoke(CH.worktreesListBranches, path),
    resolveActiveBase: (path: string, prBaseRefName?: string): Promise<string> =>
      ipcRenderer.invoke(CH.worktreesResolveActiveBase, path, prBaseRefName),
    mergeFrom: (path: string, branch: string): Promise<OpResult & { conflictedFiles: string[] | null }> =>
      ipcRenderer.invoke(CH.worktreesMergeFrom, path, branch),
    listConflictedFiles: (path: string): Promise<string[]> =>
      ipcRenderer.invoke(CH.worktreesListConflictedFiles, path),
    getConflictBlocks: (path: string, filePath: string): Promise<ConflictFileSegment[]> =>
      ipcRenderer.invoke(CH.worktreesGetConflictBlocks, path, filePath),
    applyFileResolution: (path: string, filePath: string, resolvedContent: string): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesApplyFileResolution, path, filePath, resolvedContent),
    finishMerge: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesFinishMerge, path),
    abortMerge: (path: string): Promise<OpResult> => ipcRenderer.invoke(CH.worktreesAbortMerge, path),
    workingFiles: (path: string) =>
      ipcRenderer.invoke(CH.worktreesWorkingFiles, path),
    workingFileDiff: (path: string, filePath: string): Promise<string> =>
      ipcRenderer.invoke(CH.worktreesWorkingFileDiff, path, filePath),
    commitFiles: (path: string, files: string[], message: string): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesCommitFiles, path, files, message),
    rollbackFile: (path: string, filePath: string, status: string): Promise<OpResult> =>
      ipcRenderer.invoke(CH.worktreesRollbackFile, path, filePath, status),
  },
  pr: {
    get: (ownerRepo: string, branch: string): Promise<PrInfo | null> => ipcRenderer.invoke(CH.prGet, ownerRepo, branch),
  },
  gh: {
    status: (): Promise<GhStatus> => ipcRenderer.invoke(CH.ghStatus),
  },
  user: {
    getFirstName: (): Promise<string> => ipcRenderer.invoke(CH.userGetFirstName),
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
    pickApplication: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
      ipcRenderer.invoke(CH.pickApplication),
  },
  find: {
    search: (text: string): void => { ipcRenderer.send(CH.findInPage, text, false, true); },
    next: (text: string): void => { ipcRenderer.send(CH.findInPage, text, true, true); },
    prev: (text: string): void => { ipcRenderer.send(CH.findInPage, text, true, false); },
    stop: (): void => { ipcRenderer.send(CH.stopFindInPage); },
    onResult: (cb: (result: { activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => void): (() => void) => {
      const listener = (_: Electron.IpcRendererEvent, result: { activeMatchOrdinal: number; matches: number; finalUpdate: boolean }): void => cb(result);
      ipcRenderer.on(CH.foundInPage, listener);
      return () => { ipcRenderer.removeListener(CH.foundInPage, listener); };
    },
  },
});
