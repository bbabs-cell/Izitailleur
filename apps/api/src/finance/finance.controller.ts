import { BadRequestException, Controller, Get, Header, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FinanceService } from "./finance.service";

@Controller("finance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "MANAGER")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("debts")
  debts(@CurrentUser() user: AuthenticatedUser) {
    return this.financeService.debts(user.workshopId);
  }

  @Get("stats")
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.financeService.stats(user.workshopId);
  }

  @Get("export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((from && Number.isNaN(fromDate!.getTime())) || (to && Number.isNaN(toDate!.getTime()))) {
      throw new BadRequestException("Paramètre 'from' ou 'to' invalide (format ISO attendu)");
    }
    const csv = await this.financeService.exportPaymentsCsv(user.workshopId, fromDate, toDate);
    res.setHeader("Content-Disposition", 'attachment; filename="paiements.csv"');
    res.send(csv);
  }
}
