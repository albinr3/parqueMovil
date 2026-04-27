import { useCallback, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
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

  const supported = useMemo(() => !__DEV__ && Updates.isEnabled, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

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
          setState({ status: "idle", visible: false, errorMessage: null });
          return;
        }

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
    [hasInternetConnection, supported]
  );

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
        setState({ status: "ready", visible: true, errorMessage: null });
        return;
      }

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
