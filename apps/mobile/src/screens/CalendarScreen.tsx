import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { appointmentsApi, type Appointment } from "../api/appointments";
import { appointmentsRepo, type LocalAppointment } from "../offline/appointmentsRepo";
import { useSync } from "../offline/SyncContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Calendar">;

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

export function CalendarScreen({ navigation }: Props) {
  const { status: syncStatus } = useSync();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<(Appointment | LocalAppointment)[]>([]);
  const [busyDays, setBusyDays] = useState<{ date: string; count: number }[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    busyCard: { gap: t.spacing.xs },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    eventTitle: { ...t.typography.subtitle, color: t.colors.textPrimary },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = startOfWeekIso();
    const to = endOfRangeIso(14);
    try {
      const result = await appointmentsApi.list(from, to);
      setAppointments(result.appointments);
      setBusyDays(result.busyDays);
      setOffline(false);
    } catch {
      // Hors connexion : on affiche au minimum les rendez-vous connus localement.
      // La détection de journée chargée nécessite le serveur et n'est pas disponible ici.
      try {
        setAppointments(await appointmentsRepo.listInRange(from, to));
        setBusyDays([]);
        setOffline(true);
      } catch {
        setError("Impossible de charger le calendrier.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    if (syncStatus === "idle") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendrier — 14 prochains jours</Text>
      {offline ? (
        <Badge label="Hors connexion — journées chargées non calculées" tone="warning" />
      ) : null}

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
          !loading ? (
            <EmptyState icon="calendar-outline" title="Aucun rendez-vous" description="Rien de prévu dans les 14 prochains jours." />
          ) : null
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
            {"customer" in item && item.customer ? (
              <Text style={styles.body}>
                {item.customer.firstName} {item.customer.lastName}
              </Text>
            ) : null}
            {"dirty" in item && item.dirty ? <Badge label={t("common.unsynced")} tone="info" /> : null}
          </Card>
        )}
      />

      <Button label="Nouveau rendez-vous" onPress={() => navigation.navigate("AppointmentForm")} />
    </View>
  );
}

