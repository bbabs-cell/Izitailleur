import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { canTransitionOrderStatus, ORDER_STATUSES, type OrderStatus } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ordersApi, type OrderDetail } from "../api/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, isOrderLate } from "../domain/orderStatus";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderDetail">;

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await ordersApi.get(orderId));
    } catch {
      setError("Impossible de charger cette commande.");
    }
  }, [orderId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function moveTo(status: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      await ordersApi.updateStatus(order.id, status);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Transition de statut impossible.");
    } finally {
      setUpdating(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    if (!order) return;
    const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      await ordersApi.updateTaskStatus(order.id, taskId, nextStatus);
      await load();
    } catch {
      setError("Impossible de mettre à jour la tâche.");
    }
  }

  if (error && !order) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>⚠️ {error}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chargement…</Text>
      </View>
    );
  }

  const late = isOrderLate(order.dueDate, order.status);
  const balance = order.price - order.deposit;
  const nextStatuses = ORDER_STATUSES.filter((s) => canTransitionOrderStatus(order.status, s));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>#{order.reference}</Text>
        <Badge label={ORDER_STATUS_LABELS[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
      </View>
      {late ? <Badge label="Urgent — en retard" tone="danger" /> : null}

      <Card style={styles.card}>
        <Text style={styles.label}>CLIENT</Text>
        <Text style={styles.body}>
          {order.customer.firstName} {order.customer.lastName}
        </Text>
        <Text style={styles.label}>MODÈLE</Text>
        <Text style={styles.body}>{order.modelName}</Text>
        {order.fabricDescription ? (
          <>
            <Text style={styles.label}>TISSU</Text>
            <Text style={styles.body}>{order.fabricDescription}</Text>
          </>
        ) : null}
        <Text style={styles.label}>DATE LIMITE</Text>
        <Text style={styles.body}>{new Date(order.dueDate).toLocaleDateString("fr-FR")}</Text>
        {order.assignedTo ? (
          <>
            <Text style={styles.label}>RESPONSABLE</Text>
            <Text style={styles.body}>{order.assignedTo.fullName}</Text>
          </>
        ) : null}
        {order.instructions ? (
          <>
            <Text style={styles.label}>INSTRUCTIONS</Text>
            <Text style={styles.body}>{order.instructions}</Text>
          </>
        ) : null}
        <Text style={styles.label}>PAIEMENT</Text>
        <Text style={styles.body}>
          {order.price.toLocaleString("fr-FR")} FCFA — acompte {order.deposit.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={[styles.body, balance > 0 ? styles.balanceDue : styles.balancePaid]}>
          {balance > 0
            ? `Solde restant : ${balance.toLocaleString("fr-FR")} FCFA`
            : "Payée intégralement"}
        </Text>
      </Card>

      <Text style={styles.section}>Progression</Text>
      <View style={styles.row}>
        {nextStatuses.length === 0 ? (
          <Text style={styles.body}>Aucune transition possible depuis ce statut.</Text>
        ) : (
          nextStatuses.map((status) => (
            <Button
              key={status}
              label={`→ ${ORDER_STATUS_LABELS[status]}`}
              variant="secondary"
              onPress={() => moveTo(status)}
              loading={updating}
            />
          ))
        )}
      </View>

      <Text style={styles.section}>Tâches</Text>
      {order.tasks.length === 0 ? (
        <Text style={styles.body}>Aucune tâche pour cette commande.</Text>
      ) : (
        order.tasks.map((task) => (
          <Pressable key={task.id} onPress={() => toggleTask(task.id, task.status)}>
            <Card style={styles.taskCard}>
              <Text style={styles.checkbox}>{task.status === "DONE" ? "☑" : "☐"}</Text>
              <Text style={[styles.body, task.status === "DONE" ? styles.taskDone : null]}>
                {task.title}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Photos</Text>
      {order.images.length === 0 ? (
        <Text style={styles.body}>Aucune photo pour le moment.</Text>
      ) : (
        <Text style={styles.body}>{order.images.length} photo(s) associée(s)</Text>
      )}

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    fontSize: 18,
    color: colors.accent,
  },
  taskDone: {
    color: colors.textSecondary,
    textDecorationLine: "line-through",
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  balanceDue: {
    color: colors.warning,
  },
  balancePaid: {
    color: colors.success,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
