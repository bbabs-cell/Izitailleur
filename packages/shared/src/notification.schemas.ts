export const NOTIFICATION_TYPES = [
  "APPOINTMENT",
  "DELIVERY",
  "URGENT_ORDER",
  "DELAY",
  "DEBT",
  "STOCK",
  "TASK",
  "ISSUE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
