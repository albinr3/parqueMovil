import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";
import { startSyncLoop, syncNow } from "../services/syncService";

type SyncStatus = "online" | "offline" | "pending";

type SyncState = {
  status: SyncStatus;
  lastSyncAt: string | null;
  init: () => void;
  forceSync: () => Promise<void>;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: "pending",
  lastSyncAt: null,
  init: () => {
    NetInfo.addEventListener((state) => {
      set({ status: state.isConnected ? "online" : "offline" });
    });

    startSyncLoop();
  },
  forceSync: async () => {
    const res = await syncNow();

    if (res.processed > 0) {
      set({ lastSyncAt: new Date().toISOString() });
    }
  },
}));
