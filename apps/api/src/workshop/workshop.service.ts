import { Injectable } from "@nestjs/common";
import type { UpdateWorkshopDto } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

const SETTINGS_SELECT = {
  id: true,
  name: true,
  phone: true,
  address: true,
  receiptFooterMessage: true,
  measurementFields: true,
} as const;

@Injectable()
export class WorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  get(workshopId: string) {
    return this.prisma.workshop.findUniqueOrThrow({ where: { id: workshopId }, select: SETTINGS_SELECT });
  }

  update(workshopId: string, dto: UpdateWorkshopDto) {
    return this.prisma.workshop.update({ where: { id: workshopId }, data: dto, select: SETTINGS_SELECT });
  }
}
