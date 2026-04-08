import { DefaultTheme as NavigationDefaultTheme, Theme as NavigationTheme } from "@react-navigation/native";
import { MD3LightTheme, MD3Theme } from "react-native-paper";

const palette = {
  brand: "#D97706",
  brandContainer: "#FDE9CB",
  success: "#1F7A3D",
  successContainer: "#E4F7EA",
  danger: "#B42318",
  dangerContainer: "#FDECEC",
  warning: "#B54708",
  warningContainer: "#FFF2D8",
  info: "#1D4ED8",
  infoContainer: "#EAF1FF",
  background: "#F4F6F8",
  surface: "#FFFFFF",
  surfaceVariant: "#EEF2F5",
  outline: "#C7D0D9",
  text: "#111827",
  textMuted: "#667085",
};

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.brand,
    onPrimary: "#FFFFFF",
    primaryContainer: palette.brandContainer,
    onPrimaryContainer: "#2D1B00",
    secondary: "#4A5C92",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#E9EEFF",
    onSecondaryContainer: "#131C38",
    tertiary: palette.success,
    onTertiary: "#FFFFFF",
    tertiaryContainer: palette.successContainer,
    onTertiaryContainer: "#082711",
    error: palette.danger,
    onError: "#FFFFFF",
    errorContainer: palette.dangerContainer,
    onErrorContainer: "#410E0B",
    background: palette.background,
    onBackground: palette.text,
    surface: palette.surface,
    onSurface: palette.text,
    surfaceVariant: palette.surfaceVariant,
    onSurfaceVariant: palette.textMuted,
    outline: palette.outline,
    outlineVariant: "#D8DEE5",
    shadow: "#0F172A",
    scrim: "#0F172A",
    inverseSurface: "#243040",
    inverseOnSurface: "#F8FAFC",
    inversePrimary: "#FFD29A",
    elevation: {
      level0: "transparent",
      level1: "#F8FAFC",
      level2: "#F3F6FA",
      level3: "#EEF2F8",
      level4: "#E8EEF7",
      level5: "#E1E9F5",
    },
    surfaceDisabled: "#DCE3EA",
    onSurfaceDisabled: "#9AA4B2",
    backdrop: "#11182766",
  },
};

export const appNavigationTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: appTheme.colors.primary,
    background: appTheme.colors.background,
    card: appTheme.colors.surface,
    text: appTheme.colors.onSurface,
    border: appTheme.colors.outlineVariant,
    notification: appTheme.colors.error,
  },
};

export const appSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const appSizing = {
  actionHeight: 56,
  actionHeightLarge: 72,
  inputHeight: 56,
};

export const feedbackColors = {
  info: palette.info,
  success: palette.success,
  warning: palette.warning,
  error: palette.danger,
};

