import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createOrderSchema, PRIORITIES, type Priority } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { ordersRepo } from "../offline/ordersRepo";
import { customersRepo } from "../offline/customersRepo";
import type { LocalCustomer as Customer } from "../offline/customersRepo";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderForm">;

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
};

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function OrderFormScreen({ route, navigation }: Props) {
  const preselectedCustomerId = route.params?.customerId;
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modelName, setModelName] = useState("");
  const [fabricDescription, setFabricDescription] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [dueInDays, setDueInDays] = useState("7");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
    customerPicker: { gap: t.spacing.xs },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  useEffect(() => {
    if (!preselectedCustomerId) {
      customersRepo.list().then(setCustomers).catch(() => setCustomers([]));
    }
  }, [preselectedCustomerId]);

  async function handleSubmit() {
    setError(null);
    const priceNumber = Number(price);
    const depositNumber = deposit ? Number(deposit) : 0;
    const dueDays = Number(dueInDays);

    if (!customerId) {
      setError("Sélectionnez un client.");
      return;
    }
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("Le prix doit être un nombre positif.");
      return;
    }
    if (depositNumber > priceNumber) {
      setError("L'acompte ne peut pas dépasser le prix total.");
      return;
    }
    if (Number.isNaN(dueDays) || dueDays < 0) {
      setError("Le délai (en jours) est invalide.");
      return;
    }

    const parsed = createOrderSchema.safeParse({
      customerId,
      modelName,
      fabricDescription: fabricDescription || undefined,
      price: priceNumber,
      deposit: depositNumber,
      dueDate: addDaysIso(dueDays),
      priority,
      instructions: instructions || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setLoading(true);
    try {
      // Écriture locale immédiate : fonctionne hors connexion, synchronisée en arrière-plan.
      const order = await ordersRepo.create(parsed.data);
      navigation.replace("OrderDetail", { orderId: order.id });
    } catch {
      setError("Impossible d'enregistrer cette commande sur l'appareil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouvelle commande</Text>

      {!preselectedCustomerId && (
        <View style={styles.customerPicker}>
          <Text style={styles.label}>Client</Text>
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable onPress={() => setCustomerId(item.id)}>
                <Badge
                  label={`${item.firstName} ${item.lastName}`}
                  tone={customerId === item.id ? "success" : "neutral"}
                />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
          />
        </View>
      )}

      <TextField label="Modèle" value={modelName} onChangeText={setModelName} placeholder="Boubou homme" />
      <TextField label="Tissu" value={fabricDescription} onChangeText={setFabricDescription} placeholder="Bazin bleu" />
      <TextField label="Prix (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <TextField label="Acompte (FCFA)" value={deposit} onChangeText={setDeposit} keyboardType="numeric" />
      <TextField label="Délai (jours)" value={dueInDays} onChangeText={setDueInDays} keyboardType="numeric" />

      <Text style={styles.label}>Priorité</Text>
      <View style={styles.row}>
        {PRIORITIES.map((p) => (
          <Pressable key={p} onPress={() => setPriority(p)}>
            <Badge label={PRIORITY_LABELS[p]} tone={priority === p ? "warning" : "neutral"} />
          </Pressable>
        ))}
      </View>

      <TextField label="Instructions" value={instructions} onChangeText={setInstructions} multiline />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Créer la commande" onPress={handleSubmit} loading={loading} testID="order-submit" />
    </ScrollView>
  );
}
