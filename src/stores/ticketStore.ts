import { create } from "zustand";
import { Ticket } from "../types";
import {
  countActiveTickets,
  createTicket,
  getActiveTicketByPlate,
  getActiveTicketByNumber,
  getTicketByNumber,
  listTicketsByCurrentShift,
  registerLostTicketExit,
  registerTicketExit,
} from "../services/ticketService";

type TicketState = {
  tickets: Ticket[];
  activeTickets: number;
  currentUserFilterId: string | null;
  loadToday: (userId?: string) => Promise<void>;
  addTicket: (userId: string, plate: string, normalRate: number) => Promise<Ticket>;
  findByNumber: (ticketNumber: number) => Promise<Ticket | null>;
  findActiveByNumber: (ticketNumber: number) => Promise<Ticket | null>;
  findActiveByPlate: (plate: string) => Promise<Ticket | null>;
  registerExit: (ticketId: string) => Promise<Ticket | null>;
  registerLostExit: (ticketId: string, lostRate: number) => Promise<Ticket | null>;
};

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  activeTickets: 0,
  currentUserFilterId: null,
  loadToday: async (userId) => {
    const nextFilterUserId = userId ?? get().currentUserFilterId;
    const [tickets, activeCount] = await Promise.all([
      listTicketsByCurrentShift(nextFilterUserId ?? undefined),
      countActiveTickets(nextFilterUserId ?? undefined),
    ]);

    set({ tickets, activeTickets: activeCount, currentUserFilterId: nextFilterUserId ?? null });
  },
  addTicket: async (userId, plate, normalRate) => {
    const ticket = await createTicket(userId, plate, normalRate);
    await get().loadToday();
    return ticket;
  },
  findByNumber: async (ticketNumber) => getTicketByNumber(ticketNumber),
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
