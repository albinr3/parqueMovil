import { create } from "zustand";
import { DEFAULT_PARKING_CONFIG } from "../config/constants";
import {
  loadParkingConfig,
  ParkingConfig,
} from "../services/parkingConfigService";

type ConfigState = {
  config: ParkingConfig;
  loaded: boolean;
  loading: boolean;
  loadConfig: (options?: { forceRefresh?: boolean }) => Promise<ParkingConfig>;
};

const fallbackConfig: ParkingConfig = {
  ...DEFAULT_PARKING_CONFIG,
  source: "fallback",
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: fallbackConfig,
  loaded: false,
  loading: false,
  loadConfig: async (options) => {
    set({ loading: true });
    const config = await loadParkingConfig(options);
    set({ config, loaded: true, loading: false });
    return config;
  },
}));
