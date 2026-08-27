import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { modelsApi, type GarmentModel } from "../api/models";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Models">;

export function ModelsListScreen({ navigation }: Props) {
  const [models, setModels] = useState<GarmentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setModels(await modelsApi.list());
    } catch {
      setError("Impossible de charger les modèles (connexion requise).");
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
        data={models}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="shirt-outline"
              title="Aucun modèle"
              description="Ajoutez vos modèles/patrons pour les réutiliser lors des commandes."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => navigation.navigate("ModelDetail", { modelId: item.id })}
          >
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.category ? <Badge label={item.category} tone="info" /> : null}
              </View>
              {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
              {item.basePrice != null ? <Text style={styles.body}>À partir de {formatFcfa(item.basePrice)}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
      <Button label="Nouveau modèle" onPress={() => navigation.navigate("ModelForm")} />
    </View>
  );
}
