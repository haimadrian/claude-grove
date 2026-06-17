# Claude Grove

A macOS desktop app to view and manage local git worktrees across multiple repos - with PR status, Claude Code session linkage, and an in-app GitHub-style diff viewer.

## Requirements

- macOS (AppleScript terminal integration)
- Node.js 18+, pnpm
- `gh` CLI for PR status (optional): `brew install gh && gh auth login`

## Development

```bash
pnpm install
```

```bash
pnpm dev        # hot-reload dev mode
```

```bash
pnpm typecheck  # TypeScript check
```

```bash
pnpm test       # vitest unit tests
```

```bash
pnpm package    # build .dmg -> release/
```

## First run

On first launch, add a root folder (e.g. `~/Documents/GIT`) to scan for git repos. Claude Grove discovers all git repos and worktrees under the configured roots.
