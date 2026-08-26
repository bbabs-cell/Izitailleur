import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { customersApi, type CustomerDetail } from "../api/customers";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "../domain/orderStatus";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "CustomerDetail">;

export function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await customersApi.get(customerId);
      setCustomer(result);
    } catch {
      setError("Impossible de charger ce client.");
    }
  }, [customerId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>⚠️ {error}</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {customer.firstName} {customer.lastName}
      </Text>
      {customer.phone ? <Text style={styles.body}>📞 {customer.phone}</Text> : null}
      {customer.address ? <Text style={styles.body}>📍 {customer.address}</Text> : null}
      {customer.notes ? <Text style={styles.body}>📝 {customer.notes}</Text> : null}

      <Text style={styles.section}>Mensurations</Text>
      {customer.measurementProfiles.length === 0 ? (
        <Text style={styles.body}>Aucun profil de mensurations.</Text>
      ) : (
        customer.measurementProfiles.map((profile) => (
          <Card key={profile.id} style={styles.card}>
            <Text style={styles.cardTitle}>{profile.label}</Text>
          </Card>
        ))
      )}
      <Button
        label="Nouveau profil de mensurations"
        variant="secondary"
        onPress={() => navigation.navigate("MeasurementProfileForm", { customerId })}
      />

      <Text style={styles.section}>Commandes</Text>
      {customer.orders.length === 0 ? (
        <Text style={styles.body}>Aucune commande pour ce client.</Text>
      ) : (
        customer.orders.map((order) => (
          <Card key={order.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              #{order.reference} — {order.modelName}
            </Text>
            <Badge
              label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
              tone={ORDER_STATUS_TONE[order.status as keyof typeof ORDER_STATUS_TONE]}
            />
          </Card>
        ))
      )}
      <Button
        label="Nouvelle commande pour ce client"
        onPress={() => navigation.navigate("OrderForm", { customerId })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
});
