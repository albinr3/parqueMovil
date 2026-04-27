import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Chip, Text } from "react-native-paper";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";
import { TicketCard } from "../components/TicketCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";
import { Ticket } from "../types";

type HistoryFilter = "all" | "paid" | "active";

export const HistoryScreen = () => {
  const user = useAuthStore((state) => state.user);
  const tickets = useTicketStore((state) => state.tickets);
  const loadToday = useTicketStore((state) => state.loadToday);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const { showMessage } = useFeedback();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await loadToday(user?.id);
    } catch {
      showMessage({ text: "No se pudo cargar el historial", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [loadToday, showMessage, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const filteredTickets = useMemo(() => {
    if (filter === "active") {
      return tickets.filter((ticket) => ticket.status === "ACTIVE");
    }

    if (filter === "paid") {
      return tickets.filter(
        (ticket) => ticket.status === "PAID" || ticket.status === "LOST_PAID"
      );
    }

    return tickets;
  }, [filter, tickets]);

  const emptyTitle =
    filter === "all"
      ? "Sin tickets por ahora"
      : filter === "paid"
      ? "Sin tickets pagados"
      : "Sin tickets activos";

  const emptyDescription =
    filter === "all"
      ? "Aún no hay tickets registrados en el turno actual."
      : filter === "paid"
      ? "No hay tickets pagados en el turno actual."
      : "No hay tickets activos en el turno actual.";

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Historial del día</Text>
        <SecondaryAction
          icon="refresh"
          label="Actualizar"
          loading={loading}
          disabled={loading}
          onPress={() => void refresh()}
        />
      </View>

      <View style={styles.filtersRow}>
        <Chip selected={filter === "all"} compact onPress={() => setFilter("all")}>
          Todos
        </Chip>
        <Chip selected={filter === "paid"} compact onPress={() => setFilter("paid")}>
          Pagados
        </Chip>
        <Chip selected={filter === "active"} compact onPress={() => setFilter("active")}>
          Activos
        </Chip>
      </View>

      <FlatList
        style={styles.list}
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Ticket }) => <TicketCard ticket={item} />}
        ListEmptyComponent={
          <SectionCard title={emptyTitle}>
            <Text>{emptyDescription}</Text>
          </SectionCard>
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: appSpacing.sm,
  },
  filtersRow: {
    flexDirection: "row",
    gap: appSpacing.sm,
  },
  list: {
    flex: 1,
  },
});
