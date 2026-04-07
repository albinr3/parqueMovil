import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { listPairedPrinters } from "../services/printerService";

export const SettingsScreen = () => {
  const [printers, setPrinters] = useState<{ inner_mac_address?: string; device_name?: string }[]>([]);

  useEffect(() => {
    listPairedPrinters().then((devices) => {
      const normalized = Array.isArray(devices) ? devices : [];
      setPrinters(normalized as { inner_mac_address?: string; device_name?: string }[]);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Impresoras</Text>
      <Button mode="outlined" onPress={async () => setPrinters((await listPairedPrinters()) as { inner_mac_address?: string; device_name?: string }[])}>
        Refrescar dispositivos
      </Button>
      {printers.map((printer, index) => (
        <View key={`${printer.inner_mac_address || printer.device_name || "printer"}-${index}`}>
          <Text>{printer.device_name || "Sin nombre"}</Text>
          <Text>{printer.inner_mac_address || "MAC no disponible"}</Text>
        </View>
      ))}
      {!printers.length && <Text>No se detectaron impresoras emparejadas.</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
});
