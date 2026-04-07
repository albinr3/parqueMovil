import { formatDateTime } from "./format";

type PrintPayload = {
  parkingName: string;
  ticketNumber: number;
  plate?: string | null;
  entryTime: string;
  normalRate: number;
  lostRate: number;
  headerText?: string | null;
};

export const buildTicketPrintText = (payload: PrintPayload) => {
  return [
    payload.parkingName.toUpperCase(),
    "-----------------------------",
    `Ticket: #${payload.ticketNumber.toString().padStart(4, "0")}`,
    `Fecha: ${formatDateTime(payload.entryTime)}`,
    `Placa: ${payload.plate?.trim() || "---"}`,
    "-----------------------------",
    `Tarifa normal: $${payload.normalRate}`,
    `Ticket perdido: $${payload.lostRate}`,
    payload.headerText?.trim() || "Conserve su ticket.",
    "\n\n",
  ].join("\n");
};
