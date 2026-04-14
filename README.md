# Kanban

A personal kanban board that breaks each card into a **dependency graph of subtask nodes**. Nodes auto-lock when their dependencies aren't done and auto-unlock as work flows through the graph — so at a glance you can see what's ready to pick up next.

Built to be controllable from the command line via a simple REST API — the idea is that you (or an LLM agent you're collaborating with) can drive the board programmatically as work progresses.

## Screenshots

### Board view — cards grouped by column

![Board view](screenshots/01-board-view.png)

Cards can be starred to mark them as priority — starred cards float to the top of their column and get a faint gold border + glow.

### Card view — list (left), dependency graph (right), node detail (far right)

![List view](screenshots/02-card-list-view.png)

The list groups nodes by status with dependencies inline. On wide screens (≥1280px) the dependency graph is rendered in the same view, occupying the right two-thirds. Selecting a node opens its detail panel on the far right; selection is synced between the list and the graph.

### Dependency graph close-up

![Canvas view](screenshots/03-canvas-view.png)

Node colors: green = done, orange = in progress, grey = locked (waiting on dependencies). Arrows show what blocks what. Layout is computed by ELK (layered algorithm) and re-runs when nodes/edges change.

## Stack

- **Client:** React + TypeScript + Vite + React Flow (for the canvas)
- **Server:** Node + Express + better-sqlite3
- **Shared:** TypeScript types shared across client/server
- Monorepo via npm workspaces

## Run it

```bash
npm install
npm run dev
```

- UI: <http://localhost:5174>
- API: <http://localhost:3001>

A SQLite file (`kanban.db`) is created on first run in the repo root. It's gitignored — your data stays local. Per-card working notes can be written to `docs/<card-id>.md` (also gitignored) via the card docs API or by hand.

## REST API

All create endpoints expect a client-generated 4-char alphanumeric `id`.

### Boards

- `GET /api/boards` — list boards
- `POST /api/boards` — create `{ id, name }`
- `PATCH /api/boards/:id` — rename
- `DELETE /api/boards/:id` — cascades to cards and nodes

### Cards

Columns: `backlog`, `todo`, `active`, `done`.

Cards have a `priority` flag (`0` or `1`). Priority cards sort to the top of their column in the UI.

- `GET /api/boards/:boardId/cards`
- `POST /api/boards/:boardId/cards` — `{ id, title, column? }`
- `PATCH /api/cards/:id` — move column, rename, toggle priority, etc.
- `DELETE /api/cards/:id`

### Nodes

Statuses: `locked`, `unlocked`, `in_progress`, `done`. Locked/unlocked is computed from dependencies. You set `in_progress` and `done` manually.

- `GET /api/cards/:cardId/nodes`
- `POST /api/cards/:cardId/nodes` — `{ id, title, description? }`
- `PATCH /api/nodes/:id` — title, description, notes, deadline, status
- `DELETE /api/nodes/:id`
- `GET /api/nodes/:id/context` — node + card + board + siblings + deps + doc, all in one call

### Dependencies

- `POST /api/nodes/:id/dependencies` — `{ id, dependsOnId }`
- `DELETE /api/nodes/:id/dependencies/:depId`

### Card docs

Each card has a markdown file at `docs/<card-id>.md` — meant for working notes, decisions, session logs.

- `GET /api/cards/:id/doc`
- `PUT /api/cards/:id/doc` — `{ content }`

## License

MIT
