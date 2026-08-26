import type { PaymentMethod } from "@izitailleur/shared";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MOOV_MONEY: "Moov Money",
  MTN_MONEY: "MTN Mobile Money",
  OTHER: "Autre",
};

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
