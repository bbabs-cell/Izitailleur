import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { canViewFinance, type Role } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../offline/SyncContext";
import { ROLE_LABELS } from "../domain/roles";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

const SYNC_LABELS: Record<string, string> = {
  idle: "Synchronisé",
  syncing: "Synchronisation…",
  offline: "Hors connexion",
  error: "Erreur de synchro",
};
const SYNC_TONE: Record<string, "success" | "warning" | "danger" | "info"> = {
  idle: "success",
  syncing: "info",
  offline: "warning",
  error: "danger",
};

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { status: syncStatus, pendingCount, unreadNotifications } = useSync();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bonjour, {user?.fullName?.split(" ")[0]}</Text>
      <Text style={styles.subtitle}>{user?.workshop.name}</Text>

      <Card style={styles.card}>
        <Badge label={ROLE_LABELS[user?.role as Role] ?? user?.role ?? ""} tone="info" />
        <Text style={styles.body}>
          Le tableau de bord complet (urgences, priorités du jour) arrive en Phase 8. En
          attendant, gérez votre atelier ci-dessous.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Badge
          label={unreadNotifications > 0 ? `${unreadNotifications} notification(s)` : "Aucune alerte"}
          tone={unreadNotifications > 0 ? "danger" : "success"}
        />
        <Button label="Notifications" variant="secondary" onPress={() => navigation.navigate("Notifications")} />
      </Card>

      <Card style={styles.card}>
        <Badge
          label={`${SYNC_LABELS[syncStatus]}${pendingCount > 0 ? ` (${pendingCount} en attente)` : ""}`}
          tone={SYNC_TONE[syncStatus]}
        />
        <Button label="Synchronisation" variant="secondary" onPress={() => navigation.navigate("SyncStatus")} />
      </Card>

      <Button label="Clients" onPress={() => navigation.navigate("Customers")} />
      <Button label="Commandes" onPress={() => navigation.navigate("Orders")} />
      <Button label="Calendrier" onPress={() => navigation.navigate("Calendar")} />

      {user && canViewFinance(user.role as Role) ? (
        <>
          <Button label="Argent à récupérer" onPress={() => navigation.navigate("Debts")} />
          <Button label="Statistiques" onPress={() => navigation.navigate("FinanceStats")} />
        </>
      ) : null}

      <Button label="Équipe" variant="secondary" onPress={() => navigation.navigate("Team")} />
      <Button label="Tissus" variant="secondary" onPress={() => navigation.navigate("Fabrics")} />
      <Button label="Fournisseurs" variant="secondary" onPress={() => navigation.navigate("Suppliers")} />
      <Button label="Problèmes de l'atelier" variant="secondary" onPress={() => navigation.navigate("Issues")} />

      <Button label="Se déconnecter" variant="secondary" onPress={logout} testID="logout-button" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
