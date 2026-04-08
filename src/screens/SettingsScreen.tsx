import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { listPairedPrinters } from "../services/printerService";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

type PrinterDevice = {
  inner_mac_address?: string;
  device_name?: string;
};

export const SettingsScreen = () => {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const { showMessage } = useFeedback();

  const refreshPrinters = useCallback(async () => {
    try {
      setLoading(true);
      const devices = await listPairedPrinters();
      const normalized = Array.isArray(devices) ? devices : [];
      setPrinters(normalized as PrinterDevice[]);
      showMessage({ text: "Lista de impresoras actualizada", type: "info" });
    } catch {
      showMessage({ text: "No se pudo consultar impresoras", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    void refreshPrinters();
  }, [refreshPrinters]);

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Impresoras</Text>
        <SecondaryAction
          icon="refresh"
          label="Refrescar"
          loading={loading}
          disabled={loading}
          onPress={() => void refreshPrinters()}
        />
      </View>

      <FlatList
        data={printers}
        style={styles.list}
        keyExtractor={(item, index) => `${item.inner_mac_address || item.device_name || "printer"}-${index}`}
        renderItem={({ item }) => (
          <SectionCard title={item.device_name || "Sin nombre"}>
            <Text>MAC: {item.inner_mac_address || "No disponible"}</Text>
          </SectionCard>
        )}
        ListEmptyComponent={
          <SectionCard title="Sin dispositivos emparejados">
            <Text>Verifica que la impresora esté enlazada por Bluetooth en el dispositivo.</Text>
          </SectionCard>
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: appSpacing.sm,
  },
  list: {
    flex: 1,
  },
});
