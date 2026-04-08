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
    console.log("[SYNC][STORE] init");
    NetInfo.addEventListener((state) => {
      console.log("[SYNC][STORE] connectivity_change", {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
      set({ status: state.isConnected ? "online" : "offline" });
    });

    startSyncLoop();
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
