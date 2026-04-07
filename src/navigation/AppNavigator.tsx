import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../stores/authStore";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NewTicketScreen } from "../screens/NewTicketScreen";
import { ExitScreen } from "../screens/ExitScreen";
import { ClosureScreen } from "../screens/ClosureScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  NewTicket: undefined;
  Exit: undefined;
  Closure: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Inicio" }} />
            <Stack.Screen name="NewTicket" component={NewTicketScreen} options={{ title: "Nuevo Ticket" }} />
            <Stack.Screen name="Exit" component={ExitScreen} options={{ title: "Cobrar Salida" }} />
            <Stack.Screen name="Closure" component={ClosureScreen} options={{ title: "Cierre de Caja" }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Historial" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Configuracion" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
