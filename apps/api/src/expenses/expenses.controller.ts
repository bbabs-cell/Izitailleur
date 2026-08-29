import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { expenseSchema } from "@izitailleur/shared";
import type { ExpenseDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ExpensesService } from "./expenses.service";

/** Dépenses de l'atelier : donnée financière, même niveau d'accès que /finance et /payments. */
@Controller("expenses")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "MANAGER")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((from && Number.isNaN(fromDate!.getTime())) || (to && Number.isNaN(toDate!.getTime()))) {
      throw new BadRequestException("Paramètre 'from' ou 'to' invalide (format ISO attendu)");
    }
    return this.expensesService.list(user.workshopId, fromDate, toDate);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(expenseSchema)) dto: ExpenseDto,
  ) {
    return this.expensesService.create(user.workshopId, dto, user.sub);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.expensesService.remove(user.workshopId, id);
  }
}
