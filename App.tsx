import { useEffect, useRef } from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { ActivityIndicator, AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { runMigrations } from "./src/database/migrations";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/stores/authStore";
import { useConfigStore } from "./src/stores/configStore";
import { useSyncStore } from "./src/stores/syncStore";
import { FeedbackProvider } from "./src/contexts/FeedbackContext";
import { appTheme } from "./src/theme/theme";
import { ParkingConfig } from "./src/services/parkingConfigService";
import { OtaUpdateBanner } from "./src/components/OtaUpdateBanner";
import { useOtaUpdates } from "./src/services/updates/useOtaUpdates";

const toShiftTimestamp = (time: string, baseDate: Date) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

const getNextShiftEndTimestamp = (config: ParkingConfig, now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const candidates = [
    toShiftTimestamp(config.shift1End, today),
    toShiftTimestamp(config.shift2End, today),
    toShiftTimestamp(config.shift1End, tomorrow),
    toShiftTimestamp(config.shift2End, tomorrow),
  ].filter((value): value is number => typeof value === "number" && value > now.getTime());

  if (!candidates.length) return null;
  return Math.min(...candidates);
};

export default function App() {
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const initAuth = useAuthStore((state) => state.init);
  const initSync = useSyncStore((state) => state.init);
  const config = useConfigStore((state) => state.config);
  const configLoaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledLogoutAtRef = useRef<number | null>(null);
  const otaUpdates = useOtaUpdates();

  useEffect(() => {
    void otaUpdates.checkForUpdates({ silentIfOffline: true, silentIfError: true });
  }, [otaUpdates.checkForUpdates]);

  useEffect(() => {
    runMigrations()
      .then(() => initAuth())
      .then(() => initSync())
      .then(() => loadConfig({ forceRefresh: false }))
      .catch(() => {
        // Evita romper render inicial; errores se manejaran en UI/log.
      });
  }, [initAuth, initSync, loadConfig]);

  useEffect(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    scheduledLogoutAtRef.current = null;

    if (!user || !configLoaded) return;

    const nextShiftEndAt = getNextShiftEndTimestamp(config);
    if (!nextShiftEndAt) return;

    scheduledLogoutAtRef.current = nextShiftEndAt;
    const delay = Math.max(0, nextShiftEndAt - Date.now());

    logoutTimerRef.current = setTimeout(() => {
      void logout();
    }, delay);

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [
    config.shift1End,
    config.shift2End,
    configLoaded,
    logout,
    user?.id,
  ]);

  useEffect(() => {
    if (!user) return;

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void otaUpdates.checkForUpdates({ silentIfOffline: true, silentIfError: true });
      }
      if (state !== "active") return;
      const scheduledLogoutAt = scheduledLogoutAtRef.current;
      if (!scheduledLogoutAt) return;
      if (Date.now() >= scheduledLogoutAt) {
        void logout();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [logout, otaUpdates.checkForUpdates, user?.id]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FeedbackProvider>
            <AppNavigator />
            <OtaUpdateBanner
              visible={otaUpdates.visible}
              status={otaUpdates.status}
              errorMessage={otaUpdates.errorMessage}
              onCheckNow={otaUpdates.checkForUpdates}
              onDownloadNow={otaUpdates.downloadUpdate}
              onReloadNow={otaUpdates.reloadApp}
              onDismiss={otaUpdates.dismiss}
            />
          </FeedbackProvider>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
