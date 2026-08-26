import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { canTransitionOrderStatus, type OrderStatus } from "@izitailleur/shared";
import type { TaskStatus } from "@prisma/client";
import type {
  CreateOrderDto,
  CreateOrderImageDto,
  CreateOrderTaskDto,
} from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: { workshopId, deletedAt: null, ...(status ? { status } : {}) },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    });
  }

  async getOrThrow(workshopId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        customer: true,
        measurementProfile: { include: { measurements: { orderBy: { recordedAt: "desc" }, take: 1 } } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
        images: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { createdAt: "asc" } },
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });
    if (!order) {
      throw new NotFoundException("Commande introuvable");
    }
    return order;
  }

  async create(workshopId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, workshopId, deletedAt: null },
    });
    if (!customer) {
      throw new BadRequestException("Client introuvable pour cet atelier");
    }

    return this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.update({
        where: { id: workshopId },
        data: { orderSequence: { increment: 1 } },
      });
      const reference = String(workshop.orderSequence).padStart(4, "0");

      const order = await tx.order.create({
        data: {
          workshopId,
          reference,
          customerId: dto.customerId,
          measurementProfileId: dto.measurementProfileId,
          modelName: dto.modelName,
          fabricDescription: dto.fabricDescription,
          quantity: dto.quantity,
          price: dto.price,
          deposit: dto.deposit,
          dueDate: new Date(dto.dueDate),
          priority: dto.priority,
          assignedToId: dto.assignedToId,
          instructions: dto.instructions,
          notes: dto.notes,
        },
      });

      await tx.orderStatusChange.create({
        data: { orderId: order.id, fromStatus: null, toStatus: order.status },
      });

      return order;
    });
  }

  async updateStatus(workshopId: string, id: string, toStatus: OrderStatus) {
    const order = await this.getOrThrow(workshopId, id);
    if (!canTransitionOrderStatus(order.status, toStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${order.status} → ${toStatus}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: toStatus,
          deliveredAt: toStatus === "DELIVERED" ? new Date() : order.deliveredAt,
        },
      });
      await tx.orderStatusChange.create({
        data: { orderId: id, fromStatus: order.status, toStatus },
      });
      return updated;
    });
  }

  async addImage(workshopId: string, orderId: string, dto: CreateOrderImageDto) {
    await this.getOrThrow(workshopId, orderId);
    return this.prisma.orderImage.create({ data: { orderId, url: dto.url } });
  }

  async addTask(workshopId: string, orderId: string, dto: CreateOrderTaskDto) {
    await this.getOrThrow(workshopId, orderId);
    return this.prisma.orderTask.create({
      data: {
        orderId,
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async updateTaskStatus(workshopId: string, orderId: string, taskId: string, status: TaskStatus) {
    await this.getOrThrow(workshopId, orderId);
    const task = await this.prisma.orderTask.findFirst({ where: { id: taskId, orderId } });
    if (!task) {
      throw new NotFoundException("Tâche introuvable");
    }
    return this.prisma.orderTask.update({ where: { id: taskId }, data: { status } });
  }
}
