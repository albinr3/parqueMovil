import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useTicketStore } from "../stores/ticketStore";
import { Ticket } from "../types";
import { formatDateTime } from "../utils/format";

export const ExitScreen = () => {
  const findActiveByNumber = useTicketStore((state) => state.findActiveByNumber);
  const charge = useTicketStore((state) => state.charge);

  const [ticketNumber, setTicketNumber] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState("");

  const onSearch = async () => {
    const parsed = Number(ticketNumber);
    if (Number.isNaN(parsed)) {
      setMessage("Ingresa un numero valido");
      return;
    }

    const found = await findActiveByNumber(parsed);
    setTicket(found);
    setMessage(found ? "Ticket encontrado" : "No existe ticket activo con ese numero");
  };

  const onCharge = async (isLost: boolean) => {
    if (!ticket) return;

    await charge(ticket.id, isLost);
    setMessage(isLost ? "Cobrado ticket perdido ($100)" : "Cobrado ticket normal ($25)");
    setTicket(null);
    setTicketNumber("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="# Ticket"
        keyboardType="numeric"
        value={ticketNumber}
        onChangeText={setTicketNumber}
      />
      <Button mode="contained" onPress={onSearch}>BUSCAR</Button>

      {ticket && (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">Ticket #{ticket.ticketNumber.toString().padStart(4, "0")}</Text>
            <Text>Entrada: {formatDateTime(ticket.entryTime)}</Text>
            <Text>Placa: {ticket.plate || "N/A"}</Text>
          </Card.Content>
        </Card>
      )}

      <Button mode="contained" buttonColor="#16A34A" disabled={!ticket} onPress={() => onCharge(false)}>
        COBRAR $25
      </Button>
      <Button mode="contained" buttonColor="#DC2626" disabled={!ticket} onPress={() => onCharge(true)}>
        TICKET PERDIDO $100
      </Button>

      {Boolean(message) && <Text>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
