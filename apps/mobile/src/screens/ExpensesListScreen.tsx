import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { expensesApi, type Expense } from "../api/expenses";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Expenses">;

export function ExpensesListScreen({ navigation }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    totalCard: { gap: t.spacing.xs },
    totalLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    totalValue: { ...t.typography.title, color: t.colors.danger },
    filters: { flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    skeletonList: { gap: t.spacing.sm },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    amount: { ...t.typography.subtitle, color: t.colors.textPrimary },
    body: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await expensesApi.list());
    } catch {
      setError("Impossible de charger les dépenses (connexion requise).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.category && set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (category && e.category !== category) return false;
      if (!needle) return true;
      return e.description.toLowerCase().includes(needle) || (e.category ?? "").toLowerCase().includes(needle);
    });
  }, [expenses, search, category]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  return (
    <View style={styles.container}>
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>{category || search ? "Total (filtré)" : "Total des dépenses"}</Text>
        <Text style={styles.totalValue}>{formatFcfa(total)}</Text>
      </Card>

      <TextField label="Rechercher" value={search} onChangeText={setSearch} placeholder="Description ou catégorie" />

      {categories.length > 0 ? (
        <View style={styles.filters}>
          <Chip label="Toutes" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      {loading && expenses.length === 0 ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="cash-outline"
                title="Aucune dépense"
                description="Enregistrez vos achats de tissus, fournitures ou autres frais de l'atelier."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.amount}>{formatFcfa(item.amount)}</Text>
                {item.category ? <Badge label={item.category} tone="info" /> : null}
              </View>
              <Text style={styles.body}>{item.description}</Text>
              <Text style={styles.body}>{new Date(item.spentAt).toLocaleDateString("fr-FR")}</Text>
            </Card>
          )}
        />
      )}

      <Button label="Nouvelle dépense" onPress={() => navigation.navigate("ExpenseForm")} />
    </View>
  );
}
