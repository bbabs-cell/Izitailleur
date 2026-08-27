import { Injectable, NotFoundException } from "@nestjs/common";
import type { GarmentModelDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string) {
    return this.prisma.garmentModel.findMany({
      where: { workshopId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async getOrThrow(workshopId: string, id: string) {
    const model = await this.prisma.garmentModel.findFirst({
      where: { id, workshopId, deletedAt: null },
    });
    if (!model) {
      throw new NotFoundException("Modèle introuvable");
    }
    return model;
  }

  create(workshopId: string, dto: GarmentModelDto) {
    return this.prisma.garmentModel.create({ data: { ...dto, workshopId } });
  }

  async remove(workshopId: string, id: string) {
    await this.getOrThrow(workshopId, id);
    await this.prisma.garmentModel.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
