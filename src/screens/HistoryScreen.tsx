import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "react-native-paper";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryAction } from "../components/SecondaryAction";
import { SectionCard } from "../components/SectionCard";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";
import { TicketCard } from "../components/TicketCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

export const HistoryScreen = () => {
  const user = useAuthStore((state) => state.user);
  const tickets = useTicketStore((state) => state.tickets);
  const loadToday = useTicketStore((state) => state.loadToday);
  const [loading, setLoading] = useState(false);
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

      <FlatList
        style={styles.list}
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TicketCard ticket={item} />}
        ListEmptyComponent={
          <SectionCard title="Sin tickets por ahora">
            <Text>Aún no hay tickets registrados en el turno actual.</Text>
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
  list: {
    flex: 1,
  },
});
