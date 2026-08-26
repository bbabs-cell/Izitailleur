import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateMeasurementDto, CreateMeasurementProfileDto, CustomerDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        workshopId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async getOrThrow(workshopId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        measurementProfiles: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        orders: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) {
      throw new NotFoundException("Client introuvable");
    }
    return customer;
  }

  create(workshopId: string, dto: CustomerDto) {
    return this.prisma.customer.create({ data: { ...dto, workshopId } });
  }

  async update(workshopId: string, id: string, dto: Partial<CustomerDto>) {
    await this.getOrThrow(workshopId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(workshopId: string, id: string) {
    await this.getOrThrow(workshopId, id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createMeasurementProfile(workshopId: string, customerId: string, dto: CreateMeasurementProfileDto) {
    await this.getOrThrow(workshopId, customerId);
    return this.prisma.measurementProfile.create({
      data: { ...dto, customerId, workshopId },
    });
  }

  async addMeasurement(workshopId: string, profileId: string, dto: CreateMeasurementDto) {
    const profile = await this.prisma.measurementProfile.findFirst({
      where: { id: profileId, workshopId, deletedAt: null },
    });
    if (!profile) {
      throw new NotFoundException("Profil de mensurations introuvable");
    }
    // Une nouvelle mesure ne détruit jamais l'ancienne : on ajoute une nouvelle ligne d'historique.
    return this.prisma.measurement.create({ data: { profileId, values: dto.values } });
  }

  async listMeasurements(workshopId: string, profileId: string) {
    const profile = await this.prisma.measurementProfile.findFirst({
      where: { id: profileId, workshopId, deletedAt: null },
    });
    if (!profile) {
      throw new NotFoundException("Profil de mensurations introuvable");
    }
    return this.prisma.measurement.findMany({
      where: { profileId },
      orderBy: { recordedAt: "desc" },
    });
  }
}
