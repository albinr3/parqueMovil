import { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useAuthStore } from "../stores/authStore";
import { NumPad } from "../components/NumPad";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionCard } from "../components/SectionCard";
import { appSpacing } from "../theme/theme";
import { useFeedback } from "../contexts/FeedbackContext";

export const LoginScreen = () => {
  const users = useAuthStore((state) => state.users);
  const login = useAuthStore((state) => state.login);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showMessage } = useFeedback();

  const selectedName = useMemo(
    () => users.find((u) => u.id === selectedUserId)?.name ?? "Selecciona empleado",
    [selectedUserId, users]
  );

  const onKeyPress = async (key: string) => {
    if (submitting) return;

    if (key === "←") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "✓") {
      if (!selectedUserId) {
        showMessage({ text: "Debes seleccionar empleado", type: "warning" });
        return;
      }

      if (pin.length !== 4) {
        showMessage({ text: "El PIN debe tener 4 dígitos", type: "warning" });
        return;
      }

      setSubmitting(true);
      const ok = await login(selectedUserId, pin);
      setSubmitting(false);

      if (ok) {
        setPin("");
      } else {
        showMessage({ text: "PIN inválido, verifica e intenta de nuevo", type: "error" });
      }
      return;
    }

    if (pin.length >= 4) return;
    setPin((prev) => `${prev}${key}`);
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <Image source={require("../../assets/logo.jpg")} style={styles.logo} />
      <Text variant="headlineSmall" style={styles.title}>Parqueo Moto Badia</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Acceso de personal</Text>

      <SectionCard title="Selecciona empleado" style={styles.section}>
        <View style={styles.usersWrap}>
          {users.map((user) => (
            <Button
              key={user.id}
              mode={selectedUserId === user.id ? "contained" : "outlined"}
              onPress={() => setSelectedUserId(user.id)}
              style={styles.userButton}
              contentStyle={styles.userButtonContent}
            >
              {user.name}
            </Button>
          ))}
        </View>
      </SectionCard>

      <Text style={styles.selected}>{selectedName}</Text>
      <Text variant="headlineMedium">{`${"●".repeat(pin.length)}${"○".repeat(4 - pin.length)}`}</Text>

      <NumPad
        onKeyPress={onKeyPress}
        disabled={submitting}
        disableConfirm={!selectedUserId || pin.length !== 4}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: appSpacing.md,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.7,
  },
  section: {
    width: "100%",
  },
  usersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: appSpacing.sm,
  },
  userButton: {
    flexGrow: 1,
    borderRadius: 12,
  },
  userButtonContent: {
    minHeight: 48,
  },
  selected: {
    color: "#667085",
  },
});
