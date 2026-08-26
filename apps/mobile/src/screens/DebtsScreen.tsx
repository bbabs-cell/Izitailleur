import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { financeApi, type DebtEntry } from "../api/finance";
import { formatFcfa } from "../domain/payments";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Debts">;

export function DebtsScreen({ navigation }: Props) {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDebts(await financeApi.debts());
    } catch {
      setError("Impossible de charger l'argent à récupérer.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

  return (
    <View style={styles.container}>
      <Card style={styles.totalCard}>
        <Badge label="Argent à récupérer" tone="warning" />
        <Text style={styles.total}>{formatFcfa(totalRemaining)}</Text>
      </Card>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={debts}
        keyExtractor={(item) => item.orderId}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Aucune dette en cours. 🎉</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("OrderDetail", { orderId: item.orderId })}>
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>
                  {item.customer.firstName} {item.customer.lastName}
                </Text>
                <Text style={styles.remaining}>{formatFcfa(item.remaining)}</Text>
              </View>
              <Text style={styles.body}>
                Commande #{item.reference} — payé {formatFcfa(item.paid)} sur {formatFcfa(item.total)}
              </Text>
              {item.customer.phone ? <Text style={styles.body}>{item.customer.phone}</Text> : null}
            </Card>
          </Pressable>
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
  totalCard: {
    gap: spacing.xs,
  },
  total: {
    ...typography.title,
    color: colors.warning,
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
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  remaining: {
    ...typography.subtitle,
    color: colors.warning,
  },
  body: {
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
