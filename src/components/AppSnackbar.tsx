import { StyleSheet } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { feedbackColors } from "../theme/theme";

export type FeedbackType = "info" | "success" | "warning" | "error";

type Props = {
  visible: boolean;
  type: FeedbackType;
  text: string;
  duration: number;
  onDismiss: () => void;
};

export const AppSnackbar = ({ visible, type, text, duration, onDismiss }: Props) => (
  <Snackbar
    visible={visible}
    duration={duration}
    onDismiss={onDismiss}
    style={[styles.snackbar, { backgroundColor: feedbackColors[type] }]}
    wrapperStyle={styles.wrapper}
  >
    <Text style={styles.text}>{text}</Text>
  </Snackbar>
);

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

