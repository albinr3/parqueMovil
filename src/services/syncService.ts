import axios from "axios";
import NetInfo from "@react-native-community/netinfo";
import { API_BASE_URL, SYNC_INTERVAL_MS } from "../config/constants";
import { getDb } from "../database/db";

let syncInterval: ReturnType<typeof setInterval> | null = null;

export const syncNow = async () => {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return { processed: 0, skipped: true };
  }

  const db = await getDb();

  const pending = await db.getAllAsync<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: string;
    attempts: number;
  }>(
    `SELECT
      id,
      entity_type as entityType,
      entity_id as entityId,
      action,
      payload,
      attempts
     FROM sync_queue
     WHERE processed = 0
     ORDER BY created_at ASC
     LIMIT 100`
  );

  if (!pending.length) {
    return { processed: 0, skipped: false };
  }

  try {
    await axios.post(`${API_BASE_URL}/api/sync`, {
      events: pending.map((row) => ({
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        payload: JSON.parse(row.payload),
      })),
    });

    for (const row of pending) {
      await db.runAsync(
        "UPDATE sync_queue SET processed = 1, last_error = NULL WHERE id = ?",
        [row.id]
      );
    }

    return { processed: pending.length, skipped: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error de sincronizacion";

    for (const row of pending) {
      await db.runAsync(
        "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
        [reason, row.id]
      );
    }

    return { processed: 0, skipped: false, error: reason };
  }
};

export const startSyncLoop = () => {
  if (syncInterval) return;

  syncInterval = setInterval(() => {
    syncNow().catch(() => {
      // La app no debe romperse por fallas de red/transitorias de API.
    });
  }, SYNC_INTERVAL_MS);
};

export const stopSyncLoop = () => {
  if (!syncInterval) return;

  clearInterval(syncInterval);
  syncInterval = null;
};
