import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { Ticket } from "../types";
import { formatDateTime, formatCurrency } from "../utils/format";

export const TicketCard = ({ ticket }: { ticket: Ticket }) => (
  <Card style={styles.card}>
    <Card.Content>
      <View style={styles.row}>
        <Text variant="titleMedium">#{ticket.ticketNumber.toString().padStart(4, "0")}</Text>
        <Text>{ticket.status}</Text>
      </View>
      <Text>Entrada: {formatDateTime(ticket.entryTime)}</Text>
      <Text>Placa: {ticket.plate || "N/A"}</Text>
      <Text>Monto: {ticket.amountCharged ? formatCurrency(ticket.amountCharged) : "Pendiente"}</Text>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
});
