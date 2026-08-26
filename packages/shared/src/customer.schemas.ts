import { z } from "zod";

export const customerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().min(8).max(20).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  address: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});
export type CustomerDto = z.infer<typeof customerSchema>;

export const measurementValuesSchema = z.record(z.string(), z.number());

export const createMeasurementProfileSchema = z.object({
  label: z.string().min(1).max(80),
});
export type CreateMeasurementProfileDto = z.infer<typeof createMeasurementProfileSchema>;

export const createMeasurementSchema = z.object({
  values: measurementValuesSchema,
});
export type CreateMeasurementDto = z.infer<typeof createMeasurementSchema>;
