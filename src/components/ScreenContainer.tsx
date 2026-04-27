import { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { appSpacing } from "../theme/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export const ScreenContainer = ({
  children,
  scroll = false,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
}: Props) => {
  const insets = useSafeAreaInsets();
  const contentBaseStyle = [
    styles.content,
    {
      paddingBottom:
        appSpacing.md + insets.bottom + (Platform.OS === "android" ? appSpacing.lg : 0),
    },
  ];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[contentBaseStyle, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[contentBaseStyle, styles.flex, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        enabled={keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <Animated.View entering={FadeInDown.duration(220)} style={styles.flex}>
          {body}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: appSpacing.lg,
    paddingVertical: appSpacing.md,
    gap: appSpacing.md,
  },
});
