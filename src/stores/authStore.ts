import { create } from "zustand";
import { User } from "../types";
import {
  clearSession,
  listActiveUsers,
  readSession,
  saveSession,
  validateUserPin,
} from "../services/authService";

type AuthState = {
  user: User | null;
  users: User[];
  loading: boolean;
  init: () => Promise<void>;
  login: (userId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  users: [],
  loading: true,
  init: async () => {
    const [session, activeUsers] = await Promise.all([readSession(), listActiveUsers()]);
    set({ user: session, users: activeUsers, loading: false });
  },
  login: async (userId, pin) => {
    const user = await validateUserPin(userId, pin);
    if (!user) return false;

    await saveSession(user);
    set({ user });
    return true;
  },
  logout: async () => {
    await clearSession();
    set({ user: null });
  },
}));
