import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { APPOINTMENT_TYPES, createAppointmentSchema, type AppointmentType } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { appointmentsRepo } from "../offline/appointmentsRepo";
import { customersRepo, type LocalCustomer } from "../offline/customersRepo";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "AppointmentForm">;

const TYPE_LABELS: Record<AppointmentType, string> = {
  FITTING: "Essayage",
  DELIVERY: "Livraison",
  PICKUP: "Récupération",
  PAYMENT: "Paiement",
  TASK: "Tâche",
  OTHER: "Autre",
};

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

export function AppointmentFormScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AppointmentType>("FITTING");
  const [daysAhead, setDaysAhead] = useState("1");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  useEffect(() => {
    customersRepo.list().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  async function handleSubmit() {
    setError(null);
    const days = Number(daysAhead);
    if (Number.isNaN(days) || days < 0) {
      setError("Le délai (en jours) est invalide.");
      return;
    }
    const parsed = createAppointmentSchema.safeParse({
      title,
      type,
      customerId,
      startAt: addDaysIso(days),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      // Écriture locale immédiate : fonctionne hors connexion, synchronisé en arrière-plan.
      await appointmentsRepo.create(parsed.data);
      navigation.goBack();
    } catch {
      setError("Impossible d'enregistrer ce rendez-vous sur l'appareil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau rendez-vous</Text>
      <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Essayage boubou" />
      <TextField label="Dans combien de jours ?" value={daysAhead} onChangeText={setDaysAhead} keyboardType="numeric" />

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {APPOINTMENT_TYPES.map((t) => (
          <Pressable key={t} onPress={() => setType(t)}>
            <Badge label={TYPE_LABELS[t]} tone={type === t ? "success" : "neutral"} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Client (optionnel)</Text>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCustomerId(customerId === item.id ? undefined : item.id)}>
            <Badge
              label={`${item.firstName} ${item.lastName}`}
              tone={customerId === item.id ? "success" : "neutral"}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ width: 4 }} />}
      />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}
