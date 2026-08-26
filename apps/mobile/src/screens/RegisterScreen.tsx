import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { registerSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useAuth } from "../auth/AuthContext";
import { colors, spacing, typography } from "../theme/tokens";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [workshopName, setWorkshopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = registerSchema.safeParse({ workshopName, fullName, phone, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      await register(parsed.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Inscription impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Créer votre atelier</Text>

      <TextField label="Nom de l'atelier" value={workshopName} onChangeText={setWorkshopName} />
      <TextField label="Votre nom complet" value={fullName} onChangeText={setFullName} />
      <TextField
        label="Téléphone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        placeholder="+221700000000"
      />
      <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <Button label="Créer mon compte" onPress={handleSubmit} loading={loading} />
      <Button label="J'ai déjà un compte" variant="secondary" onPress={() => navigation.navigate("Login")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    ...typography.caption,
  },
});
