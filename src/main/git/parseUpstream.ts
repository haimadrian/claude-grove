export interface UpstreamInfo { upstream: string | null; ahead: number; behind: number; upstreamGone: boolean; }

export function parseUpstream(line: string): UpstreamInfo {
  const [shortRaw = '', trackRaw = ''] = line.split('\t');
  const upstream = shortRaw.trim() || null;
  const track = trackRaw.trim();
  const ahead = Number(track.match(/ahead (\d+)/)?.[1] ?? 0);
  const behind = Number(track.match(/behind (\d+)/)?.[1] ?? 0);
  return { upstream, ahead, behind, upstreamGone: track.includes('[gone]') };
}
