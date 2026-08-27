import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { EmptyState } from "../components/EmptyState";
import { customersRepo, type LocalCustomer } from "../offline/customersRepo";
import { useSync } from "../offline/SyncContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Customers">;

function matches(customer: LocalCustomer, query: string): boolean {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return (
    customer.firstName.toLowerCase().includes(needle) ||
    customer.lastName.toLowerCase().includes(needle) ||
    (customer.phone ?? "").includes(needle)
  );
}

/**
 * Source de données : la base SQLite locale (offline-first), tenue à jour par le SyncContext.
 * Les créations écrivent immédiatement en local, hors connexion comme en ligne.
 */
export function CustomersListScreen({ navigation }: Props) {
  const { status: syncStatus } = useSync();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    phone: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setCustomers(await customersRepo.list());
      setError(null);
    } catch {
      setError("Impossible de lire les clients enregistrés localement.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    if (syncStatus === "idle") {
      load();
    }
  }, [syncStatus, load]);

  const filtered = customers.filter((c) => matches(c, search));

  return (
    <View style={styles.container}>
      {syncStatus === "offline" ? <Badge label={t("common.offline")} tone="warning" /> : null}
      <TextField label="Rechercher" value={search} onChangeText={setSearch} placeholder="Nom ou téléphone" />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon="people-outline"
              title="Aucun client"
              description="Ajoutez votre premier client pour commencer."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
          >
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.dirty ? <Badge label={t("common.unsynced")} tone="info" /> : null}
                {item.conflict ? <Badge label={t("common.conflict")} tone="danger" /> : null}
              </View>
              {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
            </Card>
          </Pressable>
        )}
      />

      <Button label="Nouveau client" onPress={() => navigation.navigate("CustomerForm")} />
    </View>
  );
}
