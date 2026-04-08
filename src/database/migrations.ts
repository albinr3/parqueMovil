import { SCHEMA_SQL } from "./schema";
import { getDb } from "./db";
import { hashPin } from "../services/authService";

const DEFAULT_EMPLOYEES = [
  { id: "emp-juan", name: "Juan", pin: "1234", role: "EMPLOYEE" },
  { id: "emp-pedro", name: "Pedro", pin: "4321", role: "EMPLOYEE" },
];

const ensureTicketAmountColumns = async () => {
  const db = await getDb();
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(tickets)"
  );
  const names = new Set(columns.map((column) => column.name));

  if (!names.has("entry_amount_charged")) {
    await db.runAsync(
      "ALTER TABLE tickets ADD COLUMN entry_amount_charged INTEGER NOT NULL DEFAULT 0"
    );
  }

  if (!names.has("lost_extra_charged")) {
    await db.runAsync(
      "ALTER TABLE tickets ADD COLUMN lost_extra_charged INTEGER NOT NULL DEFAULT 0"
    );
  }

  await db.runAsync(
    `UPDATE tickets
     SET entry_amount_charged = COALESCE(entry_amount_charged, 0),
         lost_extra_charged = COALESCE(lost_extra_charged, 0)
     WHERE entry_amount_charged IS NULL OR lost_extra_charged IS NULL`
  );
};

export const runMigrations = async () => {
  const db = await getDb();

  for (const stmt of SCHEMA_SQL) {
    await db.execAsync(stmt);
  }

  await ensureTicketAmountColumns();

  const metaRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    ["last_ticket_number"]
  );

  if (!metaRow) {
    await db.runAsync(
      "INSERT INTO app_meta(key, value) VALUES (?, ?)",
      ["last_ticket_number", "0"]
    );
  }

  for (const employee of DEFAULT_EMPLOYEES) {
    const exists = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM users WHERE id = ?",
      [employee.id]
    );

    if (!exists) {
      await db.runAsync(
        "INSERT INTO users(id, name, pin_hash, role, active) VALUES (?, ?, ?, ?, 1)",
        [employee.id, employee.name, hashPin(employee.pin), employee.role]
      );
    }
  }
};
