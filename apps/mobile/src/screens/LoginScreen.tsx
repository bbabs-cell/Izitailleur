import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { loginSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useAuth } from "../auth/AuthContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import { ApiError } from "../api/client";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, justifyContent: "center", gap: t.spacing.lg },
    title: { ...t.typography.hero, color: t.colors.accent, textAlign: "center" },
    subtitle: { ...t.typography.body, color: t.colors.textSecondary, textAlign: "center" },
    form: { gap: t.spacing.md },
    error: { color: t.colors.danger, ...t.typography.caption },
  }));

  async function handleSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      setError("Vérifiez le téléphone et le mot de passe (8 caractères minimum).");
      return;
    }
    setLoading(true);
    try {
      await login(parsed.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Connexion impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.appName")}</Text>
      <Text style={styles.subtitle}>{t("auth.tagline")}</Text>

      <View style={styles.form}>
        <TextField
          label={t("auth.phone")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          placeholder="+221700000000"
          testID="login-phone"
        />
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="login-password"
        />
        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
        <Button label={t("auth.login")} onPress={handleSubmit} loading={loading} testID="login-submit" />
        <Button
          label={t("auth.createWorkshop")}
          variant="secondary"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
    </View>
  );
}
