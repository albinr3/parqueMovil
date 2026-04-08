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

export const getTicketBarcodeValue = (ticketNumber: number) =>
  ticketNumber.toString().padStart(6, "0");

export const buildTicketPrintText = (payload: PrintPayload) => {
  const barcodeValue = getTicketBarcodeValue(payload.ticketNumber);
  return [
    payload.parkingName.toUpperCase(),
    "-----------------------------",
    `Ticket: #${payload.ticketNumber.toString().padStart(4, "0")}`,
    `Codigo: ${barcodeValue}`,
    `Fecha: ${formatDateTime(payload.entryTime)}`,
    `Placa: ${payload.plate?.trim() || "---"}`,
    "-----------------------------",
    `Cobrado entrada: $${payload.normalRate}`,
    `Tarifa normal: $${payload.normalRate}`,
    `Recargo ticket perdido: +$${payload.lostRate}`,
    payload.headerText?.trim() || "Conserve su ticket.",
    "\n\n",
  ].join("\n");
};
