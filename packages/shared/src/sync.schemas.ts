import { z } from "zod";

export const SYNCABLE_ENTITIES = ["customer", "appointment"] as const;
export type SyncableEntity = (typeof SYNCABLE_ENTITIES)[number];

export const syncCustomerDataSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().min(8).max(20).optional().nullable(),
  whatsapp: z.string().min(8).max(20).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const syncAppointmentDataSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  type: z.enum(["FITTING", "DELIVERY", "PICKUP", "PAYMENT", "TASK", "OTHER"]),
  title: z.string().min(1).max(160),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const syncMutationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create"),
    entity: z.enum(SYNCABLE_ENTITIES),
    id: z.string().uuid(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("update"),
    entity: z.enum(SYNCABLE_ENTITIES),
    id: z.string().uuid(),
    baseUpdatedAt: z.string().datetime(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("delete"),
    entity: z.enum(SYNCABLE_ENTITIES),
    id: z.string().uuid(),
    baseUpdatedAt: z.string().datetime(),
  }),
]);
export type SyncMutation = z.infer<typeof syncMutationSchema>;

export const pushSyncSchema = z.object({
  mutations: z.array(syncMutationSchema).max(200),
});
export type PushSyncDto = z.infer<typeof pushSyncSchema>;

export type SyncMutationStatus = "applied" | "conflict" | "error" | "not_found";

export interface SyncMutationResult {
  entity: SyncableEntity;
  id: string;
  status: SyncMutationStatus;
  serverRecord?: unknown;
  message?: string;
}
