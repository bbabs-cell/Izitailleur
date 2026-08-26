import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { financeApi, type FinanceStats } from "../api/finance";
import { formatFcfa } from "../domain/payments";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "FinanceStats">;

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
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
        <StatTile label="COMMANDES" value={String(stats.ordersCount)} />
        <StatTile label="LIVRÉES" value={String(stats.deliveredCount)} />
        <StatTile label="EN RETARD" value={String(stats.lateCount)} tone={stats.lateCount > 0 ? "danger" : undefined} />
        <StatTile label="PROBLÈMES OUVERTS" value={String(stats.openIssues)} tone={stats.openIssues > 0 ? "warning" : undefined} />
      </View>

      <StatTile label="CHIFFRE D'AFFAIRES ENCAISSÉ" value={formatFcfa(stats.revenue)} />
      <StatTile label="IMPAYÉS" value={formatFcfa(stats.unpaid)} tone={stats.unpaid > 0 ? "warning" : undefined} />
      <StatTile label="TISSU CONSOMMÉ" value={`${stats.fabricConsumed} m (toutes unités confondues)`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tileValue: {
    ...typography.title,
    color: colors.textPrimary,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
