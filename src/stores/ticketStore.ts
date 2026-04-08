import { create } from "zustand";
import { Ticket } from "../types";
import {
  countActiveTickets,
  createTicket,
  getActiveTicketByPlate,
  getActiveTicketByNumber,
  listTicketsByCurrentShift,
  registerLostTicketExit,
  registerTicketExit,
} from "../services/ticketService";

type TicketState = {
  tickets: Ticket[];
  activeTickets: number;
  loadToday: () => Promise<void>;
  addTicket: (userId: string, plate: string, normalRate: number) => Promise<Ticket>;
  findActiveByNumber: (ticketNumber: number) => Promise<Ticket | null>;
  findActiveByPlate: (plate: string) => Promise<Ticket | null>;
  registerExit: (ticketId: string) => Promise<Ticket | null>;
  registerLostExit: (ticketId: string, lostRate: number) => Promise<Ticket | null>;
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
  addTicket: async (userId, plate, normalRate) => {
    const ticket = await createTicket(userId, plate, normalRate);
    await get().loadToday();
    return ticket;
  },
  findActiveByNumber: async (ticketNumber) => getActiveTicketByNumber(ticketNumber),
  findActiveByPlate: async (plate) => getActiveTicketByPlate(plate),
  registerExit: async (ticketId) => {
    const updated = await registerTicketExit(ticketId);
    await get().loadToday();
    return updated ?? null;
  },
  registerLostExit: async (ticketId, lostRate) => {
    const updated = await registerLostTicketExit(ticketId, lostRate);
    await get().loadToday();
    return updated ?? null;
  },
}));
