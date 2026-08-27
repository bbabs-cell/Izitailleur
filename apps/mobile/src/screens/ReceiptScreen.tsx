import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { formatFcfa, PAYMENT_METHOD_LABELS } from "../domain/payments";
import { receiptsApi, type ReceiptDetail } from "../api/receipts";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";
import type { PaymentMethod } from "@izitailleur/shared";

type Props = NativeStackScreenProps<AppStackParamList, "Receipt">;

export function ReceiptScreen({ route }: Props) {
  const { t } = useTranslation();
  const { receiptId } = route.params;
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    card: { gap: t.spacing.sm, alignItems: "center", paddingVertical: t.spacing.xl },
    workshopName: { ...t.typography.title, color: t.colors.textPrimary, textAlign: "center" },
    workshopMeta: { ...t.typography.caption, color: t.colors.textSecondary, textAlign: "center" },
    number: { ...t.typography.overline, color: t.colors.accent, marginTop: t.spacing.md },
    amount: { ...t.typography.hero, color: t.colors.success, marginTop: t.spacing.xs },
    divider: { width: "100%", height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.md },
    row: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
    value: { ...t.typography.body, color: t.colors.textPrimary },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    error: { ...t.typography.body, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setReceipt(await receiptsApi.get(receiptId));
      setError(null);
    } catch {
      setError("Impossible de charger ce reçu (connexion requise).");
    }
  }, [receiptId]);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    if (!receipt) return;
    setSharing(true);
    try {
      await receiptsApi.downloadAndShare(receipt.id, receipt.number);
    } catch {
      setError("Impossible de générer ou partager le reçu.");
    } finally {
      setSharing(false);
    }
  }

  if (!receipt) {
    return (
      <View style={styles.container}>
        <Text style={error ? styles.error : styles.body}>{error ?? t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.workshopName}>{receipt.workshop.name}</Text>
        {receipt.workshop.address ? <Text style={styles.workshopMeta}>{receipt.workshop.address}</Text> : null}
        {receipt.workshop.phone ? <Text style={styles.workshopMeta}>{receipt.workshop.phone}</Text> : null}

        <Text style={styles.number}>REÇU N° {receipt.number}</Text>
        <Text style={styles.amount}>{formatFcfa(receipt.amount)}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>
            {receipt.order.customer.firstName} {receipt.order.customer.lastName}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Commande</Text>
          <Text style={styles.value}>
            #{receipt.order.reference} — {receipt.order.modelName}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mode de paiement</Text>
          <Text style={styles.value}>{PAYMENT_METHOD_LABELS[receipt.method as PaymentMethod] ?? receipt.method}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(receipt.createdAt).toLocaleString("fr-FR")}</Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label={sharing ? "Génération…" : "🧾 Partager / imprimer le reçu"} onPress={share} loading={sharing} />
    </ScrollView>
  );
}
