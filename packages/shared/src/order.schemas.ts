import { z } from "zod";

export const ORDER_STATUSES = [
  "NEW",
  "PENDING",
  "CUTTING",
  "SEWING",
  "FITTING",
  "ALTERATION",
  "FINISHING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PENDING", "CUTTING", "CANCELLED"],
  PENDING: ["CUTTING", "CANCELLED"],
  CUTTING: ["SEWING", "CANCELLED"],
  SEWING: ["FITTING", "FINISHING", "CANCELLED"],
  FITTING: ["ALTERATION", "FINISHING", "CANCELLED"],
  ALTERATION: ["FITTING", "FINISHING", "CANCELLED"],
  FINISHING: ["READY", "CANCELLED"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  measurementProfileId: z.string().uuid().optional(),
  modelName: z.string().min(1).max(120),
  fabricDescription: z.string().max(200).optional(),
  quantity: z.number().int().min(1).default(1),
  price: z.number().int().min(0),
  deposit: z.number().int().min(0).default(0),
  dueDate: z.string().datetime(),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  assignedToId: z.string().uuid().optional(),
  instructions: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;

export const createOrderTaskSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});
export type CreateOrderTaskDto = z.infer<typeof createOrderTaskSchema>;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const updateOrderTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});
export type UpdateOrderTaskStatusDto = z.infer<typeof updateOrderTaskStatusSchema>;

export const createOrderImageSchema = z.object({
  url: z.string().url(),
});
export type CreateOrderImageDto = z.infer<typeof createOrderImageSchema>;
