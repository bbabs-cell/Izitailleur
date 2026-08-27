import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeContext";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { customersApi, type Customer } from "../api/customers";
import { ordersRepo, type LocalOrder } from "../offline/ordersRepo";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "../domain/orderStatus";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Search">;

type Result =
  | { kind: "customer"; id: string; title: string; subtitle: string }
  | { kind: "order"; id: string; title: string; subtitle: string; status: LocalOrder["status"] };

export function SearchScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  useEffect(() => {
    ordersRepo.list().then(setOrders).catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCustomers([]);
      return;
    }
    const timeout = setTimeout(() => {
      customersApi.list(q).then(setCustomers).catch(() => setCustomers([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const customerResults: Result[] = customers.map((c) => ({
      kind: "customer",
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.phone ?? "Sans téléphone",
    }));
    const orderResults: Result[] = orders
      .filter(
        (o) =>
          o.modelName.toLowerCase().includes(q) ||
          o.customerFirstName.toLowerCase().includes(q) ||
          o.customerLastName.toLowerCase().includes(q) ||
          (o.reference ?? "").toLowerCase().includes(q),
      )
      .map((o) => ({
        kind: "order",
        id: o.id,
        title: o.modelName,
        subtitle: `${o.customerFirstName} ${o.customerLastName}`,
        status: o.status,
      }));
    return [...customerResults, ...orderResults];
  }, [query, customers, orders]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
      <TextField
        label="Rechercher"
        placeholder="Client, commande, référence…"
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
      />

      <FlatList
        style={{ marginTop: spacing.md }}
        data={results}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <Text style={[typography.body, { color: colors.textMuted }]}>Aucun résultat.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { paddingVertical: spacing.sm, borderBottomColor: colors.border }]}
            onPress={() =>
              item.kind === "customer"
                ? navigation.navigate("CustomerDetail", { customerId: item.id })
                : navigation.navigate("OrderDetail", { orderId: item.id })
            }
          >
            <Ionicons
              name={item.kind === "customer" ? "person-outline" : "shirt-outline"}
              size={20}
              color={colors.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            {item.kind === "order" ? (
              <Badge label={ORDER_STATUS_LABELS[item.status as keyof typeof ORDER_STATUS_LABELS] ?? item.status} tone={ORDER_STATUS_TONE[item.status as keyof typeof ORDER_STATUS_TONE] ?? "neutral"} />
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
});
