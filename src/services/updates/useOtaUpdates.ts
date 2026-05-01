import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

type OtaUpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface OtaUpdateState {
  status: OtaUpdateStatus;
  visible: boolean;
  errorMessage: string | null;
}

interface CheckForUpdatesOptions {
  silentIfOffline?: boolean;
  silentIfError?: boolean;
}

const DEFAULT_ERROR_MESSAGE = "No se pudo completar la actualizacion. Intenta de nuevo.";
const OFFLINE_ERROR_MESSAGE = "No hay conexion a internet para buscar actualizaciones.";
const OTA_IGNORED_COUNT_KEY = "ota_update_ignored_count";
const OTA_AUTO_UPDATE_THRESHOLD = 5;
const OTA_IGNORE_TIMEOUT_MS = 45000;

const getIgnoredCount = async () => {
  try {
    const raw = await AsyncStorage.getItem(OTA_IGNORED_COUNT_KEY);
    const parsed = Number(raw ?? "0");
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.trunc(parsed);
  } catch {
    return 0;
  }
};

const setIgnoredCount = async (value: number) => {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  try {
    await AsyncStorage.setItem(OTA_IGNORED_COUNT_KEY, String(safeValue));
  } catch {
    // Si falla persistencia no debe romper el flujo de actualizacion.
  }
};

const toFriendlyUpdateError = (error: unknown) => {
  const rawMessage = String((error as any)?.message || "");
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("network") ||
    normalized.includes("internet") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("failed to check for update")
  ) {
    return "No se pudo verificar actualizaciones en este momento.";
  }

  return DEFAULT_ERROR_MESSAGE;
};

export function useOtaUpdates() {
  const [state, setState] = useState<OtaUpdateState>({
    status: "idle",
    visible: false,
    errorMessage: null,
  });
  const runningCheckRef = useRef(false);
  const runningDownloadRef = useRef(false);
  const statusRef = useRef<OtaUpdateStatus>("idle");
  const visibleRef = useRef(false);
  const ignoreRecordedForCurrentAvailableRef = useRef(false);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    visibleRef.current = state.visible;
  }, [state.visible]);

  const supported = useMemo(() => !__DEV__ && Updates.isEnabled, []);

  const hasInternetConnection = useCallback(async () => {
    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected === false) return false;
      if (netInfo.isInternetReachable === false) return false;
      return true;
    } catch {
      return false;
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!supported || runningDownloadRef.current) return;

    const hasInternet = await hasInternetConnection();
    if (!hasInternet) {
      setState({ status: "error", visible: true, errorMessage: OFFLINE_ERROR_MESSAGE });
      return;
    }

    runningDownloadRef.current = true;
    setState((prev) => ({ ...prev, status: "downloading", visible: true, errorMessage: null }));

    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        await setIgnoredCount(0);
        setState({ status: "ready", visible: true, errorMessage: null });
        return;
      }

      await setIgnoredCount(0);
      setState({ status: "idle", visible: false, errorMessage: null });
    } catch (error: unknown) {
      setState({
        status: "error",
        visible: true,
        errorMessage: toFriendlyUpdateError(error),
      });
    } finally {
      runningDownloadRef.current = false;
    }
  }, [hasInternetConnection, supported]);

  const dismiss = useCallback(() => {
    if (statusRef.current !== "available") {
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }

    void (async () => {
      if (ignoreRecordedForCurrentAvailableRef.current) {
        setState((prev) => ({ ...prev, visible: false }));
        return;
      }
      ignoreRecordedForCurrentAvailableRef.current = true;
      const ignoredCount = await getIgnoredCount();
      const nextIgnoredCount = ignoredCount + 1;
      await setIgnoredCount(nextIgnoredCount);

      if (nextIgnoredCount > OTA_AUTO_UPDATE_THRESHOLD) {
        await downloadUpdate();
        return;
      }

      setState((prev) => ({ ...prev, visible: false }));
    })();
  }, [downloadUpdate]);

  const registerIgnoreIfAvailable = useCallback(async () => {
    if (statusRef.current !== "available" || !visibleRef.current) return;
    if (ignoreRecordedForCurrentAvailableRef.current) return;

    ignoreRecordedForCurrentAvailableRef.current = true;
    const ignoredCount = await getIgnoredCount();
    const nextIgnoredCount = ignoredCount + 1;
    await setIgnoredCount(nextIgnoredCount);

    if (nextIgnoredCount > OTA_AUTO_UPDATE_THRESHOLD) {
      await downloadUpdate();
    }
  }, [downloadUpdate]);

  const checkForUpdates = useCallback(
    async (options?: CheckForUpdatesOptions) => {
      if (!supported || runningCheckRef.current) return;

      const hasInternet = await hasInternetConnection();
      if (!hasInternet) {
        if (options?.silentIfOffline) {
          setState({ status: "idle", visible: false, errorMessage: null });
        } else {
          setState({ status: "error", visible: true, errorMessage: OFFLINE_ERROR_MESSAGE });
        }
        return;
      }

      runningCheckRef.current = true;
      setState({ status: "checking", visible: true, errorMessage: null });

      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) {
          await setIgnoredCount(0);
          setState({ status: "idle", visible: false, errorMessage: null });
          return;
        }

        const ignoredCount = await getIgnoredCount();
        if (ignoredCount > OTA_AUTO_UPDATE_THRESHOLD) {
          await downloadUpdate();
          return;
        }

        ignoreRecordedForCurrentAvailableRef.current = false;
        setState({ status: "available", visible: true, errorMessage: null });
      } catch (error: unknown) {
        if (options?.silentIfError) {
          setState({ status: "idle", visible: false, errorMessage: null });
          return;
        }

        setState({
          status: "error",
          visible: true,
          errorMessage: toFriendlyUpdateError(error),
        });
      } finally {
        runningCheckRef.current = false;
      }
    },
    [downloadUpdate, hasInternetConnection, supported]
  );

  const reloadApp = useCallback(async () => {
    if (!supported) return;

    try {
      await Updates.reloadAsync();
    } catch (error: unknown) {
      setState({
        status: "error",
        visible: true,
        errorMessage: toFriendlyUpdateError(error),
      });
    }
  }, [supported]);

  useEffect(() => {
    if (state.status !== "available" || !state.visible) return;
    const timeout = setTimeout(() => {
      void registerIgnoreIfAvailable();
    }, OTA_IGNORE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [registerIgnoreIfAvailable, state.status, state.visible]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;
      void registerIgnoreIfAvailable();
    });
    return () => sub.remove();
  }, [registerIgnoreIfAvailable]);

  return {
    status: state.status,
    visible: state.visible,
    errorMessage: state.errorMessage,
    supported,
    dismiss,
    checkForUpdates,
    downloadUpdate,
    reloadApp,
  };
}
