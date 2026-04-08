import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Button } from "react-native-paper";
import { appSizing } from "../theme/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const SecondaryAction = ({ label, onPress, icon, disabled, loading, style }: Props) => (
  <Button
    mode="outlined"
    icon={icon}
    onPress={onPress}
    disabled={disabled}
    loading={loading}
    style={[styles.button, style]}
    contentStyle={styles.content}
    labelStyle={styles.label}
  >
    {label}
  </Button>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
  },
  content: {
    minHeight: appSizing.actionHeight,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});

