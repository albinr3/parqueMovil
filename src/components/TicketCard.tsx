import { StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";
import { Ticket } from "../types";
import { formatDateTime, formatCurrency } from "../utils/format";
import { appSpacing } from "../theme/theme";

const statusMeta: Record<Ticket["status"], { label: string; icon: string }> = {
  ACTIVE: { label: "Activo", icon: "clock-outline" },
  PAID: { label: "Pagado", icon: "check-circle-outline" },
  LOST_PAID: { label: "Perdido", icon: "alert-circle-outline" },
  CANCELLED: { label: "Anulado", icon: "close-circle-outline" },
};

export const TicketCard = ({ ticket }: { ticket: Ticket }) => (
  <Card style={styles.card}>
    <Card.Content style={styles.content}>
      <View style={styles.row}>
        <Text variant="titleMedium">#{ticket.ticketNumber.toString().padStart(4, "0")}</Text>
        <Chip compact icon={statusMeta[ticket.status].icon}>{statusMeta[ticket.status].label}</Chip>
      </View>
      <Text>Entrada: {formatDateTime(ticket.entryTime)}</Text>
      <Text>Placa: {ticket.plate || "N/A"}</Text>
      <Text>Monto: {ticket.amountCharged != null ? formatCurrency(ticket.amountCharged) : "Pendiente"}</Text>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: appSpacing.sm,
    borderRadius: 14,
  },
  content: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
});
