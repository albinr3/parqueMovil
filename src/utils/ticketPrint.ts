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

const TICKET_TIME_ZONE = "America/Santo_Domingo";

const formatTicketDateTime = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TICKET_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  const hour = pick("hour");
  const minute = pick("minute");
  const dayPeriod = pick("dayPeriod").toUpperCase();

  return `${day}/${month}/${year} ${hour}:${minute} ${dayPeriod}`.trim();
};

export const buildTicketPrintText = (payload: PrintPayload) => {
  return [
    payload.parkingName.toUpperCase(),
    "-----------------------------",
    `Ticket: #${payload.ticketNumber.toString().padStart(4, "0")}`,
    `Fecha: ${formatTicketDateTime(payload.entryTime)}`,
    `Placa: ${payload.plate?.trim() || "---"}`,
    "-----------------------------",
    `Cobrado entrada: $${payload.normalRate}`,
    `Recargo ticket perdido: +$${payload.lostRate}`,
    payload.headerText?.trim() || "Conserve su ticket.",
    "\n\n\n",
  ].join("\n");
};
