import { diffLines } from 'diff';
import type { DiffLineOp } from '../../shared/types';

export function computeSideDiff(base: string[], side: string[]): DiffLineOp[] {
  // Trailing '\n' on both sides is required: without it, diffLines tokenizes the last line
  // differently depending on whether it's followed by a newline elsewhere in the same text,
  // which misclassifies a shared boundary line as a remove+re-add instead of context.
  const changes = diffLines(base.join('\n') + '\n', side.join('\n') + '\n');
  const ops: DiffLineOp[] = [];
  for (const change of changes) {
    const value = change.value.endsWith('\n') ? change.value.slice(0, -1) : change.value;
    if (value.length === 0) continue;
    const type: DiffLineOp['type'] = change.added ? 'add' : change.removed ? 'del' : 'context';
    for (const text of value.split('\n')) ops.push({ type, text });
  }
  return ops;
}
