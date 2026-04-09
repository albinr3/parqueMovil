export const COLORS = {
  primary: "#EE8600",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  background: "#FFF7ED",
  text: "#1F2937",
  muted: "#6B7280",
};

export const DEFAULT_RATES = {
  normal: 25,
  lost: 100,
};

export const DEFAULT_PARKING_NAME = "Parqueo Moto Badia";

export const DEFAULT_PARKING_CONFIG = {
  parkingName: DEFAULT_PARKING_NAME,
  normalRate: DEFAULT_RATES.normal,
  lostTicketRate: DEFAULT_RATES.lost,
  shift1Start: "06:00",
  shift1End: "14:00",
  shift2Start: "14:00",
  shift2End: "22:00",
  ticketHeader: "Conserve su ticket.",
};

export const SYNC_INTERVAL_MS = 30000;

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://10.0.2.2:3000";

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");
