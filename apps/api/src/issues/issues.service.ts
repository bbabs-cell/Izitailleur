import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateIssueDto, IssueStatus } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string, status?: IssueStatus) {
    return this.prisma.workshopIssue.findMany({
      where: { workshopId, ...(status ? { status } : {}) },
      include: {
        order: { select: { id: true, reference: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrThrow(workshopId: string, id: string) {
    const issue = await this.prisma.workshopIssue.findFirst({
      where: { id, workshopId },
      include: {
        order: { select: { id: true, reference: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    });
    if (!issue) {
      throw new NotFoundException("Problème introuvable");
    }
    return issue;
  }

  create(workshopId: string, dto: CreateIssueDto) {
    return this.prisma.workshopIssue.create({ data: { ...dto, workshopId } });
  }

  async updateStatus(workshopId: string, id: string, status: IssueStatus, solution?: string) {
    await this.getOrThrow(workshopId, id);
    return this.prisma.workshopIssue.update({
      where: { id },
      data: {
        status,
        solution,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
  }
}
