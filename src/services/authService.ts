import * as SecureStore from "expo-secure-store";
import bcrypt from "bcryptjs";
import axios from "axios";
import { getDb } from "../database/db";
import { User } from "../types";
import { API_BASE_URL } from "../config/constants";

const SESSION_KEY = "pmb_session_user";

const getCandidateBaseUrls = (baseUrl: string) => {
  const normalized = baseUrl.replace(/\/+$/, "");

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const origin = `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}`;
    const altOrigin = `${parsed.protocol}//${altHost}${parsed.port ? `:${parsed.port}` : ""}`;
    return Array.from(new Set([origin, altOrigin]));
  } catch {
    return [normalized];
  }
};

export const hashPin = (pin: string) => {
  let hash = 0;

  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }

  return String(hash);
};

export const listActiveUsers = async (): Promise<User[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<User>(
    "SELECT id, name, pin_hash as pinHash, role, active FROM users WHERE active = 1 ORDER BY name"
  );

  return rows;
};

type RemoteUser = {
  id?: unknown;
  name?: unknown;
  username?: unknown;
  role?: unknown;
  active?: unknown;
  pinHash?: unknown;
  pin_hash?: unknown;
  pin?: unknown;
  pinCode?: unknown;
  pin_code?: unknown;
  password?: unknown;
  data?: unknown;
};

const extractUsersPayload = (data: unknown): RemoteUser[] => {
  if (Array.isArray(data)) return data as RemoteUser[];

  if (data && typeof data === "object") {
    const wrapped = data as { users?: unknown; data?: unknown; results?: unknown; items?: unknown };
    if (Array.isArray(wrapped.users)) return wrapped.users as RemoteUser[];
    if (Array.isArray(wrapped.data)) return wrapped.data as RemoteUser[];
    if (Array.isArray(wrapped.results)) return wrapped.results as RemoteUser[];
    if (Array.isArray(wrapped.items)) return wrapped.items as RemoteUser[];

    if (wrapped.data && typeof wrapped.data === "object") {
      const nested = wrapped.data as { users?: unknown; items?: unknown; results?: unknown };
      if (Array.isArray(nested.users)) return nested.users as RemoteUser[];
      if (Array.isArray(nested.items)) return nested.items as RemoteUser[];
      if (Array.isArray(nested.results)) return nested.results as RemoteUser[];
    }
  }

  return [];
};

const normalizeId = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const normalizeName = (user: RemoteUser) => {
  if (typeof user.name === "string" && user.name.trim().length > 0) {
    return user.name.trim();
  }
  if (typeof user.username === "string" && user.username.trim().length > 0) {
    return user.username.trim();
  }
  return "";
};

const getRemotePinHash = (user: RemoteUser) => {
  const rawPinCandidate =
    user.pinHash ??
    user.pin_hash ??
    user.pin ??
    user.pinCode ??
    user.pin_code ??
    user.password ??
    (user.data && typeof user.data === "object" ? (user.data as any).pin : undefined);

  if (rawPinCandidate == null) {
    return null;
  }

  const normalized =
    typeof rawPinCandidate === "string"
      ? rawPinCandidate.trim()
      : typeof rawPinCandidate === "number" && Number.isFinite(rawPinCandidate)
      ? String(rawPinCandidate)
      : "";

  if (!normalized) {
    return null;
  }

  const isBcryptHash =
    normalized.startsWith("$2a$") ||
    normalized.startsWith("$2b$") ||
    normalized.startsWith("$2y$");

  if (isBcryptHash) {
    return normalized;
  }

  return hashPin(normalized);
};

export const syncUsersFromApi = async (): Promise<number> => {
  const baseUrls = getCandidateBaseUrls(API_BASE_URL);
  const candidateUrls = baseUrls.flatMap((baseUrl) => [
    `${baseUrl}/api/users?includePinHash=1`,
    `${baseUrl}/api/users`,
  ]);

  let response: Awaited<ReturnType<typeof axios.get<unknown>>> | null = null;
  let lastError: unknown = null;

  for (const url of candidateUrls) {
    try {
      response = await axios.get<unknown>(url, {
        headers: { Accept: "application/json" },
      });
      break;
    } catch (error: unknown) {
      lastError = error;
    }
  }

  if (!response) throw lastError ?? new Error("Could not fetch users from API");

  const payload = extractUsersPayload(response.data);
  if (payload.length === 0) {
    throw new Error("Users payload is empty or invalid");
  }
  const db = await getDb();
  let synced = 0;
  const remoteUserIds: string[] = [];

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await db.runAsync("UPDATE users SET active = 0");

    for (const rawUser of payload) {
      const user = rawUser as RemoteUser;
      const id = normalizeId(user.id);
      const name = normalizeName(user);

      if (!id || !name) {
        continue;
      }
      remoteUserIds.push(id);

      const role = user.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
      const active = user.active === false || user.active === 0 ? 0 : 1;
      const pinHash = getRemotePinHash(user);

      if (pinHash) {
        await db.runAsync(
          `INSERT INTO users(id, name, pin_hash, role, active)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             pin_hash = excluded.pin_hash,
             role = excluded.role,
             active = excluded.active`,
          [id, name, pinHash, role, active]
        );
        synced += 1;
        continue;
      }

      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM users WHERE id = ?",
        [id]
      );
      if (!existing) {
        continue;
      }

      await db.runAsync(
        `UPDATE users
         SET name = ?, role = ?, active = ?
         WHERE id = ?`,
        [name, role, active, id]
      );
      synced += 1;
    }

    if (remoteUserIds.length > 0) {
      const placeholders = remoteUserIds.map(() => "?").join(", ");
      await db.runAsync(
        `DELETE FROM users
         WHERE active = 0
           AND id NOT IN (${placeholders})`,
        remoteUserIds
      );
    } else {
      await db.runAsync("DELETE FROM users WHERE active = 0");
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }

  return synced;
};

export const validateUserPin = async (userId: string, pin: string): Promise<User | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<User>(
    "SELECT id, name, pin_hash as pinHash, role, active FROM users WHERE id = ? AND active = 1",
    [userId]
  );

  if (!row) return null;

  const isBcryptHash = row.pinHash.startsWith("$2a$") ||
    row.pinHash.startsWith("$2b$") ||
    row.pinHash.startsWith("$2y$");
  const isValid = isBcryptHash
    ? await bcrypt.compare(pin, row.pinHash)
    : row.pinHash === hashPin(pin);

  return isValid ? row : null;
};

export const saveSession = async (user: User) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

export const readSession = async (): Promise<User | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};
