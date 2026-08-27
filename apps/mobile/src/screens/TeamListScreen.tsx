import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { employeesApi, type Employee } from "../api/employees";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS, canManageTeam } from "../domain/roles";
import type { Role } from "@izitailleur/shared";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Team">;

export function TeamListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    row: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    phone: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
    skeletonList: { gap: t.spacing.sm },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(await employeesApi.list());
    } catch {
      setError("Impossible de charger l'équipe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  const canManage = user ? canManageTeam(user.role as Role) : false;

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      {loading && employees.length === 0 ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <EmptyState icon="people-outline" title="Équipe vide" description="Aucun membre pour le moment." />
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.name}>{item.fullName}</Text>
              <View style={styles.row}>
                <Badge label={ROLE_LABELS[item.role as Role] ?? item.role} tone="info" />
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
            </Card>
          )}
        />
      )}
      {canManage ? (
        <Button label="Inviter un membre" onPress={() => navigation.navigate("TeamInvite")} />
      ) : null}
    </View>
  );
}
