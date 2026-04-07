import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { StatusBadge } from "./StatusBadge";
import { useSyncStore } from "../stores/syncStore";
import { formatTimeOnly } from "../utils/format";

export const SyncIndicator = () => {
  const forceSync = useSyncStore((state) => state.forceSync);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);

  return (
    <View style={styles.wrap}>
      <StatusBadge />
      <Button mode="text" onPress={forceSync}>Sincronizar</Button>
      <Text variant="bodySmall">{lastSyncAt ? `Ult: ${formatTimeOnly(lastSyncAt)}` : "Sin sincronizar"}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6 },
});
