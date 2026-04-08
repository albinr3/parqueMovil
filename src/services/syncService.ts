import axios, { isAxiosError } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { API_BASE_URL, SYNC_INTERVAL_MS } from "../config/constants";
import { getDb } from "../database/db";

let syncInterval: ReturnType<typeof setInterval> | null = null;
const SYNC_LOG_PREFIX = "[SYNC]";
let syncInFlight: Promise<{
  processed: number;
  skipped: boolean;
  error?: string;
}> | null = null;
let scheduledSyncTimer: ReturnType<typeof setTimeout> | null = null;
type SyncResult = {
  processed: number;
  skipped: boolean;
  error?: string;
};
type SyncCompletedEvent = SyncResult & { timestamp: string };
const syncCompletedListeners = new Set<(event: SyncCompletedEvent) => void>();

type SyncApiResponse = {
  success?: boolean;
  synced?: {
    errors?: unknown[];
    tickets?: number;
    closures?: number;
  };
  processedEventIds?: string[];
  failedEventIds?: string[];
};

const log = (...args: unknown[]) => {
  console.log(SYNC_LOG_PREFIX, ...args);
};

const warn = (...args: unknown[]) => {
  console.warn(SYNC_LOG_PREFIX, ...args);
};

const errorLog = (...args: unknown[]) => {
  console.error(SYNC_LOG_PREFIX, ...args);
};

const notifySyncCompleted = (result: SyncResult) => {
  const event: SyncCompletedEvent = {
    ...result,
    timestamp: new Date().toISOString(),
  };
  for (const listener of syncCompletedListeners) {
    try {
      listener(event);
    } catch (listenerError) {
      errorLog("syncNow:listener_error", listenerError);
    }
  }
};

const buildSyncEvents = (pending: {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
}[]) =>
  pending.map((row) => ({
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    payload: JSON.parse(row.payload),
  }));

const filterKnownEventIds = (ids: string[], pendingIds: string[]) => {
  const pendingIdSet = new Set(pendingIds);
  return ids.filter((id) => pendingIdSet.has(id));
};

const markEventIdsAsProcessed = async (ids: string[]) => {
  if (!ids.length) return;

  const db = await getDb();

  for (const id of ids) {
    await db.runAsync(
      "UPDATE sync_queue SET processed = 1, last_error = NULL WHERE id = ?",
      [id]
    );
  }
};

const markPendingAsFailed = async (
  pending: {
    id: string;
  }[],
  reason: string
) => {
  const db = await getDb();

  for (const row of pending) {
    await db.runAsync(
      "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
      [reason, row.id]
    );
  }
};

const markEventIdsAsFailed = async (ids: string[], reason: string) => {
  if (!ids.length) return;

  const db = await getDb();

  for (const id of ids) {
    await db.runAsync(
      "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
      [reason, id]
    );
  }
};

const getSyncOutcome = (responseData: SyncApiResponse, pendingIds: string[]) => {
  const processedEventIdsRaw = Array.isArray(responseData.processedEventIds)
    ? responseData.processedEventIds.filter((id): id is string => typeof id === "string")
    : [];
  const failedEventIdsRaw = Array.isArray(responseData.failedEventIds)
    ? responseData.failedEventIds.filter((id): id is string => typeof id === "string")
    : [];

  const processedEventIds = filterKnownEventIds(processedEventIdsRaw, pendingIds);
  const failedEventIds = filterKnownEventIds(failedEventIdsRaw, pendingIds);

  if (processedEventIds.length || failedEventIds.length) {
    const errors =
      Array.isArray(responseData.synced?.errors) && responseData.synced?.errors.length
        ? String(responseData.synced?.errors[0])
        : "Errores reportados por el servidor";

    return {
      processedEventIds,
      failedEventIds,
      reason: failedEventIds.length ? errors : null,
    };
  }

  const hasServerErrors =
    Array.isArray(responseData.synced?.errors) && responseData.synced.errors.length > 0;
  const syncedTickets = Number(responseData.synced?.tickets ?? 0);
  const syncedClosures = Number(responseData.synced?.closures ?? 0);
  const syncedCount = (Number.isFinite(syncedTickets) ? syncedTickets : 0) +
    (Number.isFinite(syncedClosures) ? syncedClosures : 0);

  if (responseData.success === false || hasServerErrors) {
    return {
      processedEventIds: [] as string[],
      failedEventIds: pendingIds,
      reason: hasServerErrors ? String(responseData.synced?.errors?.[0]) : "El servidor rechazó la sincronización",
    };
  }

  if (pendingIds.length > 0 && syncedCount === 0) {
    return {
      processedEventIds: [] as string[],
      failedEventIds: pendingIds,
      reason: "Servidor no reportó eventos procesados",
    };
  }

  return {
    processedEventIds: pendingIds,
    failedEventIds: [] as string[],
    reason: null,
  };
};

const runNetworkDiagnostics = async (baseUrl: string) => {
  try {
    const rootResponse = await fetch(`${baseUrl}/`, {
      method: "GET",
      headers: { Accept: "text/html,application/json" },
    });
    log("diagnostic:root_get", {
      status: rootResponse.status,
      ok: rootResponse.ok,
    });
  } catch (diagError) {
    errorLog(
      "diagnostic:root_get_error",
      diagError instanceof Error ? diagError.message : diagError
    );
  }

  try {
    const syncGetResponse = await fetch(`${baseUrl}/api/sync`, {
      method: "GET",
      headers: { Accept: "application/json,text/plain,*/*" },
    });
    log("diagnostic:sync_get", {
      status: syncGetResponse.status,
      ok: syncGetResponse.ok,
    });
  } catch (diagError) {
    errorLog(
      "diagnostic:sync_get_error",
      diagError instanceof Error ? diagError.message : diagError
    );
  }
};

const getCandidateBaseUrls = (baseUrl: string) => {
  const normalized = baseUrl.replace(/\/+$/, "");

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const origin = `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}`;
    const altOrigin = `${parsed.protocol}//${altHost}${parsed.port ? `:${parsed.port}` : ""}`;

    return Array.from(new Set([origin, altOrigin]));
  } catch {
    return [normalized];
  }
};

const runSyncNow = async () => {
  log("syncNow:start", { apiBaseUrl: API_BASE_URL, timestamp: new Date().toISOString() });

  const net = await NetInfo.fetch();
  log("network", { isConnected: net.isConnected, isInternetReachable: net.isInternetReachable });

  if (!net.isConnected) {
    warn("syncNow:skipped_offline");
    return { processed: 0, skipped: true };
  }

  const db = await getDb();

  const pending = await db.getAllAsync<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    payload: string;
    attempts: number;
  }>(
    `SELECT
      id,
      entity_type as entityType,
      entity_id as entityId,
      action,
      payload,
      attempts
     FROM sync_queue
     WHERE processed = 0
     ORDER BY created_at ASC
     LIMIT 100`
  );
  log("queue:pending_count", pending.length);

  if (!pending.length) {
    log("syncNow:skip_no_pending");
    return { processed: 0, skipped: false };
  }

  const events = buildSyncEvents(pending);
  const candidateBaseUrls = getCandidateBaseUrls(API_BASE_URL);
  log("sync:candidate_base_urls", candidateBaseUrls);

  let lastReason = "Error de sincronizacion";

  for (let i = 0; i < candidateBaseUrls.length; i += 1) {
    const candidateBaseUrl = candidateBaseUrls[i];

    try {
      const url = `${candidateBaseUrl}/api/sync`;
      log("request:post", {
        url,
        candidate: `${i + 1}/${candidateBaseUrls.length}`,
        events: pending.length,
        firstEvent: {
          id: pending[0].id,
          entityType: pending[0].entityType,
          action: pending[0].action,
          attempts: pending[0].attempts,
        },
      });

      const response = await axios.post(url, { events });
      log("response:ok", { status: response.status, data: response.data, baseUrl: candidateBaseUrl });
      log("response:ok_json", JSON.stringify(response.data));

      const outcome = getSyncOutcome(response.data as SyncApiResponse, pending.map((row) => row.id));

      await markEventIdsAsProcessed(outcome.processedEventIds);
      await markEventIdsAsFailed(outcome.failedEventIds, outcome.reason ?? "Error de sincronización");

      log("queue:sync_outcome", {
        processed: outcome.processedEventIds.length,
        failed: outcome.failedEventIds.length,
      });

      if (outcome.failedEventIds.length > 0) {
        return {
          processed: outcome.processedEventIds.length,
          skipped: false,
          error: outcome.reason ?? "Errores reportados por el servidor",
        };
      }

      return { processed: outcome.processedEventIds.length, skipped: false };
    } catch (error) {
    const reason = error instanceof Error ? error.message : "Error de sincronizacion";
      lastReason = reason;

      if (isAxiosError(error) && error.code === "ERR_NETWORK") {
        warn("axios_network_error:fallback_fetch", {
          baseUrl: candidateBaseUrl,
          candidate: `${i + 1}/${candidateBaseUrls.length}`,
        });

        try {
          const url = `${candidateBaseUrl}/api/sync`;
          const fetchResponse = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ events }),
          });

          const bodyText = await fetchResponse.text();
          const parsedBody = bodyText ? (JSON.parse(bodyText) as SyncApiResponse) : {};
          log("fetch_fallback:response", {
            status: fetchResponse.status,
            ok: fetchResponse.ok,
            bodyPreview: bodyText.slice(0, 220),
            baseUrl: candidateBaseUrl,
          });
          log("fetch_fallback:response_json", bodyText.slice(0, 2000));

          if (!fetchResponse.ok) {
            throw new Error(`Fetch fallback failed with status ${fetchResponse.status}`);
          }

          const outcome = getSyncOutcome(parsedBody, pending.map((row) => row.id));

          await markEventIdsAsProcessed(outcome.processedEventIds);
          await markEventIdsAsFailed(outcome.failedEventIds, outcome.reason ?? "Error de sincronización");

          log("queue:sync_outcome_fetch", {
            processed: outcome.processedEventIds.length,
            failed: outcome.failedEventIds.length,
          });

          if (outcome.failedEventIds.length > 0) {
            return {
              processed: outcome.processedEventIds.length,
              skipped: false,
              error: outcome.reason ?? "Errores reportados por el servidor",
            };
          }

          return { processed: outcome.processedEventIds.length, skipped: false };
        } catch (fetchError) {
          const fetchReason =
            fetchError instanceof Error ? fetchError.message : "Fetch fallback failed";
          errorLog("fetch_fallback:error", { baseUrl: candidateBaseUrl, reason: fetchReason });
          await runNetworkDiagnostics(candidateBaseUrl);
        }
      }

      if (isAxiosError(error)) {
        errorLog("response:error", {
          baseUrl: candidateBaseUrl,
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        errorLog("unknown_error", { baseUrl: candidateBaseUrl, error });
      }
    }
  }

  await markPendingAsFailed(pending, lastReason);
  warn("queue:marked_failed_attempt", { failed: pending.length, reason: lastReason });

  return { processed: 0, skipped: false, error: lastReason };
};

export const syncNow = async () => {
  if (syncInFlight) {
    log("syncNow:join_inflight");
    return syncInFlight;
  }
  syncInFlight = runSyncNow()
    .then((result) => {
      notifySyncCompleted(result);
      return result;
    })
    .finally(() => {
      syncInFlight = null;
    });
  return syncInFlight;
};

export const onSyncCompleted = (
  listener: (event: SyncCompletedEvent) => void
) => {
  syncCompletedListeners.add(listener);
  return () => {
    syncCompletedListeners.delete(listener);
  };
};

export const requestSync = (reason: string, debounceMs = 800) => {
  if (scheduledSyncTimer) {
    clearTimeout(scheduledSyncTimer);
  }

  scheduledSyncTimer = setTimeout(() => {
    scheduledSyncTimer = null;
    log("syncNow:requested", { reason });
    syncNow().catch(() => {
      errorLog("syncNow:requested_failed", { reason });
    });
  }, debounceMs);
};

export const startSyncLoop = () => {
  warn("loop:disabled_event_driven", { intervalMs: SYNC_INTERVAL_MS });
};

export const stopSyncLoop = () => {
  if (scheduledSyncTimer) {
    clearTimeout(scheduledSyncTimer);
    scheduledSyncTimer = null;
  }
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  log("loop:stopped");
};
