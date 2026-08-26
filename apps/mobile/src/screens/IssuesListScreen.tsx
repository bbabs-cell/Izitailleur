import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { issuesApi, type Issue } from "../api/issues";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from "../domain/issues";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";
import type { IssueCategory } from "@izitailleur/shared";

type Props = NativeStackScreenProps<AppStackParamList, "Issues">;

export function IssuesListScreen({ navigation }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIssues(await issuesApi.list());
    } catch {
      setError("Impossible de charger les problèmes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function resolve(id: string) {
    try {
      await issuesApi.updateStatus(id, "RESOLVED", "Résolu depuis l'application");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de résoudre ce problème.");
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Aucun problème signalé. 🎉</Text> : null}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <Badge
                label={ISSUE_STATUS_LABELS[item.status]}
                tone={item.status === "RESOLVED" ? "success" : "danger"}
              />
            </View>
            <Badge label={ISSUE_CATEGORY_LABELS[item.category as IssueCategory] ?? item.category} tone="info" />
            {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
            {item.status !== "RESOLVED" ? (
              <Pressable onPress={() => resolve(item.id)}>
                <Text style={styles.resolveLink}>✅ Marquer comme résolu</Text>
              </Pressable>
            ) : null}
          </Card>
        )}
      />
      <Button label="Signaler un problème" onPress={() => navigation.navigate("IssueForm")} />
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
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resolveLink: {
    ...typography.caption,
    color: colors.success,
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
