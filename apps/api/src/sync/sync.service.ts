import { Injectable } from "@nestjs/common";
import {
  syncAppointmentDataSchema,
  syncCustomerDataSchema,
  syncOrderCreateDataSchema,
  syncOrderUpdateDataSchema,
  syncTaskCreateDataSchema,
  syncTaskUpdateDataSchema,
  type PushSyncDto,
  type Role,
  type SyncMutation,
  type SyncMutationResult,
} from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { redactOrderFinancials } from "../common/redact-financials";

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async pull(workshopId: string, role: Role, since: Date) {
    const [customers, appointments, orders, tasks] = await Promise.all([
      this.prisma.customer.findMany({ where: { workshopId, updatedAt: { gt: since } } }),
      this.prisma.appointment.findMany({ where: { workshopId, updatedAt: { gt: since } } }),
      this.prisma.order.findMany({
        where: { workshopId, updatedAt: { gt: since } },
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.orderTask.findMany({
        where: { order: { workshopId }, updatedAt: { gt: since } },
      }),
    ]);
    return {
      serverTime: new Date().toISOString(),
      customers,
      appointments,
      orders: orders.map((order) => redactOrderFinancials(order, role)),
      tasks,
    };
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
    if (mutation.entity === "appointment") {
      return this.applyAppointment(workshopId, mutation);
    }
    if (mutation.entity === "order") {
      return this.applyOrder(workshopId, mutation);
    }
    return this.applyTask(workshopId, mutation);
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

  /**
   * Commandes hors connexion : la création réutilise OrdersService.create (même logique que
   * l'endpoint POST /orders — génération de référence, vérification/consommation du stock de
   * tissu). Aucune édition de champs ni suppression : ces opérations n'existent pas non plus
   * pour les commandes en ligne.
   */
  private async applyOrder(workshopId: string, mutation: SyncMutation): Promise<SyncMutationResult> {
    const { entity, id } = mutation;

    if (mutation.op === "delete") {
      return { entity, id, status: "error", message: "La suppression de commande n'est pas prise en charge" };
    }

    if (mutation.op === "create") {
      const parsed = syncOrderCreateDataSchema.safeParse(mutation.data);
      if (!parsed.success) {
        return { entity, id, status: "error", message: "Données commande invalides" };
      }
      const existing = await this.prisma.order.findUnique({ where: { id } });
      if (existing) {
        return { entity, id, status: "applied", serverRecord: existing };
      }
      try {
        const created = await this.ordersService.create(workshopId, parsed.data, id);
        return { entity, id, status: "applied", serverRecord: created };
      } catch (e) {
        return { entity, id, status: "error", message: e instanceof Error ? e.message : "Création de commande impossible" };
      }
    }

    const current = await this.prisma.order.findFirst({ where: { id, workshopId } });
    if (!current) {
      return { entity, id, status: "not_found" };
    }
    if (current.updatedAt.getTime() > new Date(mutation.baseUpdatedAt).getTime()) {
      return { entity, id, status: "conflict", serverRecord: current };
    }

    const parsed = syncOrderUpdateDataSchema.safeParse(mutation.data);
    if (!parsed.success) {
      return { entity, id, status: "error", message: "Statut de commande invalide" };
    }
    try {
      const updated = await this.ordersService.updateStatus(workshopId, id, parsed.data.status);
      return { entity, id, status: "applied", serverRecord: updated };
    } catch (e) {
      return { entity, id, status: "error", message: e instanceof Error ? e.message : "Transition de statut impossible" };
    }
  }

  /** Tâches : même principe — création (rattachée à une commande) et changement de statut. */
  private async applyTask(workshopId: string, mutation: SyncMutation): Promise<SyncMutationResult> {
    const { entity, id } = mutation;

    if (mutation.op === "delete") {
      return { entity, id, status: "error", message: "La suppression de tâche n'est pas prise en charge" };
    }

    if (mutation.op === "create") {
      const parsed = syncTaskCreateDataSchema.safeParse(mutation.data);
      if (!parsed.success) {
        return { entity, id, status: "error", message: "Données tâche invalides" };
      }
      const existing = await this.prisma.orderTask.findUnique({ where: { id } });
      if (existing) {
        return { entity, id, status: "applied", serverRecord: existing };
      }
      const { orderId, ...taskData } = parsed.data;
      try {
        const created = await this.ordersService.addTask(workshopId, orderId, taskData, id);
        return { entity, id, status: "applied", serverRecord: created };
      } catch (e) {
        return { entity, id, status: "error", message: e instanceof Error ? e.message : "Création de tâche impossible" };
      }
    }

    const current = await this.prisma.orderTask.findFirst({
      where: { id, order: { workshopId } },
    });
    if (!current) {
      return { entity, id, status: "not_found" };
    }
    if (current.updatedAt.getTime() > new Date(mutation.baseUpdatedAt).getTime()) {
      return { entity, id, status: "conflict", serverRecord: current };
    }

    const parsed = syncTaskUpdateDataSchema.safeParse(mutation.data);
    if (!parsed.success) {
      return { entity, id, status: "error", message: "Statut de tâche invalide" };
    }
    try {
      const updated = await this.ordersService.updateTaskStatus(
        workshopId,
        current.orderId,
        id,
        parsed.data.status,
      );
      return { entity, id, status: "applied", serverRecord: updated };
    } catch (e) {
      return { entity, id, status: "error", message: e instanceof Error ? e.message : "Changement de statut de tâche impossible" };
    }
  }
}
