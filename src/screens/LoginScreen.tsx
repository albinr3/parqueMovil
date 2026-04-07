import { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useAuthStore } from "../stores/authStore";
import { NumPad } from "../components/NumPad";

export const LoginScreen = () => {
  const users = useAuthStore((state) => state.users);
  const login = useAuthStore((state) => state.login);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const selectedName = useMemo(
    () => users.find((u) => u.id === selectedUserId)?.name ?? "Selecciona empleado",
    [selectedUserId, users]
  );

  const onKeyPress = async (key: string) => {
    if (key === "←") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "✓") {
      if (!selectedUserId) {
        setError("Debes seleccionar empleado");
        return;
      }

      const ok = await login(selectedUserId, pin);
      if (!ok) {
        setError("PIN invalido");
      } else {
        setError("");
        setPin("");
      }
      return;
    }

    if (pin.length >= 4) return;
    setPin((prev) => `${prev}${key}`);
  };

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/logo.jpg")} style={styles.logo} />
      <Text variant="headlineSmall" style={styles.title}>Parqueo Moto Badia</Text>

      <View style={styles.usersWrap}>
        {users.map((user) => (
          <Button
            key={user.id}
            mode={selectedUserId === user.id ? "contained" : "outlined"}
            onPress={() => setSelectedUserId(user.id)}
          >
            {user.name}
          </Button>
        ))}
      </View>

      <Text style={styles.selected}>{selectedName}</Text>
      <Text variant="headlineMedium">{"●".repeat(pin.length)}{"○".repeat(4 - pin.length)}</Text>
      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <NumPad onKeyPress={onKeyPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 14 },
  logo: { width: 120, height: 120, borderRadius: 20 },
  title: { fontWeight: "700" },
  usersWrap: { flexDirection: "row", gap: 8 },
  selected: { color: "#6B7280" },
  error: { color: "#DC2626", fontWeight: "600" },
});
