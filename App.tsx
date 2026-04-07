import { useEffect } from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { ActivityIndicator, View } from "react-native";
import { runMigrations } from "./src/database/migrations";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/stores/authStore";
import { useSyncStore } from "./src/stores/syncStore";

export default function App() {
  const loading = useAuthStore((state) => state.loading);
  const initAuth = useAuthStore((state) => state.init);
  const initSync = useSyncStore((state) => state.init);

  useEffect(() => {
    runMigrations()
      .then(() => initAuth())
      .then(() => initSync())
      .catch(() => {
        // Evita romper render inicial; errores se manejaran en UI/log.
      });
  }, [initAuth, initSync]);

  return (
    <PaperProvider>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <AppNavigator />
      )}
    </PaperProvider>
  );
}
