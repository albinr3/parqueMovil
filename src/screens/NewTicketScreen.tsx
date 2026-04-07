import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Text, TextInput } from "react-native-paper";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../stores/authStore";
import { useTicketStore } from "../stores/ticketStore";
import { buildTicketPrintText } from "../utils/ticketPrint";
import { printText } from "../services/printerService";
import { DEFAULT_PARKING_NAME, DEFAULT_RATES } from "../config/constants";

type Props = NativeStackScreenProps<RootStackParamList, "NewTicket">;

export const NewTicketScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);
  const addTicket = useTicketStore((state) => state.addTicket);
  const [plate, setPlate] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async (printAfterCreate: boolean) => {
    if (!user) return;

    const ticket = await addTicket(user.id, plate);

    if (printAfterCreate) {
      const text = buildTicketPrintText({
        parkingName: DEFAULT_PARKING_NAME,
        ticketNumber: ticket.ticketNumber,
        plate: ticket.plate,
        entryTime: ticket.entryTime,
        normalRate: DEFAULT_RATES.normal,
        lostRate: DEFAULT_RATES.lost,
      });

      const printResult = await printText(text);
      setMessage(printResult.ok ? "Ticket creado e impreso" : `Ticket creado. Error al imprimir: ${printResult.error}`);
    } else {
      setMessage("Ticket creado");
    }

    setPlate("");
    setTimeout(() => navigation.goBack(), 1000);
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Generar ticket</Text>
      <TextInput label="Placa (opcional)" value={plate} onChangeText={setPlate} mode="outlined" />

      <Button mode="contained" onPress={() => handleCreate(true)}>
        IMPRIMIR Y GUARDAR
      </Button>
      <Button mode="outlined" onPress={() => handleCreate(false)}>
        Guardar sin imprimir
      </Button>

      {Boolean(message) && <Text>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
