import type { OrderStatus } from "@izitailleur/shared";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Nouvelle",
  PENDING: "En attente",
  CUTTING: "Coupe",
  SEWING: "Couture",
  FITTING: "Essayage",
  ALTERATION: "Retouche",
  FINISHING: "Finition",
  READY: "Prête",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  NEW: "info",
  PENDING: "neutral",
  CUTTING: "info",
  SEWING: "info",
  FITTING: "warning",
  ALTERATION: "warning",
  FINISHING: "info",
  READY: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function isOrderLate(dueDate: string, status: OrderStatus): boolean {
  if (status === "DELIVERED" || status === "CANCELLED") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function isOrderDueSoon(dueDate: string, status: OrderStatus, withinMs = 2 * 86400000): boolean {
  if (status === "DELIVERED" || status === "CANCELLED") return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff >= 0 && diff <= withinMs;
}
