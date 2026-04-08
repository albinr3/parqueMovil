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
    console.log("[SYNC][STORE] init");
    let wasOnline = false;

    NetInfo.addEventListener((state) => {
      const isOnline =
        Boolean(state.isConnected) && state.isInternetReachable !== false;
      console.log("[SYNC][STORE] connectivity_change", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
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
          console.log("[SYNC][STORE] lastSyncAt:updated_from_auto_sync", {
            processed: event.processed,
            timestamp: event.timestamp,
          });
        }
      });
    }
  },
  forceSync: async () => {
    console.log("[SYNC][STORE] forceSync:start");
    const res = await syncNow();
    console.log("[SYNC][STORE] forceSync:result", res);

    if (res.processed > 0) {
      set({ lastSyncAt: new Date().toISOString() });
      console.log("[SYNC][STORE] lastSyncAt:updated");
    }
  },
}));
