import axios from "axios";
import { API_BASE_URL, DEFAULT_PARKING_CONFIG } from "../config/constants";
import { getDb } from "../database/db";

const PARKING_CONFIG_META_KEY = "parking_config_cache";

export type ParkingConfig = {
  parkingName: string;
  normalRate: number;
  lostTicketRate: number;
  ticketHeader: string;
  source: "api" | "cache" | "fallback";
};

const clampRate = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
};

const normalizeConfig = (
  value: unknown,
  source: ParkingConfig["source"]
): ParkingConfig | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  return {
    parkingName:
      typeof raw.parkingName === "string" && raw.parkingName.trim().length > 0
        ? raw.parkingName.trim()
        : DEFAULT_PARKING_CONFIG.parkingName,
    normalRate: clampRate(raw.normalRate, DEFAULT_PARKING_CONFIG.normalRate),
    lostTicketRate: clampRate(
      raw.lostTicketRate,
      DEFAULT_PARKING_CONFIG.lostTicketRate
    ),
    ticketHeader:
      typeof raw.ticketHeader === "string" && raw.ticketHeader.trim().length > 0
        ? raw.ticketHeader.trim()
        : DEFAULT_PARKING_CONFIG.ticketHeader,
    source,
  };
};

const saveCachedParkingConfig = async (
  config: Omit<ParkingConfig, "source">
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_meta(key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PARKING_CONFIG_META_KEY, JSON.stringify(config)]
  );
};

export const getCachedParkingConfig = async (): Promise<ParkingConfig | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [PARKING_CONFIG_META_KEY]
  );
  if (!row?.value) return null;

  try {
    return normalizeConfig(JSON.parse(row.value), "cache");
  } catch {
    return null;
  }
};

const fetchRemoteParkingConfig = async (): Promise<ParkingConfig> => {
  const response = await axios.get(`${API_BASE_URL}/api/config`, {
    timeout: 4500,
  });
  const normalized = normalizeConfig(response.data, "api");
  if (!normalized) {
    throw new Error("La API devolvió configuración inválida");
  }

  await saveCachedParkingConfig({
    parkingName: normalized.parkingName,
    normalRate: normalized.normalRate,
    lostTicketRate: normalized.lostTicketRate,
    ticketHeader: normalized.ticketHeader,
  });

  return normalized;
};

export const loadParkingConfig = async ({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<ParkingConfig> => {
  if (!forceRefresh) {
    try {
      return await fetchRemoteParkingConfig();
    } catch {
      const cached = await getCachedParkingConfig();
      if (cached) return cached;
    }
  } else {
    try {
      return await fetchRemoteParkingConfig();
    } catch {
      const cached = await getCachedParkingConfig();
      if (cached) return cached;
    }
  }

  return {
    ...DEFAULT_PARKING_CONFIG,
    source: "fallback",
  };
};
