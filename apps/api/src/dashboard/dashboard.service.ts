import { Injectable } from "@nestjs/common";
import { canViewFinance, type DashboardResponse, type Role } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

const LOW_STOCK_THRESHOLD = 5;
const DUE_SOON_DAYS = 3;

const ORDER_SELECT = {
  id: true,
  reference: true,
  modelName: true,
  status: true,
  priority: true,
  dueDate: true,
  customer: { select: { firstName: true, lastName: true } },
} as const;

const TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  dueDate: true,
  order: { select: { reference: true } },
  assignedTo: { select: { id: true, fullName: true } },
} as const;

/**
 * DashboardService — agrège l'état réel de l'atelier pour l'écran d'accueil
 * ("Aujourd'hui / Urgent / Argent / Stock / Équipe", cahier des charges section 9).
 * Aucune donnée simulée : chaque section vient d'une vraie requête Prisma. Les sections
 * sensibles (argent, vue d'ensemble de l'équipe) sont nulles pour les rôles qui n'y ont pas accès.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workshopId: string, userId: string, role: Role): Promise<DashboardResponse> {
    const [today, urgent, stock, money, team] = await Promise.all([
      this.today(workshopId, userId),
      this.urgent(workshopId),
      this.stock(workshopId),
      canViewFinance(role) ? this.money(workshopId) : Promise.resolve(null),
      canViewFinance(role) ? this.team(workshopId) : Promise.resolve(null),
    ]);

    // Prisma renvoie des objets Date ; ils sont sérialisés en chaînes ISO par Nest lors de la
    // réponse HTTP, ce qui correspond au contrat DashboardResponse consommé par le mobile.
    return { today, urgent, money, stock, team } as unknown as DashboardResponse;
  }

  private async today(workshopId: string, userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [appointments, dueOrders, myTasks] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { workshopId, deletedAt: null, startAt: { gte: startOfDay, lte: endOfDay } },
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      this.prisma.order.findMany({
        where: {
          workshopId,
          deletedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          dueDate: { gte: startOfDay, lte: endOfDay },
        },
        select: ORDER_SELECT,
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.orderTask.findMany({
        where: {
          assignedToId: userId,
          status: { not: "DONE" },
          order: { workshopId, deletedAt: null },
        },
        select: TASK_SELECT,
        orderBy: { dueDate: "asc" },
      }),
    ]);

    return { appointments, dueOrders, myTasks };
  }

  private async urgent(workshopId: string) {
    const now = new Date();
    const dueSoonLimit = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

    const [lateOrders, dueSoonOrders, urgentIssues] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          workshopId,
          deletedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          dueDate: { lt: now },
        },
        select: ORDER_SELECT,
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.order.findMany({
        where: {
          workshopId,
          deletedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          dueDate: { gte: now, lte: dueSoonLimit },
        },
        select: ORDER_SELECT,
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.workshopIssue.findMany({
        where: { workshopId, status: { not: "RESOLVED" }, priority: "URGENT" },
        select: { id: true, title: true, category: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { lateOrders, dueSoonOrders, urgentIssues };
  }

  private async money(workshopId: string) {
    const orders = await this.prisma.order.findMany({
      where: { workshopId, deletedAt: null, status: { not: "CANCELLED" } },
      select: { price: true, deposit: true, deliveredAt: true, payments: { select: { amount: true } } },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let totalDebt = 0;
    let debtorsCount = 0;
    let revenueThisMonth = 0;
    for (const order of orders) {
      const paid = order.deposit + order.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = order.price - paid;
      if (remaining > 0) {
        totalDebt += remaining;
        debtorsCount += 1;
      }
      if (order.deliveredAt && order.deliveredAt >= startOfMonth) {
        revenueThisMonth += paid;
      }
    }

    return { totalDebt, debtorsCount, revenueThisMonth };
  }

  private async stock(workshopId: string) {
    const lowStockFabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null, quantity: { lte: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, quantity: true, unit: true },
      orderBy: { quantity: "asc" },
    });

    return { lowStockFabrics };
  }

  private async team(workshopId: string) {
    const tasks = await this.prisma.orderTask.findMany({
      where: {
        status: { not: "DONE" },
        order: { workshopId, deletedAt: null },
        assignedToId: { not: null },
      },
      select: TASK_SELECT,
      orderBy: { dueDate: "asc" },
    });

    const byAssignee = new Map<
      string,
      { userId: string; fullName: string; pendingCount: number; tasks: typeof tasks }
    >();
    for (const task of tasks) {
      if (!task.assignedTo) continue;
      const entry = byAssignee.get(task.assignedTo.id) ?? {
        userId: task.assignedTo.id,
        fullName: task.assignedTo.fullName,
        pendingCount: 0,
        tasks: [],
      };
      entry.pendingCount += 1;
      entry.tasks.push(task);
      byAssignee.set(task.assignedTo.id, entry);
    }

    return { tasksByAssignee: [...byAssignee.values()].sort((a, b) => b.pendingCount - a.pendingCount) };
  }
}
