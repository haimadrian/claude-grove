import type { PrInfo } from '../../shared/types';
import type { Runner } from './ghRunner';
import { gh, ghStatus } from './ghRunner';
import { mapChecksState } from './mapChecks';

interface CacheEntry { value: PrInfo | null; expiresAt: number; }
const cache = new Map<string, CacheEntry>();

export async function getPr(
  ownerRepo: string | null,
  branch: string | null,
  ttlSeconds: number,
  runner: Runner = gh
): Promise<PrInfo | null> {
  if (!ownerRepo || !branch) return null;

  const status = await ghStatus();
  if (!status.installed || !status.authed) return null;

  const key = `${ownerRepo}#${branch}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const result = await runner.run([
    'pr', 'list',
    '--repo', ownerRepo,
    '--head', branch,
    '--state', 'all',
    '--json', 'number,url,state,isDraft,reviewDecision,statusCheckRollup,baseRefName,title',
  ]);

  if (result.code !== 0) {
    cache.set(key, { value: null, expiresAt: now + ttlSeconds * 1000 });
    return null;
  }

  let prs: unknown[];
  try {
    prs = JSON.parse(result.stdout) as unknown[];
  } catch {
    return null;
  }

  if (!Array.isArray(prs) || prs.length === 0) {
    cache.set(key, { value: null, expiresAt: now + ttlSeconds * 1000 });
    return null;
  }

  const first: unknown = prs[0];
  if (first == null || typeof first !== 'object') {
    cache.set(key, { value: null, expiresAt: now + ttlSeconds * 1000 });
    return null;
  }
  const raw = first as Record<string, unknown>;

  const reviewDecisionRaw = typeof raw['reviewDecision'] === 'string' ? raw['reviewDecision'] : '';
  const reviewDecision: PrInfo['reviewDecision'] =
    reviewDecisionRaw === 'APPROVED' ? 'APPROVED'
    : reviewDecisionRaw === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED'
    : reviewDecisionRaw === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED'
    : null;

  const prInfo: PrInfo = {
    number: raw['number'] as number,
    url: raw['url'] as string,
    state: raw['state'] as PrInfo['state'],
    isDraft: raw['isDraft'] as boolean,
    reviewDecision,
    checksState: mapChecksState((raw['statusCheckRollup'] as { status?: string; conclusion?: string; state?: string }[]) ?? []),
    baseRefName: raw['baseRefName'] as string,
    title: raw['title'] as string,
  };

  cache.set(key, { value: prInfo, expiresAt: now + ttlSeconds * 1000 });
  return prInfo;
}
