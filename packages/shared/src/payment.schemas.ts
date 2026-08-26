import { z } from "zod";

export const PAYMENT_METHODS = [
  "CASH",
  "WAVE",
  "ORANGE_MONEY",
  "MOOV_MONEY",
  "MTN_MONEY",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const createPaymentSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(300).optional(),
});
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
