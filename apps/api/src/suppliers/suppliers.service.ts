import { Injectable, NotFoundException } from "@nestjs/common";
import type { SupplierDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string) {
    return this.prisma.supplier.findMany({
      where: { workshopId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async getOrThrow(workshopId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { fabrics: { where: { deletedAt: null } } },
    });
    if (!supplier) {
      throw new NotFoundException("Fournisseur introuvable");
    }
    return supplier;
  }

  create(workshopId: string, dto: SupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto, workshopId } });
  }

  async remove(workshopId: string, id: string) {
    await this.getOrThrow(workshopId, id);
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
