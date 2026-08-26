import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fabricSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { fabricsApi } from "../api/fabrics";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "FabricForm">;

export function FabricFormScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("m");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = fabricSchema.safeParse({
      name,
      color: color || undefined,
      quantity: Number(quantity),
      unit: unit || "m",
      location: location || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      const fabric = await fabricsApi.create(parsed.data);
      navigation.replace("FabricDetail", { fabricId: fabric.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer ce tissu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau tissu</Text>
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Bazin bleu" />
      <TextField label="Couleur" value={color} onChangeText={setColor} />
      <TextField label="Quantité initiale" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <TextField label="Unité" value={unit} onChangeText={setUnit} placeholder="m" />
      <TextField label="Emplacement" value={location} onChangeText={setLocation} />
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
