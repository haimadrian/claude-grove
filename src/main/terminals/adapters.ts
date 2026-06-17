import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { clipboard, Notification } from 'electron';
import type { TerminalKind, OpResult } from '../../shared/types';

export function available(): TerminalKind[] {
  const kinds: TerminalKind[] = ['Terminal'];
  if (fs.existsSync('/Applications/iTerm.app')) kinds.push('iTerm2');
  if (fs.existsSync('/Applications/Warp.app')) kinds.push('Warp');
  return kinds;
}

function escapeForAppleScript(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeSingleQuotedPath(p: string): string {
  // Shell single-quote escape: replace ' with '\''
  return "'" + p.replace(/'/g, "'\\''") + "'";
}

function runAppleScript(script: string): Promise<OpResult> {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], (err) => {
      if (err) resolve({ success: false, message: err.message, stderr: err.message });
      else resolve({ success: true, message: 'Opened terminal' });
    });
  });
}

function buildResumeCmd(launchDir: string, sessionId: string): string {
  return `cd ${escapeSingleQuotedPath(launchDir)} && claude --resume ${sessionId}`;
}

function buildOpenDirCmd(dir: string): string {
  return `cd ${escapeSingleQuotedPath(dir)}`;
}

async function runInTerminalApp(cmd: string): Promise<OpResult> {
  const escaped = escapeForAppleScript(cmd);
  const script = `tell application "Terminal"
  activate
  do script "${escaped}"
end tell`;
  return runAppleScript(script);
}

async function runInITerm2(cmd: string): Promise<OpResult> {
  const escaped = escapeForAppleScript(cmd);
  const script = `tell application "iTerm"
  activate
  set w to (create window with default profile)
  tell current session of w to write text "${escaped}"
end tell`;
  return runAppleScript(script);
}

async function runInWarp(dir: string, cmd?: string): Promise<OpResult> {
  await new Promise<void>((resolve, reject) => {
    execFile('open', ['-a', 'Warp', dir], (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    // Non-fatal: Warp may not be installed at /Applications/Warp.app anymore
  });
  if (cmd) {
    clipboard.writeText(cmd);
    new Notification({
      title: 'Claude Grove',
      body: `Command copied to clipboard — paste in Warp:\n${cmd}`,
    }).show();
    return { success: true, message: `Command copied to clipboard — paste in Warp.` };
  }
  return { success: true, message: `Warp opened at ${dir}` };
}

export async function resumeSession(
  terminal: TerminalKind,
  launchDir: string,
  sessionId: string
): Promise<OpResult> {
  const cmd = buildResumeCmd(launchDir, sessionId);
  if (terminal === 'Terminal') return runInTerminalApp(cmd);
  if (terminal === 'iTerm2') return runInITerm2(cmd);
  if (terminal === 'Warp') return runInWarp(launchDir, `claude --resume ${sessionId}`);
  return { success: false, message: `Unknown terminal: ${terminal as string}` };
}

export async function openDir(
  terminal: TerminalKind,
  dir: string
): Promise<OpResult> {
  const cmd = buildOpenDirCmd(dir);
  if (terminal === 'Terminal') return runInTerminalApp(cmd);
  if (terminal === 'iTerm2') return runInITerm2(cmd);
  if (terminal === 'Warp') return runInWarp(dir);
  return { success: false, message: `Unknown terminal: ${terminal as string}` };
}
