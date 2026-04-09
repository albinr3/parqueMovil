import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";
import { onSyncCompleted, requestSync, syncNow } from "../services/syncService";

type SyncStatus = "online" | "offline" | "pending";

type SyncState = {
  status: SyncStatus;
  lastSyncAt: string | null;
  init: () => void;
  forceSync: () => Promise<void>;
};

let syncCompletionUnsubscribe: (() => void) | null = null;

export const useSyncStore = create<SyncState>((set) => ({
  status: "pending",
  lastSyncAt: null,
  init: () => {
    let wasOnline = false;

    NetInfo.addEventListener((state) => {
      const isOnline =
        Boolean(state.isConnected) && state.isInternetReachable !== false;
      set({ status: isOnline ? "online" : "offline" });

      if (isOnline && !wasOnline) {
        requestSync("connectivity_restored");
      }
      wasOnline = isOnline;
    });

    if (!syncCompletionUnsubscribe) {
      syncCompletionUnsubscribe = onSyncCompleted((event) => {
        if (event.processed > 0) {
          set({ lastSyncAt: event.timestamp });
        }
      });
    }
  },
  forceSync: async () => {
    const res = await syncNow();

    if (res.processed > 0) {
      set({ lastSyncAt: new Date().toISOString() });
    }
  },
}));
