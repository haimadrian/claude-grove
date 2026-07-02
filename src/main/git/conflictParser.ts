export interface ConflictContextSegment { type: 'context'; lines: string[]; }
export interface ConflictBlockSegment { type: 'conflict'; ours: string[]; base: string[]; theirs: string[]; }
export type ConflictSegment = ConflictContextSegment | ConflictBlockSegment;

export function parseConflictBlocks(content: string): ConflictSegment[] {
  const lines = content.split('\n');
  const segments: ConflictSegment[] = [];
  let context: string[] = [];
  let i = 0;

  const flushContext = (): void => {
    if (context.length > 0) { segments.push({ type: 'context', lines: context }); context = []; }
  };

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith('<<<<<<<')) {
      flushContext();
      i++;
      const ours: string[] = [];
      while (i < lines.length && !lines[i]!.startsWith('|||||||')) { ours.push(lines[i]!); i++; }
      i++; // skip the ||||||| marker line
      const base: string[] = [];
      while (i < lines.length && !lines[i]!.startsWith('=======')) { base.push(lines[i]!); i++; }
      i++; // skip the ======= marker line
      const theirs: string[] = [];
      while (i < lines.length && !lines[i]!.startsWith('>>>>>>>')) { theirs.push(lines[i]!); i++; }
      i++; // skip the >>>>>>> marker line
      segments.push({ type: 'conflict', ours, base, theirs });
      continue;
    }
    context.push(line);
    i++;
  }
  flushContext();
  return segments;
}
