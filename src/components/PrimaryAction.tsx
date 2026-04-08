import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Button } from "react-native-paper";
import { appSizing } from "../theme/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  buttonColor?: string;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryAction = ({
  label,
  onPress,
  icon,
  disabled,
  loading,
  buttonColor,
  style,
}: Props) => (
  <Button
    mode="contained"
    icon={icon}
    onPress={onPress}
    disabled={disabled}
    loading={loading}
    buttonColor={buttonColor}
    style={[styles.button, style]}
    contentStyle={styles.content}
    labelStyle={styles.label}
  >
    {label}
  </Button>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
  },
  content: {
    minHeight: appSizing.actionHeightLarge,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});

