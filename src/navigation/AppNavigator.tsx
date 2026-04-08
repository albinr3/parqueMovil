import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAuthStore } from "../stores/authStore";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NewTicketScreen } from "../screens/NewTicketScreen";
import { ExitScreen } from "../screens/ExitScreen";
import { ClosureScreen } from "../screens/ClosureScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PrinterDevicesScreen } from "../screens/PrinterDevicesScreen";
import { appNavigationTheme, appTheme } from "../theme/theme";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  NewTicket: undefined;
  Exit: undefined;
  Closure: undefined;
  History: undefined;
  Settings: undefined;
  Printers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeHeaderTitle = () => (
  <View style={styles.homeTitleWrap}>
    <Image source={require("../../assets/logo.jpg")} style={styles.homeTitleLogo} />
    <Text variant="titleMedium" numberOfLines={1} style={styles.homeTitleText}>
      Parqueo Moto Badia
    </Text>
  </View>
);

export const AppNavigator = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer theme={appNavigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: appTheme.colors.surface,
          },
          headerTintColor: appTheme.colors.onSurface,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: appTheme.colors.background,
          },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerTitle: HomeHeaderTitle,
              }}
            />
            <Stack.Screen name="NewTicket" component={NewTicketScreen} options={{ title: "Nuevo Ticket" }} />
            <Stack.Screen name="Exit" component={ExitScreen} options={{ title: "Registrar Salida" }} />
            <Stack.Screen name="Closure" component={ClosureScreen} options={{ title: "Cierre de Caja" }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Historial" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Configuración" }} />
            <Stack.Screen name="Printers" component={PrinterDevicesScreen} options={{ title: "Impresoras" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  homeTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeTitleLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  homeTitleText: {
    fontWeight: "700",
  },
});
