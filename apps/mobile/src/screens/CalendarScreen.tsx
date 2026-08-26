import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { appointmentsApi, type Appointment } from "../api/appointments";
import { colors, spacing, typography } from "../theme/tokens";

const TYPE_LABELS: Record<string, string> = {
  FITTING: "Essayage",
  DELIVERY: "Livraison",
  PICKUP: "Récupération",
  PAYMENT: "Paiement",
  TASK: "Tâche",
  OTHER: "Autre",
};

function startOfWeekIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function endOfRangeIso(daysAhead: number) {
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

export function CalendarScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [busyDays, setBusyDays] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await appointmentsApi.list(startOfWeekIso(), endOfRangeIso(14));
      setAppointments(result.appointments);
      setBusyDays(result.busyDays);
    } catch {
      setError("Impossible de charger le calendrier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendrier — 14 prochains jours</Text>

      {busyDays.length > 0 ? (
        <Card style={styles.busyCard}>
          <Badge label="Journées chargées" tone="warning" />
          {busyDays.map((day) => (
            <Text key={day.date} style={styles.body}>
              {new Date(day.date).toLocaleDateString("fr-FR")} — {day.count} événements
            </Text>
          ))}
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Aucun rendez-vous à venir.</Text> : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Badge label={TYPE_LABELS[item.type] ?? item.type} tone="info" />
            </View>
            <Text style={styles.body}>
              {new Date(item.startAt).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
            {item.customer ? (
              <Text style={styles.body}>
                {item.customer.firstName} {item.customer.lastName}
              </Text>
            ) : null}
          </Card>
        )}
      />
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
  busyCard: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
