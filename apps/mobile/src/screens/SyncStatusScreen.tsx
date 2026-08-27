import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useSync } from "../offline/SyncContext";
import { customersRepo, type LocalCustomer } from "../offline/customersRepo";
import { appointmentsRepo, type LocalAppointment } from "../offline/appointmentsRepo";
import { ordersRepo, type LocalOrder } from "../offline/ordersRepo";
import { ORDER_STATUS_LABELS } from "../domain/orderStatus";
import type { OrderStatus } from "@izitailleur/shared";
import { useThemedStyles } from "../theme/useThemedStyles";

const STATUS_LABELS: Record<string, string> = {
  idle: "À jour",
  syncing: "Synchronisation en cours…",
  offline: "Hors connexion",
  error: "Erreur de synchronisation",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info"> = {
  idle: "success",
  syncing: "info",
  offline: "warning",
  error: "danger",
};

export function SyncStatusScreen() {
  const { status, pendingCount, lastSummary, lastError, syncNow } = useSync();
  const [customerConflicts, setCustomerConflicts] = useState<LocalCustomer[]>([]);
  const [appointmentConflicts, setAppointmentConflicts] = useState<LocalAppointment[]>([]);
  const [orderConflicts, setOrderConflicts] = useState<LocalOrder[]>([]);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    card: { gap: t.spacing.sm },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary },
    conflictCard: { gap: t.spacing.sm },
    compareRow: { flexDirection: "row", gap: t.spacing.md },
    compareCol: { flex: 1, gap: t.spacing.xs },
    row: { flexDirection: "row", gap: t.spacing.sm },
    body: { ...t.typography.body, color: t.colors.textPrimary },
    caption: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const loadConflicts = useCallback(async () => {
    setCustomerConflicts(await customersRepo.listConflicts());
    setAppointmentConflicts(await appointmentsRepo.listConflicts());
    setOrderConflicts(await ordersRepo.listConflicts());
  }, []);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts, status]);

  async function resolveCustomer(record: LocalCustomer, keep: "mine" | "server") {
    if (keep === "mine") {
      await customersRepo.keepMine(record);
    } else {
      await customersRepo.useServer(record);
    }
    await loadConflicts();
    if (keep === "mine") await syncNow();
  }

  async function resolveAppointment(record: LocalAppointment, keep: "mine" | "server") {
    if (keep === "mine") {
      await appointmentsRepo.keepMine(record);
    } else {
      await appointmentsRepo.useServer(record);
    }
    await loadConflicts();
    if (keep === "mine") await syncNow();
  }

  async function resolveOrder(record: LocalOrder, keep: "mine" | "server") {
    if (keep === "mine") {
      await ordersRepo.keepMine(record);
    } else {
      await ordersRepo.useServer(record);
    }
    await loadConflicts();
    if (keep === "mine") await syncNow();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Badge label={STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
        <Text style={styles.body}>
          {pendingCount} modification{pendingCount > 1 ? "s" : ""} en attente de synchronisation.
        </Text>
        {lastSummary ? (
          <Text style={styles.caption}>
            Dernière synchro : {lastSummary.pushed} envoyée(s), {lastSummary.pulled} reçue(s),{" "}
            {lastSummary.conflicts} conflit(s).
          </Text>
        ) : null}
        {lastError ? <Text style={styles.error}>⚠️ {lastError}</Text> : null}
        <Button label="Synchroniser maintenant" onPress={syncNow} loading={status === "syncing"} />
      </Card>

      {(customerConflicts.length > 0 || appointmentConflicts.length > 0 || orderConflicts.length > 0) && (
        <>
          <Text style={styles.section}>Conflits à résoudre</Text>
          <Text style={styles.body}>
            Ces enregistrements ont été modifiés à la fois sur cet appareil et par quelqu'un
            d'autre pendant que vous étiez hors connexion. Choisissez la version à conserver.
          </Text>
        </>
      )}

      {customerConflicts.map((record) => {
        const server = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : {};
        return (
          <Card key={record.id} style={styles.conflictCard}>
            <Badge label="Client en conflit" tone="danger" />
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Votre version</Text>
                <Text style={styles.body}>
                  {record.firstName} {record.lastName}
                </Text>
                <Text style={styles.caption}>{record.notes ?? "—"}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Version du serveur</Text>
                <Text style={styles.body}>
                  {server.firstName} {server.lastName}
                </Text>
                <Text style={styles.caption}>{server.notes ?? "—"}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Button label="Garder ma version" variant="secondary" onPress={() => resolveCustomer(record, "mine")} />
              <Button label="Utiliser le serveur" onPress={() => resolveCustomer(record, "server")} />
            </View>
          </Card>
        );
      })}

      {appointmentConflicts.map((record) => {
        const server = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : {};
        return (
          <Card key={record.id} style={styles.conflictCard}>
            <Badge label="Rendez-vous en conflit" tone="danger" />
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Votre version</Text>
                <Text style={styles.body}>{record.title}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Version du serveur</Text>
                <Text style={styles.body}>{server.title}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Button
                label="Garder ma version"
                variant="secondary"
                onPress={() => resolveAppointment(record, "mine")}
              />
              <Button label="Utiliser le serveur" onPress={() => resolveAppointment(record, "server")} />
            </View>
          </Card>
        );
      })}

      {orderConflicts.map((record) => {
        const server = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : {};
        return (
          <Card key={record.id} style={styles.conflictCard}>
            <Badge label="Commande en conflit" tone="danger" />
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Votre version</Text>
                <Text style={styles.body}>{ORDER_STATUS_LABELS[record.status as OrderStatus]}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.caption}>Version du serveur</Text>
                <Text style={styles.body}>
                  {server.status ? ORDER_STATUS_LABELS[server.status as OrderStatus] : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Button label="Garder ma version" variant="secondary" onPress={() => resolveOrder(record, "mine")} />
              <Button label="Utiliser le serveur" onPress={() => resolveOrder(record, "server")} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
