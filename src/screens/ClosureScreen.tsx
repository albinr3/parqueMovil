import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuthStore } from "../stores/authStore";
import { createShiftClosure, getShiftSummary } from "../services/closureService";

export const ClosureScreen = () => {
  const user = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState({
    totalTickets: 0,
    normalTickets: 0,
    lostTickets: 0,
    totalAmount: 0,
    normalAmount: 0,
    lostAmount: 0,
    pendingTickets: 0,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    getShiftSummary().then(setSummary).catch(() => undefined);
  }, []);

  const onCloseShift = async () => {
    if (!user) return;

    await createShiftClosure(user.id, notes);
    setMessage("Cierre guardado correctamente");
    setNotes("");
    const nextSummary = await getShiftSummary();
    setSummary(nextSummary);
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Resumen del turno</Text>
      <Text>Total motos: {summary.totalTickets}</Text>
      <Text>Normales: {summary.normalTickets} = ${summary.normalAmount}</Text>
      <Text>Perdidos: {summary.lostTickets} = ${summary.lostAmount}</Text>
      <Text variant="titleMedium">TOTAL: ${summary.totalAmount}</Text>
      <Text>Tickets pendientes: {summary.pendingTickets}</Text>

      <TextInput
        mode="outlined"
        multiline
        numberOfLines={3}
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
      />

      <Button mode="contained" onPress={onCloseShift}>CONFIRMAR CIERRE</Button>
      {Boolean(message) && <Text>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
});
