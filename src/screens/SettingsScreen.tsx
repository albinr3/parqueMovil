import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "react-native-paper";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { getSavedPrinter } from "../services/printerService";
import { resetLocalDatabase } from "../services/maintenanceService";
import { useAuthStore } from "../stores/authStore";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export const SettingsScreen = ({ navigation }: Props) => {
  const logout = useAuthStore((state) => state.logout);
  const [printerName, setPrinterName] = useState("Sin impresora conectada");
  const [printerAddress, setPrinterAddress] = useState(
    "Abre la configuracion para conectar una impresora Bluetooth."
  );
  const [resettingDb, setResettingDb] = useState(false);
  const { showMessage } = useFeedback();

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

  const onResetDatabase = () => {
    if (resettingDb) return;

    Alert.alert(
      "Blanquear base local",
      "Se eliminarán TODOS los datos locales (tickets, cierres, cola de sync, usuarios y configuración cacheada). El próximo ticket volverá a #1.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmación final",
              "¿Seguro que quieres borrar todo y empezar de cero?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sí, borrar",
                  style: "destructive",
                  onPress: () => void confirmResetDatabase(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmResetDatabase = async () => {
    if (resettingDb) return;

    try {
      setResettingDb(true);
      await resetLocalDatabase();
      await logout();
      showMessage({
        text: "Base local blanqueada. Se cerró sesión.",
        type: "success",
      });
    } catch {
      showMessage({
        text: "No se pudo blanquear la base local.",
        type: "error",
      });
    } finally {
      setResettingDb(false);
    }
  };

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

      <SectionCard title="Mantenimiento" subtitle="Acciones de sistema">
        <SecondaryAction
          icon="database-remove-outline"
          label="Blanquear base local"
          textColor="#B42318"
          loading={resettingDb}
          disabled={resettingDb}
          onPress={onResetDatabase}
        />
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
