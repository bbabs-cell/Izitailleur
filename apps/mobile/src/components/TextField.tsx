import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { gap: spacing.xs }]}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            color: colors.textPrimary,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...props}
      />
      {error ? (
        <Text style={[typography.caption, { color: colors.danger }]}>⚠️ {error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  input: {
    borderWidth: 1,
    minHeight: 48,
  },
});
