import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createPaymentSchema, PAYMENT_METHODS, type PaymentMethod } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { paymentsApi, type OrderPayments } from "../api/payments";
import { invoiceApi } from "../api/invoice";
import { ordersRepo } from "../offline/ordersRepo";
import { ApiError } from "../api/client";
import { PAYMENT_METHOD_LABELS, formatFcfa } from "../domain/payments";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useToast } from "../components/ToastContext";
import { useTranslation } from "../i18n/I18nContext";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderPayments">;

export function OrderPaymentsScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { orderId } = route.params;
  const [data, setData] = useState<OrderPayments | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharingInvoice, setSharingInvoice] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    summaryCard: { gap: t.spacing.xs },
    form: { gap: t.spacing.sm },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary },
    label: { ...t.typography.caption, color: t.colors.textSecondary },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs },
    paymentCard: { gap: t.spacing.xs },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    amount: { ...t.typography.subtitle, color: t.colors.textPrimary },
    balance: { ...t.typography.subtitle },
    due: { color: t.colors.warning },
    paid: { color: t.colors.success },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    receiptLink: { ...t.typography.caption, color: t.colors.accentAlt },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

  const load = useCallback(async () => {
    try {
      setData(await paymentsApi.list(orderId));
    } catch {
      setError("Impossible de charger les paiements.");
    }
  }, [orderId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  async function handleAdd() {
    setError(null);
    const parsed = createPaymentSchema.safeParse({ amount: Number(amount), method });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Montant invalide.");
      return;
    }
    setLoading(true);
    try {
      await paymentsApi.create(orderId, parsed.data);
      setAmount("");
      await load();
      showToast("Paiement enregistré", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Paiement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function shareInvoice() {
    setSharingInvoice(true);
    setError(null);
    try {
      const localOrder = await ordersRepo.get(orderId);
      await invoiceApi.downloadAndShare(orderId, localOrder?.reference ?? orderId);
    } catch {
      setError("Impossible de générer ou partager la facture.");
    } finally {
      setSharingInvoice(false);
    }
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{error ?? t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.summaryCard}>
        <Text style={styles.body}>Prix total : {formatFcfa(data.price)}</Text>
        <Text style={styles.body}>Déjà payé : {formatFcfa(data.totalPaid)}</Text>
        <Text style={[styles.balance, data.balance > 0 ? styles.due : styles.paid]}>
          {data.balance > 0 ? `Solde restant : ${formatFcfa(data.balance)}` : "Payée intégralement"}
        </Text>
      </Card>

      <Button
        label={sharingInvoice ? "Génération…" : "🧾 Facture complète de la commande"}
        variant="secondary"
        onPress={shareInvoice}
        loading={sharingInvoice}
      />

      {data.balance > 0 ? (
        <Card style={styles.form}>
          <Text style={styles.section}>Nouveau paiement</Text>
          <TextField
            label="Montant (FCFA)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            testID="payment-amount"
          />
          <Text style={styles.label}>Mode de paiement</Text>
          <View style={styles.row}>
            {PAYMENT_METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: method === m }}
                accessibilityLabel={PAYMENT_METHOD_LABELS[m]}
              >
                <Badge label={PAYMENT_METHOD_LABELS[m]} tone={method === m ? "success" : "neutral"} />
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          <Button label="Enregistrer le paiement" onPress={handleAdd} loading={loading} testID="payment-submit" />
        </Card>
      ) : null}

      <Text style={styles.section}>Historique des paiements</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.body}>Aucun paiement enregistré (hors acompte initial).</Text>
      ) : (
        data.payments.map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <View style={styles.headerRow}>
              <Text style={styles.amount}>{formatFcfa(payment.amount)}</Text>
              <Badge label={PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method} tone="info" />
            </View>
            <Text style={styles.body}>{new Date(payment.createdAt).toLocaleString("fr-FR")}</Text>
            {payment.receipt ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Voir le reçu ${payment.receipt.number}`}
                onPress={() => navigation.navigate("Receipt", { receiptId: payment.receipt!.id })}
              >
                <Text style={styles.receiptLink}>🧾 Voir le reçu {payment.receipt.number}</Text>
              </Pressable>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
