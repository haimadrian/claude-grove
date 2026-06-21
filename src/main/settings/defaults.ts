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
  layout: 'table',
  cardColumns: 3,
  cardRows: 3,
  ignoredBranches: [],
};
