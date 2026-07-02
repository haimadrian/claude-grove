import os from 'node:os';
import { execFileSync } from 'node:child_process';

function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function getUserFirstName(): string {
  if (process.platform === 'darwin') {
    try {
      const fullName = execFileSync('id', ['-F']).toString().trim();
      const firstName = fullName.split(' ')[0];
      if (firstName) return firstName;
    } catch {
      // fall through to username fallback
    }
  }
  return capitalize(os.userInfo().username);
}
