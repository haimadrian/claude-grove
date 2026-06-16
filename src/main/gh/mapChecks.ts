import type { PrInfo } from '../../shared/types';

interface RollupItem { status?: string | null; conclusion?: string | null; state?: string | null; }
const FAIL = new Set(['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED']);

export function mapChecksState(rollup: RollupItem[]): PrInfo['checksState'] {
  if (!rollup || rollup.length === 0) return 'NONE';
  const isFail = (c: RollupItem): boolean =>
    (c.conclusion != null && FAIL.has(c.conclusion)) || c.state === 'FAILURE';
  const isPending = (c: RollupItem): boolean =>
    (c.status != null && c.status !== 'COMPLETED') ||
    (c.state != null && !['SUCCESS', 'FAILURE', 'ERROR'].includes(c.state));
  if (rollup.some(isFail)) return 'FAILING';
  if (rollup.some(isPending)) return 'PENDING';
  return 'PASSING';
}
