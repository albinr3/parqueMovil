import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Icon, Text } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ScreenContainer } from "../components/ScreenContainer";
import { PrimaryAction } from "../components/PrimaryAction";
import { SectionCard } from "../components/SectionCard";
import {
  connectPrinter,
  disconnectPrinter,
  getBlePrinterMissingModuleMessage,
  getSavedPrinter,
  isBlePrinterModuleAvailable,
  listPairedPrinters,
} from "../services/printerService";
import { buildTicketPrintText } from "../utils/ticketPrint";
import { DEFAULT_PARKING_NAME, DEFAULT_RATES } from "../config/constants";
import { printTicketDirect } from "../services/printing/thermalPrinterService";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

type Props = NativeStackScreenProps<RootStackParamList, "Printers">;
type PrinterDevice = {
  id: string;
  name: string;
  address: string;
  connected: boolean;
};

async function requestBluetoothPermissions(): Promise<{
  granted: boolean;
  blocked: boolean;
  message?: string;
}> {
  if (Platform.OS !== "android") {
    return { granted: true, blocked: false };
  }

  try {
    const permissions =
      Platform.Version >= 31
        ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const checkResults = await Promise.all(
      permissions.map(async (permission) => ({
        permission,
        granted: await PermissionsAndroid.check(permission as never),
      }))
    );
    const missingPermissions = checkResults
      .filter((entry) => !entry.granted)
      .map((entry) => entry.permission);

    if (missingPermissions.length === 0) {
      return { granted: true, blocked: false };
    }

    const granted = await PermissionsAndroid.requestMultiple(
      missingPermissions as never
    );

    const denied = Object.entries(granted).filter(
      ([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED
    );
    if (denied.length === 0) {
      return { granted: true, blocked: false };
    }

    const blocked = denied.some(
      ([, status]) => status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    );
    const shortNames = denied
      .map(([permission]) => permission.split(".").pop())
      .join(", ");

    return {
      granted: false,
      blocked,
      message: blocked
        ? `Permisos bloqueados (${shortNames}). Debes habilitarlos desde Ajustes de Android.`
        : `Permisos denegados (${shortNames}).`,
    };
  } catch {
    return {
      granted: false,
      blocked: false,
      message: "No se pudieron solicitar permisos Bluetooth.",
    };
  }
}

export const PrinterDevicesScreen = ({ navigation }: Props) => {
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(
    null
  );
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [printingTest, setPrintingTest] = useState(false);
  const { showMessage } = useFeedback();

  const loadSavedState = useCallback(async () => {
    const savedPrinter = await getSavedPrinter();
    if (savedPrinter?.address) {
      setConnectedPrinter({
        id: String(savedPrinter.id || savedPrinter.address),
        name: String(savedPrinter.name || "Impresora"),
        address: String(savedPrinter.address),
        connected: true,
      });
      return;
    }
    setConnectedPrinter(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedState();
      void requestBluetoothPermissions().then((permissionResult) => {
        if (permissionResult.granted) return;
        const message =
          permissionResult.message ||
          "Se necesitan permisos Bluetooth para buscar impresoras.";
        if (permissionResult.blocked) {
          Alert.alert("Permisos Bluetooth", message, [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
          ]);
          return;
        }
        showMessage({ text: message, type: "warning" });
      });
    }, [loadSavedState, showMessage])
  );

  const refreshDevices = useCallback(async () => {
    setLoadingDevices(true);
    setDevices([]);
    const permissionResult = await requestBluetoothPermissions();
    if (!permissionResult.granted) {
      const message =
        permissionResult.message ||
        "Se necesitan permisos de Bluetooth para buscar impresoras.";
      if (permissionResult.blocked) {
        Alert.alert("Permisos Bluetooth", message, [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
        ]);
      } else {
        showMessage({ text: message, type: "warning" });
      }
      setLoadingDevices(false);
      return;
    }

    try {
      if (!isBlePrinterModuleAvailable()) {
        showMessage({
          text: getBlePrinterMissingModuleMessage(),
          type: "warning",
          duration: 3600,
        });
        return;
      }
      const pairedDevices = await listPairedPrinters();
      setDevices(pairedDevices);
      if (pairedDevices.length === 0) {
        showMessage({
          text: "No hay impresoras emparejadas en Bluetooth del dispositivo.",
          type: "info",
        });
      } else {
        showMessage({
          text: "Lista de impresoras actualizada",
          type: "info",
        });
      }
    } catch {
      showMessage({
        text: "No se pudieron cargar impresoras Bluetooth.",
        type: "error",
      });
    } finally {
      setLoadingDevices(false);
    }
  }, [showMessage]);

  const handleSelectPrinter = async (device: PrinterDevice) => {
    try {
      if (!isBlePrinterModuleAvailable()) {
        showMessage({
          text: getBlePrinterMissingModuleMessage(),
          type: "warning",
          duration: 3600,
        });
        return;
      }

      setConnectingAddress(device.address);
      await connectPrinter(device);
      setConnectedPrinter(device);
      showMessage({ text: `Conectado a ${device.name}`, type: "success" });
    } catch {
      showMessage({
        text: "No se pudo conectar a la impresora seleccionada.",
        type: "error",
      });
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPrinter();
      setConnectedPrinter(null);
      showMessage({ text: "Impresora desconectada", type: "info" });
    } catch {
      showMessage({ text: "No se pudo desconectar la impresora", type: "error" });
    }
  };

  const handleTestPrint = async () => {
    if (!connectedPrinter?.address) {
      showMessage({ text: "Primero selecciona una impresora", type: "warning" });
      return;
    }
    setPrintingTest(true);
    try {
      const text = buildTicketPrintText({
        parkingName: DEFAULT_PARKING_NAME,
        ticketNumber: 9999,
        plate: "TEST-58",
        entryTime: new Date().toISOString(),
        normalRate: DEFAULT_RATES.normal,
        lostRate: DEFAULT_RATES.lost,
        headerText: "Prueba de impresion 58mm",
      });
      const result = await printTicketDirect(text, connectedPrinter);
      if (!result.printed) {
        showMessage({
          text: result.message || "No se pudo imprimir la prueba.",
          type: "warning",
          duration: 3400,
        });
        return;
      }
      showMessage({ text: "Prueba enviada a la impresora", type: "success" });
    } catch {
      showMessage({ text: "No se pudo imprimir la prueba", type: "error" });
    } finally {
      setPrintingTest(false);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon source="arrow-left" size={24} />
        </TouchableOpacity>
        <Text variant="headlineSmall">Impresora</Text>
      </View>

      <SectionCard
        title={connectedPrinter?.name || "Seleccionar impresora"}
        subtitle={connectedPrinter?.address || "Aun no hay impresora conectada"}
      >
        <Text style={styles.paperText}>Formato de papel fijo: 58 mm</Text>
      </SectionCard>

      <PrimaryAction
        icon="bluetooth-connect"
        label="Buscar impresoras Bluetooth"
        loading={loadingDevices}
        disabled={loadingDevices}
        onPress={() => void refreshDevices()}
      />

      <View style={styles.devicesWrap}>
        {loadingDevices ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size={18} />
            <Text>Buscando dispositivos...</Text>
          </View>
        ) : devices.length === 0 ? (
          <SectionCard title="Sin dispositivos detectados">
            <Text>Empareja la impresora en Bluetooth del celular y vuelve a buscar.</Text>
          </SectionCard>
        ) : (
          devices.map((device) => {
            const connecting = connectingAddress === device.address;
            return (
              <TouchableOpacity
                key={device.id}
                style={styles.deviceRow}
                disabled={connecting}
                onPress={() => void handleSelectPrinter(device)}
              >
                <View style={styles.deviceMeta}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceAddress}>{device.address}</Text>
                </View>
                {connecting ? (
                  <ActivityIndicator size={16} />
                ) : (
                  <Icon source="chevron-right" size={20} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.actionsRow}>
        <PrimaryAction
          icon="printer-check"
          label="Imprimir prueba"
          loading={printingTest}
          disabled={printingTest}
          onPress={() => void handleTestPrint()}
        />
        <PrimaryAction
          icon="close-circle-outline"
          label="Desconectar impresora"
          disabled={!connectedPrinter}
          onPress={() => void handleDisconnect()}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: appSpacing.xs,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  paperText: {
    marginTop: appSpacing.xs,
    fontWeight: "700",
  },
  devicesWrap: {
    gap: appSpacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: appSpacing.xs,
  },
  deviceRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  deviceMeta: {
    flex: 1,
  },
  deviceName: {
    fontWeight: "700",
  },
  deviceAddress: {
    opacity: 0.8,
    fontSize: 12,
  },
  actionsRow: {
    gap: appSpacing.sm,
  },
});
