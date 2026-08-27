import { z } from "zod";

export const garmentModelSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  description: z.string().max(1000).optional(),
  referenceImageUrl: z.string().url().optional(),
  basePrice: z.number().int().min(0).optional(),
});
export type GarmentModelDto = z.infer<typeof garmentModelSchema>;
