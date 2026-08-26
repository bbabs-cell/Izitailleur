import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateIssueDto, IssueStatus } from "@izitailleur/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  async create(workshopId: string, dto: CreateIssueDto) {
    const issue = await this.prisma.workshopIssue.create({ data: { ...dto, workshopId } });
    if (issue.priority === "URGENT") {
      await this.notifications.upsert(
        workshopId,
        "ISSUE",
        "issue",
        issue.id,
        `Problème urgent : ${issue.title}`,
        issue.description ?? issue.title,
      );
    }
    return issue;
  }

  async updateStatus(workshopId: string, id: string, status: IssueStatus, solution?: string) {
    await this.getOrThrow(workshopId, id);
    const updated = await this.prisma.workshopIssue.update({
      where: { id },
      data: {
        status,
        solution,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
    if (status === "RESOLVED") {
      await this.notifications.resolve(workshopId, "ISSUE", id);
    }
    return updated;
  }
}
