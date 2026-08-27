import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeMode } from "../theme/ThemeContext";
import { AVAILABLE_LOCALES, useTranslation } from "../i18n/I18nContext";
import { Card } from "../components/Card";

const MODE_OPTIONS: { value: ThemeMode; labelKey: "settings.light" | "settings.dark" | "settings.auto"; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "light", labelKey: "settings.light", icon: "sunny-outline" },
  { value: "dark", labelKey: "settings.dark", icon: "moon-outline" },
  { value: "auto", labelKey: "settings.auto", icon: "phone-portrait-outline" },
];

export function SettingsScreen() {
  const { mode, setMode, colors, spacing, radius, typography } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { padding: spacing.lg, gap: spacing.lg }]}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>{t("settings.title")}</Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.overline, { color: colors.textMuted }]}>{t("settings.theme")}</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {MODE_OPTIONS.map((option, i) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[
                styles.row,
                {
                  padding: spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Ionicons name={option.icon} size={20} color={colors.accent} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{t(option.labelKey)}</Text>
              {mode === option.value ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              ) : null}
            </TouchableOpacity>
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.overline, { color: colors.textMuted }]}>{t("settings.language")}</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {AVAILABLE_LOCALES.map((option, i) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setLocale(option.value)}
              style={[
                styles.row,
                {
                  padding: spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Ionicons name="language-outline" size={20} color={colors.accent} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{option.label}</Text>
              {locale === option.value ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              ) : null}
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
