export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY NOT NULL,
    ticket_number INTEGER NOT NULL UNIQUE,
    plate TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    amount_charged INTEGER,
    entry_amount_charged INTEGER NOT NULL DEFAULT 0,
    lost_extra_charged INTEGER NOT NULL DEFAULT 0,
    is_lost_ticket INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    closure_id TEXT,
    local_id TEXT UNIQUE,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS shift_closures (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    shift_label TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    total_tickets INTEGER NOT NULL,
    normal_tickets INTEGER NOT NULL,
    lost_tickets INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    normal_amount INTEGER NOT NULL,
    lost_amount INTEGER NOT NULL,
    notes TEXT,
    local_id TEXT UNIQUE,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_entry_time ON tickets(entry_time);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_processed ON sync_queue(processed);`,
];
