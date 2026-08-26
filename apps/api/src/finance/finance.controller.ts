import { Controller, Get, UseGuards } from "@nestjs/common";
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
}
