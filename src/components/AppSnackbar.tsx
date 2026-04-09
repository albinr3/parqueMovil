import { StyleSheet } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { feedbackColors } from "../theme/theme";

export type FeedbackType = "info" | "success" | "warning" | "error";

type Props = {
  visible: boolean;
  type: FeedbackType;
  text: string;
  duration: number;
  onDismiss: () => void;
};

export const AppSnackbar = ({ visible, type, text, duration, onDismiss }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <Snackbar
      visible={visible}
      duration={duration}
      onDismiss={onDismiss}
      style={[styles.snackbar, { backgroundColor: feedbackColors[type] }]}
      wrapperStyle={[styles.wrapper, { bottom: insets.bottom + 12 }]}
    >
      <Text style={styles.text}>{text}</Text>
    </Snackbar>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    bottom: 12,
  },
  snackbar: {
    borderRadius: 12,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
