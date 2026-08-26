import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { customersApi, type Customer } from "../api/customers";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Customers">;

export function CustomersListScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await customersApi.list(query);
      setCustomers(results);
    } catch {
      setError("Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => load(search));
    return unsubscribe;
  }, [navigation, load, search]);

  return (
    <View style={styles.container}>
      <TextField
        label="Rechercher"
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          load(text);
        }}
        placeholder="Nom ou téléphone"
      />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => load(search)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Aucun client pour le moment.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
          >
            <Card style={styles.card}>
              <Text style={styles.name}>
                {item.firstName} {item.lastName}
              </Text>
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
