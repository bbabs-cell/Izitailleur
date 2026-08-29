import { Injectable, NotFoundException } from "@nestjs/common";
import type { ExpenseDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string, from?: Date, to?: Date) {
    return this.prisma.expense.findMany({
      where: {
        workshopId,
        deletedAt: null,
        ...(from || to ? { spentAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { recordedBy: { select: { id: true, fullName: true } } },
      orderBy: { spentAt: "desc" },
    });
  }

  async total(workshopId: string, from?: Date, to?: Date) {
    const expenses = await this.list(workshopId, from, to);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  create(workshopId: string, dto: ExpenseDto, recordedById: string) {
    return this.prisma.expense.create({
      data: {
        workshopId,
        amount: dto.amount,
        description: dto.description,
        category: dto.category,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : undefined,
        recordedById,
      },
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });
  }

  async remove(workshopId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, workshopId, deletedAt: null } });
    if (!expense) {
      throw new NotFoundException("Dépense introuvable");
    }
    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
