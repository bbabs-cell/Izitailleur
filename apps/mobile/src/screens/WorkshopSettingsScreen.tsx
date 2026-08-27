import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { updateWorkshopSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Chip } from "../components/Chip";
import { workshopApi } from "../api/workshop";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopSettings">;

export function WorkshopSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [receiptFooterMessage, setReceiptFooterMessage] = useState("");
  const [measurementFields, setMeasurementFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary, marginTop: t.spacing.sm },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    caption: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs },
    addRow: { flexDirection: "row", alignItems: "flex-end", gap: t.spacing.sm },
    addField: { flex: 1 },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await workshopApi.get();
      setName(settings.name);
      setPhone(settings.phone ?? "");
      setAddress(settings.address ?? "");
      setReceiptFooterMessage(settings.receiptFooterMessage ?? "");
      setMeasurementFields(settings.measurementFields);
    } catch {
      setError("Impossible de charger les paramètres de l'atelier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addMeasurementField() {
    const field = newFieldName.trim().toLowerCase();
    if (!field || measurementFields.includes(field)) return;
    setMeasurementFields((prev) => [...prev, field]);
    setNewFieldName("");
  }

  function removeMeasurementField(field: string) {
    setMeasurementFields((prev) => prev.filter((f) => f !== field));
  }

  async function handleSave() {
    setError(null);
    const parsed = updateWorkshopSchema.safeParse({
      name,
      phone: phone || null,
      address: address || null,
      receiptFooterMessage: receiptFooterMessage || null,
      measurementFields,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setSaving(true);
    try {
      await workshopApi.update(parsed.data);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible d'enregistrer les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.body}>{t("common.loading")}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paramètres de l'atelier</Text>
      <TextField label="Nom de l'atelier" value={name} onChangeText={setName} />
      <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Adresse" value={address} onChangeText={setAddress} />
      <TextField
        label="Message personnalisé (reçus et factures)"
        value={receiptFooterMessage}
        onChangeText={setReceiptFooterMessage}
        placeholder="Merci de votre confiance."
        multiline
      />
      <Text style={styles.caption}>
        Ce message remplace « Merci de votre confiance. » en bas de tous les reçus et factures
        générés pour cet atelier.
      </Text>

      <Text style={styles.section}>Types de mesures</Text>
      <Text style={styles.caption}>
        Ces champs sont proposés par défaut lors de la création d'un profil de mensurations pour
        vos clients. Vous pouvez toujours en ajouter d'autres ponctuellement sur un profil précis.
      </Text>
      <View style={styles.chipsRow}>
        {measurementFields.map((field) => (
          <Chip key={field} label={`${field} ✕`} onPress={() => removeMeasurementField(field)} />
        ))}
      </View>
      <View style={styles.addRow}>
        <View style={styles.addField}>
          <TextField
            label="Ajouter un type de mesure"
            value={newFieldName}
            onChangeText={setNewFieldName}
            placeholder="ex : tour de poignet"
            onSubmitEditing={addMeasurementField}
          />
        </View>
        <Button label="Ajouter" variant="secondary" onPress={addMeasurementField} />
      </View>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label={t("common.save")} onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}
