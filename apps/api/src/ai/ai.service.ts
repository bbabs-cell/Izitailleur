import { Injectable } from "@nestjs/common";
import { canViewFinance, type AiAnswer, type AiIntent, type Role } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

/**
 * AIService — couche d'abstraction pour les questions en langage naturel.
 *
 * Moteur déterministe (pas d'appel à un service IA externe) : chaque question reconnue est
 * traduite en une vraie requête sur les données de l'atelier. Aucune réponse n'est inventée —
 * si la question n'est pas reconnue, on le dit explicitement plutôt que de deviner.
 * Le passage à une couche de compréhension en langage naturel appuyée sur un LLM externe est
 * une décision d'architecture (coût, fournisseur, confidentialité) qui reste à valider — voir
 * docs/ARCHITECTURE.md.
 */
@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async ask(workshopId: string, userId: string, role: Role, question: string): Promise<AiAnswer> {
    const normalized = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""); // retire les accents pour un matching robuste

    const orderRef = normalized.match(/#?\s?(\d{3,6})/)?.[1];

    if (orderRef && (normalized.includes("travaille") || normalized.includes("occupe"))) {
      return this.orderAssignee(workshopId, orderRef);
    }
    if (normalized.includes("pourquoi") && normalized.includes("retard")) {
      return this.lateReasons(workshopId);
    }
    if (normalized.includes("retard")) {
      return this.lateOrders(workshopId);
    }
    if (
      (normalized.includes("doit") && (normalized.includes("argent") || normalized.includes("payer"))) ||
      normalized.includes("dette") ||
      normalized.includes("impaye")
    ) {
      return this.debts(workshopId, role);
    }
    if (normalized.includes("tissu") && (normalized.includes("manque") || normalized.includes("stock"))) {
      return this.lowStock(workshopId);
    }
    if (
      normalized.includes("aujourd'hui") ||
      normalized.includes("aujourdhui") ||
      normalized.includes("faire aujourd")
    ) {
      return this.today(workshopId, userId);
    }

    return {
      intent: "UNKNOWN",
      answer:
        "Je ne comprends pas cette question. Essayez par exemple : « Qu'est-ce que je dois faire aujourd'hui ? », " +
        "« Quelles commandes sont en retard ? », « Qui travaille sur la commande #0248 ? », " +
        "« Qui me doit de l'argent ? », « Quel tissu va bientôt manquer ? ».",
      data: null,
    };
  }

  private async today(workshopId: string, userId: string): Promise<AiAnswer> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [appointments, tasks, dueOrders] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { workshopId, deletedAt: null, startAt: { gte: startOfDay, lte: endOfDay } },
        include: { customer: true },
        orderBy: { startAt: "asc" },
      }),
      this.prisma.orderTask.findMany({
        where: {
          assignedToId: userId,
          status: { not: "DONE" },
          order: { workshopId, deletedAt: null },
        },
        include: { order: { select: { reference: true } } },
      }),
      this.prisma.order.findMany({
        where: {
          workshopId,
          deletedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          dueDate: { gte: startOfDay, lte: endOfDay },
        },
        include: { customer: true },
      }),
    ]);

    const parts: string[] = [];
    if (appointments.length > 0) {
      parts.push(
        `${appointments.length} rendez-vous : ` +
          appointments
            .map(
              (a) =>
                `${a.title}${a.customer ? ` (${a.customer.firstName} ${a.customer.lastName})` : ""} à ${a.startAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
            )
            .join(", "),
      );
    }
    if (dueOrders.length > 0) {
      parts.push(
        `${dueOrders.length} commande(s) à livrer aujourd'hui : ` +
          dueOrders.map((o) => `#${o.reference}`).join(", "),
      );
    }
    if (tasks.length > 0) {
      parts.push(
        `${tasks.length} tâche(s) assignée(s) non terminée(s) : ` +
          tasks.map((t) => `"${t.title}" (commande #${t.order.reference})`).join(", "),
      );
    }

    return {
      intent: "TODAY",
      answer: parts.length > 0 ? parts.join(". ") + "." : "Rien de particulier prévu aujourd'hui.",
      data: { appointments, tasks, dueOrders },
    };
  }

  private async lateOrders(workshopId: string): Promise<AiAnswer> {
    const orders = await this.prisma.order.findMany({
      where: {
        workshopId,
        deletedAt: null,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
        dueDate: { lt: new Date() },
      },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    });

    const answer =
      orders.length === 0
        ? "Aucune commande en retard. 🎉"
        : `${orders.length} commande(s) en retard : ` +
          orders
            .map((o) => `#${o.reference} (${o.customer.firstName} ${o.customer.lastName})`)
            .join(", ") +
          ".";

    return { intent: "LATE_ORDERS", answer, data: orders };
  }

  private async lateReasons(workshopId: string): Promise<AiAnswer> {
    const orders = await this.prisma.order.findMany({
      where: {
        workshopId,
        deletedAt: null,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
        dueDate: { lt: new Date() },
      },
      include: {
        customer: true,
        issues: { where: { status: { not: "RESOLVED" } } },
      },
    });

    if (orders.length === 0) {
      return { intent: "LATE_REASONS", answer: "Aucune commande en retard.", data: [] };
    }

    const explanations = orders.map((o) => {
      const reasons = o.issues.map((i) => i.title);
      return reasons.length > 0
        ? `#${o.reference} : ${reasons.join(", ")}`
        : `#${o.reference} : aucun problème signalé (retard non expliqué dans le système)`;
    });

    return {
      intent: "LATE_REASONS",
      answer: explanations.join(". ") + ".",
      data: orders,
    };
  }

  private async orderAssignee(workshopId: string, reference: string): Promise<AiAnswer> {
    const paddedRef = reference.padStart(4, "0");
    const order = await this.prisma.order.findFirst({
      where: { workshopId, reference: { in: [reference, paddedRef] }, deletedAt: null },
      include: {
        assignedTo: { select: { fullName: true, role: true } },
        tasks: { include: { assignedTo: { select: { fullName: true } } } },
      },
    });

    if (!order) {
      return { intent: "ORDER_ASSIGNEE", answer: `Commande #${reference} introuvable.`, data: null };
    }

    const taskAssignees = [...new Set(order.tasks.map((t) => t.assignedTo?.fullName).filter(Boolean))];
    const parts: string[] = [];
    if (order.assignedTo) {
      parts.push(`Responsable de la commande : ${order.assignedTo.fullName}`);
    }
    if (taskAssignees.length > 0) {
      parts.push(`Personnes assignées aux tâches : ${taskAssignees.join(", ")}`);
    }
    if (parts.length === 0) {
      parts.push(`Personne n'est assigné à la commande #${order.reference} pour le moment.`);
    }

    return { intent: "ORDER_ASSIGNEE", answer: parts.join(". ") + ".", data: order };
  }

  private async debts(workshopId: string, role: Role): Promise<AiAnswer> {
    if (!canViewFinance(role)) {
      return {
        intent: "DEBTS",
        answer: "Vous n'avez pas accès aux informations financières de l'atelier.",
        data: null,
      };
    }

    const orders = await this.prisma.order.findMany({
      where: { workshopId, deletedAt: null, status: { not: "CANCELLED" } },
      include: { customer: true, payments: true },
    });

    const debts = orders
      .map((o) => {
        const paid = o.deposit + o.payments.reduce((sum, p) => sum + p.amount, 0);
        return { customer: o.customer, reference: o.reference, remaining: o.price - paid };
      })
      .filter((d) => d.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);

    const answer =
      debts.length === 0
        ? "Personne ne doit d'argent actuellement."
        : debts
            .map(
              (d) =>
                `${d.customer.firstName} ${d.customer.lastName} doit ${d.remaining.toLocaleString("fr-FR")} FCFA (commande #${d.reference})`,
            )
            .join(". ") + ".";

    return { intent: "DEBTS", answer, data: debts };
  }

  private async lowStock(workshopId: string): Promise<AiAnswer> {
    const LOW_STOCK_THRESHOLD = 5;
    const fabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null, quantity: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { quantity: "asc" },
    });

    const answer =
      fabrics.length === 0
        ? "Aucun tissu en stock faible actuellement."
        : fabrics.map((f) => `${f.name} (${f.quantity}${f.unit} restant)`).join(", ") + ".";

    return { intent: "LOW_STOCK", answer, data: fabrics };
  }
}
