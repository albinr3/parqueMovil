import { useCallback, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { PrimaryAction } from "../components/PrimaryAction";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { SecondaryAction } from "../components/SecondaryAction";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";
import { appSpacing } from "../theme/theme";
import { formatCurrency } from "../utils/format";
import { hasShiftClosureToday } from "../services/closureService";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loadToday = useTicketStore((state) => state.loadToday);
  const tickets = useTicketStore((state) => state.tickets);
  const activeTickets = useTicketStore((state) => state.activeTickets);
  const [isShiftClosedToday, setIsShiftClosedToday] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        loadToday(user?.id),
        hasShiftClosureToday().then(setIsShiftClosedToday),
      ]).catch(() => undefined);
    }, [loadToday, user?.id])
  );

  const onLogoutPress = async () => {
    const shiftClosed = await hasShiftClosureToday().catch(() => true);
    if (shiftClosed) {
      await logout();
      return;
    }

    Alert.alert(
      "Cierre pendiente",
      "Aún no has cerrado caja hoy. Si sales ahora, recuerda hacer el cierre luego.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir de todos modos",
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ]
    );
  };

  const totalRecaudado = tickets.reduce((sum, t) => sum + (t.amountCharged ?? 0), 0);
  const bottomSafePadding =
    appSpacing.md +
    (Platform.OS === "android"
      ? Math.max(insets.bottom, appSpacing.xl)
      : insets.bottom);

  return (
    <ScreenContainer
      contentContainerStyle={[styles.container, { paddingBottom: bottomSafePadding }]}
    >
      <Header />

      <SectionCard title="Turno actual" subtitle="Resumen en tiempo real del día">
        <Text variant="bodyMedium" style={styles.contextLine}>
          Encargado: {user?.name || "N/A"}
        </Text>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text variant="headlineSmall">{tickets.length}</Text>
            <Text variant="bodySmall">Motos atendidas</Text>
          </View>
          <View style={styles.metric}>
            <Text variant="headlineSmall">{activeTickets}</Text>
            <Text variant="bodySmall">Motos activas</Text>
          </View>
          <View style={styles.metric}>
            <Text variant="headlineSmall">{formatCurrency(totalRecaudado)}</Text>
            <Text variant="bodySmall">Recaudado</Text>
          </View>
        </View>
      </SectionCard>

      <View style={styles.mainActions}>
        <PrimaryAction
          icon="ticket"
          label="Nuevo Ticket"
          buttonColor="#1F7A3D"
          disabled={isShiftClosedToday}
          onPress={() => navigation.navigate("NewTicket")}
        />
        <PrimaryAction icon="gate-open" label="Registrar Salida" buttonColor="#D97706" onPress={() => navigation.navigate("Exit")} />
        <PrimaryAction
          icon="clipboard-check-outline"
          label="Cerrar Caja"
          buttonColor="#1D4ED8"
          disabled={isShiftClosedToday}
          onPress={() => navigation.navigate("Closure")}
        />
      </View>

      <View style={styles.footerActions}>
        <SecondaryAction icon="history" label="Historial" style={styles.secondaryItem} onPress={() => navigation.navigate("History")} />
        <SecondaryAction icon="cog-outline" label="Ajustes" style={styles.secondaryItem} onPress={() => navigation.navigate("Settings")} />
        <SecondaryAction
          icon="logout"
          label="Salir"
          style={styles.secondaryItem}
          onPress={() => void onLogoutPress()}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
    paddingTop: 0,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: appSpacing.sm,
  },
  contextLine: {
    opacity: 0.8,
  },
  metric: {
    minWidth: "31%",
    flexGrow: 1,
    padding: appSpacing.md,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    gap: 2,
  },
  mainActions: {
    gap: appSpacing.sm,
  },
  footerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: appSpacing.sm,
    marginTop: "auto",
  },
  secondaryItem: {
    flexBasis: "48%",
    flexGrow: 1,
  },
});
