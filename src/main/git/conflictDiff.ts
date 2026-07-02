import { diffArrays } from 'diff';
import type { DiffLineOp } from '../../shared/types';

export function computeSideDiff(base: string[], side: string[]): DiffLineOp[] {
  const changes = diffArrays(base, side);
  const ops: DiffLineOp[] = [];
  for (const change of changes) {
    const type: DiffLineOp['type'] = change.added ? 'add' : change.removed ? 'del' : 'context';
    for (const text of change.value) ops.push({ type, text });
  }
  return ops;
}
