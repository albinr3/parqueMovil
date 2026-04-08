import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, TextInput } from "react-native-paper";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";
import { buildTicketPrintText } from "../utils/ticketPrint";
import { printText } from "../services/printerService";
import { DEFAULT_PARKING_NAME, DEFAULT_RATES } from "../config/constants";
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
  const addTicket = useTicketStore((state) => state.addTicket);
  const [plate, setPlate] = useState("");
  const [loadingAction, setLoadingAction] = useState<"print" | "save" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showMessage } = useFeedback();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCreate = async (printAfterCreate: boolean) => {
    if (!user || loadingAction) return;

    const normalizedPlate = plate.trim().toUpperCase();
    if (normalizedPlate && !PLATE_REGEX.test(normalizedPlate)) {
      showMessage({
        text: "La placa debe tener entre 4 y 10 caracteres (A-Z, 0-9 o -)",
        type: "warning",
      });
      return;
    }

    try {
      setLoadingAction(printAfterCreate ? "print" : "save");
      const ticket = await addTicket(user.id, normalizedPlate || undefined);

      if (printAfterCreate) {
        const text = buildTicketPrintText({
          parkingName: DEFAULT_PARKING_NAME,
          ticketNumber: ticket.ticketNumber,
          plate: ticket.plate,
          entryTime: ticket.entryTime,
          normalRate: DEFAULT_RATES.normal,
          lostRate: DEFAULT_RATES.lost,
        });

        const printResult = await printText(text);
        if (printResult.ok) {
          showMessage({ text: "Ticket creado e impreso", type: "success" });
        } else {
          showMessage({
            text: `Ticket creado, pero falló impresión: ${printResult.error}`,
            type: "warning",
            duration: 3400,
          });
        }
      } else {
        showMessage({ text: "Ticket creado correctamente", type: "success" });
      }

      setPlate("");
      timeoutRef.current = setTimeout(() => navigation.goBack(), 900);
    } catch {
      showMessage({ text: "No se pudo crear el ticket", type: "error" });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <Text variant="headlineSmall">Generar ticket</Text>
      <SectionCard title="Datos de entrada" subtitle="La placa es opcional">
        <TextInput
          label="Placa"
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
        label="Imprimir y guardar"
        loading={loadingAction === "print"}
        disabled={loadingAction !== null}
        onPress={() => void handleCreate(true)}
      />
      <SecondaryAction
        icon="content-save-outline"
        label="Guardar sin imprimir"
        loading={loadingAction === "save"}
        disabled={loadingAction !== null}
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
