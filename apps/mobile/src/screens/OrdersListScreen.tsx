import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ordersRepo, type LocalOrder } from "../offline/ordersRepo";
import { useSync } from "../offline/SyncContext";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, isOrderLate } from "../domain/orderStatus";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";
import type { OrderStatus } from "@izitailleur/shared";

type Props = NativeStackScreenProps<AppStackParamList, "Orders">;

/**
 * Source de données : la base SQLite locale (offline-first), tenue à jour par le SyncContext.
 * Les créations écrivent immédiatement en local ; la référence (numéro séquentiel) n'est
 * connue qu'après synchronisation avec le serveur (affichée "en attente" en attendant).
 */
export function OrdersListScreen({ navigation }: Props) {
  const { status: syncStatus } = useSync();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      {syncStatus === "offline" ? <Badge label="Hors connexion — données locales" tone="warning" /> : null}
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucune commande pour le moment.</Text>}
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
                  {item.dirty ? <Badge label="Non synchronisé" tone="info" /> : null}
                  {item.conflict ? <Badge label="Conflit" tone="danger" /> : null}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
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
    gap: spacing.xs,
  },
  reference: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  model: {
    ...typography.body,
    color: colors.textPrimary,
  },
  customer: {
    ...typography.caption,
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
