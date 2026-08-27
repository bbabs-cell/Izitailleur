import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: string;
}

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
  const { colors, radius, spacing, typography } = useTheme();
  const toneColor: Record<Tone, string> = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
    neutral: colors.textSecondary,
  };
  const toneSoft: Record<Tone, string> = {
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    info: colors.infoSoft,
    neutral: colors.surfaceElevated,
  };
  const color = toneColor[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: color,
          backgroundColor: toneSoft[tone],
          borderRadius: radius.pill,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          gap: spacing.xs,
        },
      ]}
    >
      <Text style={styles.icon}>{icon ?? defaultIcon[tone]}</Text>
      <Text style={[typography.caption, styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontWeight: "600",
  },
});
