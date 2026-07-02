// Prefix must start with a letter (Jira project keys always do) but may contain digits after
// that (e.g. 't2a' — a real project key in this codebase) — a letters-only prefix would fail
// to match 't2a-3131' entirely, since '2' breaks the run of letters.
const JIRA_ID_PATTERN = /[A-Za-z][A-Za-z0-9]{1,9}-\d+/;

export function extractJiraId(branch: string | null): string | null {
  if (!branch) return null;
  const match = branch.match(JIRA_ID_PATTERN);
  return match ? match[0].toUpperCase() : null;
}
