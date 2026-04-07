import * as SecureStore from "expo-secure-store";
import { getDb } from "../database/db";
import { User } from "../types";

const SESSION_KEY = "pmb_session_user";

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

export const validateUserPin = async (userId: string, pin: string): Promise<User | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<User>(
    "SELECT id, name, pin_hash as pinHash, role, active FROM users WHERE id = ? AND active = 1",
    [userId]
  );

  if (!row) return null;

  return row.pinHash === hashPin(pin) ? row : null;
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
