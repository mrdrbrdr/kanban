# Kanban (project-level notes)

## Repository is public

This directory is tracked by the public GitHub repo at <https://github.com/mrdrbrdr/kanban>. Anything committed and pushed becomes publicly visible.

- **Default branch:** `main`
- **Workflow:** edit code → commit → `git push` (goes straight to the public repo)
- **No private branches or private history** — keep it that way.

## What lives here but is NOT committed

The `.gitignore` excludes everything personal:

- `kanban.db`, `kanban.db-wal`, `kanban.db-shm`, `*.bak` — the live SQLite database. This is your kanban data (boards, cards, nodes, deps). Never `git add` it.
- `docs/` — per-card working notes written via the `/api/cards/:id/doc` endpoint or directly at `~/sw/utilities/kanban/docs/<card-id>.md`. Treat these as private journal entries that happen to live next to the code.
- `node_modules/`, `dist/`, `.vite/`, `.env`, `.playwright-mcp/` — standard ignores.

**Rule of thumb before any commit:** run `git status` and confirm only code / README / screenshot / config files are staged. If you see `docs/` or `*.db` staged, stop and check `.gitignore`.

## Operating the app

API reference and curl recipes: @~/.claude/docs/kanban-api.md

- API: <http://localhost:3001>
- UI: <http://localhost:5174>
- Service: `systemctl --user status kanban.service`

## When writing public-facing code

Because this repo is public, avoid:

- Personal names, project names, or internal URLs in code comments, commit messages, or README/docs content that gets committed.
- Hardcoded absolute paths like `/home/mrdrbrdr/...`.
- Card IDs or board IDs that point to personal work (those IDs are fine as demo/test values, just don't leak context about what's on your real board).
