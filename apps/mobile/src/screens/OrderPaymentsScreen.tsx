import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createPaymentSchema, PAYMENT_METHODS, type PaymentMethod } from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { paymentsApi, type OrderPayments } from "../api/payments";
import { receiptsApi } from "../api/receipts";
import { ApiError } from "../api/client";
import { PAYMENT_METHOD_LABELS, formatFcfa } from "../domain/payments";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderPayments">;

export function OrderPaymentsScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [data, setData] = useState<OrderPayments | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Paiement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function shareReceipt(receiptId: string, number: string) {
    setSharingId(receiptId);
    setError(null);
    try {
      await receiptsApi.downloadAndShare(receiptId, number);
    } catch {
      setError("Impossible de générer ou partager le reçu.");
    } finally {
      setSharingId(null);
    }
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{error ?? "Chargement…"}</Text>
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
              <Pressable key={m} onPress={() => setMethod(m)}>
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
                onPress={() => shareReceipt(payment.receipt!.id, payment.receipt!.number)}
                disabled={sharingId === payment.receipt.id}
              >
                <Text style={styles.receiptLink}>
                  {sharingId === payment.receipt.id ? "Génération…" : `🧾 Partager le reçu ${payment.receipt.number}`}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  form: {
    gap: spacing.sm,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  paymentCard: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  balance: {
    ...typography.subtitle,
  },
  due: {
    color: colors.warning,
  },
  paid: {
    color: colors.success,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  receiptLink: {
    ...typography.caption,
    color: colors.accentAlt,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
