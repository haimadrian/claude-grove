export interface NormalizedRemote { browseUrl: string | null; ownerRepo: string | null; }

export function normalizeRemote(raw: string): NormalizedRemote {
  const s = (raw || '').trim();
  if (!s) return { browseUrl: null, ownerRepo: null };

  let host = '', path = '';
  const scp = s.match(/^[^@]+@([^:]+):(.+)$/);
  const url = s.match(/^[a-z]+:\/\/(?:[^@/]+@)?([^/]+)\/(.+)$/i);
  if (scp) { host = scp[1]!; path = scp[2]!; }
  else if (url) { host = url[1]!; path = url[2]!; }
  else return { browseUrl: null, ownerRepo: null };

  path = path.replace(/\.git$/, '').replace(/^\/+/, '');
  const browseUrl = `https://${host}/${path}`;
  const ownerRepo = host === 'github.com' ? path : null;
  return { browseUrl, ownerRepo };
}
