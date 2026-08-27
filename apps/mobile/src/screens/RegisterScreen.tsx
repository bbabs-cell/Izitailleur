import { useState } from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { registerSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useAuth } from "../auth/AuthContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [workshopName, setWorkshopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md, justifyContent: "center" },
    title: { ...t.typography.title, color: t.colors.textPrimary, textAlign: "center", marginBottom: t.spacing.md },
    subtitle: { ...t.typography.body, color: t.colors.textSecondary, textAlign: "center", marginBottom: t.spacing.md },
    error: { color: t.colors.danger, ...t.typography.caption },
  }));

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
      <Text style={styles.title}>{t("auth.createAccount")}</Text>
      <Text style={styles.subtitle}>{t("auth.registerTagline")}</Text>

      <TextField label={t("auth.workshopName")} value={workshopName} onChangeText={setWorkshopName} />
      <TextField label={t("auth.fullName")} value={fullName} onChangeText={setFullName} />
      <TextField
        label={t("auth.phone")}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        placeholder="+221700000000"
      />
      <TextField label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <Button label={t("auth.createAccount")} onPress={handleSubmit} loading={loading} />
      <Button label={t("auth.alreadyHaveAccount")} variant="secondary" onPress={() => navigation.navigate("Login")} />
    </ScrollView>
  );
}
