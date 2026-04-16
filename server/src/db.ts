import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'kanban.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    "column" TEXT NOT NULL DEFAULT 'backlog'
      CHECK ("column" IN ('backlog', 'todo', 'active', 'done')),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'unlocked'
      CHECK (status IN ('locked', 'unlocked', 'in_progress', 'done')),
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS node_dependencies (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    depends_on_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    UNIQUE(node_id, depends_on_id),
    CHECK(node_id != depends_on_id)
  );

  CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id);
  CREATE INDEX IF NOT EXISTS idx_nodes_card ON nodes(card_id);
  CREATE INDEX IF NOT EXISTS idx_deps_node ON node_dependencies(node_id);
  CREATE INDEX IF NOT EXISTS idx_deps_depends_on ON node_dependencies(depends_on_id);
`);

// Run migrations in sequential order — always check version fresh before each step
// Migration 1: add 'todo' column between backlog and active
if ((db.pragma('user_version', { simple: true }) as number) < 1) {
  db.transaction(() => {
    db.prepare(`
      CREATE TABLE cards_new (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        "column" TEXT NOT NULL DEFAULT 'backlog'
          CHECK ("column" IN ('backlog', 'todo', 'active', 'done')),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    db.prepare(`INSERT INTO cards_new SELECT * FROM cards`).run();
    db.prepare(`DROP TABLE cards`).run();
    db.prepare(`ALTER TABLE cards_new RENAME TO cards`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id)`).run();
    db.pragma('user_version = 1');
  })();
}

// Migration 2: add priority flag to cards
if ((db.pragma('user_version', { simple: true }) as number) < 2) {
  db.prepare(`ALTER TABLE cards ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`).run();
  db.pragma('user_version = 2');
}

// Migration 3: track assignee on nodes (Ozan or a specific Claude session)
if ((db.pragma('user_version', { simple: true }) as number) < 3) {
  db.transaction(() => {
    db.prepare(`ALTER TABLE nodes ADD COLUMN assignee TEXT`).run();
    db.prepare(`ALTER TABLE nodes ADD COLUMN assignee_session_id TEXT`).run();
    db.prepare(`ALTER TABLE nodes ADD COLUMN assignee_cwd TEXT`).run();
    db.pragma('user_version = 3');
  })();
}

export default db;
