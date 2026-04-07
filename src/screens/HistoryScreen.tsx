import { useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useTicketStore } from "../stores/ticketStore";
import { TicketCard } from "../components/TicketCard";

export const HistoryScreen = () => {
  const tickets = useTicketStore((state) => state.tickets);
  const loadToday = useTicketStore((state) => state.loadToday);

  useEffect(() => {
    loadToday().catch(() => undefined);
  }, [loadToday]);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Historial del dia</Text>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TicketCard ticket={item} />}
        ListEmptyComponent={<Text>No hay tickets todavia.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
});
