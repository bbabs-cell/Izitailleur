import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationType } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

const LOW_STOCK_THRESHOLD = 5;
const APPOINTMENT_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: { workshopId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markRead(workshopId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, workshopId } });
    if (!notification) {
      throw new NotFoundException("Notification introuvable");
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  /**
   * Crée une notification si elle n'existe pas déjà pour cette (type, entité) — jamais de
   * doublon, et une notification déjà lue n'est pas ressuscitée tant que la condition
   * sous-jacente persiste.
   */
  async upsert(
    workshopId: string,
    type: NotificationType,
    relatedEntity: string,
    relatedEntityId: string,
    title: string,
    body: string,
  ) {
    await this.prisma.notification.upsert({
      where: { workshopId_type_relatedEntityId: { workshopId, type, relatedEntityId } },
      create: { workshopId, type, relatedEntity, relatedEntityId, title, body },
      update: {},
    });
  }

  /** Supprime la notification quand la condition qui l'a déclenchée est résolue. */
  async resolve(workshopId: string, type: NotificationType, relatedEntityId: string) {
    await this.prisma.notification.deleteMany({ where: { workshopId, type, relatedEntityId } });
  }

  /**
   * Vérifications qui ne peuvent pas être déclenchées par une mutation (le temps qui passe) :
   * rendez-vous dans moins de 2h, commandes en retard. Appelé à la demande depuis le mobile
   * (ouverture de l'app / synchronisation) — voir la limite documentée dans ARCHITECTURE.md.
   */
  async scan(workshopId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + APPOINTMENT_REMINDER_WINDOW_MS);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: { workshopId, deletedAt: null, startAt: { gte: now, lte: soon } },
      include: { customer: true },
    });
    for (const appointment of upcomingAppointments) {
      const minutes = Math.round((appointment.startAt.getTime() - now.getTime()) / 60000);
      const who = appointment.customer
        ? `avec ${appointment.customer.firstName} ${appointment.customer.lastName} `
        : "";
      await this.upsert(
        workshopId,
        "APPOINTMENT",
        "appointment",
        appointment.id,
        appointment.title,
        `Rendez-vous ${who}dans ${minutes} min`,
      );
    }

    const orders = await this.prisma.order.findMany({
      where: { workshopId, deletedAt: null, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: { customer: true, payments: true },
    });
    for (const order of orders) {
      const dueInMs = order.dueDate.getTime() - now.getTime();
      const late = dueInMs < 0;
      const dueTomorrow = !late && dueInMs <= 24 * 60 * 60 * 1000;

      if (late) {
        await this.upsert(
          workshopId,
          "DELAY",
          "order",
          order.id,
          `Commande #${order.reference} en retard`,
          `La commande #${order.reference} (${order.customer.firstName} ${order.customer.lastName}) devait être livrée le ${order.dueDate.toLocaleDateString("fr-FR")}.`,
        );
      } else {
        await this.resolve(workshopId, "DELAY", order.id);
      }

      if (dueTomorrow) {
        await this.upsert(
          workshopId,
          "DELIVERY",
          "order",
          order.id,
          `Livraison demain : #${order.reference}`,
          `La commande #${order.reference} doit être livrée demain.`,
        );
      } else {
        await this.resolve(workshopId, "DELIVERY", order.id);
      }

      if (order.priority === "URGENT") {
        await this.upsert(
          workshopId,
          "URGENT_ORDER",
          "order",
          order.id,
          `Commande urgente : #${order.reference}`,
          `La commande #${order.reference} est marquée urgente.`,
        );
      } else {
        await this.resolve(workshopId, "URGENT_ORDER", order.id);
      }

      const totalPaid = order.deposit + order.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = order.price - totalPaid;
      if (balance > 0 && late) {
        await this.upsert(
          workshopId,
          "DEBT",
          "order",
          order.id,
          `${order.customer.firstName} ${order.customer.lastName} doit encore de l'argent`,
          `${order.customer.firstName} ${order.customer.lastName} doit encore ${balance.toLocaleString("fr-FR")} FCFA pour la commande #${order.reference}.`,
        );
      } else {
        await this.resolve(workshopId, "DEBT", order.id);
      }
    }

    const lowStockFabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null, quantity: { lte: LOW_STOCK_THRESHOLD } },
    });
    for (const fabric of lowStockFabrics) {
      await this.upsert(
        workshopId,
        "STOCK",
        "fabric",
        fabric.id,
        `Stock faible : ${fabric.name}`,
        `Il ne reste que ${fabric.quantity}${fabric.unit} de ${fabric.name}.`,
      );
    }
    const restockedFabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null, quantity: { gt: LOW_STOCK_THRESHOLD } },
    });
    for (const fabric of restockedFabrics) {
      await this.resolve(workshopId, "STOCK", fabric.id);
    }

    const overdueTasks = await this.prisma.orderTask.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: now },
        order: { workshopId, deletedAt: null },
      },
      include: { order: true },
    });
    for (const task of overdueTasks) {
      await this.upsert(
        workshopId,
        "TASK",
        "task",
        task.id,
        `Tâche en retard : ${task.title}`,
        `La tâche "${task.title}" sur la commande #${task.order.reference} est en retard.`,
      );
    }

    const urgentIssues = await this.prisma.workshopIssue.findMany({
      where: { workshopId, status: { not: "RESOLVED" }, priority: "URGENT" },
    });
    for (const issue of urgentIssues) {
      await this.upsert(
        workshopId,
        "ISSUE",
        "issue",
        issue.id,
        `Problème urgent : ${issue.title}`,
        issue.description ?? issue.title,
      );
    }

    return this.list(workshopId);
  }
}
