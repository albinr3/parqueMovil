export const formatCurrency = (value: number) => `$${value}`;

const DOMINICAN_TIME_ZONE = "America/Santo_Domingo";

const toDate = (value: Date | string) =>
  typeof value === "string" ? new Date(value) : value;

export const formatDateTime = (value: Date | string) => {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: DOMINICAN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(value));
};

export const formatTimeOnly = (value: Date | string) => {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: DOMINICAN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(value));
};
