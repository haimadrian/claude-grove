import type { PrInfo } from '../../shared/types';
import type { Runner } from './gitRunner';
import { git } from './gitRunner';

interface BaseBranchOpts {
  pr: PrInfo | null;
  defaultBaseBranch: string;
  runner?: Runner;
}

export async function resolveBaseBranch(worktreePath: string, opts: BaseBranchOpts): Promise<string> {
  const runner = opts.runner ?? git;

  // 1. PR base
  if (opts.pr) return opts.pr.baseRefName;

  // 2. origin/HEAD symbolic ref
  const symRef = await runner.run(['-C', worktreePath, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (symRef.code === 0) {
    const name = symRef.stdout.trim().replace(/^origin\//, '');
    if (name) return await preferOrigin(worktreePath, name, runner);
  }

  // 3. defaultBaseBranch + fallback to main/master
  for (const candidate of [opts.defaultBaseBranch, 'main', 'master']) {
    if (!candidate) continue;
    const verify = await runner.run(['-C', worktreePath, 'rev-parse', '--verify', '--quiet', candidate]);
    if (verify.code === 0) return await preferOrigin(worktreePath, candidate, runner);
  }

  return opts.defaultBaseBranch;
}

async function preferOrigin(worktreePath: string, base: string, runner: Runner): Promise<string> {
  const remote = `origin/${base}`;
  const verify = await runner.run(['-C', worktreePath, 'rev-parse', '--verify', '--quiet', remote]);
  return verify.code === 0 ? remote : base;
}
