import type { Commit } from '../../shared/types';
const US = '\x1f';

export function parseCommits(stdout: string): Commit[] {
  return stdout
    .split('\n')
    .filter((l) => l.length > 0)
    .map((line) => {
      const [sha, shortSha, author, date, ...rest] = line.split(US);
      return {
        sha: sha ?? '',
        shortSha: shortSha ?? '',
        author: author ?? '',
        date: date ?? '',
        subject: rest.join(US),
      };
    });
}
