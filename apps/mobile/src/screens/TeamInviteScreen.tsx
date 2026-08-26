import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { inviteEmployeeSchema, ROLES, type Role } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { employeesApi } from "../api/employees";
import { ApiError } from "../api/client";
import { ROLE_LABELS } from "../domain/roles";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "TeamInvite">;

const INVITABLE_ROLES = ROLES.filter((role) => role !== "OWNER");

export function TeamInviteScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("APPRENTICE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = inviteEmployeeSchema.safeParse({ fullName, phone, password, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      await employeesApi.invite(parsed.data);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible d'inviter ce membre.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inviter un membre de l'équipe</Text>
      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} />
      <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Mot de passe temporaire" value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={styles.label}>Rôle</Text>
      <View style={styles.row}>
        {INVITABLE_ROLES.map((r) => (
          <Pressable key={r} onPress={() => setRole(r)}>
            <Badge label={ROLE_LABELS[r]} tone={role === r ? "success" : "neutral"} />
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Envoyer l'invitation" onPress={handleSubmit} loading={loading} />
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
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
