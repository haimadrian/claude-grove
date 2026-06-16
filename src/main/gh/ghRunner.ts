import { execFile } from 'node:child_process';
import type { GhStatus } from '../../shared/types';

export interface RunResult { code: number; stdout: string; stderr: string; }
export interface Runner { run(args: string[], opts?: { cwd?: string }): Promise<RunResult>; }

function make(bin: string): Runner {
  return {
    run: (args, opts) => new Promise((resolve) => {
      execFile(bin, args, { cwd: opts?.cwd, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
        const code = (err as { code?: number | string } | null)?.code;
        resolve({ code: typeof code === 'number' ? code : err ? 1 : 0, stdout: stdout ?? '', stderr: stderr ?? '' });
      });
    }),
  };
}

export const gh: Runner = make('gh');

let cached: GhStatus | null = null;

export async function ghStatus(force = false): Promise<GhStatus> {
  if (cached && !force) return cached;
  const v = await gh.run(['--version']);
  const a = v.code === 0 ? await gh.run(['auth', 'status']) : { code: 1, stdout: '', stderr: '' };
  cached = { installed: v.code === 0, authed: a.code === 0 };
  return cached;
}
