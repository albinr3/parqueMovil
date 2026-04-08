import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Card, Text } from "react-native-paper";
import { appSpacing } from "../theme/theme";

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}>;

export const SectionCard = ({ title, subtitle, style, children }: Props) => (
  <Card mode="elevated" style={[styles.card, style]}>
    <Card.Content style={styles.content}>
      {title ? <Text variant="titleMedium">{title}</Text> : null}
      {subtitle ? <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
  },
  content: {
    gap: appSpacing.sm,
    paddingVertical: appSpacing.lg,
  },
  subtitle: {
    opacity: 0.8,
  },
});

