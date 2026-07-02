import type { Settings, WorktreeRow, Commit, PrInfo, OpResult, GhStatus, SyncAction, TerminalKind, ConflictFileSegment } from '../../shared/types';

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
        commitDiff(path: string, sha: string, ignoreWhitespace?: boolean): Promise<string>;
        fullDiff(path: string, base?: string, ignoreWhitespace?: boolean): Promise<string>;
        remove(path: string, opts: { force: boolean; deleteLocalBranch: boolean }): Promise<OpResult>;
        deleteRemoteBranch(path: string): Promise<OpResult>;
        create(input: { repoPath: string; branch: string; base: string }): Promise<OpResult>;
        sync(path: string, action: SyncAction): Promise<OpResult>;
        renameBranch(path: string, newBranch: string): Promise<OpResult>;
        listBranches(path: string): Promise<string[]>;
        resolveActiveBase(path: string, prBaseRefName?: string): Promise<string>;
        workingFiles(path: string): Promise<Array<{ path: string; status: string; label: string }>>;
        workingFileDiff(path: string, filePath: string): Promise<string>;
        commitFiles(path: string, files: string[], message: string): Promise<OpResult>;
        rollbackFile(path: string, filePath: string, status: string): Promise<OpResult>;
        mergeFrom(path: string, branch: string): Promise<OpResult & { conflictedFiles: string[] | null }>;
        listConflictedFiles(path: string): Promise<string[]>;
        getConflictBlocks(path: string, filePath: string): Promise<ConflictFileSegment[]>;
        applyFileResolution(path: string, filePath: string, resolvedContent: string): Promise<OpResult>;
        finishMerge(path: string): Promise<OpResult>;
        abortMerge(path: string): Promise<OpResult>;
      };
      pr: {
        get(ownerRepo: string, branch: string): Promise<PrInfo | null>;
      };
      gh: {
        status(): Promise<GhStatus>;
      };
      user: {
        getFirstName(): Promise<string>;
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
      find: {
        search(text: string): void;
        next(text: string): void;
        prev(text: string): void;
        stop(): void;
        onResult(cb: (result: { activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => void): () => void;
      };
    };
  }
}
