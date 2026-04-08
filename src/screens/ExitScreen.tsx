import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Chip, Text, TextInput } from "react-native-paper";
import { useTicketStore } from "../stores/ticketStore";
import { Ticket } from "../types";
import { formatDateTime } from "../utils/format";
import { PrimaryAction } from "../components/PrimaryAction";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";
import { DEFAULT_RATES } from "../config/constants";

export const ExitScreen = () => {
  const findActiveByNumber = useTicketStore((state) => state.findActiveByNumber);
  const charge = useTicketStore((state) => state.charge);

  const [ticketNumber, setTicketNumber] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [searching, setSearching] = useState(false);
  const [chargingType, setChargingType] = useState<"normal" | "lost" | null>(null);
  const { showMessage } = useFeedback();

  const onSearch = async () => {
    if (searching || chargingType) return;

    if (!ticketNumber.trim()) {
      showMessage({ text: "Ingresa el número de ticket", type: "warning" });
      return;
    }

    const parsed = Number(ticketNumber);
    if (Number.isNaN(parsed) || parsed <= 0) {
      showMessage({ text: "Ingresa un número válido", type: "warning" });
      return;
    }

    try {
      setSearching(true);
      const found = await findActiveByNumber(parsed);
      setTicket(found);
      showMessage({
        text: found ? "Ticket encontrado" : "No existe ticket activo con ese número",
        type: found ? "success" : "warning",
      });
    } catch {
      showMessage({ text: "No se pudo buscar el ticket", type: "error" });
    } finally {
      setSearching(false);
    }
  };

  const onCharge = async (isLost: boolean) => {
    if (!ticket || chargingType) return;

    const type = isLost ? "lost" : "normal";
    const amount = isLost ? DEFAULT_RATES.lost : DEFAULT_RATES.normal;
    const message = isLost ? "ticket perdido" : "ticket normal";

    Alert.alert(
      "Confirmar cobro",
      `Vas a cobrar ${message} por $${amount}. ¿Deseas continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: () => void confirmCharge(type, isLost, amount),
        },
      ]
    );
  };

  const confirmCharge = async (type: "normal" | "lost", isLost: boolean, amount: number) => {
    if (!ticket || chargingType) return;

    try {
      setChargingType(type);
      await charge(ticket.id, isLost);
      showMessage({
        text: `Cobro realizado por $${amount}`,
        type: "success",
      });
      setTicket(null);
      setTicketNumber("");
    } catch {
      showMessage({ text: "No se pudo procesar el cobro", type: "error" });
    } finally {
      setChargingType(null);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <SectionCard title="Buscar ticket activo" subtitle="Ingresa el número del ticket para cobrar salida">
        <TextInput
          mode="outlined"
          label="# Ticket"
          keyboardType="numeric"
          value={ticketNumber}
          onChangeText={setTicketNumber}
          maxLength={6}
        />
        <SecondaryAction
          icon="magnify"
          label="Buscar"
          loading={searching}
          disabled={searching || chargingType !== null}
          onPress={() => void onSearch()}
        />
      </SectionCard>

      {ticket ? (
        <SectionCard title={`Ticket #${ticket.ticketNumber.toString().padStart(4, "0")}`}>
          <View style={styles.ticketRow}>
            <Text>Entrada: {formatDateTime(ticket.entryTime)}</Text>
            <Chip compact icon="clock-outline">Activo</Chip>
          </View>
          <Text>Placa: {ticket.plate || "N/A"}</Text>
        </SectionCard>
      ) : (
        <SectionCard title="Esperando ticket">
          <Text variant="bodyMedium">Busca un ticket para habilitar las acciones de cobro.</Text>
        </SectionCard>
      )}

      <PrimaryAction
        icon="cash-check"
        buttonColor="#1F7A3D"
        label={`Cobrar $${DEFAULT_RATES.normal}`}
        loading={chargingType === "normal"}
        disabled={!ticket || searching || chargingType !== null}
        onPress={() => onCharge(false)}
      />
      <PrimaryAction
        icon="alert-circle-outline"
        buttonColor="#B42318"
        label={`Ticket perdido $${DEFAULT_RATES.lost}`}
        loading={chargingType === "lost"}
        disabled={!ticket || searching || chargingType !== null}
        onPress={() => onCharge(true)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
