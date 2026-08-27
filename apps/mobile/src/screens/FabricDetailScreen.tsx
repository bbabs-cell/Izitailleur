import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { fabricsApi, type FabricDetail } from "../api/fabrics";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useToast } from "../components/ToastContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "FabricDetail">;

const MOVEMENT_LABELS: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  ADJUSTMENT: "Ajustement",
};

export function FabricDetailScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const { fabricId } = route.params;
  const [fabric, setFabric] = useState<FabricDetail | null>(null);
  const [movementQuantity, setMovementQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.sm },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    stock: { ...t.typography.body, color: t.colors.textSecondary },
    card: { gap: t.spacing.sm, marginTop: t.spacing.sm },
    row: { flexDirection: "row", gap: t.spacing.sm },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary, marginTop: t.spacing.md },
    movementCard: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    body: { ...t.typography.body, color: t.colors.textPrimary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
      showToast(type === "IN" ? "Entrée de stock enregistrée" : "Sortie de stock enregistrée", "success");
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
