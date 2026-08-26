import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { customersRepo } from "../offline/customersRepo";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "CustomerForm">;

export function CustomerFormScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = customerSchema.safeParse({
      firstName,
      lastName,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      // Écriture locale immédiate (SQLite) — fonctionne même hors connexion.
      // La synchronisation avec le serveur se fait en arrière-plan (voir SyncContext).
      await customersRepo.create(parsed.data);
      navigation.navigate("Customers");
    } catch {
      setError("Impossible d'enregistrer ce client sur l'appareil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau client</Text>
      <TextField label="Prénom" value={firstName} onChangeText={setFirstName} testID="customer-firstname" />
      <TextField label="Nom" value={lastName} onChangeText={setLastName} testID="customer-lastname" />
      <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Adresse" value={address} onChangeText={setAddress} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer" onPress={handleSubmit} loading={loading} testID="customer-submit" />
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
