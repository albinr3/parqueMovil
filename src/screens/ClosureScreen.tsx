import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text, TextInput } from "react-native-paper";
import { useAuthStore } from "../stores/authStore";
import {
  createShiftClosure,
  getShiftSummary,
  hasShiftClosureToday,
} from "../services/closureService";
import { PrimaryAction } from "../components/PrimaryAction";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";
import { formatCurrency } from "../utils/format";

export const ClosureScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalTickets: 0,
    normalTickets: 0,
    lostTickets: 0,
    totalAmount: 0,
    normalAmount: 0,
    lostAmount: 0,
    pendingTickets: 0,
  });
  const [alreadyClosedToday, setAlreadyClosedToday] = useState(false);
  const { showMessage } = useFeedback();

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getShiftSummary().then(setSummary),
        hasShiftClosureToday().then(setAlreadyClosedToday),
      ]).catch(() => undefined);
    }, [])
  );

  const refreshSummary = async () => {
    const nextSummary = await getShiftSummary();
    setSummary(nextSummary);
  };

  const onCloseShift = async () => {
    if (!user || loading) return;
    if (alreadyClosedToday) {
      showMessage({ text: "El cierre de caja de hoy ya fue realizado.", type: "warning" });
      return;
    }

    Alert.alert("Confirmar cierre", "Se guardará el cierre de caja del turno actual.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        style: "default",
        onPress: () => void confirmClose(),
      },
    ]);
  };

  const confirmClose = async () => {
    if (!user || loading) return;

    try {
      setLoading(true);
      await createShiftClosure(user.id, notes.trim());
      setNotes("");
      await refreshSummary();
      setAlreadyClosedToday(true);
      showMessage({ text: "Cierre guardado correctamente", type: "success" });
    } catch {
      showMessage({ text: "No se pudo guardar el cierre", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.container}>
      <Text variant="headlineSmall">Resumen del turno</Text>

      <SectionCard title="Totales">
        <View style={styles.rowBetween}>
          <Text>Total motos</Text>
          <Text variant="titleMedium">{summary.totalTickets}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text>Normales ({summary.normalTickets})</Text>
          <Text>{formatCurrency(summary.normalAmount)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text>Perdidos ({summary.lostTickets})</Text>
          <Text>{formatCurrency(summary.lostAmount)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text variant="titleMedium">Total recaudado</Text>
          <Text variant="titleMedium">{formatCurrency(summary.totalAmount)}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Control pendiente">
        <View style={styles.rowBetween}>
          <Text>Tickets pendientes</Text>
          <Text variant="titleMedium">{summary.pendingTickets}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Notas del cierre" subtitle="Opcional">
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          label="Notas"
          value={notes}
          onChangeText={setNotes}
          maxLength={240}
        />
      </SectionCard>

      <PrimaryAction
        icon="check-decagram-outline"
        label="Confirmar cierre"
        loading={loading}
        disabled={loading || alreadyClosedToday}
        onPress={onCloseShift}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: appSpacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
