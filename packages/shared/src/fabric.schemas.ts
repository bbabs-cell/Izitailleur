import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  notes: z.string().max(1000).optional(),
});
export type SupplierDto = z.infer<typeof supplierSchema>;

export const fabricSchema = z.object({
  name: z.string().min(1).max(120),
  reference: z.string().max(60).optional(),
  color: z.string().max(60).optional(),
  quantity: z.number().min(0).default(0),
  unit: z.string().min(1).max(10).default("m"),
  purchasePrice: z.number().int().min(0).optional(),
  supplierId: z.string().uuid().optional(),
  location: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});
export type FabricDto = z.infer<typeof fabricSchema>;

export const FABRIC_MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT"] as const;
export type FabricMovementType = (typeof FABRIC_MOVEMENT_TYPES)[number];

export const createFabricMovementSchema = z.object({
  type: z.enum(FABRIC_MOVEMENT_TYPES),
  quantity: z.number().positive(),
  note: z.string().max(500).optional(),
});
export type CreateFabricMovementDto = z.infer<typeof createFabricMovementSchema>;
