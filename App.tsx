import { useEffect } from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { ActivityIndicator, AppState, Platform, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { runMigrations } from "./src/database/migrations";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/stores/authStore";
import { useSyncStore } from "./src/stores/syncStore";
import { FeedbackProvider } from "./src/contexts/FeedbackContext";
import { appTheme } from "./src/theme/theme";

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

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const hideNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {
        // Ignora errores del sistema/dispositivo.
      }
    };

    void hideNavigationBar();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void hideNavigationBar();
      }
    });

    const visibilitySub = NavigationBar.addVisibilityListener(({ visibility }) => {
      if (visibility === "visible") {
        void hideNavigationBar();
      }
    });

    return () => {
      appStateSub.remove();
      visibilitySub.remove();
    };
  }, []);

  return (
    <PaperProvider theme={appTheme}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FeedbackProvider>
          <AppNavigator />
        </FeedbackProvider>
      )}
    </PaperProvider>
  );
}
