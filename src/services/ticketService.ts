import { getDb } from "../database/db";
import { DEFAULT_RATES } from "../config/constants";
import { Ticket, TicketStatus } from "../types";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const queueSync = async (entityType: "ticket" | "closure", entityId: string, action: "create" | "update", payload: unknown) => {
  const db = await getDb();
  const queueId = createId();

  await db.runAsync(
    "INSERT INTO sync_queue(id, entity_type, entity_id, action, payload, processed) VALUES (?, ?, ?, ?, ?, 0)",
    [queueId, entityType, entityId, action, JSON.stringify(payload)]
  );

  console.log("[SYNC][QUEUE] enqueued", { queueId, entityType, entityId, action });
};

export const getNextTicketNumber = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    ["last_ticket_number"]
  );

  const next = Number(row?.value ?? "0") + 1;

  await db.runAsync("UPDATE app_meta SET value = ? WHERE key = ?", [String(next), "last_ticket_number"]);

  return next;
};

export const createTicket = async (userId: string, plate?: string) => {
  const db = await getDb();
  const ticketNumber = await getNextTicketNumber();
  const id = createId();
  const entryTime = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO tickets(
      id, ticket_number, plate, status, entry_time, is_lost_ticket, user_id, local_id
    ) VALUES (?, ?, ?, 'ACTIVE', ?, 0, ?, ?)`,
    [id, ticketNumber, plate?.trim() || null, entryTime, userId, id]
  );

  const ticket = {
    id,
    ticketNumber,
    plate: plate?.trim() || null,
    status: "ACTIVE" as TicketStatus,
    entryTime,
    exitTime: null,
    amountCharged: null,
    isLostTicket: 0,
    userId,
    closureId: null,
    localId: id,
    syncedAt: null,
  };

  await queueSync("ticket", id, "create", ticket);
  console.log("[SYNC][TICKET] created_and_queued", {
    ticketId: id,
    ticketNumber,
    plate: ticket.plate,
  });

  return ticket;
};

export const getActiveTicketByNumber = async (ticketNumber: number): Promise<Ticket | null> => {
  const db = await getDb();

  const row = await db.getFirstAsync<Ticket>(
    `SELECT
      id,
      ticket_number as ticketNumber,
      plate,
      status,
      entry_time as entryTime,
      exit_time as exitTime,
      amount_charged as amountCharged,
      is_lost_ticket as isLostTicket,
      user_id as userId,
      closure_id as closureId,
      local_id as localId,
      synced_at as syncedAt
     FROM tickets
     WHERE ticket_number = ? AND status = 'ACTIVE'`,
    [ticketNumber]
  );

  return row ?? null;
};

export const chargeTicket = async (ticketId: string, isLostTicket: boolean) => {
  const db = await getDb();
  const amount = isLostTicket ? DEFAULT_RATES.lost : DEFAULT_RATES.normal;
  const status: TicketStatus = isLostTicket ? "LOST_PAID" : "PAID";
  const exitTime = new Date().toISOString();

  await db.runAsync(
    "UPDATE tickets SET status = ?, amount_charged = ?, is_lost_ticket = ?, exit_time = ?, updated_at = datetime('now') WHERE id = ?",
    [status, amount, isLostTicket ? 1 : 0, exitTime, ticketId]
  );

  const updated = await db.getFirstAsync<Ticket>(
    `SELECT
      id,
      ticket_number as ticketNumber,
      plate,
      status,
      entry_time as entryTime,
      exit_time as exitTime,
      amount_charged as amountCharged,
      is_lost_ticket as isLostTicket,
      user_id as userId,
      closure_id as closureId,
      local_id as localId,
      synced_at as syncedAt
     FROM tickets WHERE id = ?`,
    [ticketId]
  );

  if (updated) {
    await queueSync("ticket", ticketId, "update", updated);
    console.log("[SYNC][TICKET] updated_and_queued", {
      ticketId,
      status: updated.status,
      amountCharged: updated.amountCharged,
    });
  }

  return updated;
};

export const listTicketsByCurrentShift = async () => {
  const db = await getDb();

  return db.getAllAsync<Ticket>(
    `SELECT
      id,
      ticket_number as ticketNumber,
      plate,
      status,
      entry_time as entryTime,
      exit_time as exitTime,
      amount_charged as amountCharged,
      is_lost_ticket as isLostTicket,
      user_id as userId,
      closure_id as closureId,
      local_id as localId,
      synced_at as syncedAt
     FROM tickets
     WHERE date(entry_time) = date('now')
     ORDER BY entry_time DESC`
  );
};

export const countActiveTickets = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) as total FROM tickets WHERE status = 'ACTIVE'"
  );

  return row?.total ?? 0;
};
