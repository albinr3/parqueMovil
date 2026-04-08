import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { appSizing } from "../theme/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "✓"];

type Props = {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
  disableConfirm?: boolean;
};

export const NumPad = ({ onKeyPress, disabled = false, disableConfirm = false }: Props) => (
  <View style={styles.grid}>
    {KEYS.map((key) => (
      <Button
        key={key}
        mode={key === "✓" ? "contained" : "contained-tonal"}
        style={styles.key}
        contentStyle={styles.content}
        disabled={disabled || (key === "✓" && disableConfirm)}
        onPress={() => onKeyPress(key)}
      >
        {key}
      </Button>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  key: {
    width: "30%",
    minWidth: 90,
    borderRadius: 14,
  },
  content: {
    height: appSizing.actionHeight,
  },
});
