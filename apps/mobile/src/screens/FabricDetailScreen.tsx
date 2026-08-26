import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { fabricsApi, type FabricDetail } from "../api/fabrics";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "FabricDetail">;

const MOVEMENT_LABELS: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  ADJUSTMENT: "Ajustement",
};

export function FabricDetailScreen({ route, navigation }: Props) {
  const { fabricId } = route.params;
  const [fabric, setFabric] = useState<FabricDetail | null>(null);
  const [movementQuantity, setMovementQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setFabric(await fabricsApi.get(fabricId));
    } catch {
      setError("Impossible de charger ce tissu.");
    }
  }, [fabricId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function record(type: "IN" | "OUT") {
    const quantity = Number(movementQuantity);
    if (!movementQuantity || Number.isNaN(quantity) || quantity <= 0) {
      setError("Entrez une quantité positive.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await fabricsApi.recordMovement(fabricId, { type, quantity });
      setMovementQuantity("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Mouvement de stock impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (!fabric) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{error ?? "Chargement…"}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{fabric.name}</Text>
        {fabric.lowStock ? <Badge label="Stock faible" tone="danger" /> : null}
      </View>
      <Text style={styles.stock}>
        {fabric.quantity}
        {fabric.unit} disponible{fabric.quantity > 1 ? "s" : ""}
      </Text>

      <Card style={styles.card}>
        <TextField
          label={`Quantité (${fabric.unit})`}
          value={movementQuantity}
          onChangeText={setMovementQuantity}
          keyboardType="numeric"
        />
        <View style={styles.row}>
          <Button label="Entrée (réappro)" variant="secondary" onPress={() => record("IN")} loading={loading} />
          <Button label="Sortie (consommation)" onPress={() => record("OUT")} loading={loading} />
        </View>
        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      </Card>

      <Text style={styles.section}>Historique des mouvements</Text>
      {fabric.movements.length === 0 ? (
        <Text style={styles.body}>Aucun mouvement enregistré.</Text>
      ) : (
        fabric.movements.map((movement) => (
          <Card key={movement.id} style={styles.movementCard}>
            <Badge
              label={MOVEMENT_LABELS[movement.type] ?? movement.type}
              tone={movement.type === "OUT" ? "warning" : "success"}
            />
            <Text style={styles.body}>
              {movement.quantity}
              {fabric.unit} — {new Date(movement.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  stock: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  movementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
