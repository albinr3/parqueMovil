import { getDb } from "../database/db";
import { Ticket, TicketStatus } from "../types";
import { requestSync } from "./syncService";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const SHIFT_CLOSED_ERROR_CODE = "SHIFT_CLOSED_FOR_TODAY";

export class ShiftClosedForTodayError extends Error {
  code = SHIFT_CLOSED_ERROR_CODE;

  constructor() {
    super(SHIFT_CLOSED_ERROR_CODE);
  }
}

const queueSync = async (
  entityType: "ticket" | "closure",
  entityId: string,
  action: "create" | "update",
  payload: unknown
) => {
  const db = await getDb();
  const queueId = createId();

  await db.runAsync(
    "INSERT INTO sync_queue(id, entity_type, entity_id, action, payload, processed) VALUES (?, ?, ?, ?, ?, 0)",
    [queueId, entityType, entityId, action, JSON.stringify(payload)]
  );

  requestSync(`queue_${entityType}_${action}`);
};

export const getNextTicketNumber = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    ["last_ticket_number"]
  );

  const next = Number(row?.value ?? "0") + 1;

  await db.runAsync("UPDATE app_meta SET value = ? WHERE key = ?", [
    String(next),
    "last_ticket_number",
  ]);

  return next;
};

const mapTicketSelect = `SELECT
    id,
    ticket_number as ticketNumber,
    plate,
    status,
    entry_time as entryTime,
    exit_time as exitTime,
    amount_charged as amountCharged,
    COALESCE(entry_amount_charged, 0) as entryAmountCharged,
    COALESCE(lost_extra_charged, 0) as lostExtraCharged,
    is_lost_ticket as isLostTicket,
    user_id as userId,
    closure_id as closureId,
    local_id as localId,
    synced_at as syncedAt
  FROM tickets`;

const getTicketById = async (ticketId: string) => {
  const db = await getDb();
  return db.getFirstAsync<Ticket>(
    `${mapTicketSelect}
     WHERE id = ?`,
    [ticketId]
  );
};

export const createTicket = async (
  userId: string,
  plate: string,
  normalRate: number
) => {
  const normalizedPlate = plate.trim().toUpperCase();
  if (!normalizedPlate) {
    throw new Error("Plate is required");
  }

  const db = await getDb();
  const closureToday = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM shift_closures
     WHERE date(datetime(end_time, '-4 hours')) = date(datetime('now', '-4 hours'))
       AND user_id = ?`,
    [userId]
  );
  if ((closureToday?.total ?? 0) > 0) {
    throw new ShiftClosedForTodayError();
  }

  const ticketNumber = await getNextTicketNumber();
  const id = createId();
  const entryTime = new Date().toISOString();
  const entryAmountCharged = Number.isFinite(normalRate)
    ? Math.max(0, Math.trunc(normalRate))
    : 0;

  await db.runAsync(
    `INSERT INTO tickets(
      id, ticket_number, plate, status, entry_time, exit_time, amount_charged,
      entry_amount_charged, lost_extra_charged, is_lost_ticket, user_id, local_id
    ) VALUES (?, ?, ?, 'ACTIVE', ?, NULL, ?, ?, 0, 0, ?, ?)`,
    [
      id,
      ticketNumber,
      normalizedPlate,
      entryTime,
      entryAmountCharged,
      entryAmountCharged,
      userId,
      id,
    ]
  );

  const ticket = {
    id,
    ticketNumber,
    plate: normalizedPlate,
    status: "ACTIVE" as TicketStatus,
    entryTime,
    exitTime: null,
    amountCharged: entryAmountCharged,
    entryAmountCharged,
    lostExtraCharged: 0,
    isLostTicket: 0,
    userId,
    closureId: null,
    localId: id,
    syncedAt: null,
  };

  await queueSync("ticket", id, "create", ticket);

  return ticket;
};

export const getActiveTicketByNumber = async (
  ticketNumber: number
): Promise<Ticket | null> => {
  const db = await getDb();

  const row = await db.getFirstAsync<Ticket>(
    `${mapTicketSelect}
     WHERE ticket_number = ? AND status = 'ACTIVE'`,
    [ticketNumber]
  );

  return row ?? null;
};

export const getTicketByNumber = async (
  ticketNumber: number
): Promise<Ticket | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<Ticket>(
    `${mapTicketSelect}
     WHERE ticket_number = ?`,
    [ticketNumber]
  );

  return row ?? null;
};

export const getActiveTicketByPlate = async (
  plate: string
): Promise<Ticket | null> => {
  const normalizedPlate = plate.trim().toUpperCase();
  if (!normalizedPlate) return null;

  const db = await getDb();
  const row = await db.getFirstAsync<Ticket>(
    `${mapTicketSelect}
     WHERE status = 'ACTIVE'
       AND UPPER(COALESCE(plate, '')) = ?
     ORDER BY entry_time DESC
     LIMIT 1`,
    [normalizedPlate]
  );

  return row ?? null;
};

export const registerTicketExit = async (ticketId: string) => {
  const db = await getDb();
  const exitTime = new Date().toISOString();

  await db.runAsync(
    `UPDATE tickets
     SET status = 'PAID',
         is_lost_ticket = 0,
         lost_extra_charged = COALESCE(lost_extra_charged, 0),
         amount_charged = COALESCE(entry_amount_charged, 0) + COALESCE(lost_extra_charged, 0),
         exit_time = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [exitTime, ticketId]
  );

  const updated = await getTicketById(ticketId);

  if (updated) {
    await queueSync("ticket", ticketId, "update", updated);
  }

  return updated;
};

export const registerLostTicketExit = async (
  ticketId: string,
  lostRate: number
) => {
  const db = await getDb();
  const exitTime = new Date().toISOString();
  const normalizedLostRate = Number.isFinite(lostRate)
    ? Math.max(0, Math.trunc(lostRate))
    : 0;

  await db.runAsync(
    `UPDATE tickets
     SET status = 'LOST_PAID',
         is_lost_ticket = 1,
         lost_extra_charged = ?,
         amount_charged = COALESCE(entry_amount_charged, 0) + ?,
         exit_time = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [normalizedLostRate, normalizedLostRate, exitTime, ticketId]
  );

  const updated = await getTicketById(ticketId);

  if (updated) {
    await queueSync("ticket", ticketId, "update", updated);
  }

  return updated;
};

export const listTicketsByCurrentShift = async (userId?: string) => {
  const db = await getDb();

  if (userId?.trim()) {
    return db.getAllAsync<Ticket>(
      `${mapTicketSelect}
       WHERE date(datetime(entry_time, '-4 hours')) = date(datetime('now', '-4 hours'))
         AND user_id = ?
       ORDER BY entry_time DESC`,
      [userId.trim()]
    );
  }

  return db.getAllAsync<Ticket>(
    `${mapTicketSelect}
     WHERE date(datetime(entry_time, '-4 hours')) = date(datetime('now', '-4 hours'))
     ORDER BY entry_time DESC`
  );
};

export const countActiveTickets = async (userId?: string) => {
  const db = await getDb();
  const row = userId?.trim()
    ? await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM tickets
       WHERE status = 'ACTIVE'
         AND date(datetime(entry_time, '-4 hours')) = date(datetime('now', '-4 hours'))
         AND user_id = ?`,
      [userId.trim()]
    )
    : await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM tickets
       WHERE status = 'ACTIVE'
         AND date(datetime(entry_time, '-4 hours')) = date(datetime('now', '-4 hours'))`
    );

  return row?.total ?? 0;
};
