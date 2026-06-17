import type { Settings, WorktreeRow, Commit, PrInfo, OpResult, GhStatus, SyncAction, TerminalKind } from '../../shared/types';

declare global {
  interface Window {
    api: {
      settings: {
        get(): Promise<Settings>;
        update(patch: Partial<Settings>): Promise<Settings>;
      };
      worktrees: {
        list(): Promise<WorktreeRow[]>;
        commits(path: string, base?: string): Promise<Commit[]>;
        commitDiff(path: string, sha: string): Promise<string>;
        fullDiff(path: string, base?: string): Promise<string>;
        remove(path: string, opts: { force: boolean; deleteLocalBranch: boolean }): Promise<OpResult>;
        deleteRemoteBranch(path: string): Promise<OpResult>;
        create(input: { repoPath: string; branch: string; base: string }): Promise<OpResult>;
        sync(path: string, action: SyncAction): Promise<OpResult>;
        renameBranch(path: string, newBranch: string): Promise<OpResult>;
        workingFiles(path: string): Promise<Array<{ path: string; status: string; label: string }>>;
        workingFileDiff(path: string, filePath: string): Promise<string>;
        commitFiles(path: string, files: string[], message: string): Promise<OpResult>;
      };
      pr: {
        get(ownerRepo: string, branch: string): Promise<PrInfo | null>;
      };
      gh: {
        status(): Promise<GhStatus>;
      };
      terminals: {
        available(): Promise<TerminalKind[]>;
        resumeSession(input: { terminal: TerminalKind; launchDir: string; sessionId: string }): Promise<OpResult>;
        openDir(input: { terminal: TerminalKind; dir: string }): Promise<OpResult>;
      };
      open: {
        editor(path: string): Promise<OpResult>;
        finder(path: string): Promise<OpResult>;
        url(url: string): Promise<OpResult>;
      };
      dialog: {
        pickDirectory(): Promise<{ canceled: boolean; filePaths: string[] }>;
        pickApplication(): Promise<{ canceled: boolean; filePaths: string[] }>;
      };
    };
  }
}
