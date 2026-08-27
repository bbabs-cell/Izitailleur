import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeMode } from "../theme/ThemeContext";
import { Card } from "../components/Card";

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "light", label: "Clair", icon: "sunny-outline" },
  { value: "dark", label: "Sombre", icon: "moon-outline" },
  { value: "auto", label: "Automatique", icon: "phone-portrait-outline" },
];

/**
 * La langue est verrouillée sur le français pour l'instant : l'architecture i18n
 * (Phase i18n) doit être en place avant d'exposer un vrai sélecteur de langue ici.
 */
export function SettingsScreen() {
  const { mode, setMode, colors, spacing, radius, typography } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { padding: spacing.lg, gap: spacing.lg }]}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Apparence & langue</Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.overline, { color: colors.textMuted }]}>Thème</Text>
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
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{option.label}</Text>
              {mode === option.value ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              ) : null}
            </TouchableOpacity>
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.overline, { color: colors.textMuted }]}>Langue</Text>
        <Card>
          <View style={styles.row}>
            <Ionicons name="language-outline" size={20} color={colors.accent} />
            <Text style={[typography.body, { color: colors.textPrimary }]}>Français</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
