import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { financeApi, type FinanceStats } from "../api/finance";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "FinanceStats">;

function StatTile({
  styles,
  label,
  value,
  tone,
}: {
  styles: ReturnType<typeof useThemedStyles>;
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, tone === "warning" ? styles.warning : null, tone === "danger" ? styles.danger : null]}>
        {value}
      </Text>
    </Card>
  );
}

export function FinanceStatsScreen({ navigation }: Props) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
    tile: { flexBasis: "47%", flexGrow: 1, gap: t.spacing.xs },
    tileLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    tileValue: { ...t.typography.title, color: t.colors.textPrimary },
    warning: { color: t.colors.warning },
    danger: { color: t.colors.danger },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setStats(await financeApi.stats());
    } catch {
      setError("Impossible de charger les statistiques.");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await financeApi.exportPaymentsCsvAndShare();
    } catch {
      setError("Impossible de générer ou partager l'export.");
    } finally {
      setExporting(false);
    }
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{error ?? "Chargement…"}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.grid}>
        <StatTile styles={styles} label="COMMANDES" value={String(stats.ordersCount)} />
        <StatTile styles={styles} label="LIVRÉES" value={String(stats.deliveredCount)} />
        <StatTile
          styles={styles}
          label="EN RETARD"
          value={String(stats.lateCount)}
          tone={stats.lateCount > 0 ? "danger" : undefined}
        />
        <StatTile
          styles={styles}
          label="PROBLÈMES OUVERTS"
          value={String(stats.openIssues)}
          tone={stats.openIssues > 0 ? "warning" : undefined}
        />
      </View>

      <StatTile styles={styles} label="CHIFFRE D'AFFAIRES ENCAISSÉ" value={formatFcfa(stats.revenue)} />
      <StatTile
        styles={styles}
        label="IMPAYÉS"
        value={formatFcfa(stats.unpaid)}
        tone={stats.unpaid > 0 ? "warning" : undefined}
      />
      <StatTile styles={styles} label="TISSU CONSOMMÉ" value={`${stats.fabricConsumed} m (toutes unités confondues)`} />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button
        label={exporting ? "Génération…" : "📤 Exporter les paiements (CSV)"}
        variant="secondary"
        onPress={exportCsv}
        loading={exporting}
      />
    </ScrollView>
  );
}
