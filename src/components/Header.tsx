import { StyleSheet, View, Image } from "react-native";
import { Text } from "react-native-paper";
import { SyncIndicator } from "./SyncIndicator";

type Props = {
  employeeName: string;
};

export const Header = ({ employeeName }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.left}>
      <Image source={require("../../assets/logo.jpg")} style={styles.logo} />
      <View>
        <Text variant="titleMedium">Parqueo Moto Badia</Text>
        <Text variant="bodySmall">Encargado: {employeeName}</Text>
      </View>
    </View>
    <SyncIndicator />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
});
