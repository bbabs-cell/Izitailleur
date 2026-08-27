import { useState } from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { garmentModelSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { modelsApi } from "../api/models";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "ModelForm">;

export function ModelFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  async function handleSubmit() {
    setError(null);
    const parsed = garmentModelSchema.safeParse({
      name,
      category: category || undefined,
      description: description || undefined,
      basePrice: basePrice ? Number(basePrice) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      const model = await modelsApi.create(parsed.data);
      navigation.replace("ModelDetail", { modelId: model.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer ce modèle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau modèle</Text>
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Boubou classique" />
      <TextField label="Catégorie" value={category} onChangeText={setCategory} placeholder="Homme, Femme, Enfant…" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />
      <TextField label="Prix de base (FCFA)" value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" />
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label={t("common.save")} onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}
