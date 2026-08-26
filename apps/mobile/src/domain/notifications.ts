import type { NotificationType } from "@izitailleur/shared";

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  APPOINTMENT: "📅",
  DELIVERY: "📦",
  URGENT_ORDER: "🔴",
  DELAY: "⏰",
  DEBT: "💰",
  STOCK: "🧵",
  TASK: "📋",
  ISSUE: "🚨",
};

export const NOTIFICATION_TONE: Record<NotificationType, "success" | "warning" | "danger" | "info"> = {
  APPOINTMENT: "info",
  DELIVERY: "warning",
  URGENT_ORDER: "danger",
  DELAY: "danger",
  DEBT: "warning",
  STOCK: "warning",
  TASK: "warning",
  ISSUE: "danger",
};
