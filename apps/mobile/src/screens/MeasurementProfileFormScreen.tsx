import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createMeasurementProfileSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { customersApi } from "../api/customers";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "MeasurementProfileForm">;

const STANDARD_FIELDS = [
  "epaule",
  "poitrine",
  "taille",
  "hanche",
  "cou",
  "bras",
  "manche",
  "longueur",
] as const;

export function MeasurementProfileFormScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary, marginTop: t.spacing.sm },
    row: { flexDirection: "row", alignItems: "flex-end", gap: t.spacing.sm },
    rowInput: { flex: 1 },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  function setValue(field: string, raw: string) {
    setValues((prev) => ({ ...prev, [field]: raw }));
  }

  function addCustomField() {
    const name = customFieldName.trim();
    if (!name || customFields.includes(name)) return;
    setCustomFields((prev) => [...prev, name]);
    setCustomFieldName("");
  }

  async function handleSubmit() {
    setError(null);
    if (!label.trim()) {
      setError("Le nom du profil est obligatoire (ex : Boubou standard).");
      return;
    }
    const numericValues: Record<string, number> = {};
    for (const [field, raw] of Object.entries(values)) {
      if (raw.trim() === "") continue;
      const num = Number(raw);
      if (Number.isNaN(num)) {
        setError(`La valeur de "${field}" doit être un nombre.`);
        return;
      }
      numericValues[field] = num;
    }

    const parsedProfile = createMeasurementProfileSchema.safeParse({ label });
    if (!parsedProfile.success) {
      setError("Nom de profil invalide.");
      return;
    }

    setLoading(true);
    try {
      const profile = await customersApi.createMeasurementProfile(customerId, parsedProfile.data);
      if (Object.keys(numericValues).length > 0) {
        await customersApi.addMeasurement(profile.id, { values: numericValues });
      }
      navigation.navigate("CustomerDetail", { customerId });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer le profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nouveau profil de mensurations</Text>
      <TextField label="Nom du profil" value={label} onChangeText={setLabel} placeholder="Boubou standard" />

      <Text style={styles.section}>Mesures (cm)</Text>
      {STANDARD_FIELDS.map((field) => (
        <TextField
          key={field}
          label={field}
          value={values[field] ?? ""}
          onChangeText={(text) => setValue(field, text)}
          keyboardType="numeric"
        />
      ))}
      {customFields.map((field) => (
        <TextField
          key={field}
          label={field}
          value={values[field] ?? ""}
          onChangeText={(text) => setValue(field, text)}
          keyboardType="numeric"
        />
      ))}

      <Text style={styles.section}>Ajouter une mesure personnalisée</Text>
      <View style={styles.row}>
        <View style={styles.rowInput}>
          <TextField
            label="Nom du champ"
            value={customFieldName}
            onChangeText={setCustomFieldName}
            placeholder="ex : tour de poignet"
          />
        </View>
        <Button label="Ajouter" variant="secondary" onPress={addCustomField} />
      </View>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer le profil" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}
