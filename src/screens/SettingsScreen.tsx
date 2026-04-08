import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "react-native-paper";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { getSavedPrinter } from "../services/printerService";
import { appSpacing } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export const SettingsScreen = ({ navigation }: Props) => {
  const [printerName, setPrinterName] = useState("Sin impresora conectada");
  const [printerAddress, setPrinterAddress] = useState(
    "Abre la configuracion para conectar una impresora Bluetooth."
  );

  const refreshPrinterStatus = useCallback(async () => {
    const printer = await getSavedPrinter();
    if (!printer?.address) {
      setPrinterName("Sin impresora conectada");
      setPrinterAddress(
        "Abre la configuracion para conectar una impresora Bluetooth."
      );
      return;
    }
    setPrinterName(String(printer.name || "Impresora"));
    setPrinterAddress(String(printer.address));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPrinterStatus();
    }, [refreshPrinterStatus])
  );

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <Text variant="headlineSmall">Configuración</Text>

      <SectionCard title="Impresoras" subtitle="Bluetooth termica">
        <View style={styles.row}>
          <View style={styles.meta}>
            <Text style={styles.name}>{printerName}</Text>
            <Text style={styles.address}>{printerAddress}</Text>
            <Text style={styles.paperHint}>Papel configurado: 58 mm</Text>
          </View>
          <SecondaryAction
            icon="printer-cog"
            label="Configurar"
            onPress={() => navigation.navigate("Printers")}
          />
        </View>
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: appSpacing.sm,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontWeight: "700",
  },
  address: {
    fontSize: 12,
    opacity: 0.8,
  },
  paperHint: {
    fontSize: 12,
    fontWeight: "700",
  },
});
