import { create } from "zustand";
import { Ticket } from "../types";
import {
  chargeTicket,
  countActiveTickets,
  createTicket,
  getActiveTicketByNumber,
  listTicketsByCurrentShift,
} from "../services/ticketService";

type TicketState = {
  tickets: Ticket[];
  activeTickets: number;
  loadToday: () => Promise<void>;
  addTicket: (userId: string, plate?: string) => Promise<Ticket>;
  findActiveByNumber: (ticketNumber: number) => Promise<Ticket | null>;
  charge: (ticketId: string, isLostTicket: boolean) => Promise<Ticket | null>;
};

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  activeTickets: 0,
  loadToday: async () => {
    const [tickets, activeCount] = await Promise.all([
      listTicketsByCurrentShift(),
      countActiveTickets(),
    ]);

    set({ tickets, activeTickets: activeCount });
  },
  addTicket: async (userId, plate) => {
    const ticket = await createTicket(userId, plate);
    await get().loadToday();
    return ticket;
  },
  findActiveByNumber: async (ticketNumber) => getActiveTicketByNumber(ticketNumber),
  charge: async (ticketId, isLostTicket) => {
    const updated = await chargeTicket(ticketId, isLostTicket);
    await get().loadToday();
    return updated ?? null;
  },
}));
