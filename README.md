# Claude Grove

A macOS desktop app to view and manage local git worktrees across multiple repos - with PR status, Claude Code session linkage, and an in-app GitHub-style diff viewer.

## Requirements

- macOS (AppleScript terminal integration)
- Node.js 18+, pnpm
- `gh` CLI for PR status (optional): `brew install gh && gh auth login`

## Development

```bash
pnpm install
pnpm dev        # hot-reload dev mode
pnpm typecheck  # TypeScript check
pnpm test       # vitest unit tests
pnpm package    # build .dmg -> release/
```

## First run

On first launch, add a root folder (e.g. `~/Documents/GIT`) to scan for git repos. Claude Grove discovers all git repos and worktrees under the configured roots.

## Local co-author hook

Commits in this repo auto-append a co-author trailer via a local `prepare-commit-msg` hook. Re-create it on fresh clones:

```bash
cat > .git/hooks/prepare-commit-msg << 'EOF'
#!/bin/sh
echo "\nCo-Authored-By: Haim Adrian <haim@honeybook.com>" >> "$1"
EOF
chmod +x .git/hooks/prepare-commit-msg
```
