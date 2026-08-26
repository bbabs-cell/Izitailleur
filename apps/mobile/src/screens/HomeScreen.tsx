import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { canViewFinance, type DashboardResponse, type Role } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../offline/SyncContext";
import { ROLE_LABELS } from "../domain/roles";
import { dashboardApi } from "../api/dashboard";
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

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { status: syncStatus, pendingCount, unreadNotifications } = useSync();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await dashboardApi.get());
    } catch {
      setError("Tableau de bord indisponible (connexion requise).");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const urgentCount =
    (dashboard?.urgent.lateOrders.length ?? 0) + (dashboard?.urgent.urgentIssues.length ?? 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bonjour, {user?.fullName?.split(" ")[0]}</Text>
      <Text style={styles.subtitle}>{user?.workshop.name}</Text>

      <Card style={styles.card}>
        <Badge label={ROLE_LABELS[user?.role as Role] ?? user?.role ?? ""} tone="info" />
        <Badge
          label={unreadNotifications > 0 ? `${unreadNotifications} notification(s)` : "Aucune alerte"}
          tone={unreadNotifications > 0 ? "danger" : "success"}
        />
        <Badge
          label={`${SYNC_LABELS[syncStatus]}${pendingCount > 0 ? ` (${pendingCount} en attente)` : ""}`}
          tone={SYNC_TONE[syncStatus]}
        />
      </Card>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      {/* Aujourd'hui */}
      <Text style={styles.sectionTitle}>Aujourd'hui</Text>
      <Card style={styles.card}>
        {loading && !dashboard ? (
          <Text style={styles.body}>Chargement…</Text>
        ) : dashboard ? (
          <>
            <Row
              label="Rendez-vous"
              value={dashboard.today.appointments.length}
              onPress={() => navigation.navigate("Calendar")}
            />
            <Row
              label="Commandes à livrer"
              value={dashboard.today.dueOrders.length}
              onPress={() => navigation.navigate("Orders")}
            />
            <Row label="Mes tâches en cours" value={dashboard.today.myTasks.length} />
            {dashboard.today.appointments.length === 0 &&
            dashboard.today.dueOrders.length === 0 &&
            dashboard.today.myTasks.length === 0 ? (
              <Text style={styles.body}>Rien de particulier prévu aujourd'hui.</Text>
            ) : null}
          </>
        ) : null}
      </Card>

      {/* Urgent */}
      <Text style={styles.sectionTitle}>Urgent</Text>
      <Card style={styles.card}>
        {dashboard ? (
          urgentCount === 0 ? (
            <Badge label="Rien d'urgent" tone="success" />
          ) : (
            <>
              {dashboard.urgent.lateOrders.length > 0 ? (
                <Row
                  label="Commandes en retard"
                  value={dashboard.urgent.lateOrders.length}
                  tone="danger"
                  onPress={() => navigation.navigate("Orders")}
                />
              ) : null}
              {dashboard.urgent.dueSoonOrders.length > 0 ? (
                <Row
                  label="À livrer bientôt"
                  value={dashboard.urgent.dueSoonOrders.length}
                  tone="warning"
                  onPress={() => navigation.navigate("Orders")}
                />
              ) : null}
              {dashboard.urgent.urgentIssues.length > 0 ? (
                <Row
                  label="Problèmes urgents"
                  value={dashboard.urgent.urgentIssues.length}
                  tone="danger"
                  onPress={() => navigation.navigate("Issues")}
                />
              ) : null}
            </>
          )
        ) : null}
      </Card>

      {/* Argent */}
      {dashboard && dashboard.money ? (
        <>
          <Text style={styles.sectionTitle}>Argent</Text>
          <Pressable onPress={() => navigation.navigate("Debts")}>
            <Card style={styles.card}>
              <Row label="Dettes clients" value={formatFcfa(dashboard.money.totalDebt)} />
              <Row label="Clients débiteurs" value={dashboard.money.debtorsCount} />
              <Row label="Revenu ce mois-ci" value={formatFcfa(dashboard.money.revenueThisMonth)} />
            </Card>
          </Pressable>
        </>
      ) : null}

      {/* Stock */}
      <Text style={styles.sectionTitle}>Stock</Text>
      <Pressable onPress={() => navigation.navigate("Fabrics")}>
        <Card style={styles.card}>
          {dashboard ? (
            dashboard.stock.lowStockFabrics.length === 0 ? (
              <Badge label="Stock suffisant" tone="success" />
            ) : (
              dashboard.stock.lowStockFabrics.map((f) => (
                <Text key={f.id} style={styles.body}>
                  {f.name} : {f.quantity}
                  {f.unit} restant
                </Text>
              ))
            )
          ) : null}
        </Card>
      </Pressable>

      {/* Équipe */}
      {dashboard && dashboard.team ? (
        <>
          <Text style={styles.sectionTitle}>Équipe</Text>
          <Pressable onPress={() => navigation.navigate("Team")}>
            <Card style={styles.card}>
              {dashboard.team.tasksByAssignee.length === 0 ? (
                <Text style={styles.body}>Aucune tâche assignée en cours.</Text>
              ) : (
                dashboard.team.tasksByAssignee.map((a) => (
                  <Row key={a.userId} label={a.fullName} value={a.pendingCount} />
                ))
              )}
            </Card>
          </Pressable>
        </>
      ) : null}

      <Button label="Assistant de l'atelier" onPress={() => navigation.navigate("Assistant")} />

      <Button label="Clients" onPress={() => navigation.navigate("Customers")} />
      <Button label="Commandes" onPress={() => navigation.navigate("Orders")} />
      <Button label="Calendrier" onPress={() => navigation.navigate("Calendar")} />

      {user && canViewFinance(user.role as Role) ? (
        <>
          <Button label="Argent à récupérer" onPress={() => navigation.navigate("Debts")} />
          <Button label="Statistiques" onPress={() => navigation.navigate("FinanceStats")} />
        </>
      ) : null}

      {user && (user.role === "OWNER" || user.role === "ADMIN") ? (
        <Button
          label="Paramètres de l'atelier"
          variant="secondary"
          onPress={() => navigation.navigate("WorkshopSettings")}
        />
      ) : null}

      <Button label="Équipe" variant="secondary" onPress={() => navigation.navigate("Team")} />
      <Button label="Tissus" variant="secondary" onPress={() => navigation.navigate("Fabrics")} />
      <Button label="Fournisseurs" variant="secondary" onPress={() => navigation.navigate("Suppliers")} />
      <Button label="Problèmes de l'atelier" variant="secondary" onPress={() => navigation.navigate("Issues")} />

      <Button label="Se déconnecter" variant="secondary" onPress={logout} testID="logout-button" />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: number | string;
  tone?: "danger" | "warning";
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          tone === "danger" ? styles.rowValueDanger : null,
          tone === "warning" ? styles.rowValueWarning : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
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
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  card: {
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  rowValueDanger: {
    color: colors.danger,
  },
  rowValueWarning: {
    color: colors.warning,
  },
});
