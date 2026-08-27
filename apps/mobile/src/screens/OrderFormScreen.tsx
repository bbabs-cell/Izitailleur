import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createOrderSchema, PRIORITIES, type Priority } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { ordersRepo } from "../offline/ordersRepo";
import { customersRepo } from "../offline/customersRepo";
import type { LocalCustomer as Customer } from "../offline/customersRepo";
import { formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderForm">;

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
};

const STEPS = [
  "Client",
  "Modèle",
  "Tissu",
  "Prix",
  "Acompte",
  "Délai",
  "Priorité",
  "Instructions",
  "Récapitulatif",
] as const;

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function OrderFormScreen({ route, navigation }: Props) {
  const preselectedCustomerId = route.params?.customerId;
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modelName, setModelName] = useState(route.params?.modelName ?? "");
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
    progressRow: { flexDirection: "row", gap: 4 },
    progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.colors.border },
    progressDotDone: { backgroundColor: t.colors.accent },
    stepLabel: { ...t.typography.overline, color: t.colors.accent },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
    customerPicker: { gap: t.spacing.xs },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs },
    navRow: { flexDirection: "row", gap: t.spacing.sm },
    navButton: { flex: 1 },
    error: { ...t.typography.caption, color: t.colors.danger },
    summaryCard: { gap: t.spacing.xs },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryLabel: { ...t.typography.caption, color: t.colors.textSecondary },
    summaryValue: { ...t.typography.body, color: t.colors.textPrimary },
  }));

  useEffect(() => {
    if (!preselectedCustomerId) {
      customersRepo.list().then(setCustomers).catch(() => setCustomers([]));
    }
  }, [preselectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const priceNumber = Number(price);
  const depositNumber = deposit ? Number(deposit) : 0;
  const dueDays = Number(dueInDays);

  function validateStep(): string | null {
    switch (STEPS[step]) {
      case "Client":
        return customerId ? null : "Sélectionnez un client.";
      case "Modèle":
        return modelName.trim() ? null : "Le nom du modèle est obligatoire.";
      case "Prix":
        return !Number.isNaN(priceNumber) && priceNumber >= 0 ? null : "Le prix doit être un nombre positif.";
      case "Acompte":
        return depositNumber <= priceNumber ? null : "L'acompte ne peut pas dépasser le prix total.";
      case "Délai":
        return !Number.isNaN(dueDays) && dueDays >= 0 ? null : "Le délai (en jours) est invalide.";
      default:
        return null;
    }
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    if (step === 0) {
      navigation.goBack();
    } else {
      setStep((s) => s - 1);
    }
  }

  async function handleSubmit() {
    setError(null);
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

  const currentStep = STEPS[step];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressDot, i <= step ? styles.progressDotDone : null]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        ÉTAPE {step + 1}/{STEPS.length}
      </Text>
      <Text style={styles.title}>{currentStep}</Text>

      {currentStep === "Client" ? (
        preselectedCustomerId ? (
          <Text style={styles.label}>Client présélectionné.</Text>
        ) : (
          <View style={styles.customerPicker}>
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
        )
      ) : null}

      {currentStep === "Modèle" ? (
        <TextField label="Modèle" value={modelName} onChangeText={setModelName} placeholder="Boubou homme" autoFocus />
      ) : null}

      {currentStep === "Tissu" ? (
        <TextField
          label="Tissu"
          value={fabricDescription}
          onChangeText={setFabricDescription}
          placeholder="Bazin bleu"
          autoFocus
        />
      ) : null}

      {currentStep === "Prix" ? (
        <TextField label="Prix (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" autoFocus />
      ) : null}

      {currentStep === "Acompte" ? (
        <TextField label="Acompte (FCFA)" value={deposit} onChangeText={setDeposit} keyboardType="numeric" autoFocus />
      ) : null}

      {currentStep === "Délai" ? (
        <TextField
          label="Délai (jours)"
          value={dueInDays}
          onChangeText={setDueInDays}
          keyboardType="numeric"
          autoFocus
        />
      ) : null}

      {currentStep === "Priorité" ? (
        <View style={styles.row}>
          {PRIORITIES.map((p) => (
            <Pressable key={p} onPress={() => setPriority(p)}>
              <Badge label={PRIORITY_LABELS[p]} tone={priority === p ? "warning" : "neutral"} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentStep === "Instructions" ? (
        <TextField
          label="Instructions"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          placeholder="Précisions pour l'atelier (facultatif)"
        />
      ) : null}

      {currentStep === "Récapitulatif" ? (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Client</Text>
            <Text style={styles.summaryValue}>
              {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "Présélectionné"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Modèle</Text>
            <Text style={styles.summaryValue}>{modelName || "—"}</Text>
          </View>
          {fabricDescription ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tissu</Text>
              <Text style={styles.summaryValue}>{fabricDescription}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Prix</Text>
            <Text style={styles.summaryValue}>{Number.isNaN(priceNumber) ? "—" : formatFcfa(priceNumber)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Acompte</Text>
            <Text style={styles.summaryValue}>{formatFcfa(depositNumber)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Délai</Text>
            <Text style={styles.summaryValue}>{dueInDays} jour(s)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Priorité</Text>
            <Text style={styles.summaryValue}>{PRIORITY_LABELS[priority]}</Text>
          </View>
          {instructions ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Instructions</Text>
              <Text style={styles.summaryValue}>{instructions}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <View style={styles.navRow}>
        <View style={styles.navButton}>
          <Button label={step === 0 ? "Annuler" : "Retour"} variant="secondary" onPress={goBack} />
        </View>
        <View style={styles.navButton}>
          {currentStep === "Récapitulatif" ? (
            <Button label="Créer la commande" onPress={handleSubmit} loading={loading} testID="order-submit" />
          ) : (
            <Button label="Suivant" onPress={goNext} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
