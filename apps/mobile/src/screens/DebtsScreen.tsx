import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { financeApi, type DebtEntry } from "../api/finance";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Debts">;

export function DebtsScreen({ navigation }: Props) {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    totalCard: { gap: t.spacing.xs },
    total: { ...t.typography.title, color: t.colors.warning },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    remaining: { ...t.typography.subtitle, color: t.colors.warning },
    body: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
          !loading ? <EmptyState icon="cash-outline" title="Aucune dette" description="Tous les clients sont à jour." /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.customer.firstName} ${item.customer.lastName}`}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.orderId })}
          >
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
