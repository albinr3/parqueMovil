import { format } from "date-fns";

export const formatCurrency = (value: number) => `$${value}`;

export const formatDateTime = (value: Date | string) =>
  format(typeof value === "string" ? new Date(value) : value, "dd/MM/yyyy hh:mm a");

export const formatTimeOnly = (value: Date | string) =>
  format(typeof value === "string" ? new Date(value) : value, "hh:mm a");
