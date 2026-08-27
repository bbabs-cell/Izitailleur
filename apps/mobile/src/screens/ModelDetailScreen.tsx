import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { modelsApi, type GarmentModel } from "../api/models";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "ModelDetail">;

export function ModelDetailScreen({ route, navigation }: Props) {
  const { modelId } = route.params;
  const [model, setModel] = useState<GarmentModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.sm },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    price: { ...t.typography.subtitle, color: t.colors.success },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    error: { ...t.typography.body, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setModel(await modelsApi.get(modelId));
      setError(null);
    } catch {
      setError("Impossible de charger ce modèle (connexion requise).");
    }
  }, [modelId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!model) {
    return (
      <View style={styles.container}>
        <Text style={error ? styles.error : styles.body}>{error ?? "Chargement…"}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{model.name}</Text>
        {model.category ? <Badge label={model.category} tone="info" /> : null}
      </View>
      {model.basePrice != null ? <Text style={styles.price}>À partir de {formatFcfa(model.basePrice)}</Text> : null}
      {model.description ? <Text style={styles.body}>{model.description}</Text> : null}

      <Button
        label="Créer une commande pour ce modèle"
        onPress={() => navigation.navigate("OrderForm", { modelName: model.name })}
      />
    </ScrollView>
  );
}
