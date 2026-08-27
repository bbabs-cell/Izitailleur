import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supplierSchema } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { EmptyState } from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { suppliersApi, type Supplier } from "../api/suppliers";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Suppliers">;

export function SuppliersListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    form: { gap: t.spacing.sm },
    list: { gap: t.spacing.sm, paddingTop: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    name: { ...t.typography.subtitle, color: t.colors.textPrimary },
    body: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
    skeletonList: { gap: t.spacing.sm, paddingTop: t.spacing.sm },
  }));

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      setSuppliers(await suppliersApi.list());
    } catch {
      setError("Impossible de charger les fournisseurs.");
    } finally {
      setListLoading(false);
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
        <Button label={t("common.add")} onPress={handleAdd} loading={loading} />
      </Card>

      {listLoading && suppliers.length === 0 ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !listLoading ? (
              <EmptyState icon="cube-outline" title="Aucun fournisseur" description="Ajoutez votre premier fournisseur." />
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.body}>{item.phone}</Text> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}
