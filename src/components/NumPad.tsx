import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "✓"];

type Props = {
  onKeyPress: (key: string) => void;
};

export const NumPad = ({ onKeyPress }: Props) => (
  <View style={styles.grid}>
    {KEYS.map((key) => (
      <Button key={key} mode="contained-tonal" style={styles.key} contentStyle={styles.content} onPress={() => onKeyPress(key)}>
        {key}
      </Button>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  key: { width: "30%", minWidth: 85 },
  content: { height: 58 },
});
