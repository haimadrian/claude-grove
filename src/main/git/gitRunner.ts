import { execFile } from 'node:child_process';

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

export const git: Runner = make('git');
