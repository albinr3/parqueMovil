import { SCHEMA_SQL } from "./schema";
import { getDb } from "./db";
import { hashPin } from "../services/authService";

const DEFAULT_EMPLOYEES = [
  { id: "emp-juan", name: "Juan", pin: "1234", role: "EMPLOYEE" },
  { id: "emp-pedro", name: "Pedro", pin: "4321", role: "EMPLOYEE" },
];

export const runMigrations = async () => {
  const db = await getDb();

  for (const stmt of SCHEMA_SQL) {
    await db.execAsync(stmt);
  }

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
