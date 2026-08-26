import { Injectable } from "@nestjs/common";
import type { CreateAppointmentDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const BUSY_DAY_THRESHOLD = 5;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(workshopId: string, from: Date, to: Date) {
    const [appointments, dueOrders] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { workshopId, deletedAt: null, startAt: { gte: from, lte: to } },
        include: { customer: true, order: { select: { id: true, reference: true, modelName: true } } },
        orderBy: { startAt: "asc" },
      }),
      this.prisma.order.findMany({
        where: { workshopId, deletedAt: null, dueDate: { gte: from, lte: to } },
        select: { id: true, dueDate: true },
      }),
    ]);

    const countsByDay = new Map<string, number>();
    for (const appointment of appointments) {
      const key = appointment.startAt.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }
    for (const order of dueOrders) {
      const key = order.dueDate.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const busyDays = [...countsByDay.entries()]
      .filter(([, count]) => count >= BUSY_DAY_THRESHOLD)
      .map(([date, count]) => ({ date, count }));

    return { appointments, busyDays };
  }

  create(workshopId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        workshopId,
        customerId: dto.customerId,
        orderId: dto.orderId,
        type: dto.type,
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  async remove(workshopId: string, id: string) {
    await this.prisma.appointment.updateMany({
      where: { id, workshopId },
      data: { deletedAt: new Date() },
    });
    await this.notifications.resolve(workshopId, "APPOINTMENT", id);
  }
}
