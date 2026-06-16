import fs from 'node:fs/promises';
import path from 'node:path';
import { parseSessionContent, type ParsedSession } from './parseSession';

interface CacheEntry { result: ParsedSession; mtimeMs: number; size: number; }
const cache = new Map<string, CacheEntry>();

export async function scanSessions(claudeProjectsDir: string, worktreePaths: string[]): Promise<ParsedSession[]> {
  const results: ParsedSession[] = [];
  let topEntries: import('node:fs').Dirent[];
  try {
    topEntries = await fs.readdir(claudeProjectsDir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const top of topEntries) {
    if (!top.isDirectory()) continue;
    const subDir = path.join(claudeProjectsDir, top.name);
    let files: import('node:fs').Dirent[];
    try {
      files = await fs.readdir(subDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const fullPath = path.join(subDir, f.name);
      const sessionId = f.name.slice(0, -6);
      try {
        const stat = await fs.stat(fullPath);
        const key = fullPath;
        const cached = cache.get(key);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
          results.push({ ...cached.result, jsonlPath: fullPath } as ParsedSession & { jsonlPath: string });
          continue;
        }
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsed = parseSessionContent(content, sessionId, worktreePaths);
        cache.set(key, { result: parsed, mtimeMs: stat.mtimeMs, size: stat.size });
        results.push({ ...parsed, jsonlPath: fullPath } as ParsedSession & { jsonlPath: string });
      } catch {
        continue;
      }
    }
  }
  return results;
}
