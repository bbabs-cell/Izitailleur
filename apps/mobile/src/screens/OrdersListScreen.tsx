import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ordersApi, type OrderListItem } from "../api/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, isOrderLate } from "../domain/orderStatus";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Orders">;

export function OrdersListScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await ordersApi.list());
    } catch {
      setError("Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Aucune commande pour le moment.</Text> : null
        }
        renderItem={({ item }) => {
          const late = isOrderLate(item.dueDate, item.status);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            >
              <Card style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.reference}>#{item.reference}</Text>
                  <Badge label={ORDER_STATUS_LABELS[item.status]} tone={ORDER_STATUS_TONE[item.status]} />
                </View>
                <Text style={styles.model}>{item.modelName}</Text>
                <Text style={styles.customer}>
                  {item.customer.firstName} {item.customer.lastName}
                </Text>
                {late ? <Badge label="En retard" tone="danger" /> : null}
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
