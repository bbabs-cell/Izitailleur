import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "file-tray-outline", title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { padding: spacing.xl, gap: spacing.sm }]}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[typography.subtitle, styles.text, { color: colors.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[typography.body, styles.text, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm, alignSelf: "stretch" }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
  },
});
