import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, TextInput } from "react-native-paper";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useConfigStore } from "../stores/configStore";
import { useTicketStore } from "../stores/ticketStore";
import { ShiftClosedForTodayError } from "../services/ticketService";
import { buildTicketPrintText, getTicketBarcodeValue } from "../utils/ticketPrint";
import { printTextWithBarcode } from "../services/printerService";
import { PrimaryAction } from "../components/PrimaryAction";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

type Props = NativeStackScreenProps<RootStackParamList, "NewTicket">;
const PLATE_REGEX = /^[A-Z0-9-]{4,10}$/;

export const NewTicketScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);
  const parkingConfig = useConfigStore((state) => state.config);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const addTicket = useTicketStore((state) => state.addTicket);
  const [plate, setPlate] = useState("");
  const [loadingAction, setLoadingAction] = useState<"print" | "save" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showMessage } = useFeedback();

  useEffect(() => {
    void loadConfig({ forceRefresh: false });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loadConfig]);

  const handleCreate = async (printAfterCreate: boolean) => {
    if (!user || loadingAction) return;

    const normalizedPlate = plate.trim().toUpperCase();
    if (!normalizedPlate) {
      showMessage({
        text: "La placa es obligatoria para crear el ticket",
        type: "warning",
      });
      return;
    }

    if (!PLATE_REGEX.test(normalizedPlate)) {
      showMessage({
        text: "La placa debe tener entre 4 y 10 caracteres (A-Z, 0-9 o -)",
        type: "warning",
      });
      return;
    }

    try {
      setLoadingAction(printAfterCreate ? "print" : "save");
      const config = await loadConfig({ forceRefresh: false });
      const ticket = await addTicket(user.id, normalizedPlate, config.normalRate);

      if (printAfterCreate) {
        const text = buildTicketPrintText({
          parkingName: config.parkingName,
          ticketNumber: ticket.ticketNumber,
          plate: ticket.plate,
          entryTime: ticket.entryTime,
          normalRate: config.normalRate,
          lostRate: config.lostTicketRate,
          headerText: config.ticketHeader,
        });

        const printResult = await printTextWithBarcode(
          text,
          getTicketBarcodeValue(ticket.ticketNumber)
        );
        if (printResult.ok) {
          if (printResult.warning) {
            showMessage({
              text: `Ticket creado. ${printResult.warning}`,
              type: "warning",
              duration: 3600,
            });
          } else {
            showMessage({ text: "Ticket creado, cobrado e impreso", type: "success" });
          }
        } else {
          showMessage({
            text: `Ticket creado, pero falló impresión: ${printResult.error}`,
            type: "warning",
            duration: 3400,
          });
        }
      } else {
        showMessage({
          text: `Ticket creado y cobrado por $${ticket.entryAmountCharged}`,
          type: "success",
        });
      }

      setPlate("");
      timeoutRef.current = setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      if (error instanceof ShiftClosedForTodayError) {
        showMessage({
          text: "Ya se realizó el cierre de caja de hoy. No se pueden crear más tickets.",
          type: "warning",
        });
      } else {
        showMessage({ text: "No se pudo crear el ticket", type: "error" });
      }
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <Text variant="headlineSmall">Generar ticket</Text>
      <SectionCard
        title="Datos de entrada"
        subtitle={`Tarifa actual: $${parkingConfig.normalRate} (ticket perdido +$${parkingConfig.lostTicketRate})`}
      >
        <TextInput
          label="Placa *"
          value={plate}
          onChangeText={(value) => setPlate(value.toUpperCase())}
          mode="outlined"
          autoCapitalize="characters"
          maxLength={10}
          placeholder="Ej: AB-1234"
        />
      </SectionCard>

      <PrimaryAction
        icon="printer"
        label={`Imprimir y cobrar $${parkingConfig.normalRate}`}
        loading={loadingAction === "print"}
        disabled={loadingAction !== null || !plate.trim()}
        onPress={() => void handleCreate(true)}
      />
      <SecondaryAction
        icon="content-save-outline"
        label={`Guardar y cobrar $${parkingConfig.normalRate}`}
        loading={loadingAction === "save"}
        disabled={loadingAction !== null || !plate.trim()}
        onPress={() => void handleCreate(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
});
