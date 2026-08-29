import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(200),
  category: z.string().max(60).optional(),
  spentAt: z.string().datetime().optional(),
});
export type ExpenseDto = z.infer<typeof expenseSchema>;
