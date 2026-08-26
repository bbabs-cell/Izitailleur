import { Injectable } from "@nestjs/common";
import {
  syncAppointmentDataSchema,
  syncCustomerDataSchema,
  type PushSyncDto,
  type SyncMutation,
  type SyncMutationResult,
} from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async pull(workshopId: string, since: Date) {
    const [customers, appointments] = await Promise.all([
      this.prisma.customer.findMany({ where: { workshopId, updatedAt: { gt: since } } }),
      this.prisma.appointment.findMany({ where: { workshopId, updatedAt: { gt: since } } }),
    ]);
    return { serverTime: new Date().toISOString(), customers, appointments };
  }

  async push(workshopId: string, dto: PushSyncDto): Promise<SyncMutationResult[]> {
    const results: SyncMutationResult[] = [];
    for (const mutation of dto.mutations) {
      results.push(await this.applyOne(workshopId, mutation));
    }
    return results;
  }

  private async applyOne(workshopId: string, mutation: SyncMutation): Promise<SyncMutationResult> {
    if (mutation.entity === "customer") {
      return this.applyCustomer(workshopId, mutation);
    }
    return this.applyAppointment(workshopId, mutation);
  }

  private async applyCustomer(workshopId: string, mutation: SyncMutation): Promise<SyncMutationResult> {
    const { entity, id } = mutation;

    if (mutation.op === "create") {
      const parsed = syncCustomerDataSchema.safeParse(mutation.data);
      if (!parsed.success) {
        return { entity, id, status: "error", message: "Données client invalides" };
      }
      const existing = await this.prisma.customer.findUnique({ where: { id } });
      if (existing) {
        // Rejeu idempotent d'une mutation déjà appliquée (ex : réponse réseau perdue).
        return { entity, id, status: "applied", serverRecord: existing };
      }
      const created = await this.prisma.customer.create({ data: { id, workshopId, ...parsed.data } });
      return { entity, id, status: "applied", serverRecord: created };
    }

    const current = await this.prisma.customer.findFirst({ where: { id, workshopId } });
    if (!current) {
      return { entity, id, status: "not_found" };
    }
    if (current.updatedAt.getTime() > new Date(mutation.baseUpdatedAt).getTime()) {
      return { entity, id, status: "conflict", serverRecord: current };
    }

    if (mutation.op === "delete") {
      const deleted = await this.prisma.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { entity, id, status: "applied", serverRecord: deleted };
    }

    const parsed = syncCustomerDataSchema.partial().safeParse(mutation.data);
    if (!parsed.success) {
      return { entity, id, status: "error", message: "Données client invalides" };
    }
    const updated = await this.prisma.customer.update({ where: { id }, data: parsed.data });
    return { entity, id, status: "applied", serverRecord: updated };
  }

  private async applyAppointment(workshopId: string, mutation: SyncMutation): Promise<SyncMutationResult> {
    const { entity, id } = mutation;

    if (mutation.op === "create") {
      const parsed = syncAppointmentDataSchema.safeParse(mutation.data);
      if (!parsed.success) {
        return { entity, id, status: "error", message: "Données rendez-vous invalides" };
      }
      const existing = await this.prisma.appointment.findUnique({ where: { id } });
      if (existing) {
        return { entity, id, status: "applied", serverRecord: existing };
      }
      const created = await this.prisma.appointment.create({
        data: {
          id,
          workshopId,
          customerId: parsed.data.customerId ?? undefined,
          orderId: parsed.data.orderId ?? undefined,
          type: parsed.data.type,
          title: parsed.data.title,
          startAt: new Date(parsed.data.startAt),
          endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
          notes: parsed.data.notes ?? undefined,
        },
      });
      return { entity, id, status: "applied", serverRecord: created };
    }

    const current = await this.prisma.appointment.findFirst({ where: { id, workshopId } });
    if (!current) {
      return { entity, id, status: "not_found" };
    }
    if (current.updatedAt.getTime() > new Date(mutation.baseUpdatedAt).getTime()) {
      return { entity, id, status: "conflict", serverRecord: current };
    }

    if (mutation.op === "delete") {
      const deleted = await this.prisma.appointment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { entity, id, status: "applied", serverRecord: deleted };
    }

    const parsed = syncAppointmentDataSchema.partial().safeParse(mutation.data);
    if (!parsed.success) {
      return { entity, id, status: "error", message: "Données rendez-vous invalides" };
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...parsed.data,
        startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
        endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
      },
    });
    return { entity, id, status: "applied", serverRecord: updated };
  }
}
