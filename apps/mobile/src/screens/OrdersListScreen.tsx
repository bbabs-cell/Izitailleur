import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ordersRepo, type LocalOrder } from "../offline/ordersRepo";
import { useSync } from "../offline/SyncContext";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, isOrderLate } from "../domain/orderStatus";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";
import type { OrderStatus } from "@izitailleur/shared";

type Props = NativeStackScreenProps<AppStackParamList, "Orders">;

const FILTERS: { key: "all" | "late" | OrderStatus; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "late", label: "En retard" },
  { key: "NEW", label: ORDER_STATUS_LABELS.NEW },
  { key: "SEWING", label: ORDER_STATUS_LABELS.SEWING },
  { key: "READY", label: ORDER_STATUS_LABELS.READY },
  { key: "DELIVERED", label: ORDER_STATUS_LABELS.DELIVERED },
];

/**
 * Source de données : la base SQLite locale (offline-first), tenue à jour par le SyncContext.
 * Les créations écrivent immédiatement en local ; la référence (numéro séquentiel) n'est
 * connue qu'après synchronisation avec le serveur (affichée "en attente" en attendant).
 */
export function OrdersListScreen({ navigation }: Props) {
  const { status: syncStatus } = useSync();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    filters: { flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: t.spacing.xs },
    reference: { ...t.typography.subtitle, color: t.colors.textPrimary },
    model: { ...t.typography.body, color: t.colors.textPrimary },
    customer: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setOrders(await ordersRepo.list());
      setError(null);
    } catch {
      setError("Impossible de lire les commandes enregistrées localement.");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    if (syncStatus === "idle") load();
  }, [syncStatus, load]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "late") return orders.filter((o) => isOrderLate(o.dueDate, o.status as OrderStatus));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <View style={styles.container}>
      {syncStatus === "offline" ? <Badge label={t("common.offline")} tone="warning" /> : null}
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="shirt-outline"
            title="Aucune commande"
            description={
              filter === "all"
                ? "Créez votre première commande pour commencer."
                : "Aucune commande ne correspond à ce filtre."
            }
          />
        }
        renderItem={({ item }) => {
          const late = isOrderLate(item.dueDate, item.status as OrderStatus);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            >
              <Card style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.reference}>{item.reference ? `#${item.reference}` : "En attente"}</Text>
                  <Badge
                    label={ORDER_STATUS_LABELS[item.status as OrderStatus]}
                    tone={ORDER_STATUS_TONE[item.status as OrderStatus]}
                  />
                </View>
                <Text style={styles.model}>{item.modelName}</Text>
                <Text style={styles.customer}>
                  {item.customerFirstName} {item.customerLastName}
                </Text>
                <View style={styles.headerRow}>
                  {late ? <Badge label="En retard" tone="danger" /> : null}
                  {item.dirty ? <Badge label={t("common.unsynced")} tone="info" /> : null}
                  {item.conflict ? <Badge label={t("common.conflict")} tone="danger" /> : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
      <Button label="Nouvelle commande" onPress={() => navigation.navigate("OrderForm", {})} />
    </View>
  );
}
