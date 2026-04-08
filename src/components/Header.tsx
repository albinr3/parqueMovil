import { StyleSheet, View } from "react-native";
import { SyncIndicator } from "./SyncIndicator";
import { appSpacing } from "../theme/theme";

export const Header = () => (
  <View style={styles.wrap}>
    <SyncIndicator />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: appSpacing.sm,
    gap: appSpacing.sm,
    paddingHorizontal: appSpacing.xs,
  },
});
