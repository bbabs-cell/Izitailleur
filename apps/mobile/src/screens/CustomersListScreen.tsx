import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { customersRepo, type LocalCustomer } from "../offline/customersRepo";
import { useSync } from "../offline/SyncContext";
import { colors, spacing, typography } from "../theme/tokens";
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
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCustomers(await customersRepo.list());
      setError(null);
    } catch {
      setError("Impossible de lire les clients enregistrés localement.");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  // Recharge depuis SQLite dès qu'une synchronisation vient de se terminer.
  useEffect(() => {
    if (syncStatus === "idle") {
      load();
    }
  }, [syncStatus, load]);

  const filtered = customers.filter((c) => matches(c, search));

  return (
    <View style={styles.container}>
      {syncStatus === "offline" ? <Badge label="Hors connexion — données locales" tone="warning" /> : null}
      <TextField label="Rechercher" value={search} onChangeText={setSearch} placeholder="Nom ou téléphone" />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun client pour le moment.</Text>}
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
                {item.dirty ? <Badge label="Non synchronisé" tone="info" /> : null}
                {item.conflict ? <Badge label="Conflit" tone="danger" /> : null}
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
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  phone: {
    ...typography.caption,
    color: colors.textSecondary,
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
