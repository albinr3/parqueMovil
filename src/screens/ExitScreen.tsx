import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Modal, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Chip, Text, TextInput } from "react-native-paper";
import { useConfigStore } from "../stores/configStore";
import { useTicketStore } from "../stores/ticketStore";
import { Ticket } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";
import { PrimaryAction } from "../components/PrimaryAction";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

const extractTicketNumber = (raw: string) => {
  const digits = raw.match(/\d+/g)?.join("") ?? "";
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const ExitScreen = () => {
  const findByNumber = useTicketStore((state) => state.findByNumber);
  const findActiveByPlate = useTicketStore((state) => state.findActiveByPlate);
  const registerExit = useTicketStore((state) => state.registerExit);
  const registerLostExit = useTicketStore((state) => state.registerLostExit);
  const parkingConfig = useConfigStore((state) => state.config);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  const [ticketNumber, setTicketNumber] = useState("");
  const [plateForLost, setPlateForLost] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketSearchOrigin, setTicketSearchOrigin] = useState<"number" | "plate" | null>(
    null
  );
  const [searching, setSearching] = useState(false);
  const [processingType, setProcessingType] = useState<"normal" | "lost" | null>(
    null
  );
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const { showMessage } = useFeedback();

  useEffect(() => {
    void loadConfig({ forceRefresh: false });
  }, [loadConfig]);

  const searchActiveTicketByNumber = async (
    number: number,
    source: "manual" | "scanner"
  ) => {
    try {
      setSearching(true);
      const found = await findByNumber(number);

      if (!found) {
        setTicket(null);
        setTicketSearchOrigin(null);
        showMessage({
          text: "No existe ticket con ese numero",
          type: "warning",
        });
        return;
      }

      if (found.status !== "ACTIVE") {
        setTicket(null);
        setTicketSearchOrigin(null);
        showMessage({
          text: `El ticket #${found.ticketNumber
            .toString()
            .padStart(4, "0")} ya tiene salida registrada.`,
          type: "warning",
        });
        return;
      }

      setTicket(found);
      setTicketSearchOrigin("number");
      showMessage({
        text: `Ticket #${found.ticketNumber.toString().padStart(4, "0")} encontrado`,
        type: "success",
      });
    } catch {
      showMessage({
        text:
          source === "scanner"
            ? "No se pudo procesar el ticket escaneado"
            : "No se pudo buscar el ticket",
        type: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  const onSearch = async () => {
    if (searching || processingType) return;
    Keyboard.dismiss();

    if (!ticketNumber.trim()) {
      showMessage({ text: "Ingresa el numero de ticket", type: "warning" });
      return;
    }

    const parsed = Number(ticketNumber);
    if (Number.isNaN(parsed) || parsed <= 0) {
      showMessage({ text: "Ingresa un numero valido", type: "warning" });
      return;
    }

    await searchActiveTicketByNumber(parsed, "manual");
  };

  const onOpenScanner = async () => {
    if (searching || processingType) return;
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!permission?.granted) {
      showMessage({
        text: "Debes permitir la camara para escanear tickets.",
        type: "warning",
      });
      return;
    }

    setScannerVisible(true);
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current || searching || processingType) return;
    scanLockRef.current = true;

    const parsed = extractTicketNumber(data);
    if (!parsed) {
      showMessage({
        text: "No se pudo leer un numero de ticket en el codigo escaneado.",
        type: "warning",
      });
      scanLockRef.current = false;
      return;
    }

    setScannerVisible(false);
    setTicketNumber(String(parsed));
    await searchActiveTicketByNumber(parsed, "scanner");

    setTimeout(() => {
      scanLockRef.current = false;
    }, 800);
  };

  const confirmNormalExit = (selected: Ticket) => {
    Alert.alert(
      "Confirmar salida",
      `Registrar salida para ticket #${selected.ticketNumber
        .toString()
        .padStart(4, "0")}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: () => void onRegisterNormal(selected.id),
        },
      ]
    );
  };

  const onRegisterNormal = async (ticketId: string) => {
    if (processingType) return;

    try {
      setProcessingType("normal");
      const updated = await registerExit(ticketId);
      if (!updated) {
        showMessage({ text: "No se pudo registrar la salida.", type: "error" });
        return;
      }

      showMessage({
        text: `Salida registrada. Total ticket: ${formatCurrency(
          updated.amountCharged ?? 0
        )}`,
        type: "success",
      });
      setTicket(null);
      setTicketSearchOrigin(null);
      setTicketNumber("");
      setPlateForLost("");
    } catch {
      showMessage({ text: "No se pudo registrar la salida", type: "error" });
    } finally {
      setProcessingType(null);
    }
  };

  const confirmLostExit = (selected: Ticket) => {
    const lostRate = parkingConfig.lostTicketRate;
    Alert.alert(
      "Confirmar ticket perdido",
      `Se registrara salida del ticket #${selected.ticketNumber
        .toString()
        .padStart(4, "0")} y se agregara recargo de $${lostRate}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: () => void onRegisterLost(selected.id, lostRate),
        },
      ]
    );
  };

  const onRegisterLost = async (ticketId: string, lostRate: number) => {
    if (processingType) return;

    try {
      setProcessingType("lost");
      const updated = await registerLostExit(ticketId, lostRate);
      if (!updated) {
        showMessage({ text: "No se pudo registrar ticket perdido.", type: "error" });
        return;
      }

      showMessage({
        text: `Salida registrada con recargo de ${formatCurrency(lostRate)}.`,
        type: "success",
      });
      setTicket(null);
      setTicketSearchOrigin(null);
      setTicketNumber("");
      setPlateForLost("");
    } catch {
      showMessage({ text: "No se pudo procesar ticket perdido", type: "error" });
    } finally {
      setProcessingType(null);
    }
  };

  const onLostAction = async () => {
    if (searching || processingType) return;

    if (ticket) {
      confirmLostExit(ticket);
      return;
    }

    const normalizedPlate = plateForLost.trim().toUpperCase();
    if (!normalizedPlate) {
      showMessage({
        text: "Ingresa la placa para buscar el ticket activo.",
        type: "warning",
      });
      return;
    }

    try {
      setSearching(true);
      const found = await findActiveByPlate(normalizedPlate);
      if (!found) {
        showMessage({
          text: "No hay ticket activo para esa placa.",
          type: "warning",
        });
        return;
      }

      setTicket(found);
      setTicketSearchOrigin("plate");
      setTicketNumber(String(found.ticketNumber));
      confirmLostExit(found);
    } catch {
      showMessage({
        text: "No se pudo buscar ticket por placa.",
        type: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  const isLostSectionDisabled = ticket !== null && ticketSearchOrigin === "number";

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <SectionCard
        title="Buscar ticket activo"
        subtitle="Ingresa o escanea el ticket para registrar salida"
      >
        <TextInput
          mode="outlined"
          label="# Ticket"
          keyboardType="numeric"
          value={ticketNumber}
          onChangeText={setTicketNumber}
          maxLength={8}
        />
        <View style={styles.actionsRow}>
          <SecondaryAction
            icon="magnify"
            label="Buscar"
            loading={searching}
            disabled={searching || processingType !== null}
            style={styles.actionSplit}
            onPress={() => void onSearch()}
          />
          <SecondaryAction
            icon="camera-outline"
            label="Escanear"
            disabled={searching || processingType !== null}
            style={styles.actionSplit}
            onPress={() => void onOpenScanner()}
          />
        </View>
      </SectionCard>

      {ticket ? (
        <SectionCard title={`Ticket #${ticket.ticketNumber.toString().padStart(4, "0")}`}>
          <View style={styles.ticketRow}>
            <Text>Entrada: {formatDateTime(ticket.entryTime)}</Text>
            <Chip compact icon="clock-outline">
              Activo
            </Chip>
          </View>
          <Text>Placa: {ticket.plate || "N/A"}</Text>
          <Text>Monto entrada: {formatCurrency(ticket.entryAmountCharged)}</Text>
        </SectionCard>
      ) : (
        <SectionCard title="Esperando ticket">
          <Text variant="bodyMedium">
            Busca un ticket para habilitar Registrar salida.
          </Text>
        </SectionCard>
      )}

      <PrimaryAction
        icon="exit-run"
        buttonColor="#1F7A3D"
        label="Registrar salida"
        loading={processingType === "normal"}
        disabled={!ticket || searching || processingType !== null}
        onPress={() => ticket && confirmNormalExit(ticket)}
      />

      <View style={styles.lostSectionWrap}>
        <SectionCard
          title="Ticket perdido sin ticket fisico"
          subtitle="Si no tienes numero, busca por placa y aplica recargo"
          style={isLostSectionDisabled ? styles.lostSectionDisabled : undefined}
        >
          <TextInput
            mode="outlined"
            label="Placa"
            value={plateForLost}
            onChangeText={(value) => setPlateForLost(value.toUpperCase())}
            disabled={isLostSectionDisabled}
            autoCapitalize="characters"
            maxLength={10}
            placeholder="Ej: AB-1234"
          />
          <SecondaryAction
            icon="alert-circle-outline"
            label={`Ticket perdido +$${parkingConfig.lostTicketRate}`}
            textColor="#B42318"
            style={styles.lostButton}
            loading={processingType === "lost"}
            disabled={isLostSectionDisabled || searching || processingType !== null}
            onPress={() => void onLostAction()}
          />
        </SectionCard>
      </View>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={styles.scannerWrap}>
          <Text variant="titleMedium" style={styles.scannerTitle}>
            Escanea el codigo de barras del ticket
          </Text>
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scannerVisible ? onBarcodeScanned : undefined}
              barcodeScannerSettings={{
                barcodeTypes: ["code128", "code39", "ean13", "ean8", "upc_a"] as any,
              }}
            />
          </View>
          <SecondaryAction
            icon="close"
            label="Cerrar escaner"
            onPress={() => setScannerVisible(false)}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: appSpacing.sm,
  },
  actionSplit: {
    flex: 1,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scannerWrap: {
    flex: 1,
    padding: appSpacing.md,
    gap: appSpacing.md,
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  scannerTitle: {
    color: "#F8FAFC",
  },
  cameraFrame: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#000",
  },
  camera: {
    width: "100%",
    height: 420,
  },
  lostButton: {
    width: "68%",
    alignSelf: "center",
    marginTop: appSpacing.sm,
  },
  lostSectionWrap: {
    marginTop: appSpacing.sm,
    paddingTop: appSpacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  lostSectionDisabled: {
    opacity: 0.6,
  },
});
