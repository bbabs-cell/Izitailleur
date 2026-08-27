import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export function SplashScreen() {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.hero, { color: colors.accent }]}>IZITAILLEUR</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        L'assistant intelligent de votre atelier.
      </Text>
      <ActivityIndicator size="large" color={colors.accentAlt} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
