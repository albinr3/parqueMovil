import axios from "axios";
import { API_BASE_URL, DEFAULT_PARKING_CONFIG } from "../config/constants";
import { getDb } from "../database/db";

const PARKING_CONFIG_META_KEY = "parking_config_cache";
const PARKING_CONFIG_LAST_FETCH_DATE_META_KEY = "parking_config_last_fetch_date";
const PARKING_CONFIG_LAST_FETCH_AT_META_KEY = "parking_config_last_fetch_at";
const CONFIG_REFRESH_INTERVAL_MS = 60 * 1000;

export type ParkingConfig = {
  parkingName: string;
  normalRate: number;
  lostTicketRate: number;
  shift1Start: string;
  shift1End: string;
  shift2Start: string;
  shift2End: string;
  ticketHeader: string;
  source: "api" | "cache" | "fallback";
};

const clampRate = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
};

const normalizeShiftTime = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
};

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    shift1Start: normalizeShiftTime(
      raw.shift1Start,
      DEFAULT_PARKING_CONFIG.shift1Start
    ),
    shift1End: normalizeShiftTime(raw.shift1End, DEFAULT_PARKING_CONFIG.shift1End),
    shift2Start: normalizeShiftTime(
      raw.shift2Start,
      DEFAULT_PARKING_CONFIG.shift2Start
    ),
    shift2End: normalizeShiftTime(raw.shift2End, DEFAULT_PARKING_CONFIG.shift2End),
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

const saveLastFetchDate = async (dateKey: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_meta(key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PARKING_CONFIG_LAST_FETCH_DATE_META_KEY, dateKey]
  );
};

const saveLastFetchAt = async (timestamp: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_meta(key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PARKING_CONFIG_LAST_FETCH_AT_META_KEY, String(timestamp)]
  );
};

const getLastFetchDate = async (): Promise<string | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [PARKING_CONFIG_LAST_FETCH_DATE_META_KEY]
  );
  return row?.value ?? null;
};

const getLastFetchAt = async (): Promise<number | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [PARKING_CONFIG_LAST_FETCH_AT_META_KEY]
  );
  if (!row?.value) return null;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
    shift1Start: normalized.shift1Start,
    shift1End: normalized.shift1End,
    shift2Start: normalized.shift2Start,
    shift2End: normalized.shift2End,
    ticketHeader: normalized.ticketHeader,
  });
  await saveLastFetchDate(getLocalDateKey());
  await saveLastFetchAt(Date.now());

  return normalized;
};

export const loadParkingConfig = async ({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<ParkingConfig> => {
  const today = getLocalDateKey();
  const cached = await getCachedParkingConfig();
  const lastFetchDate = await getLastFetchDate();
  const lastFetchAt = await getLastFetchAt();
  const isStaleByTime =
    !lastFetchAt || Date.now() - lastFetchAt >= CONFIG_REFRESH_INTERVAL_MS;
  const shouldFetchRemote =
    forceRefresh || !cached || isStaleByTime || lastFetchDate !== today;

  if (shouldFetchRemote) {
    try {
      return await fetchRemoteParkingConfig();
    } catch {
      if (cached) return cached;
    }
  } else if (cached) {
    return cached;
  }

  return {
    ...DEFAULT_PARKING_CONFIG,
    source: "fallback",
  };
};
