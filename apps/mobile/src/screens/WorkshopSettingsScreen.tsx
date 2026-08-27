import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { updateWorkshopSchema } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { workshopApi } from "../api/workshop";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "WorkshopSettings">;

export function WorkshopSettingsScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [receiptFooterMessage, setReceiptFooterMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    caption: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
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
    } catch {
      setError("Impossible de charger les paramètres de l'atelier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setError(null);
    const parsed = updateWorkshopSchema.safeParse({
      name,
      phone: phone || null,
      address: address || null,
      receiptFooterMessage: receiptFooterMessage || null,
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
        <Text style={styles.body}>Chargement…</Text>
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

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Enregistrer" onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}
