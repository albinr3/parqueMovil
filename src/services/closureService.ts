import { getDb } from "../database/db";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const queueClosureSync = async (closure: unknown, closureId: string) => {
  const db = await getDb();
  const queueId = createId();

  await db.runAsync(
    "INSERT INTO sync_queue(id, entity_type, entity_id, action, payload, processed) VALUES (?, 'closure', ?, 'create', ?, 0)",
    [queueId, closureId, JSON.stringify(closure)]
  );

  console.log("[SYNC][QUEUE] closure_enqueued", { queueId, closureId, action: "create" });
};

export const getShiftSummary = async () => {
  const db = await getDb();

  const paid = await db.getFirstAsync<{ total: number; amount: number }>(
    "SELECT COUNT(*) as total, COALESCE(SUM(amount_charged), 0) as amount FROM tickets WHERE status = 'PAID' AND date(exit_time) = date('now')"
  );

  const lost = await db.getFirstAsync<{ total: number; amount: number }>(
    "SELECT COUNT(*) as total, COALESCE(SUM(amount_charged), 0) as amount FROM tickets WHERE status = 'LOST_PAID' AND date(exit_time) = date('now')"
  );

  const pending = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) as total FROM tickets WHERE status = 'ACTIVE'"
  );

  const normalTickets = paid?.total ?? 0;
  const lostTickets = lost?.total ?? 0;
  const normalAmount = paid?.amount ?? 0;
  const lostAmount = lost?.amount ?? 0;

  return {
    totalTickets: normalTickets + lostTickets,
    normalTickets,
    lostTickets,
    totalAmount: normalAmount + lostAmount,
    normalAmount,
    lostAmount,
    pendingTickets: pending?.total ?? 0,
  };
};

export const createShiftClosure = async (userId: string, notes?: string) => {
  const db = await getDb();
  const summary = await getShiftSummary();
  const id = createId();
  const now = new Date().toISOString();

  const closure = {
    id,
    userId,
    shiftLabel: "Turno Diario",
    startTime: now,
    endTime: now,
    totalTickets: summary.totalTickets,
    normalTickets: summary.normalTickets,
    lostTickets: summary.lostTickets,
    totalAmount: summary.totalAmount,
    normalAmount: summary.normalAmount,
    lostAmount: summary.lostAmount,
    notes: notes?.trim() || null,
    localId: id,
    syncedAt: null,
  };

  await db.runAsync(
    `INSERT INTO shift_closures(
      id, user_id, shift_label, start_time, end_time,
      total_tickets, normal_tickets, lost_tickets,
      total_amount, normal_amount, lost_amount,
      notes, local_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      closure.id,
      closure.userId,
      closure.shiftLabel,
      closure.startTime,
      closure.endTime,
      closure.totalTickets,
      closure.normalTickets,
      closure.lostTickets,
      closure.totalAmount,
      closure.normalAmount,
      closure.lostAmount,
      closure.notes,
      closure.localId,
    ]
  );

  await queueClosureSync(closure, closure.id);
  console.log("[SYNC][CLOSURE] created_and_queued", {
    closureId: closure.id,
    totalTickets: closure.totalTickets,
    totalAmount: closure.totalAmount,
  });

  return closure;
};
