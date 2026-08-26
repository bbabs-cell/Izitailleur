import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supplierSchema } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { suppliersApi, type Supplier } from "../api/suppliers";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Suppliers">;

export function SuppliersListScreen({ navigation }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setSuppliers(await suppliersApi.list());
    } catch {
      setError("Impossible de charger les fournisseurs.");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function handleAdd() {
    setError(null);
    const parsed = supplierSchema.safeParse({ name, phone: phone || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nom du fournisseur requis.");
      return;
    }
    setLoading(true);
    try {
      await suppliersApi.create(parsed.data);
      setName("");
      setPhone("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer ce fournisseur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.form}>
        <TextField label="Nom du fournisseur" value={name} onChangeText={setName} />
        <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
        <Button label="Ajouter" onPress={handleAdd} loading={loading} />
      </Card>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun fournisseur enregistré.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.phone ? <Text style={styles.body}>{item.phone}</Text> : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  form: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
