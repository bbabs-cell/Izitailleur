import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import type { InviteEmployeeDto } from "@izitailleur/shared";
import type { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(workshopId: string) {
    return this.prisma.user.findMany({
      where: { workshopId, deletedAt: null },
      select: { id: true, fullName: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async invite(workshopId: string, dto: InviteEmployeeDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec ce numéro de téléphone");
    }
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        workshopId,
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
      },
      select: { id: true, fullName: true, phone: true, role: true, createdAt: true },
    });
  }

  async updateRole(workshopId: string, employeeId: string, role: Role) {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, workshopId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException("Employé introuvable");
    }
    return this.prisma.user.update({
      where: { id: employeeId },
      data: { role },
      select: { id: true, fullName: true, phone: true, role: true },
    });
  }

  async remove(workshopId: string, employeeId: string, requesterId: string) {
    if (employeeId === requesterId) {
      throw new ConflictException("Vous ne pouvez pas vous retirer vous-même de l'atelier");
    }
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, workshopId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException("Employé introuvable");
    }
    await this.prisma.user.update({ where: { id: employeeId }, data: { deletedAt: new Date() } });
  }
}
