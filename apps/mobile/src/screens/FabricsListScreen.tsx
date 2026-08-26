import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { fabricsApi, type Fabric } from "../api/fabrics";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Fabrics">;

export function FabricsListScreen({ navigation }: Props) {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFabrics(await fabricsApi.list());
    } catch {
      setError("Impossible de charger les tissus.");
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
        data={fabrics}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Aucun tissu en stock.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("FabricDetail", { fabricId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.lowStock ? <Badge label="Stock faible" tone="danger" /> : null}
              </View>
              <Text style={styles.body}>
                {item.quantity}
                {item.unit} disponible{item.quantity > 1 ? "s" : ""}
              </Text>
              {item.supplier ? <Text style={styles.supplier}>Fournisseur : {item.supplier.name}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
      <Button label="Nouveau tissu" onPress={() => navigation.navigate("FabricForm")} />
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
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  supplier: {
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
