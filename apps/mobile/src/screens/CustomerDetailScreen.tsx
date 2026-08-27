import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { customersApi, type CustomerDetail } from "../api/customers";
import { customersRepo, type LocalCustomer } from "../offline/customersRepo";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "../domain/orderStatus";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "CustomerDetail">;

export function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [localOnly, setLocalOnly] = useState<LocalCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.sm },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary, marginTop: t.spacing.md },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    card: { gap: t.spacing.xs },
    cardTitle: { ...t.typography.body, color: t.colors.textPrimary },
    error: { ...t.typography.body, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      const result = await customersApi.get(customerId);
      setCustomer(result);
      setLocalOnly(null);
      setError(null);
    } catch {
      // Hors connexion, ou client créé localement pas encore synchronisé : on retombe sur
      // la copie locale plutôt que d'afficher une erreur bloquante.
      const local = await customersRepo.get(customerId);
      if (local) {
        setLocalOnly(local);
        setCustomer(null);
        setError(null);
      } else {
        setError("Impossible de charger ce client (hors connexion et non trouvé localement).");
      }
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

  if (localOnly) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Badge
          label={localOnly.conflict ? "Conflit à résoudre" : "En attente de synchronisation"}
          tone={localOnly.conflict ? "danger" : "warning"}
        />
        <Text style={styles.title}>
          {localOnly.firstName} {localOnly.lastName}
        </Text>
        {localOnly.phone ? <Text style={styles.body}>📞 {localOnly.phone}</Text> : null}
        {localOnly.address ? <Text style={styles.body}>📍 {localOnly.address}</Text> : null}
        {localOnly.notes ? <Text style={styles.body}>📝 {localOnly.notes}</Text> : null}
        <Text style={styles.body}>
          Les mensurations et commandes de ce client seront disponibles ici une fois la
          synchronisation effectuée (voir l'écran Synchronisation).
        </Text>
      </ScrollView>
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
