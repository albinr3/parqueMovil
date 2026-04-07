import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Card, Text } from "react-native-paper";
import { Header } from "../components/Header";
import { BigButton } from "../components/BigButton";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loadToday = useTicketStore((state) => state.loadToday);
  const tickets = useTicketStore((state) => state.tickets);
  const activeTickets = useTicketStore((state) => state.activeTickets);

  useEffect(() => {
    loadToday().catch(() => undefined);
  }, [loadToday]);

  const totalRecaudado = tickets.reduce((sum, t) => sum + (t.amountCharged ?? 0), 0);

  return (
    <View style={styles.container}>
      <Header employeeName={user?.name || ""} />

      <Card style={styles.summary}>
        <Card.Content>
          <Text variant="titleLarge">Turno Actual</Text>
          <Text>Motos atendidas: {tickets.length}</Text>
          <Text>Motos activas: {activeTickets}</Text>
          <Text>Recaudado: ${totalRecaudado}</Text>
        </Card.Content>
      </Card>

      <BigButton icon="ticket" label="NUEVO TICKET" color="#16A34A" onPress={() => navigation.navigate("NewTicket")} />
      <BigButton icon="cash" label="COBRAR SALIDA" color="#EE8600" onPress={() => navigation.navigate("Exit")} />
      <BigButton icon="clipboard-text" label="CERRAR CAJA" color="#2563EB" onPress={() => navigation.navigate("Closure")} />

      <View style={styles.footerActions}>
        <Button mode="outlined" onPress={() => navigation.navigate("History")}>Historial</Button>
        <Button mode="outlined" onPress={() => navigation.navigate("Settings")}>Ajustes</Button>
        <Button onPress={logout}>Salir</Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  summary: { marginBottom: 6 },
  footerActions: { flexDirection: "row", justifyContent: "space-between", marginTop: "auto" },
});
