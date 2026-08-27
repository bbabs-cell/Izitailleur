import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { issuesApi, type Issue } from "../api/issues";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from "../domain/issues";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useToast } from "../components/ToastContext";
import type { AppStackParamList } from "../navigation/RootNavigator";
import type { IssueCategory } from "@izitailleur/shared";

type Props = NativeStackScreenProps<AppStackParamList, "Issues">;

export function IssuesListScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { ...t.typography.subtitle, color: t.colors.textPrimary, flexShrink: 1 },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    resolveLink: { ...t.typography.caption, color: t.colors.success },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
      showToast("Problème marqué comme résolu", "success");
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
        ListEmptyComponent={!loading ? <EmptyState icon="checkmark-circle-outline" title="Aucun problème signalé" description="Tout va bien dans l'atelier." /> : null}
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Marquer comme résolu"
                onPress={() => resolve(item.id)}
              >
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
