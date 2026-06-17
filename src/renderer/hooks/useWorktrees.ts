import { useState, useEffect, useCallback } from 'react';
import type { WorktreeRow } from '../../shared/types';

export function useWorktrees(): {
  worktrees: WorktreeRow[];
  loading: boolean;
  refresh: () => void;
} {
  const [worktrees, setWorktrees] = useState<WorktreeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await window.api.worktrees.list();
      setWorktrees(rows);
      // lazily fetch PR for each row that has ownerRepo + branch
      rows.forEach((row) => {
        if (row.repo.ownerRepo && row.branch) {
          window.api.pr.get(row.repo.ownerRepo, row.branch).then((pr) => {
            setWorktrees((prev) =>
              prev.map((r) => (r.id === row.id ? { ...r, pr } : r))
            );
          });
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { worktrees, loading, refresh };
}
