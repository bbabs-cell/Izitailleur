import { StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { colors, spacing, typography } from "../theme/tokens";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  TAILOR: "Tailleur",
  CUTTER: "Coupeur",
  APPRENTICE: "Apprenti",
  FINISHER: "Finition",
  DELIVERY: "Livreur",
};

export function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonjour, {user?.fullName?.split(" ")[0]}</Text>
      <Text style={styles.subtitle}>{user?.workshop.name}</Text>

      <Card style={styles.card}>
        <Badge label={ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""} tone="info" />
        <Text style={styles.body}>
          Le tableau de bord (commandes du jour, rendez-vous, urgences, argent, stock) arrive en
          Phase 2 du projet, une fois les modules Clients, Commandes et Calendrier construits.
        </Text>
      </Card>

      <Button label="Se déconnecter" variant="secondary" onPress={logout} testID="logout-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
