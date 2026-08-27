import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundByVariant: Record<Variant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceElevated,
    danger: colors.danger,
    ghost: "transparent",
  };
  const labelColorByVariant: Record<Variant, string> = {
    primary: colors.textInverse,
    secondary: colors.textPrimary,
    danger: colors.textInverse,
    ghost: colors.accent,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgroundByVariant[variant],
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColorByVariant[variant]} />
      ) : (
        <Text style={[styles.label, typography.subtitle, { color: labelColorByVariant[variant] }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  label: {
    textAlign: "center",
  },
});
