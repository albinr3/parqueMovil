export type UserRole = "ADMIN" | "EMPLOYEE";
export type TicketStatus = "ACTIVE" | "PAID" | "LOST_PAID" | "CANCELLED";

export type User = {
  id: string;
  name: string;
  pinHash: string;
  role: UserRole;
  active: number;
};

export type Ticket = {
  id: string;
  ticketNumber: number;
  plate: string | null;
  status: TicketStatus;
  entryTime: string;
  exitTime: string | null;
  amountCharged: number | null;
  entryAmountCharged: number;
  lostExtraCharged: number;
  isLostTicket: number;
  userId: string;
  closureId: string | null;
  localId: string;
  syncedAt: string | null;
};

export type ShiftClosure = {
  id: string;
  userId: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  totalTickets: number;
  normalTickets: number;
  lostTickets: number;
  totalAmount: number;
  normalAmount: number;
  lostAmount: number;
  notes: string | null;
  localId: string;
  syncedAt: string | null;
};

export type SyncQueueItem = {
  id: string;
  entityType: "ticket" | "closure";
  entityId: string;
  action: "create" | "update";
  payload: string;
  attempts: number;
  lastError: string | null;
  processed: number;
};
