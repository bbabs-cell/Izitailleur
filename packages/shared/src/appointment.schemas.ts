import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "FITTING",
  "DELIVERY",
  "PICKUP",
  "PAYMENT",
  "TASK",
  "OTHER",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  type: z.enum(APPOINTMENT_TYPES),
  title: z.string().min(1).max(160),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
