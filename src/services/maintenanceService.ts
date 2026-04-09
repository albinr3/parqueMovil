import { getDb } from "../database/db";

export const resetLocalDatabase = async () => {
  const db = await getDb();

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await db.runAsync("DELETE FROM sync_queue");
    await db.runAsync("DELETE FROM tickets");
    await db.runAsync("DELETE FROM shift_closures");
    await db.runAsync("DELETE FROM users");
    await db.runAsync("DELETE FROM app_meta");

    await db.runAsync(
      "INSERT INTO app_meta(key, value) VALUES (?, ?)",
      ["last_ticket_number", "0"]
    );

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
};

