import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { fabricsApi, type Fabric } from "../api/fabrics";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Fabrics">;

export function FabricsListScreen({ navigation }: Props) {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    body: { ...t.typography.body, color: t.colors.textPrimary },
    supplier: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
        ListEmptyComponent={!loading ? <EmptyState icon="color-palette-outline" title="Aucun tissu" description="Ajoutez votre premier tissu en stock." /> : null}
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
