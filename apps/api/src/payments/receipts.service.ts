import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrThrow(workshopId: string, id: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, workshopId },
      include: {
        workshop: { select: { name: true, phone: true, address: true, receiptFooterMessage: true } },
        order: { select: { reference: true, modelName: true, customer: true } },
      },
    });
    if (!receipt) {
      throw new NotFoundException("Reçu introuvable");
    }
    return receipt;
  }
}
