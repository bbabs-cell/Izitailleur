import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/tokens";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: string;
}

const toneColor: Record<Tone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.textSecondary,
};

const defaultIcon: Record<Tone, string> = {
  success: "✅",
  warning: "⚠️",
  danger: "\u{1F534}",
  info: "ℹ️",
  neutral: "●",
};

/**
 * L'information ne repose jamais uniquement sur la couleur : icône + texte
 * accompagnent toujours la couleur sémantique.
 */
export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const color = toneColor[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={styles.icon}>{icon ?? defaultIcon[tone]}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
  },
});
