import type { Runner } from './gitRunner';
import { git } from './gitRunner';

export function parseBranchList(raw: string): string[] {
  const names = raw
    .split('\n')
    .map((line) => line.replace(/^[*+]?\s*/, '').trim())
    .filter((line) => line.length > 0 && !line.includes(' -> ')) // drop "origin/HEAD -> origin/main" pointer line
    .map((line) => line.replace(/^remotes\//, ''));
  return [...new Set(names)].sort();
}

export async function listBranches(worktreePath: string, runner: Runner = git): Promise<string[]> {
  const result = await runner.run(['-C', worktreePath, 'branch', '-a']);
  if (result.code !== 0) return [];
  return parseBranchList(result.stdout);
}
