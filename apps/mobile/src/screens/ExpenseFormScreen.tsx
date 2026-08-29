import { useState } from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { expenseSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { expensesApi } from "../api/expenses";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "ExpenseForm">;

export function ExpenseFormScreen({ navigation }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  async function handleSubmit() {
    setError(null);
    const parsed = expenseSchema.safeParse({
      amount: Number(amount),
      description,
      category: category || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      await expensesApi.create(parsed.data);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible d'enregistrer cette dépense.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouvelle dépense</Text>
      <TextField label="Montant (FCFA)" value={amount} onChangeText={setAmount} keyboardType="numeric" autoFocus />
      <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Achat de tissus" />
      <TextField label="Catégorie (facultatif)" value={category} onChangeText={setCategory} placeholder="Fournitures, Loyer, Livraison…" />
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}
