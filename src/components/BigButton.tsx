import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

type Props = {
  icon: string;
  label: string;
  mode?: "contained" | "outlined";
  color?: string;
  onPress: () => void;
};

export const BigButton = ({ icon, label, onPress, mode = "contained", color }: Props) => {
  return (
    <View style={styles.wrap}>
      <Button
        icon={icon}
        mode={mode}
        onPress={onPress}
        style={[styles.btn, color ? { backgroundColor: color } : null]}
        labelStyle={styles.label}
        contentStyle={styles.content}
      >
        {label}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  btn: { borderRadius: 14 },
  content: { height: 78 },
  label: { fontSize: 18, fontWeight: "700" },
});
