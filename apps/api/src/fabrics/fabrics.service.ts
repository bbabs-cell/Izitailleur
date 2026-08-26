import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFabricMovementDto, FabricDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class FabricsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workshopId: string) {
    const fabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    return fabrics.map((fabric) => ({ ...fabric, lowStock: fabric.quantity <= LOW_STOCK_THRESHOLD }));
  }

  async getOrThrow(workshopId: string, id: string) {
    const fabric = await this.prisma.fabric.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!fabric) {
      throw new NotFoundException("Tissu introuvable");
    }
    return fabric;
  }

  create(workshopId: string, dto: FabricDto) {
    return this.prisma.fabric.create({ data: { ...dto, workshopId } });
  }

  async recordMovement(workshopId: string, fabricId: string, dto: CreateFabricMovementDto) {
    const fabric = await this.prisma.fabric.findFirst({
      where: { id: fabricId, workshopId, deletedAt: null },
    });
    if (!fabric) {
      throw new NotFoundException("Tissu introuvable");
    }

    const delta = dto.type === "OUT" ? -dto.quantity : dto.quantity;
    const nextQuantity = fabric.quantity + delta;

    if (dto.type === "OUT" && nextQuantity < 0) {
      throw new BadRequestException(
        `Tissu insuffisant : disponible ${fabric.quantity}${fabric.unit}, nécessaire ${dto.quantity}${fabric.unit}, manque ${Math.abs(nextQuantity)}${fabric.unit}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fabric.update({
        where: { id: fabricId },
        data: { quantity: nextQuantity },
      });
      await tx.fabricMovement.create({
        data: { fabricId, type: dto.type, quantity: dto.quantity, note: dto.note },
      });
      return updated;
    });
  }

  async lowStock(workshopId: string) {
    const fabrics = await this.prisma.fabric.findMany({
      where: { workshopId, deletedAt: null, quantity: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { quantity: "asc" },
    });
    return fabrics;
  }
}
