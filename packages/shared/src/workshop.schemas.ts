import { z } from "zod";

export const updateWorkshopSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  receiptFooterMessage: z.string().max(300).optional().nullable(),
});
export type UpdateWorkshopDto = z.infer<typeof updateWorkshopSchema>;

export interface WorkshopSettings {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  receiptFooterMessage: string | null;
}
