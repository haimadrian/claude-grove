export type Theme = 'system' | 'light' | 'dark';
export type TerminalKind = 'Terminal' | 'iTerm2' | 'Warp';
export type SyncAction = 'fetch' | 'pull' | 'mergeBase' | 'prune';

export interface Settings {
  version: 1;
  roots: string[];
  claudeProjectsDir: string;
  defaultBaseBranch: string;
  prCacheTtlSeconds: number;
  editorCommand: string;
  defaultTerminal: TerminalKind;
  newWorktreeParentDir: string | null;
  theme: Theme;
  layout: 'table' | 'card';
  cardColumns: number;
  cardRows: number;
  ignoredBranches: string[];
}

export interface RepoRef {
  name: string;
  path: string;
  remoteUrl: string | null;
  ownerRepo: string | null;
}

export interface SessionLink {
  sessionId: string;
  jsonlPath: string;
  launchDir: string;
  lastActivity: string;
  title: string | null;
  matchCount: number;
  isPrimary: boolean;
}

export interface PrInfo {
  number: number;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  checksState: 'PASSING' | 'FAILING' | 'PENDING' | 'NONE';
  checksDetail: string[];
  baseRefName: string;
  title: string;
}

export interface WorktreeRow {
  id: string;
  repo: RepoRef;
  path: string;
  branch: string | null;
  isMainWorktree: boolean;
  headSha: string;
  isDetached: boolean;
  isBare: boolean;
  isLocked: boolean;
  lockedReason: string | null;
  isPrunable: boolean;
  prunableReason: string | null;
  isDirty: boolean;
  ahead: number;
  behind: number;
  upstream: string | null;
  upstreamGone: boolean;
  lastCommitDate: string;
  lastCommitSubject: string;
  sessions: SessionLink[];
  pr: PrInfo | null;
}

export interface Commit {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  subject: string;
}

export interface OpResult {
  success: boolean;
  message: string;
  stderr?: string;
}

export interface GhStatus {
  installed: boolean;
  authed: boolean;
}
