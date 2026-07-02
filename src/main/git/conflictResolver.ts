import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConflictFileSegment } from '../../shared/types';
import { parseConflictBlocks } from './conflictParser';
import { computeSideDiff } from './conflictDiff';
import { isPathWithinRoots } from '../security/validate';

export async function getConflictBlocks(worktreePath: string, filePath: string): Promise<ConflictFileSegment[]> {
  const abs = path.join(worktreePath, filePath);
  if (!isPathWithinRoots(abs, [worktreePath])) return [];
  const content = await fs.readFile(abs, 'utf-8');
  const segments = parseConflictBlocks(content);
  let conflictId = 0;
  return segments.map((seg) => {
    if (seg.type === 'context') return { type: 'context' as const, lines: seg.lines };
    const id = conflictId++;
    return {
      type: 'conflict' as const,
      id,
      ours: computeSideDiff(seg.base, seg.ours),
      theirs: computeSideDiff(seg.base, seg.theirs),
      oursText: seg.ours.join('\n'),
      theirsText: seg.theirs.join('\n'),
    };
  });
}
