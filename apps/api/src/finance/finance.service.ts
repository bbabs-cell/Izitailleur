import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async debts(workshopId: string) {
    const orders = await this.prisma.order.findMany({
      where: { workshopId, deletedAt: null, status: { not: "CANCELLED" } },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return orders
      .map((order) => {
        const totalPaid = order.deposit + order.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = order.price - totalPaid;
        return {
          orderId: order.id,
          reference: order.reference,
          customer: order.customer,
          total: order.price,
          paid: totalPaid,
          remaining: balance,
          dueDate: order.dueDate,
          lastPaymentAt: order.payments[0]?.createdAt ?? null,
        };
      })
      .filter((entry) => entry.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }

  async stats(workshopId: string) {
    const orders = await this.prisma.order.findMany({
      where: { workshopId, deletedAt: null },
      include: { payments: true },
    });

    const now = new Date();
    const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
    const delivered = orders.filter((o) => o.status === "DELIVERED");
    const late = activeOrders.filter(
      (o) => o.status !== "DELIVERED" && o.dueDate.getTime() < now.getTime(),
    );

    let revenue = 0;
    let unpaid = 0;
    for (const order of activeOrders) {
      const totalPaid = order.deposit + order.payments.reduce((sum, p) => sum + p.amount, 0);
      revenue += totalPaid;
      const balance = order.price - totalPaid;
      if (balance > 0) unpaid += balance;
    }

    const fabricMovements = await this.prisma.fabricMovement.aggregate({
      where: { fabric: { workshopId }, type: "OUT" },
      _sum: { quantity: true },
    });

    const openIssues = await this.prisma.workshopIssue.count({
      where: { workshopId, status: { not: "RESOLVED" } },
    });

    return {
      ordersCount: orders.length,
      deliveredCount: delivered.length,
      lateCount: late.length,
      revenue,
      unpaid,
      fabricConsumed: fabricMovements._sum.quantity ?? 0,
      openIssues,
    };
  }

  /** Export réel des paiements enregistrés (CSV), pour la comptabilité de l'atelier. */
  async exportPaymentsCsv(workshopId: string, from?: Date, to?: Date): Promise<string> {
    const payments = await this.prisma.payment.findMany({
      where: {
        workshopId,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: {
        order: { select: { reference: true, customer: { select: { firstName: true, lastName: true } } } },
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const header = ["Date", "Commande", "Client", "Montant (FCFA)", "Mode", "Enregistré par"];
    const rows = payments.map((p) => [
      p.createdAt.toISOString(),
      p.order.reference,
      `${p.order.customer.firstName} ${p.order.customer.lastName}`,
      String(p.amount),
      p.method,
      p.recordedBy?.fullName ?? "",
    ]);

    return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";
  }
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
