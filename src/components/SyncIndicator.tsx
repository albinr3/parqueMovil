import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { StatusBadge } from "./StatusBadge";
import { useSyncStore } from "../stores/syncStore";
import { formatTimeOnly } from "../utils/format";
import { useFeedback } from "../contexts/FeedbackContext";

export const SyncIndicator = () => {
  const forceSync = useSyncStore((state) => state.forceSync);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const { showMessage } = useFeedback();
  const [syncing, setSyncing] = useState(false);

  const onSyncPress = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      await forceSync();
      showMessage({ text: "Sincronización solicitada", type: "info" });
    } catch {
      showMessage({ text: "No se pudo sincronizar en este momento", type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <StatusBadge />
      <Button mode="text" compact loading={syncing} disabled={syncing} onPress={onSyncPress}>
        Sync
      </Button>
      <Text variant="bodySmall">{lastSyncAt ? `Ult: ${formatTimeOnly(lastSyncAt)}` : "Sin sincronizar"}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
