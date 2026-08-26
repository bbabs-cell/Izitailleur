import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreatePaymentDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async computeBalance(workshopId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, workshopId, deletedAt: null },
      include: { payments: true },
    });
    if (!order) {
      throw new NotFoundException("Commande introuvable");
    }
    const totalPaid = order.deposit + order.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = order.price - totalPaid;
    return { order, totalPaid, balance };
  }

  async list(workshopId: string, orderId: string) {
    const { order, totalPaid, balance } = await this.computeBalance(workshopId, orderId);
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: { receipt: true, recordedBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { price: order.price, deposit: order.deposit, totalPaid, balance, payments };
  }

  async create(workshopId: string, orderId: string, dto: CreatePaymentDto, recordedById: string) {
    const { balance } = await this.computeBalance(workshopId, orderId);

    if (dto.amount > balance) {
      throw new BadRequestException(
        `Le paiement (${dto.amount} FCFA) dépasse le solde restant (${balance} FCFA)`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workshopId,
          orderId,
          amount: dto.amount,
          method: dto.method,
          note: dto.note,
          recordedById,
        },
      });

      const workshop = await tx.workshop.update({
        where: { id: workshopId },
        data: { receiptSequence: { increment: 1 } },
      });
      const number = `R-${String(workshop.receiptSequence).padStart(5, "0")}`;

      const receipt = await tx.receipt.create({
        data: {
          workshopId,
          orderId,
          paymentId: payment.id,
          number,
          amount: dto.amount,
          method: dto.method,
        },
      });

      return { ...payment, receipt };
    }).then(async (result) => {
      const { balance } = await this.computeBalance(workshopId, orderId);
      if (balance <= 0) {
        await this.notifications.resolve(workshopId, "DEBT", orderId);
      }
      return result;
    });
  }
}
